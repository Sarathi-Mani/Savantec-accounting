"""Purchase Request API routes."""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime

from app.database.connection import get_db
from app.database.models import User, Company, PurchaseRequest
from app.schemas.purchase_request import (
    PurchaseRequestCreate, 
    PurchaseRequestUpdate, 
    PurchaseRequestResponse,
    PurchaseRequestListResponse,
    PurchaseRequestStats,
    PurchaseRequestStatus
)
from app.services.purchase_request_service import PurchaseRequestService
from app.services.company_service import CompanyService
from app.auth.dependencies import get_current_active_user

router = APIRouter(prefix="/companies/{company_id}/purchase-requests", tags=["Purchase Requests"])


def get_company_or_404(company_id: str, user: User, db: Session) -> Company:
    """Get company or raise 404."""
    service = CompanyService(db)
    company = service.get_company(company_id, user)
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found"
        )
    return company


@router.post("", response_model=PurchaseRequestResponse, status_code=status.HTTP_201_CREATED)
async def create_purchase_request(
    company_id: str,
    data: PurchaseRequestCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Create a new purchase request."""
    company = get_company_or_404(company_id, current_user, db)
    service = PurchaseRequestService(db)
    
    try:
        purchase_request = service.create_purchase_request(company, data, current_user)
        
        # Convert to response format
        response_data = PurchaseRequestResponse(
            id=purchase_request.id,
            request_number=purchase_request.request_number,
            request_date=purchase_request.request_date,
            customer_id=purchase_request.customer_id,
            customer_name=purchase_request.customer_name,
            items=purchase_request.items,
            notes=purchase_request.notes,
            status=purchase_request.status,
            approved_by=purchase_request.approved_by,
            approved_at=purchase_request.approved_at,
            approval_notes=purchase_request.approval_notes,
            created_at=purchase_request.created_at,
            updated_at=purchase_request.updated_at,
            total_items=len(purchase_request.items) if purchase_request.items else 0,
            total_quantity=sum(item.get('quantity', 0) for item in (purchase_request.items or []))
        )
        
        return response_data
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to create purchase request: {str(e)}"
        )


@router.get("", response_model=PurchaseRequestListResponse)
async def list_purchase_requests(
    company_id: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[PurchaseRequestStatus] = None,
    customer_id: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    search: Optional[str] = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """List purchase requests for a company."""
    company = get_company_or_404(company_id, current_user, db)
    service = PurchaseRequestService(db)
    
    purchase_requests, total = service.get_purchase_requests(
        company, page, page_size, status, customer_id, 
        start_date, end_date, search
    )
    
    # Convert to response format
    request_responses = []
    for pr in purchase_requests:
        response_data = PurchaseRequestResponse(
            id=pr.id,
            request_number=pr.request_number,
            request_date=pr.request_date,
            customer_id=pr.customer_id,
            customer_name=pr.customer_name,
            items=pr.items,
            notes=pr.notes,
            status=pr.status,
            approved_by=pr.approved_by,
            approved_at=pr.approved_at,
            approval_notes=pr.approval_notes,
            created_at=pr.created_at,
            updated_at=pr.updated_at,
            total_items=len(pr.items) if pr.items else 0,
            total_quantity=sum(item.get('quantity', 0) for item in (pr.items or []))
        )
        request_responses.append(response_data)
    
    return PurchaseRequestListResponse(
        purchase_requests=request_responses,
        total=total,
        page=page,
        page_size=page_size
    )


@router.get("/{request_id}", response_model=PurchaseRequestResponse)
async def get_purchase_request(
    company_id: str,
    request_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get purchase request by ID."""
    company = get_company_or_404(company_id, current_user, db)
    service = PurchaseRequestService(db)
    purchase_request = service.get_purchase_request(request_id, company)
    
    if not purchase_request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Purchase request not found"
        )
    
    # Convert to response format
    response_data = PurchaseRequestResponse(
        id=purchase_request.id,
        request_number=purchase_request.request_number,
        request_date=purchase_request.request_date,
        customer_id=purchase_request.customer_id,
        customer_name=purchase_request.customer_name,
        items=purchase_request.items,
        notes=purchase_request.notes,
        status=purchase_request.status,
        approved_by=purchase_request.approved_by,
        approved_at=purchase_request.approved_at,
        approval_notes=purchase_request.approval_notes,
        created_at=purchase_request.created_at,
        updated_at=purchase_request.updated_at,
        total_items=len(purchase_request.items) if purchase_request.items else 0,
        total_quantity=sum(item.get('quantity', 0) for item in (purchase_request.items or []))
    )
    
    return response_data


