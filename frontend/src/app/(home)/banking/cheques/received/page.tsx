"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
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
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Eye,
  Edit,
  Trash2,
  Landmark,
  Users,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  MoreVertical,
  Printer,
  Building,
  Calendar,
  CreditCard,
} from "lucide-react";

interface Cheque {
  id: string;
  cheque_type: string;
  cheque_number: string;
  cheque_date: string;
  amount: number;
  drawer_name: string;
  drawn_on_bank?: string;
  drawn_on_branch?: string;
  status: string;
  notes?: string;
  party_id?: string;
  party_type?: string;
  deposit_date?: string;
  bounce_date?: string;
  bounce_reason?: string;
  bounce_charges?: number;
}

interface BankAccount {
  id: string;
  account_name: string;
  bank_name: string;
}

interface Customer {
  id: string;
  name: string;
}

type ModalMode = "create" | "view" | "edit";

// Print component for cheques
const PrintView = ({
  cheques,
  visibleColumns,
  formatDate,
  formatCurrency,
  getStatusText,
  getStatusColor,
  companyName,
  onComplete,
}: {
  cheques: Cheque[];
  visibleColumns: Record<string, boolean>;
  formatDate: (dateString: string | null | undefined) => string;
  formatCurrency: (amount: number) => string;
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
            Received Cheques List
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
              {visibleColumns.drawer && (
                <th style={{
                  padding: '12px',
                  textAlign: 'left',
                  borderRight: '1px solid #ddd',
                  fontWeight: 'bold'
                }}>
                  Drawer
                </th>
              )}
              {visibleColumns.bank && (
                <th style={{
                  padding: '12px',
                  textAlign: 'left',
                  borderRight: '1px solid #ddd',
                  fontWeight: 'bold'
                }}>
                  Bank
                </th>
              )}
              {visibleColumns.amount && (
                <th style={{
                  padding: '12px',
                  textAlign: 'right',
                  borderRight: '1px solid #ddd',
                  fontWeight: 'bold'
                }}>
                  Amount
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
                    borderRight: '1px solid #ddd'
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
                {visibleColumns.drawer && (
                  <td style={{
                    padding: '12px',
                    borderRight: '1px solid #ddd'
                  }}>
                    {cheque.drawer_name}
                  </td>
                )}
                {visibleColumns.bank && (
                  <td style={{
                    padding: '12px',
                    borderRight: '1px solid #ddd'
                  }}>
                    {cheque.drawn_on_bank || '-'}
                  </td>
                )}
                {visibleColumns.amount && (
                  <td style={{
                    padding: '12px',
                    borderRight: '1px solid #ddd',
                    textAlign: 'right',
                    fontWeight: 'bold'
                  }}>
                    {formatCurrency(cheque.amount)}
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
                        cheque.status === 'received' ? '#fef3c7' :
                        cheque.status === 'deposited' ? '#dbeafe' :
                        '#f3f4f6',
                      color: 
                        cheque.status === 'cleared' ? '#065f46' :
                        cheque.status === 'bounced' ? '#991b1b' :
                        cheque.status === 'received' ? '#92400e' :
                        cheque.status === 'deposited' ? '#1e40af' :
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
            <tr style={{ backgroundColor: '#f3f4f6', borderTop: '2px solid #ddd' }}>
              <td colSpan={visibleColumns.amount ? 5 : 4} style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold' }}>
                Total:
              </td>
              {visibleColumns.amount && (
                <td style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold' }}>
                  {formatCurrency(cheques.reduce((sum, c) => sum + c.amount, 0))}
                </td>
              )}
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

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(amount);
};

export default function ReceivedChequesPage() {
  const router = useRouter();
  const { company } = useAuth();
  const [cheques, setCheques] = useState<Cheque[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>("create");
  const [selectedCheque, setSelectedCheque] = useState<Cheque | null>(null);
  const [saving, setSaving] = useState(false);

  // Filters state
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [bankFilter, setBankFilter] = useState("");

  // UI state
  const [showFilters, setShowFilters] = useState(false);
  const [showColumnDropdown, setShowColumnDropdown] = useState(false);
  const [activeActionMenu, setActiveActionMenu] = useState<string | null>(null);
  const [showPrintView, setShowPrintView] = useState(false);
  const [chequesToPrint, setChequesToPrint] = useState<Cheque[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Export loading states
  const [copyLoading, setCopyLoading] = useState(false);
  const [excelLoading, setExcelLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [csvLoading, setCsvLoading] = useState(false);
  const [printLoading, setPrintLoading] = useState(false);

  const [cachedExportData, setCachedExportData] = useState<Cheque[] | null>(null);

  // Column visibility
  const [visibleColumns, setVisibleColumns] = useState({
    chequeNumber: true,
    chequeDate: true,
    drawer: true,
    bank: true,
    amount: true,
    status: true,
    actions: true,
  });

  const [formData, setFormData] = useState({
    cheque_number: "",
    cheque_date: new Date().toISOString().split("T")[0],
    amount: "",
    drawer_name: "",
    drawn_on_bank: "",
    drawn_on_branch: "",
    party_id: "",
    party_type: "customer",
    notes: "",
  });

  const [depositData, setDepositData] = useState({
    bank_account_id: "",
    deposit_date: new Date().toISOString().split("T")[0],
  });

  useEffect(() => {
    if (company?.id) {
      fetchCheques();
      fetchBankAccounts();
      fetchCustomers();
    }
  }, [company]);

  useEffect(() => {
    if (company?.id) {
      fetchCheques();
      setCachedExportData(null);
    }
  }, [statusFilter, fromDate, toDate, bankFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, fromDate, toDate, bankFilter, search]);

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
        `/companies/${company?.id}/cheques?cheque_type=received`
      );
      setCheques(response.data);
      setError(null);
    } catch (error) {
      console.error("Error fetching cheques:", error);
      setError("Failed to load cheques");
    } finally {
      setLoading(false);
    }
  };

  const fetchBankAccounts = async () => {
    try {
      const response = await api.get(`/companies/${company?.id}/bank-accounts`);
      setBankAccounts(response.data);
    } catch (error) {
      console.error("Error fetching bank accounts:", error);
    }
  };

  const fetchCustomers = async () => {
    try {
      const response = await api.get(`/companies/${company?.id}/customers`);
      setCustomers(response.data.customers || []);
    } catch (error) {
      console.error("Error fetching customers:", error);
    }
  };

  const fetchAllChequesForExport = async (): Promise<Cheque[]> => {
    try {
      if (!company?.id) return [];
      const response = await api.get(`/companies/${company?.id}/cheques?cheque_type=received`);
      const allCheques = response.data || [];
      setCachedExportData(allCheques);
      return allCheques;
    } catch (error) {
      console.error("Export fetch failed:", error);
      return [];
    }
  };

  const getExportData = async (): Promise<Cheque[]> => {
    if (cachedExportData) return cachedExportData;
    return await fetchAllChequesForExport();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });

    if (name === "party_id" && value) {
      const selectedCustomer = customers.find((c) => c.id === value);
      if (selectedCustomer) {
        setFormData((prev) => ({
          ...prev,
          party_id: value,
          drawer_name: selectedCustomer.name,
        }));
      }
    }
  };

  const resetForm = () => {
    setFormData({
      cheque_number: "",
      cheque_date: new Date().toISOString().split("T")[0],
      amount: "",
      drawer_name: "",
      drawn_on_bank: "",
      drawn_on_branch: "",
      party_id: "",
      party_type: "customer",
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
      cheque_number: cheque.cheque_number,
      cheque_date: cheque.cheque_date.split("T")[0],
      amount: cheque.amount.toString(),
      drawer_name: cheque.drawer_name,
      drawn_on_bank: cheque.drawn_on_bank || "",
      drawn_on_branch: cheque.drawn_on_branch || "",
      party_id: cheque.party_id || "",
      party_type: cheque.party_type || "customer",
      notes: cheque.notes || "",
    });
    setModalMode("edit");
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    if (!formData.cheque_number.trim()) {
      setError("Please enter cheque number");
      setSaving(false);
      return;
    }
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      setError("Please enter a valid amount");
      setSaving(false);
      return;
    }
    if (!formData.drawer_name.trim()) {
      setError("Please enter drawer name");
      setSaving(false);
      return;
    }

    try {
      const payload: any = {
        cheque_number: formData.cheque_number.trim(),
        cheque_date: new Date(formData.cheque_date).toISOString(),
        amount: parseFloat(formData.amount),
        drawer_name: formData.drawer_name.trim(),
        drawn_on_bank: formData.drawn_on_bank.trim() || null,
        drawn_on_branch: formData.drawn_on_branch.trim() || null,
        notes: formData.notes.trim() || null,
      };

      if (formData.party_id) {
        payload.party_id = formData.party_id;
        payload.party_type = formData.party_type;
      }

      if (modalMode === "create") {
        await api.post(`/companies/${company?.id}/cheques/receive`, payload);
        setSuccess("Cheque received successfully!");
      } else if (modalMode === "edit" && selectedCheque) {
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
    } finally {
      setSaving(false);
    }
  };

  const openDepositModal = (cheque: Cheque) => {
    setSelectedCheque(cheque);
    setDepositData({
      bank_account_id: "",
      deposit_date: new Date().toISOString().split("T")[0],
    });
    setShowDepositModal(true);
  };

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCheque || !depositData.bank_account_id) return;

    setSaving(true);
    try {
      await api.post(
        `/companies/${company?.id}/cheques/${selectedCheque.id}/deposit?bank_account_id=${depositData.bank_account_id}`
      );
      setShowDepositModal(false);
      setSelectedCheque(null);
      fetchCheques();
      setSuccess("Cheque deposited successfully!");
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: any) {
      console.error("Error depositing cheque:", error);
      setError(error.response?.data?.detail || "Failed to deposit cheque");
      setTimeout(() => setError(null), 3000);
    } finally {
      setSaving(false);
    }
  };

  const handleBounce = async (cheque: Cheque) => {
    const reason = prompt("Enter bounce reason:");
    if (!reason) return;

    const chargesStr = prompt("Enter bounce charges (0 if none):", "0");
    const charges = parseFloat(chargesStr || "0");

    try {
      await api.post(
        `/companies/${company?.id}/cheques/${cheque.id}/bounce?bounce_reason=${encodeURIComponent(reason)}&bounce_charges=${charges}`
      );
      fetchCheques();
      setSuccess("Cheque marked as bounced!");
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: any) {
      setError(error.response?.data?.detail || "Failed to mark cheque as bounced");
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleClear = async (cheque: Cheque) => {
    if (!confirm(`Mark cheque ${cheque.cheque_number} as cleared?`)) return;

    try {
      await api.post(`/companies/${company?.id}/cheques/${cheque.id}/clear`);
      fetchCheques();
      setSuccess("Cheque marked as cleared!");
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: any) {
      setError(error.response?.data?.detail || "Failed to mark cheque as cleared");
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleDelete = async (cheque: Cheque) => {
    if (!confirm(`Are you sure you want to delete cheque ${cheque.cheque_number}?`)) return;

    try {
      await api.delete(`/companies/${company?.id}/cheques/${cheque.id}`);
      fetchCheques();
      setSuccess("Cheque deleted successfully!");
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: any) {
      setError(error.response?.data?.detail || "Failed to delete cheque");
      setTimeout(() => setError(null), 3000);
    }
  };

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      'received': 'Received',
      'deposited': 'Deposited',
      'cleared': 'Cleared',
      'bounced': 'Bounced',
      'cancelled': 'Cancelled',
    };
    return statusMap[status] || status.charAt(0).toUpperCase() + status.slice(1);
  };

  const getStatusBadgeClass = (status: string): string => {
    const statusColors: Record<string, string> = {
      received: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
      deposited: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
      cleared: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
      bounced: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
      cancelled: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
    };
    return statusColors[status] || "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
  };

  // Apply search filter locally
  const applySearchFilter = (data: Cheque[]): Cheque[] => {
    if (!search) return data;
    
    const searchLower = search.toLowerCase();
    return data.filter(cheque => {
      return (
        cheque.cheque_number?.toLowerCase().includes(searchLower) ||
        cheque.drawer_name?.toLowerCase().includes(searchLower) ||
        cheque.drawn_on_bank?.toLowerCase().includes(searchLower) ||
        cheque.notes?.toLowerCase().includes(searchLower) ||
        false
      );
    });
  };

  // Apply filters locally
  const applyFilters = (data: Cheque[]): Cheque[] => {
    let filtered = data;
    
    if (statusFilter) {
      filtered = filtered.filter(cheque => cheque.status === statusFilter);
    }
    
    if (bankFilter) {
      filtered = filtered.filter(cheque => cheque.drawn_on_bank === bankFilter);
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
    if (bankFilter && cheque.drawn_on_bank !== bankFilter) return false;
    
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
        cheque.drawer_name?.toLowerCase().includes(searchLower) ||
        cheque.drawn_on_bank?.toLowerCase().includes(searchLower) ||
        cheque.notes?.toLowerCase().includes(searchLower) ||
        false
      );
    }
    
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filteredCheques.length / pageSize));
  const pagedCheques = filteredCheques.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const uniqueBanks = [...new Set(cheques.map(c => c.drawn_on_bank).filter(Boolean))];

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
          if (!headers.includes("Cheque Number")) headers.push("Cheque Number");
          row.push(cheque.cheque_number);
        }

        if (visibleColumns.chequeDate) {
          if (!headers.includes("Cheque Date")) headers.push("Cheque Date");
          row.push(formatDate(cheque.cheque_date));
        }

        if (visibleColumns.drawer) {
          if (!headers.includes("Drawer Name")) headers.push("Drawer Name");
          row.push(cheque.drawer_name);
        }

        if (visibleColumns.bank) {
          if (!headers.includes("Bank")) headers.push("Bank");
          row.push(cheque.drawn_on_bank || "-");
        }

        if (visibleColumns.amount) {
          if (!headers.includes("Amount")) headers.push("Amount");
          row.push(formatCurrency(cheque.amount));
        }

        if (visibleColumns.status) {
          if (!headers.includes("Status")) headers.push("Status");
          row.push(getStatusText(cheque.status));
        }

        return row;
      });

      const text = [headers.join("\t"), ...rows.map(r => r.join("\t"))].join("\n");
      await navigator.clipboard.writeText(text);
      alert("Cheque data copied to clipboard");
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
      
      const exportData = filtered.map(cheque => {
        const row: Record<string, any> = {};

        if (visibleColumns.chequeNumber) {
          row["Cheque Number"] = cheque.cheque_number;
        }

        if (visibleColumns.chequeDate) {
          row["Cheque Date"] = formatDate(cheque.cheque_date);
        }

        if (visibleColumns.drawer) {
          row["Drawer Name"] = cheque.drawer_name;
        }

        if (visibleColumns.bank) {
          row["Bank"] = cheque.drawn_on_bank || "";
          row["Branch"] = cheque.drawn_on_branch || "";
        }

        if (visibleColumns.amount) {
          row["Amount"] = cheque.amount;
        }

        if (visibleColumns.status) {
          row["Status"] = getStatusText(cheque.status);
        }

        row["Notes"] = cheque.notes || "";
        row["Deposit Date"] = cheque.deposit_date ? formatDate(cheque.deposit_date) : "";
        row["Bounce Reason"] = cheque.bounce_reason || "";
        
        return row;
      });

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Received Cheques");
      XLSX.writeFile(wb, "received_cheques.xlsx");
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
      const body = filtered.map(cheque => {
        const row: string[] = [];

        if (visibleColumns.chequeNumber) {
          if (!headers.includes("Cheque No.")) headers.push("Cheque No.");
          row.push(cheque.cheque_number);
        }

        if (visibleColumns.chequeDate) {
          if (!headers.includes("Date")) headers.push("Date");
          row.push(formatDate(cheque.cheque_date));
        }

        if (visibleColumns.drawer) {
          if (!headers.includes("Drawer")) headers.push("Drawer");
          row.push(cheque.drawer_name);
        }

        if (visibleColumns.bank) {
          if (!headers.includes("Bank")) headers.push("Bank");
          row.push(cheque.drawn_on_bank || "-");
        }

        if (visibleColumns.amount) {
          if (!headers.includes("Amount")) headers.push("Amount");
          row.push(formatCurrency(cheque.amount));
        }

        if (visibleColumns.status) {
          if (!headers.includes("Status")) headers.push("Status");
          row.push(getStatusText(cheque.status));
        }

        return row;
      });

      // Add total row
      if (visibleColumns.amount) {
        const total = filtered.reduce((sum, c) => sum + c.amount, 0);
        body.push([...Array(headers.length - 1).fill(""), "Total:", formatCurrency(total)]);
      }

      autoTable(doc, {
        ...getProfessionalTableTheme(doc, "Received Cheques", company?.name || "", "l"),
        head: [headers],
        body: body,
        styles: {
          fontSize: 9,
          cellPadding: 3,
          overflow: "linebreak",
          font: "helvetica",
        },
        foot: filtered.length > 0 ? [[
          ...Array(headers.length - 1).fill(""),
          "Total:",
          formatCurrency(filtered.reduce((sum, c) => sum + c.amount, 0))
        ]] : undefined,
      });

      addPdfPageNumbers(doc, "l");
      doc.save("received_cheques.pdf");
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
      
      const exportData = filtered.map(cheque => {
        const row: Record<string, any> = {};

        if (visibleColumns.chequeNumber) {
          row["Cheque Number"] = cheque.cheque_number;
        }

        if (visibleColumns.chequeDate) {
          row["Cheque Date"] = formatDate(cheque.cheque_date);
        }

        if (visibleColumns.drawer) {
          row["Drawer Name"] = cheque.drawer_name;
        }

        if (visibleColumns.bank) {
          row["Bank"] = cheque.drawn_on_bank || "";
        }

        if (visibleColumns.amount) {
          row["Amount"] = cheque.amount;
        }

        if (visibleColumns.status) {
          row["Status"] = getStatusText(cheque.status);
        }

        return row;
      });

      const ws = XLSX.utils.json_to_sheet(exportData);
      const csv = XLSX.utils.sheet_to_csv(ws);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      saveAs(blob, "received_cheques.csv");
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
      setChequesToPrint(filtered);
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

  const handleReset = () => {
    setSearch("");
    setFromDate("");
    setToDate("");
    setStatusFilter("");
    setBankFilter("");
    fetchCheques();
  };

  const canEdit = (cheque: Cheque) => !["cleared", "deposited"].includes(cheque.status);
  const canDelete = (cheque: Cheque) => !["cleared", "deposited"].includes(cheque.status);

  if (!company?.id) {
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
          formatCurrency={formatCurrency}
          getStatusText={getStatusText}
          getStatusColor={getStatusBadgeClass}
          companyName={company?.name || ''}
        />
      )}

      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Received Cheques
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Track and manage cheques received from customers
            </p>
          </div>
          <button
            onClick={openCreateModal}
            className="px-4 py-2 transition bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Receive Cheque
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
                <Landmark className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </div>

          {/* Total Amount */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(cheques.reduce((sum, c) => sum + c.amount, 0))}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Total Amount
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </div>

          {/* Pending Collection */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-yellow-600">
                  {cheques.filter(c => c.status === 'received').length}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Pending Collection
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-yellow-100 dark:bg-yellow-900/20 flex items-center justify-center">
                <Clock className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
              </div>
            </div>
          </div>

          {/* Bounced Cheques */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-red-600">
                  {cheques.filter(c => c.status === 'bounced').length}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Bounced Cheques
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                <XCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="mx-6 mt-4 bg-green-50 border border-green-200 rounded-lg p-4 dark:bg-green-900/20 dark:border-green-800">
          <p className="text-green-800 dark:text-green-400">{success}</p>
        </div>
      )}
      
      {error && !showModal && !showDepositModal && (
        <div className="mx-6 mt-4 bg-red-50 border border-red-200 rounded-lg p-4 dark:bg-red-900/20 dark:border-red-800">
          <p className="text-red-800 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Filters Section */}
      <div className="px-6 py-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by cheque number, drawer, bank..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
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
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                <option value="received">Received</option>
                <option value="deposited">Deposited</option>
                <option value="cleared">Cleared</option>
                <option value="bounced">Bounced</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            {/* Bank Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Bank
              </label>
              <select
                value={bankFilter}
                onChange={(e) => setBankFilter(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="">All Banks</option>
                {uniqueBanks.map((bank) => (
                  <option key={bank} value={bank}>
                    {bank}
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

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead className="bg-gray-200 dark:bg-gray-700/50">
              <tr className="text-sm font-semibold text-gray-600 dark:text-gray-300">
                <th className="text-left px-3 py-3 w-[60px]">
                  S.No
                </th>
                {visibleColumns.chequeNumber && (
                  <th className="text-left px-3 py-3">
                    Cheque No.
                  </th>
                )}
                {visibleColumns.chequeDate && (
                  <th className="text-left px-3 py-3">
                    Date
                  </th>
                )}
                {visibleColumns.drawer && (
                  <th className="text-left px-3 py-3">
                    Drawer
                  </th>
                )}
                {visibleColumns.bank && (
                  <th className="text-left px-3 py-3">
                    Bank
                  </th>
                )}
                {visibleColumns.amount && (
                  <th className="text-right px-3 py-3">
                    Amount
                  </th>
                )}
                {visibleColumns.status && (
                  <th className="text-left px-3 py-3 w-[100px]">
                    Status
                  </th>
                )}
                {visibleColumns.actions && (
                  <th className="text-center px-3 py-3 w-[80px]">
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
                      <Landmark className="w-12 h-12 text-gray-400 mb-2" />
                      <p className="text-lg font-medium text-gray-900 dark:text-white mb-1">
                        No cheques found
                      </p>
                      <p className="text-gray-500 dark:text-gray-400 mb-4">
                        {statusFilter || search || bankFilter ?
                          "No cheques found matching your filters. Try adjusting your search criteria." :
                          "Receive your first cheque to start tracking."}
                      </p>
                      <button
                        onClick={openCreateModal}
                        className="text-indigo-600 hover:underline dark:text-indigo-400"
                      >
                        Receive your first cheque
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
                    <td className="px-3 py-4 align-top text-gray-700 dark:text-gray-300">
                      {(currentPage - 1) * pageSize + index + 1}
                    </td>
                    {visibleColumns.chequeNumber && (
                      <td className="px-3 py-4 align-top">
                        <div className="font-medium text-gray-900 dark:text-white">
                          {cheque.cheque_number}
                        </div>
                      </td>
                    )}
                    {visibleColumns.chequeDate && (
                      <td className="px-3 py-4 align-top">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          {formatDate(cheque.cheque_date)}
                        </div>
                      </td>
                    )}
                    {visibleColumns.drawer && (
                      <td className="px-3 py-4 align-top">
                        <div className="min-w-0 max-w-[200px]">
                          <div className="font-medium text-gray-900 dark:text-white truncate">
                            {cheque.drawer_name}
                          </div>
                        </div>
                      </td>
                    )}
                    {visibleColumns.bank && (
                      <td className="px-3 py-4 align-top">
                        <div className="flex items-center gap-2">
                          <Building className="w-4 h-4 text-gray-400" />
                          {cheque.drawn_on_bank || '-'}
                        </div>
                      </td>
                    )}
                    {visibleColumns.amount && (
                      <td className="px-3 py-4 align-top text-right font-medium">
                        {formatCurrency(cheque.amount)}
                      </td>
                    )}
                    {visibleColumns.status && (
                      <td className="px-3 py-4 align-top">
                        <span
                          className={`inline-flex whitespace-nowrap px-2 py-0.5 rounded-full text-xs font-medium ${
                            getStatusBadgeClass(cheque.status)
                          }`}
                        >
                          {cheque.status === 'cleared' && <CheckCircle className="w-3 h-3 mr-1" />}
                          {cheque.status === 'bounced' && <XCircle className="w-3 h-3 mr-1" />}
                          {cheque.status === 'received' && <Clock className="w-3 h-3 mr-1" />}
                          {cheque.status === 'deposited' && <Landmark className="w-3 h-3 mr-1" />}
                          {getStatusText(cheque.status)}
                        </span>
                      </td>
                    )}
                    {visibleColumns.actions && (
                      <td className="px-3 py-4 text-center align-top" onClick={(e) => e.stopPropagation()}>
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

                              {cheque.status === "received" && (
                                <button
                                  onClick={() => {
                                    openDepositModal(cheque);
                                    setActiveActionMenu(null);
                                  }}
                                  className="flex w-full items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                                >
                                  <Landmark className="w-4 h-4 text-gray-400" />
                                  <span>Deposit</span>
                                </button>
                              )}

                              {cheque.status === "deposited" && (
                                <>
                                  <button
                                    onClick={() => {
                                      handleClear(cheque);
                                      setActiveActionMenu(null);
                                    }}
                                    className="flex w-full items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                                  >
                                    <CheckCircle className="w-4 h-4 text-gray-400" />
                                    <span>Mark Cleared</span>
                                  </button>
                                  <button
                                    onClick={() => {
                                      handleBounce(cheque);
                                      setActiveActionMenu(null);
                                    }}
                                    className="flex w-full items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                                  >
                                    <XCircle className="w-4 h-4 text-gray-400" />
                                    <span>Mark Bounced</span>
                                  </button>
                                </>
                              )}

                              {canDelete(cheque) && (
                                <>
                                  <div className="my-1 border-t border-gray-100 dark:border-gray-700"></div>
                                  <button
                                    onClick={() => {
                                      handleDelete(cheque);
                                      setActiveActionMenu(null);
                                    }}
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
                {modalMode === "create" ? "Receive Cheque" : modalMode === "view" ? "Cheque Details" : "Edit Cheque"}
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
                    <p className="font-medium text-gray-900 dark:text-white">{selectedCheque.cheque_number}</p>
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
                      {formatCurrency(selectedCheque.amount)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Status</p>
                    <span className={`inline-flex rounded-full px-3 py-1 text-sm font-medium capitalize ${getStatusBadgeClass(selectedCheque.status)}`}>
                      {getStatusText(selectedCheque.status)}
                    </span>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Drawer Name</p>
                  <p className="font-medium text-gray-900 dark:text-white">{selectedCheque.drawer_name}</p>
                </div>
                {selectedCheque.drawn_on_bank && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Bank</p>
                      <p className="text-gray-900 dark:text-white">{selectedCheque.drawn_on_bank}</p>
                    </div>
                    {selectedCheque.drawn_on_branch && (
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Branch</p>
                        <p className="text-gray-900 dark:text-white">{selectedCheque.drawn_on_branch}</p>
                      </div>
                    )}
                  </div>
                )}
                {selectedCheque.notes && (
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Notes</p>
                    <p className="text-gray-900 dark:text-white">{selectedCheque.notes}</p>
                  </div>
                )}
                {selectedCheque.deposit_date && (
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Deposited On</p>
                    <p className="text-gray-900 dark:text-white">{formatDate(selectedCheque.deposit_date)}</p>
                  </div>
                )}
                {selectedCheque.bounce_reason && (
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                    <p className="text-sm text-red-800 dark:text-red-400 font-medium">Bounce Details</p>
                    <p className="text-red-800 dark:text-red-400">Reason: {selectedCheque.bounce_reason}</p>
                    {selectedCheque.bounce_charges && selectedCheque.bounce_charges > 0 && (
                      <p className="text-red-800 dark:text-red-400">Charges: {formatCurrency(selectedCheque.bounce_charges)}</p>
                    )}
                    {selectedCheque.bounce_date && (
                      <p className="text-red-800 dark:text-red-400 text-sm">
                        Date: {formatDate(selectedCheque.bounce_date)}
                      </p>
                    )}
                  </div>
                )}
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                  {canEdit(selectedCheque) && (
                    <button
                      onClick={() => openEditModal(selectedCheque)}
                      className="rounded bg-yellow-500 px-6 py-2 font-medium text-white hover:bg-yellow-600 transition-colors"
                    >
                      Edit
                    </button>
                  )}
                  {selectedCheque.status === "received" && (
                    <button
                      onClick={() => { setShowModal(false); openDepositModal(selectedCheque); }}
                      className="rounded bg-green-500 px-6 py-2 font-medium text-white hover:bg-green-600 transition-colors"
                    >
                      Deposit
                    </button>
                  )}
                  <button
                    onClick={() => { setShowModal(false); resetForm(); }}
                    className="rounded border border-gray-300 dark:border-gray-600 px-6 py-2 font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}

            {/* Create/Edit Mode */}
            {(modalMode === "create" || modalMode === "edit") && (
              <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Cheque Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="cheque_number"
                      value={formData.cheque_number}
                      onChange={handleInputChange}
                      placeholder="e.g., 123456"
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent px-4 py-2 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                      required
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
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent px-4 py-2 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
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
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent px-4 py-2 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                    required
                  />
                </div>

                <div className="mb-4">
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Received From (Customer)
                  </label>
                  <select
                    name="party_id"
                    value={formData.party_id}
                    onChange={handleInputChange}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent px-4 py-2 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">Select Customer (Optional)</option>
                    {customers.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mb-4">
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Drawer Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="drawer_name"
                    value={formData.drawer_name}
                    onChange={handleInputChange}
                    placeholder="Name of person/company who issued the cheque"
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent px-4 py-2 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Drawn On Bank
                    </label>
                    <input
                      type="text"
                      name="drawn_on_bank"
                      value={formData.drawn_on_bank}
                      onChange={handleInputChange}
                      placeholder="e.g., HDFC Bank"
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent px-4 py-2 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Branch
                    </label>
                    <input
                      type="text"
                      name="drawn_on_branch"
                      value={formData.drawn_on_branch}
                      onChange={handleInputChange}
                      placeholder="e.g., MG Road"
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent px-4 py-2 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
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
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent px-4 py-2 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => { setShowModal(false); resetForm(); }}
                    className="rounded-lg border border-gray-300 dark:border-gray-600 px-6 py-2 font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-2 font-medium text-white hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? (
                      <>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                        {modalMode === "create" ? "Saving..." : "Updating..."}
                      </>
                    ) : (
                      modalMode === "create" ? "Receive Cheque" : "Save Changes"
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Deposit Cheque Modal */}
      {showDepositModal && selectedCheque && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 dark:bg-gray-800">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                Deposit Cheque
              </h3>
              <button
                onClick={() => setShowDepositModal(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <p className="text-sm text-gray-500 dark:text-gray-400">Cheque Details:</p>
              <p className="font-medium text-gray-900 dark:text-white">{selectedCheque.cheque_number} - {formatCurrency(selectedCheque.amount)}</p>
              <p className="text-sm text-gray-600 dark:text-gray-300">{selectedCheque.drawer_name}</p>
            </div>

            <form onSubmit={handleDeposit}>
              <div className="mb-4">
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Deposit To Bank Account <span className="text-red-500">*</span>
                </label>
                <select
                  value={depositData.bank_account_id}
                  onChange={(e) => setDepositData({ ...depositData, bank_account_id: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent px-4 py-2 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                  required
                >
                  <option value="">Select Bank Account</option>
                  {bankAccounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.account_name} - {account.bank_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowDepositModal(false)}
                  className="rounded-lg border border-gray-300 dark:border-gray-600 px-6 py-2 font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !depositData.bank_account_id}
                  className="flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-2 font-medium text-white hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                      Depositing...
                    </>
                  ) : (
                    "Deposit"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}