const express = require('express');
const db = require('../db/db');
const { requireAuth } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');

const router = express.Router();

function rangeWhere(range, column) {
  if (range === 'today') return `date(${column}) = date('now')`;
  if (range === 'week') return `date(${column}) >= date('now', '-6 days')`;
  if (range === 'month') return `date(${column}) >= date('now', '-29 days')`;
  return '1=1';
}

// GET /api/reports/summary?range=today|week|month|all
router.get('/summary', requireAuth, authorize('view_reports'), (req, res) => {
  const range = ['today', 'week', 'month', 'all'].includes(req.query.range) ? req.query.range : 'today';
  const orderWhere = rangeWhere(range, 'o.created_at');
  const expenseWhere = rangeWhere(range, 'date');

  // كانت totalRevenue بس (المبلغ المفوتر) — بدون أي رقم "المحصّل فعليًا"
  // بنفس الفترة، ما يخلي التقرير يتحقق منه مباشرة مقابل الدفعات الحقيقية.
  const orderStats = db
    .prepare(
      `SELECT COUNT(*) AS totalOrders, COALESCE(SUM(total_price), 0) AS totalRevenue,
              COALESCE(SUM(paid_amount), 0) AS totalCollected
       FROM orders o WHERE ${orderWhere}`
    )
    .get();
  const totalExpenses = db.prepare(`SELECT COALESCE(SUM(amount), 0) AS v FROM expenses WHERE ${expenseWhere}`).get().v;
  const netProfit = orderStats.totalRevenue - totalExpenses;

  // الديون والمخزون المنخفض حالة لحظية، غير مرتبطة بالفترة المختارة
  const totalDebts = db.prepare('SELECT COALESCE(SUM(total_price - paid_amount), 0) AS v FROM orders').get().v;
  const lowStockCount = db.prepare('SELECT COUNT(*) AS c FROM stock_items WHERE quantity <= min_quantity').get().c;

  const topCustomers = db
    .prepare(
      `SELECT c.id, c.name, COUNT(o.id) AS ordersCount, COALESCE(SUM(o.total_price), 0) AS revenue
       FROM orders o JOIN customers c ON c.id = o.customer_id
       WHERE ${orderWhere}
       GROUP BY c.id ORDER BY revenue DESC LIMIT 5`
    )
    .all();

  const topStockItems = db
    .prepare(
      `SELECT si.id, si.name, si.unit, COALESCE(SUM(oi.stock_qty_used), 0) AS usedQty
       FROM order_items oi
       JOIN orders o ON o.id = oi.order_id
       JOIN stock_items si ON si.id = oi.stock_item_id
       WHERE ${orderWhere} AND oi.stock_qty_used > 0
       GROUP BY si.id ORDER BY usedQty DESC LIMIT 5`
    )
    .all();

  const recentExpenses = db
    .prepare(`SELECT * FROM expenses WHERE ${expenseWhere} ORDER BY date DESC, id DESC LIMIT 10`)
    .all();

  res.json({
    range,
    totalOrders: orderStats.totalOrders,
    totalRevenue: orderStats.totalRevenue,
    totalCollected: orderStats.totalCollected,
    totalRemaining: orderStats.totalRevenue - orderStats.totalCollected,
    totalExpenses,
    netProfit,
    totalDebts,
    lowStockCount,
    topCustomers,
    topStockItems,
    recentExpenses,
  });
});

// GET /api/reports/daily?days=30 - الإيراد والمصاريف يوميًا لآخر N يوم (لرسم بياني)
router.get('/daily', requireAuth, authorize('view_reports'), (req, res) => {
  const days = Math.min(Math.max(Number(req.query.days) || 30, 1), 365);

  const revenueRows = db
    .prepare(
      `SELECT date(created_at) AS d, COALESCE(SUM(total_price), 0) AS revenue
       FROM orders WHERE date(created_at) >= date('now', ?)
       GROUP BY d`
    )
    .all(`-${days - 1} days`);
  const expenseRows = db
    .prepare(
      `SELECT date AS d, COALESCE(SUM(amount), 0) AS expenses
       FROM expenses WHERE date(date) >= date('now', ?)
       GROUP BY d`
    )
    .all(`-${days - 1} days`);

  const revMap = Object.fromEntries(revenueRows.map((r) => [r.d, r.revenue]));
  const expMap = Object.fromEntries(expenseRows.map((r) => [r.d, r.expenses]));

  const result = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
    result.push({ date: d, revenue: revMap[d] || 0, expenses: expMap[d] || 0 });
  }

  res.json({ days: result });
});

