// نقاط اتصال صفحة الزبون (بدون تسجيل دخول) - تُفتح عبر QR على شبكة الواي فاي المحلية للمطبعة فقط.
const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const db = require('../db/db');
const settingsService = require('../services/settingsService');

const router = express.Router();

const requestsDir = path.join(
  process.env.RAQEEM_DB_DIR || path.join(__dirname, '..', '..', 'data'),
  'uploads',
  'requests'
);
if (!fs.existsSync(requestsDir)) fs.mkdirSync(requestsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, requestsDir),
  filename: (req, file, cb) => cb(null, `req_${Date.now()}${path.extname(file.originalname)}`),
});
const upload = multer({ storage, limits: { fileSize: 25 * 1024 * 1024 } });

// GET /api/public/shop-info
router.get('/shop-info', (req, res) => {
  const settings = settingsService.getAll();
  res.json({
    shop_name: settings.shop_name,
    shop_phone: settings.shop_phone,
    shop_logo_path: settings.shop_logo_path,
  });
});

// GET /api/public/verify/:orderNumber
// تحقق عام من فاتورة عبر رقم الوصل (بدون تسجيل دخول) - يستخدمه رمز QR المطبوع على الفاتورة.
// نكشف فقط الحقول الآمنة للعرض العام: لا نكشف رقم هاتف الزبون أو سجل الدفعات/الديون.
router.get('/verify/:orderNumber', (req, res) => {
  const order = db
    .prepare(
      `SELECT o.id, o.order_number, o.total_price, o.status, o.created_at, c.name AS customer_name
       FROM orders o JOIN customers c ON c.id = o.customer_id
       WHERE o.order_number = ?`
    )
    .get(req.params.orderNumber);
  if (!order) return res.status(404).json({ error: 'رقم الوصل غير موجود' });

  const items = db
    .prepare('SELECT description, quantity, unit_price FROM order_items WHERE order_id = ?')
    .all(order.id);

  const settings = settingsService.getAll();

  res.json({
    order: {
      order_number: order.order_number,
      customer_name: order.customer_name,
      total_price: order.total_price,
      status: order.status,
      created_at: order.created_at,
      items,
    },
    shop: { name: settings.shop_name, logo_path: settings.shop_logo_path },
  });
});

// GET /api/public/services
router.get('/services', (req, res) => {
  const services = db.prepare('SELECT id, name, unit, price, category FROM services WHERE active = 1').all();
  res.json({ services });
});

// POST /api/public/order-request (multipart: customer_name, phone, service_text, notes, file)
router.post('/order-request', upload.single('file'), (req, res) => {
  const { customer_name, phone, service_text, notes } = req.body;
  if (!customer_name || !phone) {
    return res.status(400).json({ error: 'الاسم ورقم الهاتف مطلوبان' });
  }
  const filePath = req.file ? path.join('uploads', 'requests', req.file.filename) : null;
  const info = db
    .prepare(
      `INSERT INTO customer_requests (customer_name, phone, service_text, notes, file_path)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(customer_name, phone, service_text || null, notes || null, filePath);
  res.json({ id: info.lastInsertRowid, message: 'تم استلام طلبكم، سيتم التواصل معكم قريبًا' });
});

module.exports = router;
