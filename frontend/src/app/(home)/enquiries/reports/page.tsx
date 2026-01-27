"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import { useAuth } from "@/context/AuthContext";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:6768";

interface ReportSummary {
  total_enquiries: number;
  total_value: number;
  report_date: string;
}

export default function EnquiryReportsPage() {
  const { company, getToken } = useAuth();
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (company?.id) {
      fetchSummary();
    }
  }, [company]);

  const fetchSummary = async () => {
    try {
      const token = getToken();
      const response = await fetch(
        `${API_BASE}/api/companies/${company?.id}/enquiries/reports/aging`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (response.ok) {
        const data = await response.json();
        setSummary(data);
      }
    } catch (error) {
      console.error("Error fetching summary:", error);
    } finally {
      setLoading(false);
    }
  };

  const reports = [
    {
      title: "Enquiry Aging Report",
      description: "View enquiries grouped by age (0-7, 8-15, 16-30, 31-60, 60+ days)",
      href: "/enquiries/reports/aging",
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: "text-blue-500",
      bgColor: "bg-blue-50 dark:bg-blue-900/20",
    },
    {
      title: "Engineer-wise Report",
      description: "Enquiries grouped by sales engineer with conversion rates",
      href: "/enquiries/reports/aging?tab=engineer",
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      color: "text-green-500",
      bgColor: "bg-green-50 dark:bg-green-900/20",
    },
    {
      title: "State-wise Report",
      description: "Enquiries grouped by customer state location",
      href: "/enquiries/reports/aging?tab=state",
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      color: "text-purple-500",
      bgColor: "bg-purple-50 dark:bg-purple-900/20",
    },
    {
      title: "Brand-wise Report",
      description: "Enquiries grouped by product brand",
      href: "/enquiries/reports/aging?tab=brand",
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
        </svg>
      ),
      color: "text-orange-500",
      bgColor: "bg-orange-50 dark:bg-orange-900/20",
    },
  ];

  return (
    <>
      <Breadcrumb pageName="Enquiry Reports" />

      {/* Summary Cards */}
      {summary && (
        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-sm border border-stroke bg-white p-6 shadow-default dark:border-strokedark dark:bg-boxdark">
            <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Enquiries</h4>
            <p className="mt-2 text-2xl font-bold text-black dark:text-white">
              {summary.total_enquiries}
            </p>
          </div>
          <div className="rounded-sm border border-stroke bg-white p-6 shadow-default dark:border-strokedark dark:bg-boxdark">
            <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Expected Value</h4>
            <p className="mt-2 text-2xl font-bold text-black dark:text-white">
              ₹{summary.total_value.toLocaleString()}
            </p>
          </div>
          <div className="rounded-sm border border-stroke bg-white p-6 shadow-default dark:border-strokedark dark:bg-boxdark">
            <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Report Date</h4>
            <p className="mt-2 text-2xl font-bold text-black dark:text-white">
              {new Date(summary.report_date).toLocaleDateString()}
            </p>
          </div>
        </div>
      )}

      {/* Report Cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {reports.map((report, index) => (
          <Link
            key={index}
            href={report.href}
            className="group rounded-sm border border-stroke bg-white p-6 shadow-default transition-all hover:shadow-lg dark:border-strokedark dark:bg-boxdark"
          >
            <div className="flex items-start gap-4">
              <div className={`rounded-lg p-3 ${report.bgColor} ${report.color}`}>
                {report.icon}
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-black dark:text-white group-hover:text-primary">
                  {report.title}
                </h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {report.description}
                </p>
              </div>
              <svg
                className="w-5 h-5 text-gray-400 group-hover:text-primary transition-transform group-hover:translate-x-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
