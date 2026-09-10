import Button from './Button';

export default function EmptyState({
  icon = '📭',
  title = 'لا يوجد بيانات',
  subtitle,
  actionLabel,
  actionTo,
  onAction,
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-nili/5 text-3xl text-nili/40 dark:bg-nili-light/10 dark:text-nili-light/40">
        {icon}
      </span>
      <p className="font-display text-base font-bold text-slate-700 dark:text-slate-200">{title}</p>
      {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>}
      {actionLabel && (
        <Button variant="gold" to={actionTo} onClick={onAction} magnetic={false} className="!px-4 !py-2 !text-sm">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
