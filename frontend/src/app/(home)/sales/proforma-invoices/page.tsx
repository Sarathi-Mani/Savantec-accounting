"use client";

import { useAuth } from "@/context/AuthContext";
import dayjs from "dayjs";
import Link from "next/link";
import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { proformaInvoicesApi } from "@/services/api";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { saveAs } from "file-saver";
import { addPdfPageNumbers, getProfessionalTableTheme } from "@/utils/pdfTheme";
import {
  Search,
  Filter,
  Plus,
  FileText,
  Download,
  Printer,
  Copy,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Eye,
  Edit,
  Trash2,
  MoreVertical,
  Calendar,
  User,
  CreditCard,
  FileDigit,
  DollarSign,
  Clock,
  AlertCircle,
} from "lucide-react";

// Print component for proforma invoices
const PrintView = ({
  invoices,
  visibleColumns,
  formatCurrency,
  formatDate,
  companyName,
  onComplete,
}: {
  invoices: ProformaInvoice[];
  visibleColumns: Record<string, boolean>;
  formatCurrency: (amount: number) => string;
  formatDate: (dateString: string) => string;
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
            Proforma Invoices List
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
              {visibleColumns.invoiceNumber && (
                <th style={{
                  padding: '12px',
                  textAlign: 'left',
                  borderRight: '1px solid #ddd',
                  fontWeight: 'bold'
                }}>
                  Invoice #
                </th>
              )}
              {visibleColumns.customer && (
                <th style={{
                  padding: '12px',
                  textAlign: 'left',
                  borderRight: '1px solid #ddd',
                  fontWeight: 'bold'
                }}>
                  Customer
                </th>
              )}
              {visibleColumns.date && (
                <th style={{
                  padding: '12px',
                  textAlign: 'left',
                  borderRight: '1px solid #ddd',
                  fontWeight: 'bold'
                }}>
                  Date
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
              {visibleColumns.reference && (
                <th style={{
                  padding: '12px',
                  textAlign: 'left',
                  borderRight: '1px solid #ddd',
                  fontWeight: 'bold'
                }}>
                  Reference
                </th>
              )}
              {visibleColumns.amount && (
                <th style={{
                  padding: '12px',
                  textAlign: 'right',
                  fontWeight: 'bold'
                }}>
                  Amount
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
                {visibleColumns.invoiceNumber && (
                  <td style={{
                    padding: '12px',
                    borderRight: '1px solid #ddd'
                  }}>
                    {invoice.invoice_number}
                  </td>
                )}
                {visibleColumns.customer && (
                  <td style={{
                    padding: '12px',
                    borderRight: '1px solid #ddd'
                  }}>
                    {invoice.customer_name || '-'}
                  </td>
                )}
                {visibleColumns.date && (
                  <td style={{
                    padding: '12px',
                    borderRight: '1px solid #ddd'
                  }}>
                    {formatDate(invoice.proforma_date)}
                  </td>
                )}
                {visibleColumns.dueDate && (
                  <td style={{
                    padding: '12px',
                    borderRight: '1px solid #ddd'
                  }}>
                    {invoice.due_date ? formatDate(invoice.due_date) : '-'}
                  </td>
                )}
                {visibleColumns.reference && (
                  <td style={{
                    padding: '12px',
                    borderRight: '1px solid #ddd'
                  }}>
                    {invoice.reference_no || '-'}
                  </td>
                )}
                {visibleColumns.amount && (
                  <td style={{
                    padding: '12px',
                    textAlign: 'right'
                  }}>
                    {formatCurrency(invoice.total_amount)}
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

interface ProformaInvoice {
  id: string;
  invoice_number: string;
  proforma_date: string;
  due_date?: string;
  customer_id: string;
  customer_name?: string;
  reference_no?: string;
  subtotal: number;
  total_tax: number;
  total_amount: number;
  created_at: string;
}

// Local formatter functions
const formatDate = (dateString: string): string => {
  if (!dateString) return '-';
  try {
    return dayjs(dateString).format('DD MMM YYYY');
  } catch {
    return '-';
  }
};

const toSafeNumber = (value: unknown): number => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }
  if (typeof value === "string") {
    const parsed = Number(value.replace(/,/g, "").trim());
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

export default function ProformaInvoicesPage() {
  const { company } = useAuth();
  const router = useRouter();
  const [invoices, setInvoices] = useState<ProformaInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Filters state
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  
  // UI state
  const [showFilters, setShowFilters] = useState(false);
  const [showColumnDropdown, setShowColumnDropdown] = useState(false);
  const [activeActionMenu, setActiveActionMenu] = useState<string | null>(null);
  const [showPrintView, setShowPrintView] = useState(false);
  const [invoicesToPrint, setInvoicesToPrint] = useState<ProformaInvoice[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  
  // Export loading states
  const [copyLoading, setCopyLoading] = useState(false);
  const [excelLoading, setExcelLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [csvLoading, setCsvLoading] = useState(false);
  const [printLoading, setPrintLoading] = useState(false);
  
  const [cachedExportData, setCachedExportData] = useState<ProformaInvoice[] | null>(null);
  
  // Column visibility
  const [visibleColumns, setVisibleColumns] = useState({
    invoiceNumber: true,
    customer: true,
    date: true,
    dueDate: true,
    reference: true,
    amount: true,
    actions: true,
  });

  const getToken = () =>
    typeof window !== "undefined" ? localStorage.getItem("employee_token") || localStorage.getItem("access_token") : null;

  const fetchInvoices = async () => {
    const token = getToken();
    if (!company?.id || !token) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:6768/api"}/companies/${company.id}/proforma-invoices`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (response.ok) {
        const data = await response.json();
        const normalizedData = (Array.isArray(data) ? data : []).map((invoice) => ({
          ...invoice,
          subtotal: toSafeNumber(invoice?.subtotal),
          total_tax: toSafeNumber(invoice?.total_tax),
          total_amount: toSafeNumber(invoice?.total_amount),
        }));
        setInvoices(normalizedData);
        setError("");
      } else {
        setError("Failed to fetch proforma invoices");
      }
    } catch (error) {
      console.error("Failed to fetch proforma invoices:", error);
      setError("Failed to load proforma invoices");
    } finally {
      setLoading(false);
    }
  };

  const fetchAllInvoicesForExport = useCallback(async (): Promise<ProformaInvoice[]> => {
    const token = getToken();
    if (!company?.id || !token) return [];

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:6768/api"}/companies/${company.id}/proforma-invoices`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (response.ok) {
        const data = await response.json();
        const normalizedData = (Array.isArray(data) ? data : []).map((invoice) => ({
          ...invoice,
          subtotal: toSafeNumber(invoice?.subtotal),
          total_tax: toSafeNumber(invoice?.total_tax),
          total_amount: toSafeNumber(invoice?.total_amount),
        }));
        setCachedExportData(normalizedData);
        return normalizedData;
      }
      return [];
    } catch (error) {
      console.error("Export fetch failed:", error);
      return [];
    }
  }, [company?.id]);

  useEffect(() => {
    fetchInvoices();
  }, [company?.id]);

  useEffect(() => {
    if (company?.id) {
      setCachedExportData(null);
    }
  }, [fromDate, toDate]);

  useEffect(() => {
    setCurrentPage(1);
  }, [fromDate, toDate, search]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element | null;
      if (!target) return;
      if (!target.closest(".action-dropdown-container")) {
        setActiveActionMenu(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

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

  const formatCurrency = (amount: number) => {
    const safeAmount = toSafeNumber(amount);
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
    }).format(safeAmount);
  };

  const getExportData = async (): Promise<ProformaInvoice[]> => {
    if (cachedExportData) return cachedExportData;
    return await fetchAllInvoicesForExport();
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Search is applied locally
  };

  const handleReset = () => {
    setSearch("");
    setFromDate("");
    setToDate("");
    fetchInvoices();
  };

  // Apply search and date filters locally
  const filteredInvoices = invoices.filter(invoice => {
    if (fromDate && invoice.proforma_date) {
      const invDate = dayjs(invoice.proforma_date);
      const from = dayjs(fromDate);
      if (invDate.isBefore(from, 'day')) return false;
    }
    
    if (toDate && invoice.proforma_date) {
      const invDate = dayjs(invoice.proforma_date);
      const to = dayjs(toDate);
      if (invDate.isAfter(to, 'day')) return false;
    }
    
    if (search) {
      const searchLower = search.toLowerCase();
      return (
        invoice.invoice_number?.toLowerCase().includes(searchLower) ||
        invoice.customer_name?.toLowerCase().includes(searchLower) ||
        invoice.reference_no?.toLowerCase().includes(searchLower) ||
        false
      );
    }
    
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filteredInvoices.length / pageSize));
  const pagedInvoices = filteredInvoices.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Export functions
  const copyToClipboard = async () => {
    if (copyLoading) return;
    setCopyLoading(true);
    try {
      const allData = await getExportData();
      let filtered = [...allData];
      
      if (fromDate) {
        filtered = filtered.filter(inv => dayjs(inv.proforma_date).isAfter(dayjs(fromDate).subtract(1, 'day')));
      }
      if (toDate) {
        filtered = filtered.filter(inv => dayjs(inv.proforma_date).isBefore(dayjs(toDate).add(1, 'day')));
      }
      if (search) {
        const searchLower = search.toLowerCase();
        filtered = filtered.filter(inv => 
          inv.invoice_number?.toLowerCase().includes(searchLower) ||
          inv.customer_name?.toLowerCase().includes(searchLower) ||
          inv.reference_no?.toLowerCase().includes(searchLower)
        );
      }
      
      const headers: string[] = [];
      const rows = filtered.map(invoice => {
        const row: string[] = [];

        if (visibleColumns.invoiceNumber) {
          if (!headers.includes("Invoice #")) headers.push("Invoice #");
          row.push(invoice.invoice_number);
        }

        if (visibleColumns.customer) {
          if (!headers.includes("Customer")) headers.push("Customer");
          row.push(invoice.customer_name || "-");
        }

        if (visibleColumns.date) {
          if (!headers.includes("Date")) headers.push("Date");
          row.push(formatDate(invoice.proforma_date));
        }

        if (visibleColumns.dueDate) {
          if (!headers.includes("Due Date")) headers.push("Due Date");
          row.push(invoice.due_date ? formatDate(invoice.due_date) : "-");
        }

        if (visibleColumns.reference) {
          if (!headers.includes("Reference")) headers.push("Reference");
          row.push(invoice.reference_no || "-");
        }

        if (visibleColumns.amount) {
          if (!headers.includes("Amount")) headers.push("Amount");
          row.push(formatCurrency(invoice.total_amount));
        }

        return row;
      });

      const text = [headers.join("\t"), ...rows.map(r => r.join("\t"))].join("\n");
      await navigator.clipboard.writeText(text);
      alert("Proforma invoice data copied to clipboard");
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
      const allData = await getExportData();
      let filtered = [...allData];
      
      if (fromDate) {
        filtered = filtered.filter(inv => dayjs(inv.proforma_date).isAfter(dayjs(fromDate).subtract(1, 'day')));
      }
      if (toDate) {
        filtered = filtered.filter(inv => dayjs(inv.proforma_date).isBefore(dayjs(toDate).add(1, 'day')));
      }
      if (search) {
        const searchLower = search.toLowerCase();
        filtered = filtered.filter(inv => 
          inv.invoice_number?.toLowerCase().includes(searchLower) ||
          inv.customer_name?.toLowerCase().includes(searchLower) ||
          inv.reference_no?.toLowerCase().includes(searchLower)
        );
      }
      
      const exportData = filtered.map(invoice => {
        const row: Record<string, any> = {};

        if (visibleColumns.invoiceNumber) {
          row["Invoice #"] = invoice.invoice_number;
        }

        if (visibleColumns.customer) {
          row["Customer"] = invoice.customer_name || "-";
        }

        if (visibleColumns.date) {
          row["Date"] = formatDate(invoice.proforma_date);
        }

        if (visibleColumns.dueDate) {
          row["Due Date"] = invoice.due_date ? formatDate(invoice.due_date) : "-";
        }

        if (visibleColumns.reference) {
          row["Reference"] = invoice.reference_no || "-";
        }

        if (visibleColumns.amount) {
          row["Amount"] = invoice.total_amount;
          row["Amount (Formatted)"] = formatCurrency(invoice.total_amount);
        }

        row["Subtotal"] = invoice.subtotal;
        row["Tax"] = invoice.total_tax;
        row["Created At"] = formatDate(invoice.created_at);
        
        return row;
      });

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Proforma Invoices");
      XLSX.writeFile(wb, "proforma_invoices.xlsx");
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
      const allData = await getExportData();
      let filtered = [...allData];
      
      if (fromDate) {
        filtered = filtered.filter(inv => dayjs(inv.proforma_date).isAfter(dayjs(fromDate).subtract(1, 'day')));
      }
      if (toDate) {
        filtered = filtered.filter(inv => dayjs(inv.proforma_date).isBefore(dayjs(toDate).add(1, 'day')));
      }
      if (search) {
        const searchLower = search.toLowerCase();
        filtered = filtered.filter(inv => 
          inv.invoice_number?.toLowerCase().includes(searchLower) ||
          inv.customer_name?.toLowerCase().includes(searchLower) ||
          inv.reference_no?.toLowerCase().includes(searchLower)
        );
      }
      
      const doc = new jsPDF("landscape");
      
      const headers: string[] = [];
      const body = filtered.map(invoice => {
        const row: string[] = [];

        if (visibleColumns.invoiceNumber) {
          if (!headers.includes("Invoice #")) headers.push("Invoice #");
          row.push(invoice.invoice_number);
        }

        if (visibleColumns.customer) {
          if (!headers.includes("Customer")) headers.push("Customer");
          row.push(invoice.customer_name || "-");
        }

        if (visibleColumns.date) {
          if (!headers.includes("Date")) headers.push("Date");
          row.push(formatDate(invoice.proforma_date));
        }

        if (visibleColumns.dueDate) {
          if (!headers.includes("Due Date")) headers.push("Due Date");
          row.push(invoice.due_date ? formatDate(invoice.due_date) : "-");
        }

        if (visibleColumns.reference) {
          if (!headers.includes("Reference")) headers.push("Reference");
          row.push(invoice.reference_no || "-");
        }

        if (visibleColumns.amount) {
          if (!headers.includes("Amount")) headers.push("Amount");
          row.push(formatCurrency(invoice.total_amount));
        }

        return row;
      });

      autoTable(doc, {
        ...getProfessionalTableTheme(doc, "Proforma Invoices List", company?.name || "", "l"),
        head: [headers],
        body: body,
        styles: {
          fontSize: 9,
          cellPadding: 3,
          overflow: "linebreak",
          font: "helvetica",
        },
        columnStyles: headers.reduce((acc, header, index) => {
          if (header === "Amount") {
            acc[index] = { halign: 'right' };
          }
          return acc;
        }, {} as Record<number, any>),
      });

      addPdfPageNumbers(doc, "l");
      doc.save("proforma_invoices.pdf");
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
      const allData = await getExportData();
      let filtered = [...allData];
      
      if (fromDate) {
        filtered = filtered.filter(inv => dayjs(inv.proforma_date).isAfter(dayjs(fromDate).subtract(1, 'day')));
      }
      if (toDate) {
        filtered = filtered.filter(inv => dayjs(inv.proforma_date).isBefore(dayjs(toDate).add(1, 'day')));
      }
      if (search) {
        const searchLower = search.toLowerCase();
        filtered = filtered.filter(inv => 
          inv.invoice_number?.toLowerCase().includes(searchLower) ||
          inv.customer_name?.toLowerCase().includes(searchLower) ||
          inv.reference_no?.toLowerCase().includes(searchLower)
        );
      }
      
      const exportData = filtered.map(invoice => {
        const row: Record<string, any> = {};

        if (visibleColumns.invoiceNumber) {
          row["Invoice #"] = invoice.invoice_number;
        }

        if (visibleColumns.customer) {
          row["Customer"] = invoice.customer_name || "-";
        }

        if (visibleColumns.date) {
          row["Date"] = formatDate(invoice.proforma_date);
        }

        if (visibleColumns.dueDate) {
          row["Due Date"] = invoice.due_date ? formatDate(invoice.due_date) : "-";
        }

        if (visibleColumns.reference) {
          row["Reference"] = invoice.reference_no || "-";
        }

        if (visibleColumns.amount) {
          row["Amount"] = formatCurrency(invoice.total_amount);
        }

        return row;
      });

      const ws = XLSX.utils.json_to_sheet(exportData);
      const csv = XLSX.utils.sheet_to_csv(ws);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      saveAs(blob, "proforma_invoices.csv");
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
      const allData = await getExportData();
      let filtered = [...allData];
      
      if (fromDate) {
        filtered = filtered.filter(inv => dayjs(inv.proforma_date).isAfter(dayjs(fromDate).subtract(1, 'day')));
      }
      if (toDate) {
        filtered = filtered.filter(inv => dayjs(inv.proforma_date).isBefore(dayjs(toDate).add(1, 'day')));
      }
      if (search) {
        const searchLower = search.toLowerCase();
        filtered = filtered.filter(inv => 
          inv.invoice_number?.toLowerCase().includes(searchLower) ||
          inv.customer_name?.toLowerCase().includes(searchLower) ||
          inv.reference_no?.toLowerCase().includes(searchLower)
        );
      }
      setInvoicesToPrint(filtered);
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

  const handleDelete = async (invoiceId: string) => {
    if (!company?.id) return;
    if (!confirm("Are you sure you want to delete this proforma invoice? This action cannot be undone.")) return;
    try {
      await proformaInvoicesApi.delete(company.id, invoiceId);
      setInvoices((prev) => prev.filter((inv) => inv.id !== invoiceId));
    } catch (error) {
      console.error("Failed to delete proforma invoice:", error);
      alert("Failed to delete proforma invoice");
    }
  };

  const handleConvert = async (invoiceId: string) => {
    router.push(`/sales/new?fromProforma=${invoiceId}`);
  };

  const handlePdf = async (invoiceId: string, invoiceNumber: string) => {
    if (!company?.id) return;
    try {
      const blob = await proformaInvoicesApi.downloadPDF(company.id, invoiceId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Proforma_${invoiceNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Failed to download PDF:", error);
      alert("Failed to download PDF");
    }
  };

  // Summary stats
  const totalAmount = filteredInvoices.reduce((sum, inv) => sum + toSafeNumber(inv.total_amount), 0);
  const averageAmount = filteredInvoices.length > 0 ? totalAmount / filteredInvoices.length : 0;

  return (
    <div className="w-full">
      {showPrintView && (
        <PrintView
          onComplete={() => setShowPrintView(false)}
          invoices={invoicesToPrint}
          visibleColumns={visibleColumns}
          formatCurrency={formatCurrency}
          formatDate={formatDate}
          companyName={company?.name || ''}
        />
      )}

      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Proforma Invoices
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Manage proforma invoices for quotations
            </p>
          </div>
          <button
            onClick={() => router.push('/sales/proforma-invoices/new')}
            className="px-4 py-2 transition bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            New Proforma Invoice
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="px-6 py-6 bg-gray-50 dark:bg-gray-900">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Total Invoices */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {filteredInvoices.length.toLocaleString()}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Total Invoices
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
                <FileDigit className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </div>

          {/* Total Amount */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(totalAmount)}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Total Amount
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </div>

          {/* Average Amount */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-blue-600">
                  {formatCurrency(averageAmount)}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Average Invoice Value
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-blue-600 dark:text-blue-400" />
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
                placeholder="Search by invoice #, customer, or reference..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch(e)}
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors flex items-center gap-2"
            >
              <Filter className="w-5 h-5" />
              Date Filter
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
                  {Object.entries(visibleColumns).map(([key, value]) => (
                    <label key={key} className="flex items-center gap-2 text-sm mb-2 last:mb-0 cursor-pointer text-gray-700 dark:text-gray-300">
                      <input
                        type="checkbox"
                        checked={value}
                        onChange={() => toggleColumn(key as keyof typeof visibleColumns)}
                        className="rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
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
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* From Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                From Date
              </label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            {/* To Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                To Date
              </label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
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
        <div className="overflow-x-auto md:overflow-x-hidden">
          <table className="w-full min-w-[980px] md:min-w-full table-fixed">
            <thead className="bg-gray-200 dark:bg-gray-700/50">
              <tr className="text-sm font-semibold text-gray-600 dark:text-gray-300">
                <th className="text-left px-3 py-3 w-[60px]">
                  S.No
                </th>
                {visibleColumns.invoiceNumber && (
                  <th className="text-left px-3 py-3 w-[120px]">
                    Invoice #
                  </th>
                )}
                {visibleColumns.customer && (
                  <th className="text-left px-3 py-3 w-[200px]">
                    Customer
                  </th>
                )}
                {visibleColumns.date && (
                  <th className="text-left px-3 py-3 w-[110px]">
                    Date
                  </th>
                )}
                {visibleColumns.dueDate && (
                  <th className="text-left px-3 py-3 w-[110px]">
                    Due Date
                  </th>
                )}
                {visibleColumns.reference && (
                  <th className="text-left px-3 py-3 w-[120px]">
                    Reference
                  </th>
                )}
                {visibleColumns.amount && (
                  <th className="text-right px-3 py-3 w-[120px]">
                    Amount
                  </th>
                )}
                {visibleColumns.actions && (
                  <th className="w-[52px] min-w-[52px] max-w-[52px] text-center px-1 py-3">
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
                      <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
                    </div>
                  </td>
                </tr>
              ) : filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={Object.values(visibleColumns).filter(Boolean).length + 1} className="px-6 py-8 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <FileDigit className="w-12 h-12 text-gray-400 mb-2" />
                      <p className="text-lg font-medium text-gray-900 dark:text-white mb-1">
                        No proforma invoices found
                      </p>
                      <p className="text-gray-500 dark:text-gray-400 mb-4">
                        {search || fromDate || toDate ?
                          "No invoices found matching your filters. Try adjusting your search criteria." :
                          "Create your first proforma invoice to get started."}
                      </p>
                      <button
                        onClick={() => router.push('/sales/proforma-invoices/new')}
                        className="text-indigo-600 hover:underline dark:text-indigo-400"
                      >
                        Create your first invoice
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                pagedInvoices.map((invoice, index) => {
                  return (
                    <tr
                      key={invoice.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <td className="px-3 py-4 align-top text-gray-700 dark:text-gray-300">
                        {(currentPage - 1) * pageSize + index + 1}
                      </td>
                      {visibleColumns.invoiceNumber && (
                        <td className="px-3 py-4 align-top">
                          <Link
                            href={`/sales/proforma-invoices/${invoice.id}`}
                            className="font-medium text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                          >
                            {invoice.invoice_number}
                          </Link>
                        </td>
                      )}
                      {visibleColumns.customer && (
                        <td className="px-3 py-4 align-top">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
                            <span className="truncate max-w-[160px]">
                              {invoice.customer_name || '-'}
                            </span>
                          </div>
                        </td>
                      )}
                      {visibleColumns.date && (
                        <td className="px-3 py-4 align-top">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
                            <span>{formatDate(invoice.proforma_date)}</span>
                          </div>
                        </td>
                      )}
                      {visibleColumns.dueDate && (
                        <td className="px-3 py-4 align-top">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
                            <span>{invoice.due_date ? formatDate(invoice.due_date) : '-'}</span>
                          </div>
                        </td>
                      )}
                      {visibleColumns.reference && (
                        <td className="px-3 py-4 align-top text-gray-700 dark:text-gray-300">
                          {invoice.reference_no || '-'}
                        </td>
                      )}
                      {visibleColumns.amount && (
                        <td className="px-3 py-4 align-top text-right font-medium text-gray-900 dark:text-white">
                          {formatCurrency(invoice.total_amount)}
                        </td>
                      )}
                      {visibleColumns.actions && (
                        <td className="w-[52px] min-w-[52px] max-w-[52px] px-1 py-4 text-center align-top">
                          <div className="relative action-dropdown-container inline-flex justify-center w-full">
                            <button
                              onClick={() =>
                                setActiveActionMenu(
                                  activeActionMenu === invoice.id ? null : invoice.id
                                )
                              }
                              className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-50 dark:hover:text-gray-300 dark:hover:bg-gray-700/50 transition-all duration-200"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>

                            {activeActionMenu === invoice.id && (
                              <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg shadow-xl py-1 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                                <Link
                                  href={`/sales/proforma-invoices/${invoice.id}`}
                                  onClick={() => setActiveActionMenu(null)}
                                  className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                                >
                                  <Eye className="w-4 h-4 text-gray-400" />
                                  <span>View Details</span>
                                </Link>

                                <Link
                                  href={`/sales/proforma-invoices/${invoice.id}/edit`}
                                  onClick={() => setActiveActionMenu(null)}
                                  className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                                >
                                  <Edit className="w-4 h-4 text-gray-400" />
                                  <span>Edit</span>
                                </Link>

                                <button
                                  onClick={() => {
                                    handleConvert(invoice.id);
                                    setActiveActionMenu(null);
                                  }}
                                  className="flex w-full items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                                >
                                  <CreditCard className="w-4 h-4 text-gray-400" />
                                  <span>Convert to Invoice</span>
                                </button>

                                <button
                                  onClick={() => {
                                    handlePdf(invoice.id, invoice.invoice_number);
                                    setActiveActionMenu(null);
                                  }}
                                  className="flex w-full items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                                >
                                  <Download className="w-4 h-4 text-gray-400" />
                                  <span>Download PDF</span>
                                </button>

                                <div className="my-1 border-t border-gray-100 dark:border-gray-700"></div>
                                <button
                                  onClick={() => {
                                    if (confirm(`Are you sure you want to delete proforma invoice ${invoice.invoice_number}?`)) {
                                      handleDelete(invoice.id);
                                      setActiveActionMenu(null);
                                    }
                                  }}
                                  className="flex w-full items-center gap-3 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  <span>Delete Invoice</span>
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

      {/* Pagination */}
      {!loading && filteredInvoices.length > 0 && (
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, filteredInvoices.length)} of {filteredInvoices.length} invoices
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
