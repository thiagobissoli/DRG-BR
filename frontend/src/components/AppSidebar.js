import React from 'react'
import { useSelector, useDispatch } from 'react-redux'

import {
  CCloseButton,
  CSidebar,
  CSidebarBrand,
  CSidebarFooter,
  CSidebarHeader,
  CSidebarToggler,
} from '@coreui/react'

import { AppSidebarNav } from './AppSidebarNav'
import navigation from '../_nav'

const AppSidebar = () => {
  const dispatch = useDispatch()
  const unfoldable = useSelector((state) => state.sidebarUnfoldable)
  const sidebarShow = useSelector((state) => state.sidebarShow)

  return (
    <CSidebar
      className="border-end"
      colorScheme="dark"
      position="fixed"
      unfoldable={unfoldable}
      visible={sidebarShow}
      onVisibleChange={(visible) => {
        dispatch({ type: 'set', sidebarShow: visible })
      }}
    >
      <CSidebarHeader className="border-bottom">
        <CSidebarBrand to="/" className="d-flex align-items-center">
          <img
            src="/imagens/Logo.png"
            alt="DRG-BR"
            className="sidebar-brand-full"
            style={{ height: '36px' }}
            onError={(e) => {
              e.target.style.display = 'none'
              e.target.nextSibling && (e.target.nextSibling.style.display = 'inline')
            }}
          />
          <span className="sidebar-brand-full fw-bold ms-2" style={{ display: 'none', color: '#fff', fontSize: '18px' }}>
            DRG-BR
          </span>
          <img
            src="/imagens/Icone.png"
            alt="DRG-BR"
            className="sidebar-brand-narrow"
            style={{ height: '32px' }}
            onError={(e) => {
              e.target.style.display = 'none'
            }}
          />
        </CSidebarBrand>
        <CCloseButton
          className="d-lg-none"
          dark
          onClick={() => dispatch({ type: 'set', sidebarShow: false })}
        />
      </CSidebarHeader>
      <AppSidebarNav items={navigation} />
      <CSidebarFooter className="border-top d-none d-lg-flex">
        <CSidebarToggler
          onClick={() => dispatch({ type: 'set', sidebarUnfoldable: !unfoldable })}
        />
      </CSidebarFooter>
    </CSidebar>
  )
}

export default React.memo(AppSidebar)
