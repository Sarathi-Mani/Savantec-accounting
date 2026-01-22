"""Quotation API endpoints."""
from fastapi import APIRouter, Depends, HTTPException, status, Query, Form, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import text 
from sqlalchemy import or_, literal
from typing import Optional, List
from datetime import datetime, date
from decimal import Decimal
from pydantic import BaseModel
import json
import os
from pathlib import Path

from app.database.connection import get_db
from app.database.models import User, Company, Customer, QuotationStatus, ContactPerson,Quotation
from app.auth.dependencies import get_current_active_user
from app.services.quotation_service import QuotationService
import traceback

# Import payroll models
try:
    from app.database.payroll_models import Employee, Designation, Department
except ImportError:
    # Try alternate import path if needed
    try:
        from app.database.payroll_models import Employee, Designation, Department
    except ImportError:
        # Fallback if payroll models are in a different location
        pass

router = APIRouter(tags=["Quotations"])


def get_company_or_404(company_id: str, user: User, db: Session) -> Company:
    """Get company or raise 404."""
    company = db.query(Company).filter(
        Company.id == company_id,
        Company.user_id == user.id
    ).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    return company


# ==================== SCHEMAS ====================



class SubItemCreate(BaseModel):  # Add this new schema
    description: str
    quantity: float = 1
    image_url: Optional[str] = None
    
    class Config:
        from_attributes = True

class QuotationItemCreate(BaseModel):
    product_id: Optional[str] = None
    description: str
    hsn_code: Optional[str] = None
    quantity: float
    unit: Optional[str] = "unit"
    unit_price: float
    discount_percent: float = 0
    gst_rate: float = 18
    sub_items: Optional[List[SubItemCreate]] = None 


# ==================== CONTACT PERSON SCHEMAS ====================

class ContactPersonResponse(BaseModel):
    id: str
    customer_id: str
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    designation: Optional[str] = None
    is_primary: bool = False
    
    class Config:
        from_attributes = True


# ==================== SALES ENGINEER SCHEMAS ====================

class SalesEngineerResponse(BaseModel):
    id: str
    employee_code: str
    full_name: str
    designation_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    department_name: Optional[str] = None
    
    class Config:
        from_attributes = True


class QuotationCreateRequest(BaseModel):
    customer_id: Optional[str] = None
    quotation_date: Optional[datetime] = None
    validity_days: int = 30
    place_of_supply: Optional[str] = None
    subject: Optional[str] = None
    notes: Optional[str] = None
    terms: Optional[str] = None
    remarks: Optional[str] = None
    contact_person: Optional[str] = None
    sales_person_id: Optional[str] = None
    reference: Optional[str] = None
    reference_no: Optional[str] = None
    reference_date: Optional[datetime] = None
    payment_terms: Optional[str] = None
    excel_notes: Optional[str] = None
    items: List[QuotationItemCreate]



class QuotationUpdateRequest(BaseModel):
    validity_days: Optional[int] = None
    subject: Optional[str] = None
    notes: Optional[str] = None
    terms: Optional[str] = None
    remarks: Optional[str] = None
    contact_person: Optional[str] = None
    sales_person_id: Optional[str] = None
    reference: Optional[str] = None
    reference_no: Optional[str] = None
    reference_date: Optional[datetime] = None
    payment_terms: Optional[str] = None
    excel_notes: Optional[str] = None
    items: Optional[List[QuotationItemCreate]] = None

class SubItemResponse(BaseModel):  # Add this schema
    id: str
    quotation_item_id: str
    description: str
    quantity: float
    image_url: Optional[str] = None
    
    class Config:
        from_attributes = True

class QuotationItemResponse(BaseModel):
    id: str
    product_id: Optional[str]
    description: str
    hsn_code: Optional[str]
    quantity: float
    unit: str
    unit_price: float
    discount_percent: float
    discount_amount: float
    gst_rate: float
    cgst_amount: float
    sgst_amount: float
    igst_amount: float
    taxable_amount: float
    total_amount: float
    is_project: bool = False  # Add this field
    sub_items: Optional[List[SubItemResponse]] = None  # Add this field

    class Config:
        from_attributes = True