// GET /api/reports/profit?from=&to=
router.get('/profit', requireAuth, authorize('view_profits'), (req, res) => {
  const { from, to } = req.query;
  let where = '1=1';
  const params = [];
  if (from) {
    where += ' AND date(o.created_at) >= date(?)';
    params.push(from);
  }
  if (to) {
    where += ' AND date(o.created_at) <= date(?)';
    params.push(to);
  }

  const byService = db
    .prepare(
      `SELECT COALESCE(s.name, oi.description) AS service_name,
              SUM(oi.total_price) AS revenue,
              SUM(COALESCE(oi.stock_qty_used, 0) * COALESCE(si.cost_per_unit, 0)) AS cost,
              SUM(oi.total_price) - SUM(COALESCE(oi.stock_qty_used, 0) * COALESCE(si.cost_per_unit, 0)) AS profit,
              SUM(oi.quantity) AS quantity
       FROM order_items oi
       JOIN orders o ON o.id = oi.order_id
       LEFT JOIN services s ON s.id = oi.service_id
       LEFT JOIN stock_items si ON si.id = oi.stock_item_id
       WHERE ${where}
       GROUP BY service_name
       ORDER BY profit DESC`
    )
    .all(...params);

  const totals = byService.reduce(
    (acc, r) => ({
      revenue: acc.revenue + r.revenue,
      cost: acc.cost + r.cost,
      profit: acc.profit + r.profit,
    }),
    { revenue: 0, cost: 0, profit: 0 }
  );

  res.json({ byService, totals });
});

// GET /api/reports/worker-performance?from=&to=
router.get('/worker-performance', requireAuth, authorize('view_reports'), (req, res) => {
  const { from, to } = req.query;
  let where = '1=1';
  const params = [];
  if (from) {
    where += ' AND date(o.created_at) >= date(?)';
    params.push(from);
  }
  if (to) {
    where += ' AND date(o.created_at) <= date(?)';
    params.push(to);
  }

  const orderStats = db
    .prepare(
      `SELECT w.id, w.name, COUNT(o.id) AS orders_count, COALESCE(SUM(o.total_price), 0) AS revenue
       FROM workers w
       LEFT JOIN orders o ON o.worker_id = w.id AND ${where}
       GROUP BY w.id ORDER BY orders_count DESC`
    )
    .all(...params);

  let damageWhere = "sm.type = 'damage'";
  const damageParams = [];
  if (from) {
    damageWhere += ' AND date(sm.created_at) >= date(?)';
    damageParams.push(from);
  }
  if (to) {
    damageWhere += ' AND date(sm.created_at) <= date(?)';
    damageParams.push(to);
  }

  const damageStats = db
    .prepare(
      `SELECT w.id, w.name, COUNT(sm.id) AS damage_events,
              COALESCE(SUM(sm.quantity * si.cost_per_unit), 0) AS damage_cost
       FROM stock_movements sm
       JOIN stock_items si ON si.id = sm.stock_item_id
       LEFT JOIN workers w ON w.id = sm.worker_id
       WHERE ${damageWhere}
       GROUP BY w.id`
    )
    .all(...damageParams);

  const damageByWorker = Object.fromEntries(damageStats.filter((d) => d.id).map((d) => [d.id, d]));

  const merged = orderStats.map((w) => ({
    ...w,
    damage_events: damageByWorker[w.id]?.damage_events || 0,
    damage_cost: damageByWorker[w.id]?.damage_cost || 0,
  }));

  res.json({ workers: merged });
});

module.exports = router;
