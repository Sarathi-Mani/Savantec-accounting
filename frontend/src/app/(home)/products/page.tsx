"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { inventoryApi, productsApi, Product, ProductListResponse, Godown } from "@/services/api";
import { useEffect, useState, useRef, useCallback } from "react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { saveAs } from "file-saver";
import { addPdfPageNumbers, getProfessionalTableTheme } from "@/utils/pdfTheme";
import Link from "next/link";
import {
  Search,
  Filter,
  Plus,
  Package,
  Tag,
  Building,
  Percent,
  Hash,
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
  Download,
  FileText,
  RefreshCw,
  Box,
  DollarSign,
  Layers,
} from "lucide-react";

type ProductWithMeta = Product & {
  brand?: { name?: string };
  category?: { name?: string };
  current_stock?: number | null;
  unit_price?: number | string;
  gst_rate?: number | string;
  company_id?: string;
  godown_id?: string | null;
  godown_name?: string | null;
};

const toNumber = (value: number | string | undefined | null, fallback = 0) => {
  if (value === undefined || value === null) return fallback;
  const num = typeof value === "number" ? value : parseFloat(value);
  return Number.isFinite(num) ? num : fallback;
};

const getBrandName = (product: ProductWithMeta) => product.brand?.name || "-";
const getCategoryName = (product: ProductWithMeta) => product.category?.name || "-";
const getStoreName = (product: ProductWithMeta, companyName?: string) => {
  if (!product.godown_id) return companyName || "-";
  return product.godown_name || product.godown_id;
};

// Print component for products
const PrintView = ({
  products,
  visibleColumns,
  formatCurrency,
  companyName,
}: {
  products: ProductWithMeta[];
  visibleColumns: Record<string, boolean>;
  formatCurrency: (amount: number) => string;
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
            Products List
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
                  Product Name
                </th>
              )}
              {visibleColumns.brand && (
                <th style={{
                  padding: '12px',
                  textAlign: 'left',
                  borderRight: '1px solid #ddd',
                  fontWeight: 'bold'
                }}>
                  Brand
                </th>
              )}
              {visibleColumns.category && (
                <th style={{
                  padding: '12px',
                  textAlign: 'left',
                  borderRight: '1px solid #ddd',
                  fontWeight: 'bold'
                }}>
                  Category
                </th>
              )}
              {visibleColumns.store && (
                <th style={{
                  padding: '12px',
                  textAlign: 'left',
                  borderRight: '1px solid #ddd',
                  fontWeight: 'bold'
                }}>
                  Store Name
                </th>
              )}
              {visibleColumns.hsn && (
                <th style={{
                  padding: '12px',
                  textAlign: 'left',
                  borderRight: '1px solid #ddd',
                  fontWeight: 'bold'
                }}>
                  HSN/SAC
                </th>
              )}
              {visibleColumns.type && (
                <th style={{
                  padding: '12px',
                  textAlign: 'left',
                  borderRight: '1px solid #ddd',
                  fontWeight: 'bold'
                }}>
                  Type
                </th>
              )}
              {visibleColumns.price && (
                <th style={{
                  padding: '12px',
                  textAlign: 'left',
                  borderRight: '1px solid #ddd',
                  fontWeight: 'bold'
                }}>
                  Price
                </th>
              )}
              {visibleColumns.gst && (
                <th style={{
                  padding: '12px',
                  textAlign: 'left',
                  borderRight: '1px solid #ddd',
                  fontWeight: 'bold'
                }}>
                  GST %
                </th>
              )}
              {visibleColumns.stock && (
                <th style={{
                  padding: '12px',
                  textAlign: 'left',
                  fontWeight: 'bold'
                }}>
                  Stock
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
                    <div>
                      <strong>{product.name}</strong>
                      {product.description && (
                        <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                          {product.description}
                        </div>
                      )}
                      {product.sku && (
                        <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>
                          SKU: {product.sku}
                        </div>
                      )}
                    </div>
                  </td>
                )}
                {visibleColumns.brand && (
                  <td style={{
                    padding: '12px',
                    borderRight: '1px solid #ddd'
                  }}>
                    {getBrandName(product)}
                  </td>
                )}
                {visibleColumns.category && (
                  <td style={{
                    padding: '12px',
                    borderRight: '1px solid #ddd'
                  }}>
                    {getCategoryName(product)}
                  </td>
                )}
                {visibleColumns.store && (
                  <td style={{
                    padding: '12px',
                    borderRight: '1px solid #ddd'
                  }}>
                    {getStoreName(product, companyName)}
                  </td>
                )}
                {visibleColumns.hsn && (
                  <td style={{
                    padding: '12px',
                    borderRight: '1px solid #ddd'
                  }}>
                    {product.hsn_code || '-'}
                  </td>
                )}
                {visibleColumns.type && (
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
                      backgroundColor: product.is_service ? '#e9d5ff' : '#dbeafe',
                      color: product.is_service ? '#7c3aed' : '#1d4ed8'
                    }}>
                      {product.is_service ? 'Service' : 'Product'}
                    </span>
                  </td>
                )}
                {visibleColumns.price && (
                  <td style={{
                    padding: '12px',
                    borderRight: '1px solid #ddd',
                    fontWeight: 'bold'
                  }}>
                    {formatCurrency(toNumber(product.unit_price))}
                  </td>
                )}
                {visibleColumns.gst && (
                  <td style={{
                    padding: '12px',
                    borderRight: '1px solid #ddd'
                  }}>
                    {toNumber(product.gst_rate)}%
                  </td>
                )}
                {visibleColumns.stock && (
                  <td style={{ padding: '12px' }}>
                    {product.is_service || product.current_stock == null ? (
                      '-'
                    ) : (
                      <span style={{
                        fontWeight: 'bold',
                        color: toNumber(product.current_stock) < 10 ? '#dc2626' : '#059669'
                      }}>
                        {toNumber(product.current_stock)}
                      </span>
                    )}
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
          <div style={{ fontSize: '12px', color: '#666' }}>
            Page 1 of 1
          </div>
        </div>
      </div>
    </div>
  );
};

