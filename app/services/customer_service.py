"""Customer service for business logic."""
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional, Tuple, Dict, Any
from datetime import datetime
from decimal import Decimal
from app.database.models import (
    Customer,
    Company,
    OpeningBalanceItem,
    ContactPerson,
    CustomerTypeMaster,
)
from app.services.geocoding_service import GeocodingService
from app.schemas.customer import (
    CustomerCreate,
    CustomerUpdate,
    CustomerTypeCreate,
    OpeningBalanceType,
    OpeningBalanceMode,
)


class CustomerService:
    """Service for customer operations."""
    
    def __init__(self, db: Session):
        self.db = db
        self.geocoder = GeocodingService()

    def _build_address(self, data: Any) -> str:
        """Build a single-line address from customer data."""
        parts = []
        # Prefer explicit billing_address (often full address)
        if getattr(data, "billing_address", None):
            parts.append(str(getattr(data, "billing_address")).strip())
        # Fall back to billing_address_line1/line2 if present
        for field in ("billing_address_line1", "billing_address_line2"):
            value = getattr(data, field, None)
            if value:
                parts.append(str(value).strip())
        for field in ("billing_city", "billing_state", "billing_zip", "billing_country"):
            value = getattr(data, field, None)
            if value:
                parts.append(str(value).strip())
        return ", ".join([p for p in parts if p])

    def _try_geocode(self, customer: Customer, data: Any) -> None:
        """Fill location_lat/lng/address if missing using Nominatim."""
        if customer.location_lat is not None and customer.location_lng is not None:
            return

        # Prefer billing address for geocoding, fallback to location_address if billing is empty
        address = self._build_address(data) or getattr(data, "location_address", None)
        if not address:
            return

        result = self.geocoder.geocode(address, country_codes="in")
        if not result:
            return

        lat, lng, display_name = result
        customer.location_lat = lat
        customer.location_lng = lng
        # Store resolved address for later reuse
        customer.location_address = display_name or address
    
    def create_customer(self, company: Company, data: CustomerCreate) -> Customer:
        """Create a new customer for a company with all fields."""
        # Generate customer code
        customer_code = self._generate_customer_code(company)
        
        # Convert string values to appropriate types
        opening_balance = Decimal(data.opening_balance) if data.opening_balance else Decimal('0')
        credit_limit = Decimal(data.credit_limit) if data.credit_limit else Decimal('0')
        credit_days = int(data.credit_days) if data.credit_days else 0
        
        
        # Calculate outstanding and advance balances
        outstanding_balance = Decimal('0')
        advance_balance = Decimal('0')
        
        if opening_balance and data.opening_balance_type:
            if data.opening_balance_type == OpeningBalanceType.OUTSTANDING:
                outstanding_balance = opening_balance
            else:
                advance_balance = opening_balance
        
        # Create customer with all fields
        customer = Customer(
            company_id=company.id,
            customer_code=customer_code,
            
            # Basic Information
            name=data.name,
            contact=data.contact,
            email=data.email,
            mobile=data.mobile,
            
            # Tax Information
            tax_number=data.tax_number,
            gst_registration_type=data.gst_registration_type,
            pan_number=data.pan_number,
            vendor_code=data.vendor_code,
            
            # Financial Information
            opening_balance=opening_balance,
            opening_balance_type=data.opening_balance_type.value if data.opening_balance_type else None,
            opening_balance_mode=data.opening_balance_mode.value if data.opening_balance_mode else None,
            credit_limit=credit_limit,
            credit_days=credit_days,
            
            # Address Information
            billing_address=data.billing_address,
            billing_city=data.billing_city,
            billing_state=data.billing_state,
            billing_country=data.billing_country,
            billing_zip=data.billing_zip,
            district=data.district,
            area=data.area,
            location_lat=data.location_lat,
            location_lng=data.location_lng,
            location_address=data.location_address,
            
            shipping_address=data.shipping_address,
            shipping_city=data.shipping_city,
            shipping_state=data.shipping_state,
            shipping_country=data.shipping_country,
            shipping_zip=data.shipping_zip,
            
            # Calculated balances
            outstanding_balance=outstanding_balance,
            advance_balance=advance_balance,
            
            # Additional Information
            customer_type=(data.customer_type.strip() if data.customer_type else "b2b"),
            
            # System defaults
            is_active=True,
            total_transactions=0
        )
        
        # Auto geocode if lat/lng missing
        self._try_geocode(customer, data)

        self.db.add(customer)
        self.db.flush()  # Flush to get customer ID
        
        # Create opening balance split items if in split mode
        if (data.opening_balance_mode == OpeningBalanceMode.SPLIT and 
            data.opening_balance_split):
            
            total_split_amount = Decimal('0')
            for item_data in data.opening_balance_split:
                item = OpeningBalanceItem(
                    customer_id=customer.id,
                    date=item_data.date,
                    
                    voucher_name=item_data.voucher_name,
                    days=int(item_data.days) if item_data.days else None,
                    amount=Decimal(item_data.amount)
                )
                self.db.add(item)
                total_split_amount += Decimal(item_data.amount)
            
            # Update customer opening balance from split items
            customer.opening_balance = total_split_amount
            
            # Recalculate outstanding/advance based on total split amount
            if data.opening_balance_type == OpeningBalanceType.OUTSTANDING:
                customer.outstanding_balance = total_split_amount
            else:
                customer.advance_balance = total_split_amount
        
        # Create contact persons
        if data.contact_persons:
            for contact_data in data.contact_persons:
                # Only create if at least name is provided
                if contact_data.name.strip():
                    contact_person = ContactPerson(
                        customer_id=customer.id,
                        name=contact_data.name,
                        email=contact_data.email,
                        phone=contact_data.phone
                    )
                    self.db.add(contact_person)
        
        self.db.commit()
        self.db.refresh(customer)
        return customer

    def list_customer_types(self, company: Company) -> List[CustomerTypeMaster]:
        """List active customer types for a company."""
        return (
            self.db.query(CustomerTypeMaster)
            .filter(
                CustomerTypeMaster.company_id == company.id,
                CustomerTypeMaster.is_active == True,
            )
            .order_by(CustomerTypeMaster.name.asc())
            .all()
        )

    def create_customer_type(self, company: Company, data: CustomerTypeCreate) -> CustomerTypeMaster:
        """Create a customer type in company scope."""
        cleaned_name = data.name.strip()
        existing = (
            self.db.query(CustomerTypeMaster)
            .filter(
                CustomerTypeMaster.company_id == company.id,
                func.lower(CustomerTypeMaster.name) == func.lower(cleaned_name),
                CustomerTypeMaster.is_active == True,
            )
            .first()
        )
        if existing:
            raise ValueError("Customer type already exists")

        customer_type = CustomerTypeMaster(
            company_id=company.id,
            name=cleaned_name,
            is_active=True,
        )
        self.db.add(customer_type)
        self.db.commit()
        self.db.refresh(customer_type)
        return customer_type

    def delete_customer_type(self, company: Company, customer_type_id: str) -> bool:
        """Soft delete a customer type if not used by active customers."""
        record = (
            self.db.query(CustomerTypeMaster)
            .filter(
                CustomerTypeMaster.id == customer_type_id,
                CustomerTypeMaster.company_id == company.id,
                CustomerTypeMaster.is_active == True,
            )
            .first()
        )
        if not record:
            raise ValueError("Customer type not found")

        in_use = (
            self.db.query(Customer.id)
            .filter(
                Customer.company_id == company.id,
                Customer.is_active == True,
                func.lower(Customer.customer_type) == func.lower(record.name),
            )
            .first()
            is not None
        )
        if in_use:
            raise ValueError("This customer type is used by existing customers")

        record.is_active = False
        record.updated_at = datetime.utcnow()
        self.db.commit()
        return True
    
    def get_customer(self, customer_id: str, company: Company) -> Optional[Customer]:
        """Get a customer by ID (must belong to company)."""
        return self.db.query(Customer).filter(
            Customer.id == customer_id,
            Customer.company_id == company.id,
            Customer.is_active == True
        ).first()
    
    def get_customers(
        self,
        company: Company,
        page: int = 1,
        page_size: int = 20,
        search: Optional[str] = None,
        customer_type: Optional[str] = None
    ) -> Tuple[List[Customer], int]:
        """Get all customers for a company with pagination."""
        query = self.db.query(Customer).filter(
            Customer.company_id == company.id,
            Customer.is_active == True
        )
        
        # Search filter
        if search:
            search_filter = f"%{search}%"
            query = query.filter(
                (Customer.name.ilike(search_filter)) |
                (Customer.email.ilike(search_filter)) |
                (Customer.contact.ilike(search_filter)) |
                (Customer.mobile.ilike(search_filter)) |
                (Customer.tax_number.ilike(search_filter)) |
                (Customer.pan_number.ilike(search_filter)) |
                (Customer.vendor_code.ilike(search_filter)) |
                (Customer.customer_code.ilike(search_filter))
            )
        
        # Customer type filter
        if customer_type:
            query = query.filter(Customer.customer_type == customer_type)
        
        # Get total count
        total = query.count()
        
        # Pagination
        offset = (page - 1) * page_size
        customers = query.order_by(Customer.name).offset(offset).limit(page_size).all()
        
        return customers, total
    
    def update_customer(self, customer: Customer, data: CustomerUpdate) -> Customer:
        """Update a customer with all fields."""
        update_data = data.model_dump(exclude_unset=True)
        
        # Handle financial field conversions
        if 'opening_balance' in update_data and update_data['opening_balance']:
            update_data['opening_balance'] = Decimal(update_data['opening_balance'])
            
            # Recalculate outstanding/advance
            opening_balance_type = update_data.get('opening_balance_type', 
                                                 customer.opening_balance_type)
            if opening_balance_type == OpeningBalanceType.OUTSTANDING.value:
                update_data['outstanding_balance'] = update_data['opening_balance']
                update_data['advance_balance'] = Decimal('0')
            else:
                update_data['advance_balance'] = update_data['opening_balance']
                update_data['outstanding_balance'] = Decimal('0')
        
        if 'credit_limit' in update_data and update_data['credit_limit']:
            update_data['credit_limit'] = Decimal(update_data['credit_limit'])
        
        if 'credit_days' in update_data and update_data['credit_days']:
            update_data['credit_days'] = int(update_data['credit_days'])
        
        # Update opening balance split items if mode changed to split
        if (update_data.get('opening_balance_mode') == OpeningBalanceMode.SPLIT.value and
            'opening_balance_split' in update_data and update_data['opening_balance_split']):
            
            # Delete existing split items
            self.db.query(OpeningBalanceItem).filter(
                OpeningBalanceItem.customer_id == customer.id
            ).delete()
            
            # Add new split items
            total_split_amount = Decimal('0')
            for item_data in update_data['opening_balance_split']:
                item = OpeningBalanceItem(
                    customer_id=customer.id,
                    date=item_data['date'],
                    voucher_name=item_data['voucher_name'],
                    days=int(item_data['days']) if item_data.get('days') else None,
                    amount=Decimal(item_data['amount'])
                )
                self.db.add(item)
                total_split_amount += Decimal(item_data['amount'])
            
            # Update opening balance from split items
            update_data['opening_balance'] = total_split_amount
            
            # Recalculate outstanding/advance
            opening_balance_type = update_data.get('opening_balance_type', 
                                                 customer.opening_balance_type)
            if opening_balance_type == OpeningBalanceType.OUTSTANDING.value:
                update_data['outstanding_balance'] = total_split_amount
                update_data['advance_balance'] = Decimal('0')
            else:
                update_data['advance_balance'] = total_split_amount
                update_data['outstanding_balance'] = Decimal('0')
        
        # Update contact persons if provided
        if 'contact_persons' in update_data:
            # Delete existing contact persons
            self.db.query(ContactPerson).filter(
                ContactPerson.customer_id == customer.id
            ).delete()
            
            # Add new contact persons
            for contact_data in update_data['contact_persons']:
                if contact_data['name'].strip():
                    contact_person = ContactPerson(
                        customer_id=customer.id,
                        name=contact_data['name'],
                        email=contact_data.get('email'),
                        phone=contact_data.get('phone')
                    )
                    self.db.add(contact_person)
            
            # Remove from update_data as we've handled it separately
            del update_data['contact_persons']
        
        # Update basic fields
        for field, value in update_data.items():
            if hasattr(customer, field) and value is not None:
                setattr(customer, field, value)

        # If billing address fields changed and no explicit lat/lng provided, re-geocode from billing
        billing_fields = {
            "billing_address",
            "billing_address_line1",
            "billing_address_line2",
            "billing_city",
            "billing_state",
            "billing_zip",
            "billing_country",
        }
        if billing_fields.intersection(update_data.keys()) and (
            "location_lat" not in update_data and "location_lng" not in update_data
        ):
            customer.location_lat = None
            customer.location_lng = None
            customer.location_address = None

        # Geocode if missing
        self._try_geocode(customer, data)
        
        customer.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(customer)
        return customer
    
    def delete_customer(self, customer: Customer) -> bool:
        """Soft delete a customer."""
        customer.is_active = False
        customer.updated_at = datetime.utcnow()
        self.db.commit()
        return True
    
    def search_customers(self, company: Company, query_str: str, limit: int = 10) -> List[Customer]:
        """Quick search for customers (for autocomplete)."""
        search_filter = f"%{query_str}%"
        return self.db.query(Customer).filter(
            Customer.company_id == company.id,
            Customer.is_active == True,
            (Customer.name.ilike(search_filter)) |
            (Customer.contact.ilike(search_filter)) |
            (Customer.email.ilike(search_filter)) |
            (Customer.tax_number.ilike(search_filter)) |
            (Customer.vendor_code.ilike(search_filter))
        ).limit(limit).all()
    
    def get_customer_count(self, company: Company) -> int:
        """Get total number of active customers."""
        return self.db.query(func.count(Customer.id)).filter(
            Customer.company_id == company.id,
            Customer.is_active == True
        ).scalar()
    
    def get_total_outstanding(self, company: Company) -> Decimal:
        """Get total outstanding balance for all customers."""
        result = self.db.query(func.sum(Customer.outstanding_balance)).filter(
            Customer.company_id == company.id,
            Customer.is_active == True
        ).scalar()
        return Decimal(result) if result else Decimal('0')
    
    def get_total_advance(self, company: Company) -> Decimal:
        """Get total advance balance for all customers."""
        result = self.db.query(func.sum(Customer.advance_balance)).filter(
            Customer.company_id == company.id,
            Customer.is_active == True
        ).scalar()
        return Decimal(result) if result else Decimal('0')
    
    def get_recent_customers(self, company: Company, limit: int = 5) -> List[Customer]:
        """Get recent customers."""
        return self.db.query(Customer).filter(
            Customer.company_id == company.id,
            Customer.is_active == True
        ).order_by(Customer.created_at.desc()).limit(limit).all()
    
    def get_customers_by_state(self, company: Company) -> Dict[str, int]:
        """Get customers grouped by state."""
        result = self.db.query(
            Customer.billing_state,
            func.count(Customer.id).label('count')
        ).filter(
            Customer.company_id == company.id,
            Customer.is_active == True,
            Customer.billing_state.isnot(None)
        ).group_by(Customer.billing_state).all()
        
        return {state: count for state, count in result}
    
    def get_top_customers(self, company: Company, limit: int = 10, period: str = "all") -> List[Dict[str, Any]]:
        """Get top customers by outstanding balance."""
        customers = self.db.query(Customer).filter(
            Customer.company_id == company.id,
            Customer.is_active == True,
            Customer.outstanding_balance > 0
        ).order_by(Customer.outstanding_balance.desc()).limit(limit).all()
        
        return [
            {
                "id": str(customer.id),
                "name": customer.name,
                "outstanding_balance": float(customer.outstanding_balance),
                "contact": customer.contact
            }
            for customer in customers
        ]
    
    def _generate_customer_code(self, company: Company) -> str:
        """Generate a unique customer code."""
        # Get the count of customers for this company
        count = self.db.query(func.count(Customer.id)).filter(
            Customer.company_id == company.id
        ).scalar()
        
        # Format: CUST-001, CUST-002, etc.
        return f"CUST-{count + 1:03d}"
