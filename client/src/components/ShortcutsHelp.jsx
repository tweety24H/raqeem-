import Modal from './Modal';
import { useLanguage } from '../context/LanguageContext';

const SHORTCUTS = [
  { keys: 'Ctrl + K', labelKey: 'commandPalette.title' },
  { keys: 'Ctrl + N', labelKey: 'shortcuts.newOrder' },
  { keys: 'Ctrl + B', labelKey: 'shortcuts.toggleSidebar' },
  { keys: '?', labelKey: 'shortcuts.showHelp' },
];

export default function ShortcutsHelp({ open, onClose }) {
  const { t } = useLanguage();
  return (
    <Modal open={open} onClose={onClose} title={t('shortcuts.title')}>
      <div className="space-y-2">
        {SHORTCUTS.map((s) => (
          <div key={s.keys} className="flex items-center justify-between text-sm">
            <span className="text-slate-600 dark:text-slate-300">{t(s.labelKey)}</span>
            <kbd className="rounded-md border border-slate-300 bg-slate-50 px-2 py-1 font-mono text-xs text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
              {s.keys}
            </kbd>
          </div>
        ))}
      </div>
    </Modal>
  );
}
