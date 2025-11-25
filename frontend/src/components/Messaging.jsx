import React, { useState, useEffect } from 'react'
import './Messaging.css'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api/v1'

function Messaging({ userRole, userId, userEmail }) {
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCompose, setShowCompose] = useState(false)
  const [newMessage, setNewMessage] = useState({
    subject: '',
    message: ''
  })
  const [selectedMessage, setSelectedMessage] = useState(null)
  const [replyText, setReplyText] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [filter, setFilter] = useState('all') // 'all', 'read', 'unread'

  useEffect(() => {
    fetchMessages()
    // Poll for new messages every 30 seconds
    const interval = setInterval(fetchMessages, 30000)
    return () => clearInterval(interval)
  }, [])

  const getAuthHeader = () => {
    const token = localStorage.getItem('access_token')
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  }

  const fetchMessages = async () => {
    try {
      setLoading(true)
      const endpoint = userRole === 'admin' 
        ? `${API_BASE_URL}/messages/admin/all`
        : `${API_BASE_URL}/messages/student/${userId}`
      
      const response = await fetch(endpoint, {
        headers: getAuthHeader()
      })

      if (!response.ok) {
        throw new Error('Failed to fetch messages')
      }

      const data = await response.json()
      setMessages(data)
    } catch (err) {
      setError('Failed to load messages: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSendMessage = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!newMessage.subject.trim() || !newMessage.message.trim()) {
      setError('Please fill in all fields')
      return
    }

    try {
      const response = await fetch(`${API_BASE_URL}/messages/send`, {
        method: 'POST',
        headers: getAuthHeader(),
        body: JSON.stringify({
          subject: newMessage.subject,
          message: newMessage.message,
          sender_id: userId,
          sender_email: userEmail
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.detail || 'Failed to send message')
      }

      setSuccess('Message sent successfully!')
      setNewMessage({ subject: '', message: '' })
      setShowCompose(false)
      fetchMessages()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleReply = async (messageId) => {
    setError('')
    setSuccess('')

    if (!replyText.trim()) {
      setError('Please enter a reply')
      return
    }

    try {
      const response = await fetch(`${API_BASE_URL}/messages/${messageId}/reply`, {
        method: 'POST',
        headers: getAuthHeader(),
        body: JSON.stringify({
          reply: replyText
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.detail || 'Failed to send reply')
      }

      setSuccess('Reply sent successfully!')
      setReplyText('')
      setSelectedMessage(null)
      fetchMessages()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleMarkAsRead = async (messageId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/messages/${messageId}/read`, {
        method: 'PUT',
        headers: getAuthHeader()
      })

      if (!response.ok) {
        throw new Error('Failed to mark message as read')
      }

      fetchMessages()
    } catch (err) {
      console.error('Error marking message as read:', err)
    }
  }

  const handleDeleteMessage = async (messageId) => {
    if (!window.confirm('Are you sure you want to delete this message? This action cannot be undone.')) {
      return
    }

    try {
      const response = await fetch(`${API_BASE_URL}/messages/${messageId}`, {
        method: 'DELETE',
        headers: getAuthHeader()
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.detail || 'Failed to delete message')
      }

      setSuccess('Message deleted successfully!')
      setSelectedMessage(null)
      fetchMessages()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleViewMessage = (message) => {
    setSelectedMessage(message)
    if (userRole === 'admin' && !message.is_read) {
      handleMarkAsRead(message.id)
    }
  }

  const filteredMessages = messages.filter(msg => {
    if (filter === 'all') return true
    if (filter === 'read') return msg.is_read
    if (filter === 'unread') return !msg.is_read
    return true
  })

  const unreadCount = messages.filter(m => !m.is_read).length

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading messages...</p>
      </div>
    )
  }

  return (
    <div className="messaging-container">
      <div className="messaging-header">
        <div>
          <h1>Messages</h1>
          <p>{userRole === 'admin' ? 'Student queries and messages' : 'Contact administration'}</p>
        </div>
        {userRole === 'student' && (
          <button className="btn btn-primary" onClick={() => setShowCompose(true)}>
            Compose Message
          </button>
        )}
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

      {/* Admin Filter */}
      {userRole === 'admin' && (
        <div className="message-filters">
          <button 
            className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All Messages ({messages.length})
          </button>
          <button 
            className={`filter-btn ${filter === 'unread' ? 'active' : ''}`}
            onClick={() => setFilter('unread')}
          >
            Unread ({unreadCount})
          </button>
          <button 
            className={`filter-btn ${filter === 'read' ? 'active' : ''}`}
            onClick={() => setFilter('read')}
          >
            Read ({messages.length - unreadCount})
          </button>
        </div>
      )}

      {/* Compose Message Modal (Student) */}
      {showCompose && (
        <div className="modal-overlay" onClick={() => setShowCompose(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>New Message to Admin</h2>
            <form onSubmit={handleSendMessage}>
              <div className="form-group">
                <label>Subject *</label>
                <input
                  type="text"
                  placeholder="Brief description of your query"
                  value={newMessage.subject}
                  onChange={(e) => setNewMessage({...newMessage, subject: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>Message *</label>
                <textarea
                  rows="6"
                  placeholder="Describe your query or issue in detail..."
                  value={newMessage.message}
                  onChange={(e) => setNewMessage({...newMessage, message: e.target.value})}
                  required
                />
              </div>
              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCompose(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Send Message
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Messages List */}
      <div className="messages-list">
        {filteredMessages.length === 0 ? (
          <div className="no-messages">
            <p>{filter === 'unread' ? 'No unread messages' : filter === 'read' ? 'No read messages' : 'No messages yet'}</p>
          </div>
        ) : (
          filteredMessages.map((msg) => (
            <div 
              key={msg.id} 
              className={`message-card ${!msg.is_read ? 'unread' : ''}`}
              onClick={() => handleViewMessage(msg)}
            >
              <div className="message-header-row">
                <div className="message-info">
                  <h3>{msg.subject}</h3>
                  <p className="message-meta">
                    <span className="sender">From: {msg.sender_email}</span>
                    <span className="date">{new Date(msg.created_at).toLocaleString()}</span>
                  </p>
                </div>
                <div className="message-status">
                  {!msg.is_read && <span className="status-badge unread-badge">Unread</span>}
                  {msg.admin_reply && <span className="status-badge replied-badge">Replied</span>}
                  {userRole === 'student' && msg.admin_reply && msg.is_read && (
                    <span className="status-badge seen-badge">Seen</span>
                  )}
                </div>
              </div>
              <p className="message-preview">{msg.message.substring(0, 100)}...</p>
            </div>
          ))
        )}
      </div>

      {/* Message Detail Modal */}
      {selectedMessage && (
        <div className="modal-overlay" onClick={() => setSelectedMessage(null)}>
          <div className="modal-content message-detail" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-section">
              <h2>{selectedMessage.subject}</h2>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <button 
                  className="btn btn-danger btn-sm"
                  onClick={() => handleDeleteMessage(selectedMessage.id)}
                  title="Delete message"
                >🗑️ Delete</button>
                <button className="modal-close" onClick={() => setSelectedMessage(null)}>×</button>
              </div>
            </div>
            
            <div className="message-detail-content">
              <div className="message-meta-detail">
                <span><strong>From:</strong> {selectedMessage.sender_email}</span>
                <span><strong>Date:</strong> {new Date(selectedMessage.created_at).toLocaleString()}</span>
                <span>
                  <strong>Status:</strong> 
                  {selectedMessage.is_read ? ' Read' : ' Unread'}
                  {selectedMessage.admin_reply && ' • Replied'}
                </span>
              </div>

              <div className="message-body">
                <h4>Message:</h4>
                <p>{selectedMessage.message}</p>
              </div>

              {selectedMessage.admin_reply && (
                <div className="message-reply-section">
                  <h4>Admin Reply:</h4>
                  <p>{selectedMessage.admin_reply}</p>
                  <small className="reply-date">
                    Replied on: {new Date(selectedMessage.reply_date).toLocaleString()}
                  </small>
                </div>
              )}

              {userRole === 'admin' && !selectedMessage.admin_reply && (
                <div className="reply-form">
                  <h4>Reply to Student:</h4>
                  <textarea
                    rows="4"
                    placeholder="Type your reply here..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                  />
                  <button 
                    className="btn btn-primary"
                    onClick={() => handleReply(selectedMessage.id)}
                  >
                    Send Reply
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Messaging
