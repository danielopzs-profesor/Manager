const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('desktopSetup', Object.freeze({
  save: databaseUrl => ipcRenderer.invoke('desktop:configure', { databaseUrl }),
}));
