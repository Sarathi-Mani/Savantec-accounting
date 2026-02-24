"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { purchaseRequestsApi, brandsApi, productsApi, getErrorMessage } from "@/services/api";
import Link from "next/link";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { saveAs } from "file-saver";
import { addPdfPageNumbers, getProfessionalTableTheme } from "@/utils/pdfTheme";
import {
  Search,
  Filter,
  Plus,
  Users,
  Calendar,
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
  FileDigit,
  ShoppingCart,
  CheckSquare,
  Square,
} from "lucide-react";

interface PurchaseRequest {
  id: string;
  purchase_req_no: string;
  customer_id: string;
  customer_name: string;
  request_date: string;
  status: "pending" | "open" | "in_progress" | "closed";
  total_items: number;
  total_quantity: number;
  notes?: string;
  created_by_user?: string;
  created_by_employee?: string;
  created_by_name?: string;
  created_by_email?: string;
  created_at: string;
  updated_at: string;
  items?: Array<{
    product_id?: string;
    make?: string;
    item?: string;
  }>;
}

interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
}

interface BrandOption {
  id: string;
  name: string;
}

const getCreatedByDisplay = (request: PurchaseRequest): string => {
  if (request.created_by_name?.trim()) return request.created_by_name.trim();
  if (request.created_by_email?.trim()) return request.created_by_email.trim();
  if (request.created_by_user?.trim()) return request.created_by_user.trim();
  if (request.created_by_employee?.trim()) return request.created_by_employee.trim();
  return "-";
};

