"use client";

import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import dayjs from "dayjs";
import Link from "next/link";
import { useEffect, useState } from "react";

interface StockJournal {
  id: string;
  voucher_number: string;
  voucher_date: string;
  journal_type: string;
  status: string;
  from_godown_name: string | null;
  to_godown_name: string | null;
  narration: string | null;
  created_at: string;
}

interface StockJournalListResponse {
  items: StockJournal[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export default function StockJournalPage() {
  const { company } = useAuth();
  const [data, setData] = useState<StockJournalListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");

  const getToken = () =>
    typeof window !== "undefined" ? localStorage.getItem("access_token") : null;

  useEffect(() => {
    const fetchJournals = async () => {
      const token = getToken();
      if (!company?.id || !token) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.append("page", page.toString());
        params.append("page_size", "20");
        if (typeFilter) params.append("journal_type", typeFilter);
        if (statusFilter) params.append("status", statusFilter);

        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:6768/api"}/companies/${company.id}/stock-journals?${params}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        if (response.ok) {
          setData(await response.json());
        }
      } catch (error) {
        console.error("Failed to fetch stock journals:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchJournals();
  }, [company?.id, page, typeFilter, statusFilter]);

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "draft":
        return "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400";
      case "confirmed":
        return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
      case "cancelled":
        return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
      default:
        return "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400";
    }
  };

  const getTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case "transfer":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
      case "manufacturing":
        return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400";
      case "conversion":
        return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400";
      case "adjustment":
        return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";
      case "repackaging":
        return "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400";
      case "disassembly":
        return "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400";
      default:
        return "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400";
    }
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      transfer: "Transfer",
      manufacturing: "Manufacturing",
      disassembly: "Disassembly",
      repackaging: "Repackaging",
      conversion: "Conversion",
      adjustment: "Adjustment",
    };
    return labels[type.toLowerCase()] || type;
  };

  const totalPages = data ? data.total_pages : 0;

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark dark:text-white">Stock Journal</h1>
          <p className="text-sm text-dark-6">
            Manage stock transfers, manufacturing, conversions, and adjustments
          </p>
        </div>
        <Link
          href="/inventory/stock-journal/new"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition hover:bg-opacity-90"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Stock Journal
        </Link>
      </div>

      {/* Quick Action Buttons */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        <Link
          href="/inventory/stock-journal/new?type=transfer"
          className="flex flex-col items-center gap-2 rounded-lg border border-stroke bg-white p-4 text-center transition hover:border-primary hover:shadow-md dark:border-dark-3 dark:bg-gray-dark"
        >
          <svg className="h-6 w-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
          <span className="text-xs font-medium text-dark dark:text-white">Transfer</span>
        </Link>
        <Link
          href="/inventory/stock-journal/new?type=manufacturing"
          className="flex flex-col items-center gap-2 rounded-lg border border-stroke bg-white p-4 text-center transition hover:border-primary hover:shadow-md dark:border-dark-3 dark:bg-gray-dark"
        >
          <svg className="h-6 w-6 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
          </svg>
          <span className="text-xs font-medium text-dark dark:text-white">Manufacturing</span>
        </Link>
        <Link
          href="/inventory/stock-journal/new?type=conversion"
          className="flex flex-col items-center gap-2 rounded-lg border border-stroke bg-white p-4 text-center transition hover:border-primary hover:shadow-md dark:border-dark-3 dark:bg-gray-dark"
        >
          <svg className="h-6 w-6 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span className="text-xs font-medium text-dark dark:text-white">Conversion</span>
        </Link>
        <Link
          href="/inventory/stock-journal/new?type=adjustment"
          className="flex flex-col items-center gap-2 rounded-lg border border-stroke bg-white p-4 text-center transition hover:border-primary hover:shadow-md dark:border-dark-3 dark:bg-gray-dark"
        >
          <svg className="h-6 w-6 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
          </svg>
          <span className="text-xs font-medium text-dark dark:text-white">Adjustment</span>
        </Link>
        <Link
          href="/inventory/stock-journal/new?type=repackaging"
          className="flex flex-col items-center gap-2 rounded-lg border border-stroke bg-white p-4 text-center transition hover:border-primary hover:shadow-md dark:border-dark-3 dark:bg-gray-dark"
        >
          <svg className="h-6 w-6 text-cyan-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
          <span className="text-xs font-medium text-dark dark:text-white">Repackaging</span>
        </Link>
        <Link
          href="/inventory/stock-journal/new?type=disassembly"
          className="flex flex-col items-center gap-2 rounded-lg border border-stroke bg-white p-4 text-center transition hover:border-primary hover:shadow-md dark:border-dark-3 dark:bg-gray-dark"
        >
          <svg className="h-6 w-6 text-pink-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className="text-xs font-medium text-dark dark:text-white">Disassembly</span>
        </Link>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-col gap-4 rounded-lg bg-white p-4 shadow-1 dark:bg-gray-dark sm:flex-row">
        <select
          value={typeFilter}
          onChange={(e) => {
            setTypeFilter(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3"
        >
          <option value="">All Types</option>
          <option value="transfer">Transfer</option>
          <option value="manufacturing">Manufacturing</option>
          <option value="disassembly">Disassembly</option>
          <option value="repackaging">Repackaging</option>
          <option value="conversion">Conversion</option>
          <option value="adjustment">Adjustment</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3"
        >
          <option value="">All Status</option>
          <option value="draft">Draft</option>
          <option value="confirmed">Confirmed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg bg-white shadow-1 dark:bg-gray-dark">
        <div className="overflow-x-auto">
          <table className="w-full table-auto">
            <thead>
              <tr className="border-b border-stroke dark:border-dark-3">
                <th className="px-4 py-4 text-left font-medium text-dark dark:text-white">Voucher #</th>
                <th className="px-4 py-4 text-left font-medium text-dark dark:text-white">Type</th>
                <th className="px-4 py-4 text-left font-medium text-dark dark:text-white">Date</th>
                <th className="px-4 py-4 text-left font-medium text-dark dark:text-white">From/To Godown</th>
                <th className="px-4 py-4 text-left font-medium text-dark dark:text-white">Narration</th>
                <th className="px-4 py-4 text-left font-medium text-dark dark:text-white">Status</th>
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
              ) : data?.items?.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-dark-6">
                    No stock journals found. Create your first entry to get started.
                  </td>
                </tr>
              ) : (
                data?.items?.map((journal) => (
                  <tr
                    key={journal.id}
                    className="border-b border-stroke transition hover:bg-gray-50 dark:border-dark-3 dark:hover:bg-dark-2"
                  >
                    <td className="px-4 py-4">
                      <Link
                        href={`/inventory/stock-journal/${journal.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {journal.voucher_number}
                      </Link>
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={cn(
                          "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                          getTypeColor(journal.journal_type)
                        )}
                      >
                        {getTypeLabel(journal.journal_type)}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-dark-6">
                      {dayjs(journal.voucher_date).format("DD MMM YYYY")}
                    </td>
                    <td className="px-4 py-4 text-dark dark:text-white">
                      {journal.from_godown_name && journal.to_godown_name
                        ? `${journal.from_godown_name} → ${journal.to_godown_name}`
                        : journal.from_godown_name || journal.to_godown_name || "-"}
                    </td>
                    <td className="px-4 py-4 text-dark-6 max-w-xs truncate">
                      {journal.narration || "-"}
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={cn(
                          "inline-flex rounded-full px-3 py-1 text-xs font-medium capitalize",
                          getStatusColor(journal.status)
                        )}
                      >
                        {journal.status}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <Link
                          href={`/inventory/stock-journal/${journal.id}`}
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
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-stroke px-4 py-4 dark:border-dark-3">
            <p className="text-sm text-dark-6">
              Page {page} of {totalPages} ({data?.total} items)
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-lg border border-stroke px-4 py-2 text-sm font-medium transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-dark-3 dark:hover:bg-dark-2"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="rounded-lg border border-stroke px-4 py-2 text-sm font-medium transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-dark-3 dark:hover:bg-dark-2"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
