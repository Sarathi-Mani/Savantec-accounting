"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SalesmanDashboardRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/sales-tracking/nearby-customers");
  }, [router]);

  return null;
}
