"""Company product unit master API endpoints."""
from typing import Any, Dict, List, Optional, Union

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_active_user
from app.database.connection import get_db
from app.database.models import Company, CompanyProductUnit, User
from app.schemas.product_unit import (
    CompanyProductUnitCreate,
    CompanyProductUnitListResponse,
    CompanyProductUnitResponse,
    CompanyProductUnitUpdate,
)
from app.services.company_service import CompanyService

router = APIRouter(prefix="/companies/{company_id}/product-units", tags=["Product Units"])


def get_company_or_404(company_id: str, user: Union[User, Dict[str, Any]], db: Session) -> Company:
    service = CompanyService(db)
    company = service.get_company(company_id, user)
    if not company:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Company not found")
    return company


def normalize_label(raw: str) -> str:
    return " ".join((raw or "").strip().split())


def normalize_value(raw: str) -> str:
    chars: List[str] = []
    previous_was_sep = False
    for ch in normalize_label(raw).lower():
        if ch.isalnum():
            chars.append(ch)
            previous_was_sep = False
        elif not previous_was_sep:
            chars.append("_")
            previous_was_sep = True
    return "".join(chars).strip("_")


def get_permission_keys(current_user: Union[User, Dict[str, Any]]) -> List[str]:
    if isinstance(current_user, dict):
        permissions = current_user.get("permissions")
        if isinstance(permissions, list):
            return [str(item).strip().lower() for item in permissions if item is not None]
    return []


def ensure_write_access(current_user: Union[User, Dict[str, Any]]) -> None:
    if isinstance(current_user, User):
        return

    if isinstance(current_user, dict) and current_user.get("is_employee"):
        permissions = set(get_permission_keys(current_user))
        if permissions.intersection({"products", "product", "item", "inventory"}):
            return
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permission: products",
        )


def get_unit_or_404(db: Session, company_id: str, unit_id: str) -> CompanyProductUnit:
    unit = (
        db.query(CompanyProductUnit)
        .filter(
            CompanyProductUnit.company_id == company_id,
            CompanyProductUnit.id == unit_id,
        )
        .first()
    )
    if not unit:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Unit not found")
    return unit


@router.get("", response_model=CompanyProductUnitListResponse)
async def list_product_units(
    company_id: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=500),
    search: Optional[str] = None,
    current_user: Union[User, Dict[str, Any]] = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    get_company_or_404(company_id, current_user, db)

    query = db.query(CompanyProductUnit).filter(CompanyProductUnit.company_id == company_id)
    if search:
        search_term = f"%{search.strip()}%"
        query = query.filter(CompanyProductUnit.label.ilike(search_term))

    total = query.count()
    units = (
        query.order_by(func.lower(CompanyProductUnit.label))
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    return CompanyProductUnitListResponse(
        units=units,
        total=total,
        page=page,
        page_size=page_size,
    )


@router.post("", response_model=CompanyProductUnitResponse, status_code=status.HTTP_201_CREATED)
async def create_product_unit(
    company_id: str,
    payload: CompanyProductUnitCreate,
    current_user: Union[User, Dict[str, Any]] = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    get_company_or_404(company_id, current_user, db)
    ensure_write_access(current_user)

    label = normalize_label(payload.label)
    value = normalize_value(label)
    if not label or not value:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Please enter a valid unit name.")

    duplicate = (
        db.query(CompanyProductUnit)
        .filter(
            CompanyProductUnit.company_id == company_id,
            func.lower(CompanyProductUnit.value) == value.lower(),
        )
        .first()
    )
    if duplicate:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unit already exists.")

    unit = CompanyProductUnit(company_id=company_id, label=label, value=value)
    db.add(unit)
    db.commit()
    db.refresh(unit)
    return unit


@router.put("/{unit_id}", response_model=CompanyProductUnitResponse)
async def update_product_unit(
    company_id: str,
    unit_id: str,
    payload: CompanyProductUnitUpdate,
    current_user: Union[User, Dict[str, Any]] = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    get_company_or_404(company_id, current_user, db)
    ensure_write_access(current_user)
    unit = get_unit_or_404(db, company_id, unit_id)

    label = normalize_label(payload.label)
    value = normalize_value(label)
    if not label or not value:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Please enter a valid unit name.")

    duplicate = (
        db.query(CompanyProductUnit)
        .filter(
            CompanyProductUnit.company_id == company_id,
            CompanyProductUnit.id != unit_id,
            func.lower(CompanyProductUnit.value) == value.lower(),
        )
        .first()
    )
    if duplicate:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unit already exists.")

    unit.label = label
    unit.value = value
    db.commit()
    db.refresh(unit)
    return unit


@router.delete("/{unit_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_product_unit(
    company_id: str,
    unit_id: str,
    current_user: Union[User, Dict[str, Any]] = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    get_company_or_404(company_id, current_user, db)
    ensure_write_access(current_user)
    unit = get_unit_or_404(db, company_id, unit_id)
    db.delete(unit)
    db.commit()
