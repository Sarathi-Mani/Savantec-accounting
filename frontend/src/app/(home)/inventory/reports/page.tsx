"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import { useAuth } from "@/context/AuthContext";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:6768";

interface BrandStock {
  brand_id: string;
  brand_name: string;
  item_count: number;
  total_quantity: number;
  total_value: number;
  low_stock_count: number;
  out_of_stock_count: number;
}

interface CategoryStock {
  category_id: string;
  category_name: string;
  item_count: number;
  total_quantity: number;
  total_value: number;
  low_stock_count: number;
  out_of_stock_count: number;
}

interface StockListItem {
  product_id: string;
  product_name: string;
  product_code: string;
  brand_name: string | null;
  category_name: string | null;
  unit: string;
  current_stock: number;
  min_stock_level: number;
  standard_cost: number;
  sale_price: number;
  stock_value: number;
  is_low_stock: boolean;
  is_out_of_stock: boolean;
}

interface LedgerEntry {
  date: string;
  movement_type: string;
  reference_type: string;
  reference_number: string;
  godown: string | null;
  batch: string | null;
  inward_qty: number;
  outward_qty: number;
  rate: number;
  value: number;
  balance: number;
  narration: string | null;
}

interface Product {
  id: string;
  name: string;
  sku: string;
}

