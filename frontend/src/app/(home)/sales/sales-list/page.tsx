"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { invoicesApi } from "@/services/api";
import Link from "next/link";
import { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { saveAs } from "file-saver";
import {
  Search,
  Filter,
  Download,
  Plus,
  FileText,
  Calendar,
  DollarSign,
  CreditCard,
  AlertCircle,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  Printer,
  Clock,
  CheckCircle,
  XCircle,
  ShoppingBag,
  Users,
  Copy,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

// Local formatter functions
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

const formatDate = (dateString: Date | string | null | undefined): string => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

const formatDateTime = (dateString: Date | string | null | undefined): string => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
};

// Invoice Status Types based on your Enum
type InvoiceStatus = 'draft' | 'pending' | 'partially_paid' | 'paid' | 'cancelled' | 'refunded' | 'void' | 'write_off';
type InvoiceVoucher = 'sales' | 'sales_return' | 'purchase' | 'purchase_return';

interface Customer {
  id: string;
  name: string;
  gstin?: string;
  contact?: string;
  mobile?: string;
  email?: string;
  state?: string;
  state_code?: string;
}

interface InvoiceItem {
  id: string;
  product_id: string;
  description: string;
  hsn_code: string;
  quantity: number;
  unit: string;
  unit_price: number;
  discount_percent: number;
  discount_amount: number;
  gst_rate: number;
  cgst_rate: number;
  sgst_rate: number;
  igst_rate: number;
  cgst_amount: number;
  sgst_amount: number;
  igst_amount: number;
  cess_amount: number;
  taxable_amount: number;
  total_amount: number;
  warehouse_allocation?: any[];
  stock_reserved: boolean;
  stock_reduced: boolean;
  created_at: string;
}

interface Invoice {
  id: string;
  company_id: string;
  customer_id?: string;
  sales_ticket_id?: string;
  contact_id?: string;

  // Invoice identification
  invoice_number: string;
  invoice_date: string;
  due_date?: string;
  voucher_type: InvoiceVoucher;

  // Customer details
  customer_name?: string;
  customer_gstin?: string;
  customer_phone?: string;
  customer_state?: string;
  customer_state_code?: string;

  // Reference information
  reference_no?: string;
  buyer_order_no?: string;
  buyer_order_date?: string;
  despatch_doc_no?: string;
  delivery_note?: string;
  delivery_note_date?: string;
  despatched_through?: string;
  destination?: string;
  terms_of_delivery?: string;

  // Shipping information
  shipping_address?: string;
  shipping_city?: string;
  shipping_state?: string;
  shipping_country?: string;
  shipping_zip?: string;

  // Payment terms
  payment_terms?: string;
  supplier_ref?: string;
  other_references?: string;

  // Charges
  freight_charges: number;
  packing_forwarding_charges: number;

  // Discounts and coupons
  coupon_code?: string;
  coupon_value: number;
  discount_on_all: number;
  discount_type: string;
  discount_amount: number;

  // Amounts
  subtotal: number;
  cgst_amount: number;
  sgst_amount: number;
  igst_amount: number;
  cess_amount: number;
  total_tax: number;
  total_amount: number;
  round_off: number;

  // Payment tracking
  amount_paid: number;
  balance_due: number;
  outstanding_amount: number;

  // Payment details
  payment_type?: string;
  payment_account?: string;
  payment_note?: string;
  adjust_advance_payment: boolean;

  // Status
  status: InvoiceStatus;

  // GST Information
  invoice_type?: string;
  place_of_supply?: string;
  place_of_supply_name?: string;
  is_reverse_charge: boolean;

  // Payment links
  payment_link?: string;
  upi_qr_data?: string;

  // Notes
  notes?: string;
  terms?: string;

  // E-Invoice fields
  irn?: string;
  ack_number?: string;
  ack_date?: string;
  signed_qr?: string;
  pdf_url?: string;

  // Sales person
  sales_person_id?: string;

  // Timestamps
  created_at: string;
  updated_at: string;

  // Relationships (expanded if needed)
  items?: InvoiceItem[];
  customer?: Customer;
}

interface InvoiceResponse {
  invoices: Invoice[];
  total: number;
  page: number;
  page_size: number;
  total_amount: number;
  total_paid: number;
  total_pending: number;
  total_invoices: number;
  reference_no?: string;
}

export default function SalesListPage() {
  const router = useRouter();
  const { company } = useAuth();
  const [data, setData] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [customerFilter, setCustomerFilter] = useState<string>("");
  const [totalRecords, setTotalRecords] = useState(0);
  const [summary, setSummary] = useState({
    total_amount: 0,
    total_paid: 0,
    total_pending: 0,
    total_invoices: 0
  });
  const [showFilters, setShowFilters] = useState(false);
  const [showColumnDropdown, setShowColumnDropdown] = useState(false);
  const [activeActionMenu, setActiveActionMenu] = useState<string | null>(null);

  // Column visibility state
  const [visibleColumns, setVisibleColumns] = useState({
    invoiceDate: true,
    dueDate: true,
    invoiceNumber: true,
    referenceNo: true,
    customerName: true,
    subtotal: true,
    total: true,
    paidAmount: true,
    status: true,
    actions: true,
  });

  const pageSize = 10;

  const fetchInvoices = async () => {
    if (!company?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const result: InvoiceResponse = await invoicesApi.list(company.id, {
        page,
        page_size: pageSize,
        search: search || undefined,
        status: statusFilter || undefined,
        customer_id: customerFilter || undefined,
        from_date: fromDate || undefined,
        to_date: toDate || undefined
      });

      setData(result.invoices || []);
      setTotalRecords(result.total || 0);
      setSummary({
        total_amount: result.total_amount || 0,
        total_paid: result.total_paid || 0,
        total_pending: result.total_pending || 0,
        total_invoices: result.total_invoices || 0
      });
    } catch (error) {
      console.error("Failed to fetch invoices:", error);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [company?.id, page, search, statusFilter, customerFilter, fromDate, toDate]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.action-dropdown-container')) {
        setActiveActionMenu(null);
      }
      if (!target.closest('.column-dropdown-container')) {
        setShowColumnDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Export functions
  const copyToClipboard = async () => {
    const filtered = data;
    const headers = [
      "Sales Date", "Due Date", "Invoice No.", "Reference No.",
      "Customer Name", "Subtotal", "Total", "Paid", "Status"
    ];

    const rows = filtered.map(invoice => [
      formatDate(invoice.invoice_date),
      formatDate(invoice.due_date),
      invoice.invoice_number,
      invoice.reference_no || '-',
      getCustomerDisplayName(invoice),
      formatCurrency(calculateSubtotal(invoice)),
      formatCurrency(invoice.total_amount || 0),
      formatCurrency(invoice.amount_paid || 0),
      getStatusText(invoice.status)
    ]);

    const text = [headers.join("\t"), ...rows.map(r => r.join("\t"))].join("\n");

    await navigator.clipboard.writeText(text);
    alert("Sales data copied to clipboard");
  };

  const exportExcel = () => {
    const filtered = data;
    const exportData = filtered.map(invoice => ({
      "Sales Date": formatDate(invoice.invoice_date),
      "Due Date": formatDate(invoice.due_date),
      "Invoice Number": invoice.invoice_number,
      "Reference No": invoice.reference_no || '-',
      "Customer Name": getCustomerDisplayName(invoice),
      "Customer GSTIN": getCustomerGSTIN(invoice),
      "Subtotal": calculateSubtotal(invoice),
      "Total": invoice.total_amount || 0,
      "Paid": invoice.amount_paid || 0,
      "Balance Due": invoice.balance_due || 0,
      "Status": getStatusText(invoice.status),
      "Payment Status": getPaymentStatus(invoice),
      "Overdue": getDaysOverdue(invoice.due_date) > 0 ? "Yes" : "No",
      "E-Invoice": invoice.irn ? "Yes" : "No"
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sales Invoices");
    XLSX.writeFile(wb, "sales-invoices.xlsx");
  };

  const exportPDF = () => {
    const filtered = data;
    const doc = new jsPDF();

    autoTable(doc, {
      head: [["Sales Date", "Due Date", "Invoice No.", "Customer Name", "Total", "Paid", "Status"]],
      body: filtered.map(invoice => [
        formatDate(invoice.invoice_date),
        formatDate(invoice.due_date),
        invoice.invoice_number,
        getCustomerDisplayName(invoice),
        formatCurrency(invoice.total_amount || 0),
        formatCurrency(invoice.amount_paid || 0),
        getStatusText(invoice.status)
      ])
    });

    doc.save("sales-invoices.pdf");
  };

  const exportCSV = () => {
    const filtered = data;
    const exportData = filtered.map(invoice => ({
      "Sales Date": formatDate(invoice.invoice_date),
      "Due Date": formatDate(invoice.due_date),
      "Invoice Number": invoice.invoice_number,
      "Reference No": invoice.reference_no || '-',
      "Customer Name": getCustomerDisplayName(invoice),
      "Subtotal": calculateSubtotal(invoice),
      "Total": invoice.total_amount || 0,
      "Paid": invoice.amount_paid || 0,
      "Status": getStatusText(invoice.status)
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    saveAs(blob, "sales-invoices.csv");
  };

  const toggleColumn = (key: keyof typeof visibleColumns) => {
    setVisibleColumns(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const getStatusColor = (status: InvoiceStatus) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'pending': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'partially_paid': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'cancelled': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      case 'draft': return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400';
      case 'refunded': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
      case 'void': return 'bg-gray-200 text-gray-800 dark:bg-gray-800/30 dark:text-gray-300';
      case 'write_off': return 'bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-300';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  const getStatusText = (status: InvoiceStatus) => {
    const statusMap: Record<InvoiceStatus, string> = {
      'draft': 'Draft',
      'pending': 'Pending',
      'partially_paid': 'Partially Paid',
      'paid': 'Paid',
      'cancelled': 'Cancelled',
      'refunded': 'Refunded',
      'void': 'Void',
      'write_off': 'Write Off'
    };
    return statusMap[status] || 'Unknown';
  };

  const getStatusBadge = (status: InvoiceStatus) => {
    const text = getStatusText(status);
    const colorClass = getStatusColor(status);

    let icon = null;
    switch (status) {
      case 'paid':
        icon = <CheckCircle className="w-3 h-3 mr-1" />;
        break;
      case 'pending':
        icon = <Clock className="w-3 h-3 mr-1" />;
        break;
      case 'cancelled':
        icon = <XCircle className="w-3 h-3 mr-1" />;
        break;
      case 'partially_paid':
        icon = <AlertCircle className="w-3 h-3 mr-1" />;
        break;
    }

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClass}`}>
        {icon}
        {text}
      </span>
    );
  };

  const getPaymentStatus = (invoice: Invoice): string => {
    return invoice.status;
  };

  const calculateSubtotal = (invoice: Invoice): number => {
    return invoice.subtotal || 0;
  };

  const calculateTax = (invoice: Invoice): number => {
    return (invoice.cgst_amount || 0) +
      (invoice.sgst_amount || 0) +
      (invoice.igst_amount || 0) +
      (invoice.cess_amount || 0);
  };

  const handlePrint = async (invoiceId: string) => {
    if (!company?.id) return;

    try {
      const response = await invoicesApi.downloadPdf(company.id, invoiceId);
      const blob = new Blob([response], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (error) {
      console.error("Failed to download PDF:", error);
      alert("Failed to generate PDF. Please try again.");
    }
  };

  const handleSearch = () => {
    setPage(1);
    fetchInvoices();
  };

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("");
    setCustomerFilter("");
    setFromDate("");
    setToDate("");
    setPage(1);
  };

  const getDaysOverdue = (dueDate?: string): number => {
    if (!dueDate) return 0;
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = today.getTime() - due.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  const getOverdueStatus = (invoice: Invoice): string => {
    const paymentStatus = getPaymentStatus(invoice);
    if (paymentStatus === 'paid' || paymentStatus === 'cancelled') return '';

    if (invoice.due_date) {
      const overdueDays = getDaysOverdue(invoice.due_date);
      if (overdueDays > 0) {
        return `Overdue by ${overdueDays} day${overdueDays !== 1 ? 's' : ''}`;
      }
    }
    return '';
  };

  const handleQuickAction = async (action: string, invoiceId: string) => {
    if (!company?.id) return;

    try {
      switch (action) {
        case 'finalize':
          await invoicesApi.finalize(company.id, invoiceId);
          break;
        case 'cancel':
          await invoicesApi.cancel(company.id, invoiceId, { reason: 'Cancelled by user' });
          break;
        case 'mark_paid':
          await invoicesApi.markPaid(company.id, invoiceId);
          break;
        case 'void':
          await invoicesApi.void(company.id, invoiceId, { reason: 'Voided by user' });
          break;
        case 'refund':
          await invoicesApi.refund(company.id, invoiceId, { reason: 'Refunded by user' });
          break;
      }
      fetchInvoices();
      setActiveActionMenu(null);
    } catch (error) {
      console.error(`Failed to ${action} invoice:`, error);
      alert(`Failed to ${action} invoice. Please try again.`);
    }
  };

  const getCustomerDisplayName = (invoice: Invoice): string => {
    return invoice.customer_name || invoice.customer?.name || 'Walk-in Customer';
  };

  const getCustomerGSTIN = (invoice: Invoice): string => {
    return invoice.customer_gstin || invoice.customer?.gstin || '';
  };

  const getCustomerPhone = (invoice: Invoice): string => {
    return invoice.customer_phone || invoice.customer?.contact || invoice.customer?.mobile || '';
  };

  const getTotalPages = () => {
    return Math.ceil(totalRecords / pageSize);
  };

  // Unique customers for filter
  const uniqueCustomers = Array.from(new Set(data
    .map(invoice => getCustomerDisplayName(invoice))
    .filter(name => name !== 'Walk-in Customer')));

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Sales List
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Manage and track all your sales invoices
            </p>
          </div>
          <button
            onClick={() => router.push('/sales/new')}
            className="px-4 py-2 transition bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            New Sale
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="px-6 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
          {/* Total Invoices */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {summary.total_invoices.toLocaleString()}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Total Invoices
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
                <FileText className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </div>

          {/* Total Sales Amount */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatCurrency(summary.total_amount)}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Total Sales Amount
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>

          {/* Total Paid Amount */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(summary.total_paid)}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Total Paid Amount
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </div>

          {/* Total Pending Amount */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-red-600">
                  {formatCurrency(summary.total_pending)}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Total Pending Amount
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="px-6 py-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search invoices, customers, reference no..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors flex items-center gap-2"
            >
              <Filter className="w-5 h-5" />
              Filters
            </button>

            <div className="relative column-dropdown-container">
              <button
                onClick={() => setShowColumnDropdown(!showColumnDropdown)}
                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors flex items-center gap-2"
              >
                Columns
                {showColumnDropdown ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {showColumnDropdown && (
                <div className="absolute right-0 mt-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-3 z-10 min-w-[150px]">
                  {Object.entries(visibleColumns).map(([key, value]) => (
                    <label key={key} className="flex items-center gap-2 text-sm mb-2 last:mb-0 cursor-pointer text-gray-700 dark:text-gray-300">
                      <input
                        type="checkbox"
                        checked={value}
                        onChange={() => toggleColumn(key as keyof typeof visibleColumns)}
                        className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={copyToClipboard}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors flex items-center gap-2"
            >
              <Copy className="w-5 h-5" />
              Copy
            </button>

            <button
              onClick={exportExcel}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors flex items-center gap-2"
            >
              Excel
            </button>

            <button
              onClick={exportPDF}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors flex items-center gap-2"
            >
              PDF
            </button>

            <button
              onClick={exportCSV}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors flex items-center gap-2"
            >
              CSV
            </button>

            <button className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors flex items-center gap-2">
              <Printer className="w-5 h-5" />
              Print
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex flex-wrap gap-4">
            {/* Status Dropdown */}
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Status</option>
              <option value="draft">Draft</option>
              <option value="pending">Pending</option>
              <option value="partially_paid">Partially Paid</option>
              <option value="paid">Paid</option>
              <option value="cancelled">Cancelled</option>
              <option value="refunded">Refunded</option>
              <option value="void">Void</option>
              <option value="write_off">Write Off</option>
            </select>

            {/* Customer Dropdown */}
            <select
              value={customerFilter}
              onChange={(e) => {
                setCustomerFilter(e.target.value);
                setPage(1);
              }}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Customers</option>
              {uniqueCustomers.map((customer) => (
                <option key={customer} value={customer}>
                  {customer}
                </option>
              ))}
            </select>

            {/* From Date */}
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="date"
                value={fromDate}
                onChange={(e) => {
                  setFromDate(e.target.value);
                  setPage(1);
                }}
                className="pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="From Date"
              />
            </div>

            {/* To Date */}
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="date"
                value={toDate}
                onChange={(e) => {
                  setToDate(e.target.value);
                  setPage(1);
                }}
                className="pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="To Date"
              />
            </div>

            <button
              onClick={clearFilters}
              className="text-sm text-blue-600 hover:underline dark:text-blue-400"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="p-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="w-full">
            <table className="w-full table-fixed">
              <div className="overflow-x-auto">
                <thead className="bg-gray-200 dark:bg-gray-700/50">
                  <tr className="text-sm font-semibold text-gray-600 dark:text-gray-300">
                    {visibleColumns.invoiceDate && (
                      <th className="text-left px-6 py-3 whitespace-nowrap">
                        Sales Date
                      </th>
                    )}
                    {visibleColumns.dueDate && (
                      <th className="text-left px-6 py-3 whitespace-nowrap">
                        Due Date
                      </th>
                    )}
                    {visibleColumns.invoiceNumber && (
                      <th className="text-left px-6 py-3 whitespace-nowrap">
                        Invoice No.
                      </th>
                    )}
                    {visibleColumns.referenceNo && (
                      <th className="text-left px-6 py-3 whitespace-nowrap">
                        Reference No.
                      </th>
                    )}
                    {visibleColumns.customerName && (
                      <th className="text-left px-6 py-3 whitespace-nowrap min-w-[200px]">
                        Customer Name
                      </th>
                    )}
                    {visibleColumns.subtotal && (
                      <th className="text-left px-6 py-3 whitespace-nowrap">
                        Subtotal
                      </th>
                    )}
                    {visibleColumns.total && (
                      <th className="text-left px-6 py-3 whitespace-nowrap">
                        Total
                      </th>
                    )}
                    {visibleColumns.paidAmount && (
                      <th className="text-left px-6 py-3 whitespace-nowrap">
                        Paid
                      </th>
                    )}
                    {visibleColumns.status && (
                      <th className="text-left px-6 py-3 whitespace-nowrap">
                        Status
                      </th>
                    )}
                    {visibleColumns.actions && (
                      <th className="text-right px-6 py-3 whitespace-nowrap">
                        Actions
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700 text-sm text-gray-700 dark:text-gray-300">
                  {loading ? (
                    <tr>
                      <td colSpan={Object.values(visibleColumns).filter(Boolean).length} className="px-6 py-8 text-center">
                        <div className="flex items-center justify-center">
                          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
                        </div>
                      </td>
                    </tr>
                  ) : !company ? (
                    <tr>
                      <td colSpan={Object.values(visibleColumns).filter(Boolean).length} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                        No company selected
                      </td>
                    </tr>
                  ) : data.length === 0 ? (
                    <tr>
                      <td colSpan={Object.values(visibleColumns).filter(Boolean).length} className="px-6 py-8 text-center">
                        <div className="flex flex-col items-center justify-center">
                          <ShoppingBag className="w-12 h-12 text-gray-400 mb-2" />
                          <p className="text-lg font-medium text-gray-900 dark:text-white mb-1">
                            No sales invoices found
                          </p>
                          <p className="text-gray-500 dark:text-gray-400 mb-4">
                            Try adjusting your filters or add a new sale
                          </p>
                          <button
                            onClick={() => router.push('/sales/new')}
                            className="text-blue-600 hover:underline dark:text-blue-400"
                          >
                            Create your first sale
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    data.map((invoice) => {
                      const paymentStatus = getPaymentStatus(invoice);
                      const subtotal = calculateSubtotal(invoice);
                      const taxAmount = calculateTax(invoice);
                      const overdueStatus = getOverdueStatus(invoice);
                      const isOverdue = getDaysOverdue(invoice.due_date) > 0;

                      return (
                        <tr
                          key={invoice.id}
                          className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                        >
                          {visibleColumns.invoiceDate && (
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-gray-700 dark:text-gray-300">
                                {formatDate(invoice.invoice_date)}
                              </div>
                            </td>
                          )}
                          {visibleColumns.dueDate && (
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex flex-col gap-1">
                                <span className={`${isOverdue ? 'text-red-600 font-medium' : 'text-gray-700 dark:text-gray-300'}`}>
                                  {formatDate(invoice.due_date) || '-'}
                                </span>
                                {overdueStatus && (
                                  <span className="inline-flex w-fit items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 whitespace-nowrap">
                                    {overdueStatus}
                                  </span>
                                )}
                              </div>
                            </td>
                          )}
                          {visibleColumns.invoiceNumber && (
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex flex-col">
                                <Link
                                  href={`/sales/${invoice.id}`}
                                  className="font-medium text-blue-600 hover:underline dark:text-blue-400 whitespace-nowrap"
                                >
                                  {invoice.invoice_number || 'N/A'}
                                </Link>
                                {invoice.voucher_type === 'sales_return' && (
                                  <div className="text-xs text-red-600 mt-0.5 whitespace-nowrap">Sales Return</div>
                                )}
                                {invoice.irn && (
                                  <div className="text-xs text-green-600 mt-0.5 whitespace-nowrap">E-Invoice</div>
                                )}
                              </div>
                            </td>
                          )}
                          {visibleColumns.referenceNo && (
                            <td className="px-6 py-4 whitespace-nowrap text-gray-700 dark:text-gray-300">
                              {invoice.reference_no || '-'}
                            </td>
                          )}
                          {visibleColumns.customerName && (
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <Users className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                <div className="min-w-0">
                                  <div className="font-medium text-gray-900 dark:text-white truncate">
                                    {getCustomerDisplayName(invoice)}
                                  </div>
                                  {getCustomerGSTIN(invoice) && (
                                    <div className="text-xs text-gray-500 truncate">GSTIN: {getCustomerGSTIN(invoice)}</div>
                                  )}
                                  {getCustomerPhone(invoice) && (
                                    <div className="text-xs text-gray-500 truncate">{getCustomerPhone(invoice)}</div>
                                  )}
                                </div>
                              </div>
                            </td>
                          )}
                          {visibleColumns.subtotal && (
                            <td className="px-6 py-4 whitespace-nowrap text-gray-700 dark:text-gray-300">
                              {formatCurrency(subtotal)}
                            </td>
                          )}
                          {visibleColumns.total && (
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="font-medium text-gray-900 dark:text-white">
                                {formatCurrency(invoice.total_amount || 0)}
                              </div>
                              {taxAmount > 0 && (
                                <div className="text-xs text-gray-500">
                                  Tax: {formatCurrency(taxAmount)}
                                </div>
                              )}
                            </td>
                          )}
                          {visibleColumns.paidAmount && (
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="font-medium text-green-600">
                                {formatCurrency(invoice.amount_paid || 0)}
                              </div>
                              {invoice.balance_due > 0 && (
                                <div className="text-xs font-medium text-red-600 whitespace-nowrap">
                                  Due: {formatCurrency(invoice.balance_due)}
                                </div>
                              )}
                            </td>
                          )}
                          {visibleColumns.status && (
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex flex-col gap-1">
                                {getStatusBadge(invoice.status)}
                                {invoice.is_reverse_charge && (
                                  <div className="text-xs text-orange-600 whitespace-nowrap">Reverse Charge</div>
                                )}
                              </div>
                            </td>
                          )}
                          {visibleColumns.actions && (
                            <td className="px-6 py-4 text-right whitespace-nowrap">
                              <div className="relative action-dropdown-container inline-block">
                                <button
                                  onClick={() =>
                                    setActiveActionMenu(
                                      activeActionMenu === invoice.id ? null : invoice.id
                                    )
                                  }
                                  className="p-2 rounded-lg text-gray-500 hover:text-gray-700
                            dark:text-gray-400 dark:hover:text-white
                            hover:bg-gray-100 dark:hover:bg-gray-700"
                                >
                                  <MoreVertical className="w-5 h-5" />
                                </button>

                                {activeActionMenu === invoice.id && (
                                  <div
                                    className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800
                              border border-gray-200 dark:border-gray-700
                              rounded-lg shadow-lg z-20"
                                  >
                                    <Link
                                      href={`/sales/${invoice.id}`}
                                      onClick={() => setActiveActionMenu(null)}
                                      className="flex items-center gap-2 px-4 py-2 text-sm
                                text-gray-700 dark:text-gray-300
                                hover:bg-gray-100 dark:hover:bg-gray-700"
                                    >
                                      <Eye className="w-4 h-4" />
                                      View Details
                                    </Link>

                                    {invoice.status === 'draft' && (
                                      <>
                                        <Link
                                          href={`/sales/${invoice.id}/edit`}
                                          onClick={() => setActiveActionMenu(null)}
                                          className="flex items-center gap-2 px-4 py-2 text-sm
                                    text-gray-700 dark:text-gray-300
                                    hover:bg-gray-100 dark:hover:bg-gray-700"
                                        >
                                          <Edit className="w-4 h-4" />
                                          Edit
                                        </Link>
                                        <button
                                          onClick={() => handleQuickAction('finalize', invoice.id)}
                                          className="flex w-full items-center gap-2 px-4 py-2 text-sm
                                    text-gray-700 dark:text-gray-300
                                    hover:bg-gray-100 dark:hover:bg-gray-700"
                                        >
                                          <CheckCircle className="w-4 h-4" />
                                          Finalize
                                        </button>
                                      </>
                                    )}

                                    <button
                                      onClick={() => handlePrint(invoice.id)}
                                      className="flex items-center gap-2 px-4 py-2 text-sm
                                text-gray-700 dark:text-gray-300
                                hover:bg-gray-100 dark:hover:bg-gray-700"
                                    >
                                      <Printer className="w-4 h-4" />
                                      Print PDF
                                    </button>

                                    {invoice.status === 'pending' && (
                                      <button
                                        onClick={() => handleQuickAction('mark_paid', invoice.id)}
                                        className="flex items-center gap-2 px-4 py-2 text-sm
                                  text-green-600 dark:text-green-400
                                  hover:bg-green-50 dark:hover:bg-green-900/30"
                                      >
                                        <CheckCircle className="w-4 h-4" />
                                        Mark as Paid
                                      </button>
                                    )}

                                    {!['cancelled', 'refunded', 'void'].includes(invoice.status) && (
                                      <button
                                        onClick={() => handleQuickAction('cancel', invoice.id)}
                                        className="flex w-full items-center gap-2 px-4 py-2 text-sm
                                  text-red-600 dark:text-red-400
                                  hover:bg-red-50 dark:hover:bg-red-900/30"
                                      >
                                        <XCircle className="w-4 h-4" />
                                        Cancel Invoice
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })
                  )}
                </tbody>
                {data.length > 0 && visibleColumns.total && (
                  <tfoot>
                    <tr className="bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700">
                      <td
                        colSpan={
                          Object.values(visibleColumns).filter(Boolean).length -
                          (visibleColumns.total ? 1 : 0) -
                          (visibleColumns.actions ? 1 : 0)
                        }
                        className="px-6 py-4 text-right font-semibold text-gray-900 dark:text-white whitespace-nowrap"
                      >
                        Total Amount:
                      </td>
                      <td className="px-6 py-4 font-bold text-gray-900 dark:text-white whitespace-nowrap">
                        {formatCurrency(summary.total_amount)}
                      </td>
                      {visibleColumns.actions && (
                        <td></td>
                      )}
                    </tr>
                  </tfoot>
                )}
              </div>
            </table>

          </div>
        </div>

        {/* Pagination - Added similar to purchase list */}
        {data.length > 0 && totalRecords > pageSize && (
          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Showing {(page - 1) * pageSize + 1} to{" "}
              {Math.min(page * pageSize, totalRecords)} of {totalRecords} results
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>

              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page * pageSize >= totalRecords}
                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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