import React from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CDropdown,
  CDropdownDivider,
  CDropdownHeader,
  CDropdownItem,
  CDropdownMenu,
  CDropdownToggle,
} from '@coreui/react'
import {
  cilSettings,
  cilUser,
  cilAccountLogout,
} from '@coreui/icons'
import CIcon from '@coreui/icons-react'

import { useAuth } from '../../context/AuthContext'

const getInitials = (user) => {
  if (user?.name && user.name.trim()) {
    const parts = user.name.trim().split(/\s+/)
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    }
    return user.name.substring(0, 2).toUpperCase()
  }
  if (user?.email) {
    return user.email.substring(0, 2).toUpperCase()
  }
  return '?'
}

const AppHeaderDropdown = () => {
  const navigate = useNavigate()
  const { logout, user } = useAuth()
  const initials = getInitials(user)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <CDropdown variant="nav-item">
      <CDropdownToggle placement="bottom-end" className="py-0 pe-0" caret={false}>
        <div
          className="d-flex align-items-center justify-content-center rounded-circle bg-primary text-white"
          style={{ width: '36px', height: '36px', fontSize: '14px', fontWeight: 600 }}
          title={user?.email || 'Usuário'}
        >
          {initials}
        </div>
      </CDropdownToggle>
      <CDropdownMenu className="pt-0" placement="bottom-end">
        <CDropdownHeader className="bg-body-secondary fw-semibold mb-2">
          {user?.email || 'Conta'}
        </CDropdownHeader>
        <CDropdownItem href="#/settings">
          <CIcon icon={cilUser} className="me-2" />
          Perfil
        </CDropdownItem>
        <CDropdownItem href="#/settings">
          <CIcon icon={cilSettings} className="me-2" />
          Configurações
        </CDropdownItem>
        <CDropdownDivider />
        <CDropdownItem onClick={handleLogout}>
          <CIcon icon={cilAccountLogout} className="me-2" />
          Sair
        </CDropdownItem>
      </CDropdownMenu>
    </CDropdown>
  )
}

export default AppHeaderDropdown
