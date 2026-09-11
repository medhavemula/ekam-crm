/**
 * Route Configuration for Role-Based Access Control
 * Defines which routes are accessible to which roles
 */

import type { Role } from "./roles";
import { getPrimaryRole } from "./roles";

export interface RouteConfig {
  path: string;
  allowedRoles: Role[];
  redirectTo?: string; // Where to redirect if access denied
}

/**
 * Route access configuration
 * If allowedRoles includes "USER", all authenticated users can access
 * Otherwise, only specified admin roles can access
 */
export const ROUTE_ACCESS: RouteConfig[] = [
  // Dashboard - All authenticated users
  {
    path: "/dashboard",
    allowedRoles: ["USER"], // USER means all authenticated users
  },
  
  // Business Routes - All users
  {
    path: "/business/p2p",
    allowedRoles: ["USER"],
  },
  {
    path: "/business/opportunity-given",
    allowedRoles: ["USER"],
  },
  {
    path: "/business/opportunity-received",
    allowedRoles: ["USER"],
  },
  {
    path: "/business/upcoming-events",
    allowedRoles: ["USER"],
  },
  {
    path: "/business/meetings",
    allowedRoles: ["USER"],
  },
  {
    path: "/business/visitors",
    allowedRoles: ["USER"],
  },
  {
    path: "/business/many-to-one",
    allowedRoles: ["USER"],
  },
  {
    path: "/business/business-received",
    allowedRoles: ["USER"],
  },
  {
    path: "/business/testimonials",
    allowedRoles: ["USER"],
  },
  {
    path: "/business/my-feed",
    allowedRoles: ["USER"],
  },
  {
    path: "/business/connections",
    allowedRoles: ["USER"],
  },
  
  // Profile - All users
  {
    path: "/profile",
    allowedRoles: ["USER"],
  },

  // ED Profile - ED roles
  {
    path: "/ed/profile",
    allowedRoles: [
      "EXECUTIVE_DIRECTOR",
      "ED_TEAM",
      "REGIONAL_DIRECTOR",
      "ASSISTANT_REGIONAL_DIRECTOR",
    ],
  },

  // Groups - All users
  {
    path: "/groups",
    allowedRoles: ["USER"],
  },
  {
    path: "/groups/create",
    allowedRoles: ["USER"],
  },

  // Social Messages - All users
  {
    path: "/social/messages",
    allowedRoles: ["USER"],
  },
  {
    path: "/social/messages/:threadId",
    allowedRoles: ["USER"],
  },
  
  // Reports - All users
  {
    path: "/reports/personal-palms",
    allowedRoles: ["USER"],
  },
  {
    path: "/reports/opportunity-received",
    allowedRoles: ["USER"],
  },
  {
    path: "/reports/visitor-registration",
    allowedRoles: ["USER"],
  },
  {
    path: "/reports/sponsor",
    allowedRoles: ["USER"],
  },
  {
    path: "/reports/palms-attendance",
    allowedRoles: ["USER"],
  },
  {
    path: "/reports/weekly",
    allowedRoles: ["USER"],
  },
  {
    path: "/reports/personal-many-to-one",
    allowedRoles: ["USER"],
  },
  
  // Social Admin Routes - For Social Chairperson
  {
    path: "/social/admin/dashboard",
    allowedRoles: ["SOCIAL_CHAIRPERSON", "REGIONAL_GOVERNOR", "ASSISTANT_REGIONAL_GOVERNOR", "LAUNCH_GOVERNOR"],
  },
  {
    path: "/social/admin/upcoming-events/:eventId/members",
    allowedRoles: ["SOCIAL_CHAIRPERSON", "REGIONAL_GOVERNOR", "ASSISTANT_REGIONAL_GOVERNOR", "LAUNCH_GOVERNOR"],
  },
  {
    path: "/social/admin/regional-board",
    allowedRoles: ["SOCIAL_CHAIRPERSON", "REGIONAL_GOVERNOR", "ASSISTANT_REGIONAL_GOVERNOR", "LAUNCH_GOVERNOR"],
  },
  {
    path: "/social/admin/regional-team",
    allowedRoles: ["SOCIAL_CHAIRPERSON", "REGIONAL_GOVERNOR", "ASSISTANT_REGIONAL_GOVERNOR", "LAUNCH_GOVERNOR"],
  },
  {
    path: "/social/admin/team",
    allowedRoles: ["SOCIAL_CHAIRPERSON", "REGIONAL_GOVERNOR", "ASSISTANT_REGIONAL_GOVERNOR", "LAUNCH_GOVERNOR"],
  },
  {
    path: "/social/manage-voluntary",
    allowedRoles: ["SOCIAL_CHAIRPERSON", "REGIONAL_GOVERNOR", "ASSISTANT_REGIONAL_GOVERNOR", "LAUNCH_GOVERNOR"],
  },

  // Admin Routes - Only for admin roles
  {
    path: "/admin/users",
    allowedRoles: [
      "SUPER_ADMIN",
      "SUPER_ADMIN_TEAM",
      "EXECUTIVE_DIRECTOR",
      "ED_TEAM",
      "REGIONAL_DIRECTOR",
      "ASSISTANT_REGIONAL_DIRECTOR",
      "CHAPTER_DIRECTOR",
    ],
  },
  {
    path: "/admin/pending-approvals",
    allowedRoles: [
      "SUPER_ADMIN",
      "SUPER_ADMIN_TEAM",
      "EXECUTIVE_DIRECTOR",
      "ED_TEAM",
      "REGIONAL_DIRECTOR",
      "ASSISTANT_REGIONAL_DIRECTOR",
      "LAUNCH_DIRECTOR",
      "CHAPTER_DIRECTOR",
      "SUPPORT_DIRECTOR",
    ],
  },
  {
    path: "/admin/chapters",
    allowedRoles: [
      "SUPER_ADMIN",
      "SUPER_ADMIN_TEAM",
      "EXECUTIVE_DIRECTOR",
      "ED_TEAM",
      "REGIONAL_DIRECTOR",
      "CHAPTER_DIRECTOR",
    ],
  },
  {
    path: "/admin/regions",
    allowedRoles: [
      "SUPER_ADMIN",
      "SUPER_ADMIN_TEAM",
      "EXECUTIVE_DIRECTOR",
      "ED_TEAM",
      "REGIONAL_DIRECTOR",
    ],
  },
  {
    path: "/admin/roles",
    allowedRoles: [
      "SUPER_ADMIN",
      "EXECUTIVE_DIRECTOR",
      "REGIONAL_DIRECTOR",
      "ASSISTANT_REGIONAL_DIRECTOR",
    ],
  },
  {
    path: "/admin/groups",
    allowedRoles: [
      "EXECUTIVE_DIRECTOR",
      "REGIONAL_DIRECTOR",
      "ASSISTANT_REGIONAL_DIRECTOR",
    ],
  },
  {
    path: "/admin/settings",
    allowedRoles: ["SUPER_ADMIN", "SUPER_ADMIN_TEAM"],
  },
];

