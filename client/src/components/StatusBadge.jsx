import { useLanguage } from '../context/LanguageContext';

export const STATUSES = ['جديد', 'قيد التصميم', 'قيد الطباعة', 'جاهز للتسليم', 'تم التسليم'];

// ألوان الحالة: جديد=أزرق، قيد التصميم/الطباعة=أصفر-برتقالي (قيد التنفيذ)، جاهز للتسليم=أخضر، تم التسليم=رمادي
export const STATUS_STYLES = {
  'جديد': 'bg-blue-100 text-blue-700',
  'قيد التصميم': 'bg-amber-100 text-amber-700',
  'قيد الطباعة': 'bg-orange-100 text-orange-700',
  'جاهز للتسليم': 'bg-emerald-100 text-emerald-700',
  'تم التسليم': 'bg-slate-200 text-slate-600',
};

export const STATUS_SOLID = {
  'جديد': 'bg-blue-600 text-white',
  'قيد التصميم': 'bg-amber-500 text-white',
  'قيد الطباعة': 'bg-orange-500 text-white',
  'جاهز للتسليم': 'bg-emerald-600 text-white',
  'تم التسليم': 'bg-slate-600 text-white',
};

export default function StatusBadge({ status }) {
  const { t } = useLanguage();
  return (
    <span className={`badge ${STATUS_STYLES[status] || 'bg-slate-200 text-slate-700'} dark:ring-1 dark:ring-white/10`}>
      {t(`status.${status}`)}
    </span>
  );
}
