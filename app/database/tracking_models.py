# app/database/tracking_models.py
"""Database models for Sales Tracking System."""
from datetime import datetime
from decimal import Decimal
from enum import Enum as PyEnum
from sqlalchemy import (
    Column, Integer, Date, Time, String, Text, DateTime, 
    Numeric, Boolean, ForeignKey, Enum, JSON, Float, Index
)
from sqlalchemy.orm import relationship
from app.database.connection import Base
import uuid

def generate_uuid():
    return str(uuid.uuid4())

class TrackingStatus(str, PyEnum):
    IDLE = "idle"
    TRAVELLING = "travelling"
    AT_SITE_IN = "at_site_in"
    AT_SITE_OUT = "at_site_out"
    OFF_DUTY = "off_duty"

class VisitStatus(str, PyEnum):
    PLANNED = "planned"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

class TripStatus(str, PyEnum):
    DRAFT = "draft"
    STARTED = "started"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

class PetrolClaimStatus(str, PyEnum):
    DRAFT = "draft"
    SUBMITTED = "submitted"
    APPROVED = "approved"
    REJECTED = "rejected"
    PAID = "paid"

class FraudFlagReason(str, PyEnum):
    FAKE_GPS_DETECTED = "fake_gps_detected"
    SHORT_VISIT_DURATION = "short_visit_duration"
    DISTANCE_MISMATCH = "distance_mismatch"
    SPEED_ANOMALY = "speed_anomaly"
    LOCATION_SPOOFING = "location_spoofing"

