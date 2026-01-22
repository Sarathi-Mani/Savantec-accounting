"""Invoice schemas."""
from pydantic import BaseModel, Field, field_validator
from typing import Optional, List
from datetime import datetime, date
from decimal import Decimal
from enum import Enum


class InvoiceStatus(str, Enum):
    """Invoice status."""
    DRAFT = "draft"
    PENDING = "pending"
    PAID = "paid"
    PARTIALLY_PAID = "partially_paid"
    OVERDUE = "overdue"
    CANCELLED = "cancelled"
    REFUNDED = "refunded"
    VOID = "void"
    WRITE_OFF = "write_off"


class InvoiceType(str, Enum):
    """Invoice type for GST."""
    B2B = "b2b"
    B2C = "b2c"
    B2CL = "b2cl"
    EXPORT = "export"
    SEZ = "sez"
    DEEMED_EXPORT = "deemed_export"


class PaymentMode(str, Enum):
    """Payment mode."""
    UPI = "upi"
    BANK_TRANSFER = "bank_transfer"
    CASH = "cash"
    CHEQUE = "cheque"
    CARD = "card"
    OTHER = "other"


class InvoiceItemCreate(BaseModel):
    """Schema for creating an invoice item."""
    product_id: Optional[str] = None
    description: str = Field(..., min_length=1, max_length=500)
    hsn_code: Optional[str] = None
    
    quantity: Decimal = Field(..., gt=0)
    unit: str = "unit"
    unit_price: Decimal = Field(..., gt=0)
    
    discount_percent: Decimal = Field(default=0, ge=0, le=100)
    gst_rate: Decimal = Field(..., ge=0)
    
    # Warehouse allocation (optional manual override)
    warehouse_allocation: Optional[List[dict]] = None

    @field_validator("hsn_code")
    @classmethod
    def validate_hsn_code(cls, v):
        """Validate HSN/SAC code format."""
        if v:
            if not v.isdigit() or len(v) < 4 or len(v) > 8:
                raise ValueError("HSN/SAC code must be 4-8 digits")
        return v


class InvoiceItemResponse(BaseModel):
    """Schema for invoice item response."""
    id: str
    invoice_id: str
    product_id: Optional[str] = None
    
    description: str
    hsn_code: Optional[str] = None
    
    quantity: Decimal
    unit: str
    unit_price: Decimal
    
    discount_percent: Decimal
    discount_amount: Decimal
    
    gst_rate: Decimal
    cgst_rate: Decimal
    sgst_rate: Decimal
    igst_rate: Decimal
    
    cgst_amount: Decimal
    sgst_amount: Decimal
    igst_amount: Decimal
    cess_amount: Decimal
    
    taxable_amount: Decimal
    total_amount: Decimal
    
    # Warehouse allocation tracking
    warehouse_allocation: Optional[List[dict]] = None
    stock_reserved: bool = False
    stock_reduced: bool = False
    
    created_at: datetime

    class Config:
        from_attributes = True

