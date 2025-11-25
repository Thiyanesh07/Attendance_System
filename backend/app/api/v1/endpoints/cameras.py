from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from app.services.live_stream_service import LiveStreamService
from app.services.database import get_db, Camera
import cv2
import io

router = APIRouter()

live_stream_service = LiveStreamService()

class CameraCreate(BaseModel):
    stream_url: str
    name: Optional[str] = None
    location: Optional[str] = None
    resolution: Optional[str] = None

class CameraResponse(BaseModel):
    id: int
    stream_url: str
    name: str
    location: Optional[str] = None
    resolution: Optional[str] = None
    is_active: int
    
    class Config:
        from_attributes = True

@router.post("/add", response_model=dict)
async def add_camera_stream(
    stream_url: Optional[str] = None,
    name: Optional[str] = None,
    location: Optional[str] = None,
    resolution: Optional[str] = None,
    db: Session = Depends(get_db)
):
    if not stream_url:
        raise HTTPException(status_code=400, detail="stream_url is required")
    
    # Check if camera with same stream_url already exists
    existing_camera = db.query(Camera).filter(
        Camera.stream_url == stream_url,
        Camera.is_active == 1
    ).first()
    
    if existing_camera:
        raise HTTPException(
            status_code=400, 
            detail=f"Camera with this stream URL already exists (ID: {existing_camera.id}, Name: {existing_camera.name})"
        )
    
    # Add to live stream service (this returns None if it fails to connect)
    camera_id = live_stream_service.add_camera(stream_url)
    if camera_id is None:
        raise HTTPException(
            status_code=400, 
            detail="Could not connect to camera stream. Please check the stream URL and ensure the camera is accessible."
        )
    
    try:
        # Check if camera_id already exists in database (shouldn't happen but just in case)
        existing_id = db.query(Camera).filter(Camera.id == camera_id).first()
        if existing_id:
            # Update existing entry instead of creating new one
            existing_id.stream_url = stream_url
            existing_id.name = name if name else f"Camera {camera_id}"
            existing_id.location = location
            existing_id.resolution = resolution
            existing_id.is_active = 1
            db.commit()
            db.refresh(existing_id)
            db_camera = existing_id
        else:
            # Save new camera to database with additional details
            camera_name = name if name else f"Camera {camera_id}"
            db_camera = Camera(
                id=camera_id,
                stream_url=stream_url,
                name=camera_name,
                location=location,
                resolution=resolution,
                is_active=1
            )
            db.add(db_camera)
            db.commit()
            db.refresh(db_camera)
        
        return {
            "camera_id": db_camera.id,
            "name": db_camera.name,
            "location": db_camera.location,
            "resolution": db_camera.resolution,
            "message": f"Camera '{db_camera.name}' added successfully with ID {db_camera.id}"
        }
    except Exception as e:
        # If database save fails, remove the camera from live stream service
        live_stream_service.remove_camera(camera_id)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to save camera to database: {str(e)}"
        )

@router.get("/", response_model=List[CameraResponse])
async def list_cameras(db: Session = Depends(get_db)):
    cameras = db.query(Camera).filter(Camera.is_active == 1).all()
    return cameras

@router.put("/{camera_id}", response_model=dict)
async def update_camera(
    camera_id: int,
    name: Optional[str] = None,
    location: Optional[str] = None,
    resolution: Optional[str] = None,
    db: Session = Depends(get_db)
):
    camera = db.query(Camera).filter(Camera.id == camera_id).first()
    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found")
    
    # Update camera details (stream_url cannot be changed, only metadata)
    if name:
        camera.name = name
    if location is not None:  # Allow empty string to clear location
        camera.location = location
    if resolution is not None:  # Allow empty string to clear resolution
        camera.resolution = resolution
    
    db.commit()
    db.refresh(camera)
    
    return {
        "camera_id": camera.id,
        "name": camera.name,
        "location": camera.location,
        "resolution": camera.resolution,
        "message": f"Camera '{camera.name}' updated successfully"
    }

@router.delete("/{camera_id}")
async def remove_camera_stream(camera_id: int, db: Session = Depends(get_db)):
    # Remove from live stream service
    if live_stream_service.remove_camera(camera_id):
        # Mark as inactive in database
        camera = db.query(Camera).filter(Camera.id == camera_id).first()
        if camera:
            camera.is_active = 0
            db.commit()
        return {"message": f"Camera stream {camera_id} removed"}
    raise HTTPException(status_code=404, detail="Camera stream not found")

@router.get("/{camera_id}/snapshot")
async def get_camera_snapshot(camera_id: int):
    frame = live_stream_service.get_frame(camera_id)
    if frame is None:
        raise HTTPException(status_code=404, detail="Camera not found or no frame available")

    # Encode the frame to JPEG
    _, buffer = cv2.imencode('.jpg', frame)
    io_buf = io.BytesIO(buffer)
    return StreamingResponse(io_buf, media_type="image/jpeg")