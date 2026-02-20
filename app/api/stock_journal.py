"""Stock Journal API - For stock adjustments, transfers, manufacturing, and conversions."""
from datetime import datetime, date
from decimal import Decimal
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.database.models import (
    User, Company, StockJournal, StockJournalItem, StockJournalType, StockJournalStatus
)
from app.auth.dependencies import get_current_active_user
from app.services.stock_journal_service import StockJournalService
from app.services.company_service import CompanyService


router = APIRouter(tags=["Stock Journal"])


def get_company_or_404(company_id: str, current_user: User, db: Session) -> Company:
    """Get company or raise 404."""
    company = CompanyService(db).get_company(company_id, current_user)
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    return company


# ==================== SCHEMAS ====================

class StockJournalItemCreate(BaseModel):
    product_id: str
    quantity: float
    rate: Optional[float] = None
    godown_id: Optional[str] = None
    batch_id: Optional[str] = None
    unit: Optional[str] = None
    cost_allocation_percent: Optional[float] = 100.0
    serial_numbers: Optional[List[str]] = None
    notes: Optional[str] = None


class StockJournalCreate(BaseModel):
    journal_type: str  # transfer, manufacturing, disassembly, repackaging, conversion, adjustment
    source_items: List[StockJournalItemCreate]
    destination_items: List[StockJournalItemCreate]
    voucher_date: Optional[datetime] = None
    from_godown_id: Optional[str] = None
    to_godown_id: Optional[str] = None
    bom_id: Optional[str] = None
    narration: Optional[str] = None
    notes: Optional[str] = None
    additional_cost: Optional[float] = 0
    additional_cost_type: Optional[str] = None
    auto_confirm: bool = False


class InterGodownTransferCreate(BaseModel):
    product_id: str
    quantity: float
    from_godown_id: str
    to_godown_id: str
    voucher_date: Optional[datetime] = None
    narration: Optional[str] = None
    auto_confirm: bool = True


class ProductConversionCreate(BaseModel):
    source_product_id: str
    source_quantity: float
    destination_product_id: str
    destination_quantity: float
    godown_id: Optional[str] = None
    voucher_date: Optional[datetime] = None
    narration: Optional[str] = None
    auto_confirm: bool = False


class StockAdjustmentCreate(BaseModel):
    product_id: str
    quantity: float
    adjustment_type: str  # "increase" or "decrease"
    godown_id: Optional[str] = None
    reason: Optional[str] = None
    voucher_date: Optional[datetime] = None
    auto_confirm: bool = True


class ManufacturingFromBOMCreate(BaseModel):
    bom_id: str
    output_quantity: float
    godown_id: Optional[str] = None
    voucher_date: Optional[datetime] = None
    narration: Optional[str] = None
    additional_cost: Optional[float] = 0
    auto_confirm: bool = False


class CancelRequest(BaseModel):
    reason: str


class StockJournalItemResponse(BaseModel):
    id: str
    item_type: str
    product_id: str
    product_name: Optional[str] = None
    godown_id: Optional[str] = None
    godown_name: Optional[str] = None
    batch_id: Optional[str] = None
    quantity: float
    unit: Optional[str]
    rate: float
    value: float
    cost_allocation_percent: Optional[float]
    notes: Optional[str]

    class Config:
        from_attributes = True


class StockJournalResponse(BaseModel):
    id: str
    voucher_number: str
    voucher_date: datetime
    journal_type: str
    status: str
    from_godown_id: Optional[str]
    from_godown_name: Optional[str] = None
    to_godown_id: Optional[str]
    to_godown_name: Optional[str] = None
    bom_id: Optional[str]
    bom_name: Optional[str] = None
    narration: Optional[str]
    notes: Optional[str]
    additional_cost: Optional[float]
    additional_cost_type: Optional[str]
    created_at: datetime
    confirmed_at: Optional[datetime]
    cancelled_at: Optional[datetime]
    cancellation_reason: Optional[str]
    source_items: Optional[List[StockJournalItemResponse]] = None
    destination_items: Optional[List[StockJournalItemResponse]] = None

    class Config:
        from_attributes = True


