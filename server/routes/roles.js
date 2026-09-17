const express = require('express');
const db = require('../db/db');
const { requireAuth, requireOwnerOrPermission } = require('../middleware/auth');

const router = express.Router();

// إدارة الأدوار حساسة (تتحكم بصلاحيات كل الموظفين) — تتطلب صلاحية المالك
// أو manage_roles تحديدًا (وليس أي صلاحية إدارية عامة).
const canManageRoles = requireOwnerOrPermission('manage_roles');

function rolesWithMeta() {
  const roles = db.prepare('SELECT * FROM roles ORDER BY id').all();
  const permRows = db
    .prepare(
      `SELECT rp.role_id, p.id, p.slug, p.name, p.group_name
       FROM role_permissions rp JOIN permissions p ON p.id = rp.permission_id`
    )
    .all();
  const workerCounts = db
    .prepare('SELECT role_id, COUNT(*) AS c FROM workers WHERE role_id IS NOT NULL GROUP BY role_id')
    .all();
  const countByRole = Object.fromEntries(workerCounts.map((r) => [r.role_id, r.c]));
  const permsByRole = {};
  for (const r of permRows) {
    if (!permsByRole[r.role_id]) permsByRole[r.role_id] = [];
    permsByRole[r.role_id].push({ id: r.id, slug: r.slug, name: r.name, group_name: r.group_name });
  }
  return roles.map((role) => ({
    ...role,
    workerCount: countByRole[role.id] || 0,
    permissions: permsByRole[role.id] || [],
  }));
}

// GET /api/roles — كل الأدوار مع صلاحياتها وعدد الموظفين بكل دور.
router.get('/', requireAuth, canManageRoles, (req, res) => {
  res.json({ roles: rolesWithMeta() });
});

// POST /api/roles { name, description } — دور جديد (غير نظامي، قابل للحذف لاحقًا).
router.post('/', requireAuth, canManageRoles, (req, res) => {
  const { name, description } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'اسم الدور مطلوب' });
  }
  try {
    const info = db
      .prepare('INSERT INTO roles (name, description, is_system) VALUES (?, ?, 0)')
      .run(name.trim(), description || null);
    res.json({ id: info.lastInsertRowid });
  } catch (err) {
    if (String(err.message).includes('UNIQUE')) {
      return res.status(400).json({ error: 'يوجد دور بهذا الاسم مسبقًا' });
    }
    throw err;
  }
});

// PUT /api/roles/:id { name, description } — تعديل اسم/وصف دور.
router.put('/:id', requireAuth, canManageRoles, (req, res) => {
  const role = db.prepare('SELECT * FROM roles WHERE id = ?').get(req.params.id);
  if (!role) return res.status(404).json({ error: 'الدور غير موجود' });
  const { name, description } = req.body;
  db.prepare('UPDATE roles SET name = COALESCE(?, name), description = COALESCE(?, description) WHERE id = ?').run(
    name && name.trim() ? name.trim() : null,
    description ?? null,
    role.id
  );
  res.json({ ok: true });
});

// PUT /api/roles/:id/permissions { permissionIds: [id, ...] } — يستبدل حزمة
// صلاحيات الدور بالكامل (استبدال، لا دمج) — كل موظفي هذا الدور يتأثرون فورًا.
router.put('/:id/permissions', requireAuth, canManageRoles, (req, res) => {
  const role = db.prepare('SELECT * FROM roles WHERE id = ?').get(req.params.id);
  if (!role) return res.status(404).json({ error: 'الدور غير موجود' });
  const { permissionIds } = req.body;
  if (!Array.isArray(permissionIds)) {
    return res.status(400).json({ error: 'قائمة الصلاحيات مطلوبة' });
  }
  const validIds = new Set(db.prepare('SELECT id FROM permissions').all().map((p) => p.id));
  const clean = permissionIds.filter((id) => validIds.has(Number(id))).map(Number);

  const tx = db.transaction(() => {
    db.prepare('DELETE FROM role_permissions WHERE role_id = ?').run(role.id);
    const insert = db.prepare('INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)');
    for (const id of clean) insert.run(role.id, id);
  });
  tx();

  res.json({ ok: true, permissionIds: clean });
});

module.exports = router;
