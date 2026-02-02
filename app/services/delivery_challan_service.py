"""Delivery Challan service for goods dispatch (DC Out) and returns (DC In)."""
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from typing import List, Optional, Dict, Any
from datetime import datetime, date
from decimal import Decimal, ROUND_HALF_UP
from app.database.models import (
    DeliveryChallan, DeliveryChallanItem, DeliveryChallanType, DeliveryChallanStatus,
    Company, Customer, Product, Invoice, InvoiceItem, Quotation, SalesOrder,
    StockEntry, StockMovementType, Godown, Batch, User, Contact,
    generate_uuid
)


class DeliveryChallanService:
    """Service for delivery challan operations with stock management."""
    
    def __init__(self, db: Session):
        self.db = db
    
    def _round_amount(self, amount: Decimal) -> Decimal:
        """Round amount to 2 decimal places."""
        return Decimal(str(amount)).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
    
    def _get_next_dc_number(self, company: Company, dc_type: DeliveryChallanType) -> str:
        """Generate next DC number."""
        prefix = "DCO" if dc_type == DeliveryChallanType.DC_OUT else "DCI"
        current_year = datetime.now().year
        
        last_dc = self.db.query(DeliveryChallan).filter(
            DeliveryChallan.company_id == company.id,
            DeliveryChallan.dc_type == dc_type,
            func.extract('year', DeliveryChallan.dc_date) == current_year
        ).order_by(DeliveryChallan.dc_number.desc()).first()
        
        if last_dc and last_dc.dc_number:
            try:
                # Try to parse existing format
                if '-' in last_dc.dc_number:
                    last_num = int(last_dc.dc_number.split('-')[-1])
                    next_num = last_num + 1
                else:
                    # If it's a simple number
                    last_num = int(last_dc.dc_number)
                    next_num = last_num + 1
            except (ValueError, IndexError):
                next_num = 1
        else:
            next_num = 1
        
        return f"{prefix}-{current_year}-{next_num:04d}"
    
    def create_dc_out(
        self,
        company: Company,
        items: List[Dict[str, Any]],
        customer_id: Optional[str] = None,
        invoice_id: Optional[str] = None,
        reference_no: Optional[str] = None,
        
        quotation_id: Optional[str] = None,
        sales_order_id: Optional[str] = None,
        sales_ticket_id: Optional[str] = None,
        contact_id: Optional[str] = None,
        dc_date: Optional[datetime] = None,
        from_godown_id: Optional[str] = None,
        transporter_name: Optional[str] = None,
        vehicle_number: Optional[str] = None,
        eway_bill_number: Optional[str] = None,
        delivery_address: Optional[Dict[str, str]] = None,
        notes: Optional[str] = None,
        auto_update_stock: bool = True,
        # New fields from frontend
        dc_number: Optional[str] = None,
        status: str = "Open",
        custom_status: str = "Open",
        bill_title: Optional[str] = None,
        bill_description: Optional[str] = None,
        contact_person: Optional[str] = None,
        expiry_date: Optional[datetime] = None,
        salesman_id: Optional[str] = None,
        # Charges and discounts
        subtotal: Optional[Decimal] = None,
        freight_charges: Optional[Decimal] = None,
        packing_forwarding_charges: Optional[Decimal] = None,
        discount_on_all: Optional[Decimal] = None,
        discount_type: str = "percentage",
        round_off: Optional[Decimal] = None,
        grand_total: Optional[Decimal] = None,
    ) -> DeliveryChallan:
        """
        Create a DC Out (Delivery Challan for goods dispatch) with new fields.
        """
        # Get customer from linked documents if not provided
        if not customer_id:
            if invoice_id:
                invoice = self.db.query(Invoice).filter(Invoice.id == invoice_id).first()
                if invoice:
                    customer_id = invoice.customer_id
            elif quotation_id:
                quotation = self.db.query(Quotation).filter(Quotation.id == quotation_id).first()
                if quotation:
                    customer_id = quotation.customer_id
            elif sales_order_id:
                sales_order = self.db.query(SalesOrder).filter(SalesOrder.id == sales_order_id).first()
                if sales_order:
                    customer_id = sales_order.customer_id
        
        # Normalize empty godown id to None to satisfy FK constraint
        from_godown_id = from_godown_id or None

        # Get or generate DC number
        if not dc_number:
            dc_number = self._get_next_dc_number(company, DeliveryChallanType.DC_OUT)
        
        # Convert status string to enum if possible
        dc_status = DeliveryChallanStatus.DRAFT
        if status.lower() == "dispatched":
            dc_status = DeliveryChallanStatus.DISPATCHED
        elif status.lower() == "delivered":
            dc_status = DeliveryChallanStatus.DELIVERED
        elif status.lower() == "cancelled":
            dc_status = DeliveryChallanStatus.CANCELLED
        elif status.lower() == "received":
            dc_status = DeliveryChallanStatus.RECEIVED

        # Try to get contact from contact_person name
        if not contact_id and contact_person and customer_id:
            contact = self.db.query(Contact).filter(
                Contact.company_id == company.id,
                Contact.name == contact_person
            ).first()
            if contact:
                contact_id = contact.id

        # Create delivery challan with all fields
        dc = DeliveryChallan(
            id=generate_uuid(),
            company_id=company.id,
            customer_id=customer_id,
            dc_number=dc_number,
            dc_date=dc_date or datetime.utcnow(),
            dc_type=DeliveryChallanType.DC_OUT,
            status=dc_status,
             reference_no=reference_no,
            custom_status=custom_status,  # Your frontend status
            # New fields
            bill_title=bill_title,
            bill_description=bill_description,
            expiry_date=expiry_date,
            salesman_id=salesman_id,
            # Relationship fields
            sales_ticket_id=sales_ticket_id,
            contact_id=contact_id,
            invoice_id=invoice_id,
            quotation_id=quotation_id,
            sales_order_id=sales_order_id,
            from_godown_id=from_godown_id,
            transporter_name=transporter_name,
            vehicle_number=vehicle_number,
            eway_bill_number=eway_bill_number,
            notes=notes,
        )
        
        # Set delivery address
        if delivery_address:
            dc.delivery_to_address = delivery_address.get("address")
            dc.delivery_to_city = delivery_address.get("city")
            dc.delivery_to_state = delivery_address.get("state")
            dc.delivery_to_pincode = delivery_address.get("pincode")
        elif customer_id:
            # Use customer's shipping address
            customer = self.db.query(Customer).filter(Customer.id == customer_id).first()
            if customer:
                dc.delivery_to_address = customer.shipping_address or customer.billing_address
                dc.delivery_to_city = customer.shipping_city or customer.billing_city
                dc.delivery_to_state = customer.shipping_state or customer.billing_state
                dc.delivery_to_pincode = customer.shipping_zip or customer.billing_zip
        
        # Set dispatch address from godown or company
        if from_godown_id:
            godown = self.db.query(Godown).filter(Godown.id == from_godown_id).first()
            if godown:
                dc.dispatch_from_address = godown.address
                dc.dispatch_from_city = godown.city
                dc.dispatch_from_state = godown.state
                dc.dispatch_from_pincode = godown.pincode
        else:
            dc.dispatch_from_address = company.address
            dc.dispatch_from_city = company.city
            dc.dispatch_from_state = company.state
            dc.dispatch_from_pincode = company.pincode
        
        self.db.add(dc)
        self.db.flush()
        
        # Add items with all fields
        for item_data in items:
            product_id = item_data.get("product_id")
            product = None
            if product_id:
                product = self.db.query(Product).filter(Product.id == product_id).first()
            
            qty = Decimal(str(item_data.get("quantity", 0)))
            
            # Calculate item totals if not provided
            unit_price = Decimal(str(item_data.get("unit_price", 0)))
            discount_percent = Decimal(str(item_data.get("discount_percent", 0)))
            gst_rate = Decimal(str(item_data.get("gst_rate", 0)))
            
            item_total = qty * unit_price
            discount_amount = item_total * (discount_percent / Decimal('100'))
            taxable_amount = item_total - discount_amount
            tax_amount = taxable_amount * (gst_rate / Decimal('100'))
            total_amount = taxable_amount + tax_amount
            
            # Set CGST/SGST/IGST rates (assuming intra-state)
            cgst_rate = gst_rate / Decimal('2')
            sgst_rate = gst_rate / Decimal('2')
            igst_rate = Decimal('0')
            
            dc_item = DeliveryChallanItem(
                id=generate_uuid(),
                delivery_challan_id=dc.id,
                product_id=product_id,
                invoice_item_id=item_data.get("invoice_item_id"),
                batch_id=item_data.get("batch_id"),
                description=item_data.get("description") or (product.name if product else "Item"),
                hsn_code=item_data.get("hsn_code") or (product.hsn_code if product else None),
                quantity=qty,
                unit=item_data.get("unit") or (product.unit if product else "unit"),
                unit_price=unit_price,
                # New item fields
                discount_percent=discount_percent,
                discount_amount=discount_amount,
                gst_rate=gst_rate,
                cgst_rate=cgst_rate,
                sgst_rate=sgst_rate,
                igst_rate=igst_rate,
                taxable_amount=taxable_amount,
                total_amount=total_amount,
                godown_id=item_data.get("godown_id") or from_godown_id,
                serial_numbers=item_data.get("serial_numbers"),
                notes=item_data.get("notes"),
            )
            self.db.add(dc_item)
        
        self.db.commit()
        self.db.refresh(dc)
        
        # Update stock if requested
        if auto_update_stock:
            self.update_stock_for_dc(dc)
        
        return dc
    
    def create_dc_in(
        self,
        company: Company,
        items: List[Dict[str, Any]],
        customer_id: Optional[str] = None,
        original_dc_id: Optional[str] = None,
        invoice_id: Optional[str] = None,
        sales_ticket_id: Optional[str] = None,
        contact_id: Optional[str] = None,
        reference_no: Optional[str] = None,
        dc_date: Optional[datetime] = None,
        to_godown_id: Optional[str] = None,
        return_reason: Optional[str] = None,
        notes: Optional[str] = None,
        auto_update_stock: bool = True,
        # New fields from frontend
        dc_number: Optional[str] = None,
        status: str = "Open",
        custom_status: str = "Open",
        bill_title: Optional[str] = None,
        bill_description: Optional[str] = None,
        contact_person: Optional[str] = None,
        expiry_date: Optional[datetime] = None,
        salesman_id: Optional[str] = None,
        # Charges and discounts
        subtotal: Optional[Decimal] = None,
        freight_charges: Optional[Decimal] = None,
        packing_forwarding_charges: Optional[Decimal] = None,
        discount_on_all: Optional[Decimal] = None,
        discount_type: str = "percentage",
        round_off: Optional[Decimal] = None,
        grand_total: Optional[Decimal] = None,
    ) -> DeliveryChallan:
        """
        Create a DC In (Delivery Challan for goods return) with new fields.
        """
        # Normalize empty godown id to None to satisfy FK constraint
        to_godown_id = to_godown_id or None

        # Get info from original DC if provided
        original_dc = None
        if original_dc_id:
            original_dc = self.db.query(DeliveryChallan).filter(
                DeliveryChallan.id == original_dc_id
            ).first()
            if original_dc and not customer_id:
                customer_id = original_dc.customer_id
            if original_dc and not invoice_id:
                invoice_id = original_dc.invoice_id
            if original_dc and not sales_ticket_id:
                sales_ticket_id = original_dc.sales_ticket_id
            if original_dc and not contact_id:
                contact_id = original_dc.contact_id
        
        # Get or generate DC number
        if not dc_number:
            dc_number = self._get_next_dc_number(company, DeliveryChallanType.DC_IN)
        
        # Convert status string to enum if possible
        dc_status = DeliveryChallanStatus.DRAFT
        if status.lower() == "received":
            dc_status = DeliveryChallanStatus.RECEIVED
        elif status.lower() == "cancelled":
            dc_status = DeliveryChallanStatus.CANCELLED

        # Try to get contact from contact_person name
        if not contact_id and contact_person and customer_id:
            contact = self.db.query(Contact).filter(
                Contact.company_id == company.id,
                Contact.name == contact_person
            ).first()
            if contact:
                contact_id = contact.id

        # Create return challan with all fields
        dc = DeliveryChallan(
            id=generate_uuid(),
            company_id=company.id,
            customer_id=customer_id,
            dc_number=dc_number,
            dc_date=dc_date or datetime.utcnow(),
            dc_type=DeliveryChallanType.DC_IN,
            status=dc_status,
             reference_no=reference_no,
            custom_status=custom_status,  # Your frontend status
            # New fields
            bill_title=bill_title,
            bill_description=bill_description,
            expiry_date=expiry_date,
            salesman_id=salesman_id,
            # Relationship fields
            sales_ticket_id=sales_ticket_id,
            contact_id=contact_id,
            invoice_id=invoice_id,
            original_dc_id=original_dc_id,
            return_reason=return_reason,
            to_godown_id=to_godown_id,
            notes=notes,
        )
        
        self.db.add(dc)
        self.db.flush()
        
        # Add return items with all fields
        for item_data in items:
            product_id = item_data.get("product_id")
            product = None
            if product_id:
                product = self.db.query(Product).filter(Product.id == product_id).first()
            
            qty = Decimal(str(item_data.get("quantity", 0)))
            
            # Calculate item totals if not provided
            unit_price = Decimal(str(item_data.get("unit_price", 0)))
            discount_percent = Decimal(str(item_data.get("discount_percent", 0)))
            gst_rate = Decimal(str(item_data.get("gst_rate", 0)))
            
            item_total = qty * unit_price
            discount_amount = item_total * (discount_percent / Decimal('100'))
            taxable_amount = item_total - discount_amount
            tax_amount = taxable_amount * (gst_rate / Decimal('100'))
            total_amount = taxable_amount + tax_amount
            
            # Set CGST/SGST/IGST rates (assuming intra-state)
            cgst_rate = gst_rate / Decimal('2')
            sgst_rate = gst_rate / Decimal('2')
            igst_rate = Decimal('0')
            
            dc_item = DeliveryChallanItem(
                id=generate_uuid(),
                delivery_challan_id=dc.id,
                product_id=product_id,
                batch_id=item_data.get("batch_id"),
                description=item_data.get("description") or (product.name if product else "Item"),
                hsn_code=item_data.get("hsn_code") or (product.hsn_code if product else None),
                quantity=qty,
                unit=item_data.get("unit") or (product.unit if product else "unit"),
                unit_price=unit_price,
                # New item fields
                discount_percent=discount_percent,
                discount_amount=discount_amount,
                gst_rate=gst_rate,
                cgst_rate=cgst_rate,
                sgst_rate=sgst_rate,
                igst_rate=igst_rate,
                taxable_amount=taxable_amount,
                total_amount=total_amount,
                godown_id=item_data.get("godown_id") or to_godown_id,
                serial_numbers=item_data.get("serial_numbers"),
                notes=item_data.get("notes"),
            )
            self.db.add(dc_item)
        
        self.db.commit()
        self.db.refresh(dc)
        
        # Update stock if requested
        if auto_update_stock:
            self.update_stock_for_dc(dc)
        
        return dc
    
    def update_stock_for_dc(self, dc: DeliveryChallan) -> List[StockEntry]:
        """
        Update stock based on delivery challan.
        
        DC Out: Reduces stock (stock goes out)
        DC In: Increases stock (stock comes back)
        """
        if dc.stock_updated:
            return []
        
        entries = []
        company = self.db.query(Company).filter(Company.id == dc.company_id).first()
        
        for item in dc.items:
            if not item.product_id:
                continue
            
            product = self.db.query(Product).filter(Product.id == item.product_id).first()
            if not product or product.is_service:
                continue
            
            qty = Decimal(str(item.quantity))
            
            # Determine movement type based on DC type
            if dc.dc_type == DeliveryChallanType.DC_OUT:
                movement_type = StockMovementType.SALE
                qty = -abs(qty)  # Negative for stock out
                notes = f"DC Out - {dc.dc_number}"
            else:  # DC_IN (return)
                movement_type = StockMovementType.ADJUSTMENT_IN
                qty = abs(qty)  # Positive for stock in
                notes = f"DC In (Return) - {dc.dc_number}"
            
            godown_id = item.godown_id or dc.from_godown_id or dc.to_godown_id
            
            # Create stock entry
            entry = StockEntry(
                id=generate_uuid(),
                company_id=dc.company_id,
                product_id=item.product_id,
                godown_id=godown_id,
                batch_id=item.batch_id,
                entry_date=dc.dc_date,
                movement_type=movement_type,
                quantity=qty,
                unit=item.unit,
                rate=item.unit_price,
                value=abs(qty) * item.unit_price,
                reference_type="delivery_challan",
                reference_id=dc.id,
                reference_number=dc.dc_number,
                notes=notes,
            )
            self.db.add(entry)
            entries.append(entry)
            
            # Update product stock
            if product.current_stock is not None:
                product.current_stock = product.current_stock + qty
            else:
                product.current_stock = qty
            
            # Link stock entry to item
            item.stock_movement_id = entry.id
        
        # Mark DC as stock updated
        dc.stock_updated = True
        dc.stock_updated_at = datetime.utcnow()
        
        self.db.commit()
        
        return entries
    
    def create_dc_from_invoice(
        self,
        invoice: Invoice,
        from_godown_id: Optional[str] = None,
        items: Optional[List[Dict[str, Any]]] = None,
        partial_dispatch: bool = False,
        # New fields
        dc_number: Optional[str] = None,
        status: str = "Open",
        reference_no: Optional[str] = None,
        custom_status: str = "Open",
        bill_title: Optional[str] = None,
        bill_description: Optional[str] = None,
        contact_person: Optional[str] = None,
        expiry_date: Optional[datetime] = None,
        salesman_id: Optional[str] = None,
        # Charges and discounts
        subtotal: Optional[Decimal] = None,
        freight_charges: Optional[Decimal] = None,
        packing_forwarding_charges: Optional[Decimal] = None,
        discount_on_all: Optional[Decimal] = None,
        discount_type: str = "percentage",
        round_off: Optional[Decimal] = None,
        grand_total: Optional[Decimal] = None,
    ) -> DeliveryChallan:
        """
        Create a DC Out from an invoice with new fields.
        """
        company = self.db.query(Company).filter(Company.id == invoice.company_id).first()
        
        # Prepare items
        dc_items = []
        
        if items and partial_dispatch:
            # Use specified items for partial dispatch
            dc_items = items
        else:
            # Include all invoice items
            for inv_item in invoice.items:
                # Convert invoice item to DC item format with all fields
                dc_item = {
                    "product_id": inv_item.product_id,
                    "invoice_item_id": inv_item.id,
                    "description": inv_item.description,
                    "hsn_code": inv_item.hsn_code,
                    "quantity": float(inv_item.quantity),
                    "unit": inv_item.unit,
                    "unit_price": float(inv_item.unit_price),
                    "discount_percent": float(inv_item.discount_percent) if hasattr(inv_item, 'discount_percent') else 0,
                    "gst_rate": float(inv_item.gst_rate) if hasattr(inv_item, 'gst_rate') else 0,
                    "taxable_amount": float(inv_item.taxable_amount) if hasattr(inv_item, 'taxable_amount') else 0,
                    "total_amount": float(inv_item.total_amount) if hasattr(inv_item, 'total_amount') else 0,
                }
                dc_items.append(dc_item)
        
        # Get contact from invoice if available
        contact_id = None
        contact_person_name = None
        if invoice.contact_id:
            contact = self.db.query(Contact).filter(Contact.id == invoice.contact_id).first()
            if contact:
                contact_id = contact.id
                contact_person_name = contact.name
        
        return self.create_dc_out(
            company=company,
            items=dc_items,
            customer_id=invoice.customer_id,
            invoice_id=invoice.id,
            sales_ticket_id=invoice.sales_ticket_id,
            contact_id=contact_id,
            from_godown_id=from_godown_id,
            # New fields
            dc_number=dc_number,
             reference_no=reference_no,
            status=status,
            custom_status=custom_status,
            bill_title=bill_title,
            bill_description=bill_description,
            contact_person=contact_person or contact_person_name,
            expiry_date=expiry_date,
            salesman_id=salesman_id,
            # Charges and discounts
            subtotal=subtotal,
            freight_charges=freight_charges,
            packing_forwarding_charges=packing_forwarding_charges,
            discount_on_all=discount_on_all,
            discount_type=discount_type,
            round_off=round_off,
            grand_total=grand_total,
        )
    
    def mark_dispatched(self, dc: DeliveryChallan) -> DeliveryChallan:
        """Mark DC as dispatched."""
        if dc.status not in [DeliveryChallanStatus.DRAFT]:
            raise ValueError("Can only dispatch DCs in DRAFT status")
        
        dc.status = DeliveryChallanStatus.DISPATCHED
        dc.custom_status = "Dispatched"
        dc.updated_at = datetime.utcnow()
        
        # Update stock if not already done
        if not dc.stock_updated:
            self.update_stock_for_dc(dc)
        
        self.db.commit()
        self.db.refresh(dc)
        
        return dc
    
    def mark_in_transit(
        self,
        dc: DeliveryChallan,
        vehicle_number: Optional[str] = None,
        lr_number: Optional[str] = None,
    ) -> DeliveryChallan:
        """Mark DC as in transit."""
        dc.status = DeliveryChallanStatus.IN_TRANSIT
        dc.custom_status = "In Transit"
        if vehicle_number:
            dc.vehicle_number = vehicle_number
        if lr_number:
            dc.lr_number = lr_number
        dc.updated_at = datetime.utcnow()
        
        self.db.commit()
        self.db.refresh(dc)
        
        return dc
    
    def mark_delivered(
        self,
        dc: DeliveryChallan,
        delivered_at: Optional[datetime] = None,
        received_by: Optional[str] = None,
    ) -> DeliveryChallan:
        """Mark DC Out as delivered."""
        dc.status = DeliveryChallanStatus.DELIVERED
        dc.custom_status = "Delivered"
        dc.delivered_at = delivered_at or datetime.utcnow()
        dc.received_by = received_by
        dc.updated_at = datetime.utcnow()
        
        self.db.commit()
        self.db.refresh(dc)
        
        return dc

    def mark_received(
        self,
        dc: DeliveryChallan,
        received_at: Optional[datetime] = None,
        received_by: Optional[str] = None,
    ) -> DeliveryChallan:
        """Mark DC In as received (goods inward)."""
        if dc.dc_type != DeliveryChallanType.DC_IN:
            raise ValueError("Can only mark DC In as received")
        
        if dc.status not in [DeliveryChallanStatus.DRAFT]:
            raise ValueError("Can only receive DCs in DRAFT status")
        
        dc.status = DeliveryChallanStatus.RECEIVED
        dc.custom_status = "Received"
        dc.delivered_at = received_at or datetime.utcnow()
        dc.received_by = received_by
        dc.updated_at = datetime.utcnow()
        
        # Update stock (add back to inventory for returns)
        if not dc.stock_updated:
            self.update_stock_for_dc(dc)
        
        self.db.commit()
        self.db.refresh(dc)
        
        return dc
    
    def link_to_invoice(
        self,
        dc: DeliveryChallan,
        invoice_id: str,
    ) -> DeliveryChallan:
        """Link a standalone DC to an invoice."""
        dc.invoice_id = invoice_id
        dc.updated_at = datetime.utcnow()
        
        self.db.commit()
        self.db.refresh(dc)
        
        return dc
    
    def cancel_dc(self, dc: DeliveryChallan, reason: Optional[str] = None) -> DeliveryChallan:
        """
        Cancel a delivery challan.
        
        If stock was updated, creates reverse stock entries.
        """
        if dc.status == DeliveryChallanStatus.CANCELLED:
            raise ValueError("DC is already cancelled")
        
        # If stock was updated, reverse it
        if dc.stock_updated:
            self._reverse_stock_entries(dc)
        
        dc.status = DeliveryChallanStatus.CANCELLED
        dc.custom_status = "Cancelled"
        if reason:
            dc.notes = f"{dc.notes or ''}\nCancelled: {reason}".strip()
        dc.updated_at = datetime.utcnow()
        
        self.db.commit()
        self.db.refresh(dc)
        
        return dc
    
    def _reverse_stock_entries(self, dc: DeliveryChallan):
        """Create reverse stock entries for a cancelled DC."""
        for item in dc.items:
            if not item.product_id or not item.stock_movement_id:
                continue
            
            product = self.db.query(Product).filter(Product.id == item.product_id).first()
            if not product:
                continue
            
            # Get original entry
            original_entry = self.db.query(StockEntry).filter(
                StockEntry.id == item.stock_movement_id
            ).first()
            
            if not original_entry:
                continue
            
            # Create reverse entry
            reverse_qty = -Decimal(str(original_entry.quantity))
            
            reverse_entry = StockEntry(
                id=generate_uuid(),
                company_id=dc.company_id,
                product_id=item.product_id,
                godown_id=original_entry.godown_id,
                batch_id=item.batch_id,
                entry_date=datetime.utcnow(),
                movement_type=StockMovementType.ADJUSTMENT_IN if original_entry.quantity < 0 else StockMovementType.ADJUSTMENT_OUT,
                quantity=reverse_qty,
                unit=item.unit,
                rate=item.unit_price,
                value=abs(reverse_qty) * item.unit_price,
                reference_type="delivery_challan_reversal",
                reference_id=dc.id,
                reference_number=f"REV-{dc.dc_number}",
                notes=f"Reversal of {dc.dc_number}",
            )
            self.db.add(reverse_entry)
            
            # Update product stock
            if product.current_stock is not None:
                product.current_stock = product.current_stock + reverse_qty
        
        dc.stock_updated = False
    
    def list_delivery_challans(
        self,
        company_id: str,
        dc_type: Optional[DeliveryChallanType] = None,
        status: Optional[DeliveryChallanStatus] = None,
        custom_status: Optional[str] = None,
        customer_id: Optional[str] = None,
        invoice_id: Optional[str] = None,
        from_date: Optional[date] = None,
        to_date: Optional[date] = None,
        page: int = 1,
        page_size: int = 20,
    ) -> Dict[str, Any]:
        """List delivery challans with filters including custom_status."""
        query = self.db.query(DeliveryChallan).filter(
            DeliveryChallan.company_id == company_id
        )
        
        if dc_type:
            query = query.filter(DeliveryChallan.dc_type == dc_type)
        if status:
            query = query.filter(DeliveryChallan.status == status)
        if custom_status:
            query = query.filter(DeliveryChallan.custom_status == custom_status)
        if customer_id:
            query = query.filter(DeliveryChallan.customer_id == customer_id)
        if invoice_id:
            query = query.filter(DeliveryChallan.invoice_id == invoice_id)
        if from_date:
            query = query.filter(DeliveryChallan.dc_date >= from_date)
        if to_date:
            query = query.filter(DeliveryChallan.dc_date <= to_date)
        
        total = query.count()
        
        dcs = query.order_by(DeliveryChallan.dc_date.desc()).offset(
            (page - 1) * page_size
        ).limit(page_size).all()
        
        return {
            "items": dcs,
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": (total + page_size - 1) // page_size,
        }
    
    def get_delivery_challan(
        self,
        company_id: str,
        dc_id: str,
    ) -> Optional[DeliveryChallan]:
        """Get a single delivery challan by ID."""
        return self.db.query(DeliveryChallan).filter(
            DeliveryChallan.id == dc_id,
            DeliveryChallan.company_id == company_id,
        ).first()
    
    def get_pending_dispatches(self, company_id: str) -> List[Invoice]:
        """Get invoices that don't have associated DCs yet."""
        # Get invoice IDs that already have DCs
        dc_invoice_ids = self.db.query(DeliveryChallan.invoice_id).filter(
            DeliveryChallan.company_id == company_id,
            DeliveryChallan.invoice_id.isnot(None),
            DeliveryChallan.dc_type == DeliveryChallanType.DC_OUT,
            DeliveryChallan.status != DeliveryChallanStatus.CANCELLED,
        ).subquery()
        
        # Get invoices without DCs
        from app.database.models import InvoiceStatus
        invoices = self.db.query(Invoice).filter(
            Invoice.company_id == company_id,
            Invoice.status.in_([InvoiceStatus.PENDING, InvoiceStatus.PAID, InvoiceStatus.PARTIALLY_PAID]),
            ~Invoice.id.in_(dc_invoice_ids),
        ).order_by(Invoice.invoice_date.desc()).all()
        
        return invoices
    
    def get_dcs_for_invoice(self, invoice_id: str) -> List[DeliveryChallan]:
        """Get all DCs linked to an invoice."""
        return self.db.query(DeliveryChallan).filter(
            DeliveryChallan.invoice_id == invoice_id,
        ).order_by(DeliveryChallan.dc_date.desc()).all()
    
    def delete_dc(self, dc: DeliveryChallan) -> bool:
        """Delete a delivery challan (only if in DRAFT status and stock not updated)."""
        if dc.status != DeliveryChallanStatus.DRAFT:
            raise ValueError("Can only delete DCs in DRAFT status")
        
        if dc.stock_updated:
            raise ValueError("Cannot delete DC with stock updates. Cancel it instead.")
        
        self.db.delete(dc)
        self.db.commit()
        return True