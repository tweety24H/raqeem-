// Single source of truth for the app's main sections — consumed by both the
// Sidebar (Layout.jsx) and the Dashboard's "app sections" cards, so the two
// never drift and permission filtering (`ownerOnly`/`permission`) is defined
// once. `permission` gates by the worker's effective permissions (direct +
// role) exactly like server middleware/auth.js's checkPermission — a worker
// missing it doesn't see the link (and the matching route in App.jsx blocks
// direct navigation too).
export const NAV_ITEMS = [
  { to: '/dashboard', key: 'nav.dashboard', icon: '📊', ownerOnly: false, end: true },
  { to: '/orders/new', key: 'nav.newOrder', icon: '🧾', ownerOnly: false, permission: 'create_order' },
  { to: '/lightbox-orders', key: 'nav.lightboxOrder', icon: '💡', ownerOnly: false, permission: 'create_order' },
  { to: '/orders', key: 'nav.orders', icon: '📋', ownerOnly: false, permission: 'view_orders' },
  { to: '/stock', key: 'nav.inventory', icon: '📦', ownerOnly: false, permission: 'view_inventory' },
  { to: '/customers', key: 'nav.customers', icon: '👥', ownerOnly: false, permission: 'view_customers' },
  { to: '/archive', key: 'nav.archive', icon: '🗂️', ownerOnly: false, permission: 'view_customers' },
  { to: '/requests', key: 'nav.requests', icon: '📥', ownerOnly: false, permission: 'view_customers' },
  { to: '/reports', key: 'nav.reports', icon: '📈', ownerOnly: false, permission: 'view_reports' },
  // Task 6: Activity Log — visible to the owner always; a non-owner with the
  // view_activity_logs permission also sees it (checked via `permission` in
  // SidebarGlass/Dashboard, since ownerOnly alone would hide it from them).
  { to: '/activity-logs', key: 'nav.activityLogs', icon: '🕓', ownerOnly: false, permission: 'view_activity_logs' },
  { to: '/settings', key: 'nav.settings', icon: '⚙️', ownerOnly: true },
  { to: '/settings/permissions', key: 'nav.permissions', icon: '🔐', ownerOnly: false, permission: 'manage_roles' },
];

// Subset shown as "app sections" cards on the Dashboard home — everything
// except the Dashboard link itself (already the page you're on).
export const DASHBOARD_SECTION_ITEMS = NAV_ITEMS.filter((item) => item.to !== '/dashboard');
