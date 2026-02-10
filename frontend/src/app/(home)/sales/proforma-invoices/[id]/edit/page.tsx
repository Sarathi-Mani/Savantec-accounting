"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function ProformaInvoiceEditRedirect() {
  const router = useRouter();
  const params = useParams();
  const invoiceId = params.id as string;

  useEffect(() => {
    if (invoiceId) {
      router.replace(`/sales/proforma-invoices/new?editId=${invoiceId}`);
    }
  }, [invoiceId, router]);

  return null;
}
