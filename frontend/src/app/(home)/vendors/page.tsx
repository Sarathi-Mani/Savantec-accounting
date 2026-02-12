"use client";

import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { saveAs } from "file-saver";
import { addPdfPageNumbers, getProfessionalTableTheme } from "@/utils/pdfTheme";
import { useAuth } from "@/context/AuthContext";
import { vendorsApi, Vendor, VendorListResponse } from "@/services/api";
import Link from "next/link";
import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
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
  RefreshCw,
  Hash,
  Calendar,
  MapPin,
  Globe,
  Shield,
} from "lucide-react";

type VendorWithMeta = Vendor;

// Fixed formatCurrency function for proper INR formatting
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

const formatAmountPlain = (value: number | string | undefined | null): string => {
  if (value === undefined || value === null) return "0.00";
  if (typeof value === "number") return value.toFixed(2);
  const numeric = parseFloat(value.replace(/[^\d.-]/g, ""));
  return Number.isFinite(numeric) ? numeric.toFixed(2) : "0.00";
};

// Print component - Matching products pattern
const PrintView = ({
  vendors,
  visibleColumns,
  formatCurrency,
  companyName,
}: {
  vendors: VendorWithMeta[];
  visibleColumns: Record<string, boolean>;
  formatCurrency: (amount: number) => string;
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
            Vendors List
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
              {visibleColumns.location && (
                <th style={{
                  padding: '12px',
                  textAlign: 'left',
                  borderRight: '1px solid #ddd',
                  fontWeight: 'bold'
                }}>
                  Location
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
                <td style={{
                  padding: '12px',
                  borderRight: '1px solid #ddd'
                }}>
                  {index + 1}
                </td>
                {visibleColumns.vendorId && (
                  <td style={{
                    padding: '12px',
                    borderRight: '1px solid #ddd'
                  }}>
                    {vendor.vendor_code || '-'}
                  </td>
                )}
                {visibleColumns.name && (
                  <td style={{
                    padding: '12px',
                    borderRight: '1px solid #ddd'
                  }}>
                    <div>
                      <strong>{vendor.name}</strong>
                      {/* company_name not available in Vendor type */}
                    </div>
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
                {visibleColumns.location && (
                  <td style={{
                    padding: '12px',
                    borderRight: '1px solid #ddd'
                  }}>
                    {vendor.billing_city ? `${vendor.billing_city}, ${vendor.billing_state || ''}`.trim() : '-'}
                  </td>
                )}
                {visibleColumns.openingBalance && (
                  <td style={{
                    padding: '12px',
                    borderRight: '1px solid #ddd',
                    fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif'
                  }}>
                    <div>
                      <div style={{
                        fontWeight: 'bold',
                        color: vendor.opening_balance_type === 'outstanding' ? '#dc2626' : '#059669'
                      }}>
                        {formatCurrency(vendor.opening_balance || 0)}
                      </div>
                      <div style={{
                        fontSize: '11px',
                        color: '#888',
                        marginTop: '2px'
                      }}>
                        {vendor.opening_balance_type === 'outstanding' ? 'You Owe' : 'You Paid'}
                      </div>
                    </div>
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
  const router = useRouter();
  const { company } = useAuth();
  const [data, setData] = useState<VendorListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Filters state
  const [search, setSearch] = useState("");
  const [stateFilter, setStateFilter] = useState<string>("");
  
  // UI state
  const [showFilters, setShowFilters] = useState(false);
  const [showColumnDropdown, setShowColumnDropdown] = useState(false);
  const [activeActionMenu, setActiveActionMenu] = useState<string | null>(null);
  const [showPrintView, setShowPrintView] = useState(false);
  const [vendorsToPrint, setVendorsToPrint] = useState<VendorWithMeta[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  
  // Export loading states
  const [copyLoading, setCopyLoading] = useState(false);
  const [excelLoading, setExcelLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [csvLoading, setCsvLoading] = useState(false);
  const [printLoading, setPrintLoading] = useState(false);
  
  // Column visibility - matching products pattern
  const [visibleColumns, setVisibleColumns] = useState({
    vendorId: true,
    name: true,
    contact: true,
    email: true,
    gstin: true,
    pan: true,
    location: true,
    openingBalance: true,
    status: true,
    actions: true,
  });

  const companyId = company?.id || (typeof window !== "undefined" ? localStorage.getItem("company_id") : null);

  useEffect(() => {
    if (companyId) {
      fetchVendors();
    }
  }, [companyId, currentPage, search]);

  const fetchVendors = async () => {
    try {
      setLoading(true);
      if (!company?.id) {
        setLoading(false);
        return;
      }

      const result = await vendorsApi.list(company.id, {
        page: currentPage,
        page_size: pageSize,
        search: search || undefined,
      });
      
      setData(result);
      setError("");
    } catch (err) {
      setError("Failed to load vendors");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllVendorsForExport = async (): Promise<VendorWithMeta[]> => {
    try {
      if (!company?.id) return [];

      const pageSize = 100;
      let pageNum = 1;
      let allVendors: VendorWithMeta[] = [];
      while (true) {
        const result = await vendorsApi.list(company.id, {
          page: pageNum,
          page_size: pageSize,
          search: search || undefined,
        });
        const batch = (result?.vendors || []) as VendorWithMeta[];
        allVendors = allVendors.concat(batch);
        if (batch.length < pageSize) break;
        pageNum += 1;
      }

      if (stateFilter) {
        return allVendors.filter((vendor) => (vendor.billing_state || "") === stateFilter);
      }
      return allVendors;
    } catch (error) {
      console.error("Export fetch failed:", error);
      return [];
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
  };

  const handleReset = () => {
    setSearch("");
    setStateFilter("");
    setCurrentPage(1);
  };

  const getStatusBadgeClass = (isActive: boolean): string => {
    return isActive 
      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
      : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
  };

  const getBalanceBadgeClass = (type: string): string => {
    return type === 'outstanding' 
      ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
      : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
  };

  const filteredVendors = (data?.vendors || []).filter((vendor) => {
    if (stateFilter) {
      return (vendor.billing_state || "") === stateFilter;
    }
    return true;
  });
  const availableStates = Array.from(
    new Set(
      (data?.vendors || [])
        .map((vendor) => vendor.billing_state)
        .filter((state): state is string => typeof state === "string" && state.trim() !== "")
    )
  ).sort();
  const totalPages = data ? Math.max(1, Math.ceil(data.total / pageSize)) : 1;

  // Export functions - matching products pattern
  const copyToClipboard = async () => {
    if (copyLoading) return;
    setCopyLoading(true);
    try {
      const allVendors = await fetchAllVendorsForExport();
      
      const headers: string[] = ["S.No"];
      const rows = allVendors.map((vendor, index) => {
        const row: string[] = [(index + 1).toString()];

        if (visibleColumns.vendorId) {
          if (!headers.includes("Vendor ID")) headers.push("Vendor ID");
          row.push(vendor.vendor_code || "-");
        }

        if (visibleColumns.name) {
          if (!headers.includes("Name")) headers.push("Name");
          row.push(vendor.name);
          // company_name not available in Vendor type
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

        if (visibleColumns.location) {
          if (!headers.includes("Location")) headers.push("Location");
          row.push(vendor.billing_city ? `${vendor.billing_city}, ${vendor.billing_state || ''}`.trim() : "-");
        }

        if (visibleColumns.openingBalance) {
          if (!headers.includes("Opening Balance")) headers.push("Opening Balance");
          row.push((vendor.opening_balance || 0).toFixed(2));
          if (!headers.includes("Balance Type")) headers.push("Balance Type");
          row.push(vendor.opening_balance_type || "-");
        }

        if (visibleColumns.status) {
          if (!headers.includes("Status")) headers.push("Status");
          row.push(vendor.is_active ? "Active" : "Inactive");
        }

        return row;
      });

      // Add S.No to headers
      headers.unshift("S.No");
      
      const text = [headers.join("\t"), ...rows.map(r => r.join("\t"))].join("\n");
      await navigator.clipboard.writeText(text);
      alert("Vendor data copied to clipboard");
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
      const allVendors = await fetchAllVendorsForExport();
      
      const exportData = allVendors.map((vendor, index) => {
        const row: Record<string, any> = {
          "S.No": index + 1,
        };

        if (visibleColumns.vendorId) {
          row["Vendor ID"] = vendor.vendor_code || "";
        }

        if (visibleColumns.name) {
          row["Name"] = vendor.name;
        }

        if (visibleColumns.contact) {
          row["Contact"] = vendor.contact || "";
        }

        if (visibleColumns.email) {
          row["Email"] = vendor.email || "";
        }

        if (visibleColumns.gstin) {
          row["GSTIN"] = vendor.tax_number || "";
        }

        if (visibleColumns.pan) {
          row["PAN"] = vendor.pan_number || "";
        }

        if (visibleColumns.location) {
          row["Location"] = vendor.billing_city ? `${vendor.billing_city}, ${vendor.billing_state || ''}`.trim() : "";
        }

        if (visibleColumns.openingBalance) {
          row["Opening Balance"] = vendor.opening_balance || 0;
          row["Balance Type"] = vendor.opening_balance_type || "";
        }

        if (visibleColumns.status) {
          row["Status"] = vendor.is_active ? "Active" : "Inactive";
        }

        row["Company"] = company?.name || "";
        
        return row;
      });

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Vendors");
      XLSX.writeFile(wb, "vendors.xlsx");
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
      const allVendors = await fetchAllVendorsForExport();
      
      const doc = new jsPDF("landscape");
      
      const headers: string[] = ["S.No"];
      const body = allVendors.map((vendor, index) => {
        const row: string[] = [(index + 1).toString()];

        if (visibleColumns.vendorId) {
          if (!headers.includes("Vendor ID")) headers.push("Vendor ID");
          row.push(vendor.vendor_code || "-");
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

        if (visibleColumns.location) {
          if (!headers.includes("Location")) headers.push("Location");
          row.push(vendor.billing_city ? `${vendor.billing_city}, ${vendor.billing_state || ''}`.trim() : "-");
        }

        if (visibleColumns.openingBalance) {
          if (!headers.includes("Opening Balance")) headers.push("Opening Balance");
          row.push(formatAmountPlain(vendor.opening_balance));
        }

        if (visibleColumns.status) {
          if (!headers.includes("Status")) headers.push("Status");
          row.push(vendor.is_active ? "Active" : "Inactive");
        }

        return row;
      });

      autoTable(doc, {
        ...getProfessionalTableTheme(doc, "Vendors List", company?.name || "", "l"),
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
      doc.save("vendors.pdf");
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
      const allVendors = await fetchAllVendorsForExport();
      
      const exportData = allVendors.map((vendor, index) => {
        const row: Record<string, any> = {
          "S.No": index + 1,
        };

        if (visibleColumns.vendorId) {
          row["Vendor ID"] = vendor.vendor_code || "";
        }

        if (visibleColumns.name) {
          row["Name"] = vendor.name;
        }

        if (visibleColumns.contact) {
          row["Contact"] = vendor.contact || "";
        }

        if (visibleColumns.email) {
          row["Email"] = vendor.email || "";
        }

        if (visibleColumns.gstin) {
          row["GSTIN"] = vendor.tax_number || "";
        }

        if (visibleColumns.pan) {
          row["PAN"] = vendor.pan_number || "";
        }

        if (visibleColumns.location) {
          row["Location"] = vendor.billing_city ? `${vendor.billing_city}, ${vendor.billing_state || ''}`.trim() : "";
        }

        if (visibleColumns.openingBalance) {
          row["Opening Balance"] = vendor.opening_balance || 0;
          row["Balance Type"] = vendor.opening_balance_type || "";
        }

        if (visibleColumns.status) {
          row["Status"] = vendor.is_active ? "Active" : "Inactive";
        }

        return row;
      });

      const ws = XLSX.utils.json_to_sheet(exportData);
      const csv = XLSX.utils.sheet_to_csv(ws);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      saveAs(blob, "vendors.csv");
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
      const allVendors = await fetchAllVendorsForExport();
      setVendorsToPrint(allVendors);
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

  const handleDelete = async (vendorId: string, vendorName: string) => {
    if (window.confirm(`Are you sure you want to delete vendor "${vendorName}"? This action cannot be undone.`)) {
      try {
        if (company?.id) {
          await vendorsApi.delete(company.id, vendorId);
          fetchVendors();
        }
      } catch (error) {
        console.error("Error deleting vendor:", error);
        alert("Failed to delete vendor");
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
          vendors={vendorsToPrint}
          visibleColumns={visibleColumns}
          formatCurrency={formatCurrency}
          companyName={company?.name || ''}
        />
      )}

      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Vendors & Suppliers
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Manage your vendors and suppliers • Track payments and balances
            </p>
          </div>
          <button
            onClick={() => router.push('/vendors/new')}
            className="px-4 py-2 transition bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Add Vendor
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
                placeholder="Search vendors by name, email, phone, GSTIN..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch(e)}
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
                  {Object.entries(visibleColumns)
                    .filter(([key]) => key !== 'actions')
                    .map(([key, value]) => (
                    <label key={key} className="flex items-center gap-2 text-sm mb-2 last:mb-0 cursor-pointer text-gray-700 dark:text-gray-300">
                      <input
                        type="checkbox"
                        checked={value}
                        onChange={() => toggleColumn(key as keyof typeof visibleColumns)}
                        className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="capitalize">
                        {key === 'vendorId' ? 'Vendor ID' : 
                         key === 'gstin' ? 'GSTIN' : 
                         key === 'pan' ? 'PAN' :
                         key === 'openingBalance' ? 'Opening Balance' : 
                         key.charAt(0).toUpperCase() + key.slice(1)}
                      </span>
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
            {/* State Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                State
              </label>
              <select
                value={stateFilter}
                onChange={(e) => setStateFilter(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All States</option>
                {availableStates.map((state) => (
                  <option key={state} value={state}>
                    {state}
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
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-200 dark:bg-gray-700/50">
              <tr className="text-sm font-semibold text-gray-600 dark:text-gray-300">
                <th className="text-left px-6 py-3 whitespace-nowrap w-20">
                  S.No
                </th>
                {visibleColumns.vendorId && (
                  <th className="text-left px-6 py-3 whitespace-nowrap w-40">
                    Vendor ID
                  </th>
                )}
                {visibleColumns.name && (
                  <th className="text-left px-6 py-3 whitespace-nowrap w-80">
                    Vendor Name
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
                  <th className="text-left px-6 py-3 whitespace-nowrap w-40">
                    GSTIN
                  </th>
                )}
                {visibleColumns.pan && (
                  <th className="text-left px-6 py-3 whitespace-nowrap w-32">
                    PAN
                  </th>
                )}
                {visibleColumns.location && (
                  <th className="text-left px-6 py-3 whitespace-nowrap w-48">
                    Location
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
              ) : filteredVendors.length === 0 ? (
                <tr>
                  <td colSpan={Object.values(visibleColumns).filter(Boolean).length} className="px-6 py-8 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <Building2 className="w-12 h-12 text-gray-400 mb-2" />
                      <p className="text-lg font-medium text-gray-900 dark:text-white mb-1">
                        No vendors found
                      </p>
                      <p className="text-gray-500 dark:text-gray-400 mb-4">
                        {stateFilter || search ?
                          "No vendors found matching your filters. Try adjusting your search criteria." :
                          "Add your first vendor to start managing your suppliers."}
                      </p>
                      <button
                        onClick={() => router.push('/vendors/new')}
                        className="text-blue-600 hover:underline dark:text-blue-400"
                      >
                        Add your first vendor
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredVendors.map((vendor, index) => (
                  <tr
                    key={vendor.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-gray-700 dark:text-gray-300">
                      {(currentPage - 1) * pageSize + index + 1}
                    </td>
                    {visibleColumns.vendorId && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-blue-600 dark:text-blue-400">
                          {vendor.vendor_code || '-'}
                        </div>
                      </td>
                    )}
                    {visibleColumns.name && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="min-w-0 max-w-[240px]">
                          <div className="font-medium text-gray-900 dark:text-white">
                            {vendor.name}
                          </div>
                          {/* company_name not available in Vendor type */}
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
                        <div className="flex items-center gap-2">
                          <Shield className="w-4 h-4 text-gray-400" />
                          {vendor.tax_number || '-'}
                        </div>
                      </td>
                    )}
                    {visibleColumns.pan && (
                      <td className="px-6 py-4 whitespace-nowrap text-gray-700 dark:text-gray-300">
                        {vendor.pan_number || '-'}
                      </td>
                    )}
                    {visibleColumns.location && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        {vendor.billing_city ? (
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-gray-400" />
                            <span>{`${vendor.billing_city}, ${vendor.billing_state || ''}`.trim()}</span>
                          </div>
                        ) : (
                          <span className="text-gray-500 dark:text-gray-400">-</span>
                        )}
                      </td>
                    )}
                    {visibleColumns.openingBalance && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col gap-1">
                          <div className={`font-bold ${vendor.opening_balance_type === 'outstanding' ? 'text-red-600' : 'text-green-600'}`}>
                            {formatCurrency(vendor.opening_balance || 0)}
                          </div>
                          {vendor.opening_balance_type && (
                            <span
                              className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${getBalanceBadgeClass(vendor.opening_balance_type)}`}
                            >
                              {vendor.opening_balance_type === 'outstanding' ? 'You Owe' : 'You Paid'}
                            </span>
                          )}
                        </div>
                      </td>
                    )}
                    {visibleColumns.status && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(vendor.is_active)}`}
                        >
                          {vendor.is_active ? 'Active' : 'Inactive'}
                        </span>
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
                            <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg shadow-xl py-1 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
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
                              <button
                                onClick={() => {
                                  handleDelete(vendor.id, vendor.name);
                                  setActiveActionMenu(null);
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
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {!loading && filteredVendors.length > 0 && (
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, data?.total || 0)} of {data?.total || 0}
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
