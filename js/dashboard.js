// Banner
function initHeroCarousel() {
  const dots  = document.querySelectorAll('.hero__dot');
  const left  = document.querySelector('.hero__arrow--left');
  const right = document.querySelector('.hero__arrow--right');
  let current = 0;

  function setDot(index) {
    dots.forEach(d => d.classList.remove('hero__dot--active'));
    dots[index].classList.add('hero__dot--active');
    current = index;
    if (left)  { left.disabled  = current === 0;                  left.style.opacity  = current === 0 ? '0.3' : '1'; }
    if (right) { right.disabled = current === dots.length - 1;    right.style.opacity = current === dots.length - 1 ? '0.3' : '1'; }
  }

  if (left)  left.addEventListener('click',  () => { if (current > 0)                setDot(current - 1); });
  if (right) right.addEventListener('click', () => { if (current < dots.length - 1)  setDot(current + 1); });
  dots.forEach((dot, i) => dot.addEventListener('click', () => setDot(i)));

  setDot(0);
}

// DASHBOARD
function onAuthSuccess() {
  initDashboard();
}

async function initDashboard() {
  const root = document.getElementById('dashboard-root');
  if (!root) return;

  root.innerHTML = `
    <section class="featured" id="featured-section">
      <div class="section__header">
        <h2 class="section__title">Start Learning Today</h2>
      </div>
      <div class="section__header">
        <h5 class="section__subtitle">Choose from our most popular courses and begin your journey</h5>
      </div>
      <div class="featured__grid" id="featured-grid">
        ${skeletonCards(3, 'featured')}
      </div>
    </section>

    <section class="in-progress" id="in-progress-section">
      <div class="section__header">
        <h2 class="section__title">Continue Learning</h2>
        ${auth.isLoggedIn() ? '<button class="section__see-all" id="see-all-btn">See All</button>' : ''}
      </div>
      <div class="section__header">
        <h5 class="section__subtitle">Pick up where you left</h5>
        <a href="sidebar">see all</a>
      </div>
      <div class="in-progress__grid" id="in-progress-grid">
        ${skeletonCards(4, 'progress')}
      </div>
    </section>
  `;

  if (auth.isLoggedIn()) {
    document.getElementById('see-all-btn')?.addEventListener('click', () => {
      if (typeof openSidebar === 'function') openSidebar();
    });
  }

  await loadFeatured();
  await loadInProgress();
}

// FEATURED
async function loadFeatured() {
  const grid = document.getElementById('featured-grid');
  if (!grid) return;
  try {
    const res     = await api.getFeatured();
    const courses = res.data || res || [];
    if (!courses.length) {
      grid.innerHTML = '<p class="empty-text">No featured courses available.</p>';
      return;
    }
    grid.innerHTML = courses.map(c => featuredCard(c)).join('');
  } catch (e) {
    grid.innerHTML = '<p class="empty-text">Failed to load courses.</p>';
  }
}

