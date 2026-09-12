const express = require('express');
const QRCode = require('qrcode');
const db = require('../db/db');
const { requireAuth } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');
const settingsService = require('../services/settingsService');
const whatsappService = require('../services/whatsappService');
const { normalizeArabic } = require('../utils/arabicSearch');
const { logActivity } = require('../services/activityLogService');

const router = express.Router();

const STATUSES = ['جديد', 'قيد التصميم', 'قيد الطباعة', 'جاهز للتسليم', 'تم التسليم'];

// هاي تسوي رقم طلب جديد بالشكل RQ + التاريخ + رقم متسلسل لهذا اليوم
// مثلاً RQ20260912-0005 يعني خامس طلب اليوم
function generateOrderNumber() {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const countToday = db
    .prepare("SELECT COUNT(*) AS c FROM orders WHERE date(created_at) = date('now')")
    .get().c;
  return `RQ${datePart}-${String(countToday + 1).padStart(4, '0')}`;
}

// هاي تحسب دين الزبون - تجمع كل طلباته وتطرح منها اللي دفعه، والباقي هو الدين
function debtFor(customerId) {
  const totals = db
    .prepare(
      `SELECT COALESCE(SUM(total_price), 0) AS totalOrders, COALESCE(SUM(paid_amount), 0) AS totalPaid
       FROM orders WHERE customer_id = ?`
    )
    .get(customerId);
  return totals.totalOrders - totals.totalPaid;
}

// GET /api/orders ?status=&customer_id=&search=&dueSoon=1
router.get('/', requireAuth, authorize('view_orders'), (req, res) => {
  const { status, customer_id, search, dueSoon } = req.query;
  let sql = `
    SELECT o.*, c.name AS customer_name, c.phone AS customer_phone,
      (SELECT description FROM order_items WHERE order_id = o.id ORDER BY id LIMIT 1) AS item_summary
    FROM orders o JOIN customers c ON c.id = o.customer_id
    WHERE 1=1
  `;
  const params = [];
  if (status) {
    sql += ' AND o.status = ?';
    params.push(status);
  }
  if (customer_id) {
    sql += ' AND o.customer_id = ?';
    params.push(customer_id);
  }
  if (search) {
    // مطابقة اسم الزبون تتم على search_name الموحّد (أحمد/احمد/أحمد كلها متطابقة)،
    // بينما رقم الطلب يبقى مطابقة نصية عادية.
    sql += ' AND (o.order_number LIKE ? OR c.search_name LIKE ?)';
    params.push(`%${search}%`, `%${normalizeArabic(search)}%`);
  }
  if (dueSoon === '1') {
    sql += " AND o.due_date IS NOT NULL AND o.due_date <= date('now', '+2 day') AND o.status != 'تم التسليم'";
  }
  sql += ' ORDER BY o.created_at DESC';
  const orders = db.prepare(sql).all(...params);
  res.json({ orders, statuses: STATUSES });
});

// GET /api/orders/:id
router.get('/:id', requireAuth, authorize('view_orders'), (req, res) => {
  const order = db
    .prepare(
      `SELECT o.*, c.name AS customer_name, c.phone AS customer_phone
       FROM orders o JOIN customers c ON c.id = o.customer_id WHERE o.id = ?`
    )
    .get(req.params.id);
  if (!order) return res.status(404).json({ error: 'الطلب غير موجود' });
  const items = db
    .prepare(
      `SELECT oi.*, s.name AS service_name FROM order_items oi
       LEFT JOIN services s ON s.id = oi.service_id WHERE oi.order_id = ?`
    )
    .all(req.params.id);
  const payments = db
    .prepare('SELECT * FROM payments WHERE order_id = ? ORDER BY created_at')
    .all(req.params.id);
  res.json({ order, items, payments });
});

