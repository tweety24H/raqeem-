import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '../api/client';
import ViewToggle, { useViewMode } from '../components/ViewToggle';
import OrdersKanban from '../components/OrdersKanban';
import InteractiveBackground from '../components/InteractiveBackground';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import StatCard from '../components/ui/StatCard';
import EmptyState from '../components/ui/EmptyState';
import { StatCardsSkeleton, SectionCardsSkeleton, SkeletonBlock } from '../components/ui/LoadingSkeleton';
import ErrorBanner from '../components/ui/ErrorBanner';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useDashboardSummary } from '../context/DashboardSummaryContext';
import { DASHBOARD_SECTION_ITEMS } from '../config/nav';
import { formatIQD } from '../utils/format';

function formatTime(dateStr) {
  const d = new Date((dateStr || '').replace(' ', 'T'));
  if (Number.isNaN(d.getTime())) return '--:--';
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }).replace(/\s?[AP]M/i, '');
}

function progressFor(order) {
  if (!order.due_date) return 50;
  const start = new Date((order.created_at || '').replace(' ', 'T')).getTime();
  const due = new Date((order.due_date || '').replace(' ', 'T')).getTime();
  const now = Date.now();
  if (Number.isNaN(start) || Number.isNaN(due) || due <= start) return 50;
  const pct = Math.round(((now - start) / (due - start)) * 100);
  return Math.min(95, Math.max(5, pct));
}

const IN_PROGRESS_STATUSES = ['قيد التصميم', 'قيد الطباعة'];
const READY_STATUS = 'جاهز للتسليم';

const heroContainer = { hidden: {}, show: { transition: { staggerChildren: 0.09, delayChildren: 0.05 } } };
const heroItem = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 0.61, 0.36, 1] } },
};
const sectionReveal = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 0.61, 0.36, 1] } },
};

