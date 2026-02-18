"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function EditSalesReturnRedirectPage() {
  const router = useRouter();
  const params = useParams();
  const returnId = params?.id as string;

  useEffect(() => {
    if (!returnId) return;
    router.replace(`/sales/sales-returns/new?editId=${returnId}`);
  }, [router, returnId]);

  return <div className="p-6">Redirecting to edit form...</div>;
}
