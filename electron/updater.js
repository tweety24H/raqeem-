// تحديث تلقائي اختياري (Opportunistic) — البرنامج أصلاً يشتغل بدون إنترنت
// بالكامل، فهذا يحاول يتحقق من نسخة جديدة بالخلفية بس، وإذا ماكو نت أو فشل
// الاتصال يفشل بصمت تام ولا يأثر على استخدام البرنامج إطلاقاً.
//
// المصدر: GitHub Releases (انظر "publish" بـ package.json — owner/repo
// معدّلين على tweety24H/raqeem-).
//
// autoDownload معطّل عمداً: ما نحمّل شي بدون إذن المستخدم. لما نلكَه تحديث،
// نعرض ديالوگ نظامي حقيقي (مو إشعار Electron الافتراضي، حتى نتحكم بنص
// الأزرار بالعربي) ونحمّل بس إذا ضغط "حدث الآن".

const { autoUpdater } = require('electron-updater');
const { dialog } = require('electron');

autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;

const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;

function initAutoUpdater(win) {
  autoUpdater.on('update-available', async (info) => {
    try {
      const { response } = await dialog.showMessageBox(win, {
        type: 'info',
        title: 'تحديث جديد',
        message: `يوجد تحديث جديد (v${info.version}) - تريد تحدث هسه؟`,
        buttons: ['حدث الآن', 'بعدين'],
        defaultId: 0,
        cancelId: 1,
        noLink: true,
      });
      if (response === 0) {
        autoUpdater.downloadUpdate().catch(() => {});
      }
    } catch {
      /* فشل عرض الديالوگ (نادر جداً) - نتجاهل، نحاول مرة ثانية بالفحص الجاي */
    }
  });

  // بعد ما يخلص التحميل (لأن المستخدم وافق فوق)، نبلّغ الواجهة عبر
  // UpdateBanner.jsx الموجود أصلاً - يعرض "أعد التشغيل لتفعيله".
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
