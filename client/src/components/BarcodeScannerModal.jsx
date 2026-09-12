import { useEffect, useRef, useState } from 'react';
import Modal from './Modal';

const SCANNER_ELEMENT_ID = 'raqeem-barcode-scanner';

// نافذة مسح باركود عبر كاميرا الجهاز. تحمّل مكتبة html5-qrcode ديناميكياً
// (lazy) بس لما تنفتح فعلياً، حتى ما تكبّر حجم التطبيق المحمّل بالبداية.
export default function BarcodeScannerModal({ onDetected, onClose }) {
  const scannerRef = useRef(null);
  const [error, setError] = useState('');
  const [starting, setStarting] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let isRunning = false;

    (async () => {
      try {
        const { Html5Qrcode } = await import('html5-qrcode');
        if (cancelled) return;
        const html5Qrcode = new Html5Qrcode(SCANNER_ELEMENT_ID);
        scannerRef.current = html5Qrcode;
        await html5Qrcode.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 150 } },
          (decodedText) => {
            onDetected(decodedText);
          },
          () => {
            /* فشل قراءة إطار واحد - طبيعي أثناء البحث عن الباركود، نتجاهله */
          }
        );
        // الكامرا ممكن تنسكر (unmount) وهي لسا بمنتصف .start() - نتأكد
        // نوقفها فوراً بدل ما تضل شغالة بالخلفية بدون علم المستخدم.
        if (cancelled) {
          html5Qrcode.stop().catch(() => {});
          return;
        }
        isRunning = true;
        setStarting(false);
      } catch (err) {
        if (!cancelled) {
          setStarting(false);
          setError('تعذّر الوصول للكاميرا. تأكد من إعطاء البرنامج صلاحية الكاميرا، أو أدخل الباركود يدوياً.');
        }
      }
    })();

    return () => {
      cancelled = true;
      // .stop() على ماسح ما اشتغل أصلاً (رفض الكاميرا مثلاً) يرمي خطأ
      // Synchronous يطيح الصفحة كلها إذا ما لفّيناه بـ try/catch - نتأكد
      // نستدعيه بس إذا فعلاً اشتغل.
      if (isRunning && scannerRef.current) {
        try {
          scannerRef.current
            .stop()
            .then(() => scannerRef.current.clear())
            .catch(() => {});
        } catch {
          /* تجاهل - نفس الحماية لو رمى الخطأ Synchronous */
        }
      }
    };
  }, [onDetected]);

  return (
    <Modal open title="📷 مسح الباركود" onClose={onClose}>
      <div className="space-y-3">
        {starting && <p className="text-center text-sm text-slate-400 dark:text-slate-500">جاري تشغيل الكاميرا...</p>}
        {error && (
          <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger dark:bg-danger/10 dark:text-danger">
            {error}
          </p>
        )}
        <div id={SCANNER_ELEMENT_ID} className="mx-auto w-full max-w-sm overflow-hidden rounded-xl" />
        <p className="text-center text-xs text-slate-400 dark:text-slate-500">وجّه الكاميرا نحو الباركود</p>
      </div>
    </Modal>
  );
}
