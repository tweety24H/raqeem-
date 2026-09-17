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
// hasEffectivePermission(workerId, slug) — يفحص user_permissions (منح مباشر
// للموظف) ثم role_permissions عبر workers.role_id (حزمة الدور) — أي واحدة
// منهم كافية (اتحاد، مو تقاطع).
function hasEffectivePermission(workerId, slug) {
  const db = require('../db/db');
  const direct = db
    .prepare('SELECT 1 FROM user_permissions WHERE user_id = ? AND permission_slug = ?')
    .get(workerId, slug);
  if (direct) return true;
  const viaRole = db
    .prepare(
      `SELECT 1 FROM workers w
       JOIN role_permissions rp ON rp.role_id = w.role_id
       JOIN permissions p ON p.id = rp.permission_id
       WHERE w.id = ? AND p.slug = ?`
    )
    .get(workerId, slug);
  return !!viaRole;
}

function checkPermission(slug) {
  return (req, res, next) => {
    if (!req.worker) return res.status(401).json({ error: 'مطلوب تسجيل الدخول' });
    if (req.worker.role === 'owner') return next();
    if (!hasEffectivePermission(req.worker.workerId, slug)) {
      return res.status(403).json({ error: 'ليس لديك صلاحية للوصول لهذه الصفحة', permission: slug });
    }
    next();
  };
}

// requireOwnerOrPermission(slug) — يسمح للمالك دائمًا، أو لأي موظف يملك
// الصلاحية المحددة (مباشرة أو عبر دوره) — يُستخدم لمسارات إدارية كانت
// owner-only بحتة (مثل إدارة الموظفين) حتى يقدر دور "مدير عام" يوصلها.
function requireOwnerOrPermission(slug) {
  return (req, res, next) => {
    if (!req.worker) return res.status(401).json({ error: 'مطلوب تسجيل الدخول' });
    if (req.worker.role === 'owner') return next();
    if (!hasEffectivePermission(req.worker.workerId, slug)) {
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

module.exports = { requireAuth, requireOwner, checkPermission, requireOwnerOrPermission, hasEffectivePermission, getSecret };
