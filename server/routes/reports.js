const express = require('express');
const db = require('../db/db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// GET /api/reports/profit?from=&to=
router.get('/profit', requireAuth, (req, res) => {
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
router.get('/worker-performance', requireAuth, (req, res) => {
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
