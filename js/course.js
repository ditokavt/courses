let courseData = null;
let enrollmentData = null;
let selectedWeeklyScheduleId = null;
let selectedTimeSlotId = null;
let selectedSessionTypeId = null;
let selectedCourseScheduleId = null;
let selectedSessionType = null;
let pendingConflict = null;
let currentRating = 0;

const CATEGORY_ICONS = {
  1: "./assets/development.svg",
  2: "./assets/design.svg",
  3: "./assets/business.svg",
  4: "./assets/marketing.svg",
  5: "./assets/data science.svg",
};

const ALL_WEEKLY_SCHEDULES = [
  { key: 'mon-wed',  label: 'Mon - Wed' },
  { key: 'tue-thu',  label: 'Tue - Thu' },
  { key: 'wed-fri',  label: 'Wed - Fri' },
  { key: 'weekend',  label: 'Weekend' },
];

document.addEventListener('DOMContentLoaded', initCoursePage);

async function initCoursePage() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  if (!id) return;

  try {
    const courseRes = await api.getCourse(id);
    courseData = courseRes.data;
    enrollmentData = courseData.enrollment || null;

    const page1 = await api.getCourses('?page=1&per_page=10');
    const totalPages = page1.meta?.lastPage || 1;

    let allCourses = [...(page1.data || [])];

    if (totalPages > 1) {
      const restPages = await Promise.all(
        Array.from({ length: totalPages - 1 }, (_, i) =>
          api.getCourses(`?page=${i + 2}&per_page=10`)
        )
      );
      restPages.forEach(res => {
        allCourses = allCourses.concat(res.data || []);
      });
    }

    const catalogCourse = allCourses.find(c => c.id === Number(id));
    if (catalogCourse?.avgRating) {
      courseData.avgRating = catalogCourse.avgRating;
    }

    renderCoursePage();
  } catch (err) {
    console.error('Failed to load course', err);
  }
}

function toPrice(val) {
  return Math.round(Number(val) || 0);
}

function renderCoursePage() {
  const root = document.getElementById('course-root');
  if (!root) return;

  const c = courseData;
  const rating = c.avgRating ? Number(c.avgRating).toFixed(1) : '0.0';
  const categoryIcon = CATEGORY_ICONS[c.category?.id] || '';

  root.innerHTML = `
    <div class="course-page">
      <div class="course__breadcrumb">
        <a href="index.html" class="course__breadcrumb-link text-body-m">Home</a>
        <span class="course__breadcrumb-sep">›</span>
        <a href="catalog.html" class="course__breadcrumb-link text-body-m">Browse</a>
        <span class="course__breadcrumb-sep">›</span>
        <span class="course__breadcrumb-current text-body-m">${c.category?.name || ''}</span>
      </div>

      <div class="course__layout">
        <div class="course__left">
          <h1 class="text-h1" style="color:var(--color-grey-900);">${c.title}</h1>
          <div class="course__hero">
            <img src="${c.image || ''}" alt="${c.title}"
              onerror="this.parentElement.style.background='var(--color-grey-200)'" />
          </div>

          <div class="course__meta-row">
            <span class="text-body-xs" style="color:var(--color-grey-600); gap:12px;">
              <div style="display:flex;align-items:center; gap:12px;">
                ${c.durationWeeks ? `
                <div style="display:flex;align-items:center; gap:4px;">
                  <img src="./assets/boxicons_calendar.svg" width="24" height="24" alt="weeks" />
                  <span class="text-micro-regular" style="color:var(--color-grey-600);">${c.durationWeeks} Weeks</span>
                </div>` : ''}
                ${c.hours ? `
                <div style="display:flex;align-items:center; gap:4px;">
                  <img src="./assets/tabler_clock-hour-3.svg" width="24" height="24" alt="hours" />
                  <span class="text-micro-regular" style="color:var(--color-grey-600);">${c.hours} Hours</span>
                </div>` : ''}
              </div>
            </span>
            <div style="display:flex;align-items:center;gap:16px;">
              <div style="display:flex;align-items:center;gap:4px;">
                <span style="color:var(--color-warning);" width="26" height="26">★</span>
                <span class="text-micro-medium course__rating-value" style="color:var(--color-grey-600);">${rating}</span>
              </div>
              <span class="course__category-badge text-micro-medium">
                ${categoryIcon ? `<img src="${categoryIcon}" width="24" height="24" alt="category" />` : ''}
                ${c.category?.name || ''}
              </span>
            </div>
          </div>

          <div class="course__instructor-row">
            <img src="${c.instructor?.avatar || ''}" alt="${c.instructor?.name || ''}"
              class="course__instructor-avatar"
              onerror="this.style.display='none'" />
            <span class="text-body-s" style="color:var(--color-grey-500);">${c.instructor?.name || ''}</span>
          </div>

          <div class="course__description">
            <h2 class="text-h4" style="color:var(--color-grey-400); padding-bottom: 24px;">Course Description</h2>
            <p class="text-body-s" style="color:var(--color-grey-600);line-height:1.7;">${c.description || ''}</p>
          </div>
        </div>

        <div class="course__right">
          <div class="course__panel" id="course-panel">
            ${renderPanelContent()}
          </div>
        </div>
      </div>
    </div>
  `;

  if (!enrollmentData) {
    loadWeeklySchedules();
  }
}

