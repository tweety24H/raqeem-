import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const MotionLink = motion(Link);

// Shared card primitive: soft lift + shadow + optional glow on hover.
// Renders as a <Link> when `to` is given (used for the Dashboard's linked
// "app sections" cards), otherwise a plain <div>.
export default function Card({ to, icon, glow = false, className = '', children, ...props }) {
  const Component = to ? MotionLink : motion.div;
  const linkProps = to ? { to } : {};

  return (
    <Component
      {...linkProps}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2, ease: [0.22, 0.61, 0.36, 1] }}
      className={`card group relative overflow-hidden ${to ? 'block cursor-pointer' : ''} hover:shadow-lg hover:border-brand-300 dark:hover:border-brand-500/40 ${className}`}
      {...props}
    >
      {glow && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -top-10 -left-10 h-32 w-32 rounded-full bg-brand-500/15 blur-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        />
      )}
      {icon && (
        <span className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-xl transition-transform duration-200 group-hover:scale-110 dark:bg-brand-500/10">
          {icon}
        </span>
      )}
      {children}
    </Component>
  );
}
