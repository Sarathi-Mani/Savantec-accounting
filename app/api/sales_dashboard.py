"""API endpoints for sales dashboard analytics."""
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from datetime import date

from app.database.connection import get_db
from app.database.models import Company
from app.services.sales_dashboard_service import SalesDashboardService

router = APIRouter(prefix="/api/companies/{company_id}/sales-dashboard", tags=["sales-dashboard"])


def get_company(db: Session, company_id: str) -> Company:
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    return company


@router.get("/summary")
def get_dashboard_summary(
    company_id: str,
    db: Session = Depends(get_db),
):
    """Get complete dashboard summary."""
    get_company(db, company_id)
    
    service = SalesDashboardService(db)
    return service.get_dashboard_summary(company_id)


@router.get("/pipeline-funnel")
def get_pipeline_funnel(
    company_id: str,
    db: Session = Depends(get_db),
):
    """Get pipeline funnel data."""
    get_company(db, company_id)
    
    service = SalesDashboardService(db)
    return service.get_pipeline_funnel(company_id)


@router.get("/conversion-rates")
def get_conversion_rates(
    company_id: str,
    from_date: Optional[date] = Query(None),
    to_date: Optional[date] = Query(None),
    db: Session = Depends(get_db),
):
    """Get conversion rates between stages."""
    get_company(db, company_id)
    
    service = SalesDashboardService(db)
    return service.get_conversion_rates(
        company_id=company_id,
        from_date=from_date,
        to_date=to_date,
    )


@router.get("/sales-by-person")
def get_sales_by_person(
    company_id: str,
    from_date: Optional[date] = Query(None),
    to_date: Optional[date] = Query(None),
    db: Session = Depends(get_db),
):
    """Get sales performance by sales person."""
    get_company(db, company_id)
    
    service = SalesDashboardService(db)
    return service.get_sales_by_person(
        company_id=company_id,
        from_date=from_date,
        to_date=to_date,
    )


@router.get("/enquiry-sources")
def get_enquiry_sources(
    company_id: str,
    from_date: Optional[date] = Query(None),
    to_date: Optional[date] = Query(None),
    db: Session = Depends(get_db),
):
    """Get enquiry distribution by source."""
    get_company(db, company_id)
    
    service = SalesDashboardService(db)
    return service.get_enquiry_sources(
        company_id=company_id,
        from_date=from_date,
        to_date=to_date,
    )


@router.get("/monthly-trend")
def get_monthly_trend(
    company_id: str,
    months: int = Query(12, ge=1, le=24),
    db: Session = Depends(get_db),
):
    """Get monthly trend of enquiries, quotations, and invoices."""
    get_company(db, company_id)
    
    service = SalesDashboardService(db)
    return service.get_monthly_trend(
        company_id=company_id,
        months=months,
    )


@router.get("/deal-cycle")
def get_deal_cycle(
    company_id: str,
    from_date: Optional[date] = Query(None),
    to_date: Optional[date] = Query(None),
    db: Session = Depends(get_db),
):
    """Get average deal cycle time."""
    get_company(db, company_id)
    
    service = SalesDashboardService(db)
    return service.get_average_deal_cycle(
        company_id=company_id,
        from_date=from_date,
        to_date=to_date,
    )


@router.get("/top-customers")
def get_top_customers(
    company_id: str,
    limit: int = Query(10, ge=1, le=50),
    from_date: Optional[date] = Query(None),
    to_date: Optional[date] = Query(None),
    db: Session = Depends(get_db),
):
    """Get top customers by won deal value."""
    get_company(db, company_id)
    
    service = SalesDashboardService(db)
    return service.get_top_customers(
        company_id=company_id,
        limit=limit,
        from_date=from_date,
        to_date=to_date,
    )


# ==================== SALES REPORTS ====================

@router.get("/sales-by-brand")
def get_sales_by_brand(
    company_id: str,
    from_date: Optional[date] = Query(None),
    to_date: Optional[date] = Query(None),
    db: Session = Depends(get_db),
):
    """
    Get sales report grouped by brand.
    
    Returns for each brand: invoice count, total quantity, total amount, percentage.
    """
    get_company(db, company_id)
    
    service = SalesDashboardService(db)
    return service.get_sales_by_brand(
        company_id=company_id,
        from_date=from_date,
        to_date=to_date,
    )


@router.get("/sales-by-state")
def get_sales_by_state(
    company_id: str,
    from_date: Optional[date] = Query(None),
    to_date: Optional[date] = Query(None),
    db: Session = Depends(get_db),
):
    """
    Get sales report grouped by customer state.
    
    Returns for each state: invoice count, customer count, total amount, GST breakdown.
    """
    get_company(db, company_id)
    
    service = SalesDashboardService(db)
    return service.get_sales_by_state(
        company_id=company_id,
        from_date=from_date,
        to_date=to_date,
    )


