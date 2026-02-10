"use client";

import { useState, useEffect,useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import { customersApi, productsApi, proformaInvoicesApi } from "@/services/api";
import { employeesApi } from "@/services/api";
import Select from 'react-select';
import { useRef } from "react";

// Reusable SelectField component
function SelectField({
    label,
    name,
    value,
    onChange,
    options,
    required = false,
    placeholder = "Select option",
}: {
    label: string;
    name: string;
    value: string | number;
    onChange: (name: string, value: any) => void;
    options: { value: string; label: string }[];
    required?: boolean;
    placeholder?: string;
}) {
    return (
        <div>
            <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                {label} {required && <span className="text-red-500">*</span>}
            </label>
            <Select
                name={name}
                value={options.find(o => o.value === value) || null}
                onChange={(selected) => onChange(name, selected?.value || "")}
                options={options}
                placeholder={placeholder}
                isClearable
                styles={{
                    control: (base: any, state: any) => ({
                        ...base,
                        minHeight: "42px",
                        borderRadius: "0.5rem",
                        borderWidth: "1px",
                        borderStyle: "solid",
                        borderColor: state.isFocused ? "#6366f1" : "#d1d5db",
                        boxShadow: state.isFocused
                            ? "0 0 0 2px rgba(99,102,241,0.4)"
                            : "none",
                        backgroundColor: "transparent",
                        "&:hover": {
                            borderColor: "#6366f1",
                        },
                    }),
                    valueContainer: (base: any) => ({
                        ...base,
                        padding: "0 12px",
                    }),
                    input: (base: any) => ({
                        ...base,
                        margin: 0,
                        padding: 0,
                    }),
                    indicatorsContainer: (base: any) => ({
                        ...base,
                        height: "42px",
                    }),
                    option: (base: any, state: any) => ({
                        ...base,
                        backgroundColor: state.isSelected
                            ? "#6366f1"
                            : state.isFocused
                                ? "#eef2ff"
                                : "white",
                        color: state.isSelected ? "white" : "#111827",
                    }),
                    menu: (base: any) => ({
                        ...base,
                        zIndex: 50,
                    }),
                }}
                classNamePrefix="react-select"
            />
        </div>
    );
}

// Reusable ProductSelectField component
function ProductSelectField({
    value,
    onChange,
    products,
    placeholder = "Search product",
}: {
    value: number | string;
    onChange: (product: any | null) => void;
    products: any[];
    placeholder?: string;
}) {
    const selectRef = useRef<any>(null);

    const options = products.map(product => ({
        value: product.id,
        label: `${product.name} ${product.sku ? `(${product.sku})` : ""}`,
        product,
    }));

    return (
        <Select
            ref={selectRef}
            options={options}
            value={options.find(o => String(o.value) === String(value)) || null}
            getOptionValue={(option) => String(option.value)}
            getOptionLabel={(option) => option.label}
            onChange={(selected: any) =>
                onChange(selected ? selected.product : null)
            }
            placeholder={placeholder}
            isClearable
            openMenuOnFocus
            openMenuOnClick
            closeMenuOnSelect
            tabSelectsValue
            blurInputOnSelect={false}
            onKeyDown={(e) => {
                if (e.key === "Enter") {
                    e.preventDefault();
                    const menuOptions = selectRef.current?.props?.options;
                    const inputValue = selectRef.current?.select?.state?.inputValue;
                    if (menuOptions?.length && inputValue) {
                        onChange(menuOptions[0].product);
                        selectRef.current.blur();
                    }
                }
            }}
            menuPortalTarget={typeof window !== "undefined" ? document.body : null}
            menuPosition="fixed"
            styles={{
                control: (base: any, state: any) => ({
                    ...base,
                    minHeight: "38px",
                    borderRadius: "0.375rem",
                    borderColor: state.isFocused ? "#6366f1" : "#d1d5db",
                    boxShadow: state.isFocused
                        ? "0 0 0 1px rgba(99,102,241,0.5)"
                        : "none",
                }),
                menuPortal: (base: any) => ({
                    ...base,
                    zIndex: 9999,
                }),
            }}
        />
    );
}

export default function AddProformaInvoicePage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const editId = searchParams?.get("editId");
    const isEditMode = Boolean(editId);
    const { company, user } = useAuth();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showTerms, setShowTerms] = useState(true);
    const [showOtherFields, setShowOtherFields] = useState(false);
