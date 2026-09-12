import { useMemo, useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { Home, Package, Boxes, Users, BarChart3, Archive, Clock, Shield, Settings, ChevronLeft, ChevronDown, LogOut, Repeat, Printer } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useDashboardSummary } from '../context/DashboardSummaryContext';
import SwitchUserModal from './SwitchUserModal';

const READY_STATUS = 'جاهز للتسليم';
const EXPANDED_W = 280;
const COLLAPSED_W = 72;

// السايدبار العالمي الجديد — أقسام مجمّعة ثابتة (مو مشتقة من NAV_ITEMS
// العامة، لأن التجميع/الترتيب هنا مختلف عن شبكة "الوصول السريع" بالداشبورد).
const SECTIONS = [
  {
    titleKey: 'nav.groupOverview',
    items: [
      { to: '/dashboard', key: 'nav.dashboard', Icon: Home, end: true },
      { to: '/reports', key: 'nav.reports', Icon: BarChart3, permission: 'view_reports' },
    ],
  },
  {
    titleKey: 'nav.groupOperations',
    items: [
      { to: '/orders', key: 'nav.orders', Icon: Package, badge: 'ready', permission: 'view_orders' },
      { to: '/print-queue', key: 'nav.printQueue', Icon: Printer, permission: 'view_orders' },
      { to: '/stock', key: 'nav.inventory', Icon: Boxes, permission: 'view_inventory' },
    ],
  },
  {
    titleKey: 'nav.groupClients',
    items: [{ to: '/customers', key: 'nav.customers', Icon: Users, permission: 'view_customers' }],
  },
  {
    titleKey: 'nav.groupSystem',
    items: [
      {
        submenuKey: 'nav.archiveGroup',
        Icon: Archive,
        permission: 'view_customers',
        children: [
          { to: '/archive', key: 'nav.archive' },
          { to: '/requests', key: 'nav.requests' },
        ],
      },
      { to: '/activity-logs', key: 'nav.activityLogs', Icon: Clock, permission: 'view_activity_logs' },
      { to: '/settings/permissions', key: 'nav.permissions', Icon: Shield, permission: 'manage_roles' },
      { to: '/settings', key: 'nav.settings', Icon: Settings, ownerOnly: true },
    ],
  },
];

function NavItem({ to, end, Icon, label, badge, isExpanded, onCloseMobile, indent }) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onCloseMobile}
      title={!isExpanded ? label : undefined}
      className={({ isActive }) =>
        `mx-2 flex items-center gap-3 rounded-xl border-r-2 px-3 py-2.5 text-sm transition-all ${
          !isExpanded ? 'justify-center' : ''
        } ${indent && isExpanded ? 'mr-5' : ''} ${
          isActive
            ? 'border-[#C5A880] bg-white/10 font-medium text-white'
            : 'border-transparent text-slate-300 hover:bg-white/10 hover:text-white'
        }`
      }
    >
      <Icon className="h-5 w-5 shrink-0" strokeWidth={1.5} />
      {isExpanded && <span className="truncate">{label}</span>}
      {isExpanded && badge > 0 && (
        <span className="ml-auto shrink-0 rounded-full bg-[#C5A880] px-2 py-0.5 text-xs font-bold text-[#0B1D3A]">{badge}</span>
      )}
    </NavLink>
  );
}

function SubmenuItem({ item, isExpanded, onCloseMobile, t }) {
  const location = useLocation();
  const childActive = item.children.some((c) => location.pathname === c.to);
  const [open, setOpen] = useState(childActive);

  if (!isExpanded) {
    // مطوي: نعرض روابط الأبناء مباشرة بلا عنوان مجموعة (ماكو مكان لعرض توسيع).
    return (
      <div className="space-y-1">
        {item.children.map((c) => (
          <NavItem key={c.to} to={c.to} label={t(c.key)} Icon={item.Icon} isExpanded={isExpanded} onCloseMobile={onCloseMobile} />
        ))}
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`mx-2 flex w-[calc(100%-1rem)] items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all ${
          childActive ? 'text-white' : 'text-slate-300 hover:bg-white/10 hover:text-white'
        }`}
      >
        <item.Icon className="h-5 w-5 shrink-0" strokeWidth={1.5} />
        <span className="flex-1 truncate text-right">{t(item.submenuKey)}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} strokeWidth={2} />
      </button>
      {open && (
        <div className="mt-1 space-y-1">
          {item.children.map((c) => (
            <NavItem key={c.to} to={c.to} label={t(c.key)} Icon={item.Icon} isExpanded={isExpanded} onCloseMobile={onCloseMobile} indent />
          ))}
        </div>
      )}
    </div>
  );
}

function Section({ section, badges, isExpanded, isOwner, hasPermission, onCloseMobile, t }) {
  const items = section.items.filter(
    (item) => (!item.ownerOnly || isOwner) && (!item.permission || isOwner || hasPermission(item.permission))
  );
  if (items.length === 0) return null;

  return (
    <div className="mt-6 first:mt-0">
      {isExpanded && (
        <p className="mb-2 px-4 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{t(section.titleKey)}</p>
      )}
      <div className="space-y-1">
        {items.map((item) =>
          item.submenuKey ? (
            <SubmenuItem key={item.submenuKey} item={item} isExpanded={isExpanded} onCloseMobile={onCloseMobile} t={t} />
          ) : (
            <NavItem
              key={item.to}
              to={item.to}
              end={item.end}
              Icon={item.Icon}
              label={t(item.key)}
              badge={item.badge ? badges[item.badge] : undefined}
              isExpanded={isExpanded}
              onCloseMobile={onCloseMobile}
            />
          )
        )}
      </div>
    </div>
  );
}

