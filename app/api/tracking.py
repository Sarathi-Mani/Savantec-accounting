"""API endpoints for GPS tracking system."""
from typing import List, Optional, Dict, Any
from datetime import datetime, date, timedelta
from decimal import Decimal
import math
from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_
from pydantic import BaseModel, Field, validator
import json

from app.database.connection import get_db
from app.database.tracking_models import (
    SalesEngineerDevice, Trip, SalesVisit, LocationLog,
    PetrolClaim, EngineerTrackingStatus, TrackingStatus, VisitStatus,
    TripStatus, PetrolClaimStatus, FraudFlagReason
)
from app.database.payroll_models import Employee
from app.database.models import Company, Customer, Enquiry

router = APIRouter(prefix="/api/companies/{company_id}", tags=["tracking"])

# ==================== PYDANTIC MODELS ====================

class LocationData(BaseModel):
    latitude: float
    longitude: float
    accuracy: Optional[float] = None
    altitude: Optional[float] = None
    speed: Optional[float] = None
    heading: Optional[float] = None
    device_id: str
    is_mock_location: bool = False
    is_background: bool = False
    timestamp: datetime

class StartTripRequest(BaseModel):
    start_km: Decimal = Field(..., gt=0)
    start_location: LocationData
    notes: Optional[str] = None

class EndTripRequest(BaseModel):
    end_km: Decimal = Field(..., gt=0)
    end_location: LocationData
    notes: Optional[str] = None

class VisitInRequest(BaseModel):
    location: LocationData
    notes: Optional[str] = None
    photos: Optional[List[str]] = None

class VisitOutRequest(BaseModel):
    location: LocationData
    notes: Optional[str] = None
    photos: Optional[List[str]] = None

class CreateTripVisitsRequest(BaseModel):
    customer_ids: List[str] = Field(default_factory=list, min_items=1)
    notes: Optional[str] = None


class TripResponse(BaseModel):
    id: str
    trip_number: str
    engineer_id: str
    engineer_name: str
    start_time: Optional[datetime]
    end_time: Optional[datetime]
    start_km: Optional[Decimal]
    end_km: Optional[Decimal]
    manual_distance_km: Optional[Decimal]
    gps_distance_km: Optional[Decimal]
    system_distance_km: Optional[Decimal]
    status: str
    is_valid: bool
    has_fraud_flag: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

class VisitResponse(BaseModel):
    id: str
    engineer_id: str
    engineer_name: str
    customer_id: Optional[str]
    customer_name: Optional[str]
    enquiry_id: Optional[str]
    enquiry_number: Optional[str]
    trip_id: str
    in_time: Optional[datetime]
    out_time: Optional[datetime]
    duration_minutes: Optional[Decimal]
    is_valid: bool
    has_fraud_flag: bool
    status: str
    created_at: datetime
    
    class Config:
        from_attributes = True

class LiveEngineerStatus(BaseModel):
    engineer_id: str
    engineer_name: str
    status: str
    current_lat: Optional[float]
    current_lng: Optional[float]
    current_address: Optional[str]
    last_location_update: Optional[datetime]
    current_trip_id: Optional[str]
    current_visit_id: Optional[str]
    is_online: bool
    speed: Optional[float]
    heading: Optional[float]

# ==================== HELPER FUNCTIONS ====================

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate distance between two coordinates in meters."""
    R = 6371000  # Earth radius in meters
    
    lat1_rad = math.radians(lat1)
    lon1_rad = math.radians(lon1)
    lat2_rad = math.radians(lat2)
    lon2_rad = math.radians(lon2)
    
    dlat = lat2_rad - lat1_rad
    dlon = lon2_rad - lon1_rad
    
    a = math.sin(dlat/2)**2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlon/2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    
    return R * c  # Distance in meters

def is_within_geofence(lat1: float, lon1: float, lat2: float, lon2: float, radius_m: int = 100) -> bool:
    """Check if location is within geofence radius."""
    distance = haversine_distance(lat1, lon1, lat2, lon2)
    return distance <= radius_m

# ==================== AUTHENTICATION & DEVICE BINDING ====================

@router.post("/engineers/{engineer_id}/bind-device")
def bind_device(
    company_id: str,
    engineer_id: str,
    device_id: str,
    device_model: Optional[str] = None,
    device_os: Optional[str] = None,
    device_version: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Bind a device to an engineer."""
    # Check if engineer exists and belongs to company
    engineer = db.query(Employee).filter(
        Employee.id == engineer_id,
        Employee.company_id == company_id
    ).first()
    
    if not engineer:
        raise HTTPException(status_code=404, detail="Engineer not found")
    
    # Check if device is already bound to another engineer
    existing_binding = db.query(SalesEngineerDevice).filter(
        SalesEngineerDevice.device_id == device_id,
        SalesEngineerDevice.is_active == True,
        SalesEngineerDevice.engineer_id != engineer_id
    ).first()
    
    if existing_binding:
        raise HTTPException(
            status_code=400, 
            detail="Device already bound to another engineer"
        )
    
    # Deactivate any existing bindings for this engineer
    db.query(SalesEngineerDevice).filter(
        SalesEngineerDevice.engineer_id == engineer_id,
        SalesEngineerDevice.is_active == True
    ).update({"is_active": False})
    
    # Create new binding
    device_binding = SalesEngineerDevice(
        company_id=company_id,
        engineer_id=engineer_id,
        device_id=device_id,
        device_model=device_model,
        device_os=device_os,
        device_version=device_version,
        background_tracking_enabled=True,
        is_active=True
    )
    
    db.add(device_binding)
    db.commit()
    db.refresh(device_binding)
    
    return {"message": "Device bound successfully", "binding_id": device_binding.id}



