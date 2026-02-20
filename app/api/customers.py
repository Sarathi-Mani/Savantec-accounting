"""Customer API routes."""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import Optional, List
from app.database.connection import get_db
from app.database.models import User, Company
from app.schemas.customer import (
    CustomerCreate,
    CustomerUpdate,
    CustomerResponse,
    CustomerListResponse,
    CustomerTypeCreate,
    CustomerTypeResponse,
    CustomerTypeListResponse,
)
from app.services.customer_service import CustomerService
from app.services.company_service import CompanyService
from app.auth.dependencies import get_current_active_user
import math

router = APIRouter(prefix="/companies/{company_id}/customers", tags=["Customers"])


def haversine_distance(lat1, lon1, lat2, lon2):
    """Calculate distance between two coordinates in meters."""
    R = 6371000
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = (
        math.sin(dphi / 2) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


def get_company_or_404(company_id: str, user: User, db: Session) -> Company:
    """Helper to get company or raise 404."""
    # Employee auth returns a dict; handle that here.
    if isinstance(user, dict) and user.get("is_employee"):
        company = db.query(Company).filter(
            Company.id == company_id,
            Company.is_active == True
        ).first()
        if not company or str(company.id) != str(user.get("company_id")):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Company not found"
            )
        return company

    service = CompanyService(db)
    company = service.get_company(company_id, user)
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found"
        )
    return company


