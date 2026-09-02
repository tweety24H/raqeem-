// واتساب محلي عبر whatsapp-web.js (يعمل بدون أي خدمة سحابية طرف ثالث).
// المكتبة ثقيلة (تحمّل Chromium)، لذا تُحمَّل فقط عند التفعيل من الإعدادات
// حتى لا يُثقل التثبيت الأولي لمن لا يحتاج هذه الميزة.
//
// للتفعيل: npm install whatsapp-web.js qrcode-terminal
// ثم فعّل "الإرسال التلقائي عبر واتساب" من صفحة الإعدادات.

const settingsService = require('./settingsService');

let client = null;
let status = 'disabled'; // disabled | initializing | qr_pending | ready | error
let lastQr = null;

function isEnabled() {
  return settingsService.get('whatsapp_enabled') === '1';
}

async function init() {
  if (!isEnabled()) return;
  if (client) return;

  let WAModule;
  try {
    WAModule = require('whatsapp-web.js');
  } catch (err) {
    status = 'error';
    console.warn(
      'خدمة واتساب غير مثبتة. لتفعيلها نفّذ: npm install whatsapp-web.js qrcode-terminal'
    );
    return;
  }

  const { Client, LocalAuth } = WAModule;
  status = 'initializing';
  client = new Client({
    authStrategy: new LocalAuth({ dataPath: process.env.RAQEEM_DB_DIR || undefined }),
    puppeteer: { headless: true },
  });

  client.on('qr', (qr) => {
    lastQr = qr;
    status = 'qr_pending';
  });

  client.on('ready', () => {
    status = 'ready';
    lastQr = null;
  });

  client.on('disconnected', () => {
    status = 'disabled';
    client = null;
  });

  client.initialize().catch((err) => {
    console.error('فشل تشغيل واتساب:', err.message);
    status = 'error';
  });
}

function getStatus() {
  return { status, lastQr };
}

async function notifyReady(order) {
  if (!isEnabled()) return;
  if (!client || status !== 'ready') {
    await init();
    return;
  }
  if (!order.customer_phone) return;

  const phone = order.customer_phone.replace(/\D/g, '');
  const chatId = `${phone}@c.us`;
  const shopName = settingsService.get('shop_name', 'المطبعة');
  const message = `مرحبًا ${order.customer_name}،\nطلبكم رقم ${order.order_number} جاهز للتسليم الآن.\nشكرًا لتعاملكم مع ${shopName}.`;

  try {
    await client.sendMessage(chatId, message);
  } catch (err) {
    console.error('فشل إرسال رسالة واتساب:', err.message);
  }
}

module.exports = { init, getStatus, notifyReady };
