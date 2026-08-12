const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("thread", {
  getThreads: () => ipcRenderer.invoke("threads:getAll"),
  getNeedsReview: () => ipcRenderer.invoke("threads:getNeedsReview"),
  accept: (threadId, itemId) => ipcRenderer.invoke("threads:accept", { threadId, itemId }),
  reject: (threadId, itemId) => ipcRenderer.invoke("threads:reject", { threadId, itemId }),
  continueThread: (threadId) => ipcRenderer.invoke("threads:continue", { threadId }),
  createThread: (name) => ipcRenderer.invoke("threads:create", { name }),
  deleteThread: (threadId) => ipcRenderer.invoke("threads:delete", { threadId }),

  getItems: () => ipcRenderer.invoke("items:getAll"),
  deleteItem: (itemId) => ipcRenderer.invoke("items:delete", { itemId }),
  addItemToThread: (itemId, threadId) => ipcRenderer.invoke("items:addToThread", { itemId, threadId }),
  getCandidatesForItem: (itemId) => ipcRenderer.invoke("items:candidates", { itemId }),
  revealInOS: (path) => ipcRenderer.invoke("items:revealInOS", { path }),
  openItem: (path) => ipcRenderer.invoke("items:open", { path }),
  trashItem: (itemId, path) => ipcRenderer.invoke("items:trash", { itemId, path }),

  getSettings: () => ipcRenderer.invoke("settings:get"),
  setLocationEnabled: (id, enabled) => ipcRenderer.invoke("settings:setLocationEnabled", { id, enabled }),
  setClipboardEnabled: (enabled) => ipcRenderer.invoke("settings:setClipboardEnabled", { enabled }),
  completeFirstRun: (locations) => ipcRenderer.invoke("settings:completeFirstRun", { locations }),

  setWidgetTier: (tier) => ipcRenderer.invoke("widget:setTier", { tier }),
  hidePalette: () => ipcRenderer.send("palette:hide"),
  openSettings: () => ipcRenderer.send("open:settings"),
  openFileBrowser: () => ipcRenderer.send("open:file-browser"),
  openPalette: () => ipcRenderer.send("open:palette"),

  openExternal: (url) => ipcRenderer.invoke("app:openExternal", { url }),
  quit: () => ipcRenderer.invoke("app:quit"),

  onUpdate: (callback) => {
    const handler = () => callback();
    ipcRenderer.on("app:updated", handler);
    return () => ipcRenderer.removeListener("app:updated", handler);
  },
});
