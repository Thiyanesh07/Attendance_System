import numpy as np
from sqlalchemy.orm import Session
from app.services.recognition_service import FaceRecognitionService
from app.services.database import Student
from typing import List

class TrainingService:
    def __init__(self, recognition_service: FaceRecognitionService):
        self.recognition_service = recognition_service

    def generate_and_store_embedding(self, db: Session, student_name: str, image_data: np.ndarray, 
                                     roll_number: str = None, email: str = None, department: str = None, photo_path: str = None):
        embedding = self.recognition_service.get_face_embedding(image_data)
        if embedding is None:
            return None

        # Check if student already exists by name
        db_student = db.query(Student).filter(Student.name == student_name).first()
        
        if db_student:
            # Student exists, update their embedding by averaging with the new one
            existing_embedding = db_student.get_embedding()
            if existing_embedding is not None:
                # Average the embeddings to improve accuracy
                averaged_embedding = (existing_embedding + embedding) / 2
                # Normalize the averaged embedding
                averaged_embedding = averaged_embedding / np.linalg.norm(averaged_embedding)
                db_student.set_embedding(averaged_embedding)
            else:
                db_student.set_embedding(embedding)
            
            # Update other fields if provided
            if roll_number:
                db_student.roll_number = roll_number
            if email:
                db_student.email = email
            if department:
                db_student.department = department
            if photo_path:
                db_student.photo_path = photo_path
                
            db.commit()
            db.refresh(db_student)
        else:
            # Create new student
            db_student = Student(
                name=student_name,
                roll_number=roll_number,
                email=email,
                department=department,
                photo_path=photo_path
            )
            db_student.set_embedding(embedding)
            db.add(db_student)
            db.commit()
            db.refresh(db_student)
        
        return db_student

    def load_all_student_embeddings(self, db: Session) -> List[dict]:
        students = db.query(Student).all()
        return [{
            "id": student.id,
            "name": student.name,
            "roll_number": student.roll_number,
            "embedding": student.get_embedding()
        } for student in students if student.get_embedding() is not None]

    def store_student_embedding(self, db: Session, student_name: str, embedding: np.ndarray,
                                roll_number: str = None, email: str = None, department: str = None, photo_path: str = None, user_id: int = None):
        """Store student with pre-computed embedding"""
        db_student = Student(
            name=student_name,
            roll_number=roll_number,
            email=email,
            department=department,
            photo_path=photo_path,
            user_id=user_id
        )
        db_student.set_embedding(embedding)
        db.add(db_student)
        db.commit()
        db.refresh(db_student)
        return db_student

    def get_all_students_list(self, db: Session) -> List[dict]:
        """Get all students without embeddings for display purposes"""
        students = db.query(Student).all()
        return [{
            "id": student.id,
            "name": student.name,
            "roll_number": student.roll_number,
            "email": student.email,
            "department": student.department,
            "photo_path": student.photo_path
        } for student in students]
