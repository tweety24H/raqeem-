import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api, { fileUrl } from '../api/client';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import ViewToggle, { useViewMode } from '../components/ViewToggle';
import EmptyState from '../components/ui/EmptyState';
import { useLanguage } from '../context/LanguageContext';
import { formatIQD, formatDateTime } from '../utils/format';
import { buildStockAlertLink } from '../utils/whatsapp';
import BarcodeScannerModal from '../components/BarcodeScannerModal';
import { exportToExcel } from '../utils/exportExcel';

const DEFAULT_UNITS = ['قطعة', 'كغم', 'متر', 'لتر', 'كارتون', 'طبقة', 'رول', 'فرخ', 'مل'];
const TYPES = ['خام', 'منتج_تام', 'مستهلك', 'قطع_غيار', 'تغليف'];

export default function Stock() {
  const { t } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [lowOnly, setLowOnly] = useState(() => searchParams.get('filter') === 'low_stock');
  const [typeFilter, setTypeFilter] = useState('');
  const [unitFilter, setUnitFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [selected, setSelected] = useState(null);
  const [shopPhone, setShopPhone] = useState('');
  const [mode, setMode] = useViewMode('raqeem_view_stock', 'list');
  const [showScanSearch, setShowScanSearch] = useState(false);
  const importInputRef = useRef(null);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, lowOnly, typeFilter, unitFilter, categoryFilter]);

  useEffect(() => {
    api.get('/settings').then((r) => setShopPhone(r.data.settings.shop_phone || ''));
    loadCategories();
    // Deep link from the Dashboard's "Low Stock" stat card (Task 4).
    if (searchParams.get('filter')) setSearchParams({}, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load() {
    const res = await api.get('/stock', {
      params: {
        search: search || undefined,
        lowOnly: lowOnly ? '1' : undefined,
        type: typeFilter || undefined,
        unit: unitFilter || undefined,
        category_id: categoryFilter || undefined,
      },
    });
    setItems(res.data.items);
  }

  async function loadCategories() {
    const res = await api.get('/stock/categories');
    setCategories(res.data.categories);
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

  function clearFilters() {
    setSearch('');
    setLowOnly(false);
    setTypeFilter('');
    setUnitFilter('');
    setCategoryFilter('');
  }

  async function handleExport() {
    const rows = items.map((i) => ({
      الاسم: i.name,
      النوع: i.type || '',
      التصنيف: i.category_name || i.category || '',
      الوحدة: i.unit,
      الكمية: i.quantity,
      'الحد الأدنى': i.min_quantity,
      'سعر الشراء': i.purchase_price,
      'سعر البيع': i.sale_price,
      الباركود: i.barcode || '',
      'موقع الرف': i.location || '',
      المورد: i.supplier || '',
      ملاحظات: i.notes || '',
    }));
    await exportToExcel('المخزون', 'المخزون', rows);
  }

  async function handleImportFile(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const XLSX = await import('xlsx');
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array' });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
      const importItems = rows.map((r) => ({
        name: r['الاسم'] || r.name,
        type: r['النوع'] || r.type,
        category: r['التصنيف'] || r.category,
        unit: r['الوحدة'] || r.unit || 'قطعة',
        quantity: r['الكمية'] ?? r.quantity ?? 0,
        min_quantity: r['الحد الأدنى'] ?? r.min_quantity ?? 0,
        purchase_price: r['سعر الشراء'] ?? r.purchase_price ?? 0,
        sale_price: r['سعر البيع'] ?? r.sale_price ?? 0,
        barcode: r['الباركود'] || r.barcode,
        location: r['موقع الرف'] || r.location,
        supplier: r['المورد'] || r.supplier,
        notes: r['ملاحظات'] || r.notes,
      }));
      const res = await api.post('/stock/import', { items: importItems });
      alert(t('stock.importSuccessMsg', { created: res.data.created, updated: res.data.updated }));
      load();
      loadCategories();
    } catch (err) {
      alert(t('stock.importErrorMsg'));
    }
  }

  return (
    <div className="p-6">
      <PageHeader
        title={t('stock.title')}
        subtitle={t('stock.subtitle')}
        actions={
          <>
            <ViewToggle mode={mode} onChange={setMode} />
            <input ref={importInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleImportFile} />
            <button type="button" className="btn-secondary" onClick={() => importInputRef.current?.click()}>
              {t('stock.importExcelBtn')}
            </button>
            <button type="button" className="btn-secondary" onClick={handleExport}>
              {t('stock.exportExcelBtn')}
            </button>
            <button className="btn-primary" onClick={() => setShowAdd(true)}>
              {t('stock.addItemBtn')}
            </button>
          </>
        }
      />

      {lowItems.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger dark:border-danger/30 dark:bg-danger/10 dark:text-danger">
          <span>{t('stock.lowStockWarning', { count: lowItems.length })}</span>
          <button
            className="rounded-lg bg-success/10 px-3 py-1.5 text-xs font-semibold text-success hover:bg-success/15 dark:bg-success/15 dark:text-success dark:hover:bg-success/25"
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
        <select className="input w-auto" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          <option value="">{t('stock.allTypes')}</option>
          {TYPES.map((tp) => (
            <option key={tp} value={tp}>{t(`stock.type_${tp}`)}</option>
          ))}
        </select>
        <select className="input w-auto" value={unitFilter} onChange={(e) => setUnitFilter(e.target.value)}>
          <option value="">{t('stock.allUnits')}</option>
          {DEFAULT_UNITS.map((u) => (
            <option key={u} value={u}>{t(`unit.${u}`)}</option>
          ))}
        </select>
        <select className="input w-auto" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
          <option value="">{t('stock.allCategories')}</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
          <input type="checkbox" checked={lowOnly} onChange={(e) => setLowOnly(e.target.checked)} />
          {t('stock.lowOnlyLabel')}
        </label>
        {(search || lowOnly || typeFilter || unitFilter || categoryFilter) && (
          <button type="button" className="text-sm font-medium text-slate-400 hover:text-slate-600 dark:hover:text-slate-200" onClick={clearFilters}>
            {t('stock.clearFiltersBtn')}
          </button>
        )}
      </div>

      {mode === 'grid' ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => {
            const low = item.quantity <= item.min_quantity;
            return (
              <div key={item.id} className="card">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {item.image_path && (
                      <img src={fileUrl(item.image_path)} alt={item.name} className="h-9 w-9 rounded-lg object-cover" />
                    )}
                    <p className="font-semibold text-slate-800 dark:text-slate-100">{item.name}</p>
                  </div>
                  {low && (
                    <span className="badge bg-danger/15 text-danger dark:bg-danger/15 dark:text-danger">
                      {t('stock.low')}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">{item.category_name || item.category || t('stock.noCategory')}</p>
                {item.type && <p className="text-xs text-slate-400 dark:text-slate-500">{t(`stock.type_${item.type}`)}</p>}
                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className={`font-bold ${low ? 'text-danger' : 'text-slate-800 dark:text-slate-100'}`}>
                    {item.quantity} {t(`unit.${item.unit}`)}
                  </span>
                  <span className="text-slate-500 dark:text-slate-400">{formatIQD(item.purchase_price || item.cost_per_unit)}</span>
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
            <div className="col-span-full">
              <EmptyState icon="📦" title={t('stock.noItems')} actionLabel={t('stock.addItemBtn')} onAction={() => setShowAdd(true)} />
            </div>
          )}
        </div>
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3 text-right"></th>
                <th className="px-4 py-3 text-right">{t('common.name')}</th>
                <th className="px-4 py-3 text-right">{t('stock.typeLabel')}</th>
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
                  <tr
                    key={item.id}
                    className={`border-t border-slate-100 hover:bg-slate-50 dark:border-white/5 dark:hover:bg-white/5 ${low ? 'bg-danger/10 dark:bg-danger/5' : ''}`}
                  >
                    <td className="px-4 py-3">
                      {item.image_path && (
                        <img src={fileUrl(item.image_path)} alt={item.name} className="h-8 w-8 rounded-lg object-cover" />
                      )}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-100">{item.name}</td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{item.type ? t(`stock.type_${item.type}`) : '-'}</td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{item.category_name || item.category || '-'}</td>
                    <td className={`px-4 py-3 font-semibold ${low ? 'text-danger' : 'text-slate-700 dark:text-slate-200'}`}>
                      {item.quantity}
                      {low && (
                        <span className="mr-2 badge bg-danger/15 text-danger dark:bg-danger/15 dark:text-danger">
                          {t('stock.low')}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{t(`unit.${item.unit}`)}</td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{formatIQD(item.purchase_price || item.cost_per_unit)}</td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{item.barcode || '-'}</td>
                    <td className="px-4 py-3 text-left">
                      <button className="text-nili hover:underline dark:text-gold" onClick={() => setSelected(item)}>
                        {t('common.manage')}
                      </button>
                    </td>
                  </tr>
                );
              })}
              {items.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-2">
                    <EmptyState icon="📦" title={t('stock.noItems')} actionLabel={t('stock.addItemBtn')} onAction={() => setShowAdd(true)} />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showAdd && (
        <AddItemModal
          categories={categories}
          onClose={() => setShowAdd(false)}
          onSaved={() => {
            setShowAdd(false);
            load();
            loadCategories();
          }}
        />
      )}

      {selected && (
        <ItemDetailModal
          item={selected}
          categories={categories}
          onClose={() => setSelected(null)}
          onChanged={() => {
            load();
            loadCategories();
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

function UnitPicker({ value, onChange }) {
  const { t } = useLanguage();
  const isCustom = value && !DEFAULT_UNITS.includes(value);
  const [custom, setCustom] = useState(isCustom);

  return (
    <div className="space-y-1.5">
      <select
        className="input"
        value={custom ? '__custom__' : value}
        onChange={(e) => {
          if (e.target.value === '__custom__') {
            setCustom(true);
            onChange('');
          } else {
            setCustom(false);
            onChange(e.target.value);
          }
        }}
      >
        {DEFAULT_UNITS.map((u) => (
          <option key={u} value={u}>{t(`unit.${u}`)}</option>
        ))}
        <option value="__custom__">{t('stock.customUnitOption')}</option>
      </select>
      {custom && (
        <input className="input" placeholder={t('stock.customUnitPlaceholder')} value={value} onChange={(e) => onChange(e.target.value)} />
      )}
    </div>
  );
}

function CategoryPicker({ categories, value, onChange, onCreated }) {
  const { t } = useLanguage();
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');

  async function createCategory() {
    const name = newName.trim();
    if (!name) return;
    const res = await api.post('/stock/categories', { name });
    onCreated(res.data);
    onChange(String(res.data.id));
    setNewName('');
    setCreating(false);
  }

  if (creating) {
    return (
      <div className="flex gap-1.5">
        <input className="input" autoFocus placeholder={t('stock.newCategoryPlaceholder')} value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), createCategory())} />
        <button type="button" className="btn-secondary shrink-0" onClick={createCategory}>{t('stock.addCategoryBtn')}</button>
        <button type="button" className="btn-secondary shrink-0" onClick={() => setCreating(false)}>×</button>
      </div>
    );
  }

  return (
    <div className="flex gap-1.5">
      <select className="input" value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">{t('stock.noCategory')}</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>
      <button type="button" className="btn-secondary shrink-0 !px-3" onClick={() => setCreating(true)}>+</button>
    </div>
  );
}

function ItemFieldsForm({ form, setForm, categories, onCategoryCreated }) {
  const { t } = useLanguage();
  return (
    <>
      <div>
        <label className="label">{t('stock.itemNameLabel')}</label>
        <input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">{t('stock.typeLabel')} {t('common.optional')}</label>
          <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
            <option value="">-</option>
            {TYPES.map((tp) => (
              <option key={tp} value={tp}>{t(`stock.type_${tp}`)}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">{t('stock.categoryLabel')}</label>
          <CategoryPicker categories={categories} value={form.category_id} onChange={(v) => setForm({ ...form, category_id: v })} onCreated={onCategoryCreated} />
        </div>
        <div>
          <label className="label">{t('common.unit')}</label>
          <UnitPicker value={form.unit} onChange={(v) => setForm({ ...form, unit: v })} />
        </div>
        <div>
          <label className="label">{t('common.barcode')} {t('common.optional')}</label>
          <input className="input" value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} />
        </div>
        <div>
          <label className="label">{t('stock.currentQuantityLabel')}</label>
          <input type="number" step="any" className="input" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
        </div>
        <div>
          <label className="label">{t('stock.minQuantityLabel')}</label>
          <input type="number" step="any" className="input" value={form.min_quantity} onChange={(e) => setForm({ ...form, min_quantity: e.target.value })} />
        </div>
        <div>
          <label className="label">{t('stock.purchasePriceLabel')}</label>
          <input type="number" step="any" className="input" value={form.purchase_price} onChange={(e) => setForm({ ...form, purchase_price: e.target.value })} />
        </div>
        <div>
          <label className="label">{t('stock.salePriceLabel')} {t('common.optional')}</label>
          <input type="number" step="any" className="input" value={form.sale_price} onChange={(e) => setForm({ ...form, sale_price: e.target.value })} />
        </div>
        <div>
          <label className="label">{t('stock.locationLabel')} {t('common.optional')}</label>
          <input className="input" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
        </div>
        <div>
          <label className="label">{t('stock.supplierLabel')} {t('common.optional')}</label>
          <input className="input" value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} />
        </div>
      </div>
      <div>
        <label className="label">{t('stock.notesLabel')} {t('common.optional')}</label>
        <textarea className="input" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
      </div>
      <div>
        <label className="label">{t('stock.imageLabel')} {t('common.optional')}</label>
        <input className="input" type="file" accept="image/*" onChange={(e) => setForm({ ...form, imageFile: e.target.files[0] })} />
      </div>
    </>
  );
}

function buildFormData(form) {
  const fd = new FormData();
  Object.entries(form).forEach(([k, v]) => {
    if (k === 'imageFile') {
      if (v) fd.append('image', v);
      return;
    }
    if (v !== '' && v != null) fd.append(k, v);
  });
  return fd;
}

function AddItemModal({ categories: initialCategories, onClose, onSaved }) {
  const { t } = useLanguage();
  const [categories, setCategories] = useState(initialCategories);
  const [form, setForm] = useState({
    name: '', type: '', category_id: '', unit: 'قطعة', quantity: 0, min_quantity: 0,
    purchase_price: 0, sale_price: 0, barcode: '', location: '', supplier: '', notes: '', imageFile: null,
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [showScanner, setShowScanner] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.post('/stock', buildFormData(form), { headers: { 'Content-Type': 'multipart/form-data' } });
      onSaved();
    } catch (err) {
      setError(err.response?.data?.error || t('stock.errorSave'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open title={t('stock.addModalTitle')} onClose={onClose} width="max-w-2xl">
      <form onSubmit={submit} className="space-y-3">
        {error && (
          <div className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger dark:bg-danger/10 dark:text-danger">
            {error}
          </div>
        )}
        <ItemFieldsForm form={form} setForm={setForm} categories={categories} onCategoryCreated={(c) => setCategories((prev) => [...prev, c])} />
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

function ItemDetailModal({ item, categories: initialCategories, onClose, onChanged }) {
  const { t } = useLanguage();
  const [detail, setDetail] = useState(null);
  const [tab, setTab] = useState('movement'); // movement | damage | info
  const [moveType, setMoveType] = useState('in');
  const [qty, setQty] = useState('');
  const [reason, setReason] = useState('');
  const [photo, setPhoto] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState(initialCategories);
  const [infoForm, setInfoForm] = useState({
    name: item.name, type: item.type || '', category_id: item.category_id || '', unit: item.unit,
    min_quantity: item.min_quantity, purchase_price: item.purchase_price, sale_price: item.sale_price,
    barcode: item.barcode || '', location: item.location || '', supplier: item.supplier || '', notes: item.notes || '', imageFile: null,
  });

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  async function submitInfo(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await api.patch(`/stock/${item.id}`, buildFormData(infoForm), { headers: { 'Content-Type': 'multipart/form-data' } });
      await load();
      onChanged();
      alert(t('stock.savedInfoMsg'));
    } catch (err) {
      setError(err.response?.data?.error || t('stock.errorSave'));
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
              <div className="text-lg font-bold text-slate-800 dark:text-slate-100">{formatIQD(detail.item.purchase_price || detail.item.cost_per_unit)}</div>
            </div>
          </div>

          <div className="mb-3 flex gap-2 border-b border-slate-200 dark:border-white/10">
            <button
              className={`px-3 py-2 text-sm font-medium ${
                tab === 'movement' ? 'border-b-2 border-nili text-nili dark:text-gold' : 'text-slate-500 dark:text-slate-400'
              }`}
              onClick={() => setTab('movement')}
            >
              {t('stock.movementTab')}
            </button>
            <button
              className={`px-3 py-2 text-sm font-medium ${
                tab === 'damage' ? 'border-b-2 border-danger text-danger dark:text-danger' : 'text-slate-500 dark:text-slate-400'
              }`}
              onClick={() => setTab('damage')}
            >
              {t('stock.damageTab')}
            </button>
            <button
              className={`px-3 py-2 text-sm font-medium ${
                tab === 'info' ? 'border-b-2 border-nili text-nili dark:text-gold' : 'text-slate-500 dark:text-slate-400'
              }`}
              onClick={() => setTab('info')}
            >
              {t('stock.infoTab')}
            </button>
          </div>

          {error && (
            <div className="mb-3 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger dark:bg-danger/10 dark:text-danger">
              {error}
            </div>
          )}

          {tab === 'movement' && (
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
          )}

          {tab === 'damage' && (
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

          {tab === 'info' && (
            <form onSubmit={submitInfo} className="mb-4 space-y-3">
              {item.image_path && (
                <img src={fileUrl(item.image_path)} alt={item.name} className="h-20 w-20 rounded-xl object-cover" />
              )}
              <ItemFieldsForm form={infoForm} setForm={setInfoForm} categories={categories} onCategoryCreated={(c) => setCategories((prev) => [...prev, c])} />
              <button type="submit" disabled={saving} className="btn-primary w-full">{saving ? '...' : t('stock.saveInfoBtn')}</button>
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
                        ? 'bg-success/15 text-success dark:bg-success/15 dark:text-success'
                        : m.type === 'damage'
                        ? 'bg-danger/15 text-danger dark:bg-danger/15 dark:text-danger'
                        : m.type === 'adjust'
                        ? 'bg-gold/15 text-gold-dark dark:bg-gold/15 dark:text-gold-light'
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
                      className="mr-2 text-nili underline dark:text-gold"
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
