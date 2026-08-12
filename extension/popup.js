import { api } from "./lib/api.js";

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function timeAgo(ms) {
  const sec = Math.round(Math.max(0, Date.now() - ms) / 1000);
  if (sec < 45) return "just now";
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  return `${day}d ago`;
}

const ICONS = {
  file: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>',
  tab: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 0 1 0 20 15 15 0 0 1 0-20"/></svg>',
  screenshot: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-5-5L5 21"/></svg>',
  chat: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.4 8.4 0 0 1-9 8.4A8.5 8.5 0 1 1 21 11.5Z"/></svg>',
};

function typeIcon(type) {
  return `<span class="type-icon">${ICONS[type] || ICONS.file}</span>`;
}

function typeBreakdown(items) {
  const counts = {};
  for (const i of items) counts[i.type] = (counts[i.type] || 0) + 1;
  return Object.entries(counts)
    .map(([t, c]) => `${c} ${t}${c > 1 ? "s" : ""}`)
    .join(", ");
}

let state = { threads: [], needsReview: [], todos: [], calendar: { configured: false, connected: false }, query: "" };

async function loadAll() {
  try {
    await api.health();
    setCompanionOnline(true);
  } catch {
    setCompanionOnline(false);
    return;
  }
  const [threads, needsReview, todos, calendar] = await Promise.all([
    api.threads(),
    api.needsReview(),
    api.todos(),
    api.calendarStatus(),
  ]);
  state = { ...state, threads, needsReview, todos, calendar };
  render();
}

function setCompanionOnline(online) {
  document.getElementById("companion-dot").classList.toggle("offline", !online);
  document.getElementById("companion-warning").classList.toggle("hidden", online);
}

function threadConfidence(thread) {
  return thread.items.some((i) => i.confidence === "suggested") ? "suggested" : "confirmed";
}

function matchesQuery(thread, q) {
  if (!q) return true;
  const needle = q.toLowerCase();
  return thread.name.toLowerCase().includes(needle) || thread.items.some((i) => i.name.toLowerCase().includes(needle));
}

function threadRow(thread, { dormant = false } = {}) {
  return `
    <div class="thread-row ${dormant ? "dormant" : ""}" data-thread-id="${thread.id}">
      <span class="confidence-dot ${threadConfidence(thread)}"></span>
      <div class="thread-main">
        <div class="thread-name">${escapeHtml(thread.name)}${thread.state === "forming" ? '<span class="badge-forming">Forming</span>' : ""}</div>
        <div class="thread-meta">${thread.items.length} items · ${typeBreakdown(thread.items)} · ${timeAgo(thread.lastTouched)}</div>
      </div>
      <button class="continue-btn" data-continue="${thread.id}">Continue</button>
    </div>`;
}

