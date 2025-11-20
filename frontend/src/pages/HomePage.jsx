import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { GoogleLogin } from '@react-oauth/google'
import { googleLogin, saveAuth, getAuth } from '../auth'
import './HomePage.css'

function HomePage() {
  const [activeTab, setActiveTab] = useState('student')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    // Check if already authenticated
    const auth = getAuth()
    if (auth) {
      if (auth.user.role === 'admin') {
        navigate('/admin')
      } else if (auth.user.role === 'student') {
        const email = auth.user.email
        const rollNumber = email.split('@')[0]
        navigate(`/student/${rollNumber}`)
      }
    }
  }, [])

  const handleGoogleSuccess = async (credentialResponse) => {
    setLoading(true)
    setError('')

    try {
      const authData = await googleLogin(credentialResponse.credential)
      saveAuth(authData)

      // Navigate based on role
      if (authData.user.role === 'admin') {
        navigate('/admin')
      } else if (authData.user.role === 'student') {
        const email = authData.user.email
        const rollNumber = email.split('@')[0]
        navigate(`/student/${rollNumber}`)
      }
    } catch (err) {
      setError(err.message || 'Login failed. Please ensure you are using a @bitsathy.ac.in email.')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleError = () => {
    setError('Google Sign-In failed. Please try again.')
  }

  return (
    <div className="home-page">
      <div className="login-background">
        <div className="floating-shapes">
          <div className="shape shape-1"></div>
          <div className="shape shape-2"></div>
          <div className="shape shape-3"></div>
        </div>
      </div>

      <div className="login-content">
        <div className="brand-header">
          <div className="brand-logo">
            <div className="logo-circle">
              <span>BIT</span>
            </div>
            <div className="brand-text">
              <h1>BIT Sathy</h1>
              <p>Smart Attendance System</p>
            </div>
          </div>
        </div>

        <div className="login-box">
          <div className="login-header">
            <h2>Welcome</h2>
            <p>Sign in with your institutional account</p>
          </div>

          <div className="role-selector">
            <button
              className={`role-btn ${activeTab === 'student' ? 'active' : ''}`}
              onClick={() => setActiveTab('student')}
            >
              <span className="role-label">Student</span>
            </button>
            <button
              className={`role-btn ${activeTab === 'admin' ? 'active' : ''}`}
              onClick={() => setActiveTab('admin')}
            >
              <span className="role-label">Administrator</span>
            </button>
          </div>

          {error && (
            <div className="alert alert-error">
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <div className="loading-state">
              <div className="loader"></div>
              <p>Authenticating...</p>
            </div>
          ) : (
            <div className="google-signin">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={handleGoogleError}
                useOneTap={false}
                theme="outline"
                size="large"
                text="signin_with"
                width="100%"
              />
            </div>
          )}

          <div className="login-info">
            <p className="info-text">Use your @bitsathy.ac.in email</p>
            {activeTab === 'admin' && (
              <p className="admin-notice">Admin access requires authorization</p>
            )}
          </div>
        </div>

        <div className="login-footer-text">
          <p>Powered by AI Face Recognition • Secure • Real-time</p>
        </div>
      </div>
    </div>
  )
}

export default HomePage
