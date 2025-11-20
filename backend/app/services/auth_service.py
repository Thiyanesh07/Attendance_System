from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from google.oauth2 import id_token
from google.auth.transport import requests
import bcrypt
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Configuration
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")

# Debug: Print to verify env vars are loaded
if not GOOGLE_CLIENT_ID:
    print("⚠️  WARNING: GOOGLE_CLIENT_ID not found in environment variables!")
    print("   Make sure backend/.env file exists with GOOGLE_CLIENT_ID set")
else:
    print(f"✓ GOOGLE_CLIENT_ID loaded: {GOOGLE_CLIENT_ID[:20]}...")

ALLOWED_DOMAIN = "bitsathy.ac.in"

def hash_password(password: str) -> str:
    """Hash a password for storing"""
    # Limit password to 72 bytes (bcrypt limit)
    password_bytes = password.encode('utf-8')[:72]
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password_bytes, salt)
    return hashed.decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against a hash"""
    try:
        password_bytes = plain_password.encode('utf-8')[:72]
        hashed_bytes = hashed_password.encode('utf-8')
        return bcrypt.checkpw(password_bytes, hashed_bytes)
    except Exception as e:
        print(f"Password verification error: {e}")
        return False

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_token(token: str) -> dict:
    """Verify JWT token and return payload"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None

def verify_google_token(token: str) -> dict:
    """Verify Google OAuth token"""
    try:
        idinfo = id_token.verify_oauth2_token(
            token, 
            requests.Request(), 
            GOOGLE_CLIENT_ID
        )
        
        # Verify the issuer
        if idinfo['iss'] not in ['accounts.google.com', 'https://accounts.google.com']:
            raise ValueError('Wrong issuer.')
        
        # Extract user info
        email = idinfo.get('email')
        
        # Verify email domain
        if not email or not email.endswith('@' + ALLOWED_DOMAIN):
            raise ValueError(f'Email domain must be @{ALLOWED_DOMAIN}')
        
        return {
            'email': email,
            'name': idinfo.get('name'),
            'google_id': idinfo.get('sub'),
            'picture': idinfo.get('picture')
        }
    except Exception as e:
        print(f"Token verification error: {e}")
        return None

def extract_roll_number(email: str) -> Optional[str]:
    """Extract roll number from student email (before @)"""
    if email.endswith('@' + ALLOWED_DOMAIN):
        return email.split('@')[0]
    return None
