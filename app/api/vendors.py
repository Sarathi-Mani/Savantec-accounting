# app/api/vendors.py
"""Vendor API routes."""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import Optional, List
from app.database.connection import get_db
from app.database.models import User, Company
from app.schemas.vendor import (
    VendorCreate, 
    VendorUpdate, 
    VendorResponse, 
    VendorListResponse,
    OpeningBalanceItemCreate,
    ContactPersonCreate,
    BankDetailCreate
)
from app.services.vendor_service import VendorService
from app.services.company_service import CompanyService
from app.auth.dependencies import get_current_active_user

router = APIRouter(prefix="/companies/{company_id}/vendors", tags=["Vendors"])


def get_company_or_404(company_id: str, user: User, db: Session) -> Company:
    """Helper to get company or raise 404."""
    service = CompanyService(db)
    company = service.get_company(company_id, user)
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found"
        )
    return company


@router.post("", response_model=VendorResponse, status_code=status.HTTP_201_CREATED)
async def create_vendor(
    company_id: str,
    data: VendorCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Create a new vendor."""
    company = get_company_or_404(company_id, current_user, db)
    service = VendorService(db)
    vendor = service.create_vendor(company, data)
    return VendorResponse.model_validate(vendor)


@router.get("", response_model=VendorListResponse)
async def list_vendors(
    company_id: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    is_active: Optional[bool] = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """List vendors for a company."""
    company = get_company_or_404(company_id, current_user, db)
    service = VendorService(db)
    vendors, total = service.get_vendors(
        company, page, page_size, search, is_active
    )
    
    return VendorListResponse(
        vendors=[VendorResponse.model_validate(v) for v in vendors],
        total=total,
        page=page,
        page_size=page_size
    )


@router.get("/search")
async def search_vendors(
    company_id: str,
    q: str = Query(..., min_length=1),
    limit: int = Query(10, ge=1, le=50),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Quick search for vendors (autocomplete)."""
    company = get_company_or_404(company_id, current_user, db)
    service = VendorService(db)
    vendors = service.search_vendors(company, q, limit)
    return [VendorResponse.model_validate(v) for v in vendors]


@router.get("/{vendor_id}", response_model=VendorResponse)
async def get_vendor(
    company_id: str,
    vendor_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get a vendor by ID."""
    company = get_company_or_404(company_id, current_user, db)
    service = VendorService(db)
    vendor = service.get_vendor(vendor_id, company)
    
    if not vendor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vendor not found"
        )
    
    return VendorResponse.model_validate(vendor)


@router.put("/{vendor_id}", response_model=VendorResponse)
async def update_vendor(
    company_id: str,
    vendor_id: str,
    data: VendorUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update a vendor."""
    company = get_company_or_404(company_id, current_user, db)
    service = VendorService(db)
    vendor = service.get_vendor(vendor_id, company)
    
    if not vendor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vendor not found"
        )
    
    updated_vendor = service.update_vendor(vendor, data)
    return VendorResponse.model_validate(updated_vendor)


@router.delete("/{vendor_id}")
async def delete_vendor(
    company_id: str,
    vendor_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Delete a vendor (soft delete)."""
    company = get_company_or_404(company_id, current_user, db)
    service = VendorService(db)
    vendor = service.get_vendor(vendor_id, company)
    
    if not vendor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vendor not found"
        )
    
    service.delete_vendor(vendor)
    return {"message": "Vendor deleted successfully"}


@router.patch("/{vendor_id}/toggle-active")
async def toggle_vendor_active(
    company_id: str,
    vendor_id: str,
    is_active: bool = Query(..., description="Set active status"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Toggle vendor active status."""
    company = get_company_or_404(company_id, current_user, db)
    service = VendorService(db)
    vendor = service.get_vendor(vendor_id, company)
    
    if not vendor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vendor not found"
        )
    
    updated_vendor = service.toggle_vendor_active(vendor, is_active)
    return VendorResponse.model_validate(updated_vendor)


@router.get("/{vendor_id}/opening-balance-items")
async def get_vendor_opening_balance_items(
    company_id: str,
    vendor_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get opening balance items for a vendor."""
    company = get_company_or_404(company_id, current_user, db)
    service = VendorService(db)
    vendor = service.get_vendor(vendor_id, company)
    
    if not vendor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vendor not found"
        )
    
    items = service.get_opening_balance_items(vendor)
    return items


@router.post("/{vendor_id}/opening-balance-items")
async def add_opening_balance_item(
    company_id: str,
    vendor_id: str,
    data: OpeningBalanceItemCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Add an opening balance item to vendor."""
    company = get_company_or_404(company_id, current_user, db)
    service = VendorService(db)
    vendor = service.get_vendor(vendor_id, company)
    
    if not vendor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vendor not found"
        )
    
    item = service.add_opening_balance_item(vendor, data)
    return item


@router.get("/{vendor_id}/contact-persons")
async def get_vendor_contact_persons(
    company_id: str,
    vendor_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get contact persons for a vendor."""
    company = get_company_or_404(company_id, current_user, db)
    service = VendorService(db)
    vendor = service.get_vendor(vendor_id, company)
    
    if not vendor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vendor not found"
        )
    
    contacts = service.get_contact_persons(vendor)
    return contacts


@router.post("/{vendor_id}/contact-persons")
async def add_contact_person(
    company_id: str,
    vendor_id: str,
    data: ContactPersonCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Add a contact person to vendor."""
    company = get_company_or_404(company_id, current_user, db)
    service = VendorService(db)
    vendor = service.get_vendor(vendor_id, company)
    
    if not vendor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vendor not found"
        )
    
    contact = service.add_contact_person(vendor, data)
    return contact


@router.get("/{vendor_id}/bank-details")
async def get_vendor_bank_details(
    company_id: str,
    vendor_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get bank details for a vendor."""
    company = get_company_or_404(company_id, current_user, db)
    service = VendorService(db)
    vendor = service.get_vendor(vendor_id, company)
    
    if not vendor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vendor not found"
        )
    
    bank_details = service.get_bank_details(vendor)
    return bank_details


@router.post("/{vendor_id}/bank-details")
async def add_bank_detail(
    company_id: str,
    vendor_id: str,
    data: BankDetailCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Add a bank detail to vendor."""
    company = get_company_or_404(company_id, current_user, db)
    service = VendorService(db)
    vendor = service.get_vendor(vendor_id, company)
    
    if not vendor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vendor not found"
        )
    
    bank_detail = service.add_bank_detail(vendor, data)
    return bank_detail


@router.patch("/{vendor_id}/bank-details/{bank_detail_id}/set-primary")
async def set_primary_bank_detail(
    company_id: str,
    vendor_id: str,
    bank_detail_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Set a bank detail as primary."""
    company = get_company_or_404(company_id, current_user, db)
    service = VendorService(db)
    vendor = service.get_vendor(vendor_id, company)
    
    if not vendor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vendor not found"
        )
    
    bank_detail = service.set_primary_bank_detail(vendor, bank_detail_id)
    return bank_detail


# Export/Import routes
@router.post("/import")
async def import_vendors(
    company_id: str,
    vendors_data: List[dict],
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Import multiple vendors."""
    company = get_company_or_404(company_id, current_user, db)
    service = VendorService(db)
    
    imported = 0
    errors = []
    
    for idx, vendor_data in enumerate(vendors_data):
        try:
            # Convert to VendorCreate schema
            vendor_create = VendorCreate(**vendor_data)
            service.create_vendor(company, vendor_create)
            imported += 1
        except Exception as e:
            errors.append({
                "row": idx + 1,
                "error": str(e),
                "data": vendor_data
            })
    
    return {
        "imported": imported,
        "errors": errors,
        "total": len(vendors_data)
    }


@router.get("/export")
async def export_vendors(
    company_id: str,
    format: str = Query("csv", pattern="^(csv|json|excel)$"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Export vendors."""
    company = get_company_or_404(company_id, current_user, db)
    service = VendorService(db)
    
    # Get all vendors for the company
    vendors, _ = service.get_vendors(company, page=1, page_size=10000)
    
    # Format data based on requested format
    if format == "json":
        return [VendorResponse.model_validate(v).dict() for v in vendors]
    elif format == "csv":
        # Generate CSV
        import csv
        from io import StringIO
        
        output = StringIO()
        writer = csv.writer(output)
        
        # Write header
        writer.writerow([
            "Name", "Contact", "Email", "Mobile", "PAN Number", 
            "GST Number", "GST Registration Type", "Vendor Code", 
            "Opening Balance", "Opening Balance Type", "Opening Balance Mode",
            "Credit Limit", "Credit Days", "Payment Terms",
            "TDS Applicable", "TDS Rate", "Billing Address", 
            "Billing City", "Billing State", "Billing Country", 
            "Billing ZIP", "Shipping Address", "Shipping City", 
            "Shipping State", "Shipping Country", "Shipping ZIP"
        ])
        
        # Write data
        for vendor in vendors:
            writer.writerow([
                vendor.name,
                vendor.contact,
                vendor.email or "",
                vendor.mobile or "",
                vendor.pan_number or "",
                vendor.tax_number or "",
                vendor.gst_registration_type or "",
                vendor.vendor_code or "",
                vendor.opening_balance or 0,
                vendor.opening_balance_type or "",
                vendor.opening_balance_mode or "",
                vendor.credit_limit or 0,
                vendor.credit_days or 0,
                vendor.payment_terms or "",
                "Yes" if vendor.tds_applicable else "No",
                vendor.tds_rate or 0,
                vendor.billing_address or "",
                vendor.billing_city or "",
                vendor.billing_state or "",
                vendor.billing_country or "",
                vendor.billing_zip or "",
                vendor.shipping_address or "",
                vendor.shipping_city or "",
                vendor.shipping_state or "",
                vendor.shipping_country or "",
                vendor.shipping_zip or ""
            ])
        
        output.seek(0)
        return output.getvalue()
    else:
        # Excel format would require additional libraries like openpyxl
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Excel export not yet implemented"
        )


# Statistics and reports
@router.get("/statistics/summary")
async def get_vendors_summary(
    company_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get vendors summary statistics."""
    company = get_company_or_404(company_id, current_user, db)
    service = VendorService(db)
    
    total_vendors = service.get_vendor_count(company)
    total_outstanding = service.get_total_outstanding(company)
    total_advance = service.get_total_advance(company)
    recent_vendors = service.get_recent_vendors(company, limit=5)
    
    return {
        "total_vendors": total_vendors,
        "total_outstanding": total_outstanding,
        "total_advance": total_advance,
        "net_balance": total_outstanding - total_advance,
        "recent_vendors": [
            VendorResponse.model_validate(v).dict() for v in recent_vendors
        ]
    }


@router.get("/statistics/by-state")
async def get_vendors_by_state(
    company_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get vendors grouped by state."""
    company = get_company_or_404(company_id, current_user, db)
    service = VendorService(db)
    
    return service.get_vendors_by_state(company)


@router.get("/statistics/top-vendors")
async def get_top_vendors(
    company_id: str,
    limit: int = Query(10, ge=1, le=50),
    period: str = Query("all", pattern="^(day|week|month|quarter|year|all)$"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get top vendors by transaction volume/value."""
    company = get_company_or_404(company_id, current_user, db)
    service = VendorService(db)
    
    return service.get_top_vendors(company, limit, period)