"""
Verify database schema and ensure all tables have correct columns
"""

import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from backend.app.services.database import engine
from sqlalchemy import inspect

def verify_schema():
    inspector = inspect(engine)
    
    print("=== Database Schema Verification ===\n")
    
    # Check users table
    if 'users' in inspector.get_table_names():
        print("✓ Users table exists")
        user_columns = [col['name'] for col in inspector.get_columns('users')]
        print(f"  Columns: {', '.join(user_columns)}")
    else:
        print("✗ Users table does not exist")
    
    print()
    
    # Check students table
    if 'students' in inspector.get_table_names():
        print("✓ Students table exists")
        student_columns = [col['name'] for col in inspector.get_columns('students')]
        print(f"  Columns: {', '.join(student_columns)}")
        
        # Verify required columns
        required = ['id', 'name', 'roll_number', 'email', 'photo_path', 'embedding', 'user_id']
        missing = [col for col in required if col not in student_columns]
        if missing:
            print(f"  ✗ Missing columns: {', '.join(missing)}")
        else:
            print(f"  ✓ All required columns present")
    else:
        print("✗ Students table does not exist")
    
    print()
    
    # Check cameras table
    if 'cameras' in inspector.get_table_names():
        print("✓ Cameras table exists")
        camera_columns = [col['name'] for col in inspector.get_columns('cameras')]
        print(f"  Columns: {', '.join(camera_columns)}")
    else:
        print("✗ Cameras table does not exist")
    
    print()
    
    # Check attendance table
    if 'attendance' in inspector.get_table_names():
        print("✓ Attendance table exists")
        attendance_columns = [col['name'] for col in inspector.get_columns('attendance')]
        print(f"  Columns: {', '.join(attendance_columns)}")
    else:
        print("✗ Attendance table does not exist")
    
    print("\n=== Verification Complete ===")

if __name__ == "__main__":
    verify_schema()
