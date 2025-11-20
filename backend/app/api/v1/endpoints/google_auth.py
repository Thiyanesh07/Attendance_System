from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional, List
from app.services.database import get_db, User, Student
from app.services.auth_service import (
    verify_google_token, 
    create_access_token, 
    extract_roll_number,
    verify_token,
    hash_password,
    verify_password
)

router = APIRouter()

class GoogleLoginRequest(BaseModel):
    token: str

class LoginResponse(BaseModel):
    access_token: str
    token_type: str
    user: dict

class UserResponse(BaseModel):
    id: int
    email: str
    name: str
    role: str
    is_active: bool
    is_approved: bool

class CreateAdminRequest(BaseModel):
    email: EmailStr
    name: str
    password: str
    admin_password: str  # Current admin's password for verification

class CreateStudentRequest(BaseModel):
    email: EmailStr
    name: str
    roll_number: str
    department: str = None

class VerifyAdminPasswordRequest(BaseModel):
    password: str

def get_current_user(authorization: str = Header(None), db: Session = Depends(get_db)) -> User:
    """Get current user from Authorization header"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid authorization header"
        )
    
    token = authorization.replace("Bearer ", "")
    payload = verify_token(token)
    
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )
    
    user_id = payload.get("user_id")
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return user

def require_admin(current_user: User = Depends(get_current_user)) -> User:
    """Require user to be an admin"""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user

@router.post("/google-login", response_model=LoginResponse)
async def google_login(request: GoogleLoginRequest, db: Session = Depends(get_db)):
    """
    Authenticate user with Google OAuth token
    Only allows login if user exists in database (added by admin)
    """
    # Verify Google token
    google_user = verify_google_token(request.token)
    if not google_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Google token or email domain not allowed"
        )
    
    email = google_user['email']
    google_id = google_user['google_id']
    name = google_user['name']
    
    # Check if user exists in database
    user = db.query(User).filter(User.email == email).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Please contact an administrator to add your account."
        )
    
    # Check if user is approved (for students)
    if user.role == "student" and not user.is_approved:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account is pending approval by an administrator."
        )
    
    # Check if user is active
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been deactivated. Please contact an administrator."
        )
    
    # Update google_id if not set
    if not user.google_id:
        user.google_id = google_id
    
    # Update last login
    user.last_login = datetime.utcnow()
    db.commit()
    
    # Create access token
    access_token = create_access_token(
        data={
            "sub": user.email,
            "user_id": user.id,
            "role": user.role
        }
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "role": user.role
        }
    }

@router.get("/verify", response_model=UserResponse)
async def verify_user(token: str, db: Session = Depends(get_db)):
    """
    Verify JWT token and return user info
    """
    payload = verify_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )
    
    user_id = payload.get("user_id")
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return {
        "id": user.id,
        "email": user.email,
        "name": user.name,
        "role": user.role
    }

@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """
    Get current user info
    """
    return {
        "id": current_user.id,
        "email": current_user.email,
        "name": current_user.name,
        "role": current_user.role,
        "is_active": current_user.is_active,
        "is_approved": current_user.is_approved
    }

@router.post("/verify-admin-password")
async def verify_admin_password_endpoint(
    request: VerifyAdminPasswordRequest,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Verify admin's password for sensitive operations
    """
    if not current_user.admin_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Admin password not set"
        )
    
    if not verify_password(request.password, current_user.admin_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid password"
        )
    
    return {"message": "Password verified"}

@router.post("/create-admin")
async def create_admin(
    request: CreateAdminRequest,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Create a new admin (requires current admin's password)
    """
    # Verify current admin's password
    if not current_user.admin_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Your admin password is not set. Please contact system administrator."
        )
    
    if not verify_password(request.admin_password, current_user.admin_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid admin password"
        )
    
    # Check if email is in correct domain
    if not request.email.endswith("@bitsathy.ac.in"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email must be from @bitsathy.ac.in domain"
        )
    
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == request.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email already exists"
        )
    
    # Create new admin
    new_admin = User(
        email=request.email,
        name=request.name,
        role="admin",
        admin_password=hash_password(request.password),
        is_active=True,
        is_approved=True,
        created_at=datetime.utcnow(),
        created_by=current_user.id
    )
    
    db.add(new_admin)
    db.commit()
    db.refresh(new_admin)
    
    return {
        "message": "Admin created successfully",
        "user": {
            "id": new_admin.id,
            "email": new_admin.email,
            "name": new_admin.name,
            "role": new_admin.role
        }
    }

@router.post("/create-student")
async def create_student(
    request: CreateStudentRequest,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Create a new student account (admin only)
    """
    # Check if email is in correct domain
    if not request.email.endswith("@bitsathy.ac.in"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email must be from @bitsathy.ac.in domain"
        )
    
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == request.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email already exists"
        )
    
    # Check if student record already exists
    existing_student = db.query(Student).filter(
        (Student.email == request.email) | (Student.roll_number == request.roll_number)
    ).first()
    if existing_student:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Student with this email or roll number already exists"
        )
    
    # Create user account
    new_user = User(
        email=request.email,
        name=request.name,
        role="student",
        is_active=True,
        is_approved=True,  # Auto-approved since created by admin
        created_at=datetime.utcnow(),
        created_by=current_user.id
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # Create student record
    new_student = Student(
        name=request.name,
        roll_number=request.roll_number,
        email=request.email,
        department=request.department,
        user_id=new_user.id
    )
    
    db.add(new_student)
    db.commit()
    db.refresh(new_student)
    
    return {
        "message": "Student created successfully",
        "user": {
            "id": new_user.id,
            "email": new_user.email,
            "name": new_user.name,
            "role": new_user.role,
            "roll_number": new_student.roll_number
        }
    }

@router.get("/users", response_model=List[UserResponse])
async def list_users(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    List all users (admin only)
    """
    users = db.query(User).all()
    return [
        {
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "role": user.role,
            "is_active": user.is_active,
            "is_approved": user.is_approved
        }
        for user in users
    ]

@router.delete("/users/{user_id}")
async def delete_user(
    user_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Delete a user (admin only)
    """
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Prevent self-deletion
    if user.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete your own account"
        )
    
    # If student, also delete student record
    if user.role == "student":
        student = db.query(Student).filter(Student.user_id == user_id).first()
        if student:
            db.delete(student)
    
    db.delete(user)
    db.commit()
    
    return {"message": "User deleted successfully"}
