/**
 * Role-Based Access Control (RBAC) Configuration
 * Defines all roles, their hierarchy, and permissions
 */

export type Role =
  | "SUPER_ADMIN"
  | "SUPER_ADMIN_TEAM"
  | "EXECUTIVE_DIRECTOR"
  | "ED_TEAM"
  | "REGIONAL_DIRECTOR"
  | "ASSISTANT_REGIONAL_DIRECTOR"
  | "REGIONAL_GOVERNOR"
  | "ASSISTANT_REGIONAL_GOVERNOR"
  | "LAUNCH_GOVERNOR"
  | "LAUNCH_DIRECTOR"
  | "CHAPTER_DIRECTOR"
  | "SUPPORT_DIRECTOR"
  | "PRESIDENT"
  | "VICE_PRESIDENT"
  | "SOCIAL_CHAIRPERSON"
  | "USER";

/**
 * Role hierarchy - higher index = higher authority
 * Used for role comparison and access control
 */
export const ROLE_HIERARCHY: Role[] = [
  "USER",
  "VICE_PRESIDENT",
  "PRESIDENT",
  "SUPPORT_DIRECTOR",
  "CHAPTER_DIRECTOR",
  "LAUNCH_DIRECTOR",
  "ASSISTANT_REGIONAL_DIRECTOR",
  "REGIONAL_DIRECTOR",
  "ASSISTANT_REGIONAL_GOVERNOR",
  "REGIONAL_GOVERNOR",
  "ED_TEAM",
  "EXECUTIVE_DIRECTOR",
  "SOCIAL_CHAIRPERSON",
  "SUPER_ADMIN_TEAM",
  "SUPER_ADMIN",
];

/**
 * Admin roles - all roles except USER
 */
export const ADMIN_ROLES: Role[] = [
  "SUPER_ADMIN",
  "SUPER_ADMIN_TEAM",
  "EXECUTIVE_DIRECTOR",
  "ED_TEAM",
  "REGIONAL_DIRECTOR",
  "ASSISTANT_REGIONAL_DIRECTOR",
  "REGIONAL_GOVERNOR",
  "ASSISTANT_REGIONAL_GOVERNOR",
  "LAUNCH_GOVERNOR",
  "LAUNCH_DIRECTOR",
  "CHAPTER_DIRECTOR",
  "SUPPORT_DIRECTOR",
  "PRESIDENT",
  "VICE_PRESIDENT",
  "SOCIAL_CHAIRPERSON",
];

/**
 * Role display names for UI
 */
export const ROLE_LABELS: Record<Role, string> = {
  SUPER_ADMIN: "Super Admin",
  SUPER_ADMIN_TEAM: "Super Admin Team",
  EXECUTIVE_DIRECTOR: "Executive Director",
  ED_TEAM: "ED Team",
  REGIONAL_DIRECTOR: "Regional Director",
  ASSISTANT_REGIONAL_DIRECTOR: "Assistant Regional Director",
  REGIONAL_GOVERNOR: "Regional Governor",
  ASSISTANT_REGIONAL_GOVERNOR: "Assistant Regional Governor",
  LAUNCH_GOVERNOR: "Launch Governor",
  LAUNCH_DIRECTOR: "Launch Director",
  CHAPTER_DIRECTOR: "Chapter Director",
  SUPPORT_DIRECTOR: "Support Director",
  PRESIDENT: "President",
  VICE_PRESIDENT: "Vice President",
  SOCIAL_CHAIRPERSON: "Social Chairperson",
  USER: "User",
};

/**
 * Roles that the backend does not allow to be promoted through
 * the primary-role switch endpoint.
 */
export const NON_SWITCHABLE_PRIMARY_ROLES: Role[] = [
  "SUPER_ADMIN",
  "SUPER_ADMIN_TEAM",
  "EXECUTIVE_DIRECTOR",
  "ED_TEAM",
];

/**
 * Check if a role is an admin role
 */
export function isAdminRole(role: Role): boolean {
  return ADMIN_ROLES.includes(role);
}

/**
 * Get role level (higher number = higher authority)
 */
export function getRoleLevel(role: Role): number {
  return ROLE_HIERARCHY.indexOf(role);
}

/**
 * Check if role1 has higher or equal authority than role2
 */
export function hasHigherOrEqualRole(role1: Role, role2: Role): boolean {
  return getRoleLevel(role1) >= getRoleLevel(role2);
}

/**
 * Get primary role from multiple roles (highest in hierarchy)
 */
export function getPrimaryRole(roles: string[]): Role {
  if (!roles || roles.length === 0) return "USER";
  
  const validRoles = roles.filter((r) => 
    ROLE_HIERARCHY.includes(r as Role)
  ) as Role[];
  
  if (validRoles.length === 0) return "USER";
  
  return validRoles.reduce((highest, current) => 
    getRoleLevel(current) > getRoleLevel(highest) ? current : highest
  );
}

export function canSwitchToPrimaryRole(role: Role): boolean {
  return !NON_SWITCHABLE_PRIMARY_ROLES.includes(role);
}
