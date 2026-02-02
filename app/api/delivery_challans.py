"""Delivery Challan API endpoints."""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import Optional, List, Dict, Any
from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel, Field

from app.database.connection import get_db
from app.database.models import (
    User, Company, Customer, Invoice, DeliveryChallanType, DeliveryChallanStatus,
    DeliveryChallan
)
from app.auth.dependencies import get_current_active_user
from app.services.delivery_challan_service import DeliveryChallanService

router = APIRouter(tags=["Delivery Challans"])


def get_company_or_404(company_id: str, user: User, db: Session) -> Company:
    """Get company or raise 404."""
    company = db.query(Company).filter(
        Company.id == company_id,
        Company.user_id == user.id
    ).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    return company


# ==================== SCHEMAS ====================

class NextDCNumberResponse(BaseModel):
    """Response schema for next DC number."""
    next_number: str
    current_series: Optional[str] = None
    last_number: Optional[int] = None

class DeliveryAddress(BaseModel):
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None


class DCItemCreate(BaseModel):
    product_id: Optional[str] = None
    invoice_item_id: Optional[str] = None
    batch_id: Optional[str] = None
    description: Optional[str] = None
    hsn_code: Optional[str] = None
    quantity: float = Field(..., gt=0)
    unit: Optional[str] = "unit"
    unit_price: float = 0
    # New item fields
    discount_percent: float = 0
    gst_rate: float = 0
    taxable_amount: Optional[float] = None
    total_amount: Optional[float] = None
    godown_id: Optional[str] = None
    serial_numbers: Optional[List[str]] = None
    notes: Optional[str] = None


class DCOutCreate(BaseModel):
    # Required fields
    items: List[DCItemCreate]
    
    # Optional basic fields
    customer_id: Optional[str] = None
    invoice_id: Optional[str] = None
    quotation_id: Optional[str] = None
    sales_order_id: Optional[str] = None
    sales_ticket_id: Optional[str] = None
    contact_id: Optional[str] = None
    dc_date: Optional[datetime] = None
    from_godown_id: Optional[str] = None
    transporter_name: Optional[str] = None
    vehicle_number: Optional[str] = None
    eway_bill_number: Optional[str] = None
    delivery_address: Optional[DeliveryAddress] = None
    notes: Optional[str] = None
    auto_update_stock: bool = True
    reference_no: Optional[str] = None
    
    # New fields from frontend
    dc_number: Optional[str] = None
    status: str = "Open"
    custom_status: str = "Open"
    bill_title: Optional[str] = None
    bill_description: Optional[str] = None
    contact_person: Optional[str] = None
    expiry_date: Optional[datetime] = None
    salesman_id: Optional[str] = None
    
    # Charges and discounts
    subtotal: Optional[float] = None
    freight_charges: Optional[float] = None
    packing_forwarding_charges: Optional[float] = None
    discount_on_all: Optional[float] = None
    discount_type: str = "percentage"
    round_off: Optional[float] = None
    grand_total: Optional[float] = None


class DCInCreate(BaseModel):
    # Required fields
    items: List[DCItemCreate]
    
    # Optional basic fields
    customer_id: Optional[str] = None
    original_dc_id: Optional[str] = None
    invoice_id: Optional[str] = None
    sales_ticket_id: Optional[str] = None
    contact_id: Optional[str] = None
    dc_date: Optional[datetime] = None
    to_godown_id: Optional[str] = None
    return_reason: Optional[str] = None
    notes: Optional[str] = None
    auto_update_stock: bool = True
    reference_no: Optional[str] = None
    # New fields from frontend
    dc_number: Optional[str] = None
    status: str = "Open"
    custom_status: str = "Open"
    bill_title: Optional[str] = None
    bill_description: Optional[str] = None
    contact_person: Optional[str] = None
    expiry_date: Optional[datetime] = None
    salesman_id: Optional[str] = None
    
    # Charges and discounts
    subtotal: Optional[float] = None
    freight_charges: Optional[float] = None
    packing_forwarding_charges: Optional[float] = None
    discount_on_all: Optional[float] = None
    discount_type: str = "percentage"
    round_off: Optional[float] = None
    grand_total: Optional[float] = None


