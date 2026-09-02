import { Routes, Route, Link, Navigate } from 'react-router-dom';
import CustomerLayout from './components/customer/CustomerLayout.jsx';
import RequireAuth from './components/customer/RequireAuth.jsx';
import MenuPage from './pages/customer/MenuPage.jsx';
import CartPage from './pages/customer/CartPage.jsx';
import CheckoutPage from './pages/customer/CheckoutPage.jsx';
import OrdersPage from './pages/customer/OrdersPage.jsx';
import OrderDetailPage from './pages/customer/OrderDetailPage.jsx';
import NotificationsPage from './pages/customer/NotificationsPage.jsx';
import AddressesPage from './pages/customer/AddressesPage.jsx';
import AdminLoginPage from './pages/customer/AdminLoginPage.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';

import { Toaster } from 'react-hot-toast';

// Customer-facing browsing (menu/cart) is public; ordering, order history, and
// account pages require sign-in. The /admin subtree is role-gated for staff.
export default function App() {
  return (
    <ErrorBoundary>
      <Toaster />
      <Routes>
      {/* Everything else lives inside the mobile app shell. */}
      <Route element={<CustomerLayout />}>
        <Route path="/" element={<MenuPage />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/admin-login" element={<AdminLoginPage />} />

        <Route
          path="/checkout"
          element={
            <RequireAuth>
              <CheckoutPage />
            </RequireAuth>
          }
        />
        <Route
          path="/orders"
          element={
            <RequireAuth>
              <OrdersPage />
            </RequireAuth>
          }
        />
        <Route
          path="/orders/:orderId"
          element={
            <RequireAuth>
              <OrderDetailPage />
            </RequireAuth>
          }
        />
        <Route
          path="/account/addresses"
          element={
            <RequireAuth>
              <AddressesPage />
            </RequireAuth>
          }
        />
        <Route
          path="/notifications"
          element={
            <RequireAuth>
              <NotificationsPage />
            </RequireAuth>
          }
        />

        {/* Unknown URLs redirect to home */}
        <Route
          path="*"
          element={<Navigate to="/" replace />}
        />
      </Route>
    </Routes>
    </ErrorBoundary>
  );
}
