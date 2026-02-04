"""Purchase Request schemas."""
from datetime import datetime
from typing import List, Optional, Dict, Any, Union
from pydantic import BaseModel, Field, validator, ConfigDict
from decimal import Decimal
from enum import Enum


class PurchaseRequestStatus(str, Enum):
    """Approval status."""
    PENDING = "pending"
    APPROVED = "approved"
    HOLD = "hold"
    REJECTED = "rejected"
    open = "open"  # Added
    in_progress = "in_progress"  # Added
    closed = "closed"  # Added


class PurchaseOverallStatus(str, Enum):
    """Overall request status."""
    OPEN = "open"
    IN_PROCESS = "in_progress"
    CLOSED = "closed"


class PurchaseRequestItemCreate(BaseModel):
    """Purchase request item create schema."""
    product_id: Optional[str] = Field(None, description="Product ID if exists in system")
    item: str = Field(..., min_length=1, max_length=500, description="Item name")
    quantity: float = Field(..., gt=0, description="Quantity")
    unit_price: Optional[float] = Field(None, ge=0, description="Unit price")
    total_amount: Optional[float] = Field(None, ge=0, description="Total amount (quantity × unit_price)")
    store_remarks: Optional[str] = Field(None, max_length=1000, description="Store-specific remarks")
    approval_status: PurchaseRequestStatus = Field(default=PurchaseRequestStatus.PENDING, description="Item approval status")
    notes: Optional[str] = Field(None, max_length=1000, description="Item-specific notes")
    
    @validator('total_amount')
    def calculate_total_amount(cls, v, values):
        if v is None and values.get('unit_price') is not None and values.get('quantity') is not None:
            return float(values['unit_price'] * values['quantity'])
        return v
    
    model_config = ConfigDict(json_schema_extra={
        "example": {
            "product_id": "123e4567-e89b-12d3-a456-426614174000",
            "item": "Laptop Dell XPS 15",
            "quantity": 5.0,
            "unit_price": 1200.00,
            "store_remarks": "Store floor model",
            "approval_status": "pending",
            "notes": "Required for development team"
        }
    })


class PurchaseRequestItemResponse(BaseModel):
    """Purchase request item response schema."""
    s_no: int = Field(..., description="Serial number")
    product_id: Optional[str] = None
    item: str
    quantity: float
    unit_price: Optional[float] = None
    total_amount: Optional[float] = None
    store_remarks: Optional[str] = None
    approval_status: PurchaseRequestStatus
    notes: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)


class PurchaseRequestCreate(BaseModel):
    """Create purchase request schema."""
    purchase_req_no: Optional[str] = Field(None, min_length=1, max_length=50, description="Purchase request number (auto-generated if not provided)")
    customer_id: str = Field(..., min_length=1, description="Customer ID")
    customer_name: str = Field(..., min_length=1, max_length=255, description="Customer name")
    items: List[PurchaseRequestItemCreate] = Field(..., min_items=1, description="List of items")
    request_date: Optional[datetime] = Field(default_factory=datetime.now, description="Request date")
    status: PurchaseOverallStatus = Field(default=PurchaseOverallStatus.OPEN, description="Overall status")
    approval_status: PurchaseRequestStatus = Field(default=PurchaseRequestStatus.PENDING, description="Approval status")
    store_remarks: Optional[str] = Field(None, max_length=2000, description="Store-specific remarks")
    notes: Optional[str] = Field(None, max_length=2000, description="General notes (renamed from notes)")
    additional_notes: Optional[str] = Field(None, max_length=2000, description="Additional notes")
    
    @validator('items')
    def validate_items(cls, v):
        if not v:
            raise ValueError('At least one item is required')
        return v
    
    model_config = ConfigDict(json_schema_extra={
        "example": {
            "purchase_req_no": "PR-20240115-ABC123",
            "customer_id": "123e4567-e89b-12d3-a456-426614174000",
            "customer_name": "ABC Corporation",
            "request_date": "2024-01-15T10:30:00",
            "status": "open",
            "approval_status": "pending",
            "items": [
                {
                    "product_id": "456e7890-f12c-34d5-b678-426614174001",
                    "item": "Laptop Dell XPS 15",
                    "quantity": 5.0,
                    "unit_price": 1200.00,
                    "store_remarks": "Need by end of month",
                    "approval_status": "pending",
                    "notes": "For development team"
                }
            ],
            "store_remarks": "Store needs to check stock",
            "notes": "Required for new project launch",
            "additional_notes": "Priority request from management"
        }
    })


