import { Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { AppLayout } from '@/layouts/AppLayout';
import { AuthProvider } from '@/contexts/AuthContext';
import LoginPage from '@/pages/LoginPage';

const DashboardPage      = lazy(() => import('@/pages/DashboardPage'));
const InventoryPage      = lazy(() => import('@/pages/InventoryPage'));
const ProductsPage       = lazy(() => import('@/pages/ProductsPage'));
const NightlyPage        = lazy(() => import('@/pages/NightlyPage'));
const SuppliersPage      = lazy(() => import('@/pages/SuppliersPage'));
const PurchaseOrdersPage = lazy(() => import('@/pages/PurchaseOrdersPage'));
const ReportsPage        = lazy(() => import('@/pages/ReportsPage'));
const ActivityPage       = lazy(() => import('@/pages/ActivityPage'));
const SettingsPage       = lazy(() => import('@/pages/SettingsPage'));
const ImportPage         = lazy(() => import('@/pages/ImportPage'));

function Spinner() {
  return (
    <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)', fontFamily: "'DM Mono', monospace" }}>
      Loading…
    </div>
  );
}

function withSuspense(Component: React.ComponentType) {
  return (
    <Suspense fallback={<Spinner />}>
      <Component />
    </Suspense>
  );
}

export function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/app" element={<AppLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard"       element={withSuspense(DashboardPage)} />
          <Route path="inventory"       element={withSuspense(InventoryPage)} />
          <Route path="products"        element={withSuspense(ProductsPage)} />
          <Route path="nightly"         element={withSuspense(NightlyPage)} />
          <Route path="suppliers"       element={withSuspense(SuppliersPage)} />
          <Route path="purchase-orders" element={withSuspense(PurchaseOrdersPage)} />
          <Route path="reports"         element={withSuspense(ReportsPage)} />
          <Route path="activity"        element={withSuspense(ActivityPage)} />
          <Route path="settings"        element={withSuspense(SettingsPage)} />
          <Route path="import"          element={withSuspense(ImportPage)} />
        </Route>
        <Route path="*" element={<Navigate to="/app/dashboard" replace />} />
      </Routes>
    </AuthProvider>
  );
}
