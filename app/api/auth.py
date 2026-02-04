from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from datetime import datetime, timedelta
from typing import Optional, Dict, Any,Union
import jwt
from sqlalchemy import or_, func
from passlib.context import CryptContext
import logging

from app.database.connection import get_db
from app.database.models import User,Company
from app.database.payroll_models import Employee, EmployeeStatus, Designation
from app.schemas.auth import UserCreate, UserLogin, UserResponse, TokenResponse, UserUpdate, PasswordChange
from app.auth.supabase_client import auth_helper
from app.auth.dependencies import get_current_user
from pydantic import BaseModel

router = APIRouter(prefix="/auth", tags=["Authentication"])
logger = logging.getLogger(__name__)

# Add JWT config for employees
EMPLOYEE_SECRET_KEY = "employee-secret-key-change-in-production"
ALGORITHM = "HS256"
EMPLOYEE_TOKEN_EXPIRE_MINUTES = 60 * 24



employee_pwd_context = CryptContext(
    schemes=["bcrypt", "pbkdf2_sha256"],  # Support both bcrypt AND pbkdf2
    default="bcrypt",  # Default to bcrypt
    deprecated="auto"
)
class LoginResponse(BaseModel):
    """Universal login response for both users and employees."""
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    refresh_token: Optional[str] = None
    user_type: str  # "user" or "employee"
    user_data: Dict[str, Any]


# Helper functions for employee auth
def verify_employee_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a stored password against one provided by employee."""
    try:
        return employee_pwd_context.verify(plain_password, hashed_password)
    except Exception:
        return False
    
def create_employee_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create JWT access token for employees."""
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=EMPLOYEE_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, EMPLOYEE_SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def get_employee_by_email(db: Session, email: str):
    """Get employee by email (checks all email fields)."""
    # Normalize email
    email_lower = email.lower().strip()
    
    employee = db.query(Employee).options(
        joinedload(Employee.department),
        joinedload(Employee.designation),
        joinedload(Employee.company)  # ADD THIS - CRITICAL!
    ).filter(
        or_(
            func.lower(Employee.email) == email_lower,
            func.lower(Employee.official_email) == email_lower,
            func.lower(Employee.personal_email) == email_lower
        ),
        Employee.status == EmployeeStatus.ACTIVE  # Only active employees
    ).first()
    
    return employee
