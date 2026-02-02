"use client";

import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { saveAs } from "file-saver";
import { useAuth } from "@/context/AuthContext";
import { vendorsApi, Vendor, VendorListResponse } from "@/services/api";
import Link from "next/link";
import { useEffect, useState, useRef } from "react";
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
  Building2,
  CreditCard,
  Receipt,
  Wallet,
} from "lucide-react";

// Fixed formatCurrency function for proper INR formatting
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount).replace('₹', '₹ '); // Add space after ₹ for better readability
};

// Print component
const PrintView = ({
  vendors,
  visibleColumns,
  formatCurrency
}: {
  vendors: Vendor[];
  visibleColumns: Record<string, boolean>;
  formatCurrency: (amount: number) => string;
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
            Vendors List
          </h1>
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
              {visibleColumns.vendorId && (
                <th style={{
                  padding: '12px',
                  textAlign: 'left',
                  borderRight: '1px solid #ddd',
                  fontWeight: 'bold'
                }}>
                  Vendor ID
                </th>
              )}
              {visibleColumns.name && (
                <th style={{
                  padding: '12px',
                  textAlign: 'left',
                  borderRight: '1px solid #ddd',
                  fontWeight: 'bold'
                }}>
                  Name
                </th>
              )}
              {visibleColumns.contact && (
                <th style={{
                  padding: '12px',
                  textAlign: 'left',
                  borderRight: '1px solid #ddd',
                  fontWeight: 'bold'
                }}>
                  Contact
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
              {visibleColumns.gstin && (
                <th style={{
                  padding: '12px',
                  textAlign: 'left',
                  borderRight: '1px solid #ddd',
                  fontWeight: 'bold'
                }}>
                  GSTIN
                </th>
              )}
              {visibleColumns.pan && (
                <th style={{
                  padding: '12px',
                  textAlign: 'left',
                  borderRight: '1px solid #ddd',
                  fontWeight: 'bold'
                }}>
                  PAN
                </th>
              )}
              {visibleColumns.openingBalance && (
                <th style={{
                  padding: '12px',
                  textAlign: 'left',
                  borderRight: '1px solid #ddd',
                  fontWeight: 'bold'
                }}>
                  Opening Balance
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
            {vendors.map((vendor, index) => (
              <tr key={vendor.id} style={{
                borderBottom: '1px solid #ddd',
                backgroundColor: index % 2 === 0 ? '#fff' : '#f9f9f9'
              }}>
                {visibleColumns.vendorId && (
                  <td style={{
                    padding: '12px',
                    borderRight: '1px solid #ddd'
                  }}>
                    {vendor.vendor_code || 'N/A'}
                  </td>
                )}
                {visibleColumns.name && (
                  <td style={{
                    padding: '12px',
                    borderRight: '1px solid #ddd'
                  }}>
                    {vendor.name}
                  </td>
                )}
                {visibleColumns.contact && (
                  <td style={{
                    padding: '12px',
                    borderRight: '1px solid #ddd'
                  }}>
                    {vendor.contact || '-'}
                  </td>
                )}
                {visibleColumns.email && (
                  <td style={{
                    padding: '12px',
                    borderRight: '1px solid #ddd'
                  }}>
                    {vendor.email || '-'}
                  </td>
                )}
                {visibleColumns.gstin && (
                  <td style={{
                    padding: '12px',
                    borderRight: '1px solid #ddd'
                  }}>
                    {vendor.tax_number || '-'}
                  </td>
                )}
                {visibleColumns.pan && (
                  <td style={{
                    padding: '12px',
                    borderRight: '1px solid #ddd'
                  }}>
                    {vendor.pan_number || '-'}
                  </td>
                )}
                {visibleColumns.openingBalance && (
                  <td style={{
                    padding: '12px',
                    borderRight: '1px solid #ddd',
                    color: vendor.opening_balance_type === 'outstanding' ? '#dc2626' : '#059669',
                    fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif'
                  }}>
                    {formatCurrency(vendor.opening_balance || 0)}
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
                      backgroundColor: vendor.is_active ? '#d1fae5' : '#fee2e2',
                      color: vendor.is_active ? '#065f46' : '#991b1b'
                    }}>
                      {vendor.is_active ? 'Active' : 'Inactive'}
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
            Total Vendors: {vendors.length}
          </div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            Page 1 of 1
          </div>
        </div>
      </div>
    </div>
  );
};

export default function VendorsPage() {
  const { company } = useAuth();
  const [data, setData] = useState<VendorListResponse | null>(null);
  const [allVendors, setAllVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [showFilters, setShowFilters] = useState(false);
  const [showColumnDropdown, setShowColumnDropdown] = useState(false);
  const [activeActionMenu, setActiveActionMenu] = useState<string | null>(null);
  const [showPrintView, setShowPrintView] = useState(false);
  const [vendorsToPrint, setVendorsToPrint] = useState<Vendor[]>([]);

  // Column visibility state - match customers list pattern
  const [visibleColumns, setVisibleColumns] = useState({
    vendorId: true,
    name: true,
    contact: true,
    email: true,
    gstin: true,
    pan: true,
    openingBalance: true,
    status: true,
    actions: true,
  });

  const pageSize = 10;

  const fetchVendors = async () => {
    if (!company?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const result = await vendorsApi.list(company.id, {
        page,
        page_size: pageSize,
        search: search || undefined,
      });
      setData(result);
      setAllVendors(result.vendors);
    } catch (error) {
      console.error("Failed to fetch vendors:", error);
      setData(null);
      setAllVendors([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVendors();
  }, [company?.id, page, search]);

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

  // Filter vendors based on status filter
  const getFilteredVendors = () => {
    if (!data?.vendors) return [];

    let filtered = data.vendors;

    // Apply status filter
    if (statusFilter === "active") {
      filtered = filtered.filter(vendor => vendor.is_active);
    } else if (statusFilter === "inactive") {
      filtered = filtered.filter(vendor => !vendor.is_active);
    }

    return filtered;
  };

  // Handle print
  const handlePrint = () => {
    const filteredVendors = getFilteredVendors();
    setVendorsToPrint(filteredVendors);
    setShowPrintView(true);
  };

  // Export functions - matching customers list pattern
  const copyToClipboard = async () => {
    const filtered = getFilteredVendors();

    // Build headers based on visible columns
    const headers: string[] = [];
    const rowData = filtered.map(vendor => {
      const row: string[] = [];

      if (visibleColumns.vendorId) {
        if (!headers.includes("Vendor ID")) headers.push("Vendor ID");
        row.push(vendor.vendor_code || 'N/A');
      }

      if (visibleColumns.name) {
        if (!headers.includes("Name")) headers.push("Name");
        row.push(vendor.name);
      }

      if (visibleColumns.contact) {
        if (!headers.includes("Contact")) headers.push("Contact");
        row.push(vendor.contact || '-');
      }

      if (visibleColumns.email) {
        if (!headers.includes("Email")) headers.push("Email");
        row.push(vendor.email || '-');
      }

      if (visibleColumns.gstin) {
        if (!headers.includes("GSTIN")) headers.push("GSTIN");
        row.push(vendor.tax_number || '-');
      }

      if (visibleColumns.pan) {
        if (!headers.includes("PAN")) headers.push("PAN");
        row.push(vendor.pan_number || '-');
      }

      if (visibleColumns.openingBalance) {
        if (!headers.includes("Opening Balance")) headers.push("Opening Balance");
        row.push(formatCurrency(vendor.opening_balance || 0));
        if (!headers.includes("Balance Type")) headers.push("Balance Type");
        row.push(vendor.opening_balance_type || '-');
      }

      if (visibleColumns.status) {
        if (!headers.includes("Status")) headers.push("Status");
        row.push(vendor.is_active ? 'Active' : 'Inactive');
      }

      return row;
    });

    const text = [headers.join("\t"), ...rowData.map(r => r.join("\t"))].join("\n");
    await navigator.clipboard.writeText(text);
    alert("Vendor data copied to clipboard");
  };

  const exportExcel = () => {
    const filtered = getFilteredVendors();
    const exportData = filtered.map(vendor => {
      const row: Record<string, any> = {};

      if (visibleColumns.vendorId) {
        row["Vendor ID"] = vendor.vendor_code || 'N/A';
      }

      if (visibleColumns.name) {
        row["Name"] = vendor.name;
      }

      if (visibleColumns.contact) {
        row["Contact"] = vendor.contact || '-';
      }

      if (visibleColumns.email) {
        row["Email"] = vendor.email || '-';
      }

      if (visibleColumns.gstin) {
        row["GSTIN"] = vendor.tax_number || '-';
      }

      if (visibleColumns.pan) {
        row["PAN"] = vendor.pan_number || '-';
      }

      if (visibleColumns.openingBalance) {
        row["Opening Balance"] = vendor.opening_balance || 0;
        row["Balance Type"] = vendor.opening_balance_type || '-';
      }

      if (visibleColumns.status) {
        row["Status"] = vendor.is_active ? 'Active' : 'Inactive';
      }

      return row;
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Vendors");
    XLSX.writeFile(wb, "vendors.xlsx");
  };

  // Fixed PDF export function to include all visible columns
  const exportPDF = () => {
    const filtered = getFilteredVendors();
    const doc = new jsPDF("landscape");

    // PDF-safe currency formatter (NO ₹ symbol)
    const formatCurrencyForPDF = (amount: number): string => {
      return `Rs. ${new Intl.NumberFormat("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount)}`;
    };

    // Build headers & rows based on visible columns
    const headers: string[] = [];
    const body = filtered.map((vendor) => {
      const row: string[] = [];

      if (visibleColumns.vendorId) {
        if (!headers.includes("Vendor ID")) headers.push("Vendor ID");
        row.push(vendor.vendor_code || "N/A");
      }

      if (visibleColumns.name) {
        if (!headers.includes("Name")) headers.push("Name");
        row.push(vendor.name);
      }

      if (visibleColumns.contact) {
        if (!headers.includes("Contact")) headers.push("Contact");
        row.push(vendor.contact || "-");
      }

      if (visibleColumns.email) {
        if (!headers.includes("Email")) headers.push("Email");
        row.push(vendor.email || "-");
      }

      if (visibleColumns.gstin) {
        if (!headers.includes("GSTIN")) headers.push("GSTIN");
        row.push(vendor.tax_number || "-");
      }

      if (visibleColumns.pan) {
        if (!headers.includes("PAN")) headers.push("PAN");
        row.push(vendor.pan_number || "-");
      }

      if (visibleColumns.openingBalance) {
        if (!headers.includes("Opening Balance")) headers.push("Opening Balance");
        row.push(formatCurrencyForPDF(vendor.opening_balance || 0));
      }

      if (visibleColumns.status) {
        if (!headers.includes("Status")) headers.push("Status");
        row.push(vendor.is_active ? "Active" : "Inactive");
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
        font: "helvetica", // default font (safe)
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
        doc.text("Vendors List", data.settings.margin.left, 12);

        // Date
        doc.setFontSize(10);
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

    doc.save("vendors.pdf");
  };


  const exportCSV = () => {
    const filtered = getFilteredVendors();
    const exportData = filtered.map(vendor => {
      const row: Record<string, any> = {};

      if (visibleColumns.vendorId) {
        row["Vendor ID"] = vendor.vendor_code || 'N/A';
      }

      if (visibleColumns.name) {
        row["Name"] = vendor.name;
      }

      if (visibleColumns.contact) {
        row["Contact"] = vendor.contact || '-';
      }

      if (visibleColumns.email) {
        row["Email"] = vendor.email || '-';
      }

      if (visibleColumns.gstin) {
        row["GSTIN"] = vendor.tax_number || '-';
      }

      if (visibleColumns.pan) {
        row["PAN"] = vendor.pan_number || '-';
      }

      if (visibleColumns.openingBalance) {
        row["Opening Balance"] = vendor.opening_balance || 0;
        row["Balance Type"] = vendor.opening_balance_type || '-';
      }

      if (visibleColumns.status) {
        row["Status"] = vendor.is_active ? 'Active' : 'Inactive';
      }

      return row;
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    saveAs(blob, "vendors.csv");
  };

  const toggleColumn = (key: keyof typeof visibleColumns) => {
    setVisibleColumns(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const getStatusColor = (isActive: boolean) => {
    return isActive
      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
      : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
  };

  const getStatusBadge = (isActive: boolean) => {
    const text = isActive ? 'Active' : 'Inactive';
    const colorClass = getStatusColor(isActive);

    const icon = isActive
      ? <CheckCircle className="w-3 h-3 mr-1" />
      : <XCircle className="w-3 h-3 mr-1" />;

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClass}`}>
        {icon}
        {text}
      </span>
    );
  };

  const getBalanceBadge = (amount: number, type: string) => {
    const isOutstanding = type === 'outstanding';
    const colorClass = isOutstanding
      ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
      : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClass}`}>
        {isOutstanding ? 'You Owe' : 'You Paid'}
      </span>
    );
  };

  const handleDelete = async (vendorId: string) => {
    if (!company?.id || !confirm("Are you sure you want to delete this vendor?")) return;
    try {
      await vendorsApi.delete(company.id, vendorId);
      fetchVendors();
    } catch (error) {
      console.error("Failed to delete vendor:", error);
      alert("Failed to delete vendor. Please try again.");
    }
  };

  const handleSearch = () => {
    setPage(1);
    fetchVendors();
  };

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("");
    setPage(1);
  };

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value);
    setPage(1);
  };

  const getDisplayVendors = () => {
    const filtered = getFilteredVendors();
    // Apply pagination
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filtered.slice(startIndex, endIndex);
  };

  const getTotalFilteredCount = () => {
    const filtered = getFilteredVendors();
    return filtered.length;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {showPrintView && (
        <PrintView
          vendors={vendorsToPrint}
          visibleColumns={visibleColumns}
          formatCurrency={formatCurrency}
        />
      )}

      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Vendors
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Manage and track all your vendors and suppliers
            </p>
          </div>
          <button
            onClick={() => window.location.href = '/vendors/new'}
            className="px-4 py-2 transition bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            New Vendor
          </button>
        </div>
      </div>

      {/* Filters - Matching customers list pattern */}
      <div className="px-6 py-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search vendors, email, phone, GSTIN..."
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
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors flex items-center gap-2"
            >
              <Copy className="w-5 h-5" />
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
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors flex items-center gap-2"
            >
              Excel
            </button>

            <button
              onClick={exportPDF}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors flex items-center gap-2"
            >
              PDF
            </button>

            <button
              onClick={exportCSV}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors flex items-center gap-2"
            >
              CSV
            </button>

            <button
              onClick={handlePrint}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors flex items-center gap-2"
            >
              <Printer className="w-5 h-5" />
              Print
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex flex-wrap gap-4">
            {/* Status Dropdown */}
            <select
              value={statusFilter}
              onChange={(e) => handleStatusFilterChange(e.target.value)}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
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

      {/* Table - Matching customers list pattern */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
        <table className="w-full table-fixed">
          <div className="overflow-x-auto">
            <thead className="bg-gray-200 dark:bg-gray-700/50">
              <tr className="text-sm font-semibold text-gray-600 dark:text-gray-300">
                {visibleColumns.vendorId && (
                  <th className="text-left px-6 py-3 whitespace-nowrap w-32">
                    Vendor ID
                  </th>
                )}
                {visibleColumns.name && (
                  <th className="text-left px-6 py-3 whitespace-nowrap min-w-[200px]">
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
                {visibleColumns.pan && (
                  <th className="text-left px-6 py-3 whitespace-nowrap w-32">
                    PAN
                  </th>
                )}
                {visibleColumns.openingBalance && (
                  <th className="text-left px-6 py-3 whitespace-nowrap w-48">
                    Opening Balance
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
              ) : getDisplayVendors().length === 0 ? (
                <tr>
                  <td colSpan={Object.values(visibleColumns).filter(Boolean).length} className="px-6 py-8 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <Building2 className="w-12 h-12 text-gray-400 mb-2" />
                      <p className="text-lg font-medium text-gray-900 dark:text-white mb-1">
                        No vendors found
                      </p>
                      <p className="text-gray-500 dark:text-gray-400 mb-4">
                        {statusFilter ?
                          `No ${statusFilter} vendors found. Try adjusting your filters.` :
                          "Try adjusting your filters or add a new vendor"}
                      </p>
                      <button
                        onClick={() => window.location.href = '/vendors/new'}
                        className="text-blue-600 hover:underline dark:text-blue-400"
                      >
                        Create your first vendor
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                getDisplayVendors().map((vendor) => {
                  const isOutstanding = vendor.opening_balance_type === 'outstanding';

                  return (
                    <tr
                      key={vendor.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      {visibleColumns.vendorId && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-medium text-blue-600 dark:text-blue-400">
                            {vendor.vendor_code || <span className="text-gray-500">N/A</span>}
                          </div>
                        </td>
                      )}
                      {visibleColumns.name && (
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-gray-400 flex-shrink-0" />
                            <div className="min-w-0">
                              <div className="font-medium text-gray-900 dark:text-white truncate">
                                {vendor.name}
                              </div>
                              {vendor.billing_city && (
                                <div className="text-xs text-gray-500 truncate">
                                  {vendor.billing_city}, {vendor.billing_state}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      )}
                      {visibleColumns.contact && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4 text-gray-400" />
                            <span>{vendor.contact || '-'}</span>
                          </div>
                        </td>
                      )}
                      {visibleColumns.email && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4 text-gray-400" />
                            <span className="truncate">{vendor.email || '-'}</span>
                          </div>
                        </td>
                      )}
                      {visibleColumns.gstin && (
                        <td className="px-6 py-4 whitespace-nowrap text-gray-700 dark:text-gray-300">
                          {vendor.tax_number || '-'}
                        </td>
                      )}
                      {visibleColumns.pan && (
                        <td className="px-6 py-4 whitespace-nowrap text-gray-700 dark:text-gray-300">
                          {vendor.pan_number || '-'}
                        </td>
                      )}
                      {visibleColumns.openingBalance && (
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1">
                            <div className={`font-medium ${isOutstanding ? 'text-red-600' : 'text-green-600'}`}>
                              {formatCurrency(vendor.opening_balance || 0)}
                            </div>
                            {vendor.opening_balance_type && (
                              <div>
                                {getBalanceBadge(vendor.opening_balance || 0, vendor.opening_balance_type)}
                              </div>
                            )}
                          </div>
                        </td>
                      )}
                      {visibleColumns.status && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(vendor.is_active)}
                        </td>
                      )}
                      {visibleColumns.actions && (
                        <td className="px-6 py-4 text-right whitespace-nowrap">
                          <div className="relative action-dropdown-container inline-block">
                            <button
                              onClick={() =>
                                setActiveActionMenu(
                                  activeActionMenu === vendor.id ? null : vendor.id
                                )
                              }
                              className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-50 dark:hover:text-gray-300 dark:hover:bg-gray-700/50 transition-all duration-200"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>

                            {activeActionMenu === vendor.id && (
                              <div className="absolute right-0 mt-1 w-52 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg shadow-xl py-1 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                                <Link
                                  href={`/vendors/${vendor.id}`}
                                  onClick={() => setActiveActionMenu(null)}
                                  className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                                >
                                  <Eye className="w-4 h-4 text-gray-400" />
                                  <span>View Details</span>
                                </Link>

                                <Link
                                  href={`/vendors/${vendor.id}/edit`}
                                  onClick={() => setActiveActionMenu(null)}
                                  className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                                >
                                  <Edit className="w-4 h-4 text-gray-400" />
                                  <span>Edit</span>
                                </Link>

                                <div className="my-1 border-t border-gray-100 dark:border-gray-700"></div>

                                <Link
                                  href={`/vendors/${vendor.id}/advance`}
                                  onClick={() => setActiveActionMenu(null)}
                                  className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
                                >
                                  <CreditCard className="w-4 h-4 text-green-500" />
                                  <span>Advance Payments</span>
                                </Link>

                                <Link
                                  href={`/vendors/${vendor.id}/payments`}
                                  onClick={() => setActiveActionMenu(null)}
                                  className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors"
                                >
                                  <Receipt className="w-4 h-4 text-purple-500" />
                                  <span>View Payments</span>
                                </Link>

                                <Link
                                  href={`/vendors/${vendor.id}/make-payment`}
                                  onClick={() => setActiveActionMenu(null)}
                                  className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors"
                                >
                                  <Wallet className="w-4 h-4 text-orange-500" />
                                  <span>Make Payment</span>
                                </Link>

                                <div className="my-1 border-t border-gray-100 dark:border-gray-700"></div>

                                <button
                                  onClick={() => {
                                    if (confirm("Are you sure you want to delete this vendor?")) {
                                      handleDelete(vendor.id);
                                      setActiveActionMenu(null);
                                    }
                                  }}
                                  className="flex w-full items-center gap-3 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  <span>Delete Vendor</span>
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
          </div>
        </table>
      </div>

      {/* Pagination - Matching customers list pattern */}
      {getTotalFilteredCount() > pageSize && (
        <div className="mt-4 px-6 py-4 flex items-center justify-between">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Showing {(page - 1) * pageSize + 1} to{" "}
            {Math.min(page * pageSize, getTotalFilteredCount())} of {getTotalFilteredCount()} results
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
              disabled={page * pageSize >= getTotalFilteredCount()}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}