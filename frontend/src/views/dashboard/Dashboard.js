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
  CSpinner,
  CWidgetStatsF,
  CBadge,
  CProgress,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilPeople, cilNotes, cilChartPie, cilCalculator, cilSpeedometer } from '@coreui/icons'
import axios from 'axios'

const Dashboard = () => {
  const [stats, setStats] = useState({
    users: 0,
    apiKeys: 0,
    predictions: 0,
    models: 0,
  })
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

      if (logsRes.status === 'fulfilled' && Array.isArray(logsRes.value.data)) {
        setRecentLogs(logsRes.value.data.slice(-10).reverse())
      }

      if (quotasRes.status === 'fulfilled' && Array.isArray(quotasRes.value.data)) {
        setQuotas(quotasRes.value.data)
      }

      if (extractRes.status === 'fulfilled' && Array.isArray(extractRes.value.data)) {
        setExtractJobs(extractRes.value.data.slice(-5).reverse())
      }

      if (trainRes.status === 'fulfilled' && Array.isArray(trainRes.value.data)) {
        setTrainJobs(trainRes.value.data.slice(-5).reverse())
      }
    } catch (err) {
      console.error('Erro ao carregar dashboard:', err)
    } finally {
      setLoading(false)
    }
  }

  const statusBadge = (status) => {
    const colors = {
      success: 'success',
      running: 'warning',
      pending: 'info',
      failed: 'danger',
    }
    return <CBadge color={colors[status] || 'secondary'}>{status}</CBadge>
  }

  if (loading) {
    return (
      <div className="text-center py-5">
        <CSpinner color="primary" />
        <p className="mt-3 text-body-secondary">Carregando dashboard...</p>
      </div>
    )
  }

  return (
    <>
      <CRow className="mb-4">
        <CCol sm={6} lg={3}>
          <CWidgetStatsF
            className="mb-3"
            icon={<CIcon icon={cilPeople} height={24} />}
            title="Usuários"
            value={String(stats.users)}
            color="primary"
          />
        </CCol>
        <CCol sm={6} lg={3}>
          <CWidgetStatsF
            className="mb-3"
            icon={<CIcon icon={cilNotes} height={24} />}
            title="Chaves API"
            value={String(stats.apiKeys)}
            color="info"
          />
        </CCol>
        <CCol sm={6} lg={3}>
          <CWidgetStatsF
            className="mb-3"
            icon={<CIcon icon={cilChartPie} height={24} />}
            title="Predições"
            value={String(stats.predictions)}
            color="warning"
          />
        </CCol>
        <CCol sm={6} lg={3}>
          <CWidgetStatsF
            className="mb-3"
            icon={<CIcon icon={cilCalculator} height={24} />}
            title="Modelos"
            value={String(stats.models)}
            color="danger"
          />
        </CCol>
      </CRow>

      <CRow>
        <CCol lg={6}>
          <CCard className="mb-4">
            <CCardHeader>
              <CIcon icon={cilSpeedometer} className="me-2" />
              <strong>Uso de Quotas</strong>
            </CCardHeader>
            <CCardBody>
              {quotas.length === 0 ? (
                <p className="text-body-secondary mb-0">Nenhuma quota configurada.</p>
              ) : (
                quotas.map((q, idx) => {
                  const quota = q.quotas?.[0]
                  const limit = quota?.limit_value || 0
                  const used = q.usage_today || 0
                  const pct = limit === 0 ? 0 : Math.min(100, Math.round((used / limit) * 100))
                  return (
                    <div key={idx} className="mb-3">
                      <div className="d-flex justify-content-between mb-1">
                        <span className="fw-semibold">{q.key_name || `Chave #${idx + 1}`}</span>
                        <span className="text-body-secondary small">
                          {used} / {limit === 0 ? '∞' : limit}
                        </span>
                      </div>
                      <CProgress
                        value={limit === 0 ? 0 : pct}
                        color={pct > 80 ? 'danger' : pct > 50 ? 'warning' : 'success'}
                      />
                    </div>
                  )
                })
              )}
            </CCardBody>
          </CCard>

          <CCard className="mb-4">
            <CCardHeader>
              <strong>Extrações Recentes</strong>
            </CCardHeader>
            <CCardBody>
              {extractJobs.length === 0 ? (
                <p className="text-body-secondary mb-0">Nenhuma extração realizada.</p>
              ) : (
                <CTable hover small>
                  <CTableHead>
                    <CTableRow>
                      <CTableHeaderCell>ID</CTableHeaderCell>
                      <CTableHeaderCell>Status</CTableHeaderCell>
                      <CTableHeaderCell>Data</CTableHeaderCell>
                    </CTableRow>
                  </CTableHead>
                  <CTableBody>
                    {extractJobs.map((job) => (
                      <CTableRow key={job.id}>
                        <CTableDataCell>#{job.id}</CTableDataCell>
                        <CTableDataCell>{statusBadge(job.status)}</CTableDataCell>
                        <CTableDataCell className="small">
                          {job.created_at ? new Date(job.created_at).toLocaleString('pt-BR') : '-'}
                        </CTableDataCell>
                      </CTableRow>
                    ))}
                  </CTableBody>
                </CTable>
              )}
            </CCardBody>
          </CCard>
        </CCol>

        <CCol lg={6}>
          <CCard className="mb-4">
            <CCardHeader>
              <strong>Atividades Recentes</strong>
            </CCardHeader>
            <CCardBody>
              {recentLogs.length === 0 ? (
                <p className="text-body-secondary mb-0">Nenhuma atividade registrada.</p>
              ) : (
                <CTable hover small>
                  <CTableHead>
                    <CTableRow>
                      <CTableHeaderCell>Endpoint</CTableHeaderCell>
                      <CTableHeaderCell>Método</CTableHeaderCell>
                      <CTableHeaderCell>Status</CTableHeaderCell>
                      <CTableHeaderCell>Tempo</CTableHeaderCell>
                    </CTableRow>
                  </CTableHead>
                  <CTableBody>
                    {recentLogs.map((log) => (
                      <CTableRow key={log.id}>
                        <CTableDataCell className="small font-monospace">{log.endpoint}</CTableDataCell>
                        <CTableDataCell>
                          <CBadge color="secondary">{log.method}</CBadge>
                        </CTableDataCell>
                        <CTableDataCell>
                          <CBadge color={log.status_code < 400 ? 'success' : 'danger'}>
                            {log.status_code}
                          </CBadge>
                        </CTableDataCell>
                        <CTableDataCell className="small">
                          {log.response_time_ms ? `${log.response_time_ms}ms` : '-'}
                        </CTableDataCell>
                      </CTableRow>
                    ))}
                  </CTableBody>
                </CTable>
              )}
            </CCardBody>
          </CCard>

          <CCard className="mb-4">
            <CCardHeader>
              <strong>Treinamentos Recentes</strong>
            </CCardHeader>
            <CCardBody>
              {trainJobs.length === 0 ? (
                <p className="text-body-secondary mb-0">Nenhum treinamento realizado.</p>
              ) : (
                <CTable hover small>
                  <CTableHead>
                    <CTableRow>
                      <CTableHeaderCell>ID</CTableHeaderCell>
                      <CTableHeaderCell>Status</CTableHeaderCell>
                      <CTableHeaderCell>Modelo</CTableHeaderCell>
                      <CTableHeaderCell>Data</CTableHeaderCell>
                    </CTableRow>
                  </CTableHead>
                  <CTableBody>
                    {trainJobs.map((job) => (
                      <CTableRow key={job.id}>
                        <CTableDataCell>#{job.id}</CTableDataCell>
                        <CTableDataCell>{statusBadge(job.status)}</CTableDataCell>
                        <CTableDataCell>{job.model_id || '-'}</CTableDataCell>
                        <CTableDataCell className="small">
                          {job.created_at ? new Date(job.created_at).toLocaleString('pt-BR') : '-'}
                        </CTableDataCell>
                      </CTableRow>
                    ))}
                  </CTableBody>
                </CTable>
              )}
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>
    </>
  )
}

export default Dashboard
