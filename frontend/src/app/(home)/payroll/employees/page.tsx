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
  Download,
  FileText,
  RefreshCw,
  User,
  CreditCard,
  MapPin,
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
  const [error, setError] = useState("");
  
  // Filters state
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
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
    phone: true,
    email: true,
    department: true,
    designation: true,
    joiningDate: true,
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
    if (companyId) {
      fetchEmployees();
      setCachedExportData(null);
    }
  }, [statusFilter, departmentFilter, fromDate, toDate]);

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, departmentFilter, fromDate, toDate, search]);

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

  const fetchDropdownData = async () => {
    try {
      // Departments are already fetched in fetchEmployees
      // Add any additional dropdown data here if needed
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

      const employeesList = await payrollApi.listEmployees(company.id);
      const deptList = await payrollApi.listDepartments(company.id);
      const desgList = await payrollApi.listDesignations(company.id);

      setEmployees(employeesList || []);
      setDepartments(deptList || []);
      setDesignations(desgList || []);
      setError("");
    } catch (err) {
      setError("Failed to load employees");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllEmployeesForExport = useCallback(async (): Promise<Employee[]> => {
    try {
      if (!company?.id) return [];

      const employeesList = await payrollApi.listEmployees(company.id);
      const allEmployees = employeesList || [];
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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchEmployees();
  };

  const handleReset = () => {
    setSearch("");
    setFromDate("");
    setToDate("");
    setStatusFilter("");
    setDepartmentFilter("");
    fetchEmployees();
  };

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      'active': 'Active',
      'inactive': 'Inactive',
    };
    return statusMap[status] || status.charAt(0).toUpperCase() + status.slice(1);
  };

  const getStatusBadgeClass = (status: string): string => {
    const statusColors: Record<string, string> = {
      active: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
      inactive: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
      on_notice: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
      terminated: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
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

  // Apply search filter locally for export data
  const applySearchFilter = (data: Employee[]): Employee[] => {
    if (!search) return data;
    
    const searchLower = search.toLowerCase();
    return data.filter(employee => {
      return (
        employee.employee_code?.toLowerCase().includes(searchLower) ||
        employee.full_name?.toLowerCase().includes(searchLower) ||
        `${employee.first_name} ${employee.last_name || ''}`.toLowerCase().includes(searchLower) ||
        employee.email?.toLowerCase().includes(searchLower) ||
        employee.phone?.includes(search) ||
        false
      );
    });
  };

  // Apply filters locally
  const applyFilters = (data: Employee[]): Employee[] => {
    let filtered = data;
    
    if (statusFilter) {
      filtered = filtered.filter(employee => employee.status === statusFilter);
    }
    
    if (departmentFilter) {
      filtered = filtered.filter(employee => employee.department_id === departmentFilter);
    }
    
    // Date filters
    if (fromDate) {
      filtered = filtered.filter(employee => {
        if (!employee.date_of_joining) return false;
        const empDate = new Date(employee.date_of_joining);
        const from = new Date(fromDate);
        return empDate >= from;
      });
    }
    
    if (toDate) {
      filtered = filtered.filter(employee => {
        if (!employee.date_of_joining) return false;
        const empDate = new Date(employee.date_of_joining);
        const to = new Date(toDate);
        return empDate <= to;
      });
    }
    
    return filtered;
  };

  const filteredEmployees = employees.filter(employee => {
    if (statusFilter && employee.status !== statusFilter) return false;
    if (departmentFilter && employee.department_id !== departmentFilter) return false;
    
    if (fromDate && employee.date_of_joining) {
      const empDate = new Date(employee.date_of_joining);
      const from = new Date(fromDate);
      if (empDate < from) return false;
    }
    
    if (toDate && employee.date_of_joining) {
      const empDate = new Date(employee.date_of_joining);
      const to = new Date(toDate);
      if (empDate > to) return false;
    }
    
    if (search) {
      const searchLower = search.toLowerCase();
      return (
        employee.employee_code?.toLowerCase().includes(searchLower) ||
        employee.full_name?.toLowerCase().includes(searchLower) ||
        `${employee.first_name} ${employee.last_name || ''}`.toLowerCase().includes(searchLower) ||
        employee.email?.toLowerCase().includes(searchLower) ||
        employee.phone?.includes(search) ||
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
      
      const headers: string[] = [];
      const rows = filtered.map(employee => {
        const row: string[] = [];

        if (visibleColumns.employeeCode) {
          if (!headers.includes("Employee Code")) headers.push("Employee Code");
          row.push(employee.employee_code || "-");
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

      const text = [headers.join("\t"), ...rows.map(r => r.join("\t"))].join("\n");
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
      const allData = await getExportData();
      let filtered = applySearchFilter(allData);
      filtered = applyFilters(filtered);
      
      const exportData = filtered.map(employee => {
        const row: Record<string, any> = {};

        if (visibleColumns.employeeCode) {
          row["Employee Code"] = employee.employee_code || "-";
        }

        if (visibleColumns.name) {
          row["Employee Name"] = employee.full_name || `${employee.first_name} ${employee.last_name || ''}`;
          row["First Name"] = employee.first_name;
          row["Last Name"] = employee.last_name || "";
        }

        if (visibleColumns.phone) {
          row["Phone"] = employee.phone || "";
        }

        if (visibleColumns.email) {
          row["Email"] = employee.email || "";
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

        row["Company"] = company?.name || "";
        row["PAN"] = employee.pan || "";
        row["Aadhaar"] = employee.aadhaar || "";
        
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
      const allData = await getExportData();
      let filtered = applySearchFilter(allData);
      filtered = applyFilters(filtered);
      
      const doc = new jsPDF("landscape");
      
      const headers: string[] = [];
      const body = filtered.map(employee => {
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
          doc.text("Employees List", data.settings.margin.left, 12);
          
          doc.setFontSize(10);
          doc.text(company?.name || '', data.settings.margin.left, 18);
          
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
      const allData = await getExportData();
      let filtered = applySearchFilter(allData);
      filtered = applyFilters(filtered);
      
      const exportData = filtered.map(employee => {
        const row: Record<string, any> = {};

        if (visibleColumns.employeeCode) {
          row["Employee Code"] = employee.employee_code || "-";
        }

        if (visibleColumns.name) {
          row["Employee Name"] = employee.full_name || `${employee.first_name} ${employee.last_name || ''}`;
        }

        if (visibleColumns.phone) {
          row["Phone"] = employee.phone || "";
        }

        if (visibleColumns.email) {
          row["Email"] = employee.email || "";
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

  const handleDelete = async (employeeId: string, employeeName: string) => {
    if (window.confirm(`Are you sure you want to delete employee ${employeeName}? This action cannot be undone.`)) {
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
            className="px-4 py-2 transition bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Add Employee
          </button>
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

      {/* Filters Section */}
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
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
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
          <table className="w-full">
            <thead className="bg-gray-200 dark:bg-gray-700/50">
              <tr className="text-sm font-semibold text-gray-600 dark:text-gray-300">
                <th className="text-left px-6 py-3 whitespace-nowrap w-20">
                  S.No
                </th>
                {visibleColumns.employeeCode && (
                  <th className="text-left px-6 py-3 whitespace-nowrap w-32">
                    Employee Code
                  </th>
                )}
                {visibleColumns.name && (
                  <th className="text-left px-6 py-3 whitespace-nowrap w-64">
                    Employee Name
                  </th>
                )}
                {visibleColumns.phone && (
                  <th className="text-left px-6 py-3 whitespace-nowrap w-40">
                    Phone
                  </th>
                )}
                {visibleColumns.email && (
                  <th className="text-left px-6 py-3 whitespace-nowrap w-48">
                    Email
                  </th>
                )}
                {visibleColumns.department && (
                  <th className="text-left px-6 py-3 whitespace-nowrap w-48">
                    Department
                  </th>
                )}
                {visibleColumns.designation && (
                  <th className="text-left px-6 py-3 whitespace-nowrap w-48">
                    Designation
                  </th>
                )}
                {visibleColumns.joiningDate && (
                  <th className="text-left px-6 py-3 whitespace-nowrap w-40">
                    Joining Date
                  </th>
                )}
                {visibleColumns.status && (
                  <th className="text-left px-6 py-3 whitespace-nowrap w-40">
                    Status
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
              {loading ? (
                <tr>
                  <td colSpan={Object.values(visibleColumns).filter(Boolean).length} className="px-6 py-8 text-center">
                    <div className="flex items-center justify-center">
                      <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
                    </div>
                  </td>
                </tr>
              ) : filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={Object.values(visibleColumns).filter(Boolean).length} className="px-6 py-8 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <Users className="w-12 h-12 text-gray-400 mb-2" />
                      <p className="text-lg font-medium text-gray-900 dark:text-white mb-1">
                        No employees found
                      </p>
                      <p className="text-gray-500 dark:text-gray-400 mb-4">
                        {statusFilter || search || departmentFilter ?
                          "No employees found matching your filters. Try adjusting your search criteria." :
                          "Add your first employee to start managing your workforce."}
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
                    const profileInitials = `${employee.first_name.charAt(0)}${employee.last_name?.charAt(0) || ''}`;

                    return (
                      <tr
                        key={employee.id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-gray-700 dark:text-gray-300">
                          {(currentPage - 1) * pageSize + index + 1}
                        </td>
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
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="min-w-0 max-w-[240px]">
                              <div className="font-medium text-gray-900 dark:text-white truncate">
                                {employee.full_name || `${employee.first_name} ${employee.last_name || ''}`}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                {employee.first_name} {employee.last_name}
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
                            <div className="flex items-center gap-2">
                              <Building className="w-4 h-4 text-gray-400" />
                              {getDepartmentName(employee.department_id)}
                            </div>
                          </td>
                        )}
                        {visibleColumns.designation && (
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2 font-medium text-gray-900 dark:text-white">
                              <Briefcase className="w-4 h-4 text-gray-400" />
                              {getDesignationName(employee.designation_id)}
                            </div>
                          </td>
                        )}
                        {visibleColumns.joiningDate && (
                          <td className="px-6 py-4 whitespace-nowrap text-gray-700 dark:text-gray-300">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-gray-400" />
                              {formatDate(employee.date_of_joining)}
                            </div>
                          </td>
                        )}
                        {visibleColumns.status && (
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                getStatusBadgeClass(employee.status)
                              }`}
                            >
                              {employee.status === 'active' && <CheckCircle className="w-3 h-3 mr-1" />}
                              {employee.status === 'inactive' && <AlertCircle className="w-3 h-3 mr-1" />}
                              {employee.status === 'on_notice' && <Clock className="w-3 h-3 mr-1" />}
                              {employee.status === 'terminated' && <XCircle className="w-3 h-3 mr-1" />}
                              {getStatusText(employee.status)}
                            </span>
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
                                className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-50 dark:hover:text-gray-300 dark:hover:bg-gray-700/50 transition-all duration-200"
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
                                    <span>Edit</span>
                                  </Link>

                                  <div className="my-1 border-t border-gray-100 dark:border-gray-700"></div>
                                  <button
                                    onClick={() => {
                                      if (confirm(`Are you sure you want to delete employee ${employee.full_name || employee.first_name}?`)) {
                                        handleDelete(employee.id, employee.full_name || employee.first_name);
                                        setActiveActionMenu(null);
                                      }
                                    }}
                                    className="flex w-full items-center gap-3 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                    <span>Delete Employee</span>
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

      {!loading && filteredEmployees.length > 0 && (
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, filteredEmployees.length)} of {filteredEmployees.length}
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
