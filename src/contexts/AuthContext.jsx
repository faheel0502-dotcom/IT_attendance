import { useEffect, useState, useCallback } from 'react'
import api from '../lib/api'
import { AuthContext } from './AuthContextValue'

export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => {
    const token = localStorage.getItem('token')
    return token ? { token } : null
  })
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('user')
      return savedUser ? JSON.parse(savedUser) : null
    } catch {
      return null
    }
  })

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      setSession(null)
      setUser(null)
      return
    }

    // Validate token silently in background without blocking initial app render
    api.get('/auth/me')
      .then(({ data }) => {
        setSession({ token })
        setUser(data.user)
        localStorage.setItem('user', JSON.stringify(data.user))
      })
      .catch(() => {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        setSession(null)
        setUser(null)
      })
  }, [])

  const signIn = useCallback(async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password })
    localStorage.setItem('token', data.token)
    localStorage.setItem('user', JSON.stringify(data.user))
    setSession({ token: data.token })
    setUser(data.user)
    return data
  }, [])

  const signOut = useCallback(async () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setSession(null)
    setUser(null)
  }, [])

  const changePassword = useCallback(async (currentPassword, newPassword) => {
    const { data } = await api.post('/auth/change-password', { currentPassword, newPassword })
    return data
  }, [])

  const loading = session === undefined

  return (
    <AuthContext.Provider value={{ session, user, loading, signIn, signOut, changePassword }}>
      {children}
    </AuthContext.Provider>
  )
}
