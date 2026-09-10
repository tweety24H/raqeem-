const express = require('express');
const db = require('../db/db');
const { requireAuth, requireOwner } = require('../middleware/auth');

const router = express.Router();

// GET /api/permissions - قائمة كل الصلاحيات المتاحة في النظام
router.get('/', requireAuth, requireOwner, (req, res) => {
  const permissions = db.prepare('SELECT * FROM permissions ORDER BY id').all();
  res.json({ permissions });
});

// GET /api/permissions/users - كل الموظفين مع صلاحياتهم الحالية
// (إدارة الصلاحيات نفسها تتطلب صلاحية المالك دائمًا — لا تُمنح لموظف عادي).
router.get('/users', requireAuth, requireOwner, (req, res) => {
  const workers = db.prepare('SELECT id, name, role, active FROM workers ORDER BY name').all();
  const rows = db.prepare('SELECT user_id, permission_slug FROM user_permissions').all();
  const byUser = {};
  for (const r of rows) {
    if (!byUser[r.user_id]) byUser[r.user_id] = [];
    byUser[r.user_id].push(r.permission_slug);
  }
  const users = workers.map((w) => ({
    ...w,
    permissions: w.role === 'owner' ? 'all' : byUser[w.id] || [],
  }));
  res.json({ users });
});

// PUT /api/permissions/users/:id { permissions: [slug, ...] }
// يستبدل مجموعة صلاحيات الموظف بالكامل بالقائمة المُرسلة (استبدال، لا دمج).
router.put('/users/:id', requireAuth, requireOwner, (req, res) => {
  const { permissions } = req.body;
  if (!Array.isArray(permissions)) {
    return res.status(400).json({ error: 'قائمة الصلاحيات مطلوبة' });
  }
  const worker = db.prepare('SELECT * FROM workers WHERE id = ?').get(req.params.id);
  if (!worker) return res.status(404).json({ error: 'الموظف غير موجود' });

  const validSlugs = new Set(db.prepare('SELECT slug FROM permissions').all().map((p) => p.slug));
  const clean = permissions.filter((p) => validSlugs.has(p));

  const tx = db.transaction(() => {
    db.prepare('DELETE FROM user_permissions WHERE user_id = ?').run(worker.id);
    const insert = db.prepare('INSERT INTO user_permissions (user_id, permission_slug) VALUES (?, ?)');
    for (const slug of clean) insert.run(worker.id, slug);
  });
  tx();

  res.json({ ok: true, permissions: clean });
});

module.exports = router;
