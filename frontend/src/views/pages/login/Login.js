import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CButton,
  CCard,
  CCardBody,
  CCardGroup,
  CCol,
  CContainer,
  CForm,
  CFormInput,
  CInputGroup,
  CInputGroupText,
  CRow,
  CAlert,
  CSpinner,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilLockLocked, cilUser, cilShieldAlt } from '@coreui/icons'
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
    if (result.success) {
      navigate('/dashboard')
    } else {
      setError(result.message)
    }
  }

  const backToPassword = () => {
    setStep2fa(false)
    setTemporaryToken('')
    setCode2fa('')
    setError('')
  }

  return (
    <div className="bg-body-tertiary min-vh-100 d-flex flex-row align-items-center">
      <CContainer>
        <CRow className="justify-content-center">
          <CCol md={8}>
            <CCardGroup>
              <CCard className="p-4">
                <CCardBody>
                  {!step2fa ? (
                    <CForm onSubmit={handleLogin}>
                      <h1>Entrar</h1>
                      <p className="text-body-secondary">Acesse sua conta DRG-BR</p>

                      {error && (
                        <CAlert color="danger" dismissible onClose={() => setError('')}>
                          {error}
                        </CAlert>
                      )}

                      <CInputGroup className="mb-3">
                        <CInputGroupText>
                          <CIcon icon={cilUser} />
                        </CInputGroupText>
                        <CFormInput
                          placeholder="Email"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          autoComplete="email"
                          required
                        />
                      </CInputGroup>
                      <CInputGroup className="mb-4">
                        <CInputGroupText>
                          <CIcon icon={cilLockLocked} />
                        </CInputGroupText>
                        <CFormInput
                          type="password"
                          placeholder="Senha"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          autoComplete="current-password"
                          required
                        />
                      </CInputGroup>
                      <CRow>
                        <CCol xs={6}>
                          <CButton color="primary" className="px-4" type="submit" disabled={loading}>
                            {loading ? (
                              <>
                                <CSpinner size="sm" className="me-2" />
                                Entrando...
                              </>
                            ) : (
                              'Entrar'
                            )}
                          </CButton>
                        </CCol>
                      </CRow>
                    </CForm>
                  ) : (
                    <CForm onSubmit={handleVerify2fa}>
                      <h1>Verificação em 2 fatores</h1>
                      <p className="text-body-secondary">
                        Digite o código de 6 dígitos do seu aplicativo autenticador.
                      </p>

                      {error && (
                        <CAlert color="danger" dismissible onClose={() => setError('')}>
                          {error}
                        </CAlert>
                      )}

                      <CInputGroup className="mb-4">
                        <CInputGroupText>
                          <CIcon icon={cilShieldAlt} />
                        </CInputGroupText>
                        <CFormInput
                          placeholder="000000"
                          value={code2fa}
                          onChange={(e) => setCode2fa(e.target.value.replace(/\D/g, '').slice(0, 6))}
                          maxLength={6}
                          autoComplete="one-time-code"
                          inputMode="numeric"
                          pattern="[0-9]*"
                        />
                      </CInputGroup>
                      <CRow>
                        <CCol xs={6}>
                          <CButton color="primary" className="px-4" type="submit" disabled={loading}>
                            {loading ? (
                              <>
                                <CSpinner size="sm" className="me-2" />
                                Verificando...
                              </>
                            ) : (
                              'Verificar'
                            )}
                          </CButton>
                        </CCol>
                        <CCol xs={6} className="text-end">
                          <CButton color="secondary" variant="ghost" onClick={backToPassword}>
                            Voltar
                          </CButton>
                        </CCol>
                      </CRow>
                    </CForm>
                  )}
                </CCardBody>
              </CCard>
              <CCard className="text-white bg-primary py-5" style={{ width: '44%' }}>
                <CCardBody className="text-center d-flex flex-column justify-content-center">
                  <div>
                    <img
                      src="/imagens/Logo.png"
                      alt="DRG-BR"
                      style={{ height: '80px', marginBottom: '20px', objectFit: 'contain' }}
                      onError={(e) => {
                        e.target.style.display = 'none'
                      }}
                    />
                    <h2>DRG-BR</h2>
                    <p>Plataforma de predição e gestão de dados DRG.</p>
                    <p className="mt-3 small opacity-75">
                      Padrão: admin@drgbr.local / admin123
                    </p>
                  </div>
                </CCardBody>
              </CCard>
            </CCardGroup>
          </CCol>
        </CRow>
      </CContainer>
    </div>
  )
}

export default Login