function renderPanelContent() {
  const isEnrolled = !!enrollmentData;
  const isCompleted = enrollmentData?.progress === 100 && enrollmentData?.completedAt;
  return isEnrolled ? renderEnrolledPanel(isCompleted) : renderSchedulePanel();
}

function renderSchedulePanel() {
  const isLoggedIn = auth.isLoggedIn();
  const user = auth.getUser ? auth.getUser() : null;
  const profileIncomplete = isLoggedIn && user && !user.profileComplete;
  const basePrice = toPrice(courseData.basePrice);

  return `
    <div class="course__panel-section is-open" id="weekly-schedule-section">
      <div class="course__panel-header" onclick="toggleSection('weekly-schedule-section')">
        <div class="course__panel-header-left">
          <span class="course__panel-num text-micro-medium">1</span>
          <span class="course__panel-title text-body-s">Weekly Schedule</span>
        </div>
        <svg class="course__panel-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-grey-400)" stroke-width="2">
          <polyline points="18 15 12 9 6 15"/>
        </svg>
      </div>
      <div class="course__panel-body text-h4" id="weekly-schedule-body">
        <div class="course__panel-loading text-body-xs">Loading...</div>
      </div>
    </div>

    <div class="course__panel-section" id="time-slot-section">
      <div class="course__panel-header" onclick="toggleSection('time-slot-section')">
        <div class="course__panel-header-left">
          <span class="course__panel-num text-micro-medium">2</span>
          <span class="course__panel-title text-body-s">Time Slot</span>
        </div>
        <svg class="course__panel-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-grey-400)" stroke-width="2">
          <polyline points="18 15 12 9 6 15"/>
        </svg>
      </div>
      <div class="course__panel-body text-h4" id="time-slot-body"></div>
    </div>

    <div class="course__panel-section" id="session-type-section">
      <div class="course__panel-header" onclick="toggleSection('session-type-section')">
        <div class="course__panel-header-left">
          <span class="course__panel-num text-micro-medium">3</span>
          <span class="course__panel-title text-body-s">Session Type</span>
        </div>
        <svg class="course__panel-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-grey-400)" stroke-width="2">
          <polyline points="18 15 12 9 6 15"/>
        </svg>
      </div>
      <div class="course__panel-body text-h4" id="session-type-body"></div>
    </div>

    <div class="course__price-summary">
      <div class="course__price-row">
        <span class="text-h4" style="color:var(--color-grey-400);">Total Price</span>
        <span class="text-h2" style="color:var(--color-grey-800);" id="total-price">$${basePrice}</span>
      </div>
      <div class="course__price-breakdown">
        <div class="course__price-line">
          <span class="text-body-s" style="color:var(--color-grey-400);">Base Price</span>
          <span class="text-body-s" style="color:var(--color-grey-800);" id="base-price-display">+ $${basePrice}</span>
        </div>
        <div class="course__price-line">
          <span class="text-body-s" style="color:var(--color-grey-400);">Session Type</span>
          <span class="text-body-s" style="color:var(--color-grey-800);" id="price-modifier">+ $0</span>
        </div>
      </div>
      <button class="course__enroll-btn text-h4" id="enroll-btn" onclick="handleEnroll()">
        Enroll Now
      </button>
    </div>

    ${!isLoggedIn ? `
    <div class="course__status-banner">
      <div class="course__status-banner-left">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-warning)" stroke-width="2">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
        <div>
          <span class="course__status-banner-title text-body-xs">Authentication Required</span>
          <span class="course__status-banner-sub text-micro-regular">You need sign in to your profile before enrolling in this course.</span>
        </div>
      </div>
      <button class="course__status-banner-btn text-body-xs" onclick="openModal('login')">Sign In →</button>
    </div>
    ` : profileIncomplete ? `
    <div class="course__status-banner">
      <div class="course__status-banner-left">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-warning)" stroke-width="2">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
        <div>
          <span class="course__status-banner-title text-body-xs">Complete Your Profile</span>
          <span class="course__status-banner-sub text-micro-regular">You need to fill in your profile details before enrolling in this course.</span>
        </div>
      </div>
      <button class="course__status-banner-btn text-body-xs" onclick="openProfileModal()">Complete →</button>
    </div>
    ` : ''}
  `;
}

