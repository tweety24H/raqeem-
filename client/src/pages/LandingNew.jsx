import { useNavigate } from 'react-router-dom';

// الصفحة الرئيسية (Landing) — تصميم "الحبر والورق" (مقترح 2 من design-lab).
// تحل محل Landing.jsx القديمة على مسار "/". الصورة الفنية (رأس + ألوان طايرة +
// طابعة) هي نفس ملف public/hero.jpg الموجود أصلاً بالمشروع — ما استخدمنا أي
// صورة جديدة، بس عدّلنا لونها بـ CSS (filter) حتى تنسجم وية الذهبي بدل الألوان
// الزاهية الأصلية.
//
// ملاحظة: هذي الصفحة لايت بس، بدون دعم دارك مود (قرار مقصود - الثيم الكريمي
// الدافئ هو الهوية المطلوبة هنا بغض النظر عن إعداد الدارك مود بباقي البرنامج).
export default function LandingNew() {
  const navigate = useNavigate();

  return (
    <div dir="rtl" className="min-h-screen bg-[#fefcf8] overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-8 lg:px-16 py-6">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-nili text-white text-lg">🖨️</span>
          <div className="leading-tight">
            <div className="font-display text-lg font-bold tracking-[-0.02em] text-nili">RaqeemOS</div>
            <div className="font-arabic text-[11px] text-slate-400 font-medium">نظام إدارة المطبعة</div>
          </div>
        </div>

        {/* روابط وصفية فقط - ما أكو صفحات/أقسام حقيقية بعد تربطها، فخليناها
            نص غير قابل للنقر بدل ما نسوي زر يوهم بوظيفة ماكو أصلاً. */}
        <nav className="hidden md:flex items-center gap-8 text-[13px] text-slate-500 font-semibold">
          <span>الميزات</span>
          <span>سير العمل</span>
          <span>التسعير</span>
        </nav>
      </header>

      {/* Hero: صورة على اليسار، نص على اليمين */}
      <main className="grid lg:grid-cols-2 gap-10 items-center px-8 lg:px-16 py-10 lg:py-16 min-h-[calc(100vh-96px)]">
        {/* الصورة الفنية الحقيقية - hero.jpg نفسه، بمعالجة لونية دافئة */}
        <div className="order-2 lg:order-2 relative flex items-center justify-center">
          <div className="absolute w-[420px] h-[420px] rounded-full bg-gold/10 blur-3xl" />
          <img
            src="/hero.jpg"
            alt="رقيم - نطبع أفكارك"
            className="relative w-full max-w-xl object-contain"
            style={{ filter: 'saturate(0.8) sepia(0.18) contrast(1.02)', mixBlendMode: 'multiply' }}
          />
        </div>

        {/* النص */}
        <div className="order-1 lg:order-1 text-right">
          <span className="inline-block text-[11px] font-black tracking-[0.15em] text-gold-dark mb-5">
            من الفكرة … للطباعة
          </span>
          <h1 className="font-arabic text-[38px] lg:text-[52px] font-semibold tracking-[-0.01em] leading-[1.15] text-nili">
            كل طلب طباعة،
            <br />
            مرتّب من أول خطوة
          </h1>
          <p className="font-arabic mt-6 text-base font-normal text-slate-500 leading-relaxed max-w-md mr-0 ml-auto lg:mr-0">
            صمّم → اطبع → سلّم. رقيم يتابع كل مرحلة، ويذكّرك بالمواعيد والديون، وياخذ نسخة احتياطية كل يوم بدون ما تسوي شي.
          </p>
          <button
            onClick={() => navigate('/dashboard')}
            className="mt-8 bg-gold hover:bg-gold-dark text-nili-dark text-sm font-black px-9 py-4 rounded-full transition shadow-lg shadow-gold/20"
          >
            ابدأ الآن
          </button>
        </div>
      </main>

      <footer className="font-arabic border-t border-black/5 px-8 lg:px-16 py-6 text-center text-xs text-slate-400">
        © {new Date().getFullYear()} RaqeemOS - نظام مطبعة فاخرة
      </footer>
    </div>
  );
}
