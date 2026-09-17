const express = require('express');
const db = require('../db/db');
const { requireAuth, requireOwner } = require('../middleware/auth');

const router = express.Router();

// هاي تجيب كل الخدمات الفعالة (كارت، فلكس، اعلان ضوئي..) بأسعارها - يستخدمها
// فورم إنشاء الطلب حتى يعبي السعر تلقائي لما تختار خدمة
// GET /api/services
router.get('/', requireAuth, (req, res) => {
  const services = db.prepare('SELECT * FROM services WHERE active = 1 ORDER BY category, name').all();
  res.json({ services });
});

// اضافة خدمة جديدة بسعرها - بس المالك يقدر يسوي هذا من صفحة الإعدادات
// POST /api/services (owner only - pricing settings)
router.post('/', requireAuth, requireOwner, (req, res) => {
  const { name, unit, price, category } = req.body;
  if (!name || !unit || price == null) {
    return res.status(400).json({ error: 'اسم الخدمة والوحدة والسعر مطلوبة' });
  }
  const info = db
    .prepare('INSERT INTO services (name, unit, price, category) VALUES (?, ?, ?, ?)')
    .run(name, unit, Number(price), category || null);
  res.json({ id: info.lastInsertRowid });
});

// PATCH /api/services/:id (owner only)
router.patch('/:id', requireAuth, requireOwner, (req, res) => {
  const { name, unit, price, category, active } = req.body;
  db.prepare(
    `UPDATE services SET
      name = COALESCE(?, name),
      unit = COALESCE(?, unit),
      price = COALESCE(?, price),
      category = COALESCE(?, category),
      active = COALESCE(?, active)
     WHERE id = ?`
  ).run(
    name ?? null,
    unit ?? null,
    price != null ? Number(price) : null,
    category ?? null,
    active != null ? (active ? 1 : 0) : null,
    req.params.id
  );
  res.json({ ok: true });
});

module.exports = router;
