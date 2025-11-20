#!/usr/bin/env python3
"""
Setup script for adding the initial admin user to the database
Run this before starting the application for the first time
"""

import sys
import os
import getpass

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.database import SessionLocal, User, create_db_and_tables
from app.services.auth_service import hash_password
from datetime import datetime

def create_initial_admin():
    """Create the first admin user with password"""
    create_db_and_tables()
    
    print("\n" + "="*60)
    print("  INITIAL ADMIN SETUP - Face Attendance System")
    print("="*60)
    print("\nThis will create the first admin account.")
    print("This admin can then add other admins and students via the web interface.\n")
    
    email = input("Enter admin email (must be @bitsathy.ac.in): ").strip()
    
    if not email.endswith('@bitsathy.ac.in'):
        print("❌ Error: Email must end with @bitsathy.ac.in")
        return False
    
    name = input("Enter admin name: ").strip()
    
    if not name:
        print("❌ Error: Name cannot be empty")
        return False
    
    password = getpass.getpass("Enter admin password (will be hidden): ").strip()
    
    if len(password) < 8:
        print("❌ Error: Password must be at least 8 characters")
        return False
    
    password_confirm = getpass.getpass("Confirm password: ").strip()
    
    if password != password_confirm:
        print("❌ Error: Passwords do not match")
        return False
    
    db = SessionLocal()
    try:
        # Check if user already exists
        existing_user = db.query(User).filter(User.email == email).first()
        
        if existing_user:
            print(f"\n⚠️  User with email {email} already exists")
            update = input("Update to admin with new password? (y/n): ").strip().lower()
            if update == 'y':
                existing_user.role = 'admin'
                existing_user.name = name
                existing_user.admin_password = hash_password(password)
                existing_user.is_active = True
                existing_user.is_approved = True
                db.commit()
                print(f"\n✅ Successfully updated {email} to admin role")
            else:
                print("❌ Cancelled")
                return False
        else:
            # Create new admin user
            admin_user = User(
                email=email,
                name=name,
                role='admin',
                admin_password=hash_password(password),
                is_active=True,
                is_approved=True,
                created_at=datetime.utcnow()
            )
            db.add(admin_user)
            db.commit()
            print(f"\n✅ Successfully created admin account for {name} ({email})")
        
        print("\n" + "="*60)
        print("  ADMIN ACCOUNT CREATED!")
        print("="*60)
        print(f"\n  Email: {email}")
        print(f"  Name: {name}")
        print(f"\n  Next steps:")
        print(f"  1. Start the backend server")
        print(f"  2. Go to the web interface")
        print(f"  3. Click 'Sign in with Google' on Administrator tab")
        print(f"  4. Use this email to login")
        print(f"  5. Use your password to add more admins/students")
        print("\n" + "="*60 + "\n")
        return True
    
    except Exception as e:
        print(f"\n❌ Error: {e}")
        db.rollback()
        return False
    finally:
        db.close()

def list_admins():
    """List all admin users"""
    db = SessionLocal()
    try:
        admins = db.query(User).filter(User.role == 'admin').all()
        
        if not admins:
            print("\n📋 No admin users found")
        else:
            print(f"\n📋 Admin Users ({len(admins)}):")
            print("-" * 60)
            for admin in admins:
                print(f"  • {admin.name} ({admin.email})")
                print(f"    Status: {'Active' if admin.is_active else 'Inactive'}")
                if admin.last_login:
                    print(f"    Last login: {admin.last_login}")
                else:
                    print(f"    Never logged in")
                print()
            print("-" * 60)
    finally:
        db.close()

def main():
    # Create database tables first
    create_db_and_tables()
    
    db = SessionLocal()
    try:
        # Check if any admin exists
        admin_count = db.query(User).filter(User.role == 'admin').count()
        
        if admin_count == 0:
            print("\n⚠️  No admin users found. Creating initial admin...\n")
            if create_initial_admin():
                return
        else:
            print("\n" + "="*60)
            print("  Face Attendance System - Admin Management")
            print("="*60)
            print(f"\n  Current admin users: {admin_count}")
            
            while True:
                print("\nOptions:")
                print("  1. Create new admin user")
                print("  2. List all admin users")
                print("  3. Exit")
                
                choice = input("\nSelect option (1-3): ").strip()
                
                if choice == '1':
                    create_initial_admin()
                elif choice == '2':
                    list_admins()
                elif choice == '3':
                    print("\n👋 Goodbye!")
                    break
                else:
                    print("❌ Invalid option")
    finally:
        db.close()

if __name__ == "__main__":
    main()
