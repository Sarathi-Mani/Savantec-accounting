"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:6768/api";
const STATIC_BASE_URL = API_BASE.replace(/\/api$/, "") || "http://localhost:6768";

interface Enquiry {
  id: string;
  enquiry_number: string;
  enquiry_date: string;
  subject: string;
  status: string;
  priority: string;
  source: string;
  description?: string;
  additional_details?: string;
  expected_value: number;
  customer_name?: string;
  customer_email?: string;
  customer_mobile?: string;
  contact_name?: string;
  sales_person_name?: string;
  ticket_number?: string;
  prospect_name?: string;
  prospect_email?: string;
  prospect_phone?: string;
  prospect_company?: string;
  
  // Additional fields from Laravel
  company?: {
    name: string;
  };
  company_id?: string;
  contact_person?: string;
  kind_attn?: string;
  mail_id?: string;
  phone_no?: string;
  product?: string;
  quantity?: number;
  remarks?: string;
  salesman?: {
    name: string;
  };
  salesman_id?: string;
  items?: EnquiryItem[];
  pending_remarks?: string;
  quotation_no?: string;
  quotation_date?: string;
}

interface EnquiryItem {
  id?: string;
  item_id?: string;
  product_id?: string;
  description: string;
  quantity: number;
  suitable_item?: string;
  purchase_price?: number;
  sales_price?: number;
  image?: string;
  existing_image?: string;
  custom_item?: string;
  product_name?: string; // Added for display
}

interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  contact_persons?: Array<{
    id: string;
    name: string;
    email?: string;
    phone?: string;
    is_primary?: boolean;
  }>;
}

