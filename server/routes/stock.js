const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const db = require('../db/db');
const { requireAuth } = require('../middleware/auth');
const stockAlertService = require('../services/stockAlertService');

const router = express.Router();

const dataDir = process.env.RAQEEM_DB_DIR || path.join(__dirname, '..', '..', 'data');
const damageDir = path.join(dataDir, 'uploads', 'damage');
if (!fs.existsSync(damageDir)) fs.mkdirSync(damageDir, { recursive: true });
const itemsDir = path.join(dataDir, 'uploads', 'stock-items');
if (!fs.existsSync(itemsDir)) fs.mkdirSync(itemsDir, { recursive: true });

const damageStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, damageDir),
  filename: (req, file, cb) => cb(null, `damage_${Date.now()}${path.extname(file.originalname) || '.jpg'}`),
});
const uploadDamage = multer({ storage: damageStorage, limits: { fileSize: 8 * 1024 * 1024 } });

const itemStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, itemsDir),
  filename: (req, file, cb) => cb(null, `item_${Date.now()}${path.extname(file.originalname) || '.jpg'}`),
});
const uploadItemImage = multer({ storage: itemStorage, limits: { fileSize: 8 * 1024 * 1024 } });

// وحدات القياس المقترحة (تظهر بقائمة منسدلة + خيار "أخرى" لوحدة مخصصة بالواجهة).
// لا نفرض قيدًا صارمًا على القيمة بقاعدة البيانات — أي نص مسموح، حتى العناصر
// القديمة اللي فيها وحدات غير مذكورة هنا (فرخ/مل) تبقى تشتغل بدون مشاكل.
const UNITS = ['قطعة', 'كغم', 'متر', 'لتر', 'كارتون', 'طبقة', 'رول', 'فرخ', 'مل'];

// أنواع المواد
const TYPES = ['خام', 'منتج_تام', 'مستهلك', 'قطع_غيار', 'تغليف'];

