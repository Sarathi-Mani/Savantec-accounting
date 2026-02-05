// hooks/usePermissions.ts
import { useAuth } from "@/context/AuthContext";
import { 
  PermissionKey, 
  getPermissionsForRole, 
  hasPermission, 
  hasAllPermissions,
  canAccessModule,
  MODULE_PERMISSIONS,
  normalizePermissions,
} from "@/utils/permissions";

export const usePermissions = () => {
  const { user } = useAuth();
  
  // Get user's permissions based on designation
  const getUserPermissions = (): PermissionKey[] => {
    if (!user) {
      return [];
    }

    if (typeof user.designation === "object" && Array.isArray(user.designation?.permissions)) {
      const permissions = normalizePermissions(
        user.designation.permissions,
        user.designation?.name,
      );
      if (permissions.length > 0) {
        return permissions;
      }
    }

    if (typeof window !== "undefined" && typeof user.designation === "object" && user.designation?.id) {
      const cached = localStorage.getItem("current_designation");
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (parsed?.id === user.designation.id && Array.isArray(parsed?.permissions)) {
            const permissions = normalizePermissions(
              parsed.permissions,
              user.designation?.name,
            );
            if (permissions.length > 0 || parsed.permissions.length === 0) {
              return permissions;
            }
          }
        } catch {
          // Ignore cache parse errors
        }
      }
    }

    if (typeof user.designation === "object" && user.designation?.name) {
      return getPermissionsForRole(user.designation.name);
    }

    if (typeof user.designation === "string") {
      return getPermissionsForRole(user.designation);
    }

    return [];
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
  
  const permissions = getUserPermissions();
  const cachedDesignation =
    typeof window !== "undefined" ? localStorage.getItem("current_designation") : null;
  const cachedMatch =
    !!cachedDesignation &&
    typeof user?.designation === "object" &&
    user.designation?.id &&
    (() => {
      try {
        return JSON.parse(cachedDesignation).id === user.designation?.id;
      } catch {
        return false;
      }
    })();

  const permissionsReady = !user?.designation
    ? true
    : typeof user.designation === "string"
      ? true
      : typeof user.designation === "object" &&
        (Array.isArray(user.designation?.permissions) || cachedMatch);

  return {
    getUserPermissions,
    checkPermission,
    checkAllPermissions,
    checkModuleAccess,
    filterByPermission,
    permissions,
    permissionsReady,
  };
};
