"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { invoicesApi, customersApi, Customer } from "@/services/api";
import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { saveAs } from "file-saver";
import { addPdfPageNumbers, getProfessionalTableTheme } from "@/utils/pdfTheme";
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
  RefreshCw,
  Hash,
  MapPin,
  Globe,
  Shield,
  TrendingUp,
  Package,
  Receipt,
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

// Print component for sales invoices - Matching products pattern
const PrintView = ({
  invoices,
  visibleColumns,
  formatCurrency,
  formatDate,
  getStatusText,
  getCustomerDisplayName,
  getCustomerGSTIN,
  calculateSubtotal,
  companyName,
}: {
  invoices: Invoice[];
  visibleColumns: Record<string, boolean>;
  formatCurrency: (amount: number) => string;
  formatDate: (dateString: Date | string | null | undefined) => string;
  getStatusText: (status: InvoiceStatus) => string;
  getCustomerDisplayName: (invoice: Invoice) => string;
  getCustomerGSTIN: (invoice: Invoice) => string;
  calculateSubtotal: (invoice: Invoice) => number;
  companyName: string;
}) => {
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (printRef.current) {
      const printContents = printRef.current.innerHTML;
      const originalContents = document.body.innerHTML;

      document.body.innerHTML = printContents;
      window.print();
      document.body.innerHTML = originalContents;
      window.location.reload();
    }
  }, []);

  return (
    <div style={{ display: 'none' }}>
      <div ref={printRef} style={{ fontFamily: 'Arial, sans-serif', padding: '20px' }}>
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '5px' }}>
            Sales Invoices List
          </h1>
          <p style={{ fontSize: '14px', color: '#666' }}>{companyName}</p>
          <p style={{ color: '#666', fontSize: '14px' }}>
            Generated on: {new Date().toLocaleDateString('en-IN')}
          </p>
        </div>

        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          border: '1px solid #ddd'
        }}>
          <thead>
            <tr style={{
              backgroundColor: '#f3f4f6',
              borderBottom: '2px solid #ddd'
            }}>
              <th style={{
                padding: '12px',
                textAlign: 'left',
                borderRight: '1px solid #ddd',
                fontWeight: 'bold'
              }}>
                S.No
              </th>
              {visibleColumns.invoiceDate && (
                <th style={{
                  padding: '12px',
                  textAlign: 'left',
                  borderRight: '1px solid #ddd',
                  fontWeight: 'bold'
                }}>
                  Sales Date
                </th>
              )}
              {visibleColumns.dueDate && (
                <th style={{
                  padding: '12px',
                  textAlign: 'left',
                  borderRight: '1px solid #ddd',
                  fontWeight: 'bold'
                }}>
                  Due Date
                </th>
              )}
              {visibleColumns.invoiceNumber && (
                <th style={{
                  padding: '12px',
                  textAlign: 'left',
                  borderRight: '1px solid #ddd',
                  fontWeight: 'bold'
                }}>
                  Invoice No.
                </th>
              )}
              {visibleColumns.referenceNo && (
                <th style={{
                  padding: '12px',
                  textAlign: 'left',
                  borderRight: '1px solid #ddd',
                  fontWeight: 'bold'
                }}>
                  Reference No.
                </th>
              )}
              {visibleColumns.customerName && (
                <th style={{
                  padding: '12px',
                  textAlign: 'left',
                  borderRight: '1px solid #ddd',
                  fontWeight: 'bold'
                }}>
                  Customer Name
                </th>
              )}
              {visibleColumns.subtotal && (
                <th style={{
                  padding: '12px',
                  textAlign: 'left',
                  borderRight: '1px solid #ddd',
                  fontWeight: 'bold'
                }}>
                  Subtotal
                </th>
              )}
              {visibleColumns.total && (
                <th style={{
                  padding: '12px',
                  textAlign: 'left',
                  borderRight: '1px solid #ddd',
                  fontWeight: 'bold'
                }}>
                  Total
                </th>
              )}
              {visibleColumns.paidAmount && (
                <th style={{
                  padding: '12px',
                  textAlign: 'left',
                  borderRight: '1px solid #ddd',
                  fontWeight: 'bold'
                }}>
                  Paid
                </th>
              )}
              {visibleColumns.status && (
                <th style={{
                  padding: '12px',
                  textAlign: 'left',
                  fontWeight: 'bold'
                }}>
                  Status
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {invoices.map((invoice, index) => (
              <tr key={invoice.id} style={{
                borderBottom: '1px solid #ddd',
                backgroundColor: index % 2 === 0 ? '#fff' : '#f9f9f9'
              }}>
                <td style={{
                  padding: '12px',
                  borderRight: '1px solid #ddd'
                }}>
                  {index + 1}
                </td>
                {visibleColumns.invoiceDate && (
                  <td style={{
                    padding: '12px',
                    borderRight: '1px solid #ddd'
                  }}>
                    {formatDate(invoice.invoice_date)}
                  </td>
                )}
                {visibleColumns.dueDate && (
                  <td style={{
                    padding: '12px',
                    borderRight: '1px solid #ddd'
                  }}>
                    {formatDate(invoice.due_date) || '-'}
                  </td>
                )}
                {visibleColumns.invoiceNumber && (
                  <td style={{
                    padding: '12px',
                    borderRight: '1px solid #ddd'
                  }}>
                    <div>
                      <strong>{invoice.invoice_number || 'N/A'}</strong>
                      {invoice.voucher_type === 'sales_return' && (
                        <div style={{ fontSize: '11px', color: '#dc2626', marginTop: '2px' }}>
                          Sales Return
                        </div>
                      )}
                      {invoice.irn && (
                        <div style={{ fontSize: '11px', color: '#059669', marginTop: '2px' }}>
                          E-Invoice
                        </div>
                      )}
                    </div>
                  </td>
                )}
                {visibleColumns.referenceNo && (
                  <td style={{
                    padding: '12px',
                    borderRight: '1px solid #ddd'
                  }}>
                    {invoice.reference_no || '-'}
                  </td>
                )}
                {visibleColumns.customerName && (
                  <td style={{
                    padding: '12px',
                    borderRight: '1px solid #ddd'
                  }}>
                    <div>
                      <strong>{getCustomerDisplayName(invoice)}</strong>
                      {getCustomerGSTIN(invoice) && (
                        <div style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>
                          GSTIN: {getCustomerGSTIN(invoice)}
                        </div>
                      )}
                    </div>
                  </td>
                )}
                {visibleColumns.subtotal && (
                  <td style={{
                    padding: '12px',
                    borderRight: '1px solid #ddd',
                    fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif'
                  }}>
                    {formatCurrency(calculateSubtotal(invoice))}
                  </td>
                )}
                {visibleColumns.total && (
                  <td style={{
                    padding: '12px',
                    borderRight: '1px solid #ddd',
                    fontWeight: 'bold'
                  }}>
                    {formatCurrency(invoice.total_amount || 0)}
                  </td>
                )}
                {visibleColumns.paidAmount && (
                  <td style={{
                    padding: '12px',
                    borderRight: '1px solid #ddd',
                    color: invoice.amount_paid > 0 ? '#059669' : '#666'
                  }}>
                    {formatCurrency(invoice.amount_paid || 0)}
                  </td>
                )}
                {visibleColumns.status && (
                  <td style={{ padding: '12px' }}>
                    <span style={{
                      display: 'inline-block',
                      padding: '4px 8px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      backgroundColor: invoice.status === 'paid' ? '#d1fae5' :
                        invoice.status === 'pending' ? '#fef3c7' :
                          invoice.status === 'partially_paid' ? '#dbeafe' :
                            invoice.status === 'cancelled' ? '#fee2e2' :
                              '#f3f4f6',
                      color: invoice.status === 'paid' ? '#065f46' :
                        invoice.status === 'pending' ? '#92400e' :
                          invoice.status === 'partially_paid' ? '#1e40af' :
                            invoice.status === 'cancelled' ? '#991b1b' :
                              '#374151'
                    }}>
                      {getStatusText(invoice.status)}
                    </span>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{
          marginTop: '30px',
          paddingTop: '20px',
          borderTop: '1px solid #ddd',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ fontSize: '12px', color: '#666' }}>
            Total Invoices: {invoices.length}
          </div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            Page 1 of 1
          </div>
        </div>
      </div>
    </div>
  );
};

// Invoice Status Types based on your Enum
type InvoiceStatus = 'draft' | 'pending' | 'partially_paid' | 'paid' | 'cancelled';
type InvoiceVoucher = 'sales' | 'sales_return' | 'purchase' | 'purchase_return';

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
  // Some API responses may omit this field
  outstanding_amount?: number;

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
  reference_no?: string;
}

export default function SalesListPage() {
  const router = useRouter();
  const { company } = useAuth();
  const [data, setData] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Filters state
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [customerFilter, setCustomerFilter] = useState<string>("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  
  // UI state
  const [showFilters, setShowFilters] = useState(false);
  const [showColumnDropdown, setShowColumnDropdown] = useState(false);
  const [activeActionMenu, setActiveActionMenu] = useState<string | null>(null);
  const [showPrintView, setShowPrintView] = useState(false);
  const [invoicesToPrint, setInvoicesToPrint] = useState<Invoice[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  
  // Export loading states
  const [copyLoading, setCopyLoading] = useState(false);
  const [excelLoading, setExcelLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [csvLoading, setCsvLoading] = useState(false);
  const [printLoading, setPrintLoading] = useState(false);
  
  // Summary data
  const [summary, setSummary] = useState({
    total_amount: 0,
    total_paid: 0,
    total_pending: 0,
    total_invoices: 0
  });
  
  // Column visibility - matching products pattern
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

  const companyId = company?.id || (typeof window !== "undefined" ? localStorage.getItem("company_id") : null);

  useEffect(() => {
    if (companyId) {
      fetchInvoices();
    }
  }, [companyId, currentPage, search, statusFilter, customerFilter, fromDate, toDate]);

  useEffect(() => {
    if (companyId) {
      fetchCustomers();
    }
  }, [companyId]);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      if (!company?.id) {
        setLoading(false);
        return;
      }

      const result: InvoiceResponse = await invoicesApi.list(company.id, {
        page: currentPage,
        page_size: pageSize,
        search: search || undefined,
        status: statusFilter || undefined,
        customer_id: customerFilter || undefined,
        from_date: fromDate || undefined,
        to_date: toDate || undefined
      });

      setData(result.invoices || []);
      setSummary({
        total_amount: result.total_amount || 0,
        total_paid: result.total_paid || 0,
        total_pending: result.total_pending || 0,
        total_invoices: result.total || 0
      });
      setError("");
    } catch (err) {
      setError("Failed to load sales invoices");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      if (!company?.id) return;
      const pageSize = 100;
      let pageNum = 1;
      let allCustomers: Customer[] = [];
      while (true) {
        const result = await customersApi.list(company.id, {
          page: pageNum,
          page_size: pageSize,
        });
        const batch = result?.customers || [];
        allCustomers = allCustomers.concat(batch);
        if (batch.length < pageSize) break;
        pageNum += 1;
      }
      setCustomers(allCustomers);
    } catch (error) {
      console.error("Failed to fetch customers:", error);
    }
  };

  const fetchAllInvoicesForExport = async (): Promise<Invoice[]> => {
    try {
      if (!company?.id) return [];

      const pageSize = 100;
      let pageNum = 1;
      let allInvoices: Invoice[] = [];
      while (true) {
        const result: InvoiceResponse = await invoicesApi.list(company.id, {
          page: pageNum,
          page_size: pageSize,
          search: search || undefined,
          status: statusFilter || undefined,
          customer_id: customerFilter || undefined,
          from_date: fromDate || undefined,
          to_date: toDate || undefined
        });
        const batch = (result?.invoices || []) as Invoice[];
        allInvoices = allInvoices.concat(batch);
        if (batch.length < pageSize) break;
        pageNum += 1;
      }

      return allInvoices;
    } catch (error) {
      console.error("Export fetch failed:", error);
      return [];
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
  };

  const handleReset = () => {
    setSearch("");
    setStatusFilter("");
    setCustomerFilter("");
    setFromDate("");
    setToDate("");
    setCurrentPage(1);
  };

  const getStatusColor = (status: InvoiceStatus) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'pending': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'partially_paid': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'cancelled': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      case 'draft': return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400';
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
    };
    return statusMap[status] || 'Unknown';
  };

  const filteredInvoices = data || [];
  const totalPages = Math.max(1, Math.ceil(summary.total_invoices / pageSize));

  // Helper functions
  const calculateSubtotal = (invoice: Invoice): number => {
    return invoice.subtotal || 0;
  };

  const calculateTax = (invoice: Invoice): number => {
    return (invoice.cgst_amount || 0) +
      (invoice.sgst_amount || 0) +
      (invoice.igst_amount || 0) +
      (invoice.cess_amount || 0);
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

  const getDaysOverdue = (dueDate?: string): number => {
    if (!dueDate) return 0;
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = today.getTime() - due.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  const getOverdueStatus = (invoice: Invoice): string => {
    if (invoice.status === 'paid' || invoice.status === 'cancelled') return '';
    if (invoice.due_date) {
      const overdueDays = getDaysOverdue(invoice.due_date);
      if (overdueDays > 0) {
        return `Overdue by ${overdueDays} day${overdueDays !== 1 ? 's' : ''}`;
      }
    }
    return '';
  };

  // Export functions - matching products pattern
  const copyToClipboard = async () => {
    if (copyLoading) return;
    setCopyLoading(true);
    try {
      const allInvoices = await fetchAllInvoicesForExport();
      
      const headers: string[] = ["S.No"];
      const rows = allInvoices.map((invoice, index) => {
        const row: string[] = [(index + 1).toString()];

        if (visibleColumns.invoiceDate) {
          if (!headers.includes("Sales Date")) headers.push("Sales Date");
          row.push(formatDate(invoice.invoice_date));
        }

        if (visibleColumns.dueDate) {
          if (!headers.includes("Due Date")) headers.push("Due Date");
          row.push(formatDate(invoice.due_date) || "-");
        }

        if (visibleColumns.invoiceNumber) {
          if (!headers.includes("Invoice No.")) headers.push("Invoice No.");
          row.push(invoice.invoice_number || "N/A");
        }

        if (visibleColumns.referenceNo) {
          if (!headers.includes("Reference No.")) headers.push("Reference No.");
          row.push(invoice.reference_no || "-");
        }

        if (visibleColumns.customerName) {
          if (!headers.includes("Customer Name")) headers.push("Customer Name");
          row.push(getCustomerDisplayName(invoice));
        }

        if (visibleColumns.subtotal) {
          if (!headers.includes("Subtotal")) headers.push("Subtotal");
          row.push(formatCurrency(calculateSubtotal(invoice)).replace('₹', 'Rs. '));
        }

        if (visibleColumns.total) {
          if (!headers.includes("Total")) headers.push("Total");
          row.push(formatCurrency(invoice.total_amount || 0).replace('₹', 'Rs. '));
        }

        if (visibleColumns.paidAmount) {
          if (!headers.includes("Paid")) headers.push("Paid");
          row.push(formatCurrency(invoice.amount_paid || 0).replace('₹', 'Rs. '));
        }

        if (visibleColumns.status) {
          if (!headers.includes("Status")) headers.push("Status");
          row.push(getStatusText(invoice.status));
        }

        return row;
      });

      // Add S.No to headers
      headers.unshift("S.No");
      
      const text = [headers.join("\t"), ...rows.map(r => r.join("\t"))].join("\n");
      await navigator.clipboard.writeText(text);
      alert("Sales data copied to clipboard");
    } catch (error) {
      console.error("Copy failed:", error);
      alert("Failed to copy data. Please try again.");
    } finally {
      setCopyLoading(false);
    }
  };

  const exportExcel = async () => {
    if (excelLoading) return;
    setExcelLoading(true);
    try {
      const allInvoices = await fetchAllInvoicesForExport();
      
      const exportData = allInvoices.map((invoice, index) => {
        const row: Record<string, any> = {
          "S.No": index + 1,
        };

        if (visibleColumns.invoiceDate) {
          row["Sales Date"] = formatDate(invoice.invoice_date);
        }

        if (visibleColumns.dueDate) {
          row["Due Date"] = formatDate(invoice.due_date);
        }

        if (visibleColumns.invoiceNumber) {
          row["Invoice Number"] = invoice.invoice_number;
          row["Voucher Type"] = invoice.voucher_type === 'sales_return' ? 'Sales Return' : 'Sales';
          row["E-Invoice"] = invoice.irn ? "Yes" : "No";
        }

        if (visibleColumns.referenceNo) {
          row["Reference No"] = invoice.reference_no || '';
        }

        if (visibleColumns.customerName) {
          row["Customer Name"] = getCustomerDisplayName(invoice);
          row["Customer GSTIN"] = getCustomerGSTIN(invoice);
          row["Customer Phone"] = getCustomerPhone(invoice);
        }

        if (visibleColumns.subtotal) {
          row["Subtotal"] = calculateSubtotal(invoice);
        }

        if (visibleColumns.total) {
          row["Total"] = invoice.total_amount || 0;
          row["Tax Amount"] = calculateTax(invoice);
        }

        if (visibleColumns.paidAmount) {
          row["Paid"] = invoice.amount_paid || 0;
          row["Balance Due"] = invoice.balance_due || 0;
        }

        if (visibleColumns.status) {
          row["Status"] = getStatusText(invoice.status);
          row["Overdue Days"] = getDaysOverdue(invoice.due_date);
        }

        row["Company"] = company?.name || "";
        row["Reverse Charge"] = invoice.is_reverse_charge ? "Yes" : "No";
        
        return row;
      });

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Sales Invoices");
      XLSX.writeFile(wb, "sales-invoices.xlsx");
    } catch (error) {
      console.error("Excel export failed:", error);
      alert("Failed to export Excel. Please try again.");
    } finally {
      setExcelLoading(false);
    }
  };

  const exportPDF = async () => {
    if (pdfLoading) return;
    setPdfLoading(true);
    try {
      const allInvoices = await fetchAllInvoicesForExport();
      
      const doc = new jsPDF("landscape");
      
      const headers: string[] = ["S.No"];
      const body = allInvoices.map((invoice, index) => {
        const row: string[] = [(index + 1).toString()];

        if (visibleColumns.invoiceDate) {
          if (!headers.includes("Sales Date")) headers.push("Sales Date");
          row.push(formatDate(invoice.invoice_date));
        }

        if (visibleColumns.dueDate) {
          if (!headers.includes("Due Date")) headers.push("Due Date");
          row.push(formatDate(invoice.due_date) || "-");
        }

        if (visibleColumns.invoiceNumber) {
          if (!headers.includes("Invoice No.")) headers.push("Invoice No.");
          row.push(invoice.invoice_number || "N/A");
        }

        if (visibleColumns.referenceNo) {
          if (!headers.includes("Reference No.")) headers.push("Reference No.");
          row.push(invoice.reference_no || "-");
        }

        if (visibleColumns.customerName) {
          if (!headers.includes("Customer Name")) headers.push("Customer Name");
          row.push(getCustomerDisplayName(invoice));
        }

        if (visibleColumns.subtotal) {
          if (!headers.includes("Subtotal")) headers.push("Subtotal");
          row.push(`Rs. ${new Intl.NumberFormat("en-IN", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }).format(calculateSubtotal(invoice))}`);
        }

        if (visibleColumns.total) {
          if (!headers.includes("Total")) headers.push("Total");
          row.push(`Rs. ${new Intl.NumberFormat("en-IN", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }).format(invoice.total_amount || 0)}`);
        }

        if (visibleColumns.paidAmount) {
          if (!headers.includes("Paid")) headers.push("Paid");
          row.push(`Rs. ${new Intl.NumberFormat("en-IN", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }).format(invoice.amount_paid || 0)}`);
        }

        if (visibleColumns.status) {
          if (!headers.includes("Status")) headers.push("Status");
          row.push(getStatusText(invoice.status));
        }

        return row;
      });

      autoTable(doc, {
        ...getProfessionalTableTheme(doc, "Sales Invoices List", company?.name || "", "l"),
        head: [headers],
        body: body,
        styles: {
          fontSize: 9,
          cellPadding: 3,
          overflow: "linebreak",
          font: "helvetica",
        },
      });

      addPdfPageNumbers(doc, "l");
      doc.save("sales-invoices.pdf");
    } catch (error) {
      console.error("PDF export failed:", error);
      alert("Failed to export PDF. Please try again.");
    } finally {
      setPdfLoading(false);
    }
  };

  const exportCSV = async () => {
    if (csvLoading) return;
    setCsvLoading(true);
    try {
      const allInvoices = await fetchAllInvoicesForExport();
      
      const exportData = allInvoices.map((invoice, index) => {
        const row: Record<string, any> = {
          "S.No": index + 1,
        };

        if (visibleColumns.invoiceDate) {
          row["Sales Date"] = formatDate(invoice.invoice_date);
        }

        if (visibleColumns.dueDate) {
          row["Due Date"] = formatDate(invoice.due_date);
        }

        if (visibleColumns.invoiceNumber) {
          row["Invoice Number"] = invoice.invoice_number;
        }

        if (visibleColumns.referenceNo) {
          row["Reference No"] = invoice.reference_no || '';
        }

        if (visibleColumns.customerName) {
          row["Customer Name"] = getCustomerDisplayName(invoice);
        }

        if (visibleColumns.subtotal) {
          row["Subtotal"] = calculateSubtotal(invoice);
        }

        if (visibleColumns.total) {
          row["Total"] = invoice.total_amount || 0;
        }

        if (visibleColumns.paidAmount) {
          row["Paid"] = invoice.amount_paid || 0;
        }

        if (visibleColumns.status) {
          row["Status"] = getStatusText(invoice.status);
        }

        return row;
      });

      const ws = XLSX.utils.json_to_sheet(exportData);
      const csv = XLSX.utils.sheet_to_csv(ws);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      saveAs(blob, "sales-invoices.csv");
    } catch (error) {
      console.error("CSV export failed:", error);
      alert("Failed to export CSV. Please try again.");
    } finally {
      setCsvLoading(false);
    }
  };

  const handlePrint = async () => {
    if (printLoading) return;
    setPrintLoading(true);
    try {
      const allInvoices = await fetchAllInvoicesForExport();
      setInvoicesToPrint(allInvoices);
      setShowPrintView(true);
    } catch (error) {
      console.error("Print failed:", error);
      alert("Failed to prepare print view. Please try again.");
    } finally {
      setPrintLoading(false);
    }
  };

  const toggleColumn = (key: keyof typeof visibleColumns) => {
    setVisibleColumns(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleDelete = async (invoiceId: string, invoiceNumber: string) => {
    if (window.confirm(`Are you sure you want to cancel invoice "${invoiceNumber}"? This action cannot be undone.`)) {
      try {
        if (company?.id) {
      await invoicesApi.cancel(company.id, invoiceId, 'Cancelled by user');
          fetchInvoices();
        }
      } catch (error) {
        console.error("Error cancelling invoice:", error);
        alert("Failed to cancel invoice");
      }
    }
  };

  const handlePrintInvoice = async (invoiceId: string) => {
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

  if (!companyId) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 dark:bg-yellow-900/20 dark:border-yellow-800">
          <p className="text-yellow-800 dark:text-yellow-400">Please select a company first.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {showPrintView && (
        <PrintView
          invoices={invoicesToPrint}
          visibleColumns={visibleColumns}
          formatCurrency={formatCurrency}
          formatDate={formatDate}
          getStatusText={getStatusText}
          getCustomerDisplayName={getCustomerDisplayName}
          getCustomerGSTIN={getCustomerGSTIN}
          calculateSubtotal={calculateSubtotal}
          companyName={company?.name || ''}
        />
      )}

      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Sales Invoices
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Manage your sales invoices • Track payments and outstanding amounts
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
      <div className="px-6 py-6 bg-gray-50 dark:bg-gray-900">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
          {/* Total Invoices */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {summary.total_invoices}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Total Invoices
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
                <Receipt className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </div>

          {/* Total Sales Amount */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-blue-600">
                  {formatCurrency(summary.total_amount)}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Total Sales
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>

          {/* Total Paid */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(summary.total_paid)}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Total Paid
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </div>

          {/* Total Pending */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-red-600">
                  {formatCurrency(summary.total_pending)}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Total Pending
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters Section */}
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
                onKeyPress={(e) => e.key === 'Enter' && handleSearch(e)}
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

            <button
              onClick={copyToClipboard}
              disabled={copyLoading}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {copyLoading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-transparent"></div>
              ) : (
                <Copy className="w-5 h-5" />
              )}
              Copy
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
                  {Object.entries(visibleColumns)
                    .filter(([key]) => key !== 'actions')
                    .map(([key, value]) => (
                    <label key={key} className="flex items-center gap-2 text-sm mb-2 last:mb-0 cursor-pointer text-gray-700 dark:text-gray-300">
                      <input
                        type="checkbox"
                        checked={value}
                        onChange={() => toggleColumn(key as keyof typeof visibleColumns)}
                        className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="capitalize">
                        {key === 'invoiceDate' ? 'Sales Date' : 
                         key === 'dueDate' ? 'Due Date' : 
                         key === 'invoiceNumber' ? 'Invoice No.' : 
                         key === 'referenceNo' ? 'Reference No.' : 
                         key === 'customerName' ? 'Customer Name' : 
                         key === 'paidAmount' ? 'Paid Amount' : 
                         key.charAt(0).toUpperCase() + key.slice(1)}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={exportExcel}
              disabled={excelLoading}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {excelLoading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-transparent"></div>
              ) : (
                <>
                  <FileText className="w-5 h-5" />
                  Excel
                </>
              )}
            </button>

            <button
              onClick={exportPDF}
              disabled={pdfLoading}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {pdfLoading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-transparent"></div>
              ) : (
                <>
                  <Download className="w-5 h-5" />
                  PDF
                </>
              )}
            </button>

            <button
              onClick={exportCSV}
              disabled={csvLoading}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {csvLoading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-transparent"></div>
              ) : (
                <>
                  <FileText className="w-5 h-5" />
                  CSV
                </>
              )}
            </button>

            <button
              onClick={handlePrint}
              disabled={printLoading}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {printLoading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-transparent"></div>
              ) : (
                <>
                  <Printer className="w-5 h-5" />
                  Print
                </>
              )}
            </button>

            <button
              onClick={handleReset}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors flex items-center gap-2"
            >
              <RefreshCw className="w-5 h-5" />
              Reset
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Status</option>
                <option value="draft">Draft</option>
                <option value="pending">Pending</option>
                <option value="partially_paid">Partially Paid</option>
                <option value="paid">Paid</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            {/* Customer Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Customer
              </label>
                <select
                  value={customerFilter}
                  onChange={(e) => setCustomerFilter(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">All Customers</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name}
                    </option>
                  ))}
                </select>
            </div>

            {/* From Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                From Date
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* To Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                To Date
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="mx-6 mt-4 bg-red-50 border border-red-200 rounded-lg p-4 dark:bg-red-900/20 dark:border-red-800">
          <p className="text-red-800 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-200 dark:bg-gray-700/50">
              <tr className="text-sm font-semibold text-gray-600 dark:text-gray-300">
                <th className="text-left px-6 py-3 whitespace-nowrap w-20">
                  S.No
                </th>
                {visibleColumns.invoiceDate && (
                  <th className="text-left px-6 py-3 whitespace-nowrap w-32">
                    Sales Date
                  </th>
                )}
                {visibleColumns.dueDate && (
                  <th className="text-left px-6 py-3 whitespace-nowrap w-40">
                    Due Date
                  </th>
                )}
                {visibleColumns.invoiceNumber && (
                  <th className="text-left px-6 py-3 whitespace-nowrap w-48">
                    Invoice No.
                  </th>
                )}
                {visibleColumns.referenceNo && (
                  <th className="text-left px-6 py-3 whitespace-nowrap w-40">
                    Reference No.
                  </th>
                )}
                {visibleColumns.customerName && (
                  <th className="text-left px-6 py-3 whitespace-nowrap w-80">
                    Customer Name
                  </th>
                )}
                {visibleColumns.subtotal && (
                  <th className="text-left px-6 py-3 whitespace-nowrap w-40">
                    Subtotal
                  </th>
                )}
                {visibleColumns.total && (
                  <th className="text-left px-6 py-3 whitespace-nowrap w-48">
                    Total
                  </th>
                )}
                {visibleColumns.paidAmount && (
                  <th className="text-left px-6 py-3 whitespace-nowrap w-48">
                    Paid
                  </th>
                )}
                {visibleColumns.status && (
                  <th className="text-left px-6 py-3 whitespace-nowrap w-40">
                    Status
                  </th>
                )}
                {visibleColumns.actions && (
                  <th className="text-right px-6 py-3 whitespace-nowrap w-40">
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
              ) : filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={Object.values(visibleColumns).filter(Boolean).length} className="px-6 py-8 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <ShoppingBag className="w-12 h-12 text-gray-400 mb-2" />
                      <p className="text-lg font-medium text-gray-900 dark:text-white mb-1">
                        No sales invoices found
                      </p>
                      <p className="text-gray-500 dark:text-gray-400 mb-4">
                        {statusFilter || search || fromDate || toDate ?
                          "No invoices found matching your filters. Try adjusting your search criteria." :
                          "Add your first sale to start managing your invoices."}
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
                filteredInvoices.map((invoice, index) => {
                  const overdueDays = getDaysOverdue(invoice.due_date);
                  const isOverdue = overdueDays > 0 && invoice.status !== 'paid' && invoice.status !== 'cancelled';
                  const taxAmount = calculateTax(invoice);

                  return (
                    <tr
                      key={invoice.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-gray-700 dark:text-gray-300">
                        {(currentPage - 1) * pageSize + index + 1}
                      </td>
                      {visibleColumns.invoiceDate && (
                        <td className="px-6 py-4 whitespace-nowrap text-gray-700 dark:text-gray-300">
                          {formatDate(invoice.invoice_date)}
                        </td>
                      )}
                      {visibleColumns.dueDate && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-col gap-1">
                            <span className={`${isOverdue ? 'text-red-600 font-medium' : 'text-gray-700 dark:text-gray-300'}`}>
                              {formatDate(invoice.due_date) || '-'}
                            </span>
                            {isOverdue && (
                              <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                                Overdue by {overdueDays} day{overdueDays !== 1 ? 's' : ''}
                              </span>
                            )}
                          </div>
                        </td>
                      )}
                      {visibleColumns.invoiceNumber && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="min-w-0 max-w-[240px]">
                            <div className="font-medium text-blue-600 dark:text-blue-400">
                              <Link href={`/sales/${invoice.id}`} className="hover:underline">
                                {invoice.invoice_number || 'N/A'}
                              </Link>
                            </div>
                            {invoice.voucher_type === 'sales_return' && (
                              <div className="text-xs text-red-600 mt-1">Sales Return</div>
                            )}
                            {invoice.irn && (
                              <div className="text-xs text-green-600 mt-1">E-Invoice</div>
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
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="min-w-0 max-w-[240px]">
                            <div className="font-medium text-gray-900 dark:text-white">
                              {getCustomerDisplayName(invoice)}
                            </div>
                            {getCustomerGSTIN(invoice) && (
                              <div className="text-xs text-gray-500 dark:text-gray-400 truncate mt-1">
                                GSTIN: {getCustomerGSTIN(invoice)}
                              </div>
                            )}
                            {getCustomerPhone(invoice) && (
                              <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                {getCustomerPhone(invoice)}
                              </div>
                            )}
                          </div>
                        </td>
                      )}
                      {visibleColumns.subtotal && (
                        <td className="px-6 py-4 whitespace-nowrap text-gray-700 dark:text-gray-300">
                          {formatCurrency(calculateSubtotal(invoice))}
                        </td>
                      )}
                      {visibleColumns.total && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-bold text-gray-900 dark:text-white">
                            {formatCurrency(invoice.total_amount || 0)}
                          </div>
                          {taxAmount > 0 && (
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              Tax: {formatCurrency(taxAmount)}
                            </div>
                          )}
                        </td>
                      )}
                      {visibleColumns.paidAmount && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className={`font-bold ${invoice.amount_paid > 0 ? 'text-green-600' : 'text-gray-700 dark:text-gray-300'}`}>
                            {formatCurrency(invoice.amount_paid || 0)}
                          </div>
                          {invoice.balance_due > 0 && (
                            <div className="text-xs font-medium text-red-600 mt-1">
                              Due: {formatCurrency(invoice.balance_due)}
                            </div>
                          )}
                        </td>
                      )}
                      {visibleColumns.status && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(invoice.status)}`}
                          >
                            {getStatusText(invoice.status)}
                          </span>
                          {invoice.is_reverse_charge && (
                            <div className="text-xs text-orange-600 mt-1">Reverse Charge</div>
                          )}
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
                              className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-50 dark:hover:text-gray-300 dark:hover:bg-gray-700/50 transition-all duration-200"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>

                            {activeActionMenu === invoice.id && (
                              <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg shadow-xl py-1 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                                <Link
                                  href={`/sales/${invoice.id}`}
                                  onClick={() => setActiveActionMenu(null)}
                                  className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                                >
                                  <Eye className="w-4 h-4 text-gray-400" />
                                  <span>View Details</span>
                                </Link>

                                {invoice.status === 'draft' && (
                                  <Link
                                    href={`/sales/${invoice.id}/edit`}
                                    onClick={() => setActiveActionMenu(null)}
                                    className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                                  >
                                    <Edit className="w-4 h-4 text-gray-400" />
                                    <span>Edit</span>
                                  </Link>
                                )}

                                <button
                                  onClick={() => handlePrintInvoice(invoice.id)}
                                  className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                                >
                                  <Printer className="w-4 h-4 text-gray-400" />
                                  <span>Print PDF</span>
                                </button>

                                <div className="my-1 border-t border-gray-100 dark:border-gray-700"></div>
                                <button
                                  onClick={() => {
                                    handleDelete(invoice.id, invoice.invoice_number);
                                    setActiveActionMenu(null);
                                  }}
                                  className="flex w-full items-center gap-3 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  <span>Cancel Invoice</span>
                                </button>
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
          </table>
        </div>
      </div>

      {!loading && filteredInvoices.length > 0 && (
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, summary.total_invoices)} of {summary.total_invoices}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 text-sm text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Previous
            </button>
            <div className="text-sm text-gray-700 dark:text-gray-300">
              Page {currentPage} of {totalPages}
            </div>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 text-sm text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
