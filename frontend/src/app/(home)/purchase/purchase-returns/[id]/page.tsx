"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { purchaseReturnsApi, PurchaseReturn, vendorsApi, Vendor } from "@/services/api";

const INDIAN_STATE_NAME_TO_CODE: Record<string, string> = {
  "jammu & kashmir": "01",
  "himachal pradesh": "02",
  "punjab": "03",
  "chandigarh": "04",
  "uttarakhand": "05",
  "haryana": "06",
  "delhi": "07",
  "rajasthan": "08",
  "uttar pradesh": "09",
  "bihar": "10",
  "sikkim": "11",
  "arunachal pradesh": "12",
  "nagaland": "13",
  "manipur": "14",
  "mizoram": "15",
  "tripura": "16",
  "meghalaya": "17",
  "assam": "18",
  "west bengal": "19",
  "jharkhand": "20",
  "odisha": "21",
  "chhattisgarh": "22",
  "madhya pradesh": "23",
  "gujarat": "24",
  "maharashtra": "27",
  "karnataka": "29",
  "goa": "30",
  "kerala": "32",
  "tamil nadu": "33",
  "puducherry": "34",
  "telangana": "36",
  "andhra pradesh": "37",
};

const codeFromGstin = (gstin?: string | null) => {
  const value = String(gstin || "").trim();
  return value.length >= 2 && /^\d{2}/.test(value) ? value.slice(0, 2) : "";
};

const codeFromStateText = (text?: string | null) => {
  const normalized = String(text || "").trim().toLowerCase();
  if (!normalized) return "";
  if (INDIAN_STATE_NAME_TO_CODE[normalized]) return INDIAN_STATE_NAME_TO_CODE[normalized];
  const found = Object.entries(INDIAN_STATE_NAME_TO_CODE).find(([name]) => normalized.includes(name));
  return found?.[1] || "";
};

const formatCurrency = (amount: number | undefined) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(amount || 0));

