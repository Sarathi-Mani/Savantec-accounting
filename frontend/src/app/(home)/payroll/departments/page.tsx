"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { payrollApi, Department } from "@/services/api";
import Link from "next/link";
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
  Building,
  Users,
  Mail,
  Phone,
  Calendar,
  CheckCircle,
  XCircle,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  Printer,
  Copy,
  ChevronDown,
  ChevronUp,
  Download,
  FileText,
  RefreshCw,
  User,
  Hash,
  Briefcase,
  AlertCircle,
} from "lucide-react";

// Print component for departments
const PrintView = ({
  departments,
  visibleColumns,
  formatDate,
  getStatusText,
  companyName,
  onComplete,
}: {
  departments: Department[];
  visibleColumns: Record<string, boolean>;
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
            Departments List
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
              {visibleColumns.code && (
                <th style={{
                  padding: '12px',
                  textAlign: 'left',
                  borderRight: '1px solid #ddd',
                  fontWeight: 'bold'
                }}>
                  Department Code
                </th>
              )}
              {visibleColumns.name && (
                <th style={{
                  padding: '12px',
                  textAlign: 'left',
                  borderRight: '1px solid #ddd',
                  fontWeight: 'bold'
                }}>
                  Department Name
                </th>
              )}
              {visibleColumns.head && (
                <th style={{
                  padding: '12px',
                  textAlign: 'left',
                  borderRight: '1px solid #ddd',
                  fontWeight: 'bold'
                }}>
                  Department Head
                </th>
              )}
              {visibleColumns.employeeCount && (
                <th style={{
                  padding: '12px',
                  textAlign: 'left',
                  borderRight: '1px solid #ddd',
                  fontWeight: 'bold'
                }}>
                  Employees
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
              {visibleColumns.createdAt && (
                <th style={{
                  padding: '12px',
                  textAlign: 'left',
                  borderRight: '1px solid #ddd',
                  fontWeight: 'bold'
                }}>
                  Created Date
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
            {departments.map((department, index) => (
              <tr key={department.id} style={{
                borderBottom: '1px solid #ddd',
                backgroundColor: index % 2 === 0 ? '#fff' : '#f9f9f9'
              }}>
                {visibleColumns.code && (
                  <td style={{
                    padding: '12px',
                    borderRight: '1px solid #ddd'
                  }}>
                    {department.code || 'N/A'}
                  </td>
                )}
                {visibleColumns.name && (
                  <td style={{
                    padding: '12px',
                    borderRight: '1px solid #ddd'
                  }}>
                    {department.name}
                  </td>
                )}
                {visibleColumns.head && (
                  <td style={{
                    padding: '12px',
                    borderRight: '1px solid #ddd'
                  }}>
                    {department.head_name || '-'}
                  </td>
                )}
                {visibleColumns.employeeCount && (
                  <td style={{
                    padding: '12px',
                    borderRight: '1px solid #ddd'
                  }}>
                    {department.employee_count || 0}
                  </td>
                )}
                {visibleColumns.description && (
                  <td style={{
                    padding: '12px',
                    borderRight: '1px solid #ddd'
                  }}>
                    {department.description || '-'}
                  </td>
                )}
                {visibleColumns.createdAt && (
                  <td style={{
                    padding: '12px',
                    borderRight: '1px solid #ddd'
                  }}>
                    {formatDate(department.created_at)}
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
                      backgroundColor: department.is_active ? '#d1fae5' : '#fee2e2',
                      color: department.is_active ? '#065f46' : '#991b1b'
                    }}>
                      {getStatusText(department.is_active)}
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
            Total Departments: {departments.length}
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

export default function DepartmentsPage() {
  const router = useRouter();
  const { company } = useAuth();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
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
  const [departmentsToPrint, setDepartmentsToPrint] = useState<Department[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  
  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    head_name: "",
    description: "",
    is_active: true
  });
  
  // Export loading states
  const [copyLoading, setCopyLoading] = useState(false);
  const [excelLoading, setExcelLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [csvLoading, setCsvLoading] = useState(false);
  const [printLoading, setPrintLoading] = useState(false);
  
  const [cachedExportData, setCachedExportData] = useState<Department[] | null>(null);
  
  // Column visibility
  const [visibleColumns, setVisibleColumns] = useState({
    code: true,
    name: true,
    head: true,
    employeeCount: true,
    description: true,
    createdAt: true,
    status: true,
    actions: true,
  });

  const columnOptions: Array<{
    key: keyof typeof visibleColumns;
    label: string;
  }> = [
    { key: "code", label: "Dept. Code" },
    { key: "name", label: "Department Name" },
    { key: "head", label: "Department Head" },
    { key: "employeeCount", label: "Employees" },
    { key: "description", label: "Description" },
    { key: "createdAt", label: "Created At" },
    { key: "status", label: "Status" },
  ];

  const companyId = company?.id || (typeof window !== "undefined" ? localStorage.getItem("company_id") : null);

  useEffect(() => {
    if (companyId) {
      fetchDepartments();
    }
  }, [companyId]);

  useEffect(() => {
    if (companyId) {
      fetchDepartments();
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
      const target = event.target;
      if (!(target instanceof Element)) return;
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

  const fetchDepartments = async () => {
    try {
      setLoading(true);
      if (!company?.id) {
        setLoading(false);
        return;
      }

      const response = await payrollApi.listDepartments(company.id);
      setDepartments(response || []);
      setError("");
    } catch (err) {
      setError("Failed to load departments");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllDepartmentsForExport = useCallback(async (): Promise<Department[]> => {
    try {
      if (!company?.id) return [];

      const departmentsList = await payrollApi.listDepartments(company.id);
      const allDepartments = departmentsList || [];
      setCachedExportData(allDepartments);
      return allDepartments;
    } catch (error) {
      console.error("Export fetch failed:", error);
      return [];
    }
  }, [company?.id]);

  const getExportData = async (): Promise<Department[]> => {
    if (cachedExportData) return cachedExportData;
    return await fetchAllDepartmentsForExport();
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchDepartments();
  };

  const handleReset = () => {
    setSearch("");
    setFromDate("");
    setToDate("");
    setStatusFilter("");
    fetchDepartments();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!company?.id || !editingDepartment) return;
      await payrollApi.updateDepartment(company.id, editingDepartment.id, formData);
      
      setShowModal(false);
      setEditingDepartment(null);
      setFormData({ name: "", code: "", head_name: "", description: "", is_active: true });
      fetchDepartments();
    } catch (error) {
      console.error("Error saving department:", error);
      alert("Failed to save department");
    }
  };

  const handleEdit = (department: Department) => {
    setEditingDepartment(department);
    setFormData({
      name: department.name,
      code: department.code || "",
      head_name: department.head_name || "",
      description: department.description || "",
      is_active: department.is_active
    });
    setShowModal(true);
  };

  const handleDelete = async (departmentId: string, departmentName: string) => {
    if (window.confirm(`Are you sure you want to delete department ${departmentName}? This action cannot be undone.`)) {
      try {
        if (company?.id) {
          await payrollApi.deleteDepartment(company.id, departmentId);
          fetchDepartments();
        }
      } catch (error) {
        console.error("Error deleting department:", error);
        alert("Failed to delete department");
      }
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

  // Apply search filter locally
  const applySearchFilter = (data: Department[]): Department[] => {
    if (!search) return data;
    
    const searchLower = search.toLowerCase();
    return data.filter(department => {
      return (
        department.name?.toLowerCase().includes(searchLower) ||
        department.code?.toLowerCase().includes(searchLower) ||
        department.head_name?.toLowerCase().includes(searchLower) ||
        department.description?.toLowerCase().includes(searchLower) ||
        false
      );
    });
  };

  // Apply filters locally
  const applyFilters = (data: Department[]): Department[] => {
    let filtered = data;
    
    if (statusFilter) {
      filtered = filtered.filter(department => 
        statusFilter === 'active' ? department.is_active : !department.is_active
      );
    }
    
    // Date filters
    if (fromDate) {
      filtered = filtered.filter(department => {
        if (!department.created_at) return false;
        const deptDate = new Date(department.created_at);
        const from = new Date(fromDate);
        return deptDate >= from;
      });
    }
    
    if (toDate) {
      filtered = filtered.filter(department => {
        if (!department.created_at) return false;
        const deptDate = new Date(department.created_at);
        const to = new Date(toDate);
        return deptDate <= to;
      });
    }
    
    return filtered;
  };

  const filteredDepartments = departments.filter(department => {
    if (statusFilter) {
      const isActive = statusFilter === 'active';
      if (department.is_active !== isActive) return false;
    }
    
    if (fromDate && department.created_at) {
      const deptDate = new Date(department.created_at);
      const from = new Date(fromDate);
      if (deptDate < from) return false;
    }
    
    if (toDate && department.created_at) {
      const deptDate = new Date(department.created_at);
      const to = new Date(toDate);
      if (deptDate > to) return false;
    }
    
    if (search) {
      const searchLower = search.toLowerCase();
      return (
        department.name?.toLowerCase().includes(searchLower) ||
        department.code?.toLowerCase().includes(searchLower) ||
        department.head_name?.toLowerCase().includes(searchLower) ||
        department.description?.toLowerCase().includes(searchLower) ||
        false
      );
    }
    
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filteredDepartments.length / pageSize));
  const pagedDepartments = filteredDepartments.slice(
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
      const rows = filtered.map(department => {
        const row: string[] = [];

        if (visibleColumns.code) {
          if (!headers.includes("Department Code")) headers.push("Department Code");
          row.push(department.code || "-");
        }

        if (visibleColumns.name) {
          if (!headers.includes("Department Name")) headers.push("Department Name");
          row.push(department.name);
        }

        if (visibleColumns.head) {
          if (!headers.includes("Department Head")) headers.push("Department Head");
          row.push(department.head_name || "-");
        }

        if (visibleColumns.employeeCount) {
          if (!headers.includes("Employees")) headers.push("Employees");
          row.push(department.employee_count?.toString() || "0");
        }

        if (visibleColumns.description) {
          if (!headers.includes("Description")) headers.push("Description");
          row.push(department.description || "-");
        }

        if (visibleColumns.createdAt) {
          if (!headers.includes("Created Date")) headers.push("Created Date");
          row.push(formatDate(department.created_at));
        }

        if (visibleColumns.status) {
          if (!headers.includes("Status")) headers.push("Status");
          row.push(getStatusText(department.is_active));
        }

        return row;
      });

      const text = [headers.join("\t"), ...rows.map(r => r.join("\t"))].join("\n");
      await navigator.clipboard.writeText(text);
      alert("Department data copied to clipboard");
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
      
      const exportData = filtered.map(department => {
        const row: Record<string, any> = {};

        if (visibleColumns.code) {
          row["Department Code"] = department.code || "-";
        }

        if (visibleColumns.name) {
          row["Department Name"] = department.name;
        }

        if (visibleColumns.head) {
          row["Department Head"] = department.head_name || "-";
        }

        if (visibleColumns.employeeCount) {
          row["Employees"] = department.employee_count || 0;
        }

        if (visibleColumns.description) {
          row["Description"] = department.description || "-";
        }

        if (visibleColumns.createdAt) {
          row["Created Date"] = formatDate(department.created_at);
        }

        if (visibleColumns.status) {
          row["Status"] = getStatusText(department.is_active);
        }

        row["Company"] = company?.name || "";
        
        return row;
      });

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Departments");
      XLSX.writeFile(wb, "departments.xlsx");
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
      const body = filtered.map(department => {
        const row: string[] = [];

        if (visibleColumns.code) {
          if (!headers.includes("Dept. Code")) headers.push("Dept. Code");
          row.push(department.code || "N/A");
        }

        if (visibleColumns.name) {
          if (!headers.includes("Department Name")) headers.push("Department Name");
          row.push(department.name);
        }

        if (visibleColumns.head) {
          if (!headers.includes("Department Head")) headers.push("Department Head");
          row.push(department.head_name || "-");
        }

        if (visibleColumns.employeeCount) {
          if (!headers.includes("Employees")) headers.push("Employees");
          row.push(department.employee_count?.toString() || "0");
        }

        if (visibleColumns.description) {
          if (!headers.includes("Description")) headers.push("Description");
          row.push(department.description || "-");
        }

        if (visibleColumns.createdAt) {
          if (!headers.includes("Created Date")) headers.push("Created Date");
          row.push(formatDate(department.created_at));
        }

        if (visibleColumns.status) {
          if (!headers.includes("Status")) headers.push("Status");
          row.push(getStatusText(department.is_active));
        }

        return row;
      });

      autoTable(doc, {
        ...getProfessionalTableTheme(doc, "Departments List", company?.name || "", "l"),
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
      doc.save("departments.pdf");
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
      
      const exportData = filtered.map(department => {
        const row: Record<string, any> = {};

        if (visibleColumns.code) {
          row["Department Code"] = department.code || "-";
        }

        if (visibleColumns.name) {
          row["Department Name"] = department.name;
        }

        if (visibleColumns.head) {
          row["Department Head"] = department.head_name || "-";
        }

        if (visibleColumns.employeeCount) {
          row["Employees"] = department.employee_count || 0;
        }

        if (visibleColumns.description) {
          row["Description"] = department.description || "-";
        }

        if (visibleColumns.createdAt) {
          row["Created Date"] = formatDate(department.created_at);
        }

        if (visibleColumns.status) {
          row["Status"] = getStatusText(department.is_active);
        }

        return row;
      });

      const ws = XLSX.utils.json_to_sheet(exportData);
      const csv = XLSX.utils.sheet_to_csv(ws);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      saveAs(blob, "departments.csv");
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
      setDepartmentsToPrint(filtered);
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
          departments={departmentsToPrint}
          visibleColumns={visibleColumns}
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
              Departments
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Manage and organize your departments
            </p>
          </div>
          <button
            onClick={() => {
              router.push('/payroll/departments/new');
            }}
            className="px-4 py-2 transition bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Add Department
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="px-6 py-6 bg-gray-50 dark:bg-gray-900">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
          {/* Total Departments */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {departments.length.toLocaleString()}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Total Departments
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
                <Building className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </div>

          {/* Active Departments */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-green-600">
                  {departments.filter(d => d.is_active).length}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Active Departments
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
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
                placeholder="Search by name, code, or department head..."
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
                <div
                  className="absolute right-0 mt-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-3 z-10 min-w-[180px]"
                  onClick={(e) => e.stopPropagation()}
                >
                  {columnOptions.map(({ key, label }) => (
                    <label key={key} className="flex items-center gap-2 text-sm mb-2 last:mb-0 cursor-pointer text-gray-700 dark:text-gray-300">
                      <input
                        type="checkbox"
                        checked={visibleColumns[key]}
                        onChange={() => toggleColumn(key)}
                        className="rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span>{label}</span>
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
                {visibleColumns.code && (
                  <th className="text-left px-3 py-3">
                    Dept. Code
                  </th>
                )}
                {visibleColumns.name && (
                  <th className="text-left px-3 py-3">
                    Department Name
                  </th>
                )}
                {visibleColumns.head && (
                  <th className="text-left px-3 py-3">
                    Department Head
                  </th>
                )}
                {visibleColumns.employeeCount && (
                  <th className="text-left px-3 py-3">
                    Employees
                  </th>
                )}
                {visibleColumns.description && (
                  <th className="text-left px-3 py-3">
                    Description
                  </th>
                )}
                {visibleColumns.createdAt && (
                  <th className="text-left px-3 py-3">
                    Created Date
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
              ) : filteredDepartments.length === 0 ? (
                <tr>
                  <td colSpan={Object.values(visibleColumns).filter(Boolean).length + 1} className="px-6 py-8 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <Building className="w-12 h-12 text-gray-400 mb-2" />
                      <p className="text-lg font-medium text-gray-900 dark:text-white mb-1">
                        No departments found
                      </p>
                      <p className="text-gray-500 dark:text-gray-400 mb-4">
                        {statusFilter || search ?
                          "No departments found matching your filters. Try adjusting your search criteria." :
                          "Add your first department to start organizing your workforce."}
                      </p>
                      <button
                        onClick={() => {
                          router.push('/payroll/departments/new');
                        }}
                        className="text-indigo-600 hover:underline dark:text-indigo-400"
                      >
                        Add your first department
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                pagedDepartments.map((department, index) => {
                  return (
                    <tr
                      key={department.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <td className="px-3 py-4 align-top break-words text-gray-700 dark:text-gray-300 w-[60px]">
                        {(currentPage - 1) * pageSize + index + 1}
                      </td>
                      {visibleColumns.code && (
                        <td className="px-3 py-4 align-top break-words">
                          <div className="font-medium text-gray-900 dark:text-white">
                            {department.code || 'N/A'}
                          </div>
                        </td>
                      )}
                      {visibleColumns.name && (
                        <td className="px-3 py-4 align-top break-words">
                          <div className="min-w-0 max-w-[240px]">
                            <div className="font-medium text-gray-900 dark:text-white truncate">
                              {department.name}
                            </div>
                          </div>
                        </td>
                      )}
                      {visibleColumns.head && (
                        <td className="px-3 py-4 align-top break-words">
                          <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                            <User className="w-4 h-4 flex-shrink-0" />
                            <span>{department.head_name || '-'}</span>
                          </div>
                        </td>
                      )}
                      {visibleColumns.employeeCount && (
                        <td className="px-3 py-4 align-top break-words">
                          <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                            <Users className="w-4 h-4 flex-shrink-0" />
                            <span className="font-medium">{department.employee_count || 0}</span>
                          </div>
                        </td>
                      )}
                      {visibleColumns.description && (
                        <td className="px-3 py-4 align-top break-words">
                          <div className="max-w-[200px] truncate text-gray-600 dark:text-gray-400">
                            {department.description || '-'}
                          </div>
                        </td>
                      )}
                      {visibleColumns.createdAt && (
                        <td className="px-3 py-4 align-top break-words text-gray-700 dark:text-gray-300">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            {formatDate(department.created_at)}
                          </div>
                        </td>
                      )}
                      {visibleColumns.status && (
                        <td className="w-[96px] min-w-[96px] max-w-[96px] px-2 py-4 align-top">
                          <span
                            className={`inline-flex whitespace-nowrap px-2 py-0.5 rounded-full text-xs font-medium ${
                              getStatusBadgeClass(department.is_active)
                            }`}
                          >
                            {department.is_active ? (
                              <CheckCircle className="w-3 h-3 mr-1" />
                            ) : (
                              <XCircle className="w-3 h-3 mr-1" />
                            )}
                            {getStatusText(department.is_active)}
                          </span>
                        </td>
                      )}
                      {visibleColumns.actions && (
                        <td className="w-[52px] min-w-[52px] max-w-[52px] px-1 py-4 text-center align-top">
                          <div className="relative action-dropdown-container inline-flex justify-center w-full">
                            <button
                              onClick={() =>
                                setActiveActionMenu(
                                  activeActionMenu === department.id ? null : department.id
                                )
                              }
                              className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-50 dark:hover:text-gray-300 dark:hover:bg-gray-700/50 transition-all duration-200"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>

                            {activeActionMenu === department.id && (
                              <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg shadow-xl py-1 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                                <button
                                  onClick={() => {
                                    handleEdit(department);
                                    setActiveActionMenu(null);
                                  }}
                                  className="flex w-full items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                                >
                                  <Edit className="w-4 h-4 text-gray-400" />
                                  <span>Edit</span>
                                </button>

                                <div className="my-1 border-t border-gray-100 dark:border-gray-700"></div>
                                <button
                                  onClick={() => {
                                    if (confirm(`Are you sure you want to delete department ${department.name}?`)) {
                                      handleDelete(department.id, department.name);
                                      setActiveActionMenu(null);
                                    }
                                  }}
                                  className="flex w-full items-center gap-3 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  <span>Delete Department</span>
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

      {!loading && filteredDepartments.length > 0 && (
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, filteredDepartments.length)} of {filteredDepartments.length}
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

      {/* Edit Department Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 shadow-xl">
            <h3 className="mb-4 text-xl font-semibold text-gray-900 dark:text-white">
              Edit Department
            </h3>
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="mb-2.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Department Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent px-4 py-2.5 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
                  placeholder="Enter department name"
                />
              </div>
              <div className="mb-4">
                <label className="mb-2.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Department Code
                </label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent px-4 py-2.5 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
                  placeholder="Enter department code (e.g., HR, IT, FIN)"
                />
              </div>
              <div className="mb-4">
                <label className="mb-2.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Department Head
                </label>
                <input
                  type="text"
                  value={formData.head_name}
                  onChange={(e) => setFormData({ ...formData, head_name: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent px-4 py-2.5 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
                  placeholder="Enter department head name"
                />
              </div>
              <div className="mb-4">
                <label className="mb-2.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent px-4 py-2.5 text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
                  placeholder="Enter department description"
                />
              </div>
              <div className="mb-6">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Active Department</span>
                </label>
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingDepartment(null);
                    setFormData({ name: "", code: "", head_name: "", description: "", is_active: true });
                  }}
                  className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
                >
                  Update
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