@router.put("/{request_id}/status", response_model=PurchaseRequestResponse)
async def update_purchase_request_status(
    company_id: str,
    request_id: str,
    data: PurchaseRequestUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update purchase request status."""
    company = get_company_or_404(company_id, current_user, db)
    service = PurchaseRequestService(db)
    purchase_request = service.get_purchase_request(request_id, company)
    
    if not purchase_request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Purchase request not found"
        )
    
    # Check if already approved/rejected
    if purchase_request.status in [PurchaseRequestStatus.APPROVED, PurchaseRequestStatus.REJECTED]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot update a {purchase_request.status} request"
        )
    
    # Update status
    updated_request = service.update_status(purchase_request, data, current_user)
    
    # Convert to response format
    response_data = PurchaseRequestResponse(
        id=updated_request.id,
        request_number=updated_request.request_number,
        request_date=updated_request.request_date,
        customer_id=updated_request.customer_id,
        customer_name=updated_request.customer_name,
        items=updated_request.items,
        notes=updated_request.notes,
        status=updated_request.status,
        approved_by=updated_request.approved_by,
        approved_at=updated_request.approved_at,
        approval_notes=updated_request.approval_notes,
        created_at=updated_request.created_at,
        updated_at=updated_request.updated_at,
        total_items=len(updated_request.items) if updated_request.items else 0,
        total_quantity=sum(item.get('quantity', 0) for item in (updated_request.items or []))
    )
    
    return response_data


@router.delete("/{request_id}")
async def delete_purchase_request(
    company_id: str,
    request_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Delete purchase request."""
    company = get_company_or_404(company_id, current_user, db)
    service = PurchaseRequestService(db)
    purchase_request = service.get_purchase_request(request_id, company)
    
    if not purchase_request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Purchase request not found"
        )
    
    # Only allow deletion of pending requests
    if purchase_request.status != PurchaseRequestStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only delete pending requests"
        )
    
    service.delete_purchase_request(purchase_request)
    return {"message": "Purchase request deleted successfully"}


@router.get("/stats/summary", response_model=PurchaseRequestStats)
async def get_purchase_request_stats(
    company_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get purchase request statistics."""
    company = get_company_or_404(company_id, current_user, db)
    service = PurchaseRequestService(db)
    
    stats = service.get_statistics(company)
    return PurchaseRequestStats(**stats)


@router.get("/by-make/{make}")
async def get_purchase_requests_by_make(
    company_id: str,
    make: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get purchase requests by item make/brand."""
    company = get_company_or_404(company_id, current_user, db)
    service = PurchaseRequestService(db)
    
    requests = service.get_requests_by_make(company, make)
    
    # Convert to response format
    request_responses = []
    for pr in requests:
        response_data = PurchaseRequestResponse(
            id=pr.id,
            request_number=pr.request_number,
            request_date=pr.request_date,
            customer_id=pr.customer_id,
            customer_name=pr.customer_name,
            items=pr.items,
            notes=pr.notes,
            status=pr.status,
            approved_by=pr.approved_by,
            approved_at=pr.approved_at,
            approval_notes=pr.approval_notes,
            created_at=pr.created_at,
            updated_at=pr.updated_at,
            total_items=len(pr.items) if pr.items else 0,
            total_quantity=sum(item.get('quantity', 0) for item in (pr.items or []))
        )
        request_responses.append(response_data)
    
    return {
        "make": make,
        "total": len(request_responses),
        "purchase_requests": request_responses
    }