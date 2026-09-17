// وحدة التوقيع المشتركة لمفاتيح التفعيل - يستخدمها كل من:
//   - generate-license.js (أداة سطر الأوامر لتوليد مفتاح يدويًا)
//   - electron/main.js (مولّد المفاتيح داخل واجهة المطوّرة، IPC license:generate)
//   - server/index.js (نفس المولّد لكن من متصفح ويب عادي أثناء التطوير)
//
// لا توزّع هذا الملف ولا مجلد licensing-vendor/ كامل لأي زبون - private-key.pem
// المطلوب هنا هو المفتاح الخاص RSA الحقيقي، ولا يوصل أبداً لجهاز الزبون (مستثنى
// من قائمة "files" بـ package.json).

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ~٧٤ سنة من الآن - يُعرض بالواجهة كـ"مدى الحياة" بدل تاريخ حقيقي، حتى ما
// ينتهي المفتاح عمليًا أبدًا.
const LIFETIME_EXP = '2099-12-31T23:59:59.999Z';

function getPrivateKey() {
  const privateKeyPath = path.join(__dirname, 'private-key.pem');
  if (!fs.existsSync(privateKeyPath)) {
    throw new Error('ما لكيت private-key.pem! لازم يكون بنفس مجلد licensing-vendor/.');
  }
  return fs.readFileSync(privateKeyPath, 'utf8');
}

// duration: 'lifetime' أو رقم أشهر (1، 6، 12...)
function expFromDuration(duration) {
  if (duration === 'lifetime') return LIFETIME_EXP;
  const months = Number(duration);
  if (!months || months <= 0) {
    throw new Error('مدة غير صحيحة - استخدم "lifetime" أو عدد أشهر أكبر من صفر');
  }
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return d.toISOString();
}

// يرجّع مفتاح التفعيل النهائي (base64url) موقّع بالمفتاح الخاص الحقيقي -
// نفس الصيغة بالضبط التي يتحقق منها electron/license.js's verifyLicenseKey.
function signLicense(hwid, shop, exp) {
  const trimmedHwid = String(hwid || '').trim();
  const trimmedShop = String(shop || '').trim();
  if (!trimmedHwid) throw new Error('Hardware ID مطلوب');
  if (!trimmedShop) throw new Error('اسم المحل مطلوب');

  const privateKey = getPrivateKey();
  const payload = { hwid: trimmedHwid, shop: trimmedShop, exp };

  const signer = crypto.createSign('RSA-SHA256');
  signer.update(JSON.stringify(payload));
  signer.end();
  const sig = signer.sign(privateKey).toString('base64url');

  return { key: Buffer.from(JSON.stringify({ payload, sig }), 'utf8').toString('base64url'), payload };
}

module.exports = { signLicense, expFromDuration, LIFETIME_EXP };
