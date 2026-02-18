"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { salesReturnsApi } from "@/services/api";

type SalesReturn = {
  id: string;
  return_number?: string;
  total_amount?: number;
  paid_payment?: number;
  amount_paid?: number;
  payment_status?: string;
};

const normalizeList = (response: unknown): SalesReturn[] => {
  if (Array.isArray(response)) return response as SalesReturn[];
  const obj = (response || {}) as { returns?: SalesReturn[] };
  return obj.returns || [];
};

const formatCurrency = (amount: number | undefined) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(amount || 0));

export default function SalesReturnPaymentsPage() {
  const { company } = useAuth();
  const params = useParams();
  const returnId = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [salesReturn, setSalesReturn] = useState<SalesReturn | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!company?.id || !returnId) return;
      try {
        const response = await salesReturnsApi.list(company.id);
        const rows = normalizeList(response);
        setSalesReturn(rows.find((item) => item.id === returnId) || null);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [company?.id, returnId]);

  const paid = useMemo(() => Number(salesReturn?.paid_payment ?? salesReturn?.amount_paid) || 0, [salesReturn]);
  const total = Number(salesReturn?.total_amount) || 0;
  const balance = Math.max(0, total - paid);

  if (loading) {
    return <div className="p-6">Loading payment history...</div>;
  }

  if (!salesReturn) {
    return <div className="p-6">Sales return not found.</div>;
  }

  return (
    <div className="p-6">
      <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Payment History</h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">Return: {salesReturn.return_number || "-"}</p>

        <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
            <p className="text-xs text-gray-500">Total</p>
            <p className="font-semibold">{formatCurrency(total)}</p>
          </div>
          <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
            <p className="text-xs text-gray-500">Paid</p>
            <p className="font-semibold text-green-600">{formatCurrency(paid)}</p>
          </div>
          <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
            <p className="text-xs text-gray-500">Balance</p>
            <p className="font-semibold text-yellow-600">{formatCurrency(balance)}</p>
          </div>
        </div>

        <div className="mt-6 rounded-lg border border-dashed border-gray-300 p-4 text-sm text-gray-600 dark:border-gray-600 dark:text-gray-300">
          Detailed payment transactions endpoint is not available yet for sales returns. Current payment totals are shown above.
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {balance > 0 && (
            <Link href={`/sales/sales-returns/${salesReturn.id}/payment`} className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700">
              Pay Now
            </Link>
          )}
          <Link href={`/sales/sales-returns/${salesReturn.id}`} className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 dark:border-gray-600 dark:text-gray-200">
            Back to Details
          </Link>
        </div>
      </div>
    </div>
  );
}
