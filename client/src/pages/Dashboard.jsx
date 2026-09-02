import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';

const FAKE_TODAY = [
  { time: '09:30', label: 'شركة النور — بزنس كارد', fake: true },
  { time: '11:00', label: 'مكتبة الرافدين — بروشور', fake: true },
  { time: '01:15', label: 'مطعم بغداد — لافتة', fake: true },
];

const FAKE_PRINTING = [
  { label: 'شركة النور — بزنس كارد', progress: 72, fake: true },
  { label: 'مكتبة الرافدين — بروشور', progress: 45, fake: true },
  { label: 'مطعم بغداد — لافتة', progress: 90, fake: true },
];

const FAKE_READY = [
  { label: 'شركة الأمل التجارية', sub: 'فواتير × 200', fake: true },
  { label: 'صيدلية الشفاء', sub: 'ملصقات × 50', fake: true },
];

function formatTime(dateStr) {
  const d = new Date((dateStr || '').replace(' ', 'T'));
  if (Number.isNaN(d.getTime())) return '--:--';
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }).replace(/\s?[AP]M/i, '');
}

function progressFor(order) {
  if (!order.due_date) return 50;
  const start = new Date((order.created_at || '').replace(' ', 'T')).getTime();
  const due = new Date((order.due_date || '').replace(' ', 'T')).getTime();
  const now = Date.now();
  if (Number.isNaN(start) || Number.isNaN(due) || due <= start) return 50;
  const pct = Math.round(((now - start) / (due - start)) * 100);
  return Math.min(95, Math.max(5, pct));
}

