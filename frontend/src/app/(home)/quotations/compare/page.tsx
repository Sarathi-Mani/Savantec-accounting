"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import { useAuth } from "@/context/AuthContext";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:6768";

interface Quotation {
  id: string;
  quotation_number: string;
  quotation_date: string;
  customer_name: string;
  status: string;
  currency_code: string;
  subtotal: number;
  discount_amount: number;
  total_tax: number;
  total_amount: number;
  terms: string | null;
  payment_terms: string | null;
  validity_date: string | null;
  items: QuotationItem[];
}

interface QuotationItem {
  id: string;
  description: string;
  hsn_code: string | null;
  quantity: number;
  unit: string;
  unit_price: number;
  discount_percent: number;
  gst_rate: number;
  total_amount: number;
}

interface ComparisonResult {
  quotations: Quotation[];
  items_comparison: {
    description: string;
    hsn_code: string | null;
    quotations: Record<string, { quantity: number; unit_price: number; discount_percent: number; total_amount: number }>;
    price_range: { min: number; max: number; difference: number };
    total_range: { min: number; max: number };
  }[];
  summary: {
    lowest_total: number;
    highest_total: number;
    average_total: number;
    difference: number;
    lowest_quotation_id: string;
    highest_quotation_id: string;
  };
}

interface QuotationOption {
  id: string;
  quotation_number: string;
  customer_name: string;
  total_amount: number;
}

