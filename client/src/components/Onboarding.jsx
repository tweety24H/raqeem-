import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useLanguage } from '../context/LanguageContext';

const SEEN_KEY = 'raqeem_onboarding_seen';

export function shouldShowOnboarding() {
  try {
    return !localStorage.getItem(SEEN_KEY);
  } catch {
    return false;
  }
}

function DashboardIcon() {
  return (
    <svg viewBox="0 0 64 64" className="h-16 w-16">
      <rect x="8" y="8" width="20" height="20" rx="4" fill="#D4AF37" opacity="0.2" />
      <rect x="36" y="8" width="20" height="20" rx="4" fill="#1B2A6B" opacity="0.15" />
      <rect x="8" y="36" width="48" height="20" rx="4" fill="#D4AF37" opacity="0.15" />
      <rect x="8" y="8" width="20" height="20" rx="4" fill="none" stroke="#D4AF37" strokeWidth="2" />
      <rect x="36" y="8" width="20" height="20" rx="4" fill="none" stroke="#1B2A6B" strokeWidth="2" />
      <rect x="8" y="36" width="48" height="20" rx="4" fill="none" stroke="#D4AF37" strokeWidth="2" />
    </svg>
  );
}

function OrdersIcon() {
  return (
    <svg viewBox="0 0 64 64" className="h-16 w-16">
      <rect x="12" y="8" width="40" height="48" rx="4" fill="none" stroke="#1B2A6B" strokeWidth="2" />
      <line x1="20" y1="20" x2="44" y2="20" stroke="#D4AF37" strokeWidth="3" strokeLinecap="round" />
      <line x1="20" y1="30" x2="44" y2="30" stroke="#1B2A6B" strokeWidth="3" strokeLinecap="round" opacity="0.4" />
      <line x1="20" y1="40" x2="36" y2="40" stroke="#1B2A6B" strokeWidth="3" strokeLinecap="round" opacity="0.4" />
    </svg>
  );
}

function ShortcutsIcon() {
  return (
    <svg viewBox="0 0 64 64" className="h-16 w-16">
      <rect x="6" y="22" width="22" height="20" rx="4" fill="none" stroke="#1B2A6B" strokeWidth="2" />
      <text x="17" y="36" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#1B2A6B">K</text>
      <rect x="36" y="22" width="22" height="20" rx="4" fill="none" stroke="#D4AF37" strokeWidth="2" />
      <text x="47" y="36" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#D4AF37">N</text>
    </svg>
  );
}

export default function Onboarding({ open, onDone }) {
  const { t } = useLanguage();
  const [step, setStep] = useState(0);

  const steps = [
    { Icon: DashboardIcon, title: t('onboarding.step1Title'), body: t('onboarding.step1Body') },
    { Icon: OrdersIcon, title: t('onboarding.step2Title'), body: t('onboarding.step2Body') },
    { Icon: ShortcutsIcon, title: t('onboarding.step3Title'), body: t('onboarding.step3Body') },
  ];

  function finish() {
    try {
      localStorage.setItem(SEEN_KEY, '1');
    } catch {
      /* ignore */
    }
    onDone();
  }

  const isLast = step === steps.length - 1;
  const Current = steps[step];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.div
            className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-2xl dark:border dark:border-slate-800 dark:bg-slate-900"
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.2 }}
          >
            <div className="mb-4 flex justify-center">
              <Current.Icon />
            </div>
            <h3 className="mb-2 font-display text-lg font-bold text-slate-800 dark:text-slate-100">{Current.title}</h3>
            <p className="mb-5 text-sm text-slate-500 dark:text-slate-400">{Current.body}</p>

            <div className="mb-4 flex justify-center gap-1.5">
              {steps.map((_, i) => (
                <span key={i} className={`h-1.5 w-1.5 rounded-full ${i === step ? 'bg-gold' : 'bg-slate-200 dark:bg-white/10'}`} />
              ))}
            </div>

            <div className="flex items-center justify-between gap-2">
              <button type="button" className="text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-200" onClick={finish}>
                {t('onboarding.skip')}
              </button>
              <button
                type="button"
                className="btn-gold"
                onClick={() => (isLast ? finish() : setStep((s) => s + 1))}
              >
                {isLast ? t('onboarding.finish') : t('onboarding.next')}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
