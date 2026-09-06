import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function ProtectedRoute({ children, ownerOnly = false }) {
  const { worker, isOwner } = useAuth();
  if (!worker) return <Navigate to="/login" replace />;
  if (ownerOnly && !isOwner) return <Navigate to="/dashboard" replace />;
  return children;
}
