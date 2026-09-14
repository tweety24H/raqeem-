import InteractiveBackground from '../components/InteractiveBackground';
import Button from '../components/ui/Button';
import logoUrl from '../assets/logo.png';
import heroUrl from '../assets/hero.jpg';

// الصفحة الرئيسية (Landing) — هوية غامقة/ذهبية (nili/gold) بدل الكريمي القديم.
// الصورة الفنية (رأس + ألوان طايرة + طابعة) مستوردة عبر Vite (وليس بمسار
// مطلق /hero.jpg) لأن التطبيق المبني بـ Electron يفتح index.html بـ
// file:// — مسار مطلق كان يرجع لجذر القرص بدل مجلد التطبيق فتنكسر الصورة.
//
// ملاحظة: هذي الصفحة دائماً غامقة (class="dark" محلي على الجذر) بغض النظر
// عن إعداد الدارك مود العام بباقي البرنامج — قرار مقصود، هذا هو الشكل
// الوحيد لهذي الصفحة. الـ class="dark" المحلي يخلي مكونات مشتركة مثل
// Button تاخذ ألوان النسخة الغامقة منها تلقائياً حتى لو الثيم العام فاتح.
export default function LandingNew() {
  return (
    <div dir="rtl" className="dark relative min-h-screen overflow-hidden bg-slate-950">
      {/* خلفية تفاعلية خفيفة جداً (nili/gold فقط) خلف المحتوى */}
      <div className="pointer-events-none absolute inset-0 z-0 opacity-10">
        <InteractiveBackground />
      </div>

      <div className="relative z-[1]">
        {/* Header — نظيف: الشعار فقط يمين، وزر CTA واحد يسار. الروابط
            الوصفية (الميزات/سير العمل/التسعير) انحذفت لأنها ما كانت تربط
            لأي قسم حقيقي أصلاً. */}
        <header className="flex items-center justify-between px-8 lg:px-16 py-6">
          <div className="flex items-center gap-3">
            <img src={logoUrl} alt="Raqeem" className="h-10 w-10 rounded-xl object-contain" />
            <div className="leading-tight">
              <div className="font-display text-lg font-bold tracking-[-0.02em]">
                <span className="text-white">Raqeem</span>
                <span className="text-gold text-sm">OS</span>
              </div>
              <div className="font-arabic text-[11px] text-slate-400 font-medium">مطبعتك.. بأرقام</div>
            </div>
          </div>

          <Button to="/dashboard" variant="gold" magnetic={false} className="!rounded-full !px-6 !py-2.5 !text-sm">
            ابدأ الآن
          </Button>
        </header>

        {/* Hero: صورة على اليسار، نص على اليمين */}
        <main className="grid lg:grid-cols-2 gap-10 items-center px-8 lg:px-16 py-10 lg:py-16 min-h-[calc(100vh-96px)]">
          {/* الصورة الفنية الحقيقية - hero.jpg نفسه، بمعالجة لونية دافئة */}
          <div className="order-2 lg:order-2 relative flex items-center justify-center">
            <div className="absolute w-[420px] h-[420px] rounded-full bg-gold/10 blur-3xl" />
            <img
              src={heroUrl}
              alt="رقيم - نطبع أفكارك"
              className="relative w-full max-w-xl object-contain"
              style={{ filter: 'saturate(0.8) sepia(0.18) contrast(1.02)' }}
            />
          </div>

          {/* النص */}
          <div className="order-1 lg:order-1 text-right">
            <span className="inline-block text-[11px] font-black tracking-[0.15em] text-gold mb-5">
              من الفكرة … للطباعة
            </span>
            <h1 className="font-arabic text-[38px] lg:text-[52px] font-semibold tracking-[-0.01em] leading-[1.15] text-white">
              <span className="text-gold">رقيم</span> — كل طلب طباعة،
              <br />
              مرتّب من أول خطوة
            </h1>
            <p className="font-arabic mt-6 text-base font-normal text-slate-400 leading-relaxed max-w-md mr-0 ml-auto lg:mr-0">
              صمّم → اطبع → سلّم. رقيم يتابع كل مرحلة، ويذكّرك بالمواعيد والديون، وياخذ نسخة احتياطية كل يوم بدون ما تسوي شي.
            </p>
            {/* زر CTA واحد فقط (ابدأ الآن) — زر "شاهد كيف نعمل" انحذف لأنه
                ما كان مربوط بأي قسم "كيف نعمل" حقيقي بالصفحة. */}
            <div className="mt-8 flex flex-wrap items-center justify-end gap-3">
              <Button to="/dashboard" variant="gold" className="!rounded-full !px-9 !py-4 !text-sm">
                ابدأ الآن
              </Button>
            </div>
          </div>
        </main>

        <footer className="font-arabic border-t border-white/10 px-8 lg:px-16 py-6 text-center text-xs text-slate-500">
          © {new Date().getFullYear()} Raqeem - مطبعتك.. بأرقام
        </footer>
      </div>
    </div>
  );
}