@router.get("/engineers")
def get_engineers(
    company_id: str,
    db: Session = Depends(get_db)
):
    """Get all sales engineers for a company."""
    engineers = db.query(Employee).filter(
        Employee.company_id == company_id,
        Employee.is_active == True,
        or_(
            Employee.role.ilike("%sales%"),
            Employee.designation.ilike("%sales%"),
            Employee.employee_type.ilike("%sales%"),
        )
    ).all()
    
    return [{
        "id": emp.id,
        "first_name": emp.first_name,
        "last_name": emp.last_name,
        "email": emp.email,
        "employee_code": emp.employee_code,
        "is_active": emp.is_active
    } for emp in engineers]

@router.get("/engineers/{engineer_id}/customers")
def get_engineer_customers(
    company_id: str,
    engineer_id: str,
    db: Session = Depends(get_db)
):
    """Get customers assigned to an engineer."""
    # No visit plans: return empty list for now.
    return []


@router.get("/customers/nearby")
def get_nearby_customers(
    company_id: str,
    latitude: float = Query(..., ge=-90, le=90),
    longitude: float = Query(..., ge=-180, le=180),
    radius_km: float = Query(10, gt=0, le=200),
    limit: int = Query(200, gt=0, le=500),
    db: Session = Depends(get_db)
):
    """Get nearby customers based on a coordinate."""
    # Approximate bounding box to reduce query size
    lat_delta = radius_km / 111.0
    lng_delta = radius_km / (111.0 * max(math.cos(math.radians(latitude)), 0.01))

    candidates = db.query(Customer).filter(
        Customer.company_id == company_id,
        Customer.is_active == True,
        Customer.location_lat.isnot(None),
        Customer.location_lng.isnot(None),
        Customer.location_lat.between(latitude - lat_delta, latitude + lat_delta),
        Customer.location_lng.between(longitude - lng_delta, longitude + lng_delta),
    ).all()

    results = []
    for customer in candidates:
        distance_m = haversine_distance(
            latitude, longitude, customer.location_lat, customer.location_lng
        )
        if distance_m <= radius_km * 1000:
            results.append({
                "id": customer.id,
                "name": customer.name,
                "contact": customer.contact,
                "city": customer.billing_city,
                "state": customer.billing_state,
                "district": customer.district,
                "area": customer.area,
                "latitude": customer.location_lat,
                "longitude": customer.location_lng,
                "location_address": customer.location_address,
                "distance_km": round(distance_m / 1000, 2),
            })

    results.sort(key=lambda x: x["distance_km"])
    return results[:limit]

@router.get("/engineers/{engineer_id}/current-trip")
def get_current_trip(
    company_id: str,
    engineer_id: str,
    db: Session = Depends(get_db)
):
    """Get engineer's current active trip."""
    trip = db.query(Trip).filter(
        Trip.company_id == company_id,
        Trip.engineer_id == engineer_id,
        Trip.status.in_([TripStatus.STARTED, TripStatus.IN_PROGRESS])
    ).first()
    
    if not trip:
        return {"trip": None}
    
    # Get visits for this trip
    visits = db.query(SalesVisit).filter(
        SalesVisit.trip_id == trip.id
    ).all()
    
    return {
        "trip": {
            "id": trip.id,
            "trip_number": trip.trip_number,
            "start_time": trip.start_time,
            "start_km": trip.start_km,
            "status": trip.status,
        },
        "visits": len(visits)
    }

@router.get("/engineers/{engineer_id}/trips/summary")
def get_engineer_trip_summary(
    company_id: str,
    engineer_id: str,
    db: Session = Depends(get_db)
):
    """Get trip summary for engineer."""
    trips = db.query(Trip).filter(
        Trip.company_id == company_id,
        Trip.engineer_id == engineer_id,
        Trip.status == TripStatus.COMPLETED
    ).all()
    
    total_distance = sum(trip.system_distance_km for trip in trips if trip.system_distance_km)
    
    return {
        "total": len(trips),
        "total_distance": float(total_distance) if total_distance else 0
    }

@router.get("/engineers/{engineer_id}/visits/summary")
def get_engineer_visit_summary(
    company_id: str,
    engineer_id: str,
    db: Session = Depends(get_db)
):
    """Get visit summary for engineer."""
    visits = db.query(Visit).filter(
        Visit.company_id == company_id,
        Visit.engineer_id == engineer_id,
        Visit.status == VisitStatus.COMPLETED
    ).all()
    
    # Today's visits
    today = date.today()
    today_visits = [v for v in visits if v.in_time and v.in_time.date() == today]
    
    return {
        "total": len(visits),
        "today": len(today_visits)
    }

@router.get("/engineers/{engineer_id}/claims/summary")
def get_engineer_claim_summary(
    company_id: str,
    engineer_id: str,
    db: Session = Depends(get_db)
):
    """Get claim summary for engineer."""
    claims = db.query(PetrolClaim).filter(
        PetrolClaim.company_id == company_id,
        PetrolClaim.engineer_id == engineer_id
    ).all()
    
    pending = [c for c in claims if c.status == PetrolClaimStatus.SUBMITTED]
    
    return {
        "total": len(claims),
        "pending": len(pending)
    }



# ==================== TRIP MANAGEMENT ====================

