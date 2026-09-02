import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NAV_ITEMS = [
  { to: '/', label: 'الرئيسية', icon: '📊', ownerOnly: false, end: true },
  { to: '/orders/new', label: 'طلب جديد', icon: '🧾', ownerOnly: false },
  { to: '/orders', label: 'الطلبات', icon: '📋', ownerOnly: false },
  { to: '/stock', label: 'الجرد', icon: '📦', ownerOnly: false },
  { to: '/customers', label: 'الزبائن والديون', icon: '👥', ownerOnly: false },
  { to: '/archive', label: 'أرشيف التصاميم', icon: '🗂️', ownerOnly: false },
  { to: '/requests', label: 'طلبات الزبائن الواردة', icon: '📥', ownerOnly: false },
  { to: '/reports', label: 'التقارير', icon: '📈', ownerOnly: false },
  { to: '/settings', label: 'الإعدادات', icon: '⚙️', ownerOnly: true },
];

export default function Layout() {
  const { worker, logout, isOwner } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50">
      <aside className="flex w-64 shrink-0 flex-col border-l border-slate-200 bg-nili text-white">
        <div className="flex items-center gap-2 px-5 py-5 border-b border-white/10">
          <span className="text-2xl">🖨️</span>
          <div>
            <div className="font-bold text-lg leading-tight">RaqeemOS</div>
            <div className="text-xs text-gold-light">نظام إدارة المطبعة</div>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto py-3">
          {NAV_ITEMS.filter((i) => !i.ownerOnly || isOwner).map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `mx-2 mb-1 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
                  isActive ? 'bg-white/15 text-gold-light font-semibold' : 'text-white/85 hover:bg-white/10'
                }`
              }
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-white/10 px-4 py-4">
          <div className="mb-2 text-sm">
            <div className="font-semibold">{worker?.name}</div>
            <div className="text-xs text-white/60">{worker?.role === 'owner' ? 'مالك' : 'موظف'}</div>
          </div>
          <button
            onClick={() => {
              logout();
              navigate('/login');
            }}
            className="btn-secondary w-full !bg-white/10 !text-white hover:!bg-white/20"
          >
            تسجيل الخروج
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
