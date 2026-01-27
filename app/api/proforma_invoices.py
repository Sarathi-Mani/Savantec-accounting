"""Proforma Invoices API."""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime, date
from decimal import Decimal

from pydantic import BaseModel, Field
from app.database.connection import get_db
from app.database.models import User, Company
from app.services.proforma_service import ProformaInvoiceService
from app.auth.dependencies import get_current_active_user

router = APIRouter(prefix="/companies/{company_id}/proforma-invoices", tags=["Proforma Invoices"])


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

class ProformaInvoiceItemInput(BaseModel):
    product_id: Optional[str] = None
    item_code: Optional[str] = None
    description: str
    quantity: Decimal
    unit: str = "unit"
    unit_price: Decimal
    discount_percent: Decimal = Decimal("0")
    discount_amount: Decimal = Decimal("0")
    gst_rate: Decimal = Decimal("18")
    cgst_rate: Optional[Decimal] = None
    sgst_rate: Optional[Decimal] = None
    igst_rate: Optional[Decimal] = Decimal("0")
    taxable_amount: Optional[Decimal] = None
    total_amount: Optional[Decimal] = None
    
    class Config:
        json_encoders = {
            Decimal: str
        }


class ProformaInvoiceItemResponse(BaseModel):
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
    
    class Config:
        from_attributes = True
        json_encoders = {
            Decimal: str
        }


class ProformaInvoiceCreate(BaseModel):
    customer_id: str
    proforma_date: Optional[datetime] = None
    due_date: Optional[datetime] = None
    reference_no: Optional[str] = None
    reference_date: Optional[datetime] = None
    sales_person_id: Optional[str] = None
    contact_id: Optional[str] = None
    bank_account_id: Optional[str] = None
    notes: Optional[str] = None
    terms: Optional[str] = None
    freight_charges: Optional[Decimal] = Decimal("0")
    pf_charges: Optional[Decimal] = Decimal("0")
    round_off: Optional[Decimal] = Decimal("0")
    subtotal: Optional[Decimal] = None
    total_tax: Optional[Decimal] = None
    total_amount: Optional[Decimal] = None
    # New fields
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
    
    items: List[ProformaInvoiceItemInput]
    
    class Config:
        json_encoders = {
            Decimal: str
        }


class ProformaInvoiceResponse(BaseModel):
    id: str
    invoice_number: str
    proforma_date: datetime
    due_date: Optional[datetime]
    customer_id: str
    reference_no: Optional[str]
    reference_date: Optional[datetime]
    sales_person_id: Optional[str]
    contact_id: Optional[str]
    bank_account_id: Optional[str]
    notes: Optional[str]
    terms: Optional[str]
    freight_charges: Decimal
    pf_charges: Decimal
    round_off: Decimal
    subtotal: Decimal
    total_tax: Decimal
    total_amount: Decimal
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
    items: Optional[List[ProformaInvoiceItemResponse]] = None
    
    class Config:
        from_attributes = True
        json_encoders = {
            Decimal: str
        }


# ============== Proforma Invoice Endpoints ==============

