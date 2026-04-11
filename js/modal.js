function openModal(type) {
  closeAllModals();
  const overlay = document.getElementById(`modal-${type}`);
  if (overlay) {
    overlay.classList.add('is-open');
    document.body.style.overflow = 'hidden';
  }
}

function closeModal(type) {
  const overlay = document.getElementById(`modal-${type}`);
  if (overlay) {
    overlay.classList.remove('is-open');
    document.body.style.overflow = '';
  }
}

function closeAllModals() {
  document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('is-open'));
  document.body.style.overflow = '';
}

document.addEventListener('click', (e) => {
  if (!e.target.classList.contains('modal-overlay')) return;
  const type = e.target.id.replace('modal-', '');
  if (type === 'profile' && !auth.isProfileComplete()) {
    if (!confirm('Your profile is incomplete. You won\'t be able to enroll in courses until you complete it. Close anyway?')) return;
  }
  closeAllModals();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeAllModals();
});


function initLoginModal() {
  const html = `
  <div class="modal-overlay" id="modal-login">
    <div class="modal">
      <div class="modal__header">
        <h2 class="modal__title text-h2">Welcome Back</h2>
        <p class="modal__subtitle text-body-xs">Log in and continue your learning</p>
        <button class="modal__close" onclick="closeModal('login')">
          <svg width="24" height="24" viewBox="0 0 16 16" fill="none">
            <path d="M12 4L4 12M4 4l8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
        </button>
      </div>
      <div class="modal__body">
        <div class="modal__api-error text-body-xs" id="login-api-error"></div>
        <div class="form-group">
          <label class="form-label text-body-xs">Email *</label>
          <input class="form-input text-body-xs" type="email" id="login-email" placeholder="you@example.com" />
          <span class="form-error text-micro-regular" id="login-email-error"></span>
        </div>
        <div class="form-group">
          <label class="form-label text-body-xs">Password *</label>
          <div class="input-wrapper">
            <input class="form-input text-body-xs" type="password" id="login-password" placeholder="••••••••" />
            <button class="input-eye" type="button" onclick="togglePassword('login-password', this)">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
            </button>
          </div>
          <span class="form-error text-micro-regular" id="login-password-error"></span>
        </div>
      </div>
      <div class="modal__footer">
        <button class="btn btn--primary text-body-s" id="login-submit">Log In</button>
        <div class="modal__or text-micro-regular">or</div>
        <p class="modal__switch text-body-xs">Don't have an account? <a onclick="openModal('register')">Sign Up</a></p>
      </div>
    </div>
  </div>`;
  document.body.insertAdjacentHTML('beforeend', html);
  document.getElementById('login-submit').addEventListener('click', handleLogin);
  document.getElementById('modal-login').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleLogin();
  });
}

async function handleLogin() {
  const email    = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  let valid = true;

  setError('login-email-error', '');
  setError('login-password-error', '');
  hideApiError('login-api-error');

  if (!email || !isValidEmail(email)) {
    setError('login-email-error', 'Please enter a valid email');
    valid = false;
  }
  if (!password || password.length < 3) {
    setError('login-password-error', 'Password must be at least 3 characters');
    valid = false;
  }
  if (!valid) return;

  setLoading('login-submit', true, 'Logging in...');

  try {
    const res = await api.login({ email, password });
    if (res.data?.token) {
      auth.setSession(res.data.token, res.data.user);
      closeModal('login');
      renderNavbar();
      if (typeof onAuthSuccess === 'function') onAuthSuccess();
    } else {
      showApiError('login-api-error', res.message || 'Invalid email or password');
    }
  } catch (e) {
    showApiError('login-api-error', 'Something went wrong. Try again.');
  }

  setLoading('login-submit', false, 'Log In');
}

let registerStep = 1;
let registerData = {};

