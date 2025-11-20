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
    location: ''
  })

  useEffect(() => {
    fetchCameras()
  }, [])

  const fetchCameras = async () => {
    try {
      setLoading(true)
      const { listCameras } = await import('../api')
      const response = await listCameras()
      // Convert camera IDs to objects
      const cameraObjects = response.map(id => ({
        id,
        name: `Camera ${id}`,
        location: 'Location ' + id,
        stream_url: id.toString(),
        status: 'active'
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
    setFormData({ stream_url: '', name: '', location: '' })
    setShowModal(true)
  }

  const handleEditCamera = (camera) => {
    setSelectedCamera(camera)
    setFormData({
      stream_url: camera.stream_url,
      name: camera.name,
      location: camera.location
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
    
    if (!formData.stream_url || formData.stream_url.trim() === '') {
      alert('Please enter a camera stream URL')
      return
    }
    
    if (selectedCamera) {
      alert('Edit functionality requires backend API implementation. Currently, you can only add or delete cameras.')
      return
    }
    
    try {
      const { addCamera } = await import('../api')
      // Pass just the string URL, not an object
      await addCamera(formData.stream_url.trim())
      alert('Camera added successfully!')
      setShowModal(false)
      setFormData({
        name: '',
        location: '',
        stream_url: ''
      })
      fetchCameras()
    } catch (err) {
      console.error('Error adding camera:', err)
      alert('Failed to add camera: ' + err.message)
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
                required
              />
              <p className="help-text">
                Enter "0" for default webcam, "1" for second camera, or RTSP URL for IP camera
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
