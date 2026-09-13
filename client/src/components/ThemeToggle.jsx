import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const { t } = useLanguage();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 dark:border-slate-800 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
    >
      {theme === 'dark' ? (
        <>
          <Moon className="h-3.5 w-3.5" /> {t('theme.dark')}
        </>
      ) : (
        <>
          <Sun className="h-3.5 w-3.5" /> {t('theme.light')}
        </>
      )}
    </button>
  );
}
