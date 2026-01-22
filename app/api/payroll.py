"""Payroll API endpoints for employee and salary management."""
from fastapi import APIRouter, Depends, HTTPException, Query, status, Form, File, UploadFile
from fastapi.responses import JSONResponse

from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import date
from decimal import Decimal
from pydantic import BaseModel, Field

import os  # Add this
import uuid  # Add this
import shutil  # Add this

from sqlalchemy.orm import joinedload
from sqlalchemy import or_

from app.database.connection import get_db
from app.database.models import User, Company
from app.database.payroll_models import (
    Employee, Department, Designation, SalaryComponent, PayrollRun, PayrollEntry,
    EmployeeLoan, PayrollSettings, EmployeeType, EmployeeStatus, Gender,
    MaritalStatus, PayFrequency, SalaryComponentType, ComponentCalculationType,
    PayrollRunStatus, LoanStatus, LoanType, TaxRegime
)
from app.auth.dependencies import get_current_active_user
from app.services.payroll_service import PayrollService
from app.services.loan_service import LoanService
from app.services.pf_service import PFService
from app.services.esi_service import ESIService
from app.services.pt_service import PTService

router = APIRouter(prefix="/companies/{company_id}/payroll", tags=["Payroll"])


def get_company_or_404(company_id: str, current_user: User, db: Session) -> Company:
    """Get company or raise 404."""
    company = db.query(Company).filter(
        Company.id == company_id,
        Company.user_id == current_user.id
    ).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    return company


# ==================== SCHEMAS ====================

class DepartmentCreate(BaseModel):
    name: str
    code: Optional[str] = None
    description: Optional[str] = None
    parent_id: Optional[str] = None


class DepartmentResponse(BaseModel):
    id: str
    name: str
    code: Optional[str]
    description: Optional[str]
    parent_id: Optional[str]
    is_active: bool
    
    class Config:
        from_attributes = True


class DesignationCreate(BaseModel):
    name: str
    code: Optional[str] = None
    description: Optional[str] = None
    level: int = 1


class DesignationResponse(BaseModel):
    id: str
    name: str
    code: Optional[str]
    description: Optional[str]
    level: int
    is_active: bool
    
    class Config:
        from_attributes = True


class EmployeeCreate(BaseModel):
    # Personal details
    first_name: str
    last_name: Optional[str] = None
    date_of_birth: Optional[date] = None
    gender: Optional[Gender] = None
    marital_status: Optional[MaritalStatus] = None
    blood_group: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    
    # Family details
    father_name: Optional[str] = None
    mother_name: Optional[str] = None
    spouse_name: Optional[str] = None
    spouse_occupation: Optional[str] = None
    children_count: Optional[int] = 0
    children_details: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_relation: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    
    # Contact details
    personal_email: Optional[str] = None
    official_email: Optional[str] = None
    personal_phone: Optional[str] = None
    official_phone: Optional[str] = None
    alternate_phone: Optional[str] = None
    
    # Address
    permanent_address: Optional[str] = None
    current_address: Optional[str] = None
    current_city: Optional[str] = None
    same_as_permanent: bool = False
    
    # Employment
    department_id: Optional[str] = None
    designation_id: Optional[str] = None
    employee_type: EmployeeType = EmployeeType.PERMANENT
    date_of_joining: date
    work_state: Optional[str] = None
    
    # Salary components (from frontend)
    ctc: Optional[float] = 0
    monthly_basic: Optional[float] = None
    monthly_hra: Optional[float] = None
    monthly_special_allowance: Optional[float] = None
    monthly_conveyance: Optional[float] = None
    monthly_medical: Optional[float] = None
    salary_calculation_method: Optional[str] = "ctc_breakup"
    
    # Statutory
    pan: Optional[str] = None
    aadhaar: Optional[str] = None
    uan: Optional[str] = None
    pf_number: Optional[str] = None
    esi_number: Optional[str] = None
    pf_applicable: bool = True
    esi_applicable: bool = True
    pt_applicable: bool = True
    tax_regime: TaxRegime = TaxRegime.NEW
    
    # Bank details
    bank_name: Optional[str] = None
    bank_branch: Optional[str] = None
    bank_account_number: Optional[str] = None
    bank_ifsc: Optional[str] = None
    account_holder_name: Optional[str] = None
    
    # Photo
    photo_url: Optional[str] = None


