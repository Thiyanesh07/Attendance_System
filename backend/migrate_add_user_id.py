"""
Database migration script to add user_id column to students table
Run this script to update your database schema
"""

import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from backend.app.services.database import engine
from sqlalchemy import inspect, text

def migrate_add_user_id():
    inspector = inspect(engine)
    
    # Check existing columns in students table
    student_columns = [col['name'] for col in inspector.get_columns('students')]
    
    with engine.connect() as conn:
        # Add user_id column to students table if it doesn't exist
        if 'user_id' not in student_columns:
            print("Adding user_id column to students table...")
            conn.execute(text("ALTER TABLE students ADD COLUMN user_id INTEGER"))
            conn.commit()
            print("✓ user_id column added successfully!")
        else:
            print("✓ user_id column already exists in students table")
    
    print("✓ Database migration completed successfully!")

if __name__ == "__main__":
    print("Starting database migration to add user_id column...")
    try:
        migrate_add_user_id()
    except Exception as e:
        print(f"✗ Migration failed: {e}")
        sys.exit(1)
