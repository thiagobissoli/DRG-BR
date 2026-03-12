import React from 'react'
import { CFooter } from '@coreui/react'

const AppFooter = () => {
  return (
    <CFooter className="px-4">
      <div>
        <span className="ms-1">DRG-BR &copy; {new Date().getFullYear()}</span>
      </div>
      <div className="ms-auto">
        <span className="me-1">Plataforma de Predição e Gestão</span>
      </div>
    </CFooter>
  )
}

export default React.memo(AppFooter)
