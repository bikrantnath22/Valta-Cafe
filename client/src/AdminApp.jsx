import { Routes, Route, Navigate } from 'react-router-dom';
import RequireRole from './components/admin/RequireRole.jsx';
import AdminLayout from './components/admin/AdminLayout.jsx';
import AdminOrdersPage from './pages/admin/AdminOrdersPage.jsx';
import AdminMenuPage from './pages/admin/AdminMenuPage.jsx';
import AdminCategoriesPage from './pages/admin/AdminCategoriesPage.jsx';
import AdminSettingsPage from './pages/admin/AdminSettingsPage.jsx';
import AdminAnalyticsPage from './pages/admin/AdminAnalyticsPage.jsx';
import AdminUsersPage from './pages/admin/AdminUsersPage.jsx';
import MenuPage from './pages/customer/MenuPage.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import { Toaster } from 'react-hot-toast';

export default function AdminApp() {
  return (
    <ErrorBoundary>
      <Toaster />
      <Routes>
        <Route
          path="/"
          element={
            <RequireRole roles={['admin', 'superadmin']}>
              <AdminLayout />
            </RequireRole>
          }
        >
          <Route index element={<Navigate to="orders" replace />} />
          <Route path="store" element={<MenuPage readOnly={true} />} />
          <Route path="orders" element={<AdminOrdersPage />} />
          <Route path="menu" element={<AdminMenuPage />} />
          <Route path="categories" element={<AdminCategoriesPage />} />
          <Route path="settings" element={<AdminSettingsPage />} />
          <Route path="analytics" element={<AdminAnalyticsPage />} />
          <Route
            path="users"
            element={
              <RequireRole roles={['superadmin']} redirectTo="/">
                <AdminUsersPage />
              </RequireRole>
            }
          />
          <Route path="*" element={<Navigate to="orders" replace />} />
        </Route>
      </Routes>
    </ErrorBoundary>
  );
}
