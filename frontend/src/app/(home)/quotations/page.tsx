"use client";

import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import dayjs from "dayjs";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef, useCallback } from "react";
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
  Copy,
  Printer,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Eye,
  Edit,
  Trash2,
  MoreVertical,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Users,
  DollarSign,
  Calendar,
  Building,
  User,
  Mail,
  Phone,
  Briefcase,
} from "lucide-react";

interface Quotation {
  id: string;
  quotation_number: string;
  quotation_date: string;
  validity_date: string;
  customer_id: string;
  customer_name: string;
  contact_person: string;
  sales_person_id: string;
  sales_person_name: string;
  status: string;
  subject: string;
  subtotal: number;
  total_tax: number;
  total_amount: number;
  reference: string;
  reference_no: string;
  converted_invoice_id: string | null;
}

interface QuotationListResponse {
  items: Quotation[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

const QUOTATION_STATUS_FILTER_OPTIONS = [
  { value: "open", label: "Open" },
  { value: "closed", label: "Closed" },
  { value: "po_converted", label: "PO Converted" },
  { value: "lost", label: "Lost" },
  { value: "approved", label: "Approved" },
  { value: "converted", label: "Converted" },
] as const;

const isApprovedLikeStatus = (status: string) => {
  const normalized = status.toLowerCase();
  return normalized === "approved" || normalized === "closed";
};

const isConvertedLikeStatus = (status: string) => {
  const normalized = status.toLowerCase();
  return normalized === "converted" || normalized === "po_converted";
};

// Print component for quotations
const PrintView = ({
  quotations,
  formatDate,
  formatCurrency,
  getStatusColor,
  companyName,
  onComplete,
}: {
  quotations: Quotation[];
  formatDate: (dateString: string) => string;
  formatCurrency: (amount: number) => string;
  getStatusColor: (status: string) => string;
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
            Quotations List
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
              <th style={{ padding: '12px', textAlign: 'left', borderRight: '1px solid #ddd', fontWeight: 'bold' }}>
                Quotation Date
              </th>
              <th style={{ padding: '12px', textAlign: 'left', borderRight: '1px solid #ddd', fontWeight: 'bold' }}>
                Status
              </th>
              <th style={{ padding: '12px', textAlign: 'left', borderRight: '1px solid #ddd', fontWeight: 'bold' }}>
                Expire Date
              </th>
              <th style={{ padding: '12px', textAlign: 'left', borderRight: '1px solid #ddd', fontWeight: 'bold' }}>
                Quotation Code
              </th>
              <th style={{ padding: '12px', textAlign: 'left', borderRight: '1px solid #ddd', fontWeight: 'bold' }}>
                Reference No.
              </th>
              <th style={{ padding: '12px', textAlign: 'left', borderRight: '1px solid #ddd', fontWeight: 'bold' }}>
                Customer Name
              </th>
              <th style={{ padding: '12px', textAlign: 'left', borderRight: '1px solid #ddd', fontWeight: 'bold' }}>
                Total
              </th>
              <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>
                Salesman
              </th>
            </tr>
          </thead>
          <tbody>
            {quotations.map((quotation, index) => (
              <tr key={quotation.id} style={{
                borderBottom: '1px solid #ddd',
                backgroundColor: index % 2 === 0 ? '#fff' : '#f9f9f9'
              }}>
                <td style={{ padding: '12px', borderRight: '1px solid #ddd' }}>
                  {formatDate(quotation.quotation_date)}
                </td>
                <td style={{ padding: '12px', borderRight: '1px solid #ddd' }}>
                  <span style={{
                    display: 'inline-block',
                    padding: '4px 8px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    backgroundColor: quotation.status === 'draft' ? '#f3f4f6' :
                      quotation.status === 'sent' ? '#dbeafe' :
                      quotation.status === 'approved' ? '#d1fae5' :
                      quotation.status === 'rejected' ? '#fee2e2' :
                      quotation.status === 'expired' ? '#fef3c7' :
                      quotation.status === 'converted' ? '#f3e8ff' :
                      '#f3f4f6',
                    color: quotation.status === 'draft' ? '#374151' :
                      quotation.status === 'sent' ? '#1e40af' :
                      quotation.status === 'approved' ? '#065f46' :
                      quotation.status === 'rejected' ? '#991b1b' :
                      quotation.status === 'expired' ? '#92400e' :
                      quotation.status === 'converted' ? '#6b21a8' :
                      '#374151'
                  }}>
                    {quotation.status}
                  </span>
                </td>
                <td style={{ padding: '12px', borderRight: '1px solid #ddd' }}>
                  {quotation.validity_date ? formatDate(quotation.validity_date) : '-'}
                </td>
                <td style={{ padding: '12px', borderRight: '1px solid #ddd', fontWeight: 'bold' }}>
                  {quotation.quotation_number}
                </td>
                <td style={{ padding: '12px', borderRight: '1px solid #ddd' }}>
                  {quotation.reference_no || '-'}
                </td>
                <td style={{ padding: '12px', borderRight: '1px solid #ddd' }}>
                  {quotation.customer_name || 'Walk-in Customer'}
                </td>
                <td style={{ padding: '12px', borderRight: '1px solid #ddd', fontWeight: 'bold' }}>
                  {formatCurrency(quotation.total_amount)}
                </td>
                <td style={{ padding: '12px' }}>
                  {quotation.sales_person_name || '-'}
                </td>
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
            Total Quotations: {quotations.length}
          </div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            Page 1 of 1
          </div>
        </div>
      </div>
    </div>
  );
};

export default function QuotationsPage() {
  const { company } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<QuotationListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Filters state
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  
  // UI state
  const [showFilters, setShowFilters] = useState(false);
  const [showColumnDropdown, setShowColumnDropdown] = useState(false);
  const [activeActionMenu, setActiveActionMenu] = useState<string | null>(null);
  const [showPrintView, setShowPrintView] = useState(false);
  const [quotationsToPrint, setQuotationsToPrint] = useState<Quotation[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  
  // Action states
  const [converting, setConverting] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  
  // Export loading states
  const [copyLoading, setCopyLoading] = useState(false);
  const [excelLoading, setExcelLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [csvLoading, setCsvLoading] = useState(false);
  const [printLoading, setPrintLoading] = useState(false);
  
  const [cachedExportData, setCachedExportData] = useState<Quotation[] | null>(null);
  
  // Column visibility
  const [visibleColumns, setVisibleColumns] = useState({
    quotationDate: true,
    status: true,
    expireDate: true,
    quotationCode: true,
    referenceNo: true,
    customerName: true,
    total: true,
    salesman: true,
    actions: true,
  });

  const companyId = company?.id || (typeof window !== "undefined" ? localStorage.getItem("company_id") : null);

  const getToken = () => {
    if (typeof window === "undefined") return null;
    return (
      localStorage.getItem("employee_token") || localStorage.getItem("access_token")
    );
  };

  useEffect(() => {
    if (companyId) {
      fetchQuotations();
    }
  }, [companyId]);

  useEffect(() => {
    if (companyId) {
      fetchQuotations();
      setCachedExportData(null);
    }
  }, [statusFilter, fromDate, toDate, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, fromDate, toDate, search]);

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

  const fetchQuotations = async () => {
    const token = getToken();
    if (!companyId || !token) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("page", currentPage.toString());
      params.append("page_size", pageSize.toString());
      if (statusFilter) params.append("status", statusFilter);

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/companies/${companyId}/quotations?${params}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      
      if (response.ok) {
        const result = await response.json();
        setData(result);
        setError("");
      } else {
        const errorText = await response.text();
        console.error("Failed to fetch quotations:", response.status, errorText);
        setError("Failed to load quotations");
      }
    } catch (error) {
      console.error("Failed to fetch quotations:", error);
      setError("Failed to load quotations");
    } finally {
      setLoading(false);
    }
  };

  const fetchAllQuotationsForExport = useCallback(async (): Promise<Quotation[]> => {
    const token = getToken();
    if (!companyId || !token) return [];

    try {
      const params = new URLSearchParams();
      params.append("page", "1");
      params.append("page_size", "1000");
      if (statusFilter) params.append("status", statusFilter);

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/companies/${companyId}/quotations?${params}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) throw new Error("Failed to fetch quotations for export");

      const result = await response.json();
      const list = result?.items || [];
      setCachedExportData(list);
      return list;
    } catch (error) {
      console.error("Export fetch failed:", error);
      return [];
    }
  }, [companyId, statusFilter]);

  const getExportData = async (): Promise<Quotation[]> => {
    if (cachedExportData) return cachedExportData;
    return await fetchAllQuotationsForExport();
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchQuotations();
  };

  const handleReset = () => {
    setSearch("");
    setFromDate("");
    setToDate("");
    setStatusFilter("");
    setCurrentPage(1);
    fetchQuotations();
  };

  const formatDate = (dateString: string): string => {
    if (!dateString) return '-';
    try {
      return dayjs(dateString).format("DD MMM YYYY");
    } catch {
      return '-';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusColor = (status: string): string => {
    switch (status.toLowerCase()) {
      case "draft":
      case "open":
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
      case "sent":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
      case "closed":
      case "approved":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "rejected":
      case "lost":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      case "expired":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
      case "po_converted":
      case "converted":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case "draft":
      case "open":
        return <FileText className="w-3 h-3 mr-1" />;
      case "sent":
        return <Mail className="w-3 h-3 mr-1" />;
      case "closed":
      case "approved":
        return <CheckCircle className="w-3 h-3 mr-1" />;
      case "rejected":
      case "lost":
        return <XCircle className="w-3 h-3 mr-1" />;
      case "expired":
        return <Clock className="w-3 h-3 mr-1" />;
      case "po_converted":
      case "converted":
        return <CheckCircle className="w-3 h-3 mr-1" />;
      default:
        return <AlertCircle className="w-3 h-3 mr-1" />;
    }
  };

  // Apply search filter locally for export data
  const applySearchFilter = (data: Quotation[]): Quotation[] => {
    if (!search) return data;
    
    const searchLower = search.toLowerCase();
    return data.filter(quotation => {
      return (
        quotation.quotation_number?.toLowerCase().includes(searchLower) ||
        quotation.customer_name?.toLowerCase().includes(searchLower) ||
        quotation.reference_no?.toLowerCase().includes(searchLower) ||
        quotation.sales_person_name?.toLowerCase().includes(searchLower) ||
        false
      );
    });
  };

  // Apply filters locally
  const applyFilters = (data: Quotation[]): Quotation[] => {
    let filtered = data;
    
    if (statusFilter) {
      filtered = filtered.filter(quotation => quotation.status === statusFilter);
    }
    
    // Date filters
    if (fromDate) {
      filtered = filtered.filter(quotation => {
        if (!quotation.quotation_date) return false;
        const quoteDate = dayjs(quotation.quotation_date);
        const from = dayjs(fromDate);
        return quoteDate >= from;
      });
    }
    
    if (toDate) {
      filtered = filtered.filter(quotation => {
        if (!quotation.quotation_date) return false;
        const quoteDate = dayjs(quotation.quotation_date);
        const to = dayjs(toDate);
        return quoteDate <= to;
      });
    }
    
    return filtered;
  };

  // Filtered data for current view
  const filteredQuotations = data?.items || [];
  const totalPages = data?.total_pages || 1;
  const totalItems = data?.total || 0;

  // Export functions
  const copyToClipboard = async () => {
    if (copyLoading) return;
    setCopyLoading(true);
    try {
      const allData = await getExportData();
      let filtered = applySearchFilter(allData);
      filtered = applyFilters(filtered);
      
      const headers: string[] = [];
      const rows = filtered.map(quotation => {
        const row: string[] = [];

        if (visibleColumns.quotationDate) {
          if (!headers.includes("Quotation Date")) headers.push("Quotation Date");
          row.push(formatDate(quotation.quotation_date));
        }

        if (visibleColumns.status) {
          if (!headers.includes("Status")) headers.push("Status");
          row.push(quotation.status);
        }

        if (visibleColumns.expireDate) {
          if (!headers.includes("Expire Date")) headers.push("Expire Date");
          row.push(quotation.validity_date ? formatDate(quotation.validity_date) : "-");
        }

        if (visibleColumns.quotationCode) {
          if (!headers.includes("Quotation Code")) headers.push("Quotation Code");
          row.push(quotation.quotation_number);
        }

        if (visibleColumns.referenceNo) {
          if (!headers.includes("Reference No.")) headers.push("Reference No.");
          row.push(quotation.reference_no || "-");
        }

        if (visibleColumns.customerName) {
          if (!headers.includes("Customer Name")) headers.push("Customer Name");
          row.push(quotation.customer_name || "Walk-in Customer");
        }

        if (visibleColumns.total) {
          if (!headers.includes("Total")) headers.push("Total");
          row.push(formatCurrency(quotation.total_amount));
        }

        if (visibleColumns.salesman) {
          if (!headers.includes("Salesman")) headers.push("Salesman");
          row.push(quotation.sales_person_name || "-");
        }

        return row;
      });

      const text = [headers.join("\t"), ...rows.map(r => r.join("\t"))].join("\n");
      await navigator.clipboard.writeText(text);
      alert("Quotation data copied to clipboard");
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
      let filtered = applySearchFilter(allData);
      filtered = applyFilters(filtered);
      
      const exportData = filtered.map(quotation => {
        const row: Record<string, any> = {};

        if (visibleColumns.quotationDate) {
          row["Quotation Date"] = formatDate(quotation.quotation_date);
        }

        if (visibleColumns.status) {
          row["Status"] = quotation.status;
        }

        if (visibleColumns.expireDate) {
          row["Expire Date"] = quotation.validity_date ? formatDate(quotation.validity_date) : "-";
        }

        if (visibleColumns.quotationCode) {
          row["Quotation Code"] = quotation.quotation_number;
        }

        if (visibleColumns.referenceNo) {
          row["Reference No."] = quotation.reference_no || "-";
        }

        if (visibleColumns.customerName) {
          row["Customer Name"] = quotation.customer_name || "Walk-in Customer";
        }

        if (visibleColumns.total) {
          row["Total"] = quotation.total_amount;
        }

        if (visibleColumns.salesman) {
          row["Salesman"] = quotation.sales_person_name || "-";
        }

        return row;
      });

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Quotations");
      XLSX.writeFile(wb, "quotations.xlsx");
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
      let filtered = applySearchFilter(allData);
      filtered = applyFilters(filtered);
      
      const doc = new jsPDF("landscape");
      
      const headers: string[] = [];
      const body = filtered.map(quotation => {
        const row: string[] = [];

        if (visibleColumns.quotationDate) {
          if (!headers.includes("Date")) headers.push("Date");
          row.push(formatDate(quotation.quotation_date));
        }

        if (visibleColumns.status) {
          if (!headers.includes("Status")) headers.push("Status");
          row.push(quotation.status);
        }

        if (visibleColumns.expireDate) {
          if (!headers.includes("Expire")) headers.push("Expire");
          row.push(quotation.validity_date ? formatDate(quotation.validity_date) : "-");
        }

        if (visibleColumns.quotationCode) {
          if (!headers.includes("Code")) headers.push("Code");
          row.push(quotation.quotation_number);
        }

        if (visibleColumns.referenceNo) {
          if (!headers.includes("Reference")) headers.push("Reference");
          row.push(quotation.reference_no || "-");
        }

        if (visibleColumns.customerName) {
          if (!headers.includes("Customer")) headers.push("Customer");
          row.push(quotation.customer_name || "Walk-in Customer");
        }

        if (visibleColumns.total) {
          if (!headers.includes("Total")) headers.push("Total");
          row.push(formatCurrency(quotation.total_amount));
        }

        if (visibleColumns.salesman) {
          if (!headers.includes("Salesman")) headers.push("Salesman");
          row.push(quotation.sales_person_name || "-");
        }

        return row;
      });

      autoTable(doc, {
        ...getProfessionalTableTheme(doc, "Quotations List", company?.name || "", "l"),
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
      doc.save("quotations.pdf");
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
      let filtered = applySearchFilter(allData);
      filtered = applyFilters(filtered);
      
      const exportData = filtered.map(quotation => {
        const row: Record<string, any> = {};

        if (visibleColumns.quotationDate) {
          row["Quotation Date"] = formatDate(quotation.quotation_date);
        }

        if (visibleColumns.status) {
          row["Status"] = quotation.status;
        }

        if (visibleColumns.expireDate) {
          row["Expire Date"] = quotation.validity_date ? formatDate(quotation.validity_date) : "-";
        }

        if (visibleColumns.quotationCode) {
          row["Quotation Code"] = quotation.quotation_number;
        }

        if (visibleColumns.referenceNo) {
          row["Reference No."] = quotation.reference_no || "-";
        }

        if (visibleColumns.customerName) {
          row["Customer Name"] = quotation.customer_name || "Walk-in Customer";
        }

        if (visibleColumns.total) {
          row["Total"] = formatCurrency(quotation.total_amount);
        }

        if (visibleColumns.salesman) {
          row["Salesman"] = quotation.sales_person_name || "-";
        }

        return row;
      });

      const ws = XLSX.utils.json_to_sheet(exportData);
      const csv = XLSX.utils.sheet_to_csv(ws);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      saveAs(blob, "quotations.csv");
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
      let filtered = applySearchFilter(allData);
      filtered = applyFilters(filtered);
      setQuotationsToPrint(filtered);
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

  const handleConvertToInvoice = async (quotationId: string) => {
    const token = getToken();
    if (!companyId || !token || !confirm("Convert this quotation to an invoice?")) return;

    setConverting(quotationId);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/companies/${companyId}/quotations/${quotationId}/convert`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({}),
        }
      );

      if (response.ok) {
        const data = await response.json();
        const invoiceId = data?.invoice_id || data?.converted_invoice_id || data?.id;
        alert("Quotation converted successfully!");
        if (invoiceId) {
          router.push(`/sales/${invoiceId}/edit`);
          return;
        }
        fetchQuotations();
      } else {
        const error = await response.json();
        alert(error.detail || "Failed to convert quotation");
      }
    } catch (error) {
      console.error("Failed to convert quotation:", error);
      alert("Failed to convert quotation");
    } finally {
      setConverting(null);
    }
  };

  const handleDelete = async (quotationId: string) => {
    const token = getToken();
    if (!companyId || !token || !confirm("Are you sure you want to delete this quotation?")) return;

    setDeleting(quotationId);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/companies/${companyId}/quotations/${quotationId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        alert("Quotation deleted successfully!");
        fetchQuotations();
      } else {
        const error = await response.json();
        alert(error.detail || "Failed to delete quotation");
      }
    } catch (error) {
      console.error("Failed to delete quotation:", error);
      alert("Failed to delete quotation");
    } finally {
      setDeleting(null);
    }
  };

  const handleConvertToDC = (quotationId: string) => {
    if (!confirm("Create a Delivery Challan from this quotation?")) return;
    router.push(`/delivery-challans/new?type=dc_out&fromQuotation=${quotationId}`);
  };

  const handleConvertToSalesOrder = (quotationId: string) => {
    if (!confirm("Convert this quotation to a sales order?")) return;
    router.push(`/sales/sales-orders/new?fromQuotation=${quotationId}`);
  };

  const handlePrintQuotation = (quotationId: string) => {
    window.open(`/quotations/${quotationId}/print`, "_blank");
  };

  const handlePDF = (quotationId: string) => {
    window.open(`/quotations/${quotationId}/pdf`, "_blank");
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
          onComplete={() => setShowPrintView(false)}
          quotations={quotationsToPrint}
          formatDate={formatDate}
          formatCurrency={formatCurrency}
          getStatusColor={getStatusColor}
          companyName={company?.name || ''}
        />
      )}

      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Quotations
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Manage your quotations and convert to invoices
            </p>
          </div>
          <button
            onClick={() => router.push('/quotations/new')}
            className="px-4 py-2 transition bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Create Quotation
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="px-6 py-6 bg-gray-50 dark:bg-gray-900">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
          {/* Total Quotations */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {totalItems.toLocaleString()}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Total Quotations
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
                <FileText className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </div>

          {/* Approved */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-green-600">
                  {data?.items?.filter((q) => isApprovedLikeStatus(q.status)).length || 0}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Approved
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </div>

          {/* Draft */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {data?.items?.filter(q => q.status === 'draft').length || 0}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Draft
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>

          {/* Converted */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-purple-600">
                  {data?.items?.filter((q) => isConvertedLikeStatus(q.status)).length || 0}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Converted
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-purple-600 dark:text-purple-400" />
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
                placeholder="Search by code, customer, reference..."
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
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="">All Status</option>
                {QUOTATION_STATUS_FILTER_OPTIONS.map((statusOption) => (
                  <option key={statusOption.value} value={statusOption.value}>
                    {statusOption.label}
                  </option>
                ))}
              </select>
            </div>

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
        <div className="overflow-x-hidden">
          <table className="w-full table-fixed">
            <thead className="bg-gray-200 dark:bg-gray-700/50">
              <tr className="text-sm font-semibold text-gray-600 dark:text-gray-300">
                <th className="text-left px-3 py-3 w-16">
                  S.No
                </th>
                {visibleColumns.quotationDate && (
                  <th className="text-left px-3 py-3">
                    Quotation Date
                  </th>
                )}
                {visibleColumns.status && (
                  <th className="text-left px-3 py-3">
                    Status
                  </th>
                )}
                {visibleColumns.expireDate && (
                  <th className="text-left px-3 py-3">
                    Expire Date
                  </th>
                )}
                {visibleColumns.quotationCode && (
                  <th className="text-left px-3 py-3">
                    Quotation Code
                  </th>
                )}
                {visibleColumns.referenceNo && (
                  <th className="text-left px-3 py-3">
                    Reference No.
                  </th>
                )}
                {visibleColumns.customerName && (
                  <th className="text-left px-3 py-3">
                    Customer Name
                  </th>
                )}
                {visibleColumns.total && (
                  <th className="text-left px-3 py-3">
                    Total
                  </th>
                )}
                {visibleColumns.salesman && (
                  <th className="text-left px-3 py-3">
                    Salesman
                  </th>
                )}
                {visibleColumns.actions && (
                  <th className="text-right px-3 py-3">
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
              ) : filteredQuotations.length === 0 ? (
                <tr>
                  <td colSpan={Object.values(visibleColumns).filter(Boolean).length + 1} className="px-6 py-8 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <FileText className="w-12 h-12 text-gray-400 mb-2" />
                      <p className="text-lg font-medium text-gray-900 dark:text-white mb-1">
                        No quotations found
                      </p>
                      <p className="text-gray-500 dark:text-gray-400 mb-4">
                        {statusFilter || search ?
                          "No quotations found matching your filters. Try adjusting your search criteria." :
                          "Create your first quotation to get started."}
                      </p>
                      <button
                        onClick={() => router.push('/quotations/new')}
                        className="text-indigo-600 hover:underline dark:text-indigo-400"
                      >
                        Create your first quotation
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredQuotations.map((quotation, index) => {
                  return (
                    <tr
                      key={quotation.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <td className="px-3 py-4 align-top break-words text-gray-700 dark:text-gray-300">
                        {(currentPage - 1) * pageSize + index + 1}
                      </td>
                      
                      {visibleColumns.quotationDate && (
                        <td className="px-3 py-4 align-top break-words">
                          <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                            <Calendar className="w-4 h-4 flex-shrink-0 text-gray-400" />
                            <span>{formatDate(quotation.quotation_date)}</span>
                          </div>
                        </td>
                      )}
                      
                      {visibleColumns.status && (
                        <td className="px-3 py-4 align-top break-words">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(quotation.status)}`}
                          >
                            {getStatusIcon(quotation.status)}
                            {quotation.status}
                          </span>
                        </td>
                      )}
                      
                      {visibleColumns.expireDate && (
                        <td className="px-3 py-4 align-top break-words">
                          <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                            <Clock className="w-4 h-4 flex-shrink-0 text-gray-400" />
                            <span>{quotation.validity_date ? formatDate(quotation.validity_date) : '-'}</span>
                          </div>
                        </td>
                      )}
                      
                      {visibleColumns.quotationCode && (
                        <td className="px-3 py-4 align-top break-words">
                          <Link
                            href={`/quotations/${quotation.id}`}
                            className="font-medium text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300"
                          >
                            {quotation.quotation_number}
                          </Link>
                        </td>
                      )}
                      
                      {visibleColumns.referenceNo && (
                        <td className="px-3 py-4 align-top break-words text-gray-700 dark:text-gray-300">
                          {quotation.reference_no || '-'}
                        </td>
                      )}
                      
                      {visibleColumns.customerName && (
                        <td className="px-3 py-4 align-top break-words">
                          <div className="flex items-center gap-2">
                            <Building className="w-4 h-4 text-gray-400" />
                            <span className="truncate max-w-[180px]">
                              {quotation.customer_name || 'Walk-in Customer'}
                            </span>
                          </div>
                        </td>
                      )}
                      
                      {visibleColumns.total && (
                        <td className="px-3 py-4 align-top break-words font-medium text-gray-900 dark:text-white">
                          {formatCurrency(quotation.total_amount)}
                        </td>
                      )}
                      
                      {visibleColumns.salesman && (
                        <td className="px-3 py-4 align-top break-words">
                          <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                            <User className="w-4 h-4 flex-shrink-0 text-gray-400" />
                            <span className="truncate max-w-[120px]">
                              {quotation.sales_person_name || '-'}
                            </span>
                          </div>
                        </td>
                      )}
                      
                      {visibleColumns.actions && (
                        <td className="px-3 py-4 text-right align-top">
                          <div className="relative action-dropdown-container inline-block">
                            <button
                              onClick={() =>
                                setActiveActionMenu(
                                  activeActionMenu === quotation.id ? null : quotation.id
                                )
                              }
                              className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-50 dark:hover:text-gray-300 dark:hover:bg-gray-700/50 transition-all duration-200"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>

                            {activeActionMenu === quotation.id && (
                              <div className="absolute right-0 mt-1 w-56 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg shadow-xl py-1 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                                <Link
                                  href={`/quotations/${quotation.id}`}
                                  onClick={() => setActiveActionMenu(null)}
                                  className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                                >
                                  <Eye className="w-4 h-4 text-gray-400" />
                                  <span>View Details</span>
                                </Link>

                                {quotation.status === "draft" && (
                                  <Link
                                    href={`/quotations/${quotation.id}/edit`}
                                    onClick={() => setActiveActionMenu(null)}
                                    className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                                  >
                                    <Edit className="w-4 h-4 text-gray-400" />
                                    <span>Edit</span>
                                  </Link>
                                )}

                                {quotation.status !== "converted" && !quotation.converted_invoice_id && (
                                  <button
                                    onClick={() => {
                                      handleConvertToInvoice(quotation.id);
                                      setActiveActionMenu(null);
                                    }}
                                    disabled={converting === quotation.id}
                                    className="flex w-full items-center gap-3 px-3 py-2 text-sm text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors disabled:opacity-50"
                                  >
                                    {converting === quotation.id ? (
                                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-purple-600 border-t-transparent" />
                                    ) : (
                                      <CheckCircle className="w-4 h-4" />
                                    )}
                                    <span>Convert to Invoice</span>
                                  </button>
                                )}

                                {quotation.status !== "converted" && (
                                  <button
                                    onClick={() => {
                                      handleConvertToSalesOrder(quotation.id);
                                      setActiveActionMenu(null);
                                    }}
                                    className="flex w-full items-center gap-3 px-3 py-2 text-sm text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
                                  >
                                    <FileText className="w-4 h-4" />
                                    <span>Convert to Sales Order</span>
                                  </button>
                                )}

                                <button
                                  onClick={() => {
                                    handleConvertToDC(quotation.id);
                                    setActiveActionMenu(null);
                                  }}
                                  className="flex w-full items-center gap-3 px-3 py-2 text-sm text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors"
                                >
                                  <FileText className="w-4 h-4" />
                                  <span>Convert to DC</span>
                                </button>

                                <div className="my-1 border-t border-gray-100 dark:border-gray-700"></div>

                                <button
                                  onClick={() => {
                                    handlePrintQuotation(quotation.id);
                                    setActiveActionMenu(null);
                                  }}
                                  className="flex w-full items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                                >
                                  <Printer className="w-4 h-4 text-gray-400" />
                                  <span>Print</span>
                                </button>

                                <button
                                  onClick={() => {
                                    handlePDF(quotation.id);
                                    setActiveActionMenu(null);
                                  }}
                                  className="flex w-full items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                                >
                                  <Download className="w-4 h-4 text-gray-400" />
                                  <span>Download PDF</span>
                                </button>

                                {quotation.status === "draft" && (
                                  <>
                                    <div className="my-1 border-t border-gray-100 dark:border-gray-700"></div>
                                    <button
                                      onClick={() => {
                                        if (confirm("Are you sure you want to delete this quotation?")) {
                                          handleDelete(quotation.id);
                                          setActiveActionMenu(null);
                                        }
                                      }}
                                      disabled={deleting === quotation.id}
                                      className="flex w-full items-center gap-3 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
                                    >
                                      {deleting === quotation.id ? (
                                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-red-600 border-t-transparent" />
                                      ) : (
                                        <Trash2 className="w-4 h-4" />
                                      )}
                                      <span>Delete</span>
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
      {!loading && filteredQuotations.length > 0 && (
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, totalItems)} of {totalItems}
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
