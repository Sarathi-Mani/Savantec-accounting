# app/schemas/vendor.py
from pydantic import BaseModel, Field, validator, EmailStr
from typing import List, Optional, Literal
from datetime import datetime, date
from decimal import Decimal


class OpeningBalanceItemCreate(BaseModel):
    """Schema for creating opening balance item."""
    date: date
    voucher_name: str = Field(..., min_length=1, max_length=255)
    days: Optional[int] = Field(None, ge=0)
    amount: Decimal = Field(..., ge=0)
    
    class Config:
        json_schema_extra = {
            "example": {
                "date": "2024-01-01",
                "voucher_name": "Opening Balance",
                "days": 0,
                "amount": 10000.00
            }
        }


class OpeningBalanceItemResponse(BaseModel):
    """Schema for opening balance item response."""
    id: str
    vendor_id: str
    date: date
    voucher_name: str
    days: Optional[int]
    amount: Decimal
    created_at: datetime
    updated_at: Optional[datetime]
    
    class Config:
        from_attributes = True


class ContactPersonCreate(BaseModel):
    """Schema for creating contact person."""
    name: str = Field(..., min_length=1, max_length=255)
    designation: Optional[str] = Field(None, max_length=100)
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, max_length=20)
    is_primary: Optional[bool] = False
    
    class Config:
        json_schema_extra = {
            "example": {
                "name": "John Doe",
                "designation": "Purchase Manager",
                "email": "john@example.com",
                "phone": "9876543210",
                "is_primary": True
            }
        }


class ContactPersonResponse(BaseModel):
    """Schema for contact person response."""
    id: str
    vendor_id: str
    name: str
    designation: Optional[str]
    email: Optional[str]
    phone: Optional[str]
    is_primary: bool
    created_at: datetime
    updated_at: Optional[datetime]
    
    class Config:
        from_attributes = True


class BankDetailCreate(BaseModel):
    """Schema for creating bank detail."""
    bank_name: str = Field(..., min_length=1, max_length=255)
    branch: Optional[str] = Field(None, max_length=255)
    account_number: str = Field(..., min_length=9, max_length=18)
    account_holder_name: str = Field(..., min_length=1, max_length=255)
    ifsc_code: Optional[str] = Field(None, min_length=11, max_length=11)
    account_type: Optional[str] = "Savings"
    is_primary: Optional[bool] = False
    upi_id: Optional[str] = Field(None, max_length=255)
    
    class Config:
        json_schema_extra = {
            "example": {
                "bank_name": "State Bank of India",
                "branch": "Main Branch",
                "account_number": "123456789012",
                "account_holder_name": "ABC Suppliers",
                "ifsc_code": "SBIN0001234",
                "account_type": "Savings",
                "is_primary": True,
                "upi_id": "abc@upi"
            }
        }


class BankDetailResponse(BaseModel):
    """Schema for bank detail response."""
    id: str
    vendor_id: str
    bank_name: str
    branch: Optional[str]
    account_number: str
    account_holder_name: str
    ifsc_code: Optional[str]
    account_type: str
    is_primary: bool
    upi_id: Optional[str]
    is_verified: bool
    verified_at: Optional[datetime]
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime]
    
    class Config:
        from_attributes = True


class VendorCreate(BaseModel):
    """Schema for creating a vendor."""
    # Basic Information
    name: str = Field(..., min_length=1, max_length=255)
    contact: str = Field(..., min_length=10, max_length=15)
    email: Optional[EmailStr] = None
    mobile: Optional[str] = Field(None, min_length=10, max_length=15)
    
    # Tax Information
    tax_number: Optional[str] = Field(None, max_length=15)  # GST number
    gst_registration_type: Optional[str] = Field(None, max_length=50)
    pan_number: Optional[str] = Field(None, min_length=10, max_length=10)
    vendor_code: Optional[str] = Field(None, max_length=50)
    
    # Opening Balance
    opening_balance: Optional[Decimal] = Field(0, ge=0)
    opening_balance_type: Optional[Literal["outstanding", "advance"]] = "outstanding"
    opening_balance_mode: Optional[Literal["single", "split"]] = "single"
   
    opening_balance_split: Optional[List[OpeningBalanceItemCreate]] = None
    # Financial Information
    credit_limit: Optional[Decimal] = Field(0, ge=0)
    credit_days: Optional[int] = Field(0, ge=0)
    payment_terms: Optional[str] = None
    tds_applicable: Optional[bool] = False
    tds_rate: Optional[Decimal] = Field(0, ge=0, le=100)
    
    # Contact Persons
    contact_persons: Optional[List[ContactPersonCreate]] = []
    
    # Bank Details
    bank_details: Optional[List[BankDetailCreate]] = []
    
    # Address
    billing_address: Optional[str] = None
    billing_city: Optional[str] = Field(None, max_length=100)
    billing_state: Optional[str] = Field(None, max_length=100)
    billing_country: Optional[str] = Field("India", max_length=100)
    billing_zip: Optional[str] = Field(None, max_length=20)
    
    shipping_address: Optional[str] = None
    shipping_city: Optional[str] = Field(None, max_length=100)
    shipping_state: Optional[str] = Field(None, max_length=100)
    shipping_country: Optional[str] = Field("India", max_length=100)
    shipping_zip: Optional[str] = Field(None, max_length=20)
    
    @validator('pan_number')
    def validate_pan(cls, v):
        if v is None:
            return v
        import re
        pattern = r'^[A-Z]{5}[0-9]{4}[A-Z]{1}$'
        if not re.match(pattern, v.upper()):
            raise ValueError('Invalid PAN number format. Expected: ABCDE1234F')
        return v.upper()
    
    @validator('contact')
    def validate_phone(cls, v):
        digits = ''.join(filter(str.isdigit, v))
        if len(digits) < 10:
            raise ValueError('Contact number must be at least 10 digits')
        return digits
    
    class Config:
        json_schema_extra = {
            "example": {
                "name": "ABC Suppliers",
                "contact": "9876543210",
                "email": "contact@abcsuppliers.com",
                "tax_number": "27ABCDE1234F1Z5",
                "pan_number": "ABCDE1234F",
                "opening_balance": 50000.00,
                "opening_balance_type": "outstanding",
                "credit_limit": 100000.00,
                "credit_days": 30,
                "billing_address": "123 Business Street",
                "billing_city": "Mumbai",
                "billing_state": "Maharashtra",
                "billing_zip": "400001"
            }
        }


