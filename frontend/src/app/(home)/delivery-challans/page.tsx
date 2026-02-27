"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import { useEffect, useState, useRef, useCallback } from "react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { saveAs } from "file-saver";
import { addPdfPageNumbers, getProfessionalTableTheme } from "@/utils/pdfTheme";
import {
  Search,
  Filter,
  Plus,
  Truck,
  Package,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  Printer,
  Copy,
  ChevronDown,
  ChevronUp,
  Building,
  Download,
  FileText,
  RefreshCw,
  Calendar,
  MapPin,
  User,
  CreditCard,
} from "lucide-react";

interface DeliveryChallan {
  id: string;
  dc_number: string;
  dc_date: string;
  dc_type: string;
  status: string;
  customer_id: string;
  customer_name: string;
  invoice_id: string;
  invoice_number: string;
  transporter_name: string;
  vehicle_number: string;
  stock_updated: boolean;
  delivered_at: string;
  items_count?: number;
  total_value?: number;
}

interface DeliveryChallanDetail extends DeliveryChallan {
  reference_no?: string;
  contact_person?: string;
  engineer_name?: string;
  engineer_phone?: string;
  billing_address?: string;
  billing_city?: string;
  billing_state?: string;
  billing_pincode?: string;
  billing_gstin?: string;
  shipping_name?: string;
  shipping_gstin?: string;
  delivery_to_address?: string;
  delivery_to_city?: string;
  delivery_to_state?: string;
  delivery_to_pincode?: string;
  dispatch_from_address?: string;
  dispatch_from_city?: string;
  dispatch_from_state?: string;
  dispatch_from_pincode?: string;
  notes?: string;
  items?: Array<{
    description?: string;
    hsn_code?: string;
    model_no?: string;
    model_number?: string;
    quantity?: number;
    unit?: string;
    unit_price?: number;
    total_amount?: number;
    taxable_amount?: number;
  }>;
}

