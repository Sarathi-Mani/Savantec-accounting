"""Purchase Request API routes."""
from fastapi import APIRouter, Depends, HTTPException, status, Query, Body
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime
from decimal import Decimal
import json

from app.database.connection import get_db
from app.database.models import User, Company, PurchaseRequest
from app.database.payroll_models import  Employee
from app.schemas.purchase_request import (
    PurchaseRequestCreate, 
    PurchaseRequestUpdate, 
    PurchaseRequestResponse,
    PurchaseRequestListResponse,
    PurchaseRequestStats,
    PurchaseRequestStatus,
    PurchaseOverallStatus,
    PurchaseRequestBulkUpdate,
    PurchaseRequestItemApprovalUpdate,
    PurchaseRequestExportRequest,
    PurchaseRequestItemApprovalSummary,
    PurchaseRequestSearchResponse
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
    """Create a new purchase request with all new columns."""
    company = get_company_or_404(company_id, current_user, db)
    service = PurchaseRequestService(db)
    
    try:
        purchase_request = service.create_purchase_request(company, data, current_user)
        
        # Convert to response format with new fields
        response_data = PurchaseRequestResponse(
            id=purchase_request.id,
            purchase_req_no=purchase_request.purchase_req_no,
            request_number=purchase_request.request_number,
            request_date=purchase_request.request_date,
            customer_id=purchase_request.customer_id,
            customer_name=purchase_request.customer_name,
            items=purchase_request.items,
            overall_status=purchase_request.overall_status,
            # Map status to approval_status for the response
            status=purchase_request.status,  # This was incorrectly trying to access approval_status
            store_remarks=purchase_request.store_remarks,
            notes=purchase_request.notes,  # Note: service uses 'notes' not 'general_notes'
            additional_notes=purchase_request.additional_notes,
            
            # Approval fields - these might not be set on creation
            approved_by_user=purchase_request.approved_by_user,
            approved_by_employee=purchase_request.approved_by_employee,
            approved_by_name=purchase_request.approved_by_name,
            approved_by_email=purchase_request.approved_by_email,
            approved_at=purchase_request.approved_at,
            approval_notes=purchase_request.approval_notes,
            
            # Audit fields
            created_by_user=purchase_request.created_by_user,
            created_by_employee=purchase_request.created_by_employee,
            created_by_name=purchase_request.created_by_name,
            created_by_email=purchase_request.created_by_email,
            updated_by_user=purchase_request.updated_by_user,
            updated_by_employee=purchase_request.updated_by_employee,
            
            # Timestamps
            created_at=purchase_request.created_at,
            updated_at=purchase_request.updated_at,
            
            # Calculated fields
            total_items=len(purchase_request.items) if purchase_request.items else 0,
            total_quantity=sum(item.get('quantity', 0) for item in (purchase_request.items or [])),
            total_amount=sum(
                float(item.get('total_amount', 0) or 
                     (float(item.get('unit_price', 0)) * float(item.get('quantity', 0)) if item.get('unit_price') else 0))
                for item in (purchase_request.items or [])
            )
        )
        
        return response_data
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create purchase request: {str(e)}"
        )
    

