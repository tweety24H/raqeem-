import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import PinGateModal from '../components/PinGateModal';
import { FIRST_LAUNCH_KEY } from './Onboarding';

// دالة تجيب أول حرف من الاسم
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

// النسخة الآمنة للبيع: هاي الشاشة تعرض بس حسابات حقيقية موجودة فعلاً
// بقاعدة البيانات — ماكو أي مسار ينشئ موظف أو يفعّل حساب بدون تسجيل دخول.
// اذا دور "مصمم" أو "كاشير" ماكو له حساب بعد، نعرض كارت رمادي مقفول (مو
// قابل للضغط) يوجّه المالك يضيفه من الإعدادات — هذا يسكر ثغرة كانت موجودة
// سابقًا (POST /auth/quick-create كان بدون تسجيل دخول، أي شخص يوصل للشاشة
// يقدر يسوي حساب لنفسه).
export default function Login() {
  const { login, worker } = useAuth();
  const navigate = useNavigate();
  const [options, setOptions] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showPinModal, setShowPinModal] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [rememberedUser, setRememberedUser] = useState(null);
  const [lastBackupLabel, setLastBackupLabel] = useState('اليوم');

  // وقت حي يتحرك كل ثانية
  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // آخر نسخة احتياطية فعلية - window.raqeem موجود بس داخل Electron
  // (preload.js)، فبوضع المتصفح العادي (npm run dev بالمتصفح) نخليها
  // القيمة الافتراضية "اليوم" لأنه ماكو وصول لنظام الملفات أصلاً.
  useEffect(() => {
    if (!window.raqeem?.backup?.list) return;
    window.raqeem.backup
      .list()
      .then((backups) => {
        if (!backups || backups.length === 0) {
          setLastBackupLabel('لا توجد بعد');
          return;
        }
        const last = new Date(backups[0].date);
        const todayStr = new Date().toISOString().slice(0, 10);
        const lastStr = last.toISOString().slice(0, 10);
        if (lastStr === todayStr) setLastBackupLabel('اليوم');
        else setLastBackupLabel(last.toLocaleDateString('ar-EG', { day: 'numeric', month: 'long' }));
      })
      .catch(() => {});
  }, []);

  // شيك اذا اكو مستخدم محفوظ "تذكرني"
  useEffect(() => {
    try {
      const saved = localStorage.getItem('raqeem_remembered_user');
      if (saved) setRememberedUser(JSON.parse(saved));
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (worker) postLoginRedirect(navigate);
  }, [worker, navigate]);

  useEffect(() => {
    api
      .get('/auth/login-options')
      .then((r) => setOptions(r.data.workers || []))
      .catch(() => setOptions([]));
  }, []);

  // لو اكو تذكرني، افتح المودال مباشرة
  useEffect(() => {
    if (rememberedUser && options && options.length > 0) {
      const found = options.find((w) => w.id === rememberedUser.id);
      if (found) {
        setSelectedUser(found);
        setShowPinModal(true);
      }
    }
  }, [rememberedUser, options]);

  // شاشة تسجيل الدخول تطلع قبل ما نصير مسجلين، يعني ماكو DashboardSummaryProvider
  // بعد (هذا موجود بس داخل Layout.jsx). فنقرأ آخر عدد طلبات متأخرة معروف
  // من الكاش المحلي اللي يحدّثه DashboardSummaryContext كل مرة يدخل بيها
  // موظف حقيقي - مو استدعاء API جديد بدون تسجيل دخول.
  const [overdueCount] = useState(() => {
    try {
      return Number(localStorage.getItem('raqeem_overdue_count')) || 0;
    } catch {
      return 0;
    }
  });

  const hasDesigner = useMemo(() => options?.some((w) => w.role === 'designer') || false, [options]);
  const hasCashier = useMemo(() => options?.some((w) => w.role === 'cashier') || false, [options]);

  const handleCardClick = (user) => {
    setSelectedUser(user);
    setShowPinModal(true);
  };

  // منطق آمن وبسيط: ندخل بالـ PIN الحقيقي وبس، بدون أي مسار "تفعيل تجريبي"
  // ينشئ حساب من الشاشة نفسها.
  const handlePinSuccess = async (pin, remember) => {
    try {
      await login(pin);
      if (remember) {
        localStorage.setItem('raqeem_remembered_user', JSON.stringify(selectedUser));
      } else {
        localStorage.removeItem('raqeem_remembered_user');
      }
      setShowPinModal(false);
      postLoginRedirect(navigate);
    } catch (e) {
      throw new Error(e.response?.data?.error || 'رمز PIN غير صحيح');
    }
  };

  if (options === null) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#0B1D3A] text-white">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-[#C5A880] border-t-transparent"></div>
          <p className="text-sm text-slate-300">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  return (
    <div dir="ltr" className="flex h-screen w-screen overflow-hidden font-arabic">
      {/* يسار: هوية العلامة - كحلي غامق مع نقاط ذهبية */}
      <div dir="rtl" className="relative hidden w-[44%] shrink-0 flex-col items-center justify-center overflow-hidden bg-[#0B1D3A] px-10 text-center lg:flex">
        <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.06]" aria-hidden="true">
          <pattern id="goldDots" width="28" height="28" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.5" fill="#C5A880" />
          </pattern>
          <rect width="100%" height="100%" fill="url(#goldDots)" />
        </svg>

        <motion.img
          src="/logo.png"
          alt="Raqeem"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0, scale: [1, 1.03, 1] }}
          transition={{
            opacity: { duration: 0.5 },
            y: { duration: 0.5 },
            scale: { duration: 2, repeat: Infinity, ease: 'easeInOut' },
          }}
          className="mb-6 h-[120px] w-[120px] rounded-3xl object-contain shadow-[0_0_40px_rgba(197,168,128,0.15)]"
        />
        <motion.h1
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="font-display text-3xl font-bold tracking-[-0.02em]"
        >
          <span className="text-white">Raqeem</span>
          <span className="text-[#C5A880] text-lg align-top ml-0.5">OS</span>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mt-2 text-sm text-slate-300"
        >
          مطبعتك.. بأرقام
        </motion.p>

        {/* معلومات حية أسفل اليسار */}
        <div className="absolute bottom-8 right-10 left-10 flex flex-col gap-3">
          <div className="flex items-center justify-between rounded-xl bg-white/5 px-4 py-3 backdrop-blur">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 animate-pulse rounded-full bg-success"></span>
              <span className="text-xs text-slate-200">النظام جاهز - v2.0.0</span>
            </div>
            <span className="text-[11px] text-slate-400">
              {currentTime.toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
            <span>
              {currentTime.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
            <span>آخر نسخ احتياطي: {lastBackupLabel}</span>
          </div>
        </div>
      </div>

      {/* يمين: اختيار المستخدم */}
      <div dir="rtl" className="flex flex-1 flex-col items-center justify-center bg-[#F8F9FA] px-6 py-8 overflow-y-auto">
        <div className="w-full max-w-[380px]">
          {/* موبايل لوجو */}
          <div className="mb-6 text-center lg:hidden">
            <motion.img
              src="/logo.png"
              alt="Raqeem"
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
              className="mx-auto mb-3 h-14 w-14 rounded-2xl object-contain"
            />
            <h1 className="font-display text-lg font-bold">
              <span className="text-[#0B1D3A]">Raqeem</span>
              <span className="text-[#C5A880] text-sm">OS</span>
            </h1>
          </div>

          <div className="mb-6 text-center">
            <h2 className="font-display text-[22px] font-bold text-[#0B1D3A]">من أنت؟</h2>
            <p className="mt-1 text-xs text-slate-500">اختر اسمك للمتابعة</p>
            {overdueCount > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-danger/30 bg-danger/10 px-3 py-1 text-xs font-semibold text-danger"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-danger animate-pulse"></span>
                {overdueCount} طلبات متأخرة
              </motion.div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            {options.map((w) => {
              const isOwner = w.role === 'owner';
              return (
                <motion.button
                  key={w.id}
                  type="button"
                  onClick={() => handleCardClick(w)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.98 }}
                  className={`group relative flex flex-col items-center gap-2 rounded-2xl border bg-white p-4 transition-all hover:shadow-lg
                    ${isOwner ? 'border-[#C5A880]/50 shadow-[0_2px_12px_rgba(197,168,128,0.15)]' : 'border-slate-200 hover:border-[#C5A880]'}
                  `}
                >
                  {isOwner && (
                    <span className="absolute -top-2 -right-2 rounded-full bg-gradient-to-br from-[#C5A880] to-[#9c7c4a] px-2 py-0.5 text-[10px] font-bold text-[#0B1D3A] shadow">★ مالك</span>
                  )}
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#0B1D3A] text-lg font-bold text-[#C5A880]">
                    {initials(w.name)}
                  </span>
                  <span className="truncate text-sm font-semibold text-[#0B1D3A]">{w.name}</span>
                  <span className="truncate text-[11px] text-slate-400">{w.roleLabel}</span>
                </motion.button>
              );
            })}

            {/* كارت رمادي مقفول - يطلع بس إذا ماكو حساب مصمم حقيقي بعد.
                مو زر، بلا onClick، حتى محد يحاول يفعّله من هذا المكان. */}
            {!hasDesigner && (
              <div className="flex cursor-not-allowed flex-col items-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 opacity-70">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-200 text-xl text-slate-400">🔒</span>
                <span className="text-sm font-semibold text-slate-500">مصمم</span>
                <span className="text-center text-[11px] text-slate-400">ينشئه المالك من الإعدادات</span>
              </div>
            )}

            {!hasCashier && (
              <div className="flex cursor-not-allowed flex-col items-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 opacity-70">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-200 text-xl text-slate-400">🔒</span>
                <span className="text-sm font-semibold text-slate-500">كاشير</span>
                <span className="text-center text-[11px] text-slate-400">ينشئه المالك من الإعدادات</span>
              </div>
            )}
          </div>

          <div className="mt-5 rounded-xl border border-gold/30 bg-gold/10 px-4 py-3 text-center text-[11px] text-[#9c7c4a]">
            🔐 لإضافة موظف جديد: سجل دخول كمالك ← الإعدادات ← الموظفون والصلاحيات ← + إضافة موظف
          </div>

          <p className="mt-6 text-center text-[11px] text-slate-400">
            RaqeemOS v2.0.0 • مطبعتك.. بأرقام
          </p>
        </div>
      </div>

      {/* مودال الـ PIN */}
      <AnimatePresence>
        {showPinModal && selectedUser && (
          <PinGateModal
            user={selectedUser}
            onClose={() => setShowPinModal(false)}
            onSuccess={handlePinSuccess}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
