import React from 'react'
import { createRoot } from 'react-dom/client'
import axios from 'axios'
import 'core-js'

import App from './App'

// Em produção, use VITE_API_URL para apontar ao backend (ex: https://api.seudominio.com)
const apiBase = typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace(/\/$/, '')
  : ''
if (apiBase) {
  axios.defaults.baseURL = apiBase
}

createRoot(document.getElementById('root')).render(<App />)
