"use client";

import { useState, useEffect, type ReactNode } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  productsApi,
  alternativeProductsApi,
  Product,
  AlternativeForProduct,
} from "@/services/api";
import { useAuth } from "@/context/AuthContext";

type ProductDetails = Product & {
  brand?: { id?: string; name?: string } | string | null;
  category?: { id?: string; name?: string } | string | null;
  godown_name?: string | null;
  barcode?: string;
  opening_stock?: number | null;
  seller_points?: number | null;
  discount_type?: string | null;
  discount?: number | string | null;
  purchase_price?: number | string | null;
  profit_margin?: number | string | null;
  sales_price?: number | string | null;
  alert_quantity?: number | null;
};

const resolveName = (
  field: { id?: string; name?: string } | string | null | undefined,
  fallbackName?: string | null,
): string => {
  if (!field && !fallbackName) return "-";
  if (typeof field === "string") return field || fallbackName || "-";
  if (field && typeof field === "object") return field.name || fallbackName || "-";
  return fallbackName || "-";
};

const getProductImageUrl = (raw?: string | null) => {
  if (!raw) return null;
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  const apiBase = process.env.NEXT_PUBLIC_API_URL || "";
  const base = apiBase.replace(/\/api\/?$/, "");
  if (raw.startsWith("/")) return `${base}${raw}`;
  return `${base}/${raw}`;
};

const toNumber = (value: number | string | undefined | null, fallback = 0) => {
  if (value === undefined || value === null) return fallback;
  const num = typeof value === "number" ? value : parseFloat(value);
  return Number.isFinite(num) ? num : fallback;
};

