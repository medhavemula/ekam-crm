import type { Role } from './roles';

/**
 * Permission constants - defines all available permissions in the system
 */
export const Permission = {
  // User permissions
  VIEW_USERS: 'VIEW_USERS',
  CREATE_USERS: 'CREATE_USERS',
  EDIT_USERS: 'EDIT_USERS',
  DELETE_USERS: 'DELETE_USERS',
  
  // Chapter permissions
  VIEW_CHAPTERS: 'VIEW_CHAPTERS',
  CREATE_CHAPTERS: 'CREATE_CHAPTERS',
  EDIT_CHAPTERS: 'EDIT_CHAPTERS',
  DELETE_CHAPTERS: 'DELETE_CHAPTERS',
  
  // Role permissions
  MANAGE_ROLES: 'MANAGE_ROLES',
  
  // System permissions
  SYSTEM_SETTINGS: 'SYSTEM_SETTINGS',
  
  // Event permissions
  VIEW_EVENTS: 'VIEW_EVENTS',
  CREATE_EVENTS: 'CREATE_EVENTS',
  EDIT_EVENTS: 'EDIT_EVENTS',
  DELETE_EVENTS: 'DELETE_EVENTS',
  
  // Region permissions
  VIEW_REGIONS: 'VIEW_REGIONS',
  CREATE_REGIONS: 'CREATE_REGIONS',
  EDIT_REGIONS: 'EDIT_REGIONS',
  DELETE_REGIONS: 'DELETE_REGIONS',
  
  // Country permissions
  VIEW_COUNTRIES: 'VIEW_COUNTRIES',
  CREATE_COUNTRIES: 'CREATE_COUNTRIES',
  EDIT_COUNTRIES: 'EDIT_COUNTRIES',
  DELETE_COUNTRIES: 'DELETE_COUNTRIES',
} as const;

export type Permission = typeof Permission[keyof typeof Permission];