@router.post("/trips/start")
def start_trip(
    company_id: str,
    engineer_id: str,
    data: StartTripRequest,
    db: Session = Depends(get_db)
):
    """Start a new trip."""
    # Check device binding (auto-bind for web if missing)
    device_binding = db.query(SalesEngineerDevice).filter(
        SalesEngineerDevice.company_id == company_id,
        SalesEngineerDevice.engineer_id == engineer_id,
        SalesEngineerDevice.device_id == data.start_location.device_id,
        SalesEngineerDevice.is_active == True
    ).first()

    if not device_binding:
        device_binding = SalesEngineerDevice(
            company_id=company_id,
            engineer_id=engineer_id,
            device_id=data.start_location.device_id,
            device_model="web",
            device_os="web",
            device_version="browser",
            background_tracking_enabled=True,
            is_active=True
        )
        db.add(device_binding)
    
    # Generate trip number
    today = datetime.utcnow()
    year_month = today.strftime("%Y%m")
    count = db.query(Trip).filter(
        Trip.company_id == company_id,
        func.date(Trip.created_at) == today.date()
    ).count()
    
    trip_number = f"TRIP-{year_month}-{count + 1:04d}"
    
    # Create trip
    trip = Trip(
        company_id=company_id,
        engineer_id=engineer_id,
        trip_number=trip_number,
        start_time=data.start_location.timestamp,
        start_location_lat=data.start_location.latitude,
        start_location_lng=data.start_location.longitude,
        start_km=data.start_km,
        status=TripStatus.STARTED,
        is_valid=False
    )
    
    db.add(trip)
    
    # Create location log
    location_log = LocationLog(
        company_id=company_id,
        engineer_id=engineer_id,
        trip_id=trip.id,
        latitude=data.start_location.latitude,
        longitude=data.start_location.longitude,
        accuracy=data.start_location.accuracy,
        altitude=data.start_location.altitude,
        speed=data.start_location.speed,
        heading=data.start_location.heading,
        device_id=data.start_location.device_id,
        is_mock_location=data.start_location.is_mock_location,
        is_background=data.start_location.is_background,
        recorded_at=data.start_location.timestamp
    )
    
    db.add(location_log)
    
    # Update tracking status
    tracking_status = db.query(EngineerTrackingStatus).filter(
        EngineerTrackingStatus.company_id == company_id,
        EngineerTrackingStatus.engineer_id == engineer_id
    ).first()
    
    if not tracking_status:
        tracking_status = EngineerTrackingStatus(
            company_id=company_id,
            engineer_id=engineer_id,
            status=TrackingStatus.TRAVELLING,
            current_trip_id=trip.id,
            current_lat=data.start_location.latitude,
            current_lng=data.start_location.longitude,
            last_location_update=data.start_location.timestamp,
            device_id=data.start_location.device_id,
            is_online=True,
            gps_enabled=True
        )
        db.add(tracking_status)
    else:
        tracking_status.status = TrackingStatus.TRAVELLING
        tracking_status.current_trip_id = trip.id
        tracking_status.current_visit_id = None
        tracking_status.current_lat = data.start_location.latitude
        tracking_status.current_lng = data.start_location.longitude
        tracking_status.last_location_update = data.start_location.timestamp
        tracking_status.device_id = data.start_location.device_id
        tracking_status.is_online = True
    
    db.commit()
    
    return {
        "message": "Trip started successfully",
        "trip_id": trip.id,
        "trip_number": trip_number
    }


@router.post("/trips/{trip_id}/visits")
def create_trip_visits(
    company_id: str,
    trip_id: str,
    data: CreateTripVisitsRequest,
    db: Session = Depends(get_db)
):
    """Create planned visits for a trip (no visit plan required)."""
    trip = db.query(Trip).filter(
        Trip.id == trip_id,
        Trip.company_id == company_id
    ).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    customers = db.query(Customer).filter(
        Customer.id.in_(data.customer_ids),
        Customer.company_id == company_id
    ).all()

    customer_map = {c.id: c for c in customers}
    visits = []
    for customer_id in data.customer_ids:
        customer = customer_map.get(customer_id)
        if not customer:
            continue
        visit = Visit(
            company_id=company_id,
            engineer_id=trip.engineer_id,
            customer_id=customer.id,
            trip_id=trip.id,
            customer_location_lat=customer.location_lat,
            customer_location_lng=customer.location_lng,
            customer_location_address=customer.location_address,
            status=VisitStatus.PLANNED,
            notes=data.notes
        )
        db.add(visit)
        visits.append(visit)

    db.commit()

    return {
        "trip_id": trip.id,
        "created": len(visits),
        "visits": [
            {
                "id": v.id,
                "customer_id": v.customer_id,
                "status": v.status
            } for v in visits
        ]
    }

