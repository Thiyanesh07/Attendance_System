import React, { useState, useRef, useEffect } from 'react';
import { getAllStudents, listCameras } from '../api';

const LiveRecognition = () => {
  const [students, setStudents] = useState([]);
  const [error, setError] = useState(null);
  const [availableCameras, setAvailableCameras] = useState([]);
  const [cameraStreams, setCameraStreams] = useState({}); // Store frames for each camera
  const websockets = useRef({}); // Store WebSocket connections for each camera

  useEffect(() => {
    const initialize = async () => {
      try {
        // Fetch students
        const fetchedStudents = await getAllStudents();
        setStudents(fetchedStudents);

        // Fetch cameras from backend
        const cameras = await listCameras();
        setAvailableCameras(cameras);

        // Start all cameras automatically
        cameras.forEach(cameraId => {
          startCameraStream(cameraId);
        });
      } catch (err) {
        console.error("Error initializing:", err);
        setError("Failed to initialize. Is the backend running?");
      }
    };

    initialize();

    // Cleanup all WebSocket connections on component unmount
    return () => {
      Object.values(websockets.current).forEach(ws => {
        if (ws) ws.close();
      });
    };
  }, []);

  const startCameraStream = (cameraId) => {
    // Close existing connection if any
    if (websockets.current[cameraId]) {
      websockets.current[cameraId].close();
    }

    // Start a new WebSocket connection
    const wsUrl = `ws://127.0.0.1:8000/api/v1/stream/ws/live/${cameraId}`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log(`WebSocket connected for camera ${cameraId}`);
    };

    ws.onmessage = (event) => {
      // The message is a Blob containing the image data
      const frameUrl = URL.createObjectURL(event.data);
      
      // Clean up old frame URL to prevent memory leaks
      setCameraStreams(prev => {
        if (prev[cameraId]) {
          URL.revokeObjectURL(prev[cameraId]);
        }
        return { ...prev, [cameraId]: frameUrl };
      });
    };

    ws.onerror = (err) => {
      console.error(`WebSocket error for camera ${cameraId}:`, err);
    };

    ws.onclose = () => {
      console.log(`WebSocket closed for camera ${cameraId}`);
    };

    websockets.current[cameraId] = ws;
  };

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold text-gray-800">Live Face Recognition</h3>
      
      {error && <p className="mt-4 text-red-600 text-center">Error: {error}</p>}

      {availableCameras.length === 0 ? (
        <p className="text-center text-gray-600">No cameras available. Please add cameras in Camera Management.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {availableCameras.map(cameraId => (
            <div key={cameraId} className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="bg-blue-600 text-white px-4 py-2">
                <h4 className="font-semibold">Camera {cameraId}</h4>
              </div>
              <div className="p-2">
                {cameraStreams[cameraId] ? (
                  <img 
                    src={cameraStreams[cameraId]} 
                    alt={`Camera ${cameraId} Live Feed`} 
                    className="w-full h-auto rounded"
                  />
                ) : (
                  <div className="bg-gray-200 w-full h-48 flex items-center justify-center rounded">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                      <p className="mt-2 text-gray-600">Connecting...</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LiveRecognition;
