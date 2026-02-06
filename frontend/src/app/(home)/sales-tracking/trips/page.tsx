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
  Copy,
  ChevronDown,
  ChevronUp,
  MoreVertical,
  Eye,
  MapPin,
  Navigation,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  Calendar,
  User,
  RefreshCw,
  Plus,
  Route,
} from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:6768/api";

interface Trip {
  id: string;
  trip_number: string;
  engineer_id: string;
  engineer_name: string;
  start_time: string | null;
  end_time: string | null;
  start_km: number | null;
  end_km: number | null;
  manual_distance_km: number | null;
  gps_distance_km: number | null;
  system_distance_km: number | null;
  status: string;
  is_valid: boolean;
  has_fraud_flag: boolean;
  created_at: string;
}

export default function TripsPage() {
  const router = useRouter();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [engineerFilter, setEngineerFilter] = useState("");
  const [validityFilter, setValidityFilter] = useState<string>("");
  const [showFilters, setShowFilters] = useState(false);
  const [engineers, setEngineers] = useState<any[]>([]);

  const companyId = typeof window !== "undefined" ? localStorage.getItem("company_id") : null;

  useEffect(() => {
    if (companyId) {
      fetchTrips();
      fetchEngineers();
    }
  }, [companyId]);

  useEffect(() => {
    if (companyId) {
      fetchTrips();
    }
  }, [statusFilter, engineerFilter, validityFilter, fromDate, toDate]);

  const fetchEngineers = async () => {
    try {
      const response = await fetch(
        `${API_BASE}/companies/${companyId}/employees`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("access_token")}`,
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

  const fetchTrips = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (engineerFilter) params.append("engineer_id", engineerFilter);
      if (statusFilter) params.append("status", statusFilter);
      if (fromDate) params.append("start_date", fromDate);
      if (toDate) params.append("end_date", toDate);
      if (validityFilter) params.append("is_valid", validityFilter);
      if (search) params.append("search", search);

      const response = await fetch(
        `${API_BASE}/companies/${companyId}/trips?${params}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          },
        }
      );

      if (!response.ok) throw new Error("Failed to fetch trips");
      const data = await response.json();
      setTrips(data);
    } catch (err) {
      console.error("Failed to load trips:", err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusBadgeClass = (status: string, isValid: boolean, hasFraud: boolean) => {
    if (hasFraud) return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
    if (!isValid) return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
    
    switch (status) {
      case "started":
      case "in_progress":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
      case "completed":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "cancelled":
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "started":
      case "in_progress":
        return <Navigation className="w-4 h-4" />;
      case "completed":
        return <CheckCircle className="w-4 h-4" />;
      case "cancelled":
        return <XCircle className="w-4 h-4" />;
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
    setValidityFilter("");
    fetchTrips();
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
              Trips
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Track and manage engineer trips
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/sales-tracking/trips/new")}
              className="px-4 py-2 transition bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              New Trip
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
                placeholder="Search trip number, engineer..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && fetchTrips()}
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
              onClick={fetchTrips}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors flex items-center gap-2"
            >
              <RefreshCw className="w-5 h-5" />
              Refresh
            </button>
            <button
              onClick={handleReset}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors flex items-center gap-2"
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
                <option value="started">Started</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Validity
              </label>
              <select
                value={validityFilter}
                onChange={(e) => setValidityFilter(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="">All</option>
                <option value="true">Valid</option>
                <option value="false">Invalid</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Trips Table */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 mx-6 mt-4 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-200 dark:bg-gray-700/50">
              <tr className="text-sm font-semibold text-gray-600 dark:text-gray-300">
                <th className="text-left px-6 py-3 whitespace-nowrap">Trip No</th>
                <th className="text-left px-6 py-3 whitespace-nowrap">Engineer</th>
                <th className="text-left px-6 py-3 whitespace-nowrap">Start Time</th>
                <th className="text-left px-6 py-3 whitespace-nowrap">End Time</th>
                <th className="text-left px-6 py-3 whitespace-nowrap">Distance (KM)</th>
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
              ) : trips.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <Route className="w-12 h-12 text-gray-400 mb-2" />
                      <p className="text-lg font-medium text-gray-900 dark:text-white mb-1">
                        No trips found
                      </p>
                      <p className="text-gray-500 dark:text-gray-400 mb-4">
                        {statusFilter || engineerFilter ?
                          "No trips found matching your filters." :
                          "Start tracking your first trip."}
                      </p>
                      <button
                        onClick={() => router.push("/sales-tracking/trips/new")}
                        className="text-indigo-600 hover:underline dark:text-indigo-400"
                      >
                        Start your first trip
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                trips.map((trip) => (
                  <tr
                    key={trip.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <Link
                        href={`/sales-tracking/trips/${trip.id}`}
                        className="text-indigo-600 hover:text-indigo-800 font-medium dark:text-indigo-400 dark:hover:text-indigo-300"
                      >
                        {trip.trip_number}
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-400" />
                        <span>{trip.engineer_name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        {formatDate(trip.start_time)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        {formatDate(trip.end_time)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-gray-900 dark:text-white font-medium">
                        {trip.system_distance_km?.toFixed(2) || "0.00"} km
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        Manual: {trip.manual_distance_km?.toFixed(2) || "0.00"} km
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            getStatusBadgeClass(trip.status, trip.is_valid, trip.has_fraud_flag)
                          }`}
                        >
                          {getStatusIcon(trip.status)}
                          {trip.status.replace("_", " ")}
                        </span>
                        {trip.has_fraud_flag && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                            <AlertCircle className="w-3 h-3" />
                            Fraud Flagged
                          </span>
                        )}
                        {!trip.is_valid && !trip.has_fraud_flag && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
                            <AlertCircle className="w-3 h-3" />
                            Invalid
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/sales-tracking/trips/${trip.id}`}
                          className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-50 dark:hover:text-gray-300 dark:hover:bg-gray-700/50"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        <Link
                          href={`/sales-tracking/trips/${trip.id}/route`}
                          className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-50 dark:hover:text-gray-300 dark:hover:bg-gray-700/50"
                          title="View Route"
                        >
                          <MapPin className="w-4 h-4" />
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
