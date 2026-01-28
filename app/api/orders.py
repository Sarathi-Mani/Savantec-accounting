"""Orders API - Sales and Purchase order endpoints."""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import Optional, List,Dict,Any
from datetime import datetime, date
from decimal import Decimal
from sqlalchemy import or_, func
from pydantic import field_validator, model_validator,BaseModel, Field,ConfigDict
from app.database.connection import get_db
from app.database.models import User, Company, OrderStatus
from app.database.payroll_models import Employee

from app.services.order_service import OrderService
from app.auth.dependencies import get_current_active_user
from app.database.models import User, CreatorType  ,Company, OrderStatus, PurchaseOrder, Vendor  # Add PurchaseOrd 
router = APIRouter(prefix="/companies/{company_id}/orders", tags=["Orders"])


def get_company_or_404(company_id: str, current_user: User, db: Session) -> Company:
    """Get company or raise 404."""
    company = db.query(Company).filter(
        Company.id == company_id,
        Company.user_id == current_user.id
    ).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    return company


# ============== Schemas ==============

class OrderItemInput(BaseModel):
    product_id: Optional[str] = None
    item_code: Optional[str] = None # New field
  
    description: str
    quantity: Decimal
    unit: str = "unit"
    unit_price: Optional[Decimal] = None  # Make optional, remove alias
    rate: Optional[Decimal] = None  # Keep for backward compatibility
    discount_percent: Decimal = Decimal("0")  # New field
    discount_amount: Decimal = Decimal("0")  # New field
    gst_rate: Decimal = Decimal("18")
    cgst_rate: Optional[Decimal] = None  # New field
    sgst_rate: Optional[Decimal] = None  # New field
    igst_rate: Optional[Decimal] = Decimal("0")  # New field
    tax_amount: Optional[Decimal] = None  # New field
    total_amount: Optional[Decimal] = None  # New field
    
    # Add validator to ensure we have either unit_price or rate
    @model_validator(mode='after')
    def ensure_price(self):
        if self.unit_price is None and self.rate is None:
            raise ValueError("Either unit_price or rate must be provided")
        if self.unit_price is None:
            self.unit_price = self.rate
        if self.rate is None:
            self.rate = self.unit_price
        return self
    
    class Config:
        # Remove alias and populate_by_name
        json_encoders = {
            Decimal: str
        }

class OrderItemResponse(BaseModel):
    id: str
    product_id: Optional[str]
    product_name: Optional[str] = None
    item_code: Optional[str]
    description: str
    quantity: Decimal
    unit: str
    unit_price: Decimal
    discount_percent: Decimal
    discount_amount: Decimal
    gst_rate: Decimal
    cgst_rate: Decimal
    sgst_rate: Decimal
    igst_rate: Decimal
    taxable_amount: Decimal
    total_amount: Decimal
    quantity_pending: Optional[Decimal]
    
    class Config:
        from_attributes = True
        json_encoders = {
            Decimal: str
        }


class SalesOrderCreate(BaseModel):
    customer_id: str
    sales_order_date: Optional[datetime] = None
    expire_date: Optional[datetime] = None
    status: str = "pending"
    reference_no: Optional[str] = None
    reference_date: Optional[datetime] = None
    payment_terms: Optional[str] = None
    sales_person_id: Optional[str] = None
    contact_person: Optional[str] = None
    notes: Optional[str] = None
    terms: Optional[str] = None
    freight_charges: Optional[Decimal] = Decimal("0")
    p_and_f_charges: Optional[Decimal] = Decimal("0")
    round_off: Optional[Decimal] = Decimal("0")
    subtotal: Optional[Decimal] = None
    total_tax: Optional[Decimal] = None
    total_amount: Optional[Decimal] = None
    send_message: Optional[bool] = False
    # New fields from frontend
    delivery_note: Optional[str] = None
    supplier_ref: Optional[str] = None
    other_references: Optional[str] = None
    buyer_order_no: Optional[str] = None
    buyer_order_date: Optional[datetime] = None
    despatch_doc_no: Optional[str] = None
    delivery_note_date: Optional[datetime] = None
    despatched_through: Optional[str] = None
    destination: Optional[str] = None
    terms_of_delivery: Optional[str] = None
    
    items: List[OrderItemInput]
    
    class Config:
        json_encoders = {
            Decimal: str
        }


class SalesOrderUpdate(BaseModel):
    customer_id: Optional[str] = None
    sales_order_date: Optional[datetime] = None
    expire_date: Optional[datetime] = None
    status: Optional[str] = None
    reference_no: Optional[str] = None
    reference_date: Optional[datetime] = None
    payment_terms: Optional[str] = None
    sales_person_id: Optional[str] = None
    contact_person: Optional[str] = None
    notes: Optional[str] = None
    terms: Optional[str] = None
    freight_charges: Optional[Decimal] = None
    p_and_f_charges: Optional[Decimal] = None
    round_off: Optional[Decimal] = None
    subtotal: Optional[Decimal] = None
    total_tax: Optional[Decimal] = None
    total_amount: Optional[Decimal] = None
    send_message: Optional[bool] = None
    delivery_note: Optional[str] = None
    supplier_ref: Optional[str] = None
    other_references: Optional[str] = None
    buyer_order_no: Optional[str] = None
    buyer_order_date: Optional[datetime] = None
    despatch_doc_no: Optional[str] = None
    delivery_note_date: Optional[datetime] = None
    despatched_through: Optional[str] = None
    destination: Optional[str] = None
    terms_of_delivery: Optional[str] = None
    items: Optional[List[OrderItemInput]] = None
    
    class Config:
        json_encoders = {
            Decimal: str
        }


class SalesOrderResponse(BaseModel):
    id: str
    order_number: str
    order_date: datetime
    expire_date: Optional[datetime]
    customer_id: str
    status: str
    reference_no: Optional[str]
    reference_date: Optional[datetime]
    payment_terms: Optional[str]
    sales_person_id: Optional[str]
    contact_person: Optional[str]
    notes: Optional[str]
    terms: Optional[str]
    freight_charges: Decimal
    p_and_f_charges: Decimal
    round_off: Decimal
    subtotal: Decimal
    total_tax: Decimal
    total_amount: Decimal
    send_message: bool
    quantity_ordered: Optional[Decimal]
    quantity_delivered: Optional[Decimal]
    # New fields
    delivery_note: Optional[str]
    supplier_ref: Optional[str]
    other_references: Optional[str]
    buyer_order_no: Optional[str]
    buyer_order_date: Optional[datetime]
    despatch_doc_no: Optional[str]
    delivery_note_date: Optional[datetime]
    despatched_through: Optional[str]
    destination: Optional[str]
    terms_of_delivery: Optional[str]
    created_at: datetime
    items: Optional[List[OrderItemResponse]] = None
    
    class Config:
        from_attributes = True
        json_encoders = {
            Decimal: str
        }

