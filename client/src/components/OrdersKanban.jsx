import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { formatDate } from '../utils/format';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';

const COLUMNS = [
  {
    key: 'todo',
    titleKey: 'kanban.todo',
    bg: '#FFE5D9',
    bgDark: 'rgba(255,229,217,0.08)',
    statuses: ['جديد'],
    dropStatus: 'جديد',
  },
  {
    key: 'inprogress',
    titleKey: 'kanban.inProgress',
    bg: '#DBEAFE',
    bgDark: 'rgba(219,234,254,0.08)',
    statuses: ['قيد التصميم', 'قيد الطباعة'],
    dropStatus: 'قيد التصميم',
  },
  {
    key: 'ready',
    titleKey: 'kanban.ready',
    bg: '#DCFCE7',
    bgDark: 'rgba(220,252,231,0.08)',
    statuses: ['جاهز للتسليم'],
    dropStatus: 'جاهز للتسليم',
  },
];

const AVATAR_COLORS = ['#8b5cf6', '#f59e0b', '#10b981', '#0ea5e9', '#ef4444', '#6366f1', '#ec4899'];

function avatarColor(name) {
  const code = (name || '؟').charCodeAt(0) || 0;
  return AVATAR_COLORS[code % AVATAR_COLORS.length];
}

function priorityFor(order) {
  if (!order.due_date) return 'low';
  const diffDays = (new Date(order.due_date).getTime() - Date.now()) / 86400000;
  if (diffDays <= 1) return 'high';
  if (diffDays <= 3) return 'medium';
  return 'low';
}

const PRIORITY_KEY = { high: 'kanban.priorityHigh', medium: 'kanban.priorityMedium', low: 'kanban.priorityLow' };
const PRIORITY_STYLE = {
  high: 'bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300',
  medium: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  low: 'bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-300',
};

export default function OrdersKanban({ orders, onOrderChanged }) {
  const { t } = useLanguage();
  const { theme } = useTheme();
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [dragOverCol, setDragOverCol] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return orders.filter((o) => {
      if (o.status === 'تم التسليم') return false;
      if (
        term &&
        !(o.order_number?.toLowerCase().includes(term) || o.customer_name?.toLowerCase().includes(term))
      )
        return false;
      if (priorityFilter && priorityFor(o) !== priorityFilter) return false;
      return true;
    });
  }, [orders, search, priorityFilter]);

  async function handleDrop(e, col) {
    e.preventDefault();
    setDragOverCol(null);
    const orderId = e.dataTransfer.getData('text/plain');
    if (!orderId) return;
    const order = orders.find((o) => String(o.id) === orderId);
    if (!order || col.statuses.includes(order.status)) return;
    setBusyId(orderId);
    try {
      await api.patch(`/orders/${orderId}/status`, { status: col.dropStatus });
      await onOrderChanged();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <input
          className="input max-w-xs"
          placeholder={t('kanban.search')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="input w-auto"
          title={t('kanban.filter')}
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
        >
          <option value="">{t('kanban.filterAll')}</option>
          <option value="high">{t('kanban.priorityHigh')}</option>
          <option value="medium">{t('kanban.priorityMedium')}</option>
          <option value="low">{t('kanban.priorityLow')}</option>
        </select>
        <Link to="/orders/new" className="btn-primary mr-auto">
          {t('kanban.addTask')}
        </Link>
      </div>
      <p className="mb-4 text-xs text-slate-400 dark:text-slate-500">{t('kanban.dragHint')}</p>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {COLUMNS.map((col) => {
          const colOrders = visible.filter((o) => col.statuses.includes(o.status));
          return (
            <div
              key={col.key}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverCol(col.key);
              }}
              onDragLeave={() => setDragOverCol((k) => (k === col.key ? null : k))}
              onDrop={(e) => handleDrop(e, col)}
              className={`rounded-2xl p-4 transition ${
                dragOverCol === col.key ? 'ring-2 ring-nili ring-offset-2 dark:ring-offset-[#0a0a0f]' : ''
              }`}
              style={{ backgroundColor: theme === 'dark' ? col.bgDark : col.bg }}
            >
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-100">{t(col.titleKey)}</h3>
                <span className="rounded-full bg-white/70 px-2 py-0.5 text-xs font-semibold text-slate-500 dark:bg-white/10 dark:text-slate-300">
                  {colOrders.length}
                </span>
              </div>
              <div className="space-y-3">
                {colOrders.map((o) => {
                  const p = priorityFor(o);
                  return (
                    <div
                      key={o.id}
                      draggable
                      onDragStart={(e) => e.dataTransfer.setData('text/plain', String(o.id))}
                      className={`cursor-grab rounded-xl bg-white p-3 shadow-sm transition active:cursor-grabbing dark:border dark:border-violet-500/20 dark:bg-[#1a1a23] ${
                        busyId === String(o.id) ? 'opacity-50' : ''
                      }`}
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <span className={`badge ${PRIORITY_STYLE[p]}`}>
                          {t('kanban.priorityLabel')}: {t(PRIORITY_KEY[p])}
                        </span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500">{o.order_number}</span>
                      </div>
                      <Link
                        to={`/orders/${o.id}`}
                        className="block text-sm font-semibold text-slate-800 hover:text-nili dark:text-slate-100 dark:hover:text-violet-300"
                      >
                        {o.customer_name}
                      </Link>
                      <p className="mt-1 flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                        <span>🖨️</span> {o.item_summary || t('kanban.noDescription')}
                      </p>
                      <div className="mt-3 flex items-center justify-between">
                        <span className="flex items-center gap-1 text-[11px] text-slate-400 dark:text-slate-500">
                          <span>📅</span> {formatDate(o.due_date)}
                        </span>
                        <span
                          className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white"
                          style={{ backgroundColor: avatarColor(o.customer_name) }}
                        >
                          {(o.customer_name || '؟').trim().charAt(0)}
                        </span>
                      </div>
                    </div>
                  );
                })}
                {colOrders.length === 0 && (
                  <div className="rounded-xl border border-dashed border-white/60 bg-white/30 p-4 text-center text-xs text-slate-400 dark:border-white/10 dark:bg-white/5 dark:text-slate-500">
                    {t('kanban.noOrders')}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