// Print component for purchase requests
const PrintView = ({
  purchaseRequests,
  visibleColumns,
  formatDate,
  getStatusText,
  getStatusBadgeClass,
  companyName,
  onComplete,
}: {
  purchaseRequests: PurchaseRequest[];
  visibleColumns: Record<string, boolean>;
  formatDate: (dateString: string | null | undefined) => string;
  getStatusText: (status: string) => string;
  getStatusBadgeClass: (status: string) => string;
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
            Purchase Requests List
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
              {visibleColumns.requestNumber && (
                <th style={{
                  padding: '12px',
                  textAlign: 'left',
                  borderRight: '1px solid #ddd',
                  fontWeight: 'bold'
                }}>
                  Request #
                </th>
              )}
              {visibleColumns.customer && (
                <th style={{
                  padding: '12px',
                  textAlign: 'left',
                  borderRight: '1px solid #ddd',
                  fontWeight: 'bold'
                }}>
                  Customer
                </th>
              )}
              {visibleColumns.requestDate && (
                <th style={{
                  padding: '12px',
                  textAlign: 'left',
                  borderRight: '1px solid #ddd',
                  fontWeight: 'bold'
                }}>
                  Request Date
                </th>
              )}
              {visibleColumns.createdBy && (
                <th style={{
                  padding: '12px',
                  textAlign: 'left',
                  borderRight: '1px solid #ddd',
                  fontWeight: 'bold'
                }}>
                  Created By
                </th>
              )}
              {visibleColumns.items && (
                <th style={{
                  padding: '12px',
                  textAlign: 'left',
                  borderRight: '1px solid #ddd',
                  fontWeight: 'bold'
                }}>
                  Items
                </th>
              )}
              {visibleColumns.quantity && (
                <th style={{
                  padding: '12px',
                  textAlign: 'left',
                  borderRight: '1px solid #ddd',
                  fontWeight: 'bold'
                }}>
                  Quantity
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
            {purchaseRequests.map((request, index) => (
              <tr key={request.id} style={{
                borderBottom: '1px solid #ddd',
                backgroundColor: index % 2 === 0 ? '#fff' : '#f9f9f9'
              }}>
                {visibleColumns.requestNumber && (
                  <td style={{
                    padding: '12px',
                    borderRight: '1px solid #ddd',
                    fontWeight: '500'
                  }}>
                    {request.purchase_req_no || `PR-${request.id.slice(0, 8)}`}
                  </td>
                )}
                {visibleColumns.customer && (
                  <td style={{
                    padding: '12px',
                    borderRight: '1px solid #ddd'
                  }}>
                    {request.customer_name || '-'}
                  </td>
                )}
                {visibleColumns.requestDate && (
                  <td style={{
                    padding: '12px',
                    borderRight: '1px solid #ddd'
                  }}>
                    {formatDate(request.request_date || request.created_at)}
                  </td>
                )}
                {visibleColumns.createdBy && (
                  <td style={{
                    padding: '12px',
                    borderRight: '1px solid #ddd'
                  }}>
                    {getCreatedByDisplay(request)}
                  </td>
                )}
                {visibleColumns.items && (
                  <td style={{
                    padding: '12px',
                    borderRight: '1px solid #ddd'
                  }}>
                    {request.total_items || 0}
                  </td>
                )}
                {visibleColumns.quantity && (
                  <td style={{
                    padding: '12px',
                    borderRight: '1px solid #ddd'
                  }}>
                    {request.total_quantity || 0}
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
                      backgroundColor: request.status === 'open' ? '#d1fae5' :
                        request.status === 'pending' ? '#fef3c7' :
                          request.status === 'in_progress' ? '#dbeafe' :
                            request.status === 'closed' ? '#fee2e2' :
                              '#f3f4f6',
                      color: request.status === 'open' ? '#065f46' :
                        request.status === 'pending' ? '#92400e' :
                          request.status === 'in_progress' ? '#1e40af' :
                            request.status === 'closed' ? '#991b1b' :
                              '#374151'
                    }}>
                      {getStatusText(request.status)}
                    </span>
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
            Total Requests: {purchaseRequests.length}
          </div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            Page 1 of 1
          </div>
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

export default function PurchaseRequestsPage() {
  const { company } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<{
    id: string;
    purchase_req_no: string;
    customer_name: string;
    currentStatus: string;
    newStatus: string;
  } | null>(null);
  const [error, setError] = useState<string>("");
  const [purchaseRequests, setPurchaseRequests] = useState<PurchaseRequest[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  
  // Filters state
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [customerFilter, setCustomerFilter] = useState("");
  const [itemFilter, setItemFilter] = useState("");
  const [brandFilter, setBrandFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [brands, setBrands] = useState<BrandOption[]>([]);
  const [productBrandNameMap, setProductBrandNameMap] = useState<Record<string, string>>({});
  
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
  const [showPrintView, setShowPrintView] = useState(false);
  const [requestsToPrint, setRequestsToPrint] = useState<PurchaseRequest[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [activeActionMenu, setActiveActionMenu] = useState<string | null>(null);
  const pageSize = 10;
  
  // Export loading states
  const [copyLoading, setCopyLoading] = useState(false);
  const [excelLoading, setExcelLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [csvLoading, setCsvLoading] = useState(false);
  const [printLoading, setPrintLoading] = useState(false);
  
  const [cachedExportData, setCachedExportData] = useState<PurchaseRequest[] | null>(null);
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);
  const [selectedRequestIds, setSelectedRequestIds] = useState<string[]>([]);
  
  // Column visibility
  const [visibleColumns, setVisibleColumns] = useState({
    requestNumber: true,
    customer: true,
    requestDate: true,
    createdBy: true,
    items: true,
    quantity: true,
    status: true,
    actions: true,
  });

  const companyId = company?.id || (typeof window !== "undefined" ? localStorage.getItem("company_id") : null);

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    open: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    in_progress: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    closed: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
  };

  const statusLabels: Record<string, string> = {
    pending: "Pending",
    open: "Open",
    in_progress: "In Progress",
    closed: "Closed"
  };

  const getStatusText = (status: string) => {
    return statusLabels[status] || status.charAt(0).toUpperCase() + status.slice(1);
  };

  const getStatusBadgeClass = (status: string): string => {
    return statusColors[status] || "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
  };

  useEffect(() => {
    if (companyId) {
      fetchPurchaseRequests();
    }
  }, [companyId]);

  useEffect(() => {
    if (companyId) {
      fetchBrandsForBrandFilter();
    }
  }, [companyId]);

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
    if (companyId) {
      fetchPurchaseRequests();
      setCachedExportData(null);
    }
  }, [statusFilter, customerFilter, brandFilter, fromDate, toDate]);

  useEffect(() => {
    setSelectedRequestIds((prev) =>
      prev.filter((id) => purchaseRequests.some((request) => request.id === id))
    );
  }, [purchaseRequests]);

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, customerFilter, itemFilter, brandFilter, fromDate, toDate, search]);

  const fetchBrandsForBrandFilter = async () => {
    try {
      if (!companyId) return;

      const pageSize = 100; // Backend validates page_size <= 100
      let page = 1;
      let allBrands: any[] = [];

      while (true) {
        const brandsResult = await brandsApi.list(companyId, { page, page_size: pageSize });
        const batch = brandsResult?.brands || [];
        allBrands = allBrands.concat(batch);
        if (batch.length < pageSize) break;
        page += 1;
      }

      const fetchedBrands: BrandOption[] = allBrands.map((b: any) => ({
        id: b.id,
        name: b.name,
      }));
      setBrands(fetchedBrands);

      const brandNameById: Record<string, string> = {};
      fetchedBrands.forEach((b) => {
        brandNameById[String(b.id)] = b.name;
      });

      const productPageSize = 100;
      let productPage = 1;
      const nextProductBrandNameMap: Record<string, string> = {};
      while (true) {
        const productsResult: any = await productsApi.list(companyId, { page: productPage, page_size: productPageSize });
        const batch: any[] = Array.isArray(productsResult)
          ? productsResult
          : (productsResult?.products || productsResult?.data || productsResult?.items || []);

        batch.forEach((product: any) => {
          const pid = product?.id ? String(product.id) : "";
          if (!pid) return;
          const brandName =
            product?.brand?.name ||
            (product?.brand_id ? brandNameById[String(product.brand_id)] : "") ||
            "";
          if (brandName) {
            nextProductBrandNameMap[pid] = brandName;
          }
        });

        if (batch.length < productPageSize) break;
        productPage += 1;
      }
      setProductBrandNameMap(nextProductBrandNameMap);
    } catch (err) {
      console.error("Failed to load brands for brand filter:", err);
      setBrands([]);
      setProductBrandNameMap({});
    }
  };

  const getMatchingItemsForDisplay = (request: PurchaseRequest): Array<any> => {
    const selectedBrandName = (
      brands.find((b) => String(b.id) === String(brandFilter))?.name || ""
    )
      .trim()
      .toLowerCase();

    return (request.items || []).filter((item: any) => {
      const itemName = (item?.item || "").trim();
      const pid = item?.product_id ? String(item.product_id) : "";
      const brandName = (
        (pid && productBrandNameMap[pid]) ||
        item?.make ||
        ""
      )
        .trim()
        .toLowerCase();

      const matchesItem = !itemFilter || itemName === itemFilter;
      const matchesBrand = !brandFilter || (selectedBrandName && brandName === selectedBrandName);

      return matchesItem && matchesBrand;
    });
  };

  const getRequestItemNames = (request: PurchaseRequest): string => {
    const names = new Set<string>();
    getMatchingItemsForDisplay(request).forEach((item: any) => {
      const name = (item?.item || "").trim();
      if (name) names.add(name);
    });
    return names.size > 0 ? Array.from(names).join(", ") : "-";
  };

  const getRequestBrandNames = (request: PurchaseRequest): string => {
    const names = new Set<string>();
    getMatchingItemsForDisplay(request).forEach((item: any) => {
      const pid = item?.product_id ? String(item.product_id) : "";
      const brand = (pid && productBrandNameMap[pid]) || item?.make || "";
      const brandName = String(brand).trim();
      if (brandName) names.add(brandName);
    });
    return names.size > 0 ? Array.from(names).join(", ") : "-";
  };

  const getRequestDisplayStats = (request: PurchaseRequest): { itemCount: number; quantity: number } => {
    const hasItemOrBrandFilter = Boolean(itemFilter || brandFilter);
    if (!hasItemOrBrandFilter) {
      return {
        itemCount: request.total_items || 0,
        quantity: request.total_quantity || 0,
      };
    }

    const matchingItems = getMatchingItemsForDisplay(request);
    const quantity = matchingItems.reduce((sum: number, item: any) => sum + Number(item?.quantity || 0), 0);

    return {
      itemCount: matchingItems.length,
      quantity,
    };
  };

  const fetchCustomers = (source: PurchaseRequest[]) => {
    try {
      const uniqueCustomers = Array.from(
        new Map(
          source
            .filter(req => req.customer_id)
            .map(req => [req.customer_id, req.customer_name || "Unknown Customer"])
        )
      ).map(([id, name]) => ({ id, name }));
      setCustomers(uniqueCustomers);
    } catch (err) {
      console.error("Failed to build customers list:", err);
    }
  };

  const fetchPurchaseRequests = async () => {
    try {
      setLoading(true);
      if (!company?.id) {
        setLoading(false);
        return;
      }

      const params: any = {
        page: currentPage,
        page_size: pageSize
      };
      
      if (search) {
        params.search = search;
      }
      
      if (statusFilter !== "all" && statusFilter) {
        params.status = statusFilter;
      }

      if (brandFilter) {
        params.brand_id = brandFilter;
      }
      
      const response = await purchaseRequestsApi.list(company.id, params);
      const nextRequests = response.purchase_requests || [];
      setPurchaseRequests(nextRequests);
      fetchCustomers(nextRequests);
      setError("");
    } catch (err: any) {
      setError(getErrorMessage(err, "Failed to load purchase requests"));
      console.error("Error fetching purchase requests:", err);
      setPurchaseRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllPurchaseRequestsForExport = useCallback(async (): Promise<PurchaseRequest[]> => {
    try {
      if (!companyId) return [];

      const pageSize = 100; // Backend validates page_size <= 100
      let page = 1;
      let allRequests: PurchaseRequest[] = [];

      while (true) {
        const response = await purchaseRequestsApi.list(companyId, { page, page_size: pageSize });
        const batch = Array.isArray(response)
          ? response
          : (response.purchase_requests || []);
        allRequests = allRequests.concat(batch);
        if (batch.length < pageSize) break;
        page += 1;
      }

      setCachedExportData(allRequests);
      return allRequests;
    } catch (error) {
      console.error("Export fetch failed:", error);
      return [];
    }
  }, [companyId]);

  const getExportData = async (): Promise<PurchaseRequest[]> => {
    if (cachedExportData) return cachedExportData;
    if (purchaseRequests.length > 0) return purchaseRequests;
    return await fetchAllPurchaseRequestsForExport();
  };

  const showStatusUpdateConfirmation = (
    id: string,
    purchase_req_no: string,
    customer_name: string,
    currentStatus: string,
    newStatus: string
  ) => {
    setSelectedRequest({
      id,
      purchase_req_no,
      customer_name,
      currentStatus,
      newStatus
    });
    setShowConfirmModal(true);
  };

  const executeStatusUpdate = async () => {
    if (!selectedRequest || !company?.id) return;
    
    await updateRequestStatus(
      selectedRequest.id,
      selectedRequest.newStatus as "pending" | "open" | "in_progress" | "closed"
    );
    
    setShowConfirmModal(false);
    setSelectedRequest(null);
  };

  const updateRequestStatus = async (requestId: string, status: "pending" | "open" | "in_progress" | "closed") => {
    if (!company?.id) return;
    
    setUpdatingStatusId(requestId);
    
    try {
      await purchaseRequestsApi.updateStatus(company.id, requestId, { 
        approval_status: status
      });
      
      setPurchaseRequests(prev =>
        prev.map(req =>
          req.id === requestId ? { ...req, status, updated_at: new Date().toISOString() } : req
        )
      );
      
      // Show success message (you can add a toast notification here)
      console.log(`Request status updated to "${status}" successfully!`);
      
    } catch (error: any) {
      console.error("Error updating request status:", error);
      alert(getErrorMessage(error, "Failed to update status"));
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchPurchaseRequests();
  };

  const handleReset = () => {
    setSearch("");
    setStatusFilter("");
    setCustomerFilter("");
    setItemFilter("");
    setBrandFilter("");
    setFromDate("");
    setToDate("");
    fetchPurchaseRequests();
  };

  // Apply search filter locally for export data
  const applySearchFilter = (data: PurchaseRequest[]): PurchaseRequest[] => {
    if (!search) return data;
    
    const searchLower = search.toLowerCase();
    return data.filter(request => {
      return (
        request.purchase_req_no?.toLowerCase().includes(searchLower) ||
        request.customer_name?.toLowerCase().includes(searchLower) ||
        request.notes?.toLowerCase().includes(searchLower) ||
        false
      );
    });
  };

  // Apply filters locally
  const applyFilters = (data: PurchaseRequest[]): PurchaseRequest[] => {
    let filtered = data;
    
    if (statusFilter && statusFilter !== "all") {
      filtered = filtered.filter(request => request.status === statusFilter);
    }
    
    if (customerFilter) {
      filtered = filtered.filter(request => request.customer_id === customerFilter);
    }

    if (itemFilter) {
      filtered = filtered.filter(request =>
        (request.items || []).some(item => (item?.item || "").trim() === itemFilter)
      );
    }

    // Date filters
    if (fromDate) {
      filtered = filtered.filter(request => {
        if (!request.request_date && !request.created_at) return false;
        const reqDate = new Date(request.request_date || request.created_at);
        const from = new Date(fromDate);
        return reqDate >= from;
      });
    }
    
    if (toDate) {
      filtered = filtered.filter(request => {
        if (!request.request_date && !request.created_at) return false;
        const reqDate = new Date(request.request_date || request.created_at);
        const to = new Date(toDate);
        return reqDate <= to;
      });
    }
    
    return filtered;
  };

  const filteredRequests = purchaseRequests.filter(request => {
    if (statusFilter && statusFilter !== "all" && request.status !== statusFilter) return false;
    if (customerFilter && request.customer_id !== customerFilter) return false;
    if (itemFilter) {
      const hasItem = (request.items || []).some(item => (item?.item || "").trim() === itemFilter);
      if (!hasItem) return false;
    }
    
    if (fromDate) {
      const reqDate = new Date(request.request_date || request.created_at);
      const from = new Date(fromDate);
      if (reqDate < from) return false;
    }
    
    if (toDate) {
      const reqDate = new Date(request.request_date || request.created_at);
      const to = new Date(toDate);
      if (reqDate > to) return false;
    }
    
    if (search) {
      const searchLower = search.toLowerCase();
      return (
        request.purchase_req_no?.toLowerCase().includes(searchLower) ||
        request.customer_name?.toLowerCase().includes(searchLower) ||
        request.created_by_name?.toLowerCase().includes(searchLower) ||
        request.created_by_email?.toLowerCase().includes(searchLower) ||
        request.created_by_user?.toLowerCase().includes(searchLower) ||
        request.notes?.toLowerCase().includes(searchLower) ||
        false
      );
    }
    
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filteredRequests.length / pageSize));
  const pagedRequests = filteredRequests.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );
  const tableColumnCount = Object.values(visibleColumns).filter(Boolean).length + 2;
  const pagedRequestIds = pagedRequests.map((request) => request.id);
  const areAllPagedSelected =
    pagedRequestIds.length > 0 &&
    pagedRequestIds.every((id) => selectedRequestIds.includes(id));
  const itemOptions = Array.from(
    new Set(
      purchaseRequests.flatMap((request) =>
        (request.items || [])
          .map((item) => (item?.item || "").trim())
          .filter(Boolean)
      )
    )
  ).sort((a, b) => a.localeCompare(b));

  // Export functions
  const copyToClipboard = async () => {
    if (copyLoading) return;
    setCopyLoading(true);
    try {
      const allData = await getExportData();
      let filtered = applySearchFilter(allData);
      filtered = applyFilters(filtered);
      if (filtered.length === 0) {
        alert("No purchase requests to export.");
        return;
      }
      
      const headers: string[] = [];
      const rows = filtered.map(request => {
        const row: string[] = [];

        if (visibleColumns.requestNumber) {
          if (!headers.includes("Request #")) headers.push("Request #");
          row.push(request.purchase_req_no || `PR-${request.id.slice(0, 8)}`);
        }

        if (visibleColumns.customer) {
          if (!headers.includes("Customer")) headers.push("Customer");
          row.push(request.customer_name || "-");
        }

        if (visibleColumns.requestDate) {
          if (!headers.includes("Request Date")) headers.push("Request Date");
          row.push(formatDate(request.request_date || request.created_at));
        }

        if (visibleColumns.createdBy) {
          if (!headers.includes("Created By")) headers.push("Created By");
          row.push(getCreatedByDisplay(request));
        }

        if (visibleColumns.items) {
          if (!headers.includes("Items")) headers.push("Items");
          row.push((request.total_items || 0).toString());
        }

        if (visibleColumns.quantity) {
          if (!headers.includes("Quantity")) headers.push("Quantity");
          row.push((request.total_quantity || 0).toString());
        }

        if (visibleColumns.status) {
          if (!headers.includes("Status")) headers.push("Status");
          row.push(getStatusText(request.status));
        }

        return row;
      });

      const text = [headers.join("\t"), ...rows.map(r => r.join("\t"))].join("\n");
      await navigator.clipboard.writeText(text);
      alert("Purchase request data copied to clipboard");
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
      const allData = await getExportData();
      let filtered = applySearchFilter(allData);
      filtered = applyFilters(filtered);
      if (filtered.length === 0) {
        alert("No purchase requests to export.");
        return;
      }
      
      const exportData = filtered.map(request => {
        const row: Record<string, any> = {};

        if (visibleColumns.requestNumber) {
          row["Request #"] = request.purchase_req_no || `PR-${request.id.slice(0, 8)}`;
        }

        if (visibleColumns.customer) {
          row["Customer"] = request.customer_name || "";
        }

        if (visibleColumns.requestDate) {
          row["Request Date"] = formatDate(request.request_date || request.created_at);
        }

        if (visibleColumns.createdBy) {
          row["Created By"] = getCreatedByDisplay(request);
        }

        if (visibleColumns.items) {
          row["Total Items"] = request.total_items || 0;
        }

        if (visibleColumns.quantity) {
          row["Total Quantity"] = request.total_quantity || 0;
        }

        if (visibleColumns.status) {
          row["Status"] = getStatusText(request.status);
        }

        row["Notes"] = request.notes || "";
        row["Created At"] = formatDate(request.created_at);
        row["Updated At"] = formatDate(request.updated_at);
        
        return row;
      });

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Purchase Requests");
      XLSX.writeFile(wb, "purchase_requests.xlsx");
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
      const allData = await getExportData();
      let filtered = applySearchFilter(allData);
      filtered = applyFilters(filtered);
      if (filtered.length === 0) {
        alert("No purchase requests to export.");
        return;
      }
      
      const doc = new jsPDF("landscape");
      
      const headers: string[] = [];
      const body = filtered.map(request => {
        const row: string[] = [];

        if (visibleColumns.requestNumber) {
          if (!headers.includes("Req #")) headers.push("Req #");
          row.push(request.purchase_req_no || `PR-${request.id.slice(0, 8)}`);
        }

        if (visibleColumns.customer) {
          if (!headers.includes("Customer")) headers.push("Customer");
          row.push(request.customer_name || "-");
        }

        if (visibleColumns.requestDate) {
          if (!headers.includes("Req Date")) headers.push("Req Date");
          row.push(formatDate(request.request_date || request.created_at));
        }

        if (visibleColumns.createdBy) {
          if (!headers.includes("Created By")) headers.push("Created By");
          row.push(getCreatedByDisplay(request));
        }

        if (visibleColumns.items) {
          if (!headers.includes("Items")) headers.push("Items");
          row.push((request.total_items || 0).toString());
        }

        if (visibleColumns.quantity) {
          if (!headers.includes("Qty")) headers.push("Qty");
          row.push((request.total_quantity || 0).toString());
        }

        if (visibleColumns.status) {
          if (!headers.includes("Status")) headers.push("Status");
          row.push(getStatusText(request.status));
        }

        return row;
      });

      autoTable(doc, {
        ...getProfessionalTableTheme(doc, "Purchase Requests List", company?.name || "", "l"),
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
      doc.save("purchase_requests.pdf");
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
      let filtered = applySearchFilter(allData);
      filtered = applyFilters(filtered);
      if (filtered.length === 0) {
        alert("No purchase requests to export.");
        return;
      }
      
      const exportData = filtered.map(request => {
        const row: Record<string, any> = {};

        if (visibleColumns.requestNumber) {
          row["Request #"] = request.purchase_req_no || `PR-${request.id.slice(0, 8)}`;
        }

        if (visibleColumns.customer) {
          row["Customer"] = request.customer_name || "";
        }

        if (visibleColumns.requestDate) {
          row["Request Date"] = formatDate(request.request_date || request.created_at);
        }

        if (visibleColumns.createdBy) {
          row["Created By"] = getCreatedByDisplay(request);
        }

        if (visibleColumns.items) {
          row["Total Items"] = request.total_items || 0;
        }

        if (visibleColumns.quantity) {
          row["Total Quantity"] = request.total_quantity || 0;
        }

        if (visibleColumns.status) {
          row["Status"] = getStatusText(request.status);
        }

        return row;
      });

      const ws = XLSX.utils.json_to_sheet(exportData);
      const csv = XLSX.utils.sheet_to_csv(ws);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      saveAs(blob, "purchase_requests.csv");
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
      const allData = await getExportData();
      let filtered = applySearchFilter(allData);
      filtered = applyFilters(filtered);
      setRequestsToPrint(filtered);
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

  const handleToggleRowSelection = (requestId: string) => {
    setSelectedRequestIds((prev) =>
      prev.includes(requestId)
        ? prev.filter((id) => id !== requestId)
        : [...prev, requestId]
    );
  };

  const handleToggleSelectAllPaged = () => {
    setSelectedRequestIds((prev) => {
      if (areAllPagedSelected) {
        return prev.filter((id) => !pagedRequestIds.includes(id));
      }
      return Array.from(new Set([...prev, ...pagedRequestIds]));
    });
  };

  const handleConvertPurchaseOrder = (requestIds: string[]) => {
    if (requestIds.length === 0) return;
    const params = new URLSearchParams();
    params.set("from", "purchase-req");
    params.set("purchase_request_ids", requestIds.join(","));
    if (itemFilter) {
      params.set("item_filter", itemFilter);
    }
    if (brandFilter) {
      params.set("brand_filter", brandFilter);
      const selectedBrandName = brands.find((b) => String(b.id) === String(brandFilter))?.name;
      if (selectedBrandName) {
        params.set("brand_filter_name", selectedBrandName);
      }
    }
    router.push(`/purchase/purchase-orders/new?${params.toString()}`);
  };

  const handleDelete = async (requestId: string, requestNo: string) => {
    if (window.confirm(`Are you sure you want to delete purchase request ${requestNo}? This action cannot be undone.`)) {
      try {
        if (company?.id) {
          // Assuming you have a delete method in your API
          // await purchaseRequestsApi.delete(company.id, requestId);
          fetchPurchaseRequests();
          alert('Purchase request deleted successfully!');
        }
      } catch (error) {
        console.error("Error deleting purchase request:", error);
        alert("Failed to delete purchase request");
      }
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
          purchaseRequests={requestsToPrint}
          visibleColumns={visibleColumns}
          formatDate={formatDate}
          getStatusText={getStatusText}
          getStatusBadgeClass={getStatusBadgeClass}
          companyName={company?.name || ''}
        />
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800">
            <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
              Confirm Status Update
            </h3>
            
            <div className="mb-6 space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Request No:</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {selectedRequest.purchase_req_no}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Customer:</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {selectedRequest.customer_name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Current Status:</span>
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                  getStatusBadgeClass(selectedRequest.currentStatus)
                }`}>
                  {getStatusText(selectedRequest.currentStatus)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">New Status:</span>
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                  getStatusBadgeClass(selectedRequest.newStatus)
                }`}>
                  {getStatusText(selectedRequest.newStatus)}
                </span>
              </div>
            </div>
            
            <p className="mb-6 text-gray-600 dark:text-gray-400">
              Are you sure you want to update the status of this purchase request?
              This action will be recorded in the request history.
            </p>
            
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowConfirmModal(false);
                  setSelectedRequest(null);
                }}
                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                disabled={updatingStatusId === selectedRequest.id}
              >
                Cancel
              </button>
              <button
                onClick={executeStatusUpdate}
                className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors disabled:opacity-50"
                disabled={updatingStatusId === selectedRequest.id}
              >
                {updatingStatusId === selectedRequest.id ? (
                  <>
                    <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                    Updating...
                  </>
                ) : (
                  "Confirm Update"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Purchase Requests
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Manage and track all customer purchase requests
            </p>
          </div>
          <Link
            href="/purchase-req/new"
            className="px-4 py-2 transition bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            New Purchase Request
          </Link>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="px-6 py-6 bg-gray-50 dark:bg-gray-900">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
          {/* Total Requests */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {purchaseRequests.length}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Total Requests
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
                <ShoppingCart className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </div>

          {/* Open Requests */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-green-600">
                  {purchaseRequests.filter(r => r.status === 'open').length}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Open Requests
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                <CheckSquare className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </div>

          {/* In Progress */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-blue-600">
                  {purchaseRequests.filter(r => r.status === 'in_progress').length}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  In Progress
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                <Clock className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>

          {/* Pending */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-yellow-600">
                  {purchaseRequests.filter(r => r.status === 'pending').length}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Pending
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-yellow-100 dark:bg-yellow-900/20 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
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
                placeholder="Search by request number, customer, or notes..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch(e)}
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleConvertPurchaseOrder(selectedRequestIds)}
              disabled={selectedRequestIds.length === 0}
              className="px-4 py-2 rounded-lg border border-indigo-300 dark:border-indigo-500/40 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FileDigit className="w-5 h-5" />
              Convert Purchase Order
              {selectedRequestIds.length > 0 && (
                <span className="inline-flex items-center justify-center min-w-5 h-5 px-1 rounded-full bg-indigo-600 text-white text-xs">
                  {selectedRequestIds.length}
                </span>
              )}
            </button>

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
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
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
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="closed">Closed</option>
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
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="">All Customers</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Item Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Item
              </label>
              <select
                value={itemFilter}
                onChange={(e) => setItemFilter(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="">All Items</option>
                {itemOptions.map((itemName) => (
                  <option key={itemName} value={itemName}>
                    {itemName}
                  </option>
                ))}
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

            {/* Brand Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Brand
              </label>
              <select
                value={brandFilter}
                onChange={(e) => setBrandFilter(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="">All Brands</option>
                {brands.map((brand) => (
                  <option key={brand.id} value={brand.id}>
                    {brand.name}
                  </option>
                ))}
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
        <div className="overflow-x-hidden">
          <table className="w-full table-fixed">
            <thead className="bg-gray-200 dark:bg-gray-700/50">
              <tr className="text-sm font-semibold text-gray-600 dark:text-gray-300">
                <th className="text-left px-4 py-3 whitespace-nowrap w-14">
                  <input
                    type="checkbox"
                    checked={areAllPagedSelected}
                    onChange={handleToggleSelectAllPaged}
                    aria-label="Select all rows on current page"
                    className="rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500"
                  />
                </th>
                <th className="text-left px-3 py-3 ">
                  S.No
                </th>
                {visibleColumns.requestNumber && (
                  <th className="text-left px-3 py-3 ">
                    Request #
                  </th>
                )}
                {visibleColumns.customer && (
                  <th className="text-left px-3 py-3 ">
                    Customer
                  </th>
                )}
                {visibleColumns.requestDate && (
                  <th className="text-left px-3 py-3 ">
                    Request Date
                  </th>
                )}
                {visibleColumns.createdBy && (
                  <th className="text-left px-3 py-3 ">
                    Created By
                  </th>
                )}
                {visibleColumns.items && (
                  <th className="text-left px-3 py-3 ">
                    Items
                  </th>
                )}
                {visibleColumns.quantity && (
                  <th className="text-left px-3 py-3 ">
                    Quantity
                  </th>
                )}
                {visibleColumns.status && (
                  <th className="text-left px-3 py-3 ">
                    Status
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
                  <td colSpan={tableColumnCount} className="px-6 py-8 text-center">
                    <div className="flex items-center justify-center">
                      <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
                    </div>
                  </td>
                </tr>
              ) : filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={tableColumnCount} className="px-6 py-8 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <ShoppingCart className="w-12 h-12 text-gray-400 mb-2" />
                      <p className="text-lg font-medium text-gray-900 dark:text-white mb-1">
                        No purchase requests found
                      </p>
                      <p className="text-gray-500 dark:text-gray-400 mb-4">
                        {statusFilter || search || customerFilter || itemFilter || brandFilter ?
                          "No purchase requests found matching your filters. Try adjusting your search criteria." :
                          "Create your first purchase request to start managing customer orders."}
                      </p>
                      <Link
                        href="/purchase-req/new"
                        className="text-indigo-600 hover:underline dark:text-indigo-400"
                      >
                        Create your first purchase request
                      </Link>
                    </div>
                  </td>
                </tr>
              ) : (
                pagedRequests.map((request, index) => {
                  const profileInitials = request.customer_name?.charAt(0) || 'C';
                  const requestItemSummary = getRequestItemNames(request);
                  const requestDisplayStats = getRequestDisplayStats(request);

                  return (
                    <tr
                      key={request.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <td className="px-4 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedRequestIds.includes(request.id)}
                          onChange={() => handleToggleRowSelection(request.id)}
                          aria-label={`Select purchase request ${request.purchase_req_no || request.id}`}
                          className="rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500"
                        />
                      </td>
                      <td className="px-3 py-4 align-top break-words text-gray-700 dark:text-gray-300">
                        {(currentPage - 1) * pageSize + index + 1}
                      </td>
                      {visibleColumns.requestNumber && (
                        <td className="px-3 py-4 align-top break-words">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center flex-shrink-0">
                              <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                                {profileInitials}
                              </span>
                            </div>
                            <div className="font-medium text-gray-900 dark:text-white">
                              {request.purchase_req_no || `PR-${request.id.slice(0, 8)}`}
                            </div>
                          </div>
                        </td>
                      )}
                      {visibleColumns.customer && (
                        <td className="px-3 py-4 align-top break-words">
                          <div className="min-w-0 max-w-[240px]">
                            <div className="font-medium text-gray-900 dark:text-white truncate">
                              {request.customer_name || '-'}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                              Items: {requestItemSummary}
                            </div>
                            <div className="text-xs text-indigo-600 dark:text-indigo-400 truncate">
                              Brand: {getRequestBrandNames(request)}
                            </div>
                          </div>
                        </td>
                      )}
                      {visibleColumns.requestDate && (
                        <td className="px-3 py-4 align-top break-words text-gray-700 dark:text-gray-300">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            {formatDate(request.request_date || request.created_at)}
                          </div>
                        </td>
                      )}
                      {visibleColumns.createdBy && (
                        <td className="px-3 py-4 align-top break-words">
                          <div className="min-w-0 max-w-[280px]">
                            <div className="font-medium text-gray-900 dark:text-white truncate">
                              {getCreatedByDisplay(request)}
                            </div>
                          </div>
                        </td>
                      )}
                      {visibleColumns.items && (
                        <td className="px-3 py-4 align-top break-words">
                          <div className="flex items-center gap-2 font-medium text-gray-900 dark:text-white">
                            <Package className="w-4 h-4 text-gray-400" />
                            {requestDisplayStats.itemCount}
                          </div>
                        </td>
                      )}
                      {visibleColumns.quantity && (
                        <td className="px-3 py-4 align-top break-words text-gray-700 dark:text-gray-300">
                          {requestDisplayStats.quantity}
                        </td>
                      )}
                      {visibleColumns.status && (
                        <td className="px-3 py-4 align-top break-words">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              getStatusBadgeClass(request.status)
                            }`}
                          >
                            {request.status === 'open' && <CheckSquare className="w-3 h-3 mr-1" />}
                            {request.status === 'pending' && <AlertCircle className="w-3 h-3 mr-1" />}
                            {request.status === 'in_progress' && <Clock className="w-3 h-3 mr-1" />}
                            {request.status === 'closed' && <XCircle className="w-3 h-3 mr-1" />}
                            {getStatusText(request.status)}
                          </span>
                        </td>
                      )}
                      {visibleColumns.actions && (
                        <td className="px-3 py-4 text-right align-top">
                          <div className="relative action-dropdown-container inline-block">
                            <button
                              onClick={() =>
                                setActiveActionMenu(
                                  activeActionMenu === request.id ? null : request.id
                                )
                              }
                              className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-50 dark:hover:text-gray-300 dark:hover:bg-gray-700/50 transition-all duration-200"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>

                            {activeActionMenu === request.id && (
                              <div className="absolute right-0 mt-1 w-56 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg shadow-xl py-1 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                                <Link
                                  href={`/purchase-req/${request.id}`}
                                  onClick={() => setActiveActionMenu(null)}
                                  className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                                >
                                  <Eye className="w-4 h-4 text-gray-400" />
                                  <span>View Details</span>
                                </Link>

                                <button
                                  onClick={() => {
                                    setActiveActionMenu(null);
                                    handleConvertPurchaseOrder([request.id]);
                                  }}
                                  className="flex w-full items-center gap-3 px-3 py-2 text-sm text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
                                >
                                  <FileDigit className="w-4 h-4 text-indigo-500" />
                                  <span>Convert Purchase Order</span>
                                </button>

                                <div className="my-1 border-t border-gray-100 dark:border-gray-700"></div>

                                <button
                                  onClick={() => {
                                    showStatusUpdateConfirmation(
                                      request.id,
                                      request.purchase_req_no || `PR-${request.id.slice(0, 8)}`,
                                      request.customer_name,
                                      request.status,
                                      "open"
                                    );
                                    setActiveActionMenu(null);
                                  }}
                                  disabled={updatingStatusId === request.id || request.status === "open"}
                                  className="flex w-full items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  <CheckSquare className="w-4 h-4 text-gray-400" />
                                  <span>Mark as Open</span>
                                </button>

                                <button
                                  onClick={() => {
                                    showStatusUpdateConfirmation(
                                      request.id,
                                      request.purchase_req_no || `PR-${request.id.slice(0, 8)}`,
                                      request.customer_name,
                                      request.status,
                                      "in_progress"
                                    );
                                    setActiveActionMenu(null);
                                  }}
                                  disabled={updatingStatusId === request.id || request.status === "in_progress"}
                                  className="flex w-full items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  <Clock className="w-4 h-4 text-gray-400" />
                                  <span>Mark In Progress</span>
                                </button>

                                <button
                                  onClick={() => {
                                    showStatusUpdateConfirmation(
                                      request.id,
                                      request.purchase_req_no || `PR-${request.id.slice(0, 8)}`,
                                      request.customer_name,
                                      request.status,
                                      "closed"
                                    );
                                    setActiveActionMenu(null);
                                  }}
                                  disabled={updatingStatusId === request.id || request.status === "closed"}
                                  className="flex w-full items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  <XCircle className="w-4 h-4 text-gray-400" />
                                  <span>Mark as Closed</span>
                                </button>

                                <div className="my-1 border-t border-gray-100 dark:border-gray-700"></div>
                                <button
                                  onClick={() => {
                                    setActiveActionMenu(null);
                                    handleDelete(
                                      request.id,
                                      request.purchase_req_no || `PR-${request.id.slice(0, 8)}`
                                    );
                                  }}
                                  className="flex w-full items-center gap-3 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  <span>Delete Request</span>
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
          </table>
        </div>
      </div>

      {!loading && filteredRequests.length > 0 && (
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, filteredRequests.length)} of {filteredRequests.length}
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




