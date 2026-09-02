import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/client';
import PageHeader from '../components/PageHeader';
import StatusBadge from '../components/StatusBadge';
import { formatIQD, formatDateTime } from '../utils/format';
import { OrderDesignsSection } from '../components/DesignArchive';

const STATUSES = ['جديد', 'قيد التصميم', 'قيد الطباعة', 'جاهز للتسليم', 'تم التسليم'];

export default function OrderDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [payAmount, setPayAmount] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    load();
  }, [id]);

  async function load() {
    const res = await api.get(`/orders/${id}`);
    setData(res.data);
  }

  async function changeStatus(status) {
    setBusy(true);
    try {
      await api.patch(`/orders/${id}/status`, { status });
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function addPayment(e) {
    e.preventDefault();
    setError('');
    try {
      await api.post(`/orders/${id}/payment`, { amount: Number(payAmount) });
      setPayAmount('');
      await load();
    } catch (err) {
      setError(err.response?.data?.error || 'فشل تسجيل الدفعة');
    }
  }

  if (!data) return <div className="p-6 text-slate-400">جاري التحميل...</div>;

  const { order, items, payments } = data;
  const remaining = order.total_price - order.paid_amount;
  const statusIdx = STATUSES.indexOf(order.status);

  return (
    <div className="p-6">
      <PageHeader
        title={`طلب #${order.order_number}`}
        subtitle={order.customer_name}
        actions={
          <Link to={`/receipt/${order.id}`} className="btn-gold" target="_blank">
            طباعة الفاتورة 🖨️
          </Link>
        }
      />

      <div className="mb-6 card">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold text-slate-700">حالة الطلب</h2>
          <StatusBadge status={order.status} />
        </div>
        <div className="flex flex-wrap gap-2">
          {STATUSES.map((s, idx) => (
            <button
              key={s}
              disabled={busy}
              onClick={() => changeStatus(s)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${
                idx === statusIdx
                  ? 'border-nili bg-nili text-white'
                  : idx < statusIdx
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-600'
                  : 'border-slate-300 text-slate-500 hover:bg-slate-50'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div className="card overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead className="bg-slate-100 text-slate-600">
                <tr>
                  <th className="px-4 py-3 text-right">الوصف</th>
                  <th className="px-4 py-3 text-right">الكمية</th>
                  <th className="px-4 py-3 text-right">سعر الوحدة</th>
                  <th className="px-4 py-3 text-right">المجموع</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => (
                  <tr key={it.id} className="border-t border-slate-100">
                    <td className="px-4 py-3">{it.description || it.service_name}</td>
                    <td className="px-4 py-3">{it.quantity}</td>
                    <td className="px-4 py-3">{formatIQD(it.unit_price)}</td>
                    <td className="px-4 py-3 font-medium">{formatIQD(it.total_price)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-slate-200">
                  <td colSpan={3} className="px-4 py-2 text-left text-slate-500">
                    المجموع الفرعي
                  </td>
                  <td className="px-4 py-2 font-medium">{formatIQD(order.subtotal)}</td>
                </tr>
                <tr>
                  <td colSpan={3} className="px-4 py-2 text-left text-slate-500">
                    الخصم
                  </td>
                  <td className="px-4 py-2 font-medium">- {formatIQD(order.discount)}</td>
                </tr>
                <tr>
                  <td colSpan={3} className="px-4 py-2 text-left font-bold text-nili">
                    الإجمالي
                  </td>
                  <td className="px-4 py-2 text-lg font-bold text-nili">{formatIQD(order.total_price)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {order.notes && (
            <div className="card">
              <h3 className="mb-1 text-sm font-semibold text-slate-600">ملاحظات</h3>
              <p className="text-sm text-slate-600">{order.notes}</p>
            </div>
          )}

          <OrderDesignsSection orderId={order.id} customerId={order.customer_id} />
        </div>

        <div className="space-y-6">
          <div className="card">
            <h2 className="mb-3 font-semibold text-slate-700">الدفع</h2>
            <div className="mb-2 flex justify-between text-sm">
              <span className="text-slate-500">المدفوع</span>
              <span className="font-medium text-emerald-600">{formatIQD(order.paid_amount)}</span>
            </div>
            <div className="mb-3 flex justify-between text-sm">
              <span className="text-slate-500">المتبقي</span>
              <span className={`font-semibold ${remaining > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                {formatIQD(remaining)}
              </span>
            </div>

            {remaining > 0 && (
              <form onSubmit={addPayment} className="mb-3 flex gap-2">
                <input
                  className="input"
                  type="number"
                  placeholder="مبلغ الدفعة"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  required
                />
                <button className="btn-primary shrink-0">تسجيل</button>
              </form>
            )}
            {error && <div className="mb-2 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-600">{error}</div>}

            <div className="space-y-1">
              {payments.map((p) => (
                <div key={p.id} className="flex justify-between text-xs text-slate-500">
                  <span>{formatDateTime(p.created_at)}</span>
                  <span className="font-medium text-slate-700">{formatIQD(p.amount)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card text-sm">
            <h2 className="mb-2 font-semibold text-slate-700">تفاصيل</h2>
            <div className="flex justify-between py-1 text-slate-500">
              <span>الزبون</span>
              <Link to={`/customers/${order.customer_id}`} className="text-nili hover:underline">
                {order.customer_name}
              </Link>
            </div>
            <div className="flex justify-between py-1 text-slate-500">
              <span>الهاتف</span>
              <span>{order.customer_phone || '-'}</span>
            </div>
            <div className="flex justify-between py-1 text-slate-500">
              <span>تاريخ الإنشاء</span>
              <span>{formatDateTime(order.created_at)}</span>
            </div>
            <div className="flex justify-between py-1 text-slate-500">
              <span>موعد التسليم</span>
              <span>{order.due_date || '-'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