function initRegisterModal() {
  const html = `
  <div class="modal-overlay" id="modal-register">
    <div class="modal">
      <div class="modal__header">
        <button class="modal__back" id="reg-back-btn" style="display:none" onclick="handleRegisterBack()">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 12L6 8l4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
        <h2 class="modal__title text-h2">Create Account</h2>
        <p class="modal__subtitle text-body-xs">Join and start learning today</p>
        <button class="modal__close" onclick="closeModal('register')">
          <svg width="24" height="24" viewBox="0 0 16 16" fill="none">
            <path d="M12 4L4 12M4 4l8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
        </button>
      </div>
      <div class="modal__steps">
        <div class="step-bar"><div class="step-bar__fill"></div></div>
        <div class="step-bar"><div class="step-bar__fill"></div></div>
        <div class="step-bar"><div class="step-bar__fill"></div></div>
      </div>
      <div class="modal__body" id="reg-body"></div>
      <div class="modal__footer">
        <button class="btn btn--primary text-body-s" id="reg-next-btn">Next</button>
        <div class="modal__or text-micro-regular">or</div>
        <p class="modal__switch text-body-xs">Already have an account? <a onclick="openModal('login')">Log In</a></p>
      </div>
    </div>
  </div>`;
  document.body.insertAdjacentHTML('beforeend', html);
  renderRegisterStep(1);
  document.getElementById('reg-next-btn').addEventListener('click', handleRegisterNext);
}

function renderRegisterStep(step) {
  registerStep = step;
  const body    = document.getElementById('reg-body');
  const btn     = document.getElementById('reg-next-btn');
  const backBtn = document.getElementById('reg-back-btn');

  document.querySelectorAll('#modal-register .step-bar').forEach((bar, i) => {
    const fill = bar.querySelector('.step-bar__fill');
    if (i < step - 1) {
      bar.style.background = 'var(--color-purple-500)';
      fill.style.width = '100%';
      fill.style.background = 'var(--color-purple-500)';
    } else if (i === step - 1) {
      bar.style.background = 'var(--color-purple-200)';
      fill.style.width = '100%';
      fill.style.background = 'var(--color-purple-200)';
    } else {
      bar.style.background = 'var(--color-purple-50)';
      fill.style.width = '0%';
    }
  });

  if (backBtn) backBtn.style.display = step > 1 ? 'flex' : 'none';

  if (step === 1) {
    btn.textContent = 'Next';
    body.innerHTML = `
      <div class="modal__api-error text-body-xs" id="reg-api-error"></div>
      <div class="form-group">
        <label class="form-label text-body-xs">Email *</label>
        <input class="form-input text-body-xs" type="email" id="reg-email" placeholder="you@example.com" value="${registerData.email || ''}" />
        <span class="form-error text-micro-regular" id="reg-email-error"></span>
      </div>`;
  }

  if (step === 2) {
    btn.textContent = 'Next';
    body.innerHTML = `
      <div class="form-group">
        <label class="form-label text-body-xs">Password *</label>
        <div class="input-wrapper">
          <input class="form-input text-body-xs" type="password" id="reg-password" placeholder="••••••••" />
          <button class="input-eye" type="button" onclick="togglePassword('reg-password', this)">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
          </button>
        </div>
        <span class="form-error text-micro-regular" id="reg-password-error"></span>
      </div>
      <div class="form-group">
        <label class="form-label text-body-xs">Confirm Password *</label>
        <div class="input-wrapper">
          <input class="form-input text-body-xs" type="password" id="reg-confirm" placeholder="••••••••" />
          <button class="input-eye" type="button" onclick="togglePassword('reg-confirm', this)">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
          </button>
        </div>
        <span class="form-error text-micro-regular" id="reg-confirm-error"></span>
      </div>`;
  }

  if (step === 3) {
    btn.textContent = 'Sign Up';
    body.innerHTML = `
      <div class="modal__api-error text-body-xs" id="reg-api-error"></div>
      <div class="form-group">
        <label class="form-label text-body-xs">Username *</label>
        <input class="form-input text-body-xs" type="text" id="reg-username" placeholder="username" />
        <span class="form-error text-micro-regular" id="reg-username-error"></span>
      </div>
      <div class="form-group">
        <label class="form-label text-body-xs">Upload Avatar <span class="text-micro-regular" style="color:var(--color-grey-400)">(optional)</span></label>
        <div class="avatar-drop text-body-xs" id="avatar-drop" onclick="document.getElementById('avatar-input').click()">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
          </svg>
          <span>Drag and drop or <u>Upload file</u></span>
          <small class="text-micro-regular">JPG, PNG or WebP</small>
        </div>
        <img class="avatar-preview" id="avatar-preview" src="" alt="" />
        <input type="file" id="avatar-input" accept=".jpg,.jpeg,.png,.webp" style="display:none" />
        <span class="form-error text-micro-regular" id="avatar-error"></span>
      </div>`;

    setTimeout(() => {
      document.getElementById('avatar-input').addEventListener('change', handleAvatarSelect);
    }, 0);
  }

  setTimeout(() => {
    const inputs = document.getElementById('reg-body').querySelectorAll('input');
    inputs.forEach(inp => inp.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleRegisterNext();
    }));
  }, 0);
}

