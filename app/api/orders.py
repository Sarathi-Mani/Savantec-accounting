"""Orders API - Sales and Purchase order endpoints."""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime, date
from decimal import Decimal

from pydantic import field_validator, model_validator,BaseModel, Field
from app.database.connection import get_db
from app.database.models import User, Company, OrderStatus
from app.services.order_service import OrderService
from app.auth.dependencies import get_current_active_user

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
    taxable_amount: Optional[Decimal] = None  # New field
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


class PurchaseOrderUpdate(BaseModel):
    vendor_id: Optional[str] = None
    items: Optional[List[OrderItemInput]] = None
    order_date: Optional[datetime] = None
    expected_date: Optional[datetime] = None
    notes: Optional[str] = None
    terms: Optional[str] = None


class PurchaseOrderResponse(BaseModel):
    id: str
    order_number: str
    order_date: datetime
    expected_date: Optional[datetime]
    vendor_id: Optional[str]
    status: str
    subtotal: Decimal
    tax_amount: Decimal
    total_amount: Decimal
    quantity_ordered: Optional[Decimal]
    quantity_received: Optional[Decimal]
    notes: Optional[str]
    terms: Optional[str] = None
    created_at: datetime
    items: Optional[List[OrderItemResponse]] = None
    
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
    print("=" * 80)
    print("API ENDPOINT: Starting sales order creation")
    
    company = get_company_or_404(company_id, current_user, db)
    service = OrderService(db)
    
    try:
        print(f"API: Processing {len(data.items)} items from frontend")
        
        # Convert items to dict for service
        items_data = []
        for idx, item in enumerate(data.items):
            item_dict = item.model_dump()
            print(f"API: Item {idx} - unit_price: {item_dict.get('unit_price')}, rate: {item_dict.get('rate')}")
            items_data.append(item_dict)
        
        print(f"API: Calling service.create_sales_order")
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
        
        print(f"API: Order created successfully: {order.order_number}")
        print(f"API: Order has {len(order.items)} items")
        
        # Build items list for response
        items_response = []
        for idx, item in enumerate(order.items):
            print(f"\nAPI: Processing item {idx} for response:")
            print(f"  - id: {item.id}")
            print(f"  - unit_price: {item.unit_price}, type: {type(item.unit_price)}")
            print(f"  - gst_rate: {item.gst_rate}, type: {type(item.gst_rate)}")
            print(f"  - total_amount: {item.total_amount}, type: {type(item.total_amount)}")
            
            # Ensure all Decimal fields have values
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
        
        print(f"\nAPI: Building final response...")
        
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
        
        print(f"API: Response built successfully")
        
        # Test serialization
        try:
            response_json = response.model_dump_json()
            print(f"API: Response serialized to JSON successfully")
            print(f"API: First item in response: {items_response[0].model_dump() if items_response else 'No items'}")
        except Exception as json_error:
            print(f"API: JSON serialization error: {json_error}")
            import traceback
            traceback.print_exc()
            # Try to identify which field is causing the issue
            for field_name, field_value in response:
                try:
                    import json
                    json.dumps({field_name: field_value})
                except Exception as field_error:
                    print(f"API: Field '{field_name}' serialization error: {field_error}")
        
        print("=" * 80)
        return response
        
    except Exception as e:
        print(f"API: Error in endpoint: {e}")
        import traceback
        traceback.print_exc()
        print("=" * 80)
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
                taxable_amount=item.taxable_amount,
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
            taxable_amount=item.taxable_amount,
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
    
    order = service.create_purchase_order(
        company=company,
        vendor_id=data.vendor_id,
        items=[i.model_dump() for i in data.items],
        order_date=data.order_date,
        expected_date=data.expected_date,
        notes=data.notes,
        terms=data.terms,
    )
    
    return PurchaseOrderResponse(
        id=order.id,
        order_number=order.order_number,
        order_date=order.order_date,
        expected_date=order.expected_date,
        vendor_id=order.vendor_id,
        status=order.status.value,
        subtotal=order.subtotal,
        tax_amount=order.tax_amount,
        total_amount=order.total_amount,
        quantity_ordered=order.quantity_ordered,
        quantity_received=order.quantity_received,
        notes=order.notes,
        terms=order.terms,
        created_at=order.created_at,
    )


