"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { salesReturnsApi, customersApi, Customer } from "@/services/api";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { saveAs } from "file-saver";
import { addPdfPageNumbers } from "@/utils/pdfTheme";
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
  Receipt,
  TrendingUp,
  ArrowLeft,
  ArrowRight,
  Wallet,
  RotateCcw,
  FileDown,
} from "lucide-react";

interface SalesReturnRow {
  id: string;
  invoice_id?: string;
  return_number: string;
  invoice_number?: string;
  customer_name?: string;
  customer_id?: string;
  return_date: string;
  total_amount: number;
  reason: string;
  status: string;
  reference_no?: string;
  amount_paid?: number;
  paid_payment?: number;
  payment_status?: string;
  created_by?: string;
  created_by_name?: string;
  created_at?: string;
  subtotal?: number;
  cgst_amount?: number;
  sgst_amount?: number;
  igst_amount?: number;
  cess_amount?: number;
  round_off?: number;
  freight_charges?: number;
  packing_forwarding_charges?: number;
  items?: SalesReturnItem[];
}

interface SalesReturnItem {
  product_id?: string;
  description?: string;
  quantity?: number;
  unit?: string;
  unit_price?: number;
  discount_percent?: number;
  discount_amount?: number;
  gst_rate?: number;
  cgst_amount?: number;
  sgst_amount?: number;
  igst_amount?: number;
  cess_amount?: number;
  taxable_amount?: number;
  total_amount?: number;
}

interface SalesReturnResponse {
  returns: SalesReturnRow[];
  total: number;
  page: number;
  page_size: number;
  total_amount: number;
  total_paid: number;
  total_pending: number;
}

interface SalesReturnFilters {
  search: string;
  statusFilter: string;
  customerFilter: string;
  fromDate: string;
  toDate: string;
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount || 0);

