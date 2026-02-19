"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { saveAs } from "file-saver";
import {
  Search,
  Filter,
  Plus,
  Download,
  FileText,
  Copy,
  Printer,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Building2,
  Users,
  DollarSign,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  Calendar,
  ShoppingBag,
  CheckCircle,
  XCircle,
  Clock,
  User,
  Receipt,
  FileDown,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

// Print component for purchase orders
const PrintView = ({
  orders,
  visibleColumns,
  formatDate,
  getStatusText,
  formatCurrency,
  companyName,
}: {
  orders: PurchaseOrder[];
  visibleColumns: Record<string, boolean>;
  formatDate: (dateString: string) => string;
  getStatusText: (status: string) => string;
  formatCurrency: (amount: number, currency: string) => string;
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
            Purchase Orders List
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
              {visibleColumns.orderDate && (
                <th style={{
                  padding: '12px',
                  textAlign: 'left',
                  borderRight: '1px solid #ddd',
                  fontWeight: 'bold'
                }}>
                  Order Date
                </th>
              )}
              {visibleColumns.orderNumber && (
                <th style={{
                  padding: '12px',
                  textAlign: 'left',
                  borderRight: '1px solid #ddd',
                  fontWeight: 'bold'
                }}>
                  Order Number
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
              {visibleColumns.referenceNumber && (
                <th style={{
                  padding: '12px',
                  textAlign: 'left',
                  borderRight: '1px solid #ddd',
                  fontWeight: 'bold'
                }}>
                  Reference No.
                </th>
              )}
              {visibleColumns.vendorName && (
                <th style={{
                  padding: '12px',
                  textAlign: 'left',
                  borderRight: '1px solid #ddd',
                  fontWeight: 'bold'
                }}>
                  Supplier Name
                </th>
              )}
              {visibleColumns.totalAmount && (
                <th style={{
                  padding: '12px',
                  textAlign: 'left',
                  borderRight: '1px solid #ddd',
                  fontWeight: 'bold'
                }}>
                  Total Amount
                </th>
              )}
              {visibleColumns.createdBy && (
                <th style={{
                  padding: '12px',
                  textAlign: 'left',
                  fontWeight: 'bold'
                }}>
                  Created By
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {orders.map((order, index) => (
              <tr key={order.id} style={{
                borderBottom: '1px solid #ddd',
                backgroundColor: index % 2 === 0 ? '#fff' : '#f9f9f9'
              }}>
                {visibleColumns.orderDate && (
                  <td style={{
                    padding: '12px',
                    borderRight: '1px solid #ddd'
                  }}>
                    {formatDate(order.order_date)}
                  </td>
                )}
                {visibleColumns.orderNumber && (
                  <td style={{
                    padding: '12px',
                    borderRight: '1px solid #ddd',
                    fontWeight: '500'
                  }}>
                    {order.order_number}
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
                      backgroundColor: order.status === 'confirmed' ? '#d1fae5' :
                        order.status === 'fulfilled' ? '#d1fae5' :
                          order.status === 'partially_fulfilled' ? '#dbeafe' :
                            order.status === 'draft' ? '#fef3c7' :
                              order.status === 'cancelled' ? '#fee2e2' :
                                '#f3f4f6',
                      color: order.status === 'confirmed' ? '#065f46' :
                        order.status === 'fulfilled' ? '#065f46' :
                          order.status === 'partially_fulfilled' ? '#1e40af' :
                            order.status === 'draft' ? '#92400e' :
                              order.status === 'cancelled' ? '#991b1b' :
                                '#374151'
                    }}>
                      {getStatusText(order.status)}
                    </span>
                  </td>
                )}
                {visibleColumns.referenceNumber && (
                  <td style={{
                    padding: '12px',
                    borderRight: '1px solid #ddd'
                  }}>
                    {order.reference_number || '-'}
                  </td>
                )}
                {visibleColumns.vendorName && (
                  <td style={{
                    padding: '12px',
                    borderRight: '1px solid #ddd'
                  }}>
                    {order.vendor_name || '-'}
                  </td>
                )}
                {visibleColumns.totalAmount && (
                  <td style={{
                    padding: '12px',
                    borderRight: '1px solid #ddd',
                    fontWeight: '500'
                  }}>
                    {formatCurrency(order.total_amount, order.currency || "INR")}
                  </td>
                )}
                {visibleColumns.createdBy && (
                  <td style={{ padding: '12px' }}>
                    {order.creator_name || order.created_by || 'System'}
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

interface PurchaseOrder {
  id: string;
  order_number: string;
  order_date: string;
  status: string;
  reference_number: string;
  vendor_name: string;
  total_amount: number;
  exchange_rate: number;
  created_by: string;
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
  
  // Filters state
  const [searchTerm, setSearchTerm] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  
  // UI state
  const [showFilters, setShowFilters] = useState(false);
  const [showColumnDropdown, setShowColumnDropdown] = useState(false);
  const [activeActionMenu, setActiveActionMenu] = useState<string | null>(null);
  const [showPrintView, setShowPrintView] = useState(false);
  const [ordersToPrint, setOrdersToPrint] = useState<PurchaseOrder[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  
  // Export loading states
  const [copyLoading, setCopyLoading] = useState(false);
  const [excelLoading, setExcelLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [csvLoading, setCsvLoading] = useState(false);
  const [printLoading, setPrintLoading] = useState(false);
  
  const [cachedExportData, setCachedExportData] = useState<PurchaseOrder[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [converting, setConverting] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const companyId = company?.id || (typeof window !== "undefined" ? localStorage.getItem("company_id") : null);
  
  // Column visibility
  const [visibleColumns, setVisibleColumns] = useState({
    orderDate: true,
    orderNumber: true,
    status: true,
    referenceNumber: true,
    vendorName: true,
    totalAmount: true,
    createdBy: true,
    actions: true,
  });

  const getToken = () => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("access_token");
    }
    return null;
  };

  const buildQueryParams = (pageValue: number, pageSizeValue: number) => {
    const params = new URLSearchParams();
    params.append("page", pageValue.toString());
    params.append("page_size", pageSizeValue.toString());

    if (searchTerm) params.append("search", searchTerm);
    if (statusFilter) params.append("status", statusFilter);
    if (fromDate) params.append("from_date", fromDate);
    if (toDate) params.append("to_date", toDate);

    return params;
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency || 'INR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const fetchPurchaseOrders = async () => {
    try {
      const token = getToken();
      if (!companyId || !token) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      
      const params = buildQueryParams(currentPage, pageSize);
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/companies/${companyId}/orders/purchase?${params.toString()}`,
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

  const fetchAllPurchaseOrdersForExport = useCallback(async (): Promise<PurchaseOrder[]> => {
    try {
      const token = getToken();
      if (!companyId || !token) return [];

      const params = buildQueryParams(1, 1000);
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/companies/${companyId}/orders/purchase?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch purchase orders: ${response.statusText}`);
      }

      const data: PurchaseOrderResponse | PurchaseOrder[] = await response.json();
      const orders = Array.isArray(data) ? data : (data.purchases || []);
      setCachedExportData(orders);
      return orders;
    } catch (error) {
      console.error("Export fetch failed:", error);
      return [];
    }
  }, [companyId, searchTerm, statusFilter, fromDate, toDate]);

  const getExportData = async (): Promise<PurchaseOrder[]> => {
    if (cachedExportData && cachedExportData.length > 0) return cachedExportData;
    if (purchaseOrders.length > 0) return purchaseOrders;
    return await fetchAllPurchaseOrdersForExport();
  };

  const applySearchFilter = (data: PurchaseOrder[]): PurchaseOrder[] => {
    if (!searchTerm) return data;
    const searchLower = searchTerm.toLowerCase();
    return data.filter((order) => {
      return (
        order.order_number?.toLowerCase().includes(searchLower) ||
        order.reference_number?.toLowerCase().includes(searchLower) ||
        order.vendor_name?.toLowerCase().includes(searchLower) ||
        order.creator_name?.toLowerCase().includes(searchLower) ||
        false
      );
    });
  };

  const applyFilters = (data: PurchaseOrder[]): PurchaseOrder[] => {
    let filtered = data;

    if (statusFilter) {
      filtered = filtered.filter((order) => order.status === statusFilter);
    }

    if (fromDate) {
      filtered = filtered.filter((order) => {
        const orderDate = new Date(order.order_date);
        const from = new Date(fromDate);
        return orderDate >= from;
      });
    }

    if (toDate) {
      filtered = filtered.filter((order) => {
        const orderDate = new Date(order.order_date);
        const to = new Date(toDate);
        return orderDate <= to;
      });
    }

    return filtered;
  };

  const getFilteredExportData = async (): Promise<PurchaseOrder[]> => {
    const allData = await getExportData();
    let filtered = applySearchFilter(allData);
    filtered = applyFilters(filtered);
    if (filtered.length === 0 && purchaseOrders.length > 0) {
      return purchaseOrders;
    }
    return filtered;
  };

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
        fetchPurchaseOrders();
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

  const handlePrint = async () => {
    if (printLoading) return;
    setPrintLoading(true);
    try {
      const allData = await getFilteredExportData();
      if (allData.length === 0) {
        alert("No purchase orders to export.");
        return;
      }
      setOrdersToPrint(allData);
      setShowPrintView(true);
    } catch (error) {
      console.error("Print failed:", error);
      alert("Failed to prepare print view. Please try again.");
    } finally {
      setPrintLoading(false);
    }
  };

  const handlePDF = async (orderId: string) => {
    try {
      const token = getToken();
      if (!companyId || !token) {
        throw new Error("Authentication required");
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/companies/${companyId}/orders/purchase/${orderId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to load purchase order details");
      }

      const order: any = await response.json();
      const currency = order.currency || "INR";
      const fileName = `${order.order_number || `purchase-order-${orderId}`}.pdf`;
      const formatOrderCurrency = (amount: any) =>
        new Intl.NumberFormat("en-IN", {
          style: "currency",
          currency,
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(Number(amount || 0));

      const getItemRate = (item: any): number => {
        const raw = item?.rate ?? item?.purchase_price ?? item?.unit_price ?? 0;
        const val = Number(raw);
        return Number.isFinite(val) ? val : 0;
      };

      const doc = new jsPDF();
      autoTable(doc, {
        startY: 24,
        head: [["#", "Item", "Qty", "Rate", "Tax", "Total"]],
        body: (order.items || []).map((item: any, index: number) => [
          String(index + 1),
          item?.product_name || item?.description || "N/A",
          String(item?.quantity || 0),
          formatOrderCurrency(getItemRate(item)),
          formatOrderCurrency(item?.tax_amount || 0),
          formatOrderCurrency(item?.total_amount || 0),
        ]),
        theme: "grid",
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
        didDrawPage: (data) => {
          doc.setFontSize(16);
          doc.text(`Purchase Order: ${order.order_number || "N/A"}`, data.settings.margin.left, 12);

          doc.setFontSize(10);
          doc.text(company?.name || "", data.settings.margin.left, 18);
          doc.text(
            `Generated: ${new Date().toLocaleDateString("en-IN")}`,
            doc.internal.pageSize.width - 60,
            12
          );
          doc.text(`Supplier: ${order.vendor_name || order.vendor?.name || "N/A"}`, data.settings.margin.left, 22);
        },
      });

      const finalY = (doc as any).lastAutoTable?.finalY || 40;
      doc.setFontSize(10);
      doc.text(`Subtotal: ${formatOrderCurrency(order.subtotal || 0)}`, 14, finalY + 10);
      doc.text(`Tax: ${formatOrderCurrency(order.tax_amount || 0)}`, 14, finalY + 16);
      doc.text(`Total: ${formatOrderCurrency(order.total_amount || 0)}`, 14, finalY + 22);

      doc.save(fileName);
    } catch (error) {
      console.error("Individual PDF download failed:", error);
      alert("Failed to download PDF");
    }
  };

  const handlePrintOrder = (orderId: string) => {
    window.open(`/purchase/purchase-orders/${orderId}/print`, "_blank");
  };

  useEffect(() => {
    if (companyId) {
      fetchPurchaseOrders();
    }
  }, [companyId, currentPage, statusFilter, fromDate, toDate]);

  useEffect(() => {
    if (companyId) {
      const timeoutId = setTimeout(() => {
        setCurrentPage(1);
        fetchPurchaseOrders();
      }, 500);

      return () => clearTimeout(timeoutId);
    }
  }, [companyId, searchTerm]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element | null;
      if (!target) return;
      if (!target.closest(".action-dropdown-container") && !target.closest(".column-dropdown-container")) {
        setActiveActionMenu(null);
        setShowColumnDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
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

  const getStatusBadgeClass = (status: string): string => {
    const statusColors: Record<string, string> = {
      draft: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
      confirmed: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
      fulfilled: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
      partially_fulfilled: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
      cancelled: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    };
    return statusColors[status] || "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
  };

  const copyToClipboard = async () => {
    if (copyLoading) return;
    setCopyLoading(true);
    try {
      const allData = await getFilteredExportData();
      if (allData.length === 0) {
        alert("No purchase orders to export.");
        return;
      }
      
      const headers: string[] = [];
      const rows = allData.map(order => {
        const row: string[] = [];

        if (visibleColumns.orderDate) {
          if (!headers.includes("Order Date")) headers.push("Order Date");
          row.push(formatDate(order.order_date));
        }

        if (visibleColumns.orderNumber) {
          if (!headers.includes("Order Number")) headers.push("Order Number");
          row.push(order.order_number);
        }

        if (visibleColumns.status) {
          if (!headers.includes("Status")) headers.push("Status");
          row.push(getStatusText(order.status));
        }

        if (visibleColumns.referenceNumber) {
          if (!headers.includes("Reference Number")) headers.push("Reference Number");
          row.push(order.reference_number || "-");
        }

        if (visibleColumns.vendorName) {
          if (!headers.includes("Vendor Name")) headers.push("Vendor Name");
          row.push(order.vendor_name || "-");
        }

        if (visibleColumns.totalAmount) {
          if (!headers.includes("Total Amount")) headers.push("Total Amount");
          row.push(formatCurrency(order.total_amount, order.currency || "INR"));
        }

        if (visibleColumns.createdBy) {
          if (!headers.includes("Created By")) headers.push("Created By");
          row.push(order.creator_name || order.created_by || "System");
        }

        return row;
      });

      const text = [headers.join("\t"), ...rows.map(r => r.join("\t"))].join("\n");
      await navigator.clipboard.writeText(text);
      alert("Purchase order data copied to clipboard");
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
      const allData = await getFilteredExportData();
      if (allData.length === 0) {
        alert("No purchase orders to export.");
        return;
      }
      const exportData = allData.map(order => {
        const row: Record<string, any> = {};

        if (visibleColumns.orderDate) {
          row["Order Date"] = formatDate(order.order_date);
        }

        if (visibleColumns.orderNumber) {
          row["Order Number"] = order.order_number;
        }

        if (visibleColumns.status) {
          row["Status"] = getStatusText(order.status);
        }

        if (visibleColumns.referenceNumber) {
          row["Reference Number"] = order.reference_number || "";
        }

        if (visibleColumns.vendorName) {
          row["Vendor Name"] = order.vendor_name || "";
        }

        if (visibleColumns.totalAmount) {
          row["Total Amount"] = formatCurrency(order.total_amount, order.currency || "INR");
          row["Currency"] = order.currency || "INR";
        }

        if (visibleColumns.createdBy) {
          row["Created By"] = order.creator_name || order.created_by || "System";
        }

        row["Created At"] = formatDate(order.created_at);
        
        return row;
      });

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "PurchaseOrders");
      XLSX.writeFile(wb, "purchase_orders.xlsx");
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
      const allData = await getFilteredExportData();
      if (allData.length === 0) {
        alert("No purchase orders to export.");
        return;
      }
      const doc = new jsPDF("landscape");
      
      const headers: string[] = [];
      const body = allData.map(order => {
        const row: string[] = [];

        if (visibleColumns.orderDate) {
          if (!headers.includes("Order Date")) headers.push("Order Date");
          row.push(formatDate(order.order_date));
        }

        if (visibleColumns.orderNumber) {
          if (!headers.includes("Order Number")) headers.push("Order Number");
          row.push(order.order_number);
        }

        if (visibleColumns.status) {
          if (!headers.includes("Status")) headers.push("Status");
          row.push(getStatusText(order.status));
        }

        if (visibleColumns.referenceNumber) {
          if (!headers.includes("Ref. No.")) headers.push("Ref. No.");
          row.push(order.reference_number || "-");
        }

        if (visibleColumns.vendorName) {
          if (!headers.includes("Vendor")) headers.push("Vendor");
          row.push(order.vendor_name || "-");
        }

        if (visibleColumns.totalAmount) {
          if (!headers.includes("Total Amount")) headers.push("Total Amount");
          row.push(formatCurrency(order.total_amount, order.currency || "INR"));
        }

        if (visibleColumns.createdBy) {
          if (!headers.includes("Created By")) headers.push("Created By");
          row.push(order.creator_name || order.created_by || "System");
        }

        return row;
      });

      autoTable(doc, {
        head: [headers],
        body: body,
        startY: 20,
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
        didDrawPage: (data) => {
          doc.setFontSize(16);
          doc.text("Purchase Orders List", data.settings.margin.left, 12);
          
          doc.setFontSize(10);
          doc.text(company?.name || '', data.settings.margin.left, 18);
          
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
      });

      doc.save("purchase_orders.pdf");
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
      const allData = await getExportData();
      const exportData = allData.map(order => {
        const row: Record<string, any> = {};

        if (visibleColumns.orderDate) {
          row["Order Date"] = formatDate(order.order_date);
        }

        if (visibleColumns.orderNumber) {
          row["Order Number"] = order.order_number;
        }

        if (visibleColumns.status) {
          row["Status"] = getStatusText(order.status);
        }

        if (visibleColumns.referenceNumber) {
          row["Reference Number"] = order.reference_number || "";
        }

        if (visibleColumns.vendorName) {
          row["Vendor Name"] = order.vendor_name || "";
        }

        if (visibleColumns.totalAmount) {
          row["Total Amount"] = formatCurrency(order.total_amount, order.currency || "INR");
        }

        if (visibleColumns.createdBy) {
          row["Created By"] = order.creator_name || order.created_by || "System";
        }

        return row;
      });

      const ws = XLSX.utils.json_to_sheet(exportData);
      const csv = XLSX.utils.sheet_to_csv(ws);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      saveAs(blob, "purchase_orders.csv");
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

  const handleReset = () => {
    setSearchTerm("");
    setFromDate("");
    setToDate("");
    setStatusFilter("");
    setCurrentPage(1);
    fetchPurchaseOrders();
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
          orders={ordersToPrint}
          visibleColumns={visibleColumns}
          formatDate={formatDate}
          getStatusText={getStatusText}
          formatCurrency={formatCurrency}
          companyName={company?.name || ''}
        />
      )}

      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Purchase Orders
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Manage and track all your purchase orders
            </p>
          </div>
          <button
            onClick={() => window.location.href = '/purchase/purchase-orders/new'}
            className="px-4 py-2 transition bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Add Purchase Order
          </button>
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
                  {summaryData.total_orders.toLocaleString()}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Total Purchase Orders
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
                <FileText className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </div>

          {/* Total Amount */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-green-600">
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

          {/* Draft Orders */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-yellow-600">
                  {purchaseOrders.filter(o => o.status === 'draft').length}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Draft Orders
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-yellow-100 dark:bg-yellow-900/20 flex items-center justify-center">
                <Clock className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
              </div>
            </div>
          </div>

          {/* Confirmed Orders */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-blue-600">
                  {purchaseOrders.filter(o => o.status === 'confirmed').length}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Confirmed Orders
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mx-6 mt-4 bg-red-50 border border-red-200 rounded-lg p-4 dark:bg-red-900/20 dark:border-red-800">
          <div className="flex items-center gap-2 text-red-800 dark:text-red-400">
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
      )}

      {/* Filters Section */}
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
                    key !== 'actions' && (
                      <label key={key} className="flex items-center gap-2 text-sm mb-2 last:mb-0 cursor-pointer text-gray-700 dark:text-gray-300">
                        <input
                          type="checkbox"
                          checked={value}
                          onChange={() => toggleColumn(key as keyof typeof visibleColumns)}
                          className="rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                      </label>
                    )
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
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="">All Status</option>
                <option value="draft">Draft</option>
                <option value="confirmed">Confirmed</option>
                <option value="partially_fulfilled">Partially Fulfilled</option>
                <option value="fulfilled">Fulfilled</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            {/* From Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                From Date
              </label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            {/* To Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                To Date
              </label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-200 dark:bg-gray-700/50">
              <tr className="text-sm font-semibold text-gray-600 dark:text-gray-300">
                <th className="text-left px-6 py-3 whitespace-nowrap w-20">
                  S.No
                </th>
                {visibleColumns.orderDate && (
                  <th className="text-left px-6 py-3 whitespace-nowrap w-32">
                    Order Date
                  </th>
                )}
                {visibleColumns.orderNumber && (
                  <th className="text-left px-6 py-3 whitespace-nowrap w-48">
                    Order Number
                  </th>
                )}
                {visibleColumns.status && (
                  <th className="text-left px-6 py-3 whitespace-nowrap w-40">
                    Status
                  </th>
                )}
                {visibleColumns.referenceNumber && (
                  <th className="text-left px-6 py-3 whitespace-nowrap w-48">
                    Reference No.
                  </th>
                )}
                {visibleColumns.vendorName && (
                  <th className="text-left px-6 py-3 whitespace-nowrap w-64">
                    Supplier Name
                  </th>
                )}
                {visibleColumns.totalAmount && (
                  <th className="text-left px-6 py-3 whitespace-nowrap w-48">
                    Total Amount
                  </th>
                )}
                {visibleColumns.createdBy && (
                  <th className="text-left px-6 py-3 whitespace-nowrap w-48">
                    Created By
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
                      <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
                    </div>
                  </td>
                </tr>
              ) : purchaseOrders.length === 0 ? (
                <tr>
                  <td colSpan={Object.values(visibleColumns).filter(Boolean).length} className="px-6 py-8 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <ShoppingBag className="w-12 h-12 text-gray-400 mb-2" />
                      <p className="text-lg font-medium text-gray-900 dark:text-white mb-1">
                        No purchase orders found
                      </p>
                      <p className="text-gray-500 dark:text-gray-400 mb-4">
                        {statusFilter || searchTerm || fromDate || toDate ?
                          "No purchase orders found matching your filters. Try adjusting your search criteria." :
                          "Add your first purchase order to start managing your purchases."}
                      </p>
                      <button
                        onClick={() => window.location.href = '/purchase/purchase-orders/new'}
                        className="text-indigo-600 hover:underline dark:text-indigo-400"
                      >
                        Add your first purchase order
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                purchaseOrders.map((order, index) => (
                  <tr
                    key={order.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-gray-700 dark:text-gray-300">
                      {(currentPage - 1) * pageSize + index + 1}
                    </td>
                    {visibleColumns.orderDate && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          {formatDate(order.order_date)}
                        </div>
                      </td>
                    )}
                    {visibleColumns.orderNumber && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900 dark:text-white">
                          <Link 
                            href={`/purchase/purchase-orders/${order.id}`}
                            className="hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline"
                          >
                            {order.order_number}
                          </Link>
                        </div>
                      </td>
                    )}
                    {visibleColumns.status && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            getStatusBadgeClass(order.status)
                          }`}
                        >
                          {order.status === 'draft' && <Clock className="w-3 h-3 mr-1" />}
                          {order.status === 'confirmed' && <CheckCircle className="w-3 h-3 mr-1" />}
                          {order.status === 'fulfilled' && <CheckCircle className="w-3 h-3 mr-1" />}
                          {order.status === 'partially_fulfilled' && <CheckCircle className="w-3 h-3 mr-1" />}
                          {order.status === 'cancelled' && <XCircle className="w-3 h-3 mr-1" />}
                          {getStatusText(order.status)}
                        </span>
                      </td>
                    )}
                    {visibleColumns.referenceNumber && (
                      <td className="px-6 py-4 whitespace-nowrap text-gray-700 dark:text-gray-300">
                        {order.reference_number || '-'}
                      </td>
                    )}
                    {visibleColumns.vendorName && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-700 dark:text-gray-300">
                            {order.vendor_name || '-'}
                          </span>
                        </div>
                      </td>
                    )}
                    {visibleColumns.totalAmount && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-900 dark:text-white">
                            {formatCurrency(order.total_amount, order.currency || "INR")}
                          </span>
                        </div>
                      </td>
                    )}
                    {visibleColumns.createdBy && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-700 dark:text-gray-300">
                            {order.creator_name || order.created_by || 'System'}
                          </span>
                        </div>
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
                            className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-50 dark:hover:text-gray-300 dark:hover:bg-gray-700/50 transition-all duration-200"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>

                          {activeActionMenu === order.id && (
                            <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg shadow-xl py-1 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                              <Link
                                href={`/purchase/purchase-orders/${order.id}`}
                                onClick={() => setActiveActionMenu(null)}
                                className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                              >
                                <Eye className="w-4 h-4 text-gray-400" />
                                <span>View Details</span>
                              </Link>

                              {order.status === "draft" && (
                                <Link
                                  href={`/purchase/purchase-orders/edit/${order.id}`}
                                  onClick={() => setActiveActionMenu(null)}
                                  className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                                >
                                  <Edit className="w-4 h-4 text-gray-400" />
                                  <span>Edit</span>
                                </Link>
                              )}

                              <button
                                onClick={() => {
                                  setActiveActionMenu(null);
                                  handleConvertToInvoice(order.id);
                                }}
                                disabled={converting === order.id}
                                className="flex w-full items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                              >
                                {converting === order.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Receipt className="w-4 h-4" />
                                )}
                                <span>Convert to Invoice</span>
                              </button>

                              <button
                                onClick={() => {
                                  setActiveActionMenu(null);
                                  handlePrintOrder(order.id);
                                }}
                                className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                              >
                                <Printer className="w-4 h-4 text-gray-400" />
                                <span>Print</span>
                              </button>

                              <button
                                onClick={() => {
                                  setActiveActionMenu(null);
                                  handlePDF(order.id);
                                }}
                                className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                              >
                                <FileDown className="w-4 h-4 text-gray-400" />
                                <span>Download PDF</span>
                              </button>

                              {order.status === "draft" && (
                                <>
                                  <div className="my-1 border-t border-gray-100 dark:border-gray-700"></div>
                                  <button
                                    onClick={() => {
                                      if (confirm(`Are you sure you want to delete purchase order ${order.order_number}?`)) {
                                        deletePurchaseOrder(order.id);
                                        setActiveActionMenu(null);
                                      }
                                    }}
                                    disabled={deleting === order.id}
                                    className="flex w-full items-center gap-3 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                  >
                                    {deleting === order.id ? (
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                      <Trash2 className="w-4 h-4" />
                                    )}
                                    <span>Delete Order</span>
                                  </button>
                                </>
                              )}
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

      {!loading && purchaseOrders.length > 0 && (
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, purchaseOrders.length)} of {purchaseOrders.length}
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
              Page {currentPage} of {Math.ceil(purchaseOrders.length / pageSize)}
            </div>
            <button
              onClick={() => setCurrentPage((p) => Math.min(Math.ceil(purchaseOrders.length / pageSize), p + 1))}
              disabled={currentPage === Math.ceil(purchaseOrders.length / pageSize)}
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
