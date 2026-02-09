 "use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { ordersApi, getErrorMessage } from "@/services/api";

type SalesOrderItem = {
  id: string;
  product_id?: string;
  item_code?: string;
  description: string;
  quantity: number;
  unit?: string;
  unit_price?: number;
  rate?: number;
  discount_percent?: number;
  discount_amount?: number;
  gst_rate?: number;
  cgst_rate?: number;
  sgst_rate?: number;
  igst_rate?: number;
  taxable_amount?: number;
  tax_amount?: number;
  total_amount?: number;
};

type SalesOrder = {
  id: string;
  order_number: string;
  order_date: string;
  expire_date?: string | null;
  customer_id?: string;
  customer_name?: string;
  status: string;
  reference_no?: string | null;
  reference_date?: string | null;
  payment_terms?: string | null;
  sales_person_id?: string | null;
  contact_person?: string | null;
  contact_person_name?: string | null;
  notes?: string | null;
  terms?: string | null;
  freight_charges?: number;
  p_and_f_charges?: number;
  send_message?: boolean;
  round_off?: number;
  subtotal?: number;
  total_tax?: number;
  total_amount?: number;
  delivery_note?: string | null;
  supplier_ref?: string | null;
  other_references?: string | null;
  buyer_order_no?: string | null;
  buyer_order_date?: string | null;
  despatch_doc_no?: string | null;
  delivery_note_date?: string | null;
  despatched_through?: string | null;
  destination?: string | null;
  terms_of_delivery?: string | null;
  items?: SalesOrderItem[];
};

const formatCurrency = (amount: number | undefined): string => {
  const safe = Number(amount || 0);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(safe);
};

