// ارتفاع ثابت (h-11 = 44px) بدل الاعتماد على py-2 الضمني - هذا الرقم
// بالضبط هو نفسه المستخدم بـ Layout.jsx (pb-11) و SidebarGlass.jsx
// (bottom-11) حتى الشريط ما يغطي شي تحته (تسجيل الخروج، آخر عنصر بالصفحة).
export default function TrialBanner({ daysLeft, onActivateClick }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-[200] flex h-11 items-center justify-center gap-3 bg-gold px-4 text-sm font-semibold text-white shadow-lg">
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
