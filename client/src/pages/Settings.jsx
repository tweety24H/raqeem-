import { useEffect, useState } from 'react';
import api, { fileUrl } from '../api/client';
import PageHeader from '../components/PageHeader';

const TABS = [
  { key: 'shop', label: 'بيانات المطبعة' },
  { key: 'services', label: 'أسعار الخدمات' },
  { key: 'workers', label: 'العاملون' },
  { key: 'network', label: 'الشبكة المحلية' },
  { key: 'backup', label: 'النسخ الاحتياطي' },
];

export default function Settings() {
  const [tab, setTab] = useState('shop');

  return (
    <div className="p-6">
      <PageHeader title="الإعدادات" subtitle="تعديل أسعار الخدمات وبيانات المطبعة" />
      <div className="mb-6 flex gap-2 border-b border-slate-200">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium ${tab === t.key ? 'border-b-2 border-nili text-nili' : 'text-slate-500'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'shop' && <ShopSettings />}
      {tab === 'services' && <ServicesSettings />}
      {tab === 'workers' && <WorkersSettings />}
      {tab === 'network' && <NetworkSettings />}
      {tab === 'backup' && <BackupSettings />}
    </div>
  );
}

function ShopSettings() {
  const [form, setForm] = useState(null);
  const [saved, setSaved] = useState(false);
  const [logoFile, setLogoFile] = useState(null);

  useEffect(() => {
    api.get('/settings').then((r) => setForm(r.data.settings));
  }, []);

  async function save(e) {
    e.preventDefault();
    await api.patch('/settings', form);
    if (logoFile) {
      const fd = new FormData();
      fd.append('logo', logoFile);
      await api.post('/settings/logo', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  if (!form) return null;

  return (
    <form onSubmit={save} className="card max-w-xl space-y-4">
      {saved && <div className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">تم الحفظ بنجاح</div>}
      <div>
        <label className="label">اسم المطبعة</label>
        <input className="input" value={form.shop_name || ''} onChange={(e) => setForm({ ...form, shop_name: e.target.value })} />
      </div>
      <div>
        <label className="label">رقم الهاتف</label>
        <input className="input" value={form.shop_phone || ''} onChange={(e) => setForm({ ...form, shop_phone: e.target.value })} />
      </div>
      <div>
        <label className="label">العنوان</label>
        <input className="input" value={form.shop_address || ''} onChange={(e) => setForm({ ...form, shop_address: e.target.value })} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">لون الوصل الأساسي (نيلي)</label>
          <input
            type="color"
            className="h-10 w-full rounded-lg border border-slate-300"
            value={form.receipt_primary_color || '#1B2A6B'}
            onChange={(e) => setForm({ ...form, receipt_primary_color: e.target.value })}
          />
        </div>
        <div>
          <label className="label">لون الوصل الثانوي (ذهبي)</label>
          <input
            type="color"
            className="h-10 w-full rounded-lg border border-slate-300"
            value={form.receipt_accent_color || '#D4AF37'}
            onChange={(e) => setForm({ ...form, receipt_accent_color: e.target.value })}
          />
        </div>
      </div>
      <div>
        <label className="label">شعار المطبعة</label>
        {form.shop_logo_path && <img src={fileUrl(form.shop_logo_path)} alt="شعار" className="mb-2 h-16 w-16 rounded-full object-contain" />}
        <input type="file" accept="image/*" onChange={(e) => setLogoFile(e.target.files[0])} />
      </div>
      <div>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={form.whatsapp_enabled === '1'}
            onChange={(e) => setForm({ ...form, whatsapp_enabled: e.target.checked ? '1' : '0' })}
          />
          إرسال رسالة واتساب تلقائيًا عند جاهزية الطلب للتسليم
        </label>
        <p className="mt-1 text-xs text-slate-400">
          يتطلب تثبيت مكتبة whatsapp-web.js وربط الجهاز عبر مسح رمز QR عند أول تشغيل.
        </p>
      </div>
      <button className="btn-primary">حفظ التغييرات</button>
    </form>
  );
}

function ServicesSettings() {
  const [services, setServices] = useState([]);
  const [form, setForm] = useState({ name: '', unit: 'قطعة', price: '', category: '' });

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const res = await api.get('/services');
    setServices(res.data.services);
  }

  async function addService(e) {
    e.preventDefault();
    await api.post('/services', form);
    setForm({ name: '', unit: 'قطعة', price: '', category: '' });
    load();
  }

  async function updatePrice(id, price) {
    await api.patch(`/services/${id}`, { price });
    load();
  }

  async function removeService(id) {
    await api.patch(`/services/${id}`, { active: false });
    load();
  }

  return (
    <div className="max-w-2xl space-y-6">
      <form onSubmit={addService} className="card grid grid-cols-4 gap-2">
        <input
          className="input"
          placeholder="اسم الخدمة"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />
        <select className="input" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}>
          {['فرخ', 'متر', 'مل', 'قطعة'].map((u) => (
            <option key={u}>{u}</option>
          ))}
        </select>
        <input
          className="input"
          type="number"
          placeholder="السعر (د.ع)"
          value={form.price}
          onChange={(e) => setForm({ ...form, price: e.target.value })}
          required
        />
        <button className="btn-primary">+ إضافة</button>
      </form>

      <div className="card overflow-hidden p-0">
        <table className="w-full text-sm">
          <thead className="bg-slate-100 text-slate-600">
            <tr>
              <th className="px-4 py-3 text-right">الخدمة</th>
              <th className="px-4 py-3 text-right">الوحدة</th>
              <th className="px-4 py-3 text-right">السعر</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {services.map((s) => (
              <tr key={s.id} className="border-t border-slate-100">
                <td className="px-4 py-3">{s.name}</td>
                <td className="px-4 py-3 text-slate-500">{s.unit}</td>
                <td className="px-4 py-3">
                  <input
                    type="number"
                    defaultValue={s.price}
                    className="input w-28"
                    onBlur={(e) => e.target.value != s.price && updatePrice(s.id, e.target.value)}
                  />
                </td>
                <td className="px-4 py-3 text-left">
                  <button className="text-rose-500 hover:underline" onClick={() => removeService(s.id)}>
                    حذف
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function WorkersSettings() {
  const [workers, setWorkers] = useState([]);
  const [form, setForm] = useState({ name: '', pin: '', role: 'employee' });
  const [error, setError] = useState('');

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const res = await api.get('/auth/workers');
    setWorkers(res.data.workers);
  }

  async function addWorker(e) {
    e.preventDefault();
    setError('');
    try {
      await api.post('/auth/workers', form);
      setForm({ name: '', pin: '', role: 'employee' });
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'فشل الإضافة');
    }
  }

  async function toggleActive(w) {
    await api.patch(`/auth/workers/${w.id}`, { active: !w.active });
    load();
  }

  return (
    <div className="max-w-2xl space-y-6">
      <form onSubmit={addWorker} className="card grid grid-cols-4 gap-2">
        <input className="input" placeholder="اسم العامل" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        <input
          className="input"
          placeholder="رمز PIN"
          value={form.pin}
          onChange={(e) => setForm({ ...form, pin: e.target.value.replace(/\D/g, '') })}
          required
        />
        <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
          <option value="employee">موظف</option>
          <option value="owner">مالك</option>
        </select>
        <button className="btn-primary">+ إضافة</button>
      </form>
      {error && <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</div>}

      <div className="card overflow-hidden p-0">
        <table className="w-full text-sm">
          <thead className="bg-slate-100 text-slate-600">
            <tr>
              <th className="px-4 py-3 text-right">الاسم</th>
              <th className="px-4 py-3 text-right">الصلاحية</th>
              <th className="px-4 py-3 text-right">الحالة</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {workers.map((w) => (
              <tr key={w.id} className="border-t border-slate-100">
                <td className="px-4 py-3">{w.name}</td>
                <td className="px-4 py-3 text-slate-500">{w.role === 'owner' ? 'مالك' : 'موظف'}</td>
                <td className="px-4 py-3">
                  <span className={`badge ${w.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'}`}>
                    {w.active ? 'فعال' : 'معطل'}
                  </span>
                </td>
                <td className="px-4 py-3 text-left">
                  <button className="text-nili hover:underline" onClick={() => toggleActive(w)}>
                    {w.active ? 'تعطيل' : 'تفعيل'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function NetworkSettings() {
  const [net, setNet] = useState(null);

  useEffect(() => {
    api.get('/settings/network').then((r) => setNet(r.data));
  }, []);

  if (!net) return null;

  return (
    <div className="grid max-w-2xl grid-cols-1 gap-6 sm:grid-cols-2">
      <div className="card text-center">
        <h3 className="mb-2 font-semibold text-slate-700">صفحة الزبون (طلب/رفع تصميم)</h3>
        <img src={net.customerQr} alt="QR" className="mx-auto mb-2" />
        <p className="break-all text-xs text-slate-400">{net.customerPortalUrl}</p>
        <p className="mt-2 text-xs text-slate-500">اطبع هذا الكود وضعه في المطبعة ليمسحه الزبائن عبر هواتفهم.</p>
      </div>
      <div className="card text-center">
        <h3 className="mb-2 font-semibold text-slate-700">لوحة المالك (موبايل)</h3>
        <img src={net.ownerQr} alt="QR" className="mx-auto mb-2" />
        <p className="break-all text-xs text-slate-400">{net.ownerPortalUrl}</p>
        <p className="mt-2 text-xs text-slate-500">يعمل فقط ضمن شبكة الواي فاي نفسها للمطبعة.</p>
      </div>
    </div>
  );
}

function BackupSettings() {
  const [form, setForm] = useState(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.get('/settings').then((r) => setForm(r.data.settings));
  }, []);

  async function save(e) {
    e.preventDefault();
    await api.patch('/settings', { backup_dir: form.backup_dir });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  if (!form) return null;

  return (
    <form onSubmit={save} className="card max-w-xl space-y-3">
      {saved && <div className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">تم الحفظ</div>}
      <p className="text-sm text-slate-500">
        يتم أخذ نسخة احتياطية تلقائية من قاعدة البيانات كل ٦ ساعات. حدد مجلدًا (مثلًا على فلاشة أو قرص خارجي) لحفظ النسخ فيه.
      </p>
      <div>
        <label className="label">مسار مجلد النسخ الاحتياطي</label>
        <input
          className="input"
          placeholder="مثال: D:\RaqeemOS-Backups"
          value={form.backup_dir || ''}
          onChange={(e) => setForm({ ...form, backup_dir: e.target.value })}
        />
      </div>
      <button className="btn-primary">حفظ</button>
    </form>
  );
}
