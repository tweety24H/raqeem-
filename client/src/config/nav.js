// Single source of truth for the app's main sections — consumed by both the
// Sidebar (Layout.jsx) and the Dashboard's "app sections" cards, so the two
// never drift and permission filtering (`ownerOnly`) is defined once.
export const NAV_ITEMS = [
  { to: '/dashboard', key: 'nav.dashboard', icon: '📊', ownerOnly: false, end: true },
  { to: '/orders/new', key: 'nav.newOrder', icon: '🧾', ownerOnly: false },
  { to: '/lightbox-orders', key: 'nav.lightboxOrder', icon: '💡', ownerOnly: false },
  { to: '/orders', key: 'nav.orders', icon: '📋', ownerOnly: false },
  { to: '/stock', key: 'nav.inventory', icon: '📦', ownerOnly: false },
  { to: '/customers', key: 'nav.customers', icon: '👥', ownerOnly: false },
  { to: '/archive', key: 'nav.archive', icon: '🗂️', ownerOnly: false },
  { to: '/requests', key: 'nav.requests', icon: '📥', ownerOnly: false },
  { to: '/reports', key: 'nav.reports', icon: '📈', ownerOnly: false },
  { to: '/settings', key: 'nav.settings', icon: '⚙️', ownerOnly: true },
];

// Subset shown as "app sections" cards on the Dashboard home — everything
// except the Dashboard link itself (already the page you're on).
export const DASHBOARD_SECTION_ITEMS = NAV_ITEMS.filter((item) => item.to !== '/dashboard');
