import React, { useState, useEffect } from 'react'
import {
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CRow,
  CForm,
  CFormLabel,
  CFormInput,
  CFormSelect,
  CButton,
  CSpinner,
  CAlert,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
  CInputGroup,
  CInputGroupText,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilCalculator, cilLockLocked } from '@coreui/icons'
import axios from 'axios'

const Prediction = () => {
  const [models, setModels] = useState([])
  const [apiKeys, setApiKeys] = useState([])
  const [loadingModels, setLoadingModels] = useState(true)

  const [apiKey, setApiKey] = useState('')
  const [modelId, setModelId] = useState('')
  const [cidPrincipal, setCidPrincipal] = useState('')
  const [cidsSecundarios, setCidsSecundarios] = useState('')
  const [procedimentoSigtap, setProcedimentoSigtap] = useState('')
  const [idade, setIdade] = useState(50)
  const [sexo, setSexo] = useState(0)
  const [urgencia, setUrgencia] = useState(1)

  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const load = async () => {
      setLoadingModels(true)
      try {
        const [modelsRes, keysRes] = await Promise.all([
          axios.get('/api/v1/models'),
          axios.get('/api/keys').catch(() => ({ data: [] })),
        ])
        setModels(Array.isArray(modelsRes.data) ? modelsRes.data : [])
        setApiKeys(Array.isArray(keysRes.data) ? keysRes.data : [])
        const defaultModel = (modelsRes.data || []).find((m) => m.is_default)
        if (defaultModel) setModelId(String(defaultModel.id))
      } catch {
        setModels([])
        setApiKeys([])
      } finally {
        setLoadingModels(false)
      }
    }
    load()
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setResult(null)
    if (!apiKey.trim()) {
      setError('Informe a chave API.')
      return
    }
    if (!cidPrincipal.trim()) {
      setError('CID principal é obrigatório.')
      return
    }

    setLoading(true)
    try {
      const payload = {
        cid_principal: cidPrincipal.trim().toUpperCase().replace('.', ''),
        cids_secundarios: cidsSecundarios
          .split(/[,;]/)
          .map((s) => s.trim().toUpperCase().replace('.', ''))
          .filter(Boolean),
        procedimento_sigtap: procedimentoSigtap.trim(),
        idade: parseInt(idade, 10) || 50,
        sexo: parseInt(sexo, 10) || 0,
        urgencia: parseInt(urgencia, 10) ?? 1,
      }
      if (modelId) payload.model_id = parseInt(modelId, 10)

      const response = await axios.post('/api/v1/predict', payload, {
        headers: { 'X-API-Key': apiKey.trim() },
      })
      setResult(response.data)
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Erro ao obter predição')
    } finally {
      setLoading(false)
    }
  }

  return (
    <CRow>
      <CCol lg={5}>
        <CCard className="mb-4">
          <CCardHeader>
            <CIcon icon={cilCalculator} className="me-2" />
            <strong>Predição DRG-BR</strong>
          </CCardHeader>
          <CCardBody>
            {error && (
              <CAlert color="danger" dismissible onClose={() => setError(null)}>
                {error}
              </CAlert>
            )}

            <CForm onSubmit={handleSubmit}>
              <div className="mb-3">
                <CFormLabel>Chave API *</CFormLabel>
                <CInputGroup>
                  <CInputGroupText>
                    <CIcon icon={cilLockLocked} />
                  </CInputGroupText>
                  <CFormInput
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Cole sua chave API"
                    autoComplete="off"
                  />
                </CInputGroup>
                <div className="form-text">
                  Crie uma chave em &quot;Chaves API&quot; e use aqui para autenticar a predição.
                </div>
              </div>

              {loadingModels ? (
                <div className="mb-3"><CSpinner size="sm" /> Carregando modelos...</div>
              ) : (
                <div className="mb-3">
                  <CFormLabel>Modelo</CFormLabel>
                  <CFormSelect value={modelId} onChange={(e) => setModelId(e.target.value)}>
                    <option value="">Padrão (configuração do servidor)</option>
                    {models.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} {m.is_default ? '(padrão)' : ''}
                      </option>
                    ))}
                  </CFormSelect>
                </div>
              )}

              <div className="mb-3">
                <CFormLabel>CID principal *</CFormLabel>
                <CFormInput
                  value={cidPrincipal}
                  onChange={(e) => setCidPrincipal(e.target.value)}
                  placeholder="Ex: J189"
                />
              </div>

              <div className="mb-3">
                <CFormLabel>CIDs secundários</CFormLabel>
                <CFormInput
                  value={cidsSecundarios}
                  onChange={(e) => setCidsSecundarios(e.target.value)}
                  placeholder="Separados por vírgula. Ex: E119, I10"
                />
              </div>

              <div className="mb-3">
                <CFormLabel>Procedimento SIGTAP</CFormLabel>
                <CFormInput
                  value={procedimentoSigtap}
                  onChange={(e) => setProcedimentoSigtap(e.target.value)}
                  placeholder="Código do procedimento"
                />
              </div>

              <CRow>
                <CCol md={4}>
                  <div className="mb-3">
                    <CFormLabel>Idade</CFormLabel>
                    <CFormInput
                      type="number"
                      min={0}
                      max={120}
                      value={idade}
                      onChange={(e) => setIdade(parseInt(e.target.value, 10) || 0)}
                    />
                  </div>
                </CCol>
                <CCol md={4}>
                  <div className="mb-3">
                    <CFormLabel>Sexo</CFormLabel>
                    <CFormSelect value={String(sexo)} onChange={(e) => setSexo(parseInt(e.target.value, 10))}>
                      <option value="0">Masculino</option>
                      <option value="1">Feminino</option>
                    </CFormSelect>
                  </div>
                </CCol>
                <CCol md={4}>
                  <div className="mb-3">
                    <CFormLabel>Urgência</CFormLabel>
                    <CFormSelect value={String(urgencia)} onChange={(e) => setUrgencia(parseInt(e.target.value, 10))}>
                      <option value="0">Urgência</option>
                      <option value="1">Eletivo</option>
                    </CFormSelect>
                  </div>
                </CCol>
              </CRow>

              <CButton color="primary" type="submit" disabled={loading}>
                {loading ? <><CSpinner size="sm" className="me-2" /> Calculando...</> : 'Calcular predição'}
              </CButton>
            </CForm>
          </CCardBody>
        </CCard>
      </CCol>

      <CCol lg={7}>
        {result && (
          <CCard className="mb-4">
            <CCardHeader className="bg-success text-white">
              <strong>Resultado da predição</strong>
            </CCardHeader>
            <CCardBody>
              <CTable bordered responsive>
                <CTableBody>
                  <CTableRow>
                    <CTableHeaderCell className="bg-body-tertiary" style={{ width: '40%' }}>Código DRG-BR</CTableHeaderCell>
                    <CTableDataCell className="fw-bold">{result.drg_br_code ?? '—'}</CTableDataCell>
                  </CTableRow>
                  <CTableRow>
                    <CTableHeaderCell className="bg-body-tertiary">MDC</CTableHeaderCell>
                    <CTableDataCell>{result.mdc ?? '—'}</CTableDataCell>
                  </CTableRow>
                  <CTableRow>
                    <CTableHeaderCell className="bg-body-tertiary">Título MDC</CTableHeaderCell>
                    <CTableDataCell>{result.mdc_title ?? '—'}</CTableDataCell>
                  </CTableRow>
                  <CTableRow>
                    <CTableHeaderCell className="bg-body-tertiary">Cirúrgico</CTableHeaderCell>
                    <CTableDataCell>{result.is_surgical ? 'Sim' : 'Não'}</CTableDataCell>
                  </CTableRow>
                  <CTableRow>
                    <CTableHeaderCell className="bg-body-tertiary">Severidade</CTableHeaderCell>
                    <CTableDataCell>{result.severity ?? '—'}</CTableDataCell>
                  </CTableRow>
                  {result.cc_mcc_summary && (
                    <CTableRow>
                      <CTableHeaderCell className="bg-body-tertiary">CC/MCC</CTableHeaderCell>
                      <CTableDataCell>
                        CC: {result.cc_mcc_summary.has_cc ? 'Sim' : 'Não'} |
                        MCC: {result.cc_mcc_summary.has_mcc ? 'Sim' : 'Não'} |
                        Complicações: {result.cc_mcc_summary.n_complications ?? 0}
                      </CTableDataCell>
                    </CTableRow>
                  )}
                  {result.los_aritmetico != null && (
                    <CTableRow>
                      <CTableHeaderCell className="bg-body-tertiary">LOS (dias)</CTableHeaderCell>
                      <CTableDataCell>{result.los_aritmetico}</CTableDataCell>
                    </CTableRow>
                  )}
                  {result.los_uti_aritmetico != null && (
                    <CTableRow>
                      <CTableHeaderCell className="bg-body-tertiary">LOS UTI (dias)</CTableHeaderCell>
                      <CTableDataCell>{result.los_uti_aritmetico}</CTableDataCell>
                    </CTableRow>
                  )}
                  {result.custo_sus != null && (
                    <CTableRow>
                      <CTableHeaderCell className="bg-body-tertiary">Custo SUS (R$)</CTableHeaderCell>
                      <CTableDataCell>{result.custo_sus.toLocaleString('pt-BR')}</CTableDataCell>
                    </CTableRow>
                  )}
                  {result.custo_suplementar != null && (
                    <CTableRow>
                      <CTableHeaderCell className="bg-body-tertiary">Custo suplementar (R$)</CTableHeaderCell>
                      <CTableDataCell>{result.custo_suplementar.toLocaleString('pt-BR')}</CTableDataCell>
                    </CTableRow>
                  )}
                  {Object.keys(result || {}).filter((k) => k.startsWith('prob_')).map((key) => (
                    <CTableRow key={key}>
                      <CTableHeaderCell className="bg-body-tertiary">{key.replace('prob_', 'Prob. ')}</CTableHeaderCell>
                      <CTableDataCell>{(result[key] * 100).toFixed(2)}%</CTableDataCell>
                    </CTableRow>
                  ))}
                </CTableBody>
              </CTable>
            </CCardBody>
          </CCard>
        )}
      </CCol>
    </CRow>
  )
}

export default Prediction
