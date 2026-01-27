"""Enquiry service for managing sales enquiries."""
from datetime import datetime, date, timedelta
from decimal import Decimal
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, case, extract

from app.database.models import (
    Enquiry, EnquiryStatus, EnquirySource, EnquiryItem,
    SalesTicket, SalesTicketStatus, SalesTicketStage,
    SalesTicketLog, SalesTicketLogAction,
    Quotation, QuotationStatus,
    Customer, Contact, Company, Product, Brand
)
from app.database.payroll_models import Employee


class EnquiryService:
    """Service for managing sales enquiries."""
    
    def __init__(self, db: Session):
        self.db = db
    
    def _generate_enquiry_number(self, company_id: str) -> str:
        """Generate a unique enquiry number."""
        today = datetime.utcnow()
        prefix = f"ENQ-{today.strftime('%Y%m')}-"
        
        # Get the last enquiry number for this month
        last_enquiry = self.db.query(Enquiry).filter(
            and_(
                Enquiry.company_id == company_id,
                Enquiry.enquiry_number.like(f"{prefix}%")
            )
        ).order_by(Enquiry.enquiry_number.desc()).first()
        
        if last_enquiry:
            last_num = int(last_enquiry.enquiry_number.split("-")[-1])
            new_num = last_num + 1
        else:
            new_num = 1
        
        return f"{prefix}{new_num:04d}"
    
    def _generate_ticket_number(self, company_id: str) -> str:
        """Generate a unique sales ticket number."""
        today = datetime.utcnow()
        prefix = f"TKT-{today.strftime('%Y%m')}-"
        
        # Get the last ticket number for this month
        last_ticket = self.db.query(SalesTicket).filter(
            and_(
                SalesTicket.company_id == company_id,
                SalesTicket.ticket_number.like(f"{prefix}%")
            )
        ).order_by(SalesTicket.ticket_number.desc()).first()
        
        if last_ticket:
            last_num = int(last_ticket.ticket_number.split("-")[-1])
            new_num = last_num + 1
        else:
            new_num = 1
        
        return f"{prefix}{new_num:04d}"
    
    def create_enquiry(
        self,
        company_id: str,
        subject: str,
        customer_id: Optional[str] = None,
        contact_id: Optional[str] = None,
        sales_person_id: Optional[str] = None,
        prospect_name: Optional[str] = None,
        prospect_email: Optional[str] = None,
        prospect_phone: Optional[str] = None,
        prospect_company: Optional[str] = None,
        source: EnquirySource = EnquirySource.OTHER,
        source_details: Optional[str] = None,
        description: Optional[str] = None,
        requirements: Optional[str] = None,
        products_interested: Optional[List[Dict]] = None,
        expected_value: Decimal = Decimal("0"),
        expected_quantity: Optional[Decimal] = None,
        expected_close_date: Optional[datetime] = None,
        priority: str = "medium",
        notes: Optional[str] = None,
        user_id: Optional[str] = None,
        user_name: Optional[str] = None,
    ) -> Enquiry:
        """Create a new enquiry and auto-generate a sales ticket."""
        
        # Generate enquiry number
        enquiry_number = self._generate_enquiry_number(company_id)
        
        # Create sales ticket first
        ticket = SalesTicket(
            company_id=company_id,
            ticket_number=self._generate_ticket_number(company_id),
            customer_id=customer_id,
            contact_id=contact_id,
            sales_person_id=sales_person_id,
            status=SalesTicketStatus.OPEN,
            current_stage=SalesTicketStage.ENQUIRY,
            expected_value=expected_value,
            expected_close_date=expected_close_date,
        )
        self.db.add(ticket)
        self.db.flush()  # Get the ticket ID
        
        # Create enquiry
        enquiry = Enquiry(
            company_id=company_id,
            enquiry_number=enquiry_number,
            enquiry_date=datetime.utcnow(),
            sales_ticket_id=ticket.id,
            customer_id=customer_id,
            contact_id=contact_id,
            sales_person_id=sales_person_id,
            prospect_name=prospect_name,
            prospect_email=prospect_email,
            prospect_phone=prospect_phone,
            prospect_company=prospect_company,
            source=source,
            source_details=source_details,
            subject=subject,
            description=description,
            requirements=requirements,
            products_interested=products_interested,
            expected_value=expected_value,
            expected_quantity=expected_quantity,
            expected_close_date=expected_close_date,
            status=EnquiryStatus.NEW,
            priority=priority,
            notes=notes,
        )
        self.db.add(enquiry)
        self.db.flush()
        
        # Log the creation
        log = SalesTicketLog(
            sales_ticket_id=ticket.id,
            action_type=SalesTicketLogAction.CREATED,
            action_description=f"Sales ticket created from enquiry {enquiry_number}",
            related_document_type="enquiry",
            related_document_id=enquiry.id,
            created_by=user_id,
            created_by_name=user_name or "System",
        )
        self.db.add(log)
        
        # Also log enquiry creation
        enquiry_log = SalesTicketLog(
            sales_ticket_id=ticket.id,
            action_type=SalesTicketLogAction.ENQUIRY_CREATED,
            action_description=f"Enquiry {enquiry_number} created: {subject}",
            related_document_type="enquiry",
            related_document_id=enquiry.id,
            created_by=user_id,
            created_by_name=user_name or "System",
        )
        self.db.add(enquiry_log)
        
        self.db.commit()
        self.db.refresh(enquiry)
        
        return enquiry
    
    def get_enquiry(self, enquiry_id: str) -> Optional[Enquiry]:
        """Get an enquiry by ID."""
        return self.db.query(Enquiry).filter(Enquiry.id == enquiry_id).first()
    
    def get_enquiry_by_number(self, company_id: str, enquiry_number: str) -> Optional[Enquiry]:
        """Get an enquiry by number."""
        return self.db.query(Enquiry).filter(
            and_(
                Enquiry.company_id == company_id,
                Enquiry.enquiry_number == enquiry_number
            )
        ).first()
    
    def list_enquiries(
        self,
        company_id: str,
        status: Optional[EnquiryStatus] = None,
        source: Optional[EnquirySource] = None,
        customer_id: Optional[str] = None,
        sales_person_id: Optional[str] = None,
        from_date: Optional[date] = None,
        to_date: Optional[date] = None,
        priority: Optional[str] = None,
        search: Optional[str] = None,
        skip: int = 0,
        limit: int = 50,
    ) -> List[Enquiry]:
        """List enquiries with filters."""
        query = self.db.query(Enquiry).filter(Enquiry.company_id == company_id)
        
        if status:
            query = query.filter(Enquiry.status == status)
        if source:
            query = query.filter(Enquiry.source == source)
        if customer_id:
            query = query.filter(Enquiry.customer_id == customer_id)
        if sales_person_id:
            query = query.filter(Enquiry.sales_person_id == sales_person_id)
        if from_date:
            query = query.filter(Enquiry.enquiry_date >= from_date)
        if to_date:
            query = query.filter(Enquiry.enquiry_date <= to_date)
        if priority:
            query = query.filter(Enquiry.priority == priority)
        if search:
            search_filter = or_(
                Enquiry.subject.ilike(f"%{search}%"),
                Enquiry.enquiry_number.ilike(f"%{search}%"),
                Enquiry.prospect_name.ilike(f"%{search}%"),
                Enquiry.prospect_company.ilike(f"%{search}%"),
            )
            query = query.filter(search_filter)
        
        return query.order_by(Enquiry.enquiry_date.desc()).offset(skip).limit(limit).all()
    
    def count_enquiries(
        self,
        company_id: str,
        status: Optional[EnquiryStatus] = None,
        source: Optional[EnquirySource] = None,
        customer_id: Optional[str] = None,
        sales_person_id: Optional[str] = None,
    ) -> int:
        """Count enquiries with filters."""
        query = self.db.query(func.count(Enquiry.id)).filter(Enquiry.company_id == company_id)
        
        if status:
            query = query.filter(Enquiry.status == status)
        if source:
            query = query.filter(Enquiry.source == source)
        if customer_id:
            query = query.filter(Enquiry.customer_id == customer_id)
        if sales_person_id:
            query = query.filter(Enquiry.sales_person_id == sales_person_id)
        
        return query.scalar()
    
    def update_enquiry(
        self,
        enquiry_id: str,
        user_id: Optional[str] = None,
        user_name: Optional[str] = None,
        **kwargs
    ) -> Optional[Enquiry]:
        """Update an enquiry."""
        enquiry = self.get_enquiry(enquiry_id)
        if not enquiry:
            return None
        
        old_status = enquiry.status
        
        # Update fields
        for key, value in kwargs.items():
            if hasattr(enquiry, key) and value is not None:
                setattr(enquiry, key, value)
        
        enquiry.updated_at = datetime.utcnow()
        
        # Log status change if status changed
        if "status" in kwargs and kwargs["status"] != old_status:
            log = SalesTicketLog(
                sales_ticket_id=enquiry.sales_ticket_id,
                action_type=SalesTicketLogAction.STATUS_CHANGED,
                action_description=f"Enquiry status changed from {old_status.value} to {kwargs['status'].value}",
                old_value=old_status.value,
                new_value=kwargs["status"].value,
                related_document_type="enquiry",
                related_document_id=enquiry.id,
                created_by=user_id,
                created_by_name=user_name or "System",
            )
            self.db.add(log)
        
        self.db.commit()
        self.db.refresh(enquiry)
        
        return enquiry
    
    def update_enquiry_status(
        self,
        enquiry_id: str,
        status: EnquiryStatus,
        user_id: Optional[str] = None,
        user_name: Optional[str] = None,
        lost_reason: Optional[str] = None,
        lost_to_competitor: Optional[str] = None,
    ) -> Optional[Enquiry]:
        """Update enquiry status and handle special cases."""
        enquiry = self.get_enquiry(enquiry_id)
        if not enquiry:
            return None
        
        old_status = enquiry.status
        enquiry.status = status
        
        if status == EnquiryStatus.LOST:
            enquiry.lost_reason = lost_reason
            enquiry.lost_to_competitor = lost_to_competitor
            # Also update ticket status
            if enquiry.sales_ticket:
                enquiry.sales_ticket.status = SalesTicketStatus.LOST
                enquiry.sales_ticket.loss_reason = lost_reason
                enquiry.sales_ticket.competitor_name = lost_to_competitor
                enquiry.sales_ticket.actual_close_date = datetime.utcnow()
        
        enquiry.updated_at = datetime.utcnow()
        
        # Log the change
        log = SalesTicketLog(
            sales_ticket_id=enquiry.sales_ticket_id,
            action_type=SalesTicketLogAction.STATUS_CHANGED,
            action_description=f"Enquiry status changed from {old_status.value} to {status.value}",
            old_value=old_status.value,
            new_value=status.value,
            related_document_type="enquiry",
            related_document_id=enquiry.id,
            created_by=user_id,
            created_by_name=user_name or "System",
        )
        self.db.add(log)
        
        self.db.commit()
        self.db.refresh(enquiry)
        
        return enquiry
    
    def convert_to_quotation(
        self,
        enquiry_id: str,
        quotation_service,  # Injected to avoid circular imports
        user_id: Optional[str] = None,
        user_name: Optional[str] = None,
        **quotation_kwargs
    ) -> Optional[Quotation]:
        """Convert an enquiry to a quotation."""
        enquiry = self.get_enquiry(enquiry_id)
        if not enquiry:
            return None
        
        # Create quotation with enquiry's data
        quotation_data = {
            "company_id": enquiry.company_id,
            "customer_id": enquiry.customer_id,
            "contact_id": enquiry.contact_id,
            "sales_person_id": enquiry.sales_person_id,
            "sales_ticket_id": enquiry.sales_ticket_id,
            "subject": enquiry.subject,
            "notes": enquiry.description,
            **quotation_kwargs
        }
        
        quotation = quotation_service.create_quotation(**quotation_data)
        
        if quotation:
            # Update enquiry
            enquiry.status = EnquiryStatus.PROPOSAL_SENT
            enquiry.converted_quotation_id = quotation.id
            enquiry.converted_at = datetime.utcnow()
            
            # Update ticket stage
            if enquiry.sales_ticket:
                enquiry.sales_ticket.current_stage = SalesTicketStage.QUOTATION
            
            # Log the conversion
            log = SalesTicketLog(
                sales_ticket_id=enquiry.sales_ticket_id,
                action_type=SalesTicketLogAction.QUOTATION_CREATED,
                action_description=f"Quotation {quotation.quotation_number} created from enquiry {enquiry.enquiry_number}",
                related_document_type="quotation",
                related_document_id=quotation.id,
                created_by=user_id,
                created_by_name=user_name or "System",
            )
            self.db.add(log)
            
            # Log stage change
            stage_log = SalesTicketLog(
                sales_ticket_id=enquiry.sales_ticket_id,
                action_type=SalesTicketLogAction.STAGE_CHANGED,
                action_description="Pipeline stage advanced to Quotation",
                old_value=SalesTicketStage.ENQUIRY.value,
                new_value=SalesTicketStage.QUOTATION.value,
                created_by=user_id,
                created_by_name=user_name or "System",
            )
            self.db.add(stage_log)
            
            self.db.commit()
        
        return quotation
    
    def delete_enquiry(self, enquiry_id: str) -> bool:
        """Delete an enquiry (and its ticket if no other documents)."""
        enquiry = self.get_enquiry(enquiry_id)
        if not enquiry:
            return False
        
        # Check if ticket has other documents
        ticket = enquiry.sales_ticket
        
        self.db.delete(enquiry)
        
        # If ticket only has this enquiry, delete it too
        if ticket:
            # Check for other linked documents
            has_other_docs = (
                self.db.query(Quotation).filter(Quotation.sales_ticket_id == ticket.id).count() > 0
            )
            if not has_other_docs:
                self.db.delete(ticket)
        
        self.db.commit()
        return True
    
    def schedule_follow_up(
        self,
        enquiry_id: str,
        follow_up_date: datetime,
        user_id: Optional[str] = None,
        user_name: Optional[str] = None,
        notes: Optional[str] = None,
    ) -> Optional[Enquiry]:
        """Schedule a follow-up for an enquiry."""
        enquiry = self.get_enquiry(enquiry_id)
        if not enquiry:
            return None
        
        enquiry.follow_up_date = follow_up_date
        if notes:
            if enquiry.notes:
                enquiry.notes = f"{enquiry.notes}\n\nFollow-up scheduled for {follow_up_date.strftime('%Y-%m-%d')}: {notes}"
            else:
                enquiry.notes = f"Follow-up scheduled for {follow_up_date.strftime('%Y-%m-%d')}: {notes}"
        
        # Log the follow-up
        log = SalesTicketLog(
            sales_ticket_id=enquiry.sales_ticket_id,
            action_type=SalesTicketLogAction.FOLLOW_UP_SCHEDULED,
            action_description=f"Follow-up scheduled for {follow_up_date.strftime('%Y-%m-%d %H:%M')}",
            new_value=follow_up_date.isoformat(),
            related_document_type="enquiry",
            related_document_id=enquiry.id,
            created_by=user_id,
            created_by_name=user_name or "System",
        )
        self.db.add(log)
        
        self.db.commit()
        self.db.refresh(enquiry)
        
        return enquiry
    
    def log_contact(
        self,
        enquiry_id: str,
        user_id: Optional[str] = None,
        user_name: Optional[str] = None,
        notes: Optional[str] = None,
    ) -> Optional[Enquiry]:
        """Log a contact/interaction with the prospect."""
        enquiry = self.get_enquiry(enquiry_id)
        if not enquiry:
            return None
        
        enquiry.last_contact_date = datetime.utcnow()
        
        if enquiry.status == EnquiryStatus.NEW:
            enquiry.status = EnquiryStatus.CONTACTED
        
        # Log the contact
        log = SalesTicketLog(
            sales_ticket_id=enquiry.sales_ticket_id,
            action_type=SalesTicketLogAction.NOTE_ADDED,
            action_description=f"Contact logged: {notes[:100] if notes else 'No notes'}...",
            related_document_type="enquiry",
            related_document_id=enquiry.id,
            created_by=user_id,
            created_by_name=user_name or "System",
        )
        self.db.add(log)
        
        self.db.commit()
        self.db.refresh(enquiry)
        
        return enquiry
    
    def get_pending_follow_ups(
        self,
        company_id: str,
        sales_person_id: Optional[str] = None,
        days_ahead: int = 7,
    ) -> List[Enquiry]:
        """Get enquiries with follow-ups due in the next N days."""
        today = datetime.utcnow()
        end_date = datetime(today.year, today.month, today.day) + timedelta(days=days_ahead)
        
        query = self.db.query(Enquiry).filter(
            and_(
                Enquiry.company_id == company_id,
                Enquiry.follow_up_date <= end_date,
                Enquiry.follow_up_date >= today,
                Enquiry.status.not_in([EnquiryStatus.WON, EnquiryStatus.LOST])
            )
        )
        
        if sales_person_id:
            query = query.filter(Enquiry.sales_person_id == sales_person_id)
        
        return query.order_by(Enquiry.follow_up_date).all()

    # ==================== REPORTING METHODS ====================
    
    def get_enquiry_aging_report(
        self,
        company_id: str,
        from_date: Optional[date] = None,
        to_date: Optional[date] = None,
        status: Optional[EnquiryStatus] = None,
        sales_person_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Get enquiry aging report with buckets.
        
        Buckets:
        - 0-7 days
        - 8-15 days
        - 16-30 days
        - 31-60 days
        - 60+ days
        """
        today = datetime.utcnow().date()
        
        # Base query
        query = self.db.query(Enquiry).filter(Enquiry.company_id == company_id)
        
        if from_date:
            query = query.filter(Enquiry.enquiry_date >= from_date)
        if to_date:
            query = query.filter(Enquiry.enquiry_date <= to_date)
        if status:
            query = query.filter(Enquiry.status == status)
        if sales_person_id:
            query = query.filter(Enquiry.sales_person_id == sales_person_id)
        
        enquiries = query.all()
        
        # Initialize buckets
        buckets = {
            "0-7": {"count": 0, "total_value": Decimal("0"), "enquiries": []},
            "8-15": {"count": 0, "total_value": Decimal("0"), "enquiries": []},
            "16-30": {"count": 0, "total_value": Decimal("0"), "enquiries": []},
            "31-60": {"count": 0, "total_value": Decimal("0"), "enquiries": []},
            "60+": {"count": 0, "total_value": Decimal("0"), "enquiries": []},
        }
        
        # Status breakdown
        status_breakdown = {}
        
        for enquiry in enquiries:
            # Calculate age in days
            enquiry_date = enquiry.enquiry_date.date() if isinstance(enquiry.enquiry_date, datetime) else enquiry.enquiry_date
            age_days = (today - enquiry_date).days
            
            # Determine bucket
            if age_days <= 7:
                bucket_key = "0-7"
            elif age_days <= 15:
                bucket_key = "8-15"
            elif age_days <= 30:
                bucket_key = "16-30"
            elif age_days <= 60:
                bucket_key = "31-60"
            else:
                bucket_key = "60+"
            
            # Update bucket
            buckets[bucket_key]["count"] += 1
            buckets[bucket_key]["total_value"] += enquiry.expected_value or Decimal("0")
            buckets[bucket_key]["enquiries"].append({
                "id": enquiry.id,
                "enquiry_number": enquiry.enquiry_number,
                "subject": enquiry.subject,
                "status": enquiry.status.value if enquiry.status else None,
                "expected_value": float(enquiry.expected_value or 0),
                "age_days": age_days,
                "enquiry_date": enquiry_date.isoformat(),
            })
            
            # Update status breakdown
            status_val = enquiry.status.value if enquiry.status else "unknown"
            if status_val not in status_breakdown:
                status_breakdown[status_val] = {"count": 0, "total_value": Decimal("0")}
            status_breakdown[status_val]["count"] += 1
            status_breakdown[status_val]["total_value"] += enquiry.expected_value or Decimal("0")
        
        # Convert decimals to floats for JSON serialization
        for bucket_key in buckets:
            buckets[bucket_key]["total_value"] = float(buckets[bucket_key]["total_value"])
        for status_key in status_breakdown:
            status_breakdown[status_key]["total_value"] = float(status_breakdown[status_key]["total_value"])
        
        return {
            "report_date": today.isoformat(),
            "total_enquiries": len(enquiries),
            "total_value": float(sum(e.expected_value or Decimal("0") for e in enquiries)),
            "buckets": buckets,
            "status_breakdown": status_breakdown,
        }
    
    def get_enquiries_by_engineer(
        self,
        company_id: str,
        from_date: Optional[date] = None,
        to_date: Optional[date] = None,
    ) -> List[Dict[str, Any]]:
        """
        Get enquiry report grouped by sales engineer.
        
        Returns metrics: count, total value, conversion rate, average age.
        """
        # Base query with engineer info
        query = self.db.query(
            Enquiry.sales_person_id,
            func.count(Enquiry.id).label("total_count"),
            func.sum(Enquiry.expected_value).label("total_value"),
            func.count(case((Enquiry.status == EnquiryStatus.CONVERTED_TO_QUOT, 1))).label("converted_count"),
            func.avg(
                func.julianday(func.current_date()) - func.julianday(Enquiry.enquiry_date)
            ).label("avg_age_days")
        ).filter(Enquiry.company_id == company_id)
        
        if from_date:
            query = query.filter(Enquiry.enquiry_date >= from_date)
        if to_date:
            query = query.filter(Enquiry.enquiry_date <= to_date)
        
        # Group by sales person
        query = query.group_by(Enquiry.sales_person_id)
        
        results = query.all()
        
        # Get engineer names
        engineer_data = []
        for row in results:
            engineer_name = "Unassigned"
            if row.sales_person_id:
                engineer = self.db.query(Employee).filter(Employee.id == row.sales_person_id).first()
                if engineer:
                    engineer_name = f"{engineer.first_name} {engineer.last_name}"
            
            total_count = row.total_count or 0
            converted_count = row.converted_count or 0
            conversion_rate = (converted_count / total_count * 100) if total_count > 0 else 0
            
            engineer_data.append({
                "sales_person_id": row.sales_person_id,
                "sales_person_name": engineer_name,
                "total_count": total_count,
                "total_value": float(row.total_value or 0),
                "converted_count": converted_count,
                "conversion_rate": round(conversion_rate, 2),
                "avg_age_days": round(float(row.avg_age_days or 0), 1),
            })
        
        # Sort by total count descending
        engineer_data.sort(key=lambda x: x["total_count"], reverse=True)
        
        return engineer_data
    
    def get_enquiries_by_state(
        self,
        company_id: str,
        from_date: Optional[date] = None,
        to_date: Optional[date] = None,
    ) -> List[Dict[str, Any]]:
        """
        Get enquiry report grouped by customer state.
        
        Returns metrics: count, total value, conversion rate.
        """
        # Query with customer state
        query = self.db.query(
            Customer.billing_state.label("state"),
            Customer.billing_state_code.label("state_code"),
            func.count(Enquiry.id).label("total_count"),
            func.sum(Enquiry.expected_value).label("total_value"),
            func.count(case((Enquiry.status == EnquiryStatus.CONVERTED_TO_QUOT, 1))).label("converted_count"),
        ).join(
            Customer, Enquiry.customer_id == Customer.id, isouter=True
        ).filter(Enquiry.company_id == company_id)

        if from_date:
            query = query.filter(Enquiry.enquiry_date >= from_date)
        if to_date:
            query = query.filter(Enquiry.enquiry_date <= to_date)

        # Group by state
        query = query.group_by(Customer.billing_state, Customer.billing_state_code)
        
        results = query.all()
        
        state_data = []
        for row in results:
            total_count = row.total_count or 0
            converted_count = row.converted_count or 0
            conversion_rate = (converted_count / total_count * 100) if total_count > 0 else 0
            
            state_data.append({
                "state": row.state or "Unknown",
                "state_code": row.state_code or "",
                "total_count": total_count,
                "total_value": float(row.total_value or 0),
                "converted_count": converted_count,
                "conversion_rate": round(conversion_rate, 2),
            })
        
        # Sort by total count descending
        state_data.sort(key=lambda x: x["total_count"], reverse=True)
        
        return state_data
    
    def get_enquiries_by_brand(
        self,
        company_id: str,
        from_date: Optional[date] = None,
        to_date: Optional[date] = None,
    ) -> List[Dict[str, Any]]:
        """
        Get enquiry report grouped by brand.
        
        This joins enquiry items to products to get brand information.
        """
        # Query via enquiry items -> products -> brands
        query = self.db.query(
            Brand.id.label("brand_id"),
            Brand.name.label("brand_name"),
            func.count(func.distinct(Enquiry.id)).label("total_count"),
            func.sum(Enquiry.expected_value).label("total_value"),
            func.count(func.distinct(case((Enquiry.status == EnquiryStatus.CONVERTED_TO_QUOT, Enquiry.id)))).label("converted_count"),
        ).select_from(Enquiry).join(
            EnquiryItem, Enquiry.id == EnquiryItem.enquiry_id, isouter=True
        ).join(
            Product, EnquiryItem.product_id == Product.id, isouter=True
        ).join(
            Brand, Product.brand_id == Brand.id, isouter=True
        ).filter(Enquiry.company_id == company_id)
        
        if from_date:
            query = query.filter(Enquiry.enquiry_date >= from_date)
        if to_date:
            query = query.filter(Enquiry.enquiry_date <= to_date)
        
        # Group by brand
        query = query.group_by(Brand.id, Brand.name)
        
        results = query.all()
        
        brand_data = []
        for row in results:
            total_count = row.total_count or 0
            converted_count = row.converted_count or 0
            conversion_rate = (converted_count / total_count * 100) if total_count > 0 else 0
            
            brand_data.append({
                "brand_id": row.brand_id,
                "brand_name": row.brand_name or "Unknown / No Brand",
                "total_count": total_count,
                "total_value": float(row.total_value or 0),
                "converted_count": converted_count,
                "conversion_rate": round(conversion_rate, 2),
            })
        
        # Sort by total count descending
        brand_data.sort(key=lambda x: x["total_count"], reverse=True)
        
        return brand_data