# Update the login endpoint
@router.post("/login", response_model=LoginResponse)
async def login(data: UserLogin, db: Session = Depends(get_db)):
    """
    Login endpoint for both users and employees.
    First checks if it's a regular user (Supabase), 
    then checks if it's an employee (local password).
    """
    try:
        # FIRST: Try to login as regular user with Supabase
        try:
            result = await auth_helper.sign_in(data.email, data.password)
            
            user_info = result.get("user") or {}
            session_info = result.get("session") or {}
            if session_info and session_info.get("access_token"):
                # Regular user login successful
                user = db.query(User).filter(User.email == data.email).first()
                if not user:
                    user_metadata = user_info.get("user_metadata", {}) if isinstance(user_info, dict) else {}
                    user = User(
                        email=data.email,
                        full_name=user_metadata.get("full_name", data.email.split("@")[0]),
                        supabase_id=user_info.get("id", "") if isinstance(user_info, dict) else "",
                        is_verified=True
                    )
                    db.add(user)
                    db.commit()
                    db.refresh(user)
                
                access_token = session_info.get("access_token")
                refresh_token = session_info.get("refresh_token")
                
                designation_data = None
                if user and getattr(user, "designation_id", None):
                    designation = (
                        db.query(Designation)
                        .filter(Designation.id == user.designation_id)
                        .first()
                    )
                    if designation:
                        designation_data = {
                            "id": str(designation.id),
                            "name": designation.name,
                            "permissions": designation.permissions or [],
                        }
                        logger.info(
                            "Login user=%s designation_id=%s designation_name=%s permissions_count=%s",
                            user.email,
                            user.designation_id,
                            designation.name,
                            len(designation.permissions or []),
                        )
                    else:
                        logger.info(
                            "Login user=%s designation_id=%s designation_not_found",
                            user.email,
                            user.designation_id,
                        )
                else:
                    logger.info(
                        "Login user=%s designation_id_missing",
                        user.email if user else data.email,
                    )

                user_payload = UserResponse.model_validate(user).model_dump()
                if designation_data:
                    user_payload["designation_id"] = str(user.designation_id)
                    user_payload["designation"] = designation_data

                return LoginResponse(
                    access_token=access_token,
                    refresh_token=refresh_token,
                    token_type="bearer",
                    expires_in=86400,
                    user_type="user",
                    user_data=user_payload,
                )
        except Exception as supabase_error:
            logger.exception("Supabase login failed for %s", data.email)
            # Supabase login failed, try employee login
            pass
        
        # SECOND: Try to login as employee
        employee = get_employee_by_email(db, data.email)
        
        if employee:
            # Check if employee has password set
            if not employee.password_hash:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="No password set. Please contact administrator."
                )
            
            # Verify employee password
            if not verify_employee_password(data.password, employee.password_hash):
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid credentials"
                )
            
            # Check employee status
            if employee.status != EmployeeStatus.ACTIVE:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Employee account is {employee.status.value}"
                )
            
            # Create employee JWT token
            access_token_expires = timedelta(minutes=EMPLOYEE_TOKEN_EXPIRE_MINUTES)
            access_token = create_employee_access_token(
                data={
                    "sub": str(employee.id),
                    "employee_id": str(employee.id),
                    "company_id": str(employee.company_id),
                    "employee_code": employee.employee_code,
                    "email": data.email,
                    "type": "employee"
                },
                expires_delta=access_token_expires
            )
            
            # Prepare employee data - WITH COMPANY_ID ADDED
            designation_data = None
            if employee.designation:
                designation_data = {
                    "id": str(employee.designation.id),
                    "name": employee.designation.name
                }
            elif employee.designation_id:
                designation = (
                    db.query(Designation)
                    .filter(Designation.id == employee.designation_id)
                    .first()
                )
                if designation:
                    designation_data = {
                        "id": str(designation.id),
                        "name": designation.name,
                        "permissions": designation.permissions or [],
                    }

            logger.info(
                "Employee login email=%s employee_id=%s designation_id=%s designation_name=%s permissions_count=%s",
                data.email,
                employee.id,
                employee.designation_id,
                designation_data["name"] if designation_data else None,
                len(designation_data.get("permissions", [])) if designation_data else 0,
            )

            employee_data = {
                "id": str(employee.id),
                "employee_code": employee.employee_code,
                "first_name": employee.first_name,
                "last_name": employee.last_name,
                "full_name": employee.full_name,
                "email": employee.email or employee.official_email or employee.personal_email or data.email,
                "phone": employee.phone or "",
                # ADD THIS - CRITICAL!
                "company_id": str(employee.company_id),
                "company_name": employee.company_name if hasattr(employee, 'company_name') else 
                               (employee.company.name if employee.company else None),
                "department": {
                    "id": str(employee.department.id),
                    "name": employee.department.name
                } if employee.department and hasattr(employee.department, 'id') else None,
                "designation_id": str(employee.designation_id) if employee.designation_id else None,
                "designation": designation_data,
                "date_of_joining": employee.date_of_joining.isoformat() if employee.date_of_joining else None,
                "employee_type": employee.employee_type.value if employee.employee_type else None,
                "status": employee.status.value if employee.status else None,
                "photo_url": employee.photo_url or "",
                "is_employee": True
            }
            
            return LoginResponse(
                access_token=access_token,
                refresh_token=None,
                token_type="bearer",
                expires_in=EMPLOYEE_TOKEN_EXPIRE_MINUTES * 60,
                user_type="employee",
                user_data=employee_data
            )
        
        # If neither user nor employee found
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )
        
    except HTTPException:
        raise
    except Exception:
        logger.exception("Login failed with unexpected error for %s", data.email)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )
