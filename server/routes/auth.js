const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db/db');
const { getSecret, requireAuth, requireOwner, requireOwnerOrPermission } = require('../middleware/auth');

const router = express.Router();

// حماية بسيطة من محاولات تخمين رمز PIN المتكررة: بعد ٥ محاولات فاشلة من نفس
// العنوان، قفل لمدة دقيقة. مخزّن بالذاكرة (كافي لتطبيق يعمل محلياً على جهاز
// واحد داخل المطبعة، وينظّف نفسه تلقائياً).
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 60 * 1000;
const attemptsByIp = new Map();

function isLocked(ip) {
  const entry = attemptsByIp.get(ip);
  if (!entry) return false;
  if (entry.count < MAX_ATTEMPTS) return false;
  if (Date.now() - entry.lastAttempt > LOCKOUT_MS) {
    attemptsByIp.delete(ip);
    return false;
  }
  return true;
}

function recordFailure(ip) {
  const entry = attemptsByIp.get(ip) || { count: 0, lastAttempt: 0 };
  entry.count += 1;
  entry.lastAttempt = Date.now();
  attemptsByIp.set(ip, entry);
}

function recordSuccess(ip) {
  attemptsByIp.delete(ip);
}

// صلاحيات الموظف الفعلية: المالك يملك كل شيء ضمنيًا ('all')، غيره يحصل على
// قائمة الـ slugs الممنوحة له من user_permissions فقط.
function permissionsFor(worker) {
  if (worker.role === 'owner') return 'all';
  const direct = db
    .prepare('SELECT permission_slug FROM user_permissions WHERE user_id = ?')
    .all(worker.id)
    .map((r) => r.permission_slug);
  const viaRole = worker.role_id
    ? db
        .prepare(
          `SELECT p.slug FROM role_permissions rp
           JOIN permissions p ON p.id = rp.permission_id
           WHERE rp.role_id = ?`
        )
        .all(worker.role_id)
        .map((r) => r.slug)
    : [];
  return Array.from(new Set([...direct, ...viaRole]));
}

// GET /api/auth/login-options — public (no auth), used by the new
// card-picker login screen. Deliberately minimal: name + role only, never
// pin_hash or permissions, so it's safe to expose before authentication.
router.get('/login-options', (req, res) => {
  const workers = db
    .prepare(
      `SELECT w.id, w.name, w.role, r.name AS role_name
       FROM workers w LEFT JOIN roles r ON r.id = w.role_id
       WHERE w.active = 1
       ORDER BY w.created_at`
    )
    .all();
  res.json({
    workers: workers.map((w) => ({
      id: w.id,
      name: w.name,
      roleLabel: w.role === 'owner' ? 'مالك' : w.role_name || 'موظف',
    })),
  });
});

// POST /api/auth/login { pin }
router.post('/login', (req, res) => {
  const { pin } = req.body;
  const ip = req.ip;

  if (isLocked(ip)) {
    return res.status(429).json({ error: 'محاولات كثيرة خاطئة، انتظر دقيقة وحاول مرة أخرى' });
  }

  if (!pin || typeof pin !== 'string') {
    return res.status(400).json({ error: 'أدخل رمز PIN' });
  }

  const workers = db.prepare('SELECT * FROM workers WHERE active = 1').all();
  const match = workers.find((w) => bcrypt.compareSync(pin, w.pin_hash));

  if (!match) {
    recordFailure(ip);
    return res.status(401).json({ error: 'رمز PIN غير صحيح' });
  }

  recordSuccess(ip);

  const token = jwt.sign(
    { workerId: match.id, name: match.name, role: match.role, roleId: match.role_id },
    getSecret(),
    { expiresIn: '12h' }
  );

  const roleRow = match.role_id ? db.prepare('SELECT name FROM roles WHERE id = ?').get(match.role_id) : null;

  res.json({
    token,
    worker: {
      id: match.id,
      name: match.name,
      role: match.role,
      roleId: match.role_id,
      roleName: roleRow ? roleRow.name : null,
      permissions: permissionsFor(match),
    },
  });
});

