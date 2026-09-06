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

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'خطأ في الخادم الداخلي' });
});

require('./services/backupService').scheduleAutoBackup();
require('./services/whatsappService').init();
require('./services/debtService').scheduleDailyDebtCheck();
require('./services/stockAlertService').scheduleDailyStockCheck();

const PORT = process.env.RAQEEM_PORT || 4310;
const HOST = '0.0.0.0'; // listen on LAN so the customer QR page works over WiFi

app.listen(PORT, HOST, () => {
  console.log(`RaqeemOS server running on http://${HOST}:${PORT}`);
});

module.exports = app;