@router.post("", response_model=CustomerResponse, status_code=status.HTTP_201_CREATED)
async def create_customer(
    company_id: str,
    data: CustomerCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Create a new customer."""
    company = get_company_or_404(company_id, current_user, db)
    service = CustomerService(db)
    customer = service.create_customer(company, data)
    return CustomerResponse.model_validate(customer)


@router.get("", response_model=CustomerListResponse)
async def list_customers(
    company_id: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    customer_type: Optional[str] = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """List customers for a company."""
    company = get_company_or_404(company_id, current_user, db)
    service = CustomerService(db)
    customers, total = service.get_customers(
        company, page, page_size, search, customer_type
    )
    
    return CustomerListResponse(
        customers=[CustomerResponse.model_validate(c) for c in customers],
        total=total,
        page=page,
        page_size=page_size
    )


@router.get("/search")
async def search_customers(
    company_id: str,
    q: str = Query(..., min_length=1),
    limit: int = Query(10, ge=1, le=50),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Quick search for customers (autocomplete)."""
    company = get_company_or_404(company_id, current_user, db)
    service = CustomerService(db)
    customers = service.search_customers(company, q, limit)
    return [CustomerResponse.model_validate(c) for c in customers]


@router.get("/types", response_model=CustomerTypeListResponse)
async def list_customer_types(
    company_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """List customer types for a company."""
    company = get_company_or_404(company_id, current_user, db)
    service = CustomerService(db)
    customer_types = service.list_customer_types(company)
    return CustomerTypeListResponse(
        customer_types=[CustomerTypeResponse.model_validate(item) for item in customer_types]
    )


@router.post("/types", response_model=CustomerTypeResponse, status_code=status.HTTP_201_CREATED)
async def create_customer_type(
    company_id: str,
    data: CustomerTypeCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Create a customer type for a company."""
    company = get_company_or_404(company_id, current_user, db)
    service = CustomerService(db)
    try:
        customer_type = service.create_customer_type(company, data)
        return CustomerTypeResponse.model_validate(customer_type)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@router.delete("/types/{customer_type_id}")
async def delete_customer_type(
    company_id: str,
    customer_type_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Delete a customer type for a company."""
    company = get_company_or_404(company_id, current_user, db)
    service = CustomerService(db)
    try:
        service.delete_customer_type(company, customer_type_id)
        return {"message": "Customer type deleted successfully"}
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@router.get("/nearby")
async def get_nearby_customers(
    company_id: str,
    latitude: float = Query(..., ge=-90, le=90),
    longitude: float = Query(..., ge=-180, le=180),
    radius_km: float = Query(10, ge=0.1, le=200),
    limit: int = Query(200, ge=1, le=500),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Get nearby customers based on coordinates."""
    company = get_company_or_404(company_id, current_user, db)
    service = CustomerService(db)
    # Fetch all customers with location for this company
    customers, _ = service.get_customers(company, page=1, page_size=10000)

    results = []
    for customer in customers:
        if customer.location_lat is None or customer.location_lng is None:
            continue
        distance_m = haversine_distance(
            latitude, longitude, customer.location_lat, customer.location_lng
        )
        if distance_m <= radius_km * 1000:
            results.append({
                "id": customer.id,
                "name": customer.name,
                "contact": customer.contact,
                "city": customer.billing_city,
                "state": customer.billing_state,
                "district": customer.district,
                "area": customer.area,
                "latitude": customer.location_lat,
                "longitude": customer.location_lng,
                "location_address": customer.location_address,
                "distance_km": round(distance_m / 1000, 2),
            })

    results.sort(key=lambda x: x["distance_km"])
    return results[:limit]


@router.post("/geocode-missing")
async def geocode_missing_customers(
    company_id: str,
    limit: int = Query(50, ge=1, le=500),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Geocode customers that are missing location_lat/lng."""
    company = get_company_or_404(company_id, current_user, db)
    service = CustomerService(db)

    customers, _ = service.get_customers(company, page=1, page_size=10000)
    updated = 0
    failed = 0
    total_missing = 0
    for customer in customers:
        if updated >= limit:
            break
        if customer.location_lat is not None and customer.location_lng is not None:
            continue
        total_missing += 1
        service._try_geocode(customer, customer)
        if customer.location_lat is not None and customer.location_lng is not None:
            updated += 1
        else:
            failed += 1

    db.commit()
    return {"updated": updated, "failed": failed, "missing_total": total_missing}


@router.get("/{customer_id}", response_model=CustomerResponse)
async def get_customer(
    company_id: str,
    customer_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get a customer by ID."""
    company = get_company_or_404(company_id, current_user, db)
    service = CustomerService(db)
    customer = service.get_customer(customer_id, company)
    
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found"
        )
    
    return CustomerResponse.model_validate(customer)


@router.put("/{customer_id}", response_model=CustomerResponse)
async def update_customer(
    company_id: str,
    customer_id: str,
    data: CustomerUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update a customer."""
    company = get_company_or_404(company_id, current_user, db)
    service = CustomerService(db)
    customer = service.get_customer(customer_id, company)
    
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found"
        )
    
    updated_customer = service.update_customer(customer, data)
    return CustomerResponse.model_validate(updated_customer)


@router.delete("/{customer_id}")
async def delete_customer(
    company_id: str,
    customer_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Delete a customer (soft delete)."""
    company = get_company_or_404(company_id, current_user, db)
    service = CustomerService(db)
    customer = service.get_customer(customer_id, company)
    
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found"
        )
    
    service.delete_customer(customer)
    return {"message": "Customer deleted successfully"}


# Export/Import routes
@router.post("/import")
async def import_customers(
    company_id: str,
    customers_data: List[dict],
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Import multiple customers."""
    company = get_company_or_404(company_id, current_user, db)
    service = CustomerService(db)
    
    imported = 0
    errors = []
    
    for idx, customer_data in enumerate(customers_data):
        try:
            # Convert to CustomerCreate schema
            customer_create = CustomerCreate(**customer_data)
            service.create_customer(company, customer_create)
            imported += 1
        except Exception as e:
            errors.append({
                "row": idx + 1,
                "error": str(e),
                "data": customer_data
            })
    
    return {
        "imported": imported,
        "errors": errors,
        "total": len(customers_data)
    }


@router.get("/export")
async def export_customers(
    company_id: str,
    format: str = Query("csv", pattern="^(csv|json|excel)$"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Export customers."""
    company = get_company_or_404(company_id, current_user, db)
    service = CustomerService(db)
    
    # Get all customers for the company
    customers, _ = service.get_customers(company, page=1, page_size=10000)
    
    # Format data based on requested format
    if format == "json":
        return [CustomerResponse.model_validate(c).dict() for c in customers]
    elif format == "csv":
        # Generate CSV
        import csv
        from io import StringIO
        
        output = StringIO()
        writer = csv.writer(output)
        
        # Write header
        writer.writerow([
            "Name", "Contact", "Email", "Mobile", "PAN Number", 
            "GST Number", "GST Type", "Vendor Code", "Opening Balance",
            "Opening Balance Type", "Credit Limit", "Credit Days",
            "Billing Address", "Billing City", "Billing State",
            "Billing Country", "Billing ZIP", "Shipping Address",
            "Shipping City", "Shipping State", "Shipping Country",
            "Shipping ZIP"
        ])
        
        # Write data
        for customer in customers:
            writer.writerow([
                customer.name,
                customer.contact,
                customer.email or "",
                customer.mobile or "",
                customer.pan_number or "",
                customer.tax_number or "",
                customer.gst_registration_type or "",
                customer.vendor_code or "",
                customer.opening_balance or 0,
                customer.opening_balance_type or "",
                customer.credit_limit or 0,
                customer.credit_days or 0,
                customer.billing_address or "",
                customer.billing_city or "",
                customer.billing_state or "",
                customer.billing_country or "",
                customer.billing_zip or "",
                customer.shipping_address or "",
                customer.shipping_city or "",
                customer.shipping_state or "",
                customer.shipping_country or "",
                customer.shipping_zip or ""
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
async def get_customers_summary(
    company_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get customers summary statistics."""
    company = get_company_or_404(company_id, current_user, db)
    service = CustomerService(db)
    
    total_customers = service.get_customer_count(company)
    total_outstanding = service.get_total_outstanding(company)
    total_advance = service.get_total_advance(company)
    recent_customers = service.get_recent_customers(company, limit=5)
    
    return {
        "total_customers": total_customers,
        "total_outstanding": total_outstanding,
        "total_advance": total_advance,
        "net_balance": total_outstanding - total_advance,
        "recent_customers": [
            CustomerResponse.model_validate(c).dict() for c in recent_customers
        ]
    }


@router.get("/statistics/by-state")
async def get_customers_by_state(
    company_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get customers grouped by state."""
    company = get_company_or_404(company_id, current_user, db)
    service = CustomerService(db)
    
    return service.get_customers_by_state(company)


@router.get("/statistics/top-customers")
async def get_top_customers(
    company_id: str,
    limit: int = Query(10, ge=1, le=50),
    period: str = Query("all", pattern="^(day|week|month|quarter|year|all)$"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get top customers by transaction volume/value."""
    company = get_company_or_404(company_id, current_user, db)
    service = CustomerService(db)
    
    return service.get_top_customers(company, limit, period)
