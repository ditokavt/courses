const API_BASE = 'https://api.redclass.redberryinternship.ge/api';

const Token = () => localStorage.getItem('token');

const headers = (auth = false) => {
  const h = { 'Content-Type': 'application/json' };
  if (auth) h['Authorization'] = `Bearer ${Token()}`;
  return h;
};

const api = {
  // AUTH
  register: (data) =>
    fetch(`${API_BASE}/register`, { method: 'POST', headers: headers(), body: JSON.stringify(data) }).then(r => r.json()),

  login: (data) =>
    fetch(`${API_BASE}/login`, { method: 'POST', headers: headers(), body: JSON.stringify(data) }).then(r => r.json()),

  logout: () =>
    fetch(`${API_BASE}/logout`, { method: 'POST', headers: headers(true) }).then(r => r.json()),

  getMe: () =>
    fetch(`${API_BASE}/me`, { headers: headers(true) }).then(r => r.json()),

  // PROFILE
  updateProfile: (data) =>
    fetch(`${API_BASE}/profile`, { method: 'PUT', headers: headers(true), body: JSON.stringify(data) }).then(r => r.json()),

  // COURSES
  getCourses: (params = '') =>
    fetch(`${API_BASE}/courses${params}`, { headers: headers() }).then(r => r.json()),

  getFeatured: () =>
    fetch(`${API_BASE}/courses/featured`, { headers: headers() }).then(r => r.json()),

  getInProgress: () =>
    fetch(`${API_BASE}/courses/in-progress`, { headers: headers(true) }).then(r => r.json()),

  getCourse: (id) =>
    fetch(`${API_BASE}/courses/${id}`, { headers: headers(true) }).then(r => r.json()),

  // FILTERS
  getCategories: () =>
    fetch(`${API_BASE}/categories`, { headers: headers() }).then(r => r.json()),

  getTopics: (categoryId = '') =>
    fetch(`${API_BASE}/topics${categoryId ? `?category=${categoryId}` : ''}`, { headers: headers() }).then(r => r.json()),

  getInstructors: () =>
    fetch(`${API_BASE}/instructors`, { headers: headers() }).then(r => r.json()),

  // SCHEDULE
  getWeeklySchedules: (id) =>
    fetch(`${API_BASE}/courses/${id}/weekly-schedules`, { headers: headers() }).then(r => r.json()),

  getTimeSlots: (id, weeklyScheduleId) =>
    fetch(`${API_BASE}/courses/${id}/time-slots?weekly_schedule_id=${weeklyScheduleId}`, { headers: headers() }).then(r => r.json()),

  getSessionTypes: (id, weeklyScheduleId, timeSlotId) =>
    fetch(`${API_BASE}/courses/${id}/session-types?weekly_schedule_id=${weeklyScheduleId}&time_slot_id=${timeSlotId}`, { headers: headers() }).then(r => r.json()),

  // ENROLLMENTS
  getEnrollments: () =>
    fetch(`${API_BASE}/enrollments`, { headers: headers(true) }).then(r => r.json()),

  enroll: (data) =>
    fetch(`${API_BASE}/enrollments`, { method: 'POST', headers: headers(true), body: JSON.stringify(data) }).then(r => r.json()),

  completeEnrollment: (id) =>
    fetch(`${API_BASE}/enrollments/${id}/complete`, { method: 'PATCH', headers: headers(true) }).then(r => r.json()),

  deleteEnrollment: (id) =>
    fetch(`${API_BASE}/enrollments/${id}`, { method: 'DELETE', headers: headers(true) }).then(r => r.json()),

  submitReview: (courseId, data) =>
    fetch(`${API_BASE}/courses/${courseId}/reviews`, { method: 'POST', headers: headers(true), body: JSON.stringify(data) }).then(r => r.json()),

  deleteEnrollment: (id) =>
  fetch(`${API_BASE}/enrollments/${id}`, { method: 'DELETE', headers: headers(true) }).then(r => r.status === 204 ? {} : r.json()),
};