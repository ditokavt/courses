const CATEGORY_ICONS = {
  1: "assets/development.svg",
  2: "assets/design.svg",
  3: "assets/business.svg",
  4: "assets/marketing.svg",
  5: "assets/data science.svg",
};

const catalogState = {
  page: 1,
  categories: [],
  topics: [],
  instructors: [],
  sort: 'newest',
  allTopics: [],
  allInstructors: [],
};

document.addEventListener('DOMContentLoaded', initCatalog);

async function initCatalog() {
  if (!document.getElementById('catalog-root')) return;
  await loadFilters();
  await loadCourses();
}

function handleSort(select) {
  const displayValue = document.getElementById('current-sort');
  if (displayValue) {
    displayValue.textContent = select.options[select.selectedIndex].text;
  }
  
  catalogState.sort = select.value;
  catalogState.page = 1;
  loadCourses();
}

async function loadFilters() {
  try {
    const [catRes, topRes, instRes] = await Promise.all([
      api.getCategories(),
      api.getTopics(),
      api.getInstructors(),
    ]);

    const categories = catRes.data || catRes || [];
    catalogState.allTopics = topRes.data || topRes || [];
    catalogState.allInstructors = instRes.data || instRes || [];

    renderFilters(categories);
  } catch (error) {
    console.error("Failed to load filters:", error);
  }
}

function renderFilters(categories) {
  const sidebar = document.getElementById('filter-sidebar');
  if (!sidebar) return;

  sidebar.innerHTML = `
    <div class="filter__header">
        <span class="filter__header-title text-h1">Filters</span>
        <button class="filter__clear text-body-s" id="filter-clear-btn">Clear All Filters ×</button>
    </div>

    <div class="filter__section">
      <h3 class="filter__section-title text-body-m">Categories</h3>
      <div class="filter__chips" id="filter-categories">
        ${categories.map(c => `
          <label class="filter__chip">
            <input type="checkbox" value="${c.id}" data-type="category" />
            <span class="filter__chip-icon">
              <img src="${CATEGORY_ICONS[c.id] || 'assets/placeholder.jpg'}" width="24" height="24" />
            </span>
            <span class="filter__chip-label text-body-s">${c.name}</span>
          </label>
        `).join('')}
      </div>
    </div>

    <div class="filter__section">
      <h3 class="filter__section-title text-body-m">Topics</h3>
      <div class="filter__chips text-body-s" id="filter-topics">
        ${renderTopicItems(catalogState.allTopics)}
      </div>
    </div>

    <div class="filter__section">
      <h3 class="filter__section-title text-body-m">Instructors</h3>
      <div class="filter__list" id="filter-instructors">
        ${catalogState.allInstructors.map(i => `
          <label class="filter__item">
            <input type="checkbox" class="filter__checkbox" value="${i.id}" data-type="instructor" />
            <img class="filter__avatar" src="${i.avatar}" alt="${i.name}" onerror="this.src='assets/placeholder-avatar.jpg'" />
            <span class="filter__label text-body-s">${i.name}</span>
          </label>
        `).join('')}
      </div>
    </div>
    <span class="filter__active-count text-micro-medium" id="filter-count">0 Filters Active</span>
  `;

  bindFilterEvents(sidebar);
  document.getElementById('filter-clear-btn').addEventListener('click', clearFilters);
  updateFilterCount();
}

function bindFilterEvents(container) {
  container.querySelectorAll('input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', (e) => {
      onFilterChange(e);
      const parent = cb.closest('.filter__chip') || cb.closest('.filter__item');
      if (parent) parent.classList.toggle('is-active', cb.checked);
    });
  });
}

function renderTopicItems(topics) {
  const activeCats = catalogState.categories;
  const filtered = activeCats.length ? topics.filter(t => activeCats.includes(t.categoryId)) : topics;
  return filtered.map(t => `
    <label class="filter__chip ${catalogState.topics.includes(t.id) ? 'is-active' : ''}">
      <input type="checkbox" value="${t.id}" data-type="topic" ${catalogState.topics.includes(t.id) ? 'checked' : ''} />
      <span class="filter__chip-label text-body-s">${t.name}</span>
    </label>
  `).join('');
}

function rebindTopics() {
  const container = document.getElementById('filter-topics');
  if (!container) return;
  container.innerHTML = renderTopicItems(catalogState.allTopics);
  bindFilterEvents(container);
}

function onFilterChange(e) {
  const type = e.target.dataset.type;
  const val = parseInt(e.target.value);

  if (type === 'category') {
    if (e.target.checked) catalogState.categories.push(val);
    else {
      catalogState.categories = catalogState.categories.filter(id => id !== val);
      catalogState.topics = catalogState.topics.filter(tid => {
        const topic = catalogState.allTopics.find(t => t.id === tid);
        return topic && catalogState.categories.includes(topic.categoryId);
      });
    }
    rebindTopics();
  } else if (type === 'topic') {
    e.target.checked ? catalogState.topics.push(val) : catalogState.topics = catalogState.topics.filter(id => id !== val);
  } else if (type === 'instructor') {
    e.target.checked ? catalogState.instructors.push(val) : catalogState.instructors = catalogState.instructors.filter(id => id !== val);
  }

  catalogState.page = 1;
  updateFilterCount();
  loadCourses();
}

