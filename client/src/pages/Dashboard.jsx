import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/client';
import ViewToggle, { useViewMode } from '../components/ViewToggle';
import OrdersKanban from '../components/OrdersKanban';
import InteractiveBackground from '../components/InteractiveBackground';
import StatCard from '../components/ui/StatCard';
import EmptyState from '../components/ui/EmptyState';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';
import { StatCardsSkeleton, SkeletonBlock } from '../components/ui/LoadingSkeleton';
import ErrorBanner from '../components/ui/ErrorBanner';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useDashboardSummary } from '../context/DashboardSummaryContext';
import { DASHBOARD_SECTION_ITEMS } from '../config/nav';
import { formatIQD, formatDate } from '../utils/format';

const IN_PROGRESS_STATUSES = ['قيد التصميم', 'قيد الطباعة'];
const READY_STATUS = 'جاهز للتسليم';
const SEARCH_DEBOUNCE_MS = 300;

export default function Dashboard() {
  const { t } = useLanguage();
  const { isOwner, hasPermission } = useAuth();
  const navigate = useNavigate();
  const { summary, loading: summaryLoading, error: summaryError, refresh } = useDashboardSummary();
  const [orders, setOrders] = useState([]);
  const [listsLoading, setListsLoading] = useState(true);
  const inputRef = useRef(null);
  const [mode, setMode] = useViewMode('raqeem_view_dashboard', 'list');

  // ---------- live customer search + quick order creation ----------
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const debounceRef = useRef(null);
  const [customerResults, setCustomerResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickAddName, setQuickAddName] = useState('');
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const addMenuRef = useRef(null);

  // يسكر قائمة "+" (طلب جديد / عميل جديد) إذا ضغط المستخدم بره منها.
  useEffect(() => {
    if (!addMenuOpen) return undefined;
    function onClickOutside(e) {
      if (addMenuRef.current && !addMenuRef.current.contains(e.target)) setAddMenuOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [addMenuOpen]);

  function onSearchChange(value) {
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(value), SEARCH_DEBOUNCE_MS);
  }

  useEffect(() => () => debounceRef.current && clearTimeout(debounceRef.current), []);

  useEffect(() => {
    const term = debouncedSearch.trim();
    if (!term) {
      setCustomerResults([]);
      setSearchLoading(false);
      return;
    }
    let cancelled = false;
    setSearchLoading(true);
    api
      .get('/customers', { params: { search: term } })
      .then((res) => {
        if (!cancelled) setCustomerResults((res.data.customers || []).slice(0, 8));
      })
      .catch(() => {
        if (!cancelled) setCustomerResults([]);
      })
      .finally(() => {
        if (!cancelled) setSearchLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedSearch]);

  function goToNewOrder(customerId) {
    navigate(`/orders/new?customer_id=${customerId}`);
  }

  function openQuickAdd() {
    setQuickAddName(search.trim());
    setQuickAddOpen(true);
  }

  function loadOrders() {
    return api
      .get('/orders')
      .then((res) => setOrders(res.data.orders || []))
      .catch(() => setOrders([]));
  }

  useEffect(() => {
    loadOrders().finally(() => setListsLoading(false));
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

  // "طلبات تحتاج متابعة" — نفس قائمة dueSoon يلي أصلاً محسوبة بالباك-إند
  // (غير مسلَّمة + موعد تسليمها خلال يومين أو فات)، مرتّبة أقرب استحقاق أولاً.
  const followUpOrders = (summary?.dueSoon || []).slice(0, 8);

  const sectionItems = DASHBOARD_SECTION_ITEMS.filter(
    (item) => (!item.ownerOnly || isOwner) && (!item.permission || isOwner || hasPermission(item.permission))
  ).slice(0, 8);

  const searchTerm = search.trim();
  const showDropdown = debouncedSearch.trim().length > 0;

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

      <div className="relative z-[1] mx-auto max-w-6xl px-6 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">{t('dashboard.badge')}</h1>
          </div>
          <ViewToggle mode={mode} onChange={setMode} />
        </div>

        {/* ---------- Search + quick-add ---------- */}
        <div className="relative mx-auto max-w-2xl">
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={t('dashboard.searchPlaceholder')}
            className="w-full rounded-2xl border border-slate-200 bg-white py-4 pl-14 pr-12 text-sm text-slate-800 shadow-[0_16px_48px_rgba(0,0,0,0.06)] placeholder:text-gray-400 focus:outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
          />

          {/* أيقونة البحث — يمين (RTL) */}
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
            </svg>
          </span>

          {/* زر إضافة سريعة (طلب جديد / عميل جديد) — يسار (RTL) */}
          <div ref={addMenuRef} className="absolute left-3 top-1/2 -translate-y-1/2">
            <button
              type="button"
              onClick={() => setAddMenuOpen((v) => !v)}
              title={t('dashboard.quickAddMenu')}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#C5A880] text-base font-bold leading-none text-[#1A2744] transition hover:brightness-95"
            >
              +
            </button>
            {addMenuOpen && (
              <div className="absolute left-0 top-full z-50 mt-2 w-44 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setAddMenuOpen(false);
                    navigate('/orders/new');
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-right text-sm text-slate-700 hover:bg-nili/5 dark:text-slate-200 dark:hover:bg-white/5"
                >
                  ➕ {t('dashboard.quickNewOrder')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAddMenuOpen(false);
                    openQuickAdd();
                  }}
                  className="flex w-full items-center gap-2 border-t border-slate-100 px-4 py-2.5 text-right text-sm text-slate-700 hover:bg-nili/5 dark:border-white/5 dark:text-slate-200 dark:hover:bg-white/5"
                >
                  👤 {t('dashboard.quickNewCustomer')}
                </button>
              </div>
            )}
          </div>

          {showDropdown && (
            <div className="absolute inset-x-0 top-full z-20 mt-2 max-h-80 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-800 dark:bg-slate-900">
              {searchLoading && <p className="p-4 text-sm text-slate-400 dark:text-slate-500">{t('common.loading')}</p>}
              {!searchLoading &&
                customerResults.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-3 text-sm last:border-0 hover:bg-nili/5 dark:border-white/5 dark:hover:bg-white/5"
                  >
                    <Link to={`/customers/${c.id}`} className="min-w-0 flex-1 text-slate-700 dark:text-slate-200">
                      <span className="font-medium">{c.name}</span>
                      {c.phone && <span className="mr-2 text-slate-400 dark:text-slate-500">· {c.phone}</span>}
                    </Link>
                    <button
                      type="button"
                      onClick={() => goToNewOrder(c.id)}
                      title={t('dashboard.quickOrderForCustomer')}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-black text-lg font-bold leading-none text-white transition hover:bg-nili/90 dark:bg-nili dark:hover:bg-nili-light"
                    >
                      +
                    </button>
                  </div>
                ))}
              {!searchLoading && customerResults.length === 0 && (
                <button
                  type="button"
                  onClick={openQuickAdd}
                  className="flex w-full items-center justify-between gap-2 px-4 py-3 text-sm text-slate-600 hover:bg-nili/5 dark:text-slate-300 dark:hover:bg-white/5"
                >
                  <span>{t('dashboard.addNewCustomerWithName', { name: searchTerm })}</span>
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-black text-white dark:bg-nili">+</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* ---------- Alert banners (debts / stock) ---------- */}
        {(dueSoonCount > 0 || lowStockCount > 0) && (
          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {dueSoonCount > 0 && (
              <Link
                to="/orders?filter=today"
                className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-700 transition hover:bg-amber-100 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300 dark:hover:bg-amber-500/20"
              >
                ⏰ {t('dashboard.alertDueSoon', { count: dueSoonCount })}
              </Link>
            )}
            {lowStockCount > 0 && (
              <Link
                to="/stock?filter=low_stock"
                className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 transition hover:bg-rose-100 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300 dark:hover:bg-rose-500/20"
              >
                📦 {t('dashboard.alertLowStock', { count: lowStockCount })}
              </Link>
            )}
          </div>
        )}

        {/* ---------- KPIs ---------- */}
        {summaryError && <ErrorBanner onRetry={refresh}>تعذّر تحميل الإحصائيات، تأكد من الاتصال بالخادم</ErrorBanner>}
        {summaryLoading ? (
          <div className="mt-6">
            <StatCardsSkeleton count={6} />
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            <StatCard accent to="/orders?filter=today" icon="🧾" label={t('dashboard.statOrdersToday')} value={summary?.ordersToday || 0} />
            <StatCard
              accent
              to="/orders?status=in_progress"
              icon="🎨"
              label={t('dashboard.statInProgress')}
              value={statusCounts.inProgress}
              tone="warning"
            />
            <StatCard accent to="/orders?status=ready" icon="✅" label={t('dashboard.statReady')} value={statusCounts.ready} tone="success" />
            <StatCard
              accent
              to="/reports?range=today"
              icon="💰"
              label={t('dashboard.statProfitToday')}
              value={summary?.profitToday?.profit || 0}
              format={formatIQD}
            />
            <StatCard
              to="/customers?filter=debtors"
              icon="⚠️"
              label={t('dashboard.statDebt')}
              value={summary?.totalDebt || 0}
              format={formatIQD}
              tone={(summary?.totalDebt || 0) > 0 ? 'danger' : 'default'}
            />
            <StatCard
              to="/stock?filter=low_stock"
              icon="📦"
              label={t('dashboard.statLowStock')}
              value={lowStockCount}
              tone={lowStockCount > 0 ? 'danger' : 'default'}
            />
          </div>
        )}

        {/* ---------- Main: follow-up table + quick access ---------- */}
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="card lg:col-span-2">
            <h2 className="mb-1 text-sm font-bold text-slate-800 dark:text-slate-100">{t('dashboard.followUpTitle')}</h2>
            <p className="mb-4 text-xs text-slate-400 dark:text-slate-500">{t('dashboard.followUpSubtitle')}</p>
            {listsLoading ? (
              <div className="space-y-3">
                <SkeletonBlock className="h-10 w-full" />
                <SkeletonBlock className="h-10 w-full" />
                <SkeletonBlock className="h-10 w-full" />
              </div>
            ) : followUpOrders.length === 0 ? (
              <EmptyState icon="🎉" title={t('dashboard.emptyFollowUpTitle')} />
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

      {quickAddOpen && (
        <QuickAddCustomerModal
          initialName={quickAddName}
          onClose={() => setQuickAddOpen(false)}
          onCreated={(id) => {
            setQuickAddOpen(false);
            goToNewOrder(id);
          }}
        />
      )}
    </div>
  );
}

// "Add new customer with this name" — creates the customer inline then
// continues straight into the new-order flow with it pre-selected, so the
// employee never has to pick the customer again.
function QuickAddCustomerModal({ initialName, onClose, onCreated }) {
  const { t } = useLanguage();
  const [name, setName] = useState(initialName || '');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setError('');
    setSaving(true);
    try {
      const res = await api.post('/customers', { name: name.trim(), phone: phone || undefined });
      onCreated(res.data.id);
    } catch (err) {
      setError(err.response?.data?.error || t('stock.errorSave'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open title={t('customers.modalTitle')} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        {error && (
          <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">{error}</div>
        )}
        <div>
          <label className="label">{t('common.name')}</label>
          <input className="input" required autoFocus value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className="label">{t('common.phone')}</label>
          <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose}>
            {t('common.cancel')}
          </button>
          <button disabled={saving} className="btn-primary">
            {saving ? t('newOrder.savingBtn') : t('dashboard.saveAndCreateOrder')}
          </button>
        </div>
      </form>
    </Modal>
  );
}
