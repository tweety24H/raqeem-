const { app, BrowserWindow, ipcMain, clipboard, Menu, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const license = require('./license');
const backup = require('./backup');
const { initAutoUpdater, quitAndInstall } = require('./updater');

const isDev = process.env.RAQEEM_ENV === 'dev';

// قفل نسخة-وحدة: بدونه كل فتح جديد للبرنامج (نقرة مزدوجة على الاختصار، أو
// حتى محاولة فاشلة سابقة) يفتح عملية RaqeemOS.exe إضافية بدل ما يتأكد
// إذا هناك نسخة شغالة أصلاً - وهذا بالضبط سبب تكدّس عشرات النسخ اللي شفناها
// فعليًا، واللي يخلي مثبّت NSIS يعلق بحلقة "البرنامج شغال، اضغط موافق"
// بلا نهاية لأنه ما يقدر يسكرهم كلهم. لازم تكون أول شي يصير بالملف.
const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
  app.quit();
  process.exit(0);
}

// خزّن قاعدة البيانات وكل الملفات المرفوعة داخل مجلد بيانات المستخدم الخاص بويندوز
// حتى تبقى النسخة مستقلة تمامًا لكل جهاز/مطبعة.
process.env.RAQEEM_DB_DIR = path.join(app.getPath('userData'), 'data');

const PORT = process.env.RAQEEM_PORT || 4310;

