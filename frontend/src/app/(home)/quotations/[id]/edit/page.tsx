"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function EditQuotationRedirectPage() {
  const params = useParams();
  const router = useRouter();
  const quotationId = params.id as string;

  useEffect(() => {
    if (!quotationId) return;
    router.replace(`/quotations/new?edit_id=${quotationId}`);
  }, [quotationId, router]);

  return (
    <div className="p-6">
      <div className="bg-white dark:bg-gray-dark rounded-lg shadow p-6 text-center">
        <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto" />
        <p className="mt-4 text-gray-600 dark:text-gray-300">Opening quotation editor...</p>
      </div>
    </div>
  );
}