@router.post("/trips/{trip_id}/end")
def end_trip(
    company_id: str,
    trip_id: str,
    data: EndTripRequest,
    db: Session = Depends(get_db)
):
    """End a trip with validation."""
    trip = db.query(Trip).filter(
        Trip.id == trip_id,
        Trip.company_id == company_id
    ).first()
    
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    
    if trip.status == TripStatus.COMPLETED:
        raise HTTPException(status_code=400, detail="Trip already completed")
    
    # Validation: End KM must be greater than Start KM
    if data.end_km <= trip.start_km:
        raise HTTPException(
            status_code=400,
            detail="End KM must be greater than Start KM"
        )
    
    # Update trip
    trip.end_time = data.end_location.timestamp
    trip.end_location_lat = data.end_location.latitude
    trip.end_location_lng = data.end_location.longitude
    trip.end_km = data.end_km
    
    # Calculate distances
    trip.manual_distance_km = data.end_km - trip.start_km
    trip.system_distance_km = trip.manual_distance_km  # Primary: manual
    
    # Validate trip
    trip.is_valid = True
    trip.status = TripStatus.COMPLETED
    
    # Add location log
    location_log = LocationLog(
        company_id=company_id,
        engineer_id=trip.engineer_id,
        trip_id=trip_id,
        latitude=data.end_location.latitude,
        longitude=data.end_location.longitude,
        accuracy=data.end_location.accuracy,
        altitude=data.end_location.altitude,
        speed=data.end_location.speed,
        heading=data.end_location.heading,
        device_id=data.end_location.device_id,
        is_mock_location=data.end_location.is_mock_location,
        is_background=data.end_location.is_background,
        recorded_at=data.end_location.timestamp
    )
    
    db.add(location_log)
    
    # Update tracking status
    tracking_status = db.query(EngineerTrackingStatus).filter(
        EngineerTrackingStatus.company_id == company_id,
        EngineerTrackingStatus.engineer_id == trip.engineer_id
    ).first()
    
    if tracking_status:
        tracking_status.status = TrackingStatus.IDLE
        tracking_status.current_trip_id = None
        tracking_status.current_visit_id = None
        tracking_status.current_lat = data.end_location.latitude
        tracking_status.current_lng = data.end_location.longitude
        tracking_status.last_location_update = data.end_location.timestamp
        tracking_status.is_online = True
    
    db.commit()
    
    return {
        "message": "Trip ended successfully",
        "trip_id": trip.id,
        "distance_km": float(trip.manual_distance_km)
    }

# ==================== VISIT TRACKING ====================

@router.post("/visits/{visit_id}/in")
def mark_visit_in(
    company_id: str,
    visit_id: str,
    data: VisitInRequest,
    db: Session = Depends(get_db)
):
    """Mark IN for a visit with geofence validation."""
    visit = db.query(Visit).filter(
        Visit.id == visit_id,
        Visit.company_id == company_id
    ).first()
    
    if not visit:
        raise HTTPException(status_code=404, detail="Visit not found")
    
    if visit.in_time:
        raise HTTPException(status_code=400, detail="Visit already marked IN")
    
    # Get customer location for geofence check
    customer = db.query(Customer).filter(Customer.id == visit.customer_id).first()
    if not customer or not customer.location_lat or not customer.location_lng:
        raise HTTPException(
            status_code=400,
            detail="Customer location not set for geofence validation"
        )
    
    # Check if within geofence (100 meters)
    distance = haversine_distance(
        data.location.latitude,
        data.location.longitude,
        customer.location_lat,
        customer.location_lng
    )
    
    is_within = distance <= visit.geofence_radius_meters
    
    if not is_within:
        raise HTTPException(
            status_code=400,
            detail=f"Not within geofence. Distance: {distance:.0f}m, Required: ≤{visit.geofence_radius_meters}m"
        )
    
    # Update visit
    visit.in_time = data.location.timestamp
    visit.in_location_lat = data.location.latitude
    visit.in_location_lng = data.location.longitude
    visit.is_within_geofence_in = True
    visit.distance_from_customer_in = Decimal(str(distance))
    visit.status = VisitStatus.IN_PROGRESS
    
    if data.photos:
        visit.photos = data.photos
    
    # Update tracking status
    tracking_status = db.query(EngineerTrackingStatus).filter(
        EngineerTrackingStatus.company_id == company_id,
        EngineerTrackingStatus.engineer_id == visit.engineer_id
    ).first()
    
    if tracking_status:
        tracking_status.status = TrackingStatus.AT_SITE_IN
        tracking_status.current_visit_id = visit_id
        tracking_status.current_lat = data.location.latitude
        tracking_status.current_lng = data.location.longitude
        tracking_status.last_location_update = data.location.timestamp
    
    db.commit()
    
    return {
        "message": "Visit marked IN successfully",
        "distance_from_customer_m": distance
    }

@router.post("/visits/{visit_id}/out")
def mark_visit_out(
    company_id: str,
    visit_id: str,
    data: VisitOutRequest,
    db: Session = Depends(get_db)
):
    """Mark OUT for a visit."""
    visit = db.query(Visit).filter(
        Visit.id == visit_id,
        Visit.company_id == company_id
    ).first()
    
    if not visit:
        raise HTTPException(status_code=404, detail="Visit not found")
    
    if not visit.in_time:
        raise HTTPException(status_code=400, detail="Visit not marked IN yet")
    
    if visit.out_time:
        raise HTTPException(status_code=400, detail="Visit already marked OUT")
    
    # Calculate duration
    duration = (data.location.timestamp - visit.in_time).total_seconds() / 60  # minutes
    
    # Update visit
    visit.out_time = data.location.timestamp
    visit.out_location_lat = data.location.latitude
    visit.out_location_lng = data.location.longitude
    visit.duration_minutes = Decimal(str(duration))
    visit.status = VisitStatus.COMPLETED
    
    # Validate visit (minimum duration check)
    if duration >= 5:  # Minimum 5 minutes
        visit.is_valid = True
    else:
        visit.is_valid = False
        visit.has_fraud_flag = True
        visit.fraud_reason = FraudFlagReason.SHORT_VISIT_DURATION
        visit.fraud_score = 50
    
    if data.photos:
        if visit.photos:
            visit.photos.extend(data.photos)
        else:
            visit.photos = data.photos
    
    # Update tracking status
    tracking_status = db.query(EngineerTrackingStatus).filter(
        EngineerTrackingStatus.company_id == company_id,
        EngineerTrackingStatus.engineer_id == visit.engineer_id
    ).first()
    
    if tracking_status:
        tracking_status.status = TrackingStatus.TRAVELLING
        tracking_status.current_visit_id = None
        tracking_status.current_lat = data.location.latitude
        tracking_status.current_lng = data.location.longitude
        tracking_status.last_location_update = data.location.timestamp
    
    db.commit()
    
    return {
        "message": "Visit marked OUT successfully",
        "duration_minutes": duration,
        "is_valid": visit.is_valid
    }

