"use client";

import { useAuth } from "@/context/AuthContext";
import { vendorsApi, Vendor } from "@/services/api";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";

// Define form data type
interface VendorFormData {
  name: string;
  contact: string;
  email: string;
  mobile: string;
  tax_number: string;
  gst_registration_type: string;
  pan_number: string;
  vendor_code: string;
  opening_balance: string;
  opening_balance_type: "outstanding" | "advance";
  opening_balance_mode: "single" | "split";
  credit_limit: string;
  credit_days: string;
  payment_terms: string;
  tds_applicable: boolean;
  tds_rate: string;
  billing_address: string;
  billing_city: string;
  billing_state: string;
  billing_country: string;
  billing_zip: string;
  shipping_address: string;
  shipping_city: string;
  shipping_state: string;
  shipping_country: string;
  shipping_zip: string;
  is_active: boolean;
}

// GST Registration Types
const GST_REGISTRATION_TYPES = [
  "Unknown",
  "Composition",
  "Regular",
  "Unregistered/Consumer",
  "Government entity/TDS",
  
] as const;

export default function VendorEditPage() {
  const { company } = useAuth();
  const router = useRouter();
  const params = useParams();
  const vendorId = params.id as string;
  
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [sameAsBilling, setSameAsBilling] = useState(false);

  const [formData, setFormData] = useState<VendorFormData>({
    name: "",
    contact: "",
    email: "",
    mobile: "",
    tax_number: "",
    gst_registration_type: "",
    pan_number: "",
    vendor_code: "",
    opening_balance: "",
    opening_balance_type: "outstanding",
    opening_balance_mode: "single",
    credit_limit: "",
    credit_days: "",
    payment_terms: "",
    tds_applicable: false,
    tds_rate: "",
    billing_address: "",
    billing_city: "",
    billing_state: "",
    billing_country: "India",
    billing_zip: "",
    shipping_address: "",
    shipping_city: "",
    shipping_state: "",
    shipping_country: "India",
    shipping_zip: "",
    is_active: true,
  });

  useEffect(() => {
    const fetchVendor = async () => {
      if (!company?.id || !vendorId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const data = await vendorsApi.get(company.id, vendorId);
        setVendor(data);
        
        // Populate form with vendor data
        setFormData({
          name: data.name || "",
          contact: data.contact || "",
          email: data.email || "",
          mobile: data.mobile || "",
          tax_number: data.tax_number || "",
          gst_registration_type: data.gst_registration_type || "",
          pan_number: data.pan_number || "",
          vendor_code: data.vendor_code || "",
          opening_balance: data.opening_balance?.toString() || "",
          opening_balance_type: data.opening_balance_type || "outstanding",
          opening_balance_mode: data.opening_balance_mode || "single",
          credit_limit: data.credit_limit?.toString() || "",
          credit_days: data.credit_days?.toString() || "",
          payment_terms: data.payment_terms || "",
          tds_applicable: data.tds_applicable || false,
          tds_rate: data.tds_rate?.toString() || "",
          billing_address: data.billing_address || "",
          billing_city: data.billing_city || "",
          billing_state: data.billing_state || "",
          billing_country: data.billing_country || "India",
          billing_zip: data.billing_zip || "",
          shipping_address: data.shipping_address || "",
          shipping_city: data.shipping_city || "",
          shipping_state: data.shipping_state || "",
          shipping_country: data.shipping_country || "India",
          shipping_zip: data.shipping_zip || "",
          is_active: data.is_active || true,
        });

        // Check if shipping address is same as billing
        if (
          data.shipping_address === data.billing_address &&
          data.shipping_city === data.billing_city &&
          data.shipping_state === data.billing_state &&
          data.shipping_country === data.billing_country &&
          data.shipping_zip === data.billing_zip
        ) {
          setSameAsBilling(true);
        }
      } catch (error: any) {
        console.error("Failed to fetch vendor:", error);
        setError(error.message || "Failed to load vendor");
      } finally {
        setLoading(false);
      }
    };

    fetchVendor();
  }, [company?.id, vendorId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
    
    setFormError(null);
  };

  const handleCopyBillingToShipping = () => {
    setFormData(prev => ({
      ...prev,
      shipping_address: prev.billing_address,
      shipping_city: prev.billing_city,
      shipping_state: prev.billing_state,
      shipping_country: prev.billing_country,
      shipping_zip: prev.billing_zip,
    }));
    setSameAsBilling(true);
  };

  const validateForm = (): boolean => {
    if (!formData.name.trim()) {
      setFormError("Vendor name is required");
      return false;
    }

    if (!formData.contact.trim()) {
      setFormError("Primary contact number is required");
      return false;
    }

    // Validate contact number
    const contactRegex = /^[0-9]{10}$/;
    if (formData.contact && !contactRegex.test(formData.contact.replace(/\D/g, ''))) {
      setFormError("Please enter a valid 10-digit contact number");
      return false;
    }

    // Validate email if provided
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setFormError("Please enter a valid email address");
      return false;
    }

    // Validate PAN if provided
    if (formData.pan_number && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(formData.pan_number.toUpperCase())) {
      setFormError("Please enter a valid PAN number (e.g., ABCDE1234F)");
      return false;
    }

    // Validate GST if provided
    if (formData.tax_number && formData.tax_number.trim() !== "") {
      if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(formData.tax_number.toUpperCase())) {
        setFormError("Please enter a valid 15-digit GST number");
        return false;
      }
    }

    // Validate opening balance
    if (formData.opening_balance && isNaN(parseFloat(formData.opening_balance))) {
      setFormError("Please enter a valid opening balance amount");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!company?.id || !vendorId) {
      setFormError("Company or vendor ID not found");
      return;
    }

    if (!validateForm()) {
      return;
    }

    setSaving(true);
    setFormError(null);

    try {
      // Prepare update data
      const updateData = {
        name: formData.name,
        contact: formData.contact,
        email: formData.email || null,
        mobile: formData.mobile || null,
        tax_number: formData.tax_number || null,
        gst_registration_type: formData.gst_registration_type || null,
        pan_number: formData.pan_number || null,
        vendor_code: formData.vendor_code || null,
        opening_balance: formData.opening_balance ? parseFloat(formData.opening_balance) : 0,
        opening_balance_type: formData.opening_balance_type,
        opening_balance_mode: formData.opening_balance_mode,
        credit_limit: formData.credit_limit ? parseFloat(formData.credit_limit) : 0,
        credit_days: formData.credit_days ? parseInt(formData.credit_days) : 0,
        payment_terms: formData.payment_terms || null,
        tds_applicable: formData.tds_applicable,
        tds_rate: formData.tds_rate ? parseFloat(formData.tds_rate) : 0,
        billing_address: formData.billing_address || null,
        billing_city: formData.billing_city || null,
        billing_state: formData.billing_state || null,
        billing_country: formData.billing_country || "India",
        billing_zip: formData.billing_zip || null,
        shipping_address: sameAsBilling ? formData.billing_address : (formData.shipping_address || null),
        shipping_city: sameAsBilling ? formData.billing_city : (formData.shipping_city || null),
        shipping_state: sameAsBilling ? formData.billing_state : (formData.shipping_state || null),
        shipping_country: sameAsBilling ? formData.billing_country : (formData.shipping_country || "India"),
        shipping_zip: sameAsBilling ? formData.billing_zip : (formData.shipping_zip || null),
        is_active: formData.is_active,
      };

      await vendorsApi.update(company.id, vendorId, updateData);
      router.push(`/vendors/${vendorId}`);
    } catch (error: any) {
      console.error("Failed to update vendor:", error);
      setFormError(error.message || "Failed to update vendor");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 p-6 text-center dark:bg-red-900/20">
        <p className="text-red-600 dark:text-red-400">{error}</p>
        <Link href="/vendors" className="mt-4 inline-block text-primary hover:underline">
          ← Back to Vendors
        </Link>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="text-center py-12">
        <svg className="mx-auto mb-4 h-16 w-16 text-dark-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-dark-6">Vendor not found</p>
        <Link href="/vendors" className="mt-4 inline-flex items-center gap-2 text-primary hover:underline">
          ← Back to Vendors
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Link href={`/vendors/${vendorId}`} className="text-dark-6 hover:text-dark dark:text-gray-400 dark:hover:text-white">
              ← Back to Vendor
            </Link>
            <h1 className="text-2xl font-bold text-dark dark:text-white">Edit Vendor</h1>
          </div>
          <p className="mt-1 text-sm text-dark-6">Update vendor information</p>
        </div>
        
        <Link
          href={`/vendors/${vendorId}`}
          className="inline-flex items-center gap-2 rounded-lg border border-stroke px-4 py-2 text-sm font-medium text-dark transition hover:bg-gray-100 dark:border-dark-3 dark:text-white dark:hover:bg-dark-3"
        >
          Cancel
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Error Message */}
        {formError && (
          <div className="rounded-lg bg-red-50 p-4 text-red-600 dark:bg-red-900/20 dark:text-red-400">
            {formError}
          </div>
        )}

        {/* Basic Information */}
        <div className="rounded-lg bg-white p-6 shadow-1 dark:bg-gray-dark">
          <h2 className="mb-4 text-lg font-semibold text-dark dark:text-white">Basic Information</h2>
          
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                Vendor Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter vendor name"
                required
                className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 outline-none focus:border-primary dark:border-dark-3"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                  Vendor Code
                </label>
                <input
                  type="text"
                  name="vendor_code"
                  value={formData.vendor_code}
                  onChange={handleChange}
                  placeholder="Enter vendor code"
                  className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 outline-none focus:border-primary dark:border-dark-3"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                  Primary Contact <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  name="contact"
                  value={formData.contact}
                  onChange={handleChange}
                  placeholder="Enter contact number"
                  required
                  className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 outline-none focus:border-primary dark:border-dark-3"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Enter email address"
                  className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 outline-none focus:border-primary dark:border-dark-3"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                  Mobile
                </label>
                <input
                  type="tel"
                  name="mobile"
                  value={formData.mobile}
                  onChange={handleChange}
                  placeholder="Enter mobile number"
                  className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 outline-none focus:border-primary dark:border-dark-3"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Tax Information */}
        <div className="rounded-lg bg-white p-6 shadow-1 dark:bg-gray-dark">
          <h2 className="mb-4 text-lg font-semibold text-dark dark:text-white">Tax Information</h2>
          
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                  PAN Number
                </label>
                <input
                  type="text"
                  name="pan_number"
                  value={formData.pan_number}
                  onChange={handleChange}
                  placeholder="Enter PAN number (e.g., ABCDE1234F)"
                  className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 outline-none focus:border-primary dark:border-dark-3"
                  maxLength={10}
                  style={{ textTransform: 'uppercase' }}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                  GST Number
                </label>
                <input
                  type="text"
                  name="tax_number"
                  value={formData.tax_number}
                  onChange={handleChange}
                  placeholder="Enter 15-digit GST number"
                  className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 outline-none focus:border-primary dark:border-dark-3"
                  maxLength={15}
                  style={{ textTransform: 'uppercase' }}
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                GST Registration Type
              </label>
              <select
                name="gst_registration_type"
                value={formData.gst_registration_type}
                onChange={handleChange}
                className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 outline-none focus:border-primary dark:border-dark-3"
              >
                <option value="">Select registration type</option>
                {GST_REGISTRATION_TYPES.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="tds_applicable"
                  name="tds_applicable"
                  checked={formData.tds_applicable}
                  onChange={handleChange}
                  className="h-4 w-4 rounded border-stroke text-primary focus:ring-primary dark:border-dark-3"
                />
                <label htmlFor="tds_applicable" className="ml-2 text-sm text-dark dark:text-white">
                  TDS Applicable
                </label>
              </div>

              {formData.tds_applicable && (
                <div>
                  <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                    TDS Rate (%)
                  </label>
                  <input
                    type="number"
                    name="tds_rate"
                    value={formData.tds_rate}
                    onChange={handleChange}
                    placeholder="Enter TDS rate"
                    step="0.01"
                    min="0"
                    max="100"
                    className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 outline-none focus:border-primary dark:border-dark-3"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Financial Information */}
        <div className="rounded-lg bg-white p-6 shadow-1 dark:bg-gray-dark">
          <h2 className="mb-4 text-lg font-semibold text-dark dark:text-white">Financial Information</h2>
          
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                  Opening Balance
                </label>
                <input
                  type="number"
                  name="opening_balance"
                  value={formData.opening_balance}
                  onChange={handleChange}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 outline-none focus:border-primary dark:border-dark-3"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                  Opening Balance Type
                </label>
                <select
                  name="opening_balance_type"
                  value={formData.opening_balance_type}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 outline-none focus:border-primary dark:border-dark-3"
                >
                  <option value="outstanding">Outstanding (You Owe Vendor)</option>
                  <option value="advance">Advance (Vendor Owes You)</option>
                </select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                  Credit Limit
                </label>
                <input
                  type="number"
                  name="credit_limit"
                  value={formData.credit_limit}
                  onChange={handleChange}
                  placeholder="Enter credit limit"
                  step="0.01"
                  min="0"
                  className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 outline-none focus:border-primary dark:border-dark-3"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                  Credit Days
                </label>
                <input
                  type="number"
                  name="credit_days"
                  value={formData.credit_days}
                  onChange={handleChange}
                  placeholder="Enter credit days"
                  min="0"
                  className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 outline-none focus:border-primary dark:border-dark-3"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                Payment Terms
              </label>
              <textarea
                name="payment_terms"
                value={formData.payment_terms}
                onChange={handleChange}
                placeholder="Enter payment terms (e.g., Net 30, 2% 10 Net 30)"
                rows={2}
                className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 outline-none focus:border-primary dark:border-dark-3"
              />
            </div>
          </div>
        </div>

        {/* Billing Address */}
        <div className="rounded-lg bg-white p-6 shadow-1 dark:bg-gray-dark">
          <h2 className="mb-4 text-lg font-semibold text-dark dark:text-white">Billing Address</h2>
          
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                Address
              </label>
              <textarea
                name="billing_address"
                value={formData.billing_address}
                onChange={handleChange}
                placeholder="Enter billing address"
                rows={2}
                className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 outline-none focus:border-primary dark:border-dark-3"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                  City
                </label>
                <input
                  type="text"
                  name="billing_city"
                  value={formData.billing_city}
                  onChange={handleChange}
                  placeholder="Enter city"
                  className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 outline-none focus:border-primary dark:border-dark-3"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                  State
                </label>
                <input
                  type="text"
                  name="billing_state"
                  value={formData.billing_state}
                  onChange={handleChange}
                  placeholder="Enter state"
                  className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 outline-none focus:border-primary dark:border-dark-3"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                  Country
                </label>
                <input
                  type="text"
                  name="billing_country"
                  value={formData.billing_country}
                  onChange={handleChange}
                  placeholder="Enter country"
                  className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 outline-none focus:border-primary dark:border-dark-3"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                  Pincode
                </label>
                <input
                  type="text"
                  name="billing_zip"
                  value={formData.billing_zip}
                  onChange={handleChange}
                  placeholder="Enter pincode"
                  className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 outline-none focus:border-primary dark:border-dark-3"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Shipping Address */}
        <div className="rounded-lg bg-white p-6 shadow-1 dark:bg-gray-dark">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-dark dark:text-white">Shipping Address</h2>
            <button
              type="button"
              onClick={handleCopyBillingToShipping}
              className="inline-flex items-center gap-2 rounded-lg border border-stroke px-4 py-2 text-sm font-medium text-dark transition hover:bg-gray-100 dark:border-dark-3 dark:text-white dark:hover:bg-dark-3"
            >
              Copy from Billing
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                Address
              </label>
              <textarea
                name="shipping_address"
                value={formData.shipping_address}
                onChange={handleChange}
                placeholder="Enter shipping address"
                rows={2}
                className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 outline-none focus:border-primary dark:border-dark-3"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                  City
                </label>
                <input
                  type="text"
                  name="shipping_city"
                  value={formData.shipping_city}
                  onChange={handleChange}
                  placeholder="Enter city"
                  className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 outline-none focus:border-primary dark:border-dark-3"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                  State
                </label>
                <input
                  type="text"
                  name="shipping_state"
                  value={formData.shipping_state}
                  onChange={handleChange}
                  placeholder="Enter state"
                  className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 outline-none focus:border-primary dark:border-dark-3"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                  Country
                </label>
                <input
                  type="text"
                  name="shipping_country"
                  value={formData.shipping_country}
                  onChange={handleChange}
                  placeholder="Enter country"
                  className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 outline-none focus:border-primary dark:border-dark-3"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                  Pincode
                </label>
                <input
                  type="text"
                  name="shipping_zip"
                  value={formData.shipping_zip}
                  onChange={handleChange}
                  placeholder="Enter pincode"
                  className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 outline-none focus:border-primary dark:border-dark-3"
                />
              </div>
            </div>
          </div>
        </div>

         
        {/* Submit Buttons */}
        <div className="flex justify-end gap-4">
          <Link
            href={`/vendors/${vendorId}`}
            className="rounded-lg border border-stroke px-6 py-3 font-medium text-dark transition hover:bg-gray-100 dark:border-dark-3 dark:text-white dark:hover:bg-dark-3"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-primary px-6 py-3 font-medium text-white transition hover:bg-opacity-90 disabled:opacity-50"
          >
            {saving ? (
              <span className="flex items-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                Saving...
              </span>
            ) : (
              "Update Vendor"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}