class QuotationResponse(BaseModel):
    id: str
    quotation_number: str
    quotation_date: datetime
    validity_date: Optional[datetime]
    customer_id: Optional[str]
    customer_name: Optional[str] = None
    contact_person: Optional[str] = None
    sales_person_id: Optional[str] = None
    sales_person_name: Optional[str] = None
    status: str
    subject: Optional[str]
    place_of_supply: Optional[str]
    place_of_supply_name: Optional[str]
    subtotal: float
    discount_amount: float
    cgst_amount: float
    sgst_amount: float
    igst_amount: float
    total_tax: float
    total_amount: float
    notes: Optional[str]
    terms: Optional[str]
    remarks: Optional[str]
    reference: Optional[str]
    reference_no: Optional[str]
    reference_date: Optional[datetime]
    payment_terms: Optional[str]
    excel_notes_file_url: Optional[str] = None
    email_sent_at: Optional[datetime]
    approved_at: Optional[datetime]
    converted_invoice_id: Optional[str]
    created_at: datetime
    items: Optional[List[QuotationItemResponse]] = None
    quotation_code: Optional[str] = None  # This is actually quotation_number
    validity_days: Optional[int] = None
    quotation_type: Optional[str] = None  # Add this if you have quotation_type in your model
    @classmethod
    def from_orm(cls, obj):
        # Custom from_orm to handle computed fields
        data = super().from_orm(obj)
        # Map quotation_number to quotation_code for frontend
        data.quotation_code = data.quotation_number
        # Calculate validity_days from dates
        if data.quotation_date and data.validity_date:
            data.validity_days = (data.validity_date - data.quotation_date).days
        return data

    class Config:
        from_attributes = True


