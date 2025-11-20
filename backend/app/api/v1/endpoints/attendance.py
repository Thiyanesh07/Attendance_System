from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from app.services.database import get_db, Attendance, Student
from typing import List
from datetime import datetime, timedelta
from pydantic import BaseModel
import csv
import io

router = APIRouter()

class MarkAttendanceRequest(BaseModel):
    roll_number: str
    status: str = "present"
    camera_id: str = None
    timestamp: str = None  # Optional custom timestamp in ISO format

@router.get("/", response_model=List[dict])
async def get_attendance_records(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    attendance_records = db.query(Attendance).order_by(Attendance.timestamp.desc()).offset(skip).limit(limit).all()
    
    results = []
    for record in attendance_records:
        student = db.query(Student).filter(Student.id == record.student_id).first()
        results.append({
            "id": record.id,
            "student_id": record.student_id,
            "student_name": student.name if student else "Unknown",
            "roll_number": student.roll_number if student else "N/A",
            "email": student.email if student else "N/A",
            "timestamp": record.timestamp.isoformat(),
            "date": record.timestamp.date().isoformat(),
            "time": record.timestamp.time().isoformat(),
            "camera_id": record.camera_id or "N/A",
            "camera": record.camera_id or "N/A",
            "status": "present",
            "confidence": 95.0  # Default confidence
        })
    return results

@router.get("/student/{student_email}", response_model=List[dict])
async def get_student_attendance(
    student_email: str,
    db: Session = Depends(get_db)
):
    # Find student by email
    student = db.query(Student).filter(Student.email == student_email).first()
    if not student:
        raise HTTPException(status_code=404, detail=f"Student with email '{student_email}' not found")
    
    # Get all attendance records for this student
    attendance_records = db.query(Attendance).filter(
        Attendance.student_id == student.id
    ).order_by(Attendance.timestamp.desc()).all()
    
    results = []
    for record in attendance_records:
        results.append({
            "id": record.id,
            "student_id": record.student_id,
            "student_name": student.name,
            "roll_number": student.roll_number,
            "email": student.email,
            "timestamp": record.timestamp.isoformat(),
            "date": record.timestamp.date().isoformat(),
            "time": record.timestamp.time().isoformat(),
            "camera_id": record.camera_id or "N/A",
            "camera": record.camera_id or "N/A",
            "status": "present",
            "confidence": 95.0  # Default confidence
        })
    return results

@router.post("/mark")
async def mark_attendance(
    request: MarkAttendanceRequest,
    db: Session = Depends(get_db)
):
    # Find student by roll number
    student = db.query(Student).filter(Student.roll_number == request.roll_number).first()
    if not student:
        raise HTTPException(status_code=404, detail=f"Student with roll number '{request.roll_number}' not found")
    
    # Parse timestamp if provided, otherwise use current time
    if request.timestamp:
        try:
            attendance_time = datetime.fromisoformat(request.timestamp.replace('Z', '+00:00'))
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid timestamp format. Use ISO format (YYYY-MM-DDTHH:MM:SS)")
    else:
        attendance_time = datetime.now()
    
    # Check for duplicate attendance on the same day
    attendance_date = attendance_time.date()
    day_start = datetime.combine(attendance_date, datetime.min.time())
    day_end = day_start + timedelta(days=1)
    
    existing_attendance = db.query(Attendance).filter(
        Attendance.student_id == student.id,
        Attendance.timestamp >= day_start,
        Attendance.timestamp < day_end
    ).first()
    
    if existing_attendance:
        return {
            "id": existing_attendance.id,
            "student_name": student.name,
            "roll_number": student.roll_number,
            "status": request.status,
            "timestamp": existing_attendance.timestamp.isoformat(),
            "camera_id": existing_attendance.camera_id,
            "message": f"Attendance already marked for {student.name} ({student.roll_number}) today at {existing_attendance.timestamp.strftime('%H:%M:%S')}",
            "duplicate": True
        }
    
    # Create attendance record
    attendance = Attendance(
        student_id=student.id,
        timestamp=attendance_time,
        camera_id=request.camera_id or "Manual"
    )
    db.add(attendance)
    db.commit()
    db.refresh(attendance)
    
    return {
        "id": attendance.id,
        "student_name": student.name,
        "roll_number": student.roll_number,
        "status": request.status,
        "timestamp": attendance.timestamp.isoformat(),
        "camera_id": attendance.camera_id,
        "message": f"Attendance marked for {student.name} ({student.roll_number})"
    }

@router.delete("/{attendance_id}")
async def delete_attendance(
    attendance_id: int,
    db: Session = Depends(get_db)
):
    attendance = db.query(Attendance).filter(Attendance.id == attendance_id).first()
    if not attendance:
        raise HTTPException(status_code=404, detail="Attendance record not found")
    
    db.delete(attendance)
    db.commit()
    return {"message": "Attendance record deleted successfully"}

@router.get("/export/csv")
async def export_attendance_csv(db: Session = Depends(get_db)):
    attendance_records = db.query(Attendance).order_by(Attendance.timestamp.desc()).all()
    
    # Create CSV in memory
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Write header
    writer.writerow(["ID", "Student Name", "Roll Number", "Email", "Date", "Time", "Camera ID", "Status"])
    
    # Write data
    for record in attendance_records:
        student = db.query(Student).filter(Student.id == record.student_id).first()
        writer.writerow([
            record.id,
            student.name if student else "Unknown",
            student.roll_number if student else "N/A",
            student.email if student else "N/A",
            record.timestamp.strftime("%Y-%m-%d"),
            record.timestamp.strftime("%H:%M:%S"),
            record.camera_id or "N/A",
            "Present"
        ])
    
    # Prepare response
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=attendance_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"}
    )