class PurchaseOrderCreate(BaseModel):
    vendor_id: str
    items: List[OrderItemInput]
    order_date: Optional[datetime] = None
    expected_date: Optional[datetime] = None
    notes: Optional[str] = None
    terms: Optional[str] = None
    # ADD THESE MISSING FIELDS:
    reference_number: Optional[str] = None
    currency: str = "INR"
    exchange_rate: Decimal = Decimal("1.0")
    freight_charges: Decimal = Decimal("0")
    other_charges: Decimal = Decimal("0")
    discount_on_all: Decimal = Decimal("0")
    round_off: Decimal = Decimal("0")
    subtotal: Optional[Decimal] = None
    tax_amount: Optional[Decimal] = None
    total_amount: Optional[Decimal] = None
    creator_id: Optional[str] = None
    creator_type: CreatorType = CreatorType.USER 
    model_config = ConfigDict(
        json_encoders={Decimal: str}
    )

class PurchaseOrderUpdate(BaseModel):
    vendor_id: Optional[str] = None
    items: Optional[List[OrderItemInput]] = None
    order_date: Optional[datetime] = None
    expected_date: Optional[datetime] = None
    notes: Optional[str] = None
    terms: Optional[str] = None
   
    reference_number: Optional[str] = None
    currency: Optional[str] = None
    exchange_rate: Optional[Decimal] = None
    freight_charges: Optional[Decimal] = None
    other_charges: Optional[Decimal] = None
    discount_on_all: Optional[Decimal] = None
    round_off: Optional[Decimal] = None
    subtotal: Optional[Decimal] = None
    tax_amount: Optional[Decimal] = None
    total_amount: Optional[Decimal] = None
    
    class Config:
        json_encoders = {
            Decimal: str
        }
class PurchaseOrderResponse(BaseModel):
    id: str
    order_number: str
    order_date: datetime
    expected_date: Optional[datetime] = None
    vendor_id: Optional[str] = None
      
    vendor: Optional[Dict[str, Any]] = None  # ← This MUST exist
    
    status: str
    subtotal: Optional[Decimal] = None
    tax_amount: Optional[Decimal] = None
    total_amount: Optional[Decimal] = None
    quantity_ordered: Optional[Decimal] = None
    quantity_received: Optional[Decimal] = None
    notes: Optional[str] = None
    terms: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    items: List[OrderItemResponse] = []
    # Add these fields:
    reference_number: Optional[str] = None
    currency: str = "INR"
    exchange_rate: Decimal = Decimal("1.0")
    freight_charges: Decimal = Decimal("0")
    other_charges: Decimal = Decimal("0")
    discount_on_all: Decimal = Decimal("0")
    round_off: Decimal = Decimal("0")
    created_by: Optional[str] = None
    creator_name: Optional[str] = None
    updated_at: Optional[datetime] = None
    class Config:
        from_attributes = True
class DeliveryNoteItemInput(BaseModel):
    product_id: Optional[str] = None
    description: str
    quantity: Decimal
    unit: str = "Nos"


class DeliveryNoteCreate(BaseModel):
    sales_order_id: Optional[str] = None
    customer_id: str
    items: List[DeliveryNoteItemInput]
    godown_id: Optional[str] = None
    delivery_date: Optional[datetime] = None
    transporter_name: Optional[str] = None
    vehicle_number: Optional[str] = None
    notes: Optional[str] = None


class DeliveryNoteResponse(BaseModel):
    id: str
    delivery_number: str
    delivery_date: datetime
    customer_id: Optional[str]
    sales_order_id: Optional[str]
    transporter_name: Optional[str]
    vehicle_number: Optional[str]
    notes: Optional[str]
    created_at: datetime
    
    class Config:
        from_attributes = True


class ReceiptNoteItemInput(BaseModel):
    product_id: Optional[str] = None
    description: str
    quantity: Decimal
    unit: str = "Nos"
    rate: Decimal = Decimal("0")
    rejected_quantity: Decimal = Decimal("0")
    rejection_reason: Optional[str] = None


class ReceiptNoteCreate(BaseModel):
    purchase_order_id: Optional[str] = None
    vendor_id: str
    items: List[ReceiptNoteItemInput]
    godown_id: Optional[str] = None
    receipt_date: Optional[datetime] = None
    vendor_invoice_number: Optional[str] = None
    vendor_invoice_date: Optional[datetime] = None
    notes: Optional[str] = None


class ReceiptNoteResponse(BaseModel):
    id: str
    receipt_number: str
    receipt_date: datetime
    vendor_id: Optional[str]
    purchase_order_id: Optional[str]
    vendor_invoice_number: Optional[str]
    notes: Optional[str]
    created_at: datetime
    
    class Config:
        from_attributes = True


# ============== Sales Order Endpoints ==============

