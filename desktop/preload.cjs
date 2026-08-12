const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("atmosphereDesktop", {
  isDesktop: true,
  getState: () => ipcRenderer.invoke("widget:state"),
  setPinned: (pinned) => ipcRenderer.invoke("widget:pin", pinned),
  snap: (corner) => ipcRenderer.invoke("widget:snap", corner),
  minimize: () => ipcRenderer.invoke("widget:minimize"),
  hide: () => ipcRenderer.invoke("widget:hide"),
  close: () => ipcRenderer.invoke("widget:close"),
});
