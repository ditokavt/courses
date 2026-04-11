// State
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
  1: "assets/development.svg",
  2: "assets/design.svg",
  3: "assets/business.svg",
  4: "assets/marketing.svg",
  5: "assets/data science.svg",
};

const ALL_WEEKLY_SCHEDULES = [
  { key: 'mon-wed',  label: 'Monday -\nWednesday' },
  { key: 'tue-thu',  label: 'Tuesday -\nThursday' },
  { key: 'wed-fri',  label: 'Wednesday -\nFriday' },
  { key: 'weekend',  label: 'Weekend\nOnly' },
];

function toPrice(val) {
  return Math.round(Number(val) || 0);
}

function matchWeeklyKey(label) {
  const l = label.toLowerCase();
  if (l.includes('monday') || l.includes('mon - wed') || l.includes('mon-wed')) return 'mon-wed';
  if (l.includes('tuesday') || l.includes('tue - thu') || l.includes('tue-thu')) return 'tue-thu';
  if (l.includes('wednesday') || l.includes('wed - fri') || l.includes('wed-fri')) return 'wed-fri';
  if (l.includes('weekend') || l.includes('saturday') || l.includes('sunday')) return 'weekend';
  return null;
}

document.addEventListener('DOMContentLoaded', initCoursePage);

async function initCoursePage() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  if (!id) return;
  try {
    const res = await api.getCourse(id);
    courseData = res.data;
    enrollmentData = courseData.enrollment || null;
    renderCoursePage();
  } catch (err) {
    console.error('Failed to load course', err);
  }
}

async function loadWeeklySchedules() {
  const body = document.getElementById('weekly-schedule-body');
  if (!body) return;

  body.innerHTML = `
    <div class="course__week-grid">
      ${ALL_WEEKLY_SCHEDULES.map(s => `
        <div class="course__week-card is-disabled" data-key="${s.key}">
          <div class="course__week-label">
            ${s.label.split('\n').map(line => `<span>${line}</span>`).join('')}
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
      card.querySelector('.course__week-label').innerHTML =
        s.label.includes(' - ')
          ? `<span>${s.label.split(' - ')[0]} -</span><span>${s.label.split(' - ')[1]}</span>`
          : `<span>${s.label}</span>`;
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
  document.getElementById('session-type-body').innerHTML = '';
  closeSection('session-type-section');

  const timeIcons = {
    morning:   `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`,
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
    online:      `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>`,
    'in-person': `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
    hybrid:      `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`,
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
      card.querySelector('.course__session-price').style.color = isFull ? 'var(--color-grey-300)' : 'var(--color-purple-500)';
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
  if (!auth.isLoggedIn()) { openModal('login'); return; }
  try {
    const me = await api.getMe();
    if (!me.data?.profileComplete) { openProfileModal(); return; }
  } catch (err) { openModal('login'); return; }
  if (!selectedWeeklyScheduleId || !selectedTimeSlotId || !selectedSessionTypeId) {
    alert('Please select Weekly Schedule, Time Slot, and Session Type.');
    return;
  }
  await doEnroll(false);
}

async function doEnroll(force = false) {
  try {
    const body = { courseId: courseData.id, courseScheduleId: selectedCourseScheduleId };
    if (force) body.force = true;
    const res = await api.enroll(body);
    if (res.errors || !res.data) { console.error('Enroll error:', res); return; }
    enrollmentData = res.data;
    courseData.enrollment = enrollmentData;
    const confirmedText = document.getElementById('enrollment-confirmed-text');
    if (confirmedText) confirmedText.textContent = `You've successfully enrolled to the "${courseData.title}" course!`;
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
    courseData.enrollment      = enrollmentData;
    const congratsText = document.getElementById('congrats-text');
    if (congratsText) congratsText.textContent = `You've completed "${courseData.title}" Course!`;
    refreshCoursePanel();
    openModal('congratulations');
  } catch (err) { console.error(err); }
}

async function handleRetake() {
  if (!enrollmentData?.id) return;
  try {
    await api.deleteEnrollment(enrollmentData.id);
    enrollmentData = null;
    courseData.enrollment = null;
    selectedWeeklyScheduleId = null;
    selectedTimeSlotId = null;
    selectedSessionTypeId = null;
    selectedCourseScheduleId = null;
    selectedSessionType = null;
    refreshCoursePanel();
    loadWeeklySchedules();
  } catch (err) { console.error(err); }
}

function setRating(value) {
  currentRating = value;
  document.querySelectorAll('.course__star').forEach((star, i) => {
    star.classList.toggle('is-active', i < value);
  });
}

async function submitRating() {
  if (!currentRating) return;
  try {
    await api.submitReview(courseData.id, { rating: currentRating });
    courseData.isRated = true;
    const updated = await api.getCourse(courseData.id);
    if (updated.data) courseData.avgRating = updated.data.avgRating;
    const ratingEl = document.querySelector('.course__rating-value');
    if (ratingEl && courseData.avgRating) ratingEl.textContent = Number(courseData.avgRating).toFixed(1);
    const section = document.getElementById('rating-section');
    if (section) section.innerHTML = `<p class="text-micro-regular" style="color:var(--color-grey-400);text-align:center;">You've already rated this course</p>`;
    closeModal('congratulations');
  } catch (err) { console.error(err); }
}