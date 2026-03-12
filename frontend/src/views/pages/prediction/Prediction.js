import React, { useState, useEffect } from 'react'
import axios from 'axios'

const Prediction = () => {
  const [models, setModels] = useState([])
  const [apiKeys] = useState([])
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
        const [modelsRes] = await Promise.all([axios.get('/api/v1/models'), axios.get('/api/keys').catch(() => ({ data: [] }))])
        setModels(Array.isArray(modelsRes.data) ? modelsRes.data : [])
        const defaultModel = (modelsRes.data || []).find((m) => m.is_default)
        if (defaultModel) setModelId(String(defaultModel.id))
      } catch {
        setModels([])
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
    if (!apiKey.trim()) { setError('Informe a chave API.'); return }
    if (!cidPrincipal.trim()) { setError('CID principal é obrigatório.'); return }
    setLoading(true)
    try {
      const payload = {
        cid_principal: cidPrincipal.trim().toUpperCase().replace('.', ''),
        cids_secundarios: cidsSecundarios.split(/[,;]/).map((s) => s.trim().toUpperCase().replace('.', '')).filter(Boolean),
        procedimento_sigtap: procedimentoSigtap.trim(),
        idade: parseInt(idade, 10) || 50,
        sexo: parseInt(sexo, 10) || 0,
        urgencia: parseInt(urgencia, 10) ?? 1,
      }
      if (modelId) payload.model_id = parseInt(modelId, 10)
      const response = await axios.post('/api/v1/predict', payload, { headers: { 'X-API-Key': apiKey.trim() } })
      setResult(response.data)
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Erro ao obter predição')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="row">
      <div className="col-lg-5">
        <div className="card mb-4">
          <div className="card-header"><i className="fas fa-calculator mr-2" /><strong>Predição DRG-BR</strong></div>
          <div className="card-body">
            {error && <div className="alert alert-danger alert-dismissible"><button type="button" className="close" onClick={() => setError(null)}><span>&times;</span></button>{error}</div>}
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Chave API *</label>
                <div className="input-group"><div className="input-group-prepend"><span className="input-group-text"><i className="fas fa-key" /></span></div><input type="password" className="form-control" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="Cole sua chave API" autoComplete="off" /></div>
                <small className="form-text text-muted">Crie uma chave em Chaves API.</small>
              </div>
              {loadingModels ? <div className="mb-3"><i className="fas fa-spinner fa-spin" /> Carregando modelos...</div> : (
                <div className="form-group"><label>Modelo</label><select className="form-control" value={modelId} onChange={(e) => setModelId(e.target.value)}><option value="">Padrão</option>{models.map((m) => <option key={m.id} value={m.id}>{m.name} {m.is_default ? '(padrão)' : ''}</option>)}</select></div>
              )}
              <div className="form-group"><label>CID principal *</label><input type="text" className="form-control" value={cidPrincipal} onChange={(e) => setCidPrincipal(e.target.value)} placeholder="Ex: J189" /></div>
              <div className="form-group"><label>CIDs secundários</label><input type="text" className="form-control" value={cidsSecundarios} onChange={(e) => setCidsSecundarios(e.target.value)} placeholder="Separados por vírgula" /></div>
              <div className="form-group"><label>Procedimento SIGTAP</label><input type="text" className="form-control" value={procedimentoSigtap} onChange={(e) => setProcedimentoSigtap(e.target.value)} placeholder="Código" /></div>
              <div className="row">
                <div className="col-md-4 form-group"><label>Idade</label><input type="number" min={0} max={120} className="form-control" value={idade} onChange={(e) => setIdade(parseInt(e.target.value, 10) || 0)} /></div>
                <div className="col-md-4 form-group"><label>Sexo</label><select className="form-control" value={String(sexo)} onChange={(e) => setSexo(parseInt(e.target.value, 10))}><option value="0">Masculino</option><option value="1">Feminino</option></select></div>
                <div className="col-md-4 form-group"><label>Urgência</label><select className="form-control" value={String(urgencia)} onChange={(e) => setUrgencia(parseInt(e.target.value, 10))}><option value="0">Urgência</option><option value="1">Eletivo</option></select></div>
              </div>
              <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? <><i className="fas fa-spinner fa-spin mr-2" /> Calculando...</> : 'Calcular predição'}</button>
            </form>
          </div>
        </div>
      </div>
      <div className="col-lg-7">
        {result && (
          <div className="card mb-4">
            <div className="card-header bg-success text-white"><strong>Resultado da predição</strong></div>
            <div className="card-body">
              <table className="table table-bordered">
                <tbody>
                  <tr><td className="bg-light" style={{ width: '40%' }}>Código DRG-BR</td><td className="font-weight-bold">{result.drg_br_code ?? '—'}</td></tr>
                  <tr><td className="bg-light">MDC</td><td>{result.mdc ?? '—'}</td></tr>
                  <tr><td className="bg-light">Título MDC</td><td>{result.mdc_title ?? '—'}</td></tr>
                  <tr><td className="bg-light">Cirúrgico</td><td>{result.is_surgical ? 'Sim' : 'Não'}</td></tr>
                  <tr><td className="bg-light">Severidade</td><td>{result.severity ?? '—'}</td></tr>
                  {result.cc_mcc_summary && <tr><td className="bg-light">CC/MCC</td><td>CC: {result.cc_mcc_summary.has_cc ? 'Sim' : 'Não'} | MCC: {result.cc_mcc_summary.has_mcc ? 'Sim' : 'Não'} | Complicações: {result.cc_mcc_summary.n_complications ?? 0}</td></tr>}
                  {result.los_aritmetico != null && <tr><td className="bg-light">LOS (dias)</td><td>{result.los_aritmetico}</td></tr>}
                  {result.los_uti_aritmetico != null && <tr><td className="bg-light">LOS UTI (dias)</td><td>{result.los_uti_aritmetico}</td></tr>}
                  {result.custo_sus != null && <tr><td className="bg-light">Custo SUS (R$)</td><td>{result.custo_sus.toLocaleString('pt-BR')}</td></tr>}
                  {result.custo_suplementar != null && <tr><td className="bg-light">Custo suplementar (R$)</td><td>{result.custo_suplementar.toLocaleString('pt-BR')}</td></tr>}
                  {Object.keys(result || {}).filter((k) => k.startsWith('prob_')).map((key) => <tr key={key}><td className="bg-light">{key.replace('prob_', 'Prob. ')}</td><td>{(result[key] * 100).toFixed(2)}%</td></tr>)}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Prediction