function handleAvatarSelect(e) {
  const file = e.target.files[0];
  if (!file) return;
  const allowed = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowed.includes(file.type)) {
    setError('avatar-error', 'Only JPG, PNG, WebP allowed');
    return;
  }
  setError('avatar-error', '');
  registerData.avatarFile = file;
  const reader = new FileReader();
  reader.onload = (ev) => {
    const preview = document.getElementById('avatar-preview');
    const drop    = document.getElementById('avatar-drop');
    preview.src = ev.target.result;
    preview.style.display = 'block';
    drop.style.display = 'none';
  };
  reader.readAsDataURL(file);
}

async function handleRegisterNext() {
  if (registerStep === 1) {
    const email = document.getElementById('reg-email').value.trim();
    setError('reg-email-error', '');
    if (!email || !isValidEmail(email)) {
      setError('reg-email-error', 'Please enter a valid email');
      return;
    }
    setLoading('reg-next-btn', true, 'Checking...');
    try {
      const formData = new FormData();
      formData.append('username', 'tempcheck');
      formData.append('email', email);
      formData.append('password', 'temppass');
      formData.append('password_confirmation', 'temppass');
      const res = await fetch('https://api.redclass.redberryinternship.ge/api/register', {
        method: 'POST', body: formData,
      }).then(r => r.json());
      if (res.errors?.email) {
        setError('reg-email-error', res.errors.email[0]);
        setLoading('reg-next-btn', false, 'Next');
        return;
      }
    } catch(e) {}
    setLoading('reg-next-btn', false, 'Next');
    registerData.email = email;
    renderRegisterStep(2);

  } else if (registerStep === 2) {
    const password = document.getElementById('reg-password').value;
    const confirm  = document.getElementById('reg-confirm').value;
    setError('reg-password-error', '');
    setError('reg-confirm-error', '');
    let valid = true;
    if (!password || password.length < 3) { setError('reg-password-error', 'Password must be at least 3 characters'); valid = false; }
    if (password !== confirm) { setError('reg-confirm-error', 'Passwords do not match'); valid = false; }
    if (!valid) return;
    registerData.password = password;
    renderRegisterStep(3);

  } else if (registerStep === 3) {
    const username = document.getElementById('reg-username').value.trim();
    setError('reg-username-error', '');
    hideApiError('reg-api-error');
    if (!username || username.length < 3) { setError('reg-username-error', 'Username must be at least 3 characters'); return; }
    registerData.username = username;
    setLoading('reg-next-btn', true, 'Creating account...');
    try {
      const formData = new FormData();
      formData.append('username', registerData.username);
      formData.append('email', registerData.email);
      formData.append('password', registerData.password);
      formData.append('password_confirmation', registerData.password);
      if (registerData.avatarFile) formData.append('avatar', registerData.avatarFile);
      const res = await fetch('https://api.redclass.redberryinternship.ge/api/register', {
        method: 'POST', body: formData,
      }).then(r => r.json());
      if (res.data?.token) {
        auth.setSession(res.data.token, res.data.user);
        registerData = {};
        closeModal('register');
        renderNavbar();
        if (typeof onAuthSuccess === 'function') onAuthSuccess();
      } else {
        const errs = res.errors || {};
        if (errs.username) setError('reg-username-error', errs.username[0]);
        if (errs.email) { renderRegisterStep(1); setTimeout(() => setError('reg-email-error', errs.email[0]), 0); }
        showApiError('reg-api-error', res.message || 'Registration failed');
      }
    } catch (e) {
      showApiError('reg-api-error', 'Something went wrong. Try again.');
    }
    setLoading('reg-next-btn', false, 'Sign Up');
  }
}

