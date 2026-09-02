import { useEffect, useState } from 'react';
import api, { fileUrl } from '../api/client';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import { formatIQD, formatDateTime } from '../utils/format';
import { buildStockAlertLink } from '../utils/whatsapp';

const UNITS = ['فرخ', 'متر', 'مل', 'قطعة'];

export default function Stock() {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [lowOnly, setLowOnly] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [selected, setSelected] = useState(null);
  const [shopPhone, setShopPhone] = useState('');

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
      alert('لا يوجد رقم هاتف المطبعة في الإعدادات');
      return;
    }
    window.open(link, '_blank');
    api.post('/stock/alert').catch(() => {});
  }

  return (
    <div className="p-6">
      <PageHeader
        title="الجرد"
        subtitle="متابعة المخزون، الوحدات المختلفة، والتالف"
        actions={
          <button className="btn-primary" onClick={() => setShowAdd(true)}>
            + إضافة صنف
          </button>
        }
      />

      {lowItems.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          <span>⚠️ يوجد {lowItems.length} صنف بمخزون منخفض أو أقل من الحد الأدنى.</span>
          <button
            className="rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
            onClick={sendStockAlert}
          >
            إرسال تنبيه واتساب
          </button>
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          className="input max-w-xs"
          placeholder="بحث بالاسم أو الباركود..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" checked={lowOnly} onChange={(e) => setLowOnly(e.target.checked)} />
          المخزون المنخفض فقط
        </label>
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="bg-slate-100 text-slate-600">
            <tr>
              <th className="px-4 py-3 text-right">الصنف</th>
              <th className="px-4 py-3 text-right">الفئة</th>
              <th className="px-4 py-3 text-right">الكمية</th>
              <th className="px-4 py-3 text-right">الوحدة</th>
              <th className="px-4 py-3 text-right">تكلفة الوحدة</th>
              <th className="px-4 py-3 text-right">الباركود</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const low = item.quantity <= item.min_quantity;
              return (
                <tr key={item.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800">{item.name}</td>
                  <td className="px-4 py-3 text-slate-500">{item.category || '-'}</td>
                  <td className={`px-4 py-3 font-semibold ${low ? 'text-rose-600' : 'text-slate-700'}`}>
                    {item.quantity}
                    {low && <span className="mr-2 badge bg-rose-100 text-rose-600">منخفض</span>}
                  </td>
                  <td className="px-4 py-3 text-slate-500">{item.unit}</td>
                  <td className="px-4 py-3 text-slate-500">{formatIQD(item.cost_per_unit)}</td>
                  <td className="px-4 py-3 text-slate-500">{item.barcode || '-'}</td>
                  <td className="px-4 py-3 text-left">
                    <button className="text-nili hover:underline" onClick={() => setSelected(item)}>
                      إدارة
                    </button>
                  </td>
                </tr>
              );
            })}
            {items.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                  لا توجد أصناف
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

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
    </div>
  );
}

function AddItemModal({ onClose, onSaved }) {
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

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.post('/stock', form);
      onSaved();
    } catch (err) {
      setError(err.response?.data?.error || 'فشل الحفظ');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open title="إضافة صنف جديد للمخزون" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        {error && <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</div>}
        <div>
          <label className="label">اسم الصنف</label>
          <input
            className="input"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">الوحدة</label>
            <select className="input" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}>
              {UNITS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">الفئة</label>
            <input
              className="input"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">الكمية الحالية</label>
            <input
              type="number"
              step="any"
              className="input"
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: e.target.value })}
            />
          </div>
          <div>
            <label className="label">الحد الأدنى (تنبيه)</label>
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
            <label className="label">تكلفة الوحدة (د.ع)</label>
            <input
              type="number"
              step="any"
              className="input"
              value={form.cost_per_unit}
              onChange={(e) => setForm({ ...form, cost_per_unit: e.target.value })}
            />
          </div>
          <div>
            <label className="label">الباركود (اختياري)</label>
            <input
              className="input"
              value={form.barcode}
              onChange={(e) => setForm({ ...form, barcode: e.target.value })}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose}>
            إلغاء
          </button>
          <button type="submit" disabled={saving} className="btn-primary">
            حفظ
          </button>
        </div>
      </form>
    </Modal>
  );
}