const [contactPersons, setContactPersons] = useState<any[]>([]);
    const [productSearch, setProductSearch] = useState("");
    const [searchResults, setSearchResults] = useState<any[]>([]);

    // State for dropdown data
    const [customers, setCustomers] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]);
    const [salesmen, setSalesmen] = useState<any[]>([]);
    const [bankAccounts, setBankAccounts] = useState<any[]>([]);
    const [loading, setLoading] = useState({
        customers: false,
        products: false,
        salesmen: false,
        bankAccounts: false,
         contactPersons: false,
    });

    // Round off state
    const [roundOff, setRoundOff] = useState({
        type: "none" as "plus" | "minus" | "none",
        amount: 0
    });

    // Form state
    const [formData, setFormData] = useState({
        // Basic details
        customer_id: "",
        proforma_date: new Date().toISOString().split('T')[0],
        due_date: "",
        
        // Reference details
        reference_no: "",
        reference_date: "",
        
        // Contact & sales details
        contact_id: "",
        sales_person_id: "",
        bank_account_id: "",
        
        // Charges & discounts
        freight_charges: 0,
        pf_charges: 0,
        
        // Additional fields
        notes: "",
        terms: `1. This is a proforma invoice and does not constitute a formal invoice.
2. Prices are valid for 30 days from the date of issue.
3. All payments should be made as per the agreed terms.`,
        
        // Calculated fields
        subtotal: 0,
        total_tax: 0,
        total_amount: 0,
        delivery_note: "",
    supplier_ref: "",
    other_references: "",
    buyer_order_no: "",
    buyer_order_date: "",
    despatch_doc_no: "",
    delivery_note_date: "",
    despatched_through: "",
    destination: "",
    terms_of_delivery: "",
    payment_terms: "",
    });

    // Proforma items state - Added item_code field
    const [items, setItems] = useState([
        {
            id: 1,
            product_id: "",
            item_code: "",
            description: "",
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

    // Load data on component mount
    useEffect(() => {
        if (company?.id) {
            loadCustomers();
            loadProducts();
            loadSalesmen();
            loadBankAccounts();
        }
    }, [company?.id]);

    useEffect(() => {
        const loadExisting = async () => {
            if (!company?.id || !editId) return;
            try {
                const existing = await proformaInvoicesApi.get(company.id, editId);
                setFormData(prev => ({
                    ...prev,
                    customer_id: existing.customer_id || "",
                    proforma_date: existing.proforma_date ? existing.proforma_date.split("T")[0] : prev.proforma_date,
                    due_date: existing.due_date ? existing.due_date.split("T")[0] : "",
                    reference_no: existing.reference_no || "",
                    reference_date: existing.reference_date ? existing.reference_date.split("T")[0] : "",
                    contact_id: existing.contact_id || "",
                    sales_person_id: existing.sales_person_id || "",
                    bank_account_id: existing.bank_account_id || "",
                    freight_charges: Number(existing.freight_charges || 0),
                    pf_charges: Number(existing.pf_charges || 0),
                    notes: existing.notes || "",
                    terms: existing.terms || prev.terms,
                    subtotal: Number(existing.subtotal || 0),
                    total_tax: Number(existing.total_tax || 0),
                    total_amount: Number(existing.total_amount || 0),
                    delivery_note: existing.delivery_note || "",
                    supplier_ref: existing.supplier_ref || "",
                    other_references: existing.other_references || "",
                    buyer_order_no: existing.buyer_order_no || "",
                    buyer_order_date: existing.buyer_order_date ? existing.buyer_order_date.split("T")[0] : "",
                    despatch_doc_no: existing.despatch_doc_no || "",
                    delivery_note_date: existing.delivery_note_date ? existing.delivery_note_date.split("T")[0] : "",
                    despatched_through: existing.despatched_through || "",
                    destination: existing.destination || "",
                    terms_of_delivery: existing.terms_of_delivery || "",
                    payment_terms: existing.payment_terms || "",
                }));

                if (existing.items && Array.isArray(existing.items) && existing.items.length > 0) {
                    setItems(existing.items.map((item: any, index: number) => ({
                        id: item.id || Date.now() + index,
                        product_id: item.product_id || "",
                        item_code: item.item_code || "",
                        description: item.description || "",
                        quantity: Number(item.quantity || 1),
                        unit: item.unit || "unit",
                        unit_price: Number(item.unit_price || 0),
                        discount_percent: Number(item.discount_percent || 0),
                        discount_amount: Number(item.discount_amount || 0),
                        gst_rate: Number(item.gst_rate || 18),
                        cgst_rate: Number(item.cgst_rate || 0),
                        sgst_rate: Number(item.sgst_rate || 0),
                        igst_rate: Number(item.igst_rate || 0),
                        taxable_amount: Number(item.taxable_amount || 0),
                        total_amount: Number(item.total_amount || 0),
                    })));
                }

                if (existing.customer_id) {
                    fetchContactPersons(existing.customer_id);
                }
            } catch (error) {
                console.error("Failed to load proforma invoice for edit:", error);
            }
        };

        loadExisting();
    }, [company?.id, editId]);


    // Add this function to fetch contact persons
const fetchContactPersons = async (customerId: string) => {
    if (!company?.id || !customerId) return;
    
    try {
        setLoading(prev => ({ ...prev, contactPersons: true }));
        
        // Try to fetch contact persons from API
        // First check if customer has contact_persons field
        const customer = customers.find(c => c.id === customerId);
        if (customer && customer.contact_persons && Array.isArray(customer.contact_persons)) {
            setContactPersons(customer.contact_persons);
        } else {
            // If not, try to fetch from API endpoint
            try {
                const token = localStorage.getItem("access_token");
                const response = await fetch(
                    `${process.env.NEXT_PUBLIC_API_URL}/companies/${company.id}/customers/${customerId}/contact-persons`,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    }
                );
                
                if (response.ok) {
                    const data = await response.json();
                    let persons: any[] = [];
                    
                    if (Array.isArray(data)) {
                        persons = data;
                    } else if (data && typeof data === 'object') {
                        persons = data.contact_persons || data.contacts || data.data || data.items || [];
                    }
                    
                    setContactPersons(persons);
                }
            } catch (apiError) {
                console.warn("Failed to fetch contact persons from API:", apiError);
                // If API fails, try to extract from customer data
                if (customer) {
                    const persons = [];
                    // Check if customer has contact person fields
                    if (customer.contact_person_name || customer.contact_person) {
                        persons.push({
                            id: 'primary',
                            name: customer.contact_person_name || customer.contact_person || "Primary Contact",
                            email: customer.contact_email || customer.email || "",
                            phone: customer.contact_phone || customer.phone || customer.mobile || "",
                            designation: customer.contact_designation || ""
                        });
                    }
                    // Add customer itself as a contact option
                    persons.push({
                        id: 'customer',
                        name: customer.name || "Customer",
                        email: customer.email || "",
                        phone: customer.phone || customer.mobile || "",
                        designation: "Customer"
                    });
                    setContactPersons(persons);
                }
            }
        }
    } catch (error) {
        console.error("Error fetching contact persons:", error);
    } finally {
        setLoading(prev => ({ ...prev, contactPersons: false }));
    }
};


    const loadCustomers = async () => {
        try {
            setLoading(prev => ({ ...prev, customers: true }));
            const response = await customersApi.list(company!.id, {
                page_size: 100,
                search: "",
            });
            setCustomers(response.customers || []);
        } catch (error) {
            console.error("Failed to load customers:", error);
        } finally {
            setLoading(prev => ({ ...prev, customers: false }));
        }
    };

    const loadProducts = async () => {
        try {
            setLoading(prev => ({ ...prev, products: true }));
            const response = await productsApi.list(company!.id, {
                page_size: 100,
                search: "",
            });
            setProducts(response.products || []);
        } catch (error) {
            console.error("Failed to load products:", error);
        } finally {
            setLoading(prev => ({ ...prev, products: false }));
        }
    };

    const loadSalesmen = async () => {
    try {
        setLoading(prev => ({ ...prev, salesmen: true }));
        
        // Get authentication token
        const token = localStorage.getItem("access_token");
        if (!token) {
            console.error("No authentication token found");
            setSalesmen([]);
            return;
        }

        // Use the sales-engineers API endpoint
        const salesEngineersUrl = `${process.env.NEXT_PUBLIC_API_URL}/companies/${company!.id}/sales-engineers`;
        
        console.log("Fetching sales engineers from:", salesEngineersUrl);
        
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
        console.log("Sales engineers API response:", data);

        // Process the data correctly
        let salesEngineers = [];
        
        if (Array.isArray(data)) {
            salesEngineers = data;
        } else if (data && typeof data === 'object') {
            // Handle different response structures
            salesEngineers = data.sales_engineers || data.data || data.items || [];
        }

        // Format the data to match your frontend structure
        const formattedSalesmen = salesEngineers.map(engineer => ({
            id: engineer.id,
            name: engineer.full_name || engineer.name || 'Unnamed Engineer',
            email: engineer.email || '',
            phone: engineer.phone || engineer.mobile || '',
            designation: engineer.designation_name || engineer.designation || 'Sales Engineer',
            employee_code: engineer.employee_code || engineer.code || ''
        }));

        console.log("Formatted salesmen:", formattedSalesmen);
        setSalesmen(formattedSalesmen);
        
    } catch (error) {
        console.error("Failed to load sales engineers:", error);
        
        // Fallback to employees API if sales-engineers endpoint fails
        try {
            const employees = await employeesApi.list(company!.id);
            const salesEmployees = employees.filter(emp =>
                emp.designation?.toLowerCase().includes('sales') ||
                emp.employee_type?.toLowerCase().includes('sales')
            );
            console.log("Fallback sales employees:", salesEmployees);
            setSalesmen(salesEmployees);
        } catch (fallbackError) {
            console.error("Failed to load employees as fallback:", fallbackError);
            setSalesmen([]);
        }
    } finally {
        setLoading(prev => ({ ...prev, salesmen: false }));
    }
};
// Prepare salesman options for dropdown
const salesmanOptions = useMemo(() => {
    return salesmen.map(salesman => ({
        value: salesman.id,
        label: `${salesman.name} ${salesman.employee_code ? `(${salesman.employee_code})` : ''} ${salesman.designation ? `- ${salesman.designation}` : ''}`
    }));
}, [salesmen]);

    const loadBankAccounts = async () => {
        if (!company?.id) return;
        
        try {
            setLoading(prev => ({ ...prev, bankAccounts: true }));
            const token = localStorage.getItem("access_token");
            const response = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:6768/api"}/companies/${company.id}/bank-accounts`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );
            if (response.ok) {
                const data = await response.json();
                setBankAccounts(data.map((acc: any) => ({
                    id: acc.id,
                    name: acc.bank_name,
                    account_number: acc.account_number,
                })));
            }
        } catch (error) {
            console.error("Failed to load bank accounts:", error);
        } finally {
            setLoading(prev => ({ ...prev, bankAccounts: false }));
        }
    };

    // Calculate totals based on items
    const calculateTotals = () => {
        let subtotal = 0;
        let totalTax = 0;

        items.forEach(item => {
            const itemTotal = item.quantity * item.unit_price;
            const discount = item.discount_percent > 0 ?
                itemTotal * (item.discount_percent / 100) : 0;
            const taxable = itemTotal - discount;
            const tax = taxable * (item.gst_rate / 100);

            subtotal += taxable;
            totalTax += tax;
        });

        // Calculate additional charges
        const freightCharges = formData.freight_charges || 0;
        const pfCharges = formData.pf_charges || 0;
        
        // Calculate round off based on type
        let roundOffAmount = 0;
        if (roundOff.type === "plus") {
            roundOffAmount = roundOff.amount;
        } else if (roundOff.type === "minus") {
            roundOffAmount = -roundOff.amount;
        }

        const totalBeforeRoundOff = subtotal + totalTax + freightCharges + pfCharges;
        const total = totalBeforeRoundOff + roundOffAmount;

        return {
            subtotal: Number(subtotal.toFixed(2)),
            totalTax: Number(totalTax.toFixed(2)),
            freightAmount: Number(freightCharges.toFixed(2)),
            pfAmount: Number(pfCharges.toFixed(2)),
            roundOffAmount: Number(roundOffAmount.toFixed(2)),
            totalBeforeRoundOff: Number(totalBeforeRoundOff.toFixed(2)),
            total: Number(total.toFixed(2)),
        };
    };

    const totals = calculateTotals();

const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company?.id) return;

    setIsSubmitting(true);
    try {
        // Prepare proforma invoice data
        const proformaData = {
            customer_id: formData.customer_id,
            proforma_date: formData.proforma_date + "T00:00:00Z",
            due_date: formData.due_date ? formData.due_date + "T00:00:00Z" : undefined,
            reference_no: formData.reference_no,
            reference_date: formData.reference_date ? formData.reference_date + "T00:00:00Z" : undefined,
            sales_person_id: formData.sales_person_id || undefined,
            contact_id: formData.contact_id, // Still using contact_person - change to contact_id?
            bank_account_id: formData.bank_account_id || undefined,
            notes: formData.notes,
            terms: formData.terms,
            freight_charges: formData.freight_charges,
            pf_charges: formData.pf_charges,
            round_off: totals.roundOffAmount,
            subtotal: totals.subtotal,
            total_tax: totals.totalTax,
            total_amount: totals.total,
            // Add the new fields
            delivery_note: formData.delivery_note,
            supplier_ref: formData.supplier_ref,
            other_references: formData.other_references,
            buyer_order_no: formData.buyer_order_no,
            buyer_order_date: formData.buyer_order_date ? formData.buyer_order_date + "T00:00:00Z" : undefined,
            despatch_doc_no: formData.despatch_doc_no,
            delivery_note_date: formData.delivery_note_date ? formData.delivery_note_date + "T00:00:00Z" : undefined,
            despatched_through: formData.despatched_through,
            destination: formData.destination,
            terms_of_delivery: formData.terms_of_delivery,
            items: items.map(item => ({
                product_id: item.product_id || undefined,
                item_code: item.item_code,
                description: item.description,
                quantity: item.quantity,
                unit: item.unit,
                unit_price: item.unit_price,
                discount_percent: item.discount_percent,
                discount_amount: item.discount_amount,
                gst_rate: item.gst_rate,
                cgst_rate: item.cgst_rate,
                sgst_rate: item.sgst_rate,
                igst_rate: item.igst_rate,
                taxable_amount: item.taxable_amount,
                total_amount: item.total_amount,
            })),
        };

        console.log('Submitting proforma invoice data:', proformaData);

        // Call the API
        const response = isEditMode
            ? await proformaInvoicesApi.update(company.id, editId as string, proformaData)
            : await proformaInvoicesApi.create(company.id, proformaData);

        console.log('Proforma invoice saved successfully:', response);
        if (isEditMode) {
            router.push(`/sales/proforma-invoices/${editId}`);
        } else {
            router.push(`/sales/proforma-invoices`);
        }

    } catch (error: any) {
        console.error('Failed to create proforma invoice:', error);
        console.error('Error details:', error.response?.data || error.message);
        
        // Show more detailed error
        if (error.response?.data?.detail) {
            alert(`Error: ${JSON.stringify(error.response.data.detail, null, 2)}`);
        } else {
            alert('Failed to create proforma invoice. Please check your data and try again.');
        }
    } finally {
        setIsSubmitting(false);
    }
};

    // Update item calculation
    const updateItem = (id: number, field: string, value: any) => {
        setItems(items.map(item => {
            if (item.id === id) {
                const updated = { ...item, [field]: value };

                // Auto-fill product details when product is selected
                if (field === 'product_id' && value) {
                    const selectedProduct = products.find(p => p.id === value);
                    if (selectedProduct) {
                        updated.description = selectedProduct.name;
                        updated.unit_price = selectedProduct.unit_price || 0;
                        updated.gst_rate = parseFloat(selectedProduct.gst_rate) || 18;
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

                return updated;
            }
            return item;
        }));
    };

  // Update form data handler
const handleFormChange = (field: string, value: any) => {
    setFormData(prev => ({
        ...prev,
        [field]: value,
    }));

    // When customer is selected, fetch contact persons
    if (field === 'customer_id' && value) {
        const selectedCustomer = customers.find(c => c.id === value);
        if (selectedCustomer) {
            // Clear contact person when customer changes
            setFormData(prev => ({
                ...prev,
                contact_person: "",
            }));
            // Fetch contact persons for this customer
            fetchContactPersons(value);
        }
    }
};
// Prepare customer options for dropdown with more details
const customerOptions = useMemo(() => {
    return customers.map(customer => ({
        value: customer.id,
        label: `${customer.name} ${customer.email ? `(${customer.email})` : ''} ${customer.mobile ? `- ${customer.mobile}` : ''}`,
        data: customer
    }));
}, [customers]);
    const handleProductSearch = (value: string) => {
        setProductSearch(value);

        if (!value) {
            setSearchResults([]);
            return;
        }

        const results = products.filter(p =>
            p.name.toLowerCase().includes(value.toLowerCase()) ||
            p.sku?.toLowerCase().includes(value.toLowerCase())
        );

        setSearchResults(results);
    };

    const handleSearchSelect = (product: any) => {
        addItem({
            product_id: product.id,
            description: product.description || "",
            quantity: 1,
            unit_price: product.selling_price || 0,
            discount_percent: 0,
            gst_rate: product.gst_rate || 0,
        });

        setProductSearch("");
        setSearchResults([]);
    };

    const addItem = (prefill: any = {}) => {
        setItems(prev => [
            ...prev,
            {
                id: Date.now(),
                product_id: "",
                item_code: "",
                description: "",
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

    const handleRoundOffChange = (type: "plus" | "minus" | "none", amount: number) => {
        setRoundOff({
            type: type,
            amount: Number(amount.toFixed(2))
        });
    };

    const removeItem = (id: number) => {
        setItems(items.filter(item => item.id !== id));
    };

    return (
        <div className="min-h-screen bg-gray-50 p-4 dark:bg-gray-dark md:p-6">
            {/* Breadcrumb */}
            <nav className="mb-6 flex" aria-label="Breadcrumb">
                <ol className="inline-flex items-center space-x-1 text-sm md:space-x-2">
                    <li className="inline-flex items-center">
                        <Link href="/" className="inline-flex items-center text-dark-6 hover:text-primary dark:text-gray-400 dark:hover:text-white">
                            Home
                        </Link>
                    </li>
                    <li>
                        <div className="flex items-center">
                            <svg className="h-4 w-4 text-dark-6 dark:text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                            </svg>
                            <Link href="/sales/proforma-invoices" className="ml-1 text-dark-6 hover:text-primary dark:text-gray-400 dark:hover:text-white md:ml-2">
                                Proforma Invoice List
                            </Link>
                        </div>
                    </li>
                    <li>
                        <div className="flex items-center">
                            <svg className="h-4 w-4 text-dark-6 dark:text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                            </svg>
                            <span className="ml-1 font-medium text-dark dark:text-white md:ml-2">
                                {isEditMode ? "Edit Proforma Invoice" : "New Proforma Invoice"}
                            </span>
                        </div>
                    </li>
                    <li aria-current="page">
                        <div className="flex items-center">
                            <svg className="h-4 w-4 text-dark-6 dark:text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                            </svg>
                            <span className="ml-1 font-medium text-primary dark:text-primary md:ml-2">Proforma Invoice</span>
                        </div>
                    </li>
                </ol>
            </nav>

            {/* Page Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-dark dark:text-white">
                    {isEditMode ? "Proforma Invoice – Edit" : "Proforma Invoice – Add"}
                </h1>
                <p className="text-dark-6">
                    {isEditMode ? "Update proforma invoice details and items" : "Create new proforma invoice with customer details and items"}
                </p>
            </div>

            <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                    {/* Left Column - Main Form */}
                    <div className="lg:col-span-3 space-y-6">
                        {/* SECTION 1: Proforma Invoice Basic Details */}
                        <div className="rounded-lg bg-white p-6 shadow-1 dark:bg-gray-dark">
                            <h2 className="mb-4 text-lg font-semibold text-dark dark:text-white">Proforma Invoice Basic Details</h2>
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <div>
                                    <SelectField
                                        label="Company"
                                        name="company_id"
                                        value={company?.id || ""}
                                        onChange={() => { }}
                                        options={company ? [{ value: company.id, label: company.name }] : []}
                                        required={true}
                                        placeholder="Select Company"
                                    />
                                </div>
                                <div>
                                    <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                                        Proforma Invoice Code <span className="text-red-500">*</span>
                                    </label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value="PF/25-26/"
                                            className="flex-1 rounded-lg border border-stroke bg-gray-50 px-4 py-2.5 outline-none dark:border-dark-3 dark:bg-dark-2"
                                            readOnly
                                        />
                                        <input
                                            type="text"
                                            value="551"
                                            className="w-24 rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3"
                                            readOnly
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                                        Proforma Invoice Date <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="date"
                                        value={formData.proforma_date}
                                        onChange={(e) => handleFormChange('proforma_date', e.target.value)}
                                        className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3"
                                        required
                                    />
                                </div>
                                <div>
                                  <SelectField
    label="Customer Name"
    name="customer_id"
    value={formData.customer_id}
    onChange={handleFormChange}
    options={customerOptions}
    required={true}
    placeholder={loading.customers ? "Loading customers..." : "Select Customer"}
/>
                                </div>
                                <div>
                                    <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                                        Reference No
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.reference_no || ""}
                                        onChange={(e) => setFormData({ ...formData, reference_no: e.target.value })}
                                        className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3"
                                    />
                                </div>
                                <div>
                                    <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                                        Due Date
                                    </label>
                                    <input
                                        type="date"
                                        value={formData.due_date}
                                        onChange={(e) => handleFormChange('due_date', e.target.value)}
                                        className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3"
                                    />
                                </div>
                                <div>
                                    <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                                        Reference Date
                                    </label>
                                    <input
                                        type="date"
                                        value={formData.reference_date}
                                        onChange={(e) => handleFormChange('reference_date', e.target.value)}
                                        className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3"
                                    />
                                </div>
                                <div>
                                    <SelectField
                                        label="Bank Details"
                                        name="bank_account_id"
                                        value={formData.bank_account_id}
                                        onChange={handleFormChange}
                                        options={[
                                            { value: "", label: "-None-" },
                                            ...bankAccounts.map(account => ({
                                                value: account.id,
                                                label: `${account.name} - ${account.account_number}`
                                            }))
                                        ]}
                                        placeholder="Select Bank Account"
                                    />
                                </div>
                                <div>
                                    
                                 <div>
    <SelectField
        label="Contact Person"
        name="contact_id"
        value={formData.contact_id}
        onChange={handleFormChange}
        options={[
          
            ...contactPersons.map(person => ({
                value: person.id || person.name,
                label: `${person.name} ${person.designation ? `(${person.designation})` : ''} ${person.email ? `- ${person.email}` : ''} ${person.phone ? `- ${person.phone}` : ''}`
            }))
        ]}
        placeholder={!formData.customer_id ? "Select customer first" : loading.contactPersons ? "Loading contact persons..." : "Select Contact Person"}
        required={false}
    />
    {!formData.customer_id && (
        <p className="mt-1 text-xs text-gray-500">
            Please select a customer first to load contact persons
        </p>
    )}
</div>                        
</div> <div className="md:col-span-2">
                                    <SelectField
                                        label="Salesman"
                                        name="sales_person_id"
                                        value={formData.sales_person_id}
                                        onChange={handleFormChange}
                                        options={salesmen.map(salesman => ({
                                            value: salesman.id,
                                          label: `${salesman.name} ${salesman.employee_code ? `(${salesman.employee_code})` : ''} ${salesman.email ? `(${salesman.email})` : ''}`   }))}
                                        placeholder="Select Salesman"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* SECTION 2: Proforma Items Table */}
                        <div className="rounded-lg bg-white p-6 shadow-1 dark:bg-gray-dark">
                            <div className="mb-4 flex items-center justify-between">
                                <h2 className="text-lg font-semibold text-dark dark:text-white">Proforma Items</h2>
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
                                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                        <svg className="h-5 w-5 text-dark-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                        </svg>
                                    </div>
                                    <input
                                        type="text"
                                        value={productSearch}
                                        onChange={(e) => handleProductSearch(e.target.value)}
                                        placeholder="Item name / Barcode / Itemcode / Description"
                                        className="w-full rounded-lg border py-2.5 pl-10 pr-4"
                                    />
                                    {searchResults.length > 0 && (
                                        <div className="absolute z-50 mt-1 w-full rounded-lg border bg-white shadow">
                                            {searchResults.map(product => (
                                                <div
                                                    key={product.id}
                                                    onClick={() => handleSearchSelect(product)}
                                                    className="cursor-pointer px-4 py-2 hover:bg-gray-100"
                                                >
                                                    {product.name} {product.sku && `(${product.sku})`}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <button
                                    type="button"
                                    onClick={addItem}
                                    className="rounded-lg bg-primary px-4 py-2.5 text-white hover:bg-opacity-90"
                                >
                                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                </button>
                            </div>

                            {/* Items Table - Updated with Item Code */}
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-stroke dark:border-dark-3">
                                            <th className="px-4 py-3 text-left text-sm font-medium text-dark-6">Item Code</th>
                                            <th className="px-4 py-3 text-left text-sm font-medium text-dark-6">Item Name</th>
                                            <th className="px-4 py-3 text-left text-sm font-medium text-dark-6">Description</th>
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
                                                    <input
                                                        type="text"
                                                        value={item.item_code}
                                                        onChange={(e) => updateItem(item.id, 'item_code', e.target.value)}
                                                        className="w-28 rounded border border-stroke bg-transparent px-3 py-1.5 outline-none focus:border-primary dark:border-dark-3"
                                                        placeholder="Item Code"
                                                    />
                                                </td>
                                                <td className="px-4 py-3 min-w-[200px]">
                                                    <ProductSelectField
                                                        value={item.product_id}
                                                        products={products}
                                                        onChange={(product) => {
                                                            if (!product) return;

                                                            setItems(prev =>
                                                                prev.map(i => {
                                                                    if (i.id !== item.id) return i;

                                                                    const unitPrice =
                                                                        product.selling_price ??
                                                                        product.unit_price ??
                                                                        0;

                                                                    const gstRate = Number(product.gst_rate) || 0;
                                                                    const qty = i.quantity || 1;

                                                                    const taxable = qty * unitPrice;
                                                                    const tax = taxable * (gstRate / 100);

                                                                    return {
                                                                        ...i,
                                                                        product_id: product.id,
                                                                        description: product.name,
                                                                        unit_price: unitPrice,
                                                                        gst_rate: gstRate,
                                                                        discount_amount: 0,
                                                                        taxable_amount: taxable,
                                                                        total_amount: taxable + tax,
                                                                        cgst_rate: gstRate / 2,
                                                                        sgst_rate: gstRate / 2,
                                                                        igst_rate: 0,
                                                                    };
                                                                })
                                                            );
                                                        }}
                                                    />
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

                        {/* SECTION 3: Charges & Discounts - Simplified */}
                        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                            {/* Left side - Charges & Discounts */}
                            <div className="lg:col-span-2">
                                <div className="rounded-lg bg-white p-6 shadow-1 dark:bg-gray-dark">
                                    <h2 className="mb-4 text-lg font-semibold text-dark dark:text-white">Charges & Remarks</h2>
                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                        <div>
                                            <label className="mb-2 block text-sm font-medium text-dark dark:text-white">Freight Charges</label>
                                            <input
                                                type="number"
                                                value={formData.freight_charges}
                                                onChange={(e) => setFormData({ ...formData, freight_charges: parseFloat(e.target.value) || 0 })}
                                                className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3"
                                                min="0"
                                                step="0.01"
                                            />
                                        </div>
                                        <div>
                                            <label className="mb-2 block text-sm font-medium text-dark dark:text-white">P & F Charges</label>
                                            <input
                                                type="number"
                                                value={formData.pf_charges}
                                                onChange={(e) => setFormData({ ...formData, pf_charges: parseFloat(e.target.value) || 0 })}
                                                className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3"
                                                min="0"
                                                step="0.01"
                                            />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="mb-2 block text-sm font-medium text-dark dark:text-white">Remarks</label>
                                            <textarea
                                                value={formData.notes}
                                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                                rows={3}
                                                className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Right side - Total Summary */}
                            <div className="lg:col-span-1">
                                {/* Total Summary */}
                                <div className="rounded-lg bg-white p-6 shadow-1 dark:bg-gray-dark">
                                    <h2 className="mb-4 text-lg font-semibold text-dark dark:text-white">Total Summary</h2>
                                    <div className="space-y-3">
                                        <div className="flex justify-between">
                                            <span className="text-dark-6">Subtotal</span>
                                            <span className="font-medium text-dark dark:text-white">₹{totals?.subtotal?.toLocaleString('en-IN') || '0.00'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-dark-6">Tax</span>
                                            <span className="font-medium text-dark dark:text-white">₹{totals.totalTax.toLocaleString('en-IN')}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-dark-6">Freight Charges</span>
                                            <span className="font-medium text-dark dark:text-white">₹{totals.freightAmount.toLocaleString('en-IN')}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-dark-6">P & F Charges</span>
                                            <span className="font-medium text-dark dark:text-white">₹{totals.pfAmount.toLocaleString('en-IN')}</span>
                                        </div>
                                        
                                        {/* Round Off Controls */}
                                        <div className="flex justify-between items-center">
                                            <div className="flex items-center gap-2">
                                                <span className="text-dark-6">Round Off</span>
                                                <div className="flex gap-1">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const newAmount = roundOff.amount + 1;
                                                            handleRoundOffChange("plus", newAmount);
                                                        }}
                                                        className={`w-7 h-7 rounded flex items-center justify-center ${roundOff.type === "plus" ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-600'}`}
                                                    >
                                                        +
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const newAmount = roundOff.amount > 0 ? roundOff.amount - 1 : 0;
                                                            handleRoundOffChange("minus", newAmount);
                                                        }}
                                                        className={`w-7 h-7 rounded flex items-center justify-center ${roundOff.type === "minus" ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-600'}`}
                                                    >
                                                        -
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRoundOffChange("none", 0)}
                                                        className={`w-7 h-7 rounded flex items-center justify-center ${roundOff.type === "none" ? 'bg-gray-200 text-gray-700' : 'bg-gray-100 text-gray-600'}`}
                                                    >
                                                        0
                                                    </button>
                                                </div>
                                            </div>
                                            
                                            <div className="flex items-center gap-2">
                                                <div className="relative">
                                                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                                                        {roundOff.type === "plus" ? "+" : roundOff.type === "minus" ? "-" : ""}₹
                                                    </span>
                                                    <input
                                                        type="number"
                                                        value={roundOff.amount}
                                                        onChange={(e) => {
                                                            const amount = parseFloat(e.target.value) || 0;
                                                            setRoundOff(prev => ({
                                                                ...prev,
                                                                amount: amount
                                                            }));
                                                        }}
                                                        className={`w-28 rounded border pl-8 pr-2 py-1.5 outline-none focus:border-primary dark:border-dark-3 ${
                                                            roundOff.type === "plus" ? 'border-green-300 bg-green-50' :
                                                            roundOff.type === "minus" ? 'border-red-300 bg-red-50' :
                                                            'border-stroke bg-transparent'
                                                        }`}
                                                        min="0"
                                                        step="0.01"
                                                        disabled={roundOff.type === "none"}
                                                    />
                                                </div>
                                                <span className={`font-medium ${
                                                    roundOff.type === "plus" ? 'text-green-600' : 
                                                    roundOff.type === "minus" ? 'text-red-600' : 
                                                    'text-gray-600'
                                                }`}>
                                                    {roundOff.type === "plus" ? "+₹" : roundOff.type === "minus" ? "-₹" : "₹"}
                                                    {roundOff.amount.toFixed(2)}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="border-t border-stroke pt-3 dark:border-dark-3">
                                            <div className="flex justify-between">
                                                <span className="text-lg font-semibold text-dark dark:text-white">Grand Total</span>
                                                <span className="text-lg font-bold text-primary">₹{totals.total.toLocaleString('en-IN')}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* SECTION 4: Proforma Invoice Terms and Conditions */}
                        <div className="rounded-lg bg-white shadow-1 dark:bg-gray-dark">
                            <div className="flex items-center justify-between border-b border-stroke px-6 py-4 dark:border-dark-3">
                                <h2 className="text-lg font-semibold text-dark dark:text-white">Proforma Invoice Terms and Conditions</h2>
                                <button
                                    type="button"
                                    onClick={() => setShowTerms(!showTerms)}
                                    className="rounded p-1 hover:bg-gray-100 dark:hover:bg-dark-3"
                                >
                                    <svg className={`h-5 w-5 transition-transform ${showTerms ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>
                            </div>
                            {showTerms && (
                                <div className="p-6">
                                    <textarea
                                        value={formData.terms}
                                        onChange={(e) => setFormData({ ...formData, terms: e.target.value })}
                                        rows={6}
                                        className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 outline-none focus:border-primary dark:border-dark-3"
                                    />
                                </div>
                            )}
                        </div>
                      {/* SECTION 8: Other Fields (Accordion) */}
<div className="rounded-lg bg-white shadow-1 dark:bg-gray-dark">
    <div className="flex items-center justify-between border-b border-stroke px-6 py-4 dark:border-dark-3">
        <h2 className="text-lg font-semibold text-dark dark:text-white">
            Other Fields
        </h2>
        <button
            type="button"
            onClick={() => setShowOtherFields(!showOtherFields)}
            className="rounded p-1 hover:bg-gray-100 dark:hover:bg-dark-3"
        >
            <svg
                className={`h-5 w-5 transition-transform ${showOtherFields ? "rotate-180" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
            >
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                />
            </svg>
        </button>
    </div>

    {showOtherFields && (
        <div className="p-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {/* Delivery Note */}
                <div>
                    <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                        Delivery Note
                    </label>
                    <input
                        type="text"
                        value={formData.delivery_note || ""}
                        onChange={(e) =>
                            setFormData({ ...formData, delivery_note: e.target.value })
                        }
                        className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3"
                    />
                </div>

                {/* Mode / Terms of Payment */}
                <div>
                    <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                        Mode / Terms of Payment
                    </label>
                    <input
                        type="text"
                        value={formData.payment_terms || ""}
                        onChange={(e) =>
                            setFormData({ ...formData, payment_terms: e.target.value })
                        }
                        className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3"
                    />
                </div>

                {/* Supplier's Ref */}
                <div>
                    <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                        Supplier's Ref.
                    </label>
                    <input
                        type="text"
                        value={formData.supplier_ref || ""}
                        onChange={(e) =>
                            setFormData({ ...formData, supplier_ref: e.target.value })
                        }
                        className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3"
                    />
                </div>

                {/* Other Reference(s) */}
                <div>
                    <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                        Other Reference(s)
                    </label>
                    <input
                        type="text"
                        value={formData.other_references || ""}
                        onChange={(e) =>
                            setFormData({ ...formData, other_references: e.target.value })
                        }
                        className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3"
                    />
                </div>

                {/* Buyer's Order No. */}
                <div>
                    <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                        Buyer's Order No.
                    </label>
                    <input
                        type="text"
                        value={formData.buyer_order_no || ""}
                        onChange={(e) =>
                            setFormData({ ...formData, buyer_order_no: e.target.value })
                        }
                        className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3"
                    />
                </div>

                {/* Buyer's Order Date */}
                <div>
                    <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                        Buyer's Order Date
                    </label>
                    <input
                        type="date"
                        value={formData.buyer_order_date || ""}
                        onChange={(e) =>
                            setFormData({ ...formData, buyer_order_date: e.target.value })
                        }
                        className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3"
                    />
                </div>

                {/* Despatch Document No. */}
                <div>
                    <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                        Despatch Document No.
                    </label>
                    <input
                        type="text"
                        value={formData.despatch_doc_no || ""}
                        onChange={(e) =>
                            setFormData({ ...formData, despatch_doc_no: e.target.value })
                        }
                        className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3"
                    />
                </div>

                {/* Delivery Note Date */}
                <div>
                    <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                        Delivery Note Date
                    </label>
                    <input
                        type="date"
                        value={formData.delivery_note_date || ""}
                        onChange={(e) =>
                            setFormData({ ...formData, delivery_note_date: e.target.value })
                        }
                        className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3"
                    />
                </div>

                {/* Despatched Through */}
                <div>
                    <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                        Despatched Through
                    </label>
                    <input
                        type="text"
                        value={formData.despatched_through || ""}
                        onChange={(e) =>
                            setFormData({ ...formData, despatched_through: e.target.value })
                        }
                        className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3"
                    />
                </div>

                {/* Destination */}
                <div>
                    <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                        Destination
                    </label>
                    <input
                        type="text"
                        value={formData.destination || ""}
                        onChange={(e) =>
                            setFormData({ ...formData, destination: e.target.value })
                        }
                        className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3"
                    />
                </div>

                {/* Terms of Delivery */}
                <div className="md:col-span-2">
                    <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                        Terms of Delivery
                    </label>
                    <textarea
                        value={formData.terms_of_delivery || ""}
                        onChange={(e) =>
                            setFormData({ ...formData, terms_of_delivery: e.target.value })
                        }
                        rows={3}
                        className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3"
                    />
                </div>
            </div>
        </div>
    )}
</div>
                        {/* Action Buttons */}
                        <div className="rounded-lg p-6 dark:bg-gray-dark">
                            <div className="flex flex-wrap justify-center gap-4">
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="min-w-[180px] rounded-lg bg-green-600 px-6 py-3 font-medium text-white transition hover:bg-green-700 disabled:opacity-50"
                                >
                                    {isSubmitting ? "Saving..." : isEditMode ? "Update Proforma Invoice" : "Save Proforma Invoice"}
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
