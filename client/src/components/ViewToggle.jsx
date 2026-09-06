import { useEffect, useState } from 'react';
import { useLanguage } from '../context/LanguageContext';

export function useViewMode(storageKey, defaultMode = 'list') {
  const [mode, setMode] = useState(() => {
    try {
      return localStorage.getItem(storageKey) || defaultMode;
    } catch {
      return defaultMode;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, mode);
    } catch {
      /* ignore */
    }
  }, [storageKey, mode]);

  return [mode, setMode];
}

export default function ViewToggle({ mode, onChange }) {
  const { t } = useLanguage();
  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white p-1 shadow-sm dark:border-violet-500/20 dark:bg-white/5">
      <button
        type="button"
        onClick={() => onChange('grid')}
        className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
          mode === 'grid'
            ? 'bg-nili text-white'
            : 'text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10'
        }`}
      >
        <GridIcon />
        {t('view.grid')}
      </button>
      <button
        type="button"
        onClick={() => onChange('list')}
        className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
          mode === 'list'
            ? 'bg-nili text-white'
            : 'text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10'
        }`}
      >
        <ListIcon />
        {t('view.list')}
      </button>
    </div>
  );
}

function GridIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="18" x2="20" y2="18" />
    </svg>
  );
}
