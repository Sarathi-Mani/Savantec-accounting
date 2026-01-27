"use client";

import { useAuth } from "@/context/AuthContext";
import { ordersApi, SalesOrder, OrderStatus } from "@/services/api";
import { cn } from "@/lib/utils";
import dayjs from "dayjs";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function SalesOrdersPage() {
  const { company } = useAuth();
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("");

  useEffect(() => {
    const fetchOrders = async () => {
      if (!company?.id) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const result = await ordersApi.listSalesOrders(company.id, {
          status: statusFilter ? (statusFilter as OrderStatus) : undefined,
        });
        setOrders(result);
      } catch (error) {
        console.error("Failed to fetch sales orders:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [company?.id, statusFilter]);

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "draft":
        return "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400";
      case "confirmed":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
      case "processing":
        return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";
      case "completed":
        return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
      case "cancelled":
        return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
      case "partially_delivered":
        return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400";
      default:
        return "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400";
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
    }).format(amount || 0);
  };

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark dark:text-white">Sales Orders</h1>
          <p className="text-sm text-dark-6">Manage your sales orders</p>
        </div>
        <Link
          href="/sales/sales-orders/new"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition hover:bg-opacity-90"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Sales Order
        </Link>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-col gap-4 rounded-lg bg-white p-4 shadow-1 dark:bg-gray-dark sm:flex-row">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3"
        >
          <option value="">All Status</option>
          <option value="draft">Draft</option>
          <option value="confirmed">Confirmed</option>
          <option value="processing">Processing</option>
          <option value="partially_delivered">Partially Delivered</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg bg-white shadow-1 dark:bg-gray-dark">
        <div className="overflow-x-auto">
          <table className="w-full table-auto">
            <thead>
              <tr className="border-b border-stroke dark:border-dark-3">
                <th className="px-4 py-4 text-left font-medium text-dark dark:text-white">Order #</th>
                <th className="px-4 py-4 text-left font-medium text-dark dark:text-white">Customer</th>
                <th className="px-4 py-4 text-left font-medium text-dark dark:text-white">Date</th>
                <th className="px-4 py-4 text-left font-medium text-dark dark:text-white">Expected Delivery</th>
                <th className="px-4 py-4 text-right font-medium text-dark dark:text-white">Amount</th>
                <th className="px-4 py-4 text-left font-medium text-dark dark:text-white">Status</th>
                <th className="px-4 py-4 text-center font-medium text-dark dark:text-white">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array(5)
                  .fill(0)
                  .map((_, i) => (
                    <tr key={i} className="border-b border-stroke dark:border-dark-3">
                      <td colSpan={7} className="px-4 py-4">
                        <div className="h-4 w-full animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                      </td>
                    </tr>
                  ))
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-dark-6">
                    No sales orders found. Create your first order to get started.
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr
                    key={order.id}
                    className="border-b border-stroke transition hover:bg-gray-50 dark:border-dark-3 dark:hover:bg-dark-2"
                  >
                    <td className="px-4 py-4">
                      <Link
                        href={`/sales/sales-orders/${order.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {order.order_number}
                      </Link>
                    </td>
                    <td className="px-4 py-4 text-dark dark:text-white">
                      {order.customer_name || "-"}
                    </td>
                    <td className="px-4 py-4 text-dark-6">
                      {dayjs(order.order_date).format("DD MMM YYYY")}
                    </td>
                    <td className="px-4 py-4 text-dark-6">
                      {order.expected_delivery_date
                        ? dayjs(order.expected_delivery_date).format("DD MMM YYYY")
                        : "-"}
                    </td>
                    <td className="px-4 py-4 text-right font-medium text-dark dark:text-white">
                      {formatCurrency(order.total_amount)}
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={cn(
                          "inline-flex rounded-full px-3 py-1 text-xs font-medium capitalize",
                          getStatusColor(order.status)
                        )}
                      >
                        {order.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <Link
                          href={`/sales/sales-orders/${order.id}`}
                          className="rounded p-1.5 text-dark-6 transition hover:bg-gray-100 hover:text-primary dark:hover:bg-dark-2"
                          title="View"
                        >
                          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                            />
                          </svg>
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
