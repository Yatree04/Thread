// Thin client for the local companion app. Every function here talks to
// http://127.0.0.1:4127 — nothing goes further than localhost.

export const COMPANION_BASE = "http://127.0.0.1:4127";

async function req(path, options) {
  const res = await fetch(`${COMPANION_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) throw new Error(`${path} -> ${res.status}`);
  return res.json();
}

export const api = {
  health: () => req("/health"),
  threads: () => req("/threads"),
  needsReview: () => req("/needs-review"),
  accept: (threadId, itemId) => req(`/threads/${threadId}/accept`, { method: "POST", body: JSON.stringify({ itemId }) }),
  reject: (threadId, itemId) => req(`/threads/${threadId}/reject`, { method: "POST", body: JSON.stringify({ itemId }) }),
  continueThread: (threadId) => req(`/threads/${threadId}/continue`, { method: "POST" }),
  createThread: (name, item) => req("/threads", { method: "POST", body: JSON.stringify({ name, item }) }),
  postItem: (item) => req("/items", { method: "POST", body: JSON.stringify(item) }),
  todos: () => req("/todos"),
  addTodo: (todo) => req("/todos", { method: "POST", body: JSON.stringify(todo) }),
  updateTodo: (id, patch) => req(`/todos/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),
  deleteTodo: (id) => req(`/todos/${id}`, { method: "DELETE" }),
  watchedLocations: () => req("/watched-locations"),
  toggleLocation: (id) => req(`/watched-locations/${id}/toggle`, { method: "POST" }),
  calendarStatus: () => req("/calendar/status"),
  calendarConnect: () => req("/calendar/connect"),
  now: () => req("/now"),
};
