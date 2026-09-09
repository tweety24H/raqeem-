import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

const REDUCE_MOTION = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Counts up from 0 (or from the previous value, on updates) to `value` over
// ~900ms using requestAnimationFrame — no animation library dependency.
function useCountUp(value, duration = 900) {
  const [display, setDisplay] = useState(REDUCE_MOTION ? value : 0);
  const fromRef = useRef(0);
  const rafRef = useRef(null);

  useEffect(() => {
    const target = Number(value) || 0;
    if (REDUCE_MOTION) {
      setDisplay(target);
      return undefined;
    }
    const from = fromRef.current;
    const start = performance.now();

    function tick(now) {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(from + (target - from) * eased));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = target;
      }
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value, duration]);

  return display;
}

export default function StatCard({ label, value, format, icon, tone = 'default', badge, accent = false }) {
  const display = useCountUp(value);

  const toneClasses = {
    default: 'text-slate-900 dark:text-slate-100',
    warning: 'text-amber-600 dark:text-amber-400',
    danger: 'text-rose-600 dark:text-rose-400',
    success: 'text-emerald-600 dark:text-emerald-400',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 0.61, 0.36, 1] }}
      className={`card flex items-center gap-3 ${accent ? 'border-t-2 border-t-gold' : ''}`}
    >
      {icon && (
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-nili/10 text-lg text-nili dark:bg-nili-light/10 dark:text-nili-light">
          {icon}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
        <p className={`text-xl font-bold tabular-nums ${toneClasses[tone] || toneClasses.default}`}>
          {format ? format(display) : display}
        </p>
      </div>
      {badge != null && badge > 0 && (
        <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-600 dark:bg-rose-500/15 dark:text-rose-300">
          {badge}
        </span>
      )}
    </motion.div>
  );
}
