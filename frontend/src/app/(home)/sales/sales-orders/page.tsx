"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { ordersApi, SalesOrder, OrderStatus } from "@/services/api";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { saveAs } from "file-saver";
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
  FilePlus,
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

// Type extension for missing properties
interface ExtendedSalesOrder extends Omit<SalesOrder, 'customer' | 'items'> {
  reference_no?: string;
  sales_person_name?: string;
  expire_date?: string;
  expected_delivery_date?: string;
  customer_gstin?: string;
  payment_terms?: string;
  customer_name?: string;
  sales_person_id?: string;
  subtotal?: number;
  customer?: {
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

export default function SalesOrdersPage() {
  const router = useRouter();
  const { company } = useAuth();
  const [orders, setOrders] = useState<ExtendedSalesOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [customerFilter, setCustomerFilter] = useState<string>("");
  const [totalRecords, setTotalRecords] = useState(0);
  const [summary, setSummary] = useState({
    total_amount: 0,
    total_orders: 0,
    draft_orders: 0,
    confirmed_orders: 0
  });
  const [showFilters, setShowFilters] = useState(false);
  const [showColumnDropdown, setShowColumnDropdown] = useState(false);
  const [activeActionMenu, setActiveActionMenu] = useState<string | null>(null);

  // Column visibility state
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

  const pageSize = 10;

  const fetchOrders = async () => {
    if (!company?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const result = await ordersApi.listSalesOrders(company.id, {
        page,
        page_size: pageSize,
        status: statusFilter ? (statusFilter as OrderStatus) : undefined,
        search: search || undefined,
        from_date: fromDate || undefined,
        to_date: toDate || undefined,
        customer_id: customerFilter || undefined
      }) as any;

      // Handle both response formats
      let ordersData: ExtendedSalesOrder[] = [];
      let total = 0;
      let totalAmount = 0;

      if (Array.isArray(result)) {
        // If API returns array directly
        ordersData = result as ExtendedSalesOrder[];
        total = result.length;
        totalAmount = ordersData.reduce((sum, order) => sum + (order.total_amount || 0), 0);
      } else if (result && result.orders) {
        // If API returns response object
        ordersData = result.orders || [];
        total = result.total || ordersData.length;
        totalAmount = result.total_amount || ordersData.reduce((sum, order) => sum + (order.total_amount || 0), 0);
      }

      setOrders(ordersData);
      setTotalRecords(total);

      // Calculate summary
      const draftOrders = ordersData.filter(order => order.status === 'draft').length;
      const confirmedOrders = ordersData.filter(order => order.status === 'confirmed').length;

      setSummary({
        total_amount: totalAmount,
        total_orders: ordersData.length,
        draft_orders: draftOrders,
        confirmed_orders: confirmedOrders
      });
    } catch (error) {
      console.error("Failed to fetch sales orders:", error);
      setOrders([]);
      setTotalRecords(0);
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

  useEffect(() => {
    fetchOrders();
  }, [company?.id, page, search, statusFilter, customerFilter, fromDate, toDate]);

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

  // Helper functions to safely access properties
  const getCustomerDisplayName = (order: ExtendedSalesOrder): string => {
    return order.customer_name || order.customer?.name || 'Walk-in Customer';
  };

  const getCustomerGSTIN = (order: ExtendedSalesOrder): string => {
    return order.customer_gstin || order.customer?.gstin || '';
  };

  const getSalesPersonName = (order: ExtendedSalesOrder): string => {
    return order.sales_person_name || order.sales_person_id || '-';
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

  // Export functions
  const copyToClipboard = async () => {
    const headers = [
      "Order #", "Date", "Status", "Expiry Date", "Reference No",
      "Customer Name", "Total", "Salesman"
    ];

    const rows = orders.map(order => [
      order.order_number || '-',
      formatDate(order.order_date),
      getStatusText(order.status),
      formatDate(getExpiryDate(order)),
      getReferenceNo(order),
      getCustomerDisplayName(order),
      formatCurrency(order.total_amount || 0),
      getSalesPersonName(order)
    ]);

    const text = [headers.join("\t"), ...rows.map(r => r.join("\t"))].join("\n");

    await navigator.clipboard.writeText(text);
    alert("Sales orders data copied to clipboard");
  };

  const exportExcel = () => {
    const exportData = orders.map(order => ({
      "Order Number": order.order_number || '-',
      "Order Date": formatDate(order.order_date),
      "Status": getStatusText(order.status),
      "Expiry Date": formatDate(getExpiryDate(order)),
      "Reference No": getReferenceNo(order),
      "Customer Name": getCustomerDisplayName(order),
      "Customer GSTIN": getCustomerGSTIN(order),
      "Total Amount": order.total_amount || 0,
      "Subtotal": getSubtotal(order),
      "Tax Amount": (order.total_amount || 0) - getSubtotal(order),
      "Sales Person": getSalesPersonName(order),
      "Payment Terms": order.payment_terms || '-'
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sales Orders");
    XLSX.writeFile(wb, "sales-orders.xlsx");
  };

  const exportPDF = () => {
    const doc = new jsPDF();

    autoTable(doc, {
      head: [["Order #", "Date", "Customer Name", "Total", "Status", "Salesman"]],
      body: orders.map(order => [
        order.order_number || '-',
        formatDate(order.order_date),
        getCustomerDisplayName(order),
        formatCurrency(order.total_amount || 0),
        getStatusText(order.status),
        getSalesPersonName(order)
      ])
    });

    doc.save("sales-orders.pdf");
  };

  const exportCSV = () => {
    const exportData = orders.map(order => ({
      "Order Number": order.order_number || '-',
      "Order Date": formatDate(order.order_date),
      "Status": getStatusText(order.status),
      "Expiry Date": formatDate(getExpiryDate(order)),
      "Reference No": getReferenceNo(order),
      "Customer Name": getCustomerDisplayName(order),
      "Total Amount": order.total_amount || 0,
      "Sales Person": getSalesPersonName(order)
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    saveAs(blob, "sales-orders.csv");
  };

  const toggleColumn = (key: keyof typeof visibleColumns) => {
    setVisibleColumns(prev => ({ ...prev, [key]: !prev[key] }));
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

  const getStatusBadge = (status: string) => {
    const text = getStatusText(status);
    const colorClass = getStatusColor(status);

    let icon = null;
    switch (status.toLowerCase()) {
      case 'completed':
        icon = <CheckCircle className="w-3 h-3 mr-1" />;
        break;
      case 'confirmed':
      case 'processing':
        icon = <Clock className="w-3 h-3 mr-1" />;
        break;
      case 'cancelled':
        icon = <XCircle className="w-3 h-3 mr-1" />;
        break;
      case 'partially_delivered':
        icon = <AlertCircle className="w-3 h-3 mr-1" />;
        break;
    }

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${colorClass}`}>
        {icon}
        {text}
      </span>
    );
  };

  const handleConvertToInvoice = async (orderId: string) => {
    console.log("Convert to invoice:", orderId);
    alert("Convert to invoice functionality will be implemented");
  };

  const handlePrint = (orderId: string) => {
    window.open(`/sales/sales-orders/${orderId}/print`, "_blank");
  };

  const handleDownloadPDF = async (orderId: string) => {
    if (!company?.id) return;

    try {
      // Check if the API method exists or use a fallback
      const response = await fetch(`/api/sales-orders/${orderId}/pdf`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (error) {
      console.error("Failed to download PDF:", error);
      alert("Failed to generate PDF. Please try again.");
    }
  };

  const handleDelete = async (orderId: string) => {
    if (!confirm("Are you sure you want to delete this sales order?")) return;

    try {
      // Check if the API method exists
      if ('deleteSalesOrder' in ordersApi) {
        await (ordersApi as any).deleteSalesOrder(company!.id, orderId);
      } else {
        console.log("Delete method not available in API");
        // Simulate deletion for now
        alert("Delete functionality will be implemented");
      }
      setOrders(orders.filter(order => order.id !== orderId));
      fetchOrders(); // Refresh the list
    } catch (error) {
      console.error("Failed to delete sales order:", error);
      alert("Failed to delete sales order");
    }
  };

  const handleSearch = () => {
    setPage(1);
    fetchOrders();
  };

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("");
    setCustomerFilter("");
    setFromDate("");
    setToDate("");
    setPage(1);
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

  // Unique customers for filter
  const uniqueCustomers = Array.from(new Set(
    orders
      .map(order => getCustomerDisplayName(order))
      .filter(name => name && name !== 'Walk-in Customer')
  ));

  const getTotalPages = () => {
    return Math.ceil(totalRecords / pageSize);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Sales Orders
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Manage and track all your sales orders
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
      <div className="px-6 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Total Orders */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {summary.total_orders.toLocaleString()}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Total Orders
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
                <FileText className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </div>

          {/* Total Order Amount */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatCurrency(summary.total_amount)}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Total Order Amount
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>

          {/* Draft Orders */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-yellow-600">
                  {summary.draft_orders.toLocaleString()}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Draft Orders
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-yellow-100 dark:bg-yellow-900/20 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
              </div>
            </div>
          </div>

          {/* Confirmed Orders */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-green-600">
                  {summary.confirmed_orders.toLocaleString()}
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

      {/* Filters */}
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
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors flex items-center gap-2"
            >
              <Copy className="w-5 h-5" />
              Copy
            </button>

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

            <button className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors flex items-center gap-2">
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
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Status</option>
              <option value="draft">Draft</option>
              <option value="confirmed">Confirmed</option>
              <option value="processing">Processing</option>
              <option value="partially_delivered">Partially Delivered</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>

            {/* Customer Dropdown */}
            <select
              value={customerFilter}
              onChange={(e) => {
                setCustomerFilter(e.target.value);
                setPage(1);
              }}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Customers</option>
              {uniqueCustomers.map((customer) => (
                <option key={customer} value={customer}>
                  {customer}
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
      <div className="p-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="w-full">
            <table className="w-full table-fixed">
              <div className="overflow-x-auto">

                <thead className="bg-gray-200 dark:bg-gray-700/50">
                  <tr className="text-sm font-semibold text-gray-600 dark:text-gray-300">
                    {visibleColumns.orderNumber && (
                      <th className="text-left px-6 py-3 whitespace-nowrap">
                        Order #
                      </th>
                    )}
                    {visibleColumns.orderDate && (
                      <th className="text-left px-6 py-3 whitespace-nowrap">
                        Date
                      </th>
                    )}
                    {visibleColumns.status && (
                      <th className="text-left px-6 py-3 whitespace-nowrap">
                        Status
                      </th>
                    )}
                    {visibleColumns.expiryDate && (
                      <th className="text-left px-6 py-3 whitespace-nowrap">
                        Expiry Date
                      </th>
                    )}
                    {visibleColumns.referenceNo && (
                      <th className="text-left px-6 py-3 whitespace-nowrap">
                        Reference No
                      </th>
                    )}
                    {visibleColumns.customerName && (
                      <th className="text-left px-6 py-3 whitespace-nowrap min-w-[200px]">
                        Customer Name
                      </th>
                    )}
                    {visibleColumns.total && (
                      <th className="text-left px-6 py-3 whitespace-nowrap">
                        Total
                      </th>
                    )}
                    {visibleColumns.salesman && (
                      <th className="text-left px-6 py-3 whitespace-nowrap">
                        Salesman
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
                  ) : orders.length === 0 ? (
                    <tr>
                      <td colSpan={Object.values(visibleColumns).filter(Boolean).length} className="px-6 py-8 text-center">
                        <div className="flex flex-col items-center justify-center">
                          <ShoppingBag className="w-12 h-12 text-gray-400 mb-2" />
                          <p className="text-lg font-medium text-gray-900 dark:text-white mb-1">
                            No sales orders found
                          </p>
                          <p className="text-gray-500 dark:text-gray-400 mb-4">
                            Try adjusting your filters or create a new sales order
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
                    orders.map((order) => {
                      const expiryStatus = getExpiryStatus(order);
                      const isExpired = getDaysUntilExpiry(getExpiryDate(order)) < 0;

                      return (
                        <tr
                          key={order.id}
                          className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                        >
                          {visibleColumns.orderNumber && (
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex flex-col">
                                <Link
                                  href={`/sales/sales-orders/${order.id}`}
                                  className="font-medium text-blue-600 hover:underline dark:text-blue-400 whitespace-nowrap"
                                >
                                  {order.order_number || 'N/A'}
                                </Link>
                              </div>
                            </td>
                          )}
                          {visibleColumns.orderDate && (
                            <td className="px-6 py-4 whitespace-nowrap text-gray-700 dark:text-gray-300">
                              {formatDate(order.order_date)}
                            </td>
                          )}
                          {visibleColumns.status && (
                            <td className="px-6 py-4 whitespace-nowrap">
                              {getStatusBadge(order.status)}
                            </td>
                          )}
                          {visibleColumns.expiryDate && (
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex flex-col gap-1">
                                <span className={`${isExpired ? 'text-red-600 font-medium' : 'text-gray-700 dark:text-gray-300'}`}>
                                  {formatDate(getExpiryDate(order)) || '-'}
                                </span>
                                {expiryStatus && (
                                  <span className={`inline-flex w-fit items-center px-2 py-0.5 rounded-full text-xs font-medium ${isExpired ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'} whitespace-nowrap`}>
                                    {expiryStatus}
                                  </span>
                                )}
                              </div>
                            </td>
                          )}
                          {visibleColumns.referenceNo && (
                            <td className="px-6 py-4 whitespace-nowrap text-gray-700 dark:text-gray-300">
                              {getReferenceNo(order)}
                            </td>
                          )}
                          {visibleColumns.customerName && (
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <Users className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                <div className="min-w-0">
                                  <div className="font-medium text-gray-900 dark:text-white truncate">
                                    {getCustomerDisplayName(order)}
                                  </div>
                                  {getCustomerGSTIN(order) && (
                                    <div className="text-xs text-gray-500 truncate">GSTIN: {getCustomerGSTIN(order)}</div>
                                  )}
                                </div>
                              </div>
                            </td>
                          )}
                          {visibleColumns.total && (
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="font-medium text-gray-900 dark:text-white">
                                {formatCurrency(order.total_amount)}
                              </div>
                              {getSubtotal(order) > 0 && (
                                <div className="text-xs text-gray-500">
                                  Subtotal: {formatCurrency(getSubtotal(order))}
                                </div>
                              )}
                            </td>
                          )}
                          {visibleColumns.salesman && (
                            <td className="px-6 py-4 whitespace-nowrap text-gray-700 dark:text-gray-300">
                              {getSalesPersonName(order)}
                            </td>
                          )}
                          {visibleColumns.actions && (
                            <td className="px-6 py-4 text-right whitespace-nowrap">
                              <div className="relative action-dropdown-container inline-block">
                                <button
                                  onClick={() =>
                                    setActiveActionMenu(
                                      activeActionMenu === order.id ? null : order.id
                                    )
                                  }
                                  className="p-2 rounded-lg text-gray-500 hover:text-gray-700
                            dark:text-gray-400 dark:hover:text-white
                            hover:bg-gray-100 dark:hover:bg-gray-700"
                                >
                                  <MoreVertical className="w-5 h-5" />
                                </button>

                                {activeActionMenu === order.id && (
                                  <div
                                    className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800
                              border border-gray-200 dark:border-gray-700
                              rounded-lg shadow-lg z-20"
                                  >
                                    <Link
                                      href={`/sales/sales-orders/${order.id}`}
                                      onClick={() => setActiveActionMenu(null)}
                                      className="flex items-center gap-2 px-4 py-2 text-sm
                                text-gray-700 dark:text-gray-300
                                hover:bg-gray-100 dark:hover:bg-gray-700"
                                    >
                                      <Eye className="w-4 h-4" />
                                      View Details
                                    </Link>

                                    {order.status === 'draft' && (
                                      <>
                                        <Link
                                          href={`/sales/sales-orders/${order.id}/edit`}
                                          onClick={() => setActiveActionMenu(null)}
                                          className="flex items-center gap-2 px-4 py-2 text-sm
                                  text-gray-700 dark:text-gray-300
                                  hover:bg-gray-100 dark:hover:bg-gray-700"
                                        >
                                          <Edit className="w-4 h-4" />
                                          Edit
                                        </Link>
                                        <button
                                          onClick={() => handleConvertToInvoice(order.id)}
                                          className="flex w-full items-center gap-2 px-4 py-2 text-sm
                                  text-green-600 dark:text-green-400
                                  hover:bg-green-50 dark:hover:bg-green-900/30"
                                        >
                                          <FilePlus className="w-4 h-4" />
                                          Convert to Invoice
                                        </button>
                                      </>
                                    )}

                                    <button
                                      onClick={() => handlePrint(order.id)}
                                      className="flex items-center gap-2 px-4 py-2 text-sm
                                text-gray-700 dark:text-gray-300
                                hover:bg-gray-100 dark:hover:bg-gray-700"
                                    >
                                      <Printer className="w-4 h-4" />
                                      Print
                                    </button>

                                    <button
                                      onClick={() => handleDownloadPDF(order.id)}
                                      className="flex items-center gap-2 px-4 py-2 text-sm
                                text-gray-700 dark:text-gray-300
                                hover:bg-gray-100 dark:hover:bg-gray-700"
                                    >
                                      <Download className="w-4 h-4" />
                                      Download PDF
                                    </button>

                                    {order.status === 'draft' && (
                                      <button
                                        onClick={() => handleDelete(order.id)}
                                        className="flex w-full items-center gap-2 px-4 py-2 text-sm
                                  text-red-600 dark:text-red-400
                                  hover:bg-red-50 dark:hover:bg-red-900/30"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                        Delete
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
                {orders.length > 0 && visibleColumns.total && (
                  <tfoot>
                    <tr className="bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700">
                      <td
                        colSpan={
                          Object.values(visibleColumns).filter(Boolean).length -
                          (visibleColumns.total ? 1 : 0) -
                          (visibleColumns.actions ? 1 : 0)
                        }
                        className="px-6 py-4 text-right font-semibold text-gray-900 dark:text-white whitespace-nowrap"
                      >
                        Total Amount:
                      </td>
                      <td className="px-6 py-4 font-bold text-gray-900 dark:text-white whitespace-nowrap">
                        {formatCurrency(summary.total_amount)}
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
        </div>

        {/* Pagination - Fixed similar to sales list */}
        {orders.length > 0 && totalRecords > pageSize && (
          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Showing {(page - 1) * pageSize + 1} to{" "}
              {Math.min(page * pageSize, totalRecords)} of {totalRecords} results
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
                disabled={page * pageSize >= totalRecords}
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