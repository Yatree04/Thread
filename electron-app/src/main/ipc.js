const { ipcMain, shell, clipboard, BrowserWindow, app } = require("electron");
const db = require("./db");
const watcher = require("./watcher");
const { classifyAndFile, getCandidateThreads } = require("./clustering");
const { hasApiKey } = require("./ai");

function broadcastUpdate() {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) win.webContents.send("app:updated");
  }
}

function threadWithItems(thread) {
  return { ...thread, items: db.getThreadItems(thread.id) };
}

function itemLabelFor(item) {
  if (item.path) return item.path.split(/[/\\]/).pop();
  return item.content_excerpt || item.type;
}

function register({ setWidgetTier, onFirstRunComplete }) {
  ipcMain.handle("threads:getAll", () => db.getAllThreads().map(threadWithItems));

  ipcMain.handle("threads:getNeedsReview", () => db.getNeedsReview());

  ipcMain.handle("threads:accept", (e, { threadId, itemId }) => {
    db.setConfidence(threadId, itemId, "confirmed");
    db.touchThread(threadId);
    broadcastUpdate();
  });

  ipcMain.handle("threads:reject", (e, { threadId, itemId }) => {
    db.removeThreadItem(threadId, itemId);
    broadcastUpdate();
  });

  ipcMain.handle("threads:continue", (e, { threadId }) => {
    const items = db.getThreadItems(threadId);
    const opened = [];
    for (const item of items) {
      if (item.type === "clipboard") {
        clipboard.writeText(item.content_excerpt || "");
        opened.push({ type: "clipboard", label: "copied back to clipboard" });
      } else if (item.path) {
        shell.openPath(item.path);
        opened.push({ type: item.type, label: item.path });
      }
    }
    db.touchThread(threadId, { reactivate: true });
    broadcastUpdate();
    return opened;
  });

  ipcMain.handle("threads:create", (e, { name }) => {
    const thread = db.createThread({ name, state: "forming" });
    broadcastUpdate();
    return thread;
  });

  ipcMain.handle("threads:delete", (e, { threadId }) => {
    db.deleteThread(threadId);
    broadcastUpdate();
  });

  ipcMain.handle("items:getAll", () => db.getAllItems());

  ipcMain.handle("items:delete", (e, { itemId }) => {
    db.deleteItem(itemId);
    broadcastUpdate();
  });

  // Used by the in-app file-browser-sim: file into an existing Thread, or
  // create a new one. Also usable to re-run classification manually.
  ipcMain.handle("items:addToThread", (e, { itemId, threadId }) => {
    db.addThreadItem({ threadId, itemId, confidence: "confirmed", reason: "Added manually from the file browser." });
    db.touchThread(threadId, { reactivate: true });
    broadcastUpdate();
  });

  // Best-guess Thread for the file-browser-sim's pre-filled "Add to X" row —
  // same heuristic pre-filter used by real classification, just without an
  // AI call (this is only for the right-click menu's default suggestion).
  ipcMain.handle("items:candidates", (e, { itemId }) => {
    const item = db.getItem(itemId);
    if (!item) return [];
    return getCandidateThreads({ name: itemLabelFor(item), contentExcerpt: item.content_excerpt });
  });

  ipcMain.handle("items:revealInOS", (e, { path }) => {
    if (path) shell.showItemInFolder(path);
  });

  ipcMain.handle("items:open", (e, { path }) => {
    if (path) return shell.openPath(path);
  });

  ipcMain.handle("items:trash", async (e, { itemId, path }) => {
    if (path) {
      try {
        await shell.trashItem(path);
      } catch (err) {
        console.error("[ipc] trash failed:", err.message);
      }
    }
    db.deleteItem(itemId);
    broadcastUpdate();
  });

  ipcMain.handle("settings:get", () => ({
    locations: watcher.getWatchedLocations(),
    watchClipboard: db.getSetting("watchClipboard", true),
    firstRunComplete: db.getSetting("firstRunComplete", false),
    hasApiKey: hasApiKey(),
    widgetTier: db.getSetting("widgetTier", "small"),
  }));

  ipcMain.handle("settings:setLocationEnabled", (e, { id, enabled }) => {
    watcher.setLocationEnabled(id, enabled);
    broadcastUpdate();
  });

  ipcMain.handle("settings:setClipboardEnabled", (e, { enabled }) => {
    db.setSetting("watchClipboard", enabled);
    broadcastUpdate();
  });

  ipcMain.handle("settings:completeFirstRun", (e, { locations }) => {
    for (const [id, enabled] of Object.entries(locations)) {
      watcher.setLocationEnabled(id, enabled);
    }
    db.setSetting("firstRunComplete", true);
    onFirstRunComplete?.();
    broadcastUpdate();
  });

  ipcMain.handle("widget:setTier", (e, { tier }) => {
    db.setSetting("widgetTier", tier);
    setWidgetTier(tier);
  });

  ipcMain.handle("app:openExternal", (e, { url }) => shell.openExternal(url));
  ipcMain.handle("app:quit", () => app.quit());
}

module.exports = { register, broadcastUpdate };
