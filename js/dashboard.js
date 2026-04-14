function initHeroCarousel() {
  const slides = document.querySelectorAll('.hero__slide');
  const dots   = document.querySelectorAll('.hero__dot');
  const left   = document.querySelector('.hero__arrow--left');
  const right  = document.querySelector('.hero__arrow--right');
  let current  = 0;

  function goTo(index) {
    slides[current].classList.remove('is-active');
    dots[current].classList.remove('hero__dot--active');
    current = index;
    slides[current].classList.add('is-active');
    dots[current].classList.add('hero__dot--active');

    if (left)  { left.disabled  = current === 0; left.style.opacity  = current === 0 ? '0.3' : '1'; }
    if (right) { right.disabled = current === slides.length - 1; right.style.opacity = current === slides.length - 1 ? '0.3' : '1'; }
  }

  if (left)  left.addEventListener('click',  () => { if (current > 0) goTo(current - 1); });
  if (right) right.addEventListener('click', () => { if (current < slides.length - 1) goTo(current + 1); });
  dots.forEach((dot, i) => dot.addEventListener('click', () => goTo(i)));

  goTo(0);
}

function onAuthSuccess() {
  initDashboard();
}

async function initDashboard() {
  const root = document.getElementById('dashboard-root');
  if (!root) return;

  const loggedIn = auth.isLoggedIn();
  let inProgressCourses = [];

  if (loggedIn) {
    try {
      const res = await api.getInProgress();
      inProgressCourses = res.data || res || [];
    } catch (e) {
      console.error("Failed to load progress data", e);
    }
  }

  const featuredHTML = `
    <section class="featured" id="featured-section">
      <div class="section__header">
        <h2 class="section__title text-h1">Start Learning Today</h2>
      </div>
      <div class="section__header">
        <p class="section__subtitle text-body-m">Choose from our most popular courses and begin your journey</p>
      </div>
      <div class="featured__grid" id="featured-grid">
        ${skeletonCards(3, 'featured')}
      </div>
    </section>
  `;

  const inProgressHTML = `
    <section class="in-progress" id="in-progress-section">
      <div class="section__header">
        <h2 class="section__title text-h1">Continue Learning</h2>
        ${loggedIn && inProgressCourses.length > 3 ? '<button class="section__see-all text-body-xs" id="see-all-btn">See All</button>' : ''}
      </div>
      <div class="section__header">
  <p class="section__subtitle text-body-m">Pick up where you left</p>
  <button class="section__see-all text-body-m" 
    ${inProgressCourses.length > 3 ? 'onclick="openSidebar()"' : 'disabled'}
    style="${inProgressCourses.length <= 3 ? 'cursor:not-allowed;' : ''}">
    See All
  </button>
</div>
      <div class="in-progress__grid" id="in-progress-grid">
        ${skeletonCards(4, 'progress')}
      </div>
    </section>
  `;

  let layout = [];

  if (loggedIn) {
    if (inProgressCourses.length > 0) {
      layout = [inProgressHTML, featuredHTML];
    } else {
      layout = [featuredHTML];
    }
  } else {
    layout = [featuredHTML, inProgressHTML];
  }

  root.innerHTML = layout.join('');

  if (loggedIn && inProgressCourses.length > 4) {
    document.getElementById('see-all-btn')?.addEventListener('click', () => {
      if (typeof openSidebar === 'function') openSidebar();
    });
  }

  await loadFeatured();
  await renderInProgress(inProgressCourses);
}

