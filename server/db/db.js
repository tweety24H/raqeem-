const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const dataDir = process.env.RAQEEM_DB_DIR || path.join(__dirname, '..', '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const dbPath = process.env.RAQEEM_DB_PATH || path.join(dataDir, 'raqeem.db');
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
db.exec(schema);

function seedIfEmpty() {
  const workerCount = db.prepare('SELECT COUNT(*) AS c FROM workers').get().c;
  if (workerCount === 0) {
    const bcrypt = require('bcryptjs');
    const insertWorker = db.prepare(
      'INSERT INTO workers (name, pin_hash, role) VALUES (?, ?, ?)'
    );
    insertWorker.run('المدير', bcrypt.hashSync('1234', 8), 'owner');
  }

  const serviceCount = db.prepare('SELECT COUNT(*) AS c FROM services').get().c;
  if (serviceCount === 0) {
    const insertService = db.prepare(
      'INSERT INTO services (name, unit, price, category) VALUES (?, ?, ?, ?)'
    );
    insertService.run('كارت شخصي', 'قطعة', 25000, 'بطاقات');
    insertService.run('طباعة فلكس', 'متر', 8000, 'فلكس');
  }

  const settingsCount = db.prepare('SELECT COUNT(*) AS c FROM settings').get().c;
  if (settingsCount === 0) {
    const insertSetting = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)');
    const crypto = require('crypto');
    const defaults = {
      shop_name: 'مطبعتي',
      shop_phone: '',
      shop_address: '',
      shop_logo_path: '',
      receipt_primary_color: '#1B2A6B', // نيلي
      receipt_accent_color: '#D4AF37', // ذهبي
      backup_dir: '',
      currency: 'IQD',
      whatsapp_enabled: '0',
      jwt_secret: crypto.randomBytes(32).toString('hex'),
    };
    for (const [key, value] of Object.entries(defaults)) {
      insertSetting.run(key, value);
    }
  } else {
    const hasSecret = db.prepare("SELECT value FROM settings WHERE key = 'jwt_secret'").get();
    if (!hasSecret || !hasSecret.value) {
      const crypto = require('crypto');
      db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(
        'jwt_secret',
        crypto.randomBytes(32).toString('hex')
      );
    }
  }
}

seedIfEmpty();

module.exports = db;
