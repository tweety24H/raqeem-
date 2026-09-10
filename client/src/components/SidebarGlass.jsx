import { useMemo, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useDashboardSummary } from '../context/DashboardSummaryContext';
import { NAV_ITEMS } from '../config/nav';

// Icon set tuned for this sidebar's look — kept local (not in config/nav.js)
// so it doesn't affect the Dashboard's "app sections" cards, which already
// use their own matching icon set from that shared config.
const GLASS_ICONS = {
  '/dashboard': '🏠',
  '/orders': '📦',
  '/orders/new': '🧾',
  '/lightbox-orders': '🖨️',
  '/stock': '📊',
  '/customers': '👥',
  '/archive': '🗂️',
  '/requests': '📥',
  '/reports': '📈',
  '/settings': '⚙️',
};

// Groups real routes from config/nav.js into two sections for the
// hierarchical layout — everything here is a real, already-routed page
// (no invented paths), just organized under a heading.
const OVERVIEW_ROUTES = ['/dashboard', '/reports', '/settings'];

const EXPANDED_W = 280;
const COLLAPSED_W = 72;

function Chevron({ open }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function NavItem({ item, badge, isExpanded, onCloseMobile, t }) {
  return (
    <NavLink
      key={item.to}
      to={item.to}
      end={item.end}
      onClick={onCloseMobile}
      title={!isExpanded ? t(item.key) : undefined}
      className={({ isActive }) =>
        `flex items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-sm transition ${!isExpanded ? 'justify-center' : ''} ${
          isActive
            ? 'bg-gold font-bold text-nili'
            : 'text-slate-400 hover:bg-white/5 hover:text-white'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <span className="flex min-w-0 items-center gap-2.5">
            <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-base ${isActive ? 'text-nili' : 'text-slate-500'}`}>
              {GLASS_ICONS[item.to] || item.icon}
            </span>
            {isExpanded && <span className="truncate">{t(item.key)}</span>}
          </span>
          {isExpanded && badge > 0 && (
            <span className="shrink-0 rounded-full bg-gold/20 px-2 py-0.5 text-[11px] font-bold text-gold">
              {badge}
            </span>
          )}
        </>
      )}
    </NavLink>
  );
}

