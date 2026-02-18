"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { salesReturnsApi } from "@/services/api";

type SalesReturn = {
  id: string;
  return_number?: string;
  invoice_id?: string;
  invoice_number?: string;
  customer_name?: string;
  return_date?: string;
  total_amount?: number;
  paid_payment?: number;
  amount_paid?: number;
  payment_status?: string;
  reason?: string;
  status?: string;
  reference_no?: string;
  created_by?: string;
  created_by_name?: string;
  created_at?: string;
};

const formatCurrency = (amount: number | undefined) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(amount || 0));

const formatDate = (value?: string) => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const normalizeList = (response: unknown): SalesReturn[] => {
  if (Array.isArray(response)) return response as SalesReturn[];
  const obj = (response || {}) as { returns?: SalesReturn[] };
  return obj.returns || [];
};

export default function SalesReturnViewPage() {
  const router = useRouter();
  const params = useParams();
  const { company } = useAuth();
  const returnId = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [salesReturn, setSalesReturn] = useState<SalesReturn | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!company?.id || !returnId) return;
      setLoading(true);
      setError("");
      try {
        const response = await salesReturnsApi.list(company.id);
        const allReturns = normalizeList(response);
        const found = allReturns.find((item) => item.id === returnId) || null;
        if (!found) {
          setError("Sales return not found.");
        }
        setSalesReturn(found);
      } catch (err) {
        console.error(err);
        setError("Failed to load sales return details.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [company?.id, returnId]);

  const paidAmount = useMemo(
    () => Number(salesReturn?.paid_payment ?? salesReturn?.amount_paid) || 0,
    [salesReturn]
  );
  const totalAmount = Number(salesReturn?.total_amount) || 0;
  const balance = Math.max(0, totalAmount - paidAmount);

  if (loading) {
    return (
      <div className="p-6">
        <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
          Loading sales return...
        </div>
      </div>
    );
  }

  if (error || !salesReturn) {
    return (
      <div className="p-6">
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
          {error || "Sales return not found."}
        </div>
        <button
          onClick={() => router.push("/sales/sales-returns")}
          className="mt-4 rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 dark:border-gray-600 dark:text-gray-200"
        >
          Back to Sales Returns
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Sales Return</p>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {salesReturn.return_number || "-"}
            </h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={`/sales/sales-returns/${salesReturn.id}/edit`} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
              Edit
            </Link>
            <Link href={`/sales/sales-returns/${salesReturn.id}/payments`} className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 dark:border-gray-600 dark:text-gray-200">
              View Payments
            </Link>
            {balance > 0 && (
              <Link href={`/sales/sales-returns/${salesReturn.id}/payment`} className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700">
                Pay Now
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <p className="text-xs text-gray-500">Return Date</p>
          <p className="mt-1 font-semibold text-gray-900 dark:text-white">{formatDate(salesReturn.return_date)}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <p className="text-xs text-gray-500">Sales Code</p>
          <p className="mt-1 font-semibold text-gray-900 dark:text-white">{salesReturn.invoice_number || "-"}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <p className="text-xs text-gray-500">Customer</p>
          <p className="mt-1 font-semibold text-gray-900 dark:text-white">{salesReturn.customer_name || "-"}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <p className="text-xs text-gray-500">Total</p>
          <p className="mt-1 font-semibold text-gray-900 dark:text-white">{formatCurrency(totalAmount)}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <p className="text-xs text-gray-500">Paid</p>
          <p className="mt-1 font-semibold text-green-600">{formatCurrency(paidAmount)}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <p className="text-xs text-gray-500">Balance</p>
          <p className="mt-1 font-semibold text-yellow-600">{formatCurrency(balance)}</p>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Additional Details</h2>
        <div className="mt-4 space-y-2 text-sm text-gray-700 dark:text-gray-300">
          <p><span className="text-gray-500">Status:</span> {salesReturn.status || "-"}</p>
          <p><span className="text-gray-500">Payment Status:</span> {salesReturn.payment_status || "-"}</p>
          <p><span className="text-gray-500">Reference No:</span> {salesReturn.reference_no || "-"}</p>
          <p><span className="text-gray-500">Reason:</span> {salesReturn.reason || "-"}</p>
          <p><span className="text-gray-500">Created By:</span> {salesReturn.created_by_name || salesReturn.created_by || "-"}</p>
          <p><span className="text-gray-500">Created At:</span> {formatDate(salesReturn.created_at)}</p>
          {salesReturn.invoice_id && (
            <p>
              <span className="text-gray-500">Original Sale:</span>{" "}
              <Link href={`/sales/${salesReturn.invoice_id}`} className="text-blue-600 hover:underline dark:text-blue-400">
                Open Invoice
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