class SalesEngineerDevice(Base):
    """Device binding for sales engineers."""
    __tablename__ = "sales_engineer_devices"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    company_id = Column(String(36), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    engineer_id = Column(String(36), ForeignKey("employees.id", ondelete="CASCADE"), nullable=False)
    
    device_id = Column(String(255), nullable=False)  # Unique device identifier
    device_model = Column(String(100))
    device_os = Column(String(50))
    device_version = Column(String(50))
    
    background_tracking_enabled = Column(Boolean, default=True)
    last_seen_at = Column(DateTime)
    is_active = Column(Boolean, default=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    __table_args__ = (
        Index("idx_sales_device_company", "company_id"),
        Index("idx_sales_device_engineer", "engineer_id"),
        Index("idx_sales_device_id", "device_id"),
    )

class EngineerTrackingStatus(Base):
    """Real-time tracking status of sales engineers."""
    __tablename__ = "engineer_tracking_status"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    company_id = Column(String(36), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    engineer_id = Column(String(36), ForeignKey("employees.id", ondelete="CASCADE"), nullable=False)
    
    status = Column(Enum(TrackingStatus), default=TrackingStatus.IDLE)
    
    # Current location
    current_lat = Column(Float)
    current_lng = Column(Float)
    current_address = Column(String(500))
    
    # Current activity
    current_trip_id = Column(String(36), ForeignKey("trips.id", ondelete="SET NULL"))
    current_visit_id = Column(String(36), ForeignKey("sales_visits.id", ondelete="SET NULL"))
    
    # Device info
    device_id = Column(String(255))
    battery_level = Column(Integer)
    gps_enabled = Column(Boolean, default=True)
    
    # Network status
    is_online = Column(Boolean, default=False)
    network_type = Column(String(50))  # wifi, mobile, offline
    
    last_location_update = Column(DateTime)
    last_status_update = Column(DateTime, default=datetime.utcnow)
    
    # Additional tracking data
    speed = Column(Float)  # in km/h
    heading = Column(Float)  # in degrees
    accuracy = Column(Float)  # in meters
    
    # Fraud detection flags
    has_fraud_flag = Column(Boolean, default=False)
    fraud_reason = Column(Enum(FraudFlagReason))
    fraud_score = Column(Integer, default=0)  # 0-100
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    __table_args__ = (
        Index("idx_tracking_status_company", "company_id"),
        Index("idx_tracking_status_engineer", "engineer_id"),
        Index("idx_tracking_status_online", "is_online"),
    )

class Trip(Base):
    """Daily trip for sales engineer."""
    __tablename__ = "trips"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    company_id = Column(String(36), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    engineer_id = Column(String(36), ForeignKey("employees.id", ondelete="CASCADE"), nullable=False)
    
    trip_number = Column(String(50), nullable=False, index=True)  # TRP-YYYYMM-XXXX
    start_time = Column(DateTime)
    end_time = Column(DateTime)
    
    # Start location
    start_location_lat = Column(Float)
    start_location_lng = Column(Float)
    start_location_address = Column(String(500))
    
    # End location
    end_location_lat = Column(Float)
    end_location_lng = Column(Float)
    end_location_address = Column(String(500))
    
    # Distance tracking
    start_km = Column(Numeric(10, 2))
    end_km = Column(Numeric(10, 2))
    manual_distance_km = Column(Numeric(10, 2))  # Calculated from odometer
    gps_distance_km = Column(Numeric(10, 2))  # Calculated from GPS
    system_distance_km = Column(Numeric(10, 2))  # System calculated (primary)
    
    status = Column(Enum(TripStatus), default=TripStatus.DRAFT)
    
    # Validation flags
    is_valid = Column(Boolean, default=False)
    validated_by = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"))
    validated_at = Column(DateTime)
    
    # Fraud detection
    has_fraud_flag = Column(Boolean, default=False)
    fraud_reason = Column(Enum(FraudFlagReason))
    fraud_score = Column(Integer, default=0)
    
    notes = Column(Text)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    engineer = relationship("Employee")
    visits = relationship("app.database.tracking_models.SalesVisit", back_populates="trip", cascade="all, delete-orphan")
    location_logs = relationship("LocationLog", back_populates="trip", cascade="all, delete-orphan")
    
    __table_args__ = (
        Index("idx_trip_company", "company_id"),
        Index("idx_trip_engineer", "engineer_id"),
        Index("idx_trip_date", "start_time"),
        Index("idx_trip_status", "status"),
    )

class SalesVisit(Base):
    """Customer visit during a trip."""
    __tablename__ = "sales_visits"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    company_id = Column(String(36), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    engineer_id = Column(String(36), ForeignKey("employees.id", ondelete="CASCADE"), nullable=False)
    customer_id = Column(String(36), ForeignKey("customers.id", ondelete="SET NULL"))
    trip_id = Column(String(36), ForeignKey("trips.id", ondelete="CASCADE"), nullable=False)
    
    # Customer location (stored for reference)
    customer_location_lat = Column(Float)
    customer_location_lng = Column(Float)
    customer_location_address = Column(String(500))
    
    # Check-in/Check-out
    in_time = Column(DateTime)
    out_time = Column(DateTime)
    
    in_location_lat = Column(Float)
    in_location_lng = Column(Float)
    out_location_lat = Column(Float)
    out_location_lng = Column(Float)
    
    # Distance from customer at check-in/check-out
    distance_from_customer_in = Column(Numeric(10, 2))  # meters
    distance_from_customer_out = Column(Numeric(10, 2))  # meters
    
    # Geofence validation
    geofence_radius_meters = Column(Integer, default=100)  # Default 100m radius
    is_within_geofence_in = Column(Boolean, default=False)
    is_within_geofence_out = Column(Boolean, default=False)
    
    # Visit duration
    duration_minutes = Column(Numeric(10, 2))
    
    status = Column(Enum(VisitStatus), default=VisitStatus.PLANNED)
    
    # Validation
    is_valid = Column(Boolean, default=False)
    
    # Fraud detection
    has_fraud_flag = Column(Boolean, default=False)
    fraud_reason = Column(Enum(FraudFlagReason))
    fraud_score = Column(Integer, default=0)
    
    # Photos/Proof
    photos = Column(JSON)  # Array of photo URLs
    
    notes = Column(Text)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    engineer = relationship("Employee")
    customer = relationship("Customer")
    trip = relationship("Trip", back_populates="visits")
    
    __table_args__ = (
        Index("idx_sales_visit_company", "company_id"),
        Index("idx_sales_visit_engineer", "engineer_id"),
        Index("idx_sales_visit_customer", "customer_id"),
        Index("idx_sales_visit_trip", "trip_id"),
        Index("idx_sales_visit_status", "status"),
    )


class LocationLog(Base):
    """GPS location logs for tracking movement."""
    __tablename__ = "location_logs"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    company_id = Column(String(36), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    engineer_id = Column(String(36), ForeignKey("employees.id", ondelete="CASCADE"), nullable=False)
    trip_id = Column(String(36), ForeignKey("trips.id", ondelete="CASCADE"))
    
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    accuracy = Column(Float)  # in meters
    altitude = Column(Float)
    speed = Column(Float)  # in m/s
    heading = Column(Float)  # in degrees
    
    device_id = Column(String(255), nullable=False)
    is_mock_location = Column(Boolean, default=False)
    is_background = Column(Boolean, default=False)
    
    recorded_at = Column(DateTime, nullable=False, index=True)
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    
    # Additional context
    battery_level = Column(Integer)
    network_type = Column(String(50))
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    engineer = relationship("Employee")
    trip = relationship("Trip", back_populates="location_logs")
    
    __table_args__ = (
        Index("idx_location_company", "company_id"),
        Index("idx_location_engineer", "engineer_id"),
        Index("idx_location_trip", "trip_id"),
        Index("idx_location_time", "recorded_at"),
    )

class PetrolClaim(Base):
    """Petrol claims based on validated trips."""
    __tablename__ = "petrol_claims"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    company_id = Column(String(36), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    engineer_id = Column(String(36), ForeignKey("employees.id", ondelete="CASCADE"), nullable=False)
    trip_id = Column(String(36), ForeignKey("trips.id", ondelete="CASCADE"))
    
    claim_number = Column(String(50), nullable=False, index=True)  # PETROL-YYYYMM-XXXX
    claim_date = Column(Date, nullable=False)
    
    # Distance and rates
    eligible_distance_km = Column(Numeric(10, 2), nullable=False)
    claimed_distance_km = Column(Numeric(10, 2), nullable=False)
    rate_per_km = Column(Numeric(10, 2), nullable=False)  # From company settings
    claimed_amount = Column(Numeric(14, 2), nullable=False)
    
    # Approval workflow
    status = Column(Enum(PetrolClaimStatus), default=PetrolClaimStatus.DRAFT)
    submitted_at = Column(DateTime)
    approved_by = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"))
    approved_at = Column(DateTime)
    approved_amount = Column(Numeric(14, 2))
    rejection_reason = Column(Text)
    
    # Payment
    paid_at = Column(DateTime)
    payment_reference = Column(String(100))
    
    # Fraud detection
    has_fraud_flag = Column(Boolean, default=False)
    fraud_reason = Column(Enum(FraudFlagReason))
    fraud_score = Column(Integer, default=0)
    
    notes = Column(Text)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    engineer = relationship("Employee")
    trip = relationship("Trip")
    approver = relationship("User", foreign_keys=[approved_by])
    
    __table_args__ = (
        Index("idx_petrol_claim_company", "company_id"),
        Index("idx_petrol_claim_engineer", "engineer_id"),
        Index("idx_petrol_claim_status", "status"),
        Index("idx_petrol_claim_date", "claim_date"),
    )
