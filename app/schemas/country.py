"""Schemas for country master."""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class CountryCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    code: Optional[str] = Field(None, max_length=3)
    is_active: Optional[bool] = True


class CountryUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    code: Optional[str] = Field(None, max_length=3)
    is_active: Optional[bool] = None


class CountryResponse(BaseModel):
    id: str
    company_id: str
    name: str
    code: Optional[str]
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True
