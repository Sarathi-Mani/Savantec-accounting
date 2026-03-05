"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function PurchaseReturnEditRedirectPage() {
  const router = useRouter();
  const params = useParams();

  useEffect(() => {
    const returnId = params?.id as string;
    if (!returnId) return;
    router.replace(`/purchase/purchase-returns/new?editId=${returnId}`);
  }, [params, router]);

  return (
    <div className="min-h-screen bg-gray-50 p-6 dark:bg-gray-900">
      <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        Redirecting to edit purchase return...
      </div>
    </div>
  );
}

