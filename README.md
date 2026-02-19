# VoiceDo — Voice-Enabled To-Do & Smart Link Manager

A modern, single-page web application that combines a **voice-enabled to-do list** with a **smart link manager**. Built entirely with vanilla HTML, CSS, and JavaScript — no frameworks, no build tools.

---

## ✨ Features

### 📝 Voice-Enabled To-Do List
- **Voice input** via the Web Speech API — tap the mic button and speak your task.
- **Manual text input** as a fallback.
- Mark tasks as **complete** with a custom animated checkbox.
- **Inline editing** of any task.
- **Delete** tasks with a smooth slide-out animation.
- Tasks grouped by **date** (Today / Yesterday / specific dates), newest first.
- All tasks persisted in **LocalStorage**.

### 🔗 Smart Link Manager
- Save URLs via text input or **voice**.
- **Auto-generated descriptions** extracted from the URL (domain + path heuristic).
- Descriptions are **fully editable** — click to edit inline.
- Links grouped by **date saved**, newest first.
- Favicon previews for each saved link.
- All links persisted in **LocalStorage**.

### 🎨 UI/UX
- **Dark / Light mode** toggle (respects system preference on first load).
- **Mobile-responsive** layout.
- Smooth **enter / exit animations** for tasks and links.
- Pulsing mic button with **glow animation** while listening.
- **Toast notifications** for errors.
- Graceful fallback message when the Speech API is not available.

---

## 🚀 Getting Started

Just open `index.html` in your browser — no server, no install, no build step needed.

```
open index.html
```

> **Voice features** require a browser that supports the [Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API) (Chrome or Edge recommended). Firefox and Safari have partial or no support.

---

## 📂 File Structure

```
index.html          Main HTML file
css/
  styles.css        All styles (light/dark mode, animations, responsive)
js/
  app.js            Main app logic (tab switching, theme, init)
  speech.js         Web Speech API module
  storage.js        LocalStorage helpers
  todos.js          To-do list logic
  links.js          Link manager logic
assets/             Static assets (if any)
README.md           This file
```

---

## 🛠 Tech Stack

| Layer      | Technology                           |
|------------|--------------------------------------|
| HTML       | Semantic HTML5                       |
| CSS        | Custom Properties, Flexbox, Animations |
| JavaScript | ES6+ Vanilla JS (no frameworks)      |
| Icons      | Font Awesome 6 (CDN)                 |
| Fonts      | Google Fonts — Inter                 |
| Storage    | Browser LocalStorage                 |
| Voice      | Web Speech API                       |

---

## 📸 Screenshots

> *(Add screenshots here once the app is running.)*

---

## 🌐 Browser Support

| Browser | Tasks & Links | Voice Input |
|---------|---------------|-------------|
| Chrome  | ✅            | ✅          |
| Edge    | ✅            | ✅          |
| Safari  | ✅            | ⚠️ Partial  |
| Firefox | ✅            | ❌          |

Voice input requires HTTPS or `localhost` in most browsers.