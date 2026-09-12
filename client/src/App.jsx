import { useEffect, useState } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import Layout from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { useAuth } from './context/AuthContext';
import LandingNew from './pages/LandingNew';
import Login from './pages/Login';
import Onboarding, { FIRST_LAUNCH_KEY } from './pages/Onboarding';
import SplashScreen from './components/SplashScreen';
import BootSplash from './components/BootSplash';
import Dashboard from './pages/Dashboard';
import NewOrder from './pages/NewOrder';
import OrdersList from './pages/OrdersList';
import OrderDetail from './pages/OrderDetail';
import PrintQueue from './pages/PrintQueue';
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

// Case C (دخول مباشر): إذا عندنا جلسة موجودة أصلاً، ما نعرض صفحة الهبوط
// التسويقية — نعرض splash قصير (800ms) وننتقل مباشرة للداشبورد (أو لمعالج
// الإعداد الأول إذا لسا ماكو). زائر بدون جلسة يشوف نفس صفحة الهبوط القديمة.
// هاي الصفحة الأولى اللي تفتح - تشوف اذا المستخدم مسجل دخول من قبل او لا
// وعلى هذا الأساس تقرر شنو تعرض
function RootGate() {
  const { worker } = useAuth();
  const navigate = useNavigate();

  // بمتصفح عادي (يعني مو داخل نسخة Electron المبنية - مثلاً وحد فتح رابط
  // التطوير direct بـ Chrome) نتخطى صفحة الهبوط التسويقية، ونعرض سبلاش
  // اقلاع قصير (2.5 ثانية) بنفس تصميم شاشة electron/splash.html، وبعدها
  // نوديه على طول لصفحة "من أنت؟" (تسجيل الدخول). داخل Electron نفسها
  // سبلاش الاقلاع الأصلي (electron/splash.html) يتكفل بهالجزء قبل لا حتى
  // تفتح هذي الصفحة، فما نكرره هنا.
  const isElectron = typeof window !== 'undefined' && !!window.raqeem?.isElectron;
  const [showWebSplash, setShowWebSplash] = useState(!isElectron && !worker);

  useEffect(() => {
    if (!showWebSplash) return;
    const timer = setTimeout(() => {
      setShowWebSplash(false);
      navigate('/login', { replace: true });
    }, 2500);
    return () => clearTimeout(timer);
  }, [showWebSplash, navigate]);

  // اذا عنده جلسة محفوظة، نعرضله splash خفيف وبعدها نوديه للداشبورد مباشرة
  // بدون ما يشوف صفحة الهبوط التسويقية من جديد
  useEffect(() => {
    if (!worker) return;
    const timer = setTimeout(() => {
      let firstLaunchDone = false;
      try {
        firstLaunchDone = localStorage.getItem(FIRST_LAUNCH_KEY) === 'true';
      } catch {
        firstLaunchDone = true;
      }
      navigate(firstLaunchDone ? '/dashboard' : '/onboarding', { replace: true });
    }, 800);
    return () => clearTimeout(timer);
  }, [worker, navigate]);

  if (worker) return <SplashScreen />;
  if (showWebSplash) return <BootSplash />;
  return <LandingNew />;
}

// هنا مسجلين كل صفحات التطبيق وشنو الصلاحية اللي تحتاجها كل وحدة منهن —
// اذا موظف ما عنده صلاحية، ProtectedRoute يردّه على صفحة 403
function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<RootGate />} />
      <Route path="/login" element={<Login />} />
      <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
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
          path="/print-queue"
          element={
            <ProtectedRoute permission="view_orders">
              <PrintQueue />
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

// هذا أكبر كومبوننت بالتطبيق - يفحص حالة الترخيص اول شي (منتهي، تجريبي،
// شغال عادي) وعلى هذا الأساس يقرر شنو يعرض للمستخدم
export default function App() {
  const { status, isElectron, refresh } = useLicense();
  const [showActivation, setShowActivation] = useState(false);
  const [updateInfo, setUpdateInfo] = useState(null);

  // لو كو تحديث جديد نزل بالخلفية، نخليه جاهز ونعرض بانر صغير - هذا يشتغل
  // بس داخل نسخة Electron المبنية، مو وقت التطوير
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
