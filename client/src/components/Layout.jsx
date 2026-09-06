import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { DashboardSummaryProvider } from '../context/DashboardSummaryContext';
import SidebarGlass from './SidebarGlass';
import LanguageToggle from './LanguageToggle';
import ThemeToggle from './ThemeToggle';
import NotificationsBell from './NotificationsBell';

const COLLAPSE_KEY = 'sidebarCollapsed';

export default function Layout() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
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

  return (
    <DashboardSummaryProvider>
      <div className="h-screen w-screen overflow-hidden bg-slate-50 dark:bg-[#0a0a0f]">
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
          <header className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-200 bg-white px-4 py-2 dark:border-brand-500/20 dark:bg-[#0a0a0f] lg:justify-end">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-lg transition hover:bg-slate-100 dark:border-brand-500/20 dark:bg-white/5 dark:hover:bg-white/10 lg:hidden"
              aria-label="فتح القائمة"
            >
              ☰
            </button>
            <div className="flex items-center gap-2">
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
    </DashboardSummaryProvider>
  );
}
