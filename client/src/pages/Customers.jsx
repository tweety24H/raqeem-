import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import { formatIQD } from '../utils/format';

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [overdue, setOverdue] = useState([]);
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    load();
    api.get('/customers/overdue', { params: { days: 45 } }).then((r) => setOverdue(r.data.customers));
  }, [search]);

  async function load() {
    const res = await api.get('/customers', { params: { search: search || undefined } });
    setCustomers(res.data.customers);
  }

  const list = overdueOnly ? overdue : customers;

  return (
    <div className="p-6">
      <PageHeader
        title="الزبائن والديون"
        subtitle="بيانات الزبون وسجل ديونه"
        actions={
          <button className="btn-primary" onClick={() => setShowAdd(true)}>
            + زبون جديد
          </button>
        }
      />

      {overdue.length > 0 && (
        <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          ⚠️ يوجد {overdue.length} زبون لم يدفع منذ ٤٥ يومًا أو أكثر.
          <button className="mr-2 font-semibold underline" onClick={() => setOverdueOnly((v) => !v)}>
            {overdueOnly ? 'عرض الكل' : 'عرضهم فقط'}
          </button>
        </div>
      )}

      <input
        className="input mb-4 max-w-xs"
        placeholder="بحث بالاسم أو الهاتف..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="bg-slate-100 text-slate-600">
            <tr>
              <th className="px-4 py-3 text-right">الاسم</th>
              <th className="px-4 py-3 text-right">الهاتف</th>
              <th className="px-4 py-3 text-right">الدين المستحق</th>
              {overdueOnly && <th className="px-4 py-3 text-right">آخر نشاط</th>}
            </tr>
          </thead>
          <tbody>
            {list.map((c) => (
              <tr
                key={c.id}
                className="cursor-pointer border-t border-slate-100 hover:bg-slate-50"
                onClick={() => (window.location.hash = `#/customers/${c.id}`)}
              >
                <td className="px-4 py-3 font-medium text-nili">{c.name}</td>
                <td className="px-4 py-3 text-slate-500">{c.phone || '-'}</td>
                <td className={`px-4 py-3 font-semibold ${c.debt > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {formatIQD(c.debt)}
                </td>
                {overdueOnly && <td className="px-4 py-3 text-slate-500">منذ {c.daysSinceActivity} يوم</td>}
              </tr>
            ))}
            {list.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                  لا توجد بيانات
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showAdd && (
        <AddCustomerModal
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

function AddCustomerModal({ onClose, onSaved }) {
  const [form, setForm] = useState({ name: '', phone: '', notes: '' });
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    setError('');
    try {
      await api.post('/customers', form);
      onSaved();
    } catch (err) {
      setError(err.response?.data?.error || 'فشل الحفظ');
    }
  }

  return (
    <Modal open title="زبون جديد" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        {error && <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</div>}
        <div>
          <label className="label">الاسم</label>
          <input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div>
          <label className="label">الهاتف</label>
          <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </div>
        <div>
          <label className="label">ملاحظات</label>
          <textarea className="input" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose}>
            إلغاء
          </button>
          <button className="btn-primary">حفظ</button>
        </div>
      </form>
    </Modal>
  );
}
