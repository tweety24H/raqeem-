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

// هاي تفتح شاشة السبلاش الصغيرة (400x400 بدون إطار) اللي تظهر أول ما تفتح
// البرنامج - بس واجهة، ما تسوي شي ثاني
function createSplashWindow() {
  const splash = new BrowserWindow({
    width: 400,
    height: 400,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    movable: false,
    skipTaskbar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  splash.loadFile(path.join(__dirname, 'splash.html'));
  return splash;
}

// هاي تسوي النافذة الرئيسية للبرنامج - مخفية بالأول (show: false) لحد ما
// يخلص التحميل، حتى المستخدم ما يشوف ومضة بيضاء وهو يفتح البرنامج
function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    autoHideMenuBar: true,
    show: false,
    icon: path.join(__dirname, '..', 'build', 'icon.png'),
    title: 'مطبعتي - Raqeemos v2',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      devTools: isDev,
    },
  });

  // هذا الجزء يشتغل بس بالنسخة المثبتة عند الزبون (مو وقت التطوير) - يقفل
  // كل طرق فتح أدوات المطور حتى محد يلعب بالكونسول ويشوف بيانات حساسة
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
    win.loadURL('http://localhost:5173');
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

// من لحظة ما البرنامج يصير جاهز: نشغل السيرفر، نفتح السبلاش والنافذة
// الرئيسية سوا، وبعدين نسكر السبلاش ونطلع النافذة لما تخلص
app.whenReady().then(() => {
  // شغّل خادم Express داخل نفس عملية Electron الرئيسية (بدون عملية فرعية منفصلة)
  require('../server/index.js');

  registerIpcHandlers();
  backup.scheduleAutoBackup();

  const splash = createSplashWindow();
  const win = createWindow();

  // يضمن اننا نسكر السبلاش ونعرض النافذة الرئيسية مرة وحدة بس، سواء عن
  // طريق ready-to-show الطبيعي أو حد أقصى 5 ثواني إذا تعلّق التحميل.
  let splashDismissed = false;
  const splashTimeout = setTimeout(dismissSplash, 5000);

  function dismissSplash() {
    if (splashDismissed) return;
    splashDismissed = true;
    clearTimeout(splashTimeout);
    if (!splash.isDestroyed()) splash.close();
    if (!win.isDestroyed()) win.show();
  }

  win.once('ready-to-show', () => {
    setTimeout(dismissSplash, 800);
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      const w = createWindow();
      w.once('ready-to-show', () => w.show());
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
