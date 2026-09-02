// src/components/customer/CustomerLayout.jsx — mobile-first shell for the
// customer app: sticky top bar (brand + cart), app-wide closed banner, a fixed
// bottom navigation bar, and the routed page content.
import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useSettings } from '../../store/settingsStore.js';
import PWAInstallPrompt from '../shared/PWAInstallPrompt.jsx';
import { useCart, selectCount } from '../../store/cartStore.js';
import { getMenu } from '../../lib/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useNotifications } from '../../context/NotificationContext.jsx';
import ClosedBanner from './ClosedBanner.jsx';

export default function CustomerLayout() {
  const fetchSettings = useSettings((s) => s.fetch);
  const settings = useSettings((s) => s.settings);
  const cartCount = useCart(selectCount);
  const { isAuthenticated, user, signOut, signInWithGoogle } = useAuth();
  const { unreadCount, markAllRead, subscribe } = useNotifications();
  const location = useLocation();
  const navigate = useNavigate();
  const [blinkSignIn, setBlinkSignIn] = useState(false);

  useEffect(() => {
    if (location.state?.loginRequired) {
      toast('Please sign in to continue!', {
        position: 'bottom-center',
        duration: 5000,
        icon: '👋',
        style: {
          marginBottom: '80px',
          borderRadius: '16px',
          background: '#292524',
          color: '#fff',
          fontWeight: 'bold',
          padding: '12px 20px',
        },
      });
      setBlinkSignIn(true);
      setTimeout(() => setBlinkSignIn(false), 5000);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location, navigate]);

  // Load cafe settings once on mount (drives the open/closed state app-wide).
  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Sync cart with live menu on mount so prices and availability are up-to-date
  useEffect(() => {
    let active = true;
    const syncCart = async () => {
      try {
        const { items = [] } = await getMenu();
        if (!active) return;
        const liveById = new Map(items.map(i => [i._id, i]));
        useCart.setState(state => ({
          items: state.items.map(cartItem => {
            const live = liveById.get(cartItem.foodItemId);
            if (!live) return { ...cartItem, isAvailable: false }; // Mark deleted items as unavailable
            return {
              ...cartItem,
              price: live.price,
              name: live.name,
              isAvailable: live.isAvailable,
            };
          })
        }));
      } catch (err) {
        console.error('Failed to sync cart on mount', err);
      }
    };
    syncCart();
    return () => { active = false; };
  }, []);

  // Listen for real-time broadcast events
  useEffect(() => {
    const unsubSettings = subscribe('settings_updated', () => {
      fetchSettings();
    });

    const unsubMenu = subscribe('menu_updated', async () => {
      try {
        const { items = [] } = await getMenu();
        const liveById = new Map(items.map(i => [i._id, i]));
        useCart.setState(state => ({
          items: state.items.map(cartItem => {
            const live = liveById.get(cartItem.foodItemId);
            if (!live) return { ...cartItem, isAvailable: false };
            return {
              ...cartItem,
              price: live.price,
              name: live.name,
              isAvailable: live.isAvailable,
            };
          })
        }));
        window.dispatchEvent(new Event('valta_menu_updated'));
      } catch (err) {
        console.error('Failed to sync menu updates', err);
      }
    });

    return () => {
      unsubSettings();
      unsubMenu();
    };
  }, [subscribe, fetchSettings]);

  const cafeName = settings?.cafeName || 'VALTA Cafe';

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col bg-stone-50 text-stone-800 shadow-sm">
      {/* Top bar */}
      <header className="sticky top-0 z-40 flex items-center justify-between gap-3 bg-white/90 px-4 py-3 backdrop-blur-md shadow-[0_4px_20px_-10px_rgba(0,0,0,0.1)] border-b border-white/20">
        <Link to="/" className="flex items-center gap-2.5">
          {settings?.logo?.url ? (
            <img src={settings.logo.url} alt="Logo" className="h-10 w-10 rounded-xl object-cover ring-2 ring-white shadow-sm" />
          ) : (
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 text-xl text-white shadow-sm ring-2 ring-white">
              ☕
            </span>
          )}
          <span className="text-lg font-black tracking-tight text-stone-900 drop-shadow-sm">{cafeName}</span>
        </Link>

        <div className="flex items-center gap-1">
          {isAuthenticated && (user?.role === 'admin' || user?.role === 'superadmin') && (
            <a
              href="/admin/"
              className="mr-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-amber-700 transition hover:bg-amber-50"
            >
              Dashboard
            </a>
          )}

          {isAuthenticated && (
            <Link
              to="/notifications"
              onClick={() => markAllRead()}
              className="relative flex h-10 w-10 items-center justify-center rounded-full text-stone-700 transition hover:bg-stone-100"
              aria-label="Notifications"
            >
              <BellIcon />
              {unreadCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-rose-500 px-1 text-[11px] font-bold text-white ring-2 ring-white">
                  {unreadCount}
                </span>
              )}
            </Link>
          )}

          {!isAuthenticated && (
            <>
              <Link
                to="/admin-login"
                className="mr-2 text-xs font-semibold text-stone-600 hover:text-stone-900 transition"
              >
                Admin
              </Link>
              <button
                type="button"
                onClick={signInWithGoogle}
                className={`mr-2 flex items-center justify-center rounded-lg px-3 py-1.5 text-xs font-bold shadow-sm transition ${
                  blinkSignIn ? 'bg-amber-500 text-white animate-pulse ring-4 ring-amber-500/50' : 'bg-white text-stone-700 border border-stone-200 hover:bg-stone-50'
                }`}
              >
                <GoogleIcon />
                Sign In
              </button>
            </>
          )}

          <Link
            to="/cart"
            className="relative flex h-10 w-10 items-center justify-center rounded-full text-stone-700 transition hover:bg-stone-100"
            aria-label={`Cart with ${cartCount} item${cartCount === 1 ? '' : 's'}`}
          >
            <CartIcon />
            {cartCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-amber-600 px-1 text-[11px] font-bold text-white">
                {cartCount}
              </span>
            )}
          </Link>
        </div>
      </header>

      <ClosedBanner />

      {/* Routed content — bottom padding clears the fixed nav bar. */}
      <main className="flex-1 px-4 pb-24 pt-2">
        <Outlet />
      </main>

      {/* Bottom navigation */}
      <nav className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-lg border-t border-stone-200 bg-white">
        <div className="grid grid-cols-3">
          <BottomTab to="/" label="Menu" icon={<MenuIcon />} end />
          <BottomTab to="/orders" label="Orders" icon={<ReceiptIcon />} />
          <BottomTab to="/account/addresses" label="Account" icon={<UserIcon />} />
        </div>
      </nav>
      {/* PWA Install UI */}
      <PWAInstallPrompt appName="VALTA Cafe" />
    </div>
  );
}

function BottomTab({ to, label, icon, end = false }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        [
          'flex flex-col items-center justify-center gap-0.5 py-2.5 text-[11px] font-medium transition',
          isActive ? 'text-amber-700' : 'text-stone-500 hover:text-stone-800',
        ].join(' ')
      }
    >
      {icon}
      <span>{label}</span>
    </NavLink>
  );
}

/* --- Inline icons --- */
function CartIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M3 4h2l2.4 12.3a1 1 0 0 0 1 .8h8.7a1 1 0 0 0 1-.8L21 8H6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="10" cy="20" r="1.4" fill="currentColor" />
      <circle cx="17" cy="20" r="1.4" fill="currentColor" />
    </svg>
  );
}
function MenuIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 6h16M4 12h16M4 18h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
function ReceiptIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M6 3h12v18l-3-1.5L12 21l-3-1.5L6 21V3Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M9 8h6M9 12h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
function UserIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M4.5 20a7.5 7.5 0 0 1 15 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
function BellIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 18 18" aria-hidden="true" className="mr-1.5">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.85.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.47.9 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z"
      />
    </svg>
  );
}