class VendorUpdate(BaseModel):
    """Schema for updating a vendor."""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    contact: Optional[str] = Field(None, min_length=10, max_length=15)
    email: Optional[EmailStr] = None
    mobile: Optional[str] = Field(None, min_length=10, max_length=15)
    tax_number: Optional[str] = Field(None, max_length=15)
    gst_registration_type: Optional[str] = Field(None, max_length=50)
    pan_number: Optional[str] = Field(None, min_length=10, max_length=10)
    vendor_code: Optional[str] = Field(None, max_length=50)
    opening_balance: Optional[Decimal] = Field(None, ge=0)
    opening_balance_type: Optional[Literal["outstanding", "advance"]] = None
    opening_balance_mode: Optional[Literal["single", "split"]] = None
    credit_limit: Optional[Decimal] = Field(None, ge=0)
    credit_days: Optional[int] = Field(None, ge=0)
    payment_terms: Optional[str] = None
    tds_applicable: Optional[bool] = None
    tds_rate: Optional[Decimal] = Field(None, ge=0, le=100)
    billing_address: Optional[str] = None
    billing_city: Optional[str] = Field(None, max_length=100)
    billing_state: Optional[str] = Field(None, max_length=100)
    billing_country: Optional[str] = Field(None, max_length=100)
    billing_zip: Optional[str] = Field(None, max_length=20)
    shipping_address: Optional[str] = None
    shipping_city: Optional[str] = Field(None, max_length=100)
    shipping_state: Optional[str] = Field(None, max_length=100)
    shipping_country: Optional[str] = Field(None, max_length=100)
    shipping_zip: Optional[str] = Field(None, max_length=20)
    is_active: Optional[bool] = None
    
    class Config:
        json_schema_extra = {
            "example": {
                "name": "ABC Suppliers Pvt Ltd",
                "credit_limit": 150000.00,
                "credit_days": 45
            }
        }


class VendorResponse(BaseModel):
    """Schema for vendor response."""
    id: str
    company_id: str
    name: str
    contact: str
    email: Optional[str]
    mobile: Optional[str]
    tax_number: Optional[str]
    gst_registration_type: Optional[str]
    pan_number: Optional[str]
    vendor_code: Optional[str]
    opening_balance: Decimal
    opening_balance_type: Optional[str]
    opening_balance_mode: Optional[str]
    credit_limit: Decimal
    credit_days: int
    payment_terms: Optional[str]
    tds_applicable: bool
    tds_rate: Decimal
    billing_address: Optional[str]
    billing_city: Optional[str]
    billing_state: Optional[str]
    billing_country: str
    billing_zip: Optional[str]
    shipping_address: Optional[str]
    shipping_city: Optional[str]
    shipping_state: Optional[str]
    shipping_country: str
    shipping_zip: Optional[str]
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime]
    deleted_at: Optional[datetime]
    
    # Relationships
    opening_balance_items: List[OpeningBalanceItemResponse] = []
    contact_persons: List[ContactPersonResponse] = []
    bank_details: List[BankDetailResponse] = []
    
    class Config:
        from_attributes = True


class VendorListResponse(BaseModel):
    """Schema for vendor list response."""
    vendors: List[VendorResponse]
    total: int
    page: int
    page_size: int
    
    class Config:
        from_attributes = True