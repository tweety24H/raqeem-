import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { formatIQD, formatDate } from '../utils/format';
import { useTheme } from '../context/ThemeContext';

const NILI = '#0B1D3A';
const NILI_LIGHT = '#132A50';
const DANGER = '#EF4444';

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  const revenue = payload.find((p) => p.dataKey === 'revenue')?.value || 0;
  const expenses = payload.find((p) => p.dataKey === 'expenses')?.value || 0;
  return (
    <div className="rounded-lg bg-slate-800 px-3 py-2 text-[11px] text-white shadow-lg" dir="rtl">
      <div className="mb-1 font-semibold">{formatDate(label)}</div>
      <div>إيراد: {formatIQD(revenue)}</div>
      <div>مصاريف: {formatIQD(expenses)}</div>
    </div>
  );
}

// رسم بياني حقيقي بـ recharts (tooltip تفاعلي + أنيميشن انتقال ناعم عند تغيّر
// البيانات) بدل الأعمدة اليدوية القديمة المبنية بـ<div> خام.
export default function RevenueChart({ data }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  if (!data || data.length === 0) return <div className="text-sm text-slate-400">لا توجد بيانات</div>;

  return (
    <div>
      <div className="mb-3 flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-nili" /> الإيراد
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-danger" /> المصاريف
        </span>
      </div>
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }} barGap={1}>
          <CartesianGrid vertical={false} stroke={isDark ? 'rgba(255,255,255,0.08)' : '#f1f5f9'} />
          <XAxis
            dataKey="date"
            tickFormatter={(d) => formatDate(d)}
            tick={{ fontSize: 10, fill: isDark ? '#64748b' : '#94a3b8' }}
            axisLine={false}
            tickLine={false}
            minTickGap={24}
          />
          <YAxis hide domain={[0, 'dataMax']} />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: isDark ? 'rgba(255,255,255,0.04)' : '#f8fafc' }} />
          <Bar dataKey="revenue" fill={isDark ? NILI_LIGHT : NILI} radius={[3, 3, 0, 0]} maxBarSize={14} isAnimationActive animationDuration={400} />
          <Bar dataKey="expenses" fill={DANGER} radius={[3, 3, 0, 0]} maxBarSize={14} isAnimationActive animationDuration={400} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