async function loadFeatured() {
  const grid = document.getElementById('featured-grid');
  if (!grid) return;
  try {
    const res = await api.getFeatured();
    const courses = res.data || res || [];
    if (!courses.length) {
      grid.innerHTML = '<p class="empty-text text-body-xs">No featured courses available.</p>';
      return;
    }
    grid.innerHTML = courses.map(c => featuredCard(c)).join('');
  } catch (e) {
    grid.innerHTML = '<p class="empty-text text-body-xs">Failed to load courses.</p>';
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
          <p class="text-body-xs">Lecturer <span class="featured__card-instructor text-body-xs">${c.instructor?.name || ''}</span></p>
          ${rating ? `
          <div class="featured__card-rating">
            <span class="featured__card-star text-body-s">★</span>
            <span class="featured__card-rating-value text-body-xs">${rating}</span>
          </div>` : ''}
        </div>
        <h3 class="featured__card-title text-h3">${c.title}</h3>
        <p class="featured__card-desc text-body-s">${(c.description || '').slice(0, 120)}${(c.description || '').length > 120 ? '...' : ''}</p>
        <div class="featured__card-footer">
          <p class="text-micro-medium">Starting from <span class="featured__card-price text-h2">$${c.basePrice ?? ''}</span></p>
          <span class="featured__card-btn text-body-l">Details</span>
        </div>
      </div>
    </a>
  `;
}

async function renderInProgress(prefetchedCourses) {
  const grid = document.getElementById('in-progress-grid');
  if (!grid) return;

  if (!auth.isLoggedIn()) {
    grid.style.display = 'block';
    grid.innerHTML = `
      <div class="progress-locked">
        <div class="progress-locked__cards" aria-hidden="true">
          ${[1, 2, 3, 4].map(() => mockProgressCard()).join('')}
        </div>
        <div class="progress-locked__overlay">
          <div class="progress-locked__box">
            <div class="progress-locked__icon">
              <img src="assets/lock.svg" alt="Locked" />
            </div>
            <p class="progress-locked__text text-body-s">Sign in to track your learning progress</p>
            <button class="progress-locked__btn text-body-s" id="locked-login-btn">Log In</button>
          </div>
        </div>
      </div>
    `;
    document.getElementById('locked-login-btn')?.addEventListener('click', () => openModal('login'));
    return;
  }

  grid.style.display = 'grid';
  if (prefetchedCourses && prefetchedCourses.length > 0) {
    const cards = await Promise.all(
      prefetchedCourses.slice(0, 4).map(e => progressCard(e))
    );
    grid.innerHTML = cards.join('');
  }
}

async function progressCard(enrollment) {
  const c        = enrollment.course || enrollment;
  const progress = enrollment.progress ?? 0;

  let rating = null;
  try {
    const res = await api.getCourse(c.id);
    rating = Number(res.data?.avgRating || 0).toFixed(1);
  } catch(e) {}

  return `
    <div class="progress__card">
      <div class="progress__card-top-row">
        <div class="progress__card-img">
          <img src="${c.cover || c.image || ''}" alt="${c.title}"
            onerror="this.parentElement.style.background='var(--color-grey-200)'" />
        </div>
        <div class="progress__card-info">
          <div class="progress__card-meta">
            <p class="text-body-xs" style="color:var(--color-grey-400);">Lecturer <span style="color:var(--color-grey-700);">${c.instructor?.name || ''}</span></p>
            <div class="progress__card-rating">
              <span class="progress__card-star">★</span>
              <span class="progress__card-rating-value text-body-xs">${rating}</span>
            </div>
          </div>
          <h3 class="progress__card-title text-h4">${c.title}</h3>
        </div>
      </div>
      <div class="progress__card-bottom-row">
        <div class="progress__bar-container">
          <span class="progress__percent text-micro-medium">${progress}% Complete</span>
          <div class="progress__bar">
            <div class="progress__bar-fill" style="width:${progress}%"></div>
          </div>
        </div>
        <a href="course.html?id=${c.id}" class="progress__view-btn text-micro-medium">View</a>
      </div>
    </div>
  `;
}

function mockProgressCard() {
  return `
    <div class="progress__card">
      <div class="progress__card-top-row">
        <div class="progress__card-img">
          <img src="assets/blured.svg" alt="Course Image" onerror="this.parentElement.style.background='var(--color-grey-200)'"/>
        </div>
        
        <div class="progress__card-info">
          <div class="progress__card-meta">
            <p class="progress__card-lecturer text-body-xs"><span style="color: var(--color-grey-400);">Lecturer </span>Marilyn Mango</p>
            <div class="progress__card-rating">
              <span class="progress__card-star">★</span>
              <span class="progress__card-rating-value text-body-xs">4.9</span>
            </div>
          </div>
          <h3 class="progress__card-title text-h4">UX/UI Design Principles</h3>
        </div>
      </div>

      <div class="progress__card-bottom-row">
        <div class="progress__bar-container">
          <span class="progress__percent text-micro-medium">45% Complete</span>
          <div class="progress__bar">
            <div class="progress__bar-fill" style="width: 45%;"></div>
          </div>
        </div>
        <button class="progress__view-btn">View</button>
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

document.addEventListener('DOMContentLoaded', () => {
  initHeroCarousel();
  initDashboard();
});