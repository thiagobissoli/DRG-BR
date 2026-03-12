import React, { useState, useEffect } from 'react'
import {
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CRow,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
  CButton,
  CSpinner,
  CAlert,
  CBadge,
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CForm,
  CFormInput,
  CFormLabel,
  CProgress,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilPlus, cilTrash, cilCopy } from '@coreui/icons'
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

  useEffect(() => {
    loadApiKeys()
  }, [])

  useEffect(() => {
    if (success || error) {
      const t = setTimeout(() => {
        setSuccess(null)
        setError(null)
      }, 4000)
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
      const response = await axios.post('/api/keys', {
        name: keyName || `Chave ${new Date().toLocaleDateString('pt-BR')}`,
        limit_value: quota,
      })
      const created = response.data.api_key
      setNewKeyValue(created.key)
      if (created.id != null && created.key) {
        try {
          localStorage.setItem(STORAGE_KEY_PREFIX + String(created.id), created.key)
        } catch (_) {}
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

  const openDelete = (key) => {
    setDeletingKey(key)
    setShowDeleteModal(true)
  }

  const handleDelete = async () => {
    try {
      await axios.delete(`/api/keys/${deletingKey.id}`)
      try {
        localStorage.removeItem(STORAGE_KEY_PREFIX + String(deletingKey.id))
      } catch (_) {}
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
      setSuccess(isFullKey ? 'Chave copiada para a área de transferência!' : 'Identificador copiado.')
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
    try {
      const k = localStorage.getItem(STORAGE_KEY_PREFIX + String(keyId))
      return k || null
    } catch {
      return null
    }
  }

  return (
    <CRow>
      <CCol xs={12}>
        <CCard className="mb-4">
          <CCardHeader className="d-flex justify-content-between align-items-center">
            <strong>Chaves API</strong>
            <CButton color="primary" size="sm" onClick={() => setShowCreateModal(true)}>
              <CIcon icon={cilPlus} className="me-2" />
              Nova Chave
            </CButton>
          </CCardHeader>
          <CCardBody>
            {error && <CAlert color="danger" dismissible onClose={() => setError(null)}>{error}</CAlert>}
            {success && <CAlert color="success" dismissible onClose={() => setSuccess(null)}>{success}</CAlert>}

            {loading ? (
              <div className="text-center py-4">
                <CSpinner />
              </div>
            ) : apiKeys.length === 0 ? (
              <p className="text-body-secondary">
                Nenhuma chave API criada. Clique em &quot;Nova Chave&quot; para começar.
              </p>
            ) : (
              <CTable hover responsive>
                <CTableHead>
                  <CTableRow>
                    <CTableHeaderCell>Nome</CTableHeaderCell>
                    <CTableHeaderCell>Hash</CTableHeaderCell>
                    <CTableHeaderCell>Quota</CTableHeaderCell>
                    <CTableHeaderCell>Uso Hoje</CTableHeaderCell>
                    <CTableHeaderCell>Criada em</CTableHeaderCell>
                    <CTableHeaderCell>Último Uso</CTableHeaderCell>
                    <CTableHeaderCell>Ações</CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {apiKeys.map((key) => {
                    const limit = key.limit_value || 0
                    const used = key.usage_count || 0
                    const pct = limit === 0 ? 0 : Math.min(100, Math.round((used / limit) * 100))
                    return (
                      <CTableRow key={key.id}>
                        <CTableDataCell className="fw-semibold">{key.name || '-'}</CTableDataCell>
                        <CTableDataCell className="font-monospace small text-body-secondary">
                          <div className="d-flex align-items-center gap-2">
                            <span>{key.key || '-'}</span>
                            {key.key && (
                              <CButton
                                color="secondary"
                                size="sm"
                                variant="ghost"
                                className="p-1"
                                onClick={() => {
                                  const fullKey = getStoredFullKey(key.id)
                                  if (fullKey) {
                                    copyToClipboard(fullKey, true)
                                  } else {
                                    setError('Chave completa não disponível. Ela só é exibida ao criar a chave (neste navegador). Use o botão "Copiar" no momento da criação.')
                                  }
                                }}
                                title={getStoredFullKey(key.id) ? 'Copiar chave completa' : 'Chave completa só disponível se foi criada neste navegador'}
                              >
                                <CIcon icon={cilCopy} />
                              </CButton>
                            )}
                          </div>
                        </CTableDataCell>
                        <CTableDataCell>
                          <CBadge color={limit === 0 ? 'success' : 'primary'}>
                            {limit === 0 ? 'Ilimitado' : limit.toLocaleString('pt-BR')}
                          </CBadge>
                        </CTableDataCell>
                        <CTableDataCell>
                          <div className="d-flex align-items-center gap-2">
                            <span className="small">{used}</span>
                            {limit > 0 && (
                              <CProgress value={pct} color={pct > 80 ? 'danger' : 'success'} style={{ width: '60px', height: '6px' }} />
                            )}
                          </div>
                        </CTableDataCell>
                        <CTableDataCell className="small">
                          {key.created_at ? new Date(key.created_at).toLocaleDateString('pt-BR') : '-'}
                        </CTableDataCell>
                        <CTableDataCell className="small">
                          {key.last_used_at ? new Date(key.last_used_at).toLocaleString('pt-BR') : 'Nunca'}
                        </CTableDataCell>
                        <CTableDataCell>
                          <CButton color="danger" size="sm" variant="outline" onClick={() => openDelete(key)}>
                            <CIcon icon={cilTrash} />
                          </CButton>
                        </CTableDataCell>
                      </CTableRow>
                    )
                  })}
                </CTableBody>
              </CTable>
            )}
          </CCardBody>
        </CCard>
      </CCol>

      {/* Modal Criar Chave */}
      <CModal visible={showCreateModal} onClose={() => setShowCreateModal(false)} backdrop="static">
        <CModalHeader>
          <CModalTitle>Nova Chave API</CModalTitle>
        </CModalHeader>
        <CForm onSubmit={handleCreateKey}>
          <CModalBody>
            <div className="mb-3">
              <CFormLabel>Nome da Chave</CFormLabel>
              <CFormInput
                value={keyName}
                onChange={(e) => setKeyName(e.target.value)}
                placeholder="Ex: Integração Hospital X"
              />
            </div>
            <div className="mb-3">
              <CFormLabel>Quota Diária</CFormLabel>
              <CFormInput
                type="number"
                min={0}
                value={quota}
                onChange={(e) => setQuota(parseInt(e.target.value) || 0)}
              />
              <div className="form-text">
                0 = ilimitado. Define o número máximo de requisições por dia.
              </div>
            </div>
          </CModalBody>
          <CModalFooter>
            <CButton color="secondary" variant="outline" onClick={() => setShowCreateModal(false)}>
              Cancelar
            </CButton>
            <CButton color="primary" type="submit" disabled={creating}>
              {creating ? <CSpinner size="sm" /> : 'Criar Chave'}
            </CButton>
          </CModalFooter>
        </CForm>
      </CModal>

      {/* Modal Exibir Chave Criada */}
      <CModal visible={showKeyModal} onClose={() => setShowKeyModal(false)} backdrop="static">
        <CModalHeader>
          <CModalTitle>Chave Criada com Sucesso</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <CAlert color="warning" className="mb-3">
            Guarde esta chave em um local seguro. Ela <strong>não será exibida novamente</strong>.
          </CAlert>
          <div className="p-3 bg-light rounded border d-flex align-items-center gap-2 flex-wrap">
            <code className="d-block text-break flex-grow-1" style={{ fontSize: '14px' }}>
              {newKeyValue}
            </code>
            <CButton
              color="primary"
              size="sm"
              variant="outline"
              onClick={() => copyToClipboard(newKeyValue, true)}
              title="Copiar chave"
            >
              <CIcon icon={cilCopy} className="me-1" />
              Copiar
            </CButton>
          </div>
        </CModalBody>
        <CModalFooter>
          <CButton
            color="primary"
            onClick={() => {
              copyToClipboard(newKeyValue, true)
            }}
          >
            <CIcon icon={cilCopy} className="me-2" />
            Copiar Chave
          </CButton>
          <CButton color="secondary" variant="outline" onClick={() => setShowKeyModal(false)}>
            Fechar
          </CButton>
        </CModalFooter>
      </CModal>

      {/* Modal Confirmar Exclusão */}
      <CModal visible={showDeleteModal} onClose={() => setShowDeleteModal(false)}>
        <CModalHeader>
          <CModalTitle>Confirmar Exclusão</CModalTitle>
        </CModalHeader>
        <CModalBody>
          Tem certeza que deseja excluir a chave <strong>{deletingKey?.name || `#${deletingKey?.id}`}</strong>?
          <br />
          <small className="text-danger">Todos os sistemas que usam esta chave perderão acesso.</small>
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" variant="outline" onClick={() => setShowDeleteModal(false)}>
            Cancelar
          </CButton>
          <CButton color="danger" onClick={handleDelete}>
            Excluir
          </CButton>
        </CModalFooter>
      </CModal>
    </CRow>
  )
}

export default ApiKeys
