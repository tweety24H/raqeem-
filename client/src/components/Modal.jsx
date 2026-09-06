export default function Modal({ open, onClose, title, children, width = 'max-w-lg' }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className={`w-full ${width} rounded-xl bg-white shadow-xl dark:border dark:border-violet-500/20 dark:bg-[#1a1a23]`}>
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3 dark:border-white/10">
          <h3 className="font-semibold text-slate-800 dark:text-slate-100">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-200">
            ✕
          </button>
        </div>
        <div className="max-h-[75vh] overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}
