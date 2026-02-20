"use client";

import { useAuth } from "@/context/AuthContext";
import { customersApi, invoicesApi, payrollApi, Invoice, getErrorMessage } from "@/services/api";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(amount || 0);
};

const formatDate = (value?: string) => {
  if (!value) return "-";
  const date = new Date(value.includes("T") ? value : `${value}T00:00:00`);
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getStatusColor = (status?: string) => {
  switch ((status || "").toLowerCase()) {
    case "paid":
      return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
    case "pending":
      return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";
    case "partially_paid":
      return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
    case "overdue":
      return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
    case "cancelled":
      return "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400";
    case "draft":
      return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400";
    case "refunded":
      return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400";
    case "void":
      return "bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400";
    case "write_off":
      return "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400";
    default:
      return "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400";
  }
};

export default function SalesInvoiceViewPage() {
  const { company } = useAuth();
  const router = useRouter();
  const params = useParams();
  const invoiceId = params.id as string;

  type InvoiceView = Invoice & {
    sales_person_name?: string;
    outstanding_amount?: number;
  };
  const [invoice, setInvoice] = useState<InvoiceView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [customerDetails, setCustomerDetails] = useState<any | null>(null);
  const [salesPersonName, setSalesPersonName] = useState<string>("");
  const [contactPersonName, setContactPersonName] = useState<string>("");

  useEffect(() => {
    const fetchInvoice = async () => {
      if (!company?.id || !invoiceId) return;
      setLoading(true);
      setError(null);
      try {
        const data = await invoicesApi.get(company.id, invoiceId);
        console.log("[SalesInvoiceView] invoice response:", data);
        setInvoice(data);
      } catch (err: any) {
        setError(getErrorMessage(err, "Failed to load invoice"));
      } finally {
        setLoading(false);
      }
    };

    fetchInvoice();
  }, [company?.id, invoiceId]);

  useEffect(() => {
    const hydrateLookups = async () => {
      if (!company?.id || !invoice) return;
      try {
        console.log("[SalesInvoiceView] invoice.id:", invoice.id);
        console.log("[SalesInvoiceView] invoice.customer_id:", invoice.customer_id);
        console.log("[SalesInvoiceView] invoice.customer_name:", invoice.customer_name);
        console.log("[SalesInvoiceView] invoice.contact_id:", invoice.contact_id);
        console.log("[SalesInvoiceView] invoice.sales_person_id:", invoice.sales_person_id);
        let customer = null as any;
        if (invoice.customer_id) {
          customer = await customersApi.get(company.id, invoice.customer_id);
        } else if (invoice.customer_name) {
          const searchResult = await customersApi.list(company.id, {
            page_size: 100,
            search: invoice.customer_name,
          });
          customer = (searchResult.customers || []).find(
            (c: any) =>
              c.name &&
              c.name.toLowerCase().trim() === invoice.customer_name?.toLowerCase().trim()
          );
        }

        if (customer) {
          console.log("[SalesInvoiceView] customer details:", customer);
          setCustomerDetails(customer);

          if (invoice.contact_id) {
            try {
              const resp = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/companies/${company.id}/customers/${customer.id}/contact-persons`,
                {
                  headers: {
                    Authorization: `Bearer ${localStorage.getItem("employee_token") || localStorage.getItem("access_token")}`,
                  },
                }
              );
              if (resp.ok) {
                const contacts = await resp.json();
                console.log("[SalesInvoiceView] contact persons:", contacts);
                const match = contacts.find((c: any) => String(c.id) === String(invoice.contact_id));
                if (match?.name) setContactPersonName(match.name);
              }
            } catch (err) {
              console.error("Failed to load contact persons:", err);
            }
          } else if (customer.contact_person_name || customer.contact_person) {
            setContactPersonName(customer.contact_person_name || customer.contact_person);
          } else if (Array.isArray(customer.contact_persons) && customer.contact_persons.length > 0) {
            const primary = customer.contact_persons.find((c: any) => c.is_primary) || customer.contact_persons[0];
            if (primary?.name) setContactPersonName(primary.name);
          }
        }

        if (invoice.sales_person_id && !invoice.sales_person_name) {
          try {
            const emp = await payrollApi.getEmployee(company.id, invoice.sales_person_id);
            console.log("[SalesInvoiceView] sales person employee:", emp);
            const name =
              emp.full_name ||
              [emp.first_name, emp.last_name].filter(Boolean).join(" ").trim();
            if (name) setSalesPersonName(name);
          } catch (err) {
            console.error("Failed to load sales person:", err);
          }
        }
      } catch (err) {
        console.error("Failed to hydrate invoice lookups:", err);
      }
    };

    hydrateLookups();
  }, [company?.id, invoice]);

  const handleDownloadPdf = async () => {
    if (!company?.id || !invoice) return;
    try {
      const blob = await invoicesApi.downloadPdf(company.id, invoice.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Invoice_${invoice.invoice_number}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      setError(getErrorMessage(err, "Failed to download invoice PDF"));
    }
  };

  if (!company) {
    return (
      <div className="rounded-lg bg-white p-8 text-center shadow-1 dark:bg-gray-dark">
        <p className="text-dark-6">Please select a company first</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="rounded-lg bg-white p-8 text-center shadow-1 dark:bg-gray-dark">
        <p className="text-dark-6">Invoice not found</p>
        <Link href="/sales/sales-list" className="mt-4 inline-block text-primary hover:underline">
          Back to Sales
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/sales/sales-list" className="text-sm text-dark-6 hover:text-primary">
            ← Back to Sales
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-dark dark:text-white">
            Sales Invoice {invoice.invoice_number}
          </h1>
          <p className="text-sm text-dark-6">Created on {formatDate(invoice.created_at)}</p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${getStatusColor(invoice.status)}`}
          >
            {invoice.status.replace("_", " ")}
          </span>
          <button
            onClick={handleDownloadPdf}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-opacity-90"
          >
            Download PDF
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-red-600 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-lg bg-white p-6 shadow-1 dark:bg-gray-dark lg:col-span-2">
          <h2 className="mb-4 text-lg font-semibold text-dark dark:text-white">Customer</h2>
          <div className="space-y-2 text-sm">
            <p className="font-medium text-dark dark:text-white">
              {invoice.customer_name || "Walk-in Customer"}
            </p>
            <p className="text-dark-6">GSTIN: {customerDetails?.gstin || customerDetails?.tax_number || "-"}</p>
            <p className="text-dark-6">Phone: {invoice.customer_phone || "-"}</p>
            <p className="text-dark-6">Place of Supply: {invoice.place_of_supply_name || "-"}</p>
            <p className="text-dark-6">Customer State: {customerDetails?.billing_state || customerDetails?.state || "-"}</p>
            <p className="text-dark-6">Customer State Code: {customerDetails?.billing_state_code || customerDetails?.state_code || "-"}</p>
          </div>
        </div>

        <div className="rounded-lg bg-white p-6 shadow-1 dark:bg-gray-dark">
          <h2 className="mb-4 text-lg font-semibold text-dark dark:text-white">Invoice Info</h2>
          <div className="space-y-2 text-sm">
            <p className="text-dark-6">Invoice Date: {formatDate(invoice.invoice_date)}</p>
            <p className="text-dark-6">Due Date: {formatDate(invoice.due_date)}</p>
            <p className="text-dark-6">Status: {invoice.status.replace("_", " ")}</p>
            <p className="text-dark-6">Reference: {invoice.reference_no || "-"}</p>
            <p className="text-dark-6">Invoice Type: {invoice.invoice_type || "-"}</p>
            <p className="text-dark-6">Voucher Type: {invoice.voucher_type || "-"}</p>
            <p className="text-dark-6">Sales Person: {invoice.sales_person_name || salesPersonName || invoice.sales_person_id || "-"}</p>
            <p className="text-dark-6">Contact Person: {contactPersonName || invoice.contact_id || "-"}</p>
            <p className="text-dark-6">Reverse Charge: {invoice.is_reverse_charge ? "Yes" : "No"}</p>
            <p className="text-dark-6">Place of Supply Code: {invoice.place_of_supply || "-"}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-lg bg-white p-6 shadow-1 dark:bg-gray-dark lg:col-span-2">
          <h2 className="mb-4 text-lg font-semibold text-dark dark:text-white">Shipping & Delivery</h2>
          <div className="grid gap-3 text-sm sm:grid-cols-2">
            <div className="text-dark-6">Shipping Address: {invoice.shipping_address || "-"}</div>
            <div className="text-dark-6">City: {invoice.shipping_city || "-"}</div>
            <div className="text-dark-6">State: {invoice.shipping_state || "-"}</div>
            <div className="text-dark-6">Country: {invoice.shipping_country || "-"}</div>
            <div className="text-dark-6">Zip: {invoice.shipping_zip || "-"}</div>
            <div className="text-dark-6">Delivery Note: {invoice.delivery_note || "-"}</div>
            <div className="text-dark-6">Delivery Note Date: {formatDate(invoice.delivery_note_date)}</div>
            <div className="text-dark-6">Despatch Doc No: {invoice.despatch_doc_no || "-"}</div>
            <div className="text-dark-6">Despatched Through: {invoice.despatched_through || "-"}</div>
            <div className="text-dark-6">Destination: {invoice.destination || "-"}</div>
            <div className="text-dark-6">Terms of Delivery: {invoice.terms_of_delivery || "-"}</div>
          </div>
        </div>

        <div className="rounded-lg bg-white p-6 shadow-1 dark:bg-gray-dark">
          <h2 className="mb-4 text-lg font-semibold text-dark dark:text-white">References</h2>
          <div className="space-y-2 text-sm">
            <p className="text-dark-6">Payment Terms: {invoice.payment_terms || "-"}</p>
            <p className="text-dark-6">Supplier Ref: {invoice.supplier_ref || "-"}</p>
            <p className="text-dark-6">Other References: {invoice.other_references || "-"}</p>
            <p className="text-dark-6">Buyer Order No: {invoice.buyer_order_no || "-"}</p>
            <p className="text-dark-6">Buyer Order Date: {formatDate(invoice.buyer_order_date)}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-lg bg-white p-6 shadow-1 dark:bg-gray-dark lg:col-span-2">
          <h2 className="mb-4 text-lg font-semibold text-dark dark:text-white">Charges & Discounts</h2>
          <div className="grid gap-3 text-sm sm:grid-cols-2">
            <div className="text-dark-6">Freight Charges: {formatCurrency(invoice.freight_charges || 0)}</div>
            <div className="text-dark-6">Packing & Forwarding: {formatCurrency(invoice.packing_forwarding_charges || 0)}</div>
            <div className="text-dark-6">Coupon Code: {invoice.coupon_code || "-"}</div>
            <div className="text-dark-6">Coupon Value: {formatCurrency(invoice.coupon_value || 0)}</div>
            <div className="text-dark-6">Discount On All: {formatCurrency(invoice.discount_on_all || 0)}</div>
            <div className="text-dark-6">Discount Type: {invoice.discount_type || "-"}</div>
            <div className="text-dark-6">Round Off: {formatCurrency(invoice.round_off || 0)}</div>
          </div>
        </div>

        <div className="rounded-lg bg-white p-6 shadow-1 dark:bg-gray-dark">
          <h2 className="mb-4 text-lg font-semibold text-dark dark:text-white">Payment</h2>
          <div className="space-y-2 text-sm">
            <p className="text-dark-6">Payment Type: {invoice.payment_type || "-"}</p>
            <p className="text-dark-6">Payment Account: {invoice.payment_account || "-"}</p>
            <p className="text-dark-6">Payment Note: {invoice.payment_note || "-"}</p>
            <p className="text-dark-6">Adjust Advance: {invoice.adjust_advance_payment ? "Yes" : "No"}</p>
            <p className="text-dark-6">Amount Paid: {formatCurrency(invoice.amount_paid || 0)}</p>
            <p className="text-dark-6">Balance Due: {formatCurrency(invoice.balance_due || 0)}</p>
            <p className="text-dark-6">Outstanding: {formatCurrency(invoice.outstanding_amount || 0)}</p>
          </div>
        </div>
      </div>


      <div className="rounded-lg bg-white p-6 shadow-1 dark:bg-gray-dark">
        <h2 className="mb-4 text-lg font-semibold text-dark dark:text-white">Items</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-stroke dark:border-dark-3 text-left text-sm text-dark-6">
                <th className="py-3 pr-3">Item</th>
                <th className="py-3 pr-3">Item Code</th>
                <th className="py-3 pr-3">Qty</th>
                <th className="py-3 pr-3">Unit Price</th>
                <th className="py-3 pr-3">Discount</th>
                <th className="py-3 pr-3">GST</th>
                <th className="py-3 pr-3">Taxable</th>
                <th className="py-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {(invoice.items || []).map((item) => (
                <tr key={item.id} className="border-b border-stroke dark:border-dark-3 text-sm">
                  <td className="py-3 pr-3">
                    <div className="font-medium text-dark dark:text-white">{item.description}</div>
                    <div className="text-xs text-dark-6">HSN: {item.hsn_code || "-"}</div>
                    <div className="text-xs text-dark-6">
                      CGST: {formatCurrency(item.cgst_amount || 0)} | SGST: {formatCurrency(item.sgst_amount || 0)} | IGST: {formatCurrency(item.igst_amount || 0)} | Cess: {formatCurrency(item.cess_amount || 0)}
                    </div>
                  </td>
                  <td className="py-3 pr-3 text-dark-6">{item.item_code || "-"}</td>
                  <td className="py-3 pr-3 text-dark-6">
                    {item.quantity} {item.unit}
                  </td>
                  <td className="py-3 pr-3 text-dark-6">{formatCurrency(item.unit_price)}</td>
                  <td className="py-3 pr-3 text-dark-6">
                    {item.discount_percent || 0}% ({formatCurrency(item.discount_amount || 0)})
                  </td>
                  <td className="py-3 pr-3 text-dark-6">{item.gst_rate || 0}%</td>
                  <td className="py-3 pr-3 text-dark-6">{formatCurrency(item.taxable_amount || 0)}</td>
                  <td className="py-3 text-right font-medium text-dark dark:text-white">
                    {formatCurrency(item.total_amount)}
                  </td>
                </tr>
              ))}
              {(invoice.items || []).length === 0 && (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-dark-6">
                    No items found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-lg bg-white p-6 shadow-1 dark:bg-gray-dark">
        <div className="ml-auto max-w-md space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-dark-6">Subtotal</span>
            <span className="font-medium text-dark dark:text-white">
              {formatCurrency(invoice.subtotal)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-dark-6">Freight Charges</span>
            <span className="font-medium text-dark dark:text-white">
              {formatCurrency(invoice.freight_charges || 0)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-dark-6">Packing & Forwarding</span>
            <span className="font-medium text-dark dark:text-white">
              {formatCurrency(invoice.packing_forwarding_charges || 0)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-dark-6">Discount</span>
            <span className="font-medium text-dark dark:text-white">
              {formatCurrency(invoice.discount_amount || 0)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-dark-6">Total Tax</span>
            <span className="font-medium text-dark dark:text-white">
              {formatCurrency(invoice.total_tax)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-dark-6">Round Off</span>
            <span className="font-medium text-dark dark:text-white">
              {formatCurrency(invoice.round_off || 0)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-dark-6">Total Amount</span>
            <span className="font-semibold text-dark dark:text-white">
              {formatCurrency(invoice.total_amount)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-dark-6">Amount Paid</span>
            <span className="font-medium text-green-600">
              {formatCurrency(invoice.amount_paid)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-dark-6">Balance Due</span>
            <span className="font-medium text-red-600">
              {formatCurrency(invoice.balance_due)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
