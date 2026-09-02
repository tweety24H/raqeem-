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
