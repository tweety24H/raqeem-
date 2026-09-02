const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const db = require('../db/db');
const { requireAuth } = require('../middleware/auth');
const stockAlertService = require('../services/stockAlertService');

const router = express.Router();

const uploadsDir = path.join(
  process.env.RAQEEM_DB_DIR || path.join(__dirname, '..', '..', 'data'),
  'uploads',
  'damage'
);
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `damage_${Date.now()}${ext}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 8 * 1024 * 1024 } });

const UNITS = ['فرخ', 'متر', 'مل', 'قطعة'];

// GET /api/stock  ?search=&category=&lowOnly=1
router.get('/', requireAuth, (req, res) => {
  const { search, category, lowOnly } = req.query;
  let sql = 'SELECT * FROM stock_items WHERE 1=1';
  const params = [];
  if (search) {
    sql += ' AND (name LIKE ? OR barcode LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }
  if (category) {
    sql += ' AND category = ?';
    params.push(category);
  }
  if (lowOnly === '1') {
    sql += ' AND quantity <= min_quantity';
  }
  sql += ' ORDER BY name';
  const items = db.prepare(sql).all(...params);
  res.json({ items, units: UNITS });
});

// GET /api/stock/barcode/:code
router.get('/barcode/:code', requireAuth, (req, res) => {
  const item = db.prepare('SELECT * FROM stock_items WHERE barcode = ?').get(req.params.code);
  if (!item) return res.status(404).json({ error: 'لا يوجد صنف بهذا الباركود' });
  res.json({ item });
});

// GET /api/stock/:id
router.get('/:id', requireAuth, (req, res) => {
  const item = db.prepare('SELECT * FROM stock_items WHERE id = ?').get(req.params.id);
  if (!item) return res.status(404).json({ error: 'الصنف غير موجود' });
  const movements = db
    .prepare('SELECT * FROM stock_movements WHERE stock_item_id = ? ORDER BY created_at DESC LIMIT 100')
    .all(req.params.id);
  res.json({ item, movements });
});

// POST /api/stock  { name, unit, quantity, min_quantity, cost_per_unit, barcode, category }
router.post('/', requireAuth, (req, res) => {
  const { name, unit, quantity, min_quantity, cost_per_unit, barcode, category } = req.body;
  if (!name || !unit) return res.status(400).json({ error: 'اسم الصنف والوحدة مطلوبان' });
  if (!UNITS.includes(unit)) return res.status(400).json({ error: 'وحدة غير صالحة' });
  try {
    const info = db
      .prepare(
        `INSERT INTO stock_items (name, unit, quantity, min_quantity, cost_per_unit, barcode, category)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        name,
        unit,
        Number(quantity) || 0,
        Number(min_quantity) || 0,
        Number(cost_per_unit) || 0,
        barcode || null,
        category || null
      );
    res.json({ id: info.lastInsertRowid });
  } catch (err) {
    if (String(err.message).includes('UNIQUE')) {
      return res.status(400).json({ error: 'الباركود مستخدم من صنف آخر' });
    }
    throw err;
  }
});

// PATCH /api/stock/:id  (edit item fields, not quantity directly)
router.patch('/:id', requireAuth, (req, res) => {
  const { name, unit, min_quantity, cost_per_unit, barcode, category } = req.body;
  const item = db.prepare('SELECT * FROM stock_items WHERE id = ?').get(req.params.id);
  if (!item) return res.status(404).json({ error: 'الصنف غير موجود' });
  db.prepare(
    `UPDATE stock_items SET
      name = COALESCE(?, name),
      unit = COALESCE(?, unit),
      min_quantity = COALESCE(?, min_quantity),
      cost_per_unit = COALESCE(?, cost_per_unit),
      barcode = COALESCE(?, barcode),
      category = COALESCE(?, category),
      updated_at = datetime('now')
     WHERE id = ?`
  ).run(
    name ?? null,
    unit ?? null,
    min_quantity != null ? Number(min_quantity) : null,
    cost_per_unit != null ? Number(cost_per_unit) : null,
    barcode ?? null,
    category ?? null,
    req.params.id
  );
  res.json({ ok: true });
});