/**
 * Role-based permissions mapping
 * Defines which permissions each role has
 */
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  SUPER_ADMIN: [
    // Super admin has all permissions
    Permission.VIEW_USERS,
    Permission.CREATE_USERS,
    Permission.EDIT_USERS,
    Permission.DELETE_USERS,
    Permission.VIEW_CHAPTERS,
    Permission.CREATE_CHAPTERS,
    Permission.EDIT_CHAPTERS,
    Permission.DELETE_CHAPTERS,
    Permission.MANAGE_ROLES,
    Permission.SYSTEM_SETTINGS,
    Permission.VIEW_EVENTS,
    Permission.CREATE_EVENTS,
    Permission.EDIT_EVENTS,
    Permission.DELETE_EVENTS,
    Permission.VIEW_REGIONS,
    Permission.CREATE_REGIONS,
    Permission.EDIT_REGIONS,
    Permission.DELETE_REGIONS,
    Permission.VIEW_COUNTRIES,
    Permission.CREATE_COUNTRIES,
    Permission.EDIT_COUNTRIES,
    Permission.DELETE_COUNTRIES,
  ],
  SUPER_ADMIN_TEAM: [
    // Super admin team has most permissions but not role management
    Permission.VIEW_USERS,
    Permission.CREATE_USERS,
    Permission.EDIT_USERS,
    Permission.DELETE_USERS,
    Permission.VIEW_CHAPTERS,
    Permission.CREATE_CHAPTERS,
    Permission.EDIT_CHAPTERS,
    Permission.DELETE_CHAPTERS,
    Permission.SYSTEM_SETTINGS,
    Permission.VIEW_EVENTS,
    Permission.CREATE_EVENTS,
    Permission.EDIT_EVENTS,
    Permission.DELETE_EVENTS,
    Permission.VIEW_REGIONS,
    Permission.CREATE_REGIONS,
    Permission.EDIT_REGIONS,
    Permission.DELETE_REGIONS,
    Permission.VIEW_COUNTRIES,
    Permission.CREATE_COUNTRIES,
    Permission.EDIT_COUNTRIES,
    Permission.DELETE_COUNTRIES,
  ],
  EXECUTIVE_DIRECTOR: [
    Permission.VIEW_USERS,
    Permission.CREATE_USERS,
    Permission.EDIT_USERS,
    Permission.VIEW_CHAPTERS,
    Permission.CREATE_CHAPTERS,
    Permission.EDIT_CHAPTERS,
    Permission.VIEW_EVENTS,
    Permission.CREATE_EVENTS,
    Permission.EDIT_EVENTS,
    Permission.VIEW_REGIONS,
    Permission.CREATE_REGIONS,
    Permission.EDIT_REGIONS,
    Permission.VIEW_COUNTRIES,
  ],
  ED_TEAM: [
    Permission.VIEW_USERS,
    Permission.CREATE_USERS,
    Permission.EDIT_USERS,
    Permission.VIEW_CHAPTERS,
    Permission.CREATE_CHAPTERS,
    Permission.EDIT_CHAPTERS,
    Permission.VIEW_EVENTS,
    Permission.CREATE_EVENTS,
    Permission.EDIT_EVENTS,
    Permission.VIEW_REGIONS,
    Permission.CREATE_REGIONS,
    Permission.EDIT_REGIONS,
    Permission.VIEW_COUNTRIES,
  ],
  REGIONAL_DIRECTOR: [
    Permission.VIEW_USERS,
    Permission.CREATE_USERS,
    Permission.EDIT_USERS,
    Permission.VIEW_CHAPTERS,
    Permission.CREATE_CHAPTERS,
    Permission.EDIT_CHAPTERS,
    Permission.VIEW_EVENTS,
    Permission.CREATE_EVENTS,
    Permission.EDIT_EVENTS,
    Permission.VIEW_REGIONS,
  ],
  ASSISTANT_REGIONAL_DIRECTOR: [
    Permission.VIEW_USERS,
    Permission.CREATE_USERS,
    Permission.VIEW_CHAPTERS,
    Permission.CREATE_CHAPTERS,
    Permission.VIEW_EVENTS,
    Permission.CREATE_EVENTS,
    Permission.VIEW_REGIONS,
  ],
  REGIONAL_GOVERNOR: [
    Permission.VIEW_USERS,
    Permission.CREATE_USERS,
    Permission.EDIT_USERS,
    Permission.VIEW_CHAPTERS,
    Permission.CREATE_CHAPTERS,
    Permission.EDIT_CHAPTERS,
    Permission.VIEW_EVENTS,
    Permission.CREATE_EVENTS,
    Permission.EDIT_EVENTS,
    Permission.VIEW_REGIONS,
    Permission.CREATE_REGIONS,
    Permission.EDIT_REGIONS,
  ],
  ASSISTANT_REGIONAL_GOVERNOR: [
    Permission.VIEW_USERS,
    Permission.CREATE_USERS,
    Permission.VIEW_CHAPTERS,
    Permission.CREATE_CHAPTERS,
    Permission.VIEW_EVENTS,
    Permission.CREATE_EVENTS,
    Permission.VIEW_REGIONS,
  ],
  LAUNCH_GOVERNOR: [
    Permission.VIEW_USERS,
    Permission.CREATE_USERS,
    Permission.VIEW_CHAPTERS,
    Permission.CREATE_CHAPTERS,
    Permission.VIEW_EVENTS,
    Permission.CREATE_EVENTS,
  ],
  LAUNCH_DIRECTOR: [
    Permission.VIEW_USERS,
    Permission.CREATE_USERS,
    Permission.VIEW_CHAPTERS,
    Permission.CREATE_CHAPTERS,
    Permission.VIEW_EVENTS,
    Permission.CREATE_EVENTS,
  ],
  CHAPTER_DIRECTOR: [
    Permission.VIEW_USERS,
    Permission.VIEW_CHAPTERS,
    Permission.EDIT_CHAPTERS,
    Permission.VIEW_EVENTS,
    Permission.CREATE_EVENTS,
    Permission.EDIT_EVENTS,
  ],
  SUPPORT_DIRECTOR: [
    Permission.VIEW_USERS,
    Permission.VIEW_CHAPTERS,
    Permission.VIEW_EVENTS,
  ],
  PRESIDENT: [
    Permission.VIEW_USERS,
    Permission.VIEW_CHAPTERS,
    Permission.VIEW_EVENTS,
    Permission.CREATE_EVENTS,
  ],
  VICE_PRESIDENT: [
    Permission.VIEW_USERS,
    Permission.VIEW_CHAPTERS,
    Permission.VIEW_EVENTS,
  ],
  SOCIAL_CHAIRPERSON: [
    Permission.VIEW_USERS,
    Permission.VIEW_CHAPTERS,
    Permission.VIEW_EVENTS,
    Permission.CREATE_EVENTS,
    Permission.EDIT_EVENTS,
  ],
  USER: [
    Permission.VIEW_CHAPTERS,
    Permission.VIEW_EVENTS,
  ],
};

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: Role, permission: Permission): boolean {
  const permissions = ROLE_PERMISSIONS[role] || [];
  return permissions.includes(permission);
}

/**
 * Check if a role has any of the specified permissions
 */
export function hasAnyPermission(role: Role, permissions: Permission[]): boolean {
  return permissions.some(permission => hasPermission(role, permission));
}

/**
 * Check if a role has all of the specified permissions
 */
export function hasAllPermissions(role: Role, permissions: Permission[]): boolean {
  return permissions.every(permission => hasPermission(role, permission));
}

/**
 * Get all permissions for a role
 */
export function getRolePermissions(role: Role): Permission[] {
  return ROLE_PERMISSIONS[role] || [];
}
