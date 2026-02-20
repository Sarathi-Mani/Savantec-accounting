"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { companiesApi, employeesApi, proformaInvoicesApi } from "@/services/api";

type ProformaItem = {
  id: string;
  item_code?: string;
  description: string;
  hsn_code?: string;
  quantity: number;
  unit: string;
  unit_price: number;
  discount_percent?: number;
  discount_amount?: number;
  gst_rate?: number;
  taxable_amount?: number;
  total_amount?: number;
};

type ProformaInvoice = {
  id: string;
  invoice_number: string;
  proforma_date: string;
  due_date?: string;
  customer_id?: string;
  customer_name?: string;
  reference_no?: string;
  reference_date?: string;
  sales_person_id?: string;
  contact_id?: string;
  bank_account_id?: string;
  notes?: string;
  terms?: string;
  freight_charges?: number;
  pf_charges?: number;
  round_off?: number;
  subtotal?: number;
  total_tax?: number;
  total_amount?: number;
  delivery_note?: string;
  supplier_ref?: string;
  other_references?: string;
  buyer_order_no?: string;
  buyer_order_date?: string;
  despatch_doc_no?: string;
  delivery_note_date?: string;
  despatched_through?: string;
  destination?: string;
  terms_of_delivery?: string;
  items?: ProformaItem[];
};

type ContactPerson = {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  designation?: string;
};

const formatCurrency = (amount?: number) => {
  const safe = Number(amount || 0);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(safe);
};

