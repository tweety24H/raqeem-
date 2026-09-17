const fs = require('fs');
const path = require('path');
const db = require('../db/db');
const settingsService = require('./settingsService');

const dataDir = process.env.RAQEEM_DB_DIR || path.join(__dirname, '..', '..', 'data');
const dbPath = process.env.RAQEEM_DB_PATH || path.join(dataDir, 'raqeem.db');
const defaultBackupDir = path.join(dataDir, '..', 'backups');

const KEEP_LAST = 30;
const INTERVAL_MS = 6 * 60 * 60 * 1000; // كل ٦ ساعات

function getBackupDir() {
  const configured = settingsService.get('backup_dir');
  return configured && configured.trim() ? configured.trim() : defaultBackupDir;
}

function runBackup() {
  try {
    const dir = getBackupDir();
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const dest = path.join(dir, `raqeem_backup_${stamp}.db`);
    // backup() هي دالة better-sqlite3 الآمنة أثناء تشغيل قاعدة البيانات
    db.backup(dest)
      .then(() => {
        console.log(`تم إنشاء نسخة احتياطية: ${dest}`);
        cleanupOldBackups(dir);
      })
      .catch((err) => console.error('فشل النسخ الاحتياطي:', err.message));
  } catch (err) {
    console.error('فشل النسخ الاحتياطي:', err.message);
  }
}

function cleanupOldBackups(dir) {
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.startsWith('raqeem_backup_') && f.endsWith('.db'))
    .map((f) => ({ f, t: fs.statSync(path.join(dir, f)).mtimeMs }))
    .sort((a, b) => b.t - a.t);
  for (const { f } of files.slice(KEEP_LAST)) {
    fs.unlinkSync(path.join(dir, f));
  }
}

function scheduleAutoBackup() {
  runBackup();
  setInterval(runBackup, INTERVAL_MS);
}

module.exports = { scheduleAutoBackup, runBackup, getBackupDir };
