import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const ProtectedRoute = () => {
  const { isAuthenticated, isLoading } = useAuth();
  // Wait on the initial GET /auth/me check before deciding -- otherwise a
  // page refresh with a perfectly valid token still flashes to /login.
  if (isLoading) {
    return null;
  }
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
};

export default ProtectedRoute;
