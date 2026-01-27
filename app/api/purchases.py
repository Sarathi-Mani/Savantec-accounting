"""Purchase API routes - Handles all purchase types."""
from fastapi import APIRouter, Depends, HTTPException, status, Query, Body,Path
from sqlalchemy.orm import Session
from typing import Optional, List, Dict, Any
from datetime import date, datetime
from decimal import Decimal
from pydantic import BaseModel, Field, validator

from app.database.connection import get_db
from app.database.models import User, Company, PurchaseType, PurchaseInvoiceStatus
from app.services.purchase_service import PurchaseService
from app.services.company_service import CompanyService
from app.services.vendor_service import VendorService
from app.auth.dependencies import get_current_active_user

router = APIRouter(prefix="/api/purchases", tags=["Purchases"])


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


# ==================== SCHEMAS ====================

class PurchaseItemCreate(BaseModel):
    """Schema for creating a regular purchase item."""
    product_id: Optional[str] = None
    description: str = Field(..., max_length=500)
    item_code: Optional[str] = Field(None, max_length=100)
    hsn_code: Optional[str] = Field(None, max_length=8)
    quantity: float = Field(1.0, gt=0)
    unit: str = Field("unit", max_length=20)
    purchase_price: float = Field(0.0, ge=0)
    discount_percent: float = Field(0.0, ge=0, le=100)
    gst_rate: float = Field(18.0, ge=0, le=100)

    @validator('quantity', 'purchase_price', 'discount_percent', 'gst_rate')
    def validate_numeric(cls, v):
        """Ensure numeric values are valid."""
        if v < 0:
            raise ValueError("Value must be non-negative")
        return v


class PurchaseImportItemCreate(BaseModel):
    """Schema for creating import items."""
    name: str = Field(..., max_length=500)
    quantity: float = Field(1.0, gt=0)
    rate: float = Field(0.0, ge=0)
    per: str = Field("unit", max_length=20)
    discount_percent: float = Field(0.0, ge=0, le=100)


class PurchaseExpenseItemCreate(BaseModel):
    """Schema for creating expense items."""
    particulars: str = Field(..., max_length=500)
    rate: float = Field(0.0, ge=0)
    per: str = Field("unit", max_length=20)


class PurchasePaymentCreate(BaseModel):
    """Schema for creating a payment."""
    amount: float = Field(..., gt=0)
    payment_type: str = Field(..., max_length=50)
    account: Optional[str] = Field(None, max_length=100)
    payment_note: Optional[str] = Field(None, max_length=500)
    reference_number: Optional[str] = Field(None, max_length=100)


class PurchaseCreate(BaseModel):
    """Schema for creating a purchase (all types)."""
    # Required fields
    vendor_id: str
    purchase_type: str = Field("purchase", max_length=20)
    
    # Invoice details
    purchase_date: datetime = Field(default_factory=datetime.utcnow)
    due_date: Optional[datetime] = None
    reference_no: Optional[str] = Field(None, max_length=100)
    vendor_invoice_number: Optional[str] = Field(None, max_length=100)
    vendor_invoice_date: Optional[datetime] = None
    payment_type: Optional[str] = Field(None, max_length=50)
    
    # Items
    items: List[PurchaseItemCreate] = Field(default_factory=list)
    import_items: Optional[List[PurchaseImportItemCreate]] = None
    expense_items: Optional[List[PurchaseExpenseItemCreate]] = None
    
    # Charges and discounts
    freight_charges: float = Field(0.0, ge=0)
    freight_type: str = Field("fixed", max_length=20)
    pf_charges: float = Field(0.0, ge=0)
    pf_type: str = Field("fixed", max_length=20)
    discount_on_all: float = Field(0.0, ge=0)
    discount_type: str = Field("percentage", max_length=20)
    round_off: float = Field(0.0)
    
    # Additional info
    notes: Optional[str] = None
    terms: Optional[str] = None
    shipping_address: Optional[str] = None
    billing_address: Optional[str] = None
    contact_person: Optional[str] = Field(None, max_length=200)
    contact_phone: Optional[str] = Field(None, max_length=20)
    contact_email: Optional[str] = Field(None, max_length=255)
    
    # Payment
    payment: Optional[PurchasePaymentCreate] = None
    
    @validator('purchase_type')
    def validate_purchase_type(cls, v):
        """Validate purchase type."""
        valid_types = ["purchase", "purchase-import", "purchase-expenses"]
        if v not in valid_types:
            raise ValueError(f"Purchase type must be one of {valid_types}")
        return v
    
    @validator('items')
    def validate_items(cls, v, values):
        """Validate items based on purchase type."""
        purchase_type = values.get('purchase_type', 'purchase')
        
        if purchase_type == "purchase-expenses" and v:
            raise ValueError("Regular items not allowed for purchase-expenses type")
        
        if purchase_type in ["purchase", "purchase-import"] and not v:
            raise ValueError("Regular items are required for purchase and purchase-import types")
        
        return v
    
    @validator('import_items')
    def validate_import_items(cls, v, values):
        """Validate import items."""
        purchase_type = values.get('purchase_type', 'purchase')
        
        if purchase_type == "purchase-expenses" and v:
            raise ValueError("Import items not allowed for purchase-expenses type")
        
        return v
    
    @validator('expense_items')
    def validate_expense_items(cls, v, values):
        """Validate expense items."""
        purchase_type = values.get('purchase_type', 'purchase')
        
        if purchase_type != "purchase-expenses" and v:
            raise ValueError("Expense items only allowed for purchase-expenses type")
        
        if purchase_type == "purchase-expenses" and (not v or len(v) == 0):
            raise ValueError("Expense items are required for purchase-expenses type")
        
        return v