class EmployeeUpdate(BaseModel):
    # Personal details
    first_name: str
    last_name: Optional[str] = None
    date_of_birth: Optional[date] = None
    gender: Optional[Gender] = None
    marital_status: Optional[MaritalStatus] = None
    blood_group: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    
    # Family details
    father_name: Optional[str] = None
    mother_name: Optional[str] = None
    spouse_name: Optional[str] = None
    spouse_occupation: Optional[str] = None
    children_count: Optional[int] = 0
    children_details: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_relation: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    
    # Contact details
    personal_email: Optional[str] = None
    official_email: Optional[str] = None
    personal_phone: Optional[str] = None
    official_phone: Optional[str] = None
    alternate_phone: Optional[str] = None
    
    # Address
    permanent_address: Optional[str] = None
    current_address: Optional[str] = None
    current_city: Optional[str] = None
    same_as_permanent: bool = False
    
    # Employment
    department_id: Optional[str] = None
    designation_id: Optional[str] = None
    employee_type: EmployeeType = EmployeeType.PERMANENT
    date_of_joining: date
    work_state: Optional[str] = None
    
    # Salary components (from frontend)
    ctc: Optional[float] = 0
    monthly_basic: Optional[float] = None
    monthly_hra: Optional[float] = None
    monthly_special_allowance: Optional[float] = None
    monthly_conveyance: Optional[float] = None
    monthly_medical: Optional[float] = None
    salary_calculation_method: Optional[str] = "ctc_breakup"
    
    # Statutory
    pan: Optional[str] = None
    aadhaar: Optional[str] = None
    uan: Optional[str] = None
    pf_number: Optional[str] = None
    esi_number: Optional[str] = None
    pf_applicable: bool = True
    esi_applicable: bool = True
    pt_applicable: bool = True
    tax_regime: TaxRegime = TaxRegime.NEW
    
    # Bank details
    bank_name: Optional[str] = None
    bank_branch: Optional[str] = None
    bank_account_number: Optional[str] = None
    bank_ifsc: Optional[str] = None
    account_holder_name: Optional[str] = None
    
    # Photo
    photo_url: Optional[str] = None
    status: Optional[EmployeeStatus] = None


class EmployeeResponse(BaseModel):
    id: str
    employee_code: str
    first_name: str
    department: Optional[DepartmentResponse]
    designation: Optional[DesignationResponse]

    last_name: Optional[str]
    full_name: Optional[str]
    date_of_birth: Optional[date]
    gender: Optional[str]
    marital_status: Optional[str]
    blood_group: Optional[str]
    email: Optional[str]
    phone: Optional[str]
    
    # Family details
    father_name: Optional[str]
    mother_name: Optional[str]
    spouse_name: Optional[str]
    spouse_occupation: Optional[str]
    children_count: Optional[int]
    children_details: Optional[str]
    emergency_contact_name: Optional[str]
    emergency_contact_relation: Optional[str]
    emergency_contact_phone: Optional[str]
    
    # Contact details
    personal_email: Optional[str]
    official_email: Optional[str]
    personal_phone: Optional[str]
    official_phone: Optional[str]
    alternate_phone: Optional[str]
    
    # Address
    permanent_address: Optional[str]
    current_address: Optional[str]
    current_city: Optional[str]
    same_as_permanent: Optional[bool]
    
    # Employment
    department_id: Optional[str]
    designation_id: Optional[str]
    employee_type: str
    date_of_joining: date
    work_state: Optional[str]
    
    # Salary
    ctc: Optional[float]
    basic_salary: Optional[float]
    hra: Optional[float]
    special_allowance: Optional[float]
    conveyance_allowance: Optional[float]
    medical_allowance: Optional[float]
    salary_calculation_method: Optional[str]
    
    # Map frontend fields
    monthly_basic: Optional[float] = None
    monthly_hra: Optional[float] = None
    monthly_special_allowance: Optional[float] = None
    monthly_conveyance: Optional[float] = None
    monthly_medical: Optional[float] = None
    
    # Statutory
    pan: Optional[str]
    aadhaar: Optional[str]
    uan: Optional[str]
    pf_number: Optional[str]
    esi_number: Optional[str]
    pf_applicable: bool
    esi_applicable: bool
    pt_applicable: bool
    tax_regime: str
    
    # Bank details
    bank_name: Optional[str]
    bank_branch: Optional[str]
    bank_account_number: Optional[str]
    bank_ifsc: Optional[str]
    account_holder_name: Optional[str]
    
    # Photo
    photo_url: Optional[str]
    
    status: str
    
    class Config:
        from_attributes = True


class SalaryComponentCreate(BaseModel):
    code: str
    name: str
    description: Optional[str] = None
    component_type: SalaryComponentType
    calculation_type: ComponentCalculationType = ComponentCalculationType.FIXED
    percentage: Optional[float] = None
    max_amount: Optional[float] = None
    is_taxable: bool = True
    is_part_of_ctc: bool = True
    is_part_of_gross: bool = True
    include_in_pf_wages: bool = False
    include_in_esi_wages: bool = False
    display_order: int = 0


class SalaryComponentResponse(BaseModel):
    id: str
    code: str
    name: str
    description: Optional[str]
    component_type: str
    calculation_type: str
    percentage: Optional[float]
    max_amount: Optional[float]
    is_taxable: bool
    is_part_of_ctc: bool
    is_statutory: bool
    display_order: int
    is_active: bool
    
    class Config:
        from_attributes = True


class SalaryStructureCreate(BaseModel):
    ctc: float
    effective_from: date
    components: Optional[dict] = None  # {"BASIC": 50000, "HRA": 20000, ...}


