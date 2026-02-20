"use client";

import { useAuth } from "@/context/AuthContext";
import { customersApi, productsApi, inventoryApi, Customer, Product, Godown } from "@/services/api";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import Select from 'react-select';

interface DCItem {
  id: number;
  product_id?: string;
  description: string;
  hsn_code: string;
  quantity: number;
  unit: string;
  unit_price: number;
  discount_percent: number;
  discount_amount: number;
  gst_rate: number;
  cgst_rate: number;
  sgst_rate: number;
  igst_rate: number;
  taxable_amount: number;
  total_amount: number;
  godown_id?: string;
   
}

interface ContactPerson {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  designation?: string;
}

interface Salesman {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  designation?: string;
  employee_code?: string;
}

export default function NewDeliveryChallanPage() {
  const { company } = useAuth();
  const router = useRouter();
  const getToken = () => {
    if (typeof window === "undefined") return null;
    return (
      localStorage.getItem("employee_token") || localStorage.getItem("access_token")
    );
  };
  const searchParams = useSearchParams();
  const dcType = searchParams.get("type") || "dc_out";
  const invoiceId = searchParams.get("invoice_id");
  const fromQuotation = searchParams.get("fromQuotation");

  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [godowns, setGodowns] = useState<Godown[]>([]);
  const [contactPersons, setContactPersons] = useState<ContactPerson[]>([]);
  const [selectedContactPerson, setSelectedContactPerson] = useState<ContactPerson | null>(null);
  const [salesmen, setSalesmen] = useState<Salesman[]>([]);
  const [nextDcNumber, setNextDcNumber] = useState<string>("");
  const [prefillCustomerName, setPrefillCustomerName] = useState<string>("");
  const [prefillContactName, setPrefillContactName] = useState<string>("");
  const [prefillSalesmanName, setPrefillSalesmanName] = useState<string>("");

  const [formData, setFormData] = useState({
    customer_id: "",
    dc_date: new Date().toISOString().split("T")[0],
    from_godown_id: "",
    to_godown_id: "",
    transporter_name: "",
    vehicle_number: "",
    reference_no: "", 
    eway_bill_number: "",
    return_reason: "",
    notes: "",
    auto_update_stock: true,
    // New fields for charges and discounts
    freightCharges: 0,
    freightType: "fixed",
    pfCharges: 0,
    pfType: "fixed",
    discountOnAll: 0,
    discountType: "percentage",
    roundOff: 0,
    // New fields
    dc_number: "",
    status: "Open",
    bill_title: "",
    bill_description: "",
    contact_person: "",
    expiry_date: "",
    salesman_id: "",
  });

  const [items, setItems] = useState<DCItem[]>([
    { 
      id: 1,
      description: "", 
      hsn_code: "", 
      quantity: 1, 
      unit: "unit", 
      unit_price: 0,
      discount_percent: 0,
      discount_amount: 0,
      gst_rate: 18,
      cgst_rate: 9,
      sgst_rate: 9,
      igst_rate: 0,
      taxable_amount: 0,
      total_amount: 0,
    },
  ]);

  const [error, setError] = useState<string | null>(null);
  const [productSearch, setProductSearch] = useState("");
  const [searchResults, setSearchResults] = useState<Product[]>([]);

  // Status options from image
  const statusOptions = [
    { value: "Open", label: "Open" },
    { value: "Closed", label: "Closed" },
    { value: "DC Returned", label: "DC Returned" },
    { value: "Follow Up", label: "Follow Up" },
    { value: "Converted", label: "Converted" },
  ];

  useEffect(() => {
    const fetchData = async () => {
      if (!company?.id) return;
      try {
        const [customersData, productsData, godownsData] = await Promise.all([
          customersApi.list(company.id, { page_size: 100 }),
          productsApi.list(company.id, { page_size: 100 }),
          inventoryApi.listGodowns(company.id),
        ]);
        setCustomers(customersData.customers);
        setProducts(productsData.products);
        setGodowns(godownsData);
        
        // Fetch sales engineers
        await fetchSalesEngineers();
        
        // Fetch next DC number
        await fetchNextDcNumber();
      } catch (error) {
        console.error("Failed to fetch data:", error);
      }
    };
    fetchData();
  }, [company?.id, dcType]);

  useEffect(() => {
    const prefillFromQuotation = async () => {
      if (!company?.id || !fromQuotation) return;
      const token = getToken();
      if (!token) return;

      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:6768/api"}/companies/${company.id}/quotations/${fromQuotation}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        if (!response.ok) {
          console.error("Failed to fetch quotation for DC prefill");
          return;
        }

        const quotation = await response.json();

        setFormData(prev => ({
          ...prev,
          customer_id: quotation.customer_id || prev.customer_id,
          contact_person: quotation.contact_id || prev.contact_person,
          salesman_id: quotation.sales_person_id || prev.salesman_id,
          notes: quotation.notes || prev.notes,
          bill_title: quotation.subject || prev.bill_title,
          bill_description: quotation.remarks || quotation.notes || prev.bill_description,
          reference_no: quotation.reference_no || quotation.reference || "",
        }));

        setPrefillCustomerName(quotation.customer_name || "");
        setPrefillContactName(quotation.contact_person || "");
        setPrefillSalesmanName(quotation.sales_person_name || "");

        if (quotation.customer_id) {
          try {
            const customerRes = await fetch(
              `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:6768/api"}/companies/${company.id}/customers/${quotation.customer_id}`,
              { headers: { Authorization: `Bearer ${token}` } }
            );
            if (customerRes.ok) {
              const customer = await customerRes.json();
              setCustomers(prev => {
                const exists = prev.some(c => c.id === customer.id);
                return exists ? prev : [...prev, customer];
              });
              if (Array.isArray(customer.contact_persons)) {
                setContactPersons(customer.contact_persons);
                if (!formData.contact_person && customer.contact_persons.length > 0) {
                  const matchedByName = prefillContactName
                    ? customer.contact_persons.find((p: any) => p.name === prefillContactName)
                    : null;
                  const selected = matchedByName || customer.contact_persons[0];
                  setSelectedContactPerson(selected);
                  setFormData(prev => ({
                    ...prev,
                    contact_person: selected?.id || "",
                  }));
                }
              }
            }
          } catch (error) {
            console.error("Failed to fetch customer for DC prefill:", error);
          }
        }

        const mappedItems: DCItem[] = (quotation.items || []).map((item: any, index: number) => {
          const quantity = Number(item.quantity || 1);
          const unitPrice = Number(item.unit_price || 0);
          const discountPercent = Number(item.discount_percent || 0);
          const itemTotal = quantity * unitPrice;
          const discountAmount = discountPercent > 0 ? itemTotal * (discountPercent / 100) : 0;
          const taxableAmount = itemTotal - discountAmount;
          const gstRate = Number(item.gst_rate || 0);
          const totalAmount = taxableAmount + taxableAmount * (gstRate / 100);
          const halfGst = gstRate / 2;

          return {
            id: Date.now() + index,
            product_id: item.product_id,
            description: item.description || item.product_name || "",
            hsn_code: item.hsn_code || "",
            quantity,
            unit: item.unit || "unit",
            unit_price: unitPrice,
            discount_percent: discountPercent,
            discount_amount: discountAmount,
            gst_rate: gstRate,
            cgst_rate: halfGst,
            sgst_rate: halfGst,
            igst_rate: 0,
            taxable_amount: taxableAmount,
            total_amount: totalAmount,
            godown_id: item.godown_id || undefined,
          };
        });

        if (mappedItems.length > 0) {
          setItems(mappedItems);
        }
      } catch (error) {
        console.error("Failed to prefill DC from quotation:", error);
      }
    };

    prefillFromQuotation();
  }, [company?.id, fromQuotation]);

  useEffect(() => {
    if (!formData.customer_id && prefillCustomerName && customers.length > 0) {
      const matched = customers.find(c => c.name === prefillCustomerName);
      if (matched) {
        setFormData(prev => ({
          ...prev,
          customer_id: matched.id,
        }));
      }
    }
  }, [prefillCustomerName, customers, formData.customer_id]);

  useEffect(() => {
    if (!formData.salesman_id && prefillSalesmanName && salesmen.length > 0) {
      const matched = salesmen.find(s => s.name === prefillSalesmanName);
      if (matched) {
        setFormData(prev => ({
          ...prev,
          salesman_id: matched.id,
        }));
      }
    }
  }, [prefillSalesmanName, salesmen, formData.salesman_id]);


 // Fetch next DC number
