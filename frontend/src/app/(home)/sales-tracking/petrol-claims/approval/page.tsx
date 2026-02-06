"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Eye,
  DollarSign,
  User,
  Calendar,
  AlertCircle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:6768";

interface PetrolClaim {
  id: string;
  claim_number: string;
  engineer_id: string;
  engineer_name: string;
  trip_id: string;
  claim_date: string;
  eligible_distance_km: number;
  claimed_amount: number;
  status: string;
  has_fraud_flag: boolean;
  fraud_reason: string | null;
  submitted_at: string;
}

export default function ClaimApprovalPage() {
  const router = useRouter();
  const [claims, setClaims] = useState<PetrolClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClaims, setSelectedClaims] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState<string>("");
  const [approvalNotes, setApprovalNotes] = useState<string>("");
  const [showDetails, setShowDetails] = useState<string | null>(null);

  const companyId = typeof window !== "undefined" ? localStorage.getItem("company_id") : null;

  useEffect(() => {
    if (companyId) {
      fetchClaims();
    }
  }, [companyId]);

  const fetchClaims = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${API_BASE}/api/companies/${companyId}/petrol-claims?status=submitted`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          },
        }
      );

      if (!response.ok) throw new Error("Failed to fetch claims");
      const data = await response.json();
      setClaims(data);
    } catch (err) {
      console.error("Failed to load claims:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectClaim = (claimId: string) => {
    setSelectedClaims(prev =>
      prev.includes(claimId)
        ? prev.filter(id => id !== claimId)
        : [...prev, claimId]
    );
  };

  const handleSelectAll = () => {
    if (selectedClaims.length === claims.length) {
      setSelectedClaims([]);
    } else {
      setSelectedClaims(claims.map(claim => claim.id));
    }
  };

  const handleApproveClaim = async (claimId: string, approve: boolean) => {
    const action = approve ? "approve" : "reject";
    const confirmMessage = approve
      ? "Are you sure you want to approve this claim?"
      : "Are you sure you want to reject this claim?";

    if (!confirm(confirmMessage)) return;

    try {
      const response = await fetch(
        `${API_BASE}/api/companies/${companyId}/petrol-claims/${claimId}/${action}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          },
          body: JSON.stringify({
            notes: approvalNotes || `${action === "approve" ? "Approved" : "Rejected"} by admin`,
          }),
        }
      );

      if (response.ok) {
        alert(`Claim ${action === "approve" ? "approved" : "rejected"} successfully!`);
        fetchClaims();
        setSelectedClaims(prev => prev.filter(id => id !== claimId));
      } else {
        throw new Error(`Failed to ${action} claim`);
      }
    } catch (err) {
      alert(`Failed to ${action} claim`);
      console.error(err);
    }
  };

  const handleBulkAction = async () => {
    if (selectedClaims.length === 0 || !bulkAction) {
      alert("Please select claims and choose an action");
      return;
    }

    const confirmMessage = bulkAction === "approve"
      ? `Are you sure you want to approve ${selectedClaims.length} claims?`
      : `Are you sure you want to reject ${selectedClaims.length} claims?`;

    if (!confirm(confirmMessage)) return;

    try {
      const promises = selectedClaims.map(claimId =>
        fetch(
          `${API_BASE}/api/companies/${companyId}/petrol-claims/${claimId}/${bulkAction}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${localStorage.getItem("access_token")}`,
            },
            body: JSON.stringify({
              notes: approvalNotes || `Bulk ${bulkAction === "approve" ? "Approved" : "Rejected"} by admin`,
            }),
          }
        )
      );

      await Promise.all(promises);
      alert(`Bulk ${bulkAction === "approve" ? "approval" : "rejection"} completed!`);
      fetchClaims();
      setSelectedClaims([]);
      setBulkAction("");
    } catch (err) {
      alert("Failed to process bulk action");
      console.error(err);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (!companyId) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 dark:bg-yellow-900/20 dark:border-yellow-800">
          <p className="text-yellow-800 dark:text-yellow-400">Please select a company first.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Claim Approval
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Review and approve pending petrol claims
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchClaims}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors flex items-center gap-2"
            >
              <RefreshCw className="w-5 h-5" />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedClaims.length > 0 && (
        <div className="px-6 py-4 bg-indigo-50 dark:bg-indigo-900/20 border-b border-indigo-200 dark:border-indigo-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-indigo-800 dark:text-indigo-300">
                {selectedClaims.length} claim{selectedClaims.length !== 1 ? "s" : ""} selected
              </span>
              <div className="flex items-center gap-2">
                <select
                  value={bulkAction}
                  onChange={(e) => setBulkAction(e.target.value)}
                  className="px-3 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                >
                  <option value="">Bulk Action</option>
                  <option value="approve">Approve Selected</option>
                  <option value="reject">Reject Selected</option>
                </select>
                <button
                  onClick={handleBulkAction}
                  disabled={!bulkAction}
                  className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Apply
                </button>
              </div>
            </div>
            <button
              onClick={() => setSelectedClaims([])}
              className="text-sm text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300"
            >
              Clear Selection
            </button>
          </div>
        </div>
      )}

      {/* Approval Notes */}
      <div className="px-6 py-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Approval Notes (Optional)
          </label>
          <textarea
            value={approvalNotes}
            onChange={(e) => setApprovalNotes(e.target.value)}
            placeholder="Add notes for approval/rejection..."
            rows={2}
            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
          />
        </div>
      </div>

      {/* Claims List */}
      <div className="p-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
          </div>
        ) : claims.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center">
            <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No Pending Claims
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              All submitted claims have been processed.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Select All */}
            <div className="flex items-center gap-3 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <input
                type="checkbox"
                checked={selectedClaims.length === claims.length && claims.length > 0}
                onChange={handleSelectAll}
                className="h-4 w-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
              />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Select all {claims.length} claims
              </span>
            </div>

            {/* Claims */}
            {claims.map((claim) => (
              <div
                key={claim.id}
                className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      <input
                        type="checkbox"
                        checked={selectedClaims.includes(claim.id)}
                        onChange={() => handleSelectClaim(claim.id)}
                        className="h-5 w-5 mt-1 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                              {claim.claim_number}
                            </h3>
                            <div className="flex items-center gap-4 mt-2 text-sm text-gray-600 dark:text-gray-400">
                              <div className="flex items-center gap-1">
                                <User className="w-4 h-4" />
                                {claim.engineer_name}
                              </div>
                              <div className="flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                {new Date(claim.claim_date).toLocaleDateString()}
                              </div>
                              <div className="flex items-center gap-1">
                                <DollarSign className="w-4 h-4" />
                                {formatCurrency(claim.claimed_amount)}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-gray-900 dark:text-white">
                              {formatCurrency(claim.claimed_amount)}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {claim.eligible_distance_km.toFixed(2)} km × ₹10
                            </div>
                          </div>
                        </div>

                        {claim.has_fraud_flag && (
                          <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                            <div className="flex items-center gap-2">
                              <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0" />
                              <div>
                                <p className="text-sm font-medium text-red-800 dark:text-red-300">
                                  Fraud Flagged
                                </p>
                                <p className="text-sm text-red-700 dark:text-red-400">
                                  {claim.fraud_reason || "Potential fraud detected"}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="mt-4">
                          <button
                            onClick={() => setShowDetails(showDetails === claim.id ? null : claim.id)}
                            className="text-sm text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 flex items-center gap-1"
                          >
                            {showDetails === claim.id ? (
                              <>
                                <ChevronUp className="w-4 h-4" />
                                Hide Details
                              </>
                            ) : (
                              <>
                                <ChevronDown className="w-4 h-4" />
                                Show Details
                              </>
                            )}
                          </button>

                          {showDetails === claim.id && (
                            <div className="mt-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                  <p className="text-gray-500 dark:text-gray-400">Submitted On</p>
                                  <p className="font-medium text-gray-900 dark:text-white">
                                    {new Date(claim.submitted_at).toLocaleString()}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-gray-500 dark:text-gray-400">Distance</p>
                                  <p className="font-medium text-gray-900 dark:text-white">
                                    {claim.eligible_distance_km.toFixed(2)} km
                                  </p>
                                </div>
                                <div>
                                  <p className="text-gray-500 dark:text-gray-400">Claim Status</p>
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                                    {claim.status.replace("_", " ")}
                                  </span>
                                </div>
                                <div>
                                  <p className="text-gray-500 dark:text-gray-400">Actions</p>
                                  <div className="flex items-center gap-2 mt-1">
                                    <button
                                      onClick={() => router.push(`/sales-tracking/petrol-claims/${claim.id}`)}
                                      className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:text-gray-300 dark:hover:bg-gray-700"
                                      title="View Details"
                                    >
                                      <Eye className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => router.push(`/sales-tracking/trips/${claim.trip_id}`)}
                                      className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:text-gray-300 dark:hover:bg-gray-700"
                                      title="View Trip"
                                    >
                                      <DollarSign className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                    <button
                      onClick={() => handleApproveClaim(claim.id, false)}
                      className="px-4 py-2 rounded-lg border border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 flex items-center gap-2"
                    >
                      <XCircle className="w-4 h-4" />
                      Reject
                    </button>
                    <button
                      onClick={() => handleApproveClaim(claim.id, true)}
                      className="px-4 py-2 rounded-lg border border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30 flex items-center gap-2"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Approve
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}