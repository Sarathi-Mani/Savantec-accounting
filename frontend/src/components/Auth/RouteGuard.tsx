"use client";

import React, { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { canAccessRoute } from "@/utils/access-control";



export function RouteGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();
  const { permissions, permissionsReady } = usePermissions();

  const allowed = canAccessRoute(permissions, pathname);

  useEffect(() => {
    if (!isLoading && isAuthenticated && permissionsReady && !allowed) {
      router.replace("/");
    }
  }, [allowed, isAuthenticated, isLoading, permissionsReady, router]);

  if (isLoading || !permissionsReady) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="text-sm text-dark dark:text-white">Checking permissions...</p>
        </div>
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-900/40 dark:bg-red-900/10 dark:text-red-300">
        <p className="font-medium">Access denied</p>
        <p className="text-sm">You don't have permission to view this page.</p>
      </div>
    );
  }

  return <>{children}</>;
}
