"use client";

import { useAuth } from "@/context/AuthContext";
import { categoriesApi, Category, CategoryListResponse } from "@/services/api";
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
  Layers,
  Calendar,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  Printer,
  Copy,
  ChevronDown,
  ChevronUp,
  Download,
  FileText,
  RefreshCw,
  CheckCircle,
} from "lucide-react";

// Print component for categories
const PrintView = ({
  categories,
  visibleColumns,
  formatDate,
  companyName,
}: {
  categories: Category[];
  visibleColumns: Record<string, boolean>;
  formatDate: (dateString?: string) => string;
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
            Categories List
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
              <th style={{
                padding: '12px',
                textAlign: 'left',
                borderRight: '1px solid #ddd',
                fontWeight: 'bold'
              }}>
                S.No
              </th>
              {visibleColumns.name && (
                <th style={{
                  padding: '12px',
                  textAlign: 'left',
                  borderRight: '1px solid #ddd',
                  fontWeight: 'bold'
                }}>
                  Category Name
                </th>
              )}
              {visibleColumns.description && (
                <th style={{
                  padding: '12px',
                  textAlign: 'left',
                  borderRight: '1px solid #ddd',
                  fontWeight: 'bold'
                }}>
                  Description
                </th>
              )}
              {visibleColumns.createdAt && (
                <th style={{
                  padding: '12px',
                  textAlign: 'left',
                  fontWeight: 'bold'
                }}>
                  Created Date
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {categories.map((category, index) => (
              <tr key={category.id} style={{
                borderBottom: '1px solid #ddd',
                backgroundColor: index % 2 === 0 ? '#fff' : '#f9f9f9'
              }}>
                <td style={{
                  padding: '12px',
                  borderRight: '1px solid #ddd'
                }}>
                  {index + 1}
                </td>
                {visibleColumns.name && (
                  <td style={{
                    padding: '12px',
                    borderRight: '1px solid #ddd'
                  }}>
                    {category.name}
                  </td>
                )}
                {visibleColumns.description && (
                  <td style={{
                    padding: '12px',
                    borderRight: '1px solid #ddd'
                  }}>
                    {category.description || '-'}
                  </td>
                )}
                {visibleColumns.createdAt && (
                  <td style={{ padding: '12px' }}>
                    {formatDate(category.created_at)}
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
            Total Categories: {categories.length}
          </div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            Page 1 of 1
          </div>
        </div>
      </div>
    </div>
  );
};

const formatDate = (dateString?: string): string => {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
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

export default function CategoriesPage() {
  const { company } = useAuth();
  const [data, setData] = useState<CategoryListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Filters state
  const [search, setSearch] = useState("");
  
  // UI state
  const [showFilters, setShowFilters] = useState(false);
  const [showColumnDropdown, setShowColumnDropdown] = useState(false);
  const [activeActionMenu, setActiveActionMenu] = useState<string | null>(null);
  const [showPrintView, setShowPrintView] = useState(false);
  const [categoriesToPrint, setCategoriesToPrint] = useState<Category[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  
  // Export loading states
  const [copyLoading, setCopyLoading] = useState(false);
  const [excelLoading, setExcelLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [csvLoading, setCsvLoading] = useState(false);
  const [printLoading, setPrintLoading] = useState(false);
  
  const [cachedExportData, setCachedExportData] = useState<Category[] | null>(null);
  
  // Column visibility
  const [visibleColumns, setVisibleColumns] = useState({
    name: true,
    description: true,
    createdAt: true,
    actions: true,
  });

  useEffect(() => {
    if (company?.id) {
      fetchCategories();
    }
  }, [company?.id, currentPage, search]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

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

  const fetchCategories = async () => {
    try {
      setLoading(true);
      if (!company?.id) {
        setLoading(false);
        return;
      }

      const result = await categoriesApi.list(company.id, {
        page: currentPage,
        page_size: pageSize,
        search: search || undefined,
      });
      setData(result);
      setError("");
    } catch (err) {
      setError("Failed to load categories");
      console.error("Failed to fetch categories:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllCategoriesForExport = useCallback(async (): Promise<Category[]> => {
    try {
      if (!company?.id) return [];

      const pageSize = 100;
      let page = 1;
      let allCategories: Category[] = [];
      while (true) {
        const result = await categoriesApi.list(company.id, {
          page,
          page_size: pageSize,
          search: search || undefined,
        });
        const batch = result?.categories || [];
        allCategories = allCategories.concat(batch);
        if (batch.length < pageSize) break;
        page += 1;
      }
      setCachedExportData(allCategories);
      return allCategories;
    } catch (error) {
      console.error("Export fetch failed:", error);
      return [];
    }
  }, [company?.id, search]);

  const getExportData = async (): Promise<Category[]> => {
    if (cachedExportData) return cachedExportData;
    return await fetchAllCategoriesForExport();
  };

  const handleDelete = async (categoryId: string) => {
    if (!company?.id || !confirm("Are you sure you want to delete this category?")) return;
    try {
      await categoriesApi.delete(company.id, categoryId);
      fetchCategories();
      setCachedExportData(null);
    } catch (error) {
      console.error("Failed to delete category:", error);
      alert("Failed to delete category. Please try again.");
    }
  };

  const copyToClipboard = async () => {
    if (copyLoading) return;
    setCopyLoading(true);
    try {
      const allData = await getExportData();
      
      const headers: string[] = [];
      const rows = allData.map((category, index) => {
        const row: string[] = [];

        if (!headers.includes("S.No")) headers.push("S.No");
        row.push((index + 1).toString());

        if (visibleColumns.name) {
          if (!headers.includes("Category Name")) headers.push("Category Name");
          row.push(category.name);
        }

        if (visibleColumns.description) {
          if (!headers.includes("Description")) headers.push("Description");
          row.push(category.description || "-");
        }

        if (visibleColumns.createdAt) {
          if (!headers.includes("Created Date")) headers.push("Created Date");
          row.push(formatDate(category.created_at));
        }

        return row;
      });

      const text = [headers.join("\t"), ...rows.map(r => r.join("\t"))].join("\n");
      await navigator.clipboard.writeText(text);
      alert("Category data copied to clipboard");
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
      
      const exportData = allData.map((category, index) => {
        const row: Record<string, any> = {};

        row["S.No"] = index + 1;

        if (visibleColumns.name) {
          row["Category Name"] = category.name;
        }

        if (visibleColumns.description) {
          row["Description"] = category.description || "-";
        }

        if (visibleColumns.createdAt) {
          row["Created Date"] = formatDate(category.created_at);
        }

        row["Company"] = company?.name || "";
        
        return row;
      });

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Categories");
      XLSX.writeFile(wb, "categories.xlsx");
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
      
      const doc = new jsPDF("landscape");
      
      const headers: string[] = [];
      const body = allData.map((category, index) => {
        const row: string[] = [];

        if (!headers.includes("S.No")) headers.push("S.No");
        row.push((index + 1).toString());

        if (visibleColumns.name) {
          if (!headers.includes("Category Name")) headers.push("Category Name");
          row.push(category.name);
        }

        if (visibleColumns.description) {
          if (!headers.includes("Description")) headers.push("Description");
          row.push(category.description || "-");
        }

        if (visibleColumns.createdAt) {
          if (!headers.includes("Created Date")) headers.push("Created Date");
          row.push(formatDate(category.created_at));
        }

        return row;
      });

      autoTable(doc, {
        ...getProfessionalTableTheme(doc, "Categories List", company?.name || "", "l"),
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
      doc.save("categories.pdf");
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
      
      const exportData = allData.map((category, index) => {
        const row: Record<string, any> = {};

        row["S.No"] = index + 1;

        if (visibleColumns.name) {
          row["Category Name"] = category.name;
        }

        if (visibleColumns.description) {
          row["Description"] = category.description || "-";
        }

        if (visibleColumns.createdAt) {
          row["Created Date"] = formatDate(category.created_at);
        }

        return row;
      });

      const ws = XLSX.utils.json_to_sheet(exportData);
      const csv = XLSX.utils.sheet_to_csv(ws);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      saveAs(blob, "categories.csv");
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
      setCategoriesToPrint(allData);
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

  const handleReset = () => {
    setSearch("");
    setCurrentPage(1);
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

  const totalPages = data ? Math.ceil(data.total / pageSize) : 0;

  return (
    <div className="w-full">
      {showPrintView && (
        <PrintView
          categories={categoriesToPrint}
          visibleColumns={visibleColumns}
          formatDate={formatDate}
          companyName={company?.name || ''}
        />
      )}

      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Categories
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Manage your product categories
            </p>
          </div>
          <button
            onClick={() => window.location.href = '/products/categories/new'}
            className="px-4 py-2 transition bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Add Category
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
                placeholder="Search categories..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && setCurrentPage(1)}
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
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
              Additional filters can be added here as needed
            </p>
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
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 overflow-visible">
        <div className="overflow-x-auto overflow-y-visible">
          <table className="w-full">
            <thead className="bg-gray-200 dark:bg-gray-700/50">
              <tr className="text-sm font-semibold text-gray-600 dark:text-gray-300">
                <th className="text-left px-6 py-3 whitespace-nowrap w-20">
                  S.No
                </th>
                {visibleColumns.name && (
                  <th className="text-left px-6 py-3 whitespace-nowrap w-64">
                    Category Name
                  </th>
                )}
                {visibleColumns.description && (
                  <th className="text-left px-6 py-3 whitespace-nowrap w-96">
                    Description
                  </th>
                )}
                {visibleColumns.createdAt && (
                  <th className="text-left px-6 py-3 whitespace-nowrap w-40">
                    Created Date
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
                  <td colSpan={Object.values(visibleColumns).filter(Boolean).length + 1} className="px-6 py-8 text-center">
                    <div className="flex items-center justify-center">
                      <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
                    </div>
                  </td>
                </tr>
              ) : !data?.categories || data.categories.length === 0 ? (
                <tr>
                  <td colSpan={Object.values(visibleColumns).filter(Boolean).length + 1} className="px-6 py-8 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <Layers className="w-12 h-12 text-gray-400 mb-2" />
                      <p className="text-lg font-medium text-gray-900 dark:text-white mb-1">
                        No categories found
                      </p>
                      <p className="text-gray-500 dark:text-gray-400 mb-4">
                        {search ?
                          "No categories found matching your search. Try adjusting your search criteria." :
                          "Add your first category to start managing your product catalog."}
                      </p>
                      <button
                        onClick={() => window.location.href = '/products/categories/new'}
                        className="text-indigo-600 hover:underline dark:text-indigo-400"
                      >
                        Add your first category
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                data.categories.map((category, index) => {
                  return (
                    <tr
                      key={category.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-gray-700 dark:text-gray-300">
                        {(currentPage - 1) * pageSize + index + 1}
                      </td>
                      {visibleColumns.name && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center flex-shrink-0">
                              <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                                {category.name.charAt(0)}
                              </span>
                            </div>
                            <div className="font-medium text-gray-900 dark:text-white">
                              {category.name}
                            </div>
                          </div>
                        </td>
                      )}
                      {visibleColumns.description && (
                        <td className="px-6 py-4">
                          <div className="min-w-0 max-w-[320px]">
                            <p className="text-gray-700 dark:text-gray-300 line-clamp-2">
                              {category.description || '-'}
                            </p>
                          </div>
                        </td>
                      )}
                      {visibleColumns.createdAt && (
                        <td className="px-6 py-4 whitespace-nowrap text-gray-700 dark:text-gray-300">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            {formatDate(category.created_at)}
                          </div>
                        </td>
                      )}
                      {visibleColumns.actions && (
                        <td className="px-6 py-4 text-right whitespace-nowrap">
                          <div className="relative action-dropdown-container inline-block">
                            <button
                              onClick={() =>
                                setActiveActionMenu(
                                  activeActionMenu === category.id ? null : category.id
                                )
                              }
                              className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-50 dark:hover:text-gray-300 dark:hover:bg-gray-700/50 transition-all duration-200"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>

                            {activeActionMenu === category.id && (
                              <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg shadow-xl py-1 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                                <Link
                                  href={`/products/categories/${category.id}`}
                                  onClick={() => setActiveActionMenu(null)}
                                  className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                                >
                                  <Eye className="w-4 h-4 text-gray-400" />
                                  <span>View Details</span>
                                </Link>

                                <Link
                                  href={`/products/categories/${category.id}/edit`}
                                  onClick={() => setActiveActionMenu(null)}
                                  className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                                >
                                  <Edit className="w-4 h-4 text-gray-400" />
                                  <span>Edit</span>
                                </Link>

                                <div className="my-1 border-t border-gray-100 dark:border-gray-700"></div>
                                <button
                                  onClick={() => {
                                    if (confirm(`Are you sure you want to delete category ${category.name}?`)) {
                                      handleDelete(category.id);
                                      setActiveActionMenu(null);
                                    }
                                  }}
                                  className="flex w-full items-center gap-3 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  <span>Delete Category</span>
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

      {!loading && data && data.total > 0 && (
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, data.total)} of {data.total}
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
