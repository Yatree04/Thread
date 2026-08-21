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

/** Small always-on-top glance widget, pinned top-right of the primary display —
 * spec's Widget surface. Deliberately compact: this is meant to read as a
 * permanent desktop gadget (like a pinned sticky note), not a transient
 * notification, so it stays small and always present rather than fading in/out. */
function createWidgetWindow() {
  const { workArea } = screen.getPrimaryDisplay();
  const width = 300;
  const height = Math.min(460, workArea.height - 48);
  const win = new BrowserWindow(
    baseOptions({
      width,
      height,
      x: workArea.x + workArea.width - width - 20,
      y: workArea.y + 20,
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

/** Docked to the right edge of the screen for the quick-capture composer —
 * type or attach something, real AI clustering files it. The window itself
 * stays a fixed slim strip; the page inside toggles between a collapsed
 * "peek" tab and the full composer, so it can be minimized without fully
 * closing (and losing whatever's half-typed). Hidden until requested from
 * the Widget's + button or the tray. */
function createCaptureWindow() {
  const { workArea } = screen.getPrimaryDisplay();
  const width = 360;
  // Stacks below the pinned Widget (top-right, ~460px tall) on the same right
  // edge, rather than overlapping it.
  const top = workArea.y + 20 + 460 + 16;
  const height = Math.max(360, workArea.height - (top - workArea.y) - 20);
  const win = new BrowserWindow(
    baseOptions({
      width,
      height,
      x: workArea.x + workArea.width - width - 20,
      y: top,
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
 * Command Overlay + Side Panel). By design, the *only* way to open it is the
 * real global Win+K hotkey — no tray or Widget entry point — so it stays a
 * deliberate "jump to search" gesture rather than another button to click. */
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
