const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
const { normalizeArabic } = require('../utils/arabicSearch');

const dataDir = process.env.RAQEEM_DB_DIR || path.join(__dirname, '..', '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const dbPath = process.env.RAQEEM_DB_PATH || path.join(dataDir, 'raqeem.db');
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
db.exec(schema);

// ترقية (migration) إضافية لقاعدة بيانات موجودة مسبقًا: CREATE TABLE IF NOT EXISTS
// أعلاه ما يضيف أعمدة جديدة لجدول موجود، فنتحقق ونضيفها يدويًا بدون حذف أي بيانات.
function migrateStockItemsColumns() {
  const existing = db.prepare('PRAGMA table_info(stock_items)').all().map((c) => c.name);
  const wanted = [
    ['type', 'TEXT'],
    ['category_id', 'INTEGER REFERENCES stock_categories(id) ON DELETE SET NULL'],
    ['purchase_price', 'REAL NOT NULL DEFAULT 0'],
    ['sale_price', 'REAL NOT NULL DEFAULT 0'],
    ['location', 'TEXT'],
    ['supplier', 'TEXT'],
    ['image_path', 'TEXT'],
    ['notes', 'TEXT'],
  ];
  for (const [col, def] of wanted) {
    if (!existing.includes(col)) {
      db.exec(`ALTER TABLE stock_items ADD COLUMN ${col} ${def}`);
    }
  }
  // إذا كان عندنا سعر تكلفة قديم (cost_per_unit) وما عندنا سعر شراء بعد، خله نفس القيمة
  // (توافق مع البيانات القديمة، حتى تقارير الأرباح القديمة تستمر تشتغل صح).
  db.exec(`UPDATE stock_items SET purchase_price = cost_per_unit WHERE purchase_price = 0 AND cost_per_unit > 0`);
}
migrateStockItemsColumns();

// إضافة عمود search_name لجدول الزبائن الموجود مسبقًا (بدون حذف أي بيانات)،
// وتعبئته لكل الزبائن الحاليين دفعة واحدة — التحديثات اللاحقة عند إنشاء/تعديل
// زبون تُحدَّث في routes/customers.js مباشرة.
function migrateCustomersSearchName() {
  const existing = db.prepare('PRAGMA table_info(customers)').all().map((c) => c.name);
  if (!existing.includes('search_name')) {
    db.exec('ALTER TABLE customers ADD COLUMN search_name TEXT');
  }
  const stale = db
    .prepare('SELECT id, name FROM customers WHERE search_name IS NULL OR search_name = ?')
    .all('');
  if (stale.length) {
    const update = db.prepare('UPDATE customers SET search_name = ? WHERE id = ?');
    const tx = db.transaction((rows) => {
      for (const row of rows) update.run(normalizeArabic(row.name), row.id);
    });
    tx(stale);
  }
  // الفهرس يُنشأ هنا (وليس في schema.sql) لأن قاعدة بيانات موجودة مسبقًا لا
  // تملك هذا العمود إلا بعد سطر ALTER TABLE أعلاه — إنشاؤه في schema.sql
  // يفشل فورًا على أي قاعدة بيانات كانت موجودة قبل هذا التحديث.
  db.exec('CREATE INDEX IF NOT EXISTS idx_customers_search_name ON customers(search_name)');
}
migrateCustomersSearchName();

// زرع قائمة الصلاحيات الثابتة (idempotent — لا يكرر الصفوف، ولا يحذف صلاحيات
// ممنوحة سابقًا حتى لو تغيّرت القائمة البرمجية لاحقًا).
// ترقية: عمود group_name لجدول الصلاحيات (لتجميعها بالواجهة) — أُضيف
// بعد إنشاء الجدول الأصلي، فيلزم ALTER TABLE لقاعدة بيانات موجودة مسبقًا.
function migratePermissionsGroupName() {
  const existing = db.prepare('PRAGMA table_info(permissions)').all().map((c) => c.name);
  if (!existing.includes('group_name')) {
    db.exec('ALTER TABLE permissions ADD COLUMN group_name TEXT');
  }
}
migratePermissionsGroupName();

function seedPermissions() {
  const PERMISSIONS = [
    ['view_orders', 'عرض الطلبات', 'الطلبات'],
    ['create_order', 'إنشاء طلب', 'الطلبات'],
    ['edit_order', 'تعديل طلب', 'الطلبات'],
    ['delete_order', 'حذف طلب', 'الطلبات'],
    ['update_order_status', 'تحديث حالة الطلب', 'الطلبات'],
    ['view_customers', 'عرض الزبائن', 'الزبائن'],
    ['create_customer', 'إضافة زبون', 'الزبائن'],
    ['edit_customer', 'تعديل زبون', 'الزبائن'],
    ['delete_customer', 'حذف زبون', 'الزبائن'],
    ['view_receipts', 'عرض الفواتير', 'الفواتير'],
    ['print_receipts', 'طباعة الفواتير', 'الفواتير'],
    ['view_dashboard', 'عرض لوحة التحكم', 'لوحة التحكم'],
    ['view_reports', 'عرض التقارير', 'التقارير'],
    ['view_profits', 'عرض الأرباح', 'التقارير'],
    ['view_debts', 'عرض الديون', 'التقارير'],
    ['view_inventory', 'عرض المخزون', 'المخزون'],
    ['edit_inventory', 'تعديل المخزون', 'المخزون'],
    ['manage_users', 'إدارة الموظفين', 'الإعدادات'],
    ['manage_permissions', 'إدارة الصلاحيات', 'الإعدادات'],
    ['manage_roles', 'إدارة الأدوار', 'الإعدادات'],
    ['view_activity_logs', 'عرض سجل النشاطات', 'أخرى'],
  ];
  const insert = db.prepare(
    'INSERT INTO permissions (slug, name, group_name) VALUES (?, ?, ?) ' +
      'ON CONFLICT(slug) DO UPDATE SET group_name = excluded.group_name'
  );
  const tx = db.transaction(() => {
    for (const [slug, name, group] of PERMISSIONS) insert.run(slug, name, group);
  });
  tx();
}
seedPermissions();

// ترقية: عمود role_id لجدول workers (دور/منصب اختياري يمنح حزمة صلاحيات
// جاهزة — منفصل تمامًا عن عمود role الحالي 'owner'|'employee' الذي يبقى هو
// المتحكم بصلاحية المالك الكاملة؛ role_id يضيف طبقة صلاحيات إضافية فوقه).
function migrateWorkersRoleId() {
  const existing = db.prepare('PRAGMA table_info(workers)').all().map((c) => c.name);
  if (!existing.includes('role_id')) {
    db.exec('ALTER TABLE workers ADD COLUMN role_id INTEGER REFERENCES roles(id)');
  }
  // الفهرس يُنشأ هنا (وليس schema.sql) لنفس سبب idx_customers_search_name
  // أعلاه: قاعدة بيانات موجودة مسبقًا ما تملك هذا العمود إلا بعد ALTER TABLE.
  db.exec('CREATE INDEX IF NOT EXISTS idx_workers_role_id ON workers(role_id)');
}
migrateWorkersRoleId();

// ترقية: نقاط ولاء بسيطة للزبون — نقطة واحدة لكل 1000 د.ع بقيمة الطلب،
// تُحسب محليًا عند إنشاء كل طلب (orders.js)، بدون أي خدمة خارجية.
function migrateCustomersPoints() {
  const existing = db.prepare('PRAGMA table_info(customers)').all().map((c) => c.name);
  if (!existing.includes('points')) {
    db.exec('ALTER TABLE customers ADD COLUMN points INTEGER NOT NULL DEFAULT 0');
  }
}
migrateCustomersPoints();

// زرع الأدوار الأربعة الافتراضية + توزيع الصلاحيات عليها (idempotent).
function seedRoles() {
  const ROLES = [
    [1, 'مدير عام', 'كل الصلاحيات', 1],
    [2, 'مصمم', 'ادارة التصاميم والطلبات', 0],
    [3, 'عامل طباعة', 'تحديث حالة الطلب فقط', 0],
    [4, 'محاسب', 'الفواتير والتقارير', 0],
  ];
  const insertRole = db.prepare(
    'INSERT INTO roles (id, name, description, is_system) VALUES (?, ?, ?, ?) ON CONFLICT(id) DO NOTHING'
  );
  const tx1 = db.transaction(() => {
    for (const r of ROLES) insertRole.run(...r);
  });
  tx1();

  const ALL_SLUGS = db.prepare('SELECT slug FROM permissions').all().map((p) => p.slug);
  const ROLE_PERMISSIONS = {
    1: ALL_SLUGS,
    2: [
      'view_orders', 'create_order', 'edit_order', 'update_order_status',
      'view_customers', 'create_customer', 'edit_customer',
      'view_dashboard', 'view_receipts', 'print_receipts', 'view_inventory',
    ],
    3: ['view_orders', 'update_order_status', 'view_dashboard'],
    4: [
      'view_orders', 'view_customers', 'view_receipts', 'print_receipts',
      'view_reports', 'view_profits', 'view_debts', 'view_dashboard',
    ],
  };

  const getPermId = db.prepare('SELECT id FROM permissions WHERE slug = ?');
  const insertRP = db.prepare(
    'INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?) ON CONFLICT DO NOTHING'
  );
  const tx2 = db.transaction(() => {
    for (const [roleId, slugs] of Object.entries(ROLE_PERMISSIONS)) {
      for (const slug of slugs) {
        const perm = getPermId.get(slug);
        if (perm) insertRP.run(Number(roleId), perm.id);
      }
    }
  });
  tx2();

  // الموظفون الحاليون (بلا role_id بعد) يصيرون "مدير عام" افتراضيًا — يحافظ
  // هذا على وصولهم الكامل الحالي بدل ما ينكسر فجأة بعد هذا التحديث.
  db.exec('UPDATE workers SET role_id = 1 WHERE role_id IS NULL');
}
seedRoles();

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
