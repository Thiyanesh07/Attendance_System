const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api/v1'

export const googleLogin = async (credential) => {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/google-login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token: credential })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || 'Login failed')
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error('Google login error:', error)
    throw error
  }
}

export const verifyToken = async (token) => {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/verify?token=${token}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    })

    if (!response.ok) {
      return null
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error('Token verification error:', error)
    return null
  }
}

export const saveAuth = (authData) => {
  localStorage.setItem('access_token', authData.access_token)
  localStorage.setItem('user', JSON.stringify(authData.user))
}

export const getAuth = () => {
  const token = localStorage.getItem('access_token')
  const userStr = localStorage.getItem('user')
  
  if (!token || !userStr) {
    return null
  }

  try {
    const user = JSON.parse(userStr)
    return { token, user }
  } catch {
    return null
  }
}

export const clearAuth = () => {
  localStorage.removeItem('access_token')
  localStorage.removeItem('user')
}

export const isAuthenticated = () => {
  const auth = getAuth()
  return !!auth
}

export const getUserRole = () => {
  const auth = getAuth()
  return auth?.user?.role || null
}
