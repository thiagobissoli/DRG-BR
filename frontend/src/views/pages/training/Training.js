import React, { useState, useEffect } from 'react'
import axios from 'axios'

const statusBadge = (status) => {
  const colors = { success: 'success', running: 'warning', pending: 'info', failed: 'danger' }
  const labels = { success: 'Concluído', running: 'Executando', pending: 'Pendente', failed: 'Falhou' }
  return <span className={`badge badge-${colors[status] || 'secondary'}`}>{labels[status] || status}</span>
}

const renderModelMetadata = (metadata) => {
  if (!metadata || typeof metadata !== 'object') return <span className="text-muted small">—</span>
  return <pre className="mb-0 small bg-light p-2 rounded" style={{ fontSize: 12, maxHeight: 120, overflow: 'auto' }}>{JSON.stringify(metadata, null, 2)}</pre>
}

const Training = () => {
  const [jobs, setJobs] = useState([])
  const [models, setModels] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedJob, setSelectedJob] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [limit, setLimit] = useState(0)
  const [epochs, setEpochs] = useState(10)
  const [modelName, setModelName] = useState('')
  const [setAsDefault, setSetAsDefault] = useState(false)
  const [expandedModel, setExpandedModel] = useState(null)

  useEffect(() => { loadData() }, [])
  useEffect(() => { if (success || error) { const t = setTimeout(() => { setSuccess(null); setError(null) }, 5000); return () => clearTimeout(t) } }, [success, error])

  const loadData = async () => {
    setLoading(true)
    try {
      const [jobsRes, modelsRes] = await Promise.all([axios.get('/api/train'), axios.get('/api/train/models').catch(() => ({ data: [] }))])
      setJobs(Array.isArray(jobsRes.data) ? jobsRes.data.reverse() : [])
      setModels(Array.isArray(modelsRes.data) ? modelsRes.data : [])
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      await axios.post('/api/train', { limit: limit || undefined, epochs, model_name: modelName.trim() || undefined, set_as_default: setAsDefault })
      setSuccess('Treinamento iniciado! Acompanhe na lista.')
      setShowModal(false)
      setModelName('')
      setSetAsDefault(false)
      loadData()
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao iniciar treinamento')
    } finally {
      setSubmitting(false)
    }
  }

  const setDefaultModel = async (modelId) => {
    try {
      await axios.put(`/api/train/models/${modelId}`, { is_default: true })
      setSuccess('Modelo definido como padrão.')
      loadData()
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao definir modelo padrão')
    }
  }

  const viewDetail = async (job) => {
    try {
      const response = await axios.get(`/api/train/${job.id}`)
      setSelectedJob(response.data)
    } catch {
      setSelectedJob(job)
    }
    setShowDetailModal(true)
  }

  return (
    <div className="row">
      <div className="col-12">
        <div className="card mb-4">
          <div className="card-header"><i className="fas fa-star mr-2" /><strong>Modelos Treinados</strong></div>
          <div className="card-body">
            {models.length === 0 ? <p className="text-muted mb-0">Nenhum modelo encontrado.</p> : (
              <div className="accordion" id="modelsAccordion">
                {models.map((model) => (
                  <div key={model.id} className="card">
                    <div className="card-header p-2" id={`heading-${model.id}`}>
                      <div className="d-flex align-items-center">
                        <button className="btn btn-link btn-sm text-left text-dark text-decoration-none" type="button" data-toggle="collapse" data-target={`#collapse-${model.id}`} aria-expanded={expandedModel === model.id} onClick={() => setExpandedModel(expandedModel === model.id ? null : model.id)}>
                          <span className="font-weight-bold mr-2">#{model.id}</span>
                          <span className="mr-2">{model.name}</span>
                        </button>
                        {model.is_default ? <span className="badge badge-success mr-2">Padrão</span> : <button type="button" className="btn btn-primary btn-sm py-0 px-2 mr-2" onClick={(ev) => { ev.stopPropagation(); setDefaultModel(model.id) }}><i className="fas fa-check mr-1" /> Definir como padrão</button>}
                        <span className="ml-auto small text-muted">{model.created_at ? new Date(model.created_at).toLocaleString('pt-BR') : ''}</span>
                      </div>
                    </div>
                    <div id={`collapse-${model.id}`} className={`collapse ${expandedModel === model.id ? 'show' : ''}`} data-parent="#modelsAccordion">
                      <div className="card-body">
                        <div className="row">
                          <div className="col-md-6"><p className="mb-1 small font-weight-bold">Caminho</p><code className="small d-block bg-light p-2 rounded">{model.path || '—'}</code></div>
                          <div className="col-md-6"><p className="mb-1 small font-weight-bold">Criado em</p><span className="small">{model.created_at ? new Date(model.created_at).toLocaleString('pt-BR') : '—'}</span></div>
                          <div className="col-12 mt-2"><p className="mb-1 small font-weight-bold">Metadados</p>{renderModelMetadata(model.metadata)}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header d-flex justify-content-between align-items-center">
            <strong>Treinamentos</strong>
            <button type="button" className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}><i className="fas fa-plus mr-2" /> Novo Treinamento</button>
          </div>
          <div className="card-body">
            {error && <div className="alert alert-danger alert-dismissible"><button type="button" className="close" onClick={() => setError(null)}><span>&times;</span></button>{error}</div>}
            {success && <div className="alert alert-success alert-dismissible"><button type="button" className="close" onClick={() => setSuccess(null)}><span>&times;</span></button>{success}</div>}
            {loading ? <div className="text-center py-4"><i className="fas fa-spinner fa-spin fa-2x" /></div> : jobs.length === 0 ? <p className="text-muted">Nenhum treinamento. Clique em Novo Treinamento.</p> : (
              <div className="table-responsive">
                <table className="table table-hover">
                  <thead><tr><th>ID</th><th>Status</th><th>Parâmetros</th><th>Modelo</th><th>Início</th><th>Fim</th><th>Ações</th></tr></thead>
                  <tbody>
                    {jobs.map((job) => (
                      <tr key={job.id}>
                        <td>#{job.id}</td>
                        <td>{statusBadge(job.status)}</td>
                        <td className="small">{job.params ? <span>{job.params.epochs && `${job.params.epochs} épocas`}{job.params.limit ? `, limit: ${job.params.limit}` : ''}{job.params.model_name ? `, ${job.params.model_name}` : ''}{job.params.set_as_default ? ', padrão' : ''}</span> : '-'}</td>
                        <td>{job.model_id ? (models.find((x) => x.id === job.model_id)?.name || `#${job.model_id}`) : '-'}</td>
                        <td className="small">{job.started_at ? new Date(job.started_at).toLocaleString('pt-BR') : '-'}</td>
                        <td className="small">{job.finished_at ? new Date(job.finished_at).toLocaleString('pt-BR') : '-'}</td>
                        <td><button type="button" className="btn btn-info btn-sm" onClick={() => viewDetail(job)}><i className="fas fa-info-circle" /></button></td>
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
          <div className="modal-dialog modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content">
              <div className="modal-header"><h5 className="modal-title">Novo Treinamento</h5><button type="button" className="close" onClick={() => setShowModal(false)}><span>&times;</span></button></div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  <div className="form-group"><label>Nome do modelo</label><input type="text" className="form-control" value={modelName} onChange={(e) => setModelName(e.target.value)} placeholder="Ex: modelo_producao_2025" /><small className="form-text text-muted">Opcional.</small></div>
                  <div className="form-group"><div className="custom-control custom-checkbox"><input type="checkbox" className="custom-control-input" id="set-as-default" checked={setAsDefault} onChange={(e) => setSetAsDefault(e.target.checked)} /><label className="custom-control-label" htmlFor="set-as-default">Definir como modelo padrão após o treinamento</label></div></div>
                  <div className="form-group"><label>Épocas</label><input type="number" min={1} max={1000} className="form-control" value={epochs} onChange={(e) => setEpochs(parseInt(e.target.value) || 10)} /></div>
                  <div className="form-group"><label>Limite de amostras (0 = todas)</label><input type="number" min={0} className="form-control" value={limit} onChange={(e) => setLimit(parseInt(e.target.value) || 0)} /></div>
                </div>
                <div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button><button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? <i className="fas fa-spinner fa-spin" /> : 'Iniciar Treinamento'}</button></div>
              </form>
            </div>
          </div>
        </div>
      )}

      {showDetailModal && selectedJob && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={() => setShowDetailModal(false)}>
          <div className="modal-dialog modal-lg modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content">
              <div className="modal-header"><h5 className="modal-title">Detalhes do Treinamento #{selectedJob.id}</h5><button type="button" className="close" onClick={() => setShowDetailModal(false)}><span>&times;</span></button></div>
              <div className="modal-body">
                <table className="table table-bordered table-sm">
                  <tbody>
                    <tr><td className="bg-light" style={{ width: '30%' }}>Status</td><td>{statusBadge(selectedJob.status)}</td></tr>
                    <tr><td className="bg-light">Parâmetros</td><td><pre className="mb-0 small">{JSON.stringify(selectedJob.params, null, 2)}</pre></td></tr>
                    <tr><td className="bg-light">Modelo</td><td>{selectedJob.model_id ? (models.find((m) => m.id === selectedJob.model_id)?.name || `#${selectedJob.model_id}`) : 'Nenhum'}</td></tr>
                    <tr><td className="bg-light">Criado em</td><td>{selectedJob.created_at ? new Date(selectedJob.created_at).toLocaleString('pt-BR') : '-'}</td></tr>
                    <tr><td className="bg-light">Iniciado em</td><td>{selectedJob.started_at ? new Date(selectedJob.started_at).toLocaleString('pt-BR') : '-'}</td></tr>
                    <tr><td className="bg-light">Finalizado em</td><td>{selectedJob.finished_at ? new Date(selectedJob.finished_at).toLocaleString('pt-BR') : '-'}</td></tr>
                    <tr><td className="bg-light">Mensagem</td><td>{selectedJob.message || '-'}</td></tr>
                  </tbody>
                </table>
              </div>
              <div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={() => setShowDetailModal(false)}>Fechar</button></div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Training
