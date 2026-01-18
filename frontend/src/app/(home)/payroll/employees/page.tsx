"use client";
import { useAuth } from "@/context/AuthContext";

import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { saveAs } from "file-saver";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Users,
  Plus,
  Search,
  Filter,
  MoreVertical,
  Edit,
  Eye,
  Trash2,
  Download,
  Mail,
  Phone,
} from "lucide-react";
import { payrollApi, Employee, Department, Designation } from "@/services/api";

export default function EmployeesPage() {
  const router = useRouter();
  const { company } = useAuth();
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [departmentFilter, setDepartmentFilter] = useState<string>("");
  const [showFilters, setShowFilters] = useState(false);

  const [showColumnDropdown, setShowColumnDropdown] = useState(false);
  const [activeActionMenu, setActiveActionMenu] = useState<string | null>(null);

  // Copy to clipboard function with all columns
  const copyToClipboard = async () => {
    const headers = ["Company", "Username", "Mobile", "Email", "Role", "Created On", "Status"];

    const rows = filteredEmployees.map(emp => [
      company?.name || "",
      emp.full_name || `${emp.first_name} ${emp.last_name || ""}`,
      emp.phone || "",
      emp.email || "",
      getDesignationName(emp.designation_id),
      emp.created_at ? formatDate(emp.created_at) : "-",
      emp.status
    ]);

    const text = [headers.join("\t"), ...rows.map(r => r.join("\t"))].join("\n");

    await navigator.clipboard.writeText(text);
    alert("Employee data copied to clipboard");
  };

  // Export functions
  const exportExcel = () => {
    const exportData = filteredEmployees.map(emp => ({
      Company: company?.name || "",
      Username: emp.full_name || `${emp.first_name} ${emp.last_name || ""}`,
      Mobile: emp.phone || "",
      Email: emp.email || "",
      Role: getDesignationName(emp.designation_id),
      "Created On": emp.created_at ? formatDate(emp.created_at) : "-",
      Status: emp.status,
      "Employee Code": emp.employee_code,
      Department: getDepartmentName(emp.department_id),
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Employees");
    XLSX.writeFile(wb, "employees.xlsx");
  };

  const exportPDF = () => {
    const doc = new jsPDF();

    autoTable(doc, {
      head: [["Company", "Username", "Mobile", "Email", "Role", "Created On", "Status"]],
      body: filteredEmployees.map(emp => [
        company?.name || "",
        emp.full_name || `${emp.first_name} ${emp.last_name || ""}`,
        emp.phone || "-",
        emp.email || "-",
        getDesignationName(emp.designation_id),
        emp.created_at ? formatDate(emp.created_at) : "-",
        emp.status
      ])
    });

    doc.save("employees.pdf");
  };

  const exportCSV = () => {
    const exportData = filteredEmployees.map(emp => ({
      Company: company?.name || "",
      Username: emp.full_name || `${emp.first_name} ${emp.last_name || ""}`,
      Mobile: emp.phone || "",
      Email: emp.email || "",
      Role: getDesignationName(emp.designation_id),
      "Created On": emp.created_at ? formatDate(emp.created_at) : "-",
      Status: emp.status,
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    saveAs(blob, "employees.csv");
  };

  const printTable = () => window.print();

  // Column visibility state
  const [visibleColumns, setVisibleColumns] = useState({
    company: true,
    username: true,
    mobile: true,
    email: true,
    role: true,
    createdOn: true,
    status: true,
    actions: true,
  });

  const toggleColumn = (key: keyof typeof visibleColumns) => {
    setVisibleColumns(prev => ({ ...prev, [key]: !prev[key] }));
  };

  useEffect(() => {
    const storedCompanyId = localStorage.getItem("company_id");
    if (!storedCompanyId) {
      router.push("/company");
      return;
    }
    setCompanyId(storedCompanyId);
    loadData(storedCompanyId);
  }, [router]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;

      // Close columns dropdown
      if (!target.closest('.column-dropdown-container')) {
        setShowColumnDropdown(false);
      }

      // Close actions dropdown
      if (!target.closest('.action-dropdown-container')) {
        setActiveActionMenu(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const loadData = async (companyId: string) => {
    try {
      setLoading(true);
      const [employeesList, deptList, desgList] = await Promise.all([
        payrollApi.listEmployees(companyId),
        payrollApi.listDepartments(companyId),
        payrollApi.listDesignations(companyId),
      ]);
      setEmployees(employeesList);
      setDepartments(deptList);
      setDesignations(desgList);
    } catch (error) {
      console.error("Error loading employees:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "inactive":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";
      case "on_notice":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
      case "terminated":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";
    }
  };

  const getDepartmentName = (id?: string) => {
    if (!id) return "-";
    const dept = departments.find((d) => d.id === id);
    return dept?.name || "-";
  };

  const getDesignationName = (id?: string) => {
    if (!id) return "-";
    const desg = designations.find((d) => d.id === id);
    return desg?.name || "-";
  };

  const formatDate = (value?: string) => {
    if (!value) return "-";
    const date = new Date(value.includes("T") ? value : value + "T00:00:00");
    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatCurrency = (amount?: number) => {
    if (!amount) return "-";
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch =
      emp.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.employee_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.phone?.includes(searchTerm);

    const matchesStatus = !statusFilter || emp.status === statusFilter;
    const matchesDepartment = !departmentFilter || emp.department_id === departmentFilter;

    return matchesSearch && matchesStatus && matchesDepartment;
  });

  const handleDelete = async (employeeId: string) => {
    if (window.confirm("Are you sure you want to delete this employee?")) {
      try {
        if (companyId) {
          await payrollApi.deleteEmployee(companyId, employeeId);
          // Refresh the list
          loadData(companyId);
        }
      } catch (error) {
        console.error("Error deleting employee:", error);
        alert("Failed to delete employee");
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Employees</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage your workforce ({employees.length} total)
          </p>
        </div>
        <Link
          href="/payroll/employees/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add Employee
        </Link>
      </div>

      {/* Search and Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by name, mobile, email, or code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
          >
            <Filter className="w-5 h-5" />
            Filters
          </button>
        </div>

        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex flex-wrap gap-4">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="on_notice">On Notice</option>
              <option value="terminated">Terminated</option>
            </select>

            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
            >
              <option value="">All Departments</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>

            <button
              onClick={() => {
                setStatusFilter("");
                setDepartmentFilter("");
              }}
              className="text-sm text-primary hover:underline"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>

      {/* Employees Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">

        {/* Table Header Actions */}
        <div className="flex items-center justify-end gap-2 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={copyToClipboard}
            className="px-3 py-2 text-sm bg-primary text-white rounded-lg"
          >
            Copy
          </button>

          <div className="relative column-dropdown-container">
            <button
              onClick={() => setShowColumnDropdown(!showColumnDropdown)}
              className="px-3 py-2 text-sm bg-primary text-white rounded-lg"
            >
              Columns
            </button>

            {showColumnDropdown && (
              <div className="absolute right-0 mt-2 bg-white dark:bg-gray-800 rounded-lg shadow-md p-3 z-10 min-w-[150px]">
                {Object.entries(visibleColumns).map(([key, value]) => (
                  <label key={key} className="flex items-center gap-2 text-sm mb-1 last:mb-0 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={value}
                      onChange={() => toggleColumn(key as keyof typeof visibleColumns)}
                      className="rounded"
                    />
                    <span className="capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <button onClick={exportExcel} className="px-3 py-2 text-sm bg-primary text-white rounded-lg">Excel</button>
          <button onClick={exportCSV} className="px-3 py-2 text-sm bg-primary text-white rounded-lg">CSV</button>
          <button onClick={exportPDF} className="px-3 py-2 text-sm bg-primary text-white rounded-lg">PDF</button>
          <button onClick={printTable} className="px-3 py-2 text-sm bg-primary text-white rounded-lg">Print</button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900/50">
              <tr>
                {visibleColumns.company && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Company
                  </th>
                )}
                {visibleColumns.username && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Username
                  </th>
                )}
                {visibleColumns.mobile && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Mobile
                  </th>
                )}
                {visibleColumns.email && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Email
                  </th>
                )}
                {visibleColumns.role && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Role
                  </th>
                )}
                {visibleColumns.createdOn && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Created On
                  </th>
                )}
                {visibleColumns.status && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                )}
                {visibleColumns.actions && (
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={Object.values(visibleColumns).filter(v => v).length} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                    {employees.length === 0 ? (
                      <div className="flex flex-col items-center">
                        <Users className="w-12 h-12 text-gray-400 mb-2" />
                        <p className="text-lg font-medium">No employees yet</p>
                        <p className="text-sm">Add your first employee to get started</p>
                        <Link
                          href="/payroll/employees/new"
                          className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                        >
                          <Plus className="w-5 h-5" />
                          Add Employee
                        </Link>
                      </div>
                    ) : (
                      "No employees match your search criteria"
                    )}
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((employee) => (
                  <tr
                    key={employee.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                  >
                    {visibleColumns.company && (
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-sm font-semibold text-primary">
                              {employee.first_name.charAt(0)}
                              {employee.last_name?.charAt(0) || ""}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {company?.name || ""}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {employee.employee_code}
                            </p>
                          </div>
                        </div>
                      </td>
                    )}
                    {visibleColumns.username && (
                      <td className="px-6 py-4">
                        <p className="font-medium text-gray-900 dark:text-white">
                          {employee.full_name || `${employee.first_name} ${employee.last_name || ""}`}
                        </p>
                      </td>
                    )}
                    {visibleColumns.mobile && (
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                          <Phone className="w-4 h-4" />
                          <span>{employee.phone || "-"}</span>
                        </div>
                      </td>
                    )}
                    {visibleColumns.email && (
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                          <Mail className="w-4 h-4" />
                          <span className="truncate max-w-[150px]">{employee.email || "-"}</span>
                        </div>
                      </td>
                    )}
                    {visibleColumns.role && (
                      <td className="px-6 py-4">
                        <p className="text-gray-900 dark:text-white">
                          {getDesignationName(employee.designation_id)}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {getDepartmentName(employee.department_id)}
                        </p>
                      </td>
                    )}
                    {visibleColumns.createdOn && (
                      <td className="px-6 py-4">
                        <span className="text-gray-900 dark:text-white">
                          {employee.created_at ? formatDate(employee.created_at) : "-"}

                        </span>
                      </td>
                    )}
                    {visibleColumns.status && (
                      <td className="px-6 py-4">
                        <span
                          className={`px-2 py-1 text-xs rounded-full font-medium ${getStatusColor(employee.status)}`}
                        >
                          {employee.status}
                        </span>
                      </td>
                    )}
                    {visibleColumns.actions && (
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="relative action-dropdown-container">
                            <button
                              onClick={() => setActiveActionMenu(activeActionMenu === employee.id ? null : employee.id)}
                              className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>

                            {activeActionMenu === employee.id && (
                              <div className="absolute right-0 mt-2 bg-white dark:bg-gray-800 border rounded-lg shadow-md p-2 z-10 min-w-[120px]">
                                <Link
                                  href={`/payroll/employees/${employee.id}`}
                                  className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded w-full"
                                  onClick={() => setActiveActionMenu(null)}
                                >
                                  <Eye className="w-4 h-4" />
                                  View
                                </Link>
                                <Link
                                  href={`/payroll/employees/edit/${employee.id}`}
                                  className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded w-full"
                                  onClick={() => setActiveActionMenu(null)}
                                >
                                  <Edit className="w-4 h-4" />
                                  Edit
                                </Link>
                                <button
                                  onClick={() => {
                                    setActiveActionMenu(null);
                                    handleDelete(employee.id);
                                  }}
                                  className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-red-50 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 rounded w-full"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  Delete
                                </button>
                              </div>
                            )}
                          </div>
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
    </div>
  );
}