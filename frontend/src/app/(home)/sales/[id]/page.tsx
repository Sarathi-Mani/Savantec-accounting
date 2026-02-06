"use client";

import { useAuth } from "@/context/AuthContext";
import { invoicesApi, Invoice, getErrorMessage } from "@/services/api";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(amount || 0);
};

const formatDate = (value?: string) => {
  if (!value) return "-";
  const date = new Date(value.includes("T") ? value : `${value}T00:00:00`);
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getStatusColor = (status?: string) => {
  switch ((status || "").toLowerCase()) {
    case "paid":
      return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
    case "pending":
      return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";
    case "partially_paid":
      return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
    case "overdue":
      return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
    case "cancelled":
      return "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400";
    case "draft":
      return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400";
    case "refunded":
      return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400";
    case "void":
      return "bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400";
    case "write_off":
      return "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400";
    default:
      return "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400";
  }
};

export default function SalesInvoiceViewPage() {
  const { company } = useAuth();
  const router = useRouter();
  const params = useParams();
  const invoiceId = params.id as string;

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchInvoice = async () => {
      if (!company?.id || !invoiceId) return;
      setLoading(true);
      setError(null);
      try {
        const data = await invoicesApi.get(company.id, invoiceId);
        setInvoice(data);
      } catch (err: any) {
        setError(getErrorMessage(err, "Failed to load invoice"));
      } finally {
        setLoading(false);
      }
    };

    fetchInvoice();
  }, [company?.id, invoiceId]);

  const handleDownloadPdf = async () => {
    if (!company?.id || !invoice) return;
    try {
      const blob = await invoicesApi.downloadPdf(company.id, invoice.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Invoice_${invoice.invoice_number}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      setError(getErrorMessage(err, "Failed to download invoice PDF"));
    }
  };

  if (!company) {
    return (
      <div className="rounded-lg bg-white p-8 text-center shadow-1 dark:bg-gray-dark">
        <p className="text-dark-6">Please select a company first</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="rounded-lg bg-white p-8 text-center shadow-1 dark:bg-gray-dark">
        <p className="text-dark-6">Invoice not found</p>
        <Link href="/sales/sales-list" className="mt-4 inline-block text-primary hover:underline">
          Back to Sales
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/sales/sales-list" className="text-sm text-dark-6 hover:text-primary">
            ← Back to Sales
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-dark dark:text-white">
            Sales Invoice {invoice.invoice_number}
          </h1>
          <p className="text-sm text-dark-6">Created on {formatDate(invoice.created_at)}</p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${getStatusColor(invoice.status)}`}
          >
            {invoice.status.replace("_", " ")}
          </span>
          <button
            onClick={handleDownloadPdf}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-opacity-90"
          >
            Download PDF
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-red-600 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-lg bg-white p-6 shadow-1 dark:bg-gray-dark lg:col-span-2">
          <h2 className="mb-4 text-lg font-semibold text-dark dark:text-white">Customer</h2>
          <div className="space-y-2 text-sm">
            <p className="font-medium text-dark dark:text-white">
              {invoice.customer_name || "Walk-in Customer"}
            </p>
            <p className="text-dark-6">GSTIN: {invoice.customer_gstin || "-"}</p>
            <p className="text-dark-6">Phone: {invoice.customer_phone || "-"}</p>
            <p className="text-dark-6">Place of Supply: {invoice.place_of_supply_name || "-"}</p>
          </div>
        </div>

        <div className="rounded-lg bg-white p-6 shadow-1 dark:bg-gray-dark">
          <h2 className="mb-4 text-lg font-semibold text-dark dark:text-white">Invoice Info</h2>
          <div className="space-y-2 text-sm">
            <p className="text-dark-6">Invoice Date: {formatDate(invoice.invoice_date)}</p>
            <p className="text-dark-6">Due Date: {formatDate(invoice.due_date)}</p>
            <p className="text-dark-6">Status: {invoice.status.replace("_", " ")}</p>
            <p className="text-dark-6">Reference: {invoice.reference_no || "-"}</p>
          </div>
        </div>
      </div>

      <div className="rounded-lg bg-white p-6 shadow-1 dark:bg-gray-dark">
        <h2 className="mb-4 text-lg font-semibold text-dark dark:text-white">Items</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-stroke dark:border-dark-3 text-left text-sm text-dark-6">
                <th className="py-3 pr-3">Item</th>
                <th className="py-3 pr-3">Qty</th>
                <th className="py-3 pr-3">Unit Price</th>
                <th className="py-3 pr-3">Discount</th>
                <th className="py-3 pr-3">GST</th>
                <th className="py-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {(invoice.items || []).map((item) => (
                <tr key={item.id} className="border-b border-stroke dark:border-dark-3 text-sm">
                  <td className="py-3 pr-3">
                    <div className="font-medium text-dark dark:text-white">{item.description}</div>
                    <div className="text-xs text-dark-6">HSN: {item.hsn_code || "-"}</div>
                  </td>
                  <td className="py-3 pr-3 text-dark-6">
                    {item.quantity} {item.unit}
                  </td>
                  <td className="py-3 pr-3 text-dark-6">{formatCurrency(item.unit_price)}</td>
                  <td className="py-3 pr-3 text-dark-6">
                    {item.discount_percent || 0}% ({formatCurrency(item.discount_amount || 0)})
                  </td>
                  <td className="py-3 pr-3 text-dark-6">{item.gst_rate || 0}%</td>
                  <td className="py-3 text-right font-medium text-dark dark:text-white">
                    {formatCurrency(item.total_amount)}
                  </td>
                </tr>
              ))}
              {(invoice.items || []).length === 0 && (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-dark-6">
                    No items found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-lg bg-white p-6 shadow-1 dark:bg-gray-dark">
        <div className="ml-auto max-w-md space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-dark-6">Subtotal</span>
            <span className="font-medium text-dark dark:text-white">
              {formatCurrency(invoice.subtotal)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-dark-6">Total Tax</span>
            <span className="font-medium text-dark dark:text-white">
              {formatCurrency(invoice.total_tax)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-dark-6">Total Amount</span>
            <span className="font-semibold text-dark dark:text-white">
              {formatCurrency(invoice.total_amount)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-dark-6">Amount Paid</span>
            <span className="font-medium text-green-600">
              {formatCurrency(invoice.amount_paid)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-dark-6">Balance Due</span>
            <span className="font-medium text-red-600">
              {formatCurrency(invoice.balance_due)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
