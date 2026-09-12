import { useEffect, useState } from 'react';
import api from '../api/client';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import EmptyState from '../components/ui/EmptyState';
import { useLanguage } from '../context/LanguageContext';
import { formatDateTime, formatRelativeTime } from '../utils/format';

const ACTIONS = ['create', 'update', 'delete', 'login'];
const MODEL_TYPES = ['order', 'customer', 'inventory', 'payment', 'user'];
const PAGE_SIZE = 25;

const ACTION_STYLES = {
  create: 'bg-success/15 text-success dark:bg-success/15 dark:text-success',
  update: 'bg-gold/15 text-gold-dark dark:bg-gold/15 dark:text-gold-light',
  delete: 'bg-danger/15 text-danger dark:bg-danger/15 dark:text-danger',
  login: 'bg-slate-200 text-slate-600 dark:bg-white/10 dark:text-slate-300',
};

// Task 6: /activity-logs — audit trail of who did what, filterable by
// employee, action, model type, and date range, with server-side pagination.
// Route is gated by the `view_activity_logs` permission (see App.jsx).
export default function ActivityLogs() {
  const { t } = useLanguage();
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [users, setUsers] = useState([]);
  const [userId, setUserId] = useState('');
  const [action, setAction] = useState('');
  const [modelType, setModelType] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/activity-logs/users')
      .then((r) => setUsers(r.data.users))
      .catch(() => setUsers([]));
  }, []);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, userId, action, modelType, dateFrom, dateTo]);

  async function load() {
    setError('');
    try {
      const res = await api.get('/activity-logs', {
        params: {
          user_id: userId || undefined,
          action: action || undefined,
          model_type: modelType || undefined,
          date_from: dateFrom || undefined,
          date_to: dateTo || undefined,
          page,
          pageSize: PAGE_SIZE,
        },
      });
      setRows(res.data.rows);
      setTotal(res.data.total);
    } catch {
      setError(t('activityLogs.errorLoad'));
    }
  }

  function resetFilters() {
    setUserId('');
    setAction('');
    setModelType('');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="p-6">
      <PageHeader title={t('activityLogs.title')} subtitle={t('activityLogs.subtitle')} />

      {error && (
        <div className="mb-4 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger dark:bg-danger/10 dark:text-danger">
          {error}
        </div>
      )}

      <div className="card mb-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="label">{t('activityLogs.filterUser')}</label>
          <select className="input" value={userId} onChange={(e) => { setUserId(e.target.value); setPage(1); }}>
            <option value="">{t('orders.all')}</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">{t('activityLogs.filterAction')}</label>
          <select className="input" value={action} onChange={(e) => { setAction(e.target.value); setPage(1); }}>
            <option value="">{t('orders.all')}</option>
            {ACTIONS.map((a) => (
              <option key={a} value={a}>{t(`activityLogs.action.${a}`)}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">{t('activityLogs.filterModelType')}</label>
          <select className="input" value={modelType} onChange={(e) => { setModelType(e.target.value); setPage(1); }}>
            <option value="">{t('orders.all')}</option>
            {MODEL_TYPES.map((m) => (
              <option key={m} value={m}>{t(`activityLogs.model.${m}`)}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">{t('activityLogs.filterFrom')}</label>
          <input className="input" type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} />
        </div>
        <div>
          <label className="label">{t('activityLogs.filterTo')}</label>
          <input className="input" type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} />
        </div>
        <button type="button" className="btn-secondary" onClick={resetFilters}>
          {t('activityLogs.clearFilters')}
        </button>
      </div>

      <div className="card">
        {rows.length === 0 ? (
          <EmptyState icon="🕓" title={t('common.noData')} />
        ) : (
          <div className="border-r-2 border-slate-200 pr-5 dark:border-white/10">
            {rows.map((r) => (
              <div key={r.id} className="relative pb-6 last:pb-0">
                <span className="absolute -right-[25px] top-1 h-3 w-3 rounded-full border-2 border-white bg-gold dark:border-slate-900" />
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">{r.user_name || '—'}</span>
                  <span className={`badge ${ACTION_STYLES[r.action] || 'bg-slate-200 text-slate-600'}`}>
                    {t(`activityLogs.action.${r.action}`) || r.action}
                  </span>
                  <span className="text-xs text-slate-400 dark:text-slate-500">
                    {t(`activityLogs.model.${r.model_type}`) || r.model_type}
                  </span>
                  <span className="mr-auto text-xs text-slate-400 dark:text-slate-500" title={formatDateTime(r.created_at)}>
                    {formatRelativeTime(r.created_at)}
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{r.description}</p>
                {(r.old_values || r.new_values) && (
                  <button
                    type="button"
                    className="mt-1 text-xs font-semibold text-nili underline dark:text-gold"
                    onClick={() => setSelected(r)}
                  >
                    {t('activityLogs.viewChanges')}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {total > 0 && (
        <div className="mt-4 flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
          <span>{t('activityLogs.totalCount', { count: total })}</span>
          <div className="flex items-center gap-2">
            <button type="button" className="btn-secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              {t('activityLogs.prevPage')}
            </button>
            <span>{page} / {totalPages}</span>
            <button type="button" className="btn-secondary" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              {t('activityLogs.nextPage')}
            </button>
          </div>
        </div>
      )}

      {selected && (
        <Modal open title={t('activityLogs.viewChanges')} onClose={() => setSelected(null)}>
          <div className="space-y-3 text-xs">
            <div>
              <p className="mb-1 font-semibold text-slate-600 dark:text-slate-300">{t('activityLogs.oldValues')}</p>
              <pre className="max-h-48 overflow-auto rounded-lg bg-slate-100 p-3 dark:bg-white/5" dir="ltr">
                {selected.old_values ? JSON.stringify(JSON.parse(selected.old_values), null, 2) : '—'}
              </pre>
            </div>
            <div>
              <p className="mb-1 font-semibold text-slate-600 dark:text-slate-300">{t('activityLogs.newValues')}</p>
              <pre className="max-h-48 overflow-auto rounded-lg bg-slate-100 p-3 dark:bg-white/5" dir="ltr">
                {selected.new_values ? JSON.stringify(JSON.parse(selected.new_values), null, 2) : '—'}
              </pre>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
