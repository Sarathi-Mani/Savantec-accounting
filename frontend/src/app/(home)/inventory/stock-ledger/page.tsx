"use client";

import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import dayjs from "dayjs";
import { useEffect, useState } from "react";

interface Product {
  id: string;
  name: string;
  sku: string;
  current_stock: number;
  primary_unit: string;
}

interface LedgerEntry {
  date: string;
  reference_type: string | null;
  reference_number: string | null;
  movement_type: string;
  inward_qty: number;
  inward_value: number;
  outward_qty: number;
  outward_value: number;
  balance: number;
  rate: number;
  godown_name: string | null;
  notes: string | null;
}

interface StockLedger {
  product: {
    id: string;
    name: string;
    code: string | null;
    unit: string | null;
    current_stock: number;
    opening_stock: number;
  };
  opening_balance: number;
  closing_balance: number;
  total_inward: number;
  total_outward: number;
  entries: LedgerEntry[];
}

export default function StockLedgerPage() {
  const { company } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [fromDate, setFromDate] = useState(
    dayjs().subtract(1, "month").format("YYYY-MM-DD")
  );
  const [toDate, setToDate] = useState(dayjs().format("YYYY-MM-DD"));
  const [ledger, setLedger] = useState<StockLedger | null>(null);
  const [loading, setLoading] = useState(false);
  const [productsLoading, setProductsLoading] = useState(true);

  const getToken = () =>
    typeof window !== "undefined" ? localStorage.getItem("access_token") : null;

  // Load products
  useEffect(() => {
    const fetchProducts = async () => {
      const token = getToken();
      if (!company?.id || !token) {
        setProductsLoading(false);
        return;
      }

      setProductsLoading(true);
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:6768/api"}/companies/${company.id}/products`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (response.ok) {
          const data = await response.json();
          setProducts(Array.isArray(data) ? data : data.items || []);
        }
      } catch (err) {
        console.error("Failed to fetch products:", err);
      } finally {
        setProductsLoading(false);
      }
    };

    fetchProducts();
  }, [company?.id]);

  const fetchLedger = async () => {
    const token = getToken();
    if (!company?.id || !token || !selectedProductId) return;

    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (fromDate) params.append("from_date", fromDate);
      if (toDate) params.append("to_date", toDate);

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:6768/api"}/companies/${company.id}/stock-ledger/${selectedProductId}?${params}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (response.ok) {
        setLedger(await response.json());
      }
    } catch (error) {
      console.error("Failed to fetch stock ledger:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedProductId) {
      fetchLedger();
    }
  }, [selectedProductId, fromDate, toDate, company?.id]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
    }).format(value);
  };

  const getMovementTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      purchase: "Purchase",
      sale: "Sale",
      transfer_in: "Transfer In",
      transfer_out: "Transfer Out",
      adjustment_in: "Adjustment (+)",
      adjustment_out: "Adjustment (-)",
      manufacturing_in: "Manufacturing In",
      manufacturing_out: "Manufacturing Out",
      repack_in: "Repack In",
      repack_out: "Repack Out",
      conversion_in: "Conversion In",
      conversion_out: "Conversion Out",
    };
    return labels[type.toLowerCase()] || type;
  };

  const getMovementTypeColor = (type: string) => {
    if (type.includes("in") || type === "purchase") {
      return "text-green-600 dark:text-green-400";
    }
    if (type.includes("out") || type === "sale") {
      return "text-red-600 dark:text-red-400";
    }
    return "text-dark-6";
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-dark dark:text-white">Stock Ledger</h1>
        <p className="text-sm text-dark-6">
          View complete movement history for any product with running balance
        </p>
      </div>

      {/* Filters */}
      <div className="mb-6 rounded-lg bg-white p-6 shadow-1 dark:bg-gray-dark">
        <div className="grid gap-4 sm:grid-cols-4">
          <div className="sm:col-span-2">
            <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
              Select Product
            </label>
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              disabled={productsLoading}
              className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3"
            >
              <option value="">
                {productsLoading ? "Loading products..." : "Select a product"}
              </option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.sku ? `(${p.sku})` : ""} - Stock: {p.current_stock || 0}{" "}
                  {p.primary_unit || ""}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
              From Date
            </label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
              To Date
            </label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3"
            />
          </div>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        </div>
      )}

      {/* No Product Selected */}
      {!loading && !selectedProductId && (
        <div className="rounded-lg bg-white p-12 text-center shadow-1 dark:bg-gray-dark">
          <svg
            className="mx-auto h-16 w-16 text-dark-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
            />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-dark dark:text-white">
            Select a Product to View Ledger
          </h3>
          <p className="mt-2 text-sm text-dark-6">
            Choose a product from the dropdown above to view its stock movement history
          </p>
        </div>
      )}

      {/* Ledger Data */}
      {!loading && ledger && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid gap-4 sm:grid-cols-4">
            <div className="rounded-lg bg-white p-4 shadow-1 dark:bg-gray-dark">
              <p className="text-xs text-dark-6">Opening Balance</p>
              <p className="text-xl font-semibold text-dark dark:text-white">
                {ledger.opening_balance} {ledger.product.unit || ""}
              </p>
            </div>
            <div className="rounded-lg bg-green-50 p-4 shadow-1 dark:bg-green-900/20">
              <p className="text-xs text-dark-6">Total Inward</p>
              <p className="text-xl font-semibold text-green-600">
                +{ledger.total_inward} {ledger.product.unit || ""}
              </p>
            </div>
            <div className="rounded-lg bg-red-50 p-4 shadow-1 dark:bg-red-900/20">
              <p className="text-xs text-dark-6">Total Outward</p>
              <p className="text-xl font-semibold text-red-600">
                -{ledger.total_outward} {ledger.product.unit || ""}
              </p>
            </div>
            <div className="rounded-lg bg-blue-50 p-4 shadow-1 dark:bg-blue-900/20">
              <p className="text-xs text-dark-6">Closing Balance</p>
              <p className="text-xl font-semibold text-blue-600">
                {ledger.closing_balance} {ledger.product.unit || ""}
              </p>
            </div>
          </div>

          {/* Product Info */}
          <div className="rounded-lg bg-white p-4 shadow-1 dark:bg-gray-dark">
            <h2 className="text-lg font-semibold text-dark dark:text-white">
              {ledger.product.name}
            </h2>
            <p className="text-sm text-dark-6">
              {ledger.product.code && `Code: ${ledger.product.code} | `}
              Unit: {ledger.product.unit || "N/A"} | Current Stock:{" "}
              {ledger.product.current_stock}
            </p>
          </div>

          {/* Ledger Table */}
          <div className="overflow-hidden rounded-lg bg-white shadow-1 dark:bg-gray-dark">
            <div className="overflow-x-auto">
              <table className="w-full table-auto text-sm">
                <thead>
                  <tr className="border-b border-stroke bg-gray-50 dark:border-dark-3 dark:bg-dark-2">
                    <th className="px-4 py-3 text-left font-medium text-dark dark:text-white">
                      Date
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-dark dark:text-white">
                      Type
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-dark dark:text-white">
                      Reference
                    </th>
                    <th className="px-4 py-3 text-right font-medium text-dark dark:text-white">
                      Inward
                    </th>
                    <th className="px-4 py-3 text-right font-medium text-dark dark:text-white">
                      Outward
                    </th>
                    <th className="px-4 py-3 text-right font-medium text-dark dark:text-white">
                      Balance
                    </th>
                    <th className="px-4 py-3 text-right font-medium text-dark dark:text-white">
                      Rate
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-dark dark:text-white">
                      Godown
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {/* Opening Balance Row */}
                  <tr className="border-b border-stroke bg-gray-50/50 dark:border-dark-3 dark:bg-dark-2/50">
                    <td className="px-4 py-3 text-dark dark:text-white">
                      {fromDate ? dayjs(fromDate).format("DD MMM YYYY") : "-"}
                    </td>
                    <td className="px-4 py-3 font-medium text-dark dark:text-white">
                      Opening Balance
                    </td>
                    <td className="px-4 py-3 text-dark-6">-</td>
                    <td className="px-4 py-3 text-right text-dark-6">-</td>
                    <td className="px-4 py-3 text-right text-dark-6">-</td>
                    <td className="px-4 py-3 text-right font-semibold text-dark dark:text-white">
                      {ledger.opening_balance}
                    </td>
                    <td className="px-4 py-3 text-right text-dark-6">-</td>
                    <td className="px-4 py-3 text-dark-6">-</td>
                  </tr>

                  {ledger.entries.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-dark-6">
                        No transactions found in this period
                      </td>
                    </tr>
                  ) : (
                    ledger.entries.map((entry, index) => (
                      <tr
                        key={index}
                        className="border-b border-stroke transition hover:bg-gray-50 dark:border-dark-3 dark:hover:bg-dark-2"
                      >
                        <td className="px-4 py-3 text-dark dark:text-white">
                          {dayjs(entry.date).format("DD MMM YYYY")}
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn("font-medium", getMovementTypeColor(entry.movement_type))}>
                            {getMovementTypeLabel(entry.movement_type)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-dark-6">
                          {entry.reference_number || entry.reference_type || "-"}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {entry.inward_qty > 0 ? (
                            <span className="font-medium text-green-600">
                              +{entry.inward_qty}
                            </span>
                          ) : (
                            <span className="text-dark-6">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {entry.outward_qty > 0 ? (
                            <span className="font-medium text-red-600">
                              -{entry.outward_qty}
                            </span>
                          ) : (
                            <span className="text-dark-6">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-dark dark:text-white">
                          {entry.balance}
                        </td>
                        <td className="px-4 py-3 text-right text-dark-6">
                          {entry.rate > 0 ? formatCurrency(entry.rate) : "-"}
                        </td>
                        <td className="px-4 py-3 text-dark-6">{entry.godown_name || "-"}</td>
                      </tr>
                    ))
                  )}

                  {/* Closing Balance Row */}
                  <tr className="border-b border-stroke bg-blue-50/50 dark:border-dark-3 dark:bg-blue-900/20">
                    <td className="px-4 py-3 text-dark dark:text-white">
                      {toDate ? dayjs(toDate).format("DD MMM YYYY") : "-"}
                    </td>
                    <td className="px-4 py-3 font-medium text-blue-600">Closing Balance</td>
                    <td className="px-4 py-3 text-dark-6">-</td>
                    <td className="px-4 py-3 text-right font-medium text-green-600">
                      {ledger.total_inward > 0 ? `+${ledger.total_inward}` : "-"}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-red-600">
                      {ledger.total_outward > 0 ? `-${ledger.total_outward}` : "-"}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-blue-600">
                      {ledger.closing_balance}
                    </td>
                    <td className="px-4 py-3 text-right text-dark-6">-</td>
                    <td className="px-4 py-3 text-dark-6">-</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
