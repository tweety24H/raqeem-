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
    if (worker) navigate('/');
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
      navigate('/');
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
    <div className="flex h-screen w-screen items-center justify-center bg-gradient-to-br from-nili via-nili-dark to-slate-900">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-2xl">
        <div className="mb-6 text-center">
          <div className="mb-2 text-4xl">🖨️</div>
          <h1 className="text-xl font-bold text-nili">RaqeemOS</h1>
          <p className="text-sm text-slate-500">أدخل رمز PIN الخاص بك لتسجيل الدخول</p>
        </div>

        <form onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            type="password"
            inputMode="numeric"
            value={pin}
            onChange={(e) => setError('') || setPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
            className="input mb-3 text-center text-2xl tracking-[0.5em]"
            placeholder="••••"
            autoFocus
          />

          {error && <div className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</div>}

          <div className="mb-4 grid grid-cols-3 gap-2">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
              <button
                type="button"
                key={d}
                onClick={() => pressKey(d)}
                className="rounded-lg bg-slate-100 py-3 text-lg font-semibold text-slate-700 hover:bg-slate-200"
              >
                {d}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setPin('')}
              className="rounded-lg bg-slate-100 py-3 text-sm font-semibold text-slate-500 hover:bg-slate-200"
            >
              مسح
            </button>
            <button
              type="button"
              onClick={() => pressKey('0')}
              className="rounded-lg bg-slate-100 py-3 text-lg font-semibold text-slate-700 hover:bg-slate-200"
            >
              0
            </button>
            <button
              type="button"
              onClick={() => setPin((p) => p.slice(0, -1))}
              className="rounded-lg bg-slate-100 py-3 text-sm font-semibold text-slate-500 hover:bg-slate-200"
            >
              ⌫
            </button>
          </div>

          <button type="submit" disabled={loading || !pin} className="btn-primary w-full py-3">
            {loading ? 'جاري الدخول...' : 'دخول'}
          </button>
        </form>
      </div>
    </div>
  );
}
