const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('trailsAPI', {
  isElectron: true,
  platform: process.platform,

  // Actions -> main (main is the single source of truth, spec 0.3/0.4)
  dispatch: (type, payload) => ipcRenderer.send('dispatch', { type, payload }),
  requestOpenSidePanel: (trailId) => ipcRenderer.send('request-open-side-panel', { trailId }),
  hideOverlay: () => ipcRenderer.send('hide-overlay'),

  // Broadcasts <- main
  onState: (cb) => ipcRenderer.on('state', (_e, state) => cb(state)),
  onWake: (cb) => ipcRenderer.on('wake', () => cb()),
  onOpenCommandOverlay: (cb) => ipcRenderer.on('open-command-overlay', () => cb()),
  onExpandTrail: (cb) => ipcRenderer.on('expand-trail', (_e, trailId) => cb(trailId)),
});
