import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import PageHeader from '../components/PageHeader';
import StatusBadge, { STATUSES, STATUS_STYLES, STATUS_SOLID } from '../components/StatusBadge';
import ViewToggle, { useViewMode } from '../components/ViewToggle';
import ErrorBanner from '../components/ui/ErrorBanner';
import { useLanguage } from '../context/LanguageContext';
import { formatIQD, formatDate } from '../utils/format';
import { exportToExcel } from '../utils/exportExcel';

export default function OrdersList() {
  const { t } = useLanguage();
  const [orders, setOrders] = useState([]);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');
  const [mode, setMode] = useViewMode('raqeem_view_orders', 'list');

  useEffect(() => {
    load();
  }, [status, search]);

  async function load() {
    setError('');
    try {
      const res = await api.get('/orders', { params: { status: status || undefined, search: search || undefined } });
      setOrders(res.data.orders);
    } catch {
      setError('تعذّر تحميل الطلبات، تأكد من الاتصال بالخادم');
    }
  }

  function exportOrders() {
    exportToExcel(
      `طلبات-${new Date().toISOString().slice(0, 10)}`,
      'الطلبات',
      orders.map((o) => ({
        'رقم الطلب': o.order_number,
        الزبون: o.customer_name,
        الحالة: o.status,
        الوصف: o.item_summary || '',
        'المجموع الكلي': o.total_price,
        المدفوع: o.paid_amount,
        المتبقي: o.total_price - o.paid_amount,
        'تاريخ الاستحقاق': o.due_date || '',
        'تاريخ الإنشاء': o.created_at,
      }))
    );
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
        title={t('orders.title')}
        subtitle={t('orders.subtitle')}
        actions={
          <>
            <button type="button" onClick={exportOrders} className="btn-secondary">
              📊 تصدير Excel
            </button>
            <ViewToggle mode={mode} onChange={setMode} />
            <Link to="/orders/new" className="btn-primary">
              {t('orders.newOrderBtn')}
            </Link>
          </>
        }
      />

      <ErrorBanner onRetry={load}>{error}</ErrorBanner>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button
          onClick={() => setStatus('')}
          className={`badge cursor-pointer ${status === '' ? 'bg-nili text-white' : 'bg-slate-200 text-slate-600 dark:bg-white/10 dark:text-slate-300'}`}
        >
          {t('orders.all')}
        </button>
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`badge cursor-pointer ${status === s ? STATUS_SOLID[s] : STATUS_STYLES[s]} dark:ring-1 dark:ring-white/10`}
          >
            {t(`status.${s}`)}
          </button>
        ))}
        <input
          className="input mr-auto max-w-xs"
          placeholder={t('orders.searchPlaceholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {mode === 'grid' ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {orders.map((o) => {
            const remaining = o.total_price - o.paid_amount;
            return (
              <Link
                key={o.id}
                to={`/orders/${o.id}`}
                className="card block transition hover:border-nili hover:shadow-md"
              >
                <div className="mb-2 flex items-center justify-between">
                  <StatusBadge status={o.status} />
                  <span className="text-xs text-slate-400 dark:text-slate-500">{o.order_number}</span>
                </div>
                <p className="font-semibold text-slate-800 dark:text-slate-100">{o.customer_name}</p>
                {o.item_summary && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{o.item_summary}</p>}
                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className="font-bold text-slate-800 dark:text-slate-100">{formatIQD(o.total_price)}</span>
                  <span className={remaining > 0 ? 'font-semibold text-rose-600' : 'text-emerald-600'}>
                    {remaining > 0 ? formatIQD(remaining) : t('orders.paidMark')}
                  </span>
                </div>
                <div className="mt-2 text-xs text-slate-400 dark:text-slate-500">
                  {t('common.dueDate')}: {formatDate(o.due_date)}
                </div>
              </Link>
            );
          })}
          {orders.length === 0 && (
            <div className="col-span-full py-8 text-center text-slate-400 dark:text-slate-500">{t('orders.noOrders')}</div>
          )}
        </div>
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3 text-right">{t('orders.orderNumber')}</th>
                <th className="px-4 py-3 text-right">{t('common.customer')}</th>
                <th className="px-4 py-3 text-right">{t('orders.status')}</th>
                <th className="px-4 py-3 text-right">{t('orders.quickChange')}</th>
                <th className="px-4 py-3 text-right">{t('common.grandTotal')}</th>
                <th className="px-4 py-3 text-right">{t('common.remaining')}</th>
                <th className="px-4 py-3 text-right">{t('common.dueDate')}</th>
                <th className="px-4 py-3 text-right">{t('common.createdAt')}</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => {
                const remaining = o.total_price - o.paid_amount;
                return (
                  <tr
                    key={o.id}
                    className="cursor-pointer border-t border-slate-100 hover:bg-slate-50 dark:border-white/5 dark:hover:bg-white/5"
                    onClick={() => (window.location.hash = `#/orders/${o.id}`)}
                  >
                    <td className="px-4 py-3 font-medium text-nili dark:text-violet-300">{o.order_number}</td>
                    <td className="px-4 py-3 dark:text-slate-200">{o.customer_name}</td>
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
                            {t(`status.${s}`)}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-800 dark:text-slate-100">{formatIQD(o.total_price)}</td>
                    <td className={`px-4 py-3 ${remaining > 0 ? 'text-rose-600 font-semibold' : 'text-emerald-600'}`}>
                      {remaining > 0 ? formatIQD(remaining) : t('orders.paidMark')}
                    </td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{formatDate(o.due_date)}</td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{formatDate(o.created_at)}</td>
                  </tr>
                );
              })}
              {orders.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-400 dark:text-slate-500">
                    {t('orders.noOrders')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
