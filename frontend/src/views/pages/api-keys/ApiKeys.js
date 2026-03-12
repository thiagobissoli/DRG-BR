import React, { useState, useEffect } from 'react'
import axios from 'axios'

const STORAGE_KEY_PREFIX = 'drgbr_apikey_'

const ApiKeys = () => {
  const [apiKeys, setApiKeys] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showKeyModal, setShowKeyModal] = useState(false)
  const [deletingKey, setDeletingKey] = useState(null)
  const [newKeyValue, setNewKeyValue] = useState('')
  const [creating, setCreating] = useState(false)
  const [keyName, setKeyName] = useState('')
  const [quota, setQuota] = useState(1000)

  useEffect(() => { loadApiKeys() }, [])
  useEffect(() => {
    if (success || error) {
      const t = setTimeout(() => { setSuccess(null); setError(null) }, 4000)
      return () => clearTimeout(t)
    }
  }, [success, error])

  const loadApiKeys = async () => {
    setLoading(true)
    try {
      const response = await axios.get('/api/keys')
      setApiKeys(Array.isArray(response.data) ? response.data : [])
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao carregar chaves')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateKey = async (e) => {
    e.preventDefault()
    setCreating(true)
    setError(null)
    try {
      const response = await axios.post('/api/keys', { name: keyName || `Chave ${new Date().toLocaleDateString('pt-BR')}`, limit_value: quota })
      const created = response.data.api_key
      setNewKeyValue(created.key)
      if (created.id != null && created.key) {
        try { localStorage.setItem(STORAGE_KEY_PREFIX + String(created.id), created.key) } catch (_) {}
      }
      setShowCreateModal(false)
      setShowKeyModal(true)
      setKeyName('')
      setQuota(1000)
      loadApiKeys()
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao criar chave')
    } finally {
      setCreating(false)
    }
  }

  const openDelete = (key) => { setDeletingKey(key); setShowDeleteModal(true) }

  const handleDelete = async () => {
    try {
      await axios.delete(`/api/keys/${deletingKey.id}`)
      try { localStorage.removeItem(STORAGE_KEY_PREFIX + String(deletingKey.id)) } catch (_) {}
      setSuccess('Chave excluída com sucesso.')
      setShowDeleteModal(false)
      loadApiKeys()
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao excluir chave')
    }
  }

  const copyToClipboard = async (text, isFullKey = false) => {
    try {
      await navigator.clipboard.writeText(text)
      setSuccess(isFullKey ? 'Chave copiada!' : 'Identificador copiado.')
    } catch {
      const input = document.createElement('textarea')
      input.value = text
      document.body.appendChild(input)
      input.select()
      document.execCommand('copy')
      document.body.removeChild(input)
      setSuccess(isFullKey ? 'Chave copiada!' : 'Identificador copiado.')
    }
  }

  const getStoredFullKey = (keyId) => {
    if (keyId == null) return null
    try { return localStorage.getItem(STORAGE_KEY_PREFIX + String(keyId)) || null } catch { return null }
  }

  return (
    <div className="row">
      <div className="col-12">
        <div className="card">
          <div className="card-header d-flex justify-content-between align-items-center">
            <strong>Chaves API</strong>
            <button type="button" className="btn btn-primary btn-sm" onClick={() => setShowCreateModal(true)}><i className="fas fa-plus mr-2" /> Nova Chave</button>
          </div>
          <div className="card-body">
            {error && <div className="alert alert-danger alert-dismissible"><button type="button" className="close" onClick={() => setError(null)}><span>&times;</span></button>{error}</div>}
            {success && <div className="alert alert-success alert-dismissible"><button type="button" className="close" onClick={() => setSuccess(null)}><span>&times;</span></button>{success}</div>}
            {loading ? (
              <div className="text-center py-4"><i className="fas fa-spinner fa-spin fa-2x" /></div>
            ) : apiKeys.length === 0 ? (
              <p className="text-muted">Nenhuma chave API criada. Clique em &quot;Nova Chave&quot; para começar.</p>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover">
                  <thead>
                    <tr><th>Nome</th><th>Hash</th><th>Quota</th><th>Uso Hoje</th><th>Criada em</th><th>Último Uso</th><th>Ações</th></tr>
                  </thead>
                  <tbody>
                    {apiKeys.map((key) => {
                      const limit = key.limit_value || 0
                      const used = key.usage_count || 0
                      const pct = limit === 0 ? 0 : Math.min(100, Math.round((used / limit) * 100))
                      return (
                        <tr key={key.id}>
                          <td className="font-weight-bold">{key.name || '-'}</td>
                          <td className="font-monospace small text-muted">
                            <span>{key.key || '-'}</span>
                            {key.key && (
                              <button type="button" className="btn btn-sm btn-link p-1 ml-1" title={getStoredFullKey(key.id) ? 'Copiar chave completa' : 'Chave completa só se criada neste navegador'} onClick={() => {
                                const fullKey = getStoredFullKey(key.id)
                                if (fullKey) copyToClipboard(fullKey, true)
                                else setError('Chave completa não disponível. Ela só é exibida ao criar a chave (neste navegador).')
                              }}>
                                <i className="fas fa-copy" />
                              </button>
                            )}
                          </td>
                          <td><span className={`badge badge-${limit === 0 ? 'success' : 'primary'}`}>{limit === 0 ? 'Ilimitado' : limit.toLocaleString('pt-BR')}</span></td>
                          <td>
                            <span className="small">{used}</span>
                            {limit > 0 && <div className="progress progress-sm mt-1" style={{ width: 60, height: 6 }}><div className={`progress-bar bg-${pct > 80 ? 'danger' : 'success'}`} style={{ width: `${pct}%` }} /></div>}
                          </td>
                          <td className="small">{key.created_at ? new Date(key.created_at).toLocaleDateString('pt-BR') : '-'}</td>
                          <td className="small">{key.last_used_at ? new Date(key.last_used_at).toLocaleString('pt-BR') : 'Nunca'}</td>
                          <td><button type="button" className="btn btn-danger btn-sm" onClick={() => openDelete(key)}><i className="fas fa-trash" /></button></td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {showCreateModal && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={() => setShowCreateModal(false)}>
          <div className="modal-dialog modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content">
              <div className="modal-header"><h5 className="modal-title">Nova Chave API</h5><button type="button" className="close" onClick={() => setShowCreateModal(false)}><span>&times;</span></button></div>
              <form onSubmit={handleCreateKey}>
                <div className="modal-body">
                  <div className="form-group"><label>Nome da Chave</label><input type="text" className="form-control" value={keyName} onChange={(e) => setKeyName(e.target.value)} placeholder="Ex: Integração Hospital X" /></div>
                  <div className="form-group"><label>Quota Diária</label><input type="number" min={0} className="form-control" value={quota} onChange={(e) => setQuota(parseInt(e.target.value) || 0)} /><small className="form-text text-muted">0 = ilimitado.</small></div>
                </div>
                <div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>Cancelar</button><button type="submit" className="btn btn-primary" disabled={creating}>{creating ? <i className="fas fa-spinner fa-spin" /> : 'Criar Chave'}</button></div>
              </form>
            </div>
          </div>
        </div>
      )}

      {showKeyModal && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={() => setShowKeyModal(false)}>
          <div className="modal-dialog modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content">
              <div className="modal-header"><h5 className="modal-title">Chave Criada com Sucesso</h5><button type="button" className="close" onClick={() => setShowKeyModal(false)}><span>&times;</span></button></div>
              <div className="modal-body">
                <div className="alert alert-warning">Guarde esta chave em um local seguro. Ela <strong>não será exibida novamente</strong>.</div>
                <div className="p-3 bg-light rounded d-flex align-items-center flex-wrap">
                  <code className="text-break flex-grow-1" style={{ fontSize: 14 }}>{newKeyValue}</code>
                  <button type="button" className="btn btn-primary btn-sm ml-2" onClick={() => copyToClipboard(newKeyValue, true)}><i className="fas fa-copy mr-1" /> Copiar</button>
                </div>
              </div>
              <div className="modal-footer"><button type="button" className="btn btn-primary" onClick={() => copyToClipboard(newKeyValue, true)}><i className="fas fa-copy mr-2" /> Copiar Chave</button><button type="button" className="btn btn-secondary" onClick={() => setShowKeyModal(false)}>Fechar</button></div>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={() => setShowDeleteModal(false)}>
          <div className="modal-dialog modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content">
              <div className="modal-header"><h5 className="modal-title">Confirmar Exclusão</h5><button type="button" className="close" onClick={() => setShowDeleteModal(false)}><span>&times;</span></button></div>
              <div className="modal-body">Tem certeza que deseja excluir a chave <strong>{deletingKey?.name || `#${deletingKey?.id}`}</strong>?<br /><small className="text-danger">Todos os sistemas que usam esta chave perderão acesso.</small></div>
              <div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={() => setShowDeleteModal(false)}>Cancelar</button><button type="button" className="btn btn-danger" onClick={handleDelete}>Excluir</button></div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ApiKeys
