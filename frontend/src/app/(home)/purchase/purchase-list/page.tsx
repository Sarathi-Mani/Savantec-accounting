"use client";

import { useState, useEffect, useRef, type ReactElement } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { saveAs } from "file-saver";
import { addPdfPageNumbers, getProfessionalTableTheme } from "@/utils/pdfTheme";
import { useAuth } from "@/context/AuthContext";
import { purchasesApi, PurchaseInvoice } from "@/services/api";
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
  TrendingUp,
  Package,
  Receipt,
} from "lucide-react";

type PurchaseRow = {
  id: string;
  purchaseDate: string;
  dueDate: string;
  purchaseCode: string;
  purchaseStatus: "Received" | "Pending";
  referenceNo: string;
  supplierName: string;
  total: number;
  currencyCode: string;
  paidAmount: number;
  paymentStatus: "Paid" | "Partial" | "Unpaid";
  rawStatus: string;
};

// Print component for purchase invoices
const PrintView = ({
  purchases,
  visibleColumns,
  formatDate,
  getPaymentStatusBadge,
  getPurchaseStatusBadge,
  isOverdue,
  companyName,
  onComplete,
}: {
  purchases: PurchaseRow[];
  visibleColumns: Record<string, boolean>;
  formatDate: (dateString: string) => string;
  getPaymentStatusBadge: (status: string) => ReactElement | null;
  getPurchaseStatusBadge: (status: string) => ReactElement | null;
  isOverdue: (dueDate: string) => boolean;
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
            Purchase List
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
              {visibleColumns.purchaseDate && (
                <th style={{
                  padding: '12px',
                  textAlign: 'left',
                  borderRight: '1px solid #ddd',
                  fontWeight: 'bold'
                }}>
                  Purchase Date
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
              {visibleColumns.purchaseCode && (
                <th style={{
                  padding: '12px',
                  textAlign: 'left',
                  borderRight: '1px solid #ddd',
                  fontWeight: 'bold'
                }}>
                  Purchase Code
                </th>
              )}
              {visibleColumns.purchaseStatus && (
                <th style={{
                  padding: '12px',
                  textAlign: 'left',
                  borderRight: '1px solid #ddd',
                  fontWeight: 'bold'
                }}>
                  Purchase Status
                </th>
              )}
              {visibleColumns.referenceNo && (
                <th style={{
                  padding: '12px',
                  textAlign: 'left',
                  borderRight: '1px solid #ddd',
                  fontWeight: 'bold'
                }}>
                  Reference No
                </th>
              )}
              {visibleColumns.supplierName && (
                <th style={{
                  padding: '12px',
                  textAlign: 'left',
                  borderRight: '1px solid #ddd',
                  fontWeight: 'bold'
                }}>
                  Supplier Name
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
              {visibleColumns.currencyCode && (
                <th style={{
                  padding: '12px',
                  textAlign: 'left',
                  borderRight: '1px solid #ddd',
                  fontWeight: 'bold'
                }}>
                  Currency
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
              {visibleColumns.paymentStatus && (
                <th style={{
                  padding: '12px',
                  textAlign: 'left',
                  fontWeight: 'bold'
                }}>
                  Payment Status
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {purchases.map((purchase, index) => (
              <tr key={purchase.id} style={{
                borderBottom: '1px solid #ddd',
                backgroundColor: index % 2 === 0 ? '#fff' : '#f9f9f9'
              }}>
                <td style={{
                  padding: '12px',
                  borderRight: '1px solid #ddd'
                }}>
                  {index + 1}
                </td>
                {visibleColumns.purchaseDate && (
                  <td style={{
                    padding: '12px',
                    borderRight: '1px solid #ddd'
                  }}>
                    {formatDate(purchase.purchaseDate)}
                  </td>
                )}
                {visibleColumns.dueDate && (
                  <td style={{
                    padding: '12px',
                    borderRight: '1px solid #ddd'
                  }}>
                    {formatDate(purchase.dueDate)}
                    {isOverdue(purchase.dueDate) && (
                      <div style={{ fontSize: '11px', color: '#dc2626', marginTop: '2px' }}>
                        Overdue
                      </div>
                    )}
                  </td>
                )}
                {visibleColumns.purchaseCode && (
                  <td style={{
                    padding: '12px',
                    borderRight: '1px solid #ddd',
                    fontWeight: 'bold'
                  }}>
                    {purchase.purchaseCode}
                  </td>
                )}
                {visibleColumns.purchaseStatus && (
                  <td style={{
                    padding: '12px',
                    borderRight: '1px solid #ddd'
                  }}>
                    <span style={{
                      display: 'inline-block',
                      padding: '4px 8px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      backgroundColor: purchase.purchaseStatus === 'Received' ? '#dbeafe' : '#fef3c7',
                      color: purchase.purchaseStatus === 'Received' ? '#1e40af' : '#92400e'
                    }}>
                      {purchase.purchaseStatus}
                    </span>
                  </td>
                )}
                {visibleColumns.referenceNo && (
                  <td style={{
                    padding: '12px',
                    borderRight: '1px solid #ddd'
                  }}>
                    {purchase.referenceNo}
                  </td>
                )}
                {visibleColumns.supplierName && (
                  <td style={{
                    padding: '12px',
                    borderRight: '1px solid #ddd'
                  }}>
                    {purchase.supplierName}
                  </td>
                )}
                {visibleColumns.total && (
                  <td style={{
                    padding: '12px',
                    borderRight: '1px solid #ddd',
                    fontWeight: 'bold'
                  }}>
                    Rs. {purchase.total.toLocaleString('en-IN')}
                  </td>
                )}
                {visibleColumns.currencyCode && (
                  <td style={{
                    padding: '12px',
                    borderRight: '1px solid #ddd'
                  }}>
                    {purchase.currencyCode}
                  </td>
                )}
                {visibleColumns.paidAmount && (
                  <td style={{
                    padding: '12px',
                    borderRight: '1px solid #ddd'
                  }}>
                    Rs. {purchase.paidAmount.toLocaleString('en-IN')}
                  </td>
                )}
                {visibleColumns.paymentStatus && (
                  <td style={{ padding: '12px' }}>
                    <span style={{
                      display: 'inline-block',
                      padding: '4px 8px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      backgroundColor: purchase.paymentStatus === 'Paid' ? '#d1fae5' :
                        purchase.paymentStatus === 'Partial' ? '#fef3c7' : '#fee2e2',
                      color: purchase.paymentStatus === 'Paid' ? '#065f46' :
                        purchase.paymentStatus === 'Partial' ? '#92400e' : '#991b1b'
                    }}>
                      {purchase.paymentStatus}
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
            Total Purchases: {purchases.length}
          </div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            Page 1 of 1
          </div>
        </div>
      </div>
    </div>
  );
};

export default function PurchaseListPage() {
  const router = useRouter();
  const { company } = useAuth();

  const [purchases, setPurchases] = useState<PurchaseRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [supplierFilter, setSupplierFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [activeActionMenu, setActiveActionMenu] = useState<string | null>(null);
  const [showPrintView, setShowPrintView] = useState(false);
  const [purchasesToPrint, setPurchasesToPrint] = useState<PurchaseRow[]>([]);

  // Export loading states
  const [copyLoading, setCopyLoading] = useState(false);
  const [excelLoading, setExcelLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [csvLoading, setCsvLoading] = useState(false);
  const [printLoading, setPrintLoading] = useState(false);

  const pageSize = 10;

  // Column visibility state
  const [visibleColumns, setVisibleColumns] = useState({
    purchaseDate: true,
    dueDate: true,
    purchaseCode: true,
    purchaseStatus: true,
    referenceNo: true,
    supplierName: true,
    total: true,
    currencyCode: true,
    paidAmount: true,
    paymentStatus: true,
    actions: true,
  });

  const [showColumnDropdown, setShowColumnDropdown] = useState(false);

  const mapPurchaseToRow = (purchase: PurchaseInvoice): PurchaseRow => {
    const total = Number(purchase.total_amount || 0);
    const paid = Number(purchase.amount_paid || 0);
    const balance = Number(purchase.balance_due || 0);
    const rawStatus = String(purchase.status || "").toLowerCase();
    const purchaseStatus: "Received" | "Pending" =
      rawStatus === "approved" || rawStatus === "paid" || rawStatus === "partially_paid"
        ? "Received"
        : "Pending";
    const paymentStatus: "Paid" | "Partial" | "Unpaid" =
      balance <= 0 ? "Paid" : paid > 0 ? "Partial" : "Unpaid";

    return {
      id: purchase.id,
      purchaseDate: purchase.invoice_date,
      dueDate: purchase.due_date || purchase.invoice_date,
      purchaseCode: purchase.purchase_number || purchase.invoice_number || `PUR-${purchase.id.slice(0, 8).toUpperCase()}`,
      purchaseStatus,
      referenceNo: purchase.vendor_invoice_number || "-",
      supplierName: purchase.vendor_name || "Unknown Vendor",
      total,
      currencyCode: "INR",
      paidAmount: paid,
      paymentStatus,
      rawStatus,
    };
  };

  const fetchPurchases = async () => {
    if (!company?.id) {
      setPurchases([]);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const pageSize = 100;
      let pageNum = 1;
      let allItems: PurchaseInvoice[] = [];

      while (true) {
        const response = await purchasesApi.list(company.id, {
          page: pageNum,
          page_size: pageSize,
          from_date: fromDate || undefined,
          to_date: toDate || undefined,
        });

        const batch = response.items || [];
        allItems = allItems.concat(batch);

        if (pageNum >= (response.total_pages || 1) || batch.length < pageSize) break;
        pageNum += 1;
      }

      setPurchases(allItems.map(mapPurchaseToRow));
    } catch (err) {
      console.error("Failed to load purchases:", err);
      setError("Failed to load purchase invoices from backend");
      setPurchases([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPurchases();
  }, [company?.id, fromDate, toDate]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest(".action-dropdown-container")) {
        setActiveActionMenu(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.column-dropdown-container')) {
        setShowColumnDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const fetchAllPurchasesForExport = async (): Promise<PurchaseRow[]> => {
    if (!company?.id) return [];

    try {
      const pageSize = 100;
      let pageNum = 1;
      let allItems: PurchaseInvoice[] = [];

      while (true) {
        const response = await purchasesApi.list(company.id, {
          page: pageNum,
          page_size: pageSize,
          from_date: fromDate || undefined,
          to_date: toDate || undefined,
          search: searchTerm || undefined,
        });

        const batch = response.items || [];
        allItems = allItems.concat(batch);

        if (pageNum >= (response.total_pages || 1) || batch.length < pageSize) break;
        pageNum += 1;
      }

      return allItems.map(mapPurchaseToRow);
    } catch (error) {
      console.error("Export fetch failed:", error);
      return [];
    }
  };

  // Export functions
  const copyToClipboard = async () => {
    if (copyLoading) return;
    setCopyLoading(true);
    try {
      const allPurchases = await fetchAllPurchasesForExport();
      
      const headers: string[] = ["S.No"];
      const rows = allPurchases.map((purchase, index) => {
        const row: string[] = [(index + 1).toString()];

        if (visibleColumns.purchaseDate) {
          if (!headers.includes("Purchase Date")) headers.push("Purchase Date");
          row.push(formatDate(purchase.purchaseDate));
        }

        if (visibleColumns.dueDate) {
          if (!headers.includes("Due Date")) headers.push("Due Date");
          row.push(formatDate(purchase.dueDate));
        }

        if (visibleColumns.purchaseCode) {
          if (!headers.includes("Purchase Code")) headers.push("Purchase Code");
          row.push(purchase.purchaseCode);
        }

        if (visibleColumns.purchaseStatus) {
          if (!headers.includes("Purchase Status")) headers.push("Purchase Status");
          row.push(purchase.purchaseStatus);
        }

        if (visibleColumns.referenceNo) {
          if (!headers.includes("Reference No")) headers.push("Reference No");
          row.push(purchase.referenceNo);
        }

        if (visibleColumns.supplierName) {
          if (!headers.includes("Supplier Name")) headers.push("Supplier Name");
          row.push(purchase.supplierName);
        }

        if (visibleColumns.total) {
          if (!headers.includes("Total")) headers.push("Total");
          row.push(`Rs. ${purchase.total.toLocaleString('en-IN')}`);
        }

        if (visibleColumns.currencyCode) {
          if (!headers.includes("Currency")) headers.push("Currency");
          row.push(purchase.currencyCode);
        }

        if (visibleColumns.paidAmount) {
          if (!headers.includes("Paid")) headers.push("Paid");
          row.push(`Rs. ${purchase.paidAmount.toLocaleString('en-IN')}`);
        }

        if (visibleColumns.paymentStatus) {
          if (!headers.includes("Payment Status")) headers.push("Payment Status");
          row.push(purchase.paymentStatus);
        }

        return row;
      });

      const text = [headers.join("\t"), ...rows.map(r => r.join("\t"))].join("\n");
      await navigator.clipboard.writeText(text);
      alert("Purchase data copied to clipboard");
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
      const allPurchases = await fetchAllPurchasesForExport();
      
      const exportData = allPurchases.map((purchase, index) => {
        const row: Record<string, any> = {
          "S.No": index + 1,
        };

        if (visibleColumns.purchaseDate) {
          row["Purchase Date"] = formatDate(purchase.purchaseDate);
        }

        if (visibleColumns.dueDate) {
          row["Due Date"] = formatDate(purchase.dueDate);
          row["Overdue"] = isOverdue(purchase.dueDate) ? "Yes" : "No";
        }

        if (visibleColumns.purchaseCode) {
          row["Purchase Code"] = purchase.purchaseCode;
        }

        if (visibleColumns.purchaseStatus) {
          row["Purchase Status"] = purchase.purchaseStatus;
        }

        if (visibleColumns.referenceNo) {
          row["Reference No"] = purchase.referenceNo;
        }

        if (visibleColumns.supplierName) {
          row["Supplier Name"] = purchase.supplierName;
        }

        if (visibleColumns.total) {
          row["Total"] = purchase.total;
        }

        if (visibleColumns.currencyCode) {
          row["Currency"] = purchase.currencyCode;
        }

        if (visibleColumns.paidAmount) {
          row["Paid"] = purchase.paidAmount;
          row["Balance Due"] = purchase.total - purchase.paidAmount;
        }

        if (visibleColumns.paymentStatus) {
          row["Payment Status"] = purchase.paymentStatus;
        }

        return row;
      });

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Purchases");
      XLSX.writeFile(wb, "purchases.xlsx");
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
      const allPurchases = await fetchAllPurchasesForExport();
      if (!allPurchases.length) {
        alert("No purchases found to export.");
        return;
      }

      const doc = new jsPDF();

      autoTable(doc, {
        ...getProfessionalTableTheme(doc, "Purchase List", "", "p"),
        head: [["Purchase Date", "Due Date", "Purchase Code", "Purchase Status", "Reference No", "Supplier Name", "Total", "Currency", "Paid", "Payment Status"]],
        body: allPurchases.map(purchase => [
          formatDate(purchase.purchaseDate),
          formatDate(purchase.dueDate),
          purchase.purchaseCode,
          purchase.purchaseStatus,
          purchase.referenceNo,
          purchase.supplierName,
          `Rs. ${purchase.total.toLocaleString('en-IN')}`,
          purchase.currencyCode,
          `Rs. ${purchase.paidAmount.toLocaleString('en-IN')}`,
          purchase.paymentStatus
        ])
      });

      addPdfPageNumbers(doc, "p");
      doc.save("purchases.pdf");
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
      const allPurchases = await fetchAllPurchasesForExport();
      
      const exportData = allPurchases.map((purchase, index) => {
        const row: Record<string, any> = {
          "S.No": index + 1,
        };

        if (visibleColumns.purchaseDate) {
          row["Purchase Date"] = formatDate(purchase.purchaseDate);
        }

        if (visibleColumns.dueDate) {
          row["Due Date"] = formatDate(purchase.dueDate);
        }

        if (visibleColumns.purchaseCode) {
          row["Purchase Code"] = purchase.purchaseCode;
        }

        if (visibleColumns.purchaseStatus) {
          row["Purchase Status"] = purchase.purchaseStatus;
        }

        if (visibleColumns.referenceNo) {
          row["Reference No"] = purchase.referenceNo;
        }

        if (visibleColumns.supplierName) {
          row["Supplier Name"] = purchase.supplierName;
        }

        if (visibleColumns.total) {
          row["Total"] = purchase.total;
        }

        if (visibleColumns.currencyCode) {
          row["Currency"] = purchase.currencyCode;
        }

        if (visibleColumns.paidAmount) {
          row["Paid"] = purchase.paidAmount;
        }

        if (visibleColumns.paymentStatus) {
          row["Payment Status"] = purchase.paymentStatus;
        }

        return row;
      });

      const ws = XLSX.utils.json_to_sheet(exportData);
      const csv = XLSX.utils.sheet_to_csv(ws);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      saveAs(blob, "purchases.csv");
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
      const allPurchases = await fetchAllPurchasesForExport();
      setPurchasesToPrint(allPurchases);
      setShowPrintView(true);
    } catch (error) {
      console.error("Print failed:", error);
      alert("Failed to prepare print view. Please try again.");
    } finally {
      setPrintLoading(false);
    }
  };

  const handleReset = () => {
    setSearchTerm("");
    setSupplierFilter("");
    setStatusFilter("");
    setFromDate("");
    setToDate("");
    setPage(1);
  };

  const toggleColumn = (key: keyof typeof visibleColumns) => {
    setVisibleColumns(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Summary data
  const summaryData = {
    totalInvoices: purchases.length,
    totalInvoiceAmount: purchases.reduce((sum, purchase) => sum + purchase.total, 0),
    totalPaidAmount: purchases.reduce((sum, purchase) => sum + purchase.paidAmount, 0),
    totalPurchaseDue: purchases.reduce((sum, purchase) => sum + (purchase.total - purchase.paidAmount), 0),
  };

  // Unique suppliers for filter
  const uniqueSuppliers = Array.from(new Set(purchases.map(p => p.supplierName)));

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case "Paid":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
            <CheckCircle className="w-3 h-3 mr-1" />
            Paid
          </span>
        );
      case "Unpaid":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
            <XCircle className="w-3 h-3 mr-1" />
            Unpaid
          </span>
        );
      case "Partial":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
            <AlertCircle className="w-3 h-3 mr-1" />
            Partial
          </span>
        );
      default:
        return null;
    }
  };

  const getPurchaseStatusBadge = (status: string) => {
    switch (status) {
      case "Received":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
            <CheckCircle className="w-3 h-3 mr-1" />
            Received
          </span>
        );
      case "Pending":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </span>
        );
      default:
        return null;
    }
  };

  const isOverdue = (dueDate: string) => {
    const today = new Date();
    const due = new Date(dueDate);
    return due < today;
  };

  const getDaysOverdue = (dueDate: string): number => {
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = today.getTime() - due.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  const filteredPurchases = purchases.filter((purchase) => {
    const search = searchTerm.trim().toLowerCase();
    const matchesSearch =
      purchase.purchaseCode.toLowerCase().includes(search) ||
      purchase.supplierName.toLowerCase().includes(search) ||
      purchase.referenceNo.toLowerCase().includes(search);

    const matchesSupplier = !supplierFilter || purchase.supplierName === supplierFilter;
    const matchesStatus = !statusFilter || purchase.paymentStatus === statusFilter;

    const purchaseDate = new Date(purchase.purchaseDate);
    const matchesFromDate = !fromDate || purchaseDate >= new Date(fromDate);
    const matchesToDate = !toDate || purchaseDate <= new Date(toDate);

    return matchesSearch && matchesSupplier && matchesStatus && matchesFromDate && matchesToDate;
  });

  const paginatedPurchases = filteredPurchases.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  const totalAmount = filteredPurchases.reduce((sum, purchase) => sum + purchase.total, 0);
  const totalPages = Math.max(1, Math.ceil(filteredPurchases.length / pageSize));

  return (
    <div className="w-full">
      {showPrintView && (
        <PrintView
          onComplete={() => setShowPrintView(false)}
          purchases={purchasesToPrint}
          visibleColumns={visibleColumns}
          formatDate={formatDate}
          getPaymentStatusBadge={getPaymentStatusBadge}
          getPurchaseStatusBadge={getPurchaseStatusBadge}
          isOverdue={isOverdue}
          companyName={company?.name || ''}
        />
      )}

      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Purchase List
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Manage your purchase invoices • Track payments and supplier balances
            </p>
          </div>
          <button
            onClick={() => router.push('/purchase/new')}
            className="px-4 py-2 transition bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Add Purchase
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="px-6 py-6 bg-gray-50 dark:bg-gray-900">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
          {/* Total Invoices */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {summaryData.totalInvoices}
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

          {/* Total Purchase Amount */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-blue-600">
                  Rs. {summaryData.totalInvoiceAmount.toLocaleString("en-IN")}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Total Purchases
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>

          {/* Total Paid Amount */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-green-600">
                  Rs. {summaryData.totalPaidAmount.toLocaleString("en-IN")}
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

          {/* Total Purchase Due */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-red-600">
                  Rs. {summaryData.totalPurchaseDue.toLocaleString("en-IN")}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Total Due
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
                placeholder="Search by purchase code, supplier, or reference..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
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
                        {key === 'purchaseDate' ? 'Purchase Date' : 
                         key === 'dueDate' ? 'Due Date' : 
                         key === 'purchaseCode' ? 'Purchase Code' : 
                         key === 'purchaseStatus' ? 'Purchase Status' : 
                         key === 'referenceNo' ? 'Reference No' : 
                         key === 'supplierName' ? 'Supplier Name' : 
                         key === 'paidAmount' ? 'Paid Amount' : 
                         key === 'paymentStatus' ? 'Payment Status' : 
                         key === 'currencyCode' ? 'Currency' : 
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
            {/* Supplier Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Supplier
              </label>
              <select
                value={supplierFilter}
                onChange={(e) => {
                  setSupplierFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Suppliers</option>
                {uniqueSuppliers.map((supplier) => (
                  <option key={supplier} value={supplier}>
                    {supplier}
                  </option>
                ))}
              </select>
            </div>

            {/* Payment Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Payment Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Status</option>
                <option value="Paid">Paid</option>
                <option value="Partial">Partial</option>
                <option value="Unpaid">Unpaid</option>
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
                  onChange={(e) => {
                    setFromDate(e.target.value);
                    setPage(1);
                  }}
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
                  onChange={(e) => {
                    setToDate(e.target.value);
                    setPage(1);
                  }}
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
                <th className="text-left px-3 py-3">
                  S.No
                </th>
                {visibleColumns.purchaseDate && (
                  <th className="text-left px-3 py-3">
                    Purchase Date
                  </th>
                )}
                {visibleColumns.dueDate && (
                  <th className="text-left px-3 py-3">
                    Due Date
                  </th>
                )}
                {visibleColumns.purchaseCode && (
                  <th className="text-left px-3 py-3">
                    Purchase Code
                  </th>
                )}
                {visibleColumns.purchaseStatus && (
                  <th className="text-left px-3 py-3">
                    Purchase Status
                  </th>
                )}
                {visibleColumns.referenceNo && (
                  <th className="text-left px-3 py-3">
                    Reference No
                  </th>
                )}
                {visibleColumns.supplierName && (
                  <th className="text-left px-3 py-3">
                    Supplier Name
                  </th>
                )}
                {visibleColumns.total && (
                  <th className="text-left px-3 py-3">
                    Total
                  </th>
                )}
                {visibleColumns.currencyCode && (
                  <th className="text-left px-3 py-3">
                    Currency
                  </th>
                )}
                {visibleColumns.paidAmount && (
                  <th className="text-left px-3 py-3">
                    Paid
                  </th>
                )}
                {visibleColumns.paymentStatus && (
                  <th className="text-left px-3 py-3">
                    Payment Status
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
                  <td colSpan={Object.values(visibleColumns).filter(Boolean).length + 1} className="px-3 py-8 text-center">
                    <div className="flex items-center justify-center">
                      <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
                    </div>
                  </td>
                </tr>
              ) : paginatedPurchases.length === 0 ? (
                <tr>
                  <td colSpan={Object.values(visibleColumns).filter(Boolean).length + 1} className="px-3 py-8 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <ShoppingBag className="w-12 h-12 text-gray-400 mb-2" />
                      <p className="text-lg font-medium text-gray-900 dark:text-white mb-1">
                        No purchases found
                      </p>
                      <p className="text-gray-500 dark:text-gray-400 mb-4">
                        {statusFilter || searchTerm || fromDate || toDate || supplierFilter ?
                          "No purchases found matching your filters. Try adjusting your search criteria." :
                          "Add your first purchase to start managing your invoices."}
                      </p>
                      <button
                        onClick={() => router.push('/purchase/new')}
                        className="text-blue-600 hover:underline dark:text-blue-400"
                      >
                        Create your first purchase
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedPurchases.map((purchase, index) => {
                  const overdueDays = getDaysOverdue(purchase.dueDate);
                  const isOverdueDue = isOverdue(purchase.dueDate) && purchase.paymentStatus !== 'Paid';

                  return (
                    <tr
                      key={purchase.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <td className="px-3 py-4 align-top break-words text-gray-700 dark:text-gray-300">
                        {(page - 1) * pageSize + index + 1}
                      </td>
                      {visibleColumns.purchaseDate && (
                        <td className="px-3 py-4 align-top break-words text-gray-700 dark:text-gray-300">
                          {formatDate(purchase.purchaseDate)}
                        </td>
                      )}
                      {visibleColumns.dueDate && (
                        <td className="px-3 py-4 align-top break-words">
                          <div className="flex flex-col gap-1">
                            <span className={`${isOverdueDue ? 'text-red-600 font-medium' : 'text-gray-700 dark:text-gray-300'}`}>
                              {formatDate(purchase.dueDate)}
                            </span>
                            {isOverdueDue && (
                              <span className="inline-flex px-2.5 py-0.5 text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                                Overdue by {overdueDays} day{overdueDays !== 1 ? 's' : ''}
                              </span>
                            )}
                          </div>
                        </td>
                      )}
                      {visibleColumns.purchaseCode && (
                        <td className="px-3 py-4 align-top break-words">
                          <div className="min-w-0 max-w-[240px]">
                            <div className="font-medium text-blue-600 dark:text-blue-400">
                              <Link href={`/purchase/${purchase.id}`} className="hover:underline">
                                {purchase.purchaseCode}
                              </Link>
                            </div>
                          </div>
                        </td>
                      )}
                      {visibleColumns.purchaseStatus && (
                        <td className="px-3 py-4 align-top break-words">
                          {getPurchaseStatusBadge(purchase.purchaseStatus)}
                        </td>
                      )}
                      {visibleColumns.referenceNo && (
                        <td className="px-3 py-4 align-top break-words text-gray-700 dark:text-gray-300">
                          {purchase.referenceNo}
                        </td>
                      )}
                      {visibleColumns.supplierName && (
                        <td className="px-3 py-4 align-top break-words">
                          <div className="min-w-0 max-w-[240px]">
                            <div className="font-medium text-gray-900 dark:text-white">
                              <div className="flex items-center gap-2">
                                <Users className="w-4 h-4 text-gray-400" />
                                <span>{purchase.supplierName}</span>
                              </div>
                            </div>
                          </div>
                        </td>
                      )}
                      {visibleColumns.total && (
                        <td className="px-3 py-4 align-top break-words">
                          <div className="font-bold text-gray-900 dark:text-white">
                            Rs. {purchase.total.toLocaleString("en-IN")}
                          </div>
                        </td>
                      )}
                      {visibleColumns.currencyCode && (
                        <td className="px-3 py-4 align-top break-words text-gray-700 dark:text-gray-300">
                          {purchase.currencyCode}
                        </td>
                      )}
                      {visibleColumns.paidAmount && (
                        <td className="px-3 py-4 align-top break-words">
                          <div className={`font-bold ${purchase.paidAmount > 0 ? 'text-green-600' : 'text-gray-700 dark:text-gray-300'}`}>
                            Rs. {purchase.paidAmount.toLocaleString("en-IN")}
                          </div>
                          {(purchase.total - purchase.paidAmount) > 0 && (
                            <div className="text-xs font-medium text-red-600 mt-1">
                              Due: Rs. {(purchase.total - purchase.paidAmount).toLocaleString("en-IN")}
                            </div>
                          )}
                        </td>
                      )}
                      {visibleColumns.paymentStatus && (
                        <td className="px-3 py-4 align-top break-words">
                          {getPaymentStatusBadge(purchase.paymentStatus)}
                        </td>
                      )}
                      {visibleColumns.actions && (
                        <td className="px-3 py-4 text-right align-top">
                          <div className="relative action-dropdown-container inline-block">
                            <button
                              onClick={() =>
                                setActiveActionMenu(
                                  activeActionMenu === purchase.id ? null : purchase.id
                                )
                              }
                              className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-50 dark:hover:text-gray-300 dark:hover:bg-gray-700/50 transition-all duration-200"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>

                            {activeActionMenu === purchase.id && (
                              <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg shadow-xl py-1 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                                <Link
                                  href={`/purchase/${purchase.id}`}
                                  onClick={() => setActiveActionMenu(null)}
                                  className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                                >
                                  <Eye className="w-4 h-4 text-gray-400" />
                                  <span>View Details</span>
                                </Link>

                                <Link
                                  href={`/purchase/edit/${purchase.id}`}
                                  onClick={() => setActiveActionMenu(null)}
                                  className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                                >
                                  <Edit className="w-4 h-4 text-gray-400" />
                                  <span>Edit</span>
                                </Link>

                                <div className="my-1 border-t border-gray-100 dark:border-gray-700"></div>
                                <button
                                  onClick={() => {
                                    // handleDelete(purchase.id);
                                    setActiveActionMenu(null);
                                  }}
                                  className="flex w-full items-center gap-3 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  <span>Delete</span>
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
      {!loading && filteredPurchases.length > 0 && (
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, filteredPurchases.length)} of {filteredPurchases.length} results
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 text-sm text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Previous
            </button>
            <div className="text-sm text-gray-700 dark:text-gray-300">
              Page {page} of {totalPages}
            </div>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
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


