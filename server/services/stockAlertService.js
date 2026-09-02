const db = require('../db/db');

const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000; // كل ٢٤ ساعة

function getLowStockItems() {
  return db.prepare('SELECT * FROM stock_items WHERE quantity <= min_quantity ORDER BY name').all();
}

function logAlert({ itemsCount, itemsSummary, workerId }) {
  db.prepare(
    'INSERT INTO stock_alerts (items_count, items_summary, worker_id) VALUES (?, ?, ?)'
  ).run(itemsCount, itemsSummary || null, workerId || null);
}

function runDailyStockCheck() {
  const lowItems = getLowStockItems();
  if (lowItems.length === 0) return;
  console.log(`تنبيه مخزون: ${lowItems.length} صنف وصل للحد الأدنى أو أقل:`);
  for (const item of lowItems) {
    console.log(`  - ${item.name}: ${item.quantity} ${item.unit} (الحد الأدنى ${item.min_quantity})`);
  }
}

function scheduleDailyStockCheck() {
  runDailyStockCheck();
  setInterval(runDailyStockCheck, CHECK_INTERVAL_MS);
}

module.exports = { getLowStockItems, logAlert, runDailyStockCheck, scheduleDailyStockCheck };
