export default function UpdateBanner({ version, onInstall }) {
  return (
    <div className="fixed inset-x-0 top-0 z-[200] flex items-center justify-center gap-3 bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-lg">
      <span>🔄 تحديث جديد (v{version}) جاهز — أعد التشغيل لتفعيله</span>
      <button
        type="button"
        onClick={onInstall}
        className="rounded-full bg-white/20 px-3 py-1 text-xs font-bold transition hover:bg-white/30"
      >
        إعادة التشغيل الآن
      </button>
    </div>
  );
}
