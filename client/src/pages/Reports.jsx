import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../api/client';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import RevenueChart from '../components/RevenueChart';
import { formatIQD, formatDate } from '../utils/format';
import { exportMultiSheetExcel } from '../utils/exportExcel';

const RANGES = [
  { key: 'today', label: 'اليوم' },
  { key: 'week', label: 'هذا الأسبوع' },
  { key: 'month', label: 'هذا الشهر' },
  { key: 'all', label: 'الكلي' },
];

export default function Reports() {
  const [tab, setTab] = useState('overview'); // overview | detailed

  return (
    <div className="p-6">
      <PageHeader title="التقارير" subtitle="نظرة عامة على أداء المطبعة وتحليلات مفصلة" />

      <div className="mb-6 flex gap-1 border-b border-slate-200">
        <TabButton active={tab === 'overview'} onClick={() => setTab('overview')}>
          نظرة عامة
        </TabButton>
        <TabButton active={tab === 'detailed'} onClick={() => setTab('detailed')}>
          تقارير تفصيلية
        </TabButton>
      </div>

      {tab === 'overview' ? <OverviewTab /> : <DetailedTab />}
    </div>
  );
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition ${
        active ? 'border-nili text-nili' : 'border-transparent text-slate-500 hover:text-slate-700'
      }`}
    >
      {children}
    </button>
  );
}

function OverviewTab() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [summaries, setSummaries] = useState(null); // { today, week, month, all }
  // Task 4: the Dashboard's "Today's Profits" tile links here with ?range=today
  // (already the default, but this also honors ?range=week/month/all if ever linked that way).
  const [activeRange, setActiveRange] = useState(() => {
    const r = searchParams.get('range');
    return RANGES.some((x) => x.key === r) ? r : 'today';
  });
  const [daily, setDaily] = useState(null);
  const [showAddExpense, setShowAddExpense] = useState(false);

  useEffect(() => {
    loadSummaries();
    loadDaily();
    if (searchParams.get('range')) setSearchParams({}, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadSummaries() {
    const results = await Promise.all(RANGES.map((r) => api.get('/reports/summary', { params: { range: r.key } })));
    const obj = {};
    RANGES.forEach((r, i) => {
      obj[r.key] = results[i].data;
    });
    setSummaries(obj);
  }

  async function loadDaily() {
    const res = await api.get('/reports/daily', { params: { days: 30 } });
    setDaily(res.data.days);
  }

  const active = summaries?.[activeRange];
  const activeLabel = RANGES.find((r) => r.key === activeRange)?.label;

  function exportOverview() {
    if (!active) return;
    exportMultiSheetExcel(`تقرير-${activeLabel}-${new Date().toISOString().slice(0, 10)}`, [
      {
        name: 'ملخص',
        rows: [
          {
            الفترة: activeLabel,
            'إجمالي الإيراد': active.totalRevenue,
            'صافي الربح': active.netProfit,
            'عدد الطلبات': active.totalOrders,
            'إجمالي الديون': active.totalDebts,
            'مخزون منخفض': active.lowStockCount,
          },
        ],
      },
      {
        name: 'أفضل الزبائن',
        rows: (active.topCustomers || []).map((c) => ({ الزبون: c.name, 'عدد الطلبات': c.ordersCount, الإيراد: c.revenue })),
      },
      {
        name: 'أكثر المواد استهلاكاً',
        rows: (active.topStockItems || []).map((s) => ({ الصنف: s.name, الكمية: s.usedQty, الوحدة: s.unit })),
      },
      {
        name: 'المصاريف',
        rows: (active.recentExpenses || []).map((e) => ({ التاريخ: e.date, السبب: e.reason || '', المبلغ: e.amount })),
      },
    ]);
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button type="button" onClick={exportOverview} disabled={!active} className="btn-secondary">
          📊 تصدير Excel ({activeLabel})
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {RANGES.map((r) => (
          <RangeCard
            key={r.key}
            label={r.label}
            data={summaries?.[r.key]}
            active={activeRange === r.key}
            onClick={() => setActiveRange(r.key)}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MiniStat label="إجمالي الديون المستحقة" value={active ? formatIQD(active.totalDebts) : '...'} tone="text-rose-600" />
        <MiniStat label="أصناف بمخزون منخفض" value={active ? `${active.lowStockCount} صنف` : '...'} tone="text-amber-600" />
        <MiniStat
          label={`صافي الربح (${activeLabel})`}
          value={active ? formatIQD(active.netProfit) : '...'}
          tone="text-emerald-600"
        />
      </div>

      <div className="card">
        <h2 className="mb-3 font-semibold text-slate-700">الإيراد والمصاريف — آخر 30 يومًا</h2>
        {daily ? <RevenueChart data={daily} /> : <div className="text-slate-400">جاري التحميل...</div>}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="card">
          <h2 className="mb-3 font-semibold text-slate-700">أفضل 5 زبائن ({activeLabel})</h2>
          <table className="w-full text-sm">
            <thead className="bg-slate-100 text-slate-600">
              <tr>
                <th className="px-3 py-2 text-right">الزبون</th>
                <th className="px-3 py-2 text-right">عدد الطلبات</th>
                <th className="px-3 py-2 text-right">الإيراد</th>
              </tr>
            </thead>
            <tbody>
              {(active?.topCustomers || []).map((c) => (
                <tr key={c.id} className="border-t border-slate-100">
                  <td className="px-3 py-2">
                    <Link to={`/customers/${c.id}`} className="text-nili hover:underline">
                      {c.name}
                    </Link>
                  </td>
                  <td className="px-3 py-2">{c.ordersCount}</td>
                  <td className="px-3 py-2 font-medium">{formatIQD(c.revenue)}</td>
                </tr>
              ))}
              {active && active.topCustomers.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-3 py-6 text-center text-slate-400">
                    لا توجد بيانات لهذه الفترة
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="card">
          <h2 className="mb-3 font-semibold text-slate-700">أكثر المواد استهلاكًا ({activeLabel})</h2>
          <table className="w-full text-sm">
            <thead className="bg-slate-100 text-slate-600">
              <tr>
                <th className="px-3 py-2 text-right">الصنف</th>
                <th className="px-3 py-2 text-right">الكمية المستهلكة</th>
              </tr>
            </thead>
            <tbody>
              {(active?.topStockItems || []).map((s) => (
                <tr key={s.id} className="border-t border-slate-100">
                  <td className="px-3 py-2">{s.name}</td>
                  <td className="px-3 py-2 font-medium">
                    {s.usedQty} {s.unit}
                  </td>
                </tr>
              ))}
              {active && active.topStockItems.length === 0 && (
                <tr>
                  <td colSpan={2} className="px-3 py-6 text-center text-slate-400">
                    لا توجد بيانات لهذه الفترة
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold text-slate-700">المصاريف الأخيرة ({activeLabel})</h2>
          <button className="btn-secondary" onClick={() => setShowAddExpense(true)}>
            + إضافة مصروف
          </button>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-slate-100 text-slate-600">
            <tr>
              <th className="px-3 py-2 text-right">التاريخ</th>
              <th className="px-3 py-2 text-right">السبب</th>
              <th className="px-3 py-2 text-right">المبلغ</th>
            </tr>
          </thead>
          <tbody>
            {(active?.recentExpenses || []).map((e) => (
              <tr key={e.id} className="border-t border-slate-100">
                <td className="px-3 py-2 text-slate-500">{formatDate(e.date)}</td>
                <td className="px-3 py-2">{e.reason || '-'}</td>
                <td className="px-3 py-2 font-medium text-rose-600">{formatIQD(e.amount)}</td>
              </tr>
            ))}
            {active && active.recentExpenses.length === 0 && (
              <tr>
                <td colSpan={3} className="px-3 py-6 text-center text-slate-400">
                  لا توجد مصاريف مسجلة لهذه الفترة
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showAddExpense && (
        <AddExpenseModal
          onClose={() => setShowAddExpense(false)}
          onSaved={() => {
            setShowAddExpense(false);
            loadSummaries();
            loadDaily();
          }}
        />
      )}
    </div>
  );
}

function RangeCard({ label, data, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-xl p-4 text-right shadow-sm transition ${
        active ? 'bg-nili text-white ring-2 ring-gold' : 'bg-white text-slate-700 hover:shadow-md'
      }`}
    >
      <div className={`text-sm ${active ? 'text-white/80' : 'text-slate-400'}`}>{label}</div>
      {data ? (
        <>
          <div className="mt-1 text-xl font-bold">{formatIQD(data.totalRevenue)}</div>
          <div className={`mt-1 text-xs ${active ? 'text-white/70' : 'text-slate-500'}`}>
            صافي {formatIQD(data.netProfit)} · {data.totalOrders} طلب
          </div>
        </>
      ) : (
        <div className="mt-1 text-sm opacity-60">جاري التحميل...</div>
      )}
    </button>
  );
}