interface DCListResponse {
  items: DeliveryChallan[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

const DELIVERY_CHALLAN_PDF_LOGO_PATH = "/images/logo/savantec_logo.png";
let deliveryChallanLogoDataUrlCache: string | null = null;

const getDeliveryChallanLogoDataUrl = async (): Promise<string | null> => {
  if (deliveryChallanLogoDataUrlCache) return deliveryChallanLogoDataUrlCache;
  if (typeof window === "undefined") return null;

  try {
    const image = new Image();
    image.crossOrigin = "anonymous";

    const dataUrl = await new Promise<string>((resolve, reject) => {
      image.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        const context = canvas.getContext("2d");
        if (!context) {
          reject(new Error("Canvas context unavailable"));
          return;
        }
        context.drawImage(image, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      };
      image.onerror = () => reject(new Error("Failed to load delivery challan logo"));
      image.src = DELIVERY_CHALLAN_PDF_LOGO_PATH;
    });

    deliveryChallanLogoDataUrlCache = dataUrl;
    return dataUrl;
  } catch (error) {
    console.warn("Failed to load delivery challan PDF logo:", error);
    return null;
  }
};

// Print component for delivery challans
const PrintView = ({
  deliveryChallans,
  visibleColumns,
  formatDate,
  getStatusText,
  getTypeText,
  companyName,
  onComplete,
}: {
  deliveryChallans: DeliveryChallan[];
  visibleColumns: Record<string, boolean>;
  formatDate: (dateString: string | null | undefined) => string;
  getStatusText: (status: string) => string;
  getTypeText: (type: string) => string;
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
            Delivery Challans List
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
              {visibleColumns.dcNumber && (
                <th style={{ padding: '12px', textAlign: 'left', borderRight: '1px solid #ddd', fontWeight: 'bold' }}>DC Number</th>
              )}
              {visibleColumns.type && (
                <th style={{ padding: '12px', textAlign: 'left', borderRight: '1px solid #ddd', fontWeight: 'bold' }}>Type</th>
              )}
              {visibleColumns.customer && (
                <th style={{ padding: '12px', textAlign: 'left', borderRight: '1px solid #ddd', fontWeight: 'bold' }}>Customer</th>
              )}
              {visibleColumns.date && (
                <th style={{ padding: '12px', textAlign: 'left', borderRight: '1px solid #ddd', fontWeight: 'bold' }}>Date</th>
              )}
              {visibleColumns.invoice && (
                <th style={{ padding: '12px', textAlign: 'left', borderRight: '1px solid #ddd', fontWeight: 'bold' }}>Invoice</th>
              )}
              {visibleColumns.vehicle && (
                <th style={{ padding: '12px', textAlign: 'left', borderRight: '1px solid #ddd', fontWeight: 'bold' }}>Vehicle</th>
              )}
              {visibleColumns.transporter && (
                <th style={{ padding: '12px', textAlign: 'left', borderRight: '1px solid #ddd', fontWeight: 'bold' }}>Transporter</th>
              )}
              {visibleColumns.status && (
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>Status</th>
              )}
            </tr>
          </thead>
          <tbody>
            {deliveryChallans.map((dc, index) => (
              <tr key={dc.id} style={{
                borderBottom: '1px solid #ddd',
                backgroundColor: index % 2 === 0 ? '#fff' : '#f9f9f9'
              }}>
                {visibleColumns.dcNumber && (
                  <td style={{ padding: '12px', borderRight: '1px solid #ddd' }}>{dc.dc_number}</td>
                )}
                {visibleColumns.type && (
                  <td style={{ padding: '12px', borderRight: '1px solid #ddd' }}>
                    <span style={{
                      display: 'inline-block', padding: '4px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold',
                      backgroundColor: dc.dc_type === 'dc_out' ? '#e0e7ff' : '#fef3c7',
                      color: dc.dc_type === 'dc_out' ? '#4338ca' : '#92400e'
                    }}>
                      {getTypeText(dc.dc_type)}
                    </span>
                  </td>
                )}
                {visibleColumns.customer && (
                  <td style={{ padding: '12px', borderRight: '1px solid #ddd' }}>{dc.customer_name || '-'}</td>
                )}
                {visibleColumns.date && (
                  <td style={{ padding: '12px', borderRight: '1px solid #ddd' }}>{formatDate(dc.dc_date)}</td>
                )}
                {visibleColumns.invoice && (
                  <td style={{ padding: '12px', borderRight: '1px solid #ddd' }}>{dc.invoice_number || '-'}</td>
                )}
                {visibleColumns.vehicle && (
                  <td style={{ padding: '12px', borderRight: '1px solid #ddd' }}>{dc.vehicle_number || '-'}</td>
                )}
                {visibleColumns.transporter && (
                  <td style={{ padding: '12px', borderRight: '1px solid #ddd' }}>{dc.transporter_name || '-'}</td>
                )}
                {visibleColumns.status && (
                  <td style={{ padding: '12px' }}>
                    <span style={{
                      display: 'inline-block', padding: '4px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold',
                      backgroundColor:
                        dc.status === 'delivered' || dc.status === 'received' ? '#d1fae5' :
                        dc.status === 'dispatched' ? '#dbeafe' :
                        dc.status === 'in_transit' ? '#fef3c7' :
                        dc.status === 'cancelled' ? '#fee2e2' :
                        dc.status === 'returned' ? '#ffedd5' : '#f3f4f6',
                      color:
                        dc.status === 'delivered' || dc.status === 'received' ? '#065f46' :
                        dc.status === 'dispatched' ? '#1e40af' :
                        dc.status === 'in_transit' ? '#92400e' :
                        dc.status === 'cancelled' ? '#991b1b' :
                        dc.status === 'returned' ? '#9a3412' : '#374151'
                    }}>
                      {getStatusText(dc.status)}
                    </span>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{
          marginTop: '30px', paddingTop: '20px', borderTop: '1px solid #ddd',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <div style={{ fontSize: '12px', color: '#666' }}>Total Delivery Challans: {deliveryChallans.length}</div>
          <div style={{ fontSize: '12px', color: '#666' }}>Page 1 of 1</div>
        </div>
      </div>
    </div>
  );
};

// Local formatter functions
const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString.includes('T') ? dateString : dateString + 'T00:00:00');
    if (isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  } catch {
    return '-';
  }
};

const getToken = () => {
  if (typeof window === "undefined") return null;
  return (
    localStorage.getItem("employee_token") || localStorage.getItem("access_token")
  );
};

export default function DeliveryChallansPage() {
  const router = useRouter();
  const { company } = useAuth();
  const [data, setData] = useState<DCListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters state
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");

  // UI state
  const [showFilters, setShowFilters] = useState(false);
  const [showColumnDropdown, setShowColumnDropdown] = useState(false);
  const [activeActionMenu, setActiveActionMenu] = useState<string | null>(null);
  const [showPrintView, setShowPrintView] = useState(false);
  const [deliveryChallansToPrint, setDeliveryChallansToPrint] = useState<DeliveryChallan[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Export loading states
  const [copyLoading, setCopyLoading] = useState(false);
  const [excelLoading, setExcelLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [csvLoading, setCsvLoading] = useState(false);
  const [printLoading, setPrintLoading] = useState(false);

  const [cachedExportData, setCachedExportData] = useState<DeliveryChallan[] | null>(null);

  // Column visibility
  const [visibleColumns, setVisibleColumns] = useState({
    dcNumber: true,
    type: true,
    customer: true,
    date: true,
    invoice: true,
    vehicle: true,
    transporter: true,
    status: true,
    actions: true,
  });

  useEffect(() => {
    if (company?.id) {
      fetchDeliveryChallans();
    }
  }, [company?.id, currentPage, typeFilter, statusFilter]);

  useEffect(() => {
    if (company?.id) {
      setCachedExportData(null);
    }
  }, [typeFilter, statusFilter, fromDate, toDate]);

  useEffect(() => {
    setCurrentPage(1);
  }, [typeFilter, statusFilter, fromDate, toDate, search]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element | null;
      if (!target) return;
      if (!target.closest(".action-dropdown-container")) {
        setActiveActionMenu(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => { document.removeEventListener("mousedown", handleClickOutside); };
  }, []);

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

  const fetchDeliveryChallans = async () => {
    const token = getToken();
    if (!company?.id || !token) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams();
      params.append("page", currentPage.toString());
      params.append("page_size", pageSize.toString());
      if (typeFilter) params.append("dc_type", typeFilter);
      if (statusFilter) params.append("status", statusFilter);

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:6768/api"}/companies/${company.id}/delivery-challans?${params}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.ok) {
        const responseData = await response.json();
        setData(responseData);
      } else {
        const errorText = await response.text();
        console.error("Failed to fetch delivery challans:", response.status, errorText);
        setError("Failed to load delivery challans");
      }
    } catch (error) {
      console.error("Failed to fetch delivery challans:", error);
      setError("Failed to load delivery challans");
    } finally {
      setLoading(false);
    }
  };

  const fetchAllDeliveryChallansForExport = useCallback(async (): Promise<DeliveryChallan[]> => {
    const token = getToken();
    if (!company?.id || !token) return [];

    try {
      const params = new URLSearchParams();
      params.append("page_size", "1000");
      if (typeFilter) params.append("dc_type", typeFilter);
      if (statusFilter) params.append("status", statusFilter);

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:6768/api"}/companies/${company.id}/delivery-challans?${params}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.ok) {
        const responseData = await response.json();
        return responseData.items || [];
      }
      return [];
    } catch (error) {
      console.error("Export fetch failed:", error);
      return [];
    }
  }, [company?.id, typeFilter, statusFilter]);

  const getExportData = async (): Promise<DeliveryChallan[]> => {
    if (cachedExportData) return cachedExportData;
    const exportData = await fetchAllDeliveryChallansForExport();
    setCachedExportData(exportData);
    return exportData;
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchDeliveryChallans();
  };

  const handleReset = () => {
    setSearch("");
    setFromDate("");
    setToDate("");
    setTypeFilter("");
    setStatusFilter("");
    setCurrentPage(1);
    fetchDeliveryChallans();
  };

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      'draft': 'Draft',
      'dispatched': 'Dispatched',
      'in_transit': 'In Transit',
      'delivered': 'Delivered',
      'received': 'Received',
      'cancelled': 'Cancelled',
      'returned': 'Returned',
    };
    return statusMap[status] || status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getTypeText = (type: string) => {
    return type === 'dc_out' ? 'DC Out (Dispatch)' : 'DC In (Return)';
  };

  const getStatusBadgeClass = (status: string): string => {
    const statusColors: Record<string, string> = {
      draft: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
      dispatched: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
      in_transit: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
      delivered: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
      received: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
      cancelled: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
      returned: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
    };
    return statusColors[status] || "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
  };

  const getTypeBadgeClass = (type: string): string => {
    return type === 'dc_out'
      ? "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400"
      : "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400";
  };

  const applySearchFilter = (dcData: DeliveryChallan[]): DeliveryChallan[] => {
    if (!search) return dcData;
    const searchLower = search.toLowerCase();
    return dcData.filter(dc =>
      dc.dc_number?.toLowerCase().includes(searchLower) ||
      dc.customer_name?.toLowerCase().includes(searchLower) ||
      dc.invoice_number?.toLowerCase().includes(searchLower) ||
      dc.vehicle_number?.toLowerCase().includes(searchLower) ||
      dc.transporter_name?.toLowerCase().includes(searchLower)
    );
  };

  const applyFilters = (dcData: DeliveryChallan[]): DeliveryChallan[] => {
    let filtered = dcData;
    if (typeFilter) filtered = filtered.filter(dc => dc.dc_type === typeFilter);
    if (statusFilter) filtered = filtered.filter(dc => dc.status === statusFilter);
    if (fromDate) {
      filtered = filtered.filter(dc => {
        if (!dc.dc_date) return false;
        return new Date(dc.dc_date) >= new Date(fromDate);
      });
    }
    if (toDate) {
      filtered = filtered.filter(dc => {
        if (!dc.dc_date) return false;
        return new Date(dc.dc_date) <= new Date(toDate);
      });
    }
    return filtered;
  };

  const filteredItems = data?.items || [];

  const getAllFilteredItems = async (): Promise<DeliveryChallan[]> => {
    const allData = await getExportData();
    return applyFilters(applySearchFilter(allData));
  };

  const totalPages = data ? data.total_pages : 0;

  // ─── Export functions (list PDF unchanged) ───
  const copyToClipboard = async () => {
    if (copyLoading) return;
    setCopyLoading(true);
    try {
      const filtered = await getAllFilteredItems();
      const headers: string[] = [];
      const rows = filtered.map(dc => {
        const row: string[] = [];
        if (visibleColumns.dcNumber) { if (!headers.includes("DC Number")) headers.push("DC Number"); row.push(dc.dc_number || "-"); }
        if (visibleColumns.type) { if (!headers.includes("Type")) headers.push("Type"); row.push(getTypeText(dc.dc_type)); }
        if (visibleColumns.customer) { if (!headers.includes("Customer")) headers.push("Customer"); row.push(dc.customer_name || "-"); }
        if (visibleColumns.date) { if (!headers.includes("Date")) headers.push("Date"); row.push(formatDate(dc.dc_date)); }
        if (visibleColumns.invoice) { if (!headers.includes("Invoice")) headers.push("Invoice"); row.push(dc.invoice_number || "-"); }
        if (visibleColumns.vehicle) { if (!headers.includes("Vehicle")) headers.push("Vehicle"); row.push(dc.vehicle_number || "-"); }
        if (visibleColumns.transporter) { if (!headers.includes("Transporter")) headers.push("Transporter"); row.push(dc.transporter_name || "-"); }
        if (visibleColumns.status) { if (!headers.includes("Status")) headers.push("Status"); row.push(getStatusText(dc.status)); }
        return row;
      });
      const text = [headers.join("\t"), ...rows.map(r => r.join("\t"))].join("\n");
      await navigator.clipboard.writeText(text);
      alert("Delivery challan data copied to clipboard");
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
      const filtered = await getAllFilteredItems();
      const exportData = filtered.map(dc => {
        const row: Record<string, any> = {};
        if (visibleColumns.dcNumber) row["DC Number"] = dc.dc_number || "-";
        if (visibleColumns.type) row["Type"] = getTypeText(dc.dc_type);
        if (visibleColumns.customer) row["Customer"] = dc.customer_name || "-";
        if (visibleColumns.date) row["Date"] = formatDate(dc.dc_date);
        if (visibleColumns.invoice) row["Invoice"] = dc.invoice_number || "-";
        if (visibleColumns.vehicle) row["Vehicle Number"] = dc.vehicle_number || "-";
        if (visibleColumns.transporter) row["Transporter"] = dc.transporter_name || "-";
        if (visibleColumns.status) row["Status"] = getStatusText(dc.status);
        row["Stock Updated"] = dc.stock_updated ? "Yes" : "No";
        row["Items Count"] = dc.items_count || 0;
        row["Total Value"] = dc.total_value || 0;
        return row;
      });
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Delivery Challans");
      XLSX.writeFile(wb, "delivery_challans.xlsx");
    } catch (error) {
      console.error("Excel export failed:", error);
      alert("Failed to export Excel. Please try again.");
    } finally {
      setExcelLoading(false);
    }
  };

  // List PDF export (unchanged — uses landscape table format)
  const exportPDF = async () => {
    if (pdfLoading) return;
    setPdfLoading(true);
    try {
      const filtered = await getAllFilteredItems();
      const doc = new jsPDF("landscape");
      const headers: string[] = [];
      const body = filtered.map(dc => {
        const row: string[] = [];
        if (visibleColumns.dcNumber) { if (!headers.includes("DC Number")) headers.push("DC Number"); row.push(dc.dc_number || "N/A"); }
        if (visibleColumns.type) { if (!headers.includes("Type")) headers.push("Type"); row.push(getTypeText(dc.dc_type)); }
        if (visibleColumns.customer) { if (!headers.includes("Customer")) headers.push("Customer"); row.push(dc.customer_name || "N/A"); }
        if (visibleColumns.date) { if (!headers.includes("Date")) headers.push("Date"); row.push(formatDate(dc.dc_date)); }
        if (visibleColumns.invoice) { if (!headers.includes("Invoice")) headers.push("Invoice"); row.push(dc.invoice_number || "N/A"); }
        if (visibleColumns.vehicle) { if (!headers.includes("Vehicle")) headers.push("Vehicle"); row.push(dc.vehicle_number || "N/A"); }
        if (visibleColumns.transporter) { if (!headers.includes("Transporter")) headers.push("Transporter"); row.push(dc.transporter_name || "N/A"); }
        if (visibleColumns.status) { if (!headers.includes("Status")) headers.push("Status"); row.push(getStatusText(dc.status)); }
        return row;
      });
      autoTable(doc, {
        ...getProfessionalTableTheme(doc, "Delivery Challans List", company?.name || "", "l"),
        head: [headers],
        body: body,
        styles: { fontSize: 9, cellPadding: 3, overflow: "linebreak", font: "helvetica" },
      });
      addPdfPageNumbers(doc, "l");
      doc.save("delivery_challans.pdf");
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
      const filtered = await getAllFilteredItems();
      const exportData = filtered.map(dc => {
        const row: Record<string, any> = {};
        if (visibleColumns.dcNumber) row["DC Number"] = dc.dc_number || "-";
        if (visibleColumns.type) row["Type"] = getTypeText(dc.dc_type);
        if (visibleColumns.customer) row["Customer"] = dc.customer_name || "-";
        if (visibleColumns.date) row["Date"] = formatDate(dc.dc_date);
        if (visibleColumns.invoice) row["Invoice"] = dc.invoice_number || "-";
        if (visibleColumns.vehicle) row["Vehicle Number"] = dc.vehicle_number || "-";
        if (visibleColumns.transporter) row["Transporter"] = dc.transporter_name || "-";
        if (visibleColumns.status) row["Status"] = getStatusText(dc.status);
        return row;
      });
      const ws = XLSX.utils.json_to_sheet(exportData);
      const csv = XLSX.utils.sheet_to_csv(ws);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      saveAs(blob, "delivery_challans.csv");
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
      const filtered = await getAllFilteredItems();
      setDeliveryChallansToPrint(filtered);
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

  const handleDelete = async (dcId: string, dcNumber: string) => {
    const token = getToken();
    if (!company?.id || !token) return;

    if (window.confirm(`Are you sure you want to delete delivery challan ${dcNumber}? This action cannot be undone.`)) {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:6768/api"}/companies/${company.id}/delivery-challans/${dcId}`,
          { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }
        );
        if (response.ok) {
          fetchDeliveryChallans();
        } else {
          alert("Failed to delete delivery challan");
        }
      } catch (error) {
        console.error("Error deleting delivery challan:", error);
        alert("Failed to delete delivery challan");
      }
    }
  };

  const fetchDeliveryChallanDetail = async (dcId: string): Promise<DeliveryChallanDetail | null> => {
    const token = getToken();
    if (!company?.id || !token) return null;
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:6768/api"}/companies/${company.id}/delivery-challans/${dcId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!response.ok) return null;
      return (await response.json()) as DeliveryChallanDetail;
    } catch (error) {
      console.error("Failed to fetch delivery challan detail:", error);
      return null;
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // buildDeliveryChallanPdf — matches SAPL_DC.pdf design exactly
  // Layout: Portrait A4, bordered boxes, NO price columns in items table
  // ─────────────────────────────────────────────────────────────────────────────
  const buildDeliveryChallanPdf = (dc: DeliveryChallanDetail, logoDataUrl: string | null = null): jsPDF => {
    const doc = new jsPDF("p", "mm", "a4");
    const pageW = 210;
    const marginL = 10;
    const marginR = 10;
    const contentW = pageW - marginL - marginR;
    const companyData = (company || {}) as any;

    const v = (value: unknown) => (value === undefined || value === null || value === "" ? "-" : String(value));
    const joinText = (...parts: Array<unknown>) => parts.filter(Boolean).map(String).join(", ");

    const billingAddress = joinText(dc.billing_address, dc.billing_city, dc.billing_state, dc.billing_pincode);
    const shippingAddress = joinText(dc.delivery_to_address, dc.delivery_to_city, dc.delivery_to_state, dc.delivery_to_pincode);
    const dispatchAddress = joinText(
      dc.dispatch_from_address || companyData.address_line1,
      companyData.address_line2,
      dc.dispatch_from_city || companyData.city,
      dc.dispatch_from_state || companyData.state,
      dc.dispatch_from_pincode || companyData.pincode
    );
    const contactInfo = [dc.contact_person, (dc as any).contact_phone].filter(Boolean).join(" / ");
    const engineerInfo = [dc.engineer_name, dc.engineer_phone].filter(Boolean).join(" / ");

    doc.setLineWidth(0.3);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(7.5);
    doc.text("(ORIGINAL FOR RECIPIENT)", pageW - marginR, 8, { align: "right" });

    let y = 11;

    const headerH = 26;
    doc.rect(marginL, y, contentW, headerH);
    const logoDivX = marginL + 42;
    // doc.line(logoDivX, y, logoDivX, y + headerH);

    if (logoDataUrl) {
      doc.addImage(logoDataUrl, "PNG", marginL + 2, y + 3, 36, headerH - 6);
    } else {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("SAVANTEC", marginL + 3, y + 14);
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(v(companyData.name || "Savantec Automation Private Limited"), logoDivX + 3, y + 7);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    const addrStr = joinText(companyData.address_line1, companyData.address_line2, companyData.city, companyData.state, companyData.pincode);
    const wrappedAddr = doc.splitTextToSize(addrStr || "-", contentW - 47);
    doc.text(wrappedAddr.slice(0, 2), logoDivX + 3, y + 12.5);
    doc.text(`Mob.: ${v(companyData.phone)}`, logoDivX + 3, y + 20.5);
    doc.text(`Email: ${v(companyData.email)}`, logoDivX + 3, y + 24.5);
    y += headerH;

    const titleH = 8;
    doc.rect(marginL, y, contentW, titleH);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("DELIVERY CHALLAN", pageW / 2, y + 5.5, { align: "center" });
    y += titleH;

    const infoH = 8;
    const col1W = contentW / 3;
    const col2W = contentW / 3;
    const col3W = contentW - col1W - col2W;
    const drawInfoCell = (x: number, w: number, label: string, value: string, offset = 2) => {
      doc.rect(x, y, w, infoH);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.2);
      doc.text(label, x + 2, y + 5.2);
      doc.setFont("helvetica", "normal");
      doc.text(value || "-", x + offset, y + 5.2, { maxWidth: w - offset - 2 });
    };

    drawInfoCell(marginL, col1W, "Delivery Challan No.", v(dc.dc_number), 38);
    drawInfoCell(marginL + col1W, col2W, "DC Date:", formatDate(dc.dc_date), 20);
    drawInfoCell(marginL + col1W + col2W, col3W, "Contact Person:", contactInfo || "-", 29);
    y += infoH;

    drawInfoCell(marginL, col1W, "Reference No.:", v(dc.reference_no), 24);
    drawInfoCell(marginL + col1W, col2W, "Invoice No.:", v(dc.invoice_number), 22);
    drawInfoCell(marginL + col1W + col2W, col3W, "Engineer:", engineerInfo || "-", 20);
    y += infoH;

    const addrHdrH = 6;
    const thirdW = contentW / 3;
    doc.rect(marginL, y, thirdW, addrHdrH);
    doc.rect(marginL + thirdW, y, thirdW, addrHdrH);
    doc.rect(marginL + thirdW * 2, y, contentW - thirdW * 2, addrHdrH);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text("Customer Name & Billing Address", marginL + 2, y + 4);
    doc.text("Shipping Address", marginL + thirdW + 2, y + 4);
    doc.text("Dispatch From Address", marginL + thirdW * 2 + 2, y + 4);
    y += addrHdrH;

    const addrBodyH = 30;
    doc.rect(marginL, y, thirdW, addrBodyH);
    doc.rect(marginL + thirdW, y, thirdW, addrBodyH);
    doc.rect(marginL + thirdW * 2, y, contentW - thirdW * 2, addrBodyH);

    const drawAddressBlock = (x: number, name: string, address: string, gstin: string) => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.text(name || "-", x + 2, y + 5);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.2);
      const lines = doc.splitTextToSize(address || "-", thirdW - 4);
      lines.slice(0, 4).forEach((line: string, idx: number) => {
        doc.text(line, x + 2, y + 10 + idx * 3.8);
      });
      doc.text(`GST Number: ${gstin || "-"}`, x + 2, y + 26);
    };

    drawAddressBlock(marginL, dc.customer_name || "", billingAddress, dc.billing_gstin || (dc as any).customer_gstin || "");
    drawAddressBlock(marginL + thirdW, dc.shipping_name || dc.customer_name || "", shippingAddress, dc.shipping_gstin || "");
    drawAddressBlock(marginL + thirdW * 2, companyData.name || "Dispatch Location", dispatchAddress, companyData.gstin || "");
    y += addrBodyH;

    doc.rect(marginL, y, col1W, infoH);
    doc.rect(marginL + col1W, y, col2W, infoH);
    doc.rect(marginL + col1W + col2W, y, col3W, infoH);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.2);
    doc.text("Mode Of Transport:", marginL + 2, y + 5.2);
    doc.text("Vehicle No.:", marginL + col1W + 2, y + 5.2);
    doc.text("E-Way Bill / LR No.:", marginL + col1W + col2W + 2, y + 5.2);
    doc.setFont("helvetica", "normal");
    doc.text(v(dc.transporter_name), marginL + 31, y + 5.2, { maxWidth: col1W - 33 });
    doc.text(v(dc.vehicle_number), marginL + col1W + 21, y + 5.2, { maxWidth: col2W - 23 });
    const ewayOrLr = [(dc as any).eway_bill_number, (dc as any).lr_number].filter(Boolean).join(" / ");
    doc.text(ewayOrLr || "-", marginL + col1W + col2W + 36, y + 5.2, {
      maxWidth: col3W - 38,
    });
    y += infoH;

    const items = Array.isArray(dc.items) ? dc.items : [];
    const tableRows = items.map((item, idx) => [
      String(idx + 1),
      v(item.description),
      v(item.model_no || item.model_number || ""),
      v(item.hsn_code),
      item.quantity !== undefined && item.quantity !== null ? Number(item.quantity).toFixed(2) : "",
      v(item.unit),
    ]);
    while (tableRows.length < 10) tableRows.push(["", "", "", "", "", ""]);

    autoTable(doc, {
      startY: y,
      head: [["SL#", "Description of Goods", "Model No", "HSN", "Qty", "UOM"]],
      body: tableRows,
      theme: "grid",
      styles: {
        fontSize: 8,
        cellPadding: { top: 2.5, bottom: 2.5, left: 2, right: 2 },
        lineColor: [0, 0, 0],
        lineWidth: 0.3,
        textColor: [0, 0, 0],
        valign: "middle",
        minCellHeight: 7,
      },
      headStyles: {
        fillColor: [255, 255, 255],
        textColor: [0, 0, 0],
        fontStyle: "bold",
        lineColor: [0, 0, 0],
        lineWidth: 0.3,
        halign: "center",
      },
      columnStyles: {
        0: { cellWidth: 12, halign: "center" },
        1: { cellWidth: 82, halign: "left" },
        2: { cellWidth: 26, halign: "center" },
        3: { cellWidth: 26, halign: "center" },
        4: { cellWidth: 22, halign: "right" },
        5: { cellWidth: 22, halign: "center" },
      },
      didParseCell: (data) => {
        if (data.section === "head") {
          data.cell.styles.lineWidth = { top: 0.3, right: 0.3, bottom: 0.3, left: 0.3 };
        }
        if (data.section === "body") {
          const isFirstBodyRow = data.row.index === 0;
          data.cell.styles.lineWidth = { top: isFirstBodyRow ? 0.3 : 0, right: 0.3, bottom: 0, left: 0.3 };
        }
      },
      margin: { left: marginL, right: marginR },
    });

    y = (doc as any).lastAutoTable?.finalY ?? y;

    const totalH = 8;
    const totalQty = items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
    const totalLabelW = contentW - 22 - 22;
    const totalQtyW = 22;
    const totalUomW = 22;
    const dominantUom = items.find((item) => item.unit)?.unit || "";

    doc.rect(marginL, y, totalLabelW, totalH);
    doc.rect(marginL + totalLabelW, y, totalQtyW, totalH);
    doc.rect(marginL + totalLabelW + totalQtyW, y, totalUomW, totalH);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("Total", marginL + totalLabelW / 2, y + 5.2, { align: "center" });
    doc.text(totalQty.toFixed(2), marginL + totalLabelW + totalQtyW - 2, y + 5.2, { align: "right" });
    doc.text(v(dominantUom), marginL + totalLabelW + totalQtyW + totalUomW / 2, y + 5.2, { align: "center" });
    y += totalH;

    const remarksH = 12;
    doc.rect(marginL, y, contentW, remarksH);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text("Remarks:", marginL + 2, y + 4.8);
    doc.setFont("helvetica", "normal");
    const remarksText = v(dc.notes)
      .replace(/\s*\n+\s*/g, " | ")
      .replace(/[¹²³]/g, "")
      .replace(/(\d)\s+(?=\d)/g, "$1")
      .replace(/\s*,\s*/g, ", ")
      .replace(/\s{2,}/g, " ")
      .trim();
    const remarkLines = doc.splitTextToSize(remarksText, contentW - 25).slice(0, 2);
    remarkLines.forEach((line: string, idx: number) => {
      doc.text(line, marginL + 22, y + 4.8 + idx * 4);
    });
    y += remarksH;

    const bottomH = 28;
    const bCol1 = contentW * 0.46;
    const bCol2 = contentW * 0.27;
    const bCol3 = contentW - bCol1 - bCol2;
    doc.rect(marginL, y, bCol1, bottomH);
    doc.rect(marginL + bCol1, y, bCol2, bottomH);
    doc.rect(marginL + bCol1 + bCol2, y, bCol3, bottomH);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text("Terms & Conditions:", marginL + 2, y + 5);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.2);
    doc.text("1. Materials to be checked at delivery and acknowledged.", marginL + 2, y + 10);
    doc.text("2. Company is not responsible for delay due to transporter.", marginL + 2, y + 14);
    doc.text("3. Subject to Chennai jurisdiction.", marginL + 2, y + 18);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text("Receiver's Signature", marginL + bCol1 + bCol2 / 2, y + bottomH - 3, { align: "center" });
    doc.text(`for ${v(companyData.name)}`, marginL + bCol1 + bCol2 + bCol3 - 2, y + 5, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.text("Authorised Signatory", marginL + bCol1 + bCol2 + bCol3 - 2, y + bottomH - 3, { align: "right" });

    return doc;
  };
  const handleDownloadChallanPdf = async (dcId: string, dcNumber: string) => {
    const dcDetail = await fetchDeliveryChallanDetail(dcId);
    if (!dcDetail) {
      alert("Failed to load delivery challan details");
      return;
    }
    const logoDataUrl = await getDeliveryChallanLogoDataUrl();
    const doc = buildDeliveryChallanPdf(dcDetail, logoDataUrl);
    const safeNumber = (dcNumber || "delivery_challan").replace(/[\\/:*?"<>|]/g, "_");
    doc.save(`DC_${safeNumber}.pdf`);
  };

  const handlePrintChallan = async (dcId: string) => {
    const dcDetail = await fetchDeliveryChallanDetail(dcId);
    if (!dcDetail) {
      alert("Failed to load delivery challan details");
      return;
    }
    const logoDataUrl = await getDeliveryChallanLogoDataUrl();
    const doc = buildDeliveryChallanPdf(dcDetail, logoDataUrl);
    const blob = doc.output("blob");
    const url = URL.createObjectURL(blob);
    const printWindow = window.open(url, "_blank");
    if (printWindow) {
      setTimeout(() => { printWindow.print(); }, 500);
    }
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  };

  if (!company?.id) {
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
          deliveryChallans={deliveryChallansToPrint}
          visibleColumns={visibleColumns}
          formatDate={formatDate}
          getStatusText={getStatusText}
          getTypeText={getTypeText}
          companyName={company?.name || ''}
        />
      )}

      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Delivery Challans</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Manage dispatch (DC Out) and returns (DC In)
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => router.push('/delivery-challans/new?type=dc_out')}
              className="px-4 py-2 transition bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              DC Out (Dispatch)
            </button>
            <button
              onClick={() => router.push('/delivery-challans/new?type=dc_in')}
              className="px-4 py-2 transition bg-white dark:bg-gray-700 border border-indigo-600 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              DC In (Return)
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="px-6 py-6 bg-gray-50 dark:bg-gray-900">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{data?.total || 0}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Total Challans</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
                <Truck className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-blue-600">
                  {data?.items?.filter(dc => dc.status === 'dispatched' || dc.status === 'in_transit').length || 0}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">In Transit/Dispatched</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                <Clock className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-green-600">
                  {data?.items?.filter(dc => dc.status === 'delivered' || dc.status === 'received').length || 0}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Delivered/Received</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-indigo-600">
                  {data?.items?.filter(dc => dc.dc_type === 'dc_out').length || 0}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">DC Out (Dispatch)</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-indigo-100 dark:bg-indigo-900/20 flex items-center justify-center">
                <Package className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
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
                placeholder="Search by DC number, customer, invoice, vehicle..."
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
              {copyLoading ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-transparent"></div> : <Copy className="w-5 h-5" />}
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
                      <span className="capitalize">
                        {key === 'dcNumber' ? 'DC Number' :
                         key === 'type' ? 'Type' :
                         key === 'customer' ? 'Customer' :
                         key === 'date' ? 'Date' :
                         key === 'invoice' ? 'Invoice' :
                         key === 'vehicle' ? 'Vehicle' :
                         key === 'transporter' ? 'Transporter' :
                         key === 'status' ? 'Status' :
                         key.replace(/([A-Z])/g, ' $1').trim()}
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
              {excelLoading ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-transparent"></div> : <><FileText className="w-5 h-5" />Excel</>}
            </button>

            <button
              onClick={exportPDF}
              disabled={pdfLoading}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {pdfLoading ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-transparent"></div> : <><Download className="w-5 h-5" />PDF</>}
            </button>

            <button
              onClick={exportCSV}
              disabled={csvLoading}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {csvLoading ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-transparent"></div> : <><FileText className="w-5 h-5" />CSV</>}
            </button>

            <button
              onClick={handlePrint}
              disabled={printLoading}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {printLoading ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-transparent"></div> : <><Printer className="w-5 h-5" />Print</>}
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
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="">All Types</option>
                <option value="dc_out">DC Out (Dispatch)</option>
                <option value="dc_in">DC In (Return)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="">All Status</option>
                <option value="draft">Draft</option>
                <option value="dispatched">Dispatched</option>
                <option value="in_transit">In Transit</option>
                <option value="delivered">Delivered</option>
                <option value="received">Received</option>
                <option value="cancelled">Cancelled</option>
                <option value="returned">Returned</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">From Date</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">To Date</label>
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

      {/* Error */}
      {error && (
        <div className="mx-6 mt-4 bg-red-50 border border-red-200 rounded-lg p-4 dark:bg-red-900/20 dark:border-red-800">
          <p className="text-red-800 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
        <div className="overflow-x-auto">
          <table className="w-full table-auto">
            <thead className="bg-gray-200 dark:bg-gray-700/50">
              <tr className="text-sm font-semibold text-gray-600 dark:text-gray-300">
                <th className="text-left px-3 py-3 w-[60px]">S.No</th>
                {visibleColumns.dcNumber && <th className="text-left px-3 py-3">DC Number</th>}
                {visibleColumns.type && <th className="text-left px-3 py-3">Type</th>}
                {visibleColumns.customer && <th className="text-left px-3 py-3">Customer</th>}
                {visibleColumns.date && <th className="text-left px-3 py-3">Date</th>}
                {visibleColumns.invoice && <th className="text-left px-3 py-3">Invoice</th>}
                {visibleColumns.vehicle && <th className="text-left px-3 py-3">Vehicle</th>}
                {visibleColumns.transporter && <th className="text-left px-3 py-3">Transporter</th>}
                {visibleColumns.status && <th className="w-[90px] min-w-[90px] text-left px-2 py-3">Status</th>}
                {visibleColumns.actions && <th className="w-[68px] min-w-[68px] text-center px-2 py-3">Actions</th>}
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
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={Object.values(visibleColumns).filter(Boolean).length + 1} className="px-6 py-8 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <Truck className="w-12 h-12 text-gray-400 mb-2" />
                      <p className="text-lg font-medium text-gray-900 dark:text-white mb-1">No delivery challans found</p>
                      <p className="text-gray-500 dark:text-gray-400 mb-4">
                        {statusFilter || typeFilter || search || fromDate || toDate
                          ? "No delivery challans found matching your filters. Try adjusting your search criteria."
                          : "Create your first delivery challan to start managing dispatches."}
                      </p>
                      <div className="flex gap-2">
                        <button onClick={() => router.push('/delivery-challans/new?type=dc_out')} className="text-indigo-600 hover:underline dark:text-indigo-400">Create DC Out</button>
                        <span className="text-gray-400">|</span>
                        <button onClick={() => router.push('/delivery-challans/new?type=dc_in')} className="text-indigo-600 hover:underline dark:text-indigo-400">Create DC In</button>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredItems.map((dc, index) => (
                  <tr key={dc.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="px-3 py-4 align-top text-gray-700 dark:text-gray-300 w-[60px]">
                      {(currentPage - 1) * pageSize + index + 1}
                    </td>
                    {visibleColumns.dcNumber && (
                      <td className="px-3 py-4 align-top">
                        <div className="font-medium text-indigo-600 dark:text-indigo-400">{dc.dc_number}</div>
                      </td>
                    )}
                    {visibleColumns.type && (
                      <td className="px-3 py-4 align-top">
                        <span className={`inline-flex whitespace-nowrap px-2 py-0.5 rounded-full text-xs font-medium ${getTypeBadgeClass(dc.dc_type)}`}>
                          {dc.dc_type === 'dc_out' ? 'DC Out' : 'DC In'}
                        </span>
                      </td>
                    )}
                    {visibleColumns.customer && (
                      <td className="px-3 py-4 align-top">
                        <div className="flex items-center gap-2">
                          <Building className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          <span className="truncate">{dc.customer_name || '-'}</span>
                        </div>
                      </td>
                    )}
                    {visibleColumns.date && (
                      <td className="px-3 py-4 align-top">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          {formatDate(dc.dc_date)}
                        </div>
                      </td>
                    )}
                    {visibleColumns.invoice && (
                      <td className="px-3 py-4 align-top">
                        {dc.invoice_number ? (
                          <Link href={`/invoices/${dc.invoice_id}`} className="text-indigo-600 hover:underline dark:text-indigo-400">
                            {dc.invoice_number}
                          </Link>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    )}
                    {visibleColumns.vehicle && (
                      <td className="px-3 py-4 align-top">
                        <div className="flex items-center gap-2">
                          <Truck className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          <span>{dc.vehicle_number || '-'}</span>
                        </div>
                      </td>
                    )}
                    {visibleColumns.transporter && (
                      <td className="px-3 py-4 align-top">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          <span className="truncate">{dc.transporter_name || '-'}</span>
                        </div>
                      </td>
                    )}
                    {visibleColumns.status && (
                      <td className="w-[90px] min-w-[90px] px-2 py-4 align-top">
                        <span className={`inline-flex whitespace-nowrap px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(dc.status)}`}>
                          {dc.status === 'delivered' && <CheckCircle className="w-3 h-3 mr-1" />}
                          {dc.status === 'received' && <CheckCircle className="w-3 h-3 mr-1" />}
                          {dc.status === 'dispatched' && <Package className="w-3 h-3 mr-1" />}
                          {dc.status === 'in_transit' && <Clock className="w-3 h-3 mr-1" />}
                          {dc.status === 'draft' && <AlertCircle className="w-3 h-3 mr-1" />}
                          {dc.status === 'cancelled' && <XCircle className="w-3 h-3 mr-1" />}
                          {dc.status === 'returned' && <RefreshCw className="w-3 h-3 mr-1" />}
                          {getStatusText(dc.status)}
                        </span>
                      </td>
                    )}
                    {visibleColumns.actions && (
                      <td className="w-[68px] min-w-[68px] px-2 py-4 text-center align-top">
                        <div className="relative action-dropdown-container inline-flex justify-center w-full">
                          <button
                            onClick={() => setActiveActionMenu(activeActionMenu === dc.id ? null : dc.id)}
                            className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-50 dark:hover:text-gray-300 dark:hover:bg-gray-700/50 transition-all duration-200"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>

                          {activeActionMenu === dc.id && (
                            <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg shadow-xl py-1 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                              <Link
                                href={`/delivery-challans/${dc.id}`}
                                onClick={() => setActiveActionMenu(null)}
                                className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                              >
                                <Eye className="w-4 h-4 text-gray-400" />
                                <span>View Details</span>
                              </Link>
                              <Link
                                href={`/delivery-challans/${dc.id}`}
                                onClick={() => setActiveActionMenu(null)}
                                className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                              >
                                <Edit className="w-4 h-4 text-gray-400" />
                                <span>Edit</span>
                              </Link>
                              <button
                                onClick={() => { setActiveActionMenu(null); handlePrintChallan(dc.id); }}
                                className="flex w-full items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                              >
                                <Printer className="w-4 h-4 text-gray-400" />
                                <span>Print</span>
                              </button>
                              <button
                                onClick={() => { setActiveActionMenu(null); handleDownloadChallanPdf(dc.id, dc.dc_number); }}
                                className="flex w-full items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                              >
                                <Download className="w-4 h-4 text-gray-400" />
                                <span>Download PDF</span>
                              </button>
                              <div className="my-1 border-t border-gray-100 dark:border-gray-700"></div>
                              <button
                                onClick={() => { handleDelete(dc.id, dc.dc_number); setActiveActionMenu(null); }}
                                className="flex w-full items-center gap-3 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                                <span>Delete</span>
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

      {/* Pagination */}
      {!loading && filteredItems.length > 0 && totalPages > 0 && (
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
            <div className="text-sm text-gray-700 dark:text-gray-300">Page {currentPage} of {totalPages}</div>
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
