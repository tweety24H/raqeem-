import { useEffect, useState } from 'react';
import api, { fileUrl } from '../api/client';
import PageHeader from '../components/PageHeader';

const isElectron = typeof window !== 'undefined' && !!window.raqeem?.isElectron;

const TABS = [
  { key: 'shop', label: 'بيانات المطبعة' },
  { key: 'services', label: 'أسعار الخدمات' },
  { key: 'workers', label: 'العاملون' },
  { key: 'network', label: 'الشبكة المحلية' },
  { key: 'backup', label: 'النسخ الاحتياطي' },
  ...(isElectron ? [{ key: 'license', label: 'الترخيص والحماية 🔒' }] : []),
];

export default function Settings() {
  const [tab, setTab] = useState('shop');

  return (
    <div className="p-6">
      <PageHeader title="الإعدادات" subtitle="تعديل أسعار الخدمات وبيانات المطبعة" />
      <div className="mb-6 flex gap-2 border-b border-slate-200 dark:border-white/10">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium ${tab === t.key ? 'border-b-2 border-brand-600 text-brand-600' : 'text-slate-500 dark:text-slate-400'}`}
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
      {tab === 'license' && isElectron && <LicenseSettings />}
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
          يتطلب ربط الجهاز عبر مسح رمز QR عند أول تشغيل — احفظ التغييرات بعد التفعيل وراح يظهر الكود بالأسفل.
        </p>
        {form.whatsapp_enabled === '1' && <WhatsAppPairingStatus />}
      </div>
      <button className="btn-primary">حفظ التغييرات</button>
    </form>
  );
}

const WA_STATUS_LABEL = {
  disabled: 'الخدمة متوقفة',
  initializing: 'جاري تحضير الاتصال...',
  qr_pending: 'امسح الكود بواتساب على جوالك',
  ready: 'متصل بواتساب ✅',
  error: 'تعذر تشغيل خدمة واتساب — تحقق من تثبيت المكتبة وأعد تشغيل السيرفر',
};

function WhatsAppPairingStatus() {
  const [state, setState] = useState(null);
  const [now, setNow] = useState(Date.now());
  const [disconnecting, setDisconnecting] = useState(false);

  async function fetchStatus() {
    try {
      const res = await api.get('/settings/whatsapp/status');
      setState(res.data);
      return res.data;
    } catch {
      return null;
    }
  }

  useEffect(() => {
    let cancelled = false;
    let timer = null;

    async function poll() {
      const data = await fetchStatus();
      if (cancelled) return;
      // Once connected there's nothing left to watch — stop polling entirely.
      if (data && data.status !== 'ready') timer = setTimeout(poll, 3000);
    }
    poll();

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Local 1s UI ticker for the "code age" readout — no extra network calls.
  useEffect(() => {
    if (state?.status !== 'qr_pending') return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [state?.status]);

  async function handleDisconnect() {
    setDisconnecting(true);
    try {
      await api.post('/settings/whatsapp/disconnect');
      await fetchStatus();
    } finally {
      setDisconnecting(false);
    }
  }

  if (!state) return null;

  const qrAgeSec = state.qrGeneratedAt ? Math.floor((now - state.qrGeneratedAt) / 1000) : null;

  return (
    <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/5">
      <p className="text-sm font-medium text-slate-600 dark:text-slate-300">{WA_STATUS_LABEL[state.status] || state.status}</p>

      {state.status === 'qr_pending' && state.qrDataUrl && (
        <div className="mt-3">
          <img src={state.qrDataUrl} alt="رمز اقتران واتساب" className="h-40 w-40 rounded-lg border border-slate-200" />
          <div className="mt-2 flex items-center gap-3">
            {qrAgeSec !== null && (
              <span className="text-xs text-slate-400">
                واتساب يجدد الكود تلقائيًا كل ~٢٠ ثانية — عمر الكود الحالي: {qrAgeSec} ث
              </span>
            )}
            <button type="button" className="btn-secondary !py-1 !px-3 text-xs" onClick={fetchStatus}>
              تحديث الآن
            </button>
          </div>
        </div>
      )}

      {state.status === 'ready' && (
        <div className="mt-2 flex items-center justify-between">
          {state.phoneNumber && <span className="text-sm text-slate-500 dark:text-slate-400">الرقم المتصل: {state.phoneNumber}</span>}
          <button
            type="button"
            disabled={disconnecting}
            onClick={handleDisconnect}
            className="rounded-lg border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 disabled:opacity-50"
          >
            {disconnecting ? 'جاري القطع...' : 'قطع الاتصال'}
          </button>
        </div>
      )}

      {state.status === 'error' && (
        <button type="button" className="btn-secondary !py-1 !px-3 mt-2 text-xs" onClick={fetchStatus}>
          إعادة المحاولة
        </button>
      )}
    </div>
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

// تبويب "الترخيص والحماية" — يشتغل فقط داخل نسخة Electron المثبّتة. محمي
// بكلمة سر إدارية منفصلة عن رمز PIN اليومي (حماية إضافية لأنه فيه معلومات
// حساسة: حالة الترخيص، مجلد النسخ الاحتياطي المشفّر...).
function LicenseSettings() {
  const [unlocked, setUnlocked] = useState(false);
  const [hasPassword, setHasPassword] = useState(null);
  const [passwordInput, setPasswordInput] = useState('');
  const [confirmInput, setConfirmInput] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    window.raqeem.admin.hasPassword().then(setHasPassword);
  }, []);

  async function submitPassword(e) {
    e.preventDefault();
    setError('');
    if (hasPassword) {
      const ok = await window.raqeem.admin.checkPassword(passwordInput);
      if (!ok) return setError('كلمة السر غير صحيحة');
      setUnlocked(true);
    } else {
      if (passwordInput.length < 4) return setError('كلمة السر لازم ٤ أحرف أو أرقام على الأقل');
      if (passwordInput !== confirmInput) return setError('كلمتا السر غير متطابقتين');
      await window.raqeem.admin.setPassword(passwordInput);
      setUnlocked(true);
    }
  }

  if (hasPassword === null) return null;

  if (!unlocked) {
    return (
      <form onSubmit={submitPassword} className="card max-w-sm space-y-3">
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          {hasPassword ? '🔒 أدخل كلمة سر الحماية' : '🔒 عيّن كلمة سر جديدة لحماية هذا القسم'}
        </p>
        <input
          type="password"
          className="input"
          value={passwordInput}
          onChange={(e) => setPasswordInput(e.target.value)}
          placeholder="كلمة السر"
          autoFocus
        />
        {!hasPassword && (
          <input
            type="password"
            className="input"
            value={confirmInput}
            onChange={(e) => setConfirmInput(e.target.value)}
            placeholder="تأكيد كلمة السر"
          />
        )}
        {error && <p className="text-xs font-semibold text-rose-600 dark:text-rose-400">{error}</p>}
        <button className="btn-primary w-full">{hasPassword ? 'دخول' : 'حفظ وفتح'}</button>
      </form>
    );
  }

  return <LicenseAndBackupPanel />;
}

function LicenseAndBackupPanel() {
  const [status, setStatus] = useState(null);
  const [key, setKey] = useState('');
  const [activateError, setActivateError] = useState('');
  const [activateOk, setActivateOk] = useState(false);
  const [copied, setCopied] = useState(false);
  const [backups, setBackups] = useState([]);
  const [backupDir, setBackupDir] = useState('');
  const [backupBusy, setBackupBusy] = useState(false);
  const [backupMsg, setBackupMsg] = useState('');

  async function loadAll() {
    const [s, list, dir] = await Promise.all([
      window.raqeem.license.getStatus(),
      window.raqeem.backup.list(),
      window.raqeem.backup.getDir(),
    ]);
    setStatus(s);
    setBackups(list);
    setBackupDir(dir);
  }

  useEffect(() => {
    loadAll();
  }, []);

  async function copyHwid() {
    await window.raqeem.license.copyToClipboard(status.hardwareId);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function transferToNewDevice() {
    const sure = window.confirm(
      'هذا يلغي التفعيل على هذا الجهاز نهائياً (يرجع لحالة تجريبي/منتهي). تحتاج تطلب مفتاح تفعيل جديد للجهاز الجديد. متأكد؟'
    );
    if (!sure) return;
    const s = await window.raqeem.license.deactivate();
    setStatus(s);
  }

  async function activate(e) {
    e.preventDefault();
    setActivateError('');
    setActivateOk(false);
    const result = await window.raqeem.license.activate(key);
    if (result.valid) {
      setActivateOk(true);
      setKey('');
      loadAll();
    } else {
      setActivateError(result.reason || 'مفتاح غير صحيح');
    }
  }

  async function backupNow() {
    setBackupBusy(true);
    setBackupMsg('');
    const result = await window.raqeem.backup.runNow();
    setBackupBusy(false);
    setBackupMsg(result.ok ? 'تم أخذ نسخة احتياطية مشفّرة بنجاح' : `فشل: ${result.error}`);
    loadAll();
  }

  async function restoreBackup(name, date) {
    const sure = window.confirm(
      `متأكد تريد استعادة نسخة ${new Date(date).toLocaleString('ar-IQ')}؟\n\nهذا يستبدل كل بيانات البرنامج الحالية بهذي النسخة (يؤخذ نسخة أمان من الوضع الحالي تلقائياً قبل الاستبدال). البرنامج يسكر ويرجع يفتح نفسه.`
    );
    if (!sure) return;
    setBackupBusy(true);
    setBackupMsg('جاري الاستعادة، البرنامج راح يعيد تشغيل نفسه...');
    const result = await window.raqeem.backup.restore(name);
    if (!result.ok) {
      setBackupBusy(false);
      setBackupMsg(`فشلت الاستعادة: ${result.error}`);
    }
    // إذا نجحت: البرنامج راح يسكر ويرجع يفتح خلال لحظات من جهة Electron، ما نحتاج نسوي شي إضافي هنا.
  }

  if (!status) return null;

  return (
    <div className="max-w-2xl space-y-6">
      <div className="card">
        <h3 className="mb-3 font-semibold text-slate-800 dark:text-slate-100">حالة الترخيص</h3>
        {status.status === 'licensed' && (
          <>
            <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
              ✓ مفعّل مجاناً — {status.shop}
              {new Date(status.expiresAt).getFullYear() - new Date().getFullYear() >= 50 ? (
                <> — ترخيص مجاني مدى الحياة ♾️</>
              ) : (
                <> — صالح لغاية {new Date(status.expiresAt).toLocaleDateString('ar-IQ')}</>
              )}
            </p>
            <button
              type="button"
              onClick={transferToNewDevice}
              className="mt-3 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5"
            >
              نقل الترخيص لجهاز جديد
            </button>
          </>
        )}
        {status.status === 'trial' && (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
            نسخة تجريبية — متبقي {status.daysLeft} يوم
          </p>
        )}
        {status.status === 'expired' && (
          <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-400">
            انتهت الفترة التجريبية
          </p>
        )}

        <div className="mt-4">
          <label className="label">رقم الجهاز (Hardware ID)</label>
          <div className="flex gap-2">
            <input readOnly className="input font-mono text-xs" value={status.hardwareId} />
            <button type="button" onClick={copyHwid} className="btn-secondary shrink-0 !px-3">
              {copied ? '✓' : '📋'}
            </button>
          </div>
        </div>

        {status.status !== 'licensed' && (
          <form onSubmit={activate} className="mt-4">
            <label className="label">مفتاح تفعيل جديد</label>
            <textarea
              className="input resize-none font-mono text-xs"
              rows={2}
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="الصق مفتاح التفعيل هنا..."
            />
            {activateError && <p className="mt-1 text-xs font-semibold text-rose-600 dark:text-rose-400">{activateError}</p>}
            {activateOk && <p className="mt-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">تم التفعيل بنجاح ✓</p>}
            <button className="btn-brand mt-2">فعّل</button>
          </form>
        )}
      </div>

      <div className="card">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-semibold text-slate-800 dark:text-slate-100">النسخ الاحتياطي المشفّر</h3>
          <button type="button" onClick={backupNow} disabled={backupBusy} className="btn-brand !px-3 !py-1.5 !text-xs">
            {backupBusy ? 'جاري...' : '📦 نسخ الآن'}
          </button>
        </div>
        <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">المجلد: {backupDir}</p>
        {backupMsg && <p className="mb-2 text-xs font-semibold text-slate-600 dark:text-slate-300">{backupMsg}</p>}
        <div className="max-h-56 space-y-1 overflow-y-auto">
          {backups.length === 0 && <p className="text-xs text-slate-400">لا توجد نسخ بعد</p>}
          {backups.map((b) => (
            <div key={b.name} className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-1.5 text-xs dark:bg-white/5">
              <span className="truncate text-slate-600 dark:text-slate-300">{new Date(b.date).toLocaleString('ar-IQ')}</span>
              <span className="shrink-0 text-slate-400">{b.sizeKb} KB</span>
              <button
                type="button"
                disabled={backupBusy}
                onClick={() => restoreBackup(b.name, b.date)}
                className="shrink-0 rounded-md bg-amber-100 px-2 py-1 font-semibold text-amber-700 hover:bg-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:hover:bg-amber-500/25"
              >
                استعادة ⟲
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
