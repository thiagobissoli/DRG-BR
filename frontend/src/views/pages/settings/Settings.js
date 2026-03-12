import React, { useState, useEffect } from 'react'
import { useAuth } from '../../../context/AuthContext'
import axios from 'axios'
import { QRCodeSVG } from 'qrcode.react'

const THEME_KEY = 'drgbr_theme'

const Settings = () => {
  const { user, refreshUser } = useAuth()
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
  const [theme, setTheme] = useState(() => localStorage.getItem(THEME_KEY) || 'light')

  useEffect(() => {
    if (user) setName(user.name || '')
  }, [user])
  useEffect(() => {
    if (success || error) {
      const t = setTimeout(() => { setSuccess(null); setError(null) }, 4000)
      return () => clearTimeout(t)
    }
  }, [success, error])
  useEffect(() => {
    document.body.classList.remove('dark-mode')
    if (theme === 'dark') document.body.classList.add('dark-mode')
    if (theme === 'auto') {
      const m = window.matchMedia('(prefers-color-scheme: dark)')
      if (m.matches) document.body.classList.add('dark-mode')
      else document.body.classList.remove('dark-mode')
    }
    localStorage.setItem(THEME_KEY, theme)
  }, [theme])

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
    if (newPassword.length < 6) { setError('A nova senha deve ter pelo menos 6 caracteres.'); return }
    if (newPassword !== confirmPassword) { setError('As senhas não coincidem.'); return }
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
    if (!setupCode.trim() || setupCode.length !== 6) { setError('Informe o código de 6 dígitos.'); return }
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
    if (!disable2faPassword) { setError('Informe sua senha.'); return }
    setSaving(true)
    setError(null)
    try {
      await axios.post('/api/auth/2fa/disable', { password: disable2faPassword, code: disable2faCode.trim() || undefined })
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
    <div className="row">
      <div className="col-12">
        <div className="card">
          <div className="card-header"><strong>Configurações</strong></div>
          <div className="card-body">
            {error && <div className="alert alert-danger alert-dismissible"><button type="button" className="close" onClick={() => setError(null)}><span>&times;</span></button>{error}</div>}
            {success && <div className="alert alert-success alert-dismissible"><button type="button" className="close" onClick={() => setSuccess(null)}><span>&times;</span></button>{success}</div>}
            <div className="row">
              <div className="col-md-3">
                <ul className="nav nav-pills flex-column">
                  <li className="nav-item"><a className={`nav-link ${activeTab === 'profile' ? 'active' : ''}`} href="#profile" onClick={(e) => { e.preventDefault(); setActiveTab('profile') }}><i className="fas fa-user mr-2" /> Perfil</a></li>
                  <li className="nav-item"><a className={`nav-link ${activeTab === 'password' ? 'active' : ''}`} href="#password" onClick={(e) => { e.preventDefault(); setActiveTab('password') }}><i className="fas fa-lock mr-2" /> Senha</a></li>
                  <li className="nav-item"><a className={`nav-link ${activeTab === 'twofa' ? 'active' : ''}`} href="#twofa" onClick={(e) => { e.preventDefault(); setActiveTab('twofa') }}><i className="fas fa-shield-alt mr-2" /> 2FA</a></li>
                  <li className="nav-item"><a className={`nav-link ${activeTab === 'appearance' ? 'active' : ''}`} href="#appearance" onClick={(e) => { e.preventDefault(); setActiveTab('appearance') }}><i className="fas fa-palette mr-2" /> Aparência</a></li>
                </ul>
              </div>
              <div className="col-md-9">
                {activeTab === 'profile' && (
                  <>
                    <h5 className="mb-3">Perfil</h5>
                    <form onSubmit={handleSaveProfile}>
                      <div className="form-group"><label>Email</label><input type="email" className="form-control" value={user?.email || ''} disabled /><small className="form-text text-muted">O email não pode ser alterado.</small></div>
                      <div className="form-group"><label>Nome</label><input type="text" className="form-control" value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome completo" /></div>
                      {user?.roles && <div className="form-group"><label>Perfis</label><input type="text" className="form-control" value={user.roles.join(', ')} disabled /></div>}
                      <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? <i className="fas fa-spinner fa-spin" /> : 'Salvar Perfil'}</button>
                    </form>
                  </>
                )}
                {activeTab === 'password' && (
                  <>
                    <h5 className="mb-3">Alterar Senha</h5>
                    <form onSubmit={handleChangePassword}>
                      <div className="form-group"><label>Nova Senha</label><input type="password" className="form-control" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Mínimo 6 caracteres" required minLength={6} /></div>
                      <div className="form-group"><label>Confirmar Nova Senha</label><input type="password" className="form-control" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Repita a nova senha" required minLength={6} /></div>
                      <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? <i className="fas fa-spinner fa-spin" /> : 'Alterar Senha'}</button>
                    </form>
                  </>
                )}
                {activeTab === 'twofa' && (
                  <>
                    <h5 className="mb-3">Autenticação em dois fatores (2FA)</h5>
                    <p className="text-muted">A 2FA exige um código do aplicativo autenticador no login.</p>
                    {user?.otp_enabled ? (
                      <div>
                        <div className="alert alert-success">2FA está <strong>ativada</strong>.</div>
                        <button type="button" className="btn btn-outline-danger" onClick={() => setShowDisable2fa(true)}>Desativar 2FA</button>
                      </div>
                    ) : (
                      <div>
                        {!setupSecret ? (
                          <button type="button" className="btn btn-primary" onClick={handle2faSetup} disabled={saving}>{saving ? <i className="fas fa-spinner fa-spin mr-2" /> : null} Ativar 2FA</button>
                        ) : (
                          <div className="border rounded p-3 bg-light">
                            <p className="font-weight-bold mb-2">1. Adicione a chave no aplicativo</p>
                            {setupOtpUri && (
                              <>
                                <p className="small text-muted mb-2">Escaneie o QR code com seu aplicativo:</p>
                                <div className="d-inline-block p-3 bg-white rounded mb-3"><QRCodeSVG value={setupOtpUri} size={200} level="M" /></div>
                                <p className="small text-muted mb-2">Ou digite a chave manualmente:</p>
                              </>
                            )}
                            <code className="d-block p-2 bg-white rounded mb-3" style={{ fontSize: 14, wordBreak: 'break-all' }}>{setupSecret}</code>
                            <p className="font-weight-bold mb-2">2. Informe o código de 6 dígitos</p>
                            <form onSubmit={handle2faVerifySetup} className="d-flex align-items-end">
                              <input type="text" className="form-control mr-2 font-monospace" placeholder="000000" value={setupCode} onChange={(e) => setSetupCode(e.target.value.replace(/\D/g, '').slice(0, 6))} maxLength={6} />
                              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? <i className="fas fa-spinner fa-spin" /> : 'Ativar'}</button>
                            </form>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
                {activeTab === 'appearance' && (
                  <>
                    <h5 className="mb-3">Aparência</h5>
                    <div className="form-group"><label>Tema</label><select className="form-control" value={theme} onChange={(e) => setTheme(e.target.value)}><option value="light">Claro</option><option value="dark">Escuro</option><option value="auto">Automático (sistema)</option></select><small className="form-text text-muted">Automático segue a preferência do sistema.</small></div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {showDisable2fa && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={() => setShowDisable2fa(false)}>
          <div className="modal-dialog modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content">
              <div className="modal-header"><h5 className="modal-title">Desativar 2FA</h5><button type="button" className="close" onClick={() => setShowDisable2fa(false)}><span>&times;</span></button></div>
              <form onSubmit={handle2faDisable}>
                <div className="modal-body">
                  <div className="form-group"><label>Sua senha</label><input type="password" className="form-control" value={disable2faPassword} onChange={(e) => setDisable2faPassword(e.target.value)} placeholder="Senha da conta" required /></div>
                  <div className="form-group"><label>Código do aplicativo (6 dígitos)</label><input type="text" className="form-control" placeholder="000000" value={disable2faCode} onChange={(e) => setDisable2faCode(e.target.value.replace(/\D/g, '').slice(0, 6))} maxLength={6} /></div>
                </div>
                <div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={() => setShowDisable2fa(false)}>Cancelar</button><button type="submit" className="btn btn-danger" disabled={saving}>{saving ? <i className="fas fa-spinner fa-spin" /> : 'Desativar 2FA'}</button></div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Settings