function renderEnrolledPanel(isCompleted) {
  const e = enrollmentData;
  const schedule = e.schedule;
  const progress = e.progress ?? 0;
  const sessionName = schedule?.sessionType?.name || '';
  const location = schedule?.location || '';
  const isOnline = sessionName.toLowerCase().includes('online');

  function renderRatingSection() {
    if (courseData.isRated && courseData.userRating) {
      return `
        <p class="text-body-s" style="color:var(--color-grey-600);">Rate your experience</p>
        <div class="course__stars course__stars--readonly">
          ${[5, 4, 3, 2, 1].map(i => `
            <span class="course__star ${i <= courseData.userRating ? 'is-active' : ''}" data-value="${i}">★</span>
          `).join('')}
        </div>
      `;
    }

    if (!courseData.isRated) {
      return `
        <p class="text-body-s" style="color:var(--color-grey-600);">Rate your experience</p>
        <div class="course__stars" id="star-rating">
          ${[5, 4, 3, 2, 1].map(i => `
            <span class="course__star" data-value="${i}" onclick="setRating(${i}, 'star-rating')">★</span>
          `).join('')}
        </div>
        <button class="course__rating-submit-btn text-body-s" onclick="submitRating()">Done</button>
      `;
    }

    return '';
  }

  const ratingHTML = renderRatingSection();

  return `
    <div class="course__enrolled-panel">
      <span class="course__status-badge ${isCompleted ? 'course__status-badge--completed' : 'course__status-badge--enrolled'} text-micro-medium">
        ${isCompleted ? 'Completed' : 'Enrolled'}
      </span>

      <div class="course__schedule-info">
        ${schedule?.weeklySchedule?.label ? `
        <div class="course__schedule-row">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-grey-400)" stroke-width="2">
            <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          <span class="text-micro-regular" style="color:var(--color-grey-500)">${schedule.weeklySchedule.label}</span>
        </div>` : ''}
        ${schedule?.timeSlot?.label ? `
        <div class="course__schedule-row">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-grey-400)" stroke-width="2">
            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
          </svg>
          <span class="text-micro-regular" style="color:var(--color-grey-500)">${schedule.timeSlot.label}</span>
        </div>` : ''}
        ${sessionName ? `
        <div class="course__schedule-row">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-grey-400)" stroke-width="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
          <span class="text-micro-regular" style="color:var(--color-grey-500)">${sessionName}</span>
        </div>` : ''}
        ${!isOnline && location ? `
        <div class="course__schedule-row">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-grey-400)" stroke-width="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
          </svg>
          <span class="text-micro-regular" style="color:var(--color-grey-500)">${location}</span>
        </div>` : ''}
      </div>

      <div class="course__progress-section">
        <span class="text-micro-medium" style="color:var(--color-grey-600);">${progress}% Complete</span>
        <div class="course__progress-bar">
          <div class="course__progress-fill" style="width:${progress}%"></div>
        </div>
      </div>

      ${isCompleted ? `
        <button class="course__retake-btn" onclick="handleRetake()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="1 4 1 10 7 10"/>
            <path d="M3.51 15a9 9 0 1 0 .49-3.54"/>
          </svg>
          Retake Course
        </button>
        ${ratingHTML ? `
        <div class="course__rating-section" id="rating-section">
          ${ratingHTML}
        </div>` : ''}
      ` : `
        <button class="course__complete-btn" onclick="handleComplete()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          Complete Course
        </button>
      `}
    </div>
  `;
}

function matchWeeklyKey(label) {
  const l = label.toLowerCase();
  if (l.includes('mon')) return 'mon-wed';
  if (l.includes('tue')) return 'tue-thu';
  if (l.includes('wednesday') && !l.includes('mon')) return 'wed-fri';
  if (l.includes('weekend') || l.includes('saturday') || l.includes('sunday')) return 'weekend';
  return null;
}

