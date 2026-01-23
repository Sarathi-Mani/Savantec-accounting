"""Purchase Request schemas."""
from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, validator
from enum import Enum


class PurchaseRequestStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    HOLD = "hold"
    REJECTED = "rejected"


class PurchaseRequestItem(BaseModel):
    """Purchase request item schema."""
    item: str = Field(..., min_length=1, max_length=255)
    quantity: float = Field(..., gt=0)
    make: Optional[str] = Field(None, max_length=100)
    
    class Config:
        json_schema_extra = {
            "example": {
                "item": "Laptop Dell XPS 15",
                "quantity": 5,
                "make": "Dell"
            }
        }


class PurchaseRequestCreate(BaseModel):
    """Create purchase request schema."""
    customer_id: str = Field(..., min_length=1)
    customer_name: str = Field(..., min_length=1, max_length=255)
    items: List[PurchaseRequestItem] = Field(..., min_items=1)
    notes: Optional[str] = None
    
    @validator('items')
    def validate_items(cls, v):
        if not v:
            raise ValueError('At least one item is required')
        return v
    
    class Config:
        json_schema_extra = {
            "example": {
                "customer_id": "123e4567-e89b-12d3-a456-426614174000",
                "customer_name": "ABC Corporation",
                "items": [
                    {
                        "item": "Laptop",
                        "quantity": 5,
                        "make": "Dell"
                    }
                ],
                "notes": "Required for new project"
            }
        }


class PurchaseRequestUpdate(BaseModel):
    """Update purchase request status schema."""
    status: PurchaseRequestStatus
    approval_notes: Optional[str] = None
    
    class Config:
        json_schema_extra = {
            "example": {
                "status": "approved",
                "approval_notes": "Budget approved"
            }
        }


class PurchaseRequestResponse(BaseModel):
    """Purchase request response schema."""
    id: str
    request_number: str
    request_date: datetime
    customer_id: str
    customer_name: str
    items: List[Dict[str, Any]]
    notes: Optional[str]
    status: PurchaseRequestStatus
    approved_by: Optional[str]
    approved_at: Optional[datetime]
    approval_notes: Optional[str]
    created_at: datetime
    updated_at: datetime
    
    # Additional info
    approver_name: Optional[str] = None
    total_items: int = 0
    total_quantity: float = 0.0
    
    class Config:
        from_attributes = True


class PurchaseRequestListResponse(BaseModel):
    """Purchase request list response schema."""
    purchase_requests: List[PurchaseRequestResponse]
    total: int
    page: int
    page_size: int


class PurchaseRequestStats(BaseModel):
    """Purchase request statistics schema."""
    total: int
    pending: int
    approved: int
    hold: int
    rejected: int