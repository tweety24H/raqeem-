import { useEffect, useState } from 'react';
import api from '../api/client';
import PageHeader from '../components/PageHeader';
import { formatIQD } from '../utils/format';

export default function Reports() {
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

  return (
    <div className="p-6">
      <PageHeader title="التقارير" subtitle="الربح الحقيقي، الهدر، وأداء العاملين" />

      <div className="mb-6 flex gap-3">
        <div>
          <label className="label">من</label>
          <input className="input" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <label className="label">إلى</label>
          <input className="input" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
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
