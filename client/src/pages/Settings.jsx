import { useEffect, useState, useRef } from 'react';
import { Pause, Play, Pencil, Trash2, Check, Clipboard, Package, Lock, CheckCircle2, Infinity as InfinityIcon, Eye, EyeOff, MessageCircle, Folder, Unlock } from 'lucide-react';
import api, { fileUrl } from '../api/client';
import PageHeader from '../components/PageHeader';
import EditWorkerModal from '../components/EditWorkerModal';
import DeleteWorkerModal from '../components/DeleteWorkerModal';
import { useAuth } from '../context/AuthContext';
import Button from '../components/ui/Button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Textarea } from '../components/ui/textarea';

const isElectron = typeof window !== 'undefined' && !!window.raqeem?.isElectron;

const WHATSAPP_TEMPLATE_DEFAULT =
  'مرحبا {اسم_الزبون}، طلبك رقم {رقم_الطلب} أصبح جاهز للتسليم من {اسم_المطبعة} ✅';

const TABS = [
  { key: 'shop', label: 'بيانات المطبعة' },
  { key: 'services', label: 'أسعار الخدمات' },
  { key: 'workers', label: 'العاملون' },
  { key: 'roles', label: 'الأدوار' },
  { key: 'network', label: 'الشبكة المحلية' },
  { key: 'backup', label: 'النسخ الاحتياطي' },
  ...(isElectron ? [{ key: 'license', label: 'الترخيص والحماية', Icon: Lock }] : []),
];