export default function Dashboard() {
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    api
      .get('/orders')
      .then((res) => setOrders(res.data.orders || []))
      .catch(() => setOrders([]));
    api
      .get('/customers')
      .then((res) => setCustomers(res.data.customers || []))
      .catch(() => setCustomers([]));
  }, []);

  useEffect(() => {
    function onKeyDown(e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const today = new Date().toISOString().slice(0, 10);

  const todayOrders = useMemo(
    () =>
      orders
        .filter((o) => (o.created_at || '').slice(0, 10) === today)
        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
        .slice(0, 3),
    [orders, today]
  );

  const printingOrders = useMemo(
    () => orders.filter((o) => o.status === 'قيد الطباعة').slice(0, 3),
    [orders]
  );

  const readyOrders = useMemo(
    () => orders.filter((o) => o.status === 'جاهز للتسليم').slice(0, 3),
    [orders]
  );

  const searchResults = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return null;
    const matchedOrders = orders
      .filter(
        (o) =>
          o.order_number?.toLowerCase().includes(term) ||
          o.customer_name?.toLowerCase().includes(term)
      )
      .slice(0, 5)
      .map((o) => ({ type: 'order', id: o.id, label: `${o.order_number} — ${o.customer_name}` }));
    const matchedCustomers = customers
      .filter(
        (c) => c.name?.toLowerCase().includes(term) || c.phone?.toLowerCase().includes(term)
      )
      .slice(0, 5)
      .map((c) => ({ type: 'customer', id: c.id, label: c.name }));
    return [...matchedOrders, ...matchedCustomers];
  }, [search, orders, customers]);

  const pills = [
    { label: 'إصدار فاتورة', icon: '🧾', to: '/orders/new' },
    { label: 'واتساب جماعي', icon: '💬', to: '/customers' },
    { label: 'تقرير يومي', icon: '📊', to: '/reports' },
    { label: 'طلب جديد +', icon: '➕', to: '/orders/new' },
  ];

  return (
    <div dir="rtl" style={{ fontFamily: "'Tajawal', sans-serif" }} className="relative min-h-screen overflow-hidden bg-[#fcfcfd]">
      <div className="pointer-events-none absolute -top-20 left-[-6rem] h-72 w-72 rounded-full bg-violet-100/40 blur-[80px]" />
      <div className="pointer-events-none absolute -top-20 right-[-6rem] h-72 w-72 rounded-full bg-amber-100/30 blur-[80px]" />

      <div className="relative mx-auto max-w-6xl px-6 py-14">
        <div className="mb-10 text-center">
          <span className="inline-block rounded-full border border-slate-200 bg-white/60 px-3 py-1 text-xs tracking-widest text-slate-500">
            COMMAND STUDIO • V2
          </span>
          <h1 className="mt-4 text-4xl font-extrabold text-slate-900">اكتب. نفذ. انجز.</h1>
          <p className="mt-2 text-3xl text-gray-400">بدون ما تلمس الماوس</p>
        </div>

        <div className="relative mx-auto max-w-2xl">
          <div className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-[0_16px_48px_rgba(0,0,0,0.06)]">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-black">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <circle cx="11" cy="11" r="7" />
                <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
              </svg>
            </div>
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث عن طلب، زبون، او نفذ اجراء..."
              className="flex-1 bg-transparent text-sm text-slate-800 placeholder:text-gray-400 focus:outline-none"
            />
            <kbd className="shrink-0 rounded-md bg-slate-100 px-2 py-1 text-xs font-mono text-slate-500">⌘K</kbd>
          </div>

          {searchResults && (
            <div className="absolute inset-x-0 top-full z-20 mt-2 max-h-80 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg">
              {searchResults.length === 0 && (
                <p className="p-4 text-sm text-slate-400">لا توجد نتائج</p>
              )}
              {searchResults.map((r) => (
                <Link
                  key={`${r.type}-${r.id}`}
                  to={r.type === 'order' ? `/orders/${r.id}` : `/customers/${r.id}`}
                  className="flex items-center gap-2 border-b border-slate-100 px-4 py-3 text-sm text-slate-700 last:border-0 hover:bg-violet-50"
                >
                  <span className="text-xs text-slate-400">{r.type === 'order' ? 'طلب' : 'زبون'}</span>
                  {r.label}
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          {pills.map((p) => (
            <Link
              key={p.label}
              to={p.to}
              className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-violet-50"
            >
              <span>{p.icon}</span>
              {p.label}
            </Link>
          ))}
        </div>

        <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <TodayColumn orders={todayOrders} />
          <PrintingColumn orders={printingOrders} />
          <ReadyColumn orders={readyOrders} />
        </div>
      </div>
    </div>
  );
}

function TodayColumn({ orders }) {
  const items =
    orders.length > 0
      ? orders.map((o) => ({
          time: formatTime(o.created_at),
          label: `${o.customer_name} — ${o.item_summary || o.order_number}`,
          fake: false,
        }))
      : FAKE_TODAY;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="mb-5 flex items-center gap-2 text-sm font-bold text-slate-800">
        <span>🕐</span>
        اليوم
      </div>
      <div className="relative space-y-5 pr-4">
        <div className="absolute bottom-1 right-1 top-1 w-px bg-slate-200" />
        {items.map((it, i) => (
          <div key={i} className="relative">
            <span className="absolute right-[-1.15rem] top-1 h-2 w-2 -translate-x-1/2 rounded-full bg-violet-500" />
            <p className="text-xs text-slate-400">{it.time}</p>
            <p className="mt-0.5 text-sm font-medium text-slate-800">{it.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function PrintingColumn({ orders }) {
  const items =
    orders.length > 0
      ? orders.map((o) => ({
          label: `${o.customer_name} — ${o.item_summary || o.order_number}`,
          progress: progressFor(o),
          fake: false,
        }))
      : FAKE_PRINTING;

  return (
    <div className="rounded-2xl bg-black p-5 text-white">
      <div className="mb-5 text-sm font-bold">قيد التنفيذ</div>
      <div className="space-y-4">
        {items.map((it, i) => (
          <div key={i}>
            <div className="mb-1.5 flex items-center justify-between text-xs">
              <span className="text-white/90">{it.label}</span>
              <span className="text-white/50">{it.progress}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-l from-violet-500 to-orange-400"
                style={{ width: `${it.progress}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReadyColumn({ orders }) {
  const items =
    orders.length > 0
      ? orders.map((o) => ({
          id: o.id,
          label: o.customer_name,
          sub: o.item_summary || o.order_number,
          fake: false,
        }))
      : FAKE_READY;

  return (
    <div className="space-y-3">
      <div className="mb-2 text-sm font-bold text-slate-800">جاهز للتسليم</div>
      {items.map((it, i) => (
        <div
          key={i}
          className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4"
        >
          <div>
            <p className="text-sm font-medium text-slate-800">{it.label}</p>
            <p className="text-xs text-slate-400">{it.sub}</p>
          </div>
          {it.fake ? (
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-400">
              ←
            </span>
          ) : (
            <Link
              to={`/orders/${it.id}`}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-black text-white hover:bg-slate-800"
            >
              ←
            </Link>
          )}
        </div>
      ))}
    </div>
  );
}
