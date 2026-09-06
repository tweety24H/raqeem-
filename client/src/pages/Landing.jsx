import { useNavigate } from "react-router-dom";

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div dir="rtl" className="min-h-screen bg-[#f5f5f7] font-['Cairo','Tajawal',sans-serif] overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-8 lg:px-12 py-5 bg-[#f5f5f7]">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <span className="font-bold text-[17px] text-black tracking-tight">مطبعتك</span>
          <div className="w-7 h-7 rounded-lg bg-[#e0f2fe] border border-[#bae6fd] flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M6 9H4.5a2.5 2.5 0 010-5H6M18 9h1.5a2.5 2.5 0 000-5H18M6 9v9a2 2 0 002 2h8a2 2 0 002-2V9M6 9h12" stroke="#0ea5e9" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="12" cy="13" r="1.5" fill="#0ea5e9"/>
            </svg>
          </div>
        </div>

        {/* Nav */}
        <nav className="hidden md:flex items-center gap-7 text-[13px] text-gray-500 font-medium">
          <a href="#" className="text-black font-bold">الرئيسيه</a>
          <a href="#" className="hover:text-black transition">الفنانين</a>
          <a href="#" className="hover:text-black transition">المنتجات</a>
          <a href="#" className="hover:text-black transition">الخدمات</a>
          <a href="#" className="hover:text-black transition">تواصل معنا</a>
        </nav>

        {/* Login */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/dashboard")}
            className="bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium px-6 py-2.5 rounded-full transition"
          >
            تسجيل الدخول
          </button>
          <button className="w-9 h-9 rounded-full bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-50">
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
              <circle cx="4" cy="4" r="1.5" fill="#1a1a1a" />
              <circle cx="10" cy="4" r="1.5" fill="#1a1a1a" />
              <circle cx="16" cy="4" r="1.5" fill="#1a1a1a" />
              <circle cx="4" cy="10" r="1.5" fill="#1a1a1a" />
              <circle cx="10" cy="10" r="1.5" fill="#1a1a1a" />
              <circle cx="16" cy="10" r="1.5" fill="#1a1a1a" />
              <circle cx="4" cy="16" r="1.5" fill="#1a1a1a" />
              <circle cx="10" cy="16" r="1.5" fill="#1a1a1a" />
              <circle cx="16" cy="16" r="1.5" fill="#1a1a1a" />
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
            className="w-full max-w-[720px] lg:max-w-none lg:w-[95%] lg:h-[92%] object-contain object-bottom mix-blend-multiply"
          />

          {/* Number indicator */}
          <div className="hidden lg:flex absolute left-0 top-[35%] flex-col items-center gap-2">
            <span className="text-[11px] font-bold tracking-widest text-black">01</span>
            <div className="flex flex-col gap-1.5 mt-1">
              <div className="w-1 h-1 rounded-full bg-black"></div>
              <div className="w-1 h-1 rounded-full bg-black"></div>
              <div className="w-1 h-1 rounded-full bg-gray-300"></div>
              <div className="w-1 h-1 rounded-full bg-gray-300"></div>
            </div>
          </div>
        </div>

        {/* Left side - Text */}
        <div className="w-full lg:w-[42%] pt-10 lg:pt-0 pb-10 lg:pb-20 z-10">
          <h1 className="text-[42px] lg:text-[54px] font-black leading-[1.1] text-[#111827] tracking-tight">
            نطبع أفكارك
            <br />
            <span className="text-brand-500">ونترك</span>
            <span className="text-[#111827]"> أثراً</span>
          </h1>

          <p className="mt-6 text-[13px] lg:text-[14px] leading-[1.9] text-[#6b7280] font-medium max-w-[320px]">
            طباعة احترافية تعكس هوية علامتك،
            <br />
            وتوصل رسالتك بأفضل شكل
          </p>

          <div className="mt-8 flex items-center gap-6">
            <button
              onClick={() => navigate("/dashboard")}
              className="bg-brand-500 hover:bg-brand-600 text-white text-[13px] font-bold px-8 py-3 rounded-full shadow-lg shadow-brand-500/25 transition"
            >
              ابدأ الآن
            </button>

            <button className="flex items-center gap-2.5 text-[13px] font-medium text-[#374151] hover:text-black transition group">
              <span className="w-9 h-9 rounded-full border border-gray-300 flex items-center justify-center group-hover:border-black transition">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5.14v14l11-7-11-7z" />
                </svg>
              </span>
              شاهد كيف نعمل
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
