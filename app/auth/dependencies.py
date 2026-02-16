"""Authentication dependencies for FastAPI."""
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from jose import jwt, JWTError
from typing import Optional, Union, Dict, Any, List
from app.database.connection import get_db
from app.database.models import User
from app.database.payroll_models import Employee, Designation
from app.config import settings
from app.auth.supabase_client import auth_helper

# HTTP Bearer token scheme
security = HTTPBearer(auto_error=False)
EMPLOYEE_SECRET_KEY = "employee-secret-key-change-in-production"
ALGORITHM = "HS256"

async def get_token_from_header(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> Optional[str]:
    """Extract token from Authorization header."""
    if credentials:
        return credentials.credentials
    return None


async def verify_supabase_token(token: str) -> Optional[dict]:
    """Verify Supabase JWT token."""
    try:
        # For Supabase, we can verify the token using their API
        user = await auth_helper.get_user(token)
        return user
    except Exception:
        return None


def get_actual_user(auth_data: Union[User, Dict[str, Any]]) -> User:
    """Extract User object from auth data."""
    if isinstance(auth_data, dict) and auth_data.get("type") == "user":
        return auth_data.get("data")
    elif isinstance(auth_data, User):
        return auth_data
    else:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not a regular user account"
        )

def is_employee(auth_data: Union[User, Dict[str, Any]]) -> bool:
    """Check if auth data is for an employee."""
    return isinstance(auth_data, dict) and auth_data.get("is_employee") == True

async def get_current_user(
    token: Optional[str] = Depends(get_token_from_header),
    db: Session = Depends(get_db)
) -> Union[User, Dict[str, Any]]:
    """
    Get current authenticated user or employee.
    Returns either a User object or employee dict based on token type.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    if not token:
        raise credentials_exception
    
    # FIRST: Try to decode as employee JWT token
    try:
        payload = jwt.decode(token, EMPLOYEE_SECRET_KEY, algorithms=[ALGORITHM])
        token_type = payload.get("type")
        
        if token_type == "employee":
            # This is an employee token
            employee_id = payload.get("employee_id")
            company_id = payload.get("company_id")
            employee_code = payload.get("employee_code")
            email = payload.get("email")
            designation_id = payload.get("designation_id")
            permissions = payload.get("permissions")
            
            if not employee_id or not company_id:
                raise credentials_exception

            if not isinstance(permissions, list):
                permissions = []

            # Backward compatibility for older tokens without permission payload:
            # fetch designation permissions from DB.
            if not permissions:
                employee = db.query(Employee).filter(Employee.id == str(employee_id)).first()
                if employee and employee.designation_id:
                    designation = db.query(Designation).filter(
                        Designation.id == employee.designation_id
                    ).first()
                    if designation and isinstance(designation.permissions, list):
                        permissions = designation.permissions
                    designation_id = designation_id or str(employee.designation_id)
            
            # Return employee data as dict (not User object)
            return {
                "type": "employee",
                "id": employee_id,
                "company_id": company_id,
                "employee_code": employee_code,
                "email": email,
                "designation_id": designation_id,
                "permissions": permissions,
                "is_employee": True
            }
    except JWTError:
        # Not an employee token, continue to try other token types
        pass
    except Exception:
        # Any other error with JWT decoding
        pass
    
    # SECOND: For development without Supabase (mock token)
    if token == "mock-access-token" or not settings.SUPABASE_URL:
        # Try to find mock user or create one
        user = db.query(User).filter(User.email == "test@example.com").first()
        if not user:
            user = User(
                email="test@example.com",
                full_name="Test User",
                supabase_id="mock-user-id",
                is_verified=True
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        
        # Mark as regular user
        return {
            "type": "user",
            "data": user,
            "is_employee": False
        }
    
    # THIRD: Verify token with Supabase (regular user)
    supabase_user = await verify_supabase_token(token)
    if not supabase_user:
        raise credentials_exception
    
    # Get or create local user
    user = db.query(User).filter(User.supabase_id == supabase_user.get("id")).first()
    
    if not user:
        # Create user from Supabase data
        user = User(
            supabase_id=supabase_user.get("id"),
            email=supabase_user.get("email"),
            full_name=supabase_user.get("user_metadata", {}).get("full_name", ""),
            is_verified=True
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    
    # Mark as regular user
    return {
        "type": "user",
        "data": user,
        "is_employee": False
    }

async def get_current_active_user(
    current_user: Union[User, Dict[str, Any]] = Depends(get_current_user)
) -> Union[User, Dict[str, Any]]:
    """Get current active user or employee."""
    if isinstance(current_user, dict) and current_user.get("is_employee"):
        # This is an employee, return as-is
        return current_user
    elif isinstance(current_user, dict) and current_user.get("type") == "user":
        # This is a regular user in dict format
        user = current_user.get("data")
        if user and not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Inactive user"
            )
        return user
    elif isinstance(current_user, User):
        # This is a User object directly
        if not current_user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Inactive user"
            )
        return current_user
    else:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user data"
        )
    
    
async def get_optional_user(
    token: Optional[str] = Depends(get_token_from_header),
    db: Session = Depends(get_db)
) -> Optional[User]:
    """Get current user if authenticated, otherwise None."""
    if not token:
        return None
    
    try:
        return await get_current_user(token, db)
    except HTTPException:
        return None