class PayrollRunCreate(BaseModel):
    month: int = Field(..., ge=1, le=12)
    year: int = Field(..., ge=2020, le=2100)
    pay_date: Optional[date] = None


class PayrollRunResponse(BaseModel):
    id: str
    pay_period_month: int
    pay_period_year: int
    pay_date: Optional[date]
    status: str
    total_employees: int
    processed_employees: int
    total_gross: float
    total_deductions: float
    total_net_pay: float
    total_pf_employee: float
    total_pf_employer: float
    total_esi_employee: float
    total_esi_employer: float
    total_pt: float
    total_tds: float
    
    class Config:
        from_attributes = True


class LoanCreate(BaseModel):
    employee_id: str
    loan_type: LoanType
    principal_amount: float
    tenure_months: int
    interest_rate: Optional[float] = None
    disbursement_date: Optional[date] = None
    reason: Optional[str] = None


class LoanResponse(BaseModel):
    id: str
    loan_number: str
    employee_id: str
    loan_type: str
    principal_amount: float
    interest_rate: float
    tenure_months: int
    emi_amount: float
    disbursement_date: Optional[date]
    total_repayable: float
    amount_repaid: float
    outstanding_balance: float
    emis_paid: int
    emis_pending: int
    status: str
    
    class Config:
        from_attributes = True


# ==================== DEPARTMENTS ====================