// هاي تفتح شاشة السبلاش الصغيرة (400x500 بدون إطار) اللي تظهر أول ما تفتح
// البرنامج - بس واجهة، ما تسوي شي ثاني
function createSplashWindow() {
  const splash = new BrowserWindow({
    width: 400,
    height: 500,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    movable: false,
    skipTaskbar: true,
    center: true,
    icon: path.join(__dirname, 'assets', 'icon.png'),
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
    // تبدأ شفافة بالكامل حتى نقدر نسوي "fade in" لما تطلع بعد ما تسكر
    // شاشة السبلاش (مدعومة بويندوز وماك؛ بلينكس تنترك عادي بدون تأثير)
    opacity: 0,
    // ايقونة النافذة الرئيسية - نفس ايقونة Raqeem الجديدة (تظهر بالـ Taskbar وTitle bar وAlt+Tab)
    icon: path.join(__dirname, 'assets', 'icon.png'),
    title: 'Raqeem - مطبعتك.. بأرقام',
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

  // أي رابط خارجي (مثل زر واتساب بصفحة التفعيل) لازم يفتح بمتصفح النظام
  // الافتراضي، مو بنافذة Electron جديدة بدون شريط عنوان أو حماية
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });

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

  ipcMain.handle('settings:getOwnerWhatsApp', () => license.getOwnerWhatsAppNumber());
  ipcMain.handle('settings:setOwnerWhatsApp', (event, number) => license.setOwnerWhatsAppNumber(number));

  // مولد مفاتيح تفعيل حقيقية للمالك فقط - يشتغل حصرا وهو مشغّل من السورس
  // (npm run dev / electron:dev)، مو من النسخة المحزّمة عند الزبون. حتى لو
  // تجاوز أحد فحص app.isPackaged، مجلد licensing-vendor/ (وفيه المفتاح
  // الخاص RSA وملف sign.js) أصلا غير مرفق بالنسخة المحزّمة إطلاقا (مو ضمن
  // files بـ package.json)، فـ require أدناه راح يفشل بأي حال بجهاز الزبون -
  // هذا هو الحماية الحقيقية، مو مجرد فحص isPackaged.
  ipcMain.handle('license:generate', (event, hwid, shop, duration) => {
    if (app.isPackaged) {
      return { ok: false, error: 'هذه الميزة غير متوفرة بالنسخة المحزّمة - تعمل فقط من نسخة المطوّر' };
    }
    try {
      const { signLicense, expFromDuration } = require('../licensing-vendor/sign');
      const exp = expFromDuration(duration);
      const { key, payload } = signLicense(hwid, shop, exp);
      return { ok: true, key, payload };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  ipcMain.handle('admin:hasPassword', () => license.hasAdminPassword());
  ipcMain.handle('admin:setPassword', (event, password) => {
    license.setAdminPassword(password);
    return true;
  });
  ipcMain.handle('admin:checkPassword', (event, password) => license.checkAdminPassword(password));
  ipcMain.handle('admin:removePassword', () => {
    license.removeAdminPassword();
    return true;
  });

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

  // يفتح نافذة اختيار مجلد نظامية (لمسار النسخ الاحتياطي بصفحة الإعدادات) —
  // يرجّع المسار الكامل، أو null إذا المستخدم ألغى الاختيار.
  ipcMain.handle('dialog:selectFolder', async () => {
    const parent = BrowserWindow.getFocusedWindow();
    const result = await dialog.showOpenDialog(parent, { properties: ['openDirectory'] });
    if (result.canceled || !result.filePaths.length) return null;
    return result.filePaths[0];
  });

  // يحفظ بايتات جاهزة (مثلاً تصميم منزّل من طلبات QR الواردة) بنافذة حفظ
  // نظامية حقيقية — الرندرر يجيب الملف بـ fetch عادي ويرسل البايتات هنا
  // فقط، لأن صفحة الويب نفسها ما تقدر تكتب لمسار عشوائي على القرص مباشرة.
  ipcMain.handle('dialog:saveFile', async (event, bytes, suggestedName) => {
    const parent = BrowserWindow.getFocusedWindow();
    const result = await dialog.showSaveDialog(parent, { defaultPath: suggestedName });
    if (result.canceled || !result.filePath) return { ok: false };
    fs.writeFileSync(result.filePath, Buffer.from(bytes));
    return { ok: true, path: result.filePath };
  });
}

// إذا حد حاول يفتح نسخة ثانية وهو وحدة شغالة أصلاً (قفل النسخة-الوحدة فوق
// رفضها) - بدل ما نسكتها بصمت، نرجّع تركيز الشاشة للنافذة الموجودة حتى
// المستخدم يعرف البرنامج أصلاً مفتوح.
app.on('second-instance', () => {
  const existing = BrowserWindow.getAllWindows()[0];
  if (existing) {
    if (existing.isMinimized()) existing.restore();
    existing.focus();
  }
});

let serverHandle = null;

// من لحظة ما البرنامج يصير جاهز: نشغل السيرفر، نفتح السبلاش والنافذة
// الرئيسية سوا، وبعدين نسكر السبلاش ونطلع النافذة لما تخلص
app.whenReady().then(() => {
  // شغّل خادم Express داخل نفس عملية Electron الرئيسية (بدون عملية فرعية منفصلة)
  serverHandle = require('../server/index.js');

  registerIpcHandlers();
  backup.scheduleAutoBackup();

  const splash = createSplashWindow();
  const win = createWindow();

  // نسوي fade-in ناعم للنافذة الرئيسية بالتدريج (opacity 0 -> 1) بدل ما
  // تطلع فجأة - يشتغل غير محسوس تقريبا بس يعطي احساس احترافي أكثر من
  // ظهورها دفعة وحدة. setOpacity غير مدعومة بلينكس فتترك بصمت.
  function fadeInWindow(target, durationMs = 250, steps = 12) {
    let i = 0;
    const stepMs = durationMs / steps;
    const timer = setInterval(() => {
      i += 1;
      try {
        target.setOpacity(Math.min(1, i / steps));
      } catch {
        /* منصة ما تدعم setOpacity (مثلا لينكس) - نتجاهل */
      }
      if (i >= steps) clearInterval(timer);
    }, stepMs);
  }

  // مدة شاشة السبلاش ثابتة (2.5 ثانية) - تتزامن تقريبا مع شريط التحميل
  // اللي بداخل splash.html (ثانيتين) بالإضافة لهامش بسيط. بعدها نسكر
  // السبلاش ونطلع النافذة الرئيسية مع fade، بغض النظر إذا خلص التحميل قبل
  // هذا الوقت أو لا (النافذة أصلا show: false لحد هسه فما يبين أي فلاش).
  let dismissed = false;
  setTimeout(() => {
    if (dismissed) return;
    dismissed = true;
    if (!splash.isDestroyed()) splash.close();
    if (!win.isDestroyed()) {
      win.show();
      fadeInWindow(win);
    }
  }, 2500);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      // هذا المسار غير مرتبط بسبلاش الاقلاع (يصير بعد ما تكون كل
      // النوافذ مسكرة وضغط المستخدم على أيقونة البرنامج بالـ Dock بالماك)
      // فنعرضها مباشرة بعتامة كاملة بدون تدرّج
      const w = createWindow();
      w.once('ready-to-show', () => {
        w.show();
        w.setOpacity(1);
      });
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// يسكر منفذ السيرفر الداخلي (4310) واتصال قاعدة البيانات بشكل نظيف قبل ما
// تسكر العملية فعليًا - بدونها، إغلاق البرنامج (خصوصًا لو انسكر بالقوة أو
// أثناء تحديث) يخلي المنفذ أو ملف القاعدة عالق بحالة نصف-مغلقة، وأي عملية
// جديدة تحاول تفتح تطيح بخطأ EADDRINUSE على السيرفر أو تعلق بقفل الملف.
app.on('before-quit', () => {
  if (!serverHandle) return;
  try {
    serverHandle.shutdown();
  } catch {
    /* البرنامج مغلق أصلاً، ما يهم لو فشلت - الهدف تنظيف أفضل جهد فقط */
  }
});