class CreateFromInvoiceRequest(BaseModel):
    from_godown_id: Optional[str] = None
    items: Optional[List[DCItemCreate]] = None
    partial_dispatch: bool = False
    # New fields
    dc_number: Optional[str] = None
    status: str = "Open"
    custom_status: str = "Open"
    reference_no: Optional[str] = None
    bill_title: Optional[str] = None
    bill_description: Optional[str] = None
    contact_person: Optional[str] = None
    expiry_date: Optional[datetime] = None
    salesman_id: Optional[str] = None
    # Charges and discounts
    subtotal: Optional[float] = None
    freight_charges: Optional[float] = None
    packing_forwarding_charges: Optional[float] = None
    discount_on_all: Optional[float] = None
    discount_type: str = "percentage"
    round_off: Optional[float] = None
    grand_total: Optional[float] = None


class LinkToInvoiceRequest(BaseModel):
    invoice_id: str


class MarkDispatchedRequest(BaseModel):
    pass


class MarkInTransitRequest(BaseModel):
    vehicle_number: Optional[str] = None
    lr_number: Optional[str] = None


class MarkDeliveredRequest(BaseModel):
    delivered_at: Optional[datetime] = None
    received_by: Optional[str] = None


class MarkReceivedRequest(BaseModel):
    """Request to mark DC In as received (inward)."""
    received_at: Optional[datetime] = None
    received_by: Optional[str] = None


class CancelRequest(BaseModel):
    reason: Optional[str] = None


class DCItemResponse(BaseModel):
    id: str
    product_id: Optional[str]
    invoice_item_id: Optional[str]
    batch_id: Optional[str]
    description: str
    hsn_code: Optional[str]
    quantity: float
    unit: str
    unit_price: float
    # New fields
    discount_percent: float
    discount_amount: float
    gst_rate: float
    cgst_rate: float
    sgst_rate: float
    igst_rate: float
    taxable_amount: float
    total_amount: float
    godown_id: Optional[str]
    serial_numbers: Optional[List[str]]
    notes: Optional[str]
    stock_movement_id: Optional[str]

    class Config:
        from_attributes = True


class DCResponse(BaseModel):
    id: str
    dc_number: str
    dc_date: datetime
    dc_type: str
    status: str
    custom_status: str
    customer_id: Optional[str]
    customer_name: Optional[str] = None
    reference_no: Optional[str] = None
    invoice_id: Optional[str]
    invoice_number: Optional[str] = None
    quotation_id: Optional[str]
    sales_order_id: Optional[str]
    sales_ticket_id: Optional[str]
    contact_id: Optional[str]
    original_dc_id: Optional[str]
    return_reason: Optional[str]
    from_godown_id: Optional[str]
    to_godown_id: Optional[str]
    transporter_name: Optional[str]
    vehicle_number: Optional[str]
    eway_bill_number: Optional[str]
    lr_number: Optional[str]
    # Delivery address
    delivery_to_address: Optional[str]
    delivery_to_city: Optional[str]
    delivery_to_state: Optional[str]
    delivery_to_pincode: Optional[str]
    # Dispatch address
    dispatch_from_address: Optional[str]
    dispatch_from_city: Optional[str]
    dispatch_from_state: Optional[str]
    dispatch_from_pincode: Optional[str]
    # New fields
    bill_title: Optional[str]
    bill_description: Optional[str]
    contact_person: Optional[str]
    expiry_date: Optional[datetime]
    salesman_id: Optional[str]
    # Stock management
    stock_updated: bool
    stock_updated_at: Optional[datetime]
    # Delivery info
    delivered_at: Optional[datetime]
    received_by: Optional[str]
    # Other
    notes: Optional[str]
    created_at: datetime
    updated_at: datetime
    items: Optional[List[DCItemResponse]] = None

    class Config:
        from_attributes = True


