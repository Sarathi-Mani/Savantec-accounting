"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
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
    RefreshCw,
    CreditCard,
    RotateCcw,
} from "lucide-react";

export default function PurchaseReturnsListPage() {
    // Sample data for purchase returns
    const [purchaseReturns, setPurchaseReturns] = useState([
        {
            id: "1",
            date: "2024-01-15",
            purchaseCode: "PUR-001",
            returnCode: "PRET-001",
            returnStatus: "Completed",
            referenceNo: "REF-001",
            supplierName: "ABC Suppliers",
            total: 15000,
            paidPayment: 15000,
            paymentStatus: "Paid",
            createdBy: "John Doe",
            currencyCode: "USD",
        },
        {
            id: "2",
            date: "2024-01-20",
            purchaseCode: "PUR-002",
            returnCode: "PRET-002",
            returnStatus: "Pending",
            referenceNo: "REF-002",
            supplierName: "XYZ Corporation",
            total: 25000,
            paidPayment: 15000,
            paymentStatus: "Partial",
            createdBy: "Jane Smith",
            currencyCode: "USD",
        },
        {
            id: "3",
            date: "2024-01-25",
            purchaseCode: "PUR-003",
            returnCode: "PRET-003",
            returnStatus: "Approved",
            referenceNo: "REF-003",
            supplierName: "Global Traders",
            total: 18000,
            paidPayment: 0,
            paymentStatus: "Unpaid",
            createdBy: "Robert Johnson",
            currencyCode: "USD",
        },
        {
            id: "4",
            date: "2024-02-01",
            purchaseCode: "PUR-004",
            returnCode: "PRET-004",
            returnStatus: "Completed",
            referenceNo: "REF-004",
            supplierName: "Tech Solutions Ltd",
            total: 32000,
            paidPayment: 32000,
            paymentStatus: "Paid",
            createdBy: "Sarah Wilson",
            currencyCode: "USD",
        },
        {
            id: "5",
            date: "2024-02-05",
            purchaseCode: "PUR-005",
            returnCode: "PRET-005",
            returnStatus: "Rejected",
            referenceNo: "REF-005",
            supplierName: "ABC Suppliers",
            total: 12500,
            paidPayment: 12500,
            paymentStatus: "Paid",
            createdBy: "Mike Brown",
            currencyCode: "USD",
        },
        {
            id: "6",
            date: "2024-02-10",
            purchaseCode: "PUR-006",
            returnCode: "PRET-006",
            returnStatus: "Approved",
            referenceNo: "REF-006",
            supplierName: "Global Traders",
            total: 22000,
            paidPayment: 10000,
            paymentStatus: "Partial",
            createdBy: "Emily Davis",
            currencyCode: "USD",
        },
        {
            id: "7",
            date: "2024-02-15",
            purchaseCode: "PUR-007",
            returnCode: "PRET-007",
            returnStatus: "Completed",
            referenceNo: "REF-007",
            supplierName: "XYZ Corporation",
            total: 18500,
            paidPayment: 18500,
            paymentStatus: "Paid",
            createdBy: "David Miller",
            currencyCode: "USD",
        },
        {
            id: "8",
            date: "2024-02-20",
            purchaseCode: "PUR-008",
            returnCode: "PRET-008",
            returnStatus: "Pending",
            referenceNo: "REF-008",
            supplierName: "Tech Solutions Ltd",
            total: 27500,
            paidPayment: 20000,
            paymentStatus: "Partial",
            createdBy: "Lisa Anderson",
            currencyCode: "USD",
        },
    ]);

    const [searchTerm, setSearchTerm] = useState("");
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");
    const [supplierFilter, setSupplierFilter] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
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
        date: true,
        purchaseCode: true,
        returnCode: true,
        returnStatus: true,
        referenceNo: true,
        supplierName: true,
        total: true,
        paidPayment: true,
        paymentStatus: true,
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
        if (copyLoading) return;
        setCopyLoading(true);
        try {
            const filtered = filteredReturns;
            const headers = ["Date", "Purchase Code", "Return Code", "Return Status", "Reference No", "Supplier Name", "Total", "Paid Payment", "Payment Status", "Created By"];

            const rows = filtered.map(ret => [
                formatDate(ret.date),
                ret.purchaseCode,
                ret.returnCode,
                ret.returnStatus,
                ret.referenceNo,
                ret.supplierName,
                `$${ret.total.toLocaleString()}`,
                `$${ret.paidPayment.toLocaleString()}`,
                ret.paymentStatus,
                ret.createdBy
            ]);

            const text = [headers.join("\t"), ...rows.map(r => r.join("\t"))].join("\n");

            await navigator.clipboard.writeText(text);
            alert("Purchase returns data copied to clipboard");
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
            const filtered = filteredReturns;
            const exportData = filtered.map(ret => ({
                "Date": formatDate(ret.date),
                "Purchase Code": ret.purchaseCode,
                "Return Code": ret.returnCode,
                "Return Status": ret.returnStatus,
                "Reference No": ret.referenceNo,
                "Supplier Name": ret.supplierName,
                "Total": ret.total,
                "Currency Code": ret.currencyCode,
                "Paid Payment": ret.paidPayment,
                "Payment Status": ret.paymentStatus,
                "Created By": ret.createdBy,
            }));

            const ws = XLSX.utils.json_to_sheet(exportData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "PurchaseReturns");
            XLSX.writeFile(wb, "purchase_returns.xlsx");
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
            const filtered = filteredReturns;
            const doc = new jsPDF();

            autoTable(doc, {
                ...getProfessionalTableTheme(doc, "Purchase Returns List", "", "p"),
                head: [["Date", "Purchase Code", "Return Code", "Return Status", "Reference No", "Supplier Name", "Total", "Paid Payment", "Payment Status", "Created By"]],
                body: filtered.map(ret => [
                    formatDate(ret.date),
                    ret.purchaseCode,
                    ret.returnCode,
                    ret.returnStatus,
                    ret.referenceNo,
                    ret.supplierName,
                    `$${ret.total.toLocaleString()}`,
                    `$${ret.paidPayment.toLocaleString()}`,
                    ret.paymentStatus,
                    ret.createdBy
                ])
            });

            addPdfPageNumbers(doc, "p");
            doc.save("purchase_returns.pdf");
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
            const filtered = filteredReturns;
            const exportData = filtered.map(ret => ({
                "Date": formatDate(ret.date),
                "Purchase Code": ret.purchaseCode,
                "Return Code": ret.returnCode,
                "Return Status": ret.returnStatus,
                "Reference No": ret.referenceNo,
                "Supplier Name": ret.supplierName,
                "Total": ret.total,
                "Currency Code": ret.currencyCode,
                "Paid Payment": ret.paidPayment,
                "Payment Status": ret.paymentStatus,
                "Created By": ret.createdBy,
            }));

            const ws = XLSX.utils.json_to_sheet(exportData);
            const csv = XLSX.utils.sheet_to_csv(ws);
            const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
            saveAs(blob, "purchase_returns.csv");
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
        totalInvoices: purchaseReturns.length,
        totalInvoiceAmount: purchaseReturns.reduce((sum, ret) => sum + ret.total, 0),
        totalReturnedAmount: purchaseReturns.reduce((sum, ret) => sum + ret.paidPayment, 0),
        totalPurchaseDue: purchaseReturns.reduce((sum, ret) => sum + (ret.total - ret.paidPayment), 0),
    };

    const uniqueSuppliers = Array.from(new Set(purchaseReturns.map(ret => ret.supplierName)));
    const uniqueStatuses = Array.from(new Set(purchaseReturns.map(ret => ret.returnStatus)));

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
        });
    };

    const getReturnStatusBadge = (status: string) => {
        switch (status) {
            case "Completed":
                return (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Completed
                    </span>
                );
            case "Approved":
                return (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
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
            case "Rejected":
                return (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                        <XCircle className="w-3 h-3 mr-1" />
                        Rejected
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

    const getPaymentStatusBadge = (status: string) => {
        switch (status) {
            case "Paid":
                return (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                        Paid
                    </span>
                );
            case "Unpaid":
                return (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                        Unpaid
                    </span>
                );
            case "Partial":
                return (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
                        Partial
                    </span>
                );
            default:
                return null;
        }
    };

    const filteredReturns = purchaseReturns.filter((ret) => {
        const matchesSearch =
            ret.purchaseCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
            ret.returnCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
            ret.supplierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            ret.referenceNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
            ret.createdBy.toLowerCase().includes(searchTerm.toLowerCase());

        const retDate = new Date(ret.date);
        const matchesFromDate = !fromDate || retDate >= new Date(fromDate);
        const matchesToDate = !toDate || retDate <= new Date(toDate);
        const matchesSupplier = !supplierFilter || ret.supplierName === supplierFilter;
        const matchesStatus = !statusFilter || ret.returnStatus === statusFilter;

        return matchesSearch && matchesFromDate && matchesToDate && matchesSupplier && matchesStatus;
    });

    const paginatedReturns = filteredReturns.slice(
        (page - 1) * pageSize,
        page * pageSize
    );

    const totalAmount = filteredReturns.reduce((sum, ret) => sum + ret.total, 0);
    const totalPaidAmount = filteredReturns.reduce((sum, ret) => sum + ret.paidPayment, 0);

    return (
        <div className="w-full">
            {/* Header */}
            <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                            Purchase Return List
                        </h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            Manage and track all purchase returns
                        </p>
                    </div>
                    <Link
                        href="/purchase/purchase-returns/new"
                        className="px-4 py-2 transition bg-primary hover:bg-opacity-90 text-white rounded-lg flex items-center gap-2"
                    >
                        <Plus className="w-5 h-5" />
                        Add Return
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

                    {/* Total Returned Amount */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                    ${summaryData.totalReturnedAmount.toLocaleString()}
                                </p>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                    Total Returned Amount
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
                                    ${summaryData.totalPurchaseDue.toLocaleString()}
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
                                placeholder="Search by purchase code, return code, supplier, reference, or creator..."
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

                        {/* Status Dropdown */}
                        <select
                            value={statusFilter}
                            onChange={(e) => {
                                setStatusFilter(e.target.value);
                                setPage(1);
                            }}
                            className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                        >
                            <option value="">All Status</option>
                            {uniqueStatuses.map((status) => (
                                <option key={status} value={status}>
                                    {status}
                                </option>
                            ))}
                        </select>

                        <button
                            onClick={() => {
                                setFromDate("");
                                setToDate("");
                                setSupplierFilter("");
                                setStatusFilter("");
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
                            <thead className="bg-gray-200 dark:bg-gray-700/50">
                                <tr className="bg-gray-200 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                                    {visibleColumns.date && (
                                        <th className="text-left px-6 py-3 text-sm font-semibold text-gray-600 dark:text-gray-300">
                                            Date
                                        </th>
                                    )}
                                    {visibleColumns.purchaseCode && (
                                        <th className="text-left px-6 py-3 text-sm font-semibold text-gray-600 dark:text-gray-300">
                                            Purchase Code
                                        </th>
                                    )}
                                    {visibleColumns.returnCode && (
                                        <th className="text-left px-6 py-3 text-sm font-semibold text-gray-600 dark:text-gray-300">
                                            Return Code
                                        </th>
                                    )}
                                    {visibleColumns.returnStatus && (
                                        <th className="text-left px-6 py-3 text-sm font-semibold text-gray-600 dark:text-gray-300">
                                            Return Status
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
                                    {visibleColumns.paidPayment && (
                                        <th className="text-left px-6 py-3 text-sm font-semibold text-gray-600 dark:text-gray-300">
                                            Paid Payment
                                        </th>
                                    )}
                                    {visibleColumns.paymentStatus && (
                                        <th className="text-left px-6 py-3 text-sm font-semibold text-gray-600 dark:text-gray-300">
                                            Payment Status
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
                                {paginatedReturns.length === 0 ? (
                                    <tr>
                                        <td colSpan={Object.values(visibleColumns).filter(Boolean).length} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                                            <div className="flex flex-col items-center justify-center">
                                                <RotateCcw className="w-12 h-12 text-gray-400 mb-2" />
                                                <p className="text-lg font-medium text-gray-900 dark:text-white mb-1">
                                                    No purchase returns found
                                                </p>
                                                <p className="text-gray-500 dark:text-gray-400">
                                                    Try adjusting your filters or add a new purchase return
                                                </p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    paginatedReturns.map((ret) => (
                                        <tr
                                            key={ret.id}
                                            className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                                        >
                                            {visibleColumns.date && (
                                                <td className="px-2.5 py-4 text-gray-700 dark:text-gray-300">
                                                    {formatDate(ret.date)}
                                                </td>
                                            )}
                                            {visibleColumns.purchaseCode && (
                                                <td className="px-2.5 py-4 font-medium text-gray-900 dark:text-white">
                                                    {ret.purchaseCode}
                                                </td>
                                            )}
                                            {visibleColumns.returnCode && (
                                                <td className="px-2.5 py-4 font-medium text-gray-900 dark:text-white">
                                                    <div className="flex items-center gap-2">
                                                        <RefreshCw className="w-4 h-4 text-gray-400" />
                                                        <span>{ret.returnCode}</span>
                                                    </div>
                                                </td>
                                            )}
                                            {visibleColumns.returnStatus && (
                                                <td className="px-2.5 py-4">
                                                    {getReturnStatusBadge(ret.returnStatus)}
                                                </td>
                                            )}
                                            {visibleColumns.referenceNo && (
                                                <td className="px-2.5 py-4 text-gray-700 dark:text-gray-300">
                                                    {ret.referenceNo}
                                                </td>
                                            )}
                                            {visibleColumns.supplierName && (
                                                <td className="px-2.5 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <Users className="w-4 h-4 text-gray-400" />
                                                        <span className="text-gray-700 dark:text-gray-300">
                                                            {ret.supplierName}
                                                        </span>
                                                    </div>
                                                </td>
                                            )}
                                            {visibleColumns.total && (
                                                <td className="px-2.5 py-4 font-medium text-gray-900 dark:text-white">
                                                    ${ret.total.toLocaleString()}
                                                </td>
                                            )}
                                            {visibleColumns.paidPayment && (
                                                <td className="px-2.5 py-4 font-medium text-gray-900 dark:text-white">
                                                    ${ret.paidPayment.toLocaleString()}
                                                </td>
                                            )}
                                            {visibleColumns.paymentStatus && (
                                                <td className="px-2.5 py-4">
                                                    {getPaymentStatusBadge(ret.paymentStatus)}
                                                </td>
                                            )}
                                            {visibleColumns.createdBy && (
                                                <td className="px-2.5 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <User className="w-4 h-4 text-gray-400" />
                                                        <span className="text-gray-700 dark:text-gray-300">
                                                            {ret.createdBy}
                                                        </span>
                                                    </div>
                                                </td>
                                            )}
                                            {visibleColumns.actions && (
                                                <td className="px-6 py-4 text-right">
                                                    <div className="relative inline-block">
                                                        <button
                                                            onClick={() =>
                                                                setActiveActionMenu(
                                                                    activeActionMenu === ret.id ? null : ret.id
                                                                )
                                                            }
                                                            className="p-2 rounded-lg text-gray-500 hover:text-gray-700
        dark:text-gray-400 dark:hover:text-white
        hover:bg-gray-100 dark:hover:bg-gray-700"
                                                        >
                                                            <MoreVertical className="w-5 h-5" />
                                                        </button>

                                                        {activeActionMenu === ret.id && (
                                                            <div
                                                                className="absolute right-0 mt-2 w-40 bg-white dark:bg-gray-800
          border border-gray-200 dark:border-gray-700
          rounded-lg shadow-lg z-20"
                                                            >
                                                                {/* View */}
                                                                <Link
                                                                    href={`/purchase/purchase-returns/${ret.id}`}
                                                                    onClick={() => setActiveActionMenu(null)}
                                                                    className="flex items-center gap-2 px-4 py-2 text-sm
            text-gray-700 dark:text-gray-300
            hover:bg-gray-100 dark:hover:bg-gray-700"
                                                                >
                                                                    <Eye className="w-4 h-4" />
                                                                    View
                                                                </Link>

                                                                {/* Edit */}
                                                                <Link
                                                                    href={`/purchase/purchase-returns/edit/${ret.id}`}
                                                                    onClick={() => setActiveActionMenu(null)}
                                                                    className="flex items-center gap-2 px-4 py-2 text-sm
            text-gray-700 dark:text-gray-300
            hover:bg-gray-100 dark:hover:bg-gray-700"
                                                                >
                                                                    <Edit className="w-4 h-4" />
                                                                    Edit
                                                                </Link>

                                                                {/* Delete */}
                                                                <button
                                                                    onClick={() => {
                                                                        setActiveActionMenu(null);
                                                                        // handleDelete(ret.id);
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
                            {paginatedReturns.length > 0 && (visibleColumns.total || visibleColumns.paidPayment) && (
                                <tfoot>
                                    <tr className="bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700">
                                        <td
                                            colSpan={
                                                Object.values(visibleColumns).filter(Boolean).length -
                                                (visibleColumns.total ? 1 : 0) -
                                                (visibleColumns.paidPayment ? 1 : 0) -
                                                (visibleColumns.actions ? 1 : 0)
                                            }
                                            className="px-6 py-4 text-right font-semibold text-gray-900 dark:text-white"
                                        >
                                            Total:
                                        </td>
                                        {visibleColumns.total && (
                                            <td className="px-6 py-4 font-bold text-gray-900 dark:text-white">
                                                ${totalAmount.toLocaleString()}
                                            </td>
                                        )}
                                        {visibleColumns.paidPayment && (
                                            <td className="px-6 py-4 font-bold text-gray-900 dark:text-white">
                                                ${totalPaidAmount.toLocaleString()}
                                            </td>
                                        )}
                                        {visibleColumns.paymentStatus && (
                                            <td></td>
                                        )}
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
                {filteredReturns.length > pageSize && (
                    <div className="mt-4 flex items-center justify-between">
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Showing {(page - 1) * pageSize + 1} to{" "}
                            {Math.min(page * pageSize, filteredReturns.length)} of {filteredReturns.length} results
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
                                disabled={page * pageSize >= filteredReturns.length}
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
