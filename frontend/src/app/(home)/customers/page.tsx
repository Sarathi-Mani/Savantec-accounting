"use client";

import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { saveAs } from "file-saver";
import { addPdfPageNumbers, getProfessionalTableTheme } from "@/utils/pdfTheme";
import { useAuth } from "@/context/AuthContext";
import { customersApi, Customer, CustomerListResponse } from "@/services/api";
import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
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
  CreditCard,
  FileText,
  Printer,
  Copy,
  ChevronDown,
  ChevronUp,
  Mail,
  Phone,
  Building,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react";

// Local formatter function
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

const toSafeNumber = (value: unknown): number => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/,/g, "").trim());
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

export default function CustomersPage() {
  const { company } = useAuth();
  const [data, setData] = useState<CustomerListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [showFilters, setShowFilters] = useState(false);
  const [showColumnDropdown, setShowColumnDropdown] = useState(false);
  const [activeActionMenu, setActiveActionMenu] = useState<string | null>(null);

  // Export loading states
  const [copyLoading, setCopyLoading] = useState(false);
  const [excelLoading, setExcelLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [csvLoading, setCsvLoading] = useState(false);

  const [cachedExportData, setCachedExportData] = useState<Customer[] | null>(null);

  // Column visibility state - match sales list pattern
  const [visibleColumns, setVisibleColumns] = useState({
    customerId: true,
    name: true,
    contact: true,
    email: true,
    gstin: true,
    type: true,
    dueAmount: true,
    creditLimit: true,
    status: true,
    actions: true,
  });

  const pageSize = 10;

  const fetchCustomers = async () => {
    if (!company?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const result = await customersApi.list(company.id, {
        page,
        page_size: pageSize,
        search: search || undefined,
        customer_type: typeFilter || undefined,
      });
      setData(result);
    } catch (error) {
      console.error("Failed to fetch customers:", error);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
    setCachedExportData(null);
  }, [company?.id, page, search, typeFilter, statusFilter]);

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
  const fetchAllCustomersForExport = useCallback(async (): Promise<Customer[]> => {
    if (!company?.id) return [];

    try {
      const result = await customersApi.list(company.id, {
        page: 1,
        page_size: 1000,
        search: search || undefined,
        customer_type: typeFilter || undefined,
      });

      const customers = result.customers || [];
      setCachedExportData(customers);
      return customers;
    } catch (error) {
      console.error("Export fetch failed:", error);
      return [];
    }
  }, [company?.id, search, typeFilter]);
  const getExportData = async (): Promise<Customer[]> => {
    if (cachedExportData) return cachedExportData;
    return await fetchAllCustomersForExport();
  };




  // Export functions - matching sales list pattern
  const copyToClipboard = async () => {
    if (copyLoading) return;
    setCopyLoading(true);
    try {
      const customers = await getExportData();
      const filtered = applyStatusFilter(customers);

      const headers = [
        "Customer ID",
        "Name",
        "Mobile",
        "Email",
        "GSTIN",
        "Type",
        "Due Amount",
        "Credit Limit",
        "Status",
      ];

      const rows = filtered.map(c => [
        c.customer_code || "N/A",
        c.name,
        c.mobile || c.contact || "-",
        c.email || "-",
        c.tax_number || c.gstin || "-",
        getTypeLabel(c.customer_type || ""),
        formatCurrency(toSafeNumber(c.outstanding_balance)),
        formatCurrency(toSafeNumber(c.credit_limit)),
        getStatusText(toSafeNumber(c.outstanding_balance), toSafeNumber(c.credit_limit)),
      ]);

    const text = [headers.join("	"), ...rows.map(r => r.join("	"))].join("\n");

      await navigator.clipboard.writeText(text);
      alert(`Copied ${filtered.length} customers`);
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
      const customers = await getExportData();
      const filtered = applyStatusFilter(customers);

      const exportData = filtered.map(c => ({
        "Customer ID": c.customer_code || "N/A",
        "Name": c.name,
        "Mobile": c.mobile || c.contact || "-",
        "Email": c.email || "-",
        "GSTIN": c.tax_number || c.gstin || "-",
        "Type": getTypeLabel(c.customer_type || ""),
        "Due Amount": toSafeNumber(c.outstanding_balance),
        "Credit Limit": toSafeNumber(c.credit_limit),
        "Status": getStatusText(toSafeNumber(c.outstanding_balance), toSafeNumber(c.credit_limit)),
        "Trade Name": c.trade_name || "-",
        "State": c.state || "-",
        "City": c.city || "-",
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Customers");

      XLSX.writeFile(wb, `customers_${Date.now()}.xlsx`);
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
      const customers = await getExportData();
      const filtered = applyStatusFilter(customers);
      const doc = new jsPDF("l", "mm", "a4");

      autoTable(doc, {
        ...getProfessionalTableTheme(doc, "Customers List", company?.name || "", "l"),
        head: [[
          "Customer ID",
          "Name",
          "Type",
          "Due Amount",
          "Credit Limit",
          "Status"
        ]],
        body: filtered.map(c => [
          c.customer_code || "N/A",
          c.name,
          getTypeLabel(c.customer_type || ""),
          formatCurrency(toSafeNumber(c.outstanding_balance)),
          formatCurrency(toSafeNumber(c.credit_limit)),
          getStatusText(toSafeNumber(c.outstanding_balance), toSafeNumber(c.credit_limit)),
        ]),
      });

      addPdfPageNumbers(doc, "l");
      doc.save(`customers_${Date.now()}.pdf`);
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
      const customers = await getExportData();
      const filtered = applyStatusFilter(customers);

      const exportData = filtered.map(c => ({
        "Customer ID": c.customer_code || "N/A",
        "Name": c.name,
        "Mobile": c.mobile || c.contact || "-",
        "Email": c.email || "-",
        "GSTIN": c.tax_number || c.gstin || "-",
        "Type": getTypeLabel(c.customer_type || ""),
        "Due Amount": toSafeNumber(c.outstanding_balance),
        "Credit Limit": toSafeNumber(c.credit_limit),
        "Status": getStatusText(toSafeNumber(c.outstanding_balance), toSafeNumber(c.credit_limit)),
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const csv = XLSX.utils.sheet_to_csv(ws);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });

      saveAs(blob, `customers_${Date.now()}.csv`);
    } catch (error) {
      console.error("CSV export failed:", error);
      alert("Failed to export CSV. Please try again.");
    } finally {
      setCsvLoading(false);
    }
  };


  const toggleColumn = (key: keyof typeof visibleColumns) => {
    setVisibleColumns(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const getStatusColor = (outstanding: number, creditLimit: number) => {
    if (outstanding > creditLimit) return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
    if (outstanding > 0) return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
    return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
  };

  const getStatusText = (outstanding: number, creditLimit: number) => {
    if (outstanding > creditLimit) return 'Overdue';
    if (outstanding > 0) return 'Pending';
    return 'Paid';
  };

  const applyStatusFilter = (customers: Customer[]): Customer[] => {
    if (!statusFilter) return customers;
    return customers.filter((c) => {
      const status = getStatusText(
        toSafeNumber(c.outstanding_balance),
        toSafeNumber(c.credit_limit),
      ).toLowerCase();
      return status === statusFilter.toLowerCase();
    });
  };

  const displayCustomers = applyStatusFilter(data?.customers || []);


  const getStatusBadge = (outstanding: number, creditLimit: number) => {
    const text = getStatusText(outstanding, creditLimit);
    const colorClass = getStatusColor(outstanding, creditLimit);

    let icon = null;
    if (outstanding > creditLimit) {
      icon = <AlertCircle className="w-3 h-3 mr-1" />;
    } else if (outstanding > 0) {
      icon = <Clock className="w-3 h-3 mr-1" />;
    } else {
      icon = <CheckCircle className="w-3 h-3 mr-1" />;
    }

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClass}`}>
        {icon}
        {text}
      </span>
    );
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "b2b": return "B2B";
      case "b2c": return "B2C";
      case "export": return "Export";
      case "sez": return "SEZ";
      default: return type;
    }
  };

  const getTypeBadge = (type: string) => {
    const label = getTypeLabel(type);
    
    let colorClass = "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400";
    switch (type) {
      case "b2b": colorClass = "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"; break;
      case "b2c": colorClass = "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"; break;
      case "export": colorClass = "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"; break;
      case "sez": colorClass = "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"; break;
    }

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClass}`}>
        {label}
      </span>
    );
  };

  const handleDelete = async (customerId: string) => {
    if (!company?.id || !confirm("Are you sure you want to delete this customer?")) return;
    try {
      await customersApi.delete(company.id, customerId);
      fetchCustomers();
    } catch (error) {
      console.error("Failed to delete customer:", error);
      alert("Failed to delete customer. Please try again.");
    }
  };

  const handleSearch = () => {
    setPage(1);
    fetchCustomers();
  };

  const clearFilters = () => {
    setSearch("");
    setTypeFilter("");
    setStatusFilter("");
    setPage(1);
  };

  const getTotalPages = () => {
    return data ? Math.ceil(data.total / pageSize) : 0;
  };

  return (
    <div className="w-full">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Customers
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Manage and track all your customers
            </p>
          </div>
          <button
            onClick={() => window.location.href = '/customers/new'}
            className="px-4 py-2 transition bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            New Customer
          </button>
        </div>
      </div>

      {/* Summary Cards - Matching sales list pattern */}
      <div className="px-6 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
          {/* Total Customers */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {data?.total?.toLocaleString() || 0}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Total Customers
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
                <Users className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </div>

          {/* Total Outstanding */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatCurrency(data?.customers?.reduce((sum, customer) => sum + toSafeNumber(customer.outstanding_balance), 0) || 0)}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Total Outstanding
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>

          {/* B2B Customers */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {data?.customers?.filter(c => c.customer_type === 'b2b').length || 0}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  B2B Customers
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                <Building className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </div>

          {/* Active Customers */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {data?.customers?.filter(c => toSafeNumber(c.outstanding_balance) <= toSafeNumber(c.credit_limit)).length || 0}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Active Customers
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters - Matching sales list pattern */}
      <div className="px-6 py-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search customers, email, phone, GSTIN..."
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
              onClick={() => window.print()}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors flex items-center gap-2"
            >
              <Printer className="w-5 h-5" />
              Print
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex flex-wrap gap-4">
            {/* Type Dropdown */}
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setPage(1);
              }}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Types</option>
              <option value="b2b">Business (B2B)</option>
              <option value="b2c">Consumer (B2C)</option>
              <option value="export">Export</option>
              <option value="sez">SEZ</option>
            </select>

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
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
              <option value="overdue">Overdue</option>
            </select>

            <button
              onClick={clearFilters}
              className="text-sm text-blue-600 hover:underline dark:text-blue-400"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>

      {/* Table - Matching sales list pattern */}
      {/* <div className="p-6"> */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="w-full">
            <div className="overflow-x-auto">
              <table className="w-full table-fixed">
                <thead className="bg-gray-200 dark:bg-gray-700/50">
                  <tr className="text-sm font-semibold text-gray-600 dark:text-gray-300">
                    {visibleColumns.customerId && (
                      <th className="text-left px-6 py-3 whitespace-nowrap w-32">
                        Customer ID
                      </th>
                    )}
                    {visibleColumns.name && (
                      <th className="text-left px-6 py-3 whitespace-nowrap w-64">
                        Name
                      </th>
                    )}
                    {visibleColumns.contact && (
                      <th className="text-left px-6 py-3 whitespace-nowrap w-40">
                        Contact
                      </th>
                    )}
                    {visibleColumns.email && (
                      <th className="text-left px-6 py-3 whitespace-nowrap w-48">
                        Email
                      </th>
                    )}
                    {visibleColumns.gstin && (
                      <th className="text-left px-6 py-3 whitespace-nowrap w-48">
                        GSTIN
                      </th>
                    )}
                    {visibleColumns.type && (
                      <th className="text-left px-6 py-3 whitespace-nowrap w-32">
                        Type
                      </th>
                    )}
                    {visibleColumns.dueAmount && (
                      <th className="text-left px-6 py-3 whitespace-nowrap w-40">
                        Due Amount
                      </th>
                    )}
                    {visibleColumns.creditLimit && (
                      <th className="text-left px-6 py-3 whitespace-nowrap w-40">
                        Credit Limit
                      </th>
                    )}
                    {visibleColumns.status && (
                      <th className="text-left px-6 py-3 whitespace-nowrap w-32">
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
                  ) : displayCustomers.length === 0 ? (
                    <tr>
                      <td colSpan={Object.values(visibleColumns).filter(Boolean).length} className="px-6 py-8 text-center">
                        <div className="flex flex-col items-center justify-center">
                          <Users className="w-12 h-12 text-gray-400 mb-2" />
                          <p className="text-lg font-medium text-gray-900 dark:text-white mb-1">
                            No customers found
                          </p>
                          <p className="text-gray-500 dark:text-gray-400 mb-4">
                            Try adjusting your filters or add a new customer
                          </p>
                          <button
                            onClick={() => window.location.href = '/customers/new'}
                            className="text-blue-600 hover:underline dark:text-blue-400"
                          >
                            Create your first customer
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    displayCustomers.map((customer) => {
                      const isOverdue = toSafeNumber(customer.outstanding_balance) > toSafeNumber(customer.credit_limit);
                      
                      return (
                        <tr
                          key={customer.id}
                          className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                        >
                          {visibleColumns.customerId && (
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="font-medium text-blue-600 dark:text-blue-400">
                                {customer.customer_code || <span className="text-gray-500">N/A</span>}
                              </div>
                            </td>
                          )}
                          {visibleColumns.name && (
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <Users className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                <div className="min-w-0 max-w-[240px]">
                                  <div className="font-medium text-gray-900 dark:text-white truncate">
                                    {customer.name}
                                  </div>
                                  {customer.trade_name && (
                                    <div className="text-xs text-gray-500 truncate">{customer.trade_name}</div>
                                  )}
                                  {customer.city && (
                                    <div className="text-xs text-gray-500 truncate">{customer.city}, {customer.state}</div>
                                  )}
                                </div>
                              </div>
                            </td>
                          )}
                          {visibleColumns.contact && (
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <Phone className="w-4 h-4 text-gray-400" />
                                <span>{customer.mobile || customer.contact || '-'}</span>
                              </div>
                            </td>
                          )}
                          {visibleColumns.email && (
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <Mail className="w-4 h-4 text-gray-400" />
                                <span className="truncate">{customer.email || '-'}</span>
                              </div>
                            </td>
                          )}
                          {visibleColumns.gstin && (
                            <td className="px-6 py-4 whitespace-nowrap text-gray-700 dark:text-gray-300">
                              {customer.tax_number || customer.gstin || '-'}
                            </td>
                          )}
                          {visibleColumns.type && (
                            <td className="px-6 py-4 whitespace-nowrap">
                              {getTypeBadge(customer.customer_type || '')}
                            </td>
                          )}
                          {visibleColumns.dueAmount && (
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className={`font-medium ${isOverdue ? 'text-red-600' : 'text-gray-900 dark:text-white'}`}>
                                {formatCurrency(toSafeNumber(customer.outstanding_balance))}
                              </div>
                            </td>
                          )}
                          {visibleColumns.creditLimit && (
                            <td className="px-6 py-4 whitespace-nowrap text-gray-700 dark:text-gray-300">
                              {formatCurrency(toSafeNumber(customer.credit_limit))}
                            </td>
                          )}
                          {visibleColumns.status && (
                            <td className="px-6 py-4 whitespace-nowrap">
                              {getStatusBadge(toSafeNumber(customer.outstanding_balance), toSafeNumber(customer.credit_limit))}
                            </td>
                          )}
                          {visibleColumns.actions && (
                            <td className="px-6 py-4 text-right whitespace-nowrap">
                              <div className="relative action-dropdown-container inline-block">
                                <button
                                  onClick={() =>
                                    setActiveActionMenu(
                                      activeActionMenu === customer.id ? null : customer.id
                                    )
                                  }
                                  className="p-2 rounded-lg text-gray-500 hover:text-gray-700
                                    dark:text-gray-400 dark:hover:text-white
                                    hover:bg-gray-100 dark:hover:bg-gray-700"
                                >
                                  <MoreVertical className="w-5 h-5" />
                                </button>

                                {activeActionMenu === customer.id && (
                                  <div
                                    className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800
                                      border border-gray-200 dark:border-gray-700
                                      rounded-lg shadow-lg z-20"
                                  >
                                    <Link
                                      href={`/customers/${customer.id}`}
                                      onClick={() => setActiveActionMenu(null)}
                                      className="flex items-center gap-2 px-4 py-2 text-sm
                                        text-gray-700 dark:text-gray-300
                                        hover:bg-gray-100 dark:hover:bg-gray-700"
                                    >
                                      <Eye className="w-4 h-4" />
                                      View Details
                                    </Link>

                                    <Link
                                      href={`/customers/${customer.id}/edit`}
                                      onClick={() => setActiveActionMenu(null)}
                                      className="flex items-center gap-2 px-4 py-2 text-sm
                                        text-gray-700 dark:text-gray-300
                                        hover:bg-gray-100 dark:hover:bg-gray-700"
                                    >
                                      <Edit className="w-4 h-4" />
                                      Edit
                                    </Link>

                                    <Link
                                      href={`/customers/${customer.id}/advance`}
                                      onClick={() => setActiveActionMenu(null)}
                                      className="flex items-center gap-2 px-4 py-2 text-sm
                                        text-green-600 dark:text-green-400
                                        hover:bg-green-50 dark:hover:bg-green-900/30"
                                    >
                                      <CreditCard className="w-4 h-4" />
                                      Advance Payments
                                    </Link>

                                    <Link
                                      href={`/customers/${customer.id}/payments`}
                                      onClick={() => setActiveActionMenu(null)}
                                      className="flex items-center gap-2 px-4 py-2 text-sm
                                        text-purple-600 dark:text-purple-400
                                        hover:bg-purple-50 dark:hover:bg-purple-900/30"
                                    >
                                      <Eye className="w-4 h-4" />
                                      View Payments
                                    </Link>

                                    <Link
                                      href={`/customers/${customer.id}/receive-due`}
                                      onClick={() => setActiveActionMenu(null)}
                                      className="flex items-center gap-2 px-4 py-2 text-sm
                                        text-orange-600 dark:text-orange-400
                                        hover:bg-orange-50 dark:hover:bg-orange-900/30"
                                    >
                                      <Download className="w-4 h-4" />
                                      Receive Due
                                    </Link>

                                    <button
                                      onClick={() => {
                                        if (confirm("Are you sure you want to delete this customer?")) {
                                          handleDelete(customer.id);
                                          setActiveActionMenu(null);
                                        }
                                      }}
                                      className="flex w-full items-center gap-2 px-4 py-2 text-sm
                                        text-red-600 dark:text-red-400
                                        hover:bg-red-50 dark:hover:bg-red-900/30"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                      Delete Customer
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
                {displayCustomers.length > 0 && visibleColumns.dueAmount && (
                  <tfoot>
                    <tr className="bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700">
                      <td
                        colSpan={
                          Object.values(visibleColumns).filter(Boolean).length -
                          (visibleColumns.dueAmount ? 1 : 0) -
                          (visibleColumns.actions ? 1 : 0)
                        }
                        className="px-6 py-4 text-right font-semibold text-gray-900 dark:text-white whitespace-nowrap"
                      >
                        Total Outstanding:
                      </td>
                      <td className="px-6 py-4 font-bold text-gray-900 dark:text-white whitespace-nowrap">
                        {formatCurrency(displayCustomers.reduce((sum, customer) => sum + toSafeNumber(customer.outstanding_balance), 0))}
                      </td>
                      {visibleColumns.actions && (
                        <td></td>
                      )}
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>

        {/* Pagination - Matching sales list pattern */}
        {(data && (statusFilter ? displayCustomers.length : data.total) > pageSize) && (
          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Showing {(page - 1) * pageSize + 1} to{" "}
              {Math.min(page * pageSize, statusFilter ? displayCustomers.length : data.total)} of {statusFilter ? displayCustomers.length : data.total} results
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
                disabled={page * pageSize >= data.total}
                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    // </div>
  );
}
