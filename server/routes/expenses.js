const express = require('express');
const db = require('../db/db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// POST /api/expenses { amount, reason, date? }
router.post('/', requireAuth, (req, res) => {
  const { amount, reason, date } = req.body;
  const amt = Number(amount);
  if (!amt || amt <= 0) return res.status(400).json({ error: 'أدخل مبلغًا صحيحًا' });
  const info = db
    .prepare(
      `INSERT INTO expenses (amount, reason, date, worker_id) VALUES (?, ?, COALESCE(?, date('now')), ?)`
    )
    .run(amt, reason || null, date || null, req.worker.workerId);
  res.json({ id: info.lastInsertRowid });
});

module.exports = router;