export default function SidebarGlass({ collapsed, onToggleCollapsed, mobileOpen, onCloseMobile }) {
  const { worker, logout, isOwner, hasPermission } = useAuth();
  const navigate = useNavigate();
  const { t, lang } = useLanguage();
  const { summary } = useDashboardSummary();
  const [hoverExpand, setHoverExpand] = useState(false);
  const [showSwitchUser, setShowSwitchUser] = useState(false);

  // "جاهز" = بادج قسم الطلبات — عدد الطلبات الجاهزة للتسليم فعليًا (من نفس
  // مصدر بيانات الداشبورد)، مو "قرب الاستحقاق" كان بالتصميم القديم.
  const readyCount = useMemo(() => {
    const row = (summary?.ordersByStatus || []).find((s) => s.status === READY_STATUS);
    return row?.count || 0;
  }, [summary]);
  const badges = { ready: readyCount };

  const isExpanded = !collapsed || hoverExpand;
  const width = isExpanded ? EXPANDED_W : COLLAPSED_W;

  return (
    <>
      {mobileOpen && <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={onCloseMobile} aria-hidden="true" />}

      <aside
        onMouseEnter={() => collapsed && setHoverExpand(true)}
        onMouseLeave={() => setHoverExpand(false)}
        style={{ width }}
        dir="rtl"
        className={`fixed inset-y-0 right-0 z-50 flex flex-col overflow-hidden bg-[#0B1D3A] text-slate-300 shadow-[0_0_40px_rgba(0,0,0,0.3)] transition-all duration-300 ease-in-out ${
          mobileOpen ? 'translate-x-0' : 'translate-x-[calc(100%)] lg:translate-x-0'
        }`}
      >
        {/* Logo + زر الطي */}
        <div className={`flex items-center gap-2.5 border-b border-white/10 px-4 py-4 ${!isExpanded ? 'justify-center px-2' : ''}`}>
          <span className="relative flex h-9 w-9 shrink-0 items-center justify-center">
            <img src="/logo.png" alt="Raqeem" className="h-9 w-9 rounded-xl bg-white/5 object-contain p-1" />
            <span className="absolute -bottom-0.5 -left-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#0B1D3A] bg-success" />
          </span>
          {isExpanded && (
            <div className="min-w-0 flex-1 leading-tight">
              {/* الاسم الجديد Raqeem بالبراند الرسمي */}
              <div className="truncate font-display text-lg font-bold tracking-[-0.02em]">
                <span className="text-white">Raqeem</span>
                <span className="text-gold text-sm">OS</span>
              </div>
              <div className="font-arabic truncate text-[11px] text-slate-400">
                {lang === 'ar' ? 'مطبعتك.. بأرقام' : 'Your print shop, in numbers'}
              </div>
            </div>
          )}
          <button
            type="button"
            onClick={onToggleCollapsed}
            title={lang === 'ar' ? (collapsed ? 'إظهار القائمة' : 'طي القائمة') : collapsed ? 'Expand' : 'Collapse'}
            className={`hidden shrink-0 items-center justify-center rounded-lg p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-white lg:flex ${
              !isExpanded ? 'absolute -left-3 top-4 z-10 border border-white/10 bg-[#0B1D3A]' : ''
            }`}
          >
            <ChevronLeft className={`h-4 w-4 transition-transform duration-300 ${collapsed ? 'rotate-180' : ''}`} strokeWidth={2} />
          </button>
        </div>

        {/* Nav — أقسام مجمّعة */}
        <nav className="font-arabic flex-1 overflow-y-auto overflow-x-hidden py-3">
          {SECTIONS.map((section) => (
            <Section
              key={section.titleKey}
              section={section}
              badges={badges}
              isExpanded={isExpanded}
              isOwner={isOwner}
              hasPermission={hasPermission}
              onCloseMobile={onCloseMobile}
              t={t}
            />
          ))}
        </nav>

        {/* بطاقة المستخدم + تبديل سريع + تسجيل الخروج */}
        <div className={`border-t border-white/10 p-4 ${!isExpanded ? 'px-2' : ''}`}>
          <button
            type="button"
            onClick={() => setShowSwitchUser(true)}
            title={t('nav.switchUser')}
            className={`flex w-full items-center gap-3 rounded-lg p-1 transition hover:bg-white/10 ${!isExpanded ? 'justify-center' : ''}`}
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold/20 text-sm font-bold text-gold">
              {(worker?.name || '?').trim().charAt(0)}
            </span>
            {isExpanded && (
              <>
                <div className="font-arabic min-w-0 flex-1 text-right leading-tight">
                  <div className="truncate text-sm font-semibold text-white">{worker?.name}</div>
                  <div className="truncate text-xs text-slate-400">{worker?.role === 'owner' ? t('nav.owner') : t('nav.employee')}</div>
                </div>
                <Repeat className="h-4 w-4 shrink-0 text-slate-400" strokeWidth={1.5} />
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => {
              logout();
              navigate('/login');
            }}
            title={t('nav.logout')}
            className={`font-arabic mt-3 flex w-full items-center gap-2 text-sm text-slate-400 transition hover:text-white ${
              !isExpanded ? 'justify-center' : ''
            }`}
          >
            <LogOut className="h-4 w-4 shrink-0" strokeWidth={1.5} />
            {isExpanded && <span>{t('nav.logout')}</span>}
          </button>
        </div>
      </aside>

      <SwitchUserModal open={showSwitchUser} onClose={() => setShowSwitchUser(false)} />
    </>
  );
}
