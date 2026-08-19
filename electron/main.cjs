const path = require('path');
const fs = require('fs');
const { app, Tray, Menu, nativeImage, ipcMain, globalShortcut, powerMonitor, dialog } = require('electron');

const settings = require('./settings.cjs');

// Dev mode: read .env from the project root (npm run electron:dev).
// Packaged app: there's no project root to read from, so instead look for
// <userData>/.env — a per-user file outside the installed app, so an API
// key never ends up bundled inside a distributable that gets shared around.
if (!app.isPackaged) {
  require('dotenv').config();
} else if (fs.existsSync(settings.userEnvPath())) {
  require('dotenv').config({ path: settings.userEnvPath() });
}

const store = require('./store.cjs');
const clustering = require('./clustering.cjs');
const { watchFileSystem } = require('./watchers/fileSystem.cjs');
const { watchClipboard } = require('./watchers/clipboard.cjs');
const { startBridgeServer } = require('./server.cjs');
const {
  createWidgetWindow,
  createOverlayWindow,
  createSidePanelWindow,
  createSettingsWindow,
} = require('./windows.cjs');

let widgetWindow = null;
let overlayWindow = null;
let sidePanelWindow = null;
let settingsWindow = null;
let tray = null;
let isQuitting = false;
let fileWatcher = null;
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

function ensureSettingsWindow() {
  if (!settingsWindow || settingsWindow.isDestroyed()) {
    settingsWindow = createSettingsWindow();
  }
  return settingsWindow;
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
    const decision = await clustering.classifyItem({
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

function rebuildTrayMenu() {
  if (!tray) return;
  const widgetVisible = Boolean(widgetWindow && !widgetWindow.isDestroyed() && widgetWindow.isVisible());
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
      {
        label: widgetVisible ? 'Hide Widget' : 'Show Widget',
        click: () => {
          if (!widgetWindow || widgetWindow.isDestroyed()) return;
          widgetVisible ? widgetWindow.hide() : widgetWindow.show();
          rebuildTrayMenu();
        },
      },
      { type: 'separator' },
      {
        label: clustering.hasApiKey() ? 'AI clustering: connected' : 'AI clustering: no API key set',
        enabled: false,
      },
      {
        label: 'Settings…',
        click: () => {
          const win = ensureSettingsWindow();
          win.show();
          win.focus();
        },
      },
      { type: 'separator' },
      {
        label: 'Quit Trails',
        click: () => {
          isQuitting = true;
          if (settingsWindow) settingsWindow.destroy();
          if (sidePanelWindow) sidePanelWindow.destroy();
          if (overlayWindow) overlayWindow.destroy();
          if (widgetWindow) widgetWindow.destroy();
          app.quit();
        },
      },
    ])
  );
}

app.whenReady().then(() => {
  widgetWindow = createWidgetWindow();
  overlayWindow = createOverlayWindow();

  widgetWindow.webContents.on('did-finish-load', () => widgetWindow.webContents.send('state', store.getState()));
  overlayWindow.webContents.on('did-finish-load', () => overlayWindow.webContents.send('state', store.getState()));
  widgetWindow.on('show', rebuildTrayMenu);
  widgetWindow.on('hide', rebuildTrayMenu);

  ipcMain.on('dispatch', (_e, { type, payload }) => {
    const toast = store.dispatch(type, payload);
    broadcastState(toast);
  });

  ipcMain.on('hide-overlay', () => {
    if (overlayWindow && !overlayWindow.isDestroyed()) overlayWindow.hide();
  });

  ipcMain.on('hide-widget', () => {
    if (widgetWindow && !widgetWindow.isDestroyed()) widgetWindow.hide();
  });

  ipcMain.on('request-open-command-overlay', showCommandOverlay);

  ipcMain.on('request-open-side-panel', (_e, { trailId } = {}) => {
    const win = ensureSidePanel();
    win.show();
    win.focus();
    if (trailId) win.webContents.send('expand-trail', trailId);
  });

  ipcMain.on('request-open-settings', () => {
    const win = ensureSettingsWindow();
    win.show();
    win.focus();
  });

  ipcMain.handle('get-settings', () => ({
    hasApiKey: clustering.hasApiKey(),
    defaultFolders: [app.getPath('desktop'), app.getPath('downloads')],
    extraFolders: settings.getExtraFolders(),
  }));

  ipcMain.handle('save-api-key', (_e, key) => {
    settings.saveApiKey(key);
    clustering.setApiKey(key);
    rebuildTrayMenu();
    return { ok: true };
  });

  ipcMain.handle('pick-folder', async () => {
    const win = settingsWindow || undefined;
    const res = await dialog.showOpenDialog(win, { properties: ['openDirectory'] });
    return res.canceled ? null : res.filePaths[0];
  });

  ipcMain.handle('add-watch-folder', (_e, folder) => {
    const list = settings.addExtraFolder(folder);
    if (fileWatcher) fileWatcher.add(folder);
    return list;
  });

  ipcMain.handle('remove-watch-folder', (_e, folder) => {
    const list = settings.removeExtraFolder(folder);
    if (fileWatcher) fileWatcher.remove(folder);
    return list;
  });

  // Tray icon — Trails runs quietly in the background like the real product would.
  const trayIcon = nativeImage.createFromPath(path.join(__dirname, 'assets', 'tray-icon.png'));
  tray = new Tray(trayIcon);
  tray.setToolTip('Trails');
  rebuildTrayMenu();
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

  fileWatcher = watchFileSystem(
    [app.getPath('desktop'), app.getPath('downloads'), ...settings.getExtraFolders()],
    (f) => handleDetectedItem('file', f)
  );
  stopFns.push(fileWatcher.stop);
  stopFns.push(watchClipboard((c) => handleDetectedItem('clipboard', c)));
  stopFns.push(startBridgeServer((t) => handleDetectedItem('tab', t)));

  if (!clustering.hasApiKey()) {
    console.warn(
      '\n[trails] No ANTHROPIC_API_KEY found. Right-click the tray icon -> Settings… to add one.\n' +
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
