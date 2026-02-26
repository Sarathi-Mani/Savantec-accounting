"use client";

import { useAuth } from "@/context/AuthContext";
import { inventoryApi, Godown, getErrorMessage } from "@/services/api";
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
  Building,
  MapPin,
  Hash,
  CheckCircle,
  XCircle,
  MoreVertical,
  Edit,
  Trash2,
  Printer,
  Copy,
  ChevronDown,
  ChevronUp,
  Download,
  FileText,
  RefreshCw,
  Layers,
  Home,
  Warehouse,
} from "lucide-react";

// Print component for godowns
const PrintView = ({
  godowns,
  visibleColumns,
  getParentName,
  companyName,
  onComplete,
}: {
  godowns: Godown[];
  visibleColumns: Record<string, boolean>;
  getParentName: (parentId?: string) => string;
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
            Godowns / Warehouses List
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
              {visibleColumns.sNo && (
                <th style={{
                  padding: '12px',
                  textAlign: 'left',
                  borderRight: '1px solid #ddd',
                  fontWeight: 'bold'
                }}>
                  S.No
                </th>
              )}
              {visibleColumns.name && (
                <th style={{
                  padding: '12px',
                  textAlign: 'left',
                  borderRight: '1px solid #ddd',
                  fontWeight: 'bold'
                }}>
                  Godown Name
                </th>
              )}
              {visibleColumns.code && (
                <th style={{
                  padding: '12px',
                  textAlign: 'left',
                  borderRight: '1px solid #ddd',
                  fontWeight: 'bold'
                }}>
                  Code
                </th>
              )}
              {visibleColumns.address && (
                <th style={{
                  padding: '12px',
                  textAlign: 'left',
                  borderRight: '1px solid #ddd',
                  fontWeight: 'bold'
                }}>
                  Address
                </th>
              )}
              {visibleColumns.parent && (
                <th style={{
                  padding: '12px',
                  textAlign: 'left',
                  borderRight: '1px solid #ddd',
                  fontWeight: 'bold'
                }}>
                  Parent Location
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
            {godowns.map((godown, index) => (
              <tr key={godown.id} style={{
                borderBottom: '1px solid #ddd',
                backgroundColor: index % 2 === 0 ? '#fff' : '#f9f9f9'
              }}>
                {visibleColumns.sNo && (
                  <td style={{
                    padding: '12px',
                    borderRight: '1px solid #ddd'
                  }}>
                    {index + 1}
                  </td>
                )}
                {visibleColumns.name && (
                  <td style={{
                    padding: '12px',
                    borderRight: '1px solid #ddd'
                  }}>
                    <div>
                      <span style={{ fontWeight: 500 }}>{godown.name}</span>
                      {godown.is_default && (
                        <span style={{
                          marginLeft: '8px',
                          display: 'inline-block',
                          padding: '2px 6px',
                          borderRadius: '12px',
                          fontSize: '10px',
                          fontWeight: 'bold',
                          backgroundColor: '#d1fae5',
                          color: '#065f46'
                        }}>
                          Default
                        </span>
                      )}
                    </div>
                  </td>
                )}
                {visibleColumns.code && (
                  <td style={{
                    padding: '12px',
                    borderRight: '1px solid #ddd'
                  }}>
                    {godown.code || '-'}
                  </td>
                )}
                {visibleColumns.address && (
                  <td style={{
                    padding: '12px',
                    borderRight: '1px solid #ddd'
                  }}>
                    {godown.address || '-'}
                  </td>
                )}
                {visibleColumns.parent && (
                  <td style={{
                    padding: '12px',
                    borderRight: '1px solid #ddd'
                  }}>
                    {getParentName(godown.parent_id)}
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
                      backgroundColor: godown.is_active ? '#d1fae5' : '#f3f4f6',
                      color: godown.is_active ? '#065f46' : '#374151'
                    }}>
                      {godown.is_active ? 'Active' : 'Inactive'}
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
            Total Godowns: {godowns.length}
          </div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            Page 1 of 1
          </div>
        </div>
      </div>
    </div>
  );
};

export default function GodownsPage() {
  const { company } = useAuth();
  const [godowns, setGodowns] = useState<Godown[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filters state
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [defaultFilter, setDefaultFilter] = useState("");
  
  // UI state
  const [showFilters, setShowFilters] = useState(false);
  const [showColumnDropdown, setShowColumnDropdown] = useState(false);
  const [activeActionMenu, setActiveActionMenu] = useState<string | null>(null);
  const [showPrintView, setShowPrintView] = useState(false);
  const [godownsToPrint, setGodownsToPrint] = useState<Godown[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  
  // Export loading states
  const [copyLoading, setCopyLoading] = useState(false);
  const [excelLoading, setExcelLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [csvLoading, setCsvLoading] = useState(false);
  const [printLoading, setPrintLoading] = useState(false);
  
  const [cachedExportData, setCachedExportData] = useState<Godown[] | null>(null);
  
  // Column visibility
  const [visibleColumns, setVisibleColumns] = useState({
    sNo: true,
    name: true,
    code: true,
    address: true,
    parent: true,
    status: true,
    actions: true,
  });

  const emptyFormData = {
    name: "",
    code: "",
    address: "",
    parent_id: "",
    is_default: false,
  };

  const [formData, setFormData] = useState(emptyFormData);

  useEffect(() => {
    if (company?.id) {
      fetchGodowns();
    }
  }, [company?.id]);

  useEffect(() => {
    if (company?.id) {
      fetchGodowns();
      setCachedExportData(null);
    }
  }, [statusFilter, defaultFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, defaultFilter, search]);

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

  const fetchGodowns = async () => {
    if (!company?.id) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const data = await inventoryApi.listGodowns(company.id);
      setGodowns(data);
      setError(null);
    } catch (error) {
      console.error("Failed to fetch godowns:", error);
      setError("Failed to load godowns");
    } finally {
      setLoading(false);
    }
  };

  const fetchAllGodownsForExport = useCallback(async (): Promise<Godown[]> => {
    try {
      if (!company?.id) return [];
      const godownsList = await inventoryApi.listGodowns(company.id);
      const allGodowns = godownsList || [];
      setCachedExportData(allGodowns);
      return allGodowns;
    } catch (error) {
      console.error("Export fetch failed:", error);
      return [];
    }
  }, [company?.id]);

  const getExportData = async (): Promise<Godown[]> => {
    if (cachedExportData) return cachedExportData;
    return await fetchAllGodownsForExport();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    setError(null);
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData(emptyFormData);
    setError(null);
  };

  const handleEdit = (godown: Godown) => {
    setEditingId(godown.id);
    setFormData({
      name: godown.name,
      code: godown.code || "",
      address: godown.address || "",
      parent_id: godown.parent_id || "",
      is_default: godown.is_default,
    });
    setShowForm(true);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company?.id) return;

    if (!formData.name.trim()) {
      setError("Please enter a godown name");
      return;
    }

    setFormLoading(true);
    setError(null);

    try {
      if (editingId) {
        const updated = await inventoryApi.createGodown(company.id, {
          ...formData,
          parent_id: formData.parent_id || undefined,
        });
        setGodowns(godowns.map((g) => (g.id === editingId ? updated : g)));
      } else {
        const newGodown = await inventoryApi.createGodown(company.id, {
          ...formData,
          parent_id: formData.parent_id || undefined,
        });
        setGodowns([...godowns, newGodown]);
      }
      resetForm();
      setCachedExportData(null);
    } catch (error: any) {
      setError(getErrorMessage(error, `Failed to ${editingId ? "update" : "create"} godown`));
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (godownId: string) => {
    if (!company?.id) return;
    setDeleteConfirm(null);
    // Add delete API call here when available
    alert("Delete functionality - API endpoint needed");
  };

  const getParentName = (parentId?: string): string => {
    if (!parentId) return "—";
    const parent = godowns.find((g) => g.id === parentId);
    return parent?.name || "Unknown";
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Search is already applied via filtering
  };

  const handleReset = () => {
    setSearch("");
    setStatusFilter("");
    setDefaultFilter("");
    setCurrentPage(1);
  };

  // Apply filters locally
  const applySearchFilter = (data: Godown[]): Godown[] => {
    if (!search) return data;
    
    const searchLower = search.toLowerCase();
    return data.filter(godown => {
      return (
        godown.name?.toLowerCase().includes(searchLower) ||
        godown.code?.toLowerCase().includes(searchLower) ||
        godown.address?.toLowerCase().includes(searchLower) ||
        getParentName(godown.parent_id).toLowerCase().includes(searchLower) ||
        false
      );
    });
  };

  const applyFilters = (data: Godown[]): Godown[] => {
    let filtered = data;
    
    if (statusFilter) {
      filtered = filtered.filter(godown => 
        statusFilter === "active" ? godown.is_active : !godown.is_active
      );
    }
    
    if (defaultFilter) {
      filtered = filtered.filter(godown => 
        defaultFilter === "default" ? godown.is_default : !godown.is_default
      );
    }
    
    return filtered;
  };

  const filteredGodowns = godowns.filter(godown => {
    // Apply status filter
    if (statusFilter) {
      if (statusFilter === "active" && !godown.is_active) return false;
      if (statusFilter === "inactive" && godown.is_active) return false;
    }
    
    // Apply default filter
    if (defaultFilter) {
      if (defaultFilter === "default" && !godown.is_default) return false;
      if (defaultFilter === "non-default" && godown.is_default) return false;
    }
    
    // Apply search
    if (search) {
      const searchLower = search.toLowerCase();
      return (
        godown.name?.toLowerCase().includes(searchLower) ||
        godown.code?.toLowerCase().includes(searchLower) ||
        godown.address?.toLowerCase().includes(searchLower) ||
        getParentName(godown.parent_id).toLowerCase().includes(searchLower) ||
        false
      );
    }
    
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filteredGodowns.length / pageSize));
  const pagedGodowns = filteredGodowns.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Export functions
  const copyToClipboard = async () => {
    if (copyLoading) return;
    setCopyLoading(true);
    try {
      const allData = await getExportData();
      let filtered = applySearchFilter(allData);
      filtered = applyFilters(filtered);
      
      const headers: string[] = [];
      const rows = filtered.map(godown => {
        const row: string[] = [];

        if (visibleColumns.name) {
          if (!headers.includes("Godown Name")) headers.push("Godown Name");
          row.push(godown.name);
        }

        if (visibleColumns.code) {
          if (!headers.includes("Code")) headers.push("Code");
          row.push(godown.code || "-");
        }

        if (visibleColumns.address) {
          if (!headers.includes("Address")) headers.push("Address");
          row.push(godown.address || "-");
        }

        if (visibleColumns.parent) {
          if (!headers.includes("Parent Location")) headers.push("Parent Location");
          row.push(getParentName(godown.parent_id));
        }

        if (visibleColumns.status) {
          if (!headers.includes("Status")) headers.push("Status");
          row.push(godown.is_active ? "Active" : "Inactive");
        }

        return row;
      });

      const text = [headers.join("\t"), ...rows.map(r => r.join("\t"))].join("\n");
      await navigator.clipboard.writeText(text);
      alert("Godown data copied to clipboard");
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
      
      const exportData = filtered.map(godown => {
        const row: Record<string, any> = {};

        if (visibleColumns.name) {
          row["Godown Name"] = godown.name;
        }

        if (visibleColumns.code) {
          row["Code"] = godown.code || "-";
        }

        if (visibleColumns.address) {
          row["Address"] = godown.address || "-";
        }

        if (visibleColumns.parent) {
          row["Parent Location"] = getParentName(godown.parent_id);
        }

        if (visibleColumns.status) {
          row["Status"] = godown.is_active ? "Active" : "Inactive";
        }

        row["Default"] = godown.is_default ? "Yes" : "No";
        row["Company"] = company?.name || "";
        
        return row;
      });

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Godowns");
      XLSX.writeFile(wb, "godowns.xlsx");
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
      const body = filtered.map(godown => {
        const row: string[] = [];

        if (visibleColumns.name) {
          if (!headers.includes("Godown Name")) headers.push("Godown Name");
          row.push(godown.name);
        }

        if (visibleColumns.code) {
          if (!headers.includes("Code")) headers.push("Code");
          row.push(godown.code || "N/A");
        }

        if (visibleColumns.address) {
          if (!headers.includes("Address")) headers.push("Address");
          row.push(godown.address || "N/A");
        }

        if (visibleColumns.parent) {
          if (!headers.includes("Parent")) headers.push("Parent");
          row.push(getParentName(godown.parent_id));
        }

        if (visibleColumns.status) {
          if (!headers.includes("Status")) headers.push("Status");
          row.push(godown.is_active ? "Active" : "Inactive");
        }

        return row;
      });

      autoTable(doc, {
        ...getProfessionalTableTheme(doc, "Godowns / Warehouses List", company?.name || "", "l"),
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
      doc.save("godowns.pdf");
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
      
      const exportData = filtered.map(godown => {
        const row: Record<string, any> = {};

        if (visibleColumns.name) {
          row["Godown Name"] = godown.name;
        }

        if (visibleColumns.code) {
          row["Code"] = godown.code || "-";
        }

        if (visibleColumns.address) {
          row["Address"] = godown.address || "-";
        }

        if (visibleColumns.parent) {
          row["Parent Location"] = getParentName(godown.parent_id);
        }

        if (visibleColumns.status) {
          row["Status"] = godown.is_active ? "Active" : "Inactive";
        }

        return row;
      });

      const ws = XLSX.utils.json_to_sheet(exportData);
      const csv = XLSX.utils.sheet_to_csv(ws);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      saveAs(blob, "godowns.csv");
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
      setGodownsToPrint(filtered);
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

  if (!company) {
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
          godowns={godownsToPrint}
          visibleColumns={visibleColumns}
          getParentName={getParentName}
          companyName={company?.name || ''}
        />
      )}

      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Godowns / Warehouses
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Manage storage locations for inventory
            </p>
          </div>
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="px-4 py-2 transition bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Add Godown
            </button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="px-6 py-6 bg-gray-50 dark:bg-gray-900">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
          {/* Total Godowns */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {godowns.length.toLocaleString()}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Total Godowns
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
                <Warehouse className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </div>

          {/* Active Godowns */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-green-600">
                  {godowns.filter(g => g.is_active).length}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Active Godowns
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </div>

          {/* Default Godowns */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-blue-600">
                  {godowns.filter(g => g.is_default).length}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Default Godowns
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                <Home className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>

          {/* Top Level Locations */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-orange-600">
                  {godowns.filter(g => !g.parent_id).length}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Top Level Locations
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center">
                <Layers className="w-6 h-6 text-orange-600 dark:text-orange-400" />
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
                placeholder="Search by name, code, address, or parent..."
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
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            {/* Default Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Default Status
              </label>
              <select
                value={defaultFilter}
                onChange={(e) => setDefaultFilter(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="">All</option>
                <option value="default">Default</option>
                <option value="non-default">Non-Default</option>
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

      {/* Add/Edit Form */}
      {showForm && (
        <div className="mx-6 mt-4 mb-6 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
            {editingId ? "Edit Godown" : "Add New Godown"}
          </h2>
          
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Main Warehouse"
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Code</label>
                <input
                  type="text"
                  name="code"
                  value={formData.code}
                  onChange={handleChange}
                  placeholder="WH-001"
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Address</label>
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  rows={2}
                  placeholder="Complete address of the godown"
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Parent Location</label>
                <select
                  name="parent_id"
                  value={formData.parent_id}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="">None (Top Level)</option>
                  {godowns
                    .filter((g) => !editingId || g.id !== editingId)
                    .map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                </select>
              </div>
              <div className="flex items-center">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="is_default"
                    checked={formData.is_default}
                    onChange={handleChange}
                    className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Set as default godown</span>
                </label>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-4">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={formLoading}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {formLoading ? "Saving..." : editingId ? "Update Godown" : "Create Godown"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-white dark:bg-gray-800 p-6 shadow-xl">
            <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">Delete Godown</h3>
            <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
              Are you sure you want to delete this godown? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead className="bg-gray-200 dark:bg-gray-700/50">
              <tr className="text-sm font-semibold text-gray-600 dark:text-gray-300">
                {visibleColumns.sNo && (
                  <th className="text-left px-3 py-3 w-[60px]">
                    S.No
                  </th>
                )}
                {visibleColumns.name && (
                  <th className="text-left px-3 py-3">
                    Godown Name
                  </th>
                )}
                {visibleColumns.code && (
                  <th className="text-left px-3 py-3 w-[100px]">
                    Code
                  </th>
                )}
                {visibleColumns.address && (
                  <th className="text-left px-3 py-3">
                    Address
                  </th>
                )}
                {visibleColumns.parent && (
                  <th className="text-left px-3 py-3 w-[150px]">
                    Parent Location
                  </th>
                )}
                {visibleColumns.status && (
                  <th className="w-[96px] min-w-[96px] max-w-[96px] text-left px-2 py-3">
                    Status
                  </th>
                )}
                {visibleColumns.actions && (
                  <th className="w-[52px] min-w-[52px] max-w-[52px] text-center px-1 py-3">
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
              ) : filteredGodowns.length === 0 ? (
                <tr>
                  <td colSpan={Object.values(visibleColumns).filter(Boolean).length} className="px-6 py-8 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <Warehouse className="w-12 h-12 text-gray-400 mb-2" />
                      <p className="text-lg font-medium text-gray-900 dark:text-white mb-1">
                        No godowns found
                      </p>
                      <p className="text-gray-500 dark:text-gray-400 mb-4">
                        {statusFilter || search || defaultFilter ?
                          "No godowns found matching your filters. Try adjusting your search criteria." :
                          "Add your first godown to start managing inventory locations."}
                      </p>
                      <button
                        onClick={() => setShowForm(true)}
                        className="text-indigo-600 hover:underline dark:text-indigo-400"
                      >
                        Add your first godown
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                pagedGodowns.map((godown, index) => (
                  <tr
                    key={godown.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    {visibleColumns.sNo && (
                      <td className="px-3 py-4 align-top text-gray-700 dark:text-gray-300">
                        {(currentPage - 1) * pageSize + index + 1}
                      </td>
                    )}
                    {visibleColumns.name && (
                      <td className="px-3 py-4 align-top">
                        <div className="min-w-0 max-w-[240px]">
                          <div className="font-medium text-gray-900 dark:text-white truncate flex items-center gap-2">
                            <Warehouse className="w-4 h-4 text-gray-400 flex-shrink-0" />
                            <span className="truncate">{godown.name}</span>
                          </div>
                          {godown.is_default && (
                            <span className="inline-flex mt-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                              Default
                            </span>
                          )}
                        </div>
                      </td>
                    )}
                    {visibleColumns.code && (
                      <td className="px-3 py-4 align-top">
                        <div className="flex items-center gap-2">
                          <Hash className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          <span>{godown.code || '-'}</span>
                        </div>
                      </td>
                    )}
                    {visibleColumns.address && (
                      <td className="px-3 py-4 align-top">
                        <div className="flex items-start gap-2">
                          <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                          <span className="line-clamp-2">{godown.address || '-'}</span>
                        </div>
                      </td>
                    )}
                    {visibleColumns.parent && (
                      <td className="px-3 py-4 align-top">
                        <div className="flex items-center gap-2">
                          <Layers className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          <span>{getParentName(godown.parent_id)}</span>
                        </div>
                      </td>
                    )}
                    {visibleColumns.status && (
                      <td className="w-[96px] min-w-[96px] max-w-[96px] px-2 py-4 align-top">
                        <span
                          className={`inline-flex whitespace-nowrap px-2 py-0.5 rounded-full text-xs font-medium ${
                            godown.is_active
                              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                              : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
                          }`}
                        >
                          {godown.is_active ? <CheckCircle className="w-3 h-3 mr-1" /> : <XCircle className="w-3 h-3 mr-1" />}
                          {godown.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                    )}
                    {visibleColumns.actions && (
                      <td className="w-[52px] min-w-[52px] max-w-[52px] px-1 py-4 text-center align-top">
                        <div className="relative action-dropdown-container inline-flex justify-center w-full">
                          <button
                            onClick={() =>
                              setActiveActionMenu(
                                activeActionMenu === godown.id ? null : godown.id
                              )
                            }
                            className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-50 dark:hover:text-gray-300 dark:hover:bg-gray-700/50 transition-all duration-200"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>

                          {activeActionMenu === godown.id && (
                            <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg shadow-xl py-1 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                              <button
                                onClick={() => {
                                  handleEdit(godown);
                                  setActiveActionMenu(null);
                                }}
                                className="flex w-full items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                              >
                                <Edit className="w-4 h-4 text-gray-400" />
                                <span>Edit</span>
                              </button>

                              <div className="my-1 border-t border-gray-100 dark:border-gray-700"></div>
                              <button
                                onClick={() => {
                                  setDeleteConfirm(godown.id);
                                  setActiveActionMenu(null);
                                }}
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
      {!loading && filteredGodowns.length > 0 && (
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 mt-4">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, filteredGodowns.length)} of {filteredGodowns.length} godowns
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