// واتساب محلي عبر whatsapp-web.js (يعمل بدون أي خدمة سحابية طرف ثالث).
// المكتبة ثقيلة (تحمّل Chromium)، لذا تُحمَّل فقط عند التفعيل من الإعدادات
// حتى لا يُثقل التثبيت الأولي لمن لا يحتاج هذه الميزة.
//
// للتفعيل: npm install whatsapp-web.js
// ثم فعّل "الإرسال التلقائي عبر واتساب" من صفحة الإعدادات.
//
// الحدث-محور لا Polling: هذا الملف لا يفحص أي حالة بشكل دوري بنفسه —
// client.on('qr'/'ready'/'disconnected') تحدّث المتغيرات هنا فقط عند تغيّر
// حقيقي بحالة اتصال واتساب. الفرونت (Settings.jsx) هو من يفحص GET
// /api/settings/whatsapp/status كل بضع ثوانٍ لعرض آخر حالة معروفة — لا يوجد
// أي حلقة/setInterval هنا بالباك اند.

const fs = require('fs');
const path = require('path');
const settingsService = require('./settingsService');

const SESSION_DIR = process.env.RAQEEM_DB_DIR || path.join(__dirname, '..', '..');

let client = null;
let status = 'disabled'; // disabled | initializing | qr_pending | ready | error
let lastQr = null;
let qrGeneratedAt = null;
let phoneNumber = null;

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
    console.warn('خدمة واتساب غير مثبتة. لتفعيلها نفّذ: npm install whatsapp-web.js');
    return;
  }

  const { Client, LocalAuth } = WAModule;
  status = 'initializing';
  client = new Client({
    authStrategy: new LocalAuth({ dataPath: SESSION_DIR }),
    puppeteer: { headless: true, args: ['--no-sandbox'] },
  });

  client.on('qr', (qr) => {
    lastQr = qr;
    qrGeneratedAt = Date.now();
    status = 'qr_pending';
  });

  client.on('ready', () => {
    status = 'ready';
    lastQr = null;
    qrGeneratedAt = null;
    phoneNumber = client.info?.wid?.user || null;
  });

  client.on('disconnected', () => {
    status = 'disabled';
    client = null;
    lastQr = null;
    qrGeneratedAt = null;
    phoneNumber = null;
  });

  client.initialize().catch((err) => {
    console.error('فشل تشغيل واتساب:', err.message);
    status = 'error';
    client = null;
  });
}

function getStatus() {
  return { status, lastQr, qrGeneratedAt, phoneNumber };
}

// يقطع الاتصال الحالي ويمسح جلسة الاقتران المحفوظة محليًا، حتى يرجع المستخدم
// يبدأ اقتران جديد من الصفر (كود QR جديد) بدل ما يعلق على جلسة قديمة معطوبة.
async function disconnect() {
  if (client) {
    try {
      await client.destroy();
    } catch {
      /* تجاهل — سنمسح الجلسة يدويًا بأي حال */
    }
  }
  client = null;
  status = 'disabled';
  lastQr = null;
  qrGeneratedAt = null;
  phoneNumber = null;

  const authDir = path.join(SESSION_DIR, '.wwebjs_auth');
  fs.rm(authDir, { recursive: true, force: true }, () => {});
}

async function notifyReady(order) {
  if (!isEnabled()) return;
  if (!client || status !== 'ready') {
    await init();
    return;
  }
  if (!order.customer_phone) return;

  // رقم الزبون محفوظ بصيغة محلية عراقية (0784...)، لكن واتساب يحتاج الصيغة
  // الدولية بدون الصفر البادئ (964784...) وإلا يفشل الإرسال بصمت.
  const digits = order.customer_phone.replace(/\D/g, '');
  const intlPhone = digits.startsWith('964') ? digits : digits.startsWith('0') ? `964${digits.slice(1)}` : `964${digits}`;
  const chatId = `${intlPhone}@c.us`;
  const shopName = settingsService.get('shop_name', 'المطبعة');
  const message = `مرحبًا ${order.customer_name}،\nطلبكم رقم ${order.order_number} جاهز للتسليم الآن.\nشكرًا لتعاملكم مع ${shopName}.`;

  try {
    await client.sendMessage(chatId, message);
  } catch (err) {
    console.error('فشل إرسال رسالة واتساب:', err.message);
  }
}

module.exports = { init, getStatus, notifyReady, disconnect };
