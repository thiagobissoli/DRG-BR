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
  CFormSelect,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilPlus, cilPencil, cilTrash } from '@coreui/icons'
import axios from 'axios'

const emptyForm = { email: '', name: '', password: '', active: true, role_ids: [] }

const Users = () => {
  const [users, setUsers] = useState([])
  const [roles, setRoles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  const [showModal, setShowModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [deletingUser, setDeletingUser] = useState(null)
  const [form, setForm] = useState({ ...emptyForm })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [usersRes, rolesRes] = await Promise.all([
        axios.get('/api/users'),
        axios.get('/api/roles').catch(() => ({ data: [] })),
      ])
      setUsers(Array.isArray(usersRes.data) ? usersRes.data : [])
      setRoles(Array.isArray(rolesRes.data) ? rolesRes.data : [])
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }

  const openCreate = () => {
    setEditingUser(null)
    setForm({ ...emptyForm })
    setShowModal(true)
  }

  const openEdit = (user) => {
    setEditingUser(user)
    setForm({
      email: user.email,
      name: user.name || '',
      password: '',
      active: user.active,
      role_ids: user.role_ids || [],
    })
    setShowModal(true)
  }

  const openDelete = (user) => {
    setDeletingUser(user)
    setShowDeleteModal(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      if (editingUser) {
        const payload = { name: form.name, active: form.active, role_ids: form.role_ids }
        if (form.password) payload.password = form.password
        await axios.put(`/api/users/${editingUser.id}`, payload)
        setSuccess('Usuário atualizado com sucesso.')
      } else {
        if (!form.email || !form.password) {
          setError('Email e senha são obrigatórios.')
          setSaving(false)
          return
        }
        await axios.post('/api/users', {
          email: form.email,
          name: form.name,
          password: form.password,
          role_ids: form.role_ids,
        })
        setSuccess('Usuário criado com sucesso.')
      }
      setShowModal(false)
      loadData()
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao salvar usuário')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    setSaving(true)
    try {
      await axios.delete(`/api/users/${deletingUser.id}`)
      setSuccess('Usuário excluído com sucesso.')
      setShowDeleteModal(false)
      loadData()
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao excluir usuário')
    } finally {
      setSaving(false)
    }
  }

  const toggleRole = (roleId) => {
    setForm((prev) => ({
      ...prev,
      role_ids: prev.role_ids.includes(roleId)
        ? prev.role_ids.filter((id) => id !== roleId)
        : [...prev.role_ids, roleId],
    }))
  }

  const clearMessages = () => {
    setTimeout(() => {
      setSuccess(null)
      setError(null)
    }, 4000)
  }

  useEffect(() => {
    if (success || error) clearMessages()
  }, [success, error])

  return (
    <CRow>
      <CCol xs={12}>
        <CCard className="mb-4">
          <CCardHeader className="d-flex justify-content-between align-items-center">
            <strong>Usuários</strong>
            <CButton color="primary" size="sm" onClick={openCreate}>
              <CIcon icon={cilPlus} className="me-2" />
              Novo Usuário
            </CButton>
          </CCardHeader>
          <CCardBody>
            {error && <CAlert color="danger" dismissible onClose={() => setError(null)}>{error}</CAlert>}
            {success && <CAlert color="success" dismissible onClose={() => setSuccess(null)}>{success}</CAlert>}

            {loading ? (
              <div className="text-center py-4">
                <CSpinner />
              </div>
            ) : users.length === 0 ? (
              <p className="text-body-secondary">Nenhum usuário encontrado.</p>
            ) : (
              <CTable hover responsive>
                <CTableHead>
                  <CTableRow>
                    <CTableHeaderCell>ID</CTableHeaderCell>
                    <CTableHeaderCell>Email</CTableHeaderCell>
                    <CTableHeaderCell>Nome</CTableHeaderCell>
                    <CTableHeaderCell>Status</CTableHeaderCell>
                    <CTableHeaderCell>Perfis</CTableHeaderCell>
                    <CTableHeaderCell>Criado em</CTableHeaderCell>
                    <CTableHeaderCell>Ações</CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {users.map((user) => (
                    <CTableRow key={user.id}>
                      <CTableDataCell>{user.id}</CTableDataCell>
                      <CTableDataCell>{user.email}</CTableDataCell>
                      <CTableDataCell>{user.name || '-'}</CTableDataCell>
                      <CTableDataCell>
                        <CBadge color={user.active ? 'success' : 'danger'}>
                          {user.active ? 'Ativo' : 'Inativo'}
                        </CBadge>
                      </CTableDataCell>
                      <CTableDataCell>
                        {(user.role_ids || []).map((rid) => {
                          const role = roles.find((r) => r.id === rid)
                          return (
                            <CBadge key={rid} color="primary" className="me-1">
                              {role?.name || `#${rid}`}
                            </CBadge>
                          )
                        })}
                      </CTableDataCell>
                      <CTableDataCell className="small">
                        {user.created_at ? new Date(user.created_at).toLocaleDateString('pt-BR') : '-'}
                      </CTableDataCell>
                      <CTableDataCell>
                        <CButton color="info" size="sm" variant="outline" className="me-2" onClick={() => openEdit(user)}>
                          <CIcon icon={cilPencil} />
                        </CButton>
                        <CButton color="danger" size="sm" variant="outline" onClick={() => openDelete(user)}>
                          <CIcon icon={cilTrash} />
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

      {/* Modal Criar/Editar */}
      <CModal visible={showModal} onClose={() => setShowModal(false)} backdrop="static">
        <CModalHeader>
          <CModalTitle>{editingUser ? 'Editar Usuário' : 'Novo Usuário'}</CModalTitle>
        </CModalHeader>
        <CForm onSubmit={handleSave}>
          <CModalBody>
            <div className="mb-3">
              <CFormLabel>Email</CFormLabel>
              <CFormInput
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                disabled={!!editingUser}
                required={!editingUser}
                placeholder="usuario@email.com"
              />
            </div>
            <div className="mb-3">
              <CFormLabel>Nome</CFormLabel>
              <CFormInput
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Nome completo"
              />
            </div>
            <div className="mb-3">
              <CFormLabel>
                Senha {editingUser && <small className="text-body-secondary">(deixe em branco para manter)</small>}
              </CFormLabel>
              <CFormInput
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required={!editingUser}
                minLength={6}
                placeholder="Mínimo 6 caracteres"
              />
            </div>
            {editingUser && (
              <div className="mb-3">
                <CFormCheck
                  label="Usuário ativo"
                  checked={form.active}
                  onChange={(e) => setForm({ ...form, active: e.target.checked })}
                />
              </div>
            )}
            {roles.length > 0 && (
              <div className="mb-3">
                <CFormLabel>Perfis</CFormLabel>
                {roles.map((role) => (
                  <CFormCheck
                    key={role.id}
                    label={`${role.name}${role.description ? ` — ${role.description}` : ''}`}
                    checked={form.role_ids.includes(role.id)}
                    onChange={() => toggleRole(role.id)}
                  />
                ))}
              </div>
            )}
          </CModalBody>
          <CModalFooter>
            <CButton color="secondary" variant="outline" onClick={() => setShowModal(false)}>
              Cancelar
            </CButton>
            <CButton color="primary" type="submit" disabled={saving}>
              {saving ? <CSpinner size="sm" /> : editingUser ? 'Salvar' : 'Criar'}
            </CButton>
          </CModalFooter>
        </CForm>
      </CModal>

      {/* Modal Confirmar Exclusão */}
      <CModal visible={showDeleteModal} onClose={() => setShowDeleteModal(false)}>
        <CModalHeader>
          <CModalTitle>Confirmar Exclusão</CModalTitle>
        </CModalHeader>
        <CModalBody>
          Tem certeza que deseja excluir o usuário <strong>{deletingUser?.email}</strong>?
          <br />
          <small className="text-danger">Esta ação não pode ser desfeita.</small>
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" variant="outline" onClick={() => setShowDeleteModal(false)}>
            Cancelar
          </CButton>
          <CButton color="danger" onClick={handleDelete} disabled={saving}>
            {saving ? <CSpinner size="sm" /> : 'Excluir'}
          </CButton>
        </CModalFooter>
      </CModal>
    </CRow>
  )
}

export default Users
