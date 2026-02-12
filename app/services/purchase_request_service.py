"""Purchase Request service."""
from datetime import datetime
from typing import List, Optional, Tuple, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, desc, asc
from decimal import Decimal

from app.database.models import (
    PurchaseRequest, Customer, Company, User, Product, 
    generate_uuid
)
from app.schemas.purchase_request import (
    PurchaseRequestCreate, PurchaseRequestUpdate, 
    PurchaseRequestStatus, PurchaseOverallStatus
)
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
    
    def generate_purchase_req_no(self) -> str:
        """Generate unique purchase request number with timestamp."""
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        random_str = generate_uuid().split('-')[0]
        return f"PR-{timestamp}-{random_str}"
    


    def create_purchase_request(
        self, 
        company: Company, 
        data: PurchaseRequestCreate, 
        created_by: Optional[User] = None
    ) -> PurchaseRequest:
        """Create a new purchase request with all new columns."""
        print("=" * 80)
        print("🚀 PURCHASE REQUEST SERVICE: create_purchase_request() STARTED")
        print("=" * 80)
        
        # ============================================
        # STEP 1: VALIDATE CUSTOMER
        # ============================================
        print("📋 STEP 1: Validating customer")
        customer_id = data.customer_id
        customer_name = data.customer_name or ""
        
        if not customer_id:
            print("❌ Customer ID is required")
            raise ValueError("Customer ID is required")
        
        customer = self.db.query(Customer).filter(
            Customer.id == customer_id,
            Customer.company_id == company.id
        ).first()
        
        if not customer:
            print("❌ Customer not found")
            raise ValueError("Customer not found")
        
        print(f"✅ Customer found: {customer.name} (ID: {customer.id})")
        
        # ============================================
        # STEP 2: VALIDATE ITEMS
        # ============================================
        print("\n📦 STEP 2: Validating items")
        items_data = []
        
        for idx, item in enumerate(data.items, 1):
            print(f"\n   Item #{idx}:")
            
            # Validate required fields
            if not item.item or not item.item.strip():
                print(f"❌ Item name is required for item {idx}")
                raise ValueError(f"Item name is required for item {idx}")
            
            if not item.quantity or float(item.quantity) <= 0:
                print(f"❌ Valid quantity is required for item {idx}")
                raise ValueError(f"Valid quantity is required for item {idx}")
            
            # Validate product if provided
            product = None
            if item.product_id:
                product = self.db.query(Product).filter(
                    Product.id == item.product_id,
                    Product.company_id == company.id
                ).first()
                
                if product:
                    print(f"     Product: {product.name} (ID: {product.id})")
                else:
                    print(f"     ⚠️ Product ID {item.product_id} not found")
            
            # Prepare item data
            item_dict = {
                "product_id": item.product_id,
                "item": item.item.strip(),
                "quantity": float(item.quantity),
                "store_remarks": item.store_remarks or "",
                "approval_status": item.approval_status or "pending",
                "s_no": idx
            }
            
            # Add optional fields
            if item.unit_price:
                item_dict["unit_price"] = float(item.unit_price)
            
            if item.total_amount:
                item_dict["total_amount"] = float(item.total_amount)
            
            if item.notes:
                item_dict["notes"] = item.notes
            
            items_data.append(item_dict)
            
            print(f"     Quantity: {item_dict['quantity']}")
            print(f"     Store Remarks: {item_dict['store_remarks'][:30]}..." if item_dict['store_remarks'] else "     Store Remarks: None")
            print(f"     Approval Status: {item_dict['approval_status']}")
        
        print(f"\n✅ Validated {len(items_data)} items")
        
        # ============================================
        # STEP 3: GENERATE REQUEST NUMBERS
        # ============================================
        print("\n🔢 STEP 3: Generating request numbers")
        
        # Generate purchase_req_no if not provided
        purchase_req_no = data.purchase_req_no
        if not purchase_req_no:
            purchase_req_no = self.generate_purchase_req_no()
            print(f"   Generated purchase_req_no: {purchase_req_no}")
        else:
            print(f"   Using provided purchase_req_no: {purchase_req_no}")
        
        # Generate request_number
        request_number = self.generate_request_number(company.id)
        print(f"   Generated request_number: {request_number}")
        
        # ============================================
        # STEP 4: PREPARE REQUEST DATA
        # ============================================
        print("\n📝 STEP 4: Preparing request data")
        
        # Parse date if provided
        request_date = data.request_date
        if request_date:
            print(f"   Using provided date: {request_date}")
        else:
            request_date = datetime.now()
            print(f"   Using current date: {request_date}")
        
        # Get created_by info
        created_by_employee = None
        created_by_user = None
        created_by_name = None
        created_by_email = None
        
        if created_by:
            if created_by.__class__.__name__ == 'Employee':
                created_by_employee = created_by.id
                created_by_name = created_by.full_name
                created_by_email = created_by.email
                print(f"   Created by Employee: {created_by_name}")
            elif created_by.__class__.__name__ == 'User':
                created_by_user = created_by.id
                created_by_name = created_by.full_name if hasattr(created_by, 'full_name') else created_by.username
                created_by_email = created_by.email
                print(f"   Created by User: {created_by_name}")
        
        # ============================================
        # STEP 5: CREATE PURCHASE REQUEST
        # ============================================
        print("\n💾 STEP 5: Creating purchase request")
        
        purchase_request = PurchaseRequest(
            id=generate_uuid(),
            company_id=company.id,
            customer_id=customer_id,
            customer_name=customer_name or customer.name,
            
            # Request numbers
            request_number=request_number,
            purchase_req_no=purchase_req_no,
            request_date=request_date,
            
            # Status fields
            overall_status=data.status or PurchaseOverallStatus.OPEN,
            status=data.approval_status or PurchaseRequestStatus.PENDING,
            
            # Items and notes
            items=items_data,
            store_remarks=data.store_remarks or "",
            notes=data.notes or "",
            additional_notes=data.additional_notes or "",
            
            # Creator info
            created_by_employee=created_by_employee,
            created_by_user=created_by_user,
            created_by_name=created_by_name,
            created_by_email=created_by_email,
            
            # Timestamps
            created_at=datetime.now(),
            updated_at=datetime.now()
        )
        
        self.db.add(purchase_request)
        self.db.flush()
        print(f"✅ Purchase Request created with ID: {purchase_request.id}")
        
        # ============================================
        # STEP 6: COMMIT AND RETURN
        # ============================================
        print("\n💾 STEP 6: Committing transaction")
        self.db.commit()
        self.db.refresh(purchase_request)
        
        print("=" * 80)
        print(f"✅ PURCHASE REQUEST CREATED SUCCESSFULLY!")
        print(f"   Purchase Req No: {purchase_request.purchase_req_no}")
        print(f"   Request Number: {purchase_request.request_number}")
        print(f"   Customer: {purchase_request.customer_name}")
        print(f"   Overall Status: {purchase_request.overall_status}")
        print(f"   Approval Status: {purchase_request.status}")
        print(f"   Items: {len(purchase_request.items)}")
        print("=" * 80)
        
        return purchase_request

   
    def get_purchase_request(self, request_id: str, company: Company) -> Optional[PurchaseRequest]:
        """Get purchase request by ID."""
        return self.db.query(PurchaseRequest).filter(
            PurchaseRequest.id == request_id,
            PurchaseRequest.company_id == company.id,
            PurchaseRequest.is_deleted == False
        ).first()
    
    def get_purchase_request_by_number(self, purchase_req_no: str, company: Company) -> Optional[PurchaseRequest]:
        """Get purchase request by purchase_req_no."""
        return self.db.query(PurchaseRequest).filter(
            PurchaseRequest.purchase_req_no == purchase_req_no,
            PurchaseRequest.company_id == company.id,
            PurchaseRequest.is_deleted == False
        ).first()
    
    def get_purchase_requests(
        self, 
        company: Company, 
        page: int = 1, 
        page_size: int = 20,
        overall_status: Optional[str] = None,
        approval_status: Optional[str] = None,
        customer_id: Optional[str] = None,
        brand_id: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        search: Optional[str] = None,
        created_by_user: Optional[str] = None,
        created_by_employee: Optional[str] = None,
        sort_by: str = "request_date",
        sort_order: str = "desc"
    ) -> Tuple[List[PurchaseRequest], int]:
        """Get purchase requests with filtering and new columns."""
        print(f"📋 Getting purchase requests for company: {company.id}")
        
        query = self.db.query(PurchaseRequest).filter(
            PurchaseRequest.company_id == company.id,
            PurchaseRequest.is_deleted == False
        )
        
        # Apply filters
        if overall_status:
            print(f"   Filtering by overall_status: {overall_status}")
            query = query.filter(PurchaseRequest.overall_status == overall_status)
        
        if approval_status:
            print(f"   Filtering by approval_status: {approval_status}")
            query = query.filter(PurchaseRequest.approval_status == approval_status)
        
        if customer_id:
            print(f"   Filtering by customer_id: {customer_id}")
            query = query.filter(PurchaseRequest.customer_id == customer_id)
        
        if brand_id:
            print(f"   Filtering by brand_id: {brand_id}")
        
        if start_date:
            print(f"   Filtering by start_date: {start_date}")
            query = query.filter(PurchaseRequest.request_date >= start_date)
        
        if end_date:
            print(f"   Filtering by end_date: {end_date}")
            query = query.filter(PurchaseRequest.request_date <= end_date)
        
        if created_by_user:
            print(f"   Filtering by created_by_user: {created_by_user}")
            query = query.filter(PurchaseRequest.created_by_user == created_by_user)
        
        if created_by_employee:
            print(f"   Filtering by created_by_employee: {created_by_employee}")
            query = query.filter(PurchaseRequest.created_by_employee == created_by_employee)
        
        if search:
            search_term = f"%{search}%"
            print(f"   Searching for: {search}")
            query = query.filter(
                or_(
                    PurchaseRequest.purchase_req_no.ilike(search_term),
                    PurchaseRequest.request_number.ilike(search_term),
                    PurchaseRequest.customer_name.ilike(search_term),
                    PurchaseRequest.store_remarks.ilike(search_term),
                    PurchaseRequest.general_notes.ilike(search_term),
                    PurchaseRequest.additional_notes.ilike(search_term),
                    PurchaseRequest.created_by_name.ilike(search_term)
                )
            )
        
        # Apply sorting
        valid_sort_columns = [
            "purchase_req_no", "request_number", "request_date", "customer_name",
            "overall_status", "approval_status", "created_at", "updated_at"
        ]
        
        if sort_by in valid_sort_columns:
            sort_column = getattr(PurchaseRequest, sort_by)
            if sort_order.lower() == "asc":
                query = query.order_by(asc(sort_column))
                print(f"   Sorting by {sort_by} ASC")
            else:
                query = query.order_by(desc(sort_column))
                print(f"   Sorting by {sort_by} DESC")
        else:
            query = query.order_by(desc(PurchaseRequest.request_date))
            print(f"   Default sorting by request_date DESC")

        # Brand filtering needs resolving product_id -> products.brand_id from JSON items.
        if brand_id:
            all_results = query.all()
            product_ids = set()
            for request in all_results:
                for item in (request.items or []):
                    pid = item.get("product_id")
                    if pid:
                        product_ids.add(str(pid))

            product_brand_map = {}
            if product_ids:
                products = self.db.query(Product.id, Product.brand_id).filter(
                    Product.company_id == company.id,
                    Product.id.in_(list(product_ids))
                ).all()
                product_brand_map = {str(p.id): str(p.brand_id) if p.brand_id else "" for p in products}

            filtered = []
            for request in all_results:
                has_brand = False
                for item in (request.items or []):
                    pid = item.get("product_id")
                    if not pid:
                        continue
                    if product_brand_map.get(str(pid)) == str(brand_id):
                        has_brand = True
                        break
                if has_brand:
                    filtered.append(request)

            total = len(filtered)
            print(f"📊 Total records found after brand filter: {total}")
            offset = (page - 1) * page_size
            results = filtered[offset: offset + page_size]
            print(f"📄 Returning {len(results)} records (page {page}, size {page_size})")
            return results, total

        total = query.count()
        print(f"📊 Total records found: {total}")
        offset = (page - 1) * page_size
        results = query.offset(offset).limit(page_size).all()
        print(f"📄 Returning {len(results)} records (page {page}, size {page_size})")
        return results, total
    
    def update_status(
        self, 
        purchase_request: PurchaseRequest, 
        data: PurchaseRequestUpdate, 
        approved_by: User
    ) -> PurchaseRequest:
        """Update purchase request status with new columns."""
        print(f"📝 Updating status for PR: {purchase_request.purchase_req_no}")
        
        # Update status fields
        if data.overall_status:
            purchase_request.overall_status = data.overall_status
            print(f"   Overall Status: {data.overall_status}")
        
        if data.approval_status:
            # IMPORTANT: Your database now accepts all 7 values
            # No mapping needed anymore!
            purchase_request.status = data.approval_status
            print(f"   Approval Status: {data.approval_status}")
        
        if data.approval_notes:
            purchase_request.approval_notes = data.approval_notes
        
        # Set approver details
        if approved_by.__class__.__name__ == 'Employee':
            purchase_request.approved_by_employee = approved_by.id
            purchase_request.approved_by_name = approved_by.full_name
            purchase_request.approved_by_email = approved_by.email
            print(f"   Approved by Employee: {approved_by.full_name}")
        elif approved_by.__class__.__name__ == 'User':
            purchase_request.approved_by_user = approved_by.id
            purchase_request.approved_by_name = approved_by.full_name if hasattr(approved_by, 'full_name') else approved_by.username
            purchase_request.approved_by_email = approved_by.email
            print(f"   Approved by User: {purchase_request.approved_by_name}")
        
        # Set approval timestamp
        purchase_request.approved_at = datetime.now()
        purchase_request.updated_at = datetime.now()
        
        # Set updater info
        if approved_by.__class__.__name__ == 'Employee':
            purchase_request.updated_by_employee = approved_by.id
        elif approved_by.__class__.__name__ == 'User':
            purchase_request.updated_by_user = approved_by.id
        
        # Update item approval statuses if needed
        if data.items:
            updated_items = []
            for idx, item_data in enumerate(data.items):
                item = purchase_request.items[idx] if idx < len(purchase_request.items) else {}
                if item:
                    item["approval_status"] = item_data.approval_status or item.get("approval_status", "pending")
                    updated_items.append(item)
            
            if updated_items:
                purchase_request.items = updated_items
                print(f"   Updated {len(updated_items)} items approval status")
        
        self.db.commit()
        self.db.refresh(purchase_request)
        
        print(f"✅ Status updated successfully")
        return purchase_request
       
    def delete_purchase_request(self, purchase_request: PurchaseRequest, deleted_by) -> None:
        """Soft delete a purchase request with new audit fields."""
        print(f"🗑️ Deleting purchase request: {purchase_request.purchase_req_no}")
        
        purchase_request.is_deleted = True
        purchase_request.deleted_at = datetime.now()
        purchase_request.updated_at = datetime.now()
        
        # Set deleted_by info
        if deleted_by.__class__.__name__ == 'Employee':
            purchase_request.deleted_by_employee = deleted_by.id
            purchase_request.updated_by_employee = deleted_by.id
            print(f"   Deleted by Employee: {deleted_by.full_name}")
        elif deleted_by.__class__.__name__ == 'User':
            purchase_request.deleted_by_user = deleted_by.id
            purchase_request.updated_by_user = deleted_by.id
            print(f"   Deleted by User: {deleted_by.full_name if hasattr(deleted_by, 'full_name') else deleted_by.username}")
        
        self.db.commit()
        print(f"✅ Purchase request soft deleted")
    
    def get_statistics(self, company: Company, user_id: Optional[str] = None) -> Dict[str, Any]:
        """Get purchase request statistics including new statuses."""
        print(f"📊 Getting statistics for company: {company.id}")
        
        # Base query
        query = self.db.query(PurchaseRequest).filter(
            PurchaseRequest.company_id == company.id,
            PurchaseRequest.is_deleted == False
        )
        
        # Filter by user if provided
        if user_id:
            query = query.filter(
                or_(
                    PurchaseRequest.created_by_user == user_id,
                    PurchaseRequest.created_by_employee == user_id
                )
            )
        
        all_requests = query.all()
        
        stats = {
            'total': len(all_requests),
            'overall_status': {
                'open': 0,
                'in_process': 0,
                'closed': 0
            },
            'approval_status': {
                'pending': 0,
                'approved': 0,
                'rejected': 0,
                'hold': 0
            },
            'total_items': 0,
            'total_amount': 0.0
        }
        
        # Calculate statistics
        for request in all_requests:
            # Overall status
            if request.overall_status in stats['overall_status']:
                stats['overall_status'][request.overall_status] += 1
            
            # Approval status
            if request.approval_status in stats['approval_status']:
                stats['approval_status'][request.approval_status] += 1
            
            # Items and amount
            stats['total_items'] += len(request.items)
            
            # Calculate total amount from items
            for item in request.items:
                if 'total_amount' in item and item['total_amount']:
                    stats['total_amount'] += float(item['total_amount'])
                elif 'unit_price' in item and item['unit_price'] and 'quantity' in item:
                    stats['total_amount'] += float(item['unit_price']) * float(item['quantity'])
        
        print(f"📈 Statistics calculated:")
        print(f"   Total Requests: {stats['total']}")
        print(f"   Overall Status: {stats['overall_status']}")
        print(f"   Approval Status: {stats['approval_status']}")
        print(f"   Total Items: {stats['total_items']}")
        print(f"   Total Amount: {stats['total_amount']}")
        
        return stats
    
    def get_requests_by_make(self, company: Company, make: str) -> List[PurchaseRequest]:
        """Get purchase requests by item make/brand."""
        print(f"🔍 Searching for requests with make: {make}")
        
        all_requests, _ = self.get_purchase_requests(company, page=1, page_size=1000)
        
        filtered = []
        for request in all_requests:
            if request.items:
                for item in request.items:
                    if item.get('make', '').lower() == make.lower():
                        filtered.append(request)
                        break
        
        print(f"✅ Found {len(filtered)} requests with make: {make}")
        return filtered
    
    def get_requests_by_creator(self, company: Company, user_id: str) -> Tuple[List[PurchaseRequest], int]:
        """Get purchase requests created by specific user/employee."""
        print(f"👤 Getting requests by creator: {user_id}")
        
        query = self.db.query(PurchaseRequest).filter(
            PurchaseRequest.company_id == company.id,
            PurchaseRequest.is_deleted == False,
            or_(
                PurchaseRequest.created_by_user == user_id,
                PurchaseRequest.created_by_employee == user_id
            )
        )
        
        total = query.count()
        requests = query.order_by(desc(PurchaseRequest.created_at)).all()
        
        print(f"✅ Found {total} requests by creator {user_id}")
        return requests, total
    
    def update_purchase_request(
        self, 
        purchase_request: PurchaseRequest, 
        data: Dict[str, Any], 
        updated_by: User
    ) -> PurchaseRequest:
        """Update purchase request details with new columns."""
        print(f"✏️ Updating purchase request: {purchase_request.purchase_req_no}")
        
        # Track changes
        changes = []
        
        # Update basic fields
        if 'customer_id' in data and data['customer_id'] != purchase_request.customer_id:
            old_val = purchase_request.customer_id
            purchase_request.customer_id = data['customer_id']
            changes.append(f"customer_id: {old_val} → {data['customer_id']}")
        
        if 'customer_name' in data and data['customer_name'] != purchase_request.customer_name:
            old_val = purchase_request.customer_name
            purchase_request.customer_name = data['customer_name']
            changes.append(f"customer_name: {old_val} → {data['customer_name']}")
        
        # Update new fields
        if 'purchase_req_no' in data and data['purchase_req_no'] != purchase_request.purchase_req_no:
            old_val = purchase_request.purchase_req_no
            purchase_request.purchase_req_no = data['purchase_req_no']
            changes.append(f"purchase_req_no: {old_val} → {data['purchase_req_no']}")
        
        if 'overall_status' in data and data['overall_status'] != purchase_request.overall_status:
            old_val = purchase_request.overall_status
            purchase_request.overall_status = data['overall_status']
            changes.append(f"overall_status: {old_val} → {data['overall_status']}")
        
        if 'approval_status' in data and data['approval_status'] != purchase_request.approval_status:
            old_val = purchase_request.approval_status
            purchase_request.approval_status = data['approval_status']
            changes.append(f"approval_status: {old_val} → {data['approval_status']}")
        
        if 'store_remarks' in data and data['store_remarks'] != purchase_request.store_remarks:
            purchase_request.store_remarks = data['store_remarks']
            changes.append("store_remarks: updated")
        
        if 'general_notes' in data and data['general_notes'] != purchase_request.general_notes:
            purchase_request.general_notes = data['general_notes']
            changes.append("general_notes: updated")
        
        if 'additional_notes' in data and data['additional_notes'] != purchase_request.additional_notes:
            purchase_request.additional_notes = data['additional_notes']
            changes.append("additional_notes: updated")
        
        if 'items' in data:
            old_count = len(purchase_request.items)
            purchase_request.items = data['items']
            new_count = len(data['items'])
            changes.append(f"items: {old_count} → {new_count} items")
        
        # Update audit fields
        purchase_request.updated_at = datetime.now()
        
        if updated_by.__class__.__name__ == 'Employee':
            purchase_request.updated_by_employee = updated_by.id
            print(f"   Updated by Employee: {updated_by.full_name}")
        elif updated_by.__class__.__name__ == 'User':
            purchase_request.updated_by_user = updated_by.id
            print(f"   Updated by User: {updated_by.full_name if hasattr(updated_by, 'full_name') else updated_by.username}")
        
        # Log changes
        if changes:
            print(f"📝 Changes made:")
            for change in changes:
                print(f"   • {change}")
        else:
            print(f"📝 No changes made")
        
        self.db.commit()
        self.db.refresh(purchase_request)
        
        print(f"✅ Purchase request updated successfully")
        return purchase_request
    
    def get_recent_requests(self, company: Company, limit: int = 10) -> List[PurchaseRequest]:
        """Get recent purchase requests."""
        print(f"📅 Getting recent {limit} purchase requests")
        
        requests = self.db.query(PurchaseRequest).filter(
            PurchaseRequest.company_id == company.id,
            PurchaseRequest.is_deleted == False
        ).order_by(desc(PurchaseRequest.created_at)).limit(limit).all()
        
        print(f"✅ Found {len(requests)} recent requests")
        return requests
    
    def get_requests_summary_by_user(self, company: Company) -> Dict[str, Any]:
        """Get purchase request summary grouped by creator."""
        print(f"📊 Getting summary by user for company: {company.id}")
        
        query = self.db.query(
            PurchaseRequest.created_by_name,
            PurchaseRequest.created_by_user,
            PurchaseRequest.created_by_employee,
            func.count(PurchaseRequest.id).label('total_requests'),
            func.sum(
                func.case(
                    [(PurchaseRequest.overall_status == 'open', 1)],
                    else_=0
                )
            ).label('open_requests'),
            func.sum(
                func.case(
                    [(PurchaseRequest.overall_status == 'in_process', 1)],
                    else_=0
                )
            ).label('in_process_requests'),
            func.sum(
                func.case(
                    [(PurchaseRequest.overall_status == 'closed', 1)],
                    else_=0
                )
            ).label('closed_requests'),
            func.sum(
                func.case(
                    [(PurchaseRequest.approval_status == 'approved', 1)],
                    else_=0
                )
            ).label('approved_requests'),
            func.max(PurchaseRequest.created_at).label('last_request_date')
        ).filter(
            PurchaseRequest.company_id == company.id,
            PurchaseRequest.is_deleted == False,
            PurchaseRequest.created_by_name.isnot(None)
        ).group_by(
            PurchaseRequest.created_by_name,
            PurchaseRequest.created_by_user,
            PurchaseRequest.created_by_employee
        ).order_by(desc('total_requests'))
        
        results = []
        for row in query.all():
            results.append({
                'user_name': row.created_by_name,
                'user_id': row.created_by_user or row.created_by_employee,
                'user_type': 'User' if row.created_by_user else 'Employee',
                'total_requests': row.total_requests or 0,
                'open_requests': row.open_requests or 0,
                'in_process_requests': row.in_process_requests or 0,
                'closed_requests': row.closed_requests or 0,
                'approved_requests': row.approved_requests or 0,
                'last_request_date': row.last_request_date
            })
        
        print(f"✅ Summary generated for {len(results)} users")
        
        return {
            'summary_by_user': results,
            'total_users': len(results)
        }
    
    def get_item_approval_summary(self, purchase_request: PurchaseRequest) -> Dict[str, Any]:
        """Get approval summary for items in a purchase request."""
        print(f"📊 Getting item approval summary for PR: {purchase_request.purchase_req_no}")
        
        item_summary = {
            'total_items': len(purchase_request.items),
            'by_status': {
                'pending': 0,
                'approved': 0,
                'rejected': 0,
                'hold': 0
            },
            'items': []
        }
        
        for idx, item in enumerate(purchase_request.items):
            status = item.get('approval_status', 'pending')
            if status in item_summary['by_status']:
                item_summary['by_status'][status] += 1
            
            item_summary['items'].append({
                's_no': idx + 1,
                'item_name': item.get('item', 'Unknown'),
                'quantity': item.get('quantity', 0),
                'approval_status': status,
                'store_remarks': item.get('store_remarks', '')
            })
        
        print(f"📈 Item approval summary:")
        print(f"   Total Items: {item_summary['total_items']}")
        print(f"   By Status: {item_summary['by_status']}")
        
        return item_summary
    
    def bulk_update_item_approval(
        self,
        purchase_request: PurchaseRequest,
        item_approvals: List[Dict[str, Any]],
        updated_by: User
    ) -> PurchaseRequest:
        """Bulk update approval status for multiple items."""
        print(f"🔄 Bulk updating item approvals for PR: {purchase_request.purchase_req_no}")
        
        updated_items = purchase_request.items.copy()
        updates_count = 0
        
        for item_approval in item_approvals:
            item_index = item_approval.get('item_index')
            approval_status = item_approval.get('approval_status')
            
            if item_index is not None and approval_status and item_index < len(updated_items):
                old_status = updated_items[item_index].get('approval_status', 'pending')
                if old_status != approval_status:
                    updated_items[item_index]['approval_status'] = approval_status
                    updates_count += 1
                    print(f"   Item {item_index + 1}: {old_status} → {approval_status}")
        
        if updates_count > 0:
            purchase_request.items = updated_items
            purchase_request.updated_at = datetime.now()
            
            # Set updater info
            if updated_by.__class__.__name__ == 'Employee':
                purchase_request.updated_by_employee = updated_by.id
            elif updated_by.__class__.__name__ == 'User':
                purchase_request.updated_by_user = updated_by.id
            
            self.db.commit()
            self.db.refresh(purchase_request)
            print(f"✅ Updated {updates_count} item approval statuses")
        else:
            print(f"ℹ️ No item approval statuses were updated")
        
        return purchase_request
    
    def search_purchase_requests(
        self,
        company: Company,
        search_term: str,
        limit: int = 20
    ) -> List[PurchaseRequest]:
        """Search purchase requests by various fields."""
        print(f"🔍 Searching for: '{search_term}' in company: {company.id}")
        
        search_pattern = f"%{search_term}%"
        
        query = self.db.query(PurchaseRequest).filter(
            PurchaseRequest.company_id == company.id,
            PurchaseRequest.is_deleted == False,
            or_(
                PurchaseRequest.purchase_req_no.ilike(search_pattern),
                PurchaseRequest.request_number.ilike(search_pattern),
                PurchaseRequest.customer_name.ilike(search_pattern),
                PurchaseRequest.store_remarks.ilike(search_pattern),
                PurchaseRequest.general_notes.ilike(search_pattern),
                PurchaseRequest.additional_notes.ilike(search_pattern),
                PurchaseRequest.created_by_name.ilike(search_pattern)
            )
        ).order_by(desc(PurchaseRequest.created_at)).limit(limit)
        
        results = query.all()
        print(f"✅ Found {len(results)} matching requests")
        
        return results
