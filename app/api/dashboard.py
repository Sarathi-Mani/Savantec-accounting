"""Dashboard API routes."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.connection import get_db
from app.database.models import User, Company
from app.services.invoice_service import InvoiceService
from app.services.company_service import CompanyService
from app.auth.dependencies import get_current_active_user

router = APIRouter(prefix="/companies/{company_id}/dashboard", tags=["Dashboard"])


# app/api/dashboard.py
def get_company_or_404(company_id: str, current_user, db: Session) -> Company:
    """Get company or raise 404 - handles both users and employees."""
    
    # Handle employee (dict) case
    if isinstance(current_user, dict) and current_user.get("is_employee"):
        # For employees, they can only access their own company
        employee_company_id = current_user.get("company_id")
        if str(employee_company_id) != company_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to access this company"
            )
        
        # Get the company for employee
        company = db.query(Company).filter(Company.id == company_id).first()
        if not company:
            raise HTTPException(status_code=404, detail="Company not found")
        
        return company
    
    # Handle regular user (User object) case
    elif hasattr(current_user, 'id'):
        company = db.query(Company).filter(
            Company.id == company_id,
            Company.user_id == current_user.id
        ).first()
        
        if not company:
            raise HTTPException(status_code=404, detail="Company not found")
        
        return company
    
    # Handle user in dict format
    elif isinstance(current_user, dict) and current_user.get("id"):
        company = db.query(Company).filter(
            Company.id == company_id,
            Company.user_id == current_user.get("id")
        ).first()
        
        if not company:
            raise HTTPException(status_code=404, detail="Company not found")
        
        return company
    
    else:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication data"
        )
    
    
@router.get("/summary")
async def get_dashboard_summary(
    company_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get dashboard summary with key metrics."""
    company = get_company_or_404(company_id, current_user, db)
    
    invoice_service = InvoiceService(db)
    summary = invoice_service.get_dashboard_summary(company)
    
    return {
        "company": {
            "id": company.id,
            "name": company.name,
            "gstin": company.gstin
        },
        "invoices": {
            "total": summary["total_invoices"],
            "current_month": summary["current_month_invoices"]
        },
        "revenue": {
            "total": float(summary["total_revenue"]),
            "current_month": float(summary["current_month_revenue"]),
            "pending": float(summary["total_pending"]),
            "paid": float(summary["total_paid"])
        },
        "overdue": {
            "count": summary["overdue_count"],
            "amount": float(summary["overdue_amount"])
        },
        "gst": {
            "cgst": float(summary["total_cgst"]),
            "sgst": float(summary["total_sgst"]),
            "igst": float(summary["total_igst"]),
            "total": float(summary["total_cgst"] + summary["total_sgst"] + summary["total_igst"])
        }
    }


@router.get("/recent-invoices")
async def get_recent_invoices(
    company_id: str,
    limit: int = 5,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get recent invoices for dashboard."""
    company = get_company_or_404(company_id, current_user, db)
    
    invoice_service = InvoiceService(db)
    invoices, _, _ = invoice_service.get_invoices(company, page=1, page_size=limit)
    
    return [
        {
            "id": inv.id,
            "invoice_number": inv.invoice_number,
            "customer_name": inv.customer.name if inv.customer else "Walk-in",
            "total_amount": float(inv.total_amount),
            "balance_due": float(inv.balance_due),
            "status": inv.status.value,
            "invoice_date": inv.invoice_date.isoformat()
        }
        for inv in invoices
    ]


@router.get("/outstanding-invoices")
async def get_outstanding_invoices(
    company_id: str,
    limit: int = 10,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get outstanding (unpaid/partially paid) invoices."""
    company = get_company_or_404(company_id, current_user, db)
    
    invoice_service = InvoiceService(db)
    invoices, _, _ = invoice_service.get_invoices(
        company,
        page=1,
        page_size=limit,
        status="pending"
    )
    
    # Also get partially paid
    partial_invoices, _, _ = invoice_service.get_invoices(
        company,
        page=1,
        page_size=limit,
        status="partially_paid"
    )
    
    all_invoices = invoices + partial_invoices
    all_invoices.sort(key=lambda x: x.invoice_date, reverse=True)
    
    return [
        {
            "id": inv.id,
            "invoice_number": inv.invoice_number,
            "customer_name": inv.customer.name if inv.customer else "Walk-in",
            "total_amount": float(inv.total_amount),
            "amount_paid": float(inv.amount_paid),
            "balance_due": float(inv.balance_due),
            "status": inv.status.value,
            "invoice_date": inv.invoice_date.isoformat(),
            "due_date": inv.due_date.isoformat() if inv.due_date else None
        }
        for inv in all_invoices[:limit]
    ]

