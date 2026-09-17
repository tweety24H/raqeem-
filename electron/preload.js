const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('raqeem', {
  isElectron: true,
  license: {
    getStatus: () => ipcRenderer.invoke('license:getStatus'),
    activate: (key) => ipcRenderer.invoke('license:activate', key),
    copyToClipboard: (hwid) => ipcRenderer.invoke('license:copyToClipboard', hwid),
    deactivate: () => ipcRenderer.invoke('license:deactivate'),
    generate: (hwid, shop, duration) => ipcRenderer.invoke('license:generate', hwid, shop, duration),
  },
  settings: {
    getOwnerWhatsApp: () => ipcRenderer.invoke('settings:getOwnerWhatsApp'),
    setOwnerWhatsApp: (number) => ipcRenderer.invoke('settings:setOwnerWhatsApp', number),
  },
  admin: {
    hasPassword: () => ipcRenderer.invoke('admin:hasPassword'),
    setPassword: (password) => ipcRenderer.invoke('admin:setPassword', password),
    checkPassword: (password) => ipcRenderer.invoke('admin:checkPassword', password),
    removePassword: () => ipcRenderer.invoke('admin:removePassword'),
  },
  backup: {
    runNow: () => ipcRenderer.invoke('backup:runNow'),
    list: () => ipcRenderer.invoke('backup:list'),
    getDir: () => ipcRenderer.invoke('backup:getDir'),
    restore: (fileName) => ipcRenderer.invoke('backup:restore', fileName),
  },
  update: {
    onDownloaded: (callback) => ipcRenderer.on('update:downloaded', (event, info) => callback(info)),
    install: () => ipcRenderer.invoke('update:install'),
  },
  dialog: {
    selectFolder: () => ipcRenderer.invoke('dialog:selectFolder'),
    saveFile: (bytes, suggestedName) => ipcRenderer.invoke('dialog:saveFile', bytes, suggestedName),
  },
});