// GET /api/stock ?search=&category=&category_id=&type=&unit=&lowOnly=1
router.get('/', requireAuth, (req, res) => {
  const { search, category, category_id, type, unit, lowOnly } = req.query;
  let sql = `
    SELECT si.*, sc.name AS category_name
    FROM stock_items si
    LEFT JOIN stock_categories sc ON sc.id = si.category_id
    WHERE 1=1
  `;
  const params = [];
  if (search) {
    sql += ' AND (si.name LIKE ? OR si.barcode LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }
  if (category) {
    sql += ' AND si.category = ?';
    params.push(category);
  }
  if (category_id) {
    sql += ' AND si.category_id = ?';
    params.push(category_id);
  }
  if (type) {
    sql += ' AND si.type = ?';
    params.push(type);
  }
  if (unit) {
    sql += ' AND si.unit = ?';
    params.push(unit);
  }
  if (lowOnly === '1') sql += ' AND si.quantity <= si.min_quantity';
  sql += ' ORDER BY si.name';
  const items = db.prepare(sql).all(...params);
  res.json({ items, units: UNITS, types: TYPES });
});

// GET /api/stock/categories
router.get('/categories', requireAuth, (req, res) => {
  res.json({ categories: db.prepare('SELECT * FROM stock_categories ORDER BY name').all() });
});

// POST /api/stock/categories { name }
router.post('/categories', requireAuth, (req, res) => {
  const name = (req.body.name || '').trim();
  if (!name) return res.status(400).json({ error: 'اسم التصنيف مطلوب' });
  try {
    const info = db.prepare('INSERT INTO stock_categories (name) VALUES (?)').run(name);
    res.json({ id: info.lastInsertRowid, name });
  } catch (err) {
    if (String(err.message).includes('UNIQUE')) {
      const existing = db.prepare('SELECT * FROM stock_categories WHERE name = ?').get(name);
      return res.json({ id: existing.id, name: existing.name });
    }
    throw err;
  }
});

// GET /api/stock/barcode/:code
router.get('/barcode/:code', requireAuth, (req, res) => {
  const item = db
    .prepare(
      `SELECT si.*, sc.name AS category_name FROM stock_items si
       LEFT JOIN stock_categories sc ON sc.id = si.category_id
       WHERE si.barcode = ?`
    )
    .get(req.params.code);
  if (!item) return res.status(404).json({ error: 'لا يوجد صنف بهذا الباركود' });
  res.json({ item });
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

// POST /api/stock/import  { items: [{ name, unit, quantity, min_quantity, purchase_price, sale_price, barcode, category, type, location, supplier, notes }, ...] }
// استيراد جماعي (من ملف Excel تتم قراءته بالواجهة وتحويله لصفوف JSON): تحديث الصنف
// إذا الباركود موجود مسبقًا، وإلا إضافة صنف جديد. لا يحذف أي بيانات موجودة.
router.post('/import', requireAuth, (req, res) => {
  const rows = Array.isArray(req.body.items) ? req.body.items : [];
  if (!rows.length) return res.status(400).json({ error: 'لا توجد بيانات للاستيراد' });

  let created = 0;
  let updated = 0;
  const errors = [];

  const tx = db.transaction(() => {
    for (const [idx, row] of rows.entries()) {
      const name = String(row.name || '').trim();
      if (!name) {
        errors.push(`صف ${idx + 1}: الاسم مطلوب`);
        continue;
      }
      const unit = String(row.unit || 'قطعة').trim();
      const barcode = row.barcode ? String(row.barcode).trim() : null;
      const purchasePrice = Number(row.purchase_price ?? row.cost_per_unit) || 0;

      let categoryId = null;
      const categoryName = row.category ? String(row.category).trim() : '';
      if (categoryName) {
        const existingCat = db.prepare('SELECT id FROM stock_categories WHERE name = ?').get(categoryName);
        categoryId = existingCat ? existingCat.id : db.prepare('INSERT INTO stock_categories (name) VALUES (?)').run(categoryName).lastInsertRowid;
      }

      const existing = barcode ? db.prepare('SELECT id FROM stock_items WHERE barcode = ?').get(barcode) : null;

      if (existing) {
        // تحديث جزئي فقط عبر COALESCE: أي حقل غير موجود بصف الاستيراد (null هنا)
        // يبقى كما هو بالصنف الحالي — الاستيراد ما يمسح بيانات موجودة لم تُذكر بالملف.
        const hasQuantity = row.quantity !== undefined && row.quantity !== '' && row.quantity !== null;
        const hasMinQty = row.min_quantity !== undefined && row.min_quantity !== '' && row.min_quantity !== null;
        const hasPurchase = (row.purchase_price !== undefined && row.purchase_price !== '' && row.purchase_price !== null) ||
          (row.cost_per_unit !== undefined && row.cost_per_unit !== '' && row.cost_per_unit !== null);
        const hasSale = row.sale_price !== undefined && row.sale_price !== '' && row.sale_price !== null;
        db.prepare(
          `UPDATE stock_items SET
            name = ?, unit = ?,
            quantity = COALESCE(?, quantity), min_quantity = COALESCE(?, min_quantity),
            cost_per_unit = COALESCE(?, cost_per_unit), purchase_price = COALESCE(?, purchase_price), sale_price = COALESCE(?, sale_price),
            category = COALESCE(?, category), category_id = COALESCE(?, category_id),
            type = COALESCE(?, type), location = COALESCE(?, location), supplier = COALESCE(?, supplier), notes = COALESCE(?, notes),
            updated_at = datetime('now')
           WHERE id = ?`
        ).run(
          name,
          unit,
          hasQuantity ? Number(row.quantity) || 0 : null,
          hasMinQty ? Number(row.min_quantity) || 0 : null,
          hasPurchase ? purchasePrice : null,
          hasPurchase ? purchasePrice : null,
          hasSale ? Number(row.sale_price) || 0 : null,
          categoryName || null,
          categoryId,
          row.type || null,
          row.location || null,
          row.supplier || null,
          row.notes || null,
          existing.id
        );
        updated += 1;
      } else {
        db.prepare(
          `INSERT INTO stock_items
            (name, unit, quantity, min_quantity, cost_per_unit, purchase_price, sale_price, barcode, category, category_id, type, location, supplier, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).run(
          name,
          unit,
          Number(row.quantity) || 0,
          Number(row.min_quantity) || 0,
          purchasePrice,
          purchasePrice,
          Number(row.sale_price) || 0,
          barcode,
          categoryName || null,
          categoryId,
          row.type || null,
          row.location || null,
          row.supplier || null,
          row.notes || null
        );
        created += 1;
      }
    }
  });
  tx();

  res.json({ ok: true, created, updated, errors });
});

// GET /api/stock/:id
router.get('/:id', requireAuth, (req, res) => {
  const item = db
    .prepare(
      `SELECT si.*, sc.name AS category_name FROM stock_items si
       LEFT JOIN stock_categories sc ON sc.id = si.category_id
       WHERE si.id = ?`
    )
    .get(req.params.id);
  if (!item) return res.status(404).json({ error: 'الصنف غير موجود' });
  const movements = db
    .prepare('SELECT * FROM stock_movements WHERE stock_item_id = ? ORDER BY created_at DESC LIMIT 100')
    .all(req.params.id);
  res.json({ item, movements });
});

// POST /api/stock  (multipart أو JSON)
// { name, unit, quantity, min_quantity, purchase_price, sale_price, barcode, category, category_id, type, location, supplier, notes, image? }
router.post('/', requireAuth, uploadItemImage.single('image'), (req, res) => {
  const { name, unit, quantity, min_quantity, barcode, category, category_id, type, location, supplier, notes } = req.body;
  const purchase_price = req.body.purchase_price ?? req.body.cost_per_unit;
  const sale_price = req.body.sale_price;

  if (!name || !unit) return res.status(400).json({ error: 'اسم الصنف والوحدة مطلوبان' });
  if (type && !TYPES.includes(type)) return res.status(400).json({ error: 'نوع مادة غير صالح' });

  const imagePath = req.file ? path.join('uploads', 'stock-items', req.file.filename) : null;
  const purchasePriceNum = Number(purchase_price) || 0;

  try {
    const info = db
      .prepare(
        `INSERT INTO stock_items
          (name, unit, quantity, min_quantity, cost_per_unit, purchase_price, sale_price, barcode, category, category_id, type, location, supplier, notes, image_path)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        name,
        unit,
        Number(quantity) || 0,
        Number(min_quantity) || 0,
        purchasePriceNum,
        purchasePriceNum,
        Number(sale_price) || 0,
        barcode || null,
        category || null,
        category_id || null,
        type || null,
        location || null,
        supplier || null,
        notes || null,
        imagePath
      );
    res.json({ id: info.lastInsertRowid });
  } catch (err) {
    if (String(err.message).includes('UNIQUE')) {
      return res.status(400).json({ error: 'الباركود مستخدم من صنف آخر' });
    }
    throw err;
  }
});

// PATCH /api/stock/:id (multipart أو JSON) — تعديل بيانات الصنف الوصفية (مو الكمية مباشرة)
router.patch('/:id', requireAuth, uploadItemImage.single('image'), (req, res) => {
  const { name, unit, min_quantity, barcode, category, category_id, type, location, supplier, notes } = req.body;
  const purchase_price = req.body.purchase_price ?? req.body.cost_per_unit;
  const sale_price = req.body.sale_price;

  const item = db.prepare('SELECT * FROM stock_items WHERE id = ?').get(req.params.id);
  if (!item) return res.status(404).json({ error: 'الصنف غير موجود' });
  if (type && !TYPES.includes(type)) return res.status(400).json({ error: 'نوع مادة غير صالح' });

  const imagePath = req.file ? path.join('uploads', 'stock-items', req.file.filename) : null;
  const purchasePriceNum = purchase_price != null && purchase_price !== '' ? Number(purchase_price) : null;

  db.prepare(
    `UPDATE stock_items SET
      name = COALESCE(?, name),
      unit = COALESCE(?, unit),
      min_quantity = COALESCE(?, min_quantity),
      cost_per_unit = COALESCE(?, cost_per_unit),
      purchase_price = COALESCE(?, purchase_price),
      sale_price = COALESCE(?, sale_price),
      barcode = COALESCE(?, barcode),
      category = COALESCE(?, category),
      category_id = COALESCE(?, category_id),
      type = COALESCE(?, type),
      location = COALESCE(?, location),
      supplier = COALESCE(?, supplier),
      notes = COALESCE(?, notes),
      image_path = COALESCE(?, image_path),
      updated_at = datetime('now')
     WHERE id = ?`
  ).run(
    name ?? null,
    unit ?? null,
    min_quantity != null && min_quantity !== '' ? Number(min_quantity) : null,
    purchasePriceNum,
    purchasePriceNum,
    sale_price != null && sale_price !== '' ? Number(sale_price) : null,
    barcode ?? null,
    category ?? null,
    category_id ?? null,
    type ?? null,
    location ?? null,
    supplier ?? null,
    notes ?? null,
    imagePath,
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
router.post('/:id/damage', requireAuth, uploadDamage.single('photo'), (req, res) => {
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

module.exports = router;
