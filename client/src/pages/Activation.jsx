import { useEffect, useState } from 'react';
import { Check, Clipboard, ClipboardPaste, Loader2, MessageCircle } from 'lucide-react';
import logoUrl from '../assets/logo.png';
import { useToast } from '../context/ToastContext';

// مفتاح تفعيل حقيقي = base64url لِـ JSON (انظر electron/license.js) وبالتالي
// دائماً أطول من ٤٠ حرف ومحصور بمحارف base64url فقط - فحص شكلي بسيط بس (مو
// تحقق فعلي، التحقق الحقيقي يصير بالـ main process عبر license:activate)
// يكفي لتفعيل/تعطيل زر "فعّل الآن" وتنبيه المستخدم بغلطة لصق واضحة.
function isLikelyValidKeyFormat(raw) {
  const trimmed = (raw || '').trim();
  return /^[A-Za-z0-9_-]{40,}$/.test(trimmed);
}

function trialColorClasses(daysLeft) {
  if (daysLeft > 5) {
    return 'bg-success/10 text-success dark:bg-success/10 dark:text-success';
  }
  if (daysLeft >= 2) {
    return 'bg-gold/10 text-gold-dark dark:bg-gold/10 dark:text-gold-light';
  }
  return 'bg-danger/10 text-danger dark:bg-danger/10 dark:text-danger';
}

export default function Activation({ status, onActivated, onDismiss, allowDismiss = false }) {
  const toast = useToast();
  const [key, setKey] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(false);
  const [ownerWhatsApp, setOwnerWhatsApp] = useState('');

  const hardwareId = status?.hardwareId || '';
  const expired = status?.status === 'expired';
  const daysLeft = status?.daysLeft ?? 0;
  const keyValid = isLikelyValidKeyFormat(key);

  useEffect(() => {
    if (window.raqeem?.settings?.getOwnerWhatsApp) {
      window.raqeem.settings.getOwnerWhatsApp().then((n) => setOwnerWhatsApp(n || ''));
    }
  }, []);

  async function copyHwid() {
    if (window.raqeem?.license?.copyToClipboard) {
      await window.raqeem.license.copyToClipboard(hardwareId);
    } else {
      await navigator.clipboard.writeText(hardwareId);
    }
    toast.success('تم النسخ ✓');
  }

  async function pasteKey() {
    try {
      const text = await navigator.clipboard.readText();
      if (text) setKey(text.trim());
    } catch {
      toast.error('تعذّر قراءة الحافظة - الصق يدويًا (Ctrl+V)');
    }
  }

  async function activate(e) {
    e.preventDefault();
    setError('');
    if (!keyValid) return;
    setBusy(true);
    try {
      const result = await window.raqeem.license.activate(key);
      if (result.valid) {
        setSuccess(true);
        toast.success('تم التفعيل بنجاح ✓');
        setTimeout(() => onActivated?.(result), 2000);
      } else {
        setError(result.reason || 'مفتاح التفعيل غير صحيح لهذا الجهاز');
      }
    } finally {
      setBusy(false);
    }
  }

  const whatsappMsg = `مرحبا، اريد تفعيل برنامج مطبعتي\nرقم جهازي: ${hardwareId}`;
  const waLink = ownerWhatsApp ? `https://wa.me/${ownerWhatsApp}?text=${encodeURIComponent(whatsappMsg)}` : null;

  return (
    <div
      dir="rtl"
      className="flex min-h-screen items-center justify-center bg-gradient-to-br from-nili via-nili-dark to-black p-4"
    >
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl dark:bg-[#15151d]">
        <div className="mb-6 text-center">
          <img src={logoUrl} alt="Raqeem" className="mx-auto mb-3 h-16 w-16 rounded-2xl object-contain" />
          <h1 className="font-arabic text-xl font-semibold text-slate-900 dark:text-white">مرحباً بك في مطبعتي</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">أدخل مفتاح التفعيل لتشغيل البرنامج</p>
        </div>

        {status?.status === 'trial' && !expired && (
          <div className={`mb-4 rounded-xl px-4 py-3 text-center text-sm font-semibold ${trialColorClasses(daysLeft)}`}>
            نسخة تجريبية — متبقي {daysLeft} {daysLeft === 1 ? 'يوم' : 'أيام'}
          </div>
        )}
        {expired && (
          <div className="mb-4 rounded-xl bg-danger/10 px-4 py-3 text-center text-sm font-semibold text-danger dark:bg-danger/10 dark:text-danger">
            انتهت الفترة التجريبية — التفعيل مطلوب للمتابعة
          </div>
        )}

        <div className="mb-4">
          <label className="label">رقم جهازك (Hardware ID)</label>
          <div className="flex items-center gap-2">
            <input readOnly value={hardwareId} className="input font-mono text-xs" />
            <button type="button" onClick={copyHwid} className="btn-secondary shrink-0 !px-3">
              <Clipboard className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-1 text-xs text-slate-400">أرسل هذا الرقم لصاحب البرنامج عبر واتساب للحصول على مفتاح التفعيل.</p>
        </div>

        <form onSubmit={activate} className="mb-4">
          <label className="label">مفتاح التفعيل</label>
          <div className="relative">
            <textarea
              value={key}
              onChange={(e) => {
                setKey(e.target.value);
                setError('');
              }}
              rows={3}
              placeholder="الصق مفتاح التفعيل هنا..."
              className="input resize-none pl-9 font-mono text-xs"
              dir="ltr"
            />
            <button
              type="button"
              onClick={pasteKey}
              title="لصق من الحافظة"
              className="absolute left-2 top-2 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-white/10 dark:hover:text-slate-300"
            >
              <ClipboardPaste className="h-4 w-4" />
            </button>
          </div>
          {error && <p className="mt-1 text-xs font-semibold text-danger dark:text-danger">{error}</p>}
          {success && (
            <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-success dark:text-success">
              <Check className="h-3.5 w-3.5" /> تم التفعيل بنجاح ✓
            </p>
          )}
          <button type="submit" disabled={busy || !keyValid} className="btn-brand mt-3 flex w-full items-center justify-center gap-2">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {busy ? 'جاري التحقق...' : 'فعّل الآن'}
          </button>
        </form>

        {waLink ? (
          <a
            href={waLink}
            target="_blank"
            rel="noreferrer"
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-success px-4 py-2 text-sm font-semibold text-white transition hover:bg-success"
          >
            <MessageCircle className="h-4 w-4" /> تواصل واتساب للحصول على مفتاح
          </a>
        ) : (
          <div className="rounded-lg bg-slate-100 px-4 py-2 text-center text-xs text-slate-400 dark:bg-white/5 dark:text-slate-500">
            لم يتم تعيين رقم واتساب المالك
          </div>
        )}

        {allowDismiss && !expired && (
          <button type="button" onClick={onDismiss} className="mt-3 w-full text-center text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
            متابعة الفترة التجريبية
          </button>
        )}
      </div>
    </div>
  );
}
