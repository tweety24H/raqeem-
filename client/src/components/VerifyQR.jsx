import { useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { useLanguage } from '../context/LanguageContext';

// يرسم QR يوجه لصفحة التحقق العامة /verify/:orderNumber، بألوان النيلي/الكريمي
// ولوجو المطبعة بالنص (يحتاج errorCorrectionLevel: H حتى يبقى قابل للمسح رغم اللوجو).
export default function VerifyQR({ orderNumber, logoUrl, size = 160 }) {
  const { t } = useLanguage();
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!orderNumber || !canvasRef.current) return;
    let cancelled = false;
    const verifyUrl = `${window.location.origin}${window.location.pathname}#/verify/${orderNumber}`;

    QRCode.toCanvas(canvasRef.current, verifyUrl, {
      width: size,
      margin: 1,
      errorCorrectionLevel: 'H',
      color: { dark: '#0B1D3A', light: '#FBF6EA' },
    }).then(() => {
      if (cancelled || !logoUrl) return;
      const ctx = canvasRef.current.getContext('2d');
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        if (cancelled) return;
        const badge = size * 0.28;
        const cx = (size - badge) / 2;
        ctx.fillStyle = '#FBF6EA';
        ctx.beginPath();
        ctx.roundRect(cx - 3, cx - 3, badge + 6, badge + 6, 6);
        ctx.fill();
        ctx.strokeStyle = '#C9A94A';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.drawImage(img, cx, cx, badge, badge);
      };
      img.onerror = () => {};
      img.src = logoUrl;
    });

    return () => {
      cancelled = true;
    };
  }, [orderNumber, logoUrl, size]);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="rounded-lg p-2" style={{ border: '1px solid #C9A94A' }}>
        <canvas ref={canvasRef} width={size} height={size} />
      </div>
      <p className="font-arabic text-center text-[11px] text-stone-400">
        {t('verify.qrCaption')}
      </p>
    </div>
  );
}
