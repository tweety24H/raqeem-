import { AnimatePresence, motion } from 'framer-motion';
import { useToastList } from '../../context/ToastContext';

const STYLES = {
  success: 'bg-success text-white',
  error: 'bg-danger text-white',
  info: 'bg-nili text-white',
};

const ICONS = { success: '✓', error: '✕', info: 'ℹ' };

export default function ToastContainer() {
  const { toasts, dismiss } = useToastList();

  return (
    <div className="pointer-events-none fixed bottom-5 left-1/2 z-[100] flex w-full max-w-sm -translate-x-1/2 flex-col gap-2 px-4">
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.25, ease: [0.22, 0.61, 0.36, 1] }}
            className={`pointer-events-auto flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium shadow-lg ${STYLES[t.type] || STYLES.info}`}
            onClick={() => dismiss(t.id)}
            role="status"
          >
            <span className="text-base leading-none">{ICONS[t.type] || ICONS.info}</span>
            <span className="flex-1">{t.message}</span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
