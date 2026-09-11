import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import UserPinPad from '../components/UserPinPad';
import { FIRST_LAUNCH_KEY } from './Onboarding';

function initials(name) {
  return (name || '?').trim().charAt(0);
}

function postLoginRedirect(navigate) {
  let firstLaunchDone = false;
  try {
    firstLaunchDone = localStorage.getItem(FIRST_LAUNCH_KEY) === 'true';
  } catch {
    firstLaunchDone = true;
  }
  navigate(firstLaunchDone ? '/dashboard' : '/onboarding');
}

export default function Login() {
  const { login, worker } = useAuth();
  const navigate = useNavigate();
  const [options, setOptions] = useState(null); // null = loading
  const [selected, setSelected] = useState(null); // worker card chosen, or 'fallback'
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (worker) postLoginRedirect(navigate);
  }, [worker, navigate]);

  useEffect(() => {
    api
      .get('/auth/login-options')
      .then((r) => setOptions(r.data.workers))
      .catch(() => setOptions([]));
  }, []);

  async function submitPin(pin) {
    setError('');
    setLoading(true);
    try {
      await login(pin);
      postLoginRedirect(navigate);
    } catch (err) {
      setError(err.response?.data?.error || 'رمز PIN غير صحيح');
    } finally {
      setLoading(false);
    }
  }

  const showCards = options && options.length > 0 && !selected;
  const showPinPad = selected || (options && options.length === 0);

  return (
    // dir="ltr" هنا يتحكم فقط بترتيب عمودي الـ flex (يسار/يمين فيزيائيًا)
    // بغض النظر عن اتجاه الصفحة العام؛ كل عمود يفرض dir="rtl" الخاص فيه
    // لمحاذاة نصوصه العربية بشكل صحيح.
    <div dir="ltr" className="flex h-screen w-screen overflow-hidden font-arabic">
      {/* يسار: هوية العلامة */}
      <div dir="rtl" className="relative hidden w-[42%] shrink-0 flex-col items-center justify-center overflow-hidden bg-[#1A2744] px-10 text-center lg:flex">
        <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.05]" aria-hidden="true">
          <pattern id="goldDots" width="28" height="28" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.5" fill="#C5A880" />
          </pattern>
          <rect width="100%" height="100%" fill="url(#goldDots)" />
        </svg>

        <motion.img
          src="/logo.png"
          alt="RaqeemOS"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-6 h-[120px] w-[120px] rounded-3xl object-contain"
        />
        <motion.h1
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="font-display text-3xl font-bold tracking-[-0.02em] text-[#C5A880]"
        >
          RaqeemOS
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="mt-2 text-sm text-slate-300"
        >
          نظام إدارة المطبعة الذكي
        </motion.p>
      </div>

      {/* يمين: اختيار المستخدم / رمز PIN */}
      <div dir="rtl" className="flex flex-1 items-center justify-center bg-white px-6">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center lg:hidden">
            <img src="/logo.png" alt="RaqeemOS" className="mx-auto mb-3 h-14 w-14 rounded-2xl object-contain" />
            <h1 className="font-display text-lg font-bold text-[#1A2744]">RaqeemOS</h1>
          </div>

          <AnimatePresence mode="wait">
            {options === null && (
              <motion.div key="loading" exit={{ opacity: 0 }} className="text-center text-sm text-slate-400">
                جاري التحميل...
              </motion.div>
            )}

            {showCards && (
              <motion.div key="cards" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                <h2 className="mb-1 text-center font-display text-lg font-bold text-[#1A2744]">من أنت؟</h2>
                <p className="mb-6 text-center text-xs text-slate-400">اختر اسمك للمتابعة</p>
                <div className="grid grid-cols-2 gap-3">
                  {options.map((w) => (
                    <button
                      key={w.id}
                      type="button"
                      onClick={() => setSelected(w)}
                      className="flex flex-col items-center gap-2 rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-[#C5A880] hover:shadow-md"
                    >
                      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#1A2744] text-lg font-bold text-[#C5A880]">
                        {initials(w.name)}
                      </span>
                      <span className="truncate text-sm font-semibold text-[#1A2744]">{w.name}</span>
                      <span className="truncate text-[11px] text-slate-400">{w.roleLabel}</span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {showPinPad && (
              <motion.div key="pinpad" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                {selected && (
                  <div className="mb-6 flex flex-col items-center">
                    <span className="mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-[#1A2744] text-xl font-bold text-[#C5A880]">
                      {initials(selected.name)}
                    </span>
                    <p className="font-semibold text-[#1A2744]">{selected.name}</p>
                    <p className="text-xs text-slate-400">أدخل رمز PIN الخاص بك</p>
                  </div>
                )}
                {!selected && (
                  <p className="mb-6 text-center text-sm text-slate-500">أدخل رمز PIN الخاص بك للدخول</p>
                )}

                <UserPinPad onSubmit={submitPin} loading={loading} error={error} onClear={() => setError('')} />

                {selected && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelected(null);
                      setError('');
                    }}
                    className="mt-4 w-full text-center text-xs font-medium text-slate-400 hover:text-slate-600"
                  >
                    ← رجوع لاختيار المستخدم
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
