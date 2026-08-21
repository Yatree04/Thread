const path = require('path');
const fs = require('fs');
const {
  app,
  Tray,
  Menu,
  nativeImage,
  ipcMain,
  globalShortcut,
  powerMonitor,
  dialog,
  desktopCapturer,
} = require('electron');

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
  createCaptureWindow,
  createQueryWindow,
  createSettingsWindow,
  captureBubbleBounds,
  captureExpandedBounds,
} = require('./windows.cjs');

let widgetWindow = null;
let captureWindow = null;
let queryWindow = null;
let settingsWindow = null;
let tray = null;
let isQuitting = false;
let fileWatcher = null;
const stopFns = [];

function broadcastState(toast) {
  const state = store.getState();
  const payload = toast ? { ...state, toast } : state;
  [widgetWindow, captureWindow, queryWindow].forEach((w) => {
    if (w && !w.isDestroyed()) w.webContents.send('state', payload);
  });
}

function ensureSettingsWindow() {
  if (!settingsWindow || settingsWindow.isDestroyed()) {
    settingsWindow = createSettingsWindow();
  }
  return settingsWindow;
}

/** Grows the Capture bubble into the full composer in place (real
 * setBounds, not a CSS trick) and gives it focus so typing works immediately.
 * Also tells the Capture window's own renderer to switch to composer view —
 * it's a separate process from whichever window triggered this (Widget,
 * tray), so resizing the OS window alone wouldn't change what it renders. */
function expandCapture() {
  if (!captureWindow || captureWindow.isDestroyed()) return;
  captureWindow.setBounds(captureExpandedBounds());
  captureWindow.webContents.send('capture-expanded', true);
  captureWindow.show();
  captureWindow.focus();
}

/** Shrinks Capture back down to the floating "+" bubble — it never fully
 * hides, the same way the Widget never fully closes. */
function collapseCapture() {
  if (!captureWindow || captureWindow.isDestroyed()) return;
  captureWindow.setBounds(captureBubbleBounds());
  captureWindow.webContents.send('capture-expanded', false);
}

/** The Query Surface — search, browse all Trails, and drill into detail.
 * Absorbs the old Command Overlay (search) and Side Panel (browse/manage). */
function showQuery(trailId) {
  if (!queryWindow || queryWindow.isDestroyed()) return;
  queryWindow.webContents.send('open-query');
  if (trailId) queryWindow.webContents.send('expand-trail', trailId);
  queryWindow.show();
  queryWindow.focus();
}

/** Real sleep/unlock wake (spec 1.x) — resurfaces via the Widget's continuity popup. */
function onWake() {
  if (!widgetWindow || widgetWindow.isDestroyed()) return;
  widgetWindow.webContents.send('wake');
  widgetWindow.show();
  widgetWindow.focus();
}

async function classifyAndFile(type, title, detail) {
  const state = store.getState();
  const decision = await clustering.classifyItem({
    item: { type, title, detail },
    trails: state.trails,
    itemsOf: store.itemsOf,
  });
  const result = store.ingestItem({ type, title, detail, decision });
  broadcastState({ message: result.message });
  return { decision, itemId: result.itemId, trailId: result.trailId };
}

async function handleDetectedItem(type, raw) {
  try {
    await classifyAndFile(type, raw.title, raw.detail);
  } catch (err) {
    console.error('[trails] failed to handle detected item:', err);
  }
}

function rebuildTrayMenu() {
  if (!tray) return;
  const widgetVisible = Boolean(widgetWindow && !widgetWindow.isDestroyed() && widgetWindow.isVisible());
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: 'Quick Capture', click: expandCapture },
      {
        label: widgetVisible ? 'Hide Widget' : 'Show Widget',
        click: () => {
          if (!widgetWindow || widgetWindow.isDestroyed()) return;
          widgetVisible ? widgetWindow.hide() : widgetWindow.showInactive();
          rebuildTrayMenu();
        },
      },
      { type: 'separator' },
      { label: 'Search Trails: press Ctrl+Alt+K', enabled: false },
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
          if (queryWindow) queryWindow.destroy();
          if (captureWindow) captureWindow.destroy();
          if (widgetWindow) widgetWindow.destroy();
          app.quit();
        },
      },
    ])
  );
}

