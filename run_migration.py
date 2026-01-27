"""Run database migration for pending features."""
import os
from pathlib import Path
from sqlalchemy import text
from app.database.connection import engine

def run_migration():
    """Execute the migration SQL file."""
    migration_file = Path(__file__).parent / "migrations" / "add_pending_features_columns.sql"
    
    if not migration_file.exists():
        print(f"Migration file not found: {migration_file}")
        return
    
    print("Reading migration file...")
    with open(migration_file, "r") as f:
        sql_content = f.read()
    
    # Split by semicolon and execute each statement
    statements = [s.strip() for s in sql_content.split(";") if s.strip() and not s.strip().startswith("--")]
    
    print(f"Executing {len(statements)} SQL statements...")
    
    with engine.connect() as conn:
        for i, statement in enumerate(statements):
            if statement.strip():
                try:
                    conn.execute(text(statement))
                    print(f"  [{i+1}/{len(statements)}] OK")
                except Exception as e:
                    error_msg = str(e)
                    if "already exists" in error_msg.lower() or "duplicate" in error_msg.lower():
                        print(f"  [{i+1}/{len(statements)}] Skipped (already exists)")
                    else:
                        print(f"  [{i+1}/{len(statements)}] Error: {error_msg[:100]}")
        
        conn.commit()
    
    print("\nMigration completed!")

if __name__ == "__main__":
    run_migration()
