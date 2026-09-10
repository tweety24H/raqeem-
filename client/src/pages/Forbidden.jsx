import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';

// Task 7: shown whenever a worker without the required permission tries to
// reach a protected page or action.
export default function Forbidden() {
  const { t } = useLanguage();
  return (
    <div className="flex h-full min-h-[70vh] flex-col items-center justify-center gap-4 p-6 text-center">
      <span className="text-5xl">🚫</span>
      <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">
        ليس لديك صلاحية للوصول لهذه الصفحة
      </h1>
      <p className="max-w-md text-sm text-slate-500 dark:text-slate-400">{t('forbidden.subtitle')}</p>
      <Link to="/dashboard" className="btn-primary">
        {t('forbidden.backHome')}
      </Link>
    </div>
  );
}
