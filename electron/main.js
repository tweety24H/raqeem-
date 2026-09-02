const { app, BrowserWindow } = require('electron');
const path = require('path');

const isDev = process.env.RAQEEM_ENV === 'dev';

// خزّن قاعدة البيانات وكل الملفات المرفوعة داخل مجلد بيانات المستخدم الخاص بويندوز
// حتى تبقى النسخة مستقلة تمامًا لكل جهاز/مطبعة.
process.env.RAQEEM_DB_DIR = path.join(app.getPath('userData'), 'data');

const PORT = process.env.RAQEEM_PORT || 4310;

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev) {
    win.loadURL('http://localhost:5173');
    win.webContents.openDevTools({ mode: 'detach' });
  } else {
    win.loadFile(path.join(__dirname, '..', 'client', 'dist', 'index.html'));
  }
}

app.whenReady().then(() => {
  // شغّل خادم Express داخل نفس عملية Electron الرئيسية (بدون عملية فرعية منفصلة)
  require('../server/index.js');

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
