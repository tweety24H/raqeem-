const express = require('express');
const db = require('../db/db');
const { requireAuth } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');

const router = express.Router();

// POST /api/expenses { amount, reason, date? } — كان بلا أي فحص صلاحية (أي
// موظف مسجّل دخول يقدر يسجّل مصروف)، صلحناها بصلاحية manage_expenses.
router.post('/', requireAuth, authorize('manage_expenses'), (req, res) => {
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
