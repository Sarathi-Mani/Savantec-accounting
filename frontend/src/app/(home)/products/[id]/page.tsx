"use client";

import { useState, useEffect } from "react";
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
  brand?: { id?: string; name?: string } | null;
  category?: { id?: string; name?: string } | null;
  godown_name?: string | null;
  barcode?: string;
  opening_stock?: number | null;
  seller_points?: number | null;
  discount_type?: string | null;
  discount?: number | string | null;
  purchase_price?: number | string | null;
  profit_margin?: number | string | null;
  sales_price?: number | string | null;
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

    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Product Details", 14, 18);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString("en-IN")}`, 14, 24);

    autoTable(doc, {
      startY: 30,
      head: [["Field", "Value"]],
      body: [
        ["Name", product.name || "-"],
        ["Type", product.is_service ? "Service" : "Product"],
        ["SKU", product.sku || "-"],
        ["Barcode", product.barcode || "-"],
        ["HSN/SAC", product.hsn_code || "-"],
        ["Brand", product.brand?.name || "-"],
        ["Category", product.category?.name || "-"],
        ["Store", product.godown_name || company?.name || "-"],
        ["Unit", product.unit || "-"],
        ["Unit Price", `Rs. ${toNumber(product.unit_price).toFixed(2)}`],
        ["GST Rate", `${toNumber(product.gst_rate)}%`],
        ["Seller Points", `${toNumber(product.seller_points)}`],
        ["Discount", `${toNumber(product.discount)}${product.discount_type === "fixed" ? " (fixed)" : "%"}`],
        ["Purchase Price", `Rs. ${toNumber(product.purchase_price).toFixed(2)}`],
        ["Sales Price", `Rs. ${toNumber(product.sales_price).toFixed(2)}`],
        ["Profit Margin", `${toNumber(product.profit_margin)}%`],
        ["Opening Stock", `${toNumber(product.opening_stock)} ${product.unit || ""}`.trim()],
        ["Current Stock", `${toNumber(product.current_stock)} ${product.unit || ""}`.trim()],
        ["Min Stock Level", `${toNumber(product.min_stock_level)} ${product.unit || ""}`.trim()],
        ["Description", product.description || "-"],
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/products"
              className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{product.name}</h1>
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
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                SKU: {product.sku || "-"} {product.barcode ? `| Barcode: ${product.barcode}` : ""}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadPdf}
              className="px-4 py-2 text-indigo-600 dark:text-indigo-400 border border-indigo-300 dark:border-indigo-700 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20 flex items-center gap-2"
            >
              PDF
            </button>
            <Link
              href={`/products/${productId}/edit`}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
            >
              Edit
            </Link>
            <button
              onClick={handleDelete}
              className="px-4 py-2 text-red-600 dark:text-red-400 border border-red-300 dark:border-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
            >
              Delete
            </button>
          </div>
        </div>
      </div>

      <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          {(mainImage || additionalImage) && (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Images</h2>
              <div className="grid grid-cols-1 gap-4">
                {mainImage && (
                  <div>
                    <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">Main Image</p>
                    <img
                      src={mainImage}
                      alt={`${product.name} main`}
                      className="h-52 w-full rounded-lg border border-gray-200 dark:border-gray-700 object-cover"
                    />
                  </div>
                )}
                {additionalImage && (
                  <div>
                    <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">Additional Image</p>
                    <img
                      src={additionalImage}
                      alt={`${product.name} additional`}
                      className="h-52 w-full rounded-lg border border-gray-200 dark:border-gray-700 object-cover"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Details</h2>
            <dl className="space-y-4">
              <div>
                <dt className="text-sm text-gray-500 dark:text-gray-400">Brand</dt>
                <dd className="mt-1 text-gray-900 dark:text-white font-medium">{product.brand?.name || "-"}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500 dark:text-gray-400">Category</dt>
                <dd className="mt-1 text-gray-900 dark:text-white font-medium">{product.category?.name || "-"}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500 dark:text-gray-400">Store</dt>
                <dd className="mt-1 text-gray-900 dark:text-white font-medium">
                  {product.godown_name || company?.name || "-"}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500 dark:text-gray-400">HSN/SAC</dt>
                <dd className="mt-1 text-gray-900 dark:text-white font-medium">{product.hsn_code || "-"}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500 dark:text-gray-400">Unit Price</dt>
                <dd className="mt-1 text-gray-900 dark:text-white">Rs. {toNumber(product.unit_price).toFixed(2)}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500 dark:text-gray-400">GST Rate</dt>
                <dd className="mt-1 text-gray-900 dark:text-white">{toNumber(product.gst_rate)}%</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500 dark:text-gray-400">Seller Points</dt>
                <dd className="mt-1 text-gray-900 dark:text-white">{toNumber(product.seller_points)}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500 dark:text-gray-400">Discount</dt>
                <dd className="mt-1 text-gray-900 dark:text-white">
                  {toNumber(product.discount)}{product.discount_type === "fixed" ? " (fixed)" : "%"}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500 dark:text-gray-400">Purchase Price</dt>
                <dd className="mt-1 text-gray-900 dark:text-white">Rs. {toNumber(product.purchase_price).toFixed(2)}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500 dark:text-gray-400">Sales Price</dt>
                <dd className="mt-1 text-gray-900 dark:text-white">Rs. {toNumber(product.sales_price).toFixed(2)}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500 dark:text-gray-400">Profit Margin</dt>
                <dd className="mt-1 text-gray-900 dark:text-white">{toNumber(product.profit_margin)}%</dd>
              </div>
              {product.description && (
                <div>
                  <dt className="text-sm text-gray-500 dark:text-gray-400">Description</dt>
                  <dd className="mt-1 text-gray-700 dark:text-gray-300 text-sm whitespace-pre-wrap">
                    {product.description}
                  </dd>
                </div>
              )}
            </dl>
          </div>

          {!product.is_service && (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Stock</h2>
              <dl className="space-y-4">
                <div>
                  <dt className="text-sm text-gray-500 dark:text-gray-400">Opening Stock</dt>
                  <dd className="mt-1 text-gray-900 dark:text-white">
                    {toNumber(product.opening_stock)} {product.unit}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500 dark:text-gray-400">Current Stock</dt>
                  <dd className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
                    {toNumber(product.current_stock)} {product.unit}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500 dark:text-gray-400">Minimum Stock Level</dt>
                  <dd className="mt-1 text-gray-900 dark:text-white">
                    {toNumber(product.min_stock_level)} {product.unit}
                  </dd>
                </div>
              </dl>
            </div>
          )}
        </div>

        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Alternative Products ({alternatives.length})
              </h2>
              <Link
                href="/inventory/alternative-products"
                className="text-sm text-emerald-600 dark:text-emerald-400 hover:underline"
              >
                Manage Alternatives
              </Link>
            </div>

            {alternatives.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-gray-500 dark:text-gray-400 mb-4">No alternative products mapped yet.</p>
                <Link
                  href="/inventory/alternative-products"
                  className="inline-flex items-center px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm"
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
                          className="font-medium text-emerald-600 dark:text-emerald-400 hover:underline"
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
                        <span className="px-2 py-0.5 text-xs font-medium rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
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
    </div>
  );
}