// دور "كاشير" ماكو مزروع افتراضيًا بجدول roles (دالة seedRoles بملف
// server/db/db.js تزرع بس: مدير عام / مصمم / عامل طباعة / محاسب) — فننشئه
// هنا أول مرة يفعّل بيها أحد كارت الكاشير من شاشة تسجيل الدخول، بنفس منطق
// seedRoles تمامًا (idempotent عبر البحث بالاسم أولاً). دور "مصمم" موجود
// مسبقًا، نجيب معرفه بالاسم فقط بدون أي إنشاء.
function resolveQuickRoleId(role) {
  if (role === 'designer') {
    const row = db.prepare('SELECT id FROM roles WHERE name = ?').get('مصمم');
    return row ? row.id : null;
  }

  if (role === 'cashier') {
    const existing = db.prepare('SELECT id FROM roles WHERE name = ?').get('كاشير');
    if (existing) return existing.id;

    // أول مرة نحتاج فيها دور "كاشير": ننشئه بصلاحيات تناسب شغل الكاشير
    // الفعلي (استلام طلبات، فواتير، متابعة زبائن) — مو "مدير عام" ومو بلا
    // صلاحيات بالمرة.
    const info = db
      .prepare('INSERT INTO roles (name, description, is_system) VALUES (?, ?, 0)')
      .run('كاشير', 'استلام الطلبات والفواتير');
    const roleId = info.lastInsertRowid;

    const CASHIER_SLUGS = [
      'view_orders',
      'create_order',
      'view_customers',
      'create_customer',
      'view_receipts',
      'print_receipts',
      'view_dashboard',
    ];
    const getPermId = db.prepare('SELECT id FROM permissions WHERE slug = ?');
    const insertRP = db.prepare(
      'INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?) ON CONFLICT DO NOTHING'
    );
    for (const slug of CASHIER_SLUGS) {
      const perm = getPermId.get(slug);
      if (perm) insertRP.run(roleId, perm.id);
    }
    return roleId;
  }

  return null;
}

// POST /api/auth/quick-create { name, role: 'designer' | 'cashier', pin } —
// public (بدون تسجيل دخول)، تستخدمه شاشة "من أنت؟" لتفعيل كارتي
// المصمم/الكاشير الافتراضيين (وأي كارت "موظف" مضاف يدويًا بنفس الدورين)
// بحساب حقيقي أول مرة يدخل بيها أحد رمز الـ PIN الصحيح — ترجع نفس شكل
// استجابة /login بالضبط { token, worker } حتى العميل يطبّقها كجلسة فورًا
// بدون طلب /login منفصل بعدها.
//
// ملاحظة أمنية: هذا المسار مقصود يكون بدون تسجيل دخول (نفس فلسفة كارت
// الدخول السريع بشاشة تسجيل الدخول) — أي شخص عنده وصول لهاي الشاشة يكدر
// يفعّل هذولة الكارتين. مناسب لمطبعة صغيرة بجهاز واحد محلي؛ اذا احتجت
// تشديد أكثر بالمستقبل (مثلاً قفله بعد أول استخدام، أو خلف موافقة المالك)
// هذا مكانه بالضبط.
router.post('/quick-create', (req, res) => {
  const { name, role, pin } = req.body;
  const ip = req.ip;

  if (isLocked(ip)) {
    return res.status(429).json({ error: 'محاولات كثيرة خاطئة، انتظر دقيقة وحاول مرة أخرى' });
  }

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'الاسم مطلوب' });
  }
  if (!['designer', 'cashier', 'employee'].includes(role)) {
    return res.status(400).json({ error: 'الدور يجب أن يكون مصمم أو كاشير أو موظف' });
  }
  if (!pin || typeof pin !== 'string' || pin.length < 4) {
    return res.status(400).json({ error: 'رمز PIN (٤ أرقام على الأقل) مطلوب' });
  }

  const workers = db.prepare('SELECT * FROM workers WHERE active = 1').all();
  const clash = workers.some((w) => bcrypt.compareSync(pin, w.pin_hash));
  if (clash) {
    recordFailure(ip);
    return res.status(400).json({ error: 'رمز PIN مستخدم من قبل عامل آخر، اختر رمزًا مختلفًا' });
  }

  recordSuccess(ip);

  const roleId = resolveQuickRoleId(role);
  const pin_hash = bcrypt.hashSync(pin, 8);
  const info = db
    .prepare('INSERT INTO workers (name, pin_hash, role, role_id) VALUES (?, ?, ?, ?)')
    .run(name.trim(), pin_hash, 'employee', roleId);

  const match = db.prepare('SELECT * FROM workers WHERE id = ?').get(info.lastInsertRowid);

  const token = jwt.sign(
    { workerId: match.id, name: match.name, role: match.role, roleId: match.role_id },
    getSecret(),
    { expiresIn: '12h' }
  );

  const roleRow = match.role_id ? db.prepare('SELECT name FROM roles WHERE id = ?').get(match.role_id) : null;

  res.json({
    token,
    worker: {
      id: match.id,
      name: match.name,
      role: match.role,
      roleId: match.role_id,
      roleName: roleRow ? roleRow.name : null,
      permissions: permissionsFor(match),
    },
  });
});

