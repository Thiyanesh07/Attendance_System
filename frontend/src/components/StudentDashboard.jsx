import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { clearAuth, getAuth } from '../auth'
import Messaging from './Messaging'
import './StudentDashboard.css'

function StudentDashboard() {
  const { rollNumber } = useParams()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('dashboard')
  const [student, setStudent] = useState(null)
  const [attendance, setAttendance] = useState([])
  const [todayStatus, setTodayStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchStudentData()
  }, [rollNumber])

  const fetchStudentData = async () => {
    try {
      setLoading(true)
      const auth = getAuth()
      
      if (!auth || !auth.user) {
        setError('Not authenticated')
        setLoading(false)
        return
      }

      // Fetch all students and find the one matching the logged-in user's email
      const { getAllStudents, getStudentAttendance } = await import('../api')
      const students = await getAllStudents()
      
      const currentStudent = students.find(s => s.email === auth.user.email)
      
      if (!currentStudent) {
        setError('Student record not found')
        setLoading(false)
        return
      }

      // Fetch attendance specifically for this student
      const studentAttendance = await getStudentAttendance(auth.user.email)

      // Calculate stats
      const presentDays = studentAttendance.filter(r => r.status === 'present').length
      const totalDays = studentAttendance.length
      const attendancePercentage = totalDays > 0 ? ((presentDays / totalDays) * 100).toFixed(1) : 0

      setStudent({
        ...currentStudent,
        attendance_percentage: attendancePercentage,
        present_days: presentDays,
        total_days: totalDays,
        year: currentStudent.year || 'N/A',
        section: currentStudent.section || 'N/A'
      })

      setAttendance(studentAttendance)

      // Check today's status
      const today = new Date().toDateString()
      const todayRecord = studentAttendance.find(
        record => new Date(record.timestamp).toDateString() === today
      )
      setTodayStatus(todayRecord || null)
      
      setLoading(false)
    } catch (err) {
      console.error('Error fetching student data:', err)
      setError('Unable to fetch student data: ' + err.message)
      setLoading(false)
    }
  }

  const handleLogout = () => {
    clearAuth()
    navigate('/')
  }

  if (loading) {
    return <div className="loading">Loading student data...</div>
  }

  if (error) {
    return (
      <div className="container">
        <div className="alert alert-danger">{error}</div>
        <button onClick={handleLogout} className="btn btn-secondary">
          Back to Home
        </button>
      </div>
    )
  }

  return (
    <div className="student-dashboard">
      <nav className="navbar">
        <div className="navbar-content">
          <div className="navbar-brand">Student Portal</div>
          <div className="nav-tabs">
            <button 
              className={`nav-tab ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => setActiveTab('dashboard')}
            >
              Dashboard
            </button>
            <button 
              className={`nav-tab ${activeTab === 'messages' ? 'active' : ''}`}
              onClick={() => setActiveTab('messages')}
            >
              Messages
            </button>
          </div>
          <button onClick={handleLogout} className="btn btn-secondary">
            Logout
          </button>
        </div>
      </nav>

      <div className="container">
        {activeTab === 'messages' ? (
          <Messaging userRole="student" userId={getAuth()?.user?.id} userEmail={getAuth()?.user?.email} />
        ) : (
          <>
            {/* Student Info Card */}
            <div className="card student-info-card">
              <div className="student-header">
                <div className="student-avatar">
                  <div className="avatar-placeholder">
                    {student.name.charAt(0).toUpperCase()}
                  </div>
                </div>
                <div className="student-details">
                  <h1>{student.name}</h1>
                  <p>Roll Number: <strong>{student.roll_number}</strong></p>
                  <p>{student.department} | {student.year} | Section {student.section}</p>
                  <p>Email: {student.email}</p>
                </div>
              </div>
            </div>

            {/* Today's Status */}
            <div className="card">
              <h2>Today's Status</h2>
              <div className="today-status">
                {todayStatus ? (
                  <div className="status-present-container">
                    <div className="status-icon">✔</div>
                    <div>
                      <h3>Present</h3>
                      <p>Marked at {new Date(todayStatus.timestamp).toLocaleTimeString()}</p>
                      <p>Camera: {todayStatus.camera}</p>
                    </div>
                  </div>
                ) : (
                  <div className="status-absent-container">
                    <div className="status-icon">✗</div>
                    <div>
                      <h3>Absent</h3>
                      <p>Not marked today</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Stats Cards */}
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-value">{student.attendance_percentage}%</div>
                <div className="stat-label">Attendance Rate</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{student.present_days}</div>
                <div className="stat-label">Days Present</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{student.total_days}</div>
                <div className="stat-label">Total Days</div>
              </div>
            </div>

            {/* Attendance History */}
            <div className="card">
              <h2>Attendance History</h2>
              {attendance.length > 0 ? (
                <div className="table-container">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Time</th>
                        <th>Status</th>
                        <th>Camera</th>
                        <th>Confidence</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attendance.map((record) => (
                        <tr key={record.id}>
                          <td>{new Date(record.timestamp).toLocaleDateString()}</td>
                          <td>{new Date(record.timestamp).toLocaleTimeString()}</td>
                          <td>
                            <span className="status-badge status-present">
                              Present
                            </span>
                          </td>
                          <td>{record.camera}</td>
                          <td>-</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="no-data">No attendance records found.</p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default StudentDashboard