# ==================== LIVE LOCATION TRACKING ====================

@router.post("/location/update")
def update_location(
    company_id: str,
    engineer_id: str,
    data: LocationData,
    db: Session = Depends(get_db)
):
    """Update engineer's location (called every 5-10 seconds)."""
    # Check device binding
    device_binding = db.query(SalesEngineerDevice).filter(
        SalesEngineerDevice.company_id == company_id,
        SalesEngineerDevice.engineer_id == engineer_id,
        SalesEngineerDevice.device_id == data.device_id,
        SalesEngineerDevice.is_active == True
    ).first()
    
    if not device_binding:
        raise HTTPException(status_code=400, detail="Device not bound or inactive")
    
    # Get current trip
    tracking_status = db.query(EngineerTrackingStatus).filter(
        EngineerTrackingStatus.company_id == company_id,
        EngineerTrackingStatus.engineer_id == engineer_id
    ).first()
    
    if not tracking_status or not tracking_status.current_trip_id:
        raise HTTPException(status_code=400, detail="No active trip")
    
    # Create location log
    location_log = LocationLog(
        company_id=company_id,
        engineer_id=engineer_id,
        trip_id=tracking_status.current_trip_id,
        latitude=data.latitude,
        longitude=data.longitude,
        accuracy=data.accuracy,
        altitude=data.altitude,
        speed=data.speed,
        heading=data.heading,
        device_id=data.device_id,
        is_mock_location=data.is_mock_location,
        is_background=data.is_background,
        recorded_at=data.timestamp
    )
    
    db.add(location_log)
    
    # Update tracking status
    tracking_status.current_lat = data.latitude
    tracking_status.current_lng = data.longitude
    tracking_status.last_location_update = data.timestamp
    tracking_status.is_online = True
    
    if data.is_mock_location:
        # Flag for fake GPS
        tracking_status.has_fraud_flag = True
        # Also flag the current trip
        trip = db.query(Trip).filter(Trip.id == tracking_status.current_trip_id).first()
        if trip:
            trip.has_fraud_flag = True
            trip.fraud_reason = FraudFlagReason.FAKE_GPS_DETECTED
            trip.fraud_score = 100
    
    db.commit()
    
    return {"message": "Location updated"}

# ==================== ADMIN DASHBOARD ENDPOINTS ====================

@router.get("/live-tracking")
def get_live_tracking(
    company_id: str,
    db: Session = Depends(get_db)
):
    """Get live tracking status of all engineers."""
    tracking_statuses = db.query(
        EngineerTrackingStatus,
        Employee
    ).join(
        Employee, EngineerTrackingStatus.engineer_id == Employee.id
    ).filter(
        EngineerTrackingStatus.company_id == company_id,
        Employee.status == "active"
    ).all()
    
    result = []
    for status, engineer in tracking_statuses:
        result.append({
            "engineer_id": engineer.id,
            "engineer_name": f"{engineer.first_name} {engineer.last_name}",
            "status": status.status,
            "current_lat": status.current_lat,
            "current_lng": status.current_lng,
            "current_address": status.current_address,
            "last_location_update": status.last_location_update,
            "current_trip_id": status.current_trip_id,
            "current_visit_id": status.current_visit_id,
            "is_online": status.is_online,
            "speed": status.speed if hasattr(status, 'speed') else None,
            "heading": status.heading if hasattr(status, 'heading') else None
        })
    
    return result

