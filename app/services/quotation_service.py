"""Quotation service for business logic with GST calculations."""
from sqlalchemy.orm import Session
from sqlalchemy import func, and_,or_
from typing import List, Optional, Dict, Any
from datetime import datetime, date, timedelta
from decimal import Decimal, ROUND_HALF_UP
import os
from pathlib import Path
import tempfile
import json

from app.database.models import (
    Quotation, QuotationItem, Company, Customer, Product, 
    QuotationStatus, Invoice, InvoiceItem, InvoiceStatus, InvoiceType,
    INDIAN_STATE_CODES, generate_uuid, SubItem
)
from app.database.payroll_models import Employee


class QuotationService:
    """Service for quotation operations with GST compliance."""
    
    def __init__(self, db: Session):
        self.db = db
    
    def _round_amount(self, amount: Decimal) -> Decimal:
        """Round amount to 2 decimal places."""
        return Decimal(str(amount)).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
    
    def _calculate_gst_split(
        self,
        taxable_amount: Decimal,
        gst_rate: Decimal,
        company_state_code: str,
        place_of_supply: str
    ) -> dict:
        """Calculate GST split (CGST+SGST or IGST) based on place of supply."""
        total_gst = self._round_amount(taxable_amount * gst_rate / 100)
        
        if company_state_code == place_of_supply:
            half_rate = gst_rate / 2
            cgst = self._round_amount(taxable_amount * half_rate / 100)
            sgst = total_gst - cgst
            return {
                "cgst_rate": half_rate,
                "sgst_rate": half_rate,
                "igst_rate": Decimal("0"),
                "cgst_amount": cgst,
                "sgst_amount": sgst,
                "igst_amount": Decimal("0"),
            }
        else:
            return {
                "cgst_rate": Decimal("0"),
                "sgst_rate": Decimal("0"),
                "igst_rate": gst_rate,
                "cgst_amount": Decimal("0"),
                "sgst_amount": Decimal("0"),
                "igst_amount": total_gst,
            }
    
    def _get_next_quotation_number(self, company: Company) -> str:
  
       prefix = company.quotation_prefix if hasattr(company, 'quotation_prefix') and company.quotation_prefix else "QT"
    
       print(f"DEBUG: Getting next quotation number for company {company.id}")
       print(f"DEBUG: Prefix is {prefix}")
    
    # Get ALL quotations for this company with QT- prefix
       all_quotations = self.db.query(Quotation.quotation_number).filter(
        Quotation.company_id == company.id,
        Quotation.quotation_number.like(f"{prefix}-%")
       ).all()
    
       print(f"DEBUG: Found {len(all_quotations)} existing quotations")
    
       max_number = 0
       for quot_tuple in all_quotations:
          quot_num = quot_tuple[0]  # Extract the string from tuple
          print(f"DEBUG: Checking quotation number: '{quot_num}'")
        
        # We only want to parse numbers from QT-NNNN format
        # Skip QT-YYYY-NNNN format
          if quot_num.startswith(f"{prefix}-") and quot_num.count('-') == 1:
             # This should be QT-NNNN format
             try:
                # Get the part after the dash
                num_part = quot_num.split('-')[1]
                
                # Extract digits only
                import re
                digits = re.search(r'\d+', num_part)
                if digits:
                    num = int(digits.group())
                    print(f"DEBUG: Found QT-NNNN format number: {num}")
                    
                    if num > max_number:
                        max_number = num
                else:
                    print(f"DEBUG: No digits found in '{num_part}'")
                    
             except (ValueError, IndexError, AttributeError) as e:
                print(f"DEBUG: Failed to parse '{quot_num}': {e}")
                continue
          else:
            print(f"DEBUG: Skipping '{quot_num}' - wrong format (not QT-NNNN)")
    
       next_num = max_number + 1
       result = f"{prefix}-{next_num:04d}"
       print(f"DEBUG: Generated quotation number: {result}")
    
       return result
    def _save_excel_data(self, company_id: str, excel_data: Optional[str]) -> Optional[str]:
      """Save Excel notes as a CSV file and return the file path."""
      if not excel_data or not excel_data.strip():
        return None
    
      try:
        # Create uploads directory if it doesn't exist
        upload_dir = Path("uploads") / "companies" / company_id / "quotations" / "excel_notes"
        upload_dir.mkdir(parents=True, exist_ok=True)
        
        # Generate unique filename with .csv extension
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"excel_notes_{timestamp}_{generate_uuid()[:8]}.csv"  # Changed to .csv
        file_path = upload_dir / filename
        
        # Save the Excel data as CSV
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(excel_data)
        
        # Return relative path
        return str(file_path.relative_to("uploads"))
      except Exception as e:
        print(f"Error saving Excel data: {e}")
        return None
    
    def _save_excel_file(self, company_id: str, file_content: bytes, filename: str) -> Optional[str]:
        """Save uploaded Excel/CSV file and return the file path."""
        if not file_content:
            return None
        
        try:
            # Create uploads directory if it doesn't exist
            upload_dir = Path("uploads") / "companies" / company_id / "quotations" / "excel_files"
            upload_dir.mkdir(parents=True, exist_ok=True)
            
            # Generate unique filename preserving extension
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            file_ext = Path(filename).suffix if '.' in filename else '.csv'
            unique_filename = f"excel_{timestamp}_{generate_uuid()[:8]}{file_ext}"
            file_path = upload_dir / unique_filename
            
            # Save the file
            with open(file_path, "wb") as f:
                f.write(file_content)
            
            # Return relative path
            return str(file_path.relative_to("uploads"))
        except Exception as e:
            print(f"Error saving Excel file: {e}")
            return None
    
    def create_quotation(
        self,
        company: Company,
        customer_id: Optional[str],
        items: List[Dict[str, Any]],
        
        quotation_date: Optional[datetime] = None,
        validity_days: int = 30,
        quotation_number: Optional[str] = None, 
        place_of_supply: Optional[str] = None,
        subject: Optional[str] = None,
        notes: Optional[str] = None,
        terms: Optional[str] = None,
        contact_person: Optional[str] = None,
        remarks: Optional[str] = None,
        sales_person_id: Optional[str] = None,
        reference: Optional[str] = None,
        reference_no: Optional[str] = None,
        reference_date: Optional[date] = None,
        payment_terms: Optional[str] = None,
        excel_notes: Optional[str] = None,
        excel_file_content: Optional[bytes] = None,
        excel_filename: Optional[str] = None,
        quotation_type: Optional[str] = "item",  # Add this parameter
        **kwargs  # Accept additional fields
    ) -> Quotation:
        """Create a new quotation with all fields and GST calculations."""
        # Get customer
        customer = None
        if customer_id:
            customer = self.db.query(Customer).filter(
                Customer.id == customer_id,
                Customer.company_id == company.id
            ).first()
        
        # Get sales person details
        sales_person_name = None
        if sales_person_id:
            sales_person = self.db.query(Employee).filter(
                Employee.id == sales_person_id,
                Employee.company_id == company.id
            ).first()
            if sales_person:
                sales_person_name = sales_person.full_name or sales_person.name
        
        # Handle Excel data
        excel_notes_file_url = None
        if excel_file_content and excel_filename:
            excel_notes_file_url = self._save_excel_file(company.id, excel_file_content, excel_filename)
        elif excel_notes:
            excel_notes_file_url = self._save_excel_data(company.id, excel_notes)
        
        # Determine place of supply
        if not place_of_supply and customer:
            place_of_supply = customer.billing_state_code
        if not place_of_supply:
            place_of_supply = company.state_code or "27"
        
        place_of_supply_name = INDIAN_STATE_CODES.get(place_of_supply, "")
        if quotation_number:
             # Check if quotation number already exists
              existing = self.db.query(Quotation).filter(
                Quotation.company_id == company.id,
                Quotation.quotation_number == quotation_number
              ).first()
              if existing:
              # If exists, generate a new one or handle error
                   quotation_number = self._get_next_quotation_number(company)
        else:
             quotation_number = self._get_next_quotation_number(company)
       
        quote_date = quotation_date or datetime.utcnow()
        validity_date = quote_date + timedelta(days=validity_days)
        
        # Create quotation with all fields
        quotation = Quotation(
            id=generate_uuid(),
            company_id=company.id,
            quotation_number=quotation_number,
            customer_id=customer.id if customer else None,
            contact_person=contact_person,
            sales_person_id=sales_person_id,
            sales_person_name=sales_person_name,
            
            quotation_type=quotation_type,
            quotation_date=quote_date,
            validity_date=validity_date,
            place_of_supply=place_of_supply,
            place_of_supply_name=place_of_supply_name,
         
            subject=subject or f"Quotation {quotation_number}",
            notes=notes,

            terms=terms,  # Additional terms from form
            remarks=remarks,
            reference=reference,
            reference_no=reference_no,
            reference_date=reference_date,
            payment_terms=payment_terms or (company.invoice_terms if hasattr(company, 'invoice_terms') else None),
            excel_notes_file_url=excel_notes_file_url,
            status=QuotationStatus.DRAFT,
        )
        
        self.db.add(quotation)
        self.db.flush()
        
        # Calculate totals
        subtotal = Decimal("0")
        total_cgst = Decimal("0")
        total_sgst = Decimal("0")
        total_igst = Decimal("0")
        total_discount = Decimal("0")
        
        company_state = company.state_code or "27"
        
        # Add items
        for item_data in items:
            qty = Decimal(str(item_data.get("quantity", 0)))
            unit_price = Decimal(str(item_data.get("unit_price", 0)))
            gst_rate = Decimal(str(item_data.get("gst_rate", 18)))
            discount_percent = Decimal(str(item_data.get("discount_percent", 0)))
            
            # Calculate amounts
            base_amount = self._round_amount(qty * unit_price)
            discount_amount = self._round_amount(base_amount * discount_percent / 100)
            taxable_amount = base_amount - discount_amount
            
            # Calculate GST
            gst_split = self._calculate_gst_split(
                taxable_amount,
                gst_rate,
                company_state,
                place_of_supply
            )
            
            total_tax = gst_split["cgst_amount"] + gst_split["sgst_amount"] + gst_split["igst_amount"]
            item_total = taxable_amount + total_tax
            
            # Get product details
            product = None
            if item_data.get("product_id"):
                product = self.db.query(Product).filter(Product.id == item_data["product_id"]).first()
            
            item = QuotationItem(
                id=generate_uuid(),
                quotation_id=quotation.id,
                product_id=item_data.get("product_id"),
                item_code=item_data.get("item_code") or None,
                description=item_data.get("description") or (product.name if product else "Item"),
                hsn_code=item_data.get("hsn_code") or (product.hsn_code if product else None),
                quantity=qty,
                unit=item_data.get("unit") or (product.unit if product else "unit"),
                unit_price=unit_price,
                discount_percent=discount_percent,
                discount_amount=discount_amount,
                gst_rate=gst_rate,
                cgst_rate=gst_split["cgst_rate"],
                sgst_rate=gst_split["sgst_rate"],
                igst_rate=gst_split["igst_rate"],
                cgst_amount=gst_split["cgst_amount"],
                sgst_amount=gst_split["sgst_amount"],
                igst_amount=gst_split["igst_amount"],
                taxable_amount=taxable_amount,
                total_amount=item_total,
                is_project=quotation_type == "project"
            )
            self.db.add(item)
            self.db.flush()
          # Add sub_items if this is a project quotation and item has sub_items
            if quotation_type == "project" and item_data.get("sub_items"):
              for sub_item_data in item_data.get("sub_items", []):
                     sub_item = SubItem(
            id=generate_uuid(),
            quotation_item_id=item.id,
            description=sub_item_data.get("description", ""),
            quantity=sub_item_data.get("quantity", 1),
            image_url=sub_item_data.get("image_url")
        )
                     self.db.add(sub_item)
            
            # Accumulate totals
            subtotal += taxable_amount
            total_cgst += gst_split["cgst_amount"]
            total_sgst += gst_split["sgst_amount"]
            total_igst += gst_split["igst_amount"]
            total_discount += discount_amount
        
        # Update quotation totals
        quotation.subtotal = subtotal
        quotation.discount_amount = total_discount
        quotation.cgst_amount = total_cgst
        quotation.sgst_amount = total_sgst
        quotation.igst_amount = total_igst
        quotation.total_tax = total_cgst + total_sgst + total_igst
        quotation.total_amount = subtotal + quotation.total_tax
        
        self.db.commit()
        self.db.refresh(quotation)
        
        return quotation
    
    def update_quotation(
        self,
        quotation: Quotation,
        items: Optional[List[Dict[str, Any]]] = None,
        validity_days: Optional[int] = None,
        subject: Optional[str] = None,
        notes: Optional[str] = None,
        terms: Optional[str] = None,
        contact_person: Optional[str] = None,
        remarks: Optional[str] = None,
        sales_person_id: Optional[str] = None,
        reference: Optional[str] = None,
        reference_no: Optional[str] = None,
        reference_date: Optional[date] = None,
        payment_terms: Optional[str] = None,
        excel_notes: Optional[str] = None,
        excel_file_content: Optional[bytes] = None,
        excel_filename: Optional[str] = None,
    ) -> Quotation:
        """Update a quotation (only if in DRAFT status)."""
        if quotation.status != QuotationStatus.DRAFT:
            raise ValueError("Can only update quotations in DRAFT status")
        
        # Remove existing sub_items before updating items
        quotation_item_ids = [item.id for item in quotation.items]
        if quotation_item_ids:
            self.db.query(SubItem).filter(
                SubItem.quotation_item_id.in_(quotation_item_ids)
            ).delete(synchronize_session=False)
        
        # Update basic fields
        if subject is not None:
            quotation.subject = subject
        if notes is not None:
            quotation.notes = notes
        if terms is not None:
            quotation.terms = terms
        if contact_person is not None:
            quotation.contact_person = contact_person
        if remarks is not None:
            quotation.remarks = remarks
        if reference is not None:
            quotation.reference = reference
        if reference_no is not None:
            quotation.reference_no = reference_no
        if reference_date is not None:
            quotation.reference_date = reference_date
        if payment_terms is not None:
            quotation.payment_terms = payment_terms
        
        # Update sales person
        if sales_person_id is not None:
            quotation.sales_person_id = sales_person_id
            if sales_person_id:
                sales_person = self.db.query(Employee).filter(
                    Employee.id == sales_person_id,
                    Employee.company_id == quotation.company_id
                ).first()
                if sales_person:
                    quotation.sales_person_name = sales_person.full_name or sales_person.name
            else:
                quotation.sales_person_name = None
        
        if validity_days is not None:
            quotation.validity_date = quotation.quotation_date + timedelta(days=validity_days)
        
        # Handle Excel data update
        if excel_file_content and excel_filename:
            excel_notes_file_url = self._save_excel_file(quotation.company_id, excel_file_content, excel_filename)
            if excel_notes_file_url:
                quotation.excel_notes_file_url = excel_notes_file_url
        elif excel_notes:
            excel_notes_file_url = self._save_excel_data(quotation.company_id, excel_notes)
            if excel_notes_file_url:
                quotation.excel_notes_file_url = excel_notes_file_url
        
        if items is not None:
            # Remove existing items
            self.db.query(QuotationItem).filter(
                QuotationItem.quotation_id == quotation.id
            ).delete()
            
            # Recalculate with new items
            subtotal = Decimal("0")
            total_cgst = Decimal("0")
            total_sgst = Decimal("0")
            total_igst = Decimal("0")
            total_discount = Decimal("0")
            
            company = self.db.query(Company).filter(Company.id == quotation.company_id).first()
            company_state = company.state_code or "27"
            place_of_supply = quotation.place_of_supply or company_state
            
            for item_data in items:
                qty = Decimal(str(item_data.get("quantity", 0)))
                unit_price = Decimal(str(item_data.get("unit_price", 0)))
                gst_rate = Decimal(str(item_data.get("gst_rate", 18)))
                discount_percent = Decimal(str(item_data.get("discount_percent", 0)))
                
                base_amount = self._round_amount(qty * unit_price)
                discount_amount = self._round_amount(base_amount * discount_percent / 100)
                taxable_amount = base_amount - discount_amount
                
                gst_split = self._calculate_gst_split(
                    taxable_amount, gst_rate, company_state, place_of_supply
                )
                
                total_tax = gst_split["cgst_amount"] + gst_split["sgst_amount"] + gst_split["igst_amount"]
                item_total = taxable_amount + total_tax
                
                product = None
                if item_data.get("product_id"):
                    product = self.db.query(Product).filter(Product.id == item_data["product_id"]).first()
                
                item = QuotationItem(
                    id=generate_uuid(),
                    quotation_id=quotation.id,
                    product_id=item_data.get("product_id"),
                    item_code=item_data.get("item_code") or None,
                    description=item_data.get("description") or (product.name if product else "Item"),
                    hsn_code=item_data.get("hsn_code") or (product.hsn_code if product else None),
                    quantity=qty,
                    unit=item_data.get("unit") or (product.unit if product else "unit"),
                    unit_price=unit_price,
                    discount_percent=discount_percent,
                    discount_amount=discount_amount,
                    gst_rate=gst_rate,
                    cgst_rate=gst_split["cgst_rate"],
                    sgst_rate=gst_split["sgst_rate"],
                    igst_rate=gst_split["igst_rate"],
                    cgst_amount=gst_split["cgst_amount"],
                    sgst_amount=gst_split["sgst_amount"],
                    igst_amount=gst_split["igst_amount"],
                    taxable_amount=taxable_amount,
                    total_amount=item_total,
                )
                self.db.add(item)
                self.db.flush()
                
                # Add sub_items if this is a project quotation and item has sub_items
                if quotation.quotation_type == "project" and item_data.get("sub_items"):
                    for sub_item_data in item_data.get("sub_items", []):
                        sub_item = SubItem(
                            id=generate_uuid(),
                            quotation_item_id=item.id,
                            description=sub_item_data.get("description", ""),
                            quantity=sub_item_data.get("quantity", 1),
                            image_url=sub_item_data.get("image_url")
                        )
                        self.db.add(sub_item)
                
                subtotal += taxable_amount
                total_cgst += gst_split["cgst_amount"]
                total_sgst += gst_split["sgst_amount"]
                total_igst += gst_split["igst_amount"]
                total_discount += discount_amount
            
            quotation.subtotal = subtotal
            quotation.discount_amount = total_discount
            quotation.cgst_amount = total_cgst
            quotation.sgst_amount = total_sgst
            quotation.igst_amount = total_igst
            quotation.total_tax = total_cgst + total_sgst + total_igst
            quotation.total_amount = subtotal + quotation.total_tax
        
        quotation.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(quotation)
        
        return quotation
    
    def send_to_customer(
        self,
        quotation: Quotation,
        email: Optional[str] = None,
    ) -> Quotation:
        """Mark quotation as sent to customer."""
        if quotation.status not in [QuotationStatus.DRAFT, QuotationStatus.SENT]:
            raise ValueError("Can only send quotations in DRAFT or SENT status")
        
        quotation.status = QuotationStatus.SENT
        quotation.email_sent_at = datetime.utcnow()
        quotation.email_sent_to = email
        quotation.updated_at = datetime.utcnow()
        
        self.db.commit()
        self.db.refresh(quotation)
        
        return quotation
    
    def mark_approved(
        self,
        quotation: Quotation,
        approved_by: Optional[str] = None,
    ) -> Quotation:
        """Mark quotation as approved by customer."""
        if quotation.status not in [QuotationStatus.SENT, QuotationStatus.DRAFT]:
            raise ValueError("Can only approve quotations in DRAFT or SENT status")
        
        quotation.status = QuotationStatus.APPROVED
        quotation.approved_at = datetime.utcnow()
        quotation.approved_by = approved_by or "Customer"
        quotation.updated_at = datetime.utcnow()
        
        self.db.commit()
        self.db.refresh(quotation)
        
        return quotation
    
    def mark_rejected(
        self,
        quotation: Quotation,
        rejection_reason: Optional[str] = None,
    ) -> Quotation:
        """Mark quotation as rejected by customer."""
        if quotation.status not in [QuotationStatus.SENT, QuotationStatus.DRAFT]:
            raise ValueError("Can only reject quotations in DRAFT or SENT status")
        
        quotation.status = QuotationStatus.REJECTED
        quotation.rejected_at = datetime.utcnow()
        quotation.rejection_reason = rejection_reason
        quotation.updated_at = datetime.utcnow()
        
        self.db.commit()
        self.db.refresh(quotation)
        
        return quotation
    
    def convert_to_invoice(
        self,
        quotation: Quotation,
        invoice_date: Optional[datetime] = None,
        due_date: Optional[datetime] = None,
    ) -> Invoice:
        """Convert an approved quotation to an invoice."""
        if quotation.status == QuotationStatus.CONVERTED:
            raise ValueError("Quotation has already been converted to an invoice")
        
        if quotation.status not in [QuotationStatus.APPROVED, QuotationStatus.DRAFT, QuotationStatus.SENT]:
            raise ValueError("Can only convert approved or pending quotations")
        
        # Get company
        company = self.db.query(Company).filter(Company.id == quotation.company_id).first()
        if not company:
            raise ValueError("Company not found")
        
        # Get next invoice number
        from app.services.company_service import CompanyService
        company_service = CompanyService(self.db)
        invoice_number = company_service.get_next_invoice_number(company)
        
        # Determine invoice type
        customer = quotation.customer
        invoice_type = InvoiceType.B2C
        if customer and customer.gstin:
            invoice_type = InvoiceType.B2B
        
        # Create invoice with all quotation fields
        invoice = Invoice(
            id=generate_uuid(),
            company_id=quotation.company_id,
            customer_id=quotation.customer_id,
            invoice_number=invoice_number,
            invoice_date=invoice_date or datetime.utcnow(),
            due_date=due_date,
            invoice_type=invoice_type,
            place_of_supply=quotation.place_of_supply,
            place_of_supply_name=quotation.place_of_supply_name,
            subtotal=quotation.subtotal,
            discount_amount=quotation.discount_amount,
            cgst_amount=quotation.cgst_amount,
            sgst_amount=quotation.sgst_amount,
            igst_amount=quotation.igst_amount,
            total_tax=quotation.total_tax,
            total_amount=quotation.total_amount,
            balance_due=quotation.total_amount,
            outstanding_amount=quotation.total_amount,
            notes=quotation.notes,
            terms=quotation.terms,
            remarks=quotation.remarks,
            contact_person=quotation.contact_person,
            status=InvoiceStatus.DRAFT,
        )
        
        self.db.add(invoice)
        self.db.flush()
        
        # Copy items
        for q_item in quotation.items:
            i_item = InvoiceItem(
                id=generate_uuid(),
                invoice_id=invoice.id,
                product_id=q_item.product_id,
                description=q_item.description,
                hsn_code=q_item.hsn_code,
                quantity=q_item.quantity,
                unit=q_item.unit,
                unit_price=q_item.unit_price,
                discount_percent=q_item.discount_percent,
                discount_amount=q_item.discount_amount,
                gst_rate=q_item.gst_rate,
                cgst_rate=q_item.cgst_rate,
                sgst_rate=q_item.sgst_rate,
                igst_rate=q_item.igst_rate,
                cgst_amount=q_item.cgst_amount,
                sgst_amount=q_item.sgst_amount,
                igst_amount=q_item.igst_amount,
                taxable_amount=q_item.taxable_amount,
                total_amount=q_item.total_amount,
            )
            self.db.add(i_item)
        
        # Update quotation status
        quotation.status = QuotationStatus.CONVERTED
        quotation.converted_invoice_id = invoice.id
        quotation.converted_at = datetime.utcnow()
        quotation.updated_at = datetime.utcnow()
        
        self.db.commit()
        self.db.refresh(invoice)
        
        return invoice
    
    def check_expired_quotations(self, company_id: str) -> int:
        """Mark expired quotations. Returns count of updated quotations."""
        now = datetime.utcnow()
        
        expired = self.db.query(Quotation).filter(
            Quotation.company_id == company_id,
            Quotation.status.in_([QuotationStatus.DRAFT, QuotationStatus.SENT]),
            Quotation.validity_date < now,
        ).all()
        
        count = 0
        for quotation in expired:
            quotation.status = QuotationStatus.EXPIRED
            quotation.updated_at = now
            count += 1
        
        if count > 0:
            self.db.commit()
        
        return count
    
    def list_quotations(
        self,
        company_id: str,
        status: Optional[QuotationStatus] = None,
        customer_id: Optional[str] = None,
        from_date: Optional[date] = None,
        to_date: Optional[date] = None,
        search: Optional[str] = None,
        page: int = 1,
        page_size: int = 20,
    ) -> Dict[str, Any]:
        """List quotations with filters."""
        query = self.db.query(Quotation).filter(Quotation.company_id == company_id)
        
        if status:
            query = query.filter(Quotation.status == status)
        if customer_id:
            query = query.filter(Quotation.customer_id == customer_id)
        if from_date:
            query = query.filter(Quotation.quotation_date >= from_date)
        if to_date:
            query = query.filter(Quotation.quotation_date <= to_date)
        if search:
            search_term = f"%{search}%"
            query = query.filter(
                or_(
                    Quotation.quotation_number.ilike(search_term),
                    Quotation.subject.ilike(search_term),
                    Quotation.contact_person.ilike(search_term),
                    Quotation.reference.ilike(search_term),
                    Quotation.reference_no.ilike(search_term),
                )
            )
        
        total = query.count()
        
        quotations = query.order_by(Quotation.quotation_date.desc()).offset(
            (page - 1) * page_size
        ).limit(page_size).all()
        
        return {
            "items": quotations,
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": (total + page_size - 1) // page_size,
        }
    
    def get_quotation(self, company_id: str, quotation_id: str) -> Optional[Quotation]:
        """Get a single quotation by ID with all details."""
        return self.db.query(Quotation).filter(
            Quotation.id == quotation_id,
            Quotation.company_id == company_id,
        ).first()
    
    def delete_quotation(self, quotation: Quotation) -> bool:
        """Delete a quotation (only if in DRAFT status)."""
        if quotation.status != QuotationStatus.DRAFT:
            raise ValueError("Can only delete quotations in DRAFT status")
        
        # Delete associated Excel files if they exist
        if quotation.excel_notes_file_url:
            try:
                file_path = Path("uploads") / quotation.excel_notes_file_url
                if file_path.exists():
                    file_path.unlink()
            except Exception as e:
                print(f"Error deleting Excel file: {e}")
        
        self.db.delete(quotation)
        self.db.commit()
        return True
    
    def revise_quotation(self, quotation: Quotation) -> Quotation:
        """Create a revised version of a quotation."""
        # Create new quotation as revision with all fields
        new_quotation = Quotation(
            id=generate_uuid(),
            company_id=quotation.company_id,
            customer_id=quotation.customer_id,
            contact_person=quotation.contact_person,
            sales_person_id=quotation.sales_person_id,
            sales_person_name=quotation.sales_person_name,
            quotation_number=quotation.quotation_number + f"-R{quotation.revision_number + 1}",
            quotation_date=datetime.utcnow(),
            validity_date=datetime.utcnow() + timedelta(days=30),
            revised_from_id=quotation.id,
            revision_number=quotation.revision_number + 1,
            place_of_supply=quotation.place_of_supply,
            place_of_supply_name=quotation.place_of_supply_name,
            subtotal=quotation.subtotal,
            discount_amount=quotation.discount_amount,
            cgst_amount=quotation.cgst_amount,
            sgst_amount=quotation.sgst_amount,
            igst_amount=quotation.igst_amount,
            total_tax=quotation.total_tax,
            total_amount=quotation.total_amount,
            subject=quotation.subject,
            notes=quotation.notes,
            terms=quotation.terms,
            remarks=quotation.remarks,
            reference=quotation.reference,
            reference_no=quotation.reference_no,
            reference_date=quotation.reference_date,
            payment_terms=quotation.payment_terms,
            excel_notes_file_url=quotation.excel_notes_file_url,
            status=QuotationStatus.DRAFT,
        )
        
        self.db.add(new_quotation)
        self.db.flush()
        
        # Copy items
        for q_item in quotation.items:
            new_item = QuotationItem(
                id=generate_uuid(),
                quotation_id=new_quotation.id,
                product_id=q_item.product_id,
                description=q_item.description,
                hsn_code=q_item.hsn_code,
                quantity=q_item.quantity,
                unit=q_item.unit,
                unit_price=q_item.unit_price,
                discount_percent=q_item.discount_percent,
                discount_amount=q_item.discount_amount,
                gst_rate=q_item.gst_rate,
                cgst_rate=q_item.cgst_rate,
                sgst_rate=q_item.sgst_rate,
                igst_rate=q_item.igst_rate,
                cgst_amount=q_item.cgst_amount,
                sgst_amount=q_item.sgst_amount,
                igst_amount=q_item.igst_amount,
                taxable_amount=q_item.taxable_amount,
                total_amount=q_item.total_amount,
            )
            self.db.add(new_item)
        
        self.db.commit()
        self.db.refresh(new_quotation)
        
        return new_quotation
    
    def get_excel_notes_content(self, quotation: Quotation) -> Optional[str]:
        """Get the content of Excel notes file if it exists."""
        if not quotation.excel_notes_file_url:
            return None
        
        try:
            file_path = Path("uploads") / quotation.excel_notes_file_url
            if file_path.exists():
                with open(file_path, "r", encoding="utf-8") as f:
                    return f.read()
        except Exception as e:
            print(f"Error reading Excel notes file: {e}")
        
        return None