class InvoiceCreate(BaseModel):
    """Schema for creating an invoice."""
    # 1. Core Invoice Fields
    customer_id: Optional[str] = None
    invoice_date: Optional[date] = None
    due_date: Optional[date] = None
    invoice_type: InvoiceType = InvoiceType.B2B
    place_of_supply: Optional[str] = None  # State code
    
    # 2. GST/Tax Information
    is_reverse_charge: bool = False
    place_of_supply_name: Optional[str] = None  # Missing from your schema
    
    # 3. Items
    items: List[InvoiceItemCreate] = []
    
    # 4. Notes & Terms
    notes: Optional[str] = None
    terms: Optional[str] = None
    
    # 5. Warehouse & Stock Allocation
    manual_warehouse_override: bool = False
    warehouse_allocations: Optional[dict] = None
    
    # 6. Customer Information (denormalized for quick invoices)
    customer_name: Optional[str] = None
    customer_gstin: Optional[str] = None
    customer_address: Optional[str] = None
    customer_state: Optional[str] = None
    customer_state_code: Optional[str] = None
    
    # 🚨 MISSING FROM YOUR SCHEMA - ADD THESE:
    customer_phone: Optional[str] = None
    customer_email: Optional[str] = None
    
    # 7. Shipping Information (from your frontend)
    shipping_address: Optional[str] = None
    shipping_city: Optional[str] = None
    shipping_state: Optional[str] = None
    shipping_country: Optional[str] = "India"
    shipping_zip: Optional[str] = None
    
    # 8. Additional Charges & Discounts (from your frontend)
    freight_charges: Optional[Decimal] = Decimal('0.00')
    packing_forwarding_charges: Optional[Decimal] = Decimal('0.00')
    coupon_code: Optional[str] = None
    coupon_value: Optional[Decimal] = Decimal('0.00')
    round_off: Optional[Decimal] = Decimal('0.00')
    
    # 🚨 MISSING FROM YOUR SCHEMA - ADD THESE:
    discount_on_all: Optional[Decimal] = Decimal('0.00')
    discount_type: Optional[str] = 'percentage'  # 'percentage' or 'fixed'
    
    # 9. Document References (from your frontend)
    reference_no: Optional[str] = None
    delivery_note: Optional[str] = None
    payment_terms: Optional[str] = None
    
    # 🚨 MISSING FROM YOUR SCHEMA - ADD THESE:
    supplier_ref: Optional[str] = None
    other_references: Optional[str] = None
    buyer_order_no: Optional[str] = None
    buyer_order_date: Optional[date] = None
    despatch_doc_no: Optional[str] = None
    delivery_note_date: Optional[date] = None
    despatched_through: Optional[str] = None
    destination: Optional[str] = None
    terms_of_delivery: Optional[str] = None
    
    # 10. Sales & Contact Information
    sales_person_id: Optional[str] = None
    # 🚨 MISSING - Add for better tracking
    contact_id: Optional[str] = None
    
    # 11. Payment Information (from your frontend)
    payment_amount: Optional[Decimal] = Decimal('0.00')
    payment_type: Optional[str] = None
    payment_account: Optional[str] = None
    payment_note: Optional[str] = None
    adjust_advance_payment: Optional[bool] = False
    
    # 🚨 MISSING FROM YOUR SCHEMA - ADD THESE:
    advance_amount: Optional[Decimal] = Decimal('0.00')
    payment_mode: Optional[PaymentMode] = None
    payment_reference: Optional[str] = None
    
    # 12. Financial Fields (calculated - but frontend might send)
    # 🚨 These should be Optional as backend will recalculate
    subtotal: Optional[Decimal] = None
    discount_amount: Optional[Decimal] = None
    cgst_amount: Optional[Decimal] = None
    sgst_amount: Optional[Decimal] = None
    igst_amount: Optional[Decimal] = None
    total_tax: Optional[Decimal] = None
    total_amount: Optional[Decimal] = None
    amount_paid: Optional[Decimal] = Decimal('0.00')
    balance_due: Optional[Decimal] = None
    
    # 13. Additional Optional Fields for Future Use
    shipping_method: Optional[str] = None  # 'courier', 'self', 'pickup', 'delivery'
    tracking_number: Optional[str] = None
    expected_delivery_date: Optional[date] = None
    billing_address: Optional[str] = None
    billing_city: Optional[str] = None
    billing_state: Optional[str] = None
    billing_country: Optional[str] = "India"
    billing_zip: Optional[str] = None
    
    # 14. System/Integration fields
    external_reference: Optional[str] = None  # For ERP/CRM integration
    source: Optional[str] = 'web'  # 'web', 'mobile', 'pos', 'api'
    created_by: Optional[str] = None  # User ID who created
    
    # Validators
    @field_validator('place_of_supply')
    @classmethod
    def validate_state_code(cls, v):
        if v:
            if not v.isdigit() or len(v) != 2:
                raise ValueError('State code must be 2 digits')
        return v
    
    @field_validator('customer_gstin')
    @classmethod
    def validate_gstin(cls, v):
        if v and v != "":
            if len(v) != 15:
                raise ValueError('GSTIN must be 15 characters')
            if not v[:2].isdigit():
                raise ValueError('First 2 characters must be state code')
        return v
    
    @field_validator('round_off', 'freight_charges', 'packing_forwarding_charges', 
                     'coupon_value', 'discount_on_all', mode='before')
    @classmethod
    def validate_decimal(cls, v):
        """Ensure decimal values are properly handled."""
        if v is None:
            return Decimal('0.00')
        if isinstance(v, (int, float, str)):
            try:
                return Decimal(str(v))
            except:
                return Decimal('0.00')
        return v
    
    @field_validator('invoice_date', 'due_date', mode='before')
    @classmethod
    def validate_dates(cls, v):
        """Handle date string formats."""
        if isinstance(v, str):
            try:
                return date.fromisoformat(v.split('T')[0])
            except:
                pass
        return v
    
    class Config:
        from_attributes = True
        json_encoders = {
            Decimal: lambda v: str(v),
            date: lambda v: v.isoformat() if v else None,
        }
        