export default function QuotationComparePage() {
  const { company, getToken } = useAuth();
  const searchParams = useSearchParams();
  
  const [quotationOptions, setQuotationOptions] = useState<QuotationOption[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [comparison, setComparison] = useState<ComparisonResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingOptions, setLoadingOptions] = useState(true);

  useEffect(() => {
    if (company?.id) {
      fetchQuotationOptions();
    }
  }, [company]);

  useEffect(() => {
    // Pre-populate from URL params
    const idsParam = searchParams.get("ids");
    if (idsParam) {
      setSelectedIds(idsParam.split(","));
    }
  }, [searchParams]);

  const fetchQuotationOptions = async () => {
    try {
      const token = getToken();
      const response = await fetch(
        `${API_BASE}/api/companies/${company?.id}/quotations?page_size=100`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.ok) {
        const data = await response.json();
        setQuotationOptions(data.items || []);
      }
    } catch (error) {
      console.error("Error fetching quotations:", error);
    } finally {
      setLoadingOptions(false);
    }
  };

  const handleCompare = async () => {
    if (selectedIds.length < 2) {
      alert("Please select at least 2 quotations to compare");
      return;
    }
    
    setLoading(true);
    try {
      const token = getToken();
      const response = await fetch(
        `${API_BASE}/api/companies/${company?.id}/quotations/compare`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ quotation_ids: selectedIds }),
        }
      );
      if (response.ok) {
        setComparison(await response.json());
      } else {
        const error = await response.json();
        alert(error.detail || "Error comparing quotations");
      }
    } catch (error) {
      console.error("Error comparing quotations:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleQuotation = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((i) => i !== id));
    } else if (selectedIds.length < 5) {
      setSelectedIds([...selectedIds, id]);
    } else {
      alert("Maximum 5 quotations can be compared at once");
    }
  };

  const getCurrencySymbol = (code: string) => {
    const symbols: Record<string, string> = { INR: "₹", USD: "$", EUR: "€" };
    return symbols[code] || code;
  };

  return (
    <>
      <Breadcrumb pageName="Compare Quotations" />

      {/* Selection Panel */}
      <div className="mb-6 rounded-sm border border-stroke bg-white p-6 shadow-default dark:border-strokedark dark:bg-boxdark">
        <h3 className="mb-4 font-semibold text-black dark:text-white">
          Select Quotations to Compare (2-5)
        </h3>
        
        {loadingOptions ? (
          <div className="flex justify-center p-4">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {quotationOptions.map((q) => (
              <label
                key={q.id}
                className={`flex cursor-pointer items-center justify-between rounded border p-3 transition-colors ${
                  selectedIds.includes(q.id)
                    ? "border-primary bg-primary/10"
                    : "border-stroke hover:border-primary dark:border-strokedark"
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(q.id)}
                    onChange={() => toggleQuotation(q.id)}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <div>
                    <p className="font-medium text-black dark:text-white">{q.quotation_number}</p>
                    <p className="text-sm text-gray-500">{q.customer_name || "No Customer"}</p>
                  </div>
                </div>
                <span className="font-bold text-primary">₹{q.total_amount?.toLocaleString()}</span>
              </label>
            ))}
          </div>
        )}
        
        <div className="mt-4 flex items-center justify-between">
          <span className="text-sm text-gray-500">
            {selectedIds.length} quotation(s) selected
          </span>
          <button
            onClick={handleCompare}
            disabled={selectedIds.length < 2 || loading}
            className="rounded bg-primary px-6 py-2 text-white hover:bg-primary/90 disabled:opacity-50"
          >
            {loading ? "Comparing..." : "Compare Selected"}
          </button>
        </div>
      </div>

      {/* Comparison Results */}
      {comparison && (
        <div className="space-y-6">
          {/* Summary */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div className="rounded-sm border border-stroke bg-white p-4 shadow-default dark:border-strokedark dark:bg-boxdark">
              <p className="text-sm text-gray-500">Lowest Total</p>
              <p className="text-xl font-bold text-success">
                ₹{comparison.summary.lowest_total?.toLocaleString()}
              </p>
            </div>
            <div className="rounded-sm border border-stroke bg-white p-4 shadow-default dark:border-strokedark dark:bg-boxdark">
              <p className="text-sm text-gray-500">Highest Total</p>
              <p className="text-xl font-bold text-danger">
                ₹{comparison.summary.highest_total?.toLocaleString()}
              </p>
            </div>
            <div className="rounded-sm border border-stroke bg-white p-4 shadow-default dark:border-strokedark dark:bg-boxdark">
              <p className="text-sm text-gray-500">Difference</p>
              <p className="text-xl font-bold text-warning">
                ₹{comparison.summary.difference?.toLocaleString()}
              </p>
            </div>
            <div className="rounded-sm border border-stroke bg-white p-4 shadow-default dark:border-strokedark dark:bg-boxdark">
              <p className="text-sm text-gray-500">Average</p>
              <p className="text-xl font-bold text-black dark:text-white">
                ₹{comparison.summary.average_total?.toLocaleString()}
              </p>
            </div>
          </div>

          {/* Side by Side Comparison */}
          <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
            <div className="border-b border-stroke px-4 py-4 dark:border-strokedark">
              <h3 className="font-semibold text-black dark:text-white">Quotation Overview</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-2 dark:bg-meta-4">
                    <th className="px-4 py-3 text-left font-medium text-black dark:text-white">Field</th>
                    {comparison.quotations.map((q) => (
                      <th
                        key={q.id}
                        className={`px-4 py-3 text-center font-medium ${
                          q.id === comparison.summary.lowest_quotation_id
                            ? "bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                            : ""
                        }`}
                      >
                        {q.quotation_number}
                        {q.id === comparison.summary.lowest_quotation_id && (
                          <span className="ml-1 text-xs">(Best)</span>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-stroke dark:border-strokedark">
                    <td className="px-4 py-3 font-medium">Customer</td>
                    {comparison.quotations.map((q) => (
                      <td key={q.id} className="px-4 py-3 text-center">{q.customer_name || "-"}</td>
                    ))}
                  </tr>
                  <tr className="border-b border-stroke dark:border-strokedark">
                    <td className="px-4 py-3 font-medium">Date</td>
                    {comparison.quotations.map((q) => (
                      <td key={q.id} className="px-4 py-3 text-center">
                        {q.quotation_date ? new Date(q.quotation_date).toLocaleDateString() : "-"}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-stroke dark:border-strokedark">
                    <td className="px-4 py-3 font-medium">Status</td>
                    {comparison.quotations.map((q) => (
                      <td key={q.id} className="px-4 py-3 text-center">
                        <span className="rounded bg-gray-100 px-2 py-1 text-xs capitalize dark:bg-meta-4">
                          {q.status}
                        </span>
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-stroke dark:border-strokedark">
                    <td className="px-4 py-3 font-medium">Subtotal</td>
                    {comparison.quotations.map((q) => (
                      <td key={q.id} className="px-4 py-3 text-center">
                        {getCurrencySymbol(q.currency_code)}{q.subtotal.toLocaleString()}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-stroke dark:border-strokedark">
                    <td className="px-4 py-3 font-medium">Discount</td>
                    {comparison.quotations.map((q) => (
                      <td key={q.id} className="px-4 py-3 text-center text-danger">
                        -{getCurrencySymbol(q.currency_code)}{q.discount_amount.toLocaleString()}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-stroke dark:border-strokedark">
                    <td className="px-4 py-3 font-medium">Tax</td>
                    {comparison.quotations.map((q) => (
                      <td key={q.id} className="px-4 py-3 text-center">
                        {getCurrencySymbol(q.currency_code)}{q.total_tax.toLocaleString()}
                      </td>
                    ))}
                  </tr>
                  <tr className="bg-gray-2 dark:bg-meta-4 font-bold">
                    <td className="px-4 py-3">Total Amount</td>
                    {comparison.quotations.map((q) => (
                      <td
                        key={q.id}
                        className={`px-4 py-3 text-center ${
                          q.id === comparison.summary.lowest_quotation_id ? "text-success" : ""
                        }`}
                      >
                        {getCurrencySymbol(q.currency_code)}{q.total_amount.toLocaleString()}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Items Comparison */}
          <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
            <div className="border-b border-stroke px-4 py-4 dark:border-strokedark">
              <h3 className="font-semibold text-black dark:text-white">Item-by-Item Comparison</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-2 dark:bg-meta-4">
                    <th className="px-4 py-3 text-left font-medium text-black dark:text-white">Item</th>
                    {comparison.quotations.map((q) => (
                      <th key={q.id} className="px-4 py-3 text-center font-medium">
                        {q.quotation_number}
                      </th>
                    ))}
                    <th className="px-4 py-3 text-center font-medium text-black dark:text-white">Price Diff</th>
                  </tr>
                </thead>
                <tbody>
                  {comparison.items_comparison.map((item, idx) => (
                    <tr key={idx} className="border-b border-stroke dark:border-strokedark">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium">{item.description}</p>
                          {item.hsn_code && <p className="text-xs text-gray-500">HSN: {item.hsn_code}</p>}
                        </div>
                      </td>
                      {comparison.quotations.map((q) => {
                        const itemData = item.quotations[q.id];
                        const isLowest = itemData && itemData.unit_price === item.price_range.min;
                        return (
                          <td
                            key={q.id}
                            className={`px-4 py-3 text-center ${isLowest ? "text-success" : ""}`}
                          >
                            {itemData ? (
                              <>
                                <p className="font-medium">₹{itemData.unit_price.toLocaleString()}</p>
                                <p className="text-xs text-gray-500">
                                  Qty: {itemData.quantity} | Total: ₹{itemData.total_amount.toLocaleString()}
                                </p>
                              </>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                        );
                      })}
                      <td className="px-4 py-3 text-center">
                        {item.price_range.difference > 0 ? (
                          <span className="rounded bg-yellow-100 px-2 py-1 text-sm text-yellow-800">
                            ₹{item.price_range.difference.toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
