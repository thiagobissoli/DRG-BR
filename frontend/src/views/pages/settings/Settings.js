import React, { useState, useEffect } from 'react'
import {
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CRow,
  CNav,
  CNavItem,
  CNavLink,
  CTabContent,
  CTabPane,
  CFormLabel,
  CFormInput,
  CFormSelect,
  CButton,
  CAlert,
  CSpinner,
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilUser, cilDrop, cilLockLocked, cilShieldAlt } from '@coreui/icons'
import { useColorModes } from '@coreui/react'
import { useAuth } from '../../../context/AuthContext'
import axios from 'axios'
import { QRCodeSVG } from 'qrcode.react'

const Settings = () => {
  const { user, refreshUser } = useAuth()
  const { colorMode, setColorMode } = useColorModes('coreui-free-react-admin-template-theme')

  const [activeTab, setActiveTab] = useState('profile')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  const [name, setName] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [setupSecret, setSetupSecret] = useState('')
  const [setupOtpUri, setSetupOtpUri] = useState('')
  const [setupCode, setSetupCode] = useState('')
  const [showDisable2fa, setShowDisable2fa] = useState(false)
  const [disable2faPassword, setDisable2faPassword] = useState('')
  const [disable2faCode, setDisable2faCode] = useState('')

  useEffect(() => {
    if (user) {
      setName(user.name || '')
    }
  }, [user])

  useEffect(() => {
    if (success || error) {
      const t = setTimeout(() => { setSuccess(null); setError(null) }, 4000)
      return () => clearTimeout(t)
    }
  }, [success, error])

  const handleSaveProfile = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      await axios.put(`/api/users/${user.id}`, { name })
      setSuccess('Perfil atualizado com sucesso.')
      refreshUser()
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao atualizar perfil')
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async (e) => {
    e.preventDefault()
    setError(null)

    if (newPassword.length < 6) {
      setError('A nova senha deve ter pelo menos 6 caracteres.')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('As senhas não coincidem.')
      return
    }

    setSaving(true)
    try {
      await axios.put(`/api/users/${user.id}`, { password: newPassword })
      setSuccess('Senha alterada com sucesso.')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao alterar senha')
    } finally {
      setSaving(false)
    }
  }

  const handleThemeChange = (e) => {
    setColorMode(e.target.value)
  }

  const handle2faSetup = async () => {
    setSaving(true)
    setError(null)
    try {
      const res = await axios.post('/api/auth/2fa/setup')
      setSetupSecret(res.data.secret || '')
      setSetupOtpUri(res.data.otp_uri || '')
      setSetupCode('')
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao iniciar configuração')
    } finally {
      setSaving(false)
    }
  }

  const handle2faVerifySetup = async (e) => {
    e.preventDefault()
    if (!setupCode.trim() || setupCode.length !== 6) {
      setError('Informe o código de 6 dígitos do aplicativo.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await axios.post('/api/auth/2fa/verify-setup', { code: setupCode.trim() })
      setSuccess('Autenticação em dois fatores ativada.')
      setSetupSecret('')
      setSetupOtpUri('')
      setSetupCode('')
      refreshUser()
    } catch (err) {
      setError(err.response?.data?.error || 'Código inválido')
    } finally {
      setSaving(false)
    }
  }

  const handle2faDisable = async (e) => {
    e.preventDefault()
    if (!disable2faPassword) {
      setError('Informe sua senha.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await axios.post('/api/auth/2fa/disable', {
        password: disable2faPassword,
        code: disable2faCode.trim() || undefined,
      })
      setSuccess('Autenticação em dois fatores desativada.')
      setShowDisable2fa(false)
      setDisable2faPassword('')
      setDisable2faCode('')
      refreshUser()
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao desativar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <CRow>
      <CCol xs={12}>
        <CCard>
          <CCardHeader>
            <strong>Configurações</strong>
          </CCardHeader>
          <CCardBody>
            {error && <CAlert color="danger" dismissible onClose={() => setError(null)}>{error}</CAlert>}
            {success && <CAlert color="success" dismissible onClose={() => setSuccess(null)}>{success}</CAlert>}

            <CRow>
              <CCol md={3}>
                <CNav variant="pills" className="flex-column">
                  <CNavItem>
                    <CNavLink
                      className="cursor-pointer"
                      active={activeTab === 'profile'}
                      onClick={() => setActiveTab('profile')}
                    >
                      <CIcon icon={cilUser} className="me-2" />
                      Perfil
                    </CNavLink>
                  </CNavItem>
                  <CNavItem>
                    <CNavLink
                      className="cursor-pointer"
                      active={activeTab === 'password'}
                      onClick={() => setActiveTab('password')}
                    >
                      <CIcon icon={cilLockLocked} className="me-2" />
                      Senha
                    </CNavLink>
                  </CNavItem>
                  <CNavItem>
                    <CNavLink
                      className="cursor-pointer"
                      active={activeTab === 'twofa'}
                      onClick={() => setActiveTab('twofa')}
                    >
                      <CIcon icon={cilShieldAlt} className="me-2" />
                      Autenticação em 2 fatores
                    </CNavLink>
                  </CNavItem>
                  <CNavItem>
                    <CNavLink
                      className="cursor-pointer"
                      active={activeTab === 'appearance'}
                      onClick={() => setActiveTab('appearance')}
                    >
                      <CIcon icon={cilDrop} className="me-2" />
                      Aparência
                    </CNavLink>
                  </CNavItem>
                </CNav>
              </CCol>
              <CCol md={9}>
                <CTabContent>
                  {/* Aba Perfil */}
                  <CTabPane visible={activeTab === 'profile'}>
                    <h5 className="mb-3">Perfil</h5>
                    <form onSubmit={handleSaveProfile}>
                      <div className="mb-3">
                        <CFormLabel>Email</CFormLabel>
                        <CFormInput
                          type="email"
                          value={user?.email || ''}
                          disabled
                        />
                        <div className="form-text">O email não pode ser alterado.</div>
                      </div>
                      <div className="mb-3">
                        <CFormLabel>Nome</CFormLabel>
                        <CFormInput
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Seu nome completo"
                        />
                      </div>
                      {user?.roles && (
                        <div className="mb-3">
                          <CFormLabel>Perfis</CFormLabel>
                          <CFormInput
                            value={user.roles.join(', ')}
                            disabled
                          />
                        </div>
                      )}
                      <CButton color="primary" type="submit" disabled={saving}>
                        {saving ? <CSpinner size="sm" /> : 'Salvar Perfil'}
                      </CButton>
                    </form>
                  </CTabPane>

                  {/* Aba Senha */}
                  <CTabPane visible={activeTab === 'password'}>
                    <h5 className="mb-3">Alterar Senha</h5>
                    <form onSubmit={handleChangePassword}>
                      <div className="mb-3">
                        <CFormLabel>Nova Senha</CFormLabel>
                        <CFormInput
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Mínimo 6 caracteres"
                          required
                          minLength={6}
                        />
                      </div>
                      <div className="mb-3">
                        <CFormLabel>Confirmar Nova Senha</CFormLabel>
                        <CFormInput
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Repita a nova senha"
                          required
                          minLength={6}
                        />
                      </div>
                      <CButton color="primary" type="submit" disabled={saving}>
                        {saving ? <CSpinner size="sm" /> : 'Alterar Senha'}
                      </CButton>
                    </form>
                  </CTabPane>

                  {/* Aba Autenticação em 2 fatores */}
                  <CTabPane visible={activeTab === 'twofa'}>
                    <h5 className="mb-3">Autenticação em dois fatores (2FA)</h5>
                    <p className="text-body-secondary">
                      A 2FA adiciona uma camada extra de segurança exigindo um código do aplicativo autenticador no login.
                    </p>
                    {user?.otp_enabled ? (
                      <div>
                        <CAlert color="success">Autenticação em dois fatores está <strong>ativada</strong>.</CAlert>
                        <CButton color="danger" variant="outline" onClick={() => setShowDisable2fa(true)}>
                          Desativar 2FA
                        </CButton>
                      </div>
                    ) : (
                      <div>
                        {!setupSecret ? (
                          <CButton color="primary" onClick={handle2faSetup} disabled={saving}>
                            {saving ? <CSpinner size="sm" className="me-2" /> : null}
                            Ativar autenticação em 2 fatores
                          </CButton>
                        ) : (
                          <div className="border rounded p-3 bg-body-tertiary">
                            <p className="fw-semibold mb-2">1. Adicione a chave no aplicativo</p>
                            {setupOtpUri ? (
                              <>
                                <p className="small text-body-secondary mb-2">
                                  Escaneie o QR code abaixo com seu aplicativo (Google Authenticator, Microsoft Authenticator ou similar):
                                </p>
                                <div className="d-inline-block p-3 bg-white rounded mb-3">
                                  <QRCodeSVG value={setupOtpUri} size={200} level="M" />
                                </div>
                                <p className="small text-body-secondary mb-2">
                                  Ou adicione manualmente digitando a chave:
                                </p>
                              </>
                            ) : (
                              <p className="small text-body-secondary mb-2">
                                Use Google Authenticator, Microsoft Authenticator ou similar. Escolha &quot;Adicionar chave manualmente&quot; e digite:
                              </p>
                            )}
                            <code className="d-block p-2 bg-body rounded mb-3" style={{ fontSize: '14px', wordBreak: 'break-all' }}>
                              {setupSecret}
                            </code>
                            <p className="fw-semibold mb-2">2. Informe o código de 6 dígitos</p>
                            <form onSubmit={handle2faVerifySetup} className="d-flex gap-2 align-items-end">
                              <div className="flex-grow-1">
                                <CFormInput
                                  placeholder="000000"
                                  value={setupCode}
                                  onChange={(e) => setSetupCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                  maxLength={6}
                                  className="font-monospace"
                                />
                              </div>
                              <CButton type="submit" color="primary" disabled={saving}>
                                {saving ? <CSpinner size="sm" /> : 'Ativar'}
                              </CButton>
                            </form>
                          </div>
                        )}
                      </div>
                    )}
                  </CTabPane>

                  {/* Aba Aparência */}
                  <CTabPane visible={activeTab === 'appearance'}>
                    <h5 className="mb-3">Aparência</h5>
                    <div className="mb-3">
                      <CFormLabel>Tema</CFormLabel>
                      <CFormSelect value={colorMode} onChange={handleThemeChange}>
                        <option value="light">Claro</option>
                        <option value="dark">Escuro</option>
                        <option value="auto">Automático (sistema)</option>
                      </CFormSelect>
                      <div className="form-text">
                        O tema &quot;Automático&quot; segue a preferência do sistema operacional.
                      </div>
                    </div>
                  </CTabPane>
                </CTabContent>
              </CCol>
            </CRow>
          </CCardBody>
        </CCard>
      </CCol>

      {/* Modal Desativar 2FA */}
      <CModal visible={showDisable2fa} onClose={() => setShowDisable2fa(false)} backdrop="static">
        <CModalHeader>
          <CModalTitle>Desativar autenticação em 2 fatores</CModalTitle>
        </CModalHeader>
        <form onSubmit={handle2faDisable}>
          <CModalBody>
            <div className="mb-3">
              <CFormLabel>Sua senha</CFormLabel>
              <CFormInput
                type="password"
                value={disable2faPassword}
                onChange={(e) => setDisable2faPassword(e.target.value)}
                placeholder="Senha da conta"
                required
              />
            </div>
            <div className="mb-3">
              <CFormLabel>Código do aplicativo (6 dígitos)</CFormLabel>
              <CFormInput
                placeholder="000000"
                value={disable2faCode}
                onChange={(e) => setDisable2faCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                maxLength={6}
              />
            </div>
          </CModalBody>
          <CModalFooter>
            <CButton color="secondary" variant="outline" onClick={() => setShowDisable2fa(false)}>
              Cancelar
            </CButton>
            <CButton type="submit" color="danger" disabled={saving}>
              {saving ? <CSpinner size="sm" /> : 'Desativar 2FA'}
            </CButton>
          </CModalFooter>
        </form>
      </CModal>
    </CRow>
  )
}

export default Settings