const getAlertQuantity = (product: ProductDetails) =>
  toNumber(product.alert_quantity ?? product.min_stock_level ?? 0);

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { company } = useAuth();
  const productId = params.id as string;

  const [product, setProduct] = useState<ProductDetails | null>(null);
  const [alternatives, setAlternatives] = useState<AlternativeForProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const companyId =
    company?.id || (typeof window !== "undefined" ? localStorage.getItem("company_id") : null);

  useEffect(() => {
    if (companyId && productId) {
      fetchProductData();
    }
  }, [companyId, productId]);

  const fetchProductData = async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const [productData, alternativesData] = await Promise.all([
        productsApi.get(companyId, productId),
        alternativeProductsApi.getAlternativesForProduct(companyId, productId),
      ]);
      setProduct(productData as ProductDetails);
      setAlternatives(alternativesData);
    } catch (err: any) {
      setError(err.message || "Failed to fetch product details");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!companyId) return;
    if (!confirm("Are you sure you want to delete this product?")) return;
    try {
      await productsApi.delete(companyId, productId);
      router.push("/products");
    } catch (err: any) {
      alert(err.message || "Failed to delete product");
    }
  };

  const handleDownloadPdf = () => {
    if (!product) return;
    const mainImageUrl = getProductImageUrl(
      product.image_url || product.main_image_url || product.image || product.main_image || null
    );
    const additionalImageUrl = getProductImageUrl(
      product.additional_image_url || product.additional_image || null
    );

    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Product Details", 14, 18);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString("en-IN")}`, 14, 24);

    autoTable(doc, {
      startY: 30,
      head: [["Field", "Value"]],
      body: [
        ["Item Name", product.name || "-"],
        ["HSN", product.hsn_code || "-"],
        ["Barcode", product.barcode || "-"],
        ["SKU", product.sku || "-"],
        ["Brand", resolveName(product.brand, product.brand_name)],
        ["Category", resolveName(product.category, product.category_name)],
        ["Company", product.godown_name || company?.name || "-"],
        ["Unit", product.unit || "-"],
        ["Alert Quantity", `${getAlertQuantity(product)} ${product.unit || ""}`.trim()],
        ["Opening Stock", `${toNumber(product.opening_stock)} ${product.unit || ""}`.trim()],
        ["Description", product.description || "-"],
        ["Unit Price", `Rs. ${toNumber(product.unit_price).toFixed(2)}`],
        ["Seller Points", `${toNumber(product.seller_points)}`],
        ["Discount Type", product.discount_type || "-"],
        ["Discount", `${toNumber(product.discount)}${product.discount_type === "fixed" ? " (fixed)" : "%"}`],
        ["GST %", `${toNumber(product.gst_rate)}%`],
        ["Purchase Price", `Rs. ${toNumber(product.purchase_price).toFixed(2)}`],
        ["Profit Margin (%)", `${toNumber(product.profit_margin)}%`],
        ["Sales Price", `Rs. ${toNumber(product.sales_price).toFixed(2)}`],
        ["Current Stock", `${toNumber(product.current_stock)} ${product.unit || ""}`.trim()],
        ["Minimum Stock Level", `${toNumber(product.min_stock_level)} ${product.unit || ""}`.trim()],
        ["Main Image", mainImageUrl || "-"],
        ["Additional Image", additionalImageUrl || "-"],
      ],
      styles: { fontSize: 9, cellPadding: 2.5 },
      headStyles: { fillColor: [79, 70, 229] },
    });

    doc.save(`product-${(product.name || product.id).replace(/\s+/g, "-").toLowerCase()}.pdf`);
  };

  if (!companyId) {
    return (
      <div className="p-6 text-center text-gray-500 dark:text-gray-400">
        Please select a company first.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="p-6 text-center text-gray-500 dark:text-gray-400">
        {error || "Product not found"}
      </div>
    );
  }

  const mainImage = getProductImageUrl(
    product.image_url || product.main_image_url || product.image || product.main_image || null
  );
  const additionalImage = getProductImageUrl(
    product.additional_image_url || product.additional_image || null
  );
  const detailRows: Array<{ label: string; value: ReactNode }> = [
    { label: "Item Name", value: product.name || "-" },
    { label: "HSN", value: product.hsn_code || "-" },
    { label: "Barcode", value: product.barcode || "-" },
    { label: "SKU", value: product.sku || "-" },
    { label: "Brand", value: resolveName(product.brand, product.brand_name) },
    { label: "Category", value: resolveName(product.category, product.category_name) },
    { label: "Company", value: product.godown_name || company?.name || "-" },
    { label: "Unit", value: product.unit || "-" },
    { label: "Alert Quantity", value: `${getAlertQuantity(product)} ${product.unit || ""}`.trim() },
    { label: "Opening Stock", value: `${toNumber(product.opening_stock)} ${product.unit || ""}`.trim() },
    { label: "Description", value: product.description || "-" },
    // { label: "Is Service", value: product.is_service ? "Yes" : "No" },
    { label: "Unit Price", value: `Rs. ${toNumber(product.unit_price).toFixed(2)}` },
    { label: "Seller Points", value: `${toNumber(product.seller_points)}` },
    { label: "Discount Type", value: product.discount_type || "-" },
    {
      label: "Discount",
      value: `${toNumber(product.discount)}${product.discount_type === "fixed" ? " (fixed)" : "%"}`,
    },
    { label: "GST %", value: `${toNumber(product.gst_rate)}%` },
    { label: "Purchase Price", value: `Rs. ${toNumber(product.purchase_price).toFixed(2)}` },
    { label: "Profit Margin (%)", value: `${toNumber(product.profit_margin)}%` },
    { label: "Sales Price", value: `Rs. ${toNumber(product.sales_price).toFixed(2)}` },
    // { label: "Price Inclusive of Tax", value: product.is_inclusive ? "Yes" : "No" },
    { label: "Current Stock", value: `${toNumber(product.current_stock)} ${product.unit || ""}`.trim() },
    { label: "Minimum Stock Level", value: `${toNumber(product.min_stock_level)} ${product.unit || ""}`.trim() },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-3 sm:items-center sm:gap-4">
            <Link
              href="/products"
              className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <h1 className="truncate text-xl font-bold text-gray-900 sm:text-2xl dark:text-white">{product.name}</h1>
                {product.is_service && (
                  <span className="px-2 py-1 text-xs font-medium rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">
                    Service
                  </span>
                )}
                {!product.is_active && (
                  <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                    Inactive
                  </span>
                )}
              </div>
              <p className="mt-1 break-words text-sm text-gray-500 dark:text-gray-400">
                SKU: {product.sku || "-"} {product.barcode ? `| Barcode: ${product.barcode}` : ""}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:flex sm:items-center sm:justify-end">
            <button
              onClick={handleDownloadPdf}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-indigo-300 px-4 py-2 text-indigo-600 hover:bg-indigo-50 sm:w-auto dark:border-indigo-700 dark:text-indigo-400 dark:hover:bg-indigo-900/20"
            >
              PDF
            </button>
            <Link
              href={`/products/${productId}/edit`}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-100 sm:w-auto dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              Edit
            </Link>
            <button
              onClick={handleDelete}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-red-300 px-4 py-2 text-red-600 hover:bg-red-50 sm:w-auto dark:border-red-600 dark:text-red-400 dark:hover:bg-red-900/20"
            >
              Delete
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-6 p-6">
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
          <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Product Details</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {detailRows.map((row) => (
                  <tr key={row.label}>
                    <th className="w-10 bg-white px-6 py-3 text-left text-sm font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                      {row.label}
                    </th>
                    <td className="whitespace-pre-wrap px-6 py-3 text-sm text-gray-900 dark:text-gray-100">
                      {row.value}
                    </td>
                  </tr>
                ))}
                <tr>
                  <th className="bg-white px-6 py-3 text-left text-sm font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-300">Main Image</th>
                  <td className="px-6 py-3 text-sm text-gray-900 dark:text-gray-100">
                    {mainImage ? (
                      <img
                        src={mainImage}
                        alt={`${product.name} main`}
                        className="h-auto w-auto max-w-[220px] rounded-lg border border-gray-200 object-contain dark:border-gray-700"
                      />
                    ) : (
                      "-"
                    )}
                  </td>
                </tr>
                <tr>
                  <th className="bg-white px-6 py-3 text-left text-sm font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-300">Additional Image</th>
                  <td className="px-6 py-3 text-sm text-gray-900 dark:text-gray-100">
                    {additionalImage ? (
                      <img
                        src={additionalImage}
                        alt={`${product.name} additional`}
                        className="h-auto w-auto max-w-[220px] rounded-lg border border-gray-200 object-contain dark:border-gray-700"
                      />
                    ) : (
                      "-"
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Alternative Products ({alternatives.length})
            </h2>
            <Link
              href="/inventory/alternative-products"
              className="text-sm text-emerald-600 hover:underline dark:text-emerald-400"
            >
              Manage Alternatives
            </Link>
          </div>

          {alternatives.length === 0 ? (
            <div className="p-12 text-center">
              <p className="mb-4 text-gray-500 dark:text-gray-400">No alternative products mapped yet.</p>
              <Link
                href="/inventory/alternative-products"
                className="inline-flex items-center rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-700"
              >
                Browse Alternatives
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {alternatives.map((alt) => (
                <div key={alt.mapping_id} className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <div className="flex items-start justify-between">
                    <div>
                      <Link
                        href={`/inventory/alternative-products/${alt.alternative_id}`}
                        className="font-medium text-emerald-600 hover:underline dark:text-emerald-400"
                      >
                        {alt.alternative_name}
                      </Link>
                      <div className="mt-1 flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                        {alt.manufacturer && <span>{alt.manufacturer}</span>}
                        {alt.model_number && <span>Model: {alt.model_number}</span>}
                      </div>
                      {alt.reference_price && (
                        <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">
                          Ref. Price: Rs. {Number(alt.reference_price).toLocaleString()}
                        </p>
                      )}
                      {alt.notes && (
                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{alt.notes}</p>
                      )}
                    </div>
                    {alt.priority > 0 && (
                      <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                        Priority: {alt.priority}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
