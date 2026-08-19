const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('trailsAPI', {
  isElectron: true,
  platform: process.platform,

  // Actions -> main (main is the single source of truth, spec 0.3/0.4)
  dispatch: (type, payload) => ipcRenderer.send('dispatch', { type, payload }),
  requestOpenSidePanel: (trailId) => ipcRenderer.send('request-open-side-panel', { trailId }),
  requestOpenSettings: () => ipcRenderer.send('request-open-settings'),
  requestOpenCommandOverlay: () => ipcRenderer.send('request-open-command-overlay'),
  hideOverlay: () => ipcRenderer.send('hide-overlay'),
  hideWidget: () => ipcRenderer.send('hide-widget'),

  // Settings (request/response)
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveApiKey: (key) => ipcRenderer.invoke('save-api-key', key),
  pickFolder: () => ipcRenderer.invoke('pick-folder'),
  addWatchFolder: (folder) => ipcRenderer.invoke('add-watch-folder', folder),
  removeWatchFolder: (folder) => ipcRenderer.invoke('remove-watch-folder', folder),

  // Broadcasts <- main
  onState: (cb) => ipcRenderer.on('state', (_e, state) => cb(state)),
  onWake: (cb) => ipcRenderer.on('wake', () => cb()),
  onOpenCommandOverlay: (cb) => ipcRenderer.on('open-command-overlay', () => cb()),
  onExpandTrail: (cb) => ipcRenderer.on('expand-trail', (_e, trailId) => cb(trailId)),
});
