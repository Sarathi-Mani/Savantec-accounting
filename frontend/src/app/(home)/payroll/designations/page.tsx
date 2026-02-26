"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import api from "@/services/api";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { saveAs } from "file-saver";
import { addPdfPageNumbers, getProfessionalTableTheme } from "@/utils/pdfTheme";
import {
  Pencil,
  Trash2,
  Eye,
  Plus,
  CheckCircle,
  XCircle,
  Users,
  Search,
  Filter,
  RefreshCw,
  Copy,
  FileText,
  Download,
  Printer,
  ChevronDown,
  ChevronUp,
  Briefcase,
  MoreVertical,
  Building,
} from "lucide-react";

interface Role {
  id: string;
  name: string;
  description: string;
  is_active: boolean;
  user_count: number;
  created_at: string;
  updated_at: string;
}

interface Employee {
  id: string;
  designation_id?: string | null;
  designation?: {
    id?: string;
    name?: string;
  } | null;
}

// Print component for designations
const PrintView = ({
  designations,
  formatDate,
  getStatusText,
  companyName,
  onComplete,
}: {
  designations: Role[];
  formatDate: (dateString: string | null | undefined) => string;
  getStatusText: (status: boolean) => string;
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
            Designations List
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
              <th style={{
                padding: '12px',
                textAlign: 'left',
                borderRight: '1px solid #ddd',
                fontWeight: 'bold'
              }}>
                Role Name
              </th>
              <th style={{
                padding: '12px',
                textAlign: 'left',
                borderRight: '1px solid #ddd',
                fontWeight: 'bold'
              }}>
                Description
              </th>
              <th style={{
                padding: '12px',
                textAlign: 'left',
                borderRight: '1px solid #ddd',
                fontWeight: 'bold'
              }}>
                Users Count
              </th>
              <th style={{
                padding: '12px',
                textAlign: 'left',
                fontWeight: 'bold'
              }}>
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {designations.map((designation, index) => (
              <tr key={designation.id} style={{
                borderBottom: '1px solid #ddd',
                backgroundColor: index % 2 === 0 ? '#fff' : '#f9f9f9'
              }}>
                <td style={{
                  padding: '12px',
                  borderRight: '1px solid #ddd'
                }}>
                  {index + 1}
                </td>
                <td style={{
                  padding: '12px',
                  borderRight: '1px solid #ddd'
                }}>
                  <div style={{ fontWeight: 'bold' }}>{designation.name}</div>
                </td>
                <td style={{
                  padding: '12px',
                  borderRight: '1px solid #ddd'
                }}>
                  {designation.description || '-'}
                </td>
                <td style={{
                  padding: '12px',
                  borderRight: '1px solid #ddd'
                }}>
                  {designation.user_count || 0}
                </td>
                <td style={{ padding: '12px' }}>
                  <span style={{
                    display: 'inline-block',
                    padding: '4px 8px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    backgroundColor: designation.is_active ? '#d1fae5' : '#fee2e2',
                    color: designation.is_active ? '#065f46' : '#991b1b'
                  }}>
                    {getStatusText(designation.is_active)}
                  </span>
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
            Total Designations: {designations.length}
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

export default function RolesPage() {
  const router = useRouter();
  const { company } = useAuth();
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  
  // Filters state
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  
  // UI state
  const [showFilters, setShowFilters] = useState(false);
  const [activeActionMenu, setActiveActionMenu] = useState<string | null>(null);
  const [showPrintView, setShowPrintView] = useState(false);
  const [designationsToPrint, setDesignationsToPrint] = useState<Role[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  
  // Export loading states
  const [copyLoading, setCopyLoading] = useState(false);
  const [excelLoading, setExcelLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [csvLoading, setCsvLoading] = useState(false);
  const [printLoading, setPrintLoading] = useState(false);
  
  const [cachedExportData, setCachedExportData] = useState<Role[] | null>(null);

  useEffect(() => {
    if (company?.id) {
      fetchRoles();
    }
  }, [company]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter]);

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

  const fetchAllEmployees = async (): Promise<Employee[]> => {
    if (!company?.id) return [];

    const pageSize = 100;
    let page = 1;
    let allEmployees: Employee[] = [];

    while (true) {
      const response = await api.get(`/companies/${company.id}/payroll/employees`, {
        params: { page, page_size: pageSize },
      });
      const batch = Array.isArray(response.data) ? response.data : [];
      allEmployees = allEmployees.concat(batch);

      if (batch.length < pageSize) {
        break;
      }
      page += 1;
    }

    return allEmployees;
  };

  const fetchRoles = async () => {
    try {
      setLoading(true);
      const [rolesResponse, employees] = await Promise.all([
        api.get(`/companies/${company?.id}/payroll/designations`),
        fetchAllEmployees(),
      ]);

      const roleList: Role[] = Array.isArray(rolesResponse.data) ? rolesResponse.data : [];
      const counts = employees.reduce((acc, employee) => {
        const designationId = employee.designation_id || employee.designation?.id;
        if (designationId) {
          acc[designationId] = (acc[designationId] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>);

      const rolesWithCounts = roleList.map((role) => ({
        ...role,
        user_count: counts[role.id] || 0,
      }));

      setRoles(rolesWithCounts);
      setCachedExportData(null);
    } catch (error) {
      console.error("Error fetching roles:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllRolesForExport = async (): Promise<Role[]> => {
    try {
      if (!company?.id) return [];
      
      const response = await api.get(`/companies/${company.id}/payroll/designations`);
      const roleList: Role[] = Array.isArray(response.data) ? response.data : [];
      
      const employees = await fetchAllEmployees();
      const counts = employees.reduce((acc, employee) => {
        const designationId = employee.designation_id || employee.designation?.id;
        if (designationId) {
          acc[designationId] = (acc[designationId] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>);

      const rolesWithCounts = roleList.map((role) => ({
        ...role,
        user_count: counts[role.id] || 0,
      }));

      setCachedExportData(rolesWithCounts);
      return rolesWithCounts;
    } catch (error) {
      console.error("Export fetch failed:", error);
      return [];
    }
  };

  const getExportData = async (): Promise<Role[]> => {
    if (cachedExportData) return cachedExportData;
    return await fetchAllRolesForExport();
  };

  const handleDelete = async (roleId: string) => {
    try {
      await api.delete(`/companies/${company?.id}/payroll/designations/${roleId}`);
      fetchRoles();
      setDeleteConfirm(null);
    } catch (error) {
      console.error("Error deleting role:", error);
    }
  };

  const toggleStatus = async (roleId: string, currentStatus: boolean) => {
    try {
      await api.patch(`/companies/${company?.id}/payroll/designations/${roleId}`, {
        is_active: !currentStatus
      });
      fetchRoles();
    } catch (error) {
      console.error("Error updating role status:", error);
    }
  };

  const getStatusText = (status: boolean) => {
    return status ? 'Active' : 'Inactive';
  };

  const getStatusBadgeClass = (status: boolean): string => {
    return status 
      ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
      : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
  };

  // Apply filters locally
  const applySearchFilter = (data: Role[]): Role[] => {
    if (!search) return data;
    
    const searchLower = search.toLowerCase();
    return data.filter(role => {
      return (
        role.name?.toLowerCase().includes(searchLower) ||
        role.description?.toLowerCase().includes(searchLower) ||
        false
      );
    });
  };

  const applyStatusFilter = (data: Role[]): Role[] => {
    if (statusFilter === "") return data;
    return data.filter(role => role.is_active === (statusFilter === "active"));
  };

  const filteredRoles = roles.filter(role => {
    // Status filter
    if (statusFilter !== "") {
      if (role.is_active !== (statusFilter === "active")) return false;
    }
    
    // Search filter
    if (search) {
      const searchLower = search.toLowerCase();
      return (
        role.name?.toLowerCase().includes(searchLower) ||
        role.description?.toLowerCase().includes(searchLower)
      );
    }
    
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filteredRoles.length / pageSize));
  const pagedRoles = filteredRoles.slice(
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
      filtered = applyStatusFilter(filtered);
      
      const headers = ["S.No", "Role Name", "Description", "Users Count", "Status", "Created At"];
      const rows = filtered.map((role, index) => [
        (index + 1).toString(),
        role.name,
        role.description || "-",
        (role.user_count || 0).toString(),
        getStatusText(role.is_active),
        formatDate(role.created_at),
      ]);

      const text = [headers.join("\t"), ...rows.map(r => r.join("\t"))].join("\n");
      await navigator.clipboard.writeText(text);
      alert("Designation data copied to clipboard");
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
      filtered = applyStatusFilter(filtered);
      
      const exportData = filtered.map((role, index) => ({
        "S.No": index + 1,
        "Role Name": role.name,
        "Description": role.description || "-",
        "Users Count": role.user_count || 0,
        "Status": getStatusText(role.is_active),
        "Created At": formatDate(role.created_at),
        "Last Updated": formatDate(role.updated_at),
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Designations");
      XLSX.writeFile(wb, "designations.xlsx");
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
      filtered = applyStatusFilter(filtered);
      
      const doc = new jsPDF();
      
      const headers = ["S.No", "Role Name", "Description", "Users", "Status"];
      const body = filtered.map((role, index) => [
        (index + 1).toString(),
        role.name,
        role.description || "-",
        (role.user_count || 0).toString(),
        getStatusText(role.is_active),
      ]);

      autoTable(doc, {
        ...getProfessionalTableTheme(doc, "Designations List", company?.name || ""),
        head: [headers],
        body: body,
        styles: {
          fontSize: 9,
          cellPadding: 3,
          overflow: "linebreak",
          font: "helvetica",
        },
        columnStyles: {
          0: { cellWidth: 15 },
          1: { cellWidth: 40 },
          2: { cellWidth: 70 },
          3: { cellWidth: 20 },
          4: { cellWidth: 25 },
        },
      });

      addPdfPageNumbers(doc);
      doc.save("designations.pdf");
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
      filtered = applyStatusFilter(filtered);
      
      const exportData = filtered.map((role, index) => ({
        "S.No": index + 1,
        "Role Name": role.name,
        "Description": role.description || "-",
        "Users Count": role.user_count || 0,
        "Status": getStatusText(role.is_active),
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const csv = XLSX.utils.sheet_to_csv(ws);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      saveAs(blob, "designations.csv");
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
      filtered = applyStatusFilter(filtered);
      setDesignationsToPrint(filtered);
      setShowPrintView(true);
    } catch (error) {
      console.error("Print failed:", error);
      alert("Failed to prepare print view. Please try again.");
    } finally {
      setPrintLoading(false);
    }
  };

  const handleReset = () => {
    setSearch("");
    setStatusFilter("");
    fetchRoles();
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Search is already applied via filteredRoles
  };

  if (loading && roles.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading designations...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {showPrintView && (
        <PrintView
          onComplete={() => setShowPrintView(false)}
          designations={designationsToPrint}
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
              Designations
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Manage job roles and designations
            </p>
          </div>
          <button
            onClick={() => router.push('/payroll/designations/new')}
            className="px-4 py-2 transition bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Add Designation
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="px-6 py-6 bg-gray-50 dark:bg-gray-900">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Total Designations */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {roles.length.toLocaleString()}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Total Designations
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
                <Briefcase className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </div>

          {/* Active Designations */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-green-600">
                  {roles.filter(r => r.is_active).length}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Active Designations
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </div>

          {/* Total Users */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {roles.reduce((sum, role) => sum + (role.user_count || 0), 0)}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Total Users
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
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
                placeholder="Search by name or description..."
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
              {statusFilter && (
                <span className="ml-1 px-1.5 py-0.5 text-xs bg-indigo-100 text-indigo-800 rounded-full">
                  1
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
          </div>
        )}
      </div>

      {/* Error handling - if any */}
      {/* No error state in original, but could add */}

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead className="bg-gray-200 dark:bg-gray-700/50">
              <tr className="text-sm font-semibold text-gray-600 dark:text-gray-300">
                <th className="text-left px-6 py-3 w-16">S.No</th>
                <th className="text-left px-6 py-3">Role Name</th>
                <th className="text-left px-6 py-3">Description</th>
                <th className="text-left px-6 py-3 w-24">Users</th>
                <th className="text-left px-6 py-3 w-28">Status</th>
                <th className="text-center px-6 py-3 w-20">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700 text-sm text-gray-700 dark:text-gray-300">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center">
                    <div className="flex items-center justify-center">
                      <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
                    </div>
                  </td>
                </tr>
              ) : filteredRoles.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <Briefcase className="w-12 h-12 text-gray-400 mb-2" />
                      <p className="text-lg font-medium text-gray-900 dark:text-white mb-1">
                        No designations found
                      </p>
                      <p className="text-gray-500 dark:text-gray-400 mb-4">
                        {search || statusFilter ?
                          "No designations found matching your filters. Try adjusting your search criteria." :
                          "Add your first designation to get started."}
                      </p>
                      <button
                        onClick={() => router.push('/payroll/designations/new')}
                        className="text-indigo-600 hover:underline dark:text-indigo-400"
                      >
                        Add your first designation
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                pagedRoles.map((role, index) => (
                  <tr
                    key={role.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <td className="px-6 py-4 align-top text-gray-700 dark:text-gray-300">
                      {(currentPage - 1) * pageSize + index + 1}
                    </td>
                    <td className="px-6 py-4 align-top">
                      <div className="font-medium text-gray-900 dark:text-white">
                        {role.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 align-top text-gray-700 dark:text-gray-300">
                      {role.description || "-"}
                    </td>
                    <td className="px-6 py-4 align-top">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-gray-400" />
                        <span className="font-medium">{role.user_count || 0}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 align-top">
                      <button
                        onClick={() => toggleStatus(role.id, role.is_active)}
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium transition-colors ${
                          role.is_active
                            ? "bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50"
                            : "bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50"
                        }`}
                      >
                        {role.is_active ? (
                          <>
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Active
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3 h-3 mr-1" />
                            Inactive
                          </>
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-center align-top">
                      <div className="relative action-dropdown-container inline-flex justify-center">
                        <button
                          onClick={() =>
                            setActiveActionMenu(
                              activeActionMenu === role.id ? null : role.id
                            )
                          }
                          className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-50 dark:hover:text-gray-300 dark:hover:bg-gray-700/50 transition-all duration-200"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {activeActionMenu === role.id && (
                          <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg shadow-xl py-1 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                            <Link
                              href={`/payroll/designations/${role.id}`}
                              onClick={() => setActiveActionMenu(null)}
                              className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                            >
                              <Eye className="w-4 h-4 text-gray-400" />
                              <span>View Details</span>
                            </Link>

                            <Link
                              href={`/payroll/designations/edit/${role.id}`}
                              onClick={() => setActiveActionMenu(null)}
                              className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                            >
                              <Pencil className="w-4 h-4 text-gray-400" />
                              <span>Edit</span>
                            </Link>

                            <div className="my-1 border-t border-gray-100 dark:border-gray-700"></div>
                            <button
                              onClick={() => {
                                setDeleteConfirm(role.id);
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
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {!loading && filteredRoles.length > 0 && (
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, filteredRoles.length)} of {filteredRoles.length} designations
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

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg dark:bg-gray-800">
            <div className="mb-4 flex items-center gap-3 text-red-600 dark:text-red-400">
              <Trash2 className="w-6 h-6" />
              <h3 className="text-lg font-semibold">Delete Designation</h3>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to delete this designation? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}