"use client";

import { useAuth } from "@/context/AuthContext";
import {
  productsApi,
  brandsApi,
  categoriesApi,
  inventoryApi,
  Godown,
  productUnitsApi,
} from "@/services/api";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

interface Brand {
  id: string;
  name: string;
}

interface Category {
  id: string;
  name: string;
}

interface UnitOption {
  value: string;
  label: string;
}

export default function NewProductPage() {
  const { company } = useAuth();
  const router = useRouter();
  const getToken = () => {
    if (typeof window === "undefined") return null;
    return (
      localStorage.getItem("employee_token") || localStorage.getItem("access_token")
    );
  };
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [brands, setBrands] = useState<Brand[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [godowns, setGodowns] = useState<Godown[]>([]);
  const [loadingBrands, setLoadingBrands] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [loadingGodowns, setLoadingGodowns] = useState(false);
  const [units, setUnits] = useState<UnitOption[]>([]);
  const [companySelection, setCompanySelection] = useState("company");

  const [formData, setFormData] = useState({
    // Item Basic Details - Required fields
    name: "",
    hsn_code: "",
    barcode: "",
    sku: "",
    brand_id: "",
    category_id: "",
    unit: "",
    alert_quantity: 0,
    opening_stock: 0,
    description: "",

    // Service toggle - Check if this exists in backend
    is_service: false,

    // Pricing Information
    unit_price: 0,
    seller_points: 0,
    discount_type: "percentage",
    discount: 0,
    gst_rate: "18", // Changed from tax_rate to gst_rate

    // Purchase Price Calculation - backend doesn't seem to use these
    purchase_price: 0,
    profit_margin: 0,

    // Sales price - backend uses unit_price as sales_price too
    sales_price: 0,

    // Additional fields from backend schema
    min_stock_level: 0, // This maps to alert_quantity in backend
    is_inclusive: false,
  });

  const [mainImage, setMainImage] = useState<File | null>(null);
  const [additionalImage, setAdditionalImage] = useState<File | null>(null);

  useEffect(() => {
    const fetchBrandsAndCategories = async () => {
      if (!company?.id) return;

      try {
        const unitsResult = await productUnitsApi.list(company.id, { page: 1, page_size: 500 });
        const availableUnits = unitsResult.units || [];
        setUnits(availableUnits);
        setFormData((prev) => ({
          ...prev,
          unit: availableUnits.some((item) => item.value === prev.unit)
            ? prev.unit
            : (availableUnits[0]?.value || ""),
        }));

        setLoadingBrands(true);
        const brandsResult = await brandsApi.list(company.id, { page: 1, page_size: 100 });
        setBrands(brandsResult.brands || brandsResult.data || []);

        setLoadingCategories(true);
        const categoriesResult = await categoriesApi.list(company.id, { page: 1, page_size: 100 });
        setCategories(categoriesResult.categories || categoriesResult.data || []);

        setLoadingGodowns(true);
        const godownsResult = await inventoryApi.listGodowns(company.id);
        setGodowns(godownsResult || []);
      } catch (error) {
        console.error("Failed to fetch brands/categories:", error);
      } finally {
        setLoadingBrands(false);
        setLoadingCategories(false);
        setLoadingGodowns(false);
      }
    };

    fetchBrandsAndCategories();
  }, [company?.id]);

  // Auto-calculate sales price and purchase price
  useEffect(() => {
    const unitPrice = formData.unit_price || 0;
    const discount = formData.discount || 0;
    const profitMargin = formData.profit_margin || 0;

    const discountAmount =
      formData.discount_type === "fixed"
        ? discount
        : (unitPrice * discount) / 100;
    const purchasePrice = Math.max(unitPrice - discountAmount, 0);

    // Calculate sales price (purchase price + profit margin)
    const profitAmount = purchasePrice * (profitMargin / 100);
    const salesPrice = purchasePrice + profitAmount;

    setFormData(prev => ({
      ...prev,
      purchase_price: Number(purchasePrice.toFixed(2)),
      sales_price: Number(salesPrice.toFixed(2))
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
        [name]: value === '' ? 0 : Number(value),
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
    // Allow only numbers and decimal points
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      const numValue = value === '' ? 0 : Number(value);
      setFormData((prev) => ({
        ...prev,
        [name]: numValue,
      }));
    }
  };

  const handleFileChange = (setter: React.Dispatch<React.SetStateAction<File | null>>) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        // Validate file size (1MB)
        if (file.size > 1024 * 1024) {
          alert("File size must be less than 1MB");
          return;
        }
        setter(file);
      }
    };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company?.id) return;

    if (!formData.name.trim()) {
      setError("Item name is required");
      return;
    }

    if (formData.unit_price <= 0) {
      setError("Valid price is required");
      return;
    }

    if (!formData.unit) {
      setError("Please select unit");
      return;
    }

    // Validate HSN code if provided
    if (formData.hsn_code && (!/^\d{4,8}$/.test(formData.hsn_code))) {
      setError("HSN code must be 4-8 digits");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const generateNextItemCode = async () => {
        const token = getToken();
        const apiUrl = `${process.env.NEXT_PUBLIC_API_URL}/companies/${company.id}/products?page=1&page_size=100`;
        const response = await fetch(apiUrl, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error("Failed to generate item code");
        }

        const data = await response.json();
        const products = Array.isArray(data) ? data : (data.products || []);
        const maxNumber = products.reduce((max: number, product: any) => {
          const code = String(product?.item_code || "");
          const match = code.match(/^Item-(\d+)$/i);
          if (!match) return max;
          return Math.max(max, parseInt(match[1], 10) || 0);
        }, 0);

        return `Item-${String(maxNumber + 1).padStart(3, "0")}`;
      };

      const nextItemCode = await generateNextItemCode();

      // Create FormData instead of JSON to include files
      const formDataToSend = new FormData();

      // Add all product fields
      formDataToSend.append('name', formData.name.trim());
      formDataToSend.append('item_code', nextItemCode);
      formDataToSend.append('hsn_code', formData.hsn_code || '');
      formDataToSend.append('barcode', formData.barcode || '');
      formDataToSend.append('sku', formData.sku || '');
      formDataToSend.append('brand_id', formData.brand_id || '');
      formDataToSend.append('category_id', formData.category_id || '');
      formDataToSend.append('unit', formData.unit);
      formDataToSend.append('alert_quantity', formData.alert_quantity.toString());
      formDataToSend.append('min_stock_level', formData.alert_quantity.toString());
      formDataToSend.append('opening_stock', formData.opening_stock.toString());
      formDataToSend.append('description', formData.description || '');
      formDataToSend.append('is_service', formData.is_service.toString());
      formDataToSend.append('is_inclusive', formData.is_inclusive.toString());
      formDataToSend.append('unit_price', formData.unit_price.toString());
      formDataToSend.append('gst_rate', formData.gst_rate);
      formDataToSend.append('discount_type', formData.discount_type);
      formDataToSend.append('discount', formData.discount.toString());
      formDataToSend.append('purchase_price', formData.purchase_price.toString());
      formDataToSend.append('profit_margin', formData.profit_margin.toString());
      formDataToSend.append('sales_price', formData.sales_price.toString());
      formDataToSend.append('seller_points', formData.seller_points.toString());

      // Send selected godown when chosen from Company dropdown
      if (companySelection.startsWith("godown:")) {
        formDataToSend.append("godown_id", companySelection.replace("godown:", ""));
      }

      // Add images if they exist
      if (mainImage) {
        formDataToSend.append('main_image', mainImage);
      }
      if (additionalImage) {
        formDataToSend.append('additional_image', additionalImage);
      }

      console.log("Sending form data with images");

      const token = getToken();
      const apiUrl = `${process.env.NEXT_PUBLIC_API_URL}/companies/${company.id}/products`;

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          // Don't set Content-Type header for FormData - let browser set it with boundary
        },
        body: formDataToSend,
      });

      console.log("Response status:", response.status);

      const responseText = await response.text();
      console.log("Response text:", responseText);

      if (response.ok) {
        const data = JSON.parse(responseText);
        console.log("Product created successfully with images:", data);

        showToast("Product created successfully!", "success");
        setTimeout(() => {
          router.push("/products");
        }, 1500);
      } else {
        let errorMessage = "Failed to create product";
        try {
          const errorData = JSON.parse(responseText);
          console.log("Error data:", errorData);

          if (errorData.detail) {
            if (Array.isArray(errorData.detail)) {
              errorMessage = errorData.detail.map((err: any) => {
                if (err.loc && err.msg) {
                  return `${err.loc[1]}: ${err.msg}`;
                }
                return err.msg || err.message;
              }).join(", ");
            } else if (typeof errorData.detail === 'string') {
              errorMessage = errorData.detail;
            } else if (errorData.detail?.msg) {
              errorMessage = errorData.detail.msg;
            }
          } else if (errorData.message) {
            errorMessage = errorData.message;
          }
        } catch (parseError) {
          console.error("Parse error:", parseError);
          errorMessage = responseText || "Unknown error occurred";
        }

        setError(errorMessage);
      }

    } catch (error: any) {
      console.error("Network or other error:", error);
      setError(error.message || "Network error occurred");
    } finally {
      setLoading(false);
    }
  };

  // Helper function to upload images
  const uploadImages = async (companyId: string, productId: string, mainImage: File | null, additionalImage: File | null) => {
    try {
      const token = getToken();

      if (mainImage) {
        const mainImageFormData = new FormData();
        mainImageFormData.append('main_image', mainImage);

        await fetch(`${process.env.NEXT_PUBLIC_API_URL}/companies/${companyId}/products/${productId}/images`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`,
          },
          body: mainImageFormData,
        });
      }

      if (additionalImage) {
        const additionalImageFormData = new FormData();
        additionalImageFormData.append('additional_image', additionalImage);

        await fetch(`${process.env.NEXT_PUBLIC_API_URL}/companies/${companyId}/products/${productId}/images`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`,
          },
          body: additionalImageFormData,
        });
      }
    } catch (error) {
      console.error("Failed to upload images:", error);
      // Don't fail the whole process if image upload fails
      showToast("Product created but image upload failed", "error");
    }
  };

  // Toast notification component
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
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

  return (
    <div className="relative w-full bg-gray-50 dark:bg-gray-900">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 rounded-lg px-6 py-3 text-white ${toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'
          }`}>
          {toast.message}
        </div>
      )}

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
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Create Item</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Create a new product item</p>
          </div>
        </div>
      </div>

      <div className="w-full p-4 sm:p-6">
        <div className="rounded-none border-0 bg-transparent p-0 shadow-none">
          <form data-ui="sf-form" onSubmit={handleSubmit}>
            {error && (
              <div className="mb-4 rounded-lg bg-red-50 p-4 text-red-600 dark:bg-red-900/20 dark:text-red-400">
                <p className="font-medium">Error: {error}</p>
                <p className="mt-2 text-sm">Please check all required fields and try again.</p>
              </div>
            )}

            <div className="space-y-6">
              {/* Item Basic Details */}
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
                      <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                        HSN
                      </label>
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
                      <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                        Barcode
                      </label>
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
                      <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                        SKU
                      </label>
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
                      <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                        Brand
                      </label>
                      <select
                        name="brand_id"
                        value={formData.brand_id}
                        onChange={handleChange}
                        className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 outline-none focus:border-primary dark:border-dark-3"
                        disabled={loadingBrands}
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
                      <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                        Category
                      </label>
                      <select
                        name="category_id"
                        value={formData.category_id}
                        onChange={handleChange}
                        className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 outline-none focus:border-primary dark:border-dark-3"
                        disabled={loadingCategories}
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
                      <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                        Company
                      </label>
                      <select
                        value={companySelection}
                        onChange={(e) => setCompanySelection(e.target.value)}
                        className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 text-dark outline-none focus:border-primary dark:border-dark-3 dark:text-white"
                      >
                        <option value="company">{company.name}</option>
                        {loadingGodowns ? (
                          <option value="loading" disabled>Loading godowns...</option>
                        ) : godowns.length > 0 ? (
                          godowns.map((godown) => (
                            <option key={godown.id} value={`godown:${godown.id}`}>
                              {godown.name}
                            </option>
                          ))
                        ) : null}
                      </select>
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                        Unit
                      </label>
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
                      <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                        Alert Quantity
                      </label>
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
                      <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                        Opening Stock
                      </label>
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
                      <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                        Description
                      </label>
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

              {/* Pricing Information */}
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
                        placeholder="Base price without tax"
                        min="0"
                        step="0.01"
                        required
                        className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 outline-none focus:border-primary dark:border-dark-3"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                        Seller Points
                      </label>
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
                      <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                        Discount Type
                      </label>
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
                      <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                        Discount
                      </label>
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

              {/* Purchase Price Calculation */}
              <div className="rounded-lg bg-white p-6 shadow-1 dark:bg-gray-dark">
                <h2 className="mb-4 text-lg font-semibold text-dark dark:text-white">Purchase Price Calculation</h2>
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                        Purchase Price
                      </label>
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
                      <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                        Profit Margin (%)
                      </label>
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

              {/* Sales & Profit Calculation */}
              <div className="rounded-lg bg-white p-6 shadow-1 dark:bg-gray-dark">
                <h2 className="mb-4 text-lg font-semibold text-dark dark:text-white">Sales & Profit Calculation</h2>
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                        Sales Price
                      </label>
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

              {/* Images */}
              <div className="rounded-lg bg-white p-6 shadow-1 dark:bg-gray-dark">
                <h2 className="mb-4 text-lg font-semibold text-dark dark:text-white">Images</h2>
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                        Main Image
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange(setMainImage)}
                        className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 outline-none focus:border-primary dark:border-dark-3"
                      />
                      <p className="mt-1 text-xs text-dark-6">Max Width/Height: 1000px + 1000px & Size: 1MB</p>
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                        Additional Image
                      </label>
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

              {/* Service Toggle and Inclusive Tax */}
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
              <hr></hr>
              <div className="rounded-lg p-4 shadow-none sm:p-6">
                <div className="px-0 py-0">
                  <div className="mx-auto flex w-full max-w-[560px] items-center justify-center gap-4 sm:gap-8">
                    <button
                      type="submit"
                      disabled={loading}
                      className="h-9 w-28 rounded-lg bg-primary text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60 sm:w-60"
                    >
                      {loading ? (
                        <span className="flex items-center justify-center gap-2">
                          <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Saving...
                        </span>
                      ) : "Save"}
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
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
