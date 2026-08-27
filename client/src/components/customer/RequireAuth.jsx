// src/components/customer/RequireAuth.jsx — gate routes behind sign-in.
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';

export default function RequireAuth({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-stone-400">
        <span className="animate-pulse">Loading…</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace state={{ loginRequired: true }} />;
  }

  return children;
}