@router.get("/trips")
def get_trips(
    company_id: str,
    engineer_id: Optional[str] = Query(None),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    status: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """Get trips with filters."""
    query = db.query(Trip, Employee).join(
        Employee, Trip.engineer_id == Employee.id
    ).filter(
        Trip.company_id == company_id
    )
    
    if engineer_id:
        query = query.filter(Trip.engineer_id == engineer_id)
    if start_date:
        query = query.filter(func.date(Trip.start_time) >= start_date)
    if end_date:
        query = query.filter(func.date(Trip.start_time) <= end_date)
    if status:
        query = query.filter(Trip.status == status)
    
    trips = query.order_by(Trip.start_time.desc()).offset(skip).limit(limit).all()
    
    result = []
    for trip, engineer in trips:
        trip_data = TripResponse.model_validate(trip)
        trip_data.engineer_name = f"{engineer.first_name} {engineer.last_name}"
        result.append(trip_data)
    
    return result

@router.get("/trips/{trip_id}/route")
def get_trip_route(
    company_id: str,
    trip_id: str,
    db: Session = Depends(get_db)
):
    """Get GPS route for a trip."""
    trip = db.query(Trip).filter(
        Trip.id == trip_id,
        Trip.company_id == company_id
    ).first()
    
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    
    # Get all location logs for this trip
    location_logs = db.query(LocationLog).filter(
        LocationLog.trip_id == trip_id
    ).order_by(LocationLog.recorded_at).all()
    
    # Calculate GPS distance
    total_distance = 0
    route_points = []
    
    for i in range(len(location_logs) - 1):
        lat1, lon1 = location_logs[i].latitude, location_logs[i].longitude
        lat2, lon2 = location_logs[i+1].latitude, location_logs[i+1].longitude
        
        distance = haversine_distance(lat1, lon1, lat2, lon2)
        total_distance += distance
        
        route_points.append({
            "lat": lat1,
            "lng": lon1,
            "timestamp": location_logs[i].recorded_at,
            "speed": location_logs[i].speed,
            "accuracy": location_logs[i].accuracy
        })
    
    # Add last point
    if location_logs:
        last = location_logs[-1]
        route_points.append({
            "lat": last.latitude,
            "lng": last.longitude,
            "timestamp": last.recorded_at,
            "speed": last.speed,
            "accuracy": last.accuracy
        })
    
    # Update trip with GPS distance if not set
    if not trip.gps_distance_km:
        trip.gps_distance_km = Decimal(str(total_distance / 1000))  # Convert to km
        db.commit()
    
    return {
        "trip_id": trip_id,
        "gps_distance_km": float(total_distance / 1000),
        "route_points": route_points,
        "total_points": len(route_points)
    }

@router.get("/visits")
def get_visits(
    company_id: str,
    engineer_id: Optional[str] = Query(None),
    customer_id: Optional[str] = Query(None),
    trip_id: Optional[str] = Query(None),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    status: Optional[str] = Query(None),
    is_valid: Optional[bool] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """Get visits with filters."""
    query = db.query(SalesVisit, Employee, Customer).join(
        Employee, SalesVisit.engineer_id == Employee.id
    ).join(
        Customer, SalesVisit.customer_id == Customer.id
    ).filter(
        SalesVisit.company_id == company_id
    )
    
    if engineer_id:
        query = query.filter(SalesVisit.engineer_id == engineer_id)
    if customer_id:
        query = query.filter(SalesVisit.customer_id == customer_id)
    if trip_id:
        query = query.filter(SalesVisit.trip_id == trip_id)
    if start_date:
        query = query.filter(func.date(SalesVisit.in_time) >= start_date)
    if end_date:
        query = query.filter(func.date(SalesVisit.in_time) <= end_date)
    if status:
        query = query.filter(SalesVisit.status == status)
    if is_valid is not None:
        query = query.filter(SalesVisit.is_valid == is_valid)
    
    visits = query.order_by(SalesVisit.in_time.desc()).offset(skip).limit(limit).all()
    
    result = []
    for visit, engineer, customer in visits:
        visit_data = VisitResponse.model_validate(visit)
        visit_data.engineer_name = f"{engineer.first_name} {engineer.last_name}"
        visit_data.customer_name = customer.name
        if visit.enquiry_id:
            enquiry = db.query(Enquiry).filter(Enquiry.id == visit.enquiry_id).first()
            if enquiry:
                visit_data.enquiry_number = enquiry.enquiry_number
        result.append(visit_data)
    
    return result

# ==================== PETROL CLAIMS ====================

@router.post("/petrol-claims")
def create_petrol_claim(
    company_id: str,
    trip_id: str,
    db: Session = Depends(get_db)
):
    """Create petrol claim for a validated trip."""
    trip = db.query(Trip).filter(
        Trip.id == trip_id,
        Trip.company_id == company_id,
        Trip.status == TripStatus.COMPLETED,
        Trip.is_valid == True
    ).first()
    
    if not trip:
        raise HTTPException(status_code=404, detail="Valid trip not found")
    
    # Check if claim already exists
    existing_claim = db.query(PetrolClaim).filter(
        PetrolClaim.trip_id == trip_id
    ).first()
    
    if existing_claim:
        raise HTTPException(status_code=400, detail="Petrol claim already exists for this trip")
    
    # Generate claim number
    today = datetime.utcnow()
    year_month = today.strftime("%Y%m")
    count = db.query(PetrolClaim).filter(
        PetrolClaim.company_id == company_id,
        func.date(PetrolClaim.created_at) == today.date()
    ).count()
    
    claim_number = f"PETROL-{year_month}-{count + 1:04d}"
    
    # Default rate (from company settings)
    company = db.query(Company).filter(Company.id == company_id).first()
    company_rate = Decimal(str(company.petrol_rate_per_km)) if company and company.petrol_rate_per_km is not None else None
    rate_per_km = company_rate if company_rate is not None else Decimal("10")
    
    # Create claim
    claim = PetrolClaim(
        company_id=company_id,
        engineer_id=trip.engineer_id,
        trip_id=trip_id,
        claim_number=claim_number,
        claim_date=today.date(),
        eligible_distance_km=trip.system_distance_km,
        claimed_distance_km=trip.system_distance_km,
        rate_per_km=rate_per_km,
        claimed_amount=trip.system_distance_km * rate_per_km,
        status=PetrolClaimStatus.DRAFT
    )
    
    db.add(claim)
    db.commit()
    db.refresh(claim)
    
    return {
        "message": "Petrol claim created",
        "claim_id": claim.id,
        "claim_number": claim_number,
        "eligible_distance_km": float(claim.eligible_distance_km),
        "claimed_amount": float(claim.claimed_amount)
    }

@router.get("/petrol-claims")
def get_petrol_claims(
    company_id: str,
    engineer_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    has_fraud_flag: Optional[bool] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """Get petrol claims with filters."""
    query = db.query(PetrolClaim, Employee).join(
        Employee, PetrolClaim.engineer_id == Employee.id
    ).filter(
        PetrolClaim.company_id == company_id
    )
    
    if engineer_id:
        query = query.filter(PetrolClaim.engineer_id == engineer_id)
    if status:
        query = query.filter(PetrolClaim.status == status)
    if start_date:
        query = query.filter(PetrolClaim.claim_date >= start_date)
    if end_date:
        query = query.filter(PetrolClaim.claim_date <= end_date)
    if has_fraud_flag is not None:
        query = query.filter(PetrolClaim.has_fraud_flag == has_fraud_flag)
    
    claims = query.order_by(PetrolClaim.claim_date.desc()).offset(skip).limit(limit).all()
    
    result = []
    for claim, engineer in claims:
        result.append({
            "id": claim.id,
            "claim_number": claim.claim_number,
            "engineer_id": engineer.id,
            "engineer_name": f"{engineer.first_name} {engineer.last_name}",
            "trip_id": claim.trip_id,
            "claim_date": claim.claim_date,
            "eligible_distance_km": float(claim.eligible_distance_km),
            "claimed_amount": float(claim.claimed_amount),
            "approved_amount": float(claim.approved_amount) if claim.approved_amount else None,
            "status": claim.status,
            "has_fraud_flag": claim.has_fraud_flag,
            "submitted_at": claim.submitted_at,
            "approved_at": claim.approved_at,
            "paid_at": claim.paid_at
        })
    
    return result

# ==================== REPORTS ====================

@router.get("/reports/visit-summary")
def get_visit_summary_report(
    company_id: str,
    engineer_id: Optional[str] = Query(None),
    start_date: date = Query(...),
    end_date: date = Query(...),
    db: Session = Depends(get_db)
):
    """Get visit summary report."""
    query = db.query(
        Visit.engineer_id,
        func.count(Visit.id).label("total_visits"),
        func.count(case((Visit.is_valid == True, 1))).label("valid_visits"),
        func.count(case((Visit.has_fraud_flag == True, 1))).label("fraud_visits"),
        func.avg(Visit.duration_minutes).label("avg_duration"),
        func.sum(case((Visit.is_valid == True, 1), else_=0)).label("productive_visits")
    ).join(
        Employee, Visit.engineer_id == Employee.id
    ).filter(
        Visit.company_id == company_id,
        func.date(Visit.in_time) >= start_date,
        func.date(Visit.in_time) <= end_date,
        Visit.status == VisitStatus.COMPLETED
    )
    
    if engineer_id:
        query = query.filter(Visit.engineer_id == engineer_id)
    
    query = query.group_by(Visit.engineer_id)
    
    results = query.all()
    
    report = []
    for row in results:
        engineer = db.query(Employee).filter(Employee.id == row.engineer_id).first()
        report.append({
            "engineer_id": row.engineer_id,
            "engineer_name": f"{engineer.first_name} {engineer.last_name}",
            "total_visits": row.total_visits,
            "valid_visits": row.valid_visits,
            "fraud_visits": row.fraud_visits,
            "avg_duration_minutes": float(row.avg_duration) if row.avg_duration else 0,
            "productive_visits": row.productive_visits,
            "productivity_rate": (row.productive_visits / row.total_visits * 100) if row.total_visits > 0 else 0
        })
    
    return report

@router.get("/reports/trip-summary")
def get_trip_summary_report(
    company_id: str,
    engineer_id: Optional[str] = Query(None),
    start_date: date = Query(...),
    end_date: date = Query(...),
    db: Session = Depends(get_db)
):
    """Get trip summary report."""
    query = db.query(
        Trip.engineer_id,
        func.count(Trip.id).label("total_trips"),
        func.count(case((Trip.is_valid == True, 1))).label("valid_trips"),
        func.count(case((Trip.has_fraud_flag == True, 1))).label("fraud_trips"),
        func.sum(Trip.system_distance_km).label("total_distance"),
        func.avg(Trip.system_distance_km).label("avg_distance")
    ).join(
        Employee, Trip.engineer_id == Employee.id
    ).filter(
        Trip.company_id == company_id,
        func.date(Trip.start_time) >= start_date,
        func.date(Trip.start_time) <= end_date,
        Trip.status == TripStatus.COMPLETED
    )
    
    if engineer_id:
        query = query.filter(Trip.engineer_id == engineer_id)
    
    query = query.group_by(Trip.engineer_id)
    
    results = query.all()
    
    report = []
    for row in results:
        engineer = db.query(Employee).filter(Employee.id == row.engineer_id).first()
        report.append({
            "engineer_id": row.engineer_id,
            "engineer_name": f"{engineer.first_name} {engineer.last_name}",
            "total_trips": row.total_trips,
            "valid_trips": row.valid_trips,
            "fraud_trips": row.fraud_trips,
            "total_distance_km": float(row.total_distance) if row.total_distance else 0,
            "avg_distance_km": float(row.avg_distance) if row.avg_distance else 0,
            "validity_rate": (row.valid_trips / row.total_trips * 100) if row.total_trips > 0 else 0
        })
    
    return report

@router.get("/reports/fraud-detection")
def get_fraud_detection_report(
    company_id: str,
    start_date: date = Query(...),
    end_date: date = Query(...),
    db: Session = Depends(get_db)
):
    """Get fraud detection report."""
    # Fraud in trips
    fraudulent_trips = db.query(Trip, Employee).join(
        Employee, Trip.engineer_id == Employee.id
    ).filter(
        Trip.company_id == company_id,
        Trip.has_fraud_flag == True,
        func.date(Trip.start_time) >= start_date,
        func.date(Trip.start_time) <= end_date
    ).all()
    
    # Fraud in visits
    fraudulent_visits = db.query(Visit, Employee, Customer).join(
        Employee, Visit.engineer_id == Employee.id
    ).join(
        Customer, Visit.customer_id == Customer.id
    ).filter(
        Visit.company_id == company_id,
        Visit.has_fraud_flag == True,
        func.date(Visit.in_time) >= start_date,
        func.date(Visit.in_time) <= end_date
    ).all()
    
    # Fraud in claims
    fraudulent_claims = db.query(PetrolClaim, Employee).join(
        Employee, PetrolClaim.engineer_id == Employee.id
    ).filter(
        PetrolClaim.company_id == company_id,
        PetrolClaim.has_fraud_flag == True,
        func.date(PetrolClaim.claim_date) >= start_date,
        func.date(PetrolClaim.claim_date) <= end_date
    ).all()
    
    # Analyze fraud patterns
    fraud_reasons = {}
    engineer_fraud_count = {}
    
    for trip, engineer in fraudulent_trips:
        reason = trip.fraud_reason.value if trip.fraud_reason else "unknown"
        fraud_reasons[reason] = fraud_reasons.get(reason, 0) + 1
        engineer_fraud_count[engineer.id] = engineer_fraud_count.get(engineer.id, 0) + 1
    
    for visit, engineer, customer in fraudulent_visits:
        reason = visit.fraud_reason.value if visit.fraud_reason else "unknown"
        fraud_reasons[reason] = fraud_reasons.get(reason, 0) + 1
        engineer_fraud_count[engineer.id] = engineer_fraud_count.get(engineer.id, 0) + 1
    
    for claim, engineer in fraudulent_claims:
        reason = claim.fraud_reason.value if claim.fraud_reason else "unknown"
        fraud_reasons[reason] = fraud_reasons.get(reason, 0) + 1
        engineer_fraud_count[engineer.id] = engineer_fraud_count.get(engineer.id, 0) + 1
    
    # Get top fraudulent engineers
    top_fraudulent_engineers = []
    for engineer_id, count in sorted(engineer_fraud_count.items(), key=lambda x: x[1], reverse=True)[:10]:
        engineer = db.query(Employee).filter(Employee.id == engineer_id).first()
        if engineer:
            top_fraudulent_engineers.append({
                "engineer_id": engineer_id,
                "engineer_name": f"{engineer.first_name} {engineer.last_name}",
                "fraud_count": count
            })
    
    return {
        "period": {
            "start_date": start_date,
            "end_date": end_date
        },
        "summary": {
            "fraudulent_trips": len(fraudulent_trips),
            "fraudulent_visits": len(fraudulent_visits),
            "fraudulent_claims": len(fraudulent_claims),
            "total_fraud_cases": len(fraudulent_trips) + len(fraudulent_visits) + len(fraudulent_claims)
        },
        "fraud_reasons": fraud_reasons,
        "top_fraudulent_engineers": top_fraudulent_engineers,
        "detailed_trips": [
            {
                "trip_id": trip.id,
                "trip_number": trip.trip_number,
                "engineer_name": f"{engineer.first_name} {engineer.last_name}",
                "fraud_reason": trip.fraud_reason.value if trip.fraud_reason else "unknown",
                "fraud_score": trip.fraud_score,
                "date": trip.start_time.date() if trip.start_time else None
            }
            for trip, engineer in fraudulent_trips
        ],
        "detailed_visits": [
            {
                "visit_id": visit.id,
                "engineer_name": f"{engineer.first_name} {engineer.last_name}",
                "customer_name": customer.name,
                "fraud_reason": visit.fraud_reason.value if visit.fraud_reason else "unknown",
                "fraud_score": visit.fraud_score,
                "date": visit.in_time.date() if visit.in_time else None
            }
            for visit, engineer, customer in fraudulent_visits
        ]
    }

# ==================== WEBSOCKET FOR REAL-TIME UPDATES ====================

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
    
    async def connect(self, websocket: WebSocket, client_id: str):
        await websocket.accept()
        self.active_connections[client_id] = websocket
    
    def disconnect(self, client_id: str):
        if client_id in self.active_connections:
            del self.active_connections[client_id]
    
    async def send_personal_message(self, message: str, client_id: str):
        if client_id in self.active_connections:
            await self.active_connections[client_id].send_text(message)
    
    async def broadcast(self, message: str):
        for connection in self.active_connections.values():
            await connection.send_text(message)

manager = ConnectionManager()

@router.websocket("/ws/live-tracking")
async def websocket_live_tracking(websocket: WebSocket, company_id: str):
    await manager.connect(websocket, f"admin_{company_id}")
    try:
        while True:
            # Keep connection alive
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(f"admin_{company_id}")

@router.websocket("/ws/engineer/{engineer_id}")
async def websocket_engineer_tracking(websocket: WebSocket, company_id: str, engineer_id: str):
    await manager.connect(websocket, f"engineer_{company_id}_{engineer_id}")
    try:
        while True:
            data = await websocket.receive_text()
            # Handle engineer updates
            # Broadcast to admin clients
            await manager.broadcast(data)
    except WebSocketDisconnect:
        manager.disconnect(f"engineer_{company_id}_{engineer_id}")








