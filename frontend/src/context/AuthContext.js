import React, { createContext, useContext, useState, useEffect } from 'react'
import axios from 'axios'

const AuthContext = createContext()

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
      fetchMe(token)
    } else {
      setLoading(false)
    }
  }, [])

  const fetchMe = async (token) => {
    try {
      const response = await axios.get('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      })
      setUser(response.data)
      setIsAuthenticated(true)
    } catch {
      localStorage.removeItem('access_token')
      delete axios.defaults.headers.common['Authorization']
      setIsAuthenticated(false)
    } finally {
      setLoading(false)
    }
  }

  const login = async (email, password) => {
    try {
      const response = await axios.post('/api/auth/login', { email, password })
      const data = response.data

      if (data.requires_2fa && data.temporary_token) {
        return {
          success: false,
          requires2fa: true,
          temporary_token: data.temporary_token,
          message: data.message || 'Informe o código do aplicativo autenticador.',
        }
      }

      const { access_token, user: userData } = data
      localStorage.setItem('access_token', access_token)
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`
      setUser(userData)
      setIsAuthenticated(true)
      return { success: true }
    } catch (error) {
      let message = 'Falha no login'
      if (!error.response) {
        message = 'Backend indisponível. Verifique sua conexão ou tente novamente mais tarde.'
      } else if (error.response.status === 401) {
        message = 'Email ou senha inválidos.'
      } else if (error.response.status === 403) {
        message = 'Conta desativada.'
      } else if (error.response.data?.error) {
        message = error.response.data.error
      }
      return { success: false, message }
    }
  }

  const verify2fa = async (temporary_token, code) => {
    try {
      const response = await axios.post('/api/auth/2fa/verify-login', {
        temporary_token,
        code: code.trim(),
      })
      const { access_token, user: userData } = response.data
      localStorage.setItem('access_token', access_token)
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`
      setUser(userData)
      setIsAuthenticated(true)
      return { success: true }
    } catch (error) {
      const message = error.response?.data?.error || 'Código inválido ou expirado. Tente novamente.'
      return { success: false, message }
    }
  }

  const logout = () => {
    localStorage.removeItem('access_token')
    delete axios.defaults.headers.common['Authorization']
    setUser(null)
    setIsAuthenticated(false)
  }

  const refreshUser = async () => {
    const token = localStorage.getItem('access_token')
    if (token) {
      await fetchMe(token)
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, isAuthenticated, login, verify2fa, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider')
  }
  return context
}
