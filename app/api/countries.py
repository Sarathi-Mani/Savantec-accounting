"""Country master API routes."""
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_active_user
from app.database.connection import get_db
from app.database.models import Company, Country, User
from app.schemas.country import CountryCreate, CountryResponse, CountryUpdate
from app.services.company_service import CompanyService

router = APIRouter(prefix="/companies/{company_id}/countries", tags=["Countries"])


def get_company_or_404(company_id: str, user: User, db: Session) -> Company:
    service = CompanyService(db)
    company = service.get_company(company_id, user)
    if not company:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Company not found")
    return company


@router.get("", response_model=List[CountryResponse])
async def list_countries(
    company_id: str,
    is_active: Optional[bool] = Query(None),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    company = get_company_or_404(company_id, current_user, db)
    query = db.query(Country).filter(Country.company_id == company.id)
    if is_active is not None:
        query = query.filter(Country.is_active == is_active)
    countries = query.order_by(Country.name.asc()).all()
    return [CountryResponse.model_validate(c) for c in countries]


@router.post("", response_model=CountryResponse, status_code=status.HTTP_201_CREATED)
async def create_country(
    company_id: str,
    data: CountryCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    company = get_company_or_404(company_id, current_user, db)
    name = data.name.strip()
    if not name:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Country name is required")

    existing = db.query(Country).filter(
        Country.company_id == company.id,
        Country.name.ilike(name),
    ).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Country already exists")

    country = Country(
        company_id=company.id,
        name=name,
        code=(data.code.strip().upper() if data.code else None),
        is_active=bool(data.is_active),
    )
    db.add(country)
    db.commit()
    db.refresh(country)
    return CountryResponse.model_validate(country)


@router.put("/{country_id}", response_model=CountryResponse)
async def update_country(
    company_id: str,
    country_id: str,
    data: CountryUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    company = get_company_or_404(company_id, current_user, db)
    country = db.query(Country).filter(
        Country.id == country_id,
        Country.company_id == company.id,
    ).first()
    if not country:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Country not found")

    if data.name is not None:
        name = data.name.strip()
        if not name:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Country name is required")
        duplicate = db.query(Country).filter(
            Country.company_id == company.id,
            Country.id != country.id,
            Country.name.ilike(name),
        ).first()
        if duplicate:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Country already exists")
        country.name = name

    if data.code is not None:
        country.code = data.code.strip().upper() if data.code.strip() else None

    if data.is_active is not None:
        country.is_active = bool(data.is_active)

    db.commit()
    db.refresh(country)
    return CountryResponse.model_validate(country)


@router.delete("/{country_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_country(
    company_id: str,
    country_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    company = get_company_or_404(company_id, current_user, db)
    country = db.query(Country).filter(
        Country.id == country_id,
        Country.company_id == company.id,
    ).first()
    if not country:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Country not found")

    db.delete(country)
    db.commit()
    return None