const formatDate = (dateValue?: string) => {
  if (!dateValue) return "-";
  const d = new Date(dateValue);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const normalizeStatus = (status?: string) => (status || "").trim().toLowerCase();

// Print component for sales returns
const PrintView = ({
  returns,
  visibleColumns,
  formatCurrency,
  formatDate,
  getStatusText,
  companyName,
  onComplete,
}: {
  returns: SalesReturnRow[];
  visibleColumns: Record<string, boolean>;
  formatCurrency: (amount: number) => string;
  formatDate: (dateValue?: string) => string;
  getStatusText: (status?: string) => string;
  companyName: string;
  onComplete: () => void;
}) => {
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (printRef.current) {
      const printContents = printRef.current.innerHTML;
      const printWindow = window.open("", "_blank", "width=1024,height=768");

      if (!printWindow) {
        onComplete();
        return;
      }

      printWindow.document.open();
      printWindow.document.write("<html><head><title>Print</title></head><body></body></html>");
      printWindow.document.close();

      if (printWindow.document.body) {
        printWindow.document.body.innerHTML = printContents;
      }

      printWindow.focus();
      printWindow.print();
      printWindow.close();
      onComplete();
    }
  }, []);

  return (
    <div style={{ display: 'none' }}>
      <div ref={printRef} style={{ fontFamily: 'Arial, sans-serif', padding: '20px' }}>
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '5px' }}>
            Sales Returns List
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
              {visibleColumns.returnDate && (
                <th style={{
                  padding: '12px',
                  textAlign: 'left',
                  borderRight: '1px solid #ddd',
                  fontWeight: 'bold'
                }}>
                  Return Date
                </th>
              )}
              {visibleColumns.invoiceNumber && (
                <th style={{
                  padding: '12px',
                  textAlign: 'left',
                  borderRight: '1px solid #ddd',
                  fontWeight: 'bold'
                }}>
                  Sales Code
                </th>
              )}
              {visibleColumns.returnNumber && (
                <th style={{
                  padding: '12px',
                  textAlign: 'left',
                  borderRight: '1px solid #ddd',
                  fontWeight: 'bold'
                }}>
                  Return Code
                </th>
              )}
              {visibleColumns.status && (
                <th style={{
                  padding: '12px',
                  textAlign: 'left',
                  borderRight: '1px solid #ddd',
                  fontWeight: 'bold'
                }}>
                  Return Status
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
              {visibleColumns.totalAmount && (
                <th style={{
                  padding: '12px',
                  textAlign: 'left',
                  borderRight: '1px solid #ddd',
                  fontWeight: 'bold'
                }}>
                  Total
                </th>
              )}
              {visibleColumns.paidPayment && (
                <th style={{
                  padding: '12px',
                  textAlign: 'left',
                  borderRight: '1px solid #ddd',
                  fontWeight: 'bold'
                }}>
                  Paid Payment
                </th>
              )}
              {visibleColumns.paymentStatus && (
                <th style={{
                  padding: '12px',
                  textAlign: 'left',
                  borderRight: '1px solid #ddd',
                  fontWeight: 'bold'
                }}>
                  Payment Status
                </th>
              )}
              {visibleColumns.createdBy && (
                <th style={{
                  padding: '12px',
                  textAlign: 'left',
                  fontWeight: 'bold'
                }}>
                  Created by
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {returns.map((r, index) => {
              const paidAmount = Number(r.paid_payment ?? r.amount_paid) || 0;
              const totalAmount = Number(r.total_amount) || 0;
              const paymentStatusText =
                r.payment_status || (paidAmount <= 0 ? "Unpaid" : paidAmount >= totalAmount ? "Paid" : "Partial");

              return (
                <tr key={r.id} style={{
                  borderBottom: '1px solid #ddd',
                  backgroundColor: index % 2 === 0 ? '#fff' : '#f9f9f9'
                }}>
                  <td style={{ padding: '12px', borderRight: '1px solid #ddd' }}>
                    {index + 1}
                  </td>
                  {visibleColumns.returnDate && (
                    <td style={{ padding: '12px', borderRight: '1px solid #ddd' }}>
                      {formatDate(r.return_date)}
                    </td>
                  )}
                  {visibleColumns.invoiceNumber && (
                    <td style={{ padding: '12px', borderRight: '1px solid #ddd' }}>
                      {r.invoice_number || "-"}
                    </td>
                  )}
                  {visibleColumns.returnNumber && (
                    <td style={{ padding: '12px', borderRight: '1px solid #ddd' }}>
                      <strong>{r.return_number || "-"}</strong>
                    </td>
                  )}
                  {visibleColumns.status && (
                    <td style={{ padding: '12px', borderRight: '1px solid #ddd' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '4px 8px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        backgroundColor: 
                          normalizeStatus(r.status) === 'approved' ? '#d1fae5' :
                          normalizeStatus(r.status) === 'completed' ? '#d1fae5' :
                          normalizeStatus(r.status) === 'pending' ? '#fef3c7' :
                          normalizeStatus(r.status) === 'draft' ? '#fef3c7' :
                          normalizeStatus(r.status) === 'rejected' ? '#fee2e2' :
                          normalizeStatus(r.status) === 'cancelled' ? '#fee2e2' :
                          '#f3f4f6',
                        color: 
                          normalizeStatus(r.status) === 'approved' ? '#065f46' :
                          normalizeStatus(r.status) === 'completed' ? '#065f46' :
                          normalizeStatus(r.status) === 'pending' ? '#92400e' :
                          normalizeStatus(r.status) === 'draft' ? '#92400e' :
                          normalizeStatus(r.status) === 'rejected' ? '#991b1b' :
                          normalizeStatus(r.status) === 'cancelled' ? '#991b1b' :
                          '#374151'
                      }}>
                        {getStatusText(r.status)}
                      </span>
                    </td>
                  )}
                  {visibleColumns.referenceNo && (
                    <td style={{ padding: '12px', borderRight: '1px solid #ddd' }}>
                      {r.reference_no || "-"}
                    </td>
                  )}
                  {visibleColumns.customerName && (
                    <td style={{ padding: '12px', borderRight: '1px solid #ddd' }}>
                      <strong>{r.customer_name || "-"}</strong>
                    </td>
                  )}
                  {visibleColumns.totalAmount && (
                    <td style={{ padding: '12px', borderRight: '1px solid #ddd', fontWeight: 'bold' }}>
                      {formatCurrency(Number(r.total_amount) || 0)}
                    </td>
                  )}
                  {visibleColumns.paidPayment && (
                    <td style={{ padding: '12px', borderRight: '1px solid #ddd' }}>
                      {formatCurrency(paidAmount)}
                    </td>
                  )}
                  {visibleColumns.paymentStatus && (
                    <td style={{ padding: '12px', borderRight: '1px solid #ddd' }}>
                      {paymentStatusText}
                    </td>
                  )}
                  {visibleColumns.createdBy && (
                    <td style={{ padding: '12px' }}>
                      {r.created_by_name || r.created_by || "-"}
                    </td>
                  )}
                </tr>
              );
            })}
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
            Total Returns: {returns.length}
          </div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            Page 1 of 1
          </div>
        </div>
      </div>
    </div>
  );
};

export default function SalesReturnsPage() {
  const router = useRouter();
  const { company } = useAuth();
  const latestRequestRef = useRef(0);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<SalesReturnRow[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [customerFilter, setCustomerFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [error, setError] = useState("");
  
  // UI state
  const [showFilters, setShowFilters] = useState(false);
  const [showColumnDropdown, setShowColumnDropdown] = useState(false);
  useEffect(() => {
    const handleColumnDropdownOutside = (event: Event) => {
      const target = event.target as Element | null;
      if (!target) return;
      if (!target.closest(".column-dropdown-container")) {
        setShowColumnDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleColumnDropdownOutside);
    document.addEventListener("touchstart", handleColumnDropdownOutside);
    return () => {
      document.removeEventListener("mousedown", handleColumnDropdownOutside);
      document.removeEventListener("touchstart", handleColumnDropdownOutside);
    };
  }, []);
  const [activeActionMenu, setActiveActionMenu] = useState<string | null>(null);
  const [showPrintView, setShowPrintView] = useState(false);
  const [returnsToPrint, setReturnsToPrint] = useState<SalesReturnRow[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [summary, setSummary] = useState({
    total_amount: 0,
    total_paid: 0,
    total_pending: 0,
    total_returns: 0
  });
  const pageSize = 10;
  
  // Export loading states
  const [copyLoading, setCopyLoading] = useState(false);
  const [excelLoading, setExcelLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [csvLoading, setCsvLoading] = useState(false);
  const [printLoading, setPrintLoading] = useState(false);

  // Column visibility
  const [visibleColumns, setVisibleColumns] = useState({
    returnDate: true,
    invoiceNumber: true,
    returnNumber: true,
    status: true,
    referenceNo: true,
    customerName: true,
    totalAmount: true,
    paidPayment: true,
    paymentStatus: true,
    createdBy: true,
    actions: true,
  });

  const applyLocalFilters = (items: SalesReturnRow[], filters: SalesReturnFilters) => {
    const q = (filters.search || "").trim().toLowerCase();
    return items.filter((r) => {
      const paidAmount = Number(r.paid_payment ?? r.amount_paid) || 0;
      const totalAmount = Number(r.total_amount) || 0;
      const paymentStatusText =
        r.payment_status || (paidAmount <= 0 ? "unpaid" : paidAmount >= totalAmount ? "paid" : "partial");

      const matchesSearch =
        !q ||
        (r.return_number || "").toLowerCase().includes(q) ||
        (r.invoice_number || "").toLowerCase().includes(q) ||
        (r.customer_name || "").toLowerCase().includes(q) ||
        (r.reference_no || "").toLowerCase().includes(q) ||
        (r.created_by_name || r.created_by || "").toLowerCase().includes(q) ||
        (r.status || "").toLowerCase().includes(q) ||
        String(paymentStatusText).toLowerCase().includes(q);

      const matchesStatus = !filters.statusFilter || normalizeStatus(r.status) === normalizeStatus(filters.statusFilter);
      const matchesCustomer = !filters.customerFilter || String(r.customer_id || "") === String(filters.customerFilter);
      const rowDate = r.return_date ? new Date(r.return_date) : null;
      const from = filters.fromDate ? new Date(`${filters.fromDate}T00:00:00`) : null;
      const to = filters.toDate ? new Date(`${filters.toDate}T23:59:59`) : null;
      const matchesFrom = !from || (rowDate && rowDate >= from);
      const matchesTo = !to || (rowDate && rowDate <= to);

      return Boolean(matchesSearch && matchesStatus && matchesCustomer && matchesFrom && matchesTo);
    });
  };

  const normalizeReturnsResponse = (
    response: unknown,
    page: number,
    pageSizeValue: number,
    filters: SalesReturnFilters
  ): SalesReturnResponse => {
    if (Array.isArray(response)) {
      const filtered = applyLocalFilters(response as SalesReturnRow[], filters);
      const start = (page - 1) * pageSizeValue;
      const paged = filtered.slice(start, start + pageSizeValue);
      const totalAmount = filtered.reduce((sum, r) => sum + (Number(r.total_amount) || 0), 0);
      const totalPaid = filtered.reduce((sum, r) => sum + (Number(r.paid_payment ?? r.amount_paid) || 0), 0);
      return {
        returns: paged,
        total: filtered.length,
        page,
        page_size: pageSizeValue,
        total_amount: totalAmount,
        total_paid: totalPaid,
        total_pending: Math.max(0, totalAmount - totalPaid),
      };
    }

    const obj = (response || {}) as Partial<SalesReturnResponse>;
    return {
      returns: obj.returns || [],
      total: obj.total || 0,
      page: obj.page || page,
      page_size: obj.page_size || pageSizeValue,
      total_amount: obj.total_amount || 0,
      total_paid: obj.total_paid || 0,
      total_pending: obj.total_pending || 0,
    };
  };

  useEffect(() => {
    const requestId = ++latestRequestRef.current;
    let cancelled = false;

    const fetchRows = async () => {
      if (!company?.id) {
        if (!cancelled && requestId === latestRequestRef.current) {
          setRows([]);
          setLoading(false);
        }
        return;
      }

      if (!cancelled && requestId === latestRequestRef.current) {
        setLoading(true);
        setError("");
      }
      try {
        let result: SalesReturnResponse = { returns: [], total: 0, page: 1, page_size: pageSize, total_amount: 0, total_paid: 0, total_pending: 0 };
        let lastError: unknown = null;

        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            const response = await salesReturnsApi.list(company.id, {
              page: currentPage,
              page_size: pageSize,
              search: search || undefined,
              status: statusFilter || undefined,
              customer_id: customerFilter || undefined,
              from_date: fromDate || undefined,
              to_date: toDate || undefined
            });
            result = normalizeReturnsResponse(response, currentPage, pageSize, {
              search,
              statusFilter,
              customerFilter,
              fromDate,
              toDate,
            });
            lastError = null;
            break;
          } catch (err) {
            lastError = err;
            if (attempt === 0) {
              await new Promise((resolve) => setTimeout(resolve, 500));
            }
          }
        }

        if (lastError) throw lastError;
        if (cancelled || requestId !== latestRequestRef.current) return;
        
        setRows(result.returns || []);
        setTotalItems(result.total || 0);
        setSummary({
          total_amount: result.total_amount || 0,
          total_paid: result.total_paid || 0,
          total_pending: result.total_pending || 0,
          total_returns: result.total || 0
        });
      } catch (err) {
        if (cancelled || requestId !== latestRequestRef.current) return;
        console.error("Failed to fetch sales returns:", err);
        setRows([]);
        const apiError = err as { response?: { status?: number; data?: { detail?: string } } };
        if (apiError?.response?.status === 503) {
          setError(apiError.response.data?.detail || "Database temporarily unavailable.");
        } else {
          setError("Failed to load sales returns.");
        }
      } finally {
        if (!cancelled && requestId === latestRequestRef.current) {
          setLoading(false);
        }
      }
    };

    fetchRows();

    return () => {
      cancelled = true;
    };
  }, [company?.id, currentPage, search, statusFilter, customerFilter, fromDate, toDate]);

  useEffect(() => {
    if (company?.id) {
      fetchCustomers();
    }
  }, [company?.id]);

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

  const fetchAllReturnsForExport = async (): Promise<SalesReturnRow[]> => {
    try {
      if (!company?.id) return [];

      const pageSize = 100;
      let pageNum = 1;
      let allReturns: SalesReturnRow[] = [];
      while (true) {
        const response = await salesReturnsApi.list(company.id, {
          page: pageNum,
          page_size: pageSize,
          search: search || undefined,
          status: statusFilter || undefined,
          customer_id: customerFilter || undefined,
          from_date: fromDate || undefined,
          to_date: toDate || undefined
        });
        const result = normalizeReturnsResponse(response, pageNum, pageSize, {
          search,
          statusFilter,
          customerFilter,
          fromDate,
          toDate,
        });
        const batch = (result?.returns || []) as SalesReturnRow[];
        allReturns = allReturns.concat(batch);
        if (batch.length < pageSize) break;
        pageNum += 1;
      }

      return allReturns;
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

  const getStatusColor = (status?: string) => {
    const normalized = normalizeStatus(status);
    if (normalized === "approved" || normalized === "completed") {
      return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
    }
    if (normalized === "pending" || normalized === "draft") {
      return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";
    }
    if (normalized === "rejected" || normalized === "cancelled") {
      return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
    }
    return "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400";
  };

  const getStatusText = (status?: string) => {
    const s = (status || "").trim();
    if (!s) return "Unknown";
    return s.charAt(0).toUpperCase() + s.slice(1);
  };

  const calculateTax = (returnItem: SalesReturnRow): number => {
    return (returnItem.cgst_amount || 0) +
      (returnItem.sgst_amount || 0) +
      (returnItem.igst_amount || 0) +
      (returnItem.cess_amount || 0);
  };

  const toggleColumn = (key: keyof typeof visibleColumns) => {
    setVisibleColumns(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Export functions
  const copyToClipboard = async () => {
    if (copyLoading) return;
    setCopyLoading(true);
    try {
      const allReturns = await fetchAllReturnsForExport();
      
      const headers: string[] = ["S.No"];
      const rows = allReturns.map((r, index) => {
        const paidAmount = Number(r.paid_payment ?? r.amount_paid) || 0;
        const totalAmount = Number(r.total_amount) || 0;
        const paymentStatusText =
          r.payment_status || (paidAmount <= 0 ? "Unpaid" : paidAmount >= totalAmount ? "Paid" : "Partial");
        
        const row: string[] = [(index + 1).toString()];

        if (visibleColumns.returnDate) {
          if (!headers.includes("Return Date")) headers.push("Return Date");
          row.push(formatDate(r.return_date));
        }

        if (visibleColumns.invoiceNumber) {
          if (!headers.includes("Sales Code")) headers.push("Sales Code");
          row.push(r.invoice_number || "-");
        }

        if (visibleColumns.returnNumber) {
          if (!headers.includes("Return Code")) headers.push("Return Code");
          row.push(r.return_number || "-");
        }

        if (visibleColumns.status) {
          if (!headers.includes("Return Status")) headers.push("Return Status");
          row.push(getStatusText(r.status));
        }

        if (visibleColumns.referenceNo) {
          if (!headers.includes("Reference No.")) headers.push("Reference No.");
          row.push(r.reference_no || "-");
        }

        if (visibleColumns.customerName) {
          if (!headers.includes("Customer Name")) headers.push("Customer Name");
          row.push(r.customer_name || "-");
        }

        if (visibleColumns.totalAmount) {
          if (!headers.includes("Total")) headers.push("Total");
          row.push(formatCurrency(Number(r.total_amount) || 0).replace('₹', 'Rs. '));
        }

        if (visibleColumns.paidPayment) {
          if (!headers.includes("Paid Payment")) headers.push("Paid Payment");
          row.push(formatCurrency(paidAmount).replace('₹', 'Rs. '));
        }

        if (visibleColumns.paymentStatus) {
          if (!headers.includes("Payment Status")) headers.push("Payment Status");
          row.push(paymentStatusText);
        }

        if (visibleColumns.createdBy) {
          if (!headers.includes("Created by")) headers.push("Created by");
          row.push(r.created_by_name || r.created_by || "-");
        }

        return row;
      });

      const text = [headers.join("\t"), ...rows.map(r => r.join("\t"))].join("\n");
      await navigator.clipboard.writeText(text);
      alert("Sales returns data copied to clipboard");
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
      const allReturns = await fetchAllReturnsForExport();
      
      const exportData = allReturns.map((r, index) => {
        const paidAmount = Number(r.paid_payment ?? r.amount_paid) || 0;
        const totalAmount = Number(r.total_amount) || 0;
        const paymentStatusText =
          r.payment_status || (paidAmount <= 0 ? "Unpaid" : paidAmount >= totalAmount ? "Paid" : "Partial");
        
        const row: Record<string, any> = {
          "S.No": index + 1,
        };

        if (visibleColumns.returnDate) {
          row["Return Date"] = formatDate(r.return_date);
        }

        if (visibleColumns.invoiceNumber) {
          row["Sales Code"] = r.invoice_number || '-';
        }

        if (visibleColumns.returnNumber) {
          row["Return Code"] = r.return_number || '-';
        }

        if (visibleColumns.status) {
          row["Return Status"] = getStatusText(r.status);
        }

        if (visibleColumns.referenceNo) {
          row["Reference No."] = r.reference_no || '-';
        }

        if (visibleColumns.customerName) {
          row["Customer Name"] = r.customer_name || '-';
        }

        if (visibleColumns.totalAmount) {
          row["Total"] = totalAmount;
          row["Tax Amount"] = calculateTax(r);
        }

        if (visibleColumns.paidPayment) {
          row["Paid Payment"] = paidAmount;
          row["Balance Due"] = totalAmount - paidAmount;
        }

        if (visibleColumns.paymentStatus) {
          row["Payment Status"] = paymentStatusText;
        }

        if (visibleColumns.createdBy) {
          row["Created by"] = r.created_by_name || r.created_by || '-';
        }

        row["Reason"] = r.reason || '';
        row["Company"] = company?.name || "";
        
        return row;
      });

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Sales Returns");
      XLSX.writeFile(wb, "sales-returns.xlsx");
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
      const allReturns = await fetchAllReturnsForExport();
      if (!allReturns.length) {
        alert("No returns found to export.");
        return;
      }

      const detailedReturns = await Promise.all(
        allReturns.map(async (returnItem) => {
          try {
            return (await salesReturnsApi.get(company?.id ?? "", returnItem.id)) as SalesReturnRow;
          } catch (error) {
            console.error(`Failed to load return details for ${returnItem.return_number}:`, error);
            return returnItem;
          }
        })
      );

      const doc = new jsPDF("p", "mm", "a4");
      const money = (v: number | undefined | null) =>
        new Intl.NumberFormat("en-IN", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(Number(v || 0));
      const val = (v: any) => (v === undefined || v === null || v === "" ? "-" : String(v));

      detailedReturns.forEach((returnItem, index) => {
        if (index > 0) doc.addPage();

        const pageWidth = doc.internal.pageSize.getWidth();
        doc.setFillColor(22, 78, 99);
        doc.rect(0, 0, pageWidth, 24, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(12);
        doc.text(company?.name || "Company", 14, 10);
        doc.setFontSize(11);
        doc.text("SALES RETURN", 14, 18);
        doc.setFontSize(9);
        doc.text(`Return No: ${val(returnItem.return_number)}`, pageWidth - 14, 10, { align: "right" });
        doc.text(`Date: ${formatDate(returnItem.return_date)}`, pageWidth - 14, 18, { align: "right" });
        doc.setTextColor(0, 0, 0);

        let y = 32;
        const addSection = (title: string) => {
          doc.setFillColor(241, 245, 249);
          doc.rect(14, y - 3, 182, 7, "F");
          doc.setFontSize(10);
          doc.setFont("helvetica", "bold");
          doc.text(title, 16, y + 1);
          doc.setFont("helvetica", "normal");
          y += 9;
        };
        const addLine = (label: string, value: any) => {
          doc.setFontSize(9);
          doc.setFont("helvetica", "bold");
          doc.text(`${label}:`, 14, y);
          doc.setFont("helvetica", "normal");
          const lines = doc.splitTextToSize(val(value) || "", 145);
          doc.text(lines, 50, y);
          y += Math.max(1, lines.length) * 4.6;
        };

        addSection("Return Details");
        addLine("Sales Invoice", returnItem.invoice_number || "-");
        addLine("Customer Name", returnItem.customer_name || "-");
        addLine("Return Status", getStatusText(returnItem.status) || "");
        addLine("Reason", returnItem.reason || "-");
        addLine("Reference No", returnItem.reference_no || "-");
        addLine("Created by", returnItem.created_by_name || returnItem.created_by || "-");

        const paidAmount = Number(returnItem.paid_payment ?? returnItem.amount_paid) || 0;
        const totalAmount = Number(returnItem.total_amount) || 0;
        const itemStartY = y + 2;
        const items = Array.isArray(returnItem.items) ? returnItem.items : [];
        const itemRows = items.map((item, rowIndex) => {
          const taxAmount =
            Number(item.cgst_amount || 0) +
            Number(item.sgst_amount || 0) +
            Number(item.igst_amount || 0) +
            Number(item.cess_amount || 0);

          return [
            String(rowIndex + 1),
            val(item.product_id),
            val(item.description),
            Number(item.quantity || 0).toFixed(2),
            val(item.unit),
            Number(item.unit_price || 0).toFixed(2),
            Number(item.discount_percent || 0).toFixed(2),
            Number(item.discount_amount || 0).toFixed(2),
            Number(item.taxable_amount || 0).toFixed(2),
            Number(item.gst_rate || 0).toFixed(2),
            taxAmount.toFixed(2),
            Number(item.total_amount || 0).toFixed(2),
          ];
        });

        autoTable(doc, {
          startY: itemStartY,
          head: [[
            "#",
            "Product ID",
            "Description",
            "Qty",
            "Unit",
            "Unit Price",
            "Disc %",
            "Disc Amt",
            "Taxable",
            "GST %",
            "Tax",
            "Amount",
          ]],
          body: itemRows.length ? itemRows : [["-", "-", "No items", "-", "-", "-", "-", "-", "-", "-", "-", "-"]],
          theme: "grid",
          styles: { fontSize: 7.3, cellPadding: 1.5, lineColor: [220, 220, 220], lineWidth: 0.1 },
          headStyles: { fillColor: [22, 78, 99], textColor: [255, 255, 255], fontSize: 7.5 },
          alternateRowStyles: { fillColor: [248, 250, 252] },
          columnStyles: {
            3: { halign: "right" },
            5: { halign: "right" },
            6: { halign: "right" },
            7: { halign: "right" },
            8: { halign: "right" },
            9: { halign: "right" },
            10: { halign: "right" },
            11: { halign: "right" },
          },
        });

        const finalY = (doc as any).lastAutoTable?.finalY ?? itemStartY;
        let totalsY = finalY + 7;
        if (totalsY + 46 > 286) {
          doc.addPage();
          totalsY = 20;
        }

        doc.setDrawColor(200, 200, 200);
        doc.roundedRect(118, totalsY, 78, 44, 2, 2, "S");
        doc.setFontSize(8.5);
        doc.text("Subtotal", 121, totalsY + 5);
        doc.text(money(returnItem.subtotal || 0), 193, totalsY + 5, { align: "right" });
        
        if (returnItem.cgst_amount) {
          doc.text("CGST", 121, totalsY + 10);
          doc.text(money(returnItem.cgst_amount), 193, totalsY + 10, { align: "right" });
        }
        
        if (returnItem.sgst_amount) {
          doc.text("SGST", 121, totalsY + 15);
          doc.text(money(returnItem.sgst_amount), 193, totalsY + 15, { align: "right" });
        }
        
        if (returnItem.igst_amount) {
          doc.text("IGST", 121, totalsY + 20);
          doc.text(money(returnItem.igst_amount), 193, totalsY + 20, { align: "right" });
        }
        
        doc.text("Round Off", 121, totalsY + 25);
        doc.text(money(returnItem.round_off), 193, totalsY + 25, { align: "right" });
        
        doc.setFont("helvetica", "bold");
        doc.text("Grand Total", 121, totalsY + 31);
        doc.text(money(totalAmount), 193, totalsY + 31, { align: "right" });
        doc.setFont("helvetica", "normal");

        doc.setFontSize(8.5);
        doc.text(`Paid: ${money(paidAmount)}`, 14, totalsY + 27);
        doc.text(`Balance: ${money(totalAmount - paidAmount)}`, 14, totalsY + 32);
      });

      addPdfPageNumbers(doc, "p");
      doc.save("sales-returns-detailed.pdf");
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
      const allReturns = await fetchAllReturnsForExport();
      
      const exportData = allReturns.map((r, index) => {
        const paidAmount = Number(r.paid_payment ?? r.amount_paid) || 0;
        const paymentStatusText =
          r.payment_status || (paidAmount <= 0 ? "Unpaid" : paidAmount >= Number(r.total_amount) ? "Paid" : "Partial");
        
        const row: Record<string, any> = {
          "S.No": index + 1,
        };

        if (visibleColumns.returnDate) {
          row["Return Date"] = formatDate(r.return_date);
        }

        if (visibleColumns.invoiceNumber) {
          row["Sales Code"] = r.invoice_number || '-';
        }

        if (visibleColumns.returnNumber) {
          row["Return Code"] = r.return_number || '-';
        }

        if (visibleColumns.status) {
          row["Return Status"] = getStatusText(r.status);
        }

        if (visibleColumns.referenceNo) {
          row["Reference No."] = r.reference_no || '-';
        }

        if (visibleColumns.customerName) {
          row["Customer Name"] = r.customer_name || '-';
        }

        if (visibleColumns.totalAmount) {
          row["Total"] = Number(r.total_amount) || 0;
        }

        if (visibleColumns.paidPayment) {
          row["Paid Payment"] = paidAmount;
        }

        if (visibleColumns.paymentStatus) {
          row["Payment Status"] = paymentStatusText;
        }

        if (visibleColumns.createdBy) {
          row["Created by"] = r.created_by_name || r.created_by || '-';
        }

        return row;
      });

      const ws = XLSX.utils.json_to_sheet(exportData);
      const csv = XLSX.utils.sheet_to_csv(ws);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      saveAs(blob, "sales-returns.csv");
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
      const allReturns = await fetchAllReturnsForExport();
      setReturnsToPrint(allReturns);
      setShowPrintView(true);
    } catch (error) {
      console.error("Print failed:", error);
      alert("Failed to prepare print view. Please try again.");
    } finally {
      setPrintLoading(false);
    }
  };

  const handleDelete = async (returnId: string, returnNumber: string) => {
    if (window.confirm(`Are you sure you want to delete return "${returnNumber}"? This action cannot be undone.`)) {
      try {
        if (company?.id) {
          await salesReturnsApi.delete(company.id, returnId);
          // Refresh the list
          setCurrentPage(1);
        }
      } catch (error) {
        console.error("Error deleting return:", error);
        alert("Failed to delete return");
      }
    }
  };

  const handlePrintReturn = async (returnId: string) => {
    if (!company?.id) return;

    try {
      // Assuming there's a download PDF function for returns
      // If not available, you can implement a simple print view
      alert("Print functionality - Implement PDF download for returns");
    } catch (error) {
      console.error("Failed to print:", error);
      alert("Failed to generate print. Please try again.");
    }
  };

  const handlePayNow = (returnId: string) => {
    router.push(`/sales/sales-returns/${returnId}/payment`);
  };

  const handleViewPayments = (returnId: string) => {
    router.push(`/sales/sales-returns/${returnId}/payments`);
  };

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  return (
    <div className="w-full">
      {showPrintView && (
        <PrintView
          onComplete={() => setShowPrintView(false)}
          returns={returnsToPrint}
          visibleColumns={visibleColumns}
          formatCurrency={formatCurrency}
          formatDate={formatDate}
          getStatusText={getStatusText}
          companyName={company?.name || ''}
        />
      )}

      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Sales Returns
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Manage customer returns and refunds • Track return status and payments
            </p>
          </div>
          <button
            onClick={() => router.push('/sales/sales-returns/new')}
            className="px-4 py-2 transition bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            New Return
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="px-6 py-6 bg-gray-50 dark:bg-gray-900">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
          {/* Total Returns */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {summary.total_returns}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Total Returns
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
                <RotateCcw className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </div>

          {/* Total Return Amount */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-red-600">
                  {formatCurrency(summary.total_amount)}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Total Return Amount
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-red-600 dark:text-red-400" />
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
                  Total Refunded
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
                <p className="text-2xl font-bold text-yellow-600">
                  {formatCurrency(summary.total_pending)}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Pending Refund
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-yellow-100 dark:bg-yellow-900/20 flex items-center justify-center">
                <Clock className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
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
                placeholder="Search return code, sales code, customer, reference..."
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
                        {key === 'returnDate' ? 'Return Date' : 
                         key === 'invoiceNumber' ? 'Sales Code' : 
                         key === 'returnNumber' ? 'Return Code' : 
                         key === 'status' ? 'Return Status' : 
                         key === 'referenceNo' ? 'Reference No.' : 
                         key === 'customerName' ? 'Customer Name' : 
                         key === 'totalAmount' ? 'Total' : 
                         key === 'paidPayment' ? 'Paid Payment' : 
                         key === 'paymentStatus' ? 'Payment Status' : 
                         key === 'createdBy' ? 'Created by' : 
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
                Return Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Status</option>
                <option value="approved">Approved</option>
                <option value="pending">Pending</option>
                <option value="rejected">Rejected</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
                <option value="draft">Draft</option>
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
        <div className="overflow-x-hidden">
          <table className="w-full table-fixed">
            <thead className="bg-gray-200 dark:bg-gray-700/50">
              <tr className="text-sm font-semibold text-gray-600 dark:text-gray-300">
                <th className="text-left px-3 py-3 ">
                  S.No
                </th>
                {visibleColumns.returnDate && (
                  <th className="text-left px-3 py-3 ">
                    Return Date
                  </th>
                )}
                {visibleColumns.invoiceNumber && (
                  <th className="text-left px-3 py-3 ">
                    Sales Code
                  </th>
                )}
                {visibleColumns.returnNumber && (
                  <th className="text-left px-3 py-3 ">
                    Return Code
                  </th>
                )}
                {visibleColumns.status && (
                  <th className="text-left px-3 py-3 ">
                    Return Status
                  </th>
                )}
                {visibleColumns.referenceNo && (
                  <th className="text-left px-3 py-3 ">
                    Reference No.
                  </th>
                )}
                {visibleColumns.customerName && (
                  <th className="text-left px-3 py-3 ">
                    Customer Name
                  </th>
                )}
                {visibleColumns.totalAmount && (
                  <th className="text-left px-3 py-3 ">
                    Total
                  </th>
                )}
                {visibleColumns.paidPayment && (
                  <th className="text-left px-3 py-3 ">
                    Paid Payment
                  </th>
                )}
                {visibleColumns.paymentStatus && (
                  <th className="text-left px-3 py-3 ">
                    Payment Status
                  </th>
                )}
                {visibleColumns.createdBy && (
                  <th className="text-left px-3 py-3 ">
                    Created by
                  </th>
                )}
                {visibleColumns.actions && (
                  <th className="text-right px-3 py-3 ">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700 text-sm text-gray-700 dark:text-gray-300">
              {loading ? (
                <tr>
                  <td colSpan={Object.values(visibleColumns).filter(Boolean).length + 1} className="px-6 py-8 text-center">
                    <div className="flex items-center justify-center">
                      <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
                    </div>
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={Object.values(visibleColumns).filter(Boolean).length + 1} className="px-6 py-8 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <RotateCcw className="w-12 h-12 text-gray-400 mb-2" />
                      <p className="text-lg font-medium text-gray-900 dark:text-white mb-1">
                        No sales returns found
                      </p>
                      <p className="text-gray-500 dark:text-gray-400 mb-4">
                        {statusFilter || search || fromDate || toDate || customerFilter ?
                          "No returns found matching your filters. Try adjusting your search criteria." :
                          "Add your first sales return to start tracking."}
                      </p>
                      <button
                        onClick={() => router.push('/sales/sales-returns/new')}
                        className="text-blue-600 hover:underline dark:text-blue-400"
                      >
                        Create your first return
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                rows.map((r, index) => {
                  const paidAmount = Number(r.paid_payment ?? r.amount_paid) || 0;
                  const totalAmount = Number(r.total_amount) || 0;
                  const paymentStatusText =
                    r.payment_status || (paidAmount <= 0 ? "Unpaid" : paidAmount >= totalAmount ? "Paid" : "Partial");
                  const taxAmount = calculateTax(r);

                  return (
                    <tr
                      key={r.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <td className="px-3 py-4 align-top break-words text-gray-700 dark:text-gray-300">
                        {(currentPage - 1) * pageSize + index + 1}
                      </td>
                      {visibleColumns.returnDate && (
                        <td className="px-3 py-4 align-top break-words text-gray-700 dark:text-gray-300">
                          {formatDate(r.return_date)}
                        </td>
                      )}
                      {visibleColumns.invoiceNumber && (
                        <td className="px-3 py-4 align-top break-words text-gray-700 dark:text-gray-300">
                          {r.invoice_number || "-"}
                        </td>
                      )}
                      {visibleColumns.returnNumber && (
                        <td className="px-3 py-4 align-top break-words">
                          <div className="font-medium text-blue-600 dark:text-blue-400">
                            <Link href={`/sales/sales-returns/${r.id}`} className="hover:underline">
                              {r.return_number || 'N/A'}
                            </Link>
                          </div>
                        </td>
                      )}
                      {visibleColumns.status && (
                        <td className="px-3 py-4 align-top break-words">
                          <span
                            className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(r.status)}`}
                          >
                            {getStatusText(r.status)}
                          </span>
                        </td>
                      )}
                      {visibleColumns.referenceNo && (
                        <td className="px-3 py-4 align-top break-words text-gray-700 dark:text-gray-300">
                          {r.reference_no || "-"}
                        </td>
                      )}
                      {visibleColumns.customerName && (
                        <td className="px-3 py-4 align-top break-words">
                          <div className="min-w-0 max-w-[240px]">
                            <div className="font-medium text-gray-900 dark:text-white">
                              {r.customer_name || "-"}
                            </div>
                          </div>
                        </td>
                      )}
                      {visibleColumns.totalAmount && (
                        <td className="px-3 py-4 align-top break-words">
                          <div className="font-bold text-red-600">
                            {formatCurrency(Number(r.total_amount) || 0)}
                          </div>
                          {taxAmount > 0 && (
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              Tax: {formatCurrency(taxAmount)}
                            </div>
                          )}
                        </td>
                      )}
                      {visibleColumns.paidPayment && (
                        <td className="px-3 py-4 align-top break-words">
                          <div className={`font-bold ${paidAmount > 0 ? 'text-green-600' : 'text-gray-700 dark:text-gray-300'}`}>
                            {formatCurrency(paidAmount)}
                          </div>
                          {(totalAmount - paidAmount) > 0 && (
                            <div className="text-xs font-medium text-yellow-600 mt-1">
                              Due: {formatCurrency(totalAmount - paidAmount)}
                            </div>
                          )}
                        </td>
                      )}
                      {visibleColumns.paymentStatus && (
                        <td className="px-3 py-4 align-top break-words">
                          <span
                            className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              paymentStatusText === 'Paid' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                              paymentStatusText === 'Partial' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                              paymentStatusText === 'Unpaid' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                              'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400'
                            }`}
                          >
                            {paymentStatusText}
                          </span>
                        </td>
                      )}
                      {visibleColumns.createdBy && (
                        <td className="px-3 py-4 align-top break-words text-gray-700 dark:text-gray-300">
                          {r.created_by_name || r.created_by || "-"}
                        </td>
                      )}
                      {visibleColumns.actions && (
                        <td className="px-3 py-4 text-right align-top">
                          <div className="relative action-dropdown-container inline-block">
                            <button
                              onClick={() =>
                                setActiveActionMenu(
                                  activeActionMenu === r.id ? null : r.id
                                )
                              }
                              className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-50 dark:hover:text-gray-300 dark:hover:bg-gray-700/50 transition-all duration-200"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>

                            {activeActionMenu === r.id && (
                              <div className="absolute right-0 mt-1 w-56 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg shadow-xl py-1 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                                {/* View Sales Return */}
                                <Link
                                  href={`/sales/sales-returns/${r.id}`}
                                  onClick={() => setActiveActionMenu(null)}
                                  className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                                >
                                  <Eye className="w-4 h-4 text-gray-400" />
                                  <span>View Sales Return</span>
                                </Link>

                                {/* View Original Sale */}
                                {r.invoice_id && (
                                  <Link
                                    href={`/sales/${r.invoice_id}`}
                                    onClick={() => setActiveActionMenu(null)}
                                    className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                                  >
                                    <Receipt className="w-4 h-4 text-gray-400" />
                                    <span>View Original Sale</span>
                                  </Link>
                                )}

                                {/* Edit (only if draft/pending) */}
                                {(r.status === 'draft' || r.status === 'pending') && (
                                  <Link
                                    href={`/sales/sales-returns/${r.id}/edit`}
                                    onClick={() => setActiveActionMenu(null)}
                                    className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                                  >
                                    <Edit className="w-4 h-4 text-gray-400" />
                                    <span>Edit</span>
                                  </Link>
                                )}

                                {/* View Payments */}
                                <button
                                  onClick={() => {
                                    handleViewPayments(r.id);
                                    setActiveActionMenu(null);
                                  }}
                                  className="flex w-full items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                                >
                                  <Wallet className="w-4 h-4 text-gray-400" />
                                  <span>View Payments</span>
                                </button>

                                {/* Pay Now (if balance due) */}
                                {(totalAmount - paidAmount) > 0 && r.status !== 'cancelled' && (
                                  <button
                                    onClick={() => {
                                      handlePayNow(r.id);
                                      setActiveActionMenu(null);
                                    }}
                                    className="flex w-full items-center gap-3 px-3 py-2 text-sm text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
                                  >
                                    <CreditCard className="w-4 h-4" />
                                    <span>Pay Now</span>
                                  </button>
                                )}

                                {/* Print */}
                                <button
                                  onClick={() => {
                                    handlePrintReturn(r.id);
                                    setActiveActionMenu(null);
                                  }}
                                  className="flex w-full items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                                >
                                  <Printer className="w-4 h-4 text-gray-400" />
                                  <span>Print</span>
                                </button>

                                {/* PDF Download */}
                                <button
                                  onClick={() => {
                                    // Implement PDF download for return
                                    alert("PDF Download - Implement if needed");
                                    setActiveActionMenu(null);
                                  }}
                                  className="flex w-full items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                                >
                                  <FileDown className="w-4 h-4 text-gray-400" />
                                  <span>Download PDF</span>
                                </button>

                                {/* Delete/Cancel (only if not completed) */}
                                {r.status !== 'completed' && r.status !== 'approved' && (
                                  <>
                                    <div className="my-1 border-t border-gray-100 dark:border-gray-700"></div>
                                    <button
                                      onClick={() => {
                                        handleDelete(r.id, r.return_number);
                                        setActiveActionMenu(null);
                                      }}
                                      className="flex w-full items-center gap-3 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                      <span>Delete Return</span>
                                    </button>
                                  </>
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
          </table>
        </div>
      </div>

      {/* Pagination */}
      {!loading && rows.length > 0 && (
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, totalItems)} of {totalItems} returns
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 text-sm text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-1"
            >
              <ArrowLeft className="w-4 h-4" />
              Previous
            </button>
            <div className="text-sm text-gray-700 dark:text-gray-300">
              Page {currentPage} of {totalPages}
            </div>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 text-sm text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-1"
            >
              Next
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}




