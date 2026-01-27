"""Service layer for designations management."""
from typing import List, Optional, Dict
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc, asc

from app.database.payroll_models import Designation, Employee
from app.schemas.base import PaginatedResponse

class DesignationService:
    """Service for designation-related operations."""
    
    @staticmethod
    def create_designation(
        db: Session,
        company_id: str,
        name: str,
        code: Optional[str] = None,
        description: Optional[str] = None,
        level: int = 1,
        is_active: bool = True,
          permissions: Optional[List[str]] = None, 
    ) -> Designation:
        """Create a new designation."""
        # Check if designation with same name or code already exists
        existing = db.query(Designation).filter(
            Designation.company_id == company_id,
            or_(
                Designation.name == name,
                Designation.code == code
            )
        ).first()
        
        if existing:
            if existing.name == name:
                raise ValueError(f"Designation with name '{name}' already exists")
            if code and existing.code == code:
                raise ValueError(f"Designation with code '{code}' already exists")
        
        designation = Designation(
            company_id=company_id,
            name=name,
            code=code,
            description=description,
            level=level,
            is_active=is_active,
             permissions=permissions or [],
        )
        
        db.add(designation)
        db.commit()
        db.refresh(designation)
        
        return designation
    
    @staticmethod
    def update_designation(
        db: Session,
        designation_id: str,
        company_id: str,
        **kwargs
    ) -> Designation:
        """Update an existing designation."""
        designation = db.query(Designation).filter(
            Designation.id == designation_id,
            Designation.company_id == company_id
        ).first()
        
        if not designation:
            raise ValueError("Designation not found")
        
        # Check for duplicate name/code
        if 'name' in kwargs:
            existing = db.query(Designation).filter(
                Designation.company_id == company_id,
                Designation.name == kwargs['name'],
                Designation.id != designation_id
            ).first()
            if existing:
                raise ValueError(f"Designation with name '{kwargs['name']}' already exists")
        
        if 'code' in kwargs and kwargs['code']:
            existing = db.query(Designation).filter(
                Designation.company_id == company_id,
                Designation.code == kwargs['code'],
                Designation.id != designation_id
            ).first()
            if existing:
                raise ValueError(f"Designation with code '{kwargs['code']}' already exists")
        
        for key, value in kwargs.items():
            if hasattr(designation, key) and value is not None:
                setattr(designation, key, value)
        
        designation.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(designation)
        
        return designation
    
    @staticmethod
    def get_designation_by_id(
        db: Session,
        designation_id: str,
        company_id: str
    ) -> Optional[Designation]:
        """Get designation by ID."""
        return db.query(Designation).filter(
            Designation.id == designation_id,
            Designation.company_id == company_id
        ).first()
    
    @staticmethod
    def get_designations(
        db: Session,
        company_id: str,
        page: int = 1,
        limit: int = 10,
        search: Optional[str] = None,
        status: Optional[str] = None,
        sort_by: str = "name",
        sort_order: str = "asc"
    ) -> PaginatedResponse:
        """Get paginated list of designations with filtering."""
        query = db.query(Designation).filter(
            Designation.company_id == company_id
        )
        
        # Apply search filter
        if search:
            search_term = f"%{search}%"
            query = query.filter(
                or_(
                    Designation.name.ilike(search_term),
                    Designation.code.ilike(search_term),
                    Designation.description.ilike(search_term)
                )
            )
        
        # Apply status filter
        if status == "active":
            query = query.filter(Designation.is_active == True)
        elif status == "inactive":
            query = query.filter(Designation.is_active == False)
        
        # Get total count before pagination
        total_count = query.count()
        
        # Apply sorting
        sort_column = getattr(Designation, sort_by, Designation.name)
        if sort_order.lower() == "desc":
            query = query.order_by(desc(sort_column))
        else:
            query = query.order_by(asc(sort_column))
        
        # Apply pagination
        offset = (page - 1) * limit
        designations = query.offset(offset).limit(limit).all()
        
        # Count employees in each designation
        for designation in designations:
            designation.employee_count = db.query(Employee).filter(
                Employee.designation_id == designation.id,
                Employee.status == 'active'
            ).count()
        
        return PaginatedResponse(
            items=designations,
            total=total_count,
            page=page,
            limit=limit,
            total_pages=(total_count + limit - 1) // limit
        )
    
    @staticmethod
    def delete_designation(
        db: Session,
        designation_id: str,
        company_id: str
    ) -> bool:
        """Delete a designation (soft delete by marking as inactive)."""
        designation = db.query(Designation).filter(
            Designation.id == designation_id,
            Designation.company_id == company_id
        ).first()
        
        if not designation:
            raise ValueError("Designation not found")
        
        # Check if designation has active employees
        employee_count = db.query(Employee).filter(
            Employee.designation_id == designation_id,
            Employee.status == 'active'
        ).count()
        
        if employee_count > 0:
            raise ValueError(f"Cannot delete designation. It has {employee_count} active employees assigned.")
        
        # Soft delete by marking as inactive
        designation.is_active = False
        designation.updated_at = datetime.utcnow()
        db.commit()
        
        return True
    
    @staticmethod
    def toggle_designation_status(
        db: Session,
        designation_id: str,
        company_id: str,
        is_active: bool
    ) -> Designation:
        """Toggle designation active status."""
        designation = db.query(Designation).filter(
            Designation.id == designation_id,
            Designation.company_id == company_id
        ).first()
        
        if not designation:
            raise ValueError("Designation not found")
        
        designation.is_active = is_active
        designation.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(designation)
        
        return designation
    
    @staticmethod
    def get_all_active_designations(
        db: Session,
        company_id: str
    ) -> List[Designation]:
        """Get all active designations for dropdowns."""
        return db.query(Designation).filter(
            Designation.company_id == company_id,
            Designation.is_active == True
        ).order_by(Designation.level, Designation.name).all()
    
    @staticmethod
    def get_designation_stats(
        db: Session,
        company_id: str
    ) -> Dict:
        """Get designation statistics."""
        total_designations = db.query(Designation).filter(
            Designation.company_id == company_id
        ).count()
        
        active_designations = db.query(Designation).filter(
            Designation.company_id == company_id,
            Designation.is_active == True
        ).count()
        
        # Get top designations by employee count
        from sqlalchemy import func
        top_designations = db.query(
            Designation.name,
            Designation.id,
            func.count(Employee.id).label('employee_count')
        ).outerjoin(
            Employee,
            Employee.designation_id == Designation.id
        ).filter(
            Designation.company_id == company_id,
            Designation.is_active == True,
            Employee.status == 'active'
        ).group_by(
            Designation.id
        ).order_by(
            func.count(Employee.id).desc()
        ).limit(5).all()
        
        return {
            "total_designations": total_designations,
            "active_designations": active_designations,
            "inactive_designations": total_designations - active_designations,
            "top_designations": [
                {
                    "id": d.id,
                    "name": d.name,
                    "employee_count": d.employee_count
                }
                for d in top_designations
            ]
        }