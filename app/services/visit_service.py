"""Visit Service - Field visit tracking and management."""
from datetime import datetime, date, time
from decimal import Decimal
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
import math

from app.database.models import (
    Visit, VisitStatus, Customer, Company,
    generate_uuid
)
from app.database.payroll_models import Employee


class VisitService:
    """Service for managing field visits."""
    
    def __init__(self, db: Session):
        self.db = db
    
    def _calculate_distance(
        self,
        lat1: float, lng1: float,
        lat2: float, lng2: float
    ) -> float:
        """
        Calculate distance between two points using Haversine formula.
        
        Returns distance in kilometers.
        """
        R = 6371  # Earth's radius in kilometers
        
        lat1_rad = math.radians(lat1)
        lat2_rad = math.radians(lat2)
        delta_lat = math.radians(lat2 - lat1)
        delta_lng = math.radians(lng2 - lng1)
        
        a = math.sin(delta_lat / 2) ** 2 + \
            math.cos(lat1_rad) * math.cos(lat2_rad) * \
            math.sin(delta_lng / 2) ** 2
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        
        return round(R * c, 2)
    
    # ==================== VISITS ====================
    
    def create_visit(
        self,
        company_id: str,
        employee_id: str,
        visit_date: date,
        customer_id: Optional[str] = None,
        enquiry_id: Optional[str] = None,
        purpose: Optional[str] = None,
        notes: Optional[str] = None,
    ) -> Visit:
        """Create a new visit."""
        visit = Visit(
            id=generate_uuid(),
            company_id=company_id,
            employee_id=employee_id,
            customer_id=customer_id,
            enquiry_id=enquiry_id,
            visit_date=visit_date,
            purpose=purpose,
            notes=notes,
            status=VisitStatus.PLANNED,
        )
        self.db.add(visit)
        self.db.commit()
        self.db.refresh(visit)
        return visit
    
    def get_visit(self, visit_id: str) -> Optional[Visit]:
        """Get a visit by ID."""
        return self.db.query(Visit).filter(Visit.id == visit_id).first()
    
    def list_visits(
        self,
        company_id: str,
        employee_id: Optional[str] = None,
        customer_id: Optional[str] = None,
        from_date: Optional[date] = None,
        to_date: Optional[date] = None,
        status: Optional[VisitStatus] = None,
        skip: int = 0,
        limit: int = 50,
    ) -> List[Visit]:
        """List visits with filters."""
        query = self.db.query(Visit).filter(Visit.company_id == company_id)
        
        if employee_id:
            query = query.filter(Visit.employee_id == employee_id)
        if customer_id:
            query = query.filter(Visit.customer_id == customer_id)
        if from_date:
            query = query.filter(Visit.visit_date >= from_date)
        if to_date:
            query = query.filter(Visit.visit_date <= to_date)
        if status:
            query = query.filter(Visit.status == status)
        
        return query.order_by(Visit.visit_date.desc()).offset(skip).limit(limit).all()
    
    def check_in(
        self,
        visit_id: str,
        start_km: Optional[Decimal] = None,
        start_location: Optional[Dict] = None,
    ) -> Optional[Visit]:
        """Check in for a visit."""
        visit = self.get_visit(visit_id)
        if not visit:
            return None
        
        visit.check_in_time = datetime.utcnow()
        visit.start_km = start_km
        visit.start_location = start_location
        visit.status = VisitStatus.IN_PROGRESS
        
        self.db.commit()
        self.db.refresh(visit)
        return visit
    
    def check_out(
        self,
        visit_id: str,
        end_km: Optional[Decimal] = None,
        end_location: Optional[Dict] = None,
        outcome: Optional[str] = None,
        notes: Optional[str] = None,
    ) -> Optional[Visit]:
        """Check out from a visit."""
        visit = self.get_visit(visit_id)
        if not visit:
            return None
        
        visit.check_out_time = datetime.utcnow()
        visit.end_km = end_km
        visit.end_location = end_location
        visit.status = VisitStatus.COMPLETED
        
        if outcome:
            visit.outcome = outcome
        if notes:
            if visit.notes:
                visit.notes = f"{visit.notes}\n\nCheckout: {notes}"
            else:
                visit.notes = notes
        
        # Calculate distance
        if visit.start_km and visit.end_km:
            visit.distance_km = Decimal(str(visit.end_km)) - Decimal(str(visit.start_km))
        elif visit.start_location and visit.end_location:
            # Use GPS coordinates
            if all(k in visit.start_location for k in ['lat', 'lng']) and \
               all(k in visit.end_location for k in ['lat', 'lng']):
                distance = self._calculate_distance(
                    visit.start_location['lat'], visit.start_location['lng'],
                    visit.end_location['lat'], visit.end_location['lng']
                )
                visit.distance_km = Decimal(str(distance))
        
        self.db.commit()
        self.db.refresh(visit)
        return visit
    
    def update_visit(
        self,
        visit_id: str,
        **kwargs
    ) -> Optional[Visit]:
        """Update a visit."""
        visit = self.get_visit(visit_id)
        if not visit:
            return None
        
        for key, value in kwargs.items():
            if hasattr(visit, key) and value is not None:
                setattr(visit, key, value)
        
        visit.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(visit)
        return visit
    
    def cancel_visit(self, visit_id: str, reason: Optional[str] = None) -> Optional[Visit]:
        """Cancel a visit."""
        visit = self.get_visit(visit_id)
        if not visit:
            return None
        
        visit.status = VisitStatus.CANCELLED
        if reason:
            visit.notes = f"{visit.notes or ''}\n\nCancellation reason: {reason}"
        
        visit.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(visit)
        return visit
    
    
    # ==================== REPORTS ====================
    
    def get_trip_report(
        self,
        company_id: str,
        employee_id: Optional[str] = None,
        from_date: Optional[date] = None,
        to_date: Optional[date] = None,
    ) -> Dict[str, Any]:
        """Get trip report with distance and visit summaries."""
        query = self.db.query(Visit).filter(
            Visit.company_id == company_id,
            Visit.status == VisitStatus.COMPLETED
        )
        
        if employee_id:
            query = query.filter(Visit.employee_id == employee_id)
        if from_date:
            query = query.filter(Visit.visit_date >= from_date)
        if to_date:
            query = query.filter(Visit.visit_date <= to_date)
        
        visits = query.all()
        
        # Group by employee
        employee_data = {}
        for visit in visits:
            emp_id = visit.employee_id
            if emp_id not in employee_data:
                employee = self.db.query(Employee).filter(Employee.id == emp_id).first()
                employee_data[emp_id] = {
                    "employee_id": emp_id,
                    "employee_name": f"{employee.first_name} {employee.last_name}" if employee else "Unknown",
                    "total_visits": 0,
                    "total_distance_km": Decimal("0"),
                    "visits": [],
                }
            
            employee_data[emp_id]["total_visits"] += 1
            employee_data[emp_id]["total_distance_km"] += visit.distance_km or Decimal("0")
            employee_data[emp_id]["visits"].append({
                "visit_id": visit.id,
                "visit_date": visit.visit_date.isoformat() if visit.visit_date else None,
                "customer_name": visit.customer.name if visit.customer else None,
                "distance_km": float(visit.distance_km or 0),
                "purpose": visit.purpose,
                "outcome": visit.outcome,
            })
        
        # Convert to list
        report_data = []
        for emp_id, data in employee_data.items():
            data["total_distance_km"] = float(data["total_distance_km"])
            report_data.append(data)
        
        return {
            "report": report_data,
            "summary": {
                "total_employees": len(report_data),
                "total_visits": sum(d["total_visits"] for d in report_data),
                "total_distance_km": sum(d["total_distance_km"] for d in report_data),
            }
        }
    
    def get_km_summary(
        self,
        company_id: str,
        employee_id: Optional[str] = None,
        from_date: Optional[date] = None,
        to_date: Optional[date] = None,
    ) -> Dict[str, Any]:
        """Get KM summary by employee."""
        query = self.db.query(
            Visit.employee_id,
            func.count(Visit.id).label("visit_count"),
            func.sum(Visit.distance_km).label("total_km"),
        ).filter(
            Visit.company_id == company_id,
            Visit.status == VisitStatus.COMPLETED
        )
        
        if employee_id:
            query = query.filter(Visit.employee_id == employee_id)
        if from_date:
            query = query.filter(Visit.visit_date >= from_date)
        if to_date:
            query = query.filter(Visit.visit_date <= to_date)
        
        results = query.group_by(Visit.employee_id).all()
        
        summary = []
        for row in results:
            employee = self.db.query(Employee).filter(Employee.id == row.employee_id).first()
            summary.append({
                "employee_id": row.employee_id,
                "employee_name": f"{employee.first_name} {employee.last_name}" if employee else "Unknown",
                "visit_count": row.visit_count or 0,
                "total_km": float(row.total_km or 0),
            })
        
        return {
            "summary": summary,
            "total_km": sum(s["total_km"] for s in summary),
            "total_visits": sum(s["visit_count"] for s in summary),
        }
    