@router.post("/", response_model=ProformaInvoiceResponse, status_code=status.HTTP_201_CREATED)
async def create_proforma_invoice(
    company_id: str,
    data: ProformaInvoiceCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Create a new proforma invoice."""
    company = get_company_or_404(company_id, current_user, db)
    service = ProformaInvoiceService(db)
    
    try:
        # Convert items to dict for service
        items_data = []
        for item in data.items:
            item_dict = item.model_dump()
            items_data.append(item_dict)
        
        invoice = service.create_proforma_invoice(
            company=company,
            customer_id=data.customer_id,
            items=items_data,
            proforma_date=data.proforma_date,
            due_date=data.due_date,
            reference_no=data.reference_no,
            reference_date=data.reference_date,
            sales_person_id=data.sales_person_id,
            contact_id=data.contact_id,
            bank_account_id=data.bank_account_id,
            notes=data.notes,
            terms=data.terms,
            freight_charges=data.freight_charges,
            pf_charges=data.pf_charges,
            round_off=data.round_off,
            subtotal=data.subtotal,
            total_tax=data.total_tax,
            total_amount=data.total_amount,
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
        for item in invoice.items:
            item_response = ProformaInvoiceItemResponse(
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
                taxable_amount=item.taxable_amount or Decimal("0"),
                total_amount=item.total_amount or Decimal("0"),
            )
            items_response.append(item_response)
        
        # Build the response with safe defaults
        response = ProformaInvoiceResponse(
            id=invoice.id,
            invoice_number=invoice.invoice_number,
            proforma_date=invoice.proforma_date,
            due_date=invoice.due_date,
            customer_id=invoice.customer_id,
            reference_no=invoice.reference_no,
            reference_date=invoice.reference_date,
            sales_person_id=invoice.sales_person_id,
            contact_id=invoice.contact_id,
            bank_account_id=invoice.bank_account_id,
            notes=invoice.notes,
            terms=invoice.terms,
            freight_charges=invoice.freight_charges or Decimal("0"),
            pf_charges=invoice.pf_charges or Decimal("0"),
            round_off=invoice.round_off or Decimal("0"),
            subtotal=invoice.subtotal or Decimal("0"),
            total_tax=invoice.total_tax or Decimal("0"),
            total_amount=invoice.total_amount or Decimal("0"),
            delivery_note=invoice.delivery_note,
            supplier_ref=invoice.supplier_ref,
            other_references=invoice.other_references,
            buyer_order_no=invoice.buyer_order_no,
            buyer_order_date=invoice.buyer_order_date,
            despatch_doc_no=invoice.despatch_doc_no,
            delivery_note_date=invoice.delivery_note_date,
            despatched_through=invoice.despatched_through,
            destination=invoice.destination,
            terms_of_delivery=invoice.terms_of_delivery,
            created_at=invoice.created_at,
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
        
        print("=" * 80)
        return response
        
    except Exception as e:
        print(f"API: Error in endpoint: {e}")
        import traceback
        traceback.print_exc()
        print("=" * 80)
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/", response_model=List[ProformaInvoiceResponse])
async def list_proforma_invoices(
    company_id: str,
    customer_id: Optional[str] = None,
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """List proforma invoices."""
    company = get_company_or_404(company_id, current_user, db)
    service = ProformaInvoiceService(db)
    
    # Convert date to datetime for filtering
    from_datetime = datetime.combine(from_date, datetime.min.time()) if from_date else None
    to_datetime = datetime.combine(to_date, datetime.max.time()) if to_date else None
    
    invoices = service.get_proforma_invoices(
        company=company, 
        customer_id=customer_id,
        from_date=from_datetime,
        to_date=to_datetime
    )
    
    result = []
    for invoice in invoices:
        # Build items list for each invoice
        items_response = [
            ProformaInvoiceItemResponse(
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
            )
            for item in invoice.items
        ]
        
        result.append(ProformaInvoiceResponse(
            id=invoice.id,
            invoice_number=invoice.invoice_number,
            proforma_date=invoice.proforma_date,
            due_date=invoice.due_date,
            customer_id=invoice.customer_id,
            reference_no=invoice.reference_no,
            reference_date=invoice.reference_date,
            sales_person_id=invoice.sales_person_id,
            contact_person=invoice.contact_person,
            bank_account_id=invoice.bank_account_id,
            notes=invoice.notes,
            terms=invoice.terms,
            freight_charges=invoice.freight_charges or Decimal("0"),
            pf_charges=invoice.pf_charges or Decimal("0"),
            round_off=invoice.round_off or Decimal("0"),
            subtotal=invoice.subtotal or Decimal("0"),
            total_tax=invoice.total_tax or Decimal("0"),
            total_amount=invoice.total_amount or Decimal("0"),
            delivery_note=invoice.delivery_note,
            supplier_ref=invoice.supplier_ref,
            other_references=invoice.other_references,
            buyer_order_no=invoice.buyer_order_no,
            buyer_order_date=invoice.buyer_order_date,
            despatch_doc_no=invoice.despatch_doc_no,
            delivery_note_date=invoice.delivery_note_date,
            despatched_through=invoice.despatched_through,
            destination=invoice.destination,
            terms_of_delivery=invoice.terms_of_delivery,
            created_at=invoice.created_at,
            items=items_response,
        ))
    
    return result


@router.get("/{invoice_id}", response_model=ProformaInvoiceResponse)
async def get_proforma_invoice(
    company_id: str,
    invoice_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get a proforma invoice by ID."""
    company = get_company_or_404(company_id, current_user, db)
    service = ProformaInvoiceService(db)
    
    invoice = service.get_proforma_invoice(invoice_id, company)
    if not invoice:
        raise HTTPException(status_code=404, detail="Proforma invoice not found")
    
    # Build items list
    items_response = [
        ProformaInvoiceItemResponse(
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
        )
        for item in invoice.items
    ]
    
    return ProformaInvoiceResponse(
        id=invoice.id,
        invoice_number=invoice.invoice_number,
        proforma_date=invoice.proforma_date,
        due_date=invoice.due_date,
        customer_id=invoice.customer_id,
        reference_no=invoice.reference_no,
        reference_date=invoice.reference_date,
        sales_person_id=invoice.sales_person_id,
        contact_person=invoice.contact_person,
        bank_account_id=invoice.bank_account_id,
        notes=invoice.notes,
        terms=invoice.terms,
        freight_charges=invoice.freight_charges or Decimal("0"),
        pf_charges=invoice.pf_charges or Decimal("0"),
        round_off=invoice.round_off or Decimal("0"),
        subtotal=invoice.subtotal or Decimal("0"),
        total_tax=invoice.total_tax or Decimal("0"),
        total_amount=invoice.total_amount or Decimal("0"),
        delivery_note=invoice.delivery_note,
        supplier_ref=invoice.supplier_ref,
        other_references=invoice.other_references,
        buyer_order_no=invoice.buyer_order_no,
        buyer_order_date=invoice.buyer_order_date,
        despatch_doc_no=invoice.despatch_doc_no,
        delivery_note_date=invoice.delivery_note_date,
        despatched_through=invoice.despatched_through,
        destination=invoice.destination,
        terms_of_delivery=invoice.terms_of_delivery,
        created_at=invoice.created_at,
        items=items_response,
    )