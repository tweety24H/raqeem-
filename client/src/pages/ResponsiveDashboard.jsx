import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Wallet, Receipt, Package, BarChart3, Palette, CheckCircle2, AlertTriangle, PartyPopper } from 'lucide-react';
import api from '../api/client';
import StatCard from '../components/ui/StatCard';
import EmptyState from '../components/ui/EmptyState';
import StatusBadge from '../components/StatusBadge';
import { StatCardsSkeleton, SkeletonBlock } from '../components/ui/LoadingSkeleton';
import ErrorBanner from '../components/ui/ErrorBanner';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useDashboardSummary } from '../context/DashboardSummaryContext';
import { DASHBOARD_SECTION_ITEMS } from '../config/nav';
import { formatIQD, formatDate, formatDateTime } from '../utils/format';

const IN_PROGRESS_STATUSES = ['قيد التصميم', 'قيد الطباعة'];
const READY_STATUS = 'جاهز للتسليم';

// نسخة موحّدة تدمج Dashboard.jsx (سطح المكتب) و MobileDashboard.jsx (الموبايل)
// بمصدر بيانات واحد مشترك + تبديل التخطيط عبر Tailwind (hidden lg:* / lg:hidden)
// بدل صفحتين منفصلتين بمسارين مختلفين (/dashboard و /mobile). لم تُربط بعد
// بالراوتينغ الحقيقي — ملف جاهز للتجربة والمراجعة أولاً، حسب طلب المرحلة 3.
export default function ResponsiveDashboard() {
  const { t } = useLanguage();
  const { isOwner, hasPermission } = useAuth();
  const { summary, loading: summaryLoading, error: summaryError, refresh } = useDashboardSummary();
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(true);

  useEffect(() => {
    api
      .get('/orders')
      .then((res) => setOrders(res.data.orders || []))
      .catch(() => setOrders([]))
      .finally(() => setOrdersLoading(false));
  }, []);

  const statusCounts = {
    inProgress: IN_PROGRESS_STATUSES.reduce(
      (sum, s) => sum + (summary?.ordersByStatus?.find((x) => x.status === s)?.count || 0),
      0
    ),
    ready: summary?.ordersByStatus?.find((x) => x.status === READY_STATUS)?.count || 0,
  };
  const lowStockCount = summary?.lowStock?.length || 0;
  const followUpOrders = (summary?.dueSoon || []).slice(0, 8);
  const recentOrders = orders.slice(0, 5);
  const sectionItems = DASHBOARD_SECTION_ITEMS.filter(
    (item) => (!item.ownerOnly || isOwner) && (!item.permission || isOwner || hasPermission(item.permission))
  ).slice(0, 8);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {summaryError && (
        <div className="p-4 lg:p-6 lg:pb-0">
          <ErrorBanner onRetry={refresh}>تعذّر تحميل الإحصائيات، تأكد من الاتصال بالخادم</ErrorBanner>
        </div>
      )}

      {/* ---------- كروت الإحصائيات: نفس StatCard المستخدم بسطح المكتب، بتخطيط
          يتبدّل حسب حجم الشاشة (عمودين بالموبايل، ستة أعمدة بسطح المكتب) ---------- */}
      {summaryLoading ? (
        <div className="p-4 lg:p-6">
          <StatCardsSkeleton count={6} />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 lg:grid-cols-6 lg:gap-4 lg:p-6">
          <StatCard accent to="/orders?filter=today" icon={<Receipt className="h-5 w-5" />} label={t('dashboard.statOrdersToday')} value={summary?.ordersToday || 0} />
          <StatCard accent to="/orders?status=in_progress" icon={<Palette className="h-5 w-5" />} label={t('dashboard.statInProgress')} value={statusCounts.inProgress} tone="warning" />
          <StatCard accent to="/orders?status=ready" icon={<CheckCircle2 className="h-5 w-5" />} label={t('dashboard.statReady')} value={statusCounts.ready} tone="success" />
          {hasPermission('view_profits') && (
            <StatCard accent to="/reports?range=today" icon={<Wallet className="h-5 w-5" />} label={t('dashboard.statProfitToday')} value={summary?.profitToday?.profit || 0} format={formatIQD} />
          )}
          {hasPermission('view_debts') && (
            <StatCard
              to="/customers?filter=debtors"
              icon={<AlertTriangle className="h-5 w-5" />}
              label={t('dashboard.statDebt')}
              value={summary?.totalDebt || 0}
              format={formatIQD}
              tone={(summary?.totalDebt || 0) > 0 ? 'danger' : 'default'}
            />
          )}
          <StatCard to="/stock?filter=low_stock" icon={<Package className="h-5 w-5" />} label={t('dashboard.statLowStock')} value={lowStockCount} tone={lowStockCount > 0 ? 'danger' : 'default'} />
        </div>
      )}

      {/* ---------- سطح المكتب فقط: جدول المتابعة + الوصول السريع ---------- */}
      <div className="hidden lg:block lg:px-6 lg:pb-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="card lg:col-span-2">
            <h2 className="mb-1 text-sm font-bold text-slate-800 dark:text-slate-100">{t('dashboard.followUpTitle')}</h2>
            <p className="mb-4 text-xs text-slate-400 dark:text-slate-500">{t('dashboard.followUpSubtitle')}</p>
            {ordersLoading ? (
              <div className="space-y-3">
                <SkeletonBlock className="h-10 w-full" />
                <SkeletonBlock className="h-10 w-full" />
                <SkeletonBlock className="h-10 w-full" />
              </div>
            ) : followUpOrders.length === 0 ? (
              <EmptyState icon={<PartyPopper className="h-8 w-8" />} title={t('dashboard.emptyFollowUpTitle')} />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-right text-xs text-slate-400 dark:text-slate-500">
                      <th className="pb-2 font-medium">{t('common.customer')}</th>
                      <th className="pb-2 font-medium">{t('orders.status')}</th>
                      <th className="pb-2 font-medium">{t('common.dueDate')}</th>
                      <th className="pb-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {followUpOrders.map((o) => (
                      <tr key={o.id} className="border-t border-slate-100 dark:border-white/5">
                        <td className="py-2.5 pl-2">
                          <p className="font-medium text-slate-800 dark:text-slate-200">{o.customer_name}</p>
                          <p className="text-xs text-slate-400 dark:text-slate-500">{o.item_summary || o.order_number}</p>
                        </td>
                        <td className="py-2.5">
                          <StatusBadge status={o.status} />
                        </td>
                        <td className="py-2.5 text-xs text-slate-500 dark:text-slate-400">{formatDate(o.due_date)}</td>
                        <td className="py-2.5 text-left">
                          <Link to={`/orders/${o.id}`} className="text-xs font-semibold text-nili hover:underline dark:text-gold">
                            ←
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="card lg:col-span-1">
            <h2 className="mb-4 text-sm font-bold text-slate-800 dark:text-slate-100">{t('dashboard.quickAccessTitle')}</h2>
            <div className="grid grid-cols-2 gap-2">
              {sectionItems.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-slate-100 px-2 py-3 text-center text-xs font-medium text-slate-600 transition hover:border-nili/30 hover:bg-nili/5 dark:border-white/5 dark:text-slate-300 dark:hover:border-nili-light/30 dark:hover:bg-nili-light/10"
                >
                  <span className="text-lg">{item.icon}</span>
                  <span className="truncate">{t(item.key)}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ---------- الموبايل فقط: آخر الطلبات + رابط التقارير ---------- */}
      <div className="block space-y-4 p-4 lg:hidden">
        <div className="rounded-2xl bg-white p-4 shadow-sm dark:bg-slate-900">
          <div className="mb-3 flex items-center gap-2 text-base font-bold text-slate-800 dark:text-slate-100">
            <Receipt className="h-5 w-5" />
            <span>آخر 5 طلبات</span>
          </div>
          {ordersLoading ? (
            <SkeletonBlock className="h-24 w-full" />
          ) : recentOrders.length === 0 ? (
            <div className="py-4 text-center text-slate-400 dark:text-slate-500">لا توجد طلبات بعد</div>
          ) : (
            <div className="space-y-2">
              {recentOrders.map((o) => (
                <div
                  key={o.id}
                  className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-3 dark:border-white/5 dark:bg-white/5"
                >
                  <div>
                    <div className="font-semibold text-slate-800 dark:text-slate-100">{o.customer_name}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      #{o.order_number} · {formatDateTime(o.created_at)}
                    </div>
                  </div>
                  <div className="text-left">
                    <StatusBadge status={o.status} />
                    <div className="mt-1 text-sm font-semibold text-slate-700 dark:text-slate-200">{formatIQD(o.total_price)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <Link
          to="/reports"
          className="flex items-center justify-center gap-1.5 rounded-2xl bg-white p-4 text-center text-sm font-semibold text-nili shadow-sm dark:bg-slate-900 dark:text-gold"
        >
          <BarChart3 className="h-4 w-4" /> عرض التقارير الكاملة
        </Link>
      </div>
    </div>
  );
}
