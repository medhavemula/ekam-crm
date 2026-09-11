/**
 * RoleBasedRoute Component
 * Protects routes based on user roles
 */

import { Navigate } from "react-router-dom";
import type { ReactElement } from "react";
import { useRole } from "../../hooks/useRole";
import type { Role } from "../../config/roles";
import { canAccessRoute } from "../../config/routeConfig";

interface RoleBasedRouteProps {
  children: ReactElement;
  allowedRoles?: Role[];
  redirectTo?: string;
  requireAuth?: boolean;
}

/**
 * Route guard that checks if user has required role
 * If allowedRoles includes "USER", all authenticated users can access
 */
export function RoleBasedRoute({
  children,
  allowedRoles,
  redirectTo = "/dashboard",
  requireAuth = true,
}: RoleBasedRouteProps) {
  const { role, roles } = useRole();
  const isAuthed = typeof window !== "undefined" && !!localStorage.getItem("accessToken");

  // Check authentication first
  if (requireAuth && !isAuthed) {
    return <Navigate to="/login" replace />;
  }

  // If no specific roles required, allow access
  if (!allowedRoles || allowedRoles.length === 0) {
    return children;
  }

  // If "USER" is in allowed roles, all authenticated users can access
  if (allowedRoles.includes("USER")) {
    return children;
  }

  // Check every role the user holds, not just the primary one. Someone whose primary
  // role is USER may still hold EXECUTIVE_DIRECTOR, and matching on the primary alone
  // would lock them out of a page they are entitled to use.
  const held = new Set<string>([role, ...(roles || [])].filter(Boolean) as string[]);
  const hasAccess = allowedRoles.some((r) => held.has(r));

  if (!hasAccess) {
    return <Navigate to={redirectTo} replace />;
  }

  return children;
}

/**
 * Route guard that checks if user can access a specific path
 */
export function ProtectedRoute({ children }: { children: ReactElement }) {
  const isAuthed = typeof window !== "undefined" && !!localStorage.getItem("accessToken");
  
  if (!isAuthed) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
}

/**
 * Route guard for admin-only routes
 */
export function AdminRoute({ children }: { children: ReactElement }) {
  const { isAdmin } = useRole();
  const isAuthed = typeof window !== "undefined" && !!localStorage.getItem("accessToken");

  if (!isAuthed) {
    return <Navigate to="/login" replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

/**
 * Route guard that checks route access based on current path
 */
export function RouteAccessGuard({ 
  children, 
  path 
}: { 
  children: ReactElement; 
  path: string;
}) {
  const { role } = useRole();
  const isAuthed = typeof window !== "undefined" && !!localStorage.getItem("accessToken");

  if (!isAuthed) {
    return <Navigate to="/login" replace />;
  }

  const hasAccess = canAccessRoute(role, path);

  if (!hasAccess) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
