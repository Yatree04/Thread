const path = require("node:path");
const { Tray, Menu, nativeImage } = require("electron");
const db = require("./db");
const events = require("./events");
const windows = require("./windows");

const ICON_IDLE = path.join(__dirname, "..", "..", "assets", "tray-idle.png");
const ICON_ACTIVE = path.join(__dirname, "..", "..", "assets", "tray-active.png");

let tray = null;
let clearActiveTimer = null;

function buildMenu() {
  return Menu.buildFromTemplate([
    { label: "Widget", click: () => windows.createWidgetWindow().show() },
    { label: "Command Palette  (⌘⇧T / Ctrl⇧T)", click: () => windows.togglePalette() },
    { type: "separator" },
    { label: "Files (in-app demo)", click: () => windows.createFileBrowserWindow() },
    { label: "Settings", click: () => windows.createSettingsWindow() },
    { type: "separator" },
    { label: "Quit Thread", role: "quit" },
  ]);
}

function refreshTooltip() {
  if (!tray) return;
  const needsReview = db.getNeedsReview().length;
  tray.setToolTip(needsReview > 0 ? `Thread — ${needsReview} suggestion${needsReview === 1 ? "" : "s"} pending` : "Thread — running");
}

function flashActive() {
  if (!tray) return;
  tray.setImage(nativeImage.createFromPath(ICON_ACTIVE));
  clearTimeout(clearActiveTimer);
  clearActiveTimer = setTimeout(() => {
    if (tray) tray.setImage(nativeImage.createFromPath(ICON_IDLE));
  }, 4000);
}

function createTray() {
  tray = new Tray(nativeImage.createFromPath(ICON_IDLE));
  tray.setContextMenu(buildMenu());
  refreshTooltip();

  // Driven by real events from the watcher/clustering pipeline — not a timer.
  events.on("item-classified", ({ decision }) => {
    refreshTooltip();
    if (decision.action !== "ignore") flashActive();
  });

  return tray;
}

module.exports = { createTray };
