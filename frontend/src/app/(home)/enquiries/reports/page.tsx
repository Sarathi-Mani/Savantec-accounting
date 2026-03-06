"use client";

import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import Link from "next/link";
import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import { useAuth } from "@/context/AuthContext";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:6768";

interface AgingBucket {
  count: number;
  total_value: number;
}

interface AgingReport {
  total_enquiries: number;
  total_value: number;
  report_date: string;
  buckets: Record<string, AgingBucket>;
}

interface EngineerReport {
  sales_person_id: string;
  sales_person_name: string;
  total_count: number;
  total_value: number;
  converted_count: number;
  conversion_rate: number;
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

const formatCurrency = (value: number) => `Rs ${Number(value || 0).toLocaleString("en-IN")}`;
const formatPercent = (value: number) => `${Number(value || 0).toFixed(1)}%`;

export default function EnquiryReportsPage() {
  const { company, getToken } = useAuth();
  const [agingData, setAgingData] = useState<AgingReport | null>(null);
  const [engineerData, setEngineerData] = useState<EngineerReport[]>([]);
  const [stateData, setStateData] = useState<StateReport[]>([]);
  const [brandData, setBrandData] = useState<BrandReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [exportingKey, setExportingKey] = useState<string | null>(null);

  useEffect(() => {
    if (company?.id) {
      fetchReports();
    }
  }, [company?.id]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      setError("");

      const token = getToken();
      const headers = { Authorization: `Bearer ${token}` };

      const [agingRes, engineerRes, stateRes, brandRes] = await Promise.all([
        fetch(`${API_BASE}/companies/${company?.id}/enquiries/reports/aging`, { headers }),
        fetch(`${API_BASE}/companies/${company?.id}/enquiries/reports/by-engineer`, { headers }),
        fetch(`${API_BASE}/companies/${company?.id}/enquiries/reports/by-state`, { headers }),
        fetch(`${API_BASE}/companies/${company?.id}/enquiries/reports/by-brand`, { headers }),
      ]);

      if (!agingRes.ok || !engineerRes.ok || !stateRes.ok || !brandRes.ok) {
        throw new Error("Failed to fetch enquiry reports");
      }

      const [agingJson, engineerJson, stateJson, brandJson] = await Promise.all([
        agingRes.json(),
        engineerRes.json(),
        stateRes.json(),
        brandRes.json(),
      ]);

      setAgingData(agingJson);
      setEngineerData(Array.isArray(engineerJson) ? engineerJson : []);
      setStateData(Array.isArray(stateJson) ? stateJson : []);
      setBrandData(Array.isArray(brandJson) ? brandJson : []);
    } catch (err) {
      console.error("Error fetching enquiry reports:", err);
      setError("Failed to load enquiry reports");
    } finally {
      setLoading(false);
    }
  };

  const summary = useMemo(() => {
    if (agingData) {
      return {
        totalEnquiries: agingData.total_enquiries,
        totalValue: agingData.total_value,
        reportDate: agingData.report_date,
      };
    }

    const totalEnquiries = engineerData.reduce((sum, item) => sum + Number(item.total_count || 0), 0);
    const totalValue = engineerData.reduce((sum, item) => sum + Number(item.total_value || 0), 0);

    return {
      totalEnquiries,
      totalValue,
      reportDate: new Date().toISOString(),
    };
  }, [agingData, engineerData]);

