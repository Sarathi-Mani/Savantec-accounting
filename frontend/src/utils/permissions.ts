// utils/permissions.ts

// Permission definitions based on your designations
export const PERMISSION_KEYS = {
  // Stock/Inventory
  STOCK_JOURNAL: 'stock_journal',
  STOCK_ADJUSTMENT: 'stock_adjustment',
  BRAND: 'brand',
  VARIANT: 'variant',
  STOCK_VIEW: 'stock_view',
  STOCK_UPDATE: 'stock_update',
  
  // Parties
  SUPPLIERS: 'suppliers',
  CUSTOMERS: 'customers',
  CUSTOMER_ADVANCE_PAYMENTS: 'customer_advance_payments',
  SUPPLIER_ADVANCE_PAYMENTS: 'supplier_advance_payments',
  VENDOR_CREATION: 'vendor_creation',
  CUSTOMER_CREATION: 'customer_creation',
  
  // Purchase
  PURCHASE: 'purchase',
  PURCHASE_ORDER: 'purchase_order',
  PURCHASE_REQUEST: 'purchase_request',
  PURCHASE_INVOICE: 'purchase_invoice',
  PURCHASE_QUOTATION: 'purchase_quotation',
  PURCHASE_COMPARE: 'purchase_compare',
  ENQUIRY_CHECK_PURCHASE: 'enquiry_check_purchase',
  
  // Sales
  QUOTATION: 'quotation',
  SALES_ORDER: 'sales_order',
  PROFORMA: 'proforma',
  DELIVERY_CHALLAN: 'delivery_challan',
  SALES_INVOICE: 'sales_invoice',
  ENQUIRY: 'enquiry',
  ITEM_COMPARE: 'item_compare',
  SALES_OUTSTANDING: 'sales_outstanding',
  VISIT_PLAN: 'visit_plan',
  KM_TRAVELLED: 'km_travelled',
  
  // Accounting
  CASH_BANK_ENTRIES: 'cash_bank_entries',
  JOURNAL: 'journal',
  EXPENSES: 'expenses',
  ASSETS: 'assets',
  LIABILITIES: 'liabilities',
  IT_FILING: 'it_filing',
  
  // Approvals
  LEAVE_APPROVAL: 'leave_approval',
  PERMISSION_APPROVAL: 'permission_approval',
  CUSTOMER_APPROVAL: 'customer_approval',
  VENDOR_APPROVAL: 'vendor_approval',
  
  // View Only
  VIEW_QUOTATION: 'view_quotation',
  VIEW_DC: 'view_dc',
  VIEW_INVOICE: 'view_invoice',
  VIEW_PROFORMA: 'view_proforma',
  VIEW_SALES_ORDER: 'view_sales_order',
  VIEW_STOCK_LIST: 'view_stock_list',
  
  // Administration
  PROCESS_PURCHASE_RATE: 'process_purchase_rate',
  PROCESS_QUOTATION_TEAM: 'process_quotation_team',
  
  // Delivery Challan Specific
  DC_CREATE: 'dc_create',
  DC_VIEW: 'dc_view',
  DC_EDIT: 'dc_edit',
  DC_DELETE: 'dc_delete',
  DC_MARK_DISPATCHED: 'dc_mark_dispatched',
  DC_MARK_DELIVERED: 'dc_mark_delivered',
  DC_UPDATE_STOCK: 'dc_update_stock',
  DC_LINK_INVOICE: 'dc_link_invoice',
  DC_CANCEL: 'dc_cancel',
} as const;

export type PermissionKey = (typeof PERMISSION_KEYS)[keyof typeof PERMISSION_KEYS];
export const ALL_PERMISSION_KEYS = Object.values(PERMISSION_KEYS) as PermissionKey[];

const FULL_ACCESS_KEYS = new Set(["full_access", "full access", "admin", "all"]);

export const isPermissionKey = (value: string): value is PermissionKey => {
  return ALL_PERMISSION_KEYS.includes(value as PermissionKey);
};

export const normalizePermissions = (
  permissions?: string[] | null,
  roleName?: string | null,
): PermissionKey[] => {
  const normalizedRoleName = roleName ? roleName.toLowerCase() : "";
  const roleHasFullAccess =
    normalizedRoleName.includes("full") || normalizedRoleName.includes("admin");

  if (!permissions || permissions.length === 0) {
    return roleHasFullAccess ? [...ALL_PERMISSION_KEYS] : [];
  }

  const hasFullAccess = permissions.some((perm) =>
    FULL_ACCESS_KEYS.has(perm.toLowerCase()),
  );
  if (hasFullAccess || roleHasFullAccess) {
    return [...ALL_PERMISSION_KEYS];
  }

  return permissions.filter(isPermissionKey);
};

