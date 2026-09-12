import { motion } from 'framer-motion';

// سبلاش الاقلاع اللي يطلع بس بالمتصفح العادي (مو داخل نسخة Electron
// المبنية) - نفس تصميم شاشة electron/splash.html بالضبط (نفس الالوان
// والحركات)، لكن هذا مسوّى React + Tailwind + Framer Motion حتى يشتغل
// جوة صفحة الويب وياخذ كامل الشاشة بدل صندوق 400x400 الثابت
export default function BootSplash() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden bg-[#0B1D3A]"
    >
      {/* الشعار الذهبي - نبضة خفيفة مستمرة (scale 1 -> 1.05) كل 1.5 ثانية */}
      <motion.img
        src="/logo.png"
        alt="Raqeem"
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        className="h-[120px] w-[120px] rounded-3xl object-contain"
        style={{ filter: 'drop-shadow(0 0 20px rgba(197,168,128,0.35))' }}
      />

      {/* الاسم Raqeem بالابيض + OS بالذهبي، حسب البراند الرسمي */}
      <div className="mt-5 font-display text-[32px] font-bold leading-none">
        <span className="text-white">Raqeem</span>
        <span className="text-[14px] font-semibold text-[#C5A880] align-top">OS</span>
      </div>

      <p className="mt-2 text-[13px] text-slate-300/70">مطبعتك.. بأرقام</p>

      {/* شريط تحميل ذهبي رفيع - يتعبى من 0% لـ 100% خلال ثانيتين */}
      <div className="mt-10 h-[2px] w-[200px] overflow-hidden rounded-full bg-white/10">
        <motion.div
          initial={{ width: '0%' }}
          animate={{ width: '100%' }}
          transition={{ duration: 2, ease: 'easeOut' }}
          className="h-full"
          style={{ background: 'linear-gradient(90deg, #C5A880, #E8D5B5)' }}
        />
      </div>

      <span className="absolute bottom-4 text-[10px] text-slate-500">v2.0.0</span>
    </motion.div>
  );
}
