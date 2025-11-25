from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
import numpy as np
import cv2
from datetime import datetime
from app.services.database import get_db, Student, User
from app.services.training_service import TrainingService
from app.services.recognition_service import FaceRecognitionService
from typing import List

router = APIRouter()

recognition_service = FaceRecognitionService() # Initialize once
training_service = TrainingService(recognition_service=recognition_service)

@router.post("/", response_model=dict)
async def add_student(
    name: str = Form(...),
    roll_number: str = Form(...),
    email: str = Form(None),
    department: str = Form(None),
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db)
):
    # Check if student with roll number already exists
    existing_student = db.query(Student).filter(Student.roll_number == roll_number).first()
    if existing_student:
        raise HTTPException(status_code=400, detail="Student with this roll number already exists")
    
    # Check if user with email already exists
    if email:
        existing_user = db.query(User).filter(User.email == email).first()
        if existing_user:
            raise HTTPException(status_code=400, detail="User with this email already exists")
    
    import os
    photo_dir = "./student_photos"
    os.makedirs(photo_dir, exist_ok=True)
    
    # Process all images and compute average embedding
    embeddings = []
    saved_photos = []
    
    for idx, file in enumerate(files):
        contents = await file.read()
        np_image = np.frombuffer(contents, np.uint8)
        image = cv2.imdecode(np_image, cv2.IMREAD_COLOR)

        if image is None:
            continue
        
        # Save photo
        photo_filename = f"{roll_number}_{idx+1}.jpg"
        photo_path = os.path.join(photo_dir, photo_filename)
        cv2.imwrite(photo_path, image)
        saved_photos.append(photo_path)
        
        # Get embedding
        embedding = recognition_service.get_face_embedding(image)
        if embedding is not None:
            embeddings.append(embedding)
    
    if len(embeddings) == 0:
        # Clean up saved photos
        for photo in saved_photos:
            if os.path.exists(photo):
                os.remove(photo)
        raise HTTPException(status_code=400, detail="No faces detected in any of the images")
    
    # Compute average embedding
    avg_embedding = np.mean(embeddings, axis=0)
    
    # Create User account if email is provided
    user_id = None
    if email:
        new_user = User(
            email=email,
            name=name,
            role="student",
            is_active=True,
            is_approved=True,  # Auto-approved since added by admin
            created_at=datetime.utcnow()
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        user_id = new_user.id
    
    # Store student with average embedding
    photo_paths = ";".join(saved_photos)  # Store all photo paths
    db_student = training_service.store_student_embedding(
        db, name, avg_embedding,
        roll_number=roll_number, 
        email=email,
        department=department,
        photo_path=photo_paths,
        user_id=user_id
    )
    
    return {"message": f"Student {db_student.name} added successfully with {len(embeddings)} photo(s)", "id": db_student.id}

@router.get("/", response_model=List[dict])
async def get_all_students(db: Session = Depends(get_db)):
    students = training_service.get_all_students_list(db)
    return students

@router.delete("/{student_id}")
async def delete_student(student_id: int, db: Session = Depends(get_db)):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    # Delete photo files if exist
    if student.photo_path:
        import os
        photo_paths = student.photo_path.split(";")
        for photo_path in photo_paths:
            if os.path.exists(photo_path):
                os.remove(photo_path)
    
    # Delete associated User account and related data if exists
    if student.user_id:
        user = db.query(User).filter(User.id == student.user_id).first()
        if user:
            # Import Message model to delete messages
            from app.api.v1.endpoints.messages import Message
            
            # Delete all messages sent by this user
            db.query(Message).filter(Message.sender_id == user.id).delete()
            
            # Delete the user
            db.delete(user)
    
    # Delete student from database
    db.delete(student)
    db.commit()
    
    return {"message": f"Student {student.name} deleted successfully"}