const fetchNextDcNumber = async () => {
  if (!company?.id) return;
  
  try {
    const token = getToken();
    if (!token) return;

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/companies/${company.id}/delivery-challans/next-number?dc_type=${dcType}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (response.ok) {
      const data = await response.json();
      if (data.next_number) {
        setNextDcNumber(data.next_number);
        setFormData(prev => ({
          ...prev,
          dc_number: data.next_number
        }));
      }
    }
  } catch (error) {
    console.error("Failed to fetch next DC number:", error);
  }
};

  // Fetch contact persons when customer changes
  useEffect(() => {
    if (formData.customer_id) {
      fetchContactPersons(formData.customer_id);
    } else {
      setContactPersons([]);
      setSelectedContactPerson(null);
      setFormData(prev => ({
        ...prev,
        contact_person: ""
      }));
    }
  }, [formData.customer_id]);

  // Fetch contact persons
  const fetchContactPersons = async (customerId: string) => {
    if (!company?.id) return;
    try {
      const apiUrl = `${process.env.NEXT_PUBLIC_API_URL}/companies/${company.id}/contact-persons?customer_id=${customerId}`;
      
      const token = getToken();
      if (!token) return;

      const response = await fetch(apiUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        let persons: any[] = [];
        
        if (Array.isArray(data)) {
          persons = data;
        } else if (data && typeof data === 'object') {
          persons = data.contact_persons || data.contacts || data.data || data.items || [];
        }
        
        setContactPersons(persons);
        
          if (persons.length > 0) {
            const matchedById = persons.find(p => p.id === formData.contact_person);
            const matchedByName = prefillContactName
              ? persons.find(p => p.name === prefillContactName)
              : null;
            const selected = matchedById || matchedByName || persons[0];
            setSelectedContactPerson(selected);
            if (!matchedById) {
              setFormData(prev => ({
                ...prev,
                contact_person: selected?.id || ""
              }));
            }
          } else {
            setSelectedContactPerson(null);
            setFormData(prev => ({
              ...prev,
              contact_person: ""
            }));
          }
      }
    } catch (error) {
      console.error("Failed to fetch contact persons:", error);
      setContactPersons([]);
      setSelectedContactPerson(null);
    }
  };

  const fetchSalesEngineers = async () => {
    if (!company?.id) return;
    
    try {
      const token = getToken();
      if (!token) {
        return;
      }

      const salesEngineersUrl = `${process.env.NEXT_PUBLIC_API_URL}/companies/${company.id}/sales-engineers`;
      
      const response = await fetch(salesEngineersUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Process the data correctly
      if (data && Array.isArray(data) && data.length > 0) {
        // Format the data to match your frontend structure
        const formattedSalesmen = data.map(engineer => ({
          id: engineer.id,
          name: engineer.full_name || 'Unnamed Engineer',
          email: engineer.email || '',
          phone: engineer.phone || '',
          designation: engineer.designation_name || 'Sales Engineer',
          employee_code: engineer.employee_code || ''
        }));

        setSalesmen(formattedSalesmen);
      } else {
        setSalesmen([]);
      }
    } catch (error: any) {
      console.error("Failed to fetch sales engineers:", error);
      setSalesmen([]);
    }
  };

  // Calculate totals (unchanged)
  const calculateTotals = () => {
    let subtotal = 0;
    let totalTax = 0;
    let totalItemDiscount = 0;

    items.forEach(item => {
      const itemTotal = item.quantity * item.unit_price;
      const discount = item.discount_percent > 0 ? itemTotal * (item.discount_percent / 100) : 0;
      const taxable = itemTotal - discount;
      const tax = taxable * (item.gst_rate / 100);

      subtotal += taxable;
      totalTax += tax;
      totalItemDiscount += discount;
    });

    // Calculate additional charges and discounts
    const freightCharges = formData.freightCharges || 0;
    const pfCharges = formData.pfCharges || 0;
    const discountOnAll = formData.discountOnAll || 0;

    const discountAllAmount = formData.discountType === 'percentage'
      ? subtotal * (discountOnAll / 100)
      : discountOnAll;

    const totalBeforeTax = subtotal;
    const totalAfterTax = totalBeforeTax + totalTax;
    const totalAfterCharges = totalAfterTax + freightCharges + pfCharges;
    const totalAfterDiscountAll = totalAfterCharges - discountAllAmount;
    const grandTotal = totalAfterDiscountAll + (formData.roundOff || 0);

    return {
      subtotal: Number(totalBeforeTax.toFixed(2)),
      totalTax: Number(totalTax.toFixed(2)),
      itemDiscount: Number(totalItemDiscount.toFixed(2)),
      freight: Number(freightCharges.toFixed(2)),
      pf: Number(pfCharges.toFixed(2)),
      discountAll: Number(discountAllAmount.toFixed(2)),
      roundOff: Number(formData.roundOff || 0),
      grandTotal: Number(grandTotal.toFixed(2)),
      totalAfterCharges: Number(totalAfterCharges.toFixed(2)),
      totalAfterDiscountAll: Number(totalAfterDiscountAll.toFixed(2)),
    };
  };

  const totals = calculateTotals();

  const addItem = (prefill: Partial<DCItem> = {}) => {
    setItems(prev => [
      ...prev,
      { 
        id: Date.now(),
        description: "", 
        hsn_code: "", 
        quantity: 1, 
        unit: "unit", 
        unit_price: 0,
        discount_percent: 0,
        discount_amount: 0,
        gst_rate: 18,
        cgst_rate: 9,
        sgst_rate: 9,
        igst_rate: 0,
        taxable_amount: 0,
        total_amount: 0,
        ...prefill,
      },
    ]);
  };

  const removeItem = (id: number) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    }
  };

  const updateItem = (id: number, field: keyof DCItem, value: any) => {
    setItems(prevItems => {
      return prevItems.map(item => {
        if (item.id === id) {
          const updated = { ...item, [field]: value };

          // Auto-fill product details when product is selected
          if (field === 'product_id' && value) {
            const selectedProduct = products.find(p => p.id === value);
            if (selectedProduct) {
              updated.description = selectedProduct.name;
              updated.unit_price = selectedProduct.unit_price || 0;
              updated.gst_rate = parseFloat(selectedProduct.gst_rate as any) || 18;
              updated.hsn_code = selectedProduct.hsn_code || "";
              updated.unit = selectedProduct.unit || "unit";
            }
          }

          // Recalculate item totals
          const itemTotal = updated.quantity * updated.unit_price;
          const discount = updated.discount_percent > 0 ? 
            itemTotal * (updated.discount_percent / 100) : 0;
          const taxable = itemTotal - discount;
          const tax = taxable * (updated.gst_rate / 100);

          updated.discount_amount = discount;
          updated.taxable_amount = taxable;
          updated.total_amount = taxable + tax;

          // Set CGST/SGST/IGST rates (assuming intra-state for delivery challan)
          updated.cgst_rate = updated.gst_rate / 2;
          updated.sgst_rate = updated.gst_rate / 2;
          updated.igst_rate = 0;

          return updated;
        }
        return item;
      });
    });
  };

  const handleProductSearch = (value: string) => {
    setProductSearch(value);

    if (!value) {
      setSearchResults([]);
      return;
    }

    const results = products.filter(p =>
      p.name.toLowerCase().includes(value.toLowerCase()) ||
      (p.sku && p.sku.toLowerCase().includes(value.toLowerCase()))
    );

    setSearchResults(results);
  };

  const handleSearchSelect = (product: Product) => {
    addItem({
      product_id: product.id,
      description: product.name,
      hsn_code: product.hsn_code || "",
      unit_price: product.unit_price || 0,
      gst_rate: parseFloat(product.gst_rate as any) || 18,
      unit: product.unit || "unit",
    });

    setProductSearch("");
    setSearchResults([]);
  };

 const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  const token = getToken();
  if (!company?.id || !token) return;

  const validItems = items.filter((item) => item.description && item.quantity > 0);
  if (validItems.length === 0) {
    setError("Please add at least one item with description and quantity");
    return;
  }

  setLoading(true);
  setError(null);

  try {
    const endpoint = dcType === "dc_out" ? "dc-out" : "dc-in";
    const { reference_no, ...formPayload } = formData;
    const body: any = {
      ...formPayload,
      items: validItems.map(item => ({
        product_id: item.product_id,
        description: item.description,
        hsn_code: item.hsn_code,
        quantity: item.quantity,
        unit: item.unit,
        unit_price: item.unit_price,
        discount_percent: item.discount_percent,
        discount_amount: item.discount_amount,
        gst_rate: item.gst_rate,
        taxable_amount: item.taxable_amount,
        total_amount: item.total_amount,
        godown_id: dcType === "dc_out" ? formData.from_godown_id : formData.to_godown_id,
      })),
      // FIX: Include all the new fields
      dc_number: formData.dc_number,
      status: formData.status,
      custom_status: formData.status,
      reference_no,
      contact_id: formData.contact_person || undefined,
      bill_title: formData.bill_title,
      bill_description: formData.bill_description,
      contact_person: selectedContactPerson?.name || undefined,
      expiry_date: formData.expiry_date,
      salesman_id: formData.salesman_id,
      // Include totals for reference
      subtotal: totals.subtotal,
      freight_charges: formData.freightCharges,
      packing_forwarding_charges: formData.pfCharges,
      discount_on_all: totals.discountAll,
      discount_type: formData.discountType,
      round_off: formData.roundOff,
      grand_total: totals.grandTotal,
    };

    if (invoiceId) {
      body.invoice_id = invoiceId;
    }

    console.log("Sending data to API:", body); // Debug log

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/companies/${company.id}/delivery-challans/${endpoint}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      }
    );

      if (response.ok) {
        const data = await response.json();
        router.push(`/delivery-challans/${data.id}`);
      } else {
        const errorData = await response.json();
        setError(errorData.detail || "Failed to create delivery challan");
      }
    } catch (err) {
      console.error("Error creating delivery challan:", err);
      setError("Failed to create delivery challan");
    } finally {
      setLoading(false);
    }
  };

  const handleFormChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));

    // If contact person dropdown changes
    if (field === 'contact_person') {
      const selectedPerson = contactPersons.find(p => p.id === value);
      if (selectedPerson) {
        setSelectedContactPerson(selectedPerson);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 dark:bg-gray-dark md:p-6">
      {/* Breadcrumb */}
      <nav className="mb-6 flex" aria-label="Breadcrumb">
        <ol className="inline-flex items-center space-x-1 text-sm md:space-x-2">
          <li className="inline-flex items-center">
            <a href="/" className="inline-flex items-center text-dark-6 hover:text-primary dark:text-gray-400 dark:hover:text-white">
              Home
            </a>
          </li>
          <li>
            <div className="flex items-center">
              <svg className="h-4 w-4 text-dark-6 dark:text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
              <a href="/delivery-challans" className="ml-1 text-dark-6 hover:text-primary dark:text-gray-400 dark:hover:text-white md:ml-2">
                Delivery Challans
              </a>
            </div>
          </li>
          <li aria-current="page">
            <div className="flex items-center">
              <svg className="h-4 w-4 text-dark-6 dark:text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
              <span className="ml-1 font-medium text-primary dark:text-primary md:ml-2">
                New {dcType === "dc_out" ? "DC Out" : "DC In"}
              </span>
            </div>
          </li>
        </ol>
      </nav>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-dark dark:text-white">
          Delivery Challan – {dcType === "dc_out" ? "DC Out (Dispatch)" : "DC In (Return)"}
        </h1>
        <p className="text-dark-6">
          {dcType === "dc_out" 
            ? "Create a delivery challan for goods dispatch" 
            : "Create a delivery challan for goods return"}
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-lg bg-red-100 p-4 text-red-700 dark:bg-red-900/30 dark:text-red-400">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Left Column - Main Form */}
          <div className="lg:col-span-3 space-y-6">
            {/* SECTION 1: Basic Information */}
            <div className="rounded-lg bg-white p-6 shadow-1 dark:bg-gray-dark">
              <h2 className="mb-4 text-lg font-semibold text-dark dark:text-white">Basic Information</h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {/* DC Number */}
              
<div>
  <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
    {dcType === "dc_out" ? "Delivery Challan Out Code" : "Delivery Challan In Code"}
  </label>
  <input
    type="text"
    value={formData.dc_number}
    onChange={(e) => handleFormChange('dc_number', e.target.value)}
    placeholder={dcType === "dc_out" ? "DCO-XXXX-XXXX" : "DCI-XXXX-XXXX"}
    className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3"
    required
  />
  {nextDcNumber && (
    <p className="mt-1 text-xs text-dark-6">
      Next available: {nextDcNumber}
    </p>
  )}
</div>

                {/* Status */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => handleFormChange('status', e.target.value)}
                    className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3"
                    required
                  >
                    {statusOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* DC Date */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-dark dark:text-white">DC Date</label>
                  <input
                    type="date"
                    value={formData.dc_date}
                    onChange={(e) => handleFormChange('dc_date', e.target.value)}
                    className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3"
                    required
                  />
                </div>

                {/* Customer */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-dark dark:text-white">Customer</label>
                  <select
                    value={formData.customer_id}
                    onChange={(e) => handleFormChange('customer_id', e.target.value)}
                    className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3"
                    required
                  >
                    <option value="">Select Customer</option>
                    {customers.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Contact Person */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-dark dark:text-white">Contact Person</label>
                  <select
                    value={formData.contact_person}
                    onChange={(e) => handleFormChange('contact_person', e.target.value)}
                    className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3"
                    disabled={!formData.customer_id || contactPersons.length === 0}
                  >
                    <option value="">Select Contact Person</option>
                    {contactPersons.map((person) => (
                        <option key={person.id} value={person.id}>
                          {person.name} {person.designation ? `(${person.designation})` : ''}
                        </option>
                    ))}
                  </select>
                  {formData.customer_id && contactPersons.length === 0 && (
                    <p className="mt-1 text-xs text-dark-6">
                      No contact persons found for this customer
                    </p>
                  )}
                  {selectedContactPerson && (
                    <div className="mt-1 text-xs text-dark-6">
                      {selectedContactPerson.email && <div>Email: {selectedContactPerson.email}</div>}
                      {selectedContactPerson.phone && <div>Phone: {selectedContactPerson.phone}</div>}
                    </div>
                  )}
                </div>


{/* Add this field in the Basic Information grid */}
<div>
  <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
    Reference Number
  </label>
  <input
    type="text"
    value={formData.reference_no || ""} // You'll need to add this to formData state
    onChange={(e) => handleFormChange('reference_no', e.target.value)}
    placeholder="PO/Order/Reference No"
    className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3"
  />
</div>

                {/* Salesman */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-dark dark:text-white">Salesman</label>
                  <select
                    value={formData.salesman_id}
                    onChange={(e) => handleFormChange('salesman_id', e.target.value)}
                    className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3"
                  >
                    <option value="">Select Salesman</option>
                    {salesmen.map((salesman) => (
                      <option key={salesman.id} value={salesman.id}>
                        {salesman.name} {salesman.employee_code ? `(${salesman.employee_code})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Bill Title */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-dark dark:text-white">Bill Title</label>
                  <input
                    type="text"
                    value={formData.bill_title}
                    onChange={(e) => handleFormChange('bill_title', e.target.value)}
                    placeholder="Bill title or reference"
                    className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3"
                  />
                </div>

                {/* Expiry Date */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-dark dark:text-white">Expiry Date</label>
                  <input
                    type="date"
                    value={formData.expiry_date}
                    onChange={(e) => handleFormChange('expiry_date', e.target.value)}
                    className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3"
                  />
                </div>
              </div>

              {/* Bill Description */}
              <div className="mt-4">
                <label className="mb-2 block text-sm font-medium text-dark dark:text-white">Bill Description</label>
                <textarea
                  value={formData.bill_description}
                  onChange={(e) => handleFormChange('bill_description', e.target.value)}
                  rows={2}
                  placeholder="Description of the bill or additional notes..."
                  className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3"
                />
              </div>
            </div>

            {/* Godown Selection */}
            {dcType === "dc_out" ? (
              <div className="rounded-lg bg-white p-6 shadow-1 dark:bg-gray-dark">
                <h2 className="mb-4 text-lg font-semibold text-dark dark:text-white">Godown Details</h2>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-dark dark:text-white">From Godown</label>
                    <select
                      value={formData.from_godown_id}
                      onChange={(e) => handleFormChange('from_godown_id', e.target.value)}
                      className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3"
                      required
                    >
                      <option value="">Select Godown</option>
                      {godowns.map((godown) => (
                        <option key={godown.id} value={godown.id}>
                          {godown.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-lg bg-white p-6 shadow-1 dark:bg-gray-dark">
                <h2 className="mb-4 text-lg font-semibold text-dark dark:text-white">Godown Details</h2>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-dark dark:text-white">To Godown</label>
                    <select
                      value={formData.to_godown_id}
                      onChange={(e) => handleFormChange('to_godown_id', e.target.value)}
                      className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3"
                      required
                    >
                      <option value="">Select Godown</option>
                      {godowns.map((godown) => (
                        <option key={godown.id} value={godown.id}>
                          {godown.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Return Reason (for DC In) */}
            {dcType === "dc_in" && (
              <div className="rounded-lg bg-white p-6 shadow-1 dark:bg-gray-dark">
                <h2 className="mb-4 text-lg font-semibold text-dark dark:text-white">Return Details</h2>
                <div>
                  <label className="mb-2 block text-sm font-medium text-dark dark:text-white">Return Reason</label>
                  <textarea
                    value={formData.return_reason}
                    onChange={(e) => handleFormChange('return_reason', e.target.value)}
                    rows={2}
                    placeholder="Reason for goods return..."
                    className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3"
                  />
                </div>
              </div>
            )}

            {/* SECTION 2: Delivery Challan Items (unchanged) */}
            <div className="rounded-lg bg-white p-6 shadow-1 dark:bg-gray-dark">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-dark dark:text-white">Delivery Challan Items</h2>
                <div className="flex gap-2">
                  <div className="text-dark-6">
                    Total Quantity: {items.reduce((sum, item) => sum + item.quantity, 0)}
                  </div>
                  <div className="text-dark-6">
                    Items: {items.length}
                  </div>
                </div>
              </div>

              {/* Item Search */}
              <div className="mb-4 flex gap-2">
                <div className="relative flex-1">
                  
                 
                  {searchResults.length > 0 && (
                    <div className="absolute z-50 mt-1 w-full rounded-lg border bg-white shadow dark:bg-gray-dark">
                      {searchResults.map(product => (
                        <div
                          key={product.id}
                          onClick={() => handleSearchSelect(product)}
                          className="cursor-pointer px-4 py-2 hover:bg-gray-100 dark:hover:bg-dark-3"
                        >
                          {product.name} {product.sku && `(${product.sku})`}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => addItem()}
                  className="rounded-lg bg-primary px-4 py-2.5 text-white hover:bg-opacity-90"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              </div>

              {/* Items Table */}
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1000px]">
                  <thead>
                    <tr className="border-b border-stroke dark:border-dark-3">
                      <th className="px-4 py-3 text-left text-sm font-medium text-dark-6">Product</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-dark-6">Description</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-dark-6">HSN</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-dark-6">Quantity</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-dark-6">Unit Price</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-dark-6">Discount</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-dark-6">Tax Amount</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-dark-6">Tax</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-dark-6">Total Amount</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-dark-6">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={item.id} className="border-b border-stroke last:border-0 dark:border-dark-3">
                        <td className="px-4 py-3">
                          <select
                            value={item.product_id || ""}
                            onChange={(e) => updateItem(item.id, 'product_id', e.target.value)}
                            className="w-full min-w-[150px] rounded border border-stroke bg-transparent px-3 py-1.5 outline-none focus:border-primary dark:border-dark-3"
                          >
                            <option value="">Select Product</option>
                            {products.map((product) => (
                              <option key={product.id} value={product.id}>
                                {product.name} {product.sku && `(${product.sku})`}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="text"
                            value={item.description}
                            onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                            className="w-full min-w-[150px] rounded border border-stroke bg-transparent px-3 py-1.5 outline-none focus:border-primary dark:border-dark-3"
                            placeholder="Description"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="text"
                            value={item.hsn_code}
                            onChange={(e) => updateItem(item.id, 'hsn_code', e.target.value)}
                            className="w-24 rounded border border-stroke bg-transparent px-3 py-1.5 outline-none focus:border-primary dark:border-dark-3"
                            placeholder="HSN"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => updateItem(item.id, 'quantity', parseFloat(e.target.value))}
                            className="w-20 rounded border border-stroke bg-transparent px-3 py-1.5 outline-none focus:border-primary dark:border-dark-3"
                            min="1"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            value={item.unit_price}
                            onChange={(e) => updateItem(item.id, 'unit_price', parseFloat(e.target.value))}
                            className="w-24 rounded border border-stroke bg-transparent px-3 py-1.5 outline-none focus:border-primary dark:border-dark-3"
                            min="0"
                            step="0.01"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            <input
                              type="number"
                              value={item.discount_percent}
                              onChange={(e) => updateItem(item.id, 'discount_percent', parseFloat(e.target.value))}
                              className="w-16 rounded border border-stroke bg-transparent px-2 py-1.5 outline-none focus:border-primary dark:border-dark-3"
                              min="0"
                              step="0.01"
                            />
                            <span className="flex items-center px-1 py-1.5 text-xs">%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-medium">
                            ₹{(item.discount_amount || 0).toFixed(2)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={item.gst_rate}
                            onChange={(e) => updateItem(item.id, 'gst_rate', parseFloat(e.target.value))}
                            className="w-20 rounded border border-stroke bg-transparent px-2 py-1.5 outline-none focus:border-primary dark:border-dark-3"
                          >
                            <option value="0">0%</option>
                            <option value="5">5%</option>
                            <option value="12">12%</option>
                            <option value="18">18%</option>
                            <option value="28">28%</option>
                          </select>
                        </td>
                        <td className="px-4 py-3 font-medium">
                          ₹{item.total_amount.toFixed(2)}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => removeItem(item.id)}
                            className="rounded p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                            disabled={items.length === 1}
                          >
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* SECTION 3: Charges & Discounts and Total Summary */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {/* Left side - Charges & Discounts */}
              <div className="lg:col-span-2">
                <div className="rounded-lg bg-white p-6 shadow-1 dark:bg-gray-dark">
                  <h2 className="mb-4 text-lg font-semibold text-dark dark:text-white">Charges & Discounts</h2>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-dark dark:text-white">Freight Charges</label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          value={formData.freightCharges}
                          onChange={(e) => handleFormChange('freightCharges', parseFloat(e.target.value))}
                          className="flex-1 rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3"
                          min="0"
                        />
                        <select
                          value={formData.freightType}
                          onChange={(e) => handleFormChange('freightType', e.target.value)}
                          className="w-24 rounded-lg border border-stroke bg-transparent px-2 py-2.5 outline-none focus:border-primary dark:border-dark-3"
                        >
                          <option value="fixed">Fixed</option>
                          <option value="percentage">%</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-dark dark:text-white">P & F Charges</label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          value={formData.pfCharges}
                          onChange={(e) => handleFormChange('pfCharges', parseFloat(e.target.value))}
                          className="flex-1 rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3"
                          min="0"
                        />
                        <select
                          value={formData.pfType}
                          onChange={(e) => handleFormChange('pfType', e.target.value)}
                          className="w-24 rounded-lg border border-stroke bg-transparent px-2 py-2.5 outline-none focus:border-primary dark:border-dark-3"
                        >
                          <option value="fixed">Fixed</option>
                          <option value="percentage">%</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-dark dark:text-white">Discount on All</label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          value={formData.discountOnAll}
                          onChange={(e) => handleFormChange('discountOnAll', parseFloat(e.target.value))}
                          className="flex-1 rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3"
                          min="0"
                        />
                        <select
                          value={formData.discountType}
                          onChange={(e) => handleFormChange('discountType', e.target.value)}
                          className="w-24 rounded-lg border border-stroke bg-transparent px-2 py-2.5 outline-none focus:border-primary dark:border-dark-3"
                        >
                          <option value="percentage">%</option>
                          <option value="fixed">Fixed</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-dark dark:text-white">Round Off</label>
                      <input
                        type="number"
                        value={formData.roundOff}
                        onChange={(e) => handleFormChange('roundOff', parseFloat(e.target.value))}
                        className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3"
                        step="0.01"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="mb-2 block text-sm font-medium text-dark dark:text-white">Note</label>
                      <textarea
                        value={formData.notes}
                        onChange={(e) => handleFormChange('notes', e.target.value)}
                        rows={3}
                        className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3"
                        placeholder="Additional notes..."
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Right side - Total Summary */}
              <div className="lg:col-span-1">
                <div className="rounded-lg bg-white p-6 shadow-1 dark:bg-gray-dark">
                  <h2 className="mb-4 text-lg font-semibold text-dark dark:text-white">Total Summary</h2>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-dark-6">Subtotal</span>
                      <span className="font-medium text-dark dark:text-white">
                        ₹{totals.subtotal.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-dark-6">Freight Charges</span>
                      <span className="font-medium text-dark dark:text-white">
                        ₹{totals.freight.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-dark-6">P & F Charges</span>
                      <span className="font-medium text-dark dark:text-white">
                        ₹{totals.pf.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-dark-6">Discount on All</span>
                      <span className="font-medium text-red-600">
                        -₹{totals.discountAll.toLocaleString('en-IN')}
                      </span>
                    </div>
                    {formData.roundOff !== 0 && (
                      <div className="flex justify-between">
                        <span className="text-dark-6">Round Off</span>
                        <span className={`font-medium ${formData.roundOff >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formData.roundOff >= 0 ? '+' : ''}₹{Math.abs(formData.roundOff).toFixed(2)}
                        </span>
                      </div>
                    )}
                    <div className="border-t border-stroke pt-3 dark:border-dark-3">
                      <div className="flex justify-between">
                        <span className="text-lg font-semibold text-dark dark:text-white">Grand Total</span>
                        <span className="text-lg font-bold text-primary">
                          ₹{totals.grandTotal.toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Transport Details (for DC Out) */}
            {dcType === "dc_out" && (
              <div className="rounded-lg bg-white p-6 shadow-1 dark:bg-gray-dark">
                <h2 className="mb-4 text-lg font-semibold text-dark dark:text-white">Transport Details</h2>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-dark dark:text-white">Transporter Name</label>
                    <input
                      type="text"
                      value={formData.transporter_name}
                      onChange={(e) => handleFormChange('transporter_name', e.target.value)}
                      placeholder="Transport company name"
                      className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-dark dark:text-white">Vehicle Number</label>
                    <input
                      type="text"
                      value={formData.vehicle_number}
                      onChange={(e) => handleFormChange('vehicle_number', e.target.value)}
                      placeholder="e.g., MH12AB1234"
                      className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-dark dark:text-white">E-Way Bill Number</label>
                    <input
                      type="text"
                      value={formData.eway_bill_number}
                      onChange={(e) => handleFormChange('eway_bill_number', e.target.value)}
                      placeholder="For goods > ₹50,000"
                      className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* SECTION 4: Stock Update Option */}
            <div className="rounded-lg bg-white p-6 shadow-1 dark:bg-gray-dark">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="autoUpdateStock"
                  checked={formData.auto_update_stock}
                  onChange={(e) => handleFormChange('auto_update_stock', e.target.checked)}
                  className="h-5 w-5 rounded border-stroke text-primary focus:ring-primary dark:border-dark-3"
                />
                <label htmlFor="autoUpdateStock" className="text-dark dark:text-white">
                  Automatically update stock on creation
                </label>
              </div>
              <p className="mt-1 text-sm text-dark-6">
                {dcType === "dc_out"
                  ? "Stock will be reduced when this DC is created"
                  : "Stock will be increased when this DC is created"}
              </p>
            </div>

            {/* SECTION 5: Action Buttons */}
            <div className="rounded-lg bg-white p-6 shadow-1 dark:bg-gray-dark">
              <div className="flex flex-wrap justify-center gap-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="min-w-[180px] rounded-lg bg-primary px-6 py-3 font-medium text-white transition hover:bg-opacity-90 disabled:opacity-50"
                >
                  {loading ? "Creating..." : `Create ${dcType === "dc_out" ? "DC Out" : "DC In"}`}
                </button>

                <button
                  type="button"
                  onClick={() => router.back()}
                  className="min-w-[180px] rounded-lg border border-stroke bg-white px-6 py-3 font-medium text-dark transition hover:bg-gray-50 dark:border-dark-3 dark:bg-gray-dark dark:text-white"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
