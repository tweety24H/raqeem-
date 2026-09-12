// هاي الخدمة تسوي الشغلة اللي كانت ناقصة بميزة "الطلب المتكرر": لما تنشئ طلب
// وتفعّل خيار التكرار، السيرفر كان يخزن صف بجدول recurring_orders وبس —
// next_run_date تنحسب صح، بس ماكو أي كود يقرأها ويسوي شي بيها. هذا الملف
// يكمّل الدورة: يفحص التكرارات المستحقة ويولّد الطلب التالي فعليًا.
const db = require('../db/db');

const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000; // فحص كل ٢٤ ساعة، نفس نمط debtService/stockAlertService

// نفس مولّد رقم الطلب الموجود بـ routes/orders.js — نكرره هنا بدل ما نصدّره
// من ملف الراوتر، حتى الخدمة تضل مستقلة زي باقي خدمات server/services.
function generateOrderNumber() {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const countToday = db
    .prepare("SELECT COUNT(*) AS c FROM orders WHERE date(created_at) = date('now')")
    .get().c;
  return `RQ${datePart}-${String(countToday + 1).padStart(4, '0')}`;
}

// هاي تسوي طلب واحد جديد من قالب تكرار مستحق، وتدفع next_run_date للدورة الجاية.
// ما تخصم من المخزون تلقائيًا وما تحدد دفعة مسبقة (payment_type: debt) —
// عمدًا خليناها "طلب مسودة" يشوفه صاحب المطبعة ويراجعه، مو عملية تلقائية
// كاملة تسحب مخزون أو تسجل دفع بدون ما يدري حد.
function createOrderFromRecurring(recurring) {
  const items = JSON.parse(recurring.template_json);
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('قالب الطلب المتكرر فاضي أو تالف');
  }
  const subtotal = items.reduce((s, it) => s + Number(it.quantity) * Number(it.unit_price), 0);
  const orderNumber = generateOrderNumber();

  return db.transaction(() => {
    const info = db
      .prepare(
        `INSERT INTO orders (order_number, customer_id, worker_id, status, subtotal, discount, total_price, payment_type, paid_amount, notes, recurring_id)
         VALUES (?, ?, NULL, 'جديد', ?, 0, ?, 'debt', 0, ?, ?)`
      )
      .run(orderNumber, recurring.customer_id, subtotal, subtotal, 'طلب متكرر تلقائي — راجع التفاصيل والمخزون قبل التنفيذ', recurring.id);
    const orderId = info.lastInsertRowid;

    const insertItem = db.prepare(
      `INSERT INTO order_items (order_id, service_id, description, quantity, unit_price, total_price, stock_item_id, stock_qty_used)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0)`
    );
    for (const it of items) {
      insertItem.run(
        orderId,
        it.service_id || null,
        it.description || null,
        Number(it.quantity),
        Number(it.unit_price),
        Number(it.quantity) * Number(it.unit_price),
        it.stock_item_id || null
      );
    }

    // نقاط ولاء بنفس منطق إنشاء الطلب اليدوي — نقطة لكل ١٠٠٠ د.ع من قيمة الطلب.
    const earnedPoints = Math.floor(subtotal / 1000);
    if (earnedPoints > 0) {
      db.prepare('UPDATE customers SET points = points + ? WHERE id = ?').run(earnedPoints, recurring.customer_id);
    }

    // ندفع next_run_date للدورة الجاية بدل ما نعطل التكرار — يضل شغال كل interval_days.
    const nextDate = new Date(Date.now() + Number(recurring.interval_days) * 86400000)
      .toISOString()
      .slice(0, 10);
    db.prepare('UPDATE recurring_orders SET next_run_date = ? WHERE id = ?').run(nextDate, recurring.id);

    return { orderId, orderNumber };
  })();
}

// هاي الدالة الرئيسية اللي تشتغل كل يوم: تجيب كل التكرارات المستحقة اليوم
// أو اللي فاتها موعدها، وتسوي طلب لكل وحدة منها — وحدة وحدة، حتى لو وحدة
// فشلت (زبون انحذف مثلاً) البقية تكمل عادي.
function processDueRecurringOrders() {
  const due = db
    .prepare("SELECT * FROM recurring_orders WHERE active = 1 AND date(next_run_date) <= date('now')")
    .all();
  if (due.length === 0) return;

  console.log(`طلبات متكررة مستحقة: ${due.length}`);
  for (const recurring of due) {
    const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(recurring.customer_id);
    if (!customer) {
      // الزبون ما موجود بعد — نوقف هذا التكرار بدل ما يفشل كل يوم من جديد.
      db.prepare('UPDATE recurring_orders SET active = 0 WHERE id = ?').run(recurring.id);
      continue;
    }
    try {
      const { orderNumber } = createOrderFromRecurring(recurring);
      console.log(`  - طلب تلقائي جديد #${orderNumber} للزبون ${customer.name} (تكرار #${recurring.id})`);
    } catch (err) {
      console.error(`  - فشل إنشاء طلب متكرر #${recurring.id}:`, err.message);
    }
  }
}

function scheduleRecurringOrdersCheck() {
  processDueRecurringOrders();
  setInterval(processDueRecurringOrders, CHECK_INTERVAL_MS);
}

module.exports = { processDueRecurringOrders, scheduleRecurringOrdersCheck };
