import { motion } from 'framer-motion';

// Brief splash shown only when Case C (an existing session) auto-continues
// straight past the login screen — see App.jsx's SessionGate. Not the
// Electron cold-boot splash (that's handled elsewhere for the desktop shell).
// هاي بس شاشة انتظار خفيفة (800ms) تطلع لما المستخدم عنده جلسة محفوظة من
// قبل - الشعار ينبض شوي وبعدها ينتقل للداشبورد، مو شاشة إقلاع البرنامج
// الحقيقية (هاي موجودة بـ electron/splash.html)
export default function SplashScreen() {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0B1D3A]">
      <motion.img
        src="/logo.png"
        alt="Raqeem"
        className="h-20 w-20 rounded-2xl object-contain"
        animate={{ scale: [1, 1.08, 1] }}
        transition={{ duration: 0.8, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  );
}
