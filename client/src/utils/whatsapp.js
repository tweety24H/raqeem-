import { formatIQD } from './format';

export function toWhatsAppPhone(phone) {
  const digits = (phone || '').replace(/\D/g, '');
  if (!digits) return null;
  if (digits.startsWith('964')) return digits;
  if (digits.startsWith('0')) return `964${digits.slice(1)}`;
  return `964${digits}`;
}

export function buildDebtReminderLink(customer) {
  const waPhone = toWhatsAppPhone(customer.phone);
  if (!waPhone) return null;
  const message = `مرحبا ${customer.name}، متبقي عليك مبلغ ${formatIQD(customer.debt)} لدى مطبعتنا. نرجو التواصل لتسديد المبلغ في أقرب وقت. شكرًا لتعاملكم معنا.`;
  return `https://wa.me/${waPhone}?text=${encodeURIComponent(message)}`;
}

export function buildStockAlertLink(lowItems, shopPhone) {
  const waPhone = toWhatsAppPhone(shopPhone);
  if (!waPhone || !lowItems || lowItems.length === 0) return null;
  const lines = lowItems
    .map((i) => `- ${i.name}: ${i.quantity} ${i.unit} (الحد الأدنى ${i.min_quantity})`)
    .join('\n');
  const message = `تنبيه مخزون منخفض في المطبعة:\n${lines}`;
  return `https://wa.me/${waPhone}?text=${encodeURIComponent(message)}`;
}
