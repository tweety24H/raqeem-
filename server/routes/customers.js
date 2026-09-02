const express = require('express');
const db = require('../db/db');
const { requireAuth } = require('../middleware/auth');
const debtService = require('../services/debtService');
const { debtFor } = debtService;

const router = express.Router();

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
  res.json({ customers: debtService.getOverdueCustomers(days) });
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

// POST /api/customers/:id/remind - يسجّل أن تذكير واتساب أُرسل لهذا الزبون
router.post('/:id/remind', requireAuth, (req, res) => {
  const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id);
  if (!customer) return res.status(404).json({ error: 'الزبون غير موجود' });
  const debt = debtFor(customer.id);
  debtService.logReminder({ customerId: customer.id, debtAmount: debt, workerId: req.worker.workerId });
  res.json({ ok: true });
});

module.exports = router;
