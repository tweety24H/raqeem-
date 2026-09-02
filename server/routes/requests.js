// طلبات الزبائن الواردة من صفحة QR المحلية - يراجعها الموظف ويحوّلها لطلب رسمي.
const express = require('express');
const db = require('../db/db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// GET /api/requests ?status=
router.get('/', requireAuth, (req, res) => {
  const { status } = req.query;
  let sql = 'SELECT * FROM customer_requests WHERE 1=1';
  const params = [];
  if (status) {
    sql += ' AND status = ?';
    params.push(status);
  }
  sql += ' ORDER BY created_at DESC';
  res.json({ requests: db.prepare(sql).all(...params) });
});

// PATCH /api/requests/:id { status, order_id }
router.patch('/:id', requireAuth, (req, res) => {
  const { status, order_id } = req.body;
  db.prepare(
    'UPDATE customer_requests SET status = COALESCE(?, status), order_id = COALESCE(?, order_id) WHERE id = ?'
  ).run(status ?? null, order_id ?? null, req.params.id);
  res.json({ ok: true });
});

module.exports = router;
