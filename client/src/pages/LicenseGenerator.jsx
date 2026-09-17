import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Copy, KeyRound } from 'lucide-react';
import api from '../api/client';
import Button from '../components/ui/Button';
import { useToast } from '../context/ToastContext';

const LOG_KEY = 'raqeem_dev_generated_keys';

const isElectron = typeof window !== 'undefined' && !!window.raqeem?.isElectron;
// أداة داخلية للمطوّرة فقط: تظهر بمتصفح ويب عادي أثناء التطوير (مو Electron
// إطلاقًا) أو بوضع Vite dev حتى لو شُغّلت مصادفة داخل Electron dev. لا تظهر
// أبدًا بالنسخة المحزّمة عند الزبون (import.meta.env.DEV تكون false هناك).
const isDevMode = !isElectron || import.meta.env.DEV;

const DURATIONS = [
  { value: '1', label: 'شهر واحد' },
  { value: '6', label: '6 أشهر' },
  { value: '12', label: 'سنة كاملة' },
  { value: 'lifetime', label: 'مدى الحياة ♾️' },
];

function readLog() {
  try {
    return JSON.parse(localStorage.getItem(LOG_KEY) || '[]');
  } catch {
    return [];
  }
}

function writeLog(log) {
  try {
    localStorage.setItem(LOG_KEY, JSON.stringify(log));
  } catch {
    /* ignore */
  }
}

export default function LicenseGenerator() {
  const navigate = useNavigate();
  const toast = useToast();
  const [hwid, setHwid] = useState('');
  const [shop, setShop] = useState('');
  const [duration, setDuration] = useState('lifetime');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [key, setKey] = useState('');
  const [log, setLog] = useState(() => readLog());

  // فحص إضافي بمستوى الكومبوننت (مو بس إخفاء رابط بالسايدبار) - حتى لو حد
  // كتب الرابط يدويًا بالنسخة المحزّمة، يرجع فورًا للداشبورد بدون ما يشوف شي.
  useEffect(() => {
    if (!isDevMode) navigate('/dashboard', { replace: true });
  }, [navigate]);

  if (!isDevMode) return null;

  async function generate(e) {
    e.preventDefault();
    setError('');
    setKey('');
    if (!hwid.trim()) return setError('أدخل رقم جهاز الزبون (Hardware ID)');
    if (!shop.trim()) return setError('أدخل اسم المحل');

    setBusy(true);
    try {
      let result;
      if (isElectron) {
        result = await window.raqeem.license.generate(hwid.trim(), shop.trim(), duration);
      } else {
        // بمتصفح ويب عادي أثناء التطوير: نفس منطق التوقيع لكن يشتغل على
        // الخادم (Node عنده وصول كامل لـ crypto ولملف المفتاح الخاص) - انظر
        // server/index.js: POST /api/dev/generate-license
        const res = await api.post('/dev/generate-license', { hwid: hwid.trim(), shop: shop.trim(), duration });
        result = res.data;
      }
      if (!result.ok) {
        setError(result.error || 'فشل توليد المفتاح');
        return;
      }
      setKey(result.key);
      const entry = {
        date: new Date().toISOString(),
        hwid: hwid.trim(),
        shop: shop.trim(),
        duration,
        keyPreview: `${result.key.slice(0, 24)}...`,
      };
      const newLog = [entry, ...log].slice(0, 50);
      setLog(newLog);
      writeLog(newLog);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'فشل توليد المفتاح');
    } finally {
      setBusy(false);
    }
  }

  async function copyKey() {
    try {
      if (window.raqeem?.license?.copyToClipboard) {
        await window.raqeem.license.copyToClipboard(key);
      } else {
        await navigator.clipboard.writeText(key);
      }
    } catch {
      /* ignore */
    }
    toast.success('تم نسخ المفتاح ✓');
  }

  const durationLabel = DURATIONS.find((d) => d.value === duration)?.label || duration;

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50 p-6 font-arabic dark:bg-slate-950">
      <div className="mx-auto max-w-xl space-y-6">
        <div className="flex items-center gap-2">
          <KeyRound className="h-6 w-6 shrink-0 text-gold-dark dark:text-gold-light" />
          <div>
            <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100">مولّد مفاتيح التفعيل</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              أداة داخلية للمطوّرة فقط - تولّد مفاتيح تفعيل حقيقية موقّعة بمفتاحك الخاص RSA. غير
              موجودة إطلاقًا بنسخة الزبون المحزّمة.
            </p>
          </div>
        </div>

        <form onSubmit={generate} className="card space-y-3">
          <div>
            <label className="label">رقم جهاز الزبون (Hardware ID)</label>
            <input
              className="input font-mono text-xs"
              value={hwid}
              onChange={(e) => setHwid(e.target.value)}
              placeholder="الصق Hardware ID الذي أرسله الزبون..."
              dir="ltr"
            />
          </div>
          <div>
            <label className="label">اسم المحل</label>
            <input
              className="input"
              value={shop}
              onChange={(e) => setShop(e.target.value)}
              placeholder="مثال: مطبعة الفرات"
            />
          </div>
          <div>
            <label className="label">مدة الترخيص</label>
            <select className="input" value={duration} onChange={(e) => setDuration(e.target.value)}>
              {DURATIONS.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>
          {error && <p className="text-xs font-semibold text-danger dark:text-danger">{error}</p>}
          <Button type="submit" variant="gold" magnetic={false} className="w-full" disabled={busy}>
            {busy ? 'جاري التوليد...' : 'توليد المفتاح'}
          </Button>
        </form>

        {key && (
          <div className="card space-y-2">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              المفتاح لـ {shop} — {durationLabel}
            </p>
            <textarea readOnly rows={4} className="input resize-none font-mono text-xs" value={key} dir="ltr" />
            <Button type="button" variant="secondary" magnetic={false} onClick={copyKey} className="w-full">
              <Copy className="ml-1 inline h-3.5 w-3.5" /> نسخ المفتاح
            </Button>
          </div>
        )}

        {log.length > 0 && (
          <div className="card">
            <h3 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
              سجل المفاتيح المولّدة (محفوظ محليًا بهذا المتصفح فقط)
            </h3>
            <div className="max-h-64 space-y-1 overflow-y-auto">
              {log.map((entry, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-1.5 text-xs dark:bg-white/5"
                >
                  <span className="truncate text-slate-600 dark:text-slate-300">{entry.shop}</span>
                  <span className="shrink-0 font-mono text-slate-400">{entry.keyPreview}</span>
                  <span className="shrink-0 text-slate-400">{new Date(entry.date).toLocaleDateString('ar-IQ')}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
