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
    <div className="p-6">
      <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
        Redirecting to edit purchase return...
      </div>
    </div>
  );
}
