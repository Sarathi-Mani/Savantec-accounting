// utils/permission-check.ts
import { PermissionKey } from "./permissions";
import { canAccessRoute, filterNavByPermissions } from "./access-control";

// Get current user's designation from localStorage or API
export function getCurrentDesignation(): { id: string; name: string; permissions: string[] } | null {
  if (typeof window === 'undefined') return null;
  
  const designation = localStorage.getItem('current_designation');
  const userData = localStorage.getItem('user');
  
  if (designation) {
    return JSON.parse(designation);
  } else if (userData) {
    const user = JSON.parse(userData);
    // Assuming user object has designation info
    return user.designation || null;
  }
  
  return null;
}

// Check if user has permission for a specific menu item
export function hasMenuPermission(
  menuUrl: string,
  userPermissions: PermissionKey[]
): boolean {
  return canAccessRoute(userPermissions, menuUrl);
}

// Filter menu items based on user permissions
export function filterMenuByPermissions(
  navData: any[],
  userPermissions: PermissionKey[]
): any[] {
  return filterNavByPermissions(navData, userPermissions);
}

// Store user designation after login
export function storeUserDesignation(designation: any) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('current_designation', JSON.stringify(designation));
  }
}

// Clear designation on logout
export function clearUserDesignation() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('current_designation');
  }
}
