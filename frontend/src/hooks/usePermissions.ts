// hooks/usePermissions.ts
import { useAuth } from "@/context/AuthContext";
import { 
  PermissionKey, 
  getPermissionsForRole, 
  hasPermission, 
  hasAllPermissions,
  canAccessModule,
  MODULE_PERMISSIONS 
} from "@/utils/permissions";

export const usePermissions = () => {
  const { user } = useAuth();
  
  // Get user's permissions based on designation
  const getUserPermissions = (): PermissionKey[] => {
    if (!user || !user.designation) {
      return [];
    }
    
    const designationName = user.designation.name;
    return getPermissionsForRole(designationName);
  };
  
  // Check if user has specific permission
  const checkPermission = (permission: PermissionKey | PermissionKey[]): boolean => {
    const userPermissions = getUserPermissions();
    return hasPermission(userPermissions, permission);
  };
  
  // Check if user has all required permissions
  const checkAllPermissions = (permissions: PermissionKey[]): boolean => {
    const userPermissions = getUserPermissions();
    return hasAllPermissions(userPermissions, permissions);
  };
  
  // Check if user can access a module
  const checkModuleAccess = (module: keyof typeof MODULE_PERMISSIONS): boolean => {
    const userPermissions = getUserPermissions();
    return canAccessModule(userPermissions, module);
  };
  
  // Get filtered items based on permissions
  const filterByPermission = <T>(
    items: T[],
    permissionCheck: (item: T) => PermissionKey | PermissionKey[]
  ): T[] => {
    return items.filter(item => {
      const requiredPermission = permissionCheck(item);
      return checkPermission(requiredPermission);
    });
  };
  
  return {
    getUserPermissions,
    checkPermission,
    checkAllPermissions,
    checkModuleAccess,
    filterByPermission,
    permissions: getUserPermissions(),
  };
};