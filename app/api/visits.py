"""API endpoints for visit tracking."""
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime, date, time
from decimal import Decimal

from app.database.connection import get_db
from app.database.models import Company, User, Visit, VisitPlan, VisitStatus
from app.auth.dependencies import get_current_active_user
from app.services.visit_service import VisitService

router = APIRouter(prefix="/api/companies/{company_id}", tags=["visits"])


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

class LocationData(BaseModel):
    lat: float
    lng: float
    address: Optional[str] = None


class VisitCreate(BaseModel):
    employee_id: str
    visit_date: date
    customer_id: Optional[str] = None
    enquiry_id: Optional[str] = None
    purpose: Optional[str] = None
    notes: Optional[str] = None


class VisitUpdate(BaseModel):
    customer_id: Optional[str] = None
    purpose: Optional[str] = None
    notes: Optional[str] = None
    outcome: Optional[str] = None


class CheckInRequest(BaseModel):
    start_km: Optional[float] = None
    start_location: Optional[LocationData] = None


class CheckOutRequest(BaseModel):
    end_km: Optional[float] = None
    end_location: Optional[LocationData] = None
    outcome: Optional[str] = None
    notes: Optional[str] = None


class VisitPlanCreate(BaseModel):
    employee_id: str
    planned_date: date
    customer_id: Optional[str] = None
    planned_time: Optional[str] = None  # HH:MM format
    purpose: Optional[str] = None
    priority: str = "medium"


class VisitResponse(BaseModel):
    id: str
    company_id: str
    employee_id: str
    employee_name: Optional[str] = None
    customer_id: Optional[str] = None
    customer_name: Optional[str] = None
    enquiry_id: Optional[str] = None
    visit_date: date
    start_km: Optional[float] = None
    end_km: Optional[float] = None
    distance_km: Optional[float] = None
    start_location: Optional[Dict] = None
    end_location: Optional[Dict] = None
    check_in_time: Optional[datetime] = None
    check_out_time: Optional[datetime] = None
    purpose: Optional[str] = None
    notes: Optional[str] = None
    outcome: Optional[str] = None
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


class VisitPlanResponse(BaseModel):
    id: str
    company_id: str
    employee_id: str
    employee_name: Optional[str] = None
    customer_id: Optional[str] = None
    customer_name: Optional[str] = None
    planned_date: date
    planned_time: Optional[str] = None
    purpose: Optional[str] = None
    priority: str
    status: str
    visit_id: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


def _visit_to_response(visit: Visit, db: Session) -> dict:
    """Convert visit to response dict."""
    from app.database.payroll_models import Employee
    
    employee_name = None
    if visit.employee_id:
        employee = db.query(Employee).filter(Employee.id == visit.employee_id).first()
        if employee:
            employee_name = f"{employee.first_name} {employee.last_name}"
    
    customer_name = None
    if visit.customer:
        customer_name = visit.customer.name
    
    return {
        "id": visit.id,
        "company_id": visit.company_id,
        "employee_id": visit.employee_id,
        "employee_name": employee_name,
        "customer_id": visit.customer_id,
        "customer_name": customer_name,
        "enquiry_id": visit.enquiry_id,
        "visit_date": visit.visit_date,
        "start_km": float(visit.start_km) if visit.start_km else None,
        "end_km": float(visit.end_km) if visit.end_km else None,
        "distance_km": float(visit.distance_km) if visit.distance_km else None,
        "start_location": visit.start_location,
        "end_location": visit.end_location,
        "check_in_time": visit.check_in_time,
        "check_out_time": visit.check_out_time,
        "purpose": visit.purpose,
        "notes": visit.notes,
        "outcome": visit.outcome,
        "status": visit.status.value if visit.status else "planned",
        "created_at": visit.created_at,
    }


