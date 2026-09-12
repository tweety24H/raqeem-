import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/client';
import PageHeader from '../components/PageHeader';
import StatusBadge from '../components/StatusBadge';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { formatIQD, formatDateTime, formatDiscountLabel } from '../utils/format';
import { OrderDesignsSection } from '../components/DesignArchive';
import { notifyIfCompleted } from '../utils/feedback';

const STATUSES = ['جديد', 'قيد التصميم', 'قيد الطباعة', 'جاهز للتسليم', 'تم التسليم'];

export default function OrderDetail() {
  const { t } = useLanguage();
  const { hasPermission } = useAuth();
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

  // تغيير حالة الطلب (جديد -> قيد التصميم -> ... -> تم التسليم) - لما توصل
  // "جاهز للتسليم" يطلع صوت خفيف وهزة (شوف utils/feedback.js)
  async function changeStatus(status) {
    setBusy(true);
    try {
      await api.patch(`/orders/${id}/status`, { status });
      notifyIfCompleted(status);
      await load();
    } finally {
      setBusy(false);
    }
  }

  // تسجيل دفعة جديدة على الطلب - يضيفها للمبلغ المدفوع ويحدث المتبقي تلقائي
  async function addPayment(e) {
    e.preventDefault();
    setError('');
    try {
      await api.post(`/orders/${id}/payment`, { amount: Number(payAmount) });
      setPayAmount('');
      await load();
    } catch (err) {
      setError(err.response?.data?.error || t('orderDetail.errorPayment'));
    }
  }

  if (!data) return <div className="p-6 text-slate-400 dark:text-slate-500">{t('common.loading')}</div>;

  const { order, items, payments } = data;
  const remaining = order.total_price - order.paid_amount;
  const statusIdx = STATUSES.indexOf(order.status);

  return (
    <div className="p-6">
      <PageHeader
        title={`${t('orderDetail.orderPrefix')} #${order.order_number}`}
        subtitle={order.customer_name}
        actions={
          <Link to={`/receipt/${order.id}`} className="btn-gold" target="_blank">
            {t('orderDetail.printInvoice')}
          </Link>
        }
      />

      <div className="mb-6 card">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold text-slate-700 dark:text-slate-200">{t('orderDetail.statusHeading')}</h2>
          <StatusBadge status={order.status} />
        </div>
        {hasPermission('update_order_status') && (
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
                    ? 'border-success/30 bg-success/10 text-success dark:border-success/20 dark:bg-success/10 dark:text-success'
                    : 'border-slate-300 text-slate-500 hover:bg-slate-50 dark:border-white/10 dark:text-slate-400 dark:hover:bg-white/5'
                }`}
              >
                {t(`status.${s}`)}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div className="card overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead className="bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3 text-right">{t('common.description')}</th>
                  <th className="px-4 py-3 text-right">{t('common.quantity')}</th>
                  <th className="px-4 py-3 text-right">{t('common.unitPrice')}</th>
                  <th className="px-4 py-3 text-right">{t('common.total')}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => (
                  <tr key={it.id} className="border-t border-slate-100 dark:border-white/5">
                    <td className="px-4 py-3 dark:text-slate-200">{it.description || it.service_name}</td>
                    <td className="px-4 py-3 dark:text-slate-200">{it.quantity}</td>
                    <td className="px-4 py-3 dark:text-slate-300">{formatIQD(it.unit_price)}</td>
                    <td className="px-4 py-3 font-medium dark:text-slate-100">{formatIQD(it.total_price)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-slate-200 dark:border-white/10">
                  <td colSpan={3} className="px-4 py-2 text-left text-slate-500 dark:text-slate-400">
                    {t('common.subtotal')}
                  </td>
                  <td className="px-4 py-2 font-medium dark:text-slate-100">{formatIQD(order.subtotal)}</td>
                </tr>
                {order.discount > 0 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-2 text-left text-slate-500 dark:text-slate-400">
                      {t('common.discount')}
                    </td>
                    <td className="px-4 py-2 font-medium dark:text-slate-100">- {formatDiscountLabel(order)}</td>
                  </tr>
                )}
                <tr>
                  <td colSpan={3} className="px-4 py-2 text-left font-bold text-nili dark:text-gold">
                    {t('common.grandTotal')}
                  </td>
                  <td className="px-4 py-2 text-lg font-bold text-nili dark:text-gold">{formatIQD(order.total_price)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {order.notes && (
            <div className="card">
              <h3 className="mb-1 text-sm font-semibold text-slate-600 dark:text-slate-300">{t('common.notes')}</h3>
              <p className="text-sm text-slate-600 dark:text-slate-300">{order.notes}</p>
            </div>
          )}

          <OrderDesignsSection orderId={order.id} customerId={order.customer_id} />
        </div>

        <div className="space-y-6">
          <div className="card">
            <h2 className="mb-3 font-semibold text-slate-700 dark:text-slate-200">{t('orderDetail.paymentHeading')}</h2>
            <div className="mb-2 flex justify-between text-sm">
              <span className="text-slate-500 dark:text-slate-400">{t('common.paid')}</span>
              <span className="font-medium text-success dark:text-success">{formatIQD(order.paid_amount)}</span>
            </div>
            <div className="mb-3 flex justify-between text-sm">
              <span className="text-slate-500 dark:text-slate-400">{t('common.remaining')}</span>
              <span className={`font-semibold ${remaining > 0 ? 'text-danger' : 'text-success'}`}>
                {formatIQD(remaining)}
              </span>
            </div>

            {remaining > 0 && hasPermission('record_payment') && (
              <form onSubmit={addPayment} className="mb-3 flex gap-2">
                <input
                  className="input"
                  type="number"
                  placeholder={t('orderDetail.paymentAmountPlaceholder')}
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  required
                />
                <button className="btn-primary shrink-0">{t('orderDetail.registerBtn')}</button>
              </form>
            )}
            {error && (
              <div className="mb-2 rounded-lg bg-danger/10 px-3 py-2 text-xs text-danger dark:bg-danger/10 dark:text-danger">
                {error}
              </div>
            )}

            <div className="space-y-1">
              {payments.map((p) => (
                <div key={p.id} className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span>{formatDateTime(p.created_at)}</span>
                  <span className="font-medium text-slate-700 dark:text-slate-200">{formatIQD(p.amount)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card text-sm">
            <h2 className="mb-2 font-semibold text-slate-700 dark:text-slate-200">{t('orderDetail.detailsHeading')}</h2>
            <div className="flex justify-between py-1 text-slate-500 dark:text-slate-400">
              <span>{t('common.customer')}</span>
              <Link to={`/customers/${order.customer_id}`} className="text-nili hover:underline dark:text-gold">
                {order.customer_name}
              </Link>
            </div>
            <div className="flex justify-between py-1 text-slate-500 dark:text-slate-400">
              <span>{t('common.phone')}</span>
              <span className="dark:text-slate-200">{order.customer_phone || '-'}</span>
            </div>
            <div className="flex justify-between py-1 text-slate-500 dark:text-slate-400">
              <span>{t('common.createdAt')}</span>
              <span className="dark:text-slate-200">{formatDateTime(order.created_at)}</span>
            </div>
            <div className="flex justify-between py-1 text-slate-500 dark:text-slate-400">
              <span>{t('common.dueDate')}</span>
              <span className="dark:text-slate-200">{order.due_date || '-'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
