"""Fix missing database columns."""
from app.database.connection import engine
from sqlalchemy import text

def add_column_if_not_exists(conn, table, column, column_def):
    """Add column if it doesn't exist."""
    result = conn.execute(text(f"""
        SELECT column_name FROM information_schema.columns 
        WHERE table_name = '{table}' AND column_name = '{column}'
    """))
    if not result.fetchall():
        print(f"  Adding {table}.{column}...")
        conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {column_def}"))
        return True
    return False

def add_enum_value_if_not_exists(conn, enum_name, value):
    """Add a value to a PostgreSQL enum type if it doesn't exist."""
    # Check if the value already exists
    result = conn.execute(text(f"""
        SELECT enumlabel FROM pg_enum 
        WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = '{enum_name}')
        AND enumlabel = '{value}'
    """))
    if not result.fetchall():
        print(f"  Adding '{value}' to enum {enum_name}...")
        conn.execute(text(f"ALTER TYPE {enum_name} ADD VALUE '{value}'"))
        return True
    return False

def fix_enums():
    """Fix enum types - must be in separate transaction."""
    with engine.connect() as conn:
        conn.execute(text("COMMIT"))  # End any existing transaction
        
        print("Checking enum types...")
        # Add 'received' to deliverychallanstatus enum (both cases for compatibility)
        add_enum_value_if_not_exists(conn, "deliverychallanstatus", "received")
        add_enum_value_if_not_exists(conn, "deliverychallanstatus", "RECEIVED")
        
        # Add new stock movement types
        add_enum_value_if_not_exists(conn, "stockmovementtype", "repack_in")
        add_enum_value_if_not_exists(conn, "stockmovementtype", "repack_out")
        add_enum_value_if_not_exists(conn, "stockmovementtype", "conversion_in")
        add_enum_value_if_not_exists(conn, "stockmovementtype", "conversion_out")
        
        print("Enum updates complete!")

def fix_columns():
    with engine.connect() as conn:
        changes = False
        
        # Invoice columns
        print("Checking invoices table...")
        changes |= add_column_if_not_exists(conn, "invoices", "courier_company", "VARCHAR(200)")
        changes |= add_column_if_not_exists(conn, "invoices", "courier_docket_number", "VARCHAR(100)")
        changes |= add_column_if_not_exists(conn, "invoices", "courier_tracking_url", "VARCHAR(500)")
        
        # Quotation columns
        print("Checking quotations table...")
        changes |= add_column_if_not_exists(conn, "quotations", "currency_code", "VARCHAR(3) DEFAULT 'INR'")
        changes |= add_column_if_not_exists(conn, "quotations", "exchange_rate", "NUMERIC(14, 6) DEFAULT 1.0")
        changes |= add_column_if_not_exists(conn, "quotations", "base_currency_total", "NUMERIC(14, 2)")
        changes |= add_column_if_not_exists(conn, "quotations", "show_images_in_pdf", "BOOLEAN DEFAULT TRUE")
        
        # Delivery challan columns
        print("Checking delivery_challans table...")
        changes |= add_column_if_not_exists(conn, "delivery_challans", "acknowledgement_image_url", "VARCHAR(500)")
        changes |= add_column_if_not_exists(conn, "delivery_challans", "acknowledgement_status", "VARCHAR(50) DEFAULT 'pending'")
        changes |= add_column_if_not_exists(conn, "delivery_challans", "acknowledged_at", "TIMESTAMP")
        changes |= add_column_if_not_exists(conn, "delivery_challans", "acknowledged_by", "VARCHAR(200)")
        changes |= add_column_if_not_exists(conn, "delivery_challans", "courier_company", "VARCHAR(200)")
        changes |= add_column_if_not_exists(conn, "delivery_challans", "courier_docket_number", "VARCHAR(100)")
        changes |= add_column_if_not_exists(conn, "delivery_challans", "courier_tracking_url", "VARCHAR(500)")
        
        # Items columns
        print("Checking items table...")
        changes |= add_column_if_not_exists(conn, "items", "approval_status", "VARCHAR(50) DEFAULT 'approved'")
        changes |= add_column_if_not_exists(conn, "items", "approved_by", "VARCHAR(36)")
        changes |= add_column_if_not_exists(conn, "items", "approved_at", "TIMESTAMP")
        changes |= add_column_if_not_exists(conn, "items", "rejection_reason", "TEXT")
        changes |= add_column_if_not_exists(conn, "items", "current_stock", "NUMERIC(14, 3) DEFAULT 0")
        changes |= add_column_if_not_exists(conn, "items", "min_stock_level", "NUMERIC(14, 3) DEFAULT 0")
        changes |= add_column_if_not_exists(conn, "items", "reorder_level", "NUMERIC(14, 3) DEFAULT 0")
        changes |= add_column_if_not_exists(conn, "items", "standard_cost", "NUMERIC(15, 2) DEFAULT 0")
        changes |= add_column_if_not_exists(conn, "items", "unit_price", "NUMERIC(15, 2) DEFAULT 0")
        
        # Godowns columns
        print("Checking godowns table...")
        changes |= add_column_if_not_exists(conn, "godowns", "city", "VARCHAR(100)")
        changes |= add_column_if_not_exists(conn, "godowns", "state", "VARCHAR(100)")
        changes |= add_column_if_not_exists(conn, "godowns", "pincode", "VARCHAR(20)")
        
        # Sales orders columns
        print("Checking sales_orders table...")
        changes |= add_column_if_not_exists(conn, "sales_orders", "store_status", "VARCHAR(50) DEFAULT 'pending'")
        
        # Purchase columns (GST breakdown and ITC)
        print("Checking purchases table...")
        changes |= add_column_if_not_exists(conn, "purchases", "cgst_amount", "NUMERIC(14, 2) DEFAULT 0")
        changes |= add_column_if_not_exists(conn, "purchases", "sgst_amount", "NUMERIC(14, 2) DEFAULT 0")
        changes |= add_column_if_not_exists(conn, "purchases", "igst_amount", "NUMERIC(14, 2) DEFAULT 0")
        changes |= add_column_if_not_exists(conn, "purchases", "cess_amount", "NUMERIC(14, 2) DEFAULT 0")
        changes |= add_column_if_not_exists(conn, "purchases", "itc_eligible", "BOOLEAN DEFAULT TRUE")
        changes |= add_column_if_not_exists(conn, "purchases", "itc_claimed", "BOOLEAN DEFAULT FALSE")
        changes |= add_column_if_not_exists(conn, "purchases", "itc_claim_date", "TIMESTAMP")
        
        if changes:
            conn.commit()
            print("\nChanges committed!")
        else:
            print("\nNo changes needed - all columns exist!")

if __name__ == "__main__":
    fix_enums()  # Fix enum types first (requires separate transaction)
    fix_columns()
    print("Done!")
