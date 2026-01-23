"""Invoice service for business logic with GST calculations."""
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from typing import List, Optional, Tuple
from datetime import datetime, date
from decimal import Decimal, ROUND_HALF_UP
from app.database.models import (
    Invoice, InvoiceItem, Company, Customer, Product,
    InvoiceStatus, InvoiceType, INDIAN_STATE_CODES,InvoiceVoucher
)
from app.schemas.invoice import InvoiceCreate,VoucherType, InvoiceUpdate, InvoiceItemCreate
from app.services.company_service import CompanyService
import qrcode
import base64
from io import BytesIO


class InvoiceService:
    """Service for invoice operations with GST compliance."""
    
    def __init__(self, db: Session):
        self.db = db
    
    def _round_amount(self, amount: Decimal) -> Decimal:
        """Round amount to 2 decimal places."""
        return Decimal(amount).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
    
    def _calculate_gst_split(
        self,
        taxable_amount: Decimal,
        gst_rate: Decimal,
        company_state_code: str,
        place_of_supply: str
    ) -> dict:
        """Calculate GST split (CGST+SGST or IGST) based on place of supply."""
        total_gst = self._round_amount(taxable_amount * gst_rate / 100)
        
        # If same state, split into CGST and SGST
        if company_state_code == place_of_supply:
            half_rate = gst_rate / 2
            cgst = self._round_amount(taxable_amount * half_rate / 100)
            sgst = total_gst - cgst  # Ensure total matches
            return {
                "cgst_rate": half_rate,
                "sgst_rate": half_rate,
                "igst_rate": Decimal("0"),
                "cgst_amount": cgst,
                "sgst_amount": sgst,
                "igst_amount": Decimal("0"),
            }
        else:
            # Inter-state, use IGST
            return {
                "cgst_rate": Decimal("0"),
                "sgst_rate": Decimal("0"),
                "igst_rate": gst_rate,
                "cgst_amount": Decimal("0"),
                "sgst_amount": Decimal("0"),
                "igst_amount": total_gst,
            }
    
    def _calculate_item_amounts(
        self,
        item_data: InvoiceItemCreate,
        company_state_code: str,
        place_of_supply: str
    ) -> dict:
        """Calculate all amounts for an invoice item."""
        # Calculate base amount
        base_amount = self._round_amount(item_data.quantity * item_data.unit_price)
        
        # Calculate discount
        discount_amount = self._round_amount(base_amount * item_data.discount_percent / 100)
        
        # Taxable amount (after discount)
        taxable_amount = base_amount - discount_amount
        
        # Calculate GST
        gst_split = self._calculate_gst_split(
            taxable_amount,
            item_data.gst_rate,
            company_state_code,
            place_of_supply
        )
        
        # Total tax
        total_tax = gst_split["cgst_amount"] + gst_split["sgst_amount"] + gst_split["igst_amount"]
        
        # Total amount
        total_amount = taxable_amount + total_tax
        
        return {
            "discount_amount": discount_amount,
            "taxable_amount": taxable_amount,
            "total_amount": total_amount,
            **gst_split
        }
    
    def create_invoice(
        self,
        company: Company,
        data: InvoiceCreate,
        customer: Optional[Customer] = None
    ) -> Invoice:
        """Create a new invoice with GST calculations."""
        # 🟢 DEBUG: Print incoming data
        print("\n" + "="*50)
        print("DEBUG: INVOICE CREATION STARTED")
        print("="*50)
        
        # Get next invoice number
        company_service = CompanyService(self.db)
        invoice_number = company_service.get_next_invoice_number(company)
        print(f"Invoice number: {invoice_number}")
        voucher_type = getattr(data, 'voucher_type', VoucherType.SALES)
        print(f"Voucher type: {voucher_type}")
        # Determine place of supply
        place_of_supply = data.place_of_supply
        if not place_of_supply and customer:
            place_of_supply = customer.billing_state_code
        if not place_of_supply and hasattr(data, 'customer_state_code'):
            place_of_supply = data.customer_state_code
        if not place_of_supply:
            place_of_supply = company.state_code or "27"  # Default to Maharashtra
        
        place_of_supply_name = INDIAN_STATE_CODES.get(place_of_supply, "")
        print(f"Place of supply: {place_of_supply} ({place_of_supply_name})")
        
        # Determine invoice type
        invoice_type = data.invoice_type
        if customer and customer.tax_number:
            invoice_type = InvoiceType.B2B
        print(f"Invoice type: {invoice_type}")
        
        # 🟢 DEBUG: Check if all fields are present in data
        print("\nDEBUG: Checking fields in data:")
        check_fields = [
            'voucher_type','round_off', 'sales_person_id', 'shipping_address', 'shipping_city',
            'shipping_state', 'shipping_zip', 'customer_name', 'customer_gstin',
            'customer_phone', 'customer_state', 'customer_state_code',
            'reference_no', 'delivery_note', 'payment_terms', 'supplier_ref',
            'other_references', 'buyer_order_no', 'buyer_order_date',
            'despatch_doc_no', 'delivery_note_date', 'despatched_through',
            'destination', 'terms_of_delivery', 'freight_charges',
            'packing_forwarding_charges', 'coupon_code', 'coupon_value',
            'discount_on_all', 'discount_type', 'payment_type', 'payment_account',
            'payment_note', 'adjust_advance_payment'
        ]
        
        for field in check_fields:
            if hasattr(data, field):
                value = getattr(data, field)
                print(f"  ✓ {field}: {value}")
            else:
                print(f"  ✗ {field}: NOT FOUND")
        
        print("\nDEBUG: Creating invoice object...")
        
        # Create invoice with ALL fields
        invoice = Invoice(
            company_id=company.id,
            customer_id=customer.id if customer else None,
            invoice_number=invoice_number,
            voucher_type=voucher_type,
            invoice_date=data.invoice_date or datetime.utcnow(),
            due_date=data.due_date,
            invoice_type=invoice_type,
            place_of_supply=place_of_supply,
            place_of_supply_name=place_of_supply_name,
            is_reverse_charge=data.is_reverse_charge,
            notes=data.notes or company.invoice_notes,
            terms=data.terms or company.invoice_terms,
            status=InvoiceStatus.DRAFT,
            
            # 🟢 ADD ALL THESE FIELDS
            round_off=getattr(data, 'round_off', Decimal('0.00')),
            sales_person_id=getattr(data, 'sales_person_id', None),
            
            # Shipping address
            shipping_address=getattr(data, 'shipping_address', None),
            shipping_city=getattr(data, 'shipping_city', None),
            shipping_state=getattr(data, 'shipping_state', None),
            shipping_country=getattr(data, 'shipping_country', 'India'),
            shipping_zip=getattr(data, 'shipping_zip', None),
            
            # Denormalized customer info
            customer_name=customer.name if customer else getattr(data, 'customer_name', None),
            customer_gstin=customer.tax_number if customer else getattr(data, 'customer_gstin', None),
            customer_phone=customer.contact if customer else getattr(data, 'customer_phone', None),
            customer_state=getattr(data, 'customer_state', None),
            customer_state_code=getattr(data, 'customer_state_code', None),
            
            # Other fields
            reference_no=getattr(data, 'reference_no', None),
            delivery_note=getattr(data, 'delivery_note', None),
            payment_terms=getattr(data, 'payment_terms', None),
            supplier_ref=getattr(data, 'supplier_ref', None),
            other_references=getattr(data, 'other_references', None),
            buyer_order_no=getattr(data, 'buyer_order_no', None),
            buyer_order_date=getattr(data, 'buyer_order_date', None),
            despatch_doc_no=getattr(data, 'despatch_doc_no', None),
            delivery_note_date=getattr(data, 'delivery_note_date', None),
            despatched_through=getattr(data, 'despatched_through', None),
            destination=getattr(data, 'destination', None),
            terms_of_delivery=getattr(data, 'terms_of_delivery', None),
            
            # Charges
            freight_charges=getattr(data, 'freight_charges', Decimal('0.00')),
            packing_forwarding_charges=getattr(data, 'packing_forwarding_charges', Decimal('0.00')),
            coupon_code=getattr(data, 'coupon_code', None),
            coupon_value=getattr(data, 'coupon_value', Decimal('0.00')),
            discount_on_all=getattr(data, 'discount_on_all', Decimal('0.00')),
            discount_type=getattr(data, 'discount_type', 'percentage'),
            
            # Payment
            payment_type=getattr(data, 'payment_type', None),
            payment_account=getattr(data, 'payment_account', None),
            payment_note=getattr(data, 'payment_note', None),
            adjust_advance_payment=getattr(data, 'adjust_advance_payment', False),
        )
        
        print(f"DEBUG: Invoice object created with ID: {invoice.id if hasattr(invoice, 'id') else 'Not yet'}")
        
        self.db.add(invoice)
        self.db.flush()  # Get invoice ID
        
        print(f"DEBUG: Invoice flushed, ID: {invoice.id}")
        
        # Calculate totals
        subtotal = Decimal("0")
        total_cgst = Decimal("0")
        total_sgst = Decimal("0")
        total_igst = Decimal("0")
        total_cess = Decimal("0")
        total_discount = Decimal("0")
        
        print(f"\nDEBUG: Processing {len(data.items)} items...")
        
        # Add invoice items
        for idx, item_data in enumerate(data.items):
            print(f"  Item {idx+1}: {item_data.description}")
            
            amounts = self._calculate_item_amounts(
                item_data,
                company.state_code or "27",
                place_of_supply
            )
            
            item = InvoiceItem(
                invoice_id=invoice.id,
                product_id=item_data.product_id,
                description=item_data.description,
                hsn_code=item_data.hsn_code,
                quantity=item_data.quantity,
                unit=item_data.unit,
                unit_price=item_data.unit_price,
                discount_percent=item_data.discount_percent,
                discount_amount=amounts["discount_amount"],
                gst_rate=item_data.gst_rate,
                cgst_rate=amounts["cgst_rate"],
                sgst_rate=amounts["sgst_rate"],
                igst_rate=amounts["igst_rate"],
                cgst_amount=amounts["cgst_amount"],
                sgst_amount=amounts["sgst_amount"],
                igst_amount=amounts["igst_amount"],
                cess_amount=Decimal("0"),
                taxable_amount=amounts["taxable_amount"],
                total_amount=amounts["total_amount"],
            )
            
            # 🟢 DEBUG: Print item calculations
            print(f"    Quantity: {item.quantity}, Unit Price: {item.unit_price}")
            print(f"    Taxable: {amounts['taxable_amount']}, Tax: {amounts['cgst_amount'] + amounts['sgst_amount'] + amounts['igst_amount']}")
            print(f"    Total: {amounts['total_amount']}")
            
            self.db.add(item)
            
            # Accumulate totals
            subtotal += amounts["taxable_amount"]
            total_cgst += amounts["cgst_amount"]
            total_sgst += amounts["sgst_amount"]
            total_igst += amounts["igst_amount"]
            total_discount += amounts["discount_amount"]
        
        # Update invoice totals
        total_tax = total_cgst + total_sgst + total_igst + total_cess
        
        # 🟢 IMPORTANT: Include additional charges in total calculation
        freight = getattr(data, 'freight_charges', Decimal('0.00'))
        packing = getattr(data, 'packing_forwarding_charges', Decimal('0.00'))
        coupon = getattr(data, 'coupon_value', Decimal('0.00'))
        discount_all = getattr(data, 'discount_on_all', Decimal('0.00'))
        round_off = getattr(data, 'round_off', Decimal('0.00'))
        
        # Calculate discount on all
        discount_all_amount = discount_all
        if getattr(data, 'discount_type', 'percentage') == 'percentage':
            discount_all_amount = subtotal * (discount_all / Decimal('100'))
        
        # Calculate final total
        base_total = subtotal + total_tax
        total_with_charges = base_total + freight + packing
        total_with_coupon = total_with_charges - coupon
        total_with_discount = total_with_coupon - discount_all_amount
        final_total = total_with_discount + round_off
        
        print(f"\nDEBUG: Invoice totals calculation:")
        print(f"  Subtotal: {subtotal}")
        print(f"  Tax (CGST: {total_cgst}, SGST: {total_sgst}, IGST: {total_igst}): {total_tax}")
        print(f"  Base total (subtotal + tax): {base_total}")
        print(f"  + Freight: {freight}, + Packing: {packing}")
        print(f"  - Coupon: {coupon}")
        print(f"  - Discount on all: {discount_all_amount}")
        print(f"  + Round off: {round_off}")
        print(f"  = FINAL TOTAL: {final_total}")
        
        # Update invoice with correct totals
        invoice.subtotal = subtotal
        invoice.discount_amount = total_discount + discount_all_amount  # Include discount on all
        invoice.cgst_amount = total_cgst
        invoice.sgst_amount = total_sgst
        invoice.igst_amount = total_igst
        invoice.cess_amount = total_cess
        invoice.total_tax = total_tax
        invoice.total_amount = final_total
        invoice.balance_due = final_total
        
        # Set amount_paid if payment was made
        payment_amount = getattr(data, 'payment_amount', Decimal('0.00'))
        if payment_amount > 0:
            invoice.amount_paid = payment_amount
            invoice.balance_due = final_total - payment_amount
            print(f"  Payment made: {payment_amount}, Balance due: {invoice.balance_due}")
        
        # Generate UPI QR
        if company.bank_accounts:
            default_bank = next(
                (b for b in company.bank_accounts if b.is_default),
                company.bank_accounts[0]
            )
            if default_bank.upi_id:
                invoice.upi_qr_data = self._generate_upi_string(
                    default_bank.upi_id,
                    company.name,
                    final_total,
                    invoice_number
                )
                invoice.payment_link = self._generate_upi_link(
                    default_bank.upi_id,
                    company.name,
                    final_total,
                    invoice_number
                )
        
        print(f"\nDEBUG: Committing to database...")
        self.db.commit()
        self.db.refresh(invoice)
        
        print(f"DEBUG: Invoice created successfully!")
        print(f"  Invoice ID: {invoice.id}")
        print(f"  Customer: {invoice.customer_name}")
        print(f"  Total Amount: {invoice.total_amount}")
        
        # Auto-allocate stock if enabled and not manual override
        if company.auto_reduce_stock and not getattr(data, 'manual_warehouse_override', False):
            from app.services.stock_allocation_service import StockAllocationService
            stock_service = StockAllocationService(self.db)
            
            # Get manual allocations if provided
            manual_allocation = getattr(data, 'warehouse_allocations', None)
            stock_service.allocate_stock_for_invoice(invoice, manual_allocation)
        
        print("="*50)
        print("DEBUG: INVOICE CREATION COMPLETED")
        print("="*50 + "\n")
        
        return invoice
    def _generate_upi_string(
        self,
        upi_id: str,
        payee_name: str,
        amount: Decimal,
        reference: str
    ) -> str:
        """Generate UPI payment string."""
        # Clean payee name (UPI only allows alphanumeric and spaces)
        clean_name = ''.join(c for c in payee_name if c.isalnum() or c.isspace())[:50]
        return f"upi://pay?pa={upi_id}&pn={clean_name}&am={amount}&tn=Invoice%20{reference}&cu=INR"
    
    def _generate_upi_link(
        self,
        upi_id: str,
        payee_name: str,
        amount: Decimal,
        reference: str
    ) -> str:
        """Generate UPI deep link."""
        clean_name = ''.join(c for c in payee_name if c.isalnum() or c.isspace())[:50]
        return f"upi://pay?pa={upi_id}&pn={clean_name}&am={amount}&tn=Invoice {reference}&cu=INR"
    
    def generate_upi_qr_image(self, invoice: Invoice) -> str:
        """Generate UPI QR code as base64 image."""
        if not invoice.upi_qr_data:
            return ""
        
        qr = qrcode.QRCode(version=1, box_size=10, border=5)
        qr.add_data(invoice.upi_qr_data)
        qr.make(fit=True)
        
        img = qr.make_image(fill_color="black", back_color="white")
        
        buffer = BytesIO()
        img.save(buffer, format="PNG")
        buffer.seek(0)
        
        return base64.b64encode(buffer.getvalue()).decode()
    
    def get_invoice(self, invoice_id: str, company: Company) -> Optional[Invoice]:
        """Get an invoice by ID (must belong to company)."""
        return self.db.query(Invoice).filter(
            Invoice.id == invoice_id,
            Invoice.company_id == company.id
        ).first()
    
    def get_invoices(
        self,
        company: Company,
        page: int = 1,
        page_size: int = 20,
        voucher_type: Optional[str] = None, 
        status: Optional[str] = None,
        customer_id: Optional[str] = None,
        from_date: Optional[date] = None,
        to_date: Optional[date] = None,
        search: Optional[str] = None
    ) -> Tuple[List[Invoice], int, dict]:
        """Get invoices with pagination and filters."""
        query = self.db.query(Invoice).filter(Invoice.company_id == company.id)
        
        # Status filter
        if status:
            query = query.filter(Invoice.status == status)
        
        # Customer filter
        if customer_id:
            query = query.filter(Invoice.customer_id == customer_id)
        
        # Date range filter
        if from_date:
            query = query.filter(Invoice.invoice_date >= from_date)
        if to_date:
            query = query.filter(Invoice.invoice_date <= to_date)
        if voucher_type:
          try:
            voucher_enum = VoucherType(voucher_type.lower())
            query = query.filter(Invoice.voucher_type == voucher_enum)
          except ValueError:
            # Invalid voucher type - ignore filter
            pass
        # Search filter
        if search:
            search_filter = f"%{search}%"
            query = query.filter(Invoice.invoice_number.ilike(search_filter))
        
        # Get total count
        total = query.count()
        
        # Get summary
        summary = self.db.query(
            func.sum(Invoice.total_amount).label('total_amount'),
            func.sum(Invoice.amount_paid).label('total_paid'),
            func.sum(Invoice.balance_due).label('total_pending')
        ).filter(Invoice.company_id == company.id).first()
        
        summary_dict = {
            "total_amount": summary.total_amount or Decimal("0"),
            "total_paid": summary.total_paid or Decimal("0"),
            "total_pending": summary.total_pending or Decimal("0"),
        }
        
        # Pagination
        offset = (page - 1) * page_size
        invoices = query.order_by(Invoice.invoice_date.desc()).offset(offset).limit(page_size).all()
        
        return invoices, total, summary_dict
    
    def update_invoice(self, invoice: Invoice, data: InvoiceUpdate) -> Invoice:
        """Update an invoice."""
        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
          if field == 'voucher_type' and isinstance(value, str):
            # Convert string to VoucherType enum
            setattr(invoice, field, VoucherType(value.lower()))
          else:
            setattr(invoice, field, value)
      
        
        self.db.commit()
        self.db.refresh(invoice)
        return invoice
    
    def update_invoice_status(self, invoice: Invoice, status: InvoiceStatus, reason: str = None) -> Invoice:
        """Update invoice status and handle stock changes."""
        old_status = invoice.status
        invoice.status = status
        
        # Handle stock finalization when marking as PAID
        if status == InvoiceStatus.PAID and old_status != InvoiceStatus.PAID:
            from app.services.stock_allocation_service import StockAllocationService
            stock_service = StockAllocationService(self.db)
            stock_service.finalize_stock_reduction(invoice)
        
        # Handle stock restoration when cancelling or refunding
        if status in [InvoiceStatus.CANCELLED, InvoiceStatus.REFUNDED]:
            from app.services.stock_allocation_service import StockAllocationService
            stock_service = StockAllocationService(self.db)
            stock_service.restore_stock(invoice, reason=reason or status.value)
        
        self.db.commit()
        self.db.refresh(invoice)
        return invoice
    
    def finalize_invoice(self, invoice: Invoice) -> Invoice:
        """Finalize a draft invoice (make it pending)."""
        if invoice.status != InvoiceStatus.DRAFT:
            raise ValueError("Only draft invoices can be finalized")
        
        invoice.status = InvoiceStatus.PENDING
        self.db.commit()
        self.db.refresh(invoice)
        
        # Create accounting journal entries
        try:
            from app.services.accounting_service import AccountingService
            accounting_service = AccountingService(self.db)
            accounting_service.create_invoice_entries(invoice)
        except Exception as e:
            # Log error but don't fail invoice finalization
            print(f"Warning: Failed to create accounting entries for invoice {invoice.invoice_number}: {e}")
        
        return invoice
    
    def cancel_invoice(self, invoice: Invoice, reason: str = None) -> Invoice:
        """Cancel an invoice and restore stock."""
        if invoice.status == InvoiceStatus.PAID:
            raise ValueError("Cannot cancel a fully paid invoice. Use refund instead.")
        if invoice.status in [InvoiceStatus.REFUNDED, InvoiceStatus.VOID]:
            raise ValueError(f"Cannot cancel an invoice that is already {invoice.status.value}")
        
        # Restore stock if it was reduced
        from app.services.stock_allocation_service import StockAllocationService
        stock_service = StockAllocationService(self.db)
        stock_service.restore_stock(invoice, reason=reason or "Cancelled")
        
        invoice.status = InvoiceStatus.CANCELLED
        if reason:
            invoice.notes = f"{invoice.notes or ''}\n\n[CANCELLED] {reason}".strip()
        self.db.commit()
        self.db.refresh(invoice)
        return invoice
    
    def delete_invoice(self, invoice: Invoice) -> bool:
        """Delete an invoice permanently. Only draft invoices can be deleted."""
        if invoice.status != InvoiceStatus.DRAFT:
            raise ValueError("Only draft invoices can be deleted. For finalized invoices, use cancel or void instead.")
        
        self.db.delete(invoice)
        self.db.commit()
        return True
    
    def refund_invoice(self, invoice: Invoice, reason: str = None, refund_amount: Decimal = None) -> Invoice:
        """Mark an invoice as refunded and restore stock."""
        if invoice.status not in [InvoiceStatus.PAID, InvoiceStatus.PARTIALLY_PAID]:
            raise ValueError("Only paid or partially paid invoices can be refunded")
        
        # Restore stock if it was reduced
        from app.services.stock_allocation_service import StockAllocationService
        stock_service = StockAllocationService(self.db)
        stock_service.restore_stock(invoice, reason=reason or "Refunded")
        
        invoice.status = InvoiceStatus.REFUNDED
        # Reset payment tracking
        if refund_amount:
            invoice.amount_paid = invoice.amount_paid - refund_amount
            invoice.balance_due = invoice.total_amount - invoice.amount_paid
        else:
            invoice.amount_paid = Decimal("0")
            invoice.balance_due = invoice.total_amount
        
        if reason:
            invoice.notes = f"{invoice.notes or ''}\n\n[REFUNDED] {reason}".strip()
        
        self.db.commit()
        self.db.refresh(invoice)
        return invoice
    
    def void_invoice(self, invoice: Invoice, reason: str = None) -> Invoice:
        """Void an invoice (for accounting purposes, keeps record but marks as void)."""
        if invoice.status == InvoiceStatus.VOID:
            raise ValueError("Invoice is already voided")
        if invoice.status == InvoiceStatus.PAID and invoice.amount_paid > 0:
            raise ValueError("Cannot void a paid invoice. Use refund first, then void.")
        
        invoice.status = InvoiceStatus.VOID
        if reason:
            invoice.notes = f"{invoice.notes or ''}\n\n[VOIDED] {reason}".strip()
        
        self.db.commit()
        self.db.refresh(invoice)
        return invoice
    
    def write_off_invoice(self, invoice: Invoice, reason: str = None) -> Invoice:
        """Write off an invoice as uncollectible."""
        if invoice.status not in [InvoiceStatus.PENDING, InvoiceStatus.PARTIALLY_PAID, InvoiceStatus.OVERDUE]:
            raise ValueError("Only pending, partially paid, or overdue invoices can be written off")
        
        invoice.status = InvoiceStatus.WRITE_OFF
        if reason:
            invoice.notes = f"{invoice.notes or ''}\n\n[WRITTEN OFF] {reason}".strip()
        
        self.db.commit()
        self.db.refresh(invoice)
        return invoice
    
    def add_item_to_invoice(
        self,
        invoice: Invoice,
        item_data: InvoiceItemCreate,
        company: Company
    ) -> InvoiceItem:
        """Add an item to an existing invoice."""
        if invoice.status not in [InvoiceStatus.DRAFT]:
            raise ValueError("Can only add items to draft invoices")
        
        amounts = self._calculate_item_amounts(
            item_data,
            company.state_code or "27",
            invoice.place_of_supply
        )
        
        item = InvoiceItem(
            invoice_id=invoice.id,
            product_id=item_data.product_id,
            description=item_data.description,
            hsn_code=item_data.hsn_code,
            quantity=item_data.quantity,
            unit=item_data.unit,
            unit_price=item_data.unit_price,
            discount_percent=item_data.discount_percent,
            **amounts
        )
        
        self.db.add(item)
        
        # Recalculate invoice totals
        self._recalculate_invoice_totals(invoice)
        
        self.db.commit()
        self.db.refresh(item)
        return item
    
    def remove_item_from_invoice(self, invoice: Invoice, item_id: str) -> bool:
        """Remove an item from an invoice."""
        if invoice.status not in [InvoiceStatus.DRAFT]:
            raise ValueError("Can only remove items from draft invoices")
        
        item = self.db.query(InvoiceItem).filter(
            InvoiceItem.id == item_id,
            InvoiceItem.invoice_id == invoice.id
        ).first()
        
        if not item:
            return False
        
        self.db.delete(item)
        
        # Recalculate invoice totals
        self._recalculate_invoice_totals(invoice)
        
        self.db.commit()
        return True
    
    def _recalculate_invoice_totals(self, invoice: Invoice):
        """Recalculate invoice totals from items."""
        items = self.db.query(InvoiceItem).filter(InvoiceItem.invoice_id == invoice.id).all()
        
        subtotal = sum(item.taxable_amount for item in items)
        total_cgst = sum(item.cgst_amount for item in items)
        total_sgst = sum(item.sgst_amount for item in items)
        total_igst = sum(item.igst_amount for item in items)
        total_cess = sum(item.cess_amount for item in items)
        total_discount = sum(item.discount_amount for item in items)
        
        total_tax = total_cgst + total_sgst + total_igst + total_cess
        total_amount = subtotal + total_tax
        
        invoice.subtotal = subtotal
        invoice.discount_amount = total_discount
        invoice.cgst_amount = total_cgst
        invoice.sgst_amount = total_sgst
        invoice.igst_amount = total_igst
        invoice.cess_amount = total_cess
        invoice.total_tax = total_tax
        invoice.total_amount = total_amount
        invoice.balance_due = total_amount - invoice.amount_paid
    
    def get_dashboard_summary(self, company: Company) -> dict:
        """Get invoice summary for dashboard."""
        from datetime import datetime, timedelta
        
        # Current month
        today = datetime.utcnow()
        first_of_month = today.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        
        # Total counts and amounts
        total_invoices = self.db.query(Invoice).filter(
            Invoice.company_id == company.id
        ).count()
        
        # Revenue (paid invoices)
        total_revenue = self.db.query(func.sum(Invoice.amount_paid)).filter(
            Invoice.company_id == company.id
        ).scalar() or Decimal("0")
        
        # Pending amount
        total_pending = self.db.query(func.sum(Invoice.balance_due)).filter(
            Invoice.company_id == company.id,
            Invoice.status.in_([InvoiceStatus.PENDING, InvoiceStatus.PARTIALLY_PAID])
        ).scalar() or Decimal("0")
        
        # Overdue
        overdue_count = self.db.query(Invoice).filter(
            Invoice.company_id == company.id,
            Invoice.status == InvoiceStatus.OVERDUE
        ).count()
        
        overdue_amount = self.db.query(func.sum(Invoice.balance_due)).filter(
            Invoice.company_id == company.id,
            Invoice.status == InvoiceStatus.OVERDUE
        ).scalar() or Decimal("0")
        
        # Current month
        current_month_revenue = self.db.query(func.sum(Invoice.total_amount)).filter(
            Invoice.company_id == company.id,
            Invoice.invoice_date >= first_of_month,
            Invoice.status.in_([InvoiceStatus.PAID, InvoiceStatus.PARTIALLY_PAID, InvoiceStatus.PENDING])
        ).scalar() or Decimal("0")
        
        current_month_invoices = self.db.query(Invoice).filter(
            Invoice.company_id == company.id,
            Invoice.invoice_date >= first_of_month
        ).count()
        
        # GST totals
        gst_totals = self.db.query(
            func.sum(Invoice.cgst_amount).label('cgst'),
            func.sum(Invoice.sgst_amount).label('sgst'),
            func.sum(Invoice.igst_amount).label('igst')
        ).filter(
            Invoice.company_id == company.id,
            Invoice.status != InvoiceStatus.CANCELLED
        ).first()
        
        return {
            "total_invoices": total_invoices,
            "total_revenue": total_revenue,
            "total_pending": total_pending,
            "total_paid": total_revenue,
            "overdue_count": overdue_count,
            "overdue_amount": overdue_amount,
            "current_month_revenue": current_month_revenue,
            "current_month_invoices": current_month_invoices,
            "total_cgst": gst_totals.cgst or Decimal("0"),
            "total_sgst": gst_totals.sgst or Decimal("0"),
            "total_igst": gst_totals.igst or Decimal("0"),
        }

