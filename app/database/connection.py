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
    engine = create_engine(DATABASE_URL)

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
        ("location_logs", "network_type", "VARCHAR(50)"),
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
                    WHERE table_name = :table AND column_name = :column
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
