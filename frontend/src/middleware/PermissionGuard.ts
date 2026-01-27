// middleware/PermissionGuard.ts
import { NextRequest, NextResponse } from 'next/server';
import { PERMISSION_KEYS, getPermissionsForRole, PermissionKey } from '@/utils/permissions';

// Route to permission mapping with HTTP methods
interface RoutePermissionConfig {
  GET?: PermissionKey[];
  POST?: PermissionKey[];
  PUT?: PermissionKey[];
  DELETE?: PermissionKey[];
  PATCH?: PermissionKey[];
  '*': PermissionKey[]; // Fallback for any method
}

type RoutePermissions = Record<string, RoutePermissionConfig>;

const ROUTE_PERMISSIONS: RoutePermissions = {
  // Delivery Challan routes
  '/api/delivery-challan': {
    GET: [PERMISSION_KEYS.DC_VIEW, PERMISSION_KEYS.DELIVERY_CHALLAN],
    POST: [PERMISSION_KEYS.DC_CREATE, PERMISSION_KEYS.DELIVERY_CHALLAN],
    '*': [PERMISSION_KEYS.DELIVERY_CHALLAN],
  },
  
  '/api/delivery-challan/(.*)': {
    GET: [PERMISSION_KEYS.DC_VIEW],
    PUT: [PERMISSION_KEYS.DC_EDIT],
    DELETE: [PERMISSION_KEYS.DC_DELETE],
    '*': [PERMISSION_KEYS.DELIVERY_CHALLAN],
  },
  
  '/api/delivery-challan/(.*)/dispatch': {
    POST: [PERMISSION_KEYS.DC_MARK_DISPATCHED],
    '*': [PERMISSION_KEYS.DELIVERY_CHALLAN],
  },
  
  '/api/delivery-challan/(.*)/deliver': {
    POST: [PERMISSION_KEYS.DC_MARK_DELIVERED],
    '*': [PERMISSION_KEYS.DELIVERY_CHALLAN],
  },
  
  '/api/delivery-challan/(.*)/cancel': {
    POST: [PERMISSION_KEYS.DC_CANCEL],
    '*': [PERMISSION_KEYS.DELIVERY_CHALLAN],
  },
  
  '/api/delivery-challan/(.*)/stock': {
    POST: [PERMISSION_KEYS.DC_UPDATE_STOCK],
    '*': [PERMISSION_KEYS.DELIVERY_CHALLAN],
  },
  
  '/api/delivery-challan/(.*)/link-invoice': {
    POST: [PERMISSION_KEYS.DC_LINK_INVOICE],
    '*': [PERMISSION_KEYS.DELIVERY_CHALLAN],
  },
  
  // Invoice routes
  '/api/invoices': {
    GET: [PERMISSION_KEYS.VIEW_INVOICE],
    POST: [PERMISSION_KEYS.SALES_INVOICE],
    '*': [PERMISSION_KEYS.VIEW_INVOICE],
  },
  
  '/api/invoices/(.*)': {
    GET: [PERMISSION_KEYS.VIEW_INVOICE],
    PUT: [PERMISSION_KEYS.SALES_INVOICE],
    DELETE: [PERMISSION_KEYS.SALES_INVOICE],
    '*': [PERMISSION_KEYS.VIEW_INVOICE],
  },
  
  // Purchase routes
  '/api/purchase': {
    GET: [PERMISSION_KEYS.PURCHASE],
    POST: [PERMISSION_KEYS.PURCHASE],
    '*': [PERMISSION_KEYS.PURCHASE],
  },
  
  '/api/purchase/orders': {
    GET: [PERMISSION_KEYS.PURCHASE_ORDER],
    POST: [PERMISSION_KEYS.PURCHASE_ORDER],
    '*': [PERMISSION_KEYS.PURCHASE_ORDER],
  },
  
  '/api/purchase/request': {
    GET: [PERMISSION_KEYS.PURCHASE_REQUEST],
    POST: [PERMISSION_KEYS.PURCHASE_REQUEST],
    '*': [PERMISSION_KEYS.PURCHASE_REQUEST],
  },
  
  // Stock routes
  '/api/stock': {
    GET: [PERMISSION_KEYS.STOCK_VIEW],
    POST: [PERMISSION_KEYS.STOCK_UPDATE],
    '*': [PERMISSION_KEYS.STOCK_VIEW],
  },
  
  '/api/stock/journal': {
    GET: [PERMISSION_KEYS.STOCK_JOURNAL],
    POST: [PERMISSION_KEYS.STOCK_JOURNAL],
    '*': [PERMISSION_KEYS.STOCK_JOURNAL],
  },
  
  '/api/stock/adjustment': {
    GET: [PERMISSION_KEYS.STOCK_ADJUSTMENT],
    POST: [PERMISSION_KEYS.STOCK_ADJUSTMENT],
    '*': [PERMISSION_KEYS.STOCK_ADJUSTMENT],
  },
  
  // Sales routes
  '/api/sales/quotations': {
    GET: [PERMISSION_KEYS.VIEW_QUOTATION, PERMISSION_KEYS.QUOTATION],
    POST: [PERMISSION_KEYS.QUOTATION],
    '*': [PERMISSION_KEYS.VIEW_QUOTATION],
  },
  
  '/api/sales/orders': {
    GET: [PERMISSION_KEYS.VIEW_SALES_ORDER, PERMISSION_KEYS.SALES_ORDER],
    POST: [PERMISSION_KEYS.SALES_ORDER],
    '*': [PERMISSION_KEYS.VIEW_SALES_ORDER],
  },
  
  // Parties routes
  '/api/customers': {
    GET: [PERMISSION_KEYS.CUSTOMERS],
    POST: [PERMISSION_KEYS.CUSTOMER_CREATION],
    '*': [PERMISSION_KEYS.CUSTOMERS],
  },
  
  '/api/suppliers': {
    GET: [PERMISSION_KEYS.SUPPLIERS],
    POST: [PERMISSION_KEYS.VENDOR_CREATION],
    '*': [PERMISSION_KEYS.SUPPLIERS],
  },
};

