const { app, BrowserWindow, ipcMain, clipboard, Menu } = require('electron');
const path = require('path');
const license = require('./license');
const backup = require('./backup');
const { initAutoUpdater, quitAndInstall } = require('./updater');

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
    icon: path.join(__dirname, '..', 'build', 'icon.png'),
    title: 'مطبعتي - Raqeemos v2',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      devTools: isDev,
    },
  });

  if (!isDev) {
    // يمنع فتح أدوات المطوّر بالنسخة النهائية (F12 / Ctrl+Shift+I / Ctrl+Shift+J
    // / Ctrl+Shift+C) حتى لا يقدر أي شخص يفتح Console ويلعب بالبيانات مباشرة.
    win.webContents.on('before-input-event', (event, input) => {
      const key = (input.key || '').toLowerCase();
      const blocked =
        key === 'f12' ||
        ((input.control || input.meta) && input.shift && ['i', 'j', 'c'].includes(key));
      if (blocked) event.preventDefault();
    });
    win.webContents.on('devtools-opened', () => win.webContents.closeDevTools());
    Menu.setApplicationMenu(null);
  }

  if (isDev) {
    win.loadURL('http://localhost:5174');
    win.webContents.openDevTools({ mode: 'detach' });
  } else {
    win.loadFile(path.join(__dirname, '..', 'client', 'dist', 'index.html'));
  }

  // التحديث التلقائي يشتغل فقط بالنسخة المحزّمة (مثبّتة عند المستخدم)،
  // مو أثناء التطوير أو تشغيل غير محزّم — يمنع محاولات تحديث وهمية بجهاز المطوّر.
  if (app.isPackaged) {
    initAutoUpdater(win);
  }

  return win;
}

function registerIpcHandlers() {
  ipcMain.handle('license:getStatus', () => license.getLicenseStatus());
  ipcMain.handle('license:activate', (event, key) => license.activate(key));
  ipcMain.handle('license:deactivate', () => license.deactivate());
  ipcMain.handle('license:copyToClipboard', (event, text) => {
    clipboard.writeText(text);
    return true;
  });

  ipcMain.handle('admin:hasPassword', () => license.hasAdminPassword());
  ipcMain.handle('admin:setPassword', (event, password) => {
    license.setAdminPassword(password);
    return true;
  });
  ipcMain.handle('admin:checkPassword', (event, password) => license.checkAdminPassword(password));

  ipcMain.handle('backup:runNow', async () => {
    try {
      const dest = await backup.runBackup();
      return { ok: true, dest };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });
  ipcMain.handle('backup:list', () => backup.listBackups());
  ipcMain.handle('backup:getDir', () => backup.getBackupDir());
  ipcMain.handle('backup:restore', async (event, fileName) => {
    try {
      await backup.restoreBackup(fileName);
      // لازم إعادة تشغيل كاملة لأن اتصال قاعدة البيانات بنفس العملية انسكر
      // والسيرفر لازم يفتح الملف الجديد من الصفر.
      setTimeout(() => {
        app.relaunch();
        app.exit(0);
      }, 300);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  ipcMain.handle('update:install', () => quitAndInstall());
}

app.whenReady().then(() => {
  // شغّل خادم Express داخل نفس عملية Electron الرئيسية (بدون عملية فرعية منفصلة)
  require('../server/index.js');

  registerIpcHandlers();
  backup.scheduleAutoBackup();

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
