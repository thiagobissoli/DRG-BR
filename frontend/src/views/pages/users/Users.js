import React, { useState, useEffect } from 'react'
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

  useEffect(() => { loadData() }, [])

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
        await axios.post('/api/users', { email: form.email, name: form.name, password: form.password, role_ids: form.role_ids })
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
      role_ids: prev.role_ids.includes(roleId) ? prev.role_ids.filter((id) => id !== roleId) : [...prev.role_ids, roleId],
    }))
  }

  useEffect(() => {
    if (success || error) {
      const t = setTimeout(() => { setSuccess(null); setError(null) }, 4000)
      return () => clearTimeout(t)
    }
  }, [success, error])

  return (
    <div className="row">
      <div className="col-12">
        <div className="card">
          <div className="card-header d-flex justify-content-between align-items-center">
            <strong>Usuários</strong>
            <button type="button" className="btn btn-primary btn-sm" onClick={openCreate}>
              <i className="fas fa-plus mr-2" /> Novo Usuário
            </button>
          </div>
          <div className="card-body">
            {error && <div className="alert alert-danger alert-dismissible"><button type="button" className="close" onClick={() => setError(null)}><span>&times;</span></button>{error}</div>}
            {success && <div className="alert alert-success alert-dismissible"><button type="button" className="close" onClick={() => setSuccess(null)}><span>&times;</span></button>{success}</div>}
            {loading ? (
              <div className="text-center py-4"><i className="fas fa-spinner fa-spin fa-2x" /></div>
            ) : users.length === 0 ? (
              <p className="text-muted">Nenhum usuário encontrado.</p>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover">
                  <thead>
                    <tr><th>ID</th><th>Email</th><th>Nome</th><th>Status</th><th>Perfis</th><th>Criado em</th><th>Ações</th></tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id}>
                        <td>{user.id}</td>
                        <td>{user.email}</td>
                        <td>{user.name || '-'}</td>
                        <td><span className={`badge badge-${user.active ? 'success' : 'danger'}`}>{user.active ? 'Ativo' : 'Inativo'}</span></td>
                        <td>
                          {(user.role_ids || []).map((rid) => {
                            const role = roles.find((r) => r.id === rid)
                            return <span key={rid} className="badge badge-primary mr-1">{role?.name || `#${rid}`}</span>
                          })}
                        </td>
                        <td className="small">{user.created_at ? new Date(user.created_at).toLocaleDateString('pt-BR') : '-'}</td>
                        <td>
                          <button type="button" className="btn btn-info btn-sm mr-2" onClick={() => openEdit(user)}><i className="fas fa-edit" /></button>
                          <button type="button" className="btn btn-danger btn-sm" onClick={() => openDelete(user)}><i className="fas fa-trash" /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal Criar/Editar */}
      {showModal && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={() => setShowModal(false)}>
          <div className="modal-dialog modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{editingUser ? 'Editar Usuário' : 'Novo Usuário'}</h5>
                <button type="button" className="close" onClick={() => setShowModal(false)}><span>&times;</span></button>
              </div>
              <form onSubmit={handleSave}>
                <div className="modal-body">
                  <div className="form-group">
                    <label>Email</label>
                    <input type="email" className="form-control" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} disabled={!!editingUser} required={!editingUser} placeholder="usuario@email.com" />
                  </div>
                  <div className="form-group">
                    <label>Nome</label>
                    <input type="text" className="form-control" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nome completo" />
                  </div>
                  <div className="form-group">
                    <label>Senha {editingUser && <small className="text-muted">(deixe em branco para manter)</small>}</label>
                    <input type="password" className="form-control" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required={!editingUser} minLength={6} placeholder="Mínimo 6 caracteres" />
                  </div>
                  {editingUser && (
                    <div className="form-group">
                      <div className="custom-control custom-checkbox">
                        <input type="checkbox" className="custom-control-input" id="userActive" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
                        <label className="custom-control-label" htmlFor="userActive">Usuário ativo</label>
                      </div>
                    </div>
                  )}
                  {roles.length > 0 && (
                    <div className="form-group">
                      <label>Perfis</label>
                      {roles.map((role) => (
                        <div key={role.id} className="custom-control custom-checkbox">
                          <input type="checkbox" className="custom-control-input" id={`role-${role.id}`} checked={form.role_ids.includes(role.id)} onChange={() => toggleRole(role.id)} />
                          <label className="custom-control-label" htmlFor={`role-${role.id}`}>{role.name}{role.description ? ` — ${role.description}` : ''}</label>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? <i className="fas fa-spinner fa-spin" /> : editingUser ? 'Salvar' : 'Criar'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal Excluir */}
      {showDeleteModal && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={() => setShowDeleteModal(false)}>
          <div className="modal-dialog modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Confirmar Exclusão</h5>
                <button type="button" className="close" onClick={() => setShowDeleteModal(false)}><span>&times;</span></button>
              </div>
              <div className="modal-body">
                Tem certeza que deseja excluir o usuário <strong>{deletingUser?.email}</strong>?
                <br /><small className="text-danger">Esta ação não pode ser desfeita.</small>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowDeleteModal(false)}>Cancelar</button>
                <button type="button" className="btn btn-danger" onClick={handleDelete} disabled={saving}>{saving ? <i className="fas fa-spinner fa-spin" /> : 'Excluir'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Users
