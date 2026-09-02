import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api, { fileUrl } from '../api/client';
import { formatIQD, formatDateTime } from '../utils/format';

export default function Receipt() {
  const { id } = useParams();
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get(`/orders/${id}/receipt`).then((r) => setData(r.data));
  }, [id]);

  if (!data) return <div className="p-6 text-slate-400">جاري التحميل...</div>;

  const { order, items, settings, qrDataUrl } = data;
  const primary = settings.receipt_primary_color || '#1B2A6B';
  const accent = settings.receipt_accent_color || '#D4AF37';

  return (
    <div className="min-h-screen bg-slate-100 py-8 print:bg-white print:py-0">
      <div className="no-print mx-auto mb-4 max-w-2xl text-left">
        <button onClick={() => window.print()} className="rounded-lg px-4 py-2 text-white" style={{ background: primary }}>
          🖨️ طباعة
        </button>
      </div>

      <div
        className="mx-auto max-w-2xl overflow-hidden rounded-xl bg-white shadow-lg print:shadow-none print:rounded-none"
        style={{ border: `2px solid ${accent}` }}
      >
        <div className="flex items-center justify-between px-8 py-6 text-white" style={{ background: primary }}>
          <div className="flex items-center gap-3">
            {settings.shop_logo_path && (
              <img src={fileUrl(settings.shop_logo_path)} alt="شعار" className="h-14 w-14 rounded-full bg-white object-contain p-1" />
            )}
            <div>
              <div className="text-xl font-bold">{settings.shop_name}</div>
              {settings.shop_address && <div className="text-xs opacity-80">{settings.shop_address}</div>}
            </div>
          </div>
          <div className="text-left text-sm" style={{ color: accent }}>
            <div className="font-bold">فاتورة #{order.order_number}</div>
            <div className="text-white/80">{formatDateTime(order.created_at)}</div>
          </div>
        </div>

        <div className="px-8 py-5">
          <div className="mb-5 flex justify-between text-sm">
            <div>
              <div className="text-slate-400">الزبون</div>
              <div className="font-semibold text-slate-800">{order.customer_name}</div>
            </div>
            <div className="text-left">
              <div className="text-slate-400">الهاتف</div>
              <div className="font-semibold text-slate-800">{order.customer_phone || '-'}</div>
            </div>
          </div>

          <table className="mb-4 w-full text-sm">
            <thead>
              <tr style={{ borderBottom: `2px solid ${accent}` }}>
                <th className="py-2 text-right text-slate-600">الوصف</th>
                <th className="py-2 text-right text-slate-600">الكمية</th>
                <th className="py-2 text-right text-slate-600">سعر الوحدة</th>
                <th className="py-2 text-right text-slate-600">المجموع</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.id} className="border-b border-slate-100">
                  <td className="py-2">{it.description || it.service_name}</td>
                  <td className="py-2">{it.quantity}</td>
                  <td className="py-2">{formatIQD(it.unit_price)}</td>
                  <td className="py-2 font-medium">{formatIQD(it.total_price)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mb-5 flex justify-end">
            <div className="w-56 text-sm">
              <div className="flex justify-between py-1 text-slate-500">
                <span>المجموع الفرعي</span>
                <span>{formatIQD(order.subtotal)}</span>
              </div>
              <div className="flex justify-between py-1 text-slate-500">
                <span>الخصم</span>
                <span>- {formatIQD(order.discount)}</span>
              </div>
              <div
                className="mt-1 flex justify-between rounded-lg px-2 py-2 text-base font-bold text-white"
                style={{ background: primary }}
              >
                <span>الإجمالي</span>
                <span>{formatIQD(order.total_price)}</span>
              </div>
              <div className="mt-1 flex justify-between py-1 text-xs text-slate-400">
                <span>المدفوع</span>
                <span>{formatIQD(order.paid_amount)}</span>
              </div>
              {order.total_price - order.paid_amount > 0 && (
                <div className="flex justify-between py-1 text-xs font-semibold text-rose-600">
                  <span>المتبقي</span>
                  <span>{formatIQD(order.total_price - order.paid_amount)}</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-end justify-between border-t border-dashed border-slate-200 pt-4">
            <div className="text-xs text-slate-400">
              {settings.shop_address}
              <br />
              {settings.shop_phone}
            </div>
            {qrDataUrl && <img src={qrDataUrl} alt="QR" className="h-20 w-20" />}
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white; }
        }
      `}</style>
    </div>
  );
}
