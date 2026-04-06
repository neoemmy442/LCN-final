function getApiBase() {
  const { protocol, hostname, port, origin } = window.location;
  if (port === '3001' || port === '') return origin;
  if (protocol.startsWith('http')) return `${protocol}//${hostname}:3001`;
  return 'http://localhost:3001';
}

const API_BASE = getApiBase();
const ADMIN_KEY_STORAGE = 'lcn_admin_api_key';


function getAdminKey() {
  return localStorage.getItem(ADMIN_KEY_STORAGE) || '';
}

function setStatus(message, isError = false) {
  const status = document.getElementById('admin-auth-status');
  if (!status) return;
  status.textContent = message;
  status.style.color = isError ? 'red' : 'green';
}

async function adminFetch(url, options = {}) {
  const apiKey = getAdminKey();
  const headers = new Headers(options.headers || {});

  if (apiKey) headers.set('x-api-key', apiKey);

  const response = await fetch(`${API_BASE}${url}`, { ...options, headers });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || 'Request failed.');
  }

  return data;
}

function renderList(containerId, items, type) {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (!items.length) {
    container.innerHTML = '<p class="empty-state">No records found.</p>';
    return;
  }

  container.innerHTML = items.map(item => {
    if (type === 'gallery') {
      return `
        <div class="admin-item">
          <div class="admin-item-main">
            <img src="${item.image_url}" alt="${item.title}" class="admin-thumb" />
            <div>
              <h4>${item.title}</h4>
              <p>${item.category || 'No category'}</p>
              <small>${item.description || ''}</small>
            </div>
          </div>
          <button class="btn btn-secondary admin-delete-btn" data-type="gallery" data-id="${item.id}">Delete</button>
        </div>`;
    }

    if (type === 'events') {
      return `
        <div class="admin-item">
          <div>
            <h4>${item.title}</h4>
            <p>${item.description || ''}</p>
            <small>${item.event_date || ''} ${item.event_time || ''} ${item.location ? `• ${item.location}` : ''}</small>
          </div>
          <button class="btn btn-secondary admin-delete-btn" data-type="events" data-id="${item.id}">Delete</button>
        </div>`;
    }

    if (type === 'news') {
      return `
        <div class="admin-item">
          <div>
            <h4>${item.title}</h4>
            <p>${item.content || ''}</p>
            <small>${item.posted_date || ''}</small>
          </div>
          <button class="btn btn-secondary admin-delete-btn" data-type="news" data-id="${item.id}">Delete</button>
        </div>`;
    }

    if (type === 'announcements') {
      return `
        <div class="admin-item">
          <div>
            <h4>${item.title}</h4>
            <p>${item.content || ''}</p>
            <small>${item.posted_date || ''}</small>
          </div>
          <button class="btn btn-secondary admin-delete-btn" data-type="announcements" data-id="${item.id}">Delete</button>
        </div>`;
    }

    if (type === 'messages') {
      return `
        <div class="admin-item stacked-item">
          <h4>${item.name} <span>${item.email}</span></h4>
          <p><strong>Subject:</strong> ${item.subject || ''}</p>
          <p>${item.message || ''}</p>
          <small>${item.created_at || ''}</small>
        </div>`;
    }

    return `
      <div class="admin-item stacked-item">
        <h4>${item.student_name}</h4>
        <p><strong>Class:</strong> ${item.class_applying}</p>
        <p><strong>Parent:</strong> ${item.parent_name} • ${item.parent_phone}</p>
        <p><strong>Address:</strong> ${item.address}</p>
        <small>${item.created_at || ''}</small>
      </div>`;
  }).join('');
}

async function loadDashboardData() {
  try {
    const [gallery, events, news, announcements, messages, applications] = await Promise.all([
      adminFetch('/api/gallery'),
      adminFetch('/api/events'),
      adminFetch('/api/news'),
      adminFetch('/api/announcements'),
      adminFetch('/api/admin/messages'),
      adminFetch('/api/admin/applications')
    ]);

    renderList('admin-gallery-list', gallery, 'gallery');
    renderList('admin-events-list', events, 'events');
    renderList('admin-news-list', news, 'news');
    renderList('admin-announcements-list', announcements, 'announcements');
    renderList('admin-messages-list', messages, 'messages');
    renderList('admin-applications-list', applications, 'applications');
    setStatus('Dashboard data loaded.');
  } catch (error) {
    setStatus(error.message, true);
  }
}

function bindForm(formId, endpoint, useFormData = true) {
  const form = document.getElementById(formId);
  if (!form) return;

  form.addEventListener('submit', async event => {
    event.preventDefault();
    const statusEl = form.querySelector('.admin-form-status');
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving...';
    statusEl.textContent = '';

    try {
      const body = useFormData ? new FormData(form) : JSON.stringify(Object.fromEntries(new FormData(form).entries()));
      const headers = useFormData ? {} : { 'Content-Type': 'application/json' };
      const data = await adminFetch(endpoint, { method: 'POST', body, headers });
      statusEl.textContent = data.message || 'Saved.';
      statusEl.style.color = 'green';
      form.reset();
      await loadDashboardData();
    } catch (error) {
      statusEl.textContent = error.message;
      statusEl.style.color = 'red';
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initializeAdminThemeToggle();
  const apiInput = document.getElementById('admin-api-key');
  const saved = getAdminKey();
  if (saved) {
    apiInput.value = saved;
    setStatus('Saved API key found.');
    loadDashboardData();
  }

  document.getElementById('save-api-key-btn')?.addEventListener('click', () => {
    localStorage.setItem(ADMIN_KEY_STORAGE, apiInput.value.trim());
    setStatus('API key saved.');
    loadDashboardData();
  });

  document.getElementById('clear-api-key-btn')?.addEventListener('click', () => {
    localStorage.removeItem(ADMIN_KEY_STORAGE);
    apiInput.value = '';
    setStatus('API key cleared.');
  });

  bindForm('gallery-admin-form', '/api/admin/gallery', true);
  bindForm('event-admin-form', '/api/admin/events', true);
  bindForm('news-admin-form', '/api/admin/news', true);
  bindForm('announcement-admin-form', '/api/admin/announcements', false);

  document.querySelectorAll('.refresh-btn').forEach(btn => {
    btn.addEventListener('click', () => loadDashboardData());
  });

  document.body.addEventListener('click', async event => {
    const btn = event.target.closest('.admin-delete-btn');
    if (!btn) return;

    const { type, id } = btn.dataset;
    if (!confirm('Delete this item?')) return;

    try {
      await adminFetch(`/api/admin/${type}/${id}`, { method: 'DELETE' });
      await loadDashboardData();
    } catch (error) {
      setStatus(error.message, true);
    }
  });
});


function initializeAdminThemeToggle() {
  let toggle = document.querySelector('.floating-theme-toggle');
  if (!toggle) {
    toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'theme-toggle floating-theme-toggle';
    toggle.innerHTML = '<i class="fas fa-moon"></i>';
    document.body.appendChild(toggle);
  }

  const icon = toggle.querySelector('i');
  const applyTheme = (theme) => {
    document.body.classList.toggle('dark-theme', theme === 'dark');
    if (icon) icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
  };

  const savedTheme = localStorage.getItem('lcn-theme') || 'light';
  applyTheme(savedTheme);

  toggle.addEventListener('click', () => {
    const nextTheme = document.body.classList.contains('dark-theme') ? 'light' : 'dark';
    localStorage.setItem('lcn-theme', nextTheme);
    applyTheme(nextTheme);
  });
}