def _plan_to_response(plan: VisitPlan, db: Session) -> dict:
    """Convert visit plan to response dict."""
    from app.database.payroll_models import Employee
    
    employee_name = None
    if plan.employee_id:
        employee = db.query(Employee).filter(Employee.id == plan.employee_id).first()
        if employee:
            employee_name = f"{employee.first_name} {employee.last_name}"
    
    customer_name = None
    if plan.customer:
        customer_name = plan.customer.name
    
    return {
        "id": plan.id,
        "company_id": plan.company_id,
        "employee_id": plan.employee_id,
        "employee_name": employee_name,
        "customer_id": plan.customer_id,
        "customer_name": customer_name,
        "planned_date": plan.planned_date,
        "planned_time": plan.planned_time.strftime("%H:%M") if plan.planned_time else None,
        "purpose": plan.purpose,
        "priority": plan.priority,
        "status": plan.status,
        "visit_id": plan.visit_id,
        "created_at": plan.created_at,
    }


# ==================== VISIT ENDPOINTS ====================

@router.post("/visits", response_model=VisitResponse)
async def create_visit(
    company_id: str,
    data: VisitCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Create a new visit."""
    get_company_or_404(company_id, current_user, db)
    service = VisitService(db)
    
    visit = service.create_visit(
        company_id=company_id,
        employee_id=data.employee_id,
        visit_date=data.visit_date,
        customer_id=data.customer_id,
        enquiry_id=data.enquiry_id,
        purpose=data.purpose,
        notes=data.notes,
    )
    
    return _visit_to_response(visit, db)


@router.get("/visits")
async def list_visits(
    company_id: str,
    employee_id: Optional[str] = Query(None),
    customer_id: Optional[str] = Query(None),
    from_date: Optional[date] = Query(None),
    to_date: Optional[date] = Query(None),
    status: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """List visits with filters."""
    get_company_or_404(company_id, current_user, db)
    service = VisitService(db)
    
    status_enum = VisitStatus(status) if status else None
    
    visits = service.list_visits(
        company_id=company_id,
        employee_id=employee_id,
        customer_id=customer_id,
        from_date=from_date,
        to_date=to_date,
        status=status_enum,
        skip=skip,
        limit=limit,
    )
    
    return [_visit_to_response(v, db) for v in visits]


@router.get("/visits/{visit_id}", response_model=VisitResponse)
async def get_visit(
    company_id: str,
    visit_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get a visit by ID."""
    get_company_or_404(company_id, current_user, db)
    service = VisitService(db)
    
    visit = service.get_visit(visit_id)
    if not visit or visit.company_id != company_id:
        raise HTTPException(status_code=404, detail="Visit not found")
    
    return _visit_to_response(visit, db)


@router.put("/visits/{visit_id}", response_model=VisitResponse)
async def update_visit(
    company_id: str,
    visit_id: str,
    data: VisitUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update a visit."""
    get_company_or_404(company_id, current_user, db)
    service = VisitService(db)
    
    visit = service.get_visit(visit_id)
    if not visit or visit.company_id != company_id:
        raise HTTPException(status_code=404, detail="Visit not found")
    
    visit = service.update_visit(
        visit_id=visit_id,
        **data.model_dump(exclude_unset=True)
    )
    
    return _visit_to_response(visit, db)


@router.post("/visits/{visit_id}/check-in", response_model=VisitResponse)
async def check_in(
    company_id: str,
    visit_id: str,
    data: CheckInRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Check in for a visit."""
    get_company_or_404(company_id, current_user, db)
    service = VisitService(db)
    
    visit = service.get_visit(visit_id)
    if not visit or visit.company_id != company_id:
        raise HTTPException(status_code=404, detail="Visit not found")
    
    visit = service.check_in(
        visit_id=visit_id,
        start_km=Decimal(str(data.start_km)) if data.start_km else None,
        start_location=data.start_location.model_dump() if data.start_location else None,
    )
    
    return _visit_to_response(visit, db)


@router.post("/visits/{visit_id}/check-out", response_model=VisitResponse)
async def check_out(
    company_id: str,
    visit_id: str,
    data: CheckOutRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Check out from a visit."""
    get_company_or_404(company_id, current_user, db)
    service = VisitService(db)
    
    visit = service.get_visit(visit_id)
    if not visit or visit.company_id != company_id:
        raise HTTPException(status_code=404, detail="Visit not found")
    
    visit = service.check_out(
        visit_id=visit_id,
        end_km=Decimal(str(data.end_km)) if data.end_km else None,
        end_location=data.end_location.model_dump() if data.end_location else None,
        outcome=data.outcome,
        notes=data.notes,
    )
    
    return _visit_to_response(visit, db)


@router.post("/visits/{visit_id}/cancel", response_model=VisitResponse)
async def cancel_visit(
    company_id: str,
    visit_id: str,
    reason: Optional[str] = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Cancel a visit."""
    get_company_or_404(company_id, current_user, db)
    service = VisitService(db)
    
    visit = service.get_visit(visit_id)
    if not visit or visit.company_id != company_id:
        raise HTTPException(status_code=404, detail="Visit not found")
    
    visit = service.cancel_visit(visit_id, reason)
    return _visit_to_response(visit, db)


# ==================== VISIT PLAN ENDPOINTS ====================

@router.post("/visit-plans", response_model=VisitPlanResponse)
async def create_visit_plan(
    company_id: str,
    data: VisitPlanCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Create a new visit plan."""
    get_company_or_404(company_id, current_user, db)
    service = VisitService(db)
    
    # Parse time if provided
    planned_time = None
    if data.planned_time:
        try:
            planned_time = datetime.strptime(data.planned_time, "%H:%M").time()
        except ValueError:
            pass
    
    plan = service.create_visit_plan(
        company_id=company_id,
        employee_id=data.employee_id,
        planned_date=data.planned_date,
        customer_id=data.customer_id,
        planned_time=planned_time,
        purpose=data.purpose,
        priority=data.priority,
    )
    
    return _plan_to_response(plan, db)


@router.get("/visit-plans")
async def list_visit_plans(
    company_id: str,
    employee_id: Optional[str] = Query(None),
    from_date: Optional[date] = Query(None),
    to_date: Optional[date] = Query(None),
    status: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """List visit plans with filters."""
    get_company_or_404(company_id, current_user, db)
    service = VisitService(db)
    
    plans = service.list_visit_plans(
        company_id=company_id,
        employee_id=employee_id,
        from_date=from_date,
        to_date=to_date,
        status=status,
        skip=skip,
        limit=limit,
    )
    
    return [_plan_to_response(p, db) for p in plans]


@router.post("/visit-plans/{plan_id}/convert-to-visit", response_model=VisitResponse)
async def convert_plan_to_visit(
    company_id: str,
    plan_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Convert a visit plan to an actual visit."""
    get_company_or_404(company_id, current_user, db)
    service = VisitService(db)
    
    plan = service.get_visit_plan(plan_id)
    if not plan or plan.company_id != company_id:
        raise HTTPException(status_code=404, detail="Visit plan not found")
    
    visit = service.convert_plan_to_visit(plan_id)
    if not visit:
        raise HTTPException(status_code=400, detail="Failed to convert plan to visit")
    
    return _visit_to_response(visit, db)


# ==================== REPORT ENDPOINTS ====================

@router.get("/visits/reports/trip")
async def get_trip_report(
    company_id: str,
    employee_id: Optional[str] = Query(None),
    from_date: Optional[date] = Query(None),
    to_date: Optional[date] = Query(None),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get trip report with distance and visit summaries."""
    get_company_or_404(company_id, current_user, db)
    service = VisitService(db)
    
    return service.get_trip_report(
        company_id=company_id,
        employee_id=employee_id,
        from_date=from_date,
        to_date=to_date,
    )


@router.get("/visits/reports/km-summary")
async def get_km_summary(
    company_id: str,
    employee_id: Optional[str] = Query(None),
    from_date: Optional[date] = Query(None),
    to_date: Optional[date] = Query(None),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get KM summary by employee."""
    get_company_or_404(company_id, current_user, db)
    service = VisitService(db)
    
    return service.get_km_summary(
        company_id=company_id,
        employee_id=employee_id,
        from_date=from_date,
        to_date=to_date,
    )


@router.get("/visits/pending")
async def get_pending_visits(
    company_id: str,
    employee_id: Optional[str] = Query(None),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get pending visit plans."""
    get_company_or_404(company_id, current_user, db)
    service = VisitService(db)
    
    plans = service.get_pending_visits(
        company_id=company_id,
        employee_id=employee_id,
    )
    
    return [_plan_to_response(p, db) for p in plans]
