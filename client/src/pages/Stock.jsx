import { useEffect, useState } from 'react';
import api, { fileUrl } from '../api/client';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import ViewToggle, { useViewMode } from '../components/ViewToggle';
import { useLanguage } from '../context/LanguageContext';
import { formatIQD, formatDateTime } from '../utils/format';
import { buildStockAlertLink } from '../utils/whatsapp';
import BarcodeScannerModal from '../components/BarcodeScannerModal';

const UNITS = ['فرخ', 'متر', 'مل', 'قطعة'];

export default function Stock() {
  const { t } = useLanguage();
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [lowOnly, setLowOnly] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [selected, setSelected] = useState(null);
  const [shopPhone, setShopPhone] = useState('');
  const [mode, setMode] = useViewMode('raqeem_view_stock', 'list');
  const [showScanSearch, setShowScanSearch] = useState(false);

  useEffect(() => {
    load();
  }, [search, lowOnly]);

  useEffect(() => {
    api.get('/settings').then((r) => setShopPhone(r.data.settings.shop_phone || ''));
  }, []);

  async function load() {
    const res = await api.get('/stock', { params: { search: search || undefined, lowOnly: lowOnly ? '1' : undefined } });
    setItems(res.data.items);
  }

  const lowItems = items.filter((i) => i.quantity <= i.min_quantity);

  function sendStockAlert() {
    const link = buildStockAlertLink(lowItems, shopPhone);
    if (!link) {
      alert(t('stock.errorNoShopPhone'));
      return;
    }
    window.open(link, '_blank');
    api.post('/stock/alert').catch(() => {});
  }

  return (
    <div className="p-6">
      <PageHeader
        title={t('stock.title')}
        subtitle={t('stock.subtitle')}
        actions={
          <>
            <ViewToggle mode={mode} onChange={setMode} />
            <button className="btn-primary" onClick={() => setShowAdd(true)}>
              {t('stock.addItemBtn')}
            </button>
          </>
        }
      />

      {lowItems.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
          <span>{t('stock.lowStockWarning', { count: lowItems.length })}</span>
          <button
            className="rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-500/15 dark:text-emerald-300 dark:hover:bg-emerald-500/25"
            onClick={sendStockAlert}
          >
            {t('stock.sendAlertBtn')}
          </button>
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          className="input max-w-xs"
          placeholder={t('stock.searchPlaceholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button type="button" className="btn-secondary" onClick={() => setShowScanSearch(true)}>
          📷 مسح باركود
        </button>
        <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
          <input type="checkbox" checked={lowOnly} onChange={(e) => setLowOnly(e.target.checked)} />
          {t('stock.lowOnlyLabel')}
        </label>
      </div>

      {mode === 'grid' ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => {
            const low = item.quantity <= item.min_quantity;
            return (
              <div key={item.id} className="card">
                <div className="mb-2 flex items-start justify-between">
                  <p className="font-semibold text-slate-800 dark:text-slate-100">{item.name}</p>
                  {low && (
                    <span className="badge bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300">
                      {t('stock.low')}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">{item.category || t('stock.noCategory')}</p>
                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className={`font-bold ${low ? 'text-rose-600' : 'text-slate-800 dark:text-slate-100'}`}>
                    {item.quantity} {t(`unit.${item.unit}`)}
                  </span>
                  <span className="text-slate-500 dark:text-slate-400">{formatIQD(item.cost_per_unit)}</span>
                </div>
                {item.barcode && (
                  <div className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                    {t('common.barcode')}: {item.barcode}
                  </div>
                )}
                <button className="btn-secondary mt-3 w-full" onClick={() => setSelected(item)}>
                  {t('common.manage')}
                </button>
              </div>
            );
          })}
          {items.length === 0 && (
            <div className="col-span-full py-8 text-center text-slate-400 dark:text-slate-500">{t('stock.noItems')}</div>
          )}
        </div>
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3 text-right">{t('common.name')}</th>
                <th className="px-4 py-3 text-right">{t('common.category')}</th>
                <th className="px-4 py-3 text-right">{t('common.quantity')}</th>
                <th className="px-4 py-3 text-right">{t('common.unit')}</th>
                <th className="px-4 py-3 text-right">{t('stock.costPerUnitLabel')}</th>
                <th className="px-4 py-3 text-right">{t('common.barcode')}</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const low = item.quantity <= item.min_quantity;
                return (
                  <tr key={item.id} className="border-t border-slate-100 hover:bg-slate-50 dark:border-white/5 dark:hover:bg-white/5">
                    <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-100">{item.name}</td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{item.category || '-'}</td>
                    <td className={`px-4 py-3 font-semibold ${low ? 'text-rose-600' : 'text-slate-700 dark:text-slate-200'}`}>
                      {item.quantity}
                      {low && (
                        <span className="mr-2 badge bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300">
                          {t('stock.low')}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{t(`unit.${item.unit}`)}</td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{formatIQD(item.cost_per_unit)}</td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{item.barcode || '-'}</td>
                    <td className="px-4 py-3 text-left">
                      <button className="text-nili hover:underline dark:text-violet-300" onClick={() => setSelected(item)}>
                        {t('common.manage')}
                      </button>
                    </td>
                  </tr>
                );
              })}
              {items.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400 dark:text-slate-500">
                    {t('stock.noItems')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showAdd && (
        <AddItemModal
          onClose={() => setShowAdd(false)}
          onSaved={() => {
            setShowAdd(false);
            load();
          }}
        />
      )}

      {selected && (
        <ItemDetailModal
          item={selected}
          onClose={() => setSelected(null)}
          onChanged={() => {
            load();
          }}
        />
      )}

      {showScanSearch && (
        <BarcodeScannerModal
          onDetected={(code) => {
            setSearch(code);
            setShowScanSearch(false);
          }}
          onClose={() => setShowScanSearch(false)}
        />
      )}
    </div>
  );
}

function AddItemModal({ onClose, onSaved }) {
  const { t } = useLanguage();
  const [form, setForm] = useState({
    name: '',
    unit: 'قطعة',
    quantity: 0,
    min_quantity: 0,
    cost_per_unit: 0,
    barcode: '',
    category: '',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [showScanner, setShowScanner] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.post('/stock', form);
      onSaved();
    } catch (err) {
      setError(err.response?.data?.error || t('stock.errorSave'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open title={t('stock.addModalTitle')} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        {error && (
          <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">
            {error}
          </div>
        )}
        <div>
          <label className="label">{t('stock.itemNameLabel')}</label>
          <input
            className="input"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">{t('common.unit')}</label>
            <select className="input" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}>
              {UNITS.map((u) => (
                <option key={u} value={u}>
                  {t(`unit.${u}`)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">{t('common.category')}</label>
            <input
              className="input"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">{t('stock.currentQuantityLabel')}</label>
            <input
              type="number"
              step="any"
              className="input"
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: e.target.value })}
            />
          </div>
          <div>
            <label className="label">{t('stock.minQuantityLabel')}</label>
            <input
              type="number"
              step="any"
              className="input"
              value={form.min_quantity}
              onChange={(e) => setForm({ ...form, min_quantity: e.target.value })}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">{t('stock.costPerUnitLabel')}</label>
            <input
              type="number"
              step="any"
              className="input"
              value={form.cost_per_unit}
              onChange={(e) => setForm({ ...form, cost_per_unit: e.target.value })}
            />
          </div>
          <div>
            <label className="label">
              {t('common.barcode')} {t('common.optional')}
            </label>
            <div className="flex gap-2">
              <input
                className="input"
                value={form.barcode}
                onChange={(e) => setForm({ ...form, barcode: e.target.value })}
              />
              <button type="button" className="btn-secondary shrink-0 !px-3" onClick={() => setShowScanner(true)}>
                📷
              </button>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose}>
            {t('common.cancel')}
          </button>
          <button type="submit" disabled={saving} className="btn-primary">
            {t('common.save')}
          </button>
        </div>
      </form>

      {showScanner && (
        <BarcodeScannerModal
          onDetected={(code) => {
            setForm((f) => ({ ...f, barcode: code }));
            setShowScanner(false);
          }}
          onClose={() => setShowScanner(false)}
        />
      )}
    </Modal>
  );
}

function ItemDetailModal({ item, onClose, onChanged }) {
  const { t } = useLanguage();
  const [detail, setDetail] = useState(null);
  const [tab, setTab] = useState('movement'); // movement | damage
  const [moveType, setMoveType] = useState('in');
  const [qty, setQty] = useState('');
  const [reason, setReason] = useState('');
  const [photo, setPhoto] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    load();
  }, [item.id]);

  async function load() {
    const res = await api.get(`/stock/${item.id}`);
    setDetail(res.data);
  }

  async function submitMovement(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await api.post(`/stock/${item.id}/movement`, { type: moveType, quantity: qty, reason });
      setQty('');
      setReason('');
      await load();
      onChanged();
    } catch (err) {
      setError(err.response?.data?.error || t('stock.errorMovement'));
    } finally {
      setSaving(false);
    }
  }

  async function submitDamage(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('quantity', qty);
      fd.append('reason', reason || 'تالف');
      if (photo) fd.append('photo', photo);
      await api.post(`/stock/${item.id}/damage`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setQty('');
      setReason('');
      setPhoto(null);
      await load();
      onChanged();
    } catch (err) {
      setError(err.response?.data?.error || t('stock.errorDamage'));
    } finally {
      setSaving(false);
    }
  }

  const MOVEMENT_LABEL = {
    in: t('stock.movementIn'),
    out: t('stock.movementOut'),
    damage: t('stock.movementDamage'),
    adjust: t('stock.movementAdjust'),
  };

  return (
    <Modal open title={`${t('stock.manageModalTitlePrefix')}: ${item.name}`} onClose={onClose} width="max-w-2xl">
      {!detail ? (
        <div className="text-slate-400 dark:text-slate-500">{t('common.loading')}</div>
      ) : (
        <div>
          <div className="mb-4 grid grid-cols-3 gap-3 text-center">
            <div className="rounded-lg bg-slate-100 p-3 dark:bg-white/5">
              <div className="text-xs text-slate-500 dark:text-slate-400">{t('stock.currentQuantityLabel')}</div>
              <div className="text-lg font-bold text-slate-800 dark:text-slate-100">
                {detail.item.quantity} {t(`unit.${detail.item.unit}`)}
              </div>
            </div>
            <div className="rounded-lg bg-slate-100 p-3 dark:bg-white/5">
              <div className="text-xs text-slate-500 dark:text-slate-400">{t('stock.minQuantityLabel')}</div>
              <div className="text-lg font-bold text-slate-800 dark:text-slate-100">{detail.item.min_quantity}</div>
            </div>
            <div className="rounded-lg bg-slate-100 p-3 dark:bg-white/5">
              <div className="text-xs text-slate-500 dark:text-slate-400">{t('stock.costPerUnitLabel')}</div>
              <div className="text-lg font-bold text-slate-800 dark:text-slate-100">{formatIQD(detail.item.cost_per_unit)}</div>
            </div>
          </div>

          <div className="mb-3 flex gap-2 border-b border-slate-200 dark:border-white/10">
            <button
              className={`px-3 py-2 text-sm font-medium ${
                tab === 'movement' ? 'border-b-2 border-nili text-nili dark:text-violet-300' : 'text-slate-500 dark:text-slate-400'
              }`}
              onClick={() => setTab('movement')}
            >
              {t('stock.movementTab')}
            </button>
            <button
              className={`px-3 py-2 text-sm font-medium ${
                tab === 'damage' ? 'border-b-2 border-rose-500 text-rose-600 dark:text-rose-300' : 'text-slate-500 dark:text-slate-400'
              }`}
              onClick={() => setTab('damage')}
            >
              {t('stock.damageTab')}
            </button>
          </div>

          {error && (
            <div className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">
              {error}
            </div>
          )}

          {tab === 'movement' ? (
            <form onSubmit={submitMovement} className="mb-4 space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <select className="input" value={moveType} onChange={(e) => setMoveType(e.target.value)}>
                  <option value="in">{t('stock.moveIn')}</option>
                  <option value="out">{t('stock.moveOut')}</option>
                  <option value="adjust">{t('stock.moveAdjust')}</option>
                </select>
                <input
                  className="input"
                  type="number"
                  step="any"
                  placeholder={t('common.quantity')}
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  required
                />
                <input
                  className="input"
                  placeholder={t('stock.reasonPlaceholder')}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </div>
              <button disabled={saving} className="btn-primary">
                {t('stock.executeBtn')}
              </button>
            </form>
          ) : (
            <form onSubmit={submitDamage} className="mb-4 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <input
                  className="input"
                  type="number"
                  step="any"
                  placeholder={t('stock.damageQtyPlaceholder')}
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  required
                />
                <input
                  className="input"
                  placeholder={t('stock.damageReasonPlaceholder')}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </div>
              <input type="file" accept="image/*" onChange={(e) => setPhoto(e.target.files[0])} />
              <button disabled={saving} className="btn-danger">
                {t('stock.registerDamageBtn')}
              </button>
            </form>
          )}

          <h4 className="mb-2 text-sm font-semibold text-slate-600 dark:text-slate-300">{t('stock.lastMovements')}</h4>
          <div className="max-h-56 space-y-2 overflow-y-auto">
            {detail.movements.map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-sm dark:border-white/10"
              >
                <div>
                  <span
                    className={`badge ml-2 ${
                      m.type === 'in'
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
                        : m.type === 'damage'
                        ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300'
                        : m.type === 'adjust'
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300'
                        : 'bg-slate-200 text-slate-700 dark:bg-white/10 dark:text-slate-300'
                    }`}
                  >
                    {MOVEMENT_LABEL[m.type]}
                  </span>
                  <span className="text-slate-600 dark:text-slate-300">{m.reason || '-'}</span>
                  {m.photo_path && (
                    <a
                      href={fileUrl(m.photo_path)}
                      target="_blank"
                      rel="noreferrer"
                      className="mr-2 text-nili underline dark:text-violet-300"
                    >
                      {t('stock.viewPhoto')}
                    </a>
                  )}
                </div>
                <div className="text-left">
                  <div className="font-semibold text-slate-700 dark:text-slate-200">{m.quantity}</div>
                  <div className="text-xs text-slate-400 dark:text-slate-500">{formatDateTime(m.created_at)}</div>
                </div>
              </div>
            ))}
            {detail.movements.length === 0 && (
              <div className="text-sm text-slate-400 dark:text-slate-500">{t('stock.noMovements')}</div>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
