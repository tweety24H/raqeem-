import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '../api/client';
import PageHeader from '../components/PageHeader';
import EmptyState from '../components/ui/EmptyState';
import { useLanguage } from '../context/LanguageContext';

const PRINTING_STATUS = 'قيد الطباعة';

// شريط تقدّم محاكى (مو مرتبط بطابعة فعلية) — يقرب لـ 70% بسرعة ثم يتباطأ،
// نفس إحساس "شريط تحميل" مألوف، بدون أي بيانات حقيقية عن الطابعة لأنه
// النظام ما يتصل بطابعات فعليًا.
function useSimulatedProgress(seedKey) {
  const [progress, setProgress] = useState(() => 15 + (seedKey % 10));

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 70) return Math.min(96, p + 0.4);
        return p + 2.5;
      });
    }, 700);
    return () => clearInterval(interval);
  }, []);

  return progress;
}

function QueueCard({ order }) {
  const progress = useSimulatedProgress(order.id);
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="card flex flex-col gap-4 border-2 border-nili/10 p-6 dark:border-white/10"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          {order.order_number}
        </span>
        <span className="rounded-full bg-gold/15 px-2.5 py-1 text-xs font-bold text-gold-dark dark:bg-gold/15 dark:text-gold-light">
          {PRINTING_STATUS}
        </span>
      </div>

      <Link to={`/orders/${order.id}`} className="font-display text-3xl font-bold leading-tight text-nili hover:underline dark:text-gold">
        {order.customer_name}
      </Link>

      {order.item_summary && <p className="truncate text-sm text-slate-500 dark:text-slate-400">{order.item_summary}</p>}

      <div>
        <div className="mb-1.5 flex items-center justify-between text-xs text-slate-400 dark:text-slate-500">
          <span>التقدّم</span>
          <span className="font-mono font-bold text-nili dark:text-gold">{Math.round(progress)}%</span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
          <motion.div
            className="h-full rounded-full bg-gradient-to-l from-gold to-nili"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          />
        </div>
      </div>
    </motion.div>
  );
}

// لوحة "طابور الطباعة الحي" — إحساس لوحة مطار: خط كبير + شريط تقدّم لكل
// طلب قيد الطباعة فعليًا (حسب حالته بقاعدة البيانات).
export default function PrintQueue() {
  const { t } = useLanguage();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, []);

  // تجيب الطلبات اللي "قيد الطباعة" هسه - تتحدث تلقائي كل 15 ثانية بدون
  // ما يحتاج المستخدم يعمل رفرش يدوي
  async function load() {
    try {
      const res = await api.get('/orders', { params: { status: PRINTING_STATUS } });
      setOrders(res.data.orders);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6">
      <PageHeader title={t('printQueue.title')} subtitle={t('printQueue.subtitle')} />

      {!loading && orders.length === 0 && <EmptyState icon="🖨️" title={t('printQueue.empty')} />}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {orders.map((o) => (
          <QueueCard key={o.id} order={o} />
        ))}
      </div>
    </div>
  );
}
