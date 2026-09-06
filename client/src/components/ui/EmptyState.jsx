export default function EmptyState({ icon = '📭', title, subtitle, action }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
      <span className="text-3xl opacity-60">{icon}</span>
      <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
      {subtitle && <p className="text-xs text-slate-400 dark:text-slate-500">{subtitle}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
