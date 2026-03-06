"""Schemas for company product units."""
from datetime import datetime
from pydantic import BaseModel, Field
from typing import Optional


class CompanyProductUnitCreate(BaseModel):
    label: str = Field(..., min_length=1, max_length=100)


class CompanyProductUnitUpdate(BaseModel):
    label: str = Field(..., min_length=1, max_length=100)


class CompanyProductUnitResponse(BaseModel):
    id: str
    company_id: str
    value: str
    label: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class CompanyProductUnitListResponse(BaseModel):
    units: list[CompanyProductUnitResponse]
    total: int
    page: int
    page_size: int
