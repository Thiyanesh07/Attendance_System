"""
Database migration script to add department column to students table
Run this script to update your database schema
"""

import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from backend.app.services.database import engine
from sqlalchemy import inspect, text

def migrate_add_department():
    inspector = inspect(engine)
    
    # Check existing columns in students table
    student_columns = [col['name'] for col in inspector.get_columns('students')]
    
    with engine.connect() as conn:
        # Add department column to students table if it doesn't exist
        if 'department' not in student_columns:
            print("Adding department column to students table...")
            conn.execute(text("ALTER TABLE students ADD COLUMN department VARCHAR"))
            conn.commit()
            print("✓ department column added successfully!")
        else:
            print("✓ department column already exists in students table")
    
    print("✓ Database migration completed successfully!")

if __name__ == "__main__":
    print("Starting database migration to add department column...")
    try:
        migrate_add_department()
    except Exception as e:
        print(f"✗ Migration failed: {e}")
        sys.exit(1)
