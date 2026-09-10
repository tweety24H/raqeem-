import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '../api/client';
import { formatDate } from '../utils/format';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import StatusBadge from './StatusBadge';

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

const AVATAR_COLORS = ['#1B2A6B', '#f59e0b', '#10b981', '#0ea5e9', '#ef4444', '#6366f1', '#ec4899'];

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
const PRIORITY_DOT = { high: 'bg-rose-500', medium: 'bg-amber-500', low: 'bg-slate-300 dark:bg-slate-600' };

const IN_PROGRESS_STATUSES = ['قيد التصميم', 'قيد الطباعة'];

// نفس صيغة حساب التقدّم المستخدمة بالداشبورد (client/src/pages/Dashboard.jsx)
// — نسخة محلية صغيرة حتى ما نضيف ملف util مشترك لاستخدام وحيد بكل ملف.
function progressFor(order) {
  if (!order.due_date) return 50;
  const start = new Date((order.created_at || '').replace(' ', 'T')).getTime();
  const due = new Date((order.due_date || '').replace(' ', 'T')).getTime();
  const now = Date.now();
  if (Number.isNaN(start) || Number.isNaN(due) || due <= start) return 50;
  const pct = Math.round(((now - start) / (due - start)) * 100);
  return Math.min(95, Math.max(5, pct));
}

export default function OrdersKanban({ orders, onOrderChanged }) {
  const { t } = useLanguage();
  const { theme } = useTheme();
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [dragOverCol, setDragOverCol] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [draggingId, setDraggingId] = useState(null);

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
          const isDropTarget = dragOverCol === col.key;
          return (
            <motion.div
              key={col.key}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverCol(col.key);
              }}
              onDragLeave={() => setDragOverCol((k) => (k === col.key ? null : k))}
              onDrop={(e) => handleDrop(e, col)}
              animate={{ scale: isDropTarget ? 1.015 : 1 }}
              transition={{ duration: 0.2, ease: [0.22, 0.61, 0.36, 1] }}
              className={`rounded-2xl border-2 p-4 transition-colors ${
                isDropTarget
                  ? 'border-dashed border-gold/50 bg-gold/10'
                  : 'border-transparent'
              }`}
              style={isDropTarget ? undefined : { backgroundColor: theme === 'dark' ? col.bgDark : col.bg }}
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
                  const isDragging = draggingId === o.id;
                  const inProgress = IN_PROGRESS_STATUSES.includes(o.status);
                  return (
                    <motion.div
                      key={o.id}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('text/plain', String(o.id));
                        setDraggingId(o.id);
                      }}
                      onDragEnd={() => setDraggingId(null)}
                      animate={{
                        scale: isDragging ? 1.05 : 1,
                        rotate: isDragging ? 2 : 0,
                        opacity: isDragging ? 0.9 : busyId === String(o.id) ? 0.5 : 1,
                      }}
                      transition={{ duration: 0.15, ease: [0.22, 0.61, 0.36, 1] }}
                      className={`cursor-grab rounded-2xl bg-white p-3 transition-shadow active:cursor-grabbing dark:border dark:border-slate-800 dark:bg-slate-900 ${
                        isDragging ? 'shadow-xl' : 'shadow-sm'
                      }`}
                    >
                      <div className="mb-2 flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <Link
                            to={`/orders/${o.id}`}
                            className="block truncate text-sm font-bold text-slate-800 hover:text-nili dark:text-slate-100 dark:hover:text-gold"
                          >
                            {o.customer_name}
                          </Link>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400">{o.order_number}</span>
                        </div>
                        <StatusBadge status={o.status} />
                      </div>
                      <p className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                        <span>🖨️</span> {o.item_summary || t('kanban.noDescription')}
                      </p>
                      {inProgress && (
                        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
                          <motion.div
                            className="h-full rounded-full bg-gold"
                            initial={{ width: 0 }}
                            animate={{ width: `${progressFor(o)}%` }}
                            transition={{ duration: 0.6, ease: [0.22, 0.61, 0.36, 1] }}
                          />
                        </div>
                      )}
                      <div className="mt-3 flex items-center justify-between">
                        <span
                          className="flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500"
                          title={`${t('kanban.priorityLabel')}: ${t(PRIORITY_KEY[p])}`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${PRIORITY_DOT[p]}`} />
                          📅 {formatDate(o.due_date)}
                        </span>
                        <span
                          className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white"
                          style={{ backgroundColor: avatarColor(o.customer_name) }}
                        >
                          {(o.customer_name || '؟').trim().charAt(0)}
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
                {colOrders.length === 0 && (
                  <div className="rounded-xl border border-dashed border-white/60 bg-white/30 p-4 text-center text-xs text-slate-400 dark:border-white/10 dark:bg-white/5 dark:text-slate-500">
                    {t('kanban.noOrders')}
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
