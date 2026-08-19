const path = require('path');
const { BrowserWindow, screen } = require('electron');

const VITE_URL = 'http://localhost:5173';

const preload = path.join(__dirname, 'preload.cjs');

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

/** Small always-on-top glance widget, bottom-left of the primary display — spec's Widget surface. */
function createWidgetWindow() {
  const { workArea } = screen.getPrimaryDisplay();
  const width = 300;
  const height = 230;
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
  win.loadURL(`${VITE_URL}/?surface=widget`);
  return win;
}

/** Frameless centered-top overlay used for both Continue Card and Command Overlay. */
function createOverlayWindow() {
  const { workArea } = screen.getPrimaryDisplay();
  const width = 460;
  const height = 560;
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
  win.loadURL(`${VITE_URL}/?surface=overlay`);
  return win;
}

/** Positioned at the right edge of the screen like a docked panel — real OS docking isn't a public API, so this approximates it. */
function createSidePanelWindow() {
  const { workArea } = screen.getPrimaryDisplay();
  const width = 380; // matches SidePanel.tsx's w-[380px] exactly, so its fixed layout fills the window
  const win = new BrowserWindow(
    baseOptions({
      width,
      height: workArea.height,
      x: workArea.x + workArea.width - width,
      y: workArea.y,
      frame: true,
      title: 'Trails',
      alwaysOnTop: false,
      skipTaskbar: false,
      show: false,
      backgroundColor: '#f6f0e6',
    })
  );
  win.setMenuBarVisibility(false);
  win.loadURL(`${VITE_URL}/?surface=sidepanel`);
  win.on('close', (e) => {
    e.preventDefault();
    win.hide();
  });
  return win;
}

module.exports = { createWidgetWindow, createOverlayWindow, createSidePanelWindow, VITE_URL };
