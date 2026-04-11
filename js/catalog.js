// ================= CONFIG =================
const API_BASE_URL = '';

const CATEGORY_ICONS = {
  1: "assets/development.svg",
  2: "assets/design.svg",
  3: "assets/business.svg",
  4: "assets/marketing.svg",
  5: "assets/data science.svg",
};

// ================= STATE =================
const catalogState = {
  page: 1,
  categories: [],
  topics: [],
  instructors: [],
  sort: 'newest',
  allTopics: [],
  allInstructors: [],
};

// ================= INIT =================
document.addEventListener('DOMContentLoaded', initCatalog);

async function initCatalog() {
  if (!document.getElementById('catalog-root')) return;
  await loadFilters();
  // Phase 1-ში მხოლოდ სკელეტონს ვაჩვენებთ
  const grid = document.getElementById('courses-grid');
  if (grid) grid.innerHTML = skeletonCatalogCards(6);
}

// ================= FILTERS =================
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
    <span class="filter__active-count text-micro-medium" id="filter-count">0 Filters Active</span>
  `;

  bindFilterEvents(sidebar);
  document.getElementById('filter-clear-btn').addEventListener('click', clearFilters);
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

function onFilterChange(e) {
  const type = e.target.dataset.type;
  const val = parseInt(e.target.value);
  if (type === 'category') {
    if (e.target.checked) catalogState.categories.push(val);
    else catalogState.categories = catalogState.categories.filter(id => id !== val);
    const container = document.getElementById('filter-topics');
    if (container) {
        container.innerHTML = renderTopicItems(catalogState.allTopics);
        bindFilterEvents(container);
    }
  }
  updateFilterCount();
}

function updateFilterCount() {
  const count = catalogState.categories.length + catalogState.topics.length;
  const el = document.getElementById('filter-count');
  if (el) el.textContent = `${count} Filters Active`;
}

function clearFilters() {
  catalogState.categories = [];
  catalogState.topics = [];
  document.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
  updateFilterCount();
}

function skeletonCatalogCards(n) {
  return Array(n).fill(0).map(() => `
    <div class="catalog__card catalog__card--skeleton">
      <div style="height:180px; background:#eee; border-radius:10px;"></div>
      <div style="padding:16px 0;">
        <div style="height:12px; background:#eee; margin-bottom:10px; width:40%;"></div>
        <div style="height:20px; background:#eee; width:100%;"></div>
      </div>
    </div>
  `).join('');
}