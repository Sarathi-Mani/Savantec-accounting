# app/services/vendor_service.py
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException, status
from datetime import datetime
from typing import List, Optional
from decimal import Decimal

from app.database.models import (
    Company, Vendor, VendorOpeningBalanceItem, 
    VendorContactPerson, VendorBankDetail
)
from app.schemas.vendor import (
    VendorCreate, VendorUpdate, OpeningBalanceItemCreate,
    ContactPersonCreate, BankDetailCreate
)


class VendorService:
    """Service for vendor operations."""
    
    def __init__(self, db: Session):
        self.db = db
    
    def generate_vendor_code(self, company: Company) -> str:
        """Generate unique vendor code for a company."""
        last_vendor = self.db.query(Vendor).filter(
            Vendor.company_id == company.id,
            Vendor.vendor_code.isnot(None),
            Vendor.deleted_at.is_(None)
        ).order_by(Vendor.created_at.desc()).first()
        
        if last_vendor and last_vendor.vendor_code:
            try:
                import re
                match = re.search(r'VEND-(\d+)', last_vendor.vendor_code)
                if match:
                    last_number = int(match.group(1))
                    next_number = last_number + 1
                else:
                    next_number = 1
            except (ValueError, AttributeError):
                next_number = 1
        else:
            next_number = 1
        
        return f"VEND-{next_number:03d}"
    
    def create_vendor(self, company: Company, data: VendorCreate) -> Vendor:
        """Create a new vendor."""
        try:
            # Generate vendor code if not provided
            vendor_code = data.vendor_code
            if not vendor_code:
                vendor_code = self.generate_vendor_code(company)
            
            # Check if vendor code already exists
            existing = self.db.query(Vendor).filter(
                Vendor.company_id == company.id,
                Vendor.vendor_code == vendor_code,
                Vendor.deleted_at.is_(None)
            ).first()
            
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Vendor with code {vendor_code} already exists"
                )
            
            # Calculate opening balance
            opening_balance = Decimal('0')
            if data.opening_balance_mode == "split" and data.opening_balance_split:
                opening_balance = sum(item.amount for item in data.opening_balance_split)
            else:
                opening_balance = data.opening_balance or Decimal('0')
            
            # Create vendor
            vendor = Vendor(
                company_id=company.id,
                name=data.name,
                contact=data.contact,
                email=data.email,
                mobile=data.mobile,
                tax_number=data.tax_number,
                gst_registration_type=data.gst_registration_type,
                pan_number=data.pan_number,
                vendor_code=vendor_code,
                opening_balance=opening_balance,
                opening_balance_type=data.opening_balance_type,
                opening_balance_mode=data.opening_balance_mode,
                credit_limit=data.credit_limit or Decimal('0'),
                credit_days=data.credit_days or 0,
                payment_terms=data.payment_terms,
                tds_applicable=data.tds_applicable or False,
                tds_rate=data.tds_rate or Decimal('0'),
                billing_address=data.billing_address,
                billing_city=data.billing_city,
                billing_state=data.billing_state,
                billing_country=data.billing_country or "India",
                billing_zip=data.billing_zip,
                shipping_address=data.shipping_address,
                shipping_city=data.shipping_city,
                shipping_state=data.shipping_state,
                shipping_country=data.shipping_country or "India",
                shipping_zip=data.shipping_zip,
                is_active=True
            )
            
            self.db.add(vendor)
            self.db.flush()  # Get vendor ID
            
            # Create opening balance items
            if data.opening_balance_mode == "split" and data.opening_balance_split:
                for item_data in data.opening_balance_split:
                    item = VendorOpeningBalanceItem(
                        vendor_id=vendor.id,
                        date=item_data.date,
                        voucher_name=item_data.voucher_name,
                        days=item_data.days or 0,
                        amount=item_data.amount
                    )
                    self.db.add(item)
            
            # Create contact persons
            if data.contact_persons:
                for cp_data in data.contact_persons:
                    contact_person = VendorContactPerson(
                        vendor_id=vendor.id,
                        name=cp_data.name,
                        designation=cp_data.designation,
                        email=cp_data.email,
                        phone=cp_data.phone,
                        is_primary=cp_data.is_primary or False
                    )
                    self.db.add(contact_person)
            
            # Create bank details
            if data.bank_details:
                for bank_data in data.bank_details:
                    bank_detail = VendorBankDetail(
                        vendor_id=vendor.id,
                        bank_name=bank_data.bank_name,
                        branch=bank_data.branch,
                        account_number=bank_data.account_number,
                        account_holder_name=bank_data.account_holder_name,
                        ifsc_code=bank_data.ifsc_code,
                        account_type=bank_data.account_type or "Savings",
                        is_primary=bank_data.is_primary or False,
                        upi_id=bank_data.upi_id
                    )
                    self.db.add(bank_detail)
            
            self.db.commit()
            self.db.refresh(vendor)
            return vendor
            
        except IntegrityError as e:
            self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Database error: {str(e)}"
            )
    
    def get_vendors(
        self, 
        company: Company, 
        page: int = 1, 
        page_size: int = 20,
        search: Optional[str] = None,
        is_active: Optional[bool] = None
    ) -> tuple[List[Vendor], int]:
        """Get vendors with pagination."""
        query = self.db.query(Vendor).filter(
            Vendor.company_id == company.id,
            Vendor.deleted_at.is_(None)
        )
        
        if search:
            search_term = f"%{search}%"
            query = query.filter(
                (Vendor.name.ilike(search_term)) |
                (Vendor.vendor_code.ilike(search_term)) |
                (Vendor.tax_number.ilike(search_term)) |
                (Vendor.contact.ilike(search_term))
            )
        
        if is_active is not None:
            query = query.filter(Vendor.is_active == is_active)
        
        total = query.count()
        
        vendors = query.order_by(Vendor.name)\
            .offset((page - 1) * page_size)\
            .limit(page_size)\
            .all()
        
        return vendors, total
    
    def get_vendor(self, vendor_id: str, company: Company) -> Optional[Vendor]:
        """Get a vendor by ID."""
        vendor = self.db.query(Vendor).filter(
            Vendor.id == vendor_id,
            Vendor.company_id == company.id,
            Vendor.deleted_at.is_(None)
        ).first()
        return vendor
    
    def update_vendor(self, vendor: Vendor, data: VendorUpdate) -> Vendor:
        """Update a vendor."""
        update_data = data.dict(exclude_unset=True)
        
        for field, value in update_data.items():
            setattr(vendor, field, value)
        
        vendor.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(vendor)
        return vendor
    
    def delete_vendor(self, vendor: Vendor) -> None:
        """Soft delete a vendor."""
        vendor.deleted_at = datetime.utcnow()
        vendor.is_active = False
        self.db.commit()
    
    def toggle_vendor_active(self, vendor: Vendor, is_active: bool) -> Vendor:
        """Toggle vendor active status."""
        vendor.is_active = is_active
        vendor.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(vendor)
        return vendor
    
    def search_vendors(self, company: Company, query: str, limit: int = 10) -> List[Vendor]:
        """Search vendors for autocomplete."""
        search_term = f"%{query}%"
        vendors = self.db.query(Vendor).filter(
            Vendor.company_id == company.id,
            Vendor.deleted_at.is_(None),
            Vendor.is_active == True,
            (Vendor.name.ilike(search_term)) |
            (Vendor.vendor_code.ilike(search_term))
        ).order_by(Vendor.name).limit(limit).all()
        return vendors
    
    # Opening balance items methods
    def get_opening_balance_items(self, vendor: Vendor) -> List[VendorOpeningBalanceItem]:
        """Get opening balance items for a vendor."""
        return self.db.query(VendorOpeningBalanceItem).filter(
            VendorOpeningBalanceItem.vendor_id == vendor.id
        ).order_by(VendorOpeningBalanceItem.date).all()
    
    def add_opening_balance_item(self, vendor: Vendor, data: OpeningBalanceItemCreate) -> VendorOpeningBalanceItem:
        """Add an opening balance item."""
        item = VendorOpeningBalanceItem(
            vendor_id=vendor.id,
            date=data.date,
            voucher_name=data.voucher_name,
            days=data.days or 0,
            amount=data.amount
        )
        self.db.add(item)
        self.db.commit()
        self.db.refresh(item)
        return item
    
    # Contact persons methods
    def get_contact_persons(self, vendor: Vendor) -> List[VendorContactPerson]:
        """Get contact persons for a vendor."""
        return self.db.query(VendorContactPerson).filter(
            VendorContactPerson.vendor_id == vendor.id
        ).order_by(VendorContactPerson.is_primary.desc(), VendorContactPerson.name).all()
    
    def add_contact_person(self, vendor: Vendor, data: ContactPersonCreate) -> VendorContactPerson:
        """Add a contact person."""
        # If setting as primary, unset other primaries
        if data.is_primary:
            self.db.query(VendorContactPerson).filter(
                VendorContactPerson.vendor_id == vendor.id,
                VendorContactPerson.is_primary == True
            ).update({"is_primary": False})
        
        contact_person = VendorContactPerson(
            vendor_id=vendor.id,
            name=data.name,
            designation=data.designation,
            email=data.email,
            phone=data.phone,
            is_primary=data.is_primary or False
        )
        self.db.add(contact_person)
        self.db.commit()
        self.db.refresh(contact_person)
        return contact_person
    
    # Bank details methods
    def get_bank_details(self, vendor: Vendor) -> List[VendorBankDetail]:
        """Get bank details for a vendor."""
        return self.db.query(VendorBankDetail).filter(
            VendorBankDetail.vendor_id == vendor.id,
            VendorBankDetail.is_active == True
        ).order_by(VendorBankDetail.is_primary.desc(), VendorBankDetail.bank_name).all()
    
    def add_bank_detail(self, vendor: Vendor, data: BankDetailCreate) -> VendorBankDetail:
        """Add a bank detail."""
        # If setting as primary, unset other primaries
        if data.is_primary:
            self.db.query(VendorBankDetail).filter(
                VendorBankDetail.vendor_id == vendor.id,
                VendorBankDetail.is_primary == True
            ).update({"is_primary": False})
        
        bank_detail = VendorBankDetail(
            vendor_id=vendor.id,
            bank_name=data.bank_name,
            branch=data.branch,
            account_number=data.account_number,
            account_holder_name=data.account_holder_name,
            ifsc_code=data.ifsc_code,
            account_type=data.account_type or "Savings",
            is_primary=data.is_primary or False,
            upi_id=data.upi_id
        )
        self.db.add(bank_detail)
        self.db.commit()
        self.db.refresh(bank_detail)
        return bank_detail
    
    def set_primary_bank_detail(self, vendor: Vendor, bank_detail_id: str) -> VendorBankDetail:
        """Set a bank detail as primary."""
        # Unset all primaries
        self.db.query(VendorBankDetail).filter(
            VendorBankDetail.vendor_id == vendor.id
        ).update({"is_primary": False})
        
        # Set the selected one as primary
        bank_detail = self.db.query(VendorBankDetail).filter(
            VendorBankDetail.id == bank_detail_id,
            VendorBankDetail.vendor_id == vendor.id
        ).first()
        
        if not bank_detail:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Bank detail not found"
            )
        
        bank_detail.is_primary = True
        self.db.commit()
        self.db.refresh(bank_detail)
        return bank_detail
    
    # Statistics methods
    def get_vendor_count(self, company: Company) -> int:
        """Get total vendor count."""
        return self.db.query(Vendor).filter(
            Vendor.company_id == company.id,
            Vendor.deleted_at.is_(None),
            Vendor.is_active == True
        ).count()
    
    def get_total_outstanding(self, company: Company) -> Decimal:
        """Get total outstanding amount from vendors."""
        result = self.db.query(Vendor).filter(
            Vendor.company_id == company.id,
            Vendor.deleted_at.is_(None),
            Vendor.is_active == True,
            Vendor.opening_balance_type == "outstanding"
        ).all()
        
        total = sum(vendor.opening_balance for vendor in result)
        return total or Decimal('0')
    
    def get_total_advance(self, company: Company) -> Decimal:
        """Get total advance amount to vendors."""
        result = self.db.query(Vendor).filter(
            Vendor.company_id == company.id,
            Vendor.deleted_at.is_(None),
            Vendor.is_active == True,
            Vendor.opening_balance_type == "advance"
        ).all()
        
        total = sum(vendor.opening_balance for vendor in result)
        return total or Decimal('0')
    
    def get_recent_vendors(self, company: Company, limit: int = 5) -> List[Vendor]:
        """Get recent vendors."""
        return self.db.query(Vendor).filter(
            Vendor.company_id == company.id,
            Vendor.deleted_at.is_(None),
            Vendor.is_active == True
        ).order_by(Vendor.created_at.desc()).limit(limit).all()
    
    def get_vendors_by_state(self, company: Company) -> dict:
        """Get vendors grouped by state."""
        from sqlalchemy import func
        
        result = self.db.query(
            Vendor.billing_state,
            func.count(Vendor.id).label('count')
        ).filter(
            Vendor.company_id == company.id,
            Vendor.deleted_at.is_(None),
            Vendor.is_active == True,
            Vendor.billing_state.isnot(None)
        ).group_by(Vendor.billing_state).all()
        
        return {state: count for state, count in result}
    
    def get_top_vendors(self, company: Company, limit: int = 10, period: str = "all") -> List[dict]:
        """Get top vendors (placeholder for transaction-based ranking)."""
        # This would typically join with transactions table
        # For now, return vendors by opening balance
        vendors = self.db.query(Vendor).filter(
            Vendor.company_id == company.id,
            Vendor.deleted_at.is_(None),
            Vendor.is_active == True
        ).order_by(Vendor.opening_balance.desc()).limit(limit).all()
        
        return [
            {
                "id": vendor.id,
                "name": vendor.name,
                "vendor_code": vendor.vendor_code,
                "opening_balance": float(vendor.opening_balance),
                "opening_balance_type": vendor.opening_balance_type
            }
            for vendor in vendors
        ]