import chokidar from "chokidar";
import path from "node:path";
import { config } from "./config.js";
import { isSeen, markSeen, getWatchedLocations } from "./store.js";
import { handleNewItem } from "./pipeline.js";

const IGNORE_PATTERNS = [
  /(^|[/\\])\../, // dotfiles
  /\.(crdownload|part|tmp|download)$/i,
  /desktop\.ini$/i,
];

const IMAGE_EXT = /\.(png|jpe?g|gif|webp)$/i;
const SCREENSHOT_NAME = /screen ?shot/i;

function locationPaths() {
  // WATCH_DOWNLOADS / WATCH_DESKTOP / WATCH_SCREENSHOTS from .env, keyed to
  // the watched-location ids the UI toggles.
  return {
    downloads: config.watchPaths[0],
    desktop: config.watchPaths[1],
    screenshots: config.watchPaths[2],
  };
}

function classifyKind(filePath, locationId) {
  const base = path.basename(filePath);
  if (locationId === "screenshots" || SCREENSHOT_NAME.test(base)) {
    if (IMAGE_EXT.test(base)) return "screenshot";
  }
  return "file";
}

let watcher = null;

export function startWatcher() {
  restartWatcher();
  // Cheap polling for toggle changes — good enough for a local background tool.
  setInterval(restartWatcher, 15_000);
}

function activePaths() {
  const enabled = new Set(getWatchedLocations().filter((l) => l.enabled).map((l) => l.id));
  const paths = locationPaths();
  const active = new Set();
  for (const [id, p] of Object.entries(paths)) {
    if (p && enabled.has(id)) active.add(p);
  }
  return active;
}

let currentWatched = new Set();

function restartWatcher() {
  const next = activePaths();
  const same = next.size === currentWatched.size && [...next].every((p) => currentWatched.has(p));
  if (same && watcher) return;

  if (watcher) watcher.close();
  currentWatched = next;
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

  watcher.on("add", (filePath) => {
    if (isSeen(filePath)) return;
    markSeen(filePath);

    const paths = locationPaths();
    const locationId = Object.entries(paths).find(([, p]) => filePath.startsWith(p))?.[0] || "desktop";

    handleNewItem({
      type: classifyKind(filePath, locationId),
      name: path.basename(filePath),
      path: filePath,
      source: locationId,
    });
  });

  watcher.on("error", (err) => console.error("[watcher] error:", err.message));
}
