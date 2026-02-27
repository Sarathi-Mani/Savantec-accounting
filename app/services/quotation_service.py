"""Quotation service for business logic with GST calculations."""
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_
from typing import List, Optional, Dict, Any
from datetime import datetime, date, timedelta
from decimal import Decimal, ROUND_HALF_UP
import os
from pathlib import Path
import tempfile
import json
import re

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

    def _normalize_state_code(self, state_value: Optional[str]) -> Optional[str]:
        """Normalize state code/name into 2-digit GST state code."""
        if not state_value:
            return None

        raw = str(state_value).strip()
        if not raw:
            return None

        if raw.isdigit():
            code = raw.zfill(2)
            if code in INDIAN_STATE_CODES:
                return code

        normalized_input = re.sub(r"[^a-z0-9]", "", raw.lower())
        if not normalized_input:
            return None

        for code, name in INDIAN_STATE_CODES.items():
            normalized_name = re.sub(r"[^a-z0-9]", "", str(name).lower())
            if normalized_name == normalized_input:
                return code

        aliases = {
            "tamilnadu": "33",
            "andhrapradesh": "37",
            "maharastra": "27",
            "chhattisgarh": "22",
            "chattisgarh": "22",
            "odisa": "21",
            "orissa": "21",
        }
        return aliases.get(normalized_input)
    
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

    def _calculate_other_charges_totals(
        self,
        base_taxable_amount: Decimal,
        other_charges: Optional[List[Dict[str, Any]]],
        company_state_code: str,
        place_of_supply: str,
    ) -> dict:
        """Calculate aggregate other charges and their GST breakup."""
        if not other_charges:
            return {
                "base_amount": Decimal("0"),
                "cgst_amount": Decimal("0"),
                "sgst_amount": Decimal("0"),
                "igst_amount": Decimal("0"),
            }

        total_base = Decimal("0")
        total_cgst = Decimal("0")
        total_sgst = Decimal("0")
        total_igst = Decimal("0")

        for charge in other_charges:
            try:
                amount = Decimal(str(charge.get("amount", 0) or 0))
            except Exception:
                amount = Decimal("0")
            charge_type = str(charge.get("type", "fixed") or "fixed").lower()
            try:
                tax_rate = Decimal(str(charge.get("tax", 0) or 0))
            except Exception:
                tax_rate = Decimal("0")

            if amount <= 0:
                continue

            if charge_type == "percentage":
                charge_base = self._round_amount(base_taxable_amount * amount / 100)
            else:
                charge_base = self._round_amount(amount)

            if charge_base <= 0:
                continue

            gst_split = self._calculate_gst_split(
                taxable_amount=charge_base,
                gst_rate=tax_rate,
                company_state_code=company_state_code,
                place_of_supply=place_of_supply,
            )

            total_base += charge_base
            total_cgst += gst_split["cgst_amount"]
            total_sgst += gst_split["sgst_amount"]
            total_igst += gst_split["igst_amount"]

        return {
            "base_amount": self._round_amount(total_base),
            "cgst_amount": self._round_amount(total_cgst),
            "sgst_amount": self._round_amount(total_sgst),
            "igst_amount": self._round_amount(total_igst),
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
        show_images: bool = True,
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
        quotation_type: Optional[str] = "item",
        currency_code: str = "INR",
        exchange_rate: Decimal = Decimal("1.0"),
        show_images_in_pdf: bool = True,
        freight_charges: Optional[Decimal] = Decimal("0"),
        freight_type: Optional[str] = "fixed",
        p_and_f_charges: Optional[Decimal] = Decimal("0"),
        pf_type: Optional[str] = "fixed",
        round_off: Optional[Decimal] = Decimal("0"),
        sales_ticket_id: Optional[str] = None,
        contact_id: Optional[str] = None,
        cess_amount: Optional[Decimal] = Decimal("0"),
        is_project: Optional[bool] = None,
        other_charges: Optional[List[Dict[str, Any]]] = None,
        **kwargs  # Accept additional fields
    ) -> Quotation:
        """Create a new quotation with all fields and GST calculations."""
        print(f"DEBUG: Creating quotation with type: {quotation_type}")
        print(f"DEBUG: Show images: {show_images}")
        print(f"DEBUG: Show images in PDF: {show_images_in_pdf}")
        print(f"DEBUG: Items data: {items}")
        
        # Get customer
        customer = None
        if customer_id:
            customer = self.db.query(Customer).filter(
                Customer.id == customer_id,
                Customer.company_id == company.id
            ).first()
            if not customer:
                raise ValueError(f"Customer not found with ID: {customer_id}")
        
        # Get sales person details
        sales_person_name = None
        if sales_person_id:
            sales_person = self.db.query(Employee).filter(
                Employee.id == sales_person_id,
                Employee.company_id == company.id
            ).first()
            if sales_person:
                sales_person_name = sales_person.full_name or sales_person.name
            else:
                print(f"WARNING: Sales person with ID {sales_person_id} not found")
        
        # Handle Excel data
        excel_notes_file_url = None
        if excel_file_content and excel_filename:
            excel_notes_file_url = self._save_excel_file(company.id, excel_file_content, excel_filename)
        elif excel_notes:
            excel_notes_file_url = self._save_excel_data(company.id, excel_notes)
        
        # Determine place of supply
        company_state_code = (
            self._normalize_state_code(getattr(company, "state_code", None))
            or self._normalize_state_code(getattr(company, "state", None))
            or "27"
        )

        customer_state_code = None
        if customer:
            customer_state_code = (
                self._normalize_state_code(getattr(customer, "billing_state_code", None))
                or self._normalize_state_code(getattr(customer, "billing_state", None))
            )

        place_of_supply_code = (
            self._normalize_state_code(place_of_supply)
            or customer_state_code
            or company_state_code
        )
        place_of_supply_name = INDIAN_STATE_CODES.get(place_of_supply_code, str(place_of_supply or ""))
        
        # Generate quotation number if not provided
        if quotation_number:
            # Check if quotation number already exists
            existing = self.db.query(Quotation).filter(
                Quotation.company_id == company.id,
                Quotation.quotation_number == quotation_number
            ).first()
            if existing:
                quotation_number = self._get_next_quotation_number(company)
        else:
            quotation_number = self._get_next_quotation_number(company)
        
        quote_date = quotation_date or datetime.utcnow()
        validity_date = quote_date + timedelta(days=validity_days)
        
        # Determine if it's a project based on items or explicit flag
        if is_project is None:
            # Auto-detect if any item is marked as project
            is_project = quotation_type == "project" or any(
                item_data.get("item_type") == "project" or item_data.get("is_project") 
                for item_data in items
            )
        
        # Create quotation with all fields
        quotation = Quotation(
            id=generate_uuid(),
            company_id=company.id,
            quotation_number=quotation_number,
            customer_id=customer.id if customer else None,
            contact_person=contact_person,
            sales_person_id=sales_person_id,
            sales_person_name=sales_person_name,
            show_images=show_images,
            quotation_type=quotation_type,  # Ensure this is set
            quotation_date=quote_date,
            validity_date=validity_date,
            place_of_supply=place_of_supply_code,
            place_of_supply_name=place_of_supply_name,
            
            # Multi-currency support
            currency_code=currency_code,
            exchange_rate=exchange_rate,
            
            # PDF options
            show_images_in_pdf=show_images_in_pdf,

            # Charges
            freight_charges=freight_charges or Decimal("0"),
            freight_type=freight_type or "fixed",
            p_and_f_charges=p_and_f_charges or Decimal("0"),
            pf_type=pf_type or "fixed",
            round_off=round_off or Decimal("0"),

            # Additional fields from model
            sales_ticket_id=sales_ticket_id,
            contact_id=contact_id,
            is_project=is_project,
            cess_amount=cess_amount or Decimal("0"),
            
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
        
        # Handle any additional kwargs
        for key, value in kwargs.items():
            if hasattr(quotation, key):
                setattr(quotation, key, value)
        
        self.db.add(quotation)
        self.db.flush()
        
        # Calculate totals
        subtotal = Decimal("0")
        total_cgst = Decimal("0")
        total_sgst = Decimal("0")
        total_igst = Decimal("0")
        total_discount = Decimal("0")
        total_cess = cess_amount or Decimal("0")
        
        company_state = company_state_code
        
        # Add items
        for item_data in items:
            print(f"DEBUG: Processing item data: {item_data}")
            
            qty = Decimal(str(item_data.get("quantity", 0)))
            unit_price = Decimal(str(item_data.get("unit_price", 0)))
            gst_rate = Decimal(str(item_data.get("gst_rate", 18)))
            discount_percent = Decimal(str(item_data.get("discount_percent", 0)))
            item_code = item_data.get("item_code")
            item_cess = Decimal(str(item_data.get("cess_amount", 0)))
            
            # Calculate amounts
            base_amount = self._round_amount(qty * unit_price)
            discount_amount = self._round_amount(base_amount * discount_percent / 100)
            taxable_amount = base_amount - discount_amount
            
            # Calculate GST
            gst_split = self._calculate_gst_split(
                taxable_amount,
                gst_rate,
                company_state,
                place_of_supply_code
            )
            
            # Add cess if applicable
            item_cess_amount = self._round_amount(taxable_amount * item_cess / 100)
            total_cess += item_cess_amount
            
            total_tax = gst_split["cgst_amount"] + gst_split["sgst_amount"] + gst_split["igst_amount"] + item_cess_amount
            item_total = taxable_amount + total_tax
            
            # Get product details
            product = None
            if item_data.get("product_id"):
                product = self.db.query(Product).filter(Product.id == item_data["product_id"]).first()
            
            # Determine description
            description = item_data.get("description") or (product.name if product else "Item")
            hsn_code = item_data.get("hsn_code") or item_data.get("hsn") or (product.hsn_code if product else None)
            unit = item_data.get("unit") or (product.unit if product else "unit")
            
            # Check if this is a project item
            item_is_project = is_project or quotation_type == "project" or item_data.get("item_type") == "project"
            
            item = QuotationItem(
                id=generate_uuid(),
                quotation_id=quotation.id,
                product_id=item_data.get("product_id"),
                item_code=item_code,  # Set item_code
                description=description,
                hsn_code=hsn_code,
                quantity=qty,
                unit=unit,
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
                cess_amount=item_cess_amount,
                taxable_amount=taxable_amount,
                total_amount=item_total,
                is_project=item_is_project  # Set is_project flag
            )
            self.db.add(item)
            self.db.flush()
            
            # Add sub_items if this is a project quotation and item has sub_items
            if item_is_project and item_data.get("sub_items"):
                print(f"DEBUG: Adding sub_items for project item: {item.id}")
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
        other_charges_totals = self._calculate_other_charges_totals(
            base_taxable_amount=subtotal,
            other_charges=other_charges,
            company_state_code=company_state,
            place_of_supply=place_of_supply_code,
        )

        total_cgst += other_charges_totals["cgst_amount"]
        total_sgst += other_charges_totals["sgst_amount"]
        total_igst += other_charges_totals["igst_amount"]

        effective_freight = self._round_amount(Decimal(str(freight_charges or 0)))
        effective_pf = self._round_amount(Decimal(str(p_and_f_charges or 0)) + other_charges_totals["base_amount"])
        effective_round_off = self._round_amount(Decimal(str(round_off or 0)))

        quotation.freight_charges = effective_freight
        quotation.p_and_f_charges = effective_pf
        quotation.round_off = effective_round_off

        quotation.subtotal = subtotal
        quotation.discount_amount = total_discount
        quotation.cgst_amount = total_cgst
        quotation.sgst_amount = total_sgst
        quotation.igst_amount = total_igst
        quotation.cess_amount = total_cess
        quotation.total_tax = total_cgst + total_sgst + total_igst + total_cess
        quotation.total_amount = subtotal + quotation.total_tax + effective_freight + effective_pf + effective_round_off
        
        # Calculate base currency total (in INR) for reporting
        exchange_rate_decimal = Decimal(str(exchange_rate)) if exchange_rate else Decimal("1.0")
        quotation.base_currency_total = self._round_amount(quotation.total_amount * exchange_rate_decimal)
        
        # Debug output
        print(f"DEBUG: Created quotation {quotation.quotation_number}")
        print(f"DEBUG: Show images: {getattr(quotation, 'show_images', True)}")
        print(f"DEBUG: Show images in PDF: {getattr(quotation, 'show_images_in_pdf', True)}")
        print(f"DEBUG: Quotation type: {quotation.quotation_type}")
        print(f"DEBUG: Is project: {quotation.is_project}")
        print(f"DEBUG: Total items: {len(quotation.items)}")
        print(f"DEBUG: Cess amount: {quotation.cess_amount}")
        
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
        show_images: Optional[bool] = None,
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
        # Multi-currency support
        currency_code: Optional[str] = None,
        exchange_rate: Optional[Decimal] = None,
        # PDF options
        show_images_in_pdf: Optional[bool] = None,
        freight_charges: Optional[Decimal] = None,
        freight_type: Optional[str] = None,
        p_and_f_charges: Optional[Decimal] = None,
        pf_type: Optional[str] = None,
        round_off: Optional[Decimal] = None,
        # Additional fields
        sales_ticket_id: Optional[str] = None,
        contact_id: Optional[str] = None,
        cess_amount: Optional[Decimal] = None,
        is_project: Optional[bool] = None,
        place_of_supply: Optional[str] = None,
        other_charges: Optional[List[Dict[str, Any]]] = None,
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
        if show_images is not None:
            quotation.show_images = show_images
        if show_images_in_pdf is not None:
            quotation.show_images_in_pdf = show_images_in_pdf
        if freight_charges is not None:
            quotation.freight_charges = freight_charges
        if freight_type is not None:
            quotation.freight_type = freight_type
        if p_and_f_charges is not None:
            quotation.p_and_f_charges = p_and_f_charges
        if pf_type is not None:
            quotation.pf_type = pf_type
        if round_off is not None:
            quotation.round_off = round_off
        if sales_ticket_id is not None:
            quotation.sales_ticket_id = sales_ticket_id
        if contact_id is not None:
            quotation.contact_id = contact_id
        if cess_amount is not None:
            quotation.cess_amount = cess_amount
        if is_project is not None:
            quotation.is_project = is_project
        if place_of_supply is not None:
            normalized_place_of_supply = self._normalize_state_code(place_of_supply)
            if normalized_place_of_supply:
                quotation.place_of_supply = normalized_place_of_supply
                quotation.place_of_supply_name = INDIAN_STATE_CODES.get(normalized_place_of_supply, "")
        
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
            total_cess = quotation.cess_amount or Decimal("0")
            
            company = self.db.query(Company).filter(Company.id == quotation.company_id).first()
            company_state = (
                self._normalize_state_code(getattr(company, "state_code", None))
                or self._normalize_state_code(getattr(company, "state", None))
                or "27"
            )
            place_of_supply = self._normalize_state_code(quotation.place_of_supply) or company_state
            
            for item_data in items:
                qty = Decimal(str(item_data.get("quantity", 0)))
                unit_price = Decimal(str(item_data.get("unit_price", 0)))
                gst_rate = Decimal(str(item_data.get("gst_rate", 18)))
                discount_percent = Decimal(str(item_data.get("discount_percent", 0)))
                item_code = item_data.get("item_code")
                item_cess = Decimal(str(item_data.get("cess_amount", 0)))
                
                base_amount = self._round_amount(qty * unit_price)
                discount_amount = self._round_amount(base_amount * discount_percent / 100)
                taxable_amount = base_amount - discount_amount
                
                gst_split = self._calculate_gst_split(
                    taxable_amount, gst_rate, company_state, place_of_supply
                )
                
                # Add cess if applicable
                item_cess_amount = self._round_amount(taxable_amount * item_cess / 100)
                total_cess += item_cess_amount
                
                total_tax = gst_split["cgst_amount"] + gst_split["sgst_amount"] + gst_split["igst_amount"] + item_cess_amount
                item_total = taxable_amount + total_tax
                
                product = None
                if item_data.get("product_id"):
                    product = self.db.query(Product).filter(Product.id == item_data["product_id"]).first()
                
                # Determine description
                description = item_data.get("description") or (product.name if product else "Item")
                hsn_code = item_data.get("hsn_code") or item_data.get("hsn") or (product.hsn_code if product else None)
                unit = item_data.get("unit") or (product.unit if product else "unit")
                
                # Check if this is a project item
                item_is_project = quotation.is_project or quotation.quotation_type == "project" or item_data.get("item_type") == "project"
                
                item = QuotationItem(
                    id=generate_uuid(),
                    quotation_id=quotation.id,
                    product_id=item_data.get("product_id"),
                    item_code=item_code,
                    description=description,
                    hsn_code=hsn_code,
                    quantity=qty,
                    unit=unit,
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
                    cess_amount=item_cess_amount,
                    taxable_amount=taxable_amount,
                    total_amount=item_total,
                    is_project=item_is_project
                )
                self.db.add(item)
                self.db.flush()
                
                # Add sub_items if this is a project quotation and item has sub_items
                if item_is_project and item_data.get("sub_items"):
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
            
            other_charges_totals = self._calculate_other_charges_totals(
                base_taxable_amount=subtotal,
                other_charges=other_charges,
                company_state_code=company_state,
                place_of_supply=place_of_supply,
            )

            total_cgst += other_charges_totals["cgst_amount"]
            total_sgst += other_charges_totals["sgst_amount"]
            total_igst += other_charges_totals["igst_amount"]

            if other_charges is not None:
                pf_base = Decimal(
                    str(
                        p_and_f_charges
                        if p_and_f_charges is not None
                        else (quotation.p_and_f_charges or 0)
                    )
                )
                quotation.p_and_f_charges = self._round_amount(pf_base + other_charges_totals["base_amount"])

            quotation.subtotal = subtotal
            quotation.discount_amount = total_discount
            quotation.cgst_amount = total_cgst
            quotation.sgst_amount = total_sgst
            quotation.igst_amount = total_igst
            quotation.cess_amount = total_cess
            quotation.total_tax = total_cgst + total_sgst + total_igst + total_cess
            quotation.total_amount = (
                subtotal
                + quotation.total_tax
                + Decimal(str(quotation.freight_charges or 0))
                + Decimal(str(quotation.p_and_f_charges or 0))
                + Decimal(str(quotation.round_off or 0))
            )
        else:
            quotation.total_amount = (
                Decimal(str(quotation.subtotal or 0))
                + Decimal(str(quotation.total_tax or 0))
                + Decimal(str(quotation.freight_charges or 0))
                + Decimal(str(quotation.p_and_f_charges or 0))
                + Decimal(str(quotation.round_off or 0))
            )
        
        # Update multi-currency fields
        if currency_code is not None:
            quotation.currency_code = currency_code
        if exchange_rate is not None:
            quotation.exchange_rate = exchange_rate
        
        # Calculate base currency total (in INR) for reporting
        current_exchange_rate = Decimal(str(quotation.exchange_rate or 1.0))
        quotation.base_currency_total = self._round_amount(quotation.total_amount * current_exchange_rate)
        
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

        shipping_address = None
        shipping_city = None
        shipping_state = None
        shipping_country = "India"
        shipping_zip = None
        if customer:
            shipping_address = customer.shipping_address or customer.billing_address
            shipping_city = customer.shipping_city or customer.billing_city
            shipping_state = customer.shipping_state or customer.billing_state
            shipping_country = customer.shipping_country or customer.billing_country or "India"
            shipping_zip = customer.shipping_zip or customer.billing_zip

        normalized_place = (
            self._normalize_state_code(quotation.place_of_supply)
            or self._normalize_state_code(getattr(customer, "billing_state_code", None))
            or self._normalize_state_code(company.state_code)
            or self._normalize_state_code(getattr(company, "state", None))
            or "27"
        )
        normalized_place_name = INDIAN_STATE_CODES.get(normalized_place, quotation.place_of_supply_name or "")

        # Invoice model does not have quotation-only fields like remarks/reference/reference_date/contact_person.
        # Merge remarks into notes and map reference -> reference_no fallback.
        merged_notes = "\n".join(
            [v for v in [quotation.notes, quotation.remarks] if v]
        ) or None

        # Create invoice with compatible fields
        invoice = Invoice(
            id=generate_uuid(),
            company_id=quotation.company_id,
            customer_id=quotation.customer_id,
            invoice_number=invoice_number,
            invoice_date=invoice_date or datetime.utcnow(),
            due_date=due_date,
            shipping_address=shipping_address,
            shipping_city=shipping_city,
            shipping_state=shipping_state,
            shipping_country=shipping_country,
            shipping_zip=shipping_zip,
            invoice_type=invoice_type,
            place_of_supply=normalized_place,
            place_of_supply_name=normalized_place_name,
            subtotal=quotation.subtotal,
            discount_amount=quotation.discount_amount,
            cgst_amount=quotation.cgst_amount,
            sgst_amount=quotation.sgst_amount,
            igst_amount=quotation.igst_amount,
            cess_amount=quotation.cess_amount,
            total_tax=quotation.total_tax,
            total_amount=quotation.total_amount,
            balance_due=quotation.total_amount,
            outstanding_amount=quotation.total_amount,
            notes=merged_notes,
            terms=quotation.terms,
            status=InvoiceStatus.DRAFT,
            sales_person_id=quotation.sales_person_id,
            reference_no=quotation.reference_no or quotation.reference,
            payment_terms=quotation.payment_terms,
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
                cess_amount=q_item.cess_amount,
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
        quotation = self.db.query(Quotation).filter(
            Quotation.id == quotation_id,
            Quotation.company_id == company_id,
        ).first()
        
        if quotation:
            # Eager load items and sub_items
            quotation.items  # This triggers lazy load
            for item in quotation.items:
                item.sub_items  # This triggers lazy load for sub_items
        
        return quotation
    
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
            show_images=quotation.show_images,
            show_images_in_pdf=getattr(quotation, "show_images_in_pdf", True),
            freight_charges=getattr(quotation, "freight_charges", 0),
            freight_type=getattr(quotation, "freight_type", "fixed"),
            p_and_f_charges=getattr(quotation, "p_and_f_charges", 0),
            pf_type=getattr(quotation, "pf_type", "fixed"),
            round_off=getattr(quotation, "round_off", 0),
            quotation_type=quotation.quotation_type,
            is_project=quotation.is_project,
            subtotal=quotation.subtotal,
            discount_amount=quotation.discount_amount,
            cgst_amount=quotation.cgst_amount,
            sgst_amount=quotation.sgst_amount,
            igst_amount=quotation.igst_amount,
            cess_amount=quotation.cess_amount,
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
            sales_ticket_id=quotation.sales_ticket_id,
            contact_id=quotation.contact_id,
            currency_code=quotation.currency_code,
            exchange_rate=quotation.exchange_rate,
            base_currency_total=quotation.base_currency_total,
        )
        
        self.db.add(new_quotation)
        self.db.flush()
        
        # Copy items
        for q_item in quotation.items:
            new_item = QuotationItem(
                id=generate_uuid(),
                quotation_id=new_quotation.id,
                product_id=q_item.product_id,
                item_code=q_item.item_code,
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
                cess_amount=q_item.cess_amount,
                taxable_amount=q_item.taxable_amount,
                total_amount=q_item.total_amount,
                is_project=q_item.is_project,
            )
            self.db.add(new_item)
            self.db.flush()
            
            # Copy sub_items if it's a project item
            if q_item.is_project and q_item.sub_items:
                for sub_item in q_item.sub_items:
                    new_sub_item = SubItem(
                        id=generate_uuid(),
                        quotation_item_id=new_item.id,
                        description=sub_item.description,
                        quantity=sub_item.quantity,
                        image_url=sub_item.image_url,
                    )
                    self.db.add(new_sub_item)
        
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
    
    def compare_quotations(
        self,
        company_id: str,
        quotation_ids: List[str],
    ) -> Dict[str, Any]:
        """
        Compare multiple quotations side by side.
        
        Returns comparison data including:
        - Basic quotation info
        - Item-by-item comparison
        - Price differences
        - Terms comparison
        """
        if len(quotation_ids) < 2:
            raise ValueError("Need at least 2 quotations to compare")
        if len(quotation_ids) > 5:
            raise ValueError("Can only compare up to 5 quotations at once")
        
        # Fetch quotations
        quotations = self.db.query(Quotation).filter(
            Quotation.id.in_(quotation_ids),
            Quotation.company_id == company_id
        ).all()
        
        if len(quotations) != len(quotation_ids):
            raise ValueError("One or more quotations not found")
        
        # Build comparison data
        comparison = {
            "quotations": [],
            "items_comparison": [],
            "summary": {
                "lowest_total": None,
                "highest_total": None,
                "average_total": 0,
            }
        }
        
        # Build quotation summaries
        totals = []
        all_items_by_description = {}
        
        for quotation in quotations:
            customer_name = ""
            if quotation.customer:
                customer_name = quotation.customer.name
            
            quote_data = {
                "id": quotation.id,
                "quotation_number": quotation.quotation_number,
                "quotation_date": quotation.quotation_date.isoformat() if quotation.quotation_date else None,
                "customer_name": customer_name,
                "status": quotation.status.value if quotation.status else "draft",
                "currency_code": quotation.currency_code or "INR",
                "subtotal": float(quotation.subtotal or 0),
                "discount_amount": float(quotation.discount_amount or 0),
                "total_tax": float(quotation.total_tax or 0),
                "total_amount": float(quotation.total_amount or 0),
                "terms": quotation.terms,
                "payment_terms": quotation.payment_terms,
                "validity_date": quotation.validity_date.isoformat() if quotation.validity_date else None,
                "items": [],
            }
            
            totals.append(float(quotation.total_amount or 0))
            
            # Collect items
            for item in quotation.items:
                item_data = {
                    "id": item.id,
                    "description": item.description,
                    "item_code": item.item_code,
                    "hsn_code": item.hsn_code,
                    "quantity": float(item.quantity or 0),
                    "unit": item.unit,
                    "unit_price": float(item.unit_price or 0),
                    "discount_percent": float(item.discount_percent or 0),
                    "gst_rate": float(item.gst_rate or 0),
                    "cess_amount": float(item.cess_amount or 0),
                    "total_amount": float(item.total_amount or 0),
                    "is_project": item.is_project,
                }
                quote_data["items"].append(item_data)
                
                # Group items by description for comparison
                desc_key = item.description.lower().strip()
                if desc_key not in all_items_by_description:
                    all_items_by_description[desc_key] = {
                        "description": item.description,
                        "item_code": item.item_code,
                        "hsn_code": item.hsn_code,
                        "quotations": {}
                    }
                all_items_by_description[desc_key]["quotations"][quotation.id] = {
                    "quantity": float(item.quantity or 0),
                    "unit_price": float(item.unit_price or 0),
                    "discount_percent": float(item.discount_percent or 0),
                    "cess_amount": float(item.cess_amount or 0),
                    "total_amount": float(item.total_amount or 0),
                }
            
            comparison["quotations"].append(quote_data)
        
        # Build items comparison
        for desc_key, item_data in all_items_by_description.items():
            prices = [q_data["unit_price"] for q_data in item_data["quotations"].values()]
            totals_for_item = [q_data["total_amount"] for q_data in item_data["quotations"].values()]
            
            comparison["items_comparison"].append({
                "description": item_data["description"],
                "item_code": item_data["item_code"],
                "hsn_code": item_data["hsn_code"],
                "quotations": item_data["quotations"],
                "price_range": {
                    "min": min(prices) if prices else 0,
                    "max": max(prices) if prices else 0,
                    "difference": max(prices) - min(prices) if prices else 0,
                },
                "total_range": {
                    "min": min(totals_for_item) if totals_for_item else 0,
                    "max": max(totals_for_item) if totals_for_item else 0,
                },
            })
        
        # Calculate summary
        if totals:
            min_total = min(totals)
            max_total = max(totals)
            avg_total = sum(totals) / len(totals)
            
            comparison["summary"] = {
                "lowest_total": min_total,
                "highest_total": max_total,
                "average_total": round(avg_total, 2),
                "difference": round(max_total - min_total, 2),
                "lowest_quotation_id": quotations[totals.index(min_total)].id,
                "highest_quotation_id": quotations[totals.index(max_total)].id,
            }
        
        return comparison
    
    def get_quotation_items_report(
        self,
        company_id: str,
        from_date: Optional[date] = None,
        to_date: Optional[date] = None,
    ) -> Dict[str, Any]:
        """
        Get quotation item-level report.
        
        Aggregates by product showing:
        - Total quantity quoted
        - Total value quoted
        - Number of quotations
        - Conversion rate (quoted to won)
        """
        # Base query for quotation items
        from app.database.models import QuotationItem
        
        query = self.db.query(
            QuotationItem.product_id,
            QuotationItem.description,
            QuotationItem.hsn_code,
            func.count(func.distinct(QuotationItem.quotation_id)).label("quotation_count"),
            func.sum(QuotationItem.quantity).label("total_quantity"),
            func.sum(QuotationItem.taxable_amount).label("total_value"),
            func.sum(QuotationItem.total_amount).label("total_with_tax"),
        ).join(
            Quotation, QuotationItem.quotation_id == Quotation.id
        ).filter(
            Quotation.company_id == company_id
        )
        
        if from_date:
            query = query.filter(Quotation.quotation_date >= from_date)
        if to_date:
            query = query.filter(Quotation.quotation_date <= to_date)
        
        results = query.group_by(
            QuotationItem.product_id,
            QuotationItem.description,
            QuotationItem.hsn_code
        ).all()
        
        # Get conversion data
        converted_items = {}
        converted_query = self.db.query(
            QuotationItem.product_id,
            QuotationItem.description,
            func.sum(QuotationItem.quantity).label("converted_quantity"),
        ).join(
            Quotation, QuotationItem.quotation_id == Quotation.id
        ).filter(
            Quotation.company_id == company_id,
            Quotation.status == QuotationStatus.CONVERTED,
        )
        
        if from_date:
            converted_query = converted_query.filter(Quotation.quotation_date >= from_date)
        if to_date:
            converted_query = converted_query.filter(Quotation.quotation_date <= to_date)
        
        converted_results = converted_query.group_by(
            QuotationItem.product_id,
            QuotationItem.description
        ).all()
        
        for row in converted_results:
            key = row.product_id or row.description
            converted_items[key] = float(row.converted_quantity or 0)
        
        # Build report
        items_report = []
        total_value = Decimal("0")
        
        for row in results:
            key = row.product_id or row.description
            converted_qty = converted_items.get(key, 0)
            total_qty = float(row.total_quantity or 0)
            conversion_rate = (converted_qty / total_qty * 100) if total_qty > 0 else 0
            
            product_name = row.description
            if row.product_id:
                product = self.db.query(Product).filter(Product.id == row.product_id).first()
                if product:
                    product_name = product.name
            
            value = row.total_value or Decimal("0")
            total_value += value
            
            items_report.append({
                "product_id": row.product_id,
                "product_name": product_name,
                "description": row.description,
                "hsn_code": row.hsn_code,
                "quotation_count": row.quotation_count or 0,
                "total_quantity": total_qty,
                "converted_quantity": converted_qty,
                "conversion_rate": round(conversion_rate, 2),
                "total_value": float(value),
                "total_with_tax": float(row.total_with_tax or 0),
            })
        
        # Sort by total value
        items_report.sort(key=lambda x: x["total_value"], reverse=True)
        
        return {
            "items": items_report,
            "summary": {
                "total_items": len(items_report),
                "total_value": float(total_value),
                "total_quotations": len(set(r.product_id or r.description for r in results)),
            }
        }
