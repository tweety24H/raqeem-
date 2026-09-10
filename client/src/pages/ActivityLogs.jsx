import { useEffect, useState } from 'react';
import api from '../api/client';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import { useLanguage } from '../context/LanguageContext';
import { formatDateTime } from '../utils/format';

const ACTIONS = ['create', 'update', 'delete', 'login'];
const MODEL_TYPES = ['order', 'customer', 'inventory', 'payment', 'user'];
const PAGE_SIZE = 25;

const ACTION_STYLES = {
  create: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  update: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  delete: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
  login: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300',
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
        <div className="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">
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

      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-400">
            <tr>
              <th className="px-4 py-3 text-right">{t('activityLogs.colDate')}</th>
              <th className="px-4 py-3 text-right">{t('activityLogs.colEmployee')}</th>
              <th className="px-4 py-3 text-right">{t('activityLogs.colAction')}</th>
              <th className="px-4 py-3 text-right">{t('activityLogs.colType')}</th>
              <th className="px-4 py-3 text-right">{t('activityLogs.colDescription')}</th>
              <th className="px-4 py-3 text-right"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-slate-100 dark:border-white/5">
                <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{formatDateTime(r.created_at)}</td>
                <td className="px-4 py-3 dark:text-slate-200">{r.user_name || '—'}</td>
                <td className="px-4 py-3">
                  <span className={`badge ${ACTION_STYLES[r.action] || 'bg-slate-200 text-slate-600'}`}>
                    {t(`activityLogs.action.${r.action}`) || r.action}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                  {t(`activityLogs.model.${r.model_type}`) || r.model_type}
                </td>
                <td className="px-4 py-3 dark:text-slate-200">{r.description}</td>
                <td className="px-4 py-3">
                  {(r.old_values || r.new_values) && (
                    <button type="button" className="text-xs font-semibold text-nili underline dark:text-gold" onClick={() => setSelected(r)}>
                      {t('activityLogs.viewChanges')}
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400 dark:text-slate-500">
                  {t('common.noData')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
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
