import React, { useState, useRef, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import routes from '../routes'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Suspense } from 'react'

const DefaultLayout = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const userMenuRef = useRef(null)
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    const close = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setUserMenuOpen(false)
    }
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [])

  const toggleSidebar = () => {
    setSidebarCollapsed((c) => {
      document.body.classList.toggle('sidebar-collapse', !c)
      return !c
    })
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="wrapper">
      <nav className="main-header navbar navbar-expand navbar-white navbar-light">
        <ul className="navbar-nav">
          <li className="nav-item">
            <button type="button" className="nav-link" onClick={toggleSidebar} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
              <i className="fas fa-bars" />
            </button>
          </li>
          <li className="nav-item d-none d-sm-inline-block">
            <NavLink to="/dashboard" className="nav-link">Início</NavLink>
          </li>
        </ul>
        <ul className="navbar-nav ml-auto" ref={userMenuRef}>
          <li className={`nav-item dropdown ${userMenuOpen ? 'show' : ''}`}>
            <button type="button" className="nav-link" onClick={() => setUserMenuOpen((o) => !o)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
              <i className="far fa-user" />
              <span className="ml-2">{user?.name || user?.email || 'Usuário'}</span>
              <i className="fas fa-caret-down ml-1" />
            </button>
            <div className={`dropdown-menu dropdown-menu-right ${userMenuOpen ? 'show' : ''}`}>
              <NavLink to="/settings" className="dropdown-item" onClick={() => setUserMenuOpen(false)}>
                <i className="fas fa-cog mr-2" /> Configurações
              </NavLink>
              <div className="dropdown-divider" />
              <button type="button" className="dropdown-item dropdown-footer" onClick={() => { setUserMenuOpen(false); handleLogout(); }} style={{ border: 'none', background: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}>
                <i className="fas fa-sign-out-alt mr-2" /> Sair
              </button>
            </div>
          </li>
        </ul>
      </nav>

      <aside className="main-sidebar sidebar-dark-primary elevation-4">
        <a href="#/" className="brand-link" onClick={(e) => { e.preventDefault(); navigate('/dashboard'); }}>
          <img src="/imagens/Icone.png" alt="DRG-BR" className="brand-image img-circle elevation-3" style={{ opacity: 0.8, maxHeight: 33 }} />
          <span className="brand-text font-weight-light">DRG-BR</span>
        </a>
        <div className="sidebar">
          {user && (
            <div className="user-panel mt-3 pb-3 mb-3 d-flex">
              <div className="info">
                <a href="#/" className="d-block" onClick={(e) => { e.preventDefault(); }}>{user.name || user.email}</a>
              </div>
            </div>
          )}
          <nav className="mt-2">
            <ul className="nav nav-pills nav-sidebar flex-column" data-widget="treeview" role="menu" data-accordion="false">
              <li className="nav-item">
                <NavLink to="/dashboard" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                  <i className="nav-icon fas fa-tachometer-alt" />
                  <p>Dashboard</p>
                </NavLink>
              </li>
              <li className="nav-header">Gerenciamento</li>
              <li className="nav-item">
                <NavLink to="/users" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                  <i className="nav-icon fas fa-users" />
                  <p>Usuários</p>
                </NavLink>
              </li>
              <li className="nav-item">
                <NavLink to="/roles" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                  <i className="nav-icon fas fa-user-tag" />
                  <p>Perfis</p>
                </NavLink>
              </li>
              <li className="nav-item">
                <NavLink to="/api-keys" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                  <i className="nav-icon fas fa-key" />
                  <p>Chaves API</p>
                </NavLink>
              </li>
              <li className="nav-header">Operações</li>
              <li className="nav-item">
                <NavLink to="/extraction" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                  <i className="nav-icon fas fa-database" />
                  <p>Extração</p>
                </NavLink>
              </li>
              <li className="nav-item">
                <NavLink to="/training" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                  <i className="nav-icon fas fa-calculator" />
                  <p>Treinamento</p>
                </NavLink>
              </li>
              <li className="nav-item">
                <NavLink to="/prediction" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                  <i className="nav-icon fas fa-chart-line" />
                  <p>Predição</p>
                </NavLink>
              </li>
              <li className="nav-header">Sistema</li>
              <li className="nav-item">
                <NavLink to="/settings" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                  <i className="nav-icon fas fa-cog" />
                  <p>Configurações</p>
                </NavLink>
              </li>
            </ul>
          </nav>
        </div>
      </aside>

      <div className="content-wrapper">
        <div className="content-header">
          <div className="container-fluid">
            <div className="row mb-2">
              <div className="col-sm-6">
                <h1 className="m-0 text-dark">DRG-BR</h1>
              </div>
              <div className="col-sm-6">
                <ol className="breadcrumb float-sm-right">
                  <li className="breadcrumb-item"><a href="#/">Início</a></li>
                  <li className="breadcrumb-item active">Plataforma</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
        <section className="content">
          <div className="container-fluid">
            <Suspense fallback={<div className="text-center p-4"><i className="fas fa-spinner fa-spin fa-2x" /></div>}>
              <Routes>
                {routes.map((route, idx) => (
                  route.element && (
                    <Route key={idx} path={route.path} exact={route.exact} name={route.name} element={<route.element />} />
                  )
                ))}
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </Suspense>
          </div>
        </section>
      </div>

      <footer className="main-footer">
        <strong>DRG-BR</strong> — Plataforma de predição e gestão.
        <div className="float-right d-none d-sm-inline-block">v1.0</div>
      </footer>
    </div>
  )
}

export default DefaultLayout
