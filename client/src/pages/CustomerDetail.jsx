import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/client';
import PageHeader from '../components/PageHeader';
import StatusBadge from '../components/StatusBadge';
import { SkeletonBlock } from '../components/ui/LoadingSkeleton';
import { useLanguage } from '../context/LanguageContext';
import { formatIQD, formatDate, formatDateTime } from '../utils/format';

function CustomerDetailSkeleton() {
  return (
    <div className="p-6">
      <SkeletonBlock className="mb-6 h-8 w-48" />
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="card space-y-2">
            <SkeletonBlock className="h-3 w-20" />
            <SkeletonBlock className="h-6 w-24" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {Array.from({ length: 2 }, (_, i) => (
          <div key={i} className="card space-y-2">
            {Array.from({ length: 3 }, (_, j) => (
              <SkeletonBlock key={j} className="h-10 w-full" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function CustomerDetail() {
  const { t } = useLanguage();
  const { id } = useParams();
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get(`/customers/${id}`).then((r) => setData(r.data));
  }, [id]);

  if (!data) return <CustomerDetailSkeleton />;
  const { customer, orders, payments } = data;

  return (
    <div className="p-6">
      <PageHeader title={customer.name} subtitle={customer.phone || t('customerDetail.noPhone')} />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="card">
          <div className="text-sm text-slate-500 dark:text-slate-400">{t('customerDetail.orderCount')}</div>
          <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">{orders.length}</div>
        </div>
        <div className="card">
          <div className="text-sm text-slate-500 dark:text-slate-400">{t('customerDetail.totalPaid')}</div>
          <div className="text-2xl font-bold text-success dark:text-success">
            {formatIQD(orders.reduce((s, o) => s + o.paid_amount, 0))}
          </div>
        </div>
        <div className="card">
          <div className="text-sm text-slate-500 dark:text-slate-400">{t('customerDetail.debtOwed')}</div>
          <div className={`text-2xl font-bold ${customer.debt > 0 ? 'text-danger' : 'text-success'}`}>
            {formatIQD(customer.debt)}
          </div>
        </div>
      </div>

      {/* بطاقة نقاط الولاء - النقاط تنحسب تلقائي بالسيرفر (نقطة لكل 1000 د.ع
          من كل طلب)، هنا بس نعرضها مع بار تقدم لحد 500 نقطة = خصم 5% */}
      <div className="card mb-6">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-300">{t('customerDetail.loyaltyHeading')}</h3>
          <span className="text-lg font-bold text-gold">{customer.points || 0}</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
          <div
            className="h-full rounded-full bg-gold transition-all"
            style={{ width: `${Math.min(100, ((customer.points || 0) / 500) * 100)}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">{t('customerDetail.loyaltyHint')}</p>
      </div>

      {customer.notes && (
        <div className="card mb-6">
          <h3 className="mb-1 text-sm font-semibold text-slate-600 dark:text-slate-300">{t('common.notes')}</h3>
          <p className="text-sm text-slate-600 dark:text-slate-300">{customer.notes}</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="card">
          <h2 className="mb-3 font-semibold text-slate-700 dark:text-slate-200">{t('customerDetail.ordersHeading')}</h2>
          <div className="space-y-2">
            {orders.map((o) => (
              <Link
                key={o.id}
                to={`/orders/${o.id}`}
                className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/5"
              >
                <div>
                  <div className="text-sm font-medium text-nili dark:text-gold">{o.order_number}</div>
                  <div className="text-xs text-slate-400 dark:text-slate-500">{formatDate(o.created_at)}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{formatIQD(o.total_price)}</span>
                  <StatusBadge status={o.status} />
                </div>
              </Link>
            ))}
            {orders.length === 0 && <div className="text-sm text-slate-400 dark:text-slate-500">{t('customerDetail.noOrders')}</div>}
          </div>
        </div>

        <div className="card">
          <h2 className="mb-3 font-semibold text-slate-700 dark:text-slate-200">{t('customerDetail.paymentHistory')}</h2>
          <div className="space-y-2">
            {payments.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-sm dark:border-white/10"
              >
                <span className="text-slate-500 dark:text-slate-400">{formatDateTime(p.created_at)}</span>
                <span className="font-semibold text-success dark:text-success">{formatIQD(p.amount)}</span>
              </div>
            ))}
            {payments.length === 0 && <div className="text-sm text-slate-400 dark:text-slate-500">{t('customerDetail.noPayments')}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
