"""Purchase Request service."""
from datetime import datetime
from typing import List, Optional, Tuple, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, desc

from app.database.models import PurchaseRequest, Customer, Company, User
from app.schemas.purchase_request import PurchaseRequestCreate, PurchaseRequestUpdate, PurchaseRequestStatus

from app.database.payroll_models import Employee

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
        
        # Create purchase request with created_by
        purchase_request = PurchaseRequest(
            company_id=company.id,
            customer_id=data.customer_id,
            customer_name=data.customer_name,
            request_number=request_number,
            request_date=datetime.now(),
            items=items_data,
            status=PurchaseRequestStatus.PENDING,
            notes=data.notes,
          created_by_employee=created_by.id if created_by and created_by.__class__.__name__ == 'Employee' else None,
          created_by_user=created_by.id if created_by and created_by.__class__.__name__ == 'User' else None,
          created_by_name=created_by.full_name if created_by else None,
    created_by_email=created_by.email if created_by else None
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
        search: Optional[str] = None,
        created_by: Optional[str] = None
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
        
        if created_by:
            query = query.filter(PurchaseRequest.created_by == created_by)
        
        if search:
            search_term = f"%{search}%"
            query = query.filter(
                or_(
                    PurchaseRequest.request_number.ilike(search_term),
                    PurchaseRequest.customer_name.ilike(search_term),
                    PurchaseRequest.notes.ilike(search_term),
                    PurchaseRequest.created_by_name.ilike(search_term)
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
            if approved_by.__class__.__name__ == 'Employee':
                 purchase_request.approved_by_employee = approved_by.id
            elif approved_by.__class__.__name__ == 'User':
                 purchase_request.approved_by_user = approved_by.id
            purchase_request.approved_by_name = approved_by.full_name
            purchase_request.approved_by_email = approved_by.email
            purchase_request.approved_at = datetime.now()
        # If rejected or hold, clear approver details
        elif data.status in [PurchaseRequestStatus.REJECTED, PurchaseRequestStatus.HOLD]:
            purchase_request.approved_by = None
            purchase_request.approved_by_name = None
            purchase_request.approved_by_email = None
            purchase_request.approved_at = None
        
        purchase_request.updated_at = datetime.now()
        if hasattr(approved_by, 'id'):
               purchase_request.updated_by = approved_by.id
        
        self.db.commit()
        self.db.refresh(purchase_request)
        
        return purchase_request
    
    def delete_purchase_request(self, purchase_request: PurchaseRequest, deleted_by) -> None:
        
        purchase_request.is_deleted = True
        purchase_request.updated_at = datetime.now()
        if deleted_by.__class__.__name__ == 'Employee':
            purchase_request.updated_by_employee = deleted_by.id
            purchase_request.deleted_by_employee = deleted_by.id
        
        elif deleted_by.__class__.__name__ == 'User':
            purchase_request.updated_by_user = deleted_by.id
            purchase_request.deleted_by_user = deleted_by.id
        purchase_request.deleted_at = datetime.now()
        self.db.commit()
    
    def get_statistics(self, company: Company, user_id: Optional[str] = None) -> Dict[str, int]:
        """Get purchase request statistics."""
        query = self.db.query(
            PurchaseRequest.status,
            func.count(PurchaseRequest.id)
        ).filter(
            PurchaseRequest.company_id == company.id,
            PurchaseRequest.is_deleted == False
        )
        
        # Filter by user if provided
        if user_id:
            query = query.filter(PurchaseRequest.created_by == user_id)
        
        query = query.group_by(PurchaseRequest.status)
        
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
    
    def get_requests_by_creator(self, company: Company, user_id: str) -> Tuple[List[PurchaseRequest], int]:
        """Get purchase requests created by specific user."""
        query = self.db.query(PurchaseRequest).filter(
            PurchaseRequest.company_id == company.id,
            PurchaseRequest.created_by == user_id,
            PurchaseRequest.is_deleted == False
        )
        
        total = query.count()
        requests = query.order_by(desc(PurchaseRequest.created_at)).all()
        
        return requests, total
    
    def update_purchase_request(
        self, 
        purchase_request: PurchaseRequest, 
        data: Dict[str, Any], 
        updated_by: User
    ) -> PurchaseRequest:
        """Update purchase request details."""
        # Update fields
        if 'customer_id' in data:
            purchase_request.customer_id = data['customer_id']
        
        if 'customer_name' in data:
            purchase_request.customer_name = data['customer_name']
        
        if 'items' in data:
            purchase_request.items = data['items']
        
        if 'notes' in data:
            purchase_request.notes = data['notes']
        
        # Update audit fields
        purchase_request.updated_at = datetime.now()
        purchase_request.updated_by = updated_by.id
        
        self.db.commit()
        self.db.refresh(purchase_request)
        
        return purchase_request
    
    def get_recent_requests(self, company: Company, limit: int = 10) -> List[PurchaseRequest]:
        """Get recent purchase requests."""
        return self.db.query(PurchaseRequest).filter(
            PurchaseRequest.company_id == company.id,
            PurchaseRequest.is_deleted == False
        ).order_by(desc(PurchaseRequest.created_at)).limit(limit).all()
    
    def get_requests_summary_by_user(self, company: Company) -> Dict[str, Any]:
        """Get purchase request summary grouped by creator."""
        query = self.db.query(
            PurchaseRequest.created_by,
            PurchaseRequest.created_by_name,
            func.count(PurchaseRequest.id).label('total_requests'),
            func.sum(
                func.case(
                    [(PurchaseRequest.status == PurchaseRequestStatus.PENDING, 1)],
                    else_=0
                )
            ).label('pending_requests'),
            func.sum(
                func.case(
                    [(PurchaseRequest.status == PurchaseRequestStatus.APPROVED, 1)],
                    else_=0
                )
            ).label('approved_requests'),
            func.sum(
                func.case(
                    [(PurchaseRequest.status == PurchaseRequestStatus.REJECTED, 1)],
                    else_=0
                )
            ).label('rejected_requests'),
            func.max(PurchaseRequest.created_at).label('last_request_date')
        ).filter(
            PurchaseRequest.company_id == company.id,
            PurchaseRequest.is_deleted == False,
            PurchaseRequest.created_by.isnot(None)
        ).group_by(
            PurchaseRequest.created_by,
            PurchaseRequest.created_by_name
        ).order_by(desc('total_requests'))
        
        results = []
        for row in query.all():
            results.append({
                'user_id': row.created_by,
                'user_name': row.created_by_name,
                'total_requests': row.total_requests or 0,
                'pending_requests': row.pending_requests or 0,
                'approved_requests': row.approved_requests or 0,
                'rejected_requests': row.rejected_requests or 0,
                'last_request_date': row.last_request_date
            })
        
        return {
            'summary_by_user': results,
            'total_users': len(results)
        }