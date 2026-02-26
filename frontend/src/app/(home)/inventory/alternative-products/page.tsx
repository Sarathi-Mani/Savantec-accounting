"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import {
  alternativeProductsApi,
  AlternativeProduct,
} from "@/services/api";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { saveAs } from "file-saver";
import { addPdfPageNumbers, getProfessionalTableTheme } from "@/utils/pdfTheme";
import {
  Search,
  Filter,
  Plus,
  Package,
  Building2,
  Tag,
  Layers,
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
  DollarSign,
  Grid,
  List,
} from "lucide-react";

// Print component for alternative products
const PrintView = ({
  products,
  visibleColumns,
  formatCurrency,
  onComplete,
}: {
  products: AlternativeProduct[];
  visibleColumns: Record<string, boolean>;
  formatCurrency: (value: number | null | undefined) => string;
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
            Alternative Products List
          </h1>
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
              {visibleColumns.name && (
                <th style={{ padding: '12px', textAlign: 'left', borderRight: '1px solid #ddd', fontWeight: 'bold' }}>
                  Product Name
                </th>
              )}
              {visibleColumns.manufacturer && (
                <th style={{ padding: '12px', textAlign: 'left', borderRight: '1px solid #ddd', fontWeight: 'bold' }}>
                  Manufacturer
                </th>
              )}
              {visibleColumns.model && (
                <th style={{ padding: '12px', textAlign: 'left', borderRight: '1px solid #ddd', fontWeight: 'bold' }}>
                  Model
                </th>
              )}
              {visibleColumns.category && (
                <th style={{ padding: '12px', textAlign: 'left', borderRight: '1px solid #ddd', fontWeight: 'bold' }}>
                  Category
                </th>
              )}
              {visibleColumns.mappedProducts && (
                <th style={{ padding: '12px', textAlign: 'center', borderRight: '1px solid #ddd', fontWeight: 'bold' }}>
                  Mapped
                </th>
              )}
              {visibleColumns.referencePrice && (
                <th style={{ padding: '12px', textAlign: 'right', borderRight: '1px solid #ddd', fontWeight: 'bold' }}>
                  Ref. Price
                </th>
              )}
              {visibleColumns.status && (
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>
                  Status
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {products.map((product, index) => (
              <tr key={product.id} style={{
                borderBottom: '1px solid #ddd',
                backgroundColor: index % 2 === 0 ? '#fff' : '#f9f9f9'
              }}>
                {visibleColumns.name && (
                  <td style={{ padding: '12px', borderRight: '1px solid #ddd' }}>
                    {product.name}
                  </td>
                )}
                {visibleColumns.manufacturer && (
                  <td style={{ padding: '12px', borderRight: '1px solid #ddd' }}>
                    {product.manufacturer || '-'}
                  </td>
                )}
                {visibleColumns.model && (
                  <td style={{ padding: '12px', borderRight: '1px solid #ddd' }}>
                    {product.model_number || '-'}
                  </td>
                )}
                {visibleColumns.category && (
                  <td style={{ padding: '12px', borderRight: '1px solid #ddd' }}>
                    {product.category || '-'}
                  </td>
                )}
                {visibleColumns.mappedProducts && (
                  <td style={{ padding: '12px', textAlign: 'center', borderRight: '1px solid #ddd' }}>
                    <span style={{
                      display: 'inline-block',
                      width: '24px',
                      height: '24px',
                      lineHeight: '24px',
                      borderRadius: '12px',
                      backgroundColor: '#10b98120',
                      color: '#10b981',
                      fontSize: '12px',
                      fontWeight: 'bold'
                    }}>
                      {product.mapped_products_count || 0}
                    </span>
                  </td>
                )}
                {visibleColumns.referencePrice && (
                  <td style={{ padding: '12px', textAlign: 'right', borderRight: '1px solid #ddd' }}>
                    {formatCurrency(product.reference_price)}
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
                      backgroundColor: product.is_active ? '#d1fae5' : '#fee2e2',
                      color: product.is_active ? '#065f46' : '#991b1b'
                    }}>
                      {product.is_active ? 'Active' : 'Inactive'}
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
            Total Products: {products.length}
          </div>
        </div>
      </div>
    </div>
  );
};

// Format currency
const formatCurrency = (value: number | null | undefined): string => {
  if (!value) return '-';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

export default function AlternativeProductsPage() {
  const [products, setProducts] = useState<AlternativeProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filters state
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [manufacturerFilter, setManufacturerFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  
  // Filter options
  const [categories, setCategories] = useState<string[]>([]);
  const [manufacturers, setManufacturers] = useState<string[]>([]);
  
  // UI state
  const [showFilters, setShowFilters] = useState(false);
  const [showColumnDropdown, setShowColumnDropdown] = useState(false);
  const [activeActionMenu, setActiveActionMenu] = useState<string | null>(null);
  const [showPrintView, setShowPrintView] = useState(false);
  const [productsToPrint, setProductsToPrint] = useState<AlternativeProduct[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 10;
  
  // Export loading states
  const [copyLoading, setCopyLoading] = useState(false);
  const [excelLoading, setExcelLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [csvLoading, setCsvLoading] = useState(false);
  const [printLoading, setPrintLoading] = useState(false);
  
  const [cachedExportData, setCachedExportData] = useState<AlternativeProduct[] | null>(null);
  
  // Column visibility
  const [visibleColumns, setVisibleColumns] = useState({
    name: true,
    manufacturer: true,
    model: true,
    category: true,
    mappedProducts: true,
    referencePrice: true,
    status: true,
    actions: true,
  });

  const companyId =
    typeof window !== "undefined" ? localStorage.getItem("company_id") : null;

  useEffect(() => {
    if (companyId) {
      fetchProducts();
      fetchFilters();
    }
  }, [companyId]);

  useEffect(() => {
    if (companyId) {
      fetchProducts();
      setCachedExportData(null);
    }
  }, [categoryFilter, manufacturerFilter, statusFilter, search, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [categoryFilter, manufacturerFilter, statusFilter, search]);

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

  const fetchProducts = async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const isActiveFilter =
        statusFilter === "" ? undefined : statusFilter === "true";
      const data = await alternativeProductsApi.list(companyId, {
        page: currentPage,
        page_size: pageSize,
        search: search || undefined,
        category: categoryFilter || undefined,
        manufacturer: manufacturerFilter || undefined,
        is_active: isActiveFilter,
      });
      setProducts(data.alternative_products);
      setTotal(data.total);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to fetch alternative products");
    } finally {
      setLoading(false);
    }
  };

  const fetchFilters = async () => {
    if (!companyId) return;
    try {
      const [cats, mfrs] = await Promise.all([
        alternativeProductsApi.getCategories(companyId),
        alternativeProductsApi.getManufacturers(companyId),
      ]);
      setCategories(cats);
      setManufacturers(mfrs);
    } catch (err) {
      console.error("Failed to fetch filters:", err);
    }
  };

  const fetchAllProductsForExport = useCallback(async (): Promise<AlternativeProduct[]> => {
    try {
      if (!companyId) return [];
      const isActiveFilter =
        statusFilter === "" ? undefined : statusFilter === "true";

      // Fetch all pages for export
      let allProducts: AlternativeProduct[] = [];
      let page = 1;
      const pageSize = 100; // Larger page size for export

      while (true) {
        const data = await alternativeProductsApi.list(companyId, {
          page,
          page_size: pageSize,
          search: search || undefined,
          category: categoryFilter || undefined,
          manufacturer: manufacturerFilter || undefined,
          is_active: isActiveFilter,
        });
        
        allProducts = [...allProducts, ...data.alternative_products];
        
        if (data.alternative_products.length < pageSize) {
          break;
        }
        page++;
      }

      setCachedExportData(allProducts);
      return allProducts;
    } catch (error) {
      console.error("Export fetch failed:", error);
      return [];
    }
  }, [companyId, search, categoryFilter, manufacturerFilter, statusFilter]);

  const getExportData = async (): Promise<AlternativeProduct[]> => {
    if (cachedExportData) return cachedExportData;
    return await fetchAllProductsForExport();
  };

  const handleReset = () => {
    setSearch("");
    setCategoryFilter("");
    setManufacturerFilter("");
    setStatusFilter("");
    fetchProducts();
  };

  // Export functions
  const copyToClipboard = async () => {
    if (copyLoading) return;
    setCopyLoading(true);
    try {
      const allData = await getExportData();
      
      const headers: string[] = [];
      const rows = allData.map(product => {
        const row: string[] = [];

        if (visibleColumns.name) {
          if (!headers.includes("Product Name")) headers.push("Product Name");
          row.push(product.name);
        }

        if (visibleColumns.manufacturer) {
          if (!headers.includes("Manufacturer")) headers.push("Manufacturer");
          row.push(product.manufacturer || "-");
        }

        if (visibleColumns.model) {
          if (!headers.includes("Model")) headers.push("Model");
          row.push(product.model_number || "-");
        }

        if (visibleColumns.category) {
          if (!headers.includes("Category")) headers.push("Category");
          row.push(product.category || "-");
        }

        if (visibleColumns.mappedProducts) {
          if (!headers.includes("Mapped Products")) headers.push("Mapped Products");
          row.push(String(product.mapped_products_count || 0));
        }

        if (visibleColumns.referencePrice) {
          if (!headers.includes("Reference Price")) headers.push("Reference Price");
          row.push(product.reference_price ? `₹${product.reference_price}` : "-");
        }

        if (visibleColumns.status) {
          if (!headers.includes("Status")) headers.push("Status");
          row.push(product.is_active ? "Active" : "Inactive");
        }

        return row;
      });

      const text = [headers.join("\t"), ...rows.map(r => r.join("\t"))].join("\n");
      await navigator.clipboard.writeText(text);
      alert("Product data copied to clipboard");
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
      
      const exportData = allData.map(product => {
        const row: Record<string, any> = {};

        if (visibleColumns.name) {
          row["Product Name"] = product.name;
        }

        if (visibleColumns.manufacturer) {
          row["Manufacturer"] = product.manufacturer || "";
        }

        if (visibleColumns.model) {
          row["Model Number"] = product.model_number || "";
        }

        if (visibleColumns.category) {
          row["Category"] = product.category || "";
        }

        if (visibleColumns.mappedProducts) {
          row["Mapped Products Count"] = product.mapped_products_count || 0;
        }

        if (visibleColumns.referencePrice) {
          row["Reference Price"] = product.reference_price || "";
        }

        if (visibleColumns.status) {
          row["Status"] = product.is_active ? "Active" : "Inactive";
        }

        row["Description"] = product.description || "";
        
        return row;
      });

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Alternative Products");
      XLSX.writeFile(wb, "alternative_products.xlsx");
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
      const body = allData.map(product => {
        const row: string[] = [];

        if (visibleColumns.name) {
          if (!headers.includes("Product Name")) headers.push("Product Name");
          row.push(product.name);
        }

        if (visibleColumns.manufacturer) {
          if (!headers.includes("Manufacturer")) headers.push("Manufacturer");
          row.push(product.manufacturer || "N/A");
        }

        if (visibleColumns.model) {
          if (!headers.includes("Model")) headers.push("Model");
          row.push(product.model_number || "N/A");
        }

        if (visibleColumns.category) {
          if (!headers.includes("Category")) headers.push("Category");
          row.push(product.category || "N/A");
        }

        if (visibleColumns.mappedProducts) {
          if (!headers.includes("Mapped")) headers.push("Mapped");
          row.push(String(product.mapped_products_count || 0));
        }

        if (visibleColumns.referencePrice) {
          if (!headers.includes("Ref. Price")) headers.push("Ref. Price");
          row.push(product.reference_price ? `₹${product.reference_price}` : "N/A");
        }

        if (visibleColumns.status) {
          if (!headers.includes("Status")) headers.push("Status");
          row.push(product.is_active ? "Active" : "Inactive");
        }

        return row;
      });

      autoTable(doc, {
        ...getProfessionalTableTheme(doc, "Alternative Products List", "", "l"),
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
      doc.save("alternative_products.pdf");
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
      
      const exportData = allData.map(product => {
        const row: Record<string, any> = {};

        if (visibleColumns.name) {
          row["Product Name"] = product.name;
        }

        if (visibleColumns.manufacturer) {
          row["Manufacturer"] = product.manufacturer || "";
        }

        if (visibleColumns.model) {
          row["Model Number"] = product.model_number || "";
        }

        if (visibleColumns.category) {
          row["Category"] = product.category || "";
        }

        if (visibleColumns.mappedProducts) {
          row["Mapped Products Count"] = product.mapped_products_count || 0;
        }

        if (visibleColumns.referencePrice) {
          row["Reference Price"] = product.reference_price || "";
        }

        if (visibleColumns.status) {
          row["Status"] = product.is_active ? "Active" : "Inactive";
        }

        return row;
      });

      const ws = XLSX.utils.json_to_sheet(exportData);
      const csv = XLSX.utils.sheet_to_csv(ws);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      saveAs(blob, "alternative_products.csv");
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
      setProductsToPrint(allData);
      setShowPrintView(true);
    } catch (error) {
      console.error("Print failed:", error);
      alert("Failed to prepare print view. Please try again.");
    } finally {
      setPrintLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!companyId) return;
    if (!confirm("Are you sure you want to delete this alternative product? This action cannot be undone.")) return;
    try {
      await alternativeProductsApi.delete(companyId, id);
      fetchProducts();
      setCachedExportData(null);
    } catch (err: any) {
      alert(err.message || "Failed to delete product");
    }
  };

  const toggleColumn = (key: keyof typeof visibleColumns) => {
    setVisibleColumns(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  if (!companyId) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 dark:bg-yellow-900/20 dark:border-yellow-800">
          <p className="text-yellow-800 dark:text-yellow-400">Please select a company first.</p>
        </div>
      </div>
    );
  }

  // Calculate summary stats
  const activeProducts = products.filter(p => p.is_active).length;
  const totalMappedProducts = products.reduce((sum, p) => sum + (p.mapped_products_count || 0), 0);
  const uniqueCategories = new Set(products.map(p => p.category).filter(Boolean)).size;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {showPrintView && (
        <PrintView
          onComplete={() => setShowPrintView(false)}
          products={productsToPrint}
          visibleColumns={visibleColumns}
          formatCurrency={formatCurrency}
        />
      )}

      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Alternative Products
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Manage competitor products and map them to your products
            </p>
          </div>
          <Link
            href="/inventory/alternative-products/new"
            className="px-4 py-2 transition bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Add Alternative
          </Link>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="px-6 py-6 bg-gray-50 dark:bg-gray-900">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
          {/* Total Products */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {total.toLocaleString()}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Total Products
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-emerald-100 dark:bg-emerald-900/20 flex items-center justify-center">
                <Package className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
          </div>

          {/* Active Products */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-green-600">
                  {activeProducts}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Active Products
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                <Layers className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </div>

          {/* Categories */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {uniqueCategories}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Categories
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
                <Grid className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </div>

          {/* Manufacturers */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {manufacturers.length}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Manufacturers
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                <Building2 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
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
                placeholder="Search by name, manufacturer, model..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && fetchProducts()}
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
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
                        className="rounded border-gray-300 dark:border-gray-600 text-emerald-600 focus:ring-emerald-500"
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
            {/* Category Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Category
              </label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              >
                <option value="">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Manufacturer Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Manufacturer
              </label>
              <select
                value={manufacturerFilter}
                onChange={(e) => setManufacturerFilter(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              >
                <option value="">All Manufacturers</option>
                {manufacturers.map((mfr) => (
                  <option key={mfr} value={mfr}>
                    {mfr}
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
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              >
                <option value="">All Status</option>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Error State */}
      {error && (
        <div className="mx-6 mt-4 bg-red-50 border border-red-200 rounded-lg p-4 dark:bg-red-900/20 dark:border-red-800">
          <p className="text-red-800 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Table */}
      {/* <div className="p-6"> */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-200 dark:bg-gray-700/50">
                <tr className="text-sm font-semibold text-gray-600 dark:text-gray-300">
                  <th className="text-left px-4 py-3 w-[50px]">
                    S.No
                  </th>
                  {visibleColumns.name && (
                    <th className="text-left px-4 py-3">
                      Product Name
                    </th>
                  )}
                  {visibleColumns.manufacturer && (
                    <th className="text-left px-4 py-3">
                      Manufacturer
                    </th>
                  )}
                  {visibleColumns.model && (
                    <th className="text-left px-4 py-3">
                      Model
                    </th>
                  )}
                  {visibleColumns.category && (
                    <th className="text-left px-4 py-3">
                      Category
                    </th>
                  )}
                  {visibleColumns.mappedProducts && (
                    <th className="text-center px-4 py-3 w-[100px]">
                      Mapped
                    </th>
                  )}
                  {visibleColumns.referencePrice && (
                    <th className="text-right px-4 py-3 w-[120px]">
                      Ref. Price
                    </th>
                  )}
                  {visibleColumns.status && (
                    <th className="text-left px-4 py-3 w-[100px]">
                      Status
                    </th>
                  )}
                  {visibleColumns.actions && (
                    <th className="text-center px-4 py-3 w-[120px]">
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
                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent"></div>
                      </div>
                    </td>
                  </tr>
                ) : products.length === 0 ? (
                  <tr>
                    <td colSpan={Object.values(visibleColumns).filter(Boolean).length + 1} className="px-6 py-8 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <Package className="w-12 h-12 text-gray-400 mb-2" />
                        <p className="text-lg font-medium text-gray-900 dark:text-white mb-1">
                          No alternative products found
                        </p>
                        <p className="text-gray-500 dark:text-gray-400 mb-4">
                          {categoryFilter || manufacturerFilter || statusFilter || search ?
                            "No products found matching your filters. Try adjusting your search criteria." :
                            "Add your first alternative product to start managing competitor products."}
                        </p>
                        <Link
                          href="/inventory/alternative-products/new"
                          className="text-emerald-600 hover:underline dark:text-emerald-400"
                        >
                          Add your first product
                        </Link>
                      </div>
                    </td>
                  </tr>
                ) : (
                  products.map((product, index) => (
                    <tr
                      key={product.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <td className="px-4 py-4 align-top text-gray-700 dark:text-gray-300">
                        {(currentPage - 1) * pageSize + index + 1}
                      </td>
                      {visibleColumns.name && (
                        <td className="px-4 py-4 align-top">
                          <Link
                            href={`/inventory/alternative-products/${product.id}`}
                            className="font-medium text-emerald-600 dark:text-emerald-400 hover:underline"
                          >
                            {product.name}
                          </Link>
                        </td>
                      )}
                      {visibleColumns.manufacturer && (
                        <td className="px-4 py-4 align-top">
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-gray-400" />
                            {product.manufacturer || '-'}
                          </div>
                        </td>
                      )}
                      {visibleColumns.model && (
                        <td className="px-4 py-4 align-top">
                          {product.model_number || '-'}
                        </td>
                      )}
                      {visibleColumns.category && (
                        <td className="px-4 py-4 align-top">
                          {product.category ? (
                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">
                              {product.category}
                            </span>
                          ) : (
                            '-'
                          )}
                        </td>
                      )}
                      {visibleColumns.mappedProducts && (
                        <td className="px-4 py-4 text-center align-top">
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-xs font-medium">
                            {product.mapped_products_count || 0}
                          </span>
                        </td>
                      )}
                      {visibleColumns.referencePrice && (
                        <td className="px-4 py-4 text-right align-top font-medium">
                          {formatCurrency(product.reference_price)}
                        </td>
                      )}
                      {visibleColumns.status && (
                        <td className="px-4 py-4 align-top">
                          <span className={`inline-flex whitespace-nowrap px-2 py-0.5 rounded-full text-xs font-medium ${
                            product.is_active
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                          }`}>
                            {product.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                      )}
                      {visibleColumns.actions && (
                        <td className="px-4 py-4 text-center align-top">
                          <div className="relative action-dropdown-container inline-flex justify-center w-full">
                            <button
                              onClick={() =>
                                setActiveActionMenu(
                                  activeActionMenu === product.id ? null : product.id
                                )
                              }
                              className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-50 dark:hover:text-gray-300 dark:hover:bg-gray-700/50 transition-all duration-200"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>

                            {activeActionMenu === product.id && (
                              <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg shadow-xl py-1 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                                <Link
                                  href={`/inventory/alternative-products/${product.id}`}
                                  onClick={() => setActiveActionMenu(null)}
                                  className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                                >
                                  <Eye className="w-4 h-4 text-gray-400" />
                                  <span>View Details</span>
                                </Link>

                                <Link
                                  href={`/inventory/alternative-products/${product.id}/edit`}
                                  onClick={() => setActiveActionMenu(null)}
                                  className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                                >
                                  <Edit className="w-4 h-4 text-gray-400" />
                                  <span>Edit</span>
                                </Link>

                                <div className="my-1 border-t border-gray-100 dark:border-gray-700"></div>
                                <button
                                  onClick={() => {
                                    handleDelete(product.id);
                                    setActiveActionMenu(null);
                                  }}
                                  className="flex w-full items-center gap-3 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  <span>Delete Product</span>
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
        {!loading && total > 0 && (
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 mt-4">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, total)} of {total} results
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
    // </div>
  );
}
