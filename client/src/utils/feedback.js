// تنبيه ناعم عند اكتمال طلب (جاهز/مُسلَّم) — Web Audio API + Vibration API
// فقط، بدون ملفات صوت أو أي مكتبة خارجية.

let sharedCtx = null;

// هاي تطلع صوتة قصيرة "تك" بس - نسويها بالمتصفح نفسه (Web Audio API)
// بلا ما نحمّل أي ملف صوت، أخف وأسرع
export function playTick() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    sharedCtx = sharedCtx || new Ctx();
    const ctx = sharedCtx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 800;
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.08);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.08);
  } catch {
    /* المتصفح ما يدعم Web Audio — تجاهل بصمت */
  }
}

export function vibrate() {
  try {
    navigator.vibrate?.(50);
  } catch {
    /* ignore */
  }
}

// الحالات اللي تستحق تنبيه: الطلب صار جاهز أو تم تسليمه فعليًا — مو أي تغيير
// حالة عادي (جديد/قيد التصميم/قيد الطباعة ما تحتاج لفت انتباه).
const NOTIFY_STATUSES = new Set(['جاهز للتسليم', 'تم التسليم']);

// هاي اللي تنادى من صفحة تفاصيل الطلب لما تغيّر الحالة - تفحص اذا الحالة
// الجديدة "جاهز" او "تم التسليم" وبس بهاي الحالتين تطلع صوت وهزة
export function notifyIfCompleted(newStatus) {
  if (!NOTIFY_STATUSES.has(newStatus)) return;
  playTick();
  vibrate();
}
