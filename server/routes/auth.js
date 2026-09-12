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
  // نحول اسم الدور العربي (مصمم/كاشير) إلى slug إنجليزي ثابت حتى الواجهة
  // تقدر تلوّن الكارت وتفحص "هل عنده حساب مصمم/كاشير فعلي" بدون ما تعتمد
  // على النص العربي نفسه (اللي ممكن يتغير لاحقًا من صفحة الإعدادات).
  function slugForRole(w) {
    if (w.role === 'owner') return 'owner';
    if (w.role_name === 'مصمم') return 'designer';
    if (w.role_name === 'كاشير') return 'cashier';
    return 'employee';
  }

  res.json({
    workers: workers.map((w) => ({
      id: w.id,
      name: w.name,
      role: slugForRole(w),
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
