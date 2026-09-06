import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import PageHeader from '../components/PageHeader';
import { useLanguage } from '../context/LanguageContext';
import { formatIQD } from '../utils/format';

const emptyItem = () => ({
  service_id: '',
  description: '',
  quantity: 1,
  unit_price: 0,
  stock_item_id: '',
  stock_qty_used: '',
});

const REORDER_KEY = 'raqeem_reorder_draft';

function loadReorderDraft() {
  try {
    const raw = localStorage.getItem(REORDER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export default function NewOrder() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [reorderDraft] = useState(loadReorderDraft);
  const [customers, setCustomers] = useState([]);
  const [services, setServices] = useState([]);
  const [stockItems, setStockItems] = useState([]);

  const [customerId, setCustomerId] = useState('');
  const [customerSearch, setCustomerSearch] = useState(reorderDraft?.customerName || '');
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '' });

  const [items, setItems] = useState(
    reorderDraft?.items?.length
      ? reorderDraft.items.map((it) => ({ ...emptyItem(), ...it }))
      : [emptyItem()]
  );
  const [discount, setDiscount] = useState(0);
  const [paymentType, setPaymentType] = useState('full');
  const [paidAmount, setPaidAmount] = useState(0);
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [recurringDays, setRecurringDays] = useState('');
  const [recurringOn, setRecurringOn] = useState(false);

  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/services').then((r) => setServices(r.data.services));
    api.get('/stock').then((r) => setStockItems(r.data.items));
    if (reorderDraft) localStorage.removeItem(REORDER_KEY);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    api.get('/customers', { params: { search: customerSearch || undefined } }).then((r) => setCustomers(r.data.customers));
  }, [customerSearch]);

  const subtotal = items.reduce((s, it) => s + Number(it.quantity || 0) * Number(it.unit_price || 0), 0);
  const total = Math.max(subtotal - Number(discount || 0), 0);

  function updateItem(idx, patch) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }

  function pickService(idx, serviceId) {
    const svc = services.find((s) => String(s.id) === String(serviceId));
    updateItem(idx, {
      service_id: serviceId,
      description: svc ? svc.name : '',
      unit_price: svc ? svc.price : 0,
    });
  }

  async function createCustomer() {
    if (!newCustomer.name) return;
    const res = await api.post('/customers', newCustomer);
    setCustomerId(String(res.data.id));
    setShowNewCustomer(false);
    api.get('/customers').then((r) => setCustomers(r.data.customers));
  }

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (!customerId) return setError(t('newOrder.errorSelectCustomer'));
    if (items.length === 0 || items.some((it) => !it.quantity || !it.unit_price)) {
      return setError(t('newOrder.errorItemFields'));
    }
    setSaving(true);
    try {
      const payload = {
        customer_id: Number(customerId),
        items: items.map((it) => ({
          ...it,
          service_id: it.service_id || null,
          stock_item_id: it.stock_item_id || null,
          stock_qty_used: it.stock_qty_used || 0,
        })),
        discount: Number(discount) || 0,
        payment_type: paymentType,
        paid_amount: paymentType === 'partial' ? Number(paidAmount) || 0 : undefined,
        due_date: dueDate || null,
        notes: notes || null,
        recurring_interval_days: recurringOn ? Number(recurringDays) || undefined : undefined,
      };
      const res = await api.post('/orders', payload);
      navigate(`/orders/${res.data.orderId}`);
    } catch (err) {
      setError(err.response?.data?.error || t('newOrder.errorCreateFailed'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-6">
      <PageHeader title={t('newOrder.pageTitle')} subtitle={t('newOrder.pageSubtitle')} />

      {reorderDraft && (
        <div className="mb-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
          {t('newOrder.reorderNotice')}
        </div>
      )}

      <form onSubmit={submit} className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="card">
            <h2 className="mb-3 font-semibold text-slate-700 dark:text-slate-200">{t('newOrder.customerSection')}</h2>
            {!showNewCustomer ? (
              <div className="flex gap-2">
                <input
                  className="input"
                  placeholder={t('newOrder.searchCustomerPlaceholder')}
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                />
                <button type="button" className="btn-secondary shrink-0" onClick={() => setShowNewCustomer(true)}>
                  {t('newOrder.newCustomerBtn')}
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  className="input"
                  placeholder={t('newOrder.customerNamePlaceholder')}
                  value={newCustomer.name}
                  onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                />
                <input
                  className="input"
                  placeholder={t('newOrder.phonePlaceholder')}
                  value={newCustomer.phone}
                  onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                />
                <button type="button" className="btn-primary shrink-0" onClick={createCustomer}>
                  {t('common.save')}
                </button>
                <button type="button" className="btn-secondary shrink-0" onClick={() => setShowNewCustomer(false)}>
                  {t('common.cancel')}
                </button>
              </div>
            )}
            <div className="mt-3 max-h-40 space-y-1 overflow-y-auto">
              {customers.map((c) => (
                <label
                  key={c.id}
                  className={`flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-sm ${
                    String(customerId) === String(c.id)
                      ? 'bg-nili/10 border border-nili'
                      : 'hover:bg-slate-50 border border-transparent dark:hover:bg-white/5'
                  }`}
                >
                  <span className="flex items-center gap-2 dark:text-slate-200">
                    <input
                      type="radio"
                      name="customer"
                      checked={String(customerId) === String(c.id)}
                      onChange={() => setCustomerId(String(c.id))}
                    />
                    {c.name} {c.phone && <span className="text-slate-400 dark:text-slate-500">· {c.phone}</span>}
                  </span>
                  {c.debt > 0 && (
                    <span className="text-rose-600 dark:text-rose-400">
                      {t('newOrder.debtPrefix')}: {formatIQD(c.debt)}
                    </span>
                  )}
                </label>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold text-slate-700 dark:text-slate-200">{t('newOrder.itemsSection')}</h2>
              <button type="button" className="btn-secondary" onClick={() => setItems((p) => [...p, emptyItem()])}>
                {t('newOrder.addItemBtn')}
              </button>
            </div>
            <div className="space-y-3">
              {items.map((it, idx) => (
                <div key={idx} className="rounded-lg border border-slate-200 p-3 dark:border-white/10">
                  <div className="mb-2 grid grid-cols-2 gap-2">
                    <select className="input" value={it.service_id} onChange={(e) => pickService(idx, e.target.value)}>
                      <option value="">{t('newOrder.customServiceOption')}</option>
                      {services.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({formatIQD(s.price)} / {s.unit})
                        </option>
                      ))}
                    </select>
                    <input
                      className="input"
                      placeholder={t('newOrder.descriptionPlaceholder')}
                      value={it.description}
                      onChange={(e) => updateItem(idx, { description: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    <input
                      className="input"
                      type="number"
                      step="any"
                      placeholder={t('newOrder.quantityPlaceholder')}
                      value={it.quantity}
                      onChange={(e) => updateItem(idx, { quantity: e.target.value })}
                    />
                    <input
                      className="input"
                      type="number"
                      step="any"
                      placeholder={t('newOrder.unitPricePlaceholder')}
                      value={it.unit_price}
                      onChange={(e) => updateItem(idx, { unit_price: e.target.value })}
                    />
                    <select
                      className="input"
                      value={it.stock_item_id}
                      onChange={(e) => updateItem(idx, { stock_item_id: e.target.value })}
                    >
                      <option value="">{t('newOrder.noStockDeductOption')}</option>
                      {stockItems.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.quantity} {t(`unit.${s.unit}`)})
                        </option>
                      ))}
                    </select>
                    <input
                      className="input"
                      type="number"
                      step="any"
                      placeholder={t('newOrder.stockQtyUsedPlaceholder')}
                      disabled={!it.stock_item_id}
                      value={it.stock_qty_used}
                      onChange={(e) => updateItem(idx, { stock_qty_used: e.target.value })}
                    />
                  </div>
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span className="text-slate-500 dark:text-slate-400">
                      {t('newOrder.lineTotalPrefix')}: {formatIQD(Number(it.quantity || 0) * Number(it.unit_price || 0))}
                    </span>
                    {items.length > 1 && (
                      <button
                        type="button"
                        className="text-rose-500 hover:underline"
                        onClick={() => setItems((p) => p.filter((_, i) => i !== idx))}
                      >
                        {t('newOrder.deleteBtn')}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="card">
            <h2 className="mb-3 font-semibold text-slate-700 dark:text-slate-200">{t('newOrder.paymentSection')}</h2>
            <div className="mb-3">
              <label className="label">{t('newOrder.discountLabel')}</label>
              <input className="input" type="number" value={discount} onChange={(e) => setDiscount(e.target.value)} />
            </div>
            <div className="mb-3">
              <label className="label">{t('newOrder.paymentTypeLabel')}</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { v: 'full', l: t('newOrder.paymentFull') },
                  { v: 'partial', l: t('newOrder.paymentPartial') },
                  { v: 'debt', l: t('newOrder.paymentDebt') },
                ].map((opt) => (
                  <button
                    type="button"
                    key={opt.v}
                    onClick={() => setPaymentType(opt.v)}
                    className={`rounded-lg border px-2 py-2 text-xs font-medium ${
                      paymentType === opt.v
                        ? 'border-nili bg-nili text-white'
                        : 'border-slate-300 text-slate-600 dark:border-white/10 dark:text-slate-300'
                    }`}
                  >
                    {opt.l}
                  </button>
                ))}
              </div>
            </div>
            {paymentType === 'partial' && (
              <div className="mb-3">
                <label className="label">{t('newOrder.paidNowLabel')}</label>
                <input className="input" type="number" value={paidAmount} onChange={(e) => setPaidAmount(e.target.value)} />
              </div>
            )}
            <div className="mb-3">
              <label className="label">{t('newOrder.dueDateLabel')}</label>
              <input className="input" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
            <div className="mb-3">
              <label className="label">{t('newOrder.notesLabel')}</label>
              <textarea className="input" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            <div className="mb-1">
              <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                <input type="checkbox" checked={recurringOn} onChange={(e) => setRecurringOn(e.target.checked)} />
                {t('newOrder.recurringLabel')}
              </label>
            </div>
            {recurringOn && (
              <input
                className="input"
                type="number"
                placeholder={t('newOrder.recurringDaysPlaceholder')}
                value={recurringDays}
                onChange={(e) => setRecurringDays(e.target.value)}
              />
            )}
          </div>

          <div className="card">
            <div className="mb-1 flex justify-between text-sm text-slate-500 dark:text-slate-400">
              <span>{t('common.subtotal')}</span>
              <span>{formatIQD(subtotal)}</span>
            </div>
            <div className="mb-1 flex justify-between text-sm text-slate-500 dark:text-slate-400">
              <span>{t('common.discount')}</span>
              <span>- {formatIQD(discount)}</span>
            </div>
            <div className="mb-3 flex justify-between border-t border-slate-200 pt-2 text-lg font-bold text-nili dark:border-white/10 dark:text-violet-300">
              <span>{t('common.grandTotal')}</span>
              <span>{formatIQD(total)}</span>
            </div>
            {error && (
              <div className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">
                {error}
              </div>
            )}
            <button disabled={saving} className="btn-primary w-full py-3">
              {saving ? t('newOrder.savingBtn') : t('newOrder.submitBtn')}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