export default function Settings() {
  const [tab, setTab] = useState('shop');
  // حماية عامة على مستوى صفحة الإعدادات بالكامل (كل التبويبات، مو بس تبويب
  // الترخيص) — إذا المالك عيّن كلمة سر حماية، تفتح هذا المودال أول ما يدخل
  // للصفحة قبل ما يعرض أي تبويب. "فتح بدون حماية" يبقى موجود دائمًا حتى ما
  // يصير قفل حقيقي بدون طريق رجوع (ماكو بريد إلكتروني أو أسئلة أمان بهذا
  // التطبيق المحلي بالكامل).
  const [hasAdminPw, setHasAdminPw] = useState(null);
  const [gateUnlocked, setGateUnlocked] = useState(false);

  useEffect(() => {
    if (!isElectron) {
      setHasAdminPw(false);
      setGateUnlocked(true);
      return;
    }
    window.raqeem.admin.hasPassword().then((v) => {
      setHasAdminPw(v);
      if (!v) setGateUnlocked(true);
    });
  }, []);

  const showGate = isElectron && hasAdminPw && !gateUnlocked;

  return (
    <div className="p-6">
      <PageHeader title="الإعدادات" subtitle="تعديل أسعار الخدمات وبيانات المطبعة" />
      <div className="mb-6 flex gap-2 border-b border-slate-200 dark:border-white/10">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium ${tab === t.key ? 'border-b-2 border-nili text-nili dark:text-gold' : 'text-slate-500 dark:text-slate-400'}`}
          >
            {t.Icon && <t.Icon className="h-3.5 w-3.5" />}
            {t.label}
          </button>
        ))}
      </div>

      {!showGate && (
        <>
          {tab === 'shop' && <ShopSettings />}
          {tab === 'services' && <ServicesSettings />}
          {tab === 'workers' && <WorkersSettings />}
          {tab === 'roles' && <RolesSettings />}
          {tab === 'network' && <NetworkSettings />}
          {tab === 'backup' && <BackupSettings />}
          {tab === 'license' && isElectron && <LicenseAndBackupPanel />}
        </>
      )}

      <SettingsPasswordGateModal open={showGate} onUnlock={() => setGateUnlocked(true)} />
    </div>
  );
}

// حقل كلمة سر بايقونة عين لإظهار/إخفاء - نفس المكان (يمين، RTL) المستخدم
// أصلاً لايقونة المجلد بحقل مسار النسخ الاحتياطي، للاتساق البصري.
function PasswordField({ value, onChange, placeholder, autoFocus }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        className="input pr-9"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoFocus={autoFocus}
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setShow((v) => !v)}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

// المودال الذي يحجب كل تبويبات الإعدادات لما يكون محددًا كلمة سر حماية.
// onOpenChange فارغ عمدًا (بدون إغلاق بالنقر بالخلفية أو Escape) — الطريقة
// الوحيدة للتقدم هي "دخول" بكلمة السر الصحيحة أو "فتح بدون حماية" الصريح.
function SettingsPasswordGateModal({ open, onUnlock }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showForgot, setShowForgot] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError('');
    const ok = await window.raqeem.admin.checkPassword(password);
    if (!ok) return setError('كلمة السر غير صحيحة');
    setPassword('');
    onUnlock();
  }

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50 p-4">
        <div
          dir="rtl"
          className="w-full max-w-sm rounded-3xl bg-white p-6 text-right shadow-2xl dark:border dark:border-slate-800 dark:bg-slate-900"
        >
          <h3 className="mb-4 flex items-center gap-1.5 font-bold text-slate-800 dark:text-white">
            <Lock className="h-4 w-4" /> هذا القسم محمي بكلمة سر
          </h3>
          <form onSubmit={submit} className="space-y-3">
            <PasswordField value={password} onChange={(e) => setPassword(e.target.value)} placeholder="كلمة السر" autoFocus />
            {error && <p className="text-xs font-semibold text-danger dark:text-danger">{error}</p>}
            <div className="flex gap-2 pt-1">
              <Button type="button" variant="secondary" magnetic={false} onClick={onUnlock}>
                فتح بدون حماية
              </Button>
              <Button type="submit" variant="gold" magnetic={false} className="flex-1">
                دخول
              </Button>
            </div>
            <button
              type="button"
              onClick={() => setShowForgot(true)}
              className="text-xs font-medium text-slate-400 underline underline-offset-2 hover:text-slate-600 dark:hover:text-slate-300"
            >
              نسيت كلمة السر؟
            </button>
          </form>
        </div>
      </div>
      <ForgotPasswordModal open={showForgot} onClose={() => setShowForgot(false)} onReset={onUnlock} />
    </>
  );
}

// "نسيت كلمة السر؟" - بما إن هذا تطبيق محلي بالكامل بدون بريد إلكتروني أو
// سيرفر مركزي، التأكيد البديل الوحيد المتاح فعليًا هو رمز PIN الخاص بحساب
// المالك (نفس الرمز يفتح البرنامج أصلاً) - يعيد استخدام /auth/login
// الموجود أصلاً للتحقق فقط (بدون تخزين التوكن الراجع، فما يأثر على الجلسة
// الحالية) قبل السماح بتعيين كلمة سر جديدة.
function ForgotPasswordModal({ open, onClose, onReset }) {
  const [step, setStep] = useState('pin');
  const [pin, setPin] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  function resetState() {
    setStep('pin');
    setPin('');
    setNewPw('');
    setConfirmPw('');
    setError('');
  }

  function handleClose() {
    resetState();
    onClose();
  }

  async function verifyPin(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const res = await api.post('/auth/login', { pin });
      if (res.data.worker.role !== 'owner') {
        setError('هذا الرمز ليس لحساب مالك');
        return;
      }
      setStep('newpw');
    } catch {
      setError('رمز PIN غير صحيح');
    } finally {
      setBusy(false);
    }
  }

  async function submitNewPassword(e) {
    e.preventDefault();
    setError('');
    if (newPw.length < 4) return setError('كلمة السر يجب أن تكون 4 أحرف على الأقل');
    if (newPw !== confirmPw) return setError('كلمتا السر غير متطابقتين');
    await window.raqeem.admin.setPassword(newPw);
    handleClose();
    onReset();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent dir="rtl" className="max-w-sm text-right">
        <DialogHeader>
          <DialogTitle>{step === 'pin' ? 'تأكيد الهوية' : 'كلمة سر جديدة'}</DialogTitle>
        </DialogHeader>
        {step === 'pin' ? (
          <form onSubmit={verifyPin} className="space-y-3">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              أدخل رمز PIN الخاص بحساب المالك لتأكيد هويتك قبل إعادة تعيين كلمة السر.
            </p>
            <input
              type="password"
              inputMode="numeric"
              className="input"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              placeholder="رمز PIN"
              autoFocus
              maxLength={6}
            />
            {error && <p className="text-xs font-semibold text-danger dark:text-danger">{error}</p>}
            <DialogFooter className="pt-1">
              <Button type="button" variant="secondary" magnetic={false} onClick={handleClose}>
                إلغاء
              </Button>
              <Button type="submit" variant="gold" magnetic={false} disabled={busy} className="flex-1">
                {busy ? 'جاري التحقق...' : 'تأكيد'}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <form onSubmit={submitNewPassword} className="space-y-3">
            <PasswordField value={newPw} onChange={(e) => setNewPw(e.target.value)} placeholder="كلمة السر الجديدة" autoFocus />
            <PasswordField value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} placeholder="تأكيد كلمة السر" />
            {error && <p className="text-xs font-semibold text-danger dark:text-danger">{error}</p>}
            <DialogFooter className="pt-1">
              <Button type="button" variant="secondary" magnetic={false} onClick={handleClose}>
                إلغاء
              </Button>
              <Button type="submit" variant="gold" magnetic={false} className="flex-1">
                حفظ وإعادة التعيين
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

// تبويب "بيانات المطبعة" - اسم المطبعة والعنوان والهاتف اللي تطلع بالفاتورة
function ShopSettings() {
  const [form, setForm] = useState(null);
  const [saved, setSaved] = useState(false);
  const [logoFile, setLogoFile] = useState(null);
  const [showPreview, setShowPreview] = useState(false);

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
      {saved && <div className="rounded-lg bg-success/10 px-3 py-2 text-sm text-success">تم الحفظ بنجاح</div>}
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
            value={form.receipt_primary_color || '#0B1D3A'}
            onChange={(e) => setForm({ ...form, receipt_primary_color: e.target.value })}
          />
        </div>
        <div>
          <label className="label">لون الوصل الثانوي (ذهبي)</label>
          <input
            type="color"
            className="h-10 w-full rounded-lg border border-slate-300"
            value={form.receipt_accent_color || '#C5A880'}
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

        {form.whatsapp_enabled === '1' && (
          <div className="mt-3 space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/5">
            <div>
              <label className="label">نص رسالة الواتساب (يمكنك التعديل)</label>
              <Textarea
                rows={4}
                placeholder={"المتغيرات المتاحة: {اسم_الزبون}, {رقم_الطلب}, {اسم_المطبعة}"}
                value={form.whatsapp_message_template ?? WHATSAPP_TEMPLATE_DEFAULT}
                onChange={(e) => setForm({ ...form, whatsapp_message_template: e.target.value })}
              />
            </div>
            <div>
              <label className="label">رقم الواتساب للإرسال</label>
              <input
                className="input"
                placeholder="07xxxxxxxxx"
                value={form.whatsapp_phone || ''}
                onChange={(e) => setForm({ ...form, whatsapp_phone: e.target.value })}
              />
            </div>
            <Button
              type="button"
              variant="secondary"
              magnetic={false}
              onClick={() => setShowPreview(true)}
              className="inline-flex items-center gap-1.5 !px-3 !py-1.5 !text-xs"
            >
              <Eye className="h-3.5 w-3.5" /> معاينة الرسالة
            </Button>
            <p className="text-xs text-slate-400">
              يتطلب ربط الجهاز عبر مسح رمز QR عند أول تشغيل — احفظ التغييرات بعد التفعيل وراح يظهر الكود بالأسفل.
            </p>
            <WhatsAppPairingStatus />
          </div>
        )}
      </div>
      <button className="btn-primary">حفظ التغييرات</button>

      <MessagePreviewModal
        open={showPreview}
        onClose={() => setShowPreview(false)}
        template={form.whatsapp_message_template ?? WHATSAPP_TEMPLATE_DEFAULT}
        shopName={form.shop_name}
      />
    </form>
  );
}

// مودال معاينة رسالة الواتساب - يستبدل المتغيرات بقيم تجريبية (وباسم
// المطبعة الحقيقي إذا محفوظ) حتى يشوف صاحب المطبعة شكل الرسالة قبل الحفظ.
function MessagePreviewModal({ open, onClose, template, shopName }) {
  const preview = (template || '')
    .split('{اسم_الزبون}').join('أحمد جبار')
    .split('{رقم_الطلب}').join('RQ20260914-0007')
    .split('{اسم_المطبعة}').join(shopName || 'مطبعتي');

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent dir="rtl" className="max-w-sm text-right">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-1.5">
            <MessageCircle className="h-4 w-4" /> معاينة الرسالة
          </DialogTitle>
        </DialogHeader>
        <div className="rounded-2xl bg-[#dcf8c6] p-3 text-sm leading-relaxed text-slate-800 dark:text-slate-900" style={{ whiteSpace: 'pre-wrap' }}>
          {preview}
        </div>
        <div className="flex justify-end">
          <Button type="button" variant="secondary" magnetic={false} onClick={onClose}>
            إغلاق
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const WA_STATUS_LABEL = {
  disabled: 'الخدمة متوقفة',
  initializing: 'جاري تحضير الاتصال...',
  qr_pending: 'امسح الكود بواتساب على جوالك',
  ready: 'متصل بواتساب',
  error: 'تعذر تشغيل خدمة واتساب — تحقق من تثبيت المكتبة وأعد تشغيل السيرفر',
};

// حالة ربط واتساب المحلي (QR code) - يفحص كل شوي اذا الاقتران نجح او لا
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
      <p className="flex items-center gap-1.5 text-sm font-medium text-slate-600 dark:text-slate-300">
        {state.status === 'ready' && <CheckCircle2 className="h-4 w-4 text-success" />}
        {WA_STATUS_LABEL[state.status] || state.status}
      </p>

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
            className="rounded-lg border border-danger/30 px-3 py-1 text-xs font-semibold text-danger transition hover:bg-danger/10 disabled:opacity-50"
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

// تبويب "الخدمات" - هنا يضيف صاحب المطبعة الخدمات الجاهزة (كارت، فلكس..)
// بأسعارها، وهذي نفسها اللي تطلع بقائمة اختيار الخدمة عند إنشاء طلب جديد
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

  // تعديل سعر خدمة موجودة - يتحدث فورًا بكل مكان يستخدم هالخدمة
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
                  <button className="text-danger hover:underline" onClick={() => removeService(s.id)}>
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

// تبويب "الموظفين" - اضافة موظف جديد برمز PIN خاص فيه، وتحديد دوره
// (مصمم، عامل طباعة..) اللي يحدد شنو يقدر يشوف بالتطبيق
// عدد المالكين الفعّالين حاليًا بالقائمة - نحتاجه نتأكد ما نعطل/نحذف آخر
// مالك من الواجهة قبل حتى ما نرسل الطلب للسيرفر (السيرفر يرفضها بالنهاية
// حتى لو تخطينا هذا الفحص، بس تجربة أفضل نمنعها من زر الواجهة مباشرة).
function activeOwnerCount(workers) {
  return workers.filter((w) => w.role === 'owner' && w.active).length;
}

function WorkersSettings() {
  const { worker: currentWorker } = useAuth();
  const [workers, setWorkers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [form, setForm] = useState({ name: '', pin: '', role: 'employee', role_id: '' });
  const [error, setError] = useState('');
  const [editingWorker, setEditingWorker] = useState(null);
  const [deletingWorker, setDeletingWorker] = useState(null);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    load();
    api
      .get('/roles')
      .then((res) => setRoles(res.data.roles))
      .catch(() => setRoles([])); // موظف عادي بدون صلاحية manage_roles ما يشوف القائمة — طبيعي، مو خطأ
  }, []);

  async function load() {
    const res = await api.get('/auth/workers');
    setWorkers(res.data.workers);
  }

  async function addWorker(e) {
    e.preventDefault();
    setError('');
    try {
      await api.post('/auth/workers', { ...form, role_id: form.role_id || null });
      setForm({ name: '', pin: '', role: 'employee', role_id: '' });
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'فشل الإضافة');
    }
  }

  async function toggleActive(w) {
    if (w.role === 'owner' && w.active && activeOwnerCount(workers) <= 1) {
      setError('يجب أن يبقى مالك واحد على الأقل بالنظام');
      return;
    }
    setError('');
    try {
      await api.patch(`/auth/workers/${w.id}`, { active: !w.active });
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'فشل التعديل');
    }
  }

  function handleDeleteClick(w) {
    if (w.id === currentWorker?.id) {
      setError('لا يمكنك حذف نفسك');
      return;
    }
    if (w.role === 'owner' && activeOwnerCount(workers) <= 1) {
      setError('يجب أن يبقى مالك واحد على الأقل بالنظام');
      return;
    }
    setError('');
    setDeletingWorker(w);
  }

  function handleDeleted(openOrders) {
    setDeletingWorker(null);
    setNotice(openOrders > 0 ? `تم الحذف — ملاحظة: عنده ${openOrders} طلب غير مسلَّم بعد` : 'تم الحذف');
    load();
  }

  return (
    <div className="max-w-3xl space-y-6">
      <form onSubmit={addWorker} className="card grid grid-cols-5 gap-2">
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
        <select className="input" value={form.role_id} onChange={(e) => setForm({ ...form, role_id: e.target.value })}>
          <option value="">بدون دور محدد</option>
          {roles.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
        <button className="btn-primary">+ إضافة</button>
      </form>
      {error && <div className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</div>}

      <div className="card overflow-hidden p-0">
        <table className="w-full text-sm">
          <thead className="bg-slate-100 text-slate-600">
            <tr>
              <th className="px-4 py-3 text-right">الاسم</th>
              <th className="px-4 py-3 text-right">الصلاحية</th>
              <th className="px-4 py-3 text-right">الدور</th>
              <th className="px-4 py-3 text-right">الحالة</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {workers.map((w) => (
              <tr key={w.id} className="border-t border-slate-100">
                <td className="px-4 py-3">{w.name}</td>
                <td className="px-4 py-3 text-slate-500">{w.role === 'owner' ? 'مالك' : 'موظف'}</td>
                <td className="px-4 py-3 text-slate-500">{w.role_name || '—'}</td>
                <td className="px-4 py-3">
                  <span className={`badge ${w.active ? 'bg-success/15 text-success' : 'bg-slate-200 text-slate-500'}`}>
                    {w.active ? 'فعال' : 'معطل'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      type="button"
                      title={w.active ? 'تعطيل' : 'تفعيل'}
                      onClick={() => toggleActive(w)}
                      className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-sm text-slate-600 transition hover:bg-slate-200 dark:bg-white/10 dark:text-slate-300 dark:hover:bg-white/20"
                    >
                      {w.active ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                    </button>
                    <button
                      type="button"
                      title="تعديل"
                      onClick={() => setEditingWorker(w)}
                      className="flex h-7 w-7 items-center justify-center rounded-full bg-nili/10 text-sm text-nili transition hover:bg-nili/15 dark:bg-gold/15 dark:text-gold-light dark:hover:bg-gold/25"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      title="حذف"
                      onClick={() => handleDeleteClick(w)}
                      className="flex h-7 w-7 items-center justify-center rounded-full bg-danger/10 text-sm text-danger transition hover:bg-danger/15 dark:bg-danger/15 dark:text-danger dark:hover:bg-danger/25"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {notice && (
        <div className="rounded-lg bg-success/10 px-3 py-2 text-sm text-success dark:bg-success/10 dark:text-success">
          {notice}
        </div>
      )}

      {editingWorker && (
        <EditWorkerModal
          worker={editingWorker}
          roles={roles}
          onClose={() => setEditingWorker(null)}
          onSaved={() => {
            setEditingWorker(null);
            load();
          }}
        />
      )}

      {deletingWorker && (
        <DeleteWorkerModal worker={deletingWorker} onClose={() => setDeletingWorker(null)} onDeleted={handleDeleted} />
      )}
    </div>
  );
}

// تبويب "الأدوار" — كل دور بطاقة مستقلة: اسمه، عدد الموظفين المرتبطين فيه،
// وقائمة صلاحيات مجمّعة حسب group_name بشكل checkboxes + زر حفظ خاص فيها.
// تبويب "الأدوار والصلاحيات" - كل دور (مدير، مصمم..) عنده حزمة صلاحيات
// محددة، هنا تتحكم شنو مسموح لكل دور يسويه بالضبط
function RolesSettings() {
  const [roles, setRoles] = useState(null);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setError('');
    try {
      const res = await api.get('/roles');
      setRoles(res.data.roles);
    } catch (err) {
      setError(err.response?.data?.error || 'تعذّر تحميل الأدوار');
    }
  }

  if (error) {
    return <div className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger dark:bg-danger/10 dark:text-danger">{error}</div>;
  }
  if (!roles) return null;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button type="button" className="btn-gold" onClick={() => setCreating(true)}>
          + دور جديد
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {roles.map((role) => (
          <RoleCard key={role.id} role={role} onSaved={load} />
        ))}
      </div>

      {creating && (
        <NewRoleModal
          onClose={() => setCreating(false)}
          onCreated={() => {
            setCreating(false);
            load();
          }}
        />
      )}
    </div>
  );
}

function RoleCard({ role, onSaved }) {
  const [allPermissions, setAllPermissions] = useState(null);
  const [selected, setSelected] = useState(new Set(role.permissions.map((p) => p.id)));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api
      .get('/permissions')
      .then((res) => setAllPermissions(res.data.permissions))
      .catch(() => setAllPermissions([]));
  }, []);

  useEffect(() => {
    setSelected(new Set(role.permissions.map((p) => p.id)));
  }, [role]);

  function toggle(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function save() {
    setSaving(true);
    setError('');
    try {
      await api.put(`/roles/${role.id}/permissions`, { permissionIds: Array.from(selected) });
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
      onSaved();
    } catch (err) {
      setError(err.response?.data?.error || 'فشل الحفظ');
    } finally {
      setSaving(false);
    }
  }

  const groups = {};
  for (const p of allPermissions || []) {
    const g = p.group_name || 'أخرى';
    if (!groups[g]) groups[g] = [];
    groups[g].push(p);
  }

  return (
    <div className="card">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <p className="font-display text-base font-bold text-slate-800 dark:text-slate-100">{role.name}</p>
          {role.description && <p className="text-xs text-slate-500 dark:text-slate-400">{role.description}</p>}
        </div>
        <span className="shrink-0 rounded-full bg-nili/10 px-2.5 py-1 text-xs font-semibold text-nili dark:bg-nili-light/10 dark:text-nili-light">
          {role.workerCount} موظف
        </span>
      </div>

      {error && (
        <div className="mb-2 rounded-lg bg-danger/10 px-3 py-2 text-xs text-danger dark:bg-danger/10 dark:text-danger">{error}</div>
      )}

      {!allPermissions ? (
        <p className="text-xs text-slate-400">جاري التحميل...</p>
      ) : (
        <div className="max-h-64 space-y-3 overflow-y-auto pr-1">
          {Object.entries(groups).map(([group, perms]) => (
            <div key={group}>
              <p className="mb-1 text-[11px] font-bold text-slate-400 dark:text-slate-500">{group}</p>
              <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                {perms.map((p) => (
                  <label
                    key={p.id}
                    className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1 text-xs hover:bg-slate-50 dark:hover:bg-white/5"
                  >
                    <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggle(p.id)} />
                    <span className="text-slate-600 dark:text-slate-300">{p.name}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-3 flex items-center justify-end gap-2">
        {saved && (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-success dark:text-success">
            <Check className="h-3.5 w-3.5" /> تم الحفظ
          </span>
        )}
        <button type="button" disabled={saving} onClick={save} className="btn-primary !px-4 !py-1.5 !text-xs">
          {saving ? 'جاري الحفظ...' : 'حفظ'}
        </button>
      </div>
    </div>
  );
}

function NewRoleModal({ onClose, onCreated }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError('');
    try {
      await api.post('/roles', { name: name.trim(), description });
      onCreated();
    } catch (err) {
      setError(err.response?.data?.error || 'فشل الإنشاء');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl dark:border dark:border-slate-800 dark:bg-slate-900"
      >
        <h3 className="mb-3 font-display text-base font-bold text-slate-800 dark:text-slate-100">دور جديد</h3>
        {error && (
          <div className="mb-3 rounded-lg bg-danger/10 px-3 py-2 text-xs text-danger dark:bg-danger/10 dark:text-danger">{error}</div>
        )}
        <div className="space-y-3">
          <div>
            <label className="label">اسم الدور</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
          </div>
          <div>
            <label className="label">الوصف (اختياري)</label>
            <input className="input" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onClose}>
            إلغاء
          </button>
          <button disabled={saving} className="btn-gold">
            {saving ? 'جاري الحفظ...' : 'إنشاء'}
          </button>
        </div>
      </form>
    </div>
  );
}

// بطاقة QR واحدة قابلة للتكبير (مودال) + طباعة — تُستخدم لكل أنواع رموز
// الشبكة المحلية الثلاثة (صفحة الزبون البسيطة، لوحة المالك، وطلب QR الكامل
// الجديد) بدل تكرار نفس الترميز ثلاث مرات.
function QrCard({ title, qrSrc, url, hint }) {
  const [enlarged, setEnlarged] = useState(false);

  function printQr() {
    const win = window.open('', '_blank', 'width=420,height=520');
    if (!win) return;
    win.document.write(
      '<html dir="rtl"><head><title>' + title + '</title>' +
      '<style>body{font-family:sans-serif;text-align:center;padding:24px;}img{width:280px;height:280px;}</style>' +
      '</head><body><h3>' + title + '</h3><img src="' + qrSrc + '" />' +
      '<p style="font-size:11px;word-break:break-all;color:#666;">' + url + '</p></body></html>'
    );
    win.document.close();
    win.focus();
    win.print();
  }

  return (
    <div className="card text-center">
      <h3 className="mb-2 font-semibold text-slate-700 dark:text-slate-200">{title}</h3>
      <img
        src={qrSrc}
        alt="QR"
        className="mx-auto mb-2 cursor-pointer transition hover:opacity-80"
        onClick={() => setEnlarged(true)}
      />
      <p className="break-all text-xs text-slate-400">{url}</p>
      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{hint}</p>

      <Dialog open={enlarged} onOpenChange={setEnlarged}>
        <DialogContent dir="rtl" className="max-w-xs text-center">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
          <img src={qrSrc} alt="QR" className="mx-auto" />
          <p className="break-all text-xs text-slate-400">{url}</p>
          <Button type="button" variant="gold" magnetic={false} onClick={printQr} className="w-full">
            طباعة
          </Button>
        </DialogContent>
      </Dialog>
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
    <div className="grid max-w-4xl grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      <QrCard
        title="صفحة الزبون (طلب/رفع تصميم)"
        qrSrc={net.customerQr}
        url={net.customerPortalUrl}
        hint="اطبع هذا الكود وضعه في المطبعة ليمسحه الزبائن عبر هواتفهم."
      />
      <QrCard
        title="لوحة المالك (موبايل)"
        qrSrc={net.ownerQr}
        url={net.ownerPortalUrl}
        hint="يعمل فقط ضمن شبكة الواي فاي نفسها للمطبعة."
      />
      <QrCard
        title="طلب جديد كامل (بدون واتساب)"
        qrSrc={net.fullOrderFormQr}
        url={net.fullOrderFormUrl}
        hint="فورم كامل: خدمة، كمية، مواصفات، وتصميم اختياري — يظهر بعلامة «طلب كامل» في صفحة الطلبات الواردة."
      />
    </div>
  );
}

// تبويب "النسخ الاحتياطي" - تحدد وين تنحفظ نسخة قاعدة البيانات تلقائيًا
// كل 6 ساعات (يفضل مجلد بفلاشة او قرص خارجي لأمان أكثر)
function BackupSettings() {
  const [form, setForm] = useState(null);
  const [saved, setSaved] = useState(false);
  const webFolderInputRef = useRef(null);
  const isElectron = typeof window !== 'undefined' && !!window.raqeem?.isElectron;

  useEffect(() => {
    api.get('/settings').then((r) => setForm(r.data.settings));
  }, []);

  async function save(e) {
    e.preventDefault();
    await api.patch('/settings', { backup_dir: form.backup_dir });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  // Electron: نافذة اختيار مجلد نظامية حقيقية عبر IPC، ترجّع مسارًا كاملاً.
  // متصفح عادي: لا يسمح لأي صفحة ويب بمعرفة المسار الكامل لأي مجلد على
  // القرص (حماية أمنية بالمتصفح نفسه) - أفضل الممكن هو اسم المجلد فقط عبر
  // <input webkitdirectory>، فنعرض بدلها ملاحظة توضح للمستخدم انه يلصق
  // المسار يدويًا بنسخة المتصفح.
  async function pickFolder() {
    if (isElectron) {
      const dir = await window.raqeem.dialog.selectFolder();
      if (dir) setForm((f) => ({ ...f, backup_dir: dir }));
    } else {
      webFolderInputRef.current?.click();
    }
  }

  function handleWebFolderPick(e) {
    const file = e.target.files?.[0];
    if (file?.webkitRelativePath) {
      setForm((f) => ({ ...f, backup_dir: file.webkitRelativePath.split('/')[0] }));
    }
    e.target.value = '';
  }

  if (!form) return null;

  return (
    <form onSubmit={save} className="card max-w-xl space-y-3">
      {saved && <div className="rounded-lg bg-success/10 px-3 py-2 text-sm text-success">تم الحفظ</div>}
      <p className="text-sm text-slate-500">
        يتم أخذ نسخة احتياطية تلقائية من قاعدة البيانات كل ٦ ساعات. حدد مجلدًا (مثلًا على فلاشة أو قرص خارجي) لحفظ النسخ فيه.
      </p>
      <div>
        <label className="label">مسار مجلد النسخ الاحتياطي</label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Folder className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className="input cursor-pointer pr-9"
              readOnly={isElectron}
              placeholder="اضغط هنا لاختيار مكان الحفظ..."
              value={form.backup_dir || ''}
              onClick={isElectron ? pickFolder : undefined}
              onChange={isElectron ? undefined : (e) => setForm({ ...form, backup_dir: e.target.value })}
            />
          </div>
          <Button type="button" variant="secondary" magnetic={false} onClick={pickFolder} className="shrink-0 !px-4">
            تصفح...
          </Button>
        </div>
        {!isElectron && (
          <p className="mt-1 text-xs text-slate-400">
            في نسخة المتصفح، انسخ المسار هنا، وفي نسخة سطح المكتب يمكنك التصفح مباشرة.
          </p>
        )}
        <input
          ref={webFolderInputRef}
          type="file"
          webkitdirectory=""
          directory=""
          className="hidden"
          onChange={handleWebFolderPick}
        />
      </div>
      <button className="btn-primary">حفظ</button>
    </form>
  );
}

// تبويب "الترخيص والحماية" — يشتغل فقط داخل نسخة Electron المثبّتة. محمي
// بكلمة سر إدارية منفصلة عن رمز PIN اليومي (حماية إضافية لأنه فيه معلومات
// حساسة: حالة الترخيص، مجلد النسخ الاحتياطي المشفّر...).
// بطاقة إدارة كلمة سر حماية هذا التبويب - تفعيل أول مرة / تغيير / إزالة.
// منفصلة عن SettingsPasswordGateModal (التي تتحكم بالدخول لكل صفحة
// الإعدادات) - هذي فقط تدير القيمة نفسها.
function AdminPasswordCard() {
  const [hasPassword, setHasPassword] = useState(null);
  const [mode, setMode] = useState('idle');
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    window.raqeem.admin.hasPassword().then(setHasPassword);
  }, []);

  function resetForm() {
    setCurrent('');
    setNext('');
    setConfirm('');
    setError('');
  }

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (mode === 'change') {
      const ok = await window.raqeem.admin.checkPassword(current);
      if (!ok) return setError('كلمة السر الحالية غير صحيحة');
    }
    if (next.length < 4) return setError('كلمة السر يجب أن تكون 4 أحرف على الأقل');
    if (next !== confirm) return setError('كلمتا السر غير متطابقتين');
    await window.raqeem.admin.setPassword(next);
    setHasPassword(true);
    setMode('idle');
    resetForm();
    setSuccess('تم تفعيل الحماية');
    setTimeout(() => setSuccess(''), 2500);
  }

  async function removeProtection() {
    const sure = window.confirm('متأكد تريد إزالة حماية كلمة السر عن هذا القسم؟');
    if (!sure) return;
    await window.raqeem.admin.removePassword();
    setHasPassword(false);
    setSuccess('تمت إزالة الحماية');
    setTimeout(() => setSuccess(''), 2500);
  }

  if (hasPassword === null) return null;

  return (
    <div className="card">
      <h3 className="mb-3 flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-100">
        {hasPassword ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
        حماية القسم بكلمة سر
      </h3>

      {success && (
        <div className="mb-3 rounded-lg bg-success/10 px-3 py-2 text-sm text-success dark:bg-success/10 dark:text-success">
          {success}
        </div>
      )}

      {mode === 'idle' && hasPassword && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 text-sm font-medium text-slate-600 dark:text-slate-300">
            <Lock className="h-3.5 w-3.5" /> القسم محمي حاليًا
          </span>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              magnetic={false}
              className="!px-3 !py-1.5 !text-xs"
              onClick={() => setMode('change')}
            >
              تغيير كلمة السر
            </Button>
            <Button
              type="button"
              variant="secondary"
              magnetic={false}
              className="!px-3 !py-1.5 !text-xs !text-danger"
              onClick={removeProtection}
            >
              إزالة الحماية
            </Button>
          </div>
        </div>
      )}

      {mode === 'idle' && !hasPassword && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-sm text-slate-500 dark:text-slate-400">هذا القسم غير محمي حاليًا.</span>
          <Button
            type="button"
            variant="gold"
            magnetic={false}
            className="!px-3 !py-1.5 !text-xs"
            onClick={() => setMode('enable')}
          >
            تفعيل الحماية
          </Button>
        </div>
      )}

      {(mode === 'enable' || mode === 'change') && (
        <form onSubmit={submit} className="mt-2 space-y-3">
          {mode === 'change' && (
            <PasswordField value={current} onChange={(e) => setCurrent(e.target.value)} placeholder="كلمة السر الحالية" autoFocus />
          )}
          <PasswordField
            value={next}
            onChange={(e) => setNext(e.target.value)}
            placeholder="كلمة السر الجديدة"
            autoFocus={mode === 'enable'}
          />
          <PasswordField value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="تأكيد كلمة السر" />
          {error && <p className="text-xs font-semibold text-danger dark:text-danger">{error}</p>}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              magnetic={false}
              onClick={() => {
                setMode('idle');
                resetForm();
              }}
            >
              إلغاء
            </Button>
            <Button type="submit" variant="gold" magnetic={false} className="flex-1">
              حفظ
            </Button>
          </div>
        </form>
      )}
    </div>
  );
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
      <AdminPasswordCard />
      <div className="card">
        <h3 className="mb-3 font-semibold text-slate-800 dark:text-slate-100">حالة الترخيص</h3>
        {status.status === 'licensed' && (
          <>
            <p className="flex items-center gap-1.5 rounded-lg bg-success/10 px-3 py-2 text-sm text-success dark:bg-success/10 dark:text-success">
              <Check className="h-4 w-4 shrink-0" /> مفعّل مجاناً — {status.shop}
              {new Date(status.expiresAt).getFullYear() - new Date().getFullYear() >= 50 ? (
                <> — ترخيص مجاني مدى الحياة <InfinityIcon className="inline h-4 w-4" /></>
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
          <p className="rounded-lg bg-gold/10 px-3 py-2 text-sm text-gold-dark dark:bg-gold/10 dark:text-gold-light">
            نسخة تجريبية — متبقي {status.daysLeft} يوم
          </p>
        )}
        {status.status === 'expired' && (
          <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger dark:bg-danger/10 dark:text-danger">
            انتهت الفترة التجريبية
          </p>
        )}

        <div className="mt-4">
          <label className="label">رقم الجهاز (Hardware ID)</label>
          <div className="flex gap-2">
            <input readOnly className="input font-mono text-xs" value={status.hardwareId} />
            <button type="button" onClick={copyHwid} className="btn-secondary shrink-0 !px-3">
              {copied ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
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
            {activateError && <p className="mt-1 text-xs font-semibold text-danger dark:text-danger">{activateError}</p>}
            {activateOk && (
              <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-success dark:text-success">
                <Check className="h-3.5 w-3.5" /> تم التفعيل بنجاح
              </p>
            )}
            <button className="btn-brand mt-2">فعّل</button>
          </form>
        )}
      </div>

      <div className="card">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-semibold text-slate-800 dark:text-slate-100">النسخ الاحتياطي المشفّر</h3>
          <button type="button" onClick={backupNow} disabled={backupBusy} className="btn-brand !px-3 !py-1.5 !text-xs inline-flex items-center gap-1">
            {backupBusy ? 'جاري...' : <><Package className="h-3.5 w-3.5" /> نسخ الآن</>}
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
                className="shrink-0 rounded-md bg-gold/15 px-2 py-1 font-semibold text-gold-dark hover:bg-gold/20 dark:bg-gold/15 dark:text-gold-light dark:hover:bg-gold/25"
              >
                استعادة ⟲
              </button>
            </div>
          ))}
        </div>
      </div>

      <ActivationContactCard />
    </div>
  );
}

// إعدادات التفعيل والتواصل: رقم واتساب المالك الشخصي (يظهر للزبون بصفحة
// التفعيل). مولّد مفاتيح التفعيل الحقيقي انتقل لصفحة مستقلة خاصة بالمطوّر
// (client/src/pages/LicenseGenerator.jsx، رابطها بالسايدبار بوضع التطوير
// فقط) بدل ما يكون قسم داخل الإعدادات - نفس القسم القديم هنا انحذف.
function ActivationContactCard() {
  const [waNumber, setWaNumber] = useState('');
  const [waSaved, setWaSaved] = useState(false);
  const [waLoaded, setWaLoaded] = useState(false);

  useEffect(() => {
    window.raqeem.settings.getOwnerWhatsApp().then((n) => {
      setWaNumber(n || '');
      setWaLoaded(true);
    });
  }, []);

  async function saveWaNumber(e) {
    e.preventDefault();
    const normalized = await window.raqeem.settings.setOwnerWhatsApp(waNumber);
    setWaNumber(normalized);
    setWaSaved(true);
    setTimeout(() => setWaSaved(false), 2500);
  }

  if (!waLoaded) return null;

  return (
    <div className="card">
      <h3 className="mb-3 font-semibold text-slate-800 dark:text-slate-100">إعدادات التفعيل والتواصل</h3>

      <form onSubmit={saveWaNumber} className="space-y-2">
        <label className="label">رقم واتساب التفعيل (رقمك الشخصي)</label>
        <input
          type="tel"
          className="input"
          value={waNumber}
          onChange={(e) => setWaNumber(e.target.value)}
          placeholder="9647701234567"
          dir="ltr"
        />
        <p className="text-xs text-slate-500 dark:text-slate-400">
          هذا الرقم سيظهر للزبائن عند طلب التفعيل - اكتبه مع رمز البلد بدون +
        </p>
        {waSaved && (
          <p className="flex items-center gap-1 text-xs font-semibold text-success dark:text-success">
            <Check className="h-3.5 w-3.5" /> تم الحفظ
          </p>
        )}
        <button className="btn-brand !px-3 !py-1.5 !text-xs">حفظ الرقم</button>
      </form>
    </div>
  );
}
