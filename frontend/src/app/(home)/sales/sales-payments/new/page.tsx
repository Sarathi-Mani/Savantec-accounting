"use client";

import Link from "next/link";
import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
export default function NewSalesPaymentPage() {

  return (
    <>
      <Breadcrumb pageName="New Sales Payment" />
      <div className="rounded-lg border border-stroke bg-white p-6 shadow-1 dark:border-dark-3 dark:bg-gray-dark">
        <h1 className="mb-4 text-xl font-semibold text-dark dark:text-white">
          Record payment
        </h1>
        <p className="text-dark-6">
          Select an invoice and record payment. This page is under development.
        </p>
        <div className="mt-4">
          <Link
            href="/sales/sales-payments"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-opacity-90"
          >
            Back to Sales Payments
          </Link>
        </div>
      </div>
    </>
  );
}
