// نظام التفعيل والترخيص الخاص ببرنامج "مطبعتي - RaqeemOS"
//
// كيف يشتغل:
// 1. عند أول تشغيل، يولّد البرنامج Hardware ID ثابت لهذا الجهاز (من machine-id).
// 2. العميل يرسل الـ Hardware ID لشركة رقيم عبر واتساب.
// 3. شركة رقيم تولّد مفتاح تفعيل (License Key) بأداة generate-license.js المحلية
//    عندها فقط (المفتاح الخاص RSA لا يوصل أبداً لجهاز الزبون).
// 4. البرنامج يتحقق من صحة المفتاح بالمفتاح العام RSA المضمّن هنا (آمن مشاركته).
// 5. بدون مفتاح صالح، Trial تجريبي 7 أيام من أول تشغيل، بعدها يتوقف البرنامج
//    عن العمل إلى أن يُفعَّل.
//
// ملاحظة صريحة: أي حماية محلية (Local DRM) على جهاز الزبون نفسه يمكن نظرياً
// كسرها من مستخدم متمرس جداً (تعديل ساعة النظام، حذف بيانات التفعيل...).
// هذا النظام يرفع العتبة بشكل كبير (لا يوجد Crack جاهز، والمفتاح موقّع RSA
// حقيقي لا يمكن تزويره بدون المفتاح الخاص) لكنه ليس "غير قابل للكسر 100%"
// كما لا يوجد أي نظام ترخيص محلي بالعالم يضمن ذلك فعلياً.

const crypto = require('crypto');
const { machineIdSync } = require('node-machine-id');
const Store = require('electron-store');
const { getLocalStoreKey } = require('./secret');

const TRIAL_DAYS = 14;