app.whenReady().then(() => {
  widgetWindow = createWidgetWindow();
  captureWindow = createCaptureWindow();
  queryWindow = createQueryWindow();

  widgetWindow.webContents.on('did-finish-load', () => widgetWindow.webContents.send('state', store.getState()));
  captureWindow.webContents.on('did-finish-load', () => captureWindow.webContents.send('state', store.getState()));
  queryWindow.webContents.on('did-finish-load', () => queryWindow.webContents.send('state', store.getState()));
  widgetWindow.on('show', rebuildTrayMenu);
  widgetWindow.on('hide', rebuildTrayMenu);

  ipcMain.on('dispatch', (_e, { type, payload }) => {
    const toast = store.dispatch(type, payload);
    broadcastState(toast);
  });

  ipcMain.on('collapse-capture', collapseCapture);

  ipcMain.on('hide-query', () => {
    if (queryWindow && !queryWindow.isDestroyed()) queryWindow.hide();
  });

  ipcMain.on('hide-widget', () => {
    if (widgetWindow && !widgetWindow.isDestroyed()) widgetWindow.hide();
  });

  ipcMain.on('expand-capture', expandCapture);

  ipcMain.on('request-open-query', (_e, { trailId } = {}) => showQuery(trailId));

  ipcMain.on('request-open-settings', () => {
    const win = ensureSettingsWindow();
    win.show();
    win.focus();
  });

  ipcMain.handle('submit-capture', async (_e, { text, attachmentType, attachmentTitle, attachmentDetail }) => {
    const type = attachmentType || 'clipboard';
    const trimmed = (text || '').trim();
    const title = attachmentTitle || (trimmed.length > 60 ? `${trimmed.slice(0, 57)}...` : trimmed) || 'Quick capture';
    const detail = attachmentType ? text : attachmentDetail;
    return classifyAndFile(type, title, detail);
  });

  ipcMain.handle('capture-screenshot', async () => {
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width: 1600, height: 1000 },
    });
    const primary = sources[0];
    if (!primary || primary.thumbnail.isEmpty()) return null;
    const dir = path.join(app.getPath('userData'), 'captures');
    fs.mkdirSync(dir, { recursive: true });
    const filePath = path.join(dir, `screenshot-${Date.now()}.png`);
    fs.writeFileSync(filePath, primary.thumbnail.toPNG());
    return { path: filePath, dataUrl: primary.thumbnail.toDataURL() };
  });

  ipcMain.handle('pick-image-file', async () => {
    const win = captureWindow || undefined;
    const res = await dialog.showOpenDialog(win, {
      properties: ['openFile'],
      filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp'] }],
    });
    return res.canceled ? null : res.filePaths[0];
  });

  ipcMain.handle('get-context-summary', async (_e, { trailId, itemId }) => {
    const trail = store.getTrail(trailId);
    if (!trail) return { text: '', at: 0 };
    const key = itemId || 'all';
    const cached = store.getCachedContext(trailId, key);
    if (cached && cached.at >= trail.lastActiveAt) return cached;
    const items = store.itemsOf(trailId);
    const focusItem = itemId ? items.find((i) => i.id === itemId) : null;
    const text = await clustering.summarizeContext({ trail, items, focusItem });
    store.setCachedContext(trailId, key, text);
    return { text, at: Date.now() };
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
    if (!widgetWindow || widgetWindow.isDestroyed()) return;
    widgetWindow.isVisible() ? widgetWindow.hide() : widgetWindow.showInactive();
  });

  // Ctrl+Alt+K is the *only* way Query opens — a deliberate "jump to search"
  // gesture, not a button. (Win+K was tried first, per an earlier request,
  // but Windows and various OEM tools reserve it for their own Connect/Cast/
  // capture panels — it never reliably reached this app, so it's been
  // dropped in favor of a combo nothing else claims.)
  const hotkeyOk = globalShortcut.register('Control+Alt+K', () => showQuery());
  if (!hotkeyOk) {
    console.warn(
      '\n[trails] Could not register the Ctrl+Alt+K global hotkey — another app already owns it. ' +
        'By design Query has no other entry point, so that app would need to give it up.\n'
    );
  }
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
  // Trails is a background app — closing a window (e.g. the Query Surface) never quits it.
});

app.on('before-quit', () => {
  isQuitting = true;
  stopFns.forEach((stop) => stop());
  globalShortcut.unregisterAll();
});
