"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { saveAs } from "file-saver";
import { addPdfPageNumbers, getProfessionalTableTheme } from "@/utils/pdfTheme";
import { useAuth } from "@/context/AuthContext";
import { purchasesApi, PurchaseInvoice } from "@/services/api";
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
} from "lucide-react";

export default function PurchaseListPage() {
  const { company } = useAuth();

  type PurchaseRow = {
    id: string;
    purchaseDate: string;
    dueDate: string;
    purchaseCode: string;
    purchaseStatus: "Received" | "Pending";
    referenceNo: string;
    supplierName: string;
    total: number;
    currencyCode: string;
    paidAmount: number;
    paymentStatus: "Paid" | "Partial" | "Unpaid";
    rawStatus: string;
  };

  const [purchases, setPurchases] = useState<PurchaseRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [supplierFilter, setSupplierFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [activeActionMenu, setActiveActionMenu] = useState<string | null>(null);

  // Export loading states
  const [copyLoading, setCopyLoading] = useState(false);
  const [excelLoading, setExcelLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [csvLoading, setCsvLoading] = useState(false);

  const pageSize = 10;

  // Column visibility state
  const [visibleColumns, setVisibleColumns] = useState({
    purchaseDate: true,
    dueDate: true,
    purchaseCode: true,
    purchaseStatus: true,
    referenceNo: true,
    supplierName: true,
    total: true,
    currencyCode: true,
    paidAmount: true,
    paymentStatus: true,
    actions: true,
  });

  const [showColumnDropdown, setShowColumnDropdown] = useState(false);

  const mapPurchaseToRow = (purchase: PurchaseInvoice): PurchaseRow => {
    const total = Number(purchase.total_amount || 0);
    const paid = Number(purchase.amount_paid || 0);
    const balance = Number(purchase.balance_due || 0);
    const rawStatus = String(purchase.status || "").toLowerCase();
    const purchaseStatus: "Received" | "Pending" =
      rawStatus === "approved" || rawStatus === "paid" || rawStatus === "partially_paid"
        ? "Received"
        : "Pending";
    const paymentStatus: "Paid" | "Partial" | "Unpaid" =
      balance <= 0 ? "Paid" : paid > 0 ? "Partial" : "Unpaid";

    return {
      id: purchase.id,
      purchaseDate: purchase.invoice_date,
      dueDate: purchase.due_date || purchase.invoice_date,
      purchaseCode: purchase.invoice_number || `PUR-${purchase.id.slice(0, 8).toUpperCase()}`,
      purchaseStatus,
      referenceNo: purchase.vendor_invoice_number || "-",
      supplierName: purchase.vendor_name || "Unknown Vendor",
      total,
      currencyCode: "INR",
      paidAmount: paid,
      paymentStatus,
      rawStatus,
    };
  };

  const fetchPurchases = async () => {
    if (!company?.id) {
      setPurchases([]);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const pageSize = 100;
      let pageNum = 1;
      let allItems: PurchaseInvoice[] = [];

      while (true) {
        const response = await purchasesApi.list(company.id, {
          page: pageNum,
          page_size: pageSize,
          from_date: fromDate || undefined,
          to_date: toDate || undefined,
        });

        const batch = response.items || [];
        allItems = allItems.concat(batch);

        if (pageNum >= (response.total_pages || 1) || batch.length < pageSize) break;
        pageNum += 1;
      }

      setPurchases(allItems.map(mapPurchaseToRow));
    } catch (err) {
      console.error("Failed to load purchases:", err);
      setError("Failed to load purchase invoices from backend");
      setPurchases([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPurchases();
  }, [company?.id, fromDate, toDate]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;

      if (!target.closest(".action-dropdown-container")) {
        setActiveActionMenu(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);


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
    if (copyLoading) return;
    setCopyLoading(true);
    try {
      const filtered = filteredPurchases;
      const headers = ["Purchase Date", "Due Date", "Purchase Code", "Purchase Status", "Reference No", "Supplier Name", "Total", "Currency Code", "Paid Payment", "Payment Status"];

      const rows = filtered.map(purchase => [
        formatDate(purchase.purchaseDate),
        formatDate(purchase.dueDate),
        purchase.purchaseCode,
        purchase.purchaseStatus,
        purchase.referenceNo,
        purchase.supplierName,
        `$${purchase.total.toLocaleString()}`,
        purchase.currencyCode,
        `$${purchase.paidAmount.toLocaleString()}`,
        purchase.paymentStatus
      ]);

      const text = [headers.join("\t"), ...rows.map(r => r.join("\t"))].join("\n");

      await navigator.clipboard.writeText(text);
      alert("Purchase data copied to clipboard");
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
      const filtered = filteredPurchases;
      const exportData = filtered.map(purchase => ({
        "Purchase Date": formatDate(purchase.purchaseDate),
        "Due Date": formatDate(purchase.dueDate),
        "Purchase Code": purchase.purchaseCode,
        "Purchase Status": purchase.purchaseStatus,
        "Reference No": purchase.referenceNo,
        "Supplier Name": purchase.supplierName,
        "Total": purchase.total,
        "Currency Code": purchase.currencyCode,
        "Paid Payment": purchase.paidAmount,
        "Payment Status": purchase.paymentStatus,
        "Overdue": isOverdue(purchase.dueDate) ? "Yes" : "No"
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Purchases");
      XLSX.writeFile(wb, "purchases.xlsx");
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
      const filtered = filteredPurchases;
      const doc = new jsPDF();

      autoTable(doc, {
        ...getProfessionalTableTheme(doc, "Purchase List", "", "p"),
        head: [["Purchase Date", "Due Date", "Purchase Code", "Purchase Status", "Reference No", "Supplier Name", "Total", "Currency Code", "Paid Payment", "Payment Status"]],
        body: filtered.map(purchase => [
          formatDate(purchase.purchaseDate),
          formatDate(purchase.dueDate),
          purchase.purchaseCode,
          purchase.purchaseStatus,
          purchase.referenceNo,
          purchase.supplierName,
          `$${purchase.total.toLocaleString()}`,
          purchase.currencyCode,
          `$${purchase.paidAmount.toLocaleString()}`,
          purchase.paymentStatus
        ])
      });

      addPdfPageNumbers(doc, "p");
      doc.save("purchases.pdf");
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
      const filtered = filteredPurchases;
      const exportData = filtered.map(purchase => ({
        "Purchase Date": formatDate(purchase.purchaseDate),
        "Due Date": formatDate(purchase.dueDate),
        "Purchase Code": purchase.purchaseCode,
        "Purchase Status": purchase.purchaseStatus,
        "Reference No": purchase.referenceNo,
        "Supplier Name": purchase.supplierName,
        "Total": purchase.total,
        "Currency Code": purchase.currencyCode,
        "Paid Payment": purchase.paidAmount,
        "Payment Status": purchase.paymentStatus
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const csv = XLSX.utils.sheet_to_csv(ws);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      saveAs(blob, "purchases.csv");
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

  // Summary data
  const summaryData = {
    totalInvoices: purchases.length,
    totalInvoiceAmount: purchases.reduce((sum, purchase) => sum + purchase.total, 0),
    totalPaidAmount: purchases.reduce((sum, purchase) => sum + purchase.paidAmount, 0),
    totalPurchaseDue: purchases.reduce((sum, purchase) => sum + (purchase.total - purchase.paidAmount), 0),
  };

  // Unique suppliers for filter
  const uniqueSuppliers = Array.from(new Set(purchases.map(p => p.supplierName)));

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case "Paid":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
            <CheckCircle className="w-3 h-3 mr-1" />
            Paid
          </span>
        );
      case "Unpaid":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
            <XCircle className="w-3 h-3 mr-1" />
            Unpaid
          </span>
        );
      case "Partial":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
            <AlertCircle className="w-3 h-3 mr-1" />
            Partial
          </span>
        );
      default:
        return null;
    }
  };

  const getPurchaseStatusBadge = (status: string) => {
    switch (status) {
      case "Received":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
            <CheckCircle className="w-3 h-3 mr-1" />
            Received
          </span>
        );
      case "Pending":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </span>
        );
      default:
        return null;
    }
  };

  const isOverdue = (dueDate: string) => {
    const today = new Date();
    const due = new Date(dueDate);
    return due < today;
  };

  const filteredPurchases = purchases.filter((purchase) => {
    const search = searchTerm.trim().toLowerCase();
    const matchesSearch =
      purchase.purchaseCode.toLowerCase().includes(search) ||
      purchase.supplierName.toLowerCase().includes(search) ||
      purchase.referenceNo.toLowerCase().includes(search);

    const matchesSupplier = !supplierFilter || purchase.supplierName === supplierFilter;

    const purchaseDate = new Date(purchase.purchaseDate);
    const matchesFromDate = !fromDate || purchaseDate >= new Date(fromDate);
    const matchesToDate = !toDate || purchaseDate <= new Date(toDate);

    return matchesSearch && matchesSupplier && matchesFromDate && matchesToDate;
  });

  const paginatedPurchases = filteredPurchases.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  const totalAmount = filteredPurchases.reduce((sum, purchase) => sum + purchase.total, 0);

  return (
    <div className="w-full">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Purchase List
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Manage and track all purchase transactions
            </p>
          </div>
          <Link
            href="/purchase/new"
            className="px-4 py-2 transition bg-primary hover:bg-opacity-90 text-white rounded-lg flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Add Purchase
          </Link>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="px-6 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
                  Rs. {summaryData.totalInvoiceAmount.toLocaleString("en-IN")}
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

          {/* Total Paid Amount */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  Rs. {summaryData.totalPaidAmount.toLocaleString("en-IN")}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Total Paid Amount
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </div>

          {/* Total Purchase Due */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  Rs. {summaryData.totalPurchaseDue.toLocaleString("en-IN")}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Total Purchase Due
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-orange-600 dark:text-orange-400" />
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
                placeholder="Search by purchase code, supplier, or reference..."
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

            <button className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors flex items-center gap-2">
              <Printer className="w-5 h-5" />
              Print
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex flex-wrap gap-4">
            {/* Supplier Dropdown */}
            <select
              value={supplierFilter}
              onChange={(e) => {
                setSupplierFilter(e.target.value);
                setPage(1);
              }}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="">All Suppliers</option>
              {uniqueSuppliers.map((supplier) => (
                <option key={supplier} value={supplier}>
                  {supplier}
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

            <button
              onClick={() => {
                setSupplierFilter("");
                setFromDate("");
                setToDate("");
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
        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300">
            {error}
          </div>
        )}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="w-full">
            {/* TABLE */}
            <table className="w-full table-fixed">
              <div className="overflow-x-auto">
                <thead className="bg-gray-200 dark:bg-gray-700/50">
                  <tr className="text-sm font-semibold text-gray-700 dark:text-gray-300">

                    {visibleColumns.purchaseDate && (
                      <th className="text-left px-6 py-3 text-sm font-semibold text-gray-600 dark:text-gray-300">
                        Purchase Date
                      </th>
                    )}
                    {visibleColumns.dueDate && (
                      <th className="text-left px-6 py-3 text-sm font-semibold text-gray-600 dark:text-gray-300">
                        Due Date
                      </th>
                    )}
                    {visibleColumns.purchaseCode && (
                      <th className="text-left px-6 py-3 text-sm font-semibold text-gray-600 dark:text-gray-300">
                        Purchase Code
                      </th>
                    )}
                    {visibleColumns.purchaseStatus && (
                      <th className="text-left px-6 py-3 text-sm font-semibold text-gray-600 dark:text-gray-300">
                        Purchase Status
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
                    {visibleColumns.currencyCode && (
                      <th className="text-left px-6 py-3 text-sm font-semibold text-gray-600 dark:text-gray-300">
                        Currency Code
                      </th>
                    )}
                    {visibleColumns.paidAmount && (
                      <th className="text-left px-6 py-3 text-sm font-semibold text-gray-600 dark:text-gray-300">
                        Paid Payment
                      </th>
                    )}
                    {visibleColumns.paymentStatus && (
                      <th className="text-left px-6 py-3 text-sm font-semibold text-gray-600 dark:text-gray-300">
                        Payment Status
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
                  {loading ? (
                    <tr>
                      <td colSpan={Object.values(visibleColumns).filter(Boolean).length} className="px-6 py-8 text-center">
                        <div className="flex items-center justify-center">
                          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                        </div>
                      </td>
                    </tr>
                  ) : paginatedPurchases.length === 0 ? (
                    <tr>
                      <td colSpan={Object.values(visibleColumns).filter(Boolean).length} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                        <div className="flex flex-col items-center justify-center">
                          <ShoppingBag className="w-12 h-12 text-gray-400 mb-2" />
                          <p className="text-lg font-medium text-gray-900 dark:text-white mb-1">
                            No purchases found
                          </p>
                          <p className="text-gray-500 dark:text-gray-400">
                            Try adjusting your filters or add a new purchase
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedPurchases.map((purchase) => (
                      <tr
                        key={purchase.id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                      >
                        {visibleColumns.purchaseDate && (
                          <td className="px-2.5 py-4 text-gray-700 dark:text-gray-300">
                            {formatDate(purchase.purchaseDate)}
                          </td>
                        )}
                        {visibleColumns.dueDate && (
                          <td className="px-2.5 py-4">
                            <div className="flex flex-col gap-1">
                              <span className="text-gray-700 dark:text-gray-300">
                                {formatDate(purchase.dueDate)}
                              </span>

                              {isOverdue(purchase.dueDate) && (
                                <span className="inline-flex w-fit items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                                  Overdue
                                </span>
                              )}
                            </div>
                          </td>
                        )}

                        {visibleColumns.purchaseCode && (
                          <td className="px-2.5 py-4 font-medium text-gray-900 dark:text-white">
                            {purchase.purchaseCode}
                          </td>
                        )}
                        {visibleColumns.purchaseStatus && (
                          <td className="px-2.5 py-4">
                            {getPurchaseStatusBadge(purchase.purchaseStatus)}
                          </td>
                        )}
                        {visibleColumns.referenceNo && (
                          <td className="px-2.5 py-4 text-gray-700 dark:text-gray-300">
                            {purchase.referenceNo}
                          </td>
                        )}
                        {visibleColumns.supplierName && (
                          <td className="px-2.5 py-4">
                            <div className="flex items-center gap-2">
                              <Users className="w-4 h-4 text-gray-400" />
                              <span className="text-gray-700 dark:text-gray-300">
                                {purchase.supplierName}
                              </span>
                            </div>
                          </td>
                        )}
                        {visibleColumns.total && (
                          <td className="px-2.5 py-4 font-medium text-gray-900 dark:text-white">
                            Rs. {purchase.total.toLocaleString("en-IN")}
                          </td>
                        )}
                        {visibleColumns.currencyCode && (
                          <td className="px-2.5 py-4 text-gray-700 dark:text-gray-300">
                            {purchase.currencyCode}
                          </td>
                        )}
                        {visibleColumns.paidAmount && (
                          <td className="px-2.5 py-4 font-medium text-gray-900 dark:text-white">
                            Rs. {purchase.paidAmount.toLocaleString("en-IN")}
                          </td>
                        )}
                        {visibleColumns.paymentStatus && (
                          <td className="px-2.5 py-4">
                            {getPaymentStatusBadge(purchase.paymentStatus)}
                          </td>
                        )}
                        {visibleColumns.actions && (
                          <td className="px-6 py-4 text-right">
                            <div className="relative action-dropdown-container inline-block">
                              <button
                                onClick={() =>
                                  setActiveActionMenu(
                                    activeActionMenu === purchase.id ? null : purchase.id
                                  )
                                }
                                className="p-2 rounded-lg text-gray-500 hover:text-gray-700
        dark:text-gray-400 dark:hover:text-white
        hover:bg-gray-100 dark:hover:bg-gray-700"
                              >
                                <MoreVertical className="w-5 h-5" />
                              </button>

                              {activeActionMenu === purchase.id && (
                                <div
                                  className="absolute right-0 mt-2 w-40 bg-white dark:bg-gray-800
          border border-gray-200 dark:border-gray-700
          rounded-lg shadow-lg z-20"
                                >
                                  <Link
                                    href={`/purchase/${purchase.id}`}
                                    onClick={() => setActiveActionMenu(null)}
                                    className="flex items-center gap-2 px-4 py-2 text-sm
            text-gray-700 dark:text-gray-300
            hover:bg-gray-100 dark:hover:bg-gray-700"
                                  >
                                    <Eye className="w-4 h-4" />
                                    View
                                  </Link>

                                  <Link
                                    href={`/purchase/edit/${purchase.id}`}
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
                                      // handleDelete(purchase.id);
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
                {paginatedPurchases.length > 0 && visibleColumns.total && (
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
                        Rs. {totalAmount.toLocaleString("en-IN")}
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

        {/* Pagination */}
        {filteredPurchases.length > pageSize && (
          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Showing {(page - 1) * pageSize + 1} to{" "}
              {Math.min(page * pageSize, filteredPurchases.length)} of {filteredPurchases.length} results
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
                disabled={page * pageSize >= filteredPurchases.length}
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



