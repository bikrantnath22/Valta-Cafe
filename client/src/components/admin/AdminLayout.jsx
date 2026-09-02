// src/components/admin/AdminLayout.jsx — shared dashboard shell for staff.
// Persistent sidebar nav (desktop) + slide-over drawer (mobile), with the
// active link highlighted. Renders the active admin page through <Outlet />.
// The "Admins" link is only shown to superadmins.
import { useState, useEffect } from 'react';
import { NavLink, Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { useNotifications } from '../../context/NotificationContext.jsx';
import NotificationBell from './NotificationBell.jsx';
import PWAInstallPrompt from '../shared/PWAInstallPrompt.jsx';
import { useSettings } from '../../store/settingsStore.js';

const NAV_ITEMS = [
  { to: 'orders', label: 'Orders', icon: 'orders' },
  { to: 'menu', label: 'Menu Items', icon: 'menu' },
  { to: 'categories', label: 'Categories', icon: 'categories' },
  { to: 'settings', label: 'Site Settings', icon: 'settings' },
  { to: 'analytics', label: 'Analytics', icon: 'analytics' },
  { to: 'users', label: 'Admins', icon: 'users', superadminOnly: true },
];

function NavIcon({ name }) {
  const common = {
    width: 18,
    height: 18,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true,
  };
  switch (name) {
    case 'orders':
      return (
        <svg {...common}>
          <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
          <path d="M3 6h18M16 10a4 4 0 0 1-8 0" />
        </svg>
      );
    case 'menu':
      return (
        <svg {...common}>
          <path d="M3 3h18v4H3zM3 10h18v4H3zM3 17h18v4H3z" />
        </svg>
      );
    case 'categories':
      return (
        <svg {...common}>
          <path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" />
        </svg>
      );
    case 'settings':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
        </svg>
      );
    case 'analytics':
      return (
        <svg {...common}>
          <path d="M3 3v18h18M7 15l3-3 3 3 5-6" />
        </svg>
      );
    case 'users':
      return (
        <svg {...common}>
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    default:
      return null;
  }
}

function SidebarContent({ items, user, onNavigate, onSignOut }) {
  const settings = useSettings((s) => s.settings);
  const cafeName = settings?.cafeName || 'VALTA Cafe';

  const linkClasses = ({ isActive }) =>
    [
      'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition',
      isActive
        ? 'bg-amber-600 text-white shadow-sm'
        : 'text-stone-300 hover:bg-stone-800 hover:text-white',
    ].join(' ');

  return (
    <div className="flex h-full flex-col">
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-5 py-5">
        {settings?.logo?.url ? (
          <img src={settings.logo.url} alt="Logo" className="h-9 w-9 rounded-full object-cover ring-2 ring-stone-800 shadow-sm" />
        ) : (
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-600 text-lg text-white shadow">
            ☕
          </span>
        )}
        <div className="leading-tight">
          <p className="text-sm font-bold text-white">{cafeName}</p>
          <p className="text-[11px] font-medium uppercase tracking-wide text-amber-400">
            Admin dashboard
          </p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
        {items.map((item) => (
          <NavLink key={item.to} to={item.to} end className={linkClasses} onClick={onNavigate}>
            <NavIcon name={item.icon} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Footer: view store + user + sign out */}
      <div className="border-t border-stone-800 px-3 py-3">
        <NavLink
          to="store"
          onClick={onNavigate}
          className={({ isActive }) =>
            `mb-2 flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
              isActive ? 'bg-amber-600 text-white shadow-sm' : 'text-stone-300 hover:bg-stone-800 hover:text-white'
            }`
          }
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <path d="M15 3h6v6M10 14 21 3" />
          </svg>
          View store
        </NavLink>

        <div className="rounded-lg bg-stone-800/70 px-3 py-2.5">
          <p className="truncate text-sm font-semibold text-white">{user?.name || 'Signed in'}</p>
          <p className="truncate text-xs text-stone-400">{user?.email}</p>
          <span className="mt-1 inline-block rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-300">
            {user?.role}
          </span>
        </div>

        <div className="flex gap-2 w-full mt-2">
          <button
            type="button"
            onClick={onSignOut}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-stone-700 px-3 py-2 text-sm font-medium text-stone-300 transition hover:border-rose-500 hover:bg-rose-950/40 hover:text-rose-300"
          >
            Sign out
          </button>
          {/* Desktop Bell */}
          <NotificationBell className="hidden md:flex shrink-0" />
        </div>
      </div>

      {/* PWA Install UI */}
      <PWAInstallPrompt appName="VALTA Cafe Admin" />
    </div>
  );
}

export default function AdminLayout() {
  const { user, signOut } = useAuth();
  const { subscribe } = useNotifications();
  const fetchSettings = useSettings((s) => s.fetch);
  const settings = useSettings((s) => s.settings);
  const cafeName = settings?.cafeName || 'VALTA Cafe';
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  useEffect(() => {
    return subscribe('new_order', (data) => {
      setToast(data.notification.message);
      setTimeout(() => setToast(null), 5000);
    });
  }, [subscribe]);

  const items = NAV_ITEMS.filter((i) => !i.superadminOnly || user?.role === 'superadmin');

  async function handleSignOut() {
    setDrawerOpen(false);
    await signOut();
    navigate('/', { replace: true });
  }

  return (
    <div className="min-h-screen bg-stone-100">
      {/* Desktop sidebar (fixed) */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col bg-stone-900 md:flex">
        <SidebarContent
          items={items}
          user={user}
          onNavigate={undefined}
          onSignOut={handleSignOut}
        />
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-stone-200 bg-white px-4 py-3 md:hidden">
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          aria-label="Open menu"
          className="rounded-lg p-2 text-stone-600 hover:bg-stone-100"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M3 6h18M3 12h18M3 18h18" />
          </svg>
        </button>
        <span className="flex flex-1 items-center justify-center gap-2 font-bold text-stone-900">
          {settings?.logo?.url ? (
            <img src={settings.logo.url} alt="Logo" className="h-6 w-6 rounded-full object-cover" />
          ) : (
            <span className="text-amber-600">☕</span>
          )}
          {cafeName} Admin
        </span>
        <NotificationBell className="flex shrink-0" />
      </header>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-stone-900/50"
            onClick={() => setDrawerOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute inset-y-0 left-0 w-64 bg-stone-900 shadow-xl">
            <SidebarContent
              items={items}
              user={user}
              onNavigate={() => setDrawerOpen(false)}
              onSignOut={handleSignOut}
            />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="md:pl-64">
        <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>

      {/* Global Toast */}
      {toast && (
        <div className="fixed bottom-4 right-4 z-50 rounded-xl bg-stone-900 px-4 py-3 text-sm font-medium text-white shadow-lg animate-in slide-in-from-bottom-5">
          {toast}
        </div>
      )}
    </div>
  );
}
