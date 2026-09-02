import { useEffect, useState } from 'react';
import api, { fileUrl } from '../api/client';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import { formatDate } from '../utils/format';

export default function Archive() {
  const [designs, setDesigns] = useState([]);
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    load();
  }, [search]);

  async function load() {
    const res = await api.get('/archive', { params: { search: search || undefined } });
    setDesigns(res.data.designs);
  }

  async function remove(id) {
    if (!confirm('حذف هذا التصميم من الأرشيف؟')) return;
    await api.delete(`/archive/${id}`);
    load();
  }

  return (
    <div className="p-6">
      <PageHeader
        title="أرشيف التصاميم"
        subtitle="كل تصميم زبون محفوظ ليعاد استخدامه لاحقًا"
        actions={
          <button className="btn-primary" onClick={() => setShowAdd(true)}>
            + رفع تصميم
          </button>
        }
      />

      <input
        className="input mb-4 max-w-xs"
        placeholder="بحث باسم التصميم أو الزبون..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {designs.map((d) => {
          const isImage = /\.(png|jpe?g|gif|webp)$/i.test(d.file_path);
          return (
            <div key={d.id} className="card p-2">
              <a href={fileUrl(d.file_path)} target="_blank" rel="noreferrer">
                {isImage ? (
                  <img src={fileUrl(d.file_path)} alt={d.name} className="mb-2 h-32 w-full rounded-lg object-cover" />
                ) : (
                  <div className="mb-2 flex h-32 w-full items-center justify-center rounded-lg bg-slate-100 text-3xl">
                    📄
                  </div>
                )}
              </a>
              <div className="truncate text-sm font-medium text-slate-800">{d.name}</div>
              <div className="truncate text-xs text-slate-400">{d.customer_name || 'بدون زبون'}</div>
              <div className="text-xs text-slate-400">{formatDate(d.created_at)}</div>
              <button className="mt-1 text-xs text-rose-500 hover:underline" onClick={() => remove(d.id)}>
                حذف
              </button>
            </div>
          );
        })}
        {designs.length === 0 && <div className="col-span-full py-8 text-center text-slate-400">لا توجد تصاميم بعد</div>}
      </div>

      {showAdd && (
        <AddDesignModal
          onClose={() => setShowAdd(false)}
          onSaved={() => {
            setShowAdd(false);
            load();
          }}
        />
      )}
    </div>
  );
}

function AddDesignModal({ onClose, onSaved }) {
  const [name, setName] = useState('');
  const [customers, setCustomers] = useState([]);
  const [customerId, setCustomerId] = useState('');
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/customers').then((r) => setCustomers(r.data.customers));
  }, []);

  async function submit(e) {
    e.preventDefault();
    if (!file) return setError('اختر ملفًا أولًا');
    setSaving(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('name', name || file.name);
      if (customerId) fd.append('customer_id', customerId);
      await api.post('/archive', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      onSaved();
    } catch (err) {
      setError(err.response?.data?.error || 'فشل رفع الملف');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open title="رفع تصميم جديد" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        {error && <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</div>}
        <div>
          <label className="label">اسم التصميم</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className="label">الزبون (اختياري)</label>
          <select className="input" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
            <option value="">-- بدون --</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">الملف</label>
          <input type="file" onChange={(e) => setFile(e.target.files[0])} required />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose}>
            إلغاء
          </button>
          <button disabled={saving} className="btn-primary">
            رفع
          </button>
        </div>
      </form>
    </Modal>
  );
}
