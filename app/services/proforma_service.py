"""Proforma Invoice Service."""
from datetime import datetime
from decimal import Decimal
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session

from app.database.models import (
    Company, Customer, Product, ProformaInvoice, ProformaInvoiceItem
)


class ProformaInvoiceService:
    """Service for managing proforma invoices."""
    
    def __init__(self, db: Session):
        self.db = db
    
    def create_proforma_invoice(
        self,
        company: Company,
        customer_id: str,
        items: List[Dict[str, Any]],
        proforma_date: Optional[datetime] = None,
        due_date: Optional[datetime] = None,
        reference_no: Optional[str] = None,
        reference_date: Optional[datetime] = None,
        sales_person_id: Optional[str] = None,
        contact_id: Optional[str] = None,
        bank_account_id: Optional[str] = None,
        notes: Optional[str] = None,
        terms: Optional[str] = None,
        freight_charges: Optional[Decimal] = None,
        pf_charges: Optional[Decimal] = None,
        round_off: Optional[Decimal] = None,
        subtotal: Optional[Decimal] = None,
        total_tax: Optional[Decimal] = None,
        total_amount: Optional[Decimal] = None,
        # New fields
        delivery_note: Optional[str] = None,
        supplier_ref: Optional[str] = None,
        other_references: Optional[str] = None,
        buyer_order_no: Optional[str] = None,
        buyer_order_date: Optional[datetime] = None,
        despatch_doc_no: Optional[str] = None,
        delivery_note_date: Optional[datetime] = None,
        despatched_through: Optional[str] = None,
        destination: Optional[str] = None,
        terms_of_delivery: Optional[str] = None,
    ) -> ProformaInvoice:
        """Create a new proforma invoice."""
        print("=" * 80)
        print("DEBUG: START create_proforma_invoice")
        print(f"DEBUG: Company: {company.id}")
        print(f"DEBUG: Customer: {customer_id}")
        print(f"DEBUG: Items count: {len(items)}")
        
        for idx, item in enumerate(items):
            print(f"\nDEBUG: Item {idx} raw data:")
            print(f"  item_code: '{item.get('item_code')}'")
            print(f"  product_id: '{item.get('product_id')}'")
        
        # Generate proforma invoice number
        invoice_count = self.db.query(ProformaInvoice).filter(
            ProformaInvoice.company_id == company.id
        ).count()
        invoice_number = f"PF/{datetime.now().year}-{datetime.now().year+1}/{invoice_count + 1:04d}"
        
        print(f"DEBUG: Proforma invoice number: {invoice_number}")
        
        # Create proforma invoice
        invoice = ProformaInvoice(
            company_id=company.id,
            customer_id=customer_id,
            invoice_number=invoice_number,
            proforma_date=proforma_date or datetime.utcnow(),
            due_date=due_date,
            reference_no=reference_no,
            reference_date=reference_date,
            sales_person_id=sales_person_id,
            contact_id=contact_id,
            bank_account_id=bank_account_id,
            notes=notes,
            terms=terms,
            freight_charges=freight_charges or Decimal("0"),
            pf_charges=pf_charges or Decimal("0"),
            round_off=round_off or Decimal("0"),
            subtotal=subtotal or Decimal("0"),
            total_tax=total_tax or Decimal("0"),
            total_amount=total_amount or Decimal("0"),
            # New fields
            delivery_note=delivery_note,
            supplier_ref=supplier_ref,
            other_references=other_references,
            buyer_order_no=buyer_order_no,
            buyer_order_date=buyer_order_date,
            despatch_doc_no=despatch_doc_no,
            delivery_note_date=delivery_note_date,
            despatched_through=despatched_through,
            destination=destination,
            terms_of_delivery=terms_of_delivery,
        )
        
        self.db.add(invoice)
        self.db.flush()
        print(f"DEBUG: Proforma invoice created with ID: {invoice.id}")
        
        # Store created items
        created_items = []
        
        # Create items
        for idx, item_data in enumerate(items):
            print(f"\nDEBUG: Processing item {idx}:")
            
            qty = Decimal(str(item_data.get("quantity", 0)))
            unit_price = Decimal(str(item_data.get("unit_price", 0)))
            gst_rate = Decimal(str(item_data.get("gst_rate", 18)))
            discount_percent = Decimal(str(item_data.get("discount_percent", 0)))
            
            print(f"  DEBUG: Quantity: {qty}, Unit Price: {unit_price}, GST: {gst_rate}, Discount: {discount_percent}")
            
            # Calculate item totals
            item_total = qty * unit_price
            discount_amount = item_total * (discount_percent / 100)
            taxable_amount = item_total - discount_amount
            tax_amount = taxable_amount * (gst_rate / 100)
            item_total_amount = taxable_amount + tax_amount
            
            # Handle item_code
            item_code_value = str(item_data.get("item_code", "")).strip()
            
            print(f"  DEBUG: Final item_code: '{item_code_value}'")
            
            # Create proforma invoice item
            item = ProformaInvoiceItem(
                invoice_id=invoice.id,
                product_id=item_data.get("product_id"),
                item_code=item_code_value,
                description=item_data.get("description", ""),
                quantity=qty,
                unit=item_data.get("unit", "unit"),
                unit_price=unit_price,
                discount_percent=discount_percent,
                discount_amount=discount_amount,
                gst_rate=gst_rate,
                cgst_rate=item_data.get("cgst_rate", gst_rate / 2),
                sgst_rate=item_data.get("sgst_rate", gst_rate / 2),
                igst_rate=item_data.get("igst_rate", 0),
                taxable_amount=taxable_amount,
                total_amount=item_total_amount,
            )
            
            self.db.add(item)
            created_items.append(item)
            print(f"  DEBUG: Item object created with item_code='{item.item_code}'")
        
        # Calculate totals if not provided
        if not subtotal or not total_tax or not total_amount:
            print("DEBUG: Calculating totals from items")
            calculated_subtotal = sum(item.taxable_amount for item in created_items)
            calculated_total_tax = sum(item.tax_amount for item in created_items)
            
            # Add freight and PF charges to subtotal
            final_subtotal = calculated_subtotal + (freight_charges or Decimal("0")) + (pf_charges or Decimal("0"))
            final_total = final_subtotal + calculated_total_tax + (round_off or Decimal("0"))
            
            # Update invoice with calculated values
            invoice.subtotal = final_subtotal
            invoice.total_tax = calculated_total_tax
            invoice.total_amount = final_total
            
            print(f"DEBUG: Calculated - Subtotal: {final_subtotal}, Tax: {calculated_total_tax}, Total: {final_total}")
        
        print(f"\nDEBUG: {len(created_items)} items created:")
        for idx, item in enumerate(created_items):
            print(f"  Item {idx}: item_code='{item.item_code}'")
        
        try:
            print("\nDEBUG: Attempting to commit...")
            self.db.commit()
            self.db.refresh(invoice)
            print(f"DEBUG: SUCCESS! Proforma invoice {invoice.invoice_number} created")
            print("=" * 80)
            return invoice
        except Exception as e:
            print(f"\nDEBUG: ERROR during commit: {e}")
            import traceback
            traceback.print_exc()
            self.db.rollback()
            print("=" * 80)
            raise
    
    def get_proforma_invoices(
        self,
        company: Company,
        customer_id: Optional[str] = None,
        from_date: Optional[datetime] = None,
        to_date: Optional[datetime] = None,
    ) -> List[ProformaInvoice]:
        """Get proforma invoices with filters."""
        query = self.db.query(ProformaInvoice).filter(
            ProformaInvoice.company_id == company.id
        )
        
        if customer_id:
            query = query.filter(ProformaInvoice.customer_id == customer_id)
        if from_date:
            query = query.filter(ProformaInvoice.proforma_date >= from_date)
        if to_date:
            query = query.filter(ProformaInvoice.proforma_date <= to_date)
        
        return query.order_by(ProformaInvoice.proforma_date.desc()).all()
    
    def get_proforma_invoice(self, invoice_id: str, company: Company) -> Optional[ProformaInvoice]:
        """Get a proforma invoice by ID."""
        return self.db.query(ProformaInvoice).filter(
            ProformaInvoice.id == invoice_id,
            ProformaInvoice.company_id == company.id
        ).first()