const formatDate = (value?: string) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export default function ProformaInvoiceViewPage() {
  const { company } = useAuth();
  const params = useParams();
  const router = useRouter();
  const proformaId = params.id as string;

  const [invoice, setInvoice] = useState<ProformaInvoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [employees, setEmployees] = useState<any[]>([]);
  const [salesEngineers, setSalesEngineers] = useState<any[]>([]);
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [contactPersons, setContactPersons] = useState<ContactPerson[]>([]);

  useEffect(() => {
    const fetchInvoice = async () => {
      if (!company?.id || !proformaId) return;
      setLoading(true);
      try {
        const data = await proformaInvoicesApi.get(company.id, proformaId);
        setInvoice(data);
      } catch (error) {
        console.error("Failed to fetch proforma invoice:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchInvoice();
  }, [company?.id, proformaId]);

  useEffect(() => {
    const loadLookups = async () => {
      if (!company?.id) return;
      try {
        const [employeesData, bankAccountsData] = await Promise.all([
          employeesApi.list(company.id),
          companiesApi.listBankAccounts(company.id),
        ]);
        setEmployees(employeesData || []);
        setBankAccounts(bankAccountsData || []);
      } catch (error) {
        console.error("Failed to load lookup data:", error);
      }
    };

    loadLookups();
  }, [company?.id]);

  useEffect(() => {
    const loadSalesEngineers = async () => {
      if (!company?.id) return;
      try {
        const token = localStorage.getItem("employee_token") || localStorage.getItem("access_token");
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/companies/${company.id}/sales-engineers`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        let engineers: any[] = [];
        if (Array.isArray(data)) {
          engineers = data;
        } else if (data && typeof data === "object") {
          engineers = data.sales_engineers || data.data || data.items || [];
        }
        setSalesEngineers(engineers || []);
      } catch (error) {
        console.warn("Failed to load sales engineers:", error);
        setSalesEngineers([]);
      }
    };

    loadSalesEngineers();
  }, [company?.id]);

  useEffect(() => {
    const loadBankAccountById = async () => {
      if (!company?.id || !invoice?.bank_account_id) return;
      const existing = bankAccounts.find((bank) => bank.id === invoice.bank_account_id);
      if (existing) return;
      try {
        const account = await companiesApi.getBankAccount(company.id, invoice.bank_account_id);
        if (account) {
          setBankAccounts((prev) => [...prev, account]);
        }
      } catch (error) {
        console.warn("Failed to load bank account by id:", error);
      }
    };

    loadBankAccountById();
  }, [company?.id, invoice?.bank_account_id, bankAccounts]);

  useEffect(() => {
    const fetchContactPersons = async () => {
      if (!company?.id || !invoice?.customer_id) return;
      try {
        const token = localStorage.getItem("employee_token") || localStorage.getItem("access_token");
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/companies/${company.id}/customers/${invoice.customer_id}/contact-persons`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        let persons: ContactPerson[] = [];
        if (Array.isArray(data)) {
          persons = data;
        } else if (data && typeof data === "object") {
          persons = data.contact_persons || data.contacts || data.data || data.items || [];
        }
        setContactPersons(persons || []);
      } catch (error) {
        console.warn("Failed to fetch contact persons:", error);
        setContactPersons([]);
      }
    };

    fetchContactPersons();
  }, [company?.id, invoice?.customer_id]);

  const getEmployeeName = (id?: string) => {
    if (!id) return "-";
    const engineer = salesEngineers.find((emp) => emp.id === id);
    if (engineer) {
      return (
        engineer.full_name ||
        engineer.name ||
        [engineer.first_name, engineer.last_name].filter(Boolean).join(" ") ||
        id
      );
    }
    const employee = employees.find((emp) => emp.id === id);
    if (!employee) return id;
    return employee.full_name || [employee.first_name, employee.last_name].filter(Boolean).join(" ") || id;
  };

  const getBankAccountName = (id?: string) => {
    if (!id) return "-";
    const account = bankAccounts.find((bank) => bank.id === id);
    if (!account) return id;
    const labelParts = [account.bank_name, account.account_number].filter(Boolean);
    return labelParts.join(" - ") || account.account_name || id;
  };

  const getContactPersonName = (id?: string) => {
    if (!id) return "-";
    const person = contactPersons.find((contact) => contact.id === id);
    if (!person) return id;
    return person.name || person.email || person.phone || id;
  };

  const handleDelete = async () => {
    if (!company?.id || !invoice) return;
    if (!confirm("Are you sure you want to delete this proforma invoice?")) return;
    setActionLoading("delete");
    try {
      await proformaInvoicesApi.delete(company.id, invoice.id);
      router.push("/sales/proforma-invoices");
    } catch (error) {
      console.error("Failed to delete proforma invoice:", error);
      alert("Failed to delete proforma invoice");
    } finally {
      setActionLoading(null);
    }
  };

  const handleConvert = async () => {
    if (!invoice) return;
    if (!confirm("Open this proforma invoice in Sales (prefill)?")) return;
    router.push(`/sales/new?fromProforma=${invoice.id}`);
  };

  const handlePdf = async () => {
    if (!company?.id || !invoice) return;
    setActionLoading("pdf");
    try {
      const blob = await proformaInvoicesApi.downloadPDF(company.id, invoice.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Proforma_${invoice.invoice_number}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Failed to download PDF:", error);
      alert("Failed to download PDF");
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 dark:bg-gray-dark">
        <div className="rounded-lg bg-white p-6 shadow-1 dark:bg-gray-dark">
          <div className="flex items-center gap-3 text-sm text-dark-6 dark:text-gray-400">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            Loading proforma invoice...
          </div>
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 dark:bg-gray-dark">
        <div className="rounded-lg bg-white p-6 shadow-1 dark:bg-gray-dark">
          <p className="text-red-600 dark:text-red-400">Proforma invoice not found.</p>
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
              <Link href="/sales/proforma-invoices" className="ml-1 text-dark-6 hover:text-primary dark:text-gray-400 dark:hover:text-white md:ml-2">
                Proforma Invoice List
              </Link>
            </div>
          </li>
          <li aria-current="page">
            <div className="flex items-center">
              <svg className="h-4 w-4 text-dark-6 dark:text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
              <span className="ml-1 font-medium text-dark dark:text-white md:ml-2">
                Proforma {invoice.invoice_number}
              </span>
            </div>
          </li>
        </ol>
      </nav>

      <div className="rounded-2xl bg-white p-6 shadow-1 dark:bg-gray-dark md:p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-sm text-dark-6">Proforma Invoice</div>
            <h1 className="text-2xl font-bold text-dark dark:text-white">
              {invoice.invoice_number}
            </h1>
            <div className="mt-1 text-sm text-dark-6">
              Created on {formatDate(invoice.proforma_date)}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/sales/proforma-invoices/${invoice.id}/edit`}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white"
            >
              Edit
            </Link>
            <button
              onClick={handleConvert}
              disabled={actionLoading === "convert"}
              className="rounded-lg border border-stroke px-4 py-2 text-sm font-medium text-dark transition hover:bg-gray-50 disabled:opacity-50 dark:border-dark-3 dark:text-white dark:hover:bg-dark-2"
            >
              Convert to Invoice
            </button>
            <button
              onClick={handlePdf}
              disabled={actionLoading === "pdf"}
              className="rounded-lg border border-stroke px-4 py-2 text-sm font-medium text-dark transition hover:bg-gray-50 disabled:opacity-50 dark:border-dark-3 dark:text-white dark:hover:bg-dark-2"
            >
              PDF
            </button>
            <button
              onClick={handleDelete}
              disabled={actionLoading === "delete"}
              className="rounded-lg border border-red-500 px-4 py-2 text-sm font-medium text-red-500 transition hover:bg-red-50 disabled:opacity-50 dark:hover:bg-red-900/20"
            >
              Delete
            </button>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="rounded-xl border border-stroke p-4 dark:border-dark-3">
            <h2 className="mb-3 text-sm font-semibold text-dark dark:text-white">Customer</h2>
            <div className="space-y-2 text-sm text-dark-6">
              <div className="text-base font-semibold text-dark dark:text-white">
                {invoice.customer_name || "Walk-in Customer"}
              </div>
              <div>Reference: {invoice.reference_no || "-"}</div>
              <div>Reference Date: {formatDate(invoice.reference_date)}</div>
            </div>
          </div>
          <div className="rounded-xl border border-stroke p-4 dark:border-dark-3">
            <h2 className="mb-3 text-sm font-semibold text-dark dark:text-white">Proforma Details</h2>
            <div className="space-y-2 text-sm text-dark-6">
              <div>Proforma Date: {formatDate(invoice.proforma_date)}</div>
              <div>Due Date: {formatDate(invoice.due_date)}</div>
              <div>Sales Person: {getEmployeeName(invoice.sales_person_id)}</div>
              <div>Contact: {getContactPersonName(invoice.contact_id)}</div>
              <div>Bank Account: {getBankAccountName(invoice.bank_account_id)}</div>
            </div>
          </div>
          <div className="rounded-xl border border-stroke p-4 dark:border-dark-3">
            <h2 className="mb-3 text-sm font-semibold text-dark dark:text-white">Totals</h2>
            <div className="space-y-2 text-sm text-dark-6">
              <div>Subtotal: {formatCurrency(invoice.subtotal)}</div>
              <div>Tax: {formatCurrency(invoice.total_tax)}</div>
              <div>Freight: {formatCurrency(invoice.freight_charges)}</div>
              <div>P &amp; F Charges: {formatCurrency(invoice.pf_charges)}</div>
              <div>Round Off: {formatCurrency(invoice.round_off)}</div>
              <div className="text-base font-semibold text-dark dark:text-white">
                Total: {formatCurrency(invoice.total_amount)}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-stroke p-4 dark:border-dark-3">
            <h2 className="mb-3 text-sm font-semibold text-dark dark:text-white">References</h2>
            <div className="space-y-2 text-sm text-dark-6">
              <div>Delivery Note: {invoice.delivery_note || "-"}</div>
              <div>Supplier Ref: {invoice.supplier_ref || "-"}</div>
              <div>Other References: {invoice.other_references || "-"}</div>
              <div>Buyer Order No: {invoice.buyer_order_no || "-"}</div>
              <div>Buyer Order Date: {formatDate(invoice.buyer_order_date)}</div>
              <div>Despatch Doc No: {invoice.despatch_doc_no || "-"}</div>
              <div>Delivery Note Date: {formatDate(invoice.delivery_note_date)}</div>
            </div>
          </div>
          <div className="rounded-xl border border-stroke p-4 dark:border-dark-3">
            <h2 className="mb-3 text-sm font-semibold text-dark dark:text-white">Delivery</h2>
            <div className="space-y-2 text-sm text-dark-6">
              <div>Despatched Through: {invoice.despatched_through || "-"}</div>
              <div>Destination: {invoice.destination || "-"}</div>
              <div>Terms of Delivery: {invoice.terms_of_delivery || "-"}</div>
            </div>
          </div>
        </div>

        <div className="mt-6 overflow-hidden rounded-lg border border-stroke dark:border-dark-3">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-stroke bg-gray-50 dark:border-dark-3 dark:bg-dark-2">
                  <th className="px-4 py-3 text-left text-sm font-medium text-dark dark:text-white">#</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-dark dark:text-white">Item Code</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-dark dark:text-white">Description</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-dark dark:text-white">HSN</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-dark dark:text-white">Qty</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-dark dark:text-white">Unit</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-dark dark:text-white">Rate</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-dark dark:text-white">Disc%</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-dark dark:text-white">Disc Amt</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-dark dark:text-white">GST%</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-dark dark:text-white">Taxable</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-dark dark:text-white">Total</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items?.map((item, index) => (
                  <tr key={item.id} className="border-b border-stroke dark:border-dark-3">
                    <td className="px-4 py-3 text-dark-6">{index + 1}</td>
                    <td className="px-4 py-3 text-dark-6">{item.item_code || "-"}</td>
                    <td className="px-4 py-3 text-dark dark:text-white">{item.description}</td>
                    <td className="px-4 py-3 text-dark-6">{item.hsn_code || "-"}</td>
                    <td className="px-4 py-3 text-right text-dark dark:text-white">{item.quantity}</td>
                    <td className="px-4 py-3 text-right text-dark-6">{item.unit || "-"}</td>
                    <td className="px-4 py-3 text-right text-dark dark:text-white">
                      {formatCurrency(item.unit_price)}
                    </td>
                    <td className="px-4 py-3 text-right text-dark-6">{item.discount_percent ?? 0}</td>
                    <td className="px-4 py-3 text-right text-dark dark:text-white">
                      {formatCurrency(item.discount_amount)}
                    </td>
                    <td className="px-4 py-3 text-right text-dark-6">{item.gst_rate || 0}</td>
                    <td className="px-4 py-3 text-right text-dark dark:text-white">
                      {formatCurrency(item.taxable_amount)}
                    </td>
                    <td className="px-4 py-3 text-right text-dark dark:text-white">
                      {formatCurrency(item.total_amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {(invoice.notes || invoice.terms) && (
          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
            {invoice.notes && (
              <div className="rounded-xl border border-stroke p-4 dark:border-dark-3">
                <h2 className="mb-2 text-sm font-semibold text-dark dark:text-white">Notes</h2>
                <p className="text-sm text-dark-6">{invoice.notes}</p>
              </div>
            )}
            {invoice.terms && (
              <div className="rounded-xl border border-stroke p-4 dark:border-dark-3">
                <h2 className="mb-2 text-sm font-semibold text-dark dark:text-white">Terms</h2>
                <p className="text-sm text-dark-6 whitespace-pre-wrap">{invoice.terms}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
