// WaveBox auth helper — token in localStorage, shared by library + player pages.

const TOKEN_KEY = 'wavebox_token';

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

// Fetch JSON with the Bearer token attached.
async function apiAuth(path, options) {
  const opts = options || {};
  const headers = Object.assign({}, opts.headers || {});
  const token = getToken();

  if (token) {
    headers.Authorization = 'Bearer ' + token;
  }

  if (opts.body && typeof opts.body === 'object') {
    headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(opts.body);
  }

  opts.headers = headers;

  const res = await fetch(path, opts);
  let data = {};
  try {
    data = await res.json();
  } catch (err) {
    data = {};
  }

  if (!res.ok) {
    const msg = data.detail || data.error || 'Request failed';
    throw new Error(typeof msg === 'string' ? msg : 'Request failed');
  }

  return data;
}

// Redirect to /login if there is no valid session.
async function requireAuth() {
  const token = getToken();
  if (!token) {
    window.location.href = '/login';
    return null;
  }

  try {
    return await apiAuth('/api/auth/me');
  } catch (err) {
    clearToken();
    window.location.href = '/login';
    return null;
  }
}

async function logout() {
  try {
    await apiAuth('/api/auth/logout', { method: 'POST' });
  } catch (err) {
    // Still clear local token if the server already dropped the session.
  }
  clearToken();
  window.location.href = '/login';
}

function wireLogoutButton() {
  const btn = document.getElementById('btn-logout');
  if (btn) {
    btn.onclick = logout;
  }
}

function setUserPill(user) {
  const pill = document.getElementById('user-pill');
  if (pill && user) {
    pill.textContent = user.display_name || user.username;
  }
}
