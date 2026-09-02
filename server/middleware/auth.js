const jwt = require('jsonwebtoken');
const settingsService = require('../services/settingsService');

function getSecret() {
  return settingsService.get('jwt_secret');
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

module.exports = { requireAuth, requireOwner, getSecret };
