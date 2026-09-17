import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import api from '../api/client';

const POLL_MS = 60_000;
const DashboardSummaryContext = createContext(null);

// نخزّن عدد الطلبات المتأخرة فعليًا (due_date فات وماكو تسليم بعد) بالـ
// localStorage كل مرة نجيب فيها ملخص الداشبورد — هيج شاشة تسجيل الدخول
// (قبل ما يكون عدنا Bearer token أصلاً) تكدر تعرض شارة "كذا طلب متأخر" من
// آخر قراءة معروفة، بدون ما تحتاج تسوي طلب API محمي وهي بعدها ما دخلت.
const OVERDUE_CACHE_KEY = 'raqeem_overdue_count';

function cacheOverdueCount(summary) {
  try {
    const todayStr = new Date().toISOString().slice(0, 10);
    const overdue = (summary.dueSoon || []).filter(
      (o) => o.due_date && String(o.due_date).slice(0, 10) < todayStr
    ).length;
    localStorage.setItem(OVERDUE_CACHE_KEY, String(overdue));
  } catch {
    // best-effort بس — ماكو مشكلة لو فشل التخزين (خصوصية متصفح، وضع خاص...)
  }
}

// Single shared fetcher for GET /dashboard/summary, mounted once in Layout
// so the header's NotificationsBell and the Dashboard page read the exact
// same data (and the same 60s poll) instead of racing two independent
// requests that can briefly disagree.
export function DashboardSummaryProvider({ children }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const timerRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/dashboard/summary');
      setSummary(res.data);
      cacheOverdueCount(res.data);
      setError(null);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    timerRef.current = setInterval(load, POLL_MS);
    return () => clearInterval(timerRef.current);
  }, [load]);

  return (
    <DashboardSummaryContext.Provider value={{ summary, loading, error, refresh: load }}>
      {children}
    </DashboardSummaryContext.Provider>
  );
}

export function useDashboardSummary() {
  const ctx = useContext(DashboardSummaryContext);
  if (!ctx) throw new Error('useDashboardSummary must be used within DashboardSummaryProvider');
  return ctx;
}
