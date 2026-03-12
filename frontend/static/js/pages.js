/**
 * Páginas DRG-BR (renderizadores que recebem container e preenchem innerHTML + eventos)
 */
window.DRG_PAGES = (function () {
  var API = window.DRG_API;
  var AUTH = window.DRG_AUTH;

  function esc(s) {
    if (s == null) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function login(container) {
    var step2fa = false;
    var tempToken = '';

    function renderForm() {
      container.innerHTML =
        '<p class="login-box-msg">Entre para iniciar sua sessão</p>' +
        '<div id="login-error" class="alert alert-danger alert-dismissible" style="display:none;"><span id="login-error-msg"></span><button type="button" class="close" data-dismiss="alert"><span>&times;</span></button></div>' +
        '<form id="login-form">' +
        '  <div class="input-group mb-3"><input type="email" class="form-control" id="login-email" placeholder="Email" required autocomplete="email" />' +
        '  <div class="input-group-append"><div class="input-group-text"><span class="fas fa-envelope"></span></div></div></div>' +
        '  <div class="input-group mb-3"><input type="password" class="form-control" id="login-password" placeholder="Senha" required />' +
        '  <div class="input-group-append"><div class="input-group-text"><span class="fas fa-lock"></span></div></div></div>' +
        '  <div class="row"><div class="col-12"><button type="submit" class="btn btn-primary btn-block" id="login-btn">Entrar</button></div></div>' +
        '</form>';
      container.querySelector('#login-form').addEventListener('submit', function (e) {
        e.preventDefault();
        var email = document.getElementById('login-email').value.trim();
        var password = document.getElementById('login-password').value;
        var btn = document.getElementById('login-btn');
        var errEl = document.getElementById('login-error');
        var errMsg = document.getElementById('login-error-msg');
        if (!email || !password) { errMsg.textContent = 'Preencha email e senha.'; errEl.style.display = ''; return; }
        btn.disabled = true;
        AUTH.login(email, password).then(function (r) {
          btn.disabled = false;
          if (r.success) { window.location.hash = '#/dashboard'; return; }
          if (r.requires2fa && r.temporary_token) { step2fa = true; tempToken = r.temporary_token; render2fa(); return; }
          errMsg.textContent = r.message || 'Falha no login'; errEl.style.display = '';
        });
      });
    }

    function render2fa() {
      container.innerHTML =
        '<p class="login-box-msg">Código do aplicativo autenticador</p>' +
        '<div id="login-error" class="alert alert-danger alert-dismissible" style="display:none;"><span id="login-error-msg"></span></div>' +
        '<form id="login-2fa-form">' +
        '  <div class="input-group mb-3"><input type="text" class="form-control" id="login-code" placeholder="000000" maxlength="6" pattern="[0-9]*" inputmode="numeric" />' +
        '  <div class="input-group-append"><div class="input-group-text"><span class="fas fa-shield-alt"></span></div></div></div>' +
        '  <div class="row"><div class="col-12"><button type="submit" class="btn btn-primary btn-block">Verificar</button></div></div>' +
        '</form>' +
        '<button type="button" class="btn btn-link btn-block" id="login-back">Voltar ao login</button>';
      container.querySelector('#login-2fa-form').addEventListener('submit', function (e) {
        e.preventDefault();
        var code = document.getElementById('login-code').value.trim();
        var errEl = document.getElementById('login-error');
        var errMsg = document.getElementById('login-error-msg');
        if (code.length !== 6) { errMsg.textContent = 'Informe o código de 6 dígitos.'; errEl.style.display = ''; return; }
        AUTH.verify2fa(tempToken, code).then(function (r) {
          if (r.success) window.location.hash = '#/dashboard';
          else { errMsg.textContent = r.message; errEl.style.display = ''; }
        });
      });
      document.getElementById('login-back').addEventListener('click', function () { step2fa = false; tempToken = ''; renderForm(); });
    }

    renderForm();
  }

  function register(container) {
    container.innerHTML =
      '<p class="login-box-msg">Criar conta</p>' +
      '<form><div class="input-group mb-3"><input type="text" class="form-control" placeholder="Nome" />' +
      '<div class="input-group-append"><div class="input-group-text"><span class="fas fa-user"></span></div></div></div>' +
      '<div class="input-group mb-3"><input type="email" class="form-control" placeholder="Email" />' +
      '<div class="input-group-append"><div class="input-group-text"><span class="fas fa-envelope"></span></div></div></div>' +
      '<div class="input-group mb-3"><input type="password" class="form-control" placeholder="Senha" />' +
      '<div class="input-group-append"><div class="input-group-text"><span class="fas fa-lock"></span></div></div></div>' +
      '<div class="row"><div class="col-12"><button type="button" class="btn btn-primary btn-block">Criar conta</button></div></div></form>' +
      '<p class="mb-0 mt-3"><a href="#/login" class="text-center">Já tenho conta — Fazer login</a></p>';
  }

  function statusBadge(st) {
    if (st === 'success') return '<span class="badge badge-success">Concluído</span>';
    if (st === 'running') return '<span class="badge badge-warning">Executando</span>';
    if (st === 'pending') return '<span class="badge badge-info">Pendente</span>';
    if (st === 'failed') return '<span class="badge badge-danger">Falhou</span>';
    return '<span class="badge badge-secondary">' + esc(st) + '</span>';
  }

  function dashboard(container) {
    container.innerHTML = '<div class="text-center py-5"><i class="fas fa-spinner fa-spin fa-2x"></i><p class="mt-3 text-muted">Carregando...</p></div>';
    Promise.all([
      API.get('/api/users').catch(function () { return []; }),
      API.get('/api/keys').catch(function () { return []; }),
      API.get('/api/v1/models').catch(function () { return []; }),
      API.get('/api/extract').catch(function () { return []; }),
      API.get('/api/train').catch(function () { return []; }),
      API.get('/api/usage/log').catch(function () { return []; }),
      API.get('/api/usage/quotas').catch(function () { return []; })
    ]).then(function (results) {
      var users = Array.isArray(results[0]) ? results[0] : [];
      var keys = Array.isArray(results[1]) ? results[1] : [];
      var models = Array.isArray(results[2]) ? results[2] : [];
      var extract = Array.isArray(results[3]) ? results[3] : [];
      var train = Array.isArray(results[4]) ? results[4] : [];
      var logs = Array.isArray(results[5]) ? results[5] : [];
      var quotas = Array.isArray(results[6]) ? results[6] : [];

      var boxes =
        '<div class="row mb-4">' +
        '<div class="col-lg-3 col-6"><div class="small-box bg-info"><div class="inner"><h3>' + users.length + '</h3><p>Usuários</p></div><div class="icon"><i class="fas fa-users"></i></div></div></div>' +
        '<div class="col-lg-3 col-6"><div class="small-box bg-success"><div class="inner"><h3>' + keys.length + '</h3><p>Chaves API</p></div><div class="icon"><i class="fas fa-key"></i></div></div></div>' +
        '<div class="col-lg-3 col-6"><div class="small-box bg-warning"><div class="inner"><h3>' + models.length + '</h3><p>Modelos</p></div><div class="icon"><i class="fas fa-cube"></i></div></div></div>' +
        '<div class="col-lg-3 col-6"><div class="small-box bg-primary"><div class="inner"><h3>' + logs.length + '</h3><p>Predições (log)</p></div><div class="icon"><i class="fas fa-chart-line"></i></div></div></div>' +
        '</div>';

      var quotasRows = quotas.map(function (q) {
        var limit = (q.quotas && q.quotas[0]) ? q.quotas[0].limit_value : 0;
        return '<tr><td>' + esc(q.key_name || 'Chave #' + q.api_key_id) + '</td><td>' + (limit === 0 ? 'Ilimitado' : limit) + '</td><td>' + (q.usage_today || 0) + '</td></tr>';
      }).join('');
      var quotasCard =
        '<div class="col-12 col-lg-6"><div class="card"><div class="card-header"><strong>Quotas por chave (hoje)</strong></div><div class="card-body p-0">' +
        '<div class="table-responsive"><table class="table table-sm table-hover mb-0"><thead><tr><th>Chave</th><th>Limite/dia</th><th>Usado hoje</th></tr></thead><tbody>' +
        (quotasRows || '<tr><td colspan="3" class="text-muted">Nenhuma chave ou sem permissão.</td></tr>') +
        '</tbody></table></div></div></div></div>';

      var logRows = logs.slice(0, 10).map(function (l) {
        var at = l.requested_at ? new Date(l.requested_at).toLocaleString('pt-BR') : '-';
        return '<tr><td class="small">' + at + '</td><td>' + esc(l.endpoint || '-') + '</td><td>' + (l.status_code || '-') + '</td><td class="small">' + (l.response_time_ms != null ? l.response_time_ms + ' ms' : '-') + '</td></tr>';
      }).join('');
      var logCard =
        '<div class="col-12 col-lg-6"><div class="card"><div class="card-header"><strong>Últimas atividades (predições)</strong></div><div class="card-body p-0">' +
        '<div class="table-responsive"><table class="table table-sm table-hover mb-0"><thead><tr><th>Data</th><th>Endpoint</th><th>Status</th><th>Tempo</th></tr></thead><tbody>' +
        (logRows || '<tr><td colspan="4" class="text-muted">Nenhuma atividade.</td></tr>') +
        '</tbody></table></div></div></div></div>';

      var extractRows = extract.slice(-5).reverse().map(function (j) {
        return '<tr><td>#' + esc(j.id) + '</td><td>' + statusBadge(j.status) + '</td><td class="small">' + (j.started_at ? new Date(j.started_at).toLocaleString('pt-BR') : '-') + '</td><td class="small text-truncate" style="max-width:120px">' + esc(j.message || '-') + '</td></tr>';
      }).join('');
      var extractCard =
        '<div class="col-12 col-lg-6"><div class="card"><div class="card-header"><strong>Últimas extrações</strong> <a href="#/extraction" class="btn btn-sm btn-primary float-right">Ver todas</a></div><div class="card-body p-0">' +
        '<div class="table-responsive"><table class="table table-sm table-hover mb-0"><thead><tr><th>ID</th><th>Status</th><th>Início</th><th>Mensagem</th></tr></thead><tbody>' +
        (extractRows || '<tr><td colspan="4" class="text-muted">Nenhuma extração.</td></tr>') +
        '</tbody></table></div></div></div></div>';

      var trainRows = train.slice(-5).reverse().map(function (j) {
        return '<tr><td>#' + esc(j.id) + '</td><td>' + statusBadge(j.status) + '</td><td class="small">' + (j.started_at ? new Date(j.started_at).toLocaleString('pt-BR') : '-') + '</td><td class="small text-truncate" style="max-width:120px">' + esc(j.message || '-') + '</td></tr>';
      }).join('');
      var trainCard =
        '<div class="col-12 col-lg-6"><div class="card"><div class="card-header"><strong>Últimos treinamentos</strong> <a href="#/training" class="btn btn-sm btn-primary float-right">Ver todos</a></div><div class="card-body p-0">' +
        '<div class="table-responsive"><table class="table table-sm table-hover mb-0"><thead><tr><th>ID</th><th>Status</th><th>Início</th><th>Mensagem</th></tr></thead><tbody>' +
        (trainRows || '<tr><td colspan="4" class="text-muted">Nenhum treinamento.</td></tr>') +
        '</tbody></table></div></div></div></div>';

      container.innerHTML = boxes +
        '<div class="row">' + quotasCard + logCard + '</div>' +
        '<div class="row mt-3">' + extractCard + trainCard + '</div>' +
        '<div class="row mt-3"><div class="col-12"><div class="card"><div class="card-header"><h5 class="m-0">Bem-vindo ao DRG-BR</h5></div><div class="card-body"><p>Use o menu lateral para acessar Extração, Treinamento, Predição, Usuários e Configurações.</p></div></div></div></div>';
    }).catch(function () {
      container.innerHTML = '<div class="alert alert-danger">Erro ao carregar o dashboard.</div>';
    });
  }

  function users(container) {
    container.innerHTML = '<div class="text-center py-4"><i class="fas fa-spinner fa-spin fa-2x"></i></div>';
    Promise.all([
      API.get('/api/users').catch(function () { return []; }),
      API.get('/api/roles').catch(function () { return []; })
    ]).then(function (results) {
      var list = Array.isArray(results[0]) ? results[0] : [];
      var rolesList = Array.isArray(results[1]) ? results[1] : [];
      var roleCheckboxes = rolesList.map(function (r) {
        return '<div class="custom-control custom-checkbox"><input type="checkbox" class="custom-control-input" id="user-role-' + r.id + '" data-role-id="' + r.id + '"><label class="custom-control-label" for="user-role-' + r.id + '">' + esc(r.name) + '</label></div>';
      }).join('');

      var rows = list.map(function (u) {
        return '<tr data-user-id="' + u.id + '">' +
          '<td>' + esc(u.id) + '</td><td>' + esc(u.email) + '</td><td>' + esc(u.name || '-') + '</td>' +
          '<td>' + (u.active ? '<span class="badge badge-success">Ativo</span>' : '<span class="badge badge-secondary">Inativo</span>') + '</td>' +
          '<td class="small">' + (u.created_at ? new Date(u.created_at).toLocaleDateString('pt-BR') : '-') + '</td>' +
          '<td><button type="button" class="btn btn-sm btn-outline-primary mr-1 user-edit-btn" data-id="' + u.id + '"><i class="fas fa-edit"></i></button>' +
          '<button type="button" class="btn btn-sm btn-outline-danger user-delete-btn" data-id="' + u.id + '" data-email="' + esc(u.email) + '"><i class="fas fa-trash"></i></button></td></tr>';
      }).join('');

      container.innerHTML =
        '<div id="users-alert"></div>' +
        '<div class="card"><div class="card-header d-flex justify-content-between align-items-center">' +
        '<strong>Usuários</strong>' +
        '<button type="button" class="btn btn-primary btn-sm" id="user-new-btn"><i class="fas fa-plus mr-1"></i> Novo usuário</button>' +
        '</div><div class="card-body">' +
        '<div class="table-responsive"><table class="table table-hover"><thead><tr><th>ID</th><th>Email</th><th>Nome</th><th>Status</th><th>Criado</th><th>Ações</th></tr></thead><tbody id="users-tbody">' +
        (rows || '<tr><td colspan="6" class="text-muted">Nenhum usuário.</td></tr>') +
        '</tbody></table></div></div></div>' +

        '<div class="modal fade" id="user-form-modal" tabindex="-1"><div class="modal-dialog"><div class="modal-content">' +
        '<div class="modal-header"><h5 class="modal-title" id="user-form-title">Novo usuário</h5><button type="button" class="close" data-dismiss="modal"><span>&times;</span></button></div>' +
        '<div class="modal-body">' +
        '<div id="user-form-error" class="alert alert-danger" style="display:none;"></div>' +
        '<form id="user-form">' +
        '<input type="hidden" id="user-form-id" value="">' +
        '<div class="form-group"><label>Email</label><input type="email" class="form-control" id="user-email" required placeholder="email@exemplo.com"></div>' +
        '<div class="form-group"><label>Nome</label><input type="text" class="form-control" id="user-name" placeholder="Nome completo"></div>' +
        '<div class="form-group" id="user-password-group"><label>Senha <span class="text-muted small">(mín. 6 caracteres)</span></label><input type="password" class="form-control" id="user-password" placeholder="Deixar em branco para não alterar" autocomplete="new-password"></div>' +
        '<div class="form-group" id="user-password-confirm-group"><label>Confirmar senha</label><input type="password" class="form-control" id="user-password-confirm" placeholder="Repita a senha" autocomplete="new-password"></div>' +
        '<div class="form-group"><div class="custom-control custom-checkbox"><input type="checkbox" class="custom-control-input" id="user-active" checked><label class="custom-control-label" for="user-active">Ativo</label></div></div>' +
        '<div class="form-group"><label>Perfis</label><div id="user-roles-container">' + (roleCheckboxes || '<p class="text-muted small">Nenhum perfil cadastrado.</p>') + '</div></div>' +
        '</form></div>' +
        '<div class="modal-footer"><button type="button" class="btn btn-secondary" data-dismiss="modal">Cancelar</button><button type="button" class="btn btn-primary" id="user-form-submit">Salvar</button></div>' +
        '</div></div></div>' +

        '<div class="modal fade" id="user-delete-modal" tabindex="-1"><div class="modal-dialog"><div class="modal-content">' +
        '<div class="modal-header"><h5 class="modal-title">Excluir usuário</h5><button type="button" class="close" data-dismiss="modal"><span>&times;</span></button></div>' +
        '<div class="modal-body"><p>Tem certeza que deseja excluir o usuário <strong id="user-delete-email"></strong>?</p><p class="text-danger small">Esta ação não pode ser desfeita.</p></div>' +
        '<div class="modal-footer"><button type="button" class="btn btn-secondary" data-dismiss="modal">Cancelar</button><button type="button" class="btn btn-danger" id="user-delete-confirm">Excluir</button></div>' +
        '</div></div></div>';

      function showAlert(msg, isError) {
        var el = document.getElementById('users-alert');
        if (!el) return;
        el.innerHTML = '<div class="alert alert-' + (isError ? 'danger' : 'success') + ' alert-dismissible"><button type="button" class="close" data-dismiss="alert"><span>&times;</span></button>' + esc(msg) + '</div>';
        setTimeout(function () { el.innerHTML = ''; }, 5000);
      }

      function getSelectedRoleIds() {
        var out = [];
        container.querySelectorAll('#user-roles-container input[data-role-id]:checked').forEach(function (cb) { out.push(parseInt(cb.getAttribute('data-role-id'), 10)); });
        return out;
      }

      function setRoleCheckboxes(roleIds) {
        var ids = roleIds || [];
        container.querySelectorAll('#user-roles-container input[data-role-id]').forEach(function (cb) {
          cb.checked = ids.indexOf(parseInt(cb.getAttribute('data-role-id'), 10)) !== -1;
        });
      }

      function el(selector) {
        return container.querySelector('#user-form-modal ' + selector) || container.querySelector(selector);
      }

      function openCreateModal() {
        el('#user-form-title').textContent = 'Novo usuário';
        el('#user-form-id').value = '';
        el('#user-email').value = '';
        el('#user-email').readOnly = false;
        el('#user-name').value = '';
        el('#user-password').value = '';
        el('#user-password-confirm').value = '';
        el('#user-password').required = true;
        el('#user-password-group').style.display = '';
        el('#user-password-confirm-group').style.display = '';
        el('#user-active').checked = true;
        setRoleCheckboxes([]);
        el('#user-form-error').style.display = 'none';
        if (typeof $ !== 'undefined') $('#user-form-modal').modal('show'); else { el('#user-form-modal').classList.add('show'); el('#user-form-modal').style.display = 'block'; }
      }

      function openEditModal(user) {
        el('#user-form-title').textContent = 'Editar usuário';
        el('#user-form-id').value = user.id ? String(user.id) : '';
        el('#user-email').value = (user.email != null) ? String(user.email) : '';
        el('#user-email').readOnly = true;
        el('#user-name').value = (user.name != null) ? String(user.name) : '';
        el('#user-password').value = '';
        el('#user-password-confirm').value = '';
        el('#user-password').required = false;
        el('#user-password-group').style.display = '';
        el('#user-password-confirm-group').style.display = '';
        el('#user-active').checked = user.active !== false;
        setRoleCheckboxes(Array.isArray(user.role_ids) ? user.role_ids : []);
        el('#user-form-error').style.display = 'none';
        if (typeof $ !== 'undefined') $('#user-form-modal').modal('show'); else { el('#user-form-modal').classList.add('show'); el('#user-form-modal').style.display = 'block'; }
      }

      function loadUsers() {
        API.get('/api/users').then(function (data) {
          var list = Array.isArray(data) ? data : [];
          var tbody = document.getElementById('users-tbody');
          if (!tbody) return;
          var rows = list.map(function (u) {
            return '<tr data-user-id="' + u.id + '">' +
              '<td>' + esc(u.id) + '</td><td>' + esc(u.email) + '</td><td>' + esc(u.name || '-') + '</td>' +
              '<td>' + (u.active ? '<span class="badge badge-success">Ativo</span>' : '<span class="badge badge-secondary">Inativo</span>') + '</td>' +
              '<td class="small">' + (u.created_at ? new Date(u.created_at).toLocaleDateString('pt-BR') : '-') + '</td>' +
              '<td><button type="button" class="btn btn-sm btn-outline-primary mr-1 user-edit-btn" data-id="' + u.id + '"><i class="fas fa-edit"></i></button>' +
              '<button type="button" class="btn btn-sm btn-outline-danger user-delete-btn" data-id="' + u.id + '" data-email="' + esc(u.email) + '"><i class="fas fa-trash"></i></button></td></tr>';
          }).join('');
          tbody.innerHTML = rows || '<tr><td colspan="6" class="text-muted">Nenhum usuário.</td></tr>';
          container.querySelectorAll('.user-edit-btn').forEach(function (btn) {
            btn.addEventListener('click', function () {
              var id = parseInt(btn.getAttribute('data-id'), 10);
              API.get('/api/users/' + id).then(openEditModal).catch(function (e) { showAlert(e.data && e.data.error || 'Erro ao carregar usuário', true); });
            });
          });
          container.querySelectorAll('.user-delete-btn').forEach(function (btn) {
            btn.addEventListener('click', function () {
              document.getElementById('user-delete-email').textContent = btn.getAttribute('data-email') || '';
              document.getElementById('user-delete-confirm').setAttribute('data-id', btn.getAttribute('data-id'));
              $('#user-delete-modal').modal('show');
            });
          });
        });
      }

      document.getElementById('user-new-btn').addEventListener('click', openCreateModal);

      container.querySelector('#user-form-submit').addEventListener('click', function () {
        var id = el('#user-form-id').value.trim();
        var email = el('#user-email').value.trim().toLowerCase();
        var name = el('#user-name').value.trim();
        var password = el('#user-password').value;
        var passwordConfirm = el('#user-password-confirm').value;
        var active = el('#user-active').checked;
        var roleIds = getSelectedRoleIds();
        var errEl = el('#user-form-error');
        errEl.style.display = 'none';
        if (!email) { errEl.textContent = 'Informe o email.'; errEl.style.display = 'block'; return; }
        if (!id && (!password || password.length < 6)) { errEl.textContent = 'Senha obrigatória (mín. 6 caracteres).'; errEl.style.display = 'block'; return; }
        if (password && password.length < 6) { errEl.textContent = 'Senha deve ter no mínimo 6 caracteres.'; errEl.style.display = 'block'; return; }
        if (password && password !== passwordConfirm) { errEl.textContent = 'Senha e confirmar senha não coincidem.'; errEl.style.display = 'block'; return; }
        var payload = { email: email, name: name || null, active: active, role_ids: roleIds };
        if (password) payload.password = password;
        if (id) {
          API.put('/api/users/' + id, payload).then(function () {
            if (typeof $ !== 'undefined') $('#user-form-modal').modal('hide'); else { el('#user-form-modal').style.display = 'none'; el('#user-form-modal').classList.remove('show'); }
            showAlert('Usuário atualizado.');
            loadUsers();
          }).catch(function (e) { errEl.textContent = (e.data && e.data.error) || 'Erro ao atualizar.'; errEl.style.display = 'block'; });
        } else {
          API.post('/api/users', payload).then(function () {
            if (typeof $ !== 'undefined') $('#user-form-modal').modal('hide'); else { el('#user-form-modal').style.display = 'none'; el('#user-form-modal').classList.remove('show'); }
            showAlert('Usuário criado.');
            loadUsers();
          }).catch(function (e) { errEl.textContent = (e.data && e.data.error) || 'Erro ao criar.'; errEl.style.display = 'block'; });
        }
      });

      document.getElementById('user-delete-confirm').addEventListener('click', function () {
        var id = this.getAttribute('data-id');
        if (!id) return;
        API.delete('/api/users/' + id).then(function () {
          $('#user-delete-modal').modal('hide');
          showAlert('Usuário excluído.');
          loadUsers();
        }).catch(function (e) { showAlert((e.data && e.data.error) || 'Erro ao excluir.', true); });
      });

      container.querySelectorAll('.user-edit-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var id = parseInt(btn.getAttribute('data-id'), 10);
          API.get('/api/users/' + id).then(openEditModal).catch(function (e) { showAlert(e.data && e.data.error || 'Erro ao carregar usuário', true); });
        });
      });
      container.querySelectorAll('.user-delete-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
          document.getElementById('user-delete-email').textContent = btn.getAttribute('data-email') || '';
          document.getElementById('user-delete-confirm').setAttribute('data-id', btn.getAttribute('data-id'));
          $('#user-delete-modal').modal('show');
        });
      });
    }).catch(function () {
      container.innerHTML = '<div class="alert alert-danger">Erro ao carregar usuários.</div>';
    });
  }

  function roles(container) {
    container.innerHTML = '<div class="text-center py-4"><i class="fas fa-spinner fa-spin fa-2x"></i></div>';
    Promise.all([
      API.get('/api/roles').catch(function () { return []; }),
      API.get('/api/roles/permissions').catch(function () { return []; })
    ]).then(function (results) {
      var list = Array.isArray(results[0]) ? results[0] : [];
      var permissions = Array.isArray(results[1]) ? results[1] : [];
      var permNames = {};
      permissions.forEach(function (p) { permNames[p.id] = p.name || ''; });
      function permIdsToNames(ids) {
        if (!Array.isArray(ids)) return '';
        return ids.map(function (id) { return permNames[id] || id; }).join(', ');
      }
      var permCheckboxes = permissions.map(function (p) {
        return '<div class="custom-control custom-checkbox"><input type="checkbox" class="custom-control-input" id="role-perm-' + p.id + '" data-perm-id="' + p.id + '"><label class="custom-control-label" for="role-perm-' + p.id + '">' + esc(p.name) + '</label></div>';
      }).join('');

      var rows = list.map(function (r) {
        return '<tr data-role-id="' + r.id + '">' +
          '<td>' + esc(r.id) + '</td><td>' + esc(r.name) + '</td><td class="small">' + esc(r.description || '-') + '</td>' +
          '<td class="small">' + esc(permIdsToNames(r.permission_ids)) + '</td>' +
          '<td><button type="button" class="btn btn-sm btn-outline-primary role-edit-btn" data-id="' + r.id + '"><i class="fas fa-edit"></i> Editar</button></td></tr>';
      }).join('');

      container.innerHTML =
        '<div id="roles-alert"></div>' +
        '<div class="card"><div class="card-header d-flex justify-content-between align-items-center">' +
        '<strong>Perfis de acesso</strong>' +
        '<button type="button" class="btn btn-primary btn-sm" id="role-new-btn"><i class="fas fa-plus mr-1"></i> Novo perfil</button>' +
        '</div><div class="card-body">' +
        '<div class="table-responsive"><table class="table table-hover"><thead><tr><th>ID</th><th>Nome</th><th>Descrição</th><th>Permissões</th><th>Ações</th></tr></thead><tbody id="roles-tbody">' +
        (rows || '<tr><td colspan="5" class="text-muted">Nenhum perfil.</td></tr>') +
        '</tbody></table></div></div></div>' +

        '<div class="modal fade" id="role-form-modal" tabindex="-1"><div class="modal-dialog"><div class="modal-content">' +
        '<div class="modal-header"><h5 class="modal-title" id="role-form-title">Novo perfil</h5><button type="button" class="close" data-dismiss="modal"><span>&times;</span></button></div>' +
        '<div class="modal-body">' +
        '<div id="role-form-error" class="alert alert-danger" style="display:none;"></div>' +
        '<form id="role-form">' +
        '<input type="hidden" id="role-form-id" value="">' +
        '<div class="form-group"><label>Nome</label><input type="text" class="form-control" id="role-name" required placeholder="Ex: Administrador"></div>' +
        '<div class="form-group"><label>Descrição</label><textarea class="form-control" id="role-description" rows="2" placeholder="Descrição do perfil"></textarea></div>' +
        '<div class="form-group"><label>Permissões</label><div id="role-perms-container">' + (permCheckboxes || '<p class="text-muted small">Nenhuma permissão disponível.</p>') + '</div></div>' +
        '</form></div>' +
        '<div class="modal-footer"><button type="button" class="btn btn-secondary" data-dismiss="modal">Cancelar</button><button type="button" class="btn btn-primary" id="role-form-submit">Salvar</button></div>' +
        '</div></div></div>';

      function showAlert(msg, isError) {
        var el = container.querySelector('#roles-alert');
        if (!el) return;
        el.innerHTML = '<div class="alert alert-' + (isError ? 'danger' : 'success') + ' alert-dismissible"><button type="button" class="close" data-dismiss="alert"><span>&times;</span></button>' + esc(msg) + '</div>';
        setTimeout(function () { el.innerHTML = ''; }, 5000);
      }

      function roleEl(selector) {
        return container.querySelector('#role-form-modal ' + selector) || container.querySelector(selector);
      }

      function getSelectedPermIds() {
        var out = [];
        container.querySelectorAll('#role-perms-container input[data-perm-id]:checked').forEach(function (cb) { out.push(parseInt(cb.getAttribute('data-perm-id'), 10)); });
        return out;
      }

      function setPermCheckboxes(permIds) {
        var ids = permIds || [];
        container.querySelectorAll('#role-perms-container input[data-perm-id]').forEach(function (cb) {
          cb.checked = ids.indexOf(parseInt(cb.getAttribute('data-perm-id'), 10)) !== -1;
        });
      }

      function openCreateModal() {
        roleEl('#role-form-title').textContent = 'Novo perfil';
        roleEl('#role-form-id').value = '';
        roleEl('#role-name').value = '';
        roleEl('#role-name').readOnly = false;
        roleEl('#role-description').value = '';
        setPermCheckboxes([]);
        roleEl('#role-form-error').style.display = 'none';
        if (typeof $ !== 'undefined') $('#role-form-modal').modal('show'); else { roleEl('#role-form-modal').classList.add('show'); roleEl('#role-form-modal').style.display = 'block'; }
      }

      function openEditModal(role) {
        roleEl('#role-form-title').textContent = 'Editar perfil';
        roleEl('#role-form-id').value = role.id ? String(role.id) : '';
        roleEl('#role-name').value = (role.name != null) ? String(role.name) : '';
        roleEl('#role-name').readOnly = true;
        roleEl('#role-description').value = (role.description != null) ? String(role.description) : '';
        setPermCheckboxes(Array.isArray(role.permission_ids) ? role.permission_ids : []);
        roleEl('#role-form-error').style.display = 'none';
        if (typeof $ !== 'undefined') $('#role-form-modal').modal('show'); else { roleEl('#role-form-modal').classList.add('show'); roleEl('#role-form-modal').style.display = 'block'; }
      }

      function loadRoles() {
        API.get('/api/roles').then(function (data) {
          var list = Array.isArray(data) ? data : [];
          var tbody = container.querySelector('#roles-tbody');
          if (!tbody) return;
          var rows = list.map(function (r) {
            return '<tr data-role-id="' + r.id + '">' +
              '<td>' + esc(r.id) + '</td><td>' + esc(r.name) + '</td><td class="small">' + esc(r.description || '-') + '</td>' +
              '<td class="small">' + esc(permIdsToNames(r.permission_ids)) + '</td>' +
              '<td><button type="button" class="btn btn-sm btn-outline-primary role-edit-btn" data-id="' + r.id + '"><i class="fas fa-edit"></i> Editar</button></td></tr>';
          }).join('');
          tbody.innerHTML = rows || '<tr><td colspan="5" class="text-muted">Nenhum perfil.</td></tr>';
          container.querySelectorAll('.role-edit-btn').forEach(function (btn) {
            btn.addEventListener('click', function () {
              var id = parseInt(btn.getAttribute('data-id'), 10);
              API.get('/api/roles/' + id).then(openEditModal).catch(function (e) { showAlert(e.data && e.data.error || 'Erro ao carregar perfil', true); });
            });
          });
        });
      }

      container.querySelector('#role-new-btn').addEventListener('click', openCreateModal);

      container.querySelector('#role-form-submit').addEventListener('click', function () {
        var id = roleEl('#role-form-id').value.trim();
        var name = roleEl('#role-name').value.trim();
        var description = roleEl('#role-description').value.trim();
        var permIds = getSelectedPermIds();
        var errEl = roleEl('#role-form-error');
        errEl.style.display = 'none';
        if (!name) { errEl.textContent = 'Informe o nome do perfil.'; errEl.style.display = 'block'; return; }
        var payload = { name: name, description: description, permission_ids: permIds };
        if (id) {
          payload = { description: description, permission_ids: permIds };
          API.put('/api/roles/' + id, payload).then(function () {
            if (typeof $ !== 'undefined') $('#role-form-modal').modal('hide'); else { roleEl('#role-form-modal').style.display = 'none'; roleEl('#role-form-modal').classList.remove('show'); }
            showAlert('Perfil atualizado.');
            loadRoles();
          }).catch(function (e) { errEl.textContent = (e.data && e.data.error) || 'Erro ao atualizar.'; errEl.style.display = 'block'; });
        } else {
          API.post('/api/roles', payload).then(function () {
            if (typeof $ !== 'undefined') $('#role-form-modal').modal('hide'); else { roleEl('#role-form-modal').style.display = 'none'; roleEl('#role-form-modal').classList.remove('show'); }
            showAlert('Perfil criado.');
            loadRoles();
          }).catch(function (e) { errEl.textContent = (e.data && e.data.error) || 'Erro ao criar.'; errEl.style.display = 'block'; });
        }
      });

      container.querySelectorAll('.role-edit-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var id = parseInt(btn.getAttribute('data-id'), 10);
          API.get('/api/roles/' + id).then(openEditModal).catch(function (e) { showAlert(e.data && e.data.error || 'Erro ao carregar perfil', true); });
        });
      });
    }).catch(function () {
      container.innerHTML = '<div class="alert alert-danger">Erro ao carregar perfis.</div>';
    });
  }

  function apikeys(container) {
    var STORAGE_PREFIX = 'drgbr_apikey_';
    container.innerHTML = '<div class="text-center py-4"><i class="fas fa-spinner fa-spin fa-2x"></i></div>';
    API.get('/api/keys').then(function (list) {
      list = Array.isArray(list) ? list : [];
      var rows = list.map(function (k) {
        var limit = k.limit_value || 0;
        var used = k.usage_count || 0;
        var pct = limit === 0 ? 0 : Math.min(100, Math.round((used / limit) * 100));
        var quotaBadge = limit === 0 ? '<span class="badge badge-success">Ilimitado</span>' : '<span class="badge badge-primary">' + limit + '</span>';
        return '<tr data-key-id="' + k.id + '">' +
          '<td>' + esc(k.name || '-') + '</td>' +
          '<td class="small font-monospace">' + esc(k.key || '-') + '</td>' +
          '<td>' + quotaBadge + '</td>' +
          '<td class="small">' + used + (limit > 0 ? ' <div class="progress progress-sm d-inline-block ml-1" style="width:50px;height:6px"><div class="progress-bar ' + (pct > 80 ? 'bg-danger' : 'bg-success') + '" style="width:' + pct + '%"></div></div>' : '') + '</td>' +
          '<td class="small">' + (k.created_at ? new Date(k.created_at).toLocaleDateString('pt-BR') : '-') + '</td>' +
          '<td class="small">' + (k.last_used_at ? new Date(k.last_used_at).toLocaleString('pt-BR') : 'Nunca') + '</td>' +
          '<td><button type="button" class="btn btn-sm btn-outline-danger key-delete-btn" data-id="' + k.id + '" data-name="' + esc(k.name || '') + '"><i class="fas fa-trash"></i></button></td></tr>';
      }).join('');

      container.innerHTML =
        '<div id="apikeys-alert"></div>' +
        '<div class="card"><div class="card-header d-flex justify-content-between align-items-center">' +
        '<strong>Chaves API</strong>' +
        '<button type="button" class="btn btn-primary btn-sm" id="key-new-btn"><i class="fas fa-plus mr-1"></i> Nova chave</button>' +
        '</div><div class="card-body">' +
        '<div class="table-responsive"><table class="table table-hover"><thead><tr><th>Nome</th><th>Hash</th><th>Quota/dia</th><th>Uso hoje</th><th>Criada</th><th>Último uso</th><th>Ações</th></tr></thead><tbody id="apikeys-tbody">' +
        (rows || '<tr><td colspan="7" class="text-muted">Nenhuma chave. Clique em Nova chave.</td></tr>') +
        '</tbody></table></div></div></div>' +

        '<div class="modal fade" id="key-create-modal" tabindex="-1"><div class="modal-dialog"><div class="modal-content">' +
        '<div class="modal-header"><h5 class="modal-title">Nova chave API</h5><button type="button" class="close" data-dismiss="modal"><span>&times;</span></button></div>' +
        '<div class="modal-body">' +
        '<div id="key-form-error" class="alert alert-danger" style="display:none;"></div>' +
        '<form id="key-form">' +
        '<div class="form-group"><label>Nome</label><input type="text" class="form-control" id="key-name" placeholder="Ex: Integração Hospital X"></div>' +
        '<div class="form-group"><label>Quota diária</label><input type="number" class="form-control" id="key-quota" min="0" value="1000" placeholder="0 = ilimitado"><small class="form-text text-muted">0 = ilimitado. Máximo de requisições por dia.</small></div>' +
        '</form></div>' +
        '<div class="modal-footer"><button type="button" class="btn btn-secondary" data-dismiss="modal">Cancelar</button><button type="button" class="btn btn-primary" id="key-create-submit">Criar</button></div>' +
        '</div></div></div>' +

        '<div class="modal fade" id="key-show-modal" tabindex="-1"><div class="modal-dialog"><div class="modal-content">' +
        '<div class="modal-header"><h5 class="modal-title">Chave criada</h5><button type="button" class="close" data-dismiss="modal"><span>&times;</span></button></div>' +
        '<div class="modal-body">' +
        '<div class="alert alert-warning">Guarde esta chave em local seguro. Ela <strong>não será exibida novamente</strong>.</div>' +
        '<div class="p-3 bg-light rounded mb-2"><code id="key-plain-value" class="d-block text-break small"></code></div>' +
        '<button type="button" class="btn btn-primary btn-sm" id="key-copy-btn"><i class="fas fa-copy mr-1"></i> Copiar chave</button>' +
        '</div><div class="modal-footer"><button type="button" class="btn btn-secondary" data-dismiss="modal">Fechar</button></div>' +
        '</div></div></div>' +

        '<div class="modal fade" id="key-delete-modal" tabindex="-1"><div class="modal-dialog"><div class="modal-content">' +
        '<div class="modal-header"><h5 class="modal-title">Excluir chave</h5><button type="button" class="close" data-dismiss="modal"><span>&times;</span></button></div>' +
        '<div class="modal-body"><p>Tem certeza que deseja excluir a chave <strong id="key-delete-name"></strong>?</p><p class="text-danger small">Sistemas que usam esta chave perderão o acesso.</p></div>' +
        '<div class="modal-footer"><button type="button" class="btn btn-secondary" data-dismiss="modal">Cancelar</button><button type="button" class="btn btn-danger" id="key-delete-confirm">Excluir</button></div>' +
        '</div></div></div>';

      function showAlert(msg, isError) {
        var el = container.querySelector('#apikeys-alert');
        if (!el) return;
        el.innerHTML = '<div class="alert alert-' + (isError ? 'danger' : 'success') + ' alert-dismissible"><button type="button" class="close" data-dismiss="alert"><span>&times;</span></button>' + esc(msg) + '</div>';
        setTimeout(function () { el.innerHTML = ''; }, 5000);
      }

      function keyEl(selector) {
        return container.querySelector(selector);
      }

      function openCreateModal() {
        keyEl('#key-name').value = '';
        keyEl('#key-quota').value = '1000';
        keyEl('#key-form-error').style.display = 'none';
        if (typeof $ !== 'undefined') $('#key-create-modal').modal('show'); else { keyEl('#key-create-modal').style.display = 'block'; keyEl('#key-create-modal').classList.add('show'); }
      }

      function loadKeys() {
        API.get('/api/keys').then(function (list) {
          list = Array.isArray(list) ? list : [];
          var tbody = container.querySelector('#apikeys-tbody');
          if (!tbody) return;
          var rows = list.map(function (k) {
            var limit = k.limit_value || 0;
            var used = k.usage_count || 0;
            var pct = limit === 0 ? 0 : Math.min(100, Math.round((used / limit) * 100));
            var quotaBadge = limit === 0 ? '<span class="badge badge-success">Ilimitado</span>' : '<span class="badge badge-primary">' + limit + '</span>';
            return '<tr data-key-id="' + k.id + '">' +
              '<td>' + esc(k.name || '-') + '</td><td class="small font-monospace">' + esc(k.key || '-') + '</td><td>' + quotaBadge + '</td>' +
              '<td class="small">' + used + (limit > 0 ? ' <div class="progress progress-sm d-inline-block ml-1" style="width:50px;height:6px"><div class="progress-bar ' + (pct > 80 ? 'bg-danger' : 'bg-success') + '" style="width:' + pct + '%"></div></div>' : '') + '</td>' +
              '<td class="small">' + (k.created_at ? new Date(k.created_at).toLocaleDateString('pt-BR') : '-') + '</td>' +
              '<td class="small">' + (k.last_used_at ? new Date(k.last_used_at).toLocaleString('pt-BR') : 'Nunca') + '</td>' +
              '<td><button type="button" class="btn btn-sm btn-outline-danger key-delete-btn" data-id="' + k.id + '" data-name="' + esc(k.name || '') + '"><i class="fas fa-trash"></i></button></td></tr>';
          }).join('');
          tbody.innerHTML = rows || '<tr><td colspan="7" class="text-muted">Nenhuma chave.</td></tr>';
          container.querySelectorAll('.key-delete-btn').forEach(function (btn) {
            btn.addEventListener('click', function () {
              keyEl('#key-delete-name').textContent = btn.getAttribute('data-name') || ('#' + btn.getAttribute('data-id'));
              keyEl('#key-delete-confirm').setAttribute('data-id', btn.getAttribute('data-id'));
              if (typeof $ !== 'undefined') $('#key-delete-modal').modal('show'); else { keyEl('#key-delete-modal').style.display = 'block'; keyEl('#key-delete-modal').classList.add('show'); }
            });
          });
        });
      }

      container.querySelector('#key-new-btn').addEventListener('click', openCreateModal);

      container.querySelector('#key-create-submit').addEventListener('click', function () {
        var name = keyEl('#key-name').value.trim();
        var quota = parseInt(keyEl('#key-quota').value, 10);
        if (isNaN(quota) || quota < 0) quota = 1000;
        var errEl = keyEl('#key-form-error');
        errEl.style.display = 'none';
        var payload = { limit_value: quota };
        if (name) payload.name = name;
        API.post('/api/keys', payload).then(function (res) {
          if (typeof $ !== 'undefined') $('#key-create-modal').modal('hide'); else { keyEl('#key-create-modal').style.display = 'none'; keyEl('#key-create-modal').classList.remove('show'); }
          var apiKey = res.api_key;
          var plainKey = apiKey && apiKey.key ? apiKey.key : '';
          if (apiKey && apiKey.id && plainKey) {
            try { localStorage.setItem(STORAGE_PREFIX + apiKey.id, plainKey); } catch (_) {}
          }
          keyEl('#key-plain-value').textContent = plainKey;
          if (typeof $ !== 'undefined') $('#key-show-modal').modal('show'); else { keyEl('#key-show-modal').style.display = 'block'; keyEl('#key-show-modal').classList.add('show'); }
          showAlert('Chave criada. Guarde-a em local seguro.');
          loadKeys();
        }).catch(function (e) {
          errEl.textContent = (e.data && e.data.error) || 'Erro ao criar chave.';
          errEl.style.display = 'block';
        });
      });

      container.querySelector('#key-copy-btn').addEventListener('click', function () {
        var code = keyEl('#key-plain-value');
        var text = code && code.textContent ? code.textContent : '';
        if (!text) return;
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(function () { showAlert('Chave copiada.'); }).catch(function () {
            var ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); showAlert('Chave copiada.');
          });
        } else {
          var ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
          showAlert('Chave copiada.');
        }
      });

      container.querySelector('#key-delete-confirm').addEventListener('click', function () {
        var id = this.getAttribute('data-id');
        if (!id) return;
        API.delete('/api/keys/' + id).then(function () {
          try { localStorage.removeItem(STORAGE_PREFIX + id); } catch (_) {}
          if (typeof $ !== 'undefined') $('#key-delete-modal').modal('hide'); else { keyEl('#key-delete-modal').style.display = 'none'; keyEl('#key-delete-modal').classList.remove('show'); }
          showAlert('Chave excluída.');
          loadKeys();
        }).catch(function (e) { showAlert((e.data && e.data.error) || 'Erro ao excluir.', true); });
      });

      container.querySelectorAll('.key-delete-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
          keyEl('#key-delete-name').textContent = btn.getAttribute('data-name') || ('#' + btn.getAttribute('data-id'));
          keyEl('#key-delete-confirm').setAttribute('data-id', btn.getAttribute('data-id'));
          if (typeof $ !== 'undefined') $('#key-delete-modal').modal('show'); else { keyEl('#key-delete-modal').style.display = 'block'; keyEl('#key-delete-modal').classList.add('show'); }
        });
      });
    }).catch(function () {
      container.innerHTML = '<div class="alert alert-danger">Erro ao carregar chaves.</div>';
    });
  }

  function extraction(container) {
    var SOURCES = [
      { id: 'sih', label: 'SIH (Sistema de Informações Hospitalares)' },
      { id: 'cid10', label: 'CID-10 (Classificação Internacional de Doenças)' },
      { id: 'sigtap', label: 'SIGTAP (Tabela de Procedimentos do SUS)' },
      { id: 'cc_mcc', label: 'CC/MCC (Complicações e Comorbidades)' }
    ];
    var STATES = ['AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO'];

    function statusBadge(st) {
      if (st === 'success') return '<span class="badge badge-success">Concluído</span>';
      if (st === 'running') return '<span class="badge badge-warning">Executando</span>';
      if (st === 'pending') return '<span class="badge badge-info">Pendente</span>';
      if (st === 'failed') return '<span class="badge badge-danger">Falhou</span>';
      return '<span class="badge badge-secondary">' + esc(st) + '</span>';
    }

    container.innerHTML = '<div class="text-center py-4"><i class="fas fa-spinner fa-spin fa-2x"></i></div>';
    API.get('/api/extract').then(function (list) {
      list = Array.isArray(list) ? list : [];
      var rows = list.map(function (j) {
        var sourcesStr = Array.isArray(j.sources) ? j.sources.join(', ') : '-';
        return '<tr data-job-id="' + j.id + '">' +
          '<td>#' + esc(j.id) + '</td><td>' + statusBadge(j.status) + '</td><td class="small">' + esc(sourcesStr) + '</td>' +
          '<td class="small">' + (j.started_at ? new Date(j.started_at).toLocaleString('pt-BR') : '-') + '</td>' +
          '<td class="small">' + (j.finished_at ? new Date(j.finished_at).toLocaleString('pt-BR') : '-') + '</td>' +
          '<td class="small text-truncate" style="max-width:180px">' + esc(j.message || '-') + '</td>' +
          '<td><button type="button" class="btn btn-sm btn-outline-info extract-detail-btn" data-id="' + j.id + '"><i class="fas fa-info-circle"></i></button></td></tr>';
      }).join('');

      container.innerHTML =
        '<div id="extract-alert"></div>' +
        '<div class="card"><div class="card-header d-flex justify-content-between align-items-center">' +
        '<strong>Extração de Dados</strong>' +
        '<button type="button" class="btn btn-primary btn-sm" id="extract-new-btn"><i class="fas fa-plus mr-1"></i> Nova extração</button>' +
        '</div><div class="card-body">' +
        '<p class="text-muted small">Extraia dados do SIH-SUS, CID-10, SIGTAP e CC/MCC para o banco local. Selecione fontes, estados e anos no formulário.</p>' +
        '<div class="table-responsive"><table class="table table-hover"><thead><tr><th>ID</th><th>Status</th><th>Fontes</th><th>Início</th><th>Fim</th><th>Mensagem</th><th>Ações</th></tr></thead><tbody id="extract-tbody">' +
        (rows || '<tr><td colspan="7" class="text-muted">Nenhuma extração. Clique em Nova extração.</td></tr>') +
        '</tbody></table></div></div></div>' +

        '<div class="modal fade" id="extract-form-modal" tabindex="-1"><div class="modal-dialog modal-lg"><div class="modal-content">' +
        '<div class="modal-header"><h5 class="modal-title">Nova extração</h5><button type="button" class="close" data-dismiss="modal"><span>&times;</span></button></div>' +
        '<div class="modal-body">' +
        '<div id="extract-form-error" class="alert alert-danger" style="display:none;"></div>' +
        '<div class="form-group"><label class="font-weight-bold">Fontes de dados</label><div id="extract-sources"></div></div>' +
        '<div class="row"><div class="col-md-6 form-group"><label class="font-weight-bold">Ano início</label><input type="number" class="form-control" id="extract-year-start" min="2008" max="2030" value="2023"></div>' +
        '<div class="col-md-6 form-group"><label class="font-weight-bold">Ano fim</label><input type="number" class="form-control" id="extract-year-end" min="2008" max="2030" value="2024"></div></div>' +
        '<div class="form-group"><label class="font-weight-bold">Estados (UF)</label><div class="mb-2"><button type="button" class="btn btn-sm btn-link p-0 mr-3" id="extract-states-all">Selecionar todos</button><button type="button" class="btn btn-sm btn-link p-0 text-danger" id="extract-states-clear">Limpar</button></div><div id="extract-states" class="d-flex flex-wrap"></div><small class="text-muted" id="extract-states-count">0 estado(s) selecionado(s)</small></div>' +
        '</div><div class="modal-footer"><button type="button" class="btn btn-secondary" data-dismiss="modal">Cancelar</button><button type="button" class="btn btn-primary" id="extract-submit">Iniciar extração</button></div>' +
        '</div></div></div>' +

        '<div class="modal fade" id="extract-detail-modal" tabindex="-1"><div class="modal-dialog modal-lg"><div class="modal-content">' +
        '<div class="modal-header"><h5 class="modal-title">Detalhes da extração</h5><button type="button" class="close" data-dismiss="modal"><span>&times;</span></button></div>' +
        '<div class="modal-body" id="extract-detail-body"><div class="text-center py-3"><i class="fas fa-spinner fa-spin"></i></div></div>' +
        '<div class="modal-footer"><button type="button" class="btn btn-secondary" data-dismiss="modal">Fechar</button></div>' +
        '</div></div></div>';

      var sourcesContainer = container.querySelector('#extract-sources');
      SOURCES.forEach(function (s) {
        var div = document.createElement('div');
        div.className = 'custom-control custom-checkbox';
        div.innerHTML = '<input type="checkbox" class="custom-control-input" id="ext-src-' + s.id + '" value="' + esc(s.id) + '"><label class="custom-control-label" for="ext-src-' + s.id + '">' + esc(s.label) + '</label>';
        sourcesContainer.appendChild(div);
      });

      var statesContainer = container.querySelector('#extract-states');
      var selectedStates = ['SP'];
      function renderStates() {
        statesContainer.innerHTML = '';
        STATES.forEach(function (uf) {
          var btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'btn btn-sm mr-1 mb-1 ' + (selectedStates.indexOf(uf) !== -1 ? 'btn-primary' : 'btn-outline-secondary');
          btn.textContent = uf;
          btn.addEventListener('click', function () {
            var i = selectedStates.indexOf(uf);
            if (i === -1) selectedStates.push(uf);
            else selectedStates.splice(i, 1);
            renderStates();
          });
          statesContainer.appendChild(btn);
        });
        container.querySelector('#extract-states-count').textContent = selectedStates.length + ' estado(s) selecionado(s)';
      }
      renderStates();
      container.querySelector('#extract-states-all').addEventListener('click', function () { selectedStates = STATES.slice(); renderStates(); });
      container.querySelector('#extract-states-clear').addEventListener('click', function () { selectedStates = []; renderStates(); });

      function showAlert(msg, isError) {
        var el = container.querySelector('#extract-alert');
        if (!el) return;
        el.innerHTML = '<div class="alert alert-' + (isError ? 'danger' : 'success') + ' alert-dismissible"><button type="button" class="close" data-dismiss="alert"><span>&times;</span></button>' + esc(msg) + '</div>';
        setTimeout(function () { el.innerHTML = ''; }, 6000);
      }

      function loadJobs() {
        API.get('/api/extract').then(function (list) {
          list = Array.isArray(list) ? list : [];
          var tbody = container.querySelector('#extract-tbody');
          if (!tbody) return;
          var rows = list.map(function (j) {
            var sourcesStr = Array.isArray(j.sources) ? j.sources.join(', ') : '-';
            return '<tr data-job-id="' + j.id + '">' +
              '<td>#' + esc(j.id) + '</td><td>' + statusBadge(j.status) + '</td><td class="small">' + esc(sourcesStr) + '</td>' +
              '<td class="small">' + (j.started_at ? new Date(j.started_at).toLocaleString('pt-BR') : '-') + '</td>' +
              '<td class="small">' + (j.finished_at ? new Date(j.finished_at).toLocaleString('pt-BR') : '-') + '</td>' +
              '<td class="small text-truncate" style="max-width:180px">' + esc(j.message || '-') + '</td>' +
              '<td><button type="button" class="btn btn-sm btn-outline-info extract-detail-btn" data-id="' + j.id + '"><i class="fas fa-info-circle"></i></button></td></tr>';
          }).join('');
          tbody.innerHTML = rows || '<tr><td colspan="7" class="text-muted">Nenhuma extração.</td></tr>';
          container.querySelectorAll('.extract-detail-btn').forEach(function (btn) {
            btn.addEventListener('click', function () {
              var id = btn.getAttribute('data-id');
              container.querySelector('#extract-detail-body').innerHTML = '<div class="text-center py-3"><i class="fas fa-spinner fa-spin"></i></div>';
              if (typeof $ !== 'undefined') $('#extract-detail-modal').modal('show');
              API.get('/api/extract/' + id).then(function (job) {
                var paramsStr = job.params ? JSON.stringify(job.params, null, 2) : '—';
                container.querySelector('#extract-detail-body').innerHTML =
                  '<table class="table table-bordered table-sm"><tbody>' +
                  '<tr><td class="bg-light" style="width:30%">Status</td><td>' + statusBadge(job.status) + '</td></tr>' +
                  '<tr><td class="bg-light">Fontes</td><td>' + esc(Array.isArray(job.sources) ? job.sources.join(', ') : '-') + '</td></tr>' +
                  '<tr><td class="bg-light">Parâmetros</td><td><pre class="mb-0 small">' + esc(paramsStr) + '</pre></td></tr>' +
                  '<tr><td class="bg-light">Criado em</td><td>' + (job.created_at ? new Date(job.created_at).toLocaleString('pt-BR') : '-') + '</td></tr>' +
                  '<tr><td class="bg-light">Iniciado em</td><td>' + (job.started_at ? new Date(job.started_at).toLocaleString('pt-BR') : '-') + '</td></tr>' +
                  '<tr><td class="bg-light">Finalizado em</td><td>' + (job.finished_at ? new Date(job.finished_at).toLocaleString('pt-BR') : '-') + '</td></tr>' +
                  '<tr><td class="bg-light">Mensagem</td><td>' + esc(job.message || '-') + '</td></tr></tbody></table>';
              }).catch(function () {
                container.querySelector('#extract-detail-body').innerHTML = '<div class="alert alert-danger">Erro ao carregar detalhes.</div>';
              });
            });
          });
        });
      }

      container.querySelector('#extract-new-btn').addEventListener('click', function () {
        container.querySelectorAll('#extract-form-modal input[type="checkbox"]').forEach(function (cb) { cb.checked = cb.value === 'sih' || cb.value === 'cid10' || cb.value === 'sigtap' || cb.value === 'cc_mcc'; });
        container.querySelector('#extract-year-start').value = '2023';
        container.querySelector('#extract-year-end').value = '2024';
        selectedStates = ['SP'];
        renderStates();
        container.querySelector('#extract-form-error').style.display = 'none';
        if (typeof $ !== 'undefined') $('#extract-form-modal').modal('show');
      });

      container.querySelector('#extract-submit').addEventListener('click', function () {
        var yearStart = parseInt(container.querySelector('#extract-year-start').value, 10) || 2023;
        var yearEnd = parseInt(container.querySelector('#extract-year-end').value, 10) || 2024;
        var sources = [];
        container.querySelectorAll('#extract-sources input:checked').forEach(function (cb) { sources.push(cb.value); });
        var errEl = container.querySelector('#extract-form-error');
        errEl.style.display = 'none';
        if (sources.length === 0) { errEl.textContent = 'Selecione pelo menos uma fonte.'; errEl.style.display = 'block'; return; }
        if (selectedStates.length === 0) { errEl.textContent = 'Selecione pelo menos um estado.'; errEl.style.display = 'block'; return; }
        var years = [];
        for (var y = yearStart; y <= yearEnd; y++) years.push(y);
        var payload = { sources: sources, states: selectedStates, years: years };
        container.querySelector('#extract-submit').disabled = true;
        API.post('/api/extract', payload).then(function () {
          if (typeof $ !== 'undefined') $('#extract-form-modal').modal('hide');
          showAlert('Extração iniciada. Acompanhe o status na tabela.');
          loadJobs();
        }).catch(function (e) {
          errEl.textContent = (e.data && e.data.error) || 'Erro ao iniciar extração.';
          errEl.style.display = 'block';
        }).finally(function () {
          container.querySelector('#extract-submit').disabled = false;
        });
      });

      container.querySelectorAll('.extract-detail-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var id = btn.getAttribute('data-id');
          container.querySelector('#extract-detail-body').innerHTML = '<div class="text-center py-3"><i class="fas fa-spinner fa-spin"></i></div>';
          if (typeof $ !== 'undefined') $('#extract-detail-modal').modal('show');
          API.get('/api/extract/' + id).then(function (job) {
            var paramsStr = job.params ? JSON.stringify(job.params, null, 2) : '—';
            container.querySelector('#extract-detail-body').innerHTML =
              '<table class="table table-bordered table-sm"><tbody>' +
              '<tr><td class="bg-light" style="width:30%">Status</td><td>' + statusBadge(job.status) + '</td></tr>' +
              '<tr><td class="bg-light">Fontes</td><td>' + esc(Array.isArray(job.sources) ? job.sources.join(', ') : '-') + '</td></tr>' +
              '<tr><td class="bg-light">Parâmetros</td><td><pre class="mb-0 small">' + esc(paramsStr) + '</pre></td></tr>' +
              '<tr><td class="bg-light">Criado em</td><td>' + (job.created_at ? new Date(job.created_at).toLocaleString('pt-BR') : '-') + '</td></tr>' +
              '<tr><td class="bg-light">Iniciado em</td><td>' + (job.started_at ? new Date(job.started_at).toLocaleString('pt-BR') : '-') + '</td></tr>' +
              '<tr><td class="bg-light">Finalizado em</td><td>' + (job.finished_at ? new Date(job.finished_at).toLocaleString('pt-BR') : '-') + '</td></tr>' +
              '<tr><td class="bg-light">Mensagem</td><td>' + esc(job.message || '-') + '</td></tr></tbody></table>';
          }).catch(function () {
            container.querySelector('#extract-detail-body').innerHTML = '<div class="alert alert-danger">Erro ao carregar detalhes.</div>';
          });
        });
      });
    }).catch(function () {
      container.innerHTML = '<div class="alert alert-danger">Erro ao carregar extrações.</div>';
    });
  }

  function training(container) {
    function trainStatusBadge(st) {
      if (st === 'success') return '<span class="badge badge-success">Concluído</span>';
      if (st === 'running') return '<span class="badge badge-warning">Executando</span>';
      if (st === 'pending') return '<span class="badge badge-info">Pendente</span>';
      if (st === 'failed') return '<span class="badge badge-danger">Falhou</span>';
      return '<span class="badge badge-secondary">' + esc(st) + '</span>';
    }

    function paramsSummary(params) {
      if (!params) return '-';
      var p = [];
      if (params.epochs) p.push(params.epochs + ' épocas');
      if (params.limit) p.push('limit: ' + params.limit);
      if (params.model_name) p.push(params.model_name);
      if (params.set_as_default) p.push('padrão');
      return p.length ? p.join(', ') : '-';
    }

    container.innerHTML = '<div class="text-center py-4"><i class="fas fa-spinner fa-spin fa-2x"></i></div>';
    Promise.all([
      API.get('/api/train').catch(function () { return []; }),
      API.get('/api/train/models').catch(function () { return []; })
    ]).then(function (results) {
      var jobs = Array.isArray(results[0]) ? results[0] : [];
      var models = Array.isArray(results[1]) ? results[1] : [];
      var modelById = {};
      models.forEach(function (m) { modelById[m.id] = m; });

      var modelRows = models.map(function (m) {
        var defaultBtn = m.is_default
          ? '<span class="badge badge-success">Padrão</span>'
          : '<button type="button" class="btn btn-sm btn-outline-primary set-default-model-btn" data-id="' + m.id + '"><i class="fas fa-check mr-1"></i> Definir como padrão</button>';
        return '<tr><td>#' + m.id + '</td><td>' + esc(m.name || '-') + '</td><td class="small">' + (m.is_default ? '<span class="badge badge-success">Sim</span>' : 'Não') + '</td><td class="small font-monospace">' + esc(m.path || '-') + '</td><td class="small">' + (m.created_at ? new Date(m.created_at).toLocaleString('pt-BR') : '-') + '</td><td>' + defaultBtn + '</td></tr>';
      }).join('');

      var jobRows = jobs.map(function (j) {
        var modelName = j.model_id && modelById[j.model_id] ? modelById[j.model_id].name : (j.model_id ? '#' + j.model_id : '-');
        return '<tr data-job-id="' + j.id + '">' +
          '<td>#' + j.id + '</td><td>' + trainStatusBadge(j.status) + '</td>' +
          '<td class="small">' + esc(paramsSummary(j.params)) + '</td><td class="small">' + esc(modelName) + '</td>' +
          '<td class="small">' + (j.started_at ? new Date(j.started_at).toLocaleString('pt-BR') : '-') + '</td>' +
          '<td class="small">' + (j.finished_at ? new Date(j.finished_at).toLocaleString('pt-BR') : '-') + '</td>' +
          '<td class="small text-truncate" style="max-width:150px">' + esc(j.message || '-') + '</td>' +
          '<td><button type="button" class="btn btn-sm btn-outline-info train-detail-btn" data-id="' + j.id + '"><i class="fas fa-info-circle"></i></button></td></tr>';
      }).join('');

      container.innerHTML =
        '<div id="train-alert"></div>' +
        '<div class="card mb-4"><div class="card-header"><i class="fas fa-cube mr-2"></i><strong>Modelos treinados</strong></div><div class="card-body">' +
        '<div class="table-responsive"><table class="table table-hover mb-0"><thead><tr><th>ID</th><th>Nome</th><th>Padrão</th><th>Caminho</th><th>Criado</th><th>Ação</th></tr></thead><tbody id="train-models-tbody">' +
        (modelRows || '<tr><td colspan="6" class="text-muted">Nenhum modelo.</td></tr>') +
        '</tbody></table></div></div></div>' +

        '<div class="card"><div class="card-header d-flex justify-content-between align-items-center">' +
        '<strong>Treinamentos</strong>' +
        '<button type="button" class="btn btn-primary btn-sm" id="train-new-btn"><i class="fas fa-plus mr-1"></i> Novo treinamento</button>' +
        '</div><div class="card-body">' +
        '<p class="text-muted small">Ajuste épocas, limite de amostras e nome do modelo. O modelo padrão é usado nas predições quando não especificado.</p>' +
        '<div class="table-responsive"><table class="table table-hover"><thead><tr><th>ID</th><th>Status</th><th>Parâmetros</th><th>Modelo</th><th>Início</th><th>Fim</th><th>Mensagem</th><th>Ações</th></tr></thead><tbody id="train-tbody">' +
        (jobRows || '<tr><td colspan="8" class="text-muted">Nenhum treinamento.</td></tr>') +
        '</tbody></table></div></div></div>' +

        '<div class="modal fade" id="train-form-modal" tabindex="-1"><div class="modal-dialog"><div class="modal-content">' +
        '<div class="modal-header"><h5 class="modal-title">Novo treinamento</h5><button type="button" class="close" data-dismiss="modal"><span>&times;</span></button></div>' +
        '<div class="modal-body">' +
        '<div id="train-form-error" class="alert alert-danger" style="display:none;"></div>' +
        '<div class="form-group"><label class="font-weight-bold">Nome do modelo</label><input type="text" class="form-control" id="train-model-name" placeholder="Ex: modelo_producao_2025"><small class="form-text text-muted">Opcional. Se vazio, será gerado (ex: model_20250101_120000).</small></div>' +
        '<div class="form-group"><div class="custom-control custom-checkbox"><input type="checkbox" class="custom-control-input" id="train-set-default"><label class="custom-control-label" for="train-set-default">Definir como modelo padrão após o treinamento</label></div><small class="form-text text-muted">O modelo padrão será usado nas predições quando nenhum outro for especificado.</small></div>' +
        '<div class="form-group"><label class="font-weight-bold">Épocas</label><input type="number" class="form-control" id="train-epochs" min="1" max="1000" value="60"><small class="form-text text-muted">Número de épocas de treinamento.</small></div>' +
        '<div class="form-group"><label class="font-weight-bold">Limite de amostras</label><input type="number" class="form-control" id="train-limit" min="0" value="0"><small class="form-text text-muted">0 = usar todas as amostras disponíveis. Use um valor para limitar (útil para testes rápidos).</small></div>' +
        '</div><div class="modal-footer"><button type="button" class="btn btn-secondary" data-dismiss="modal">Cancelar</button><button type="button" class="btn btn-primary" id="train-submit">Iniciar treinamento</button></div>' +
        '</div></div></div>' +

        '<div class="modal fade" id="train-detail-modal" tabindex="-1"><div class="modal-dialog modal-lg"><div class="modal-content">' +
        '<div class="modal-header"><h5 class="modal-title">Detalhes do treinamento</h5><button type="button" class="close" data-dismiss="modal"><span>&times;</span></button></div>' +
        '<div class="modal-body" id="train-detail-body"></div>' +
        '<div class="modal-footer"><button type="button" class="btn btn-secondary" data-dismiss="modal">Fechar</button></div>' +
        '</div></div></div>';

      function showAlert(msg, isError) {
        var el = container.querySelector('#train-alert');
        if (!el) return;
        el.innerHTML = '<div class="alert alert-' + (isError ? 'danger' : 'success') + ' alert-dismissible"><button type="button" class="close" data-dismiss="alert"><span>&times;</span></button>' + esc(msg) + '</div>';
        setTimeout(function () { el.innerHTML = ''; }, 6000);
      }

      function trainEl(selector) { return container.querySelector(selector); }

      function loadTraining() {
        Promise.all([API.get('/api/train').catch(function () { return []; }), API.get('/api/train/models').catch(function () { return []; })]).then(function (res) {
          var jobs = Array.isArray(res[0]) ? res[0] : [];
          var models = Array.isArray(res[1]) ? res[1] : [];
          var modelById = {};
          models.forEach(function (m) { modelById[m.id] = m; });

          var modelRows = models.map(function (m) {
            var defaultBtn = m.is_default
              ? '<span class="badge badge-success">Padrão</span>'
              : '<button type="button" class="btn btn-sm btn-outline-primary set-default-model-btn" data-id="' + m.id + '"><i class="fas fa-check mr-1"></i> Definir como padrão</button>';
            return '<tr><td>#' + m.id + '</td><td>' + esc(m.name || '-') + '</td><td class="small">' + (m.is_default ? 'Sim' : 'Não') + '</td><td class="small font-monospace">' + esc(m.path || '-') + '</td><td class="small">' + (m.created_at ? new Date(m.created_at).toLocaleString('pt-BR') : '-') + '</td><td>' + defaultBtn + '</td></tr>';
          }).join('');
          var tbodyModels = container.querySelector('#train-models-tbody');
          if (tbodyModels) tbodyModels.innerHTML = modelRows || '<tr><td colspan="6" class="text-muted">Nenhum modelo.</td></tr>';

          var jobRows = jobs.map(function (j) {
            var modelName = j.model_id && modelById[j.model_id] ? modelById[j.model_id].name : (j.model_id ? '#' + j.model_id : '-');
            return '<tr><td>#' + j.id + '</td><td>' + trainStatusBadge(j.status) + '</td><td class="small">' + esc(paramsSummary(j.params)) + '</td><td class="small">' + esc(modelName) + '</td><td class="small">' + (j.started_at ? new Date(j.started_at).toLocaleString('pt-BR') : '-') + '</td><td class="small">' + (j.finished_at ? new Date(j.finished_at).toLocaleString('pt-BR') : '-') + '</td><td class="small text-truncate" style="max-width:150px">' + esc(j.message || '-') + '</td><td><button type="button" class="btn btn-sm btn-outline-info train-detail-btn" data-id="' + j.id + '"><i class="fas fa-info-circle"></i></button></td></tr>';
          }).join('');
          var tbodyJobs = container.querySelector('#train-tbody');
          if (tbodyJobs) tbodyJobs.innerHTML = jobRows || '<tr><td colspan="8" class="text-muted">Nenhum treinamento.</td></tr>';

          container.querySelectorAll('.set-default-model-btn').forEach(function (btn) {
            btn.addEventListener('click', function () {
              var id = btn.getAttribute('data-id');
              API.put('/api/train/models/' + id, { is_default: true }).then(function () {
                showAlert('Modelo definido como padrão.');
                loadTraining();
              }).catch(function (e) { showAlert((e.data && e.data.error) || 'Erro ao definir padrão.', true); });
            });
          });
          container.querySelectorAll('.train-detail-btn').forEach(function (btn) {
            btn.addEventListener('click', function () {
              var id = btn.getAttribute('data-id');
              trainEl('#train-detail-body').innerHTML = '<div class="text-center py-3"><i class="fas fa-spinner fa-spin"></i></div>';
              if (typeof $ !== 'undefined') $('#train-detail-modal').modal('show');
              API.get('/api/train/' + id).then(function (job) {
                var paramsStr = job.params ? JSON.stringify(job.params, null, 2) : '—';
                var modelName = job.model_id && modelById[job.model_id] ? modelById[job.model_id].name : (job.model_id ? '#' + job.model_id : 'Nenhum');
                trainEl('#train-detail-body').innerHTML =
                  '<table class="table table-bordered table-sm"><tbody>' +
                  '<tr><td class="bg-light" style="width:30%">Status</td><td>' + trainStatusBadge(job.status) + '</td></tr>' +
                  '<tr><td class="bg-light">Parâmetros</td><td><pre class="mb-0 small">' + esc(paramsStr) + '</pre></td></tr>' +
                  '<tr><td class="bg-light">Modelo gerado</td><td>' + esc(modelName) + '</td></tr>' +
                  '<tr><td class="bg-light">Criado em</td><td>' + (job.created_at ? new Date(job.created_at).toLocaleString('pt-BR') : '-') + '</td></tr>' +
                  '<tr><td class="bg-light">Iniciado em</td><td>' + (job.started_at ? new Date(job.started_at).toLocaleString('pt-BR') : '-') + '</td></tr>' +
                  '<tr><td class="bg-light">Finalizado em</td><td>' + (job.finished_at ? new Date(job.finished_at).toLocaleString('pt-BR') : '-') + '</td></tr>' +
                  '<tr><td class="bg-light">Mensagem</td><td>' + esc(job.message || '-') + '</td></tr></tbody></table>';
              }).catch(function () {
                trainEl('#train-detail-body').innerHTML = '<div class="alert alert-danger">Erro ao carregar detalhes.</div>';
              });
            });
          });
        });
      }

      container.querySelector('#train-new-btn').addEventListener('click', function () {
        trainEl('#train-model-name').value = '';
        trainEl('#train-set-default').checked = false;
        trainEl('#train-epochs').value = '60';
        trainEl('#train-limit').value = '0';
        trainEl('#train-form-error').style.display = 'none';
        if (typeof $ !== 'undefined') $('#train-form-modal').modal('show');
      });

      container.querySelector('#train-submit').addEventListener('click', function () {
        var modelName = trainEl('#train-model-name').value.trim();
        var setAsDefault = trainEl('#train-set-default').checked;
        var epochs = parseInt(trainEl('#train-epochs').value, 10) || 60;
        var limit = parseInt(trainEl('#train-limit').value, 10) || 0;
        var errEl = trainEl('#train-form-error');
        errEl.style.display = 'none';
        if (epochs < 1 || epochs > 1000) { errEl.textContent = 'Épocas devem ser entre 1 e 1000.'; errEl.style.display = 'block'; return; }
        var payload = { epochs: epochs, limit: limit || undefined, model_name: modelName || undefined, set_as_default: setAsDefault };
        trainEl('#train-submit').disabled = true;
        API.post('/api/train', payload).then(function () {
          if (typeof $ !== 'undefined') $('#train-form-modal').modal('hide');
          showAlert('Treinamento iniciado. Acompanhe o status na tabela.');
          loadTraining();
        }).catch(function (e) {
          errEl.textContent = (e.data && e.data.error) || 'Erro ao iniciar treinamento.';
          errEl.style.display = 'block';
        }).finally(function () {
          trainEl('#train-submit').disabled = false;
        });
      });

      container.querySelectorAll('.set-default-model-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var id = btn.getAttribute('data-id');
          API.put('/api/train/models/' + id, { is_default: true }).then(function () {
            showAlert('Modelo definido como padrão.');
            loadTraining();
          }).catch(function (e) { showAlert((e.data && e.data.error) || 'Erro ao definir padrão.', true); });
        });
      });
      container.querySelectorAll('.train-detail-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var id = btn.getAttribute('data-id');
          trainEl('#train-detail-body').innerHTML = '<div class="text-center py-3"><i class="fas fa-spinner fa-spin"></i></div>';
          if (typeof $ !== 'undefined') $('#train-detail-modal').modal('show');
          API.get('/api/train/' + id).then(function (job) {
            var paramsStr = job.params ? JSON.stringify(job.params, null, 2) : '—';
            var modelName = job.model_id ? (modelById[job.model_id] ? modelById[job.model_id].name : '#' + job.model_id) : 'Nenhum';
            trainEl('#train-detail-body').innerHTML =
              '<table class="table table-bordered table-sm"><tbody>' +
              '<tr><td class="bg-light" style="width:30%">Status</td><td>' + trainStatusBadge(job.status) + '</td></tr>' +
              '<tr><td class="bg-light">Parâmetros</td><td><pre class="mb-0 small">' + esc(paramsStr) + '</pre></td></tr>' +
              '<tr><td class="bg-light">Modelo gerado</td><td>' + esc(modelName) + '</td></tr>' +
              '<tr><td class="bg-light">Criado em</td><td>' + (job.created_at ? new Date(job.created_at).toLocaleString('pt-BR') : '-') + '</td></tr>' +
              '<tr><td class="bg-light">Iniciado em</td><td>' + (job.started_at ? new Date(job.started_at).toLocaleString('pt-BR') : '-') + '</td></tr>' +
              '<tr><td class="bg-light">Finalizado em</td><td>' + (job.finished_at ? new Date(job.finished_at).toLocaleString('pt-BR') : '-') + '</td></tr>' +
              '<tr><td class="bg-light">Mensagem</td><td>' + esc(job.message || '-') + '</td></tr></tbody></table>';
          }).catch(function () {
            trainEl('#train-detail-body').innerHTML = '<div class="alert alert-danger">Erro ao carregar detalhes.</div>';
          });
        });
      });
    }).catch(function () {
      container.innerHTML = '<div class="alert alert-danger">Erro ao carregar treinamentos.</div>';
    });
  }

  function prediction(container) {
    function predictBaseUrl() {
      return typeof window.DRG_BASE_URL !== 'undefined' ? window.DRG_BASE_URL : '';
    }

    function requestPredict(apiKey, payload) {
      var url = predictBaseUrl() + '/api/v1/predict';
      var headers = { 'Content-Type': 'application/json', 'X-API-Key': apiKey };
      var token = window.DRG_AUTH && window.DRG_AUTH.getToken && window.DRG_AUTH.getToken();
      if (token) headers['Authorization'] = 'Bearer ' + token;
      return fetch(url, { method: 'POST', headers: headers, body: JSON.stringify(payload) })
        .then(function (res) {
          var ct = res.headers.get('Content-Type') || '';
          var data = ct.indexOf('application/json') !== -1 ? res.json() : res.text();
          return data.then(function (d) {
            if (!res.ok) {
              var err = new Error(d && (d.error || d.message) || res.statusText);
              err.status = res.status;
              err.data = d;
              throw err;
            }
            return d;
          });
        });
    }

    container.innerHTML = '<div class="text-center py-4"><i class="fas fa-spinner fa-spin fa-2x"></i></div>';
    API.get('/api/v1/models').then(function (models) {
      models = Array.isArray(models) ? models : [];
      var modelOptions = '<option value="">Modelo padrão</option>' + models.map(function (m) {
        return '<option value="' + m.id + '"' + (m.is_default ? ' selected' : '') + '>' + esc(m.name || 'Modelo #' + m.id) + (m.is_default ? ' (padrão)' : '') + '</option>';
      }).join('');

      container.innerHTML =
        '<div id="predict-alert"></div>' +

        '<div class="card mb-4"><div class="card-header"><i class="fas fa-cube mr-2"></i><strong>Modelos disponíveis</strong><a href="#/api-docs" class="btn btn-sm btn-outline-secondary ml-2"><i class="fas fa-book mr-1"></i>Documentação da API</a></div><div class="card-body">' +
        '<p class="text-muted small mb-2">O modelo marcado como padrão é usado quando nenhum modelo é escolhido na predição.</p>' +
        '<div class="table-responsive"><table class="table table-hover mb-0"><thead><tr><th>ID</th><th>Nome</th><th>Padrão</th><th>Caminho</th><th>Criado</th></tr></thead><tbody id="predict-models-tbody">' +
        (models.length ? models.map(function (m) {
          return '<tr><td>#' + m.id + '</td><td>' + esc(m.name || '-') + '</td><td>' + (m.is_default ? '<span class="badge badge-success">Sim</span>' : 'Não') + '</td><td class="small font-monospace">' + esc(m.path || '-') + '</td><td class="small">' + (m.created_at ? new Date(m.created_at).toLocaleString('pt-BR') : '-') + '</td></tr>';
        }).join('') : '<tr><td colspan="5" class="text-muted">Nenhum modelo. Treine um modelo na página Treinamento.</td></tr>') +
        '</tbody></table></div></div></div>' +

        '<div class="card"><div class="card-header"><i class="fas fa-calculator mr-2"></i><strong>Testar predição</strong></div><div class="card-body">' +
        '<p class="text-muted small mb-3">Preencha os campos e use uma chave API (crie em Chaves API se necessário; a chave é exibida apenas na criação).</p>' +
        '<div id="predict-form-error" class="alert alert-danger" style="display:none;"></div>' +
        '<div class="row">' +
        '<div class="col-md-6">' +
        '<div class="form-group"><label class="font-weight-bold">Chave API <span class="text-danger">*</span></label><input type="password" class="form-control" id="predict-api-key" placeholder="Cole a chave API" autocomplete="off"><small class="form-text text-muted">Obrigatório para enviar a predição.</small></div>' +
        '<div class="form-group"><label class="font-weight-bold">Modelo</label><select class="form-control" id="predict-model-id">' + modelOptions + '</select><small class="form-text text-muted">Opcional. Deixe em "Modelo padrão" para usar o modelo padrão.</small></div>' +
        '<div class="form-group"><label class="font-weight-bold">CID principal</label><input type="text" class="form-control" id="predict-cid" placeholder="Ex: J18.9" value="J189"></div>' +
        '<div class="form-group"><label class="font-weight-bold">CIDs secundários</label><input type="text" class="form-control" id="predict-cids-sec" placeholder="Ex: N18.3, E11.9 (separados por vírgula)"></div>' +
        '<div class="form-group"><label class="font-weight-bold">Procedimento SIGTAP</label><input type="text" class="form-control" id="predict-proc" placeholder="Código do procedimento"></div>' +
        '</div><div class="col-md-6">' +
        '<div class="form-group"><label class="font-weight-bold">Idade</label><input type="number" class="form-control" id="predict-idade" min="0" max="120" value="50"></div>' +
        '<div class="form-group"><label class="font-weight-bold">Sexo</label><select class="form-control" id="predict-sexo"><option value="0">Indefinido</option><option value="1">Masculino</option><option value="2">Feminino</option></select></div>' +
        '<div class="form-group"><label class="font-weight-bold">Urgência</label><select class="form-control" id="predict-urgencia"><option value="0">Eletivo</option><option value="1">Urgência</option></select></div>' +
        '<div class="form-group"><button type="button" class="btn btn-primary" id="predict-submit-btn"><i class="fas fa-play mr-1"></i> Prever</button> <button type="button" class="btn btn-outline-secondary" id="predict-clear-btn">Limpar resultado</button></div>' +
        '</div></div>' +
        '<hr><div id="predict-result-wrap" style="display:none;">' +
        '<h6 class="font-weight-bold mb-2">Resultado da predição</h6>' +
        '<div id="predict-result-body" class="p-3 bg-light rounded small"></div>' +
        '</div></div></div>';

      function showAlert(msg, isError) {
        var el = container.querySelector('#predict-alert');
        if (!el) return;
        el.innerHTML = '<div class="alert alert-' + (isError ? 'danger' : 'success') + ' alert-dismissible"><button type="button" class="close" data-dismiss="alert"><span>&times;</span></button>' + esc(msg) + '</div>';
        setTimeout(function () { el.innerHTML = ''; }, 6000);
      }

      function pe(sel) { return container.querySelector(sel); }

      function formatResult(data) {
        if (!data || typeof data !== 'object') return esc(JSON.stringify(data));
        var rows = [];
        if (data.drg_br_code != null) rows.push('<tr><td class="bg-light" style="width:35%">Código DRG-BR</td><td><strong>' + esc(String(data.drg_br_code)) + '</strong></td></tr>');
        if (data.mdc != null) rows.push('<tr><td class="bg-light">MDC</td><td>' + esc(String(data.mdc)) + '</td></tr>');
        if (data.mdc_title != null) rows.push('<tr><td class="bg-light">Título MDC</td><td>' + esc(data.mdc_title) + '</td></tr>');
        if (data.severity != null) rows.push('<tr><td class="bg-light">Severidade</td><td>' + esc(String(data.severity)) + '</td></tr>');
        if (data.is_surgical != null) rows.push('<tr><td class="bg-light">Cirúrgico</td><td>' + (data.is_surgical ? 'Sim' : 'Não') + '</td></tr>');
        if (data.los_aritmetico != null) rows.push('<tr><td class="bg-light">LOS (dias)</td><td>' + esc(String(data.los_aritmetico)) + '</td></tr>');
        if (data.los_uti_aritmetico != null) rows.push('<tr><td class="bg-light">LOS UTI (dias)</td><td>' + esc(String(data.los_uti_aritmetico)) + '</td></tr>');
        if (data.custo_sus != null) rows.push('<tr><td class="bg-light">Custo SUS</td><td>R$ ' + esc(String(data.custo_sus)) + '</td></tr>');
        if (data.custo_suplementar != null) rows.push('<tr><td class="bg-light">Custo suplementar</td><td>R$ ' + esc(String(data.custo_suplementar)) + '</td></tr>');
        if (data.prob_evento_adverso != null) rows.push('<tr><td class="bg-light">P(evento adverso)</td><td>' + esc(String(data.prob_evento_adverso)) + '</td></tr>');
        if (data.prob_intervencao_uti != null) rows.push('<tr><td class="bg-light">P(intervenção UTI)</td><td>' + esc(String(data.prob_intervencao_uti)) + '</td></tr>');
        if (data.cc_mcc_info && typeof data.cc_mcc_info === 'object') {
          var cc = data.cc_mcc_info;
          rows.push('<tr><td class="bg-light">CC/MCC</td><td>CC: ' + (cc.has_cc ? 'Sim' : 'Não') + ', MCC: ' + (cc.has_mcc ? 'Sim' : 'Não') + ', Complicações: ' + (cc.n_complications != null ? cc.n_complications : '-') + '</td></tr>');
        }
        var rest = {};
        Object.keys(data).forEach(function (k) {
          if (['drg_br_code', 'mdc', 'mdc_title', 'severity', 'is_surgical', 'los_aritmetico', 'los_uti_aritmetico', 'custo_sus', 'custo_suplementar', 'prob_evento_adverso', 'prob_intervencao_uti', 'cc_mcc_info'].indexOf(k) === -1 && data[k] != null) rest[k] = data[k];
        });
        if (Object.keys(rest).length) rows.push('<tr><td class="bg-light">Outros</td><td><pre class="mb-0 small">' + esc(JSON.stringify(rest, null, 2)) + '</pre></td></tr>');
        return '<table class="table table-bordered table-sm mb-0"><tbody>' + rows.join('') + '</tbody></table>';
      }

      pe('#predict-submit-btn').addEventListener('click', function () {
        var apiKey = (pe('#predict-api-key').value || '').trim();
        var errEl = pe('#predict-form-error');
        errEl.style.display = 'none';
        if (!apiKey) {
          errEl.textContent = 'Informe a chave API para enviar a predição.';
          errEl.style.display = 'block';
          return;
        }
        var modelId = (pe('#predict-model-id').value || '').trim();
        var cid = (pe('#predict-cid').value || '').trim();
        var cidsSec = (pe('#predict-cids-sec').value || '').trim().split(/\s*,\s*/).filter(Boolean);
        var proc = (pe('#predict-proc').value || '').trim();
        var idade = parseInt(pe('#predict-idade').value, 10);
        if (isNaN(idade) || idade < 0) idade = 50;
        var sexo = parseInt(pe('#predict-sexo').value, 10);
        var urgencia = parseInt(pe('#predict-urgencia').value, 10);
        var payload = { cid_principal: cid || undefined, cids_secundarios: cidsSec, procedimento_sigtap: proc, idade: idade, sexo: sexo, urgencia: urgencia };
        if (modelId) payload.model_id = parseInt(modelId, 10);
        pe('#predict-submit-btn').disabled = true;
        requestPredict(apiKey, payload).then(function (result) {
          pe('#predict-result-body').innerHTML = formatResult(result);
          pe('#predict-result-wrap').style.display = 'block';
          showAlert('Predição concluída.');
        }).catch(function (e) {
          errEl.textContent = (e.data && e.data.error) || e.message || 'Erro ao obter predição.';
          errEl.style.display = 'block';
          pe('#predict-result-wrap').style.display = 'none';
        }).finally(function () {
          pe('#predict-submit-btn').disabled = false;
        });
      });

      pe('#predict-clear-btn').addEventListener('click', function () {
        pe('#predict-result-wrap').style.display = 'none';
        pe('#predict-result-body').innerHTML = '';
      });
    }).catch(function () {
      container.innerHTML = '<div class="alert alert-danger">Erro ao carregar modelos. Verifique se há modelos treinados e tente novamente.</div>';
    });
  }

  function apiDocs(container) {
    var baseUrl = typeof window.DRG_BASE_URL !== 'undefined' && window.DRG_BASE_URL ? window.DRG_BASE_URL : (window.location.origin || '');
    container.innerHTML =
      '<div class="card mb-4">' +
      '  <div class="card-header bg-primary text-white"><h5 class="mb-0"><i class="fas fa-book mr-2"></i>Documentação da API de Predição</h5></div>' +
      '  <div class="card-body">' +
      '    <p class="lead">A API de predição DRG-BR permite obter estimativas de permanência (LOS), custos e probabilidades clínicas a partir de CID principal, CIDs secundários, procedimento e dados demográficos.</p>' +
      '    <p><strong>Base URL:</strong> <code>' + esc(baseUrl) + '</code></p>' +
      '    <p class="text-muted small mb-0">As rotas da API de predição estão sob o prefixo <code>/api/v1</code>.</p>' +
      '  </div>' +
      '</div>' +

      '<div class="card mb-4">' +
      '  <div class="card-header"><i class="fas fa-key mr-2"></i>Autenticação</div>' +
      '  <div class="card-body">' +
      '    <p><strong>Listar modelos</strong> (<code>GET /api/v1/models</code>) não exige autenticação.</p>' +
      '    <p><strong>Predição</strong> (<code>POST /api/v1/predict</code>) exige chave API:</p>' +
      '    <ul class="mb-0">' +
      '      <li>Envie no header: <code>X-API-Key: sua-chave-api</code></li>' +
      '      <li>Ou no corpo JSON: <code>"api_key": "sua-chave-api"</code></li>' +
      '    </ul>' +
      '    <p class="mt-2 small text-muted">Chaves API são criadas em <strong>Chaves API</strong> no menu. A cota (requests/dia) pode ser configurada por chave; se excedida, a API retorna <code>429</code>.</p>' +
      '  </div>' +
      '</div>' +

      '<div class="card mb-4">' +
      '  <div class="card-header"><i class="fas fa-list mr-2"></i>GET /api/v1/models</div>' +
      '  <div class="card-body">' +
      '    <p>Lista os modelos treinados disponíveis para predição. Não requer autenticação.</p>' +
      '    <p><strong>Resposta 200</strong> — array de objetos:</p>' +
      '    <pre class="bg-light p-3 rounded small">[\n  {\n    "id": 1,\n    "name": "Modelo principal",\n    "path": "models",\n    "is_default": true,\n    "created_at": "2024-01-15T12:00:00"\n  }\n]</pre>' +
      '    <table class="table table-sm table-bordered"><thead><tr><th>Campo</th><th>Descrição</th></tr></thead><tbody>' +
      '    <tr><td><code>id</code></td><td>ID do modelo (use em <code>model_id</code> na predição)</td></tr>' +
      '    <tr><td><code>name</code></td><td>Nome do modelo</td></tr>' +
      '    <tr><td><code>path</code></td><td>Caminho no servidor</td></tr>' +
      '    <tr><td><code>is_default</code></td><td>Se é o modelo padrão quando nenhum é informado</td></tr>' +
      '    <tr><td><code>created_at</code></td><td>Data de criação (ISO 8601)</td></tr>' +
      '    </tbody></table>' +
      '  </div>' +
      '</div>' +

      '<div class="card mb-4">' +
      '  <div class="card-header"><i class="fas fa-calculator mr-2"></i>POST /api/v1/predict</div>' +
      '  <div class="card-body">' +
      '    <p>Executa uma predição. Requer <code>X-API-Key</code> (ou <code>api_key</code> no body).</p>' +
      '    <p><strong>Corpo (JSON):</strong></p>' +
      '    <pre class="bg-light p-3 rounded small">{\n  "model_id": 1,           // opcional; ou "model_name"\n  "model_name": "Meu modelo", // opcional\n  "cid_principal": "J189",   // obrigatório (CID-10, com ou sem ponto)\n  "cids_secundarios": ["N183","E119"], // opcional, array de strings\n  "procedimento_sigtap": "0301010079", // opcional\n  "idade": 50,               // opcional, padrão 50\n  "sexo": 0,                 // 0=indefinido, 1=masculino, 2=feminino\n  "urgencia": 1              // 0=eletivo, 1=urgência\n}</pre>' +
      '    <p><strong>Parâmetros (também aceitos via query string):</strong> <code>model_id</code>, <code>model_name</code>.</p>' +
      '    <p><strong>Resposta 200</strong> — objeto com predições e agrupamento DRG:</p>' +
      '    <pre class="bg-light p-3 rounded small">{\n  "drg_br_code": "...",\n  "mdc": "...",\n  "mdc_title": "...",\n  "is_surgical": false,\n  "severity": 2,\n  "cc_mcc_summary": { "has_cc": true, "has_mcc": false, "n_complications": 1 },\n  "los_aritmetico": 5.2,\n  "los_uti_aritmetico": 0.8,\n  "custo_sus": 4160.00,\n  "custo_suplementar": 13000.00,\n  "prob_evento_adverso": 0.12,\n  "prob_intervencao_uti": 0.08,\n  "prob_obito": 0.02\n}</pre>' +
      '    <table class="table table-sm table-bordered mt-2"><thead><tr><th>Campo</th><th>Descrição</th></tr></thead><tbody>' +
      '    <tr><td><code>drg_br_code</code></td><td>Código do grupo DRG-BR</td></tr>' +
      '    <tr><td><code>mdc</code> / <code>mdc_title</code></td><td>MDC e título (Major Diagnostic Category)</td></tr>' +
      '    <tr><td><code>is_surgical</code></td><td>Se o grupo é cirúrgico</td></tr>' +
      '    <tr><td><code>severity</code></td><td>Nível de severidade (0–4)</td></tr>' +
      '    <tr><td><code>cc_mcc_summary</code></td><td>Resumo CC/MCC: has_cc, has_mcc, n_complications</td></tr>' +
      '    <tr><td><code>los_aritmetico</code></td><td>Estimativa de permanência em dias</td></tr>' +
      '    <tr><td><code>los_uti_aritmetico</code></td><td>Estimativa de dias em UTI</td></tr>' +
      '    <tr><td><code>custo_sus</code> / <code>custo_suplementar</code></td><td>Estimativas de custo (R$)</td></tr>' +
      '    <tr><td><code>prob_obito</code>, <code>prob_evento_adverso</code>, <code>prob_intervencao_uti</code></td><td>Probabilidades (0–1)</td></tr>' +
      '    </tbody></table>' +
      '    <p><strong>Códigos de erro:</strong></p>' +
      '    <ul class="mb-0">' +
      '      <li><code>401</code> — <code>X-API-Key header required</code></li>' +
      '      <li><code>403</code> — <code>Invalid API key</code></li>' +
      '      <li><code>429</code> — <code>Quota exceeded (requests per day)</code></li>' +
      '      <li><code>500</code> — Erro interno (mensagem em <code>error</code>)</li>' +
      '    </ul>' +
      '  </div>' +
      '</div>' +

      '<div class="card mb-4">' +
      '  <div class="card-header"><i class="fas fa-terminal mr-2"></i>Exemplo com cURL</div>' +
      '  <div class="card-body">' +
      '    <pre class="bg-dark text-light p-3 rounded small mb-0">curl -X POST "' + esc(baseUrl) + '/api/v1/predict" \\\n  -H "Content-Type: application/json" \\\n  -H "X-API-Key: SUA_CHAVE_API" \\\n  -d \'{"cid_principal":"J189","idade":65,"sexo":1,"urgencia":1}\'</pre>' +
      '  </div>' +
      '</div>' +

      '<div class="card mb-4">' +
      '  <div class="card-header"><i class="fas fa-code mr-2"></i>Exemplo em JavaScript (fetch)</div>' +
      '  <div class="card-body">' +
      '    <pre class="bg-light p-3 rounded small mb-0">fetch("' + esc(baseUrl) + '/api/v1/predict", {\n  method: "POST",\n  headers: { "Content-Type": "application/json", "X-API-Key": "SUA_CHAVE_API" },\n  body: JSON.stringify({\n    cid_principal: "J189",\n    cids_secundarios: ["N183"],\n    idade: 65,\n    sexo: 1,\n    urgencia: 1\n  })\n})\n.then(r => r.json())\n.then(data => console.log(data));</pre>' +
      '  </div>' +
      '</div>';
  }

  function profile(container) {
    function renderProfile(u) {
      u = u || {};
      var otpStatus = u.otp_enabled ? '<span class="badge badge-success">Ativo</span>' : '<span class="badge badge-secondary">Desativado</span>';
      container.innerHTML =
        '<div id="profile-alert"></div>' +
        '<div class="card mb-4"><div class="card-header"><i class="fas fa-user mr-2"></i><strong>Meu perfil</strong></div><div class="card-body">' +
        '<div class="form-group"><label class="font-weight-bold">Email</label><input type="text" class="form-control" id="profile-email" value="' + esc(u.email || '') + '" readonly disabled><small class="form-text text-muted">O email não pode ser alterado.</small></div>' +
        '<div class="form-group"><label class="font-weight-bold">Nome</label><input type="text" class="form-control" id="profile-name" placeholder="Seu nome" value="' + esc(u.name || '') + '"></div>' +
        '<button type="button" class="btn btn-primary" id="profile-save-btn"><i class="fas fa-save mr-1"></i> Salvar perfil</button>' +
        '</div></div>' +
        '<div class="card mb-4"><div class="card-header"><i class="fas fa-lock mr-2"></i><strong>Alterar senha</strong></div><div class="card-body">' +
        '<div id="profile-password-error" class="alert alert-danger" style="display:none;"></div>' +
        '<div class="form-group"><label class="font-weight-bold">Senha atual</label><input type="password" class="form-control" id="profile-current-password" placeholder="Senha atual" autocomplete="current-password"></div>' +
        '<div class="form-group"><label class="font-weight-bold">Nova senha</label><input type="password" class="form-control" id="profile-new-password" placeholder="Mínimo 6 caracteres" autocomplete="new-password"></div>' +
        '<div class="form-group"><label class="font-weight-bold">Confirmar nova senha</label><input type="password" class="form-control" id="profile-confirm-password" placeholder="Repita a nova senha" autocomplete="new-password"></div>' +
        '<button type="button" class="btn btn-primary" id="profile-change-password-btn"><i class="fas fa-key mr-1"></i> Alterar senha</button>' +
        '</div></div>' +
        '<div class="card mb-4"><div class="card-header"><i class="fas fa-shield-alt mr-2"></i><strong>Autenticação em dois fatores (2FA)</strong></div><div class="card-body">' +
        '<p class="mb-2">Status: ' + otpStatus + '</p>' +
        '<p class="text-muted small mb-3">A autenticação em dois fatores adiciona uma camada extra de segurança usando um aplicativo como Google Authenticator ou Authy.</p>' +
        (u.otp_enabled
          ? '<button type="button" class="btn btn-outline-warning" id="profile-2fa-disable-btn"><i class="fas fa-times-circle mr-1"></i> Desativar 2FA</button>'
          : '<button type="button" class="btn btn-outline-primary" id="profile-2fa-enable-btn"><i class="fas fa-qrcode mr-1"></i> Ativar 2FA</button>') +
        '</div></div>' +
        '<div class="modal fade" id="profile-2fa-setup-modal" tabindex="-1"><div class="modal-dialog"><div class="modal-content">' +
        '<div class="modal-header"><h5 class="modal-title">Ativar 2FA</h5><button type="button" class="close" data-dismiss="modal"><span>&times;</span></button></div>' +
        '<div class="modal-body">' +
        '<p class="small">Adicione a conta no seu aplicativo autenticador (Google Authenticator, Authy, etc.) escaneando o QR code ou digitando o código manualmente.</p>' +
        '<div class="text-center my-3" id="profile-2fa-qr-wrap"></div>' +
        '<div class="form-group mb-0"><label>Código secreto (manual)</label><input type="text" class="form-control font-monospace" id="profile-2fa-secret" readonly></div>' +
        '<hr><div class="form-group"><label>Digite o código de 6 dígitos do aplicativo</label><input type="text" class="form-control" id="profile-2fa-setup-code" placeholder="000000" maxlength="6" autocomplete="one-time-code"></div>' +
        '<div id="profile-2fa-setup-error" class="alert alert-danger small" style="display:none;"></div>' +
        '</div><div class="modal-footer"><button type="button" class="btn btn-secondary" data-dismiss="modal">Cancelar</button><button type="button" class="btn btn-primary" id="profile-2fa-verify-btn">Confirmar e ativar</button></div>' +
        '</div></div></div>' +
        '<div class="modal fade" id="profile-2fa-disable-modal" tabindex="-1"><div class="modal-dialog"><div class="modal-content">' +
        '<div class="modal-header"><h5 class="modal-title">Desativar 2FA</h5><button type="button" class="close" data-dismiss="modal"><span>&times;</span></button></div>' +
        '<div class="modal-body">' +
        '<div class="form-group"><label>Senha atual</label><input type="password" class="form-control" id="profile-2fa-disable-password" placeholder="Sua senha"></div>' +
        '<div class="form-group"><label>Código do aplicativo</label><input type="text" class="form-control" id="profile-2fa-disable-code" placeholder="000000" maxlength="6"></div>' +
        '<div id="profile-2fa-disable-error" class="alert alert-danger small" style="display:none;"></div>' +
        '</div><div class="modal-footer"><button type="button" class="btn btn-secondary" data-dismiss="modal">Cancelar</button><button type="button" class="btn btn-warning" id="profile-2fa-disable-confirm-btn">Desativar 2FA</button></div>' +
        '</div></div></div>';

      function showAlert(msg, isError) {
        var el = container.querySelector('#profile-alert');
        if (!el) return;
        el.innerHTML = '<div class="alert alert-' + (isError ? 'danger' : 'success') + ' alert-dismissible"><button type="button" class="close" data-dismiss="alert"><span>&times;</span></button>' + esc(msg) + '</div>';
        setTimeout(function () { el.innerHTML = ''; }, 5000);
      }
      function pe(sel) { return container.querySelector(sel); }

      pe('#profile-save-btn').addEventListener('click', function () {
        var name = (pe('#profile-name').value || '').trim();
        API.put('/api/auth/me', { name: name }).then(function (data) {
          AUTH.setUser && AUTH.setUser({ id: data.id, email: data.email, name: data.name });
          var displayName = data.name || data.email || 'Usuário';
          var el = document.getElementById('user-name');
          if (el) el.textContent = displayName;
          el = document.getElementById('sidebar-user-name');
          if (el) el.textContent = displayName;
          showAlert('Perfil atualizado.');
        }).catch(function (e) {
          showAlert((e.data && e.data.error) || 'Erro ao salvar.', true);
        });
      });

      pe('#profile-change-password-btn').addEventListener('click', function () {
        var errEl = pe('#profile-password-error');
        errEl.style.display = 'none';
        var current = (pe('#profile-current-password').value || '').trim();
        var newP = (pe('#profile-new-password').value || '').trim();
        var confirmP = (pe('#profile-confirm-password').value || '').trim();
        if (!current) { errEl.textContent = 'Informe a senha atual.'; errEl.style.display = 'block'; return; }
        if (newP.length < 6) { errEl.textContent = 'A nova senha deve ter no mínimo 6 caracteres.'; errEl.style.display = 'block'; return; }
        if (newP !== confirmP) { errEl.textContent = 'A confirmação da senha não confere.'; errEl.style.display = 'block'; return; }
        API.put('/api/auth/me', { name: u.name, current_password: current, password: newP }).then(function () {
          pe('#profile-current-password').value = '';
          pe('#profile-new-password').value = '';
          pe('#profile-confirm-password').value = '';
          showAlert('Senha alterada com sucesso.');
        }).catch(function (e) {
          errEl.textContent = (e.data && e.data.error) || 'Erro ao alterar senha.';
          errEl.style.display = 'block';
        });
      });

      pe('#profile-2fa-enable-btn').addEventListener('click', function () {
        API.post('/api/auth/2fa/setup').then(function (data) {
          pe('#profile-2fa-secret').value = data.secret || '';
          pe('#profile-2fa-setup-code').value = '';
          pe('#profile-2fa-setup-error').style.display = 'none';
          var qrWrap = pe('#profile-2fa-qr-wrap');
          if (data.otp_uri) qrWrap.innerHTML = '<img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=' + encodeURIComponent(data.otp_uri) + '" alt="QR Code" class="img-fluid">';
          else qrWrap.innerHTML = '';
          if (typeof $ !== 'undefined') $('#profile-2fa-setup-modal').modal('show');
        }).catch(function (e) {
          showAlert((e.data && e.data.error) || 'Erro ao iniciar configuração 2FA.', true);
        });
      });

      pe('#profile-2fa-verify-btn').addEventListener('click', function () {
        var code = (pe('#profile-2fa-setup-code').value || '').trim();
        var errEl = pe('#profile-2fa-setup-error');
        errEl.style.display = 'none';
        if (!code || code.length !== 6) { errEl.textContent = 'Informe o código de 6 dígitos.'; errEl.style.display = 'block'; return; }
        API.post('/api/auth/2fa/verify-setup', { code: code }).then(function () {
          if (typeof $ !== 'undefined') $('#profile-2fa-setup-modal').modal('hide');
          showAlert('Autenticação em dois fatores ativada.');
          AUTH.getMe().then(function (data) { renderProfile(data); });
        }).catch(function (e) {
          errEl.textContent = (e.data && e.data.error) || 'Código inválido.';
          errEl.style.display = 'block';
        });
      });

      pe('#profile-2fa-disable-btn').addEventListener('click', function () {
        pe('#profile-2fa-disable-password').value = '';
        pe('#profile-2fa-disable-code').value = '';
        pe('#profile-2fa-disable-error').style.display = 'none';
        if (typeof $ !== 'undefined') $('#profile-2fa-disable-modal').modal('show');
      });

      pe('#profile-2fa-disable-confirm-btn').addEventListener('click', function () {
        var password = (pe('#profile-2fa-disable-password').value || '').trim();
        var code = (pe('#profile-2fa-disable-code').value || '').trim();
        var errEl = pe('#profile-2fa-disable-error');
        errEl.style.display = 'none';
        if (!password) { errEl.textContent = 'Informe sua senha.'; errEl.style.display = 'block'; return; }
        if (!code) { errEl.textContent = 'Informe o código do aplicativo.'; errEl.style.display = 'block'; return; }
        API.post('/api/auth/2fa/disable', { password: password, code: code }).then(function () {
          if (typeof $ !== 'undefined') $('#profile-2fa-disable-modal').modal('hide');
          showAlert('2FA desativado.');
          AUTH.getMe().then(function (data) { renderProfile(data); });
        }).catch(function (e) {
          errEl.textContent = (e.data && e.data.error) || 'Erro ao desativar.';
          errEl.style.display = 'block';
        });
      });
    }

    container.innerHTML = '<div class="text-center py-4"><i class="fas fa-spinner fa-spin fa-2x"></i></div>';
    AUTH.getMe().then(function (data) { renderProfile(data); }).catch(function () {
      var u = AUTH.getUser();
      if (u) renderProfile(u);
      else container.innerHTML = '<div class="alert alert-danger">Erro ao carregar perfil.</div>';
    });
  }

  function install(container) {
    container.innerHTML =
      '<div id="install-form-wrap">' +
      '<div class="d-flex align-items-center mb-3"><span class="badge badge-primary mr-2">1</span><h6 class="mb-0 font-weight-bold">Configuração</h6></div>' +
      '<p class="text-muted small mb-3">O sistema ainda não está instalado. Preencha os dados abaixo. O arquivo <code>.env</code> será criado e o banco inicializado. Após concluir, reinicie o servidor.</p>' +
      '<div id="install-alert" class="mb-2"></div>' +
      '<div class="form-group"><label class="font-weight-bold">DATABASE_URL <span class="text-danger">*</span></label><input type="text" class="form-control font-monospace" id="install-database-url" placeholder="mysql+pymysql://usuario:senha@host:3306/drg_br"></div>' +
      '<div class="form-group"><label class="font-weight-bold">SECRET_KEY</label><input type="text" class="form-control" id="install-secret-key" placeholder="Opcional; será gerado se vazio"></div>' +
      '<div class="form-group"><label class="font-weight-bold">JWT_SECRET_KEY</label><input type="text" class="form-control" id="install-jwt-secret-key" placeholder="Opcional; usa SECRET_KEY se vazio"></div>' +
      '<div class="form-group"><label class="font-weight-bold">DRG_DB_PATH</label><input type="text" class="form-control" id="install-drg-db-path" placeholder="data/drg_br.db"></div>' +
      '<div class="form-group"><label class="font-weight-bold">DRG_MODEL_DIR</label><input type="text" class="form-control" id="install-drg-model-dir" placeholder="models"></div>' +
      '<div class="form-group"><label class="font-weight-bold">DRG_CACHE_DIR</label><input type="text" class="form-control" id="install-drg-cache-dir" placeholder="data/cache"></div>' +
      '<div class="form-group"><label class="font-weight-bold">CORS_ORIGINS</label><input type="text" class="form-control" id="install-cors-origins" placeholder="* ou https://seudominio.com" value="*"></div>' +
      '<div class="form-group"><label class="font-weight-bold">FLASK_ENV</label><select class="form-control" id="install-flask-env"><option value="production">production</option><option value="development">development</option></select></div>' +
      '<hr><h6 class="font-weight-bold">Primeiro usuário administrador</h6>' +
      '<div class="form-group"><label class="font-weight-bold">Email do admin</label><input type="email" class="form-control" id="install-admin-email" placeholder="admin@drgbr.local" value="admin@drgbr.local"></div>' +
      '<div class="form-group"><label class="font-weight-bold">Senha do admin</label><input type="password" class="form-control" id="install-admin-password" placeholder="Mín. 6 caracteres (vazio = admin123)" autocomplete="new-password"></div>' +
      '<button type="button" class="btn btn-primary btn-block btn-lg" id="install-submit"><i class="fas fa-download mr-1"></i> Instalar sistema</button>' +
      '</div>' +
      '<div id="install-success-wrap" style="display:none;"></div>';

    container.querySelector('#install-submit').addEventListener('click', function () {
      var database_url = (container.querySelector('#install-database-url').value || '').trim();
      var errEl = container.querySelector('#install-alert');
      var formWrap = container.querySelector('#install-form-wrap');
      var successWrap = container.querySelector('#install-success-wrap');
      errEl.innerHTML = '';
      if (!database_url) {
        errEl.innerHTML = '<div class="alert alert-danger">Informe o DATABASE_URL.</div>';
        return;
      }
      var adminPassword = (container.querySelector('#install-admin-password').value || '').trim();
      if (adminPassword && adminPassword.length < 6) {
        errEl.innerHTML = '<div class="alert alert-danger">A senha do admin deve ter no mínimo 6 caracteres.</div>';
        return;
      }
      var payload = {
        database_url: database_url,
        secret_key: (container.querySelector('#install-secret-key').value || '').trim(),
        jwt_secret_key: (container.querySelector('#install-jwt-secret-key').value || '').trim(),
        drg_db_path: (container.querySelector('#install-drg-db-path').value || '').trim(),
        drg_model_dir: (container.querySelector('#install-drg-model-dir').value || '').trim(),
        drg_cache_dir: (container.querySelector('#install-drg-cache-dir').value || '').trim(),
        cors_origins: (container.querySelector('#install-cors-origins').value || '').trim(),
        flask_env: (container.querySelector('#install-flask-env').value || '').trim(),
        admin_email: (container.querySelector('#install-admin-email').value || '').trim().toLowerCase(),
        admin_password: adminPassword
      };
      container.querySelector('#install-submit').disabled = true;
      container.querySelector('#install-submit').innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i> Instalando...';
      fetch((typeof window.DRG_BASE_URL !== 'undefined' ? window.DRG_BASE_URL : '') + '/api/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).then(function (r) { return r.json().then(function (d) { return { ok: r.ok, data: d }; }); }).then(function (res) {
        if (res.ok) {
          if (formWrap) formWrap.style.display = 'none';
          if (successWrap) {
            var emailUsed = (res.data.admin_email || 'admin@drgbr.local');
            successWrap.style.display = 'block';
            successWrap.innerHTML =
              '<div class="text-center py-2"><i class="fas fa-check-circle fa-3x text-success mb-2"></i></div>' +
              '<h6 class="font-weight-bold text-center">Instalação concluída</h6>' +
              '<p class="text-muted small text-center">O sistema foi configurado com sucesso.</p>' +
              '<div class="alert alert-info small">' +
              '<strong>Próximos passos:</strong><br>' +
              '1. Reinicie o servidor da aplicação.<br>' +
              '2. Acesse novamente esta URL.<br>' +
              '3. Faça login com: <code>' + esc(emailUsed) + '</code> e a senha que você definiu.<br>' +
              '<span class="text-muted">Se não informou senha, use admin123.</span>' +
              '</div>';
          }
        } else {
          errEl.innerHTML = '<div class="alert alert-danger">' + esc(res.data.error || 'Erro na instalação.') + (res.data.detail ? '<br><small>' + esc(res.data.detail) + '</small>' : '') + '</div>';
          container.querySelector('#install-submit').disabled = false;
          container.querySelector('#install-submit').innerHTML = '<i class="fas fa-download mr-1"></i> Instalar sistema';
        }
      }).catch(function () {
        errEl.innerHTML = '<div class="alert alert-danger">Erro de conexão. Tente novamente.</div>';
        container.querySelector('#install-submit').disabled = false;
        container.querySelector('#install-submit').innerHTML = '<i class="fas fa-download mr-1"></i> Instalar sistema';
      });
    });
  }

  function settings(container) {
    container.innerHTML =
      '<div id="settings-alert"></div>' +
      '<div class="card mb-4"><div class="card-header"><i class="fas fa-cog mr-2"></i><strong>Configurações do sistema (.env)</strong></div><div class="card-body">' +
      '<p class="text-muted small mb-3">Configurações do servidor. Alterações exigem reinício do servidor para aplicar.</p>' +
      '<div id="settings-config-table" class="small mb-3"><span class="text-muted">Carregando...</span></div>' +
      '<div id="settings-form-wrap" style="display:none;">' +
      '<hr><h6 class="font-weight-bold">Editar configuração</h6>' +
      '<div class="form-group"><label>DATABASE_URL</label><input type="text" class="form-control font-monospace" id="settings-database-url" placeholder="mysql+pymysql://user:pass@host/db"></div>' +
      '<div class="form-group"><label>SECRET_KEY</label><input type="password" class="form-control" id="settings-secret-key" placeholder="Deixe em branco para não alterar"></div>' +
      '<div class="form-group"><label>JWT_SECRET_KEY</label><input type="password" class="form-control" id="settings-jwt-secret-key" placeholder="Deixe em branco para não alterar"></div>' +
      '<div class="form-group"><label>DRG_DB_PATH</label><input type="text" class="form-control" id="settings-drg-db-path"></div>' +
      '<div class="form-group"><label>DRG_MODEL_DIR</label><input type="text" class="form-control" id="settings-drg-model-dir"></div>' +
      '<div class="form-group"><label>DRG_CACHE_DIR</label><input type="text" class="form-control" id="settings-drg-cache-dir"></div>' +
      '<div class="form-group"><label>CORS_ORIGINS</label><input type="text" class="form-control" id="settings-cors-origins"></div>' +
      '<div class="form-group"><label>FLASK_ENV</label><select class="form-control" id="settings-flask-env"><option value="production">production</option><option value="development">development</option></select></div>' +
      '<button type="button" class="btn btn-primary" id="settings-save-btn"><i class="fas fa-save mr-1"></i> Salvar e solicitar reinício</button>' +
      '</div></div></div>';

    function pe(sel) { return container.querySelector(sel); }

    API.get('/api/config').then(function (c) {
      var tableEl = pe('#settings-config-table');
      var rows = [];
      if (c.DATABASE_URL != null) rows.push('<tr><td class="bg-light" style="width:32%">DATABASE_URL</td><td class="font-monospace small">' + esc(String(c.DATABASE_URL)) + '</td></tr>');
      if (c.DRG_DB_PATH != null) rows.push('<tr><td class="bg-light">DRG_DB_PATH</td><td class="font-monospace small">' + esc(String(c.DRG_DB_PATH)) + '</td></tr>');
      if (c.DRG_MODEL_DIR != null) rows.push('<tr><td class="bg-light">DRG_MODEL_DIR</td><td class="font-monospace small">' + esc(String(c.DRG_MODEL_DIR)) + '</td></tr>');
      if (c.DRG_CACHE_DIR != null) rows.push('<tr><td class="bg-light">DRG_CACHE_DIR</td><td class="font-monospace small">' + esc(String(c.DRG_CACHE_DIR)) + '</td></tr>');
      if (c.CORS_ORIGINS != null) rows.push('<tr><td class="bg-light">CORS_ORIGINS</td><td>' + esc(String(c.CORS_ORIGINS)) + '</td></tr>');
      if (c.FLASK_ENV != null) rows.push('<tr><td class="bg-light">Ambiente</td><td>' + esc(String(c.FLASK_ENV)) + '</td></tr>');
      tableEl.innerHTML = rows.length ? '<table class="table table-bordered table-sm mb-0"><tbody>' + rows.join('') + '</tbody></table>' : '<p class="text-muted small mb-0">—</p>';

      if (c.can_manage_config) {
        pe('#settings-form-wrap').style.display = 'block';
        pe('#settings-drg-db-path').value = c.DRG_DB_PATH || '';
        pe('#settings-drg-model-dir').value = c.DRG_MODEL_DIR || '';
        pe('#settings-drg-cache-dir').value = c.DRG_CACHE_DIR || '';
        pe('#settings-cors-origins').value = c.CORS_ORIGINS != null ? c.CORS_ORIGINS : '*';
        pe('#settings-flask-env').value = c.FLASK_ENV || 'production';
      }

      pe('#settings-save-btn').addEventListener('click', function () {
        if (!c.can_manage_config) return;
        var payload = {
          drg_db_path: (pe('#settings-drg-db-path').value || '').trim(),
          drg_model_dir: (pe('#settings-drg-model-dir').value || '').trim(),
          drg_cache_dir: (pe('#settings-drg-cache-dir').value || '').trim(),
          cors_origins: (pe('#settings-cors-origins').value || '').trim(),
          flask_env: (pe('#settings-flask-env').value || '').trim()
        };
        var dbUrl = (pe('#settings-database-url').value || '').trim();
        if (dbUrl) payload.database_url = dbUrl;
        var sk = (pe('#settings-secret-key').value || '').trim();
        if (sk) payload.secret_key = sk;
        var jk = (pe('#settings-jwt-secret-key').value || '').trim();
        if (jk) payload.jwt_secret_key = jk;
        pe('#settings-save-btn').disabled = true;
        API.put('/api/config', payload).then(function (data) {
          pe('#settings-alert').innerHTML = '<div class="alert alert-success">' + esc(data.message || 'Salvo.') + '</div>';
          setTimeout(function () { pe('#settings-alert').innerHTML = ''; }, 6000);
        }).catch(function (e) {
          pe('#settings-alert').innerHTML = '<div class="alert alert-danger">' + esc((e.data && e.data.error) || 'Erro ao salvar.') + '</div>';
        }).finally(function () {
          pe('#settings-save-btn').disabled = false;
        });
      });
    }).catch(function () {
      pe('#settings-config-table').innerHTML = '<p class="text-muted small mb-0">Não foi possível carregar as configurações.</p>';
    });
  }

  function page404(container) {
    container.innerHTML = '<div class="text-center py-5"><h1 class="display-4">404</h1><p class="text-muted">Página não encontrada.</p><a href="#/dashboard" class="btn btn-primary">Voltar ao Início</a></div>';
  }

  function page500(container) {
    container.innerHTML = '<div class="text-center py-5"><h1 class="display-4">500</h1><p class="text-muted">Erro interno do servidor.</p><a href="#/dashboard" class="btn btn-primary">Voltar ao Início</a></div>';
  }

  return {
    login: login,
    register: register,
    install: install,
    dashboard: dashboard,
    users: users,
    roles: roles,
    apikeys: apikeys,
    extraction: extraction,
    training: training,
    prediction: prediction,
    apiDocs: apiDocs,
    profile: profile,
    settings: settings,
    page404: page404,
    page500: page500
  };
})();
