"use client";

import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import dayjs from "dayjs";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface StockJournalItem {
  id: string;
  item_type: string;
  product_id: string;
  product_name: string | null;
  godown_id: string | null;
  godown_name: string | null;
  batch_id: string | null;
  quantity: number;
  unit: string | null;
  rate: number;
  value: number;
  cost_allocation_percent: number | null;
  notes: string | null;
}

interface StockJournal {
  id: string;
  voucher_number: string;
  voucher_date: string;
  journal_type: string;
  status: string;
  from_godown_id: string | null;
  from_godown_name: string | null;
  to_godown_id: string | null;
  to_godown_name: string | null;
  bom_id: string | null;
  bom_name: string | null;
  narration: string | null;
  notes: string | null;
  additional_cost: number | null;
  additional_cost_type: string | null;
  created_at: string;
  confirmed_at: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  source_items: StockJournalItem[];
  destination_items: StockJournalItem[];
}

export default function StockJournalDetailPage() {
  const { company } = useAuth();
  const router = useRouter();
  const params = useParams();
  const journalId = params.id as string;

  const [journal, setJournal] = useState<StockJournal | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  const getToken = () =>
    typeof window !== "undefined" ? localStorage.getItem("employee_token") || localStorage.getItem("access_token") : null;

  const fetchJournal = async () => {
    const token = getToken();
    if (!company?.id || !token || !journalId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:6768/api"}/companies/${company.id}/stock-journals/${journalId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (response.ok) {
        setJournal(await response.json());
      }
    } catch (error) {
      console.error("Failed to fetch stock journal:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJournal();
  }, [company?.id, journalId]);

  const handleConfirm = async () => {
    const token = getToken();
    if (!company?.id || !token || !journalId) return;

    setActionLoading(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:6768/api"}/companies/${company.id}/stock-journals/${journalId}/confirm`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (response.ok) {
        await fetchJournal();
      } else {
        const err = await response.json();
        alert(err.detail || "Failed to confirm journal");
      }
    } catch (error) {
      console.error("Confirm error:", error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    const token = getToken();
    if (!company?.id || !token || !journalId || !cancelReason.trim()) return;

    setActionLoading(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:6768/api"}/companies/${company.id}/stock-journals/${journalId}/cancel`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ reason: cancelReason }),
        }
      );
      if (response.ok) {
        setShowCancelModal(false);
        setCancelReason("");
        await fetchJournal();
      } else {
        const err = await response.json();
        alert(err.detail || "Failed to cancel journal");
      }
    } catch (error) {
      console.error("Cancel error:", error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    const token = getToken();
    if (!company?.id || !token || !journalId) return;

    if (!confirm("Are you sure you want to delete this draft journal?")) return;

    setActionLoading(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:6768/api"}/companies/${company.id}/stock-journals/${journalId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (response.ok) {
        router.push("/inventory/stock-journal");
      } else {
        const err = await response.json();
        alert(err.detail || "Failed to delete journal");
      }
    } catch (error) {
      console.error("Delete error:", error);
    } finally {
      setActionLoading(false);
    }
  };

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
      transfer: "Inter-Godown Transfer",
      manufacturing: "Manufacturing/Assembly",
      disassembly: "Disassembly",
      repackaging: "Repackaging",
      conversion: "Product Conversion",
      adjustment: "Stock Adjustment",
    };
    return labels[type.toLowerCase()] || type;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
    }).format(value);
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  if (!journal) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-dark dark:text-white">Journal not found</h2>
        <Link href="/inventory/stock-journal" className="text-primary hover:underline mt-2 inline-block">
          Back to Stock Journals
        </Link>
      </div>
    );
  }

  const sourceTotal = journal.source_items.reduce((sum, item) => sum + item.value, 0);
  const destTotal = journal.destination_items.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="mx-auto max-w-5xl">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-dark dark:text-white">
              {journal.voucher_number}
            </h1>
            <span
              className={cn(
                "inline-flex rounded-full px-3 py-1 text-xs font-medium",
                getTypeColor(journal.journal_type)
              )}
            >
              {getTypeLabel(journal.journal_type)}
            </span>
            <span
              className={cn(
                "inline-flex rounded-full px-3 py-1 text-xs font-medium capitalize",
                getStatusColor(journal.status)
              )}
            >
              {journal.status}
            </span>
          </div>
          <p className="text-sm text-dark-6 mt-1">
            {dayjs(journal.voucher_date).format("DD MMMM YYYY")}
          </p>
        </div>
        <div className="flex gap-2">
          {journal.status === "draft" && (
            <>
              <button
                onClick={handleConfirm}
                disabled={actionLoading}
                className="rounded-lg bg-green-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-600 disabled:opacity-50"
              >
                Confirm
              </button>
              <button
                onClick={handleDelete}
                disabled={actionLoading}
                className="rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-600 disabled:opacity-50"
              >
                Delete
              </button>
            </>
          )}
          {journal.status === "confirmed" && (
            <button
              onClick={() => setShowCancelModal(true)}
              disabled={actionLoading}
              className="rounded-lg border border-red-500 px-4 py-2 text-sm font-medium text-red-500 transition hover:bg-red-50 disabled:opacity-50 dark:hover:bg-red-900/30"
            >
              Cancel & Reverse
            </button>
          )}
          <Link
            href="/inventory/stock-journal"
            className="rounded-lg border border-stroke px-4 py-2 text-sm font-medium transition hover:bg-gray-50 dark:border-dark-3 dark:hover:bg-dark-2"
          >
            Back to List
          </Link>
        </div>
      </div>

      {/* Details Card */}
      <div className="mb-6 rounded-lg bg-white p-6 shadow-1 dark:bg-gray-dark">
        <h2 className="mb-4 text-lg font-semibold text-dark dark:text-white">Details</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <p className="text-xs text-dark-6">Narration</p>
            <p className="font-medium text-dark dark:text-white">{journal.narration || "-"}</p>
          </div>
          {journal.from_godown_name && (
            <div>
              <p className="text-xs text-dark-6">From Godown</p>
              <p className="font-medium text-dark dark:text-white">{journal.from_godown_name}</p>
            </div>
          )}
          {journal.to_godown_name && (
            <div>
              <p className="text-xs text-dark-6">To Godown</p>
              <p className="font-medium text-dark dark:text-white">{journal.to_godown_name}</p>
            </div>
          )}
          {journal.bom_name && (
            <div>
              <p className="text-xs text-dark-6">Bill of Materials</p>
              <p className="font-medium text-dark dark:text-white">{journal.bom_name}</p>
            </div>
          )}
          {journal.additional_cost && journal.additional_cost > 0 && (
            <div>
              <p className="text-xs text-dark-6">Additional Cost</p>
              <p className="font-medium text-dark dark:text-white">
                {formatCurrency(journal.additional_cost)}
                {journal.additional_cost_type && ` (${journal.additional_cost_type})`}
              </p>
            </div>
          )}
          <div>
            <p className="text-xs text-dark-6">Created</p>
            <p className="font-medium text-dark dark:text-white">
              {dayjs(journal.created_at).format("DD MMM YYYY HH:mm")}
            </p>
          </div>
          {journal.confirmed_at && (
            <div>
              <p className="text-xs text-dark-6">Confirmed</p>
              <p className="font-medium text-green-600">
                {dayjs(journal.confirmed_at).format("DD MMM YYYY HH:mm")}
              </p>
            </div>
          )}
          {journal.cancelled_at && (
            <div>
              <p className="text-xs text-dark-6">Cancelled</p>
              <p className="font-medium text-red-600">
                {dayjs(journal.cancelled_at).format("DD MMM YYYY HH:mm")}
              </p>
            </div>
          )}
        </div>
        {journal.cancellation_reason && (
          <div className="mt-4 rounded-lg bg-red-50 p-3 dark:bg-red-900/30">
            <p className="text-xs text-dark-6">Cancellation Reason</p>
            <p className="text-sm text-red-700 dark:text-red-400">{journal.cancellation_reason}</p>
          </div>
        )}
        {journal.notes && (
          <div className="mt-4">
            <p className="text-xs text-dark-6">Notes</p>
            <p className="text-sm text-dark dark:text-white">{journal.notes}</p>
          </div>
        )}
      </div>

      {/* Source Items */}
      {journal.source_items.length > 0 && (
        <div className="mb-6 rounded-lg bg-white p-6 shadow-1 dark:bg-gray-dark">
          <h2 className="mb-4 text-lg font-semibold text-dark dark:text-white">
            Source Items (Consumption/Outward)
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full table-auto text-sm">
              <thead>
                <tr className="border-b border-stroke dark:border-dark-3">
                  <th className="px-4 py-2 text-left font-medium text-dark dark:text-white">Product</th>
                  <th className="px-4 py-2 text-left font-medium text-dark dark:text-white">Godown</th>
                  <th className="px-4 py-2 text-right font-medium text-dark dark:text-white">Qty</th>
                  <th className="px-4 py-2 text-right font-medium text-dark dark:text-white">Rate</th>
                  <th className="px-4 py-2 text-right font-medium text-dark dark:text-white">Value</th>
                </tr>
              </thead>
              <tbody>
                {journal.source_items.map((item) => (
                  <tr key={item.id} className="border-b border-stroke dark:border-dark-3">
                    <td className="px-4 py-3 font-medium text-dark dark:text-white">
                      {item.product_name || item.product_id}
                    </td>
                    <td className="px-4 py-3 text-dark-6">{item.godown_name || "-"}</td>
                    <td className="px-4 py-3 text-right text-dark dark:text-white">
                      {item.quantity} {item.unit || ""}
                    </td>
                    <td className="px-4 py-3 text-right text-dark-6">{formatCurrency(item.rate)}</td>
                    <td className="px-4 py-3 text-right font-medium text-dark dark:text-white">
                      {formatCurrency(item.value)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="font-semibold">
                  <td colSpan={4} className="px-4 py-3 text-right text-dark dark:text-white">
                    Total (Outward):
                  </td>
                  <td className="px-4 py-3 text-right text-red-600">{formatCurrency(sourceTotal)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Destination Items */}
      {journal.destination_items.length > 0 && (
        <div className="mb-6 rounded-lg bg-white p-6 shadow-1 dark:bg-gray-dark">
          <h2 className="mb-4 text-lg font-semibold text-dark dark:text-white">
            Destination Items (Production/Inward)
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full table-auto text-sm">
              <thead>
                <tr className="border-b border-stroke dark:border-dark-3">
                  <th className="px-4 py-2 text-left font-medium text-dark dark:text-white">Product</th>
                  <th className="px-4 py-2 text-left font-medium text-dark dark:text-white">Godown</th>
                  <th className="px-4 py-2 text-right font-medium text-dark dark:text-white">Qty</th>
                  <th className="px-4 py-2 text-right font-medium text-dark dark:text-white">Rate</th>
                  <th className="px-4 py-2 text-right font-medium text-dark dark:text-white">Value</th>
                </tr>
              </thead>
              <tbody>
                {journal.destination_items.map((item) => (
                  <tr key={item.id} className="border-b border-stroke dark:border-dark-3">
                    <td className="px-4 py-3 font-medium text-dark dark:text-white">
                      {item.product_name || item.product_id}
                    </td>
                    <td className="px-4 py-3 text-dark-6">{item.godown_name || "-"}</td>
                    <td className="px-4 py-3 text-right text-dark dark:text-white">
                      {item.quantity} {item.unit || ""}
                    </td>
                    <td className="px-4 py-3 text-right text-dark-6">{formatCurrency(item.rate)}</td>
                    <td className="px-4 py-3 text-right font-medium text-dark dark:text-white">
                      {formatCurrency(item.value)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="font-semibold">
                  <td colSpan={4} className="px-4 py-3 text-right text-dark dark:text-white">
                    Total (Inward):
                  </td>
                  <td className="px-4 py-3 text-right text-green-600">{formatCurrency(destTotal)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 dark:bg-gray-dark">
            <h3 className="text-lg font-semibold text-dark dark:text-white mb-4">
              Cancel Stock Journal
            </h3>
            <p className="text-sm text-dark-6 mb-4">
              This will reverse all stock entries created by this journal. Please provide a reason.
            </p>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Enter cancellation reason..."
              rows={3}
              className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3 mb-4"
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowCancelModal(false);
                  setCancelReason("");
                }}
                className="rounded-lg border border-stroke px-4 py-2 text-sm font-medium transition hover:bg-gray-50 dark:border-dark-3 dark:hover:bg-dark-2"
              >
                Close
              </button>
              <button
                onClick={handleCancel}
                disabled={actionLoading || !cancelReason.trim()}
                className="rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-600 disabled:opacity-50"
              >
                {actionLoading ? "Cancelling..." : "Cancel & Reverse"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
