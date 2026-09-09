import { useLanguage } from '../context/LanguageContext';

export default function LanguageToggle() {
  const { lang, setLang } = useLanguage();

  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white p-1 dark:border-slate-800 dark:bg-white/5">
      <button
        type="button"
        onClick={() => setLang('ar')}
        className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold transition ${
          lang === 'ar'
            ? 'bg-nili text-white'
            : 'text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10'
        }`}
      >
        🇮🇶 AR
      </button>
      <button
        type="button"
        onClick={() => setLang('en')}
        className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold transition ${
          lang === 'en'
            ? 'bg-nili text-white'
            : 'text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10'
        }`}
      >
        🇺🇸 EN
      </button>
    </div>
  );
}
