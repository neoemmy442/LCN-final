function getApiBase() {
    const { protocol, hostname, port, origin } = window.location;
    if (port === '3001' || port === '') return origin;
    if (protocol.startsWith('http')) return `${protocol}//${hostname}:3001`;
    return 'http://localhost:3001';
}

const API_BASE = getApiBase();

function showSection(sectionId, updateHash = true) {
    const sections = document.querySelectorAll('.content-section');
    if (!sections.length) return;

    sections.forEach(section => section.classList.remove('active'));

    const targetSection = document.getElementById(sectionId) || sections[0];
    if (!targetSection) return;

    targetSection.classList.add('active');

    if (updateHash) {
        const newHash = `#${targetSection.id}`;
        if (window.location.hash !== newHash) {
            history.replaceState(null, '', newHash);
        }
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function setActiveNavigation() {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('[data-page]').forEach(link => {
        const isActive = link.getAttribute('data-page') === currentPage;
        link.classList.toggle('active-nav', isActive);
    });
}

function initializeSectionRouting() {
    const sections = document.querySelectorAll('.content-section');
    if (!sections.length) return;

    const defaultSectionId = sections[0].id;
    const targetSectionId = window.location.hash ? window.location.hash.substring(1) : defaultSectionId;
    showSection(targetSectionId, false);
}

async function fetchJson(url) {
    const response = await fetch(url, { headers: { Accept: 'application/json' } });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(data.message || 'Request failed.');
    }
    return data;
}

function formatDisplayDate(dateValue) {
    if (!dateValue) return 'N/A';
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return dateValue;
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

async function loadGallery() {
    const carousel = document.querySelector('.carousel');
    if (!carousel) return;

    try {
        const items = await fetchJson(`${API_BASE}/api/gallery`);
        if (!Array.isArray(items) || !items.length) return;

        carousel.innerHTML = items.map(item => `
            <div class="slide">
                <img src="${item.image_url}" alt="${item.title || 'Gallery image'}">
            </div>
        `).join('');
    } catch (error) {
        console.error('Gallery load error:', error);
    }
}

async function loadEvents() {
    const eventsList = document.getElementById('events-list');
    if (!eventsList) return;

    try {
        const events = await fetchJson(`${API_BASE}/api/events`);

        if (!Array.isArray(events) || !events.length) {
            eventsList.innerHTML = '<p>No upcoming events available right now.</p>';
            return;
        }

        eventsList.innerHTML = events.map(event => `
            <div class="card">
                ${event.image_url ? `<img src="${event.image_url}" alt="${event.title}" class="dynamic-card-image">` : ''}
                <h3>${event.title}</h3>
                <p>${event.description || ''}</p>
                <p><strong>Date:</strong> ${formatDisplayDate(event.event_date)}</p>
                <p><strong>Time:</strong> ${event.event_time || 'N/A'}</p>
                <p><strong>Location:</strong> ${event.location || 'School premises'}</p>
            </div>
        `).join('');
    } catch (error) {
        console.error('Events load error:', error);
        eventsList.innerHTML = '<p>Failed to load events.</p>';
    }
}

async function loadNews() {
    const newsList = document.getElementById('school-news-list');
    if (!newsList) return;

    try {
        const items = await fetchJson(`${API_BASE}/api/news`);
        if (!Array.isArray(items) || !items.length) {
            newsList.innerHTML = '<p>No school news available right now.</p>';
            return;
        }

        newsList.innerHTML = items.map(item => `
            <div class="news-item">
                <div class="news-image">
                    ${item.image_url ? `<img src="${item.image_url}" alt="${item.title}" class="img-placeholder">` : '<i class="fas fa-newspaper"></i>'}
                </div>
                <div class="news-content">
                    <div class="news-date">${formatDisplayDate(item.posted_date)}</div>
                    <h3>${item.title}</h3>
                    <p>${item.content}</p>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('News load error:', error);
        newsList.innerHTML = '<p>Failed to load school news.</p>';
    }
}

async function loadAnnouncements() {
    const list = document.getElementById('announcements-list');
    if (!list) return;

    try {
        const items = await fetchJson(`${API_BASE}/api/announcements`);
        if (!Array.isArray(items) || !items.length) {
            list.innerHTML = '<p>No announcements available right now.</p>';
            return;
        }

        list.innerHTML = items.map(item => `
            <div class="announcement-item">
                <div class="announcement-date">${formatDisplayDate(item.posted_date)}</div>
                <h3>${item.title}</h3>
                <p>${item.content}</p>
            </div>
        `).join('');
    } catch (error) {
        console.error('Announcements load error:', error);
        list.innerHTML = '<p>Failed to load announcements.</p>';
    }
}


function initializeRevealAnimations() {
    const selectors = '.section-header, .section-intro, .stats-section, .card, .news-item, .announcement-item, .form-container, .admin-auth, .admin-list-card, .admin-form-card, .quick-link-card, .cta-banner';
    const elements = document.querySelectorAll(selectors);
    if (!elements.length) return;

    elements.forEach((element, index) => {
        element.classList.add('reveal-on-scroll');
        element.style.transitionDelay = `${Math.min(index * 40, 240)}ms`;
    });

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('revealed');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.12 });

    elements.forEach(element => observer.observe(element));
}


function initializeThemeToggle() {
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
        toggle.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
        toggle.setAttribute('title', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
    };

    const savedTheme = localStorage.getItem('lcn-theme') || 'light';
    applyTheme(savedTheme);

    toggle.addEventListener('click', () => {
        const nextTheme = document.body.classList.contains('dark-theme') ? 'light' : 'dark';
        localStorage.setItem('lcn-theme', nextTheme);
        applyTheme(nextTheme);
    });
}

document.addEventListener('DOMContentLoaded', async function () {
    const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
    const mobileNav = document.querySelector('.mobile-nav');
    const mobileDropdownToggles = document.querySelectorAll('.mobile-dropdown-toggle');
    const contactForm = document.getElementById('contact-form');
    const contactFormStatus = document.getElementById('contact-form-status');
    const contactSubmitBtn = document.getElementById('contact-submit-btn');
    const applicationForm = document.getElementById('application-form');
    const applicationFormStatus = document.getElementById('application-form-status');
    const applicationSubmitBtn = document.getElementById('application-submit-btn');

    setActiveNavigation();
    initializeSectionRouting();
    initializeThemeToggle();
    initializeRevealAnimations();

    await Promise.allSettled([
        loadGallery(),
        loadEvents(),
        loadNews(),
        loadAnnouncements()
    ]);

    function closeMobileMenu() {
        if (!mobileMenuToggle || !mobileNav) return;

        mobileMenuToggle.classList.remove('active');
        mobileNav.classList.remove('active');
        document.body.style.overflow = '';

        mobileDropdownToggles.forEach(toggle => {
            const dropdown = toggle.parentElement;
            const content = dropdown.querySelector('.mobile-dropdown-content');
            dropdown.classList.remove('active');
            if (content) content.classList.remove('active');
        });
    }

    if (mobileMenuToggle && mobileNav) {
        mobileMenuToggle.addEventListener('click', function (event) {
            event.stopPropagation();
            const isActive = this.classList.toggle('active');
            mobileNav.classList.toggle('active');
            document.body.style.overflow = isActive ? 'hidden' : '';
        });
    }

    mobileDropdownToggles.forEach(toggle => {
        toggle.addEventListener('click', function () {
            const parentDropdown = this.parentElement;
            const content = parentDropdown.querySelector('.mobile-dropdown-content');
            const isAlreadyActive = parentDropdown.classList.contains('active');

            document.querySelectorAll('.mobile-dropdown').forEach(dropdown => {
                if (dropdown !== parentDropdown) {
                    dropdown.classList.remove('active');
                    const dropdownContent = dropdown.querySelector('.mobile-dropdown-content');
                    if (dropdownContent) dropdownContent.classList.remove('active');
                }
            });

            parentDropdown.classList.toggle('active', !isAlreadyActive);
            if (content) content.classList.toggle('active', !isAlreadyActive);
        });
    });

    document.querySelectorAll('a[href]').forEach(link => {
        link.addEventListener('click', function () {
            if (mobileNav && mobileNav.classList.contains('active')) {
                closeMobileMenu();
            }
        });
    });

    document.addEventListener('click', function (event) {
        if (mobileNav && mobileNav.classList.contains('active') && !mobileNav.contains(event.target) && !mobileMenuToggle.contains(event.target)) {
            closeMobileMenu();
        }
    });

    window.addEventListener('resize', function () {
        if (window.innerWidth > 768 && mobileNav && mobileNav.classList.contains('active')) {
            closeMobileMenu();
        }
    });

    window.addEventListener('hashchange', function () {
        const sectionId = window.location.hash.substring(1);
        if (sectionId) showSection(sectionId, false);
    });

    function attachAjaxForm(form, submitBtn, statusEl, loadingText, successFallback) {
        if (!form || !submitBtn || !statusEl) return;

        form.addEventListener('submit', async function (event) {
            event.preventDefault();
            const formData = new FormData(form);
            const payload = new URLSearchParams(formData);
            const defaultText = submitBtn.textContent;

            submitBtn.disabled = true;
            submitBtn.textContent = loadingText;
            statusEl.textContent = '';

            try {
                const response = await fetch(form.action, {
                    method: form.method || 'POST',
                    body: payload,
                    headers: {
                        Accept: 'application/json',
                        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
                    }
                });

                const data = await response.json().catch(() => ({}));

                if (!response.ok) {
                    throw new Error(data.message || 'Oops! There was a problem.');
                }

                statusEl.textContent = data.message || successFallback;
                statusEl.style.color = 'green';
                form.reset();
            } catch (error) {
                statusEl.textContent = error.message || 'Oops! There was a network error.';
                statusEl.style.color = 'red';
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = defaultText;
            }
        });
    }

    attachAjaxForm(contactForm, contactSubmitBtn, contactFormStatus, 'Sending...', 'Thank you! Your message has been sent.');
    attachAjaxForm(applicationForm, applicationSubmitBtn, applicationFormStatus, 'Submitting...', 'Application submitted successfully.');

    const carousel = document.querySelector('.carousel');
    if (carousel) {
        const nextButton = document.querySelector('.carousel-container .next');
        const prevButton = document.querySelector('.carousel-container .prev');
        let currentIndex = 0;

        function getSlides() {
            return Array.from(carousel.children);
        }

        function updateCarousel() {
            const slides = getSlides();
            if (!slides.length) return;

            if (currentIndex >= slides.length) currentIndex = 0;

            slides.forEach((slide, index) => {
                slide.classList.remove('active', 'prev-slide', 'next-slide');

                if (index === currentIndex) {
                    slide.classList.add('active');
                } else if (index === (currentIndex - 1 + slides.length) % slides.length) {
                    slide.classList.add('prev-slide');
                } else if (index === (currentIndex + 1) % slides.length) {
                    slide.classList.add('next-slide');
                }
            });
        }

        if (nextButton) {
            nextButton.addEventListener('click', function (event) {
                event.preventDefault();
                const slides = getSlides();
                if (!slides.length) return;
                currentIndex = (currentIndex + 1) % slides.length;
                updateCarousel();
            });
        }

        if (prevButton) {
            prevButton.addEventListener('click', function (event) {
                event.preventDefault();
                const slides = getSlides();
                if (!slides.length) return;
                currentIndex = (currentIndex - 1 + slides.length) % slides.length;
                updateCarousel();
            });
        }

        updateCarousel();
    }
});

window.addEventListener('load', function () {
    document.body.style.opacity = '0';
    setTimeout(function () {
        document.body.style.transition = 'opacity 0.5s ease-in';
        document.body.style.opacity = '1';
    }, 100);
});
