import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import api from '../api/client';

const AuthContext = createContext(null);

// بعد ١٥ دقيقة بدون أي حركة (فأرة، لوحة مفاتيح، لمس)، نرجع المستخدم
// لشاشة القفل بدل ما نخليه مفتوح للأبد على جهاز مطبعة مشترك بين الموظفين.
const IDLE_LOCK_MS = 15 * 60 * 1000;
const IDLE_EVENTS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'wheel'];

export function AuthProvider({ children }) {
  const [worker, setWorker] = useState(() => {
    const raw = localStorage.getItem('raqeem_worker');
    return raw ? JSON.parse(raw) : null;
  });

  // locked = "عندنا جلسة صالحة، بس الشاشة مقفولة لازم يدخل رمز PIN من جديد
  // لايفتحها" — هذا غير تسجيل الخروج الكامل (worker يضل محفوظ بالـ localStorage).
  const [locked, setLocked] = useState(false);
  const idleTimerRef = useRef(null);

  const login = useCallback(async (pin) => {
    const res = await api.post('/auth/login', { pin });
    localStorage.setItem('raqeem_token', res.data.token);
    localStorage.setItem('raqeem_worker', JSON.stringify(res.data.worker));
    setWorker(res.data.worker);
    return res.data.worker;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('raqeem_token');
    localStorage.removeItem('raqeem_worker');
    setWorker(null);
    setLocked(false);
  }, []);

  // يفتح شاشة القفل يدويًا لو احتجنا (مثلاً زر "قفل الشاشة" بالمستقبل)
  const lock = useCallback(() => {
    setLocked(true);
  }, []);

  // يفكّ القفل بعد ما المستخدم يدخل رمز PIN الصحيح من جديد بشاشة القفل
  const unlock = useCallback(() => {
    setLocked(false);
  }, []);

  // Task 7: refresh permissions from the server once on load, in case an
  // owner changed this worker's permissions since their last login (the JWT
  // itself doesn't carry permissions, so localStorage can otherwise go stale).
  useEffect(() => {
    if (!worker) return;
    api
      .get('/auth/me')
      .then((res) => {
        const next = { ...worker, permissions: res.data.worker.permissions };
        localStorage.setItem('raqeem_worker', JSON.stringify(next));
        setWorker(next);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // مراقبة الخمول: نشتغل بس اذا عدنا worker مسجل دخول وماكو قفل حالي — لو
  // الشاشة مقفولة أصلاً ما داعي نراقب لأنها مقفولة فعلاً.
  useEffect(() => {
    if (!worker || locked) return undefined;

    function resetTimer() {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      idleTimerRef.current = setTimeout(() => setLocked(true), IDLE_LOCK_MS);
    }

    resetTimer();
    IDLE_EVENTS.forEach((evt) => window.addEventListener(evt, resetTimer, { passive: true }));

    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      IDLE_EVENTS.forEach((evt) => window.removeEventListener(evt, resetTimer));
    };
  }, [worker, locked]);

  const isOwner = worker?.role === 'owner';

  // hasPermission(slug) — the owner passes every check implicitly, matching
  // the server's checkPermission() behavior.
  const hasPermission = useCallback(
    (slug) => {
      if (!worker) return false;
      if (isOwner) return true;
      return Array.isArray(worker.permissions) && worker.permissions.includes(slug);
    },
    [worker, isOwner]
  );

  return (
    <AuthContext.Provider
      value={{ worker, login, logout, isOwner, hasPermission, locked, lock, unlock }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
