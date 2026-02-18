"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { salesReturnsApi } from "@/services/api";

type SalesReturn = {
  id: string;
  return_number?: string;
  customer_name?: string;
  total_amount?: number;
  paid_payment?: number;
  amount_paid?: number;
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

export default function SalesReturnPaymentPage() {
  const { company } = useAuth();
  const params = useParams();
  const returnId = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [salesReturn, setSalesReturn] = useState<SalesReturn | null>(null);
  const [amount, setAmount] = useState(0);
  const [paymentType, setPaymentType] = useState("cash");
  const [note, setNote] = useState("");

  useEffect(() => {
    const load = async () => {
      if (!company?.id || !returnId) return;
      try {
        const response = await salesReturnsApi.list(company.id);
        const rows = normalizeList(response);
        const found = rows.find((item) => item.id === returnId) || null;
        setSalesReturn(found);
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

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    alert("Sales return payment API is not available yet. Route is connected and ready for backend integration.");
  };

  if (loading) {
    return <div className="p-6">Loading payment page...</div>;
  }

  if (!salesReturn) {
    return <div className="p-6">Sales return not found.</div>;
  }

  return (
    <div className="p-6">
      <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Pay Refund</h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
          Return: {salesReturn.return_number || "-"} | Customer: {salesReturn.customer_name || "-"}
        </p>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
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

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Amount</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value) || 0)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Payment Type</label>
            <select
              value={paymentType}
              onChange={(e) => setPaymentType(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
            >
              <option value="cash">Cash</option>
              <option value="bank">Bank</option>
              <option value="upi">UPI</option>
              <option value="card">Card</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Note</label>
            <textarea
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <button type="submit" className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700">
              Save Payment
            </button>
            <Link href={`/sales/sales-returns/${salesReturn.id}/payments`} className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 dark:border-gray-600 dark:text-gray-200">
              View Payments
            </Link>
            <Link href={`/sales/sales-returns/${salesReturn.id}`} className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 dark:border-gray-600 dark:text-gray-200">
              Back to Details
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