// خصم بمرحلتين قابلتين للدمج: خصم أساسي (discount_type/discount_value) يُطبَّق
// على الإجمالي الفرعي، ثم خصم إضافي اختياري (discount_after_type/discount_after_value)
// يُطبَّق على الباقي بعده — كل مرحلة يمكن أن تكون نسبة % أو مبلغ ثابت بالدينار
// بشكل مستقل عن الأخرى. النسبة تُقيَّد بين 0-100 لمنع خصم بالسالب أو أكبر من الكل.
// هاي الدالة تحسب مبلغ خصم وحدة - اذا نسبة % تضرب بالمبلغ الأساسي،
// واذا مبلغ ثابت بس تاخذه زي ما هو (مع تقييد النسبة بين 0 و100 حتى ما تنكسر)
function computeDiscountStage(base, type, value) {
  const v = Number(value) || 0;
  if (type === 'percent') return base * (Math.min(Math.max(v, 0), 100) / 100);
  return Math.max(v, 0);
}

// هاي تجمع الخصمين سوا - الخصم الأول يطبق على المجموع، وبعده الخصم
// الإضافي (اذا موجود) يطبق على الباقي بعد الخصم الأول، مو على المجموع الأصلي
function computeOrderTotals(subtotal, body) {
  const discountType = body.discount_type === 'percent' ? 'percent' : 'fixed';
  const discountValue = Number(body.discount_value) || 0;
  const discountAfterType = body.discount_after_type === 'percent' ? 'percent' : 'fixed';
  const discountAfterValue = Number(body.discount_after_value) || 0;

  const beforeAmount = computeDiscountStage(subtotal, discountType, discountValue);
  const afterBase = Math.max(subtotal - beforeAmount, 0);
  const afterAmount = computeDiscountStage(afterBase, discountAfterType, discountAfterValue);
  const totalDiscount = beforeAmount + afterAmount;
  const total = Math.max(subtotal - totalDiscount, 0);

  return { discountType, discountValue, discountAfterType, discountAfterValue, totalDiscount, total };
}

