"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { saveAs } from "file-saver";
import {
  Search,
  Filter,
  Download,
  FileText,
  Printer,
  Copy,
  ChevronDown,
  ChevronUp,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  Users,
  Building,
  MapPin,
  Tag,
  RefreshCw,
  Plus
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:6768";

interface EnquiryItem {
  description?: string;
  quantity?: number;
  suitable_item?: string;
  purchase_price?: number;
  sales_price?: number;
  image_url?: string;
  notes?: string;
  product_id?: string;
  product_brand?: string;
}

interface Enquiry {
  id: string;
  enquiry_number: string;
  enquiry_date: string;
  subject: string;
  status: string;
  priority: string;
  totalQty?: string;
  products_interested?: EnquiryItem[];
  items?: EnquiryItem[];
  description?: string;
  expected_value: number;
  customer_name?: string;
  contact_name?: string;
  sales_person_name?: string;
  ticket_number?: string;
  prospect_name?: string;
  prospect_company?: string;
  company?: {
    id: string;
    name: string;
    state?: string;
  };
  contact_person?: string;
  product?: string;
  quantity?: number;
  remarks?: string;
  salesman?: {
    id: string;
    name: string;
  };
  sales_engineer?: {
    id: string;
    name: string;
  };
  brand?: string;
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  assigned: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  quoted: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400",
  purchased: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  completed: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
  ignored: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
  new: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  contacted: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400",
  qualified: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  proposal_sent: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  negotiation: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  won: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  lost: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  on_hold: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
};

const getStatusBadgeClass = (status: string): string => {
  return statusColors[status] || "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
};

const canEditEnquiry = (status: string): boolean => {
  const nonEditableStatuses = ['completed', 'cancelled', 'won', 'lost', 'purchased'];
  return !nonEditableStatuses.includes(status);
};

const canDeleteEnquiry = (status: string): boolean => {
  const deletableStatuses = ['pending', 'new', 'assigned', 'on_hold'];
  return deletableStatuses.includes(status);
};

export default function EnquiriesPage() {
  const router = useRouter();
  const { company } = useAuth();
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState("");
  
  // Filters state
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [salesmanFilter, setSalesmanFilter] = useState("");
  const [companyFilter, setCompanyFilter] = useState("");
  const [engineerFilter, setEngineerFilter] = useState("");
  const [brandFilter, setBrandFilter] = useState("");
  const [stateFilter, setStateFilter] = useState("");
  
  // UI state
  const [showFilters, setShowFilters] = useState(false);
  const [showColumnDropdown, setShowColumnDropdown] = useState(false);
  const [activeActionMenu, setActiveActionMenu] = useState<string | null>(null);
  
  // Export loading states
  const [copyLoading, setCopyLoading] = useState(false);
  const [excelLoading, setExcelLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [csvLoading, setCsvLoading] = useState(false);
  const [printLoading, setPrintLoading] = useState(false);

  const [cachedExportData, setCachedExportData] = useState<Enquiry[] | null>(null);
  
  // Dropdown data
  const [companies, setCompanies] = useState<any[]>([]);
  const [salesmen, setSalesmen] = useState<any[]>([]);
  const [engineers, setEngineers] = useState<any[]>([]);
  const [brands, setBrands] = useState<string[]>([]);
  const [states, setStates] = useState<string[]>([]);

  const [brandReport, setBrandReport] = useState<any[]>([]);
  const [engineerReport, setEngineerReport] = useState<any[]>([]);
  const [stateReport, setStateReport] = useState<any[]>([]);
  const [reportEngineerFilter, setReportEngineerFilter] = useState("");
  const [reportBrandFilter, setReportBrandFilter] = useState("");
  const [reportStateFilter, setReportStateFilter] = useState("");
  
  // Column visibility
  const [visibleColumns, setVisibleColumns] = useState({
    date: true,
    enquiryNo: true,
    company: true,
    contactPerson: true,
    quantity: true,
    status: true,
    salesEngineer: true,
    remarks: true,
    actions: true,
  });

  const companyId =
    company?.id || (typeof window !== "undefined" ? localStorage.getItem("company_id") : null);

  const buildQueryParams = (forExport = false) => {
    const params = new URLSearchParams();
    if (statusFilter) params.append("status", statusFilter);
    if (search && !forExport) params.append("search", search);
    if (fromDate) params.append("from_date", fromDate);
    if (toDate) params.append("to_date", toDate);
    if (salesmanFilter) params.append("sales_person_id", salesmanFilter);
    if (companyFilter) params.append("company_id", companyFilter);
    if (engineerFilter) params.append("engineer_id", engineerFilter);
    if (brandFilter) params.append("brand", brandFilter);
    if (stateFilter) params.append("state", stateFilter);
    if (reportEngineerFilter && !forExport) params.append("sales_person_id", reportEngineerFilter);
    if (reportBrandFilter && !forExport) params.append("brand", reportBrandFilter);
    if (reportStateFilter && !forExport) params.append("state", reportStateFilter);
    
    // Add pagination for export if needed
    if (forExport) {
      params.append("page", "1");
      params.append("page_size", "1000");
    }
    
    return params;
  };

  useEffect(() => {
    if (companyId) {
      fetchEnquiries();
      fetchDropdownData();
    }
  }, [companyId]);

  useEffect(() => {
    if (companyId) {
      fetchEnquiries();
      setCachedExportData(null);
    }
  }, [
    statusFilter,
    salesmanFilter,
    companyFilter,
    engineerFilter,
    brandFilter,
    stateFilter,
    fromDate,
    toDate,
    reportEngineerFilter,
    reportBrandFilter,
    reportStateFilter,
  ]);

  useEffect(() => {
    if (companyId) {
      fetchReports();
    }
  }, [companyId, fromDate, toDate]);

  const fetchDropdownData = async () => {
    try {
      const authHeader = {
        Authorization: `Bearer ${localStorage.getItem("access_token")}`,
      };

      // Fetch companies (for company filter)
      const companiesResponse = await fetch(`${API_BASE}/companies`, { headers: authHeader });
      if (companiesResponse.ok) {
        const companiesData = await companiesResponse.json();
        setCompanies(companiesData);
      }

      // Fetch Indian states from backend (GST state codes)
      const statesResponse = await fetch(
        `${API_BASE}/companies/${companyId}/gst/state-codes`,
        { headers: authHeader }
      );
      if (statesResponse.ok) {
        const statesData = await statesResponse.json();
        const names = (statesData || [])
          .map((s: any) => s.name)
          .filter((name: any) => typeof name === "string" && name.trim() !== "");
        setStates(names);
      }

      // Fetch sales engineers (dedicated API)
      const salesEngineersResponse = await fetch(
        `${API_BASE}/companies/${companyId}/sales-engineers`,
        { headers: authHeader }
      );

      if (salesEngineersResponse.ok) {
        const data = await salesEngineersResponse.json();
        const list = Array.isArray(data) ? data : [];
        const formattedSalesmen = list.map((engineer: any) => ({
          id: engineer.id,
          name: engineer.full_name || "Unnamed Engineer",
          email: engineer.email || "",
          phone: engineer.phone || "",
          designation: engineer.designation_name || "Sales Engineer",
          employee_code: engineer.employee_code || "",
        }));
        setSalesmen(formattedSalesmen);
        setEngineers(formattedSalesmen);
      } else {
        setSalesmen([]);
        setEngineers([]);
      }

      // Fetch brands (from brands table)
      const brandsResponse = await fetch(
        `${API_BASE}/companies/${companyId}/brands?page=1&page_size=100`,
        { headers: authHeader }
      );
      const brandsAltResponse = !brandsResponse.ok
        ? await fetch(`${API_BASE}/companies/${companyId}/brands/?page=1&page_size=100`, {
            headers: authHeader,
          })
        : null;

      if (brandsResponse.ok || brandsAltResponse?.ok) {
        const brandsData = brandsResponse.ok ? await brandsResponse.json() : await brandsAltResponse!.json();
        const list = Array.isArray(brandsData?.brands) ? brandsData.brands : [];
        const names = list
          .map((b: any) => b.name)
          .filter((name: any) => typeof name === "string" && name.trim() !== "");
        setBrands(names);
      } else {
        console.error("Brands request failed:", brandsResponse.status, await brandsResponse.text());
      }
    } catch (err) {
      console.error("Failed to fetch dropdown data:", err);
    }
  };

  const fetchEnquiries = async () => {
    try {
      setLoading(true);
      const params = buildQueryParams();

      const response = await fetch(
        `${API_BASE}/companies/${companyId}/enquiries?${params}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          },
        }
      );

      if (!response.ok) throw new Error("Failed to fetch enquiries");

      const data = await response.json();
      setEnquiries(data);
    } catch (err) {
      setError("Failed to load enquiries");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchReports = async () => {
    try {
      setReportLoading(true);
      setReportError("");

      const params = new URLSearchParams();
      if (fromDate) params.append("from_date", fromDate);
      if (toDate) params.append("to_date", toDate);
      const qs = params.toString();

      const [engineerRes, stateRes, brandRes] = await Promise.all([
        fetch(`${API_BASE}/companies/${companyId}/enquiries/reports/by-engineer${qs ? `?${qs}` : ""}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` },
        }),
        fetch(`${API_BASE}/companies/${companyId}/enquiries/reports/by-state${qs ? `?${qs}` : ""}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` },
        }),
        fetch(`${API_BASE}/companies/${companyId}/enquiries/reports/by-brand${qs ? `?${qs}` : ""}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("access_token")}` },
        }),
      ]);

      if (!engineerRes.ok || !stateRes.ok || !brandRes.ok) {
        throw new Error("Failed to load reports");
      }

      const [engineerData, stateData, brandData] = await Promise.all([
        engineerRes.json(),
        stateRes.json(),
        brandRes.json(),
      ]);

      setEngineerReport(Array.isArray(engineerData) ? engineerData : []);
      setStateReport(Array.isArray(stateData) ? stateData : []);
      setBrandReport(Array.isArray(brandData) ? brandData : []);
    } catch (err) {
      console.error("Failed to fetch reports:", err);
      setReportError("Failed to load reports");
    } finally {
      setReportLoading(false);
    }
  };

  const fetchAllEnquiriesForExport = useCallback(async (): Promise<Enquiry[]> => {
    try {
      const params = buildQueryParams(true);

      const response = await fetch(
        `${API_BASE}/companies/${companyId}/enquiries?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          },
        }
      );

      if (!response.ok) throw new Error("Failed to fetch enquiries for export");

      const data = await response.json();
      const list = Array.isArray(data) ? data : (data.enquiries || []);
      setCachedExportData(list);
      return list;
    } catch (error) {
      console.error("Export fetch failed:", error);
      return [];
    }
  }, [companyId, statusFilter, fromDate, toDate, salesmanFilter, companyFilter, engineerFilter, brandFilter, stateFilter]);

  const getExportData = async (): Promise<Enquiry[]> => {
    if (cachedExportData) return cachedExportData;
    return await fetchAllEnquiriesForExport();
  };

  const handleDeleteEnquiry = async (enquiryId: string, enquiryNumber: string) => {
    if (window.confirm(`Are you sure you want to delete enquiry ${enquiryNumber}? This action cannot be undone.`)) {
      try {
        const response = await fetch(
          `${API_BASE}/companies/${companyId}/enquiries/${enquiryId}`,
          {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${localStorage.getItem("access_token")}`,
            },
          }
        );

        if (response.ok) {
          alert("Enquiry deleted successfully!");
          fetchEnquiries();
        } else {
          throw new Error("Failed to delete enquiry");
        }
      } catch (err) {
        alert("Failed to delete enquiry. Please try again.");
        console.error(err);
      }
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchEnquiries();
  };

  const handleReset = () => {
    setSearch("");
    setFromDate("");
    setToDate("");
    setStatusFilter("");
    setSalesmanFilter("");
    setCompanyFilter("");
    setEngineerFilter("");
    setBrandFilter("");
    setStateFilter("");
    fetchEnquiries();
    fetchReports();
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getEnquiryBrand = (enquiry: Enquiry): string => {
    if (enquiry.brand && enquiry.brand.trim() !== "") return enquiry.brand;
    const itemBrands = (enquiry.items || [])
      .map((item) => item.product_brand)
      .filter((brand): brand is string => typeof brand === "string" && brand.trim() !== "");
    if (itemBrands.length > 0) {
      return Array.from(new Set(itemBrands)).join(", ");
    }
    if (brandFilter) return brandFilter;
    return "-";
  };

  // Apply search filter locally for export data
  const applySearchFilter = (data: Enquiry[]): Enquiry[] => {
    if (!search) return data;
    
    const searchLower = search.toLowerCase();
    return data.filter(enquiry => {
      return (
        enquiry.enquiry_number?.toLowerCase().includes(searchLower) ||
        enquiry.company?.name?.toLowerCase().includes(searchLower) ||
        enquiry.customer_name?.toLowerCase().includes(searchLower) ||
        enquiry.prospect_company?.toLowerCase().includes(searchLower) ||
        enquiry.contact_name?.toLowerCase().includes(searchLower) ||
        enquiry.prospect_name?.toLowerCase().includes(searchLower) ||
        enquiry.description?.toLowerCase().includes(searchLower) ||
        enquiry.ticket_number?.toLowerCase().includes(searchLower) ||
        false
      );
    });
  };

  // Apply report filters locally
  const applyReportFilters = (data: Enquiry[]): Enquiry[] => {
    let filtered = data;
    
    if (reportEngineerFilter) {
      filtered = filtered.filter(enquiry => enquiry.salesman?.id === reportEngineerFilter);
    }
    
    if (reportBrandFilter) {
      filtered = filtered.filter(enquiry => enquiry.brand === reportBrandFilter);
    }
    
    if (reportStateFilter) {
      filtered = filtered.filter(enquiry => enquiry.company?.state === reportStateFilter);
    }
    
    return filtered;
  };

  // Export functions
  const copyToClipboard = async () => {
    if (copyLoading) return;
    setCopyLoading(true);
    try {
      const allData = await getExportData();
      let filtered = applySearchFilter(allData);
      filtered = applyReportFilters(filtered);
      
      const headers: string[] = [];
      const rows = filtered.map(enquiry => {
        const row: string[] = [];

        if (visibleColumns.date) {
          if (!headers.includes("Date")) headers.push("Date");
          row.push(formatDate(enquiry.enquiry_date));
        }

        if (visibleColumns.enquiryNo) {
          if (!headers.includes("Enquiry No")) headers.push("Enquiry No");
          row.push(enquiry.enquiry_number);
        }

        if (visibleColumns.company) {
          if (!headers.includes("Company")) headers.push("Company");
          row.push(enquiry.company?.name || enquiry.customer_name || enquiry.prospect_company || "-");
        }

        if (visibleColumns.contactPerson) {
          if (!headers.includes("Contact Person")) headers.push("Contact Person");
          row.push(enquiry.contact_name || enquiry.prospect_name || "-");
        }

        if (visibleColumns.quantity) {
          if (!headers.includes("Quantity")) headers.push("Quantity");
          const totalQty = enquiry.products_interested?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 
                         enquiry.items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0;
          row.push(totalQty.toString());
        }

        if (visibleColumns.status) {
          if (!headers.includes("Status")) headers.push("Status");
          row.push(enquiry.status.replace("_", " "));
        }

        if (visibleColumns.salesEngineer) {
          if (!headers.includes("Sales Engineer")) headers.push("Sales Engineer");
          row.push(enquiry.salesman?.name || enquiry.sales_person_name || "-");
        }

        if (visibleColumns.remarks) {
          if (!headers.includes("Remarks")) headers.push("Remarks");
          row.push(enquiry.description || "-");
        }

        return row;
      });

      const text = [headers.join("\t"), ...rows.map(r => r.join("\t"))].join("\n");
      await navigator.clipboard.writeText(text);
      alert("Enquiry data copied to clipboard");
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
      filtered = applyReportFilters(filtered);
      
      const exportData = filtered.map(enquiry => {
        const row: Record<string, any> = {};

        if (visibleColumns.date) {
          row["Date"] = formatDate(enquiry.enquiry_date);
        }

        if (visibleColumns.enquiryNo) {
          row["Enquiry No"] = enquiry.enquiry_number;
        }

        if (visibleColumns.company) {
          row["Company"] = enquiry.company?.name || enquiry.customer_name || enquiry.prospect_company || "-";
          if (enquiry.company?.state) {
            row["State"] = enquiry.company.state;
          }
        }

        if (visibleColumns.contactPerson) {
          row["Contact Person"] = enquiry.contact_name || enquiry.prospect_name || "-";
        }

        if (visibleColumns.quantity) {
          const totalQty = enquiry.products_interested?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 
                         enquiry.items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0;
          row["Quantity"] = totalQty;
        }

        if (visibleColumns.status) {
          row["Status"] = enquiry.status.replace("_", " ");
        }

        if (visibleColumns.salesEngineer) {
          row["Sales Engineer"] = enquiry.salesman?.name || enquiry.sales_person_name || "-";
        }

        if (visibleColumns.remarks) {
          row["Remarks"] = enquiry.description || "-";
        }

        // row["Expected Value"] = enquiry.expected_value || 0;
        row["Brand"] = getEnquiryBrand(enquiry);
        
        return row;
      });

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Enquiries");
      XLSX.writeFile(wb, "enquiries.xlsx");
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
      filtered = applyReportFilters(filtered);
      
      const doc = new jsPDF("landscape");
      
      const headers: string[] = [];
      const body = filtered.map(enquiry => {
        const row: string[] = [];

        if (visibleColumns.date) {
          if (!headers.includes("Date")) headers.push("Date");
          row.push(formatDate(enquiry.enquiry_date));
        }

        if (visibleColumns.enquiryNo) {
          if (!headers.includes("Enquiry No")) headers.push("Enquiry No");
          row.push(enquiry.enquiry_number);
        }

        if (visibleColumns.company) {
          if (!headers.includes("Company")) headers.push("Company");
          row.push(enquiry.company?.name || enquiry.customer_name || enquiry.prospect_company || "-");
        }

        if (visibleColumns.contactPerson) {
          if (!headers.includes("Contact Person")) headers.push("Contact Person");
          row.push(enquiry.contact_name || enquiry.prospect_name || "-");
        }

        if (visibleColumns.quantity) {
          if (!headers.includes("Quantity")) headers.push("Quantity");
          const totalQty = enquiry.products_interested?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 
                         enquiry.items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0;
          row.push(totalQty.toString());
        }

        if (visibleColumns.status) {
          if (!headers.includes("Status")) headers.push("Status");
          row.push(enquiry.status.replace("_", " "));
        }

        if (visibleColumns.salesEngineer) {
          if (!headers.includes("Sales Engineer")) headers.push("Sales Engineer");
          row.push(enquiry.salesman?.name || enquiry.sales_person_name || "-");
        }

        if (visibleColumns.remarks) {
          if (!headers.includes("Remarks")) headers.push("Remarks");
          row.push(enquiry.description || "-");
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
          doc.text("Enquiries List", data.settings.margin.left, 12);
          
          doc.setFontSize(10);
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

      doc.save("enquiries.pdf");
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
      filtered = applyReportFilters(filtered);
      
      const exportData = filtered.map(enquiry => {
        const row: Record<string, any> = {};

        if (visibleColumns.date) {
          row["Date"] = formatDate(enquiry.enquiry_date);
        }

        if (visibleColumns.enquiryNo) {
          row["Enquiry No"] = enquiry.enquiry_number;
        }

        if (visibleColumns.company) {
          row["Company"] = enquiry.company?.name || enquiry.customer_name || enquiry.prospect_company || "-";
          if (enquiry.company?.state) {
            row["State"] = enquiry.company.state;
          }
        }

        if (visibleColumns.contactPerson) {
          row["Contact Person"] = enquiry.contact_name || enquiry.prospect_name || "-";
        }

        if (visibleColumns.quantity) {
          const totalQty = enquiry.products_interested?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 
                         enquiry.items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0;
          row["Quantity"] = totalQty;
        }

        if (visibleColumns.status) {
          row["Status"] = enquiry.status.replace("_", " ");
        }

        if (visibleColumns.salesEngineer) {
          row["Sales Engineer"] = enquiry.salesman?.name || enquiry.sales_person_name || "-";
        }

        if (visibleColumns.remarks) {
          row["Remarks"] = enquiry.description || "-";
        }

        // row["Expected Value"] = enquiry.expected_value || 0;
        row["Brand"] = getEnquiryBrand(enquiry);
        
        return row;
      });

      const ws = XLSX.utils.json_to_sheet(exportData);
      const csv = XLSX.utils.sheet_to_csv(ws);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      saveAs(blob, "enquiries.csv");
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
      filtered = applyReportFilters(filtered);
      
      // Prepare print content
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        alert('Please allow popups to print.');
        return;
      }

      const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Enquiries Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { text-align: center; margin-bottom: 10px; }
            .company { text-align: center; color: #666; margin-bottom: 20px; }
            .date { text-align: right; font-size: 12px; color: #666; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { background-color: #f3f4f6; text-align: left; padding: 12px; border: 1px solid #ddd; font-weight: bold; }
            td { padding: 10px; border: 1px solid #ddd; }
            tr:nth-child(even) { background-color: #f9f9f9; }
            .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; 
                      display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <h1>Enquiries List</h1>
          <div class="company">${company?.name || 'Company Name'}</div>
          <div class="date">Generated on: ${new Date().toLocaleDateString('en-IN')}</div>
          
          <table>
            <thead>
              <tr>
                ${visibleColumns.date ? '<th>Date</th>' : ''}
                ${visibleColumns.enquiryNo ? '<th>Enquiry No</th>' : ''}
                ${visibleColumns.company ? '<th>Company</th>' : ''}
                ${visibleColumns.contactPerson ? '<th>Contact Person</th>' : ''}
                ${visibleColumns.quantity ? '<th>Quantity</th>' : ''}
                ${visibleColumns.status ? '<th>Status</th>' : ''}
                ${visibleColumns.salesEngineer ? '<th>Sales Engineer</th>' : ''}
                ${visibleColumns.remarks ? '<th>Remarks</th>' : ''}
              </tr>
            </thead>
            <tbody>
              ${filtered.map(enquiry => `
                <tr>
                  ${visibleColumns.date ? `<td>${formatDate(enquiry.enquiry_date)}</td>` : ''}
                  ${visibleColumns.enquiryNo ? `<td>${enquiry.enquiry_number}</td>` : ''}
                  ${visibleColumns.company ? `<td>${enquiry.company?.name || enquiry.customer_name || enquiry.prospect_company || '-'}</td>` : ''}
                  ${visibleColumns.contactPerson ? `<td>${enquiry.contact_name || enquiry.prospect_name || '-'}</td>` : ''}
                  ${visibleColumns.quantity ? `<td>${enquiry.products_interested?.reduce((sum, item) => sum + (item.quantity || 0), 0) || enquiry.items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0}</td>` : ''}
                  ${visibleColumns.status ? `<td>${enquiry.status.replace('_', ' ')}</td>` : ''}
                  ${visibleColumns.salesEngineer ? `<td>${enquiry.salesman?.name || enquiry.sales_person_name || '-'}</td>` : ''}
                  ${visibleColumns.remarks ? `<td>${enquiry.description || '-'}</td>` : ''}
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div class="footer">
            <div>Total Enquiries: ${filtered.length}</div>
            <div>Page 1 of 1</div>
          </div>
        </body>
        </html>
      `;

      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 250);
    } catch (error) {
      console.error("Print failed:", error);
      alert("Failed to print. Please try again.");
    } finally {
      setPrintLoading(false);
    }
  };

  const toggleColumn = (key: keyof typeof visibleColumns) => {
    setVisibleColumns(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const getTotalQuantity = (enquiry: Enquiry) => {
    let totalQty = 0;
    if (enquiry.products_interested && Array.isArray(enquiry.products_interested)) {
      totalQty = enquiry.products_interested.reduce((sum: number, item: EnquiryItem) => 
        sum + (item.quantity || 0), 0);
    } else if (enquiry.items && Array.isArray(enquiry.items)) {
      totalQty = enquiry.items.reduce((sum: number, item: EnquiryItem) => 
        sum + (item.quantity || 0), 0);
    }
    return totalQty > 0 ? totalQty : "-";
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
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Enquiries
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Track and manage sales enquiries
            </p>
          </div>
          <button
            onClick={() => router.push("/enquiries/new")}
            className="px-4 py-2 transition bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            New Enquiry
          </button>
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
                placeholder="Search enquiries, enquiry number, company..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
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
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Date Range */}
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
                <option value="pending">Pending</option>
                <option value="assigned">Assigned</option>
                <option value="quoted">Quoted</option>
                <option value="purchased">Purchased</option>
                <option value="cancelled">Cancelled</option>
                <option value="completed">Completed</option>
                <option value="ignored">Ignored</option>
                <option value="new">New</option>
                <option value="contacted">Contacted</option>
                <option value="qualified">Qualified</option>
                <option value="proposal_sent">Proposal Sent</option>
                <option value="negotiation">Negotiation</option>
                <option value="won">Won</option>
                <option value="lost">Lost</option>
                <option value="on_hold">On Hold</option>
              </select>
            </div>

            {/* Engineer-wise Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Sales Engineer
              </label>
              <select
                value={engineerFilter}
                onChange={(e) => setEngineerFilter(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="">All Engineers</option>
                {engineers.map((engineer) => (
                  <option key={engineer.id} value={engineer.id}>
                    {engineer.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Brand-wise Filter */}
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
                  <option key={brand} value={brand}>
                    {brand}
                  </option>
                ))}
              </select>
            </div>

            {/* State-wise Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                State
              </label>
              <select
                value={stateFilter}
                onChange={(e) => setStateFilter(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="">All States</option>
                {states.map((state) => (
                  <option key={state} value={state}>
                    {state}
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
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-200 dark:bg-gray-700/50">
              <tr className="text-sm font-semibold text-gray-600 dark:text-gray-300">
                {visibleColumns.date && (
                  <th className="text-left px-6 py-3 whitespace-nowrap w-32">
                    Date
                  </th>
                )}
                {visibleColumns.enquiryNo && (
                  <th className="text-left px-6 py-3 whitespace-nowrap w-40">
                    Enquiry No
                  </th>
                )}
                {visibleColumns.company && (
                  <th className="text-left px-6 py-3 whitespace-nowrap w-64">
                    Company / Customer
                  </th>
                )}
                {visibleColumns.contactPerson && (
                  <th className="text-left px-6 py-3 whitespace-nowrap w-48">
                    Contact Person
                  </th>
                )}
                {visibleColumns.quantity && (
                  <th className="text-left px-6 py-3 whitespace-nowrap w-32">
                    Quantity
                  </th>
                )}
                {visibleColumns.status && (
                  <th className="text-left px-6 py-3 whitespace-nowrap w-40">
                    Status
                  </th>
                )}
                {visibleColumns.salesEngineer && (
                  <th className="text-left px-6 py-3 whitespace-nowrap w-48">
                    Sales Engineer
                  </th>
                )}
                {visibleColumns.remarks && (
                  <th className="text-left px-6 py-3 whitespace-nowrap w-64">
                    Remarks
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
              ) : enquiries.length === 0 ? (
                <tr>
                  <td colSpan={Object.values(visibleColumns).filter(Boolean).length} className="px-6 py-8 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <Building className="w-12 h-12 text-gray-400 mb-2" />
                      <p className="text-lg font-medium text-gray-900 dark:text-white mb-1">
                        No enquiries found
                      </p>
                      <p className="text-gray-500 dark:text-gray-400 mb-4">
                        {statusFilter || search ?
                          "No enquiries found matching your filters. Try adjusting your search criteria." :
                          "Create your first enquiry to start tracking sales leads."}
                      </p>
                      <button
                        onClick={() => router.push("/enquiries/new")}
                        className="text-indigo-600 hover:underline dark:text-indigo-400"
                      >
                        Create your first enquiry
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                enquiries.map((enquiry) => {
                  const isCompleted = enquiry.status === 'completed';
                  const showEditDelete = canEditEnquiry(enquiry.status) || canDeleteEnquiry(enquiry.status);

                  return (
                    <tr
                      key={enquiry.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      {visibleColumns.date && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-gray-900 dark:text-white">
                            {formatDate(enquiry.enquiry_date)}
                          </div>
                        </td>
                      )}
                      {visibleColumns.enquiryNo && (
                        <td className="px-6 py-4">
                          <Link
                            href={`/enquiries/${enquiry.id}`}
                            className="text-indigo-600 hover:text-indigo-800 font-medium dark:text-indigo-400 dark:hover:text-indigo-300"
                          >
                            {enquiry.enquiry_number}
                          </Link>
                        </td>
                      )}
                      {visibleColumns.company && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Building className="w-4 h-4 text-gray-400 flex-shrink-0" />
                            <div className="min-w-0 max-w-[240px]">
                              <div className="font-medium text-gray-900 dark:text-white truncate">
                                {enquiry.company?.name || enquiry.customer_name || enquiry.prospect_company || "-"}
                              </div>
                              {enquiry.company?.state && (
                                <div className="flex items-center gap-1 text-xs text-gray-500 truncate">
                                  <MapPin className="w-3 h-3" />
                                  {enquiry.company.state}
                                </div>
                              )}
                            </div>
                          </div>
                          {enquiry.brand && (
                            <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                              <Tag className="w-3 h-3" />
                              {enquiry.brand}
                            </div>
                          )}
                        </td>
                      )}
                      {visibleColumns.contactPerson && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-gray-400" />
                            <span>{enquiry.prospect_name || enquiry.contact_name || "-"}</span>
                          </div>
                        </td>
                      )}
                      {visibleColumns.quantity && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-gray-900 dark:text-white font-medium">
                            {getTotalQuantity(enquiry)}
                          </div>
                        </td>
                      )}
                      {visibleColumns.status && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              getStatusBadgeClass(enquiry.status)
                            }`}
                          >
                            {enquiry.status.replace("_", " ")}
                          </span>
                        </td>
                      )}
                      {visibleColumns.salesEngineer && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-gray-900 dark:text-white">
                            {enquiry.salesman?.name || enquiry.sales_person_name || "-"}
                          </div>
                        </td>
                      )}
                      {visibleColumns.remarks && (
                        <td className="px-6 py-4">
                          <div className="text-gray-500 dark:text-gray-400 truncate max-w-xs">
                            {enquiry.description || "-"}
                          </div>
                        </td>
                      )}
                      {visibleColumns.actions && (
                        <td className="px-6 py-4 text-right whitespace-nowrap">
                          <div className="relative action-dropdown-container inline-block">
                            <button
                              onClick={() =>
                                setActiveActionMenu(
                                  activeActionMenu === enquiry.id ? null : enquiry.id
                                )
                              }
                              className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-50 dark:hover:text-gray-300 dark:hover:bg-gray-700/50 transition-all duration-200"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>

                            {activeActionMenu === enquiry.id && (
                              <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg shadow-xl py-1 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                                <Link
                                  href={`/enquiries/${enquiry.id}`}
                                  onClick={() => setActiveActionMenu(null)}
                                  className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                                >
                                  <Eye className="w-4 h-4 text-gray-400" />
                                  <span>View Details</span>
                                </Link>

                                {canEditEnquiry(enquiry.status) && (
                                  <Link
                                    href={`/enquiries/${enquiry.id}/edit`}
                                    onClick={() => setActiveActionMenu(null)}
                                    className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                                  >
                                    <Edit className="w-4 h-4 text-gray-400" />
                                    <span>Edit / Assign</span>
                                </Link>
                                )}

                                {canDeleteEnquiry(enquiry.status) && (
                                  <>
                                    <div className="my-1 border-t border-gray-100 dark:border-gray-700"></div>
                                    <button
                                      onClick={() => {
                                        if (confirm(`Are you sure you want to delete enquiry ${enquiry.enquiry_number}?`)) {
                                          handleDeleteEnquiry(enquiry.id, enquiry.enquiry_number);
                                          setActiveActionMenu(null);
                                        }
                                      }}
                                      className="flex w-full items-center gap-3 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                      <span>Delete Enquiry</span>
                                    </button>
                                  </>
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
    </div>
  );
}
