const { app, globalShortcut } = require("electron");

app.setName("Thread");
if (process.platform !== "darwin") {
  app.setAppUserModelId("com.thread.app");
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
}

const db = require("./db");
const windows = require("./windows");
const tray = require("./tray");
const ipc = require("./ipc");
const watcherModule = require("./watcher");
const { startClipboardWatcher } = require("./clipboard");

function startBackgroundServices() {
  watcherModule.startWatcher();
  startClipboardWatcher();
  setInterval(() => db.dormantSweep(1000 * 60 * 60 * 24 * 3), 1000 * 60 * 30);
}

app.whenReady().then(() => {
  ipc.register({
    setWidgetTier: windows.setWidgetTier,
    onFirstRunComplete: () => {
      startBackgroundServices();
      windows.createWidgetWindow().show();
    },
  });
  windows.registerWindowIpc();
  windows.registerGlobalShortcut();

  tray.createTray();

  const firstRunComplete = db.getSetting("firstRunComplete", false);
  if (firstRunComplete) {
    startBackgroundServices();
    windows.createWidgetWindow();
  } else {
    // First run: show Settings, which opens straight into the consent step.
    // Background watching doesn't start until the person confirms it.
    windows.createSettingsWindow();
  }
});

app.on("window-all-closed", () => {
  // Thread lives in the tray — closing windows shouldn't quit the app.
});

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
});

app.on("second-instance", () => {
  windows.createWidgetWindow()?.show();
});

module.exports = { startBackgroundServices };
