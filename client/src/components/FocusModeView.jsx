import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import api from '../api/client';
import { useLanguage } from '../context/LanguageContext';

const READY_STATUS = 'جاهز للتسليم';

// وضع التركيز: يستبدل الواجهة كاملة (يخفي السايدبار ضمنيًا لأنه هو كل
// شي المعروض) بقائمة كبيرة الخط للطلبات الجاهزة للتسليم فقط — مفيد لعرضه
// بشاشة أمام العمال بدون تفاصيل زايدة تشتت الانتباه.
export default function FocusModeView({ onExit }) {
  const { t } = useLanguage();
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === 'Escape') onExit();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onExit]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, []);

  async function load() {
    const res = await api.get('/orders', { params: { status: READY_STATUS } });
    setOrders(res.data.orders);
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[90] overflow-y-auto bg-[#0A0F1C] p-10 font-arabic"
      dir="rtl"
    >
      <div className="mx-auto max-w-4xl">
        <div className="mb-10 flex items-center justify-between">
          <h1 className="font-display text-3xl font-bold text-gold">{t('focusMode.heading')}</h1>
          <button
            type="button"
            onClick={onExit}
            className="rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:bg-white/10"
          >
            Esc · {t('focusMode.exit')}
          </button>
        </div>

        {orders.length === 0 && <p className="text-xl text-slate-400">{t('focusMode.empty')}</p>}

        <div className="space-y-4">
          {orders.map((o) => (
            <motion.div
              key={o.id}
              layout
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center justify-between rounded-2xl border border-gold/20 bg-white/5 px-8 py-6"
            >
              <span className="text-4xl font-bold text-white">{o.customer_name}</span>
              <span className="font-mono text-2xl text-gold">{o.order_number}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