export default function Dashboard() {
  const { t } = useLanguage();
  const { isOwner } = useAuth();
  const { summary, loading: summaryLoading, error: summaryError, refresh } = useDashboardSummary();
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [listsLoading, setListsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const inputRef = useRef(null);
  const sectionsRef = useRef(null);
  const [mode, setMode] = useViewMode('raqeem_view_dashboard', 'list');

  function loadOrders() {
    return api
      .get('/orders')
      .then((res) => setOrders(res.data.orders || []))
      .catch(() => setOrders([]));
  }

  useEffect(() => {
    Promise.all([
      loadOrders(),
      api.get('/customers').then((res) => setCustomers(res.data.customers || [])).catch(() => setCustomers([])),
    ]).finally(() => setListsLoading(false));
  }, []);

  useEffect(() => {
    function onKeyDown(e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const today = new Date().toISOString().slice(0, 10);

  const todayOrders = useMemo(
    () =>
      orders
        .filter((o) => (o.created_at || '').slice(0, 10) === today)
        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
        .slice(0, 3),
    [orders, today]
  );

  const printingOrders = useMemo(() => orders.filter((o) => o.status === 'قيد الطباعة').slice(0, 3), [orders]);
  const readyOrders = useMemo(() => orders.filter((o) => o.status === READY_STATUS).slice(0, 3), [orders]);

  const searchResults = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return null;
    const matchedOrders = orders
      .filter((o) => o.order_number?.toLowerCase().includes(term) || o.customer_name?.toLowerCase().includes(term))
      .slice(0, 5)
      .map((o) => ({ type: 'order', id: o.id, label: `${o.order_number} — ${o.customer_name}` }));
    const matchedCustomers = customers
      .filter((c) => c.name?.toLowerCase().includes(term) || c.phone?.toLowerCase().includes(term))
      .slice(0, 5)
      .map((c) => ({ type: 'customer', id: c.id, label: c.name }));
    return [...matchedOrders, ...matchedCustomers];
  }, [search, orders, customers]);

  // Real counts derived from GET /dashboard/summary's ordersByStatus (all-time,
  // not day-scoped — the API doesn't offer a per-day breakdown by status, so
  // these tiles are labeled "الآن"/"Now" rather than implying "today").
  const statusCounts = useMemo(() => {
    const map = Object.fromEntries((summary?.ordersByStatus || []).map((s) => [s.status, s.count]));
    return {
      inProgress: IN_PROGRESS_STATUSES.reduce((sum, s) => sum + (map[s] || 0), 0),
      ready: map[READY_STATUS] || 0,
    };
  }, [summary]);

  const dueSoonCount = summary?.dueSoon?.length || 0;
  const lowStockCount = summary?.lowStock?.length || 0;

  function scrollToSections() {
    sectionsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  const sectionItems = DASHBOARD_SECTION_ITEMS.filter((item) => !item.ownerOnly || isOwner);
  const sectionBadges = { '/orders': dueSoonCount, '/stock': lowStockCount };

  if (mode === 'grid') {
    return (
      <div className="relative min-h-screen overflow-hidden bg-slate-50 p-6 dark:bg-slate-950">
        <InteractiveBackground />
        <div className="relative z-[1] mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{t('kanban.title')}</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">{t('kanban.subtitle')}</p>
          </div>
          <ViewToggle mode={mode} onChange={setMode} />
        </div>
        <div className="relative z-[1]">
          <OrdersKanban orders={orders} onOrderChanged={loadOrders} />
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-50 dark:bg-slate-950">
      <InteractiveBackground />

      <div className="absolute left-6 top-6 z-10">
        <ViewToggle mode={mode} onChange={setMode} />
      </div>

      <div className="relative z-[1] mx-auto max-w-6xl px-6 py-14">
        {/* ---------- Hero ---------- */}
        <motion.div variants={heroContainer} initial="hidden" animate="show" className="mb-10 text-center">
          <motion.span
            variants={heroItem}
            className="inline-block rounded-full border border-slate-200 bg-white/60 px-3 py-1 text-xs tracking-widest text-slate-500 dark:border-slate-800 dark:bg-white/5 dark:text-slate-400"
          >
            {t('dashboard.badge')}
          </motion.span>
          <motion.h1 variants={heroItem} className="mt-4 font-arabic text-4xl font-semibold tracking-[-0.01em] text-slate-900 dark:text-slate-100">
            {t('dashboard.heroTitle')}
          </motion.h1>
          <motion.p variants={heroItem} className="mt-2 text-3xl text-gray-400 dark:text-slate-500">
            {t('dashboard.heroSubtitle')}
          </motion.p>

          <motion.div variants={heroItem} className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Button to="/orders/new" variant="primary" className="!px-6 !py-3 !text-base">
              {t('dashboard.ctaPrimary')}
            </Button>
            <Button onClick={scrollToSections} variant="ghost" magnetic={false} className="!px-6 !py-3 !text-base border border-slate-200 dark:border-white/10">
              {t('dashboard.ctaSecondary')}
            </Button>
          </motion.div>

          <motion.div variants={heroItem} className="relative mx-auto mt-8 max-w-2xl">
            <div className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-[0_16px_48px_rgba(0,0,0,0.06)] dark:border-slate-800 dark:bg-slate-900">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-black">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                  <circle cx="11" cy="11" r="7" />
                  <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
                </svg>
              </div>
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('dashboard.searchPlaceholder')}
                className="flex-1 bg-transparent text-sm text-slate-800 placeholder:text-gray-400 focus:outline-none dark:text-slate-100 dark:placeholder:text-slate-500"
              />
              <kbd className="shrink-0 rounded-md bg-slate-100 px-2 py-1 text-xs font-mono text-slate-500 dark:bg-white/10 dark:text-slate-300">⌘K</kbd>
            </div>

            {searchResults && (
              <div className="absolute inset-x-0 top-full z-20 mt-2 max-h-80 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-800 dark:bg-slate-900">
                {searchResults.length === 0 && (
                  <p className="p-4 text-sm text-slate-400 dark:text-slate-500">{t('dashboard.noSearchResults')}</p>
                )}
                {searchResults.map((r) => (
                  <Link
                    key={`${r.type}-${r.id}`}
                    to={r.type === 'order' ? `/orders/${r.id}` : `/customers/${r.id}`}
                    className="flex items-center gap-2 border-b border-slate-100 px-4 py-3 text-sm text-slate-700 last:border-0 hover:bg-nili/5 dark:border-white/5 dark:text-slate-200 dark:hover:bg-white/5"
                  >
                    <span className="text-xs text-slate-400 dark:text-slate-500">{r.type === 'order' ? 'طلب' : 'زبون'}</span>
                    {r.label}
                  </Link>
                ))}
              </div>
            )}
          </motion.div>

          <motion.div variants={heroItem} className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <Button to="/orders/new" variant="secondary" className="!px-4 !py-2 !text-sm" magnetic={false}>
              ➕ {t('dashboard.quickNewOrder')}
            </Button>
            <Button to="/customers?new=1" variant="secondary" className="!px-4 !py-2 !text-sm" magnetic={false}>
              👤 {t('dashboard.quickNewCustomer')}
            </Button>
            <Button to="/stock" variant="secondary" className="!px-4 !py-2 !text-sm" magnetic={false}>
              📦 {t('dashboard.quickStock')}
            </Button>
            <Button to="/reports" variant="secondary" className="!px-4 !py-2 !text-sm" magnetic={false}>
              📊 {t('dashboard.quickReport')}
            </Button>
          </motion.div>
        </motion.div>

        {/* ---------- Real stats (GET /dashboard/summary + /customers) ---------- */}
        {summaryError && <ErrorBanner onRetry={refresh}>تعذّر تحميل الإحصائيات، تأكد من الاتصال بالخادم</ErrorBanner>}
        {summaryLoading ? (
          <StatCardsSkeleton count={6} />
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            <StatCard accent icon="🧾" label={t('dashboard.statOrdersToday')} value={summary?.ordersToday || 0} />
            <StatCard accent icon="🎨" label={t('dashboard.statInProgress')} value={statusCounts.inProgress} tone="warning" />
            <StatCard accent icon="✅" label={t('dashboard.statReady')} value={statusCounts.ready} tone="success" />
            <StatCard
              accent
              icon="💰"
              label={t('dashboard.statProfitToday')}
              value={summary?.profitToday?.profit || 0}
              format={formatIQD}
            />
            <StatCard
              icon="⚠️"
              label={t('dashboard.statDebt')}
              value={summary?.totalDebt || 0}
              format={formatIQD}
              tone={(summary?.totalDebt || 0) > 0 ? 'danger' : 'default'}
            />
            <StatCard
              icon="📦"
              label={t('dashboard.statLowStock')}
              value={lowStockCount}
              tone={lowStockCount > 0 ? 'danger' : 'default'}
            />
          </div>
        )}

        {/* ---------- Today / In progress / Ready columns (real data, honest empty states) ---------- */}
        <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <TodayColumn orders={todayOrders} loading={listsLoading} />
          <PrintingColumn orders={printingOrders} loading={listsLoading} />
          <ReadyColumn orders={readyOrders} loading={listsLoading} />
        </div>

        {/* ---------- App sections ---------- */}
        <div ref={sectionsRef} className="mt-14 scroll-mt-10">
          <h2 className="mb-4 text-lg font-bold text-slate-800 dark:text-slate-100">{t('dashboard.sectionsTitle')}</h2>
          {listsLoading ? (
            <SectionCardsSkeleton count={sectionItems.length} />
          ) : (
            <motion.div
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: '-40px' }}
              variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05 } } }}
              className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4"
            >
              {sectionItems.map((item) => (
                <motion.div key={item.to} variants={sectionReveal}>
                  <Card to={item.to} icon={item.icon} glow className="h-full">
                    <p className="font-semibold text-slate-800 dark:text-slate-100">{t(item.key)}</p>
                    {sectionBadges[item.to] > 0 && (
                      <span className="mt-2 inline-block rounded-full bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-600 dark:bg-rose-500/15 dark:text-rose-300">
                        {sectionBadges[item.to]}
                      </span>
                    )}
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

function TodayColumn({ orders, loading }) {
  const { t } = useLanguage();
  const items = orders.map((o) => ({
    time: formatTime(o.created_at),
    label: `${o.customer_name} — ${o.item_summary || o.order_number}`,
  }));

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-5 flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-100">
        <span>🕐</span>
        {t('dashboard.today')}
      </div>
      {loading ? (
        <div className="space-y-4">
          <SkeletonBlock className="h-3 w-3/4" />
          <SkeletonBlock className="h-3 w-2/3" />
          <SkeletonBlock className="h-3 w-1/2" />
        </div>
      ) : items.length === 0 ? (
        <EmptyState icon="🕐" title={t('dashboard.emptyTodayTitle')} />
      ) : (
        <div className="relative space-y-5 pr-4">
          <div className="absolute bottom-1 right-1 top-1 w-px bg-slate-200 dark:bg-white/10" />
          {items.map((it, i) => (
            <div key={i} className="relative">
              <span className="absolute right-[-1.15rem] top-1 h-2 w-2 -translate-x-1/2 rounded-full bg-nili" />
              <p className="text-xs text-slate-400 dark:text-slate-500">{it.time}</p>
              <p className="mt-0.5 text-sm font-medium text-slate-800 dark:text-slate-200">{it.label}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PrintingColumn({ orders, loading }) {
  const { t } = useLanguage();
  const items = orders.map((o) => ({
    label: `${o.customer_name} — ${o.item_summary || o.order_number}`,
    progress: progressFor(o),
  }));

  return (
    <div className="rounded-2xl bg-black p-5 text-white dark:border dark:border-slate-800">
      <div className="mb-5 text-sm font-bold">{t('dashboard.inProgress')}</div>
      {loading ? (
        <div className="space-y-4">
          <SkeletonBlock className="h-3 w-full !bg-white/10" />
          <SkeletonBlock className="h-3 w-full !bg-white/10" />
        </div>
      ) : items.length === 0 ? (
        <p className="py-6 text-center text-sm text-white/40">{t('dashboard.emptyInProgressTitle')}</p>
      ) : (
        <div className="space-y-4">
          {items.map((it, i) => (
            <div key={i}>
              <div className="mb-1.5 flex items-center justify-between text-xs">
                <span className="text-white/90">{it.label}</span>
                <span className="text-white/50">{it.progress}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-l from-nili to-gold"
                  initial={{ width: 0 }}
                  animate={{ width: `${it.progress}%` }}
                  transition={{ duration: 0.6, ease: [0.22, 0.61, 0.36, 1] }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ReadyColumn({ orders, loading }) {
  const { t } = useLanguage();
  const items = orders.map((o) => ({
    id: o.id,
    label: o.customer_name,
    sub: o.item_summary || o.order_number,
  }));

  return (
    <div className="space-y-3">
      <div className="mb-2 text-sm font-bold text-slate-800 dark:text-slate-100">{t('dashboard.readyForDelivery')}</div>
      {loading ? (
        <div className="space-y-3">
          <SkeletonBlock className="h-14 w-full" />
          <SkeletonBlock className="h-14 w-full" />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 dark:border-white/10">
          <EmptyState icon="✅" title={t('dashboard.emptyReadyTitle')} />
        </div>
      ) : (
        items.map((it, i) => (
          <div
            key={i}
            className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
          >
            <div>
              <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{it.label}</p>
              <p className="text-xs text-slate-400 dark:text-slate-500">{it.sub}</p>
            </div>
            <Link
              to={`/orders/${it.id}`}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-black text-white hover:bg-slate-800 dark:bg-nili dark:hover:bg-nili-light"
            >
              ←
            </Link>
          </div>
        ))
      )}
    </div>
  );
}
