/**
 * API helper: fetch com JWT e base URL
 */
window.DRG_API = (function () {
  function getToken() {
    return window.DRG_AUTH ? window.DRG_AUTH.getToken() : null;
  }

  function headers(extra) {
    var h = { 'Content-Type': 'application/json' };
    var t = getToken();
    if (t) h['Authorization'] = 'Bearer ' + t;
    if (extra) Object.assign(h, extra);
    return h;
  }

  function base() {
    return typeof window.DRG_BASE_URL !== 'undefined' ? window.DRG_BASE_URL : '';
  }

  function request(method, path, body) {
    var url = base() + path;
    var opt = { method: method, headers: headers() };
    if (body !== undefined && body !== null) opt.body = JSON.stringify(body);
    return fetch(url, opt).then(function (res) {
      var contentType = res.headers.get('Content-Type') || '';
      var data = contentType.indexOf('application/json') !== -1 ? res.json() : res.text();
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

  return {
    get: function (path) { return request('GET', path); },
    post: function (path, body) { return request('POST', path, body); },
    put: function (path, body) { return request('PUT', path, body); },
    delete: function (path) { return request('DELETE', path); },
    headers: headers,
    getToken: getToken
  };
})();
