from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.services.live_stream_service import LiveStreamService
import logging
import asyncio

router = APIRouter()
logger = logging.getLogger(__name__)

@router.websocket("/ws/live/{camera_id}")
async def websocket_endpoint(websocket: WebSocket, camera_id: int):
    await websocket.accept()
    logger.info(f"WebSocket connection established for camera_id: {camera_id}")
    
    stream_service = LiveStreamService()
    
    try:
        while True:
            frame_data = await stream_service.get_processed_frame_for_stream(camera_id)
            if frame_data:
                await websocket.send_bytes(frame_data)
                # Small yield to prevent blocking
                await asyncio.sleep(0.001)
            else:
                # If no frame is available, wait briefly
                await asyncio.sleep(0.01)
    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected for camera_id: {camera_id}")
    except Exception as e:
        logger.error(f"Error in WebSocket for camera_id {camera_id}: {e}")
    finally:
        # Clean up resources if necessary, e.g., release camera
        logger.info(f"Closing WebSocket connection for camera_id: {camera_id}")