class QuotationListResponse(BaseModel):
    items: List[QuotationResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class ConvertToInvoiceRequest(BaseModel):
    invoice_date: Optional[datetime] = None
    due_date: Optional[datetime] = None


class SendRequest(BaseModel):
    email: Optional[str] = None


class ApprovalRequest(BaseModel):
    approved_by: Optional[str] = None


class RejectionRequest(BaseModel):
    reason: Optional[str] = None


class ExcelNotesResponse(BaseModel):
    content: Optional[str] = None
    file_url: Optional[str] = None


# ==================== ENDPOINTS ====================

@router.get("/companies/{company_id}/contact-persons", response_model=List[ContactPersonResponse])
async def get_contact_persons(
    company_id: str,
    customer_id: Optional[str] = Query(None, description="Filter by customer ID"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get contact persons for a company, optionally filtered by customer."""
    # Verify company belongs to user
    company = db.query(Company).filter(
        Company.id == company_id,
        Company.user_id == current_user.id
    ).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    # Build query
    query = db.query(ContactPerson).join(Customer).filter(
        Customer.company_id == company_id
    )
    
    # Filter by customer if provided
    if customer_id:
        query = query.filter(ContactPerson.customer_id == customer_id)
    
    contact_persons = query.order_by(ContactPerson.name).all()
    return contact_persons


@router.get("/companies/{company_id}/sales-engineers", response_model=List[SalesEngineerResponse])
async def get_sales_engineers(
    company_id: str,
    search: Optional[str] = Query(None, description="Search by name or employee code"),
    include_without_designation: bool = Query(False, description="Include employees without designations"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get sales engineers from payroll database.
    ONLY includes employees with sales/engineer designations.
    """
    # Verify company belongs to user
    company = db.query(Company).filter(
        Company.id == company_id,
        Company.user_id == current_user.id
    ).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    try:
        # Query employees with designation containing 'sales' or 'engineer'
        query = db.query(
            Employee,
            Designation.name.label("designation_name"),
            Designation.id.label("designation_id")
        ).join(
            Designation, Employee.designation_id == Designation.id
        ).filter(
            Employee.company_id == company_id,
            Employee.status == "active",
            Designation.id.isnot(None)  # Ensure employee has a designation
        )
        
        # Build the designation filter - ONLY sales/engineer related designations
        designation_filters = [
            Designation.name.ilike('%sales%'),
            Designation.name.ilike('%engineer%'),
            Designation.name.ilike('%sales engineer%'),
            Designation.name.ilike('%field engineer%'),
            Designation.name.ilike('%technical sales%'),
            Designation.name.ilike('%business development%'),
            Designation.name.ilike('%account executive%'),
            Designation.name.ilike('%sales executive%'),
            Designation.name.ilike('%account manager%'),
            Designation.name.ilike('%sales manager%')
        ]
        
        # Apply the OR filter for designation patterns
        query = query.filter(or_(*designation_filters))
        
        # Only include without designation if explicitly requested
        if include_without_designation:
            query = query.union_all(
                db.query(
                    Employee,
                    literal("No Designation").label("designation_name"),
                    literal(None).label("designation_id")
                ).filter(
                    Employee.company_id == company_id,
                    Employee.status == "active",
                    Employee.designation_id.is_(None)  # Employees without designations
                )
            )
        
        # Apply search filter if provided
        if search:
            search_pattern = f"%{search}%"
            query = query.filter(
                or_(
                    Employee.full_name.ilike(search_pattern),
                    Employee.employee_code.ilike(search_pattern),
                    Employee.email.ilike(search_pattern),
                    Employee.first_name.ilike(search_pattern),
                    Employee.last_name.ilike(search_pattern),
                    Designation.name.ilike(search_pattern)
                )
            )
        
        # Execute query
        results = query.order_by(Employee.full_name).all()
        
        # Transform results to response
        sales_engineers = []
        for employee, designation_name, designation_id in results:
            # Get department name if needed
            department_name = None
            if employee.department_id:
                department = db.query(Department).filter(
                    Department.id == employee.department_id
                ).first()
                if department:
                    department_name = department.name
            
            sales_engineers.append({
                "id": employee.id,
                "employee_code": employee.employee_code,
                "full_name": employee.full_name or f"{employee.first_name} {employee.last_name or ''}".strip(),
                "designation_name": designation_name,
                "email": employee.email,
                "phone": employee.phone,
                "department_name": department_name
            })
        
        return sales_engineers
        
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"Error fetching sales engineers: {str(e)}")
        print(f"Traceback: {error_details}")
        
        raise HTTPException(
            status_code=500, 
            detail=f"Error fetching sales engineers: {str(e)}"
        )


@router.get("/companies/{company_id}/customers/{customer_id}/contact-persons", response_model=List[ContactPersonResponse])
async def get_customer_contact_persons(
    company_id: str,
    customer_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get contact persons for a specific customer."""
    # Verify company belongs to user
    company = db.query(Company).filter(
        Company.id == company_id,
        Company.user_id == current_user.id
    ).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    # Check if customer exists and belongs to company
    customer = db.query(Customer).filter(
        Customer.id == customer_id,
        Customer.company_id == company_id
    ).first()
    
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    # Get contact persons for this customer
    contact_persons = db.query(ContactPerson).filter(
        ContactPerson.customer_id == customer_id
    ).order_by(ContactPerson.name).all()
    
    return contact_persons

@router.post("/companies/{company_id}/quotations", response_model=QuotationResponse)
async def create_quotation(
    company_id: str,
    data: str = Form(...),
    excel_file: Optional[UploadFile] = File(None),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Create a new quotation with all fields including Excel data."""
    try:
        # Parse the JSON data
        quotation_data = json.loads(data)
        
        # Verify company belongs to user
        company = db.query(Company).filter(
            Company.id == company_id,
            Company.user_id == current_user.id
        ).first()
        if not company:
            raise HTTPException(status_code=404, detail="Company not found")
        
        # Parse dates
        def parse_date(date_str):
            if date_str:
                try:
                    # Handle different date formats
                    if 'T' in date_str:
                        return datetime.fromisoformat(date_str.replace('Z', '+00:00'))
                    else:
                        return datetime.strptime(date_str, '%Y-%m-%d')
                except Exception as e:
                    print(f"Error parsing date {date_str}: {e}")
                    return None
            return None
        
        # Get Excel file content if uploaded
        excel_file_content = None
        excel_filename = None
        if excel_file:
            excel_file_content = await excel_file.read()
            excel_filename = excel_file.filename or "excel_data.csv"
        
        # Create quotation using service
        service = QuotationService(db)
        
        # Convert items to dict - INCLUDING SUB-ITEMS
        items = []
        for item in quotation_data.get("items", []):
            item_dict = {
                "product_id": item.get("product_id"),
                "item_code":item.get('item_code'), 
                "description": item.get("description", "Item"),
                "hsn_code": item.get("hsn_code", ""),
                "quantity": float(item.get("quantity", 0)),
                "unit": item.get("unit", "unit"),
                "unit_price": float(item.get("unit_price", 0)),
                "discount_percent": float(item.get("discount_percent", 0)),
                "gst_rate": float(item.get("gst_rate", 18))
            }
            
            # Add sub-items if they exist
            sub_items = item.get("sub_items")
            if sub_items:
                item_dict["sub_items"] = []
                for sub_item in sub_items:
                    sub_item_dict = {
                        "description": sub_item.get("description", ""),
                        "quantity": float(sub_item.get("quantity", 1))
                    }
                    
                    # Handle image URL if present
                    image_url = sub_item.get("image_url")
                    if image_url:
                        sub_item_dict["image_url"] = image_url
                    
                    item_dict["sub_items"].append(sub_item_dict)
            
            items.append(item_dict)
        
        # Get quotation_type from the data
        quotation_type = quotation_data.get("quotation_type", "item")
        
        quotation = service.create_quotation(
            company=company,
            customer_id=quotation_data.get("customer_id"),
            items=items,
            quotation_date=parse_date(quotation_data.get("quotation_date")),
            validity_days=quotation_data.get("validity_days", 30),
            place_of_supply=quotation_data.get("place_of_supply"),
            subject=quotation_data.get("subject"),
            notes=quotation_data.get("notes"),
            terms=quotation_data.get("terms"),  # Additional terms
            contact_person=quotation_data.get("contact_person"),
            remarks=quotation_data.get("remarks"),
            sales_person_id=quotation_data.get("sales_person_id"),
            reference=quotation_data.get("reference"),
            reference_no=quotation_data.get("reference_no"),
            reference_date=parse_date(quotation_data.get("reference_date")),
            payment_terms=quotation_data.get("payment_terms"),
            excel_notes=quotation_data.get("excel_notes"),
            excel_file_content=excel_file_content,
            excel_filename=excel_filename,
            quotation_type=quotation_type  # Pass quotation_type to service
        )
        
        return _quotation_to_response(quotation, db)
        
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=400, detail=f"Invalid JSON data: {str(e)}")
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/companies/{company_id}/quotations", response_model=QuotationListResponse)
async def list_quotations(
    company_id: str,
    status: Optional[str] = None,
    customer_id: Optional[str] = None,
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    search: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """List quotations with filters."""
    company = get_company_or_404(company_id, current_user, db)
    service = QuotationService(db)
    
    # Parse status
    status_enum = None
    if status:
        try:
            status_enum = QuotationStatus(status)
        except ValueError:
            pass
    
    # Parse dates
    from_dt = None
    to_dt = None
    try:
        if from_date:
            from_dt = datetime.fromisoformat(from_date).date() if 'T' in from_date else datetime.strptime(from_date, '%Y-%m-%d').date()
        if to_date:
            to_dt = datetime.fromisoformat(to_date).date() if 'T' in to_date else datetime.strptime(to_date, '%Y-%m-%d').date()
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid date format: {str(e)}")
    
    result = service.list_quotations(
        company_id=company_id,
        status=status_enum,
        customer_id=customer_id,
        from_date=from_dt,
        to_date=to_dt,
        search=search,
        page=page,
        page_size=page_size,
    )
    
    return {
        "items": [_quotation_to_response(q, db, include_items=False) for q in result["items"]],
        "total": result["total"],
        "page": result["page"],
        "page_size": result["page_size"],
        "total_pages": result["total_pages"],
    }

@router.get("/companies/{company_id}/quotations/next-number")
async def get_next_quotation_number(
    company_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get the next quotation number for a company."""
    print(f"=== DEBUG START: get_next_quotation_number for company {company_id} ===")
    
    try:
        company = get_company_or_404(company_id, current_user, db)
        print(f"Company found: {company.name}")
        
        # Get the last quotation for this company
        last_quotation = db.query(Quotation).filter(
            Quotation.company_id == company_id
        ).order_by(Quotation.created_at.desc()).first()
        
        print(f"Last quotation query result: {last_quotation}")
        
        if last_quotation:
            print(f"Last quotation ID: {last_quotation.id}")
            print(f"Last quotation number: {last_quotation.quotation_number}")
        
        if last_quotation and last_quotation.quotation_number:
            # Extract number from format - handle multiple formats
            import re
            
            quotation_number = last_quotation.quotation_number
            print(f"Processing quotation number: {quotation_number}")
            
            # Try different patterns
            patterns = [
                r'QT-(\d+)$',           # QT-001, QT-010, QT-100
                r'QT-\d{4}-(\d+)$',     # QT-2026-0001
                r'QT[_-]?(\d+)$',       # QT001, QT_001, QT-001
            ]
            
            next_num = 1  # Default starting number
            
            for pattern in patterns:
                match = re.search(pattern, quotation_number)
                if match:
                    try:
                        next_num = int(match.group(1)) + 1
                        print(f"Pattern matched: {pattern}, next_num: {next_num}")
                        break
                    except (ValueError, IndexError) as e:
                        print(f"Error with pattern {pattern}: {e}")
                        continue
            
            # Format the next number (use 4 digits for consistency)
            next_quotation_number = f"QT-{next_num:04d}"
            print(f"Generated next number: {next_quotation_number}")
            
        else:
            # No quotations yet, start from 0001
            next_quotation_number = "QT-0001"
            print(f"No quotations found, using default: {next_quotation_number}")
        
        # Create response
        response_data = {"quotation_number": next_quotation_number}
        print(f"Returning response: {response_data}")
        
        return response_data
        
    except Exception as e:
        print(f"=== ERROR in get_next_quotation_number: {e} ===")
        print(f"Traceback: {traceback.format_exc()}")
        # Return a proper error response
        return {"quotation_number": "QT-0001", "error": str(e)}
        

@router.get("/companies/{company_id}/quotations/{quotation_id}", response_model=QuotationResponse)
async def get_quotation(
    company_id: str,
    quotation_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get a single quotation by ID."""
    company = get_company_or_404(company_id, current_user, db)
    service = QuotationService(db)
    
    quotation = service.get_quotation(company_id, quotation_id)
    if not quotation:
        raise HTTPException(status_code=404, detail="Quotation not found")
    
    return _quotation_to_response(quotation, db)


@router.get("/companies/{company_id}/quotations/{quotation_id}/excel-notes", response_model=ExcelNotesResponse)
async def get_excel_notes(
    company_id: str,
    quotation_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get Excel notes content for a quotation."""
    company = get_company_or_404(company_id, current_user, db)
    service = QuotationService(db)
    
    quotation = service.get_quotation(company_id, quotation_id)
    if not quotation:
        raise HTTPException(status_code=404, detail="Quotation not found")
    
    content = service.get_excel_notes_content(quotation)
    
    return {
        "content": content,
        "file_url": quotation.excel_notes_file_url
    }

@router.put("/companies/{company_id}/quotations/{quotation_id}", response_model=QuotationResponse)
async def update_quotation(
    company_id: str,
    quotation_id: str,
    data: str = Form(...),
    excel_file: Optional[UploadFile] = File(None),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update a quotation (only DRAFT status)."""
    try:
        # Parse the JSON data
        update_data = json.loads(data)
        
        company = get_company_or_404(company_id, current_user, db)
        service = QuotationService(db)
        
        quotation = service.get_quotation(company_id, quotation_id)
        if not quotation:
            raise HTTPException(status_code=404, detail="Quotation not found")
        
        # Parse dates
        def parse_date(date_str):
            if date_str:
                try:
                    if 'T' in date_str:
                        return datetime.fromisoformat(date_str.replace('Z', '+00:00'))
                    else:
                        return datetime.strptime(date_str, '%Y-%m-%d').date()
                except Exception as e:
                    print(f"Error parsing date {date_str}: {e}")
                    return None
            return None
        
        # Get Excel file content if uploaded
        excel_file_content = None
        excel_filename = None
        if excel_file:
            excel_file_content = await excel_file.read()
            excel_filename = excel_file.filename or "excel_data.csv"
        
        # Convert items to dict if provided - INCLUDING SUB-ITEMS
        items = None
        if "items" in update_data:
            items = []
            for item in update_data.get("items", []):
                item_dict = {
                    "product_id": item.get("product_id"),
                    "description": item.get("description", "Item"),
                    "hsn_code": item.get("hsn_code", ""),
                    "quantity": float(item.get("quantity", 0)),
                    "unit": item.get("unit", "unit"),
                    "unit_price": float(item.get("unit_price", 0)),
                    "discount_percent": float(item.get("discount_percent", 0)),
                    "gst_rate": float(item.get("gst_rate", 18))
                }
                
                # Add sub-items if they exist
                sub_items = item.get("sub_items")
                if sub_items:
                    item_dict["sub_items"] = []
                    for sub_item in sub_items:
                        sub_item_dict = {
                            "description": sub_item.get("description", ""),
                            "quantity": float(sub_item.get("quantity", 1))
                        }
                        
                        # Handle image URL if present
                        image_url = sub_item.get("image_url")
                        if image_url:
                            sub_item_dict["image_url"] = image_url
                        
                        item_dict["sub_items"].append(sub_item_dict)
                
                items.append(item_dict)
        
        quotation = service.update_quotation(
            quotation=quotation,
            items=items,
            validity_days=update_data.get("validity_days"),
            subject=update_data.get("subject"),
            notes=update_data.get("notes"),
            terms=update_data.get("terms"),
            contact_person=update_data.get("contact_person"),
            remarks=update_data.get("remarks"),
            sales_person_id=update_data.get("sales_person_id"),
            reference=update_data.get("reference"),
            reference_no=update_data.get("reference_no"),
            reference_date=parse_date(update_data.get("reference_date")),
            payment_terms=update_data.get("payment_terms"),
            excel_notes=update_data.get("excel_notes"),
            excel_file_content=excel_file_content,
            excel_filename=excel_filename,
        )
        
        return _quotation_to_response(quotation, db)
        
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=400, detail=f"Invalid JSON data: {str(e)}")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/companies/{company_id}/quotations/{quotation_id}")
async def delete_quotation(
    company_id: str,
    quotation_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Delete a quotation (only DRAFT status)."""
    company = get_company_or_404(company_id, current_user, db)
    service = QuotationService(db)
    
    quotation = service.get_quotation(company_id, quotation_id)
    if not quotation:
        raise HTTPException(status_code=404, detail="Quotation not found")
    
    try:
        service.delete_quotation(quotation)
        return {"message": "Quotation deleted successfully"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/companies/{company_id}/quotations/{quotation_id}/send", response_model=QuotationResponse)
async def send_quotation(
    company_id: str,
    quotation_id: str,
    data: SendRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Mark quotation as sent to customer."""
    company = get_company_or_404(company_id, current_user, db)
    service = QuotationService(db)
    
    quotation = service.get_quotation(company_id, quotation_id)
    if not quotation:
        raise HTTPException(status_code=404, detail="Quotation not found")
    
    try:
        quotation = service.send_to_customer(quotation, email=data.email)
        return _quotation_to_response(quotation, db)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/companies/{company_id}/quotations/{quotation_id}/approve", response_model=QuotationResponse)
async def approve_quotation(
    company_id: str,
    quotation_id: str,
    data: ApprovalRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Mark quotation as approved by customer."""
    company = get_company_or_404(company_id, current_user, db)
    service = QuotationService(db)
    
    quotation = service.get_quotation(company_id, quotation_id)
    if not quotation:
        raise HTTPException(status_code=404, detail="Quotation not found")
    
    try:
        quotation = service.mark_approved(quotation, approved_by=data.approved_by)
        return _quotation_to_response(quotation, db)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/companies/{company_id}/quotations/{quotation_id}/reject", response_model=QuotationResponse)
async def reject_quotation(
    company_id: str,
    quotation_id: str,
    data: RejectionRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Mark quotation as rejected by customer."""
    company = get_company_or_404(company_id, current_user, db)
    service = QuotationService(db)
    
    quotation = service.get_quotation(company_id, quotation_id)
    if not quotation:
        raise HTTPException(status_code=404, detail="Quotation not found")
    
    try:
        quotation = service.mark_rejected(quotation, rejection_reason=data.reason)
        return _quotation_to_response(quotation, db)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/companies/{company_id}/quotations/{quotation_id}/convert")
async def convert_to_invoice(
    company_id: str,
    quotation_id: str,
    data: ConvertToInvoiceRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Convert quotation to invoice."""
    company = get_company_or_404(company_id, current_user, db)
    service = QuotationService(db)
    
    quotation = service.get_quotation(company_id, quotation_id)
    if not quotation:
        raise HTTPException(status_code=404, detail="Quotation not found")
    
    try:
        invoice = service.convert_to_invoice(
            quotation=quotation,
            invoice_date=data.invoice_date,
            due_date=data.due_date,
        )
        
        return {
            "message": "Quotation converted to invoice successfully",
            "invoice_id": invoice.id,
            "invoice_number": invoice.invoice_number,
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/companies/{company_id}/quotations/{quotation_id}/revise", response_model=QuotationResponse)
async def revise_quotation(
    company_id: str,
    quotation_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Create a revised version of a quotation."""
    company = get_company_or_404(company_id, current_user, db)
    service = QuotationService(db)
    
    quotation = service.get_quotation(company_id, quotation_id)
    if not quotation:
        raise HTTPException(status_code=404, detail="Quotation not found")
    
    new_quotation = service.revise_quotation(quotation)
    return _quotation_to_response(new_quotation, db)


@router.post("/companies/{company_id}/quotations/check-expired")
async def check_expired_quotations(
    company_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Check and mark expired quotations."""
    company = get_company_or_404(company_id, current_user, db)
    service = QuotationService(db)
    
    count = service.check_expired_quotations(company_id)
    return {"expired_count": count}


# ==================== HELPER FUNCTIONS ====================

def _quotation_to_response(quotation, db: Session, include_items: bool = True) -> dict:
    """Convert quotation model to response dict."""
    customer_name = None
    if quotation.customer_id:
        customer = db.query(Customer).filter(Customer.id == quotation.customer_id).first()
        if customer:
            customer_name = customer.name
    
    # Get sales person name
    sales_person_name = quotation.sales_person_name
    if not sales_person_name and quotation.sales_person_id:
        try:
            employee = db.query(Employee).filter(Employee.id == quotation.sales_person_id).first()
            if employee:
                sales_person_name = employee.full_name or f"{employee.first_name} {employee.last_name or ''}".strip()
        except:
            pass
    
    response = {
        "id": quotation.id,
        "quotation_number": quotation.quotation_number,
        "quotation_date": quotation.quotation_date,
        "validity_date": quotation.validity_date,
        "customer_id": quotation.customer_id,
        "customer_name": customer_name,
        "contact_person": quotation.contact_person,
        "sales_person_id": quotation.sales_person_id,
        "sales_person_name": sales_person_name,
        "status": quotation.status.value if quotation.status else "draft",
        "subject": quotation.subject,
        "place_of_supply": quotation.place_of_supply,
        "place_of_supply_name": quotation.place_of_supply_name,
        "subtotal": float(quotation.subtotal or 0),
        "discount_amount": float(quotation.discount_amount or 0),
        "cgst_amount": float(quotation.cgst_amount or 0),
        "sgst_amount": float(quotation.sgst_amount or 0),
        "igst_amount": float(quotation.igst_amount or 0),
        "total_tax": float(quotation.total_tax or 0),
        "total_amount": float(quotation.total_amount or 0),
        "notes": quotation.notes,
        "terms": quotation.terms,
        "remarks": quotation.remarks,
        "reference": quotation.reference,
        "reference_no": quotation.reference_no,
        "reference_date": quotation.reference_date,
        "payment_terms": quotation.payment_terms,
        "excel_notes_file_url": quotation.excel_notes_file_url,
        "email_sent_at": quotation.email_sent_at,
        "approved_at": quotation.approved_at,
        "converted_invoice_id": quotation.converted_invoice_id,
        "created_at": quotation.created_at,
        "quotation_type": quotation.quotation_type or "item",  # Add this field
    }
    
    if include_items:
        items_response = []
        for item in quotation.items:
            item_data = {
                "id": item.id,
                "product_id": item.product_id,
                "description": item.description,
                "hsn_code": item.hsn_code,
                "quantity": float(item.quantity),
                "unit": item.unit,
                "unit_price": float(item.unit_price),
                "discount_percent": float(item.discount_percent or 0),
                "discount_amount": float(item.discount_amount or 0),
                "gst_rate": float(item.gst_rate),
                "cgst_amount": float(item.cgst_amount or 0),
                "sgst_amount": float(item.sgst_amount or 0),
                "igst_amount": float(item.igst_amount or 0),
                "taxable_amount": float(item.taxable_amount),
                "total_amount": float(item.total_amount),
                "is_project": item.is_project or False,
            }
            
            # Add sub-items if they exist
            if hasattr(item, 'sub_items') and item.sub_items:
                item_data["sub_items"] = [
                    {
                        "id": sub_item.id,
                        "quotation_item_id": sub_item.quotation_item_id,
                        "description": sub_item.description,
                        "quantity": float(sub_item.quantity),
                        "image_url": sub_item.image_url
                    }
                    for sub_item in item.sub_items
                ]
            
            items_response.append(item_data)
        
        response["items"] = items_response
    
    return response