export default function ProductsPage() {
  const router = useRouter();
  const { company } = useAuth();
  const [data, setData] = useState<ProductListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Filters state
  const [search, setSearch] = useState("");
  const [storeFilter, setStoreFilter] = useState<string>("");
  const [godowns, setGodowns] = useState<Godown[]>([]);
  
  // UI state
  const [showFilters, setShowFilters] = useState(false);
  const [showColumnDropdown, setShowColumnDropdown] = useState(false);
  const [activeActionMenu, setActiveActionMenu] = useState<string | null>(null);
  const [showPrintView, setShowPrintView] = useState(false);
  const [productsToPrint, setProductsToPrint] = useState<ProductWithMeta[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  
  // Export loading states
  const [copyLoading, setCopyLoading] = useState(false);
  const [excelLoading, setExcelLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [csvLoading, setCsvLoading] = useState(false);
  const [printLoading, setPrintLoading] = useState(false);
  
  // Column visibility
  const [visibleColumns, setVisibleColumns] = useState({
    name: true,
    brand: true,
    category: true,
    store: true,
    hsn: true,
    type: true,
    price: true,
    gst: true,
    stock: true,
    actions: true,
  });

  const companyId = company?.id || (typeof window !== "undefined" ? localStorage.getItem("company_id") : null);

  const selectedGodownId = storeFilter.startsWith("godown:")
    ? storeFilter.replace("godown:", "")
    : undefined;

  const applyStoreFilter = useCallback((products: ProductWithMeta[]) => {
    if (selectedGodownId) {
      return products.filter((product) => product.godown_id === selectedGodownId);
    }
    return products;
  }, [selectedGodownId]);

  useEffect(() => {
    if (companyId) {
      fetchProducts();
    }
  }, [companyId, currentPage, search, storeFilter]);

  useEffect(() => {
    const fetchGodowns = async () => {
      if (!companyId) return;
      try {
        const result = await inventoryApi.listGodowns(companyId);
        setGodowns(result || []);
      } catch (err) {
        console.error("Failed to load godowns", err);
        setGodowns([]);
      }
    };

    fetchGodowns();
  }, [companyId]);

  useEffect(() => {
    const handleClickOutsideActionMenu = (event: Event) => {
      if (!activeActionMenu) return;
      const target = event.target as HTMLElement | null;
      if (!target?.closest(".action-dropdown-container")) {
        setActiveActionMenu(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutsideActionMenu);
    document.addEventListener("touchstart", handleClickOutsideActionMenu);
    return () => {
      document.removeEventListener("mousedown", handleClickOutsideActionMenu);
      document.removeEventListener("touchstart", handleClickOutsideActionMenu);
    };
  }, [activeActionMenu]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      if (!company?.id) {
        setLoading(false);
        return;
      }

      const result = await productsApi.list(company.id, {
        page: currentPage,
        page_size: pageSize,
        search: search || undefined,
        godown_id: selectedGodownId,
      });
      
      setData(result);
      setError("");
    } catch (err) {
      setError("Failed to load products");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllProductsForExport = async (): Promise<ProductWithMeta[]> => {
    try {
      if (!company?.id) return [];

      const pageSize = 100;
      let pageNum = 1;
      let allProducts: ProductWithMeta[] = [];
      while (true) {
        const result = await productsApi.list(company.id, {
          page: pageNum,
          page_size: pageSize,
          search: search || undefined,
          godown_id: selectedGodownId,
        });
        const rawBatch = (result?.products || []) as ProductWithMeta[];
        const batch = applyStoreFilter(rawBatch);
        allProducts = allProducts.concat(batch);
        if (rawBatch.length < pageSize) break;
        pageNum += 1;
      }

      return allProducts;
    } catch (error) {
      console.error("Export fetch failed:", error);
      return [];
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
  };

  const handleReset = () => {
    setSearch("");
    setStoreFilter("");
    setCurrentPage(1);
  };

  const formatCurrency = (amount: number) => `₹${amount.toFixed(2)}`;

  const getTypeBadgeClass = (isService: boolean): string => {
    return isService 
      ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
      : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
  };

  const getStockBadgeClass = (stock: number | null, isService: boolean): string => {
    if (isService || stock === null) {
      return "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300";
    }
    return stock < 10 
      ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
      : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
  };

  const filteredProducts = applyStoreFilter((data?.products || []) as ProductWithMeta[]);
  const totalPages = data ? Math.max(1, Math.ceil(data.total / pageSize)) : 1;

  // Export functions
  const copyToClipboard = async () => {
    if (copyLoading) return;
    setCopyLoading(true);
    try {
      const allProducts = await fetchAllProductsForExport();
      
      const headers: string[] = ["S.No"];
      const rows = allProducts.map((product, index) => {
        const row: string[] = [(index + 1).toString()];

        if (visibleColumns.name) {
          if (!headers.includes("Product Name")) headers.push("Product Name");
          row.push(product.name);
        }

        if (visibleColumns.brand) {
          if (!headers.includes("Brand")) headers.push("Brand");
          row.push(getBrandName(product as ProductWithMeta));
        }

        if (visibleColumns.category) {
          if (!headers.includes("Category")) headers.push("Category");
          row.push(getCategoryName(product as ProductWithMeta));
        }

        if (visibleColumns.store) {
          if (!headers.includes("Store Name")) headers.push("Store Name");
          row.push(getStoreName(product as ProductWithMeta, company?.name));
        }

        if (visibleColumns.hsn) {
          if (!headers.includes("HSN/SAC")) headers.push("HSN/SAC");
          row.push(product.hsn_code || "-");
        }

        if (visibleColumns.type) {
          if (!headers.includes("Type")) headers.push("Type");
          row.push(product.is_service ? "Service" : "Product");
        }

        if (visibleColumns.price) {
          if (!headers.includes("Price")) headers.push("Price");
          row.push(toNumber(product.unit_price).toFixed(2));
        }

        if (visibleColumns.gst) {
          if (!headers.includes("GST %")) headers.push("GST %");
          row.push(`${toNumber(product.gst_rate)}%`);
        }

        if (visibleColumns.stock) {
          if (!headers.includes("Stock")) headers.push("Stock");
          row.push(product.is_service || product.current_stock == null 
            ? "-" 
            : toNumber(product.current_stock).toString()
          );
        }

        return row;
      });

      // Add S.No to headers
      headers.unshift("S.No");
      
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
      const allProducts = await fetchAllProductsForExport();
      
      const exportData = allProducts.map((product, index) => {
        const row: Record<string, any> = {
          "S.No": index + 1,
        };

        if (visibleColumns.name) {
          row["Product Name"] = product.name;
          row["Description"] = product.description || "";
          row["SKU"] = product.sku || "";
        }

        if (visibleColumns.brand) {
          row["Brand"] = getBrandName(product as ProductWithMeta);
        }

        if (visibleColumns.category) {
          row["Category"] = getCategoryName(product as ProductWithMeta);
        }

        if (visibleColumns.store) {
          row["Store Name"] = getStoreName(product as ProductWithMeta, company?.name);
        }

        if (visibleColumns.hsn) {
          row["HSN/SAC"] = product.hsn_code || "";
        }

        if (visibleColumns.type) {
          row["Type"] = product.is_service ? "Service" : "Product";
        }

        if (visibleColumns.price) {
          row["Price"] = toNumber(product.unit_price).toFixed(2);
        }

        if (visibleColumns.gst) {
          row["GST %"] = toNumber(product.gst_rate);
        }

        if (visibleColumns.stock) {
          row["Stock"] = product.is_service || product.current_stock == null 
            ? "-" 
            : toNumber(product.current_stock);
        }

        row["Company"] = company?.name || "";
        
        return row;
      });

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Products");
      XLSX.writeFile(wb, "products.xlsx");
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
      const allProducts = await fetchAllProductsForExport();
      
      const doc = new jsPDF("landscape");
      
      const headers: string[] = ["S.No"];
      const body = allProducts.map((product, index) => {
        const row: string[] = [(index + 1).toString()];

        if (visibleColumns.name) {
          if (!headers.includes("Product")) headers.push("Product");
          row.push(product.name);
        }

        if (visibleColumns.brand) {
          if (!headers.includes("Brand")) headers.push("Brand");
          row.push(getBrandName(product as ProductWithMeta));
        }

        if (visibleColumns.category) {
          if (!headers.includes("Category")) headers.push("Category");
          row.push(getCategoryName(product as ProductWithMeta));
        }

        if (visibleColumns.store) {
          if (!headers.includes("Store Name")) headers.push("Store Name");
          row.push(getStoreName(product as ProductWithMeta, company?.name));
        }

        if (visibleColumns.hsn) {
          if (!headers.includes("HSN/SAC")) headers.push("HSN/SAC");
          row.push(product.hsn_code || "-");
        }

        if (visibleColumns.type) {
          if (!headers.includes("Type")) headers.push("Type");
          row.push(product.is_service ? "Service" : "Product");
        }

        if (visibleColumns.price) {
          if (!headers.includes("Price")) headers.push("Price");
          row.push(toNumber(product.unit_price).toFixed(2));
        }

        if (visibleColumns.gst) {
          if (!headers.includes("GST %")) headers.push("GST %");
          row.push(`${toNumber(product.gst_rate)}%`);
        }

        if (visibleColumns.stock) {
          if (!headers.includes("Stock")) headers.push("Stock");
          row.push(product.is_service || product.current_stock == null 
            ? "-" 
            : toNumber(product.current_stock).toString()
          );
        }

        return row;
      });

      autoTable(doc, {
        ...getProfessionalTableTheme(doc, "Products List", company?.name || "", "l"),
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
      doc.save("products.pdf");
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
      const allProducts = await fetchAllProductsForExport();
      
      const exportData = allProducts.map((product, index) => {
        const row: Record<string, any> = {
          "S.No": index + 1,
        };

        if (visibleColumns.name) {
          row["Product Name"] = product.name;
        }

        if (visibleColumns.brand) {
          row["Brand"] = getBrandName(product as ProductWithMeta);
        }

        if (visibleColumns.category) {
          row["Category"] = getCategoryName(product as ProductWithMeta);
        }

        if (visibleColumns.store) {
          row["Store Name"] = getStoreName(product as ProductWithMeta, company?.name);
        }

        if (visibleColumns.hsn) {
          row["HSN/SAC"] = product.hsn_code || "";
        }

        if (visibleColumns.type) {
          row["Type"] = product.is_service ? "Service" : "Product";
        }

        if (visibleColumns.price) {
          row["Price"] = toNumber(product.unit_price).toFixed(2);
        }

        if (visibleColumns.gst) {
          row["GST %"] = toNumber(product.gst_rate);
        }

        if (visibleColumns.stock) {
          row["Stock"] = product.is_service || product.current_stock == null 
            ? "-" 
            : toNumber(product.current_stock);
        }

        return row;
      });

      const ws = XLSX.utils.json_to_sheet(exportData);
      const csv = XLSX.utils.sheet_to_csv(ws);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      saveAs(blob, "products.csv");
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
      const allProducts = await fetchAllProductsForExport();
      setProductsToPrint(allProducts);
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

  const handleDelete = async (productId: string, productName: string) => {
    if (window.confirm(`Are you sure you want to delete product "${productName}"? This action cannot be undone.`)) {
      try {
        if (company?.id) {
          await productsApi.delete(company.id, productId);
          fetchProducts();
        }
      } catch (error) {
        console.error("Error deleting product:", error);
        alert("Failed to delete product");
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
          products={productsToPrint}
          visibleColumns={visibleColumns}
          formatCurrency={formatCurrency}
          companyName={company?.name || ''}
        />
      )}

      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Products & Services
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Manage your products and services • Stock items auto-synced
            </p>
          </div>
          <button
            onClick={() => router.push('/products/new')}
            className="px-4 py-2 transition bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Add Product
          </button>
        </div>
      </div>

      {/* Info Banner */}
      <div className="px-6 py-6 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-100 dark:border-blue-800/30">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <p className="font-medium text-blue-800 dark:text-blue-200">
              Products and Stock are unified
            </p>
            <p className="text-blue-600 dark:text-blue-300 mt-1">
              Products include inventory tracking. Services don't have stock. View inventory at Inventory → Stock Items.
            </p>
          </div>
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
                  {data?.total || 0}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Total Items
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
                <Package className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </div>

          {/* Products */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-blue-600">
                  {data?.products?.filter(p => !p.is_service).length || 0}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Products
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                <Box className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>

          {/* Services */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-purple-600">
                  {data?.products?.filter(p => p.is_service).length || 0}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Services
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
                <Layers className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </div>

          {/* Low Stock */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-red-600">
                  {data?.products?.filter(p => 
                    !p.is_service && 
                    p.current_stock != null && 
                    toNumber(p.current_stock) < 10
                  ).length || 0}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Low Stock Items
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
                placeholder="Search products by name, SKU, HSN..."
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
                  {Object.entries(visibleColumns)
                    .filter(([key]) => key !== 'actions')
                    .map(([key, value]) => (
                    <label key={key} className="flex items-center gap-2 text-sm mb-2 last:mb-0 cursor-pointer text-gray-700 dark:text-gray-300">
                      <input
                        type="checkbox"
                        checked={value}
                        onChange={() => toggleColumn(key as keyof typeof visibleColumns)}
                        className="rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="capitalize">
                        {key === 'hsn' ? 'HSN/SAC' : 
                         key === 'store' ? 'Store Name' :
                         key === 'gst' ? 'GST %' : 
                         key.charAt(0).toUpperCase() + key.slice(1)}
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
            {/* Store Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Store
              </label>
              <select
                value={storeFilter}
                onChange={(e) => {
                  setStoreFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="">{company?.name || "Company"}</option>
                {godowns.map((godown) => (
                  <option key={godown.id} value={`godown:${godown.id}`}>
                    {godown.name}
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
                <th className="text-left px-3 py-3 ">
                  S.No
                </th>
                {visibleColumns.name && (
                  <th className="text-left px-3 py-3 ">
                    Product Name
                  </th>
                )}
                {visibleColumns.brand && (
                  <th className="text-left px-3 py-3 ">
                    Brand
                  </th>
                )}
                {visibleColumns.category && (
                  <th className="text-left px-3 py-3 ">
                    Category
                  </th>
                )}
                {visibleColumns.store && (
                  <th className="text-left px-3 py-3 ">
                    Store Name
                  </th>
                )}
                {visibleColumns.hsn && (
                  <th className="text-left px-3 py-3 ">
                    HSN/SAC
                  </th>
                )}
                {visibleColumns.type && (
                  <th className="text-left px-3 py-3 ">
                    Type
                  </th>
                )}
                {visibleColumns.price && (
                  <th className="text-left px-3 py-3 ">
                    Price
                  </th>
                )}
                {visibleColumns.gst && (
                  <th className="text-left px-3 py-3 ">
                    GST %
                  </th>
                )}
                {visibleColumns.stock && (
                  <th className="text-left px-3 py-3 ">
                    Stock
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
                  <td colSpan={Object.values(visibleColumns).filter(Boolean).length} className="px-6 py-8 text-center">
                    <div className="flex items-center justify-center">
                      <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
                    </div>
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={Object.values(visibleColumns).filter(Boolean).length} className="px-6 py-8 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <Package className="w-12 h-12 text-gray-400 mb-2" />
                      <p className="text-lg font-medium text-gray-900 dark:text-white mb-1">
                        No products found
                      </p>
                      <p className="text-gray-500 dark:text-gray-400 mb-4">
                        {search || !!selectedGodownId ?
                          "No products found matching your filters. Try adjusting your search criteria." :
                          "Add your first product or service to start managing your inventory."}
                      </p>
                      <button
                        onClick={() => router.push('/products/new')}
                        className="text-indigo-600 hover:underline dark:text-indigo-400"
                      >
                        Add your first product
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product, index) => {
                  const stockValue = product.current_stock != null
                    ? toNumber(product.current_stock)
                    : null;

                  return (
                    <tr
                      key={product.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <td className="px-3 py-4 align-top break-words text-gray-700 dark:text-gray-300">
                        {(currentPage - 1) * pageSize + index + 1}
                      </td>
                      {visibleColumns.name && (
                        <td className="px-3 py-4 align-top break-words">
                          <div className="min-w-0 max-w-[240px]">
                            <div className="font-medium text-gray-900 dark:text-white">
                              {product.name}
                            </div>
                            {product.description && (
                              <div className="text-xs text-gray-500 dark:text-gray-400 truncate mt-1">
                                {product.description}
                              </div>
                            )}
                            {product.sku && (
                              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                SKU: {product.sku}
                              </div>
                            )}
                          </div>
                        </td>
                      )}
                      {visibleColumns.brand && (
                        <td className="px-3 py-4 align-top break-words">
                          {getBrandName(product as ProductWithMeta) !== "-" ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 dark:bg-gray-700 px-2.5 py-0.5 text-xs font-medium text-gray-800 dark:text-gray-300">
                              <Tag className="w-3 h-3" />
                              {getBrandName(product as ProductWithMeta)}
                            </span>
                          ) : (
                            <span className="text-gray-500 dark:text-gray-400">-</span>
                          )}
                        </td>
                      )}
                      {visibleColumns.category && (
                        <td className="px-3 py-4 align-top break-words">
                          {getCategoryName(product as ProductWithMeta) !== "-" ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 dark:bg-gray-700 px-2.5 py-0.5 text-xs font-medium text-gray-800 dark:text-gray-300">
                              <Building className="w-3 h-3" />
                              {getCategoryName(product as ProductWithMeta)}
                            </span>
                          ) : (
                            <span className="text-gray-500 dark:text-gray-400">-</span>
                          )}
                        </td>
                      )}
                      {visibleColumns.store && (
                        <td className="px-3 py-4 align-top break-words text-gray-700 dark:text-gray-300">
                          {getStoreName(product as ProductWithMeta, company?.name)}
                        </td>
                      )}
                      {visibleColumns.hsn && (
                        <td className="px-3 py-4 align-top break-words text-gray-700 dark:text-gray-300">
                          <div className="flex items-center gap-2">
                            {product.hsn_code || '-'}
                          </div>
                        </td>
                      )}
                      {visibleColumns.type && (
                        <td className="px-3 py-4 align-top break-words">
                          <span
                            className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeBadgeClass(product.is_service)}`}
                          >
                            {product.is_service ? 'Service' : 'Product'}
                          </span>
                        </td>
                      )}
                      {visibleColumns.price && (
                        <td className="px-3 py-4 align-top break-words">
                          <div className="flex items-center gap-2 font-bold text-gray-900 dark:text-white">
                            {formatCurrency(toNumber(product.unit_price))}
                          </div>
                        </td>
                      )}
                      {visibleColumns.gst && (
                        <td className="px-3 py-4 align-top break-words text-gray-700 dark:text-gray-300">
                          <div className="flex items-center gap-2">
                            {toNumber(product.gst_rate)}%
                          </div>
                        </td>
                      )}
                      {visibleColumns.stock && (
                        <td className="px-3 py-4 align-top break-words">
                          {product.is_service || stockValue === null ? (
                            <span className="text-gray-500 dark:text-gray-400">-</span>
                          ) : (
                            <span
                              className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${getStockBadgeClass(stockValue, product.is_service)}`}
                            >
                              {stockValue}
                            </span>
                          )}
                        </td>
                      )}
                      {visibleColumns.actions && (
                        <td className="px-3 py-4 text-right align-top">
                          <div className="relative action-dropdown-container inline-block">
                            <button
                              onClick={() =>
                                setActiveActionMenu(
                                  activeActionMenu === product.id ? null : product.id
                                )
                              }
                              className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-50 dark:hover:text-gray-300 dark:hover:bg-gray-700/50 transition-all duration-200"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>

                            {activeActionMenu === product.id && (
                              <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg shadow-xl py-1 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                                <Link
                                  href={`/products/${product.id}`}
                                  onClick={() => setActiveActionMenu(null)}
                                  className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                                >
                                  <Eye className="w-4 h-4 text-gray-400" />
                                  <span>View Details</span>
                                </Link>

                                <Link
                                  href={`/products/${product.id}/edit`}
                                  onClick={() => setActiveActionMenu(null)}
                                  className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                                >
                                  <Edit className="w-4 h-4 text-gray-400" />
                                  <span>Edit</span>
                                </Link>

                                <div className="my-1 border-t border-gray-100 dark:border-gray-700"></div>
                                <button
                                  onClick={() => {
                                    handleDelete(product.id, product.name);
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
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {!loading && filteredProducts.length > 0 && (
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