// المفتاح العام فقط (آمن تضمينه بالتطبيق) — المفتاح الخاص المطابق له
// موجود فقط بمجلد licensing-vendor/private-key.pem على جهاز شركة رقيم، ولا
// يُشحن أبداً مع البرنامج.
const PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAzO90UppdqgKy9UlblUW9
c5FDnRu58jD94qF6WFSqyXbBAmTyR3hzyCxA10ym3+7YENN2bPPOmV/UUF9piMrY
q1iOYR+3JeXQjYu3sHi/g0bHLoKzwTfOddFalsbSgtDBLg6S5/cgEz+ydAuviyBX
WF78MLd5RIN9XTky7FTNtl+z3bYbNXgF4VM9ikemDLyVueY8TJVRaLCpQTKUENeq
JQ81Evh+3GbXrMhrh1bi1VhDFTamwV9chAAyT5eNFg9csa4Xl4NsYWhx9EiAihQO
PA7CsTgBLGePWMdRczavScd3N8CEeiYJ22eG/N6Z0rAReYro7zwXz93Da15nYQ2h
xQIDAQAB
-----END PUBLIC KEY-----`;

// electron-store مشفّر بمفتاح مشتق من Hardware ID هذا الجهاز تحديداً (انظر
// secret.js) — يحمي من قراءة الملف بمحرر نصوص عادي أو نسخه لجهاز ثاني،
// وليس بديلاً عن سرية المفتاح الخاص RSA نفسه (غير موجود هنا أصلاً).
// clearInvalidConfig: إذا تعذّر فك تشفير الملف (مثلاً بعد تغيير مفتاح
// التشفير، أو نسخ ملف الإعدادات لجهاز آخر بدون قصد) نرجّع لحالة افتراضية
// فارغة بدل ما البرنامج يطيح بخطأ عند الإقلاع.
const store = new Store({
  name: 'raqeem-license',
  encryptionKey: getLocalStoreKey(),
  clearInvalidConfig: true,
});

function getHardwareId() {
  return machineIdSync({ original: true });
}

// يفكّ مفتاح التفعيل (base64url لِـ JSON فيه payload + توقيع RSA) ويتحقق منه.
function verifyLicenseKey(licenseKey, hardwareId = getHardwareId()) {
  try {
    const json = Buffer.from(licenseKey.trim(), 'base64url').toString('utf8');
    const { payload, sig } = JSON.parse(json);
    if (!payload || !sig || !payload.hwid || !payload.exp || !payload.shop) {
      return { valid: false, reason: 'صيغة المفتاح غير صحيحة' };
    }

    const verifier = crypto.createVerify('RSA-SHA256');
    verifier.update(JSON.stringify(payload));
    verifier.end();
    const sigOk = verifier.verify(PUBLIC_KEY, Buffer.from(sig, 'base64url'));
    if (!sigOk) return { valid: false, reason: 'المفتاح غير أصلي (توقيع غير صحيح)' };

    if (payload.hwid !== hardwareId) {
      return { valid: false, reason: 'هذا المفتاح مخصص لجهاز آخر (Hardware ID مختلف)' };
    }

    if (new Date(payload.exp).getTime() < Date.now()) {
      return { valid: false, reason: 'انتهت صلاحية هذا المفتاح' };
    }

    return { valid: true, payload };
  } catch (err) {
    return { valid: false, reason: 'تعذّر قراءة المفتاح' };
  }
}

function activate(licenseKey) {
  const result = verifyLicenseKey(licenseKey);
  if (!result.valid) return result;
  store.set('licenseKey', licenseKey.trim());
  return result;
}

function getTrialStart() {
  let start = store.get('trialStart');
  if (!start) {
    start = Date.now();
    store.set('trialStart', start);
  }
  return start;
}

// الحالة الكاملة المطلوبة لواجهة التفعيل: مرخّص / تجريبي (وكم يوم متبقي) /
// منتهي. لا تتصل بأي سيرفر خارجي — كل شيء محلي بالكامل.
function getLicenseStatus() {
  const hardwareId = getHardwareId();
  const savedKey = store.get('licenseKey');

  if (savedKey) {
    const result = verifyLicenseKey(savedKey, hardwareId);
    if (result.valid) {
      return {
        status: 'licensed',
        hardwareId,
        shop: result.payload.shop,
        expiresAt: result.payload.exp,
      };
    }
    // المفتاح المحفوظ صار غير صالح (جهاز مختلف بعد نسخ المجلد، أو انتهت
    // صلاحيته) — نمسحه ونرجع لحالة تجريبي/منتهي.
    store.delete('licenseKey');
  }

  const trialStart = getTrialStart();
  const daysUsed = (Date.now() - trialStart) / (1000 * 60 * 60 * 24);
  const daysLeft = Math.max(0, Math.ceil(TRIAL_DAYS - daysUsed));

  return {
    status: daysLeft > 0 ? 'trial' : 'expired',
    hardwareId,
    daysLeft,
  };
}

// كلمة سر إضافية لحماية إعدادات الترخيص/النسخ الاحتياطي تحديداً (منفصلة عن
// رمز PIN اليومي لأي مالك) — bcrypt hash محفوظ محلياً، أول استخدام يطلب
// تعيينها.
const bcrypt = require('bcryptjs');

function hasAdminPassword() {
  return !!store.get('adminPasswordHash');
}

function setAdminPassword(password) {
  store.set('adminPasswordHash', bcrypt.hashSync(password, 10));
}

function checkAdminPassword(password) {
  const hash = store.get('adminPasswordHash');
  if (!hash) return false;
  return bcrypt.compareSync(password, hash);
}

// يمسح مفتاح التفعيل المحفوظ بهذا الجهاز (بدون حذف أي بيانات أخرى) — يُستخدم
// لما المالك ينقل ترخيصه لجهاز جديد: الجهاز القديم يرجع لحالة تجريبي/منتهي،
// ثم يطلب مفتاح جديد لِـ Hardware ID الجهاز الجديد بنفس الطريقة العادية.
function deactivate() {
  store.delete('licenseKey');
  return getLicenseStatus();
}

module.exports = {
  TRIAL_DAYS,
  getHardwareId,
  verifyLicenseKey,
  activate,
  deactivate,
  getLicenseStatus,
  hasAdminPassword,
  setAdminPassword,
  checkAdminPassword,
};
