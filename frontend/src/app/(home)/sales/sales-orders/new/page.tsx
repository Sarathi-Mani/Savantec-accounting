"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import { customersApi, productsApi, salesOrdersApi } from "@/services/api";
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

export default function AddSalesOrderPage() {
    const router = useRouter();
    const { company, user } = useAuth();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showTerms, setShowTerms] = useState(true);
    const [showOtherFields, setShowOtherFields] = useState(false);

    const [productSearch, setProductSearch] = useState("");
    const [searchResults, setSearchResults] = useState<any[]>([]);

    // State for dropdown data
    const [customers, setCustomers] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]);
    const [salesmen, setSalesmen] = useState<any[]>([]);
    const [loading, setLoading] = useState({
        customers: false,
        products: false,
        salesmen: false,
    });

    // Form state
    const [formData, setFormData] = useState({
        // Basic details
        customer_id: "",
        sales_order_date: new Date().toISOString().split('T')[0],
        expire_date: "",
        status: "pending",
        
        // Reference details
        reference_no: "",
        reference_date: "",
        payment_terms: "",
        
        // Sales pipeline tracking
        sales_person_id: "",
        contact_person: "",
        
        // Additional fields
        notes: "",
        terms: `1. All payments should be made direct to the company or its authorized representative by cheque/RTGS.
2. All disputes subject to Chennai Jurisdiction.
3. Goods once sold will not be taken back.`,
        
        // Charges & discounts
        other_charges: 0,
        charges_type: "fixed",
        discount_on_all: 0,
        discount_type: "percentage",
        send_message: false,
        
        // Calculated fields
        subtotal: 0,
        total_tax: 0,
        total_amount: 0,
    });

    // Sales items state
    const [items, setItems] = useState([
        {
            id: 1,
            product_id: "",
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
        }
    }, [company?.id]);

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
            const employees = await employeesApi.list(company!.id);
            const salesEmployees = employees.filter(emp =>
                emp.designation?.toLowerCase().includes('sales') ||
                emp.employee_type?.toLowerCase().includes('sales')
            );
            setSalesmen(salesEmployees);
        } catch (error) {
            console.error("Failed to load salesmen:", error);
        } finally {
            setLoading(prev => ({ ...prev, salesmen: false }));
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

        // Calculate additional charges and discounts
        const otherCharges = formData.other_charges || 0;
        const discountOnAll = formData.discount_on_all || 0;

        // Calculate charges based on type
        const chargesAmount = formData.charges_type === 'percentage'
            ? subtotal * (otherCharges / 100)
            : otherCharges;

        // Calculate discount on all based on type
        const discountAllAmount = formData.discount_type === 'percentage'
            ? subtotal * (discountOnAll / 100)
            : discountOnAll;

        const roundOff = 0;
        const total = subtotal + totalTax + chargesAmount - discountAllAmount;
        const grandTotal = total + roundOff;

        return {
            subtotal: Number(subtotal.toFixed(2)),
            totalTax: Number(totalTax.toFixed(2)),
            chargesAmount: Number(chargesAmount.toFixed(2)),
            discountAllAmount: Number(discountAllAmount.toFixed(2)),
            roundOff: Number(roundOff.toFixed(2)),
            total: Number(total.toFixed(2)),
            grandTotal: Number(grandTotal.toFixed(2)),
        };
    };

    const totals = calculateTotals();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!company?.id) return;

        setIsSubmitting(true);
        try {
            // Prepare sales order data
            const salesOrderData = {
                customer_id: formData.customer_id,
                sales_order_date: formData.sales_order_date + "T00:00:00Z",
                expire_date: formData.expire_date ? formData.expire_date + "T00:00:00Z" : undefined,
                status: formData.status,
                reference_no: formData.reference_no,
                reference_date: formData.reference_date ? formData.reference_date + "T00:00:00Z" : undefined,
                payment_terms: formData.payment_terms,
                sales_person_id: formData.sales_person_id || undefined,
                contact_person: formData.contact_person,
                notes: formData.notes,
                terms: formData.terms,
                other_charges: totals.chargesAmount,
                discount_on_all: totals.discountAllAmount,
                subtotal: totals.subtotal,
                total_tax: totals.totalTax,
                total_amount: totals.grandTotal,
                send_message: formData.send_message,
                items: items.map(item => ({
                    product_id: item.product_id || undefined,
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

            // Call the API
            const response = await salesOrdersApi.create(company.id, salesOrderData);

            console.log('Sales order created successfully:', response);
            router.push(`/sales/sales-orders`);

        } catch (error) {
            console.error('Failed to create sales order:', error);
            alert('Failed to create sales order. Please check your data and try again.');
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

        // When customer is selected, auto-fill contact person
        if (field === 'customer_id' && value) {
            const selectedCustomer = customers.find(c => c.id === value);
            if (selectedCustomer) {
                setFormData(prev => ({
                    ...prev,
                    contact_person: selectedCustomer.contact_person || "",
                }));
            }
        }
    };

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
                            <Link href="/sales/sales-orders" className="ml-1 text-dark-6 hover:text-primary dark:text-gray-400 dark:hover:text-white md:ml-2">
                                Sales Order List
                            </Link>
                        </div>
                    </li>
                    <li>
                        <div className="flex items-center">
                            <svg className="h-4 w-4 text-dark-6 dark:text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                            </svg>
                            <span className="ml-1 font-medium text-dark dark:text-white md:ml-2">New Sales Order</span>
                        </div>
                    </li>
                    <li aria-current="page">
                        <div className="flex items-center">
                            <svg className="h-4 w-4 text-dark-6 dark:text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                            </svg>
                            <span className="ml-1 font-medium text-primary dark:text-primary md:ml-2">Sales Order</span>
                        </div>
                    </li>
                </ol>
            </nav>

            {/* Page Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-dark dark:text-white">Sales Order – Add / Update Sales Order</h1>
                <p className="text-dark-6">Create new sales order with customer details and items</p>
            </div>

            <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                    {/* Left Column - Main Form */}
                    <div className="lg:col-span-3 space-y-6">
                        {/* SECTION 1: Sales Order Basic Details */}
                        <div className="rounded-lg bg-white p-6 shadow-1 dark:bg-gray-dark">
                            <h2 className="mb-4 text-lg font-semibold text-dark dark:text-white">Sales Order Basic Details</h2>
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
                                        Sales Order Code <span className="text-red-500">*</span>
                                    </label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value="SO/25-26/"
                                            className="flex-1 rounded-lg border border-stroke bg-gray-50 px-4 py-2.5 outline-none dark:border-dark-3 dark:bg-dark-2"
                                            readOnly
                                        />
                                        <input
                                            type="text"
                                            value="1159"
                                            className="w-24 rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3"
                                            readOnly
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                                        Sales Order Date <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="date"
                                        value={formData.sales_order_date}
                                        onChange={(e) => handleFormChange('sales_order_date', e.target.value)}
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
                                        options={customers.map(customer => ({
                                            value: customer.id,
                                            label: `${customer.name} ${customer.gstin ? `(${customer.gstin})` : ''}`
                                        }))}
                                        required={true}
                                        placeholder="Select Customer"
                                    />
                                    {/* <p className="mt-1 text-sm text-red-600">Previous Due: ₹2,500</p> */}
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
                                        Expire Date
                                    </label>
                                    <input
                                        type="date"
                                        value={formData.expire_date}
                                        onChange={(e) => handleFormChange('expire_date', e.target.value)}
                                        className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3"
                                    />
                                </div>
                                <div>
                                    <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                                        Status <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        value={formData.status}
                                        onChange={(e) => handleFormChange('status', e.target.value)}
                                        className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3"
                                        required
                                    >
                                        <option value="pending">Pending</option>
                                        <option value="approved">Approved</option>
                                        <option value="cancelled">Cancelled</option>
                                        <option value="completed">Completed</option>
                                    </select>
                                </div>
                                <div className="md:col-span-2">
                                    <SelectField
                                        label="Salesman"
                                        name="sales_person_id"
                                        value={formData.sales_person_id}
                                        onChange={handleFormChange}
                                        options={salesmen.map(salesman => ({
                                            value: salesman.id,
                                            label: `${salesman.name} ${salesman.employee_code ? `(${salesman.employee_code})` : ''}`
                                        }))}
                                        required={true}
                                        placeholder="Select Salesman"
                                    />
                                </div>
                                <div>
                                    <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                                        Contact Person
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.contact_person}
                                        onChange={(e) => handleFormChange('contact_person', e.target.value)}
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
                                <div className="md:col-span-2">
                                    <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                                        Payment Terms
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.payment_terms}
                                        onChange={(e) => handleFormChange('payment_terms', e.target.value)}
                                        className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* SECTION 2: Sales Items Table */}
                        <div className="rounded-lg bg-white p-6 shadow-1 dark:bg-gray-dark">
                            <div className="mb-4 flex items-center justify-between">
                                <h2 className="text-lg font-semibold text-dark dark:text-white">Sales Items</h2>
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

                            {/* Items Table */}
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-stroke dark:border-dark-3">
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

                        {/* SECTION 3: Charges & Adjustments */}
                        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                            {/* Left side - Charges & Adjustments */}
                            <div className="lg:col-span-2">
                                <div className="rounded-lg bg-white p-6 shadow-1 dark:bg-gray-dark">
                                    <h2 className="mb-4 text-lg font-semibold text-dark dark:text-white">Charges & Adjustments</h2>
                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                        <div className="flex items-center gap-4">
                                            <div className="text-dark-6">
                                                Quantity: {items.reduce((sum, item) => sum + item.quantity, 0)}
                                            </div>
                                            <div className="text-dark-6">
                                                Items: {items.length}
                                            </div>
                                        </div>
                                        <div>
                                            <label className="mb-2 block text-sm font-medium text-dark dark:text-white">Other Charges</label>
                                            <div className="flex gap-2">
                                                <input
                                                    type="number"
                                                    value={formData.other_charges}
                                                    onChange={(e) => setFormData({ ...formData, other_charges: parseFloat(e.target.value) })}
                                                    className="flex-1 rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3"
                                                    min="0"
                                                />
                                                <select
                                                    value={formData.charges_type}
                                                    onChange={(e) => setFormData({ ...formData, charges_type: e.target.value })}
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
                                                    value={formData.discount_on_all}
                                                    onChange={(e) => setFormData({ ...formData, discount_on_all: parseFloat(e.target.value) })}
                                                    className="flex-1 rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3"
                                                    min="0"
                                                />
                                                <select
                                                    value={formData.discount_type}
                                                    onChange={(e) => setFormData({ ...formData, discount_type: e.target.value })}
                                                    className="w-24 rounded-lg border border-stroke bg-transparent px-2 py-2.5 outline-none focus:border-primary dark:border-dark-3"
                                                >
                                                    <option value="percentage">%</option>
                                                    <option value="fixed">Fixed</option>
                                                </select>
                                            </div>
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
                                        <div className="md:col-span-2">
                                            <div className="flex items-center">
                                                <input
                                                    type="checkbox"
                                                    id="send_message"
                                                    checked={formData.send_message}
                                                    onChange={(e) => setFormData({ ...formData, send_message: e.target.checked })}
                                                    className="h-4 w-4 rounded border-stroke text-primary focus:ring-primary dark:border-dark-3"
                                                />
                                                <label htmlFor="send_message" className="ml-2 text-sm text-dark dark:text-white">
                                                    Send Message to Customer
                                                </label>
                                            </div>
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
                                            <span className="text-dark-6">Other Charges</span>
                                            <span className="font-medium text-dark dark:text-white">₹{totals.chargesAmount.toLocaleString('en-IN')}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-dark-6">Discount on All</span>
                                            <span className="font-medium text-red-600">-₹{totals.discountAllAmount.toLocaleString('en-IN')}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <div className="flex items-center gap-1">
                                                <span className="text-dark-6">Round Off</span>
                                                <button type="button" className="text-dark-6 hover:text-dark dark:text-gray-400">
                                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                </button>
                                            </div>
                                            <span className={`font-medium ${totals.roundOff >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                ₹{Math.abs(totals.roundOff).toLocaleString('en-IN')}
                                            </span>
                                        </div>
                                        <div className="border-t border-stroke pt-3 dark:border-dark-3">
                                            <div className="flex justify-between">
                                                <span className="text-lg font-semibold text-dark dark:text-white">Grand Total</span>
                                                <span className="text-lg font-bold text-primary">₹{totals.grandTotal.toLocaleString('en-IN')}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* SECTION 4: Sales Order Terms and Conditions */}
                        <div className="rounded-lg bg-white shadow-1 dark:bg-gray-dark">
                            <div className="flex items-center justify-between border-b border-stroke px-6 py-4 dark:border-dark-3">
                                <h2 className="text-lg font-semibold text-dark dark:text-white">Sales Order Terms and Conditions</h2>
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

                      

                        {/* Action Buttons */}
                        <div className="rounded-lg p-6 dark:bg-gray-dark">
                            <div className="flex flex-wrap justify-center gap-4">
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="min-w-[180px] rounded-lg bg-green-600 px-6 py-3 font-medium text-white transition hover:bg-green-700 disabled:opacity-50"
                                >
                                    {isSubmitting ? "Saving..." : "Save Sales Order"}
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