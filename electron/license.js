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
const fs = require('fs');
const os = require('os');
const path = require('path');
const { machineIdSync } = require('node-machine-id');
const Store = require('electron-store');
const { getLocalStoreKey } = require('./secret');

const TRIAL_DAYS = 14;

// أقصى مدة تراجع بساعة النظام نتساهل بيها قبل ما نعتبرها "تلاعب" — أكبر من
// أي انتقال توقيت صيفي/شتوي عادي (~ساعة وحدة) أو انحراف ساعة بسيط، بس تكفي
// لضبط أي حد يرجّع الساعة لورا عمداً حتى "يفرّغ" أيام التجربة المستهلكة.
const CLOCK_TAMPER_TOLERANCE_MS = 3 * 60 * 60 * 1000; // 3 ساعات

// نسخة احتياطية من تاريخ بداية التجربة، بمكان منفصل تماماً عن مجلد بيانات
// التطبيق (%APPDATA%/raqeem-license) اللي يمسحه أي حذف عادي لبيانات
// البرنامج أو إعادة تثبيته. حذف واحد بس ما يكفي لتصفير التجربة - نقرأ
// الاثنين ونعتمد أقدم تاريخ موجود فعلاً.
const TRIAL_MARKER_DIR = path.join(os.homedir(), '.raqeemos_sys');
const TRIAL_MARKER_PATH = path.join(TRIAL_MARKER_DIR, '.trial_marker');
const MARKER_PEPPER = 'raqeem-trial-marker-v1-x7Lk2';

function encodeMarker(value) {
  const payload = JSON.stringify({ v: value });
  const hash = crypto.createHash('sha256').update(payload + MARKER_PEPPER).digest('hex').slice(0, 16);
  return Buffer.from(`${hash}:${payload}`, 'utf8').toString('base64');
}

// يرجّع الرقم المخزون بالملف، أو null إذا الملف مو موجود أو تلاعب أحد بمحتواه
// يدوياً (الـ hash ما يطابق).
function decodeMarker(encoded) {
  try {
    const raw = Buffer.from(encoded, 'base64').toString('utf8');
    const sep = raw.indexOf(':');
    const hash = raw.slice(0, sep);
    const payload = raw.slice(sep + 1);
    const expected = crypto.createHash('sha256').update(payload + MARKER_PEPPER).digest('hex').slice(0, 16);
    if (hash !== expected) return null;
    const { v } = JSON.parse(payload);
    return typeof v === 'number' ? v : null;
  } catch {
    return null;
  }
}

function readTrialMarker() {
  try {
    return decodeMarker(fs.readFileSync(TRIAL_MARKER_PATH, 'utf8'));
  } catch {
    return null;
  }
}

function writeTrialMarker(value) {
  try {
    fs.mkdirSync(TRIAL_MARKER_DIR, { recursive: true });
    // لازم نشيل صفة الإخفاء أول (إذا الملف موجود من كتابة سابقة) قبل ما
    // نكتب فوقه من جديد - وإلا Windows يرفض الكتابة بخطأ EPERM على أي ملف
    // مخفي، يعني كل تحديث بعد أول مرة كان يفشل بصمت (try/catch يبلعه) وتضل
    // العلامة عالقة على قيمتها الأولى للأبد. اكتشفناها فعلياً أثناء الاختبار.
    try {
      require('child_process').execSync(`attrib -h "${TRIAL_MARKER_PATH}"`, { stdio: 'ignore' });
    } catch {
      /* الملف غير موجود أصلاً (أول كتابة) - طبيعي تمامًا، نتجاهل */
    }
    fs.writeFileSync(TRIAL_MARKER_PATH, encodeMarker(value));
    // نرجّعه مخفي حتى لا يبين بمتصفح الملفات العادي - محاولة تجميلية بس،
    // فشلها (مثلاً بغير ويندوز) ما يوقف شي.
    try {
      require('child_process').execSync(`attrib +h "${TRIAL_MARKER_PATH}"`, { stdio: 'ignore' });
    } catch {
      /* تجاهل - مو حرج */
    }
  } catch {
    /* تجاهل - لو تعذّر الكتابة (صلاحيات...) يضل النظام شغال بالنسخة الأساسية بالـ store فقط */
  }
}

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

// تاريخ بداية التجربة الفعلي = أقدم قيمة موجودة بين electron-store وملف
// العلامة الاحتياطي. حذف أحدهما بس (تصفير بيانات البرنامج، أو حذف الملف
// المخفي يدوياً) ما يفيد طالما الثاني لسا موجود - والاثنين يتحدّثوا لبعض
// أول ما نلقى قيمة صحيحة بواحد وناقصة أو أحدث بالثاني.
// `now`: نفس الوقت اللي getLicenseStatus() تحسب عليه daysUsed لاحقاً - نمرره
// بدل ما نسوي Date.now() ثانية هنا، لأنه لو انسوت بمكانين منفصلين ينتج فرق
// نانو-ثانية بينهم (استدعاء هذا الملف يجي بعد استدعاء "now" بالدالة اللي
// تنادينا)، وبأول تشغيل هذا يخلي trialStart أكبر شوي من now فيصير daysUsed
// سالب شوي و Math.ceil(14 - سالب) = 15 بدل 14. لقيناها فعلياً بالاختبار.
function getTrialStart(now = Date.now()) {
  const fromStore = store.get('trialStart');
  const fromMarker = readTrialMarker();

  let start;
  if (fromStore && fromMarker) {
    start = Math.min(fromStore, fromMarker);
  } else if (fromStore || fromMarker) {
    start = fromStore || fromMarker;
  } else {
    start = now;
  }

  if (fromStore !== start) store.set('trialStart', start);
  if (fromMarker !== start) writeTrialMarker(start);

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

  // كشف تلاعب الساعة: نسجّل أحدث وقت شفناه فعلياً بالجهاز (lastSeen)، وإذا
  // الوقت الحالي رجع لورا عن آخر مرة بأكثر من فرق التساهل، معناها أحد رجّع
  // ساعة النظام عمداً (أو الجهاز عنده مشكلة ساعة حقيقية - بالحالتين نوقف
  // العد بدل ما نمنح أيام تجربة إضافية مجانية).
  const now = Date.now();
  const lastSeen = store.get('lastSeen') || 0;
  if (lastSeen && now < lastSeen - CLOCK_TAMPER_TOLERANCE_MS) {
    return {
      status: 'expired',
      reason: 'clock_tamper',
      hardwareId,
      daysLeft: 0,
    };
  }
  store.set('lastSeen', Math.max(now, lastSeen));

  const trialStart = getTrialStart(now);
  const daysUsed = (now - trialStart) / (1000 * 60 * 60 * 24);
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
