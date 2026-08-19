require('dotenv').config();

const path = require('path');
const { app, Tray, Menu, nativeImage, ipcMain, globalShortcut, powerMonitor } = require('electron');

const store = require('./store.cjs');
const { classifyItem, hasApiKey } = require('./clustering.cjs');
const { watchFileSystem } = require('./watchers/fileSystem.cjs');
const { watchClipboard } = require('./watchers/clipboard.cjs');
const { startBridgeServer } = require('./server.cjs');
const { createWidgetWindow, createOverlayWindow, createSidePanelWindow } = require('./windows.cjs');

let widgetWindow = null;
let overlayWindow = null;
let sidePanelWindow = null;
let tray = null;
let isQuitting = false;
const stopFns = [];

function broadcastState(toast) {
  const state = store.getState();
  const payload = toast ? { ...state, toast } : state;
  [widgetWindow, overlayWindow, sidePanelWindow].forEach((w) => {
    if (w && !w.isDestroyed()) w.webContents.send('state', payload);
  });
}

function ensureSidePanel() {
  if (!sidePanelWindow || sidePanelWindow.isDestroyed()) {
    sidePanelWindow = createSidePanelWindow();
    sidePanelWindow.webContents.on('did-finish-load', () => {
      sidePanelWindow.webContents.send('state', store.getState());
    });
  }
  return sidePanelWindow;
}

function showCommandOverlay() {
  if (!overlayWindow || overlayWindow.isDestroyed()) return;
  overlayWindow.webContents.send('open-command-overlay');
  overlayWindow.show();
  overlayWindow.focus();
}

function onWake() {
  if (!overlayWindow || overlayWindow.isDestroyed()) return;
  overlayWindow.webContents.send('wake');
  overlayWindow.show();
}

async function handleDetectedItem(type, raw) {
  try {
    const state = store.getState();
    const decision = await classifyItem({
      item: { type, title: raw.title, detail: raw.detail },
      trails: state.trails,
      itemsOf: store.itemsOf,
    });
    const toast = store.ingestItem({ type, title: raw.title, detail: raw.detail, decision });
    broadcastState(toast);
  } catch (err) {
    console.error('[trails] failed to handle detected item:', err);
  }
}

app.whenReady().then(() => {
  widgetWindow = createWidgetWindow();
  overlayWindow = createOverlayWindow();

  widgetWindow.webContents.on('did-finish-load', () => widgetWindow.webContents.send('state', store.getState()));
  overlayWindow.webContents.on('did-finish-load', () => overlayWindow.webContents.send('state', store.getState()));

  ipcMain.on('dispatch', (_e, { type, payload }) => {
    const toast = store.dispatch(type, payload);
    broadcastState(toast);
  });

  ipcMain.on('hide-overlay', () => {
    if (overlayWindow && !overlayWindow.isDestroyed()) overlayWindow.hide();
  });

  ipcMain.on('request-open-side-panel', (_e, { trailId } = {}) => {
    const win = ensureSidePanel();
    win.show();
    win.focus();
    if (trailId) win.webContents.send('expand-trail', trailId);
  });

  // Tray icon — Trails runs quietly in the background like the real product would.
  const trayIcon = nativeImage.createFromPath(path.join(__dirname, 'assets', 'tray-icon.png'));
  tray = new Tray(trayIcon);
  tray.setToolTip('Trails');
  tray.setContextMenu(
    Menu.buildFromTemplate([
      {
        label: 'Open Side Panel',
        click: () => {
          const win = ensureSidePanel();
          win.show();
          win.focus();
        },
      },
      { label: 'Search Trails (Ctrl+K)', click: showCommandOverlay },
      { type: 'separator' },
      {
        label: hasApiKey ? 'AI clustering: connected' : 'AI clustering: no ANTHROPIC_API_KEY set',
        enabled: false,
      },
      { type: 'separator' },
      {
        label: 'Quit Trails',
        click: () => {
          isQuitting = true;
          if (sidePanelWindow) sidePanelWindow.destroy();
          if (overlayWindow) overlayWindow.destroy();
          if (widgetWindow) widgetWindow.destroy();
          app.quit();
        },
      },
    ])
  );
  tray.on('click', () => {
    const win = ensureSidePanel();
    if (win.isVisible()) win.hide();
    else {
      win.show();
      win.focus();
    }
  });

  globalShortcut.register('CommandOrControl+K', showCommandOverlay);
  powerMonitor.on('resume', onWake);
  powerMonitor.on('unlock-screen', onWake);

  stopFns.push(watchFileSystem([app.getPath('desktop'), app.getPath('downloads')], (f) => handleDetectedItem('file', f)));
  stopFns.push(watchClipboard((c) => handleDetectedItem('clipboard', c)));
  stopFns.push(startBridgeServer((t) => handleDetectedItem('tab', t)));

  if (!hasApiKey) {
    console.warn(
      '\n[trails] No ANTHROPIC_API_KEY found. Copy .env.example to .env and add your key from console.anthropic.com to enable real AI clustering.\n' +
        '[trails] Without it, detected items will land unfiled — everything else still runs for real.\n'
    );
  }
});

app.on('window-all-closed', () => {
  // Trails is a background app — closing a window (e.g. the Side Panel) never quits it.
});

app.on('before-quit', () => {
  isQuitting = true;
  stopFns.forEach((stop) => stop());
  globalShortcut.unregisterAll();
});
