"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { invoicesApi, Invoice } from "@/services/api";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function SalesListPage() {
  const router = useRouter();
  const { company } = useAuth();
  const [data, setData] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");

  useEffect(() => {
    const fetchInvoices = async () => {
      if (!company?.id) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        // This would be replaced with actual API call
        // const result = await invoicesApi.list(company.id, { page, search, status: statusFilter });
        
        // Mock data for now
        setData([
          {
            id: "1",
            invoice_number: "INV-2024-001",
            invoice_date: new Date("2024-01-20"),
            customer: { name: "ABC Corporation" },
            total_amount: 45000,
            amount_paid: 45000,
            balance_due: 0,
            status: "paid",
            company_id: company.id
          },
          {
            id: "2",
            invoice_number: "INV-2024-002",
            invoice_date: new Date("2024-01-19"),
            customer: { name: "XYZ Industries" },
            total_amount: 78500,
            amount_paid: 50000,
            balance_due: 28500,
            status: "partially_paid",
            company_id: company.id
          },
          {
            id: "3",
            invoice_number: "INV-2024-003",
            invoice_date: new Date("2024-01-18"),
            customer: { name: "PQR Enterprises" },
            total_amount: 32000,
            amount_paid: 0,
            balance_due: 32000,
            status: "pending",
            company_id: company.id
          },
        ] as any);
      } catch (error) {
        console.error("Failed to fetch invoices:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchInvoices();
  }, [company?.id, page, search, statusFilter]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'pending': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'partially_paid': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'cancelled': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  const getStatusText = (status: string) => {
    return status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark dark:text-white">Sales List</h1>
          <p className="text-sm text-dark-6">Manage and track all your sales invoices</p>
        </div>
        <button
          onClick={() => router.push('/sales/new')}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 font-medium text-white transition hover:bg-opacity-90"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Sale
        </button>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-col gap-4 rounded-lg bg-white p-4 shadow-1 dark:bg-gray-dark sm:flex-row">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search invoices, customers, invoice numbers..."
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
          <option value="draft">Draft</option>
          <option value="pending">Pending</option>
          <option value="partially_paid">Partially Paid</option>
          <option value="paid">Paid</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <input
          type="date"
          className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3"
          placeholder="Date"
        />
      </div>

      {/* Table */}
      <div className="rounded-[10px] bg-white shadow-1 dark:bg-gray-dark">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          </div>
        ) : !company ? (
          <div className="py-20 text-center text-dark-6">No company selected</div>
        ) : data.length === 0 ? (
          <div className="py-20 text-center">
            <svg className="mx-auto mb-4 h-16 w-16 text-dark-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-dark-6">No sales invoices found</p>
            <button
              onClick={() => router.push('/sales/new')}
              className="mt-4 inline-flex items-center gap-2 text-primary hover:underline"
            >
              Create your first sale
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-stroke dark:border-dark-3">
                  <th className="px-6 py-4 text-left text-sm font-medium text-dark-6">Invoice No</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-dark-6">Date</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-dark-6">Customer</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-dark-6">Total Amount</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-dark-6">Paid Amount</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-dark-6">Balance Due</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-dark-6">Status</th>
                  <th className="px-6 py-4 text-right text-sm font-medium text-dark-6">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.map((invoice) => (
                  <tr key={invoice.id} className="border-b border-stroke last:border-0 dark:border-dark-3">
                    <td className="px-6 py-4">
                      <Link href={`/sales/${invoice.id}`} className="font-medium text-primary hover:underline">
                        {invoice.invoice_number}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-dark-6">
                      {new Date(invoice.invoice_date).toLocaleDateString('en-IN')}
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-dark dark:text-white">{(invoice as any).customer?.name || '-'}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium text-dark dark:text-white">
                      ₹{invoice.total_amount?.toLocaleString('en-IN')}
                    </td>
                    <td className="px-6 py-4 text-green-600">
                      ₹{invoice.amount_paid?.toLocaleString('en-IN')}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`font-medium ${invoice.balance_due > 0 ? 'text-red-600' : 'text-dark-6'}`}>
                        ₹{invoice.balance_due?.toLocaleString('en-IN')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusColor(invoice.status || '')}`}>
                        {getStatusText(invoice.status || '')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/sales/${invoice.id}`}
                          className="rounded p-1.5 hover:bg-gray-100 dark:hover:bg-dark-3"
                          title="View"
                        >
                          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </Link>
                        <button
                          className="rounded p-1.5 hover:bg-gray-100 dark:hover:bg-dark-3"
                          title="Print"
                        >
                          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                          </svg>
                        </button>
                        <Link
                          href={`/sales/${invoice.id}/edit`}
                          className="rounded p-1.5 hover:bg-gray-100 dark:hover:bg-dark-3"
                          title="Edit"
                        >
                          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {data.length > 0 && (
          <div className="flex items-center justify-between border-t border-stroke px-6 py-4 dark:border-dark-3">
            <p className="text-sm text-dark-6">
              Showing {data.length} of {data.length} entries
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-lg border border-stroke px-4 py-2 text-sm font-medium disabled:opacity-50 dark:border-dark-3"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={true}
                className="rounded-lg border border-stroke px-4 py-2 text-sm font-medium disabled:opacity-50 dark:border-dark-3"
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