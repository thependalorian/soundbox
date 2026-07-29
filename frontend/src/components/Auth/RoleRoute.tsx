import { Navigate, Outlet } from 'react-router-dom';
import { useAuth, UserRole } from '../../context/AuthContext';

interface RoleRouteProps {
  allow: UserRole[];
}

/**
 * Route-level access control per the portal-requirements matrix (see
 * changelog.md) — a merchant hitting /merchants or /reports gets
 * redirected, not just a hidden nav link. This is what makes the three
 * roles feel like distinct portals rather than one shell with a couple of
 * toggled cards.
 */
const RoleRoute: React.FC<RoleRouteProps> = ({ allow }) => {
  const { user } = useAuth();
  if (!user || !allow.includes(user.role)) {
    return <Navigate to="/" replace />;
  }
  return <Outlet />;
};

export default RoleRoute;
