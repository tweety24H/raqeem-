const express = require('express');
const db = require('../db/db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

function debtFor(customerId) {
  const totals = db
    .prepare(
      `SELECT COALESCE(SUM(total_price), 0) AS totalOrders,
              COALESCE(SUM(paid_amount), 0) AS totalPaid
       FROM orders WHERE customer_id = ?`
    )
    .get(customerId);
  return totals.totalOrders - totals.totalPaid;
}

// GET /api/customers ?search=
router.get('/', requireAuth, (req, res) => {
  const { search } = req.query;
  let sql = 'SELECT * FROM customers WHERE 1=1';
  const params = [];
  if (search) {
    sql += ' AND (name LIKE ? OR phone LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }
  sql += ' ORDER BY name';
  const customers = db.prepare(sql).all(...params);
  const withDebt = customers.map((c) => ({ ...c, debt: debtFor(c.id) }));
  res.json({ customers: withDebt });
});

// GET /api/customers/overdue?days=45
router.get('/overdue', requireAuth, (req, res) => {
  const days = Number(req.query.days) || 30;
  const customers = db.prepare('SELECT * FROM customers').all();
  const result = [];
  for (const c of customers) {
    const debt = debtFor(c.id);
    if (debt <= 0) continue;
    const lastPayment = db
      .prepare('SELECT MAX(created_at) AS d FROM payments WHERE customer_id = ?')
      .get(c.id).d;
    const lastOrder = db
      .prepare('SELECT MAX(created_at) AS d FROM orders WHERE customer_id = ?')
      .get(c.id).d;
    const lastActivity = [lastPayment, lastOrder].filter(Boolean).sort().pop();
    if (!lastActivity) continue;
    const ageDays = Math.floor((Date.now() - new Date(lastActivity).getTime()) / 86400000);
    if (ageDays >= days) {
      result.push({ ...c, debt, daysSinceActivity: ageDays });
    }
  }
  result.sort((a, b) => b.daysSinceActivity - a.daysSinceActivity);
  res.json({ customers: result });
});

// GET /api/customers/:id
router.get('/:id', requireAuth, (req, res) => {
  const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id);
  if (!customer) return res.status(404).json({ error: 'الزبون غير موجود' });
  const orders = db
    .prepare('SELECT * FROM orders WHERE customer_id = ? ORDER BY created_at DESC')
    .all(req.params.id);
  const payments = db
    .prepare('SELECT * FROM payments WHERE customer_id = ? ORDER BY created_at DESC')
    .all(req.params.id);
  res.json({ customer: { ...customer, debt: debtFor(customer.id) }, orders, payments });
});

// POST /api/customers { name, phone, notes }
router.post('/', requireAuth, (req, res) => {
  const { name, phone, notes } = req.body;
  if (!name) return res.status(400).json({ error: 'اسم الزبون مطلوب' });
  const info = db
    .prepare('INSERT INTO customers (name, phone, notes) VALUES (?, ?, ?)')
    .run(name, phone || null, notes || null);
  res.json({ id: info.lastInsertRowid });
});

// PATCH /api/customers/:id
router.patch('/:id', requireAuth, (req, res) => {
  const { name, phone, notes } = req.body;
  db.prepare(
    'UPDATE customers SET name = COALESCE(?, name), phone = COALESCE(?, phone), notes = COALESCE(?, notes) WHERE id = ?'
  ).run(name ?? null, phone ?? null, notes ?? null, req.params.id);
  res.json({ ok: true });
});

module.exports = router;