async function loadWeeklySchedules() {
  const body = document.getElementById('weekly-schedule-body');
  if (!body) return;

  body.innerHTML = `
    <div class="course__week-grid">
      ${ALL_WEEKLY_SCHEDULES.map(s => `
        <div class="course__week-card is-disabled" data-key="${s.key}">
          <div class="course__week-label">
            <span>${s.label}</span>
          </div>
        </div>
      `).join('')}
    </div>
  `;

  try {
    const res = await api.getWeeklySchedules(courseData.id);
    const schedules = res.data || [];

    schedules.forEach(s => {
      const key = matchWeeklyKey(s.label);
      if (!key) return;
      const card = body.querySelector(`[data-key="${key}"]`);
      if (!card) return;

      card.classList.remove('is-disabled');
      card.setAttribute('data-id', s.id);

      const scheduleConfig = ALL_WEEKLY_SCHEDULES.find(item => item.key === key);
      const shortLabel = scheduleConfig ? scheduleConfig.label : s.label;

      card.querySelector('.course__week-label').innerHTML = `<span>${shortLabel}</span>`;
      card.setAttribute('onclick', `selectWeeklySchedule(${s.id}, this)`);
    });
  } catch (err) {
    console.error(err);
  }
}

async function selectWeeklySchedule(id, el) {
  if (el.classList.contains('is-active')) return;

  selectedWeeklyScheduleId = id;
  selectedTimeSlotId = null;
  selectedSessionTypeId = null;
  selectedCourseScheduleId = null;
  selectedSessionType = null;

  document.querySelectorAll('.course__week-card').forEach(b => b.classList.remove('is-active'));
  el.classList.add('is-active');
  updatePrice();
  document.getElementById('weekly-schedule-section').classList.add('is-completed');
  const timeBody = document.getElementById('time-slot-body');
  openSection('time-slot-section');
  document.getElementById('time-slot-section').classList.add('is-completed');
  document.getElementById('session-type-body').innerHTML = '';
  closeSection('session-type-section');

  const timeIcons = {
    morning:   `<img src="./assets/morning.svg" width="18" height="18" alt="morning" />`,
    afternoon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`,
    evening:   `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`,
  };

  const allSlots = [
    { key: 'morning',   name: 'Morning',   fallbackTime: '9:00 AM - 12:00 PM' },
    { key: 'afternoon', name: 'Afternoon', fallbackTime: '12:00 AM - 6:00 PM' },
    { key: 'evening',   name: 'Evening',   fallbackTime: '6:00 AM - 9:00 PM' },
  ];

  timeBody.innerHTML = `
    <div class="course__timeslot-grid">
      ${allSlots.map(s => `
        <button class="course__timeslot-card is-disabled" data-key="${s.key}" disabled>
          <span class="course__timeslot-icon">${timeIcons[s.key]}</span>
          <span class="course__timeslot-name text-body-xs">${s.name}</span>
          <span class="course__timeslot-time text-micro-regular">${s.fallbackTime}</span>
        </button>
      `).join('')}
    </div>
  `;

  try {
    const res = await api.getTimeSlots(courseData.id, id);
    const slots = res.data || [];

    slots.forEach(s => {
      const label = s.label.toLowerCase();
      const key = label.includes('morning') ? 'morning'
        : label.includes('afternoon') ? 'afternoon' : 'evening';
      const timeMatch = s.label.match(/\(([^)]+)\)/);
      const timeRange = timeMatch ? timeMatch[1] : s.label;

      const card = timeBody.querySelector(`[data-key="${key}"]`);
      if (card) {
        card.classList.remove('is-disabled');
        card.removeAttribute('disabled');
        card.setAttribute('data-id', s.id);
        card.querySelector('.course__timeslot-time').textContent = timeRange;
        card.setAttribute('onclick', `selectTimeSlot(${s.id}, this)`);
      }
    });
  } catch (err) {
    console.error(err);
  }
}

async function selectTimeSlot(id, el) {
  if (el.classList.contains('is-active')) return;

  selectedTimeSlotId = id;
  selectedSessionTypeId = null;
  selectedCourseScheduleId = null;
  selectedSessionType = null;

  document.querySelectorAll('.course__timeslot-card').forEach(b => b.classList.remove('is-active'));
  el.classList.add('is-active');
  updatePrice();

  const sessionBody = document.getElementById('session-type-body');
  openSection('session-type-section');

  const sessionIcons = {
    online:      `<img src="./assets/online.svg" width="24" height="24" alt="online" />`,
    'in-person': `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
    hybrid:      `<img src="./assets/hybrid.svg" width="24" height="24" alt="hybrid" />`,
  };

  const allSessions = [
    { key: 'online',    name: 'Online',    fallbackLocation: 'Google Meet', fallbackPrice: 'Included' },
    { key: 'in-person', name: 'In-Person', fallbackLocation: '',            fallbackPrice: '+ $50' },
    { key: 'hybrid',    name: 'Hybrid',    fallbackLocation: '',            fallbackPrice: '+ $30' },
  ];

  sessionBody.innerHTML = `
    <div class="course__session-grid">
      ${allSessions.map(s => `
        <button class="course__session-card is-disabled" data-key="${s.key}" disabled>
          <span class="course__session-icon" style="color:var(--color-grey-300);">${sessionIcons[s.key]}</span>
          <span class="course__session-name text-body-xs">${s.name}</span>
          <span class="course__session-location text-micro-regular">${s.fallbackLocation}</span>
          <span class="course__session-price text-micro-medium" style="color:var(--color-grey-300);">${s.fallbackPrice}</span>
          <span class="course__session-seats text-micro-regular">No Seats Available</span>
        </button>
      `).join('')}
    </div>
  `;

  try {
    const res = await api.getSessionTypes(courseData.id, selectedWeeklyScheduleId, id);
    const types = res.data || [];

    types.forEach(t => {
      const nameKey = t.name.toLowerCase().replace(' ', '-');
      const card = sessionBody.querySelector(`[data-key="${nameKey}"]`);
      if (!card) return;

      const isFull = t.availableSeats === 0;
      const isLow  = t.availableSeats > 0 && t.availableSeats < 5;
      const mod    = toPrice(t.priceModifier);
      const modifier = mod > 0 ? `+ $${mod}` : 'Included';
      const isOnline = nameKey === 'online';

      if (!isFull) {
        card.classList.remove('is-disabled');
        card.removeAttribute('disabled');
        card.setAttribute('data-id', t.id);
        card.setAttribute('data-modifier', mod);
        card.setAttribute('data-name', t.name);
        card.setAttribute('data-schedule-id', t.courseScheduleId);
        card.setAttribute('onclick', `selectSessionType(${t.id}, ${mod}, '${t.name}', ${t.courseScheduleId}, this)`);
        card.querySelector('.course__session-icon').style.color = 'var(--color-grey-500)';
      }

      card.querySelector('.course__session-location').innerHTML = !isOnline && t.location
        ? `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg> ${t.location}`
        : isOnline ? 'Google Meet' : '';

      card.querySelector('.course__session-price').textContent = modifier;
      card.querySelector('.course__session-price').style.color = isFull
        ? 'var(--color-grey-300)' : 'var(--color-purple-500)';

      card.querySelector('.course__session-seats').innerHTML = isFull
        ? 'No Seats Available'
        : isLow
        ? `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--color-warning)" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> Only ${t.availableSeats} Seats Remaining`
        : `${t.availableSeats} Seats Available`;

      if (isLow) card.querySelector('.course__session-seats').classList.add('is-warning');
    });
  } catch (err) {
    console.error(err);
  }
}

