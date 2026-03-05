"use client";

import { useAuth } from "@/context/AuthContext";
import { productsApi, brandsApi, categoriesApi, inventoryApi, Godown, getErrorMessage } from "@/services/api";
import { getStoredProductUnits, ProductUnitOption } from "@/utils/product-units";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

interface Brand {
  id: string;
  name: string;
}

interface Category {
  id: string;
  name: string;
}

const getProductImageUrl = (raw?: string | null) => {
  if (!raw) return null;
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  const apiBase = process.env.NEXT_PUBLIC_API_URL || "";
  const base = apiBase.replace(/\/api\/?$/, "");
  if (raw.startsWith("/")) return `${base}${raw}`;
  return `${base}/${raw}`;
};

export default function EditProductPage() {
  const { company } = useAuth();
  const router = useRouter();
  const params = useParams();
  const productId = params.id as string;
  const companyId =
    company?.id ||
    (typeof window !== "undefined" ? localStorage.getItem("company_id") : null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [brands, setBrands] = useState<Brand[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [godowns, setGodowns] = useState<Godown[]>([]);
  const [units, setUnits] = useState<ProductUnitOption[]>([]);
  const [companySelection, setCompanySelection] = useState("company");

  const [mainImage, setMainImage] = useState<File | null>(null);
  const [additionalImage, setAdditionalImage] = useState<File | null>(null);
  const [mainImageUrl, setMainImageUrl] = useState<string | null>(null);
  const [additionalImageUrl, setAdditionalImageUrl] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    hsn_code: "",
    barcode: "",
    sku: "",
    brand_id: "",
    category_id: "",
    unit: "unit",
    alert_quantity: 0,
    opening_stock: 0,
    description: "",
    is_service: false,
    unit_price: 0,
    seller_points: 0,
    discount_type: "percentage",
    discount: 0,
    gst_rate: "18",
    purchase_price: 0,
    profit_margin: 0,
    sales_price: 0,
    min_stock_level: 0,
    is_inclusive: false,
  });

  useEffect(() => {
    const fetchInitialData = async () => {
      if (!companyId || !productId) return;

      try {
        setLoading(true);

        const [brandsResult, categoriesResult, godownsResult, product] = await Promise.all([
          brandsApi.list(companyId, { page: 1, page_size: 100 }),
          categoriesApi.list(companyId, { page: 1, page_size: 100 }),
          inventoryApi.listGodowns(companyId),
          productsApi.get(companyId, productId),
        ]);

        setBrands(brandsResult.brands || brandsResult.data || []);
        setCategories(categoriesResult.categories || categoriesResult.data || []);
        setGodowns(godownsResult || []);

        setFormData({
          name: product.name || "",
          hsn_code: product.hsn_code || "",
          barcode: product.barcode || "",
          sku: product.sku || "",
          brand_id: (product as any).brand_id || (product as any).brand?.id || "",
          category_id: (product as any).category_id || (product as any).category?.id || "",
          unit: product.unit || "unit",
          alert_quantity: Number((product as any).alert_quantity ?? (product as any).min_stock_level ?? 0),
          opening_stock: Number((product as any).opening_stock ?? 0),
          description: product.description || "",
          is_service: Boolean(product.is_service),
          unit_price: Number(product.unit_price || 0),
          seller_points: Number((product as any).seller_points ?? 0),
          discount_type: (product as any).discount_type || "percentage",
          discount: Number((product as any).discount ?? 0),
          gst_rate: String(product.gst_rate || "18"),
          purchase_price: Number((product as any).purchase_price ?? 0),
          profit_margin: Number((product as any).profit_margin ?? 0),
          sales_price: Number((product as any).sales_price ?? 0),
          min_stock_level: Number((product as any).min_stock_level ?? (product as any).alert_quantity ?? 0),
          is_inclusive: Boolean(product.is_inclusive),
        });

        if ((product as any).godown_id) {
          setCompanySelection(`godown:${(product as any).godown_id}`);
        } else {
          setCompanySelection("company");
        }

        setMainImageUrl(
          getProductImageUrl(
            product.image_url || product.main_image_url || product.image || product.main_image || null
          )
        );
        setAdditionalImageUrl(
          getProductImageUrl(
            product.additional_image_url || product.additional_image || null
          )
        );

        const availableUnits = getStoredProductUnits(companyId);
        const currentUnit = product.unit || "";
        const hasCurrentUnit = availableUnits.some((item) => item.value === currentUnit);
        const mergedUnits = hasCurrentUnit || !currentUnit
          ? availableUnits
          : [...availableUnits, { value: currentUnit, label: currentUnit }];
        setUnits(mergedUnits);
      } catch (err: any) {
        setError(getErrorMessage(err, "Failed to load product details"));
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, [companyId, productId]);

  useEffect(() => {
    const unitPrice = formData.unit_price || 0;
    const discount = formData.discount || 0;
    const profitMargin = formData.profit_margin || 0;

    const discountAmount =
      formData.discount_type === "fixed"
        ? discount
        : (unitPrice * discount) / 100;
    const purchasePrice = Math.max(unitPrice - discountAmount, 0);
    const profitAmount = purchasePrice * (profitMargin / 100);
    const salesPrice = purchasePrice + profitAmount;

    setFormData((prev) => ({
      ...prev,
      purchase_price: Number(purchasePrice.toFixed(2)),
      sales_price: Number(salesPrice.toFixed(2)),
    }));
  }, [formData.unit_price, formData.discount, formData.discount_type, formData.profit_margin]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;

    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({
        ...prev,
        [name]: checked,
      }));
    } else if (type === "number") {
      setFormData((prev) => ({
        ...prev,
        [name]: value === "" ? 0 : Number(value),
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
    setError(null);
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (value === "" || /^\d*\.?\d*$/.test(value)) {
      setFormData((prev) => ({
        ...prev,
        [name]: value === "" ? 0 : Number(value),
      }));
    }
    setError(null);
  };

  const handleFileChange = (setter: React.Dispatch<React.SetStateAction<File | null>>) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        if (file.size > 1024 * 1024) {
          alert("File size must be less than 1MB");
          return;
        }
        setter(file);
      }
    };

  const mainImagePreview = useMemo(
    () => (mainImage ? URL.createObjectURL(mainImage) : null),
    [mainImage]
  );
  const additionalImagePreview = useMemo(
    () => (additionalImage ? URL.createObjectURL(additionalImage) : null),
    [additionalImage]
  );

  useEffect(() => {
    return () => {
      if (mainImagePreview) URL.revokeObjectURL(mainImagePreview);
      if (additionalImagePreview) URL.revokeObjectURL(additionalImagePreview);
    };
  }, [mainImagePreview, additionalImagePreview]);

  const uploadImages = async (companyId: string, currentProductId: string, main: File | null, additional: File | null) => {
    try {
      const token = localStorage.getItem("employee_token") || localStorage.getItem("access_token");

      if (main) {
        const mainFormData = new FormData();
        mainFormData.append("main_image", main);
        await fetch(`${process.env.NEXT_PUBLIC_API_URL}/companies/${companyId}/products/${currentProductId}/images`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: mainFormData,
        });
      }

      if (additional) {
        const additionalFormData = new FormData();
        additionalFormData.append("additional_image", additional);
        await fetch(`${process.env.NEXT_PUBLIC_API_URL}/companies/${companyId}/products/${currentProductId}/images`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: additionalFormData,
        });
      }
    } catch (err) {
      console.error("Failed to upload images:", err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId || !productId) return;

    if (!formData.name.trim()) {
      setError("Item name is required");
      return;
    }

    if (formData.unit_price <= 0) {
      setError("Valid price is required");
      return;
    }

    if (formData.hsn_code && !/^\d{4,8}$/.test(formData.hsn_code)) {
      setError("HSN code must be 4-8 digits");
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const payload: any = {
        name: formData.name.trim(),
        hsn_code: formData.hsn_code || undefined,
        barcode: formData.barcode || undefined,
        sku: formData.sku || undefined,
        brand_id: formData.brand_id || undefined,
        category_id: formData.category_id || undefined,
        unit: formData.unit,
        alert_quantity: formData.alert_quantity,
        min_stock_level: formData.alert_quantity,
        opening_stock: formData.opening_stock,
        description: formData.description || undefined,
        is_service: formData.is_service,
        is_inclusive: formData.is_inclusive,
        unit_price: formData.unit_price,
        gst_rate: formData.gst_rate,
        seller_points: formData.seller_points,
        discount_type: formData.discount_type,
        discount: formData.discount,
        purchase_price: formData.purchase_price,
        profit_margin: formData.profit_margin,
        sales_price: formData.sales_price,
      };

      if (companySelection.startsWith("godown:")) {
        payload.godown_id = companySelection.replace("godown:", "");
      }

      await productsApi.update(companyId, productId, payload);

      if (mainImage || additionalImage) {
        await uploadImages(companyId, productId, mainImage, additionalImage);
      }

      router.push("/products");
    } catch (err: any) {
      setError(getErrorMessage(err, "Failed to update product"));
    } finally {
      setSaving(false);
    }
  };

  if (!company) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 dark:bg-gray-900">
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-900/20">
          <p className="text-yellow-800 dark:text-yellow-400">Please select a company first.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 py-20 dark:bg-gray-900">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="relative w-full bg-gray-50 dark:bg-gray-900">
      <div className="border-b border-gray-200 bg-white px-4 py-4 dark:border-gray-700 dark:bg-gray-800 sm:px-6">
        <div className="flex items-start gap-3">
          <Link
            href="/products"
            className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full
                     bg-primary text-white
                     transition hover:bg-primary/90 sm:h-10 sm:w-10"
          >
            <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Edit Item</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Update product item details</p>
          </div>
        </div>
      </div>

      <div className="w-full p-4 sm:p-6">
      <form data-ui="sf-form" onSubmit={handleSubmit}>
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-4 text-red-600 dark:bg-red-900/20 dark:text-red-400">
            <p className="font-medium">Error: {error}</p>
            <p className="mt-2 text-sm">Please check all required fields and try again.</p>
          </div>
        )}

        <div className="space-y-6">
          <div className="rounded-lg bg-white p-6 shadow-1 dark:bg-gray-dark">
            <h2 className="mb-4 text-lg font-semibold text-dark dark:text-white">Item Basic Details</h2>
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                  Item Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Enter item name"
                  className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 outline-none focus:border-primary dark:border-dark-3"
                  required
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-dark dark:text-white">HSN</label>
                  <input
                    type="text"
                    name="hsn_code"
                    value={formData.hsn_code}
                    onChange={handleChange}
                    placeholder="Enter HSN code"
                    className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 outline-none focus:border-primary dark:border-dark-3"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-dark dark:text-white">Barcode</label>
                  <input
                    type="text"
                    name="barcode"
                    value={formData.barcode}
                    onChange={handleChange}
                    placeholder="Enter barcode"
                    className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 outline-none focus:border-primary dark:border-dark-3"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-dark dark:text-white">SKU</label>
                  <input
                    type="text"
                    name="sku"
                    value={formData.sku}
                    onChange={handleChange}
                    placeholder="Enter SKU"
                    className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 outline-none focus:border-primary dark:border-dark-3"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-dark dark:text-white">Brand</label>
                  <select
                    name="brand_id"
                    value={formData.brand_id}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 outline-none focus:border-primary dark:border-dark-3"
                  >
                    <option value="">Select...</option>
                    {brands.map((brand) => (
                      <option key={brand.id} value={brand.id}>
                        {brand.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-dark dark:text-white">Category</label>
                  <select
                    name="category_id"
                    value={formData.category_id}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 outline-none focus:border-primary dark:border-dark-3"
                  >
                    <option value="">Select...</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-dark dark:text-white">Company</label>
                  <select
                    value={companySelection}
                    onChange={(e) => setCompanySelection(e.target.value)}
                    className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 text-dark outline-none focus:border-primary dark:border-dark-3 dark:text-white"
                  >
                    <option value="company">{company.name}</option>
                    {godowns.map((godown) => (
                      <option key={godown.id} value={`godown:${godown.id}`}>
                        {godown.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-dark dark:text-white">Unit</label>
                  <select
                    name="unit"
                    value={formData.unit}
                    onChange={handleChange}
                    disabled={units.length === 0}
                    className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 outline-none focus:border-primary dark:border-dark-3"
                  >
                    <option value="" disabled>
                      {units.length > 0 ? "Select unit" : "No units available"}
                    </option>
                    {units.map((unit) => (
                      <option key={unit.value} value={unit.value}>
                        {unit.label}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-dark-6">
                    Need more units? <a className="text-primary underline" href="/products/units">Add Unit</a>
                  </p>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-dark dark:text-white">Alert Quantity</label>
                  <input
                    type="number"
                    name="alert_quantity"
                    value={formData.alert_quantity}
                    onChange={handleNumberChange}
                    min="0"
                    step="1"
                    className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 outline-none focus:border-primary dark:border-dark-3"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-dark dark:text-white">Opening Stock</label>
                  <input
                    type="number"
                    name="opening_stock"
                    value={formData.opening_stock}
                    onChange={handleNumberChange}
                    min="0"
                    step="1"
                    className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 outline-none focus:border-primary dark:border-dark-3"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-dark dark:text-white">Description</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    rows={3}
                    placeholder="Enter item description"
                    className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 outline-none focus:border-primary dark:border-dark-3"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-white p-6 shadow-1 dark:bg-gray-dark">
            <h2 className="mb-4 text-lg font-semibold text-dark dark:text-white">Pricing Information</h2>
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                    Unit Price <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="unit_price"
                    value={formData.unit_price}
                    onChange={handleNumberChange}
                    min="0"
                    step="0.01"
                    required
                    className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 outline-none focus:border-primary dark:border-dark-3"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-dark dark:text-white">Seller Points</label>
                  <input
                    type="number"
                    name="seller_points"
                    value={formData.seller_points}
                    onChange={handleNumberChange}
                    min="0"
                    step="1"
                    className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 outline-none focus:border-primary dark:border-dark-3"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-dark dark:text-white">Discount Type</label>
                  <select
                    name="discount_type"
                    value={formData.discount_type}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 outline-none focus:border-primary dark:border-dark-3"
                  >
                    <option value="percentage">Percentage</option>
                    <option value="fixed">Fixed Amount</option>
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-dark dark:text-white">Discount</label>
                  <input
                    type="number"
                    name="discount"
                    value={formData.discount}
                    onChange={handleNumberChange}
                    min="0"
                    step="0.01"
                    className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 outline-none focus:border-primary dark:border-dark-3"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                    GST % <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="gst_rate"
                    value={formData.gst_rate}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 outline-none focus:border-primary dark:border-dark-3"
                  >
                    <option value="0">0% (Exempt)</option>
                    <option value="5">5%</option>
                    <option value="12">12%</option>
                    <option value="18">18%</option>
                    <option value="28">28%</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-white p-6 shadow-1 dark:bg-gray-dark">
            <h2 className="mb-4 text-lg font-semibold text-dark dark:text-white">Purchase Price Calculation</h2>
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-dark dark:text-white">Purchase Price</label>
                  <input
                    type="number"
                    name="purchase_price"
                    value={formData.purchase_price}
                    readOnly
                    className="w-full rounded-lg border border-stroke bg-gray-50 px-4 py-3 text-dark-6 dark:border-dark-3 dark:bg-dark-2"
                  />
                  <p className="mt-1 text-xs text-dark-6">Auto Calculated: Unit Price - Discount (GST excluded)</p>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-dark dark:text-white">Profit Margin (%)</label>
                  <input
                    type="number"
                    name="profit_margin"
                    value={formData.profit_margin}
                    onChange={handleNumberChange}
                    min="0"
                    step="0.01"
                    className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 outline-none focus:border-primary dark:border-dark-3"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-white p-6 shadow-1 dark:bg-gray-dark">
            <h2 className="mb-4 text-lg font-semibold text-dark dark:text-white">Sales & Profit Calculation</h2>
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-dark dark:text-white">Sales Price</label>
                  <input
                    type="number"
                    name="sales_price"
                    value={formData.sales_price}
                    readOnly
                    className="w-full rounded-lg border border-stroke bg-gray-50 px-4 py-3 text-dark-6 dark:border-dark-3 dark:bg-dark-2"
                  />
                  <p className="mt-1 text-xs text-dark-6">Auto Calculated: Purchase Price + Profit Margin</p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-white p-6 shadow-1 dark:bg-gray-dark">
            <h2 className="mb-4 text-lg font-semibold text-dark dark:text-white">Images</h2>
            <div className="space-y-4">
              {(mainImageUrl || additionalImageUrl || mainImagePreview || additionalImagePreview) && (
                <div className="grid gap-4 md:grid-cols-2">
                  {(mainImagePreview || mainImageUrl) && (
                    <div>
                      <p className="mb-2 text-sm text-dark dark:text-white">Current Main Image</p>
                      <img
                        src={mainImagePreview || mainImageUrl || ""}
                        alt="Main product"
                        className="h-40 w-full rounded-lg border border-stroke object-cover dark:border-dark-3"
                      />
                    </div>
                  )}
                  {(additionalImagePreview || additionalImageUrl) && (
                    <div>
                      <p className="mb-2 text-sm text-dark dark:text-white">Current Additional Image</p>
                      <img
                        src={additionalImagePreview || additionalImageUrl || ""}
                        alt="Additional product"
                        className="h-40 w-full rounded-lg border border-stroke object-cover dark:border-dark-3"
                      />
                    </div>
                  )}
                </div>
              )}
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-dark dark:text-white">Main Image</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange(setMainImage)}
                    className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 outline-none focus:border-primary dark:border-dark-3"
                  />
                  <p className="mt-1 text-xs text-dark-6">Max Width/Height: 1000px + 1000px & Size: 1MB</p>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-dark dark:text-white">Additional Image</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange(setAdditionalImage)}
                    className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 outline-none focus:border-primary dark:border-dark-3"
                  />
                  <p className="mt-1 text-xs text-dark-6">Max Width/Height: 1000px + 1000px & Size: 1MB</p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-lg bg-white p-6 shadow-1 dark:bg-gray-dark">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="is_service"
                  name="is_service"
                  checked={formData.is_service}
                  onChange={handleChange}
                  className="h-5 w-5 rounded border-stroke text-primary focus:ring-primary dark:border-dark-3"
                />
                <label htmlFor="is_service" className="text-sm font-medium text-dark dark:text-white">
                  This is a service (no inventory tracking)
                </label>
              </div>
            </div>

            <div className="rounded-lg bg-white p-6 shadow-1 dark:bg-gray-dark">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="is_inclusive"
                  name="is_inclusive"
                  checked={formData.is_inclusive}
                  onChange={handleChange}
                  className="h-5 w-5 rounded border-stroke text-primary focus:ring-primary dark:border-dark-3"
                />
                <label htmlFor="is_inclusive" className="text-sm font-medium text-dark dark:text-white">
                  Price is inclusive of tax
                </label>
              </div>
            </div>
          </div>

          <hr />

          <div className="rounded-lg p-4 shadow-none">
            <div className="mx-auto flex w-full max-w-[560px] items-center justify-center gap-4 sm:gap-8">
              <button
                type="submit"
                disabled={saving}
                className="h-9 w-28 rounded-lg bg-primary text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60 sm:w-60"
              >
                {saving ? "Updating..." : "Update"}
              </button>
              <button
                type="button"
                onClick={() => router.push("/products")}
                className="h-9 w-28 rounded-lg bg-[#E5E7EB] text-sm font-medium text-black transition-colors hover:bg-[#e9ebf0] dark:bg-dark-3 dark:text-white dark:hover:bg-dark-2 sm:w-60"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </form>
      </div>
    </div>
  );
}
