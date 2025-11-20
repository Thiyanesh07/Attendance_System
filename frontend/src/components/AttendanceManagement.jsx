import React, { useState, useEffect } from 'react'
import './AttendanceManagement.css'

function AttendanceManagement() {
  const [attendanceRecords, setAttendanceRecords] = useState([])
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterDate, setFilterDate] = useState('')
  const [showMarkModal, setShowMarkModal] = useState(false)
  const [selectedRollNumber, setSelectedRollNumber] = useState('')
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTime, setSelectedTime] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const { getAttendanceRecords, getAllStudents } = await import('../api')
      const [records, studentsData] = await Promise.all([
        getAttendanceRecords(),
        getAllStudents()
      ])
      setAttendanceRecords(records)
      setStudents(studentsData)
      setLoading(false)
    } catch (err) {
      console.error('Error fetching data:', err)
      setError('Failed to load data')
      setLoading(false)
    }
  }

  const handleMarkAttendance = async () => {
    if (!selectedRollNumber) {
      setError('Please select a student')
      return
    }

    try {
      setError('')
      const { markAttendance } = await import('../api')
      
      // Build timestamp if date/time provided
      let timestamp = null
      if (selectedDate && selectedTime) {
        timestamp = `${selectedDate}T${selectedTime}:00`
      } else if (selectedDate) {
        timestamp = `${selectedDate}T${new Date().toTimeString().slice(0, 8)}`
      }
      
      await markAttendance(selectedRollNumber, 'present', 'Manual', timestamp)
      
      const student = students.find(s => s.roll_number === selectedRollNumber)
      setSuccess(`Attendance marked for ${student?.name || selectedRollNumber}`)
      setShowMarkModal(false)
      setSelectedRollNumber('')
      setSelectedDate('')
      setSelectedTime('')
      fetchData() // Refresh the list
      
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err.message || 'Failed to mark attendance')
    }
  }

  const handleDeleteAttendance = async (id, studentName) => {
    if (!window.confirm(`Delete attendance record for ${studentName}?`)) {
      return
    }

    try {
      const { deleteAttendance } = await import('../api')
      await deleteAttendance(id)
      setSuccess('Attendance record deleted')
      fetchData()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err.message || 'Failed to delete attendance')
    }
  }

  const handleExportCSV = async () => {
    try {
      const { exportAttendanceCSV } = await import('../api')
      await exportAttendanceCSV()
      setSuccess('Attendance exported successfully')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err.message || 'Failed to export attendance')
    }
  }

  // Filter records
  const filteredRecords = attendanceRecords.filter(record => {
    const matchesSearch = record.student_name.toLowerCase().includes(searchTerm.toLowerCase())
    
    if (filterDate) {
      const recordDate = new Date(record.timestamp).toLocaleDateString()
      const selectedDate = new Date(filterDate).toLocaleDateString()
      return matchesSearch && recordDate === selectedDate
    }
    
    return matchesSearch
  })

  // Group records by date
  const groupedRecords = filteredRecords.reduce((acc, record) => {
    const date = new Date(record.timestamp).toLocaleDateString()
    if (!acc[date]) {
      acc[date] = []
    }
    acc[date].push(record)
    return acc
  }, {})

  if (loading) {
    return <div className="loading">Loading attendance records...</div>
  }

  return (
    <div className="attendance-management">
      <div className="page-header">
        <div>
          <h1 className="page-title">Attendance Management</h1>
          <p className="page-subtitle">View and manage student attendance records</p>
        </div>
        <div className="header-actions">
          <button 
            className="btn btn-success"
            onClick={handleExportCSV}
          >
            📥 Export CSV
          </button>
          <button 
            className="btn btn-primary"
            onClick={() => setShowMarkModal(true)}
          >
            Mark Attendance
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-error">
          ⚠️ {error}
          <button onClick={() => setError('')}>×</button>
        </div>
      )}

      {success && (
        <div className="alert alert-success">
          {success}
          <button onClick={() => setSuccess('')}>×</button>
        </div>
      )}

      {/* Search and Filter Bar */}
      <div className="filters-bar">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search by student name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="filter-date">
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
          />
          {filterDate && (
            <button 
              className="btn-clear"
              onClick={() => setFilterDate('')}
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-info">
            <h3>{attendanceRecords.length}</h3>
            <p>Total Records</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">👥</div>
          <div className="stat-info">
            <h3>{students.length}</h3>
            <p>Total Students</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📅</div>
          <div className="stat-info">
            <h3>{Object.keys(groupedRecords).length}</h3>
            <p>Days Recorded</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">✓</div>
          <div className="stat-info">
            <h3>{filteredRecords.length}</h3>
            <p>Filtered Results</p>
          </div>
        </div>
      </div>

      {/* Attendance Records by Date */}
      <div className="records-container">
        {Object.keys(groupedRecords).length > 0 ? (
          Object.entries(groupedRecords)
            .sort((a, b) => new Date(b[0]) - new Date(a[0]))
            .map(([date, records]) => (
              <div key={date} className="date-group">
                <div className="date-header">
                  <h2>📅 {date}</h2>
                  <span className="record-count">{records.length} records</span>
                </div>
                <div className="records-table">
                  <table>
                    <thead>
                      <tr>
                        <th>Student Name</th>
                        <th>Roll Number</th>
                        <th>Email</th>
                        <th>Time</th>
                        <th>Camera</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {records.map((record) => (
                        <tr key={record.id}>
                          <td>
                            <div className="student-cell">
                              <div className="student-avatar">
                                {record.student_name.charAt(0).toUpperCase()}
                              </div>
                              <span>{record.student_name}</span>
                            </div>
                          </td>
                          <td>{record.roll_number || 'N/A'}</td>
                          <td>{record.email || 'N/A'}</td>
                          <td>{new Date(record.timestamp).toLocaleTimeString()}</td>
                          <td>
                            <span className="camera-badge">
                              📹 {record.camera_id || 'Unknown'}
                            </span>
                          </td>
                          <td>
                            <span className="status-badge status-present">
                              ✓ Present
                            </span>
                          </td>
                          <td>
                            <button 
                              className="btn btn-danger btn-sm"
                              onClick={() => handleDeleteAttendance(record.id, record.student_name)}
                            >
                              🗑️ Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))
        ) : (
          <div className="no-data">
            <p>No attendance records found</p>
            {searchTerm || filterDate ? (
              <p className="hint">Try adjusting your filters</p>
            ) : (
              <p className="hint">Mark attendance to see records here</p>
            )}
          </div>
        )}
      </div>

      {/* Mark Attendance Modal */}
      {showMarkModal && (
        <div className="modal-overlay" onClick={() => setShowMarkModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Mark Attendance</h2>
              <button 
                className="modal-close"
                onClick={() => setShowMarkModal(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Select Student (Roll Number):</label>
                <select
                  value={selectedRollNumber}
                  onChange={(e) => setSelectedRollNumber(e.target.value)}
                  className="form-control"
                >
                  <option value="">-- Choose a student --</option>
                  {students.map((student) => (
                    <option key={student.id} value={student.roll_number}>
                      {student.roll_number} - {student.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="form-group">
                <label>Date:</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="form-control"
                  max={new Date().toISOString().split('T')[0]}
                />
                <p className="help-text">Leave empty for current date</p>
              </div>
              
              <div className="form-group">
                <label>Time:</label>
                <input
                  type="time"
                  value={selectedTime}
                  onChange={(e) => setSelectedTime(e.target.value)}
                  className="form-control"
                />
                <p className="help-text">Leave empty for current time</p>
              </div>
              
              <div className="form-group">
                <label>Status:</label>
                <div className="status-option selected">
                  <span className="status-icon">✓</span>
                  <span>Present</span>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button 
                className="btn btn-secondary"
                onClick={() => setShowMarkModal(false)}
              >
                Cancel
              </button>
              <button 
                className="btn btn-primary"
                onClick={handleMarkAttendance}
              >
                ✓ Mark Present
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AttendanceManagement
