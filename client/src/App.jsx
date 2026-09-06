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
import Receipt from './pages/Receipt';
import MobileDashboard from './pages/MobileDashboard';
import LightboxOrder from './pages/LightboxOrder';
import DesignLab from './pages/_DesignLab';
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
        <Route path="/orders/new" element={<NewOrder />} />
        <Route path="/lightbox-orders" element={<LightboxOrder />} />
        <Route path="/design-lab" element={<DesignLab />} />
        <Route path="/orders" element={<OrdersList />} />
        <Route path="/orders/:id" element={<OrderDetail />} />
        <Route path="/stock" element={<Stock />} />
        <Route path="/customers" element={<Customers />} />
        <Route path="/customers/:id" element={<CustomerDetail />} />
        <Route path="/archive" element={<Archive />} />
        <Route path="/requests" element={<Requests />} />
        <Route path="/reports" element={<Reports />} />
        <Route
          path="/settings"
          element={
            <ProtectedRoute ownerOnly>
              <Settings />
            </ProtectedRoute>
          }
        />
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
