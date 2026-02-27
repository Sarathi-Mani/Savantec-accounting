"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import { ordersApi } from "@/services/api";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
    Printer,
    Download,
    Edit,
    ArrowLeft,
    Calendar,
    User,
    Building,
    DollarSign,
    Package,
    Percent,
    FileEdit,
    CheckCircle,
    XCircle,
    Clock,
    AlertCircle,
    Receipt,
} from "lucide-react";

// Add this export to prevent the error
export const dynamic = 'force-dynamic';

export default function ViewPurchaseOrderPage() {
    const router = useRouter();
    const params = useParams();
    const searchParams = useSearchParams();
    const { company } = useAuth();
    const [isLoading, setIsLoading] = useState(true);
    const [purchaseOrder, setPurchaseOrder] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const hasAutoPrinted = useRef(false);

    const getItemRate = (item: any): number => {
        const raw = item?.rate ?? item?.purchase_price ?? item?.unit_price ?? 0;
        const value = Number(raw);
        return Number.isFinite(value) ? value : 0;
    };

    // Load purchase order data
    useEffect(() => {
        if (company?.id && params.id) {
            loadPurchaseOrder();
        }
    }, [company?.id, params.id]);


// Handle print - print the same view page with all visible data/format
const handlePrint = () => {
    if (!purchaseOrder) {
        alert("Purchase order data not loaded yet. Please wait.");
        return;
    }
    window.print();
};

    useEffect(() => {
        if (searchParams.get("print") === "1" && purchaseOrder && !hasAutoPrinted.current) {
            hasAutoPrinted.current = true;
            setTimeout(() => {
                window.print();
            }, 200);
        }
    }, [searchParams, purchaseOrder]);

    const loadPurchaseOrder = async () => {
        try {
            setIsLoading(true);
            setError(null);
            
            const response = await ordersApi.getPurchaseOrder(company!.id, params.id as string);
            console.log("Purchase Order Response:", response); // Add this
         console.log("Items data:", response.items); // Add this
            setPurchaseOrder(response);
        } catch (error: any) {
            console.error("Failed to load purchase order:", error);
            setError(error.message || "Failed to load purchase order");
        } finally {
            setIsLoading(false);
        }
    };

    // Format date
    const formatDate = (dateString: string) => {
        if (!dateString) return "N/A";
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        } catch (error) {
            return "Invalid Date";
        }
    };

    // Format currency
    const formatCurrency = (amount: number, currency: string = "INR") => {
        if (!amount) amount = 0;
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: currency || 'INR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
        }).format(amount);
    };

    // Get status badge
    const getStatusBadge = (status: string) => {
        const statusMap: any = {
            draft: {
                label: "Draft",
                color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
                icon: <FileEdit className="w-4 h-4 mr-1" />
            },
            confirmed: {
                label: "Confirmed",
                color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
                icon: <CheckCircle className="w-4 h-4 mr-1" />
            },
            partially_fulfilled: {
                label: "Partially Fulfilled",
                color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
                icon: <Clock className="w-4 h-4 mr-1" />
            },
            fulfilled: {
                label: "Fulfilled",
                color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
                icon: <CheckCircle className="w-4 h-4 mr-1" />
            },
            cancelled: {
                label: "Cancelled",
                color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
                icon: <XCircle className="w-4 h-4 mr-1" />
            },
        };

        const statusInfo = statusMap[status?.toLowerCase()] || {
            label: status || "Unknown",
            color: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
            icon: <AlertCircle className="w-4 h-4 mr-1" />
        };

        return (
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusInfo.color}`}>
                {statusInfo.icon}
                {statusInfo.label}
            </span>
        );
    };

    // Handle print
    
    // Handle PDF download
    const handlePDF = async () => {
        try {
            if (!purchaseOrder) {
                throw new Error("Purchase order data not loaded");
            }

            const doc = new jsPDF("landscape");
            const fileName = `${purchaseOrder?.order_number || `purchase-order-${params.id}`}.pdf`;
            const currency = purchaseOrder.currency || "INR";
            const formatOrderCurrency = (amount: any) =>
                new Intl.NumberFormat("en-IN", {
                    style: "currency",
                    currency,
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                }).format(Number(amount || 0));

            const commonTableOptions: any = {
                margin: { top: 20, left: 10, right: 10, bottom: 20 },
                styles: {
                    fontSize: 9,
                    cellPadding: 3,
                    overflow: "linebreak",
                    font: "helvetica",
                },
                headStyles: {
                    fillColor: [41, 128, 185],
                    textColor: 255,
                    fontStyle: "bold",
                },
                alternateRowStyles: {
                    fillColor: [245, 245, 245],
                },
                didDrawPage: (data: any) => {
                    doc.setFontSize(16);
                    doc.text(`Purchase Order Details`, data.settings.margin.left, 12);
                    doc.setFontSize(10);
                    doc.text(company?.name || "", data.settings.margin.left, 18);
                    doc.text(
                        `Generated: ${new Date().toLocaleDateString("en-IN")}`,
                        doc.internal.pageSize.width - 60,
                        12
                    );
                    const pageCount = doc.getNumberOfPages();
                    doc.text(
                        `Page ${data.pageNumber} of ${pageCount}`,
                        data.settings.margin.left,
                        doc.internal.pageSize.height - 8
                    );
                },
            };

            autoTable(doc, {
                ...commonTableOptions,
                startY: 24,
                theme: "grid",
                head: [["Order Summary", "Value"]],
                body: [
                    ["Order Number", purchaseOrder.order_number || "N/A"],
                    ["Status", String(purchaseOrder.status || "N/A")],
                    ["Order Date", formatDate(purchaseOrder.order_date)],
                    ["Created Date", formatDate(purchaseOrder.created_at)],
                    ["Expected Date", purchaseOrder.expected_date ? formatDate(purchaseOrder.expected_date) : "N/A"],
                    ["Reference No", purchaseOrder.reference_number || "N/A"],
                    ["Currency", currency],
                    ["Exchange Rate", purchaseOrder.currency !== "INR" ? `1 ${currency} = ${purchaseOrder.exchange_rate || 1} INR` : "N/A"],
                    ["Created By", purchaseOrder.creator_name || purchaseOrder.created_by || "System"],
                ],
            });

            const afterSummaryY = ((doc as any).lastAutoTable?.finalY || 40) + 8;
            autoTable(doc, {
                ...commonTableOptions,
                startY: afterSummaryY,
                theme: "grid",
                head: [["Supplier Information", "Value"]],
                body: [
                    ["Name", purchaseOrder.vendor?.name || purchaseOrder.vendor_name || "N/A"],
                    ["Email", purchaseOrder.vendor?.email || purchaseOrder.vendor_email || "N/A"],
                    ["Contact", purchaseOrder.vendor?.contact || purchaseOrder.vendor_contact || "N/A"],
                ],
            });

            const itemRows = (purchaseOrder.items || []).map((item: any, index: number) => [
                String(index + 1),
                item?.product_name || "N/A",
                item?.item_code || "N/A",
                item?.description || "N/A",
                String(item?.quantity || 0),
                item?.unit || "unit",
                `${Number(item?.gst_rate || 0)}%`,
                item?.discount_percent ? `${Number(item.discount_percent)}%` : "-",
                formatOrderCurrency(getItemRate(item)),
                formatOrderCurrency(Number(item?.tax_amount || 0)),
                formatOrderCurrency(Number(item?.total_amount || 0)),
            ]);

            autoTable(doc, {
                ...commonTableOptions,
                startY: ((doc as any).lastAutoTable?.finalY || 52) + 8,
                head: [["#", "Item", "Item Code", "Description", "Qty", "Unit", "GST", "Disc", "Rate", "Tax", "Total"]],
                body: itemRows,
                theme: "grid",
                styles: {
                    ...(commonTableOptions.styles || {}),
                    fontSize: 8,
                },
            });

            const finalY = (doc as any).lastAutoTable?.finalY || 52;
            autoTable(doc, {
                ...commonTableOptions,
                startY: finalY + 8,
                theme: "grid",
                head: [["Amount Summary", "Value"]],
                body: [
                    ["Subtotal", formatOrderCurrency(Number(purchaseOrder.subtotal || 0))],
                    ["Tax Amount", formatOrderCurrency(Number(purchaseOrder.tax_amount || 0))],
                    ...(Number(purchaseOrder.freight_charges || 0) > 0 ? [["Freight Charges", formatOrderCurrency(Number(purchaseOrder.freight_charges || 0))]] : []),
                    ...(Number(purchaseOrder.other_charges || 0) > 0 ? [["Other Charges", formatOrderCurrency(Number(purchaseOrder.other_charges || 0))]] : []),
                    ...(Number(purchaseOrder.discount_on_all || 0) > 0 ? [["Discount on All", `-${formatOrderCurrency(Number(purchaseOrder.discount_on_all || 0))}`]] : []),
                    ...(Number(purchaseOrder.round_off || 0) !== 0 ? [["Round Off", formatOrderCurrency(Number(purchaseOrder.round_off || 0))]] : []),
                    ["Total Amount", formatOrderCurrency(Number(purchaseOrder.total_amount || 0))],
                    ...(purchaseOrder.currency !== "INR"
                        ? [["Amount in INR", new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(Number(purchaseOrder.total_amount || 0) * Number(purchaseOrder.exchange_rate || 1))]]
                        : []),
                ] as any,
            });

            const footerY = ((doc as any).lastAutoTable?.finalY || finalY + 20) + 8;
            if (purchaseOrder.notes) {
                doc.setFontSize(11);
                doc.text("Notes:", 14, footerY);
                doc.setFontSize(9);
                const noteLines = doc.splitTextToSize(String(purchaseOrder.notes), 180);
                doc.text(noteLines, 14, footerY + 5);
            }

            if (purchaseOrder.terms) {
                const termsStartY = footerY + (purchaseOrder.notes ? 20 : 0);
                doc.setFontSize(11);
                doc.text("Terms & Conditions:", 14, termsStartY);
                doc.setFontSize(9);
                const termLines = doc.splitTextToSize(String(purchaseOrder.terms), 180);
                doc.text(termLines, 14, termsStartY + 5);
            }

            doc.save(fileName);
        } catch (error) {
            console.error("PDF download failed:", error);
            alert("Failed to download PDF");
        }
    };

    // Handle refresh
    const handleRefresh = () => {
        loadPurchaseOrder();
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-dark p-4 md:p-6">
                <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
                        <p className="mt-4 text-dark-6">Loading purchase order...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-dark p-4 md:p-6">
                <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-6">
                    <div className="flex items-center gap-3 text-red-700 dark:text-red-400">
                        <AlertCircle className="w-6 h-6" />
                        <div>
                            <h3 className="font-semibold">Error Loading Purchase Order</h3>
                            <p className="mt-1 text-sm">{error}</p>
                        </div>
                    </div>
                    <div className="mt-4 flex gap-3">
                        <button
                            onClick={handleRefresh}
                            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-opacity-90"
                        >
                            Retry
                        </button>
                        <button
                            onClick={() => router.push("/purchase/purchase-orders")}
                            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                        >
                            Back to List
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (!purchaseOrder) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-dark p-4 md:p-6">
                <div className="rounded-lg bg-white dark:bg-gray-dark shadow-1 p-6 text-center">
                    <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-dark dark:text-white mb-2">Purchase Order Not Found</h3>
                    <p className="text-dark-6 mb-4">The purchase order you're looking for doesn't exist or has been deleted.</p>
                    <button
                        onClick={() => router.push("/purchase/purchase-orders")}
                        className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-opacity-90"
                    >
                        Back to Purchase Orders
                    </button>
                </div>
            </div>
        );
    }

    // Calculate conversion if not INR
    const showConvertedAmount = purchaseOrder.currency !== "INR";
    const convertedAmount = showConvertedAmount 
        ? purchaseOrder.total_amount * (purchaseOrder.exchange_rate || 1)
        : purchaseOrder.total_amount;
    const shouldPrint = searchParams.get("print") === "1";

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-dark p-4 md:p-6">
            {shouldPrint && (
                <style jsx global>{`
                    @media print {
                        aside,
                        header {
                            display: none !important;
                        }
                        main {
                            margin: 0 !important;
                            padding: 0 !important;
                            max-width: 100% !important;
                        }
                        body {
                            background: #fff !important;
                        }
                    }
                `}</style>
            )}
            {/* Breadcrumb */}
            <nav className={`mb-6 ${shouldPrint ? "print:hidden" : ""}`}>
                <ol className="flex items-center space-x-2 text-sm">
                    <li>
                        <Link href="/" className="text-dark-6 hover:text-primary dark:text-gray-400">
                            Home
                        </Link>
                    </li>
                    <li className="text-dark-6">/</li>
                    <li>
                        <Link href="/purchase/purchase-orders" className="text-dark-6 hover:text-primary dark:text-gray-400">
                            Purchase Orders
                        </Link>
                    </li>
                    <li className="text-dark-6">/</li>
                    <li className="text-dark dark:text-white">View Purchase Order</li>
                </ol>
            </nav>

            {/* Page Header with Actions */}
            <div className="mb-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-dark dark:text-white mb-2">
                            Purchase Order: {purchaseOrder.order_number}
                        </h1>
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="flex items-center gap-2 text-sm text-dark-6">
                                <Calendar className="w-4 h-4" />
                                <span>Created: {formatDate(purchaseOrder.created_at)}</span>
                            </div>
                            {purchaseOrder.expected_date && (
                                <div className="flex items-center gap-2 text-sm text-dark-6">
                                    <Calendar className="w-4 h-4" />
                                    <span>Expected: {formatDate(purchaseOrder.expected_date)}</span>
                                </div>
                            )}
                            <div>
                                {getStatusBadge(purchaseOrder.status)}
                            </div>
                        </div>
                    </div>
                    <div className={`flex flex-wrap gap-2 ${shouldPrint ? "print:hidden" : ""}`}>
                        {purchaseOrder.status === "draft" && (
                            <Link
                                href={`/purchase/purchase-orders/edit/${params.id}`}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-opacity-90 transition-colors"
                            >
                                <Edit className="w-4 h-4" />
                                Edit
                            </Link>
                        )}
                        <button
                            onClick={handlePrint}
                            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-dark text-dark dark:text-white rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                        >
                            <Printer className="w-4 h-4" />
                            Print
                        </button>
                        <button
                            onClick={handlePDF}
                            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-dark text-dark dark:text-white rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                        >
                            <Download className="w-4 h-4" />
                            PDF
                        </button>
                        <button
                            onClick={handleRefresh}
                            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-dark text-dark dark:text-white rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Refresh
                        </button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - Order Information */}
                <div className="space-y-6">
                    {/* Order Summary Card */}
                    <div className="bg-white dark:bg-gray-dark rounded-lg shadow-1 p-6">
                        <h2 className="text-lg font-semibold text-dark dark:text-white mb-4">Order Summary</h2>
                        <div className="space-y-3">
                            <div className="flex justify-between">
                                <span className="text-dark-6">Order Number</span>
                                <span className="font-medium text-dark dark:text-white">{purchaseOrder.order_number}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-dark-6">Order Date</span>
                                <span className="font-medium text-dark dark:text-white">{formatDate(purchaseOrder.order_date)}</span>
                            </div>
                            {purchaseOrder.expected_date && (
                                <div className="flex justify-between">
                                    <span className="text-dark-6">Expected Date</span>
                                    <span className="font-medium text-dark dark:text-white">
                                        {formatDate(purchaseOrder.expected_date)}
                                    </span>
                                </div>
                            )}
                            {purchaseOrder.reference_number && (
                                <div className="flex justify-between">
                                    <span className="text-dark-6">Reference No.</span>
                                    <span className="font-medium text-dark dark:text-white">
                                        {purchaseOrder.reference_number}
                                    </span>
                                </div>
                            )}
                            <div className="flex justify-between">
                                <span className="text-dark-6">Currency</span>
                                <span className="font-medium text-dark dark:text-white">{purchaseOrder.currency}</span>
                            </div>
                            {showConvertedAmount && (
                                <div className="flex justify-between">
                                    <span className="text-dark-6">Exchange Rate</span>
                                    <span className="font-medium text-dark dark:text-white">
                                        1 {purchaseOrder.currency} = {purchaseOrder.exchange_rate} INR
                                    </span>
                                </div>
                            )}
                            {/* <div className="flex justify-between">
                                <span className="text-dark-6">Created By</span>
                                <span className="font-medium text-dark dark:text-white">
                                    {purchaseOrder.creator_name || purchaseOrder.created_by || "System"}
                                </span>
                            </div> */}
                        </div>
                    </div>

                    {/* Supplier Information */}
                    {/* Supplier Information */}
<div className="bg-white dark:bg-gray-dark rounded-lg shadow-1 p-6">
    <div className="flex items-center gap-2 mb-4">
        <Building className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-semibold text-dark dark:text-white">Supplier Information</h2>
    </div>
    <div className="space-y-3">
        {purchaseOrder.vendor_id || purchaseOrder.vendor ? (
            <>
              
                {/* Check different possible vendor structures */}
                {(purchaseOrder.vendor?.name || purchaseOrder.vendor_name) && (
                    <div>
                        <div className="text-sm text-dark-6">Name</div>
                        <div className="font-medium text-dark dark:text-white">
                            {purchaseOrder.vendor?.name || purchaseOrder.vendor_name || "N/A"}
                        </div>
                    </div>
                )}
                {(purchaseOrder.vendor?.email || purchaseOrder.vendor_email) && (
                    <div>
                        <div className="text-sm text-dark-6">Email</div>
                        <div className="font-medium text-dark dark:text-white">
                            {purchaseOrder.vendor?.email || purchaseOrder.vendor_email}
                        </div>
                    </div>
                )}
                {(purchaseOrder.vendor?.contact || purchaseOrder.vendor_contact) && (
                    <div>
                        <div className="text-sm text-dark-6">Contact</div>
                        <div className="font-medium text-dark dark:text-white">
                            {purchaseOrder.vendor?.contact || purchaseOrder.vendor_contact}
                        </div>
                    </div>
                )}
            </>
        ) : (
            <div className="text-dark-6">No supplier information available</div>
        )}
    </div>
</div>
                </div>

                {/* Middle Column - Items List */}
                <div className="lg:col-span-2">
                    {/* Items Table */}
                    <div className="bg-white dark:bg-gray-dark rounded-lg shadow-1 p-6 mb-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-dark dark:text-white">Order Items</h2>
                            <div className="text-dark-6">
                                Total Items: {purchaseOrder.items?.length || 0}
                            </div>
                        </div>

                        {purchaseOrder.items && purchaseOrder.items.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-gray-200 dark:border-gray-700">
                                             <th className="px-4 py-3 text-left text-sm font-medium text-dark-6">#</th>
                                           
                                            <th className="px-4 py-3 text-left text-sm font-medium text-dark-6">Item </th>
                                            <th className="px-4 py-3 text-left text-sm font-medium text-dark-6">Item Code</th>
                                            <th className="px-4 py-3 text-left text-sm font-medium text-dark-6">Description</th>
                                            <th className="px-4 py-3 text-left text-sm font-medium text-dark-6">Qty</th>
                                            <th className="px-4 py-3 text-left text-sm font-medium text-dark-6">Rate</th>
                                            <th className="px-4 py-3 text-left text-sm font-medium text-dark-6">Tax</th>
                                            <th className="px-4 py-3 text-left text-sm font-medium text-dark-6">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {purchaseOrder.items.map((item: any, index: number) => (
                                            <tr key={index} className="border-b border-gray-200 dark:border-gray-700 last:border-0">
                                                <td className="px-4 py-3">
                                                    <div className="text-dark dark:text-white">{index + 1}</div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="font-medium text-dark dark:text-white">{item.product_name || "N/A"}</div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="font-medium text-dark dark:text-white">{item.item_code || "N/A"}</div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="font-medium text-dark dark:text-white">{item.description || "N/A"}</div>
                                                {item.product_name && (
                                                    <div className="text-sm text-dark-6">{item.product_name}</div>
                                                )}
                                                <div className="text-xs text-dark-6 mt-1">
                                                    {item.unit || "unit"} • {item.gst_rate || 0}% GST
                                                </div>
                                                {item.discount_percent > 0 && (
                                                    <div className="text-xs text-red-600">
                                                        Discount: {item.discount_percent}%
                                                    </div>
                                                )}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="text-dark dark:text-white">{item.quantity}</div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="font-medium text-dark dark:text-white">
                                                        {formatCurrency(getItemRate(item), purchaseOrder.currency)}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="font-medium text-dark dark:text-white">
                                                        {formatCurrency(item.tax_amount, purchaseOrder.currency)}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="font-bold text-dark dark:text-white">
                                                        {formatCurrency(item.total_amount, purchaseOrder.currency)}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="text-center py-8 text-dark-6">
                                No items found in this purchase order
                            </div>
                        )}
                    </div>

                    {/* Totals and Notes */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Totals Card */}
                        <div className="bg-white dark:bg-gray-dark rounded-lg shadow-1 p-6">
                            <h2 className="text-lg font-semibold text-dark dark:text-white mb-4">Amount Summary</h2>
                            <div className="space-y-3">
                                <div className="flex justify-between">
                                    <span className="text-dark-6">Subtotal</span>
                                    <span className="font-medium text-dark dark:text-white">
                                        {formatCurrency(purchaseOrder.subtotal || 0, purchaseOrder.currency)}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-dark-6">Tax Amount</span>
                                    <span className="font-medium text-dark dark:text-white">
                                        {formatCurrency(purchaseOrder.tax_amount || 0, purchaseOrder.currency)}
                                    </span>
                                </div>
                                {purchaseOrder.freight_charges > 0 && (
                                    <div className="flex justify-between">
                                        <span className="text-dark-6">Freight Charges</span>
                                        <span className="font-medium text-dark dark:text-white">
                                            {formatCurrency(purchaseOrder.freight_charges, purchaseOrder.currency)}
                                        </span>
                                    </div>
                                )}
                                {purchaseOrder.other_charges > 0 && (
                                    <div className="flex justify-between">
                                        <span className="text-dark-6">Other Charges</span>
                                        <span className="font-medium text-dark dark:text-white">
                                            {formatCurrency(purchaseOrder.other_charges, purchaseOrder.currency)}
                                        </span>
                                    </div>
                                )}
                                {purchaseOrder.discount_on_all > 0 && (
                                    <div className="flex justify-between">
                                        <span className="text-dark-6">Discount on All</span>
                                        <span className="font-medium text-red-600">
                                            -{formatCurrency(purchaseOrder.discount_on_all, purchaseOrder.currency)}
                                        </span>
                                    </div>
                                )}
                                {purchaseOrder.round_off !== 0 && (
                                    <div className="flex justify-between">
                                        <span className="text-dark-6">Round Off</span>
                                        <span className={`font-medium ${purchaseOrder.round_off >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            {purchaseOrder.round_off >= 0 ? '+' : ''}
                                            {formatCurrency(purchaseOrder.round_off, purchaseOrder.currency)}
                                        </span>
                                    </div>
                                )}
                                <div className="border-t border-gray-200 dark:border-gray-700 pt-3 mt-3">
                                    <div className="flex justify-between">
                                        <span className="text-lg font-semibold text-dark dark:text-white">Total Amount</span>
                                        <span className="text-lg font-bold text-primary">
                                            {formatCurrency(purchaseOrder.total_amount || 0, purchaseOrder.currency)}
                                        </span>
                                    </div>
                                    {showConvertedAmount && (
                                        <div className="mt-2 flex justify-between text-sm text-dark-6">
                                            <span>Amount in INR</span>
                                            <span className="font-medium">{formatCurrency(convertedAmount, "INR")}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Notes and Terms */}
                        <div className="space-y-6">
                            {purchaseOrder.notes && (
                                <div className="bg-white dark:bg-gray-dark rounded-lg shadow-1 p-6">
                                    <h2 className="text-lg font-semibold text-dark dark:text-white mb-4">Notes</h2>
                                    <div className="text-dark-6 whitespace-pre-line">{purchaseOrder.notes}</div>
                                </div>
                            )}

                            {purchaseOrder.terms && (
                                <div className="bg-white dark:bg-gray-dark rounded-lg shadow-1 p-6">
                                    <h2 className="text-lg font-semibold text-dark dark:text-white mb-4">Terms & Conditions</h2>
                                    <div className="text-dark-6 whitespace-pre-line">{purchaseOrder.terms}</div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