function Section({ title, items, badges, isExpanded, onCloseMobile, t }) {
  const [open, setOpen] = useState(true);

  if (!isExpanded) {
    // Collapsed rail: no headers, just a flat icon stack (grouping only
    // matters once there's room to show section titles).
    return (
      <div className="space-y-1">
        {items.map((item) => (
          <NavItem key={item.to} item={item} badge={badges[item.to]} isExpanded={isExpanded} onCloseMobile={onCloseMobile} t={t} />
        ))}
      </div>
    );
  }

  return (
    <div className="mb-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-bold text-slate-500 transition hover:bg-white/5 hover:text-white"
      >
        <span>{title}</span>
        <Chevron open={open} />
      </button>
      {open && (
        <div className="relative mt-1 mr-3 space-y-1 border-r border-white/10 pr-3">
          {items.map((item) => (
            <NavItem key={item.to} item={item} badge={badges[item.to]} isExpanded={isExpanded} onCloseMobile={onCloseMobile} t={t} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function SidebarGlass({ collapsed, onToggleCollapsed, mobileOpen, onCloseMobile }) {
  const { worker, logout, isOwner, hasPermission } = useAuth();
  const navigate = useNavigate();
  const { t, lang } = useLanguage();
  const { summary } = useDashboardSummary();
  const [search, setSearch] = useState('');
  const [hoverExpand, setHoverExpand] = useState(false);

  // Real counts already computed by the backend (/api/dashboard/summary) —
  // same numbers the Dashboard page and NotificationsBell show, not invented.
  const badges = {
    '/orders': summary?.dueSoon?.length || 0,
    '/stock': summary?.lowStock?.length || 0,
  };

  const visibleItems = useMemo(
    () => NAV_ITEMS.filter((i) => (!i.ownerOnly || isOwner) && (!i.permission || isOwner || hasPermission(i.permission))),
    [isOwner, hasPermission]
  );

  const term = search.trim().toLowerCase();
  const searching = term.length > 0;
  const filteredItems = useMemo(
    () => visibleItems.filter((i) => !term || t(i.key).toLowerCase().includes(term)),
    [visibleItems, term, t]
  );

  const overviewItems = visibleItems.filter((i) => OVERVIEW_ROUTES.includes(i.to));
  const dailyItems = visibleItems.filter((i) => !OVERVIEW_ROUTES.includes(i.to));

  // While collapsed, hovering the rail temporarily widens it back out
  // (without touching the persisted collapsed preference).
  const isExpanded = !collapsed || hoverExpand;
  const width = isExpanded ? EXPANDED_W : COLLAPSED_W;

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <aside
        onMouseEnter={() => collapsed && setHoverExpand(true)}
        onMouseLeave={() => setHoverExpand(false)}
        style={{ width }}
        dir="rtl"
        className={`fixed inset-y-0 right-0 z-50 flex flex-col overflow-hidden border-l border-white/10 bg-slate-950 text-slate-400 shadow-[0_0_40px_rgba(0,0,0,0.3)] transition-all duration-300 ease-in-out ${
          mobileOpen ? 'translate-x-0' : 'translate-x-[calc(100%)] lg:translate-x-0'
        }`}
      >
        {/* Logo */}
        <div className={`flex items-center gap-2.5 border-b border-white/10 px-4 py-4 ${!isExpanded && 'justify-center px-0'}`}>
          <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-nili text-lg text-white">
            🖨️
            <span className="absolute -bottom-0.5 -left-0.5 h-2.5 w-2.5 rounded-full border-2 border-slate-950 bg-emerald-500" />
          </span>
          {isExpanded && (
            <div className="min-w-0 leading-tight">
              <div className="truncate font-display text-lg font-bold tracking-[-0.02em] text-gold">RaqeemOS</div>
              <div className="font-arabic truncate text-[11px] text-slate-500">
                {lang === 'ar' ? 'نظام إدارة المطبعة' : 'Print Shop Management'}
              </div>
            </div>
          )}
        </div>

        {/* Search */}
        {isExpanded && (
          <div className="px-3 pt-3">
            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
              <span className="text-sm opacity-50">🔍</span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={lang === 'ar' ? 'ابحث...' : 'Search...'}
                className="font-arabic w-full min-w-0 bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
              />
            </div>
          </div>
        )}

        {/* Nav — grouped into hierarchical sections, unless the user is
            actively searching (then a flat filtered list is clearer). */}
        <nav className="font-arabic mt-2 flex-1 space-y-1 overflow-y-auto overflow-x-hidden px-3 py-2">
          {searching ? (
            <div className="space-y-1">
              {filteredItems.map((item) => (
                <NavItem key={item.to} item={item} badge={badges[item.to]} isExpanded={isExpanded} onCloseMobile={onCloseMobile} t={t} />
              ))}
              {filteredItems.length === 0 && (
                <p className="px-3 py-2 text-xs text-slate-500">
                  {lang === 'ar' ? 'لا توجد نتائج' : 'No results'}
                </p>
              )}
            </div>
          ) : (
            <>
              <Section
                title={lang === 'ar' ? 'نظرة عامة' : 'Overview'}
                items={overviewItems}
                badges={badges}
                isExpanded={isExpanded}
                onCloseMobile={onCloseMobile}
                t={t}
              />
              <Section
                title={lang === 'ar' ? 'العمل اليومي' : 'Daily work'}
                items={dailyItems}
                badges={badges}
                isExpanded={isExpanded}
                onCloseMobile={onCloseMobile}
                t={t}
              />
            </>
          )}
        </nav>

        {/* Profile + collapse toggle */}
        <div className="border-t border-white/10 px-3 py-3">
          <div className={`flex items-center gap-2.5 rounded-xl px-1.5 py-2 ${!isExpanded && 'justify-center'}`}>
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gold/20 text-sm font-bold text-gold">
              {(worker?.name || '?').trim().charAt(0)}
            </span>
            {isExpanded && (
              <div className="font-arabic min-w-0 flex-1 leading-tight">
                <div className="truncate text-sm font-semibold text-white">{worker?.name}</div>
                <div className="truncate text-xs text-slate-500">
                  {worker?.role === 'owner' ? t('nav.owner') : t('nav.employee')}
                </div>
              </div>
            )}
          </div>

          {/* Logout — always visible (icon-only while collapsed, icon+label
              while expanded) instead of hiding behind the profile row. */}
          <button
            type="button"
            onClick={() => {
              logout();
              navigate('/login');
            }}
            title={t('nav.logout')}
            className={`font-arabic mt-1 flex w-full items-center gap-2.5 rounded-xl border border-white/10 px-3 py-2.5 text-sm font-semibold text-slate-400 transition hover:border-rose-500/30 hover:bg-rose-500/10 hover:text-rose-400 ${
              !isExpanded && 'justify-center'
            }`}
          >
            <span className="text-base">🚪</span>
            {isExpanded && <span>{t('nav.logout')}</span>}
          </button>

          <button
            type="button"
            onClick={onToggleCollapsed}
            className={`font-arabic mt-1 hidden w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-slate-500 transition hover:bg-white/5 hover:text-white lg:flex ${
              !isExpanded && 'justify-center'
            }`}
          >
            <span className="text-sm">{collapsed && !hoverExpand ? '‹' : '›'}</span>
            {isExpanded && <span>{lang === 'ar' ? (collapsed ? 'إظهار' : 'إخفاء') : collapsed ? 'Show' : 'Hide'}</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