// Public routes that don't require authentication
const PUBLIC_ROUTES = [
  '/api/auth',
  '/api/health',
  '/api/public',
  '/_next',
  '/static',
  '/favicon.ico',
];

// Routes that require authentication but no specific permissions
const AUTH_ONLY_ROUTES = [
  '/api/profile',
  '/api/dashboard',
  '/api/notifications',
];

// Simple token verification (replace with your actual auth system)
async function verifyToken(req: NextRequest): Promise<{ user: any; error?: string }> {
  try {
    // Get token from cookie or header
    const authHeader = req.headers.get('authorization');
    const cookieToken = req.cookies.get('token')?.value;
    
    const token = authHeader?.startsWith('Bearer ') 
      ? authHeader.substring(7) 
      : cookieToken;
    
    if (!token) {
      return { user: null, error: 'No token provided' };
    }
    
    // TODO: Implement your actual token verification logic
    // This is a placeholder - replace with your JWT verification
    const user = {
      id: 'user-id',
      email: 'user@example.com',
      designation: {
        name: 'Sales Engineer' // Example - get from your DB/token
      }
    };
    
    return { user };
  } catch (error) {
    return { user: null, error: 'Invalid token' };
  }
}

export async function permissionGuard(req: NextRequest): Promise<NextResponse> {
  const { pathname } = req.nextUrl;
  const method = req.method;
  
  // Skip for public routes
  if (PUBLIC_ROUTES.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }
  
  // Check authentication
  const { user, error: authError } = await verifyToken(req);
  
  if (!user) {
    // For auth-only routes, redirect to login
    if (AUTH_ONLY_ROUTES.some(route => pathname.startsWith(route))) {
      const loginUrl = new URL('/auth/login', req.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }
    
    // For API routes, return 401
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Authentication required', details: authError },
        { status: 401 }
      );
    }
    
    // For web pages, redirect to login
    const loginUrl = new URL('/auth/login', req.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }
  
  // For auth-only routes, no further permission check needed
  if (AUTH_ONLY_ROUTES.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }
  
  // Get user's permissions
  const userPermissions = getPermissionsForRole(user.designation?.name || '');
  
  // Check if user has permission for this route
  const routeMatch = Object.entries(ROUTE_PERMISSIONS).find(([route]) => {
    const pattern = new RegExp(`^${route.replace('(.*)', '.*')}$`);
    return pattern.test(pathname);
  });
  
  if (routeMatch) {
    const [route, permissionConfig] = routeMatch;
    const requiredPermissions = permissionConfig[method as keyof RoutePermissionConfig] || 
                               permissionConfig['*'] || 
                               [];
    
    if (requiredPermissions.length > 0) {
      const hasAccess = requiredPermissions.some(perm => 
        userPermissions.includes(perm)
      );
      
      if (!hasAccess) {
        // Log the permission denial for debugging
        console.warn(`Permission denied for user ${user.id} (${user.designation?.name}) on ${method} ${pathname}. Required: ${requiredPermissions.join(', ')}`);
        
        return NextResponse.json(
          { 
            error: 'Insufficient permissions',
            required: requiredPermissions,
            has: userPermissions
          },
          { status: 403 }
        );
      }
    }
  }
  
  return NextResponse.next();
}

// Helper function to check permissions in API routes
export async function checkAPIPermission(
  req: NextRequest,
  requiredPermissions: PermissionKey[]
): Promise<{ allowed: boolean; user?: any; error?: string }> {
  const { user, error: authError } = await verifyToken(req);
  
  if (!user) {
    return { allowed: false, error: authError || 'Authentication required' };
  }
  
  const userPermissions = getPermissionsForRole(user.designation?.name || '');
  
  const hasAccess = requiredPermissions.some(perm => 
    userPermissions.includes(perm)
  );
  
  if (!hasAccess) {
    return { 
      allowed: false, 
      user, 
      error: 'Insufficient permissions' 
    };
  }
  
  return { allowed: true, user };
}

// Higher-order function for API route protection
export function withPermission(
  requiredPermissions: PermissionKey[],
  handler: (req: NextRequest, context: any, user: any) => Promise<NextResponse>
) {
  return async (req: NextRequest, context: any) => {
    const { allowed, user, error } = await checkAPIPermission(req, requiredPermissions);
    
    if (!allowed) {
      return NextResponse.json(
        { error: error || 'Access denied' },
        { status: error === 'Authentication required' ? 401 : 403 }
      );
    }
    
    return handler(req, context, user);
  };
}

// Simple middleware wrapper
export function createProtectedHandler(
  handlers: Record<string, (req: NextRequest, context: any, user: any) => Promise<NextResponse>>,
  permissions: Record<string, PermissionKey[]>
) {
  return async (req: NextRequest, context: any) => {
    const method = req.method;
    const handler = handlers[method];
    
    if (!handler) {
      return NextResponse.json(
        { error: 'Method not allowed' },
        { status: 405 }
      );
    }
    
    const requiredPermissions = permissions[method] || [];
    
    if (requiredPermissions.length > 0) {
      const { allowed, user, error } = await checkAPIPermission(req, requiredPermissions);
      
      if (!allowed) {
        return NextResponse.json(
          { error: error || 'Access denied' },
          { status: 401 }
        );
      }
      
      return handler(req, context, user);
    }
    
    return handler(req, context, null);
  };
}