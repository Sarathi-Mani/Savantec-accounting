"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
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
  ShoppingBag,
  Users,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  Printer,
  Clock,
  CheckCircle,
  XCircle,
  User,
  Copy,
  AlertCircle,
  Loader2,
  RefreshCw,
  Building2,
  FileDown,
  FileUp,
  Receipt,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

// Define TypeScript interfaces based on your API response
interface PurchaseOrder {
  id: string;
  order_number: string;
  order_date: string;
  status: string;
  reference_number: string;
  vendor_name: string;
  total_amount: number;
   exchange_rate: number; 
  created_by: string; // This is now creator_id from backend
  creator_name: string;
   

  currency: string;
  created_at: string;
}

interface PurchaseOrderResponse {
  purchases: PurchaseOrder[];
  summary: {
    total_orders: number;
    total_amount: number;
  };
  pagination: {
    page: number;
    page_size: number;
    total: number;
    pages: number;
  };
}

export default function PurchaseOrderListPage() {
  const { company } = useAuth();
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summaryData, setSummaryData] = useState({
    total_orders: 0,
    total_amount: 0,
  });
  const [pagination, setPagination] = useState({
    page: 1,
    page_size: 10,
    total: 0,
    pages: 1,
  });

  // Filter and search states
  const [searchTerm, setSearchTerm] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [showFilters, setShowFilters] = useState(false);
  const [activeActionMenu, setActiveActionMenu] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [converting, setConverting] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Get token from localStorage
  const getToken = () => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("access_token");
    }
    return null;
  };

  const convertToINR = (amount: number, currency: string, exchangeRate: number = 1): number => {
  if (currency === 'INR') {
    return amount;
  }
    return amount * exchangeRate;
};

