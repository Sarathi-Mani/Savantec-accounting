// utils/access-control.ts
import { PermissionKey, PERMISSION_KEYS } from "./permissions";

type RouteRule = {
  match: (path: string) => boolean;
  permissions: PermissionKey[];
};



const startsWith = (prefix: string) => (path: string) =>
  path === prefix || path.startsWith(`${prefix}/`);

const ROUTE_RULES: RouteRule[] = [
  // Users / Payroll
  { match: startsWith("/payroll/designations"), permissions: [PERMISSION_KEYS.PERMISSION_APPROVAL] },
  { match: startsWith("/payroll/employees"), permissions: [PERMISSION_KEYS.PERMISSION_APPROVAL] },
  { match: startsWith("/payroll/leaves"), permissions: [PERMISSION_KEYS.LEAVE_APPROVAL] },
  { match: startsWith("/payroll"), permissions: [PERMISSION_KEYS.PAYROLL_ACCESS] },

  // Products / Inventory
  { match: startsWith("/products/brands"), permissions: [PERMISSION_KEYS.BRAND] },
  { match: startsWith("/products/categories"), permissions: [PERMISSION_KEYS.VARIANT] },
  { match: startsWith("/products"), permissions: [PERMISSION_KEYS.STOCK_VIEW] },
  { match: startsWith("/inventory/stock-journal"), permissions: [PERMISSION_KEYS.STOCK_JOURNAL] },
  { match: startsWith("/inventory/stock-in"), permissions: [PERMISSION_KEYS.STOCK_UPDATE] },
  { match: startsWith("/inventory/stock-out"), permissions: [PERMISSION_KEYS.STOCK_UPDATE] },
  { match: startsWith("/inventory/transfer"), permissions: [PERMISSION_KEYS.STOCK_UPDATE] },
  { match: startsWith("/inventory/verification"), permissions: [PERMISSION_KEYS.STOCK_UPDATE] },
  { match: startsWith("/inventory"), permissions: [PERMISSION_KEYS.STOCK_VIEW, PERMISSION_KEYS.STOCK_UPDATE] },

  // Vendors / Customers
  { match: startsWith("/vendors"), permissions: [PERMISSION_KEYS.SUPPLIERS, PERMISSION_KEYS.VENDOR_CREATION] },
  { match: startsWith("/customers"), permissions: [PERMISSION_KEYS.CUSTOMERS, PERMISSION_KEYS.CUSTOMER_CREATION] },
  { match: startsWith("/contacts"), permissions: [PERMISSION_KEYS.CUSTOMERS, PERMISSION_KEYS.SUPPLIERS] },

  // Sales
  { match: startsWith("/quotations"), permissions: [PERMISSION_KEYS.QUOTATION, PERMISSION_KEYS.VIEW_QUOTATION] },
  { match: startsWith("/invoices"), permissions: [PERMISSION_KEYS.SALES_INVOICE, PERMISSION_KEYS.VIEW_INVOICE] },
  { match: startsWith("/delivery-challans"), permissions: [PERMISSION_KEYS.DELIVERY_CHALLAN, PERMISSION_KEYS.DC_VIEW] },
  { match: startsWith("/sales/sales-orders"), permissions: [PERMISSION_KEYS.SALES_ORDER, PERMISSION_KEYS.VIEW_SALES_ORDER] },
  { match: startsWith("/sales/proforma-invoices"), permissions: [PERMISSION_KEYS.PROFORMA, PERMISSION_KEYS.VIEW_PROFORMA] },
  { match: startsWith("/enquiries"), permissions: [PERMISSION_KEYS.ENQUIRY] },
  { match: startsWith("/sales/tickets"), permissions: [PERMISSION_KEYS.ENQUIRY] },
  { match: startsWith("/sales/sales-payments"), permissions: [PERMISSION_KEYS.SALES_INVOICE] },
  { match: startsWith("/sales/sales-returns"), permissions: [PERMISSION_KEYS.SALES_INVOICE] },
  { match: startsWith("/sales/sales-list"), permissions: [PERMISSION_KEYS.SALES_INVOICE, PERMISSION_KEYS.VIEW_INVOICE] },
  { match: startsWith("/sales"), permissions: [PERMISSION_KEYS.SALES_INVOICE, PERMISSION_KEYS.QUOTATION, PERMISSION_KEYS.SALES_ORDER, PERMISSION_KEYS.PROFORMA, PERMISSION_KEYS.DELIVERY_CHALLAN, PERMISSION_KEYS.ENQUIRY] },

  // Purchase
  { match: startsWith("/purchase-req"), permissions: [PERMISSION_KEYS.PURCHASE_REQUEST] },
  { match: startsWith("/purchase/purchase-orders"), permissions: [PERMISSION_KEYS.PURCHASE_ORDER] },
  { match: startsWith("/purchase/invoices"), permissions: [PERMISSION_KEYS.PURCHASE_INVOICE] },
  { match: startsWith("/purchase/debit-notes"), permissions: [PERMISSION_KEYS.PURCHASE_INVOICE] },
  { match: startsWith("/purchase"), permissions: [PERMISSION_KEYS.PURCHASE, PERMISSION_KEYS.PURCHASE_INVOICE, PERMISSION_KEYS.PURCHASE_ORDER] },
  { match: startsWith("/orders/purchase"), permissions: [PERMISSION_KEYS.PURCHASE_ORDER] },
  { match: startsWith("/receipt-notes"), permissions: [PERMISSION_KEYS.PURCHASE] },

  // Accounting
  { match: startsWith("/accounting/transactions"), permissions: [PERMISSION_KEYS.JOURNAL] },
  { match: startsWith("/accounting/payment"), permissions: [PERMISSION_KEYS.CASH_BANK_ENTRIES] },
  { match: startsWith("/accounting/receipt"), permissions: [PERMISSION_KEYS.CASH_BANK_ENTRIES] },
  { match: startsWith("/accounting/contra"), permissions: [PERMISSION_KEYS.CASH_BANK_ENTRIES] },
  { match: startsWith("/accounting/bank-import"), permissions: [PERMISSION_KEYS.CASH_BANK_ENTRIES] },
  { match: startsWith("/accounting/reports"), permissions: [PERMISSION_KEYS.REPORTS_ACCESS] },
  { match: startsWith("/accounting"), permissions: [PERMISSION_KEYS.JOURNAL, PERMISSION_KEYS.CASH_BANK_ENTRIES] },

  // Banking
  { match: startsWith("/banking"), permissions: [PERMISSION_KEYS.BANKING_ACCESS] },

  // Reports
  { match: startsWith("/reports"), permissions: [PERMISSION_KEYS.REPORTS_ACCESS] },
  { match: startsWith("/gst-reports"), permissions: [PERMISSION_KEYS.REPORTS_ACCESS] },
  { match: startsWith("/gst"), permissions: [PERMISSION_KEYS.REPORTS_ACCESS] },

  // Settings / Company
  { match: startsWith("/company"), permissions: [PERMISSION_KEYS.SETTINGS_ACCESS] },
  { match: startsWith("/settings"), permissions: [PERMISSION_KEYS.SETTINGS_ACCESS] },
];

