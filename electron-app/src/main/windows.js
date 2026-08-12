const path = require("node:path");
const { BrowserWindow, screen, ipcMain, globalShortcut } = require("electron");
const db = require("./db");

const preload = path.join(__dirname, "preload.js");
const rendererRoot = path.join(__dirname, "..", "renderer");

const TIER_SIZES = {
  small: { width: 260, height: 60 },
  medium: { width: 320, height: 210 },
  large: { width: 340, height: 460 },
};

let widgetWindow = null;
let paletteWindow = null;
let settingsWindow = null;
let fileBrowserWindow = null;

function positionWidget(win, tier) {
  const { width, height } = TIER_SIZES[tier];
  const { workArea } = screen.getPrimaryDisplay();
  const margin = 20;
  win.setBounds({
    x: workArea.x + workArea.width - width - margin,
    y: workArea.y + workArea.height - height - margin,
    width,
    height,
  });
}

function createWidgetWindow() {
  if (widgetWindow && !widgetWindow.isDestroyed()) return widgetWindow;

  const tier = db.getSetting("widgetTier", "small");
  widgetWindow = new BrowserWindow({
    frame: false,
    transparent: true,
    resizable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    hasShadow: true,
    webPreferences: { preload, contextIsolation: true, nodeIntegration: false },
  });
  positionWidget(widgetWindow, tier);
  widgetWindow.loadFile(path.join(rendererRoot, "widget", "index.html"));
  widgetWindow.on("closed", () => (widgetWindow = null));
  return widgetWindow;
}

function setWidgetTier(tier) {
  if (!TIER_SIZES[tier]) return;
  if (widgetWindow && !widgetWindow.isDestroyed()) positionWidget(widgetWindow, tier);
}

function createPaletteWindow() {
  if (paletteWindow && !paletteWindow.isDestroyed()) return paletteWindow;

  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  paletteWindow = new BrowserWindow({
    width: 560,
    height: 440,
    x: Math.round((width - 560) / 2),
    y: Math.round(height * 0.16),
    frame: false,
    resizable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    show: false,
    webPreferences: { preload, contextIsolation: true, nodeIntegration: false },
  });
  paletteWindow.loadFile(path.join(rendererRoot, "palette", "index.html"));
  paletteWindow.on("blur", () => paletteWindow?.hide());
  paletteWindow.on("closed", () => (paletteWindow = null));
  return paletteWindow;
}

function togglePalette() {
  const win = createPaletteWindow();
  if (win.isVisible()) {
    win.hide();
  } else {
    win.show();
    win.focus();
  }
}

function createSettingsWindow() {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.focus();
    return settingsWindow;
  }
  settingsWindow = new BrowserWindow({
    width: 640,
    height: 560,
    title: "Thread — Settings",
    backgroundColor: "#14161a",
    webPreferences: { preload, contextIsolation: true, nodeIntegration: false },
  });
  settingsWindow.setMenuBarVisibility(false);
  settingsWindow.loadFile(path.join(rendererRoot, "settings", "index.html"));
  settingsWindow.on("closed", () => (settingsWindow = null));
  return settingsWindow;
}

function createFileBrowserWindow() {
  if (fileBrowserWindow && !fileBrowserWindow.isDestroyed()) {
    fileBrowserWindow.focus();
    return fileBrowserWindow;
  }
  fileBrowserWindow = new BrowserWindow({
    width: 640,
    height: 500,
    title: "Thread — Files (in-app demo)",
    backgroundColor: "#14161a",
    webPreferences: { preload, contextIsolation: true, nodeIntegration: false },
  });
  fileBrowserWindow.setMenuBarVisibility(false);
  fileBrowserWindow.loadFile(path.join(rendererRoot, "file-browser-sim", "index.html"));
  fileBrowserWindow.on("closed", () => (fileBrowserWindow = null));
  return fileBrowserWindow;
}

function registerWindowIpc() {
  ipcMain.on("palette:hide", () => paletteWindow?.hide());
  ipcMain.on("open:settings", () => createSettingsWindow());
  ipcMain.on("open:file-browser", () => createFileBrowserWindow());
  ipcMain.on("open:palette", () => togglePalette());
}

function registerGlobalShortcut() {
  globalShortcut.register("CommandOrControl+Shift+T", togglePalette);
}

module.exports = {
  createWidgetWindow,
  createPaletteWindow,
  createSettingsWindow,
  createFileBrowserWindow,
  togglePalette,
  setWidgetTier,
  registerWindowIpc,
  registerGlobalShortcut,
  getWidgetWindow: () => widgetWindow,
};