function MiniStat({ label, value, tone }) {
  return (
    <div className="card">
      <div className="text-xs text-slate-400">{label}</div>
      <div className={`mt-1 text-lg font-bold ${tone}`}>{value}</div>
    </div>
  );
}

function AddExpenseModal({ onClose, onSaved }) {
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [date, setDate] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await api.post('/expenses', { amount, reason, date: date || undefined });
      onSaved();
    } catch (err) {
      setError(err.response?.data?.error || 'فشل حفظ المصروف');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open title="إضافة مصروف" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        {error && <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</div>}
        <div>
          <label className="label">المبلغ (د.ع)</label>
          <input
            className="input"
            type="number"
            step="any"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
        <div>
          <label className="label">السبب</label>
          <input className="input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="إيجار، كهرباء، شراء حبر..." />
        </div>
        <div>
          <label className="label">التاريخ</label>
          <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose}>
            إلغاء
          </button>
          <button disabled={saving} className="btn-primary">
            حفظ
          </button>
        </div>
      </form>
    </Modal>
  );
}

function DetailedTab() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [profit, setProfit] = useState(null);
  const [perf, setPerf] = useState(null);
  const [waste, setWaste] = useState(null);

  useEffect(() => {
    load();
  }, [from, to]);

  async function load() {
    const params = { from: from || undefined, to: to || undefined };
    const [p, w, r] = await Promise.all([
      api.get('/reports/profit', { params }),
      api.get('/stock/reports/waste', { params }),
      api.get('/reports/worker-performance', { params }),
    ]);
    setProfit(p.data);
    setWaste(w.data);
    setPerf(r.data);
  }

  function exportDetailed() {
    exportMultiSheetExcel(`تقرير-تفصيلي-${new Date().toISOString().slice(0, 10)}`, [
      {
        name: 'الربح حسب الخدمة',
        rows: (profit?.byService || []).map((s) => ({
          الخدمة: s.service_name,
          الكمية: s.quantity,
          الإيراد: s.revenue,
          التكلفة: s.cost,
          'صافي الربح': s.profit,
        })),
      },
      {
        name: 'الهدر',
        rows: (waste?.rows || []).map((r) => ({
          الصنف: r.item_name,
          الكمية: r.quantity,
          الوحدة: r.unit,
          السبب: r.reason || '',
          التكلفة: r.cost_lost,
          العامل: r.worker_name || '',
        })),
      },
      {
        name: 'أداء العاملين',
        rows: (perf?.workers || []).map((w) => ({
          العامل: w.name,
          'عدد الطلبات': w.orders_count,
          المبيعات: w.revenue,
          'حالات التالف': w.damage_events,
          'تكلفة التالف': w.damage_cost,
        })),
      },
    ]);
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div className="flex gap-3">
          <div>
            <label className="label">من</label>
            <input className="input" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <label className="label">إلى</label>
            <input className="input" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        </div>
        <button type="button" onClick={exportDetailed} className="btn-secondary">
          📊 تصدير Excel
        </button>
      </div>

      {profit && (
        <div className="card mb-6">
          <h2 className="mb-3 font-semibold text-slate-700">الربح الحقيقي حسب الخدمة</h2>
          <div className="mb-3 grid grid-cols-3 gap-4">
            <Stat label="الإيراد" value={formatIQD(profit.totals.revenue)} tone="text-slate-700" />
            <Stat label="التكلفة" value={formatIQD(profit.totals.cost)} tone="text-rose-600" />
            <Stat label="صافي الربح" value={formatIQD(profit.totals.profit)} tone="text-emerald-600" />
          </div>
          <table className="w-full text-sm">
            <thead className="bg-slate-100 text-slate-600">
              <tr>
                <th className="px-3 py-2 text-right">الخدمة</th>
                <th className="px-3 py-2 text-right">الكمية</th>
                <th className="px-3 py-2 text-right">الإيراد</th>
                <th className="px-3 py-2 text-right">التكلفة</th>
                <th className="px-3 py-2 text-right">صافي الربح</th>
              </tr>
            </thead>
            <tbody>
              {profit.byService.map((s, i) => (
                <tr key={i} className="border-t border-slate-100">
                  <td className="px-3 py-2">{s.service_name}</td>
                  <td className="px-3 py-2">{s.quantity}</td>
                  <td className="px-3 py-2">{formatIQD(s.revenue)}</td>
                  <td className="px-3 py-2 text-rose-500">{formatIQD(s.cost)}</td>
                  <td className="px-3 py-2 font-medium text-emerald-600">{formatIQD(s.profit)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {waste && (
        <div className="card mb-6">
          <h2 className="mb-3 font-semibold text-slate-700">تقرير الهدر (التالف)</h2>
          <div className="mb-3">
            <Stat label="إجمالي تكلفة التالف" value={formatIQD(waste.totalCost)} tone="text-rose-600" />
          </div>
          <table className="w-full text-sm">
            <thead className="bg-slate-100 text-slate-600">
              <tr>
                <th className="px-3 py-2 text-right">الصنف</th>
                <th className="px-3 py-2 text-right">الكمية</th>
                <th className="px-3 py-2 text-right">السبب</th>
                <th className="px-3 py-2 text-right">التكلفة</th>
                <th className="px-3 py-2 text-right">العامل</th>
              </tr>
            </thead>
            <tbody>
              {waste.rows.map((r) => (
                <tr key={r.id} className="border-t border-slate-100">
                  <td className="px-3 py-2">{r.item_name}</td>
                  <td className="px-3 py-2">
                    {r.quantity} {r.unit}
                  </td>
                  <td className="px-3 py-2 text-slate-500">{r.reason || '-'}</td>
                  <td className="px-3 py-2 text-rose-500">{formatIQD(r.cost_lost)}</td>
                  <td className="px-3 py-2 text-slate-500">{r.worker_name || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {perf && (
        <div className="card">
          <h2 className="mb-3 font-semibold text-slate-700">أداء العاملين</h2>
          <table className="w-full text-sm">
            <thead className="bg-slate-100 text-slate-600">
              <tr>
                <th className="px-3 py-2 text-right">العامل</th>
                <th className="px-3 py-2 text-right">عدد الطلبات</th>
                <th className="px-3 py-2 text-right">إجمالي المبيعات</th>
                <th className="px-3 py-2 text-right">حالات التالف</th>
                <th className="px-3 py-2 text-right">تكلفة التالف المسبب</th>
              </tr>
            </thead>
            <tbody>
              {perf.workers.map((w) => (
                <tr key={w.id} className="border-t border-slate-100">
                  <td className="px-3 py-2 font-medium">{w.name}</td>
                  <td className="px-3 py-2">{w.orders_count}</td>
                  <td className="px-3 py-2">{formatIQD(w.revenue)}</td>
                  <td className="px-3 py-2">{w.damage_events}</td>
                  <td className="px-3 py-2 text-rose-500">{formatIQD(w.damage_cost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, tone }) {
  return (
    <div>
      <div className="text-xs text-slate-400">{label}</div>
      <div className={`text-lg font-bold ${tone}`}>{value}</div>
    </div>
  );
}