export default function EditEnquiryPage() {
  const router = useRouter();
  const params = useParams();
  const enquiryId = params.id as string;
  const { getToken, user } = useAuth();
  
  const [enquiry, setEnquiry] = useState<Enquiry | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [items, setItems] = useState<EnquiryItem[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [showNewCustomerOption, setShowNewCustomerOption] = useState(false);
  const [isManualCustomer, setIsManualCustomer] = useState(false);
  const customerSearchRef = useRef<HTMLDivElement>(null);
  
  const [formData, setFormData] = useState({
    enquiry_date: new Date().toISOString().split("T")[0],
    customer_name: "",
    customer_mail_id: "",
    customer_phone_no: "",
    kind_attn: "",
    mail_id: "",
    phone_no: "",
    remarks: "",
    additional_details: "",
    status: "pending",
    pending_remarks: "",
    quotation_no: "",
    quotation_date: new Date().toISOString().split("T")[0],
  });

  const companyId = typeof window !== "undefined" ? localStorage.getItem("company_id") : null;

  const fetchNextQuotationNumber = async (): Promise<string> => {
    if (!companyId) return "QT-0001";
    try {
      const response = await fetch(
        `${API_BASE}/companies/${companyId}/quotations/next-number`,
        {
          headers: {
            Authorization: `Bearer ${getToken()}`,
          },
        }
      );
      if (!response.ok) return "QT-0001";
      const data = await response.json();
      return data?.quotation_number || "QT-0001";
    } catch {
      return "QT-0001";
    }
  };

  useEffect(() => {
    if (companyId && enquiryId) {
      fetchEnquiry();
      fetchCustomers();
    }
  }, [companyId, enquiryId]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (customerSearchRef.current && !customerSearchRef.current.contains(event.target as Node)) {
        setShowCustomerDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const name = (formData.customer_name || "").trim().toLowerCase();
    if (!name) {
      setIsManualCustomer(false);
      return;
    }
    const exactMatch = customers.some((c) => (c.name || "").trim().toLowerCase() === name);
    setIsManualCustomer(!exactMatch);
  }, [customers, formData.customer_name]);

  const fetchCustomers = async () => {
    if (!companyId) return;
    try {
      const token = getToken();
      if (!token) return;
      const response = await fetch(`${API_BASE}/companies/${companyId}/customers?page=1&page_size=100`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      if (!response.ok) return;
      const data = await response.json();
      const customersList = Array.isArray(data) ? data : Array.isArray(data?.customers) ? data.customers : [];
      const processed: Customer[] = customersList.map((c: any) => ({
        id: c.id,
        name: c.name,
        email: c.email,
        phone: c.mobile || c.phone || "",
        contact_persons: c.contact_persons || [],
      }));
      setCustomers(processed);
      setFilteredCustomers(processed);
    } catch (err) {
      console.error("Failed to fetch customers:", err);
    }
  };

  const filterCustomers = (searchTerm: string) => {
    const filtered = customers.filter((customer) =>
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.phone?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredCustomers(filtered);
  };

  const handleCustomerSearchChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      customer_name: value,
      customer_mail_id: "",
      customer_phone_no: "",
      mail_id: "",
      phone_no: "",
      kind_attn: "",
    }));

    if (value.trim()) {
      filterCustomers(value);
      setShowCustomerDropdown(true);
      const exactMatch = customers.find(
        (customer) => customer.name.toLowerCase() === value.toLowerCase().trim()
      );
      if (!exactMatch) {
        setShowNewCustomerOption(true);
        setIsManualCustomer(true);
      } else {
        setShowNewCustomerOption(false);
        setIsManualCustomer(false);
      }
    } else {
      setShowCustomerDropdown(false);
      setShowNewCustomerOption(false);
      setIsManualCustomer(false);
    }
  };

  const handleManualCustomerEntry = () => {
    const customerName = formData.customer_name.trim();
    if (!customerName) return;
    setFormData((prev) => ({
      ...prev,
      customer_name: customerName,
      customer_mail_id: "",
      customer_phone_no: "",
      mail_id: "",
      phone_no: "",
      kind_attn: "",
    }));
    setIsManualCustomer(true);
    setShowCustomerDropdown(false);
    setShowNewCustomerOption(false);
  };

  const selectCustomer = (customer: Customer) => {
    setFormData((prev) => ({
      ...prev,
      customer_name: customer.name,
      customer_mail_id: customer.email || "",
      customer_phone_no: customer.phone || "",
      mail_id: "",
      phone_no: "",
      kind_attn: "",
    }));
    setIsManualCustomer(false);
    setShowCustomerDropdown(false);
    setShowNewCustomerOption(false);
  };

  useEffect(() => {
    const autoSetQuotationNo = async () => {
      if (formData.status !== "ready_for_quotation") return;
      if (formData.quotation_no && formData.quotation_no.trim() !== "") return;
      const nextNo = await fetchNextQuotationNumber();
      setFormData((prev) => ({ ...prev, quotation_no: prev.quotation_no || nextNo }));
    };
    autoSetQuotationNo();
  }, [formData.status, formData.quotation_no, companyId]);

 const fetchEnquiry = async () => {
  try {
    setLoading(true);
    const response = await fetch(
      `${API_BASE}/companies/${companyId}/enquiries/${enquiryId}`,
      {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      }
    );

    if (!response.ok) throw new Error("Failed to fetch enquiry");

    const data = await response.json();
    setEnquiry(data);
    
    // Set form data
    setFormData({
      enquiry_date: data.enquiry_date ? data.enquiry_date.split("T")[0] : new Date().toISOString().split("T")[0],
      customer_name: data.customer_name || data.prospect_company || "",
      customer_mail_id: data.customer_email || data.prospect_email || "",
      customer_phone_no: data.customer_mobile || data.prospect_phone || "",
      kind_attn: data.kind_attn || data.prospect_name || "",
      mail_id: data.mail_id || data.prospect_email || "",
      phone_no: data.phone_no || data.prospect_phone || "",
      remarks: data.remarks || data.description || "",
      additional_details: data.additional_details || "",
      status: data.status || "pending",
      pending_remarks: data.pending_remarks || "",
      quotation_no: data.quotation_no || "",
      quotation_date: data.quotation_date || new Date().toISOString().split("T")[0],
    });
    
    // Set items - get price data from products_interested
    // products_interested contains the price information
    if (data.products_interested && Array.isArray(data.products_interested)) {
      console.log("Products interested data:", data.products_interested);
      const itemImageByProductId = new Map<string, string>();
      if (Array.isArray(data.items)) {
        data.items.forEach((it: any) => {
          if (it?.product_id && it?.image_url) {
            itemImageByProductId.set(it.product_id, it.image_url);
          }
        });
      }
      
      setItems(data.products_interested.map((item: any, index: number) => {
        // Try to match with items data if available
        const matchedItem = data.items && data.items[index] 
          ? data.items[index] 
          : null;
        const resolvedImage =
          matchedItem?.image_url ||
          (item.product_id ? itemImageByProductId.get(item.product_id) : null) ||
          item.image_url ||
          null;
        
        return {
          id: matchedItem?.id || `item-${index}`,
          item_id: item.product_id,
          product_id: item.product_id,
          product_name: item.product_id
            ? (matchedItem?.product_name || item.product_name || item.description || "Item")
            : (item.custom_item || item.product_name || item.description || "Custom Item"),
          custom_item: item.custom_item || (!item.product_id ? item.product_name : ""),
          description: item.description || matchedItem?.description || "",
          quantity: item.quantity || 1,
          suitable_item: item.suitable_item || "",
          purchase_price: item.purchase_price || 0,
          sales_price: item.sales_price || 0,
          image: resolvedImage,
          existing_image: resolvedImage,
          notes: item.notes || `Item ${index + 1}`,
        };
      }));
    } else if (data.items && Array.isArray(data.items)) {
      // Fallback to items if products_interested doesn't exist
      console.log("No products_interested, using items data:", data.items);
      setItems(data.items.map((item: any) => ({
        id: item.id,
        item_id: item.product_id,
        product_id: item.product_id,
        product_name: item.product_id
          ? (item.product_name || item.description || "Item")
          : (item.custom_item || item.product_name || item.description || "Custom Item"),
        custom_item: item.custom_item || (!item.product_id ? item.product_name : ""),
        description: item.description || "",
        quantity: item.quantity || 1,
        suitable_item: "", // Default empty since not in items table
        purchase_price: 0, // Default 0 since not in items table
        sales_price: 0, // Default 0 since not in items table
        image: item.image_url,
        existing_image: item.image_url,
        notes: item.notes || "",
      })));
    } else {
      // No items found
      setItems([]);
    }
    
  } catch (err) {
    setError("Failed to load enquiry");
    console.error(err);
  } finally {
    setLoading(false);
  }
};

  const handleItemChange = (index: number, field: keyof EnquiryItem, value: any) => {
    const updatedItems = [...items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    setItems(updatedItems);
  };

  const getBackendImageUrl = (imagePath?: string) => {
    if (!imagePath) return null;

    if (
      imagePath.startsWith("http://") ||
      imagePath.startsWith("https://") ||
      imagePath.startsWith("blob:")
    ) {
      return imagePath;
    }

    if (imagePath.startsWith("/")) {
      return `${STATIC_BASE_URL}${imagePath}`;
    }

    if (imagePath.startsWith("storage/") || imagePath.startsWith("uploads/")) {
      return `${STATIC_BASE_URL}/${imagePath}`;
    }

    return `${STATIC_BASE_URL}/storage/enquiry_items/${imagePath}`;
  };

const handleSubmit = async (
  e: React.FormEvent,
  opts?: { redirect?: boolean; showAlert?: boolean; rethrowOnError?: boolean }
) => {
  e.preventDefault();
  const redirect = opts?.redirect ?? true;
  const showAlert = opts?.showAlert ?? true;
  const rethrowOnError = opts?.rethrowOnError ?? false;
  
  // Validate form
  if (!formData.status) {
    alert("Please select a status.");
    return;
  }
  
  if (items.length === 0) {
    alert("Please ensure there is at least one item.");
    return;
  }

  setSaving(true);
  setError("");

  try {
    const token = getToken();
    if (!token) {
      setError("Authentication required. Please login again.");
      setSaving(false);
      return;
    }

    // Prepare the request body
    const requestBody = {
      enquiry_date: formData.enquiry_date || null,
      customer_name: formData.customer_name || null,
      customer_mail_id: formData.customer_mail_id || null,
      customer_phone_no: formData.customer_phone_no || null,
      kind_attn: formData.kind_attn || null,
      mail_id: formData.mail_id || null,
      phone_no: formData.phone_no || null,
      remarks: formData.remarks || null,
      additional_details: formData.additional_details || null,
      status: formData.status,
      pending_remarks: formData.pending_remarks,
      quotation_no: formData.quotation_no,
      quotation_date: formData.quotation_date,
      items: items.map((item, index) => ({
        id: item.id || null,
        product_id: item.product_id || null,
        product_name: item.product_name || null,
        custom_item: item.product_id ? null : (item.custom_item || item.product_name || null),
        description: item.description,
        quantity: item.quantity,
        suitable_item: item.suitable_item || "",
        purchase_price: item.purchase_price || 0,
        sales_price: item.sales_price || 0,
        notes: item.description || `Item ${index + 1}`,
        existing_image: item.existing_image || null,
      })),
    };

    console.log("Sending update request with body:", JSON.stringify(requestBody, null, 2));
    console.log("URL:", `${API_BASE}/companies/${companyId}/enquiries/${enquiryId}/edit`);

    const response = await fetch(
      `${API_BASE}/companies/${companyId}/enquiries/${enquiryId}/edit`,
      {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      }
    );

    console.log("Response status:", response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Error response:", errorText);
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { detail: errorText };
      }
      throw new Error(errorData.detail || `Failed to update enquiry (Status: ${response.status})`);
    }

    const data = await response.json();
    console.log("Success response:", data);
    
    if (showAlert) {
      alert("Enquiry updated successfully!");
    }
    if (redirect) {
      router.push(`/enquiries/${enquiryId}`);
    }
    
  } catch (err: any) {
    console.error("Error updating enquiry:", err);
    setError(err.message || "Failed to update enquiry.");
    if (rethrowOnError) {
      throw err;
    }
  } finally {
    setSaving(false);
  }
};
  const handleConvertToQuotation = async () => {
    if (formData.status !== "ready_for_quotation") {
      alert('Please select "Ready for Quotation" status first.');
      return;
    }

    if (confirm("Are you sure you want to convert this enquiry to quotation?")) {
      try {
        // First, update the enquiry with the current data before opening quotation page
        await handleSubmit(new Event("submit") as any, {
          redirect: false,
          showAlert: false,
          rethrowOnError: true,
        });
        if (typeof window !== "undefined") {
          const conversionItems = items.map((item, index) => ({
            product_id: item.product_id || item.item_id || "",
            item_id: item.item_id || item.product_id || "",
            item_code: (item as any).item_code || "",
            description: item.description || item.product_name || `Item ${index + 1}`,
            quantity: Number(item.quantity) || 1,
            unit: (item as any).unit || "unit",
            sales_price: Number(item.sales_price) || 0,
            unit_price: Number(item.sales_price) || 0,
            purchase_price: Number(item.purchase_price) || 0,
          }));
          localStorage.setItem(
            `quotation_prefill_enquiry_${enquiryId}`,
            JSON.stringify({
              enquiry_id: enquiryId,
              updated_at: new Date().toISOString(),
              items: conversionItems,
            })
          );
        }
        router.push(`/quotations/new?enquiry_id=${enquiryId}`);
        
      } catch (err: any) {
        console.error("Error converting to quotation:", err);
        setError(err.message || "Failed to open quotation page.");
      }
    }
  };

  const formatDateForInput = (dateStr?: string) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return "";
    return d.toISOString().split("T")[0];
  };
  const formatDateDisplay = (dateStr?: string) => {
    if (!dateStr) return "N/A";
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return "N/A";
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  };
  const designationName =
    typeof user?.designation === "string"
      ? user.designation
      : user?.designation?.name || "";
  const isSalesEngineerUser = /sales\s*engineer/i.test(designationName);

  if (!companyId) {
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

  if (!enquiry) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 dark:bg-gray-900">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
          <p className="text-red-800 dark:text-red-400">Enquiry not found.</p>
          <Link href="/enquiries" className="mt-2 inline-block text-primary hover:text-primary/80">Back to Enquiries</Link>
        </div>
      </div>
    );
  }

  const showPrices = formData.status !== "ignored";

  return (
    <div className="w-full bg-gray-50 dark:bg-gray-900">
      <div className="border-b border-gray-200 bg-white px-4 py-4 dark:border-gray-700 dark:bg-gray-800 sm:px-6">
        <div className="flex items-start gap-3">
          <Link
            href="/enquiries"
            className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-white transition hover:bg-primary/90 sm:h-10 sm:w-10"
          >
            <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Edit Enquiry</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Update enquiry details</p>
          </div>
        </div>
      </div>

      <div className="w-full p-4 sm:p-6">

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
          <p className="text-red-800 dark:text-red-400 whitespace-pre-line">{error}</p>
        </div>
      )}

      <form data-ui="sf-form" onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="bg-white dark:bg-gray-dark rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Basic Information</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Enquiry Number
              </label>
              <input
                type="text"
                value={enquiry.enquiry_number}
                readOnly
                className="w-full px-4 py-2 border rounded-lg bg-gray-50 dark:bg-dark-2 dark:border-dark-3 dark:text-gray-300 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Date
              </label>
              <input
                type="date"
                value={isSalesEngineerUser ? formData.enquiry_date : formatDateForInput(enquiry.enquiry_date)}
                onChange={(e) => isSalesEngineerUser && setFormData({ ...formData, enquiry_date: e.target.value })}
                readOnly={!isSalesEngineerUser}
                className={`w-full px-4 py-2 border rounded-lg dark:bg-dark-2 dark:border-dark-3 ${
                  isSalesEngineerUser
                    ? "focus:ring-2 focus:ring-indigo-500 dark:text-white"
                    : "bg-gray-50 dark:text-gray-300 cursor-not-allowed"
                }`}
              />
            </div>
          </div>
        </div>

        {/* Customer Information (Create-like layout with auto-filled values) */}
        <div className="bg-white dark:bg-gray-dark rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Customer Information</h2>
          {isSalesEngineerUser ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div ref={customerSearchRef} className="relative">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Customer Name</label>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.customer_name}
                    onChange={(e) => handleCustomerSearchChange(e.target.value)}
                    onFocus={() => {
                      if (formData.customer_name) {
                        filterCustomers(formData.customer_name);
                      }
                      setShowCustomerDropdown(true);
                    }}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-dark-2 dark:border-dark-3 dark:text-white"
                    placeholder="Search customer or enter new customer..."
                  />
                  {formData.customer_name && (
                    <button
                      type="button"
                      onClick={() => {
                        setFormData({
                          ...formData,
                          customer_name: "",
                          mail_id: "",
                          phone_no: "",
                          kind_attn: "",
                        });
                        setFilteredCustomers(customers);
                        setIsManualCustomer(false);
                        setShowNewCustomerOption(false);
                      }}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      x
                    </button>
                  )}
                </div>
                {showCustomerDropdown && (filteredCustomers.length > 0 || showNewCustomerOption) && (
                  <div className="absolute z-10 w-full mt-1 bg-white dark:bg-dark-2 border border-gray-300 dark:border-dark-3 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {showNewCustomerOption && formData.customer_name.trim() && (
                      <div
                        className="px-4 py-3 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 cursor-pointer border-b dark:border-dark-3"
                        onClick={handleManualCustomerEntry}
                      >
                        <div className="font-medium text-blue-700 dark:text-blue-400">
                          Add new customer: "{formData.customer_name}"
                        </div>
                        <div className="text-sm text-blue-600 dark:text-blue-300 mt-1">
                          Click to use this customer name
                        </div>
                      </div>
                    )}
                    {filteredCustomers.map((customer) => (
                      <div
                        key={customer.id}
                        className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-dark-3 cursor-pointer border-b dark:border-dark-3 last:border-b-0"
                        onClick={() => selectCustomer(customer)}
                      >
                        <div className="font-medium text-gray-900 dark:text-white">{customer.name}</div>
                        {customer.email && (
                          <div className="text-sm text-gray-600 dark:text-gray-400">Email: {customer.email}</div>
                        )}
                        {customer.phone && (
                          <div className="text-sm text-gray-600 dark:text-gray-400">Phone: {customer.phone}</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Customer Email</label>
                <input
                  type="text"
                  value={formData.customer_mail_id}
                  onChange={(e) => setFormData({ ...formData, customer_mail_id: e.target.value })}
                  readOnly={!isManualCustomer}
                  className={`w-full px-4 py-2 border rounded-lg dark:bg-dark-2 dark:border-dark-3 ${
                    isManualCustomer
                      ? "focus:ring-2 focus:ring-indigo-500 dark:text-white"
                      : "bg-gray-50 dark:text-gray-300 cursor-not-allowed"
                  }`}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Customer Mobile</label>
                <input
                  type="text"
                  value={formData.customer_phone_no}
                  onChange={(e) => setFormData({ ...formData, customer_phone_no: e.target.value })}
                  readOnly={!isManualCustomer}
                  className={`w-full px-4 py-2 border rounded-lg dark:bg-dark-2 dark:border-dark-3 ${
                    isManualCustomer
                      ? "focus:ring-2 focus:ring-indigo-500 dark:text-white"
                      : "bg-gray-50 dark:text-gray-300 cursor-not-allowed"
                  }`}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sales Engineer</label>
                <input
                  type="text"
                  value={enquiry.salesman?.name || enquiry.sales_person_name || "Not Assigned"}
                  readOnly
                  className="w-full px-4 py-2 border rounded-lg bg-gray-50 dark:bg-dark-2 dark:border-dark-3 dark:text-gray-300 cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Enquiry Date</label>
                <input
                  type="date"
                  value={formData.enquiry_date}
                  onChange={(e) => setFormData({ ...formData, enquiry_date: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-dark-2 dark:border-dark-3 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Kind Attn.</label>
                <input
                  type="text"
                  value={formData.kind_attn}
                  onChange={(e) => setFormData({ ...formData, kind_attn: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-dark-2 dark:border-dark-3 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Kind Attn. Email</label>
                <input
                  type="text"
                  value={formData.mail_id}
                  onChange={(e) => setFormData({ ...formData, mail_id: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-dark-2 dark:border-dark-3 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Kind Attn. Mobile</label>
                <input
                  type="text"
                  value={formData.phone_no}
                  onChange={(e) => setFormData({ ...formData, phone_no: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-dark-2 dark:border-dark-3 dark:text-white"
                />
              </div>
              <div className="md:col-span-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Remarks</label>
                <textarea
                  value={formData.remarks}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-dark-2 dark:border-dark-3 dark:text-white"
                />
              </div>
              <div className="md:col-span-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Additional Details</label>
                <textarea
                  value={formData.additional_details}
                  onChange={(e) => setFormData({ ...formData, additional_details: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-dark-2 dark:border-dark-3 dark:text-white"
                />
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-dark-3">
                <tbody className="divide-y divide-gray-200 dark:divide-dark-3">
                  <tr>
                    <td className="px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-dark-2 w-1/4">
                      Customer Name
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                      {enquiry.customer_name || enquiry.prospect_company || "N/A"}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-dark-2">
                      Sales Engineer
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                      {enquiry.salesman?.name || enquiry.sales_person_name || "Not Assigned"}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-dark-2">
                      Enquiry Date
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                      {formatDateDisplay(enquiry.enquiry_date)}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-dark-2">
                      Kind Attn.
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                      {enquiry.contact_person || enquiry.prospect_name || "N/A"}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-dark-2">
                      Kind Attn. Email
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                      {enquiry.mail_id || enquiry.prospect_email || "N/A"}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-dark-2">
                      Kind Attn. Mobile
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                      {enquiry.phone_no || enquiry.prospect_phone || "N/A"}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-dark-2">
                      Remarks
                    </td>
                    <td colSpan={5} className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                      {enquiry.remarks || enquiry.description || "N/A"}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-dark-2">
                      Additional Details
                    </td>
                    <td colSpan={5} className="px-4 py-3 text-sm text-gray-900 dark:text-white whitespace-pre-wrap">
                      {enquiry.additional_details || "N/A"}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Items Section */}
        <div className="bg-white dark:bg-gray-dark rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Items</h2>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-dark-3">
              <thead className="bg-gray-50 dark:bg-dark-2">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    #
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Item Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Qty
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Suitable Item
                  </th>
                  {showPrices && (
                    <>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Purchase Price
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Sales Price
                      </th>
                    </>
                  )}
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Item Image
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-dark divide-y divide-gray-200 dark:divide-dark-3">
                {items.map((item, index) => (
                  <tr key={index}>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                      {index + 1}
                    </td>
                    {/* Item Name */}
                    <td className="px-4 py-3">
                      {isSalesEngineerUser ? (
                        <input
                          type="text"
                          value={item.product_name || item.custom_item || item.description || ""}
                          onChange={(e) => {
                            const nextName = e.target.value;
                            handleItemChange(index, "product_name", nextName);
                            if (!item.product_id) {
                              handleItemChange(index, "custom_item", nextName);
                            }
                          }}
                          className="w-full px-3 py-1 border rounded focus:ring-1 focus:ring-indigo-500 dark:bg-dark-3 dark:border-dark-3 dark:text-white text-sm"
                        />
                      ) : (
                        <div className="px-3 py-1 text-sm text-gray-900 dark:text-white min-h-[38px] flex items-center">
                          {item.product_name || item.custom_item || item.description || "No item name"}
                        </div>
                      )}
                    </td>
                    {/* Quantity */}
                    <td className="px-4 py-3">
                      {isSalesEngineerUser ? (
                        <input
                          type="number"
                          value={item.quantity || 1}
                          onChange={(e) => handleItemChange(index, "quantity", parseInt(e.target.value, 10) || 1)}
                          min="1"
                          className="w-full px-3 py-1 border rounded focus:ring-1 focus:ring-indigo-500 dark:bg-dark-3 dark:border-dark-3 dark:text-white text-sm"
                        />
                      ) : (
                        <div className="px-3 py-1 text-sm text-gray-900 dark:text-white min-h-[38px] flex items-center">
                          {item.quantity}
                        </div>
                      )}
                    </td>
                    {/* Description */}
                    <td className="px-4 py-3">
                      {isSalesEngineerUser ? (
                        <textarea
                          value={item.description || ""}
                          onChange={(e) => handleItemChange(index, "description", e.target.value)}
                          rows={3}
                          className="w-full px-3 py-1 border rounded focus:ring-1 focus:ring-indigo-500 dark:bg-dark-3 dark:border-dark-3 dark:text-white text-sm"
                        />
                      ) : (
                        <div className="px-3 py-1  text-sm text-gray-900 dark:text-white min-h-[76px] flex items-start">
                          {item.description || "No description"}
                        </div>
                      )}
                    </td>
                    {/* Suitable Item - EDITABLE */}
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={item.suitable_item || ""}
                        onChange={(e) => handleItemChange(index, "suitable_item", e.target.value)}
                        className="w-full px-3 py-1 border rounded focus:ring-1 focus:ring-indigo-500 dark:bg-dark-3 dark:border-dark-3 dark:text-white text-sm"
                        placeholder="Enter suitable item..."
                      />
                    </td>
                    {/* Purchase Price - EDITABLE (only when shown) */}
                    {showPrices && (
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          value={item.purchase_price || 0}
                          onChange={(e) => handleItemChange(index, "purchase_price", parseFloat(e.target.value) || 0)}
                          step="0.01"
                          min="0"
                          className="w-full px-3 py-1 border rounded focus:ring-1 focus:ring-indigo-500 dark:bg-dark-3 dark:border-dark-3 dark:text-white text-sm"
                          placeholder="0.00"
                        />
                      </td>
                    )}
                    {/* Sales Price - EDITABLE (only when shown) */}
                    {showPrices && (
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          value={item.sales_price || 0}
                          onChange={(e) => handleItemChange(index, "sales_price", parseFloat(e.target.value) || 0)}
                          step="0.01"
                          min="0"
                          className="w-full px-3 py-1 border rounded focus:ring-1 focus:ring-indigo-500 dark:bg-dark-3 dark:border-dark-3 dark:text-white text-sm"
                          placeholder="0.00"
                        />
                      </td>
                    )}
                    {/* Item Image - READ ONLY */}
                    <td className="px-4 py-3">
                      <div className="text-center">
                        {getBackendImageUrl(item.existing_image || item.image) ? (
                          <a
                            href={getBackendImageUrl(item.existing_image || item.image) || undefined}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-block"
                          >
                            <img
                              src={getBackendImageUrl(item.existing_image || item.image) || ""}
                              alt="Item"
                              className="h-16 w-16 object-cover rounded border dark:border-dark-3"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                                const container = (e.target as HTMLImageElement).parentElement;
                                if (container) {
                                  container.innerHTML = '<div class="text-yellow-600 text-sm"><svg class="w-4 h-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.698-.833-2.464 0L4.342 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg> Image</div>';
                                }
                              }}
                            />
                          </a>
                        ) : (
                          <div className="text-gray-400 text-sm">
                            <svg className="w-4 h-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            No image
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Status and Pending Remarks Section */}
        <div className="bg-white dark:bg-gray-dark rounded-lg shadow p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Pending Remarks */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Pending Remarks
              </label>
              {formData.status === "ready_for_purchase" ? (
                <textarea
                  value={formData.pending_remarks}
                  onChange={(e) => setFormData({ ...formData, pending_remarks: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-dark-3 dark:border-dark-3 dark:text-white"
                  placeholder="Enter pending remarks..."
                />
              ) : (
                <div className="px-4 py-2 border rounded-lg bg-gray-50 dark:bg-dark-2 dark:border-dark-3 dark:text-gray-300 min-h-[80px]">
                  {formData.pending_remarks || "No pending remarks"}
                </div>
              )}
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Status <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.status}
                onChange={async (e) => {
                  const nextStatus = e.target.value;
                  if (nextStatus === "ready_for_quotation" && !formData.quotation_no) {
                    const nextNo = await fetchNextQuotationNumber();
                    setFormData({ ...formData, status: nextStatus, quotation_no: nextNo });
                    return;
                  }
                  setFormData({ ...formData, status: nextStatus });
                }}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-dark-3 dark:border-dark-3 dark:text-white"
                required
              >
                <option value="" disabled>
                  Select status
                </option>
                <option value="ready_for_quotation">Ready for Quotation</option>
                <option value="ready_for_purchase">Ready for Purchase</option>
                <option value="ignored">Ignore Enquiry</option>
              </select>
            </div>
          </div>
        </div>

        {/* Quotation Section (Visible only for "Ready for Quotation") */}
        {formData.status === "ready_for_quotation" && (
          <div className="bg-white dark:bg-gray-dark rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quotation Details</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Quotation Number
                </label>
                <input
                  type="text"
                  value={formData.quotation_no}
                  readOnly
                  disabled
                  className="w-full px-4 py-2 border rounded-lg bg-gray-50 dark:bg-dark-2 dark:border-dark-3 dark:text-gray-300 cursor-not-allowed"
                  placeholder="Auto generated"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Auto-generated from quotation sequence
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Quotation Date
                </label>
                <input
                  type="date"
                  value={formData.quotation_date}
                  onChange={(e) => setFormData({ ...formData, quotation_date: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-dark-3 dark:border-dark-3 dark:text-white"
                />
              </div>
            </div>
            
            {/* Convert to Quotation Button */}
            <div className="mt-6 text-right">
              <button
                type="button"
                onClick={handleConvertToQuotation}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 inline-flex"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Convert to Quotation
              </button>
            </div>
          </div>
        )}

        {/* Form Actions */}
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-none dark:border-gray-700 dark:bg-gray-800 sm:p-6">
          <div className="mx-auto flex w-full max-w-[560px] items-center justify-center gap-4 sm:gap-8">
            <button
              type="submit"
              disabled={saving}
              className="flex h-9 min-w-[140px] items-center justify-center gap-2 rounded-lg bg-primary px-6 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60 sm:h-10 sm:min-w-[220px]"
            >
              {saving ? (
                <>
                  <svg className="h-4 w-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Updating...
                </>
              ) : (
                "Update"
              )}
            </button>
            <Link
              href="/enquiries"
              className="flex h-9 min-w-[140px] items-center justify-center rounded-lg bg-[#E5E7EB] px-6 text-sm font-medium text-black transition-colors hover:bg-[#e9ebf0] dark:bg-dark-3 dark:text-white dark:hover:bg-dark-2 sm:h-10 sm:min-w-[220px]"
            >
              Cancel
            </Link>
          </div>
        </div>
      </form>
      </div>
    </div>
  );
}