function selectSessionType(id, modifier, name, scheduleId, el) {
  if (el.classList.contains('is-active')) return;
  selectedSessionTypeId    = id;
  selectedCourseScheduleId = scheduleId;
  selectedSessionType      = { id, modifier: toPrice(modifier), name };
  document.querySelectorAll('.course__session-card').forEach(b => b.classList.remove('is-active'));
  el.classList.add('is-active');
  updatePrice();

  const btn = document.getElementById('enroll-btn');
  if (btn) btn.classList.add('is-ready');
}

function updatePrice() {
  const base  = toPrice(courseData.basePrice);
  const mod   = toPrice(selectedSessionType?.modifier || 0);
  const total = base + mod;

  const totalEl = document.getElementById('total-price');
  const modEl   = document.getElementById('price-modifier');
  const baseEl  = document.getElementById('base-price-display');

  if (totalEl) totalEl.textContent = `$${total}`;
  if (modEl)   modEl.textContent   = mod > 0 ? `+ $${mod}` : '+ $0';
  if (baseEl)  baseEl.textContent  = `+ $${base}`;
}

async function handleEnroll() {
  if (!auth.isLoggedIn()) {
    openModal('login');
    return;
  }

  try {
    const me = await api.getMe();
    if (!me.data?.profileComplete) {
      openProfileModal();
      return;
    }
  } catch (err) {
    openModal('login');
    return;
  }

  if (!selectedWeeklyScheduleId || !selectedTimeSlotId || !selectedSessionTypeId) {
    alert('Please select Weekly Schedule, Time Slot, and Session Type.');
    return;
  }

  await doEnroll(false);
}

