function currentLocale() {
  try {
    return localStorage.getItem('lang') === 'en' ? 'en-US' : 'ar-IQ';
  } catch {
    return 'ar-IQ';
  }
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
