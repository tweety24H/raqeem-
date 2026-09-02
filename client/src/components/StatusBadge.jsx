const STATUS_STYLES = {
  'جديد': 'bg-slate-200 text-slate-700',
  'قيد التصميم': 'bg-indigo-100 text-indigo-700',
  'قيد الطباعة': 'bg-amber-100 text-amber-700',
  'جاهز للتسليم': 'bg-emerald-100 text-emerald-700',
  'تم التسليم': 'bg-slate-800 text-white',
};

export default function StatusBadge({ status }) {
  return <span className={`badge ${STATUS_STYLES[status] || 'bg-slate-200 text-slate-700'}`}>{status}</span>;
}
