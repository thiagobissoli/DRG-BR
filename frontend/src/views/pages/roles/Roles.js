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
  CFormCheck,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilPlus, cilPencil } from '@coreui/icons'
import axios from 'axios'

const Roles = () => {
  const [roles, setRoles] = useState([])
  const [permissions, setPermissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  const [showModal, setShowModal] = useState(false)
  const [editingRole, setEditingRole] = useState(null)
  const [form, setForm] = useState({ name: '', description: '', permission_ids: [] })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (success || error) {
      const t = setTimeout(() => { setSuccess(null); setError(null) }, 4000)
      return () => clearTimeout(t)
    }
  }, [success, error])

  const loadData = async () => {
    setLoading(true)
    try {
      const [rolesRes, permsRes] = await Promise.all([
        axios.get('/api/roles'),
        axios.get('/api/roles/permissions'),
      ])
      setRoles(Array.isArray(rolesRes.data) ? rolesRes.data : [])
      setPermissions(Array.isArray(permsRes.data) ? permsRes.data : [])
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao carregar perfis')
    } finally {
      setLoading(false)
    }
  }

  const openCreate = () => {
    setEditingRole(null)
    setForm({ name: '', description: '', permission_ids: [] })
    setShowModal(true)
  }

  const openEdit = (role) => {
    setEditingRole(role)
    setForm({
      name: role.name,
      description: role.description || '',
      permission_ids: role.permission_ids || [],
    })
    setShowModal(true)
  }

  const togglePermission = (id) => {
    setForm((prev) => ({
      ...prev,
      permission_ids: prev.permission_ids.includes(id)
        ? prev.permission_ids.filter((p) => p !== id)
        : [...prev.permission_ids, id],
    }))
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) {
      setError('Nome do perfil é obrigatório.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      if (editingRole) {
        await axios.put(`/api/roles/${editingRole.id}`, {
          description: form.description,
          permission_ids: form.permission_ids,
        })
        setSuccess('Perfil atualizado com sucesso.')
      } else {
        await axios.post('/api/roles', {
          name: form.name.trim(),
          description: form.description,
          permission_ids: form.permission_ids,
        })
        setSuccess('Perfil criado com sucesso.')
      }
      setShowModal(false)
      loadData()
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao salvar perfil')
    } finally {
      setSaving(false)
    }
  }

  const permissionLabel = (name) => {
    const labels = {
      'user.manage': 'Gerenciar usuários',
      'role.manage': 'Gerenciar perfis',
      'api_key.manage': 'Gerenciar chaves API',
      'extract.run': 'Executar extração',
      'train.run': 'Executar treinamento',
      'predict.use': 'Usar predição (API)',
      'usage.view': 'Ver uso e quotas',
    }
    return labels[name] || name
  }

  return (
    <CRow>
      <CCol xs={12}>
        <CCard className="mb-4">
          <CCardHeader className="d-flex justify-content-between align-items-center">
            <strong>Gestão de Perfis</strong>
            <CButton color="primary" size="sm" onClick={openCreate}>
              <CIcon icon={cilPlus} className="me-2" />
              Novo Perfil
            </CButton>
          </CCardHeader>
          <CCardBody>
            {error && <CAlert color="danger" dismissible onClose={() => setError(null)}>{error}</CAlert>}
            {success && <CAlert color="success" dismissible onClose={() => setSuccess(null)}>{success}</CAlert>}

            {loading ? (
              <div className="text-center py-4"><CSpinner /></div>
            ) : roles.length === 0 ? (
              <p className="text-body-secondary">Nenhum perfil cadastrado. Crie um perfil para atribuir a usuários.</p>
            ) : (
              <CTable hover responsive>
                <CTableHead>
                  <CTableRow>
                    <CTableHeaderCell>ID</CTableHeaderCell>
                    <CTableHeaderCell>Nome</CTableHeaderCell>
                    <CTableHeaderCell>Descrição</CTableHeaderCell>
                    <CTableHeaderCell>Permissões</CTableHeaderCell>
                    <CTableHeaderCell>Ações</CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {roles.map((role) => (
                    <CTableRow key={role.id}>
                      <CTableDataCell>{role.id}</CTableDataCell>
                      <CTableDataCell className="fw-semibold">{role.name}</CTableDataCell>
                      <CTableDataCell>{role.description || '-'}</CTableDataCell>
                      <CTableDataCell>
                        {(role.permission_ids || []).map((pid) => {
                          const p = permissions.find((x) => x.id === pid)
                          return (
                            <CBadge key={pid} color="secondary" className="me-1">
                              {p ? permissionLabel(p.name) : `#${pid}`}
                            </CBadge>
                          )
                        })}
                      </CTableDataCell>
                      <CTableDataCell>
                        <CButton color="info" size="sm" variant="outline" onClick={() => openEdit(role)}>
                          <CIcon icon={cilPencil} />
                        </CButton>
                      </CTableDataCell>
                    </CTableRow>
                  ))}
                </CTableBody>
              </CTable>
            )}
          </CCardBody>
        </CCard>
      </CCol>

      <CModal visible={showModal} onClose={() => setShowModal(false)} backdrop="static" size="lg">
        <CModalHeader>
          <CModalTitle>{editingRole ? 'Editar Perfil' : 'Novo Perfil'}</CModalTitle>
        </CModalHeader>
        <CForm onSubmit={handleSave}>
          <CModalBody>
            <div className="mb-3">
              <CFormLabel>Nome</CFormLabel>
              <CFormInput
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ex: operador, analista"
                disabled={!!editingRole}
                required
              />
              {editingRole && <div className="form-text">O nome do perfil não pode ser alterado.</div>}
            </div>
            <div className="mb-3">
              <CFormLabel>Descrição</CFormLabel>
              <CFormInput
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Descrição opcional"
              />
            </div>
            <div className="mb-3">
              <CFormLabel>Permissões</CFormLabel>
              <div className="border rounded p-3 bg-body-tertiary bg-opacity-50">
                {permissions.map((p) => (
                  <CFormCheck
                    key={p.id}
                    label={permissionLabel(p.name)}
                    checked={form.permission_ids.includes(p.id)}
                    onChange={() => togglePermission(p.id)}
                  />
                ))}
              </div>
            </div>
          </CModalBody>
          <CModalFooter>
            <CButton color="secondary" variant="outline" onClick={() => setShowModal(false)}>Cancelar</CButton>
            <CButton color="primary" type="submit" disabled={saving}>
              {saving ? <CSpinner size="sm" /> : editingRole ? 'Salvar' : 'Criar'}
            </CButton>
          </CModalFooter>
        </CForm>
      </CModal>
    </CRow>
  )
}

export default Roles
