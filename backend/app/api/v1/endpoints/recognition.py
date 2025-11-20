from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import numpy as np
import cv2
from app.services.recognition_service import FaceRecognitionService
from app.services.training_service import TrainingService
from app.services.database import get_db, Attendance
from app.config import config, get_bounding_box_config, get_attendance_config, get_live_stream_config
from fastapi import UploadFile, File
from io import BytesIO
from PIL import Image
import base64
from datetime import datetime, timedelta

router = APIRouter()

# Removed unused FaceDetector - using InsightFace SCRFD-10G instead
recognition_service = FaceRecognitionService()
training_service = TrainingService(recognition_service=recognition_service)

# Load configuration
bbox_config = get_bounding_box_config()
attendance_config = get_attendance_config()
live_config = config.get_section('live_stream')

# Cache student embeddings to avoid loading from DB every frame
_student_cache = {"data": None, "last_update": None}
_attendance_cooldown = {}  # Track last attendance time for each student

def get_cached_students(db: Session):
    """Load students from cache or DB if cache is old"""
    now = datetime.now()
    cache_refresh = live_config.get('cache_refresh_seconds', 30)
    if (_student_cache["data"] is None or 
        _student_cache["last_update"] is None or 
        (now - _student_cache["last_update"]).seconds > cache_refresh):
        _student_cache["data"] = training_service.load_all_student_embeddings(db)
        _student_cache["last_update"] = now
    return _student_cache["data"]

@router.post("/recognize-frame")
async def recognize_frame(
    file: UploadFile = File(...),
    camera_id: str = None,
    db: Session = Depends(get_db)
):
    contents = await file.read()
    np_image = np.frombuffer(contents, np.uint8)
    image = cv2.imdecode(np_image, cv2.IMREAD_COLOR)

    if image is None:
        raise HTTPException(status_code=400, detail="Could not decode image")

    # Resize image for faster processing
    resize_width = live_config.get('resize_width', 480)
    h, w = image.shape[:2]
    if w > resize_width:
        scale = resize_width / w
        image = cv2.resize(image, (resize_width, int(h * scale)), interpolation=cv2.INTER_LINEAR)
        h, w = image.shape[:2]

    recognized_faces = []
    registered_students = get_cached_students(db)  # Use cache

    # Use InsightFace for faster detection and recognition with GPU
    max_faces = config.get('face_recognition.detection.max_faces', 10)
    faces = recognition_service.app.get(image, max_num=max_faces)
    
    for face in faces:
        bbox = face.bbox.astype(int)
        x1, y1, x2, y2 = bbox
        
        # Face embedding is already computed by InsightFace
        embedding = face.embedding
        name, similarity = recognition_service.find_match(embedding, registered_students)

        recognized_faces.append({
            "bbox": [int(x1), int(y1), int(x2), int(y2)],
            "confidence": float(face.det_score),
            "name": name,
            "similarity": float(similarity)
        })
        
        if name != "Unknown":
            # Record attendance only once per cooldown period per student
            student_id = next((s["id"] for s in registered_students if s["name"] == name), None)
            if student_id:
                now = datetime.now()
                last_recorded = _attendance_cooldown.get(student_id)
                
                cooldown_minutes = attendance_config.get('cooldown_minutes', 5)
                auto_mark = attendance_config.get('auto_mark_enabled', True)
                
                # Only record if more than cooldown minutes since last attendance
                if auto_mark and (last_recorded is None or (now - last_recorded) > timedelta(minutes=cooldown_minutes)):
                    attendance = Attendance(
                        student_id=student_id,
                        camera_id=str(camera_id) if camera_id else "Unknown"
                    )
                    db.add(attendance)
                    db.commit()
                    _attendance_cooldown[student_id] = now

    # Encode the image with bounding boxes for response
    font_scale = bbox_config.get('font_scale', 0.5)
    font_thickness = bbox_config.get('font_thickness', 1)
    box_thickness = bbox_config.get('box_thickness', 2)
    label_offset = bbox_config.get('label_offset_y', -10)
    color_known = tuple(bbox_config.get('box_color_known', [0, 255, 0]))
    color_unknown = tuple(bbox_config.get('box_color_unknown', [0, 0, 255]))
    
    for face in recognized_faces:
        x1, y1, x2, y2 = face["bbox"]
        name = face["name"]
        
        # Get roll number for label
        roll_number = None
        if name != "Unknown":
            student = next((s for s in registered_students if s["name"] == name), None)
            if student and "roll_number" in student:
                roll_number = student["roll_number"]
        
        label = roll_number if roll_number else name
        color = color_known if name != "Unknown" else color_unknown
        cv2.rectangle(image, (x1, y1), (x2, y2), color, box_thickness)
        cv2.putText(image, label, (x1, y1 + label_offset), cv2.FONT_HERSHEY_SIMPLEX, font_scale, color, font_thickness)
    
    # Convert annotated image to base64 string
    jpeg_quality = live_config.get('jpeg_quality', 85)
    _, buffer = cv2.imencode('.jpg', image, [cv2.IMWRITE_JPEG_QUALITY, jpeg_quality])
    jpg_as_text = base64.b64encode(buffer).decode('utf-8')

    return {"recognized_faces": recognized_faces, "annotated_frame": jpg_as_text}
