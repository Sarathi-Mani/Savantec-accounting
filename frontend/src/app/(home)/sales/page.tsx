"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import { useState } from "react";

export default function SalesDashboardPage() {
  const router = useRouter();
  const { company } = useAuth();
  const [loading, setLoading] = useState(false);

  // Dashboard stats (would come from API)
  const [stats] = useState({
    totalSales: 1250000,
    pendingPayments: 250000,
    totalInvoices: 245,
    overdueInvoices: 12,
    conversionRate: 68,
    avgDealCycle: 14.5,
  });

  const salesMetrics = [
    { label: "Today's Sales", value: "₹24,500", change: "+12%", color: "text-green-600" },
    { label: "Weekly Sales", value: "₹1,85,000", change: "+8%", color: "text-green-600" },
    { label: "Monthly Sales", value: "₹12,50,000", change: "+15%", color: "text-green-600" },
    { label: "Pending Payments", value: "₹2,50,000", change: "-5%", color: "text-red-600" },
  ];

  const recentSales = [
    { id: "INV-001", customer: "ABC Corp", date: "2024-01-20", amount: "₹45,000", status: "Paid" },
    { id: "INV-002", customer: "XYZ Ltd", date: "2024-01-19", amount: "₹78,500", status: "Pending" },
    { id: "INV-003", customer: "PQR Industries", date: "2024-01-18", amount: "₹32,000", status: "Paid" },
    { id: "INV-004", customer: "MNO Enterprises", date: "2024-01-17", amount: "₹1,20,000", status: "Partially Paid" },
  ];

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark dark:text-white">Sales Dashboard</h1>
          <p className="text-sm text-dark-6">Monitor your sales performance, pipeline, and payments</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => router.push('/sales/new')}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition hover:bg-opacity-90"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Sale
          </button>
          <button
            onClick={() => router.push('/sales/sales-orders/new')}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-stroke bg-white px-4 py-2.5 text-sm font-medium text-dark transition hover:bg-gray-50 dark:border-dark-3 dark:bg-gray-dark dark:text-white"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Sales Order
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {salesMetrics.map((metric, index) => (
          <div key={index} className="rounded-lg bg-white p-6 shadow-1 dark:bg-gray-dark">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-dark-6">{metric.label}</p>
                <h3 className="mt-2 text-2xl font-bold text-dark dark:text-white">{metric.value}</h3>
              </div>
              <div className={`rounded-full bg-opacity-10 px-3 py-1 ${metric.color.includes('green') ? 'bg-green-100 dark:bg-green-900' : 'bg-red-100 dark:bg-red-900'}`}>
                <span className={`text-sm font-medium ${metric.color}`}>{metric.change}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Sales Chart */}
          <div className="rounded-lg bg-white p-6 shadow-1 dark:bg-gray-dark">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-dark dark:text-white">Sales Trend</h2>
              <select className="rounded-lg border border-stroke bg-transparent px-3 py-1.5 text-sm outline-none dark:border-dark-3">
                <option>Last 7 days</option>
                <option>Last 30 days</option>
                <option>Last 90 days</option>
              </select>
            </div>
            <div className="h-64 flex items-center justify-center text-dark-6">
              {/* Chart would go here */}
              <div className="text-center">
                <svg className="mx-auto mb-4 h-16 w-16 text-dark-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <p>Sales chart visualization</p>
                <p className="text-sm">Connect to analytics API</p>
              </div>
            </div>
          </div>

          {/* Recent Sales */}
          <div className="rounded-lg bg-white shadow-1 dark:bg-gray-dark">
            <div className="border-b border-stroke px-6 py-4 dark:border-dark-3">
              <h2 className="text-lg font-semibold text-dark dark:text-white">Recent Sales</h2>
            </div>
            <div className="p-6">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-stroke dark:border-dark-3">
                      <th className="px-4 py-3 text-left text-sm font-medium text-dark-6">Invoice</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-dark-6">Customer</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-dark-6">Date</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-dark-6">Amount</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-dark-6">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentSales.map((sale) => (
                      <tr key={sale.id} className="border-b border-stroke last:border-0 dark:border-dark-3">
                        <td className="px-4 py-3">
                          <Link href={`/sales/${sale.id}`} className="font-medium text-primary hover:underline">
                            {sale.id}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-dark dark:text-white">{sale.customer}</td>
                        <td className="px-4 py-3 text-dark-6">{sale.date}</td>
                        <td className="px-4 py-3 font-medium text-dark dark:text-white">{sale.amount}</td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-3 py-1 text-xs font-medium ${
                            sale.status === 'Paid' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                            sale.status === 'Pending' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                            'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                          }`}>
                            {sale.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 text-center">
                <Link href="/sales/sales-list" className="text-sm font-medium text-primary hover:underline">
                  View all sales →
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="rounded-lg bg-white p-6 shadow-1 dark:bg-gray-dark">
            <h2 className="mb-4 text-lg font-semibold text-dark dark:text-white">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => router.push('/sales/new')}
                className="flex flex-col items-center justify-center rounded-lg border border-stroke p-4 transition hover:bg-gray-50 dark:border-dark-3 dark:hover:bg-dark-3"
              >
                <svg className="mb-2 h-8 w-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span className="text-sm font-medium text-dark dark:text-white">New Sale</span>
              </button>
              <button
                onClick={() => router.push('/sales/sales-orders/new')}
                className="flex flex-col items-center justify-center rounded-lg border border-stroke p-4 transition hover:bg-gray-50 dark:border-dark-3 dark:hover:bg-dark-3"
              >
                <svg className="mb-2 h-8 w-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="text-sm font-medium text-dark dark:text-white">Sales Order</span>
              </button>
              <button
                onClick={() => router.push('/sales/proforma-invoices/new')}
                className="flex flex-col items-center justify-center rounded-lg border border-stroke p-4 transition hover:bg-gray-50 dark:border-dark-3 dark:hover:bg-dark-3"
              >
                <svg className="mb-2 h-8 w-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="text-sm font-medium text-dark dark:text-white">Proforma</span>
              </button>
              <button
                onClick={() => router.push('/enquiries/new')}
                className="flex flex-col items-center justify-center rounded-lg border border-stroke p-4 transition hover:bg-gray-50 dark:border-dark-3 dark:hover:bg-dark-3"
              >
                <svg className="mb-2 h-8 w-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
                <span className="text-sm font-medium text-dark dark:text-white">New Enquiry</span>
              </button>
            </div>
          </div>

          {/* Sales Pipeline */}
          <div className="rounded-lg bg-white p-6 shadow-1 dark:bg-gray-dark">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-dark dark:text-white">Sales Pipeline</h2>
              <Link href="/sales/tickets" className="text-sm text-primary hover:underline">
                View All
              </Link>
            </div>
            <div className="space-y-4">
              <div>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="text-dark-6">Enquiries</span>
                  <span className="font-medium text-dark dark:text-white">45</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-dark-3">
                  <div className="h-full w-3/4 rounded-full bg-blue-500"></div>
                </div>
              </div>
              <div>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="text-dark-6">Quotations</span>
                  <span className="font-medium text-dark dark:text-white">32</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-dark-3">
                  <div className="h-full w-2/3 rounded-full bg-purple-500"></div>
                </div>
              </div>
              <div>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="text-dark-6">Sales Orders</span>
                  <span className="font-medium text-dark dark:text-white">28</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-dark-3">
                  <div className="h-full w-1/2 rounded-full bg-green-500"></div>
                </div>
              </div>
              <div>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="text-dark-6">Invoices</span>
                  <span className="font-medium text-dark dark:text-white">24</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-dark-3">
                  <div className="h-full w-1/3 rounded-full bg-yellow-500"></div>
                </div>
              </div>
            </div>
          </div>

          {/* Top Customers */}
          <div className="rounded-lg bg-white p-6 shadow-1 dark:bg-gray-dark">
            <h2 className="mb-4 text-lg font-semibold text-dark dark:text-white">Top Customers</h2>
            <div className="space-y-4">
              {[
                { name: "ABC Corporation", sales: "₹5,42,000", orders: 24 },
                { name: "XYZ Industries", sales: "₹4,85,000", orders: 18 },
                { name: "PQR Enterprises", sales: "₹3,20,000", orders: 15 },
                { name: "MNO Ltd", sales: "₹2,85,000", orders: 12 },
                { name: "DEF Solutions", sales: "₹2,45,000", orders: 10 },
              ].map((customer, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-dark dark:text-white">{customer.name}</p>
                    <p className="text-sm text-dark-6">{customer.orders} orders</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-dark dark:text-white">{customer.sales}</p>
                    <p className="text-sm text-green-600">+12%</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}