"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { customersApi, productsApi, getErrorMessage } from "@/services/api";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:6768/api";
const STATIC_BASE_URL = API_BASE.replace(/\/api$/, "") || "http://localhost:6768";


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

interface Product {
  id: string;
  name: string;
  description?: string;
  sku?: string;
  image?: string;
}

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
}

interface EnquiryItem {
  product_id: string;
  description: string;
  quantity: number;
  image: File | null;
  existing_image_url?: string;
}

export default function NewEnquiryPage() {
  const { company, user, getToken } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [contactPersonSearch, setContactPersonSearch] = useState("");
  const [salesmen, setSalesmen] = useState<Employee[]>([]);
  const [filteredSalesmen, setFilteredSalesmen] = useState<Employee[]>([]);
  const [filteredContactPersons, setFilteredContactPersons] = useState<any[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCustomerContacts, setSelectedCustomerContacts] = useState<any[]>([]);
  const [showContactDropdown, setShowContactDropdown] = useState(false);
  const contactDropdownRef = useRef<HTMLDivElement>(null);
  const [filteredProducts, setFilteredProducts] = useState<Product[][]>([]);
  
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [showProductDropdowns, setShowProductDropdowns] = useState<boolean[]>([]);
  const [showSalesmanDropdown, setShowSalesmanDropdown] = useState(false);
  const [isManualCustomer, setIsManualCustomer] = useState(false);
  const [showNewCustomerOption, setShowNewCustomerOption] = useState(false);
  
  const customerSearchRef = useRef<HTMLDivElement>(null);
  const productSearchRefs = useRef<(HTMLDivElement | null)[]>([]);
  const salesmanSearchRef = useRef<HTMLDivElement>(null);

  const [enquiryItems, setEnquiryItems] = useState<EnquiryItem[]>([
    {
      product_id: "",
      description: "",
      quantity: 1,
      image: null,
    },
  ]);

  const [formData, setFormData] = useState({
    enquiry_no: "",
    enquiry_date: new Date().toISOString().split("T")[0],
    customer_id: "",
    customer_search: "",
    kind_attn: "",
    mail_id: "",
    phone_no: "",
    remarks: "",
    salesman_id: "",
    salesman_search: "",
    status: "pending",
  });

  // Clear contact persons when customer search is cleared
  useEffect(() => {
    if (!formData.customer_id && formData.customer_search === "") {
      setSelectedCustomerContacts([]);
      setFilteredContactPersons([]);
      setContactPersonSearch("");
      setFormData(prev => ({
        ...prev,
        kind_attn: "",
        mail_id: "",
        phone_no: "",
      }));
      setIsManualCustomer(false);
    }
  }, [formData.customer_id, formData.customer_search]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (customerSearchRef.current && !customerSearchRef.current.contains(event.target as Node)) {
        setShowCustomerDropdown(false);
      }
      if (salesmanSearchRef.current && !salesmanSearchRef.current.contains(event.target as Node)) {
        setShowSalesmanDropdown(false);
      }
      if (contactDropdownRef.current && !contactDropdownRef.current.contains(event.target as Node)) {
        setShowContactDropdown(false);
      }
      productSearchRefs.current.forEach((ref, index) => {
        if (ref && !ref.contains(event.target as Node) && showProductDropdowns[index]) {
          const newShowDropdowns = [...showProductDropdowns];
          newShowDropdowns[index] = false;
          setShowProductDropdowns(newShowDropdowns);
        }
      });
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showProductDropdowns]);

  useEffect(() => {
    // Generate suggested enquiry number
    const suggestedNumber = `ENQ-${Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, "0")}`;
    setFormData((prev) => ({ ...prev, enquiry_no: suggestedNumber }));
    
    // Fetch data
    if (company?.id) {
      fetchCustomers();
      fetchProducts();
      fetchSalesEngineers();
    }
    
    // Initialize showProductDropdowns array
    setShowProductDropdowns([false]);
    // Initialize filteredProducts with all products for first item
    setFilteredProducts([products]);
  }, [company?.id]);

  const fetchSalesEngineers = async () => {
    if (!company?.id) return;
    
    try {
      const token = localStorage.getItem("access_token");
      if (!token) {
        console.error("Authentication required");
        return;
      }

      const salesEngineersUrl = `${API_BASE}/companies/${company.id}/sales-engineers`;
      
      console.log("Fetching sales engineers from:", salesEngineersUrl);
      
      const response = await fetch(salesEngineersUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.warn("Sales engineers API failed");
        setSalesmen([]);
        setFilteredSalesmen([]);
        return;
      }

      const data = await response.json();
      console.log("Sales engineers API response:", data);

      if (data && Array.isArray(data) && data.length > 0) {
        const formattedSalesmen = data.map(engineer => ({
          id: engineer.id,
          first_name: engineer.full_name || 'Unnamed Engineer',
          last_name: '',
          email: engineer.email || '',
          phone: engineer.phone || '',
          designation: engineer.designation_name || 'Sales Engineer',
          employee_code: engineer.employee_code || ''
        }));

        setSalesmen(formattedSalesmen);
        setFilteredSalesmen(formattedSalesmen);
        console.log("Formatted salesmen:", formattedSalesmen.length);
      } else {
        console.warn("No sales engineers found");
        setSalesmen([]);
        setFilteredSalesmen([]);
      }
    } catch (error: any) {
      console.error("Failed to fetch sales engineers:", error);
      setSalesmen([]);
      setFilteredSalesmen([]);
    }
  };

  const fetchCustomers = async () => {
    if (!company?.id) return;
    
    try {
      console.log("Fetching customers for company:", company.id);
      
      const token = localStorage.getItem("access_token");
      const url = `${API_BASE}/companies/${company.id}/customers?page=1&page_size=100`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      let customersList: any[] = [];
      
      if (Array.isArray(data)) {
        customersList = data;
      } else if (data.customers && Array.isArray(data.customers)) {
        customersList = data.customers;
      } else {
        console.warn("❌ No array found in response");
      }
      
      const processedCustomers: Customer[] = customersList.map((customer: any) => {
        return {
          id: customer.id,
          name: customer.name,
          email: customer.email,
          phone: customer.mobile || customer.phone || '',
          contact_persons: customer.contact_persons || []
        };
      });
      
      console.log("Processed customers:", processedCustomers.length);
      setCustomers(processedCustomers);
      setFilteredCustomers(processedCustomers);
      
    } catch (err: any) {
      console.error("❌ Failed to fetch customers:", err);
      setError(`Failed to load customers: ${err.message}`);
      setCustomers([]);
      setFilteredCustomers([]);
    }
  };

  const fetchProducts = async () => {
    if (!company?.id) return;
    
    try {
      console.log("Fetching products for company:", company.id);
      
      const token = localStorage.getItem("access_token");
      const url = `${API_BASE}/companies/${company.id}/products?page_size=100`;
      console.log("Products URL:", url);
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log("Products response status:", response.status);
      
      if (!response.ok) {
        console.warn("Products API failed");
        throw new Error(`HTTP ${response.status}: Products endpoint might not exist`);
      }
      
      const data = await response.json();
      console.log("Products response:", data);
      
      let productsList = [];
      
      if (Array.isArray(data)) {
        productsList = data;
      } else if (data.products && Array.isArray(data.products)) {
        productsList = data.products;
      } else if (data.items && Array.isArray(data.items)) {
        productsList = data.items;
      } else if (data.data && Array.isArray(data.data)) {
        productsList = data.data;
      }
      
      console.log("Products loaded:", productsList.length);
      setProducts(productsList);
      setFilteredProducts([productsList]);
      
    } catch (err: any) {
      console.error("Failed to fetch products:", err);
      setProducts([]);
      setFilteredProducts([[]]);
    }
  };

  const filterContactPersons = useCallback((searchTerm: string) => {
    if (!selectedCustomerContacts.length) {
      setFilteredContactPersons([]);
      return;
    }
    
    if (!searchTerm.trim()) {
      setFilteredContactPersons(selectedCustomerContacts);
      return;
    }
    
    const searchLower = searchTerm.toLowerCase().trim();
    
    const filtered = selectedCustomerContacts.filter(contact => {
      if (contact.name.toLowerCase().includes(searchLower)) {
        return true;
      }
      
      if (contact.email && contact.email.toLowerCase().includes(searchLower)) {
        return true;
      }
      
      if (contact.phone && contact.phone.toLowerCase().includes(searchLower)) {
        return true;
      }
      
      return false;
    });
    
    setFilteredContactPersons(filtered);
  }, [selectedCustomerContacts]);

  const filterCustomers = useCallback((searchTerm: string) => {
    if (!customers.length) {
      console.log("No customers to filter");
      return;
    }
    
    const filtered = customers.filter(customer =>
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.phone?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    console.log(`Filtered ${customers.length} customers to ${filtered.length}`);
    setFilteredCustomers(filtered);
  }, [customers]);

  const filterProducts = useCallback((searchTerm: string, index: number) => {
    const filtered = products.filter(product =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    const newFilteredProducts = [...filteredProducts];
    newFilteredProducts[index] = filtered;
    setFilteredProducts(newFilteredProducts);
  }, [products, filteredProducts]);

  const filterEmployees = useCallback((searchTerm: string) => {
    const filtered = salesmen.filter(employee =>
      `${employee.first_name} ${employee.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.phone?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredSalesmen(filtered);
  }, [salesmen]);

  const selectContactPerson = useCallback((contact: any) => {
    console.log("Selected contact person:", contact);
    
    setFormData(prev => ({
      ...prev,
      kind_attn: contact.name,
    }));
    
    setShowContactDropdown(false);
    setContactPersonSearch("");
    setFilteredContactPersons(selectedCustomerContacts);
  }, [selectedCustomerContacts]);

  const handleCustomerSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData(prev => ({ 
      ...prev, 
      customer_search: value,
      customer_id: "" // Clear ID when typing
    }));
    
    if (value.trim()) {
      filterCustomers(value);
      setShowCustomerDropdown(true);
      
      // Check if it matches any existing customer
      const exactMatch = customers.find(customer => 
        customer.name.toLowerCase() === value.toLowerCase().trim()
      );
      
      if (!exactMatch && value.trim().length > 0) {
        // Show option to add new customer
        setShowNewCustomerOption(true);
        setIsManualCustomer(true);
        // Clear contact persons for new customer
        setSelectedCustomerContacts([]);
        setFilteredContactPersons([]);
        setContactPersonSearch("");
      } else {
        setShowNewCustomerOption(false);
        setIsManualCustomer(false);
      }
    } else {
      setShowCustomerDropdown(false);
      setShowNewCustomerOption(false);
      setIsManualCustomer(false);
      setSelectedCustomerContacts([]);
      setFilteredContactPersons([]);
      setContactPersonSearch("");
    }
  };

  const handleManualCustomerEntry = () => {
    const customerName = formData.customer_search.trim();
    if (!customerName) return;
    
    // Clear contact persons for new customer
    setSelectedCustomerContacts([]);
    setFilteredContactPersons([]);
    setContactPersonSearch("");
    
    // Set form data with manual entry
    setFormData(prev => ({
      ...prev,
      customer_id: "", // Empty ID for manual customers
      customer_search: customerName,
      kind_attn: "", // Reset kind attention
      mail_id: "", // Clear email
      phone_no: "", // Clear phone
    }));
    
    setIsManualCustomer(true);
    setShowCustomerDropdown(false);
    setShowNewCustomerOption(false);
  };

  const selectCustomer = useCallback((customer: Customer) => {
    console.log("Selected customer:", customer);
    
    // Store the contact persons for this customer
    const contactPersons = customer.contact_persons || [];
    setSelectedCustomerContacts(contactPersons);
    setFilteredContactPersons(contactPersons);
    setContactPersonSearch("");
    
    // Update form data with customer info
    setFormData(prev => ({
      ...prev,
      customer_id: customer.id,
      customer_search: customer.name,
      kind_attn: "", // Reset kind attention
      mail_id: customer.email || "",
      phone_no: customer.phone || "",
    }));
    
    setIsManualCustomer(false);
    setShowCustomerDropdown(false);
    setShowNewCustomerOption(false);
  }, []);

  const selectProduct = useCallback((product: Product, index: number) => {
    const updated = [...enquiryItems];
    updated[index] = {
      ...updated[index],
      product_id: product.id,
      description: product.description || product.name,
      existing_image_url: product.image || undefined,
    };
    setEnquiryItems(updated);
    
    const newShowDropdowns = [...showProductDropdowns];
    newShowDropdowns[index] = false;
    setShowProductDropdowns(newShowDropdowns);
  }, [enquiryItems, showProductDropdowns]);

  const selectSalesman = useCallback((employee: Employee) => {
    setFormData({
      ...formData,
      salesman_id: employee.id,
      salesman_search: `${employee.first_name} ${employee.last_name}`,
    });
    setShowSalesmanDropdown(false);
  }, [formData]);

  const addItem = useCallback(() => {
    setEnquiryItems([
      ...enquiryItems,
      {
        product_id: "",
        description: "",
        quantity: 1,
        image: null,
      },
    ]);
    setShowProductDropdowns([...showProductDropdowns, false]);
    setFilteredProducts([...filteredProducts, products]);
  }, [enquiryItems, showProductDropdowns, filteredProducts, products]);

  const removeItem = useCallback((index: number) => {
    if (enquiryItems.length <= 1) {
      alert("At least one item is required.");
      return;
    }
    setEnquiryItems(enquiryItems.filter((_, i) => i !== index));
    const newShowDropdowns = showProductDropdowns.filter((_, i) => i !== index);
    setShowProductDropdowns(newShowDropdowns);
    const newFilteredProducts = filteredProducts.filter((_, i) => i !== index);
    setFilteredProducts(newFilteredProducts);
  }, [enquiryItems, showProductDropdowns, filteredProducts]);

  const updateItem = useCallback((index: number, field: keyof EnquiryItem, value: string | number | File | null) => {
    const updated = [...enquiryItems];
    
    if (field === "product_id") {
      const product = products.find((p) => p.id === value);
      updated[index] = {
        ...updated[index],
        product_id: value as string,
        description: product?.description || product?.name || updated[index].description,
        existing_image_url: product?.image || undefined,
      };
    } else {
      updated[index] = { ...updated[index], [field]: value };
    }
    setEnquiryItems(updated);
  }, [enquiryItems, products]);

  const handleImageUpload = useCallback((index: number, file: File) => {
    updateItem(index, "image", file);
  }, [updateItem]);

  const removeUploadedImage = useCallback((index: number) => {
    updateItem(index, "image", null);
  }, [updateItem]);

 const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setLoading(true);
  setError("");

  // Validate form
  if (!formData.customer_search.trim()) {
    setError("Please enter a customer name.");
    setLoading(false);
    return;
  }

  try {
    const token = getToken();
    if (!token) {
      setError("Authentication required. Please login again.");
      setLoading(false);
      return;
    }

    const formDataToSend = new FormData();
    
    // Append all form fields
    formDataToSend.append("enquiry_no", formData.enquiry_no);
    formDataToSend.append("enquiry_date", formData.enquiry_date);
    
    // Always send customer_name, even if we have customer_id
    formDataToSend.append("customer_name", formData.customer_search);
    
    if (formData.customer_id) {
      formDataToSend.append("customer_id", formData.customer_id);
    }
    
    if (formData.kind_attn) {
      formDataToSend.append("kind_attn", formData.kind_attn);
    }
    
    if (formData.mail_id) {
      formDataToSend.append("mail_id", formData.mail_id);
    }
    
    if (formData.phone_no) {
      formDataToSend.append("phone_no", formData.phone_no);
    }
    
    if (formData.remarks) {
      formDataToSend.append("remarks", formData.remarks);
    }
    
    if (formData.salesman_id) {
      formDataToSend.append("salesman_id", formData.salesman_id);
    }
    
    formDataToSend.append("status", formData.status);

    // Prepare items data in the correct format
    const itemsData = enquiryItems.map((item, index) => ({
      product_id: item.product_id || null,
      description: item.description,
      quantity: item.quantity,
      notes: `Item ${index + 1}`,
      // Preserve selected product image when no new file is uploaded
      existing_image: item.existing_image_url || null,
    }));
    
    formDataToSend.append("items", JSON.stringify(itemsData));

    // Append image files
    enquiryItems.forEach((item, index) => {
      if (item.image) {
        formDataToSend.append("files", item.image);
      }
    });

    console.log("Sending enquiry data:", {
      enquiry_no: formData.enquiry_no,
      enquiry_date: formData.enquiry_date,
      customer_name: formData.customer_search,
      customer_id: formData.customer_id,
      items: itemsData,
    });

    const response = await fetch(
      `${API_BASE}/companies/${company?.id}/enquiries/formdata`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          // Don't set Content-Type header for FormData - let browser set it
        },
        body: formDataToSend,
      }
    );

    if (!response.ok) {
      let errorDetail = `Failed to create enquiry (Status: ${response.status})`;
      try {
        const errorData = await response.json();
        errorDetail = errorData.detail || errorData.message || JSON.stringify(errorData);
      } catch (e) {
        // If response is not JSON, use text
        const errorText = await response.text();
        if (errorText) errorDetail = errorText;
      }
      throw new Error(errorDetail);
    }

    const data = await response.json();
    alert("Enquiry created successfully!");
    router.push(`/enquiries`);
  } catch (err: any) {
    console.error("Error creating enquiry:", err);
    setError(err.message || "Failed to create enquiry.");
  } finally {
    setLoading(false);
  }
};

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Function to handle ref assignment
  const setProductSearchRef = useCallback((el: HTMLDivElement | null, index: number) => {
    productSearchRefs.current[index] = el;
  }, []);

  if (!company) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 dark:bg-yellow-900/20 dark:border-yellow-800">
          <p className="text-yellow-800 dark:text-yellow-400">Please select a company first.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link href="/enquiries" className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Create New Enquiry</h1>
          <p className="text-gray-500 dark:text-gray-400">Create a new sales enquiry</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 dark:bg-red-900/20 dark:border-red-800">
          <p className="text-red-800 dark:text-red-400 whitespace-pre-line">{error}</p>
          <p className="text-sm text-red-700 dark:text-red-300 mt-2">
            Note: You might need to create the enquiries endpoint in your backend.
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information Section */}
        <div className="bg-white dark:bg-gray-dark rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Basic Information</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Enquiry Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="enquiry_no"
                value={formData.enquiry_no}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-dark-2 dark:border-dark-3 dark:text-white"
                placeholder="e.g., ENQ-2024-0001"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="enquiry_date"
                value={formData.enquiry_date}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-dark-2 dark:border-dark-3 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* Customer Information Section */}
        <div className="bg-white dark:bg-gray-dark rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Customer Information</h2>
          
          <div className="space-y-4">
            <div ref={customerSearchRef} className="relative">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Customer Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  name="customer_search"
                  value={formData.customer_search}
                  onChange={handleCustomerSearchChange}
                  onFocus={() => {
                    if (formData.customer_search) {
                      filterCustomers(formData.customer_search);
                    }
                    setShowCustomerDropdown(true);
                  }}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-dark-2 dark:border-dark-3 dark:text-white"
                  placeholder="Search customer or enter new customer..."
                  required
                />
                <input
                  type="hidden"
                  name="customer_id"
                  value={formData.customer_id}
                />
                {formData.customer_search && (
                  <button
                    type="button"
                    onClick={() => {
                      setFormData({ 
                        ...formData, 
                        customer_search: "", 
                        customer_id: "",
                        kind_attn: "",
                        mail_id: "",
                        phone_no: ""
                      });
                      setSelectedCustomerContacts([]);
                      setFilteredContactPersons([]);
                      setContactPersonSearch("");
                      setFilteredCustomers(customers);
                      setIsManualCustomer(false);
                      setShowNewCustomerOption(false);
                    }}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                )}
              </div>
              
              {showCustomerDropdown && (filteredCustomers.length > 0 || showNewCustomerOption) && (
                <div className="absolute z-10 w-full mt-1 bg-white dark:bg-dark-2 border border-gray-300 dark:border-dark-3 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {/* Show "Add New Customer" option if no exact match */}
                  {showNewCustomerOption && formData.customer_search.trim() && (
                    <div
                      className="px-4 py-3 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 cursor-pointer border-b dark:border-dark-3"
                      onClick={handleManualCustomerEntry}
                    >
                      <div className="font-medium text-blue-700 dark:text-blue-400">
                        Add new customer: "{formData.customer_search}"
                      </div>
                      <div className="text-sm text-blue-600 dark:text-blue-300 mt-1">
                        Click to use this customer name
                      </div>
                    </div>
                  )}
                  
                  {/* Existing customers list */}
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
                      
                      {customer.contact_persons && customer.contact_persons.length > 0 && (
                        <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                          {customer.contact_persons.length} contact person(s) available
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Kind Attention - Conditional based on customer type */}
              {isManualCustomer || !selectedCustomerContacts.length ? (
                // Simple text input for new customers or customers without contacts
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Kind Attn.
                  </label>
                  <input
                    type="text"
                    name="kind_attn"
                    value={formData.kind_attn}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-dark-2 dark:border-dark-3 dark:text-white"
                    placeholder="Enter contact person name"
                  />
                </div>
              ) : (
                // Dropdown for existing customers with contacts
                <div ref={contactDropdownRef} className="relative">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Kind Attn.
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      name="kind_attn"
                      value={formData.kind_attn}
                      onChange={(e) => {
                        setFormData({ ...formData, kind_attn: e.target.value });
                        setContactPersonSearch(e.target.value);
                        filterContactPersons(e.target.value);
                        setShowContactDropdown(true);
                      }}
                      onFocus={() => {
                        if (selectedCustomerContacts.length > 0) {
                          setShowContactDropdown(true);
                        }
                      }}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-dark-2 dark:border-dark-3 dark:text-white"
                      placeholder={selectedCustomerContacts.length > 0 ? "Select or search contact person..." : "No contact persons available"}
                      disabled={selectedCustomerContacts.length === 0}
                    />
                    
                    {selectedCustomerContacts.length > 0 && formData.kind_attn && (
                      <button
                        type="button"
                        onClick={() => {
                          setFormData({ ...formData, kind_attn: "" });
                          setContactPersonSearch("");
                          setFilteredContactPersons(selectedCustomerContacts);
                        }}
                        className="absolute right-8 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        ✕
                      </button>
                    )}
                    
                    {selectedCustomerContacts.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setShowContactDropdown(!showContactDropdown)}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        ▼
                      </button>
                    )}
                  </div>
                  
                  {showContactDropdown && selectedCustomerContacts.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white dark:bg-dark-2 border border-gray-300 dark:border-dark-3 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {/* Search input for contact persons */}
                      <div className="p-2 border-b dark:border-dark-3">
                        <input
                          type="text"
                          value={contactPersonSearch}
                          onChange={(e) => {
                            setContactPersonSearch(e.target.value);
                            filterContactPersons(e.target.value);
                          }}
                          placeholder="Search contact persons..."
                          className="w-full px-3 py-1 text-sm border rounded focus:ring-1 focus:ring-indigo-500 dark:bg-dark-3 dark:border-dark-3 dark:text-white"
                          autoFocus
                        />
                      </div>
                      
                      {/* Results count */}
                      <div className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400 border-b dark:border-dark-3">
                        {filteredContactPersons.length === 0 
                          ? "No contact persons found" 
                          : `${filteredContactPersons.length} contact person(s)`}
                      </div>
                      
                      {/* Contact persons list */}
                      {filteredContactPersons.length > 0 && filteredContactPersons.map((contact, index) => (
                        <div
                          key={contact.id || index}
                          className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-dark-3 cursor-pointer border-b dark:border-dark-3 last:border-b-0"
                          onClick={() => selectContactPerson(contact)}
                        >
                          <div className="font-medium text-gray-900 dark:text-white">{contact.name}</div>
                          {contact.email && (
                            <div className="text-sm text-gray-600 dark:text-gray-400">Email: {contact.email}</div>
                          )}
                          {contact.phone && (
                            <div className="text-sm text-gray-600 dark:text-gray-400">Phone: {contact.phone}</div>
                          )}
                          {contact.is_primary && (
                            <div className="text-xs text-green-600 dark:text-green-400">Primary Contact</div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Mail-ID
                </label>
                <input
                  type="email"
                  name="mail_id"
                  value={formData.mail_id}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-dark-2 dark:border-dark-3 dark:text-white"
                  placeholder="Email"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Phone No
                </label>
                <input
                  type="tel"
                  name="phone_no"
                  value={formData.phone_no}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-dark-2 dark:border-dark-3 dark:text-white"
                  placeholder="Phone Number"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Remarks
              </label>
              <textarea
                name="remarks"
                value={formData.remarks}
                onChange={handleChange}
                rows={2}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-dark-2 dark:border-dark-3 dark:text-white"
                placeholder="Additional remarks..."
              />
            </div>

            {/* Sales Person Section */}
            <div ref={salesmanSearchRef} className="relative">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Sales Person
              </label>
              <div className="relative">
                <input
                  type="text"
                  name="salesman_search"
                  value={formData.salesman_search}
                  onChange={(e) => {
                    setFormData({ ...formData, salesman_search: e.target.value });
                    filterEmployees(e.target.value);
                    setShowSalesmanDropdown(true);
                  }}
                  onFocus={() => setShowSalesmanDropdown(true)}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-dark-2 dark:border-dark-3 dark:text-white"
                  placeholder="Search sales engineer..."
                />
                <input
                  type="hidden"
                  name="salesman_id"
                  value={formData.salesman_id}
                />
                {formData.salesman_search && (
                  <button
                    type="button"
                    onClick={() => {
                      setFormData({ ...formData, salesman_search: "", salesman_id: "" });
                      setFilteredSalesmen(salesmen);
                    }}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                )}
              </div>
              
              {showSalesmanDropdown && filteredSalesmen.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white dark:bg-dark-2 border border-gray-300 dark:border-dark-3 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {filteredSalesmen.map((employee) => (
                    <div
                      key={employee.id}
                      className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-dark-3 cursor-pointer border-b dark:border-dark-3 last:border-b-0"
                      onClick={() => selectSalesman(employee)}
                    >
                      <div className="font-medium text-gray-900 dark:text-white">
                        {employee.first_name} {employee.last_name}
                      </div>
                      {employee.email && (
                        <div className="text-sm text-gray-600 dark:text-gray-400">Email: {employee.email}</div>
                      )}
                      {employee.phone && (
                        <div className="text-sm text-gray-600 dark:text-gray-400">Phone: {employee.phone}</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Items Section */}
        <div className="bg-white dark:bg-gray-dark rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Items</h2>
            <button
              type="button"
              onClick={addItem}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Item
            </button>
          </div>

          <div className="space-y-6">
            {enquiryItems.map((item, index) => (
              <div key={index} className="border p-4 rounded-lg bg-gray-50 dark:bg-dark-2">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-primary font-medium dark:text-white">
                    Item <span className="item-number">{index + 1}</span>
                  </h3>
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    className="px-3 py-1 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 text-sm flex items-center gap-1"
                    disabled={enquiryItems.length <= 1}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Remove
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <div className="space-y-4">
                      <div 
                        ref={(el) => setProductSearchRef(el, index)} 
                        className="relative"
                      >
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Select Product
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            value={products.find(p => p.id === item.product_id)?.name || ""}
                            onChange={(e) => {
                              filterProducts(e.target.value, index);
                              const newShowDropdowns = [...showProductDropdowns];
                              newShowDropdowns[index] = true;
                              setShowProductDropdowns(newShowDropdowns);
                            }}
                            onFocus={() => {
                              const newShowDropdowns = [...showProductDropdowns];
                              newShowDropdowns[index] = true;
                              setShowProductDropdowns(newShowDropdowns);
                            }}
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-dark-3 dark:border-dark-3 dark:text-white"
                            placeholder="Search product..."
                          />
                          {item.product_id && (
                            <button
                              type="button"
                              onClick={() => {
                                const updated = [...enquiryItems];
                                updated[index] = {
                                  ...updated[index],
                                  product_id: "",
                                  description: "",
                                  existing_image_url: undefined,
                                };
                                setEnquiryItems(updated);
                              }}
                              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                        
                        {showProductDropdowns[index] && 
                         filteredProducts[index] && 
                         filteredProducts[index].length > 0 && (
                          <div className="absolute z-10 w-full mt-1 bg-white dark:bg-dark-3 border border-gray-300 dark:border-dark-3 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                            {filteredProducts[index].map((product) => (
                              <div
                                key={product.id}
                                className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-dark-2 cursor-pointer border-b dark:border-dark-3 last:border-b-0"
                                onClick={() => selectProduct(product, index)}
                              >
                                <div className="font-medium text-gray-900 dark:text-white">{product.name}</div>
                                {product.sku && (
                                  <div className="text-sm text-gray-600 dark:text-gray-400">SKU: {product.sku}</div>
                                )}
                                {product.description && (
                                  <div className="text-sm text-gray-600 dark:text-gray-400 truncate">{product.description}</div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Description <span className="text-red-500">*</span>
                        </label>
                        <textarea
                          value={item.description}
                          onChange={(e) => updateItem(index, "description", e.target.value)}
                          rows={3}
                          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-dark-3 dark:border-dark-3 dark:text-white"
                          placeholder="Item description..."
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Qty <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, "quantity", parseInt(e.target.value) || 1)}
                        min="1"
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-dark-3 dark:border-dark-3 dark:text-white"
                        placeholder="Qty"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Image
                      </label>
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <input
                            type="file"
                            id={`item_image_${index}`}
                            accept="image/*"
                            onChange={(e) => {
                              if (e.target.files?.[0]) {
                                handleImageUpload(index, e.target.files[0]);
                              }
                            }}
                            className="hidden"
                          />
                          <button
                            type="button"
                            onClick={() => document.getElementById(`item_image_${index}`)?.click()}
                            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 dark:border-dark-3 dark:text-gray-300 dark:hover:bg-dark-3 text-sm flex items-center justify-center gap-2"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Pick Image
                          </button>
                          {item.image && (
                            <button
                              type="button"
                              onClick={() => removeUploadedImage(index)}
                              className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 text-sm"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                        
                        <div className="mt-2 space-y-2">
                          {item.existing_image_url && (
                            <div>
                              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Existing Product Image:</p>
                              <img
                                src={`${STATIC_BASE_URL}${item.existing_image_url.startsWith('/') ? '' : '/'}${item.existing_image_url}`}  alt="Existing Product"
                                className="max-w-full h-auto max-h-32 border border-gray-200 dark:border-gray-700 rounded"
                              />
                            </div>
                          )}
                          
                          {item.image && (
                            <div>
                              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Uploaded Image Preview:</p>
                              <img
                                src={URL.createObjectURL(item.image)}
                                alt="Uploaded Preview"
                                className="max-w-full h-auto max-h-32 border border-gray-200 dark:border-gray-700 rounded"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <Link
            href="/enquiries"
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 dark:border-dark-3 dark:text-gray-300 dark:hover:bg-dark-3"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Creating...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Save Enquiry
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
