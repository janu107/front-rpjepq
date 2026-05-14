import { Navigate, Outlet } from "react-router-dom";

import LoadingScreen from "../components/common/LoadingScreen";
import { useAuth } from "../context/AuthContext";
import Unauthorized from "../pages/Unauthorized";
import { hasRole } from "../utils/permissions";

const ProtectedRoute = ({ allowedRoles, children }) => {
  const { isAuthenticated, loading } = useAuth();
  const { user } = useAuth();

  if (loading) {
    return <LoadingScreen message="Validando sesion..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles?.length && !hasRole(user, allowedRoles)) {
    return <Unauthorized />;
  }

  return children || <Outlet />;
};

export default ProtectedRoute;
