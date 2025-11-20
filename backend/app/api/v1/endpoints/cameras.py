from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from app.services.live_stream_service import LiveStreamService
import cv2
import io

router = APIRouter()

live_stream_service = LiveStreamService()

@router.post("/add")
async def add_camera_stream(stream_url: str):
    camera_id = live_stream_service.add_camera(stream_url)
    if camera_id is None:
        raise HTTPException(status_code=400, detail="Could not add camera stream")
    return {"camera_id": camera_id, "message": f"Camera stream added with ID {camera_id}"}

@router.get("/")
async def list_cameras():
    camera_ids = live_stream_service.get_all_cameras()
    return {"cameras": [{"id": cam_id} for cam_id in camera_ids]}

@router.delete("/{camera_id}")
async def remove_camera_stream(camera_id: int):
    if live_stream_service.remove_camera(camera_id):
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