"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import { useAuth } from "@/context/AuthContext";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:6768";

interface BrandReport {
  brand_id: string;
  brand_name: string;
  invoice_count: number;
  total_quantity: number;
  total_amount: number;
  taxable_amount: number;
  percentage: number;
}

interface StateReport {
  state: string;
  state_code: string;
  invoice_count: number;
  customer_count: number;
  total_amount: number;
  taxable_amount: number;
  sgst_cgst: number;
  igst: number;
  supply_type: string;
  percentage: number;
}

interface CategoryReport {
  category_id: string;
  category_name: string;
  invoice_count: number;
  total_quantity: number;
  total_amount: number;
  percentage: number;
}

interface EngineerReport {
  sales_person_id: string;
  sales_person_name: string;
  total_tickets: number;
  won: number;
  lost: number;
  open: number;
  won_value: number;
  pipeline_value: number;
  win_rate: number;
}

export default function SalesReportsPage() {
  const { company, getToken } = useAuth();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") || "brand";

  const [activeTab, setActiveTab] = useState(initialTab);
  const [brandData, setBrandData] = useState<BrandReport[]>([]);
  const [stateData, setStateData] = useState<StateReport[]>([]);
  const [categoryData, setCategoryData] = useState<CategoryReport[]>([]);
  const [engineerData, setEngineerData] = useState<EngineerReport[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  useEffect(() => {
    if (company?.id) {
      fetchData();
    }
  }, [company, activeTab, fromDate, toDate]);

  const fetchData = async () => {
    setLoading(true);
    const token = getToken();
    const params = new URLSearchParams();
    if (fromDate) params.append("from_date", fromDate);
    if (toDate) params.append("to_date", toDate);

    try {
      if (activeTab === "brand") {
        const response = await fetch(
          `${API_BASE}/api/companies/${company?.id}/sales-dashboard/sales-by-brand?${params}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (response.ok) setBrandData(await response.json());
      } else if (activeTab === "state") {
        const response = await fetch(
          `${API_BASE}/api/companies/${company?.id}/sales-dashboard/sales-by-state?${params}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (response.ok) setStateData(await response.json());
      } else if (activeTab === "category") {
        const response = await fetch(
          `${API_BASE}/api/companies/${company?.id}/sales-dashboard/sales-by-category?${params}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (response.ok) setCategoryData(await response.json());
      } else if (activeTab === "engineer") {
        const response = await fetch(
          `${API_BASE}/api/companies/${company?.id}/sales-dashboard/sales-by-person?${params}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (response.ok) setEngineerData(await response.json());
      }
    } catch (error) {
      console.error("Error fetching report:", error);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: "brand", label: "By Brand" },
    { id: "state", label: "By State" },
    { id: "category", label: "By Category" },
    { id: "engineer", label: "By Engineer" },
  ];

  const totalBrandAmount = brandData.reduce((sum, item) => sum + item.total_amount, 0);
  const totalStateAmount = stateData.reduce((sum, item) => sum + item.total_amount, 0);
  const totalCategoryAmount = categoryData.reduce((sum, item) => sum + item.total_amount, 0);

  return (
    <>
      <Breadcrumb pageName="Sales Reports" />

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
      <div className="mb-4 flex flex-wrap gap-4 rounded-sm border border-stroke bg-white p-4 shadow-default dark:border-strokedark dark:bg-boxdark">
        <div>
          <label className="mb-1 block text-sm font-medium text-black dark:text-white">
            From Date
          </label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="rounded border border-stroke bg-transparent px-3 py-2 outline-none focus:border-primary dark:border-strokedark"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-black dark:text-white">
            To Date
          </label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="rounded border border-stroke bg-transparent px-3 py-2 outline-none focus:border-primary dark:border-strokedark"
          />
        </div>
        <div className="flex items-end">
          <button
            onClick={() => {
              setFromDate("");
              setToDate("");
            }}
            className="rounded bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300 dark:bg-meta-4 dark:text-white"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        </div>
      ) : (
        <>
          {/* Brand Report Tab */}
          {activeTab === "brand" && (
            <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
              <div className="border-b border-stroke px-4 py-4 dark:border-strokedark">
                <h3 className="font-semibold text-black dark:text-white">
                  Sales by Brand - Total: ₹{totalBrandAmount.toLocaleString()}
                </h3>
              </div>
              <div className="max-w-full overflow-x-auto">
                <table className="w-full table-auto">
                  <thead>
                    <tr className="bg-gray-2 text-left dark:bg-meta-4">
                      <th className="px-4 py-4 font-medium text-black dark:text-white">Brand</th>
                      <th className="px-4 py-4 font-medium text-black dark:text-white text-right">Invoices</th>
                      <th className="px-4 py-4 font-medium text-black dark:text-white text-right">Qty Sold</th>
                      <th className="px-4 py-4 font-medium text-black dark:text-white text-right">Taxable</th>
                      <th className="px-4 py-4 font-medium text-black dark:text-white text-right">Total Amount</th>
                      <th className="px-4 py-4 font-medium text-black dark:text-white text-right">Share %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {brandData.map((row, i) => (
                      <tr key={i} className="border-b border-stroke dark:border-strokedark">
                        <td className="px-4 py-4 font-medium">{row.brand_name}</td>
                        <td className="px-4 py-4 text-right">{row.invoice_count}</td>
                        <td className="px-4 py-4 text-right">{row.total_quantity.toLocaleString()}</td>
                        <td className="px-4 py-4 text-right">₹{row.taxable_amount.toLocaleString()}</td>
                        <td className="px-4 py-4 text-right font-bold">₹{row.total_amount.toLocaleString()}</td>
                        <td className="px-4 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="h-2 w-20 rounded bg-gray-200 dark:bg-meta-4">
                              <div
                                className="h-full rounded bg-primary"
                                style={{ width: `${row.percentage}%` }}
                              ></div>
                            </div>
                            <span>{row.percentage}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {brandData.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                          No data available
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* State Report Tab */}
          {activeTab === "state" && (
            <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
              <div className="border-b border-stroke px-4 py-4 dark:border-strokedark">
                <h3 className="font-semibold text-black dark:text-white">
                  Sales by State - Total: ₹{totalStateAmount.toLocaleString()}
                </h3>
              </div>
              <div className="max-w-full overflow-x-auto">
                <table className="w-full table-auto">
                  <thead>
                    <tr className="bg-gray-2 text-left dark:bg-meta-4">
                      <th className="px-4 py-4 font-medium text-black dark:text-white">State</th>
                      <th className="px-4 py-4 font-medium text-black dark:text-white">Code</th>
                      <th className="px-4 py-4 font-medium text-black dark:text-white text-right">Invoices</th>
                      <th className="px-4 py-4 font-medium text-black dark:text-white text-right">Customers</th>
                      <th className="px-4 py-4 font-medium text-black dark:text-white text-right">SGST+CGST</th>
                      <th className="px-4 py-4 font-medium text-black dark:text-white text-right">IGST</th>
                      <th className="px-4 py-4 font-medium text-black dark:text-white text-right">Total</th>
                      <th className="px-4 py-4 font-medium text-black dark:text-white text-right">Share %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stateData.map((row, i) => (
                      <tr key={i} className="border-b border-stroke dark:border-strokedark">
                        <td className="px-4 py-4 font-medium">{row.state}</td>
                        <td className="px-4 py-4">{row.state_code || "-"}</td>
                        <td className="px-4 py-4 text-right">{row.invoice_count}</td>
                        <td className="px-4 py-4 text-right">{row.customer_count}</td>
                        <td className="px-4 py-4 text-right text-success">
                          {row.sgst_cgst > 0 ? `₹${row.sgst_cgst.toLocaleString()}` : "-"}
                        </td>
                        <td className="px-4 py-4 text-right text-warning">
                          {row.igst > 0 ? `₹${row.igst.toLocaleString()}` : "-"}
                        </td>
                        <td className="px-4 py-4 text-right font-bold">₹{row.total_amount.toLocaleString()}</td>
                        <td className="px-4 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="h-2 w-20 rounded bg-gray-200 dark:bg-meta-4">
                              <div
                                className="h-full rounded bg-primary"
                                style={{ width: `${row.percentage}%` }}
                              ></div>
                            </div>
                            <span>{row.percentage}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {stateData.length === 0 && (
                      <tr>
                        <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                          No data available
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Category Report Tab */}
          {activeTab === "category" && (
            <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
              <div className="border-b border-stroke px-4 py-4 dark:border-strokedark">
                <h3 className="font-semibold text-black dark:text-white">
                  Sales by Category - Total: ₹{totalCategoryAmount.toLocaleString()}
                </h3>
              </div>
              <div className="max-w-full overflow-x-auto">
                <table className="w-full table-auto">
                  <thead>
                    <tr className="bg-gray-2 text-left dark:bg-meta-4">
                      <th className="px-4 py-4 font-medium text-black dark:text-white">Category</th>
                      <th className="px-4 py-4 font-medium text-black dark:text-white text-right">Invoices</th>
                      <th className="px-4 py-4 font-medium text-black dark:text-white text-right">Qty Sold</th>
                      <th className="px-4 py-4 font-medium text-black dark:text-white text-right">Total Amount</th>
                      <th className="px-4 py-4 font-medium text-black dark:text-white text-right">Share %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categoryData.map((row, i) => (
                      <tr key={i} className="border-b border-stroke dark:border-strokedark">
                        <td className="px-4 py-4 font-medium">{row.category_name}</td>
                        <td className="px-4 py-4 text-right">{row.invoice_count}</td>
                        <td className="px-4 py-4 text-right">{row.total_quantity.toLocaleString()}</td>
                        <td className="px-4 py-4 text-right font-bold">₹{row.total_amount.toLocaleString()}</td>
                        <td className="px-4 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="h-2 w-20 rounded bg-gray-200 dark:bg-meta-4">
                              <div
                                className="h-full rounded bg-primary"
                                style={{ width: `${row.percentage}%` }}
                              ></div>
                            </div>
                            <span>{row.percentage}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {categoryData.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                          No data available
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Engineer Report Tab */}
          {activeTab === "engineer" && (
            <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
              <div className="border-b border-stroke px-4 py-4 dark:border-strokedark">
                <h3 className="font-semibold text-black dark:text-white">Sales by Engineer</h3>
              </div>
              <div className="max-w-full overflow-x-auto">
                <table className="w-full table-auto">
                  <thead>
                    <tr className="bg-gray-2 text-left dark:bg-meta-4">
                      <th className="px-4 py-4 font-medium text-black dark:text-white">Engineer</th>
                      <th className="px-4 py-4 font-medium text-black dark:text-white text-right">Total</th>
                      <th className="px-4 py-4 font-medium text-black dark:text-white text-right">Won</th>
                      <th className="px-4 py-4 font-medium text-black dark:text-white text-right">Lost</th>
                      <th className="px-4 py-4 font-medium text-black dark:text-white text-right">Open</th>
                      <th className="px-4 py-4 font-medium text-black dark:text-white text-right">Win Rate</th>
                      <th className="px-4 py-4 font-medium text-black dark:text-white text-right">Won Value</th>
                      <th className="px-4 py-4 font-medium text-black dark:text-white text-right">Pipeline</th>
                    </tr>
                  </thead>
                  <tbody>
                    {engineerData.map((row, i) => (
                      <tr key={i} className="border-b border-stroke dark:border-strokedark">
                        <td className="px-4 py-4 font-medium">{row.sales_person_name}</td>
                        <td className="px-4 py-4 text-right">{row.total_tickets}</td>
                        <td className="px-4 py-4 text-right text-success">{row.won}</td>
                        <td className="px-4 py-4 text-right text-danger">{row.lost}</td>
                        <td className="px-4 py-4 text-right">{row.open}</td>
                        <td className="px-4 py-4 text-right">
                          <span
                            className={`rounded px-2 py-1 text-sm ${
                              row.win_rate > 50
                                ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                                : row.win_rate > 25
                                ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                                : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                            }`}
                          >
                            {row.win_rate}%
                          </span>
                        </td>
                        <td className="px-4 py-4 text-right font-bold text-success">
                          ₹{row.won_value.toLocaleString()}
                        </td>
                        <td className="px-4 py-4 text-right text-primary">
                          ₹{row.pipeline_value.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                    {engineerData.length === 0 && (
                      <tr>
                        <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                          No data available
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}
