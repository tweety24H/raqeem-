const db = require('../db/db');

function safeJson(value) {
  if (value === undefined || value === null) return null;
  try {
    return JSON.stringify(value);
  } catch {
    return null;
  }
}

function ipFrom(req) {
  if (!req) return null;
  return req.ip || req.headers?.['x-forwarded-for'] || req.connection?.remoteAddress || null;
}

const insertStmt = db.prepare(
  `INSERT INTO activity_logs (user_id, action, model_type, model_id, description, old_values, new_values, ip_address)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
);

// logActivity(userId, action, modelType, modelId, description, oldValues, newValues)
// يُستدعى أيضًا بصيغة كائن واحد: logActivity({ userId, action, modelType, modelId, description, oldValues, newValues, req })
// الصيغتان مدعومتان حتى يسهل استدعاؤه من أي كنترولر بدون التقيّد بترتيب المعاملات.
function logActivity(userIdOrOpts, action, modelType, modelId, description, oldValues, newValues, req) {
  let opts;
  if (typeof userIdOrOpts === 'object' && userIdOrOpts !== null) {
    opts = userIdOrOpts;
  } else {
    opts = { userId: userIdOrOpts, action, modelType, modelId, description, oldValues, newValues, req };
  }
  try {
    insertStmt.run(
      opts.userId ?? null,
      opts.action,
      opts.modelType,
      opts.modelId ?? null,
      opts.description ?? null,
      safeJson(opts.oldValues),
      safeJson(opts.newValues),
      ipFrom(opts.req)
    );
  } catch (err) {
    // سجل النشاطات ثانوي — فشل تسجيله ما يجوز يوقف العملية الأساسية (إنشاء
    // طلب، تعديل زبون، إلخ)، فقط نسجّل الخطأ بالكونسول.
    console.error('logActivity failed:', err.message);
  }
}

// GET helper: قائمة السجلات مع فلاتر + صفحات (يُستخدم من routes/activityLogs.js)
function listActivity({ userId, action, modelType, dateFrom, dateTo, page = 1, pageSize = 25 } = {}) {
  let where = 'WHERE 1=1';
  const params = [];
  if (userId) {
    where += ' AND al.user_id = ?';
    params.push(userId);
  }
  if (action) {
    where += ' AND al.action = ?';
    params.push(action);
  }
  if (modelType) {
    where += ' AND al.model_type = ?';
    params.push(modelType);
  }
  if (dateFrom) {
    where += ' AND date(al.created_at) >= date(?)';
    params.push(dateFrom);
  }
  if (dateTo) {
    where += ' AND date(al.created_at) <= date(?)';
    params.push(dateTo);
  }

  const total = db
    .prepare(`SELECT COUNT(*) AS c FROM activity_logs al ${where}`)
    .get(...params).c;

  const offset = Math.max(0, (Number(page) - 1) * Number(pageSize));
  const rows = db
    .prepare(
      `SELECT al.*, w.name AS user_name
       FROM activity_logs al
       LEFT JOIN workers w ON w.id = al.user_id
       ${where}
       ORDER BY al.created_at DESC
       LIMIT ? OFFSET ?`
    )
    .all(...params, Number(pageSize), offset);

  return { rows, total, page: Number(page), pageSize: Number(pageSize) };
}

module.exports = { logActivity, listActivity };
