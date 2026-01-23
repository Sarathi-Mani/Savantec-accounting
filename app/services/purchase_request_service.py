"""Purchase Request service."""
from datetime import datetime
from typing import List, Optional, Tuple, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, desc

from app.database.models import PurchaseRequest, Customer, Company, User
from app.schemas.purchase_request import PurchaseRequestCreate, PurchaseRequestUpdate, PurchaseRequestStatus


class PurchaseRequestService:
    """Service for purchase request operations."""
    
    def __init__(self, db: Session):
        self.db = db
    
    def generate_request_number(self, company_id: str) -> str:
        """Generate purchase request number: PR-YYYY-MM-001."""
        today = datetime.now()
        year = today.year
        month = today.strftime("%m")
        
        # Get count for this month
        start_date = datetime(today.year, today.month, 1)
        
        count = self.db.query(func.count(PurchaseRequest.id)).filter(
            PurchaseRequest.company_id == company_id,
            PurchaseRequest.request_date >= start_date,
            PurchaseRequest.is_deleted == False
        ).scalar() or 0
        
        seq = count + 1
        return f"PR-{year}-{month}-{seq:03d}"
    
    def create_purchase_request(self, company: Company, data: PurchaseRequestCreate, created_by: Optional[User] = None) -> PurchaseRequest:
        """Create a new purchase request."""
        # Generate request number
        request_number = self.generate_request_number(company.id)
        
        # Convert items to dict
        items_data = [item.dict() for item in data.items]
        
        # Create purchase request
        purchase_request = PurchaseRequest(
            company_id=company.id,
            customer_id=data.customer_id,
            customer_name=data.customer_name,
            request_number=request_number,
            request_date=datetime.now(),
            items=items_data,
            status=PurchaseRequestStatus.PENDING,
            notes=data.notes
        )
        
        self.db.add(purchase_request)
        self.db.commit()
        self.db.refresh(purchase_request)
        
        return purchase_request
    
    def get_purchase_request(self, request_id: str, company: Company) -> Optional[PurchaseRequest]:
        """Get purchase request by ID."""
        return self.db.query(PurchaseRequest).filter(
            PurchaseRequest.id == request_id,
            PurchaseRequest.company_id == company.id,
            PurchaseRequest.is_deleted == False
        ).first()
    
    def get_purchase_requests(
        self, 
        company: Company, 
        page: int = 1, 
        page_size: int = 20,
        status: Optional[str] = None,
        customer_id: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        search: Optional[str] = None
    ) -> Tuple[List[PurchaseRequest], int]:
        """Get purchase requests with filtering."""
        query = self.db.query(PurchaseRequest).filter(
            PurchaseRequest.company_id == company.id,
            PurchaseRequest.is_deleted == False
        )
        
        # Apply filters
        if status:
            query = query.filter(PurchaseRequest.status == status)
        
        if customer_id:
            query = query.filter(PurchaseRequest.customer_id == customer_id)
        
        if start_date:
            query = query.filter(PurchaseRequest.request_date >= start_date)
        
        if end_date:
            query = query.filter(PurchaseRequest.request_date <= end_date)
        
        if search:
            search_term = f"%{search}%"
            query = query.filter(
                or_(
                    PurchaseRequest.request_number.ilike(search_term),
                    PurchaseRequest.customer_name.ilike(search_term),
                    PurchaseRequest.notes.ilike(search_term)
                )
            )
        
        # Get total count
        total = query.count()
        
        # Apply pagination and ordering
        query = query.order_by(desc(PurchaseRequest.created_at))
        query = query.offset((page - 1) * page_size).limit(page_size)
        
        return query.all(), total
    
    def update_status(self, purchase_request: PurchaseRequest, data: PurchaseRequestUpdate, approved_by: User) -> PurchaseRequest:
        """Update purchase request status."""
        # Update status
        purchase_request.status = data.status
        purchase_request.approval_notes = data.approval_notes
        
        # If approved, set approver details
        if data.status == PurchaseRequestStatus.APPROVED:
            purchase_request.approved_by = approved_by.id
            purchase_request.approved_at = datetime.now()
        
        # If rejected or hold, clear approver details
        elif data.status in [PurchaseRequestStatus.REJECTED, PurchaseRequestStatus.HOLD]:
            purchase_request.approved_by = None
            purchase_request.approved_at = None
        
        purchase_request.updated_at = datetime.now()
        
        self.db.commit()
        self.db.refresh(purchase_request)
        
        return purchase_request
    
    def delete_purchase_request(self, purchase_request: PurchaseRequest) -> None:
        """Soft delete purchase request."""
        purchase_request.is_deleted = True
        purchase_request.updated_at = datetime.now()
        self.db.commit()
    
    def get_statistics(self, company: Company) -> Dict[str, int]:
        """Get purchase request statistics."""
        query = self.db.query(
            PurchaseRequest.status,
            func.count(PurchaseRequest.id)
        ).filter(
            PurchaseRequest.company_id == company.id,
            PurchaseRequest.is_deleted == False
        ).group_by(PurchaseRequest.status)
        
        stats = {
            'total': 0,
            'pending': 0,
            'approved': 0,
            'hold': 0,
            'rejected': 0
        }
        
        for status, count in query.all():
            stats[status] = count
            stats['total'] += count
        
        return stats
    
    def get_requests_by_make(self, company: Company, make: str) -> List[PurchaseRequest]:
        """Get purchase requests by item make/brand."""
        # This is a simple implementation
        all_requests, _ = self.get_purchase_requests(company, page=1, page_size=1000)
        
        filtered = []
        for request in all_requests:
            if request.items:
                for item in request.items:
                    if item.get('make', '').lower() == make.lower():
                        filtered.append(request)
                        break
        
        return filtered