@router.get("/purchase", response_model=List[PurchaseOrderResponse])
async def list_purchase_orders(
    company_id: str,
    vendor_id: Optional[str] = None,
    status: Optional[str] = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """List purchase orders."""
    company = get_company_or_404(company_id, current_user, db)
    service = OrderService(db)
    
    order_status = None
    if status:
        try:
            order_status = OrderStatus(status)
        except ValueError:
            pass
    
    orders = service.get_purchase_orders(company, vendor_id, order_status)
    
    return [
        PurchaseOrderResponse(
            id=o.id,
            order_number=o.order_number,
            order_date=o.order_date,
            expected_date=o.expected_date,
            vendor_id=o.vendor_id,
            status=o.status.value,
            subtotal=o.subtotal or Decimal("0"),
            tax_amount=o.tax_amount or Decimal("0"),
            total_amount=o.total_amount or Decimal("0"),
            quantity_ordered=o.quantity_ordered,
            quantity_received=o.quantity_received,
            notes=o.notes,
            terms=o.terms,
            created_at=o.created_at,
        )
        for o in orders
    ]


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
    
    order = service.get_purchase_order_with_items(order_id, company)
    if not order:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    
    # Build items list
    items_response = [
        OrderItemResponse(
            id=item.id,
            product_id=item.product_id,
            description=item.description,
            quantity=item.quantity,
            unit=item.unit,
            rate=item.rate,
            gst_rate=item.gst_rate,
            tax_amount=item.tax_amount,
            total_amount=item.total_amount,
        )
        for item in order.items
    ]
    
    return PurchaseOrderResponse(
        id=order.id,
        order_number=order.order_number,
        order_date=order.order_date,
        expected_date=order.expected_date,
        vendor_id=order.vendor_id,
        status=order.status.value,
        subtotal=order.subtotal or Decimal("0"),
        tax_amount=order.tax_amount or Decimal("0"),
        total_amount=order.total_amount or Decimal("0"),
        quantity_ordered=order.quantity_ordered,
        quantity_received=order.quantity_received,
        notes=order.notes,
        terms=order.terms,
        created_at=order.created_at,
        items=items_response,
    )


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
    
    updated_order = service.update_purchase_order(
        order=order,
        vendor_id=data.vendor_id,
        items=[i.model_dump() for i in data.items] if data.items else None,
        order_date=data.order_date,
        expected_date=data.expected_date,
        notes=data.notes,
        terms=data.terms,
    )
    
    # Build items list for response
    items_response = [
        OrderItemResponse(
            id=item.id,
            description=item.description,
            quantity=item.quantity,
            unit=item.unit,
            rate=item.rate,
            gst_rate=item.gst_rate,
            tax_amount=item.tax_amount,
            total_amount=item.total_amount,
        )
        for item in updated_order.items
    ]
    
    return PurchaseOrderResponse(
        id=updated_order.id,
        order_number=updated_order.order_number,
        order_date=updated_order.order_date,
        expected_date=updated_order.expected_date,
        vendor_id=updated_order.vendor_id,
        status=updated_order.status.value,
        subtotal=updated_order.subtotal or Decimal("0"),
        tax_amount=updated_order.tax_amount or Decimal("0"),
        total_amount=updated_order.total_amount or Decimal("0"),
        quantity_ordered=updated_order.quantity_ordered,
        quantity_received=updated_order.quantity_received,
        notes=updated_order.notes,
        terms=updated_order.terms,
        created_at=updated_order.created_at,
        items=items_response,
    )


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