class PurchaseRequestUpdate(BaseModel):
    """Update purchase request schema."""
    customer_id: Optional[str] = Field(None, min_length=1, description="Customer ID")
    customer_name: Optional[str] = Field(None, min_length=1, max_length=255, description="Customer name")
    items: Optional[List[PurchaseRequestItemCreate]] = Field(None, description="List of items")
    overall_status: Optional[PurchaseOverallStatus] = Field(None, description="Overall status")
    approval_status: Optional[PurchaseRequestStatus] = Field(None, description="Approval status")
    store_remarks: Optional[str] = Field(None, max_length=2000, description="Store-specific remarks")
    general_notes: Optional[str] = Field(None, max_length=2000, description="General notes")
    additional_notes: Optional[str] = Field(None, max_length=2000, description="Additional notes")
    approval_notes: Optional[str] = Field(None, max_length=2000, description="Approval notes")
    
    model_config = ConfigDict(json_schema_extra={
        "example": {
            "customer_name": "Updated Customer Name",
            "overall_status": "in_process",
            "approval_status": "approved",
            "store_remarks": "Updated store remarks",
            "approval_notes": "Approved by department head"
        }
    })


class PurchaseRequestStatusUpdate(BaseModel):
    """Update purchase request status schema."""
    status: Optional[PurchaseOverallStatus] = Field(None, description="Overall status")
    approval_status: Optional[PurchaseRequestStatus] = Field(None, description="Approval status")
    approval_notes: Optional[str] = Field(None, max_length=2000, description="Approval notes")
    items: Optional[List[PurchaseRequestItemCreate]] = Field(None, description="Items with updated approval status")
    
    model_config = ConfigDict(json_schema_extra={
        "example": {
            "approval_status": "approved",
            "approval_notes": "Budget approved by finance",
            "items": [
                {
                    "product_id": "456e7890-f12c-34d5-b678-426614174001",
                    "item": "Laptop Dell XPS 15",
                    "quantity": 5.0,
                    "approval_status": "approved"
                }
            ]
        }
    })


class PurchaseRequestItemApprovalUpdate(BaseModel):
    """Update item approval status schema."""
    item_index: int = Field(..., ge=0, description="Index of item in items list")
    approval_status: PurchaseRequestStatus = Field(..., description="New approval status")
    notes: Optional[str] = Field(None, max_length=1000, description="Approval notes for this item")
    
    model_config = ConfigDict(json_schema_extra={
        "example": {
            "item_index": 0,
            "approval_status": "approved",
            "notes": "Item approved after verification"
        }
    })


