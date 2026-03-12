import React, { useState, useEffect } from 'react'
import axios from 'axios'

const SOURCES = [
  { id: 'sih', label: 'SIH (Sistema de Informações Hospitalares)' },
  { id: 'cid10', label: 'CID-10' },
  { id: 'sigtap', label: 'SIGTAP (Tabela de Procedimentos do SUS)' },
]
const STATES = ['AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO']

const statusBadge = (status) => {
  const colors = { success: 'success', running: 'warning', pending: 'info', failed: 'danger' }
  const labels = { success: 'Concluído', running: 'Executando', pending: 'Pendente', failed: 'Falhou' }
  return <span className={`badge badge-${colors[status] || 'secondary'}`}>{labels[status] || status}</span>
}

const Extraction = () => {
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedJob, setSelectedJob] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [selectedSources, setSelectedSources] = useState(['sih'])
  const [selectedStates, setSelectedStates] = useState(['SP'])
  const [yearStart, setYearStart] = useState(2023)
  const [yearEnd, setYearEnd] = useState(2024)

  useEffect(() => { loadJobs() }, [])
  useEffect(() => { if (success || error) { const t = setTimeout(() => { setSuccess(null); setError(null) }, 5000); return () => clearTimeout(t) } }, [success, error])

  const loadJobs = async () => {
    setLoading(true)
    try {
      const response = await axios.get('/api/extract')
      setJobs(Array.isArray(response.data) ? response.data.reverse() : [])
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao carregar extrações')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (selectedSources.length === 0) { setError('Selecione pelo menos uma fonte.'); return }
    if (selectedStates.length === 0) { setError('Selecione pelo menos um estado.'); return }
    setSubmitting(true)
    setError(null)
    try {
      const years = []
      for (let y = yearStart; y <= yearEnd; y++) years.push(y)
      await axios.post('/api/extract', { sources: selectedSources, states: selectedStates, years })
      setSuccess('Extração iniciada! Acompanhe na lista.')
      setShowModal(false)
      loadJobs()
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao iniciar extração')
    } finally {
      setSubmitting(false)
    }
  }

  const toggleSource = (id) => setSelectedSources((prev) => prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id])
  const toggleState = (st) => setSelectedStates((prev) => prev.includes(st) ? prev.filter((s) => s !== st) : [...prev, st])
  const selectAllStates = () => setSelectedStates([...STATES])
  const clearStates = () => setSelectedStates([])

  const viewDetail = async (job) => {
    try {
      const response = await axios.get(`/api/extract/${job.id}`)
      setSelectedJob(response.data)
    } catch {
      setSelectedJob(job)
    }
    setShowDetailModal(true)
  }

  return (
    <div className="row">
      <div className="col-12">
        <div className="card">
          <div className="card-header d-flex justify-content-between align-items-center">
            <strong>Extração de Dados</strong>
            <button type="button" className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}><i className="fas fa-plus mr-2" /> Nova Extração</button>
          </div>
          <div className="card-body">
            {error && <div className="alert alert-danger alert-dismissible"><button type="button" className="close" onClick={() => setError(null)}><span>&times;</span></button>{error}</div>}
            {success && <div className="alert alert-success alert-dismissible"><button type="button" className="close" onClick={() => setSuccess(null)}><span>&times;</span></button>{success}</div>}
            {loading ? <div className="text-center py-4"><i className="fas fa-spinner fa-spin fa-2x" /></div> : jobs.length === 0 ? <p className="text-muted">Nenhuma extração. Clique em Nova Extração.</p> : (
              <div className="table-responsive">
                <table className="table table-hover">
                  <thead><tr><th>ID</th><th>Status</th><th>Fontes</th><th>Início</th><th>Fim</th><th>Mensagem</th><th>Ações</th></tr></thead>
                  <tbody>
                    {jobs.map((job) => (
                      <tr key={job.id}>
                        <td>#{job.id}</td>
                        <td>{statusBadge(job.status)}</td>
                        <td>{(job.sources || []).map((s) => <span key={s} className="badge badge-secondary mr-1">{s}</span>)}</td>
                        <td className="small">{job.started_at ? new Date(job.started_at).toLocaleString('pt-BR') : '-'}</td>
                        <td className="small">{job.finished_at ? new Date(job.finished_at).toLocaleString('pt-BR') : '-'}</td>
                        <td className="small text-truncate" style={{ maxWidth: 200 }}>{job.message || '-'}</td>
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
          <div className="modal-dialog modal-lg modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content">
              <div className="modal-header"><h5 className="modal-title">Nova Extração</h5><button type="button" className="close" onClick={() => setShowModal(false)}><span>&times;</span></button></div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  <div className="form-group">
                    <label className="font-weight-bold">Fontes</label>
                    {SOURCES.map((src) => (
                      <div key={src.id} className="custom-control custom-checkbox">
                        <input type="checkbox" className="custom-control-input" id={src.id} checked={selectedSources.includes(src.id)} onChange={() => toggleSource(src.id)} />
                        <label className="custom-control-label" htmlFor={src.id}>{src.label}</label>
                      </div>
                    ))}
                  </div>
                  <div className="row">
                    <div className="col-md-6 form-group"><label className="font-weight-bold">Ano Início</label><input type="number" min={2008} max={2026} className="form-control" value={yearStart} onChange={(e) => setYearStart(parseInt(e.target.value) || 2023)} /></div>
                    <div className="col-md-6 form-group"><label className="font-weight-bold">Ano Fim</label><input type="number" min={2008} max={2026} className="form-control" value={yearEnd} onChange={(e) => setYearEnd(parseInt(e.target.value) || 2024)} /></div>
                  </div>
                  <div className="form-group">
                    <div className="d-flex justify-content-between mb-2"><label className="font-weight-bold mb-0">Estados</label><div><button type="button" className="btn btn-link btn-sm p-0 mr-3" onClick={selectAllStates}>Selecionar todos</button><button type="button" className="btn btn-link btn-sm p-0 text-danger" onClick={clearStates}>Limpar</button></div></div>
                    <div className="d-flex flex-wrap">
                      {STATES.map((st) => <button key={st} type="button" className={`btn btn-sm mr-1 mb-1 ${selectedStates.includes(st) ? 'btn-primary' : 'btn-outline-secondary'}`} style={{ minWidth: 48 }} onClick={() => toggleState(st)}>{st}</button>)}
                    </div>
                    <small className="text-muted">{selectedStates.length} estado(s) selecionado(s)</small>
                  </div>
                </div>
                <div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button><button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? <i className="fas fa-spinner fa-spin" /> : 'Iniciar Extração'}</button></div>
              </form>
            </div>
          </div>
        </div>
      )}

      {showDetailModal && selectedJob && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={() => setShowDetailModal(false)}>
          <div className="modal-dialog modal-lg modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content">
              <div className="modal-header"><h5 className="modal-title">Detalhes da Extração #{selectedJob.id}</h5><button type="button" className="close" onClick={() => setShowDetailModal(false)}><span>&times;</span></button></div>
              <div className="modal-body">
                <table className="table table-bordered table-sm">
                  <tbody>
                    <tr><td className="bg-light" style={{ width: '30%' }}>Status</td><td>{statusBadge(selectedJob.status)}</td></tr>
                    <tr><td className="bg-light">Fontes</td><td>{(selectedJob.sources || []).join(', ') || '-'}</td></tr>
                    <tr><td className="bg-light">Parâmetros</td><td><pre className="mb-0 small">{JSON.stringify(selectedJob.params, null, 2)}</pre></td></tr>
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

export default Extraction
