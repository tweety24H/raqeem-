function currentLocale() {
  try {
    return localStorage.getItem('lang') === 'en' ? 'en-US' : 'ar-IQ';
  } catch {
    return 'ar-IQ';
  }
}

// خصم بمرحلتين (أساسي + إضافي اختياري)، كل مرحلة نسبة % أو مبلغ ثابت —
// يبني نص عرض موحّد يُستخدم بنفس الشكل بفورم الطلب، تفاصيل الطلب، والفاتورة.
// يقبل إما order من قاعدة البيانات (discount_type/discount_value/...) أو
// state فورم الطلب قبل الحفظ، بنفس أسماء الحقول.
export function formatDiscountLabel(d) {
  const total = Number(d.discount) || 0;
  const type1 = d.discount_type === 'percent' ? 'percent' : 'fixed';
  const val1 = Number(d.discount_value) || 0;
  const type2 = d.discount_after_type === 'percent' ? 'percent' : 'fixed';
  const val2 = Number(d.discount_after_value) || 0;

  const segs = [];
  if (val1 > 0) segs.push(type1 === 'percent' ? `${val1}%` : formatIQD(val1));
  if (val2 > 0) segs.push(type2 === 'percent' ? `${val2}%` : formatIQD(val2));

  if (segs.length === 0) return formatIQD(total);
  // خصم ثابت وحيد بلا مرحلة إضافية: المبلغ يساوي القيمة نفسها، ما نحتاج تكراره.
  if (segs.length === 1 && type1 === 'fixed' && val2 === 0) return formatIQD(total);
  return `${segs.join(' + ')} (${formatIQD(total)})`;
}

// بادج مختصر لقوائم الطلبات — الخصم الأساسي فقط، بلا احتساب المرحلة الإضافية.
export function formatDiscountBadge(d) {
  const type1 = d.discount_type === 'percent' ? 'percent' : 'fixed';
  const val1 = Number(d.discount_value) || Number(d.discount) || 0;
  if (val1 <= 0) return null;
  return type1 === 'percent' ? `${val1}%` : formatIQD(val1);
}

export function formatIQD(amount) {
  const n = Number(amount) || 0;
  return `${n.toLocaleString('en-US', { maximumFractionDigits: 0 })} د.ع`;
}

export function formatDate(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr.replace(' ', 'T'));
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString(currentLocale(), { year: 'numeric', month: '2-digit', day: '2-digit' });
}

export function formatDateTime(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr.replace(' ', 'T'));
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleString(currentLocale(), {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// "قبل 5 دقائق" / "5 minutes ago" — uses the native Intl.RelativeTimeFormat
// (correct Arabic plural forms for free) instead of a hand-rolled library.
// Falls back to an absolute date once it's more than ~30 days old.
export function formatRelativeTime(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr.replace(' ', 'T'));
  if (Number.isNaN(d.getTime())) return dateStr;
  const diffSec = Math.round((d.getTime() - Date.now()) / 1000);
  const rtf = new Intl.RelativeTimeFormat(currentLocale(), { numeric: 'auto' });
  const abs = Math.abs(diffSec);
  if (abs < 60) return rtf.format(diffSec, 'second');
  const diffMin = Math.round(diffSec / 60);
  if (Math.abs(diffMin) < 60) return rtf.format(diffMin, 'minute');
  const diffHr = Math.round(diffMin / 60);
  if (Math.abs(diffHr) < 24) return rtf.format(diffHr, 'hour');
  const diffDay = Math.round(diffHr / 24);
  if (Math.abs(diffDay) < 30) return rtf.format(diffDay, 'day');
  return formatDate(dateStr);
}
