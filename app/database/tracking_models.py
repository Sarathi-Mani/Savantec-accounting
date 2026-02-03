"""GPS Tracking database models for salesman tracking."""
from datetime import datetime
from decimal import Decimal
from enum import Enum as PyEnum
from typing import Optional, List
from sqlalchemy import (
    Column, Integer, String, Text, DateTime, Date, Numeric, Boolean,
    ForeignKey, Enum, JSON, Index, Float
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship

# IMPORTANT: Import Base from your existing connection.py
from app.database.connection import Base

# For UUID generation
import uuid
def generate_uuid():
    return str(uuid.uuid4())

# ==================== ENUMS ====================

class TrackingStatus(str, PyEnum):
    """Tracking status enumeration."""
    IDLE = "idle"
    TRAVELLING = "travelling"
    AT_SITE_IN = "at_site_in"
    AT_SITE_OUT = "at_site_out"
    TRIP_STARTED = "trip_started"
    TRIP_ENDED = "trip_ended"


class VisitStatus(str, PyEnum):
    """Visit status enumeration."""
    PLANNED = "planned"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    INVALID = "invalid"


class TripStatus(str, PyEnum):
    """Trip status enumeration."""
    DRAFT = "draft"
    STARTED = "started"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class PetrolClaimStatus(str, PyEnum):
    """Petrol claim status enumeration."""
    DRAFT = "draft"
    SUBMITTED = "submitted"
    APPROVED = "approved"
    REJECTED = "rejected"
    PAID = "paid"
    FRAUD_FLAGGED = "fraud_flagged"


class FraudFlagReason(str, PyEnum):
    """Fraud flag reasons."""
    NO_GPS_PROOF = "no_gps_proof"
    DISTANCE_MISMATCH = "distance_mismatch"
    NO_IN_RECORD = "no_in_record"
    SHORT_VISIT_DURATION = "short_visit_duration"
    FAKE_GPS_DETECTED = "fake_gps_detected"
    IDLE_TIME_EXCEEDED = "idle_time_exceeded"
    OUTSIDE_GEOFENCE = "outside_geofence"


# ==================== MODELS ====================

class SalesEngineerDevice(Base):
    """Engineer device binding - One user per device."""
    __tablename__ = "sales_engineer_devices"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    company_id = Column(String(36), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    engineer_id = Column(String(36), ForeignKey("employees.id", ondelete="CASCADE"), nullable=False)
    
    # Device information
    device_id = Column(String(255), nullable=False)  # Unique device identifier
    device_model = Column(String(100))
    device_os = Column(String(50))
    device_version = Column(String(50))
    
    # Location tracking settings
    background_tracking_enabled = Column(Boolean, default=False)
    last_location_update = Column(DateTime)
    
    # Security
    is_active = Column(Boolean, default=True)
    is_blocked = Column(Boolean, default=False)
    blocked_reason = Column(Text)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    engineer = relationship("Employee", backref="device_bindings")

    __table_args__ = (
        Index("idx_engineer_device_company", "company_id"),
        Index("idx_engineer_device_unique", "engineer_id", "device_id", unique=True),
        Index("idx_engineer_device_active", "engineer_id", "is_active"),
    )


class VisitPlan(Base):
    """Planned visits for engineers."""
    __tablename__ = "visit_plans"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    company_id = Column(String(36), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    engineer_id = Column(String(36), ForeignKey("employees.id", ondelete="CASCADE"), nullable=False)
    
    # Visit details
    visit_date = Column(Date, nullable=False)
    customer_id = Column(String(36), ForeignKey("customers.id", ondelete="CASCADE"))
    enquiry_id = Column(String(36), ForeignKey("enquiries.id", ondelete="SET NULL"))
    
    purpose = Column(String(255), nullable=False)
    notes = Column(Text)
    
    # Planning info
    planned_start_time = Column(DateTime)
    planned_end_time = Column(DateTime)
    planned_duration_hours = Column(Numeric(5, 2))
    
    # Status
    status = Column(Enum(VisitStatus), default=VisitStatus.PLANNED)
    priority = Column(String(20), default="medium")  # low, medium, high
    
    # Actual visit tracking (filled after visit)
    actual_visit_id = Column(String(36), ForeignKey("visits.id", ondelete="SET NULL"))
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    engineer = relationship("Employee", backref="visit_plans")
    customer = relationship("Customer", backref="planned_visits")
    enquiry = relationship("Enquiry", backref="visit_plans")
    actual_visit = relationship("Visit", foreign_keys=[actual_visit_id])

    __table_args__ = (
        Index("idx_visit_plan_company", "company_id"),
        Index("idx_visit_plan_engineer", "engineer_id"),
        Index("idx_visit_plan_date", "visit_date"),
        Index("idx_visit_plan_status", "status"),
    )


class Trip(Base):
    """Engineer trip/travel record."""
    __tablename__ = "trips"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    company_id = Column(String(36), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    engineer_id = Column(String(36), ForeignKey("employees.id", ondelete="CASCADE"), nullable=False)
    
    # Trip identification
    trip_number = Column(String(50), nullable=False)
    
    # Start information
    start_time = Column(DateTime)
    start_location_lat = Column(Float)
    start_location_lng = Column(Float)
    start_location_address = Column(Text)
    start_km = Column(Numeric(10, 2))  # Manual input
    
    # End information
    end_time = Column(DateTime)
    end_location_lat = Column(Float)
    end_location_lng = Column(Float)
    end_location_address = Column(Text)
    end_km = Column(Numeric(10, 2))  # Manual input
    
    # Distance calculations
    manual_distance_km = Column(Numeric(10, 2))  # end_km - start_km
    gps_distance_km = Column(Numeric(10, 2))  # Calculated from GPS route
    system_distance_km = Column(Numeric(10, 2))  # Primary: manual, backup: GPS
    
    # Status and validation
    status = Column(Enum(TripStatus), default=TripStatus.DRAFT)
    is_valid = Column(Boolean, default=False)
    validation_notes = Column(Text)
    
    # Fraud detection
    has_fraud_flag = Column(Boolean, default=False)
    fraud_reason = Column(Enum(FraudFlagReason))
    fraud_score = Column(Integer, default=0)  # 0-100
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    engineer = relationship("Employee", backref="trips")
    visits = relationship("Visit", back_populates="trip")
    location_logs = relationship("LocationLog", back_populates="trip")
    petrol_claim = relationship("PetrolClaim", back_populates="trip", uselist=False)

    __table_args__ = (
        Index("idx_trip_company", "company_id"),
        Index("idx_trip_engineer", "engineer_id"),
        Index("idx_trip_date", "start_time"),
        Index("idx_trip_status", "status"),
        Index("idx_trip_fraud", "has_fraud_flag"),
    )


class Visit(Base):
    """Actual visit record with GPS validation."""
    __tablename__ = "visits"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    company_id = Column(String(36), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    engineer_id = Column(String(36), ForeignKey("employees.id", ondelete="CASCADE"), nullable=False)
    customer_id = Column(String(36), ForeignKey("customers.id", ondelete="CASCADE"))
    enquiry_id = Column(String(36), ForeignKey("enquiries.id", ondelete="SET NULL"))
    trip_id = Column(String(36), ForeignKey("trips.id", ondelete="CASCADE"), nullable=False)
    
    # Customer location for geofencing
    customer_location_lat = Column(Float)
    customer_location_lng = Column(Float)
    customer_location_address = Column(Text)
    geofence_radius_meters = Column(Integer, default=100)  # Default 100m
    
    # IN Tracking
    in_time = Column(DateTime)
    in_location_lat = Column(Float)
    in_location_lng = Column(Float)
    in_location_address = Column(Text)
    is_within_geofence_in = Column(Boolean, default=False)
    distance_from_customer_in = Column(Numeric(10, 2))  # meters
    
    # OUT Tracking
    out_time = Column(DateTime)
    out_location_lat = Column(Float)
    out_location_lng = Column(Float)
    out_location_address = Column(Text)
    is_within_geofence_out = Column(Boolean, default=False)
    distance_from_customer_out = Column(Numeric(10, 2))  # meters
    
    # Visit details
    duration_minutes = Column(Numeric(10, 2))  # Calculated
    notes = Column(Text)
    photos = Column(JSON)  # Array of photo URLs
    
    # Validation flags
    is_valid = Column(Boolean, default=False)
    validation_notes = Column(Text)
    
    # Status
    status = Column(Enum(VisitStatus), default=VisitStatus.PLANNED)
    
    # Fraud detection
    has_fraud_flag = Column(Boolean, default=False)
    fraud_reason = Column(Enum(FraudFlagReason))
    fraud_score = Column(Integer, default=0)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    engineer = relationship("Employee", backref="visits")
    customer = relationship("Customer", backref="visits")
    enquiry = relationship("Enquiry", backref="visits")
    trip = relationship("Trip", back_populates="visits")

    __table_args__ = (
        Index("idx_visit_company", "company_id"),
        Index("idx_visit_engineer", "engineer_id"),
        Index("idx_visit_customer", "customer_id"),
        Index("idx_visit_trip", "trip_id"),
        Index("idx_visit_date", "in_time"),
        Index("idx_visit_status", "status"),
        Index("idx_visit_valid", "is_valid"),
    )


class LocationLog(Base):
    """GPS location logs for realtime tracking."""
    __tablename__ = "location_logs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    company_id = Column(String(36), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    engineer_id = Column(String(36), ForeignKey("employees.id", ondelete="CASCADE"), nullable=False)
    trip_id = Column(String(36), ForeignKey("trips.id", ondelete="CASCADE"))
    
    # Location data
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    accuracy = Column(Float)  # GPS accuracy in meters
    altitude = Column(Float)
    speed = Column(Float)  # Speed in km/h
    heading = Column(Float)  # Direction in degrees
    
    # Device info
    device_id = Column(String(255))
    is_mock_location = Column(Boolean, default=False)
    is_background = Column(Boolean, default=False)
    
    # Timestamps
    recorded_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    engineer = relationship("Employee", backref="location_logs")
    trip = relationship("Trip", back_populates="location_logs")

    __table_args__ = (
        Index("idx_location_log_company", "company_id"),
        Index("idx_location_log_engineer", "engineer_id"),
        Index("idx_location_log_trip", "trip_id"),
        Index("idx_location_log_time", "recorded_at"),
        Index("idx_location_log_engineer_time", "engineer_id", "recorded_at"),
    )


class PetrolClaim(Base):
    """Petrol claims based on validated trips."""
    __tablename__ = "petrol_claims"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    company_id = Column(String(36), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    engineer_id = Column(String(36), ForeignKey("employees.id", ondelete="CASCADE"), nullable=False)
    trip_id = Column(String(36), ForeignKey("trips.id", ondelete="CASCADE"), nullable=False)
    
    # Claim details
    claim_number = Column(String(50), nullable=False)
    claim_date = Column(Date, nullable=False)
    period_from = Column(Date)
    period_to = Column(Date)
    
    # Distance calculations
    eligible_distance_km = Column(Numeric(10, 2))  # From system calculation
    claimed_distance_km = Column(Numeric(10, 2))  # Matches eligible distance (auto)
    rate_per_km = Column(Numeric(10, 2), default=10)  # Company rate
    claimed_amount = Column(Numeric(14, 2))
    
    # Payment details
    approved_amount = Column(Numeric(14, 2))
    paid_amount = Column(Numeric(14, 2))
    payment_date = Column(Date)
    payment_reference = Column(String(100))
    
    # Status
    status = Column(Enum(PetrolClaimStatus), default=PetrolClaimStatus.DRAFT)
    
    # Fraud detection
    has_fraud_flag = Column(Boolean, default=False)
    fraud_reason = Column(Enum(FraudFlagReason))
    fraud_notes = Column(Text)
    
    # Approval workflow
    submitted_at = Column(DateTime)
    submitted_by = Column(String(36))
    
    approved_at = Column(DateTime)
    approved_by = Column(String(36))
    approver_notes = Column(Text)
    
    rejected_at = Column(DateTime)
    rejected_by = Column(String(36))
    rejection_reason = Column(Text)
    
    paid_at = Column(DateTime)
    paid_by = Column(String(36))
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    engineer = relationship("Employee", backref="petrol_claims")
    trip = relationship("Trip", back_populates="petrol_claim")

    __table_args__ = (
        Index("idx_petrol_claim_company", "company_id"),
        Index("idx_petrol_claim_engineer", "engineer_id"),
        Index("idx_petrol_claim_trip", "trip_id"),
        Index("idx_petrol_claim_status", "status"),
        Index("idx_petrol_claim_fraud", "has_fraud_flag"),
    )


class EngineerTrackingStatus(Base):
    """Current tracking status of engineers (for realtime updates)."""
    __tablename__ = "engineer_tracking_status"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    company_id = Column(String(36), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    engineer_id = Column(String(36), ForeignKey("employees.id", ondelete="CASCADE"), nullable=False, unique=True)
    
    # Current status
    status = Column(Enum(TrackingStatus), default=TrackingStatus.IDLE)
    
    # Current trip/visit
    current_trip_id = Column(String(36), ForeignKey("trips.id", ondelete="SET NULL"))
    current_visit_id = Column(String(36), ForeignKey("visits.id", ondelete="SET NULL"))
    
    # Current location
    current_lat = Column(Float)
    current_lng = Column(Float)
    current_address = Column(Text)
    last_location_update = Column(DateTime)
    
    # Device info
    device_id = Column(String(255))
    is_online = Column(Boolean, default=False)
    battery_level = Column(Integer)
    gps_enabled = Column(Boolean, default=True)
    
    # Last activity
    last_activity_time = Column(DateTime)
    last_activity_type = Column(String(50))  # start_trip, in, out, end_trip
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    engineer = relationship("Employee", backref="tracking_status")
    current_trip = relationship("Trip", foreign_keys=[current_trip_id])
    current_visit = relationship("Visit", foreign_keys=[current_visit_id])

    __table_args__ = (
        Index("idx_tracking_status_company", "company_id"),
        Index("idx_tracking_status_engineer", "engineer_id"),
        Index("idx_tracking_status_online", "is_online"),
        Index("idx_tracking_status_update", "last_location_update"),
    )