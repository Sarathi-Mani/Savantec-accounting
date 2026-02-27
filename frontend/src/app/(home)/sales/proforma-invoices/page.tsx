"use client";

import { useAuth } from "@/context/AuthContext";
import dayjs from "dayjs";
import Link from "next/link";
import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { employeesApi, payrollApi, proformaInvoicesApi } from "@/services/api";
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

        <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #ddd' }}>
          <thead>
            <tr style={{ backgroundColor: '#f3f4f6', borderBottom: '2px solid #ddd' }}>
              {visibleColumns.invoiceNumber && (
                <th style={{ padding: '12px', textAlign: 'left', borderRight: '1px solid #ddd', fontWeight: 'bold' }}>Invoice #</th>
              )}
              {visibleColumns.customer && (
                <th style={{ padding: '12px', textAlign: 'left', borderRight: '1px solid #ddd', fontWeight: 'bold' }}>Customer</th>
              )}
              {visibleColumns.date && (
                <th style={{ padding: '12px', textAlign: 'left', borderRight: '1px solid #ddd', fontWeight: 'bold' }}>Date</th>
              )}
              {visibleColumns.dueDate && (
                <th style={{ padding: '12px', textAlign: 'left', borderRight: '1px solid #ddd', fontWeight: 'bold' }}>Due Date</th>
              )}
              {visibleColumns.reference && (
                <th style={{ padding: '12px', textAlign: 'left', borderRight: '1px solid #ddd', fontWeight: 'bold' }}>Reference</th>
              )}
              {visibleColumns.amount && (
                <th style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold' }}>Amount</th>
              )}
            </tr>
          </thead>
          <tbody>
            {invoices.map((invoice, index) => (
              <tr key={invoice.id} style={{ borderBottom: '1px solid #ddd', backgroundColor: index % 2 === 0 ? '#fff' : '#f9f9f9' }}>
                {visibleColumns.invoiceNumber && (
                  <td style={{ padding: '12px', borderRight: '1px solid #ddd' }}>{invoice.invoice_number}</td>
                )}
                {visibleColumns.customer && (
                  <td style={{ padding: '12px', borderRight: '1px solid #ddd' }}>{invoice.customer_name || '-'}</td>
                )}
                {visibleColumns.date && (
                  <td style={{ padding: '12px', borderRight: '1px solid #ddd' }}>{formatDate(invoice.proforma_date)}</td>
                )}
                {visibleColumns.dueDate && (
                  <td style={{ padding: '12px', borderRight: '1px solid #ddd' }}>{invoice.due_date ? formatDate(invoice.due_date) : '-'}</td>
                )}
                {visibleColumns.reference && (
                  <td style={{ padding: '12px', borderRight: '1px solid #ddd' }}>{invoice.reference_no || '-'}</td>
                )}
                {visibleColumns.amount && (
                  <td style={{ padding: '12px', textAlign: 'right' }}>{formatCurrency(invoice.total_amount)}</td>
                )}
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ marginTop: '30px', paddingTop: '20px', borderTop: '1px solid #ddd', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '12px', color: '#666' }}>Total Invoices: {invoices.length}</div>
          <div style={{ fontSize: '12px', color: '#666' }}>Page 1 of 1</div>
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
  reference_date?: string;
  subtotal: number;
  total_tax: number;
  total_amount: number;
  notes?: string;
  terms?: string;
  freight_charges?: number;
  pf_charges?: number;
  round_off?: number;
  discount_on_all?: number;
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
  sales_person_id?: string;
  sales_person_name?: string;
  contact_id?: string;
  contact_name?: string;
  cgst_amount?: number;
  sgst_amount?: number;
  igst_amount?: number;
  customer_gstin?: string;
  customer_address?: string;
  customer_phone?: string;
  shipping_address?: string;
  bank_name?: string;
  bank_branch?: string;
  bank_account_number?: string;
  bank_ifsc?: string;
  items?: Array<{
    item_code?: string;
    item_name?: string;
    description?: string;
    hsn_code?: string;
    quantity?: number;
    unit?: string;
    unit_price?: number;
    discount_percent?: number;
    discount_amount?: number;
    gst_rate?: number;
    taxable_amount?: number;
    total_amount?: number;
  }>;
  created_at: string;
}

// Local formatter functions
const formatDate = (dateString: string): string => {
  if (!dateString) return '-';
  try {
    return dayjs(dateString).format('DD-MM-YYYY');
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

// ─── Number to Words (Indian format) ─────────────────────────────────────────
function numberToWords(num: number): string {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function twoDigit(n: number): string {
    if (n < 20) return ones[n];
    return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + ones[n % 10] : '');
  }
  function threeDigit(n: number): string {
    if (n < 100) return twoDigit(n);
    return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' and ' + twoDigit(n % 100) : '');
  }

  const n = Math.floor(num);
  if (n === 0) return 'Zero';

  const crore = Math.floor(n / 10000000);
  const lakh = Math.floor((n % 10000000) / 100000);
  const thousand = Math.floor((n % 100000) / 1000);
  const hundred = n % 1000;

  const parts: string[] = [];
  if (crore) parts.push(threeDigit(crore) + ' Crore');
  if (lakh) parts.push(twoDigit(lakh) + ' Lakh');
  if (thousand) parts.push(twoDigit(thousand) + ' Thousand');
  if (hundred) parts.push(threeDigit(hundred));

  return 'INR ' + parts.join(' ') + ' Rupees Only';
}

