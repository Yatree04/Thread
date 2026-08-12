import fs from "node:fs";
import { nanoid } from "nanoid";
import { storePath } from "./config.js";

function blank() {
  return {
    threads: [],
    todos: [],
    watchedLocations: [
      { id: "downloads", label: "Downloads", enabled: true },
      { id: "desktop", label: "Desktop", enabled: true },
      { id: "screenshots", label: "Screenshots", enabled: true },
      { id: "tabs", label: "Browser tabs", enabled: true },
    ],
    seenPaths: {},
  };
}

function load() {
  if (!fs.existsSync(storePath)) return blank();
  try {
    const raw = fs.readFileSync(storePath, "utf-8");
    return { ...blank(), ...JSON.parse(raw) };
  } catch (err) {
    console.error("[store] failed to read store.json, starting fresh:", err.message);
    return blank();
  }
}

let state = load();

function persist() {
  const tmp = `${storePath}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(state, null, 2));
  fs.renameSync(tmp, storePath);
}

// ---- threads ----

export function getThreads() {
  return state.threads;
}

export function getThread(id) {
  return state.threads.find((t) => t.id === id);
}

export function createThread({ name, item, whyGrouped, summary, state: threadState = "forming" }) {
  const thread = {
    id: nanoid(10),
    name,
    state: threadState,
    createdAt: Date.now(),
    lastTouched: Date.now(),
    summary: summary || "Just started — Thread will learn more as you add items.",
    whyGrouped: whyGrouped || "You started this Thread manually.",
    items: item ? [item] : [],
  };
  state.threads.unshift(thread);
  persist();
  return thread;
}

export function addItemToThread(threadId, item, { touch = true } = {}) {
  const thread = getThread(threadId);
  if (!thread) return null;
  thread.items.push(item);
  if (touch) {
    thread.lastTouched = Date.now();
    if (thread.state === "dormant") thread.state = "active";
  }
  persist();
  return thread;
}

export function updateThreadMeta(threadId, patch) {
  const thread = getThread(threadId);
  if (!thread) return null;
  Object.assign(thread, patch);
  persist();
  return thread;
}

export function getNeedsReview() {
  const out = [];
  for (const thread of state.threads) {
    for (const item of thread.items) {
      if (item.confidence === "suggested") out.push({ thread, item });
    }
  }
  return out;
}

export function acceptItem(threadId, itemId) {
  const thread = getThread(threadId);
  if (!thread) return null;
  const item = thread.items.find((i) => i.id === itemId);
  if (!item) return null;
  item.confidence = "confirmed";
  thread.lastTouched = Date.now();
  persist();
  return thread;
}

export function rejectItem(threadId, itemId) {
  const thread = getThread(threadId);
  if (!thread) return null;
  thread.items = thread.items.filter((i) => i.id !== itemId);
  persist();
  return thread;
}

export function sweepDormant({ afterMs = 1000 * 60 * 60 * 24 * 3 } = {}) {
  const now = Date.now();
  let changed = false;
  for (const thread of state.threads) {
    if (thread.state === "active" && now - thread.lastTouched > afterMs) {
      thread.state = "dormant";
      changed = true;
    }
  }
  if (changed) persist();
}

// ---- todos ----

export function getTodos() {
  return state.todos;
}

export function addTodo({ text, threadId, due }) {
  const todo = {
    id: nanoid(10),
    text,
    threadId: threadId || null,
    due: due || null,
    done: false,
    calendarEventId: null,
    createdAt: Date.now(),
  };
  state.todos.unshift(todo);
  persist();
  return todo;
}

export function updateTodo(id, patch) {
  const todo = state.todos.find((t) => t.id === id);
  if (!todo) return null;
  Object.assign(todo, patch);
  persist();
  return todo;
}

export function deleteTodo(id) {
  state.todos = state.todos.filter((t) => t.id !== id);
  persist();
}

// ---- watched locations ----

export function getWatchedLocations() {
  return state.watchedLocations;
}

export function toggleWatchedLocation(id) {
  const loc = state.watchedLocations.find((l) => l.id === id);
  if (!loc) return null;
  loc.enabled = !loc.enabled;
  persist();
  return loc;
}

// ---- dedupe for the file watcher ----

export function isSeen(absPath) {
  return Boolean(state.seenPaths[absPath]);
}

export function markSeen(absPath) {
  state.seenPaths[absPath] = Date.now();
  persist();
}

export function newItemId() {
  return nanoid(10);
}