export const getRoutePermissions = (path: string): PermissionKey[] => {
  const rule = ROUTE_RULES.find((r) => r.match(path));
  return rule?.permissions || [];
};

export const canAccessRoute = (
  userPermissions: PermissionKey[],
  path: string,
): boolean => {
  const required = getRoutePermissions(path);
  if (required.length === 0) return true;
  return required.some((perm) => userPermissions.includes(perm));
};

type NavItem = {
  title: string;
  url?: string;
  items?: NavItem[];
  icon?: any;
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

export const filterNavByPermissions = (
  navData: NavGroup[],
  userPermissions: PermissionKey[],
): NavGroup[] => {
  return navData
    .map((group) => {
      const filteredItems = group.items
        .map((item) => {
          if (item.items && item.items.length > 0) {
            const filteredSubItems = item.items.filter((subItem) =>
              subItem.url ? canAccessRoute(userPermissions, subItem.url) : true,
            );
            if (filteredSubItems.length === 0) return null;
            return { ...item, items: filteredSubItems };
          }

          if (item.url) {
            return canAccessRoute(userPermissions, item.url) ? item : null;
          }

          return item;
        })
        .filter(Boolean) as NavItem[];

      return { ...group, items: filteredItems };
    })
    .filter((group) => group.items.length > 0);
};