@router.post("/departments", response_model=DepartmentResponse, status_code=status.HTTP_201_CREATED)
async def create_department(
    company_id: str,
    data: DepartmentCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Create a new department."""
    company = get_company_or_404(company_id, current_user, db)
    
    department = Department(
        company_id=company.id,
        **data.model_dump()
    )
    db.add(department)
    db.commit()
    db.refresh(department)
    
    return department


@router.get("/departments", response_model=List[DepartmentResponse])
async def list_departments(
    company_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """List all departments."""
    company = get_company_or_404(company_id, current_user, db)
    
    departments = db.query(Department).filter(
        Department.company_id == company.id,
        Department.is_active == True,
    ).all()
    
    return departments


# ==================== DESIGNATIONS ====================

@router.post("/designations", response_model=DesignationResponse, status_code=status.HTTP_201_CREATED)
async def create_designation(
    company_id: str,
    data: DesignationCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Create a new designation."""
    company = get_company_or_404(company_id, current_user, db)
    
    designation = Designation(
        company_id=company.id,
        **data.model_dump()
    )
    db.add(designation)
    db.commit()
    db.refresh(designation)
    
    return designation


@router.get("/designations", response_model=List[DesignationResponse])
async def list_designations(
    company_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """List all designations."""
    company = get_company_or_404(company_id, current_user, db)
    
    designations = db.query(Designation).filter(
        Designation.company_id == company.id,
        Designation.is_active == True,
    ).order_by(Designation.level).all()
    
    return designations


# ==================== EMPLOYEES ====================

@router.post("/upload-image")
async def upload_employee_image(
    company_id: str,  # Remove Form(...) since this is a path parameter from the URL
    employee_id: Optional[str] = Form(None),
    image: UploadFile = File(...),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Upload employee photo."""
    company = get_company_or_404(company_id, current_user, db)
    
    # Validate file type
    allowed_extensions = {".jpg", ".jpeg", ".png", ".gif", ".webp"}
    file_extension = os.path.splitext(image.filename)[1].lower() if image.filename else ""
    
    if not file_extension or file_extension not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail="Invalid file type. Allowed: JPG, JPEG, PNG, GIF, WEBP"
        )
    
    # Validate file size (max 2MB)
    contents = await image.read()
    if len(contents) > 2 * 1024 * 1024:  # 2MB
        raise HTTPException(
            status_code=400,
            detail="File size exceeds 2MB limit"
        )
    
    # Create uploads directory
    base_dir = os.getcwd()  # Current working directory
    upload_dir = os.path.join(base_dir, "selfiz-accounting-project", "uploads", "employees")
    
    # Create directory if it doesn't exist
    os.makedirs(upload_dir, exist_ok=True)
    
    # Generate unique filename
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    file_path = os.path.join(upload_dir, unique_filename)
    
    # Reset file pointer and save
    await image.seek(0)
    with open(file_path, "wb") as f:
        f.write(contents)
    
    # Build URL for frontend access
    image_url = f"/uploads/employees/{unique_filename}"
    
    # If employee_id is provided, update employee record
    if employee_id:
        employee = db.query(Employee).filter(
            Employee.id == employee_id,
            Employee.company_id == company.id
        ).first()
        
        if employee:
            employee.photo_url = image_url
            db.commit()
    
    return JSONResponse({
        "success": True,
        "url": image_url,
        "filename": unique_filename,
        "message": "Image uploaded successfully"
    })

    
@router.post("/employees", response_model=EmployeeResponse, status_code=status.HTTP_201_CREATED)
async def create_employee(
    company_id: str,
    data: EmployeeCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Create a new employee."""
    company = get_company_or_404(company_id, current_user, db)
    
    # Generate employee code
    payroll_service = PayrollService(db)
    employee_code = payroll_service._generate_employee_code(company.id)
    
    # Check for duplicate employee code
    existing = db.query(Employee).filter(
        Employee.company_id == company.id,
        Employee.employee_code == employee_code,
    ).first()
    
    if existing:
        # Regenerate if duplicate found
        employee_code = payroll_service._generate_employee_code(company.id)
    
    # Prepare employee data with field mapping
    employee_data = data.model_dump(exclude_unset=True)
    
    # Map frontend field names to database field names for salary components
    field_mapping = {
        'monthly_basic': 'basic_salary',
        'monthly_hra': 'hra',
        'monthly_special_allowance': 'special_allowance',
        'monthly_conveyance': 'conveyance_allowance',
        'monthly_medical': 'medical_allowance',
    }
    
    # Apply field mapping for annual salary fields
    for frontend_field, backend_field in field_mapping.items():
        if frontend_field in employee_data:
            employee_data[backend_field] = employee_data.pop(frontend_field)
    
    # Handle salary structure based on calculation method
    salary_calculation_method = employee_data.get('salary_calculation_method', 'ctc_breakup')
    
    if salary_calculation_method == "monthly_components":
        # If monthly components provided, calculate annual
        if 'monthly_basic' in employee_data and employee_data['monthly_basic']:
            monthly_basic = Decimal(str(employee_data['monthly_basic']))
            employee_data['basic_salary'] = monthly_basic * Decimal('12')
            employee_data['monthly_basic'] = monthly_basic
        
        if 'monthly_hra' in employee_data and employee_data['monthly_hra']:
            monthly_hra = Decimal(str(employee_data['monthly_hra']))
            employee_data['hra'] = monthly_hra * Decimal('12')
            employee_data['monthly_hra'] = monthly_hra
        
        if 'monthly_special_allowance' in employee_data and employee_data['monthly_special_allowance']:
            monthly_sa = Decimal(str(employee_data['monthly_special_allowance']))
            employee_data['special_allowance'] = monthly_sa * Decimal('12')
            employee_data['monthly_special_allowance'] = monthly_sa
        
        if 'monthly_conveyance' in employee_data and employee_data['monthly_conveyance']:
            monthly_conveyance = Decimal(str(employee_data['monthly_conveyance']))
            employee_data['conveyance_allowance'] = monthly_conveyance * Decimal('12')
            employee_data['monthly_conveyance'] = monthly_conveyance
        
        if 'monthly_medical' in employee_data and employee_data['monthly_medical']:
            monthly_medical = Decimal(str(employee_data['monthly_medical']))
            employee_data['medical_allowance'] = monthly_medical * Decimal('12')
            employee_data['monthly_medical'] = monthly_medical
        
        # Calculate CTC from monthly components
        annual_ctc = (employee_data.get('basic_salary', 0) or 0) + \
                     (employee_data.get('hra', 0) or 0) + \
                     (employee_data.get('special_allowance', 0) or 0) + \
                     (employee_data.get('conveyance_allowance', 0) or 0) + \
                     (employee_data.get('medical_allowance', 0) or 0)
        
        employee_data['ctc'] = annual_ctc
        
    elif salary_calculation_method == "ctc_breakup" and 'ctc' in employee_data and employee_data['ctc']:
        # Calculate from CTC
        ctc = Decimal(str(employee_data['ctc']))
        
        # Standard CTC breakup: 40% basic, 20% HRA, 30% special allowance, 10% others
        employee_data['basic_salary'] = ctc * Decimal("0.40")  # 40% of CTC
        employee_data['hra'] = ctc * Decimal("0.20")  # 20% of CTC
        employee_data['special_allowance'] = ctc * Decimal("0.30")  # 30% of CTC
        
        # Standard allowances (monthly values * 12)
        employee_data['conveyance_allowance'] = Decimal("1600") * 12  # ₹1600/month
        employee_data['medical_allowance'] = Decimal("1250") * 12  # ₹1250/month
        
        # Calculate monthly values for display
        employee_data['monthly_basic'] = employee_data['basic_salary'] / 12
        employee_data['monthly_hra'] = employee_data['hra'] / 12
        employee_data['monthly_special_allowance'] = employee_data['special_allowance'] / 12
        employee_data['monthly_conveyance'] = Decimal("1600")
        employee_data['monthly_medical'] = Decimal("1250")
    
    # Handle numeric conversions for all numeric fields
    numeric_fields = [
        'ctc', 'basic_salary', 'hra', 'special_allowance', 
        'conveyance_allowance', 'medical_allowance',
        'monthly_basic', 'monthly_hra', 'monthly_special_allowance',
        'monthly_conveyance', 'monthly_medical', 'children_count'
    ]
    
    for field in numeric_fields:
        if field in employee_data and employee_data[field] is not None:
            try:
                employee_data[field] = Decimal(str(employee_data[field]))
            except (InvalidOperation, ValueError):
                # If conversion fails, set to 0 or None based on field
                if field == 'children_count':
                    employee_data[field] = 0
                else:
                    employee_data[field] = Decimal('0')
    
    # Set full name
    first_name = employee_data.get('first_name', '')
    last_name = employee_data.get('last_name', '')
    employee_data["full_name"] = f"{first_name} {last_name}".strip()
    
    # Set employee code
    employee_data["employee_code"] = employee_code
    
    # Set default status if not provided
    if 'status' not in employee_data:
        employee_data['status'] = EmployeeStatus.ACTIVE
    
    # Set default tax regime if not provided
    if 'tax_regime' not in employee_data:
        employee_data['tax_regime'] = TaxRegime.NEW
    
    # Handle same_as_permanent for address
    if employee_data.get('same_as_permanent', False) and 'permanent_address' in employee_data:
        employee_data['current_address'] = employee_data['permanent_address']
        employee_data['current_city'] = employee_data.get('permanent_city', '')
    
    # Create employee
    employee = Employee(
        company_id=company.id,
        **employee_data
    )
    db.add(employee)
    db.commit()
    db.refresh(employee)
    
    # Eager load relationships for response
    employee = db.query(Employee).options(
        joinedload(Employee.department),
        joinedload(Employee.designation)
    ).filter(Employee.id == employee.id).first()
    
    return employee

def get_employees(db: Session = Depends(get_db)):
    return (
        db.query(Employee)
        .options(
            joinedload(Employee.department),
            joinedload(Employee.designation)
        )
        .all()
    )
    

# payroll.py (endpoint update)

@router.get("/employees", response_model=List[EmployeeResponse])
async def list_employees(
    company_id: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status_filter: Optional[EmployeeStatus] = None,
    department_id: Optional[str] = None,
    search: Optional[str] = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """List all employees with pagination."""
    company = get_company_or_404(company_id, current_user, db)
    
    query = (
        db.query(Employee)
        .options(
            joinedload(Employee.department),
            joinedload(Employee.designation),
        )
        .filter(Employee.company_id == company.id)
    )
    
    if status_filter:
        query = query.filter(Employee.status == status_filter)
    else:
        query = query.filter(Employee.status != EmployeeStatus.TERMINATED)
    
    if department_id:
        query = query.filter(Employee.department_id == department_id)
    
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                Employee.full_name.ilike(search_term),
                Employee.employee_code.ilike(search_term),
                Employee.email.ilike(search_term),
                Employee.phone.ilike(search_term),
                Employee.pan.ilike(search_term),
            )
        )
    
    # Get total count
    total = query.count()
    
    # Apply pagination
    offset = (page - 1) * page_size
    employees = query.order_by(Employee.employee_code).offset(offset).limit(page_size).all()
    
    # Add pagination info to response headers (optional)
    from fastapi import Response
    
    response = Response()
    response.headers["X-Total-Count"] = str(total)
    response.headers["X-Total-Pages"] = str((total + page_size - 1) // page_size)
    response.headers["X-Page"] = str(page)
    response.headers["X-Page-Size"] = str(page_size)
    
    return employees


@router.get("/employees/{employee_id}", response_model=EmployeeResponse)
async def get_employee(
    company_id: str,
    employee_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get employee details."""
    company = get_company_or_404(company_id, current_user, db)
    
    employee = db.query(Employee).filter(
        Employee.id == employee_id,
        Employee.company_id == company.id,
    ).first()
    
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    return employee


@router.put("/employees/{employee_id}", response_model=EmployeeResponse)
async def update_employee(
    company_id: str,
    employee_id: str,
    data: EmployeeUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update employee details."""
    company = get_company_or_404(company_id, current_user, db)
    
    employee = db.query(Employee).filter(
        Employee.id == employee_id,
        Employee.company_id == company.id,
    ).first()
    
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    update_data = data.model_dump(exclude_unset=True)
    
    # Map frontend field names to database field names
    field_mapping = {
        'monthly_basic': 'basic_salary',
        'monthly_hra': 'hra',
        'monthly_special_allowance': 'special_allowance',
        'monthly_conveyance': 'conveyance_allowance',
        'monthly_medical': 'medical_allowance',
    }
    
    # Apply field mapping
    for frontend_field, backend_field in field_mapping.items():
        if frontend_field in update_data:
            update_data[backend_field] = update_data.pop(frontend_field)
    
    # Handle numeric conversions
    numeric_fields = ['ctc', 'basic_salary', 'hra', 'special_allowance', 
                     'conveyance_allowance', 'medical_allowance']
    
    for field in numeric_fields:
        if field in update_data and update_data[field] is not None:
            update_data[field] = Decimal(str(update_data[field]))
    
    # Update fields
    for key, value in update_data.items():
        setattr(employee, key, value)
    
    # Update full name if first_name or last_name changed
    if 'first_name' in update_data or 'last_name' in update_data:
        employee.full_name = f"{employee.first_name} {employee.last_name or ''}".strip()
    
    db.commit()
    db.refresh(employee)
    
    return employee


@router.delete("/employees/{employee_id}")
async def deactivate_employee(
    company_id: str,
    employee_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Deactivate an employee (soft delete)."""
    company = get_company_or_404(company_id, current_user, db)
    
    employee = db.query(Employee).filter(
        Employee.id == employee_id,
        Employee.company_id == company.id,
    ).first()
    
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    employee.status = EmployeeStatus.INACTIVE
    db.commit()
    
    return {"message": "Employee deactivated"}


# ==================== SALARY COMPONENTS ====================

@router.post("/salary-components", response_model=SalaryComponentResponse, status_code=status.HTTP_201_CREATED)
async def create_salary_component(
    company_id: str,
    data: SalaryComponentCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Create a new salary component."""
    company = get_company_or_404(company_id, current_user, db)
    
    component_data = data.model_dump()
    if data.percentage:
        component_data["percentage"] = Decimal(str(data.percentage))
    if data.max_amount:
        component_data["max_amount"] = Decimal(str(data.max_amount))
    
    component = SalaryComponent(
        company_id=company.id,
        **component_data
    )
    db.add(component)
    db.commit()
    db.refresh(component)
    
    return component


@router.get("/salary-components", response_model=List[SalaryComponentResponse])
async def list_salary_components(
    company_id: str,
    component_type: Optional[SalaryComponentType] = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """List all salary components."""
    company = get_company_or_404(company_id, current_user, db)
    
    service = PayrollService(db)
    components = service.get_salary_components(company.id, component_type)
    
    return components


@router.post("/salary-components/initialize")
async def initialize_default_components(
    company_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Initialize default salary components for a company."""
    company = get_company_or_404(company_id, current_user, db)
    
    service = PayrollService(db)
    created = service.create_default_salary_components(company.id)
    
    return {"message": f"Created {len(created)} default components"}


# ==================== SALARY STRUCTURE ====================

@router.post("/employees/{employee_id}/salary-structure")
async def create_salary_structure(
    company_id: str,
    employee_id: str,
    data: SalaryStructureCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Create/update salary structure for an employee."""
    company = get_company_or_404(company_id, current_user, db)
    
    employee = db.query(Employee).filter(
        Employee.id == employee_id,
        Employee.company_id == company.id,
    ).first()
    
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    service = PayrollService(db)
    
    # Convert component amounts to Decimal
    custom_components = None
    if data.components:
        custom_components = {k: Decimal(str(v)) for k, v in data.components.items()}
    
    structures = service.create_employee_salary_structure(
        employee_id=employee_id,
        ctc=Decimal(str(data.ctc)),
        effective_from=data.effective_from,
        custom_components=custom_components,
    )
    
    return {"message": f"Created salary structure with {len(structures)} components"}


@router.get("/employees/{employee_id}/salary-structure")
async def get_salary_structure(
    company_id: str,
    employee_id: str,
    as_of: Optional[date] = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get current salary structure for an employee."""
    company = get_company_or_404(company_id, current_user, db)
    
    employee = db.query(Employee).filter(
        Employee.id == employee_id,
        Employee.company_id == company.id,
    ).first()
    
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    service = PayrollService(db)
    structure = service.get_employee_salary_structure(employee_id, as_of)
    
    return {
        "employee_id": employee_id,
        "employee_name": employee.full_name,
        "ctc": float(employee.ctc) if employee.ctc else 0,
        "components": structure,
    }


# ==================== PAYROLL RUN ====================

@router.post("/run", response_model=PayrollRunResponse, status_code=status.HTTP_201_CREATED)
async def create_payroll_run(
    company_id: str,
    data: PayrollRunCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Create a new payroll run for a month."""
    company = get_company_or_404(company_id, current_user, db)
    
    service = PayrollService(db)
    
    try:
        payroll_run = service.create_payroll_run(
            company_id=company.id,
            month=data.month,
            year=data.year,
            pay_date=data.pay_date,
        )
        return payroll_run
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/run", response_model=List[PayrollRunResponse])
async def list_payroll_runs(
    company_id: str,
    year: Optional[int] = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """List all payroll runs."""
    company = get_company_or_404(company_id, current_user, db)
    
    query = db.query(PayrollRun).filter(PayrollRun.company_id == company.id)
    
    if year:
        query = query.filter(PayrollRun.pay_period_year == year)
    
    runs = query.order_by(
        PayrollRun.pay_period_year.desc(),
        PayrollRun.pay_period_month.desc()
    ).all()
    
    return runs


@router.get("/run/{month}/{year}", response_model=PayrollRunResponse)
async def get_payroll_run(
    company_id: str,
    month: int,
    year: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get payroll run for a specific month."""
    company = get_company_or_404(company_id, current_user, db)
    
    payroll_run = db.query(PayrollRun).filter(
        PayrollRun.company_id == company.id,
        PayrollRun.pay_period_month == month,
        PayrollRun.pay_period_year == year,
    ).first()
    
    if not payroll_run:
        raise HTTPException(status_code=404, detail="Payroll run not found")
    
    return payroll_run


@router.post("/run/{payroll_run_id}/process")
async def process_payroll(
    company_id: str,
    payroll_run_id: str,
    working_days: int = Query(30, ge=1, le=31),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Process payroll for all employees."""
    company = get_company_or_404(company_id, current_user, db)
    
    payroll_run = db.query(PayrollRun).filter(
        PayrollRun.id == payroll_run_id,
        PayrollRun.company_id == company.id,
    ).first()
    
    if not payroll_run:
        raise HTTPException(status_code=404, detail="Payroll run not found")
    
    service = PayrollService(db)
    
    try:
        payroll_run = service.process_payroll(payroll_run_id, working_days)
        return {
            "message": "Payroll processed successfully",
            "processed_employees": payroll_run.processed_employees,
            "total_net_pay": float(payroll_run.total_net_pay),
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/run/{payroll_run_id}/finalize")
async def finalize_payroll(
    company_id: str,
    payroll_run_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Finalize payroll and create accounting entries."""
    company = get_company_or_404(company_id, current_user, db)
    
    payroll_run = db.query(PayrollRun).filter(
        PayrollRun.id == payroll_run_id,
        PayrollRun.company_id == company.id,
    ).first()
    
    if not payroll_run:
        raise HTTPException(status_code=404, detail="Payroll run not found")
    
    service = PayrollService(db)
    
    try:
        payroll_run = service.finalize_payroll(payroll_run_id, current_user.id)
        return {"message": "Payroll finalized successfully"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ==================== PAYSLIPS ====================

@router.get("/payslip/{employee_id}/{month}/{year}")
async def get_payslip(
    company_id: str,
    employee_id: str,
    month: int,
    year: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get payslip for an employee."""
    company = get_company_or_404(company_id, current_user, db)
    
    service = PayrollService(db)
    payslip = service.get_payslip(employee_id, month, year)
    
    if not payslip:
        raise HTTPException(status_code=404, detail="Payslip not found")
    
    return payslip


@router.get("/payslips/{month}/{year}")
async def list_payslips(
    company_id: str,
    month: int,
    year: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """List all payslips for a month."""
    company = get_company_or_404(company_id, current_user, db)
    
    entries = db.query(PayrollEntry).join(PayrollRun).filter(
        PayrollRun.company_id == company.id,
        PayrollRun.pay_period_month == month,
        PayrollRun.pay_period_year == year,
    ).all()
    
    payslips = []
    for entry in entries:
        employee = entry.employee
        payslips.append({
            "employee_id": entry.employee_id,
            "employee_code": employee.employee_code if employee else None,
            "employee_name": employee.full_name if employee else None,
            "gross_salary": float(entry.gross_salary),
            "total_deductions": float(entry.total_deductions),
            "net_pay": float(entry.net_pay),
        })
    
    return payslips


# ==================== LOANS ====================

@router.post("/loans", response_model=LoanResponse, status_code=status.HTTP_201_CREATED)
async def create_loan(
    company_id: str,
    data: LoanCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Create a new employee loan."""
    company = get_company_or_404(company_id, current_user, db)
    
    service = LoanService(db)
    
    try:
        loan = service.create_loan(
            company_id=company.id,
            employee_id=data.employee_id,
            loan_type=data.loan_type,
            principal_amount=Decimal(str(data.principal_amount)),
            tenure_months=data.tenure_months,
            interest_rate=Decimal(str(data.interest_rate)) if data.interest_rate else None,
            disbursement_date=data.disbursement_date,
            reason=data.reason,
        )
        return loan
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/loans", response_model=List[LoanResponse])
async def list_loans(
    company_id: str,
    employee_id: Optional[str] = None,
    status_filter: Optional[LoanStatus] = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """List all loans."""
    company = get_company_or_404(company_id, current_user, db)
    
    query = db.query(EmployeeLoan).filter(EmployeeLoan.company_id == company.id)
    
    if employee_id:
        query = query.filter(EmployeeLoan.employee_id == employee_id)
    
    if status_filter:
        query = query.filter(EmployeeLoan.status == status_filter)
    
    loans = query.order_by(EmployeeLoan.created_at.desc()).all()
    
    return loans


@router.get("/loans/{loan_id}")
async def get_loan_statement(
    company_id: str,
    loan_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get loan details with repayment history."""
    company = get_company_or_404(company_id, current_user, db)
    
    service = LoanService(db)
    statement = service.get_loan_statement(loan_id)
    
    if "error" in statement:
        raise HTTPException(status_code=404, detail=statement["error"])
    
    return statement


@router.post("/loans/{loan_id}/approve")
async def approve_loan(
    company_id: str,
    loan_id: str,
    disbursement_date: Optional[date] = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Approve a loan."""
    company = get_company_or_404(company_id, current_user, db)
    
    service = LoanService(db)
    
    try:
        loan = service.approve_loan(loan_id, current_user.id, disbursement_date)
        return {"message": "Loan approved", "loan_number": loan.loan_number}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/loans/{loan_id}/disburse")
async def disburse_loan(
    company_id: str,
    loan_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Disburse a loan."""
    company = get_company_or_404(company_id, current_user, db)
    
    service = LoanService(db)
    
    try:
        loan = service.disburse_loan(loan_id)
        return {"message": "Loan disbursed", "loan_number": loan.loan_number}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/loans/{loan_id}/eligibility")
async def check_loan_eligibility(
    company_id: str,
    employee_id: str,
    loan_type: LoanType,
    amount: Optional[float] = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Check loan eligibility for an employee."""
    company = get_company_or_404(company_id, current_user, db)
    
    service = LoanService(db)
    
    result = service.check_eligibility(
        employee_id=employee_id,
        loan_type=loan_type,
        requested_amount=Decimal(str(amount)) if amount else None,
    )
    
    return {
        "is_eligible": result.is_eligible,
        "max_amount": float(result.max_amount),
        "max_tenure_months": result.max_tenure_months,
        "reason": result.reason,
        "existing_loans": result.existing_loans_count,
        "outstanding_amount": float(result.existing_loans_outstanding),
    }


# ==================== REPORTS ====================

@router.get("/reports/pf/{month}/{year}")
async def get_pf_report(
    company_id: str,
    month: int,
    year: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get PF ECR report for a month."""
    company = get_company_or_404(company_id, current_user, db)
    
    service = PFService(db)
    
    summary = service.get_pf_summary_for_month(company.id, month, year)
    ecr_data = service.generate_ecr_data(company.id, month, year)
    
    return {
        "summary": summary,
        "ecr_data": ecr_data,
    }


@router.get("/reports/esi/{month}/{year}")
async def get_esi_report(
    company_id: str,
    month: int,
    year: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get ESI challan report for a month."""
    company = get_company_or_404(company_id, current_user, db)
    
    service = ESIService(db)
    
    summary = service.get_esi_summary_for_month(company.id, month, year)
    challan_data = service.generate_esi_challan_data(company.id, month, year)
    
    return {
        "summary": summary,
        "challan_data": challan_data,
    }


@router.get("/reports/pt/{month}/{year}")
async def get_pt_report(
    company_id: str,
    month: int,
    year: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get Professional Tax report for a month."""
    company = get_company_or_404(company_id, current_user, db)
    
    service = PTService(db)
    summary = service.get_pt_summary_for_month(company.id, month, year)
    
    return summary


# ==================== SETTINGS ====================

@router.get("/settings")
async def get_payroll_settings(
    company_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get payroll settings."""
    company = get_company_or_404(company_id, current_user, db)
    
    service = PayrollService(db)
    settings = service.get_or_create_payroll_settings(company.id)
    
    return {
        "pf_enabled": settings.pf_enabled,
        "pf_contribution_rate": float(settings.pf_contribution_rate) if settings.pf_contribution_rate else 12,
        "pf_wage_ceiling": float(settings.pf_wage_ceiling) if settings.pf_wage_ceiling else 15000,
        "pf_establishment_id": settings.pf_establishment_id,
        "esi_enabled": settings.esi_enabled,
        "esi_employee_rate": float(settings.esi_employee_rate) if settings.esi_employee_rate else 0.75,
        "esi_employer_rate": float(settings.esi_employer_rate) if settings.esi_employer_rate else 3.25,
        "esi_wage_ceiling": float(settings.esi_wage_ceiling) if settings.esi_wage_ceiling else 21000,
        "esi_establishment_id": settings.esi_establishment_id,
        "pt_enabled": settings.pt_enabled,
        "pt_state": settings.pt_state,
        "tds_enabled": settings.tds_enabled,
        "default_tax_regime": settings.default_tax_regime.value if settings.default_tax_regime else "new",
        "pay_day": settings.pay_day,
        "working_days_per_month": settings.working_days_per_month,
    }


@router.put("/settings")
async def update_payroll_settings(
    company_id: str,
    data: dict,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update payroll settings."""
    company = get_company_or_404(company_id, current_user, db)
    
    service = PayrollService(db)
    
    # Convert numeric fields to Decimal
    if "pf_contribution_rate" in data:
        data["pf_contribution_rate"] = Decimal(str(data["pf_contribution_rate"]))
    if "pf_wage_ceiling" in data:
        data["pf_wage_ceiling"] = Decimal(str(data["pf_wage_ceiling"]))
    if "esi_employee_rate" in data:
        data["esi_employee_rate"] = Decimal(str(data["esi_employee_rate"]))
    if "esi_employer_rate" in data:
        data["esi_employer_rate"] = Decimal(str(data["esi_employer_rate"]))
    if "esi_wage_ceiling" in data:
        data["esi_wage_ceiling"] = Decimal(str(data["esi_wage_ceiling"]))
    
    settings = service.update_payroll_settings(company.id, **data)
    
    return {"message": "Settings updated"}
