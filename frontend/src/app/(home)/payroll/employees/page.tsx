"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { payrollApi, Employee, Department, Designation } from "@/services/api";
import Link from "next/link";
import { useEffect, useState, useRef, useCallback } from "react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { saveAs } from "file-saver";
import {
  Search,
  Filter,
  Plus,
  Users,
  Mail,
  Phone,
  Briefcase,
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
} from "lucide-react";

// Print component for employees
const PrintView = ({
  employees,
  visibleColumns,
  formatDate,
  getStatusText,
  getDesignationName,
  getDepartmentName,
  companyName,
}: {
  employees: Employee[];
  visibleColumns: Record<string, boolean>;
  formatDate: (dateString: string | null | undefined) => string;
  getStatusText: (status: string) => string;
  getDesignationName: (id?: string) => string;
  getDepartmentName: (id?: string) => string;
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
            Employees List
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
              {visibleColumns.employeeCode && (
                <th style={{
                  padding: '12px',
                  textAlign: 'left',
                  borderRight: '1px solid #ddd',
                  fontWeight: 'bold'
                }}>
                  Employee Code
                </th>
              )}
              {visibleColumns.name && (
                <th style={{
                  padding: '12px',
                  textAlign: 'left',
                  borderRight: '1px solid #ddd',
                  fontWeight: 'bold'
                }}>
                  Employee Name
                </th>
              )}
              {visibleColumns.phone && (
                <th style={{
                  padding: '12px',
                  textAlign: 'left',
                  borderRight: '1px solid #ddd',
                  fontWeight: 'bold'
                }}>
                  Phone
                </th>
              )}
              {visibleColumns.email && (
                <th style={{
                  padding: '12px',
                  textAlign: 'left',
                  borderRight: '1px solid #ddd',
                  fontWeight: 'bold'
                }}>
                  Email
                </th>
              )}
              {visibleColumns.department && (
                <th style={{
                  padding: '12px',
                  textAlign: 'left',
                  borderRight: '1px solid #ddd',
                  fontWeight: 'bold'
                }}>
                  Department
                </th>
              )}
              {visibleColumns.designation && (
                <th style={{
                  padding: '12px',
                  textAlign: 'left',
                  borderRight: '1px solid #ddd',
                  fontWeight: 'bold'
                }}>
                  Designation
                </th>
              )}
              {visibleColumns.joiningDate && (
                <th style={{
                  padding: '12px',
                  textAlign: 'left',
                  borderRight: '1px solid #ddd',
                  fontWeight: 'bold'
                }}>
                  Joining Date
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
            {employees.map((employee, index) => (
              <tr key={employee.id} style={{
                borderBottom: '1px solid #ddd',
                backgroundColor: index % 2 === 0 ? '#fff' : '#f9f9f9'
              }}>
                {visibleColumns.employeeCode && (
                  <td style={{
                    padding: '12px',
                    borderRight: '1px solid #ddd'
                  }}>
                    {employee.employee_code || 'N/A'}
                  </td>
                )}
                {visibleColumns.name && (
                  <td style={{
                    padding: '12px',
                    borderRight: '1px solid #ddd'
                  }}>
                    {employee.full_name || `${employee.first_name} ${employee.last_name || ''}`}
                  </td>
                )}
                {visibleColumns.phone && (
                  <td style={{
                    padding: '12px',
                    borderRight: '1px solid #ddd'
                  }}>
                    {employee.phone || '-'}
                  </td>
                )}
                {visibleColumns.email && (
                  <td style={{
                    padding: '12px',
                    borderRight: '1px solid #ddd'
                  }}>
                    {employee.email || '-'}
                  </td>
                )}
                {visibleColumns.department && (
                  <td style={{
                    padding: '12px',
                    borderRight: '1px solid #ddd'
                  }}>
                    {getDepartmentName(employee.department_id)}
                  </td>
                )}
                {visibleColumns.designation && (
                  <td style={{
                    padding: '12px',
                    borderRight: '1px solid #ddd'
                  }}>
                    {getDesignationName(employee.designation_id)}
                  </td>
                )}
                {visibleColumns.joiningDate && (
                  <td style={{
                    padding: '12px',
                    borderRight: '1px solid #ddd'
                  }}>
                    {formatDate(employee.date_of_joining)}
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
                      backgroundColor: employee.status === 'active' ? '#d1fae5' :
                        employee.status === 'inactive' ? '#f3f4f6' :
                          employee.status === 'on_notice' ? '#fef3c7' :
                            employee.status === 'terminated' ? '#fee2e2' :
                              '#f3f4f6',
                      color: employee.status === 'active' ? '#065f46' :
                        employee.status === 'inactive' ? '#374151' :
                          employee.status === 'on_notice' ? '#92400e' :
                            employee.status === 'terminated' ? '#991b1b' :
                              '#374151'
                    }}>
                      {getStatusText(employee.status)}
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
            Total Employees: {employees.length}
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

export default function EmployeesPage() {
  const router = useRouter();
  const { company } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [departmentFilter, setDepartmentFilter] = useState<string>("");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [showFilters, setShowFilters] = useState(false);
  const [showColumnDropdown, setShowColumnDropdown] = useState(false);
  const [activeActionMenu, setActiveActionMenu] = useState<string | null>(null);
  const [showPrintView, setShowPrintView] = useState(false);
  const [employeesToPrint, setEmployeesToPrint] = useState<Employee[]>([]);

  // Separate loading states for each export button
  const [copyLoading, setCopyLoading] = useState(false);
  const [excelLoading, setExcelLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [csvLoading, setCsvLoading] = useState(false);
  const [printLoading, setPrintLoading] = useState(false);

  const [cachedExportData, setCachedExportData] = useState<Employee[] | null>(null);

  // Column visibility state
  const [visibleColumns, setVisibleColumns] = useState({
    employeeCode: true,
    name: true,
    phone: true,
    email: true,
    department: true,
    designation: true,
    joiningDate: true,
    status: true,
    actions: true,
  });

  const pageSize = 10;

  const fetchEmployees = async () => {
    if (!company?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const employeesList = await payrollApi.listEmployees(company.id);
      const deptList = await payrollApi.listDepartments(company.id);
      const desgList = await payrollApi.listDesignations(company.id);

      setEmployees(employeesList || []);
      setDepartments(deptList || []);
      setDesignations(desgList || []);
    } catch (error) {
      console.error("Failed to fetch employees:", error);
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  };

  // Memoized function to fetch all employees for export
  const fetchAllEmployees = useCallback(async (): Promise<Employee[]> => {
    if (!company?.id) return [];

    try {
      const employeesList = await payrollApi.listEmployees(company.id);
      const allEmployees = employeesList || [];
      setCachedExportData(allEmployees);
      return allEmployees;
    } catch (error) {
      console.error("Failed to fetch all employees:", error);
      return [];
    }
  }, [company?.id]);

  // Function to get export data (with cache check)
  const getExportData = async (): Promise<Employee[]> => {
    if (cachedExportData) {
      return cachedExportData;
    }
    return await fetchAllEmployees();
  };

  useEffect(() => {
    fetchEmployees();
    setCachedExportData(null);
  }, [company?.id, page]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.action-dropdown-container')) {
        setActiveActionMenu(null);
      }
      if (!target.closest('.column-dropdown-container')) {
        setShowColumnDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Apply filters
  const applyFilters = (employeesList: Employee[] = employees): Employee[] => {
    return employeesList.filter(emp => {
      const matchesSearch =
        emp.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        emp.employee_code.toLowerCase().includes(search.toLowerCase()) ||
        emp.email?.toLowerCase().includes(search.toLowerCase()) ||
        emp.phone?.includes(search);

      const matchesStatus = !statusFilter || emp.status === statusFilter;
      const matchesDepartment = !departmentFilter || emp.department_id === departmentFilter;

      // Date filters
      let matchesFromDate = true;
      let matchesToDate = true;

      if (fromDate && emp.date_of_joining) {
        const empDate = new Date(emp.date_of_joining);
        const from = new Date(fromDate);
        matchesFromDate = empDate >= from;
      }

      if (toDate && emp.date_of_joining) {
        const empDate = new Date(emp.date_of_joining);
        const to = new Date(toDate);
        matchesToDate = empDate <= to;
      }

      return matchesSearch && matchesStatus && matchesDepartment && matchesFromDate && matchesToDate;
    });
  };

  const filteredEmployees = applyFilters();
  const paginatedEmployees = filteredEmployees.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  // Export functions with individual loading states
  const copyToClipboard = async () => {
    if (copyLoading) return;

    setCopyLoading(true);
    try {
      const allEmployees = await getExportData();
      const filtered = applyFilters(allEmployees);

      const headers: string[] = [];
      const rowData = filtered.map(employee => {
        const row: string[] = [];

        if (visibleColumns.employeeCode) {
          if (!headers.includes("Employee Code")) headers.push("Employee Code");
          row.push(employee.employee_code);
        }

        if (visibleColumns.name) {
          if (!headers.includes("Employee Name")) headers.push("Employee Name");
          row.push(employee.full_name || `${employee.first_name} ${employee.last_name || ''}`);
        }

        if (visibleColumns.phone) {
          if (!headers.includes("Phone")) headers.push("Phone");
          row.push(employee.phone || '-');
        }

        if (visibleColumns.email) {
          if (!headers.includes("Email")) headers.push("Email");
          row.push(employee.email || '-');
        }

        if (visibleColumns.department) {
          if (!headers.includes("Department")) headers.push("Department");
          row.push(getDepartmentName(employee.department_id));
        }

        if (visibleColumns.designation) {
          if (!headers.includes("Designation")) headers.push("Designation");
          row.push(getDesignationName(employee.designation_id));
        }

        if (visibleColumns.joiningDate) {
          if (!headers.includes("Joining Date")) headers.push("Joining Date");
          row.push(formatDate(employee.date_of_joining));
        }

        if (visibleColumns.status) {
          if (!headers.includes("Status")) headers.push("Status");
          row.push(getStatusText(employee.status));
        }

        return row;
      });

      const text = [headers.join("\t"), ...rowData.map(r => r.join("\t"))].join("\n");
      await navigator.clipboard.writeText(text);
      alert("Employee data copied to clipboard");
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
      const allEmployees = await getExportData();
      const filtered = applyFilters(allEmployees);

      const exportData = filtered.map(employee => {
        const row: Record<string, any> = {};

        if (visibleColumns.employeeCode) {
          row["Employee Code"] = employee.employee_code;
        }

        if (visibleColumns.name) {
          row["Employee Name"] = employee.full_name || `${employee.first_name} ${employee.last_name || ''}`;
          row["First Name"] = employee.first_name;
          row["Last Name"] = employee.last_name;
        }

        if (visibleColumns.phone) {
          row["Phone"] = employee.phone || '';
        }

        if (visibleColumns.email) {
          row["Email"] = employee.email || '';
        }

        if (visibleColumns.department) {
          row["Department"] = getDepartmentName(employee.department_id);
        }

        if (visibleColumns.designation) {
          row["Designation"] = getDesignationName(employee.designation_id);
        }

        if (visibleColumns.joiningDate) {
          row["Joining Date"] = formatDate(employee.date_of_joining);
          row["Created Date"] = formatDate(employee.created_at);
        }

        if (visibleColumns.status) {
          row["Status"] = getStatusText(employee.status);
        }

        row["Company"] = company?.name || '';
        row["Address"] = employee.current_address || employee.permanent_address || '';
        row["PAN"] = employee.pan || '';
        row["Aadhaar"] = employee.aadhaar || '';

        return row;
      });

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Employees");
      XLSX.writeFile(wb, "employees.xlsx");
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
      const allEmployees = await getExportData();
      const filtered = applyFilters(allEmployees);

      const doc = new jsPDF("landscape");

      // Build headers & rows based on visible columns
      const headers: string[] = [];
      const body = filtered.map((employee) => {
        const row: string[] = [];

        if (visibleColumns.employeeCode) {
          if (!headers.includes("Emp. Code")) headers.push("Emp. Code");
          row.push(employee.employee_code || "N/A");
        }

        if (visibleColumns.name) {
          if (!headers.includes("Employee Name")) headers.push("Employee Name");
          row.push(employee.full_name || `${employee.first_name} ${employee.last_name || ''}`);
        }

        if (visibleColumns.phone) {
          if (!headers.includes("Phone")) headers.push("Phone");
          row.push(employee.phone || "-");
        }

        if (visibleColumns.email) {
          if (!headers.includes("Email")) headers.push("Email");
          row.push(employee.email || "-");
        }

        if (visibleColumns.department) {
          if (!headers.includes("Department")) headers.push("Department");
          row.push(getDepartmentName(employee.department_id));
        }

        if (visibleColumns.designation) {
          if (!headers.includes("Designation")) headers.push("Designation");
          row.push(getDesignationName(employee.designation_id));
        }

        if (visibleColumns.joiningDate) {
          if (!headers.includes("Joining Date")) headers.push("Joining Date");
          row.push(formatDate(employee.date_of_joining));
        }

        if (visibleColumns.status) {
          if (!headers.includes("Status")) headers.push("Status");
          row.push(getStatusText(employee.status));
        }

        return row;
      });

      autoTable(doc, {
        head: [headers],
        body,
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
          // Title
          doc.setFontSize(16);
          doc.text("Employees List", data.settings.margin.left, 12);

          // Company name
          doc.setFontSize(10);
          doc.text(company?.name || '', data.settings.margin.left, 18);

          // Date
          doc.text(
            `Generated: ${new Date().toLocaleDateString("en-IN")}`,
            doc.internal.pageSize.width - 60,
            12
          );

          // Page number
          const pageCount = doc.getNumberOfPages();
          doc.text(
            `Page ${data.pageNumber} of ${pageCount}`,
            data.settings.margin.left,
            doc.internal.pageSize.height - 8
          );
        },
      });

      doc.save("employees.pdf");
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
      const allEmployees = await getExportData();
      const filtered = applyFilters(allEmployees);

      const exportData = filtered.map(employee => {
        const row: Record<string, any> = {};

        if (visibleColumns.employeeCode) {
          row["Employee Code"] = employee.employee_code;
        }

        if (visibleColumns.name) {
          row["Employee Name"] = employee.full_name || `${employee.first_name} ${employee.last_name || ''}`;
        }

        if (visibleColumns.phone) {
          row["Phone"] = employee.phone || '';
        }

        if (visibleColumns.email) {
          row["Email"] = employee.email || '';
        }

        if (visibleColumns.department) {
          row["Department"] = getDepartmentName(employee.department_id);
        }

        if (visibleColumns.designation) {
          row["Designation"] = getDesignationName(employee.designation_id);
        }

        if (visibleColumns.joiningDate) {
          row["Joining Date"] = formatDate(employee.date_of_joining);
        }

        if (visibleColumns.status) {
          row["Status"] = getStatusText(employee.status);
        }

        return row;
      });

      const ws = XLSX.utils.json_to_sheet(exportData);
      const csv = XLSX.utils.sheet_to_csv(ws);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      saveAs(blob, "employees.csv");
    } catch (error) {
      console.error("CSV export failed:", error);
      alert("Failed to export CSV. Please try again.");
    } finally {
      setCsvLoading(false);
    }
  };

  // Handle print
  const handlePrint = async () => {
    if (printLoading) return;

    setPrintLoading(true);
    try {
      const allEmployees = await getExportData();
      const filtered = applyFilters(allEmployees);
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'inactive': return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400';
      case 'on_notice': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'terminated': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      'active': 'Active',
      'inactive': 'Inactive',
    };
    return statusMap[status] || status.charAt(0).toUpperCase() + status.slice(1);
  };

  const getStatusBadge = (status: string) => {
    const text = getStatusText(status);
    const colorClass = getStatusColor(status);

    let icon = null;
    switch (status) {
      case 'active':
        icon = <CheckCircle className="w-3 h-3 mr-1" />;
        break;
      case 'terminated':
        icon = <XCircle className="w-3 h-3 mr-1" />;
        break;
      case 'on_notice':
        icon = <Clock className="w-3 h-3 mr-1" />;
        break;
      case 'inactive':
        icon = <AlertCircle className="w-3 h-3 mr-1" />;
        break;
    }

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClass}`}>
        {icon}
        {text}
      </span>
    );
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

  const handleDelete = async (employeeId: string) => {
    if (window.confirm("Are you sure you want to delete this employee?")) {
      try {
        if (company?.id) {
          await payrollApi.deactivateEmployee(company.id, employeeId);
          fetchEmployees();
        }
      } catch (error) {
        console.error("Error deleting employee:", error);
        alert("Failed to delete employee");
      }
    }
  };

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("");
    setDepartmentFilter("");
    setFromDate("");
    setToDate("");
    setPage(1);
  };

  const handleSearch = () => {
    setPage(1);
  };

  const getTotalPages = () => {
    return Math.ceil(filteredEmployees.length / pageSize);
  };

  // Unique departments for filter
  const uniqueDepartments = departments.map(dept => ({
    id: dept.id,
    name: dept.name
  }));

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {showPrintView && (
        <PrintView
          employees={employeesToPrint}
          visibleColumns={visibleColumns}
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
              Employees
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Manage and track all your employees
            </p>
          </div>
          <button
            onClick={() => router.push('/payroll/employees/new')}
            className="px-4 py-2 transition bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Add Employee
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="px-6 py-6">
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

          {/* Active Employees */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-green-600">
                  {employees.filter(e => e.status === 'active').length}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Active Employees
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </div>

          {/* Departments */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {departments.length}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Departments
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                <Building className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>

          {/* Designations */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {designations.length}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Designations
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center">
                <Briefcase className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters - Updated with proper export buttons */}
      <div className="px-6 py-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by name, code, email, or phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
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
                  {Object.entries(visibleColumns).map(([key, value]) => (
                    <label key={key} className="flex items-center gap-2 text-sm mb-2 last:mb-0 cursor-pointer text-gray-700 dark:text-gray-300">
                      <input
                        type="checkbox"
                        checked={value}
                        onChange={() => toggleColumn(key as keyof typeof visibleColumns)}
                        className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
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
                "Excel"
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
                "PDF"
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
                "CSV"
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
                <Printer className="w-5 h-5" />
              )}
              Print
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex flex-wrap gap-4">
            {/* Status Dropdown */}
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>

            </select>

            {/* Department Dropdown */}
            <select
              value={departmentFilter}
              onChange={(e) => {
                setDepartmentFilter(e.target.value);
                setPage(1);
              }}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Departments</option>
              {uniqueDepartments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>

            {/* From Date */}
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="date"
                value={fromDate}
                onChange={(e) => {
                  setFromDate(e.target.value);
                  setPage(1);
                }}
                className="pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="From Date"
              />
            </div>

            {/* To Date */}
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="date"
                value={toDate}
                onChange={(e) => {
                  setToDate(e.target.value);
                  setPage(1);
                }}
                className="pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="To Date"
              />
            </div>

            <button
              onClick={clearFilters}
              className="text-sm text-blue-600 hover:underline dark:text-blue-400"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      <div>
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full table-fixed">
            <div className="overflow-x-auto">

              <thead className="bg-gray-200 dark:bg-gray-700/50">
                <tr className="text-sm font-semibold text-gray-600 dark:text-gray-300">
                  {visibleColumns.employeeCode && (
                    <th className="text-left px-6 py-3 whitespace-nowrap">
                      Employee Code
                    </th>
                  )}
                  {visibleColumns.name && (
                    <th className="text-left px-6 py-3 whitespace-nowrap min-w-[200px]">
                      Employee Name
                    </th>
                  )}
                  {visibleColumns.phone && (
                    <th className="text-left px-6 py-3 whitespace-nowrap">
                      Phone
                    </th>
                  )}
                  {visibleColumns.email && (
                    <th className="text-left px-6 py-3 whitespace-nowrap">
                      Email
                    </th>
                  )}
                  {visibleColumns.department && (
                    <th className="text-left px-6 py-3 whitespace-nowrap">
                      Department
                    </th>
                  )}
                  {visibleColumns.designation && (
                    <th className="text-left px-6 py-3 whitespace-nowrap">
                      Designation
                    </th>
                  )}
                  {visibleColumns.joiningDate && (
                    <th className="text-left px-6 py-3 whitespace-nowrap">
                      Joining Date
                    </th>
                  )}
                  {visibleColumns.status && (
                    <th className="text-left px-6 py-3 whitespace-nowrap">
                      Status
                    </th>
                  )}
                  {visibleColumns.actions && (
                    <th className="text-right px-6 py-3 whitespace-nowrap">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700 text-sm text-gray-700 dark:text-gray-300">
                {loading ? (
                  <tr>
                    <td colSpan={Object.values(visibleColumns).filter(Boolean).length} className="px-6 py-8 text-center">
                      <div className="flex items-center justify-center">
                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
                      </div>
                    </td>
                  </tr>
                ) : !company ? (
                  <tr>
                    <td colSpan={Object.values(visibleColumns).filter(Boolean).length} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                      No company selected
                    </td>
                  </tr>
                ) : paginatedEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={Object.values(visibleColumns).filter(Boolean).length} className="px-6 py-8 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <Users className="w-12 h-12 text-gray-400 mb-2" />
                        <p className="text-lg font-medium text-gray-900 dark:text-white mb-1">
                          No employees found
                        </p>
                        <p className="text-gray-500 dark:text-gray-400 mb-4">
                          Try adjusting your filters or add a new employee
                        </p>
                        <button
                          onClick={() => router.push('/payroll/employees/new')}
                          className="text-blue-600 hover:underline dark:text-blue-400"
                        >
                          Add your first employee
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedEmployees.map((employee) => {
                    const profileInitials = `${employee.first_name.charAt(0)}${employee.last_name?.charAt(0) || ''}`;

                    return (
                      <tr
                        key={employee.id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                      >
                        {visibleColumns.employeeCode && (
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center flex-shrink-0">
                                <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                                  {profileInitials}
                                </span>
                              </div>
                              <div className="font-medium text-gray-900 dark:text-white">
                                {employee.employee_code}
                              </div>
                            </div>
                          </td>
                        )}
                        {visibleColumns.name && (
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="min-w-0">
                                <div className="font-medium text-gray-900 dark:text-white truncate">
                                  {employee.full_name || `${employee.first_name} ${employee.last_name || ''}`}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                  {employee.first_name} {employee.last_name}
                                </div>
                              </div>
                            </div>
                          </td>
                        )}
                        {visibleColumns.phone && (
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                              <Phone className="w-4 h-4 flex-shrink-0" />
                              <span>{employee.phone || '-'}</span>
                            </div>
                          </td>
                        )}
                        {visibleColumns.email && (
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                              <Mail className="w-4 h-4 flex-shrink-0" />
                              <span className="truncate max-w-[180px]">{employee.email || '-'}</span>
                            </div>
                          </td>
                        )}
                        {visibleColumns.department && (
                          <td className="px-6 py-4 whitespace-nowrap text-gray-700 dark:text-gray-300">
                            {getDepartmentName(employee.department_id)}
                          </td>
                        )}
                        {visibleColumns.designation && (
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="font-medium text-gray-900 dark:text-white">
                              {getDesignationName(employee.designation_id)}
                            </div>
                          </td>
                        )}
                        {visibleColumns.joiningDate && (
                          <td className="px-6 py-4 whitespace-nowrap text-gray-700 dark:text-gray-300">
                            {formatDate(employee.date_of_joining)}
                          </td>
                        )}
                        {visibleColumns.status && (
                          <td className="px-6 py-4 whitespace-nowrap">
                            {getStatusBadge(employee.status)}
                          </td>
                        )}
                        {visibleColumns.actions && (
                          <td className="px-6 py-4 text-right whitespace-nowrap">
                            <div className="relative action-dropdown-container inline-block">
                              <button
                                onClick={() =>
                                  setActiveActionMenu(
                                    activeActionMenu === employee.id ? null : employee.id
                                  )
                                }
                                className="p-2 rounded-lg text-gray-500 hover:text-gray-700
                            dark:text-gray-400 dark:hover:text-white
                            hover:bg-gray-100 dark:hover:bg-gray-700"
                              >
                                <MoreVertical className="w-5 h-5" />
                              </button>

                              {activeActionMenu === employee.id && (
                                <div
                                  className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800
                              border border-gray-200 dark:border-gray-700
                              rounded-lg shadow-lg z-20"
                                >
                                  <Link
                                    href={`/payroll/employees/${employee.id}`}
                                    onClick={() => setActiveActionMenu(null)}
                                    className="flex items-center gap-2 px-4 py-2 text-sm
                                text-gray-700 dark:text-gray-300
                                hover:bg-gray-100 dark:hover:bg-gray-700"
                                  >
                                    <Eye className="w-4 h-4" />
                                    View Details
                                  </Link>

                                  <Link
                                    href={`/payroll/employees/edit/${employee.id}`}
                                    onClick={() => setActiveActionMenu(null)}
                                    className="flex items-center gap-2 px-4 py-2 text-sm
                                text-gray-700 dark:text-gray-300
                                hover:bg-gray-100 dark:hover:bg-gray-700"
                                  >
                                    <Edit className="w-4 h-4" />
                                    Edit
                                  </Link>

                                  <button
                                    onClick={() => {
                                      setActiveActionMenu(null);
                                      handleDelete(employee.id);
                                    }}
                                    className="flex w-full items-center gap-2 px-4 py-2 text-sm
                                text-red-600 dark:text-red-400
                                hover:bg-red-50 dark:hover:bg-red-900/30"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                    Delete
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
              {paginatedEmployees.length > 0 && (
                <tfoot>
                  <tr className="bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700">
                    <td
                      colSpan={
                        Object.values(visibleColumns).filter(Boolean).length -
                        (visibleColumns.actions ? 1 : 0)
                      }
                      className="px-6 py-4 text-right font-semibold text-gray-900 dark:text-white whitespace-nowrap"
                    >
                      Total Employees:
                    </td>
                    <td className="px-6 py-4 font-bold text-gray-900 dark:text-white whitespace-nowrap">
                      {filteredEmployees.length}
                    </td>
                    {visibleColumns.actions && (
                      <td></td>
                    )}
                  </tr>
                </tfoot>
              )}
            </div>
          </table>
        </div>

        {/* Pagination */}
        {filteredEmployees.length > pageSize && (
          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Showing {(page - 1) * pageSize + 1} to{" "}
              {Math.min(page * pageSize, filteredEmployees.length)} of {filteredEmployees.length} results
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>

              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page * pageSize >= filteredEmployees.length}
                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