const formatCurrencyINR = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
  }).format(amount);
};
  // Fetch purchase orders from API
  const fetchPurchaseOrders = async () => {
    try {
      const token = getToken();
      if (!company?.id || !token) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      
      // Build query parameters
      const params = new URLSearchParams();
      params.append("page", pagination.page.toString());
      params.append("page_size", pagination.page_size.toString());
      
      if (searchTerm) {
        params.append("search", searchTerm);
      }
      if (statusFilter) {
        params.append("status", statusFilter);
      }
      if (fromDate) {
        params.append("from_date", fromDate);
      }
      if (toDate) {
        params.append("to_date", toDate);
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/companies/${company.id}/orders/purchase?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Unauthorized - Please login again");
        }
        if (response.status === 404) {
          throw new Error("Company not found");
        }
        throw new Error(`Failed to fetch purchase orders: ${response.statusText}`);
      }

      const data: PurchaseOrderResponse = await response.json();
      
      if (data.purchases) {
        setPurchaseOrders(data.purchases);
        setSummaryData(data.summary);
        setPagination(data.pagination);
      } else {
        throw new Error("Invalid response format");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load purchase orders");
      console.error("Error fetching purchase orders:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Delete purchase order
  const deletePurchaseOrder = async (id: string) => {
    if (!confirm("Are you sure you want to delete this purchase order?")) {
      return;
    }

    try {
      const token = getToken();
      if (!company?.id || !token) {
        throw new Error("Authentication required");
      }

      setDeleting(id);
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/companies/${company.id}/orders/purchase/${id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        // Refresh the list
        fetchPurchaseOrders();
        alert("Purchase order deleted successfully");
      } else {
        const error = await response.json();
        throw new Error(error.detail || "Failed to delete purchase order");
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete purchase order");
      console.error("Error deleting purchase order:", err);
    } finally {
      setDeleting(null);
      setActiveActionMenu(null);
    }
  };

  // Convert to invoice
  const handleConvertToInvoice = async (orderId: string) => {
    if (!confirm("Convert this purchase order to an invoice?")) {
      return;
    }

    try {
      const token = getToken();
      if (!company?.id || !token) {
        throw new Error("Authentication required");
      }

      setConverting(orderId);
      // TODO: Update this endpoint based on your API
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/companies/${company.id}/orders/purchase/${orderId}/convert-to-invoice`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        alert("Purchase order converted to invoice successfully!");
        fetchPurchaseOrders(); // Refresh the list
      } else {
        const error = await response.json();
        alert(error.detail || "Failed to convert to invoice");
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to convert to invoice");
      console.error("Error converting to invoice:", err);
    } finally {
      setConverting(null);
      setActiveActionMenu(null);
    }
  };

  // Print purchase order
  const handlePrint = (orderId: string) => {
    window.open(`/purchase/purchase-orders/${orderId}/print`, "_blank");
  };

  // Download PDF
  const handlePDF = (orderId: string) => {
    window.open(`/purchase/purchase-orders/${orderId}/pdf`, "_blank");
  };

  // Initialize
  useEffect(() => {
    if (company?.id) {
      fetchPurchaseOrders();
    }
  }, [company?.id]);

  // Fetch data when pagination or filters change
  useEffect(() => {
    if (company?.id) {
      fetchPurchaseOrders();
    }
  }, [company?.id, pagination.page, statusFilter, fromDate, toDate]);

  // Click outside handlers for dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.action-dropdown-container')) {
        setActiveActionMenu(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Export functions
  const copyToClipboard = async () => {
    const filtered = purchaseOrders;
    const headers = ["Purchase Order Date", "Purchase Order Code", "Purchase Order Status", "Reference No.", "Supplier Name", "Total", "Created by"];

    const rows = filtered.map(order => [
      formatDate(order.order_date),
      order.order_number,
      getStatusText(order.status),
      order.reference_number || "",
      order.vendor_name || "",
       formatCurrencyINR(convertToINR(order.total_amount, order.currency, order.exchange_rate || 1)),

        order.creator_name || order.created_by || "System"
    ]);

    const text = [headers.join("\t"), ...rows.map(r => r.join("\t"))].join("\n");

    await navigator.clipboard.writeText(text);
    alert("Purchase order data copied to clipboard");
  };

  const exportExcel = () => {
    const filtered = purchaseOrders;
 const exportData = filtered.map(order => ({
  "Purchase Order Date": formatDate(order.order_date),
  "Purchase Order Code": order.order_number,
  "Purchase Order Status": getStatusText(order.status),
  "Reference No.": order.reference_number || "",
  "Supplier Name": order.vendor_name || "",
  "Total (Original Currency)": order.total_amount,
  "Original Currency": order.currency,
  "Exchange Rate": order.exchange_rate || 1,
  "Total (INR)": convertToINR(order.total_amount, order.currency, order.exchange_rate || 1),
  "Created by": order.creator_name || order.created_by || "System",
  "Created At": formatDate(order.created_at),
}));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "PurchaseOrders");
    XLSX.writeFile(wb, "purchase_orders.xlsx");
  };

  const exportPDF = () => {
    const filtered = purchaseOrders;
    const doc = new jsPDF();

    autoTable(doc, {
      head: [["Purchase Order Date", "Purchase Order Code", "Purchase Order Status", "Reference No.", "Supplier Name", "Total", "Created by"]],
      body: filtered.map(order => [
        formatDate(order.order_date),
        order.order_number,
        getStatusText(order.status),
        order.reference_number || "",
        order.vendor_name || "",
         formatCurrencyINR(convertToINR(order.total_amount, order.currency, order.exchange_rate || 1)),

         order.creator_name || order.created_by || "System"
      ])
    });

    doc.save("purchase_orders.pdf");
  };

  const exportCSV = () => {
    const filtered = purchaseOrders;
   const exportData = filtered.map(order => ({
  "Purchase Order Date": formatDate(order.order_date),
  "Purchase Order Code": order.order_number,
  "Purchase Order Status": getStatusText(order.status),
  "Reference No.": order.reference_number || "",
  "Supplier Name": order.vendor_name || "",
  "Total (Original Currency)": order.total_amount,
  "Original Currency": order.currency,
  "Exchange Rate": order.exchange_rate || 1,
  "Total (INR)": convertToINR(order.total_amount, order.currency, order.exchange_rate || 1),
  "Created by": order.creator_name || order.created_by || "System",
  "Created At": formatDate(order.created_at),
}));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    saveAs(blob, "purchase_orders.csv");
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency || 'INR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusText = (status: string) => {
    switch (status?.toLowerCase()) {
      case "draft": return "Draft";
      case "confirmed": return "Confirmed";
      case "partially_fulfilled": return "Partially Fulfilled";
      case "fulfilled": return "Fulfilled";
      case "cancelled": return "Cancelled";
      default: return status || "Draft";
    }
  };

  const getOrderStatusBadge = (status: string) => {
    const statusText = getStatusText(status);
    
    switch (status?.toLowerCase()) {
      case "confirmed":
      case "fulfilled":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
            <CheckCircle className="w-3 h-3 mr-1" />
            {statusText}
          </span>
        );
      case "draft":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
            <Clock className="w-3 h-3 mr-1" />
            {statusText}
          </span>
        );
      case "partially_fulfilled":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
            <CheckCircle className="w-3 h-3 mr-1" />
            {statusText}
          </span>
        );
      case "cancelled":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
            <XCircle className="w-3 h-3 mr-1" />
            {statusText}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400">
            {statusText}
          </span>
        );
    }
  };

  // Handle search with debounce
  useEffect(() => {
    if (!company?.id) return;
    
    const timeoutId = setTimeout(() => {
      setPagination(prev => ({ ...prev, page: 1 }));
      fetchPurchaseOrders();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  // Show company selection message if no company is selected
  if (!company?.id) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center max-w-md p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
          <Building2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No Company Selected</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Please select a company to view purchase orders.
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-opacity-90 transition"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (loading && !refreshing && purchaseOrders.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading purchase orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header with Company Info */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Building2 className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {company.name}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Purchase Order List
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Manage and track all purchase orders
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setRefreshing(true);
                fetchPurchaseOrders();
              }}
              disabled={refreshing}
              className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <Link
              href="/purchase/purchase-orders/new"
              className="px-4 py-2 transition bg-primary hover:bg-opacity-90 text-white rounded-lg flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Add Purchase Order
            </Link>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="px-6 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Total Orders */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {summaryData.total_orders}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Total Purchase Orders
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>

          {/* Total Order Amount */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatCurrency(summaryData.total_amount, "INR")}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Total Purchase Amount
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="px-6">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
            <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
              <AlertCircle className="w-5 h-5" />
              <p>{error}</p>
              <button
                onClick={() => setError(null)}
                className="ml-auto text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="px-6 py-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by order number, supplier, reference..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
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
              <FileDown className="w-5 h-5" />
              Excel
            </button>

            <button
              onClick={exportPDF}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors flex items-center gap-2"
            >
              <FileDown className="w-5 h-5" />
              PDF
            </button>

            <button
              onClick={exportCSV}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors flex items-center gap-2"
            >
              <FileDown className="w-5 h-5" />
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
            {/* From Date */}
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="date"
                value={fromDate}
                onChange={(e) => {
                  setFromDate(e.target.value);
                  setPagination(prev => ({ ...prev, page: 1 }));
                }}
                className="pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
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
                  setPagination(prev => ({ ...prev, page: 1 }));
                }}
                className="pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="To Date"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPagination(prev => ({ ...prev, page: 1 }));
              }}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="">All Status</option>
              <option value="draft">Draft</option>
              <option value="confirmed">Confirmed</option>
              <option value="partially_fulfilled">Partially Fulfilled</option>
              <option value="fulfilled">Fulfilled</option>
              <option value="cancelled">Cancelled</option>
            </select>

            <button
              onClick={() => {
                setFromDate("");
                setToDate("");
                setStatusFilter("");
                setSearchTerm("");
                setPagination(prev => ({ ...prev, page: 1 }));
              }}
              className="text-sm text-primary hover:underline"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="p-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto max-w-full">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-200 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left px-6 py-3 text-sm font-semibold text-gray-600 dark:text-gray-300">
                    Purchase Order Date
                  </th>
                  <th className="text-left px-6 py-3 text-sm font-semibold text-gray-600 dark:text-gray-300">
                    Purchase Order Code
                  </th>
                  <th className="text-left px-6 py-3 text-sm font-semibold text-gray-600 dark:text-gray-300">
                    Purchase Order Status
                  </th>
                  <th className="text-left px-6 py-3 text-sm font-semibold text-gray-600 dark:text-gray-300">
                    Reference No.
                  </th>
                  <th className="text-left px-6 py-3 text-sm font-semibold text-gray-600 dark:text-gray-300">
                    Supplier Name
                  </th>
                  <th className="text-left px-6 py-3 text-sm font-semibold text-gray-600 dark:text-gray-300">
                    Total
                  </th>
                  <th className="text-left px-6 py-3 text-sm font-semibold text-gray-600 dark:text-gray-300">
                    Created by
                  </th>
                  <th className="text-right px-6 py-3 text-sm font-semibold text-gray-600 dark:text-gray-300">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {purchaseOrders.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                      <div className="flex flex-col items-center justify-center">
                        <ShoppingBag className="w-12 h-12 text-gray-400 mb-2" />
                        <p className="text-lg font-medium text-gray-900 dark:text-white mb-1">
                          {refreshing ? "Refreshing..." : "No purchase orders found"}
                        </p>
                        <p className="text-gray-500 dark:text-gray-400">
                          {refreshing 
                            ? "Fetching latest data..." 
                            : "Try adjusting your filters or add a new purchase order"}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  purchaseOrders.map((order) => (
                    <tr
                      key={order.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <td className="px-6 py-4 text-gray-700 dark:text-gray-300">
                        {formatDate(order.order_date)}
                      </td>
                      <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                        <Link 
                          href={`/purchase/purchase-orders/${order.id}`}
                          className="hover:text-primary hover:underline"
                        >
                          {order.order_number}
                        </Link>
                      </td>
                      <td className="px-6 py-4">
                        {getOrderStatusBadge(order.status)}
                      </td>
                      <td className="px-6 py-4 text-gray-700 dark:text-gray-300">
                        {order.reference_number || "-"}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-700 dark:text-gray-300">
                            {order.vendor_name || "N/A"}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
  <div className="flex flex-col">
    {/* Original amount with currency */}
    {order.currency == 'INR' && (
    <span className="font-medium text-gray-900 dark:text-white">
      {formatCurrency(order.total_amount, order.currency)}
    </span>
     )}
    {/* Converted to INR */}
    {order.currency !== 'INR' && (
      <span className="font-medium text-gray-900 dark:text-white">
         {formatCurrencyINR(convertToINR(order.total_amount, order.currency, order.exchange_rate || 1))}
      </span>
    )}
  </div>
</td>
                     
                       <td className="px-6 py-4">
  <div className="flex items-center gap-2">
    <User className="w-4 h-4 text-gray-400" />
    <span className="text-gray-700 dark:text-gray-300">
      {/* Use creator_name if available, otherwise fallback to created_by */}
      {order.creator_name || order.created_by || "System"}
    </span>
  </div>
</td>
                    
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* View Button */}
                          <Link
                            href={`/purchase/purchase-orders/${order.id}`}
                            className="p-2 rounded-lg text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            title="View"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>

                          {/* Edit Button (only for draft orders) */}
                          {order.status === "draft" && (
                            <Link
                              href={`/purchase/purchase-orders/edit/${order.id}`}
                              className="p-2 rounded-lg text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                              title="Edit"
                            >
                              <Edit className="w-4 h-4" />
                            </Link>
                          )}

                          {/* Convert to Invoice Button */}
                          <button
                            onClick={() => handleConvertToInvoice(order.id)}
                            disabled={converting === order.id}
                            className="p-2 rounded-lg text-gray-500 hover:text-purple-600 dark:text-gray-400 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors disabled:opacity-50"
                            title="Convert to Invoice"
                          >
                            {converting === order.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Receipt className="w-4 h-4" />
                            )}
                          </button>

                          {/* Print Button */}
                          <button
                            onClick={() => handlePrint(order.id)}
                            className="p-2 rounded-lg text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            title="Print"
                          >
                            <Printer className="w-4 h-4" />
                          </button>

                          {/* PDF Button */}
                          <button
                            onClick={() => handlePDF(order.id)}
                            className="p-2 rounded-lg text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                            title="Download PDF"
                          >
                            <FileDown className="w-4 h-4" />
                          </button>

                          {/* Delete Button (only for draft orders) */}
                          {order.status === "draft" && (
                            <button
                              onClick={() => deletePurchaseOrder(order.id)}
                              disabled={deleting === order.id}
                              className="p-2 rounded-lg text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
                              title="Delete"
                            >
                              {deleting === order.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                            </button>
                          )}

                          {/* Dropdown for more actions (mobile) */}
                          <div className="relative action-dropdown-container">
                            <button
                              onClick={() => setActiveActionMenu(activeActionMenu === order.id ? null : order.id)}
                              className="p-2 rounded-lg text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors md:hidden"
                              title="More actions"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>

                            {/* Dropdown menu for mobile */}
                            {activeActionMenu === order.id && (
                              <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-20 md:hidden">
                                <Link
                                  href={`/purchase/purchase-orders/${order.id}`}
                                  onClick={() => setActiveActionMenu(null)}
                                  className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                >
                                  <Eye className="w-4 h-4" />
                                  View
                                </Link>
                                
                                {order.status === "draft" && (
                                  <>
                                    <Link
                                      href={`/purchase/purchase-orders/edit/${order.id}`}
                                      onClick={() => setActiveActionMenu(null)}
                                      className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                    >
                                      <Edit className="w-4 h-4" />
                                      Edit
                                    </Link>
                                    
                                    <button
                                      onClick={() => {
                                        setActiveActionMenu(null);
                                        deletePurchaseOrder(order.id);
                                      }}
                                      disabled={deleting === order.id}
                                      className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30"
                                    >
                                      {deleting === order.id ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                      ) : (
                                        <Trash2 className="w-4 h-4" />
                                      )}
                                      Delete
                                    </button>
                                  </>
                                )}
                                
                                <button
                                  onClick={() => {
                                    setActiveActionMenu(null);
                                    handleConvertToInvoice(order.id);
                                  }}
                                  disabled={converting === order.id}
                                  className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                >
                                  {converting === order.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <Receipt className="w-4 h-4" />
                                  )}
                                  Convert to Invoice
                                </button>
                                
                                <button
                                  onClick={() => {
                                    setActiveActionMenu(null);
                                    handlePrint(order.id);
                                  }}
                                  className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                >
                                  <Printer className="w-4 h-4" />
                                  Print
                                </button>
                                
                                <button
                                  onClick={() => {
                                    setActiveActionMenu(null);
                                    handlePDF(order.id);
                                  }}
                                  className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                                >
                                  <FileDown className="w-4 h-4" />
                                  Download PDF
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {pagination.total > pagination.page_size && (
          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Showing {((pagination.page - 1) * pagination.page_size) + 1} to{" "}
              {Math.min(pagination.page * pagination.page_size, pagination.total)} of {pagination.total} results
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>

              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page >= pagination.pages}
                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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