function openSidebar() {
  if (!auth.isLoggedIn()) { 
    openModal('login'); 
    return; 
  }
  
  let sidebar = document.getElementById('enrolled-sidebar');
  if (!sidebar) {
    sidebar = createSidebar();
    document.body.appendChild(sidebar);
  }
  
  sidebar.classList.add('is-open');
  document.body.style.overflow = 'hidden';
  loadEnrollments();
}

function closeSidebar() {
  const sidebar = document.getElementById('enrolled-sidebar');
  if (sidebar) sidebar.classList.remove('is-open');
  document.body.style.overflow = '';
}

function createSidebar() {
  const el = document.createElement('div');
  el.id = 'enrolled-sidebar';
  el.className = 'sidebar-overlay';
  el.innerHTML = `
    <div class="sidebar">
      <div class="sidebar__header">
        <h2 class="sidebar__title text-h2">Enrolled Courses</h2>
      </div>
      <div class="sidebar__list" id="sidebar-list"></div>
    </div>
  `;
  
  el.addEventListener('click', (e) => {
    if (e.target === el) closeSidebar();
  });
  
  return el;
}


async function loadEnrollments() {
  const list = document.getElementById('sidebar-list');
  if (!list) return;

  list.innerHTML = `<div class="sidebar__loading text-body-xs">Loading...</div>`;

  try {
    const res = await api.getEnrollments();
    const enrollments = res.data || [];

    if (!enrollments.length) {
      list.innerHTML = `
        <div class="sidebar__empty">
          carielia
        </div>
      `;
      return;
    }

    const countHTML = `
      <div class="sidebar__summary" style="padding: 0 0 20px 0;">
        <span class="text-body-xs" style="color:var(--color-grey-500)">
          Total Enrollments: <strong>${enrollments.length}</strong>
        </span>
      </div>
    `;

    list.innerHTML = countHTML + enrollments.map(e => enrollmentCard(e)).join('');

  } catch (err) {
    list.innerHTML = `<p class="text-body-xs" style="color:var(--color-error);padding:20px;">Failed to load enrollments.</p>`;
  }
}


function enrollmentCard(e) {
  const c = e.course;
  const schedule = e.schedule;
  const progress = e.progress ?? 0;
  const rating = c.avgRating ? Number(c.avgRating).toFixed(1) : null;

  const weeklyLabel = schedule?.weeklySchedule?.label || '';
  const timeLabel = schedule?.timeSlot?.label || '';
  const sessionName = schedule?.sessionType?.name || '';
  const location = schedule?.location || '';

  return `
    <div class="sidebar__card">
      <div class="sidebar__card-img">
        <img src="${c.image || ''}" alt="${c.title}" onerror="this.parentElement.style.background='var(--color-grey-200)'" />
      </div>
      <div class="sidebar__card-body">
        <div class="sidebar__card-top">
          <span class="text-micro-medium" style="color:var(--color-grey-400)">Instructor: ${c.instructor?.name || ''}</span>
          ${rating ? `
          <div style="display:flex;align-items:center;gap:4px;">
            <span style="color:var(--color-warning);">★</span>
            <span class="text-micro-medium" style="color:var(--color-grey-600);">${rating}</span>
          </div>` : ''}
        </div>
        <h3 class="sidebar__card-title text-body-s">${c.title}</h3>
        <div class="sidebar__card-info">
          ${weeklyLabel ? `
          <div class="sidebar__card-info-row">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-grey-400)" stroke-width="2">
              <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            <span class="text-micro-regular" style="color:var(--color-grey-500)">${weeklyLabel}</span>
          </div>` : ''}
          ${timeLabel ? `
          <div class="sidebar__card-info-row">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-grey-400)" stroke-width="2">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
            <span class="text-micro-regular" style="color:var(--color-grey-500)">${timeLabel}</span>
          </div>` : ''}
          ${sessionName ? `
          <div class="sidebar__card-info-row">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-grey-400)" stroke-width="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
            </svg>
            <span class="text-micro-regular" style="color:var(--color-grey-500)">${sessionName}${location ? ` · ${location}` : ''}</span>
          </div>` : ''}
        </div>
        <div class="sidebar__card-footer">
          <div class="sidebar__card-progress">
            <span class="text-micro-medium" style="color:var(--color-grey-600)">${progress}% Complete</span>
            <div class="sidebar__progress-bar">
              <div class="sidebar__progress-fill" style="width:${progress}%"></div>
            </div>
          </div>
          <a href="course.html?id=${c.id}" class="sidebar__view-btn text-micro-medium" onclick="closeSidebar()">View</a>
        </div>
      </div>
    </div>
  `;
}