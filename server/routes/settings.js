const express = require('express');
const path = require('path');
const fs = require('fs');
const os = require('os');
const multer = require('multer');
const QRCode = require('qrcode');
const settingsService = require('../services/settingsService');
const whatsappService = require('../services/whatsappService');
const { requireAuth, requireOwner } = require('../middleware/auth');

const router = express.Router();

const logoDir = path.join(
  process.env.RAQEEM_DB_DIR || path.join(__dirname, '..', '..', 'data'),
  'uploads',
  'logo'
);
if (!fs.existsSync(logoDir)) fs.mkdirSync(logoDir, { recursive: true });
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, logoDir),
  filename: (req, file, cb) => cb(null, `logo_${Date.now()}${path.extname(file.originalname)}`),
});
const upload = multer({ storage, limits: { fileSize: 4 * 1024 * 1024 } });

// GET /api/settings
router.get('/', requireAuth, (req, res) => {
  const all = settingsService.getAll();
  delete all.jwt_secret;
  res.json({ settings: all });
});

// PATCH /api/settings (owner only)
router.patch('/', requireAuth, requireOwner, (req, res) => {
  const body = { ...req.body };
  delete body.jwt_secret;
  settingsService.setMany(body);
  // Kick off WhatsApp pairing right away instead of waiting for a server
  // restart to notice the toggle flipped on.
  if (body.whatsapp_enabled === '1') whatsappService.init().catch(() => {});
  res.json({ ok: true });
});

// GET /api/settings/whatsapp/status (owner only) — polled by the settings
// page while pairing is in progress, to show the live QR code and state.
router.get('/whatsapp/status', requireAuth, requireOwner, async (req, res) => {
  const { status, lastQr, qrGeneratedAt, phoneNumber } = whatsappService.getStatus();
  let qrDataUrl = null;
  if (lastQr) qrDataUrl = await QRCode.toDataURL(lastQr, { margin: 1, width: 220 });
  res.json({ status, qrDataUrl, qrGeneratedAt, phoneNumber });
});

// POST /api/settings/whatsapp/disconnect (owner only) — destroys the current
// WhatsApp session and clears the saved pairing, so a fresh QR is generated
// next time init() runs instead of retrying a possibly-stuck old session.
router.post('/whatsapp/disconnect', requireAuth, requireOwner, async (req, res) => {
  await whatsappService.disconnect();
  res.json({ ok: true });
});

// POST /api/settings/logo (owner only)
router.post('/logo', requireAuth, requireOwner, upload.single('logo'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'لم يتم إرفاق صورة' });
  const relPath = path.join('uploads', 'logo', req.file.filename);
  settingsService.set('shop_logo_path', relPath);
  res.json({ ok: true, path: relPath });
});

// GET /api/settings/network - روابط شبكة الواي فاي المحلية لصفحة الزبون وصفحة المالك
router.get('/network', requireAuth, async (req, res) => {
  const nets = os.networkInterfaces();
  const lan = Object.values(nets)
    .flat()
    .find((n) => n.family === 'IPv4' && !n.internal);
  const lanIp = lan ? lan.address : 'localhost';
  const port = process.env.RAQEEM_PORT || 4310;
  const customerPortalUrl = `http://${lanIp}:${port}/portal/order.html`;
  const ownerPortalUrl = `http://${lanIp}:${port}/portal/owner.html`;
  const [customerQr, ownerQr] = await Promise.all([
    QRCode.toDataURL(customerPortalUrl, { margin: 1, width: 200 }),
    QRCode.toDataURL(ownerPortalUrl, { margin: 1, width: 200 }),
  ]);
  res.json({ lanIp, port, customerPortalUrl, ownerPortalUrl, customerQr, ownerQr });
});

module.exports = router;
