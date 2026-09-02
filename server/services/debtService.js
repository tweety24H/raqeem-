const db = require('../db/db');

const OVERDUE_DAYS = 30;
const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000; // كل ٢٤ ساعة

function debtFor(customerId) {
  const totals = db
    .prepare(
      `SELECT COALESCE(SUM(total_price), 0) AS totalOrders,
              COALESCE(SUM(paid_amount), 0) AS totalPaid
       FROM orders WHERE customer_id = ?`
    )
    .get(customerId);
  return totals.totalOrders - totals.totalPaid;
}

function getOverdueCustomers(days = OVERDUE_DAYS) {
  const customers = db.prepare('SELECT * FROM customers').all();
  const result = [];
  for (const c of customers) {
    const debt = debtFor(c.id);
    if (debt <= 0) continue;
    const lastPayment = db
      .prepare('SELECT MAX(created_at) AS d FROM payments WHERE customer_id = ?')
      .get(c.id).d;
    const lastOrder = db
      .prepare('SELECT MAX(created_at) AS d FROM orders WHERE customer_id = ?')
      .get(c.id).d;
    const lastActivity = [lastPayment, lastOrder].filter(Boolean).sort().pop();
    if (!lastActivity) continue;
    const ageDays = Math.floor((Date.now() - new Date(lastActivity).getTime()) / 86400000);
    if (ageDays >= days) {
      result.push({ ...c, debt, daysSinceActivity: ageDays });
    }
  }
  result.sort((a, b) => b.daysSinceActivity - a.daysSinceActivity);
  return result;
}

function logReminder({ customerId, debtAmount, workerId }) {
  db.prepare(
    'INSERT INTO debt_reminders (customer_id, debt_amount, worker_id) VALUES (?, ?, ?)'
  ).run(customerId, debtAmount, workerId || null);
}

function runDailyDebtCheck() {
  const overdue = getOverdueCustomers(OVERDUE_DAYS);
  if (overdue.length === 0) return;
  console.log(`تنبيه ديون: ${overdue.length} زبون متأخر بالدفع أكثر من ${OVERDUE_DAYS} يوم:`);
  for (const c of overdue) {
    console.log(`  - ${c.name} (${c.phone || 'بدون هاتف'}): ${c.debt} د.ع، منذ ${c.daysSinceActivity} يوم`);
  }
}

function scheduleDailyDebtCheck() {
  runDailyDebtCheck();
  setInterval(runDailyDebtCheck, CHECK_INTERVAL_MS);
}

module.exports = { debtFor, getOverdueCustomers, logReminder, runDailyDebtCheck, scheduleDailyDebtCheck };
