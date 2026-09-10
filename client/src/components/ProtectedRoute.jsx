import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Task 7: `permission` gates a route behind a specific permission slug (see
// server/db/schema.sql's permissions table) — a worker missing it is sent to
// the 403 page instead of being silently redirected to the dashboard, so they
// understand why they can't get in.
export function ProtectedRoute({ children, ownerOnly = false, permission }) {
  const { worker, isOwner, hasPermission } = useAuth();
  if (!worker) return <Navigate to="/login" replace />;
  if (ownerOnly && !isOwner) return <Navigate to="/dashboard" replace />;
  if (permission && !hasPermission(permission)) return <Navigate to="/403" replace />;
  return children;
}
