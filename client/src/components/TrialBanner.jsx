export default function TrialBanner({ daysLeft, onActivateClick }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-[200] flex items-center justify-center gap-3 bg-gold px-4 py-2 text-sm font-semibold text-white shadow-lg">
      <span>
        نسخة تجريبية من مطبعتي — متبقي {daysLeft} {daysLeft === 1 ? 'يوم' : 'أيام'}
      </span>
      <button
        type="button"
        onClick={onActivateClick}
        className="rounded-full bg-white/20 px-3 py-1 text-xs font-bold transition hover:bg-white/30"
      >
        فعّل الآن
      </button>
    </div>
  );
}