// هذا الراوت الرئيسي لإنشاء طلب جديد - ياخذ الزبون والعناصر ويحسب المجموع
// والخصم، يخصم من المخزون اذا محدد، ويسجل الدفعة اذا كو
// POST /api/orders
router.post('/', requireAuth, authorize('create_order'), (req, res) => {
  const { customer_id, items, payment_type, paid_amount, due_date, notes, recurring_interval_days } = req.body;

  if (!customer_id || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'الزبون وعنصر واحد على الأقل مطلوبان' });
  }
  if (!['full', 'partial', 'debt'].includes(payment_type)) {
    return res.status(400).json({ error: 'طريقة الدفع غير صالحة' });
  }

  const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(customer_id);
  if (!customer) return res.status(404).json({ error: 'الزبون غير موجود' });

  const subtotal = items.reduce((s, it) => s + Number(it.quantity) * Number(it.unit_price), 0);
  // Backward compat: a caller still sending the old flat `discount` (IQD) field
  // with no discount_value keeps working exactly as before.
  const legacyDiscount = Number(req.body.discount) || 0;
  const { discountType, discountValue, discountAfterType, discountAfterValue, totalDiscount, total } =
    computeOrderTotals(subtotal, req.body.discount_value != null ? req.body : { discount_value: legacyDiscount });
  const disc = totalDiscount;

  let paid;
  if (payment_type === 'full') paid = total;
  else if (payment_type === 'debt') paid = 0;
  else paid = Math.min(Math.max(Number(paid_amount) || 0, 0), total);

  const tx = db.transaction(() => {
    const orderNumber = generateOrderNumber();
    const info = db
      .prepare(
        `INSERT INTO orders (order_number, customer_id, worker_id, status, subtotal, discount, discount_type, discount_value, discount_after_type, discount_after_value, total_price, payment_type, paid_amount, due_date, notes)
         VALUES (?, ?, ?, 'جديد', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        orderNumber,
        customer_id,
        req.worker.workerId,
        subtotal,
        disc,
        discountType,
        discountValue,
        discountAfterType,
        discountAfterValue,
        total,
        payment_type,
        paid,
        due_date || null,
        notes || null
      );

    const orderId = info.lastInsertRowid;

    const insertItem = db.prepare(
      `INSERT INTO order_items (order_id, service_id, description, quantity, unit_price, total_price, stock_item_id, stock_qty_used)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    );
    const deductStock = db.prepare(
      "UPDATE stock_items SET quantity = quantity - ?, updated_at = datetime('now') WHERE id = ?"
    );
    const insertMovement = db.prepare(
      `INSERT INTO stock_movements (stock_item_id, type, quantity, reason, related_order_id, worker_id)
       VALUES (?, 'out', ?, ?, ?, ?)`
    );

    for (const it of items) {
      const lineTotal = Number(it.quantity) * Number(it.unit_price);
      insertItem.run(
        orderId,
        it.service_id || null,
        it.description || null,
        Number(it.quantity),
        Number(it.unit_price),
        lineTotal,
        it.stock_item_id || null,
        it.stock_qty_used ? Number(it.stock_qty_used) : 0
      );

      if (it.stock_item_id && it.stock_qty_used) {
        const stockItem = db.prepare('SELECT * FROM stock_items WHERE id = ?').get(it.stock_item_id);
        if (!stockItem) throw new Error(`صنف مخزون غير موجود: ${it.stock_item_id}`);
        if (stockItem.quantity < Number(it.stock_qty_used)) {
          throw new Error(`الكمية غير كافية في المخزون للصنف: ${stockItem.name}`);
        }
        deductStock.run(Number(it.stock_qty_used), it.stock_item_id);
        insertMovement.run(it.stock_item_id, Number(it.stock_qty_used), 'استهلاك طلب', orderId, req.worker.workerId);
      }
    }

    if (paid > 0) {
      db.prepare(
        `INSERT INTO payments (order_id, customer_id, amount, method, worker_id) VALUES (?, ?, ?, 'cash', ?)`
      ).run(orderId, customer_id, paid, req.worker.workerId);
    }

    // نقاط ولاء: نقطة واحدة لكل 1000 د.ع من قيمة الطلب الكلية.
    const earnedPoints = Math.floor(total / 1000);
    if (earnedPoints > 0) {
      db.prepare('UPDATE customers SET points = points + ? WHERE id = ?').run(earnedPoints, customer_id);
    }

    // اذا العميل حدد "طلب متكرر"، نسجل هسه بس موعد أول تكرار جاي (بعد كم
    // يوم يحددها) - اللي فعليًا يسوي الطلب الجديد بيوم استحقاقه هو
    // recurringOrdersService.js، يشتغل مرة باليوم ويفحص كل التكرارات المستحقة
    if (recurring_interval_days && Number(recurring_interval_days) > 0) {
      const nextDate = new Date(Date.now() + Number(recurring_interval_days) * 86400000)
        .toISOString()
        .slice(0, 10);
      db.prepare(
        `INSERT INTO recurring_orders (customer_id, template_json, interval_days, next_run_date)
         VALUES (?, ?, ?, ?)`
      ).run(customer_id, JSON.stringify(items), Number(recurring_interval_days), nextDate);
    }

    return { orderId, orderNumber };
  });

  try {
    const result = tx();
    logActivity({
      userId: req.worker.workerId,
      action: 'create',
      modelType: 'order',
      modelId: result.orderId,
      description: `${req.worker.name} أنشأ طلبًا جديدًا #${result.orderNumber} للزبون ${customer.name}`,
      newValues: { order_number: result.orderNumber, customer_id, total, payment_type, paid },
      req,
    });
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PATCH /api/orders/:id/status { status }
router.patch('/:id/status', requireAuth, authorize('update_order_status'), (req, res) => {
  const { status } = req.body;
  if (!STATUSES.includes(status)) return res.status(400).json({ error: 'حالة غير صالحة' });

  const order = db
    .prepare(`SELECT o.*, c.name AS customer_name, c.phone AS customer_phone FROM orders o JOIN customers c ON c.id = o.customer_id WHERE o.id = ?`)
    .get(req.params.id);
  if (!order) return res.status(404).json({ error: 'الطلب غير موجود' });

  if (status === 'تم التسليم') {
    db.prepare("UPDATE orders SET status = ?, delivered_at = datetime('now') WHERE id = ?").run(status, order.id);
  } else {
    db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, order.id);
  }

  if (status === 'جاهز للتسليم') {
    whatsappService.notifyReady(order).catch((e) => console.error('whatsapp notify failed:', e.message));
  }

  logActivity({
    userId: req.worker.workerId,
    action: 'update',
    modelType: 'order',
    modelId: order.id,
    description: `${req.worker.name} غيّر حالة الطلب #${order.order_number} إلى "${status}"`,
    oldValues: { status: order.status },
    newValues: { status },
    req,
  });

  res.json({ ok: true });
});

