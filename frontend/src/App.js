import React, { Suspense } from 'react'
import { HashRouter, Route, Routes, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'

const DefaultLayout = React.lazy(() => import('./layout/DefaultLayout'))
const Login = React.lazy(() => import('./views/pages/login/Login'))
const Register = React.lazy(() => import('./views/pages/register/Register'))
const Page404 = React.lazy(() => import('./views/pages/page404/Page404'))
const Page500 = React.lazy(() => import('./views/pages/page500/Page500'))

const PrivateRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth()
  if (loading) {
    return (
      <div className="hold-transition login-page" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <i className="fas fa-spinner fa-spin fa-3x text-primary" />
      </div>
    )
  }
  return isAuthenticated ? children : <Navigate to="/login" replace />
}

const AppRoutes = () => (
  <HashRouter>
    <Suspense fallback={<div className="text-center p-5"><i className="fas fa-spinner fa-spin fa-2x" /></div>}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/404" element={<Page404 />} />
        <Route path="/500" element={<Page500 />} />
        <Route path="*" element={<PrivateRoute><DefaultLayout /></PrivateRoute>} />
      </Routes>
    </Suspense>
  </HashRouter>
)

const App = () => (
  <AuthProvider>
    <AppRoutes />
  </AuthProvider>
)

export default App
