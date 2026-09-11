import { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Focus } from 'lucide-react';
import { DashboardSummaryProvider } from '../context/DashboardSummaryContext';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import SidebarGlass from './SidebarGlass';
import LanguageToggle from './LanguageToggle';
import ThemeToggle from './ThemeToggle';
import NotificationsBell from './NotificationsBell';
import CommandPalette from './CommandPalette';
import ShortcutsHelp from './ShortcutsHelp';
import OfflineBanner from './OfflineBanner';
import FocusModeView from './FocusModeView';
import Onboarding, { shouldShowOnboarding } from './Onboarding';

const COLLAPSE_KEY = 'sidebarCollapsed';
const FOCUS_MODE_KEY = 'focusMode';

// Editable form fields shouldn't be hijacked by the chorded shortcuts below
// (Ctrl+N/Ctrl+B/?) — only Escape and the palette's own input keep working
// while the user is typing.
function isTypingTarget(el) {
  if (!el) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
}

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isOwner, hasPermission } = useAuth();
  const { t } = useLanguage();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(shouldShowOnboarding);
  const [focusMode, setFocusMode] = useState(() => {
    try {
      return localStorage.getItem(FOCUS_MODE_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(COLLAPSE_KEY) === '1';
    } catch {
      return false;
    }
  });

  // Close the mobile drawer automatically whenever the route changes.
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    try {
      localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, [collapsed]);

  useEffect(() => {
    try {
      localStorage.setItem(FOCUS_MODE_KEY, focusMode ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, [focusMode]);

  // Global keyboard shortcuts: Ctrl+K command palette, Ctrl+N new order,
  // Ctrl+B collapse sidebar, ? shortcuts help.
  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === 'Escape') {
        setPaletteOpen(false);
        setHelpOpen(false);
        setFocusMode(false);
        return;
      }
      if (isTypingTarget(e.target)) return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen(true);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
        if (isOwner || hasPermission('create_order')) {
          e.preventDefault();
          navigate('/orders/new');
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        setCollapsed((v) => !v);
      } else if (e.key === '?') {
        setHelpOpen(true);
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [navigate, isOwner, hasPermission]);

  if (focusMode) {
    return (
      <DashboardSummaryProvider>
        <FocusModeView onExit={() => setFocusMode(false)} />
      </DashboardSummaryProvider>
    );
  }

  return (
    <DashboardSummaryProvider>
      <div className="h-screen w-screen overflow-hidden bg-slate-50 dark:bg-slate-950">
        <SidebarGlass
          collapsed={collapsed}
          onToggleCollapsed={() => setCollapsed((v) => !v)}
          mobileOpen={mobileOpen}
          onCloseMobile={() => setMobileOpen(false)}
        />

        <div
          className={`flex h-full flex-col overflow-hidden transition-[margin] duration-300 ease-in-out ${
            collapsed ? 'lg:mr-[72px]' : 'lg:mr-[280px]'
          }`}
        >
          <OfflineBanner />
          <header className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-200 bg-white px-4 py-2 dark:border-slate-800 dark:bg-slate-950 lg:justify-end">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-lg transition hover:bg-slate-100 dark:border-slate-800 dark:bg-white/5 dark:hover:bg-white/10 lg:hidden"
              aria-label="فتح القائمة"
            >
              ☰
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setFocusMode(true)}
                title={t('focusMode.toggle')}
                className="inline-flex h-9 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 dark:border-slate-800 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
              >
                <Focus className="h-4 w-4" strokeWidth={1.75} />
                <span className="hidden sm:inline">{t('focusMode.toggle')}</span>
              </button>
              <NotificationsBell />
              <LanguageToggle />
              <ThemeToggle />
            </div>
          </header>
          <main className="flex-1 overflow-y-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18, ease: [0.22, 0.61, 0.36, 1] }}
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      <ShortcutsHelp open={helpOpen} onClose={() => setHelpOpen(false)} />
      <Onboarding open={showOnboarding} onDone={() => setShowOnboarding(false)} />
    </DashboardSummaryProvider>
  );
}
