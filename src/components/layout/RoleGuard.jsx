import { Navigate } from "react-router-dom";
import { useAuthStore } from "@/store/useAuthStore";
import LoadingScreen from "@/components/layout/LoadingScreen";

/**
 * Protects a route by required role.
 * Redirects to / if user doesn't have the required role.
 */
export default function RoleGuard({ requiredRole, children }) {
  const { role, loading } = useAuthStore();

  if (loading) return <LoadingScreen />;
  const allowed = Array.isArray(requiredRole) ? requiredRole.includes(role) : role === requiredRole;
  if (!allowed) return <Navigate to="/" replace />;
  return children;
}