const formatDate = (dateString?: string | null): string => {
  if (!dateString) return "-";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getStatusColor = (status: string) => {
  switch (status?.toLowerCase()) {
    case "draft":
      return "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400";
    case "confirmed":
      return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
    case "fulfilled":
    case "completed":
      return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
    case "cancelled":
      return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
    default:
      return "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400";
  }
};

export default function SalesOrderViewPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const orderId = params?.id as string;
  const { company } = useAuth();
  const shouldPrint = searchParams?.get("print") === "1";

  const [order, setOrder] = useState<SalesOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadOrder = async () => {
      if (!company?.id || !orderId) return;
      setLoading(true);
      setError(null);
      try {
        const data = await ordersApi.getSalesOrder(company.id, orderId);
        setOrder(data as SalesOrder);
      } catch (err) {
        setError(getErrorMessage(err, "Failed to load sales order"));
      } finally {
        setLoading(false);
      }
    };

    loadOrder();
  }, [company?.id, orderId]);

  useEffect(() => {
    if (shouldPrint && order && !loading) {
      const timer = window.setTimeout(() => {
        window.print();
      }, 300);
      return () => window.clearTimeout(timer);
    }
  }, [shouldPrint, order, loading]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 dark:bg-gray-dark">
        <div className="rounded-lg bg-white p-6 shadow-1 dark:bg-gray-dark">
          <div className="flex items-center gap-3 text-sm text-dark-6 dark:text-gray-400">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            Loading sales order...
          </div>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 dark:bg-gray-dark">
        <div className="rounded-lg bg-white p-6 shadow-1 dark:bg-gray-dark">
          <p className="text-red-600 dark:text-red-400">{error || "Sales order not found"}</p>
          <button
            onClick={() => router.back()}
            className="mt-4 rounded-lg border border-stroke px-4 py-2 text-dark dark:border-dark-3 dark:text-white"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 dark:bg-gray-dark md:p-6">
      <nav className="mb-6 flex" aria-label="Breadcrumb">
        <ol className="inline-flex items-center space-x-1 text-sm md:space-x-2">
          <li className="inline-flex items-center">
            <Link href="/" className="inline-flex items-center text-dark-6 hover:text-primary dark:text-gray-400 dark:hover:text-white">
              Home
            </Link>
          </li>
          <li>
            <div className="flex items-center">
              <svg className="h-4 w-4 text-dark-6 dark:text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
              <Link href="/sales/sales-orders" className="ml-1 text-dark-6 hover:text-primary dark:text-gray-400 dark:hover:text-white md:ml-2">
                Sales Order List
              </Link>
            </div>
          </li>
          <li aria-current="page">
            <div className="flex items-center">
              <svg className="h-4 w-4 text-dark-6 dark:text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
              <span className="ml-1 font-medium text-dark dark:text-white md:ml-2">
                Sales Order {order.order_number}
              </span>
            </div>
          </li>
        </ol>
      </nav>

      <div className="rounded-2xl bg-white p-6 shadow-1 dark:bg-gray-dark md:p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-sm text-dark-6">Sales Order</div>
            <h1 className="text-2xl font-bold text-dark dark:text-white">
              {order.order_number}
            </h1>
            <div className="mt-1 text-sm text-dark-6">
              Created on {formatDate(order.order_date)}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${getStatusColor(order.status)}`}>
              {order.status?.replace("_", " ")}
            </span>
            <Link
              href={`/sales/sales-orders/${order.id}/edit`}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white"
            >
              Edit
            </Link>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="rounded-xl border border-stroke p-4 dark:border-dark-3">
            <h2 className="mb-3 text-sm font-semibold text-dark dark:text-white">Customer</h2>
            <div className="space-y-2 text-sm text-dark-6">
              <div className="text-base font-semibold text-dark dark:text-white">
                {order.customer_name || "Walk-in Customer"}
              </div>
              <div>
                Contact Person:{" "}
                <span className="text-dark dark:text-white">
                  {order.contact_person_name || order.contact_person || "-"}
                </span>
              </div>
              <div>
                Reference:{" "}
                <span className="text-dark dark:text-white">{order.reference_no || "-"}</span>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-stroke p-4 dark:border-dark-3">
            <h2 className="mb-3 text-sm font-semibold text-dark dark:text-white">Order Details</h2>
            <div className="space-y-2 text-sm text-dark-6">
              <div>Order Date: {formatDate(order.order_date)}</div>
              <div>Expiry Date: {formatDate(order.expire_date)}</div>
              <div>Reference Date: {formatDate(order.reference_date)}</div>
              <div>Payment Terms: {order.payment_terms || "-"}</div>
              <div>Sales Person: {order.sales_person_id || "-"}</div>
            </div>
          </div>
       
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-stroke p-4 dark:border-dark-3">
            <h2 className="mb-3 text-sm font-semibold text-dark dark:text-white">Delivery & Dispatch</h2>
            <div className="space-y-2 text-sm text-dark-6">
              <div>Delivery Note: {order.delivery_note || "-"}</div>
              <div>Delivery Note Date: {formatDate(order.delivery_note_date)}</div>
              <div>Despatch Doc No: {order.despatch_doc_no || "-"}</div>
              <div>Despatched Through: {order.despatched_through || "-"}</div>
              <div>Destination: {order.destination || "-"}</div>
              <div>Terms of Delivery: {order.terms_of_delivery || "-"}</div>
            </div>
          </div>
          <div className="rounded-xl border border-stroke p-4 dark:border-dark-3">
            <h2 className="mb-3 text-sm font-semibold text-dark dark:text-white">Other References</h2>
            <div className="space-y-2 text-sm text-dark-6">
              <div>Supplier Ref: {order.supplier_ref || "-"}</div>
              <div>Other References: {order.other_references || "-"}</div>
              <div>Buyer Order No: {order.buyer_order_no || "-"}</div>
              <div>Buyer Order Date: {formatDate(order.buyer_order_date)}</div>
              <div>Send Message: {order.send_message ? "Yes" : "No"}</div>
            </div>
          </div>
        </div>

        <div className="mt-6 overflow-x-auto rounded-xl border border-stroke dark:border-dark-3">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-dark-2">
              <tr className="border-b border-stroke dark:border-dark-3">
                <th className="px-4 py-3 text-left text-sm font-medium text-dark-6">Item</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-dark-6">Qty</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-dark-6">Unit</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-dark-6">Rate</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-dark-6">Discount</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-dark-6">Taxable</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-dark-6">GST</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-dark-6">Total</th>
              </tr>
            </thead>
            <tbody>
              {(order.items || []).map((item) => (
                <tr key={item.id} className="border-b border-stroke last:border-0 dark:border-dark-3">
                  <td className="px-4 py-3 text-sm text-dark dark:text-white">
                    <div className="font-medium">{item.description}</div>
                    {item.item_code && <div className="text-xs text-dark-6">Code: {item.item_code}</div>}
                  </td>
                  <td className="px-4 py-3 text-sm text-dark-6">{item.quantity}</td>
                  <td className="px-4 py-3 text-sm text-dark-6">{item.unit || "-"}</td>
                  <td className="px-4 py-3 text-sm text-dark-6">
                    {formatCurrency(item.unit_price ?? item.rate ?? 0)}
                  </td>
                  <td className="px-4 py-3 text-sm text-dark-6">
                    {item.discount_percent || 0}% ({formatCurrency(item.discount_amount || 0)})
                  </td>
                  <td className="px-4 py-3 text-sm text-dark-6">
                    {formatCurrency(item.taxable_amount || 0)}
                  </td>
                  <td className="px-4 py-3 text-sm text-dark-6">
                    {item.gst_rate || 0}%
                 
                  
                  </td>
                  <td className="px-4 py-3 text-sm text-dark dark:text-white">
                    {formatCurrency(item.total_amount || 0)}
                  </td>
                </tr>
              ))}
              {(order.items || []).length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-6 text-center text-sm text-dark-6">
                    No items found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-xl border border-stroke p-4 dark:border-dark-3">
              <h3 className="mb-2 text-sm font-semibold text-dark dark:text-white">Notes</h3>
              <p className="text-sm text-dark-6">{order.notes || "-"}</p>
            </div>
            <div className="rounded-xl border border-stroke p-4 dark:border-dark-3">
              <h3 className="mb-2 text-sm font-semibold text-dark dark:text-white">Terms</h3>
              <p className="whitespace-pre-wrap text-sm text-dark-6">{order.terms || "-"}</p>
            </div>
          </div>
          <div className="rounded-xl border border-stroke p-4 dark:border-dark-3 lg:col-start-3">
            <h2 className="mb-3 text-sm font-semibold text-dark dark:text-white">Totals</h2>
            <div className="space-y-2 text-sm text-dark-6">
              <div className="flex items-center justify-between">
                <span>Subtotal</span>
                <span className="font-medium text-dark dark:text-white">{formatCurrency(order.subtotal)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Tax</span>
                <span className="font-medium text-dark dark:text-white">{formatCurrency(order.total_tax)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Freight</span>
                <span className="font-medium text-dark dark:text-white">{formatCurrency(order.freight_charges)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>P &amp; F</span>
                <span className="font-medium text-dark dark:text-white">{formatCurrency(order.p_and_f_charges)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Round Off</span>
                <span className="font-medium text-dark dark:text-white">{formatCurrency(order.round_off)}</span>
              </div>
              <div className="flex items-center justify-between border-t border-stroke pt-3 text-sm font-semibold text-dark dark:text-white">
                <span>Total</span>
                <span>{formatCurrency(order.total_amount)}</span>
              </div>
            </div>
          </div>
        </div>

        

        <div className="mt-6 flex gap-3">
          <button
            onClick={() => router.back()}
            className="rounded-lg border border-stroke px-4 py-2 text-dark dark:border-dark-3 dark:text-white"
          >
            Back
          </button>
        </div>
      </div>
    </div>
  );
}