@router.get("/sales-by-category")
def get_sales_by_category(
    company_id: str,
    from_date: Optional[date] = Query(None),
    to_date: Optional[date] = Query(None),
    db: Session = Depends(get_db),
):
    """
    Get sales report grouped by product category.
    
    Returns for each category: invoice count, total quantity, total amount, percentage.
    """
    get_company(db, company_id)
    
    service = SalesDashboardService(db)
    return service.get_sales_by_category(
        company_id=company_id,
        from_date=from_date,
        to_date=to_date,
    )


@router.get("/engineer-performance")
def get_engineer_performance(
    company_id: str,
    employee_id: Optional[str] = Query(None),
    from_date: Optional[date] = Query(None),
    to_date: Optional[date] = Query(None),
    db: Session = Depends(get_db),
):
    """
    Get comprehensive performance report for sales engineers.
    
    Returns for each engineer: enquiries, quotations, invoices, conversion rate, target achievement.
    """
    get_company(db, company_id)
    
    service = SalesDashboardService(db)
    return service.get_engineer_performance(
        company_id=company_id,
        employee_id=employee_id,
        from_date=from_date,
        to_date=to_date,
    )


@router.get("/admin-summary")
def get_admin_dashboard_summary(
    company_id: str,
    db: Session = Depends(get_db),
):
    """
    Get combined admin dashboard with all key metrics.
    
    Includes today's stats, monthly/yearly sales, pending payments, top performers.
    """
    get_company(db, company_id)
    
    service = SalesDashboardService(db)
    return service.get_admin_dashboard_summary(company_id)


@router.get("/engineer-dashboard/{employee_id}")
def get_engineer_dashboard(
    company_id: str,
    employee_id: str,
    db: Session = Depends(get_db),
):
    """
    Get engineer-specific dashboard with their own metrics.
    
    Includes personal stats, pending tasks, targets, and recent activity.
    """
    get_company(db, company_id)
    
    service = SalesDashboardService(db)
    
    from datetime import timedelta
    from datetime import datetime
    
    today = datetime.utcnow().date()
    month_start = today.replace(day=1)
    
    # Get engineer's performance
    performance = service.get_engineer_performance(
        company_id=company_id,
        employee_id=employee_id,
        from_date=month_start,
        to_date=today,
    )
    
    my_stats = performance[0] if performance else {
        "enquiries": 0,
        "quotations": 0,
        "quotation_value": 0,
        "invoices": 0,
        "invoice_value": 0,
        "conversion_rate": 0,
        "target_amount": 0,
        "achievement_percent": 0,
    }
    
    # Get pending enquiries
    from app.database.models import Enquiry, Quotation, EnquiryStatus
    
    pending_enquiries = db.query(Enquiry).filter(
        Enquiry.company_id == company_id,
        Enquiry.sales_person_id == employee_id,
        Enquiry.status == EnquiryStatus.OPEN,
    ).count()
    
    # Get pending quotations (not converted)
    from app.database.models import QuotationStatus
    
    pending_quotations = db.query(Quotation).filter(
        Quotation.company_id == company_id,
        Quotation.sales_person_id == employee_id,
        Quotation.status.in_([QuotationStatus.DRAFT, QuotationStatus.SENT]),
    ).count()
    
    # Get today's visits
    from app.database.models import Visit, VisitStatus, VisitPlan
    
    todays_visits = db.query(Visit).filter(
        Visit.company_id == company_id,
        Visit.employee_id == employee_id,
        Visit.visit_date == today,
    ).all()
    
    # Get pending visit plans
    pending_visits = db.query(VisitPlan).filter(
        VisitPlan.company_id == company_id,
        VisitPlan.employee_id == employee_id,
        VisitPlan.status == "pending",
        VisitPlan.planned_date >= today,
    ).count()
    
    return {
        "employee_id": employee_id,
        "period": "current_month",
        "my_performance": my_stats,
        "pending_tasks": {
            "enquiries": pending_enquiries,
            "quotations": pending_quotations,
            "visits": pending_visits,
        },
        "todays_visits": [
            {
                "id": v.id,
                "customer_name": v.customer.name if v.customer else None,
                "status": v.status.value if v.status else "planned",
                "check_in_time": v.check_in_time.isoformat() if v.check_in_time else None,
            }
            for v in todays_visits
        ],
    }

