// components/auth/WithPermission.tsx
import { ReactNode } from 'react';
import { usePermissions } from '@/hooks/usePermissions';
import { PermissionKey, ModuleName } from '@/utils/permissions';

interface WithPermissionProps {
  children: ReactNode;
  permission: PermissionKey | PermissionKey[];
  fallback?: ReactNode;
}

export const WithPermission = ({ 
  children, 
  permission, 
  fallback = null 
}: WithPermissionProps) => {
  const { checkPermission } = usePermissions();
  
  if (!checkPermission(permission)) {
    return <>{fallback}</>;
  }
  
  return <>{children}</>;
};

// For module-level access
interface WithModuleAccessProps {
  children: ReactNode;
  module: ModuleName;
  fallback?: ReactNode;
}

export const WithModuleAccess = ({ 
  children, 
  module, 
  fallback = null 
}: WithModuleAccessProps) => {
  const { checkModuleAccess } = usePermissions();
  
  if (!checkModuleAccess(module)) {
    return <>{fallback}</>;
  }
  
  return <>{children}</>;
};

// For conditional rendering based on multiple permissions
interface WithAllPermissionsProps {
  children: ReactNode;
  permissions: PermissionKey[];
  fallback?: ReactNode;
}

export const WithAllPermissions = ({ 
  children, 
  permissions, 
  fallback = null 
}: WithAllPermissionsProps) => {
  const { checkAllPermissions } = usePermissions();
  
  if (!checkAllPermissions(permissions)) {
    return <>{fallback}</>;
  }
  
  return <>{children}</>;
};

// For showing content if user doesn't have permission
interface WithoutPermissionProps {
  children: ReactNode;
  permission: PermissionKey | PermissionKey[];
  fallback?: ReactNode;
}

export const WithoutPermission = ({ 
  children, 
  permission, 
  fallback = null 
}: WithoutPermissionProps) => {
  const { checkPermission } = usePermissions();
  
  if (checkPermission(permission)) {
    return <>{fallback}</>;
  }
  
  return <>{children}</>;
};