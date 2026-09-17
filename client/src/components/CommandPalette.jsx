import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { NAV_ITEMS } from '../config/nav';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

// Ctrl+K command palette — a simple filterable list of the app's own pages
// (NAV_ITEMS, the same source of truth as the sidebar), gated by the same
// ownerOnly/permission rules so it never surfaces a link the worker can't
// actually open.
export default function CommandPalette({ open, onClose }) {
  const navigate = useNavigate();
  const { isOwner, hasPermission } = useAuth();
  const { t } = useLanguage();
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef(null);

  const items = useMemo(
    () => NAV_ITEMS.filter((item) => (!item.ownerOnly || isOwner) && (!item.permission || isOwner || hasPermission(item.permission))),
    [isOwner, hasPermission]
  );

  const results = useMemo(() => {
    const q = query.trim();
    if (!q) return items;
    return items.filter((item) => t(item.key).includes(q));
  }, [items, query, t]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  function select(item) {
    if (!item) return;
    navigate(item.to);
    onClose();
  }

  function handleKeyDown(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      select(results[activeIndex]);
    } else if (e.key === 'Escape') {
      onClose();
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-start justify-center bg-black/40 p-4 pt-[15vh]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
        >
          <motion.div
            className="w-full max-w-lg overflow-hidden rounded-xl bg-white shadow-2xl dark:border dark:border-slate-800 dark:bg-slate-900"
            initial={{ opacity: 0, scale: 0.96, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -8 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
          >
            <input
              ref={inputRef}
              className="w-full border-b border-slate-200 px-4 py-3 text-sm outline-none dark:border-white/10 dark:bg-slate-900 dark:text-white"
              placeholder={t('commandPalette.placeholder')}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <div className="max-h-80 overflow-y-auto p-2">
              {results.map((item, i) => (
                <button
                  key={item.to}
                  type="button"
                  onClick={() => select(item)}
                  onMouseEnter={() => setActiveIndex(i)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-right text-sm transition ${
                    i === activeIndex ? 'bg-nili text-white' : 'text-slate-700 dark:text-slate-200'
                  }`}
                >
                  <span className="text-base">{item.icon}</span>
                  <span>{t(item.key)}</span>
                </button>
              ))}
              {results.length === 0 && (
                <div className="px-3 py-6 text-center text-sm text-slate-400 dark:text-slate-500">
                  {t('commandPalette.noResults')}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
