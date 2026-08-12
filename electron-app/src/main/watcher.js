const path = require("node:path");
const fs = require("node:fs");
const os = require("node:os");
const chokidar = require("chokidar");
const { getSetting, setSetting } = require("./db");
const { classifyAndFile } = require("./clustering");
const events = require("./events");

const EXCERPT_MAX_CHARS = 300;
const TEXT_EXT = /\.(txt|md|markdown|csv|json|js|jsx|ts|tsx|py|html|css|log|yml|yaml|xml)$/i;
const IMAGE_EXT = /\.(png|jpe?g|gif|webp)$/i;
const SCREENSHOT_NAME = /screen ?shot/i;

const IGNORE_PATTERNS = [/(^|[/\\])\../, /\.(crdownload|part|tmp|download)$/i, /desktop\.ini$/i];

const DEFAULT_LOCATIONS = {
  downloads: { label: "Downloads", path: path.join(os.homedir(), "Downloads") },
  desktop: { label: "Desktop", path: path.join(os.homedir(), "Desktop") },
  screenshots: { label: "Screenshots", path: path.join(os.homedir(), "Desktop") },
};

function getWatchedLocations() {
  const enabled = getSetting("watchedLocations", { downloads: true, desktop: true, screenshots: true });
  return Object.entries(DEFAULT_LOCATIONS).map(([id, loc]) => ({
    id,
    label: loc.label,
    path: loc.path,
    enabled: enabled[id] !== false,
    exists: fs.existsSync(loc.path),
  }));
}

function setLocationEnabled(id, value) {
  const enabled = getSetting("watchedLocations", { downloads: true, desktop: true, screenshots: true });
  enabled[id] = value;
  setSetting("watchedLocations", enabled);
  restartWatcher();
}

function readExcerpt(filePath) {
  if (!TEXT_EXT.test(filePath)) return null;
  try {
    const fd = fs.openSync(filePath, "r");
    const buf = Buffer.alloc(EXCERPT_MAX_CHARS * 2); // headroom for multi-byte utf8
    const bytesRead = fs.readSync(fd, buf, 0, buf.length, 0);
    fs.closeSync(fd);
    return buf.toString("utf-8", 0, bytesRead).slice(0, EXCERPT_MAX_CHARS);
  } catch {
    return null;
  }
}

function kindFor(filePath, locationId) {
  const base = path.basename(filePath);
  if ((locationId === "screenshots" || SCREENSHOT_NAME.test(base)) && IMAGE_EXT.test(base)) return "screenshot";
  return "file";
}

let watcher = null;
let currentPaths = new Set();

function activePaths() {
  return new Set(
    getWatchedLocations()
      .filter((l) => l.enabled && l.exists)
      .map((l) => l.path)
  );
}

function restartWatcher() {
  const next = activePaths();
  const same = next.size === currentPaths.size && [...next].every((p) => currentPaths.has(p));
  if (same && watcher) return;

  if (watcher) watcher.close();
  currentPaths = next;
  if (next.size === 0) {
    watcher = null;
    return;
  }

  watcher = chokidar.watch([...next], {
    ignored: (p) => IGNORE_PATTERNS.some((re) => re.test(p)),
    ignoreInitial: true,
    depth: 0,
    awaitWriteFinish: { stabilityThreshold: 800, pollInterval: 200 },
  });

  watcher.on("add", async (filePath) => {
    const locId = Object.entries(DEFAULT_LOCATIONS).find(([, l]) => filePath.startsWith(l.path))?.[0] || "desktop";
    const kind = kindFor(filePath, locId);
    const excerpt = kind === "file" ? readExcerpt(filePath) : null;

    events.emit("watcher:new-item", { path: filePath, type: kind });

    try {
      await classifyAndFile({ path: filePath, type: kind, name: path.basename(filePath), contentExcerpt: excerpt });
    } catch (err) {
      console.error("[watcher] classify failed:", err.message);
    }
  });

  watcher.on("error", (err) => console.error("[watcher] error:", err.message));
}

function startWatcher() {
  restartWatcher();
  setInterval(restartWatcher, 15_000);
}

module.exports = { startWatcher, getWatchedLocations, setLocationEnabled, DEFAULT_LOCATIONS };