function ItemDetailModal({ item, onClose, onChanged }) {
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
      setError(err.response?.data?.error || 'فشل تنفيذ الحركة');
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
      setError(err.response?.data?.error || 'فشل تسجيل التالف');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open title={`إدارة الصنف: ${item.name}`} onClose={onClose} width="max-w-2xl">
      {!detail ? (
        <div className="text-slate-400">جاري التحميل...</div>
      ) : (
        <div>
          <div className="mb-4 grid grid-cols-3 gap-3 text-center">
            <div className="rounded-lg bg-slate-100 p-3">
              <div className="text-xs text-slate-500">الكمية الحالية</div>
              <div className="text-lg font-bold text-slate-800">
                {detail.item.quantity} {detail.item.unit}
              </div>
            </div>
            <div className="rounded-lg bg-slate-100 p-3">
              <div className="text-xs text-slate-500">الحد الأدنى</div>
              <div className="text-lg font-bold text-slate-800">{detail.item.min_quantity}</div>
            </div>
            <div className="rounded-lg bg-slate-100 p-3">
              <div className="text-xs text-slate-500">تكلفة الوحدة</div>
              <div className="text-lg font-bold text-slate-800">{formatIQD(detail.item.cost_per_unit)}</div>
            </div>
          </div>

          <div className="mb-3 flex gap-2 border-b border-slate-200">
            <button
              className={`px-3 py-2 text-sm font-medium ${tab === 'movement' ? 'border-b-2 border-nili text-nili' : 'text-slate-500'}`}
              onClick={() => setTab('movement')}
            >
              حركة مخزون
            </button>
            <button
              className={`px-3 py-2 text-sm font-medium ${tab === 'damage' ? 'border-b-2 border-rose-500 text-rose-600' : 'text-slate-500'}`}
              onClick={() => setTab('damage')}
            >
              تسجيل تالف
            </button>
          </div>

          {error && <div className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</div>}

          {tab === 'movement' ? (
            <form onSubmit={submitMovement} className="mb-4 space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <select className="input" value={moveType} onChange={(e) => setMoveType(e.target.value)}>
                  <option value="in">إدخال (شراء/توريد)</option>
                  <option value="out">إخراج</option>
                  <option value="adjust">تصحيح الكمية إلى</option>
                </select>
                <input
                  className="input"
                  type="number"
                  step="any"
                  placeholder="الكمية"
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  required
                />
                <input
                  className="input"
                  placeholder="ملاحظة (اختياري)"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </div>
              <button disabled={saving} className="btn-primary">
                تنفيذ
              </button>
            </form>
          ) : (
            <form onSubmit={submitDamage} className="mb-4 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <input
                  className="input"
                  type="number"
                  step="any"
                  placeholder="كمية التالف"
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  required
                />
                <input
                  className="input"
                  placeholder="سبب التلف"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </div>
              <input type="file" accept="image/*" onChange={(e) => setPhoto(e.target.files[0])} />
              <button disabled={saving} className="btn-danger">
                تسجيل التالف
              </button>
            </form>
          )}

          <h4 className="mb-2 text-sm font-semibold text-slate-600">آخر الحركات</h4>
          <div className="max-h-56 space-y-2 overflow-y-auto">
            {detail.movements.map((m) => (
              <div key={m.id} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-sm">
                <div>
                  <span
                    className={`badge ml-2 ${
                      m.type === 'in'
                        ? 'bg-emerald-100 text-emerald-700'
                        : m.type === 'damage'
                        ? 'bg-rose-100 text-rose-700'
                        : m.type === 'adjust'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {{ in: 'إدخال', out: 'إخراج', damage: 'تالف', adjust: 'تصحيح' }[m.type]}
                  </span>
                  <span className="text-slate-600">{m.reason || '-'}</span>
                  {m.photo_path && (
                    <a href={fileUrl(m.photo_path)} target="_blank" rel="noreferrer" className="mr-2 text-nili underline">
                      عرض الصورة
                    </a>
                  )}
                </div>
                <div className="text-left">
                  <div className="font-semibold text-slate-700">{m.quantity}</div>
                  <div className="text-xs text-slate-400">{formatDateTime(m.created_at)}</div>
                </div>
              </div>
            ))}
            {detail.movements.length === 0 && <div className="text-sm text-slate-400">لا توجد حركات بعد</div>}
          </div>
        </div>
      )}
    </Modal>
  );
}