// Module-based permission groupings
export const MODULE_PERMISSIONS = {
  // Delivery Challan Module
  DELIVERY_CHALLAN: [
    PERMISSION_KEYS.DELIVERY_CHALLAN,
    PERMISSION_KEYS.DC_CREATE,
    PERMISSION_KEYS.DC_VIEW,
    PERMISSION_KEYS.DC_EDIT,
    PERMISSION_KEYS.DC_DELETE,
    PERMISSION_KEYS.DC_MARK_DISPATCHED,
    PERMISSION_KEYS.DC_MARK_DELIVERED,
    PERMISSION_KEYS.DC_UPDATE_STOCK,
    PERMISSION_KEYS.DC_LINK_INVOICE,
    PERMISSION_KEYS.DC_CANCEL,
  ] as PermissionKey[],
  
  // Stock Module
  STOCK: [
    PERMISSION_KEYS.STOCK_JOURNAL,
    PERMISSION_KEYS.STOCK_ADJUSTMENT,
    PERMISSION_KEYS.BRAND,
    PERMISSION_KEYS.VARIANT,
    PERMISSION_KEYS.STOCK_VIEW,
    PERMISSION_KEYS.STOCK_UPDATE,
  ] as PermissionKey[],
  
  // Sales Module
  SALES: [
    PERMISSION_KEYS.QUOTATION,
    PERMISSION_KEYS.SALES_ORDER,
    PERMISSION_KEYS.PROFORMA,
    PERMISSION_KEYS.SALES_INVOICE,
    PERMISSION_KEYS.ENQUIRY,
    PERMISSION_KEYS.ITEM_COMPARE,
    PERMISSION_KEYS.SALES_OUTSTANDING,
    PERMISSION_KEYS.VISIT_PLAN,
    PERMISSION_KEYS.KM_TRAVELLED,
  ] as PermissionKey[],
  
  // Purchase Module
  PURCHASE: [
    PERMISSION_KEYS.PURCHASE,
    PERMISSION_KEYS.PURCHASE_ORDER,
    PERMISSION_KEYS.PURCHASE_REQUEST,
    PERMISSION_KEYS.PURCHASE_INVOICE,
    PERMISSION_KEYS.PURCHASE_QUOTATION,
    PERMISSION_KEYS.PURCHASE_COMPARE,
    PERMISSION_KEYS.ENQUIRY_CHECK_PURCHASE,
  ] as PermissionKey[],
} as const;

export type ModuleName = keyof typeof MODULE_PERMISSIONS;

// Role templates mapping based on your DB designations
export const ROLE_PERMISSIONS: Record<string, PermissionKey[]> = {
  // Full Access (from your DB)
  'full access': Object.values(PERMISSION_KEYS) as PermissionKey[],
  
  // Sales Engineer (from your DB)
  'Sales Engineer': [
    PERMISSION_KEYS.ENQUIRY,
    PERMISSION_KEYS.QUOTATION,
    PERMISSION_KEYS.VIEW_QUOTATION,
    PERMISSION_KEYS.VIEW_DC,
    PERMISSION_KEYS.VIEW_INVOICE,
    PERMISSION_KEYS.VIEW_PROFORMA,
    PERMISSION_KEYS.VIEW_SALES_ORDER,
    PERMISSION_KEYS.VIEW_STOCK_LIST,
    PERMISSION_KEYS.CUSTOMERS,
    PERMISSION_KEYS.VISIT_PLAN,
    PERMISSION_KEYS.KM_TRAVELLED,
    PERMISSION_KEYS.ITEM_COMPARE,
  ] as PermissionKey[],
  
  // Purchase Manager (from your DB)
  'new Purchase Manager': [
    PERMISSION_KEYS.PURCHASE_REQUEST,
    PERMISSION_KEYS.VENDOR_CREATION,
    PERMISSION_KEYS.PURCHASE_ORDER,
    PERMISSION_KEYS.PURCHASE_INVOICE,
    PERMISSION_KEYS.PURCHASE_QUOTATION,
    PERMISSION_KEYS.PURCHASE_COMPARE,
    PERMISSION_KEYS.VIEW_STOCK_LIST,
    PERMISSION_KEYS.ENQUIRY_CHECK_PURCHASE,
    PERMISSION_KEYS.SUPPLIERS,
    PERMISSION_KEYS.STOCK_VIEW,
  ] as PermissionKey[],
};

// Helper function to get permissions for a role
export const getPermissionsForRole = (roleName: string): PermissionKey[] => {
  const normalizedRoleName = roleName.toLowerCase();
  
  // Check exact match first
  if (ROLE_PERMISSIONS[roleName]) {
    return [...ROLE_PERMISSIONS[roleName]]; // Return a mutable copy
  }
  
  // Check for partial matches
  if (normalizedRoleName.includes('admin') || normalizedRoleName.includes('full')) {
    return [...ROLE_PERMISSIONS['full access']];
  }
  
  if (normalizedRoleName.includes('sales')) {
    return [...ROLE_PERMISSIONS['Sales Engineer']];
  }
  
  if (normalizedRoleName.includes('purchase')) {
    return [...ROLE_PERMISSIONS['new Purchase Manager']];
  }
  
  // Default to view only permissions
  return [
    PERMISSION_KEYS.VIEW_QUOTATION,
    PERMISSION_KEYS.VIEW_DC,
    PERMISSION_KEYS.VIEW_INVOICE,
    PERMISSION_KEYS.VIEW_PROFORMA,
    PERMISSION_KEYS.VIEW_SALES_ORDER,
    PERMISSION_KEYS.VIEW_STOCK_LIST,
  ];
};

// Check if user has permission
export const hasPermission = (
  userPermissions: PermissionKey[],
  requiredPermission: PermissionKey | PermissionKey[]
): boolean => {
  if (Array.isArray(requiredPermission)) {
    return requiredPermission.some(perm => userPermissions.includes(perm));
  }
  return userPermissions.includes(requiredPermission);
};

// Check if user has all permissions
export const hasAllPermissions = (
  userPermissions: PermissionKey[],
  requiredPermissions: PermissionKey[]
): boolean => {
  return requiredPermissions.every(perm => userPermissions.includes(perm));
};

// Check if user can access a module
export const canAccessModule = (
  userPermissions: PermissionKey[],
  module: ModuleName
): boolean => {
  return hasPermission(userPermissions, MODULE_PERMISSIONS[module]);
};
