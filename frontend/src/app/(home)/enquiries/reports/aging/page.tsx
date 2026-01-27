"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import { useAuth } from "@/context/AuthContext";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:6768";

interface AgingBucket {
  count: number;
  total_value: number;
  enquiries: Array<{
    id: string;
    enquiry_number: string;
    subject: string;
    status: string;
    expected_value: number;
    age_days: number;
    enquiry_date: string;
  }>;
}

interface AgingReport {
  report_date: string;
  total_enquiries: number;
  total_value: number;
  buckets: {
    "0-7": AgingBucket;
    "8-15": AgingBucket;
    "16-30": AgingBucket;
    "31-60": AgingBucket;
    "60+": AgingBucket;
  };
  status_breakdown: Record<string, { count: number; total_value: number }>;
}

interface EngineerReport {
  sales_person_id: string;
  sales_person_name: string;
  total_count: number;
  total_value: number;
  converted_count: number;
  conversion_rate: number;
  avg_age_days: number;
}

interface StateReport {
  state: string;
  state_code: string;
  total_count: number;
  total_value: number;
  converted_count: number;
  conversion_rate: number;
}

interface BrandReport {
  brand_id: string;
  brand_name: string;
  total_count: number;
  total_value: number;
  converted_count: number;
  conversion_rate: number;
}

