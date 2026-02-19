/**
 * todos.js — Todo list logic
 * Handles creation, editing, completion, deletion, and rendering of tasks.
 * Extended with: deadlines, priorities, subtasks, categories, filter/sort, and progress summary.
 */

const Todos = (() => {
  const STORAGE_KEY = 'vt_todos';

  /** Generate a unique ID with a given prefix. */
  function genId(prefix) {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  }

  /**
   * Parse a YYYY-MM-DD deadline string to a local-midnight Date,
   * matching how `today` is constructed (local time), for consistent comparisons.
   */
  function parseDeadline(dateStr) {
    return new Date(dateStr + 'T00:00:00');
  }

  // ── Internal State ──────────────────────────────────────────────────────────

  /**
   * @type {Array<{
   *   id: string,
   *   text: string,
   *   completed: boolean,
   *   createdAt: number,
   *   deadline: number|null,
   *   priority: 'low'|'medium'|'high',
   *   subtasks: Array<{id:string, text:string, completed:boolean}>,
   *   categories: string[]
   * }>}
   */
  let todos = [];

  /** Current filter: 'all' | 'active' | 'completed' | 'overdue' */
  let currentFilter = 'all';
  /** Current sort: 'newest' | 'oldest' | 'deadline' | 'priority' */
  let currentSort = 'newest';
  /** Set of todo IDs whose subtask areas are currently expanded */
  const openSubtasks = new Set();

  // ── Persistence ─────────────────────────────────────────────────────────────

  function load() {
    const raw = Storage.get(STORAGE_KEY, []);
    // Migrate old todos that lack new fields
    todos = raw.map((t) => ({
      deadline: null,
      priority: 'medium',
      subtasks: [],
      categories: [],
      ...t,
    }));
  }

  function save() {
    Storage.set(STORAGE_KEY, todos);
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  /** Returns true if this todo is overdue (past deadline, not completed). */
  function isOverdue(todo) {
    if (!todo.deadline || todo.completed) return false;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return parseDeadline(todo.deadline) < today;
  }

  /** Returns true if deadline is today or tomorrow (within 1 day). */
  function isWarning(todo) {
    if (!todo.deadline || todo.completed) return false;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const due = parseDeadline(todo.deadline);
    return due >= today && due <= tomorrow;
  }

  /** Priority numeric value for sorting (high=3, medium=2, low=1). */
  function priorityValue(p) {
    return p === 'high' ? 3 : p === 'low' ? 1 : 2;
  }

  // ── CRUD ─────────────────────────────────────────────────────────────────────

  /**
   * Add a new todo item.
   * @param {string} text
   * @param {{deadline?:string, priority?:string, categories?:string[]}} opts
   */
  function add(text, opts = {}) {
    const trimmed = text.trim();
    if (!trimmed) return;

    const todo = {
      id: genId('todo'),
      text: trimmed,
      completed: false,
      createdAt: Date.now(),
      deadline: opts.deadline || null,
      priority: opts.priority || 'medium',
      subtasks: [],
      categories: Array.isArray(opts.categories) ? opts.categories : [],
    };
    todos.unshift(todo);
    save();
    render();
  }

  /**
   * Toggle the completion state of a todo.
   * @param {string} id
   */
  function toggle(id) {
    const todo = todos.find((t) => t.id === id);
    if (!todo) return;
    todo.completed = !todo.completed;
    save();
    render();
  }

  /**
   * Update the text (and optional fields) of a todo.
   * @param {string} id
   * @param {string} newText
   */
  function update(id, newText) {
    const trimmed = newText.trim();
    if (!trimmed) return;
    const todo = todos.find((t) => t.id === id);
    if (!todo) return;
    todo.text = trimmed;
    save();
    render();
  }

  /**
   * Delete a todo by id.
   * @param {string} id
   */
  function remove(id) {
    todos = todos.filter((t) => t.id !== id);
    save();
    render();
  }

  // ── Subtask CRUD ─────────────────────────────────────────────────────────────

  function addSubtask(todoId, text) {
    const trimmed = text.trim();
    if (!trimmed) return;
    const todo = todos.find((t) => t.id === todoId);
    if (!todo) return;
    todo.subtasks.push({
      id: genId('sub'),
      text: trimmed,
      completed: false,
    });
    save();
    render();
  }

  function toggleSubtask(todoId, subId) {
    const todo = todos.find((t) => t.id === todoId);
    if (!todo) return;
    const sub = todo.subtasks.find((s) => s.id === subId);
    if (!sub) return;
    sub.completed = !sub.completed;
    save();
    render();
  }

  function removeSubtask(todoId, subId) {
    const todo = todos.find((t) => t.id === todoId);
    if (!todo) return;
    todo.subtasks = todo.subtasks.filter((s) => s.id !== subId);
    save();
    render();
  }

  // ── Rendering ────────────────────────────────────────────────────────────────

  /** Format a timestamp into a readable date label (e.g. "Today", "Yesterday", or date). */
  function dateLabel(ts) {
    const d = new Date(ts);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (d.toDateString() === today.toDateString()) return 'Today';
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }

  /** Format timestamp into a short time string. */
  function timeStr(ts) {
    return new Date(ts).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  }

  /** Format a YYYY-MM-DD deadline string for display. */
  function formatDeadline(dateStr) {
    if (!dateStr) return '';
    return parseDeadline(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }

  /** Escape HTML special characters to prevent XSS. */
  function escHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /** Build the priority badge HTML. */
  function priorityBadgeHtml(priority) {
    const labels = { low: '🟢 Low', medium: '🟡 Medium', high: '🔴 High' };
    return `<span class="priority-badge priority-${priority}" aria-label="Priority: ${priority}">${labels[priority] || ''}</span>`;
  }

  /** Build the deadline badge HTML. */
  function deadlineBadgeHtml(todo) {
    if (!todo.deadline) return '';
    let cls = 'deadline-badge';
    let prefix = '';
    if (!todo.completed && isOverdue(todo)) {
      cls += ' deadline-overdue';
      prefix = '🔴 Overdue · ';
    } else if (!todo.completed && isWarning(todo)) {
      cls += ' deadline-warning';
      prefix = '⚠️ ';
    }
    return `<span class="${cls}"><i class="fas fa-calendar-alt" aria-hidden="true"></i> ${prefix}Due: ${escHtml(formatDeadline(todo.deadline))}</span>`;
  }

  /** Build category pills HTML. */
  function categoryPillsHtml(categories) {
    if (!categories || categories.length === 0) return '';
    return categories
      .map((c) => `<span class="task-cat-pill" data-cat="${escHtml(c)}">${escHtml(c)}</span>`)
      .join('');
  }

  /** Build subtask progress HTML (mini bar + count). */
  function subtaskProgressHtml(subtasks) {
    if (!subtasks || subtasks.length === 0) return '';
    const done = subtasks.filter((s) => s.completed).length;
    const total = subtasks.length;
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    return `
      <span class="subtask-progress" aria-label="${done} of ${total} subtasks complete">
        <span class="subtask-progress-bar-mini" aria-hidden="true">
          <span class="subtask-progress-bar-mini-fill" style="width:${pct}%"></span>
        </span>
        ${done}/${total}
      </span>`;
  }

  /**
   * Build a single todo <li> element.
   * @param {object} todo
   * @returns {HTMLElement}
   */
  function buildTodoEl(todo) {
    const li = document.createElement('li');
    const overdue = isOverdue(todo);
    const warning = !overdue && isWarning(todo);
    let classes = 'todo-item';
    if (todo.completed) classes += ' completed';
    if (overdue) classes += ' is-overdue';
    else if (warning) classes += ' is-warning';
    li.className = classes;
    li.dataset.id = todo.id;

    const catHtml = categoryPillsHtml(todo.categories);
    const deadlineHtml = deadlineBadgeHtml(todo);
    const priorityHtml = priorityBadgeHtml(todo.priority);
    const subProgressHtml = subtaskProgressHtml(todo.subtasks);

    li.innerHTML = `
      <div class="todo-main-row">
        <label class="todo-check" title="Mark complete">
          <input type="checkbox" class="todo-checkbox" ${todo.completed ? 'checked' : ''} aria-label="Complete task">
          <span class="checkmark"></span>
        </label>
        <div class="todo-body">
          <span class="todo-text">${escHtml(todo.text)}</span>
          <input class="todo-edit-input" type="text" value="${escHtml(todo.text)}" aria-label="Edit task">
          <div class="todo-badges">
            ${priorityHtml}
            ${deadlineHtml}
            ${catHtml ? `<span class="task-categories">${catHtml}</span>` : ''}
            ${subProgressHtml}
          </div>
          <span class="todo-meta">${timeStr(todo.createdAt)}</span>
        </div>
        <div class="todo-actions">
          <button class="btn-icon btn-subtask-toggle subtask-toggle" title="Toggle subtasks" aria-label="Toggle subtasks" aria-expanded="false">
            <i class="fas fa-chevron-down"></i>
          </button>
          <button class="btn-icon btn-edit" title="Edit task" aria-label="Edit task">
            <i class="fas fa-pen"></i>
          </button>
          <button class="btn-icon btn-delete" title="Delete task" aria-label="Delete task">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </div>
      <div class="subtask-area" hidden aria-hidden="true">
        <ul class="subtask-list" aria-label="Subtasks"></ul>
        <div class="subtask-add-row">
          <input type="text" class="subtask-input" placeholder="Add a subtask…" maxlength="200" aria-label="New subtask text">
          <button type="button" class="subtask-add-btn" aria-label="Add subtask">+ Add</button>
        </div>
      </div>
    `;

    // ── Checkbox: toggle completion ──────────────────────────────
    li.querySelector('.todo-checkbox').addEventListener('change', () => toggle(todo.id));

    // ── Edit button ──────────────────────────────────────────────
    const editBtn = li.querySelector('.btn-edit');
    const editInput = li.querySelector('.todo-edit-input');

    editBtn.addEventListener('click', () => {
      const editing = li.classList.toggle('editing');
      if (editing) {
        editInput.value = todo.text;
        editInput.focus();
        editInput.select();
        editBtn.querySelector('i').className = 'fas fa-check';
        editBtn.title = 'Save';
      } else {
        if (editInput.value.trim() !== todo.text) {
          update(todo.id, editInput.value);
        } else {
          editBtn.querySelector('i').className = 'fas fa-pen';
          editBtn.title = 'Edit task';
        }
      }
    });

    editInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        if (editInput.value.trim() !== todo.text) {
          update(todo.id, editInput.value);
        } else {
          li.classList.remove('editing');
          editBtn.querySelector('i').className = 'fas fa-pen';
          editBtn.title = 'Edit task';
        }
      } else if (e.key === 'Escape') {
        li.classList.remove('editing');
        editInput.value = todo.text;
        editBtn.querySelector('i').className = 'fas fa-pen';
      }
    });

    // ── Delete button ────────────────────────────────────────────
    li.querySelector('.btn-delete').addEventListener('click', () => {
      li.classList.add('removing');
      li.addEventListener('animationend', () => remove(todo.id), { once: true });
    });

    // ── Subtask toggle ───────────────────────────────────────────
    const subtaskToggleBtn = li.querySelector('.btn-subtask-toggle');
    const subtaskArea = li.querySelector('.subtask-area');

    // Restore open state
    if (openSubtasks.has(todo.id)) {
      subtaskArea.hidden = false;
      subtaskArea.setAttribute('aria-hidden', 'false');
      subtaskToggleBtn.setAttribute('aria-expanded', 'true');
      subtaskToggleBtn.classList.add('open');
    }

    subtaskToggleBtn.addEventListener('click', () => {
      const open = subtaskArea.hidden;
      subtaskArea.hidden = !open;
      subtaskArea.setAttribute('aria-hidden', open ? 'false' : 'true');
      subtaskToggleBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
      subtaskToggleBtn.classList.toggle('open', open);
      if (open) {
        openSubtasks.add(todo.id);
      } else {
        openSubtasks.delete(todo.id);
      }
    });

    // ── Subtask list ─────────────────────────────────────────────
    const subtaskList = li.querySelector('.subtask-list');
    renderSubtasks(subtaskList, todo);

    // ── Add subtask ──────────────────────────────────────────────
    const subtaskInput = li.querySelector('.subtask-input');
    const subtaskAddBtn = li.querySelector('.subtask-add-btn');

    const doAddSubtask = () => {
      if (subtaskInput.value.trim()) {
        addSubtask(todo.id, subtaskInput.value);
      }
    };

    subtaskAddBtn.addEventListener('click', doAddSubtask);
    subtaskInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); doAddSubtask(); }
    });

    return li;
  }

  /** Render subtask items into a <ul>. */
  function renderSubtasks(listEl, todo) {
    listEl.innerHTML = '';
    (todo.subtasks || []).forEach((sub) => {
      const li = document.createElement('li');
      li.className = `subtask-item${sub.completed ? ' completed' : ''}`;
      li.innerHTML = `
        <input type="checkbox" class="subtask-check" ${sub.completed ? 'checked' : ''} aria-label="Complete subtask">
        <span class="subtask-text">${escHtml(sub.text)}</span>
        <button type="button" class="subtask-delete" aria-label="Delete subtask" title="Delete subtask">
          <i class="fas fa-times"></i>
        </button>
      `;
      li.querySelector('.subtask-check').addEventListener('change', () => toggleSubtask(todo.id, sub.id));
      li.querySelector('.subtask-delete').addEventListener('click', () => removeSubtask(todo.id, sub.id));
      listEl.appendChild(li);
    });
  }

  /** Render the progress summary bar. */
  function renderProgress(visible) {
    const container = document.getElementById('progress-summary');
    if (!container) return;

    if (!visible || visible.length === 0) {
      container.innerHTML = '';
      return;
    }

    const total = visible.length;
    const completed = visible.filter((t) => t.completed).length;
    const overdueCount = visible.filter((t) => isOverdue(t)).length;
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

    if (completed === total && total > 0) {
      container.innerHTML = `<div class="progress-all-done">🎉 All done! Great job!</div>`;
      return;
    }

    container.innerHTML = `
      <div class="progress-stats">
        <span class="stat-item"><strong>${total}</strong> total</span>
        <span class="stat-item"><strong>${completed}</strong> completed</span>
        ${overdueCount > 0 ? `<span class="stat-item stat-overdue"><strong>${overdueCount}</strong> overdue</span>` : ''}
        <span class="stat-item">${pct}%</span>
      </div>
      <div class="progress-bar-wrap" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100" aria-label="Completion progress">
        <div class="progress-bar-fill" style="width:${pct}%"></div>
      </div>
    `;
  }

  /** Get the filtered + sorted list of todos. */
  function getVisible() {
    let list = [...todos];

    // Filter
    switch (currentFilter) {
      case 'active':
        list = list.filter((t) => !t.completed);
        break;
      case 'completed':
        list = list.filter((t) => t.completed);
        break;
      case 'overdue':
        list = list.filter((t) => isOverdue(t));
        break;
      // 'all' — no filter
    }

    // Sort
    switch (currentSort) {
      case 'oldest':
        list.sort((a, b) => a.createdAt - b.createdAt);
        break;
      case 'deadline':
        list.sort((a, b) => {
          const da = a.deadline ? parseDeadline(a.deadline).getTime() : Infinity;
          const db = b.deadline ? parseDeadline(b.deadline).getTime() : Infinity;
          return da - db;
        });
        break;
      case 'priority':
        list.sort((a, b) => priorityValue(b.priority) - priorityValue(a.priority));
        break;
      case 'newest':
      default:
        list.sort((a, b) => b.createdAt - a.createdAt);
        break;
    }

    return list;
  }

  /**
   * Re-render the todo list into #todo-list.
   */
  function render() {
    const container = document.getElementById('todo-list');
    if (!container) return;

    container.innerHTML = '';

    const visible = getVisible();
    renderProgress(visible);

    if (todos.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-microphone-slash empty-icon"></i>
          <p>No tasks yet! Tap the mic to get started 🎙️</p>
        </div>`;
      return;
    }

    if (visible.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-filter empty-icon"></i>
          <p>No tasks match the current filter.</p>
        </div>`;
      return;
    }

    // Group by date label (createdAt)
    const groups = new Map();
    visible.forEach((todo) => {
      const label = dateLabel(todo.createdAt);
      if (!groups.has(label)) groups.set(label, []);
      groups.get(label).push(todo);
    });

    groups.forEach((items, label) => {
      const section = document.createElement('div');
      section.className = 'date-group';
      section.innerHTML = `<h3 class="date-label">${label}</h3>`;
      const ul = document.createElement('ul');
      ul.className = 'todo-items';
      items.forEach((todo) => {
        const el = buildTodoEl(todo);
        el.classList.add('entering');
        ul.appendChild(el);
        requestAnimationFrame(() => {
          requestAnimationFrame(() => el.classList.remove('entering'));
        });
      });
      section.appendChild(ul);
      container.appendChild(section);
    });
  }

  // ── Public API ───────────────────────────────────────────────────────────────

  function init() {
    load();
    render();

    // ── Wire up the text input form ──────────────────────────────
    const form = document.getElementById('todo-form');
    const input = document.getElementById('todo-input');
    const deadlineInput = document.getElementById('todo-deadline');
    const prioritySelect = document.getElementById('todo-priority');

    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const val = input.value.trim();
        if (val) {
          const selectedCats = Array.from(
            document.querySelectorAll('#todo-categories .cat-pill.selected')
          ).map((el) => el.dataset.cat);

          add(val, {
            deadline: deadlineInput ? deadlineInput.value || null : null,
            priority: prioritySelect ? prioritySelect.value : 'medium',
            categories: selectedCats,
          });

          input.value = '';
          if (deadlineInput) deadlineInput.value = '';
          if (prioritySelect) prioritySelect.value = 'medium';
          // Deselect all category pills
          document.querySelectorAll('#todo-categories .cat-pill.selected').forEach((el) => {
            el.classList.remove('selected');
            el.setAttribute('aria-pressed', 'false');
          });
        }
      });
    }

    // ── Options toggle ───────────────────────────────────────────
    const optionsToggle = document.getElementById('todo-options-toggle');
    const optionsPanel = document.getElementById('todo-options');
    if (optionsToggle && optionsPanel) {
      optionsToggle.addEventListener('click', () => {
        const open = optionsPanel.hidden;
        optionsPanel.hidden = !open;
        optionsPanel.setAttribute('aria-hidden', open ? 'false' : 'true');
        optionsToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
        optionsToggle.classList.toggle('active', open);
      });
    }

    // ── Category pill toggles ────────────────────────────────────
    document.querySelectorAll('#todo-categories .cat-pill').forEach((pill) => {
      pill.setAttribute('aria-pressed', 'false');
      pill.addEventListener('click', () => {
        pill.classList.toggle('selected');
        pill.setAttribute('aria-pressed', pill.classList.contains('selected') ? 'true' : 'false');
      });
    });

    // ── Filter buttons ───────────────────────────────────────────
    document.querySelectorAll('.filter-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach((b) => {
          b.classList.remove('active');
          b.setAttribute('aria-pressed', 'false');
        });
        btn.classList.add('active');
        btn.setAttribute('aria-pressed', 'true');
        currentFilter = btn.dataset.filter;
        render();
      });
    });

    // ── Sort select ──────────────────────────────────────────────
    const sortSelect = document.getElementById('sort-select');
    if (sortSelect) {
      sortSelect.addEventListener('change', () => {
        currentSort = sortSelect.value;
        render();
      });
    }

    // ── Wire up the mic button for todos ─────────────────────────
    const micBtn = document.getElementById('todo-mic-btn');
    if (micBtn) {
      if (!SpeechModule.isSupported()) {
        micBtn.disabled = true;
        micBtn.title = 'Speech recognition not supported in this browser';
      }
      micBtn.addEventListener('click', () => {
        SpeechModule.toggle({
          onResult(transcript) {
            add(transcript);
          },
          onStart() {
            micBtn.classList.add('listening');
            micBtn.setAttribute('aria-label', 'Stop listening');
          },
          onStop() {
            micBtn.classList.remove('listening');
            micBtn.setAttribute('aria-label', 'Start voice input');
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
