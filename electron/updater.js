// تحديث تلقائي اختياري (Opportunistic) — البرنامج أصلاً يشتغل بدون إنترنت
// بالكامل، فهذا يحاول يتحقق من نسخة جديدة بالخلفية بس، وإذا ماكو نت أو فشل
// الاتصال يفشل بصمت تام ولا يأثر على استخدام البرنامج إطلاقاً.
//
// المصدر: GitHub Releases (انظر "publish" بـ package.json — owner/repo
// معدّلين على tweety24H/raqeem-).

const { autoUpdater } = require('electron-updater');

autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;

const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;

function initAutoUpdater(win) {
  autoUpdater.on('update-available', (info) => {
    win.webContents.send('update:available', { version: info.version });
  });

  autoUpdater.on('update-downloaded', (info) => {
    win.webContents.send('update:downloaded', { version: info.version });
  });

  autoUpdater.on('error', (err) => {
    // متوقّع ومقبول إذا ماكو إنترنت أو المصدر مو معدّل بعد — لا نكسر شي.
    console.log('تحقق التحديث فشل (طبيعي إذا ماكو إنترنت):', err.message);
  });

  const check = () => autoUpdater.checkForUpdates().catch(() => {});
  setTimeout(check, 5000);
  setInterval(check, CHECK_INTERVAL_MS);
}

function quitAndInstall() {
  autoUpdater.quitAndInstall();
}

module.exports = { initAutoUpdater, quitAndInstall };
