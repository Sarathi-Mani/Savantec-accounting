"""Database connection setup."""
from sqlalchemy import create_engine, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.config import settings

# Create database engine
# For Supabase, use the connection string from your project
DATABASE_URL = settings.DATABASE_URL or "sqlite:///./gst_invoice.db"

# Handle SQLite vs PostgreSQL
if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
else:
    # Keep pooled Postgres connections healthy across idle periods/reloads.
    # This prevents intermittent OperationalError -> 503 responses.
    engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True,
        pool_recycle=300,
        pool_size=5,
        max_overflow=10,
    )

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create declarative base
Base = declarative_base()


def get_db():
    """Dependency to get database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Initialize database tables."""
    Base.metadata.create_all(bind=engine)
    ensure_tracking_columns()
    ensure_enum_values()


def ensure_tracking_columns():
    """Ensure required tracking columns exist (safe for existing DBs)."""
    dialect = engine.dialect.name
    columns = [
        ("sales_engineer_devices", "background_tracking_enabled", "BOOLEAN"),
        ("sales_engineer_devices", "last_seen_at", "TIMESTAMP"),
        ("sales_engineer_devices", "is_active", "BOOLEAN"),
        ("engineer_tracking_status", "network_type", "VARCHAR(50)"),
        ("engineer_tracking_status", "last_status_update", "TIMESTAMP"),
        ("engineer_tracking_status", "speed", "FLOAT"),
        ("engineer_tracking_status", "heading", "FLOAT"),
        ("engineer_tracking_status", "accuracy", "FLOAT"),
        ("engineer_tracking_status", "has_fraud_flag", "BOOLEAN"),
        ("engineer_tracking_status", "fraud_reason", "VARCHAR(50)"),
        ("engineer_tracking_status", "fraud_score", "INTEGER"),
        ("location_logs", "battery_level", "INTEGER"),
        ("location_logs", "network_type", "VARCHAR(50)"),
        ("location_logs", "uploaded_at", "TIMESTAMP"),
        ("sales_visits", "customer_location_lat", "FLOAT"),
        ("sales_visits", "customer_location_lng", "FLOAT"),
        ("sales_visits", "customer_location_address", "VARCHAR(500)"),
        ("sales_visits", "in_time", "TIMESTAMP"),
        ("sales_visits", "out_time", "TIMESTAMP"),
        ("sales_visits", "in_location_lat", "FLOAT"),
        ("sales_visits", "in_location_lng", "FLOAT"),
        ("sales_visits", "out_location_lat", "FLOAT"),
        ("sales_visits", "out_location_lng", "FLOAT"),
        ("sales_visits", "distance_from_customer_in", "NUMERIC(10,2)"),
        ("sales_visits", "distance_from_customer_out", "NUMERIC(10,2)"),
        ("sales_visits", "geofence_radius_meters", "INTEGER"),
        ("sales_visits", "is_within_geofence_in", "BOOLEAN"),
        ("sales_visits", "is_within_geofence_out", "BOOLEAN"),
        ("sales_visits", "duration_minutes", "NUMERIC(10,2)"),
        ("sales_visits", "status", "VARCHAR(50)"),
        ("sales_visits", "is_valid", "BOOLEAN"),
        ("sales_visits", "has_fraud_flag", "BOOLEAN"),
        ("sales_visits", "fraud_reason", "VARCHAR(50)"),
        ("sales_visits", "fraud_score", "INTEGER"),
        ("sales_visits", "photos", "JSON"),
        ("sales_visits", "notes", "TEXT"),
        ("sales_visits", "created_at", "TIMESTAMP"),
        ("sales_visits", "updated_at", "TIMESTAMP"),
        ("trips", "is_valid", "BOOLEAN"),
        ("trips", "validated_by", "VARCHAR(36)"),
        ("trips", "validated_at", "TIMESTAMP"),
        ("trips", "notes", "TEXT"),
        ("trips", "has_fraud_flag", "BOOLEAN"),
        ("trips", "fraud_reason", "VARCHAR(50)"),
        ("trips", "fraud_score", "INTEGER"),
    ]

    def column_exists(conn, table_name: str, column_name: str) -> bool:
        if dialect == "postgresql":
            result = conn.execute(
                text(
                    """
                    SELECT 1
                    FROM information_schema.columns
                    WHERE table_name = :table
                      AND column_name = :column
                      AND table_schema = current_schema()
                    LIMIT 1
                    """
                ),
                {"table": table_name, "column": column_name},
            ).first()
            return result is not None
        if dialect == "sqlite":
            result = conn.execute(text(f"PRAGMA table_info({table_name})")).fetchall()
            return any(row[1] == column_name for row in result)
        # Fallback: try select column
        try:
            conn.execute(text(f"SELECT {column_name} FROM {table_name} LIMIT 1"))
            return True
        except Exception:
            return False

    with engine.begin() as conn:
        for table_name, column_name, column_type in columns:
            if not column_exists(conn, table_name, column_name):
                conn.execute(
                    text(f"ALTER TABLE {table_name} ADD COLUMN {column_name} {column_type}")
                )


def ensure_enum_values():
    """Ensure required enum values exist for Postgres enums."""
    if engine.dialect.name != "postgresql":
        return

    enums_to_values = {
        "visitstatus": ["planned", "in_progress", "completed", "cancelled"],
    }

    def enum_exists(conn, enum_name: str) -> bool:
        result = conn.execute(
            text("SELECT 1 FROM pg_type WHERE typname = :name LIMIT 1"),
            {"name": enum_name},
        ).first()
        return result is not None

    def enum_value_exists(conn, enum_name: str, value: str) -> bool:
        result = conn.execute(
            text(
                """
                SELECT 1
                FROM pg_enum e
                JOIN pg_type t ON t.oid = e.enumtypid
                WHERE t.typname = :name AND e.enumlabel = :value
                LIMIT 1
                """
            ),
            {"name": enum_name, "value": value},
        ).first()
        return result is not None

    with engine.connect().execution_options(isolation_level="AUTOCOMMIT") as conn:
        for enum_name, values in enums_to_values.items():
            if not enum_exists(conn, enum_name):
                continue
            for value in values:
                if not enum_value_exists(conn, enum_name, value):
                    conn.execute(text(f"ALTER TYPE {enum_name} ADD VALUE '{value}'"))
