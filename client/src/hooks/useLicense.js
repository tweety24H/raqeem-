import { useCallback, useEffect, useState } from 'react';

// `window.raqeem` يوصل فقط لما البرنامج يشتغل داخل Electron (عبر preload.js).
// بمتصفح عادي أثناء التطوير `isElectron` تكون false ولا نطبّق أي قفل ترخيص.
export function useLicense() {
  const [status, setStatus] = useState(null);
  const isElectron = typeof window !== 'undefined' && !!window.raqeem?.isElectron;

  const refresh = useCallback(async () => {
    if (!isElectron) {
      setStatus({ status: 'web' });
      return;
    }
    const s = await window.raqeem.license.getStatus();
    setStatus(s);
  }, [isElectron]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { status, isElectron, refresh };
}
