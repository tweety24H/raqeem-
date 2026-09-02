import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import PageHeader from '../components/PageHeader';
import StatusBadge from '../components/StatusBadge';
import { formatIQD, formatDate } from '../utils/format';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      const res = await api.get('/dashboard/summary');
      setData(res.data);
    } catch (err) {
      setError('تعذر تحميل بيانات لوحة التحكم');
    }
  }

  if (error) return <div className="p-6 text-rose-600">{error}</div>;
  if (!data) return <div className="p-6 text-slate-400">جاري التحميل...</div>;

  return (
    <div className="p-6">
      <PageHeader
        title="لوحة التحكم"
        subtitle="نظرة عامة على أداء المطبعة اليوم"
        actions={
          <Link to="/mobile" target="_blank" className="btn-secondary">
            📱 عرض نسخة الموبايل
          </Link>
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="ربح اليوم" value={formatIQD(data.profitToday.profit)} tone="emerald" />
        <StatCard label="ربح هذا الشهر" value={formatIQD(data.profitMonth.profit)} tone="nili" />
        <StatCard label="إجمالي الديون المستحقة" value={formatIQD(data.totalDebt)} tone="rose" />
        <StatCard label="طلبات اليوم" value={data.ordersToday} tone="gold" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="card">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-slate-700">⏰ مواعيد تسليم قريبة</h2>
            <Link to="/orders" className="text-sm text-nili hover:underline">
              كل الطلبات
            </Link>
          </div>
          {data.dueSoon.length === 0 && <p className="text-sm text-slate-400">لا توجد مواعيد قريبة</p>}
          <div className="space-y-2">
            {data.dueSoon.map((o) => (
              <Link
                key={o.id}
                to={`/orders/${o.id}`}
                className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 hover:bg-amber-100"
              >
                <div>
                  <div className="text-sm font-medium text-slate-800">{o.customer_name}</div>
                  <div className="text-xs text-slate-500">
                    #{o.order_number} · تسليم {formatDate(o.due_date)}
                  </div>
                </div>
                <StatusBadge status={o.status} />
              </Link>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-slate-700">📦 مخزون منخفض</h2>
            <Link to="/stock" className="text-sm text-nili hover:underline">
              الجرد
            </Link>
          </div>
          {data.lowStock.length === 0 && <p className="text-sm text-slate-400">المخزون بحالة جيدة</p>}
          <div className="space-y-2">
            {data.lowStock.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between rounded-lg border border-rose-200 bg-rose-50 px-3 py-2"
              >
                <div className="text-sm font-medium text-slate-800">{s.name}</div>
                <div className="text-xs text-rose-600">
                  {s.quantity} / {s.min_quantity} {s.unit}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card lg:col-span-2">
          <h2 className="mb-3 font-semibold text-slate-700">حالة الطلبات</h2>
          <div className="flex flex-wrap gap-3">
            {data.ordersByStatus.map((s) => (
              <div key={s.status} className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2">
                <StatusBadge status={s.status} />
                <span className="text-sm font-semibold text-slate-700">{s.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, tone }) {
  const tones = {
    emerald: 'from-emerald-500 to-emerald-600',
    nili: 'from-nili to-nili-light',
    rose: 'from-rose-500 to-rose-600',
    gold: 'from-gold-dark to-gold',
  };
  return (
    <div className={`rounded-xl bg-gradient-to-br ${tones[tone]} p-4 text-white shadow-sm`}>
      <div className="text-sm opacity-90">{label}</div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
    </div>
  );
}
