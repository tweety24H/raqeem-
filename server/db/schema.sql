-- RaqeemOS core schema (SQLite)
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS workers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  pin_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'employee', -- 'owner' | 'employee' (بوابة صلاحية المالك الكاملة)
  role_id INTEGER REFERENCES roles(id), -- الدور/المنصب (مدير عام | مصمم | عامل طباعة | محاسب...) — يمنح حزمة صلاحيات
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  phone TEXT,
  notes TEXT,
  search_name TEXT, -- نسخة موحّدة (normalizeArabic) من name، تُستخدم للبحث فقط
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
-- ملاحظة: فهرس search_name يُنشأ برمجيًا في db.js بعد التأكد من وجود العمود
-- (migrateCustomersSearchName) — وليس هنا، لأن قاعدة بيانات موجودة مسبقًا
-- تكون بلا هذا العمود وقت ما ينفّذ هذا الملف، فإنشاء الفهرس هنا يفشل عليها.

CREATE TABLE IF NOT EXISTS services (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  unit TEXT NOT NULL DEFAULT 'قطعة', -- فرخ | متر | مل | قطعة
  price REAL NOT NULL DEFAULT 0,      -- IQD per unit
  category TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS stock_categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS stock_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  unit TEXT NOT NULL DEFAULT 'قطعة', -- فرخ | متر | مل | قطعة | كغم | لتر | كارتون | طبقة | رول | (مخصص)
  quantity REAL NOT NULL DEFAULT 0,
  min_quantity REAL NOT NULL DEFAULT 0,
  cost_per_unit REAL NOT NULL DEFAULT 0, -- IQD
  barcode TEXT UNIQUE,
  category TEXT,
  -- الأعمدة التالية أُضيفت لتوحيد موديول المخزون (type/category_id/أسعار/موقع/مورّد/صورة/ملاحظات)
  type TEXT,                -- خام | منتج_تام | مستهلك | قطع_غيار | تغليف
  category_id INTEGER REFERENCES stock_categories(id) ON DELETE SET NULL,
  purchase_price REAL NOT NULL DEFAULT 0,
  sale_price REAL NOT NULL DEFAULT 0,
  location TEXT,
  supplier TEXT,
  image_path TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS stock_movements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  stock_item_id INTEGER NOT NULL REFERENCES stock_items(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'in' | 'out' | 'damage' | 'adjust'
  quantity REAL NOT NULL, -- always positive; sign implied by type
  reason TEXT,
  photo_path TEXT,
  related_order_id INTEGER REFERENCES orders(id) ON DELETE SET NULL,
  worker_id INTEGER REFERENCES workers(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_number TEXT UNIQUE NOT NULL,
  customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  worker_id INTEGER REFERENCES workers(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'جديد', -- جديد | قيد التصميم | قيد الطباعة | جاهز للتسليم | تم التسليم
  subtotal REAL NOT NULL DEFAULT 0,
  discount REAL NOT NULL DEFAULT 0,
  total_price REAL NOT NULL DEFAULT 0,
  payment_type TEXT NOT NULL DEFAULT 'full', -- full | partial | debt
  paid_amount REAL NOT NULL DEFAULT 0,
  due_date TEXT,
  notes TEXT,
  recurring_id INTEGER REFERENCES recurring_orders(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  delivered_at TEXT
);

CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  service_id INTEGER REFERENCES services(id) ON DELETE SET NULL,
  description TEXT,
  quantity REAL NOT NULL DEFAULT 1,
  unit_price REAL NOT NULL DEFAULT 0,
  total_price REAL NOT NULL DEFAULT 0,
  stock_item_id INTEGER REFERENCES stock_items(id) ON DELETE SET NULL,
  stock_qty_used REAL DEFAULT 0,
  design_archive_id INTEGER REFERENCES archive_designs(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  amount REAL NOT NULL,
  method TEXT DEFAULT 'cash',
  note TEXT,
  worker_id INTEGER REFERENCES workers(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS archive_designs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
  order_id INTEGER REFERENCES orders(id) ON DELETE SET NULL,
  name TEXT,
  file_path TEXT NOT NULL,
  thumbnail_path TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS recurring_orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  template_json TEXT NOT NULL, -- serialized order_items template
  interval_days INTEGER NOT NULL,
  next_run_date TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
);

CREATE TABLE IF NOT EXISTS customer_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_name TEXT NOT NULL,
  phone TEXT,
  service_text TEXT,
  notes TEXT,
  file_path TEXT,
  status TEXT NOT NULL DEFAULT 'جديد', -- جديد | تمت المراجعة
  order_id INTEGER REFERENCES orders(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS debt_reminders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  debt_amount REAL NOT NULL,
  worker_id INTEGER REFERENCES workers(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS stock_alerts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  items_count INTEGER NOT NULL,
  items_summary TEXT,
  worker_id INTEGER REFERENCES workers(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS expenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  amount REAL NOT NULL,
  reason TEXT,
  date TEXT NOT NULL DEFAULT (date('now')),
  worker_id INTEGER REFERENCES workers(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS design_files (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  notes TEXT,
  uploaded_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_item ON stock_movements(stock_item_id);
CREATE INDEX IF NOT EXISTS idx_payments_customer ON payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_debt_reminders_customer ON debt_reminders(customer_id);
CREATE INDEX IF NOT EXISTS idx_design_files_order ON design_files(order_id);
CREATE INDEX IF NOT EXISTS idx_design_files_customer ON design_files(customer_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);

-- سجل النشاطات (Activity log) — من فعل ماذا ومتى، لأغراض التدقيق.
CREATE TABLE IF NOT EXISTS activity_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES workers(id) ON DELETE SET NULL,
  action TEXT NOT NULL, -- create | update | delete | login
  model_type TEXT NOT NULL, -- order | customer | inventory | payment | user
  model_id INTEGER,
  description TEXT,
  old_values TEXT, -- JSON nullable
  new_values TEXT, -- JSON nullable
  ip_address TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_model ON activity_logs(model_type, model_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON activity_logs(created_at);

-- الصلاحيات (Permissions) — قائمة ثابتة تُزرع تلقائيًا، وصلاحيات كل موظف
-- (user_permissions) هي المجموعة الممنوحة فعليًا له. المالك (role='owner')
-- يملك كل الصلاحيات ضمنيًا بدون الحاجة لصفوف هنا (انظر checkPermission).
CREATE TABLE IF NOT EXISTS permissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  group_name TEXT -- لتجميع الصلاحيات بالواجهة (الطلبات | الزبائن | الفواتير | ...)
);

-- الأدوار (RBAC) — كل دور حزمة صلاحيات جاهزة تُمنح للموظف عبر workers.role_id.
CREATE TABLE IF NOT EXISTS roles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_system BOOLEAN NOT NULL DEFAULT 0, -- أدوار النظام الافتراضية (لا تُحذف)
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS user_permissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  permission_slug TEXT NOT NULL REFERENCES permissions(slug) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, permission_slug)
);

CREATE INDEX IF NOT EXISTS idx_user_permissions_user ON user_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role_id);
