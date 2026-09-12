const express = require('express');
const db = require('../db/db');
const { requireAuth, hasEffectivePermission } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');

const router = express.Router();

function profitBetween(fromExpr) {
  const revenue = db
    .prepare(`SELECT COALESCE(SUM(total_price), 0) AS r FROM orders WHERE ${fromExpr}`)
    .get().r;
  const cost = db
    .prepare(
      `SELECT COALESCE(SUM(oi.stock_qty_used * si.cost_per_unit), 0) AS c
       FROM order_items oi
       JOIN orders o ON o.id = oi.order_id
       LEFT JOIN stock_items si ON si.id = oi.stock_item_id
       WHERE ${fromExpr.replace(/created_at/g, 'o.created_at')}`
    )
    .get().c;
  return { revenue, cost, profit: revenue - cost };
}

// GET /api/dashboard/summary
router.get('/summary', requireAuth, authorize('view_dashboard'), (req, res) => {
  const today = profitBetween("date(created_at) = date('now')");
  const month = profitBetween("strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')");

  const lowStock = db
    .prepare('SELECT * FROM stock_items WHERE quantity <= min_quantity ORDER BY name')
    .all();

  const dueSoon = db
    .prepare(
      `SELECT o.*, c.name AS customer_name FROM orders o
       JOIN customers c ON c.id = o.customer_id
       WHERE o.due_date IS NOT NULL AND o.due_date <= date('now', '+2 day') AND o.status != 'تم التسليم'
       ORDER BY o.due_date`
    )
    .all();

  const ordersByStatus = db
    .prepare('SELECT status, COUNT(*) AS count FROM orders GROUP BY status')
    .all();

  const debtRow = db
    .prepare('SELECT COALESCE(SUM(total_price - paid_amount), 0) AS totalDebt FROM orders')
    .get();

  const ordersToday = db
    .prepare("SELECT COUNT(*) AS c FROM orders WHERE date(created_at) = date('now')")
    .get().c;

  // كانت profitToday/profitMonth/totalDebt ترجع لأي موظف عنده view_dashboard
  // بس (كل الأدوار عمليًا) — رغم إنها بيانات مالية حساسة المفروض تنحصر
  // بصلاحية view_profits/view_debts. هذا كان يفشي الأرباح والديون لموظف
  // زي المصمم حتى لو صفحة التقارير نفسها كانت محمية صح.
  const isOwner = req.worker.role === 'owner';
  const canViewProfits = isOwner || hasEffectivePermission(req.worker.workerId, 'view_profits');
  const canViewDebts = isOwner || hasEffectivePermission(req.worker.workerId, 'view_debts');

  res.json({
    profitToday: canViewProfits ? today : null,
    profitMonth: canViewProfits ? month : null,
    totalDebt: canViewDebts ? debtRow.totalDebt : null,
    lowStock,
    dueSoon,
    ordersByStatus,
    ordersToday,
  });
});

module.exports = router;
