import React, { useState, useEffect } from 'react'
import axios from 'axios'

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

  useEffect(() => { loadData() }, [])
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
    setForm({ name: role.name, description: role.description || '', permission_ids: role.permission_ids || [] })
    setShowModal(true)
  }

  const togglePermission = (id) => {
    setForm((prev) => ({
      ...prev,
      permission_ids: prev.permission_ids.includes(id) ? prev.permission_ids.filter((p) => p !== id) : [...prev.permission_ids, id],
    }))
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) { setError('Nome do perfil é obrigatório.'); return }
    setSaving(true)
    setError(null)
    try {
      if (editingRole) {
        await axios.put(`/api/roles/${editingRole.id}`, { description: form.description, permission_ids: form.permission_ids })
        setSuccess('Perfil atualizado com sucesso.')
      } else {
        await axios.post('/api/roles', { name: form.name.trim(), description: form.description, permission_ids: form.permission_ids })
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

  return (
    <div className="row">
      <div className="col-12">
        <div className="card">
          <div className="card-header d-flex justify-content-between align-items-center">
            <strong>Gestão de Perfis</strong>
            <button type="button" className="btn btn-primary btn-sm" onClick={openCreate}><i className="fas fa-plus mr-2" /> Novo Perfil</button>
          </div>
          <div className="card-body">
            {error && <div className="alert alert-danger alert-dismissible"><button type="button" className="close" onClick={() => setError(null)}><span>&times;</span></button>{error}</div>}
            {success && <div className="alert alert-success alert-dismissible"><button type="button" className="close" onClick={() => setSuccess(null)}><span>&times;</span></button>{success}</div>}
            {loading ? (
              <div className="text-center py-4"><i className="fas fa-spinner fa-spin fa-2x" /></div>
            ) : roles.length === 0 ? (
              <p className="text-muted">Nenhum perfil cadastrado.</p>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover">
                  <thead><tr><th>ID</th><th>Nome</th><th>Descrição</th><th>Permissões</th><th>Ações</th></tr></thead>
                  <tbody>
                    {roles.map((role) => (
                      <tr key={role.id}>
                        <td>{role.id}</td>
                        <td className="font-weight-bold">{role.name}</td>
                        <td>{role.description || '-'}</td>
                        <td>
                          {(role.permission_ids || []).map((pid) => {
                            const p = permissions.find((x) => x.id === pid)
                            return <span key={pid} className="badge badge-secondary mr-1">{p ? permissionLabel(p.name) : `#${pid}`}</span>
                          })}
                        </td>
                        <td><button type="button" className="btn btn-info btn-sm" onClick={() => openEdit(role)}><i className="fas fa-edit" /></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {showModal && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={() => setShowModal(false)}>
          <div className="modal-dialog modal-lg modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{editingRole ? 'Editar Perfil' : 'Novo Perfil'}</h5>
                <button type="button" className="close" onClick={() => setShowModal(false)}><span>&times;</span></button>
              </div>
              <form onSubmit={handleSave}>
                <div className="modal-body">
                  <div className="form-group">
                    <label>Nome</label>
                    <input type="text" className="form-control" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: operador" disabled={!!editingRole} required />
                    {editingRole && <small className="form-text text-muted">O nome do perfil não pode ser alterado.</small>}
                  </div>
                  <div className="form-group">
                    <label>Descrição</label>
                    <input type="text" className="form-control" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Descrição opcional" />
                  </div>
                  <div className="form-group">
                    <label>Permissões</label>
                    <div className="border rounded p-3 bg-light">
                      {permissions.map((p) => (
                        <div key={p.id} className="custom-control custom-checkbox">
                          <input type="checkbox" className="custom-control-input" id={`perm-${p.id}`} checked={form.permission_ids.includes(p.id)} onChange={() => togglePermission(p.id)} />
                          <label className="custom-control-label" htmlFor={`perm-${p.id}`}>{permissionLabel(p.name)}</label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? <i className="fas fa-spinner fa-spin" /> : editingRole ? 'Salvar' : 'Criar'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Roles
