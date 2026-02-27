"use client";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { ordersApi, payrollApi, SalesOrder, OrderStatus } from "@/services/api";
import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { saveAs } from "file-saver";
import { addPdfPageNumbers, getProfessionalTableTheme } from "@/utils/pdfTheme";
import {
  Search,
  Filter,
  Download,
  Plus,
  FileText,
  Calendar,
  DollarSign,
  CreditCard,
  AlertCircle,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  Printer,
  Clock,
  CheckCircle,
  XCircle,
  ShoppingBag,
  Users,
  Copy,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Hash,
  MapPin,
  Package,
  TrendingUp,
  Receipt,
  FilePlus,
  FileDown,
  Truck,
  Archive,
  Shield,
} from "lucide-react";

// Local formatter functions
const formatCurrency = (amount: number | undefined): string => {
  if (amount === undefined || amount === null || isNaN(amount)) return '₹0';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

const formatDate = (dateString: Date | string | null | undefined): string => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

// Print component for sales orders - Matching pattern
const PrintView = ({
  orders,
  visibleColumns,
  formatCurrency,
  formatDate,
  getStatusText,
  getCustomerDisplayName,
  getCustomerGSTIN,
  getSalesPersonName,
  getExpiryDate,
  companyName,
  onComplete,
}: {
  orders: ExtendedSalesOrder[];
  visibleColumns: Record<string, boolean>;
  formatCurrency: (amount: number | undefined) => string;
  formatDate: (dateString: Date | string | null | undefined) => string;
  getStatusText: (status: string) => string;
  getCustomerDisplayName: (order: ExtendedSalesOrder) => string;
  getCustomerGSTIN: (order: ExtendedSalesOrder) => string;
  getSalesPersonName: (order: ExtendedSalesOrder) => string;
  getExpiryDate: (order: ExtendedSalesOrder) => string | null;
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
            Sales Orders List
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
              {visibleColumns.orderNumber && (
                <th style={{
                  padding: '12px',
                  textAlign: 'left',
                  borderRight: '1px solid #ddd',
                  fontWeight: 'bold'
                }}>
                  Order #
                </th>
              )}
              {visibleColumns.orderDate && (
                <th style={{
                  padding: '12px',
                  textAlign: 'left',
                  borderRight: '1px solid #ddd',
                  fontWeight: 'bold'
                }}>
                  Date
                </th>
              )}
              {visibleColumns.status && (
                <th style={{
                  padding: '12px',
                  textAlign: 'left',
                  borderRight: '1px solid #ddd',
                  fontWeight: 'bold'
                }}>
                  Status
                </th>
              )}
              {visibleColumns.expiryDate && (
                <th style={{
                  padding: '12px',
                  textAlign: 'left',
                  borderRight: '1px solid #ddd',
                  fontWeight: 'bold'
                }}>
                  Expiry Date
                </th>
              )}
              {visibleColumns.referenceNo && (
                <th style={{
                  padding: '12px',
                  textAlign: 'left',
                  borderRight: '1px solid #ddd',
                  fontWeight: 'bold'
                }}>
                  Reference No
                </th>
              )}
              {visibleColumns.customerName && (
                <th style={{
                  padding: '12px',
                  textAlign: 'left',
                  borderRight: '1px solid #ddd',
                  fontWeight: 'bold'
                }}>
                  Customer Name
                </th>
              )}
              {visibleColumns.total && (
                <th style={{
                  padding: '12px',
                  textAlign: 'left',
                  borderRight: '1px solid #ddd',
                  fontWeight: 'bold'
                }}>
                  Total
                </th>
              )}
              {visibleColumns.salesman && (
                <th style={{
                  padding: '12px',
                  textAlign: 'left',
                  fontWeight: 'bold'
                }}>
                  Salesman
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {orders.map((order, index) => {
              const expiryDate = getExpiryDate(order);
              const isExpired = expiryDate ? new Date(expiryDate) < new Date() : false;
              
              return (
                <tr key={order.id} style={{
                  borderBottom: '1px solid #ddd',
                  backgroundColor: index % 2 === 0 ? '#fff' : '#f9f9f9'
                }}>
                  <td style={{
                    padding: '12px',
                    borderRight: '1px solid #ddd'
                  }}>
                    {index + 1}
                  </td>
                  {visibleColumns.orderNumber && (
                    <td style={{
                      padding: '12px',
                      borderRight: '1px solid #ddd'
                    }}>
                      <div>
                        <strong>{order.order_number || 'N/A'}</strong>
                      </div>
                    </td>
                  )}
                  {visibleColumns.orderDate && (
                    <td style={{
                      padding: '12px',
                      borderRight: '1px solid #ddd'
                    }}>
                      {formatDate(order.order_date)}
                    </td>
                  )}
                  {visibleColumns.status && (
                    <td style={{
                      padding: '12px',
                      borderRight: '1px solid #ddd'
                    }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '4px 8px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        backgroundColor: 
                          order.status === 'completed' ? '#d1fae5' :
                          order.status === 'confirmed' ? '#dbeafe' :
                          order.status === 'processing' ? '#fef3c7' :
                          order.status === 'partially_delivered' ? '#fde68a' :
                          order.status === 'cancelled' ? '#fee2e2' :
                          '#f3f4f6',
                        color:
                          order.status === 'completed' ? '#065f46' :
                          order.status === 'confirmed' ? '#1e40af' :
                          order.status === 'processing' ? '#92400e' :
                          order.status === 'partially_delivered' ? '#92400e' :
                          order.status === 'cancelled' ? '#991b1b' :
                          '#374151'
                      }}>
                        {getStatusText(order.status)}
                      </span>
                    </td>
                  )}
                  {visibleColumns.expiryDate && (
                    <td style={{
                      padding: '12px',
                      borderRight: '1px solid #ddd',
                      color: isExpired ? '#dc2626' : '#666'
                    }}>
                      {formatDate(expiryDate) || '-'}
                    </td>
                  )}
                  {visibleColumns.referenceNo && (
                    <td style={{
                      padding: '12px',
                      borderRight: '1px solid #ddd'
                    }}>
                      {order.reference_no || '-'}
                    </td>
                  )}
                  {visibleColumns.customerName && (
                    <td style={{
                      padding: '12px',
                      borderRight: '1px solid #ddd'
                    }}>
                      <div>
                        <strong>{getCustomerDisplayName(order)}</strong>
                        {getCustomerGSTIN(order) && (
                          <div style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>
                            GSTIN: {getCustomerGSTIN(order)}
                          </div>
                        )}
                      </div>
                    </td>
                  )}
                  {visibleColumns.total && (
                    <td style={{
                      padding: '12px',
                      borderRight: '1px solid #ddd',
                      fontWeight: 'bold'
                    }}>
                      {formatCurrency(order.total_amount)}
                    </td>
                  )}
                  {visibleColumns.salesman && (
                    <td style={{ padding: '12px' }}>
                      {getSalesPersonName(order)}
                    </td>
                  )}
                </tr>
              );
            })}
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
            Total Orders: {orders.length}
          </div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            Page 1 of 1
          </div>
        </div>
      </div>
    </div>
  );
};

// Type extension for missing properties
type SalesOrderStatus = OrderStatus | "processing" | "partially_delivered";

interface ExtendedSalesOrder extends Omit<SalesOrder, 'customer' | 'items'> {
  reference_no?: string;
  sales_person_name?: string;
  expire_date?: string;
  expected_delivery_date?: string;
  customer_gstin?: string;
  payment_terms?: string;
  customer_name?: string;
  customer_id?: string;
  sales_person_id?: string;
  subtotal: number;
  status: SalesOrderStatus;
  customer?: {
    id?: string;
    name?: string;
    gstin?: string;
  };
}

interface SalesOrderResponse {
  orders: ExtendedSalesOrder[];
  total: number;
  page: number;
  page_size: number;
  total_amount: number;
  total_orders: number;
  draft_orders: number;
  confirmed_orders: number;
}

type EmployeeMap = Record<string, string>;

export default function SalesOrdersPage() {
  const router = useRouter();
  const { company } = useAuth();
  const [orders, setOrders] = useState<ExtendedSalesOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Filters state
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [customerFilter, setCustomerFilter] = useState<string>("");
  
  // UI state
  const [showFilters, setShowFilters] = useState(false);
  const [showColumnDropdown, setShowColumnDropdown] = useState(false);
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
  const [activeActionMenu, setActiveActionMenu] = useState<string | null>(null);
  const [showPrintView, setShowPrintView] = useState(false);
  const [ordersToPrint, setOrdersToPrint] = useState<ExtendedSalesOrder[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  
  // Export loading states
  const [copyLoading, setCopyLoading] = useState(false);
  const [excelLoading, setExcelLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [csvLoading, setCsvLoading] = useState(false);
  const [printLoading, setPrintLoading] = useState(false);
  
  // Other states
  const [employeeNameById, setEmployeeNameById] = useState<EmployeeMap>({});
  const [convertingOrderId, setConvertingOrderId] = useState<string | null>(null);
  
  // Summary data
  const [summary, setSummary] = useState({
    total_amount: 0,
    total_orders: 0,
    draft_orders: 0,
    confirmed_orders: 0
  });
  
  // Column visibility - matching pattern
  const [visibleColumns, setVisibleColumns] = useState({
    orderNumber: true,
    orderDate: true,
    status: true,
    expiryDate: true,
    referenceNo: true,
    customerName: true,
    total: true,
    salesman: true,
    actions: true,
  });

  const companyId = company?.id || (typeof window !== "undefined" ? localStorage.getItem("company_id") : null);

  useEffect(() => {
    if (companyId) {
      fetchOrders();
      fetchEmployees();
    }
  }, [companyId, currentPage, search, statusFilter, customerFilter, fromDate, toDate]);

  const fetchEmployees = async () => {
    if (!company?.id) return;
    try {
      const employees = await payrollApi.listEmployees(company.id);
      const map: EmployeeMap = {};
      employees.forEach((emp: any) => {
        if (emp?.id) {
          const name =
            emp.full_name ||
            [emp.first_name, emp.last_name].filter(Boolean).join(" ").trim();
          if (name) {
            map[emp.id] = name;
          }
        }
      });
      setEmployeeNameById(map);
    } catch (error) {
      console.error("Failed to fetch employees for sales person lookup:", error);
    }
  };

  const fetchOrders = async () => {
    try {
      setLoading(true);
      if (!company?.id) {
        setLoading(false);
        return;
      }

      const params = {
        page: currentPage,
        page_size: pageSize,
        status: statusFilter || undefined,
        search: search || undefined,
        from_date: fromDate || undefined,
        to_date: toDate || undefined,
        customer_id: customerFilter || undefined,
      };
      const result = await ordersApi.listSalesOrders(company.id, params as any) as any;

      // Handle both response formats
      let ordersData: ExtendedSalesOrder[] = [];
      let totalAmount = 0;

      if (Array.isArray(result)) {
        ordersData = result as ExtendedSalesOrder[];
        totalAmount = ordersData.reduce((sum, order) => sum + (order.total_amount || 0), 0);
      } else if (result && result.orders) {
        ordersData = result.orders || [];
        totalAmount = result.total_amount || ordersData.reduce((sum, order) => sum + (order.total_amount || 0), 0);
      }

      setOrders(ordersData);

      // Calculate summary
      const draftOrders = ordersData.filter(order => order.status === 'draft').length;
      const confirmedOrders = ordersData.filter(order => order.status === 'confirmed').length;

      setSummary({
        total_amount: totalAmount,
        total_orders: ordersData.length,
        draft_orders: draftOrders,
        confirmed_orders: confirmedOrders
      });
      setError("");
    } catch (err) {
      setError("Failed to load sales orders");
      console.error(err);
      setOrders([]);
      setSummary({
        total_amount: 0,
        total_orders: 0,
        draft_orders: 0,
        confirmed_orders: 0
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAllOrdersForExport = async (): Promise<ExtendedSalesOrder[]> => {
    try {
      if (!company?.id) return [];

      const pageSize = 100;
      let pageNum = 1;
      let allOrders: ExtendedSalesOrder[] = [];
      while (true) {
        const params = {
          page: pageNum,
          page_size: pageSize,
          status: statusFilter || undefined,
          search: search || undefined,
          from_date: fromDate || undefined,
          to_date: toDate || undefined,
          customer_id: customerFilter || undefined,
        };
        const result = await ordersApi.listSalesOrders(company.id, params as any) as any;

        const batch: ExtendedSalesOrder[] = Array.isArray(result)
          ? (result as ExtendedSalesOrder[])
          : (result?.orders || []);
        
        allOrders = allOrders.concat(batch);
        if (batch.length < pageSize) break;
        pageNum += 1;
      }

      return allOrders;
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
    setStatusFilter("");
    setCustomerFilter("");
    setFromDate("");
    setToDate("");
    setCurrentPage(1);
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "draft":
        return "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400";
      case "confirmed":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
      case "processing":
        return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";
      case "completed":
        return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
      case "cancelled":
        return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
      case "partially_delivered":
        return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400";
      default:
        return "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400";
    }
  };

  const getStatusText = (status: string) => {
    return status.replace("_", " ");
  };

  const filteredOrders = orders || [];
  const totalPages = Math.max(1, Math.ceil(summary.total_orders / pageSize));

  // Helper functions
  const getCustomerDisplayName = (order: ExtendedSalesOrder): string => {
    return order.customer_name || order.customer?.name || 'Walk-in Customer';
  };

  const getCustomerGSTIN = (order: ExtendedSalesOrder): string => {
    return order.customer_gstin || order.customer?.gstin || '';
  };

  const getSalesPersonName = (order: ExtendedSalesOrder): string => {
    if (order.sales_person_name) return order.sales_person_name;
    if (order.sales_person_id && employeeNameById[order.sales_person_id]) {
      return employeeNameById[order.sales_person_id];
    }
    return order.sales_person_id || "-";
  };

  const getExpiryDate = (order: ExtendedSalesOrder): string | null => {
    return order.expire_date || order.expected_delivery_date || null;
  };

  const getReferenceNo = (order: ExtendedSalesOrder): string => {
    return order.reference_no || '-';
  };

  const getSubtotal = (order: ExtendedSalesOrder): number => {
    return order.subtotal || order.total_amount || 0;
  };

  const getDaysUntilExpiry = (expiryDate?: string | Date | null): number => {
    if (!expiryDate) return 0;
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getExpiryStatus = (order: ExtendedSalesOrder): string => {
    const expiryDate = getExpiryDate(order);
    if (!expiryDate) return '';

    const daysUntilExpiry = getDaysUntilExpiry(expiryDate);

    if (daysUntilExpiry < 0) {
      return `Expired ${Math.abs(daysUntilExpiry)} day${Math.abs(daysUntilExpiry) !== 1 ? 's' : ''} ago`;
    } else if (daysUntilExpiry <= 7) {
      return `Expires in ${daysUntilExpiry} day${daysUntilExpiry !== 1 ? 's' : ''}`;
    }
    return '';
  };

  // Export functions - matching pattern
  const copyToClipboard = async () => {
    if (copyLoading) return;
    setCopyLoading(true);
    try {
      const allOrders = await fetchAllOrdersForExport();
      
      const headers: string[] = ["S.No"];
      const rows = allOrders.map((order, index) => {
        const row: string[] = [(index + 1).toString()];

        if (visibleColumns.orderNumber) {
          if (!headers.includes("Order #")) headers.push("Order #");
          row.push(order.order_number || '-');
        }

        if (visibleColumns.orderDate) {
          if (!headers.includes("Date")) headers.push("Date");
          row.push(formatDate(order.order_date));
        }

        if (visibleColumns.status) {
          if (!headers.includes("Status")) headers.push("Status");
          row.push(getStatusText(order.status));
        }

        if (visibleColumns.expiryDate) {
          if (!headers.includes("Expiry Date")) headers.push("Expiry Date");
          row.push(formatDate(getExpiryDate(order)) || "-");
        }

        if (visibleColumns.referenceNo) {
          if (!headers.includes("Reference No")) headers.push("Reference No");
          row.push(getReferenceNo(order));
        }

        if (visibleColumns.customerName) {
          if (!headers.includes("Customer Name")) headers.push("Customer Name");
          row.push(getCustomerDisplayName(order));
        }

        if (visibleColumns.total) {
          if (!headers.includes("Total")) headers.push("Total");
          row.push(formatCurrency(order.total_amount).replace('₹', 'Rs. '));
        }

        if (visibleColumns.salesman) {
          if (!headers.includes("Salesman")) headers.push("Salesman");
          row.push(getSalesPersonName(order));
        }

        return row;
      });

      // Add S.No to headers
      headers.unshift("S.No");
      
      const text = [headers.join("\t"), ...rows.map(r => r.join("\t"))].join("\n");
      await navigator.clipboard.writeText(text);
      alert("Sales orders data copied to clipboard");
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
      const allOrders = await fetchAllOrdersForExport();
      
      const exportData = allOrders.map((order, index) => {
        const row: Record<string, any> = {
          "S.No": index + 1,
        };

        if (visibleColumns.orderNumber) {
          row["Order Number"] = order.order_number || '-';
        }

        if (visibleColumns.orderDate) {
          row["Order Date"] = formatDate(order.order_date);
        }

        if (visibleColumns.status) {
          row["Status"] = getStatusText(order.status);
        }

        if (visibleColumns.expiryDate) {
          row["Expiry Date"] = formatDate(getExpiryDate(order));
          row["Days Until Expiry"] = getDaysUntilExpiry(getExpiryDate(order));
        }

        if (visibleColumns.referenceNo) {
          row["Reference No"] = getReferenceNo(order);
        }

        if (visibleColumns.customerName) {
          row["Customer Name"] = getCustomerDisplayName(order);
          row["Customer GSTIN"] = getCustomerGSTIN(order);
        }

        if (visibleColumns.total) {
          row["Total Amount"] = order.total_amount || 0;
          row["Subtotal"] = getSubtotal(order);
        }

        if (visibleColumns.salesman) {
          row["Sales Person"] = getSalesPersonName(order);
        }

        row["Payment Terms"] = order.payment_terms || '-';
        row["Company"] = company?.name || "";
        
        return row;
      });

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Sales Orders");
      XLSX.writeFile(wb, "sales-orders.xlsx");
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
      const allOrders = await fetchAllOrdersForExport();
      
      const doc = new jsPDF("landscape");
      
      const headers: string[] = ["S.No"];
      const body = allOrders.map((order, index) => {
        const row: string[] = [(index + 1).toString()];

        if (visibleColumns.orderNumber) {
          if (!headers.includes("Order #")) headers.push("Order #");
          row.push(order.order_number || '-');
        }

        if (visibleColumns.orderDate) {
          if (!headers.includes("Date")) headers.push("Date");
          row.push(formatDate(order.order_date));
        }

        if (visibleColumns.status) {
          if (!headers.includes("Status")) headers.push("Status");
          row.push(getStatusText(order.status));
        }

        if (visibleColumns.expiryDate) {
          if (!headers.includes("Expiry Date")) headers.push("Expiry Date");
          row.push(formatDate(getExpiryDate(order)) || "-");
        }

        if (visibleColumns.customerName) {
          if (!headers.includes("Customer Name")) headers.push("Customer Name");
          row.push(getCustomerDisplayName(order));
        }

        if (visibleColumns.total) {
          if (!headers.includes("Total")) headers.push("Total");
          row.push(`Rs. ${new Intl.NumberFormat("en-IN", {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          }).format(order.total_amount || 0)}`);
        }

        if (visibleColumns.salesman) {
          if (!headers.includes("Salesman")) headers.push("Salesman");
          row.push(getSalesPersonName(order));
        }

        return row;
      });

      autoTable(doc, {
        ...getProfessionalTableTheme(doc, "Sales Orders List", company?.name || "", "l"),
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
      doc.save("sales-orders.pdf");
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
      const allOrders = await fetchAllOrdersForExport();
      
      const exportData = allOrders.map((order, index) => {
        const row: Record<string, any> = {
          "S.No": index + 1,
        };

        if (visibleColumns.orderNumber) {
          row["Order Number"] = order.order_number || '-';
        }

        if (visibleColumns.orderDate) {
          row["Order Date"] = formatDate(order.order_date);
        }

        if (visibleColumns.status) {
          row["Status"] = getStatusText(order.status);
        }

        if (visibleColumns.expiryDate) {
          row["Expiry Date"] = formatDate(getExpiryDate(order));
        }

        if (visibleColumns.referenceNo) {
          row["Reference No"] = getReferenceNo(order);
        }

        if (visibleColumns.customerName) {
          row["Customer Name"] = getCustomerDisplayName(order);
        }

        if (visibleColumns.total) {
          row["Total Amount"] = order.total_amount || 0;
        }

        if (visibleColumns.salesman) {
          row["Sales Person"] = getSalesPersonName(order);
        }

        return row;
      });

      const ws = XLSX.utils.json_to_sheet(exportData);
      const csv = XLSX.utils.sheet_to_csv(ws);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      saveAs(blob, "sales-orders.csv");
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
      const allOrders = await fetchAllOrdersForExport();
      setOrdersToPrint(allOrders);
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

  const handleDelete = async (orderId: string, orderNumber: string) => {
    if (window.confirm(`Are you sure you want to delete sales order "${orderNumber}"? This action cannot be undone.`)) {
      try {
        if (company?.id) {
          // Check if the API method exists
          if ('deleteSalesOrder' in ordersApi) {
            await (ordersApi as any).deleteSalesOrder(company.id, orderId);
          } else {
            console.log("Delete method not available in API");
            // Simulate deletion for now
            alert("Delete functionality will be implemented");
          }
          fetchOrders();
        }
      } catch (error) {
        console.error("Error deleting sales order:", error);
        alert("Failed to delete sales order");
      }
    }
  };

  const handleConvertToInvoice = (orderId: string) => {
    if (!company?.id || convertingOrderId) return;
    setConvertingOrderId(orderId);
    setActiveActionMenu(null);
    router.push(`/sales/new?fromSalesOrder=${orderId}`);
    setConvertingOrderId(null);
  };

  const handlePrintOrder = (orderId: string) => {
    window.open(`/sales/sales-orders/${orderId}?print=1`, "_blank");
  };

  const handleDownloadPDF = async (orderId: string) => {
    if (!company?.id) return;

    try {
      const order = (await ordersApi.getSalesOrder(company.id, orderId)) as any;
      const doc = new jsPDF("p", "mm", "a4");
      const valueOrDash = (value: any) =>
        value === undefined || value === null || value === "" ? "-" : String(value);
      const fmtNum = (value: any) => Number(value || 0).toFixed(2);
      const fmtMoney = (value: any) =>
        new Intl.NumberFormat("en-IN", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(Number(value || 0));
      const safeFilePart = (value: string) => value.replace(/[\\/:*?"<>|]/g, "_");

      const orderNumber = valueOrDash(order?.order_number);
      const customerName =
        order?.customer_name || order?.customer?.name || getCustomerDisplayName(order as ExtendedSalesOrder) || "Walk-in Customer";
      const salesPersonName =
        order?.sales_person_name ||
        (order?.sales_person_id ? employeeNameById[String(order.sales_person_id)] : "") ||
        order?.sales_person_id ||
        "-";

      // Professional header band
      doc.setFillColor(22, 78, 99);
      doc.rect(0, 0, 210, 28, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(15);
      doc.text(company?.name || "Company", 14, 11);
      doc.setFontSize(12);
      doc.text("SALES ORDER", 14, 20);
      doc.setFontSize(10);
      doc.text(`No: ${orderNumber}`, 150, 11);
      doc.text(`Date: ${order?.order_date ? formatDate(order.order_date) : "-"}`, 150, 20);
      doc.setTextColor(0, 0, 0);

      let y = 34;
      const ensureSpace = (needed = 10) => {
        if (y + needed > 280) {
          doc.addPage();
          y = 16;
        }
      };
      const addSectionTitle = (title: string) => {
        ensureSpace(10);
        doc.setFillColor(241, 245, 249);
        doc.rect(14, y - 4, 182, 7, "F");
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text(title, 16, y);
        doc.setFont("helvetica", "normal");
        y += 8;
      };
      const addLine = (label: string, value: any) => {
        ensureSpace(12);
        doc.setFont("helvetica", "bold");
        doc.text(`${label}:`, 14, y);
        doc.setFont("helvetica", "normal");
        const valueLines = doc.splitTextToSize(valueOrDash(value), 148);
        doc.text(valueLines, 46, y);
        y += Math.max(1, valueLines.length) * 5;
      };

      addSectionTitle("Order Information");
      addLine("Order No", orderNumber || "");
      addLine("Order Date", order?.order_date ? formatDate(order.order_date) : "-");
      addLine("Expiry Date", order?.expire_date ? formatDate(order.expire_date) : "-");
      addLine("Customer", customerName || "");
      addLine("Contact Person", order?.contact_person_name || order?.contact_person || "");
      addLine("Sales Person", salesPersonName || "");
      addLine("Reference No", order?.reference_no || "");
      addLine("Reference Date", order?.reference_date ? formatDate(order.reference_date) : "-");
      addLine("Payment Terms", order?.payment_terms || "");

      addSectionTitle("Dispatch / Other Details");
      addLine("Delivery Note", order?.delivery_note || "");
      addLine("Supplier Ref", order?.supplier_ref || "");
      addLine("Other References", order?.other_references || "");
      addLine("Buyer Order No", order?.buyer_order_no || "");
      addLine("Buyer Order Date", order?.buyer_order_date ? formatDate(order.buyer_order_date) : "-");
      addLine("Despatch Doc No", order?.despatch_doc_no || "");
      addLine("Delivery Note Date", order?.delivery_note_date ? formatDate(order.delivery_note_date) : "-");
      addLine("Despatched Through", order?.despatched_through || "");
      addLine("Destination", order?.destination || "");
      addLine("Terms Of Delivery", order?.terms_of_delivery || "");

      const notesText = valueOrDash(order?.notes);
      const termsText = valueOrDash(order?.terms);
      addSectionTitle("Notes");
      const notesLines = doc.splitTextToSize(notesText, 182);
      ensureSpace(notesLines.length * 5 + 8);
      doc.text(notesLines, 14, y);
      y += notesLines.length * 5 + 2;

      addSectionTitle("Terms & Conditions");
      const termsLines = doc.splitTextToSize(termsText, 182);
      ensureSpace(termsLines.length * 5 + 8);
      doc.text(termsLines, 14, y);
      y += termsLines.length * 5 + 4;

      const items = Array.isArray(order?.items) ? order.items : [];
      const body = items.map((item: any, index: number) => {
        const qty = Number(item?.quantity || 0);
        const rate = Number(item?.rate ?? item?.unit_price ?? 0);
        const discountPercent = Number(item?.discount_percent || 0);
        const discountAmount = Number(item?.discount_amount || 0);
        const taxable = Number(item?.taxable_amount ?? qty * rate - discountAmount);
        const gstRate = Number(item?.gst_rate || 0);
        const taxAmount = Number(item?.tax_amount ?? taxable * (gstRate / 100));
        const amount = Number(item?.total_amount ?? taxable + taxAmount);

        return [
          `${index + 1}`,
          valueOrDash(item?.item_code),
          valueOrDash(item?.description),
          qty.toFixed(2),
          valueOrDash(item?.unit),
          rate.toFixed(2),
          discountPercent.toFixed(2),
          discountAmount.toFixed(2),
          taxable.toFixed(2),
          gstRate.toFixed(2),
          taxAmount.toFixed(2),
          amount.toFixed(2),
        ];
      });

      autoTable(doc, {
        startY: y,
        head: [["#", "Item Code", "Description", "Qty", "Unit", "Rate", "Disc %", "Disc Amt", "Taxable", "GST %", "Tax", "Amount"]],
        body,
        theme: "grid",
        styles: { fontSize: 8, cellPadding: 1.8, lineColor: [220, 220, 220], lineWidth: 0.1 },
        headStyles: { fillColor: [22, 78, 99], fontSize: 8, textColor: [255, 255, 255] },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: {
          3: { halign: "right" },
          5: { halign: "right" },
          6: { halign: "right" },
          7: { halign: "right" },
          8: { halign: "right" },
          9: { halign: "right" },
          10: { halign: "right" },
          11: { halign: "right" },
        },
      });

      const subtotal = Number(order?.subtotal || 0);
      const tax = Number(order?.total_tax || 0);
      const freight = Number(order?.freight_charges || 0);
      const pAndF = Number(order?.p_and_f_charges || 0);
      const roundOff = Number(order?.round_off || 0);
      const total = Number(order?.total_amount || 0);
      const finalY = (doc as any).lastAutoTable?.finalY ?? y;
      const totalsY = finalY + 10;
      const boxX = 118;
      const boxW = 78;
      const boxH = 40;

      if (totalsY + boxH > 285) {
        doc.addPage();
      }
      const adjustedY = totalsY + boxH > 285 ? 20 : totalsY;
      doc.setDrawColor(200, 200, 200);
      doc.roundedRect(boxX, adjustedY, boxW, boxH, 2, 2, "S");
      doc.setFontSize(9);
      doc.text("Subtotal", boxX + 3, adjustedY + 6);
      doc.text(fmtMoney(subtotal), boxX + boxW - 3, adjustedY + 6, { align: "right" });
      doc.text("Tax", boxX + 3, adjustedY + 12);
      doc.text(fmtMoney(tax), boxX + boxW - 3, adjustedY + 12, { align: "right" });
      doc.text("Freight Charges", boxX + 3, adjustedY + 18);
      doc.text(fmtMoney(freight), boxX + boxW - 3, adjustedY + 18, { align: "right" });
      doc.text("P&F Charges", boxX + 3, adjustedY + 24);
      doc.text(fmtMoney(pAndF), boxX + boxW - 3, adjustedY + 24, { align: "right" });
      doc.text("Round Off", boxX + 3, adjustedY + 30);
      doc.text(fmtNum(roundOff), boxX + boxW - 3, adjustedY + 30, { align: "right" });
      doc.setDrawColor(210, 210, 210);
      doc.line(boxX + 2, adjustedY + 33, boxX + boxW - 2, adjustedY + 33);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("Grand Total", boxX + 3, adjustedY + 38);
      doc.text(fmtMoney(total), boxX + boxW - 3, adjustedY + 38, { align: "right" });
      doc.setFont("helvetica", "normal");

      // Footer with page numbers
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(120, 120, 120);
        doc.text(`Page ${i} of ${pageCount}`, 196, 292, { align: "right" });
      }
      doc.setTextColor(0, 0, 0);

      doc.save(`sales-order-${safeFilePart(orderNumber)}.pdf`);
    } catch (error) {
      console.error("Failed to download PDF:", error);
      alert("Failed to generate PDF. Please try again.");
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

  // Unique customers for filter
  const uniqueCustomers = Array.from(
    new Map(
      orders
        .map(order => ({
          id: order.customer_id || order.customer?.id || "",
          name: getCustomerDisplayName(order)
        }))
        .filter(c => c.id && c.name && c.name !== 'Walk-in Customer')
        .map(c => [c.id, c])
    ).values()
  );

  return (
    <div className="w-full">
      {showPrintView && (
        <PrintView
          onComplete={() => setShowPrintView(false)}
          orders={ordersToPrint}
          visibleColumns={visibleColumns}
          formatCurrency={formatCurrency}
          formatDate={formatDate}
          getStatusText={getStatusText}
          getCustomerDisplayName={getCustomerDisplayName}
          getCustomerGSTIN={getCustomerGSTIN}
          getSalesPersonName={getSalesPersonName}
          getExpiryDate={getExpiryDate}
          companyName={company?.name || ''}
        />
      )}

      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Sales Orders
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Manage your sales orders • Track deliveries and convert to invoices
            </p>
          </div>
          <Link
            href="/sales/sales-orders/new"
            className="px-4 py-2 transition bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            New Sales Order
          </Link>
        </div>
      </div>


      {/* Summary Cards */}
      <div className="px-6 py-6 bg-gray-50 dark:bg-gray-900">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
          {/* Total Orders */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {summary.total_orders}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Total Orders
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
                <Receipt className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </div>

          {/* Total Order Amount */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-blue-600">
                  {formatCurrency(summary.total_amount)}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Total Amount
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>

          {/* Draft Orders */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-yellow-600">
                  {summary.draft_orders}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Draft Orders
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-yellow-100 dark:bg-yellow-900/20 flex items-center justify-center">
                <FileText className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
              </div>
            </div>
          </div>

          {/* Confirmed Orders */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-green-600">
                  {summary.confirmed_orders}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Confirmed Orders
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
                placeholder="Search orders, customers, reference no..."
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
                        {key === 'orderNumber' ? 'Order #' : 
                         key === 'orderDate' ? 'Order Date' : 
                         key === 'expiryDate' ? 'Expiry Date' : 
                         key === 'referenceNo' ? 'Reference No' : 
                         key === 'customerName' ? 'Customer Name' : 
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
            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Status</option>
                <option value="draft">Draft</option>
                <option value="confirmed">Confirmed</option>
                <option value="processing">Processing</option>
                <option value="partially_delivered">Partially Delivered</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            {/* Customer Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Customer
              </label>
              <select
                value={customerFilter}
                onChange={(e) => setCustomerFilter(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Customers</option>
                {uniqueCustomers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                  </option>
                ))}
              </select>
            </div>

            {/* From Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                From Date
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* To Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                To Date
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
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
        <div className="overflow-x-hidden">
          <table className="w-full table-fixed">
            <thead className="bg-gray-200 dark:bg-gray-700/50">
              <tr className="text-sm font-semibold text-gray-600 dark:text-gray-300">
                <th className="text-left px-3 py-3 ">
                  S.No
                </th>
                {visibleColumns.orderNumber && (
                  <th className="text-left px-3 py-3 ">
                    Order #
                  </th>
                )}
                {visibleColumns.orderDate && (
                  <th className="text-left px-3 py-3 ">
                    Date
                  </th>
                )}
                {visibleColumns.status && (
                  <th className="text-left px-3 py-3 ">
                    Status
                  </th>
                )}
                {visibleColumns.expiryDate && (
                  <th className="text-left px-3 py-3 ">
                    Expiry Date
                  </th>
                )}
                {visibleColumns.referenceNo && (
                  <th className="text-left px-3 py-3 ">
                    Reference No
                  </th>
                )}
                {visibleColumns.customerName && (
                  <th className="text-left px-3 py-3 ">
                    Customer Name
                  </th>
                )}
                {visibleColumns.total && (
                  <th className="text-left px-3 py-3 ">
                    Total
                  </th>
                )}
                {visibleColumns.salesman && (
                  <th className="text-left px-3 py-3 ">
                    Salesman
                  </th>
                )}
                {visibleColumns.actions && (
                  <th className="text-right px-3 py-3 ">
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
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={Object.values(visibleColumns).filter(Boolean).length} className="px-6 py-8 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <ShoppingBag className="w-12 h-12 text-gray-400 mb-2" />
                      <p className="text-lg font-medium text-gray-900 dark:text-white mb-1">
                        No sales orders found
                      </p>
                      <p className="text-gray-500 dark:text-gray-400 mb-4">
                        {statusFilter || search || fromDate || toDate ?
                          "No orders found matching your filters. Try adjusting your search criteria." :
                          "Add your first sales order to start managing your orders."}
                      </p>
                      <Link
                        href="/sales/sales-orders/new"
                        className="text-blue-600 hover:underline dark:text-blue-400"
                      >
                        Create your first sales order
                      </Link>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order, index) => {
                  const expiryDate = getExpiryDate(order);
                  const isExpired = expiryDate ? new Date(expiryDate) < new Date() : false;
                  const expiryStatus = getExpiryStatus(order);

                  return (
                    <tr
                      key={order.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <td className="px-3 py-4 align-top break-words text-gray-700 dark:text-gray-300">
                        {(currentPage - 1) * pageSize + index + 1}
                      </td>
                      {visibleColumns.orderNumber && (
                        <td className="px-3 py-4 align-top break-words">
                          <div className="min-w-0 max-w-[240px]">
                            <div className="font-medium text-blue-600 dark:text-blue-400">
                              <Link href={`/sales/sales-orders/${order.id}`} className="hover:underline">
                                {order.order_number || 'N/A'}
                              </Link>
                            </div>
                          </div>
                        </td>
                      )}
                      {visibleColumns.orderDate && (
                        <td className="px-3 py-4 align-top break-words text-gray-700 dark:text-gray-300">
                          {formatDate(order.order_date)}
                        </td>
                      )}
                      {visibleColumns.status && (
                        <td className="px-3 py-4 align-top break-words">
                          <span
                            className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getStatusColor(order.status)}`}
                          >
                            {getStatusText(order.status)}
                          </span>
                        </td>
                      )}
                      {visibleColumns.expiryDate && (
                        <td className="px-3 py-4 align-top break-words">
                          <div className="flex flex-col gap-1">
                            <span className={`${isExpired ? 'text-red-600 font-medium' : 'text-gray-700 dark:text-gray-300'}`}>
                              {formatDate(expiryDate) || '-'}
                            </span>
                            {expiryStatus && (
                              <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${isExpired ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'}`}>
                                {expiryStatus}
                              </span>
                            )}
                          </div>
                        </td>
                      )}
                      {visibleColumns.referenceNo && (
                        <td className="px-3 py-4 align-top break-words text-gray-700 dark:text-gray-300">
                          {getReferenceNo(order)}
                        </td>
                      )}
                      {visibleColumns.customerName && (
                        <td className="px-3 py-4 align-top break-words">
                          <div className="min-w-0 max-w-[240px]">
                            <div className="font-medium text-gray-900 dark:text-white">
                              {getCustomerDisplayName(order)}
                            </div>
                            {getCustomerGSTIN(order) && (
                              <div className="text-xs text-gray-500 dark:text-gray-400 truncate mt-1">
                                GSTIN: {getCustomerGSTIN(order)}
                              </div>
                            )}
                          </div>
                        </td>
                      )}
                      {visibleColumns.total && (
                        <td className="px-3 py-4 align-top break-words">
                          <div className="font-bold text-gray-900 dark:text-white">
                            {formatCurrency(order.total_amount)}
                          </div>
                          {getSubtotal(order) > 0 && (
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              Subtotal: {formatCurrency(getSubtotal(order))}
                            </div>
                          )}
                        </td>
                      )}
                      {visibleColumns.salesman && (
                        <td className="px-3 py-4 align-top break-words text-gray-700 dark:text-gray-300">
                          {getSalesPersonName(order)}
                        </td>
                      )}
                      {visibleColumns.actions && (
                        <td className="px-3 py-4 text-right align-top">
                          <div className="relative action-dropdown-container inline-block">
                            <button
                              onClick={() =>
                                setActiveActionMenu(
                                  activeActionMenu === order.id ? null : order.id
                                )
                              }
                              className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-50 dark:hover:text-gray-300 dark:hover:bg-gray-700/50 transition-all duration-200"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>

                            {activeActionMenu === order.id && (
                              <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg shadow-xl py-1 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                                <Link
                                  href={`/sales/sales-orders/${order.id}`}
                                  onClick={() => setActiveActionMenu(null)}
                                  className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                                >
                                  <Eye className="w-4 h-4 text-gray-400" />
                                  <span>View Details</span>
                                </Link>

                                {order.status === 'draft' && (
                                  <>
                                    <Link
                                      href={`/sales/sales-orders/${order.id}/edit`}
                                      onClick={() => setActiveActionMenu(null)}
                                      className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                                    >
                                      <Edit className="w-4 h-4 text-gray-400" />
                                      <span>Edit</span>
                                    </Link>
                                    <button
                                      onClick={() => handleConvertToInvoice(order.id)}
                                      disabled={convertingOrderId === order.id}
                                      className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                                    >
                                      <FilePlus className="w-4 h-4 text-gray-400" />
                                      <span>Convert to Invoice</span>
                                    </button>
                                  </>
                                )}

                                <button
                                  onClick={() => handlePrintOrder(order.id)}
                                  className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                                >
                                  <Printer className="w-4 h-4 text-gray-400" />
                                  <span>Print</span>
                                </button>

                                <button
                                  onClick={() => {
                                    setActiveActionMenu(null);
                                    handleDownloadPDF(order.id);
                                  }}
                                  className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                                >
                                  <FileDown className="w-4 h-4 text-gray-400" />
                                  <span>Download PDF</span>
                                </button>

                                <div className="my-1 border-t border-gray-100 dark:border-gray-700"></div>
                                {order.status === 'draft' && (
                                  <button
                                    onClick={() => handleDelete(order.id, order.order_number || 'N/A')}
                                    className="flex w-full items-center gap-3 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                    <span>Delete Order</span>
                                  </button>
                                )}
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

      {!loading && filteredOrders.length > 0 && (
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, summary.total_orders)} of {summary.total_orders}
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




