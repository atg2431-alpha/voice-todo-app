/**
 * links.js — Smart Link Manager logic
 * Handles adding, auto-describing, editing, deleting, and rendering links.
 */

const Links = (() => {
  const STORAGE_KEY = 'vt_links';

  // ── Internal State ──────────────────────────────────────────────────────────

  /** @type {Array<{id:string, url:string, description:string, createdAt:number}>} */
  let links = [];

  // ── Persistence ─────────────────────────────────────────────────────────────

  function load() {
    links = Storage.get(STORAGE_KEY, []);
  }

  function save() {
    Storage.set(STORAGE_KEY, links);
  }

  // ── Auto-description ─────────────────────────────────────────────────────────

  /**
   * Generate a human-readable description from a URL using a local heuristic.
   * Extracts the domain name and the first meaningful path segment.
   *
   * @param {string} url
   * @returns {string}
   */
  function autoDescribe(url) {
    try {
      const parsed = new URL(url);
      const hostname = parsed.hostname.replace(/^www\./, '');
      const parts = parsed.pathname
        .split('/')
        .map((s) => s.replace(/[-_]/g, ' ').trim())
        .filter(Boolean);

      // Capitalise first letter helper
      const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

      if (parts.length === 0) return cap(hostname);

      // Use the last non-numeric, non-empty path segment as the page hint
      const lastMeaningful = [...parts]
        .reverse()
        .find((p) => !/^\d+$/.test(p) && p.length > 1);

      if (lastMeaningful) {
        return `${cap(lastMeaningful)} — ${hostname}`;
      }
      return cap(hostname);
    } catch (_) {
      return url;
    }
  }

  // ── CRUD ─────────────────────────────────────────────────────────────────────

  /**
   * Add a new link.
   * @param {string} rawUrl
   */
  function add(rawUrl) {
    let url = rawUrl.trim();
    if (!url) return;

    // Prepend protocol if missing
    if (!/^https?:\/\//i.test(url)) {
      url = 'https://' + url;
    }

    const link = {
      id: `link_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      url,
      description: autoDescribe(url),
      createdAt: Date.now(),
    };
    links.unshift(link);
    save();
    render();
  }

  /**
   * Update a link's description.
   * @param {string} id
   * @param {string} newDesc
   */
  function updateDesc(id, newDesc) {
    const link = links.find((l) => l.id === id);
    if (!link) return;
    link.description = newDesc.trim() || link.description;
    save();
    // No full re-render needed; DOM update happens in the edit handler.
  }

  /**
   * Delete a link by id.
   * @param {string} id
   */
  function remove(id) {
    links = links.filter((l) => l.id !== id);
    save();
    render();
  }

  // ── Rendering ────────────────────────────────────────────────────────────────

  function dateLabel(ts) {
    const d = new Date(ts);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (d.toDateString() === today.toDateString()) return 'Today';
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function escHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * Build a single link card element.
   * @param {{id:string, url:string, description:string, createdAt:number}} link
   * @returns {HTMLElement}
   */
  function buildLinkEl(link) {
    const card = document.createElement('div');
    card.className = 'link-card';
    card.dataset.id = link.id;

    const dateAdded = new Date(link.createdAt).toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
    });

    card.innerHTML = `
      <div class="link-icon-wrap">
        <img
          class="link-favicon"
          src="https://www.google.com/s2/favicons?sz=32&domain_url=${encodeURIComponent(link.url)}"
          alt=""
          loading="lazy"
          onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"
        >
        <span class="link-favicon-fallback" style="display:none"><i class="fas fa-link"></i></span>
      </div>
      <div class="link-body">
        <a class="link-url" href="${escHtml(link.url)}" target="_blank" rel="noopener noreferrer">${escHtml(link.url)}</a>
        <div class="link-desc-wrap">
          <span class="link-desc" title="Click to edit description">${escHtml(link.description)}</span>
          <input class="link-desc-input" type="text" value="${escHtml(link.description)}" aria-label="Edit description">
        </div>
        <span class="link-meta">${dateAdded}</span>
      </div>
      <div class="link-actions">
        <button class="btn-icon btn-delete" title="Delete link" aria-label="Delete link">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    `;

    // Inline-edit description on click
    const descSpan = card.querySelector('.link-desc');
    const descInput = card.querySelector('.link-desc-input');

    const startEdit = () => {
      card.classList.add('editing-desc');
      descInput.value = link.description;
      descInput.focus();
      descInput.select();
    };

    const commitEdit = () => {
      const newDesc = descInput.value.trim() || link.description;
      link.description = newDesc;
      descSpan.textContent = newDesc;
      card.classList.remove('editing-desc');
      updateDesc(link.id, newDesc);
    };

    descSpan.addEventListener('click', startEdit);
    descInput.addEventListener('blur', commitEdit);
    descInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') commitEdit();
      if (e.key === 'Escape') {
        card.classList.remove('editing-desc');
        descInput.value = link.description;
      }
    });

    // Delete
    card.querySelector('.btn-delete').addEventListener('click', () => {
      card.classList.add('removing');
      card.addEventListener('animationend', () => remove(link.id), { once: true });
    });

    return card;
  }

  /**
   * Re-render the links list into #link-list.
   */
  function render() {
    const container = document.getElementById('link-list');
    if (!container) return;

    container.innerHTML = '';

    if (links.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-link empty-icon"></i>
          <p>No links saved yet! Paste a URL or use the mic 🔗</p>
        </div>`;
      return;
    }

    // Group by date label
    const groups = new Map();
    links.forEach((link) => {
      const label = dateLabel(link.createdAt);
      if (!groups.has(label)) groups.set(label, []);
      groups.get(label).push(link);
    });

    groups.forEach((items, label) => {
      const section = document.createElement('div');
      section.className = 'date-group';
      section.innerHTML = `<h3 class="date-label">${label}</h3>`;
      const group = document.createElement('div');
      group.className = 'link-cards';
      items.forEach((link) => {
        const el = buildLinkEl(link);
        el.classList.add('entering');
        group.appendChild(el);
        requestAnimationFrame(() => {
          requestAnimationFrame(() => el.classList.remove('entering'));
        });
      });
      section.appendChild(group);
      container.appendChild(section);
    });
  }

  // ── Public API ───────────────────────────────────────────────────────────────

  function init() {
    load();
    render();

    // Text input form
    const form = document.getElementById('link-form');
    const input = document.getElementById('link-input');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const val = input.value.trim();
        if (val) {
          add(val);
          input.value = '';
        }
      });
    }

    // Mic button for links
    const micBtn = document.getElementById('link-mic-btn');
    if (micBtn) {
      if (!SpeechModule.isSupported()) {
        micBtn.disabled = true;
        micBtn.title = 'Speech recognition not supported in this browser';
      }
      micBtn.addEventListener('click', () => {
        SpeechModule.toggle({
          onResult(transcript) {
            // Detect URL-like speech: must contain a recognisable TLD pattern.
            const looksLikeUrl = /\b\w+\.(com|org|net|edu|gov|io|co|uk|dev|app|ai)\b/i.test(transcript);
            if (looksLikeUrl) {
              // Remove spaces so "github dot com slash user" → "github.com/user"
              const cleaned = transcript.replace(/\s+/g, '').replace(/dot/gi, '.');
              // Only add if it produces a parseable URL
              try {
                const candidate = /^https?:\/\//i.test(cleaned) ? cleaned : 'https://' + cleaned;
                new URL(candidate); // validates
                add(cleaned);
              } catch (_) {
                add(`https://www.google.com/search?q=${encodeURIComponent(transcript)}`);
              }
            } else {
              add(`https://www.google.com/search?q=${encodeURIComponent(transcript)}`);
            }
          },
          onStart() {
            micBtn.classList.add('listening');
            micBtn.setAttribute('aria-label', 'Stop listening');
          },
          onStop() {
            micBtn.classList.remove('listening');
            micBtn.setAttribute('aria-label', 'Start voice input for link');
          },
          onError(msg) {
            showToast(msg, 'error');
          },
        });
      });
    }
  }

  return { init, add, render };
})();
