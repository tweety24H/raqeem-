import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api, { fileUrl } from '../api/client';
import VerifyQR from '../components/VerifyQR';
import { useLanguage } from '../context/LanguageContext';
import { formatIQD, formatDateTime, formatDiscountLabel } from '../utils/format';

const GOLD = '#C9A94A';
const GOLD_DARK = '#8a6d10';
const CREAM = '#FBF6EA';
const NAVY = '#1B2A6B';

// هاي صفحة الفاتورة القابلة للطباعة - نفس تصميمها يطبع ويطلع PDF لما
// تستخدم زر الطباعة، وفيها رمز QR يقدر الزبون يمسحه يتحقق من صحة الفاتورة
export default function Receipt() {
  const { t } = useLanguage();
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [qrMode, setQrMode] = useState('order'); // order | whatsapp

  useEffect(() => {
    api.get(`/orders/${id}/receipt`).then((r) => setData(r.data));
  }, [id]);

  if (!data) return <div className="p-6 text-slate-400">{t('common.loading')}</div>;

  const { order, items, settings, qrWhatsappDataUrl } = data;
  // الباقي على الزبون = الإجمالي بعد الخصم ناقص اللي دفعه لحد الآن
  const remaining = order.total_price - order.paid_amount;

  return (
    <div className="min-h-screen bg-stone-200 py-8 print:bg-white print:py-0">
      <div className="print:hidden mx-auto mb-4 flex max-w-2xl items-center justify-between px-4">
        {qrWhatsappDataUrl ? (
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>{t('receipt.qrLabel')}</span>
            <button
              onClick={() => setQrMode('order')}
              className={`rounded-lg px-2 py-1 ${qrMode === 'order' ? 'text-white' : 'bg-slate-200'}`}
              style={qrMode === 'order' ? { background: NAVY } : undefined}
            >
              {t('receipt.qrOrderInfo')}
            </button>
            <button
              onClick={() => setQrMode('whatsapp')}
              className={`rounded-lg px-2 py-1 ${qrMode === 'whatsapp' ? 'text-white' : 'bg-slate-200'}`}
              style={qrMode === 'whatsapp' ? { background: NAVY } : undefined}
            >
              {t('receipt.qrWhatsapp')}
            </button>
          </div>
        ) : (
          <span />
        )}
        <div className="flex items-center gap-2">
          {/* الاثنين يفتحون نفس نافذة الطباعة — "تحميل PDF" يعتمد على خيار
              "حفظ كـ PDF" الجاهز بمربع الطباعة (ما يحتاج مكتبة PDF إضافية). */}
          <button onClick={() => window.print()} className="btn print:hidden">
            🖨️ {t('receipt.printBtn')}
          </button>
          <button onClick={() => window.print()} className="btn-gold print:hidden">
            ⬇️ تحميل PDF
          </button>
        </div>
      </div>

      <div className="mx-auto flex max-w-2xl justify-center px-4 print:px-0">
        <div
          dir="rtl"
          className="receipt-frame w-full p-2"
          style={{ background: CREAM, border: `1px solid ${GOLD}`, boxShadow: `0 0 0 5px ${CREAM}, 0 0 0 6px ${GOLD}` }}
        >
          {/* هيدر نيلي/ذهبي — شعار رقيم فوق البطاقة الكريمية التقليدية */}
          <div className="-m-2 mb-2 bg-nili px-6 py-4 text-center">
            <p className="font-display text-2xl font-bold tracking-wide text-gold">رقيم</p>
            <p className="mt-0.5 text-[11px] text-slate-300">مطبعتك.. بأرقام</p>
          </div>

          <div className="relative p-6 sm:p-10">
            <Corner className="right-1 top-1" />
            <Corner className="left-1 top-1 -scale-x-100" />
            <Corner className="right-1 bottom-1 -scale-y-100" />
            <Corner className="left-1 bottom-1 -scale-x-100 -scale-y-100" />

            {/* الرأس */}
            <div className="text-center">
              {settings.shop_logo_path && (
                <img
                  src={fileUrl(settings.shop_logo_path)}
                  alt={t('receipt.logoAlt')}
                  className="mx-auto mb-3 h-14 w-14 rounded-full bg-white object-contain p-1"
                  style={{ border: `1px solid ${GOLD}` }}
                />
              )}
              <p className="text-4xl font-bold" style={{ fontFamily: "'Aref Ruqaa', 'IBM Plex Sans Arabic', serif", color: NAVY }}>
                فاتورة
              </p>
              <div className="mx-auto mt-2 flex items-center justify-center gap-2" style={{ color: GOLD }}>
                <span className="h-px w-10" style={{ background: GOLD }} />
                <span>❖</span>
                <span className="h-px w-10" style={{ background: GOLD }} />
              </div>
              <p className="mt-2 text-sm font-semibold text-stone-500" style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}>
                {settings.shop_name}
              </p>
              {(settings.shop_phone || settings.shop_address) && (
                <p className="mt-0.5 text-[11px] text-stone-400" style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}>
                  {[settings.shop_phone, settings.shop_address].filter(Boolean).join(' · ')}
                </p>
              )}
            </div>

            <div
              className="mt-6 flex justify-center gap-10 text-center text-sm"
              style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif", fontVariantNumeric: 'tabular-nums' }}
            >
              <div>
                <p className="text-[11px] text-stone-400">{t('receipt.invoicePrefix')}</p>
                <p className="mt-0.5 font-bold text-stone-700">{order.order_number}</p>
              </div>
              <div>
                <p className="text-[11px] text-stone-400">{t('common.createdAt')}</p>
                <p className="mt-0.5 font-bold text-stone-700">{formatDateTime(order.created_at)}</p>
              </div>
            </div>

            <div
              className="mt-6 flex justify-center gap-10 text-center text-sm"
              style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}
            >
              <div>
                <p className="text-[11px] text-stone-400">{t('common.customer')}</p>
                <p className="mt-0.5 font-bold text-stone-700">{order.customer_name}</p>
              </div>
              {order.customer_phone && (
                <div>
                  <p className="text-[11px] text-stone-400">{t('common.phone')}</p>
                  <p className="mt-0.5 font-bold text-stone-700" style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {order.customer_phone}
                  </p>
                </div>
              )}
            </div>

            {/* الجدول */}
            <table className="mt-6 w-full text-sm" style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif", borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `3px double ${GOLD}` }} className="text-[11px] text-stone-500">
                  <th className="py-1.5 text-right font-medium">{t('common.description')}</th>
                  <th className="py-1.5 text-center font-medium">{t('common.quantity')}</th>
                  <th className="py-1.5 text-center font-medium">{t('common.unitPrice')}</th>
                  <th className="py-1.5 text-left font-medium">{t('common.total')}</th>
                </tr>
              </thead>
              <tbody style={{ fontVariantNumeric: 'tabular-nums' }}>
                {items.map((it) => (
                  <tr key={it.id} style={{ borderBottom: '1px solid #e7dcbd' }}>
                    <td className="py-2 text-stone-700">{it.description || it.service_name}</td>
                    <td className="py-2 text-center text-stone-700">{it.quantity}</td>
                    <td className="py-2 text-center text-stone-700">{formatIQD(it.unit_price)}</td>
                    <td className="py-2 text-left font-bold text-stone-800">{formatIQD(it.total_price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* الإجمالي */}
            <div
              className="mt-6 space-y-1.5 text-sm"
              style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif", borderTop: `3px double ${GOLD}`, paddingTop: 12 }}
            >
              <div className="flex justify-between text-stone-500">
                <span>{t('common.subtotal')}</span>
                <span style={{ fontVariantNumeric: 'tabular-nums' }}>{formatIQD(order.subtotal)}</span>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between text-stone-500">
                  <span>{t('common.discount')}</span>
                  <span style={{ fontVariantNumeric: 'tabular-nums' }}>- {formatDiscountLabel(order)}</span>
                </div>
              )}
              <div className="flex justify-between rounded-lg bg-nili px-3 py-2 text-base font-bold text-white">
                <span style={{ fontFamily: "'Aref Ruqaa', serif" }}>{t('common.grandTotal')}</span>
                <span style={{ fontVariantNumeric: 'tabular-nums' }}>{formatIQD(order.total_price)}</span>
              </div>
              <div className="flex justify-between text-xs text-stone-500">
                <span>{t('common.paid')}</span>
                <span style={{ fontVariantNumeric: 'tabular-nums' }}>{formatIQD(order.paid_amount)}</span>
              </div>
              {remaining > 0 && (
                <div className="flex justify-between text-sm font-bold" style={{ color: GOLD_DARK }}>
                  <span style={{ fontFamily: "'Aref Ruqaa', serif" }}>{t('common.remaining')}</span>
                  <span style={{ fontVariantNumeric: 'tabular-nums' }}>{formatIQD(remaining)}</span>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-center">
              {qrMode === 'whatsapp' && qrWhatsappDataUrl ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="rounded-lg p-2" style={{ border: `1px solid ${GOLD}` }}>
                    <img src={qrWhatsappDataUrl} alt="QR" className="h-20 w-20" />
                  </div>
                  <p className="text-center text-[11px] text-stone-400" style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}>
                    {t('receipt.qrWhatsapp')}
                  </p>
                </div>
              ) : (
                <VerifyQR orderNumber={order.order_number} logoUrl={settings.shop_logo_path ? fileUrl(settings.shop_logo_path) : null} />
              )}
            </div>

            <div className="mt-8 flex justify-between text-xs text-stone-400" style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}>
              <span>{t('receipt.customerSignature')}: ______</span>
              <span>{t('receipt.staffSignature')}: ______</span>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          body { background: white; }
          .receipt-frame, .receipt-frame * {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>
    </div>
  );
}

function Corner({ className }) {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" className={`absolute ${className}`} style={{ color: GOLD }}>
      <path d="M2 20V6a4 4 0 0 1 4-4h14" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="2" cy="20" r="1.5" fill="currentColor" />
    </svg>
  );
}
