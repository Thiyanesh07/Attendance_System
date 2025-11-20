from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.services.database import get_db, Student, Attendance
from app.services.live_stream_service import LiveStreamService
from datetime import datetime, timedelta

router = APIRouter()
live_stream_service = LiveStreamService()

@router.get("/stats")
async def get_dashboard_stats(db: Session = Depends(get_db)):
    """
    Get real-time dashboard statistics
    """
    # Total students
    total_students = db.query(Student).count()
    
    # Active cameras
    active_cameras = len(live_stream_service.get_all_cameras())
    
    # Present today (attendance marked today)
    today_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = today_start + timedelta(days=1)
    
    present_today = db.query(Attendance).filter(
        Attendance.timestamp >= today_start,
        Attendance.timestamp < today_end
    ).distinct(Attendance.student_id).count()
    
    # Overall attendance rate calculation
    # Get all attendance records and count unique student-days
    all_attendance = db.query(Attendance).all()
    
    if total_students == 0:
        attendance_rate = 0
    elif len(all_attendance) == 0:
        attendance_rate = 0
    else:
        # Count unique student-date combinations
        unique_student_days = set()
        for record in all_attendance:
            date_str = record.timestamp.date().isoformat()
            unique_student_days.add(f"{record.student_id}_{date_str}")
        
        # Get unique dates when attendance was taken
        unique_dates = set()
        for record in all_attendance:
            unique_dates.add(record.timestamp.date().isoformat())
        
        # Calculate: (total present student-days) / (total students × days with attendance)
        total_days_with_attendance = len(unique_dates)
        expected_attendance = total_students * total_days_with_attendance
        attendance_rate = (len(unique_student_days) / expected_attendance * 100) if expected_attendance > 0 else 0
    
    return {
        "total_students": total_students,
        "active_cameras": active_cameras,
        "present_today": present_today,
        "attendance_rate": round(attendance_rate, 1)
    }
