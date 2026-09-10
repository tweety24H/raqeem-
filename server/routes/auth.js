const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db/db');
const { getSecret, requireAuth, requireOwner } = require('../middleware/auth');

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
  return db
    .prepare('SELECT permission_slug FROM user_permissions WHERE user_id = ?')
    .all(worker.id)
    .map((r) => r.permission_slug);
}

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
    { workerId: match.id, name: match.name, role: match.role },
    getSecret(),
    { expiresIn: '12h' }
  );

  res.json({
    token,
    worker: { id: match.id, name: match.name, role: match.role, permissions: permissionsFor(match) },
  });
});

// GET /api/auth/me
router.get('/me', requireAuth, (req, res) => {
  const worker = db.prepare('SELECT * FROM workers WHERE id = ?').get(req.worker.workerId);
  if (!worker) return res.status(404).json({ error: 'المستخدم غير موجود' });
  res.json({ worker: { ...req.worker, permissions: permissionsFor(worker) } });
});

// --- Worker management (owner only) ---

// GET /api/auth/workers
router.get('/workers', requireAuth, requireOwner, (req, res) => {
  const workers = db
    .prepare('SELECT id, name, role, active, created_at FROM workers ORDER BY created_at')
    .all();
  res.json({ workers });
});

// POST /api/auth/workers { name, pin, role }
router.post('/workers', requireAuth, requireOwner, (req, res) => {
  const { name, pin, role } = req.body;
  if (!name || !pin || pin.length < 4) {
    return res.status(400).json({ error: 'الاسم ورمز PIN (٤ أرقام على الأقل) مطلوبان' });
  }
  const workers = db.prepare('SELECT * FROM workers WHERE active = 1').all();
  const clash = workers.some((w) => bcrypt.compareSync(pin, w.pin_hash));
  if (clash) {
    return res.status(400).json({ error: 'رمز PIN مستخدم من قبل عامل آخر، اختر رمزًا مختلفًا' });
  }
  const pin_hash = bcrypt.hashSync(pin, 8);
  const info = db
    .prepare('INSERT INTO workers (name, pin_hash, role) VALUES (?, ?, ?)')
    .run(name, pin_hash, role === 'owner' ? 'owner' : 'employee');
  res.json({ id: info.lastInsertRowid });
});

// PATCH /api/auth/workers/:id { active }
router.patch('/workers/:id', requireAuth, requireOwner, (req, res) => {
  const { active } = req.body;
  db.prepare('UPDATE workers SET active = ? WHERE id = ?').run(active ? 1 : 0, req.params.id);
  res.json({ ok: true });
});

module.exports = router;