const formatDate = (value?: string) => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export default function PurchaseReturnViewPage() {
  const router = useRouter();
  const params = useParams();
  const { company } = useAuth();
  const returnId = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [purchaseReturn, setPurchaseReturn] = useState<PurchaseReturn | null>(null);
  const [vendor, setVendor] = useState<Vendor | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!company?.id || !returnId) return;
      setLoading(true);
      setError("");
      try {
        const data = await purchaseReturnsApi.get(company.id, returnId);
        setPurchaseReturn(data);
        if (data?.vendor_id) {
          try {
            const vendorData = await vendorsApi.get(company.id, data.vendor_id);
            setVendor(vendorData);
          } catch (vendorErr) {
            console.warn("Failed to load vendor details for state comparison", vendorErr);
            setVendor(null);
          }
        } else {
          setVendor(null);
        }
      } catch (err) {
        console.error(err);
        setError("Failed to load purchase return details.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [company?.id, returnId]);

  const paidAmount = useMemo(
    () => Number(purchaseReturn?.amount_paid) || 0,
    [purchaseReturn]
  );
  const totalAmount = Number(purchaseReturn?.total_amount) || 0;
  const balance = Math.max(0, totalAmount - paidAmount);
  const subtotal = Number(purchaseReturn?.subtotal) || 0;
  const discountAmount = Number(purchaseReturn?.discount_amount) || 0;
  const cgstAmount = Number(purchaseReturn?.cgst_amount) || 0;
  const sgstAmount = Number(purchaseReturn?.sgst_amount) || 0;
  const igstAmount = Number(purchaseReturn?.igst_amount) || 0;
  const cessAmount = Number(purchaseReturn?.cess_amount) || 0;
  const totalTax = Number(purchaseReturn?.total_tax) || 0;
  const freightCharges = Number(purchaseReturn?.freight_charges) || 0;
  const pfCharges = Number(purchaseReturn?.packing_forwarding_charges) || 0;
  const roundOff = Number(purchaseReturn?.round_off) || 0;

  const companyStateCode =
    String((company as any)?.state_code || "").trim() || codeFromGstin((company as any)?.gstin);
  const vendorShippingCountry = String(vendor?.shipping_country || vendor?.billing_country || "").trim().toLowerCase();
  const vendorShippingStateCode =
    codeFromStateText(vendor?.shipping_state) ||
    codeFromStateText(vendor?.shipping_address) ||
    codeFromStateText(vendor?.billing_state) ||
    codeFromStateText(vendor?.billing_address) ||
    codeFromGstin(vendor?.tax_number || vendor?.gstin);

  const isForeignCountry = Boolean(vendorShippingCountry && vendorShippingCountry !== "india");
  const isInterState = isForeignCountry || Boolean(companyStateCode && vendorShippingStateCode && companyStateCode !== vendorShippingStateCode);
  const displayCgst = isInterState ? 0 : cgstAmount;
  const displaySgst = isInterState ? 0 : sgstAmount;
  const displayIgst = isInterState ? igstAmount : 0;

  if (loading) {
    return (
      <div className="p-6">
        <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
          Loading purchase return...
        </div>
      </div>
    );
  }

  if (error || !purchaseReturn) {
    return (
      <div className="p-6">
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
          {error || "Purchase return not found."}
        </div>
        <button
          onClick={() => router.push("/purchase/purchase-returns")}
          className="mt-4 rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 dark:border-gray-600 dark:text-gray-200"
        >
          Back to Purchase Returns
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Purchase Return</p>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {purchaseReturn.return_number || "-"}
            </h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={`/purchase/purchase-returns/edit/${purchaseReturn.id}`} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
              Edit
            </Link>
            <Link href="/purchase/purchase-returns" className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 dark:border-gray-600 dark:text-gray-200">
              Back
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <p className="text-xs text-gray-500">Return Date</p>
          <p className="mt-1 font-semibold text-gray-900 dark:text-white">{formatDate(purchaseReturn.return_date)}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <p className="text-xs text-gray-500">Purchase Code</p>
          <p className="mt-1 font-semibold text-gray-900 dark:text-white">{purchaseReturn.purchase_number || "-"}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <p className="text-xs text-gray-500">Vendor</p>
          <p className="mt-1 font-semibold text-gray-900 dark:text-white">{purchaseReturn.vendor_name || "-"}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <p className="text-xs text-gray-500">Total</p>
          <p className="mt-1 font-semibold text-gray-900 dark:text-white">{formatCurrency(totalAmount)}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <p className="text-xs text-gray-500">Paid</p>
          <p className="mt-1 font-semibold text-green-600">{formatCurrency(paidAmount)}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <p className="text-xs text-gray-500">Balance</p>
          <p className="mt-1 font-semibold text-yellow-600">{formatCurrency(balance)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Return Details</h2>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <p className="text-xs text-gray-500">Return Number</p>
              <p className="font-medium text-gray-900 dark:text-white">{purchaseReturn.return_number || "-"}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Return Date</p>
              <p className="font-medium text-gray-900 dark:text-white">{formatDate(purchaseReturn.return_date)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Purchase Code</p>
              <p className="font-medium text-gray-900 dark:text-white">{purchaseReturn.purchase_number || "-"}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Vendor</p>
              <p className="font-medium text-gray-900 dark:text-white">{purchaseReturn.vendor_name || "-"}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Status</p>
              <p className="font-medium text-gray-900 dark:text-white">{purchaseReturn.status || "-"}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Payment Status</p>
              <p className="font-medium text-gray-900 dark:text-white">{purchaseReturn.payment_status || "-"}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Reference No</p>
              <p className="font-medium text-gray-900 dark:text-white">{purchaseReturn.reference_no || "-"}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Created By</p>
              <p className="font-medium text-gray-900 dark:text-white">
                {purchaseReturn.created_by_name || purchaseReturn.created_by || "-"}
              </p>
            </div>
            <div className="sm:col-span-2">
              <p className="text-xs text-gray-500">Reason</p>
              <p className="font-medium text-gray-900 dark:text-white">{purchaseReturn.reason || "-"}</p>
            </div>
            <div className="sm:col-span-2">
              <p className="text-xs text-gray-500">Notes</p>
              <p className="whitespace-pre-wrap font-medium text-gray-900 dark:text-white">{purchaseReturn.notes || "-"}</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Summary</h2>
          <div className="mt-4 space-y-2 text-sm">
            <div className="flex items-center justify-between"><span className="text-gray-500">Subtotal</span><span className="font-medium">{formatCurrency(subtotal)}</span></div>
            <div className="flex items-center justify-between"><span className="text-gray-500">Discount</span><span className="font-medium text-red-600">-{formatCurrency(discountAmount)}</span></div>
            <div className="flex items-center justify-between"><span className="text-gray-500">CGST</span><span className="font-medium">{formatCurrency(displayCgst)}</span></div>
            <div className="flex items-center justify-between"><span className="text-gray-500">SGST</span><span className="font-medium">{formatCurrency(displaySgst)}</span></div>
            <div className="flex items-center justify-between"><span className="text-gray-500">IGST</span><span className="font-medium">{formatCurrency(displayIgst)}</span></div>
            <div className="flex items-center justify-between"><span className="text-gray-500">Cess</span><span className="font-medium">{formatCurrency(cessAmount)}</span></div>
            <div className="flex items-center justify-between"><span className="text-gray-500">Total Tax</span><span className="font-medium">{formatCurrency(totalTax)}</span></div>
            <div className="flex items-center justify-between"><span className="text-gray-500">Freight Charges</span><span className="font-medium">{formatCurrency(freightCharges)}</span></div>
            <div className="flex items-center justify-between"><span className="text-gray-500">P &amp; F Charges</span><span className="font-medium">{formatCurrency(pfCharges)}</span></div>
            <div className="flex items-center justify-between"><span className="text-gray-500">Round Off</span><span className="font-medium">{roundOff >= 0 ? "+" : "-"}{formatCurrency(Math.abs(roundOff))}</span></div>
            <div className="flex items-center justify-between border-t border-gray-200 pt-2 dark:border-gray-700"><span className="font-semibold text-gray-900 dark:text-white">Grand Total</span><span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(totalAmount)}</span></div>
            <div className="flex items-center justify-between"><span className="text-gray-500">Amount Paid</span><span className="font-medium text-green-600">{formatCurrency(paidAmount)}</span></div>
            <div className="flex items-center justify-between"><span className="text-gray-500">Balance Due</span><span className="font-medium text-yellow-600">{formatCurrency(balance)}</span></div>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Items</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="px-3 py-2 text-left">Description</th>
                <th className="px-3 py-2 text-left">HSN</th>
                <th className="px-3 py-2 text-right">Qty</th>
                <th className="px-3 py-2 text-right">Unit</th>
                <th className="px-3 py-2 text-right">Rate</th>
                <th className="px-3 py-2 text-right">GST%</th>
                <th className="px-3 py-2 text-right">Disc%</th>
                <th className="px-3 py-2 text-right">Disc Amt</th>
                <th className="px-3 py-2 text-right">CGST</th>
                <th className="px-3 py-2 text-right">SGST</th>
                <th className="px-3 py-2 text-right">IGST</th>
                <th className="px-3 py-2 text-right">Taxable</th>
                <th className="px-3 py-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {(purchaseReturn.items || []).map((item, idx) => (
                <tr key={item.id || idx} className="border-b">
                  <td className="px-3 py-2">{item.description}</td>
                  <td className="px-3 py-2">{item.hsn_code || "-"}</td>
                  <td className="px-3 py-2 text-right">{Number(item.quantity || 0).toFixed(2)}</td>
                  <td className="px-3 py-2 text-right">{item.unit || "-"}</td>
                  <td className="px-3 py-2 text-right">{formatCurrency(Number(item.unit_price || 0))}</td>
                  <td className="px-3 py-2 text-right">{Number(item.gst_rate || 0).toFixed(2)}</td>
                  <td className="px-3 py-2 text-right">{Number(item.discount_percent || 0).toFixed(2)}</td>
                  <td className="px-3 py-2 text-right">{formatCurrency(Number(item.discount_amount || 0))}</td>
                  <td className="px-3 py-2 text-right">{Number(item.cgst_rate || 0).toFixed(2)}%</td>
                  <td className="px-3 py-2 text-right">{Number(item.sgst_rate || 0).toFixed(2)}%</td>
                  <td className="px-3 py-2 text-right">{Number(item.igst_rate || 0).toFixed(2)}%</td>
                  <td className="px-3 py-2 text-right">{formatCurrency(Number(item.taxable_amount || 0))}</td>
                  <td className="px-3 py-2 text-right font-medium">{formatCurrency(Number(item.total_amount || 0))}</td>
                </tr>
              ))}
              {(!purchaseReturn.items || purchaseReturn.items.length === 0) && (
                <tr><td colSpan={13} className="px-3 py-6 text-center text-gray-500">No items</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
