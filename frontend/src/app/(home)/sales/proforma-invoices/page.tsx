"use client";

import { useAuth } from "@/context/AuthContext";
import dayjs from "dayjs";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { proformaInvoicesApi } from "@/services/api";

interface ProformaInvoice {
  id: string;
  invoice_number: string;
  proforma_date: string;
  due_date?: string;
  customer_id: string;
  customer_name?: string;
  reference_no?: string;
  subtotal: number;
  total_tax: number;
  total_amount: number;
  created_at: string;
}

export default function ProformaInvoicesPage() {
  const { company } = useAuth();
  const router = useRouter();
  const [invoices, setInvoices] = useState<ProformaInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const getToken = () =>
    typeof window !== "undefined" ? localStorage.getItem("access_token") : null;

  const fetchInvoices = async () => {
      const token = getToken();
      if (!company?.id || !token) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:6768/api"}/companies/${company.id}/proforma-invoices`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        if (response.ok) {
          const data = await response.json();
          setInvoices(data);
        }
      } catch (error) {
        console.error("Failed to fetch proforma invoices:", error);
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    fetchInvoices();
  }, [company?.id]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
    }).format(amount || 0);
  };

  const handleDelete = async (invoiceId: string) => {
    if (!company?.id) return;
    if (!confirm("Are you sure you want to delete this proforma invoice?")) return;
    setActionLoading(`delete-${invoiceId}`);
    try {
      await proformaInvoicesApi.delete(company.id, invoiceId);
      setInvoices((prev) => prev.filter((inv) => inv.id !== invoiceId));
    } catch (error) {
      console.error("Failed to delete proforma invoice:", error);
      alert("Failed to delete proforma invoice");
    } finally {
      setActionLoading(null);
    }
  };

  const handleConvert = async (invoiceId: string) => {
    if (!confirm("Open this proforma invoice in Sales (prefill)?")) return;
    router.push(`/sales/new?fromProforma=${invoiceId}`);
  };

  const handlePdf = async (invoiceId: string, invoiceNumber: string) => {
    if (!company?.id) return;
    setActionLoading(`pdf-${invoiceId}`);
    try {
      const blob = await proformaInvoicesApi.downloadPDF(company.id, invoiceId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Proforma_${invoiceNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Failed to download PDF:", error);
      alert("Failed to download PDF");
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark dark:text-white">Proforma Invoices</h1>
          <p className="text-sm text-dark-6">Manage proforma invoices for quotations</p>
        </div>
        <Link
          href="/sales/proforma-invoices/new"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition hover:bg-opacity-90"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Proforma Invoice
        </Link>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg bg-white shadow-1 dark:bg-gray-dark">
        <div className="overflow-x-auto">
          <table className="w-full table-auto">
            <thead>
              <tr className="border-b border-stroke dark:border-dark-3">
                <th className="px-4 py-4 text-left font-medium text-dark dark:text-white">Invoice #</th>
                <th className="px-4 py-4 text-left font-medium text-dark dark:text-white whitespace-nowrap w-64">Customer</th>
                <th className="px-4 py-4 text-left font-medium text-dark dark:text-white">Date</th>
                <th className="px-4 py-4 text-left font-medium text-dark dark:text-white">Due Date</th>
                <th className="px-4 py-4 text-left font-medium text-dark dark:text-white">Reference</th>
                <th className="px-4 py-4 text-right font-medium text-dark dark:text-white">Amount</th>
                <th className="px-4 py-4 text-center font-medium text-dark dark:text-white">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array(5)
                  .fill(0)
                  .map((_, i) => (
                    <tr key={i} className="border-b border-stroke dark:border-dark-3">
                      <td colSpan={7} className="px-4 py-4">
                        <div className="h-4 w-full animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                      </td>
                    </tr>
                  ))
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-dark-6">
                    No proforma invoices found. Create your first one to get started.
                  </td>
                </tr>
              ) : (
                invoices.map((invoice) => (
                  <tr
                    key={invoice.id}
                    className="border-b border-stroke transition hover:bg-gray-50 dark:border-dark-3 dark:hover:bg-dark-2"
                  >
                    <td className="px-4 py-4">
                      <Link
                        href={`/sales/proforma-invoices/${invoice.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {invoice.invoice_number}
                      </Link>
                    </td>
                    <td className="px-4 py-4 text-dark dark:text-white whitespace-nowrap">
                      <span className="inline-block max-w-[240px] truncate">
                        {invoice.customer_name || "-"}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-dark-6">
                      {dayjs(invoice.proforma_date).format("DD MMM YYYY")}
                    </td>
                    <td className="px-4 py-4 text-dark-6">
                      {invoice.due_date
                        ? dayjs(invoice.due_date).format("DD MMM YYYY")
                        : "-"}
                    </td>
                    <td className="px-4 py-4 text-dark-6">
                      {invoice.reference_no || "-"}
                    </td>
                    <td className="px-4 py-4 text-right font-medium text-dark dark:text-white">
                      {formatCurrency(invoice.total_amount)}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <Link
                          href={`/sales/proforma-invoices/${invoice.id}`}
                          className="rounded p-1.5 text-dark-6 transition hover:bg-gray-100 hover:text-primary dark:hover:bg-dark-2"
                          title="View"
                        >
                          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                            />
                          </svg>
                        </Link>
                        <Link
                          href={`/sales/proforma-invoices/${invoice.id}/edit`}
                          className="rounded p-1.5 text-dark-6 transition hover:bg-gray-100 hover:text-primary dark:hover:bg-dark-2"
                          title="Edit"
                        >
                          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5h2m-1 0v14m8-7H4" />
                          </svg>
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleConvert(invoice.id)}
                          disabled={actionLoading === `convert-${invoice.id}`}
                          className="rounded p-1.5 text-dark-6 transition hover:bg-gray-100 hover:text-primary disabled:opacity-50 dark:hover:bg-dark-2"
                          title="Convert to Invoice"
                        >
                          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h10M7 12h10M7 17h10" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePdf(invoice.id, invoice.invoice_number)}
                          disabled={actionLoading === `pdf-${invoice.id}`}
                          className="rounded p-1.5 text-dark-6 transition hover:bg-gray-100 hover:text-primary disabled:opacity-50 dark:hover:bg-dark-2"
                          title="Download PDF"
                        >
                          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v14m7-7H5" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(invoice.id)}
                          disabled={actionLoading === `delete-${invoice.id}`}
                          className="rounded p-1.5 text-red-500 transition hover:bg-red-50 disabled:opacity-50 dark:hover:bg-red-900/20"
                          title="Delete"
                        >
                          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
