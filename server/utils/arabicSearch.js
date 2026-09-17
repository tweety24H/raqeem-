// أداة توحيد النص العربي للبحث (Arabic search normalization).
//
// المشكلة: نفس الاسم ممكن يُكتب بعدة أشكال ("أحمد" / "احمد"، "حمزة" / "حمزه"،
// "علي" / "على") والمستخدم يتوقع أن يجدها كلها ببحث واحد. الحل: نطبّع النص —
// نشيل التشكيل، نوحّد أشكال الألف والهمزة، ونوحّد التاء المربوطة والألف
// المقصورة — قبل المقارنة، وبنفس الطريقة على النص المخزّن وعلى نص البحث.
//
// ملاحظة: هذا التوحيد يُستخدم فقط للمطابقة (search_name) — الاسم الأصلي
// المدخل من المستخدم يبقى كما هو في عمود name ولا يُغيَّر أبدًا.

// جميع علامات التشكيل (fatha, damma, kasra, shadda, tanween, sukun, إلخ)
const TASHKEEL_REGEX = /[ً-ٟؐ-ؚۖ-ۜ۟-۪ۨ-ٰۭ]/g;

// أشكال الألف والهمزة المختلفة -> ا
const ALEF_HAMZA_REGEX = /[أإآٱءؤئ]/g;

function normalizeArabic(text) {
  if (text === null || text === undefined) return '';
  let s = String(text);

  // 1) إزالة التشكيل
  s = s.replace(TASHKEEL_REGEX, '');

  // 2) توحيد أشكال الألف/الهمزة -> ا
  s = s.replace(ALEF_HAMZA_REGEX, 'ا');

  // 3) التاء المربوطة -> ه
  s = s.replace(/ة/g, 'ه');

  // 4) الألف المقصورة -> ي
  s = s.replace(/ى/g, 'ي');

  // 5) حذف أي محارف تمديد (tatweel) قد تُدرج بين الحروف
  s = s.replace(/ـ/g, '');

  // 6) trim + lower case (يفيد النصوص اللاتينية المختلطة) + توحيد المسافات
  s = s.trim().toLowerCase().replace(/\s+/g, ' ');

  return s;
}

module.exports = { normalizeArabic };
