import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, worker } = useAuth();
  const navigate = useNavigate();
  const inputRef = useRef(null);

  useEffect(() => {
    if (worker) navigate('/dashboard');
  }, [worker, navigate]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(pin);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'تعذر تسجيل الدخول، تأكد من تشغيل الخادم');
      setPin('');
    } finally {
      setLoading(false);
    }
  }

  function pressKey(digit) {
    setError('');
    setPin((p) => (p.length < 8 ? p + digit : p));
  }

  return (
    // لايت بس بالتصميم - قرار مقصود، بدون دعم دارك مود (شوف LandingNew.jsx لنفس الملاحظة).
    <div dir="rtl" className="flex h-screen w-screen items-center justify-center bg-[#fefcf8] relative overflow-hidden">
      {/* لمسة "ورق" خفيفة بالخلفية - طابعة شفافة جداً، ديكور بس */}
      <div className="pointer-events-none absolute top-10 left-10 hidden text-[160px] opacity-[0.04] select-none sm:block">🖨️</div>
      <div className="pointer-events-none absolute -bottom-16 -right-16 w-80 h-80 rounded-full bg-gold/10 blur-3xl" />

      <div className="relative w-full max-w-sm mx-4 rounded-[28px] border-2 border-nili/10 bg-white p-8 shadow-2xl">
        <div className="mb-7 text-center">
          <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-nili text-2xl text-white rotate-3">
            🖨️
          </span>
          <h1 className="font-display text-lg font-bold tracking-[-0.02em] text-nili">RaqeemOS</h1>
          <p className="font-arabic mt-1 text-xs text-slate-400 font-medium">أدخل رمز PIN الخاص بك لتسجيل الدخول</p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* حقل حقيقي مخفي بصرياً - يخلي الكيبورد الفيزيائي والـ autofocus
              يشتغلون عادي، وياه بنفس الوقت النقاط بالأسفل هي الي تظهر للمستخدم. */}
          <input
            ref={inputRef}
            type="password"
            inputMode="numeric"
            value={pin}
            onChange={(e) => setError('') || setPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
            className="sr-only"
            aria-label="رمز PIN"
            autoFocus
          />

          {/* نقاط PIN بدل خانة نص مقنّعة عادية */}
          <div className="mb-7 flex items-center justify-center gap-3">
            {Array.from({ length: Math.max(4, pin.length) }).map((_, i) => (
              <span
                key={i}
                className={`h-3.5 w-3.5 rounded-full border-2 transition-all ${
                  i < pin.length ? 'border-gold bg-gold' : 'border-gold/30'
                }`}
              />
            ))}
          </div>

          {error && <div className="mb-4 rounded-xl bg-rose-50 px-3 py-2 text-center text-sm text-rose-600">{error}</div>}

          <div className="mb-5 grid grid-cols-3 gap-3">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
              <button
                type="button"
                key={d}
                onClick={() => pressKey(d)}
                className="rounded-2xl bg-[#fefcf8] py-4 text-lg font-display font-semibold text-nili transition hover:bg-gold/10"
              >
                {d}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setPin('')}
              className="rounded-2xl bg-[#fefcf8] py-4 text-xs font-bold text-slate-400 transition hover:bg-gold/10"
            >
              مسح
            </button>
            <button
              type="button"
              onClick={() => pressKey('0')}
              className="rounded-2xl bg-[#fefcf8] py-4 text-lg font-display font-semibold text-nili transition hover:bg-gold/10"
            >
              0
            </button>
            <button
              type="button"
              onClick={() => setPin((p) => p.slice(0, -1))}
              className="rounded-2xl bg-[#fefcf8] py-4 text-sm font-bold text-slate-400 transition hover:bg-gold/10"
            >
              ⌫
            </button>
          </div>

          <button
            type="submit"
            disabled={loading || !pin}
            className="w-full rounded-2xl bg-nili py-4 text-sm font-arabic font-medium text-white shadow-lg shadow-nili/20 transition hover:bg-nili-dark disabled:opacity-50"
          >
            {loading ? 'جاري الدخول...' : 'دخول'}
          </button>
        </form>
      </div>
    </div>
  );
}
