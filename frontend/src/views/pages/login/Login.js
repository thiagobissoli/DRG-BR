import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../../context/AuthContext'

const Login = () => {
  const navigate = useNavigate()
  const { login, verify2fa } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code2fa, setCode2fa] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [step2fa, setStep2fa] = useState(false)
  const [temporaryToken, setTemporaryToken] = useState('')

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    if (!email.trim() || !password) {
      setError('Preencha email e senha.')
      return
    }
    setLoading(true)
    const result = await login(email, password)
    setLoading(false)
    if (result.success) {
      navigate('/dashboard')
      return
    }
    if (result.requires2fa && result.temporary_token) {
      setStep2fa(true)
      setTemporaryToken(result.temporary_token)
      setError('')
      return
    }
    setError(result.message)
  }

  const handleVerify2fa = async (e) => {
    e.preventDefault()
    setError('')
    if (!code2fa.trim()) {
      setError('Informe o código de 6 dígitos.')
      return
    }
    setLoading(true)
    const result = await verify2fa(temporaryToken, code2fa)
    setLoading(false)
    if (result.success) navigate('/dashboard')
    else setError(result.message)
  }

  const backToPassword = () => {
    setStep2fa(false)
    setTemporaryToken('')
    setCode2fa('')
    setError('')
  }

  return (
    <div className="hold-transition login-page">
      <div className="login-box">
        <div className="login-logo">
          <a href="#/"><b>DRG</b>-BR</a>
        </div>
        <div className="card">
          <div className="card-body login-card-body">
            {!step2fa ? (
              <>
                <p className="login-box-msg">Entre para iniciar sua sessão</p>
                {error && (
                  <div className="alert alert-danger alert-dismissible">
                    {error}
                    <button type="button" className="close" onClick={() => setError('')}><span>&times;</span></button>
                  </div>
                )}
                <form onSubmit={handleLogin}>
                  <div className="input-group mb-3">
                    <input
                      type="email"
                      className="form-control"
                      placeholder="Email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="email"
                      required
                    />
                    <div className="input-group-append">
                      <div className="input-group-text">
                        <span className="fas fa-envelope" />
                      </div>
                    </div>
                  </div>
                  <div className="input-group mb-3">
                    <input
                      type="password"
                      className="form-control"
                      placeholder="Senha"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="current-password"
                      required
                    />
                    <div className="input-group-append">
                      <div className="input-group-text">
                        <span className="fas fa-lock" />
                      </div>
                    </div>
                  </div>
                  <div className="row">
                    <div className="col-8" />
                    <div className="col-4">
                      <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
                        {loading ? <span className="fas fa-spinner fa-spin" /> : 'Entrar'}
                      </button>
                    </div>
                  </div>
                </form>
                <p className="mb-1 mt-3">
                  <Link to="/register">Registrar nova conta</Link>
                </p>
              </>
            ) : (
              <>
                <p className="login-box-msg">Verificação em 2 fatores</p>
                <p className="text-muted small">Digite o código de 6 dígitos do aplicativo autenticador.</p>
                {error && (
                  <div className="alert alert-danger alert-dismissible">
                    {error}
                    <button type="button" className="close" onClick={() => setError('')}><span>&times;</span></button>
                  </div>
                )}
                <form onSubmit={handleVerify2fa}>
                  <div className="input-group mb-3">
                    <input
                      type="text"
                      className="form-control"
                      placeholder="000000"
                      value={code2fa}
                      onChange={(e) => setCode2fa(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      maxLength={6}
                      autoComplete="one-time-code"
                      inputMode="numeric"
                    />
                    <div className="input-group-append">
                      <div className="input-group-text">
                        <span className="fas fa-shield-alt" />
                      </div>
                    </div>
                  </div>
                  <div className="row">
                    <div className="col-6">
                      <button type="button" className="btn btn-secondary btn-block" onClick={backToPassword}>
                        Voltar
                      </button>
                    </div>
                    <div className="col-6">
                      <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
                        {loading ? <span className="fas fa-spinner fa-spin" /> : 'Verificar'}
                      </button>
                    </div>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login