@router.post("/sales", response_model=SalesOrderResponse, status_code=status.HTTP_201_CREATED)
async def create_sales_order(
    company_id: str,
    data: SalesOrderCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Create a new sales order."""
    company = get_company_or_404(company_id, current_user, db)
    service = OrderService(db)
    
    try:
        # Convert items to dict for service
        items_data = []
        for item in data.items:
            item_dict = item.model_dump()
            items_data.append(item_dict)
        
        order = service.create_sales_order(
            company=company,
            customer_id=data.customer_id,
            items=items_data,
            sales_order_date=data.sales_order_date,
            expire_date=data.expire_date,
            status=data.status,
            reference_no=data.reference_no,
            reference_date=data.reference_date,
            payment_terms=data.payment_terms,
            sales_person_id=data.sales_person_id,
            contact_person=data.contact_person,
            notes=data.notes,
            terms=data.terms,
            freight_charges=data.freight_charges,
            p_and_f_charges=data.p_and_f_charges,
            round_off=data.round_off,
            subtotal=data.subtotal,
            total_tax=data.total_tax,
            total_amount=data.total_amount,
            send_message=data.send_message,
            delivery_note=data.delivery_note,
            supplier_ref=data.supplier_ref,
            other_references=data.other_references,
            buyer_order_no=data.buyer_order_no,
            buyer_order_date=data.buyer_order_date,
            despatch_doc_no=data.despatch_doc_no,
            delivery_note_date=data.delivery_note_date,
            despatched_through=data.despatched_through,
            destination=data.destination,
            terms_of_delivery=data.terms_of_delivery,
        )
        
        # Build items list for response
        items_response = []
        for item in order.items:
            item_response = OrderItemResponse(
                id=item.id,
                product_id=item.product_id,
                item_code=item.item_code or "",
                description=item.description or "",
                quantity=item.quantity or Decimal("0"),
                unit=item.unit or "unit",
                unit_price=item.unit_price or Decimal("0"),
                discount_percent=item.discount_percent or Decimal("0"),
                discount_amount=item.discount_amount or Decimal("0"),
                gst_rate=item.gst_rate or Decimal("0"),
                cgst_rate=item.cgst_rate or Decimal("0"),
                sgst_rate=item.sgst_rate or Decimal("0"),
                igst_rate=item.igst_rate or Decimal("0"),
                taxable_amount=item.tax_amount or Decimal("0"),
                total_amount=item.total_amount or Decimal("0"),
                quantity_pending=item.quantity_pending or Decimal("0"),
            )
            items_response.append(item_response)
        
        # Build the response with safe defaults
        response = SalesOrderResponse(
            id=order.id,
            order_number=order.order_number,
            order_date=order.order_date,
            expire_date=order.expire_date,
            customer_id=order.customer_id,
            status=order.status.value,
            reference_no=order.reference_no,
            reference_date=order.reference_date,
            payment_terms=order.payment_terms,
            sales_person_id=order.sales_person_id,
            contact_person=order.contact_person,
            notes=order.notes,
            terms=order.terms,
            freight_charges=order.freight_charges or Decimal("0"),
            p_and_f_charges=order.p_and_f_charges or Decimal("0"),
            round_off=order.round_off or Decimal("0"),
            subtotal=order.subtotal or Decimal("0"),
            total_tax=order.total_tax or Decimal("0"),
            total_amount=order.total_amount or Decimal("0"),
            send_message=order.send_message or False,
            delivery_note=order.delivery_note,
            supplier_ref=order.supplier_ref,
            other_references=order.other_references,
            buyer_order_no=order.buyer_order_no,
            buyer_order_date=order.buyer_order_date,
            despatch_doc_no=order.despatch_doc_no,
            delivery_note_date=order.delivery_note_date,
            despatched_through=order.despatched_through,
            destination=order.destination,
            terms_of_delivery=order.terms_of_delivery,
            quantity_ordered=order.quantity_ordered or Decimal("0"),
            quantity_delivered=order.quantity_delivered or Decimal("0"),
            created_at=order.created_at,
            items=items_response,
        )
        
        return response
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    
@router.get("/sales", response_model=List[SalesOrderResponse])
async def list_sales_orders(
    company_id: str,
    customer_id: Optional[str] = None,
    status: Optional[str] = None,
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """List sales orders."""
    company = get_company_or_404(company_id, current_user, db)
    service = OrderService(db)
    
    order_status = None
    if status:
        try:
            order_status = OrderStatus(status)
        except ValueError:
            pass
    
    # Convert date to datetime for filtering
    from_datetime = datetime.combine(from_date, datetime.min.time()) if from_date else None
    to_datetime = datetime.combine(to_date, datetime.max.time()) if to_date else None
    
    orders = service.get_sales_orders(
        company=company, 
        customer_id=customer_id, 
        status=order_status,
        from_date=from_datetime,
        to_date=to_datetime
    )
    
    result = []
    for order in orders:
        # Build items list for each order
        items_response = [
            OrderItemResponse(
                id=item.id,
                product_id=item.product_id,
                item_code=item.item_code,
                description=item.description,
                quantity=item.quantity,
                unit=item.unit,
                unit_price=item.unit_price,
                discount_percent=item.discount_percent,
                discount_amount=item.discount_amount,
                gst_rate=item.gst_rate,
                cgst_rate=item.cgst_rate,
                sgst_rate=item.sgst_rate,
                igst_rate=item.igst_rate,
                taxable_amount=item.tax_amount,
                total_amount=item.total_amount,
                quantity_pending=item.quantity_pending,
            )
            for item in order.items
        ]
        
        result.append(SalesOrderResponse(
            id=order.id,
            order_number=order.order_number,
            order_date=order.order_date,
            expire_date=order.expire_date,
            customer_id=order.customer_id,
            status=order.status.value,
            reference_no=order.reference_no,
            reference_date=order.reference_date,
            payment_terms=order.payment_terms,
            sales_person_id=order.sales_person_id,
            contact_person=order.contact_person,
            notes=order.notes,
            terms=order.terms,
            freight_charges=order.freight_charges or Decimal("0"),
            p_and_f_charges=order.p_and_f_charges or Decimal("0"),
            round_off=order.round_off or Decimal("0"),
            subtotal=order.subtotal or Decimal("0"),
            total_tax=order.total_tax or Decimal("0"),
            total_amount=order.total_amount or Decimal("0"),
            send_message=order.send_message or False,
            delivery_note=order.delivery_note,
            supplier_ref=order.supplier_ref,
            other_references=order.other_references,
            buyer_order_no=order.buyer_order_no,
            buyer_order_date=order.buyer_order_date,
            despatch_doc_no=order.despatch_doc_no,
            delivery_note_date=order.delivery_note_date,
            despatched_through=order.despatched_through,
            destination=order.destination,
            terms_of_delivery=order.terms_of_delivery,
            quantity_ordered=order.quantity_ordered,
            quantity_delivered=order.quantity_delivered,
            created_at=order.created_at,
            items=items_response,
        ))
    
    return result


@router.get("/sales/{order_id}", response_model=SalesOrderResponse)
async def get_sales_order(
    company_id: str,
    order_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get a sales order by ID."""
    company = get_company_or_404(company_id, current_user, db)
    service = OrderService(db)
    
    order = service.get_sales_order(order_id, company)
    if not order:
        raise HTTPException(status_code=404, detail="Sales order not found")
    
    # Build items list
    items_response = [
        OrderItemResponse(
            id=item.id,
            product_id=item.product_id,
            item_code=item.item_code,
            description=item.description,
            quantity=item.quantity,
            unit=item.unit,
            unit_price=item.unit_price,
            discount_percent=item.discount_percent,
            discount_amount=item.discount_amount,
            gst_rate=item.gst_rate,
            cgst_rate=item.cgst_rate,
            sgst_rate=item.sgst_rate,
            igst_rate=item.igst_rate,
            taxable_amount=item.tax_amount,
            total_amount=item.total_amount,
            quantity_pending=item.quantity_pending,
        )
        for item in order.items
    ]
    
    return SalesOrderResponse(
        id=order.id,
        order_number=order.order_number,
        order_date=order.order_date,
        expire_date=order.expire_date,
        customer_id=order.customer_id,
        status=order.status.value,
        reference_no=order.reference_no,
        reference_date=order.reference_date,
        payment_terms=order.payment_terms,
        sales_person_id=order.sales_person_id,
        contact_person=order.contact_person,
        notes=order.notes,
        terms=order.terms,
        freight_charges=order.freight_charges or Decimal("0"),
        p_and_f_charges=order.p_and_f_charges or Decimal("0"),
        round_off=order.round_off or Decimal("0"),
        subtotal=order.subtotal or Decimal("0"),
        total_tax=order.total_tax or Decimal("0"),
        total_amount=order.total_amount or Decimal("0"),
        send_message=order.send_message or False,
        delivery_note=order.delivery_note,
        supplier_ref=order.supplier_ref,
        other_references=order.other_references,
        buyer_order_no=order.buyer_order_no,
        buyer_order_date=order.buyer_order_date,
        despatch_doc_no=order.despatch_doc_no,
        delivery_note_date=order.delivery_note_date,
        despatched_through=order.despatched_through,
        destination=order.destination,
        terms_of_delivery=order.terms_of_delivery,
        quantity_ordered=order.quantity_ordered,
        quantity_delivered=order.quantity_delivered,
        created_at=order.created_at,
        items=items_response,
    )


@router.put("/sales/{order_id}", response_model=SalesOrderResponse)
async def update_sales_order(
    company_id: str,
    order_id: str,
    data: SalesOrderUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update a sales order (only draft orders can be updated)."""
    company = get_company_or_404(company_id, current_user, db)
    service = OrderService(db)
    
    order = service.get_sales_order(order_id, company)
    if not order:
        raise HTTPException(status_code=404, detail="Sales order not found")
    
    if order.status != OrderStatus.DRAFT:
        raise HTTPException(
            status_code=400, 
            detail="Only draft orders can be updated"
        )
    
    try:
        updated_order = service.update_sales_order(
            order=order,
            customer_id=data.customer_id,
            sales_order_date=data.sales_order_date,
            expire_date=data.expire_date,
            status=data.status,
            reference_no=data.reference_no,
            reference_date=data.reference_date,
            payment_terms=data.payment_terms,
            sales_person_id=data.sales_person_id,
            contact_person=data.contact_person,
            notes=data.notes,
            terms=data.terms,
            freight_charges=data.freight_charges,
            p_and_f_charges=data.p_and_f_charges,
            round_off=data.round_off,
            subtotal=data.subtotal,
            taxable_amount=item.tax_amount,
            total_tax=data.total_tax,
            total_amount=data.total_amount,
            send_message=data.send_message,
            delivery_note=data.delivery_note,
            supplier_ref=data.supplier_ref,
            other_references=data.other_references,
            buyer_order_no=data.buyer_order_no,
            buyer_order_date=data.buyer_order_date,
            despatch_doc_no=data.despatch_doc_no,
            delivery_note_date=data.delivery_note_date,
            despatched_through=data.despatched_through,
            destination=data.destination,
            terms_of_delivery=data.terms_of_delivery,
            items=[item.model_dump() for item in data.items] if data.items else None,
        )
        
        # Build items list for response
        items_response = [
            OrderItemResponse(
                id=item.id,
                product_id=item.product_id,
                item_code=item.item_code,
                description=item.description,
                quantity=item.quantity,
                unit=item.unit,
                unit_price=item.unit_price,
                discount_percent=item.discount_percent,
                discount_amount=item.discount_amount,
                gst_rate=item.gst_rate,
                cgst_rate=item.cgst_rate,
                sgst_rate=item.sgst_rate,
                igst_rate=item.igst_rate,
                taxable_amount=item.taxable_amount,
                total_amount=item.total_amount,
                quantity_pending=item.quantity_pending,
            )
            for item in updated_order.items
        ]
        
        return SalesOrderResponse(
            id=updated_order.id,
            order_number=updated_order.order_number,
            order_date=updated_order.order_date,
            expire_date=updated_order.expire_date,
            customer_id=updated_order.customer_id,
            status=updated_order.status.value,
            reference_no=updated_order.reference_no,
            reference_date=updated_order.reference_date,
            payment_terms=updated_order.payment_terms,
            sales_person_id=updated_order.sales_person_id,
            contact_person=updated_order.contact_person,
            notes=updated_order.notes,
            terms=updated_order.terms,
            freight_charges=updated_order.freight_charges or Decimal("0"),
            p_and_f_charges=updated_order.p_and_f_charges or Decimal("0"),
            round_off=updated_order.round_off or Decimal("0"),
            subtotal=updated_order.subtotal or Decimal("0"),
            total_tax=updated_order.total_tax or Decimal("0"),
            total_amount=updated_order.total_amount or Decimal("0"),
            send_message=updated_order.send_message or False,
            delivery_note=updated_order.delivery_note,
            supplier_ref=updated_order.supplier_ref,
            other_references=updated_order.other_references,
            buyer_order_no=updated_order.buyer_order_no,
            buyer_order_date=updated_order.buyer_order_date,
            despatch_doc_no=updated_order.despatch_doc_no,
            delivery_note_date=updated_order.delivery_note_date,
            despatched_through=updated_order.despatched_through,
            destination=updated_order.destination,
            terms_of_delivery=updated_order.terms_of_delivery,
            quantity_ordered=updated_order.quantity_ordered,
            quantity_delivered=updated_order.quantity_delivered,
            created_at=updated_order.created_at,
            items=items_response,
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/sales/{order_id}/confirm")
async def confirm_sales_order(
    company_id: str,
    order_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Confirm a sales order."""
    company = get_company_or_404(company_id, current_user, db)
    service = OrderService(db)
    
    order = service.get_sales_order(order_id, company)
    if not order:
        raise HTTPException(status_code=404, detail="Sales order not found")
    
    service.confirm_sales_order(order)
    return {"message": "Sales order confirmed"}


@router.post("/sales/{order_id}/cancel")
async def cancel_sales_order(
    company_id: str,
    order_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Cancel a sales order."""
    company = get_company_or_404(company_id, current_user, db)
    service = OrderService(db)
    
    order = service.get_sales_order(order_id, company)
    if not order:
        raise HTTPException(status_code=404, detail="Sales order not found")
    
    service.cancel_sales_order(order)
    return {"message": "Sales order cancelled"}


# ============== Purchase Order Endpoints ==============

@router.post("/purchase", response_model=PurchaseOrderResponse, status_code=status.HTTP_201_CREATED)
async def create_purchase_order(
    company_id: str,
    data: PurchaseOrderCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Create a new purchase order."""
    company = get_company_or_404(company_id, current_user, db)
    service = OrderService(db)
    
    # Convert items to dict and handle Decimal conversions
    items_dict = []
    for item in data.items:
        item_dict = item.model_dump()
        
        # Handle item_code
        item_code = item_dict.get('item_code', '')
        item_dict['item_code'] = str(item_code).strip() if item_code is not None else ''
        
        # Convert ALL Decimal fields to strings for Decimal() constructor
        decimal_fields = [
            'quantity', 'rate', 'discount_percent', 'discount_amount',
            'gst_rate', 'tax_amount', 'total_amount'
        ]
        
        for field in decimal_fields:
            if field in item_dict:
                value = item_dict[field]
                if value is not None:
                    item_dict[field] = str(value)
                else:
                    item_dict[field] = "0"
        
        items_dict.append(item_dict)
    
    creator_id = data.creator_id or current_user.id
    creator_type = data.creator_type.value  # Convert enum to string
    # Convert Decimal fields to strings for service layer
    order = service.create_purchase_order(
        company=company,
        vendor_id=data.vendor_id,
        items=items_dict,
        order_date=data.order_date,
        expected_date=data.expected_date,
        notes=data.notes,
        terms=data.terms,
        reference_number=data.reference_number,
        currency=data.currency,
        exchange_rate=Decimal(str(data.exchange_rate)) if data.exchange_rate is not None else Decimal("1.0"),
        freight_charges=Decimal(str(data.freight_charges)) if data.freight_charges is not None else Decimal("0"),
        other_charges=Decimal(str(data.other_charges)) if data.other_charges is not None else Decimal("0"),
        discount_on_all=Decimal(str(data.discount_on_all)) if data.discount_on_all is not None else Decimal("0"),
        round_off=Decimal(str(data.round_off)) if data.round_off is not None else Decimal("0"),
        subtotal=Decimal(str(data.subtotal)) if data.subtotal is not None else None,
        tax_amount=Decimal(str(data.tax_amount)) if data.tax_amount is not None else None,
        total_amount=Decimal(str(data.total_amount)) if data.total_amount is not None else None,
       creator_id=creator_id,
        creator_type=creator_type,
    )
    
    # Get order with items
    order_with_items = service.get_purchase_order_with_items(order.id, company)
    
    return PurchaseOrderResponse.from_orm(order_with_items)

@router.get("/purchase", response_model=dict)
async def list_purchase_orders(
    company_id: str,
    vendor_id: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    creator_id: Optional[str] = None,
    creator_type: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """List purchase orders with filtering and pagination."""
    company = get_company_or_404(company_id, current_user, db)
    
    # Apply filters
    query = db.query(PurchaseOrder).filter(
        PurchaseOrder.company_id == company.id
    )
    
    # ... [your existing filter code] ...
    
    # Get total count
    total = query.count()
    
    # Apply pagination
    offset = (page - 1) * page_size
    orders = query.order_by(PurchaseOrder.order_date.desc())\
                 .offset(offset)\
                 .limit(page_size)\
                 .all()
    
    # Calculate summary data
    total_amount = db.query(func.sum(PurchaseOrder.total_amount))\
                     .filter(PurchaseOrder.company_id == company.id)\
                     .scalar() or Decimal("0")
    
    # Collect creator IDs for batch querying
    user_ids = []
    employee_ids = []
    
    for order in orders:
        if order.creator_id and order.creator_type:
            if order.creator_type == 'user':
                user_ids.append(order.creator_id)
            elif order.creator_type == 'employee':
                employee_ids.append(order.creator_id)
    
    # Batch fetch users
    users_dict = {}
    if user_ids:
        users = db.query(User).filter(User.id.in_(user_ids)).all()
        users_dict = {user.id: user for user in users}
    
    # Batch fetch employees
    employees_dict = {}
    if employee_ids:
        employees = db.query(Employee).filter(Employee.id.in_(employee_ids)).all()
        employees_dict = {emp.id: emp for emp in employees}
    
    # Build orders response
    orders_response = []
    for order in orders:
        creator_name = None
        created_by_name = None
        
        # Get creator name
        if order.creator_id and order.creator_type:
            if order.creator_type == 'user':
                user = users_dict.get(order.creator_id)
                if user:
                    # Try to get full_name, fallback to name, then email
                    creator_name = (
                        getattr(user, 'full_name', None) or
                        getattr(user, 'name', None) or
                        user.email or
                        "User"
                    )
            elif order.creator_type == 'employee':
                employee = employees_dict.get(order.creator_id)
                if employee:
                    # Try to get full_name, fallback to name
                    creator_name = (
                        getattr(employee, 'full_name', None) or
                        getattr(employee, 'name', None) or
                        "Employee"
                    )
        
        # Set created_by_name for backward compatibility
        created_by_name = creator_name
        
        orders_response.append({
            "id": order.id,
            "order_number": order.order_number,
            "order_date": order.order_date,
            "expected_date": order.expected_date,
            "vendor_id": order.vendor_id,
            "vendor_name": order.vendor.name if order.vendor else None,
            "status": order.status.value,
            "reference_number": order.reference_number,
            "currency": order.currency,
            "exchange_rate": order.exchange_rate,
            "freight_charges": order.freight_charges or Decimal("0"),
            "other_charges": order.other_charges or Decimal("0"),
            "discount_on_all": order.discount_on_all or Decimal("0"),
            "round_off": order.round_off or Decimal("0"),
            "subtotal": order.subtotal or Decimal("0"),
            "tax_amount": order.tax_amount or Decimal("0"),
            "total_amount": order.total_amount or Decimal("0"),
            "quantity_ordered": order.quantity_ordered,
            "quantity_received": order.quantity_received,
            "notes": order.notes,
            "terms": order.terms,
            # New fields
            "creator_id": order.creator_id,
            "creator_type": order.creator_type,
            "creator_name": creator_name,
            # For backward compatibility - IMPORTANT: These should show names, not IDs
            "created_by": creator_name or order.creator_id,  # Show name first, fallback to ID
            "created_by_name": created_by_name,  # This should show the name
            "created_at": order.created_at,
            "updated_at": order.updated_at,
        })
    
    # Return with pagination and summary info
    return {
        "purchases": orders_response,
        "summary": {
            "total_orders": total,
            "total_amount": total_amount
        },
        "pagination": {
            "page": page,
            "page_size": page_size,
            "total": total,
            "pages": (total + page_size - 1) // page_size
        }
    }

@router.get("/purchase/{order_id}", response_model=PurchaseOrderResponse)
async def get_purchase_order(
    company_id: str,
    order_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get a purchase order by ID with items."""
    company = get_company_or_404(company_id, current_user, db)
    service = OrderService(db)
    
    # Get order with items and vendor
    order = service.get_purchase_order_with_items(order_id, company)
    if not order:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    # Build items list
    items_response = []
    if order.items:
        for item in order.items:
            # Calculate taxable amount
            taxable_amount = (item.quantity * item.rate) - (item.discount_amount or Decimal("0"))
            product_name = None
           
            if item.product:
                product_name = item.product.name
              
            item_response = OrderItemResponse(
                id=str(item.id),
                product_id=str(item.product_id) if item.product_id else None,
                product_name=product_name,
                item_code=item.item_code or "",
                description=item.description or "",
                quantity=item.quantity,
                unit=item.unit or "",
                unit_price=item.rate or Decimal("0"),
                discount_percent=item.discount_percent or Decimal("0"),
                discount_amount=item.discount_amount or Decimal("0"),
                gst_rate=item.gst_rate or Decimal("0"),
                cgst_rate=Decimal("0"),
                sgst_rate=Decimal("0"),
                igst_rate=Decimal("0"),
                taxable_amount=taxable_amount,
                total_amount=item.total_amount,
                quantity_pending=item.quantity_pending,
            )
            items_response.append(item_response)
    
    # Create vendor info
    vendor_info = None
    if order.vendor:
        vendor_info = {
            "id": str(order.vendor.id),
            "name": order.vendor.name or "",
            "email": order.vendor.email or "",
            "contact": order.vendor.contact or "",
            "address": order.vendor.billing_address or order.vendor.shipping_address or "",
        }
    
    # Build the response
    response_data = {
        "id": str(order.id),
        "order_number": order.order_number,
        "order_date": order.order_date,
        "expected_date": order.expected_date,
        "vendor_id": str(order.vendor_id) if order.vendor_id else None,
        "vendor": vendor_info,  # Make sure this is included
        "status": order.status.value,
        "subtotal": order.subtotal or Decimal("0"),
        "tax_amount": order.tax_amount or Decimal("0"),
        "total_amount": order.total_amount or Decimal("0"),
        "quantity_ordered": order.quantity_ordered,
        "quantity_received": order.quantity_received,
        "notes": order.notes,
        "terms": order.terms,
        "created_at": order.created_at,
        "items": items_response,  # Make sure this is included
        "currency": order.currency or "INR",
        "exchange_rate": order.exchange_rate or Decimal("1"),
        "freight_charges": order.freight_charges or Decimal("0"),
        "other_charges": order.other_charges or Decimal("0"),
        "discount_on_all": order.discount_on_all or Decimal("0"),
        "round_off": order.round_off or Decimal("0"),
        "reference_number": order.reference_number,
        "created_by": order.creator_id or "",
        "creator_name": "",  # You might need to fetch this from users table
        "updated_at": order.updated_at,
    }
    
    # Convert to Pydantic model
    response = PurchaseOrderResponse(**response_data)
    
    return response

@router.put("/purchase/{order_id}", response_model=PurchaseOrderResponse)
async def update_purchase_order(
    company_id: str,
    order_id: str,
    data: PurchaseOrderUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update a purchase order (only draft orders can be updated)."""
    company = get_company_or_404(company_id, current_user, db)
    service = OrderService(db)
    
    order = service.get_purchase_order(order_id, company)
    if not order:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    
    if order.status != OrderStatus.DRAFT:
        raise HTTPException(
            status_code=400, 
            detail="Only draft orders can be updated"
        )
    
    # Prepare items data for update
    items_data = None
    if data.items is not None:
        items_data = []
        for item in data.items:
            item_dict = item.model_dump()
            
            # Handle Decimal conversions
            item_code = item_dict.get('item_code', '')
            item_dict['item_code'] = str(item_code).strip() if item_code is not None else ''
            
            # Convert Decimal fields to strings for service layer
            decimal_fields = [
                'quantity', 'unit_price', 'rate', 'discount_percent', 
                'discount_amount', 'gst_rate', 'tax_amount', 'total_amount',
                'cgst_rate', 'sgst_rate', 'igst_rate'
            ]
            
            for field in decimal_fields:
                if field in item_dict and item_dict[field] is not None:
                    item_dict[field] = str(item_dict[field])
            
            items_data.append(item_dict)
    
    try:
        # Update the order
        updated_order = service.update_purchase_order(
            order=order,
            vendor_id=data.vendor_id,
            items=items_data,
            order_date=data.order_date,
            expected_date=data.expected_date,
            notes=data.notes,
            terms=data.terms,
            # Pass the new fields
            reference_number=data.reference_number,
            currency=data.currency,
            exchange_rate=data.exchange_rate,
            freight_charges=data.freight_charges,
            other_charges=data.other_charges,
            discount_on_all=data.discount_on_all,
            round_off=data.round_off,
            subtotal=data.subtotal,
            tax_amount=data.tax_amount,
            total_amount=data.total_amount,
        )
        
        # Get the fully loaded order
        order_with_details = service.get_purchase_order_with_items(order.id, company)
        
        if not order_with_details:
            raise HTTPException(status_code=404, detail="Updated order not found")
        
        # Build items response
        items_response = []
        if order_with_details.items:
            for item in order_with_details.items:
                taxable_amount = (item.quantity * item.rate) - (item.discount_amount or Decimal("0"))
                
                product_name = None
                if hasattr(item, 'product') and item.product:
                    product_name = item.product.name
                
                item_response = OrderItemResponse(
                    id=str(item.id),
                    product_id=str(item.product_id) if item.product_id else None,
                    product_name=product_name,
                    item_code=item.item_code or "",
                    description=item.description or "",
                    quantity=item.quantity or Decimal("0"),
                    unit=item.unit or "",
                    unit_price=item.rate or Decimal("0"),
                    discount_percent=item.discount_percent or Decimal("0"),
                    discount_amount=item.discount_amount or Decimal("0"),
                    gst_rate=item.gst_rate or Decimal("0"),
                    cgst_rate=item.cgst_rate if hasattr(item, 'cgst_rate') else Decimal("0"),
                    sgst_rate=item.sgst_rate if hasattr(item, 'sgst_rate') else Decimal("0"),
                    igst_rate=item.igst_rate if hasattr(item, 'igst_rate') else Decimal("0"),
                    taxable_amount=taxable_amount,
                    total_amount=item.total_amount or Decimal("0"),
                    quantity_pending=item.quantity_pending or Decimal("0"),
                )
                items_response.append(item_response)
        
        # Create vendor info
        vendor_info = None
        if hasattr(order_with_details, 'vendor') and order_with_details.vendor:
            vendor = order_with_details.vendor
            vendor_info = {
                "id": str(vendor.id),
                "name": vendor.name or "",
                "email": vendor.email or "",
                "phone": vendor.contact or "",
                "address": vendor.billing_address or vendor.shipping_address or "",
            }
        
        # Get creator information
        creator_name = None
        if hasattr(order_with_details, 'creator_id') and order_with_details.creator_id:
            if hasattr(order_with_details, 'creator_type') and order_with_details.creator_type:
                if order_with_details.creator_type == 'user':
                    creator = db.query(User).filter(User.id == order_with_details.creator_id).first()
                    if creator:
                        creator_name = (
                            getattr(creator, 'full_name', None) or
                            getattr(creator, 'name', None) or
                            creator.email or
                            "User"
                        )
                elif order_with_details.creator_type == 'employee':
                    employee = db.query(Employee).filter(Employee.id == order_with_details.creator_id).first()
                    if employee:
                        creator_name = (
                            getattr(employee, 'full_name', None) or
                            getattr(employee, 'name', None) or
                            "Employee"
                        )
        
        # Build the response
        response_data = {
            "id": str(order_with_details.id),
            "order_number": order_with_details.order_number,
            "order_date": order_with_details.order_date,
            "expected_date": order_with_details.expected_date,
            "vendor_id": str(order_with_details.vendor_id) if order_with_details.vendor_id else None,
            "vendor": vendor_info,
            "status": order_with_details.status.value,
            "subtotal": order_with_details.subtotal or Decimal("0"),
            "tax_amount": order_with_details.tax_amount or Decimal("0"),
            "total_amount": order_with_details.total_amount or Decimal("0"),
            "quantity_ordered": order_with_details.quantity_ordered or Decimal("0"),
            "quantity_received": order_with_details.quantity_received or Decimal("0"),
            "notes": order_with_details.notes,
            "terms": order_with_details.terms,
            "created_at": order_with_details.created_at,
            "items": items_response,
            # **MAKE SURE THESE FIELDS ARE INCLUDED:**
            "reference_number": order_with_details.reference_number,
            "currency": order_with_details.currency or "INR",
            "exchange_rate": order_with_details.exchange_rate or Decimal("1"),
            "freight_charges": order_with_details.freight_charges or Decimal("0"),
            "other_charges": order_with_details.other_charges or Decimal("0"),
            "discount_on_all": order_with_details.discount_on_all or Decimal("0"),
            "round_off": order_with_details.round_off or Decimal("0"),
            "creator_id": order_with_details.creator_id,
            "creator_type": order_with_details.creator_type,
            "creator_name": creator_name,
            "created_by": creator_name or order_with_details.creator_id,
            "created_by_name": creator_name,
            "updated_at": order_with_details.updated_at or datetime.utcnow(),
        }
        
        return PurchaseOrderResponse(**response_data)
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    
@router.post("/purchase/{order_id}/confirm")
async def confirm_purchase_order(
    company_id: str,
    order_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Confirm a purchase order."""
    company = get_company_or_404(company_id, current_user, db)
    service = OrderService(db)
    
    order = service.get_purchase_order(order_id, company)
    if not order:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    
    service.confirm_purchase_order(order)
    return {"message": "Purchase order confirmed"}


@router.post("/purchase/{order_id}/cancel")
async def cancel_purchase_order(
    company_id: str,
    order_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Cancel a purchase order."""
    company = get_company_or_404(company_id, current_user, db)
    service = OrderService(db)
    
    order = service.get_purchase_order(order_id, company)
    if not order:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    
    service.cancel_purchase_order(order)
    return {"message": "Purchase order cancelled"}


# ============== Delivery Note Endpoints ==============

@router.post("/delivery-notes", response_model=DeliveryNoteResponse, status_code=status.HTTP_201_CREATED)
async def create_delivery_note(
    company_id: str,
    data: DeliveryNoteCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Create a delivery note (goods dispatched)."""
    company = get_company_or_404(company_id, current_user, db)
    service = OrderService(db)
    
    try:
        note = service.create_delivery_note(
            company=company,
            sales_order_id=data.sales_order_id,
            customer_id=data.customer_id,
            items=[i.model_dump() for i in data.items],
            godown_id=data.godown_id,
            delivery_date=data.delivery_date,
            transporter_name=data.transporter_name,
            vehicle_number=data.vehicle_number,
            notes=data.notes,
        )
        
        return DeliveryNoteResponse(
            id=note.id,
            delivery_number=note.delivery_number,
            delivery_date=note.delivery_date,
            customer_id=note.customer_id,
            sales_order_id=note.sales_order_id,
            transporter_name=note.transporter_name,
            vehicle_number=note.vehicle_number,
            notes=note.notes,
            created_at=note.created_at,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/delivery-notes", response_model=List[DeliveryNoteResponse])
async def list_delivery_notes(
    company_id: str,
    sales_order_id: Optional[str] = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """List delivery notes."""
    company = get_company_or_404(company_id, current_user, db)
    service = OrderService(db)
    
    notes = service.get_delivery_notes(company, sales_order_id)
    
    return [
        DeliveryNoteResponse(
            id=n.id,
            delivery_number=n.delivery_number,
            delivery_date=n.delivery_date,
            customer_id=n.customer_id,
            sales_order_id=n.sales_order_id,
            transporter_name=n.transporter_name,
            vehicle_number=n.vehicle_number,
            notes=n.notes,
            created_at=n.created_at,
        )
        for n in notes
    ]


@router.get("/delivery-notes/{note_id}", response_model=DeliveryNoteResponse)
async def get_delivery_note(
    company_id: str,
    note_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get a delivery note by ID."""
    company = get_company_or_404(company_id, current_user, db)
    
    from app.database.models import DeliveryNote
    note = db.query(DeliveryNote).filter(
        DeliveryNote.id == note_id,
        DeliveryNote.company_id == company.id
    ).first()
    
    if not note:
        raise HTTPException(status_code=404, detail="Delivery note not found")
    
    return DeliveryNoteResponse(
        id=note.id,
        delivery_number=note.delivery_number,
        delivery_date=note.delivery_date,
        customer_id=note.customer_id,
        sales_order_id=note.sales_order_id,
        transporter_name=note.transporter_name,
        vehicle_number=note.vehicle_number,
        notes=note.notes,
        created_at=note.created_at,
    )


@router.delete("/delivery-notes/{note_id}")
async def delete_delivery_note(
    company_id: str,
    note_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Delete a delivery note (reverses stock movement)."""
    company = get_company_or_404(company_id, current_user, db)
    
    from app.database.models import DeliveryNote, DeliveryNoteItem
    note = db.query(DeliveryNote).filter(
        DeliveryNote.id == note_id,
        DeliveryNote.company_id == company.id
    ).first()
    
    if not note:
        raise HTTPException(status_code=404, detail="Delivery note not found")
    
    try:
        # Reverse stock movements
        service = OrderService(db)
        for item in note.items:
            if item.product_id:
                service.inventory_service.record_stock_in(
                    company=company,
                    product_id=item.product_id,
                    quantity=item.quantity,
                    godown_id=note.godown_id,
                    reference_type="delivery_note_reversal",
                    reference_id=note.id,
                    reference_number=f"{note.delivery_number}-REV",
                )
        
        db.delete(note)
        db.commit()
        
        return {"message": "Delivery note deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete delivery note: {str(e)}")


# ============== Receipt Note Endpoints ==============

@router.post("/receipt-notes", response_model=ReceiptNoteResponse, status_code=status.HTTP_201_CREATED)
async def create_receipt_note(
    company_id: str,
    data: ReceiptNoteCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Create a receipt note (goods received)."""
    company = get_company_or_404(company_id, current_user, db)
    service = OrderService(db)
    
    try:
        note = service.create_receipt_note(
            company=company,
            purchase_order_id=data.purchase_order_id,
            vendor_id=data.vendor_id,
            items=[i.model_dump() for i in data.items],
            godown_id=data.godown_id,
            receipt_date=data.receipt_date,
            vendor_invoice_number=data.vendor_invoice_number,
            vendor_invoice_date=data.vendor_invoice_date,
            notes=data.notes,
        )
        
        return ReceiptNoteResponse(
            id=note.id,
            receipt_number=note.receipt_number,
            receipt_date=note.receipt_date,
            vendor_id=note.vendor_id,
            purchase_order_id=note.purchase_order_id,
            vendor_invoice_number=note.vendor_invoice_number,
            notes=note.notes,
            created_at=note.created_at,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/receipt-notes", response_model=List[ReceiptNoteResponse])
async def list_receipt_notes(
    company_id: str,
    purchase_order_id: Optional[str] = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """List receipt notes."""
    company = get_company_or_404(company_id, current_user, db)
    service = OrderService(db)
    
    notes = service.get_receipt_notes(company, purchase_order_id)
    
    return [
        ReceiptNoteResponse(
            id=n.id,
            receipt_number=n.receipt_number,
            receipt_date=n.receipt_date,
            vendor_id=n.vendor_id,
            purchase_order_id=n.purchase_order_id,
            vendor_invoice_number=n.vendor_invoice_number,
            notes=n.notes,
            created_at=n.created_at,
        )
        for n in notes
    ]


@router.get("/receipt-notes/{note_id}", response_model=ReceiptNoteResponse)
async def get_receipt_note(
    company_id: str,
    note_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get a receipt note by ID."""
    company = get_company_or_404(company_id, current_user, db)
    
    from app.database.models import ReceiptNote
    note = db.query(ReceiptNote).filter(
        ReceiptNote.id == note_id,
        ReceiptNote.company_id == company.id
    ).first()
    
    if not note:
        raise HTTPException(status_code=404, detail="Receipt note not found")
    
    return ReceiptNoteResponse(
        id=note.id,
        receipt_number=note.receipt_number,
        receipt_date=note.receipt_date,
        vendor_id=note.vendor_id,
        purchase_order_id=note.purchase_order_id,
        vendor_invoice_number=note.vendor_invoice_number,
        notes=note.notes,
        created_at=note.created_at,
    )


@router.delete("/receipt-notes/{note_id}")
async def delete_receipt_note(
    company_id: str,
    note_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Delete a receipt note (reverses stock movement)."""
    company = get_company_or_404(company_id, current_user, db)
    
    from app.database.models import ReceiptNote, ReceiptNoteItem
    note = db.query(ReceiptNote).filter(
        ReceiptNote.id == note_id,
        ReceiptNote.company_id == company.id
    ).first()
    
    if not note:
        raise HTTPException(status_code=404, detail="Receipt note not found")
    
    try:
        # Reverse stock movements
        service = OrderService(db)
        for item in note.items:
            if item.product_id and item.accepted_quantity:
                service.inventory_service.record_stock_out(
                    company=company,
                    product_id=item.product_id,
                    quantity=item.accepted_quantity,
                    godown_id=note.godown_id,
                    reference_type="receipt_note_reversal",
                    reference_id=note.id,
                    reference_number=f"{note.receipt_number}-REV",
                )
        
        db.delete(note)
        db.commit()
        
        return {"message": "Receipt note deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete receipt note: {str(e)}")