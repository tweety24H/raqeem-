import InteractiveBackground from '../components/InteractiveBackground';
import Button from '../components/ui/Button';

// ملاحظة: هذا الملف قديم وغير مستخدم بالـ routing الحالي (App.jsx يستخدم
// LandingNew.jsx على مسار "/") — بس محدث بنفس هوية nili/gold حتى لا يبقى
// فيه بنفسجي إذا رجع يُستخدم لاحقاً.
export default function Landing() {
  return (
    <div dir="rtl" className="dark relative min-h-screen overflow-hidden bg-slate-950 font-['Cairo','Tajawal',sans-serif]">
      <div className="pointer-events-none absolute inset-0 z-0 opacity-10">
        <InteractiveBackground />
      </div>

      <div className="relative z-[1]">
        {/* Header */}
        <header className="flex items-center justify-between px-8 lg:px-12 py-5">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <span className="font-bold text-[17px] text-gold tracking-tight">مطبعتك</span>
            <div className="w-7 h-7 rounded-lg bg-nili/20 border border-nili/30 flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M6 9H4.5a2.5 2.5 0 010-5H6M18 9h1.5a2.5 2.5 0 000-5H18M6 9v9a2 2 0 002 2h8a2 2 0 002-2V9M6 9h12" stroke="#D4AF37" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="12" cy="13" r="1.5" fill="#D4AF37"/>
              </svg>
            </div>
          </div>

          {/* Nav */}
          <nav className="hidden md:flex items-center gap-7 text-[13px] text-slate-400 font-medium">
            <a href="#" className="text-white font-bold">الرئيسيه</a>
            <a href="#" className="hover:text-white transition">الفنانين</a>
            <a href="#" className="hover:text-white transition">المنتجات</a>
            <a href="#" className="hover:text-white transition">الخدمات</a>
            <a href="#" className="hover:text-white transition">تواصل معنا</a>
          </nav>

          {/* Login */}
          <div className="flex items-center gap-3">
            <Button to="/dashboard" variant="gold" magnetic={false} className="!rounded-full !px-6 !py-2.5 !text-sm">
              تسجيل الدخول
            </Button>
            <button className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10">
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                <circle cx="4" cy="4" r="1.5" fill="#94a3b8" />
                <circle cx="10" cy="4" r="1.5" fill="#94a3b8" />
                <circle cx="16" cy="4" r="1.5" fill="#94a3b8" />
                <circle cx="4" cy="10" r="1.5" fill="#94a3b8" />
                <circle cx="10" cy="10" r="1.5" fill="#94a3b8" />
                <circle cx="16" cy="10" r="1.5" fill="#94a3b8" />
                <circle cx="4" cy="16" r="1.5" fill="#94a3b8" />
                <circle cx="10" cy="16" r="1.5" fill="#94a3b8" />
                <circle cx="16" cy="16" r="1.5" fill="#94a3b8" />
              </svg>
            </button>
          </div>
        </header>

        {/* Hero */}
        <main className="relative flex flex-col lg:flex-row-reverse items-center min-h-[calc(100vh-80px)] px-8 lg:px-12">
          {/* Right side - Image */}
          <div className="w-full lg:w-[58%] relative lg:h-[calc(100vh-80px)] flex items-end justify-center lg:justify-start">
            <img
              src="/hero.jpg"
              alt="مطبعتك - نطبع أفكارك"
              className="w-full max-w-[720px] lg:max-w-none lg:w-[95%] lg:h-[92%] object-contain object-bottom"
            />

            {/* Number indicator */}
            <div className="hidden lg:flex absolute left-0 top-[35%] flex-col items-center gap-2">
              <span className="text-[11px] font-bold tracking-widest text-white">01</span>
              <div className="flex flex-col gap-1.5 mt-1">
                <div className="w-1 h-1 rounded-full bg-white"></div>
                <div className="w-1 h-1 rounded-full bg-white"></div>
                <div className="w-1 h-1 rounded-full bg-slate-600"></div>
                <div className="w-1 h-1 rounded-full bg-slate-600"></div>
              </div>
            </div>
          </div>

          {/* Left side - Text */}
          <div className="w-full lg:w-[42%] pt-10 lg:pt-0 pb-10 lg:pb-20 z-10">
            <h1 className="text-[42px] lg:text-[54px] font-black leading-[1.1] text-white tracking-tight">
              نطبع أفكارك
              <br />
              <span className="text-gold">ونترك</span>
              <span className="text-white"> أثراً</span>
            </h1>

            <p className="mt-6 text-[13px] lg:text-[14px] leading-[1.9] text-slate-400 font-medium max-w-[320px]">
              طباعة احترافية تعكس هوية علامتك،
              <br />
              وتوصل رسالتك بأفضل شكل
            </p>

            <div className="mt-8 flex items-center gap-6">
              <Button to="/dashboard" variant="gold" magnetic={false} className="!rounded-full !px-8 !py-3 !text-[13px]">
                ابدأ الآن
              </Button>

              <Button variant="ghost" magnetic={false} className="!px-0 !py-0 !gap-2.5 !text-[13px] !text-white/70 hover:!text-white">
                <span className="w-9 h-9 rounded-full border border-white/20 flex items-center justify-center group-hover:border-white transition">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5.14v14l11-7-11-7z" />
                  </svg>
                </span>
                شاهد كيف نعمل
              </Button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