export default function EnquiryAgingReportPage() {
  const { company, getToken } = useAuth();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") || "aging";
  
  const [activeTab, setActiveTab] = useState(initialTab);
  const [agingData, setAgingData] = useState<AgingReport | null>(null);
  const [engineerData, setEngineerData] = useState<EngineerReport[]>([]);
  const [stateData, setStateData] = useState<StateReport[]>([]);
  const [brandData, setBrandData] = useState<BrandReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedBucket, setExpandedBucket] = useState<string | null>(null);
  
  // Filters
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  useEffect(() => {
    if (company?.id) {
      fetchData();
    }
  }, [company, activeTab, fromDate, toDate]);

  const fetchData = async () => {
    setLoading(true);
    const token = getToken();
    const params = new URLSearchParams();
    if (fromDate) params.append("from_date", fromDate);
    if (toDate) params.append("to_date", toDate);
    
    try {
      if (activeTab === "aging") {
        const response = await fetch(
          `${API_BASE}/api/companies/${company?.id}/enquiries/reports/aging?${params}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (response.ok) setAgingData(await response.json());
      } else if (activeTab === "engineer") {
        const response = await fetch(
          `${API_BASE}/api/companies/${company?.id}/enquiries/reports/by-engineer?${params}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (response.ok) setEngineerData(await response.json());
      } else if (activeTab === "state") {
        const response = await fetch(
          `${API_BASE}/api/companies/${company?.id}/enquiries/reports/by-state?${params}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (response.ok) setStateData(await response.json());
      } else if (activeTab === "brand") {
        const response = await fetch(
          `${API_BASE}/api/companies/${company?.id}/enquiries/reports/by-brand?${params}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (response.ok) setBrandData(await response.json());
      }
    } catch (error) {
      console.error("Error fetching report:", error);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: "aging", label: "Aging Report" },
    { id: "engineer", label: "By Engineer" },
    { id: "state", label: "By State" },
    { id: "brand", label: "By Brand" },
  ];

  const bucketColors: Record<string, string> = {
    "0-7": "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    "8-15": "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    "16-30": "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    "31-60": "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
    "60+": "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  };

  return (
    <>
      <Breadcrumb pageName="Enquiry Reports" />

      {/* Tabs */}
      <div className="mb-4 flex flex-wrap gap-2 border-b border-stroke dark:border-strokedark">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === tab.id
                ? "border-b-2 border-primary text-primary"
                : "text-gray-500 hover:text-primary dark:text-gray-400"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-4 rounded-sm border border-stroke bg-white p-4 shadow-default dark:border-strokedark dark:bg-boxdark">
        <div>
          <label className="mb-1 block text-sm font-medium text-black dark:text-white">From Date</label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="rounded border border-stroke bg-transparent px-3 py-2 outline-none focus:border-primary dark:border-strokedark"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-black dark:text-white">To Date</label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="rounded border border-stroke bg-transparent px-3 py-2 outline-none focus:border-primary dark:border-strokedark"
          />
        </div>
        <div className="flex items-end">
          <button
            onClick={() => { setFromDate(""); setToDate(""); }}
            className="rounded bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300 dark:bg-meta-4 dark:text-white"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        </div>
      ) : (
        <>
          {/* Aging Report Tab */}
          {activeTab === "aging" && agingData && (
            <div className="space-y-4">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="rounded-sm border border-stroke bg-white p-4 shadow-default dark:border-strokedark dark:bg-boxdark">
                  <h4 className="text-sm font-medium text-gray-500">Total Enquiries</h4>
                  <p className="mt-1 text-2xl font-bold text-black dark:text-white">{agingData.total_enquiries}</p>
                </div>
                <div className="rounded-sm border border-stroke bg-white p-4 shadow-default dark:border-strokedark dark:bg-boxdark">
                  <h4 className="text-sm font-medium text-gray-500">Total Expected Value</h4>
                  <p className="mt-1 text-2xl font-bold text-black dark:text-white">₹{agingData.total_value.toLocaleString()}</p>
                </div>
                <div className="rounded-sm border border-stroke bg-white p-4 shadow-default dark:border-strokedark dark:bg-boxdark">
                  <h4 className="text-sm font-medium text-gray-500">Report Date</h4>
                  <p className="mt-1 text-2xl font-bold text-black dark:text-white">{new Date(agingData.report_date).toLocaleDateString()}</p>
                </div>
              </div>

              {/* Aging Buckets */}
              <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
                <div className="border-b border-stroke px-4 py-4 dark:border-strokedark">
                  <h3 className="font-semibold text-black dark:text-white">Age Distribution</h3>
                </div>
                <div className="p-4">
                  <div className="space-y-3">
                    {Object.entries(agingData.buckets).map(([bucket, data]) => (
                      <div key={bucket} className="rounded border border-stroke dark:border-strokedark">
                        <button
                          onClick={() => setExpandedBucket(expandedBucket === bucket ? null : bucket)}
                          className="flex w-full items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-meta-4"
                        >
                          <div className="flex items-center gap-3">
                            <span className={`rounded px-2 py-1 text-sm font-medium ${bucketColors[bucket]}`}>
                              {bucket} days
                            </span>
                            <span className="font-medium text-black dark:text-white">
                              {data.count} enquiries
                            </span>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="text-gray-500">₹{data.total_value.toLocaleString()}</span>
                            <svg
                              className={`h-5 w-5 transition-transform ${expandedBucket === bucket ? "rotate-180" : ""}`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </button>
                        {expandedBucket === bucket && data.enquiries.length > 0 && (
                          <div className="border-t border-stroke p-4 dark:border-strokedark">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="text-left text-gray-500">
                                  <th className="pb-2">Enquiry #</th>
                                  <th className="pb-2">Subject</th>
                                  <th className="pb-2">Status</th>
                                  <th className="pb-2 text-right">Value</th>
                                  <th className="pb-2 text-right">Age</th>
                                </tr>
                              </thead>
                              <tbody>
                                {data.enquiries.map((enquiry) => (
                                  <tr key={enquiry.id} className="border-t border-stroke dark:border-strokedark">
                                    <td className="py-2">
                                      <a href={`/enquiries/${enquiry.id}`} className="text-primary hover:underline">
                                        {enquiry.enquiry_number}
                                      </a>
                                    </td>
                                    <td className="py-2">{enquiry.subject}</td>
                                    <td className="py-2">
                                      <span className="rounded bg-gray-100 px-2 py-1 text-xs dark:bg-meta-4">
                                        {enquiry.status}
                                      </span>
                                    </td>
                                    <td className="py-2 text-right">₹{enquiry.expected_value.toLocaleString()}</td>
                                    <td className="py-2 text-right">{enquiry.age_days} days</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Status Breakdown */}
              <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
                <div className="border-b border-stroke px-4 py-4 dark:border-strokedark">
                  <h3 className="font-semibold text-black dark:text-white">Status Breakdown</h3>
                </div>
                <div className="p-4">
                  <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                    {Object.entries(agingData.status_breakdown).map(([status, data]) => (
                      <div key={status} className="rounded border border-stroke p-3 dark:border-strokedark">
                        <p className="text-sm text-gray-500 capitalize">{status.replace("_", " ")}</p>
                        <p className="text-lg font-bold text-black dark:text-white">{data.count}</p>
                        <p className="text-sm text-gray-500">₹{data.total_value.toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Engineer Report Tab */}
          {activeTab === "engineer" && (
            <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
              <div className="max-w-full overflow-x-auto">
                <table className="w-full table-auto">
                  <thead>
                    <tr className="bg-gray-2 text-left dark:bg-meta-4">
                      <th className="px-4 py-4 font-medium text-black dark:text-white">Engineer</th>
                      <th className="px-4 py-4 font-medium text-black dark:text-white text-right">Total</th>
                      <th className="px-4 py-4 font-medium text-black dark:text-white text-right">Converted</th>
                      <th className="px-4 py-4 font-medium text-black dark:text-white text-right">Conversion Rate</th>
                      <th className="px-4 py-4 font-medium text-black dark:text-white text-right">Total Value</th>
                      <th className="px-4 py-4 font-medium text-black dark:text-white text-right">Avg Age</th>
                    </tr>
                  </thead>
                  <tbody>
                    {engineerData.map((row, i) => (
                      <tr key={i} className="border-b border-stroke dark:border-strokedark">
                        <td className="px-4 py-4">{row.sales_person_name}</td>
                        <td className="px-4 py-4 text-right">{row.total_count}</td>
                        <td className="px-4 py-4 text-right text-success">{row.converted_count}</td>
                        <td className="px-4 py-4 text-right">
                          <span className={`rounded px-2 py-1 text-sm ${row.conversion_rate > 50 ? "bg-green-100 text-green-800" : row.conversion_rate > 25 ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-800"}`}>
                            {row.conversion_rate}%
                          </span>
                        </td>
                        <td className="px-4 py-4 text-right font-medium">₹{row.total_value.toLocaleString()}</td>
                        <td className="px-4 py-4 text-right">{row.avg_age_days} days</td>
                      </tr>
                    ))}
                    {engineerData.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-gray-500">No data available</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* State Report Tab */}
          {activeTab === "state" && (
            <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
              <div className="max-w-full overflow-x-auto">
                <table className="w-full table-auto">
                  <thead>
                    <tr className="bg-gray-2 text-left dark:bg-meta-4">
                      <th className="px-4 py-4 font-medium text-black dark:text-white">State</th>
                      <th className="px-4 py-4 font-medium text-black dark:text-white">Code</th>
                      <th className="px-4 py-4 font-medium text-black dark:text-white text-right">Total</th>
                      <th className="px-4 py-4 font-medium text-black dark:text-white text-right">Converted</th>
                      <th className="px-4 py-4 font-medium text-black dark:text-white text-right">Conversion Rate</th>
                      <th className="px-4 py-4 font-medium text-black dark:text-white text-right">Total Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stateData.map((row, i) => (
                      <tr key={i} className="border-b border-stroke dark:border-strokedark">
                        <td className="px-4 py-4">{row.state}</td>
                        <td className="px-4 py-4">{row.state_code || "-"}</td>
                        <td className="px-4 py-4 text-right">{row.total_count}</td>
                        <td className="px-4 py-4 text-right text-success">{row.converted_count}</td>
                        <td className="px-4 py-4 text-right">
                          <span className={`rounded px-2 py-1 text-sm ${row.conversion_rate > 50 ? "bg-green-100 text-green-800" : row.conversion_rate > 25 ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-800"}`}>
                            {row.conversion_rate}%
                          </span>
                        </td>
                        <td className="px-4 py-4 text-right font-medium">₹{row.total_value.toLocaleString()}</td>
                      </tr>
                    ))}
                    {stateData.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-gray-500">No data available</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Brand Report Tab */}
          {activeTab === "brand" && (
            <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
              <div className="max-w-full overflow-x-auto">
                <table className="w-full table-auto">
                  <thead>
                    <tr className="bg-gray-2 text-left dark:bg-meta-4">
                      <th className="px-4 py-4 font-medium text-black dark:text-white">Brand</th>
                      <th className="px-4 py-4 font-medium text-black dark:text-white text-right">Total Enquiries</th>
                      <th className="px-4 py-4 font-medium text-black dark:text-white text-right">Converted</th>
                      <th className="px-4 py-4 font-medium text-black dark:text-white text-right">Conversion Rate</th>
                      <th className="px-4 py-4 font-medium text-black dark:text-white text-right">Total Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {brandData.map((row, i) => (
                      <tr key={i} className="border-b border-stroke dark:border-strokedark">
                        <td className="px-4 py-4">{row.brand_name}</td>
                        <td className="px-4 py-4 text-right">{row.total_count}</td>
                        <td className="px-4 py-4 text-right text-success">{row.converted_count}</td>
                        <td className="px-4 py-4 text-right">
                          <span className={`rounded px-2 py-1 text-sm ${row.conversion_rate > 50 ? "bg-green-100 text-green-800" : row.conversion_rate > 25 ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-800"}`}>
                            {row.conversion_rate}%
                          </span>
                        </td>
                        <td className="px-4 py-4 text-right font-medium">₹{row.total_value.toLocaleString()}</td>
                      </tr>
                    ))}
                    {brandData.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-gray-500">No data available</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}
