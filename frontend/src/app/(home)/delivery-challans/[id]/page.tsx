"use client";

import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import { inventoryApi, payrollApi, Employee, Godown } from "@/services/api";
import dayjs from "dayjs";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { buildDeliveryChallanPdf } from "@/utils/deliveryChallanPdf";

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
  show_prices?: boolean;
  delivered_at?: string;
  received_by?: string;
  notes?: string;
  created_at?: string;
  items?: DCItem[];
}

const DELIVERY_CHALLAN_PDF_LOGO_PATH = "/images/logo/savantec_logo.png";
let deliveryChallanLogoDataUrlCache: string | null = null;

const getDeliveryChallanLogoDataUrl = async (): Promise<string | null> => {
  if (deliveryChallanLogoDataUrlCache) return deliveryChallanLogoDataUrlCache;
  if (typeof window === "undefined") return null;

  try {
    const image = new Image();
    image.crossOrigin = "anonymous";

    const dataUrl = await new Promise<string>((resolve, reject) => {
      image.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        const context = canvas.getContext("2d");
        if (!context) {
          reject(new Error("Canvas context unavailable"));
          return;
        }
        context.drawImage(image, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      };
      image.onerror = () => reject(new Error("Failed to load delivery challan logo"));
      image.src = DELIVERY_CHALLAN_PDF_LOGO_PATH;
    });

    deliveryChallanLogoDataUrlCache = dataUrl;
    return dataUrl;
  } catch (error) {
    console.warn("Failed to load delivery challan PDF logo:", error);
    return null;
  }
};

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
  const [showPricesInView, setShowPricesInView] = useState(true);

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
          const data = (await response.json()) as DeliveryChallan;
          setDc(data);
          if (typeof data.show_prices === "boolean") {
            setShowPricesInView(data.show_prices);
          }
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

  useEffect(() => {
    if (typeof window === "undefined" || !dcId) return;
    if (dc && typeof dc.show_prices === "boolean") {
      setShowPricesInView(dc.show_prices);
      return;
    }
    const saved = localStorage.getItem(`delivery_challan_show_prices_${dcId}`);
    if (saved === "true") setShowPricesInView(true);
    if (saved === "false") setShowPricesInView(false);
  }, [dc, dcId]);

  useEffect(() => {
    if (typeof window === "undefined" || !dcId) return;
    localStorage.setItem(
      `delivery_challan_show_prices_${dcId}`,
      showPricesInView ? "true" : "false"
    );
  }, [dcId, showPricesInView]);

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
  const canEdit = dc.status !== "cancelled";
  const editHref = `/delivery-challans/${dc.dc_type === "dc_in" ? "dc-in" : "dc-out"}/new?editId=${dc.id}`;

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

  const generateDCPdf = async (showPrices: boolean) => {
    const logoDataUrl = await getDeliveryChallanLogoDataUrl();
    const doc = buildDeliveryChallanPdf({
      dc: {
        ...dc,
      },
      companyData: {
        ...(company as any),
      },
      formatDate: (date) => (date ? dayjs(date).format("DD MMM YYYY") : "-"),
      logoDataUrl,
      showPrices,
    });
    doc.save(`DC-${dc.dc_number}.pdf`);
  };

  const actionButtonClass =
    "rounded-lg border border-stroke bg-white px-4 py-2 text-sm font-medium text-dark transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-50 dark:border-dark-3 dark:bg-gray-dark dark:text-white";

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="rounded-lg bg-white p-6 shadow-1 dark:bg-gray-dark">
        <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <Link href="/delivery-challans" className="mb-3 inline-flex items-center gap-2 text-sm text-primary hover:underline">
              <span aria-hidden="true">&lt;</span>
              Back to Delivery Challans
            </Link>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold text-dark dark:text-white">{dc.dc_number}</h1>
              <span className={cn("inline-flex rounded-full px-3 py-1 text-xs font-medium", getTypeColor(dc.dc_type))}>
                {isDcOut ? "DC Out" : "DC In"}
              </span>
              <span className={cn("inline-flex rounded-full px-3 py-1 text-xs font-medium capitalize", getStatusColor(dc.status))}>
                {dc.status.replace("_", " ")}
              </span>
              {dc.custom_status && (
                <span className="inline-flex rounded-full border border-stroke px-3 py-1 text-xs font-medium text-dark dark:border-dark-3 dark:text-white">
                  {dc.custom_status}
                </span>
              )}
            </div>
            <p className="mt-2 text-sm text-dark-6">Date: {dayjs(dc.dc_date).format("DD MMM YYYY")}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            {canEdit && <Link href={editHref} className={actionButtonClass}>Edit</Link>}
            {isDraft && (
              <button onClick={handleDelete} disabled={actionLoading === "delete"} className={actionButtonClass}>
                {actionLoading === "delete" ? "Deleting..." : "Delete"}
              </button>
            )}
            {canDispatch && (
              <button onClick={() => performAction("dispatch")} disabled={actionLoading === "dispatch"} className={actionButtonClass}>
                {actionLoading === "dispatch" ? "..." : "Mark Dispatched"}
              </button>
            )}
            {canMarkInTransit && (
              <button onClick={() => performAction("in-transit")} disabled={actionLoading === "in-transit"} className={actionButtonClass}>
                {actionLoading === "in-transit" ? "..." : "Mark In Transit"}
              </button>
            )}
            {canMarkDelivered && (
              <button onClick={() => performAction("delivered", { received_by: "Customer" })} disabled={actionLoading === "delivered"} className={actionButtonClass}>
                {actionLoading === "delivered" ? "..." : "Mark Delivered"}
              </button>
            )}
            {canMarkReceived && (
              <button onClick={() => performAction("received", { received_by: "Warehouse" })} disabled={actionLoading === "received"} className={actionButtonClass}>
                {actionLoading === "received" ? "..." : "Mark as Inward"}
              </button>
            )}
            {canCreateReturn && (
              <button onClick={handleCreateReturn} disabled={actionLoading === "return"} className={actionButtonClass}>
                {actionLoading === "return" ? "Creating..." : "Create Return"}
              </button>
            )}
            {canCancel && (
              <button onClick={() => performAction("cancel", { reason: "Cancelled by user" })} disabled={actionLoading === "cancel"} className={actionButtonClass}>
                {actionLoading === "cancel" ? "..." : "Cancel"}
              </button>
            )}
            <button onClick={() => void generateDCPdf(showPricesInView)} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-primary/90">
              Download PDF
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-stroke pt-4 dark:border-dark-3">
          <div className="flex flex-wrap items-center gap-4 text-sm text-dark dark:text-white">
            <span>Items: {dc.items?.length || 0}</span>
            <span>Quantity: {(dc.items || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0)}</span>
            <span>Total: {showPricesInView ? formatMoney(itemGrandTotal) : "Hidden"}</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-dark dark:text-white">
            <label className="inline-flex cursor-pointer items-center gap-2">
              <input type="radio" name="dc_price_view_mode" checked={showPricesInView} onChange={() => setShowPricesInView(true)} className="h-4 w-4" />
              With Price
            </label>
            <label className="inline-flex cursor-pointer items-center gap-2">
              <input type="radio" name="dc_price_view_mode" checked={!showPricesInView} onChange={() => setShowPricesInView(false)} className="h-4 w-4" />
              Without Price
            </label>
          </div>
        </div>
      </div>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="grid gap-6">
          <div className="rounded-lg bg-white shadow-1 dark:bg-gray-dark">
            <div className="border-b border-stroke px-6 py-4 dark:border-dark-3">
              <h3 className="text-lg font-semibold text-dark dark:text-white">Document Overview</h3>
            </div>
            <div className="grid gap-4 p-6 md:grid-cols-2">
              <div><p className="text-sm text-dark-6">Reference</p><p className="mt-1 font-medium text-dark dark:text-white">{dc.reference_no || "-"}</p></div>
              <div><p className="text-sm text-dark-6">Invoice</p><p className="mt-1 font-medium text-dark dark:text-white">{dc.invoice_number ? <Link href={`/invoices/${dc.invoice_id}`} className="text-primary hover:underline">{dc.invoice_number}</Link> : "-"}</p></div>
              <div><p className="text-sm text-dark-6">Stock Updated</p><p className="mt-1 font-medium text-dark dark:text-white">{dc.stock_updated ? "Yes" : "No"}</p></div>
              <div><p className="text-sm text-dark-6">{isDcIn ? "Received On" : "Delivered On"}</p><p className="mt-1 font-medium text-dark dark:text-white">{dc.delivered_at ? dayjs(dc.delivered_at).format("DD MMM YYYY") : "-"}</p></div>
              <div><p className="text-sm text-dark-6">From Godown</p><p className="mt-1 font-medium text-dark dark:text-white">{dc.from_godown_id ? godownMap.get(dc.from_godown_id) || dc.from_godown_id : "-"}</p></div>
              <div><p className="text-sm text-dark-6">To Godown</p><p className="mt-1 font-medium text-dark dark:text-white">{dc.to_godown_id ? godownMap.get(dc.to_godown_id) || dc.to_godown_id : "-"}</p></div>
              {dc.expiry_date && <div><p className="text-sm text-dark-6">Expiry Date</p><p className="mt-1 font-medium text-dark dark:text-white">{dayjs(dc.expiry_date).format("DD MMM YYYY")}</p></div>}
              {dc.original_dc_id && <div><p className="text-sm text-dark-6">Original DC</p><p className="mt-1 font-medium text-dark dark:text-white"><Link href={`/delivery-challans/${dc.original_dc_id}`} className="text-primary hover:underline">View Original DC Out</Link></p></div>}
              {dc.dispatch_from_address && (
                <div className="md:col-span-2">
                  <p className="text-sm text-dark-6">Dispatch From</p>
                  <p className="mt-1 leading-6 text-dark dark:text-white">
                    {dc.dispatch_from_address}
                    {dc.dispatch_from_city && `, ${dc.dispatch_from_city}`}
                    {dc.dispatch_from_state && `, ${dc.dispatch_from_state}`}
                    {dc.dispatch_from_pincode && ` - ${dc.dispatch_from_pincode}`}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-lg bg-white shadow-1 dark:bg-gray-dark">
            <div className="border-b border-stroke px-6 py-4 dark:border-dark-3">
              <h3 className="text-lg font-semibold text-dark dark:text-white">Customer & Billing</h3>
            </div>
            <div className="space-y-4 p-6">
              <div><p className="text-sm text-dark-6">Customer</p><p className="mt-1 text-lg font-semibold text-dark dark:text-white">{dc.customer_name || "-"}</p></div>
              {dc.contact_person && <div><p className="text-sm text-dark-6">Contact Person</p><p className="mt-1 font-medium text-dark dark:text-white">{dc.contact_person}</p></div>}
              {dc.salesman_id && <div><p className="text-sm text-dark-6">Salesman</p><p className="mt-1 font-medium text-dark dark:text-white">{employeeMap.get(dc.salesman_id) || dc.salesman_id}</p></div>}
              {dc.delivery_to_address && (
                <div>
                  <p className="text-sm text-dark-6">Delivery Address</p>
                  <p className="mt-1 leading-6 text-dark dark:text-white">
                    {dc.delivery_to_address}
                    {dc.delivery_to_city && `, ${dc.delivery_to_city}`}
                    {dc.delivery_to_state && `, ${dc.delivery_to_state}`}
                    {dc.delivery_to_pincode && ` - ${dc.delivery_to_pincode}`}
                  </p>
                </div>
              )}
              {dc.bill_title && <div><p className="text-sm text-dark-6">Bill Title</p><p className="mt-1 font-medium text-dark dark:text-white">{dc.bill_title}</p></div>}
              {dc.bill_description && <div><p className="text-sm text-dark-6">Bill Description</p><p className="mt-1 leading-6 text-dark-6">{dc.bill_description}</p></div>}
            </div>
          </div>
        </div>

        <div className="grid gap-6">
          {(dc.transporter_name || dc.vehicle_number || dc.eway_bill_number || dc.lr_number) && (
            <div className="rounded-lg bg-white shadow-1 dark:bg-gray-dark">
              <div className="border-b border-stroke px-6 py-4 dark:border-dark-3">
                <h3 className="text-lg font-semibold text-dark dark:text-white">Transport Details</h3>
              </div>
              <div className="grid gap-4 p-6 sm:grid-cols-2">
                {dc.transporter_name && <div><p className="text-sm text-dark-6">Transporter</p><p className="mt-1 font-medium text-dark dark:text-white">{dc.transporter_name}</p></div>}
                {dc.vehicle_number && <div><p className="text-sm text-dark-6">Vehicle</p><p className="mt-1 font-medium text-dark dark:text-white">{dc.vehicle_number}</p></div>}
                {dc.eway_bill_number && <div><p className="text-sm text-dark-6">E-Way Bill</p><p className="mt-1 font-medium text-dark dark:text-white">{dc.eway_bill_number}</p></div>}
                {dc.lr_number && <div><p className="text-sm text-dark-6">LR Number</p><p className="mt-1 font-medium text-dark dark:text-white">{dc.lr_number}</p></div>}
              </div>
            </div>
          )}

          {showPricesInView && (
            <div className="rounded-lg bg-white shadow-1 dark:bg-gray-dark">
              <div className="border-b border-stroke px-6 py-4 dark:border-dark-3">
                <h3 className="text-lg font-semibold text-dark dark:text-white">Item Totals</h3>
              </div>
              <div className="space-y-3 p-6">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-dark-6">Subtotal</span>
                  <span className="font-medium text-dark dark:text-white">{formatMoney(itemSubtotal)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-dark-6">Tax</span>
                  <span className="font-medium text-dark dark:text-white">{formatMoney(itemTax)}</span>
                </div>
                <div className="flex items-center justify-between border-t border-stroke pt-3 text-sm dark:border-dark-3">
                  <span className="font-semibold text-dark dark:text-white">Grand Total</span>
                  <span className="font-semibold text-primary">{formatMoney(itemGrandTotal)}</span>
                </div>
              </div>
            </div>
          )}

          {dc.dc_type === "dc_in" && dc.return_reason && (
            <div className="rounded-lg bg-white p-6 shadow-1 dark:bg-gray-dark">
              <h3 className="text-lg font-semibold text-dark dark:text-white">Return Reason</h3>
              <p className="mt-2 text-sm leading-6 text-dark-6">{dc.return_reason}</p>
            </div>
          )}

          {dc.notes && (
            <div className="rounded-lg bg-white shadow-1 dark:bg-gray-dark">
              <div className="border-b border-stroke px-6 py-4 dark:border-dark-3">
                <h3 className="text-lg font-semibold text-dark dark:text-white">Notes</h3>
              </div>
              <div className="p-6">
                <p className="whitespace-pre-wrap text-sm leading-6 text-dark-6">{dc.notes}</p>
              </div>
            </div>
          )}
        </div>
      </section>

      <div className="rounded-lg bg-white shadow-1 dark:bg-gray-dark">
        <div className="border-b border-stroke px-6 py-4 dark:border-dark-3">
          <h3 className="text-lg font-semibold text-dark dark:text-white">Items</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px]">
            <thead>
              <tr className="border-b border-stroke bg-gray-1 dark:border-dark-3 dark:bg-dark-2">
                <th className="px-4 py-4 text-left text-xs font-semibold uppercase tracking-[0.2em] text-dark-6">#</th>
                <th className="px-4 py-4 text-left text-xs font-semibold uppercase tracking-[0.2em] text-dark-6">Description</th>
                <th className="px-4 py-4 text-left text-xs font-semibold uppercase tracking-[0.2em] text-dark-6">HSN</th>
                <th className="px-4 py-4 text-right text-xs font-semibold uppercase tracking-[0.2em] text-dark-6">Qty</th>
                <th className="px-4 py-4 text-left text-xs font-semibold uppercase tracking-[0.2em] text-dark-6">Unit</th>
                {showPricesInView && <th className="px-4 py-4 text-right text-xs font-semibold uppercase tracking-[0.2em] text-dark-6">Unit Price</th>}
                <th className="px-4 py-4 text-right text-xs font-semibold uppercase tracking-[0.2em] text-dark-6">Discount %</th>
                {showPricesInView && <th className="px-4 py-4 text-right text-xs font-semibold uppercase tracking-[0.2em] text-dark-6">Discount Amt</th>}
                <th className="px-4 py-4 text-right text-xs font-semibold uppercase tracking-[0.2em] text-dark-6">GST %</th>
                {showPricesInView && <th className="px-4 py-4 text-right text-xs font-semibold uppercase tracking-[0.2em] text-dark-6">Taxable</th>}
                {showPricesInView && <th className="px-4 py-4 text-right text-xs font-semibold uppercase tracking-[0.2em] text-dark-6">Total</th>}
              </tr>
            </thead>
            <tbody>
              {dc.items?.map((item, index) => (
                <tr key={item.id} className="border-b border-stroke dark:border-dark-3">
                  <td className="px-4 py-4 align-top text-dark-6">{index + 1}</td>
                  <td className="px-4 py-4 align-top"><div className="max-w-[320px]"><p className="font-medium text-dark dark:text-white">{item.description}</p></div></td>
                  <td className="px-4 py-4 align-top text-dark-6">{item.hsn_code || "-"}</td>
                  <td className="px-4 py-4 align-top text-right font-medium text-dark dark:text-white">{item.quantity}</td>
                  <td className="px-4 py-4 align-top text-dark-6">{item.unit}</td>
                  {showPricesInView && <td className="px-4 py-4 align-top text-right font-medium text-dark dark:text-white">{formatMoney(item.unit_price)}</td>}
                  <td className="px-4 py-4 align-top text-right text-dark-6">{item.discount_percent || 0}</td>
                  {showPricesInView && <td className="px-4 py-4 align-top text-right font-medium text-dark dark:text-white">{formatMoney(item.discount_amount)}</td>}
                  <td className="px-4 py-4 align-top text-right text-dark-6">{item.gst_rate || 0}</td>
                  {showPricesInView && <td className="px-4 py-4 align-top text-right font-medium text-dark dark:text-white">{formatMoney(item.taxable_amount)}</td>}
                  {showPricesInView && <td className="px-4 py-4 align-top text-right font-semibold text-dark dark:text-white">{formatMoney(item.total_amount)}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

}


