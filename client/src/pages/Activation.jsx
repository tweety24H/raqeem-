import { useState } from 'react';

const WHATSAPP_NUMBER = '9647801234567';

export default function Activation({ status, onActivated, onDismiss, allowDismiss = false }) {
  const [key, setKey] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const hardwareId = status?.hardwareId || '';
  const expired = status?.status === 'expired';

  async function copyHwid() {
    if (window.raqeem?.license?.copyToClipboard) {
      await window.raqeem.license.copyToClipboard(hardwareId);
    } else {
      await navigator.clipboard.writeText(hardwareId);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  async function activate(e) {
    e.preventDefault();
    setError('');
    if (!key.trim()) return;
    setBusy(true);
    try {
      const result = await window.raqeem.license.activate(key);
      if (result.valid) {
        onActivated?.(result);
      } else {
        setError(result.reason || 'مفتاح غير صحيح');
      }
    } finally {
      setBusy(false);
    }
  }

  const whatsappMsg = encodeURIComponent(
    `مرحباً، أريد مفتاح تفعيل مطبعتي.\nHardware ID: ${hardwareId}`
  );

  return (
    <div
      dir="rtl"
      className="flex min-h-screen items-center justify-center bg-gradient-to-br from-nili via-nili-dark to-black p-4"
    >
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl dark:bg-[#15151d]">
        <div className="mb-6 text-center">
          <img src="/logo.png" alt="Raqeem" className="mx-auto mb-3 h-16 w-16 rounded-2xl object-contain" />
          <h1 className="font-arabic text-xl font-semibold text-slate-900 dark:text-white">مرحباً بك في مطبعتي</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">أدخل مفتاح التفعيل لتشغيل البرنامج</p>
        </div>

        {status?.status === 'trial' && !expired && (
          <div className="mb-4 rounded-xl bg-gold/10 px-4 py-3 text-center text-sm font-semibold text-gold-dark dark:bg-gold/10 dark:text-gold-light">
            نسخة تجريبية — متبقي {status.daysLeft} {status.daysLeft === 1 ? 'يوم' : 'أيام'}
          </div>
        )}
        {expired && (
          <div className="mb-4 rounded-xl bg-danger/10 px-4 py-3 text-center text-sm font-semibold text-danger dark:bg-danger/10 dark:text-danger">
            انتهت الفترة التجريبية (٧ أيام) — التفعيل مطلوب للمتابعة
          </div>
        )}

        <div className="mb-4">
          <label className="label">رقم جهازك (Hardware ID)</label>
          <div className="flex items-center gap-2">
            <input readOnly value={hardwareId} className="input font-mono text-xs" />
            <button type="button" onClick={copyHwid} className="btn-secondary shrink-0 !px-3">
              {copied ? '✓' : '📋'}
            </button>
          </div>
          <p className="mt-1 text-xs text-slate-400">أرسل هذا الرقم لشركة رقيم عبر واتساب للحصول على مفتاح التفعيل.</p>
        </div>

        <form onSubmit={activate} className="mb-4">
          <label className="label">مفتاح التفعيل</label>
          <textarea
            value={key}
            onChange={(e) => setKey(e.target.value)}
            rows={3}
            placeholder="الصق مفتاح التفعيل هنا..."
            className="input resize-none font-mono text-xs"
          />
          {error && <p className="mt-1 text-xs font-semibold text-danger dark:text-danger">{error}</p>}
          <button type="submit" disabled={busy || !key.trim()} className="btn-brand mt-3 w-full">
            {busy ? 'جاري التحقق...' : 'فعّل الآن'}
          </button>
        </form>

        <a
          href={`https://wa.me/${WHATSAPP_NUMBER}?text=${whatsappMsg}`}
          target="_blank"
          rel="noreferrer"
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-success px-4 py-2 text-sm font-semibold text-white transition hover:bg-success"
        >
          💬 تواصل واتساب للحصول على مفتاح
        </a>

        {allowDismiss && !expired && (
          <button type="button" onClick={onDismiss} className="mt-3 w-full text-center text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
            متابعة الفترة التجريبية
          </button>
        )}
      </div>
    </div>
  );
}
