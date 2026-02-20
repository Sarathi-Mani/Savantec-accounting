"""Category API endpoints."""
from typing import Any, Dict, List, Optional, Union
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.database.models import User, Company
from app.schemas.category import CategoryCreate, CategoryUpdate, CategoryResponse, CategoryListResponse
from app.services.category_service import CategoryService
from app.services.company_service import CompanyService
from app.auth.dependencies import get_current_active_user

router = APIRouter(prefix="/companies/{company_id}/categories", tags=["categories"])


def get_company_or_404(company_id: str, user: Union[User, Dict[str, Any]], db: Session) -> Company:
    """Helper to get company or raise 404."""
    service = CompanyService(db)
    company = service.get_company(company_id, user)
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found"
        )
    return company


def _extract_permissions(current_user: Dict[str, Any]) -> List[str]:
    """Extract permission keys from employee auth payload."""
    direct_permissions = current_user.get("permissions")
    if isinstance(direct_permissions, list):
        return [str(p).strip().lower() for p in direct_permissions if p is not None]

    designation = current_user.get("designation")
    if isinstance(designation, dict):
        designation_permissions = designation.get("permissions")
        if isinstance(designation_permissions, list):
            return [str(p).strip().lower() for p in designation_permissions if p is not None]

    return []


def get_creator_user_id_or_403(
    current_user: Union[User, Dict[str, Any]],
    company: Company
) -> str:
    """Resolve creator user ID for write operations with employee permission checks."""
    if isinstance(current_user, User):
        return current_user.id

    if isinstance(current_user, dict):
        if current_user.get("is_employee"):
            permissions = _extract_permissions(current_user)
            # Keep backward compatibility with existing designation key mapping.
            # In many setups, categories are controlled by "variant" permission.
            if "category" not in permissions and "variant" not in permissions:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Insufficient permission: category/variant"
                )

            # Category.created_by references users.id, so store company owner user id.
            return company.user_id

        if current_user.get("type") == "user":
            user_data = current_user.get("data")
            if user_data is not None and hasattr(user_data, "id"):
                return user_data.id

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid authentication data"
    )


@router.get("/", response_model=CategoryListResponse)
async def list_categories(
    company_id: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """List all categories for a company - showing only name and description."""
    company = get_company_or_404(company_id, current_user, db)
    service = CategoryService(db)
    categories, total = service.get_categories(company, page, page_size, search)
    
    return CategoryListResponse(
        categories=categories,
        total=total,
        page=page,
        page_size=page_size
    )


@router.get("/search", response_model=list[CategoryResponse])
async def search_categories(
    company_id: str,
    q: str = Query(..., min_length=1),
    limit: int = Query(10, ge=1, le=100),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Search categories by name - for dropdown autocomplete."""
    company = get_company_or_404(company_id, current_user, db)
    service = CategoryService(db)
    categories = service.search_categories(company, q, limit)
    
    return categories


@router.post("/", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
async def create_category(
    company_id: str,
    category_data: CategoryCreate,
    current_user: Union[User, Dict[str, Any]] = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Create a new category."""
    company = get_company_or_404(company_id, current_user, db)
    service = CategoryService(db)
    creator_user_id = get_creator_user_id_or_403(current_user, company)
    try:
        category = service.create_category(company, category_data, creator_user_id)
        return category
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{category_id}", response_model=CategoryResponse)
async def get_category(
    company_id: str,
    category_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get a category by ID."""
    company = get_company_or_404(company_id, current_user, db)
    service = CategoryService(db)
    category = service.get_category(category_id, company)
    
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    return category


@router.put("/{category_id}", response_model=CategoryResponse)
async def update_category(
    company_id: str,
    category_id: str,
    category_data: CategoryUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update a category."""
    company = get_company_or_404(company_id, current_user, db)
    service = CategoryService(db)
    category = service.get_category(category_id, company)
    
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    try:
        updated_category = service.update_category(category, category_data)
        return updated_category
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_category(
    company_id: str,
    category_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Delete a category."""
    company = get_company_or_404(company_id, current_user, db)
    service = CategoryService(db)
    category = service.get_category(category_id, company)
    
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    try:
        service.delete_category(category)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
