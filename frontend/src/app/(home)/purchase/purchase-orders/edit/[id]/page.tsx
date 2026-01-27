"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import { vendorsApi, productsApi, ordersApi } from "@/services/api";
import Select from 'react-select';
import { useRef } from "react";

// Reusable SelectField Component
function SelectField({
    label,
    name,
    value,
    onChange,
    options,
    required = false,
    placeholder = "Select option",
    onAddNew = undefined,
}: {
    label: string;
    name: string;
    value: string | number;
    onChange: (name: string, value: any) => void;
    options: { value: string; label: string }[];
    required?: boolean;
    placeholder?: string;
    onAddNew?: () => void;
}) {
    return (
        <div>
            <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                {label} {required && <span className="text-red-500">*</span>}
            </label>
            <Select
                name={name}
                value={options.find(o => o.value === value) || null}
                onChange={(selected) => {
                    if (selected?.value === "add_new" && onAddNew) {
                        onAddNew();
                    } else {
                        onChange(name, selected?.value || "");
                    }
                }}
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
                        ...(state.data.value === "add_new" && {
                            backgroundColor: "#10b981",
                            color: "white",
                            "&:hover": {
                                backgroundColor: "#059669",
                            },
                        }),
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

// Product Select Field Component
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

export default function EditPurchaseOrderPage() {
    const router = useRouter();
    const params = useParams();
    const { company, user } = useAuth();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [showOtherFields, setShowOtherFields] = useState(false);
    const [showAddCurrencyModal, setShowAddCurrencyModal] = useState(false);
    const [newCurrency, setNewCurrency] = useState({ code: "", name: "", rate: 1 });
    const [productSearch, setProductSearch] = useState("");
    const [searchResults, setSearchResults] = useState<any[]>([]);

    // State for dropdown data
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]);
    const [currencies, setCurrencies] = useState([
        { value: "INR", label: "INR - Indian Rupee", rate: 1 },
        { value: "USD", label: "USD - US Dollar", rate: 83.5 },
        { value: "EUR", label: "EUR - Euro", rate: 89.2 },
        { value: "GBP", label: "GBP - British Pound", rate: 104.8 },
        { value: "AED", label: "AED - UAE Dirham", rate: 22.7 },
    ]);
    const [loading, setLoading] = useState({
        suppliers: false,
        products: false,
    });

    // Form state
    const [formData, setFormData] = useState({
        supplier_id: "",
        purchase_order_date: new Date().toISOString().split('T')[0],
        reference_no: "",
        reference_date: "",
        currency: "INR",
        exchange_rate: 1,
        delivery_date: "",
        notes: "",
        terms: `1. Goods must be delivered in perfect condition.
2. All items must be properly packed.
3. Payment terms: 30 days from invoice date.
4. Any damaged goods will be returned at supplier's expense.`,

        // Charges and discounts
        freight_charges: 0,
        freight_type: "fixed",
        other_charges: 0,
        other_charges_type: "fixed",
        discount_on_all: 0,
        discount_type: "percentage",
        round_off: 0,

        // Calculated totals
        subtotal: 0,
        total_tax: 0,
        total_amount: 0,
    });

    // Purchase order items state
    const [items, setItems] = useState([
        {
            id: 1,
            product_id: "",
            description: "",
            item_code: "",
            quantity: 1,
            unit: "unit",
            purchase_price: 0,
            discount_percent: 0,
            discount_amount: 0,
            gst_rate: 18,
            cgst_rate: 9,
            sgst_rate: 9,
            igst_rate: 0,
            tax_amount: 0,
            unit_cost: 0,
            total_amount: 0,
        },
    ]);

    // Load data on component mount
    useEffect(() => {
        if (company?.id && params.id) {
            loadPurchaseOrderData();
            loadSuppliers();
            loadProducts();
        }
    }, [company?.id, params.id]);

    const loadPurchaseOrderData = async () => {
        try {
            setIsLoading(true);
            const response = await ordersApi.getPurchaseOrder(company!.id, params.id as string);
            
            // Populate form data
            setFormData({
                supplier_id: response.vendor_id || "",
                purchase_order_date: response.order_date ? new Date(response.order_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                reference_no: response.reference_number || "",
                reference_date: "",
                currency: response.currency || "INR",
                exchange_rate: parseFloat(response.exchange_rate || "1"),
                delivery_date: response.expected_date ? new Date(response.expected_date).toISOString().split('T')[0] : "",
                notes: response.notes || "",
                terms: response.terms || `1. Goods must be delivered in perfect condition.
2. All items must be properly packed.
3. Payment terms: 30 days from invoice date.
4. Any damaged goods will be returned at supplier's expense.`,
                freight_charges: parseFloat(response.freight_charges || "0"),
                freight_type: "fixed",
                other_charges: parseFloat(response.other_charges || "0"),
                other_charges_type: "fixed",
                discount_on_all: parseFloat(response.discount_on_all || "0"),
                discount_type: "percentage",
                round_off: parseFloat(response.round_off || "0"),
                subtotal: parseFloat(response.subtotal || "0"),
                total_tax: parseFloat(response.tax_amount || "0"),
                total_amount: parseFloat(response.total_amount || "0"),
            });

            // Populate items
            if (response.items && response.items.length > 0) {
                const formattedItems = response.items.map((item: any, index: number) => ({
                    id: index + 1,
                    product_id: item.product_id || "",
                    description: item.description || "",
                    item_code: item.item_code || "",
                    quantity: parseFloat(item.quantity || "1"),
                    unit: item.unit || "unit",
                    purchase_price: parseFloat(item.rate || item.unit_price || "0"),
                    discount_percent: parseFloat(item.discount_percent || "0"),
                    discount_amount: parseFloat(item.discount_amount || "0"),
                    gst_rate: parseFloat(item.gst_rate || "18"),
                    cgst_rate: parseFloat(item.cgst_rate || "9"),
                    sgst_rate: parseFloat(item.sgst_rate || "9"),
                    igst_rate: parseFloat(item.igst_rate || "0"),
                    tax_amount: parseFloat(item.tax_amount || "0"),
                    unit_cost: parseFloat(item.rate || item.unit_price || "0"),
                    total_amount: parseFloat(item.total_amount || "0"),
                }));
                setItems(formattedItems);
            }
        } catch (error) {
            console.error("Failed to load purchase order:", error);
            alert("Failed to load purchase order data");
            router.push("/purchase/purchase-orders");
        } finally {
            setIsLoading(false);
        }
    };

    const loadSuppliers = async () => {
        try {
            setLoading(prev => ({ ...prev, suppliers: true }));
            const response = await vendorsApi.list(company!.id, {
                page_size: 100,
                search: "",
            });
            
            // Check different possible structures
            if (Array.isArray(response)) {
                setSuppliers(response);
            } else if (response && Array.isArray(response.data)) {
                setSuppliers(response.data);
            } else if (response && response.data && Array.isArray(response.data.vendors)) {
                setSuppliers(response.data.vendors);
            } else if (response && response.vendors) {
                setSuppliers(response.vendors);
            } else if (response && response.customers) {
                setSuppliers(response.customers);
            } else {
                setSuppliers([]);
            }
            
        } catch (error) {
            console.error("Failed to load suppliers:", error);
        } finally {
            setLoading(prev => ({ ...prev, suppliers: false }));
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

    // Handle adding new currency
    const handleAddCurrency = () => {
        setShowAddCurrencyModal(true);
    };

    const handleSaveCurrency = () => {
        if (!newCurrency.code || !newCurrency.name || !newCurrency.rate) {
            alert("Please fill all currency fields");
            return;
        }

        const newCurrencyOption = {
            value: newCurrency.code,
            label: `${newCurrency.code} - ${newCurrency.name}`,
            rate: parseFloat(newCurrency.rate.toString()),
        };

        setCurrencies([...currencies, newCurrencyOption]);
        setFormData(prev => ({
            ...prev,
            currency: newCurrency.code,
            exchange_rate: newCurrency.rate,
        }));
        setNewCurrency({ code: "", name: "", rate: 1 });
        setShowAddCurrencyModal(false);
    };

    // Calculate totals
    const calculateTotals = () => {
        let subtotal = 0;
        let totalTax = 0;
        let totalItemDiscount = 0;

        items.forEach(item => {
            const itemTotal = item.quantity * item.purchase_price;
            const discount = item.discount_percent > 0 ?
                itemTotal * (item.discount_percent / 100) : 0;
            const taxable = itemTotal - discount;
            const tax = taxable * (item.gst_rate / 100);

            subtotal += taxable;
            totalTax += tax;
            totalItemDiscount += discount;
        });

        // Calculate additional charges and discounts
        const freightCharges = formData.freight_charges || 0;
        const otherCharges = formData.other_charges || 0;
        const discountOnAll = formData.discount_on_all || 0;

        const discountAllAmount = formData.discount_type === 'percentage'
            ? subtotal * (discountOnAll / 100)
            : discountOnAll;

        const totalBeforeTax = subtotal;
        const totalAfterTax = totalBeforeTax + totalTax;
        const totalAfterCharges = totalAfterTax + freightCharges + otherCharges;
        const totalAfterDiscountAll = totalAfterCharges - discountAllAmount;
        const grandTotal = totalAfterDiscountAll + (formData.round_off || 0);

        return {
            subtotal: Number(totalBeforeTax.toFixed(2)),
            totalTax: Number(totalTax.toFixed(2)),
            itemDiscount: Number(totalItemDiscount.toFixed(2)),
            freight: Number(freightCharges.toFixed(2)),
            otherCharges: Number(otherCharges.toFixed(2)),
            discountAll: Number(discountAllAmount.toFixed(2)),
            roundOff: Number(formData.round_off || 0),
            grandTotal: Number(grandTotal.toFixed(2)),
            totalAfterCharges: Number(totalAfterCharges.toFixed(2)),
            totalAfterDiscountAll: Number(totalAfterDiscountAll.toFixed(2)),
        };
    };

    const totals = calculateTotals();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!company?.id || !params.id) return;

        setIsSubmitting(true);
        try {
            console.log("=== UPDATING PURCHASE ORDER ===");
            console.log("Items:", items);
            console.log("Totals:", totals);
            console.log("Form Data:", formData);

            // Prepare items with all fields
            const preparedItems = items.map(item => {
                return {
                    product_id: item.product_id ? String(item.product_id) : null,
                    description: item.description || "",
                    quantity: Number(item.quantity) || 1,
                    unit: item.unit || "unit",
                    rate: Number(item.purchase_price) || 0,
                    item_code: item.item_code || "",
                    discount_percent: Number(item.discount_percent || 0),
                    discount_amount: Number(item.discount_amount || 0),
                    gst_rate: Number(item.gst_rate || 0),
                    tax_amount: Number(item.tax_amount || 0),
                    total_amount: Number(item.total_amount || 0),
                };
            });

            // Prepare purchase order data for update
            const purchaseOrderData = {
                vendor_id: formData.supplier_id,
                order_date: formData.purchase_order_date,
                expected_date: formData.delivery_date || null,
                reference_number: formData.reference_no || null,
                notes: formData.notes || "",
                terms: formData.terms || "",
                subtotal: totals.subtotal,
                tax_amount: totals.totalTax,
                total_amount: totals.grandTotal,
                freight_charges: formData.freight_charges || 0,
                other_charges: formData.other_charges || 0,
                discount_on_all: formData.discount_on_all || 0,
                round_off: formData.round_off || 0,
                currency: formData.currency,
                exchange_rate: formData.exchange_rate,
                items: preparedItems,
            };

            console.log("=== PURCHASE ORDER UPDATE DATA ===");
            console.log(JSON.stringify(purchaseOrderData, null, 2));

            // Call the API to update
            const response = await ordersApi.updatePurchaseOrder(
                company.id, 
                params.id as string, 
                purchaseOrderData
            );
            
            console.log('=== UPDATE RESPONSE ===');
            console.log('Purchase order updated successfully:', response);
            
            alert("Purchase order updated successfully!");
            router.push(`/purchase/purchase-orders/${params.id}`);

        } catch (error: any) {
            console.error("Error updating purchase order:", error);
            alert(error.message || "Failed to update purchase order. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    // Update item calculation
    const updateItem = (id: number, field: string, value: any) => {
        setItems(prevItems => {
            return prevItems.map(item => {
                if (item.id === id) {
                    const updated = { ...item, [field]: value };

                    // Auto-fill product details when product is selected
                    if (field === 'product_id' && value) {
                        const selectedProduct = products.find(p => p.id === value);
                        if (selectedProduct) {
                            updated.description = selectedProduct.name;
                            updated.purchase_price = selectedProduct.cost_price || selectedProduct.purchase_price || 0;
                            updated.gst_rate = parseFloat(selectedProduct.gst_rate) || 18;
                        }
                    }

                    // Recalculate item totals
                    const itemTotal = updated.quantity * updated.purchase_price;
                    const discount = updated.discount_percent > 0 ?
                        itemTotal * (updated.discount_percent / 100) : 0;
                    const taxable = itemTotal - discount;
                    const tax = taxable * (updated.gst_rate / 100);

                    updated.discount_amount = discount;
                    updated.tax_amount = tax;
                    updated.unit_cost = updated.purchase_price;
                    updated.total_amount = taxable + tax;

                    return updated;
                }
                return item;
            });
        });
    };

    // Update form data handler
    const handleFormChange = (field: string, value: any) => {
        if (field === 'currency') {
            const selectedCurrency = currencies.find(c => c.value === value);
            setFormData(prev => ({
                ...prev,
                currency: value,
                exchange_rate: selectedCurrency?.rate || 1,
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                [field]: value,
            }));
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
            purchase_price: product.cost_price || product.purchase_price || 0,
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
                purchase_price: 0,
                discount_percent: 0,
                gst_rate: 0,
                tax_amount: 0,
                unit_cost: 0,
                total_amount: 0,
                ...prefill,
            },
        ]);
    };

    const removeItem = (id: number) => {
        setItems(items.filter(item => item.id !== id));
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-dark p-4 md:p-6">
                <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
                        <p className="mt-4 text-dark-6">Loading purchase order data...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-4 dark:bg-gray-dark md:p-6">
            {/* Add Currency Modal */}
            {showAddCurrencyModal && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-50">
                    <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg dark:bg-gray-dark">
                        <h3 className="mb-4 text-lg font-semibold text-dark dark:text-white">Add New Currency</h3>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                                    Currency Code <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={newCurrency.code}
                                    onChange={(e) => setNewCurrency(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                                    className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3"
                                    placeholder="e.g., USD, EUR, GBP"
                                    maxLength={3}
                                />
                            </div>
                            
                            <div>
                                <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                                    Currency Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={newCurrency.name}
                                    onChange={(e) => setNewCurrency(prev => ({ ...prev, name: e.target.value }))}
                                    className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3"
                                    placeholder="e.g., US Dollar, Euro"
                                />
                            </div>
                            
                            <div>
                                <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                                    Exchange Rate <span className="text-red-500">*</span>
                                </label>
                                <div className="flex items-center">
                                    <span className="mr-2 text-dark-6">1 {newCurrency.code || "XXX"} =</span>
                                    <input
                                        type="number"
                                        value={newCurrency.rate}
                                        onChange={(e) => setNewCurrency(prev => ({ ...prev, rate: parseFloat(e.target.value) || 1 }))}
                                        className="flex-1 rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3"
                                        placeholder="e.g., 83.5"
                                        min="0.01"
                                        step="0.01"
                                    />
                                    <span className="ml-2 text-dark-6">INR</span>
                                </div>
                            </div>
                        </div>
                        
                        <div className="mt-6 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setShowAddCurrencyModal(false)}
                                className="rounded-lg border border-stroke px-4 py-2 text-dark hover:bg-gray-50 dark:border-dark-3 dark:text-white dark:hover:bg-dark-3"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleSaveCurrency}
                                className="rounded-lg bg-primary px-4 py-2 text-white hover:bg-opacity-90"
                            >
                                Add Currency
                            </button>
                        </div>
                    </div>
                </div>
            )}

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
                            <Link href="/purchase/purchase-orders" className="ml-1 text-dark-6 hover:text-primary dark:text-gray-400 dark:hover:text-white md:ml-2">
                                Purchase Orders
                            </Link>
                        </div>
                    </li>
                    <li>
                        <div className="flex items-center">
                            <svg className="h-4 w-4 text-dark-6 dark:text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                            </svg>
                            <span className="ml-1 font-medium text-dark dark:text-white md:ml-2">Edit Purchase Order</span>
                        </div>
                    </li>
                </ol>
            </nav>

            {/* Page Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-dark dark:text-white">Edit Purchase Order</h1>
                <p className="text-dark-6">Update purchase order details and items</p>
            </div>

            <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                    {/* Main Form - 3 column layout */}
                    <div className="lg:col-span-3 space-y-6">
                        {/* SECTION 1: Purchase Order Basic Details */}
                        <div className="rounded-lg bg-white p-6 shadow-1 dark:bg-gray-dark">
                            <h2 className="mb-4 text-lg font-semibold text-dark dark:text-white">Purchase Order Basic Details</h2>
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
                                    <SelectField
                                        label="Currency"
                                        name="currency"
                                        value={formData.currency}
                                        onChange={handleFormChange}
                                        options={[
                                            ...currencies.map(c => ({
                                                value: c.value,
                                                label: c.label,
                                            })),
                                            { value: "add_new", label: "+ Add New Currency" }
                                        ]}
                                        onAddNew={handleAddCurrency}
                                        required={true}
                                        placeholder="Select Currency"
                                    />
                                </div>
                                {formData.currency !== "INR" && (
                                    <div>
                                        <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                                            Exchange Rate <span className="text-red-500">*</span>
                                        </label>
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1 flex items-center">
                                                <span className="mr-2 text-dark-6">1 {formData.currency} =</span>
                                                <input
                                                    type="number"
                                                    value={formData.exchange_rate}
                                                    onChange={(e) => setFormData(prev => ({
                                                        ...prev,
                                                        exchange_rate: parseFloat(e.target.value) || 1
                                                    }))}
                                                    className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3"
                                                    min="0.01"
                                                    step="0.01"
                                                    required={formData.currency !== "INR"}
                                                />
                                            </div>
                                            <span className="text-dark-6">INR</span>
                                        </div>
                                    </div>
                                )}
                                <div>
                                    <SelectField
                                        label="Supplier"
                                        name="supplier_id"
                                        value={formData.supplier_id}
                                        onChange={handleFormChange}
                                        options={suppliers.map(supplier => ({
                                            value: supplier.id,
                                            label: `${supplier.name}${supplier.email ? ` (${supplier.email})` : ''}${supplier.contact ? ` ${supplier.contact}` : ''}`
                                        }))}
                                        required={true}
                                        placeholder="Select Supplier"
                                    />
                                </div>
                                <div>
                                    <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                                        Purchase Order Date <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="date"
                                        value={formData.purchase_order_date}
                                        onChange={(e) => handleFormChange('purchase_order_date', e.target.value)}
                                        className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3"
                                        required
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
                                        Delivery Date
                                    </label>
                                    <input
                                        type="date"
                                        value={formData.delivery_date}
                                        onChange={(e) => handleFormChange('delivery_date', e.target.value)}
                                        className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* SECTION 2: Purchase Order Items Table */}
                        <div className="rounded-lg bg-white p-6 shadow-1 dark:bg-gray-dark">
                            <div className="mb-4 flex items-center justify-between">
                                <h2 className="text-lg font-semibold text-dark dark:text-white">Purchase Order Items</h2>
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
                                            <th className="px-4 py-3 text-left text-sm font-medium text-dark-6">Item Code</th>
                                            <th className="px-4 py-3 text-left text-sm font-medium text-dark-6">Description</th>
                                            <th className="px-4 py-3 text-left text-sm font-medium text-dark-6">Quantity</th>
                                            <th className="px-4 py-3 text-left text-sm font-medium text-dark-6">Purchase Price</th>
                                            <th className="px-4 py-3 text-left text-sm font-medium text-dark-6">Discount</th>
                                            <th className="px-4 py-3 text-left text-sm font-medium text-dark-6">Tax Amount</th>
                                            <th className="px-4 py-3 text-left text-sm font-medium text-dark-6">Unit Cost</th>
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
                                                                    const purchasePrice = product.cost_price || product.purchase_price || 0;
                                                                    const gstRate = Number(product.gst_rate) || i.gst_rate || 18;
                                                                    const qty = i.quantity || 1;
                                                                    const taxable = qty * purchasePrice;
                                                                    const tax = taxable * (gstRate / 100);
                                                                    return {
                                                                        ...i,
                                                                        product_id: product.id,
                                                                        item_code: i.item_code || "",
                                                                        description: product.name,
                                                                        purchase_price: purchasePrice,
                                                                        gst_rate: gstRate,
                                                                        discount_amount: 0,
                                                                        tax_amount: tax,
                                                                        unit_cost: purchasePrice,
                                                                        total_amount: taxable + tax,
                                                                    };
                                                                })
                                                            );
                                                        }}
                                                    />
                                                </td>
                                                <td className="px-4 py-3">
                                                    <input
                                                        type="text"
                                                        value={item.item_code}
                                                        onChange={(e) => updateItem(item.id, 'item_code', e.target.value)}
                                                        className="w-full min-w-[120px] rounded border border-stroke bg-transparent px-3 py-1.5 outline-none focus:border-primary dark:border-dark-3"
                                                        placeholder="Enter item code"
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
                                                        value={item.purchase_price}
                                                        onChange={(e) => updateItem(item.id, 'purchase_price', parseFloat(e.target.value))}
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
                                                        ₹{(item.tax_amount || 0).toFixed(2)}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className="font-medium">
                                                        ₹{(item.unit_cost || item.purchase_price).toFixed(2)}
                                                    </span>
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

                        {/* SECTION 3: Charges & Summary */}
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
                                                    value={formData.freight_charges}
                                                    onChange={(e) => setFormData({ ...formData, freight_charges: parseFloat(e.target.value) })}
                                                    className="flex-1 rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3"
                                                    min="0"
                                                />
                                                <select
                                                    value={formData.freight_type}
                                                    onChange={(e) => setFormData({ ...formData, freight_type: e.target.value })}
                                                    className="w-24 rounded-lg border border-stroke bg-transparent px-2 py-2.5 outline-none focus:border-primary dark:border-dark-3"
                                                >
                                                    <option value="fixed">Fixed</option>
                                                    <option value="percentage">%</option>
                                                </select>
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
                                                    value={formData.other_charges_type}
                                                    onChange={(e) => setFormData({ ...formData, other_charges_type: e.target.value })}
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
                                        <div className="flex items-end">
                                            <div className="w-full">
                                                <label className="mb-2 block text-sm font-medium text-dark dark:text-white">Round Off</label>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const currentValue = Math.abs(formData.round_off || 0);
                                                            setFormData(prev => ({
                                                                ...prev,
                                                                round_off: -currentValue
                                                            }));
                                                        }}
                                                        className="p-2 rounded-lg bg-red-50 hover:bg-red-100 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400"
                                                        title="Make amount negative"
                                                    >
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                                                        </svg>
                                                    </button>
                                                    <div className="relative">
                                                        <input
                                                            type="number"
                                                            value={Math.abs(formData.round_off || 0)}
                                                            onChange={(e) => {
                                                                const inputValue = parseFloat(e.target.value) || 0;
                                                                const currentSign = formData.round_off >= 0 ? 1 : -1;
                                                                setFormData(prev => ({
                                                                    ...prev,
                                                                    round_off: currentSign * inputValue
                                                                }));
                                                            }}
                                                            className="w-32 px-10 py-2 text-center border border-stroke dark:border-dark-3 rounded-lg bg-transparent outline-none focus:border-primary"
                                                            step="0.01"
                                                            min="0"
                                                        />
                                                        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 pointer-events-none">
                                                            {formData.round_off >= 0 ? '+' : '-'}
                                                        </div>
                                                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none">
                                                            ₹
                                                        </div>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const currentValue = Math.abs(formData.round_off || 0);
                                                            setFormData(prev => ({
                                                                ...prev,
                                                                round_off: currentValue
                                                            }));
                                                        }}
                                                        className="p-2 rounded-lg bg-green-50 hover:bg-green-100 dark:bg-green-900/30 dark:hover:bg-green-900/50 text-green-600 dark:text-green-400"
                                                        title="Make amount positive"
                                                    >
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="mb-2 block text-sm font-medium text-dark dark:text-white">Notes</label>
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
                                <div className="rounded-lg bg-white p-6 shadow-1 dark:bg-gray-dark">
                                    <h2 className="mb-4 text-lg font-semibold text-dark dark:text-white">Total Summary</h2>
                                    <div className="space-y-3">
                                        <div className="flex justify-between">
                                            <span className="text-dark-6">Subtotal</span>
                                            <span className="font-medium text-dark dark:text-white">₹{totals?.subtotal?.toLocaleString('en-IN') || '0.00'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-dark-6">Freight Charges</span>
                                            <span className="font-medium text-dark dark:text-white">₹{totals.freight.toLocaleString('en-IN')}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-dark-6">Other Charges</span>
                                            <span className="font-medium text-dark dark:text-white">₹{totals.otherCharges.toLocaleString('en-IN')}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-dark-6">Discount on All</span>
                                            <span className="font-medium text-red-600">-₹{totals.discountAll.toLocaleString('en-IN')}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-dark-6">Round Off</span>
                                            <span className={`font-medium ${totals.roundOff >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                {totals.roundOff >= 0 ? '+₹' : '-₹'}{Math.abs(totals.roundOff).toLocaleString('en-IN')}
                                            </span>
                                        </div>
                                        <div className="border-t border-stroke pt-3 dark:border-dark-3">
                                            <div className="flex justify-between">
                                                <span className="text-lg font-semibold text-dark dark:text-white">Grand Total</span>
                                                <span className="text-lg font-bold text-primary">₹{totals.grandTotal.toLocaleString('en-IN')}</span>
                                            </div>
                                            {formData.currency !== "INR" && (
                                                <div className="mt-2 flex justify-between text-sm text-dark-6">
                                                    <span>Amount in {formData.currency}</span>
                                                    <span>{(totals.grandTotal / formData.exchange_rate).toFixed(2)} {formData.currency}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* SECTION 4: Other Fields (Accordion) */}
                        <div className="rounded-lg bg-white shadow-1 dark:bg-gray-dark">
                            <div className="flex items-center justify-between border-b border-stroke px-6 py-4 dark:border-dark-3">
                                <h2 className="text-lg font-semibold text-dark dark:text-white">
                                   Terms & Conditions
                                </h2>
                                <button
                                    type="button"
                                    onClick={() => setShowOtherFields(!showOtherFields)}
                                    className="rounded p-1 hover:bg-gray-100 dark:hover:bg-dark-3"
                                >
                                    <svg
                                        className={`h-5 w-5 transition-transform ${showOtherFields ? "rotate-180" : ""
                                            }`}
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
                                        <div className="md:col-span-2">
                                            <textarea
                                                value={formData.terms}
                                                onChange={(e) => setFormData({ ...formData, terms: e.target.value })}
                                                rows={6}
                                                className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 outline-none focus:border-primary dark:border-dark-3"
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
                                    {isSubmitting ? "Updating..." : "Update Purchase Order"}
                                </button>

                                <button
                                    type="button"
                                    onClick={() => router.push(`/purchase/purchase-orders/${params.id}`)}
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