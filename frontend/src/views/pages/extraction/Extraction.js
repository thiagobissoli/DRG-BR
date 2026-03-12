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
  CFormCheck,
  CFormInput,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilPlus, cilDescription } from '@coreui/icons'
import axios from 'axios'

const SOURCES = [
  { id: 'sih', label: 'SIH (Sistema de Informações Hospitalares)' },
  { id: 'cid10', label: 'CID-10 (Classificação Internacional de Doenças)' },
  { id: 'sigtap', label: 'SIGTAP (Tabela de Procedimentos do SUS)' },
]

const STATES = [
  'AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT',
  'PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO',
]

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

  useEffect(() => {
    loadJobs()
  }, [])

  useEffect(() => {
    if (success || error) {
      const t = setTimeout(() => { setSuccess(null); setError(null) }, 5000)
      return () => clearTimeout(t)
    }
  }, [success, error])

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
    if (selectedSources.length === 0) {
      setError('Selecione pelo menos uma fonte de dados.')
      return
    }
    if (selectedStates.length === 0) {
      setError('Selecione pelo menos um estado.')
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      const years = []
      for (let y = yearStart; y <= yearEnd; y++) years.push(y)

      await axios.post('/api/extract', {
        sources: selectedSources,
        states: selectedStates,
        years,
      })
      setSuccess('Extração iniciada com sucesso! Acompanhe o progresso na lista.')
      setShowModal(false)
      loadJobs()
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao iniciar extração')
    } finally {
      setSubmitting(false)
    }
  }

  const toggleSource = (id) => {
    setSelectedSources((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    )
  }

  const toggleState = (st) => {
    setSelectedStates((prev) =>
      prev.includes(st) ? prev.filter((s) => s !== st) : [...prev, st],
    )
  }

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

  const statusBadge = (status) => {
    const colors = { success: 'success', running: 'warning', pending: 'info', failed: 'danger' }
    const labels = { success: 'Concluído', running: 'Executando', pending: 'Pendente', failed: 'Falhou' }
    return <CBadge color={colors[status] || 'secondary'}>{labels[status] || status}</CBadge>
  }

  return (
    <CRow>
      <CCol xs={12}>
        <CCard className="mb-4">
          <CCardHeader className="d-flex justify-content-between align-items-center">
            <strong>Extração de Dados</strong>
            <CButton color="primary" size="sm" onClick={() => setShowModal(true)}>
              <CIcon icon={cilPlus} className="me-2" />
              Nova Extração
            </CButton>
          </CCardHeader>
          <CCardBody>
            {error && <CAlert color="danger" dismissible onClose={() => setError(null)}>{error}</CAlert>}
            {success && <CAlert color="success" dismissible onClose={() => setSuccess(null)}>{success}</CAlert>}

            {loading ? (
              <div className="text-center py-4"><CSpinner /></div>
            ) : jobs.length === 0 ? (
              <p className="text-body-secondary">
                Nenhuma extração realizada. Clique em &quot;Nova Extração&quot; para começar.
              </p>
            ) : (
              <CTable hover responsive>
                <CTableHead>
                  <CTableRow>
                    <CTableHeaderCell>ID</CTableHeaderCell>
                    <CTableHeaderCell>Status</CTableHeaderCell>
                    <CTableHeaderCell>Fontes</CTableHeaderCell>
                    <CTableHeaderCell>Início</CTableHeaderCell>
                    <CTableHeaderCell>Fim</CTableHeaderCell>
                    <CTableHeaderCell>Mensagem</CTableHeaderCell>
                    <CTableHeaderCell>Ações</CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {jobs.map((job) => (
                    <CTableRow key={job.id}>
                      <CTableDataCell>#{job.id}</CTableDataCell>
                      <CTableDataCell>{statusBadge(job.status)}</CTableDataCell>
                      <CTableDataCell>
                        {(job.sources || []).map((s) => (
                          <CBadge key={s} color="secondary" className="me-1">{s}</CBadge>
                        ))}
                      </CTableDataCell>
                      <CTableDataCell className="small">
                        {job.started_at ? new Date(job.started_at).toLocaleString('pt-BR') : '-'}
                      </CTableDataCell>
                      <CTableDataCell className="small">
                        {job.finished_at ? new Date(job.finished_at).toLocaleString('pt-BR') : '-'}
                      </CTableDataCell>
                      <CTableDataCell className="small text-truncate" style={{ maxWidth: '200px' }}>
                        {job.message || '-'}
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

      {/* Modal Nova Extração */}
      <CModal size="lg" visible={showModal} onClose={() => setShowModal(false)} backdrop="static">
        <CModalHeader>
          <CModalTitle>Nova Extração de Dados</CModalTitle>
        </CModalHeader>
        <CForm onSubmit={handleSubmit}>
          <CModalBody>
            <div className="mb-4">
              <CFormLabel className="fw-semibold">Fontes de Dados</CFormLabel>
              {SOURCES.map((src) => (
                <CFormCheck
                  key={src.id}
                  label={src.label}
                  checked={selectedSources.includes(src.id)}
                  onChange={() => toggleSource(src.id)}
                />
              ))}
            </div>

            <CRow className="mb-4">
              <CCol md={6}>
                <CFormLabel className="fw-semibold">Ano Início</CFormLabel>
                <CFormInput
                  type="number"
                  min={2008}
                  max={2026}
                  value={yearStart}
                  onChange={(e) => setYearStart(parseInt(e.target.value) || 2023)}
                />
              </CCol>
              <CCol md={6}>
                <CFormLabel className="fw-semibold">Ano Fim</CFormLabel>
                <CFormInput
                  type="number"
                  min={2008}
                  max={2026}
                  value={yearEnd}
                  onChange={(e) => setYearEnd(parseInt(e.target.value) || 2024)}
                />
              </CCol>
            </CRow>

            <div className="mb-3">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <CFormLabel className="fw-semibold mb-0">Estados</CFormLabel>
                <div>
                  <CButton size="sm" color="link" className="p-0 me-3" onClick={selectAllStates}>
                    Selecionar todos
                  </CButton>
                  <CButton size="sm" color="link" className="p-0 text-danger" onClick={clearStates}>
                    Limpar
                  </CButton>
                </div>
              </div>
              <div className="d-flex flex-wrap gap-1">
                {STATES.map((st) => (
                  <CButton
                    key={st}
                    size="sm"
                    color={selectedStates.includes(st) ? 'primary' : 'secondary'}
                    variant={selectedStates.includes(st) ? undefined : 'outline'}
                    onClick={() => toggleState(st)}
                    style={{ minWidth: '48px' }}
                  >
                    {st}
                  </CButton>
                ))}
              </div>
              <div className="form-text mt-1">
                {selectedStates.length} estado(s) selecionado(s)
              </div>
            </div>
          </CModalBody>
          <CModalFooter>
            <CButton color="secondary" variant="outline" onClick={() => setShowModal(false)}>
              Cancelar
            </CButton>
            <CButton color="primary" type="submit" disabled={submitting}>
              {submitting ? <CSpinner size="sm" /> : 'Iniciar Extração'}
            </CButton>
          </CModalFooter>
        </CForm>
      </CModal>

      {/* Modal Detalhes */}
      <CModal visible={showDetailModal} onClose={() => setShowDetailModal(false)} size="lg">
        <CModalHeader>
          <CModalTitle>Detalhes da Extração #{selectedJob?.id}</CModalTitle>
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
                  <CTableHeaderCell className="bg-body-tertiary">Fontes</CTableHeaderCell>
                  <CTableDataCell>{(selectedJob.sources || []).join(', ') || '-'}</CTableDataCell>
                </CTableRow>
                <CTableRow>
                  <CTableHeaderCell className="bg-body-tertiary">Parâmetros</CTableHeaderCell>
                  <CTableDataCell>
                    <pre className="mb-0 small">{JSON.stringify(selectedJob.params, null, 2)}</pre>
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

export default Extraction
