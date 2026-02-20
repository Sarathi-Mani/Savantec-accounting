"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Search,
  Filter,
  Download,
  FileText,
  Printer,
  RefreshCw,
  Eye,
  DollarSign,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  User,
  TrendingUp,
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
  approved_amount: number | null;
  status: string;
  has_fraud_flag: boolean;
  submitted_at: string | null;
  approved_at: string | null;
  paid_at: string | null;
}

export default function PetrolClaimsPage() {
  const router = useRouter();
  const [claims, setClaims] = useState<PetrolClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [engineerFilter, setEngineerFilter] = useState("");
  const [fraudFilter, setFraudFilter] = useState<string>("");
  const [showFilters, setShowFilters] = useState(false);
  const [engineers, setEngineers] = useState<any[]>([]);

  const companyId = typeof window !== "undefined" ? localStorage.getItem("company_id") : null;

  useEffect(() => {
    if (companyId) {
      fetchClaims();
      fetchEngineers();
    }
  }, [companyId]);

  useEffect(() => {
    if (companyId) {
      fetchClaims();
    }
  }, [statusFilter, engineerFilter, fraudFilter, fromDate, toDate]);

  const fetchEngineers = async () => {
    try {
      const response = await fetch(
        `${API_BASE}/api/companies/${companyId}/employees`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("employee_token") || localStorage.getItem("access_token")}`,
          },
        }
      );
      if (response.ok) {
        const data = await response.json();
        setEngineers(data);
      }
    } catch (err) {
      console.error("Failed to fetch engineers:", err);
    }
  };

  const fetchClaims = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (engineerFilter) params.append("engineer_id", engineerFilter);
      if (statusFilter) params.append("status", statusFilter);
      if (fromDate) params.append("start_date", fromDate);
      if (toDate) params.append("end_date", toDate);
      if (fraudFilter) params.append("has_fraud_flag", fraudFilter);
      if (search) params.append("search", search);

      const response = await fetch(
        `${API_BASE}/api/companies/${companyId}/petrol-claims?${params}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("employee_token") || localStorage.getItem("access_token")}`,
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

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusBadgeClass = (status: string, hasFraud: boolean) => {
    if (hasFraud) return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
    
    switch (status) {
      case "draft":
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
      case "submitted":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
      case "approved":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "rejected":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      case "paid":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "draft":
        return <Clock className="w-4 h-4" />;
      case "submitted":
        return <AlertCircle className="w-4 h-4" />;
      case "approved":
        return <CheckCircle className="w-4 h-4" />;
      case "rejected":
        return <XCircle className="w-4 h-4" />;
      case "paid":
        return <DollarSign className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const handleReset = () => {
    setSearch("");
    setFromDate("");
    setToDate("");
    setStatusFilter("");
    setEngineerFilter("");
    setFraudFilter("");
    fetchClaims();
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
              Petrol Claims
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Manage engineer petrol claims
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/sales-tracking/petrol-claims/new")}
              className="px-4 py-2 transition bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center gap-2"
            >
              <DollarSign className="w-5 h-5" />
              New Claim
            </button>
          </div>
        </div>
      </div>

      {/* Filters Section */}
      <div className="px-6 py-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search claim number, engineer..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && fetchClaims()}
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors flex items-center gap-2"
            >
              <Filter className="w-5 h-5" />
              Filters
            </button>
            <button
              onClick={fetchClaims}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors flex items-center gap-2"
            >
              <RefreshCw className="w-5 h-5" />
              Refresh
            </button>
            <button
              onClick={handleReset}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
            >
              Reset
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                From Date
              </label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                To Date
              </label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Engineer
              </label>
              <select
                value={engineerFilter}
                onChange={(e) => setEngineerFilter(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="">All Engineers</option>
                {engineers.map((engineer) => (
                  <option key={engineer.id} value={engineer.id}>
                    {engineer.first_name} {engineer.last_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="">All Status</option>
                <option value="draft">Draft</option>
                <option value="submitted">Submitted</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="paid">Paid</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Fraud Flag
              </label>
              <select
                value={fraudFilter}
                onChange={(e) => setFraudFilter(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="">All</option>
                <option value="true">Fraud Flagged</option>
                <option value="false">No Fraud</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 p-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Claims</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {claims.length}
              </p>
            </div>
            <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900/30">
              <DollarSign className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Amount</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {formatCurrency(claims.reduce((sum, claim) => sum + claim.claimed_amount, 0))}
              </p>
            </div>
            <div className="p-3 rounded-full bg-green-100 dark:bg-green-900/30">
              <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Pending Approval</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {claims.filter(c => c.status === "submitted").length}
              </p>
            </div>
            <div className="p-3 rounded-full bg-yellow-100 dark:bg-yellow-900/30">
              <Clock className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Fraud Flagged</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {claims.filter(c => c.has_fraud_flag).length}
              </p>
            </div>
            <div className="p-3 rounded-full bg-red-100 dark:bg-red-900/30">
              <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Claims Table */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 mx-6 mt-4 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-200 dark:bg-gray-700/50">
              <tr className="text-sm font-semibold text-gray-600 dark:text-gray-300">
                <th className="text-left px-6 py-3 whitespace-nowrap">Claim No</th>
                <th className="text-left px-6 py-3 whitespace-nowrap">Engineer</th>
                <th className="text-left px-6 py-3 whitespace-nowrap">Date</th>
                <th className="text-left px-6 py-3 whitespace-nowrap">Distance (KM)</th>
                <th className="text-left px-6 py-3 whitespace-nowrap">Amount</th>
                <th className="text-left px-6 py-3 whitespace-nowrap">Status</th>
                <th className="text-left px-6 py-3 whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700 text-sm text-gray-700 dark:text-gray-300">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center">
                    <div className="flex items-center justify-center">
                      <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
                    </div>
                  </td>
                </tr>
              ) : claims.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <DollarSign className="w-12 h-12 text-gray-400 mb-2" />
                      <p className="text-lg font-medium text-gray-900 dark:text-white mb-1">
                        No claims found
                      </p>
                      <p className="text-gray-500 dark:text-gray-400 mb-4">
                        {statusFilter || engineerFilter ?
                          "No claims found matching your filters." :
                          "Submit your first petrol claim."}
                      </p>
                      <button
                        onClick={() => router.push("/sales-tracking/petrol-claims/new")}
                        className="text-indigo-600 hover:underline dark:text-indigo-400"
                      >
                        Submit your first claim
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                claims.map((claim) => (
                  <tr
                    key={claim.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <Link
                        href={`/sales-tracking/petrol-claims/${claim.id}`}
                        className="text-indigo-600 hover:text-indigo-800 font-medium dark:text-indigo-400 dark:hover:text-indigo-300"
                      >
                        {claim.claim_number}
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-400" />
                        <span>{claim.engineer_name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {formatDate(claim.claim_date)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-gray-900 dark:text-white font-medium">
                        {claim.eligible_distance_km.toFixed(2)} km
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-gray-900 dark:text-white font-medium">
                        {formatCurrency(claim.claimed_amount)}
                      </div>
                      {claim.approved_amount && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          Approved: {formatCurrency(claim.approved_amount)}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            getStatusBadgeClass(claim.status, claim.has_fraud_flag)
                          }`}
                        >
                          {getStatusIcon(claim.status)}
                          {claim.status.replace("_", " ")}
                        </span>
                        {claim.has_fraud_flag && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                            <AlertCircle className="w-3 h-3" />
                            Fraud Flagged
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/sales-tracking/petrol-claims/${claim.id}`}
                          className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-50 dark:hover:text-gray-300 dark:hover:bg-gray-700/50"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        <Link
                          href={`/sales-tracking/trips/${claim.trip_id}`}
                          className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-50 dark:hover:text-gray-300 dark:hover:bg-gray-700/50"
                          title="View Trip"
                        >
                          <DollarSign className="w-4 h-4" />
                        </Link>
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