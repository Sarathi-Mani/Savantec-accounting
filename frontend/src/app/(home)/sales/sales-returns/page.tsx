"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { salesReturnsApi } from "@/services/api";

interface SalesReturnRow {
  id: string;
  return_number: string;
  invoice_number?: string;
  customer_name?: string;
  return_date: string;
  total_amount: number;
  reason: string;
  status: string;
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount || 0);

const formatDate = (dateValue?: string) => {
  if (!dateValue) return "-";
  const d = new Date(dateValue);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const normalizeStatus = (status?: string) => (status || "").trim().toLowerCase();

export default function SalesReturnsPage() {
  const { company } = useAuth();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<SalesReturnRow[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchRows = async () => {
      if (!company?.id) {
        setRows([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");
      try {
        const result = await salesReturnsApi.list(company.id);
        setRows((result || []) as SalesReturnRow[]);
      } catch (err) {
        console.error("Failed to fetch sales returns:", err);
        setRows([]);
        setError("Failed to load sales returns.");
      } finally {
        setLoading(false);
      }
    };

    fetchRows();
  }, [company?.id]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      const matchesSearch =
        !q ||
        (r.return_number || "").toLowerCase().includes(q) ||
        (r.invoice_number || "").toLowerCase().includes(q) ||
        (r.customer_name || "").toLowerCase().includes(q) ||
        (r.reason || "").toLowerCase().includes(q);

      const matchesStatus =
        !statusFilter || normalizeStatus(r.status) === normalizeStatus(statusFilter);

      return matchesSearch && matchesStatus;
    });
  }, [rows, search, statusFilter]);

  const summary = useMemo(() => {
    const total = filteredRows.reduce((sum, r) => sum + (Number(r.total_amount) || 0), 0);
    const approved = filteredRows
      .filter((r) => normalizeStatus(r.status) === "approved")
      .reduce((sum, r) => sum + (Number(r.total_amount) || 0), 0);
    const pending = filteredRows
      .filter((r) => normalizeStatus(r.status) === "pending")
      .reduce((sum, r) => sum + (Number(r.total_amount) || 0), 0);
    return { count: filteredRows.length, total, approved, pending };
  }, [filteredRows]);

  const getStatusColor = (status?: string) => {
    const normalized = normalizeStatus(status);
    if (normalized === "approved" || normalized === "completed") {
      return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
    }
    if (normalized === "pending" || normalized === "draft") {
      return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";
    }
    if (normalized === "rejected" || normalized === "cancelled") {
      return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
    }
    return "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400";
  };

  const getStatusText = (status?: string) => {
    const s = (status || "").trim();
    if (!s) return "Unknown";
    return s.charAt(0).toUpperCase() + s.slice(1);
  };

  return (
    <div className="w-full">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark dark:text-white">Sales Returns</h1>
          <p className="text-sm text-dark-6">Manage customer returns and refunds</p>
        </div>
        <Link
          href="/sales/sales-returns/new"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 font-medium text-white transition hover:bg-opacity-90"
        >
          New Return
        </Link>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg bg-white p-6 shadow-1 dark:bg-gray-dark">
          <p className="text-sm text-dark-6">Total Returns</p>
          <h3 className="mt-2 text-2xl font-bold text-dark dark:text-white">{summary.count}</h3>
        </div>
        <div className="rounded-lg bg-white p-6 shadow-1 dark:bg-gray-dark">
          <p className="text-sm text-dark-6">Total Amount</p>
          <h3 className="mt-2 text-2xl font-bold text-red-600">{formatCurrency(summary.total)}</h3>
        </div>
        <div className="rounded-lg bg-white p-6 shadow-1 dark:bg-gray-dark">
          <p className="text-sm text-dark-6">Pending</p>
          <h3 className="mt-2 text-2xl font-bold text-yellow-600">{formatCurrency(summary.pending)}</h3>
        </div>
        <div className="rounded-lg bg-white p-6 shadow-1 dark:bg-gray-dark">
          <p className="text-sm text-dark-6">Approved</p>
          <h3 className="mt-2 text-2xl font-bold text-green-600">{formatCurrency(summary.approved)}</h3>
        </div>
      </div>

      <div className="mb-6 flex flex-col gap-4 rounded-lg bg-white p-4 shadow-1 dark:bg-gray-dark sm:flex-row">
        <input
          type="text"
          placeholder="Search return no, invoice no, customer, reason..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3"
        >
          <option value="">All Status</option>
          <option value="approved">Approved</option>
          <option value="pending">Pending</option>
          <option value="rejected">Rejected</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      <div className="rounded-[10px] bg-white shadow-1 dark:bg-gray-dark">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-stroke dark:border-dark-3">
                <th className="px-6 py-4 text-left text-sm font-medium text-dark-6">Return No</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-dark-6">Invoice No</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-dark-6">Customer</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-dark-6">Date</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-dark-6">Amount</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-dark-6">Reason</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-dark-6">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-dark-6">
                    Loading sales returns...
                  </td>
                </tr>
              )}
              {!loading && error && (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-danger">
                    {error}
                  </td>
                </tr>
              )}
              {!loading && !error && filteredRows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-dark-6">
                    No sales returns found.
                  </td>
                </tr>
              )}
              {!loading &&
                !error &&
                filteredRows.map((r) => (
                  <tr key={r.id} className="border-b border-stroke last:border-0 dark:border-dark-3">
                    <td className="px-6 py-4 font-medium text-primary">{r.return_number || "-"}</td>
                    <td className="px-6 py-4 text-dark-6">{r.invoice_number || "-"}</td>
                    <td className="px-6 py-4 text-dark dark:text-white">{r.customer_name || "-"}</td>
                    <td className="px-6 py-4 text-dark-6">{formatDate(r.return_date)}</td>
                    <td className="px-6 py-4 font-medium text-red-600">
                      {formatCurrency(Number(r.total_amount) || 0)}
                    </td>
                    <td className="px-6 py-4 text-dark-6">{r.reason || "-"}</td>
                    <td className="px-6 py-4">
                      <span className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusColor(r.status)}`}>
                        {getStatusText(r.status)}
                      </span>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
