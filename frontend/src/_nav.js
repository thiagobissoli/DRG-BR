/**
 * DRG-BR Sidebar Navigation Configuration
 *
 * Customized navigation menu for DRG-BR platform
 */

import React from 'react'
import CIcon from '@coreui/icons-react'
import {
  cilSpeedometer,
  cilPeople,
  cilNotes,
  cilChartPie,
  cilCalculator,
  cilGraph,
  cilSettings,
  cilGroup,
} from '@coreui/icons'
import { CNavGroup, CNavItem, CNavTitle } from '@coreui/react'

const _nav = [
  {
    component: CNavItem,
    name: 'Dashboard',
    to: '/dashboard',
    icon: <CIcon icon={cilSpeedometer} customClassName="nav-icon" />,
  },
  {
    component: CNavTitle,
    name: 'Gerenciamento',
  },
  {
    component: CNavItem,
    name: 'Usuários',
    to: '/users',
    icon: <CIcon icon={cilPeople} customClassName="nav-icon" />,
  },
  {
    component: CNavItem,
    name: 'Perfis',
    to: '/roles',
    icon: <CIcon icon={cilGroup} customClassName="nav-icon" />,
  },
  {
    component: CNavItem,
    name: 'Chaves API',
    to: '/api-keys',
    icon: <CIcon icon={cilNotes} customClassName="nav-icon" />,
  },
  {
    component: CNavTitle,
    name: 'Operações',
  },
  {
    component: CNavItem,
    name: 'Extração',
    to: '/extraction',
    icon: <CIcon icon={cilChartPie} customClassName="nav-icon" />,
  },
  {
    component: CNavItem,
    name: 'Treinamento',
    to: '/training',
    icon: <CIcon icon={cilCalculator} customClassName="nav-icon" />,
  },
  {
    component: CNavItem,
    name: 'Predição',
    to: '/prediction',
    icon: <CIcon icon={cilGraph} customClassName="nav-icon" />,
  },
  {
    component: CNavTitle,
    name: 'Sistema',
  },
  {
    component: CNavItem,
    name: 'Configurações',
    to: '/settings',
    icon: <CIcon icon={cilSettings} customClassName="nav-icon" />,
  },
]

export default _nav
