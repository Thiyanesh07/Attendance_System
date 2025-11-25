import React, { useState, useEffect } from 'react'
import './LiveMonitoring.css'

function LiveMonitoring() {
  const [cameras, setCameras] = useState([])
  const [selectedCamera, setSelectedCamera] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchCameras()
  }, [])

  const fetchCameras = async () => {
    try {
      setLoading(true)
      const { listCameras } = await import('../api')
      const response = await listCameras()
      // Handle both old format (array of IDs) and new format (array of camera objects)
      const cameraObjects = response.map(camera => {
        if (typeof camera === 'object' && camera.id) {
          // New format: camera object with all details
          return {
            id: camera.id,
            name: camera.name || `Camera ${camera.id}`,
            location: camera.location || 'Not specified',
            resolution: camera.resolution || 'Not specified',
            status: camera.is_active === 1 ? 'active' : 'inactive'
          }
        } else {
          // Old format: just camera ID
          return {
            id: camera,
            name: `Camera ${camera}`,
            location: `Location ${camera}`,
            status: 'active'
          }
        }
      })
      setCameras(cameraObjects)
      setLoading(false)
    } catch (err) {
      console.error('Error fetching cameras:', err)
      setLoading(false)
    }
  }

  const getCameraSnapshot = async (cameraId) => {
    try {
      const { getCameraSnapshot: getSnapshot } = await import('../api')
      const blob = await getSnapshot(cameraId)
      return URL.createObjectURL(blob)
    } catch (err) {
      console.error('Error getting camera snapshot:', err)
      return null
    }
  }

  if (loading) {
    return <div className="loading">Loading cameras...</div>
  }

  if (selectedCamera) {
    return (
      <div>
        <div className="page-header">
          <button 
            className="btn btn-secondary"
            onClick={() => setSelectedCamera(null)}
          >
            ← Back to Grid View
          </button>
          <h1 className="page-title">{selectedCamera.name}</h1>
        </div>

        <SingleCameraView camera={selectedCamera} />
      </div>
    )
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Live Monitoring</h1>
        <p className="page-subtitle">Monitor all active cameras in real-time</p>
      </div>

      {cameras.length > 0 ? (
        <div className="monitoring-grid">
          {cameras.map((camera) => (
            <div 
              key={camera.id} 
              className="monitoring-card"
              onClick={() => setSelectedCamera(camera)}
            >
              <div className="camera-preview">
                <CameraPreview cameraId={camera.id} />
                <div className="camera-overlay">
                  <span className="live-badge">🔴 LIVE</span>
                </div>
              </div>
              <div className="camera-info">
                <h3>{camera.name}</h3>
                <p>{camera.location}</p>
                <p>🆔 ID: {camera.id}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card">
          <p className="no-data">
            No active cameras found. Add cameras from the Cameras Management page.
          </p>
        </div>
      )}
    </div>
  )
}

// Camera Preview Component (shows snapshot)
function CameraPreview({ cameraId }) {
  const [snapshot, setSnapshot] = useState(null)

  useEffect(() => {
    const updateSnapshot = async () => {
      const { getCameraSnapshot } = await import('../api')
      try {
        const blob = await getCameraSnapshot(cameraId)
        const url = URL.createObjectURL(blob)
        setSnapshot(url)
      } catch (err) {
        console.error('Error loading snapshot:', err)
      }
    }

    updateSnapshot()
    const interval = setInterval(updateSnapshot, 2000) // Update every 2 seconds

    return () => {
      clearInterval(interval)
      if (snapshot) URL.revokeObjectURL(snapshot)
    }
  }, [cameraId])

  return (
    <div className="camera-snapshot">
      {snapshot ? (
        <img src={snapshot} alt={`Camera ${cameraId}`} />
      ) : (
        <div className="snapshot-placeholder">
          <p>📹</p>
          <p>Loading camera...</p>
        </div>
      )}
    </div>
  )
}

// Single Camera View Component
function SingleCameraView({ camera }) {
  const [isRunning, setIsRunning] = useState(false)
  const [recognizedFaces, setRecognizedFaces] = useState([])
  const [snapshot, setSnapshot] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let interval
    let isProcessing = false
    
    if (isRunning) {
      const processFrame = async () => {
        if (isProcessing) return // Skip if already processing
        
        isProcessing = true
        try {
          const { getCameraSnapshot, recognizeFrame } = await import('../api')
          const blob = await getCameraSnapshot(camera.id)

          // Create a File object from blob
          const file = new File([blob], 'frame.jpg', { type: 'image/jpeg' })
          
          // Recognize faces in the frame
          const result = await recognizeFrame(file, camera.id)
          
          // Use annotated frame with bounding boxes if available
          if (result.annotated_frame) {
            const url = `data:image/jpeg;base64,${result.annotated_frame}`
            if (snapshot && snapshot.startsWith('blob:')) {
              URL.revokeObjectURL(snapshot)
            }
            setSnapshot(url)
          } else {
            // Fallback to original snapshot
            const url = URL.createObjectURL(blob)
            setSnapshot(url)
          }
          
          if (result.recognized_faces) {
            setRecognizedFaces(result.recognized_faces)
          }
          
          setError(null) // Clear error on success
        } catch (err) {
          console.error('Error during recognition:', err)
          setError(err.message || 'Recognition error')
        } finally {
          isProcessing = false
        }
      }
      
      processFrame() // Initial call
      interval = setInterval(processFrame, 1000) // Process every 1 second
    }

    return () => {
      if (interval) clearInterval(interval)
      if (snapshot && snapshot.startsWith('blob:')) {
        URL.revokeObjectURL(snapshot)
      }
    }
  }, [isRunning, camera.id])

  return (
    <div className="single-camera-view">
      <div className="video-section">
        <div className="video-container">
          {snapshot ? (
            <img src={snapshot} alt={camera.name} className="camera-feed" />
          ) : (
            <div className="video-placeholder">
              <p>📹</p>
              <p>Click "Start Monitoring" to begin</p>
            </div>
          )}
          {isRunning && (
            <div className="recognition-overlay">
              <span className="live-badge">🔴 LIVE</span>
            </div>
          )}
        </div>

        {error && (
          <div className="error-message" style={{
            color: '#dc3545',
            padding: '10px',
            backgroundColor: '#f8d7da',
            borderRadius: '5px',
            margin: '10px 0'
          }}>
            ⚠️ Error: {error}
          </div>
        )}

        <div className="controls">
          {!isRunning ? (
            <button 
              onClick={() => {
                setIsRunning(true)
                setError(null)
              }}
              className="btn btn-primary"
            >
              ▶️ Start Monitoring
            </button>
          ) : (
            <button 
              onClick={() => setIsRunning(false)}
              className="btn btn-danger"
            >
              ⏸️ Stop Monitoring
            </button>
          )}
        </div>
      </div>

      <div className="sidebar">
        <div className="card">
          <h3>Recognition Results</h3>
          {isRunning && recognizedFaces.length === 0 && (
            <p className="no-data">👀 Waiting for faces...</p>
          )}
          {!isRunning && recognizedFaces.length === 0 && (
            <p className="no-data">Start monitoring to detect faces</p>
          )}
          {recognizedFaces.length > 0 && (
            <div className="faces-list">
              {recognizedFaces.map((face, index) => (
                <div key={index} className={`face-item ${face.name === 'Unknown' ? 'unknown' : 'known'}`}>
                  <div className="face-avatar" style={{
                    backgroundColor: face.name === 'Unknown' ? '#dc3545' : '#28a745'
                  }}>
                    {face.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="face-info">
                    <h4>{face.name}</h4>
                    {face.name !== 'Unknown' && (
                      <>
                        <p><strong>Similarity:</strong> {(face.similarity * 100).toFixed(1)}%</p>
                        <div className="confidence-bar">
                          <div 
                            className="confidence-fill"
                            style={{ 
                              width: `${face.similarity * 100}%`,
                              backgroundColor: face.similarity > 0.7 ? '#28a745' : '#ffc107'
                            }}
                          />
                        </div>
                      </>
                    )}
                    <p style={{ fontSize: '0.85em', color: '#666' }}>
                      Detection: {(face.confidence * 100).toFixed(1)}%
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <h3>Camera Details</h3>
          <p><strong>Name:</strong> {camera.name}</p>
          <p><strong>Location:</strong> {camera.location}</p>
          {camera.resolution && camera.resolution !== 'Not specified' && (
            <p><strong>Resolution:</strong> {camera.resolution}</p>
          )}
          <p><strong>ID:</strong> {camera.id}</p>
          <p><strong>Status:</strong> <span className="status-active">🟢 Active</span></p>
        </div>
      </div>
    </div>
  )
}

export default LiveMonitoring
