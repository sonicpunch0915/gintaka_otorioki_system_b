// GAS Endpoint URL - デプロイURLに置き換えてください
var GAS_ENDPOINT = 'https://script.google.com/macros/s/AKfycbzS49MQsFF_p5aTsXKWMrYaMWyQzl1cZof2Aegx8bm4hq144nvyrpE47E8QfNF468fghg/exec';

// CSRF token generation
function generateCsrfToken() {
  var array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, function(b) { return b.toString(16).padStart(2, '0'); }).join('');
}

// Initialize CSRF token in sessionStorage if not exists
function initCsrfToken() {
  if (!sessionStorage.getItem('csrfToken')) {
    sessionStorage.setItem('csrfToken', generateCsrfToken());
  }
  return sessionStorage.getItem('csrfToken');
}

// GET request wrapper
function apiGet(action, params) {
  var url = GAS_ENDPOINT + '?action=' + encodeURIComponent(action);
  if (params) {
    Object.keys(params).forEach(function(key) {
      url += '&' + encodeURIComponent(key) + '=' + encodeURIComponent(params[key]);
    });
  }
  // Add auth token if available
  var token = sessionStorage.getItem('authToken');
  if (token) {
    url += '&token=' + encodeURIComponent(token);
  }
  return fetch(url)
    .then(function(res) { return res.json(); })
    .then(function(data) {
      if (data.status === 'error') {
        if (data.code === 'TOKEN_INVALID') {
          sessionStorage.removeItem('authToken');
          // If on admin page, redirect to login
          if (typeof showLoginSection === 'function') showLoginSection();
        }
        throw data;
      }
      return data;
    });
}

// POST request wrapper
function apiPost(payload) {
  var body = Object.assign({}, payload);
  body.csrf_token = initCsrfToken();
  var token = sessionStorage.getItem('authToken');
  if (token) body.token = token;
  
  return fetch(GAS_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },  // text/plain to avoid CORS preflight with GAS
    body: JSON.stringify(body)
  })
    .then(function(res) { return res.json(); })
    .then(function(data) {
      if (data.status === 'error') {
        if (data.code === 'TOKEN_INVALID') {
          sessionStorage.removeItem('authToken');
          if (typeof showLoginSection === 'function') showLoginSection();
        }
        throw data;
      }
      return data;
    });
}
