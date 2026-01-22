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
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [departmentFilter, setDepartmentFilter] = useState<string>("");
  const [showFilters, setShowFilters] = useState(false);

  // Pagination state
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 5;

  const [showColumnDropdown, setShowColumnDropdown] = useState(false);
  const [activeActionMenu, setActiveActionMenu] = useState<string | null>(null);

  // Copy to clipboard function with all columns
  const copyToClipboard = async () => {
    const filtered = applyFilters();
    const headers = ["Company", "Username", "Mobile", "Email", "Role", "Created On", "Status"];

    const rows = filtered.map(emp => [
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
    const filtered = applyFilters();
    const exportData = filtered.map(emp => ({
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
    const filtered = applyFilters();
    const doc = new jsPDF();

    autoTable(doc, {
      head: [["Company", "Username", "Mobile", "Email", "Role", "Created On", "Status"]],
      body: filtered.map(emp => [
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
    const filtered = applyFilters();
    const exportData = filtered.map(emp => ({
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
  }, [router, page]);

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
    if (!companyId) return;
    try {
      setLoading(true);
      // You'll need to update your API to support pagination
      const [employeesList, deptList, desgList] = await Promise.all([
        payrollApi.listEmployees(companyId),
        payrollApi.listDepartments(companyId),
        payrollApi.listDesignations(companyId),
      ]);
      setEmployees(employeesList);
      setDepartments(deptList);
      setDesignations(desgList);
      setTotal(employeesList.length); // Set total count for pagination
      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to fetch employees");
      console.error("Error loading employees:", err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-primary/10 text-primary dark:bg-green-900/30 dark:text-green-400";
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

  const applyFilters = () => {
    return employees.filter((emp) => {
      const matchesSearch =
        emp.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.employee_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.phone?.includes(searchTerm);

      const matchesStatus = !statusFilter || emp.status === statusFilter;
      const matchesDepartment = !departmentFilter || emp.department_id === departmentFilter;

      return matchesSearch && matchesStatus && matchesDepartment;
    });
  };

  const filteredEmployees = applyFilters();
  const paginatedEmployees = filteredEmployees.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

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

  if (!companyId) {
    return (
      <div className="p-6 text-center text-gray-500 dark:text-gray-400">
        Please select a company first.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6 text-center text-gray-500 dark:text-gray-400">
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Employees
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Manage your workforce ({employees.length} total)
            </p>
          </div>
          <Link
            href="/payroll/employees/new"
            className="px-4 py-2 transition bg-primary hover:bg-opacity-90 text-white rounded-lg flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Add Employee
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="px-6 py-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by name, mobile, email, or code..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-primary focus:border-transparent"
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

            <div className="relative column-dropdown-container">
              <button
                onClick={() => setShowColumnDropdown(!showColumnDropdown)}
                className="px-4 py-2 rounded-lg transition bg-primary hover:bg-opacity-90 text-white"
              >
                Columns
              </button>

              {showColumnDropdown && (
                <div className="absolute right-0 mt-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-3 z-10 min-w-[150px]">
                  {Object.entries(visibleColumns).map(([key, value]) => (
                    <label key={key} className="flex items-center gap-2 text-sm mb-2 last:mb-0 cursor-pointer text-gray-700 dark:text-gray-300">
                      <input
                        type="checkbox"
                        checked={value}
                        onChange={() => toggleColumn(key as keyof typeof visibleColumns)}
                        className="rounded border-gray-300 dark:border-gray-600 text-primary focus:ring-primary"
                      />
                      <span className="capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={copyToClipboard}
              className="px-4 py-2 rounded-lg transition bg-primary hover:bg-opacity-90 text-white"
            >
              Copy
            </button>

            <button
              onClick={exportExcel}
              className="px-4 py-2 rounded-lg transition bg-primary hover:bg-opacity-90 text-white"
            >
              Excel
            </button>
            <button
              onClick={exportPDF}
              className="px-4 py-2 rounded-lg transition bg-primary hover:bg-opacity-90 text-white"
            >
              PDF
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex flex-wrap gap-4">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="on_notice">On Notice</option>
              <option value="terminated">Terminated</option>
            </select>

            <select
              value={departmentFilter}
              onChange={(e) => {
                setDepartmentFilter(e.target.value);
                setPage(1);
              }}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
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
                setPage(1);
              }}
              className="text-sm text-primary hover:underline"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>

      {/* Error State */}
      {error && (
        <div className="mx-6 mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="p-6 text-center text-gray-500 dark:text-gray-400">
          Loading...
        </div>
      )}

      {/* Table */}
      {!loading && paginatedEmployees.length === 0 ? (
        <div className="p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
            <Users className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">
            No employees yet
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            Add your first employee to get started.
          </p>
          <Link
            href="/payroll/employees/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg transition"
          >
            <Plus className="w-5 h-5" />
            Add Your First Employee
          </Link>
        </div>
      ) : !loading && (
        <div className="p-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-200 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                  {visibleColumns.company && (
                    <th className="text-left px-6 py-3 text-sm font-semibold text-gray-600 dark:text-gray-300">
                      Company
                    </th>
                  )}
                  {visibleColumns.username && (
                    <th className="text-left px-6 py-3 text-sm font-semibold text-gray-600 dark:text-gray-300">
                      Username
                    </th>
                  )}
                  {visibleColumns.mobile && (
                    <th className="text-left px-6 py-3 text-sm font-semibold text-gray-600 dark:text-gray-300">
                      Mobile
                    </th>
                  )}
                  {visibleColumns.email && (
                    <th className="text-left px-6 py-3 text-sm font-semibold text-gray-600 dark:text-gray-300">
                      Email
                    </th>
                  )}
                  {visibleColumns.role && (
                    <th className="text-left px-6 py-3 text-sm font-semibold text-gray-600 dark:text-gray-300">
                      Role
                    </th>
                  )}
                  {visibleColumns.createdOn && (
                    <th className="text-left px-6 py-3 text-sm font-semibold text-gray-600 dark:text-gray-300">
                      Created On
                    </th>
                  )}
                  {visibleColumns.status && (
                    <th className="text-left px-6 py-3 text-sm font-semibold text-gray-600 dark:text-gray-300">
                      Status
                    </th>
                  )}
                  {visibleColumns.actions && (
                    <th className="text-right px-6 py-3 text-sm font-semibold text-gray-600 dark:text-gray-300">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {paginatedEmployees.map((employee) => (
                  <tr
                    key={employee.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    {visibleColumns.company && (
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/20 flex items-center justify-center">
                            <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
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
                      <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                        {employee.full_name || `${employee.first_name} ${employee.last_name || ""}`}
                      </td>
                    )}
                    {visibleColumns.mobile && (
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                          <Phone className="w-4 h-4" />
                          <span>{employee.phone || "-"}</span>
                        </div>
                      </td>
                    )}
                    {visibleColumns.email && (
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                          <Mail className="w-4 h-4" />
                          <span className="truncate max-w-[180px]">{employee.email || "-"}</span>
                        </div>
                      </td>
                    )}
                    {visibleColumns.role && (
                      <td className="px-6 py-4">
                        <p className="font-medium text-gray-900 dark:text-white">
                          {getDesignationName(employee.designation_id)}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {getDepartmentName(employee.department_id)}
                        </p>
                      </td>
                    )}
                    {visibleColumns.createdOn && (
                      <td className="px-6 py-4 text-gray-700 dark:text-gray-300">
                        {employee.created_at ? formatDate(employee.created_at) : "-"}
                      </td>
                    )}
                    {visibleColumns.status && (
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(employee.status)}`}
                        >
                          {employee.status.charAt(0).toUpperCase() + employee.status.slice(1)}
                        </span>
                      </td>
                    )}
                    {visibleColumns.actions && (
                      <td className="px-6 py-4 text-right">
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
                              className="absolute right-0 mt-2 w-40 bg-white dark:bg-gray-800
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
                                View
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
                ))}
              </tbody>
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
                  className="bg-primary text-white px-3 py-1 rounded-lg border border-primary
               hover:bg-primary/90
               disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>

                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page * pageSize >= filteredEmployees.length}
                  className="bg-primary text-white px-3 py-1 rounded-lg border border-primary
               hover:bg-primary/90
               disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>

            </div>
          )}
        </div>
      )}
    </div>
  );
}