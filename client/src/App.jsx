import { useEffect, useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import LandingNew from './pages/LandingNew';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import NewOrder from './pages/NewOrder';
import OrdersList from './pages/OrdersList';
import OrderDetail from './pages/OrderDetail';
import Stock from './pages/Stock';
import Customers from './pages/Customers';
import CustomerDetail from './pages/CustomerDetail';
import Archive from './pages/Archive';
import Requests from './pages/Requests';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import PermissionsSettings from './pages/PermissionsSettings';
import ActivityLogs from './pages/ActivityLogs';
import Forbidden from './pages/Forbidden';
import Receipt from './pages/Receipt';
import MobileDashboard from './pages/MobileDashboard';
import LightboxOrder from './pages/LightboxOrder';
import Verify from './pages/Verify';
import Activation from './pages/Activation';
import TrialBanner from './components/TrialBanner';
import UpdateBanner from './components/UpdateBanner';
import { useLicense } from './hooks/useLicense';

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingNew />} />
      <Route path="/login" element={<Login />} />
      <Route path="/receipt/:id" element={<ProtectedRoute><Receipt /></ProtectedRoute>} />
      <Route path="/mobile" element={<ProtectedRoute><MobileDashboard /></ProtectedRoute>} />
      <Route path="/verify/:orderNumber" element={<Verify />} />

      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route
          path="/orders/new"
          element={
            <ProtectedRoute permission="create_order">
              <NewOrder />
            </ProtectedRoute>
          }
        />
        <Route
          path="/lightbox-orders"
          element={
            <ProtectedRoute permission="create_order">
              <LightboxOrder />
            </ProtectedRoute>
          }
        />
        <Route
          path="/orders"
          element={
            <ProtectedRoute permission="view_orders">
              <OrdersList />
            </ProtectedRoute>
          }
        />
        <Route
          path="/orders/:id"
          element={
            <ProtectedRoute permission="view_orders">
              <OrderDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/stock"
          element={
            <ProtectedRoute permission="view_inventory">
              <Stock />
            </ProtectedRoute>
          }
        />
        <Route
          path="/customers"
          element={
            <ProtectedRoute permission="view_customers">
              <Customers />
            </ProtectedRoute>
          }
        />
        <Route
          path="/customers/:id"
          element={
            <ProtectedRoute permission="view_customers">
              <CustomerDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/archive"
          element={
            <ProtectedRoute permission="view_customers">
              <Archive />
            </ProtectedRoute>
          }
        />
        <Route
          path="/requests"
          element={
            <ProtectedRoute permission="view_customers">
              <Requests />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports"
          element={
            <ProtectedRoute permission="view_reports">
              <Reports />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute ownerOnly>
              <Settings />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings/permissions"
          element={
            <ProtectedRoute permission="manage_roles">
              <PermissionsSettings />
            </ProtectedRoute>
          }
        />
        <Route
          path="/activity-logs"
          element={
            <ProtectedRoute permission="view_activity_logs">
              <ActivityLogs />
            </ProtectedRoute>
          }
        />
        <Route path="/403" element={<Forbidden />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  const { status, isElectron, refresh } = useLicense();
  const [showActivation, setShowActivation] = useState(false);
  const [updateInfo, setUpdateInfo] = useState(null);

  // تحديث تلقائي اختياري — يشتغل بالخلفية فقط داخل Electron، وإذا ماكو نت
  // ببساطة ما يصير شي (لا خطأ يظهر للمستخدم).
  useEffect(() => {
    if (!isElectron) return;
    window.raqeem.update.onDownloaded((info) => setUpdateInfo(info));
  }, [isElectron]);

  const updateBanner = updateInfo && (
    <UpdateBanner version={updateInfo.version} onInstall={() => window.raqeem.update.install()} />
  );

  // بمتصفح عادي (تطوير) ما بيه قفل ترخيص إطلاقاً — القفل يشتغل فقط داخل
  // النسخة المبنية بـ Electron.
  if (!isElectron || !status) {
    return <AppRoutes />;
  }

  if (status.status === 'expired') {
    return (
      <>
        <Activation status={status} onActivated={refresh} />
        {updateBanner}
      </>
    );
  }

  if (showActivation) {
    return (
      <>
        <Activation
          status={status}
          onActivated={() => {
            refresh();
            setShowActivation(false);
          }}
          onDismiss={() => setShowActivation(false)}
          allowDismiss
        />
        {updateBanner}
      </>
    );
  }

  return (
    <>
      <AppRoutes />
      {status.status === 'trial' && (
        <TrialBanner daysLeft={status.daysLeft} onActivateClick={() => setShowActivation(true)} />
      )}
      {updateBanner}
    </>
  );
}