function handleRegisterBack() {
  if (registerStep > 1) renderRegisterStep(registerStep - 1);
}

function initProfileModal() {
  const html = `
  <div class="modal-overlay" id="modal-profile">
    <div class="modal modal--profile">
      <div class="modal__header modal__header--profile">
        <h2 class="modal__title text-h2">Profile</h2>
        <button class="modal__close" onclick="closeProfileModal()">
          <svg width="24" height="24" viewBox="0 0 16 16" fill="none">
            <path d="M12 4L4 12M4 4l8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
        </button>
      </div>
      <div class="modal__body" id="profile-body">
        <div class="profile__user-row">
          <div class="profile__avatar-wrap">
            <img class="profile__avatar" id="profile-avatar-img" src="" alt="avatar" />
            <div class="profile__avatar-placeholder text-h4" id="profile-avatar-placeholder">U</div>
          </div>
          <div class="profile__user-info">
            <span class="profile__username text-h4" id="profile-username-display">Username</span>
            <span class="profile__status text-micro-regular" id="profile-status-text"></span>
          </div>
        </div>

        <div class="modal__api-error text-body-xs" id="profile-api-error"></div>

        <div class="form-group">
          <label class="form-label text-body-xs">Full Name</label>
          <div class="input-wrapper">
            <input class="form-input text-body-xs profile-input" type="text" id="profile-fullname" placeholder="Username" />
            <span class="input-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </span>
          </div>
          <span class="form-error text-micro-regular" id="profile-fullname-error"></span>
        </div>

        <div class="form-group">
          <label class="form-label text-body-xs">Email</label>
          <div class="input-wrapper">
            <input class="form-input text-body-xs profile-input profile-input--readonly" type="email" id="profile-email" placeholder="Email@gmail.com" readonly />
            <span class="input-icon input-icon--success">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </span>
          </div>
        </div>

        <div class="profile__row">
          <div class="form-group" style="flex:1">
            <label class="form-label text-body-xs">Mobile Number</label>
            <div class="input-wrapper">
              <span class="input-prefix text-body-xs">+995</span>
              <input class="form-input text-body-xs profile-input profile-input--prefix" type="tel" id="profile-mobile" placeholder="599209820" />
              <span class="input-icon" id="profile-mobile-icon"></span>
            </div>
            <span class="form-error text-micro-regular" id="profile-mobile-error"></span>
          </div>

          <div class="form-group profile__age-group">
            <label class="form-label text-body-xs">Age</label>
            <div class="input-wrapper">
              <select class="form-input text-body-xs profile-input profile-select" id="profile-age">
                <option value="">--</option>
              </select>
            </div>
            <span class="form-error text-micro-regular" id="profile-age-error"></span>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label text-body-xs">Upload Avatar</label>
          <div class="avatar-drop text-body-xs" id="profile-avatar-drop" onclick="document.getElementById('profile-avatar-input').click()">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
            </svg>
            <span>Drag and drop or <u>Upload file</u></span>
            <small class="text-micro-regular">JPG, PNG or WebP</small>
          </div>
          <img class="avatar-preview" id="profile-avatar-preview" src="" alt="" />
          <input type="file" id="profile-avatar-input" accept=".jpg,.jpeg,.png,.webp" style="display:none" />
          <span class="form-error text-micro-regular" id="profile-avatar-error"></span>
        </div>
      </div>

      <div class="modal__footer">
        <button class="btn btn--primary text-body-s" id="profile-submit">Update Profile</button>
      </div>
    </div>
  </div>`;
  document.body.insertAdjacentHTML('beforeend', html);

  const ageSelect = document.getElementById('profile-age');
  for (let i = 1; i <= 120; i++) {
    const opt = document.createElement('option');
    opt.value = i;
    opt.textContent = i;
    ageSelect.appendChild(opt);
  }

  document.getElementById('profile-avatar-input').addEventListener('change', handleProfileAvatarSelect);
  document.getElementById('profile-submit').addEventListener('click', handleProfileSave);
  document.getElementById('profile-fullname').addEventListener('blur', validateFullName);
  document.getElementById('profile-mobile').addEventListener('blur', validateMobile);
  document.getElementById('profile-age').addEventListener('change', validateAge);
  document.getElementById('profile-mobile').addEventListener('input', (e) => {
    e.target.value = e.target.value.replace(/\D/g, '').slice(0, 9);
  });
}

