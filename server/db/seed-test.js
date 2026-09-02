// بيانات تجريبية واقعية لاختبار RaqeemOS (زبائن، مخزون، طلبات عراقية، تصاميم وهمية)
// تشغيل: npm run seed:test  (يحتاج نفس نسخة Node التي يعمل بها better-sqlite3)
const fs = require('fs');
const path = require('path');
const db = require('./db');

const dataDir = process.env.RAQEEM_DB_DIR || path.join(__dirname, '..', '..', 'data');
const designsRoot = path.join(dataDir, 'uploads', 'designs');

function daysAgo(n) {
  const d = new Date(Date.now() - n * 24 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

function orderNumber(dateStr, seq) {
  const datePart = dateStr.slice(0, 10).replace(/-/g, '');
  return `RQ${datePart}-${String(seq).padStart(4, '0')}`;
}

const wipeOrder = [
  'debt_reminders',
  'stock_alerts',
  'archive_designs',
  'design_files',
  'orders', // يحذف order_items و payments تلقائيًا (ON DELETE CASCADE)
  'customers',
  'stock_movements',
  'stock_items',
];

function wipeTestData() {
  const oldFiles = db.prepare('SELECT file_path FROM design_files').all();
  const tx = db.transaction(() => {
    for (const table of wipeOrder) db.prepare(`DELETE FROM ${table}`).run();
    db.prepare(
      `DELETE FROM sqlite_sequence WHERE name IN (${wipeOrder.map(() => '?').join(',')}, 'order_items', 'payments')`
    ).run(...wipeOrder);
  });
  tx();
  for (const f of oldFiles) {
    try {
      fs.unlinkSync(path.join(dataDir, f.file_path));
    } catch (_) {
      /* ignore */
    }
  }
}

const CUSTOMERS = [
  { name: 'محمد العلي', phone: '0780 123 4567' },
  { name: 'علي حسين', phone: '0770 987 6543' },
  { name: 'زينب كاظم', phone: '0781 234 5678' },
  { name: 'أحمد جبار', phone: '0790 345 6789' },
  { name: 'فاطمة سالم', phone: '0771 456 7890' },
  { name: 'حسين علاء', phone: '0782 567 8901' },
  { name: 'مريم قاسم', phone: '0773 678 9012' },
  { name: 'كرار عبدالله', phone: '0783 789 0123' }, // سيكون الزبون المتأخر بالدفع
  { name: 'نور الهدى', phone: '0774 890 1234' },
  { name: 'سجاد رياض', phone: '0784 901 2345' },
];

// [إجمالي الطلب, المبلغ المدفوع] لكل زبون -> يحدد الدين المستحق
const PRIMARY_ORDER = [
  [40000, 15000], // محمد العلي -> دين 25,000
  [15000, 15000], // علي حسين -> دين 0
  [40000, 25000], // زينب كاظم -> دين 15,000
  [40000, 0], // أحمد جبار -> دين 40,000
  [5000, 5000], // فاطمة سالم -> دين 0
  [75000, 0], // حسين علاء -> دين 75,000
  [15000, 15000], // مريم قاسم -> دين 0
  [30000, 0], // كرار عبدالله -> دين 30,000 (متأخر أكثر من 30 يوم)
  [5000, 5000], // نور الهدى -> دين 0
  [60000, 0], // سجاد رياض -> دين 60,000
];

const STOCK_ITEMS = [
  { name: 'ورق A4', unit: 'قطعة', quantity: 50, min_quantity: 10, cost: 500 },
  { name: 'حبر اسود HP', unit: 'قطعة', quantity: 3, min_quantity: 5, cost: 15000 }, // منخفض
  { name: 'حبر ملون', unit: 'قطعة', quantity: 8, min_quantity: 4, cost: 20000 },
  { name: 'تغليف حراري', unit: 'متر', quantity: 100, min_quantity: 20, cost: 1000 },
  { name: 'كارتون', unit: 'قطعة', quantity: 2, min_quantity: 10, cost: 2000 }, // منخفض
  { name: 'ستيكر', unit: 'فرخ', quantity: 60, min_quantity: 15, cost: 3000 },
  { name: 'فلاير', unit: 'قطعة', quantity: 500, min_quantity: 100, cost: 250 },
  { name: 'بروشور', unit: 'قطعة', quantity: 200, min_quantity: 50, cost: 750 },
  { name: 'ورق لامع A3', unit: 'قطعة', quantity: 40, min_quantity: 10, cost: 800 },
  { name: 'حبر HP رمادي', unit: 'قطعة', quantity: 4, min_quantity: 6, cost: 16000 }, // منخفض
  { name: 'شريط لصق', unit: 'قطعة', quantity: 30, min_quantity: 5, cost: 1500 },
  { name: 'اكياس بلاستيك', unit: 'قطعة', quantity: 300, min_quantity: 50, cost: 100 },
  { name: 'علب هدايا', unit: 'قطعة', quantity: 25, min_quantity: 5, cost: 3500 },
  { name: 'فينيل لاصق', unit: 'متر', quantity: 45, min_quantity: 10, cost: 4000 },
  { name: 'اطارات صور', unit: 'قطعة', quantity: 15, min_quantity: 5, cost: 5000 },
];

const STATUSES = ['جديد', 'قيد التصميم', 'قيد الطباعة', 'جاهز للتسليم', 'تم التسليم'];
const PRICES = [5000, 15000, 40000];
const PRODUCTS = ['طباعة كارت شخصي', 'طباعة فلاير', 'طباعة بروشور', 'طباعة ستيكر', 'تغليف حراري', 'طباعة فلكس'];

function seed() {
  console.log('حذف البيانات التجريبية القديمة...');
  wipeTestData();

  const insertCustomer = db.prepare('INSERT INTO customers (name, phone) VALUES (?, ?)');
  const insertStock = db.prepare(
    'INSERT INTO stock_items (name, unit, quantity, min_quantity, cost_per_unit) VALUES (?, ?, ?, ?, ?)'
  );
  const insertOrder = db.prepare(
    `INSERT INTO orders
      (order_number, customer_id, status, subtotal, discount, total_price, payment_type, paid_amount, created_at, delivered_at)
     VALUES (?, ?, ?, ?, 0, ?, ?, ?, ?, ?)`
  );
  const insertItem = db.prepare(
    `INSERT INTO order_items (order_id, description, quantity, unit_price, total_price)
     VALUES (?, ?, 1, ?, ?)`
  );

  console.log('إضافة الزبائن...');
  const customerIds = CUSTOMERS.map((c) => insertCustomer.run(c.name, c.phone).lastInsertRowid);

  console.log('إضافة أصناف المخزون...');
  for (const s of STOCK_ITEMS) {
    insertStock.run(s.name, s.unit, s.quantity, s.min_quantity, s.cost);
  }

  console.log('إضافة الطلبات...');
  let seq = 1;
  let orderCount = 0;

  function addOrder(customerIdx, total, paid, dateStr) {
    const custId = customerIds[customerIdx];
    const paymentType = paid >= total ? 'full' : paid === 0 ? 'debt' : 'partial';
    const status = STATUSES[orderCount % STATUSES.length];
    const deliveredAt = status === 'تم التسليم' ? dateStr : null;
    const num = orderNumber(dateStr, seq++);
    const orderId = insertOrder.run(
      num,
      custId,
      status,
      total,
      total,
      paymentType,
      paid,
      dateStr,
      deliveredAt
    ).lastInsertRowid;
    const product = PRODUCTS[orderCount % PRODUCTS.length];
    insertItem.run(orderId, product, total, total);
    orderCount++;
    return orderId;
  }

  // الطلبات الأساسية التي تحدد دين كل زبون (خلال آخر 7 أيام)
  const primaryOrderIds = [];
  PRIMARY_ORDER.forEach(([total, paid], idx) => {
    if (idx === 7) return; // كرار عبدالله -> طلبه القديم أدناه (متأخر أكثر من 30 يوم)
    primaryOrderIds[idx] = addOrder(idx, total, paid, daysAgo(idx % 7));
  });

  // طلب كرار عبدالله القديم (متأخر ٥٠ يومًا لاختبار تنبيه التأخر بالدفع في كل الحدود المستخدمة بالتطبيق: 30 و 45 يومًا)
  addOrder(7, 30000, 0, daysAgo(50));

  // طلبات إضافية مسددة بالكامل لتنويع الحالات والأسعار (لا تُغيّر الديون)
  const fillerCustomers = [0, 1, 2, 3, 4, 5, 6, 8, 9, 0];
  fillerCustomers.forEach((custIdx, i) => {
    const price = PRICES[i % PRICES.length];
    addOrder(custIdx, price, price, daysAgo(i % 7));
  });

  console.log('إضافة تصاميم وهمية للاختبار...');
  const insertDesign = db.prepare(
    `INSERT INTO design_files (order_id, customer_id, file_path, file_name, file_type, file_size, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  );
  const DUMMY_DESIGNS = [
    { customerIdx: 0, fileName: 'تصميم-كارت-شخصي.pdf', type: 'pdf', notes: 'تصميم أولي' },
    { customerIdx: 1, fileName: 'شعار-الزبون.png', type: 'png', notes: null },
    { customerIdx: 3, fileName: 'ملف-فلاير.pdf', type: 'pdf', notes: 'نسخة معدّلة بعد ملاحظات الزبون' },
  ];
  for (const d of DUMMY_DESIGNS) {
    const custId = customerIds[d.customerIdx];
    const orderId = primaryOrderIds[d.customerIdx];
    const dir = path.join(designsRoot, String(custId), String(orderId));
    fs.mkdirSync(dir, { recursive: true });
    const storedName = `${Date.now()}-${d.fileName}`;
    const fullPath = path.join(dir, storedName);
    const content = `ملف تصميم وهمي للاختبار فقط - ${d.fileName}`;
    fs.writeFileSync(fullPath, content, 'utf-8');
    const relPath = path.relative(dataDir, fullPath).split(path.sep).join('/');
    insertDesign.run(orderId, custId, relPath, d.fileName, d.type, Buffer.byteLength(content, 'utf-8'), d.notes);
  }

  console.log('ضبط رقم هاتف المطبعة (لتنبيهات واتساب المخزون)...');
  db.prepare(
    "INSERT INTO settings (key, value) VALUES ('shop_phone', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
  ).run('9647801234567');

  console.log(
    `تم: ${customerIds.length} زبون، ${STOCK_ITEMS.length} صنف مخزون، ${orderCount} طلب، ${DUMMY_DESIGNS.length} تصميم وهمي.`
  );
}

seed();
