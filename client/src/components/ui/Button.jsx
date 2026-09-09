import { forwardRef, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useMotionValue, useSpring } from 'framer-motion';

const MotionLink = motion(Link);

const VARIANTS = {
  primary: 'bg-nili text-white shadow-sm shadow-nili/20 hover:bg-nili/90',
  // Low-emphasis tint — brand (violet) is reserved for focus rings/charts,
  // never a primary action background.
  brand: 'border border-brand-200 bg-brand-50 text-brand-700 hover:bg-brand-100 dark:border-brand-500/20 dark:bg-brand-500/10 dark:text-brand-300 dark:hover:bg-brand-500/20',
  gold: 'bg-gold text-nili font-bold hover:bg-gold/90',
  secondary: 'bg-slate-200 text-slate-700 hover:bg-slate-300 dark:bg-white/10 dark:text-white dark:hover:bg-white/20',
  ghost: 'bg-transparent text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10',
};

const REDUCE_MOTION = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Shared button primitive: consistent variants + a subtle "magnetic" pull
// toward the cursor on hover. Falls back to a plain static button under
// prefers-reduced-motion.
const Button = forwardRef(function Button(
  { as, variant = 'primary', magnetic = true, className = '', children, to, ...props },
  forwardedRef
) {
  const Component = as || (to ? MotionLink : motion.button);
  if (to) props.to = to;
  const innerRef = useRef(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 300, damping: 20, mass: 0.2 });
  const springY = useSpring(y, { stiffness: 300, damping: 20, mass: 0.2 });

  const enableMagnet = magnetic && !REDUCE_MOTION;

  function handleMouseMove(e) {
    if (!enableMagnet || !innerRef.current) return;
    const rect = innerRef.current.getBoundingClientRect();
    x.set((e.clientX - rect.left - rect.width / 2) * 0.15);
    y.set((e.clientY - rect.top - rect.height / 2) * 0.15);
  }

  function handleMouseLeave() {
    x.set(0);
    y.set(0);
  }

  return (
    <Component
      ref={(node) => {
        innerRef.current = node;
        if (typeof forwardedRef === 'function') forwardedRef(node);
        else if (forwardedRef) forwardedRef.current = node;
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={enableMagnet ? { x: springX, y: springY } : undefined}
      whileTap={REDUCE_MOTION ? undefined : { scale: 0.96 }}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${VARIANTS[variant] || VARIANTS.primary} ${className}`}
      {...props}
    >
      {children}
    </Component>
  );
});

export default Button;