class InvoiceUpdate(BaseModel):
    """Schema for updating an invoice."""
    customer_id: Optional[str] = None
    invoice_date: Optional[date] = None
    due_date: Optional[date] = None
    
    invoice_type: Optional[InvoiceType] = None
    place_of_supply: Optional[str] = None
    is_reverse_charge: Optional[bool] = None
    
    notes: Optional[str] = None
    terms: Optional[str] = None
    status: Optional[InvoiceStatus] = None


class PaymentCreate(BaseModel):
    """Schema for recording a payment."""
    amount: Decimal = Field(..., gt=0)
    payment_date: Optional[datetime] = None
    payment_mode: PaymentMode = PaymentMode.UPI
    reference_number: Optional[str] = None
    upi_transaction_id: Optional[str] = None
    notes: Optional[str] = None


class PaymentResponse(BaseModel):
    """Schema for payment response."""
    id: str
    invoice_id: str
    amount: Decimal
    payment_date: datetime
    payment_mode: PaymentMode
    reference_number: Optional[str] = None
    upi_transaction_id: Optional[str] = None
    notes: Optional[str] = None
    is_verified: bool
    verified_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class InvoiceResponse(BaseModel):
    """Schema for invoice response."""
    id: str
    company_id: str
    customer_id: Optional[str] = None
    
    invoice_number: str
    invoice_date: datetime
    due_date: Optional[datetime] = None
    
    invoice_type: str
    place_of_supply: Optional[str] = None
    place_of_supply_name: Optional[str] = None
    is_reverse_charge: bool
    
    subtotal: Decimal
    discount_amount: Decimal
    
    cgst_amount: Decimal
    sgst_amount: Decimal
    igst_amount: Decimal
    cess_amount: Decimal
    total_tax: Decimal
    total_amount: Decimal
    
    amount_paid: Decimal
    balance_due: Decimal
    
    status: str
    
    payment_link: Optional[str] = None
    upi_qr_data: Optional[str] = None
    
    notes: Optional[str] = None
    terms: Optional[str] = None
    
    irn: Optional[str] = None
    pdf_url: Optional[str] = None
    
    created_at: datetime
    updated_at: datetime
    
    items: List[InvoiceItemResponse] = []
    payments: List[PaymentResponse] = []
    
    # Customer details (flattened for response)
    customer_name: Optional[str] = None
    customer_gstin: Optional[str] = None
    customer_email: Optional[str] = None
    customer_phone: Optional[str] = None

    class Config:
        from_attributes = True


class InvoiceListResponse(BaseModel):
    """Schema for invoice list response."""
    invoices: List[InvoiceResponse]
    total: int
    page: int
    page_size: int
    
    # Summary
    total_amount: Decimal = Decimal("0")
    total_paid: Decimal = Decimal("0")
    total_pending: Decimal = Decimal("0")


class InvoiceSummary(BaseModel):
    """Schema for invoice summary/dashboard."""
    total_invoices: int
    total_revenue: Decimal
    total_pending: Decimal
    total_paid: Decimal
    overdue_count: int
    overdue_amount: Decimal
    
    # Monthly breakdown
    current_month_revenue: Decimal
    current_month_invoices: int
    
    # GST summary
    total_cgst: Decimal
    total_sgst: Decimal
    total_igst: Decimal


class UPIQRResponse(BaseModel):
    """Schema for UPI QR code response."""
    qr_data: str
    qr_image_base64: str
    upi_link: str
    amount: Decimal
    invoice_number: str


class StatusChangeRequest(BaseModel):
    """Schema for changing invoice status."""
    reason: Optional[str] = None
    notes: Optional[str] = None
    refund_amount: Optional[Decimal] = None  # For partial refunds