class PurchaseRequestResponse(BaseModel):
    """Purchase request response schema."""
    id: str
    purchase_req_no: str
    request_number: str
    request_date: datetime
    customer_id: str
    customer_name: str
    items: List[Dict[str, Any]]
    
    # Status fields
    overall_status: PurchaseOverallStatus
    status: PurchaseRequestStatus
    
    # Notes fields
    store_remarks: Optional[str]
    notes: Optional[str]
   
    
    # Approval details
    approved_by_user: Optional[str]
    approved_by_employee: Optional[str]
    approved_by_name: Optional[str]
    approved_by_email: Optional[str]
    approved_at: Optional[datetime]
    approval_notes: Optional[str]
    
    # Creator details
    created_by_user: Optional[str]
    created_by_employee: Optional[str]
    created_by_name: Optional[str]
    created_by_email: Optional[str]
    
    # Updater details
    updated_by_user: Optional[str]
    updated_by_employee: Optional[str]
    
    # Timestamps
    created_at: datetime
    updated_at: datetime
    
    # Calculated fields
    total_items: int = 0
    total_quantity: float = 0.0
    total_amount: float = 0.0
    
    @validator('total_items', pre=True, always=True)
    def calculate_total_items(cls, v, values):
        if 'items' in values and values['items']:
            return len(values['items'])
        return v or 0
    
    @validator('total_quantity', pre=True, always=True)
    def calculate_total_quantity(cls, v, values):
        if 'items' in values and values['items']:
            return sum(item.get('quantity', 0) for item in values['items'])
        return v or 0.0
    
    @validator('total_amount', pre=True, always=True)
    def calculate_total_amount(cls, v, values):
        if 'items' in values and values['items']:
            total = 0.0
            for item in values['items']:
                if 'total_amount' in item and item['total_amount']:
                    total += float(item['total_amount'])
                elif 'unit_price' in item and item['unit_price'] and 'quantity' in item:
                    total += float(item['unit_price']) * float(item['quantity'])
            return total
        return v or 0.0
    
    model_config = ConfigDict(from_attributes=True, json_schema_extra={
        "example": {
            "id": "123e4567-e89b-12d3-a456-426614174000",
            "purchase_req_no": "PR-20240115-ABC123",
            "request_number": "PR-2024-01-001",
            "request_date": "2024-01-15T10:30:00",
            "customer_id": "456e7890-f12c-34d5-b678-426614174001",
            "customer_name": "ABC Corporation",
            "items": [
                {
                    "product_id": "789f0123-g45h-67i8-j901-526714174002",
                    "item": "Laptop Dell XPS 15",
                    "quantity": 5.0,
                    "unit_price": 1200.00,
                    "total_amount": 6000.00,
                    "store_remarks": "Need by end of month",
                    "approval_status": "pending",
                    "s_no": 1
                }
            ],
            "overall_status": "open",
            "approval_status": "pending",
            "store_remarks": "Store needs to check stock",
            "general_notes": "Required for new project launch",
            "additional_notes": "Priority request from management",
            "approved_by_name": "John Doe",
            "approved_at": None,
            "approval_notes": None,
            "created_by_name": "Jane Smith",
            "created_at": "2024-01-15T10:30:00",
            "updated_at": "2024-01-15T10:30:00",
            "total_items": 1,
            "total_quantity": 5.0,
            "total_amount": 6000.00
        }
    })


class PurchaseRequestListResponse(BaseModel):
    """Purchase request list response schema."""
    purchase_requests: List[PurchaseRequestResponse]
    total: int
    page: int
    page_size: int
    
    model_config = ConfigDict(json_schema_extra={
        "example": {
            "purchase_requests": [],
            "total": 0,
            "page": 1,
            "page_size": 20
        }
    })


class PurchaseRequestStats(BaseModel):
    """Purchase request statistics schema."""
    total: int = 0
    overall_status: Dict[str, int] = Field(default_factory=lambda: {
        "open": 0,
        "in_process": 0,
        "closed": 0
    })
    approval_status: Dict[str, int] = Field(default_factory=lambda: {
        "pending": 0,
        "approved": 0,
        "rejected": 0,
        "hold": 0
    })
    total_items: int = 0
    total_amount: float = 0.0
    
    model_config = ConfigDict(json_schema_extra={
        "example": {
            "total": 10,
            "overall_status": {
                "open": 5,
                "in_process": 3,
                "closed": 2
            },
            "approval_status": {
                "pending": 4,
                "approved": 4,
                "rejected": 1,
                "hold": 1
            },
            "total_items": 50,
            "total_amount": 50000.00
        }
    })


class PurchaseRequestItemApprovalSummary(BaseModel):
    """Item approval summary for a purchase request."""
    total_items: int
    by_status: Dict[str, int]
    items: List[Dict[str, Any]]
    
    model_config = ConfigDict(json_schema_extra={
        "example": {
            "total_items": 3,
            "by_status": {
                "pending": 2,
                "approved": 1,
                "rejected": 0,
                "hold": 0
            },
            "items": [
                {
                    "s_no": 1,
                    "item_name": "Laptop",
                    "quantity": 2,
                    "approval_status": "pending",
                    "store_remarks": "Check stock"
                },
                {
                    "s_no": 2,
                    "item_name": "Monitor",
                    "quantity": 5,
                    "approval_status": "approved",
                    "store_remarks": "In stock"
                }
            ]
        }
    })


