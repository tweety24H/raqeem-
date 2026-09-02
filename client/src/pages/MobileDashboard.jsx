import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/StatusBadge';
import { formatIQD, formatDateTime } from '../utils/format';

export default function MobileDashboard() {
  const [summary, setSummary] = useState(null);
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState('');
  const { logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      const [summaryRes, ordersRes] = await Promise.all([
        api.get('/dashboard/summary'),
        api.get('/orders'),
      ]);
      setSummary(summaryRes.data);
      setOrders(ordersRes.data.orders.slice(0, 5));
    } catch (err) {
      setError('تعذر تحميل البيانات، تأكد من الاتصال بالشبكة');
    }
  }

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div dir="rtl" className="min-h-screen bg-slate-100 pb-10">
      <div className="bg-nili px-4 py-5 text-white">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-lg font-bold">RaqeemOS</div>
            <div className="text-sm opacity-80">نسخة الموبايل للمالك</div>
          </div>
          <button onClick={handleLogout} className="rounded-lg bg-white/10 px-3 py-1.5 text-sm">
            خروج
          </button>
        </div>
      </div>

      <div className="space-y-4 p-4">
        {error && <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600">{error}</div>}
        {!error && !summary && <div className="py-10 text-center text-slate-400">جاري التحميل...</div>}

        {summary && (
          <>
            <BigCard emoji="💰" label="أرباح اليوم" value={formatIQD(summary.profitToday.profit)} tone="emerald" />
            <BigCard emoji="🧾" label="مجموع الديون" value={formatIQD(summary.totalDebt)} tone="rose" />
            <BigCard
              emoji="📦"
              label="مواد ناقصة"
              value={`${summary.lowStock.length} صنف`}
              tone="amber"
              detail={
                summary.lowStock.length > 0
                  ? summary.lowStock.map((s) => s.name).slice(0, 5).join('، ')
                  : 'المخزون بحالة جيدة'
              }
            />

            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center gap-2 text-lg font-bold text-slate-800">
                <span>🧾</span>
                <span>آخر 5 طلبات</span>
              </div>
              {orders.length === 0 && <div className="py-4 text-center text-slate-400">لا توجد طلبات بعد</div>}
              <div className="space-y-2">
                {orders.map((o) => (
                  <div
                    key={o.id}
                    className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-3"
                  >
                    <div>
                      <div className="font-semibold text-slate-800">{o.customer_name}</div>
                      <div className="text-xs text-slate-500">
                        #{o.order_number} · {formatDateTime(o.created_at)}
                      </div>
                    </div>
                    <div className="text-left">
                      <StatusBadge status={o.status} />
                      <div className="mt-1 text-sm font-semibold text-slate-700">{formatIQD(o.total_price)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function BigCard({ emoji, label, value, detail, tone }) {
  const tones = {
    emerald: 'from-emerald-500 to-emerald-600',
    rose: 'from-rose-500 to-rose-600',
    amber: 'from-amber-500 to-amber-600',
  };
  return (
    <div className={`rounded-2xl bg-gradient-to-br ${tones[tone]} p-5 text-white shadow-sm`}>
      <div className="flex items-center gap-2 text-sm opacity-90">
        <span className="text-xl">{emoji}</span>
        <span>{label}</span>
      </div>
      <div className="mt-2 text-3xl font-extrabold">{value}</div>
      {detail && <div className="mt-1 truncate text-xs opacity-90">{detail}</div>}
    </div>
  );
}
