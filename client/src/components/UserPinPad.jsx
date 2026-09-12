import { useEffect, useRef, useState } from 'react';

const DIGITS = 4;

// Shared 4-digit PIN pad — used by the login screen's per-card PIN step and
// the quick user-switcher. Auto-submits once 4 digits are entered (the app's
// PIN convention is 4 digits; see Login.jsx for the "no cards yet" fallback
// that still accepts a longer PIN for backward compatibility).
export default function UserPinPad({ onSubmit, loading, error, onClear }) {
  const [pin, setPin] = useState('');
  const submittedRef = useRef(false);

  useEffect(() => {
    if (pin.length === DIGITS && !submittedRef.current) {
      submittedRef.current = true;
      onSubmit(pin);
    }
  }, [pin, onSubmit]);

  useEffect(() => {
    if (error) {
      setPin('');
      submittedRef.current = false;
    }
  }, [error]);

  function pressKey(digit) {
    if (loading) return;
    onClear?.();
    setPin((p) => (p.length < DIGITS ? p + digit : p));
  }

  function backspace() {
    if (loading) return;
    submittedRef.current = false;
    setPin((p) => p.slice(0, -1));
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-center gap-3">
        {Array.from({ length: DIGITS }).map((_, i) => (
          <span
            key={i}
            className={`h-3.5 w-3.5 rounded-full border-2 transition-all ${
              i < pin.length ? 'border-[#C5A880] bg-[#C5A880]' : 'border-[#C5A880]/30'
            }`}
          />
        ))}
      </div>

      {error && <div className="mb-4 rounded-xl bg-rose-50 px-3 py-2 text-center text-sm text-rose-600">{error}</div>}

      <div className="grid grid-cols-3 gap-3">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
          <button
            type="button"
            key={d}
            disabled={loading}
            onClick={() => pressKey(d)}
            className="rounded-2xl bg-slate-50 py-4 text-lg font-display font-semibold text-[#0B1D3A] transition hover:bg-[#C5A880]/10 disabled:opacity-50"
          >
            {d}
          </button>
        ))}
        <button
          type="button"
          disabled={loading}
          onClick={() => {
            submittedRef.current = false;
            setPin('');
          }}
          className="rounded-2xl bg-slate-50 py-4 text-xs font-bold text-slate-400 transition hover:bg-[#C5A880]/10 disabled:opacity-50"
        >
          مسح
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={() => pressKey('0')}
          className="rounded-2xl bg-slate-50 py-4 text-lg font-display font-semibold text-[#0B1D3A] transition hover:bg-[#C5A880]/10 disabled:opacity-50"
        >
          0
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={backspace}
          className="rounded-2xl bg-slate-50 py-4 text-sm font-bold text-slate-400 transition hover:bg-[#C5A880]/10 disabled:opacity-50"
        >
          ⌫
        </button>
      </div>

      {loading && <p className="mt-4 text-center text-xs text-slate-400">جاري الدخول...</p>}
    </div>
  );
}
