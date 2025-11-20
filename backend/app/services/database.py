from sqlalchemy import create_engine, Column, Integer, String, LargeBinary, DateTime, ForeignKey, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime
import numpy as np
import os

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./sql_app.db")

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    name = Column(String)
    google_id = Column(String, unique=True, index=True, nullable=True)
    role = Column(String)  # 'student' or 'admin'
    admin_password = Column(String, nullable=True)  # Only for admins, hashed
    is_active = Column(Boolean, default=True)
    is_approved = Column(Boolean, default=False)  # Students need admin approval
    created_at = Column(DateTime, default=datetime.utcnow)
    last_login = Column(DateTime)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)  # Which admin created this user

class Student(Base):
    __tablename__ = "students"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    roll_number = Column(String, unique=True, index=True)
    email = Column(String)
    department = Column(String, nullable=True)
    photo_path = Column(String)
    embedding = Column(LargeBinary) # Store numpy array as bytes
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    attendances = relationship("Attendance", back_populates="student")
    user = relationship("User", foreign_keys=[user_id])

    def get_embedding(self):
        return np.frombuffer(self.embedding, dtype=np.float32) if self.embedding else None

    def set_embedding(self, embedding_array):
        self.embedding = embedding_array.astype(np.float32).tobytes()

class Camera(Base):
    __tablename__ = "cameras"

    id = Column(Integer, primary_key=True, index=True)
    stream_url = Column(String)
    name = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Integer, default=1)  # 1 for active, 0 for inactive

class Attendance(Base):
    __tablename__ = "attendance"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"))
    timestamp = Column(DateTime, default=datetime.utcnow)
    camera_id = Column(String)

    student = relationship("Student", back_populates="attendances")

def create_db_and_tables():
    Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