function featuredCard(c) {
  const rating = c.avgRating ? Number(c.avgRating).toFixed(1) : null;
  return `
    <a href="course.html?id=${c.id}" class="featured__card">
      <div class="featured__card-img">
        <img src="${c.cover || c.image || ''}" alt="${c.title}"
          onerror="this.parentElement.style.background='var(--color-grey-200)'" />
      </div>
      <div class="featured__card-body">
        <div class="featured__card-meta">
          <p style="font-size: 14px; color: var(--color-grey-400);">Lecturer <span class="featured__card-instructor">${c.instructor?.name || ''}</span></p>
          ${rating ? `
          <div class="featured__card-rating">
            <span class="featured__card-star">★</span>
            <span class="featured__card-rating-value">${rating}</span>
          </div>` : ''}
        </div>
        <h3 class="featured__card-title">${c.title}</h3>
        <p class="featured__card-desc">${(c.description || '').slice(0, 120)}${(c.description || '').length > 120 ? '...' : ''}</p>
        <div class="featured__card-footer">
          <p style="font-size: 12px; font-weight: 500; color: var(--color-grey-400);">Starting from<span class="featured__card-price"> $${c.basePrice ?? ''}</span></p>
          <span class="featured__card-btn">Details</span>
        </div>
      </div>
    </a>
  `;
}
// IN PROGRESS
async function loadInProgress() {
  const section = document.getElementById('in-progress-section');
  const grid    = document.getElementById('in-progress-grid');
  if (!grid) return;

  if (!auth.isLoggedIn()) {
    grid.innerHTML = `
      <div class="progress-locked">
        <div class="progress-locked__cards" aria-hidden="true">
          ${[1,2,3,4].map(() => mockProgressCard()).join('')}
        </div>
        <div class="progress-locked__overlay">
          <div class="progress-locked__box">
            <div class="progress-locked__icon">
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                <rect x="8" y="18" width="24" height="18" rx="4" stroke="white" stroke-width="2"/>
                <path d="M13 18v-5a7 7 0 0114 0v5" stroke="white" stroke-width="2" stroke-linecap="round"/>
              </svg>
            </div>
            <p class="progress-locked__text">Sign in to track your learning progress</p>
            <button class="progress-locked__btn" id="locked-login-btn">Log In</button>
          </div>
        </div>
      </div>
    `;
    document.getElementById('locked-login-btn')
      .addEventListener('click', () => openModal('login'));
    return;
  }

  try {
    const res     = await api.getInProgress();
    const courses = res.data || res || [];

    if (!courses.length) {
      if (section) section.style.display = 'none';
      return;
    }

    if (section) section.style.display = '';
    grid.innerHTML = courses.slice(0, 4).map(e => progressCard(e)).join('');

    const seeAll = document.getElementById('see-all-btn');
    if (seeAll) seeAll.style.display = courses.length > 4 ? 'inline-flex' : 'none';

  } catch (e) {
    grid.innerHTML = '<p class="empty-text">Failed to load courses.</p>';
  }
}

function progressCard(enrollment) {
  const c        = enrollment.course || enrollment;
  const progress = enrollment.progress ?? 0;
  return `
    <a href="course.html?id=${c.id}" class="progress__card">
      <div class="progress__card-img">
        <img src="${c.cover || c.image || ''}" alt="${c.title}"
          onerror="this.parentElement.style.background='var(--color-grey-200)'" />
      </div>
      <div class="progress__card-body">
        <span class="progress__card-category">${c.category?.name || ''}</span>
        <h3 class="progress__card-title">${c.title}</h3>
        <p class="progress__card-instructor">${c.instructor?.fullName || c.instructor?.name || ''}</p>
        <div class="progress__bar-wrap">
          <div class="progress__bar">
            <div class="progress__bar-fill" style="width:${progress}%"></div>
          </div>
          <span class="progress__percent">${progress}% Complete</span>
        </div>
      </div>
    </a>
  `;
}

function mockProgressCard() {
  return `
    <div class="progress__card progress__card--mock">
      <div class="progress__card-img progress__card-img--mock"></div>
      <div class="progress__card-body">
        <div class="mock__line mock__line--short"></div>
        <div class="mock__line mock__line--long"></div>
        <div class="mock__line mock__line--mid"></div>
        <div class="mock__bar"></div>
      </div>
    </div>
  `;
}

function skeletonCards(n, type) {
  return Array(n).fill(0).map(() =>
    type === 'featured'
      ? `<div class="featured__card featured__card--skeleton">
           <div class="skel skel--img"></div>
           <div class="skel__body">
             <div class="skel skel--line"></div>
             <div class="skel skel--line skel--short"></div>
           </div>
         </div>`
      : `<div class="progress__card progress__card--skeleton">
           <div class="skel skel--img"></div>
           <div class="skel__body">
             <div class="skel skel--line"></div>
           </div>
         </div>`
  ).join('');
}

// INIT
document.addEventListener('DOMContentLoaded', () => {
  initHeroCarousel();
  initDashboard();
});