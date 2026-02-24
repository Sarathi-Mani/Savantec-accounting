"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
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
  Route,
  MapPin,
  Navigation,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  Calendar,
  User,
  RefreshCw,
  MoreVertical,
  Eye,
  Copy,
  FileText,
  Download,
  Printer,
  ChevronDown,
  ChevronUp,
  Users,
  Briefcase,
} from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:6768/api";

interface Trip {
  id: string;
  trip_number: string;
  engineer_id: string;
  engineer_name: string;
  start_time: string | null;
  end_time: string | null;
  start_km: number | null;
  end_km: number | null;
  manual_distance_km: number | null;
  gps_distance_km: number | null;
  system_distance_km: number | null;
  status: string;
  is_valid: boolean;
  has_fraud_flag: boolean;
  created_at: string;
}

interface Salesman {
  id: string;
  name: string;
  email: string;
  phone: string;
  designation: string;
}

// Print component for trips
const PrintView = ({
  trips,
  visibleColumns,
  formatDate,
  getStatusText,
  getStatusBadgeClass,
  companyName,
  onComplete,
}: {
  trips: Trip[];
  visibleColumns: Record<string, boolean>;
  formatDate: (dateString: string | null) => string;
  getStatusText: (status: string, isValid: boolean, hasFraud: boolean) => string;
  getStatusBadgeClass: (status: string, isValid: boolean, hasFraud: boolean) => string;
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
            Trips List
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
              {visibleColumns.tripNumber && (
                <th style={{
                  padding: '12px',
                  textAlign: 'left',
                  borderRight: '1px solid #ddd',
                  fontWeight: 'bold'
                }}>
                  Trip No.
                </th>
              )}
              {visibleColumns.engineer && (
                <th style={{
                  padding: '12px',
                  textAlign: 'left',
                  borderRight: '1px solid #ddd',
                  fontWeight: 'bold'
                }}>
                  Engineer
                </th>
              )}
              {visibleColumns.startTime && (
                <th style={{
                  padding: '12px',
                  textAlign: 'left',
                  borderRight: '1px solid #ddd',
                  fontWeight: 'bold'
                }}>
                  Start Time
                </th>
              )}
              {visibleColumns.endTime && (
                <th style={{
                  padding: '12px',
                  textAlign: 'left',
                  borderRight: '1px solid #ddd',
                  fontWeight: 'bold'
                }}>
                  End Time
                </th>
              )}
              {visibleColumns.distance && (
                <th style={{
                  padding: '12px',
                  textAlign: 'left',
                  borderRight: '1px solid #ddd',
                  fontWeight: 'bold'
                }}>
                  Distance (km)
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
            </tr>
          </thead>
          <tbody>
            {trips.map((trip, index) => (
              <tr key={trip.id} style={{
                borderBottom: '1px solid #ddd',
                backgroundColor: index % 2 === 0 ? '#fff' : '#f9f9f9'
              }}>
                {visibleColumns.tripNumber && (
                  <td style={{
                    padding: '12px',
                    borderRight: '1px solid #ddd',
                    fontWeight: 'bold'
                  }}>
                    {trip.trip_number}
                  </td>
                )}
                {visibleColumns.engineer && (
                  <td style={{
                    padding: '12px',
                    borderRight: '1px solid #ddd'
                  }}>
                    {trip.engineer_name}
                  </td>
                )}
                {visibleColumns.startTime && (
                  <td style={{
                    padding: '12px',
                    borderRight: '1px solid #ddd'
                  }}>
                    {formatDate(trip.start_time)}
                  </td>
                )}
                {visibleColumns.endTime && (
                  <td style={{
                    padding: '12px',
                    borderRight: '1px solid #ddd'
                  }}>
                    {formatDate(trip.end_time)}
                  </td>
                )}
                {visibleColumns.distance && (
                  <td style={{
                    padding: '12px',
                    borderRight: '1px solid #ddd'
                  }}>
                    <div>{Number(trip.system_distance_km || 0).toFixed(2)} km</div>
                    <div style={{ fontSize: '11px', color: '#666' }}>
                      Manual: {Number(trip.manual_distance_km || 0).toFixed(2)} km
                    </div>
                  </td>
                )}
                {visibleColumns.status && (
                  <td style={{ padding: '12px' }}>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '4px 8px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      backgroundColor: trip.has_fraud_flag ? '#fee2e2' :
                        !trip.is_valid ? '#fef3c7' :
                          trip.status === 'completed' ? '#d1fae5' :
                            trip.status === 'started' || trip.status === 'in_progress' ? '#dbeafe' :
                              trip.status === 'cancelled' ? '#f3f4f6' : '#f3f4f6',
                      color: trip.has_fraud_flag ? '#991b1b' :
                        !trip.is_valid ? '#92400e' :
                          trip.status === 'completed' ? '#065f46' :
                            trip.status === 'started' || trip.status === 'in_progress' ? '#1e40af' :
                              trip.status === 'cancelled' ? '#374151' : '#374151'
                    }}>
                      {getStatusText(trip.status, trip.is_valid, trip.has_fraud_flag)}
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
            Total Trips: {trips.length}
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
const formatDate = (dateStr: string | null): string => {
  if (!dateStr) return '-';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return '-';
  }
};

export default function TripsPage() {
  const router = useRouter();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [salesmen, setSalesmen] = useState<Salesman[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Filters state
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [engineerFilter, setEngineerFilter] = useState("");
  const [validityFilter, setValidityFilter] = useState<string>("");
  
  // UI state
  const [showFilters, setShowFilters] = useState(false);
  const [showColumnDropdown, setShowColumnDropdown] = useState(false);
  const [activeActionMenu, setActiveActionMenu] = useState<string | null>(null);
  const [showPrintView, setShowPrintView] = useState(false);
  const [tripsToPrint, setTripsToPrint] = useState<Trip[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  
  // Export loading states
  const [copyLoading, setCopyLoading] = useState(false);
  const [excelLoading, setExcelLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [csvLoading, setCsvLoading] = useState(false);
  const [printLoading, setPrintLoading] = useState(false);
  
  const [cachedExportData, setCachedExportData] = useState<Trip[] | null>(null);
  
  // Column visibility
  const [visibleColumns, setVisibleColumns] = useState({
    tripNumber: true,
    engineer: true,
    startTime: true,
    endTime: true,
    distance: true,
    status: true,
    actions: true,
  });

  const companyId = typeof window !== "undefined" ? localStorage.getItem("company_id") : null;
  const companyName = typeof window !== "undefined" ? localStorage.getItem("company_name") || "Company" : "Company";

  // Fetch data on mount and when filters change
  useEffect(() => {
    if (companyId) {
      fetchTrips();
      fetchSalesmen();
    }
  }, [companyId]);

  useEffect(() => {
    if (companyId) {
      fetchTrips();
      setCachedExportData(null);
    }
  }, [statusFilter, engineerFilter, validityFilter, fromDate, toDate]);

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, engineerFilter, validityFilter, fromDate, toDate, search]);

  // Handle click outside for dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element | null;
      if (!target) return;
      if (!target.closest(".action-dropdown-container")) {
        setActiveActionMenu(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
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

  const fetchSalesmen = async () => {
    const token = typeof window !== "undefined" ? localStorage.getItem("employee_token") || localStorage.getItem("access_token") : null;
    if (!token || !companyId) return;

    try {
      const response = await fetch(
        `${API_BASE}/companies/${companyId}/sales-engineers`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data && Array.isArray(data)) {
        const formattedSalesmen = data.map((engineer: any) => ({
          id: engineer.id,
          name: engineer.full_name || engineer.name || "Unnamed Salesman",
          email: engineer.email || "",
          phone: engineer.phone || "",
          designation: engineer.designation_name || engineer.designation || "Sales Engineer",
        }));
        setSalesmen(formattedSalesmen);
      } else {
        setSalesmen([]);
      }
    } catch (err) {
      console.error("Failed to fetch salesmen:", err);

      // Fallback to employees API and filter sales roles
      try {
        const response = await fetch(
          `${API_BASE}/companies/${companyId}/employees`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        if (!response.ok) throw new Error("Failed to fetch employees");
        const data = await response.json();
        const salesEmployees = (Array.isArray(data) ? data : []).filter((emp: any) => {
          const designation = emp.designation
            ? typeof emp.designation === "string"
              ? emp.designation
              : String(emp.designation)
            : "";
          const employeeType = emp.employee_type
            ? typeof emp.employee_type === "string"
              ? emp.employee_type
              : String(emp.employee_type)
            : "";
          return (
            designation.toLowerCase().includes("sales") ||
            employeeType.toLowerCase().includes("sales")
          );
        });
        const formattedSalesmen = salesEmployees.map((emp: any) => ({
          id: emp.id,
          name: emp.full_name || `${emp.first_name || ""} ${emp.last_name || ""}`.trim() || "Unnamed Salesman",
          email: emp.email || "",
          phone: emp.phone || "",
          designation: emp.designation || emp.employee_type || "Sales Engineer",
        }));
        setSalesmen(formattedSalesmen);
      } catch (fallbackErr) {
        console.error("Also failed to load employees:", fallbackErr);
        setSalesmen([]);
      }
    }
  };

  const fetchTrips = async () => {
    try {
      setLoading(true);
      setError("");
      const params = new URLSearchParams();
      if (engineerFilter) params.append("engineer_id", engineerFilter);
      if (statusFilter) params.append("status", statusFilter);
      if (fromDate) params.append("start_date", fromDate);
      if (toDate) params.append("end_date", toDate);
      if (validityFilter) params.append("is_valid", validityFilter);
      if (search) params.append("search", search);

      const response = await fetch(
        `${API_BASE}/companies/${companyId}/trips?${params}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("employee_token") || localStorage.getItem("access_token")}`,
          },
        }
      );

      if (!response.ok) throw new Error("Failed to fetch trips");
      const data = await response.json();
      setTrips(Array.isArray(data) ? data : []);
    } catch (err) {
      setError("Failed to load trips");
      console.error("Failed to load trips:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllTripsForExport = useCallback(async (): Promise<Trip[]> => {
    try {
      if (!companyId) return [];

      const params = new URLSearchParams();
      // Fetch all trips without pagination for export
      if (engineerFilter) params.append("engineer_id", engineerFilter);
      if (statusFilter) params.append("status", statusFilter);
      if (fromDate) params.append("start_date", fromDate);
      if (toDate) params.append("end_date", toDate);
      if (validityFilter) params.append("is_valid", validityFilter);

      const response = await fetch(
        `${API_BASE}/companies/${companyId}/trips?${params}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("employee_token") || localStorage.getItem("access_token")}`,
          },
        }
      );

      if (!response.ok) throw new Error("Failed to fetch trips for export");
      const data = await response.json();
      const allTrips = Array.isArray(data) ? data : [];
      setCachedExportData(allTrips);
      return allTrips;
    } catch (error) {
      console.error("Export fetch failed:", error);
      return [];
    }
  }, [companyId, engineerFilter, statusFilter, fromDate, toDate, validityFilter]);

  const getExportData = async (): Promise<Trip[]> => {
    if (cachedExportData) return cachedExportData;
    return await fetchAllTripsForExport();
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchTrips();
  };

  const handleReset = () => {
    setSearch("");
    setFromDate("");
    setToDate("");
    setStatusFilter("");
    setEngineerFilter("");
    setValidityFilter("");
    fetchTrips();
  };

  const getStatusText = (status: string, isValid: boolean, hasFraud: boolean): string => {
    if (hasFraud) return 'Fraud Flagged';
    if (!isValid) return 'Invalid';
    
    const statusMap: Record<string, string> = {
      'draft': 'Draft',
      'started': 'Started',
      'in_progress': 'In Progress',
      'completed': 'Completed',
      'cancelled': 'Cancelled',
    };
    return statusMap[status] || status.replace('_', ' ');
  };

  const getStatusBadgeClass = (status: string, isValid: boolean, hasFraud: boolean): string => {
    if (hasFraud) return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
    if (!isValid) return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
    
    switch (status) {
      case "started":
      case "in_progress":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
      case "completed":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "cancelled":
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "started":
      case "in_progress":
        return <Navigation className="w-3 h-3" />;
      case "completed":
        return <CheckCircle className="w-3 h-3" />;
      case "cancelled":
        return <XCircle className="w-3 h-3" />;
      default:
        return <Clock className="w-3 h-3" />;
    }
  };

  const getSalesmanLabel = (salesman: Salesman) => {
    const name = salesman?.name || "Unnamed Salesman";
    const metaParts: string[] = [];
    if (salesman?.designation) metaParts.push(String(salesman.designation));
    if (salesman?.email) metaParts.push(String(salesman.email));
    if (salesman?.phone) metaParts.push(String(salesman.phone));
    return metaParts.length ? `${name} (${metaParts.join(" | ")})` : name;
  };

  // Apply search filter locally for export data
  const applySearchFilter = (data: Trip[]): Trip[] => {
    if (!search) return data;
    
    const searchLower = search.toLowerCase();
    return data.filter(trip => {
      return (
        trip.trip_number?.toLowerCase().includes(searchLower) ||
        trip.engineer_name?.toLowerCase().includes(searchLower) ||
        false
      );
    });
  };

  // Apply filters locally
  const applyFilters = (data: Trip[]): Trip[] => {
    let filtered = data;
    
    if (statusFilter) {
      filtered = filtered.filter(trip => trip.status === statusFilter);
    }
    
    if (engineerFilter) {
      filtered = filtered.filter(trip => trip.engineer_id === engineerFilter);
    }
    
    if (validityFilter) {
      const isValid = validityFilter === 'true';
      filtered = filtered.filter(trip => trip.is_valid === isValid);
    }
    
    // Date filters
    if (fromDate) {
      filtered = filtered.filter(trip => {
        if (!trip.start_time) return false;
        const tripDate = new Date(trip.start_time);
        const from = new Date(fromDate);
        return tripDate >= from;
      });
    }
    
    if (toDate) {
      filtered = filtered.filter(trip => {
        if (!trip.start_time) return false;
        const tripDate = new Date(trip.start_time);
        const to = new Date(toDate);
        to.setHours(23, 59, 59, 999); // End of day
        return tripDate <= to;
      });
    }
    
    return filtered;
  };

  const filteredTrips = trips.filter(trip => {
    if (statusFilter && trip.status !== statusFilter) return false;
    if (engineerFilter && trip.engineer_id !== engineerFilter) return false;
    if (validityFilter) {
      const isValid = validityFilter === 'true';
      if (trip.is_valid !== isValid) return false;
    }
    
    if (fromDate && trip.start_time) {
      const tripDate = new Date(trip.start_time);
      const from = new Date(fromDate);
      if (tripDate < from) return false;
    }
    
    if (toDate && trip.start_time) {
      const tripDate = new Date(trip.start_time);
      const to = new Date(toDate);
      to.setHours(23, 59, 59, 999);
      if (tripDate > to) return false;
    }
    
    if (search) {
      const searchLower = search.toLowerCase();
      return (
        trip.trip_number?.toLowerCase().includes(searchLower) ||
        trip.engineer_name?.toLowerCase().includes(searchLower) ||
        false
      );
    }
    
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filteredTrips.length / pageSize));
  const pagedTrips = filteredTrips.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Summary stats
  const totalTrips = trips.length;
  const completedTrips = trips.filter(t => t.status === 'completed').length;
  const inProgressTrips = trips.filter(t => t.status === 'started' || t.status === 'in_progress').length;
  const flaggedTrips = trips.filter(t => t.has_fraud_flag).length;

  // Export functions
  const copyToClipboard = async () => {
    if (copyLoading) return;
    setCopyLoading(true);
    try {
      const allData = await getExportData();
      let filtered = applySearchFilter(allData);
      filtered = applyFilters(filtered);
      
      const headers: string[] = [];
      const rows = filtered.map(trip => {
        const row: string[] = [];

        if (visibleColumns.tripNumber) {
          if (!headers.includes("Trip No.")) headers.push("Trip No.");
          row.push(trip.trip_number);
        }

        if (visibleColumns.engineer) {
          if (!headers.includes("Engineer")) headers.push("Engineer");
          row.push(trip.engineer_name);
        }

        if (visibleColumns.startTime) {
          if (!headers.includes("Start Time")) headers.push("Start Time");
          row.push(formatDate(trip.start_time));
        }

        if (visibleColumns.endTime) {
          if (!headers.includes("End Time")) headers.push("End Time");
          row.push(formatDate(trip.end_time));
        }

        if (visibleColumns.distance) {
          if (!headers.includes("Distance (km)")) headers.push("Distance (km)");
          row.push(`${Number(trip.system_distance_km || 0).toFixed(2)} km`);
        }

        if (visibleColumns.status) {
          if (!headers.includes("Status")) headers.push("Status");
          row.push(getStatusText(trip.status, trip.is_valid, trip.has_fraud_flag));
        }

        return row;
      });

      const text = [headers.join("\t"), ...rows.map(r => r.join("\t"))].join("\n");
      await navigator.clipboard.writeText(text);
      alert("Trip data copied to clipboard");
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
      
      const exportData = filtered.map(trip => {
        const row: Record<string, any> = {};

        if (visibleColumns.tripNumber) {
          row["Trip No."] = trip.trip_number;
        }

        if (visibleColumns.engineer) {
          row["Engineer"] = trip.engineer_name;
          row["Engineer ID"] = trip.engineer_id;
        }

        if (visibleColumns.startTime) {
          row["Start Time"] = formatDate(trip.start_time);
        }

        if (visibleColumns.endTime) {
          row["End Time"] = formatDate(trip.end_time);
        }

        if (visibleColumns.distance) {
          row["System Distance (km)"] = Number(trip.system_distance_km || 0).toFixed(2);
          row["Manual Distance (km)"] = Number(trip.manual_distance_km || 0).toFixed(2);
          row["GPS Distance (km)"] = Number(trip.gps_distance_km || 0).toFixed(2);
        }

        if (visibleColumns.status) {
          row["Status"] = getStatusText(trip.status, trip.is_valid, trip.has_fraud_flag);
        }

        row["Is Valid"] = trip.is_valid ? "Yes" : "No";
        row["Has Fraud Flag"] = trip.has_fraud_flag ? "Yes" : "No";
        row["Created At"] = formatDate(trip.created_at);
        
        return row;
      });

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Trips");
      XLSX.writeFile(wb, "trips.xlsx");
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
      
      const doc = new jsPDF("landscape");
      
      const headers: string[] = [];
      const body = filtered.map(trip => {
        const row: string[] = [];

        if (visibleColumns.tripNumber) {
          if (!headers.includes("Trip No.")) headers.push("Trip No.");
          row.push(trip.trip_number);
        }

        if (visibleColumns.engineer) {
          if (!headers.includes("Engineer")) headers.push("Engineer");
          row.push(trip.engineer_name);
        }

        if (visibleColumns.startTime) {
          if (!headers.includes("Start Time")) headers.push("Start Time");
          row.push(formatDate(trip.start_time));
        }

        if (visibleColumns.endTime) {
          if (!headers.includes("End Time")) headers.push("End Time");
          row.push(formatDate(trip.end_time));
        }

        if (visibleColumns.distance) {
          if (!headers.includes("Distance (km)")) headers.push("Distance (km)");
          row.push(`${Number(trip.system_distance_km || 0).toFixed(2)} km`);
        }

        if (visibleColumns.status) {
          if (!headers.includes("Status")) headers.push("Status");
          row.push(getStatusText(trip.status, trip.is_valid, trip.has_fraud_flag));
        }

        return row;
      });

      autoTable(doc, {
        ...getProfessionalTableTheme(doc, "Trips List", companyName, "l"),
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
      doc.save("trips.pdf");
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
      
      const exportData = filtered.map(trip => {
        const row: Record<string, any> = {};

        if (visibleColumns.tripNumber) {
          row["Trip No."] = trip.trip_number;
        }

        if (visibleColumns.engineer) {
          row["Engineer"] = trip.engineer_name;
        }

        if (visibleColumns.startTime) {
          row["Start Time"] = formatDate(trip.start_time);
        }

        if (visibleColumns.endTime) {
          row["End Time"] = formatDate(trip.end_time);
        }

        if (visibleColumns.distance) {
          row["Distance (km)"] = Number(trip.system_distance_km || 0).toFixed(2);
        }

        if (visibleColumns.status) {
          row["Status"] = getStatusText(trip.status, trip.is_valid, trip.has_fraud_flag);
        }

        return row;
      });

      const ws = XLSX.utils.json_to_sheet(exportData);
      const csv = XLSX.utils.sheet_to_csv(ws);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      saveAs(blob, "trips.csv");
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
      setTripsToPrint(filtered);
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
          trips={tripsToPrint}
          visibleColumns={visibleColumns}
          formatDate={formatDate}
          getStatusText={getStatusText}
          getStatusBadgeClass={getStatusBadgeClass}
          companyName={companyName}
        />
      )}

      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Trips
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Track and manage engineer trips
            </p>
          </div>
          <button
            onClick={() => router.push('/sales-tracking/trips/new')}
            className="px-4 py-2 transition bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            New Trip
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="px-6 py-6 bg-gray-50 dark:bg-gray-900">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
          {/* Total Trips */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {totalTrips.toLocaleString()}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Total Trips
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
                <Route className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </div>

          {/* Completed Trips */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-green-600">
                  {completedTrips}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Completed Trips
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </div>

          {/* In Progress */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-blue-600">
                  {inProgressTrips}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  In Progress
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                <Navigation className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>

          {/* Flagged Trips */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-red-600">
                  {flaggedTrips}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Fraud Flagged
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
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
                placeholder="Search by trip number or engineer..."
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
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
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

            {/* Engineer Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Engineer
              </label>
              <select
                value={engineerFilter}
                onChange={(e) => setEngineerFilter(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="">All Engineers</option>
                {salesmen.map((salesman) => (
                  <option key={salesman.id} value={salesman.id}>
                    {getSalesmanLabel(salesman)}
                  </option>
                ))}
              </select>
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
                <option value="draft">Draft</option>
                <option value="started">Started</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            {/* Validity Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Validity
              </label>
              <select
                value={validityFilter}
                onChange={(e) => setValidityFilter(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="">All</option>
                <option value="true">Valid</option>
                <option value="false">Invalid</option>
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
        <div className="w-full overflow-x-hidden">
          <table className="w-full table-fixed">
            <thead className="bg-gray-200 dark:bg-gray-700/50">
              <tr className="text-sm font-semibold text-gray-600 dark:text-gray-300">
                <th className="text-left px-2 py-3 w-20">
                  S.No
                </th>
                {visibleColumns.tripNumber && (
                  <th className="text-left px-2 py-3">
                    Trip No.
                  </th>
                )}
                {visibleColumns.engineer && (
                  <th className="text-left px-2 py-3">
                    Engineer
                  </th>
                )}
                {visibleColumns.startTime && (
                  <th className="text-left px-2 py-3">
                    Start Time
                  </th>
                )}
                {visibleColumns.endTime && (
                  <th className="text-left px-2 py-3">
                    End Time
                  </th>
                )}
                {visibleColumns.distance && (
                  <th className="text-left px-2 py-3">
                    Distance (km)
                  </th>
                )}
                {visibleColumns.status && (
                  <th className="text-left px-2 py-3">
                    Status
                  </th>
                )}
                {visibleColumns.actions && (
                  <th className="text-right px-2 py-3 w-16">
                    Actions
                  </th>
                )}
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
              ) : filteredTrips.length === 0 ? (
                <tr>
                  <td colSpan={Object.values(visibleColumns).filter(Boolean).length + 1} className="px-6 py-8 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <Route className="w-12 h-12 text-gray-400 mb-2" />
                      <p className="text-lg font-medium text-gray-900 dark:text-white mb-1">
                        No trips found
                      </p>
                      <p className="text-gray-500 dark:text-gray-400 mb-4">
                        {statusFilter || engineerFilter || validityFilter || search ?
                          "No trips found matching your filters. Try adjusting your search criteria." :
                          "Start tracking your first trip."}
                      </p>
                      <button
                        onClick={() => router.push('/sales-tracking/trips/new')}
                        className="text-indigo-600 hover:underline dark:text-indigo-400"
                      >
                        Start your first trip
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                pagedTrips.map((trip, index) => (
                  <tr
                    key={trip.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <td className="px-2 py-4 align-top break-words text-gray-700 dark:text-gray-300">
                      {(currentPage - 1) * pageSize + index + 1}
                    </td>
                    {visibleColumns.tripNumber && (
                      <td className="px-2 py-4 align-top break-words">
                        <Link
                          href={`/sales-tracking/trips/${trip.id}`}
                          className="font-medium text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 break-all"
                        >
                          {trip.trip_number}
                        </Link>
                      </td>
                    )}
                    {visibleColumns.engineer && (
                      <td className="px-2 py-4 align-top break-words">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          <span className="truncate">{trip.engineer_name}</span>
                        </div>
                      </td>
                    )}
                    {visibleColumns.startTime && (
                      <td className="px-2 py-4 align-top break-words">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          <span>{formatDate(trip.start_time)}</span>
                        </div>
                      </td>
                    )}
                    {visibleColumns.endTime && (
                      <td className="px-2 py-4 align-top break-words">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          <span>{formatDate(trip.end_time)}</span>
                        </div>
                      </td>
                    )}
                    {visibleColumns.distance && (
                      <td className="px-2 py-4 align-top break-words">
                        <div className="text-gray-900 dark:text-white font-medium">
                          {Number(trip.system_distance_km || 0).toFixed(2)} km
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          Manual: {Number(trip.manual_distance_km || 0).toFixed(2)} km
                        </div>
                      </td>
                    )}
                    {visibleColumns.status && (
                      <td className="px-2 py-4 align-top break-words">
                        <div className="flex flex-col items-start gap-1">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                              getStatusBadgeClass(trip.status, trip.is_valid, trip.has_fraud_flag)
                            }`}
                          >
                            {getStatusIcon(trip.status)}
                            {trip.status === 'in_progress' ? 'In Progress' : 
                             trip.status === 'started' ? 'Started' :
                             trip.status.charAt(0).toUpperCase() + trip.status.slice(1)}
                          </span>
                          {trip.has_fraud_flag && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                              <AlertCircle className="w-3 h-3" />
                              Fraud
                            </span>
                          )}
                          {!trip.is_valid && !trip.has_fraud_flag && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
                              <AlertCircle className="w-3 h-3" />
                              Invalid
                            </span>
                          )}
                        </div>
                      </td>
                    )}
                    {visibleColumns.actions && (
                      <td className="px-2 py-4 text-right align-top">
                        <div className="relative action-dropdown-container inline-block">
                          <button
                            onClick={() =>
                              setActiveActionMenu(
                                activeActionMenu === trip.id ? null : trip.id
                              )
                            }
                            className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-50 dark:hover:text-gray-300 dark:hover:bg-gray-700/50 transition-all duration-200"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>

                          {activeActionMenu === trip.id && (
                            <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg shadow-xl py-1 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                              <Link
                                href={`/sales-tracking/trips/${trip.id}`}
                                onClick={() => setActiveActionMenu(null)}
                                className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                              >
                                <Eye className="w-4 h-4 text-gray-400" />
                                <span>View Details</span>
                              </Link>
                              <Link
                                href={`/sales-tracking/trips/${trip.id}/route`}
                                onClick={() => setActiveActionMenu(null)}
                                className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                              >
                                <MapPin className="w-4 h-4 text-gray-400" />
                                <span>View Route</span>
                              </Link>
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
      {!loading && filteredTrips.length > 0 && (
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, filteredTrips.length)} of {filteredTrips.length} trips
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

