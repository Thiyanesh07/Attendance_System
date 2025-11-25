import React, { useState, useEffect } from 'react'
import './CamerasManagement.css'

function CamerasManagement() {
  const [cameras, setCameras] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [selectedCamera, setSelectedCamera] = useState(null)
  const [formData, setFormData] = useState({
    stream_url: '',
    name: '',
    location: '',
    resolution: ''
  })

  useEffect(() => {
    fetchCameras()
  }, [])

  const fetchCameras = async () => {
    try {
      setLoading(true)
      const { listCameras } = await import('../api')
      const response = await listCameras()
      // Use real camera data from backend
      const cameraObjects = response.map(camera => ({
        id: camera.id,
        name: camera.name || `Camera ${camera.id}`,
        location: camera.location || 'Not specified',
        stream_url: camera.stream_url,
        resolution: camera.resolution || 'Not specified',
        status: camera.is_active === 1 ? 'active' : 'inactive'
      }))
      setCameras(cameraObjects)
      setLoading(false)
    } catch (err) {
      console.error('Error fetching cameras:', err)
      setLoading(false)
    }
  }

  const handleAddCamera = () => {
    setSelectedCamera(null)
    setFormData({ stream_url: '', name: '', location: '', resolution: '' })
    setShowModal(true)
  }

  const handleEditCamera = (camera) => {
    setSelectedCamera(camera)
    setFormData({
      stream_url: camera.stream_url,
      name: camera.name,
      location: camera.location,
      resolution: camera.resolution
    })
    setShowModal(true)
  }

  const handleDeleteCamera = async (cameraId) => {
    if (!window.confirm('Are you sure you want to delete this camera?')) {
      return
    }
    
    try {
      const { removeCameraStream } = await import('../api')
      await removeCameraStream(cameraId)
      alert('Camera deleted successfully!')
      fetchCameras()
    } catch (err) {
      console.error('Error deleting camera:', err)
      alert('Failed to delete camera: ' + err.message)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (selectedCamera) {
      // Edit existing camera - only update name, location, and resolution
      try {
        const { updateCamera } = await import('../api')
        await updateCamera(
          selectedCamera.id,
          formData.name.trim() || null,
          formData.location.trim() || null,
          formData.resolution || null
        )
        alert('Camera updated successfully!')
        setShowModal(false)
        setFormData({
          name: '',
          location: '',
          stream_url: '',
          resolution: ''
        })
        fetchCameras()
      } catch (err) {
        console.error('Error updating camera:', err)
        alert('Failed to update camera: ' + err.message)
      }
      return
    }
    
    // Add new camera
    if (!formData.stream_url || formData.stream_url.trim() === '') {
      alert('Please enter a camera stream URL')
      return
    }
    
    try {
      const { addCamera } = await import('../api')
      // Send all camera data including name, location, and resolution
      await addCamera(
        formData.stream_url.trim(),
        formData.name.trim() || null,
        formData.location.trim() || null,
        formData.resolution.trim() || null
      )
      alert('Camera added successfully!')
      setShowModal(false)
      setFormData({
        name: '',
        location: '',
        stream_url: '',
        resolution: ''
      })
      fetchCameras()
    } catch (err) {
      console.error('Error adding camera:', err)
      let errorMessage = err.message || 'Failed to add camera'
      
      // Provide more helpful error messages
      if (errorMessage.includes('already exists')) {
        errorMessage = 'This camera stream URL is already added. Please use a different camera or remove the existing one first.'
      } else if (errorMessage.includes('Could not connect')) {
        errorMessage = 'Cannot connect to camera stream. Please check:\n\n' +
                      '• The stream URL is correct\n' +
                      '• The camera is powered on and accessible\n' +
                      '• Network connection is working\n' +
                      '• Authentication credentials are correct (if using RTSP)'
      }
      
      alert(errorMessage)
    }
  }

  if (loading) {
    return <div className="loading">Loading cameras...</div>
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Cameras Management</h1>
        <p className="page-subtitle">Add and manage camera streams</p>
      </div>

      <div className="card-actions">
        <div></div>
        <button className="btn btn-primary" onClick={handleAddCamera}>
          Add Camera
        </button>
      </div>

      {cameras.length > 0 ? (
        <div className="cameras-grid">
          {cameras.map((camera) => (
            <div key={camera.id} className="camera-card">
              <div className="camera-header">
                <div className="camera-icon">CAM</div>
                <span className={`status-badge ${camera.status === 'active' ? 'status-active' : 'status-inactive'}`}>
                  {camera.status === 'active' ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="camera-body">
                <h3>{camera.name}</h3>
                <p>Location: {camera.location}</p>
                <p>Resolution: {camera.resolution}</p>
                <p>Stream: {camera.stream_url}</p>
                <p>ID: {camera.id}</p>
              </div>
              <div className="camera-actions">
                <button
                  className="btn btn-sm btn-info"
                  onClick={() => handleEditCamera(camera)}
                >
                  Edit
                </button>
                <button
                  className="btn btn-sm btn-danger"
                  onClick={() => handleDeleteCamera(camera.id)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card">
          <p className="no-data">No cameras added yet. Click "Add Camera" to get started.</p>
        </div>
      )}

      {showModal && (
        <AddCameraModal
          camera={selectedCamera}
          formData={formData}
          setFormData={setFormData}
          onClose={() => setShowModal(false)}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  )
}

// Add Camera Modal Component
function AddCameraModal({ camera, formData, setFormData, onClose, onSubmit }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{camera ? 'Edit Camera' : 'Add New Camera'}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        
        <form onSubmit={onSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label>Camera Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="e.g., Main Entrance Camera"
              />
            </div>

            <div className="form-group">
              <label>Stream URL or Device ID</label>
              <input
                type="text"
                value={formData.stream_url}
                onChange={(e) => setFormData({...formData, stream_url: e.target.value})}
                placeholder="e.g., 0 for webcam or rtsp://..."
                required={!camera}
                readOnly={camera ? true : false}
                style={camera ? {backgroundColor: '#f0f0f0', cursor: 'not-allowed'} : {}}
              />
              <p className="help-text">
                {camera ? 'Stream URL cannot be changed after camera is added' : 'Enter "0" for default webcam, "1" for second camera, or RTSP URL for IP camera'}
              </p>
            </div>

            <div className="form-group">
              <label>Location</label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({...formData, location: e.target.value})}
                placeholder="e.g., Main Entrance, Building A"
              />
            </div>

            <div className="form-group">
              <label>Resolution</label>
              <select
                value={formData.resolution}
                onChange={(e) => setFormData({...formData, resolution: e.target.value})}
              >
                <option value="">Select Resolution</option>
                <option value="640x480">640x480 (VGA - Standard Definition)</option>
                <option value="1280x720">1280x720 (HD - 720p)</option>
                <option value="1920x1080">1920x1080 (Full HD - 1080p)</option>
                <option value="2560x1440">2560x1440 (QHD - 1440p)</option>
                <option value="3840x2160">3840x2160 (4K UHD)</option>
              </select>
              <p className="help-text">
                Select camera resolution (optional)
              </p>
            </div>
          </div>

          <div className="modal-footer">
            <button 
              type="button" 
              className="btn btn-secondary"
              onClick={onClose}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn btn-primary"
            >
              {camera ? 'Update Camera' : 'Add Camera'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CamerasManagement
