import { useSelector } from 'react-redux';
import type { RootState } from '../app/store';
import { Permission, hasPermission, hasAnyPermission, hasAllPermissions } from '../config/permissions.config';

/**
 * Hook to check user permissions
 */
export const usePermissions = () => {
  const userRole = useSelector((state: RootState) => state.auth.role);
  const userPermissions: Permission[] = [];

  /**
   * Check if user has a specific permission
   */
  const can = (permission: Permission): boolean => {
    if (!userRole) return false;
    // Check from role-based permissions or user-specific permissions
    return hasPermission(userRole, permission) || userPermissions.includes(permission);
  };

  /**
   * Check if user has any of the specified permissions
   */
  const canAny = (permissions: Permission[]): boolean => {
    if (!userRole) return false;
    return hasAnyPermission(userRole, permissions) || 
           permissions.some(p => userPermissions.includes(p));
  };

  /**
   * Check if user has all of the specified permissions
   */
  const canAll = (permissions: Permission[]): boolean => {
    if (!userRole) return false;
    return hasAllPermissions(userRole, permissions) || 
           permissions.every(p => userPermissions.includes(p));
  };

  /**
   * Get all permissions for the current user
   */
  const getAllPermissions = (): Permission[] => {
    if (!userRole) return [];
    return userPermissions;
  };

  return {
    can,
    canAny,
    canAll,
    getAllPermissions,
    permissions: userPermissions as Permission[],
  };
};

/**
 * Specific permission hooks for common use cases
 */
export const useCanViewUsers = () => {
  const { can } = usePermissions();
  return can(Permission.VIEW_USERS);
};

export const useCanCreateUsers = () => {
  const { can } = usePermissions();
  return can(Permission.CREATE_USERS);
};

export const useCanEditUsers = () => {
  const { can } = usePermissions();
  return can(Permission.EDIT_USERS);
};

export const useCanDeleteUsers = () => {
  const { can } = usePermissions();
  return can(Permission.DELETE_USERS);
};

export const useCanViewChapters = () => {
  const { can } = usePermissions();
  return can(Permission.VIEW_CHAPTERS);
};

export const useCanCreateChapters = () => {
  const { can } = usePermissions();
  return can(Permission.CREATE_CHAPTERS);
};

export const useCanManageRoles = () => {
  const { can } = usePermissions();
  return can(Permission.MANAGE_ROLES);
};

export const useCanAccessSystemSettings = () => {
  const { can } = usePermissions();
  return can(Permission.SYSTEM_SETTINGS);
};
