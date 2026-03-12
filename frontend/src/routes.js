/**
 * DRG-BR Application Routes Configuration
 *
 * Defines all protected routes for the DRG-BR platform
 */

import React from 'react'

// Dashboard
const Dashboard = React.lazy(() => import('./views/dashboard/Dashboard'))

// Pages
const Users = React.lazy(() => import('./views/pages/users/Users'))
const Roles = React.lazy(() => import('./views/pages/roles/Roles'))
const ApiKeys = React.lazy(() => import('./views/pages/api-keys/ApiKeys'))
const Extraction = React.lazy(() => import('./views/pages/extraction/Extraction'))
const Training = React.lazy(() => import('./views/pages/training/Training'))
const Prediction = React.lazy(() => import('./views/pages/prediction/Prediction'))
const Settings = React.lazy(() => import('./views/pages/settings/Settings'))

const routes = [
  { path: '/', exact: true, name: 'Home', element: Dashboard },
  { path: '/dashboard', name: 'Dashboard', element: Dashboard },
  { path: '/users', name: 'Usuários', element: Users },
  { path: '/roles', name: 'Perfis', element: Roles },
  { path: '/api-keys', name: 'Chaves API', element: ApiKeys },
  { path: '/extraction', name: 'Extração', element: Extraction },
  { path: '/training', name: 'Treinamento', element: Training },
  { path: '/prediction', name: 'Predição', element: Prediction },
  { path: '/settings', name: 'Configurações', element: Settings },
]

export default routes
