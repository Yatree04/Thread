const path = require('path');
const { app, BrowserWindow, screen } = require('electron');

const VITE_DEV_URL = 'http://localhost:5173';
const DIST_INDEX = path.join(__dirname, '..', 'dist', 'index.html');

const preload = path.join(__dirname, 'preload.cjs');

/** Dev: loads the Vite dev server. Packaged: loads the built dist/index.html. */
function loadSurface(win, surface) {
  if (app.isPackaged) {
    win.loadFile(DIST_INDEX, { query: { surface } });
  } else {
    win.loadURL(`${VITE_DEV_URL}/?surface=${surface}`);
  }
}

function baseOptions(extra) {
  return {
    webPreferences: {
      preload,
      contextIsolation: true,
      nodeIntegration: false,
    },
    backgroundColor: '#00000000',
    ...extra,
  };
}

/** Small always-on-top glance widget, bottom-left of the primary display — spec's Widget surface.
 * Tall enough to fit the streak/continuity popup above the main card (reference's Widget.tsx). */
function createWidgetWindow() {
  const { workArea } = screen.getPrimaryDisplay();
  const width = 380;
  const height = Math.min(640, workArea.height - 48);
  const win = new BrowserWindow(
    baseOptions({
      width,
      height,
      x: workArea.x + 24,
      y: workArea.y + workArea.height - height - 24,
      frame: false,
      transparent: true,
      resizable: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      hasShadow: false,
    })
  );
  win.setAlwaysOnTop(true, 'floating');
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  loadSurface(win, 'widget');
  return win;
}

/** Frameless popup for the quick-capture composer — type or attach something,
 * real AI clustering files it. Hidden until requested from the Widget or tray. */
function createCaptureWindow() {
  const { workArea } = screen.getPrimaryDisplay();
  const width = 420;
  const height = 620;
  const win = new BrowserWindow(
    baseOptions({
      width,
      height,
      x: workArea.x + Math.round((workArea.width - width) / 2),
      y: workArea.y + 60,
      frame: false,
      transparent: true,
      resizable: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      show: false,
      hasShadow: false,
    })
  );
  loadSurface(win, 'capture');
  win.on('close', (e) => {
    e.preventDefault();
    win.hide();
  });
  return win;
}

/** Frameless centered spotlight-style window for the Query Surface — search,
 * browse all Trails, and drill into one Trail's detail view (absorbs the old
 * Command Overlay + Side Panel). Hidden until requested via Ctrl+K/tray/widget. */
function createQueryWindow() {
  const { workArea } = screen.getPrimaryDisplay();
  const width = 600;
  const height = Math.min(720, workArea.height - 80);
  const win = new BrowserWindow(
    baseOptions({
      width,
      height,
      x: workArea.x + Math.round((workArea.width - width) / 2),
      y: workArea.y + Math.round((workArea.height - height) / 2),
      frame: false,
      transparent: true,
      resizable: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      show: false,
      hasShadow: false,
    })
  );
  loadSurface(win, 'query');
  win.on('close', (e) => {
    e.preventDefault();
    win.hide();
  });
  return win;
}

/** Small utility window for the API key + watched-folders settings. */
function createSettingsWindow() {
  const { workArea } = screen.getPrimaryDisplay();
  const width = 440;
  const height = 520;
  const win = new BrowserWindow(
    baseOptions({
      width,
      height,
      x: workArea.x + Math.round((workArea.width - width) / 2),
      y: workArea.y + Math.round((workArea.height - height) / 2),
      frame: true,
      title: 'Trails Settings',
      alwaysOnTop: false,
      skipTaskbar: false,
      show: false,
      backgroundColor: '#f6f0e6',
      resizable: false,
    })
  );
  win.setMenuBarVisibility(false);
  loadSurface(win, 'settings');
  win.on('close', (e) => {
    e.preventDefault();
    win.hide();
  });
  return win;
}

module.exports = {
  createWidgetWindow,
  createCaptureWindow,
  createQueryWindow,
  createSettingsWindow,
  VITE_DEV_URL,
};
