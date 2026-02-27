"use client";

import { useAuth } from "@/context/AuthContext";
import { purchasesApi } from "@/services/api";
import dayjs from "dayjs";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

const currencySymbols: Record<string, string> = {
  INR: "Rs. ",
  USD: "$",
  EUR: "EUR ",
  GBP: "GBP ",
  JPY: "JPY ",
  AED: "AED ",
  SGD: "SGD ",
  CAD: "CAD ",
  AUD: "AUD ",
  CNY: "CNY ",
};

const formatDate = (value?: string | null) => {
  if (!value) return "-";
  const d = dayjs(value);
  return d.isValid() ? d.format("DD MMM YYYY") : "-";
};

const formatType = (value?: string | null) => {
  if (!value) return "-";
  return value
    .replace(/_/g, " ")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
};

export default function PurchaseInvoiceViewPage() {
  const { company } = useAuth();
  const params = useParams();
  const purchaseId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [purchase, setPurchase] = useState<any>(null);

  useEffect(() => {
    const run = async () => {
      if (!company?.id || !purchaseId) return;
      try {
        setLoading(true);
        setError("");
        const data = await purchasesApi.get(company.id, purchaseId);
        setPurchase(data);
      } catch (e) {
        console.error("Failed to load purchase invoice:", e);
        setError("Failed to load purchase invoice details");
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [company?.id, purchaseId]);

  const currencyCode = String(purchase?.payment_type || "INR").toUpperCase();
  const exchangeRate = Number(purchase?.exchange_rate || 1);
  const currencySymbol = currencySymbols[currencyCode] || `${currencyCode} `;

  const formatMoney = (amount: number | string | null | undefined) => {
    const num = Number(amount || 0);
    return `${currencySymbol}${num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatInr = (amount: number | string | null | undefined) => {
    const num = Number(amount || 0);
    const inr = currencyCode === "INR" ? num : num * (exchangeRate > 0 ? exchangeRate : 1);
    return `Rs. ${inr.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const computedSubtotal = useMemo(() => {
    if (!purchase?.items?.length) return 0;
    return purchase.items.reduce((sum: number, item: any) => {
      const qty = Number(item.quantity || 0);
      const price = Number(item.purchase_price ?? item.unit_price ?? item.rate ?? 0);
      return sum + qty * price;
    }, 0);
  }, [purchase?.items]);

  if (!company) {
    return <div className="rounded-lg bg-white p-6 text-center dark:bg-gray-800">Select company first</div>;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (error || !purchase) {
    return (
      <div className="rounded-lg bg-white p-6 dark:bg-gray-800">
        <p className="text-red-600">{error || "Purchase not found"}</p>
        <Link href="/purchase/purchase-list" className="mt-3 inline-block text-blue-600 hover:underline">
          Back to Purchase List
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Link href="/purchase/purchase-list" className="mb-2 inline-block text-sm text-blue-600 hover:underline">
              Back to Purchase List
            </Link>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {purchase.purchase_number || purchase.invoice_number || "-"}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Purchase Invoice View</p>
          </div>
          <span className="rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-200">
            {String(purchase.status || "DRAFT").toUpperCase()}
          </span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
          <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-white">Invoice Details</h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-gray-500">Purchase No</p>
              <p className="font-medium text-gray-900 dark:text-white">{purchase.purchase_number || "-"}</p>
            </div>
            <div>
              <p className="text-gray-500">Vendor Invoice No</p>
              <p className="font-medium text-gray-900 dark:text-white">{purchase.vendor_invoice_number || "-"}</p>
            </div>
            <div>
              <p className="text-gray-500">Reference No</p>
              <p className="font-medium text-gray-900 dark:text-white">{purchase.reference_no || "-"}</p>
            </div>
            <div>
              <p className="text-gray-500">Invoice Date</p>
              <p className="font-medium text-gray-900 dark:text-white">{formatDate(purchase.invoice_date)}</p>
            </div>
            <div>
              <p className="text-gray-500">Vendor Invoice Date</p>
              <p className="font-medium text-gray-900 dark:text-white">{formatDate(purchase.vendor_invoice_date)}</p>
            </div>
            <div>
              <p className="text-gray-500">Due Date</p>
              <p className="font-medium text-gray-900 dark:text-white">{formatDate(purchase.due_date)}</p>
            </div>
            <div>
              <p className="text-gray-500">Purchase Type</p>
              <p className="font-medium text-gray-900 dark:text-white">{formatType(purchase.purchase_type)}</p>
            </div>
            <div>
              <p className="text-gray-500">Currency</p>
              <p className="font-medium text-gray-900 dark:text-white">{currencyCode}</p>
            </div>
            <div>
              <p className="text-gray-500">Exchange Rate</p>
              <p className="font-medium text-gray-900 dark:text-white">{exchangeRate || 1}</p>
            </div>
            <div>
              <p className="text-gray-500">Created On</p>
              <p className="font-medium text-gray-900 dark:text-white">{formatDate(purchase.created_at)}</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
          <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-white">Vendor & Contact</h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-gray-500">Vendor Name</p>
              <p className="font-medium text-gray-900 dark:text-white">{purchase.vendor_name || "-"}</p>
            </div>
            <div>
              <p className="text-gray-500">Vendor GSTIN</p>
              <p className="font-medium text-gray-900 dark:text-white">{purchase.vendor_gstin || "-"}</p>
            </div>
            <div>
              <p className="text-gray-500">Contact Person</p>
              <p className="font-medium text-gray-900 dark:text-white">{purchase.contact_person || "-"}</p>
            </div>
            <div>
              <p className="text-gray-500">Contact Phone</p>
              <p className="font-medium text-gray-900 dark:text-white">{purchase.contact_phone || "-"}</p>
            </div>
            <div className="col-span-2">
              <p className="text-gray-500">Contact Email</p>
              <p className="font-medium text-gray-900 dark:text-white">{purchase.contact_email || "-"}</p>
            </div>
            <div className="col-span-2">
              <p className="text-gray-500">Shipping Address</p>
              <p className="font-medium whitespace-pre-wrap text-gray-900 dark:text-white">{purchase.shipping_address || "-"}</p>
            </div>
            <div className="col-span-2">
              <p className="text-gray-500">Billing Address</p>
              <p className="font-medium whitespace-pre-wrap text-gray-900 dark:text-white">{purchase.billing_address || "-"}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
        <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-white">Items</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left dark:border-gray-700">
                <th className="px-2 py-2">#</th>
                <th className="px-2 py-2">Item Code</th>
                <th className="px-2 py-2">Description</th>
                <th className="px-2 py-2">HSN</th>
                <th className="px-2 py-2 text-right">Qty</th>
                <th className="px-2 py-2">Unit</th>
                <th className="px-2 py-2 text-right">Price</th>
                <th className="px-2 py-2 text-right">Disc %</th>
                <th className="px-2 py-2 text-right">Disc Amt</th>
                <th className="px-2 py-2 text-right">GST %</th>
                <th className="px-2 py-2 text-right">Taxable</th>
                <th className="px-2 py-2 text-right">Tax</th>
                <th className="px-2 py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {(purchase.items || []).map((item: any, idx: number) => {
                const price = Number(item.purchase_price ?? item.unit_price ?? item.rate ?? 0);
                return (
                  <tr key={item.id || idx} className="border-b border-gray-100 dark:border-gray-700">
                    <td className="px-2 py-2">{idx + 1}</td>
                    <td className="px-2 py-2">{item.item_code || "-"}</td>
                    <td className="px-2 py-2">{item.description || "-"}</td>
                    <td className="px-2 py-2">{item.hsn_code || "-"}</td>
                    <td className="px-2 py-2 text-right">{Number(item.quantity || 0)}</td>
                    <td className="px-2 py-2">{item.unit || "-"}</td>
                    <td className="px-2 py-2 text-right">{formatMoney(price)}</td>
                    <td className="px-2 py-2 text-right">{Number(item.discount_percent || 0)}</td>
                    <td className="px-2 py-2 text-right">{formatMoney(item.discount_amount || 0)}</td>
                    <td className="px-2 py-2 text-right">{Number(item.gst_rate || 0)}</td>
                    <td className="px-2 py-2 text-right">{formatMoney(item.taxable_amount || (Number(item.quantity || 0) * price))}</td>
                    <td className="px-2 py-2 text-right">{formatMoney(item.tax_amount || 0)}</td>
                    <td className="px-2 py-2 text-right font-semibold">{formatMoney(item.total_amount || 0)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
          <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-white">Import Items</h2>
          {(purchase.import_items || []).length === 0 ? (
            <p className="text-sm text-gray-500">No import items</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left dark:border-gray-700">
                    <th className="px-2 py-2">#</th>
                    <th className="px-2 py-2">Name</th>
                    <th className="px-2 py-2 text-right">Qty</th>
                    <th className="px-2 py-2">Per</th>
                    <th className="px-2 py-2 text-right">Rate</th>
                    <th className="px-2 py-2 text-right">Disc %</th>
                    <th className="px-2 py-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {(purchase.import_items || []).map((item: any, idx: number) => (
                    <tr key={item.id || idx} className="border-b border-gray-100 dark:border-gray-700">
                      <td className="px-2 py-2">{idx + 1}</td>
                      <td className="px-2 py-2">{item.name || "-"}</td>
                      <td className="px-2 py-2 text-right">{Number(item.quantity || 0)}</td>
                      <td className="px-2 py-2">{item.per || "-"}</td>
                      <td className="px-2 py-2 text-right">{formatMoney(item.rate || 0)}</td>
                      <td className="px-2 py-2 text-right">{Number(item.discount_percent || 0)}</td>
                      <td className="px-2 py-2 text-right font-semibold">{formatMoney(item.amount || 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
          <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-white">Expense Items</h2>
          {(purchase.expense_items || []).length === 0 ? (
            <p className="text-sm text-gray-500">No expense items</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left dark:border-gray-700">
                    <th className="px-2 py-2">#</th>
                    <th className="px-2 py-2">Particulars</th>
                    <th className="px-2 py-2 text-right">Rate</th>
                    <th className="px-2 py-2">Per</th>
                    <th className="px-2 py-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {(purchase.expense_items || []).map((item: any, idx: number) => (
                    <tr key={item.id || idx} className="border-b border-gray-100 dark:border-gray-700">
                      <td className="px-2 py-2">{idx + 1}</td>
                      <td className="px-2 py-2">{item.particulars || "-"}</td>
                      <td className="px-2 py-2 text-right">{formatMoney(item.rate || 0)}</td>
                      <td className="px-2 py-2">{item.per || "-"}</td>
                      <td className="px-2 py-2 text-right font-semibold">{formatMoney(item.amount || 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
          <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-white">Charges & Totals</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span>{formatMoney(purchase.subtotal ?? computedSubtotal)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Discount Amount</span><span>{formatMoney(purchase.discount_amount)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Freight Charges ({formatType(purchase.freight_type)})</span><span>{formatMoney(purchase.freight_charges)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Packing & Forwarding ({formatType(purchase.pf_type)})</span><span>{formatMoney(purchase.packing_forwarding_charges)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Discount on All ({formatType(purchase.discount_type)})</span><span>{formatMoney(purchase.discount_on_all)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Round Off</span><span>{formatMoney(purchase.round_off)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Total Tax</span><span>{formatMoney(purchase.total_tax)}</span></div>
            <div className="flex justify-between border-t border-gray-200 pt-2 dark:border-gray-700"><span className="font-semibold">Total Amount</span><span className="font-semibold">{formatMoney(purchase.total_amount)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Amount Paid</span><span>{formatMoney(purchase.amount_paid)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Balance Due</span><span>{formatMoney(purchase.balance_due)}</span></div>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
          <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-white">INR Conversion & Notes</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Total (INR)</span><span>{formatInr(purchase.total_amount)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Paid (INR)</span><span>{formatInr(purchase.amount_paid)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Balance (INR)</span><span>{formatInr(purchase.balance_due)}</span></div>
          </div>
          <div className="mt-4 space-y-3">
            <div>
              <p className="text-sm text-gray-500">Notes</p>
              <p className="whitespace-pre-wrap text-sm text-gray-900 dark:text-white">{purchase.notes || "-"}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Terms</p>
              <p className="whitespace-pre-wrap text-sm text-gray-900 dark:text-white">{purchase.terms || "-"}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
        <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-white">Payments</h2>
        {(purchase.payments || []).length === 0 ? (
          <p className="text-sm text-gray-500">No payments added</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left dark:border-gray-700">
                  <th className="px-2 py-2">#</th>
                  <th className="px-2 py-2">Date</th>
                  <th className="px-2 py-2">Type</th>
                  <th className="px-2 py-2">Account</th>
                  <th className="px-2 py-2">Reference</th>
                  <th className="px-2 py-2">Note</th>
                  <th className="px-2 py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {(purchase.payments || []).map((payment: any, idx: number) => (
                  <tr key={payment.id || idx} className="border-b border-gray-100 dark:border-gray-700">
                    <td className="px-2 py-2">{idx + 1}</td>
                    <td className="px-2 py-2">{formatDate(payment.created_at)}</td>
                    <td className="px-2 py-2">{formatType(payment.payment_type)}</td>
                    <td className="px-2 py-2">{payment.account || "-"}</td>
                    <td className="px-2 py-2">{payment.reference_number || "-"}</td>
                    <td className="px-2 py-2">{payment.payment_note || "-"}</td>
                    <td className="px-2 py-2 text-right font-semibold">{formatMoney(payment.amount || 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
