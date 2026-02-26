"use client";

import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { saveAs } from "file-saver";
import { addPdfPageNumbers, getProfessionalTableTheme } from "@/utils/pdfTheme";
import { useAuth } from "@/context/AuthContext";
import { customersApi, Customer, CustomerListResponse } from "@/services/api";
import Link from "next/link";
import { useEffect, useState, useCallback, useRef } from "react";
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
  RefreshCw,
  User,
  MapPin,
} from "lucide-react";

// Print component for customers
const PrintView = ({
  customers,
  visibleColumns,
  formatCurrency,
  getTypeLabel,
  getStatusText,
  getStatusColor,
  companyName,
  onComplete,
}: {
  customers: Customer[];
  visibleColumns: Record<string, boolean>;
  formatCurrency: (amount: number) => string;
  getTypeLabel: (type: string) => string;
  getStatusText: (outstanding: number, creditLimit: number, advance: number) => string;
  getStatusColor: (outstanding: number, creditLimit: number, advance: number) => string;
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

  const toSafeNumber = (value: unknown): number => {
    if (typeof value === "number") return Number.isFinite(value) ? value : 0;
    if (typeof value === "string") {
      const parsed = Number(value.replace(/,/g, "").trim());
      return Number.isFinite(parsed) ? parsed : 0;
    }
    return 0;
  };

  const getNetDueAmount = (customer: Customer): number => {
    const outstanding = toSafeNumber(customer.outstanding_balance);
    const advance = toSafeNumber(customer.advance_balance);
    if (outstanding > 0) return outstanding;
    if (advance > 0) return -advance;
    return 0;
  };

  return (
    <div style={{ display: 'none' }}>
      <div ref={printRef} style={{ fontFamily: 'Arial, sans-serif', padding: '20px' }}>
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '5px' }}>
            Customers List
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
              {visibleColumns.customerId && (
                <th style={{
                  padding: '12px',
                  textAlign: 'left',
                  borderRight: '1px solid #ddd',
                  fontWeight: 'bold'
                }}>
                  Customer ID
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
              {visibleColumns.type && (
                <th style={{
                  padding: '12px',
                  textAlign: 'left',
                  borderRight: '1px solid #ddd',
                  fontWeight: 'bold'
                }}>
                  Type
                </th>
              )}
              {visibleColumns.dueAmount && (
                <th style={{
                  padding: '12px',
                  textAlign: 'left',
                  borderRight: '1px solid #ddd',
                  fontWeight: 'bold'
                }}>
                  Due Amount
                </th>
              )}
              {visibleColumns.creditLimit && (
                <th style={{
                  padding: '12px',
                  textAlign: 'left',
                  borderRight: '1px solid #ddd',
                  fontWeight: 'bold'
                }}>
                  Credit Limit
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
            {customers.map((customer, index) => {
              const outstanding = toSafeNumber(customer.outstanding_balance);
              const advance = toSafeNumber(customer.advance_balance);
              const creditLimit = toSafeNumber(customer.credit_limit);
              const netDue = getNetDueAmount(customer);
              
              return (
                <tr key={customer.id} style={{
                  borderBottom: '1px solid #ddd',
                  backgroundColor: index % 2 === 0 ? '#fff' : '#f9f9f9'
                }}>
                  {visibleColumns.customerId && (
                    <td style={{
                      padding: '12px',
                      borderRight: '1px solid #ddd'
                    }}>
                      {customer.customer_code || 'N/A'}
                    </td>
                  )}
                  {visibleColumns.name && (
                    <td style={{
                      padding: '12px',
                      borderRight: '1px solid #ddd'
                    }}>
                      <div>{customer.name}</div>
                      {customer.trade_name && (
                        <div style={{ fontSize: '12px', color: '#666' }}>{customer.trade_name}</div>
                      )}
                    </td>
                  )}
                  {visibleColumns.contact && (
                    <td style={{
                      padding: '12px',
                      borderRight: '1px solid #ddd'
                    }}>
                      {customer.mobile || customer.contact || '-'}
                    </td>
                  )}
                  {visibleColumns.email && (
                    <td style={{
                      padding: '12px',
                      borderRight: '1px solid #ddd'
                    }}>
                      {customer.email || '-'}
                    </td>
                  )}
                  {visibleColumns.gstin && (
                    <td style={{
                      padding: '12px',
                      borderRight: '1px solid #ddd'
                    }}>
                      {customer.tax_number || customer.gstin || '-'}
                    </td>
                  )}
                  {visibleColumns.type && (
                    <td style={{
                      padding: '12px',
                      borderRight: '1px solid #ddd'
                    }}>
                      {getTypeLabel(customer.customer_type || '')}
                    </td>
                  )}
                  {visibleColumns.dueAmount && (
                    <td style={{
                      padding: '12px',
                      borderRight: '1px solid #ddd',
                      color: outstanding > creditLimit ? '#dc2626' : netDue < 0 ? '#16a34a' : '#111827',
                      fontWeight: 'bold'
                    }}>
                      {formatCurrency(netDue)}
                    </td>
                  )}
                  {visibleColumns.creditLimit && (
                    <td style={{
                      padding: '12px',
                      borderRight: '1px solid #ddd'
                    }}>
                      {formatCurrency(creditLimit)}
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
                        backgroundColor: getStatusColor(outstanding, creditLimit, advance).split(' ')[0].replace('bg-', ''),
                        color: getStatusColor(outstanding, creditLimit, advance).split(' ')[1].replace('text-', ''),
                      }}>
                        {getStatusText(outstanding, creditLimit, advance)}
                      </span>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
          {customers.length > 0 && visibleColumns.dueAmount && (
            <tfoot>
              <tr style={{
                borderTop: '2px solid #ddd',
                backgroundColor: '#f3f4f6',
                fontWeight: 'bold'
              }}>
                <td
                  colSpan={
                    Object.values(visibleColumns).filter(Boolean).length -
                    (visibleColumns.dueAmount ? 1 : 0) -
                    (visibleColumns.creditLimit ? 1 : 0)
                  }
                  style={{
                    padding: '12px',
                    textAlign: 'right',
                    borderRight: '1px solid #ddd'
                  }}
                >
                  Total Outstanding:
                </td>
                <td style={{ padding: '12px', borderRight: '1px solid #ddd' }}>
                  {formatCurrency(customers.reduce((sum, c) => sum + toSafeNumber(c.outstanding_balance), 0))}
                </td>
                {visibleColumns.creditLimit && <td style={{ padding: '12px' }}></td>}
              </tr>
            </tfoot>
          )}
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
            Total Customers: {customers.length}
          </div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            Page 1 of 1
          </div>
        </div>
      </div>
    </div>
  );
};

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

const getNetDueAmount = (customer: Customer): number => {
  const outstanding = toSafeNumber(customer.outstanding_balance);
  const advance = toSafeNumber(customer.advance_balance);
  if (outstanding > 0) return outstanding;
  if (advance > 0) return -advance;
  return 0;
};

export default function CustomersPage() {
  const { company } = useAuth();
  const [data, setData] = useState<CustomerListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  
  // UI state
  const [showFilters, setShowFilters] = useState(false);
  const [showColumnDropdown, setShowColumnDropdown] = useState(false);
  const [activeActionMenu, setActiveActionMenu] = useState<string | null>(null);
  const [showPrintView, setShowPrintView] = useState(false);
  const [customersToPrint, setCustomersToPrint] = useState<Customer[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Export loading states
  const [copyLoading, setCopyLoading] = useState(false);
  const [excelLoading, setExcelLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [csvLoading, setCsvLoading] = useState(false);
  const [printLoading, setPrintLoading] = useState(false);

  const [cachedExportData, setCachedExportData] = useState<Customer[] | null>(null);

  // Column visibility state - match employees list pattern
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

  const companyId = company?.id || (typeof window !== "undefined" ? localStorage.getItem("company_id") : null);

  useEffect(() => {
    if (companyId) {
      fetchCustomers();
    }
  }, [companyId]);

  useEffect(() => {
    if (companyId) {
      fetchCustomers();
      setCachedExportData(null);
    }
  }, [page, search, typeFilter, statusFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, typeFilter, search]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element | null;
      if (!target) return;
      if (!target.closest(".action-dropdown-container")) {
        setActiveActionMenu(null);
      }
      if (!target.closest(".column-dropdown-container")) {
        setShowColumnDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const fetchCustomers = async () => {
    if (!companyId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const result = await customersApi.list(companyId, {
        page,
        page_size: pageSize,
        search: search || undefined,
        customer_type: typeFilter || undefined,
      });
      setData(result);
    } catch (err) {
      console.error("Failed to fetch customers:", err);
      setError("Failed to load customers");
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllCustomersForExport = useCallback(async (): Promise<Customer[]> => {
    if (!companyId) return [];

    try {
      const result = await customersApi.list(companyId, {
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
  }, [companyId, search, typeFilter]);

  const getExportData = async (): Promise<Customer[]> => {
    if (cachedExportData) return cachedExportData;
    return await fetchAllCustomersForExport();
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchCustomers();
  };

  const handleReset = () => {
    setSearch("");
    setTypeFilter("");
    setStatusFilter("");
    setPage(1);
  };

  const getStatusColor = (outstanding: number, creditLimit: number, advance: number = 0) => {
    if (outstanding > creditLimit) return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
    if (outstanding > 0) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
    if (advance > 0) return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
    return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
  };

  const getStatusText = (outstanding: number, creditLimit: number, advance: number = 0) => {
    if (outstanding > creditLimit) return 'Overdue';
    if (outstanding > 0) return 'Pending';
    if (advance > 0) return 'Advance';
    return 'Paid';
  };

  const getStatusBadge = (outstanding: number, creditLimit: number, advance: number = 0) => {
    const text = getStatusText(outstanding, creditLimit, advance);
    const colorClass = getStatusColor(outstanding, creditLimit, advance);

    let icon = null;
    if (outstanding > creditLimit) {
      icon = <AlertCircle className="w-3 h-3 mr-1" />;
    } else if (outstanding > 0) {
      icon = <Clock className="w-3 h-3 mr-1" />;
    } else if (advance > 0) {
      icon = <CreditCard className="w-3 h-3 mr-1" />;
    } else {
      icon = <CheckCircle className="w-3 h-3 mr-1" />;
    }

    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colorClass}`}>
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
    
    let colorClass = "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
    switch (type) {
      case "b2b": colorClass = "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"; break;
      case "b2c": colorClass = "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400"; break;
      case "export": colorClass = "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"; break;
      case "sez": colorClass = "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400"; break;
    }

    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colorClass}`}>
        {label}
      </span>
    );
  };

  const applyStatusFilter = (customers: Customer[]): Customer[] => {
    if (!statusFilter) return customers;
    return customers.filter((c) => {
      const status = getStatusText(
        toSafeNumber(c.outstanding_balance),
        toSafeNumber(c.credit_limit),
        toSafeNumber(c.advance_balance),
      ).toLowerCase();
      return status === statusFilter.toLowerCase();
    });
  };

  const filteredCustomers = applyStatusFilter(data?.customers || []);
  const summaryCustomers = applyStatusFilter(cachedExportData || data?.customers || []);

  const totalPages = data ? Math.ceil((statusFilter ? filteredCustomers.length : data.total) / pageSize) : 0;
  const pagedCustomers = filteredCustomers.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );
  const totalOutstandingLabelColSpan =
    1 +
    [
      visibleColumns.customerId,
      visibleColumns.name,
      visibleColumns.contact,
      visibleColumns.email,
      visibleColumns.gstin,
      visibleColumns.type,
    ].filter(Boolean).length;

  // Export functions - matching employees list pattern
  const copyToClipboard = async () => {
    if (copyLoading) return;
    setCopyLoading(true);
    try {
      const customers = await getExportData();
      const filtered = applyStatusFilter(customers);

      const headers: string[] = [];
      const rows = filtered.map(c => {
        const row: string[] = [];

        if (visibleColumns.customerId) {
          if (!headers.includes("Customer ID")) headers.push("Customer ID");
          row.push(c.customer_code || "N/A");
        }

        if (visibleColumns.name) {
          if (!headers.includes("Name")) headers.push("Name");
          row.push(c.name);
        }

        if (visibleColumns.contact) {
          if (!headers.includes("Contact")) headers.push("Contact");
          row.push(c.mobile || c.contact || "-");
        }

        if (visibleColumns.email) {
          if (!headers.includes("Email")) headers.push("Email");
          row.push(c.email || "-");
        }

        if (visibleColumns.gstin) {
          if (!headers.includes("GSTIN")) headers.push("GSTIN");
          row.push(c.tax_number || c.gstin || "-");
        }

        if (visibleColumns.type) {
          if (!headers.includes("Type")) headers.push("Type");
          row.push(getTypeLabel(c.customer_type || ""));
        }

        if (visibleColumns.dueAmount) {
          if (!headers.includes("Due Amount")) headers.push("Due Amount");
          row.push(formatCurrency(getNetDueAmount(c)));
        }

        if (visibleColumns.creditLimit) {
          if (!headers.includes("Credit Limit")) headers.push("Credit Limit");
          row.push(formatCurrency(toSafeNumber(c.credit_limit)));
        }

        if (visibleColumns.status) {
          if (!headers.includes("Status")) headers.push("Status");
          row.push(getStatusText(
            toSafeNumber(c.outstanding_balance),
            toSafeNumber(c.credit_limit),
            toSafeNumber(c.advance_balance),
          ));
        }

        return row;
      });

      const text = [headers.join("\t"), ...rows.map(r => r.join("\t"))].join("\n");
      await navigator.clipboard.writeText(text);
      alert(`Copied ${filtered.length} customers to clipboard`);
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
        "Trade Name": c.trade_name || "-",
        "Contact": c.mobile || c.contact || "-",
        "Email": c.email || "-",
        "GSTIN": c.tax_number || c.gstin || "-",
        "Type": getTypeLabel(c.customer_type || ""),
        "Due Amount": getNetDueAmount(c),
        "Credit Limit": toSafeNumber(c.credit_limit),
        "Status": getStatusText(
          toSafeNumber(c.outstanding_balance),
          toSafeNumber(c.credit_limit),
          toSafeNumber(c.advance_balance),
        ),
        "State": c.state || "-",
        "City": c.city || "-",
        "Address": c.billing_address || c.location_address || c.shipping_address || "-",
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
      const doc = new jsPDF("landscape");

      const headers: string[] = [];
      const body = filtered.map(c => {
        const row: string[] = [];

        if (visibleColumns.customerId) {
          if (!headers.includes("Customer ID")) headers.push("Customer ID");
          row.push(c.customer_code || "N/A");
        }

        if (visibleColumns.name) {
          if (!headers.includes("Name")) headers.push("Name");
          row.push(c.name);
        }

        if (visibleColumns.type) {
          if (!headers.includes("Type")) headers.push("Type");
          row.push(getTypeLabel(c.customer_type || ""));
        }

        if (visibleColumns.dueAmount) {
          if (!headers.includes("Due Amount")) headers.push("Due Amount");
          row.push(formatCurrency(getNetDueAmount(c)));
        }

        if (visibleColumns.creditLimit) {
          if (!headers.includes("Credit Limit")) headers.push("Credit Limit");
          row.push(formatCurrency(toSafeNumber(c.credit_limit)));
        }

        if (visibleColumns.status) {
          if (!headers.includes("Status")) headers.push("Status");
          row.push(getStatusText(
            toSafeNumber(c.outstanding_balance),
            toSafeNumber(c.credit_limit),
            toSafeNumber(c.advance_balance),
          ));
        }

        return row;
      });

      autoTable(doc, {
        ...getProfessionalTableTheme(doc, "Customers List", company?.name || "", "l"),
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
        "Contact": c.mobile || c.contact || "-",
        "Email": c.email || "-",
        "GSTIN": c.tax_number || c.gstin || "-",
        "Type": getTypeLabel(c.customer_type || ""),
        "Due Amount": getNetDueAmount(c),
        "Credit Limit": toSafeNumber(c.credit_limit),
        "Status": getStatusText(
          toSafeNumber(c.outstanding_balance),
          toSafeNumber(c.credit_limit),
          toSafeNumber(c.advance_balance),
        ),
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

  const handlePrint = async () => {
    if (printLoading) return;
    setPrintLoading(true);
    try {
      const customers = await getExportData();
      const filtered = applyStatusFilter(customers);
      setCustomersToPrint(filtered);
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

  const handleDelete = async (customerId: string) => {
    if (!companyId || !confirm("Are you sure you want to delete this customer?")) return;
    try {
      await customersApi.delete(companyId, customerId);
      fetchCustomers();
    } catch (error) {
      console.error("Failed to delete customer:", error);
      alert("Failed to delete customer. Please try again.");
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
          onComplete={() => setShowPrintView(false)}
          customers={customersToPrint}
          visibleColumns={visibleColumns}
          formatCurrency={formatCurrency}
          getTypeLabel={getTypeLabel}
          getStatusText={getStatusText}
          getStatusColor={getStatusColor}
          companyName={company?.name || ''}
        />
      )}

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
            className="px-4 py-2 transition bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Add Customer
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="px-6 py-6 bg-gray-50 dark:bg-gray-900">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                  {formatCurrency(summaryCustomers.reduce((sum, customer) => sum + toSafeNumber(customer.outstanding_balance), 0))}
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

          {/* Active Customers */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-green-600">
                  {summaryCustomers.filter((c) => toSafeNumber(c.outstanding_balance) <= toSafeNumber(c.credit_limit)).length}
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

      {/* Filters Section */}
      <div className="px-6 py-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by name, email, phone, GSTIN..."
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
            {/* Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Customer Type
              </label>
              <select
                value={typeFilter}
                onChange={(e) => {
                  setTypeFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="">All Types</option>
                <option value="b2b">Business (B2B)</option>
                <option value="b2c">Consumer (B2C)</option>
                <option value="export">Export</option>
                <option value="sez">SEZ</option>
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Payment Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="">All Status</option>
                <option value="paid">Paid</option>
                <option value="pending">Pending</option>
                <option value="overdue">Overdue</option>
                <option value="advance">Advance</option>
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
                {visibleColumns.customerId && (
                  <th className="text-left px-3 py-3">
                    Customer ID
                  </th>
                )}
                {visibleColumns.name && (
                  <th className="text-left px-3 py-3">
                    Name
                  </th>
                )}
                {visibleColumns.contact && (
                  <th className="text-left px-3 py-3">
                    Contact
                  </th>
                )}
                {visibleColumns.email && (
                  <th className="text-left px-3 py-3">
                    Email
                  </th>
                )}
                {visibleColumns.gstin && (
                  <th className="text-left px-3 py-3">
                    GSTIN
                  </th>
                )}
                {visibleColumns.type && (
                  <th className="text-left px-3 py-3">
                    Type
                  </th>
                )}
                {visibleColumns.dueAmount && (
                  <th className="text-left px-3 py-3">
                    Due Amount
                  </th>
                )}
                {visibleColumns.creditLimit && (
                  <th className="text-left px-3 py-3">
                    Credit Limit
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
              ) : filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={Object.values(visibleColumns).filter(Boolean).length + 1} className="px-6 py-8 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <Users className="w-12 h-12 text-gray-400 mb-2" />
                      <p className="text-lg font-medium text-gray-900 dark:text-white mb-1">
                        No customers found
                      </p>
                      <p className="text-gray-500 dark:text-gray-400 mb-4">
                        {statusFilter || search || typeFilter ?
                          "No customers found matching your filters. Try adjusting your search criteria." :
                          "Add your first customer to start managing."}
                      </p>
                      <button
                        onClick={() => window.location.href = '/customers/new'}
                        className="text-indigo-600 hover:underline dark:text-indigo-400"
                      >
                        Add your first customer
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                pagedCustomers.map((customer, index) => {
                  const outstanding = toSafeNumber(customer.outstanding_balance);
                  const advance = toSafeNumber(customer.advance_balance);
                  const creditLimit = toSafeNumber(customer.credit_limit);
                  const netDue = getNetDueAmount(customer);
                  const isOverdue = outstanding > creditLimit;
                  
                  return (
                    <tr
                      key={customer.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <td className="px-3 py-4 align-top break-words text-gray-700 dark:text-gray-300">
                        {(currentPage - 1) * pageSize + index + 1}
                      </td>
                      {visibleColumns.customerId && (
                        <td className="px-3 py-4 align-top break-words">
                          <div className="font-medium text-gray-900 dark:text-white">
                            {customer.customer_code || 'N/A'}
                          </div>
                        </td>
                      )}
                      {visibleColumns.name && (
                        <td className="px-3 py-4 align-top break-words">
                          <div className="min-w-0 max-w-[240px]">
                            <div className="font-medium text-gray-900 dark:text-white truncate">
                              {customer.name}
                            </div>
                            {customer.trade_name && (
                              <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                {customer.trade_name}
                              </div>
                            )}
                            {(customer.city || customer.state) && (
                              <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                {[customer.city, customer.state].filter(Boolean).join(', ')}
                              </div>
                            )}
                          </div>
                        </td>
                      )}
                      {visibleColumns.contact && (
                        <td className="px-3 py-4 align-top break-words">
                          <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                            <Phone className="w-4 h-4 flex-shrink-0" />
                            <span>{customer.mobile || customer.contact || '-'}</span>
                          </div>
                        </td>
                      )}
                      {visibleColumns.email && (
                        <td className="px-3 py-4 align-top break-words">
                          <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                            <Mail className="w-4 h-4 flex-shrink-0" />
                            <span className="truncate max-w-[180px]">{customer.email || '-'}</span>
                          </div>
                        </td>
                      )}
                      {visibleColumns.gstin && (
                        <td className="px-3 py-4 align-top break-words text-gray-700 dark:text-gray-300">
                          {customer.tax_number || customer.gstin || '-'}
                        </td>
                      )}
                      {visibleColumns.type && (
                        <td className="px-3 py-4 align-top break-words">
                          {getTypeBadge(customer.customer_type || '')}
                        </td>
                      )}
                      {visibleColumns.dueAmount && (
                        <td className="px-3 py-4 align-top break-words">
                          <div className={`font-medium ${isOverdue ? 'text-red-600' : netDue < 0 ? 'text-green-600' : 'text-gray-900 dark:text-white'}`}>
                            {formatCurrency(netDue)}
                          </div>
                        </td>
                      )}
                      {visibleColumns.creditLimit && (
                        <td className="px-3 py-4 align-top break-words text-gray-700 dark:text-gray-300">
                          {formatCurrency(creditLimit)}
                        </td>
                      )}
                      {visibleColumns.status && (
                        <td className="w-[96px] min-w-[96px] max-w-[96px] px-2 py-4 align-top">
                          {getStatusBadge(outstanding, creditLimit, advance)}
                        </td>
                      )}
                      {visibleColumns.actions && (
                        <td className="w-[52px] min-w-[52px] max-w-[52px] px-1 py-4 text-center align-top">
                          <div className="relative action-dropdown-container inline-flex justify-center w-full">
                            <button
                              onClick={() =>
                                setActiveActionMenu(
                                  activeActionMenu === customer.id ? null : customer.id
                                )
                              }
                              className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-50 dark:hover:text-gray-300 dark:hover:bg-gray-700/50 transition-all duration-200"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>

                            {activeActionMenu === customer.id && (
                              <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg shadow-xl py-1 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                                <Link
                                  href={`/customers/${customer.id}`}
                                  onClick={() => setActiveActionMenu(null)}
                                  className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                                >
                                  <Eye className="w-4 h-4 text-gray-400" />
                                  <span>View Details</span>
                                </Link>

                                <Link
                                  href={`/customers/${customer.id}/edit`}
                                  onClick={() => setActiveActionMenu(null)}
                                  className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                                >
                                  <Edit className="w-4 h-4 text-gray-400" />
                                  <span>Edit</span>
                                </Link>

                                <Link
                                  href={`/customers/${customer.id}/advance`}
                                  onClick={() => setActiveActionMenu(null)}
                                  className="flex items-center gap-3 px-3 py-2 text-sm text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 transition-colors"
                                >
                                  <CreditCard className="w-4 h-4" />
                                  <span>Advance Payments</span>
                                </Link>

                                <Link
                                  href={`/customers/${customer.id}/payments`}
                                  onClick={() => setActiveActionMenu(null)}
                                  className="flex items-center gap-3 px-3 py-2 text-sm text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/30 transition-colors"
                                >
                                  <Eye className="w-4 h-4" />
                                  <span>View Payments</span>
                                </Link>

                                <Link
                                  href={`/customers/${customer.id}/receive-due`}
                                  onClick={() => setActiveActionMenu(null)}
                                  className="flex items-center gap-3 px-3 py-2 text-sm text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/30 transition-colors"
                                >
                                  <Download className="w-4 h-4" />
                                  <span>Receive Due</span>
                                </Link>

                                <div className="my-1 border-t border-gray-100 dark:border-gray-700"></div>
                                <button
                                  onClick={() => {
                                    if (confirm("Are you sure you want to delete this customer?")) {
                                      handleDelete(customer.id);
                                      setActiveActionMenu(null);
                                    }
                                  }}
                                  className="flex w-full items-center gap-3 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  <span>Delete Customer</span>
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
            {filteredCustomers.length > 0 && visibleColumns.dueAmount && (
              <tfoot className="bg-gray-50 dark:bg-gray-800/50">
                <tr className="border-t border-gray-200 dark:border-gray-700">
                  <td
                    colSpan={totalOutstandingLabelColSpan}
                    className="px-3 py-4 text-right font-semibold text-gray-900 dark:text-white whitespace-nowrap"
                  >
                    Total Outstanding:
                  </td>
                  {visibleColumns.dueAmount && (
                    <td className="px-3 py-4 font-bold text-gray-900 dark:text-white whitespace-nowrap">
                      {formatCurrency(pagedCustomers.reduce((sum, customer) => sum + toSafeNumber(customer.outstanding_balance), 0))}
                    </td>
                  )}
                  {visibleColumns.creditLimit && (
                    <td className="px-3 py-4"></td>
                  )}
                  {visibleColumns.status && (
                    <td className="px-2 py-4"></td>
                  )}
                  {visibleColumns.actions && (
                    <td className="px-1 py-4"></td>
                  )}
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Pagination */}
      {!loading && filteredCustomers.length > 0 && (
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, filteredCustomers.length)} of {filteredCustomers.length} customers
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
              Page {currentPage} of {Math.max(1, Math.ceil(filteredCustomers.length / pageSize))}
            </div>
            <button
              onClick={() => setCurrentPage((p) => Math.min(Math.ceil(filteredCustomers.length / pageSize), p + 1))}
              disabled={currentPage === Math.ceil(filteredCustomers.length / pageSize)}
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
