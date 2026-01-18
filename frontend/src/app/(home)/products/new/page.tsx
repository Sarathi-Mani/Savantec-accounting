"use client";

import { useAuth } from "@/context/AuthContext";
import { productsApi, brandsApi, categoriesApi, getErrorMessage } from "@/services/api";
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

export default function NewProductPage() {
  const { company } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [brands, setBrands] = useState<Brand[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingBrands, setLoadingBrands] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(false);

  const [formData, setFormData] = useState({
    // Item Basic Details
    name: "",
    hsn_code: "",
    barcode: "",
    sku: "",
    brand_id: "",
    category_id: "",
    unit: "unit",
    alert_quantity: "0",
    opening_stock: "0",
    description: "",
    
    // Service toggle
    is_service: false,
    
    // Pricing Information
    price: "",
    seller_points: "0",
    discount_type: "percentage",
    discount: "0",
    gst_rate: "18",
    
    // Purchase Price Calculation
    purchase_price: "",
    profit_margin: "",
    
    // Sales & Profit Calculation
    sales_price: "",
  });

  const [mainImage, setMainImage] = useState<File | null>(null);
  const [additionalImage, setAdditionalImage] = useState<File | null>(null);

  useEffect(() => {
    const fetchBrandsAndCategories = async () => {
      if (!company?.id) return;

      try {
        setLoadingBrands(true);
        const brandsResult = await brandsApi.list(company.id, { page: 1, page_size: 100 });
        setBrands(brandsResult.brands);

        setLoadingCategories(true);
        const categoriesResult = await categoriesApi.list(company.id, { page: 1, page_size: 100 });
        setCategories(categoriesResult.categories);
      } catch (error) {
        console.error("Failed to fetch brands/categories:", error);
      } finally {
        setLoadingBrands(false);
        setLoadingCategories(false);
      }
    };

    fetchBrandsAndCategories();
  }, [company?.id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({
        ...prev,
        [name]: checked,
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
      setFormData((prev) => ({
        ...prev,
        [name]: value,
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

    if (!formData.price || parseFloat(formData.price) <= 0) {
      setError("Valid price is required");
      return;
    }

    // Validate HSN code if provided
    if (formData.hsn_code && (!/^\d{4,8}$/.test(formData.hsn_code))) {
      setError("HSN code must be 4-8 digits");
      return;
    }

    // Convert numeric fields
    const price = parseFloat(formData.price) || 0;
    const openingStock = parseFloat(formData.opening_stock) || 0;
    const alertQuantity = parseFloat(formData.alert_quantity) || 0;
    const sellerPoints = parseFloat(formData.seller_points) || 0;
    const discount = parseFloat(formData.discount) || 0;
    const gstRate = parseFloat(formData.gst_rate) || 18;
    const purchasePrice = parseFloat(formData.purchase_price) || 0;
    const profitMargin = parseFloat(formData.profit_margin) || 0;
    const salesPrice = parseFloat(formData.sales_price) || 0;

    setLoading(true);
    setError(null);

    try {
      const formDataToSend = new FormData();
      
      // Append all form data
      Object.entries(formData).forEach(([key, value]) => {
        formDataToSend.append(key, value.toString());
      });
      
      // Append company ID
      formDataToSend.append('company_id', company.id);
      
      // Append numeric values properly
      formDataToSend.append('unit_price', price.toString());
      formDataToSend.append('opening_stock', openingStock.toString());
      formDataToSend.append('alert_quantity', alertQuantity.toString());
      formDataToSend.append('seller_points', sellerPoints.toString());
      formDataToSend.append('discount', discount.toString());
      formDataToSend.append('gst_rate', gstRate.toString());
      formDataToSend.append('purchase_price', purchasePrice.toString());
      formDataToSend.append('profit_margin', profitMargin.toString());
      formDataToSend.append('sales_price', salesPrice.toString());
      
      // Append images
      if (mainImage) {
        formDataToSend.append("main_image", mainImage);
      }
      if (additionalImage) {
        formDataToSend.append("additional_image", additionalImage);
      }

      await productsApi.create(company.id, formDataToSend);
      router.push("/products");
    } catch (error: any) {
      setError(getErrorMessage(error, "Failed to create product"));
    } finally {
      setLoading(false);
    }
  };

  if (!company) {
    return (
      <div className="rounded-lg bg-white p-8 text-center shadow-1 dark:bg-gray-dark">
        <p className="text-dark-6">Please select a company first</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark dark:text-white">Create Item</h1>
          <p className="text-sm text-dark-6">Dashboard &gt; Items &gt; Create</p>
        </div>
        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-lg border border-stroke px-6 py-3 font-medium text-dark transition hover:bg-gray-100 dark:border-dark-3 dark:text-white dark:hover:bg-dark-3"
          >
            Close
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-4xl">
        {error && (
          <div className="mb-6 rounded-lg bg-red-50 p-4 text-red-600 dark:bg-red-900/20 dark:text-red-400">
            {error}
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
                  <input
                    type="text"
                    value={company.name}
                    readOnly
                    className="w-full rounded-lg border border-stroke bg-gray-50 px-4 py-3 text-dark-6 dark:border-dark-3 dark:bg-dark-2"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                    Unit
                  </label>
                  <select
                    name="unit"
                    value={formData.unit}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 outline-none focus:border-primary dark:border-dark-3"
                  >
                    <option value="unit">Unit</option>
                    <option value="pcs">Pieces</option>
                    <option value="kg">KG</option>
                    <option value="gm">Gram</option>
                    <option value="ltr">Litre</option>
                    <option value="ml">ML</option>
                    <option value="mtr">Metre</option>
                    <option value="sqft">Sq.Ft</option>
                    <option value="sqm">Sq.M</option>
                    <option value="box">Box</option>
                    <option value="pack">Pack</option>
                    <option value="hr">Hour</option>
                    <option value="day">Day</option>
                    <option value="month">Month</option>
                  </select>
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
            <h2 className="mb-4 text-lg font-semibold text-dark dark:text-white">💰 Pricing Information</h2>
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                    Price <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="price"
                    value={formData.price}
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
                    Tax %
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
            <h2 className="mb-4 text-lg font-semibold text-dark dark:text-white">🧮 Purchase Price Calculation</h2>
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
                    onChange={handleNumberChange}
                    placeholder="Price + Tax Amount"
                    min="0"
                    step="0.01"
                    className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 outline-none focus:border-primary dark:border-dark-3"
                  />
                  <p className="mt-1 text-xs text-dark-6">Auto Calculate</p>
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
            <h2 className="mb-4 text-lg font-semibold text-dark dark:text-white">📊 Sales & Profit Calculation</h2>
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
                    onChange={handleNumberChange}
                    placeholder="Final selling price"
                    min="0"
                    step="0.01"
                    className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 outline-none focus:border-primary dark:border-dark-3"
                  />
                  <p className="mt-1 text-xs text-dark-6">Auto Calculate</p>
                </div>
              </div>
            </div>
          </div>

          {/* Images */}
          <div className="rounded-lg bg-white p-6 shadow-1 dark:bg-gray-dark">
            <h2 className="mb-4 text-lg font-semibold text-dark dark:text-white">🖼 Images</h2>
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

          {/* Service Toggle */}
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

          {/* Submit Buttons */}
          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="rounded-lg border border-stroke px-6 py-3 font-medium text-dark transition hover:bg-gray-100 dark:border-dark-3 dark:text-white dark:hover:bg-dark-3"
            >
              Close
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-primary px-6 py-3 font-medium text-white transition hover:bg-opacity-90 disabled:opacity-50"
            >
              {loading ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}