const auth = {
  getToken:    () => localStorage.getItem('token'),
  getUser:     () => JSON.parse(localStorage.getItem('user') || 'null'),
  isLoggedIn:  () => !!localStorage.getItem('token'),

  isProfileComplete: () => {
    const user = auth.getUser();
    if (!user) return false;
    return !!(user.fullName && user.mobileNumber && user.age);
  },

  setSession: (token, user) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
  },

  updateUser: (user) => {
    localStorage.setItem('user', JSON.stringify(user));
  },

  clearSession: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  logout: async () => {
    auth.clearSession();
    try { await api.logout(); } catch(e) {}
    renderNavbar();
    window.location.href = 'index.html';
  },
};

function renderNavbar() {
  const right = document.getElementById('navbar-right');
  if (!right) return;

  if (auth.isLoggedIn()) {
    const user       = auth.getUser();
    const incomplete = !auth.isProfileComplete();
    const initial    = (user?.username || 'U')[0].toUpperCase();

    right.innerHTML = `
      <div class="navbar__navigation">
        <a href="catalog.html" class="navbar__link">
          <img src="assets/icons/browse.svg" style="width:24px;height:24px;" alt="" />
          Browse Courses
        </a>
        <button class="navbar__link" id="navbar-enrolled-btn">
          <img src="assets/icons/enrolled.svg" style="width:24px;height:24px;" alt="" />
          Enrolled Courses
        </button>
      </div>
      <button class="navbar__profile-btn" id="navbar-profile-btn">
        ${user?.avatar
          ? `<img class="navbar__avatar" src="${user.avatar}" alt="avatar" />`
          : `<div class="navbar__avatar-placeholder">${initial}</div>`
        }
        ${incomplete ? '<span class="navbar__dot"></span>' : '<span class="navbar__dot navbar__dot--complete"></span>'}
      </button>
    `;

    document.getElementById('navbar-enrolled-btn')
      .addEventListener('click', () => {
        if (typeof openSidebar === 'function') openSidebar();
      });

    document.getElementById('navbar-profile-btn')
      .addEventListener('click', () => openProfileModal());

  } else {
    right.innerHTML = `
      <div class="navbar__auth">
        <div class="navbar__navigation">
          <a href="catalog.html" class="navbar__link">
            <img src="assets/icons/browse.svg" style="width:24px;height:24px;" alt="" />
            Browse Courses
          </a>
        </div>
        <div style="display:flex;gap:8px;align-items:center;">
          <button class="navbar__btn navbar__btn--login" id="navbar-login-btn">Log In</button>
          <button class="navbar__btn navbar__btn--signup" id="navbar-signup-btn">Sign Up</button>
        </div>
      </div>
    `;

    document.getElementById('navbar-login-btn')
      .addEventListener('click', () => openModal('login'));
    document.getElementById('navbar-signup-btn')
      .addEventListener('click', () => openModal('register'));
  }
}

function requireAuth(callback) {
  if (!auth.isLoggedIn()) { openModal('login'); return false; }
  callback();
  return true;
}

function requireProfile(callback) {
  if (!auth.isLoggedIn()) { openModal('login'); return false; }
  if (!auth.isProfileComplete()) { openProfileModal(); return false; }
  callback();
  return true;
}

document.addEventListener('DOMContentLoaded', renderNavbar);