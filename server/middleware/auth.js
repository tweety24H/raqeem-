const jwt = require('jsonwebtoken');
const settingsService = require('../services/settingsService');

function getSecret() {
  return settingsService.get('jwt_secret');
}

// checkPermission(slug) — يحمي مسارًا يتطلب صلاحية محددة (راجع قائمة
// الصلاحيات في server/db/schema.sql وseedPermissions في server/db/db.js).
// المالك (role='owner') يملك كل الصلاحيات ضمنيًا. الموظف يحتاج صفًا في
// user_permissions يطابق نفس الـ slug. يُستخدم بعد requireAuth دائمًا:
//   router.get('/x', requireAuth, checkPermission('view_orders'), handler)
function checkPermission(slug) {
  return (req, res, next) => {
    if (!req.worker) return res.status(401).json({ error: 'مطلوب تسجيل الدخول' });
    if (req.worker.role === 'owner') return next();
    // require lazily لتفادي أي احتمال لحلقة استيراد (circular require) مع db.js
    const db = require('../db/db');
    const has = db
      .prepare('SELECT 1 FROM user_permissions WHERE user_id = ? AND permission_slug = ?')
      .get(req.worker.workerId, slug);
    if (!has) {
      return res.status(403).json({ error: 'ليس لديك صلاحية للوصول لهذه الصفحة', permission: slug });
    }
    next();
  };
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'مطلوب تسجيل الدخول' });
  try {
    const payload = jwt.verify(token, getSecret());
    req.worker = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'الجلسة منتهية، الرجاء تسجيل الدخول مجددًا' });
  }
}

function requireOwner(req, res, next) {
  if (!req.worker || req.worker.role !== 'owner') {
    return res.status(403).json({ error: 'هذا الإجراء يتطلب صلاحية المالك' });
  }
  next();
}

module.exports = { requireAuth, requireOwner, checkPermission, getSecret };