function render() {
  const q = state.query;
  const active = state.threads.filter((t) => (t.state === "active" || t.state === "forming") && matchesQuery(t, q)).sort((a, b) => b.lastTouched - a.lastTouched);
  const dormant = state.threads.filter((t) => t.state === "dormant" && matchesQuery(t, q)).sort((a, b) => b.lastTouched - a.lastTouched);

  document.getElementById("active-list").innerHTML = active.length
    ? active.map((t) => threadRow(t)).join("")
    : '<div class="empty-row">Nothing active yet.</div>';

  document.getElementById("dormant-list").innerHTML = dormant.length
    ? dormant.map((t) => threadRow(t, { dormant: true })).join("")
    : '<div class="empty-row">Nothing dormant.</div>';

  document.getElementById("review-count").textContent = state.needsReview.length ? `· ${state.needsReview.length}` : "";
  document.getElementById("needs-review-list").innerHTML = state.needsReview.length
    ? state.needsReview
        .map(
          ({ thread, item }) => `
      <div class="review-row" data-thread="${thread.id}" data-item="${item.id}">
        ${typeIcon(item.type)}
        <div class="review-main">
          <div class="review-name">${escapeHtml(item.name)}</div>
          <div class="review-target">→ ${escapeHtml(thread.name)}</div>
        </div>
        <button class="icon-btn reject" data-reject title="Reject">✕</button>
        <button class="icon-btn accept" data-accept title="Accept">✓</button>
      </div>`
        )
        .join("")
    : '<div class="empty-row">Nothing waiting on you.</div>';

  document.getElementById("calendar-banner").classList.toggle("hidden", state.calendar.connected);

  document.getElementById("todos-list").innerHTML = state.todos.length
    ? state.todos
        .map((todo) => {
          const thread = state.threads.find((t) => t.id === todo.threadId);
          return `
      <div class="todo-row" data-todo="${todo.id}">
        <button class="todo-check ${todo.done ? "done" : ""}" data-toggle-todo>${todo.done ? "✓" : ""}</button>
        <div class="todo-main">
          <div class="todo-text ${todo.done ? "done" : ""}">${escapeHtml(todo.text)}</div>
          <div class="todo-meta">${thread ? escapeHtml(thread.name) : "No Thread"}${todo.due?.text ? " · " + escapeHtml(todo.due.text) : ""}</div>
        </div>
      </div>`;
        })
        .join("")
    : '<div class="empty-row">No to-dos yet.</div>';

  renderLocations();
}

async function renderLocations() {
  const locations = await api.watchedLocations();
  document.getElementById("locations-drawer").innerHTML = locations
    .map(
      (loc) => `
    <div class="location-row">
      <span>${escapeHtml(loc.label)}</span>
      <button class="switch ${loc.enabled ? "on" : ""}" data-toggle-location="${loc.id}"><span class="knob"></span></button>
    </div>`
    )
    .join("");
}

// ---- events ----

document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    const view = btn.dataset.view;
    document.getElementById("view-threads").classList.toggle("hidden", view !== "threads");
    document.getElementById("view-todos").classList.toggle("hidden", view !== "todos");
  });
});

document.getElementById("search").addEventListener("input", (e) => {
  state.query = e.target.value;
  render();
});

document.body.addEventListener("click", async (e) => {
  const continueId = e.target.closest("[data-continue]")?.dataset.continue;
  if (continueId) {
    const { urls } = await api.continueThread(continueId);
    for (const url of urls) chrome.tabs.create({ url });
    await loadAll();
    return;
  }

  const reviewRow = e.target.closest(".review-row");
  if (reviewRow && (e.target.closest("[data-accept]") || e.target.closest("[data-reject]"))) {
    const { thread, item } = reviewRow.dataset;
    if (e.target.closest("[data-accept]")) await api.accept(thread, item);
    else await api.reject(thread, item);
    await loadAll();
    return;
  }

  const toggleTodoBtn = e.target.closest("[data-toggle-todo]");
  if (toggleTodoBtn) {
    const id = toggleTodoBtn.closest("[data-todo]").dataset.todo;
    const todo = state.todos.find((t) => t.id === id);
    await api.updateTodo(id, { done: !todo.done });
    await loadAll();
    return;
  }

  const locToggle = e.target.closest("[data-toggle-location]");
  if (locToggle) {
    await api.toggleLocation(locToggle.dataset.toggleLocation);
    renderLocations();
    return;
  }
});

document.getElementById("add-todo-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const input = document.getElementById("add-todo-input");
  const text = input.value.trim();
  if (!text) return;
  input.value = "";
  await api.addTodo({ text });
  await loadAll();
});

document.getElementById("connect-calendar-btn").addEventListener("click", async () => {
  try {
    const { authUrl } = await api.calendarConnect();
    chrome.tabs.create({ url: authUrl });
  } catch (err) {
    alert(err.message);
  }
});

document.getElementById("locations-toggle").addEventListener("click", () => {
  document.getElementById("locations-drawer").classList.toggle("hidden");
});

loadAll();
setInterval(loadAll, 15000);
