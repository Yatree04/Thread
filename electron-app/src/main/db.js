const path = require("node:path");
const fs = require("node:fs");
const Database = require("better-sqlite3");
const { app } = require("electron");

const dbPath = path.join(app.getPath("userData"), "thread.db");
fs.mkdirSync(app.getPath("userData"), { recursive: true });

const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS threads (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    state TEXT NOT NULL DEFAULT 'forming',
    created_at INTEGER NOT NULL,
    last_touched_at INTEGER NOT NULL,
    summary TEXT
  );

  CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY,
    path TEXT,
    type TEXT NOT NULL,
    content_excerpt TEXT,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS thread_items (
    thread_id INTEGER REFERENCES threads(id) ON DELETE CASCADE,
    item_id INTEGER REFERENCES items(id) ON DELETE CASCADE,
    confidence TEXT NOT NULL,
    reason TEXT,
    added_at INTEGER NOT NULL,
    PRIMARY KEY (thread_id, item_id)
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );
`);

// ---- threads ----

const stmtCreateThread = db.prepare(
  "INSERT INTO threads (name, state, created_at, last_touched_at, summary) VALUES (?, ?, ?, ?, ?)"
);
function createThread({ name, state = "forming", summary = null }) {
  const now = Date.now();
  const info = stmtCreateThread.run(name, state, now, now, summary);
  return getThread(info.lastInsertRowid);
}

const stmtGetThread = db.prepare("SELECT * FROM threads WHERE id = ?");
function getThread(id) {
  return stmtGetThread.get(id);
}

function getAllThreads() {
  return db.prepare("SELECT * FROM threads ORDER BY last_touched_at DESC").all();
}

const stmtTouchThread = db.prepare("UPDATE threads SET last_touched_at = ?, state = ? WHERE id = ?");
function touchThread(id, { reactivate = false } = {}) {
  const thread = getThread(id);
  if (!thread) return null;
  const nextState = reactivate && thread.state === "dormant" ? "active" : thread.state;
  stmtTouchThread.run(Date.now(), nextState, id);
  return getThread(id);
}

const stmtSetThreadState = db.prepare("UPDATE threads SET state = ? WHERE id = ?");
function setThreadState(id, state) {
  stmtSetThreadState.run(state, id);
  return getThread(id);
}

const stmtDeleteThread = db.prepare("DELETE FROM threads WHERE id = ?");
function deleteThread(id) {
  stmtDeleteThread.run(id);
}

function dormantSweep(afterMs) {
  const cutoff = Date.now() - afterMs;
  db.prepare("UPDATE threads SET state = 'dormant' WHERE state = 'active' AND last_touched_at < ?").run(cutoff);
}

// ---- items ----

const stmtCreateItem = db.prepare("INSERT INTO items (path, type, content_excerpt, created_at) VALUES (?, ?, ?, ?)");
function createItem({ path: itemPath = null, type, contentExcerpt = null }) {
  const info = stmtCreateItem.run(itemPath, type, contentExcerpt, Date.now());
  return getItem(info.lastInsertRowid);
}

const stmtGetItem = db.prepare("SELECT * FROM items WHERE id = ?");
function getItem(id) {
  return stmtGetItem.get(id);
}

function getRecentItems(sinceMs, limit = 30) {
  return db.prepare("SELECT * FROM items WHERE created_at >= ? ORDER BY created_at DESC LIMIT ?").all(sinceMs, limit);
}

function getAllItems() {
  return db.prepare("SELECT * FROM items ORDER BY created_at DESC").all();
}

const stmtDeleteItem = db.prepare("DELETE FROM items WHERE id = ?");
function deleteItem(id) {
  stmtDeleteItem.run(id);
}

// ---- thread_items ----

const stmtAddThreadItem = db.prepare(
  "INSERT INTO thread_items (thread_id, item_id, confidence, reason, added_at) VALUES (?, ?, ?, ?, ?)"
);
function addThreadItem({ threadId, itemId, confidence, reason }) {
  stmtAddThreadItem.run(threadId, itemId, confidence, reason, Date.now());
}

function getThreadItems(threadId) {
  return db
    .prepare(
      `SELECT items.*, thread_items.confidence, thread_items.reason, thread_items.added_at AS thread_item_added_at
       FROM thread_items JOIN items ON items.id = thread_items.item_id
       WHERE thread_items.thread_id = ?
       ORDER BY thread_items.added_at ASC`
    )
    .all(threadId);
}

function getNeedsReview() {
  return db
    .prepare(
      `SELECT thread_items.thread_id, thread_items.item_id, thread_items.reason, thread_items.added_at,
              threads.name AS thread_name,
              items.path, items.type, items.content_excerpt
       FROM thread_items
       JOIN threads ON threads.id = thread_items.thread_id
       JOIN items ON items.id = thread_items.item_id
       WHERE thread_items.confidence = 'suggested'
       ORDER BY thread_items.added_at DESC`
    )
    .all();
}

const stmtSetConfidence = db.prepare("UPDATE thread_items SET confidence = ? WHERE thread_id = ? AND item_id = ?");
function setConfidence(threadId, itemId, confidence) {
  stmtSetConfidence.run(confidence, threadId, itemId);
}

const stmtRemoveThreadItem = db.prepare("DELETE FROM thread_items WHERE thread_id = ? AND item_id = ?");
function removeThreadItem(threadId, itemId) {
  stmtRemoveThreadItem.run(threadId, itemId);
}

// ---- settings ----

const stmtGetSetting = db.prepare("SELECT value FROM settings WHERE key = ?");
function getSetting(key, fallback = null) {
  const row = stmtGetSetting.get(key);
  return row ? JSON.parse(row.value) : fallback;
}

const stmtSetSetting = db.prepare("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value");
function setSetting(key, value) {
  stmtSetSetting.run(key, JSON.stringify(value));
}

module.exports = {
  db,
  createThread,
  getThread,
  getAllThreads,
  touchThread,
  setThreadState,
  deleteThread,
  dormantSweep,
  createItem,
  getItem,
  getRecentItems,
  getAllItems,
  deleteItem,
  addThreadItem,
  getThreadItems,
  getNeedsReview,
  setConfidence,
  removeThreadItem,
  getSetting,
  setSetting,
};