class PurchaseRequestBulkUpdate(BaseModel):
    """Bulk update purchase requests schema."""
    purchase_request_ids: List[str] = Field(..., min_items=1, description="List of purchase request IDs to update")
    update_data: PurchaseRequestUpdate = Field(..., description="Data to update")
    
    model_config = ConfigDict(json_schema_extra={
        "example": {
            "purchase_request_ids": [
                "123e4567-e89b-12d3-a456-426614174000",
                "456e7890-f12c-34d5-b678-426614174001"
            ],
            "update_data": {
                "overall_status": "in_process",
                "store_remarks": "Updated for all"
            }
        }
    })


class PurchaseRequestExportRequest(BaseModel):
    """Export purchase requests request schema."""
    format: str = Field(default="csv", description="Export format: csv, json, excel")
    overall_status: Optional[PurchaseOverallStatus] = None
    approval_status: Optional[PurchaseRequestStatus] = None
    customer_id: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    search: Optional[str] = None
    
    model_config = ConfigDict(json_schema_extra={
        "example": {
            "format": "csv",
            "overall_status": "open",
            "start_date": "2024-01-01T00:00:00",
            "end_date": "2024-01-31T23:59:59"
        }
    })


class PurchaseRequestSearchResponse(BaseModel):
    """Purchase request search response schema."""
    search_term: str
    total: int
    purchase_requests: List[PurchaseRequestResponse]
    
    model_config = ConfigDict(json_schema_extra={
        "example": {
            "search_term": "laptop",
            "total": 5,
            "purchase_requests": []
        }
    })


class PurchaseRequestDashboardStats(BaseModel):
    """Dashboard statistics for purchase requests."""
    today_requests: int = 0
    week_requests: int = 0
    month_requests: int = 0
    pending_approval: int = 0
    approved_today: int = 0
    top_customers: List[Dict[str, Any]] = Field(default_factory=list)
    recent_requests: List[PurchaseRequestResponse] = Field(default_factory=list)
    
    model_config = ConfigDict(json_schema_extra={
        "example": {
            "today_requests": 5,
            "week_requests": 25,
            "month_requests": 100,
            "pending_approval": 15,
            "approved_today": 3,
            "top_customers": [
                {
                    "customer_name": "ABC Corp",
                    "total_requests": 10,
                    "total_amount": 50000.00
                }
            ],
            "recent_requests": []
        }
    })


class PurchaseRequestTimeline(BaseModel):
    """Purchase request timeline/audit log."""
    timestamp: datetime
    action: str
    user_name: Optional[str]
    user_type: Optional[str]
    details: Optional[Dict[str, Any]]
    
    model_config = ConfigDict(json_schema_extra={
        "example": {
            "timestamp": "2024-01-15T10:30:00",
            "action": "created",
            "user_name": "Jane Smith",
            "user_type": "Employee",
            "details": {
                "customer_name": "ABC Corp"
            }
        }
    })


class PurchaseRequestReport(BaseModel):
    """Purchase request report data."""
    period: str
    total_requests: int
    approved_requests: int
    rejected_requests: int
    pending_requests: int
    total_amount: float
    avg_items_per_request: float
    top_items: List[Dict[str, Any]]
    
    model_config = ConfigDict(json_schema_extra={
        "example": {
            "period": "January 2024",
            "total_requests": 50,
            "approved_requests": 30,
            "rejected_requests": 5,
            "pending_requests": 15,
            "total_amount": 250000.00,
            "avg_items_per_request": 3.2,
            "top_items": [
                {"item": "Laptop", "count": 25},
                {"item": "Monitor", "count": 20}
            ]
        }
    })