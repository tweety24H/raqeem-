// Formalizes the rose error-banner markup that was copy-pasted across ~8
// pages (Login, NewOrder, OrderDetail, Customers, Archive, Stock, ...).
export default function ErrorBanner({ children, onRetry, retryLabel = 'إعادة المحاولة' }) {
  if (!children) return null;
  return (
    <div className="mb-4 flex items-center justify-between gap-3 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger dark:bg-danger/10 dark:text-danger">
      <span>{children}</span>
      {onRetry && (
        <button type="button" onClick={onRetry} className="shrink-0 font-semibold underline underline-offset-2 hover:no-underline">
          {retryLabel}
        </button>
      )}
    </div>
  );
}