// POST /api/orders/:id/payment { amount, method, note }
// تسجيل دفعة صلاحية مستقلة عن edit_order (شوف تعليقها بجدول permissions
// بـ db.js) — الكاشير/المحاسب يقدر يحصّل دفعة بدون ما يقدر يعدّل تفاصيل الطلب.
router.post('/:id/payment', requireAuth, authorize('record_payment'), (req, res) => {
  const { amount, method, note } = req.body;
  const amt = Number(amount);
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!order) return res.status(404).json({ error: 'الطلب غير موجود' });
  const remaining = order.total_price - order.paid_amount;
  if (!amt || amt <= 0) return res.status(400).json({ error: 'أدخل مبلغًا صحيحًا' });
  if (amt > remaining + 0.001) return res.status(400).json({ error: 'المبلغ أكبر من المتبقي على الزبون' });

  const tx = db.transaction(() => {
    db.prepare(
      `INSERT INTO payments (order_id, customer_id, amount, method, note, worker_id) VALUES (?, ?, ?, ?, ?, ?)`
    ).run(order.id, order.customer_id, amt, method || 'cash', note || null, req.worker.workerId);
    db.prepare('UPDATE orders SET paid_amount = paid_amount + ? WHERE id = ?').run(amt, order.id);
  });
  tx();
  logActivity({
    userId: req.worker.workerId,
    action: 'update',
    modelType: 'payment',
    modelId: order.id,
    description: `${req.worker.name} سجّل دفعة بقيمة ${amt} على الطلب #${order.order_number}`,
    newValues: { amount: amt, method: method || 'cash', note: note || null },
    req,
  });
  res.json({ ok: true });
});

// GET /api/orders/:id/receipt
router.get('/:id/receipt', requireAuth, authorize('view_receipts'), async (req, res) => {
  const order = db
    .prepare(`SELECT o.*, c.name AS customer_name, c.phone AS customer_phone FROM orders o JOIN customers c ON c.id = o.customer_id WHERE o.id = ?`)
    .get(req.params.id);
  if (!order) return res.status(404).json({ error: 'الطلب غير موجود' });
  const items = db
    .prepare(
      `SELECT oi.*, s.name AS service_name FROM order_items oi LEFT JOIN services s ON s.id = oi.service_id WHERE oi.order_id = ?`
    )
    .all(req.params.id);
  const settings = settingsService.getAll();
  delete settings.jwt_secret;

  const qrPayload = JSON.stringify({
    orderNumber: order.order_number,
    total: order.total_price,
    date: order.created_at,
  });
  const qrDataUrl = await QRCode.toDataURL(qrPayload, { margin: 1, width: 180 });

  let qrWhatsappDataUrl = null;
  if (settings.shop_phone) {
    const digits = settings.shop_phone.replace(/\D/g, '');
    const waPhone = digits.startsWith('964') ? digits : `964${digits.replace(/^0/, '')}`;
    qrWhatsappDataUrl = await QRCode.toDataURL(`https://wa.me/${waPhone}`, { margin: 1, width: 180 });
  }

  res.json({ order, items, settings, qrDataUrl, qrWhatsappDataUrl });
});

module.exports = router;
