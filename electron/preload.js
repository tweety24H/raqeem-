const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('raqeem', {
  isElectron: true,
});
