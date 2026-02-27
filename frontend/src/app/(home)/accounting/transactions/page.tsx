"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { accountingApi, Transaction, TransactionStatus, ReferenceType, getErrorMessage } from "@/services/api";
import dayjs from "dayjs";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { saveAs } from "file-saver";
import { addPdfPageNumbers, getProfessionalTableTheme } from "@/utils/pdfTheme";
import {
  Search,
  Filter,
  Plus,
  Copy,
  FileText,
  Download,
  Printer,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Eye,
  MoreVertical,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Calendar,
  DollarSign,
  CreditCard,
  Banknote,
  Repeat,
  FileSignature,
  Upload,
  Ban,
} from "lucide-react";

// Print component for transactions
const PrintView = ({
  transactions,
  visibleColumns,
  formatCurrency,
  formatDate,
  getStatusBadge,
  getReferenceTypeLabel,
  companyName,
  onComplete,
}: {
  transactions: Transaction[];
  visibleColumns: Record<string, boolean>;
  formatCurrency: (amount: number) => string;
  formatDate: (date: string) => string;
  getStatusBadge: (status: TransactionStatus, isReconciled: boolean) => { bg: string; text: string; label: string };
  getReferenceTypeLabel: (type: string) => string;
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
            Transactions List
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
              {visibleColumns.transactionNumber && (
                <th style={{
                  padding: '12px',
                  textAlign: 'left',
                  borderRight: '1px solid #ddd',
                  fontWeight: 'bold'
                }}>
                  Transaction #
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
              {visibleColumns.description && (
                <th style={{
                  padding: '12px',
                  textAlign: 'left',
                  borderRight: '1px solid #ddd',
                  fontWeight: 'bold'
                }}>
                  Description
                </th>
              )}
              {visibleColumns.type && (
                <th style={{
                  padding: '12px',
                  textAlign: 'left',
                  borderRight: '1px solid #ddd',
                  fontWeight: 'bold'
                }}>
                  Type
                </th>
              )}
              {visibleColumns.debit && (
                <th style={{
                  padding: '12px',
                  textAlign: 'right',
                  borderRight: '1px solid #ddd',
                  fontWeight: 'bold'
                }}>
                  Debit (₹)
                </th>
              )}
              {visibleColumns.credit && (
                <th style={{
                  padding: '12px',
                  textAlign: 'right',
                  borderRight: '1px solid #ddd',
                  fontWeight: 'bold'
                }}>
                  Credit (₹)
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
            {transactions.map((txn, index) => {
              const status = getStatusBadge(txn.status, txn.is_reconciled);
              return (
                <tr key={txn.id} style={{
                  borderBottom: '1px solid #ddd',
                  backgroundColor: index % 2 === 0 ? '#fff' : '#f9f9f9'
                }}>
                  {visibleColumns.transactionNumber && (
                    <td style={{
                      padding: '12px',
                      borderRight: '1px solid #ddd',
                      fontFamily: 'monospace'
                    }}>
                      {txn.transaction_number}
                    </td>
                  )}
                  {visibleColumns.date && (
                    <td style={{
                      padding: '12px',
                      borderRight: '1px solid #ddd'
                    }}>
                      {formatDate(txn.transaction_date)}
                    </td>
                  )}
                  {visibleColumns.description && (
                    <td style={{
                      padding: '12px',
                      borderRight: '1px solid #ddd'
                    }}>
                      {txn.description || '-'}
                    </td>
                  )}
                  {visibleColumns.type && (
                    <td style={{
                      padding: '12px',
                      borderRight: '1px solid #ddd'
                    }}>
                      {getReferenceTypeLabel(txn.reference_type)}
                    </td>
                  )}
                  {visibleColumns.debit && (
                    <td style={{
                      padding: '12px',
                      textAlign: 'right',
                      borderRight: '1px solid #ddd',
                      color: '#dc2626',
                      fontWeight: '500'
                    }}>
                      {formatCurrency(txn.total_debit)}
                    </td>
                  )}
                  {visibleColumns.credit && (
                    <td style={{
                      padding: '12px',
                      textAlign: 'right',
                      borderRight: '1px solid #ddd',
                      color: '#16a34a',
                      fontWeight: '500'
                    }}>
                      {formatCurrency(txn.total_credit)}
                    </td>
                  )}
                  {visibleColumns.status && (
                    <td style={{ padding: '12px' }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '4px 8px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        backgroundColor: status.bg,
                        color: status.text
                      }}>
                        {txn.is_reconciled && '✓ '}
                        {status.label}
                      </span>
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
            Total Transactions: {transactions.length}
          </div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            Total Debit: {formatCurrency(transactions.reduce((sum, t) => sum + t.total_debit, 0))}
          </div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            Total Credit: {formatCurrency(transactions.reduce((sum, t) => sum + t.total_credit, 0))}
          </div>
        </div>
      </div>
    </div>
  );
};

const REFERENCE_TYPE_LABELS: Record<string, string> = {
  invoice: "Invoice",
  payment: "Payment",
  manual: "Manual Entry",
  bank_import: "Bank Import",
  opening_balance: "Opening Balance",
  transfer: "Transfer",
  cheque: "Cheque",
  purchase_order: "Purchase Order",
  sales_order: "Sales Order",
  purchase_invoice: "Purchase Invoice",
};

const STATUS_CONFIG: Record<TransactionStatus, { bg: string; text: string; label: string; icon: any }> = {
  draft: {
    bg: "bg-yellow-100 dark:bg-yellow-900/30",
    text: "text-yellow-800 dark:text-yellow-400",
    label: "Draft",
    icon: Clock,
  },
  posted: {
    bg: "bg-green-100 dark:bg-green-900/30",
    text: "text-green-800 dark:text-green-400",
    label: "Posted",
    icon: CheckCircle,
  },
  reversed: {
    bg: "bg-red-100 dark:bg-red-900/30",
    text: "text-red-800 dark:text-red-400",
    label: "Reversed",
    icon: XCircle,
  },
};

const getReferenceTypeIcon = (type: string) => {
  switch (type) {
    case 'invoice':
    case 'purchase_invoice':
      return FileSignature;
    case 'payment':
      return CreditCard;
    case 'bank_import':
      return Upload;
    case 'transfer':
      return Repeat;
    case 'cheque':
      return Banknote;
    default:
      return FileSignature;
  }
};

// Local formatter functions
const formatDate = (dateString: string): string => {
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
    maximumFractionDigits: 0,
  }).format(amount);
};

export default function TransactionsPage() {
  const router = useRouter();
  const { company } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 10;

  // Filters state
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [reconciledFilter, setReconciledFilter] = useState<string>("");

  // UI state
  const [showFilters, setShowFilters] = useState(false);
  const [showColumnDropdown, setShowColumnDropdown] = useState(false);
  const [activeActionMenu, setActiveActionMenu] = useState<string | null>(null);
  const [showPrintView, setShowPrintView] = useState(false);
  const [transactionsToPrint, setTransactionsToPrint] = useState<Transaction[]>([]);
  
  // Export loading states
  const [copyLoading, setCopyLoading] = useState(false);
  const [excelLoading, setExcelLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [csvLoading, setCsvLoading] = useState(false);
  const [printLoading, setPrintLoading] = useState(false);
  
  const [cachedExportData, setCachedExportData] = useState<Transaction[] | null>(null);

  // Action modal
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Column visibility
  const [visibleColumns, setVisibleColumns] = useState({
    transactionNumber: true,
    date: true,
    description: true,
    type: true,
    debit: true,
    credit: true,
    status: true,
    actions: true,
  });

  const companyId = company?.id || (typeof window !== "undefined" ? localStorage.getItem("company_id") : null);

  useEffect(() => {
    if (companyId) {
      fetchTransactions();
    }
  }, [companyId, page, statusFilter, typeFilter, fromDate, toDate, reconciledFilter]);

  useEffect(() => {
    if (companyId) {
      fetchTransactions();
      setCachedExportData(null);
    }
  }, [statusFilter, typeFilter, fromDate, toDate, reconciledFilter]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, typeFilter, fromDate, toDate, reconciledFilter, search]);

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

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const data = await accountingApi.listTransactions(companyId!, {
        page,
        page_size: pageSize,
        status: statusFilter as TransactionStatus || undefined,
        reference_type: typeFilter as ReferenceType || undefined,
        from_date: fromDate || undefined,
        to_date: toDate || undefined,
        is_reconciled: reconciledFilter === "" ? undefined : reconciledFilter === "true",
      });
      setTransactions(data.transactions);
      setTotal(data.total);
      setError("");
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load transactions"));
    } finally {
      setLoading(false);
    }
  };

  const fetchAllTransactionsForExport = useCallback(async (): Promise<Transaction[]> => {
    try {
      if (!companyId) return [];

      const data = await accountingApi.listTransactions(companyId, {
        page: 1,
        page_size: 1000, // Get maximum for export
        status: statusFilter as TransactionStatus || undefined,
        reference_type: typeFilter as ReferenceType || undefined,
        from_date: fromDate || undefined,
        to_date: toDate || undefined,
        is_reconciled: reconciledFilter === "" ? undefined : reconciledFilter === "true",
      });
      
      const allTransactions = data.transactions || [];
      setCachedExportData(allTransactions);
      return allTransactions;
    } catch (error) {
      console.error("Export fetch failed:", error);
      return [];
    }
  }, [companyId, statusFilter, typeFilter, fromDate, toDate, reconciledFilter]);

  const getExportData = async (): Promise<Transaction[]> => {
    if (cachedExportData) return cachedExportData;
    return await fetchAllTransactionsForExport();
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchTransactions();
  };

  const handleReset = () => {
    setSearch("");
    setFromDate("");
    setToDate("");
    setStatusFilter("");
    setTypeFilter("");
    setReconciledFilter("");
    setPage(1);
    fetchTransactions();
  };

  const getStatusBadge = (status: TransactionStatus, isReconciled: boolean) => {
    const config = STATUS_CONFIG[status];
    return {
      ...config,
      label: isReconciled ? `Reconciled • ${config.label}` : config.label,
    };
  };

  const getReferenceTypeLabel = (type: string) => {
    return REFERENCE_TYPE_LABELS[type] || type.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  // Apply search filter locally for export data
  const applySearchFilter = (data: Transaction[]): Transaction[] => {
    if (!search) return data;
    
    const searchLower = search.toLowerCase();
    return data.filter(txn => {
      return (
        txn.transaction_number?.toLowerCase().includes(searchLower) ||
        txn.description?.toLowerCase().includes(searchLower) ||
        getReferenceTypeLabel(txn.reference_type).toLowerCase().includes(searchLower) ||
        txn.entries?.some(entry => 
          entry.account_name?.toLowerCase().includes(searchLower) ||
          entry.account_code?.toLowerCase().includes(searchLower)
        ) ||
        false
      );
    });
  };

  const filteredTransactions = transactions.filter(txn => {
    if (search) {
      const searchLower = search.toLowerCase();
      const matchesSearch = 
        txn.transaction_number?.toLowerCase().includes(searchLower) ||
        txn.description?.toLowerCase().includes(searchLower) ||
        getReferenceTypeLabel(txn.reference_type).toLowerCase().includes(searchLower) ||
        txn.entries?.some(entry => 
          entry.account_name?.toLowerCase().includes(searchLower) ||
          entry.account_code?.toLowerCase().includes(searchLower)
        ) ||
        false;
      
      if (!matchesSearch) return false;
    }
    
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const pagedTransactions = filteredTransactions;

  // Export functions
  const copyToClipboard = async () => {
    if (copyLoading) return;
    setCopyLoading(true);
    try {
      const allData = await getExportData();
      const filtered = applySearchFilter(allData);
      
      const headers: string[] = [];
      const rows = filtered.map(txn => {
        const row: string[] = [];

        if (visibleColumns.transactionNumber) {
          if (!headers.includes("Transaction #")) headers.push("Transaction #");
          row.push(txn.transaction_number);
        }

        if (visibleColumns.date) {
          if (!headers.includes("Date")) headers.push("Date");
          row.push(formatDate(txn.transaction_date));
        }

        if (visibleColumns.description) {
          if (!headers.includes("Description")) headers.push("Description");
          row.push(txn.description || "-");
        }

        if (visibleColumns.type) {
          if (!headers.includes("Type")) headers.push("Type");
          row.push(getReferenceTypeLabel(txn.reference_type));
        }

        if (visibleColumns.debit) {
          if (!headers.includes("Debit (₹)")) headers.push("Debit (₹)");
          row.push(formatCurrency(txn.total_debit));
        }

        if (visibleColumns.credit) {
          if (!headers.includes("Credit (₹)")) headers.push("Credit (₹)");
          row.push(formatCurrency(txn.total_credit));
        }

        if (visibleColumns.status) {
          if (!headers.includes("Status")) headers.push("Status");
          const status = getStatusBadge(txn.status, txn.is_reconciled);
          row.push(status.label);
        }

        return row;
      });

      const text = [headers.join("\t"), ...rows.map(r => r.join("\t"))].join("\n");
      await navigator.clipboard.writeText(text);
      alert("Transaction data copied to clipboard");
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
      const filtered = applySearchFilter(allData);
      
      const exportData = filtered.map(txn => {
        const row: Record<string, any> = {};

        if (visibleColumns.transactionNumber) {
          row["Transaction #"] = txn.transaction_number;
        }

        if (visibleColumns.date) {
          row["Date"] = formatDate(txn.transaction_date);
        }

        if (visibleColumns.description) {
          row["Description"] = txn.description || "-";
        }

        if (visibleColumns.type) {
          row["Type"] = getReferenceTypeLabel(txn.reference_type);
        }

        if (visibleColumns.debit) {
          row["Debit (₹)"] = txn.total_debit;
        }

        if (visibleColumns.credit) {
          row["Credit (₹)"] = txn.total_credit;
        }

        if (visibleColumns.status) {
          const status = getStatusBadge(txn.status, txn.is_reconciled);
          row["Status"] = status.label;
        }

        row["Reconciled"] = txn.is_reconciled ? "Yes" : "No";
        // row["Created By"] = txn.created_by_name || "";
        // row["Reversed By"] = txn.reversed_by_name || "";
        
        return row;
      });

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Transactions");
      XLSX.writeFile(wb, "transactions.xlsx");
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
      const filtered = applySearchFilter(allData);
      
      const doc = new jsPDF("landscape");
      
      const headers: string[] = [];
      const body = filtered.map(txn => {
        const row: string[] = [];

        if (visibleColumns.transactionNumber) {
          if (!headers.includes("Transaction #")) headers.push("Transaction #");
          row.push(txn.transaction_number);
        }

        if (visibleColumns.date) {
          if (!headers.includes("Date")) headers.push("Date");
          row.push(formatDate(txn.transaction_date));
        }

        if (visibleColumns.description) {
          if (!headers.includes("Description")) headers.push("Description");
          row.push(txn.description || "-");
        }

        if (visibleColumns.type) {
          if (!headers.includes("Type")) headers.push("Type");
          row.push(getReferenceTypeLabel(txn.reference_type));
        }

        if (visibleColumns.debit) {
          if (!headers.includes("Debit (₹)")) headers.push("Debit (₹)");
          row.push(formatCurrency(txn.total_debit));
        }

        if (visibleColumns.credit) {
          if (!headers.includes("Credit (₹)")) headers.push("Credit (₹)");
          row.push(formatCurrency(txn.total_credit));
        }

        if (visibleColumns.status) {
          if (!headers.includes("Status")) headers.push("Status");
          const status = getStatusBadge(txn.status, txn.is_reconciled);
          row.push(status.label);
        }

        return row;
      });

      autoTable(doc, {
        ...getProfessionalTableTheme(doc, "Transactions List", company?.name || "", "l"),
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
      doc.save("transactions.pdf");
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
      const filtered = applySearchFilter(allData);
      
      const exportData = filtered.map(txn => {
        const row: Record<string, any> = {};

        if (visibleColumns.transactionNumber) {
          row["Transaction #"] = txn.transaction_number;
        }

        if (visibleColumns.date) {
          row["Date"] = formatDate(txn.transaction_date);
        }

        if (visibleColumns.description) {
          row["Description"] = txn.description || "-";
        }

        if (visibleColumns.type) {
          row["Type"] = getReferenceTypeLabel(txn.reference_type);
        }

        if (visibleColumns.debit) {
          row["Debit (₹)"] = txn.total_debit;
        }

        if (visibleColumns.credit) {
          row["Credit (₹)"] = txn.total_credit;
        }

        if (visibleColumns.status) {
          const status = getStatusBadge(txn.status, txn.is_reconciled);
          row["Status"] = status.label;
        }

        return row;
      });

      const ws = XLSX.utils.json_to_sheet(exportData);
      const csv = XLSX.utils.sheet_to_csv(ws);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      saveAs(blob, "transactions.csv");
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
      const filtered = applySearchFilter(allData);
      setTransactionsToPrint(filtered);
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

  const handlePost = async (transaction: Transaction) => {
    try {
      setActionLoading(true);
      await accountingApi.postTransaction(companyId!, transaction.id);
      fetchTransactions();
      setSelectedTransaction(null);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to post transaction"));
    } finally {
      setActionLoading(false);
    }
  };

  const handleReverse = async (transaction: Transaction) => {
    const reason = prompt("Enter reason for reversal (optional):");
    try {
      setActionLoading(true);
      await accountingApi.reverseTransaction(companyId!, transaction.id, reason || undefined);
      fetchTransactions();
      setSelectedTransaction(null);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to reverse transaction"));
    } finally {
      setActionLoading(false);
    }
  };

  const handleReconcile = async (transaction: Transaction) => {
    try {
      setActionLoading(true);
      await accountingApi.reconcileTransaction(companyId!, transaction.id);
      fetchTransactions();
      setSelectedTransaction(null);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to reconcile transaction"));
    } finally {
      setActionLoading(false);
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
          onComplete={() => setShowPrintView(false)}
          transactions={transactionsToPrint}
          visibleColumns={visibleColumns}
          formatCurrency={formatCurrency}
          formatDate={formatDate}
          getStatusBadge={getStatusBadge}
          getReferenceTypeLabel={getReferenceTypeLabel}
          companyName={company?.name || ''}
        />
      )}

      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Transactions
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Manage and track all your accounting transactions
            </p>
          </div>
          <button
            onClick={() => router.push('/accounting/transactions/new')}
            className="px-4 py-2 transition bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            New Journal Entry
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="px-6 py-6 bg-gray-50 dark:bg-gray-900">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
          {/* Total Transactions */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {total.toLocaleString()}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Total Transactions
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </div>

          {/* Posted Transactions */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-green-600">
                  {transactions.filter(t => t.status === 'posted').length}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Posted
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </div>

          {/* Draft Transactions */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-yellow-600">
                  {transactions.filter(t => t.status === 'draft').length}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Draft
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-yellow-100 dark:bg-yellow-900/20 flex items-center justify-center">
                <Clock className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
              </div>
            </div>
          </div>

          {/* Reconciled */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-blue-600">
                  {transactions.filter(t => t.is_reconciled).length}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Reconciled
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-blue-600 dark:text-blue-400" />
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
                placeholder="Search by transaction #, description, account..."
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
                      <span className="capitalize">
                        {key === 'transactionNumber' ? 'Transaction #' : 
                         key.replace(/([A-Z])/g, ' $1').trim()}
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
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
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
                <option value="">All Statuses</option>
                <option value="draft">Draft</option>
                <option value="posted">Posted</option>
                <option value="reversed">Reversed</option>
              </select>
            </div>

            {/* Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Type
              </label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="">All Types</option>
                <option value="manual">Manual Entry</option>
                <option value="invoice">Invoice</option>
                <option value="payment">Payment</option>
                <option value="bank_import">Bank Import</option>
                <option value="cheque">Cheque</option>
                <option value="transfer">Transfer</option>
              </select>
            </div>

            {/* Reconciled Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Reconciled
              </label>
              <select
                value={reconciledFilter}
                onChange={(e) => setReconciledFilter(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="">All</option>
                <option value="true">Reconciled</option>
                <option value="false">Not Reconciled</option>
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
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1200px]">
            <thead className="bg-gray-200 dark:bg-gray-700/50">
              <tr className="text-sm font-semibold text-gray-600 dark:text-gray-300">
                <th className="text-left px-3 py-3 w-[60px]">
                  S.No
                </th>
                {visibleColumns.transactionNumber && (
                  <th className="text-left px-3 py-3 w-[120px]">
                    Transaction #
                  </th>
                )}
                {visibleColumns.date && (
                  <th className="text-left px-3 py-3 w-[110px]">
                    Date
                  </th>
                )}
                {visibleColumns.description && (
                  <th className="text-left px-3 py-3 min-w-[200px]">
                    Description
                  </th>
                )}
                {visibleColumns.type && (
                  <th className="text-left px-3 py-3 w-[120px]">
                    Type
                  </th>
                )}
                {visibleColumns.debit && (
                  <th className="text-right px-3 py-3 w-[130px]">
                    Debit (₹)
                  </th>
                )}
                {visibleColumns.credit && (
                  <th className="text-right px-3 py-3 w-[130px]">
                    Credit (₹)
                  </th>
                )}
                {visibleColumns.status && (
                  <th className="text-left px-3 py-3 w-[120px]">
                    Status
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
              ) : filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={Object.values(visibleColumns).filter(Boolean).length + 1} className="px-6 py-8 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <DollarSign className="w-12 h-12 text-gray-400 mb-2" />
                      <p className="text-lg font-medium text-gray-900 dark:text-white mb-1">
                        No transactions found
                      </p>
                      <p className="text-gray-500 dark:text-gray-400 mb-4">
                        {statusFilter || typeFilter || search || fromDate || toDate ?
                          "No transactions found matching your filters. Try adjusting your search criteria." :
                          "Create your first journal entry to start tracking transactions."}
                      </p>
                      <button
                        onClick={() => router.push('/accounting/transactions/new')}
                        className="text-indigo-600 hover:underline dark:text-indigo-400"
                      >
                        Create your first journal entry
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                pagedTransactions.map((txn, index) => {
                  const ReferenceTypeIcon = getReferenceTypeIcon(txn.reference_type);
                  const status = getStatusBadge(txn.status, txn.is_reconciled);
                  const StatusIcon = status.icon;
                  
                  return (
                    <tr
                      key={txn.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <td className="px-3 py-4 align-top text-gray-700 dark:text-gray-300">
                        {(page - 1) * pageSize + index + 1}
                      </td>
                      
                      {visibleColumns.transactionNumber && (
                        <td className="px-3 py-4 align-top">
                          <span className="font-mono text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                            {txn.transaction_number}
                          </span>
                        </td>
                      )}
                      
                      {visibleColumns.date && (
                        <td className="px-3 py-4 align-top">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            <span>{formatDate(txn.transaction_date)}</span>
                          </div>
                        </td>
                      )}
                      
                      {visibleColumns.description && (
                        <td className="px-3 py-4 align-top">
                          <div className="max-w-xs">
                            <p className="font-medium text-gray-900 dark:text-white">
                              {txn.description || '-'}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              {txn.entries?.length || 0} entries
                            </p>
                          </div>
                        </td>
                      )}
                      
                      {visibleColumns.type && (
                        <td className="px-3 py-4 align-top">
                          <div className="flex items-center gap-2">
                            <ReferenceTypeIcon className="w-4 h-4 text-gray-400" />
                            <span>{getReferenceTypeLabel(txn.reference_type)}</span>
                          </div>
                        </td>
                      )}
                      
                      {visibleColumns.debit && (
                        <td className="px-3 py-4 align-top text-right font-medium text-red-600 dark:text-red-400">
                          {formatCurrency(txn.total_debit)}
                        </td>
                      )}
                      
                      {visibleColumns.credit && (
                        <td className="px-3 py-4 align-top text-right font-medium text-green-600 dark:text-green-400">
                          {formatCurrency(txn.total_credit)}
                        </td>
                      )}
                      
                      {visibleColumns.status && (
                        <td className="px-3 py-4 align-top">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${status.bg} ${status.text}`}>
                            {txn.is_reconciled && <CheckCircle className="w-3 h-3" />}
                            <StatusIcon className="w-3 h-3" />
                            {status.label}
                          </span>
                        </td>
                      )}
                      
                      {visibleColumns.actions && (
                        <td className="w-[52px] min-w-[52px] max-w-[52px] px-1 py-4 text-center align-top">
                          <div className="relative action-dropdown-container inline-flex justify-center w-full">
                            <button
                              onClick={() =>
                                setActiveActionMenu(
                                  activeActionMenu === txn.id ? null : txn.id
                                )
                              }
                              className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-50 dark:hover:text-gray-300 dark:hover:bg-gray-700/50 transition-all duration-200"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>

                            {activeActionMenu === txn.id && (
                              <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg shadow-xl py-1 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                                <button
                                  onClick={() => {
                                    setSelectedTransaction(txn);
                                    setActiveActionMenu(null);
                                  }}
                                  className="flex w-full items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                                >
                                  <Eye className="w-4 h-4 text-gray-400" />
                                  <span>View Details</span>
                                </button>

                                {txn.status === 'draft' && (
                                  <button
                                    onClick={() => {
                                      handlePost(txn);
                                      setActiveActionMenu(null);
                                    }}
                                    className="flex w-full items-center gap-3 px-3 py-2 text-sm text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
                                  >
                                    <CheckCircle className="w-4 h-4" />
                                    <span>Post Transaction</span>
                                  </button>
                                )}

                                {txn.status === 'posted' && !txn.reversed_by_id && (
                                  <button
                                    onClick={() => {
                                      handleReverse(txn);
                                      setActiveActionMenu(null);
                                    }}
                                    className="flex w-full items-center gap-3 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                  >
                                    <Ban className="w-4 h-4" />
                                    <span>Reverse</span>
                                  </button>
                                )}

                                {txn.status === 'posted' && !txn.is_reconciled && (
                                  <button
                                    onClick={() => {
                                      handleReconcile(txn);
                                      setActiveActionMenu(null);
                                    }}
                                    className="flex w-full items-center gap-3 px-3 py-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                                  >
                                    <CheckCircle className="w-4 h-4" />
                                    <span>Mark Reconciled</span>
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
          </table>
        </div>
      </div>

      {/* Pagination */}
      {!loading && total > 0 && (
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, total)} of {total} transactions
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

      {/* Transaction Detail Modal */}
      {selectedTransaction && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl dark:bg-gray-dark">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Transaction Details
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {selectedTransaction.transaction_number}
                </p>
              </div>
              <button
                onClick={() => setSelectedTransaction(null)}
                className="rounded-full p-1 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <XCircle className="w-6 h-6 text-gray-500" />
              </button>
            </div>

            <div className="mb-4 grid gap-4 sm:grid-cols-2">
              <div>
                <span className="text-xs text-gray-500 dark:text-gray-400">Date</span>
                <p className="font-medium text-gray-900 dark:text-white">
                  {formatDate(selectedTransaction.transaction_date)}
                </p>
              </div>
              <div>
                <span className="text-xs text-gray-500 dark:text-gray-400">Type</span>
                <p className="font-medium text-gray-900 dark:text-white">
                  {getReferenceTypeLabel(selectedTransaction.reference_type)}
                </p>
              </div>
              <div>
                <span className="text-xs text-gray-500 dark:text-gray-400">Status</span>
                <div className="mt-1">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                    STATUS_CONFIG[selectedTransaction.status].bg
                  } ${STATUS_CONFIG[selectedTransaction.status].text}`}>
                    {selectedTransaction.is_reconciled && <CheckCircle className="w-3 h-3" />}
                    {STATUS_CONFIG[selectedTransaction.status].label}
                  </span>
                </div>
              </div>
              {/* <div>
                <span className="text-xs text-gray-500 dark:text-gray-400">Created By</span>
                <p className="font-medium text-gray-900 dark:text-white">
                  {selectedTransaction.created_by_name || '-'}
                </p>
              </div>
              {selectedTransaction.reversed_by_name && (
                <div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">Reversed By</span>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {selectedTransaction.reversed_by_name}
                  </p>
                </div>
              )} */}
              <div className="sm:col-span-2">
                <span className="text-xs text-gray-500 dark:text-gray-400">Description</span>
                <p className="font-medium text-gray-900 dark:text-white">
                  {selectedTransaction.description || '-'}
                </p>
              </div>
            </div>

            {/* Entries Table */}
            <div className="mb-4 overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
              <table className="w-full">
                <thead className="bg-gray-100 dark:bg-gray-800">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                      Account
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400">
                      Debit (₹)
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400">
                      Credit (₹)
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {selectedTransaction.entries.map((entry) => (
                    <tr key={entry.id}>
                      <td className="px-4 py-2">
                        <div>
                          <span className="font-mono text-xs text-gray-500 dark:text-gray-400">
                            {entry.account_code}
                          </span>
                          <span className="ml-2 text-sm text-gray-900 dark:text-white">
                            {entry.account_name}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-2 text-right font-medium text-red-600 dark:text-red-400">
                        {entry.debit_amount > 0 ? formatCurrency(entry.debit_amount) : '-'}
                      </td>
                      <td className="px-4 py-2 text-right font-medium text-green-600 dark:text-green-400">
                        {entry.credit_amount > 0 ? formatCurrency(entry.credit_amount) : '-'}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-gray-50 dark:bg-gray-800 font-bold">
                    <td className="px-4 py-2 text-gray-900 dark:text-white">Total</td>
                    <td className="px-4 py-2 text-right text-red-600 dark:text-red-400">
                      {formatCurrency(selectedTransaction.total_debit)}
                    </td>
                    <td className="px-4 py-2 text-right text-green-600 dark:text-green-400">
                      {formatCurrency(selectedTransaction.total_credit)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2">
              {selectedTransaction.status === "draft" && (
                <button
                  onClick={() => handlePost(selectedTransaction)}
                  disabled={actionLoading}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center gap-2 transition disabled:opacity-50"
                >
                  {actionLoading ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Post Transaction
                    </>
                  )}
                </button>
              )}
              {selectedTransaction.status === "posted" && !selectedTransaction.reversed_by_id && (
                <button
                  onClick={() => handleReverse(selectedTransaction)}
                  disabled={actionLoading}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center gap-2 transition disabled:opacity-50"
                >
                  {actionLoading ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                  ) : (
                    <>
                      <Ban className="w-4 h-4" />
                      Reverse Transaction
                    </>
                  )}
                </button>
              )}
              {selectedTransaction.status === "posted" && !selectedTransaction.is_reconciled && (
                <button
                  onClick={() => handleReconcile(selectedTransaction)}
                  disabled={actionLoading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 transition disabled:opacity-50"
                >
                  {actionLoading ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Mark Reconciled
                    </>
                  )}
                </button>
              )}
              <button
                onClick={() => setSelectedTransaction(null)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
