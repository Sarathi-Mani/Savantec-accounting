"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import api from "@/services/api";
import Link from "next/link";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { saveAs } from "file-saver";
import { addPdfPageNumbers, getProfessionalTableTheme } from "@/utils/pdfTheme";
import {
  Search,
  Filter,
  Plus,
  Users,
  CreditCard,
  CheckCircle,
  XCircle,
  AlertCircle,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  Printer,
  Copy,
  ChevronDown,
  ChevronUp,
  Building,
  Download,
  FileText,
  RefreshCw,
  Calendar,
  Hash,
  BookOpen,
} from "lucide-react";

interface ChequeBook {
  id: string;
  bank_account_id: string;
  book_name: string;
  cheque_series_from: string;
  cheque_series_to: string;
  current_cheque: string;
  total_leaves: number;
  used_leaves: number;
  is_active: boolean;
  created_at?: string;
  bank_account?: {
    account_name: string;
    bank_name: string;
    account_number?: string;
  };
}

interface BankAccount {
  id: string;
  account_name: string;
  bank_name: string;
  account_number?: string;
  ifsc_code?: string;
}

// Print component for cheque books
const PrintView = ({
  chequeBooks,
  visibleColumns,
  formatDate,
  getBankAccountName,
  companyName,
  onComplete,
}: {
  chequeBooks: ChequeBook[];
  visibleColumns: Record<string, boolean>;
  formatDate: (dateString: string | null | undefined) => string;
  getBankAccountName: (id?: string) => string;
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
            Cheque Books List
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
              {visibleColumns.bookName && (
                <th style={{
                  padding: '12px',
                  textAlign: 'left',
                  borderRight: '1px solid #ddd',
                  fontWeight: 'bold'
                }}>
                  Book Name
                </th>
              )}
              {visibleColumns.bankAccount && (
                <th style={{
                  padding: '12px',
                  textAlign: 'left',
                  borderRight: '1px solid #ddd',
                  fontWeight: 'bold'
                }}>
                  Bank Account
                </th>
              )}
              {visibleColumns.seriesFrom && (
                <th style={{
                  padding: '12px',
                  textAlign: 'left',
                  borderRight: '1px solid #ddd',
                  fontWeight: 'bold'
                }}>
                  Series From
                </th>
              )}
              {visibleColumns.seriesTo && (
                <th style={{
                  padding: '12px',
                  textAlign: 'left',
                  borderRight: '1px solid #ddd',
                  fontWeight: 'bold'
                }}>
                  Series To
                </th>
              )}
              {visibleColumns.currentCheque && (
                <th style={{
                  padding: '12px',
                  textAlign: 'left',
                  borderRight: '1px solid #ddd',
                  fontWeight: 'bold'
                }}>
                  Current Cheque
                </th>
              )}
              {visibleColumns.leaves && (
                <th style={{
                  padding: '12px',
                  textAlign: 'left',
                  borderRight: '1px solid #ddd',
                  fontWeight: 'bold'
                }}>
                  Used/Total
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
            {chequeBooks.map((book, index) => (
              <tr key={book.id} style={{
                borderBottom: '1px solid #ddd',
                backgroundColor: index % 2 === 0 ? '#fff' : '#f9f9f9'
              }}>
                {visibleColumns.bookName && (
                  <td style={{
                    padding: '12px',
                    borderRight: '1px solid #ddd'
                  }}>
                    {book.book_name || 'Unnamed Book'}
                  </td>
                )}
                {visibleColumns.bankAccount && (
                  <td style={{
                    padding: '12px',
                    borderRight: '1px solid #ddd'
                  }}>
                    {book.bank_account?.account_name || getBankAccountName(book.bank_account_id)}
                  </td>
                )}
                {visibleColumns.seriesFrom && (
                  <td style={{
                    padding: '12px',
                    borderRight: '1px solid #ddd'
                  }}>
                    {book.cheque_series_from}
                  </td>
                )}
                {visibleColumns.seriesTo && (
                  <td style={{
                    padding: '12px',
                    borderRight: '1px solid #ddd'
                  }}>
                    {book.cheque_series_to}
                  </td>
                )}
                {visibleColumns.currentCheque && (
                  <td style={{
                    padding: '12px',
                    borderRight: '1px solid #ddd'
                  }}>
                    {book.current_cheque}
                  </td>
                )}
                {visibleColumns.leaves && (
                  <td style={{
                    padding: '12px',
                    borderRight: '1px solid #ddd'
                  }}>
                    {book.used_leaves}/{book.total_leaves}
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
                      backgroundColor: book.is_active ? '#d1fae5' : '#fee2e2',
                      color: book.is_active ? '#065f46' : '#991b1b'
                    }}>
                      {book.is_active ? 'Active' : 'Inactive'}
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
            Total Cheque Books: {chequeBooks.length}
          </div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            Page 1 of 1
          </div>
        </div>
      </div>
    </div>
  );
};

// Local formatter functions
const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString.includes('T') ? dateString : dateString + 'T00:00:00');
    if (isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  } catch {
    return '-';
  }
};

export default function ChequeBooksPage() {
  const router = useRouter();
  const { company } = useAuth();
  const [chequeBooks, setChequeBooks] = useState<ChequeBook[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  
  // Filters state
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [bankAccountFilter, setBankAccountFilter] = useState("");
  
  // UI state
  const [showFilters, setShowFilters] = useState(false);
  const [showColumnDropdown, setShowColumnDropdown] = useState(false);
  const [activeActionMenu, setActiveActionMenu] = useState<string | null>(null);
  const [showPrintView, setShowPrintView] = useState(false);
  const [chequeBooksToPrint, setChequeBooksToPrint] = useState<ChequeBook[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  
  // Form state for add modal
  const [formData, setFormData] = useState({
    bank_account_id: "",
    book_name: "",
    cheque_series_from: "",
    cheque_series_to: "",
  });
  
  // Export loading states
  const [copyLoading, setCopyLoading] = useState(false);
  const [excelLoading, setExcelLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [csvLoading, setCsvLoading] = useState(false);
  const [printLoading, setPrintLoading] = useState(false);
  
  const [cachedExportData, setCachedExportData] = useState<ChequeBook[] | null>(null);
  
  // Column visibility
  const [visibleColumns, setVisibleColumns] = useState({
    bookName: true,
    bankAccount: true,
    seriesFrom: true,
    seriesTo: true,
    currentCheque: true,
    leaves: true,
    status: true,
    actions: true,
  });

  const companyId = company?.id || (typeof window !== "undefined" ? localStorage.getItem("company_id") : null);

  useEffect(() => {
    if (companyId) {
      fetchChequeBooks();
      fetchBankAccounts();
    }
  }, [companyId]);

  useEffect(() => {
    if (companyId) {
      fetchChequeBooks();
      setCachedExportData(null);
    }
  }, [statusFilter, bankAccountFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, bankAccountFilter, search]);

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

  const fetchChequeBooks = async () => {
    try {
      setLoading(true);
      if (!company?.id) {
        setLoading(false);
        return;
      }
      const response = await api.get(`/companies/${company?.id}/cheque-books`);
      // Enhance with bank account details
      const booksWithDetails = response.data.map((book: ChequeBook) => ({
        ...book,
        bank_account: bankAccounts.find(acc => acc.id === book.bank_account_id)
      }));
      setChequeBooks(booksWithDetails || []);
      setError("");
    } catch (err) {
      setError("Failed to load cheque books");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchBankAccounts = async () => {
    try {
      if (!company?.id) return;
      const response = await api.get(`/companies/${company?.id}/bank-accounts`);
      setBankAccounts(response.data || []);
    } catch (error) {
      console.error("Error fetching bank accounts:", error);
    }
  };

  const fetchAllChequeBooksForExport = useCallback(async (): Promise<ChequeBook[]> => {
    try {
      if (!company?.id) return [];

      const response = await api.get(`/companies/${company?.id}/cheque-books`);
      const booksWithDetails = response.data.map((book: ChequeBook) => ({
        ...book,
        bank_account: bankAccounts.find(acc => acc.id === book.bank_account_id)
      }));
      const allBooks = booksWithDetails || [];
      setCachedExportData(allBooks);
      return allBooks;
    } catch (error) {
      console.error("Export fetch failed:", error);
      return [];
    }
  }, [company?.id, bankAccounts]);

  const getExportData = async (): Promise<ChequeBook[]> => {
    if (cachedExportData) return cachedExportData;
    return await fetchAllChequeBooksForExport();
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchChequeBooks();
  };

  const handleReset = () => {
    setSearch("");
    setStatusFilter("");
    setBankAccountFilter("");
    fetchChequeBooks();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post(`/companies/${company?.id}/cheque-books`, formData);
      setShowModal(false);
      setFormData({
        bank_account_id: "",
        book_name: "",
        cheque_series_from: "",
        cheque_series_to: "",
      });
      fetchChequeBooks();
    } catch (error) {
      console.error("Error creating cheque book:", error);
      alert("Error creating cheque book");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeClass = (isActive: boolean): string => {
    return isActive 
      ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
      : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
  };

  const getBankAccountName = (id?: string): string => {
    if (!id) return '-';
    const account = bankAccounts.find((a) => a.id === id);
    return account ? `${account.account_name} - ${account.bank_name}` : '-';
  };

  // Apply search filter locally for export data
  const applySearchFilter = (data: ChequeBook[]): ChequeBook[] => {
    if (!search) return data;
    
    const searchLower = search.toLowerCase();
    return data.filter(book => {
      return (
        book.book_name?.toLowerCase().includes(searchLower) ||
        book.cheque_series_from?.includes(search) ||
        book.cheque_series_to?.includes(search) ||
        book.current_cheque?.includes(search) ||
        getBankAccountName(book.bank_account_id).toLowerCase().includes(searchLower) ||
        false
      );
    });
  };

  // Apply filters locally
  const applyFilters = (data: ChequeBook[]): ChequeBook[] => {
    let filtered = data;
    
    if (statusFilter) {
      filtered = filtered.filter(book => 
        statusFilter === 'active' ? book.is_active : !book.is_active
      );
    }
    
    if (bankAccountFilter) {
      filtered = filtered.filter(book => book.bank_account_id === bankAccountFilter);
    }
    
    return filtered;
  };

  const filteredChequeBooks = chequeBooks.filter(book => {
    if (statusFilter) {
      const isActive = statusFilter === 'active';
      if (book.is_active !== isActive) return false;
    }
    if (bankAccountFilter && book.bank_account_id !== bankAccountFilter) return false;
    
    if (search) {
      const searchLower = search.toLowerCase();
      return (
        book.book_name?.toLowerCase().includes(searchLower) ||
        book.cheque_series_from?.includes(search) ||
        book.cheque_series_to?.includes(search) ||
        book.current_cheque?.includes(search) ||
        getBankAccountName(book.bank_account_id).toLowerCase().includes(searchLower) ||
        false
      );
    }
    
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filteredChequeBooks.length / pageSize));
  const pagedChequeBooks = filteredChequeBooks.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Export functions
  const copyToClipboard = async () => {
    if (copyLoading) return;
    setCopyLoading(true);
    try {
      const allData = await getExportData();
      let filtered = applySearchFilter(allData);
      filtered = applyFilters(filtered);
      
      const headers: string[] = [];
      const rows = filtered.map(book => {
        const row: string[] = [];

        if (visibleColumns.bookName) {
          if (!headers.includes("Book Name")) headers.push("Book Name");
          row.push(book.book_name || "Unnamed Book");
        }

        if (visibleColumns.bankAccount) {
          if (!headers.includes("Bank Account")) headers.push("Bank Account");
          row.push(getBankAccountName(book.bank_account_id));
        }

        if (visibleColumns.seriesFrom) {
          if (!headers.includes("Series From")) headers.push("Series From");
          row.push(book.cheque_series_from);
        }

        if (visibleColumns.seriesTo) {
          if (!headers.includes("Series To")) headers.push("Series To");
          row.push(book.cheque_series_to);
        }

        if (visibleColumns.currentCheque) {
          if (!headers.includes("Current Cheque")) headers.push("Current Cheque");
          row.push(book.current_cheque);
        }

        if (visibleColumns.leaves) {
          if (!headers.includes("Used/Total")) headers.push("Used/Total");
          row.push(`${book.used_leaves}/${book.total_leaves}`);
        }

        if (visibleColumns.status) {
          if (!headers.includes("Status")) headers.push("Status");
          row.push(book.is_active ? "Active" : "Inactive");
        }

        return row;
      });

      const text = [headers.join("\t"), ...rows.map(r => r.join("\t"))].join("\n");
      await navigator.clipboard.writeText(text);
      alert("Cheque book data copied to clipboard");
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
      
      const exportData = filtered.map(book => {
        const row: Record<string, any> = {};

        if (visibleColumns.bookName) {
          row["Book Name"] = book.book_name || "Unnamed Book";
        }

        if (visibleColumns.bankAccount) {
          row["Bank Account"] = getBankAccountName(book.bank_account_id);
        }

        if (visibleColumns.seriesFrom) {
          row["Series From"] = book.cheque_series_from;
        }

        if (visibleColumns.seriesTo) {
          row["Series To"] = book.cheque_series_to;
        }

        if (visibleColumns.currentCheque) {
          row["Current Cheque"] = book.current_cheque;
        }

        if (visibleColumns.leaves) {
          row["Used Leaves"] = book.used_leaves;
          row["Total Leaves"] = book.total_leaves;
          row["Remaining Leaves"] = book.total_leaves - book.used_leaves;
        }

        if (visibleColumns.status) {
          row["Status"] = book.is_active ? "Active" : "Inactive";
        }

        row["Bank Account ID"] = book.bank_account_id;
        row["Created At"] = book.created_at ? formatDate(book.created_at) : "-";
        
        return row;
      });

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Cheque Books");
      XLSX.writeFile(wb, "cheque_books.xlsx");
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
      const body = filtered.map(book => {
        const row: string[] = [];

        if (visibleColumns.bookName) {
          if (!headers.includes("Book Name")) headers.push("Book Name");
          row.push(book.book_name || "Unnamed Book");
        }

        if (visibleColumns.bankAccount) {
          if (!headers.includes("Bank Account")) headers.push("Bank Account");
          row.push(getBankAccountName(book.bank_account_id));
        }

        if (visibleColumns.seriesFrom) {
          if (!headers.includes("Series From")) headers.push("Series From");
          row.push(book.cheque_series_from);
        }

        if (visibleColumns.seriesTo) {
          if (!headers.includes("Series To")) headers.push("Series To");
          row.push(book.cheque_series_to);
        }

        if (visibleColumns.currentCheque) {
          if (!headers.includes("Current")) headers.push("Current");
          row.push(book.current_cheque);
        }

        if (visibleColumns.leaves) {
          if (!headers.includes("Used/Total")) headers.push("Used/Total");
          row.push(`${book.used_leaves}/${book.total_leaves}`);
        }

        if (visibleColumns.status) {
          if (!headers.includes("Status")) headers.push("Status");
          row.push(book.is_active ? "Active" : "Inactive");
        }

        return row;
      });

      autoTable(doc, {
        ...getProfessionalTableTheme(doc, "Cheque Books List", company?.name || "", "l"),
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
      doc.save("cheque_books.pdf");
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
      
      const exportData = filtered.map(book => {
        const row: Record<string, any> = {};

        if (visibleColumns.bookName) {
          row["Book Name"] = book.book_name || "Unnamed Book";
        }

        if (visibleColumns.bankAccount) {
          row["Bank Account"] = getBankAccountName(book.bank_account_id);
        }

        if (visibleColumns.seriesFrom) {
          row["Series From"] = book.cheque_series_from;
        }

        if (visibleColumns.seriesTo) {
          row["Series To"] = book.cheque_series_to;
        }

        if (visibleColumns.currentCheque) {
          row["Current Cheque"] = book.current_cheque;
        }

        if (visibleColumns.leaves) {
          row["Used Leaves"] = book.used_leaves;
          row["Total Leaves"] = book.total_leaves;
        }

        if (visibleColumns.status) {
          row["Status"] = book.is_active ? "Active" : "Inactive";
        }

        return row;
      });

      const ws = XLSX.utils.json_to_sheet(exportData);
      const csv = XLSX.utils.sheet_to_csv(ws);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      saveAs(blob, "cheque_books.csv");
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
      setChequeBooksToPrint(filtered);
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

  const handleDelete = async (bookId: string, bookName: string) => {
    if (window.confirm(`Are you sure you want to delete cheque book "${bookName}"? This action cannot be undone.`)) {
      try {
        if (company?.id) {
          await api.delete(`/companies/${company.id}/cheque-books/${bookId}`);
          fetchChequeBooks();
        }
      } catch (error) {
        console.error("Error deleting cheque book:", error);
        alert("Failed to delete cheque book");
      }
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
          chequeBooks={chequeBooksToPrint}
          visibleColumns={visibleColumns}
          formatDate={formatDate}
          getBankAccountName={getBankAccountName}
          companyName={company?.name || ''}
        />
      )}

      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Cheque Books
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Manage and track all your cheque books
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 transition bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Add Cheque Book
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="px-6 py-6 bg-gray-50 dark:bg-gray-900">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Total Cheque Books */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {chequeBooks.length.toLocaleString()}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Total Cheque Books
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </div>

          {/* Active Cheque Books */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-green-600">
                  {chequeBooks.filter(b => b.is_active).length}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Active Cheque Books
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </div>

          {/* Total Leaves Available */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-blue-600">
                  {chequeBooks.reduce((sum, book) => sum + (book.total_leaves - book.used_leaves), 0)}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Available Cheque Leaves
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
                placeholder="Search by book name, series, or bank account..."
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
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            {/* Bank Account Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Bank Account
              </label>
              <select
                value={bankAccountFilter}
                onChange={(e) => setBankAccountFilter(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="">All Bank Accounts</option>
                {bankAccounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.account_name} - {account.bank_name}
                  </option>
                ))}
              </select>
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
                {visibleColumns.bookName && (
                  <th className="text-left px-3 py-3">
                    Book Name
                  </th>
                )}
                {visibleColumns.bankAccount && (
                  <th className="text-left px-3 py-3">
                    Bank Account
                  </th>
                )}
                {visibleColumns.seriesFrom && (
                  <th className="text-left px-3 py-3">
                    Series From
                  </th>
                )}
                {visibleColumns.seriesTo && (
                  <th className="text-left px-3 py-3">
                    Series To
                  </th>
                )}
                {visibleColumns.currentCheque && (
                  <th className="text-left px-3 py-3">
                    Current
                  </th>
                )}
                {visibleColumns.leaves && (
                  <th className="text-left px-3 py-3">
                    Used/Total
                  </th>
                )}
                {visibleColumns.status && (
                  <th className="w-[96px] min-w-[96px] max-w-[96px] text-left px-2 py-3">
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
              ) : filteredChequeBooks.length === 0 ? (
                <tr>
                  <td colSpan={Object.values(visibleColumns).filter(Boolean).length + 1} className="px-6 py-8 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <BookOpen className="w-12 h-12 text-gray-400 mb-2" />
                      <p className="text-lg font-medium text-gray-900 dark:text-white mb-1">
                        No cheque books found
                      </p>
                      <p className="text-gray-500 dark:text-gray-400 mb-4">
                        {statusFilter || search || bankAccountFilter ?
                          "No cheque books found matching your filters. Try adjusting your search criteria." :
                          "Add your first cheque book to start tracking."}
                      </p>
                      <button
                        onClick={() => setShowModal(true)}
                        className="text-indigo-600 hover:underline dark:text-indigo-400"
                      >
                        Add your first cheque book
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                pagedChequeBooks.map((book, index) => {
                    return (
                      <tr
                        key={book.id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                      >
                        <td className="px-3 py-4 align-top break-words text-gray-700 dark:text-gray-300 w-[60px]">
                          {(currentPage - 1) * pageSize + index + 1}
                        </td>
                        {visibleColumns.bookName && (
                          <td className="px-3 py-4 align-top break-words">
                            <div className="min-w-0 max-w-[200px]">
                              <div className="font-medium text-gray-900 dark:text-white truncate">
                                {book.book_name || 'Unnamed Book'}
                              </div>
                            </div>
                          </td>
                        )}
                        {visibleColumns.bankAccount && (
                          <td className="px-3 py-4 align-top break-words">
                            <div className="min-w-0 max-w-[250px]">
                              <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                                <Building className="w-4 h-4 flex-shrink-0" />
                                <span className="truncate">
                                  {book.bank_account?.account_name || getBankAccountName(book.bank_account_id)}
                                </span>
                              </div>
                              {book.bank_account?.bank_name && (
                                <div className="text-xs text-gray-500 dark:text-gray-400 truncate ml-6">
                                  {book.bank_account.bank_name}
                                </div>
                              )}
                            </div>
                          </td>
                        )}
                        {visibleColumns.seriesFrom && (
                          <td className="px-3 py-4 align-top break-words">
                            <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                              <Hash className="w-4 h-4 text-gray-400" />
                              {book.cheque_series_from}
                            </div>
                          </td>
                        )}
                        {visibleColumns.seriesTo && (
                          <td className="px-3 py-4 align-top break-words">
                            <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                              <Hash className="w-4 h-4 text-gray-400" />
                              {book.cheque_series_to}
                            </div>
                          </td>
                        )}
                        {visibleColumns.currentCheque && (
                          <td className="px-3 py-4 align-top break-words">
                            <div className="flex items-center gap-2 font-medium text-gray-900 dark:text-white">
                              <CreditCard className="w-4 h-4 text-gray-400" />
                              {book.current_cheque}
                            </div>
                          </td>
                        )}
                        {visibleColumns.leaves && (
                          <td className="px-3 py-4 align-top break-words">
                            <div className="flex items-center gap-2">
                              <div className="w-16 bg-gray-200 rounded-full h-2 dark:bg-gray-700">
                                <div 
                                  className="bg-indigo-600 h-2 rounded-full" 
                                  style={{ width: `${(book.used_leaves / book.total_leaves) * 100}%` }}
                                ></div>
                              </div>
                              <span className="text-sm text-gray-700 dark:text-gray-300">
                                {book.used_leaves}/{book.total_leaves}
                              </span>
                            </div>
                          </td>
                        )}
                        {visibleColumns.status && (
                          <td className="w-[96px] min-w-[96px] max-w-[96px] px-2 py-4 align-top">
                            <span
                              className={`inline-flex whitespace-nowrap px-2 py-0.5 rounded-full text-xs font-medium ${
                                getStatusBadgeClass(book.is_active)
                              }`}
                            >
                              {book.is_active ? (
                                <CheckCircle className="w-3 h-3 mr-1" />
                              ) : (
                                <XCircle className="w-3 h-3 mr-1" />
                              )}
                              {book.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                        )}
                        {visibleColumns.actions && (
                          <td className="w-[52px] min-w-[52px] max-w-[52px] px-1 py-4 text-center align-top">
                            <div className="relative action-dropdown-container inline-flex justify-center w-full">
                              <button
                                onClick={() =>
                                  setActiveActionMenu(
                                    activeActionMenu === book.id ? null : book.id
                                  )
                                }
                                className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-50 dark:hover:text-gray-300 dark:hover:bg-gray-700/50 transition-all duration-200"
                              >
                                <MoreVertical className="w-4 h-4" />
                              </button>

                              {activeActionMenu === book.id && (
                                <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg shadow-xl py-1 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                                  <Link
                                    href={`/banking/cheques/books/${book.id}`}
                                    onClick={() => setActiveActionMenu(null)}
                                    className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                                  >
                                    <Eye className="w-4 h-4 text-gray-400" />
                                    <span>View Details</span>
                                  </Link>

                                  <Link
                                    href={`/banking/cheques/books/edit/${book.id}`}
                                    onClick={() => setActiveActionMenu(null)}
                                    className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                                  >
                                    <Edit className="w-4 h-4 text-gray-400" />
                                    <span>Edit</span>
                                  </Link>

                                  <div className="my-1 border-t border-gray-100 dark:border-gray-700"></div>
                                  <button
                                    onClick={() => {
                                      handleDelete(book.id, book.book_name || 'Unnamed Book');
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
      {!loading && filteredChequeBooks.length > 0 && (
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, filteredChequeBooks.length)} of {filteredChequeBooks.length}
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

      {/* Add Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-lg rounded-sm border border-stroke bg-white p-6 shadow-default dark:border-strokedark dark:bg-boxdark">
            <h3 className="mb-4 text-xl font-semibold text-black dark:text-white">
              Add Cheque Book
            </h3>
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="mb-2.5 block text-black dark:text-white">
                  Bank Account <span className="text-meta-1">*</span>
                </label>
                <select
                  value={formData.bank_account_id}
                  onChange={(e) => setFormData({ ...formData, bank_account_id: e.target.value })}
                  required
                  className="w-full rounded border-[1.5px] border-stroke bg-transparent px-5 py-3 font-medium outline-none transition focus:border-primary dark:border-form-strokedark dark:bg-form-input"
                >
                  <option value="">Select Bank Account</option>
                  {bankAccounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.account_name} - {account.bank_name} {account.account_number ? `(${account.account_number})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mb-4">
                <label className="mb-2.5 block text-black dark:text-white">Book Name</label>
                <input
                  type="text"
                  value={formData.book_name}
                  onChange={(e) => setFormData({ ...formData, book_name: e.target.value })}
                  placeholder="e.g., Book 1"
                  className="w-full rounded border-[1.5px] border-stroke bg-transparent px-5 py-3 font-medium outline-none transition focus:border-primary dark:border-form-strokedark dark:bg-form-input"
                />
              </div>
              <div className="mb-4 grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-2.5 block text-black dark:text-white">
                    Series From <span className="text-meta-1">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.cheque_series_from}
                    onChange={(e) => setFormData({ ...formData, cheque_series_from: e.target.value })}
                    placeholder="e.g., 000001"
                    required
                    className="w-full rounded border-[1.5px] border-stroke bg-transparent px-5 py-3 font-medium outline-none transition focus:border-primary dark:border-form-strokedark dark:bg-form-input"
                  />
                </div>
                <div>
                  <label className="mb-2.5 block text-black dark:text-white">
                    Series To <span className="text-meta-1">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.cheque_series_to}
                    onChange={(e) => setFormData({ ...formData, cheque_series_to: e.target.value })}
                    placeholder="e.g., 000100"
                    required
                    className="w-full rounded border-[1.5px] border-stroke bg-transparent px-5 py-3 font-medium outline-none transition focus:border-primary dark:border-form-strokedark dark:bg-form-input"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded border border-stroke px-6 py-2 font-medium text-black hover:shadow-1 dark:border-strokedark dark:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded bg-primary px-6 py-2 font-medium text-gray hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}