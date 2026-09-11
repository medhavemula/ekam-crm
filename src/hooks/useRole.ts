/**
 * Custom hooks for role-based access control
 */

import { useMemo, useState } from "react";
import { useAppSelector } from "../app/store";
import { createSelector } from "@reduxjs/toolkit";
import type { Role } from "../config/roles";
import { 
  getPrimaryRole, 
  isAdminRole, 
  hasHigherOrEqualRole,
  ROLE_LABELS,
  ROLE_HIERARCHY
} from "../config/roles";
import { canAccessRoute, getDefaultRouteForRole } from "../config/routeConfig";
import { useUserRolesQuery } from "../services/userRolesApi";

// Memoized selector to prevent unnecessary re-renders
const selectAuthState = createSelector(
  [(state: any) => state.auth.user, (state: any) => state.auth.role, (state: any) => state.auth.roles],
  (user, role, roles) => ({ user, role, roles })
);

/**
 * Hook to get current user's role information
 */
export function useRole() {
  const [isClient] = useState(() => typeof window !== 'undefined');
  const { role: authRole, roles: authRoles } = useAppSelector(selectAuthState);
  const { data: userRolesData, error: rolesError } = useUserRolesQuery();

  const [localStorageRole] = useState<{
    role: Role | null;
    roles: string[];
  }>(() => {
    if (typeof localStorage === 'undefined') return { role: null, roles: [] };
    const storedRole = localStorage.getItem('userRole');
    const storedRolesStr = localStorage.getItem('userRoles');
    const storedRoles = storedRolesStr ? JSON.parse(storedRolesStr) : [];
    if (storedRole && ROLE_HIERARCHY.includes(storedRole as Role)) {
      return { role: storedRole as Role, roles: storedRoles };
    }
    return { role: null, roles: [] };
  });

  const roleInfo = useMemo(() => {
    // Return default state during SSR/hydration
    if (!isClient) {
      return {
        role: "USER" as Role,
        roles: [] as string[],
        isAdmin: false,
        label: "User",
      };
    }

    // Priority: 1. Roles API data, 2. Auth state, 3. localStorage
    if (userRolesData?.data?.primaryRole?.role && !rolesError) {
      const apiRoles = userRolesData.data.assignments?.map(a => a.role) || [];
      return {
        role: userRolesData.data.primaryRole.role,
        roles: apiRoles,
        isAdmin: isAdminRole(userRolesData.data.primaryRole.role),
        label: ROLE_LABELS[userRolesData.data.primaryRole.role] || 'User',
      };
    }

    const assignmentRoles =
      userRolesData?.data?.assignments
        ?.map((a: any) => a.role)
        .filter(Boolean) || [];

    if (assignmentRoles.length > 0) {
      const primaryRole = getPrimaryRole(assignmentRoles);
      return {
        role: primaryRole,
        roles: assignmentRoles,
        isAdmin: isAdminRole(primaryRole),
        label: ROLE_LABELS[primaryRole] || "User",
      };
    }

    // The roles call is the authority, but it answers after the user does, and
    // the role this browser already knows about is a better answer in between
    // than "USER". This fallback used to be reached only while there was no
    // user at all, so the moment one arrived a signed-in admin was demoted for
    // as long as the roles call took — long enough for every role-dependent
    // page to render itself, then a generic version of itself, then itself
    // again. Nothing is granted by it: the server authorises every request.
    const knownRole: Role | null =
      authRole && ROLE_HIERARCHY.includes(authRole as Role)
        ? (authRole as Role)
        : localStorageRole.role;

    if (knownRole) {
      return {
        role: knownRole,
        roles: (authRoles?.length ? authRoles : localStorageRole.roles) as string[],
        isAdmin: isAdminRole(knownRole),
        label: ROLE_LABELS[knownRole] || "User",
      };
    }

    return {
      role: "USER" as Role,
      roles: [] as string[],
      isAdmin: false,
      label: "User",
    };
  }, [authRole, authRoles, localStorageRole, isClient, userRolesData, rolesError]);
  return roleInfo;
}

/**
 * Hook to check if user has a specific role
 */
export function useHasRole(requiredRole: Role): boolean {
  const { role } = useRole();
  return role === requiredRole;
}

/**
 * Hook to check if user has any of the specified roles
 */
export function useHasAnyRole(requiredRoles: Role[]): boolean {
  const { role } = useRole();
  return requiredRoles.includes(role);
}

/**
 * Hook to check if user has higher or equal role
 */
export function useHasMinimumRole(minimumRole: Role): boolean {
  const { role } = useRole();
  return hasHigherOrEqualRole(role, minimumRole);
}

/**
 * Hook to check if user is an admin
 */
export function useIsAdmin(): boolean {
  const { isAdmin } = useRole();
  return isAdmin;
}

/**
 * Hook to check if user can access a specific route
 */
export function useCanAccessRoute(routePath: string): boolean {
  const { role } = useRole();
  return canAccessRoute(role, routePath);
}

/**
 * Hook to get default route for current user's role
 */
export function useDefaultRoute(): string {
  const { role } = useRole();
  return getDefaultRouteForRole(role);
}

/**
 * Hook to get all role information and utilities
 */
export function useRoleUtils() {
  const roleInfo = useRole();
  const defaultRoute = useDefaultRoute();
  
  return {
    ...roleInfo,
    defaultRoute,
    hasRole: (requiredRole: Role) => roleInfo.role === requiredRole,
    hasAnyRole: (requiredRoles: Role[]) => requiredRoles.includes(roleInfo.role),
    hasMinimumRole: (minimumRole: Role) => hasHigherOrEqualRole(roleInfo.role, minimumRole),
    canAccessRoute: (routePath: string) => canAccessRoute(roleInfo.role, routePath),
  };
}