function openProfileModal() {
  const user = auth.getUser();
  if (!user) return;

  document.getElementById('profile-username-display').textContent = user.username || 'Username';
  document.getElementById('profile-email').value    = user.email || '';
  document.getElementById('profile-fullname').value = user.fullName || '';
  document.getElementById('profile-mobile').value   = (user.mobileNumber || '').replace(/\D/g, '');
  document.getElementById('profile-age').value      = user.age || '';

  const mobileVal  = (user.mobileNumber || '').replace(/\D/g, '');
  const mobileIcon = document.getElementById('profile-mobile-icon');
  if (mobileVal.length === 9 && mobileVal.startsWith('5')) {
    mobileIcon.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-grey-300)" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>`;
  } else {
    mobileIcon.innerHTML = '';
  }

  if (user.avatar) {
    document.getElementById('profile-avatar-img').src = user.avatar;
    document.getElementById('profile-avatar-img').style.display = 'block';
    document.getElementById('profile-avatar-placeholder').style.display = 'none';
  } else {
    document.getElementById('profile-avatar-img').style.display = 'none';
    document.getElementById('profile-avatar-placeholder').style.display = 'flex';
    document.getElementById('profile-avatar-placeholder').textContent = (user.username || 'U')[0].toUpperCase();
  }

  const complete = auth.isProfileComplete();
  const statusEl = document.getElementById('profile-status-text');
  statusEl.textContent = complete ? 'Profile is Complete' : 'Profile is Incomplete';
  statusEl.className   = 'profile__status text-micro-regular ' + (complete ? 'profile__status--complete' : 'profile__status--incomplete');

  openModal('profile');
}

function closeProfileModal() {
  if (!auth.isProfileComplete()) {
    if (!confirm('Your profile is incomplete. You won\'t be able to enroll in courses until you complete it. Close anyway?')) return;
  }
  closeModal('profile');
}

function handleProfileAvatarSelect(e) {
  const file = e.target.files[0];
  if (!file) return;
  const allowed = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowed.includes(file.type)) {
    setError('profile-avatar-error', 'Only JPG, PNG, WebP allowed');
    return;
  }
  setError('profile-avatar-error', '');
  const reader = new FileReader();
  reader.onload = (ev) => {
    const preview = document.getElementById('profile-avatar-preview');
    const drop    = document.getElementById('profile-avatar-drop');
    const img     = document.getElementById('profile-avatar-img');
    preview.src = ev.target.result;
    preview.style.display = 'block';
    drop.style.display = 'none';
    img.src = ev.target.result;
    img.style.display = 'block';
    document.getElementById('profile-avatar-placeholder').style.display = 'none';
  };
  reader.readAsDataURL(file);
}