class PurchaseItemResponse(BaseModel):
    """Schema for purchase item response."""
    id: str
    product_id: Optional[str]
    description: str
    item_code: Optional[str]
    hsn_code: Optional[str]
    quantity: float
    unit: str
    rate: Decimal = Decimal("0") 
    purchase_price: float
    discount_percent: float
    discount_amount: float
    gst_rate: float
    cgst_rate: float
    sgst_rate: float
    igst_rate: float
    tax_amount: float
    unit_cost: float
    total_amount: float
    created_at: datetime

    class Config:
        from_attributes = True


class PurchaseImportItemResponse(BaseModel):
    """Schema for import item response."""
    id: str
    name: str
    quantity: float
    rate: float
    per: str
    discount_percent: float
    amount: float
    created_at: datetime

    class Config:
        from_attributes = True


class PurchaseExpenseItemResponse(BaseModel):
    """Schema for expense item response."""
    id: str
    particulars: str
    rate: float
    per: str
    amount: float
    created_at: datetime

    class Config:
        from_attributes = True


class PurchasePaymentResponse(BaseModel):
    """Schema for payment response."""
    id: str
    amount: float
    payment_type: str
    account: Optional[str]
    payment_note: Optional[str]
    reference_number: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class PurchaseResponse(BaseModel):
    """Schema for purchase response."""
    id: str
    company_id: str
    vendor_id: str
    vendor_name: Optional[str]
    purchase_type: str
    purchase_number: str
    reference_no: Optional[str]
    vendor_invoice_number: Optional[str]
    invoice_date: datetime
    vendor_invoice_date: Optional[datetime]
    due_date: Optional[datetime]
    payment_type: Optional[str]
    
    # Charges
    freight_charges: float
    freight_type: str
    packing_forwarding_charges: float
    pf_type: str
    discount_on_all: float
    discount_type: str
    round_off: float
    
    # Totals
    subtotal: float
    discount_amount: float
    total_tax: float
    total_amount: float
    grand_total: float
    amount_paid: float
    balance_due: float
    
    # Contact info
    contact_person: Optional[str]
    contact_phone: Optional[str]
    contact_email: Optional[str]
    shipping_address: Optional[str]
    billing_address: Optional[str]
    
    # Additional
    notes: Optional[str]
    terms: Optional[str]
    status: str
    
    # Items
    items: List[PurchaseItemResponse] = []
    import_items: List[PurchaseImportItemResponse] = []
    expense_items: List[PurchaseExpenseItemResponse] = []
    payments: List[PurchasePaymentResponse] = []
    
    # Timestamps
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class PurchaseListResponse(BaseModel):
    """Schema for paginated purchase list."""
    items: List[PurchaseResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class PurchaseUpdate(BaseModel):
    """Schema for updating a purchase."""
    vendor_id: Optional[str] = None
    purchase_type: Optional[str] = None
    due_date: Optional[datetime] = None
    reference_no: Optional[str] = None
    vendor_invoice_number: Optional[str] = None
    vendor_invoice_date: Optional[datetime] = None
    payment_type: Optional[str] = None
    
    # Charges
    freight_charges: Optional[float] = None
    freight_type: Optional[str] = None
    pf_charges: Optional[float] = None
    pf_type: Optional[str] = None
    discount_on_all: Optional[float] = None
    discount_type: Optional[str] = None
    round_off: Optional[float] = None
    
    # Contact info
    contact_person: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None
    shipping_address: Optional[str] = None
    billing_address: Optional[str] = None
    
    # Additional
    notes: Optional[str] = None
    terms: Optional[str] = None
    status: Optional[str] = None


class PurchaseSummaryResponse(BaseModel):
    """Schema for purchase summary."""
    total_purchases: int
    total_amount: float
    total_paid: float
    total_due: float
    by_type: Dict[str, Dict[str, Any]]
    monthly_trend: Dict[str, float]


# ==================== PURCHASE ENDPOINTS ====================
@router.post("", response_model=PurchaseResponse, status_code=status.HTTP_201_CREATED)
async def create_purchase(
    company_id: str = Query(..., description="Company ID"),
    data: PurchaseCreate = Body(...),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Create a new purchase (all types).
    
    Supports three purchase types:
    - purchase: Regular purchase with items
    - purchase-import: Purchase with import items
    - purchase-expenses: Expense-only purchase
    """
    print("=" * 80)
    print("🚀 PURCHASE API: create_purchase() CALLED")
    print("=" * 80)
    
    print(f"📥 REQUEST DETAILS:")
    print(f"   Company ID: {company_id}")
    print(f"   User: {current_user.email} (ID: {current_user.id})")
    print(f"   Purchase Type: {data.purchase_type}")
    print(f"   Vendor ID: {data.vendor_id}")
    print(f"   Purchase Date: {data.purchase_date}")
    
    # ============================================
    # STEP 1: VALIDATE COMPANY
    # ============================================
    print("\n🏢 STEP 1: Validating company")
    company = get_company_or_404(company_id, current_user, db)
    print(f"✅ Company validated: {company.name} (ID: {company.id})")
    
    # ============================================
    # STEP 2: VALIDATE VENDOR
    # ============================================
    print("\n🏪 STEP 2: Validating vendor")
    vendor_service = VendorService(db)
    vendor = vendor_service.get_vendor(data.vendor_id, company)
    if not vendor:
        print("❌ Vendor not found")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vendor not found"
        )
    print(f"✅ Vendor validated: {vendor.name or vendor.vendor_code} (ID: {vendor.id})")

    # ============================================
    # STEP 3: PREPARE DATA FOR SERVICE
    # ============================================
    print("\n📝 STEP 3: Preparing data for service")
    
    # Convert data for service
    items = [item.model_dump() for item in data.items]
    import_items = [item.model_dump() for item in data.import_items] if data.import_items else None
    expense_items = [item.model_dump() for item in data.expense_items] if data.expense_items else None
    payment_data = data.payment.model_dump() if data.payment else None
    
    print(f"   Items: {len(items)} regular items")
    if import_items:
        print(f"   Import Items: {len(import_items)} import items")
    if expense_items:
        print(f"   Expense Items: {len(expense_items)} expense items")
    if payment_data:
        print(f"   Payment: Yes (amount: {payment_data.get('amount')})")
    else:
        print(f"   Payment: No")
    
    # Prepare additional data
    additional_data = {
        "reference_no": data.reference_no,
        "vendor_invoice_number": data.vendor_invoice_number,
        "invoice_date": data.purchase_date,
        "vendor_invoice_date": data.vendor_invoice_date,
        "due_date": data.due_date,
        "payment_type": data.payment_type,
        "notes": data.notes,
        "terms": data.terms,
        "freight_charges": data.freight_charges,
        "freight_type": data.freight_type,
        "packing_forwarding_charges": data.pf_charges,
        "pf_type": data.pf_type,
        "discount_on_all": data.discount_on_all,
        "discount_type": data.discount_type,
        "round_off": data.round_off,
        "shipping_address": data.shipping_address,
        "billing_address": data.billing_address,
        "contact_person": data.contact_person,
        "contact_phone": data.contact_phone,
        "contact_email": data.contact_email,
    }
    
    print("\n   Additional Data Fields:")
    for key, value in additional_data.items():
        if value:  # Only show non-empty values
            print(f"     {key}: {value}")
    
    # ============================================
    # STEP 4: CALL SERVICE
    # ============================================
    print("\n⚙️ STEP 4: Calling purchase service")
    purchase_service = PurchaseService(db)
    
    try:
        print("⏳ Creating purchase...")
        purchase = purchase_service.create_purchase(
            company_id=company.id,
            user_id=current_user.id,
            vendor_id=data.vendor_id,
            purchase_type=data.purchase_type,
            items=items,
            import_items=import_items,
            expense_items=expense_items,
            payment_data=payment_data,
            **additional_data
        )
        
        print(f"✅ Purchase created successfully!")
        print(f"   Purchase Number: {purchase.purchase_number}")
        print(f"   Total Amount: {purchase.total_amount}")
        
    except ValueError as e:
        print(f"❌ Validation error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        print(f"❌ Unexpected error: {str(e)}")
        import traceback
        print(f"Stack trace:\n{traceback.format_exc()}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create purchase: {str(e)}"
        )
    
    # ============================================
    # STEP 5: BUILD RESPONSE
    # ============================================
    print("\n📤 STEP 5: Building response")
    response = _build_purchase_response(purchase)
    
    print("=" * 80)
    print("🎉 PURCHASE API: COMPLETED SUCCESSFULLY")
    print("=" * 80)
    
    return response



@router.get("", response_model=PurchaseListResponse)
async def list_purchases(
    company_id: str = Query(..., description="Company ID"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    purchase_type: Optional[str] = Query(None, description="Filter by purchase type"),
    vendor_id: Optional[str] = Query(None, description="Filter by vendor"),
    status: Optional[str] = Query(None, description="Filter by status"),
    from_date: Optional[datetime] = Query(None, description="Filter from date"),
    to_date: Optional[datetime] = Query(None, description="Filter to date"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """List purchases with filters."""
    company = get_company_or_404(company_id, current_user, db)
    
    purchase_service = PurchaseService(db)
    
    # Validate purchase type
    if purchase_type:
        valid_types = ["purchase", "purchase-import", "purchase-expenses"]
        if purchase_type not in valid_types:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid purchase type. Must be one of: {valid_types}"
            )
    
    # Validate status
    if status:
        valid_statuses = ["draft", "approved", "partially_paid", "paid", "cancelled"]
        if status not in valid_statuses:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid status. Must be one of: {valid_statuses}"
            )
    
    purchases, total = purchase_service.get_purchases(
        company_id=company.id,
        purchase_type=purchase_type,
        vendor_id=vendor_id,
        status=status,
        from_date=from_date,
        to_date=to_date,
        page=page,
        page_size=page_size
    )
    
    items = [_build_purchase_response(purchase) for purchase in purchases]
    total_pages = (total + page_size - 1) // page_size if page_size > 0 else 1
    
    return PurchaseListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get("/{purchase_id}", response_model=PurchaseResponse)
async def get_purchase(
    company_id: str = Query(..., description="Company ID"),
    purchase_id: str = Path(..., description="Purchase ID"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get a purchase by ID."""
    company = get_company_or_404(company_id, current_user, db)
    
    purchase_service = PurchaseService(db)
    purchase = purchase_service.get_purchase(purchase_id, company.id)
    
    if not purchase:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Purchase not found"
        )
    
    return _build_purchase_response(purchase)


@router.put("/{purchase_id}", response_model=PurchaseResponse)
async def update_purchase(
    company_id: str = Query(..., description="Company ID"),
    purchase_id: str = Path(..., description="Purchase ID"),
    data: PurchaseUpdate = Body(...),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update a purchase."""
    company = get_company_or_404(company_id, current_user, db)
    
    purchase_service = PurchaseService(db)
    
    # Validate vendor if being updated
    if data.vendor_id:
        vendor_service = VendorService(db)
        vendor = vendor_service.get_vendor(data.vendor_id, company)
        if not vendor:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Vendor not found"
            )
    
    # Prepare update data
    update_data = data.model_dump(exclude_unset=True)
    
    # Convert status to enum if provided
    if "status" in update_data:
        try:
            update_data["status"] = PurchaseInvoiceStatus(update_data["status"])
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid status: {update_data['status']}"
            )
    
    purchase = purchase_service.update_purchase(purchase_id, company.id, update_data)
    
    if not purchase:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Purchase not found or could not be updated"
        )
    
    return _build_purchase_response(purchase)


@router.delete("/{purchase_id}", status_code=status.HTTP_200_OK)
async def delete_purchase(
    company_id: str = Query(..., description="Company ID"),
    purchase_id: str = Path(..., description="Purchase ID"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Delete (soft delete) a purchase."""
    company = get_company_or_404(company_id, current_user, db)
    
    purchase_service = PurchaseService(db)
    success = purchase_service.delete_purchase(purchase_id, company.id)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Purchase not found"
        )
    
    return {"message": "Purchase deleted successfully"}


@router.post("/{purchase_id}/payments", response_model=PurchasePaymentResponse)
async def add_payment_to_purchase(
    company_id: str = Query(..., description="Company ID"),
    purchase_id: str = Path(..., description="Purchase ID"),
    data: PurchasePaymentCreate = Body(...),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Add payment to a purchase."""
    company = get_company_or_404(company_id, current_user, db)
    
    purchase_service = PurchaseService(db)
    purchase = purchase_service.get_purchase(purchase_id, company.id)
    
    if not purchase:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Purchase not found"
        )
    
    payment_data = data.model_dump()
    
    try:
        payment = purchase_service.add_payment_to_purchase(
            purchase_id=purchase.id,
            company_id=company.id,
            user_id=current_user.id,
            payment_data=payment_data
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    
    if not payment:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to add payment"
        )
    
    return PurchasePaymentResponse(
        id=payment.id,
        amount=float(payment.amount),
        payment_type=payment.payment_type,
        account=payment.account,
        payment_note=payment.payment_note,
        reference_number=payment.reference_number,
        created_at=payment.created_at,
    )


@router.get("/{purchase_id}/summary")
async def get_purchase_summary(
    company_id: str = Query(..., description="Company ID"),
    purchase_id: str = Path(..., description="Purchase ID"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get detailed summary for a specific purchase."""
    company = get_company_or_404(company_id, current_user, db)
    
    purchase_service = PurchaseService(db)
    purchase = purchase_service.get_purchase(purchase_id, company.id)
    
    if not purchase:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Purchase not found"
        )
    
    # Calculate item totals
    regular_items_total = sum(item.total_amount for item in purchase.items)
    import_items_total = sum(item.amount for item in purchase.import_items)
    expense_items_total = sum(item.amount for item in purchase.expense_items)
    
    # Calculate taxes
    total_tax = purchase.total_tax or 0
    
    # Calculate charges
    total_charges = (purchase.freight_charges or 0) + (purchase.packing_forwarding_charges or 0)
    
    # Calculate discounts
    item_discounts = sum(item.discount_amount for item in purchase.items)
    total_discounts = item_discounts + (purchase.discount_amount or 0)
    
    return {
        "purchase_number": purchase.purchase_number,
        "vendor_name": purchase.vendor.name if purchase.vendor else "Unknown",
        "status": purchase.status,
        "purchase_date": purchase.created_at,
        
        # Totals by item type
        "regular_items_total": float(regular_items_total),
        "import_items_total": float(import_items_total),
        "expense_items_total": float(expense_items_total),
        
        # Financial summary
        "subtotal": float(purchase.subtotal or 0),
        "total_tax": float(total_tax),
        "total_charges": float(total_charges),
        "total_discounts": float(total_discounts),
        "round_off": float(purchase.round_off or 0),
        "grand_total": float(purchase.grand_total or 0),
        
        # Payment summary
        "amount_paid": float(purchase.amount_paid or 0),
        "balance_due": float(purchase.balance_due or 0),
        "payment_status": "Paid" if purchase.balance_due == 0 else "Partial" if purchase.amount_paid > 0 else "Unpaid",
        
        # Counts
        "regular_items_count": len(purchase.items),
        "import_items_count": len(purchase.import_items),
        "expense_items_count": len(purchase.expense_items),
        "payments_count": len(purchase.payments),
        
        # Additional info
        "purchase_type": purchase.purchase_type,
        "contact_person": purchase.contact_person,
        "contact_phone": purchase.contact_phone,
    }


@router.get("/reports/summary", response_model=PurchaseSummaryResponse)
async def get_purchases_summary(
    company_id: str = Query(..., description="Company ID"),
    from_date: Optional[datetime] = Query(None, description="Start date for summary"),
    to_date: Optional[datetime] = Query(None, description="End date for summary"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get summary of all purchases for dashboard."""
    company = get_company_or_404(company_id, current_user, db)
    
    purchase_service = PurchaseService(db)
    summary = purchase_service.get_purchase_summary(
        company_id=company.id,
        from_date=from_date,
        to_date=to_date
    )
    
    return PurchaseSummaryResponse(**summary)


@router.get("/reports/by-vendor")
async def get_purchases_by_vendor(
    company_id: str = Query(..., description="Company ID"),
    from_date: Optional[datetime] = Query(None, description="Start date"),
    to_date: Optional[datetime] = Query(None, description="End date"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get purchase summary grouped by vendor."""
    company = get_company_or_404(company_id, current_user, db)
    
    purchase_service = PurchaseService(db)
    purchases, _ = purchase_service.get_purchases(
        company_id=company.id,
        from_date=from_date,
        to_date=to_date,
        page=1,
        page_size=1000  # Get all for reporting
    )
    
    # Group by vendor
    vendor_summary = {}
    for purchase in purchases:
        vendor_id = purchase.vendor_id
        vendor_name = purchase.vendor.name if purchase.vendor else "Unknown"
        
        if vendor_id not in vendor_summary:
            vendor_summary[vendor_id] = {
                "vendor_name": vendor_name,
                "total_purchases": 0,
                "total_amount": Decimal("0"),
                "amount_paid": Decimal("0"),
                "balance_due": Decimal("0"),
                "purchase_count": 0
            }
        
        summary = vendor_summary[vendor_id]
        summary["total_purchases"] += 1
        summary["total_amount"] += purchase.total_amount or Decimal("0")
        summary["amount_paid"] += purchase.amount_paid or Decimal("0")
        summary["balance_due"] += purchase.balance_due or Decimal("0")
        summary["purchase_count"] += 1
    
    # Convert to list and format
    result = []
    for vendor_id, data in vendor_summary.items():
        result.append({
            "vendor_id": vendor_id,
            "vendor_name": data["vendor_name"],
            "total_purchases": data["total_purchases"],
            "total_amount": float(data["total_amount"]),
            "amount_paid": float(data["amount_paid"]),
            "balance_due": float(data["balance_due"]),
            "purchase_count": data["purchase_count"],
            "average_purchase": float(data["total_amount"] / data["purchase_count"]) if data["purchase_count"] > 0 else 0
        })
    
    # Sort by total amount descending
    result.sort(key=lambda x: x["total_amount"], reverse=True)
    
    return {
        "period": {
            "from_date": from_date.isoformat() if from_date else None,
            "to_date": to_date.isoformat() if to_date else None
        },
        "total_vendors": len(result),
        "summary": result
    }


# ==================== HELPER FUNCTIONS ====================

def _build_purchase_response(purchase) -> PurchaseResponse:
    """Build purchase response with all related data."""
    
    print(f"🔧 Building response for purchase {purchase.purchase_number}")
    
    try:
        # Convert items
        items = [
            PurchaseItemResponse(
                id=item.id,
                product_id=item.product_id,
                description=item.description,
                item_code=item.item_code,
                hsn_code=item.hsn_code,
                quantity=float(item.quantity),
                unit=item.unit,
                purchase_price=float(item.purchase_price),
                discount_percent=float(item.discount_percent),
                discount_amount=float(item.discount_amount),
                gst_rate=float(item.gst_rate),
                cgst_rate=float(item.cgst_rate),
                sgst_rate=float(item.sgst_rate),
                igst_rate=float(item.igst_rate),
                tax_amount=float(item.tax_amount),
                unit_cost=float(item.unit_cost),
                total_amount=float(item.total_amount),
                created_at=item.created_at,
            )
            for item in purchase.items
        ]
        
        # Convert import items
        import_items = [
            PurchaseImportItemResponse(
                id=item.id,
                name=item.name,
                quantity=float(item.quantity),
                rate=float(item.rate),
                per=item.per,
                discount_percent=float(item.discount_percent),
                amount=float(item.amount),
                created_at=item.created_at,
            )
            for item in purchase.import_items
        ]
        
        # Convert expense items
        expense_items = [
            PurchaseExpenseItemResponse(
                id=item.id,
                particulars=item.particulars,
                rate=float(item.rate),
                per=item.per,
                amount=float(item.amount),
                created_at=item.created_at,
            )
            for item in purchase.expense_items
        ]
        
        # Convert payments
        payments = [
            PurchasePaymentResponse(
                id=payment.id,
                amount=float(payment.amount),
                payment_type=payment.payment_type,
                account=payment.account,
                payment_note=payment.payment_note,
                reference_number=payment.reference_number,
                created_at=payment.created_at,
            )
            for payment in purchase.payments
        ]
        
        # Convert purchase_type enum to string if needed
        purchase_type_value = purchase.purchase_type
        if hasattr(purchase_type_value, 'value'):
            purchase_type_value = purchase_type_value.value
        
        # FIX: Use the correct invoice_date field
        invoice_date_value = purchase.invoice_date or purchase.created_at
        
        # Build the response
        response_data = {
            "id": purchase.id,
            "company_id": purchase.company_id,
            "vendor_id": purchase.vendor_id,
            "vendor_name": purchase.vendor.name if purchase.vendor else None,
            "purchase_type": purchase_type_value,
            "purchase_number": purchase.purchase_number,
            "reference_no": purchase.reference_no,
            "vendor_invoice_number": purchase.vendor_invoice_number,
            "invoice_date": invoice_date_value,  # FIXED: Use invoice_date field
            "vendor_invoice_date": purchase.vendor_invoice_date,
            "due_date": purchase.due_date,
            "payment_type": purchase.payment_type,
            
            # Charges
            "freight_charges": float(purchase.freight_charges or 0),
            "freight_type": purchase.freight_type or "fixed",
            "packing_forwarding_charges": float(purchase.packing_forwarding_charges or 0),
            "pf_type": purchase.pf_type or "fixed",
            "discount_on_all": float(purchase.discount_on_all or 0),
            "discount_type": purchase.discount_type or "percentage",
            "round_off": float(purchase.round_off or 0),
            
            # Totals
            "subtotal": float(purchase.subtotal or 0),
            "discount_amount": float(purchase.discount_amount or 0),
            "total_tax": float(purchase.total_tax or 0),
            "total_amount": float(purchase.total_amount or 0),
            "grand_total": float(purchase.grand_total or 0),
            "amount_paid": float(purchase.amount_paid or 0),
            "balance_due": float(purchase.balance_due or 0),
            
            # Contact info
            "contact_person": purchase.contact_person,
            "contact_phone": purchase.contact_phone,
            "contact_email": purchase.contact_email,
            "shipping_address": purchase.shipping_address,
            "billing_address": purchase.billing_address,
            
            # Additional
            "notes": purchase.notes,
            "terms": purchase.terms,
            "status": purchase.status.value if purchase.status else "draft",
            
            # Items
            "items": items,
            "import_items": import_items,
            "expense_items": expense_items,
            "payments": payments,
            
            # Timestamps
            "created_at": purchase.created_at,
            "updated_at": purchase.updated_at,
        }
        
        print(f"✅ Response data prepared. Creating PurchaseResponse...")
        
        # Try to create the response
        response = PurchaseResponse(**response_data)
        print(f"🎉 Response created successfully!")
        return response
        
    except Exception as e:
        print(f"❌ ERROR in _build_purchase_response: {str(e)}")
        import traceback
        print(f"Stack trace:\n{traceback.format_exc()}")
        
        # Debug: Print the problematic field
        print(f"Response data keys: {list(response_data.keys()) if 'response_data' in locals() else 'No data'}")
        
        # Try to get Pydantic validation errors
        if hasattr(e, 'errors'):
            for error in e.errors():
                print(f"Field: {error['loc']}, Error: {error['msg']}")
        
        # Return a minimal valid response as fallback
        return PurchaseResponse(
            id=purchase.id,
            company_id=purchase.company_id,
            vendor_id=purchase.vendor_id,
            purchase_type=purchase.purchase_type.value if hasattr(purchase.purchase_type, 'value') else str(purchase.purchase_type),
            purchase_number=purchase.purchase_number,
            invoice_date=purchase.invoice_date or purchase.created_at,
            subtotal=float(purchase.subtotal or 0),
            total_tax=float(purchase.total_tax or 0),
            total_amount=float(purchase.total_amount or 0),
            items=items if 'items' in locals() else [],
            import_items=import_items if 'import_items' in locals() else [],
            expense_items=expense_items if 'expense_items' in locals() else [],
            payments=payments if 'payments' in locals() else [],
        )