async function doEnroll(force = false) {
  try {
    const body = {
      courseId: courseData.id,
      courseScheduleId: selectedCourseScheduleId,
    };
    if (force) body.force = true;

    const res = await api.enroll(body);

    if (res.errors || !res.data) {
      console.error('Enroll error:', res);
      return;
    }

    enrollmentData = res.data;
    courseData.enrollment = enrollmentData;

    const confirmedText = document.getElementById('enrollment-confirmed-text');
    if (confirmedText) {
      confirmedText.textContent = `You've successfully enrolled to the "${courseData.title}" course!`;
    }

    refreshCoursePanel();
    openModal('enrollment-confirmed');

  } catch (err) {
    console.error(err);
    if (err?.status === 409 || err?.conflicts) {
      pendingConflict = err.conflicts?.[0];
      const conflictText = document.getElementById('conflict-text');
      if (conflictText && pendingConflict) {
        conflictText.textContent = `You are already enrolled in "${pendingConflict.conflictingCourseName}" with the same schedule: ${pendingConflict.schedule}`;
      }
      openModal('enrollment-conflict');
    }
  }
}

async function handleEnrollForce() {
  closeModal('enrollment-conflict');
  await doEnroll(true);
}

async function handleComplete() {
  if (!enrollmentData?.id) return;
  try {
    await api.completeEnrollment(enrollmentData.id);
    enrollmentData.progress    = 100;
    enrollmentData.completedAt = new Date().toISOString();
    courseData.enrollment       = enrollmentData;

    const congratsText = document.getElementById('congrats-text');
    if (congratsText) {
      congratsText.textContent = `You've completed "${courseData.title}" Course!`;
    }

    refreshCoursePanel();
    openModal('congratulations');
  } catch (err) {
    console.error(err);
  }
}

async function handleRetake() {
  if (!enrollmentData?.id) return;
  try {
    await api.deleteEnrollment(enrollmentData.id);
    enrollmentData           = null;
    courseData.enrollment    = null;
    selectedWeeklyScheduleId = null;
    selectedTimeSlotId       = null;
    selectedSessionTypeId    = null;
    selectedCourseScheduleId = null;
    selectedSessionType      = null;
    refreshCoursePanel();
    loadWeeklySchedules();
  } catch (err) {
    console.error(err);
  }
}

function setRating(value, containerId) {
  currentRating = value;
  const container = containerId
    ? document.getElementById(containerId)
    : document.getElementById('star-rating') || document.getElementById('modal-star-rating');
  if (!container) return;
  container.querySelectorAll('.course__star').forEach(star => {
    star.classList.toggle('is-active', Number(star.dataset.value) <= value);
  });
}

async function submitRating() {
  if (!currentRating) return;
  try {
    await api.submitReview(courseData.id, { rating: currentRating });

    courseData.isRated = true;
    courseData.userRating = currentRating;

    const updated = await api.getCourse(courseData.id);
    if (updated.data) {
      courseData.avgRating = updated.data.avgRating;
      if (updated.data.userRating) {
        courseData.userRating = updated.data.userRating;
      }
    }

    const ratingEl = document.querySelector('.course__rating-value');
    if (ratingEl && courseData.avgRating) {
      ratingEl.textContent = Number(courseData.avgRating).toFixed(1);
    }

    closeModal('congratulations');
    refreshCoursePanel();

  } catch (err) {
    console.error(err);
  }
}

function refreshCoursePanel() {
  const panel = document.getElementById('course-panel');
  if (!panel) return;
  panel.innerHTML = renderPanelContent();
  if (!enrollmentData) loadWeeklySchedules();
}

function toggleSection(sectionId) {
  const section = document.getElementById(sectionId);
  if (section) section.classList.toggle('is-open');
}

function openSection(sectionId) {
  const section = document.getElementById(sectionId);
  if (section) section.classList.add('is-open');
}

function closeSection(sectionId) {
  const section = document.getElementById(sectionId);
  if (section) section.classList.remove('is-open');
}