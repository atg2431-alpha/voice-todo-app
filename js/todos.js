/**
 * todos.js — Todo list logic
 * Handles creation, editing, completion, deletion, and rendering of tasks.
 */

const Todos = (() => {
  const STORAGE_KEY = 'vt_todos';

  // ── Internal State ──────────────────────────────────────────────────────────

  /** @type {Array<{id:string, text:string, completed:boolean, createdAt:number}>} */
  let todos = [];

  // ── Persistence ─────────────────────────────────────────────────────────────

  function load() {
    todos = Storage.get(STORAGE_KEY, []);
  }

  function save() {
    Storage.set(STORAGE_KEY, todos);
  }

  // ── CRUD ─────────────────────────────────────────────────────────────────────

  /**
   * Add a new todo item.
   * @param {string} text
   */
  function add(text) {
    const trimmed = text.trim();
    if (!trimmed) return;

    const todo = {
      id: `todo_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      text: trimmed,
      completed: false,
      createdAt: Date.now(),
    };
    todos.unshift(todo); // newest first
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
   * Update the text of a todo.
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

  /** Escape HTML special characters to prevent XSS. */
  function escHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * Build a single todo <li> element.
   * @param {{id:string, text:string, completed:boolean, createdAt:number}} todo
   * @returns {HTMLElement}
   */
  function buildTodoEl(todo) {
    const li = document.createElement('li');
    li.className = `todo-item${todo.completed ? ' completed' : ''}`;
    li.dataset.id = todo.id;

    li.innerHTML = `
      <label class="todo-check" title="Mark complete">
        <input type="checkbox" class="todo-checkbox" ${todo.completed ? 'checked' : ''} aria-label="Complete task">
        <span class="checkmark"></span>
      </label>
      <div class="todo-body">
        <span class="todo-text">${escHtml(todo.text)}</span>
        <input class="todo-edit-input" type="text" value="${escHtml(todo.text)}" aria-label="Edit task">
        <span class="todo-meta">${timeStr(todo.createdAt)}</span>
      </div>
      <div class="todo-actions">
        <button class="btn-icon btn-edit" title="Edit task" aria-label="Edit task">
          <i class="fas fa-pen"></i>
        </button>
        <button class="btn-icon btn-delete" title="Delete task" aria-label="Delete task">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    `;

    // Checkbox: toggle completion
    li.querySelector('.todo-checkbox').addEventListener('change', () => toggle(todo.id));

    // Edit button
    const editBtn = li.querySelector('.btn-edit');
    const textSpan = li.querySelector('.todo-text');
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

    // Delete button
    li.querySelector('.btn-delete').addEventListener('click', () => {
      li.classList.add('removing');
      li.addEventListener('animationend', () => remove(todo.id), { once: true });
    });

    return li;
  }

  /**
   * Re-render the todo list into #todo-list.
   */
  function render() {
    const container = document.getElementById('todo-list');
    if (!container) return;

    container.innerHTML = '';

    if (todos.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-microphone-slash empty-icon"></i>
          <p>No tasks yet! Tap the mic to get started 🎙️</p>
        </div>`;
      return;
    }

    // Group by date label
    const groups = new Map();
    todos.forEach((todo) => {
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
        // Trigger enter animation
        el.classList.add('entering');
        ul.appendChild(el);
        // Remove animation class after it plays
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

    // Wire up the text input form
    const form = document.getElementById('todo-form');
    const input = document.getElementById('todo-input');
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

    // Wire up the mic button for todos
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
