import express from "express";
import {
  getThreads,
  getThread,
  createThread,
  acceptItem,
  rejectItem,
  getNeedsReview,
  getTodos,
  addTodo,
  updateTodo,
  deleteTodo,
  getWatchedLocations,
  toggleWatchedLocation,
} from "./store.js";
import { handleNewItem } from "./pipeline.js";
import { openItem } from "./openFile.js";
import { hasAnthropicKey, hasGoogleCredentials } from "./config.js";
import { isCalendarConnected, beginAuth, listTodayEvents, createEventForTodo } from "./calendar.js";

export const router = express.Router();

router.get("/health", (req, res) => {
  res.json({
    ok: true,
    anthropicConfigured: hasAnthropicKey(),
    calendarConfigured: hasGoogleCredentials(),
    calendarConnected: isCalendarConnected(),
  });
});

// ---- threads ----

router.get("/threads", (req, res) => res.json(getThreads()));

router.post("/threads", (req, res) => {
  const { name, item } = req.body;
  if (!name) return res.status(400).json({ error: "name is required" });
  res.json(createThread({ name, item, state: "forming" }));
});

router.get("/needs-review", (req, res) => res.json(getNeedsReview()));

router.post("/threads/:id/accept", (req, res) => {
  const thread = acceptItem(req.params.id, req.body.itemId);
  if (!thread) return res.status(404).json({ error: "not found" });
  res.json(thread);
});

router.post("/threads/:id/reject", (req, res) => {
  const thread = rejectItem(req.params.id, req.body.itemId);
  if (!thread) return res.status(404).json({ error: "not found" });
  res.json(thread);
});

// Reopen everything in a Thread: companion opens local files directly (it has
// real desktop access); browser tabs are handed back for the extension to
// open with chrome.tabs.create, since only the extension can do that.
router.post("/threads/:id/continue", async (req, res) => {
  const thread = getThread(req.params.id);
  if (!thread) return res.status(404).json({ error: "not found" });

  const urls = [];
  const openedFiles = [];
  for (const item of thread.items) {
    if (item.url) {
      urls.push(item.url);
    } else if (item.path) {
      try {
        await openItem(item);
        openedFiles.push(item.path);
      } catch (err) {
        console.error("[api] failed to open", item.path, err.message);
      }
    }
  }
  res.json({ urls, openedFiles });
});

// ---- items (fed by the watcher AND the extension) ----

router.post("/items", async (req, res) => {
  const { type, name, url, path, context } = req.body;
  if (!type || !name) return res.status(400).json({ error: "type and name are required" });
  const result = await handleNewItem({ type, name, url, path, context, source: "extension" });
  res.json(result);
});

// ---- todos ----

router.get("/todos", (req, res) => res.json(getTodos()));

router.post("/todos", async (req, res) => {
  const todo = addTodo(req.body);
  if (todo.due?.iso) {
    createEventForTodo(todo).catch((err) => console.error("[api] calendar sync failed:", err.message));
  }
  res.json(todo);
});

router.patch("/todos/:id", (req, res) => {
  const todo = updateTodo(req.params.id, req.body);
  if (!todo) return res.status(404).json({ error: "not found" });
  res.json(todo);
});

router.delete("/todos/:id", (req, res) => {
  deleteTodo(req.params.id);
  res.json({ ok: true });
});

// ---- watched locations ----

router.get("/watched-locations", (req, res) => res.json(getWatchedLocations()));

router.post("/watched-locations/:id/toggle", (req, res) => {
  const loc = toggleWatchedLocation(req.params.id);
  if (!loc) return res.status(404).json({ error: "not found" });
  res.json(loc);
});

// ---- calendar ----

router.get("/calendar/status", (req, res) =>
  res.json({ configured: hasGoogleCredentials(), connected: isCalendarConnected() })
);

router.get("/calendar/connect", (req, res) => {
  try {
    const authUrl = beginAuth();
    res.json({ authUrl });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get("/calendar/today", async (req, res) => {
  res.json(await listTodayEvents());
});

// "What's relevant right now" — cross-references today's calendar events
// against Threads by keyword overlap, so clicking an upcoming event's match
// can resurface (and re-open, via /continue) everything for it.
router.get("/now", async (req, res) => {
  const events = await listTodayEvents();
  const threads = getThreads();
  const now = Date.now();

  const matches = events.map((event) => {
    const eventWords = event.title.toLowerCase().split(/\W+/).filter((w) => w.length > 3);
    let best = null;
    let bestScore = 0;
    for (const t of threads) {
      const haystack = (t.name + " " + t.items.map((i) => i.name).join(" ")).toLowerCase();
      const score = eventWords.filter((w) => haystack.includes(w)).length;
      if (score > bestScore) {
        bestScore = score;
        best = t;
      }
    }
    const startMs = new Date(event.start).getTime();
    return {
      event,
      thread: bestScore > 0 ? { id: best.id, name: best.name } : null,
      isSoon: !Number.isNaN(startMs) && Math.abs(startMs - now) < 30 * 60 * 1000,
    };
  });

  res.json(matches);
});
