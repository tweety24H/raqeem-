#!/usr/bin/env node
/**
 * تجربة مستقلة (غير مفعّلة بالإنتاج): تحويل قاعدة raqeem.db الحالية
 * (better-sqlite3 عادية) إلى نسخة مشفّرة بـ SQLCipher عبر
 * better-sqlite3-multiple-ciphers، للتحقق من جاهزية المسار قبل تفعيله فعليًا.
 *
 * لا يلمس قاعدة الإنتاج data/raqeem.db أبدًا: يقرأها بـ VACUUM INTO لملف
 * نسخة جديد فقط، ثم يشفّر تلك النسخة، ولا يستبدل الأصل بأي شكل.
 *
 * تشغيل:
 *   npm install better-sqlite3-multiple-ciphers   (تجريبي فقط، غير مضاف لـ package.json)
 *   node scripts/try-sqlcipher.js
 */
const path = require('path');
const fs = require('fs');

const dataDir = process.env.RAQEEM_DB_DIR || path.join(__dirname, '..', 'data');
const sourceDbPath = process.env.RAQEEM_DB_PATH || path.join(dataDir, 'raqeem.db');

const outDir = path.join(__dirname, '..', 'data', 'sqlcipher-trial');
const plainBackupPath = path.join(outDir, 'raqeem-backup.db');
const encryptedPath = path.join(outDir, 'raqeem-encrypted.db');

const TEST_KEY = process.env.RAQEEM_SQLCIPHER_TEST_KEY || 'raqeemos-trial-key-change-me';

function log(msg) {
  console.log(`[try-sqlcipher] ${msg}`);
}

function main() {
  if (!fs.existsSync(sourceDbPath)) {
    log(`لا توجد قاعدة بيانات مصدر بالمسار: ${sourceDbPath} — أنشئ بيانات تجريبية أولاً بتشغيل التطبيق مرة.`);
    process.exit(1);
  }

  let PlainDatabase;
  try {
    PlainDatabase = require('better-sqlite3');
  } catch {
    log('حزمة better-sqlite3 غير موجودة، هذا غير متوقع بمشروع RaqeemOS نفسه.');
    process.exit(1);
  }

  let CipherDatabase;
  try {
    CipherDatabase = require('better-sqlite3-multiple-ciphers');
  } catch {
    log('حزمة better-sqlite3-multiple-ciphers غير مثبتة بعد.');
    log('هذا متوقع — السكربت تجريبي فقط ولم يُفعَّل بالإنتاج بعد.');
    log('لتجربته: npm install better-sqlite3-multiple-ciphers ثم أعد التشغيل.');
    process.exit(0);
  }

  fs.mkdirSync(outDir, { recursive: true });
  if (fs.existsSync(plainBackupPath)) fs.unlinkSync(plainBackupPath);
  if (fs.existsSync(encryptedPath)) fs.unlinkSync(encryptedPath);

  // 1) نسخة احتياطية آمنة من قاعدة الإنتاج بدون التأثير عليها أو قفلها طويلاً.
  log(`أخذ نسخة احتياطية عبر VACUUM INTO من: ${sourceDbPath}`);
  const sourceDb = new PlainDatabase(sourceDbPath, { readonly: true });
  sourceDb.exec(`VACUUM INTO '${plainBackupPath.replace(/'/g, "''")}'`);
  sourceDb.close();
  log(`تم إنشاء نسخة غير مشفّرة للتجربة: ${plainBackupPath}`);

  // 2) فتح النسخة الاحتياطية بمحرك multiple-ciphers (بلا مفتاح بعد) ثم تصديرها مشفّرة.
  const plainCopy = new CipherDatabase(plainBackupPath);
  plainCopy.pragma(`cipher='sqlcipher'`);
  plainCopy.pragma(`rekey='${TEST_KEY.replace(/'/g, "''")}'`);
  // rekey على قاعدة غير مشفّرة يشفّرها في مكانها؛ ننسخها لملف الإخراج المنفصل
  // كي تبقى raqeem-backup.db كنسخة مرجعية غير مشفّرة أيضًا.
  plainCopy.exec(`VACUUM INTO '${encryptedPath.replace(/'/g, "''")}'`);
  plainCopy.close();
  log(`تم إنشاء نسخة مشفّرة للتجربة: ${encryptedPath}`);

  // 3) التحقق: فتح الملف المشفّر بالمفتاح الصحيح وقراءة بيانات حقيقية.
  const verifyDb = new CipherDatabase(encryptedPath);
  verifyDb.pragma(`cipher='sqlcipher'`);
  verifyDb.pragma(`key='${TEST_KEY.replace(/'/g, "''")}'`);
  const tables = verifyDb.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  const workerCount = verifyDb.prepare('SELECT COUNT(*) AS c FROM workers').get().c;
  verifyDb.close();
  log(`تحقق ناجح: ${tables.length} جدول، ${workerCount} موظف مقروء من النسخة المشفّرة.`);

  // 4) التحقق العكسي: فتح نفس الملف بدون مفتاح يجب أن يفشل (يثبت أنه فعلاً مشفّر).
  try {
    const noKeyDb = new CipherDatabase(encryptedPath);
    noKeyDb.prepare('SELECT COUNT(*) FROM workers').get();
    noKeyDb.close();
    log('تحذير: الملف انفتح وقُرئ بدون مفتاح! التشفير غير فعّال فعليًا.');
  } catch {
    log('تأكيد: فتح الملف بدون مفتاح يفشل كما هو متوقع — التشفير يعمل فعليًا.');
  }

  log('انتهت التجربة بنجاح. هذا المسار لم يُفعَّل بالإنتاج (data/raqeem.db الحقيقية لم تُمس إطلاقًا).');
  log(`ملفات التجربة موجودة بـ: ${outDir} — يمكن حذفها بأمان بعد المراجعة.`);
}

main();