  const reports = [
    {
      key: "aging",
      title: "Enquiry Aging Report",
      description: "View enquiries grouped by age (0-7, 8-15, 16-30, 31-60, 60+ days)",
      href: "/enquiries/reports/aging",
      icon: (
        <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: "text-blue-500",
      bgColor: "bg-blue-50 dark:bg-blue-900/20",
      content: agingData ? (
        <div className="space-y-3">
          {Object.entries(agingData.buckets || {}).map(([bucket, bucketData]) => (
            <div key={bucket} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 dark:bg-white/5">
              <div>
                <p className="text-sm font-medium text-black dark:text-white">{bucket} days</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{bucketData.count} enquiries</p>
              </div>
              <span className="text-sm font-semibold text-black dark:text-white">
                {formatCurrency(bucketData.total_value)}
              </span>
            </div>
          ))}
        </div>
      ) : null,
    },
    {
      key: "engineer",
      title: "Engineer-wise Report",
      description: "Enquiries grouped by sales engineer with conversion rates",
      href: "/enquiries/reports/aging?tab=engineer",
      icon: (
        <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      color: "text-green-500",
      bgColor: "bg-green-50 dark:bg-green-900/20",
      content: (
        <div className="space-y-3">
          {engineerData.slice(0, 5).map((engineer) => (
            <div key={engineer.sales_person_id || engineer.sales_person_name} className="rounded-lg bg-gray-50 px-3 py-2 dark:bg-white/5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-black dark:text-white">{engineer.sales_person_name || "Unassigned"}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {engineer.total_count} enquiries • {engineer.converted_count} converted
                  </p>
                </div>
                <span className="shrink-0 text-sm font-semibold text-green-600">
                  {formatPercent(engineer.conversion_rate)}
                </span>
              </div>
            </div>
          ))}
          {!engineerData.length && <p className="text-sm text-gray-500 dark:text-gray-400">No engineer report data available.</p>}
        </div>
      ),
    },
    {
      key: "state",
      title: "State-wise Report",
      description: "Enquiries grouped by customer state location",
      href: "/enquiries/reports/aging?tab=state",
      icon: (
        <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      color: "text-purple-500",
      bgColor: "bg-purple-50 dark:bg-purple-900/20",
      content: (
        <div className="space-y-3">
          {stateData.slice(0, 5).map((state) => (
            <div key={`${state.state_code}-${state.state}`} className="rounded-lg bg-gray-50 px-3 py-2 dark:bg-white/5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-black dark:text-white">{state.state || "Unknown State"}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {state.total_count} enquiries • {formatCurrency(state.total_value)}
                  </p>
                </div>
                <span className="shrink-0 text-sm font-semibold text-purple-600">
                  {formatPercent(state.conversion_rate)}
                </span>
              </div>
            </div>
          ))}
          {!stateData.length && <p className="text-sm text-gray-500 dark:text-gray-400">No state report data available.</p>}
        </div>
      ),
    },
    {
      key: "brand",
      title: "Brand-wise Report",
      description: "Enquiries grouped by product brand",
      href: "/enquiries/reports/aging?tab=brand",
      icon: (
        <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
        </svg>
      ),
      color: "text-orange-500",
      bgColor: "bg-orange-50 dark:bg-orange-900/20",
      content: (
        <div className="space-y-3">
          {brandData.slice(0, 5).map((brand) => (
            <div key={brand.brand_id || brand.brand_name} className="rounded-lg bg-gray-50 px-3 py-2 dark:bg-white/5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-black dark:text-white">{brand.brand_name || "Unknown Brand"}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {brand.total_count} enquiries • {formatCurrency(brand.total_value)}
                  </p>
                </div>
                <span className="shrink-0 text-sm font-semibold text-orange-600">
                  {formatPercent(brand.conversion_rate)}
                </span>
              </div>
            </div>
          ))}
          {!brandData.length && <p className="text-sm text-gray-500 dark:text-gray-400">No brand report data available.</p>}
        </div>
      ),
    },
  ];

  const buildAgingExportData = () =>
    Object.entries(agingData?.buckets || {}).map(([bucket, bucketData]) => ({
      bucket: `${bucket} days`,
      enquiries: bucketData.count,
      total_value: bucketData.total_value,
    }));

  const buildEngineerExportData = () =>
    engineerData.map((item) => ({
      sales_engineer: item.sales_person_name || "Unassigned",
      total_enquiries: item.total_count,
      total_value: item.total_value,
      converted_enquiries: item.converted_count,
      conversion_rate: `${Number(item.conversion_rate || 0).toFixed(1)}%`,
    }));

  const buildStateExportData = () =>
    stateData.map((item) => ({
      state: item.state || "Unknown State",
      state_code: item.state_code || "",
      total_enquiries: item.total_count,
      total_value: item.total_value,
      converted_enquiries: item.converted_count,
      conversion_rate: `${Number(item.conversion_rate || 0).toFixed(1)}%`,
    }));

  const buildBrandExportData = () =>
    brandData.map((item) => ({
      brand: item.brand_name || "Unknown Brand",
      total_enquiries: item.total_count,
      total_value: item.total_value,
      converted_enquiries: item.converted_count,
      conversion_rate: `${Number(item.conversion_rate || 0).toFixed(1)}%`,
    }));

  const exportRows = (rows: Record<string, unknown>[], fileName: string, type: "csv" | "xlsx") => {
    if (!rows.length) return;

    const worksheet = XLSX.utils.json_to_sheet(rows);

    if (type === "xlsx") {
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Report");
      XLSX.writeFile(workbook, `${fileName}.xlsx`);
      return;
    }

    const csv = XLSX.utils.sheet_to_csv(worksheet);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${fileName}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExport = (key: string, type: "csv" | "xlsx") => {
    try {
      setExportingKey(`${key}-${type}`);

      if (key === "aging") {
        exportRows(buildAgingExportData(), "enquiry-aging-report", type);
      } else if (key === "engineer") {
        exportRows(buildEngineerExportData(), "enquiry-engineer-report", type);
      } else if (key === "state") {
        exportRows(buildStateExportData(), "enquiry-state-report", type);
      } else if (key === "brand") {
        exportRows(buildBrandExportData(), "enquiry-brand-report", type);
      } else if (key === "all") {
        const workbook = XLSX.utils.book_new();
        const sheets = [
          ["Aging", buildAgingExportData()],
          ["Engineer", buildEngineerExportData()],
          ["State", buildStateExportData()],
          ["Brand", buildBrandExportData()],
        ] as const;

        if (type === "xlsx") {
          sheets.forEach(([name, rows]) => {
            const worksheet = XLSX.utils.json_to_sheet(rows);
            XLSX.utils.book_append_sheet(workbook, worksheet, name);
          });
          XLSX.writeFile(workbook, "enquiry-reports.xlsx");
        } else {
          const rows = [
            ...buildAgingExportData().map((item) => ({ report_type: "Aging", ...item })),
            ...buildEngineerExportData().map((item) => ({ report_type: "Engineer", ...item })),
            ...buildStateExportData().map((item) => ({ report_type: "State", ...item })),
            ...buildBrandExportData().map((item) => ({ report_type: "Brand", ...item })),
          ];
          exportRows(rows, "enquiry-reports", "csv");
        }
      }
    } finally {
      setExportingKey(null);
    }
  };

  return (
    <>
      <Breadcrumb pageName="Enquiry Reports" />

      <div className="mb-6 flex flex-wrap items-center justify-end gap-3">
        <button
          type="button"
          onClick={() => handleExport("all", "csv")}
          disabled={loading || !!error || !!exportingKey}
          className="rounded-lg border border-stroke bg-white px-4 py-2 text-sm font-medium text-black transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-strokedark dark:bg-boxdark dark:text-white dark:hover:bg-white/5"
        >
          {exportingKey === "all-csv" ? "Exporting..." : "Export All CSV"}
        </button>
        <button
          type="button"
          onClick={() => handleExport("all", "xlsx")}
          disabled={loading || !!error || !!exportingKey}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {exportingKey === "all-xlsx" ? "Exporting..." : "Export All Excel"}
        </button>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-sm border border-stroke bg-white p-6 shadow-default dark:border-strokedark dark:bg-boxdark">
          <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Enquiries</h4>
          <p className="mt-2 text-2xl font-bold text-black dark:text-white">
            {loading ? "..." : summary.totalEnquiries}
          </p>
        </div>
        <div className="rounded-sm border border-stroke bg-white p-6 shadow-default dark:border-strokedark dark:bg-boxdark">
          <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Expected Value</h4>
          <p className="mt-2 text-2xl font-bold text-black dark:text-white">
            {loading ? "..." : formatCurrency(summary.totalValue)}
          </p>
        </div>
        <div className="rounded-sm border border-stroke bg-white p-6 shadow-default dark:border-strokedark dark:bg-boxdark">
          <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Report Date</h4>
          <p className="mt-2 text-2xl font-bold text-black dark:text-white">
            {loading ? "..." : new Date(summary.reportDate).toLocaleDateString()}
          </p>
        </div>
      </div>

      {error ? (
        <div className="rounded-sm border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {reports.map((report) => (
          <div
            key={report.title}
            className="group rounded-sm border border-stroke bg-white p-6 shadow-default transition-all hover:shadow-lg dark:border-strokedark dark:bg-boxdark"
          >
            <div className="mb-5 flex items-start gap-4">
              <div className={`rounded-lg p-3 ${report.bgColor} ${report.color}`}>
                {report.icon}
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-black transition-colors group-hover:text-primary dark:text-white">
                  {report.title}
                </h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {report.description}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link
                    href={report.href}
                    className="rounded-lg border border-stroke px-3 py-2 text-sm font-medium text-black transition hover:border-primary hover:text-primary dark:border-strokedark dark:text-white"
                  >
                    Open Report
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleExport(report.key, "csv")}
                    disabled={loading || !!error || !!exportingKey}
                    className="rounded-lg border border-stroke bg-white px-3 py-2 text-sm font-medium text-black transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-strokedark dark:bg-boxdark dark:text-white dark:hover:bg-white/5"
                  >
                    {exportingKey === `${report.key}-csv` ? "Exporting..." : "Export CSV"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExport(report.key, "xlsx")}
                    disabled={loading || !!error || !!exportingKey}
                    className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white transition hover:bg-opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {exportingKey === `${report.key}-xlsx` ? "Exporting..." : "Export Excel"}
                  </button>
                </div>
              </div>
            </div>

            <div className="border-t border-stroke pt-4 dark:border-strokedark">
              {loading ? (
                <div className="space-y-3">
                  {[0, 1, 2].map((item) => (
                    <div key={item} className="h-14 animate-pulse rounded-lg bg-gray-100 dark:bg-white/5" />
                  ))}
                </div>
              ) : (
                report.content
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
