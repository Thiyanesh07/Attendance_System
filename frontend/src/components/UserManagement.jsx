import React, { useState, useEffect } from 'react'
import './UserManagement.css'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api/v1'

function UserManagement() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddAdmin, setShowAddAdmin] = useState(false)
  const [showAddStudent, setShowAddStudent] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Form states
  const [adminForm, setAdminForm] = useState({
    email: '',
    name: '',
    password: '',
    adminPassword: ''
  })

  const [studentForm, setStudentForm] = useState({
    email: '',
    name: '',
    rollNumber: '',
    department: '',
    images: []
  })

  useEffect(() => {
    fetchUsers()
  }, [])

  const getAuthHeader = () => {
    const token = localStorage.getItem('access_token')
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  }

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${API_BASE_URL}/auth/users`, {
        headers: getAuthHeader()
      })

      if (!response.ok) {
        throw new Error('Failed to fetch users')
      }

      const data = await response.json()
      setUsers(data)
    } catch (err) {
      setError('Failed to load users: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleAddAdmin = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    try {
      const response = await fetch(`${API_BASE_URL}/auth/create-admin`, {
        method: 'POST',
        headers: getAuthHeader(),
        body: JSON.stringify({
          email: adminForm.email,
          name: adminForm.name,
          password: adminForm.password,
          admin_password: adminForm.adminPassword
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.detail || 'Failed to create admin')
      }

      setSuccess('Admin created successfully!')
      setAdminForm({ email: '', name: '', password: '', adminPassword: '' })
      setShowAddAdmin(false)
      fetchUsers()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleAddStudent = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    // Validate required fields
    if (!studentForm.department || !studentForm.department.trim()) {
      setError('Department is required')
      return
    }

    if (!studentForm.images || studentForm.images.length === 0) {
      setError('Please upload at least one training image')
      return
    }

    try {
      // First create the student account
      const response = await fetch(`${API_BASE_URL}/auth/create-student`, {
        method: 'POST',
        headers: getAuthHeader(),
        body: JSON.stringify({
          email: studentForm.email,
          name: studentForm.name,
          roll_number: studentForm.rollNumber,
          department: studentForm.department
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.detail || 'Failed to create student')
      }

      // Upload training images
      const formData = new FormData()
      formData.append('name', studentForm.name)
      formData.append('roll_number', studentForm.rollNumber)
      formData.append('email', studentForm.email)
      formData.append('department', studentForm.department)
      
      studentForm.images.forEach(file => {
        formData.append('files', file)
      })

      const uploadResponse = await fetch(`${API_BASE_URL}/students/`, {
        method: 'POST',
        body: formData
      })

      if (!uploadResponse.ok) {
        const uploadData = await uploadResponse.json()
        throw new Error(uploadData.detail || 'Student created but failed to upload images')
      }

      setSuccess(`Student created successfully with ${studentForm.images.length} training image(s)!`)

      setStudentForm({ email: '', name: '', rollNumber: '', department: '', images: [] })
      setShowAddStudent(false)
      fetchUsers()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleDeleteUser = async (userId, userName) => {
    if (!confirm(`Are you sure you want to delete ${userName}?`)) {
      return
    }

    setError('')
    setSuccess('')

    try {
      const response = await fetch(`${API_BASE_URL}/auth/users/${userId}`, {
        method: 'DELETE',
        headers: getAuthHeader()
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.detail || 'Failed to delete user')
      }

      setSuccess('User deleted successfully!')
      fetchUsers()
    } catch (err) {
      setError(err.message)
    }
  }

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading users...</p>
      </div>
    )
  }

  const adminUsers = users.filter(u => u.role === 'admin')
  const studentUsers = users.filter(u => u.role === 'student')

  return (
    <div className="user-management">
      <div className="page-header">
        <h1>User Management</h1>
        <p>Manage administrators and student accounts</p>
      </div>

      {error && (
        <div className="alert alert-error">
          {error}
          <button onClick={() => setError('')}>×</button>
        </div>
      )}

      {success && (
        <div className="alert alert-success">
          {success}
          <button onClick={() => setSuccess('')}>×</button>
        </div>
      )}

      <div className="actions-bar">
        <button 
          className="btn btn-primary"
          onClick={() => {
            setShowAddAdmin(true)
            setShowAddStudent(false)
          }}
        >
          + Add Administrator
        </button>
        <button 
          className="btn btn-success"
          onClick={() => {
            setShowAddStudent(true)
            setShowAddAdmin(false)
          }}
        >
          + Add Student
        </button>
      </div>

      {/* Add Admin Form */}
      {showAddAdmin && (
        <div className="modal-overlay" onClick={() => setShowAddAdmin(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Add New Administrator</h2>
            <form onSubmit={handleAddAdmin}>
              <div className="form-group">
                <label>Email *</label>
                <input
                  type="email"
                  placeholder="admin@bitsathy.ac.in"
                  value={adminForm.email}
                  onChange={(e) => setAdminForm({...adminForm, email: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>Name *</label>
                <input
                  type="text"
                  placeholder="Full name"
                  value={adminForm.name}
                  onChange={(e) => setAdminForm({...adminForm, name: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>Password for New Admin *</label>
                <input
                  type="password"
                  placeholder="Minimum 8 characters"
                  value={adminForm.password}
                  onChange={(e) => setAdminForm({...adminForm, password: e.target.value})}
                  required
                  minLength={8}
                />
              </div>
              <div className="form-group">
                <label>Your Admin Password *</label>
                <input
                  type="password"
                  placeholder="Enter your password to confirm"
                  value={adminForm.adminPassword}
                  onChange={(e) => setAdminForm({...adminForm, adminPassword: e.target.value})}
                  required
                />
                <small>Required for verification</small>
              </div>
              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddAdmin(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Create Administrator
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Student Form */}
      {showAddStudent && (
        <div className="modal-overlay" onClick={() => setShowAddStudent(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Add New Student</h2>
            <form onSubmit={handleAddStudent}>
              <div className="form-group">
                <label>Email *</label>
                <input
                  type="email"
                  placeholder="student@bitsathy.ac.in"
                  value={studentForm.email}
                  onChange={(e) => setStudentForm({...studentForm, email: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>Name *</label>
                <input
                  type="text"
                  placeholder="Full name"
                  value={studentForm.name}
                  onChange={(e) => setStudentForm({...studentForm, name: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>Roll Number *</label>
                <input
                  type="text"
                  placeholder="e.g., 7376221CS001"
                  value={studentForm.rollNumber}
                  onChange={(e) => setStudentForm({...studentForm, rollNumber: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>Department *</label>
                <input
                  type="text"
                  placeholder="e.g., Computer Science, Electronics"
                  value={studentForm.department}
                  onChange={(e) => setStudentForm({...studentForm, department: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>Training Images *</label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => setStudentForm({...studentForm, images: Array.from(e.target.files)})}
                  required
                />
                <small>Upload multiple clear photos of the student's face for recognition training</small>
                {studentForm.images.length > 0 && (
                  <p className="text-success" style={{marginTop: '8px', fontSize: '12px', color: '#38a169'}}>
                    {studentForm.images.length} image(s) selected
                  </p>
                )}
              </div>
              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddStudent(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-success">
                  Create Student Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Administrators List */}
      <div className="users-section">
        <h2>Administrators ({adminUsers.length})</h2>
        <div className="users-grid">
          {adminUsers.map(user => (
            <div key={user.id} className="user-card admin-card">
              <div className="user-header">
                <div className="user-icon">{user.name.charAt(0).toUpperCase()}</div>
                <span className="user-badge admin-badge">Admin</span>
              </div>
              <h3>{user.name}</h3>
              <p className="user-email">{user.email}</p>
              <div className="user-status">
                <span className={`status-indicator ${user.is_active ? 'active' : 'inactive'}`}>
                  {user.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <button 
                className="btn btn-danger btn-small"
                onClick={() => handleDeleteUser(user.id, user.name)}
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Students List */}
      <div className="users-section">
        <h2>Students ({studentUsers.length})</h2>
        <div className="users-grid">
          {studentUsers.map(user => (
            <div key={user.id} className="user-card student-card">
              <div className="user-header">
                <div className="user-icon">{user.name.charAt(0).toUpperCase()}</div>
                <span className="user-badge student-badge">Student</span>
              </div>
              <h3>{user.name}</h3>
              <p className="user-email">{user.email}</p>
              <div className="user-status">
                <span className={`status-indicator ${user.is_active ? 'active' : 'inactive'}`}>
                  {user.is_active ? 'Active' : 'Inactive'}
                </span>
                {user.is_approved ? 
                  <span className="approved-badge">Approved</span> : 
                  <span className="pending-badge">Pending</span>
                }
              </div>
              <button 
                className="btn btn-danger btn-small"
                onClick={() => handleDeleteUser(user.id, user.name)}
              >
                Delete
              </button>
            </div>
          ))}
          {studentUsers.length === 0 && (
            <div className="no-users">
              <p>No students added yet. Click "Add Student" to create student accounts.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default UserManagement
