"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

// Update the import statement at the top of page.tsx
import { customersApi, productsApi, getErrorMessage, purchaseRequestsApi } from "@/services/api";

interface Customer {
  id: string;
  name: string;
  email?: string;
  contact?: string;
  tax_number?: string;
}

interface Product {
  id: string;
  name: string;
  description?: string;
  sku?: string;
  price?: number;
}

interface PurchaseRequestItem {
  product_id: string;
  item: string;
  quantity: string;
  store_remarks: string;
  approval_status: "pending" | "approved" | "rejected" | "hold";
}

interface FormData {
  purchase_req_no: string;
  date: string;
  status: "open" | "in_process" | "closed";
  customer_id: string;
  customer_name: string;
  items: PurchaseRequestItem[];
  notes: string;
}

// Generate purchase request number
const generatePurchaseReqNo = () => {
  const prefix = "PR";
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  return `${prefix}-${random}`;
};

// Debounce function to limit API calls
const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

export default function CreatePurchaseRequestPage() {
  const { company } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [fetchingCustomers, setFetchingCustomers] = useState(false);
  const [fetchingProducts, setFetchingProducts] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [productSearchTerm, setProductSearchTerm] = useState("");
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [showProductDropdown, setShowProductDropdown] = useState<number | null>(null);
  const [selectedCustomerIndex, setSelectedCustomerIndex] = useState(-1);
  const [selectedProductIndex, setSelectedProductIndex] = useState<number | null>(null);

  const [formData, setFormData] = useState<FormData>({
    purchase_req_no: generatePurchaseReqNo(),
    date: new Date().toISOString().split('T')[0], // Today's date in YYYY-MM-DD
    status: "open",
    customer_id: "",
    customer_name: "",
    items: [{ 
      product_id: "", 
      item: "", 
      quantity: "", 
      store_remarks: "",
      approval_status: "pending"
    }],
    notes: "",
  });

  // Fetch initial customers on component mount
  useEffect(() => {
    if (company?.id) {
      customersApi.list(company.id, { page: 1, page_size: 10 })
        .then(response => {
          setCustomers(response.customers || []);
        })
        .catch(error => {
          console.error("Error fetching initial customers:", error);
        });
    }
  }, [company?.id]);

  // Keyboard navigation for dropdowns
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showCustomerDropdown) {
        switch (e.key) {
          case 'ArrowDown':
            e.preventDefault();
            setSelectedCustomerIndex(prev => 
              prev < customers.length - 1 ? prev + 1 : 0
            );
            break;
          case 'ArrowUp':
            e.preventDefault();
            setSelectedCustomerIndex(prev => 
              prev > 0 ? prev - 1 : customers.length - 1
            );
            break;
          case 'Enter':
            e.preventDefault();
            if (selectedCustomerIndex >= 0 && customers[selectedCustomerIndex]) {
              selectCustomer(customers[selectedCustomerIndex]);
            }
            break;
          case 'Escape':
            setShowCustomerDropdown(false);
            setSelectedCustomerIndex(-1);
            break;
        }
      }
      
      if (showProductDropdown !== null) {
        switch (e.key) {
          case 'ArrowDown':
            e.preventDefault();
            setSelectedProductIndex(prev => 
              prev !== null && prev < products.length - 1 ? prev + 1 : 0
            );
            break;
          case 'ArrowUp':
            e.preventDefault();
            setSelectedProductIndex(prev => 
              prev !== null && prev > 0 ? prev - 1 : products.length - 1
            );
            break;
          case 'Enter':
            e.preventDefault();
            if (selectedProductIndex !== null && products[selectedProductIndex] && showProductDropdown !== null) {
              selectProduct(showProductDropdown, products[selectedProductIndex]);
            }
            break;
          case 'Escape':
            setShowProductDropdown(null);
            setSelectedProductIndex(null);
            break;
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showCustomerDropdown, customers, selectedCustomerIndex, showProductDropdown, products, selectedProductIndex]);

  // Create debounced fetch functions
  const debouncedFetchCustomers = useCallback(
    debounce(async (searchValue: string) => {
      if (!company?.id) return;
      
      setFetchingCustomers(true);
      try {
        const customersData = await customersApi.search(company.id, searchValue, 20);
        setCustomers(customersData || []);
      } catch (error) {
        console.error("Error fetching customers:", error);
        setCustomers([]);
      } finally {
        setFetchingCustomers(false);
      }
    }, 300),
    [company?.id]
  );

  const debouncedFetchProducts = useCallback(
    debounce(async (searchValue: string, itemIndex: number) => {
      if (!company?.id || !searchValue.trim()) {
        setProducts([]);
        return;
      }
      
      setFetchingProducts(true);
      try {
        const productsData = await productsApi.search(company.id, searchValue, 20);
        setProducts(productsData || []);
        setSelectedProductIndex(0); // Select first item by default
      } catch (error) {
        console.error("Error fetching products:", error);
        setProducts([]);
      } finally {
        setFetchingProducts(false);
      }
    }, 300),
    [company?.id]
  );

  const handleCustomerSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    setFormData(prev => ({ 
      ...prev, 
      customer_name: value,
      customer_id: ""
    }));
    
    if (value.trim()) {
      setShowCustomerDropdown(true);
      debouncedFetchCustomers(value);
      setSelectedCustomerIndex(0); // Select first item by default
    } else {
      setShowCustomerDropdown(false);
      setCustomers([]);
    }
  };

  const selectCustomer = (customer: Customer) => {
    setFormData(prev => ({
      ...prev,
      customer_id: customer.id,
      customer_name: customer.name
    }));
    setSearchTerm(customer.name);
    setShowCustomerDropdown(false);
    setSelectedCustomerIndex(-1);
    setError(null);
  };

  const handleItemSearchChange = async (index: number, value: string) => {
    const updatedItems = [...formData.items];
    updatedItems[index] = {
      ...updatedItems[index],
      item: value,
      product_id: "" // Clear product_id when typing
    };
    setFormData(prev => ({ ...prev, items: updatedItems }));
    
    if (value.trim()) {
      setProductSearchTerm(value);
      setShowProductDropdown(index);
      debouncedFetchProducts(value, index);
    } else {
      setShowProductDropdown(null);
      setProducts([]);
    }
  };

  const selectProduct = (index: number, product: Product) => {
    const updatedItems = [...formData.items];
    updatedItems[index] = {
      ...updatedItems[index],
      product_id: product.id,
      item: product.name
    };
    setFormData(prev => ({ ...prev, items: updatedItems }));
    setShowProductDropdown(null);
    setProducts([]);
    setSelectedProductIndex(null);
  };

  const handleQuantityChange = (index: number, value: string) => {
    const updatedItems = [...formData.items];
    updatedItems[index] = {
      ...updatedItems[index],
      quantity: value
    };
    setFormData(prev => ({ ...prev, items: updatedItems }));
  };

  const handleStoreRemarksChange = (index: number, value: string) => {
    const updatedItems = [...formData.items];
    updatedItems[index] = {
      ...updatedItems[index],
      store_remarks: value
    };
    setFormData(prev => ({ ...prev, items: updatedItems }));
  };

  const handleApprovalStatusChange = (index: number, value: "pending" | "approved" | "rejected" | "hold") => {
    const updatedItems = [...formData.items];
    updatedItems[index] = {
      ...updatedItems[index],
      approval_status: value
    };
    setFormData(prev => ({ ...prev, items: updatedItems }));
  };

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { 
        product_id: "", 
        item: "", 
        quantity: "", 
        store_remarks: "",
        approval_status: "pending"
      }]
    }));
  };

  const removeItem = (index: number) => {
    if (formData.items.length > 1) {
      const updatedItems = formData.items.filter((_, i) => i !== index);
      setFormData(prev => ({ ...prev, items: updatedItems }));
    }
  };

  const validateForm = (): boolean => {
    if (!formData.customer_id || !formData.customer_name.trim()) {
      setError("Please select a customer");
      return false;
    }

    if (!formData.purchase_req_no.trim()) {
      setError("Purchase request number is required");
      return false;
    }

    if (!formData.date) {
      setError("Date is required");
      return false;
    }

    for (const [index, item] of formData.items.entries()) {
      if (!item.item.trim()) {
        setError(`Please select an item for item ${index + 1}`);
        return false;
      }
      
      if (!item.quantity.trim()) {
        setError(`Please enter quantity for item ${index + 1}`);
        return false;
      }
      
      const quantity = parseFloat(item.quantity);
      if (isNaN(quantity) || quantity <= 0) {
        setError(`Please enter a valid quantity for item ${index + 1}`);
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!company?.id) {
      setError("Please select a company first");
      return;
    }

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const apiData = {
        purchase_req_no: formData.purchase_req_no,
        date: formData.date,
        status: formData.status,
        customer_id: formData.customer_id,
        customer_name: formData.customer_name,
        items: formData.items.map(item => ({
          product_id: item.product_id,
          item: item.item,
          quantity: parseFloat(item.quantity),
          store_remarks: item.store_remarks,
          approval_status: item.approval_status
        })),
        notes: formData.notes || ""
      };
      
      // Use the purchaseRequestsApi from api.ts
      await purchaseRequestsApi.create(company.id, apiData);
      
      router.push("/purchase-req");
    } catch (error: any) {
      console.error("=== DEBUG: Purchase Request API Error ===");
      console.error("Full error:", error);
      console.error("Error response:", error.response?.data);
      setError(getErrorMessage(error, "Failed to create purchase request"));
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
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark dark:text-white">Create Purchase Request</h1>
          <p className="text-sm text-dark-6">Create a new purchase request for a customer</p>
        </div>
        <button
          type="button"
          onClick={() => router.push("/purchase-req")}
          className="inline-flex items-center gap-2 rounded-lg border border-stroke px-4 py-2 text-sm font-medium text-dark transition hover:bg-gray-100 dark:border-dark-3 dark:text-white dark:hover:bg-dark-3"
        >
          <span>←</span> Back
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="rounded-lg bg-red-50 p-4 text-red-600 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Purchase Request Header Information */}
        <div className="rounded-lg bg-white p-6 shadow-1 dark:bg-gray-dark">
          <h2 className="mb-4 text-lg font-semibold text-dark dark:text-white">Purchase Request Details</h2>
          
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                Purchase Request No. <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.purchase_req_no}
                onChange={(e) => setFormData(prev => ({ ...prev, purchase_req_no: e.target.value }))}
                placeholder="PR-XXXX-XXXX"
                className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 outline-none focus:border-primary dark:border-dark-3"
              />
            </div>
            
            <div>
              <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 outline-none focus:border-primary dark:border-dark-3"
              />
            </div>
            
            <div>
              <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                Status <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  status: e.target.value as "open" | "in_process" | "closed" 
                }))}
                className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 outline-none focus:border-primary dark:border-dark-3"
              >
                <option value="open">Open</option>
                <option value="in_process">In Process</option>
                <option value="closed">Closed</option>
              </select>
            </div>
          </div>
        </div>

        {/* Customer Selection */}
        <div className="rounded-lg bg-white p-6 shadow-1 dark:bg-gray-dark">
          <h2 className="mb-4 text-lg font-semibold text-dark dark:text-white">Customer Information</h2>
          
          <div className="relative">
            <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
              Customer Name <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={handleCustomerSearchChange}
                onFocus={() => {
                  if (searchTerm.trim()) {
                    setShowCustomerDropdown(true);
                  }
                }}
                onBlur={() => {
                  setTimeout(() => setShowCustomerDropdown(false), 200);
                }}
                placeholder="Search customer by name, email, or contact"
                className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 pr-10 outline-none focus:border-primary dark:border-dark-3"
              />
              
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm('');
                    setFormData(prev => ({
                      ...prev,
                      customer_name: '',
                      customer_id: ''
                    }));
                    setShowCustomerDropdown(false);
                    setCustomers([]);
                  }}
                  className="absolute right-3 top-3 text-dark-6 hover:text-dark dark:text-dark-6 dark:hover:text-white"
                >
                  ✕
                </button>
              )}
              
              {fetchingCustomers && (
                <div className="absolute right-10 top-3">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                </div>
              )}
              
              {showCustomerDropdown && (
                <div className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-stroke bg-white shadow-lg dark:border-dark-3 dark:bg-gray-dark">
                  {customers.length === 0 ? (
                    <div className="px-4 py-3 text-dark-6 dark:text-dark-6">
                      {searchTerm ? "No customers found" : "Start typing to search customers"}
                    </div>
                  ) : (
                    customers.map((customer, index) => (
                      <div
                        key={customer.id}
                        onClick={() => selectCustomer(customer)}
                        className={`cursor-pointer px-4 py-3 hover:bg-gray-100 dark:hover:bg-dark-3 ${
                          selectedCustomerIndex === index ? 'bg-gray-100 dark:bg-dark-3' : ''
                        } ${
                          index < customers.length - 1 ? 'border-b border-stroke dark:border-dark-3' : ''
                        }`}
                      >
                        <div className="font-medium text-dark dark:text-white">{customer.name}</div>
                        <div className="flex flex-wrap items-center gap-2 text-sm text-dark-6 dark:text-dark-6">
                          {customer.contact && (
                            <span className="flex items-center gap-1">
                              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                              </svg>
                              {customer.contact}
                            </span>
                          )}
                          {customer.email && (
                            <span className="flex items-center gap-1">
                              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                              </svg>
                              {customer.email}
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
            
            {formData.customer_id && (
              <div className="mt-2 rounded-lg bg-green-50 p-3 dark:bg-green-900/20">
                <p className="text-sm text-green-600 dark:text-green-400">
                  Selected: <span className="font-medium">{formData.customer_name}</span>
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Items Section */}
        <div className="rounded-lg bg-white p-6 shadow-1 dark:bg-gray-dark">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-dark dark:text-white">Requested Items</h2>
            <button
              type="button"
              onClick={addItem}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-opacity-90"
            >
              <span>+</span> Add Item
            </button>
          </div>

          <div className="space-y-4">
            {formData.items.length === 0 ? (
              <div className="rounded-lg border border-dashed border-stroke p-8 text-center dark:border-dark-3">
                <p className="text-dark-6">No items added</p>
                <button
                  type="button"
                  onClick={addItem}
                  className="mt-2 inline-flex items-center gap-2 text-primary hover:underline"
                >
                  <span>+</span> Add your first item
                </button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-12 gap-4 border-b border-stroke pb-2 dark:border-dark-3">
                  <div className="col-span-1 text-sm font-medium text-dark-6 dark:text-dark-6">S.No</div>
                  <div className="col-span-4 text-sm font-medium text-dark-6 dark:text-dark-6">
                    Item Name <span className="text-red-500">*</span>
                  </div>
                  <div className="col-span-2 text-sm font-medium text-dark-6 dark:text-dark-6">
                    Quantity <span className="text-red-500">*</span>
                  </div>
                  <div className="col-span-2 text-sm font-medium text-dark-6 dark:text-dark-6">
                    Store Remarks
                  </div>
                  <div className="col-span-2 text-sm font-medium text-dark-6 dark:text-dark-6">
                    Approval Status
                  </div>
                  <div className="col-span-1 text-sm font-medium text-dark-6 dark:text-dark-6">Action</div>
                </div>

                {formData.items.map((item, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-12 items-center gap-4 rounded-lg border border-stroke p-4 transition hover:border-primary dark:border-dark-3"
                  >
                    <div className="col-span-1 font-medium text-dark dark:text-white">{index + 1}</div>
                    
                    <div className="col-span-4">
                      <div className="relative">
                        <input
                          type="text"
                          value={item.item}
                          onChange={(e) => handleItemSearchChange(index, e.target.value)}
                          onFocus={() => {
                            if (item.item.trim()) {
                              setShowProductDropdown(index);
                            }
                          }}
                          onBlur={() => {
                            setTimeout(() => {
                              if (showProductDropdown === index) {
                                setShowProductDropdown(null);
                              }
                            }, 200);
                          }}
                          placeholder="Search or enter item name"
                          className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2 outline-none focus:border-primary dark:border-dark-3"
                        />
                        
                        {item.item && (
                          <button
                            type="button"
                            onClick={() => {
                              const updatedItems = [...formData.items];
                              updatedItems[index] = {
                                ...updatedItems[index],
                                product_id: "",
                                item: ""
                              };
                              setFormData(prev => ({ ...prev, items: updatedItems }));
                              setShowProductDropdown(null);
                              setProducts([]);
                            }}
                            className="absolute right-2 top-2 text-dark-6 hover:text-dark dark:text-dark-6 dark:hover:text-white"
                          >
                            ✕
                          </button>
                        )}
                        
                        {fetchingProducts && showProductDropdown === index && (
                          <div className="absolute right-8 top-2">
                            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                          </div>
                        )}
                        
                        {showProductDropdown === index && products.length > 0 && (
                          <div className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-stroke bg-white shadow-lg dark:border-dark-3 dark:bg-gray-dark">
                            {products.map((product, productIndex) => (
                              <div
                                key={product.id}
                                onClick={() => selectProduct(index, product)}
                                className={`cursor-pointer px-4 py-3 hover:bg-gray-100 dark:hover:bg-dark-3 ${
                                  selectedProductIndex === productIndex ? 'bg-gray-100 dark:bg-dark-3' : ''
                                } ${
                                  productIndex < products.length - 1 ? 'border-b border-stroke dark:border-dark-3' : ''
                                }`}
                              >
                                <div className="font-medium text-dark dark:text-white">{product.name}</div>
                                <div className="flex flex-wrap items-center gap-2 text-sm text-dark-6 dark:text-dark-6">
                                  {product.sku && (
                                    <span className="bg-gray-100 px-2 py-0.5 rounded text-xs dark:bg-dark-3">
                                      SKU: {product.sku}
                                    </span>
                                  )}
                                  {product.description && (
                                    <span className="truncate">{product.description}</span>
                                  )}
                                  {product.price !== undefined && (
                                    <span className="ml-auto font-medium text-primary">
                                      ${product.price.toFixed(2)}
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="col-span-2">
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => handleQuantityChange(index, e.target.value)}
                        placeholder="0"
                        min="0"
                        step="0.01"
                        className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2 outline-none focus:border-primary dark:border-dark-3"
                      />
                    </div>
                    
                    <div className="col-span-2">
                      <input
                        type="text"
                        value={item.store_remarks}
                        onChange={(e) => handleStoreRemarksChange(index, e.target.value)}
                        placeholder="Enter store remarks"
                        className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2 outline-none focus:border-primary dark:border-dark-3"
                      />
                    </div>
                    
                    <div className="col-span-2">
                      <select
                        value={item.approval_status}
                        onChange={(e) => handleApprovalStatusChange(index, e.target.value as "pending" | "approved" | "rejected" | "hold")}
                        className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2 outline-none focus:border-primary dark:border-dark-3"
                      >
                        <option value="pending">Pending</option>
                        <option value="approved">Approve</option>
                        <option value="rejected">Reject</option>
                        <option value="hold">Hold</option>
                      </select>
                    </div>
                    
                    <div className="col-span-1 flex justify-center">
                      {formData.items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          className="rounded-lg bg-red-500 p-2 text-white transition hover:bg-red-600"
                          title="Remove item"
                        >
                          <span>−</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

        {/* Additional Notes */}
        <div className="rounded-lg bg-white p-6 shadow-1 dark:bg-gray-dark">
          <h2 className="mb-4 text-lg font-semibold text-dark dark:text-white">Additional Information</h2>
          
          <div>
            <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
              Remarks
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Add any additional notes or instructions"
              rows={4}
              className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 outline-none focus:border-primary dark:border-dark-3"
            />
          </div>
        </div>

        {/* Submit Buttons */}
        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-lg border border-stroke px-6 py-3 font-medium text-dark transition hover:bg-gray-100 dark:border-dark-3 dark:text-white dark:hover:bg-dark-3"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-primary px-6 py-3 font-medium text-white transition hover:bg-opacity-90 disabled:opacity-50"
          >
            {loading ? "Creating..." : "Create Purchase Request"}
          </button>
        </div>
      </form>
    </div>
  );
}