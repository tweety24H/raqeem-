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
