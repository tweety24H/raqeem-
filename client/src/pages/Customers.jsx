import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../api/client';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import ViewToggle, { useViewMode } from '../components/ViewToggle';
import { useLanguage } from '../context/LanguageContext';
import { formatIQD } from '../utils/format';
import { buildDebtReminderLink } from '../utils/whatsapp';
import { CustomerDesignsModal } from '../components/DesignArchive';
import { exportToExcel } from '../utils/exportExcel';

export default function Customers() {
  const { t } = useLanguage();
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [debtorsOnly, setDebtorsOnly] = useState(false);
  const [overdue, setOverdue] = useState([]);
  const [searchParams, setSearchParams] = useSearchParams();
  const [showAdd, setShowAdd] = useState(searchParams.get('new') === '1');
  const [archiveCustomer, setArchiveCustomer] = useState(null);
  const [mode, setMode] = useViewMode('raqeem_view_customers', 'list');

  useEffect(() => {
    load();
    api.get('/customers/overdue', { params: { days: 45 } }).then((r) => setOverdue(r.data.customers));
  }, [search]);

  // Deep link from the Dashboard's "New Customer" quick action (?new=1):
  // open the Add Customer modal automatically, then clean the URL.
  // Also handles the Dashboard's "Total Debts" stat card (?filter=debtors),
  // which shows customers with an outstanding balance (Task 4).
  useEffect(() => {
    if (searchParams.get('new') === '1') {
      setShowAdd(true);
    }
    if (searchParams.get('filter') === 'debtors') {
      setDebtorsOnly(true);
    }
    if (searchParams.get('new') || searchParams.get('filter')) {
      setSearchParams({}, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function exportCustomers() {
    exportToExcel(
      `الزبائن-${new Date().toISOString().slice(0, 10)}`,
      'الزبائن',
      list.map((c) => ({
        الاسم: c.name,
        الهاتف: c.phone || '',
        الدين: c.debt,
      }))
    );
  }

  async function load() {
    const res = await api.get('/customers', { params: { search: search || undefined } });
    setCustomers(res.data.customers);
  }

  function sendReminder(e, c) {
    e.stopPropagation();
    const link = buildDebtReminderLink(c);
    if (!link) {
      alert(t('customers.errorNoPhone'));
      return;
    }
    window.open(link, '_blank');
    api.post(`/customers/${c.id}/remind`).catch(() => {});
  }

  const list = overdueOnly ? overdue : debtorsOnly ? customers.filter((c) => c.debt > 0) : customers;

  return (
    <div className="p-6">
      <PageHeader
        title={t('customers.title')}
        subtitle={t('customers.subtitle')}
        actions={
          <>
            <button type="button" onClick={exportCustomers} className="btn-secondary">
              📊 تصدير Excel
            </button>
            <ViewToggle mode={mode} onChange={setMode} />
            <button className="btn-primary" onClick={() => setShowAdd(true)}>
              {t('customers.addBtn')}
            </button>
          </>
        }
      />

      {debtorsOnly && (
        <div className="mb-4 flex items-center justify-between rounded-lg border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
          <span>{t('customers.debtorsFilterActive', { count: list.length })}</span>
          <button className="font-semibold underline" onClick={() => setDebtorsOnly(false)}>
            {t('customers.showAll')}
          </button>
        </div>
      )}

      {overdue.length > 0 && (
        <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
          {t('customers.overdueWarning', { count: overdue.length })}
          <button className="mr-2 font-semibold underline" onClick={() => setOverdueOnly((v) => !v)}>
            {overdueOnly ? t('customers.showAll') : t('customers.showOverdueOnly')}
          </button>
        </div>
      )}

      <input
        className="input mb-4 max-w-xs"
        placeholder={t('customers.searchPlaceholder')}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {mode === 'grid' ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((c) => (
            <div
              key={c.id}
              className="card cursor-pointer transition hover:border-nili hover:shadow-md"
              onClick={() => (window.location.hash = `#/customers/${c.id}`)}
            >
              <p className="font-semibold text-nili dark:text-violet-300">{c.name}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{c.phone || t('customers.noPhone')}</p>
              <div className="mt-2 flex items-center justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">{t('customers.debtLabel')}</span>
                <span className={`font-semibold ${c.debt > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {formatIQD(c.debt)}
                </span>
              </div>
              {overdueOnly && (
                <div className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                  {t('customers.lastActivity', { days: c.daysSinceActivity })}
                </div>
              )}
              <div className="mt-3 flex flex-wrap items-center gap-2" onClick={(e) => e.stopPropagation()}>
                {c.debt > 0 && (
                  <button
                    className="rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-500/15 dark:text-emerald-300 dark:hover:bg-emerald-500/25"
                    onClick={(e) => sendReminder(e, c)}
                  >
                    {t('customers.sendReminderBtn')}
                  </button>
                )}
                <button
                  className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 dark:bg-white/10 dark:text-slate-300 dark:hover:bg-white/20"
                  onClick={() => setArchiveCustomer(c)}
                  title={t('customers.archiveTitle')}
                >
                  📁 {t('customers.archiveBtn')}
                </button>
              </div>
            </div>
          ))}
          {list.length === 0 && (
            <div className="col-span-full py-8 text-center text-slate-400 dark:text-slate-500">{t('common.noData')}</div>
          )}
        </div>
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3 text-right">{t('common.name')}</th>
                <th className="px-4 py-3 text-right">{t('common.phone')}</th>
                <th className="px-4 py-3 text-right">{t('customers.debtLabel')}</th>
                <th className="px-4 py-3 text-right"></th>
                {overdueOnly && <th className="px-4 py-3 text-right">{t('customers.lastActivityHeader')}</th>}
              </tr>
            </thead>
            <tbody>
              {list.map((c) => (
                <tr
                  key={c.id}
                  className="cursor-pointer border-t border-slate-100 hover:bg-slate-50 dark:border-white/5 dark:hover:bg-white/5"
                  onClick={() => (window.location.hash = `#/customers/${c.id}`)}
                >
                  <td className="px-4 py-3 font-medium text-nili dark:text-violet-300">{c.name}</td>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{c.phone || '-'}</td>
                  <td className={`px-4 py-3 font-semibold ${c.debt > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {formatIQD(c.debt)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      {c.debt > 0 && (
                        <button
                          className="rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-500/15 dark:text-emerald-300 dark:hover:bg-emerald-500/25"
                          onClick={(e) => sendReminder(e, c)}
                        >
                          {t('customers.sendReminderBtn')}
                        </button>
                      )}
                      <button
                        className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 dark:bg-white/10 dark:text-slate-300 dark:hover:bg-white/20"
                        onClick={(e) => {
                          e.stopPropagation();
                          setArchiveCustomer(c);
                        }}
                        title={t('customers.archiveTitle')}
                      >
                        📁 {t('customers.archiveBtn')}
                      </button>
                    </div>
                  </td>
                  {overdueOnly && (
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                      {t('customers.lastActivity', { days: c.daysSinceActivity })}
                    </td>
                  )}
                </tr>
              ))}
              {list.length === 0 && (
                <tr>
                  <td colSpan={overdueOnly ? 6 : 5} className="px-4 py-8 text-center text-slate-400 dark:text-slate-500">
                    {t('common.noData')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showAdd && (
        <AddCustomerModal
          onClose={() => setShowAdd(false)}
          onSaved={() => {
            setShowAdd(false);
            load();
          }}
        />
      )}

      {archiveCustomer && (
        <CustomerDesignsModal customer={archiveCustomer} onClose={() => setArchiveCustomer(null)} />
      )}
    </div>
  );
}

function AddCustomerModal({ onClose, onSaved }) {
  const { t } = useLanguage();
  const [form, setForm] = useState({ name: '', phone: '', notes: '' });
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    setError('');
    try {
      await api.post('/customers', form);
      onSaved();
    } catch (err) {
      setError(err.response?.data?.error || t('stock.errorSave'));
    }
  }

  return (
    <Modal open title={t('customers.modalTitle')} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        {error && (
          <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">
            {error}
          </div>
        )}
        <div>
          <label className="label">{t('common.name')}</label>
          <input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div>
          <label className="label">{t('common.phone')}</label>
          <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </div>
        <div>
          <label className="label">{t('common.notes')}</label>
          <textarea className="input" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose}>
            {t('common.cancel')}
          </button>
          <button className="btn-primary">{t('common.save')}</button>
        </div>
      </form>
    </Modal>
  );
}
