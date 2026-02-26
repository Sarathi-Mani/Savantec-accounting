"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import api from "@/services/api";
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
  Download,
  FileText,
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
  AlertCircle,
  Clock,
  Ban,
  CreditCard,
  Calendar,
  User,
  Building,
  IndianRupee,
  FileWarning,
  Loader2,
} from "lucide-react";

interface Cheque {
  id: string;
  cheque_type: string;
  cheque_number: string;
  cheque_date: string;
  amount: number;
  payee_name: string;
  status: string;
  drawn_on_bank?: string;
  notes?: string;
  party_id?: string;
  party_type?: string;
  created_at?: string;
  stop_date?: string;
  stop_reason?: string;
}

interface ChequeBook {
  id: string;
  book_name: string;
  current_cheque: string;
  bank_account_id: string;
  is_active: boolean;
}

interface Vendor {
  id: string;
  name: string;
}

type ModalMode = "create" | "view" | "edit";

// Print component for cheques
const PrintView = ({
  cheques,
  visibleColumns,
  formatDate,
  getStatusText,
  getStatusColor,
  companyName,
  onComplete,
}: {
  cheques: Cheque[];
  visibleColumns: Record<string, boolean>;
  formatDate: (dateString: string) => string;
  getStatusText: (status: string) => string;
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
            Issued Cheques List
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
              {visibleColumns.chequeNumber && (
                <th style={{
                  padding: '12px',
                  textAlign: 'left',
                  borderRight: '1px solid #ddd',
                  fontWeight: 'bold'
                }}>
                  Cheque No.
                </th>
              )}
              {visibleColumns.chequeDate && (
                <th style={{
                  padding: '12px',
                  textAlign: 'left',
                  borderRight: '1px solid #ddd',
                  fontWeight: 'bold'
                }}>
                  Date
                </th>
              )}
              {visibleColumns.payee && (
                <th style={{
                  padding: '12px',
                  textAlign: 'left',
                  borderRight: '1px solid #ddd',
                  fontWeight: 'bold'
                }}>
                  Payee
                </th>
              )}
              {visibleColumns.amount && (
                <th style={{
                  padding: '12px',
                  textAlign: 'right',
                  borderRight: '1px solid #ddd',
                  fontWeight: 'bold'
                }}>
                  Amount (₹)
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
            {cheques.map((cheque, index) => (
              <tr key={cheque.id} style={{
                borderBottom: '1px solid #ddd',
                backgroundColor: index % 2 === 0 ? '#fff' : '#f9f9f9'
              }}>
                {visibleColumns.chequeNumber && (
                  <td style={{
                    padding: '12px',
                    borderRight: '1px solid #ddd',
                    fontFamily: 'monospace'
                  }}>
                    {cheque.cheque_number}
                  </td>
                )}
                {visibleColumns.chequeDate && (
                  <td style={{
                    padding: '12px',
                    borderRight: '1px solid #ddd'
                  }}>
                    {formatDate(cheque.cheque_date)}
                  </td>
                )}
                {visibleColumns.payee && (
                  <td style={{
                    padding: '12px',
                    borderRight: '1px solid #ddd'
                  }}>
                    {cheque.payee_name}
                  </td>
                )}
                {visibleColumns.amount && (
                  <td style={{
                    padding: '12px',
                    borderRight: '1px solid #ddd',
                    textAlign: 'right',
                    fontWeight: 'bold'
                  }}>
                    ₹{cheque.amount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
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
                      backgroundColor: 
                        cheque.status === 'cleared' ? '#d1fae5' :
                        cheque.status === 'bounced' ? '#fee2e2' :
                        cheque.status === 'issued' ? '#fef3c7' :
                        cheque.status === 'deposited' ? '#dbeafe' :
                        cheque.status === 'stopped' ? '#fee2e2' :
                        cheque.status === 'cancelled' ? '#f3f4f6' :
                        '#f3f4f6',
                      color: 
                        cheque.status === 'cleared' ? '#065f46' :
                        cheque.status === 'bounced' ? '#991b1b' :
                        cheque.status === 'issued' ? '#92400e' :
                        cheque.status === 'deposited' ? '#1e40af' :
                        cheque.status === 'stopped' ? '#991b1b' :
                        cheque.status === 'cancelled' ? '#374151' :
                        '#374151'
                    }}>
                      {getStatusText(cheque.status)}
                    </span>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{
              borderTop: '2px solid #ddd',
              backgroundColor: '#f3f4f6',
              fontWeight: 'bold'
            }}>
              <td colSpan={visibleColumns.chequeNumber && visibleColumns.chequeDate && visibleColumns.payee ? 3 : 2} style={{ padding: '12px', textAlign: 'right' }}>
                Total Amount:
              </td>
              {visibleColumns.amount && (
                <td style={{ padding: '12px', textAlign: 'right' }}>
                  ₹{cheques.reduce((sum, ch) => sum + (ch.amount || 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </td>
              )}
              {visibleColumns.status && <td style={{ padding: '12px' }}></td>}
            </tr>
          </tfoot>
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
            Total Cheques: {cheques.length}
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
const formatDate = (dateString: string): string => {
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

export default function IssuedChequesPage() {
  const router = useRouter();
  const { company } = useAuth();
  const [cheques, setCheques] = useState<Cheque[]>([]);
  const [chequeBooks, setChequeBooks] = useState<ChequeBook[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Filters state
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  
  // UI state
  const [showFilters, setShowFilters] = useState(false);
  const [showColumnDropdown, setShowColumnDropdown] = useState(false);
  const [activeActionMenu, setActiveActionMenu] = useState<string | null>(null);
  const [showPrintView, setShowPrintView] = useState(false);
  const [chequesToPrint, setChequesToPrint] = useState<Cheque[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>("create");
  const [selectedCheque, setSelectedCheque] = useState<Cheque | null>(null);
  const [saving, setSaving] = useState(false);
  const pageSize = 10;
  
  // Export loading states
  const [copyLoading, setCopyLoading] = useState(false);
  const [excelLoading, setExcelLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [csvLoading, setCsvLoading] = useState(false);
  const [printLoading, setPrintLoading] = useState(false);
  
  const [cachedExportData, setCachedExportData] = useState<Cheque[] | null>(null);

  const [formData, setFormData] = useState({
    cheque_book_id: "",
    cheque_number: "",
    cheque_date: new Date().toISOString().split("T")[0],
    amount: "",
    payee_name: "",
    party_id: "",
    party_type: "vendor",
    notes: "",
  });
  
  // Column visibility
  const [visibleColumns, setVisibleColumns] = useState({
    chequeNumber: true,
    chequeDate: true,
    payee: true,
    amount: true,
    status: true,
    actions: true,
  });

  const companyId = company?.id || (typeof window !== "undefined" ? localStorage.getItem("company_id") : null);

  useEffect(() => {
    if (companyId) {
      fetchCheques();
      fetchChequeBooks();
      fetchVendors();
    }
  }, [companyId]);

  useEffect(() => {
    if (companyId) {
      fetchCheques();
      setCachedExportData(null);
    }
  }, [statusFilter, fromDate, toDate]);

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

  const fetchCheques = async () => {
    try {
      setLoading(true);
      const response = await api.get(
        `/companies/${company?.id}/cheques?cheque_type=issued`
      );
      setCheques(response.data);
    } catch (error) {
      console.error("Error fetching cheques:", error);
      setError("Failed to load cheques");
    } finally {
      setLoading(false);
    }
  };

  const fetchChequeBooks = async () => {
    try {
      const response = await api.get(`/companies/${company?.id}/cheque-books`);
      setChequeBooks(response.data.filter((book: ChequeBook) => book.is_active));
    } catch (error) {
      console.error("Error fetching cheque books:", error);
    }
  };

  const fetchVendors = async () => {
    try {
      const response = await api.get(`/companies/${company?.id}/vendors`);
      setVendors(response.data.customers || []);
    } catch (error) {
      console.error("Error fetching vendors:", error);
    }
  };

  const fetchAllChequesForExport = useCallback(async (): Promise<Cheque[]> => {
    try {
      if (!company?.id) return [];
      const response = await api.get(`/companies/${company?.id}/cheques?cheque_type=issued`);
      const allCheques = response.data || [];
      setCachedExportData(allCheques);
      return allCheques;
    } catch (error) {
      console.error("Export fetch failed:", error);
      return [];
    }
  }, [company?.id]);

  const getExportData = async (): Promise<Cheque[]> => {
    if (cachedExportData) return cachedExportData;
    return await fetchAllChequesForExport();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });

    if (name === "cheque_book_id" && value && modalMode === "create") {
      const selectedBook = chequeBooks.find((b) => b.id === value);
      if (selectedBook) {
        setFormData((prev) => ({
          ...prev,
          cheque_book_id: value,
          cheque_number: selectedBook.current_cheque,
        }));
      }
    }

    if (name === "party_id" && value && formData.party_type === "vendor") {
      const selectedVendor = vendors.find((v) => v.id === value);
      if (selectedVendor) {
        setFormData((prev) => ({
          ...prev,
          party_id: value,
          payee_name: selectedVendor.name,
        }));
      }
    }
  };

  const resetForm = () => {
    setFormData({
      cheque_book_id: "",
      cheque_number: "",
      cheque_date: new Date().toISOString().split("T")[0],
      amount: "",
      payee_name: "",
      party_id: "",
      party_type: "vendor",
      notes: "",
    });
    setError(null);
    setSelectedCheque(null);
  };

  const openCreateModal = () => {
    resetForm();
    setModalMode("create");
    setShowModal(true);
  };

  const openViewModal = (cheque: Cheque) => {
    setSelectedCheque(cheque);
    setModalMode("view");
    setShowModal(true);
  };

  const openEditModal = (cheque: Cheque) => {
    setSelectedCheque(cheque);
    setFormData({
      cheque_book_id: "",
      cheque_number: cheque.cheque_number,
      cheque_date: cheque.cheque_date.split("T")[0],
      amount: cheque.amount.toString(),
      payee_name: cheque.payee_name,
      party_id: cheque.party_id || "",
      party_type: cheque.party_type || "vendor",
      notes: cheque.notes || "",
    });
    setModalMode("edit");
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    if (modalMode === "create" && !formData.cheque_book_id) {
      setError("Please select a cheque book");
      setSaving(false);
      return;
    }
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      setError("Please enter a valid amount");
      setSaving(false);
      return;
    }
    if (!formData.payee_name.trim()) {
      setError("Please enter payee name");
      setSaving(false);
      return;
    }

    try {
      if (modalMode === "create") {
        const payload: any = {
          cheque_book_id: formData.cheque_book_id,
          cheque_date: new Date(formData.cheque_date).toISOString(),
          amount: parseFloat(formData.amount),
          payee_name: formData.payee_name.trim(),
          notes: formData.notes.trim() || null,
        };
        if (formData.cheque_number) {
          payload.cheque_number = formData.cheque_number;
        }
        if (formData.party_id) {
          payload.party_id = formData.party_id;
          payload.party_type = formData.party_type;
        }
        await api.post(`/companies/${company?.id}/cheques/issue`, payload);
        setSuccess("Cheque issued successfully!");
        fetchChequeBooks();
      } else if (modalMode === "edit" && selectedCheque) {
        const payload: any = {
          cheque_date: new Date(formData.cheque_date).toISOString(),
          amount: parseFloat(formData.amount),
          payee_name: formData.payee_name.trim(),
          notes: formData.notes.trim() || null,
        };
        if (formData.party_id) {
          payload.party_id = formData.party_id;
          payload.party_type = formData.party_type;
        }
        await api.put(`/companies/${company?.id}/cheques/${selectedCheque.id}`, payload);
        setSuccess("Cheque updated successfully!");
      }

      setShowModal(false);
      resetForm();
      fetchCheques();
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: any) {
      console.error("Error:", error);
      setError(error.response?.data?.detail || "Operation failed");
      setTimeout(() => setError(null), 3000);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (cheque: Cheque) => {
    if (!confirm(`Are you sure you want to delete cheque ${cheque.cheque_number}?`)) return;

    try {
      await api.delete(`/companies/${company?.id}/cheques/${cheque.id}`);
      fetchCheques();
      setSuccess("Cheque deleted successfully!");
      setTimeout(() => setSuccess(null), 3000);
      setActiveActionMenu(null);
    } catch (error: any) {
      setError(error.response?.data?.detail || "Failed to delete cheque");
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleStopPayment = async (cheque: Cheque) => {
    const reason = prompt("Enter reason for stopping payment:");
    if (!reason) return;

    try {
      await api.post(`/companies/${company?.id}/cheques/${cheque.id}/stop-payment?stop_reason=${encodeURIComponent(reason)}`);
      fetchCheques();
      setSuccess("Payment stopped successfully!");
      setTimeout(() => setSuccess(null), 3000);
      setActiveActionMenu(null);
    } catch (error: any) {
      setError(error.response?.data?.detail || "Failed to stop payment");
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleCancel = async (cheque: Cheque) => {
    if (!confirm(`Are you sure you want to cancel cheque ${cheque.cheque_number}?`)) return;

    try {
      await api.post(`/companies/${company?.id}/cheques/${cheque.id}/cancel`);
      fetchCheques();
      setSuccess("Cheque cancelled successfully!");
      setTimeout(() => setSuccess(null), 3000);
      setActiveActionMenu(null);
    } catch (error: any) {
      setError(error.response?.data?.detail || "Failed to cancel cheque");
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchCheques();
  };

  const handleReset = () => {
    setSearch("");
    setFromDate("");
    setToDate("");
    setStatusFilter("");
    fetchCheques();
  };

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      'issued': 'Issued',
      'deposited': 'Deposited',
      'cleared': 'Cleared',
      'bounced': 'Bounced',
      'stopped': 'Stopped',
      'cancelled': 'Cancelled',
    };
    return statusMap[status] || status.charAt(0).toUpperCase() + status.slice(1);
  };

  const getStatusBadgeClass = (status: string): string => {
    const statusColors: Record<string, string> = {
      cleared: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
      bounced: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
      issued: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
      deposited: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
      stopped: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
      cancelled: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
    };
    return statusColors[status] || "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'cleared': return <CheckCircle className="w-3 h-3 mr-1" />;
      case 'bounced': return <XCircle className="w-3 h-3 mr-1" />;
      case 'issued': return <Clock className="w-3 h-3 mr-1" />;
      case 'deposited': return <CreditCard className="w-3 h-3 mr-1" />;
      case 'stopped': return <Ban className="w-3 h-3 mr-1" />;
      case 'cancelled': return <XCircle className="w-3 h-3 mr-1" />;
      default: return <AlertCircle className="w-3 h-3 mr-1" />;
    }
  };

  // Apply search filter locally for export data
  const applySearchFilter = (data: Cheque[]): Cheque[] => {
    if (!search) return data;
    
    const searchLower = search.toLowerCase();
    return data.filter(cheque => {
      return (
        cheque.cheque_number?.toLowerCase().includes(searchLower) ||
        cheque.payee_name?.toLowerCase().includes(searchLower) ||
        cheque.notes?.toLowerCase().includes(searchLower) ||
        cheque.amount?.toString().includes(search)
      );
    });
  };

  // Apply filters locally
  const applyFilters = (data: Cheque[]): Cheque[] => {
    let filtered = data;
    
    if (statusFilter) {
      filtered = filtered.filter(cheque => cheque.status === statusFilter);
    }
    
    // Date filters
    if (fromDate) {
      filtered = filtered.filter(cheque => {
        if (!cheque.cheque_date) return false;
        const chequeDate = new Date(cheque.cheque_date);
        const from = new Date(fromDate);
        return chequeDate >= from;
      });
    }
    
    if (toDate) {
      filtered = filtered.filter(cheque => {
        if (!cheque.cheque_date) return false;
        const chequeDate = new Date(cheque.cheque_date);
        const to = new Date(toDate);
        return chequeDate <= to;
      });
    }
    
    return filtered;
  };

  const filteredCheques = cheques.filter(cheque => {
    if (statusFilter && cheque.status !== statusFilter) return false;
    
    if (fromDate && cheque.cheque_date) {
      const chequeDate = new Date(cheque.cheque_date);
      const from = new Date(fromDate);
      if (chequeDate < from) return false;
    }
    
    if (toDate && cheque.cheque_date) {
      const chequeDate = new Date(cheque.cheque_date);
      const to = new Date(toDate);
      if (chequeDate > to) return false;
    }
    
    if (search) {
      const searchLower = search.toLowerCase();
      return (
        cheque.cheque_number?.toLowerCase().includes(searchLower) ||
        cheque.payee_name?.toLowerCase().includes(searchLower) ||
        cheque.notes?.toLowerCase().includes(searchLower) ||
        cheque.amount?.toString().includes(search)
      );
    }
    
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filteredCheques.length / pageSize));
  const pagedCheques = filteredCheques.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const totalAmount = filteredCheques.reduce((sum, ch) => sum + (ch.amount || 0), 0);

  // Export functions
  const copyToClipboard = async () => {
    if (copyLoading) return;
    setCopyLoading(true);
    try {
      const allData = await getExportData();
      let filtered = applySearchFilter(allData);
      filtered = applyFilters(filtered);
      
      const headers: string[] = [];
      const rows = filtered.map(cheque => {
        const row: string[] = [];

        if (visibleColumns.chequeNumber) {
          if (!headers.includes("Cheque No.")) headers.push("Cheque No.");
          row.push(cheque.cheque_number || "-");
        }

        if (visibleColumns.chequeDate) {
          if (!headers.includes("Date")) headers.push("Date");
          row.push(formatDate(cheque.cheque_date));
        }

        if (visibleColumns.payee) {
          if (!headers.includes("Payee")) headers.push("Payee");
          row.push(cheque.payee_name);
        }

        if (visibleColumns.amount) {
          if (!headers.includes("Amount")) headers.push("Amount");
          row.push(`₹${cheque.amount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
        }

        if (visibleColumns.status) {
          if (!headers.includes("Status")) headers.push("Status");
          row.push(getStatusText(cheque.status));
        }

        return row;
      });

      const text = [headers.join("\t"), ...rows.map(r => r.join("\t"))].join("\n");
      await navigator.clipboard.writeText(text);
      setSuccess("Cheque data copied to clipboard");
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error("Copy failed:", error);
      setError("Failed to copy data. Please try again.");
      setTimeout(() => setError(null), 3000);
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
      
      const exportData = filtered.map(cheque => {
        const row: Record<string, any> = {};

        if (visibleColumns.chequeNumber) {
          row["Cheque Number"] = cheque.cheque_number || "-";
        }

        if (visibleColumns.chequeDate) {
          row["Cheque Date"] = formatDate(cheque.cheque_date);
        }

        if (visibleColumns.payee) {
          row["Payee Name"] = cheque.payee_name;
        }

        if (visibleColumns.amount) {
          row["Amount (₹)"] = cheque.amount || 0;
        }

        if (visibleColumns.status) {
          row["Status"] = getStatusText(cheque.status);
        }

        row["Notes"] = cheque.notes || "";
        row["Drawn On Bank"] = cheque.drawn_on_bank || "";
        
        return row;
      });

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Issued Cheques");
      XLSX.writeFile(wb, "issued_cheques.xlsx");
      setSuccess("Excel exported successfully!");
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error("Excel export failed:", error);
      setError("Failed to export Excel. Please try again.");
      setTimeout(() => setError(null), 3000);
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
      const body = filtered.map(cheque => {
        const row: string[] = [];

        if (visibleColumns.chequeNumber) {
          if (!headers.includes("Cheque No.")) headers.push("Cheque No.");
          row.push(cheque.cheque_number || "N/A");
        }

        if (visibleColumns.chequeDate) {
          if (!headers.includes("Date")) headers.push("Date");
          row.push(formatDate(cheque.cheque_date));
        }

        if (visibleColumns.payee) {
          if (!headers.includes("Payee")) headers.push("Payee");
          row.push(cheque.payee_name);
        }

        if (visibleColumns.amount) {
          if (!headers.includes("Amount (₹)")) headers.push("Amount (₹)");
          row.push(`₹${cheque.amount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
        }

        if (visibleColumns.status) {
          if (!headers.includes("Status")) headers.push("Status");
          row.push(getStatusText(cheque.status));
        }

        return row;
      });

      // Add total row
      if (visibleColumns.amount) {
        body.push([
          ...Array(headers.length - 1).fill(""),
          `Total: ₹${totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
        ]);
      }

      autoTable(doc, {
        ...getProfessionalTableTheme(doc, "Issued Cheques List", company?.name || "", "l"),
        head: [headers],
        body: body,
        styles: {
          fontSize: 9,
          cellPadding: 3,
          overflow: "linebreak",
          font: "helvetica",
        },
        foot: body.length > filtered.length ? [body[body.length - 1]] : undefined,
      });

      addPdfPageNumbers(doc, "l");
      doc.save("issued_cheques.pdf");
      setSuccess("PDF exported successfully!");
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error("PDF export failed:", error);
      setError("Failed to export PDF. Please try again.");
      setTimeout(() => setError(null), 3000);
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
      
      const exportData = filtered.map(cheque => {
        const row: Record<string, any> = {};

        if (visibleColumns.chequeNumber) {
          row["Cheque Number"] = cheque.cheque_number || "-";
        }

        if (visibleColumns.chequeDate) {
          row["Cheque Date"] = formatDate(cheque.cheque_date);
        }

        if (visibleColumns.payee) {
          row["Payee Name"] = cheque.payee_name;
        }

        if (visibleColumns.amount) {
          row["Amount"] = cheque.amount || 0;
        }

        if (visibleColumns.status) {
          row["Status"] = getStatusText(cheque.status);
        }

        return row;
      });

      const ws = XLSX.utils.json_to_sheet(exportData);
      const csv = XLSX.utils.sheet_to_csv(ws);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      saveAs(blob, "issued_cheques.csv");
      setSuccess("CSV exported successfully!");
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error("CSV export failed:", error);
      setError("Failed to export CSV. Please try again.");
      setTimeout(() => setError(null), 3000);
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
      setChequesToPrint(filtered);
      setShowPrintView(true);
    } catch (error) {
      console.error("Print failed:", error);
      setError("Failed to prepare print view. Please try again.");
      setTimeout(() => setError(null), 3000);
    } finally {
      setPrintLoading(false);
    }
  };

  const toggleColumn = (key: keyof typeof visibleColumns) => {
    setVisibleColumns(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const canEdit = (cheque: Cheque) => !["cleared", "deposited"].includes(cheque.status);
  const canDelete = (cheque: Cheque) => !["cleared", "deposited"].includes(cheque.status);

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
          cheques={chequesToPrint}
          visibleColumns={visibleColumns}
          formatDate={formatDate}
          getStatusText={getStatusText}
          getStatusColor={getStatusBadgeClass}
          companyName={company?.name || ''}
        />
      )}

      {/* Success/Error Messages */}
      {success && (
        <div className="mx-6 mt-4 bg-green-50 border border-green-200 rounded-lg p-4 dark:bg-green-900/20 dark:border-green-800">
          <p className="text-green-800 dark:text-green-400">{success}</p>
        </div>
      )}
      {error && !showModal && (
        <div className="mx-6 mt-4 bg-red-50 border border-red-200 rounded-lg p-4 dark:bg-red-900/20 dark:border-red-800">
          <p className="text-red-800 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Issued Cheques
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Manage and track all issued cheques
            </p>
          </div>
          <button
            onClick={openCreateModal}
            className="px-4 py-2 transition bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Issue Cheque
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="px-6 py-6 bg-gray-50 dark:bg-gray-900">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
          {/* Total Cheques */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {cheques.length.toLocaleString()}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Total Cheques
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </div>

          {/* Total Amount */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-green-600">
                  ₹{cheques.reduce((sum, ch) => sum + (ch.amount || 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Total Amount
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                <IndianRupee className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </div>

          {/* Issued Cheques */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-yellow-600">
                  {cheques.filter(c => c.status === 'issued').length}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Issued (Pending)
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-yellow-100 dark:bg-yellow-900/20 flex items-center justify-center">
                <Clock className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
              </div>
            </div>
          </div>

          {/* Cleared Cheques */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-blue-600">
                  {cheques.filter(c => c.status === 'cleared').length}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Cleared
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
                placeholder="Search by cheque number, payee, or notes..."
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
                <Loader2 className="w-5 h-5 animate-spin" />
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
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <FileText className="w-5 h-5" />
              )}
              Excel
            </button>

            <button
              onClick={exportPDF}
              disabled={pdfLoading}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {pdfLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Download className="w-5 h-5" />
              )}
              PDF
            </button>

            <button
              onClick={exportCSV}
              disabled={csvLoading}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {csvLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <FileText className="w-5 h-5" />
              )}
              CSV
            </button>

            <button
              onClick={handlePrint}
              disabled={printLoading}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {printLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Printer className="w-5 h-5" />
              )}
              Print
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
                <option value="issued">Issued</option>
                <option value="deposited">Deposited</option>
                <option value="cleared">Cleared</option>
                <option value="bounced">Bounced</option>
                <option value="stopped">Stopped</option>
                <option value="cancelled">Cancelled</option>
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

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto md:overflow-x-hidden">
          <table className="w-full min-w-[800px] md:min-w-full table-fixed">
            <thead className="bg-gray-200 dark:bg-gray-700/50">
              <tr className="text-sm font-semibold text-gray-600 dark:text-gray-300">
                <th className="text-left px-3 py-3 w-[60px]">
                  S.No
                </th>
                {visibleColumns.chequeNumber && (
                  <th className="text-left px-3 py-3 w-[120px]">
                    Cheque No.
                  </th>
                )}
                {visibleColumns.chequeDate && (
                  <th className="text-left px-3 py-3 w-[100px]">
                    Date
                  </th>
                )}
                {visibleColumns.payee && (
                  <th className="text-left px-3 py-3 min-w-[200px]">
                    Payee
                  </th>
                )}
                {visibleColumns.amount && (
                  <th className="text-right px-3 py-3 w-[120px]">
                    Amount (₹)
                  </th>
                )}
                {visibleColumns.status && (
                  <th className="text-left px-3 py-3 w-[100px]">
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
              ) : filteredCheques.length === 0 ? (
                <tr>
                  <td colSpan={Object.values(visibleColumns).filter(Boolean).length + 1} className="px-6 py-8 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <CreditCard className="w-12 h-12 text-gray-400 mb-2" />
                      <p className="text-lg font-medium text-gray-900 dark:text-white mb-1">
                        No issued cheques found
                      </p>
                      <p className="text-gray-500 dark:text-gray-400 mb-4">
                        {statusFilter || search ?
                          "No cheques found matching your filters. Try adjusting your search criteria." :
                          "Issue your first cheque to get started."}
                      </p>
                      <button
                        onClick={openCreateModal}
                        className="text-indigo-600 hover:underline dark:text-indigo-400"
                      >
                        Issue your first cheque
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                pagedCheques.map((cheque, index) => (
                  <tr
                    key={cheque.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer"
                    onClick={() => openViewModal(cheque)}
                  >
                    <td className="px-3 py-4 align-top break-words text-gray-700 dark:text-gray-300">
                      {(currentPage - 1) * pageSize + index + 1}
                    </td>
                    {visibleColumns.chequeNumber && (
                      <td className="px-3 py-4 align-top break-words">
                        <div className="font-mono font-medium text-gray-900 dark:text-white">
                          {cheque.cheque_number}
                        </div>
                      </td>
                    )}
                    {visibleColumns.chequeDate && (
                      <td className="px-3 py-4 align-top break-words">
                        <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                          <Calendar className="w-4 h-4 flex-shrink-0" />
                          <span>{formatDate(cheque.cheque_date)}</span>
                        </div>
                      </td>
                    )}
                    {visibleColumns.payee && (
                      <td className="px-3 py-4 align-top break-words">
                        <div className="min-w-0 max-w-[240px]">
                          <div className="font-medium text-gray-900 dark:text-white truncate">
                            {cheque.payee_name}
                          </div>
                          {cheque.notes && (
                            <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                              {cheque.notes}
                            </div>
                          )}
                        </div>
                      </td>
                    )}
                    {visibleColumns.amount && (
                      <td className="px-3 py-4 align-top break-words text-right">
                        <div className="font-medium text-gray-900 dark:text-white">
                          ₹{cheque.amount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </div>
                      </td>
                    )}
                    {visibleColumns.status && (
                      <td className="px-3 py-4 align-top">
                        <span
                          className={`inline-flex items-center whitespace-nowrap px-2 py-0.5 rounded-full text-xs font-medium ${
                            getStatusBadgeClass(cheque.status)
                          }`}
                        >
                          {getStatusIcon(cheque.status)}
                          {getStatusText(cheque.status)}
                        </span>
                      </td>
                    )}
                    {visibleColumns.actions && (
                      <td className="w-[52px] min-w-[52px] max-w-[52px] px-1 py-4 text-center align-top" onClick={(e) => e.stopPropagation()}>
                        <div className="relative action-dropdown-container inline-flex justify-center w-full">
                          <button
                            onClick={() =>
                              setActiveActionMenu(
                                activeActionMenu === cheque.id ? null : cheque.id
                              )
                            }
                            className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-50 dark:hover:text-gray-300 dark:hover:bg-gray-700/50 transition-all duration-200"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>

                          {activeActionMenu === cheque.id && (
                            <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg shadow-xl py-1 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                              <button
                                onClick={() => {
                                  openViewModal(cheque);
                                  setActiveActionMenu(null);
                                }}
                                className="flex w-full items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                              >
                                <Eye className="w-4 h-4 text-gray-400" />
                                <span>View Details</span>
                              </button>

                              {canEdit(cheque) && (
                                <button
                                  onClick={() => {
                                    openEditModal(cheque);
                                    setActiveActionMenu(null);
                                  }}
                                  className="flex w-full items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                                >
                                  <Edit className="w-4 h-4 text-gray-400" />
                                  <span>Edit</span>
                                </button>
                              )}

                              {cheque.status === "issued" && (
                                <button
                                  onClick={() => handleStopPayment(cheque)}
                                  className="flex w-full items-center gap-3 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                >
                                  <Ban className="w-4 h-4" />
                                  <span>Stop Payment</span>
                                </button>
                              )}

                              {cheque.status === "issued" && (
                                <button
                                  onClick={() => handleCancel(cheque)}
                                  className="flex w-full items-center gap-3 px-3 py-2 text-sm text-yellow-600 dark:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 transition-colors"
                                >
                                  <XCircle className="w-4 h-4" />
                                  <span>Cancel Cheque</span>
                                </button>
                              )}

                              {canDelete(cheque) && (
                                <>
                                  <div className="my-1 border-t border-gray-100 dark:border-gray-700"></div>
                                  <button
                                    onClick={() => handleDelete(cheque)}
                                    className="flex w-full items-center gap-3 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                    <span>Delete Cheque</span>
                                  </button>
                                </>
                              )}
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
      {!loading && filteredCheques.length > 0 && (
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, filteredCheques.length)} of {filteredCheques.length} cheques
            {totalAmount > 0 && (
              <span className="ml-2 font-medium">
                (Total: ₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })})
              </span>
            )}
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

      {/* Modal for Create/View/Edit */}
      {showModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="w-full max-w-lg rounded-lg bg-white p-6 dark:bg-gray-800 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                {modalMode === "create" ? "Issue Cheque" : modalMode === "view" ? "Cheque Details" : "Edit Cheque"}
              </h3>
              <button
                onClick={() => { setShowModal(false); resetForm(); }}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {error && (
              <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400">
                {error}
              </div>
            )}

            {/* View Mode */}
            {modalMode === "view" && selectedCheque && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Cheque Number</p>
                    <p className="font-medium text-gray-900 dark:text-white font-mono">{selectedCheque.cheque_number}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Cheque Date</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {formatDate(selectedCheque.cheque_date)}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Amount</p>
                    <p className="font-medium text-gray-900 dark:text-white text-lg">
                      ₹{selectedCheque.amount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Status</p>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(selectedCheque.status)}`}>
                      {getStatusIcon(selectedCheque.status)}
                      {getStatusText(selectedCheque.status)}
                    </span>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Payee Name</p>
                  <p className="font-medium text-gray-900 dark:text-white">{selectedCheque.payee_name}</p>
                </div>
                {selectedCheque.drawn_on_bank && (
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Drawn On Bank</p>
                    <p className="text-gray-900 dark:text-white">{selectedCheque.drawn_on_bank}</p>
                  </div>
                )}
                {selectedCheque.notes && (
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Notes</p>
                    <p className="text-gray-900 dark:text-white">{selectedCheque.notes}</p>
                  </div>
                )}
                {selectedCheque.stop_reason && (
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded border border-red-200 dark:border-red-800">
                    <p className="text-sm text-red-800 dark:text-red-400 font-medium">Stop Reason</p>
                    <p className="text-red-800 dark:text-red-400">{selectedCheque.stop_reason}</p>
                  </div>
                )}
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                  {canEdit(selectedCheque) && (
                    <button
                      onClick={() => openEditModal(selectedCheque)}
                      className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors"
                    >
                      Edit
                    </button>
                  )}
                  <button
                    onClick={() => { setShowModal(false); resetForm(); }}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}

            {/* Create/Edit Mode */}
            {(modalMode === "create" || modalMode === "edit") && (
              <>
                {modalMode === "create" && chequeBooks.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-600 dark:text-gray-400 mb-4">No active cheque books found.</p>
                    <Link href="/banking/cheques/books" className="text-indigo-600 hover:underline dark:text-indigo-400">
                      Create a cheque book first →
                    </Link>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit}>
                    {modalMode === "create" && (
                      <div className="mb-4">
                        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Cheque Book <span className="text-red-500">*</span>
                        </label>
                        <select
                          name="cheque_book_id"
                          value={formData.cheque_book_id}
                          onChange={handleInputChange}
                          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2 text-gray-900 dark:text-white outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
                          required
                        >
                          <option value="">Select Cheque Book</option>
                          {chequeBooks.map((book) => (
                            <option key={book.id} value={book.id}>
                              {book.book_name || "Unnamed Book"} (Next: {book.current_cheque})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Cheque Number {modalMode === "edit" && "(Read Only)"}
                        </label>
                        <input
                          type="text"
                          name="cheque_number"
                          value={formData.cheque_number}
                          onChange={handleInputChange}
                          placeholder="Auto from cheque book"
                          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2 text-gray-900 dark:text-white outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
                          readOnly={modalMode === "edit"}
                        />
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Cheque Date <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="date"
                          name="cheque_date"
                          value={formData.cheque_date}
                          onChange={handleInputChange}
                          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2 text-gray-900 dark:text-white outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
                          required
                        />
                      </div>
                    </div>

                    <div className="mb-4">
                      <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Amount <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        name="amount"
                        value={formData.amount}
                        onChange={handleInputChange}
                        placeholder="0.00"
                        step="0.01"
                        min="0"
                        className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2 text-gray-900 dark:text-white outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
                        required
                      />
                    </div>

                    <div className="mb-4">
                      <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Pay To (Vendor)
                      </label>
                      <select
                        name="party_id"
                        value={formData.party_id}
                        onChange={handleInputChange}
                        className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2 text-gray-900 dark:text-white outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="">Select Vendor (Optional)</option>
                        {vendors.map((vendor) => (
                          <option key={vendor.id} value={vendor.id}>
                            {vendor.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="mb-4">
                      <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Payee Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="payee_name"
                        value={formData.payee_name}
                        onChange={handleInputChange}
                        placeholder="Name as written on cheque"
                        className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2 text-gray-900 dark:text-white outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
                        required
                      />
                    </div>

                    <div className="mb-6">
                      <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Notes
                      </label>
                      <textarea
                        name="notes"
                        value={formData.notes}
                        onChange={handleInputChange}
                        placeholder="Optional notes or reference"
                        rows={2}
                        className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2 text-gray-900 dark:text-white outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div className="flex justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => { setShowModal(false); resetForm(); }}
                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={saving}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {saving ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            {modalMode === "create" ? "Issuing..." : "Saving..."}
                          </>
                        ) : (
                          modalMode === "create" ? "Issue Cheque" : "Save Changes"
                        )}
                      </button>
                    </div>
                  </form>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}