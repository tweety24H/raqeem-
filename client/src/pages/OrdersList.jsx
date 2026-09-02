import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import PageHeader from '../components/PageHeader';
import StatusBadge, { STATUSES, STATUS_STYLES, STATUS_SOLID } from '../components/StatusBadge';
import { formatIQD, formatDate } from '../utils/format';

export default function OrdersList() {
  const [orders, setOrders] = useState([]);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    load();
  }, [status, search]);

  async function load() {
    const res = await api.get('/orders', { params: { status: status || undefined, search: search || undefined } });
    setOrders(res.data.orders);
  }

  async function quickChangeStatus(orderId, newStatus) {
    setBusyId(orderId);
    try {
      await api.patch(`/orders/${orderId}/status`, { status: newStatus });
      await load();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="p-6">
      <PageHeader
        title="الطلبات"
        subtitle="قائمة الطلبات مع فلترة حسب الحالة"
        actions={
          <Link to="/orders/new" className="btn-primary">
            + طلب جديد
          </Link>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button
          onClick={() => setStatus('')}
          className={`badge cursor-pointer ${status === '' ? 'bg-nili text-white' : 'bg-slate-200 text-slate-600'}`}
        >
          الكل
        </button>
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`badge cursor-pointer ${status === s ? STATUS_SOLID[s] : STATUS_STYLES[s]}`}
          >
            {s}
          </button>
        ))}
        <input
          className="input mr-auto max-w-xs"
          placeholder="بحث برقم الطلب أو اسم الزبون..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="bg-slate-100 text-slate-600">
            <tr>
              <th className="px-4 py-3 text-right">رقم الطلب</th>
              <th className="px-4 py-3 text-right">الزبون</th>
              <th className="px-4 py-3 text-right">الحالة</th>
              <th className="px-4 py-3 text-right">تغيير سريع</th>
              <th className="px-4 py-3 text-right">الإجمالي</th>
              <th className="px-4 py-3 text-right">المتبقي</th>
              <th className="px-4 py-3 text-right">موعد التسليم</th>
              <th className="px-4 py-3 text-right">تاريخ الإنشاء</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => {
              const remaining = o.total_price - o.paid_amount;
              return (
                <tr
                  key={o.id}
                  className="cursor-pointer border-t border-slate-100 hover:bg-slate-50"
                  onClick={() => (window.location.hash = `#/orders/${o.id}`)}
                >
                  <td className="px-4 py-3 font-medium text-nili">{o.order_number}</td>
                  <td className="px-4 py-3">{o.customer_name}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={o.status} />
                  </td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <select
                      className="input !h-auto !py-1 text-xs"
                      value={o.status}
                      disabled={busyId === o.id}
                      onChange={(e) => quickChangeStatus(o.id, e.target.value)}
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 font-bold text-slate-800">{formatIQD(o.total_price)}</td>
                  <td className={`px-4 py-3 ${remaining > 0 ? 'text-rose-600 font-semibold' : 'text-emerald-600'}`}>
                    {remaining > 0 ? formatIQD(remaining) : 'مسدد'}
                  </td>
                  <td className="px-4 py-3 text-slate-500">{formatDate(o.due_date)}</td>
                  <td className="px-4 py-3 text-slate-500">{formatDate(o.created_at)}</td>
                </tr>
              );
            })}
            {orders.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                  لا توجد طلبات
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
