// أداة توليد مفاتيح التفعيل - خاصة بشركة رقيم فقط
// لا توزّع هذا الملف ولا مجلد licensing-vendor/ لأي زبون - فيه المفتاح الخاص.
//
// الاستخدام:
//   node licensing-vendor/generate-license.js --hwid <ID> --shop "اسم المحل" --lifetime
//   node licensing-vendor/generate-license.js --hwid <ID> --shop "اسم المحل" --months 1
//   node licensing-vendor/generate-license.js --hwid <ID> --shop "اسم المحل" --months 12
//
// --lifetime يعطي مفتاح مدى الحياة (صلاحية حتى 2099-12-31).
// --months N يعطي مفتاح صالح لـ N شهر من تاريخ اليوم.

const { signLicense, expFromDuration } = require('./sign');

function parseArgs(argv) {
  const args = { hwid: null, shop: null, lifetime: false, months: null };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--hwid') args.hwid = argv[++i];
    else if (arg === '--shop') args.shop = argv[++i];
    else if (arg === '--lifetime') args.lifetime = true;
    else if (arg === '--months') args.months = Number(argv[++i]);
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));

if (!args.hwid || !args.shop || (!args.lifetime && !args.months)) {
  console.log(`الاستخدام:
  node licensing-vendor/generate-license.js --hwid <Hardware ID> --shop "اسم المحل" --lifetime
  node licensing-vendor/generate-license.js --hwid <Hardware ID> --shop "اسم المحل" --months <عدد الأشهر>`);
  process.exit(1);
}

try {
  const duration = args.lifetime ? 'lifetime' : args.months;
  const exp = expFromDuration(duration);
  const { key, payload } = signLicense(args.hwid, args.shop, exp);

  console.log('\n=== مفتاح التفعيل ===');
  console.log(key);
  console.log('\n=== تفاصيل ===');
  console.log('المحل:', payload.shop);
  console.log('Hardware ID:', payload.hwid);
  console.log(
    'صالح لغاية:',
    new Date(exp).toLocaleDateString('ar-IQ'),
    args.lifetime ? '(مدى الحياة)' : `(${args.months} شهر)`
  );
  console.log('\nانسخ السطر تحت "مفتاح التفعيل" وأرسله للزبون كامل بدون فراغات إضافية.\n');
} catch (err) {
  console.error('خطأ:', err.message);
  process.exit(1);
}
