import React, { useState, useEffect } from 'react'
import axios from 'axios'

const statusBadge = (status) => {
  const colors = { success: 'success', running: 'warning', pending: 'info', failed: 'danger' }
  return <span className={`badge badge-${colors[status] || 'secondary'}`}>{status}</span>
}

const Dashboard = () => {
  const [stats, setStats] = useState({ users: 0, apiKeys: 0, predictions: 0, models: 0 })
  const [recentLogs, setRecentLogs] = useState([])
  const [quotas, setQuotas] = useState([])
  const [extractJobs, setExtractJobs] = useState([])
  const [trainJobs, setTrainJobs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    setLoading(true)
    try {
      const results = await Promise.allSettled([
        axios.get('/api/users'),
        axios.get('/api/keys'),
        axios.get('/api/usage/log'),
        axios.get('/api/v1/models'),
        axios.get('/api/usage/quotas'),
        axios.get('/api/extract'),
        axios.get('/api/train'),
      ])
      const [usersRes, keysRes, logsRes, modelsRes, quotasRes, extractRes, trainRes] = results
      setStats({
        users: usersRes.status === 'fulfilled' ? (Array.isArray(usersRes.value.data) ? usersRes.value.data.length : 0) : 0,
        apiKeys: keysRes.status === 'fulfilled' ? (Array.isArray(keysRes.value.data) ? keysRes.value.data.length : 0) : 0,
        predictions: logsRes.status === 'fulfilled' ? (Array.isArray(logsRes.value.data) ? logsRes.value.data.length : 0) : 0,
        models: modelsRes.status === 'fulfilled' ? (Array.isArray(modelsRes.value.data) ? modelsRes.value.data.length : 0) : 0,
      })
      if (logsRes.status === 'fulfilled' && Array.isArray(logsRes.value.data)) setRecentLogs(logsRes.value.data.slice(-10).reverse())
      if (quotasRes.status === 'fulfilled' && Array.isArray(quotasRes.value.data)) setQuotas(quotasRes.value.data)
      if (extractRes.status === 'fulfilled' && Array.isArray(extractRes.value.data)) setExtractJobs(extractRes.value.data.slice(-5).reverse())
      if (trainRes.status === 'fulfilled' && Array.isArray(trainRes.value.data)) setTrainJobs(trainRes.value.data.slice(-5).reverse())
    } catch (err) {
      console.error('Erro ao carregar dashboard:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="text-center py-5">
        <i className="fas fa-spinner fa-spin fa-2x text-primary" />
        <p className="mt-3 text-muted">Carregando dashboard...</p>
      </div>
    )
  }

  return (
    <>
      <div className="row mb-4">
        <div className="col-lg-3 col-6">
          <div className="small-box bg-info">
            <div className="inner">
              <h3>{stats.users}</h3>
              <p>Usuários</p>
            </div>
            <div className="icon"><i className="fas fa-users" /></div>
          </div>
        </div>
        <div className="col-lg-3 col-6">
          <div className="small-box bg-success">
            <div className="inner">
              <h3>{stats.apiKeys}</h3>
              <p>Chaves API</p>
            </div>
            <div className="icon"><i className="fas fa-key" /></div>
          </div>
        </div>
        <div className="col-lg-3 col-6">
          <div className="small-box bg-warning">
            <div className="inner">
              <h3>{stats.predictions}</h3>
              <p>Predições</p>
            </div>
            <div className="icon"><i className="fas fa-chart-line" /></div>
          </div>
        </div>
        <div className="col-lg-3 col-6">
          <div className="small-box bg-danger">
            <div className="inner">
              <h3>{stats.models}</h3>
              <p>Modelos</p>
            </div>
            <div className="icon"><i className="fas fa-calculator" /></div>
          </div>
        </div>
      </div>

      <div className="row">
        <div className="col-lg-6">
          <div className="card">
            <div className="card-header"><strong>Uso de Quotas</strong></div>
            <div className="card-body">
              {quotas.length === 0 ? <p className="text-muted mb-0">Nenhuma quota configurada.</p> : (
                quotas.map((q, idx) => {
                  const quota = q.quotas?.[0]
                  const limit = quota?.limit_value || 0
                  const used = q.usage_today || 0
                  const pct = limit === 0 ? 0 : Math.min(100, Math.round((used / limit) * 100))
                  return (
                    <div key={idx} className="mb-3">
                      <div className="d-flex justify-content-between mb-1">
                        <span className="font-weight-bold">{q.key_name || `Chave #${idx + 1}`}</span>
                        <span className="text-muted small">{used} / {limit === 0 ? '∞' : limit}</span>
                      </div>
                      <div className="progress">
                        <div className={`progress-bar ${pct > 80 ? 'bg-danger' : pct > 50 ? 'bg-warning' : 'bg-success'}`} role="progressbar" style={{ width: `${limit === 0 ? 0 : pct}%` }} />
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-header"><strong>Extrações Recentes</strong></div>
            <div className="card-body p-0">
              {extractJobs.length === 0 ? <p className="text-muted p-3 mb-0">Nenhuma extração realizada.</p> : (
                <table className="table table-sm table-hover mb-0">
                  <thead><tr><th>ID</th><th>Status</th><th>Data</th></tr></thead>
                  <tbody>
                    {extractJobs.map((job) => (
                      <tr key={job.id}>
                        <td>#{job.id}</td>
                        <td>{statusBadge(job.status)}</td>
                        <td className="small">{job.created_at ? new Date(job.created_at).toLocaleString('pt-BR') : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        <div className="col-lg-6">
          <div className="card">
            <div className="card-header"><strong>Atividades Recentes</strong></div>
            <div className="card-body p-0">
              {recentLogs.length === 0 ? <p className="text-muted p-3 mb-0">Nenhuma atividade registrada.</p> : (
                <table className="table table-sm table-hover mb-0">
                  <thead><tr><th>Endpoint</th><th>Método</th><th>Status</th><th>Tempo</th></tr></thead>
                  <tbody>
                    {recentLogs.map((log) => (
                      <tr key={log.id}>
                        <td className="small font-monospace">{log.endpoint}</td>
                        <td><span className="badge badge-secondary">{log.method}</span></td>
                        <td><span className={`badge badge-${log.status_code < 400 ? 'success' : 'danger'}`}>{log.status_code}</span></td>
                        <td className="small">{log.response_time_ms ? `${log.response_time_ms}ms` : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-header"><strong>Treinamentos Recentes</strong></div>
            <div className="card-body p-0">
              {trainJobs.length === 0 ? <p className="text-muted p-3 mb-0">Nenhum treinamento realizado.</p> : (
                <table className="table table-sm table-hover mb-0">
                  <thead><tr><th>ID</th><th>Status</th><th>Modelo</th><th>Data</th></tr></thead>
                  <tbody>
                    {trainJobs.map((job) => (
                      <tr key={job.id}>
                        <td>#{job.id}</td>
                        <td>{statusBadge(job.status)}</td>
                        <td>{job.model_id || '-'}</td>
                        <td className="small">{job.created_at ? new Date(job.created_at).toLocaleString('pt-BR') : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default Dashboard
