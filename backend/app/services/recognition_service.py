import numpy as np
import insightface
from insightface.app import FaceAnalysis
from typing import List, Dict, Any, Tuple
from scipy.spatial.distance import cosine
import cv2
from app.config import config

class FaceRecognitionService:
    def __init__(self):
        # Load configuration
        fr_config = config.get_section('face_recognition')
        det_config = fr_config.get('detection', {})
        rec_config = fr_config.get('recognition', {})
        
        # Initialize FaceAnalysis with configured model
        providers = fr_config.get('providers', ['CUDAExecutionProvider', 'CPUExecutionProvider'])
        model_name = fr_config.get('model_name', 'buffalo_l')
        model_path = fr_config.get('model_path', './models')
        
        self.app = FaceAnalysis(
            name=model_name, 
            root=model_path, 
            providers=providers
        )
        
        # Try GPU configuration first, fallback to CPU
        det_size_gpu = tuple(det_config.get('det_size_gpu', [320, 320]))
        det_size_cpu = tuple(det_config.get('det_size_cpu', [192, 192]))
        det_thresh_gpu = det_config.get('det_threshold_gpu', 0.5)
        det_thresh_cpu = det_config.get('det_threshold_cpu', 0.6)
        
        try:
            self.app.prepare(ctx_id=0, det_size=det_size_gpu, det_thresh=det_thresh_gpu)
            print(f"✓ Face Recognition initialized with GPU (SCRFD-10G detector)")
            print(f"  Model: {model_name}, Detection size: {det_size_gpu}, Threshold: {det_thresh_gpu}")
        except:
            self.app.prepare(ctx_id=0, det_size=det_size_cpu, det_thresh=det_thresh_cpu)
            print(f"✓ Face Recognition initialized with CPU (SCRFD-10G detector)")
            print(f"  Model: {model_name}, Detection size: {det_size_cpu}, Threshold: {det_thresh_cpu}")
        
        # Store threshold for matching
        self.similarity_threshold = rec_config.get('similarity_threshold', 0.6)

    def get_face_embedding(self, face_image: np.ndarray) -> np.ndarray:
        """
        Get face embedding from a face image.
        The face_image can be either a full image (we'll detect and crop) or a cropped face.
        """
        # Use InsightFace's built-in detection and recognition
        faces = self.app.get(face_image)
        
        if len(faces) == 0:
            print("No face detected in the image")
            return None
        
        # Get the first face detected
        face = faces[0]
        
        # The embedding is already computed by InsightFace
        embedding = face.embedding
        
        return embedding

    def compare_embeddings(self, embedding1: np.ndarray, embedding2: np.ndarray, threshold: float = None) -> bool:
        if embedding1 is None or embedding2 is None:
            return False
        # Use configured threshold if not provided
        if threshold is None:
            threshold = self.similarity_threshold
        # Cosine distance is 1 - cosine similarity. Lower distance means higher similarity.
        distance = cosine(embedding1, embedding2)
        return distance < threshold

    def find_match(self, new_embedding: np.ndarray, registered_students: List[Dict[str, Any]], threshold: float = None) -> Tuple[str, float]:
        if new_embedding is None:
            return "Unknown", 0.0
        
        # Use configured threshold if not provided
        if threshold is None:
            threshold = self.similarity_threshold

        min_distance = float('inf')
        matched_student_name = "Unknown"

        for student in registered_students:
            student_embedding = student["embedding"]
            if student_embedding is None:
                continue

            distance = cosine(new_embedding, student_embedding)

            if distance < min_distance:
                min_distance = distance
                matched_student_name = student["name"]
        
        if min_distance < threshold:
            return matched_student_name, 1 - min_distance # Return similarity
        else:
            return "Unknown", 1 - min_distance # Return similarity even if not matched
