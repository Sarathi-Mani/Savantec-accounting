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
} from "lucide-react";

export default function PurchaseOrderListPage() {
  // Sample data for purchase orders
  const [purchaseOrders, setPurchaseOrders] = useState([
    {
      id: "1",
      orderDate: "2024-01-10",
      orderCode: "PO-001",
      orderStatus: "Approved",
      referenceNo: "REF-001",
      supplierName: "ABC Suppliers",
      total: 15000,
      createdBy: "John Doe",
      currencyCode: "USD",
    },
    {
      id: "2",
      orderDate: "2024-01-15",
      orderCode: "PO-002",
      orderStatus: "Pending",
      referenceNo: "REF-002",
      supplierName: "XYZ Corporation",
      total: 25000,
      createdBy: "Jane Smith",
      currencyCode: "USD",
    },
    {
      id: "3",
      orderDate: "2024-01-20",
      orderCode: "PO-003",
      orderStatus: "Cancelled",
      referenceNo: "REF-003",
      supplierName: "Global Traders",
      total: 18000,
      createdBy: "Robert Johnson",
      currencyCode: "USD",
    },
    {
      id: "4",
      orderDate: "2024-01-25",
      orderCode: "PO-004",
      orderStatus: "Approved",
      referenceNo: "REF-004",
      supplierName: "Tech Solutions Ltd",
      total: 32000,
      createdBy: "Sarah Wilson",
      currencyCode: "USD",
    },
    {
      id: "5",
      orderDate: "2024-02-01",
      orderCode: "PO-005",
      orderStatus: "Delivered",
      referenceNo: "REF-005",
      supplierName: "ABC Suppliers",
      total: 12500,
      createdBy: "Mike Brown",
      currencyCode: "USD",
    },
    {
      id: "6",
      orderDate: "2024-02-05",
      orderCode: "PO-006",
      orderStatus: "Approved",
      referenceNo: "REF-006",
      supplierName: "Global Traders",
      total: 22000,
      createdBy: "Emily Davis",
      currencyCode: "USD",
    },
    {
      id: "7",
      orderDate: "2024-02-10",
      orderCode: "PO-007",
      orderStatus: "Pending",
      referenceNo: "REF-007",
      supplierName: "XYZ Corporation",
      total: 18500,
      createdBy: "David Miller",
      currencyCode: "USD",
    },
    {
      id: "8",
      orderDate: "2024-02-15",
      orderCode: "PO-008",
      orderStatus: "Delivered",
      referenceNo: "REF-008",
      supplierName: "Tech Solutions Ltd",
      total: 27500,
      createdBy: "Lisa Anderson",
      currencyCode: "USD",
    },
  ]);

  // Sample users for filter
  const [users] = useState([
    { id: "1", name: "John Doe" },
    { id: "2", name: "Jane Smith" },
    { id: "3", name: "Robert Johnson" },
    { id: "4", name: "Sarah Wilson" },
    { id: "5", name: "Mike Brown" },
    { id: "6", name: "Emily Davis" },
    { id: "7", name: "David Miller" },
    { id: "8", name: "Lisa Anderson" },
  ]);

  const [searchTerm, setSearchTerm] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [userFilter, setUserFilter] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [activeActionMenu, setActiveActionMenu] = useState<string | null>(null);

  const pageSize = 10;

  // Column visibility state
  const [visibleColumns, setVisibleColumns] = useState({
    orderDate: true,
    orderCode: true,
    orderStatus: true,
    referenceNo: true,
    supplierName: true,
    total: true,
    createdBy: true,
    actions: true,
  });

  const [showColumnDropdown, setShowColumnDropdown] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.column-dropdown-container')) {
        setShowColumnDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Export functions
  const copyToClipboard = async () => {
    const filtered = filteredPurchaseOrders;
    const headers = ["Purchase Order Date", "Purchase Order Code", "Purchase Order Status", "Reference No", "Supplier Name", "Total", "Created By"];

    const rows = filtered.map(order => [
      formatDate(order.orderDate),
      order.orderCode,
      order.orderStatus,
      order.referenceNo,
      order.supplierName,
      `$${order.total.toLocaleString()}`,
      order.createdBy
    ]);

    const text = [headers.join("\t"), ...rows.map(r => r.join("\t"))].join("\n");

    await navigator.clipboard.writeText(text);
    alert("Purchase order data copied to clipboard");
  };

  const exportExcel = () => {
    const filtered = filteredPurchaseOrders;
    const exportData = filtered.map(order => ({
      "Purchase Order Date": formatDate(order.orderDate),
      "Purchase Order Code": order.orderCode,
      "Purchase Order Status": order.orderStatus,
      "Reference No": order.referenceNo,
      "Supplier Name": order.supplierName,
      "Total": order.total,
      "Currency Code": order.currencyCode,
      "Created By": order.createdBy,
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "PurchaseOrders");
    XLSX.writeFile(wb, "purchase_orders.xlsx");
  };

  const exportPDF = () => {
    const filtered = filteredPurchaseOrders;
    const doc = new jsPDF();

    autoTable(doc, {
      head: [["Purchase Order Date", "Purchase Order Code", "Purchase Order Status", "Reference No", "Supplier Name", "Total", "Created By"]],
      body: filtered.map(order => [
        formatDate(order.orderDate),
        order.orderCode,
        order.orderStatus,
        order.referenceNo,
        order.supplierName,
        `$${order.total.toLocaleString()}`,
        order.createdBy
      ])
    });

    doc.save("purchase_orders.pdf");
  };

  const exportCSV = () => {
    const filtered = filteredPurchaseOrders;
    const exportData = filtered.map(order => ({
      "Purchase Order Date": formatDate(order.orderDate),
      "Purchase Order Code": order.orderCode,
      "Purchase Order Status": order.orderStatus,
      "Reference No": order.referenceNo,
      "Supplier Name": order.supplierName,
      "Total": order.total,
      "Currency Code": order.currencyCode,
      "Created By": order.createdBy,
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    saveAs(blob, "purchase_orders.csv");
  };

  const toggleColumn = (key: keyof typeof visibleColumns) => {
    setVisibleColumns(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Summary data
  const summaryData = {
    totalInvoices: purchaseOrders.length,
    totalInvoiceAmount: purchaseOrders.reduce((sum, order) => sum + order.total, 0),
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getOrderStatusBadge = (status: string) => {
    switch (status) {
      case "Approved":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
            <CheckCircle className="w-3 h-3 mr-1" />
            Approved
          </span>
        );
      case "Pending":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </span>
        );
      case "Delivered":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
            <CheckCircle className="w-3 h-3 mr-1" />
            Delivered
          </span>
        );
      case "Cancelled":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
            <XCircle className="w-3 h-3 mr-1" />
            Cancelled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400">
            {status}
          </span>
        );
    }
  };

  const filteredPurchaseOrders = purchaseOrders.filter((order) => {
    const matchesSearch =
      order.orderCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.supplierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.referenceNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.createdBy.toLowerCase().includes(searchTerm.toLowerCase());

    const orderDate = new Date(order.orderDate);
    const matchesFromDate = !fromDate || orderDate >= new Date(fromDate);
    const matchesToDate = !toDate || orderDate <= new Date(toDate);
    const matchesUser = !userFilter || order.createdBy === userFilter;

    return matchesSearch && matchesFromDate && matchesToDate && matchesUser;
  });

  const paginatedOrders = filteredPurchaseOrders.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  const totalAmount = filteredPurchaseOrders.reduce((sum, order) => sum + order.total, 0);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Purchase Order List
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Manage and track all purchase orders
            </p>
          </div>
          <Link
            href="/purchase/purchase-orders/new"
            className="px-4 py-2 transition bg-primary hover:bg-opacity-90 text-white rounded-lg flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Add Purchase Order
          </Link>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="px-6 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Total Invoices */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {summaryData.totalInvoices}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Total Invoices
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>

          {/* Total Invoice Amount */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  ${summaryData.totalInvoiceAmount.toLocaleString()}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Total Invoice Amount
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-green-600 dark:text-green-400" />
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
                placeholder="Search by order code, supplier, reference, or creator..."
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
                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors flex items-center gap-2"
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
                  setPage(1);
                }}
                className="pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="To Date"
              />
            </div>

            {/* Users Dropdown */}
            <select
              value={userFilter}
              onChange={(e) => {
                setUserFilter(e.target.value);
                setPage(1);
              }}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="">All Users</option>
              {users.map((user) => (
                <option key={user.id} value={user.name}>
                  {user.name}
                </option>
              ))}
            </select>

            <button
              onClick={() => {
                setFromDate("");
                setToDate("");
                setUserFilter("");
                setPage(1);
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
            <table className="w-full  table-fixed">
              <thead>
                <tr className="bg-gray-200 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                  {visibleColumns.orderDate && (
                    <th className="text-left px-6 py-3 text-sm font-semibold text-gray-600 dark:text-gray-300">
                      Purchase Order Date
                    </th>
                  )}
                  {visibleColumns.orderCode && (
                    <th className="text-left px-6 py-3 text-sm font-semibold text-gray-600 dark:text-gray-300">
                      Purchase Order Code
                    </th>
                  )}
                  {visibleColumns.orderStatus && (
                    <th className="text-left px-6 py-3 text-sm font-semibold text-gray-600 dark:text-gray-300">
                      Purchase Order Status
                    </th>
                  )}
                  {visibleColumns.referenceNo && (
                    <th className="text-left px-6 py-3 text-sm font-semibold text-gray-600 dark:text-gray-300">
                      Reference No
                    </th>
                  )}
                  {visibleColumns.supplierName && (
                    <th className="text-left px-6 py-3 text-sm font-semibold text-gray-600 dark:text-gray-300">
                      Supplier Name
                    </th>
                  )}
                  {visibleColumns.total && (
                    <th className="text-left px-6 py-3 text-sm font-semibold text-gray-600 dark:text-gray-300">
                      Total
                    </th>
                  )}
                  {visibleColumns.createdBy && (
                    <th className="text-left px-6 py-3 text-sm font-semibold text-gray-600 dark:text-gray-300">
                      Created By
                    </th>
                  )}
                  {visibleColumns.actions && (
                    <th className="text-right px-6 py-3 text-sm font-semibold text-gray-600 dark:text-gray-300">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700 text-xs text-gray-700 dark:text-gray-300">
                {paginatedOrders.length === 0 ? (
                  <tr>
                    <td colSpan={Object.values(visibleColumns).filter(Boolean).length} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                      <div className="flex flex-col items-center justify-center">
                        <ShoppingBag className="w-12 h-12 text-gray-400 mb-2" />
                        <p className="text-lg font-medium text-gray-900 dark:text-white mb-1">
                          No purchase orders found
                        </p>
                        <p className="text-gray-500 dark:text-gray-400">
                          Try adjusting your filters or add a new purchase order
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedOrders.map((order) => (
                    <tr
                      key={order.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      {visibleColumns.orderDate && (
                        <td className="px-2.5 py-4 text-gray-700 dark:text-gray-300">
                          {formatDate(order.orderDate)}
                        </td>
                      )}
                      {visibleColumns.orderCode && (
                        <td className="px-2.5 py-4 font-medium text-gray-900 dark:text-white">
                          {order.orderCode}
                        </td>
                      )}
                      {visibleColumns.orderStatus && (
                        <td className="px-2.5 py-4">
                          {getOrderStatusBadge(order.orderStatus)}
                        </td>
                      )}
                      {visibleColumns.referenceNo && (
                        <td className="px-2.5 py-4 text-gray-700 dark:text-gray-300">
                          {order.referenceNo}
                        </td>
                      )}
                      {visibleColumns.supplierName && (
                        <td className="px-2.5 py-4">
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-700 dark:text-gray-300">
                              {order.supplierName}
                            </span>
                          </div>
                        </td>
                      )}
                      {visibleColumns.total && (
                        <td className="px-2.5 py-4 font-medium text-gray-900 dark:text-white">
                          ${order.total.toLocaleString()}
                        </td>
                      )}
                      {visibleColumns.createdBy && (
                        <td className="px-2.5 py-4">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-700 dark:text-gray-300">
                              {order.createdBy}
                            </span>
                          </div>
                        </td>
                      )}
                      {visibleColumns.actions && (
                        <td className="px-6 py-4 text-right">
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
                                className="absolute right-0 mt-2 w-40 bg-white dark:bg-gray-800
          border border-gray-200 dark:border-gray-700
          rounded-lg shadow-lg z-20"
                              >
                                <Link
                                  href={`/purchase/purchase-orders/${order.id}`}
                                  onClick={() => setActiveActionMenu(null)}
                                  className="flex items-center gap-2 px-4 py-2 text-sm
            text-gray-700 dark:text-gray-300
            hover:bg-gray-100 dark:hover:bg-gray-700"
                                >
                                  <Eye className="w-4 h-4" />
                                  View
                                </Link>

                                <Link
                                  href={`/purchase/purchase-orders/edit/${order.id}`}
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
                                    // handleDelete(order.id);
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
                  ))
                )}
              </tbody>
              {paginatedOrders.length > 0 && visibleColumns.total && (
                <tfoot>
                  <tr className="bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700">
                    <td
                      colSpan={
                        Object.values(visibleColumns).filter(Boolean).length -
                        (visibleColumns.total ? 1 : 0) -
                        (visibleColumns.actions ? 1 : 0)
                      }
                      className="px-6 py-4 text-right font-semibold text-gray-900 dark:text-white"
                    >
                      Total Amount:
                    </td>
                    <td className="px-6 py-4 font-bold text-gray-900 dark:text-white">
                      ${totalAmount.toLocaleString()}
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

        {/* Pagination */}
        {filteredPurchaseOrders.length > pageSize && (
          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Showing {(page - 1) * pageSize + 1} to{" "}
              {Math.min(page * pageSize, filteredPurchaseOrders.length)} of {filteredPurchaseOrders.length} results
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>

              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page * pageSize >= filteredPurchaseOrders.length}
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