function validateFullName() {
  const val = document.getElementById('profile-fullname').value.trim();
  if (!val)            { setError('profile-fullname-error', 'Name is required'); return false; }
  if (val.length < 3)  { setError('profile-fullname-error', 'Name must be at least 3 characters'); return false; }
  if (val.length > 50) { setError('profile-fullname-error', 'Name must not exceed 50 characters'); return false; }
  setError('profile-fullname-error', '');
  return true;
}

function validateMobile() {
  const raw  = document.getElementById('profile-mobile').value.replace(/\D/g, '');
  const icon = document.getElementById('profile-mobile-icon');
  if (!raw) {
    setError('profile-mobile-error', 'Mobile number is required');
    if (icon) icon.innerHTML = '';
    return false;
  }
  if (!raw.startsWith('5')) {
    setError('profile-mobile-error', 'Georgian mobile numbers must start with 5');
    if (icon) icon.innerHTML = '';
    return false;
  }
  if (raw.length !== 9) {
    setError('profile-mobile-error', 'Mobile number must be exactly 9 digits');
    if (icon) icon.innerHTML = '';
    return false;
  }
  setError('profile-mobile-error', '');
  if (icon) icon.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-grey-300)" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>`;
  return true;
}

function validateAge() {
  const raw = document.getElementById('profile-age').value;
  const val = parseInt(raw);
  if (!raw) { setError('profile-age-error', 'Age is required'); return false; }
  if (val < 16) { setError('profile-age-error', 'You must be at least 16 years old to enroll'); return false; }
  setError('profile-age-error', '');
  return true;
}

async function handleProfileSave() {
  const nameOk   = validateFullName();
  const mobileOk = validateMobile();
  const ageOk    = validateAge();
  if (!nameOk || !mobileOk || !ageOk) return;

  hideApiError('profile-api-error');
  setLoading('profile-submit', true, 'Saving...');

  try {
    const formData = new FormData();
    formData.append('_method', 'PUT');
    formData.append('full_name', document.getElementById('profile-fullname').value.trim());
    formData.append('mobile_number', document.getElementById('profile-mobile').value.replace(/\D/g, ''));
    formData.append('age', document.getElementById('profile-age').value);

    const avatarFile = document.getElementById('profile-avatar-input').files[0];
    if (avatarFile) formData.append('avatar', avatarFile);

    const res = await fetch('https://api.redclass.redberryinternship.ge/api/profile', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${auth.getToken()}` },
      body: formData,
    }).then(r => r.json());

    if (res.data) {
      auth.updateUser(res.data);
      closeModal('profile');
      renderNavbar();
    } else {
      const errs = res.errors || {};
      if (errs.full_name)     setError('profile-fullname-error', errs.full_name[0]);
      if (errs.mobile_number) setError('profile-mobile-error', errs.mobile_number[0]);
      if (errs.age)           setError('profile-age-error', errs.age[0]);
      showApiError('profile-api-error', res.message || 'Failed to update profile');
    }
  } catch(e) {
    showApiError('profile-api-error', 'Something went wrong. Try again.');
  }

  setLoading('profile-submit', false, 'Update Profile');
}


function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function setError(id, msg) {
  const el = document.getElementById(id);
  if (el) el.textContent = msg;
}

function showApiError(id, msg) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg;
  el.classList.add('is-visible');
}

function hideApiError(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('is-visible');
}

function setLoading(btnId, loading, text) {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  btn.disabled = loading;
  btn.textContent = text;
  btn.classList.toggle('btn--loading', loading);
}

function togglePassword(inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input) return;
  const isHidden = input.type === 'password';
  input.type = isHidden ? 'text' : 'password';
  btn.innerHTML = isHidden
    ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19M1 1l22 22"/>
      </svg>`
    : `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
        <circle cx="12" cy="12" r="3"/>
      </svg>`;
}

document.addEventListener('DOMContentLoaded', () => {
  initLoginModal();
  initRegisterModal();
  initProfileModal();
});