export default function StockReportsPage() {
  const { company, getToken } = useAuth();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") || "brand";

  const [activeTab, setActiveTab] = useState(initialTab);
  const [brandData, setBrandData] = useState<{ brands: BrandStock[]; totals: any }>({ brands: [], totals: {} });
  const [categoryData, setCategoryData] = useState<{ categories: CategoryStock[]; totals: any }>({ categories: [], totals: {} });
  const [stockList, setStockList] = useState<StockListItem[]>([]);
  const [ledgerData, setLedgerData] = useState<any>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [includeZeroStock, setIncludeZeroStock] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [lowStockOnly, setLowStockOnly] = useState(false);

  useEffect(() => {
    if (company?.id) {
      fetchProducts();
      fetchData();
    }
  }, [company, activeTab, includeZeroStock, lowStockOnly]);

  const fetchProducts = async () => {
    try {
      const token = getToken();
      const response = await fetch(
        `${API_BASE}/api/companies/${company?.id}/products`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.ok) {
        const data = await response.json();
        setProducts(data);
      }
    } catch (error) {
      console.error("Error fetching products:", error);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    const token = getToken();

    try {
      if (activeTab === "brand") {
        const response = await fetch(
          `${API_BASE}/api/companies/${company?.id}/inventory/stock-by-brand?include_zero_stock=${includeZeroStock}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (response.ok) setBrandData(await response.json());
      } else if (activeTab === "category") {
        const response = await fetch(
          `${API_BASE}/api/companies/${company?.id}/inventory/stock-by-category?include_zero_stock=${includeZeroStock}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (response.ok) setCategoryData(await response.json());
      } else if (activeTab === "list") {
        const params = new URLSearchParams();
        if (lowStockOnly) params.append("low_stock_only", "true");
        const response = await fetch(
          `${API_BASE}/api/companies/${company?.id}/inventory/stock-list?${params}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (response.ok) setStockList(await response.json());
      }
    } catch (error) {
      console.error("Error fetching report:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLedger = async () => {
    if (!selectedProduct) return;
    setLoading(true);
    const token = getToken();
    const params = new URLSearchParams();
    if (fromDate) params.append("from_date", fromDate);
    if (toDate) params.append("to_date", toDate);

    try {
      const response = await fetch(
        `${API_BASE}/api/companies/${company?.id}/inventory/stock-ledger/${selectedProduct}?${params}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.ok) setLedgerData(await response.json());
    } catch (error) {
      console.error("Error fetching ledger:", error);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: "brand", label: "Brand Summary" },
    { id: "category", label: "Category Summary" },
    { id: "list", label: "Stock List" },
    { id: "ledger", label: "Stock Ledger" },
  ];

  const movementTypeColors: Record<string, string> = {
    purchase: "bg-green-100 text-green-800",
    sale: "bg-red-100 text-red-800",
    transfer_in: "bg-blue-100 text-blue-800",
    transfer_out: "bg-orange-100 text-orange-800",
    adjustment_in: "bg-purple-100 text-purple-800",
    adjustment_out: "bg-yellow-100 text-yellow-800",
    manufacturing_in: "bg-indigo-100 text-indigo-800",
    manufacturing_out: "bg-pink-100 text-pink-800",
  };

  return (
    <>
      <Breadcrumb pageName="Stock Reports" />

      {/* Tabs */}
      <div className="mb-4 flex flex-wrap gap-2 border-b border-stroke dark:border-strokedark">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === tab.id
                ? "border-b-2 border-primary text-primary"
                : "text-gray-500 hover:text-primary dark:text-gray-400"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      {(activeTab === "brand" || activeTab === "category") && (
        <div className="mb-4 flex items-center gap-4 rounded-sm border border-stroke bg-white p-4 shadow-default dark:border-strokedark dark:bg-boxdark">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={includeZeroStock}
              onChange={(e) => setIncludeZeroStock(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            <span className="text-sm text-black dark:text-white">Include Zero Stock Items</span>
          </label>
        </div>
      )}

      {activeTab === "list" && (
        <div className="mb-4 flex items-center gap-4 rounded-sm border border-stroke bg-white p-4 shadow-default dark:border-strokedark dark:bg-boxdark">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={lowStockOnly}
              onChange={(e) => setLowStockOnly(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            <span className="text-sm text-black dark:text-white">Low Stock Only</span>
          </label>
        </div>
      )}

      {activeTab === "ledger" && (
        <div className="mb-4 flex flex-wrap items-end gap-4 rounded-sm border border-stroke bg-white p-4 shadow-default dark:border-strokedark dark:bg-boxdark">
          <div className="flex-1 min-w-[200px]">
            <label className="mb-1 block text-sm font-medium text-black dark:text-white">
              Select Product
            </label>
            <select
              value={selectedProduct}
              onChange={(e) => setSelectedProduct(e.target.value)}
              className="w-full rounded border border-stroke bg-transparent px-3 py-2 outline-none focus:border-primary dark:border-strokedark"
            >
              <option value="">-- Select Product --</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name} ({product.sku || "No SKU"})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-black dark:text-white">From Date</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="rounded border border-stroke bg-transparent px-3 py-2 outline-none focus:border-primary dark:border-strokedark"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-black dark:text-white">To Date</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="rounded border border-stroke bg-transparent px-3 py-2 outline-none focus:border-primary dark:border-strokedark"
            />
          </div>
          <button
            onClick={fetchLedger}
            disabled={!selectedProduct}
            className="rounded bg-primary px-4 py-2 text-white hover:bg-primary/90 disabled:opacity-50"
          >
            Load Ledger
          </button>
        </div>
      )}

      {loading && activeTab !== "ledger" ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        </div>
      ) : (
        <>
          {/* Brand Summary Tab */}
          {activeTab === "brand" && (
            <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
              <div className="border-b border-stroke px-4 py-4 dark:border-strokedark">
                <h3 className="font-semibold text-black dark:text-white">
                  Stock by Brand - Total Value: ₹{brandData.totals.total_value?.toLocaleString() || 0}
                </h3>
              </div>
              <div className="max-w-full overflow-x-auto">
                <table className="w-full table-auto">
                  <thead>
                    <tr className="bg-gray-2 text-left dark:bg-meta-4">
                      <th className="px-4 py-4 font-medium text-black dark:text-white">Brand</th>
                      <th className="px-4 py-4 font-medium text-black dark:text-white text-right">Items</th>
                      <th className="px-4 py-4 font-medium text-black dark:text-white text-right">Total Qty</th>
                      <th className="px-4 py-4 font-medium text-black dark:text-white text-right">Stock Value</th>
                      <th className="px-4 py-4 font-medium text-black dark:text-white text-right">Low Stock</th>
                      <th className="px-4 py-4 font-medium text-black dark:text-white text-right">Out of Stock</th>
                    </tr>
                  </thead>
                  <tbody>
                    {brandData.brands.map((row, i) => (
                      <tr key={i} className="border-b border-stroke dark:border-strokedark">
                        <td className="px-4 py-4 font-medium">{row.brand_name}</td>
                        <td className="px-4 py-4 text-right">{row.item_count}</td>
                        <td className="px-4 py-4 text-right">{row.total_quantity.toLocaleString()}</td>
                        <td className="px-4 py-4 text-right font-bold">₹{row.total_value.toLocaleString()}</td>
                        <td className="px-4 py-4 text-right">
                          {row.low_stock_count > 0 && (
                            <span className="rounded bg-yellow-100 px-2 py-1 text-xs text-yellow-800">
                              {row.low_stock_count}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-right">
                          {row.out_of_stock_count > 0 && (
                            <span className="rounded bg-red-100 px-2 py-1 text-xs text-red-800">
                              {row.out_of_stock_count}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {brandData.brands.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-gray-500">No data available</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Category Summary Tab */}
          {activeTab === "category" && (
            <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
              <div className="border-b border-stroke px-4 py-4 dark:border-strokedark">
                <h3 className="font-semibold text-black dark:text-white">
                  Stock by Category - Total Value: ₹{categoryData.totals.total_value?.toLocaleString() || 0}
                </h3>
              </div>
              <div className="max-w-full overflow-x-auto">
                <table className="w-full table-auto">
                  <thead>
                    <tr className="bg-gray-2 text-left dark:bg-meta-4">
                      <th className="px-4 py-4 font-medium text-black dark:text-white">Category</th>
                      <th className="px-4 py-4 font-medium text-black dark:text-white text-right">Items</th>
                      <th className="px-4 py-4 font-medium text-black dark:text-white text-right">Total Qty</th>
                      <th className="px-4 py-4 font-medium text-black dark:text-white text-right">Stock Value</th>
                      <th className="px-4 py-4 font-medium text-black dark:text-white text-right">Low Stock</th>
                      <th className="px-4 py-4 font-medium text-black dark:text-white text-right">Out of Stock</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categoryData.categories.map((row, i) => (
                      <tr key={i} className="border-b border-stroke dark:border-strokedark">
                        <td className="px-4 py-4 font-medium">{row.category_name}</td>
                        <td className="px-4 py-4 text-right">{row.item_count}</td>
                        <td className="px-4 py-4 text-right">{row.total_quantity.toLocaleString()}</td>
                        <td className="px-4 py-4 text-right font-bold">₹{row.total_value.toLocaleString()}</td>
                        <td className="px-4 py-4 text-right">
                          {row.low_stock_count > 0 && (
                            <span className="rounded bg-yellow-100 px-2 py-1 text-xs text-yellow-800">
                              {row.low_stock_count}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-right">
                          {row.out_of_stock_count > 0 && (
                            <span className="rounded bg-red-100 px-2 py-1 text-xs text-red-800">
                              {row.out_of_stock_count}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {categoryData.categories.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-gray-500">No data available</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Stock List Tab */}
          {activeTab === "list" && (
            <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
              <div className="max-w-full overflow-x-auto">
                <table className="w-full table-auto">
                  <thead>
                    <tr className="bg-gray-2 text-left dark:bg-meta-4">
                      <th className="px-4 py-4 font-medium text-black dark:text-white">Product</th>
                      <th className="px-4 py-4 font-medium text-black dark:text-white">Code</th>
                      <th className="px-4 py-4 font-medium text-black dark:text-white">Brand</th>
                      <th className="px-4 py-4 font-medium text-black dark:text-white">Category</th>
                      <th className="px-4 py-4 font-medium text-black dark:text-white text-right">Stock</th>
                      <th className="px-4 py-4 font-medium text-black dark:text-white text-right">Min Level</th>
                      <th className="px-4 py-4 font-medium text-black dark:text-white text-right">Value</th>
                      <th className="px-4 py-4 font-medium text-black dark:text-white text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stockList.map((item, i) => (
                      <tr key={i} className="border-b border-stroke dark:border-strokedark">
                        <td className="px-4 py-4 font-medium">{item.product_name}</td>
                        <td className="px-4 py-4">{item.product_code || "-"}</td>
                        <td className="px-4 py-4">{item.brand_name || "-"}</td>
                        <td className="px-4 py-4">{item.category_name || "-"}</td>
                        <td className="px-4 py-4 text-right">
                          {item.current_stock.toLocaleString()} {item.unit}
                        </td>
                        <td className="px-4 py-4 text-right">{item.min_stock_level}</td>
                        <td className="px-4 py-4 text-right font-bold">₹{item.stock_value.toLocaleString()}</td>
                        <td className="px-4 py-4 text-center">
                          {item.is_out_of_stock ? (
                            <span className="rounded bg-red-100 px-2 py-1 text-xs text-red-800">Out of Stock</span>
                          ) : item.is_low_stock ? (
                            <span className="rounded bg-yellow-100 px-2 py-1 text-xs text-yellow-800">Low Stock</span>
                          ) : (
                            <span className="rounded bg-green-100 px-2 py-1 text-xs text-green-800">OK</span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {stockList.length === 0 && (
                      <tr>
                        <td colSpan={8} className="px-4 py-8 text-center text-gray-500">No items found</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Stock Ledger Tab */}
          {activeTab === "ledger" && (
            <>
              {ledgerData ? (
                <div className="space-y-4">
                  {/* Summary */}
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                    <div className="rounded-sm border border-stroke bg-white p-4 shadow-default dark:border-strokedark dark:bg-boxdark">
                      <p className="text-sm text-gray-500">Opening Balance</p>
                      <p className="text-xl font-bold text-black dark:text-white">
                        {ledgerData.opening_balance.toLocaleString()} {ledgerData.unit}
                      </p>
                    </div>
                    <div className="rounded-sm border border-stroke bg-white p-4 shadow-default dark:border-strokedark dark:bg-boxdark">
                      <p className="text-sm text-gray-500">Total Inward</p>
                      <p className="text-xl font-bold text-success">
                        +{ledgerData.total_inward.toLocaleString()} {ledgerData.unit}
                      </p>
                    </div>
                    <div className="rounded-sm border border-stroke bg-white p-4 shadow-default dark:border-strokedark dark:bg-boxdark">
                      <p className="text-sm text-gray-500">Total Outward</p>
                      <p className="text-xl font-bold text-danger">
                        -{ledgerData.total_outward.toLocaleString()} {ledgerData.unit}
                      </p>
                    </div>
                    <div className="rounded-sm border border-stroke bg-white p-4 shadow-default dark:border-strokedark dark:bg-boxdark">
                      <p className="text-sm text-gray-500">Closing Balance</p>
                      <p className="text-xl font-bold text-primary">
                        {ledgerData.closing_balance.toLocaleString()} {ledgerData.unit}
                      </p>
                    </div>
                  </div>

                  {/* Ledger Table */}
                  <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
                    <div className="border-b border-stroke px-4 py-4 dark:border-strokedark">
                      <h3 className="font-semibold text-black dark:text-white">
                        {ledgerData.product_name} ({ledgerData.product_code || "No Code"})
                      </h3>
                    </div>
                    <div className="max-w-full overflow-x-auto">
                      <table className="w-full table-auto">
                        <thead>
                          <tr className="bg-gray-2 text-left dark:bg-meta-4">
                            <th className="px-4 py-4 font-medium text-black dark:text-white">Date</th>
                            <th className="px-4 py-4 font-medium text-black dark:text-white">Type</th>
                            <th className="px-4 py-4 font-medium text-black dark:text-white">Reference</th>
                            <th className="px-4 py-4 font-medium text-black dark:text-white">Godown</th>
                            <th className="px-4 py-4 font-medium text-black dark:text-white text-right">Inward</th>
                            <th className="px-4 py-4 font-medium text-black dark:text-white text-right">Outward</th>
                            <th className="px-4 py-4 font-medium text-black dark:text-white text-right">Balance</th>
                          </tr>
                        </thead>
                        <tbody>
                          {ledgerData.entries.map((entry: LedgerEntry, i: number) => (
                            <tr key={i} className="border-b border-stroke dark:border-strokedark">
                              <td className="px-4 py-4">{entry.date ? new Date(entry.date).toLocaleDateString() : "-"}</td>
                              <td className="px-4 py-4">
                                <span className={`rounded px-2 py-1 text-xs ${movementTypeColors[entry.movement_type] || "bg-gray-100 text-gray-800"}`}>
                                  {entry.movement_type?.replace("_", " ")}
                                </span>
                              </td>
                              <td className="px-4 py-4">{entry.reference_number || entry.reference_type || "-"}</td>
                              <td className="px-4 py-4">{entry.godown || "-"}</td>
                              <td className="px-4 py-4 text-right text-success">
                                {entry.inward_qty > 0 ? `+${entry.inward_qty}` : "-"}
                              </td>
                              <td className="px-4 py-4 text-right text-danger">
                                {entry.outward_qty > 0 ? `-${entry.outward_qty}` : "-"}
                              </td>
                              <td className="px-4 py-4 text-right font-bold">{entry.balance}</td>
                            </tr>
                          ))}
                          {ledgerData.entries.length === 0 && (
                            <tr>
                              <td colSpan={7} className="px-4 py-8 text-center text-gray-500">No transactions found</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex h-64 items-center justify-center rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
                  <p className="text-gray-500">Select a product and click "Load Ledger" to view stock ledger</p>
                </div>
              )}
            </>
          )}
        </>
      )}
    </>
  );
}
