// src/components/admin/RequireRole.jsx — gate routes behind a set of roles.
// Must run inside <AuthProvider>. Unauthenticated users go to /login; signed-in
// users whose role isn't allowed are redirected (default: the customer home).
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';

export default function RequireRole({ roles, children, redirectTo = '/' }) {
  const { user, isAuthenticated, loading } = useAuth();
  const location = useLocation();
  const allowed = Array.isArray(roles) ? roles : [roles];

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-stone-400">
        <span className="animate-pulse">Loading…</span>
      </div>
    );
  }

  if (!isAuthenticated || !allowed.includes(user.role)) {
    window.location.replace('/');
    return null;
  }

  return children;
}
