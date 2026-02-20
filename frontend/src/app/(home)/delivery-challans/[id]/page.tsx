"use client";

import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import { inventoryApi, payrollApi, Employee, Godown } from "@/services/api";
import dayjs from "dayjs";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";

interface DCItem {
  id: string;
  product_id?: string;
  description: string;
  hsn_code?: string;
  quantity: number;
  unit: string;
  unit_price: number;
  godown_id?: string;
  discount_percent: number;
  discount_amount: number;
  gst_rate: number;
  cgst_rate: number;
  sgst_rate: number;
  igst_rate: number;
  taxable_amount: number;
  total_amount: number;
}

interface DeliveryChallan {
  id: string;
  dc_number: string;
  dc_date: string;
  dc_type: string;
  status: string;
  custom_status?: string;
  customer_id?: string;
  customer_name?: string;
  reference_no?: string;
  invoice_id?: string;
  invoice_number?: string;
  quotation_id?: string;
  original_dc_id?: string;
  return_reason?: string;
  from_godown_id?: string;
  to_godown_id?: string;
  transporter_name?: string;
  vehicle_number?: string;
  eway_bill_number?: string;
  lr_number?: string;
  delivery_to_address?: string;
  delivery_to_city?: string;
  delivery_to_state?: string;
  delivery_to_pincode?: string;
  dispatch_from_address?: string;
  dispatch_from_city?: string;
  dispatch_from_state?: string;
  dispatch_from_pincode?: string;
  bill_title?: string;
  bill_description?: string;
  contact_person?: string;
  expiry_date?: string;
  salesman_id?: string;
  stock_updated: boolean;
  delivered_at?: string;
  received_by?: string;
  notes?: string;
  created_at?: string;
  items?: DCItem[];
}

