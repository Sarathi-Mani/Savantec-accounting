"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { purchaseReturnsApi, PurchaseReturn } from "@/services/api";

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

export default function PurchaseReturnViewPage() {
  const router = useRouter();
  const params = useParams();
  const { company } = useAuth();
  const returnId = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [purchaseReturn, setPurchaseReturn] = useState<PurchaseReturn | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!company?.id || !returnId) return;
      setLoading(true);
      setError("");
      try {
        const data = await purchaseReturnsApi.get(company.id, returnId);
        setPurchaseReturn(data);
      } catch (err) {
        console.error(err);
        setError("Failed to load purchase return details.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [company?.id, returnId]);

  const paidAmount = useMemo(
    () => Number(purchaseReturn?.amount_paid) || 0,
    [purchaseReturn]
  );
  const totalAmount = Number(purchaseReturn?.total_amount) || 0;
  const balance = Math.max(0, totalAmount - paidAmount);

  if (loading) {
    return (
      <div className="p-6">
        <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
          Loading purchase return...
        </div>
      </div>
    );
  }

  if (error || !purchaseReturn) {
    return (
      <div className="p-6">
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
          {error || "Purchase return not found."}
        </div>
        <button
          onClick={() => router.push("/purchase/purchase-returns")}
          className="mt-4 rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 dark:border-gray-600 dark:text-gray-200"
        >
          Back to Purchase Returns
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Purchase Return</p>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {purchaseReturn.return_number || "-"}
            </h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={`/purchase/purchase-returns/edit/${purchaseReturn.id}`} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
              Edit
            </Link>
            <Link href="/purchase/purchase-returns" className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 dark:border-gray-600 dark:text-gray-200">
              Back
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <p className="text-xs text-gray-500">Return Date</p>
          <p className="mt-1 font-semibold text-gray-900 dark:text-white">{formatDate(purchaseReturn.return_date)}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <p className="text-xs text-gray-500">Purchase Code</p>
          <p className="mt-1 font-semibold text-gray-900 dark:text-white">{purchaseReturn.purchase_number || "-"}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <p className="text-xs text-gray-500">Vendor</p>
          <p className="mt-1 font-semibold text-gray-900 dark:text-white">{purchaseReturn.vendor_name || "-"}</p>
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
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Items</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="px-3 py-2 text-left">Description</th>
                <th className="px-3 py-2 text-right">Qty</th>
                <th className="px-3 py-2 text-right">Rate</th>
                <th className="px-3 py-2 text-right">GST%</th>
                <th className="px-3 py-2 text-right">Taxable</th>
                <th className="px-3 py-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {(purchaseReturn.items || []).map((item, idx) => (
                <tr key={item.id || idx} className="border-b">
                  <td className="px-3 py-2">{item.description}</td>
                  <td className="px-3 py-2 text-right">{Number(item.quantity || 0).toFixed(2)}</td>
                  <td className="px-3 py-2 text-right">{formatCurrency(Number(item.unit_price || 0))}</td>
                  <td className="px-3 py-2 text-right">{Number(item.gst_rate || 0).toFixed(2)}</td>
                  <td className="px-3 py-2 text-right">{formatCurrency(Number(item.taxable_amount || 0))}</td>
                  <td className="px-3 py-2 text-right font-medium">{formatCurrency(Number(item.total_amount || 0))}</td>
                </tr>
              ))}
              {(!purchaseReturn.items || purchaseReturn.items.length === 0) && (
                <tr><td colSpan={6} className="px-3 py-6 text-center text-gray-500">No items</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
