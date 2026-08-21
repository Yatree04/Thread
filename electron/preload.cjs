const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('trailsAPI', {
  isElectron: true,
  platform: process.platform,

  // Actions -> main (main is the single source of truth, spec 0.3/0.4)
  dispatch: (type, payload) => ipcRenderer.send('dispatch', { type, payload }),
  requestOpenCapture: () => ipcRenderer.send('request-open-capture'),
  requestOpenQuery: (trailId) => ipcRenderer.send('request-open-query', { trailId }),
  requestOpenSettings: () => ipcRenderer.send('request-open-settings'),
  hideCapture: () => ipcRenderer.send('hide-capture'),
  hideQuery: () => ipcRenderer.send('hide-query'),
  hideWidget: () => ipcRenderer.send('hide-widget'),

  // Quick capture (submits straight through the real clustering pipeline)
  submitCapture: (payload) => ipcRenderer.invoke('submit-capture', payload),
  captureScreenshot: () => ipcRenderer.invoke('capture-screenshot'),
  pickImageFile: () => ipcRenderer.invoke('pick-image-file'),

  // Contextualise mode — cached, real AI-generated (or honest fallback) blurbs
  getContextSummary: (trailId, itemId) => ipcRenderer.invoke('get-context-summary', { trailId, itemId }),

  // Settings (request/response)
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveApiKey: (key) => ipcRenderer.invoke('save-api-key', key),
  pickFolder: () => ipcRenderer.invoke('pick-folder'),
  addWatchFolder: (folder) => ipcRenderer.invoke('add-watch-folder', folder),
  removeWatchFolder: (folder) => ipcRenderer.invoke('remove-watch-folder', folder),

  // Broadcasts <- main
  onState: (cb) => ipcRenderer.on('state', (_e, state) => cb(state)),
  onWake: (cb) => ipcRenderer.on('wake', () => cb()),
  onOpenQuery: (cb) => ipcRenderer.on('open-query', () => cb()),
  onExpandTrail: (cb) => ipcRenderer.on('expand-trail', (_e, trailId) => cb(trailId)),
});
