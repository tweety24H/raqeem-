const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const os = require('os');
const rateLimit = require('express-rate-limit');

const db = require('./db/db');

const app = express();
app.use(cors());
app.use(express.json());

// حماية عامة لكل /api من إغراق الطلبات (Defense in depth - السيرفر يشتغل
// على الشبكة المحلية 0.0.0.0 حتى تشتغل صفحة الزبون QR، فأي جهاز على نفس
// الواي فاي نظرياً يقدر يوصله). حد سخي ما يعيق الاستخدام العادي إطلاقاً.
const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'طلبات كثيرة جداً، حاول بعد شوي' },
});
app.use('/api', generalLimiter);

// حد أشد على نقاط صفحة الزبون العامة (بدون تسجيل دخول إطلاقاً - أي جهاز
// بالشبكة يقدر يناديها مباشرة، فيها حتى رفع ملفات).
const publicLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'طلبات كثيرة جداً، حاول بعد دقيقة' },
});

const dataDir = process.env.RAQEEM_DB_DIR || path.join(__dirname, '..', 'data');
const uploadsRoot = path.join(dataDir, 'uploads');
if (!fs.existsSync(uploadsRoot)) fs.mkdirSync(uploadsRoot, { recursive: true });
app.use('/uploads', express.static(uploadsRoot));
app.use('/portal', express.static(path.join(__dirname, 'public')));

app.get('/api/health', (req, res) => {
  const nets = os.networkInterfaces();
  const lan = Object.values(nets)
    .flat()
    .find((n) => n.family === 'IPv4' && !n.internal);
  res.json({ ok: true, lanIp: lan ? lan.address : null });
});

// بوابة الترخيص على مستوى السيرفر نفسه - نفس فحص Activation.jsx/useLicense()
// بالواجهة، بس هنا ما ينفع تجاوزه من الـ devtools أو بطلب مباشر للـ API
// (مثلاً curl على localhost:4310) لأن الفحص الحقيقي صار خارج الواجهة أصلاً.
// نطبّقها بس داخل Electron المبني فعلياً (process.versions.electron) - بوضع
// التطوير (npm run dev) السيرفر يشتغل بعملية Node عادية بدون Electron إطلاقاً
// فـ electron-store داخل license.js يطيح بخطأ لو حاولنا نستدعيه هناك، ونفس
// قرار "بدون Electron ما نطبّق قفل ترخيص" أصلاً معتمد بـ useLicense.js بالواجهة.
if (process.versions.electron) {
  const license = require('../electron/license');
  app.use((req, res, next) => {
    // صفحة تحقق الزبون العامة (QR على الفاتورة) وفحص الصحة يضلوا شغالين
    // حتى لو التجربة انتهت - ما نوقّف فواتير قديمة مطبوعة عن زبائن سابقين.
    if (req.path.startsWith('/api/public') || req.path === '/api/health') return next();
    const status = license.getLicenseStatus();
    if (status.status === 'licensed' || status.status === 'trial') return next();
    return res.status(403).json({ error: 'license_required', ...status });
  });
}

app.use('/api/auth', require('./routes/auth'));
app.use('/api/stock', require('./routes/stock'));
app.use('/api/customers', require('./routes/customers'));
app.use('/api/services', require('./routes/services'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/archive', require('./routes/archive'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/public', publicLimiter, require('./routes/public'));
app.use('/api/requests', require('./routes/requests'));
app.use('/api/designs', require('./routes/designs'));
app.use('/api/expenses', require('./routes/expenses'));
app.use('/api/activity-logs', require('./routes/activityLogs'));
app.use('/api/permissions', require('./routes/permissions'));
app.use('/api/roles', require('./routes/roles'));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'خطأ في الخادم الداخلي' });
});

require('./services/backupService').scheduleAutoBackup();
require('./services/whatsappService').init();
require('./services/debtService').scheduleDailyDebtCheck();
require('./services/stockAlertService').scheduleDailyStockCheck();
require('./services/recurringOrdersService').scheduleRecurringOrdersCheck();

const PORT = process.env.RAQEEM_PORT || 4310;
const HOST = '0.0.0.0'; // listen on LAN so the customer QR page works over WiFi

app.listen(PORT, HOST, () => {
  console.log(`RaqeemOS server running on http://${HOST}:${PORT}`);
});

module.exports = app;
