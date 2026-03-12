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
  CFormLabel,
  CFormInput,
  CFormCheck,
  CAccordion,
  CAccordionItem,
  CAccordionHeader,
  CAccordionBody,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilPlus, cilDescription, cilStar, cilCheckAlt } from '@coreui/icons'
import axios from 'axios'

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

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (success || error) {
      const t = setTimeout(() => { setSuccess(null); setError(null) }, 5000)
      return () => clearTimeout(t)
    }
  }, [success, error])

  const loadData = async () => {
    setLoading(true)
    try {
      const [jobsRes, modelsRes] = await Promise.all([
        axios.get('/api/train'),
        axios.get('/api/train/models').catch(() => ({ data: [] })),
      ])
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
      await axios.post('/api/train', {
        limit: limit || undefined,
        epochs,
        model_name: modelName.trim() || undefined,
        set_as_default: setAsDefault,
      })
      setSuccess('Treinamento iniciado com sucesso! Acompanhe o progresso na lista.')
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

  const statusBadge = (status) => {
    const colors = { success: 'success', running: 'warning', pending: 'info', failed: 'danger' }
    const labels = { success: 'Concluído', running: 'Executando', pending: 'Pendente', failed: 'Falhou' }
    return <CBadge color={colors[status] || 'secondary'}>{labels[status] || status}</CBadge>
  }

  const renderModelMetadata = (metadata) => {
    if (!metadata || typeof metadata !== 'object') return <span className="text-body-secondary small">—</span>
    return (
      <pre className="mb-0 small bg-body-tertiary p-2 rounded" style={{ fontSize: '12px', maxHeight: '120px', overflow: 'auto' }}>
        {JSON.stringify(metadata, null, 2)}
      </pre>
    )
  }

  return (
    <CRow>
      <CCol xs={12}>
        {/* Modelos Treinados */}
        <CCard className="mb-4">
          <CCardHeader>
            <CIcon icon={cilStar} className="me-2" />
            <strong>Modelos Treinados</strong>
          </CCardHeader>
          <CCardBody>
            {models.length === 0 ? (
              <p className="text-body-secondary mb-0">Nenhum modelo encontrado.</p>
            ) : (
              <CAccordion alwaysOpen>
                {models.map((model) => (
                  <CAccordionItem key={model.id} itemKey={String(model.id)}>
                    <CAccordionHeader>
                      <div className="d-flex align-items-center w-100 me-3">
                        <span className="fw-semibold me-2">#{model.id}</span>
                        <span className="me-2">{model.name}</span>
                        {model.is_default ? (
                          <CBadge color="success" className="me-2">Padrão</CBadge>
                        ) : (
                          <CButton
                            color="primary"
                            size="sm"
                            variant="outline"
                            className="py-0 px-2"
                            onClick={(ev) => { ev.stopPropagation(); setDefaultModel(model.id) }}
                          >
                            <CIcon icon={cilCheckAlt} size="sm" className="me-1" />
                            Definir como padrão
                          </CButton>
                        )}
                        <span className="ms-auto small text-body-secondary">
                          {model.created_at ? new Date(model.created_at).toLocaleString('pt-BR') : ''}
                        </span>
                      </div>
                    </CAccordionHeader>
                    <CAccordionBody>
                      <CRow>
                        <CCol md={6}>
                          <p className="mb-1 small fw-semibold">Caminho</p>
                          <code className="small d-block bg-body-tertiary p-2 rounded">{model.path || '—'}</code>
                        </CCol>
                        <CCol md={6}>
                          <p className="mb-1 small fw-semibold">Criado em</p>
                          <span className="small">
                            {model.created_at ? new Date(model.created_at).toLocaleString('pt-BR') : '—'}
                          </span>
                        </CCol>
                        <CCol xs={12} className="mt-2">
                          <p className="mb-1 small fw-semibold">Características / Metadados</p>
                          {renderModelMetadata(model.metadata)}
                        </CCol>
                      </CRow>
                    </CAccordionBody>
                  </CAccordionItem>
                ))}
              </CAccordion>
            )}
          </CCardBody>
        </CCard>

        {/* Jobs de Treinamento */}
        <CCard className="mb-4">
          <CCardHeader className="d-flex justify-content-between align-items-center">
            <strong>Treinamentos</strong>
            <CButton color="primary" size="sm" onClick={() => setShowModal(true)}>
              <CIcon icon={cilPlus} className="me-2" />
              Novo Treinamento
            </CButton>
          </CCardHeader>
          <CCardBody>
            {error && <CAlert color="danger" dismissible onClose={() => setError(null)}>{error}</CAlert>}
            {success && <CAlert color="success" dismissible onClose={() => setSuccess(null)}>{success}</CAlert>}

            {loading ? (
              <div className="text-center py-4"><CSpinner /></div>
            ) : jobs.length === 0 ? (
              <p className="text-body-secondary">
                Nenhum treinamento realizado. Clique em &quot;Novo Treinamento&quot; para começar.
              </p>
            ) : (
              <CTable hover responsive>
                <CTableHead>
                  <CTableRow>
                    <CTableHeaderCell>ID</CTableHeaderCell>
                    <CTableHeaderCell>Status</CTableHeaderCell>
                    <CTableHeaderCell>Parâmetros</CTableHeaderCell>
                    <CTableHeaderCell>Modelo</CTableHeaderCell>
                    <CTableHeaderCell>Início</CTableHeaderCell>
                    <CTableHeaderCell>Fim</CTableHeaderCell>
                    <CTableHeaderCell>Ações</CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {jobs.map((job) => (
                    <CTableRow key={job.id}>
                      <CTableDataCell>#{job.id}</CTableDataCell>
                      <CTableDataCell>{statusBadge(job.status)}</CTableDataCell>
                      <CTableDataCell className="small">
                        {job.params ? (
                          <span>
                            {job.params.epochs && `${job.params.epochs} épocas`}
                            {job.params.limit ? `, limit: ${job.params.limit}` : ''}
                            {job.params.model_name ? `, nome: ${job.params.model_name}` : ''}
                            {job.params.set_as_default ? ', padrão' : ''}
                          </span>
                        ) : '-'}
                      </CTableDataCell>
                      <CTableDataCell>
                        {job.model_id ? (
                          (() => {
                            const m = models.find((x) => x.id === job.model_id)
                            return m ? m.name : `#${job.model_id}`
                          })()
                        ) : '-'}
                      </CTableDataCell>
                      <CTableDataCell className="small">
                        {job.started_at ? new Date(job.started_at).toLocaleString('pt-BR') : '-'}
                      </CTableDataCell>
                      <CTableDataCell className="small">
                        {job.finished_at ? new Date(job.finished_at).toLocaleString('pt-BR') : '-'}
                      </CTableDataCell>
                      <CTableDataCell>
                        <CButton color="info" size="sm" variant="outline" onClick={() => viewDetail(job)}>
                          <CIcon icon={cilDescription} />
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

      {/* Modal Novo Treinamento */}
      <CModal visible={showModal} onClose={() => setShowModal(false)} backdrop="static">
        <CModalHeader>
          <CModalTitle>Novo Treinamento</CModalTitle>
        </CModalHeader>
        <CForm onSubmit={handleSubmit}>
          <CModalBody>
            <div className="mb-3">
              <CFormLabel>Nome do modelo</CFormLabel>
              <CFormInput
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
                placeholder="Ex: modelo_producao_2025"
              />
              <div className="form-text">
                Opcional. Se vazio, será gerado automaticamente (ex: model_20250101_120000).
              </div>
            </div>
            <div className="mb-3">
              <CFormCheck
                id="set-as-default"
                label="Definir como modelo padrão após o treinamento"
                checked={setAsDefault}
                onChange={(e) => setSetAsDefault(e.target.checked)}
              />
              <div className="form-text">
                O modelo padrão será usado nas predições quando nenhum outro for especificado.
              </div>
            </div>
            <div className="mb-3">
              <CFormLabel>Épocas</CFormLabel>
              <CFormInput
                type="number"
                min={1}
                max={1000}
                value={epochs}
                onChange={(e) => setEpochs(parseInt(e.target.value) || 10)}
              />
              <div className="form-text">
                Número de épocas de treinamento do modelo.
              </div>
            </div>
            <div className="mb-3">
              <CFormLabel>Limite de Amostras</CFormLabel>
              <CFormInput
                type="number"
                min={0}
                value={limit}
                onChange={(e) => setLimit(parseInt(e.target.value) || 0)}
              />
              <div className="form-text">
                0 = todas as amostras disponíveis. Defina um valor para limitar a quantidade de dados usados no treinamento.
              </div>
            </div>
          </CModalBody>
          <CModalFooter>
            <CButton color="secondary" variant="outline" onClick={() => setShowModal(false)}>
              Cancelar
            </CButton>
            <CButton color="primary" type="submit" disabled={submitting}>
              {submitting ? <CSpinner size="sm" /> : 'Iniciar Treinamento'}
            </CButton>
          </CModalFooter>
        </CForm>
      </CModal>

      {/* Modal Detalhes */}
      <CModal visible={showDetailModal} onClose={() => setShowDetailModal(false)} size="lg">
        <CModalHeader>
          <CModalTitle>Detalhes do Treinamento #{selectedJob?.id}</CModalTitle>
        </CModalHeader>
        <CModalBody>
          {selectedJob && (
            <CTable small bordered>
              <CTableBody>
                <CTableRow>
                  <CTableHeaderCell className="bg-body-tertiary" style={{ width: '30%' }}>Status</CTableHeaderCell>
                  <CTableDataCell>{statusBadge(selectedJob.status)}</CTableDataCell>
                </CTableRow>
                <CTableRow>
                  <CTableHeaderCell className="bg-body-tertiary">Parâmetros</CTableHeaderCell>
                  <CTableDataCell>
                    <pre className="mb-0 small">{JSON.stringify(selectedJob.params, null, 2)}</pre>
                  </CTableDataCell>
                </CTableRow>
                <CTableRow>
                  <CTableHeaderCell className="bg-body-tertiary">Modelo Gerado</CTableHeaderCell>
                  <CTableDataCell>
                    {selectedJob.model_id
                      ? (models.find((m) => m.id === selectedJob.model_id)?.name || `#${selectedJob.model_id}`)
                      : 'Nenhum (ainda)'}
                  </CTableDataCell>
                </CTableRow>
                <CTableRow>
                  <CTableHeaderCell className="bg-body-tertiary">Criado em</CTableHeaderCell>
                  <CTableDataCell>
                    {selectedJob.created_at ? new Date(selectedJob.created_at).toLocaleString('pt-BR') : '-'}
                  </CTableDataCell>
                </CTableRow>
                <CTableRow>
                  <CTableHeaderCell className="bg-body-tertiary">Iniciado em</CTableHeaderCell>
                  <CTableDataCell>
                    {selectedJob.started_at ? new Date(selectedJob.started_at).toLocaleString('pt-BR') : '-'}
                  </CTableDataCell>
                </CTableRow>
                <CTableRow>
                  <CTableHeaderCell className="bg-body-tertiary">Finalizado em</CTableHeaderCell>
                  <CTableDataCell>
                    {selectedJob.finished_at ? new Date(selectedJob.finished_at).toLocaleString('pt-BR') : '-'}
                  </CTableDataCell>
                </CTableRow>
                <CTableRow>
                  <CTableHeaderCell className="bg-body-tertiary">Mensagem</CTableHeaderCell>
                  <CTableDataCell>{selectedJob.message || '-'}</CTableDataCell>
                </CTableRow>
              </CTableBody>
            </CTable>
          )}
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" variant="outline" onClick={() => setShowDetailModal(false)}>
            Fechar
          </CButton>
        </CModalFooter>
      </CModal>
    </CRow>
  )
}

export default Training
