import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useDashboardSummary } from '../context/DashboardSummaryContext';
import { formatDate } from '../utils/format';

// Real notifications built from data the backend already exposes via
// /api/dashboard/summary — orders due within 2 days, and stock items at or
// below their minimum quantity. There is no dedicated notifications endpoint
// in the backend, so this intentionally does not invent anything beyond
// those two real signals.
export default function NotificationsBell() {
  const { summary } = useDashboardSummary();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function onClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const dueSoon = summary?.dueSoon || [];
  const lowStock = summary?.lowStock || [];
  const count = dueSoon.length + lowStock.length;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-sm transition hover:bg-slate-100 dark:border-slate-800 dark:bg-white/5 dark:hover:bg-white/10"
        aria-label="الإشعارات"
      >
        🔔
        {count > 0 && (
          <span className="absolute -top-1 -left-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 top-full z-30 mt-2 max-h-96 w-80 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-800 dark:bg-slate-900"
          >
            {count === 0 ? (
              <p className="p-4 text-center text-sm text-slate-400 dark:text-slate-500">لا توجد إشعارات جديدة</p>
            ) : (
              <>
                {dueSoon.length > 0 && (
                  <div>
                    <p className="px-4 pt-3 text-xs font-semibold text-slate-400 dark:text-slate-500">طلبات مستحقة قريباً</p>
                    {dueSoon.map((o) => (
                      <Link
                        key={o.id}
                        to={`/orders/${o.id}`}
                        onClick={() => setOpen(false)}
                        className="flex items-center justify-between gap-2 border-t border-slate-100 px-4 py-2.5 text-sm hover:bg-slate-50 dark:border-white/5 dark:hover:bg-white/5"
                      >
                        <span className="text-slate-700 dark:text-slate-200">{o.customer_name}</span>
                        <span className="text-xs text-gold-dark dark:text-gold-light">{formatDate(o.due_date)}</span>
                      </Link>
                    ))}
                  </div>
                )}
                {lowStock.length > 0 && (
                  <div>
                    <p className="px-4 pt-3 text-xs font-semibold text-slate-400 dark:text-slate-500">مخزون منخفض</p>
                    {lowStock.map((s) => (
                      <Link
                        key={s.id}
                        to="/stock"
                        onClick={() => setOpen(false)}
                        className="flex items-center justify-between gap-2 border-t border-slate-100 px-4 py-2.5 text-sm hover:bg-slate-50 dark:border-white/5 dark:hover:bg-white/5"
                      >
                        <span className="text-slate-700 dark:text-slate-200">{s.name}</span>
                        <span className="text-xs text-danger dark:text-danger">{s.quantity} {s.unit}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
