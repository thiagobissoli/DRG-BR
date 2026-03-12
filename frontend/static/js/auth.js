/**
 * Auth: token, me, login, verify2fa, logout
 */
window.DRG_AUTH = (function () {
  var TOKEN_KEY = 'access_token';
  var user = null;

  function getToken() {
    return localStorage.getItem(TOKEN_KEY);
  }

  function setToken(token) {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  }

  function getMe() {
    return window.DRG_API.get('/api/auth/me').then(function (data) {
      user = data;
      return data;
    });
  }

  function login(email, password) {
    return window.DRG_API.post('/api/auth/login', { email: email, password: password }).then(function (data) {
      if (data.requires_2fa && data.temporary_token) {
        return { success: false, requires2fa: true, temporary_token: data.temporary_token, message: data.message || 'Informe o código do aplicativo.' };
      }
      setToken(data.access_token);
      user = data.user;
      return { success: true };
    }).catch(function (err) {
      var msg = 'Falha no login';
      if (err.status === 401) msg = 'Email ou senha inválidos.';
      else if (err.status === 403) msg = 'Conta desativada.';
      else if (err.data && err.data.error) msg = err.data.error;
      return { success: false, message: msg };
    });
  }

  function verify2fa(temporaryToken, code) {
    return window.DRG_API.post('/api/auth/2fa/verify-login', { temporary_token: temporaryToken, code: code.trim() }).then(function (data) {
      setToken(data.access_token);
      user = data.user;
      return { success: true };
    }).catch(function (err) {
      return { success: false, message: (err.data && err.data.error) || 'Código inválido ou expirado.' };
    });
  }

  function logout() {
    setToken(null);
    user = null;
  }

  function getUser() {
    return user;
  }

  function setUser(u) {
    user = u;
  }

  return {
    getToken: getToken,
    setToken: setToken,
    getMe: getMe,
    login: login,
    verify2fa: verify2fa,
    logout: logout,
    getUser: getUser,
    setUser: setUser
  };
})();
