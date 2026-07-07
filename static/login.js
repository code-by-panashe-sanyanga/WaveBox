// WaveBox login page — log in or register, then go to the library.

const authMsg = document.getElementById('auth-msg');

function showAuthMsg(text, isError) {
  authMsg.textContent = text;
  authMsg.className = 'auth-msg' + (isError ? ' error' : '');
}

// If already logged in, skip this page.
if (getToken()) {
  apiAuth('/api/auth/me')
    .then(function () {
      window.location.href = '/';
    })
    .catch(function () {
      clearToken();
    });
}

document.getElementById('tab-login').onclick = function () {
  document.getElementById('tab-login').classList.add('active');
  document.getElementById('tab-register').classList.remove('active');
  document.getElementById('login-form').classList.remove('hidden');
  document.getElementById('register-form').classList.add('hidden');
  showAuthMsg('');
};

document.getElementById('tab-register').onclick = function () {
  document.getElementById('tab-register').classList.add('active');
  document.getElementById('tab-login').classList.remove('active');
  document.getElementById('register-form').classList.remove('hidden');
  document.getElementById('login-form').classList.add('hidden');
  showAuthMsg('');
};

document.getElementById('login-form').onsubmit = function (e) {
  e.preventDefault();
  const username = document.getElementById('login-username').value.trim().toLowerCase();
  const password = document.getElementById('login-password').value;

  apiAuth('/api/auth/login', {
    method: 'POST',
    body: { username: username, password: password }
  })
    .then(function (data) {
      setToken(data.token);
      window.location.href = '/';
    })
    .catch(function (err) {
      showAuthMsg(err.message, true);
    });
};

document.getElementById('register-form').onsubmit = function (e) {
  e.preventDefault();
  const username = document.getElementById('reg-username').value.trim().toLowerCase();
  const displayName = document.getElementById('reg-display').value.trim();
  const password = document.getElementById('reg-password').value;

  apiAuth('/api/auth/register', {
    method: 'POST',
    body: {
      username: username,
      password: password,
      display_name: displayName || username
    }
  })
    .then(function (data) {
      setToken(data.token);
      window.location.href = '/';
    })
    .catch(function (err) {
      showAuthMsg(err.message, true);
    });
};
