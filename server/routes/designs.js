const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const db = require('../db/db');
const { requireAuth } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');

const router = express.Router();

const dataDir = process.env.RAQEEM_DB_DIR || path.join(__dirname, '..', '..', 'data');
const designsRoot = path.join(dataDir, 'uploads', 'designs');
if (!fs.existsSync(designsRoot)) fs.mkdirSync(designsRoot, { recursive: true });

const ALLOWED_EXT = ['.pdf', '.jpg', '.jpeg', '.png', '.ai', '.psd', '.cdr', '.eps'];
const MAX_SIZE = 20 * 1024 * 1024;

// ملاحظة: الحقول النصية (customer_id, order_id) يجب أن تُرسل في FormData
// قبل حقل الملف حتى تكون متوفرة في req.body عند استدعاء destination().
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const { customer_id, order_id } = req.body;
    if (!customer_id || !order_id) {
      return cb(new Error('customer_id و order_id مطلوبان قبل الملف في الطلب'));
    }
    const dir = path.join(designsRoot, String(customer_id), String(order_id));
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/[/\\]/g, '_');
    cb(null, `${Date.now()}-${safeName}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_SIZE },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXT.includes(ext)) return cb(new Error('نوع الملف غير مدعوم'));
    cb(null, true);
  },
});

// كل مسارات هذا الملف كانت بلا فحص صلاحية (requireAuth بس) — صلحناها بنفس
// صلاحية تعديل الطلب (edit_order) لأن رفع/حذف تصميم هو تعديل فعلي على
// الطلب، وبصلاحية عرض للمسارات اللي بس تجيب/تنزّل ملفات.
// POST /api/designs/upload (multipart: customer_id, order_id, notes?, file)
router.post('/upload', requireAuth, authorize('edit_order'), (req, res) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      const msg = err.code === 'LIMIT_FILE_SIZE' ? 'حجم الملف أكبر من الحد المسموح (20 ميجابايت)' : err.message;
      return res.status(400).json({ error: msg || 'فشل رفع الملف' });
    }
    if (!req.file) return res.status(400).json({ error: 'لم يتم إرفاق ملف' });

    const { customer_id, order_id, notes } = req.body;
    const customer = db.prepare('SELECT id FROM customers WHERE id = ?').get(customer_id);
    const order = db.prepare('SELECT id FROM orders WHERE id = ?').get(order_id);
    if (!customer || !order) {
      fs.unlink(req.file.path, () => {});
      return res.status(400).json({ error: 'الزبون أو الطلب غير موجود' });
    }

    const relPath = path.relative(dataDir, req.file.path).split(path.sep).join('/');
    const fileType = path.extname(req.file.originalname).slice(1).toLowerCase();

    const info = db
      .prepare(
        `INSERT INTO design_files (order_id, customer_id, file_path, file_name, file_type, file_size, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(order_id, customer_id, relPath, req.file.originalname, fileType, req.file.size, notes || null);

    res.json({ id: info.lastInsertRowid, file_path: relPath });
  });
});

// GET /api/designs/order/:orderId
router.get('/order/:orderId', requireAuth, authorize('view_orders'), (req, res) => {
  const files = db
    .prepare('SELECT * FROM design_files WHERE order_id = ? ORDER BY uploaded_at DESC')
    .all(req.params.orderId);
  res.json({ files });
});

// GET /api/designs/customer/:customerId - كل تصاميم الزبون عبر كل طلباته
router.get('/customer/:customerId', requireAuth, authorize('view_customers'), (req, res) => {
  const files = db
    .prepare(
      `SELECT df.*, o.order_number FROM design_files df
       LEFT JOIN orders o ON o.id = df.order_id
       WHERE df.customer_id = ?
       ORDER BY df.order_id DESC, df.uploaded_at DESC`
    )
    .all(req.params.customerId);
  res.json({ files });
});

// GET /api/designs/download/:id
router.get('/download/:id', requireAuth, authorize('view_orders'), (req, res) => {
  const design = db.prepare('SELECT * FROM design_files WHERE id = ?').get(req.params.id);
  if (!design) return res.status(404).json({ error: 'الملف غير موجود' });
  const fullPath = path.join(dataDir, design.file_path);
  if (!fs.existsSync(fullPath)) return res.status(404).json({ error: 'الملف غير موجود على القرص' });
  res.download(fullPath, design.file_name);
});

// DELETE /api/designs/:id
router.delete('/:id', requireAuth, authorize('edit_order'), (req, res) => {
  const design = db.prepare('SELECT * FROM design_files WHERE id = ?').get(req.params.id);
  if (!design) return res.status(404).json({ error: 'الملف غير موجود' });
  db.prepare('DELETE FROM design_files WHERE id = ?').run(req.params.id);
  const fullPath = path.join(dataDir, design.file_path);
  try {
    if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
  } catch (_) {
    /* ignore */
  }
  res.json({ ok: true });
});

module.exports = router;
