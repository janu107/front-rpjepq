import { Navigate, Outlet, useLocation } from "react-router-dom";

import LoadingScreen from "../components/common/LoadingScreen";
import { useAuth } from "../context/AuthContext";
import Unauthorized from "../pages/Unauthorized";
import { puedeEntrar } from "../utils/permissions";

const ProtectedRoute = ({ allowedRoles, children }) => {
  const { isAuthenticated, loading } = useAuth();
  const { user } = useAuth();
  const { pathname } = useLocation();

  if (loading) {
    return <LoadingScreen message="Validando sesion..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles?.length && !puedeEntrar(user, pathname, allowedRoles)) {
    return <Unauthorized />;
  }

  return children || <Outlet />;
};

export default ProtectedRoute;
