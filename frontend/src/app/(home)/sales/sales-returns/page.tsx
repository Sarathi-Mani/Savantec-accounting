"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useState, useEffect } from "react";

export default function SalesReturnsPage() {
  const router = useRouter();
  const { company } = useAuth();
  const [loading, setLoading] = useState(false);
  const [returns, setReturns] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");

  useEffect(() => {
    // Fetch returns data
    setReturns([
      {
        id: "1",
        return_number: "SR-2024-001",
        invoice_number: "INV-2024-001",
        customer: "ABC Corporation",
        date: "2024-01-20",
        amount: "₹4,500",
        reason: "Damaged Product",
        status: "approved",
      },
      {
        id: "2",
        return_number: "SR-2024-002",
        invoice_number: "INV-2024-005",
        customer: "XYZ Industries",
        date: "2024-01-18",
        amount: "₹7,800",
        reason: "Wrong Item Delivered",
        status: "pending",
      },
      {
        id: "3",
        return_number: "SR-2024-003",
        invoice_number: "INV-2024-003",
        customer: "PQR Enterprises",
        date: "2024-01-15",
        amount: "₹3,200",
        reason: "Customer Dissatisfaction",
        status: "rejected",
      },
    ]);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'pending': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'rejected': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  const getStatusText = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark dark:text-white">Sales Returns</h1>
          <p className="text-sm text-dark-6">Manage customer returns and refunds</p>
        </div>
        {/* <button
          onClick={() => router.push('/sales/returns/new')}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 font-medium text-white transition hover:bg-opacity-90"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Return
        </button> */}
      </div>

      {/* Stats Cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg bg-white p-6 shadow-1 dark:bg-gray-dark">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-dark-6">Total Returns</p>
              <h3 className="mt-2 text-2xl font-bold text-red-600">₹15,500</h3>
            </div>
            <div className="rounded-full bg-red-100 p-3 dark:bg-red-900/30">
              <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-white p-6 shadow-1 dark:bg-gray-dark">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-dark-6">Pending Approval</p>
              <h3 className="mt-2 text-2xl font-bold text-yellow-600">₹7,800</h3>
            </div>
            <div className="rounded-full bg-yellow-100 p-3 dark:bg-yellow-900/30">
              <svg className="h-6 w-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-white p-6 shadow-1 dark:bg-gray-dark">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-dark-6">Approved Returns</p>
              <h3 className="mt-2 text-2xl font-bold text-green-600">₹4,500</h3>
            </div>
            <div className="rounded-full bg-green-100 p-3 dark:bg-green-900/30">
              <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-white p-6 shadow-1 dark:bg-gray-dark">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-dark-6">Return Rate</p>
              <h3 className="mt-2 text-2xl font-bold text-dark dark:text-white">1.2%</h3>
            </div>
            <div className="rounded-full bg-blue-100 p-3 dark:bg-blue-900/30">
              <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-col gap-4 rounded-lg bg-white p-4 shadow-1 dark:bg-gray-dark sm:flex-row">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search returns, invoice numbers, customers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3"
        >
          <option value="">All Status</option>
          <option value="approved">Approved</option>
          <option value="pending">Pending</option>
          <option value="rejected">Rejected</option>
        </select>
        <input
          type="date"
          className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3"
        />
      </div>

      {/* Table */}
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
                <th className="px-6 py-4 text-right text-sm font-medium text-dark-6">Actions</th>
              </tr>
            </thead>
            <tbody>
              {returns.map((returnItem) => (
                <tr key={returnItem.id} className="border-b border-stroke last:border-0 dark:border-dark-3">
                  <td className="px-6 py-4">
                    <span className="font-medium text-primary">{returnItem.return_number}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-medium text-dark-6">{returnItem.invoice_number}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium text-dark dark:text-white">{returnItem.customer}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-dark-6">{returnItem.date}</td>
                  <td className="px-6 py-4 font-medium text-red-600">{returnItem.amount}</td>
                  <td className="px-6 py-4">
                    <p className="max-w-[200px] truncate text-dark-6" title={returnItem.reason}>
                      {returnItem.reason}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusColor(returnItem.status)}`}>
                      {getStatusText(returnItem.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        className="rounded p-1.5 hover:bg-gray-100 dark:hover:bg-dark-3"
                        title="View Details"
                      >
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </button>
                      <button
                        className="rounded p-1.5 hover:bg-gray-100 dark:hover:bg-dark-3"
                        title="Approve"
                      >
                        <svg className="h-5 w-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </button>
                      <button
                        className="rounded p-1.5 hover:bg-gray-100 dark:hover:bg-dark-3"
                        title="Process Refund"
                      >
                        <svg className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                      </button>
                    </div>
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