import React from 'react'
import { Link } from 'react-router-dom'

const Register = () => {
  return (
    <div className="hold-transition login-page">
      <div className="login-box">
        <div className="card card-outline card-primary">
          <div className="card-header text-center"><h1 className="h1"><b>DRG-BR</b> Registro</h1></div>
          <div className="card-body">
            <p className="login-box-msg">Criar conta</p>
            <form>
              <div className="input-group mb-3">
                <input type="text" className="form-control" placeholder="Nome" autoComplete="name" />
                <div className="input-group-append"><div className="input-group-text"><span className="fas fa-user" /></div></div>
              </div>
              <div className="input-group mb-3">
                <input type="email" className="form-control" placeholder="Email" autoComplete="email" />
                <div className="input-group-append"><div className="input-group-text"><span className="fas fa-envelope" /></div></div>
              </div>
              <div className="input-group mb-3">
                <input type="password" className="form-control" placeholder="Senha" autoComplete="new-password" />
                <div className="input-group-append"><div className="input-group-text"><span className="fas fa-lock" /></div></div>
              </div>
              <div className="input-group mb-3">
                <input type="password" className="form-control" placeholder="Repetir senha" autoComplete="new-password" />
                <div className="input-group-append"><div className="input-group-text"><span className="fas fa-lock" /></div></div>
              </div>
              <div className="row">
                <div className="col-12"><button type="button" className="btn btn-primary btn-block">Criar conta</button></div>
              </div>
            </form>
            <p className="mb-0 mt-3"><Link to="/login" className="text-center">Já tenho conta — Fazer login</Link></p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Register