const PROFORMA_PDF_LOGO_PATH = "/images/logo/savantec_logo.png";
let proformaLogoDataUrlCache: string | null = null;

const getProformaLogoDataUrl = async (): Promise<string | null> => {
  if (proformaLogoDataUrlCache) return proformaLogoDataUrlCache;
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
      image.onerror = () => reject(new Error("Failed to load logo"));
      image.src = PROFORMA_PDF_LOGO_PATH;
    });

    proformaLogoDataUrlCache = dataUrl;
    return dataUrl;
  } catch (error) {
    console.warn("Failed to load proforma PDF logo:", error);
    return null;
  }
};

const drawProformaPdfLogo = (
  doc: jsPDF,
  logoDataUrl: string | null,
  orientation: "p" | "l",
  align: "left" | "right" = "right"
) => {
  if (!logoDataUrl) return;
  const pageWidth = orientation === "l" ? 297 : 210;
  const logoWidth = orientation === "l" ? 32 : 30;
  const logoHeight = 14;
  const x = align === "left" ? 10 : pageWidth - logoWidth - 10;
  const y = 4;
  doc.addImage(logoDataUrl, "PNG", x, y, logoWidth, logoHeight);
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
          headers: { Authorization: `Bearer ${token}` },
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
          headers: { Authorization: `Bearer ${token}` },
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

  useEffect(() => { fetchInvoices(); }, [company?.id]);

  useEffect(() => {
    if (company?.id) setCachedExportData(null);
  }, [fromDate, toDate]);

  useEffect(() => { setCurrentPage(1); }, [fromDate, toDate, search]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element | null;
      if (!target) return;
      if (!target.closest(".action-dropdown-container")) setActiveActionMenu(null);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const handleColumnDropdownOutside = (event: Event) => {
      const target = event.target as Element | null;
      if (!target) return;
      if (!target.closest(".column-dropdown-container")) setShowColumnDropdown(false);
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

  const fmtMoney = (value: unknown) =>
    new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(toSafeNumber(value));

  const getExportData = async (): Promise<ProformaInvoice[]> => {
    if (cachedExportData) return cachedExportData;
    return await fetchAllInvoicesForExport();
  };

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); };

  const handleReset = () => {
    setSearch("");
    setFromDate("");
    setToDate("");
    fetchInvoices();
  };

  // Apply search and date filters locally
  const filteredInvoices = invoices.filter(invoice => {
    if (fromDate && invoice.proforma_date) {
      if (dayjs(invoice.proforma_date).isBefore(dayjs(fromDate), 'day')) return false;
    }
    if (toDate && invoice.proforma_date) {
      if (dayjs(invoice.proforma_date).isAfter(dayjs(toDate), 'day')) return false;
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
  const pagedInvoices = filteredInvoices.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // ─── Export functions (unchanged) ────────────────────────────────────────────
  const copyToClipboard = async () => {
    if (copyLoading) return;
    setCopyLoading(true);
    try {
      const allData = await getExportData();
      let filtered = [...allData];
      if (fromDate) filtered = filtered.filter(inv => dayjs(inv.proforma_date).isAfter(dayjs(fromDate).subtract(1, 'day')));
      if (toDate) filtered = filtered.filter(inv => dayjs(inv.proforma_date).isBefore(dayjs(toDate).add(1, 'day')));
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
        if (visibleColumns.invoiceNumber) { if (!headers.includes("Invoice #")) headers.push("Invoice #"); row.push(invoice.invoice_number); }
        if (visibleColumns.customer) { if (!headers.includes("Customer")) headers.push("Customer"); row.push(invoice.customer_name || "-"); }
        if (visibleColumns.date) { if (!headers.includes("Date")) headers.push("Date"); row.push(formatDate(invoice.proforma_date)); }
        if (visibleColumns.dueDate) { if (!headers.includes("Due Date")) headers.push("Due Date"); row.push(invoice.due_date ? formatDate(invoice.due_date) : "-"); }
        if (visibleColumns.reference) { if (!headers.includes("Reference")) headers.push("Reference"); row.push(invoice.reference_no || "-"); }
        if (visibleColumns.amount) { if (!headers.includes("Amount")) headers.push("Amount"); row.push(formatCurrency(invoice.total_amount)); }
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
      if (fromDate) filtered = filtered.filter(inv => dayjs(inv.proforma_date).isAfter(dayjs(fromDate).subtract(1, 'day')));
      if (toDate) filtered = filtered.filter(inv => dayjs(inv.proforma_date).isBefore(dayjs(toDate).add(1, 'day')));
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
        if (visibleColumns.invoiceNumber) row["Invoice #"] = invoice.invoice_number;
        if (visibleColumns.customer) row["Customer"] = invoice.customer_name || "-";
        if (visibleColumns.date) row["Date"] = formatDate(invoice.proforma_date);
        if (visibleColumns.dueDate) row["Due Date"] = invoice.due_date ? formatDate(invoice.due_date) : "-";
        if (visibleColumns.reference) row["Reference"] = invoice.reference_no || "-";
        if (visibleColumns.amount) { row["Amount"] = invoice.total_amount; row["Amount (Formatted)"] = formatCurrency(invoice.total_amount); }
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
      if (fromDate) filtered = filtered.filter(inv => dayjs(inv.proforma_date).isAfter(dayjs(fromDate).subtract(1, 'day')));
      if (toDate) filtered = filtered.filter(inv => dayjs(inv.proforma_date).isBefore(dayjs(toDate).add(1, 'day')));
      if (search) {
        const searchLower = search.toLowerCase();
        filtered = filtered.filter(inv =>
          inv.invoice_number?.toLowerCase().includes(searchLower) ||
          inv.customer_name?.toLowerCase().includes(searchLower) ||
          inv.reference_no?.toLowerCase().includes(searchLower)
        );
      }
      const doc = new jsPDF("landscape");
      const logoDataUrl = await getProformaLogoDataUrl();
      const tableTheme = getProfessionalTableTheme(doc, "Proforma Invoices List", company?.name || "", "l");
      const headers: string[] = [];
      const body = filtered.map(invoice => {
        const row: string[] = [];
        if (visibleColumns.invoiceNumber) { if (!headers.includes("Invoice #")) headers.push("Invoice #"); row.push(invoice.invoice_number); }
        if (visibleColumns.customer) { if (!headers.includes("Customer")) headers.push("Customer"); row.push(invoice.customer_name || "-"); }
        if (visibleColumns.date) { if (!headers.includes("Date")) headers.push("Date"); row.push(formatDate(invoice.proforma_date)); }
        if (visibleColumns.dueDate) { if (!headers.includes("Due Date")) headers.push("Due Date"); row.push(invoice.due_date ? formatDate(invoice.due_date) : "-"); }
        if (visibleColumns.reference) { if (!headers.includes("Reference")) headers.push("Reference"); row.push(invoice.reference_no || "-"); }
        if (visibleColumns.amount) { if (!headers.includes("Amount")) headers.push("Amount"); row.push(formatCurrency(invoice.total_amount)); }
        return row;
      });
      autoTable(doc, {
        ...tableTheme,
        didDrawPage: () => {
          tableTheme.didDrawPage();
          drawProformaPdfLogo(doc, logoDataUrl, "l", "right");
        },
        head: [headers],
        body: body,
        styles: { fontSize: 9, cellPadding: 3, overflow: "linebreak", font: "helvetica" },
        columnStyles: headers.reduce((acc, header, index) => {
          if (header === "Amount") acc[index] = { halign: 'right' };
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
      if (fromDate) filtered = filtered.filter(inv => dayjs(inv.proforma_date).isAfter(dayjs(fromDate).subtract(1, 'day')));
      if (toDate) filtered = filtered.filter(inv => dayjs(inv.proforma_date).isBefore(dayjs(toDate).add(1, 'day')));
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
        if (visibleColumns.invoiceNumber) row["Invoice #"] = invoice.invoice_number;
        if (visibleColumns.customer) row["Customer"] = invoice.customer_name || "-";
        if (visibleColumns.date) row["Date"] = formatDate(invoice.proforma_date);
        if (visibleColumns.dueDate) row["Due Date"] = invoice.due_date ? formatDate(invoice.due_date) : "-";
        if (visibleColumns.reference) row["Reference"] = invoice.reference_no || "-";
        if (visibleColumns.amount) row["Amount"] = formatCurrency(invoice.total_amount);
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
      if (fromDate) filtered = filtered.filter(inv => dayjs(inv.proforma_date).isAfter(dayjs(fromDate).subtract(1, 'day')));
      if (toDate) filtered = filtered.filter(inv => dayjs(inv.proforma_date).isBefore(dayjs(toDate).add(1, 'day')));
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

  // ─── SAPL-style individual proforma PDF ──────────────────────────────────────
  const getNameFromRecord = (record: any): string => {
    if (!record || typeof record !== "object") return "";
    const fullName = record.full_name || record.name;
    if (typeof fullName === "string" && fullName.trim()) return fullName.trim();
    return [record.first_name, record.last_name].filter(Boolean).join(" ").trim();
  };

  const getPhoneFromRecord = (record: any): string => {
    if (!record || typeof record !== "object") return "";
    const phone =
      record.phone ||
      record.mobile ||
      record.mobile_number ||
      record.phone_number ||
      record.contact_number ||
      record.work_phone ||
      record.office_phone;
    return typeof phone === "string" || typeof phone === "number" ? String(phone).trim() : "";
  };

  const formatNameWithPhone = (name: string, phone: string): string => {
    const n = (name || "").trim();
    const p = (phone || "").trim();
    if (n && p) return `${n} - ${p}`;
    return n || p || "";
  };

  const resolvePdfPartyNames = async (
    invoice: ProformaInvoice,
    fallbackValue: (value: unknown) => string
  ): Promise<{ kindAttnName: string; engineerName: string }> => {
    let kindAttnName = (invoice.contact_name || "").trim();
    let engineerName = (invoice.sales_person_name || "").trim();
    let kindAttnPhone = "";
    let engineerPhone = "";
    const token = getToken();
    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:6768/api";

    if ((!kindAttnName || !kindAttnPhone) && invoice.customer_id && invoice.contact_id && company?.id && token) {
      try {
        const response = await fetch(
          `${apiBase}/companies/${company.id}/customers/${invoice.customer_id}/contact-persons`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (response.ok) {
          const data = await response.json();
          const contacts = Array.isArray(data)
            ? data
            : data?.contact_persons || data?.contacts || data?.data || data?.items || [];
          const matched = Array.isArray(contacts)
            ? contacts.find((contact: any) => String(contact?.id) === String(invoice.contact_id))
            : null;
          if (matched) {
            kindAttnName = matched.name || matched.full_name || matched.email || matched.phone || "";
            kindAttnPhone = getPhoneFromRecord(matched);
          }
        }
      } catch (error) {
        console.warn("Failed to resolve contact person name for proforma PDF:", error);
      }
    }

    if (invoice.sales_person_id && company?.id && (!engineerName || !engineerPhone)) {
      try {
        if (token) {
          const response = await fetch(`${apiBase}/companies/${company.id}/sales-engineers`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (response.ok) {
            const data = await response.json();
            const engineers = Array.isArray(data)
              ? data
              : data?.sales_engineers || data?.data || data?.items || [];
            const matched = Array.isArray(engineers)
              ? engineers.find((emp: any) => String(emp?.id) === String(invoice.sales_person_id))
              : null;
            if (matched) {
              engineerName = getNameFromRecord(matched);
              engineerPhone = getPhoneFromRecord(matched);
            }
          }
        }
      } catch (error) {
        console.warn("Failed to resolve sales engineer name for proforma PDF:", error);
      }

      if (!engineerPhone || !engineerName) {
        try {
          const employees = await employeesApi.list(company.id);
          const matched = Array.isArray(employees)
            ? employees.find((emp: any) => String(emp?.id) === String(invoice.sales_person_id))
            : null;
          if (matched) {
            engineerName = getNameFromRecord(matched);
            engineerPhone = getPhoneFromRecord(matched);
          }
        } catch (error) {
          console.warn("Failed to resolve employee name for proforma PDF:", error);
        }
      }
    }

    if (company?.id && (!engineerPhone || !engineerName)) {
      try {
        const employees = await employeesApi.list(company.id);
        const normalize = (value: unknown) =>
          String(value || "")
            .toLowerCase()
            .replace(/\s+/g, " ")
            .trim();
        const engineerNameKey = normalize(engineerName || invoice.sales_person_name);

        const matched = Array.isArray(employees)
          ? employees.find((emp: any) => {
              const byId =
                invoice.sales_person_id &&
                String(emp?.id) === String(invoice.sales_person_id);
              if (byId) return true;
              if (!engineerNameKey) return false;
              const empName = normalize(
                getNameFromRecord(emp) ||
                emp?.employee_name ||
                emp?.display_name
              );
              return empName === engineerNameKey || empName.includes(engineerNameKey) || engineerNameKey.includes(empName);
            })
          : null;

        if (matched) {
          if (!engineerName) engineerName = getNameFromRecord(matched);
          if (!engineerPhone) engineerPhone = getPhoneFromRecord(matched);
        }
      } catch (error) {
        console.warn("Failed to resolve employee phone for proforma PDF:", error);
      }
    }

    if (company?.id && (!engineerPhone || !engineerName)) {
      try {
        const payrollEmployees = await payrollApi.listEmployees(company.id);
        const normalize = (value: unknown) =>
          String(value || "")
            .toLowerCase()
            .replace(/\s+/g, " ")
            .trim();
        const engineerNameKey = normalize(engineerName || invoice.sales_person_name);

        const matched = Array.isArray(payrollEmployees)
          ? payrollEmployees.find((emp: any) => {
              const byId =
                invoice.sales_person_id &&
                String(emp?.id) === String(invoice.sales_person_id);
              if (byId) return true;
              if (!engineerNameKey) return false;
              const empName = normalize(
                getNameFromRecord(emp) ||
                emp?.employee_name ||
                emp?.display_name
              );
              return empName === engineerNameKey || empName.includes(engineerNameKey) || engineerNameKey.includes(empName);
            })
          : null;

        if (matched) {
          if (!engineerName) engineerName = getNameFromRecord(matched);
          if (!engineerPhone) engineerPhone = getPhoneFromRecord(matched);
        }
      } catch (error) {
        console.warn("Failed to resolve payroll employee phone for proforma PDF:", error);
      }
    }

    if (!kindAttnPhone) {
      kindAttnPhone = ((invoice as any).contact_phone || (invoice as any).contact_mobile || "").trim?.() || "";
    }
    if (!engineerPhone) {
      engineerPhone = ((invoice as any).sales_person_phone || (invoice as any).salesman_phone || "").trim?.() || "";
    }

    const kindAttnLabel = formatNameWithPhone(kindAttnName, kindAttnPhone);
    const engineerLabel = formatNameWithPhone(engineerName, engineerPhone);

    return {
      kindAttnName: kindAttnLabel || kindAttnName || fallbackValue(invoice.contact_id) || "-",
      engineerName: engineerLabel || engineerName || fallbackValue(invoice.sales_person_id) || "-",
    };
  };

  const handlePdf = async (invoiceId: string, invoiceNumber: string) => {
    if (!company?.id) return;
    try {
      const invoice = (await proformaInvoicesApi.get(company.id, invoiceId)) as ProformaInvoice;
      const logoDataUrl = await getProformaLogoDataUrl();

      const doc = new jsPDF("p", "mm", "a4");
      const pageW = 210;
      const marginL = 8;
      const marginR = 8;
      const contentW = pageW - marginL - marginR; // 194mm

      const v = (val: unknown) => (val === undefined || val === null || val === "" ? "-" : String(val));
      const safeFilePart = (s: string) => s.replace(/[\\/:*?"<>|]/g, "_");

      const proformaNo = v(invoice?.invoice_number || invoiceNumber);
      const companyName = company?.name || "Company";
      const { kindAttnName, engineerName } = await resolvePdfPartyNames(invoice, v);

      // ── OUTER BORDER ────────────────────────────────────────────────────────
      let curY = 8;
      const frameTopY = curY;
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.35);

      // ── HEADER: Company logo area + company details ──────────────────────────
      const headerH = 22;
      doc.rect(marginL, curY, contentW, headerH);
      // Vertical divider after logo area
      // doc.line(marginL + 38, curY, marginL + 38, curY + headerH);

      if (logoDataUrl) {
        doc.addImage(logoDataUrl, "PNG", marginL + 2, curY + 2, 33, headerH - 4);
      }

      // Company name & details
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text(companyName, marginL + 40, curY + 6);

      const companyAddress = [company?.address_line1, company?.address_line2, company?.city, company?.state, company?.pincode]
        .filter(Boolean).join(", ");

      doc.setFontSize(7.5);
      doc.setFont("helvetica", "bold");
      let addrLines = doc.splitTextToSize(`Address : ${companyAddress || "-"}`, contentW - 44);
      doc.text(addrLines, marginL + 40, curY + 11);
      doc.text(`Mobile : ${v(company?.phone)}`, marginL + 40, curY + 15.5);
      doc.text(`Email : ${v(company?.email)}`, marginL + 40, curY + 19);
      // GST on right
      doc.setFont("helvetica", "bold");
      doc.text(`GST Number : ${v((company as any)?.gstin)}`, marginL + 120, curY + 19);
      doc.setFont("helvetica", "normal");

      curY += headerH;

      // ── TITLE ROW ───────────────────────────────────────────────────────────
      const titleH = 10;
      doc.rect(marginL, curY, contentW, titleH);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("PROFORMA INVOICE", pageW / 2, curY + 4.5, { align: "center" });
      doc.setFontSize(8);
      doc.text("REMARKS: NOT VALID FOR ANY TAX CLAIMING.", pageW / 2, curY + 8.5, { align: "center" });
      doc.setFont("helvetica", "normal");
      curY += titleH;

      // ── INFO ROW 1: Invoice No | Reference PO | Kind Attn ──────────────────
      const row1H = 7;
      const col1W = 70, col2W = 60, col3W = contentW - col1W - col2W;
      doc.rect(marginL, curY, col1W, row1H);
      doc.rect(marginL + col1W, curY, col2W, row1H);
      doc.rect(marginL + col1W + col2W, curY, col3W, row1H);
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "bold");
      doc.text(`Invoice No. `, marginL + 1.5, curY + 4.5);
      doc.setFont("helvetica", "normal");
      doc.text(proformaNo, marginL + 20, curY + 4.5);
      doc.setFont("helvetica", "bold");
      doc.text(`Reference PO # `, marginL + col1W + 1.5, curY + 4.5);
      doc.setFont("helvetica", "normal");
      doc.text(v(invoice?.reference_no), marginL + col1W + 28, curY + 4.5);
      doc.setFont("helvetica", "bold");
      doc.text(`Kind Attn :`, marginL + col1W + col2W + 1.5, curY + 4.5);
      doc.setFont("helvetica", "normal");
      doc.text(kindAttnName, marginL + col1W + col2W + 17, curY + 4.5);
      curY += row1H;

      // ── INFO ROW 2: Invoice Date | Ref Date | Engineer/Contact ─────────────
      doc.rect(marginL, curY, col1W, row1H);
      doc.rect(marginL + col1W, curY, col2W, row1H);
      doc.rect(marginL + col1W + col2W, curY, col3W, row1H);
      doc.setFont("helvetica", "bold");
      doc.text(`Invoice Date `, marginL + 1.5, curY + 4.5);
      doc.setFont("helvetica", "normal");
      doc.text(formatDate(invoice?.proforma_date || ""), marginL + 22, curY + 4.5);
      doc.setFont("helvetica", "bold");
      doc.text(`Ref Date`, marginL + col1W + 1.5, curY + 4.5);
      doc.setFont("helvetica", "normal");
      doc.text(invoice?.reference_date ? formatDate(invoice.reference_date) : "-", marginL + col1W + 20, curY + 4.5);
      doc.setFont("helvetica", "bold");
      doc.text(`Engineer : `, marginL + col1W + col2W + 1.5, curY + 4.5);
      doc.setFont("helvetica", "normal");
      doc.text(engineerName, marginL + col1W + col2W + 18, curY + 4.5);
      curY += row1H;

      // ── CUSTOMER DETAILS | SHIPPING ADDRESS headers ─────────────────────────
      const custHdrH = 6;
      const halfW = contentW / 2;
      doc.rect(marginL, curY, halfW, custHdrH);
      doc.rect(marginL + halfW, curY, halfW, custHdrH);
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text("Customer Details", marginL + 1.5, curY + 4);
      doc.text("Shipping Address", marginL + halfW + 1.5, curY + 4);
      doc.setFont("helvetica", "normal");
      curY += custHdrH;

      // ── CUSTOMER DETAILS | SHIPPING ADDRESS content ──────────────────────────
      const custContentH = 22;
      doc.rect(marginL, curY, halfW, custContentH);
      doc.rect(marginL + halfW, curY, halfW, custContentH);

      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text(v(invoice?.customer_name), marginL + 1.5, curY + 5);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);

      const custAddr = v(invoice?.customer_address);
      const custAddrLines = doc.splitTextToSize(custAddr, halfW - 3);
      doc.text(custAddrLines.slice(0, 3), marginL + 1.5, curY + 10);
      doc.text(`GSTIN : ${v(invoice?.customer_gstin)}`, marginL + 1.5, curY + 20);

      // Shipping = same as customer unless different
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.text(v(invoice?.customer_name), marginL + halfW + 1.5, curY + 5);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      const shipAddr = v(invoice?.shipping_address || invoice?.customer_address);
      const shipAddrLines = doc.splitTextToSize(shipAddr, halfW - 3);
      doc.text(shipAddrLines.slice(0, 3), marginL + halfW + 1.5, curY + 10);
      curY += custContentH;

      // ── ITEMS TABLE ──────────────────────────────────────────────────────────
      const items = Array.isArray(invoice?.items) ? invoice.items : [];

      // Build totals row
      let qtyTotal = 0;
      let rateTotal = 0;
      items.forEach(it => {
        qtyTotal += toSafeNumber(it.quantity);
        rateTotal += toSafeNumber(it.unit_price);
      });

      const itemBody: any[][] = items.map((item, idx) => [
        String(idx + 1),
        v(item?.description),
        v(item?.item_code || item?.item_name),
        v(item?.hsn_code),
        `${toSafeNumber(item?.quantity).toFixed(2)}`,
        v(item?.unit) || "NOS",
        fmtMoney(item?.unit_price),
        `${toSafeNumber(item?.discount_percent).toFixed(0)}%`,
        fmtMoney(item?.total_amount),
      ]);

      // Pad to at least 10 rows
      while (itemBody.length < 10) {
        itemBody.push(["", "", "", "", "", "", "", "", ""]);
      }

      // Total row with SL#/Description/Model/HSN merged.
      itemBody.push([
        { content: "Total", colSpan: 4, styles: { halign: "center", fontStyle: "bold" } },
        fmtMoney(qtyTotal),
        "",
        fmtMoney(rateTotal),
        "0.00",
        fmtMoney(invoice?.subtotal),
      ]);

      autoTable(doc, {
        startY: curY,
        head: [["SL#", "Description", "Model No", "HSN/SAC", "Qty", "UOM", "Item Rate", "Discount %", "Amount"]],
        body: itemBody,
        theme: "grid",
        styles: {
          fontSize: 7.5,
          cellPadding: 1.5,
          lineColor: [0, 0, 0],
          lineWidth: 0.3,
          textColor: [0, 0, 0],
          font: "helvetica",
        },
        headStyles: {
          fillColor: [255, 255, 255],
          textColor: [0, 0, 0],
          fontStyle: "bold",
          fontSize: 7.5,
          halign: "center",
          lineColor: [0, 0, 0],
          lineWidth: 0.3,
        },
        columnStyles: {
          0: { halign: "center", cellWidth: 8 },
          1: { halign: "left", cellWidth: 48 },
          2: { halign: "left", cellWidth: 22 },
          3: { halign: "center", cellWidth: 18 },
          4: { halign: "right", cellWidth: 14 },
          5: { halign: "center", cellWidth: 14 },
          6: { halign: "right", cellWidth: 22 },
          7: { halign: "right", cellWidth: 20 },
          8: { halign: "right", cellWidth: 28 },
        },
        // Bold last (total) row
        didParseCell: (data) => {
          if (data.section === "head") {
            data.cell.styles.lineWidth = { top: 0.3, right: 0.3, bottom: 0.3, left: 0.3 };
          }
          // Remove per-item horizontal separators to match SAPL format.
          if (data.section === "body") {
            const isTotalRow = data.row.index === itemBody.length - 1;
            const isFirstBodyRow = data.row.index === 0;
            if (!isTotalRow) {
              data.cell.styles.lineWidth = { top: isFirstBodyRow ? 0.3 : 0, right: 0.3, bottom: 0, left: 0.3 };
            } else {
              data.cell.styles.lineWidth = { top: 0.3, right: 0.3, bottom: 0.3, left: 0.3 };
            }
          }
          if (data.row.index === itemBody.length - 1) {
            data.cell.styles.fontStyle = "bold";
          }
        },
        didDrawCell: (data) => {
          if (data.section === "head" && data.row.index === 0 && data.column.index === 8) {
            const y = data.cell.y + data.cell.height;
            doc.setDrawColor(0, 0, 0);
            doc.setLineWidth(0.3);
            doc.line(marginL, y, pageW - marginR, y);
          }
        },
        margin: { left: marginL, right: marginR },
      });

      curY = (doc as any).lastAutoTable?.finalY ?? curY;

      // ── BANK DETAILS + TOTALS SECTION ────────────────────────────────────────
      const totalsW = 62;
      const bankW = contentW - totalsW;
      const totalsX = marginL + bankW;

      // Calculate heights needed
      const bankLines = [
        `BANK NAME : ${v(invoice?.bank_name || (company as any)?.bank_name)}`,
        `BRANCH : ${v(invoice?.bank_branch || (company as any)?.bank_branch)}`,
        `A/C NO : ${v(invoice?.bank_account_number || (company as any)?.account_number)}`,
        `IFSC CODE : ${v(invoice?.bank_ifsc || (company as any)?.ifsc_code)}`,
      ];

      // Totals rows
      const cgst = toSafeNumber(invoice?.cgst_amount);
      const sgst = toSafeNumber(invoice?.sgst_amount);
      const igst = toSafeNumber(invoice?.igst_amount);

      const totalsRows: [string, string][] = [
        ["Subtotal", fmtMoney(invoice?.subtotal)],
        ["Freight Charges", fmtMoney(invoice?.freight_charges)],
        ["CGST", fmtMoney(cgst)],
        ["SGST", fmtMoney(sgst)],
      ];
      if (igst > 0) totalsRows.push(["IGST", fmtMoney(igst)]);
      totalsRows.push(["Round Off", fmtMoney(invoice?.round_off)]);
      totalsRows.push(["Grand Total", fmtMoney(invoice?.total_amount)]);

      const totalRowH = 5.1;
      const totalsBlockH = totalsRows.length * totalRowH;
      const bankBlockH = totalsBlockH + 10;

      // Bank details heading is rendered inside the left block (no separate strip row).

      // Bank details block
      doc.rect(marginL, curY, bankW, bankBlockH);
      doc.setFontSize(8.6);
      doc.setFont("helvetica", "bold");
      doc.text("Bank Details", marginL + 1.5, curY + 4.8);
      doc.setFontSize(8.2);
      bankLines.forEach((line, i) => {
        const [labelRaw, ...valueParts] = line.split(":");
        const label = `${labelRaw || ""} :`;
        const value = valueParts.join(":").trim();
        const lineY = curY + 9 + i * 4.6;

        doc.setFont("helvetica", "bold");
        doc.text(label, marginL + 1.5, lineY);
        doc.setFont("helvetica", "normal");
        doc.text(value || "-", marginL + 30, lineY);
      });

      // Totals block (right side)
      totalsRows.forEach((row, i) => {
        const rowY = curY + i * totalRowH;
        doc.rect(totalsX, rowY, totalsW, totalRowH);
        doc.line(totalsX + 35, rowY, totalsX + 35, rowY + totalRowH); // divider
        doc.setFontSize(8.3);
        doc.setFont("helvetica", "bold");
        // Label (right-aligned in label col)
        doc.text(row[0], totalsX + 34, rowY + totalRowH / 2 + 1.5, { align: "right" });
        // Value (right-aligned in value col)
        doc.text(row[1], totalsX + totalsW - 1.5, rowY + totalRowH / 2 + 1.5, { align: "right" });
      });

      // keep current Y; remarks are drawn inside bank details block

      // ── REMARKS + AMOUNT IN WORDS ────────────────────────────────────────────
      const remarksY = curY + Math.max(9, bankBlockH - 13.5);
      // doc.line(marginL, remarksY, marginL + bankW, remarksY);
      doc.setFontSize(8.4);
      doc.setFont("helvetica", "bold");
      doc.text("Remarks :", marginL + 1.5, remarksY + 4.5);
      const remarksValue = v(invoice?.notes || invoice?.terms || "Payment Terms:");
      const remarksLine = doc.splitTextToSize(remarksValue, bankW - 21)[0] || "-";
      const cleanedRemarksLine = remarksLine.replace(/^\s*\d+[\.\)]\s*/, "");
      doc.text(cleanedRemarksLine, marginL + 18.5, remarksY + 4.5);
      const amtWords = numberToWords(toSafeNumber(invoice?.total_amount));
      doc.setFont("helvetica", "normal");
      doc.text("Bill Amount in words:", marginL + 1.5, remarksY + 12.5);
      doc.setFont("helvetica", "bolditalic");
      doc.text(amtWords, marginL + 33, remarksY + 12.5);
      doc.setFont("helvetica", "normal");
      curY += bankBlockH;

      // ── TERMS & CONDITIONS + AUTHORIZED SIGNATORY ───────────────────────────
      const termsH = 38;
      doc.rect(marginL, curY, bankW, termsH);
      doc.rect(totalsX, curY, totalsW, termsH);

      doc.setFontSize(8.2);
      doc.setFont("helvetica", "bold");
      doc.text("Terms & Conditions", marginL + 1.5, curY + 5);
      const defaultTerms = [
        "1. All Payments should be made direct to the company or its authorized representative by cheque/RTGS.",
        "2. All disputes subject to Chennai Jurisdiction,",
        "3. Goods once sold will not be taken back.",
      ];
      const customTerms = String(invoice?.terms || "")
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);
      const termsToPrint = customTerms.length ? customTerms : defaultTerms;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.9);
      let termY = curY + 9;
      termsToPrint.slice(0, 6).forEach((line) => {
        const lineText = line;
        const wrapped = doc.splitTextToSize(lineText, bankW - 3);
        wrapped.forEach((w: string) => {
          if (termY <= curY + termsH - 3) {
            doc.text(w, marginL + 1.5, termY);
            termY += 3.9;
          }
        });
      });

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.text(`for ${companyName}`, totalsX + totalsW - 2, curY + 5.5, { align: "right" });
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10.2);
      doc.text("Authorised Signatory", totalsX + totalsW - 2, curY + termsH - 2.2, { align: "right" });
      doc.setFont("helvetica", "normal");
      curY += termsH;

      // ── FOOTER ───────────────────────────────────────────────────────────────
      const footerH = 6;
      doc.rect(marginL, curY, contentW, footerH);
      doc.setFontSize(8.8);
      doc.setFont("helvetica", "normal");
      doc.text("THIS IS COMPUTER GENERATED INVOICE", pageW / 2, curY + 4, { align: "center" });
      curY += footerH;

      // Continuous outside frame to mirror SAPL sheet style
      doc.setLineWidth(0.45);
      doc.rect(marginL, frameTopY, contentW, curY - frameTopY);

      // Save
      doc.save(`Proforma_${safeFilePart(proformaNo)}.pdf`);
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
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Proforma Invoices</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage proforma invoices for quotations</p>
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
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{filteredInvoices.length.toLocaleString()}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Total Invoices</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
                <FileDigit className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(totalAmount)}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Total Amount</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-blue-600">{formatCurrency(averageAmount)}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Average Invoice Value</p>
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

            <button onClick={copyToClipboard} disabled={copyLoading} className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
              {copyLoading ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-transparent"></div> : <Copy className="w-5 h-5" />}
              Copy
            </button>

            <div className="relative column-dropdown-container">
              <button onClick={() => setShowColumnDropdown(!showColumnDropdown)} className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors flex items-center gap-2">
                Columns
                {showColumnDropdown ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {showColumnDropdown && (
                <div className="absolute right-0 mt-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-3 z-10 min-w-[150px]">
                  {Object.entries(visibleColumns).map(([key, value]) => (
                    <label key={key} className="flex items-center gap-2 text-sm mb-2 last:mb-0 cursor-pointer text-gray-700 dark:text-gray-300">
                      <input type="checkbox" checked={value} onChange={() => toggleColumn(key as keyof typeof visibleColumns)} className="rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500" />
                      <span className="capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <button onClick={exportExcel} disabled={excelLoading} className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
              {excelLoading ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-transparent"></div> : <><FileText className="w-5 h-5" />Excel</>}
            </button>

            <button onClick={exportPDF} disabled={pdfLoading} className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
              {pdfLoading ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-transparent"></div> : <><Download className="w-5 h-5" />PDF</>}
            </button>

            <button onClick={exportCSV} disabled={csvLoading} className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
              {csvLoading ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-transparent"></div> : <><FileText className="w-5 h-5" />CSV</>}
            </button>

            <button onClick={handlePrint} disabled={printLoading} className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
              {printLoading ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-transparent"></div> : <><Printer className="w-5 h-5" />Print</>}
            </button>

            <button onClick={handleReset} className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors flex items-center gap-2">
              <RefreshCw className="w-5 h-5" />
              Reset
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">From Date</label>
              <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">To Date</label>
              <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
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
                <th className="text-left px-3 py-3 w-[60px]">S.No</th>
                {visibleColumns.invoiceNumber && <th className="text-left px-3 py-3 w-[120px]">Invoice #</th>}
                {visibleColumns.customer && <th className="text-left px-3 py-3 w-[200px]">Customer</th>}
                {visibleColumns.date && <th className="text-left px-3 py-3 w-[110px]">Date</th>}
                {visibleColumns.dueDate && <th className="text-left px-3 py-3 w-[110px]">Due Date</th>}
                {visibleColumns.reference && <th className="text-left px-3 py-3 w-[120px]">Reference</th>}
                {visibleColumns.amount && <th className="text-right px-3 py-3 w-[120px]">Amount</th>}
                {visibleColumns.actions && <th className="w-[52px] min-w-[52px] max-w-[52px] text-center px-1 py-3">Actions</th>}
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
                      <p className="text-lg font-medium text-gray-900 dark:text-white mb-1">No proforma invoices found</p>
                      <p className="text-gray-500 dark:text-gray-400 mb-4">
                        {search || fromDate || toDate
                          ? "No invoices found matching your filters."
                          : "Create your first proforma invoice to get started."}
                      </p>
                      <button onClick={() => router.push('/sales/proforma-invoices/new')} className="text-indigo-600 hover:underline dark:text-indigo-400">
                        Create your first invoice
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                pagedInvoices.map((invoice, index) => (
                  <tr key={invoice.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="px-3 py-4 align-top text-gray-700 dark:text-gray-300">
                      {(currentPage - 1) * pageSize + index + 1}
                    </td>
                    {visibleColumns.invoiceNumber && (
                      <td className="px-3 py-4 align-top">
                        <Link href={`/sales/proforma-invoices/${invoice.id}`} className="font-medium text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300">
                          {invoice.invoice_number}
                        </Link>
                      </td>
                    )}
                    {visibleColumns.customer && (
                      <td className="px-3 py-4 align-top">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          <span className="truncate max-w-[160px]">{invoice.customer_name || '-'}</span>
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
                            onClick={() => setActiveActionMenu(activeActionMenu === invoice.id ? null : invoice.id)}
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
                                onClick={() => { handleConvert(invoice.id); setActiveActionMenu(null); }}
                                className="flex w-full items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                              >
                                <CreditCard className="w-4 h-4 text-gray-400" />
                                <span>Convert to Invoice</span>
                              </button>

                              <button
                                onClick={() => { handlePdf(invoice.id, invoice.invoice_number); setActiveActionMenu(null); }}
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
                ))
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
            <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-3 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 text-sm text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700">
              Previous
            </button>
            <div className="text-sm text-gray-700 dark:text-gray-300">Page {currentPage} of {totalPages}</div>
            <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-3 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 text-sm text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700">
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
