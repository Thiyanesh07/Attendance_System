import cv2
import threading
import time
from collections import deque
import numpy as np
import asyncio
from app.services.recognition_service import FaceRecognitionService
import logging

logger = logging.getLogger(__name__)

class VideoStreamWidget:
    def __init__(self, src=0, width=640, height=480, queue_size=2):
        self.stream = cv2.VideoCapture(src)
        self.stream.set(cv2.CAP_PROP_FRAME_WIDTH, width)
        self.stream.set(cv2.CAP_PROP_FRAME_HEIGHT, height)
        self.stream.set(cv2.CAP_PROP_FPS, 30)  # Higher FPS for real-time
        self.stream.set(cv2.CAP_PROP_BUFFERSIZE, 1)  # Minimize buffer lag
        self.grabbed, self.frame = self.stream.read()
        self.started = False
        self.read_lock = threading.Lock()
        self.frames_queue = deque(maxlen=queue_size)

    def start(self):
        if self.started:
            print("[!] Asynchroneous video capturing has already been started.")
            return None
        self.started = True
        self.thread = threading.Thread(target=self.update, args=())
        self.thread.start()
        return self

    def update(self):
        while self.started:
            grabbed, frame = self.stream.read()
            with self.read_lock:
                self.grabbed = grabbed
                if grabbed:
                    # Keep only the latest frame for minimal latency
                    self.frames_queue.clear()
                    self.frames_queue.append(frame)
            time.sleep(0.001)  # Minimal delay - 1ms

    def read(self):
        with self.read_lock:
            if self.frames_queue:
                return self.grabbed, self.frames_queue.pop() # Get newest frame
            return self.grabbed, self.frame # return last read frame if queue is empty

    def stop(self):
        self.started = False
        self.thread.join()

    def __exit__(self, exc_type, exc_value, traceback):
        self.stream.release()


class LiveStreamService:
    _instance = None
    _cameras = {}  # Dictionary to store camera streams
    _next_id = 0

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(LiveStreamService, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return
        self._initialized = True
        self.recognition_service = FaceRecognitionService()
        self._load_cameras_from_db()

    def _load_cameras_from_db(self):
        """Load active cameras from database on startup"""
        try:
            from app.services.database import SessionLocal, Camera
            db = SessionLocal()
            try:
                active_cameras = db.query(Camera).filter(Camera.is_active == 1).all()
                for cam in active_cameras:
                    # Restore camera with its original ID
                    try:
                        source = int(cam.stream_url)
                    except ValueError:
                        source = cam.stream_url
                    
                    stream = VideoStreamWidget(src=source)
                    stream.start()
                    self._cameras[cam.id] = stream
                    
                    # Update next_id to avoid conflicts
                    if cam.id >= self._next_id:
                        self._next_id = cam.id + 1
                    
                    logger.info(f"Restored camera {cam.id} from database: {cam.stream_url}")
            finally:
                db.close()
        except Exception as e:
            logger.error(f"Error loading cameras from database: {e}")

    def add_camera(self, stream_url):
        """Add a new camera stream and return its ID"""
        camera_id = self._next_id
        self._next_id += 1
        
        try:
            # Try to convert to int for webcam indices
            try:
                source = int(stream_url)
            except ValueError:
                source = stream_url
            
            stream = VideoStreamWidget(src=source)
            stream.start()
            self._cameras[camera_id] = stream
            
            # Save to database
            try:
                from app.services.database import SessionLocal, Camera
                db = SessionLocal()
                try:
                    db_camera = Camera(id=camera_id, stream_url=stream_url, name=f"Camera {camera_id}")
                    db.add(db_camera)
                    db.commit()
                    logger.info(f"Camera {camera_id} added and saved to database: {stream_url}")
                finally:
                    db.close()
            except Exception as db_error:
                logger.error(f"Failed to save camera to database: {db_error}")
            
            return camera_id
        except Exception as e:
            logger.error(f"Failed to add camera {stream_url}: {e}")
            return None

    def get_all_cameras(self):
        """Get list of all camera IDs"""
        return list(self._cameras.keys())

    def remove_camera(self, camera_id):
        """Remove a camera stream"""
        if camera_id in self._cameras:
            self._cameras[camera_id].stop()
            del self._cameras[camera_id]
            
            # Mark as inactive in database
            try:
                from app.services.database import SessionLocal, Camera
                db = SessionLocal()
                try:
                    db_camera = db.query(Camera).filter(Camera.id == camera_id).first()
                    if db_camera:
                        db_camera.is_active = 0
                        db.commit()
                        logger.info(f"Camera {camera_id} removed and marked inactive in database")
                finally:
                    db.close()
            except Exception as db_error:
                logger.error(f"Failed to update camera in database: {db_error}")
            
            return True
        return False

    def get_frame(self, camera_id):
        """Get the latest frame from a specific camera"""
        if camera_id not in self._cameras:
            logger.warning(f"Camera {camera_id} not found")
            return None
        
        grabbed, frame = self._cameras[camera_id].read()
        if not grabbed or frame is None:
            logger.warning(f"Could not read frame from camera {camera_id}")
            return None
        return frame

    async def get_processed_frame_for_stream(self, camera_id):
        """Get a processed frame with face detection for WebSocket streaming"""
        frame = self.get_frame(camera_id)
        if frame is None:
            return None

        # Perform face detection and recognition using InsightFace
        try:
            from app.config import get_bounding_box_config
            bbox_config = get_bounding_box_config()
            
            # Detect faces
            faces = self.recognition_service.app.get(frame)
            
            # Draw bounding boxes and labels
            font_scale = bbox_config.get('font_scale', 0.5)
            font_thickness = bbox_config.get('font_thickness', 1)
            box_thickness = bbox_config.get('box_thickness', 2)
            label_offset = bbox_config.get('label_offset_y', -10)
            color_known = tuple(bbox_config.get('box_color_known', [0, 255, 0]))
            color_unknown = tuple(bbox_config.get('box_color_unknown', [0, 0, 255]))
            
            for face in faces:
                bbox = face.bbox.astype(int)
                x1, y1, x2, y2 = bbox
                
                # For now, just draw boxes around detected faces
                # You can enhance this to load student embeddings and match
                label = "Face Detected"
                color = color_known
                
                cv2.rectangle(frame, (x1, y1), (x2, y2), color, box_thickness)
                cv2.putText(frame, label, (x1, y1 + label_offset), 
                           cv2.FONT_HERSHEY_SIMPLEX, font_scale, color, font_thickness)
        except Exception as e:
            logger.error(f"Error during face recognition: {e}")

        # Encode the frame as JPEG
        ret, buffer = cv2.imencode('.jpg', frame)
        if not ret:
            logger.error("Failed to encode frame to JPEG")
            return None
            
        return buffer.tobytes()
