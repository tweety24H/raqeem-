import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/client';
import PageHeader from '../components/PageHeader';
import StatusBadge from '../components/StatusBadge';
import { formatIQD, formatDate, formatDateTime } from '../utils/format';

export default function CustomerDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get(`/customers/${id}`).then((r) => setData(r.data));
  }, [id]);

  if (!data) return <div className="p-6 text-slate-400">جاري التحميل...</div>;
  const { customer, orders, payments } = data;

  return (
    <div className="p-6">
      <PageHeader title={customer.name} subtitle={customer.phone || 'بدون رقم هاتف'} />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="card">
          <div className="text-sm text-slate-500">عدد الطلبات</div>
          <div className="text-2xl font-bold text-slate-800">{orders.length}</div>
        </div>
        <div className="card">
          <div className="text-sm text-slate-500">إجمالي المدفوع</div>
          <div className="text-2xl font-bold text-emerald-600">
            {formatIQD(orders.reduce((s, o) => s + o.paid_amount, 0))}
          </div>
        </div>
        <div className="card">
          <div className="text-sm text-slate-500">الدين المستحق</div>
          <div className={`text-2xl font-bold ${customer.debt > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
            {formatIQD(customer.debt)}
          </div>
        </div>
      </div>

      {customer.notes && (
        <div className="card mb-6">
          <h3 className="mb-1 text-sm font-semibold text-slate-600">ملاحظات</h3>
          <p className="text-sm text-slate-600">{customer.notes}</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="card">
          <h2 className="mb-3 font-semibold text-slate-700">الطلبات</h2>
          <div className="space-y-2">
            {orders.map((o) => (
              <Link
                key={o.id}
                to={`/orders/${o.id}`}
                className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 hover:bg-slate-50"
              >
                <div>
                  <div className="text-sm font-medium text-nili">{o.order_number}</div>
                  <div className="text-xs text-slate-400">{formatDate(o.created_at)}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-700">{formatIQD(o.total_price)}</span>
                  <StatusBadge status={o.status} />
                </div>
              </Link>
            ))}
            {orders.length === 0 && <div className="text-sm text-slate-400">لا توجد طلبات</div>}
          </div>
        </div>

        <div className="card">
          <h2 className="mb-3 font-semibold text-slate-700">سجل الدفعات</h2>
          <div className="space-y-2">
            {payments.map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-sm">
                <span className="text-slate-500">{formatDateTime(p.created_at)}</span>
                <span className="font-semibold text-emerald-600">{formatIQD(p.amount)}</span>
              </div>
            ))}
            {payments.length === 0 && <div className="text-sm text-slate-400">لا توجد دفعات</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
