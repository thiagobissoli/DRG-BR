import React from 'react'
import { Link } from 'react-router-dom'

const Page404 = () => {
  return (
    <div className="content-wrapper" style={{ minHeight: 'auto' }}>
      <section className="content">
        <div className="container-fluid">
          <div className="row justify-content-center">
            <div className="col-md-6">
              <div className="clearfix">
                <h1 className="float-left display-4 mr-4">404</h1>
                <h4 className="pt-3">Página não encontrada</h4>
                <p className="text-muted">A página que você procura não existe ou foi movida.</p>
              </div>
              <p><Link to="/#/dashboard" className="btn btn-primary">Voltar ao Início</Link></p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default Page404
