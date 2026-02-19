"use client";

import { useState, useEffect } from "react";
import {
  Search,
  Filter,
  Download,
  FileText,
  Printer,
  RefreshCw,
  Navigation,
  User,
  Calendar,
  TrendingUp,
  TrendingDown,
  BarChart,
  PieChart,
  LineChart,
} from "lucide-react";
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  LineChart as RechartsLineChart,
  Line,
} from "recharts";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:6768";

interface TripReport {
  engineer_id: string;
  engineer_name: string;
  total_trips: number;
  valid_trips: number;
  fraud_trips: number;
  total_distance_km: number;
  avg_distance_km: number;
  validity_rate: number;
}

export default function TripReportsPage() {
  const [report, setReport] = useState<TripReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState<string>(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState<string>(() => {
    return new Date().toISOString().split("T")[0];
  });
  const [engineerFilter, setEngineerFilter] = useState<string>("");
  const [engineers, setEngineers] = useState<any[]>([]);

  const companyId = typeof window !== "undefined" ? localStorage.getItem("company_id") : null;

  useEffect(() => {
    if (companyId) {
      fetchReport();
      fetchEngineers();
    }
  }, [companyId, startDate, endDate, engineerFilter]);

  const fetchEngineers = async () => {
    try {
      const response = await fetch(
        `${API_BASE}/api/companies/${companyId}/employees`,
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

  const fetchReport = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        start_date: startDate,
        end_date: endDate,
      });
      if (engineerFilter) params.append("engineer_id", engineerFilter);

      const response = await fetch(
        `${API_BASE}/api/companies/${companyId}/reports/trip-summary?${params}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          },
        }
      );

      if (!response.ok) throw new Error("Failed to fetch report");
      const data = await response.json();
      setReport(data);
    } catch (err) {
      console.error("Failed to load report:", err);
    } finally {
      setLoading(false);
    }
  };

  // Prepare chart data
  const barChartData = report.map((item) => ({
    name: item.engineer_name.split(" ")[0],
    trips: item.total_trips,
    valid: item.valid_trips,
    fraud: item.fraud_trips,
    validity: item.validity_rate,
  }));

  const pieChartData = [
    {
      name: "Valid Trips",
      value: report.reduce((sum, item) => sum + item.valid_trips, 0),
      color: "#10b981",
    },
    {
      name: "Fraud Trips",
      value: report.reduce((sum, item) => sum + item.fraud_trips, 0),
      color: "#ef4444",
    },
    {
      name: "Other Trips",
      value: report.reduce((sum, item) => sum + (item.total_trips - item.valid_trips - item.fraud_trips), 0),
      color: "#6b7280",
    },
  ];

  const distanceData = report
    .map((item) => ({
      name: item.engineer_name.split(" ")[0],
      total_distance: item.total_distance_km,
      avg_distance: item.avg_distance_km,
    }))
    .sort((a, b) => b.total_distance - a.total_distance);

  const COLORS = ["#10b981", "#ef4444", "#6b7280"];

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
              Trip Reports
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Analytics and insights on engineer trips
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchReport}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors flex items-center gap-2"
            >
              <RefreshCw className="w-5 h-5" />
              Refresh
            </button>
            <button className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors flex items-center gap-2">
              <Download className="w-5 h-5" />
              Export
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="px-6 py-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
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
          <div className="flex items-end">
            <button
              onClick={() => {
                const date = new Date();
                date.setDate(date.getDate() - 30);
                setStartDate(date.toISOString().split("T")[0]);
                setEndDate(new Date().toISOString().split("T")[0]);
                setEngineerFilter("");
              }}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors w-full"
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 p-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Trips</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {report.reduce((sum, item) => sum + item.total_trips, 0)}
              </p>
            </div>
            <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900/30">
              <Navigation className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Valid Trips</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {report.reduce((sum, item) => sum + item.valid_trips, 0)}
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
              <p className="text-sm text-gray-500 dark:text-gray-400">Fraud Trips</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {report.reduce((sum, item) => sum + item.fraud_trips, 0)}
              </p>
            </div>
            <div className="p-3 rounded-full bg-red-100 dark:bg-red-900/30">
              <TrendingDown className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Distance</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {report.reduce((sum, item) => sum + item.total_distance_km, 0).toFixed(0)} km
              </p>
            </div>
            <div className="p-3 rounded-full bg-purple-100 dark:bg-purple-900/30">
              <BarChart className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
        {/* Bar Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Trips by Engineer
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsBarChart data={barChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="name" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1f2937",
                    borderColor: "#374151",
                    color: "#fff",
                  }}
                />
                <Legend />
                <Bar dataKey="trips" name="Total Trips" fill="#3b82f6" />
                <Bar dataKey="valid" name="Valid Trips" fill="#10b981" />
                <Bar dataKey="fraud" name="Fraud Trips" fill="#ef4444" />
              </RechartsBarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Trip Distribution
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPieChart>
                <Pie
                  data={pieChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }: { name: string; percent: number }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1f2937",
                    borderColor: "#374151",
                    color: "#fff",
                  }}
                />
              </RechartsPieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Distance Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 lg:col-span-2">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Distance Analysis
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsLineChart data={distanceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="name" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1f2937",
                    borderColor: "#374151",
                    color: "#fff",
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="total_distance"
                  name="Total Distance (km)"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="avg_distance"
                  name="Average Distance (km)"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </RechartsLineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Detailed Table */}
      <div className="p-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Engineer Performance Details
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-200 dark:bg-gray-700/50">
                <tr className="text-sm font-semibold text-gray-600 dark:text-gray-300">
                  <th className="text-left px-6 py-3 whitespace-nowrap">Engineer</th>
                  <th className="text-left px-6 py-3 whitespace-nowrap">Total Trips</th>
                  <th className="text-left px-6 py-3 whitespace-nowrap">Valid Trips</th>
                  <th className="text-left px-6 py-3 whitespace-nowrap">Fraud Trips</th>
                  <th className="text-left px-6 py-3 whitespace-nowrap">Total Distance (KM)</th>
                  <th className="text-left px-6 py-3 whitespace-nowrap">Avg Distance (KM)</th>
                  <th className="text-left px-6 py-3 whitespace-nowrap">Validity Rate</th>
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
                ) : report.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <Navigation className="w-12 h-12 text-gray-400 mb-2" />
                        <p className="text-gray-500 dark:text-gray-400">No data available for selected period</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  report.map((item) => (
                    <tr
                      key={item.engineer_id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-400" />
                          <span className="font-medium text-gray-900 dark:text-white">
                            {item.engineer_name}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-gray-900 dark:text-white font-medium">
                          {item.total_trips}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-green-500" />
                          <span className="text-green-600 dark:text-green-400 font-medium">
                            {item.valid_trips}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <TrendingDown className="w-4 h-4 text-red-500" />
                          <span className="text-red-600 dark:text-red-400 font-medium">
                            {item.fraud_trips}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-gray-900 dark:text-white font-medium">
                          {item.total_distance_km.toFixed(2)} km
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-gray-900 dark:text-white font-medium">
                          {item.avg_distance_km.toFixed(2)} km
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {item.validity_rate >= 70 ? (
                            <TrendingUp className="w-4 h-4 text-green-500" />
                          ) : item.validity_rate >= 50 ? (
                            <TrendingUp className="w-4 h-4 text-yellow-500" />
                          ) : (
                            <TrendingDown className="w-4 h-4 text-red-500" />
                          )}
                          <span
                            className={`font-medium ${
                              item.validity_rate >= 70
                                ? "text-green-600 dark:text-green-400"
                                : item.validity_rate >= 50
                                ? "text-yellow-600 dark:text-yellow-400"
                                : "text-red-600 dark:text-red-400"
                            }`}
                          >
                            {item.validity_rate.toFixed(1)}%
                          </span>
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
    </div>
  );
}