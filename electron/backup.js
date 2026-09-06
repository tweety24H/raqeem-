// نسخ احتياطي مشفّر (AES-256-GCM) لقاعدة بيانات المطبعة، تلقائي يومياً +
// زر "نسخ الآن" يدوي من الإعدادات. الوجهة الافتراضية D:\RaqeemosBackup إذا
// كان قرص D: موجود، وإلا مجلد المستندات\RaqeemosBackup.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { app } = require('electron');
const Store = require('electron-store');
const { getLocalStoreKey } = require('./secret');

const store = new Store({ name: 'raqeem-license', encryptionKey: getLocalStoreKey(), clearInvalidConfig: true });

const DAILY_MS = 24 * 60 * 60 * 1000;
const KEEP_LAST = 60;

function getEncryptionKey() {
  let hex = store.get('backupEncryptionKey');
  if (!hex) {
    hex = crypto.randomBytes(32).toString('hex');
    store.set('backupEncryptionKey', hex);
  }
  return Buffer.from(hex, 'hex');
}

function getBackupDir() {
  const configured = store.get('backupDirOverride');
  if (configured && configured.trim()) return configured.trim();
  if (fs.existsSync('D:\\')) return 'D:\\RaqeemosBackup';
  return path.join(app.getPath('documents'), 'RaqeemosBackup');
}

function setBackupDir(dir) {
  store.set('backupDirOverride', dir);
}

function encryptFile(srcPath, destPath) {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const input = fs.readFileSync(srcPath);
  const encrypted = Buffer.concat([cipher.update(input), cipher.final()]);
  const authTag = cipher.getAuthTag();
  // نخزّن iv (12 بايت) + authTag (16 بايت) + البيانات المشفّرة بنفس الملف.
  fs.writeFileSync(destPath, Buffer.concat([iv, authTag, encrypted]));
}

function decryptFile(srcPath, destPath) {
  const key = getEncryptionKey();
  const data = fs.readFileSync(srcPath);
  const iv = data.subarray(0, 12);
  const authTag = data.subarray(12, 28);
  const encrypted = data.subarray(28);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  fs.writeFileSync(destPath, decrypted);
}

async function runBackup() {
  const db = require('../server/db/db');
  const dir = getBackupDir();
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const tempPath = path.join(app.getPath('temp'), `raqeem_tmp_${stamp}.db`);
  const destPath = path.join(dir, `raqeem_backup_${stamp}.db.enc`);

  await db.backup(tempPath);
  encryptFile(tempPath, destPath);
  fs.unlinkSync(tempPath);

  cleanupOld(dir);
  return destPath;
}

function cleanupOld(dir) {
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.startsWith('raqeem_backup_') && f.endsWith('.db.enc'))
    .map((f) => ({ f, t: fs.statSync(path.join(dir, f)).mtimeMs }))
    .sort((a, b) => b.t - a.t);
  for (const { f } of files.slice(KEEP_LAST)) {
    fs.unlinkSync(path.join(dir, f));
  }
}

function listBackups() {
  const dir = getBackupDir();
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.startsWith('raqeem_backup_') && f.endsWith('.db.enc'))
    .map((f) => {
      const st = fs.statSync(path.join(dir, f));
      return { name: f, sizeKb: Math.round(st.size / 1024), date: st.mtime.toISOString() };
    })
    .sort((a, b) => new Date(b.date) - new Date(a.date));
}

// يستعيد نسخة احتياطية: يفكّها، يتأكد فعلياً إنها ملف SQLite صحيح، يأخذ نسخة
// أمان من القاعدة الحالية أولاً (احتياط لو المستخدم غلط بالاختيار)، وبعدين
// يستبدلها. البرنامج لازم يعيد تشغيل نفسه بعدها (القاعدة مفتوحة بنفس العملية).
async function restoreBackup(fileName) {
  const dir = getBackupDir();
  const src = path.join(dir, fileName);
  if (!fs.existsSync(src)) throw new Error('ملف النسخة الاحتياطية غير موجود');

  const dbPath = path.join(process.env.RAQEEM_DB_DIR, 'raqeem.db');
  const tempRestore = path.join(app.getPath('temp'), `raqeem_restore_${Date.now()}.db`);

  decryptFile(src, tempRestore);

  const header = fs.readFileSync(tempRestore).subarray(0, 16).toString('utf8');
  if (!header.startsWith('SQLite format 3')) {
    fs.unlinkSync(tempRestore);
    throw new Error('ملف النسخة الاحتياطية تالف أو غير صالح');
  }

  // نسخة أمان من القاعدة الحالية قبل الاستبدال (بنفس مجلد النسخ الاحتياطي).
  // نستخدم db.backup() الآمنة (مو نسخ ملف خام) لأن القاعدة مفتوحة حالياً
  // بوضع WAL، ونسخ الملف الخام مباشرة يمكن يفوّت كتابات حديثة بالـ -wal.
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const safetyStamp = new Date().toISOString().replace(/[:.]/g, '-');
  const safetyTemp = path.join(app.getPath('temp'), `raqeem_before_restore_${safetyStamp}.db`);
  const safetyDest = path.join(dir, `raqeem_before_restore_${safetyStamp}.db.enc`);
  const db = require('../server/db/db');
  await db.backup(safetyTemp);
  encryptFile(safetyTemp, safetyDest);
  fs.unlinkSync(safetyTemp);

  // نسكّر اتصال القاعدة الحالي قبل استبدال الملف مباشرة (وإلا ويندوز يمنع
  // الكتابة على ملف مفتوح بنفس العملية). البرنامج يعيد تشغيل نفسه فوراً بعد
  // هذا فما أكو مشكلة إن db ما تصير قابلة للاستخدام بعدها بنفس العملية.
  db.close();

  fs.copyFileSync(tempRestore, dbPath);
  for (const ext of ['-wal', '-shm']) {
    const p = dbPath + ext;
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }
  fs.unlinkSync(tempRestore);
}

function scheduleAutoBackup() {
  // نسخة أول ما يفتح البرنامج (إذا مرت أكثر من يوم عن آخر نسخة) + كل 24 ساعة بعدها.
  const last = store.get('lastBackupAt') || 0;
  const due = Date.now() - last > DAILY_MS;
  if (due) {
    runBackup()
      .then(() => store.set('lastBackupAt', Date.now()))
      .catch((err) => console.error('فشل النسخ الاحتياطي المشفّر:', err.message));
  }
  setInterval(() => {
    runBackup()
      .then(() => store.set('lastBackupAt', Date.now()))
      .catch((err) => console.error('فشل النسخ الاحتياطي المشفّر:', err.message));
  }, DAILY_MS);
}

module.exports = {
  runBackup,
  restoreBackup,
  listBackups,
  getBackupDir,
  setBackupDir,
  decryptFile,
  scheduleAutoBackup,
};
