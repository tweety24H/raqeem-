import { useLanguage } from '../context/LanguageContext';

export const STATUSES = ['جديد', 'قيد التصميم', 'قيد الطباعة', 'جاهز للتسليم', 'تم التسليم'];

// ألوان الحالة: جديد (قيد الانتظار)=ذهبي، تم التسليم (مكتمل)=نيلي، الباقي=رمادي محايد
export const STATUS_STYLES = {
  'جديد': 'bg-gold/20 text-gold-dark dark:bg-gold/15 dark:text-gold',
  'قيد التصميم': 'bg-slate-200 text-slate-600 dark:bg-white/10 dark:text-slate-300',
  'قيد الطباعة': 'bg-slate-200 text-slate-600 dark:bg-white/10 dark:text-slate-300',
  'جاهز للتسليم': 'bg-slate-200 text-slate-600 dark:bg-white/10 dark:text-slate-300',
  'تم التسليم': 'bg-nili/15 text-nili dark:bg-nili-light/20 dark:text-nili-light',
};

export const STATUS_SOLID = {
  'جديد': 'bg-gold text-nili-dark',
  'قيد التصميم': 'bg-slate-500 text-white',
  'قيد الطباعة': 'bg-slate-500 text-white',
  'جاهز للتسليم': 'bg-slate-500 text-white',
  'تم التسليم': 'bg-nili text-white',
};

export default function StatusBadge({ status }) {
  const { t } = useLanguage();
  return (
    <span className={`badge ${STATUS_STYLES[status] || 'bg-slate-200 text-slate-700'} dark:ring-1 dark:ring-white/10`}>
      {t(`status.${status}`)}
    </span>
  );
}