function updateFilterCount() {
  const count = catalogState.categories.length + catalogState.topics.length + catalogState.instructors.length;
  const el = document.getElementById('filter-count');
  const clearBtn = document.getElementById('filter-clear-btn');
  if (el) el.textContent = count > 0 ? `${count} filter${count > 1 ? 's' : ''} active` : '0 Filters Active';
  if (clearBtn) count > 0 ? clearBtn.classList.add('is-active') : clearBtn.classList.remove('is-active');
}

function clearFilters() {
  catalogState.categories = [];
  catalogState.topics = [];
  catalogState.instructors = [];
  catalogState.page = 1;
  document.querySelectorAll('input[type="checkbox"]').forEach(cb => {
    cb.checked = false;
    const parent = cb.closest('.filter__chip') || cb.closest('.filter__item');
    if (parent) parent.classList.remove('is-active');
  });
  rebindTopics();
  updateFilterCount();
  loadCourses();
}

async function loadCourses() {
  const grid = document.getElementById('courses-grid');
  const info = document.getElementById('courses-info');
  if (!grid) return;

  grid.innerHTML = skeletonCatalogCards(6);

  try {
    const res = await api.getCourses(buildParams());
    const courses = res.data || [];
    const meta = res.meta || {};

    if (info) {
      const total = meta.total || courses.length;
      info.textContent = total > 0 ? `Showing ${courses.length} out of ${total}` : 'No courses found';
    }

    if (!courses.length) {
      grid.innerHTML = `<p class="catalog__empty text-body-s">No courses found. Try adjusting your filters.</p>`;
      return;
    }

    grid.innerHTML = courses.map(c => catalogCard(c)).join('');
    renderPagination(meta);
  } catch (e) {
    grid.innerHTML = `<p class="catalog__empty text-body-s">Failed to load courses.</p>`;
  }
}

function buildParams() {
  const p = new URLSearchParams();
  p.set('page', catalogState.page);
  p.set('per_page', 10);
  if (catalogState.sort) p.set('sort', catalogState.sort);
  catalogState.categories.forEach(id => p.append('categories[]', id));
  catalogState.topics.forEach(id => p.append('topics[]', id));
  catalogState.instructors.forEach(id => p.append('instructors[]', id));
  return '?' + p.toString();
}

function catalogCard(c) {
  const rating = c.avgRating ? Number(c.avgRating).toFixed(1) : '0.0';
  const duration = c.durationWeeks ? `${c.durationWeeks} Weeks` : '';
  const imageUrl = c.image?.startsWith('http') ? c.image : `${API_BASE_URL}${c.image || ''}`;
  
  const iconSrc = CATEGORY_ICONS[c.category?.id];

  return `
    <a href="course.html?id=${c.id}" class="catalog__card">
      <div class="catalog__card-img">
        <img src="${imageUrl}" alt="${c.title}" onerror="this.src='assets/placeholder.jpg'" />
      </div>

      <div class="catalog__card-body">
        <div class="catalog__card-meta">
          <p class="catalog__card-instructor text-micro-regular">
            ${c.instructor?.name || ''}${duration ? ` | ${duration}` : ''}
          </p>
          <div class="catalog__card-rating">
            <span style="color:var(--color-warning);">★</span>
            <span class="text-micro-medium" style="color:var(--color-grey-600);">${rating}</span>
          </div>
        </div>

        <h3 class="catalog__card-title text-h3">${c.title}</h3>

        <div class="catalog__card-category-wrapper">
          <span class="catalog__card-category text-micro-medium">
            ${iconSrc ? `<img src="${iconSrc}" width="16" height="16" style="margin-right:6px;" />` : ''}
            ${c.category?.name || ''}
          </span>
        </div>

        <div class="catalog__card-footer">
          <div class="price-box">
             <span class="text-micro-regular" style="color: var(--color-grey-00); display:block;">Starting from</span>
             <span class="catalog__card-price text-h3">$${c.basePrice ?? ''}</span>
          </div>
          <span class="catalog__card-btn text-micro-medium">Details</span>
        </div>
      </div>
    </a>
  `;
}

function renderPagination(meta) {
  const el = document.getElementById('pagination');
  if (!el) return;
  const current = meta.currentPage || 1;
  const last = meta.lastPage || 1;
  if (last <= 1) return el.innerHTML = '';

  el.innerHTML = `
    <button class="page-btn page-btn--arrow" ${current === 1 ? 'disabled' : ''} onclick="goToPage(${current - 1})">‹</button>
    ${Array.from({ length: last }, (_, i) => i + 1).map(p => `
      <button class="page-btn ${p === current ? 'page-btn--active' : ''}" onclick="goToPage(${p})">${p}</button>
    `).join('')}
    <button class="page-btn page-btn--arrow" ${current === last ? 'disabled' : ''} onclick="goToPage(${current + 1})">›</button>
  `;
}

function goToPage(page) {
  catalogState.page = page;
  loadCourses();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function skeletonCatalogCards(n) {
  return Array(n).fill(0).map(() => `
    <div class="catalog__card catalog__card--skeleton">
      <div class="skel skel--img" style="height:180px; background:#eee; border-radius:10px;"></div>
      <div class="skel__body" style="padding:16px 0;">
        <div class="skel skel--line" style="height:12px; background:#eee; margin-bottom:10px; width:40%;"></div>
        <div class="skel skel--line" style="height:20px; background:#eee; margin-bottom:10px; width:100%;"></div>
      </div>
    </div>
  `).join('');
}