class DCListResponse(BaseModel):
    items: List[DCResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class PendingDispatchResponse(BaseModel):
    id: str
    invoice_number: str
    invoice_date: datetime
    customer_id: Optional[str]
    customer_name: Optional[str]
    total_amount: float


# ==================== ENDPOINTS ====================

@router.get("/companies/{company_id}/delivery-challans/next-number", response_model=NextDCNumberResponse)
async def get_next_dc_number(
    company_id: str,
    dc_type: Optional[str] = Query("dc_out", description="Type of DC: 'dc_out' or 'dc_in'"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get the next available delivery challan number.
    
    Generates DC numbers in format: DCO-YYYY-XXXX for DC Out and DCI-YYYY-XXXX for DC In
    Example: DCO-2024-0001, DCO-2024-0002, DCI-2024-0001, etc.
    """
    company = get_company_or_404(company_id, current_user, db)
    service = DeliveryChallanService(db)
    
    try:
        # Convert string to enum
        dc_type_enum = DeliveryChallanType(dc_type.upper()) if dc_type else DeliveryChallanType.DC_OUT
        
        # Get next number using service method
        next_dc_number = service._get_next_dc_number(company, dc_type_enum)
        
        # Extract series and last number
        if next_dc_number:
            parts = next_dc_number.split('-')
            if len(parts) >= 3:
                prefix = parts[0]
                current_series = f"{prefix}-{parts[1]}"
                last_number = int(parts[2]) - 1 if parts[2].isdigit() else 0
            else:
                current_series = next_dc_number[:-4]  # Remove last 4 digits
                last_number = 0
        else:
            current_series = f"{'DCO' if dc_type_enum == DeliveryChallanType.DC_OUT else 'DCI'}-{datetime.now().year}"
            last_number = 0
        
        return NextDCNumberResponse(
            next_number=next_dc_number,
            current_series=current_series,
            last_number=last_number
        )
        
    except Exception as e:
        # Fallback: Generate a simple timestamp-based number
        timestamp = int(datetime.now().timestamp())
        fallback_prefix = "DCO" if dc_type == "dc_out" else "DCI"
        current_year = datetime.now().year
        fallback_number = f"{fallback_prefix}-{current_year}-{timestamp % 10000:04d}"
        
        return NextDCNumberResponse(
            next_number=fallback_number,
            current_series=f"{fallback_prefix}-{current_year}",
            last_number=0
        )


@router.post("/companies/{company_id}/delivery-challans/dc-out", response_model=DCResponse)
async def create_dc_out(
    company_id: str,
    data: DCOutCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Create a DC Out (goods dispatch)."""
    company = get_company_or_404(company_id, current_user, db)
    service = DeliveryChallanService(db)
    
    try:
        # Convert items to dict format
        items = [item.model_dump() for item in data.items]
        delivery_address = data.delivery_address.model_dump() if data.delivery_address else None
        
        # Convert float to Decimal for service
        def convert_float_to_decimal(value: Optional[float]) -> Optional[Decimal]:
            if value is not None:
                return Decimal(str(value))
            return None
        
        # Create DC
        dc = service.create_dc_out(
            company=company,
            items=items,
            customer_id=data.customer_id,
            invoice_id=data.invoice_id,
            quotation_id=data.quotation_id,
            sales_order_id=data.sales_order_id,
            sales_ticket_id=data.sales_ticket_id,
            contact_id=data.contact_id,
            dc_date=data.dc_date,
            reference_no=data.reference_no, 
            from_godown_id=data.from_godown_id,
            transporter_name=data.transporter_name,
            vehicle_number=data.vehicle_number,
            eway_bill_number=data.eway_bill_number,
            delivery_address=delivery_address,
            notes=data.notes,
            auto_update_stock=data.auto_update_stock,
            # New fields
            dc_number=data.dc_number,
            status=data.status,
            custom_status=data.custom_status,
            bill_title=data.bill_title,
            bill_description=data.bill_description,
            contact_person=data.contact_person,
            expiry_date=data.expiry_date,
            salesman_id=data.salesman_id,
            # Charges and discounts
            subtotal=convert_float_to_decimal(data.subtotal),
            freight_charges=convert_float_to_decimal(data.freight_charges),
            packing_forwarding_charges=convert_float_to_decimal(data.packing_forwarding_charges),
            discount_on_all=convert_float_to_decimal(data.discount_on_all),
            discount_type=data.discount_type,
            round_off=convert_float_to_decimal(data.round_off),
            grand_total=convert_float_to_decimal(data.grand_total),
        )
        
        return _dc_to_response(dc, db)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/companies/{company_id}/delivery-challans/dc-in", response_model=DCResponse)
async def create_dc_in(
    company_id: str,
    data: DCInCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Create a DC In (goods return)."""
    company = get_company_or_404(company_id, current_user, db)
    service = DeliveryChallanService(db)
    
    try:
        # Convert items to dict format
        items = [item.model_dump() for item in data.items]
        
        # Convert float to Decimal for service
        def convert_float_to_decimal(value: Optional[float]) -> Optional[Decimal]:
            if value is not None:
                return Decimal(str(value))
            return None
        
        # Create DC
        dc = service.create_dc_in(
            company=company,
            items=items,
            customer_id=data.customer_id,
            original_dc_id=data.original_dc_id,
            invoice_id=data.invoice_id,
            sales_ticket_id=data.sales_ticket_id,
            contact_id=data.contact_id,
            dc_date=data.dc_date,
            reference_no=data.reference_no, 
            to_godown_id=data.to_godown_id,
            return_reason=data.return_reason,
            notes=data.notes,
            auto_update_stock=data.auto_update_stock,
            # New fields
            dc_number=data.dc_number,
            status=data.status,
            custom_status=data.custom_status,
            bill_title=data.bill_title,
            bill_description=data.bill_description,
            contact_person=data.contact_person,
            expiry_date=data.expiry_date,
            salesman_id=data.salesman_id,
            # Charges and discounts
            subtotal=convert_float_to_decimal(data.subtotal),
            freight_charges=convert_float_to_decimal(data.freight_charges),
            packing_forwarding_charges=convert_float_to_decimal(data.packing_forwarding_charges),
            discount_on_all=convert_float_to_decimal(data.discount_on_all),
            discount_type=data.discount_type,
            round_off=convert_float_to_decimal(data.round_off),
            grand_total=convert_float_to_decimal(data.grand_total),
        )
        
        return _dc_to_response(dc, db)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/companies/{company_id}/invoices/{invoice_id}/create-dc", response_model=DCResponse)
async def create_dc_from_invoice(
    company_id: str,
    invoice_id: str,
    data: CreateFromInvoiceRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Create a DC Out from an invoice."""
    get_company_or_404(company_id, current_user, db)
    service = DeliveryChallanService(db)
    
    invoice = db.query(Invoice).filter(
        Invoice.id == invoice_id,
        Invoice.company_id == company_id
    ).first()
    
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    try:
        # Convert items if provided
        items = None
        if data.items:
            items = [item.model_dump() for item in data.items]
        
        # Convert float to Decimal for service
        def convert_float_to_decimal(value: Optional[float]) -> Optional[Decimal]:
            if value is not None:
                return Decimal(str(value))
            return None
        
        # Create DC
        dc = service.create_dc_from_invoice(
            invoice=invoice,
            from_godown_id=data.from_godown_id,
            items=items,
            partial_dispatch=data.partial_dispatch,
            # New fields
            dc_number=data.dc_number,
            status=data.status,
            custom_status=data.custom_status,
            bill_title=data.bill_title,
            reference_no=data.reference_no, 
            bill_description=data.bill_description,
            contact_person=data.contact_person,
            expiry_date=data.expiry_date,
            salesman_id=data.salesman_id,
            # Charges and discounts
            subtotal=convert_float_to_decimal(data.subtotal),
            freight_charges=convert_float_to_decimal(data.freight_charges),
            packing_forwarding_charges=convert_float_to_decimal(data.packing_forwarding_charges),
            discount_on_all=convert_float_to_decimal(data.discount_on_all),
            discount_type=data.discount_type,
            round_off=convert_float_to_decimal(data.round_off),
            grand_total=convert_float_to_decimal(data.grand_total),
        )
        
        return _dc_to_response(dc, db)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/companies/{company_id}/delivery-challans", response_model=DCListResponse)
async def list_delivery_challans(
    company_id: str,
    dc_type: Optional[str] = None,
    status: Optional[str] = None,
    custom_status: Optional[str] = None,
    customer_id: Optional[str] = None,
    invoice_id: Optional[str] = None,
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """List delivery challans with filters."""
    get_company_or_404(company_id, current_user, db)
    service = DeliveryChallanService(db)
    
    # Parse enums
    dc_type_enum = None
    if dc_type:
        try:
            dc_type_enum = DeliveryChallanType(dc_type)
        except ValueError:
            pass
    
    status_enum = None
    if status:
        try:
            status_enum = DeliveryChallanStatus(status)
        except ValueError:
            pass
    
    # Parse dates
    from_dt = None
    if from_date:
        try:
            from_dt = datetime.fromisoformat(from_date).date()
        except ValueError:
            pass
    
    to_dt = None
    if to_date:
        try:
            to_dt = datetime.fromisoformat(to_date).date()
        except ValueError:
            pass
    
    result = service.list_delivery_challans(
        company_id=company_id,
        dc_type=dc_type_enum,
        status=status_enum,
        custom_status=custom_status,
        customer_id=customer_id,
        invoice_id=invoice_id,
        from_date=from_dt,
        to_date=to_dt,
        page=page,
        page_size=page_size,
    )
    
    return {
        "items": [_dc_to_response(dc, db, include_items=False) for dc in result["items"]],
        "total": result["total"],
        "page": result["page"],
        "page_size": result["page_size"],
        "total_pages": result["total_pages"],
    }


@router.get("/companies/{company_id}/delivery-challans/{dc_id}", response_model=DCResponse)
async def get_delivery_challan(
    company_id: str,
    dc_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get a single delivery challan by ID."""
    get_company_or_404(company_id, current_user, db)
    service = DeliveryChallanService(db)
    
    dc = service.get_delivery_challan(company_id, dc_id)
    if not dc:
        raise HTTPException(status_code=404, detail="Delivery challan not found")
    
    return _dc_to_response(dc, db)


@router.post("/companies/{company_id}/delivery-challans/{dc_id}/dispatch", response_model=DCResponse)
async def dispatch_dc(
    company_id: str,
    dc_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Mark DC as dispatched."""
    get_company_or_404(company_id, current_user, db)
    service = DeliveryChallanService(db)
    
    dc = service.get_delivery_challan(company_id, dc_id)
    if not dc:
        raise HTTPException(status_code=404, detail="Delivery challan not found")
    
    try:
        dc = service.mark_dispatched(dc)
        return _dc_to_response(dc, db)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/companies/{company_id}/delivery-challans/{dc_id}/in-transit", response_model=DCResponse)
async def mark_in_transit(
    company_id: str,
    dc_id: str,
    data: MarkInTransitRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Mark DC as in transit."""
    get_company_or_404(company_id, current_user, db)
    service = DeliveryChallanService(db)
    
    dc = service.get_delivery_challan(company_id, dc_id)
    if not dc:
        raise HTTPException(status_code=404, detail="Delivery challan not found")
    
    dc = service.mark_in_transit(dc, vehicle_number=data.vehicle_number, lr_number=data.lr_number)
    return _dc_to_response(dc, db)


@router.post("/companies/{company_id}/delivery-challans/{dc_id}/delivered", response_model=DCResponse)
async def mark_delivered(
    company_id: str,
    dc_id: str,
    data: MarkDeliveredRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Mark DC as delivered."""
    get_company_or_404(company_id, current_user, db)
    service = DeliveryChallanService(db)
    
    dc = service.get_delivery_challan(company_id, dc_id)
    if not dc:
        raise HTTPException(status_code=404, detail="Delivery challan not found")
    
    dc = service.mark_delivered(dc, delivered_at=data.delivered_at, received_by=data.received_by)
    return _dc_to_response(dc, db)


@router.post("/companies/{company_id}/delivery-challans/{dc_id}/received", response_model=DCResponse)
async def mark_received(
    company_id: str,
    dc_id: str,
    data: MarkReceivedRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Mark DC In as received (goods inward)."""
    get_company_or_404(company_id, current_user, db)
    service = DeliveryChallanService(db)
    
    dc = service.get_delivery_challan(company_id, dc_id)
    if not dc:
        raise HTTPException(status_code=404, detail="Delivery challan not found")
    
    try:
        dc = service.mark_received(dc, received_at=data.received_at, received_by=data.received_by)
        return _dc_to_response(dc, db)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/companies/{company_id}/delivery-challans/{dc_id}/link-invoice", response_model=DCResponse)
async def link_dc_to_invoice(
    company_id: str,
    dc_id: str,
    data: LinkToInvoiceRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Link a standalone DC to an invoice."""
    get_company_or_404(company_id, current_user, db)
    service = DeliveryChallanService(db)
    
    dc = service.get_delivery_challan(company_id, dc_id)
    if not dc:
        raise HTTPException(status_code=404, detail="Delivery challan not found")
    
    # Verify invoice exists
    invoice = db.query(Invoice).filter(
        Invoice.id == data.invoice_id,
        Invoice.company_id == company_id
    ).first()
    
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    dc = service.link_to_invoice(dc, data.invoice_id)
    return _dc_to_response(dc, db)


@router.post("/companies/{company_id}/delivery-challans/{dc_id}/cancel", response_model=DCResponse)
async def cancel_dc(
    company_id: str,
    dc_id: str,
    data: CancelRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Cancel a delivery challan."""
    get_company_or_404(company_id, current_user, db)
    service = DeliveryChallanService(db)
    
    dc = service.get_delivery_challan(company_id, dc_id)
    if not dc:
        raise HTTPException(status_code=404, detail="Delivery challan not found")
    
    try:
        dc = service.cancel_dc(dc, reason=data.reason)
        return _dc_to_response(dc, db)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/companies/{company_id}/delivery-challans/{dc_id}/create-return", response_model=DCResponse)
async def create_return_dc(
    company_id: str,
    dc_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Create a DC In (return) from an existing DC Out."""
    company = get_company_or_404(company_id, current_user, db)
    service = DeliveryChallanService(db)
    
    # Get the original DC Out
    original_dc = service.get_delivery_challan(company_id, dc_id)
    if not original_dc:
        raise HTTPException(status_code=404, detail="Delivery challan not found")
    
    if original_dc.dc_type != DeliveryChallanType.DC_OUT:
        raise HTTPException(status_code=400, detail="Can only create returns from DC Out")
    
    # Check if DC is in a valid status for returns
    valid_statuses = [DeliveryChallanStatus.DISPATCHED, DeliveryChallanStatus.IN_TRANSIT, 
                     DeliveryChallanStatus.DELIVERED]
    if original_dc.status not in valid_statuses:
        raise HTTPException(
            status_code=400, 
            detail=f"Can only create returns from DCs in status: {', '.join([s.value for s in valid_statuses])}"
        )
    
    # Copy items from original DC
    items = []
    if original_dc.items:
        for item in original_dc.items:
            items.append({
                "product_id": item.product_id,
                "description": item.description,
                "hsn_code": item.hsn_code,
                "quantity": float(item.quantity),
                "unit": item.unit,
                "unit_price": float(item.unit_price) if item.unit_price else 0,
                "discount_percent": float(item.discount_percent) if hasattr(item, 'discount_percent') else 0,
                "gst_rate": float(item.gst_rate) if hasattr(item, 'gst_rate') else 0,
                "godown_id": item.godown_id,
                "batch_id": item.batch_id,
            })
    
    try:
        dc_in = service.create_dc_in(
            company=company,
            items=items,
            customer_id=original_dc.customer_id,
            original_dc_id=original_dc.id,
            invoice_id=original_dc.invoice_id,
            sales_ticket_id=original_dc.sales_ticket_id,
            contact_id=original_dc.contact_id,
            to_godown_id=original_dc.from_godown_id,  # Return to original godown
            return_reason="Return from " + original_dc.dc_number,
            auto_update_stock=False,  # Stock updated when marked as received
        )
        
        return _dc_to_response(dc_in, db)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/companies/{company_id}/delivery-challans/{dc_id}")
async def delete_dc(
    company_id: str,
    dc_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Delete a delivery challan (only DRAFT status)."""
    get_company_or_404(company_id, current_user, db)
    service = DeliveryChallanService(db)
    
    dc = service.get_delivery_challan(company_id, dc_id)
    if not dc:
        raise HTTPException(status_code=404, detail="Delivery challan not found")
    
    try:
        service.delete_dc(dc)
        return {"message": "Delivery challan deleted successfully"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/companies/{company_id}/pending-dispatches", response_model=List[PendingDispatchResponse])
async def get_pending_dispatches(
    company_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get invoices that don't have associated DCs yet."""
    get_company_or_404(company_id, current_user, db)
    service = DeliveryChallanService(db)
    
    invoices = service.get_pending_dispatches(company_id)
    
    result = []
    for inv in invoices:
        customer_name = None
        if inv.customer_id:
            customer = db.query(Customer).filter(Customer.id == inv.customer_id).first()
            if customer:
                customer_name = customer.name
        
        result.append({
            "id": inv.id,
            "invoice_number": inv.invoice_number,
            "invoice_date": inv.invoice_date,
            "customer_id": inv.customer_id,
            "customer_name": customer_name,
            "total_amount": float(inv.total_amount or 0),
        })
    
    return result


@router.get("/companies/{company_id}/invoices/{invoice_id}/delivery-challans", response_model=List[DCResponse])
async def get_dcs_for_invoice(
    company_id: str,
    invoice_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get all DCs linked to an invoice."""
    get_company_or_404(company_id, current_user, db)
    service = DeliveryChallanService(db)
    
    dcs = service.get_dcs_for_invoice(invoice_id)
    return [_dc_to_response(dc, db, include_items=False) for dc in dcs]


@router.post("/companies/{company_id}/delivery-challans/{dc_id}/update-stock", response_model=DCResponse)
async def update_stock_for_dc(
    company_id: str,
    dc_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Manually trigger stock update for a delivery challan."""
    get_company_or_404(company_id, current_user, db)
    service = DeliveryChallanService(db)
    
    dc = service.get_delivery_challan(company_id, dc_id)
    if not dc:
        raise HTTPException(status_code=404, detail="Delivery challan not found")
    
    if dc.stock_updated:
        raise HTTPException(status_code=400, detail="Stock already updated for this DC")
    
    try:
        service.update_stock_for_dc(dc)
        return _dc_to_response(dc, db)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ==================== HELPER FUNCTIONS ====================

def _dc_to_response(dc: DeliveryChallan, db: Session, include_items: bool = True) -> dict:
    """Convert delivery challan model to response dict."""
    # Get customer name
    customer_name = None
    if dc.customer_id:
        customer = db.query(Customer).filter(Customer.id == dc.customer_id).first()
        if customer:
            customer_name = customer.name
    
    # Get invoice number
    invoice_number = None
    if dc.invoice_id:
        invoice = db.query(Invoice).filter(Invoice.id == dc.invoice_id).first()
        if invoice:
            invoice_number = invoice.invoice_number
    
    # Get contact person name
    contact_person_name = None
    if dc.contact_id:
        from app.database.models import Contact
        contact = db.query(Contact).filter(Contact.id == dc.contact_id).first()
        if contact:
            contact_person_name = contact.name
    
    # Build response
    response = {
        "id": dc.id,
        "dc_number": dc.dc_number,
        "dc_date": dc.dc_date,
        "dc_type": dc.dc_type.value if dc.dc_type else "dc_out",
        "status": dc.status.value if dc.status else "draft",
        "custom_status": dc.custom_status or "Open",
        "customer_id": dc.customer_id,
        "customer_name": customer_name,
        "invoice_id": dc.invoice_id,
        "invoice_number": invoice_number,
        "quotation_id": dc.quotation_id,
        "sales_order_id": dc.sales_order_id,
        "sales_ticket_id": dc.sales_ticket_id,
        "contact_id": dc.contact_id,
       "reference_no": dc.reference_no, 
        "original_dc_id": dc.original_dc_id,
        "return_reason": dc.return_reason,
        "from_godown_id": dc.from_godown_id,
        "to_godown_id": dc.to_godown_id,
        "transporter_name": dc.transporter_name,
        "vehicle_number": dc.vehicle_number,
        "eway_bill_number": dc.eway_bill_number,
        "lr_number": dc.lr_number,
        # Delivery address
        "delivery_to_address": dc.delivery_to_address,
        "delivery_to_city": dc.delivery_to_city,
        "delivery_to_state": dc.delivery_to_state,
        "delivery_to_pincode": dc.delivery_to_pincode,
        # Dispatch address
        "dispatch_from_address": dc.dispatch_from_address,
        "dispatch_from_city": dc.dispatch_from_city,
        "dispatch_from_state": dc.dispatch_from_state,
        "dispatch_from_pincode": dc.dispatch_from_pincode,
        # New fields
        "bill_title": dc.bill_title,
        "bill_description": dc.bill_description,
        "contact_person": contact_person_name,
        "expiry_date": dc.expiry_date,
        "salesman_id": dc.salesman_id,
        # Stock management
        "stock_updated": dc.stock_updated or False,
        "stock_updated_at": dc.stock_updated_at,
        # Delivery info
        "delivered_at": dc.delivered_at,
        "received_by": dc.received_by,
        # Other
        "notes": dc.notes,
        "created_at": dc.created_at,
        "updated_at": dc.updated_at,
    }
    
    if include_items and dc.items:
        response["items"] = [
            {
                "id": item.id,
                "product_id": item.product_id,
                "invoice_item_id": item.invoice_item_id,
                "batch_id": item.batch_id,
                "description": item.description,
                "hsn_code": item.hsn_code,
                "quantity": float(item.quantity),
                "unit": item.unit,
                "unit_price": float(item.unit_price or 0),
                # New fields
                "discount_percent": float(item.discount_percent or 0),
                "discount_amount": float(item.discount_amount or 0),
                "gst_rate": float(item.gst_rate or 0),
                "cgst_rate": float(item.cgst_rate or 0),
                "sgst_rate": float(item.sgst_rate or 0),
                "igst_rate": float(item.igst_rate or 0),
                "taxable_amount": float(item.taxable_amount or 0),
                "total_amount": float(item.total_amount or 0),
                "godown_id": item.godown_id,
                "serial_numbers": item.serial_numbers,
                "notes": item.notes,
                "stock_movement_id": item.stock_movement_id,
            }
            for item in dc.items
        ]
    
    return response