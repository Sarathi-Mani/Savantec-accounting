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
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
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
  User,
  Briefcase,
  CreditCard,
  MapPin,
  CheckSquare,
  Square,
} from "lucide-react";

interface Employee {
  id: string;
  employee_code: string;
  name: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  department_id?: string;
  designation_id?: string;
  status?: string;
}

interface AttendanceRecord {
  employee_id: string;
  status: string;
  date?: string;
}

interface Department {
  id: string;
  name: string;
}

interface Designation {
  id: string;
  name: string;
}

// Print component for attendance
const PrintView = ({
  employees,
  attendance,
  selectedDate,
  formatDate,
  getStatusText,
  getDesignationName,
  getDepartmentName,
  companyName,
  onComplete,
}: {
  employees: Employee[];
  attendance: Record<string, string>;
  selectedDate: string;
  formatDate: (dateString: string) => string;
  getStatusText: (status: string) => string;
  getDesignationName: (id?: string) => string;
  getDepartmentName: (id?: string) => string;
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
            Attendance Report
          </h1>
          <p style={{ fontSize: '14px', color: '#666' }}>{companyName}</p>
          <p style={{ color: '#666', fontSize: '14px' }}>
            Date: {formatDate(selectedDate)}
          </p>
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
                Employee Code
              </th>
              <th style={{
                padding: '12px',
                textAlign: 'left',
                borderRight: '1px solid #ddd',
                fontWeight: 'bold'
              }}>
                Employee Name
              </th>
              <th style={{
                padding: '12px',
                textAlign: 'left',
                borderRight: '1px solid #ddd',
                fontWeight: 'bold'
              }}>
                Department
              </th>
              <th style={{
                padding: '12px',
                textAlign: 'left',
                borderRight: '1px solid #ddd',
                fontWeight: 'bold'
              }}>
                Designation
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
            {employees.map((employee, index) => (
              <tr key={employee.id} style={{
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
                  {employee.employee_code || 'N/A'}
                </td>
                <td style={{
                  padding: '12px',
                  borderRight: '1px solid #ddd'
                }}>
                  {employee.name || `${employee.first_name} ${employee.last_name || ''}`}
                </td>
                <td style={{
                  padding: '12px',
                  borderRight: '1px solid #ddd'
                }}>
                  {getDepartmentName(employee.department_id)}
                </td>
                <td style={{
                  padding: '12px',
                  borderRight: '1px solid #ddd'
                }}>
                  {getDesignationName(employee.designation_id)}
                </td>
                <td style={{ padding: '12px' }}>
                  <span style={{
                    display: 'inline-block',
                    padding: '4px 8px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    backgroundColor: attendance[employee.id] === 'present' ? '#d1fae5' :
                      attendance[employee.id] === 'absent' ? '#fee2e2' :
                      attendance[employee.id] === 'half_day' ? '#fef3c7' :
                      attendance[employee.id] === 'leave' ? '#dbeafe' :
                      '#f3f4f6',
                    color: attendance[employee.id] === 'present' ? '#065f46' :
                      attendance[employee.id] === 'absent' ? '#991b1b' :
                      attendance[employee.id] === 'half_day' ? '#92400e' :
                      attendance[employee.id] === 'leave' ? '#1e40af' :
                      '#374151'
                  }}>
                    {getStatusText(attendance[employee.id] || 'Not Marked')}
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
            Total Employees: {employees.length}
          </div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            Present: {Object.values(attendance).filter(s => s === 'present').length} | 
            Absent: {Object.values(attendance).filter(s => s === 'absent').length} |
            Half Day: {Object.values(attendance).filter(s => s === 'half_day').length} |
            Leave: {Object.values(attendance).filter(s => s === 'leave').length}
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

export default function AttendancePage() {
  const router = useRouter();
  const { company } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [attendance, setAttendance] = useState<Record<string, string>>({});
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Filters state
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");

  // UI state
  const [showFilters, setShowFilters] = useState(false);
  const [showColumnDropdown, setShowColumnDropdown] = useState(false);
  const [activeActionMenu, setActiveActionMenu] = useState<string | null>(null);
  const [showPrintView, setShowPrintView] = useState(false);
  const [employeesToPrint, setEmployeesToPrint] = useState<Employee[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Export loading states
  const [copyLoading, setCopyLoading] = useState(false);
  const [excelLoading, setExcelLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [csvLoading, setCsvLoading] = useState(false);
  const [printLoading, setPrintLoading] = useState(false);

  const [cachedExportData, setCachedExportData] = useState<Employee[] | null>(null);

  // Column visibility
  const [visibleColumns, setVisibleColumns] = useState({
    employeeCode: true,
    name: true,
    department: true,
    designation: true,
    status: true,
    actions: true,
  });

  const companyId = company?.id || (typeof window !== "undefined" ? localStorage.getItem("company_id") : null);

  useEffect(() => {
    if (companyId) {
      fetchEmployees();
      fetchDropdownData();
    }
  }, [companyId]);

  useEffect(() => {
    if (companyId && employees.length > 0) {
      fetchAttendance();
    }
  }, [companyId, selectedDate, employees]);

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, departmentFilter, search]);

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

  const fetchDropdownData = async () => {
    try {
      if (!company?.id) return;
      const deptList = await api.get(`/companies/${company.id}/payroll/departments`);
      const desgList = await api.get(`/companies/${company.id}/payroll/designations`);
      setDepartments(deptList.data || []);
      setDesignations(desgList.data || []);
    } catch (err) {
      console.error("Failed to fetch dropdown data:", err);
    }
  };

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      if (!company?.id) {
        setLoading(false);
        return;
      }

      const response = await api.get(`/companies/${company?.id}/payroll/employees`);
      setEmployees(response.data || []);
      setError("");
    } catch (err) {
      setError("Failed to load employees");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendance = async () => {
    try {
      const response = await api.get(`/companies/${company?.id}/payroll/attendance?date=${selectedDate}`);
      const attendanceMap: Record<string, string> = {};
      response.data.forEach((a: AttendanceRecord) => {
        attendanceMap[a.employee_id] = a.status;
      });
      setAttendance(attendanceMap);
    } catch (error) {
      console.error("Error fetching attendance:", error);
    }
  };

  const fetchAllEmployeesForExport = useCallback(async (): Promise<Employee[]> => {
    try {
      if (!company?.id) return [];
      const response = await api.get(`/companies/${company?.id}/payroll/employees`);
      const allEmployees = response.data || [];
      setCachedExportData(allEmployees);
      return allEmployees;
    } catch (error) {
      console.error("Export fetch failed:", error);
      return [];
    }
  }, [company?.id]);

  const getExportData = async (): Promise<Employee[]> => {
    if (cachedExportData) return cachedExportData;
    return await fetchAllEmployeesForExport();
  };

  const markAttendance = (employeeId: string, status: string) => {
    setAttendance(prev => ({ ...prev, [employeeId]: status }));
  };

  const markBulkAttendance = (status: string) => {
    const newAttendance = { ...attendance };
    filteredEmployees.forEach(emp => {
      newAttendance[emp.id] = status;
    });
    setAttendance(newAttendance);
  };

  const saveAttendance = async () => {
    setSaving(true);
    try {
      const records = Object.entries(attendance).map(([employee_id, status]) => ({
        employee_id, status
      }));
      await api.post(`/companies/${company?.id}/payroll/attendance/bulk`, {
        date: selectedDate, records
      });
      alert("Attendance saved successfully!");
    } catch (error) {
      console.error("Error saving attendance:", error);
      alert("Error saving attendance");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setSearch("");
    setStatusFilter("");
    setDepartmentFilter("");
  };

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      'present': 'Present',
      'absent': 'Absent',
      'half_day': 'Half Day',
      'leave': 'Leave',
    };
    return statusMap[status] || 'Not Marked';
  };

  const getStatusBadgeClass = (status: string): string => {
    const statusColors: Record<string, string> = {
      present: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
      absent: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
      half_day: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
      leave: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    };
    return statusColors[status] || "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
  };

  const getDepartmentName = (id?: string): string => {
    if (!id) return '-';
    const dept = departments.find((d) => d.id === id);
    return dept?.name || '-';
  };

  const getDesignationName = (id?: string): string => {
    if (!id) return '-';
    const desg = designations.find((d) => d.id === id);
    return desg?.name || '-';
  };

  // Apply search filter locally
  const applySearchFilter = (data: Employee[]): Employee[] => {
    if (!search) return data;
    
    const searchLower = search.toLowerCase();
    return data.filter(employee => {
      return (
        employee.employee_code?.toLowerCase().includes(searchLower) ||
        employee.name?.toLowerCase().includes(searchLower) ||
        `${employee.first_name} ${employee.last_name || ''}`.toLowerCase().includes(searchLower) ||
        false
      );
    });
  };

  // Apply filters locally
  const applyFilters = (data: Employee[]): Employee[] => {
    let filtered = data;
    
    if (statusFilter) {
      filtered = filtered.filter(employee => attendance[employee.id] === statusFilter);
    }
    
    if (departmentFilter) {
      filtered = filtered.filter(employee => employee.department_id === departmentFilter);
    }
    
    return filtered;
  };

  const filteredEmployees = employees.filter(employee => {
    if (statusFilter && attendance[employee.id] !== statusFilter) return false;
    if (departmentFilter && employee.department_id !== departmentFilter) return false;
    
    if (search) {
      const searchLower = search.toLowerCase();
      return (
        employee.employee_code?.toLowerCase().includes(searchLower) ||
        employee.name?.toLowerCase().includes(searchLower) ||
        `${employee.first_name} ${employee.last_name || ''}`.toLowerCase().includes(searchLower) ||
        false
      );
    }
    
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filteredEmployees.length / pageSize));
  const pagedEmployees = filteredEmployees.slice(
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
      
      const headers: string[] = ["S.No"];
      const rows = filtered.map((employee, index) => {
        const row: string[] = [(index + 1).toString()];

        if (visibleColumns.employeeCode) {
          if (!headers.includes("Employee Code")) headers.push("Employee Code");
          row.push(employee.employee_code || "-");
        }

        if (visibleColumns.name) {
          if (!headers.includes("Employee Name")) headers.push("Employee Name");
          row.push(employee.name || `${employee.first_name} ${employee.last_name || ''}`);
        }

        if (visibleColumns.department) {
          if (!headers.includes("Department")) headers.push("Department");
          row.push(getDepartmentName(employee.department_id));
        }

        if (visibleColumns.designation) {
          if (!headers.includes("Designation")) headers.push("Designation");
          row.push(getDesignationName(employee.designation_id));
        }

        if (visibleColumns.status) {
          if (!headers.includes("Status")) headers.push("Status");
          row.push(getStatusText(attendance[employee.id] || ''));
        }

        return row;
      });

      const text = [headers.join("\t"), ...rows.map(r => r.join("\t"))].join("\n");
      await navigator.clipboard.writeText(text);
      alert("Attendance data copied to clipboard");
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
      
      const exportData = filtered.map((employee, index) => {
        const row: Record<string, any> = {
          "S.No": index + 1,
        };

        if (visibleColumns.employeeCode) {
          row["Employee Code"] = employee.employee_code || "-";
        }

        if (visibleColumns.name) {
          row["Employee Name"] = employee.name || `${employee.first_name} ${employee.last_name || ''}`;
        }

        if (visibleColumns.department) {
          row["Department"] = getDepartmentName(employee.department_id);
        }

        if (visibleColumns.designation) {
          row["Designation"] = getDesignationName(employee.designation_id);
        }

        if (visibleColumns.status) {
          row["Status"] = getStatusText(attendance[employee.id] || '');
        }

        return row;
      });

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Attendance");
      XLSX.writeFile(wb, `attendance_${selectedDate}.xlsx`);
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
      
      const headers: string[] = ["S.No"];
      const body = filtered.map((employee, index) => {
        const row: string[] = [(index + 1).toString()];

        if (visibleColumns.employeeCode) {
          if (!headers.includes("Emp. Code")) headers.push("Emp. Code");
          row.push(employee.employee_code || "N/A");
        }

        if (visibleColumns.name) {
          if (!headers.includes("Employee Name")) headers.push("Employee Name");
          row.push(employee.name || `${employee.first_name} ${employee.last_name || ''}`);
        }

        if (visibleColumns.department) {
          if (!headers.includes("Department")) headers.push("Department");
          row.push(getDepartmentName(employee.department_id));
        }

        if (visibleColumns.designation) {
          if (!headers.includes("Designation")) headers.push("Designation");
          row.push(getDesignationName(employee.designation_id));
        }

        if (visibleColumns.status) {
          if (!headers.includes("Status")) headers.push("Status");
          row.push(getStatusText(attendance[employee.id] || ''));
        }

        return row;
      });

      autoTable(doc, {
        ...getProfessionalTableTheme(doc, "Attendance Report", company?.name || "", "l"),
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
      doc.save(`attendance_${selectedDate}.pdf`);
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
      
      const exportData = filtered.map((employee, index) => {
        const row: Record<string, any> = {
          "S.No": index + 1,
        };

        if (visibleColumns.employeeCode) {
          row["Employee Code"] = employee.employee_code || "-";
        }

        if (visibleColumns.name) {
          row["Employee Name"] = employee.name || `${employee.first_name} ${employee.last_name || ''}`;
        }

        if (visibleColumns.department) {
          row["Department"] = getDepartmentName(employee.department_id);
        }

        if (visibleColumns.designation) {
          row["Designation"] = getDesignationName(employee.designation_id);
        }

        if (visibleColumns.status) {
          row["Status"] = getStatusText(attendance[employee.id] || '');
        }

        return row;
      });

      const ws = XLSX.utils.json_to_sheet(exportData);
      const csv = XLSX.utils.sheet_to_csv(ws);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      saveAs(blob, `attendance_${selectedDate}.csv`);
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
      setEmployeesToPrint(filtered);
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
          employees={employeesToPrint}
          attendance={attendance}
          selectedDate={selectedDate}
          formatDate={formatDate}
          getStatusText={getStatusText}
          getDesignationName={getDesignationName}
          getDepartmentName={getDepartmentName}
          companyName={company?.name || ''}
        />
      )}

      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Mark Attendance
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Track and manage employee attendance
            </p>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            <button
              onClick={saveAttendance}
              disabled={saving}
              className="px-4 py-2 transition bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
              ) : (
                <CheckSquare className="w-5 h-5" />
              )}
              {saving ? "Saving..." : "Save Attendance"}
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="px-6 py-6 bg-gray-50 dark:bg-gray-900">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
          {/* Total Employees */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {employees.length.toLocaleString()}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Total Employees
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
                <Users className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </div>

          {/* Present */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-green-600">
                  {Object.values(attendance).filter(s => s === 'present').length}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Present
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </div>

          {/* Absent */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-red-600">
                  {Object.values(attendance).filter(s => s === 'absent').length}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Absent
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                <XCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
            </div>
          </div>

          {/* Half Day */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-yellow-600">
                  {Object.values(attendance).filter(s => s === 'half_day').length}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Half Day
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-yellow-100 dark:bg-yellow-900/20 flex items-center justify-center">
                <Clock className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
              </div>
            </div>
          </div>

          {/* Leave */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-blue-600">
                  {Object.values(attendance).filter(s => s === 'leave').length}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  On Leave
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                <Calendar className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bulk Actions */}
      <div className="px-6 py-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Bulk Mark:</span>
          <button
            onClick={() => markBulkAttendance('present')}
            className="px-3 py-1.5 rounded-md bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-sm font-medium hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors"
          >
            All Present
          </button>
          <button
            onClick={() => markBulkAttendance('absent')}
            className="px-3 py-1.5 rounded-md bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-sm font-medium hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
          >
            All Absent
          </button>
          <button
            onClick={() => markBulkAttendance('half_day')}
            className="px-3 py-1.5 rounded-md bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 text-sm font-medium hover:bg-yellow-200 dark:hover:bg-yellow-900/50 transition-colors"
          >
            All Half Day
          </button>
          <button
            onClick={() => markBulkAttendance('leave')}
            className="px-3 py-1.5 rounded-md bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 text-sm font-medium hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
          >
            All Leave
          </button>
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
                placeholder="Search by name or code..."
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
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Attendance Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="">All Status</option>
                <option value="present">Present</option>
                <option value="absent">Absent</option>
                <option value="half_day">Half Day</option>
                <option value="leave">Leave</option>
              </select>
            </div>

            {/* Department Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Department
              </label>
              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="">All Departments</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
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
                {visibleColumns.employeeCode && (
                  <th className="text-left px-3 py-3 w-[120px]">
                    Employee Code
                  </th>
                )}
                {visibleColumns.name && (
                  <th className="text-left px-3 py-3 w-[200px]">
                    Employee Name
                  </th>
                )}
                {visibleColumns.department && (
                  <th className="text-left px-3 py-3 w-[150px]">
                    Department
                  </th>
                )}
                {visibleColumns.designation && (
                  <th className="text-left px-3 py-3 w-[150px]">
                    Designation
                  </th>
                )}
                {visibleColumns.status && (
                  <th className="text-left px-3 py-3 w-[300px]">
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
              ) : filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={Object.values(visibleColumns).filter(Boolean).length + 1} className="px-6 py-8 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <Users className="w-12 h-12 text-gray-400 mb-2" />
                      <p className="text-lg font-medium text-gray-900 dark:text-white mb-1">
                        No employees found
                      </p>
                      <p className="text-gray-500 dark:text-gray-400 mb-4">
                        {statusFilter || search || departmentFilter ?
                          "No employees found matching your filters. Try adjusting your search criteria." :
                          "Add employees to start marking attendance."}
                      </p>
                      <button
                        onClick={() => router.push('/payroll/employees/new')}
                        className="text-indigo-600 hover:underline dark:text-indigo-400"
                      >
                        Add your first employee
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                pagedEmployees.map((employee, index) => {
                  return (
                    <tr
                      key={employee.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <td className="px-3 py-4 align-top break-words text-gray-700 dark:text-gray-300 w-[60px]">
                        {(currentPage - 1) * pageSize + index + 1}
                      </td>
                      {visibleColumns.employeeCode && (
                        <td className="px-3 py-4 align-top break-words w-[120px]">
                          <div className="font-medium text-gray-900 dark:text-white">
                            {employee.employee_code}
                          </div>
                        </td>
                      )}
                      {visibleColumns.name && (
                        <td className="px-3 py-4 align-top break-words w-[200px]">
                          <div className="min-w-0 max-w-[200px]">
                            <div className="font-medium text-gray-900 dark:text-white truncate">
                              {employee.name || `${employee.first_name} ${employee.last_name || ''}`}
                            </div>
                          </div>
                        </td>
                      )}
                      {visibleColumns.department && (
                        <td className="px-3 py-4 align-top break-words text-gray-700 dark:text-gray-300 w-[150px]">
                          <div className="flex items-center gap-2">
                            <Building className="w-4 h-4 text-gray-400 flex-shrink-0" />
                            <span className="truncate">{getDepartmentName(employee.department_id)}</span>
                          </div>
                        </td>
                      )}
                      {visibleColumns.designation && (
                        <td className="px-3 py-4 align-top break-words w-[150px]">
                          <div className="flex items-center gap-2 font-medium text-gray-900 dark:text-white">
                            <Briefcase className="w-4 h-4 text-gray-400 flex-shrink-0" />
                            <span className="truncate">{getDesignationName(employee.designation_id)}</span>
                          </div>
                        </td>
                      )}
                      {visibleColumns.status && (
                        <td className="px-3 py-4 align-top break-words w-[300px]">
                          <div className="flex flex-wrap gap-2">
                            {["present", "absent", "half_day", "leave"].map((status) => (
                              <button
                                key={status}
                                onClick={() => markAttendance(employee.id, status)}
                                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1 ${
                                  attendance[employee.id] === status 
                                    ? getStatusBadgeClass(status)
                                    : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600"
                                }`}
                              >
                                {status === 'present' && <CheckCircle className="w-3 h-3" />}
                                {status === 'absent' && <XCircle className="w-3 h-3" />}
                                {status === 'half_day' && <Clock className="w-3 h-3" />}
                                {status === 'leave' && <Calendar className="w-3 h-3" />}
                                {status.replace("_", " ").toUpperCase()}
                              </button>
                            ))}
                          </div>
                        </td>
                      )}
                      {visibleColumns.actions && (
                        <td className="w-[52px] min-w-[52px] max-w-[52px] px-1 py-4 text-center align-top">
                          <div className="relative action-dropdown-container inline-flex justify-center w-full">
                            <button
                              onClick={() =>
                                setActiveActionMenu(
                                  activeActionMenu === employee.id ? null : employee.id
                                )
                              }
                              className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-50 dark:hover:text-gray-300 dark:hover:bg-gray-700/50 transition-all duration-200"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>

                            {activeActionMenu === employee.id && (
                              <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg shadow-xl py-1 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                                <Link
                                  href={`/payroll/employees/${employee.id}`}
                                  onClick={() => setActiveActionMenu(null)}
                                  className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                                >
                                  <Eye className="w-4 h-4 text-gray-400" />
                                  <span>View Details</span>
                                </Link>

                                <Link
                                  href={`/payroll/employees/edit/${employee.id}`}
                                  onClick={() => setActiveActionMenu(null)}
                                  className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                                >
                                  <Edit className="w-4 h-4 text-gray-400" />
                                  <span>Edit Employee</span>
                                </Link>
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
      {!loading && filteredEmployees.length > 0 && (
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, filteredEmployees.length)} of {filteredEmployees.length} employees
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
