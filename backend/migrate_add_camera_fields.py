"""
Migration script to add location and resolution fields to cameras table
"""
import sqlite3
import os

def migrate_camera_table():
    db_path = "./sql_app.db"
    
    if not os.path.exists(db_path):
        print(f"Database not found at {db_path}")
        return
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Check if columns already exist
        cursor.execute("PRAGMA table_info(cameras)")
        columns = [column[1] for column in cursor.fetchall()]
        
        # Add location column if it doesn't exist
        if 'location' not in columns:
            print("Adding 'location' column to cameras table...")
            cursor.execute("ALTER TABLE cameras ADD COLUMN location TEXT")
            print("✓ 'location' column added successfully")
        else:
            print("'location' column already exists")
        
        # Add resolution column if it doesn't exist
        if 'resolution' not in columns:
            print("Adding 'resolution' column to cameras table...")
            cursor.execute("ALTER TABLE cameras ADD COLUMN resolution TEXT")
            print("✓ 'resolution' column added successfully")
        else:
            print("'resolution' column already exists")
        
        conn.commit()
        print("\n✓ Migration completed successfully!")
        
    except Exception as e:
        print(f"Error during migration: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    print("=" * 50)
    print("Camera Table Migration")
    print("=" * 50)
    migrate_camera_table()