// GET /api/auth/me
router.get('/me', requireAuth, (req, res) => {
  const worker = db.prepare('SELECT * FROM workers WHERE id = ?').get(req.worker.workerId);
  if (!worker) return res.status(404).json({ error: 'المستخدم غير موجود' });
  const roleRow = worker.role_id ? db.prepare('SELECT name FROM roles WHERE id = ?').get(worker.role_id) : null;
  res.json({
    worker: {
      ...req.worker,
      roleId: worker.role_id,
      roleName: roleRow ? roleRow.name : null,
      permissions: permissionsFor(worker),
    },
  });
});

// --- Worker management (owner only) ---

// GET /api/auth/workers
router.get('/workers', requireAuth, requireOwnerOrPermission('manage_users'), (req, res) => {
  const workers = db
    .prepare(
      `SELECT w.id, w.name, w.role, w.role_id, w.active, w.created_at, r.name AS role_name
       FROM workers w LEFT JOIN roles r ON r.id = w.role_id
       ORDER BY w.created_at`
    )
    .all();
  res.json({ workers });
});

// POST /api/auth/workers { name, pin, role }
router.post('/workers', requireAuth, requireOwnerOrPermission('manage_users'), (req, res) => {
  const { name, pin, role, role_id } = req.body;
  if (!name || !pin || pin.length < 4) {
    return res.status(400).json({ error: 'الاسم ورمز PIN (٤ أرقام على الأقل) مطلوبان' });
  }
  const workers = db.prepare('SELECT * FROM workers WHERE active = 1').all();
  const clash = workers.some((w) => bcrypt.compareSync(pin, w.pin_hash));
  if (clash) {
    return res.status(400).json({ error: 'رمز PIN مستخدم من قبل عامل آخر، اختر رمزًا مختلفًا' });
  }
  let roleIdValue = null;
  if (role_id) {
    const roleRow = db.prepare('SELECT id FROM roles WHERE id = ?').get(role_id);
    if (!roleRow) return res.status(400).json({ error: 'الدور المحدد غير موجود' });
    roleIdValue = roleRow.id;
  }
  const pin_hash = bcrypt.hashSync(pin, 8);
  const info = db
    .prepare('INSERT INTO workers (name, pin_hash, role, role_id) VALUES (?, ?, ?, ?)')
    .run(name, pin_hash, role === 'owner' ? 'owner' : 'employee', roleIdValue);
  res.json({ id: info.lastInsertRowid });
});

// PATCH /api/auth/workers/:id { active }
router.patch('/workers/:id', requireAuth, requireOwnerOrPermission('manage_users'), (req, res) => {
  const { active, role_id } = req.body;
  if (active !== undefined) {
    db.prepare('UPDATE workers SET active = ? WHERE id = ?').run(active ? 1 : 0, req.params.id);
  }
  if (role_id !== undefined) {
    const roleRow = role_id ? db.prepare('SELECT id FROM roles WHERE id = ?').get(role_id) : null;
    if (role_id && !roleRow) return res.status(400).json({ error: 'الدور المحدد غير موجود' });
    db.prepare('UPDATE workers SET role_id = ? WHERE id = ?').run(roleRow ? roleRow.id : null, req.params.id);
  }
  res.json({ ok: true });
});

module.exports = router;
