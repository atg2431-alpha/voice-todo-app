/**
 * app.js — Main application logic
 * Handles tab switching, dark/light mode toggle, toast notifications, and initialisation.
 */

// ── Toast notification ──────────────────────────────────────────────────────

/**
 * Display a brief toast notification.
 * @param {string} message
 * @param {'info'|'error'|'success'} [type='info']
 */
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;

  container.appendChild(toast);

  // Animate in
  requestAnimationFrame(() => toast.classList.add('show'));

  // Remove after 3 s
  setTimeout(() => {
    toast.classList.remove('show');
    toast.addEventListener('transitionend', () => toast.remove(), { once: true });
  }, 3000);
}

// ── Theme ────────────────────────────────────────────────────────────────────

const THEME_KEY = 'vt_theme';

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  Storage.set(THEME_KEY, theme);
  const icon = document.querySelector('#theme-toggle i');
  if (icon) {
    icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
  }
}

function initTheme() {
  const saved = Storage.get(THEME_KEY, null);
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  applyTheme(saved || (prefersDark ? 'dark' : 'light'));

  const btn = document.getElementById('theme-toggle');
  if (btn) {
    btn.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme');
      applyTheme(current === 'dark' ? 'light' : 'dark');
    });
  }
}

// ── Tab switching ────────────────────────────────────────────────────────────

function initTabs() {
  const tabs = document.querySelectorAll('.tab-btn');
  const panels = document.querySelectorAll('.tab-panel');

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.tab;

      tabs.forEach((t) => {
        t.classList.toggle('active', t.dataset.tab === target);
        t.setAttribute('aria-selected', t.dataset.tab === target);
      });

      panels.forEach((panel) => {
        const isActive = panel.id === `${target}-panel`;
        panel.classList.toggle('active', isActive);
        panel.setAttribute('aria-hidden', !isActive);
      });
    });
  });
}

// ── Speech API banner ────────────────────────────────────────────────────────

function initSpeechBanner() {
  if (!SpeechModule.isSupported()) {
    const banner = document.getElementById('speech-banner');
    if (banner) banner.hidden = false;
  }
}

// ── Bootstrap ────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initTabs();
  initSpeechBanner();
  Todos.init();
  Links.init();
});
