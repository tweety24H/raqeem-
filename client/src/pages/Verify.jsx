import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api, { fileUrl } from '../api/client';
import VerifyQR from '../components/VerifyQR';
import LanguageToggle from '../components/LanguageToggle';
import ThemeToggle from '../components/ThemeToggle';
import { useLanguage } from '../context/LanguageContext';
import { formatIQD, formatDate } from '../utils/format';

const GOLD = '#C9A94A';
const GOLD_DARK = '#8a6d10';
const CREAM = '#FBF6EA';
const NAVY = '#1B2A6B';

function statusMeta(status, t) {
  if (status === 'جديد') return { icon: '🟡', label: t('verify.statusTodo'), fg: '#92400e', bg: '#fef3c7' };
  if (status === 'قيد التصميم' || status === 'قيد الطباعة')
    return { icon: '🔵', label: t('verify.statusInProgress'), fg: '#1e40af', bg: '#dbeafe' };
  if (status === 'جاهز للتسليم') return { icon: '🟢', label: t('verify.statusReady'), fg: '#065f46', bg: '#d1fae5' };
  if (status === 'تم التسليم') return { icon: '✅', label: t('verify.statusDelivered'), fg: '#065f46', bg: '#d1fae5' };
  return { icon: '⚪', label: status, fg: '#475569', bg: '#f1f5f9' };
}

export default function Verify() {
  const { t } = useLanguage();
  const { orderNumber } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [reordered, setReordered] = useState(false);

  useEffect(() => {
    setData(null);
    setNotFound(false);
    api
      .get(`/public/verify/${orderNumber}`)
      .then((r) => setData(r.data))
      .catch(() => setNotFound(true));
  }, [orderNumber]);

  function reorder() {
    localStorage.setItem(
      'raqeem_reorder_draft',
      JSON.stringify({
        customerName: data.order.customer_name,
        items: data.order.items,
      })
    );
    setReordered(true);
    navigate('/orders/new');
  }

  function shareWhatsapp() {
    const url = window.location.href;
    const message = `${t('verify.shareMessage')} — ${orderNumber}\n${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  }

  return (
    <div dir="rtl" className="min-h-screen bg-stone-100 dark:bg-[#0a0a0f]">
      <header className="no-print flex items-center justify-between border-b border-stone-200 bg-white px-4 py-3 dark:border-violet-500/20 dark:bg-[#0a0a0f]">
        <div className="flex items-center gap-2">
          <span className="text-xl">🖨️</span>
          <span className="font-bold text-slate-800 dark:text-slate-100">RaqeemOS</span>
        </div>
        <div className="flex items-center gap-2">
          <LanguageToggle />
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-md px-4 py-10">
        {!data && !notFound && (
          <p className="py-20 text-center text-stone-400 dark:text-stone-500">{t('verify.loading')}</p>
        )}

        {notFound && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center dark:border-rose-500/30 dark:bg-rose-500/10">
            <p className="mb-2 text-4xl">⚠️</p>
            <h1 className="mb-2 text-lg font-bold text-rose-700 dark:text-rose-300">{t('verify.notFoundTitle')}</h1>
            <p className="text-sm text-rose-600 dark:text-rose-300">{t('verify.notFoundBody')}</p>
          </div>
        )}

        {data && (
          <>
            <div
              className="relative p-2"
              style={{ background: CREAM, border: `1px solid ${GOLD}`, boxShadow: `0 0 0 5px ${CREAM}, 0 0 0 6px ${GOLD}` }}
            >
              <div className="relative p-6">
                <Corner className="right-1 top-1" />
                <Corner className="left-1 top-1 -scale-x-100" />
                <Corner className="right-1 bottom-1 -scale-y-100" />
                <Corner className="left-1 bottom-1 -scale-x-100 -scale-y-100" />

                <div className="text-center">
                  {data.shop.logo_path && (
                    <img
                      src={fileUrl(data.shop.logo_path)}
                      alt={data.shop.name}
                      className="mx-auto mb-3 h-14 w-14 rounded-full bg-white object-contain p-1"
                      style={{ border: `1px solid ${GOLD}` }}
                    />
                  )}
                  <p className="text-2xl font-bold" style={{ fontFamily: "'Aref Ruqaa', 'IBM Plex Sans Arabic', serif", color: NAVY }}>
                    {data.shop.name}
                  </p>

                  <div
                    className="mx-auto mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold text-white"
                    style={{ background: '#0d9668', fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}
                  >
                    <span>✅</span>
                    {t('verify.verifiedBadge')}
                  </div>
                </div>

                <div
                  className="mt-6 grid grid-cols-2 gap-4 border-t pt-4 text-sm"
                  style={{ borderColor: '#e7dcbd', fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}
                >
                  <div>
                    <p className="text-[11px] text-stone-400">{t('verify.receiptNumber')}</p>
                    <p className="mt-0.5 font-bold text-stone-700" style={{ fontVariantNumeric: 'tabular-nums' }}>
                      {data.order.order_number}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] text-stone-400">{t('verify.date')}</p>
                    <p className="mt-0.5 font-bold text-stone-700" style={{ fontVariantNumeric: 'tabular-nums' }}>
                      {formatDate(data.order.created_at)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] text-stone-400">{t('verify.customer')}</p>
                    <p className="mt-0.5 font-bold text-stone-700">{data.order.customer_name}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-stone-400">{t('verify.amount')}</p>
                    <p className="mt-0.5 font-bold" style={{ color: GOLD_DARK, fontVariantNumeric: 'tabular-nums' }}>
                      {formatIQD(data.order.total_price)}
                    </p>
                  </div>
                </div>

                <div className="mt-5 border-t pt-4 text-center" style={{ borderColor: '#e7dcbd', fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}>
                  <p className="mb-1.5 text-[11px] text-stone-400">{t('verify.orderStatus')}</p>
                  {(() => {
                    const s = statusMeta(data.order.status, t);
                    return (
                      <span
                        className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold"
                        style={{ background: s.bg, color: s.fg }}
                      >
                        <span>{s.icon}</span>
                        {s.label}
                      </span>
                    );
                  })()}
                </div>

                <div className="mt-6 flex justify-center">
                  <VerifyQR orderNumber={data.order.order_number} logoUrl={data.shop.logo_path ? fileUrl(data.shop.logo_path) : null} />
                </div>
              </div>
            </div>

            <div className="no-print mt-6 space-y-2">
              {reordered ? (
                <p className="rounded-xl bg-emerald-50 px-4 py-3 text-center text-sm font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                  {t('verify.reorderDone')}
                </p>
              ) : (
                <button
                  onClick={reorder}
                  className="w-full rounded-xl py-3 text-sm font-bold text-white transition"
                  style={{ background: NAVY }}
                >
                  {t('verify.reorderBtn')}
                </button>
              )}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={shareWhatsapp}
                  className="rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
                >
                  {t('verify.shareBtn')}
                </button>
                <button
                  onClick={() => window.print()}
                  className="rounded-xl bg-slate-200 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-300 dark:bg-white/10 dark:text-slate-200 dark:hover:bg-white/20"
                >
                  {t('verify.downloadBtn')}
                </button>
              </div>
              <p className="text-center text-[11px] text-stone-400 dark:text-stone-500">{t('verify.downloadHint')}</p>
            </div>
          </>
        )}
      </main>

      <style>{`
        @media print {
          header, .no-print { display: none !important; }
          body { background: white; }
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
