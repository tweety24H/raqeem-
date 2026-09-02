const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db/db');
const { getSecret, requireAuth, requireOwner } = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/login { pin }
router.post('/login', (req, res) => {
  const { pin } = req.body;
  if (!pin || typeof pin !== 'string') {
    return res.status(400).json({ error: 'أدخل رمز PIN' });
  }

  const workers = db.prepare('SELECT * FROM workers WHERE active = 1').all();
  const match = workers.find((w) => bcrypt.compareSync(pin, w.pin_hash));

  if (!match) {
    return res.status(401).json({ error: 'رمز PIN غير صحيح' });
  }

  const token = jwt.sign(
    { workerId: match.id, name: match.name, role: match.role },
    getSecret(),
    { expiresIn: '12h' }
  );

  res.json({
    token,
    worker: { id: match.id, name: match.name, role: match.role },
  });
});

// GET /api/auth/me
router.get('/me', requireAuth, (req, res) => {
  res.json({ worker: req.worker });
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
