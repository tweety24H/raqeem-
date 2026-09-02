import { formatIQD, formatDate } from '../utils/format';

// رسم بياني بسيط بالأعمدة (بدون مكتبة خارجية) يقارن الإيراد بالمصاريف يوميًا
export default function RevenueChart({ data }) {
  if (!data || data.length === 0) return <div className="text-sm text-slate-400">لا توجد بيانات</div>;

  const max = Math.max(1, ...data.map((d) => Math.max(d.revenue, d.expenses)));

  return (
    <div>
      <div className="mb-3 flex items-center gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-nili" /> الإيراد
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-400" /> المصاريف
        </span>
      </div>
      <div className="flex h-40 items-end gap-[3px]">
        {data.map((d) => (
          <div key={d.date} className="group relative flex h-full flex-1 items-end gap-[1px]">
            <div
              className="flex-1 rounded-t bg-nili transition-opacity group-hover:opacity-80"
              style={{ height: `${(d.revenue / max) * 100}%`, minHeight: d.revenue > 0 ? '2px' : 0 }}
            />
            <div
              className="flex-1 rounded-t bg-rose-400 transition-opacity group-hover:opacity-80"
              style={{ height: `${(d.expenses / max) * 100}%`, minHeight: d.expenses > 0 ? '2px' : 0 }}
            />
            <div className="pointer-events-none absolute bottom-full z-10 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-slate-800 px-2 py-1 text-[11px] text-white group-hover:block ltr:left-1/2 rtl:right-1/2">
              <div className="font-semibold">{formatDate(d.date)}</div>
              <div>إيراد: {formatIQD(d.revenue)}</div>
              <div>مصاريف: {formatIQD(d.expenses)}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[11px] text-slate-400">
        <span>{formatDate(data[0]?.date)}</span>
        <span>{formatDate(data[data.length - 1]?.date)}</span>
      </div>
    </div>
  );
}