// POST /api/stock/:id/movement  { type: in|out|adjust, quantity, reason }
router.post('/:id/movement', requireAuth, (req, res) => {
  const { type, quantity, reason } = req.body;
  const qty = Number(quantity);
  if (!['in', 'out', 'adjust'].includes(type) || !qty || qty < 0) {
    return res.status(400).json({ error: 'بيانات الحركة غير صالحة' });
  }
  const item = db.prepare('SELECT * FROM stock_items WHERE id = ?').get(req.params.id);
  if (!item) return res.status(404).json({ error: 'الصنف غير موجود' });

  const tx = db.transaction(() => {
    let newQty = item.quantity;
    if (type === 'in') newQty += qty;
    else if (type === 'out') newQty -= qty;
    else if (type === 'adjust') newQty = qty;

    if (newQty < 0) throw new Error('الكمية غير كافية في المخزون');

    db.prepare("UPDATE stock_items SET quantity = ?, updated_at = datetime('now') WHERE id = ?").run(
      newQty,
      item.id
    );
    db.prepare(
      `INSERT INTO stock_movements (stock_item_id, type, quantity, reason, worker_id)
       VALUES (?, ?, ?, ?, ?)`
    ).run(item.id, type, qty, reason || null, req.worker.workerId);
  });

  try {
    tx();
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/stock/:id/damage  (multipart form: quantity, reason, photo)
router.post('/:id/damage', requireAuth, upload.single('photo'), (req, res) => {
  const qty = Number(req.body.quantity);
  const reason = req.body.reason || 'تالف';
  if (!qty || qty <= 0) return res.status(400).json({ error: 'أدخل كمية صحيحة' });

  const item = db.prepare('SELECT * FROM stock_items WHERE id = ?').get(req.params.id);
  if (!item) return res.status(404).json({ error: 'الصنف غير موجود' });
  if (qty > item.quantity) return res.status(400).json({ error: 'الكمية أكبر من المتوفر' });

  const photoPath = req.file ? path.join('uploads', 'damage', req.file.filename) : null;

  const tx = db.transaction(() => {
    db.prepare("UPDATE stock_items SET quantity = quantity - ?, updated_at = datetime('now') WHERE id = ?").run(
      qty,
      item.id
    );
    db.prepare(
      `INSERT INTO stock_movements (stock_item_id, type, quantity, reason, photo_path, worker_id)
       VALUES (?, 'damage', ?, ?, ?, ?)`
    ).run(item.id, qty, reason, photoPath, req.worker.workerId);
  });
  tx();

  res.json({ ok: true, photo_path: photoPath });
});

// GET /api/stock/reports/waste?from=&to=
router.get('/reports/waste', requireAuth, (req, res) => {
  const { from, to } = req.query;
  let sql = `
    SELECT sm.id, sm.stock_item_id, si.name AS item_name, si.unit, sm.quantity,
           sm.reason, sm.photo_path, sm.created_at, w.name AS worker_name,
           (sm.quantity * si.cost_per_unit) AS cost_lost
    FROM stock_movements sm
    JOIN stock_items si ON si.id = sm.stock_item_id
    LEFT JOIN workers w ON w.id = sm.worker_id
    WHERE sm.type = 'damage'
  `;
  const params = [];
  if (from) {
    sql += ' AND sm.created_at >= ?';
    params.push(from);
  }
  if (to) {
    sql += ' AND sm.created_at <= ?';
    params.push(to);
  }
  sql += ' ORDER BY sm.created_at DESC';
  const rows = db.prepare(sql).all(...params);
  const totalCost = rows.reduce((s, r) => s + r.cost_lost, 0);
  res.json({ rows, totalCost });
});

// POST /api/stock/alert - يسجّل أن تنبيه واتساب للمخزون المنخفض أُرسل
router.post('/alert', requireAuth, (req, res) => {
  const lowItems = stockAlertService.getLowStockItems();
  stockAlertService.logAlert({
    itemsCount: lowItems.length,
    itemsSummary: lowItems.map((i) => i.name).join('، '),
    workerId: req.worker.workerId,
  });
  res.json({ ok: true });
});

module.exports = router;
