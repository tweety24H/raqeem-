import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../api/client';

// Device-level flag (not per-worker): once any worker finishes or skips this
// setup wizard on this machine, it never shows again — see Login.jsx and
// App.jsx's SessionGate, which both read this to decide where to land after
// auth. Distinct from components/Onboarding.jsx's `raqeem_onboarding_seen`
// (the post-login "here's what the dashboard does" walkthrough) — this one
// is a one-time shop-setup wizard, that one is a per-visit feature tour.
export const FIRST_LAUNCH_KEY = 'firstLaunch';

const STEPS = [
  { key: 'shop', title: 'اسم مطبعتك', subtitle: 'راح يظهر بالفواتير والإيصالات' },
  { key: 'customer', title: 'أضف أول زبون', subtitle: 'تقدر تضيف البقية لاحقًا من صفحة الزبائن' },
  { key: 'stock', title: 'أضف أول صنف مخزون', subtitle: 'تقدر تضيف البقية لاحقًا من صفحة المخزون' },
];

export default function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [shopName, setShopName] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [itemName, setItemName] = useState('');
  const [itemQty, setItemQty] = useState('');
  const [saving, setSaving] = useState(false);

  function finish() {
    try {
      localStorage.setItem(FIRST_LAUNCH_KEY, 'true');
    } catch {
      /* ignore */
    }
    navigate('/dashboard');
  }

  async function saveCurrentStep() {
    // كل خطوة اختيارية — الحفظ هنا "قدر المستطاع": فشل الطلب (مثلاً عامل
    // بدون صلاحية إنشاء زبون/تعديل مخزون) ما يوقف المعالج، بس يتخطى الحفظ.
    try {
      if (STEPS[step].key === 'shop' && shopName.trim()) {
        await api.patch('/settings', { shop_name: shopName.trim() });
      } else if (STEPS[step].key === 'customer' && customerName.trim()) {
        await api.post('/customers', { name: customerName.trim(), phone: customerPhone.trim() });
      } else if (STEPS[step].key === 'stock' && itemName.trim()) {
        const fd = new FormData();
        fd.append('name', itemName.trim());
        fd.append('unit', 'قطعة');
        fd.append('quantity', itemQty || '0');
        fd.append('min_quantity', '0');
        await api.post('/stock', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      }
    } catch {
      /* best-effort — تجاهل وانتقل */
    }
  }

  async function goNext() {
    setSaving(true);
    await saveCurrentStep();
    setSaving(false);
    if (step === STEPS.length - 1) finish();
    else setStep((s) => s + 1);
  }

  const current = STEPS[step];

  return (
    <div dir="rtl" className="flex h-screen w-screen flex-col items-center justify-center bg-[#0A0F1C] px-6 font-arabic">
      <motion.img
        src="/logo.png"
        alt="RaqeemOS"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="mb-8 h-24 w-24 rounded-3xl object-contain"
      />

      {/* progress bar */}
      <div className="mb-8 flex w-full max-w-sm items-center gap-2">
        {STEPS.map((s, i) => (
          <div key={s.key} className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
            <motion.div
              className="h-full bg-[#C5A880]"
              initial={{ width: 0 }}
              animate={{ width: i <= step ? '100%' : 0 }}
              transition={{ duration: 0.3 }}
            />
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={current.key}
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -16 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-sm rounded-2xl bg-white p-6"
        >
          <h2 className="mb-1 text-center font-display text-lg font-bold text-[#1A2744]">{current.title}</h2>
          <p className="mb-5 text-center text-xs text-slate-400">{current.subtitle}</p>

          {current.key === 'shop' && (
            <input
              className="input"
              placeholder="مثال: مطبعة الأمانة"
              value={shopName}
              onChange={(e) => setShopName(e.target.value)}
              autoFocus
            />
          )}

          {current.key === 'customer' && (
            <div className="space-y-3">
              <input
                className="input"
                placeholder="اسم الزبون"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                autoFocus
              />
              <input
                className="input"
                placeholder="رقم الهاتف (اختياري)"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
              />
            </div>
          )}

          {current.key === 'stock' && (
            <div className="space-y-3">
              <input
                className="input"
                placeholder="اسم الصنف"
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                autoFocus
              />
              <input
                className="input"
                type="number"
                placeholder="الكمية الحالية"
                value={itemQty}
                onChange={(e) => setItemQty(e.target.value)}
              />
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      <div className="mt-6 flex w-full max-w-sm items-center justify-between">
        <button type="button" onClick={finish} className="text-sm font-medium text-slate-400 hover:text-slate-200">
          تخطي
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={goNext}
          className="rounded-xl bg-[#C5A880] px-6 py-2.5 text-sm font-bold text-[#1A2744] transition hover:bg-[#B8956A] disabled:opacity-50"
        >
          {saving ? '...' : step === STEPS.length - 1 ? 'ابدأ' : 'التالي'}
        </button>
      </div>
    </div>
  );
}
