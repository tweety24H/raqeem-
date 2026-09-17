// طلبات الزبائن الواردة من صفحة QR المحلية - يراجعها الموظف ويحوّلها لطلب رسمي.
const express = require('express');
const path = require('path');
const fs = require('fs');
const db = require('../db/db');
const { requireAuth } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');
const { normalizeArabic } = require('../utils/arabicSearch');

const router = express.Router();

const dataDir = process.env.RAQEEM_DB_DIR || path.join(__dirname, '..', '..', 'data');

// كانت بلا فحص صلاحية رغم إن الواجهة تخفي رابط "طلبات الزبائن" عن أي دور
// بدون view_customers — صلحناها حتى الحماية الفعلية تطابق الواجهة.
// GET /api/requests ?status=
router.get('/', requireAuth, authorize('view_customers'), (req, res) => {
  const { status } = req.query;
  let sql = 'SELECT * FROM customer_requests WHERE 1=1';
  const params = [];
  if (status) {
    sql += ' AND status = ?';
    params.push(status);
  }
  sql += ' ORDER BY created_at DESC';
  res.json({ requests: db.prepare(sql).all(...params) });
});

// PATCH /api/requests/:id { status, order_id, reject_reason }
router.patch('/:id', requireAuth, authorize('view_customers'), (req, res) => {
  const { status, order_id, reject_reason } = req.body;
  db.prepare(
    `UPDATE customer_requests
     SET status = COALESCE(?, status), order_id = COALESCE(?, order_id), reject_reason = COALESCE(?, reject_reason)
     WHERE id = ?`
  ).run(status ?? null, order_id ?? null, reject_reason ?? null, req.params.id);
  res.json({ ok: true });
});

// GET /api/requests/download/:id — ينزّل ملف التصميم المرفق باسم مرتب
// design_<اسم الزبون>_<رقم الطلب الوارد>.<امتداد> بدل الاسم العشوائي المخزّن على القرص.
router.get('/download/:id', requireAuth, authorize('view_customers'), (req, res) => {
  const request = db.prepare('SELECT * FROM customer_requests WHERE id = ?').get(req.params.id);
  if (!request || !request.file_path) return res.status(404).json({ error: 'الملف غير موجود' });
  const fullPath = path.join(dataDir, request.file_path);
  if (!fs.existsSync(fullPath)) return res.status(404).json({ error: 'الملف غير موجود على القرص' });
  const ext = path.extname(request.file_path) || '.jpg';
  const safeName = normalizeArabic(request.customer_name || 'زبون').replace(/\s+/g, '_') || 'design';
  res.download(fullPath, `design_${safeName}_${request.id}${ext}`);
});

// هاي تسوي رقم طلب جديد بنفس شكل orders.js (RQ + التاريخ + رقم متسلسل
// لهذا اليوم) — منسوخة محليًا بدل استيرادها لأن orders.js ما يصدّرها.
function generateOrderNumber() {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const countToday = db.prepare("SELECT COUNT(*) AS c FROM orders WHERE date(created_at) = date('now')").get().c;
  return `RQ${datePart}-${String(countToday + 1).padStart(4, '0')}`;
}

// POST /api/requests/:id/convert — يحوّل طلبًا واردًا (بعد قبوله) الى طلب
// حقيقي بجدول orders: يبحث عن زبون بنفس رقم الهاتف أو ينشئ واحدًا جديدًا،
// ويضيف عنصر طلب واحد من الخدمة/الكمية/المواصفات المتوفرة. السعر يبقى صفرًا
// مبدئيًا (والدفع "دين") لأن الموظف لازم يراجع وسعّر التصميم بنفسه قبل
// التسليم — هذا طلب مسودة جاهز للتعديل، مو طلب نهائي مسعّر تلقائيًا.
router.post('/:id/convert', requireAuth, authorize('create_order'), (req, res) => {
  const request = db.prepare('SELECT * FROM customer_requests WHERE id = ?').get(req.params.id);
  if (!request) return res.status(404).json({ error: 'الطلب الوارد غير موجود' });
  if (request.order_id) return res.status(400).json({ error: 'تم تحويل هذا الطلب مسبقًا' });

  const tx = db.transaction(() => {
    let customer = request.phone
      ? db.prepare('SELECT * FROM customers WHERE phone = ?').get(request.phone)
      : null;
    if (!customer) {
      const info = db
        .prepare('INSERT INTO customers (name, phone, search_name) VALUES (?, ?, ?)')
        .run(request.customer_name, request.phone || null, normalizeArabic(request.customer_name));
      customer = { id: info.lastInsertRowid };
    }

    const orderNumber = generateOrderNumber();
    const description = request.service_text || 'من طلب QR';
    const quantity = request.quantity || 1;
    const notesParts = [request.specs, request.notes].filter(Boolean);

    const orderInfo = db
      .prepare(
        `INSERT INTO orders (order_number, customer_id, worker_id, status, subtotal, discount, total_price, payment_type, paid_amount, notes)
         VALUES (?, ?, ?, 'جديد', 0, 0, 0, 'debt', 0, ?)`
      )
      .run(orderNumber, customer.id, req.worker.workerId, notesParts.join(' — ') || null);

    db.prepare(
      `INSERT INTO order_items (order_id, service_id, description, quantity, unit_price, total_price)
       VALUES (?, ?, ?, ?, 0, 0)`
    ).run(orderInfo.lastInsertRowid, request.service_id || null, description, quantity);

    db.prepare('UPDATE customer_requests SET order_id = ? WHERE id = ?').run(orderInfo.lastInsertRowid, request.id);

    return { orderId: orderInfo.lastInsertRowid, orderNumber };
  });

  try {
    const result = tx();
    res.json({ ok: true, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
