"""SQLAlchemy database models for GST Invoice application."""
from datetime import datetime
from decimal import Decimal

import enum
from enum import Enum as PyEnum
from sqlalchemy import (
    Column,
    Integer,
    Date,
    Time,
    String,
    Text,
    DateTime,
    Numeric,
    Boolean,
    ForeignKey,
    Enum,
    JSON,
    Float,
    Index,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship, synonym
from app.database.connection import Base
import uuid
from sqlalchemy.sql import func


discount_type_enum = Enum('percentage', 'fixed', name='discount_type_enum', create_type=False)

def generate_uuid():
    """Generate a UUID string."""
    return str(uuid.uuid4())


class InvoiceStatus(str, PyEnum):
    """Invoice status enumeration."""
    DRAFT = "draft"
    PENDING = "pending"
    PAID = "paid"
    PARTIALLY_PAID = "partially_paid"
    OVERDUE = "overdue"
    CANCELLED = "cancelled"
    COMPLETED = "completed"
    REFUNDED = "refunded"
    VOID = "void"
    WRITE_OFF = "write_off"


class InvoiceType(str, PyEnum):
    """Invoice type enumeration for GST."""
    B2B = "b2b"  # Business to Business
    B2C = "b2c"  # Business to Consumer
    B2CL = "b2cl"  # B2C Large (>2.5L)
    EXPORT = "export"
    SEZ = "sez"  # Special Economic Zone
    DEEMED_EXPORT = "deemed_export"


class GSTRate(str, PyEnum):
    """GST rate enumeration."""
    EXEMPT = "0"
    GST_5 = "5"
    GST_12 = "12"
    GST_18 = "18"
    GST_28 = "28"


class PaymentMode(str, PyEnum):
    """Payment mode enumeration."""
    UPI = "upi"
    BANK_TRANSFER = "bank_transfer"
    IMPS = "imps"  # Immediate Payment Service
    NEFT = "neft"  # National Electronic Funds Transfer
    RTGS = "rtgs"  # Real Time Gross Settlement
    CASH = "cash"
    CHEQUE = "cheque"
    CARD = "card"
    DD = "dd"  # Demand Draft
    ONLINE = "online"
    OTHER = "other"


class AccountType(str, PyEnum):
    """Account type enumeration for Chart of Accounts."""
    ASSET = "asset"
    LIABILITY = "liability"
    EQUITY = "equity"
    REVENUE = "revenue"
    EXPENSE = "expense"


class TransactionStatus(str, PyEnum):
    """Transaction status enumeration."""
    DRAFT = "draft"
    POSTED = "posted"
    REVERSED = "reversed"


class BankImportStatus(str, PyEnum):
    """Bank import batch status."""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class BankImportRowStatus(str, PyEnum):
    """Bank import row status."""
    PENDING = "pending"
    MATCHED = "matched"
    CREATED = "created"
    IGNORED = "ignored"


class ReferenceType(str, PyEnum):
    """Reference type for transactions."""
    INVOICE = "invoice"
    PAYMENT = "payment"
    MANUAL = "manual"
    BANK_IMPORT = "bank_import"
    OPENING_BALANCE = "opening_balance"
    TRANSFER = "transfer"
    PURCHASE_ORDER = "purchase_order"
    SALES_ORDER = "sales_order"
    PURCHASE_INVOICE = "purchase_invoice"
    CHEQUE = "cheque"

class InvoiceVoucher(str, enum.Enum):
    SALES = "sales"
    SERVICE = "service"

class VoucherType(str, PyEnum):
    """Tally-style voucher types for easy entry."""
    PAYMENT = "payment"          # Money going out
    RECEIPT = "receipt"          # Money coming in
    CONTRA = "contra"            # Bank to Cash transfer
    JOURNAL = "journal"          # General journal entry
    SALES = "sales"              # Sales with/without inventory
    PURCHASE = "purchase"        # Purchase with/without inventory
    DEBIT_NOTE = "debit_note"    # Return to supplier
    CREDIT_NOTE = "credit_note"  # Return from customer
    STOCK_JOURNAL = "stock_journal"  # Stock transfer between godowns


class CreatorType(str, PyEnum):
    USER = "user"
    EMPLOYEE = "employee"


class EntryType(str, PyEnum):
    """Simple entry types for Quick Entry UI."""
    MONEY_IN = "money_in"
    MONEY_OUT = "money_out"
    TRANSFER = "transfer"


class OrderStatus(str, PyEnum):
    """Order status for sales/purchase orders."""
    DRAFT = "draft"
    CONFIRMED = "confirmed"
    PARTIALLY_FULFILLED = "partially_fulfilled"
    FULFILLED = "fulfilled"
    CANCELLED = "cancelled"


class StockMovementType(str, PyEnum):
    """Type of stock movement."""
    PURCHASE = "purchase"        # Stock received from purchase
    SALE = "sale"                # Stock issued for sale
    TRANSFER_IN = "transfer_in"  # Received from another godown
    TRANSFER_OUT = "transfer_out"  # Sent to another godown
    ADJUSTMENT_IN = "adjustment_in"  # Manual adjustment increase
    ADJUSTMENT_OUT = "adjustment_out"  # Manual adjustment decrease
    MANUFACTURING_IN = "manufacturing_in"  # Finished goods from production
    MANUFACTURING_OUT = "manufacturing_out"  # Raw materials consumed
    REPACK_IN = "repack_in"      # Goods received from repackaging
    REPACK_OUT = "repack_out"    # Goods consumed in repackaging
    CONVERSION_IN = "conversion_in"  # Product converted TO (destination)
    CONVERSION_OUT = "conversion_out"  # Product converted FROM (source)


class StockJournalType(str, PyEnum):
    """Type of stock journal voucher."""
    TRANSFER = "transfer"        # Inter-godown transfer (same item)
    MANUFACTURING = "manufacturing"  # Assembly: components -> finished goods
    DISASSEMBLY = "disassembly"  # Disassembly: finished goods -> components
    REPACKAGING = "repackaging"  # Repack: Product A -> Product B (different packaging)
    CONVERSION = "conversion"    # Product transformation: A+C -> B
    ADJUSTMENT = "adjustment"    # Stock adjustment (damage, expiry, samples)


class StockJournalStatus(str, PyEnum):
    """Stock journal status."""
    DRAFT = "draft"
    CONFIRMED = "confirmed"
    CANCELLED = "cancelled"


class ExchangeRateSource(str, PyEnum):
    """Source of exchange rate."""
    MANUAL = "manual"
    RBI = "rbi"
    OANDA = "oanda"
    XE = "xe"

# In models.py
class PurchaseType(str, enum.Enum):
    PURCHASE = "purchase"  # Changed to lowercase
    PURCHASE_IMPORT = "purchase_import"  # Changed to lowercase
    PURCHASE_EXPENSES = "purchase_expenses"  # Changed to lowercase

# ==================== MULTI-CURRENCY MODELS ====================

class Currency(Base):
    """Currency master for multi-currency support."""
    __tablename__ = "currencies"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    company_id = Column(String(36), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    
    code = Column(String(3), nullable=False)  # ISO 4217 code: USD, EUR, GBP, etc.
    name = Column(String(100), nullable=False)  # US Dollar, Euro, etc.
    symbol = Column(String(10))  # $, €, £, etc.
    decimal_places = Column(Integer, default=2)
    
    is_base_currency = Column(Boolean, default=False)  # Only INR should be True for Indian companies
    is_active = Column(Boolean, default=True)
    
    # Display settings
    symbol_position = Column(String(10), default="before")  # before or after amount
    thousand_separator = Column(String(1), default=",")
    decimal_separator = Column(String(1), default=".")
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        Index("idx_currency_company", "company_id"),
        Index("idx_currency_code", "company_id", "code", unique=True),
    )

    def __repr__(self):
        return f"<Currency {self.code}>"


class ExchangeRate(Base):
    """Exchange rates for currency conversion."""
    __tablename__ = "exchange_rates"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    company_id = Column(String(36), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    
    from_currency_id = Column(String(36), ForeignKey("currencies.id", ondelete="CASCADE"), nullable=False)
    to_currency_id = Column(String(36), ForeignKey("currencies.id", ondelete="CASCADE"), nullable=False)
    
    rate = Column(Numeric(18, 8), nullable=False)  # 1 from_currency = rate to_currency
    rate_date = Column(DateTime, nullable=False)  # Effective date
    
    source = Column(Enum(ExchangeRateSource), default=ExchangeRateSource.MANUAL)
    
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    from_currency = relationship("Currency", foreign_keys=[from_currency_id])
    to_currency = relationship("Currency", foreign_keys=[to_currency_id])

    __table_args__ = (
        Index("idx_exchange_rate_company", "company_id"),
        Index("idx_exchange_rate_date", "rate_date"),
        Index("idx_exchange_rate_pair", "from_currency_id", "to_currency_id", "rate_date"),
    )

    def __repr__(self):
        return f"<ExchangeRate {self.from_currency_id}->{self.to_currency_id}: {self.rate}>"


class ForexGainLoss(Base):
    """Track realized and unrealized forex gain/loss."""
    __tablename__ = "forex_gain_loss"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    company_id = Column(String(36), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    
    # Reference to original transaction
    reference_type = Column(String(50))  # invoice, purchase_invoice, etc.
    reference_id = Column(String(36))
    
    currency_id = Column(String(36), ForeignKey("currencies.id", ondelete="SET NULL"))
    
    # Original transaction details
    original_amount = Column(Numeric(14, 2), nullable=False)  # In foreign currency
    original_rate = Column(Numeric(18, 8), nullable=False)
    original_base_amount = Column(Numeric(14, 2), nullable=False)  # In INR
    
    # Settlement/Revaluation details
    settlement_amount = Column(Numeric(14, 2))  # In foreign currency
    settlement_rate = Column(Numeric(18, 8))
    settlement_base_amount = Column(Numeric(14, 2))  # In INR
    
    # Gain/Loss
    gain_loss_amount = Column(Numeric(14, 2), nullable=False)  # Positive = gain, Negative = loss
    is_realized = Column(Boolean, default=False)  # True if from actual payment, False if from revaluation
    
    gain_loss_date = Column(DateTime, nullable=False)
    
    # Link to accounting entry
    transaction_id = Column(String(36), ForeignKey("transactions.id", ondelete="SET NULL"))
    
    notes = Column(Text)
    
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        Index("idx_forex_company", "company_id"),
        Index("idx_forex_reference", "reference_type", "reference_id"),
    )


# ==================== COST CENTER & BUDGET MODELS ====================

class CostCenterAllocationType(str, PyEnum):
    """How cost is allocated to cost center."""
    AMOUNT = "amount"
    PERCENTAGE = "percentage"
    QUANTITY = "quantity"


class BudgetStatus(str, PyEnum):
    """Budget status."""
    DRAFT = "draft"
    APPROVED = "approved"
    ACTIVE = "active"
    CLOSED = "closed"


class BudgetPeriod(str, PyEnum):
    """Budget period type."""
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"
    ANNUAL = "annual"


class CostCenter(Base):
    """Cost Center for expense tracking and allocation."""
    __tablename__ = "cost_centers"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    company_id = Column(String(36), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    
    code = Column(String(20), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    
    # Hierarchy
    parent_id = Column(String(36), ForeignKey("cost_centers.id", ondelete="SET NULL"))
    level = Column(Integer, default=0)  # 0 = root, 1 = child, etc.
    
    # Optional: Link to department
    department_id = Column(String(36))
    
    # Settings
    is_active = Column(Boolean, default=True)
    allow_direct_posting = Column(Boolean, default=True)  # Can transactions be posted directly?
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    parent = relationship("CostCenter", remote_side=[id], backref="children")

    __table_args__ = (
        Index("idx_cost_center_company", "company_id"),
        Index("idx_cost_center_code", "company_id", "code", unique=True),
    )

    def __repr__(self):
        return f"<CostCenter {self.code} - {self.name}>"


class CostCategory(Base):
    """Cost Category for grouping expenses (e.g., Direct, Indirect, Administrative)."""
    __tablename__ = "cost_categories"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    company_id = Column(String(36), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    
    code = Column(String(20), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    
    allocation_type = Column(Enum(CostCenterAllocationType), default=CostCenterAllocationType.AMOUNT)
    
    is_active = Column(Boolean, default=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        Index("idx_cost_category_company", "company_id"),
        Index("idx_cost_category_code", "company_id", "code", unique=True),
    )

    def __repr__(self):
        return f"<CostCategory {self.code} - {self.name}>"


class BudgetMaster(Base):
    """Budget master for tracking planned vs actual expenses."""
    __tablename__ = "budget_masters"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    company_id = Column(String(36), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    
    name = Column(String(255), nullable=False)
    description = Column(Text)
    financial_year = Column(String(9), nullable=False)  # e.g., "2024-2025"
    
    from_date = Column(DateTime, nullable=False)
    to_date = Column(DateTime, nullable=False)
    
    period_type = Column(Enum(BudgetPeriod), default=BudgetPeriod.MONTHLY)
    status = Column(Enum(BudgetStatus), default=BudgetStatus.DRAFT)
    
    # Totals (computed)
    total_budgeted = Column(Numeric(14, 2), default=0)
    total_actual = Column(Numeric(14, 2), default=0)
    total_variance = Column(Numeric(14, 2), default=0)
    
    # Workflow
    created_by = Column(String(36))
    approved_by = Column(String(36))
    approved_at = Column(DateTime)
    
    notes = Column(Text)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    lines = relationship("BudgetLine", back_populates="budget", cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_budget_company", "company_id"),
        Index("idx_budget_fy", "financial_year"),
    )

    def __repr__(self):
        return f"<Budget {self.name} - {self.financial_year}>"


class BudgetLine(Base):
    """Individual budget line items by account and cost center."""
    __tablename__ = "budget_lines"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    budget_id = Column(String(36), ForeignKey("budget_masters.id", ondelete="CASCADE"), nullable=False)
    
    account_id = Column(String(36), ForeignKey("accounts.id", ondelete="CASCADE"), nullable=False)
    cost_center_id = Column(String(36), ForeignKey("cost_centers.id", ondelete="SET NULL"))
    
    # Period details (for monthly/quarterly breakdowns)
    period_month = Column(Integer)  # 1-12 for monthly
    period_quarter = Column(Integer)  # 1-4 for quarterly
    
    budgeted_amount = Column(Numeric(14, 2), nullable=False, default=0)
    actual_amount = Column(Numeric(14, 2), default=0)  # Computed from transactions
    variance_amount = Column(Numeric(14, 2), default=0)  # budgeted - actual
    variance_percentage = Column(Numeric(8, 2), default=0)  # (variance / budgeted) * 100
    
    notes = Column(Text)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    budget = relationship("BudgetMaster", back_populates="lines")

    __table_args__ = (
        Index("idx_budget_line_budget", "budget_id"),
        Index("idx_budget_line_account", "account_id"),
        Index("idx_budget_line_cost_center", "cost_center_id"),
    )


class User(Base):
    """User model - represents a tenant in the multi-tenant system."""
    __tablename__ = "users"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    supabase_id = Column(String(255), unique=True, index=True)  # Supabase auth user ID
    email = Column(String(255), unique=True, nullable=False, index=True)
    full_name = Column(String(255), nullable=False)
    phone = Column(String(20))
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    company_id = Column(String(36), ForeignKey("companies.id", ondelete="SET NULL"), nullable=True)
    designation_id = Column(String(36), ForeignKey("designations.id", ondelete="SET NULL"), nullable=True)

    # Relationships
    items = relationship("Product", back_populates="creator")
    taxes = relationship("Tax", back_populates="creator")
    brands = relationship("Brand", back_populates="creator")
    categories = relationship("Category", back_populates="creator")
    companies = relationship(
        "Company",
        back_populates="owner",
        cascade="all, delete-orphan",
        foreign_keys="Company.user_id",
    )
    company = relationship("Company", foreign_keys=[company_id])
    designation = relationship("Designation", foreign_keys=[designation_id])
    approved_purchase_requests = relationship("PurchaseRequest", foreign_keys="[PurchaseRequest.approved_by]", back_populates="approver")
    def __repr__(self):
        return f"<User {self.email}>"


class Brand(Base):
    """Brand model for products."""
    __tablename__ = "brands"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    company_id = Column(String(36), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(191), nullable=False)
    description = Column(Text, nullable=True)
    created_by = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    
    # Soft delete
    deleted_at = Column(DateTime, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    company = relationship("Company")
    creator = relationship("User")
    
    __table_args__ = (
        Index("idx_brands_company", "company_id"),
        Index("idx_brands_name", "company_id", "name"),
    )
    
    def __repr__(self):
        return f"<Brand(id={self.id}, name='{self.name}', company_id={self.company_id})>"

class Category(Base):
    """Category model for products."""
    __tablename__ = "categories"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    company_id = Column(String(36), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(191), nullable=False)
    description = Column(Text, nullable=True)
    created_by = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    
    # Soft delete
    deleted_at = Column(DateTime, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    company = relationship("Company")
    creator = relationship("User")
    
    __table_args__ = (
        Index("idx_categories_company", "company_id"),
        Index("idx_categories_name", "company_id", "name"),
    )
    
    def __repr__(self):
        return f"<Category(id={self.id}, name='{self.name}', company_id={self.company_id})>"
        
class Tax(Base):
    """Tax model for items."""
    __tablename__ = "taxes"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(50), nullable=False)
    rate = Column(Numeric(5, 2), nullable=False)  # Tax rate percentage
    created_by = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    items = relationship("Product", back_populates="tax")
    creator = relationship("User", back_populates="taxes")
    
    def __repr__(self):
        return f"<Tax(id={self.id}, name='{self.name}', rate={self.rate})>"


class Company(Base):
    """Company model - represents a business entity for invoicing."""
    __tablename__ = "companies"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    # Business details
    name = Column(String(255), nullable=False)
    trade_name = Column(String(255))  # Trading name if different
    gstin = Column(String(15), index=True)  # GST Identification Number
    pan = Column(String(10))  # PAN Number
    cin = Column(String(21))  # Company Identification Number (optional)
    
    # Contact details
    email = Column(String(255))
    phone = Column(String(20))
    website = Column(String(255))
    
    # Address
    address_line1 = Column(String(255))
    address_line2 = Column(String(255))
    city = Column(String(100))
    state = Column(String(100))
    state_code = Column(String(2))  # GST state code (e.g., "27" for Maharashtra)
    pincode = Column(String(10))
    country = Column(String(100), default="India")
    
    # Business info
    business_type = Column(String(50))  # Pvt Ltd, LLP, Proprietorship, etc.
    
    # Branding
    logo_url = Column(String(500))
    signature_url = Column(String(500))
    
    # Invoice settings
    invoice_prefix = Column(String(20), default="INV")
    invoice_counter = Column(Integer, default=1)
    invoice_terms = Column(Text)  # Default terms and conditions
    invoice_notes = Column(Text)  # Default notes

    # Sales tracking settings
    petrol_rate_per_km = Column(Numeric(10, 2), default=0)

    # Bank details for invoices
    default_bank_id = Column(String(36))
    
    # Inventory automation settings
    auto_reduce_stock = Column(Boolean, default=True)
    warehouse_priorities = Column(JSON)  # {"priority_order": ["godown_id1", "godown_id2", "main"]}
    
    # Inventory settings (NEW)
    negative_stock_allowed = Column(Boolean, default=True)
    default_valuation_method = Column(String(20), default="weighted_avg")  # fifo, lifo, weighted_avg
    
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    owner = relationship("User", foreign_keys=[user_id], back_populates="companies")
    customers = relationship("Customer", back_populates="company", cascade="all, delete-orphan")
    customer_types = relationship("CustomerTypeMaster", back_populates="company", cascade="all, delete-orphan")
    items = relationship("Product", back_populates="company", cascade="all, delete-orphan")
    invoices = relationship("Invoice", back_populates="company", cascade="all, delete-orphan")
    bank_accounts = relationship("BankAccount", back_populates="company", cascade="all, delete-orphan")
    vendors = relationship("Vendor", back_populates="company", cascade="all, delete-orphan")
    accounts = relationship("Account", back_populates="company", cascade="all, delete-orphan")
    transactions = relationship("Transaction", back_populates="company", cascade="all, delete-orphan")
    bank_imports = relationship("BankImport", back_populates="company", cascade="all, delete-orphan")
    
    proforma_invoices = relationship("ProformaInvoice", back_populates="company", cascade="all, delete-orphan")
    purchase_requests = relationship("PurchaseRequest", back_populates="company", cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_company_user", "user_id"),
        Index("idx_company_gstin", "gstin"),
    )

    @property
    def address(self):
        """Single-line address from address_line1, address_line2, city, state, pincode."""
        parts = [self.address_line1, self.address_line2, self.city, self.state, self.pincode]
        return ", ".join(p for p in parts if p) or None

    def __repr__(self):
        return f"<Company {self.name}>"

class PurchaseRequest(Base):
    """Simplified Purchase Request model - Only essential columns."""
    __tablename__ = "purchase_requests"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    company_id = Column(String(36), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    customer_id = Column(String(36), ForeignKey("customers.id", ondelete="CASCADE"), nullable=False)
    customer_name = Column(String(255), nullable=False)
    
    # Request numbers
    request_number = Column(String(50), unique=True, nullable=False, index=True)
    purchase_req_no = Column(String(50), unique=True, nullable=True, index=True)
    request_date = Column(DateTime, default=func.now(), nullable=False)
    
    # Items: [{"item": "Product Name", "quantity": 5, "make": "Brand Name"}]
    items = Column(JSON, nullable=False)
    
    # Status fields
    overall_status = Column(String(50), nullable=True)
    status = Column(
        Enum(
            'pending',
            'approved',
            'hold',
            'rejected',
            'open',
            'in_progress',
            'closed',
            name='purchase_request_status'
        ),
        default='pending',
        nullable=False
    )
    
    # Approval details
    approved_by = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    approved_by_user = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    approved_by_employee = Column(String(36), ForeignKey("employees.id", ondelete="SET NULL"), nullable=True)
    approved_by_name = Column(String(255), nullable=True)
    approved_by_email = Column(String(255), nullable=True)
    approved_at = Column(DateTime, nullable=True)
    approval_notes = Column(Text, nullable=True)
    
    # Request notes
    store_remarks = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    additional_notes = Column(Text, nullable=True)

    # Creator/Updater details
    created_by_user = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_by_employee = Column(String(36), ForeignKey("employees.id", ondelete="SET NULL"), nullable=True)
    created_by_name = Column(String(255), nullable=True)
    created_by_email = Column(String(255), nullable=True)
    updated_by_user = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    updated_by_employee = Column(String(36), ForeignKey("employees.id", ondelete="SET NULL"), nullable=True)
    
    # Basic timestamps
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)
    is_deleted = Column(Boolean, default=False, nullable=False)
    
    # Relationships
    company = relationship("Company")
    customer = relationship("Customer")
    approver = relationship("User", foreign_keys=[approved_by])
    approval_status = synonym("status")
    general_notes = synonym("notes")
    
    def __repr__(self):
        return f"<PurchaseRequest {self.request_number} - {self.customer_name}>"


class OpeningBalanceTypeEnum(str, enum.Enum):
    OUTSTANDING = "outstanding"
    ADVANCE = "advance"


class OpeningBalanceModeEnum(str, enum.Enum):
    SINGLE = "single"
    SPLIT = "split"


class OpeningBalanceItem(Base):
    __tablename__ = "opening_balance_items"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    customer_id = Column(String(36), ForeignKey("customers.id", ondelete="CASCADE"), nullable=False)
    date = Column(Date, nullable=False)
    
    voucher_name = Column(String(255), nullable=False)
    days = Column(Integer)
    amount = Column(Numeric(15, 2), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    customer = relationship("Customer", back_populates="opening_balance_items")


class ContactPerson(Base):
    __tablename__ = "contact_persons"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    customer_id = Column(String(36), ForeignKey("customers.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    email = Column(String(255))
    phone = Column(String(20))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    customer = relationship("Customer", back_populates="contact_persons")


class CustomerTypeMaster(Base):
    __tablename__ = "customer_types"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    company_id = Column(
        String(36),
        ForeignKey("companies.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name = Column(String(100), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    company = relationship("Company", back_populates="customer_types")

    __table_args__ = (
        UniqueConstraint("company_id", "name", name="uq_customer_types_company_name"),
        Index("idx_customer_types_company_name", "company_id", "name"),
    )

    def __repr__(self):
        return f"<CustomerTypeMaster(id={self.id}, name='{self.name}', company_id={self.company_id})>"


class Customer(Base):
    __tablename__ = "customers"

    id = Column(String(36), primary_key=True, default=generate_uuid, index=True)
    company_id = Column(String(36), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Basic Information
    name = Column(String(255), nullable=False)
    contact = Column(String(15), nullable=False)
    email = Column(String(255))
    mobile = Column(String(15))
    
    # Tax Information
    tax_number = Column(String(15))  # GST number
    gst_registration_type = Column(String(50))
    pan_number = Column(String(10))
    vendor_code = Column(String(50))
    
    trade_name = Column(String(255))
    billing_address_line1 = Column(String(255))
    billing_address_line2 = Column(String(255))
    billing_state_code = Column(String(2))
    shipping_address_line1 = Column(String(255))
    shipping_address_line2 = Column(String(255))
    shipping_state_code = Column(String(2))
    block_on_credit_exceed = Column(Boolean, default=False)
    price_level_id = Column(String(36), ForeignKey("price_levels.id"))
    interest_rate = Column(Numeric(5, 2), default=0.00)
    # Opening Balance Fields
    opening_balance = Column(Numeric(15, 2), default=0.00)
    opening_balance_type = Column(String(20))  # 'outstanding' or 'advance'
    opening_balance_mode = Column(String(10))  # 'single' or 'split'
    
    # Financial Balances
    outstanding_balance = Column(Numeric(15, 2), default=0.00)
    advance_balance = Column(Numeric(15, 2), default=0.00)
    
    # Credit Information
    credit_limit = Column(Numeric(15, 2), default=0.00)
    credit_days = Column(Integer, default=0)
    
    # Customer Code
    customer_code = Column(String(50), unique=True, index=True)
    
    # Total Transactions
    total_transactions = Column(Integer, default=0)
    last_transaction_date = Column(Date)
    
    # Billing Address
    billing_address = Column(Text)
    billing_city = Column(String(100))
    billing_state = Column(String(100))
    billing_country = Column(String(100), default="India")
    billing_zip = Column(String(20))

    # Location (for tracking / nearby customers)
    district = Column(String(100))
    area = Column(String(100))
    location_lat = Column(Float)
    location_lng = Column(Float)
    location_address = Column(String(500))
    
    # Shipping Address
    shipping_address = Column(Text)
    shipping_city = Column(String(100))
    shipping_state = Column(String(100))
    shipping_country = Column(String(100), default="India")
    shipping_zip = Column(String(20))
    
    # Customer Type
    customer_type = Column(String(100), default="b2b")
    
    # Contact Person Info
    contact_person_name = Column(String(255))
    
    # System Fields
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    deleted_at = Column(DateTime)
    
    # Relationships
    company = relationship("Company", back_populates="customers")
    invoices = relationship("Invoice", back_populates="customer", cascade="all, delete-orphan")
    
    opening_balance_items = relationship("OpeningBalanceItem", back_populates="customer", cascade="all, delete-orphan")
    contact_persons = relationship("ContactPerson", back_populates="customer", cascade="all, delete-orphan")
    contacts = relationship("Contact", back_populates="customer", cascade="all, delete-orphan")
    purchase_requests = relationship("PurchaseRequest", back_populates="customer", cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_customer_location", "location_lat", "location_lng"),
        Index("idx_customer_district", "district", "area"),
    )
    # Compatibility aliases for code that expects these attribute names
    @property
    def gstin(self):
        return self.tax_number

    @property
    def billing_pincode(self):
        return self.billing_zip

    @property
    def shipping_pincode(self):
        return self.shipping_zip

    @property
    def pincode(self):
        return self.billing_zip or self.shipping_zip

    @property
    def phone(self):
        return self.contact or self.mobile

    @property
    def address(self):
        return self.billing_address

    @property
    def city(self):
        return self.billing_city

    @property
    def state(self):
        return self.billing_state

    def __repr__(self):
        return f"<Customer(id={self.id}, name='{self.name}', company_id={self.company_id})>"


class Product(Base):
    """Product/Service model - Unified product with inventory tracking."""
    __tablename__ = "items"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(191), nullable=False, index=True)
    item_code = Column(String(50), unique=True, nullable=True) 
 
    item_group = Column(String(200), default="single")
    hsn_code = Column(String(50), nullable=True)
    barcode = Column(String(100), nullable=True, index=True)
    brand = Column(String(100), nullable=True)
    unit = Column(String(50), nullable=True)
    alert_quantity = Column(Integer, default=0)
    category = Column(String(100), nullable=True)
    description = Column(Text, nullable=True)
    discount_type = Column(discount_type_enum, default='percentage')
    discount = Column(Numeric(15, 2), default=0.00)
    price = Column(Numeric(15, 2), default=0.00)
    tax_type = Column(String(100), nullable=True)
    mrp = Column(Numeric(15, 2), default=0.00)
    company_id = Column(String(36), ForeignKey("companies.id"), nullable=False, index=True)
    godown_id = Column(String(36), ForeignKey("godowns.id", ondelete="SET NULL"), nullable=True, index=True)
    tax_id = Column(String(36), ForeignKey("taxes.id"), nullable=True, index=True)
    profit_margin = Column(Numeric(8, 2), default=0.00)
    sku = Column(String(100), nullable=True, index=True)
    seller_points = Column(Integer, default=0)
    purchase_price = Column(Numeric(15, 2), default=0.00)
    sales_price = Column(Numeric(15, 2), default=0.00)
    opening_stock = Column(Integer, default=0)
    quantity = Column(Integer, default=0)
    image = Column(String(191), nullable=True)
    additional_image = Column(String(191), nullable=True)
    created_by = Column(String(36), ForeignKey("users.id"), nullable=False, index=True) 
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    deleted_at = Column(DateTime, nullable=True)
    
    # Inventory columns (aliased by properties below for code compatibility)
    current_stock = Column(Numeric(14, 3), default=0)  # Actual DB column for stock
    min_stock_level = Column(Numeric(14, 3), default=0)  # Minimum stock threshold
    reorder_level = Column(Numeric(14, 3), default=0)  # Reorder point
    standard_cost = Column(Numeric(15, 2), default=0)  # Standard/average cost
    unit_price = Column(Numeric(15, 2), default=0)  # Default selling unit price
    
    # ADD this column if not present
    stock_group_id = Column(String(36), ForeignKey("stock_groups.id", ondelete="SET NULL"), index=True)
    is_active = Column(Boolean, default=True, index=True)
    is_service = Column(Boolean, default=False, index=True)

    # Relationships - FIXED
    company = relationship("Company", back_populates="items")
    tax = relationship("Tax", back_populates="items")
    creator = relationship("User", back_populates="items")
    stock_group = relationship("StockGroup", back_populates="items")
    batches = relationship("Batch", back_populates="product", cascade="all, delete-orphan")
    bom_components = relationship("BOMComponent", back_populates="component_product", cascade="all, delete-orphan")
    
    brand_id = Column(String(36), ForeignKey("brands.id", ondelete="SET NULL"), nullable=True, index=True)
    category_id = Column(String(36), ForeignKey("categories.id", ondelete="SET NULL"), nullable=True, index=True)
    
    # Approval workflow
    approval_status = Column(String(50), default="approved")  # draft, pending, approved, rejected
    approved_by = Column(String(36), ForeignKey("employees.id", ondelete="SET NULL"), nullable=True)
    approved_at = Column(DateTime, nullable=True)
    rejection_reason = Column(Text, nullable=True)
    
    # Add these relationships
    brand = relationship("Brand", backref="products")
    category = relationship("Category", backref="products")
    godown = relationship("Godown", foreign_keys=[godown_id])

    # Add the missing relationship for stock_entries
    stock_entries = relationship("StockEntry", back_populates="product", cascade="all, delete-orphan")
    alternative_mappings = relationship("ProductAlternativeMapping", back_populates="product", cascade="all, delete-orphan")
    
    def to_dict(self):
        """Convert to dictionary excluding system-managed fields."""
        data = {}
        for column in self.__table__.columns:
            if column.name not in ['item_group']:  # Exclude item_group
                data[column.name] = getattr(self, column.name)
        return data
        
    def __repr__(self):
        return f"<Item(id={self.id}, name='{self.name}', sku='{self.sku}')>"


class AlternativeProduct(Base):
    """Alternative/Competitor Product model - Reference only, no inventory tracking."""
    __tablename__ = "alternative_products"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    company_id = Column(String(36), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    
    # Product details
    name = Column(String(255), nullable=False)
    manufacturer = Column(String(255))  # Manufacturer/brand name
    model_number = Column(String(100))  # Model/part number
    description = Column(Text)
    category = Column(String(100))  # Product category
    specifications = Column(JSON)  # Additional specs as JSON
    
    # Reference info
    reference_url = Column(String(500))  # Link to product page
    reference_price = Column(Numeric(14, 2))  # Estimated/known price
    
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    company = relationship("Company", backref="alternative_products")
    product_mappings = relationship("ProductAlternativeMapping", back_populates="alternative_product", cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_alt_product_company", "company_id"),
        Index("idx_alt_product_manufacturer", "manufacturer"),
        Index("idx_alt_product_model", "model_number"),
    )

    def __repr__(self):
        return f"<AlternativeProduct {self.name}>"


class ProductAlternativeMapping(Base):
    """Mapping table for Product to AlternativeProduct (many-to-many)."""
    __tablename__ = "product_alternative_mappings"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    product_id = Column(String(36), ForeignKey("items.id", ondelete="CASCADE"), nullable=False)
    alternative_product_id = Column(String(36), ForeignKey("alternative_products.id", ondelete="CASCADE"), nullable=False)
    
    # Mapping details
    notes = Column(Text)  # Mapping-specific notes
    priority = Column(Integer, default=0)  # Ranking/preference (lower = higher priority)
    comparison_notes = Column(Text)  # How they compare
    
    created_at = Column(DateTime, default=datetime.utcnow)
    created_by = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"))

    # Relationships
    product = relationship("Product", back_populates="alternative_mappings")
    alternative_product = relationship("AlternativeProduct", back_populates="product_mappings")

    __table_args__ = (
        UniqueConstraint("product_id", "alternative_product_id", name="uq_product_alternative"),
        Index("idx_mapping_product", "product_id"),
        Index("idx_mapping_alternative", "alternative_product_id"),
    )

    def __repr__(self):
        return f"<ProductAlternativeMapping {self.product_id} -> {self.alternative_product_id}>"


class Invoice(Base):
    """Invoice model - GST compliant invoice."""
    __tablename__ = "invoices"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    company_id = Column(String(36), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    customer_id = Column(String(36), ForeignKey("customers.id", ondelete="SET NULL"))
    
    # Sales pipeline tracking
    sales_ticket_id = Column(String(36), ForeignKey("sales_tickets.id", ondelete="SET NULL"))
    contact_id = Column(String(36), ForeignKey("contacts.id", ondelete="SET NULL"))
    voucher_type = Column(Enum(InvoiceVoucher), nullable=False, default=InvoiceVoucher.SALES)
    
    # Invoice identification
    invoice_number = Column(String(50), nullable=False, index=True)
    invoice_date = Column(DateTime, nullable=False, default=datetime.utcnow)
    due_date = Column(DateTime)
    round_off = Column(Numeric(15, 2), default=0.00)
    sales_person_id = Column(String(36), ForeignKey("employees.id"), nullable=True, index=True)
    shipping_address = Column(Text, nullable=True)
    shipping_city = Column(String(100), nullable=True)
    shipping_state = Column(String(100), nullable=True)
    shipping_country = Column(String(100), default="India", nullable=True)
    shipping_zip = Column(String(20), nullable=True)

    reference_no = Column(String(100), nullable=True)
    delivery_note = Column(Text, nullable=True)
    payment_terms = Column(String(255), nullable=True)
    supplier_ref = Column(String(100), nullable=True)
    other_references = Column(Text, nullable=True)
    buyer_order_no = Column(String(100), nullable=True)
    buyer_order_date = Column(Date, nullable=True)
    despatch_doc_no = Column(String(100), nullable=True)
    delivery_note_date = Column(Date, nullable=True)
    despatched_through = Column(String(100), nullable=True)
    destination = Column(String(255), nullable=True)
    terms_of_delivery = Column(Text, nullable=True)
    freight_charges = Column(Numeric(15, 2), default=0.00)
    packing_forwarding_charges = Column(Numeric(15, 2), default=0.00)
    coupon_code = Column(String(50), nullable=True)
    coupon_value = Column(Numeric(15, 2), default=0.00)
    discount_on_all = Column(Numeric(15, 2), default=0.00)
    discount_type = Column(String(20), default='percentage')
    
    # Payment
    payment_type = Column(String(20), nullable=True)
    payment_account = Column(String(100), nullable=True)
    payment_note = Column(Text, nullable=True)
    adjust_advance_payment = Column(Boolean, default=False)

    customer_name = Column(String(255), nullable=True)
    customer_gstin = Column(String(15), nullable=True)
    customer_phone = Column(String(15), nullable=True)
    customer_state = Column(String(100), nullable=True)
    customer_state_code = Column(String(2), nullable=True)
    # Invoice type for GST
    invoice_type = Column(Enum(InvoiceType, name='invoice_type_enum'), default=InvoiceType.B2C)
 
    # Place of supply (State code for GST)
    place_of_supply = Column(String(2))  # State code
    place_of_supply_name = Column(String(100))
    
    # Reverse charge
    is_reverse_charge = Column(Boolean, default=False)
    
    # Amounts (all in INR)
    subtotal = Column(Numeric(14, 2), default=0)  # Total before tax
    discount_amount = Column(Numeric(14, 2), default=0)
    
    # GST breakup
    cgst_amount = Column(Numeric(14, 2), default=0)  # Central GST
    sgst_amount = Column(Numeric(14, 2), default=0)  # State GST
    igst_amount = Column(Numeric(14, 2), default=0)  # Integrated GST
    cess_amount = Column(Numeric(14, 2), default=0)  # Cess if applicable
    
    total_tax = Column(Numeric(14, 2), default=0)
    total_amount = Column(Numeric(14, 2), default=0)  # Final amount
    
    # Payment tracking
    amount_paid = Column(Numeric(14, 2), default=0)
    balance_due = Column(Numeric(14, 2), default=0)
    outstanding_amount = Column(Numeric(14, 2), default=0)  # NEW: For bill-wise tracking
    
    # Status
    status = Column(Enum(InvoiceStatus, name='invoice_status_enum'), default=InvoiceStatus.DRAFT)
    # Payment link
    payment_link = Column(String(500))
    upi_qr_data = Column(Text)  # UPI QR code data
    
    # Additional info
    notes = Column(Text)
    terms = Column(Text)
    
    # E-Invoice fields (for future GST compliance)
    irn = Column(String(64))  # Invoice Reference Number
    ack_number = Column(String(50))
    ack_date = Column(DateTime)
    signed_qr = Column(Text)
    
    # Courier tracking
    courier_company = Column(String(200))
    courier_docket_number = Column(String(100))
    courier_tracking_url = Column(String(500))
    
    # PDF storage
    pdf_url = Column(String(500))
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    company = relationship("Company", back_populates="invoices")
    customer = relationship("Customer", back_populates="invoices")
    sales_ticket = relationship("SalesTicket")
    sales_person = relationship("Employee", foreign_keys=[sales_person_id])
    contact = relationship("Contact")
    items = relationship("InvoiceItem", back_populates="invoice", cascade="all, delete-orphan")
    payments = relationship("Payment", back_populates="invoice", cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_invoice_company", "company_id"),
        Index("idx_invoice_customer", "customer_id"),
        Index("idx_invoice_date", "invoice_date"),
        Index("idx_invoice_status", "status"),
        Index("idx_invoice_ticket", "sales_ticket_id"),
    )

    def __repr__(self):
        return f"<Invoice {self.invoice_number}>"


class InvoiceItem(Base):
    """Invoice line item model."""
    __tablename__ = "invoice_items"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    invoice_id = Column(String(36), ForeignKey("invoices.id", ondelete="CASCADE"), nullable=False)
    product_id = Column(String(36), ForeignKey("items.id", ondelete="SET NULL"))
    
    # Item details
    description = Column(String(500), nullable=False)
    hsn_code = Column(String(8))
    
    # Quantity and pricing
    quantity = Column(Numeric(10, 3), nullable=False)
    unit = Column(String(20), default="unit")
    unit_price = Column(Numeric(12, 2), nullable=False)
    
    # Discount
    discount_percent = Column(Numeric(5, 2), default=0)
    discount_amount = Column(Numeric(12, 2), default=0)
    
    # Tax
    gst_rate = Column(Numeric(5, 2), nullable=False)  # GST rate percentage
    cgst_rate = Column(Numeric(5, 2), default=0)
    sgst_rate = Column(Numeric(5, 2), default=0)
    igst_rate = Column(Numeric(5, 2), default=0)
    
    cgst_amount = Column(Numeric(12, 2), default=0)
    sgst_amount = Column(Numeric(12, 2), default=0)
    igst_amount = Column(Numeric(12, 2), default=0)
    cess_amount = Column(Numeric(12, 2), default=0)
    
    # Totals
    taxable_amount = Column(Numeric(14, 2), nullable=False)  # After discount, before tax
    total_amount = Column(Numeric(14, 2), nullable=False)  # Including tax
    
    # Warehouse allocation tracking
    warehouse_allocation = Column(JSON)  # [{"godown_id": "xxx", "quantity": 10}, {"godown_id": null, "quantity": 5}]
    stock_reserved = Column(Boolean, default=False)  # Reserved on invoice create
    stock_reduced = Column(Boolean, default=False)   # Finalized on PAID
    
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    invoice = relationship("Invoice", back_populates="items")

    __table_args__ = (
        Index("idx_item_invoice", "invoice_id"),
    )

    def __repr__(self):
        return f"<InvoiceItem {self.description[:30]}>"


class Payment(Base):
    """Payment model - tracks payments against invoices."""
    __tablename__ = "payments"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    invoice_id = Column(String(36), ForeignKey("invoices.id", ondelete="CASCADE"), nullable=False)
    
    # Payment details
    amount = Column(Numeric(14, 2), nullable=False)
    payment_date = Column(DateTime, nullable=False, default=datetime.utcnow)
    payment_mode = Column(Enum(PaymentMode, name='payment_mode_enum'), default=PaymentMode.UPI)
    # Reference
    reference_number = Column(String(100))  # Transaction ID, Cheque number, etc.
    upi_transaction_id = Column(String(100))
    
    # Notes
    notes = Column(Text)
    
    # Status
    is_verified = Column(Boolean, default=False)
    verified_at = Column(DateTime)
    
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    invoice = relationship("Invoice", back_populates="payments")

    __table_args__ = (
        Index("idx_payment_invoice", "invoice_id"),
        Index("idx_payment_date", "payment_date"),
    )

    def __repr__(self):
        return f"<Payment {self.amount} for Invoice {self.invoice_id}>"


class SalesReturn(Base):
    """Sales Return header model."""
    __tablename__ = "sales_returns"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    company_id = Column(String(36), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    original_invoice_id = Column(String(36), ForeignKey("invoices.id", ondelete="SET NULL"))
    customer_id = Column(String(36), ForeignKey("customers.id", ondelete="SET NULL"))
    sales_person_id = Column(String(36), ForeignKey("employees.id", ondelete="SET NULL"))

    return_number = Column(String(50), nullable=False)
    return_date = Column(DateTime, nullable=False, default=datetime.utcnow)
    status = Column(String(50), default="pending")
    reason = Column(Text)
    reference_no = Column(String(100))
    notes = Column(Text)

    subtotal = Column(Numeric(14, 2), default=0)
    discount_amount = Column(Numeric(14, 2), default=0)
    cgst_amount = Column(Numeric(14, 2), default=0)
    sgst_amount = Column(Numeric(14, 2), default=0)
    igst_amount = Column(Numeric(14, 2), default=0)
    total_tax = Column(Numeric(14, 2), default=0)
    total_amount = Column(Numeric(14, 2), default=0)
    round_off = Column(Numeric(14, 2), default=0)
    freight_charges = Column(Numeric(14, 2), default=0)
    packing_forwarding_charges = Column(Numeric(14, 2), default=0)

    created_by = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    company = relationship("Company")
    original_invoice = relationship("Invoice", foreign_keys=[original_invoice_id])
    customer = relationship("Customer")
    sales_person = relationship("Employee", foreign_keys=[sales_person_id])
    creator = relationship("User", foreign_keys=[created_by])
    items = relationship("SalesReturnItem", back_populates="sales_return", cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint("company_id", "return_number", name="uq_sales_return_number_company"),
        Index("idx_sales_return_company", "company_id"),
        Index("idx_sales_return_invoice", "original_invoice_id"),
        Index("idx_sales_return_customer", "customer_id"),
        Index("idx_sales_return_date", "return_date"),
        Index("idx_sales_return_status", "status"),
    )

    def __repr__(self):
        return f"<SalesReturn {self.return_number}>"


class SalesReturnItem(Base):
    """Sales Return item model."""
    __tablename__ = "sales_return_items"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    sales_return_id = Column(String(36), ForeignKey("sales_returns.id", ondelete="CASCADE"), nullable=False)
    invoice_item_id = Column(String(36), ForeignKey("invoice_items.id", ondelete="SET NULL"))
    product_id = Column(String(36), ForeignKey("items.id", ondelete="SET NULL"))

    description = Column(String(500), nullable=False)
    hsn_code = Column(String(8))
    quantity = Column(Numeric(10, 3), nullable=False, default=1)
    unit = Column(String(20), default="unit")
    unit_price = Column(Numeric(12, 2), nullable=False, default=0)

    discount_percent = Column(Numeric(5, 2), default=0)
    discount_amount = Column(Numeric(12, 2), default=0)

    gst_rate = Column(Numeric(5, 2), default=0)
    cgst_rate = Column(Numeric(5, 2), default=0)
    sgst_rate = Column(Numeric(5, 2), default=0)
    igst_rate = Column(Numeric(5, 2), default=0)

    taxable_amount = Column(Numeric(14, 2), default=0)
    total_amount = Column(Numeric(14, 2), default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    sales_return = relationship("SalesReturn", back_populates="items")

    __table_args__ = (
        Index("idx_sales_return_item_return", "sales_return_id"),
    )

    def __repr__(self):
        return f"<SalesReturnItem {self.description[:30]}>"


class PurchaseReturn(Base):
    """Purchase Return header model."""
    __tablename__ = "purchase_returns"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    company_id = Column(String(36), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    original_purchase_id = Column(String(36), ForeignKey("purchases.id", ondelete="SET NULL"))
    vendor_id = Column(String(36), ForeignKey("vendors.id", ondelete="SET NULL"))

    return_number = Column(String(50), nullable=False)
    return_date = Column(DateTime, nullable=False, default=datetime.utcnow)
    status = Column(String(50), default="pending")
    reason = Column(Text)
    reference_no = Column(String(100))
    notes = Column(Text)

    subtotal = Column(Numeric(14, 2), default=0)
    discount_amount = Column(Numeric(14, 2), default=0)
    cgst_amount = Column(Numeric(14, 2), default=0)
    sgst_amount = Column(Numeric(14, 2), default=0)
    igst_amount = Column(Numeric(14, 2), default=0)
    cess_amount = Column(Numeric(14, 2), default=0)
    total_tax = Column(Numeric(14, 2), default=0)
    total_amount = Column(Numeric(14, 2), default=0)
    round_off = Column(Numeric(14, 2), default=0)
    freight_charges = Column(Numeric(14, 2), default=0)
    packing_forwarding_charges = Column(Numeric(14, 2), default=0)

    amount_paid = Column(Numeric(14, 2), default=0)
    payment_status = Column(String(30), default="Unpaid")

    created_by = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    company = relationship("Company")
    original_purchase = relationship("Purchase", foreign_keys=[original_purchase_id])
    vendor = relationship("Vendor", foreign_keys=[vendor_id])
    creator = relationship("User", foreign_keys=[created_by])
    items = relationship("PurchaseReturnItem", back_populates="purchase_return", cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint("company_id", "return_number", name="uq_purchase_return_number_company"),
        Index("idx_purchase_return_company", "company_id"),
        Index("idx_purchase_return_purchase", "original_purchase_id"),
        Index("idx_purchase_return_vendor", "vendor_id"),
        Index("idx_purchase_return_date", "return_date"),
        Index("idx_purchase_return_status", "status"),
    )

    def __repr__(self):
        return f"<PurchaseReturn {self.return_number}>"


class PurchaseReturnItem(Base):
    """Purchase Return item model."""
    __tablename__ = "purchase_return_items"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    purchase_return_id = Column(String(36), ForeignKey("purchase_returns.id", ondelete="CASCADE"), nullable=False)
    purchase_item_id = Column(String(36), ForeignKey("purchase_items.id", ondelete="SET NULL"))
    product_id = Column(String(36), ForeignKey("items.id", ondelete="SET NULL"))

    description = Column(String(500), nullable=False)
    hsn_code = Column(String(8))
    quantity = Column(Numeric(10, 3), nullable=False, default=1)
    unit = Column(String(20), default="unit")
    unit_price = Column(Numeric(12, 2), nullable=False, default=0)

    discount_percent = Column(Numeric(5, 2), default=0)
    discount_amount = Column(Numeric(12, 2), default=0)

    gst_rate = Column(Numeric(5, 2), default=0)
    cgst_rate = Column(Numeric(5, 2), default=0)
    sgst_rate = Column(Numeric(5, 2), default=0)
    igst_rate = Column(Numeric(5, 2), default=0)
    cess_amount = Column(Numeric(12, 2), default=0)

    taxable_amount = Column(Numeric(14, 2), default=0)
    total_amount = Column(Numeric(14, 2), default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    purchase_return = relationship("PurchaseReturn", back_populates="items")

    __table_args__ = (
        Index("idx_purchase_return_item_return", "purchase_return_id"),
    )

    def __repr__(self):
        return f"<PurchaseReturnItem {self.description[:30]}>"


class BankAccount(Base):
    """Bank account model - for displaying bank details on invoices."""
    __tablename__ = "bank_accounts"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    company_id = Column(String(36), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    
    # Bank details
    bank_name = Column(String(255), nullable=False)
    account_name = Column(String(255), nullable=False)
    account_number = Column(String(50), nullable=False)
    ifsc_code = Column(String(11), nullable=False)
    branch = Column(String(255))
    
    # UPI
    upi_id = Column(String(100))
    
    # Settings
    is_default = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    company = relationship("Company", back_populates="bank_accounts")

    __table_args__ = (
        Index("idx_bank_company", "company_id"),
    )

    def __repr__(self):
        return f"<BankAccount {self.bank_name} - {self.account_number[-4:]}>"


class Account(Base):
    """Chart of Accounts model - accounting accounts for double-entry bookkeeping."""
    __tablename__ = "accounts"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    company_id = Column(String(36), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    
    # Account identification
    code = Column(String(20), nullable=False)  # e.g., "1000", "1010"
    name = Column(String(255), nullable=False)
    description = Column(Text)
    
    # Account type
    account_type = Column(Enum(AccountType, name='account_type_enum'), nullable=False)
    # Hierarchy (for sub-accounts)
    parent_id = Column(String(36), ForeignKey("accounts.id", ondelete="SET NULL"))
    
    # Note: Balances are calculated from transaction entries, not stored
    # Use AccountingService.get_account_balance() to get balance
    
    # System account flag (protected, cannot be deleted)
    is_system = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    
    # Link to bank account (for bank type accounts)
    bank_account_id = Column(String(36), ForeignKey("bank_accounts.id", ondelete="SET NULL"))
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    company = relationship("Company", back_populates="accounts")
    parent = relationship("Account", remote_side=[id], backref="children")
    bank_account = relationship("BankAccount")
    transaction_entries = relationship("TransactionEntry", back_populates="account")

    __table_args__ = (
        Index("idx_account_company", "company_id"),
        Index("idx_account_code", "company_id", "code", unique=True),
        Index("idx_account_type", "account_type"),
    )

    def __repr__(self):
        return f"<Account {self.code} - {self.name}>"


class Transaction(Base):
    """Transaction model - Journal entry header for double-entry bookkeeping."""
    __tablename__ = "transactions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    company_id = Column(String(36), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    
    # Transaction identification
    transaction_number = Column(String(50), nullable=False)
    transaction_date = Column(DateTime, nullable=False, default=datetime.utcnow)
    
    # Voucher type (Tally-style)
    voucher_type = Column(Enum(VoucherType, name='voucher_type_enum'), default=VoucherType.JOURNAL)

    # Description
    description = Column(Text)
    
    # Party reference (customer/vendor for receivables/payables)
    party_id = Column(String(36))  # Customer or Vendor ID
    party_type = Column(String(20))  # 'customer' or 'vendor'
    
    # Reference to source document
    reference_type = Column(Enum(ReferenceType, name='reference_type_enum'), default=ReferenceType.MANUAL)
    reference_id = Column(String(36))  # ID of invoice, payment, etc.
    
    # Status
    status = Column(Enum(TransactionStatus, name='transaction_status_enum'), default=TransactionStatus.DRAFT)
    # Reconciliation
    is_reconciled = Column(Boolean, default=False)
    reconciled_at = Column(DateTime)
    
    # Totals (for validation - debits must equal credits)
    total_debit = Column(Numeric(14, 2), default=0)
    total_credit = Column(Numeric(14, 2), default=0)
    
    # Reversal reference
    reversed_by_id = Column(String(36), ForeignKey("transactions.id", ondelete="SET NULL"))
    reverses_id = Column(String(36), ForeignKey("transactions.id", ondelete="SET NULL"))
    
    # Optional/Memorandum vouchers (NEW)
    is_optional = Column(Boolean, default=False)
    converted_from_optional_id = Column(String(36))
    
    # Auto-reversing journals (NEW)
    auto_reverse_date = Column(DateTime)
    
    # Scenario reference (NEW)
    scenario_id = Column(String(36), ForeignKey("scenarios.id", ondelete="SET NULL"))
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    company = relationship("Company", back_populates="transactions")
    entries = relationship("TransactionEntry", back_populates="transaction", cascade="all, delete-orphan")
    reversed_by = relationship("Transaction", foreign_keys=[reversed_by_id], remote_side=[id])
    reverses = relationship("Transaction", foreign_keys=[reverses_id], remote_side=[id])
    scenario = relationship("Scenario")
    created_by = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"))
    __table_args__ = (
        Index("idx_transaction_company", "company_id"),
        Index("idx_transaction_date", "transaction_date"),
        Index("idx_transaction_reference", "reference_type", "reference_id"),
        Index("idx_transaction_status", "status"),
    )

    def __repr__(self):
        return f"<Transaction {self.transaction_number}>"


class TransactionEntry(Base):
    """Transaction entry model - Individual debit/credit line in a journal entry."""
    __tablename__ = "transaction_entries"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    transaction_id = Column(String(36), ForeignKey("transactions.id", ondelete="CASCADE"), nullable=False)
    account_id = Column(String(36), ForeignKey("accounts.id", ondelete="RESTRICT"), nullable=False)
    
    # Entry details
    description = Column(String(500))
    
    # Amounts (one must be zero)
    debit_amount = Column(Numeric(14, 2), default=0)
    credit_amount = Column(Numeric(14, 2), default=0)
    
    # Bank reconciliation fields (NEW)
    bank_date = Column(DateTime)  # Date as per bank statement
    is_reconciled = Column(Boolean, default=False)
    reconciliation_date = Column(DateTime)
    bank_reference = Column(String(100))
    cheque_id = Column(String(36), ForeignKey("cheques.id", ondelete="SET NULL"))
    
    # Cost center allocation (NEW)
    cost_center_id = Column(String(36), ForeignKey("cost_centers.id", ondelete="SET NULL"))
    
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    transaction = relationship("Transaction", back_populates="entries")
    account = relationship("Account", back_populates="transaction_entries")
    cost_center = relationship("CostCenter")
    cheque = relationship("Cheque")

    __table_args__ = (
        Index("idx_entry_transaction", "transaction_id"),
        Index("idx_entry_account", "account_id"),
    )

    def __repr__(self):
        return f"<TransactionEntry {self.debit_amount or self.credit_amount}>"


class BankImport(Base):
    """Bank import model - Tracks CSV import batches."""
    __tablename__ = "bank_imports"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    company_id = Column(String(36), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    bank_account_id = Column(String(36), ForeignKey("bank_accounts.id", ondelete="SET NULL"))
    
    # Import details
    file_name = Column(String(255), nullable=False)
    bank_name = Column(String(100))  # Detected bank: HDFC, ICICI, SBI, Axis
    
    # Status
    status = Column(Enum(BankImportStatus), default=BankImportStatus.PENDING)
    
    # Statistics
    total_rows = Column(Integer, default=0)
    processed_rows = Column(Integer, default=0)
    matched_rows = Column(Integer, default=0)
    created_rows = Column(Integer, default=0)
    ignored_rows = Column(Integer, default=0)
    
    # Error tracking
    error_message = Column(Text)
    
    import_date = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime)
    
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    company = relationship("Company", back_populates="bank_imports")
    bank_account = relationship("BankAccount")
    rows = relationship("BankImportRow", back_populates="bank_import", cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_bank_import_company", "company_id"),
        Index("idx_bank_import_status", "status"),
    )

    def __repr__(self):
        return f"<BankImport {self.file_name}>"


class BankImportRow(Base):
    """Bank import row model - Individual parsed row from CSV."""
    __tablename__ = "bank_import_rows"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    import_id = Column(String(36), ForeignKey("bank_imports.id", ondelete="CASCADE"), nullable=False)
    
    # Row details
    row_number = Column(Integer, nullable=False)
    transaction_date = Column(DateTime)
    value_date = Column(DateTime)
    
    # Transaction details from CSV
    description = Column(Text)
    reference_number = Column(String(100))
    
    # Amounts
    debit_amount = Column(Numeric(14, 2), default=0)
    credit_amount = Column(Numeric(14, 2), default=0)
    balance = Column(Numeric(14, 2))
    
    # Status
    status = Column(Enum(BankImportRowStatus), default=BankImportRowStatus.PENDING)
    
    # Linked transaction (if created or matched)
    transaction_id = Column(String(36), ForeignKey("transactions.id", ondelete="SET NULL"))
    
    # Account mapping (for creating transaction)
    mapped_account_id = Column(String(36), ForeignKey("accounts.id", ondelete="SET NULL"))
    
    # Raw data for debugging
    raw_data = Column(JSON)
    
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    bank_import = relationship("BankImport", back_populates="rows")
    transaction = relationship("Transaction")
    mapped_account = relationship("Account")

    __table_args__ = (
        Index("idx_import_row_import", "import_id"),
        Index("idx_import_row_status", "status"),
    )

    def __repr__(self):
        return f"<BankImportRow {self.row_number}>"


# ============== INVENTORY MODELS ==============

class StockGroup(Base):
    """Stock Group model - Like Tally's Stock Groups for categorization."""
    __tablename__ = "stock_groups"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    company_id = Column(String(36), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    
    name = Column(String(255), nullable=False)
    parent_id = Column(String(36), ForeignKey("stock_groups.id", ondelete="SET NULL"))
    description = Column(Text)
    
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    parent = relationship("StockGroup", remote_side=[id], backref="children")
    items = relationship("Product", back_populates="stock_group")

    __table_args__ = (
        Index("idx_stock_group_company", "company_id"),
    )

    def __repr__(self):
        return f"<StockGroup {self.name}>"


class Godown(Base):
    """Godown/Warehouse model - Location for stock storage."""
    __tablename__ = "godowns"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    company_id = Column(String(36), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    
    name = Column(String(255), nullable=False)
    code = Column(String(50))
    address = Column(Text)
    city = Column(String(100))
    state = Column(String(100))
    pincode = Column(String(20))
    
    # Parent for sub-locations
    parent_id = Column(String(36), ForeignKey("godowns.id", ondelete="SET NULL"))
    
    is_default = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    parent = relationship("Godown", remote_side=[id], backref="sub_locations")
    stock_entries = relationship("StockEntry", back_populates="godown", foreign_keys="[StockEntry.godown_id]")
    from_stock_entries = relationship("StockEntry", foreign_keys="[StockEntry.from_godown_id]", back_populates="from_godown")
    to_stock_entries = relationship("StockEntry", foreign_keys="[StockEntry.to_godown_id]", back_populates="to_godown")

    __table_args__ = (
        Index("idx_godown_company", "company_id"),
    )

    def __repr__(self):
        return f"<Godown {self.name}>"


class Batch(Base):
    """Batch/Lot model - For batch-wise stock tracking."""
    __tablename__ = "batches"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    product_id = Column(String(36), ForeignKey("items.id", ondelete="CASCADE"), nullable=False)
    
    batch_number = Column(String(100), nullable=False)
    manufacturing_date = Column(DateTime)
    expiry_date = Column(DateTime)
    
    # Quantity in this batch
    quantity = Column(Numeric(14, 3), default=0)
    cost_price = Column(Numeric(14, 2), default=0)
    
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    product = relationship("Product", back_populates="batches")

    __table_args__ = (
        Index("idx_batch_item", "product_id"),
        Index("idx_batch_expiry", "expiry_date"),
    )

    def __repr__(self):
        return f"<Batch {self.batch_number}>"


class StockEntry(Base):
    """Stock Entry model - Individual stock movement record."""
    __tablename__ = "stock_entries"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    company_id = Column(String(36), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    product_id = Column(String(36), ForeignKey("items.id", ondelete="CASCADE"), nullable=False)
    godown_id = Column(String(36), ForeignKey("godowns.id", ondelete="SET NULL"))
    batch_id = Column(String(36), ForeignKey("batches.id", ondelete="SET NULL"))
    
    # Movement details
    entry_date = Column(DateTime, nullable=False, default=datetime.utcnow)
    movement_type = Column(Enum(StockMovementType), nullable=False)
    
    # Quantity (positive for in, negative for out)
    quantity = Column(Numeric(14, 3), nullable=False)
    unit = Column(String(20))
    rate = Column(Numeric(14, 2), default=0)
    value = Column(Numeric(14, 2), default=0)
    
    # Reference
    reference_type = Column(String(50))  # invoice, purchase_order, stock_journal, etc.
    reference_id = Column(String(36))
    reference_number = Column(String(100))
    
    # For transfers
    from_godown_id = Column(String(36), ForeignKey("godowns.id", ondelete="SET NULL"))
    to_godown_id = Column(String(36), ForeignKey("godowns.id", ondelete="SET NULL"))
    
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    product = relationship("Product", back_populates="stock_entries", foreign_keys=[product_id])
    godown = relationship("Godown", back_populates="stock_entries", foreign_keys=[godown_id])
    batch = relationship("Batch")
    from_godown = relationship("Godown", foreign_keys=[from_godown_id], back_populates="from_stock_entries")
    to_godown = relationship("Godown", foreign_keys=[to_godown_id], back_populates="to_stock_entries")

    __table_args__ = (
        Index("idx_stock_entry_company", "company_id"),
        Index("idx_stock_entry_item", "product_id"),
        Index("idx_stock_entry_date", "entry_date"),
    )

    def __repr__(self):
        return f"<StockEntry {self.movement_type} - {self.quantity}>"


class StockJournal(Base):
    """
    Stock Journal Voucher model - For recording stock adjustments, transfers, and manufacturing.
    
    Supports various operations like Tally:
    - Inter-godown transfers
    - Manufacturing/Assembly (consume raw materials -> produce finished goods)
    - Disassembly (finished goods -> components)
    - Repackaging (Product A -> Product B)
    - Conversions (A + C -> B)
    - Adjustments (damage, expiry, samples)
    """
    __tablename__ = "stock_journals"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    company_id = Column(String(36), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    
    # Voucher details
    voucher_number = Column(String(50), nullable=False, index=True)
    voucher_date = Column(DateTime, nullable=False, default=datetime.utcnow)
    journal_type = Column(Enum(StockJournalType), nullable=False, default=StockJournalType.ADJUSTMENT)
    status = Column(Enum(StockJournalStatus), default=StockJournalStatus.DRAFT)
    
    # For transfers
    from_godown_id = Column(String(36), ForeignKey("godowns.id", ondelete="SET NULL"))
    to_godown_id = Column(String(36), ForeignKey("godowns.id", ondelete="SET NULL"))
    
    # For manufacturing - reference BOM
    bom_id = Column(String(36), ForeignKey("bills_of_material.id", ondelete="SET NULL"))
    
    # Description and notes
    narration = Column(Text)
    notes = Column(Text)
    
    # Additional cost tracking (manufacturing overhead, transport, etc.)
    additional_cost = Column(Numeric(14, 2), default=0)
    additional_cost_type = Column(String(100))  # "manufacturing_overhead", "transport", etc.
    
    # Audit
    created_by = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    confirmed_at = Column(DateTime)
    confirmed_by = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"))
    cancelled_at = Column(DateTime)
    cancelled_by = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"))
    cancellation_reason = Column(Text)

    # Relationships
    company = relationship("Company")
    from_godown = relationship("Godown", foreign_keys=[from_godown_id])
    to_godown = relationship("Godown", foreign_keys=[to_godown_id])
    bom = relationship("BillOfMaterial")
    source_items = relationship("StockJournalItem", back_populates="stock_journal", 
                                foreign_keys="[StockJournalItem.stock_journal_id]",
                                primaryjoin="and_(StockJournal.id==StockJournalItem.stock_journal_id, "
                                           "StockJournalItem.item_type=='source')",
                                cascade="all, delete-orphan", overlaps="destination_items,stock_journal")
    destination_items = relationship("StockJournalItem", back_populates="stock_journal",
                                    foreign_keys="[StockJournalItem.stock_journal_id]",
                                    primaryjoin="and_(StockJournal.id==StockJournalItem.stock_journal_id, "
                                               "StockJournalItem.item_type=='destination')",
                                    cascade="all, delete-orphan", overlaps="source_items,stock_journal")
    items = relationship("StockJournalItem", back_populates="stock_journal", 
                        foreign_keys="[StockJournalItem.stock_journal_id]",
                        cascade="all, delete-orphan", overlaps="source_items,destination_items")

    __table_args__ = (
        Index("idx_stock_journal_company", "company_id"),
        Index("idx_stock_journal_date", "voucher_date"),
        Index("idx_stock_journal_type", "journal_type"),
    )

    def __repr__(self):
        return f"<StockJournal {self.voucher_number} - {self.journal_type}>"


class StockJournalItem(Base):
    """
    Stock Journal Item model - Individual line items in a stock journal.
    
    Items are categorized as:
    - source: Items being consumed/transferred out (decreases stock)
    - destination: Items being produced/transferred in (increases stock)
    
    For a simple transfer: source and destination have same product, different godowns
    For manufacturing: sources are raw materials, destinations are finished goods
    For repackaging: source is Product A, destination is Product B
    """
    __tablename__ = "stock_journal_items"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    stock_journal_id = Column(String(36), ForeignKey("stock_journals.id", ondelete="CASCADE"), nullable=False)
    
    # Item type: source (consumption) or destination (production)
    item_type = Column(String(20), nullable=False)  # 'source' or 'destination'
    
    # Product details
    product_id = Column(String(36), ForeignKey("items.id", ondelete="CASCADE"), nullable=False)
    godown_id = Column(String(36), ForeignKey("godowns.id", ondelete="SET NULL"))
    batch_id = Column(String(36), ForeignKey("batches.id", ondelete="SET NULL"))
    
    # Quantity and value
    quantity = Column(Numeric(14, 3), nullable=False)
    unit = Column(String(20))
    rate = Column(Numeric(14, 2), default=0)
    value = Column(Numeric(14, 2), default=0)  # quantity * rate
    
    # For cost allocation in manufacturing (percentage of total cost)
    cost_allocation_percent = Column(Numeric(5, 2), default=100)  # For by-products/co-products
    
    # Tracking
    serial_numbers = Column(JSON)  # List of serial numbers if applicable
    notes = Column(Text)
    
    # Link to actual stock entry created
    stock_entry_id = Column(String(36), ForeignKey("stock_entries.id", ondelete="SET NULL"))
    
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    stock_journal = relationship("StockJournal", back_populates="items", 
                                foreign_keys=[stock_journal_id],
                                overlaps="source_items,destination_items")
    product = relationship("Product")
    godown = relationship("Godown")
    batch = relationship("Batch")
    stock_entry = relationship("StockEntry")

    __table_args__ = (
        Index("idx_sj_item_journal", "stock_journal_id"),
        Index("idx_sj_item_product", "product_id"),
        Index("idx_sj_item_type", "item_type"),
    )

    def __repr__(self):
        return f"<StockJournalItem {self.item_type}: {self.quantity} x {self.product_id}>"


class BillOfMaterial(Base):
    """Bill of Material (BOM) model - For manufacturing/assembly."""
    __tablename__ = "bills_of_material"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    company_id = Column(String(36), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    
    # Finished product
    finished_item_id = Column(String(36), ForeignKey("items.id", ondelete="CASCADE"), nullable=False)
    
    name = Column(String(255), nullable=False)
    description = Column(Text)
    
    # Quantity produced per BOM
    output_quantity = Column(Numeric(14, 3), default=1)
    output_unit = Column(String(20))
    
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    finished_item = relationship("Product", foreign_keys=[finished_item_id])
    components = relationship("BOMComponent", back_populates="bom", cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_bom_company", "company_id"),
    )

    def __repr__(self):
        return f"<BillOfMaterial {self.name}>"


class BOMComponent(Base):
    """BOM Component model - Raw materials needed for production."""
    __tablename__ = "bom_components"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    bom_id = Column(String(36), ForeignKey("bills_of_material.id", ondelete="CASCADE"), nullable=False)
    component_item_id = Column(String(36), ForeignKey("items.id", ondelete="CASCADE"), nullable=False)
    
    quantity = Column(Numeric(14, 3), nullable=False)
    unit = Column(String(20))
    
    # Waste/scrap allowance
    waste_percentage = Column(Numeric(5, 2), default=0)
    
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    bom = relationship("BillOfMaterial", back_populates="components")
    component_product = relationship("Product", back_populates="bom_components", foreign_keys=[component_item_id])

    __table_args__ = (
        Index("idx_bom_component_bom", "bom_id"),
    )

    def __repr__(self):
        return f"<BOMComponent {self.quantity} x {self.component_product.name if self.component_product else 'Unknown'}>"


# ============== ORDER MODELS ==============

class SalesOrder(Base):
    """Sales Order model - Customer orders before invoicing."""
    __tablename__ = "sales_orders"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    company_id = Column(String(36), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    customer_id = Column(String(36), ForeignKey("customers.id", ondelete="SET NULL"))
    expire_date = Column(DateTime)  # Or use expected_delivery_date
    reference_no = Column(String(100))
    reference_date = Column(DateTime)
    payment_terms = Column(Text)
    contact_person = Column(String(200))  # Or keep using contact_id
    freight_charges = Column(Numeric(14, 2), default=0)
    p_and_f_charges = Column(Numeric(14, 2), default=0)
    round_off = Column(Numeric(14, 2), default=0)
    send_message = Column(Boolean, default=False)
    delivery_note = Column(Text)
    supplier_ref = Column(String(100))
    other_references = Column(Text)
    buyer_order_no = Column(String(100))
    buyer_order_date = Column(DateTime)
    despatch_doc_no = Column(String(100))
    delivery_note_date = Column(DateTime)
    despatched_through = Column(String(200))
    destination = Column(String(200))
    terms_of_delivery = Column(Text)
    # Sales pipeline tracking
    sales_ticket_id = Column(String(36), ForeignKey("sales_tickets.id", ondelete="SET NULL"))
    contact_id = Column(String(36), ForeignKey("contacts.id", ondelete="SET NULL"))
    sales_person_id = Column(String(36), ForeignKey("employees.id", ondelete="SET NULL"))
    
    # Order identification
    order_number = Column(String(50), nullable=False)
    order_date = Column(DateTime, nullable=False, default=datetime.utcnow)
    expected_delivery_date = Column(DateTime)
    
    # Status
    status = Column(Enum(OrderStatus), default=OrderStatus.DRAFT)
    
    # Store workflow status
    store_status = Column(String(50), default="pending")  # pending, order_in_process, ready_for_delivery, out_for_delivery, delivered
    
    # Amounts
    subtotal = Column(Numeric(14, 2), default=0)
    tax_amount = Column(Numeric(14, 2), default=0)
    total_amount = Column(Numeric(14, 2), default=0)
    
    # Add to your SalesOrder model
    total_tax = Column(Numeric(14, 2), default=0)  # Add this line
    # Fulfillment tracking
    quantity_ordered = Column(Numeric(14, 3), default=0)
    quantity_delivered = Column(Numeric(14, 3), default=0)
    
    # Reference to invoice (when converted)
    invoice_id = Column(String(36), ForeignKey("invoices.id", ondelete="SET NULL"))
    
    notes = Column(Text)
    terms = Column(Text)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    customer = relationship("Customer")
    sales_ticket = relationship("SalesTicket")
    contact = relationship("Contact")
    sales_person = relationship("Employee")
    items = relationship("SalesOrderItem", back_populates="order", cascade="all, delete-orphan")
    delivery_notes = relationship("DeliveryNote", back_populates="sales_order")
    invoice = relationship("Invoice", foreign_keys=[invoice_id])

    __table_args__ = (
        Index("idx_sales_order_company", "company_id"),
        Index("idx_sales_order_customer", "customer_id"),
        Index("idx_sales_order_status", "status"),
        Index("idx_sales_order_ticket", "sales_ticket_id"),
    )

    def __repr__(self):
        return f"<SalesOrder {self.order_number}>"


class SalesOrderItem(Base):
    """Sales Order Item model."""
    __tablename__ = "sales_order_items"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    order_id = Column(String(36), ForeignKey("sales_orders.id", ondelete="CASCADE"), nullable=False)
    product_id = Column(String(36), ForeignKey("items.id", ondelete="SET NULL"))
    item_code = Column(String(100), nullable=True) 

    description = Column(String(500), nullable=False)
    hsn_code = Column(String(50), nullable=True)
    quantity = Column(Numeric(14, 3), nullable=False)
    unit = Column(String(20))
    rate = Column(Numeric(14, 2), nullable=False)
    unit_price = Column(Numeric(14, 2), nullable=False)
    gst_rate = Column(Numeric(5, 2), nullable=False, server_default="0.00")
    cgst_rate = Column(Numeric(5, 2), nullable=False, server_default="0.00")  # ADD THIS
    sgst_rate = Column(Numeric(5, 2), nullable=False, server_default="0.00")  # ADD THIS
    igst_rate = Column(Numeric(5, 2), nullable=False, server_default="0.00")  # ADD THIS
    # Fulfillment
    quantity_delivered = Column(Numeric(14, 3), default=0)
    quantity_pending = Column(Numeric(14, 3), default=0)
    discount_percent = Column(Numeric(5, 2), nullable=False, server_default="0.00")
    discount_amount = Column(Numeric(15, 2), nullable=False, server_default="0.00")
    # Tax
    gst_rate = Column(Numeric(5, 2), default=18)
    tax_amount = Column(Numeric(14, 2), default=0)
    total_amount = Column(Numeric(14, 2), default=0)
    
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    order = relationship("SalesOrder", back_populates="items")
    product = relationship("Product")

    __table_args__ = (
        Index("idx_so_item_order", "order_id"),
    )

    def __repr__(self):
        return f"<SalesOrderItem {self.description[:30]}>"


class PurchaseOrder(Base):
    """Purchase Order model - Orders to vendors/suppliers."""
    __tablename__ = "purchase_orders"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    company_id = Column(String(36), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    
    # Vendor (stored in Customer table with customer_type='vendor')
    vendor_id = Column(String(36), ForeignKey("vendors.id", ondelete="SET NULL"))
    
    # Order identification
    order_number = Column(String(50), nullable=False)
    order_date = Column(DateTime, nullable=False, default=datetime.utcnow)
    expected_date = Column(DateTime)
    reference_number = Column(String(100), nullable=True)
    currency = Column(String(10), default="INR")
    exchange_rate = Column(Numeric(20, 6), default=Decimal("1.0"))
    freight_charges = Column(Numeric(20, 6), default=Decimal("0"))
    other_charges = Column(Numeric(20, 6), default=Decimal("0"))
    discount_on_all = Column(Numeric(20, 6), default=Decimal("0"))
    round_off = Column(Numeric(20, 6), default=Decimal("0"))
    # Status
    status = Column(Enum(OrderStatus), default=OrderStatus.DRAFT)
    
    # Amounts
    subtotal = Column(Numeric(14, 2), default=0)
    tax_amount = Column(Numeric(14, 2), default=0)
    total_amount = Column(Numeric(14, 2), default=0)
    
    # Receipt tracking
    quantity_ordered = Column(Numeric(14, 3), default=0)
    quantity_received = Column(Numeric(14, 3), default=0)
    
    notes = Column(Text)
    terms = Column(Text)
    creator_type = Column(String(10), default="user", nullable=False)
    creator_id = Column(String(36), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    vendor = relationship("Vendor")
    items = relationship("PurchaseOrderItem", back_populates="order", cascade="all, delete-orphan")
    receipt_notes = relationship("ReceiptNote", back_populates="purchase_order")

    __table_args__ = (
        Index("idx_purchase_order_company", "company_id"),
        Index("idx_purchase_order_vendor", "vendor_id"),
        Index("idx_purchase_order_status", "status"),
    )

    def __repr__(self):
        return f"<PurchaseOrder {self.order_number}>"


class PurchaseOrderItem(Base):
    """Purchase Order Item model."""
    __tablename__ = "purchase_order_items"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    order_id = Column(String(36), ForeignKey("purchase_orders.id", ondelete="CASCADE"), nullable=False)
    product_id = Column(String(36), ForeignKey("items.id", ondelete="SET NULL"))
    item_code = Column(String,nullable=True)
    description = Column(String(500), nullable=False)
    quantity = Column(Numeric(14, 3), nullable=False)
    unit = Column(String(20))
    rate = Column(Numeric(14, 2), nullable=False)
    discount_percent = Column(Numeric(10, 4), default=Decimal("0"))
    discount_amount = Column(Numeric(20, 6), default=Decimal("0"))
    # Receipt tracking
    quantity_received = Column(Numeric(14, 3), default=0)
    quantity_pending = Column(Numeric(14, 3), default=0)
    
    # Tax
    gst_rate = Column(Numeric(5, 2), default=18)
    tax_amount = Column(Numeric(14, 2), default=0)
    total_amount = Column(Numeric(14, 2), default=0)
    
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    order = relationship("PurchaseOrder", back_populates="items")
    product = relationship("Product")

    __table_args__ = (
        Index("idx_po_item_order", "order_id"),
    )

    def __repr__(self):
        return f"<PurchaseOrderItem {self.description[:30]}>"


class DeliveryNote(Base):
    """Delivery Note model - Goods sent to customer."""
    __tablename__ = "delivery_notes"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    company_id = Column(String(36), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    sales_order_id = Column(String(36), ForeignKey("sales_orders.id", ondelete="SET NULL"))
    customer_id = Column(String(36), ForeignKey("customers.id", ondelete="SET NULL"))
    
    # Delivery identification
    delivery_number = Column(String(50), nullable=False)
    delivery_date = Column(DateTime, nullable=False, default=datetime.utcnow)
    
    # E-Way Bill (for goods > 50K)
    eway_bill_number = Column(String(20))
    eway_bill_date = Column(DateTime)
    
    # Transport details
    transporter_name = Column(String(255))
    transporter_id = Column(String(20))  # GSTIN of transporter
    vehicle_number = Column(String(20))
    
    # From godown
    godown_id = Column(String(36), ForeignKey("godowns.id", ondelete="SET NULL"))
    
    notes = Column(Text)
    
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    sales_order = relationship("SalesOrder", back_populates="delivery_notes")
    customer = relationship("Customer")
    godown = relationship("Godown")
    items = relationship("DeliveryNoteItem", back_populates="delivery_note", cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_delivery_note_company", "company_id"),
        Index("idx_delivery_note_order", "sales_order_id"),
    )

    def __repr__(self):
        return f"<DeliveryNote {self.delivery_number}>"


class DeliveryNoteItem(Base):
    """Delivery Note Item model."""
    __tablename__ = "delivery_note_items"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    delivery_note_id = Column(String(36), ForeignKey("delivery_notes.id", ondelete="CASCADE"), nullable=False)
    product_id = Column(String(36), ForeignKey("items.id", ondelete="SET NULL"))
    batch_id = Column(String(36), ForeignKey("batches.id", ondelete="SET NULL"))
    
    description = Column(String(500), nullable=False)
    quantity = Column(Numeric(14, 3), nullable=False)
    unit = Column(String(20))
    
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    delivery_note = relationship("DeliveryNote", back_populates="items")
    product = relationship("Product")
    batch = relationship("Batch")

    __table_args__ = (
        Index("idx_dn_item_note", "delivery_note_id"),
    )

    def __repr__(self):
        return f"<DeliveryNoteItem {self.description[:30]}>"


class ReceiptNote(Base):
    """Receipt Note model - Goods received from vendor."""
    __tablename__ = "receipt_notes"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    company_id = Column(String(36), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    purchase_order_id = Column(String(36), ForeignKey("purchase_orders.id", ondelete="SET NULL"))
    vendor_id = Column(String(36), ForeignKey("vendors.id", ondelete="SET NULL"))
    
    # Receipt identification
    receipt_number = Column(String(50), nullable=False)
    receipt_date = Column(DateTime, nullable=False, default=datetime.utcnow)
    
    # Vendor invoice reference
    vendor_invoice_number = Column(String(100))
    vendor_invoice_date = Column(DateTime)
    
    # Into godown
    godown_id = Column(String(36), ForeignKey("godowns.id", ondelete="SET NULL"))
    
    notes = Column(Text)
    
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    purchase_order = relationship("PurchaseOrder", back_populates="receipt_notes")
    vendor = relationship("Vendor")
    godown = relationship("Godown")
    items = relationship("ReceiptNoteItem", back_populates="receipt_note", cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_receipt_note_company", "company_id"),
        Index("idx_receipt_note_order", "purchase_order_id"),
    )

    def __repr__(self):
        return f"<ReceiptNote {self.receipt_number}>"


class ReceiptNoteItem(Base):
    """Receipt Note Item model."""
    __tablename__ = "receipt_note_items"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    receipt_note_id = Column(String(36), ForeignKey("receipt_notes.id", ondelete="CASCADE"), nullable=False)
    product_id = Column(String(36), ForeignKey("items.id", ondelete="SET NULL"))
    batch_id = Column(String(36), ForeignKey("batches.id", ondelete="SET NULL"))
    
    description = Column(String(500), nullable=False)
    quantity = Column(Numeric(14, 3), nullable=False)
    unit = Column(String(20))
    rate = Column(Numeric(14, 2), default=0)
    
    # Quality check
    accepted_quantity = Column(Numeric(14, 3))
    rejected_quantity = Column(Numeric(14, 3), default=0)
    rejection_reason = Column(Text)
    
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    receipt_note = relationship("ReceiptNote", back_populates="items")
    product = relationship("Product")
    batch = relationship("Batch")

    __table_args__ = (
        Index("idx_rn_item_note", "receipt_note_id"),
    )

    def __repr__(self):
        return f"<ReceiptNoteItem {self.description[:30]}>"

# vendor 
# ============== VENDOR MODELS ==============

class Vendor(Base):
    """Vendor/Supplier model"""
    __tablename__ = "vendors"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    company_id = Column(String(36), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Basic Information
    name = Column(String(255), nullable=False, index=True)
    contact = Column(String(15), nullable=False)  # Primary contact number
    email = Column(String(255))
    mobile = Column(String(15))
    
    # Tax Information
    tax_number = Column(String(15), index=True)  # GST number
    gst_registration_type = Column(String(50))
    pan_number = Column(String(10), index=True)
    vendor_code = Column(String(50), index=True)
    
    # Opening Balance Fields
    opening_balance = Column(Numeric(15, 2), default=0.00)
    opening_balance_type = Column(String(20))  # 'outstanding' or 'advance'
    opening_balance_mode = Column(String(10))  # 'single' or 'split'
    
    # Financial Information
    credit_limit = Column(Numeric(15, 2), default=0.00)
    credit_days = Column(Integer, default=0)
    payment_terms = Column(Text)
    
    # TDS Information
    tds_applicable = Column(Boolean, default=False)
    tds_rate = Column(Numeric(5, 2), default=0.00)
    
    # Financial Balances
    total_transactions = Column(Numeric(15, 2), default=0.00)
    outstanding_amount = Column(Numeric(15, 2), default=0.00)
    
    # Last payment tracking
    last_payment_date = Column(DateTime)
    last_payment_amount = Column(Numeric(15, 2), default=0.00)
    
    # Billing Address
    billing_address = Column(Text)
    billing_city = Column(String(100))
    billing_state = Column(String(100))
    billing_country = Column(String(100), default="India")
    billing_zip = Column(String(20))
    
    # Shipping Address
    shipping_address = Column(Text)
    shipping_city = Column(String(100))
    shipping_state = Column(String(100))
    shipping_country = Column(String(100), default="India")
    shipping_zip = Column(String(20))
    
    # Status
    is_active = Column(Boolean, default=True, index=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    deleted_at = Column(DateTime)
    
    # Relationships
    company = relationship("Company")
    opening_balance_items = relationship("VendorOpeningBalanceItem", back_populates="vendor", cascade="all, delete-orphan")
    contact_persons = relationship("VendorContactPerson", back_populates="vendor", cascade="all, delete-orphan")
    bank_details = relationship("VendorBankDetail", back_populates="vendor", cascade="all, delete-orphan")
    
    __table_args__ = (
        Index("idx_vendor_company_name", "company_id", "name"),
        Index("idx_vendor_company_code", "company_id", "vendor_code", unique=True),
        Index("idx_vendor_company_tax", "company_id", "tax_number"),
    )

    # Compatibility aliases for code that expects these attribute names
    @property
    def gstin(self):
        return self.tax_number

    @property
    def pan(self):
        return self.pan_number

    @property
    def phone(self):
        return self.contact or self.mobile

    @property
    def address(self):
        return self.billing_address

    @property
    def city(self):
        return self.billing_city

    @property
    def state(self):
        return self.billing_state

    @property
    def pincode(self):
        return self.billing_zip

    def __repr__(self):
        return f"<Vendor(id={self.id}, name='{self.name}', company_id={self.company_id})>"
    
    def to_dict(self):
        """Convert to dictionary for API response"""
        return {
            "id": self.id,
            "company_id": self.company_id,
            "name": self.name,
            "contact": self.contact,
            "email": self.email,
            "mobile": self.mobile,
            "tax_number": self.tax_number,
            "gst_registration_type": self.gst_registration_type,
            "pan_number": self.pan_number,
            "vendor_code": self.vendor_code,
            "opening_balance": float(self.opening_balance) if self.opening_balance else 0.00,
            "opening_balance_type": self.opening_balance_type,
            "opening_balance_mode": self.opening_balance_mode,
            "credit_limit": float(self.credit_limit) if self.credit_limit else 0.00,
            "credit_days": self.credit_days,
            "payment_terms": self.payment_terms,
            "tds_applicable": self.tds_applicable,
            "tds_rate": float(self.tds_rate) if self.tds_rate else 0.00,
            "billing_address": self.billing_address,
            "billing_city": self.billing_city,
            "billing_state": self.billing_state,
            "billing_country": self.billing_country,
            "billing_zip": self.billing_zip,
            "shipping_address": self.shipping_address,
            "shipping_city": self.shipping_city,
            "shipping_state": self.shipping_state,
            "shipping_country": self.shipping_country,
            "shipping_zip": self.shipping_zip,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "contact_persons": [cp.to_dict() for cp in self.contact_persons] if self.contact_persons else [],
            "bank_details": [bd.to_dict() for bd in self.bank_details] if self.bank_details else [],
            "opening_balance_items": [item.to_dict() for item in self.opening_balance_items] if self.opening_balance_mode == "split" else []
        }


class VendorOpeningBalanceItem(Base):
    """Opening balance items for vendors (for split mode)"""
    __tablename__ = "vendor_opening_balance_items"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    vendor_id = Column(String(36), ForeignKey("vendors.id", ondelete="CASCADE"), nullable=False)
    
    date = Column(DateTime, nullable=False)
    voucher_name = Column(String(255), nullable=False)
    days = Column(Integer)
    amount = Column(Numeric(15, 2), nullable=False)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationship
    vendor = relationship("Vendor", back_populates="opening_balance_items")
    
    def to_dict(self):
        """Convert to dictionary for API response"""
        return {
            "id": self.id,
            "vendor_id": self.vendor_id,
            "date": self.date.isoformat() if self.date else None,
            "voucher_name": self.voucher_name,
            "days": self.days,
            "amount": float(self.amount) if self.amount else 0.00,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }
    
    def __repr__(self):
        return f"<VendorOpeningBalanceItem(id={self.id}, voucher_name='{self.voucher_name}', vendor_id={self.vendor_id})>"


class VendorContactPerson(Base):
    """Contact persons for vendors"""
    __tablename__ = "vendor_contact_persons"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    vendor_id = Column(String(36), ForeignKey("vendors.id", ondelete="CASCADE"), nullable=False)
    
    name = Column(String(255), nullable=False)
    designation = Column(String(100))
    email = Column(String(255))
    phone = Column(String(20))
    is_primary = Column(Boolean, default=False)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationship
    vendor = relationship("Vendor", back_populates="contact_persons")
    
    def to_dict(self):
        """Convert to dictionary for API response"""
        return {
            "id": self.id,
            "vendor_id": self.vendor_id,
            "name": self.name,
            "designation": self.designation,
            "email": self.email,
            "phone": self.phone,
            "is_primary": self.is_primary,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }
    
    def __repr__(self):
        return f"<VendorContactPerson(id={self.id}, name='{self.name}', vendor_id={self.vendor_id})>"


class VendorBankDetail(Base):
    """Bank details for vendors"""
    __tablename__ = "vendor_bank_details"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    vendor_id = Column(String(36), ForeignKey("vendors.id", ondelete="CASCADE"), nullable=False)
    
    bank_name = Column(String(255), nullable=False)
    branch = Column(String(255))
    account_number = Column(String(50), nullable=False)
    account_holder_name = Column(String(255), nullable=False)
    ifsc_code = Column(String(11))
    account_type = Column(String(50), default="Savings")  # Savings, Current, etc.
    is_primary = Column(Boolean, default=False)
    upi_id = Column(String(255))
    
    # Verification status
    is_verified = Column(Boolean, default=False)
    verified_at = Column(DateTime)
    verified_by = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"))
    
    is_active = Column(Boolean, default=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    vendor = relationship("Vendor", back_populates="bank_details")
    verifier = relationship("User", foreign_keys=[verified_by])
    
    __table_args__ = (
        Index("idx_vendor_bank_vendor", "vendor_id"),
        Index("idx_vendor_bank_account", "account_number"),
        UniqueConstraint("vendor_id", "account_number", name="uq_vendor_account_number"),
    )
    
    def to_dict(self):
        """Convert to dictionary for API response"""
        return {
            "id": self.id,
            "vendor_id": self.vendor_id,
            "bank_name": self.bank_name,
            "branch": self.branch,
            "account_number": self.account_number,
            "account_holder_name": self.account_holder_name,
            "ifsc_code": self.ifsc_code,
            "account_type": self.account_type,
            "is_primary": self.is_primary,
            "upi_id": self.upi_id,
            "is_verified": self.is_verified,
            "verified_at": self.verified_at.isoformat() if self.verified_at else None,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }
    
    def __repr__(self):
        return f"<VendorBankDetail(id={self.id}, bank_name='{self.bank_name}', vendor_id={self.vendor_id})>"
    
# ============== QUICK ENTRY MODEL ==============

class QuickEntry(Base):
    """Quick Entry model - Simplified entry for non-accountants."""
    __tablename__ = "quick_entries"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    company_id = Column(String(36), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    
    # Entry type
    entry_type = Column(Enum(EntryType), nullable=False)
    entry_date = Column(DateTime, nullable=False, default=datetime.utcnow)
    
    # Amount
    amount = Column(Numeric(14, 2), nullable=False)
    
    # Party (optional)
    party_id = Column(String(36))  # Customer or Vendor ID
    party_type = Column(String(20))  # 'customer' or 'vendor'
    party_name = Column(String(255))  # For display
    
    # Category
    category = Column(String(100))  # Sale, Purchase, Salary, Rent, etc.
    
    # Payment account
    payment_account_id = Column(String(36), ForeignKey("accounts.id", ondelete="SET NULL"))
    payment_mode = Column(Enum(PaymentMode))
    
    # For transfers
    from_account_id = Column(String(36), ForeignKey("accounts.id", ondelete="SET NULL"))
    to_account_id = Column(String(36), ForeignKey("accounts.id", ondelete="SET NULL"))
    
    # Description
    description = Column(Text)
    reference_number = Column(String(100))
    
    # GST (auto-calculated if applicable)
    is_gst_applicable = Column(Boolean, default=False)
    gst_rate = Column(Numeric(5, 2))
    gst_amount = Column(Numeric(14, 2), default=0)
    
    # Linked transaction (auto-created)
    transaction_id = Column(String(36), ForeignKey("transactions.id", ondelete="SET NULL"))
    
    # Linked invoice (if applicable)
    invoice_id = Column(String(36), ForeignKey("invoices.id", ondelete="SET NULL"))
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    payment_account = relationship("Account", foreign_keys=[payment_account_id])
    from_account = relationship("Account", foreign_keys=[from_account_id])
    to_account = relationship("Account", foreign_keys=[to_account_id])
    transaction = relationship("Transaction")
    invoice = relationship("Invoice")

    __table_args__ = (
        Index("idx_quick_entry_company", "company_id"),
        Index("idx_quick_entry_date", "entry_date"),
        Index("idx_quick_entry_type", "entry_type"),
    )

    def __repr__(self):
        return f"<QuickEntry {self.entry_type} - {self.amount}>"


# ============== PURCHASE INVOICE MODELS ==============

class PurchaseInvoiceStatus(str, PyEnum):
    """Purchase Invoice status enumeration."""
    DRAFT = "draft"
    PENDING = "pending"
    APPROVED = "approved"
    PAID = "paid"
    PARTIALLY_PAID = "partially_paid"
    CANCELLED = "cancelled"


class TDSSection(Base):
    """TDS Section configuration - Rates as per Income Tax Act."""
    __tablename__ = "tds_sections"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    company_id = Column(String(36), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    
    # Section details
    section_code = Column(String(20), nullable=False)  # e.g., "194C", "194J", "194H"
    description = Column(String(255), nullable=False)
    
    # TDS Rates
    rate_individual = Column(Numeric(5, 2), nullable=False)  # Rate for individuals
    rate_company = Column(Numeric(5, 2), nullable=False)  # Rate for companies
    rate_no_pan = Column(Numeric(5, 2), default=20)  # Rate if no PAN provided
    
    # Thresholds
    threshold_single = Column(Numeric(14, 2), default=0)  # Single payment threshold
    threshold_annual = Column(Numeric(14, 2), default=0)  # Annual threshold
    
    # Applicable for
    nature_of_payment = Column(String(255))  # e.g., "Contract", "Professional fees"
    
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        Index("idx_tds_section_company", "company_id"),
        Index("idx_tds_section_code", "section_code"),
    )

    def __repr__(self):
        return f"<TDSSection {self.section_code}>"



class ProformaInvoice(Base):
    __tablename__ = "proforma_invoices"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    company_id = Column(String(36), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    customer_id = Column(String(36), ForeignKey("customers.id", ondelete="CASCADE"), nullable=False)
    invoice_number = Column(String(50), nullable=False, unique=True)
    proforma_date = Column(DateTime, nullable=False, default=datetime.utcnow)
    due_date = Column(DateTime)
    
    # Reference details
    reference_no = Column(String(100))
    reference_date = Column(DateTime)
    
    # Contact & sales details
    sales_person_id = Column(String(36), ForeignKey("employees.id", ondelete="SET NULL"))
    contact_id = Column(String(36), ForeignKey("contact_persons.id", ondelete="SET NULL"))  # This is correct
    bank_account_id = Column(String(36), ForeignKey("bank_accounts.id", ondelete="SET NULL"))
    
    # Additional fields
    notes = Column(Text)
    terms = Column(Text)
    
    # Charges
    freight_charges = Column(Numeric(15, 2), default=0)
    pf_charges = Column(Numeric(15, 2), default=0)
    round_off = Column(Numeric(15, 2), default=0)
    
    # Totals
    subtotal = Column(Numeric(15, 2), default=0)
    total_tax = Column(Numeric(15, 2), default=0)
    total_amount = Column(Numeric(15, 2), default=0)
    
    # New fields
    delivery_note = Column(String(500))
    supplier_ref = Column(String(100))
    other_references = Column(Text)
    buyer_order_no = Column(String(100))
    buyer_order_date = Column(DateTime)
    despatch_doc_no = Column(String(100))
    delivery_note_date = Column(DateTime)
    despatched_through = Column(String(100))
    destination = Column(String(100))
    terms_of_delivery = Column(Text)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    company = relationship("Company")
    customer = relationship("Customer")
    sales_person = relationship("Employee", foreign_keys=[sales_person_id])
    contact = relationship("ContactPerson", foreign_keys=[contact_id])  # This relationship
    bank_account = relationship("BankAccount")
    items = relationship("ProformaInvoiceItem", back_populates="proforma_invoice", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<ProformaInvoice {self.invoice_number}>"


class ProformaInvoiceItem(Base):
    __tablename__ = "proforma_invoice_items"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    invoice_id = Column(String(36), ForeignKey("proforma_invoices.id"), nullable=False)
    product_id = Column(String(36), ForeignKey("items.id"))
    item_code = Column(String)
    description = Column(String, nullable=False)
    quantity = Column(Numeric(15, 3), nullable=False, default=1)
    unit = Column(String, default="unit")
    unit_price = Column(Numeric(15, 2), nullable=False, default=0)
    
    # Discount
    discount_percent = Column(Numeric(5, 2), default=0)
    discount_amount = Column(Numeric(15, 2), default=0)
    
    # GST
    gst_rate = Column(Numeric(5, 2), default=18)
    cgst_rate = Column(Numeric(5, 2), default=9)
    sgst_rate = Column(Numeric(5, 2), default=9)
    igst_rate = Column(Numeric(5, 2), default=0)
    
    # Totals
    taxable_amount = Column(Numeric(15, 2), default=0)
    total_amount = Column(Numeric(15, 2), default=0)
    
    # Relationships
    proforma_invoice = relationship("ProformaInvoice", back_populates="items")
    product = relationship("Product")

class Purchase(Base):
    """Main Purchase model - Combines purchase, purchase-import, and purchase-expenses"""
    __tablename__ = "purchases"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    company_id = Column(String(36), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    vendor_id = Column(String(36), ForeignKey("vendors.id", ondelete="SET NULL"))
    
    # Purchase type: purchase, purchase-import, purchase-expenses
    purchase_type = Column(Enum(PurchaseType), default=PurchaseType.PURCHASE, nullable=False)
    
    # Invoice identification
    purchase_number = Column(String(50), nullable=False, unique=True, index=True)
    reference_no = Column(String(100))
    vendor_invoice_number = Column(String(100))
    invoice_date = Column(DateTime, nullable=False, default=datetime.utcnow)
    vendor_invoice_date = Column(DateTime)
    due_date = Column(DateTime)
    
    # Payment type for the entire purchase
    payment_type = Column(String(50))  # cash, credit, bank_transfer, cheque, online
    exchange_rate = Column(Numeric(14, 6), default=Decimal("1.0"))
    
    # Charges and discounts
    freight_charges = Column(Numeric(14, 2), default=0)
    freight_type = Column(String(20), default="fixed")  # fixed or percentage
    freight_base = Column(Numeric(15, 2), default=0)  # Base amount before tax
    freight_tax = Column(Numeric(15, 2), default=0)   # Tax amount
    packing_forwarding_charges = Column(Numeric(14, 2), default=0)
    pf_type = Column(String(20), default="fixed")  # fixed or percentage
    pf_base = Column(Numeric(15, 2), default=0)       # Base amount before tax
    pf_tax = Column(Numeric(15, 2), default=0)  
    discount_on_all = Column(Numeric(14, 2), default=0)
    discount_type = Column(String(20), default="percentage")  # percentage or fixed
    round_off = Column(Numeric(14, 2), default=0)
    
    # Amounts (all in INR)
    subtotal = Column(Numeric(14, 2), default=0)
    discount_amount = Column(Numeric(14, 2), default=0)
    
    # GST breakup
    cgst_amount = Column(Numeric(14, 2), default=0)
    sgst_amount = Column(Numeric(14, 2), default=0)
    igst_amount = Column(Numeric(14, 2), default=0)
    cess_amount = Column(Numeric(14, 2), default=0)
    
    total_tax = Column(Numeric(14, 2), default=0)
    total_amount = Column(Numeric(14, 2), default=0)
    grand_total = Column(Numeric(14, 2), default=0)
    
    # ITC (Input Tax Credit) tracking
    itc_eligible = Column(Boolean, default=True)
    itc_claimed = Column(Boolean, default=False)
    itc_claim_date = Column(DateTime, nullable=True)
    
    # Payment tracking
    amount_paid = Column(Numeric(14, 2), default=0)
    balance_due = Column(Numeric(14, 2), default=0)
    
    # Contact information
    contact_person = Column(String(200))
    contact_phone = Column(String(20))
    contact_email = Column(String(255))
    shipping_address = Column(Text)
    billing_address = Column(Text)
    
    # Additional info
    notes = Column(Text)
    terms = Column(Text)
    
    # Status
    status = Column(Enum(PurchaseInvoiceStatus), default=PurchaseInvoiceStatus.DRAFT)
    
    # Audit fields
    created_by = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    deleted_at = Column(DateTime)

    # Relationships
    company = relationship("Company")
    vendor = relationship("Vendor")
    creator = relationship("User")
    items = relationship("PurchaseItem", back_populates="purchase", cascade="all, delete-orphan")
    import_items = relationship("PurchaseImportItem", back_populates="purchase", cascade="all, delete-orphan")
    expense_items = relationship("PurchaseExpenseItem", back_populates="purchase", cascade="all, delete-orphan")
    payments = relationship("PurchasePayment", back_populates="purchase", cascade="all, delete-orphan")
    tds_entries = relationship("TDSEntry", back_populates="purchase", cascade="all, delete-orphan")
    __table_args__ = (
        Index("idx_purchase_company", "company_id"),
        Index("idx_purchase_vendor", "vendor_id"),
        Index("idx_purchase_date", "invoice_date"),
        Index("idx_purchase_type", "purchase_type"),
        Index("idx_purchase_status", "status"),
        Index("idx_purchase_number", "purchase_number"),
    )

    def __repr__(self):
        return f"<Purchase {self.purchase_number}>"


class PurchaseItem(Base):
    """Regular purchase items (with products)"""
    __tablename__ = "purchase_items"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    purchase_id = Column(String(36), ForeignKey("purchases.id", ondelete="CASCADE"), nullable=False)
    product_id = Column(String(36), ForeignKey("items.id", ondelete="SET NULL"))
    
    # Item details
    description = Column(String(500), nullable=False)
    item_code = Column(String(100))
    hsn_code = Column(String(8))
    currency = Column(String(10), default="INR")
    # Quantity and pricing
    quantity = Column(Numeric(10, 3), nullable=False, default=1)
    unit = Column(String(20), default="unit")
    purchase_price = Column(Numeric(12, 2), nullable=False, default=0)
    unit_cost = Column(Numeric(12, 2), default=0)
    
    # Discount
    discount_percent = Column(Numeric(5, 2), default=0)
    discount_amount = Column(Numeric(12, 2), default=0)
    
    # GST Tax rates
    gst_rate = Column(Numeric(5, 2), default=18)
    cgst_rate = Column(Numeric(5, 2), default=9)
    sgst_rate = Column(Numeric(5, 2), default=9)
    igst_rate = Column(Numeric(5, 2), default=0)
    
    # Tax amounts
    cgst_amount = Column(Numeric(12, 2), default=0)
    sgst_amount = Column(Numeric(12, 2), default=0)
    igst_amount = Column(Numeric(12, 2), default=0)
    tax_amount = Column(Numeric(12, 2), default=0)
    
    # Totals
    total_amount = Column(Numeric(14, 2), nullable=False, default=0)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    purchase = relationship("Purchase", back_populates="items")
    product = relationship("Product")

    __table_args__ = (
        Index("idx_purchase_item_purchase", "purchase_id"),
        Index("idx_purchase_item_product", "product_id"),
    )

    def __repr__(self):
        return f"<PurchaseItem {self.description[:30]}>"


class PurchaseImportItem(Base):
    """Import items for purchase-import type"""
    __tablename__ = "purchase_import_items"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    purchase_id = Column(String(36), ForeignKey("purchases.id", ondelete="CASCADE"), nullable=False)
    
    # Item details
    name = Column(String(500), nullable=False)
    
    # Quantity and pricing
    quantity = Column(Numeric(10, 3), nullable=False, default=1)
    rate = Column(Numeric(12, 2), nullable=False, default=0)
    per = Column(String(20), default="unit")
    currency = Column(String(10), default="INR")
    # Discount
    discount_percent = Column(Numeric(5, 2), default=0)
    
    # Totals
    amount = Column(Numeric(14, 2), nullable=False, default=0)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    purchase = relationship("Purchase", back_populates="import_items")

    __table_args__ = (
        Index("idx_import_item_purchase", "purchase_id"),
    )

    def __repr__(self):
        return f"<PurchaseImportItem {self.name[:30]}>"


class PurchaseExpenseItem(Base):
    """Expense items for purchase-expenses type"""
    __tablename__ = "purchase_expense_items"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    purchase_id = Column(String(36), ForeignKey("purchases.id", ondelete="CASCADE"), nullable=False)
    
    # Expense particulars
    particulars = Column(String(500), nullable=False)
    
    # Rate and per unit
    rate = Column(Numeric(12, 2), nullable=False, default=0)
    per = Column(String(20), default="unit")
    
    # Total amount
    amount = Column(Numeric(14, 2), nullable=False, default=0)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    purchase = relationship("Purchase", back_populates="expense_items")

    __table_args__ = (
        Index("idx_expense_item_purchase", "purchase_id"),
    )

    def __repr__(self):
        return f"<PurchaseExpenseItem {self.particulars[:30]}>"


class PurchasePayment(Base):
    """Payment model for purchases"""
    __tablename__ = "purchase_payments"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    purchase_id = Column(String(36), ForeignKey("purchases.id", ondelete="CASCADE"), nullable=False)
    
    # Payment details
    amount = Column(Numeric(14, 2), nullable=False)
    payment_date = Column(DateTime, nullable=False, default=datetime.utcnow)
    payment_type = Column(String(50))  # credit, cash, card, bank_transfer, cheque
    account = Column(String(100))  # Account name (e.g., ICICI Bank, IDFC First Bank)
    
    # Reference
    payment_note = Column(Text)
    reference_number = Column(String(100))
    
    # Transaction linking
    transaction_id = Column(String(36), ForeignKey("transactions.id", ondelete="SET NULL"))
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    purchase = relationship("Purchase", back_populates="payments")
    transaction = relationship("Transaction")

    __table_args__ = (
        Index("idx_purchase_payment_purchase", "purchase_id"),
        Index("idx_purchase_payment_date", "payment_date"),
    )

    def __repr__(self):
        return f"<PurchasePayment {self.amount} for Purchase {self.purchase_id}>"




class TDSEntry(Base):
    """TDS Entry model - Tracks TDS deductions."""
    __tablename__ = "tds_entries"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    company_id = Column(String(36), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    
    # Linked purchase invoice
    purchase_invoice_id = Column(String(36), ForeignKey("purchases.id", ondelete="CASCADE"))
    
    # Deductee (Vendor) details
    vendor_id = Column(String(36), ForeignKey("vendors.id", ondelete="SET NULL"))
    vendor_name = Column(String(255))
    vendor_pan = Column(String(10))
    
    # TDS details
    tds_section_id = Column(String(36), ForeignKey("tds_sections.id", ondelete="SET NULL"))
    section_code = Column(String(20))
    
    # Financial details
    gross_amount = Column(Numeric(14, 2), nullable=False)
    tds_rate = Column(Numeric(5, 2), nullable=False)
    tds_amount = Column(Numeric(14, 2), nullable=False)
    
    # Deduction date
    deduction_date = Column(DateTime, nullable=False)
    
    # Challan details (when TDS is deposited)
    challan_number = Column(String(50))
    challan_date = Column(DateTime)
    bsr_code = Column(String(10))
    
    # Status
    is_deposited = Column(Boolean, default=False)
    deposit_date = Column(DateTime)
    
    # Quarter (for TDS return filing)
    financial_year = Column(String(9))
    quarter = Column(String(2))
    
    notes = Column(Text)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    company = relationship("Company")
    purchase = relationship("Purchase", back_populates="tds_entries")
    vendor = relationship("Vendor")
    tds_section = relationship("TDSSection")

    __table_args__ = (
        Index("idx_tds_entry_company", "company_id"),
        Index("idx_tds_entry_vendor", "vendor_id"),
        Index("idx_tds_entry_date", "deduction_date"),
        Index("idx_tds_entry_quarter", "financial_year", "quarter"),
    )

    def __repr__(self):
        return f"<TDSEntry {self.section_code} - {self.tds_amount}>"


# ============== NEW TALLY PARITY MODELS ==============

# ============== INVENTORY ENHANCEMENTS ==============

class ProductUnit(Base):
    """Alternate units of measure with conversion factors."""
    __tablename__ = "product_units"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    product_id = Column(String(36), ForeignKey("items.id", ondelete="CASCADE"), nullable=False)
    
    unit_name = Column(String(50), nullable=False)
    symbol = Column(String(20))
    conversion_factor = Column(Numeric(15, 6), nullable=False)
    is_primary = Column(Boolean, default=False)
    
    # For purchases vs sales
    is_purchase_unit = Column(Boolean, default=True)
    is_sales_unit = Column(Boolean, default=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        Index("idx_product_unit_product", "product_id"),
    )

    def __repr__(self):
        return f"<ProductUnit {self.unit_name}>"


class PriceLevel(Base):
    """Price levels like MRP, Retail, Wholesale, Dealer."""
    __tablename__ = "price_levels"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    company_id = Column(String(36), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    
    name = Column(String(100), nullable=False)
    code = Column(String(20))
    description = Column(Text)
    
    # Discount from MRP
    discount_percentage = Column(Numeric(5, 2), default=0)
    
    # Priority (lower = higher priority)
    priority = Column(Integer, default=0)
    
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        Index("idx_price_level_company", "company_id"),
    )

    def __repr__(self):
        return f"<PriceLevel {self.name}>"


class ProductPrice(Base):
    """Product prices by price level with effective dates."""
    __tablename__ = "product_prices"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    product_id = Column(String(36), ForeignKey("items.id", ondelete="CASCADE"), nullable=False)
    price_level_id = Column(String(36), ForeignKey("price_levels.id", ondelete="CASCADE"), nullable=False)
    
    price = Column(Numeric(15, 2), nullable=False)
    effective_from = Column(DateTime, nullable=False)
    effective_to = Column(DateTime)
    
    # Optional: price per unit
    unit_id = Column(String(36), ForeignKey("product_units.id", ondelete="SET NULL"))
    
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        Index("idx_product_price_product", "product_id"),
        Index("idx_product_price_level", "price_level_id"),
        Index("idx_product_price_date", "effective_from"),
    )

    def __repr__(self):
        return f"<ProductPrice {self.price} from {self.effective_from}>"


class SerialNumberStatus(str, PyEnum):
    """Serial number status."""
    AVAILABLE = "available"
    SOLD = "sold"
    DAMAGED = "damaged"
    RETURNED = "returned"
    RESERVED = "reserved"


class SerialNumber(Base):
    """Serial/IMEI number tracking for items."""
    __tablename__ = "serial_numbers"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    company_id = Column(String(36), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    product_id = Column(String(36), ForeignKey("items.id", ondelete="CASCADE"), nullable=False)
    
    serial_number = Column(String(100), nullable=False)
    batch_id = Column(String(36), ForeignKey("batches.id", ondelete="SET NULL"))
    godown_id = Column(String(36), ForeignKey("godowns.id", ondelete="SET NULL"))
    
    status = Column(Enum(SerialNumberStatus), default=SerialNumberStatus.AVAILABLE)
    
    # Purchase reference
    purchase_invoice_id = Column(String(36), ForeignKey("purchases.id", ondelete="SET NULL"))
    purchase_date = Column(DateTime)
    purchase_rate = Column(Numeric(14, 2))
    
    # Sales reference
    sales_invoice_id = Column(String(36), ForeignKey("invoices.id", ondelete="SET NULL"))
    sales_date = Column(DateTime)
    sales_rate = Column(Numeric(14, 2))
    customer_id = Column(String(36), ForeignKey("customers.id", ondelete="SET NULL"))
    
    # Warranty
    warranty_start_date = Column(DateTime)
    warranty_expiry_date = Column(DateTime)
    warranty_terms = Column(Text)
    
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        Index("idx_serial_company", "company_id"),
        Index("idx_serial_product", "product_id"),
        Index("idx_serial_number_unique", "company_id", "serial_number", unique=True),
        Index("idx_serial_status", "status"),
    )

    def __repr__(self):
        return f"<SerialNumber {self.serial_number}>"


class StockAdjustmentStatus(str, PyEnum):
    """Stock adjustment status."""
    DRAFT = "draft"
    VERIFIED = "verified"
    APPROVED = "approved"
    POSTED = "posted"


class StockAdjustment(Base):
    """Physical stock verification and adjustment."""
    __tablename__ = "stock_adjustments"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    company_id = Column(String(36), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    
    adjustment_number = Column(String(50), nullable=False)
    adjustment_date = Column(DateTime, nullable=False, default=datetime.utcnow)
    
    godown_id = Column(String(36), ForeignKey("godowns.id", ondelete="SET NULL"))
    
    status = Column(Enum(StockAdjustmentStatus), default=StockAdjustmentStatus.DRAFT)
    
    # Totals
    total_items = Column(Integer, default=0)
    total_variance_value = Column(Numeric(14, 2), default=0)
    
    # Workflow
    verified_by = Column(String(36))
    verified_at = Column(DateTime)
    approved_by = Column(String(36))
    approved_at = Column(DateTime)
    
    # Linked transaction (for accounting entry)
    transaction_id = Column(String(36), ForeignKey("transactions.id", ondelete="SET NULL"))
    
    reason = Column(Text)
    notes = Column(Text)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    items = relationship("StockAdjustmentItem", back_populates="adjustment", cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_stock_adj_company", "company_id"),
        Index("idx_stock_adj_date", "adjustment_date"),
    )

    def __repr__(self):
        return f"<StockAdjustment {self.adjustment_number}>"


class StockAdjustmentItem(Base):
    """Individual items in stock adjustment."""
    __tablename__ = "stock_adjustment_items"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    adjustment_id = Column(String(36), ForeignKey("stock_adjustments.id", ondelete="CASCADE"), nullable=False)
    product_id = Column(String(36), ForeignKey("items.id", ondelete="CASCADE"), nullable=False)
    batch_id = Column(String(36), ForeignKey("batches.id", ondelete="SET NULL"))
    
    # Quantities
    book_quantity = Column(Numeric(14, 3), nullable=False)
    physical_quantity = Column(Numeric(14, 3), nullable=False)
    variance_quantity = Column(Numeric(14, 3), nullable=False)
    
    # Values
    rate = Column(Numeric(14, 2), default=0)
    variance_value = Column(Numeric(14, 2), default=0)
    
    reason = Column(Text)
    
    created_at = Column(DateTime, default=datetime.utcnow)

    adjustment = relationship("StockAdjustment", back_populates="items")

    __table_args__ = (
        Index("idx_stock_adj_item_adj", "adjustment_id"),
    )

    def __repr__(self):
        return f"<StockAdjustmentItem {self.variance_quantity}>"


class DiscountType(str, PyEnum):
    """Discount type."""
    PERCENTAGE = "percentage"
    FIXED_AMOUNT = "fixed_amount"
    QUANTITY_BASED = "quantity_based"
    BUY_X_GET_Y = "buy_x_get_y"


class DiscountRule(Base):
    """Item-wise and category-wise discount rules."""
    __tablename__ = "discount_rules"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    company_id = Column(String(36), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    
    name = Column(String(255), nullable=False)
    description = Column(Text)
    
    discount_type = Column(Enum(DiscountType), nullable=False)
    
    # Applicability
    applies_to = Column(String(20), default="all")
    product_id = Column(String(36), ForeignKey("items.id", ondelete="CASCADE"))
    stock_group_id = Column(String(36), ForeignKey("stock_groups.id", ondelete="CASCADE"))
    customer_id = Column(String(36), ForeignKey("customers.id", ondelete="CASCADE"))
    price_level_id = Column(String(36), ForeignKey("price_levels.id", ondelete="CASCADE"))
    
    # Discount values
    discount_value = Column(Numeric(10, 2), nullable=False)
    
    # Quantity-based rules
    min_quantity = Column(Numeric(14, 3))
    max_quantity = Column(Numeric(14, 3))
    
    # Buy X Get Y
    buy_quantity = Column(Numeric(14, 3))
    free_quantity = Column(Numeric(14, 3))
    
    # Validity
    effective_from = Column(DateTime)
    effective_to = Column(DateTime)
    
    # Limits
    max_discount_amount = Column(Numeric(14, 2))
    usage_limit = Column(Integer)
    usage_count = Column(Integer, default=0)
    
    is_active = Column(Boolean, default=True)
    priority = Column(Integer, default=0)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        Index("idx_discount_rule_company", "company_id"),
        Index("idx_discount_rule_product", "product_id"),
    )

    def __repr__(self):
        return f"<DiscountRule {self.name}>"


class ManufacturingOrderStatus(str, PyEnum):
    """Manufacturing order status."""
    DRAFT = "draft"
    PLANNED = "planned"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class ManufacturingOrder(Base):
    """Manufacturing/Production order (Stock Journal)."""
    __tablename__ = "manufacturing_orders"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    company_id = Column(String(36), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    
    order_number = Column(String(50), nullable=False)
    order_date = Column(DateTime, nullable=False, default=datetime.utcnow)
    
    # BOM reference
    bom_id = Column(String(36), ForeignKey("bills_of_material.id", ondelete="SET NULL"))
    
    # Finished product
    finished_product_id = Column(String(36), ForeignKey("items.id", ondelete="CASCADE"), nullable=False)
    planned_quantity = Column(Numeric(14, 3), nullable=False)
    produced_quantity = Column(Numeric(14, 3), default=0)
    
    # Godowns
    production_godown_id = Column(String(36), ForeignKey("godowns.id", ondelete="SET NULL"))
    finished_goods_godown_id = Column(String(36), ForeignKey("godowns.id", ondelete="SET NULL"))
    
    status = Column(Enum(ManufacturingOrderStatus), default=ManufacturingOrderStatus.DRAFT)
    
    # Dates
    planned_start_date = Column(DateTime)
    planned_end_date = Column(DateTime)
    actual_start_date = Column(DateTime)
    actual_end_date = Column(DateTime)
    
    # Costs
    estimated_cost = Column(Numeric(14, 2), default=0)
    actual_cost = Column(Numeric(14, 2), default=0)
    
    notes = Column(Text)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    consumption_items = relationship("ManufacturingConsumption", back_populates="order", cascade="all, delete-orphan")
    byproducts = relationship("ManufacturingByproduct", back_populates="order", cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_mfg_order_company", "company_id"),
        Index("idx_mfg_order_date", "order_date"),
        Index("idx_mfg_order_status", "status"),
    )

    def __repr__(self):
        return f"<ManufacturingOrder {self.order_number}>"


class ManufacturingConsumption(Base):
    """Raw materials consumed in manufacturing."""
    __tablename__ = "manufacturing_consumption"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    order_id = Column(String(36), ForeignKey("manufacturing_orders.id", ondelete="CASCADE"), nullable=False)
    product_id = Column(String(36), ForeignKey("items.id", ondelete="CASCADE"), nullable=False)
    batch_id = Column(String(36), ForeignKey("batches.id", ondelete="SET NULL"))
    godown_id = Column(String(36), ForeignKey("godowns.id", ondelete="SET NULL"))
    
    planned_quantity = Column(Numeric(14, 3), nullable=False)
    actual_quantity = Column(Numeric(14, 3), default=0)
    
    rate = Column(Numeric(14, 2), default=0)
    value = Column(Numeric(14, 2), default=0)
    
    created_at = Column(DateTime, default=datetime.utcnow)

    order = relationship("ManufacturingOrder", back_populates="consumption_items")

    __table_args__ = (
        Index("idx_mfg_consumption_order", "order_id"),
    )

    def __repr__(self):
        return f"<ManufacturingConsumption {self.product_id}>"


class ManufacturingByproduct(Base):
    """Byproducts from manufacturing."""
    __tablename__ = "manufacturing_byproducts"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    order_id = Column(String(36), ForeignKey("manufacturing_orders.id", ondelete="CASCADE"), nullable=False)
    product_id = Column(String(36), ForeignKey("items.id", ondelete="CASCADE"), nullable=False)
    godown_id = Column(String(36), ForeignKey("godowns.id", ondelete="SET NULL"))
    
    quantity = Column(Numeric(14, 3), nullable=False)
    rate = Column(Numeric(14, 2), default=0)
    value = Column(Numeric(14, 2), default=0)
    
    created_at = Column(DateTime, default=datetime.utcnow)

    order = relationship("ManufacturingOrder", back_populates="byproducts")

    __table_args__ = (
        Index("idx_mfg_byproduct_order", "order_id"),
    )

    def __repr__(self):
        return f"<ManufacturingByproduct {self.product_id}>"


# ============== BANKING MODELS ==============

class ChequeBook(Base):
    """Cheque book register."""
    __tablename__ = "cheque_books"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    company_id = Column(String(36), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    bank_account_id = Column(String(36), ForeignKey("bank_accounts.id", ondelete="CASCADE"), nullable=False)
    
    book_name = Column(String(100))
    cheque_series_from = Column(String(20), nullable=False)
    cheque_series_to = Column(String(20), nullable=False)
    current_cheque = Column(String(20))
    
    total_leaves = Column(Integer, nullable=False)
    used_leaves = Column(Integer, default=0)
    
    received_date = Column(DateTime)
    
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    cheques = relationship("Cheque", back_populates="cheque_book", cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_cheque_book_company", "company_id"),
        Index("idx_cheque_book_bank", "bank_account_id"),
    )

    def __repr__(self):
        return f"<ChequeBook {self.cheque_series_from}-{self.cheque_series_to}>"


class ChequeStatus(str, PyEnum):
    """Cheque status."""
    BLANK = "blank"
    ISSUED = "issued"
    RECEIVED = "received"
    DEPOSITED = "deposited"
    CLEARED = "cleared"
    BOUNCED = "bounced"
    CANCELLED = "cancelled"
    STOPPED = "stopped"


class ChequeType(str, PyEnum):
    """Cheque type."""
    ISSUED = "issued"
    RECEIVED = "received"


class Cheque(Base):
    """Individual cheque records."""
    __tablename__ = "cheques"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    company_id = Column(String(36), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    cheque_book_id = Column(String(36), ForeignKey("cheque_books.id", ondelete="SET NULL"))
    
    cheque_type = Column(Enum(ChequeType), nullable=False)
    cheque_number = Column(String(20), nullable=False)
    cheque_date = Column(DateTime, nullable=False)
    
    # For issued cheques
    bank_account_id = Column(String(36), ForeignKey("bank_accounts.id", ondelete="SET NULL"))
    
    # For received cheques
    drawn_on_bank = Column(String(255))
    drawn_on_branch = Column(String(255))
    
    amount = Column(Numeric(14, 2), nullable=False)
    payee_name = Column(String(255))
    drawer_name = Column(String(255))
    
    # Party reference
    party_id = Column(String(36))
    party_type = Column(String(20))
    
    status = Column(Enum(ChequeStatus), default=ChequeStatus.BLANK)
    
    # Dates
    issue_date = Column(DateTime)
    deposit_date = Column(DateTime)
    clearing_date = Column(DateTime)
    
    # Bounce details
    bounce_date = Column(DateTime)
    bounce_reason = Column(Text)
    bounce_charges = Column(Numeric(10, 2), default=0)
    
    # Stop payment
    stop_date = Column(DateTime)
    stop_reason = Column(Text)
    
    # Transaction reference
    transaction_id = Column(String(36), ForeignKey("transactions.id", ondelete="SET NULL"))
    
    # Invoice reference
    invoice_id = Column(String(36))
    invoice_type = Column(String(20))
    
    notes = Column(Text)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    cheque_book = relationship("ChequeBook", back_populates="cheques")

    __table_args__ = (
        Index("idx_cheque_company", "company_id"),
        Index("idx_cheque_number", "company_id", "cheque_number"),
        Index("idx_cheque_status", "status"),
        Index("idx_cheque_date", "cheque_date"),
    )

    def __repr__(self):
        return f"<Cheque {self.cheque_number}>"


class PostDatedCheque(Base):
    """Post-dated cheques (PDC) tracking."""
    __tablename__ = "post_dated_cheques"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    company_id = Column(String(36), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    
    pdc_type = Column(String(20), nullable=False)
    
    # Party
    party_id = Column(String(36))
    party_type = Column(String(20))
    party_name = Column(String(255))
    
    # Cheque details
    cheque_number = Column(String(20), nullable=False)
    cheque_date = Column(DateTime, nullable=False)
    bank_name = Column(String(255))
    branch_name = Column(String(255))
    
    amount = Column(Numeric(14, 2), nullable=False)
    
    status = Column(String(20), default="pending")
    
    # Dates
    received_date = Column(DateTime)
    deposit_date = Column(DateTime)
    clearing_date = Column(DateTime)
    
    # Reference
    invoice_id = Column(String(36))
    invoice_type = Column(String(20))
    
    # Linked to actual cheque when deposited
    cheque_id = Column(String(36), ForeignKey("cheques.id", ondelete="SET NULL"))
    
    notes = Column(Text)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        Index("idx_pdc_company", "company_id"),
        Index("idx_pdc_date", "cheque_date"),
        Index("idx_pdc_status", "status"),
    )

    def __repr__(self):
        return f"<PostDatedCheque {self.cheque_number}>"


class BankReconciliation(Base):
    """Bank reconciliation statement header."""
    __tablename__ = "bank_reconciliations"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    company_id = Column(String(36), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    bank_account_id = Column(String(36), ForeignKey("bank_accounts.id", ondelete="CASCADE"), nullable=False)
    
    reconciliation_date = Column(DateTime, nullable=False)
    period_from = Column(DateTime, nullable=False)
    period_to = Column(DateTime, nullable=False)
    
    # Balances
    opening_balance_book = Column(Numeric(14, 2), default=0)
    closing_balance_book = Column(Numeric(14, 2), default=0)
    opening_balance_bank = Column(Numeric(14, 2), default=0)
    closing_balance_bank = Column(Numeric(14, 2), default=0)
    
    # Counts
    total_entries = Column(Integer, default=0)
    matched_entries = Column(Integer, default=0)
    unmatched_entries = Column(Integer, default=0)
    
    # Differences
    cheques_issued_not_presented = Column(Numeric(14, 2), default=0)
    cheques_deposited_not_cleared = Column(Numeric(14, 2), default=0)
    bank_charges_not_recorded = Column(Numeric(14, 2), default=0)
    interest_not_recorded = Column(Numeric(14, 2), default=0)
    other_differences = Column(Numeric(14, 2), default=0)
    
    status = Column(String(20), default="draft")
    
    completed_by = Column(String(36))
    completed_at = Column(DateTime)
    
    notes = Column(Text)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    entries = relationship("ReconciliationEntry", back_populates="reconciliation", cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_brs_company", "company_id"),
        Index("idx_brs_bank", "bank_account_id"),
        Index("idx_brs_date", "reconciliation_date"),
    )

    def __repr__(self):
        return f"<BankReconciliation {self.reconciliation_date}>"


class ReconciliationEntry(Base):
    """Individual reconciliation entries."""
    __tablename__ = "reconciliation_entries"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    reconciliation_id = Column(String(36), ForeignKey("bank_reconciliations.id", ondelete="CASCADE"), nullable=False)
    
    # Book entry
    transaction_entry_id = Column(String(36), ForeignKey("transaction_entries.id", ondelete="SET NULL"))
    book_date = Column(DateTime)
    book_amount = Column(Numeric(14, 2))
    book_reference = Column(String(100))
    
    # Bank statement entry
    bank_date = Column(DateTime)
    bank_amount = Column(Numeric(14, 2))
    bank_reference = Column(String(100))
    bank_description = Column(Text)
    
    # Matching
    is_matched = Column(Boolean, default=False)
    match_type = Column(String(20))
    match_confidence = Column(Numeric(5, 2))
    
    difference = Column(Numeric(14, 2), default=0)
    
    notes = Column(Text)
    
    created_at = Column(DateTime, default=datetime.utcnow)

    reconciliation = relationship("BankReconciliation", back_populates="entries")

    __table_args__ = (
        Index("idx_recon_entry_recon", "reconciliation_id"),
    )

    def __repr__(self):
        return f"<ReconciliationEntry {self.is_matched}>"


class RecurringFrequency(str, PyEnum):
    """Recurring transaction frequency."""
    DAILY = "daily"
    WEEKLY = "weekly"
    BIWEEKLY = "biweekly"
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"
    HALF_YEARLY = "half_yearly"
    YEARLY = "yearly"


class RecurringTransaction(Base):
    """Recurring/Standing transactions."""
    __tablename__ = "recurring_transactions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    company_id = Column(String(36), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    
    name = Column(String(255), nullable=False)
    description = Column(Text)
    
    # Template transaction
    voucher_type = Column(Enum(VoucherType), nullable=False)
    template_data = Column(JSON)
    
    # Party
    party_id = Column(String(36))
    party_type = Column(String(20))
    
    # Amount
    amount = Column(Numeric(14, 2), nullable=False)
    
    # Account mapping for journal entries
    debit_account_id = Column(String(36), ForeignKey("accounts.id", ondelete="SET NULL"))
    credit_account_id = Column(String(36), ForeignKey("accounts.id", ondelete="SET NULL"))
    category = Column(String(100))
    
    # Schedule
    frequency = Column(Enum(RecurringFrequency), nullable=False)
    start_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime)
    next_date = Column(DateTime, nullable=False)
    
    # Day of month/week
    day_of_month = Column(Integer)
    day_of_week = Column(Integer)
    
    # Limits
    total_occurrences = Column(Integer)
    occurrences_created = Column(Integer, default=0)
    
    # Settings
    auto_create = Column(Boolean, default=True)
    reminder_days = Column(Integer, default=3)
    
    is_active = Column(Boolean, default=True)
    
    last_created_at = Column(DateTime)
    last_transaction_id = Column(String(36), ForeignKey("transactions.id", ondelete="SET NULL"))
    
    # Relationships
    debit_account = relationship("Account", foreign_keys=[debit_account_id])
    credit_account = relationship("Account", foreign_keys=[credit_account_id])
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        Index("idx_recurring_company", "company_id"),
        Index("idx_recurring_next", "next_date"),
        Index("idx_recurring_active", "is_active"),
    )

    def __repr__(self):
        return f"<RecurringTransaction {self.name}>"


# ============== ACCOUNTING MODELS ==============

class BillAllocationType(str, PyEnum):
    """Bill allocation type."""
    AGAINST_REFERENCE = "against_ref"
    NEW_REFERENCE = "new_ref"
    ADVANCE = "advance"
    ON_ACCOUNT = "on_account"


class BillAllocation(Base):
    """Bill-wise payment allocation."""
    __tablename__ = "bill_allocations"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    company_id = Column(String(36), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    
    # Payment transaction
    payment_transaction_id = Column(String(36), ForeignKey("transactions.id", ondelete="CASCADE"), nullable=False)
    
    # Invoice reference
    invoice_id = Column(String(36), nullable=False)
    invoice_type = Column(String(20), nullable=False)
    invoice_number = Column(String(50))
    
    # Allocation
    allocation_type = Column(Enum(BillAllocationType), nullable=False)
    allocated_amount = Column(Numeric(14, 2), nullable=False)
    allocation_date = Column(DateTime, nullable=False)
    
    # Party
    party_id = Column(String(36))
    party_type = Column(String(20))
    
    notes = Column(Text)
    
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        Index("idx_bill_alloc_company", "company_id"),
        Index("idx_bill_alloc_payment", "payment_transaction_id"),
        Index("idx_bill_alloc_invoice", "invoice_id", "invoice_type"),
    )

    def __repr__(self):
        return f"<BillAllocation {self.allocated_amount}>"


class AccountMappingType(str, PyEnum):
    """Account mapping type for different transaction categories."""
    RECURRING_EXPENSE = "recurring_expense"
    RECURRING_INCOME = "recurring_income"
    PAYROLL = "payroll"
    INVENTORY = "inventory"
    TAX = "tax"


class AccountMapping(Base):
    """Default account mappings for different transaction types."""
    __tablename__ = "account_mappings"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    company_id = Column(String(36), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    
    # Mapping type
    mapping_type = Column(Enum(AccountMappingType), nullable=False)
    
    # Category within type (e.g., 'rent', 'utilities', 'salary', 'pf')
    category = Column(String(100), nullable=False)
    name = Column(String(255), nullable=False)
    
    # Account mapping
    debit_account_id = Column(String(36), ForeignKey("accounts.id", ondelete="SET NULL"))
    credit_account_id = Column(String(36), ForeignKey("accounts.id", ondelete="SET NULL"))
    
    # For payroll: single account mapping per component
    account_id = Column(String(36), ForeignKey("accounts.id", ondelete="SET NULL"))
    is_debit = Column(Boolean, default=True)
    
    # Settings
    is_system = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    debit_account = relationship("Account", foreign_keys=[debit_account_id])
    credit_account = relationship("Account", foreign_keys=[credit_account_id])
    account = relationship("Account", foreign_keys=[account_id])

    __table_args__ = (
        Index("idx_acc_mapping_company", "company_id"),
        Index("idx_acc_mapping_type", "mapping_type", "category"),
        UniqueConstraint("company_id", "mapping_type", "category", name="uq_account_mapping"),
    )

    def __repr__(self):
        return f"<AccountMapping {self.name}>"


class PayrollAccountConfig(Base):
    """Payroll-specific account configuration for salary components."""
    __tablename__ = "payroll_account_configs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    company_id = Column(String(36), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    
    # Salary component reference
    salary_component_id = Column(String(36), ForeignKey("salary_components.id", ondelete="CASCADE"))
    component_type = Column(String(50))
    component_name = Column(String(100))
    
    # Account mapping
    account_id = Column(String(36), ForeignKey("accounts.id", ondelete="SET NULL"))
    is_debit = Column(Boolean, default=True)
    
    # For employer contributions, we may need both sides
    contra_account_id = Column(String(36), ForeignKey("accounts.id", ondelete="SET NULL"))
    
    is_active = Column(Boolean, default=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    salary_component = relationship("SalaryComponent")
    account = relationship("Account", foreign_keys=[account_id])
    contra_account = relationship("Account", foreign_keys=[contra_account_id])

    __table_args__ = (
        Index("idx_payroll_acc_company", "company_id"),
        Index("idx_payroll_acc_component", "salary_component_id"),
    )

    def __repr__(self):
        return f"<PayrollAccountConfig {self.component_name}>"


class PeriodLock(Base):
    """Period locking to prevent backdated entries."""
    __tablename__ = "period_locks"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    company_id = Column(String(36), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    
    locked_from = Column(DateTime, nullable=False)
    locked_to = Column(DateTime, nullable=False)
    
    # Specific voucher types (null = all)
    voucher_types = Column(JSON)
    
    reason = Column(Text)
    
    locked_by = Column(String(36))
    locked_at = Column(DateTime, default=datetime.utcnow)
    
    is_active = Column(Boolean, default=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        Index("idx_period_lock_company", "company_id"),
        Index("idx_period_lock_dates", "locked_from", "locked_to"),
    )

    def __repr__(self):
        return f"<PeriodLock {self.locked_from} to {self.locked_to}>"


class AuditLog(Base):
    """Audit trail for all changes."""
    __tablename__ = "audit_logs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    company_id = Column(String(36), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    
    # What was changed
    table_name = Column(String(100), nullable=False)
    record_id = Column(String(36), nullable=False)
    
    # Action
    action = Column(String(20), nullable=False)
    
    # Values
    old_values = Column(JSON)
    new_values = Column(JSON)
    
    # Changes summary
    changed_fields = Column(JSON)
    
    # Who changed
    changed_by = Column(String(36))
    changed_by_name = Column(String(255))
    
    # When
    changed_at = Column(DateTime, default=datetime.utcnow)
    
    # Context
    ip_address = Column(String(45))
    user_agent = Column(Text)
    
    # Session
    session_id = Column(String(100))

    __table_args__ = (
        Index("idx_audit_company", "company_id"),
        Index("idx_audit_table", "table_name", "record_id"),
        Index("idx_audit_date", "changed_at"),
        Index("idx_audit_user", "changed_by"),
    )

    def __repr__(self):
        return f"<AuditLog {self.action} on {self.table_name}>"


# ============== MISSING MODEL DEFINITIONS ==============


class NarrationTemplate(Base):
    """Narration templates per voucher type."""
    __tablename__ = "narration_templates"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    company_id = Column(String(36), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    
    name = Column(String(255), nullable=False)
    voucher_type = Column(Enum(VoucherType), nullable=False)
    
    # Template with placeholders
    # e.g., "Being payment to {{party_name}} against {{invoice_number}} dated {{invoice_date}}"
    template_text = Column(Text, nullable=False)
    
    # Available placeholders for this template
    placeholders = Column(JSON)  # ["party_name", "invoice_number", "amount"]
    
    is_default = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        Index("idx_narration_company", "company_id"),
        Index("idx_narration_voucher", "voucher_type"),
    )

    def __repr__(self):
        return f"<NarrationTemplate {self.name}>"


class Scenario(Base):
    """What-if scenario management."""
    __tablename__ = "scenarios"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    company_id = Column(String(36), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    
    name = Column(String(255), nullable=False)
    description = Column(Text)
    
    # Include optional vouchers in this scenario
    include_optional_vouchers = Column(Boolean, default=False)
    
    # Filters
    from_date = Column(DateTime)
    to_date = Column(DateTime)
    voucher_types = Column(JSON)  # Filter by voucher types
    
    is_active = Column(Boolean, default=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        Index("idx_scenario_company", "company_id"),
    )

    def __repr__(self):
        return f"<Scenario {self.name}>"


# ============== MISCELLANEOUS MODELS ==============

class Attachment(Base):
    """Document attachments to any entity."""
    __tablename__ = "attachments"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    company_id = Column(String(36), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    
    # Reference to any entity
    entity_type = Column(String(50), nullable=False)  # voucher, customer, product, invoice
    entity_id = Column(String(36), nullable=False)
    
    # File details
    file_name = Column(String(255), nullable=False)
    original_name = Column(String(255))
    file_type = Column(String(50))  # pdf, jpg, png, xlsx
    mime_type = Column(String(100))
    file_size = Column(Integer)  # bytes
    
    # Storage
    file_url = Column(Text)  # S3 URL or local path
    thumbnail_url = Column(Text)  # For images
    
    # Metadata
    description = Column(Text)
    tags = Column(JSON)  # ["invoice", "receipt"]
    
    uploaded_by = Column(String(36))
    uploaded_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        Index("idx_attachment_company", "company_id"),
        Index("idx_attachment_entity", "entity_type", "entity_id"),
    )

    def __repr__(self):
        return f"<Attachment {self.file_name}>"


class NotificationType(str, PyEnum):
    """Notification type."""
    PAYMENT_DUE = "payment_due"
    PAYMENT_RECEIVED = "payment_received"
    LOW_STOCK = "low_stock"
    CHEQUE_MATURITY = "cheque_maturity"
    GST_FILING = "gst_filing"
    INVOICE_OVERDUE = "invoice_overdue"
    APPROVAL_PENDING = "approval_pending"
    SYSTEM = "system"


class Notification(Base):
    """In-app notifications."""
    __tablename__ = "notifications"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    company_id = Column(String(36), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"))
    
    notification_type = Column(Enum(NotificationType), nullable=False)
    
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    
    # Reference to related entity
    entity_type = Column(String(50))
    entity_id = Column(String(36))
    
    # Action URL
    action_url = Column(String(500))
    
    # Priority
    priority = Column(String(20), default="normal")  # low, normal, high, urgent
    
    # Status
    is_read = Column(Boolean, default=False)
    read_at = Column(DateTime)
    
    is_archived = Column(Boolean, default=False)
    archived_at = Column(DateTime)
    
    # Scheduling
    scheduled_for = Column(DateTime)  # For future notifications
    
    expires_at = Column(DateTime)  # Auto-expire old notifications
    
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        Index("idx_notification_company", "company_id"),
        Index("idx_notification_user", "user_id"),
        Index("idx_notification_read", "is_read"),
        Index("idx_notification_type", "notification_type"),
    )

    def __repr__(self):
        return f"<Notification {self.title}>"


class DashboardWidget(Base):
    """Dashboard widget configuration per user."""
    __tablename__ = "dashboard_widgets"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    company_id = Column(String(36), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"))
    
    widget_type = Column(String(50), nullable=False)  # sales_summary, cash_flow, receivables, etc.
    
    # Position
    position_x = Column(Integer, default=0)
    position_y = Column(Integer, default=0)
    width = Column(Integer, default=1)  # Grid units
    height = Column(Integer, default=1)
    
    # Configuration
    config = Column(JSON)  # Widget-specific settings
    
    is_visible = Column(Boolean, default=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        Index("idx_widget_company", "company_id"),
        Index("idx_widget_user", "user_id"),
    )

    def __repr__(self):
        return f"<DashboardWidget {self.widget_type}>"


class ExportLog(Base):
    """Track data exports."""
    __tablename__ = "export_logs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    company_id = Column(String(36), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"))
    
    export_type = Column(String(50), nullable=False)  # excel, pdf, csv
    report_name = Column(String(255), nullable=False)
    
    # Filters used
    filters = Column(JSON)
    
    # Result
    file_name = Column(String(255))
    file_url = Column(Text)
    file_size = Column(Integer)
    row_count = Column(Integer)
    
    # Timing
    started_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime)
    
    status = Column(String(20), default="pending")  # pending, processing, completed, failed
    error_message = Column(Text)
    
    # Access
    ip_address = Column(String(45))
    
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        Index("idx_export_company", "company_id"),
        Index("idx_export_user", "user_id"),
        Index("idx_export_date", "created_at"),
    )

    def __repr__(self):
        return f"<ExportLog {self.report_name}>"


# ============== ADD NEW COLUMNS TO EXISTING TABLES ==============
# Note: These are handled via the model definitions above and will be 
# added when the database is reset. The columns are:
#
# Products: reorder_level, reorder_quantity, maximum_stock_level, 
#           track_serial_numbers, default_discount_percent
#
# Customers: credit_limit, credit_days, block_on_credit_exceed,
#            price_level_id, interest_rate
#
# Invoices: outstanding_amount
# PurchaseInvoices: outstanding_amount
#
# Transactions: is_optional, auto_reverse_date, scenario_id
#
# TransactionEntries: bank_date, is_reconciled, reconciliation_date,
#                     bank_reference, cheque_id
#
# Accounts: parent_id, level (already present)
#
# Companies: negative_stock_allowed, default_valuation_method


# ============== QUOTATION MODELS ==============

class QuotationStatus(str, PyEnum):
    """Quotation status enumeration."""
    DRAFT = "draft"
    SENT = "sent"
    APPROVED = "approved"
    REJECTED = "rejected"
    EXPIRED = "expired"
    CONVERTED = "converted"



class SubItem(Base):
    __tablename__ = "sub_items"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    quotation_item_id = Column(String, ForeignKey("quotation_items.id", ondelete="CASCADE"), nullable=False)
    description = Column(Text, nullable=False)
    quantity = Column(Integer, nullable=False, default=1)
    image_url = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationship
    quotation_item = relationship("QuotationItem", back_populates="sub_items")
    
    def to_dict(self):
        return {
            "id": self.id,
            "description": self.description,
            "quantity": self.quantity,
            "image_url": self.image_url,
        }


class QuotationItem(Base):
    """Quotation line item model."""
    __tablename__ = "quotation_items"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    quotation_id = Column(String(36), ForeignKey("quotations.id", ondelete="CASCADE"), nullable=False)
    product_id = Column(String(36), ForeignKey("items.id", ondelete="SET NULL"))
    item_code = Column(String(250), nullable=True)
    is_project = Column(Boolean, default=False)
    # Item details
    description = Column(String(500), nullable=False)
    hsn_code = Column(String(8))
    
    # Quantity and pricing
    quantity = Column(Numeric(10, 3), nullable=False)
    unit = Column(String(20), default="unit")
    unit_price = Column(Numeric(12, 2), nullable=False)
    
    # Discount
    discount_percent = Column(Numeric(5, 2), default=0)
    discount_amount = Column(Numeric(12, 2), default=0)
    
    # Tax
    gst_rate = Column(Numeric(5, 2), nullable=False)
    cgst_rate = Column(Numeric(5, 2), default=0)
    sgst_rate = Column(Numeric(5, 2), default=0)
    igst_rate = Column(Numeric(5, 2), default=0)
    
    cgst_amount = Column(Numeric(12, 2), default=0)
    sgst_amount = Column(Numeric(12, 2), default=0)
    igst_amount = Column(Numeric(12, 2), default=0)
    cess_amount = Column(Numeric(12, 2), default=0)
    
    # Totals
    taxable_amount = Column(Numeric(14, 2), nullable=False)
    total_amount = Column(Numeric(14, 2), nullable=False)
    
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    quotation = relationship("Quotation", back_populates="items")
    product = relationship("Product")
    sub_items = relationship("SubItem", back_populates="quotation_item", cascade="all, delete-orphan")
    def to_dict(self):
        return {
            "id": self.id,
            "product_id": self.product_id,
            "item_code": self.item_code,
            "description": self.description,
            "hsn_code": self.hsn_code,
            "quantity": float(self.quantity),
            "unit": self.unit,
            "unit_price": float(self.unit_price),
            "discount_percent": float(self.discount_percent),
            "discount_amount": float(self.discount_amount),
            "gst_rate": float(self.gst_rate),
            "cgst_amount": float(self.cgst_amount),
            "sgst_amount": float(self.sgst_amount),
            "igst_amount": float(self.igst_amount),
            "taxable_amount": float(self.taxable_amount),
            "total_amount": float(self.total_amount),
            "is_project": self.is_project,
            "sub_items": [sub_item.to_dict() for sub_item in self.sub_items] if self.sub_items else []
        }
    __table_args__ = (
        Index("idx_quotation_item_quotation", "quotation_id"),
    )

    def __repr__(self):
        return f"<QuotationItem {self.description[:30]}>"



class Quotation(Base):
    """Quotation model - Pre-invoice document sent to customers for approval."""
    __tablename__ = "quotations"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    company_id = Column(String(36), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    customer_id = Column(String(36), ForeignKey("customers.id", ondelete="SET NULL"))
    
    # Sales pipeline tracking
    sales_ticket_id = Column(String(36), ForeignKey("sales_tickets.id", ondelete="SET NULL"))
    contact_id = Column(String(36), ForeignKey("contacts.id", ondelete="SET NULL"))
    sales_person_id = Column(String(36), ForeignKey("employees.id", ondelete="SET NULL"))
    contact_person = Column(String(255), nullable=True)
    sales_person_name = Column(String(255), nullable=True)
    reference = Column(String(255), nullable=True)
    reference_no = Column(String(255), nullable=True)
    reference_date = Column(Date, nullable=True)
    payment_terms = Column(Text, nullable=True)
    remarks = Column(Text, nullable=True)
    excel_notes_file_url = Column(Text, nullable=True)
    
    # Quotation identification
    quotation_number = Column(String(50), nullable=False, index=True)
    quotation_date = Column(DateTime, nullable=False, default=datetime.utcnow)
    validity_date = Column(DateTime)  # Quote expires after this date
    quotation_type = Column(String(20), default="item") 

    is_project = Column(Boolean, default=False)
    
    # Reference to original document if revised
    revised_from_id = Column(String(36), ForeignKey("quotations.id", ondelete="SET NULL"))
    revision_number = Column(Integer, default=0)
    
    # Place of supply (State code for GST)
    place_of_supply = Column(String(2))
    place_of_supply_name = Column(String(100))
    
    # Multi-currency support
    currency_code = Column(String(3), default="INR")  # ISO 4217: INR, USD, EUR
    exchange_rate = Column(Numeric(14, 6), default=1.0)  # Exchange rate to INR
    base_currency_total = Column(Numeric(14, 2))  # Total in INR (for reporting)
    
    # PDF generation options
    show_images_in_pdf = Column(Boolean, default=True)  # Toggle to show/hide images in PDF
    show_images = Column(Boolean, default=True)  # Toggle to show/hide images in UI

    # Charges
    freight_charges = Column(Numeric(14, 2), default=0)
    freight_type = Column(String(20), default="fixed")
    p_and_f_charges = Column(Numeric(14, 2), default=0)
    pf_type = Column(String(20), default="fixed")
    
    # Amounts (in selected currency)
    subtotal = Column(Numeric(14, 2), default=0)
    discount_amount = Column(Numeric(14, 2), default=0)
    
    # GST breakup
    cgst_amount = Column(Numeric(14, 2), default=0)
    sgst_amount = Column(Numeric(14, 2), default=0)
    igst_amount = Column(Numeric(14, 2), default=0)
    cess_amount = Column(Numeric(14, 2), default=0)
    
    total_tax = Column(Numeric(14, 2), default=0)
    total_amount = Column(Numeric(14, 2), default=0)
    round_off = Column(Numeric(14, 2), default=0)
    
    # Status
    status = Column(Enum(QuotationStatus), default=QuotationStatus.DRAFT)
    
    # Customer approval tracking
    email_sent_at = Column(DateTime)
    email_sent_to = Column(String(255))
    viewed_at = Column(DateTime)
    approved_at = Column(DateTime)
    approved_by = Column(String(255))  # Customer name/email who approved
    rejected_at = Column(DateTime)
    rejection_reason = Column(Text)
    
    # Conversion tracking
    converted_invoice_id = Column(String(36), ForeignKey("invoices.id", ondelete="SET NULL"))
    converted_at = Column(DateTime)
    
    # Additional info
    subject = Column(String(255))  # Quote subject/title
    notes = Column(Text)
    terms = Column(Text)
    
    # PDF storage
    pdf_url = Column(String(500))
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    company = relationship("Company")
    customer = relationship("Customer")
    sales_ticket = relationship("SalesTicket")
    contact = relationship("Contact")
    sales_person = relationship("Employee")
    items = relationship("QuotationItem", back_populates="quotation", cascade="all, delete-orphan")
    converted_invoice = relationship("Invoice", foreign_keys=[converted_invoice_id])
    revised_from = relationship("Quotation", remote_side=[id])
     
  
    __table_args__ = (
        Index("idx_quotation_company", "company_id"),
        Index("idx_quotation_customer", "customer_id"),
        Index("idx_quotation_date", "quotation_date"),
        Index("idx_quotation_status", "status"),
        Index("idx_quotation_ticket", "sales_ticket_id"),
    )

    def __repr__(self):
        return f"<Quotation {self.quotation_number}>"




# ============== DELIVERY CHALLAN MODELS ==============

class DeliveryChallanType(str, PyEnum):
    """Delivery Challan type enumeration."""
    DC_OUT = "dc_out"  # Goods dispatched to customer
    DC_IN = "dc_in"    # Goods returned by customer


class DeliveryChallanStatus(str, PyEnum):
    """Delivery Challan status enumeration."""
    DRAFT = "draft"
    # DC Out statuses
    DISPATCHED = "dispatched"
    IN_TRANSIT = "in_transit"
    DELIVERED = "delivered"
    # DC In statuses
    RECEIVED = "received"  # Goods received inward
    PARTIALLY_RETURNED = "partially_returned"
    RETURNED = "returned"
    CANCELLED = "cancelled"

class DeliveryChallan(Base):
    """Delivery Challan model - Document for goods dispatch (DC Out) and returns (DC In)."""
    __tablename__ = "delivery_challans"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    company_id = Column(String(36), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    customer_id = Column(String(36), ForeignKey("customers.id", ondelete="SET NULL"))
    
    # Sales pipeline tracking
    sales_ticket_id = Column(String(36), ForeignKey("sales_tickets.id", ondelete="SET NULL"))
    contact_id = Column(String(36), ForeignKey("contacts.id", ondelete="SET NULL"))
    
      # DC identification
    dc_number = Column(String(50), nullable=False, index=True)
    dc_date = Column(DateTime, nullable=False, default=datetime.utcnow)
    dc_type = Column(Enum(DeliveryChallanType), nullable=False, default=DeliveryChallanType.DC_OUT)
    reference_no = Column(String(100))
    
      # Status
    status = Column(Enum(DeliveryChallanStatus), default=DeliveryChallanStatus.DRAFT)
    custom_status = Column(String(50))
    
    # Linked documents
    invoice_id = Column(String(36), ForeignKey("invoices.id", ondelete="SET NULL"))
    quotation_id = Column(String(36), ForeignKey("quotations.id", ondelete="SET NULL"))
    sales_order_id = Column(String(36), ForeignKey("sales_orders.id", ondelete="SET NULL"))
    
    # For DC In (returns), reference to original DC Out
    original_dc_id = Column(String(36), ForeignKey("delivery_challans.id", ondelete="SET NULL"))
    
    # Return reason (for DC In)
    return_reason = Column(Text)
    
    # E-Way Bill (for goods > 50K)
    eway_bill_number = Column(String(20))
    eway_bill_date = Column(DateTime)
    eway_bill_valid_until = Column(DateTime)
    
      # Transport details
    transporter_name = Column(String(255))
    transporter_id = Column(String(20))  # GSTIN of transporter
    transport_mode = Column(String(20))  # road, rail, air, ship
    vehicle_number = Column(String(20))
    vehicle_type = Column(String(50))
    lr_number = Column(String(50))  # Lorry Receipt / Consignment Note
    lr_date = Column(DateTime)
      
      # Bill details
    bill_title = Column(String(200))
    bill_description = Column(Text)
    expiry_date = Column(DateTime)
    salesman_id = Column(String(36), ForeignKey("employees.id", ondelete="SET NULL"))
    discount_percent = Column(Numeric(5, 2), default=0)

    # Dispatch/Delivery addresses
    dispatch_from_address = Column(Text)
    dispatch_from_city = Column(String(100))
    dispatch_from_state = Column(String(100))
    dispatch_from_pincode = Column(String(10))
    
    delivery_to_address = Column(Text)
    delivery_to_city = Column(String(100))
    delivery_to_state = Column(String(100))
    delivery_to_pincode = Column(String(10))
    
    # From/To godown
    from_godown_id = Column(String(36), ForeignKey("godowns.id", ondelete="SET NULL"))
    to_godown_id = Column(String(36), ForeignKey("godowns.id", ondelete="SET NULL"))
    
    # Stock tracking
    stock_updated = Column(Boolean, default=False)
    stock_updated_at = Column(DateTime)
    
    # Delivery confirmation
    delivered_at = Column(DateTime)
    received_by = Column(String(255))
    receiver_signature_url = Column(String(500))
    
    # Acknowledgement tracking
    acknowledgement_image_url = Column(String(500))
    acknowledgement_status = Column(String(50), default="pending")  # pending, acknowledged
    acknowledged_at = Column(DateTime)
    acknowledged_by = Column(String(200))
    
    # Courier tracking
    courier_company = Column(String(200))
    courier_docket_number = Column(String(100))
    courier_tracking_url = Column(String(500))
    
    notes = Column(Text)
    
    # PDF storage
    pdf_url = Column(String(500))
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    company = relationship("Company")
    customer = relationship("Customer")
    sales_ticket = relationship("SalesTicket")
    contact = relationship("Contact")
    invoice = relationship("Invoice")
    quotation = relationship("Quotation")
    sales_order = relationship("SalesOrder")
    original_dc = relationship("DeliveryChallan", remote_side=[id])
    from_godown = relationship("Godown", foreign_keys=[from_godown_id])
    to_godown = relationship("Godown", foreign_keys=[to_godown_id])
    items = relationship("DeliveryChallanItem", back_populates="delivery_challan", cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_dc_company", "company_id"),
        Index("idx_dc_customer", "customer_id"),
        Index("idx_dc_type", "dc_type"),
        Index("idx_dc_date", "dc_date"),
        Index("idx_dc_invoice", "invoice_id"),
        Index("idx_dc_status", "status"),
        Index("idx_dc_ticket", "sales_ticket_id"),
    )

    def __repr__(self):
        return f"<DeliveryChallan {self.dc_number} ({self.dc_type.value})>"


class DeliveryChallanItem(Base):
    """Delivery Challan line item model."""
    __tablename__ = "delivery_challan_items"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    delivery_challan_id = Column(String(36), ForeignKey("delivery_challans.id", ondelete="CASCADE"), nullable=False)
    product_id = Column(String(36), ForeignKey("items.id", ondelete="SET NULL"))
    batch_id = Column(String(36), ForeignKey("batches.id", ondelete="SET NULL"))
    discount_percent = Column(Numeric(5, 2), default=0)
    discount_amount = Column(Numeric(12, 2), default=0)
    gst_rate = Column(Numeric(5, 2), default=0)
    cgst_rate = Column(Numeric(5, 2), default=0)
    sgst_rate = Column(Numeric(5, 2), default=0)
    igst_rate = Column(Numeric(5, 2), default=0)
    taxable_amount = Column(Numeric(14, 2), default=0)
    total_amount = Column(Numeric(14, 2), default=0)

    # Invoice item reference (if created from invoice)
    invoice_item_id = Column(String(36), ForeignKey("invoice_items.id", ondelete="SET NULL"))
    
    # Item details
    description = Column(String(500), nullable=False)
    hsn_code = Column(String(8))
    
    # Quantity
    quantity = Column(Numeric(14, 3), nullable=False)
    unit = Column(String(20), default="unit")
    
    # For partial dispatch tracking
    pending_quantity = Column(Numeric(14, 3), default=0)  # Remaining to dispatch
    
    # Unit price (for valuation purposes, not charged separately in DC)
    unit_price = Column(Numeric(12, 2), default=0)
    
    # Serial numbers (if tracked)
    serial_numbers = Column(JSON)  # List of serial numbers
    
    # Godown allocation for this item
    godown_id = Column(String(36), ForeignKey("godowns.id", ondelete="SET NULL"))
    
    # Stock movement reference
    stock_movement_id = Column(String(36), ForeignKey("stock_entries.id", ondelete="SET NULL"))
    
    notes = Column(Text)
    
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    delivery_challan = relationship("DeliveryChallan", back_populates="items")
    product = relationship("Product")
    batch = relationship("Batch")
    invoice_item = relationship("InvoiceItem")
    godown = relationship("Godown")
    stock_entry = relationship("StockEntry")

    __table_args__ = (
        Index("idx_dc_item_dc", "delivery_challan_id"),
        Index("idx_dc_item_product", "product_id"),
    )

    def __repr__(self):
        return f"<DeliveryChallanItem {self.description[:30]}>"
        
# ============== SALES PIPELINE MODELS ==============

class Contact(Base):
    """Contact model - Contact persons at customer organizations."""
    __tablename__ = "contacts"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    customer_id = Column(String(36), ForeignKey("customers.id", ondelete="CASCADE"), nullable=False)
    
    # ADD THE MISSING company_id COLUMN
    company_id = Column(String(36), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    
    # Contact details
    name = Column(String(255), nullable=False)
    email = Column(String(255))
    phone = Column(String(20))
    mobile = Column(String(20))
    
    # Role/Position
    designation = Column(String(100))  # e.g., "Manager", "Director"
    department = Column(String(100))   # e.g., "Procurement", "Finance"
    
    # Primary contact flag
    is_primary = Column(Boolean, default=False)
    
    # Notes
    notes = Column(Text)
    
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    customer = relationship("Customer", back_populates="contacts")
    company = relationship("Company")  # This relationship should exist

    __table_args__ = (
        # REMOVE OR FIX THIS INDEX - it's referencing company_id which wasn't defined
        # Index("idx_contact_company", "company_id"),
        Index("idx_contact_customer", "customer_id"),
    )

    def __repr__(self):
        return f"<Contact {self.name}>"
class EnquirySource(str, PyEnum):
    """Enquiry source enumeration."""
    WEBSITE = "website"
    PHONE_CALL = "phone_call"
    EMAIL = "email"
    REFERRAL = "referral"
    WALK_IN = "walk_in"
    TRADE_SHOW = "trade_show"
    SOCIAL_MEDIA = "social_media"
    ADVERTISEMENT = "advertisement"
    OTHER = "other"


class EnquiryStatus(str, PyEnum):
    """Enquiry status enumeration."""
    NEW = "new"
    PENDING = "pending" 
    CONVERTED_TO_QUOT="Converted_to_quotation"
    IGNORED="ignored"
    COMPLETED="completed"
    READY_FOR_QUOT="ready_for_quotation"
    READY_FOR_PURCHASE="ready_for_purchase"


class SalesTicketStatus(str, PyEnum):
    """Sales ticket status enumeration."""
    OPEN = "open"
    WON = "won"
    LOST = "lost"
    CANCELLED = "cancelled"


class SalesTicketStage(str, PyEnum):
    """Sales ticket stage enumeration."""
    ENQUIRY = "enquiry"
    QUOTATION = "quotation"
    SALES_ORDER = "sales_order"
    DELIVERY = "delivery"
    INVOICED = "invoiced"
    PAID = "paid"


class SalesTicket(Base):
    """Sales Ticket model - Master tracking entity for sales pipeline."""
    __tablename__ = "sales_tickets"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    company_id = Column(String(36), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    
    # Ticket identification
    ticket_number = Column(String(50), nullable=False, unique=True, index=True)  # TKT-YYYYMM-XXXX
    
    # Customer and contact
    customer_id = Column(String(36), ForeignKey("customers.id", ondelete="SET NULL"))
    contact_id = Column(String(36), ForeignKey("contacts.id", ondelete="SET NULL"))
    
    # Sales person (from Employee model)
    sales_person_id = Column(String(36), ForeignKey("employees.id", ondelete="SET NULL"))
    
    # Status and stage
    status = Column(Enum(SalesTicketStatus), default=SalesTicketStatus.OPEN)
    current_stage = Column(Enum(SalesTicketStage), default=SalesTicketStage.ENQUIRY)
    
    # Values
    expected_value = Column(Numeric(14, 2), default=0)
    actual_value = Column(Numeric(14, 2), default=0)
    
    # Dates
    created_date = Column(DateTime, default=datetime.utcnow)
    expected_close_date = Column(DateTime)
    actual_close_date = Column(DateTime)
    
    # Win/Loss tracking
    win_probability = Column(Integer, default=50)  # 0-100%
    loss_reason = Column(Text)
    competitor_name = Column(String(255))
    
    # Notes
    notes = Column(Text)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    company = relationship("Company")
    customer = relationship("Customer")
    contact = relationship("Contact")
    sales_person = relationship("Employee")
    enquiries = relationship("Enquiry", back_populates="sales_ticket")
    logs = relationship("SalesTicketLog", back_populates="sales_ticket", cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_ticket_company", "company_id"),
        Index("idx_ticket_customer", "customer_id"),
        Index("idx_ticket_status", "status"),
        Index("idx_ticket_stage", "current_stage"),
        Index("idx_ticket_sales_person", "sales_person_id"),
    )

    def __repr__(self):
        return f"<SalesTicket {self.ticket_number}>"


class EnquiryItem(Base):
    """Individual items in an enquiry."""
    __tablename__ = "enquiry_items"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    enquiry_id = Column(String(36), ForeignKey("enquiries.id", ondelete="CASCADE"), nullable=False)
    product_id = Column(String(36), ForeignKey("items.id", ondelete="SET NULL"))
    
    description = Column(String(500), nullable=False)
    quantity = Column(Integer, default=1)
    
    # Image reference
    image_url = Column(String(500))
    
    notes = Column(Text)
    
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    enquiry = relationship("Enquiry", back_populates="items")
    product = relationship("Product")

    __table_args__ = (
        Index("idx_enquiry_item_enquiry", "enquiry_id"),
    )

    def __repr__(self):
        return f"<EnquiryItem {self.description[:30]}>"


class Enquiry(Base):
    """Enquiry model - Top of sales funnel."""
    __tablename__ = "enquiries"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    company_id = Column(String(36), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    
    # Enquiry identification
    enquiry_number = Column(String(50), nullable=False, index=True)  # ENQ-YYYYMM-XXXX
    enquiry_date = Column(DateTime, nullable=False, default=datetime.utcnow)
    
    # Link to sales ticket
    sales_ticket_id = Column(String(36), ForeignKey("sales_tickets.id", ondelete="SET NULL"))
    
    # Customer and contact
    customer_id = Column(String(36), ForeignKey("customers.id", ondelete="SET NULL"))
    contact_id = Column(String(36), ForeignKey("contacts.id", ondelete="SET NULL"))
    
    # For new customers (before creating customer record)
    prospect_name = Column(String(255))
    prospect_email = Column(String(255))
    prospect_phone = Column(String(20))
    prospect_company = Column(String(255))
    
    # Sales person
    sales_person_id = Column(String(36), ForeignKey("employees.id", ondelete="SET NULL"))
    
    # Source tracking
    source = Column(Enum(EnquirySource), default=EnquirySource.OTHER)
    source_details = Column(String(255))  # e.g., campaign name, referrer name
    
    # Enquiry details
    subject = Column(String(500), nullable=False)
    description = Column(Text)
    requirements = Column(Text)
    
    # Products of interest (JSON array of product IDs or descriptions)
    products_interested = Column(JSON)
    
    # Values
    expected_value = Column(Numeric(14, 2), default=0)
    expected_quantity = Column(Numeric(14, 3))
    
    # Dates
    expected_close_date = Column(DateTime)
    follow_up_date = Column(DateTime)
    last_contact_date = Column(DateTime)
    
    # Status
    status = Column(Enum(EnquiryStatus), default=EnquiryStatus.NEW)
    priority = Column(String(20), default="medium")  # low, medium, high, urgent
    
    # Conversion tracking
    converted_quotation_id = Column(String(36), ForeignKey("quotations.id", ondelete="SET NULL"))
    converted_at = Column(DateTime)
    
    # Loss tracking
    lost_reason = Column(Text)
    lost_to_competitor = Column(String(255))
    
    notes = Column(Text)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    company = relationship("Company")
    customer = relationship("Customer")
    contact = relationship("Contact")
    sales_person = relationship("Employee")
    sales_ticket = relationship("SalesTicket", back_populates="enquiries")
    converted_quotation = relationship("Quotation", foreign_keys=[converted_quotation_id])
    items = relationship("EnquiryItem", back_populates="enquiry", cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_enquiry_company", "company_id"),
        Index("idx_enquiry_customer", "customer_id"),
        Index("idx_enquiry_ticket", "sales_ticket_id"),
        Index("idx_enquiry_status", "status"),
        Index("idx_enquiry_date", "enquiry_date"),
    )

    def __repr__(self):
        return f"<Enquiry {self.enquiry_number}>"


class SalesTicketLogAction(str, PyEnum):
    """Sales ticket log action types."""
    CREATED = "created"
    STATUS_CHANGED = "status_changed"
    STAGE_CHANGED = "stage_changed"
    ENQUIRY_CREATED = "enquiry_created"
    QUOTATION_CREATED = "quotation_created"
    QUOTATION_SENT = "quotation_sent"
    QUOTATION_APPROVED = "quotation_approved"
    QUOTATION_REJECTED = "quotation_rejected"
    SALES_ORDER_CREATED = "sales_order_created"
    DELIVERY_CREATED = "delivery_created"
    DELIVERY_DISPATCHED = "delivery_dispatched"
    DELIVERY_COMPLETED = "delivery_completed"
    INVOICE_CREATED = "invoice_created"
    PAYMENT_RECEIVED = "payment_received"
    NOTE_ADDED = "note_added"
    CONTACT_CHANGED = "contact_changed"
    SALES_PERSON_CHANGED = "sales_person_changed"
    VALUE_UPDATED = "value_updated"
    FOLLOW_UP_SCHEDULED = "follow_up_scheduled"


class SalesTicketLog(Base):
    """Sales Ticket Log model - Activity timeline for sales tickets."""
    __tablename__ = "sales_ticket_logs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    sales_ticket_id = Column(String(36), ForeignKey("sales_tickets.id", ondelete="CASCADE"), nullable=False)
    
    # Action details
    action_type = Column(Enum(SalesTicketLogAction), nullable=False)
    action_description = Column(String(500), nullable=False)
    
    # Change tracking
    old_value = Column(String(255))
    new_value = Column(String(255))
    
    # Related document (for linking to specific documents)
    related_document_type = Column(String(50))  # enquiry, quotation, sales_order, delivery_challan, invoice
    related_document_id = Column(String(36))
    
    # Who made the change
    created_by = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"))
    created_by_name = Column(String(255))
    
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    sales_ticket = relationship("SalesTicket", back_populates="logs")
    user = relationship("User")

    __table_args__ = (
        Index("idx_ticket_log_ticket", "sales_ticket_id"),
        Index("idx_ticket_log_action", "action_type"),
        Index("idx_ticket_log_date", "created_at"),
    )

    def __repr__(self):
        return f"<SalesTicketLog {self.action_type.value}>"


# ==================== VISIT TRACKING MODULE ====================

class VisitStatus(str, PyEnum):
    """Visit status enumeration."""
    PLANNED = "planned"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

class Visit(Base):
    """Visit model - Track actual employee visits to customers."""
    __tablename__ = "visits"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    company_id = Column(String(36), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    employee_id = Column(String(36), ForeignKey("employees.id", ondelete="CASCADE"), nullable=False)
    customer_id = Column(String(36), ForeignKey("customers.id", ondelete="SET NULL"), nullable=True)
    
    # Visit details
    visit_date = Column(Date, nullable=False)
    start_time = Column(Time, nullable=True)
    end_time = Column(Time, nullable=True)
    
    # Location tracking
    location_lat = Column(Float, nullable=True)
    location_lng = Column(Float, nullable=True)
    location_address = Column(String(500), nullable=True)
    
    # Purpose and outcome
    purpose = Column(Text, nullable=True)
    discussion_points = Column(Text, nullable=True)
    outcome = Column(Text, nullable=True)
    
    # Status
    status = Column(Enum(VisitStatus), default=VisitStatus.PLANNED)
    
    # Expenses
    travel_distance_km = Column(Numeric(8, 2), default=0)
    travel_mode = Column(String(50), default="car")  # car, bike, public_transport, other
    parking_charges = Column(Numeric(10, 2), default=0)
    toll_charges = Column(Numeric(10, 2), default=0)
    other_expenses = Column(Numeric(10, 2), default=0)
    
    # Verification
    check_in_time = Column(DateTime, nullable=True)
    check_out_time = Column(DateTime, nullable=True)
    check_in_location_lat = Column(Float, nullable=True)
    check_in_location_lng = Column(Float, nullable=True)
    check_out_location_lat = Column(Float, nullable=True)
    check_out_location_lng = Column(Float, nullable=True)
    check_in_image_url = Column(String(500), nullable=True)
    check_out_image_url = Column(String(500), nullable=True)
    
    # Meeting photos
    meeting_photos = Column(JSON, nullable=True)  # List of photo URLs
    
    # Follow-up
    next_action = Column(Text, nullable=True)
    next_followup_date = Column(Date, nullable=True)
    
    # Reference to related entities - Use string references
    sales_ticket_id = Column(String(36), ForeignKey("sales_tickets.id", ondelete="SET NULL"), nullable=True)
    enquiry_id = Column(String(36), ForeignKey("enquiries.id", ondelete="SET NULL"), nullable=True)
    quotation_id = Column(String(36), ForeignKey("quotations.id", ondelete="SET NULL"), nullable=True)
    
    notes = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships with string references for forward declarations
    company = relationship("Company")
    employee = relationship("Employee", foreign_keys=[employee_id])
    customer = relationship("Customer")
    sales_ticket = relationship("SalesTicket")
    enquiry = relationship("Enquiry")
    quotation = relationship("Quotation")
    expense_claims = relationship("VisitExpenseClaim", back_populates="visit", cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_visit_company", "company_id"),
        Index("idx_visit_employee", "employee_id"),
        Index("idx_visit_customer", "customer_id"),
        Index("idx_visit_date", "visit_date"),
        Index("idx_visit_status", "status"),
    )

    def __repr__(self):
        return f"<Visit {self.id} - {self.visit_date}>"

class VisitExpenseClaim(Base):
    """Visit Expense Claim model - Detailed expenses for a visit."""
    __tablename__ = "visit_expense_claims"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    visit_id = Column(String(36), ForeignKey("visits.id", ondelete="CASCADE"), nullable=False)
    
    expense_date = Column(Date, nullable=False)
    category = Column(String(100), nullable=False)  # fuel, food, parking, toll, accommodation, other
    description = Column(Text, nullable=True)
    amount = Column(Numeric(10, 2), nullable=False)
    
    # Receipt
    receipt_url = Column(String(500), nullable=True)
    receipt_number = Column(String(100), nullable=True)
    
    # Verification
    is_verified = Column(Boolean, default=False)
    verified_by = Column(String(36), ForeignKey("employees.id", ondelete="SET NULL"), nullable=True)
    verified_at = Column(DateTime, nullable=True)
    
    # Reimbursement
    reimbursement_status = Column(String(50), default="pending")  # pending, approved, reimbursed
    reimbursement_date = Column(Date, nullable=True)
    reimbursement_reference = Column(String(100), nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    visit = relationship("Visit", back_populates="expense_claims")
    verifier = relationship("Employee", foreign_keys=[verified_by])

    __table_args__ = (
        Index("idx_visit_expense_visit", "visit_id"),
        Index("idx_visit_expense_date", "expense_date"),
        Index("idx_visit_expense_status", "reimbursement_status"),
    )

    def __repr__(self):
        return f"<VisitExpenseClaim {self.id} - {self.amount}>"
        
class ProjectStatus(str, PyEnum):
    """Project status enumeration."""
    PLANNING = "planning"
    IN_PROGRESS = "in_progress"
    ON_HOLD = "on_hold"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class TaskPriority(str, PyEnum):
    """Task priority enumeration."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"


class TaskStatus(str, PyEnum):
    """Task status enumeration."""
    TODO = "todo"
    IN_PROGRESS = "in_progress"
    REVIEW = "review"
    DONE = "done"


class Project(Base):
    """Project model - Track projects with milestones and tasks."""
    __tablename__ = "projects"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    company_id = Column(String(36), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    customer_id = Column(String(36), ForeignKey("customers.id", ondelete="SET NULL"), nullable=True)
    
    project_code = Column(String(50), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    
    start_date = Column(Date, nullable=True)
    target_end_date = Column(Date, nullable=True)
    actual_end_date = Column(Date, nullable=True)
    
    status = Column(Enum(ProjectStatus), default=ProjectStatus.PLANNING)
    
    # Budget
    budget = Column(Numeric(14, 2), default=0)
    actual_cost = Column(Numeric(14, 2), default=0)
    
    # Project manager
    manager_id = Column(String(36), ForeignKey("employees.id", ondelete="SET NULL"), nullable=True)
    
    # Progress (0-100)
    progress_percent = Column(Integer, default=0)
    
    notes = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    company = relationship("Company")
    customer = relationship("Customer")
    manager = relationship("Employee")
    milestones = relationship("ProjectMilestone", back_populates="project", cascade="all, delete-orphan")
    tasks = relationship("ProjectTask", back_populates="project", cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_project_company", "company_id"),
        Index("idx_project_customer", "customer_id"),
        Index("idx_project_status", "status"),
    )

    def __repr__(self):
        return f"<Project {self.project_code}>"


class ProjectMilestone(Base):
    """Project Milestone model - Key milestones in a project."""
    __tablename__ = "project_milestones"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    
    target_date = Column(Date, nullable=True)
    completion_date = Column(Date, nullable=True)
    
    is_completed = Column(Boolean, default=False)
    
    # Order for sorting
    sort_order = Column(Integer, default=0)
    
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    project = relationship("Project", back_populates="milestones")
    tasks = relationship("ProjectTask", back_populates="milestone")

    __table_args__ = (
        Index("idx_milestone_project", "project_id"),
    )

    def __repr__(self):
        return f"<ProjectMilestone {self.name}>"


class IssueSeverity(str, PyEnum):
    """Issue severity enumeration."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class IssueStatus(str, PyEnum):
    """Issue status enumeration."""
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"
    CLOSED = "closed"
    REOPENED = "reopened"


class IssueCategory(str, PyEnum):
    """Issue category enumeration."""
    BUG = "bug"
    FEATURE_REQUEST = "feature_request"
    SUPPORT = "support"
    COMPLAINT = "complaint"
    OTHER = "other"


class Issue(Base):
    """Issue model - Track issues, bugs, complaints, and support requests."""
    __tablename__ = "issues"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    company_id = Column(String(36), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    
    issue_number = Column(String(50), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    
    category = Column(Enum(IssueCategory), default=IssueCategory.SUPPORT)
    severity = Column(Enum(IssueSeverity), default=IssueSeverity.MEDIUM)
    status = Column(Enum(IssueStatus), default=IssueStatus.OPEN)
    
    # Reporter
    reported_by_id = Column(String(36), ForeignKey("employees.id", ondelete="SET NULL"), nullable=True)
    reported_by_customer_id = Column(String(36), ForeignKey("customers.id", ondelete="SET NULL"), nullable=True)
    reported_at = Column(DateTime, default=datetime.utcnow)
    
    # Assignment
    assigned_to_id = Column(String(36), ForeignKey("employees.id", ondelete="SET NULL"), nullable=True)
    assigned_at = Column(DateTime, nullable=True)
    
    # Resolution
    resolved_by_id = Column(String(36), ForeignKey("employees.id", ondelete="SET NULL"), nullable=True)
    resolved_at = Column(DateTime, nullable=True)
    resolution_notes = Column(Text, nullable=True)
    
    # Related entities
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="SET NULL"), nullable=True)
    product_id = Column(String(36), ForeignKey("items.id", ondelete="SET NULL"), nullable=True)
    
    # Attachments (JSON list of URLs)
    attachments = Column(JSON, nullable=True)
    
    # Tags (JSON list)
    tags = Column(JSON, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    company = relationship("Company")
    reported_by = relationship("Employee", foreign_keys=[reported_by_id])
    reported_by_customer = relationship("Customer")
    assigned_to = relationship("Employee", foreign_keys=[assigned_to_id])
    resolved_by = relationship("Employee", foreign_keys=[resolved_by_id])
    project = relationship("Project")
    product = relationship("Product")
    comments = relationship("IssueComment", back_populates="issue", cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_issue_company", "company_id"),
        Index("idx_issue_status", "status"),
        Index("idx_issue_severity", "severity"),
        Index("idx_issue_assigned", "assigned_to_id"),
    )

    def __repr__(self):
        return f"<Issue {self.issue_number}>"


class IssueComment(Base):
    """Issue Comment model - Comments and updates on issues."""
    __tablename__ = "issue_comments"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    issue_id = Column(String(36), ForeignKey("issues.id", ondelete="CASCADE"), nullable=False)
    
    content = Column(Text, nullable=False)
    author_id = Column(String(36), ForeignKey("employees.id", ondelete="SET NULL"), nullable=True)
    
    # Activity type (comment, status_change, assignment)
    activity_type = Column(String(50), default="comment")
    
    # Attachments
    attachments = Column(JSON, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    issue = relationship("Issue", back_populates="comments")
    author = relationship("Employee")

    __table_args__ = (
        Index("idx_issue_comment_issue", "issue_id"),
    )

    def __repr__(self):
        return f"<IssueComment {self.id}>"


class ProjectTask(Base):
    """Project Task model - Individual tasks in a project."""
    __tablename__ = "project_tasks"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    milestone_id = Column(String(36), ForeignKey("project_milestones.id", ondelete="SET NULL"), nullable=True)
    
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    
    assigned_to = Column(String(36), ForeignKey("employees.id", ondelete="SET NULL"), nullable=True)
    
    priority = Column(Enum(TaskPriority), default=TaskPriority.MEDIUM)
    status = Column(Enum(TaskStatus), default=TaskStatus.TODO)
    
    start_date = Column(Date, nullable=True)
    due_date = Column(Date, nullable=True)
    completion_date = Column(Date, nullable=True)
    
    # Time tracking
    estimated_hours = Column(Numeric(6, 2), default=0)
    actual_hours = Column(Numeric(6, 2), default=0)
    
    # Order for sorting
    sort_order = Column(Integer, default=0)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    project = relationship("Project", back_populates="tasks")
    milestone = relationship("ProjectMilestone", back_populates="tasks")
    assignee = relationship("Employee")

    __table_args__ = (
        Index("idx_task_project", "project_id"),
        Index("idx_task_milestone", "milestone_id"),
        Index("idx_task_assigned", "assigned_to"),
        Index("idx_task_status", "status"),
    )

    def __repr__(self):
        return f"<ProjectTask {self.title}>"


class ExpenseCategory(str, PyEnum):
    """Expense category enumeration."""
    TRAVEL = "travel"
    FOOD = "food"
    ACCOMMODATION = "accommodation"
    COMMUNICATION = "communication"
    FUEL = "fuel"
    STATIONARY = "stationary"
    OTHER = "other"


class ExpenseStatus(str, PyEnum):
    """Expense status enumeration."""
    DRAFT = "draft"
    SUBMITTED = "submitted"
    APPROVED = "approved"
    REJECTED = "rejected"
    REIMBURSED = "reimbursed"


class AdvanceRequestStatus(str, PyEnum):
    """Advance request status enumeration."""
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    DISBURSED = "disbursed"
    SETTLED = "settled"


class EmployeeExpense(Base):
    """Employee Expense model - Track employee expenses for reimbursement."""
    __tablename__ = "employee_expenses"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    company_id = Column(String(36), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    employee_id = Column(String(36), ForeignKey("employees.id", ondelete="CASCADE"), nullable=False)
    
    expense_date = Column(Date, nullable=False)
    category = Column(Enum(ExpenseCategory), nullable=False)
    description = Column(Text, nullable=True)
    amount = Column(Numeric(14, 2), nullable=False)
    
    # Attachments
    receipt_url = Column(String(500), nullable=True)
    
    # Approval workflow
    status = Column(Enum(ExpenseStatus), default=ExpenseStatus.DRAFT)
    submitted_at = Column(DateTime, nullable=True)
    approved_by = Column(String(36), ForeignKey("employees.id", ondelete="SET NULL"), nullable=True)
    approved_at = Column(DateTime, nullable=True)
    rejection_reason = Column(Text, nullable=True)
    
    # Reimbursement
    reimbursed_at = Column(DateTime, nullable=True)
    reimbursement_reference = Column(String(100), nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    company = relationship("Company")
    employee = relationship("Employee", foreign_keys=[employee_id])
    approver = relationship("Employee", foreign_keys=[approved_by])

    __table_args__ = (
        Index("idx_expense_company", "company_id"),
        Index("idx_expense_employee", "employee_id"),
        Index("idx_expense_date", "expense_date"),
        Index("idx_expense_status", "status"),
    )

    def __repr__(self):
        return f"<EmployeeExpense {self.id} - {self.amount}>"


class AdvanceRequest(Base):
    """Advance Request model - Employee salary/expense advances."""
    __tablename__ = "advance_requests"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    company_id = Column(String(36), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    employee_id = Column(String(36), ForeignKey("employees.id", ondelete="CASCADE"), nullable=False)
    
    request_date = Column(Date, nullable=False)
    amount = Column(Numeric(14, 2), nullable=False)
    reason = Column(Text, nullable=True)
    
    # Approval workflow
    status = Column(Enum(AdvanceRequestStatus), default=AdvanceRequestStatus.PENDING)
    approved_by = Column(String(36), ForeignKey("employees.id", ondelete="SET NULL"), nullable=True)
    approved_at = Column(DateTime, nullable=True)
    rejection_reason = Column(Text, nullable=True)
    
    # Disbursement
    disbursed_at = Column(DateTime, nullable=True)
    disbursement_reference = Column(String(100), nullable=True)
    
    # Settlement (deduction from salary)
    settlement_mode = Column(String(50), default="salary_deduction")  # salary_deduction, cash, bank
    monthly_deduction = Column(Numeric(14, 2), nullable=True)  # If settled via salary
    settled_amount = Column(Numeric(14, 2), default=0)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    company = relationship("Company")
    employee = relationship("Employee", foreign_keys=[employee_id])
    approver = relationship("Employee", foreign_keys=[approved_by])

    __table_args__ = (
        Index("idx_advance_company", "company_id"),
        Index("idx_advance_employee", "employee_id"),
        Index("idx_advance_status", "status"),
    )

    def __repr__(self):
        return f"<AdvanceRequest {self.id} - {self.amount}>"


class AppointmentLetter(Base):
    """Appointment Letter model - Employee appointment letters."""
    __tablename__ = "appointment_letters"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    company_id = Column(String(36), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    employee_id = Column(String(36), ForeignKey("employees.id", ondelete="CASCADE"), nullable=False)
    
    letter_number = Column(String(50), nullable=False)
    issue_date = Column(Date, nullable=False)
    
    # Letter content
    designation = Column(String(200), nullable=False)
    department = Column(String(200), nullable=True)
    joining_date = Column(Date, nullable=False)
    probation_period_months = Column(Integer, default=6)
    basic_salary = Column(Numeric(14, 2), nullable=False)
    total_ctc = Column(Numeric(14, 2), nullable=True)
    
    # Additional terms
    notice_period_days = Column(Integer, default=30)
    work_location = Column(String(200), nullable=True)
    reporting_to = Column(String(200), nullable=True)
    additional_terms = Column(Text, nullable=True)
    
    # PDF storage
    pdf_url = Column(String(500), nullable=True)
    
    # Acknowledgement
    acknowledged_at = Column(DateTime, nullable=True)
    signature_url = Column(String(500), nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    company = relationship("Company")
    employee = relationship("Employee")

    __table_args__ = (
        Index("idx_appt_company", "company_id"),
        Index("idx_appt_employee", "employee_id"),
    )

    def __repr__(self):
        return f"<AppointmentLetter {self.letter_number}>"


class SalesTarget(Base):
    """Sales Target model - Monthly/yearly targets for sales staff."""
    __tablename__ = "sales_targets"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    company_id = Column(String(36), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    employee_id = Column(String(36), ForeignKey("employees.id", ondelete="CASCADE"), nullable=False)
    
    # Target period
    target_year = Column(Integer, nullable=False)
    target_month = Column(Integer, nullable=True)  # Null for yearly targets
    
    # Target values
    target_amount = Column(Numeric(14, 2), nullable=False)  # Sales value target
    target_enquiries = Column(Integer, default=0)  # Number of enquiries target
    target_quotations = Column(Integer, default=0)  # Number of quotations target
    target_conversions = Column(Integer, default=0)  # Number of conversions target
    target_visits = Column(Integer, default=0)  # Number of visits target
    
    # Achieved values (updated periodically)
    achieved_amount = Column(Numeric(14, 2), default=0)
    achieved_enquiries = Column(Integer, default=0)
    achieved_quotations = Column(Integer, default=0)
    achieved_conversions = Column(Integer, default=0)
    achieved_visits = Column(Integer, default=0)
    
    notes = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    company = relationship("Company")
    employee = relationship("Employee")

    __table_args__ = (
        Index("idx_sales_target_company", "company_id"),
        Index("idx_sales_target_employee", "employee_id"),
        Index("idx_sales_target_period", "target_year", "target_month"),
    )

    def __repr__(self):
        return f"<SalesTarget {self.employee_id} {self.target_year}/{self.target_month}>"

# Indian State codes for GST
INDIAN_STATE_CODES = {
    "01": "Jammu & Kashmir",
    "02": "Himachal Pradesh",
    "03": "Punjab",
    "04": "Chandigarh",
    "05": "Uttarakhand",
    "06": "Haryana",
    "07": "Delhi",
    "08": "Rajasthan",
    "09": "Uttar Pradesh",
    "10": "Bihar",
    "11": "Sikkim",
    "12": "Arunachal Pradesh",
    "13": "Nagaland",
    "14": "Manipur",
    "15": "Mizoram",
    "16": "Tripura",
    "17": "Meghalaya",
    "18": "Assam",
    "19": "West Bengal",
    "20": "Jharkhand",
    "21": "Odisha",
    "22": "Chattisgarh",
    "23": "Madhya Pradesh",
    "24": "Gujarat",
    "26": "Dadra & Nagar Haveli and Daman & Diu",
    "27": "Maharashtra",
    "28": "Andhra Pradesh (Old)",
    "29": "Karnataka",
    "30": "Goa",
    "31": "Lakshadweep",
    "32": "Kerala",
    "33": "Tamil Nadu",
    "34": "Puducherry",
    "35": "Andaman & Nicobar Islands",
    "36": "Telangana",
    "37": "Andhra Pradesh",
    "38": "Ladakh",
    "97": "Other Territory",
    "99": "Centre Jurisdiction",
}


