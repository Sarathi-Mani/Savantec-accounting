"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { saveAs } from "file-saver";
import {
  Search,
  Filter,
  Plus,
  Download,
  FileText,
  Copy,
  Printer,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Building2,
  Users,
  DollarSign,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  Calendar,
  ShoppingBag,
  CheckCircle,
  XCircle,
  Clock,
  User,
  Receipt,
  FileDown,
  AlertCircle,
  Loader2,
  CreditCard,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { purchasesApi, getErrorMessage, type PurchaseInvoice } from "@/services/api";

// Print component for purchases
const PrintView = ({
  purchases,
  visibleColumns,
  formatDate,
  getPaymentStatusText,
  getPurchaseStatusText,
  formatCurrency,
  isOverdue,
  companyName,
}: {
  purchases: any[];
  visibleColumns: Record<string, boolean>;
  formatDate: (dateString: string) => string;
  getPaymentStatusText: (status: string) => string;
  getPurchaseStatusText: (status: string) => string;
  formatCurrency: (amount: number) => string;
  isOverdue: (dueDate: string) => boolean;
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
                  Reference No.
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
                  Total Amount
                </th>
              )}
              {visibleColumns.paidAmount && (
                <th style={{
                  padding: '12px',
                  textAlign: 'left',
                  borderRight: '1px solid #ddd',
                  fontWeight: 'bold'
                }}>
                  Paid Amount
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
                    <div>
                      {formatDate(purchase.dueDate)}
                      {isOverdue(purchase.dueDate) && (
                        <span style={{
                          display: 'inline-block',
                          marginLeft: '8px',
                          padding: '2px 6px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: 'bold',
                          backgroundColor: '#fee2e2',
                          color: '#991b1b'
                        }}>
                          Overdue
                        </span>
                      )}
                    </div>
                  </td>
                )}
                {visibleColumns.purchaseCode && (
                  <td style={{
                    padding: '12px',
                    borderRight: '1px solid #ddd',
                    fontWeight: '500'
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
                      backgroundColor: purchase.purchaseStatus === 'Received' ? '#d1fae5' : '#fef3c7',
                      color: purchase.purchaseStatus === 'Received' ? '#065f46' : '#92400e'
                    }}>
                      {getPurchaseStatusText(purchase.purchaseStatus)}
                    </span>
                  </td>
                )}
                {visibleColumns.referenceNo && (
                  <td style={{
                    padding: '12px',
                    borderRight: '1px solid #ddd'
                  }}>
                    {purchase.referenceNo || '-'}
                  </td>
                )}
                {visibleColumns.supplierName && (
                  <td style={{
                    padding: '12px',
                    borderRight: '1px solid #ddd'
                  }}>
                    {purchase.supplierName || '-'}
                  </td>
                )}
                {visibleColumns.total && (
                  <td style={{
                    padding: '12px',
                    borderRight: '1px solid #ddd',
                    fontWeight: '500'
                  }}>
                    {formatCurrency(purchase.total)}
                  </td>
                )}
                {visibleColumns.paidAmount && (
                  <td style={{
                    padding: '12px',
                    borderRight: '1px solid #ddd',
                    fontWeight: '500'
                  }}>
                    {formatCurrency(purchase.paidAmount)}
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
                      backgroundColor: 
                        purchase.paymentStatus === 'Paid' ? '#d1fae5' :
                        purchase.paymentStatus === 'Unpaid' ? '#fee2e2' :
                        '#fef3c7',
                      color: 
                        purchase.paymentStatus === 'Paid' ? '#065f46' :
                        purchase.paymentStatus === 'Unpaid' ? '#991b1b' :
                        '#92400e'
                    }}>
                      {getPaymentStatusText(purchase.paymentStatus)}
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

interface Purchase {
  id: string;
  purchaseDate: string;
  dueDate: string;
  purchaseCode: string;
  purchaseStatus: string;
  referenceNo: string;
  supplierName: string;
  total: number;
  currencyCode: string;
  paidAmount: number;
  paymentStatus: string;
  isOverdue?: boolean;
}

const formatPurchaseType = (value?: string) => {
  if (!value) return "Purchase";
  return value
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

const normalizePaymentStatus = (
  status?: string,
  amountPaid?: number,
  balanceDue?: number
): "Paid" | "Partial" | "Unpaid" => {
  const normalized = (status || "").toUpperCase();
  if (normalized === "PAID") return "Paid";
  if (normalized === "PARTIALLY_PAID") return "Partial";
  if (normalized === "UNPAID") return "Unpaid";
  if ((amountPaid || 0) <= 0) return "Unpaid";
  if ((balanceDue || 0) <= 0) return "Paid";
  return "Partial";
};

const mapPurchaseFromApi = (item: PurchaseInvoice): Purchase => {
  const purchase = item as PurchaseInvoice & Record<string, any>;
  const total = Number(purchase.grand_total ?? purchase.total_amount ?? 0);
  const paidAmount = Number(purchase.amount_paid ?? 0);
  const balanceDue = Number(purchase.balance_due ?? Math.max(total - paidAmount, 0));

  return {
    id: String(purchase.id || ""),
    purchaseDate: purchase.invoice_date || "",
    dueDate: purchase.due_date || purchase.invoice_date || "",
    purchaseCode:
      purchase.purchase_number || purchase.invoice_number || purchase.vendor_invoice_number || "-",
    purchaseStatus: formatPurchaseType(purchase.purchase_type),
    referenceNo: purchase.reference_no || "",
    supplierName: purchase.vendor_name || purchase.contact_person || "-",
    total,
    currencyCode: purchase.currency || "INR",
    paidAmount,
    paymentStatus: normalizePaymentStatus(purchase.status, paidAmount, balanceDue),
  };
};

const formatNumber = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export default function PurchaseListPage() {
  const { company } = useAuth();
  const companyId =
    company?.id || (typeof window !== "undefined" ? localStorage.getItem("company_id") : null);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [supplierFilter, setSupplierFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("");
  
  // UI state
  const [showFilters, setShowFilters] = useState(false);
  const [showColumnDropdown, setShowColumnDropdown] = useState(false);
  const [activeActionMenu, setActiveActionMenu] = useState<string | null>(null);
  const [showPrintView, setShowPrintView] = useState(false);
  const [purchasesToPrint, setPurchasesToPrint] = useState<Purchase[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  
  // Export loading states
  const [copyLoading, setCopyLoading] = useState(false);
  const [excelLoading, setExcelLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [csvLoading, setCsvLoading] = useState(false);
  const [printLoading, setPrintLoading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Column visibility
  const [visibleColumns, setVisibleColumns] = useState({
    purchaseDate: true,
    dueDate: true,
    purchaseCode: true,
    purchaseStatus: true,
    referenceNo: true,
    supplierName: true,
    total: true,
    paidAmount: true,
    paymentStatus: true,
    actions: true,
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element | null;
      if (!target) return;
      if (!target.closest(".action-dropdown-container") && !target.closest(".column-dropdown-container")) {
        setActiveActionMenu(null);
        setShowColumnDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const fetchPurchases = useCallback(async () => {
    if (!companyId) {
      setPurchases([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const apiPageSize = 100;
      const firstPage = await purchasesApi.list(companyId, { page: 1, page_size: apiPageSize });
      const allItems: PurchaseInvoice[] = Array.isArray(firstPage.items) ? [...firstPage.items] : [];
      const totalPages = Math.max(Number(firstPage.total_pages || 1), 1);

      for (let page = 2; page <= totalPages; page += 1) {
        const response = await purchasesApi.list(companyId, { page, page_size: apiPageSize });
        if (Array.isArray(response.items)) {
          allItems.push(...response.items);
        }
      }

      const mappedPurchases = allItems.map(mapPurchaseFromApi);
      setPurchases(mappedPurchases);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load purchases"));
      setPurchases([]);
      console.error("Error fetching purchases:", err);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    fetchPurchases();
  }, [fetchPurchases]);

  // Unique suppliers for filter
  const uniqueSuppliers = Array.from(new Set(purchases.map(p => p.supplierName)));
  const uniquePurchaseStatuses = Array.from(new Set(purchases.map((p) => p.purchaseStatus)));

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatOriginalCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getPaymentStatusText = (status: string) => {
    switch (status) {
      case "Paid": return "Paid";
      case "Unpaid": return "Unpaid";
      case "Partial": return "Partial";
      default: return status;
    }
  };

  const getPurchaseStatusText = (status: string) => {
    switch (status) {
      case "Received": return "Received";
      case "Pending": return "Pending";
      default: return status;
    }
  };

  const getPaymentStatusBadgeClass = (status: string): string => {
    switch (status) {
      case "Paid":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "Unpaid":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      case "Partial":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
    }
  };

  const getPurchaseStatusBadgeClass = (status: string): string => {
    switch (status) {
      case "Received":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "Pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
    }
  };

  const isOverdue = (dueDate: string) => {
    const today = new Date();
    const due = new Date(dueDate);
    return due < today;
  };

  const filteredPurchases = purchases.filter((purchase) => {
    const matchesSearch =
      purchase.purchaseCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      purchase.supplierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      purchase.referenceNo.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesSupplier = !supplierFilter || purchase.supplierName === supplierFilter;
    const matchesStatus = !statusFilter || purchase.purchaseStatus === statusFilter;
    const matchesPaymentStatus = !paymentStatusFilter || purchase.paymentStatus === paymentStatusFilter;

    const purchaseDate = new Date(purchase.purchaseDate);
    const matchesFromDate = !fromDate || purchaseDate >= new Date(fromDate);
    const matchesToDate = !toDate || purchaseDate <= new Date(toDate);

    return matchesSearch && matchesSupplier && matchesStatus && matchesPaymentStatus && matchesFromDate && matchesToDate;
  });

  const paginatedPurchases = filteredPurchases.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const summaryData = {
    totalPurchases: filteredPurchases.length,
    totalAmount: filteredPurchases.reduce((sum, purchase) => sum + purchase.total, 0),
    totalPaidAmount: filteredPurchases.reduce((sum, purchase) => sum + purchase.paidAmount, 0),
    totalDue: filteredPurchases.reduce((sum, purchase) => sum + (purchase.total - purchase.paidAmount), 0),
  };

  const totalAmount = filteredPurchases.reduce((sum, purchase) => sum + purchase.total, 0);

  const toggleColumn = (key: keyof typeof visibleColumns) => {
    setVisibleColumns(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleReset = () => {
    setSearchTerm("");
    setSupplierFilter("");
    setFromDate("");
    setToDate("");
    setStatusFilter("");
    setPaymentStatusFilter("");
    setCurrentPage(1);
    fetchPurchases();
  };

  const copyToClipboard = async () => {
    if (copyLoading) return;
    setCopyLoading(true);
    try {
      if (filteredPurchases.length === 0) {
        alert("No purchases to export.");
        return;
      }
      
      const headers: string[] = [];
      const rows = filteredPurchases.map(purchase => {
        const row: string[] = [];

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
          row.push(getPurchaseStatusText(purchase.purchaseStatus));
        }

        if (visibleColumns.referenceNo) {
          if (!headers.includes("Reference No.")) headers.push("Reference No.");
          row.push(purchase.referenceNo || "-");
        }

        if (visibleColumns.supplierName) {
          if (!headers.includes("Supplier Name")) headers.push("Supplier Name");
          row.push(purchase.supplierName || "-");
        }

        if (visibleColumns.total) {
          if (!headers.includes("Total Amount")) headers.push("Total Amount");
          row.push(formatCurrency(purchase.total));
        }

        if (visibleColumns.paidAmount) {
          if (!headers.includes("Paid Amount")) headers.push("Paid Amount");
          row.push(formatCurrency(purchase.paidAmount));
        }

        if (visibleColumns.paymentStatus) {
          if (!headers.includes("Payment Status")) headers.push("Payment Status");
          row.push(getPaymentStatusText(purchase.paymentStatus));
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
      if (filteredPurchases.length === 0) {
        alert("No purchases to export.");
        return;
      }
      
      const exportData = filteredPurchases.map(purchase => {
        const row: Record<string, any> = {};

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
          row["Purchase Status"] = getPurchaseStatusText(purchase.purchaseStatus);
        }

        if (visibleColumns.referenceNo) {
          row["Reference No."] = purchase.referenceNo || "";
        }

        if (visibleColumns.supplierName) {
          row["Supplier Name"] = purchase.supplierName || "";
        }

        if (visibleColumns.total) {
          row["Total Amount"] = purchase.total;
          row["Currency"] = purchase.currencyCode;
        }

        if (visibleColumns.paidAmount) {
          row["Paid Amount"] = purchase.paidAmount;
        }

        if (visibleColumns.paymentStatus) {
          row["Payment Status"] = getPaymentStatusText(purchase.paymentStatus);
        }

        row["Overdue"] = isOverdue(purchase.dueDate) ? "Yes" : "No";
        
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
      if (filteredPurchases.length === 0) {
        alert("No purchases to export.");
        return;
      }
      
      const doc = new jsPDF("landscape");
      
      const headers: string[] = [];
      const body = filteredPurchases.map(purchase => {
        const row: string[] = [];

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
          row.push(getPurchaseStatusText(purchase.purchaseStatus));
        }

        if (visibleColumns.referenceNo) {
          if (!headers.includes("Ref. No.")) headers.push("Ref. No.");
          row.push(purchase.referenceNo || "-");
        }

        if (visibleColumns.supplierName) {
          if (!headers.includes("Supplier")) headers.push("Supplier");
          row.push(purchase.supplierName || "-");
        }

        if (visibleColumns.total) {
          if (!headers.includes("Total")) headers.push("Total");
          row.push(formatNumber(purchase.total));
        }

        if (visibleColumns.paidAmount) {
          if (!headers.includes("Paid")) headers.push("Paid");
          row.push(formatNumber(purchase.paidAmount));
        }

        if (visibleColumns.paymentStatus) {
          if (!headers.includes("Payment Status")) headers.push("Payment Status");
          row.push(getPaymentStatusText(purchase.paymentStatus));
        }

        return row;
      });

      autoTable(doc, {
        head: [headers],
        body: body,
        startY: 20,
        margin: { top: 20, left: 10, right: 10, bottom: 20 },
        styles: {
          fontSize: 9,
          cellPadding: 3,
          overflow: "linebreak",
          font: "helvetica",
        },
        headStyles: {
          fillColor: [41, 128, 185],
          textColor: 255,
          fontStyle: "bold",
        },
        alternateRowStyles: {
          fillColor: [245, 245, 245],
        },
        didDrawPage: (data) => {
          doc.setFontSize(16);
          doc.text("Purchase List", data.settings.margin.left, 12);
          
          doc.setFontSize(10);
          doc.text("Company Name", data.settings.margin.left, 18);
          
          doc.text(
            `Generated: ${new Date().toLocaleDateString("en-IN")}`,
            doc.internal.pageSize.width - 60,
            12
          );

          const pageCount = doc.getNumberOfPages();
          doc.text(
            `Page ${data.pageNumber} of ${pageCount}`,
            data.settings.margin.left,
            doc.internal.pageSize.height - 8
          );
        },
      });

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
      if (filteredPurchases.length === 0) {
        alert("No purchases to export.");
        return;
      }
      
      const exportData = filteredPurchases.map(purchase => {
        const row: Record<string, any> = {};

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
          row["Purchase Status"] = getPurchaseStatusText(purchase.purchaseStatus);
        }

        if (visibleColumns.referenceNo) {
          row["Reference No."] = purchase.referenceNo || "";
        }

        if (visibleColumns.supplierName) {
          row["Supplier Name"] = purchase.supplierName || "";
        }

        if (visibleColumns.total) {
          row["Total Amount"] = purchase.total;
        }

        if (visibleColumns.paidAmount) {
          row["Paid Amount"] = purchase.paidAmount;
        }

        if (visibleColumns.paymentStatus) {
          row["Payment Status"] = getPaymentStatusText(purchase.paymentStatus);
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
      if (filteredPurchases.length === 0) {
        alert("No purchases to export.");
        return;
      }
      setPurchasesToPrint(filteredPurchases);
      setShowPrintView(true);
    } catch (error) {
      console.error("Print failed:", error);
      alert("Failed to prepare print view. Please try again.");
    } finally {
      setPrintLoading(false);
    }
  };

  const handlePrintOrder = (purchaseId: string) => {
    window.open(`/purchase/${purchaseId}/print`, "_blank");
  };

  const handlePDF = (purchaseId: string) => {
    window.open(`/purchase/${purchaseId}/pdf`, "_blank");
  };

  const deletePurchase = async (id: string) => {
    if (!confirm("Are you sure you want to delete this purchase?")) {
      return;
    }

    try {
      setDeleting(id);
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setPurchases(prevPurchases => prevPurchases.filter(p => p.id !== id));
      alert("Purchase deleted successfully");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete purchase");
      console.error("Error deleting purchase:", err);
    } finally {
      setDeleting(null);
      setActiveActionMenu(null);
    }
  };

  return (
    <div className="w-full">
      {showPrintView && (
        <PrintView
          purchases={purchasesToPrint}
          visibleColumns={visibleColumns}
          formatDate={formatDate}
          getPaymentStatusText={getPaymentStatusText}
          getPurchaseStatusText={getPurchaseStatusText}
          formatCurrency={formatCurrency}
          isOverdue={isOverdue}
          companyName="Company Name"
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
              Manage and track all purchase transactions
            </p>
          </div>
          <Link
            href="/purchase/new"
            className="px-4 py-2 transition bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Add Purchase
          </Link>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="px-6 py-6 bg-gray-50 dark:bg-gray-900">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
          {/* Total Purchases */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {summaryData.totalPurchases.toLocaleString()}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Total Purchases
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
                <ShoppingBag className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </div>

          {/* Total Amount */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(summaryData.totalAmount)}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Total Purchase Amount
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </div>

          {/* Total Paid Amount */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-blue-600">
                  {formatCurrency(summaryData.totalPaidAmount)}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Total Paid Amount
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>

          {/* Total Due */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-red-600">
                  {formatCurrency(summaryData.totalDue)}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Total Due Amount
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
                placeholder="Search by purchase code, supplier, or reference..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
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
              {(supplierFilter || statusFilter || paymentStatusFilter || fromDate || toDate) && (
                <span className="ml-1 px-2 py-0.5 text-xs bg-indigo-100 text-indigo-800 rounded-full">
                  Active
                </span>
              )}
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
                <div className="absolute right-0 mt-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-3 z-10 min-w-[180px]">
                  {Object.entries(visibleColumns).map(([key, value]) => (
                    key !== 'actions' && (
                      <label key={key} className="flex items-center gap-2 text-sm mb-2 last:mb-0 cursor-pointer text-gray-700 dark:text-gray-300">
                        <input
                          type="checkbox"
                          checked={value}
                          onChange={() => toggleColumn(key as keyof typeof visibleColumns)}
                          className="rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                      </label>
                    )
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
                  setCurrentPage(1);
                }}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="">All Suppliers</option>
                {uniqueSuppliers.map((supplier) => (
                  <option key={supplier} value={supplier}>
                    {supplier}
                  </option>
                ))}
              </select>
            </div>

            {/* Purchase Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Purchase Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="">All Status</option>
                <option value="Received">Received</option>
                <option value="Pending">Pending</option>
              </select>
            </div>

            {/* Payment Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Payment Status
              </label>
              <select
                value={paymentStatusFilter}
                onChange={(e) => {
                  setPaymentStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="">All Payment Status</option>
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
                    setCurrentPage(1);
                  }}
                  className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
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
                    setCurrentPage(1);
                  }}
                  className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-200 dark:bg-gray-700/50">
              <tr className="text-sm font-semibold text-gray-600 dark:text-gray-300">
                <th className="text-left px-6 py-3 whitespace-nowrap w-20">
                  S.No
                </th>
                {visibleColumns.purchaseDate && (
                  <th className="text-left px-6 py-3 whitespace-nowrap w-32">
                    Purchase Date
                  </th>
                )}
                {visibleColumns.dueDate && (
                  <th className="text-left px-6 py-3 whitespace-nowrap w-32">
                    Due Date
                  </th>
                )}
                {visibleColumns.purchaseCode && (
                  <th className="text-left px-6 py-3 whitespace-nowrap w-48">
                    Purchase Code
                  </th>
                )}
                {visibleColumns.purchaseStatus && (
                  <th className="text-left px-6 py-3 whitespace-nowrap w-40">
                    Purchase Status
                  </th>
                )}
                {visibleColumns.referenceNo && (
                  <th className="text-left px-6 py-3 whitespace-nowrap w-48">
                    Reference No.
                  </th>
                )}
                {visibleColumns.supplierName && (
                  <th className="text-left px-6 py-3 whitespace-nowrap w-64">
                    Supplier Name
                  </th>
                )}
                {visibleColumns.total && (
                  <th className="text-left px-6 py-3 whitespace-nowrap w-40">
                    Total Amount
                  </th>
                )}
                {visibleColumns.paidAmount && (
                  <th className="text-left px-6 py-3 whitespace-nowrap w-40">
                    Paid Amount
                  </th>
                )}
                {visibleColumns.paymentStatus && (
                  <th className="text-left px-6 py-3 whitespace-nowrap w-40">
                    Payment Status
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
              {paginatedPurchases.length === 0 ? (
                <tr>
                  <td colSpan={Object.values(visibleColumns).filter(Boolean).length + 1} className="px-6 py-8 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <ShoppingBag className="w-12 h-12 text-gray-400 mb-2" />
                      <p className="text-lg font-medium text-gray-900 dark:text-white mb-1">
                        No purchases found
                      </p>
                      <p className="text-gray-500 dark:text-gray-400 mb-4">
                        {supplierFilter || statusFilter || paymentStatusFilter || searchTerm || fromDate || toDate ?
                          "No purchases found matching your filters. Try adjusting your search criteria." :
                          "Add your first purchase to start tracking."}
                      </p>
                      <Link
                        href="/purchase/new"
                        className="text-indigo-600 hover:underline dark:text-indigo-400"
                      >
                        Add your first purchase
                      </Link>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedPurchases.map((purchase, index) => (
                  <tr
                    key={purchase.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-gray-700 dark:text-gray-300">
                      {(currentPage - 1) * pageSize + index + 1}
                    </td>
                    {visibleColumns.purchaseDate && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          {formatDate(purchase.purchaseDate)}
                        </div>
                      </td>
                    )}
                    {visibleColumns.dueDate && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            {formatDate(purchase.dueDate)}
                          </div>
                          {isOverdue(purchase.dueDate) && (
                            <span className="inline-flex w-fit px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                              Overdue
                            </span>
                          )}
                        </div>
                      </td>
                    )}
                    {visibleColumns.purchaseCode && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900 dark:text-white">
                          <Link 
                            href={`/purchase/${purchase.id}`}
                            className="hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline"
                          >
                            {purchase.purchaseCode}
                          </Link>
                        </div>
                      </td>
                    )}
                    {visibleColumns.purchaseStatus && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium items-center gap-1 ${
                            getPurchaseStatusBadgeClass(purchase.purchaseStatus)
                          }`}
                        >
                          {purchase.purchaseStatus === 'Received' ? (
                            <CheckCircle className="w-3 h-3" />
                          ) : (
                            <Clock className="w-3 h-3" />
                          )}
                          {getPurchaseStatusText(purchase.purchaseStatus)}
                        </span>
                      </td>
                    )}
                    {visibleColumns.referenceNo && (
                      <td className="px-6 py-4 whitespace-nowrap text-gray-700 dark:text-gray-300">
                        {purchase.referenceNo || '-'}
                      </td>
                    )}
                    {visibleColumns.supplierName && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-700 dark:text-gray-300">
                            {purchase.supplierName || '-'}
                          </span>
                        </div>
                      </td>
                    )}
                    {visibleColumns.total && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-900 dark:text-white">
                            {formatCurrency(purchase.total)}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {formatOriginalCurrency(purchase.total, purchase.currencyCode)}
                          </span>
                        </div>
                      </td>
                    )}
                    {visibleColumns.paidAmount && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-medium text-gray-900 dark:text-white">
                          {formatCurrency(purchase.paidAmount)}
                        </span>
                      </td>
                    )}
                    {visibleColumns.paymentStatus && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium items-center gap-1 ${
                            getPaymentStatusBadgeClass(purchase.paymentStatus)
                          }`}
                        >
                          {purchase.paymentStatus === 'Paid' && <CheckCircle className="w-3 h-3" />}
                          {purchase.paymentStatus === 'Unpaid' && <XCircle className="w-3 h-3" />}
                          {purchase.paymentStatus === 'Partial' && <AlertCircle className="w-3 h-3" />}
                          {getPaymentStatusText(purchase.paymentStatus)}
                        </span>
                      </td>
                    )}
                    {visibleColumns.actions && (
                      <td className="px-6 py-4 text-right whitespace-nowrap">
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

                              <button
                                onClick={() => {
                                  setActiveActionMenu(null);
                                  handlePrintOrder(purchase.id);
                                }}
                                className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors w-full text-left"
                              >
                                <Printer className="w-4 h-4 text-gray-400" />
                                <span>Print</span>
                              </button>

                              <button
                                onClick={() => {
                                  setActiveActionMenu(null);
                                  handlePDF(purchase.id);
                                }}
                                className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors w-full text-left"
                              >
                                <FileDown className="w-4 h-4 text-gray-400" />
                                <span>Download PDF</span>
                              </button>

                              <div className="my-1 border-t border-gray-100 dark:border-gray-700"></div>
                              
                              <button
                                onClick={() => {
                                  deletePurchase(purchase.id);
                                }}
                                disabled={deleting === purchase.id}
                                className="flex w-full items-center gap-3 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                              >
                                {deleting === purchase.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Trash2 className="w-4 h-4" />
                                )}
                                <span>Delete</span>
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
            {paginatedPurchases.length > 0 && visibleColumns.total && (
              <tfoot>
                <tr className="bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700">
                  <td
                    colSpan={
                      Object.values(visibleColumns).filter(Boolean).length + 1 -
                      (visibleColumns.total ? 1 : 0) -
                      (visibleColumns.actions ? 1 : 0)
                    }
                    className="px-6 py-4 text-right font-semibold text-gray-900 dark:text-white"
                  >
                    Total Amount:
                  </td>
                  <td className="px-6 py-4 font-bold text-gray-900 dark:text-white">
                    {formatCurrency(totalAmount)}
                  </td>
                  {visibleColumns.actions && (
                    <td></td>
                  )}
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Pagination */}
      {!loading && filteredPurchases.length > 0 && (
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, filteredPurchases.length)} of {filteredPurchases.length} results
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
              Page {currentPage} of {Math.ceil(filteredPurchases.length / pageSize)}
            </div>
            <button
              onClick={() => setCurrentPage((p) => Math.min(Math.ceil(filteredPurchases.length / pageSize), p + 1))}
              disabled={currentPage === Math.ceil(filteredPurchases.length / pageSize)}
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