export default function DeliveryChallanDetailPage() {
  const { company } = useAuth();
  const router = useRouter();
  const params = useParams();
  const dcId = params.id as string;

  const [dc, setDc] = useState<DeliveryChallan | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [godowns, setGodowns] = useState<Godown[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);

  const getToken = () => {
    if (typeof window === "undefined") return null;
    return (
      localStorage.getItem("employee_token") || localStorage.getItem("access_token")
    );
  };

  useEffect(() => {
    const fetchDC = async () => {
      const token = getToken();
      if (!company?.id || !token || !dcId) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:6768/api"}/companies/${company.id}/delivery-challans/${dcId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        if (response.ok) {
          setDc(await response.json());
        }
      } catch (error) {
        console.error("Failed to fetch delivery challan:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDC();
  }, [company?.id, dcId]);

  useEffect(() => {
    const fetchRefs = async () => {
      if (!company?.id) return;
      try {
        const [godownsData, employeesData] = await Promise.all([
          inventoryApi.listGodowns(company.id),
          payrollApi.listEmployees(company.id),
        ]);
        setGodowns(godownsData || []);
        setEmployees(employeesData || []);
      } catch (error) {
        console.error("Failed to load godowns/employees:", error);
      }
    };
    fetchRefs();
  }, [company?.id]);

  const performAction = async (action: string, body: any = {}) => {
    const token = getToken();
    if (!company?.id || !token || !dcId) return;

    setActionLoading(action);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:6768/api"}/companies/${company.id}/delivery-challans/${dcId}/${action}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(body),
        }
      );

      if (response.ok) {
        setDc(await response.json());
      } else {
        const errorData = await response.json();
        alert(errorData.detail || `Failed to ${action}`);
      }
    } catch (error) {
      console.error(`Failed to ${action}:`, error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async () => {
    const token = getToken();
    if (!company?.id || !token || !dcId) return;
    if (!confirm("Are you sure you want to delete this delivery challan?")) return;

    setActionLoading("delete");
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:6768/api"}/companies/${company.id}/delivery-challans/${dcId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        router.push("/delivery-challans");
      } else {
        const errorData = await response.json();
        alert(errorData.detail || "Failed to delete delivery challan");
      }
    } catch (error) {
      console.error("Failed to delete delivery challan:", error);
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "draft":
        return "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400";
      case "dispatched":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
      case "in_transit":
        return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";
      case "delivered":
        return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
      case "received":
        return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
      case "cancelled":
        return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
      default:
        return "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400";
    }
  };

  const getTypeColor = (type: string) => {
    if (type === "dc_out") {
      return "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400";
    }
    return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!dc) {
    return (
      <div className="flex h-96 flex-col items-center justify-center">
        <p className="text-lg text-dark-6">Delivery Challan not found</p>
        <Link href="/delivery-challans" className="mt-4 text-primary hover:underline">
          Back to Delivery Challans
        </Link>
      </div>
    );
  }

  const isDraft = dc.status === "draft";
  const isDcOut = dc.dc_type === "dc_out";
  const isDcIn = dc.dc_type === "dc_in";
  
  const formatMoney = (value?: number) => {
    if (value === null || value === undefined || Number.isNaN(value)) return "-";
    return `INR ${Number(value).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const itemSubtotal = (dc.items || []).reduce((sum, item) => sum + (item.taxable_amount || 0), 0);
  const itemTax = (dc.items || []).reduce(
    (sum, item) => sum + ((item.total_amount || 0) - (item.taxable_amount || 0)),
    0
  );
  const itemGrandTotal = (dc.items || []).reduce((sum, item) => sum + (item.total_amount || 0), 0);
  const godownMap = new Map(godowns.map((g) => [g.id, g.name]));
  const employeeMap = new Map(
    employees.map((e) => [
      e.id,
      e.full_name || [e.first_name, e.last_name].filter(Boolean).join(" ").trim() || e.employee_code,
    ])
  );

  // DC Out workflow: Draft -> Dispatched -> In Transit -> Delivered
  const canDispatch = isDcOut && dc.status === "draft";
  const canMarkInTransit = isDcOut && dc.status === "dispatched";
  const canMarkDelivered = isDcOut && ["dispatched", "in_transit"].includes(dc.status);
  
  // DC In workflow: Draft -> Received (Inward)
  const canMarkReceived = isDcIn && dc.status === "draft";
  
  // Return: Can create return (DC In) from DC Out that has been dispatched/delivered
  const canCreateReturn = isDcOut && ["dispatched", "in_transit", "delivered"].includes(dc.status);
  
  const canCancel = !["cancelled", "delivered", "received"].includes(dc.status);

  const handleCreateReturn = async () => {
    const token = getToken();
    if (!company?.id || !token || !dcId) return;

    if (!confirm("Create a return DC In from this DC Out? This will copy all items to a new return challan.")) {
      return;
    }

    setActionLoading("return");
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:6768/api"}/companies/${company.id}/delivery-challans/${dcId}/create-return`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const newDc = await response.json();
        router.push(`/delivery-challans/${newDc.id}`);
      } else {
        const errorData = await response.json();
        alert(errorData.detail || "Failed to create return");
      }
    } catch (error) {
      console.error("Failed to create return:", error);
      alert("Failed to create return");
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="mx-auto max-w-5xl">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-dark dark:text-white">{dc.dc_number}</h1>
            <span
              className={cn(
                "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                getTypeColor(dc.dc_type)
              )}
            >
              {dc.dc_type === "dc_out" ? "DC Out" : "DC In"}
            </span>
            <span
              className={cn(
                "inline-flex rounded-full px-3 py-1 text-xs font-medium capitalize",
                getStatusColor(dc.status)
              )}
            >
              {dc.status.replace("_", " ")}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {isDraft && (
            <button
              onClick={handleDelete}
              disabled={actionLoading === "delete"}
              className="rounded-lg border border-red-500 px-4 py-2 text-sm font-medium text-red-500 transition hover:bg-red-50 disabled:opacity-50 dark:hover:bg-red-900/20"
            >
              {actionLoading === "delete" ? "Deleting..." : "Delete"}
            </button>
          )}

          {canDispatch && (
            <button
              onClick={() => performAction("dispatch")}
              disabled={actionLoading === "dispatch"}
              className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-600 disabled:opacity-50"
            >
              {actionLoading === "dispatch" ? "..." : "Mark Dispatched"}
            </button>
          )}

          {canMarkInTransit && (
            <button
              onClick={() => performAction("in-transit")}
              disabled={actionLoading === "in-transit"}
              className="rounded-lg bg-yellow-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-yellow-600 disabled:opacity-50"
            >
              {actionLoading === "in-transit" ? "..." : "Mark In Transit"}
            </button>
          )}

          {canMarkDelivered && (
            <button
              onClick={() => performAction("delivered", { received_by: "Customer" })}
              disabled={actionLoading === "delivered"}
              className="rounded-lg bg-green-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-600 disabled:opacity-50"
            >
              {actionLoading === "delivered" ? "..." : "Mark Delivered"}
            </button>
          )}

          {canMarkReceived && (
            <button
              onClick={() => performAction("received", { received_by: "Warehouse" })}
              disabled={actionLoading === "received"}
              className="rounded-lg bg-green-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-600 disabled:opacity-50"
            >
              {actionLoading === "received" ? "..." : "Mark as Inward"}
            </button>
          )}

          {canCreateReturn && (
            <button
              onClick={handleCreateReturn}
              disabled={actionLoading === "return"}
              className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-amber-600 disabled:opacity-50"
            >
              {actionLoading === "return" ? "Creating..." : "Return"}
            </button>
          )}

          {canCancel && (
            <button
              onClick={() => performAction("cancel", { reason: "Cancelled by user" })}
              disabled={actionLoading === "cancel"}
              className="rounded-lg border border-red-500 px-4 py-2 text-sm font-medium text-red-500 transition hover:bg-red-50 disabled:opacity-50 dark:hover:bg-red-900/20"
            >
              {actionLoading === "cancel" ? "..." : "Cancel"}
            </button>
          )}
        </div>
      </div>

      {/* DC Info */}
      <div className="mb-6 grid gap-6 sm:grid-cols-2">
        <div className="rounded-lg bg-white p-6 shadow-1 dark:bg-gray-dark">
          <h3 className="mb-4 font-semibold text-dark dark:text-white">DC Details</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-dark-6">Date:</span>
              <span className="text-dark dark:text-white">{dayjs(dc.dc_date).format("DD MMM YYYY")}</span>
            </div>
            {dc.reference_no && (
              <div className="flex justify-between">
                <span className="text-dark-6">Reference No:</span>
                <span className="text-dark dark:text-white">{dc.reference_no}</span>
              </div>
            )}
            {dc.custom_status && (
              <div className="flex justify-between">
                <span className="text-dark-6">Custom Status:</span>
                <span className="text-dark dark:text-white">{dc.custom_status}</span>
              </div>
            )}
            {dc.invoice_number && (
              <div className="flex justify-between">
                <span className="text-dark-6">Invoice:</span>
                <Link href={`/invoices/${dc.invoice_id}`} className="text-primary hover:underline">
                  {dc.invoice_number}
                </Link>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-dark-6">Stock Updated:</span>
              <span className={dc.stock_updated ? "text-green-600" : "text-dark-6"}>
                {dc.stock_updated ? "Yes" : "No"}
              </span>
            </div>
            {dc.delivered_at && (
              <div className="flex justify-between">
                <span className="text-dark-6">{isDcIn ? "Received:" : "Delivered:"}</span>
                <span className="text-dark dark:text-white">
                  {dayjs(dc.delivered_at).format("DD MMM YYYY")}
                </span>
              </div>
            )}
            {dc.expiry_date && (
              <div className="flex justify-between">
                <span className="text-dark-6">Expiry Date:</span>
                <span className="text-dark dark:text-white">
                  {dayjs(dc.expiry_date).format("DD MMM YYYY")}
                </span>
              </div>
            )}
            {dc.original_dc_id && (
              <div className="flex justify-between">
                <span className="text-dark-6">Original DC:</span>
                <Link href={`/delivery-challans/${dc.original_dc_id}`} className="text-primary hover:underline">
                  View Original DC Out
                </Link>
              </div>
            )}
            {dc.return_reason && (
              <div className="flex justify-between">
                <span className="text-dark-6">Return Reason:</span>
                <span className="text-dark dark:text-white">{dc.return_reason}</span>
              </div>
            )}
            {dc.from_godown_id && (
              <div className="flex justify-between">
                <span className="text-dark-6">From Godown:</span>
                <span className="text-dark dark:text-white">
                  {godownMap.get(dc.from_godown_id) || dc.from_godown_id}
                </span>
              </div>
            )}
            {dc.to_godown_id && (
              <div className="flex justify-between">
                <span className="text-dark-6">To Godown:</span>
                <span className="text-dark dark:text-white">
                  {godownMap.get(dc.to_godown_id) || dc.to_godown_id}
                </span>
              </div>
            )}
            {dc.dispatch_from_address && (
              <div>
                <span className="text-dark-6">Dispatch From:</span>
                <p className="mt-1 text-dark dark:text-white">
                  {dc.dispatch_from_address}
                  {dc.dispatch_from_city && `, ${dc.dispatch_from_city}`}
                  {dc.dispatch_from_state && `, ${dc.dispatch_from_state}`}
                  {dc.dispatch_from_pincode && ` - ${dc.dispatch_from_pincode}`}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-lg bg-white p-6 shadow-1 dark:bg-gray-dark">
          <h3 className="mb-4 font-semibold text-dark dark:text-white">Customer</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-dark-6">Name:</span>
              <span className="text-dark dark:text-white">{dc.customer_name || "-"}</span>
            </div>
            {dc.contact_person && (
              <div className="flex justify-between">
                <span className="text-dark-6">Contact Person:</span>
                <span className="text-dark dark:text-white">{dc.contact_person}</span>
              </div>
            )}
            {dc.salesman_id && (
              <div className="flex justify-between">
                <span className="text-dark-6">Salesman:</span>
                <span className="text-dark dark:text-white">
                  {employeeMap.get(dc.salesman_id) || dc.salesman_id}
                </span>
              </div>
            )}
            {dc.delivery_to_address && (
              <div>
                <span className="text-dark-6">Delivery Address:</span>
                <p className="mt-1 text-dark dark:text-white">
                  {dc.delivery_to_address}
                  {dc.delivery_to_city && `, ${dc.delivery_to_city}`}
                  {dc.delivery_to_state && `, ${dc.delivery_to_state}`}
                  {dc.delivery_to_pincode && ` - ${dc.delivery_to_pincode}`}
                </p>
              </div>
            )}
            {dc.bill_title && (
              <div className="flex justify-between">
                <span className="text-dark-6">Bill Title:</span>
                <span className="text-dark dark:text-white">{dc.bill_title}</span>
              </div>
            )}
            {dc.bill_description && (
              <div>
                <span className="text-dark-6">Bill Description:</span>
                <p className="mt-1 text-dark dark:text-white">{dc.bill_description}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Transport Details */}
      {(dc.transporter_name || dc.vehicle_number || dc.eway_bill_number || dc.lr_number) && (
        <div className="mb-6 rounded-lg bg-white p-6 shadow-1 dark:bg-gray-dark">
          <h3 className="mb-4 font-semibold text-dark dark:text-white">Transport Details</h3>
          <div className="grid gap-4 sm:grid-cols-3">
            {dc.transporter_name && (
              <div>
                <span className="text-sm text-dark-6">Transporter:</span>
                <p className="text-dark dark:text-white">{dc.transporter_name}</p>
              </div>
            )}
            {dc.vehicle_number && (
              <div>
                <span className="text-sm text-dark-6">Vehicle:</span>
                <p className="text-dark dark:text-white">{dc.vehicle_number}</p>
              </div>
            )}
            {dc.eway_bill_number && (
              <div>
                <span className="text-sm text-dark-6">E-Way Bill:</span>
                <p className="text-dark dark:text-white">{dc.eway_bill_number}</p>
              </div>
            )}
            {dc.lr_number && (
              <div>
                <span className="text-sm text-dark-6">LR Number:</span>
                <p className="text-dark dark:text-white">{dc.lr_number}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Return Reason (for DC In) */}
      {dc.dc_type === "dc_in" && dc.return_reason && (
        <div className="mb-6 rounded-lg bg-amber-50 p-4 dark:bg-amber-900/20">
          <h4 className="font-medium text-amber-800 dark:text-amber-400">Return Reason</h4>
          <p className="mt-1 text-amber-700 dark:text-amber-300">{dc.return_reason}</p>
        </div>
      )}

      {/* Line Items */}
      <div className="mb-6 overflow-hidden rounded-lg bg-white shadow-1 dark:bg-gray-dark">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-stroke bg-gray-50 dark:border-dark-3 dark:bg-dark-2">
                <th className="px-4 py-3 text-left text-sm font-medium text-dark dark:text-white">#</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-dark dark:text-white">Description</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-dark dark:text-white">HSN</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-dark dark:text-white">Quantity</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-dark dark:text-white">Unit</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-dark dark:text-white">Unit Price</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-dark dark:text-white">Discount %</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-dark dark:text-white">Discount Amt</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-dark dark:text-white">GST %</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-dark dark:text-white">Taxable</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-dark dark:text-white">Total</th>
              </tr>
            </thead>
            <tbody>
              {dc.items?.map((item, index) => (
                <tr key={item.id} className="border-b border-stroke dark:border-dark-3">
                  <td className="px-4 py-3 text-dark-6">{index + 1}</td>
                  <td className="px-4 py-3 text-dark dark:text-white">{item.description}</td>
                  <td className="px-4 py-3 text-dark-6">{item.hsn_code || "-"}</td>
                  <td className="px-4 py-3 text-right text-dark dark:text-white">{item.quantity}</td>
                  <td className="px-4 py-3 text-dark-6">{item.unit}</td>
                  <td className="px-4 py-3 text-right text-dark dark:text-white">
                    {formatMoney(item.unit_price)}
                  </td>
                  <td className="px-4 py-3 text-right text-dark-6">
                    {item.discount_percent || 0}
                  </td>
                  <td className="px-4 py-3 text-right text-dark dark:text-white">
                    {formatMoney(item.discount_amount)}
                  </td>
                  <td className="px-4 py-3 text-right text-dark-6">
                    {item.gst_rate || 0}
                  </td>
                  <td className="px-4 py-3 text-right text-dark dark:text-white">
                    {formatMoney(item.taxable_amount)}
                  </td>
                  <td className="px-4 py-3 text-right text-dark dark:text-white">
                    {formatMoney(item.total_amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Item Totals */}
      <div className="mb-6 rounded-lg bg-white p-6 shadow-1 dark:bg-gray-dark">
        <h3 className="mb-4 font-semibold text-dark dark:text-white">Item Totals</h3>
        <div className="grid gap-3 text-sm sm:grid-cols-3">
          <div className="flex items-center justify-between">
            <span className="text-dark-6">Subtotal</span>
            <span className="text-dark dark:text-white">{formatMoney(itemSubtotal)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-dark-6">Total Tax</span>
            <span className="text-dark dark:text-white">{formatMoney(itemTax)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-dark-6">Grand Total</span>
            <span className="text-dark dark:text-white">{formatMoney(itemGrandTotal)}</span>
          </div>
        </div>
      </div>

      {/* Notes */}
      {dc.notes && (
        <div className="rounded-lg bg-white p-6 shadow-1 dark:bg-gray-dark">
          <h3 className="mb-2 font-semibold text-dark dark:text-white">Notes</h3>
          <p className="whitespace-pre-wrap text-sm text-dark-6">{dc.notes}</p>
        </div>
      )}
    </div>
  );
}