/**
 * Default dashboard routes for each role
 * All roles now use the unified /dashboard route
 */
export const ROLE_DEFAULT_ROUTES: Record<Role, string> = {
  SUPER_ADMIN: "/dashboard",
  SUPER_ADMIN_TEAM: "/dashboard",
  EXECUTIVE_DIRECTOR: "/dashboard",
  ED_TEAM: "/dashboard",
  REGIONAL_DIRECTOR: "/dashboard",
  ASSISTANT_REGIONAL_DIRECTOR: "/dashboard",
  LAUNCH_DIRECTOR: "/dashboard",
  CHAPTER_DIRECTOR: "/dashboard",
  SUPPORT_DIRECTOR: "/dashboard",
  PRESIDENT: "/dashboard",
  VICE_PRESIDENT: "/dashboard",
  SOCIAL_CHAIRPERSON: "/social/admin/dashboard",
  REGIONAL_GOVERNOR: "/social/admin/dashboard",
  ASSISTANT_REGIONAL_GOVERNOR: "/social/admin/dashboard",
  LAUNCH_GOVERNOR: "/social/admin/dashboard",
  USER: "/dashboard",
};

export const SOCIAL_ADMIN_ROLES: Role[] = [
  "SOCIAL_CHAIRPERSON",
  "REGIONAL_GOVERNOR",
  "ASSISTANT_REGIONAL_GOVERNOR",
  "LAUNCH_GOVERNOR",
];

export function getDashboardRouteForRoles(roles: Array<Role | string | null | undefined>): string {
  const validRoles = roles.filter(Boolean) as string[];

  if (validRoles.some((role) => SOCIAL_ADMIN_ROLES.includes(role as Role))) {
    return "/social/admin/dashboard";
  }

  return getDefaultRouteForRole(getPrimaryRole(validRoles));
}

/**
 * Check if a role has access to a specific route
 */
export function canAccessRoute(userRole: Role, routePath: string): boolean {
  const routeConfig = ROUTE_ACCESS.find((r) => routePath.startsWith(r.path));
  
  if (!routeConfig) {
    // If route not in config, allow access (default behavior)
    return true;
  }
  
  // If USER is in allowed roles, all authenticated users can access
  if (routeConfig.allowedRoles.includes("USER")) {
    return true;
  }
  
  // Check if user's role is in allowed roles
  return routeConfig.allowedRoles.includes(userRole);
}

/**
 * Get default route for a role
 */
export function getDefaultRouteForRole(role: Role): string {
  return ROLE_DEFAULT_ROUTES[role] || "/dashboard";
}

/**
 * Get accessible routes for a role
 */
export function getAccessibleRoutes(role: Role): string[] {
  return ROUTE_ACCESS
    .filter((route) => canAccessRoute(role, route.path))
    .map((route) => route.path);
}
