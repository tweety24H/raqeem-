import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

// مودال ادخال PIN مع قفل بعد 3 محاولات وتذكرني
export default function PinGateModal({ user, onClose, onSuccess }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState(null);
  const [countdown, setCountdown] = useState(0);
  const [remember, setRemember] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // عداد القفل 30 ثانية
  useEffect(() => {
    if (!lockedUntil) return;
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((lockedUntil - Date.now()) / 1000));
      setCountdown(remaining);
      if (remaining <= 0) {
        setLockedUntil(null);
        setAttempts(0);
        setError('');
      }
    }, 200);
    return () => clearInterval(interval);
  }, [lockedUntil]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (lockedUntil) return;
    if (!pin || pin.length < 4) {
      setError('أدخل 4 أرقام على الأقل');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await onSuccess(pin, remember);
    } catch (err) {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      setError(err.message || 'رمز PIN غير صحيح');
      setPin('');
      if (newAttempts >= 3) {
        setLockedUntil(Date.now() + 30000);
        setCountdown(30);
        setError('تم قفل الإدخال لمدة 30 ثانية بعد 3 محاولات خاطئة');
      }
    } finally {
      setLoading(false);
    }
  };

  const isLocked = !!lockedUntil;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl"
        dir="rtl"
      >
        <div className="text-center mb-6">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-[#0B1D3A] text-xl font-bold text-[#C5A880]">
            {user.name?.charAt(0) || '?'}
          </div>
          <h3 className="font-bold text-[#0B1D3A]">{user.name}</h3>
          <p className="text-xs text-slate-500 mt-1">أدخل رمز PIN الخاص بك</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              ref={inputRef}
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              disabled={isLocked || loading}
              placeholder="••••"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-center text-2xl tracking-[0.5em] focus:border-[#C5A880] focus:bg-white focus:outline-none disabled:opacity-50"
            />
            {error && (
              <p className="mt-2 text-center text-xs text-red-600">{error}</p>
            )}
            {isLocked && (
              <p className="mt-2 text-center text-xs font-bold text-red-600">
                حاول مرة أخرى بعد {countdown} ثانية
              </p>
            )}
          </div>

          <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="rounded border-slate-300 text-[#0B1D3A] focus:ring-[#C5A880]"
            />
            تذكرني بهذا الجهاز
          </label>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isLocked || loading || !pin}
              className="flex-1 rounded-xl bg-[#0B1D3A] py-2.5 text-sm font-bold text-white hover:bg-[#1a2f5a] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'جاري...' : 'دخول'}
            </button>
          </div>

          <p className="text-center text-[11px] text-slate-400">
            الافتراضي: 1234 {attempts > 0 && `• محاولة ${attempts}/3`}
          </p>
        </form>
      </motion.div>
    </motion.div>
  );
}