@router.get("", response_model=PurchaseRequestListResponse)
async def list_purchase_requests(
    company_id: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    overall_status: Optional[PurchaseOverallStatus] = None,
    status: Optional[PurchaseRequestStatus] = None,
    customer_id: Optional[str] = None,
    brand_id: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    search: Optional[str] = None,
    created_by_user: Optional[str] = None,
    created_by_employee: Optional[str] = None,
    sort_by: str = Query("request_date", description="Field to sort by"),
    sort_order: str = Query("desc", description="Sort order: asc or desc"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """List purchase requests for a company with enhanced filtering."""
    company = get_company_or_404(company_id, current_user, db)
    service = PurchaseRequestService(db)
    
    purchase_requests, total = service.get_purchase_requests(
        company=company,
        page=page,
        page_size=page_size,
        overall_status=overall_status.value if overall_status else None,
        approval_status=status.value if status else None,
        customer_id=customer_id,
        brand_id=brand_id,
        start_date=start_date,
        end_date=end_date,
        search=search,
        created_by_user=created_by_user,
        created_by_employee=created_by_employee,
        sort_by=sort_by,
        sort_order=sort_order
    )
    
    # Convert to response format
    request_responses = []
    for pr in purchase_requests:
        response_data = PurchaseRequestResponse(
            id=pr.id,
            purchase_req_no=pr.purchase_req_no,
            request_number=pr.request_number,
            request_date=pr.request_date,
            customer_id=pr.customer_id,
            customer_name=pr.customer_name,
            items=pr.items,
            overall_status=pr.overall_status,
            status=pr.status,
            store_remarks=pr.store_remarks,
            notes=pr.notes,
            additional_notes=pr.additional_notes,
            
            # Approval fields
            approved_by_user=pr.approved_by_user,
            approved_by_employee=pr.approved_by_employee,
            approved_by_name=pr.approved_by_name,
            approved_by_email=pr.approved_by_email,
            approved_at=pr.approved_at,
            approval_notes=pr.approval_notes,
            
            # Audit fields
            created_by_user=pr.created_by_user,
            created_by_employee=pr.created_by_employee,
            created_by_name=pr.created_by_name,
            created_by_email=pr.created_by_email,
            updated_by_user=pr.updated_by_user,
            updated_by_employee=pr.updated_by_employee,
            
            # Timestamps
            created_at=pr.created_at,
            updated_at=pr.updated_at,
            
            # Calculated fields
            total_items=len(pr.items) if pr.items else 0,
            total_quantity=sum(item.get('quantity', 0) for item in (pr.items or [])),
            total_amount=sum(
                float(item.get('total_amount', 0) or 
                     (float(item.get('unit_price', 0)) * float(item.get('quantity', 0)) if item.get('unit_price') else 0))
                for item in (pr.items or [])
            )
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
        purchase_req_no=purchase_request.purchase_req_no,
        request_number=purchase_request.request_number,
        request_date=purchase_request.request_date,
        customer_id=purchase_request.customer_id,
        customer_name=purchase_request.customer_name,
        items=purchase_request.items,
        overall_status=purchase_request.overall_status,
        status=purchase_request.status,
        store_remarks=purchase_request.store_remarks,
        notes=purchase_request.notes,
        additional_notes=purchase_request.additional_notes,
        
        # Approval fields
        approved_by_user=purchase_request.approved_by_user,
        approved_by_employee=purchase_request.approved_by_employee,
        approved_by_name=purchase_request.approved_by_name,
        approved_by_email=purchase_request.approved_by_email,
        approved_at=purchase_request.approved_at,
        approval_notes=purchase_request.approval_notes,
        
        # Audit fields
        created_by_user=purchase_request.created_by_user,
        created_by_employee=purchase_request.created_by_employee,
        created_by_name=purchase_request.created_by_name,
        created_by_email=purchase_request.created_by_email,
        updated_by_user=purchase_request.updated_by_user,
        updated_by_employee=purchase_request.updated_by_employee,
        
        # Timestamps
        created_at=purchase_request.created_at,
        updated_at=purchase_request.updated_at,
        
        # Calculated fields
        total_items=len(purchase_request.items) if purchase_request.items else 0,
        total_quantity=sum(item.get('quantity', 0) for item in (purchase_request.items or [])),
        total_amount=sum(
            float(item.get('total_amount', 0) or 
                 (float(item.get('unit_price', 0)) * float(item.get('quantity', 0)) if item.get('unit_price') else 0))
            for item in (purchase_request.items or [])
        )
    )
    
    return response_data


@router.get("/by-number/{purchase_req_no}", response_model=PurchaseRequestResponse)
async def get_purchase_request_by_number(
    company_id: str,
    purchase_req_no: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get purchase request by purchase_req_no."""
    company = get_company_or_404(company_id, current_user, db)
    service = PurchaseRequestService(db)
    purchase_request = service.get_purchase_request_by_number(purchase_req_no, company)
    
    if not purchase_request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Purchase request not found"
        )
    
    # Convert to response format
    response_data = PurchaseRequestResponse(
        id=purchase_request.id,
        purchase_req_no=purchase_request.purchase_req_no,
        request_number=purchase_request.request_number,
        request_date=purchase_request.request_date,
        customer_id=purchase_request.customer_id,
        customer_name=purchase_request.customer_name,
        items=purchase_request.items,
        overall_status=purchase_request.overall_status,
        status=purchase_request.status,
        store_remarks=purchase_request.store_remarks,
        notes=purchase_request.notes,
        additional_notes=purchase_request.additional_notes,
        
        # Approval fields
        approved_by_user=purchase_request.approved_by_user,
        approved_by_employee=purchase_request.approved_by_employee,
        approved_by_name=purchase_request.approved_by_name,
        approved_by_email=purchase_request.approved_by_email,
        approved_at=purchase_request.approved_at,
        approval_notes=purchase_request.approval_notes,
        
        # Audit fields
        created_by_user=purchase_request.created_by_user,
        created_by_employee=purchase_request.created_by_employee,
        created_by_name=purchase_request.created_by_name,
        created_by_email=purchase_request.created_by_email,
        updated_by_user=purchase_request.updated_by_user,
        updated_by_employee=purchase_request.updated_by_employee,
        
        # Timestamps
        created_at=purchase_request.created_at,
        updated_at=purchase_request.updated_at,
        
        # Calculated fields
        total_items=len(purchase_request.items) if purchase_request.items else 0,
        total_quantity=sum(item.get('quantity', 0) for item in (purchase_request.items or [])),
        total_amount=sum(
            float(item.get('total_amount', 0) or 
                 (float(item.get('unit_price', 0)) * float(item.get('quantity', 0)) if item.get('unit_price') else 0))
            for item in (purchase_request.items or [])
        )
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
    
    # Update status
    updated_request = service.update_status(purchase_request, data, current_user)
    
    # Convert to response format - USE CORRECT FIELD NAMES
    response_data = PurchaseRequestResponse(
        id=updated_request.id,
        purchase_req_no=updated_request.purchase_req_no,
        request_number=updated_request.request_number,
        request_date=updated_request.request_date,
        customer_id=updated_request.customer_id,
        customer_name=updated_request.customer_name,
        items=updated_request.items,
        overall_status=updated_request.overall_status,
        status=updated_request.status,  # CORRECT: Use 'status' not 'approval_status'
        store_remarks=updated_request.store_remarks or "",  # Provide default
        notes=updated_request.notes or "",  # CORRECT: Use 'notes' not 'general_notes'
        additional_notes=updated_request.additional_notes or "",  # Provide default
        
        # Approval fields
        approved_by_user=updated_request.approved_by_user,
        approved_by_employee=updated_request.approved_by_employee,
        approved_by_name=updated_request.approved_by_name,
        approved_by_email=updated_request.approved_by_email,
        approved_at=updated_request.approved_at,
        approval_notes=updated_request.approval_notes or "",  # Provide default
        
        # Audit fields
        created_by_user=updated_request.created_by_user,
        created_by_employee=updated_request.created_by_employee,
        created_by_name=updated_request.created_by_name or "",  # Provide default
        created_by_email=updated_request.created_by_email or "",  # Provide default
        updated_by_user=updated_request.updated_by_user,
        updated_by_employee=updated_request.updated_by_employee,
        
        # Timestamps
        created_at=updated_request.created_at,
        updated_at=updated_request.updated_at,
        
        # Calculated fields
        total_items=len(updated_request.items) if updated_request.items else 0,
        total_quantity=sum(item.get('quantity', 0) for item in (updated_request.items or [])),
        total_amount=sum(
            float(item.get('total_amount', 0) or 
                 (float(item.get('unit_price', 0)) * float(item.get('quantity', 0)) if item.get('unit_price') else 0))
            for item in (updated_request.items or [])
        )
    )
    
    return response_data

@router.put("/{request_id}", response_model=PurchaseRequestResponse)
async def update_purchase_request(
    company_id: str,
    request_id: str,
    data: PurchaseRequestUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update purchase request details."""
    company = get_company_or_404(company_id, current_user, db)
    service = PurchaseRequestService(db)
    purchase_request = service.get_purchase_request(request_id, company)
    
    if not purchase_request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Purchase request not found"
        )
    
    # Convert Pydantic model to dict for service
    update_data = data.dict(exclude_unset=True)
    
    # Update purchase request
    updated_request = service.update_purchase_request(purchase_request, update_data, current_user)
    
    # Convert to response format
    response_data = PurchaseRequestResponse(
        id=updated_request.id,
        purchase_req_no=updated_request.purchase_req_no,
        request_number=updated_request.request_number,
        request_date=updated_request.request_date,
        customer_id=updated_request.customer_id,
        customer_name=updated_request.customer_name,
        items=updated_request.items,
        overall_status=updated_request.overall_status,
        approval_status=updated_request.approval_status,
        store_remarks=updated_request.store_remarks,
        general_notes=updated_request.general_notes,
        additional_notes=updated_request.additional_notes,
        
        # Approval fields
        approved_by_user=updated_request.approved_by_user,
        approved_by_employee=updated_request.approved_by_employee,
        approved_by_name=updated_request.approved_by_name,
        approved_by_email=updated_request.approved_by_email,
        approved_at=updated_request.approved_at,
        approval_notes=updated_request.approval_notes,
        
        # Audit fields
        created_by_user=updated_request.created_by_user,
        created_by_employee=updated_request.created_by_employee,
        created_by_name=updated_request.created_by_name,
        created_by_email=updated_request.created_by_email,
        updated_by_user=updated_request.updated_by_user,
        updated_by_employee=updated_request.updated_by_employee,
        
        # Timestamps
        created_at=updated_request.created_at,
        updated_at=updated_request.updated_at,
        
        # Calculated fields
        total_items=len(updated_request.items) if updated_request.items else 0,
        total_quantity=sum(item.get('quantity', 0) for item in (updated_request.items or [])),
        total_amount=sum(
            float(item.get('total_amount', 0) or 
                 (float(item.get('unit_price', 0)) * float(item.get('quantity', 0)) if item.get('unit_price') else 0))
            for item in (updated_request.items or [])
        )
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
    if purchase_request.approval_status != PurchaseRequestStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only delete pending requests"
        )
    
    service.delete_purchase_request(purchase_request, current_user)
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


@router.get("/by-creator/{user_id}")
async def get_purchase_requests_by_creator(
    company_id: str,
    user_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get purchase requests created by specific user/employee."""
    company = get_company_or_404(company_id, current_user, db)
    service = PurchaseRequestService(db)
    
    requests, total = service.get_requests_by_creator(company, user_id)
    
    # Convert to response format
    request_responses = []
    for pr in requests:
        response_data = PurchaseRequestResponse(
            id=pr.id,
            purchase_req_no=pr.purchase_req_no,
            request_number=pr.request_number,
            request_date=pr.request_date,
            customer_id=pr.customer_id,
            customer_name=pr.customer_name,
            items=pr.items,
            overall_status=pr.overall_status,
            approval_status=pr.approval_status,
            store_remarks=pr.store_remarks,
            general_notes=pr.general_notes,
            additional_notes=pr.additional_notes,
            
            # Approval fields
            approved_by_user=pr.approved_by_user,
            approved_by_employee=pr.approved_by_employee,
            approved_by_name=pr.approved_by_name,
            approved_by_email=pr.approved_by_email,
            approved_at=pr.approved_at,
            approval_notes=pr.approval_notes,
            
            # Audit fields
            created_by_user=pr.created_by_user,
            created_by_employee=pr.created_by_employee,
            created_by_name=pr.created_by_name,
            created_by_email=pr.created_by_email,
            updated_by_user=pr.updated_by_user,
            updated_by_employee=pr.updated_by_employee,
            
            # Timestamps
            created_at=pr.created_at,
            updated_at=pr.updated_at,
            
            # Calculated fields
            total_items=len(pr.items) if pr.items else 0,
            total_quantity=sum(item.get('quantity', 0) for item in (pr.items or [])),
            total_amount=sum(
                float(item.get('total_amount', 0) or 
                     (float(item.get('unit_price', 0)) * float(item.get('quantity', 0)) if item.get('unit_price') else 0))
                for item in (pr.items or [])
            )
        )
        request_responses.append(response_data)
    
    return {
        "creator_id": user_id,
        "total": total,
        "purchase_requests": request_responses
    }


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
            purchase_req_no=pr.purchase_req_no,
            request_number=pr.request_number,
            request_date=pr.request_date,
            customer_id=pr.customer_id,
            customer_name=pr.customer_name,
            items=pr.items,
            overall_status=pr.overall_status,
            approval_status=pr.approval_status,
            store_remarks=pr.store_remarks,
            general_notes=pr.general_notes,
            additional_notes=pr.additional_notes,
            
            # Approval fields
            approved_by_user=pr.approved_by_user,
            approved_by_employee=pr.approved_by_employee,
            approved_by_name=pr.approved_by_name,
            approved_by_email=pr.approved_by_email,
            approved_at=pr.approved_at,
            approval_notes=pr.approval_notes,
            
            # Audit fields
            created_by_user=pr.created_by_user,
            created_by_employee=pr.created_by_employee,
            created_by_name=pr.created_by_name,
            created_by_email=pr.created_by_email,
            updated_by_user=pr.updated_by_user,
            updated_by_employee=pr.updated_by_employee,
            
            # Timestamps
            created_at=pr.created_at,
            updated_at=pr.updated_at,
            
            # Calculated fields
            total_items=len(pr.items) if pr.items else 0,
            total_quantity=sum(item.get('quantity', 0) for item in (pr.items or [])),
            total_amount=sum(
                float(item.get('total_amount', 0) or 
                     (float(item.get('unit_price', 0)) * float(item.get('quantity', 0)) if item.get('unit_price') else 0))
                for item in (pr.items or [])
            )
        )
        request_responses.append(response_data)
    
    return {
        "make": make,
        "total": len(request_responses),
        "purchase_requests": request_responses
    }


@router.get("/recent")
async def get_recent_purchase_requests(
    company_id: str,
    limit: int = Query(10, ge=1, le=50),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get recent purchase requests."""
    company = get_company_or_404(company_id, current_user, db)
    service = PurchaseRequestService(db)
    
    requests = service.get_recent_requests(company, limit)
    
    # Convert to response format
    request_responses = []
    for pr in requests:
        response_data = PurchaseRequestResponse(
            id=pr.id,
            purchase_req_no=pr.purchase_req_no,
            request_number=pr.request_number,
            request_date=pr.request_date,
            customer_id=pr.customer_id,
            customer_name=pr.customer_name,
            items=pr.items,
            overall_status=pr.overall_status,
            approval_status=pr.approval_status,
            store_remarks=pr.store_remarks,
            general_notes=pr.general_notes,
            additional_notes=pr.additional_notes,
            
            # Approval fields
            approved_by_user=pr.approved_by_user,
            approved_by_employee=pr.approved_by_employee,
            approved_by_name=pr.approved_by_name,
            approved_by_email=pr.approved_by_email,
            approved_at=pr.approved_at,
            approval_notes=pr.approval_notes,
            
            # Audit fields
            created_by_user=pr.created_by_user,
            created_by_employee=pr.created_by_employee,
            created_by_name=pr.created_by_name,
            created_by_email=pr.created_by_email,
            updated_by_user=pr.updated_by_user,
            updated_by_employee=pr.updated_by_employee,
            
            # Timestamps
            created_at=pr.created_at,
            updated_at=pr.updated_at,
            
            # Calculated fields
            total_items=len(pr.items) if pr.items else 0,
            total_quantity=sum(item.get('quantity', 0) for item in (pr.items or [])),
            total_amount=sum(
                float(item.get('total_amount', 0) or 
                     (float(item.get('unit_price', 0)) * float(item.get('quantity', 0)) if item.get('unit_price') else 0))
                for item in (pr.items or [])
            )
        )
        request_responses.append(response_data)
    
    return {
        "total": len(request_responses),
        "limit": limit,
        "purchase_requests": request_responses
    }


@router.get("/summary/by-user")
async def get_purchase_requests_summary_by_user(
    company_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get purchase request summary grouped by creator."""
    company = get_company_or_404(company_id, current_user, db)
    service = PurchaseRequestService(db)
    
    summary = service.get_requests_summary_by_user(company)
    return summary


@router.get("/{request_id}/item-approval-summary", response_model=PurchaseRequestItemApprovalSummary)
async def get_item_approval_summary(
    company_id: str,
    request_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get approval summary for items in a purchase request."""
    company = get_company_or_404(company_id, current_user, db)
    service = PurchaseRequestService(db)
    purchase_request = service.get_purchase_request(request_id, company)
    
    if not purchase_request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Purchase request not found"
        )
    
    summary = service.get_item_approval_summary(purchase_request)
    return summary


@router.put("/{request_id}/bulk-item-approval", response_model=PurchaseRequestResponse)
async def bulk_update_item_approval(
    company_id: str,
    request_id: str,
    data: List[PurchaseRequestItemApprovalUpdate],
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Bulk update approval status for multiple items."""
    company = get_company_or_404(company_id, current_user, db)
    service = PurchaseRequestService(db)
    purchase_request = service.get_purchase_request(request_id, company)
    
    if not purchase_request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Purchase request not found"
        )
    
    # Convert to list of dicts for service
    item_approvals = [item.dict() for item in data]
    
    # Update item approvals
    updated_request = service.bulk_update_item_approval(purchase_request, item_approvals, current_user)
    
    # Convert to response format
    response_data = PurchaseRequestResponse(
        id=updated_request.id,
        purchase_req_no=updated_request.purchase_req_no,
        request_number=updated_request.request_number,
        request_date=updated_request.request_date,
        customer_id=updated_request.customer_id,
        customer_name=updated_request.customer_name,
        items=updated_request.items,
        overall_status=updated_request.overall_status,
        approval_status=updated_request.approval_status,
        store_remarks=updated_request.store_remarks,
        general_notes=updated_request.general_notes,
        additional_notes=updated_request.additional_notes,
        
        # Approval fields
        approved_by_user=updated_request.approved_by_user,
        approved_by_employee=updated_request.approved_by_employee,
        approved_by_name=updated_request.approved_by_name,
        approved_by_email=updated_request.approved_by_email,
        approved_at=updated_request.approved_at,
        approval_notes=updated_request.approval_notes,
        
        # Audit fields
        created_by_user=updated_request.created_by_user,
        created_by_employee=updated_request.created_by_employee,
        created_by_name=updated_request.created_by_name,
        created_by_email=updated_request.created_by_email,
        updated_by_user=updated_request.updated_by_user,
        updated_by_employee=updated_request.updated_by_employee,
        
        # Timestamps
        created_at=updated_request.created_at,
        updated_at=updated_request.updated_at,
        
        # Calculated fields
        total_items=len(updated_request.items) if updated_request.items else 0,
        total_quantity=sum(item.get('quantity', 0) for item in (updated_request.items or [])),
        total_amount=sum(
            float(item.get('total_amount', 0) or 
                 (float(item.get('unit_price', 0)) * float(item.get('quantity', 0)) if item.get('unit_price') else 0))
            for item in (updated_request.items or [])
        )
    )
    
    return response_data


@router.post("/search", response_model=PurchaseRequestSearchResponse)
async def search_purchase_requests(
    company_id: str,
    search_term: str = Body(..., embed=True),
    limit: int = Body(20, embed=True),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Search purchase requests by various fields."""
    company = get_company_or_404(company_id, current_user, db)
    service = PurchaseRequestService(db)
    
    requests = service.search_purchase_requests(company, search_term, limit)
    
    # Convert to response format
    request_responses = []
    for pr in requests:
        response_data = PurchaseRequestResponse(
            id=pr.id,
            purchase_req_no=pr.purchase_req_no,
            request_number=pr.request_number,
            request_date=pr.request_date,
            customer_id=pr.customer_id,
            customer_name=pr.customer_name,
            items=pr.items,
            overall_status=pr.overall_status,
            approval_status=pr.approval_status,
            store_remarks=pr.store_remarks,
            general_notes=pr.general_notes,
            additional_notes=pr.additional_notes,
            
            # Approval fields
            approved_by_user=pr.approved_by_user,
            approved_by_employee=pr.approved_by_employee,
            approved_by_name=pr.approved_by_name,
            approved_by_email=pr.approved_by_email,
            approved_at=pr.approved_at,
            approval_notes=pr.approval_notes,
            
            # Audit fields
            created_by_user=pr.created_by_user,
            created_by_employee=pr.created_by_employee,
            created_by_name=pr.created_by_name,
            created_by_email=pr.created_by_email,
            updated_by_user=pr.updated_by_user,
            updated_by_employee=pr.updated_by_employee,
            
            # Timestamps
            created_at=pr.created_at,
            updated_at=pr.updated_at,
            
            # Calculated fields
            total_items=len(pr.items) if pr.items else 0,
            total_quantity=sum(item.get('quantity', 0) for item in (pr.items or [])),
            total_amount=sum(
                float(item.get('total_amount', 0) or 
                     (float(item.get('unit_price', 0)) * float(item.get('quantity', 0)) if item.get('unit_price') else 0))
                for item in (pr.items or [])
            )
        )
        request_responses.append(response_data)
    
    return PurchaseRequestSearchResponse(
        search_term=search_term,
        total=len(request_responses),
        purchase_requests=request_responses
    )


@router.post("/bulk-update")
async def bulk_update_purchase_requests(
    company_id: str,
    data: PurchaseRequestBulkUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Bulk update multiple purchase requests."""
    company = get_company_or_404(company_id, current_user, db)
    service = PurchaseRequestService(db)
    
    # Convert to dict for service
    update_data = data.update_data.dict(exclude_unset=True)
    
    updated_count, failed_count = service.bulk_update_purchase_requests(
        company_id=company.id,
        purchase_request_ids=data.purchase_request_ids,
        update_data=update_data,
        updated_by_user_id=(
            current_user.id
            if isinstance(current_user, User) or (isinstance(current_user, dict) and not current_user.get("is_employee"))
            else None
        ),
        updated_by_employee_id=(
            current_user.id if isinstance(current_user, dict) and current_user.get("is_employee") else None
        )
    )
    
    return {
        "message": "Bulk update completed",
        "updated_count": updated_count,
        "failed_count": failed_count,
        "total_attempted": len(data.purchase_request_ids)
    }


@router.post("/export")
async def export_purchase_requests(
    company_id: str,
    data: PurchaseRequestExportRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Export purchase requests to specified format."""
    company = get_company_or_404(company_id, current_user, db)
    service = PurchaseRequestService(db)
    
    # Prepare filters
    filters = {}
    if data.overall_status:
        filters['overall_status'] = data.overall_status
    if data.approval_status:
        filters['approval_status'] = data.approval_status
    if data.customer_id:
        filters['customer_id'] = data.customer_id
    if data.start_date:
        filters['start_date'] = data.start_date
    if data.end_date:
        filters['end_date'] = data.end_date
    if data.search:
        filters['search'] = data.search
    
    # Get export data
    export_data = service.export_purchase_requests(
        company_id=company.id,
        format=data.format,
        **filters
    )
    
    return {
        "format": data.format,
        "total_records": len(export_data),
        "data": export_data,
        "exported_at": datetime.now().isoformat()
    }