class StockJournalListResponse(BaseModel):
    items: List[StockJournalResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


# ==================== HELPER FUNCTIONS ====================

def _journal_to_response(journal: StockJournal, db: Session, include_items: bool = True) -> dict:
    """Convert StockJournal to response dict."""
    from_godown_name = None
    to_godown_name = None
    bom_name = None
    
    if journal.from_godown:
        from_godown_name = journal.from_godown.name
    if journal.to_godown:
        to_godown_name = journal.to_godown.name
    if journal.bom:
        bom_name = journal.bom.name
    
    response = {
        "id": journal.id,
        "voucher_number": journal.voucher_number,
        "voucher_date": journal.voucher_date,
        "journal_type": journal.journal_type.value if journal.journal_type else None,
        "status": journal.status.value if journal.status else None,
        "from_godown_id": journal.from_godown_id,
        "from_godown_name": from_godown_name,
        "to_godown_id": journal.to_godown_id,
        "to_godown_name": to_godown_name,
        "bom_id": journal.bom_id,
        "bom_name": bom_name,
        "narration": journal.narration,
        "notes": journal.notes,
        "additional_cost": float(journal.additional_cost) if journal.additional_cost else 0,
        "additional_cost_type": journal.additional_cost_type,
        "created_at": journal.created_at,
        "confirmed_at": journal.confirmed_at,
        "cancelled_at": journal.cancelled_at,
        "cancellation_reason": journal.cancellation_reason,
    }
    
    if include_items:
        source_items = db.query(StockJournalItem).filter(
            StockJournalItem.stock_journal_id == journal.id,
            StockJournalItem.item_type == "source"
        ).all()
        
        destination_items = db.query(StockJournalItem).filter(
            StockJournalItem.stock_journal_id == journal.id,
            StockJournalItem.item_type == "destination"
        ).all()
        
        response["source_items"] = [_item_to_response(item) for item in source_items]
        response["destination_items"] = [_item_to_response(item) for item in destination_items]
    
    return response


def _item_to_response(item: StockJournalItem) -> dict:
    """Convert StockJournalItem to response dict."""
    product_name = item.product.name if item.product else None
    godown_name = item.godown.name if item.godown else None
    
    return {
        "id": item.id,
        "item_type": item.item_type,
        "product_id": item.product_id,
        "product_name": product_name,
        "godown_id": item.godown_id,
        "godown_name": godown_name,
        "batch_id": item.batch_id,
        "quantity": float(item.quantity),
        "unit": item.unit,
        "rate": float(item.rate) if item.rate else 0,
        "value": float(item.value) if item.value else 0,
        "cost_allocation_percent": float(item.cost_allocation_percent) if item.cost_allocation_percent else 100,
        "notes": item.notes,
    }


# ==================== ENDPOINTS ====================

@router.post("/companies/{company_id}/stock-journals", response_model=StockJournalResponse, status_code=status.HTTP_201_CREATED)
async def create_stock_journal(
    company_id: str,
    data: StockJournalCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Create a new stock journal voucher."""
    company = get_company_or_404(company_id, current_user, db)
    service = StockJournalService(db)
    
    try:
        journal_type = StockJournalType(data.journal_type)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid journal type: {data.journal_type}")
    
    try:
        journal = service.create_stock_journal(
            company=company,
            journal_type=journal_type,
            source_items=[item.model_dump() for item in data.source_items],
            destination_items=[item.model_dump() for item in data.destination_items],
            voucher_date=data.voucher_date,
            from_godown_id=data.from_godown_id,
            to_godown_id=data.to_godown_id,
            bom_id=data.bom_id,
            narration=data.narration,
            notes=data.notes,
            additional_cost=Decimal(str(data.additional_cost or 0)),
            additional_cost_type=data.additional_cost_type,
            user_id=current_user.id,
            auto_confirm=data.auto_confirm,
        )
        return _journal_to_response(journal, db)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/companies/{company_id}/stock-journals", response_model=StockJournalListResponse)
async def list_stock_journals(
    company_id: str,
    journal_type: Optional[str] = None,
    status: Optional[str] = None,
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    page: int = 1,
    page_size: int = 20,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """List stock journals with filters and pagination."""
    get_company_or_404(company_id, current_user, db)
    service = StockJournalService(db)
    
    journal_type_enum = None
    status_enum = None
    
    if journal_type:
        try:
            journal_type_enum = StockJournalType(journal_type)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid journal type: {journal_type}")
    
    if status:
        try:
            status_enum = StockJournalStatus(status)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid status: {status}")
    
    fd = None
    td = None
    if from_date:
        try:
            fd = datetime.fromisoformat(from_date.replace('Z', '+00:00')).date()
        except ValueError:
            pass
    if to_date:
        try:
            td = datetime.fromisoformat(to_date.replace('Z', '+00:00')).date()
        except ValueError:
            pass
    
    result = service.list_stock_journals(
        company_id=company_id,
        journal_type=journal_type_enum,
        status=status_enum,
        from_date=fd,
        to_date=td,
        page=page,
        page_size=page_size,
    )
    
    return {
        "items": [_journal_to_response(j, db, include_items=False) for j in result["items"]],
        "total": result["total"],
        "page": result["page"],
        "page_size": result["page_size"],
        "total_pages": result["total_pages"],
    }


@router.get("/companies/{company_id}/stock-journals/{journal_id}", response_model=StockJournalResponse)
async def get_stock_journal(
    company_id: str,
    journal_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get a stock journal by ID."""
    get_company_or_404(company_id, current_user, db)
    service = StockJournalService(db)
    
    journal = service.get_stock_journal(company_id, journal_id)
    if not journal:
        raise HTTPException(status_code=404, detail="Stock journal not found")
    
    return _journal_to_response(journal, db)


@router.post("/companies/{company_id}/stock-journals/{journal_id}/confirm", response_model=StockJournalResponse)
async def confirm_stock_journal(
    company_id: str,
    journal_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Confirm a draft stock journal (creates actual stock entries)."""
    get_company_or_404(company_id, current_user, db)
    service = StockJournalService(db)
    
    journal = service.get_stock_journal(company_id, journal_id)
    if not journal:
        raise HTTPException(status_code=404, detail="Stock journal not found")
    
    try:
        journal = service.confirm_stock_journal(journal, current_user.id)
        return _journal_to_response(journal, db)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/companies/{company_id}/stock-journals/{journal_id}/cancel", response_model=StockJournalResponse)
async def cancel_stock_journal(
    company_id: str,
    journal_id: str,
    data: CancelRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Cancel a stock journal (reverses stock entries if confirmed)."""
    get_company_or_404(company_id, current_user, db)
    service = StockJournalService(db)
    
    journal = service.get_stock_journal(company_id, journal_id)
    if not journal:
        raise HTTPException(status_code=404, detail="Stock journal not found")
    
    try:
        journal = service.cancel_stock_journal(journal, data.reason, current_user.id)
        return _journal_to_response(journal, db)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/companies/{company_id}/stock-journals/{journal_id}")
async def delete_stock_journal(
    company_id: str,
    journal_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Delete a draft stock journal."""
    get_company_or_404(company_id, current_user, db)
    service = StockJournalService(db)
    
    journal = service.get_stock_journal(company_id, journal_id)
    if not journal:
        raise HTTPException(status_code=404, detail="Stock journal not found")
    
    try:
        service.delete_stock_journal(journal)
        return {"message": "Stock journal deleted successfully"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ==================== QUICK OPERATIONS ====================

@router.post("/companies/{company_id}/stock-journals/transfer", response_model=StockJournalResponse, status_code=status.HTTP_201_CREATED)
async def create_inter_godown_transfer(
    company_id: str,
    data: InterGodownTransferCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Quick endpoint for inter-godown transfer."""
    company = get_company_or_404(company_id, current_user, db)
    service = StockJournalService(db)
    
    try:
        journal = service.create_inter_godown_transfer(
            company=company,
            product_id=data.product_id,
            quantity=Decimal(str(data.quantity)),
            from_godown_id=data.from_godown_id,
            to_godown_id=data.to_godown_id,
            voucher_date=data.voucher_date,
            narration=data.narration,
            user_id=current_user.id,
            auto_confirm=data.auto_confirm,
        )
        return _journal_to_response(journal, db)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/companies/{company_id}/stock-journals/conversion", response_model=StockJournalResponse, status_code=status.HTTP_201_CREATED)
async def create_product_conversion(
    company_id: str,
    data: ProductConversionCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Quick endpoint for product conversion (A -> B or A sold as B)."""
    company = get_company_or_404(company_id, current_user, db)
    service = StockJournalService(db)
    
    try:
        journal = service.create_product_conversion(
            company=company,
            source_product_id=data.source_product_id,
            source_quantity=Decimal(str(data.source_quantity)),
            destination_product_id=data.destination_product_id,
            destination_quantity=Decimal(str(data.destination_quantity)),
            godown_id=data.godown_id,
            voucher_date=data.voucher_date,
            narration=data.narration,
            user_id=current_user.id,
            auto_confirm=data.auto_confirm,
        )
        return _journal_to_response(journal, db)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/companies/{company_id}/stock-journals/adjustment", response_model=StockJournalResponse, status_code=status.HTTP_201_CREATED)
async def create_stock_adjustment(
    company_id: str,
    data: StockAdjustmentCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Quick endpoint for stock adjustment (damage, expiry, samples, etc.)."""
    company = get_company_or_404(company_id, current_user, db)
    service = StockJournalService(db)
    
    if data.adjustment_type not in ["increase", "decrease"]:
        raise HTTPException(status_code=400, detail="adjustment_type must be 'increase' or 'decrease'")
    
    try:
        journal = service.create_stock_adjustment(
            company=company,
            product_id=data.product_id,
            quantity=Decimal(str(data.quantity)),
            adjustment_type=data.adjustment_type,
            godown_id=data.godown_id,
            reason=data.reason,
            voucher_date=data.voucher_date,
            user_id=current_user.id,
            auto_confirm=data.auto_confirm,
        )
        return _journal_to_response(journal, db)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/companies/{company_id}/stock-journals/manufacturing", response_model=StockJournalResponse, status_code=status.HTTP_201_CREATED)
async def create_manufacturing_from_bom(
    company_id: str,
    data: ManufacturingFromBOMCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Create manufacturing journal from Bill of Materials."""
    company = get_company_or_404(company_id, current_user, db)
    service = StockJournalService(db)
    
    try:
        journal = service.create_manufacturing_from_bom(
            company=company,
            bom_id=data.bom_id,
            output_quantity=Decimal(str(data.output_quantity)),
            godown_id=data.godown_id,
            voucher_date=data.voucher_date,
            narration=data.narration,
            additional_cost=Decimal(str(data.additional_cost or 0)),
            user_id=current_user.id,
            auto_confirm=data.auto_confirm,
        )
        return _journal_to_response(journal, db)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ==================== STOCK LEDGER ====================

@router.get("/companies/{company_id}/stock-ledger/{product_id}")
async def get_stock_ledger(
    company_id: str,
    product_id: str,
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    godown_id: Optional[str] = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get stock ledger for a product (Tally-style item movement report).
    
    Shows all stock movements with running balance.
    """
    get_company_or_404(company_id, current_user, db)
    service = StockJournalService(db)
    
    fd = None
    td = None
    if from_date:
        try:
            fd = datetime.fromisoformat(from_date.replace('Z', '+00:00')).date()
        except ValueError:
            pass
    if to_date:
        try:
            td = datetime.fromisoformat(to_date.replace('Z', '+00:00')).date()
        except ValueError:
            pass
    
    return service.get_stock_ledger(
        company_id=company_id,
        product_id=product_id,
        from_date=fd,
        to_date=td,
        godown_id=godown_id,
    )


@router.get("/companies/{company_id}/godown-stock-summary")
async def get_godown_stock_summary(
    company_id: str,
    godown_id: Optional[str] = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get stock summary by godown."""
    get_company_or_404(company_id, current_user, db)
    service = StockJournalService(db)
    
    return service.get_godown_stock_summary(company_id, godown_id)
