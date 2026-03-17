/**
 * DRG-BR App: roteador por hash e páginas (sem React)
 */
(function () {
  var routes = {
    '': 'dashboard',
    'login': 'login',
    'register': 'register',
    'install': 'install',
    'dashboard': 'dashboard',
    'users': 'users',
    'roles': 'roles',
    'api-keys': 'apikeys',
    'extraction': 'extraction',
    'training': 'training',
    'prediction': 'prediction',
    'api-docs': 'apiDocs',
    'api-use': 'apiUse',
    'profile': 'profile',
    'settings': 'settings',
    '404': 'page404',
    '500': 'page500'
  };

  function getRoute() {
    var hash = window.location.hash.slice(1).replace(/^\//, '').split('/')[0] || '';
    return routes[hash] || (hash ? '404' : 'dashboard');
  }

  function showLogin() {
    var installEl = document.getElementById('install-screen');
    if (installEl) installEl.style.display = 'none';
    document.getElementById('login-screen').style.display = '';
    document.getElementById('app-shell').style.display = 'none';
  }

  function showInstall() {
    document.getElementById('install-screen').style.display = 'flex';
    document.getElementById('install-screen').style.alignItems = 'center';
    document.getElementById('install-screen').style.justifyContent = 'center';
    document.getElementById('install-screen').style.minHeight = '100vh';
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('app-shell').style.display = 'none';
    var installContent = document.getElementById('install-content');
    if (installContent && window.DRG_PAGES && window.DRG_PAGES.install) {
      installContent.innerHTML = '';
      window.DRG_PAGES.install(installContent);
    }
  }

  function showApp() {
    var installEl = document.getElementById('install-screen');
    if (installEl) installEl.style.display = 'none';
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('app-shell').style.display = '';
    var u = window.DRG_AUTH.getUser();
    if (u) {
      var name = u.name || u.email || 'Usuário';
      var el = document.getElementById('user-name');
      if (el) el.textContent = name;
      el = document.getElementById('sidebar-user-name');
      if (el) el.textContent = name;
    }
  }

  function setActiveNav(route) {
    document.querySelectorAll('#app-shell .nav-link[data-route]').forEach(function (a) {
      a.classList.toggle('active', a.getAttribute('data-route') === route);
    });
  }

  function setTitle(title, breadcrumb) {
    var t = document.getElementById('page-title');
    if (t) t.textContent = title || 'DRG-BR';
    var b = document.getElementById('breadcrumb-current');
    if (b) b.textContent = breadcrumb || 'Plataforma';
  }

  function renderPage(route, container) {
    container.innerHTML = '<div class="text-center p-4"><i class="fas fa-spinner fa-spin fa-2x"></i></div>';
    var render = window.DRG_PAGES && window.DRG_PAGES[route];
    if (render) {
      Promise.resolve(render(container)).catch(function (e) {
        container.innerHTML = '<div class="alert alert-danger">Erro ao carregar: ' + (e.message || e) + '</div>';
      });
    } else {
      container.innerHTML = '<div class="alert alert-info">Página em construção.</div>';
    }
  }

  function loadPage() {
    var route = getRoute();
    if (route === 'login' || route === 'register') {
      if (window.DRG_AUTH.getToken()) {
        window.location.hash = '#/dashboard';
        return;
      }
      showLogin();
      var loginContent = document.getElementById('login-content');
      if (loginContent && window.DRG_PAGES && window.DRG_PAGES[route]) {
        loginContent.innerHTML = '';
        window.DRG_PAGES[route](loginContent);
      }
      return;
    }

    if (!window.DRG_AUTH.getToken()) {
      window.location.hash = '#/login';
      showLogin();
      if (window.DRG_PAGES && window.DRG_PAGES.login) {
        var c = document.getElementById('login-content');
        if (c) { c.innerHTML = ''; window.DRG_PAGES.login(c); }
      }
      return;
    }

    showApp();
    setActiveNav(route);
    var titles = { dashboard: 'Dashboard', users: 'Usuários', roles: 'Perfis', apikeys: 'Chaves API', extraction: 'Extração', training: 'Treinamento', prediction: 'Predição', apiDocs: 'Documentação da API', apiUse: 'Usar API', profile: 'Perfil', settings: 'Configurações do sistema', page404: 'Não encontrado', page500: 'Erro' };
    setTitle(titles[route] || route, titles[route] || route);
    var appContent = document.getElementById('app-content');
    if (appContent) renderPage(route, appContent);
  }

  function init() {
    document.getElementById('logout-btn').addEventListener('click', function (e) {
      e.preventDefault();
      window.DRG_AUTH.logout();
      window.location.hash = '#/login';
      showLogin();
      if (window.DRG_PAGES && window.DRG_PAGES.login) {
        var c = document.getElementById('login-content');
        if (c) { c.innerHTML = ''; window.DRG_PAGES.login(c); }
      }
    });

    window.addEventListener('hashchange', loadPage);

    var baseUrl = typeof window.DRG_BASE_URL !== 'undefined' ? window.DRG_BASE_URL : '';
    fetch(baseUrl + '/api/setup/status')
      .then(function (r) { return r.json(); })
      .catch(function () { return { needs_setup: false }; })
      .then(function (data) {
        if (data.needs_setup) {
          showInstall();
          return;
        }
        if (window.DRG_AUTH.getToken()) {
          window.DRG_AUTH.getMe().then(function () {
            if (getRoute() === 'login' || getRoute() === 'register') window.location.hash = '#/dashboard';
            loadPage();
          }).catch(function () {
            window.DRG_AUTH.logout();
            window.location.hash = '#/login';
            showLogin();
            if (window.DRG_PAGES && window.DRG_PAGES.login) {
              var c = document.getElementById('login-content');
              if (c) { c.innerHTML = ''; window.DRG_PAGES.login(c); }
            }
          });
        } else {
          loadPage();
        }
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
