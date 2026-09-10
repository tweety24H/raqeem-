// authorize(permissionKey) — واجهة بديلة لـ checkPermission لنفس المنطق
// (المالك يمرّ دائمًا، وإلا يفحص صلاحيات الموظف المباشرة + صلاحيات دوره عبر
// role_permissions). موجودة كملف منفصل لتطابق الاسم/الاستيراد المطلوب:
//   const { authorize } = require('../middleware/authorize');
//   router.post('/x', requireAuth, authorize('create_order'), handler)
const { checkPermission } = require('./auth');

const authorize = (permissionKey) => checkPermission(permissionKey);

module.exports = { authorize };
