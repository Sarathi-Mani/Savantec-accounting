"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import api, { vendorsApi, productsApi, purchasesApi } from "@/services/api";
import Select from 'react-select';
import { useRef } from "react";

// Reusable SelectField Component (unchanged)
function SelectField({
    label,
    name,
    value,
    onChange,
    options,
    required = false,
    placeholder = "Select option",
    formatOptionLabel,
}: {
    label: string;
    name: string;
    value: string | number;
    onChange: (name: string, value: any) => void;
    options: { value: string; label: string }[];
    required?: boolean;
    placeholder?: string;
    formatOptionLabel?: (option: any) => React.ReactNode;
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
                formatOptionLabel={formatOptionLabel}
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

// Updated Product Select Field Component with better auto-fill
function ProductSelectField({
    value,
    onChange,
    products,
    placeholder = "Search product",
    onProductSelect,
}: {
    value: number | string;
    onChange: (product: any | null) => void;
    products: any[];
    placeholder?: string;
    onProductSelect?: (product: any) => void;
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
            onChange={(selected: any) => {
                onChange(selected ? selected.product : null);
                if (selected?.product && onProductSelect) {
                    onProductSelect(selected.product);
                }
            }}
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
                        if (menuOptions[0].product && onProductSelect) {
                            onProductSelect(menuOptions[0].product);
                        }
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

// Currency Select Component with Add New Option (unchanged)
function CurrencySelect({
    value,
    onChange,
    currencies,
    onAddNewCurrency,
    itemPrice,
}: {
    value: string;
    onChange: (currency: string) => void;
    currencies: { code: string; name: string; symbol: string; exchangeRate: number }[];
    onAddNewCurrency: () => void;
    itemPrice?: number;
}) {
    const [isOpen, setIsOpen] = useState(false);
    const selectRef = useRef<HTMLDivElement>(null);

    // FIXED: Remove the duplicate variable declaration
    const selectedCurrency = currencies.find(c => c.code === value) || currencies[0];
    
    // Calculate INR value if item has price and currency is not INR
    const inrValue = itemPrice && selectedCurrency.code !== "INR" 
        ? itemPrice * selectedCurrency.exchangeRate 
        : itemPrice;
    
    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // FIXED: Removed the duplicate selectedCurrency declaration here
    
    return (
        <div className="relative" ref={selectRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="flex h-full w-20 items-center justify-between rounded border border-stroke bg-white px-2 py-1.5 text-sm hover:bg-gray-50 dark:border-dark-3 dark:bg-gray-dark dark:hover:bg-dark-3"
            >
                <span className="font-medium">{selectedCurrency?.code || "INR"}</span>
                <svg className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 z-50 mt-1 w-48 rounded-lg border border-stroke bg-white shadow-lg dark:border-dark-3 dark:bg-gray-dark">
                    <div className="max-h-60 overflow-y-auto">
                        {currencies.map((currency) => (
                            <button
                                key={currency.code}
                                type="button"
                                onClick={() => {
                                    onChange(currency.code);
                                    setIsOpen(false);
                                }}
                                className={`flex w-full items-center justify-between px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-dark-3 ${value === currency.code ? 'bg-primary/10 text-primary' : ''}`}
                            >
                                <div>
                                    <div className="font-medium">{currency.code}</div>
                                    <div className="text-xs text-dark-6">
                                        {currency.name} 
                                        {currency.code !== "INR" && (
                                            <div>1 {currency.code} = ₹{currency.exchangeRate}</div>
                                        )}
                                    </div>
                                </div>
                                <span className="font-medium">{currency.symbol}</span>
                            </button>
                        ))}
                        
                        {/* Add New Currency Option */}
                        <button
                            type="button"
                            onClick={() => {
                                onAddNewCurrency();
                                setIsOpen(false);
                            }}
                            className="flex w-full items-center gap-2 border-t border-stroke px-3 py-2 text-left text-primary hover:bg-gray-100 dark:border-dark-3 dark:hover:bg-dark-3"
                        >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            <span>Add New Currency</span>
                        </button>
                    </div>
                </div>
            )}
            
            {/* Show conversion tooltip when item has price */}
            {itemPrice && selectedCurrency.code !== "INR" && inrValue && (
                <div className="absolute -top-8 left-0 bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                    ₹{inrValue.toFixed(2)} INR
                </div>
            )}
        </div>
    );
}

export default function AddPurchasePage() {
    const router = useRouter();
    const params = useParams();
    const purchaseId = String(params?.id || "");
    const { company, user } = useAuth();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isPageLoading, setIsPageLoading] = useState(true);
    const [showOtherFields, setShowOtherFields] = useState(false);
    const [showPreviousPayments, setShowPreviousPayments] = useState(false);
    const [nextPurchaseNumber, setNextPurchaseNumber] = useState("");
    const [loadingPurchaseNumber, setLoadingPurchaseNumber] = useState(false);
    const [productSearch, setProductSearch] = useState("");
    const [searchResults, setSearchResults] = useState<any[]>([]);
    
    // State for purchase type
    const [purchaseType, setPurchaseType] = useState("purchase");
    
    // State for import items with currency
    const [importItems, setImportItems] = useState([
        {
            id: 1,
            name: "",
            quantity: 1,
            rate: 0,
            currency: "INR", // Default currency
            per: "unit",
            discount_percent: 0,
            amount: 0,
        },
    ]);
    
    // State for expense items
    const [expenseItems, setExpenseItems] = useState([
        {
            id: 1,
            particulars: "",
            rate: 0,
            per: "unit",
            amount: 0,
        },
    ]);
    
    // State for currencies
 const [currencies, setCurrencies] = useState([
    { code: "INR", name: "Indian Rupee", symbol: "₹", exchangeRate: 1 },
    { code: "USD", name: "US Dollar", symbol: "$", exchangeRate: 83.5 },
    { code: "EUR", name: "Euro", symbol: "€", exchangeRate: 90.2 },
    { code: "GBP", name: "British Pound", symbol: "£", exchangeRate: 106.3 },
    { code: "JPY", name: "Japanese Yen", symbol: "¥", exchangeRate: 0.56 },
    { code: "CAD", name: "Canadian Dollar", symbol: "CA$", exchangeRate: 61.8 },
    { code: "AUD", name: "Australian Dollar", symbol: "A$", exchangeRate: 54.9 },
    { code: "CNY", name: "Chinese Yuan", symbol: "¥", exchangeRate: 11.6 },
    { code: "SGD", name: "Singapore Dollar", symbol: "S$", exchangeRate: 62.1 },
    { code: "AED", name: "UAE Dirham", symbol: "د.إ", exchangeRate: 22.7 },
]);
    
    const [showAddCurrencyModal, setShowAddCurrencyModal] = useState(false);
    const [newCurrency, setNewCurrency] = useState({
        code: "",
        name: "",
        symbol: "",
        exchangeRate: 1,
    });
    const [paymentExchangeRateInput, setPaymentExchangeRateInput] = useState("1");

    // Payment state
    const [paymentData, setPaymentData] = useState({
        amount: 0,
        paymentType: "",
        account: "",
        paymentNote: "",
    });

    // State for dropdown data
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState({
        suppliers: false,
        products: false,
    });

    // Previous payments state
    const [previousPayments, setPreviousPayments] = useState<any[]>([]);

    // Form state
    const [formData, setFormData] = useState({
        supplier_id: "",
        purchase_date: new Date().toISOString().split('T')[0],
        due_date: "",
        reference_no: "",
        vendor_invoice_number: "",
        vendor_invoice_date: "",
        payment_type: "",
        exchange_rate: 1,
        notes: "",
        terms: `1. Goods must be delivered in perfect condition.
2. All items must be properly packed.
3. Payment terms: 30 days from invoice date.
4. Any damaged goods will be returned at supplier's expense.`,

        // Charges and discounts
        freight_charges: 0,
        freight_type: "fixed",
        pf_charges: 0,
        pf_type: "fixed",
        discount_on_all: 0,
        discount_type: "percentage",
        round_off: 0,

        // Calculated totals
        subtotal: 0,
        total_tax: 0,
        total_amount: 0,

        // Additional fields
        shipping_address: "",
        billing_address: "",
        contact_person: "",
        contact_phone: "",
        contact_email: "",
    });

    // Purchase items state
    const [items, setItems] = useState([
        {
            id: 1,
            product_id: "",
            description: "",
            item_code: "",
            hsn_code: "",
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
             currency: "INR", 
        },
    ]);

    const resolvedCompanyId =
        company?.id ||
        (typeof window !== "undefined" ? localStorage.getItem("company_id") : null);

    // Load data on component mount
    useEffect(() => {
        if (resolvedCompanyId && purchaseId) {
            loadSuppliers();
            loadProducts();
            loadPurchaseForEdit();
        }
    }, [resolvedCompanyId, purchaseId]);

    const loadPurchaseForEdit = async () => {
        if (!resolvedCompanyId || !purchaseId) return;
        try {
            setLoadingPurchaseNumber(true);
            setIsPageLoading(true);
            const purchase: any = await purchasesApi.get(resolvedCompanyId, purchaseId);

            const paymentType = purchase.payment_type || "INR";
            const exchangeRate = Number(purchase.exchange_rate || 1);
            setPaymentExchangeRateInput(String(exchangeRate));

            setNextPurchaseNumber(purchase.purchase_number || "");
            setPurchaseType(purchase.purchase_type || "purchase");
            setFormData((prev) => ({
                ...prev,
                supplier_id: purchase.vendor_id || "",
                purchase_date: purchase.invoice_date ? String(purchase.invoice_date).split("T")[0] : prev.purchase_date,
                due_date: purchase.due_date ? String(purchase.due_date).split("T")[0] : "",
                reference_no: purchase.reference_no || "",
                vendor_invoice_number: purchase.vendor_invoice_number || "",
                vendor_invoice_date: purchase.vendor_invoice_date ? String(purchase.vendor_invoice_date).split("T")[0] : "",
                payment_type: paymentType,
                exchange_rate: exchangeRate,
                notes: purchase.notes || "",
                terms: purchase.terms || prev.terms,
                freight_charges: Number(purchase.freight_charges || 0),
                freight_type: purchase.freight_type || "fixed",
                pf_charges: Number(purchase.packing_forwarding_charges || purchase.pf_charges || 0),
                pf_type: purchase.pf_type || "fixed",
                discount_on_all: Number(purchase.discount_on_all || 0),
                discount_type: purchase.discount_type || "percentage",
                round_off: Number(purchase.round_off || 0),
                shipping_address: purchase.shipping_address || "",
                billing_address: purchase.billing_address || "",
                contact_person: purchase.contact_person || "",
                contact_phone: purchase.contact_phone || "",
                contact_email: purchase.contact_email || "",
            }));

            if (Array.isArray(purchase.items) && purchase.items.length > 0) {
                setItems(
                    purchase.items.map((item: any, index: number) => ({
                        id: Date.now() + index,
                        product_id: item.product_id || "",
                        description: item.description || "",
                        item_code: item.item_code || "",
                        hsn_code: item.hsn_code || "",
                        quantity: Number(item.quantity || 1),
                        unit: item.unit || "unit",
                        purchase_price: Number(item.purchase_price || item.rate || item.unit_price || 0),
                        discount_percent: Number(item.discount_percent || 0),
                        discount_amount: Number(item.discount_amount || 0),
                        gst_rate: Number(item.gst_rate || 0),
                        cgst_rate: Number(item.cgst_rate || 0),
                        sgst_rate: Number(item.sgst_rate || 0),
                        igst_rate: Number(item.igst_rate || 0),
                        tax_amount: Number(item.tax_amount || item.cgst_amount || 0) + Number(item.sgst_amount || 0) + Number(item.igst_amount || 0),
                        unit_cost: Number(item.unit_cost || item.purchase_price || item.rate || 0),
                        total_amount: Number(item.total_amount || 0),
                        currency: item.currency || "INR",
                    }))
                );
            }

            if (Array.isArray(purchase.import_items) && purchase.import_items.length > 0) {
                setImportItems(
                    purchase.import_items.map((item: any, index: number) => ({
                        id: Date.now() + 1000 + index,
                        name: item.name || "",
                        quantity: Number(item.quantity || 1),
                        rate: Number(item.rate || 0),
                        currency: item.currency || "INR",
                        per: item.per || "unit",
                        discount_percent: Number(item.discount_percent || 0),
                        amount: Number(item.amount || 0),
                    }))
                );
            }

            if (Array.isArray(purchase.expense_items) && purchase.expense_items.length > 0) {
                setExpenseItems(
                    purchase.expense_items.map((item: any, index: number) => ({
                        id: Date.now() + 2000 + index,
                        particulars: item.particulars || "",
                        rate: Number(item.rate || 0),
                        per: item.per || "unit",
                        amount: Number(item.amount || 0),
                    }))
                );
            }
        } catch (error) {
            console.error("Failed to load purchase for edit:", error);
            alert("Failed to load purchase data");
            router.push("/purchase/purchase-list");
        } finally {
            setLoadingPurchaseNumber(false);
            setIsPageLoading(false);
        }
    };

  const loadSuppliers = async () => {
    try {
        setLoading(prev => ({ ...prev, suppliers: true }));
        const response = await vendorsApi.list(company!.id, {
            page_size: 100,
            search: "",
        });
        
        console.log("Full vendors API response:", response);
        console.log("Response type:", typeof response);
        
        // Check different possible structures - use type assertion
        let vendorsArray: any[] = [];
        
        // If response is directly an array
        if (Array.isArray(response)) {
            vendorsArray = response;
        } 
        // If response is an object with various properties
        else if (response && typeof response === 'object') {
            // Type cast to any to avoid TypeScript errors
            const resp = response as any;
            
            // Try different possible property names
            if (Array.isArray(resp.vendors)) {
                vendorsArray = resp.vendors;
            } else if (Array.isArray(resp.data)) {
                vendorsArray = resp.data;
            } else if (Array.isArray(resp.items)) {
                vendorsArray = resp.items;
            } else if (Array.isArray(resp.customers)) {
                vendorsArray = resp.customers;
            } else if (Array.isArray(resp.results)) {
                vendorsArray = resp.results;
            }
        }
        
        console.log("Vendors array:", vendorsArray);
        setSuppliers(vendorsArray);
        
    } catch (error) {
        console.error("Failed to load suppliers:", error);
        setSuppliers([]);
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
        console.log("Products API response:", response);
        
        // Check different possible structures
        let productsArray: any[] = [];
        
        if (Array.isArray(response)) {
            productsArray = response;
        } else if (response && typeof response === 'object') {
            // Type cast to any
            const resp = response as any;
            
            if (Array.isArray(resp.products)) {
                productsArray = resp.products;
            } else if (Array.isArray(resp.data)) {
                productsArray = resp.data;
            } else if (Array.isArray(resp.items)) {
                productsArray = resp.items;
            } else if (Array.isArray(resp.results)) {
                productsArray = resp.results;
            }
        }
        
        console.log("Products array loaded:", productsArray.length);
        setProducts(productsArray);
        
    } catch (error) {
        console.error("Failed to load products:", error);
        setProducts([]);
    } finally {
        setLoading(prev => ({ ...prev, products: false }));
    }
};

    // Add new currency
    const handleAddNewCurrency = () => {
        setShowAddCurrencyModal(true);
    };

    const handleSaveNewCurrency = () => {
        if (newCurrency.code && newCurrency.name && newCurrency.symbol) {
            // Check if currency already exists
            if (currencies.some(c => c.code === newCurrency.code.toUpperCase())) {
                alert(`Currency ${newCurrency.code.toUpperCase()} already exists!`);
                return;
            }

            const currencyToAdd = {
                code: newCurrency.code.toUpperCase(),
                name: newCurrency.name,
                symbol: newCurrency.symbol,
                exchangeRate: parseFloat(newCurrency.exchangeRate.toString()) || 1,
            };

            setCurrencies(prev => [...prev, currencyToAdd]);
            setFormData(prev => ({
                ...prev,
                payment_type: currencyToAdd.code,
                exchange_rate: currencyToAdd.exchangeRate,
            }));
            setPaymentExchangeRateInput(String(currencyToAdd.exchangeRate));
            
            // Reset form
            setNewCurrency({
                code: "",
                name: "",
                symbol: "",
                exchangeRate: 1,
            });
            
            setShowAddCurrencyModal(false);
            alert(`Currency ${currencyToAdd.code} added successfully!`);
        } else {
            alert("Please fill all required fields (Code, Name, Symbol)");
        }
    };

    const handlePaymentCurrencyChange = (field: string, value: any) => {
        if (field !== "payment_type") {
            handleFormChange(field, value);
            return;
        }

        if (value === "add_new") {
            setShowAddCurrencyModal(true);
            return;
        }

        const selectedCurrency = currencies.find((c) => c.code === value);
        const selectedRate = selectedCurrency?.exchangeRate || 1;
        setFormData((prev) => ({
            ...prev,
            payment_type: value,
            exchange_rate: selectedRate,
        }));
        setPaymentExchangeRateInput(String(selectedRate));
    };

    // Calculate totals based on purchase type
const calculateTotals = () => {
    let subtotal = 0;
    let totalTax = 0;
    let totalItemDiscount = 0;

    // Calculate from regular items with currency conversion
    items.forEach(item => {
        // Get currency exchange rate
        const currency = currencies.find(c => c.code === item.currency) || currencies[0];
        const exchangeRate = currency.exchangeRate || 1;
        
        // Convert to INR if needed
        const priceInINR = item.purchase_price * exchangeRate;
        const itemTotal = item.quantity * priceInINR;
        const discount = item.discount_percent > 0 ?
            itemTotal * (item.discount_percent / 100) : 0;
        const taxable = itemTotal - discount;
        const tax = taxable * (item.gst_rate / 100);

        subtotal += taxable;
        totalTax += tax;
        totalItemDiscount += discount;
        
        // Log conversion for debugging
        if (item.currency !== "INR") {
            console.log(`Item ${item.description}: ${item.currency} ${item.purchase_price} = ₹${priceInINR.toFixed(2)}`);
        }
    });

    // Add totals from purchase type specific items with currency conversion
    if (purchaseType === "purchase" || purchaseType === "purchase-import") {
        importItems.forEach(item => {
            const currency = currencies.find(c => c.code === item.currency) || currencies[0];
            const exchangeRate = currency.exchangeRate || 1;
            const priceInINR = item.rate * exchangeRate;
            const itemTotal = item.quantity * priceInINR;
            const discount = item.discount_percent > 0 ?
                itemTotal * (item.discount_percent / 100) : 0;
            subtotal += itemTotal - discount;
            totalItemDiscount += discount;
        });
    } else if (purchaseType === "purchase-expenses") {
        expenseItems.forEach(item => {
            subtotal += item.amount; // Assuming expense items are already in INR
        });
    }

    // Calculate additional charges and discounts (all in INR)
    let freightCharges = formData.freight_charges || 0;
    let pfCharges = formData.pf_charges || 0;
    const discountOnAll = formData.discount_on_all || 0;

    // Calculate tax for freight if TAX option is selected
    if (formData.freight_type.startsWith('tax')) {
        const taxRate = parseFloat(formData.freight_type.replace('tax', ''));
        const freightTax = freightCharges * (taxRate / 100);
        totalTax += freightTax;
        freightCharges += freightTax;
    }

    // Calculate tax for P&F if TAX option is selected
    if (formData.pf_type.startsWith('tax')) {
        const taxRate = parseFloat(formData.pf_type.replace('tax', ''));
        const pfTax = pfCharges * (taxRate / 100);
        totalTax += pfTax;
        pfCharges += pfTax;
    }

    // Calculate discount on all based on type
    const discountAllAmount = formData.discount_type === 'percentage'
        ? subtotal * (discountOnAll / 100)
        : discountOnAll;

    // Calculate totals step by step
    const totalBeforeTax = subtotal;
    const totalAfterTax = totalBeforeTax + totalTax;
    const totalAfterCharges = totalAfterTax + freightCharges + pfCharges;
    const totalAfterDiscountAll = totalAfterCharges - discountAllAmount;
    const grandTotal = totalAfterDiscountAll + (formData.round_off || 0);

    return {
        subtotal: Number(totalBeforeTax.toFixed(2)),
        totalTax: Number(totalTax.toFixed(2)),
        itemDiscount: Number(totalItemDiscount.toFixed(2)),
        freight: Number(freightCharges.toFixed(2)),
        pf: Number(pfCharges.toFixed(2)),
        discountAll: Number(discountAllAmount.toFixed(2)),
        roundOff: Number(formData.round_off || 0),
        grandTotal: Number(grandTotal.toFixed(2)),
        totalAfterCharges: Number(totalAfterCharges.toFixed(2)),
        totalAfterDiscountAll: Number(totalAfterDiscountAll.toFixed(2)),
    };
};

    const totals = calculateTotals();
    const selectedPaymentCurrency =
        currencies.find((c) => c.code === formData.payment_type) ||
        currencies.find((c) => c.code === "INR");
    const paymentCurrencyCode = selectedPaymentCurrency?.code || "INR";
    const paymentCurrencySymbol = selectedPaymentCurrency?.symbol || "Rs. ";
    const paymentExchangeRate = Number(formData.exchange_rate) > 0 ? Number(formData.exchange_rate) : 1;
    const selectedCurrencyTotal = totals.grandTotal;
    const inrFromSelectedCurrency =
        paymentCurrencyCode === "INR"
            ? selectedCurrencyTotal
            : selectedCurrencyTotal * paymentExchangeRate;
    const paymentAmountInInr =
        paymentCurrencyCode === "INR"
            ? Number(paymentData.amount || 0)
            : Number(paymentData.amount || 0) * paymentExchangeRate;

    // Functions for import items
    const updateImportItem = (id: number, field: string, value: any) => {
        setImportItems(prevItems => {
            return prevItems.map(item => {
                if (item.id === id) {
                    const updated = { ...item, [field]: value };
                    
                    // Calculate amount when rate, quantity, or discount changes
                    if (field === 'rate' || field === 'quantity' || field === 'discount_percent') {
                        const total = updated.quantity * updated.rate;
                        const discount = total * (updated.discount_percent / 100);
                        updated.amount = total - discount;
                    }
                    
                    return updated;
                }
                return item;
            });
        });
    };

    const addImportItem = () => {
        setImportItems(prev => [
            ...prev,
            {
                id: Date.now(),
                name: "",
                quantity: 1,
                rate: 0,
                currency: "INR",
                per: "unit",
                discount_percent: 0,
                amount: 0,
            },
        ]);
    };

    const removeImportItem = (id: number) => {
        setImportItems(importItems.filter(item => item.id !== id));
    };

    // Functions for expense items
    const updateExpenseItem = (id: number, field: string, value: any) => {
        setExpenseItems(prevItems => {
            return prevItems.map(item => {
                if (item.id === id) {
                    const updated = { ...item, [field]: value };
                    
                    // Calculate amount when rate changes
                    if (field === 'rate') {
                        updated.amount = updated.rate; // Assuming rate = amount for expenses
                    }
                    
                    return updated;
                }
                return item;
            });
        });
    };

    const addExpenseItem = () => {
        setExpenseItems(prev => [
            ...prev,
            {
                id: Date.now(),
                particulars: "",
                rate: 0,
                per: "unit",
                amount: 0,
            },
        ]);
    };

    const removeExpenseItem = (id: number) => {
        setExpenseItems(expenseItems.filter(item => item.id !== id));
    };

    // Handle import item currency change
    const handleImportItemCurrencyChange = (id: number, currencyCode: string) => {
        setImportItems(prevItems => 
            prevItems.map(item => 
                item.id === id ? { ...item, currency: currencyCode } : item
            )
        );
    };

    // Handle submit
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!company?.id || !purchaseId) return;

        setIsSubmitting(true);
        
        try {
            console.log("🚀 ========== STARTING PURCHASE SUBMISSION ==========");
            console.log("📋 Purchase Type Selected:", purchaseType);
            console.log("🏢 Company ID:", company.id);
            console.log("👥 Supplier ID:", formData.supplier_id);
            
            // Validate supplier
            if (!formData.supplier_id) {
                alert("Please select a supplier");
                setIsSubmitting(false);
                return;
            }

            // Validate items based on purchase type
            if (purchaseType === "purchase-expenses") {
                // For expense purchases, only expense items are allowed
                if (expenseItems.length === 0) {
                    alert("Please add at least one expense item");
                    setIsSubmitting(false);
                    return;
                }
                // Don't validate regular items for expense purchases
            } else if (purchaseType === "purchase" || purchaseType === "purchase-import") {
                // For regular and import purchases, validate regular items
                if (items.length === 0) {
                    alert("Please add at least one item");
                    setIsSubmitting(false);
                    return;
                }
            }

            console.log("🔄 Purchase type (as is):", purchaseType);

            // Prepare data based on purchase type
            let purchaseData: any = {
                vendor_id: formData.supplier_id,
                vendor_invoice_number: formData.vendor_invoice_number || "",
                vendor_invoice_date: formData.vendor_invoice_date || undefined,
                purchase_date: formData.purchase_date,
                due_date: formData.due_date || undefined,
                payment_type: formData.payment_type || "",
                exchange_rate: Number(formData.exchange_rate || 1),
                notes: formData.notes || "",
                terms: formData.terms || "",
                purchase_type: purchaseType,
                
                // Financial data
                round_off: Number(formData.round_off || 0),
                subtotal: Number(totals.subtotal || 0),
                discount_amount: Number(totals.discountAll || 0),
                total_tax: Number(totals.totalTax || 0),
                total_amount: Number(totals.grandTotal || 0),

                // Charges
                freight_charges: Number(formData.freight_charges || 0),
                freight_type: formData.freight_type || "fixed",
                packing_forwarding_charges: Number(formData.pf_charges || 0),
                pf_type: formData.pf_type || "fixed",
                discount_on_all: Number(formData.discount_on_all || 0),
                discount_type: formData.discount_type || "percentage",

                // Contact info
                contact_person: formData.contact_person || "",
                contact_phone: formData.contact_phone || "",
                contact_email: formData.contact_email || "",
                shipping_address: formData.shipping_address || "",
                billing_address: formData.billing_address || "",

                // Payment as nested object
                ...(paymentData.amount > 0 ? {
                    payment: {
                        amount: Number(paymentData.amount),
                        payment_type: paymentData.paymentType,
                        account: paymentData.account,
                        payment_note: paymentData.paymentNote,
                    }
                } : {}),
            };

            // Include regular items ONLY for purchase and purchase-import types
         if (purchaseType === "purchase" || purchaseType === "purchase-import") {
   const preparedItems = items.map((item, index) => {
    const currency = currencies.find(c => c.code === item.currency) || currencies[0];
    const exchangeRate = currency.exchangeRate || 1;
    
    const itemData: any = {
        product_id: item.product_id || undefined,
        description: item.description || `Item ${index + 1}`,
        hsn_code: item.hsn_code || "",
        quantity: Number(item.quantity) || 1,
        unit: item.unit || "unit",
        purchase_price: Number(item.purchase_price) || 0.01,
        item_code: item.item_code || "",
        discount_percent: Number(item.discount_percent || 0),
        discount_amount: Number(item.discount_amount || 0),
        gst_rate: Number(item.gst_rate || 0),
        tax_amount: Number(item.tax_amount || 0),
        unit_cost: Number(item.unit_cost || item.purchase_price || 0.01),
        total_amount: Number(item.total_amount || 0),
          };
    
    // Add currency only for purchase-import type
    if (purchaseType === "purchase-import") {
        itemData.currency = item.currency || "INR";
        itemData.exchange_rate = exchangeRate; // Send exchange rate used
    }

      console.log(`📦 Regular Item ${index + 1}:`, {
        product_id: itemData.product_id,
        description: itemData.description.substring(0, 50),
        quantity: itemData.quantity,
        price: itemData.purchase_price,
        currency: itemData.currency || "INR",
        exchange_rate: itemData.exchange_rate || 1,
        // REMOVE: price_inr: itemData.purchase_price_inr,
        total: itemData.total_amount,
        // REMOVE: total_inr: itemData.total_amount_inr
    });


    return itemData;
});
    
    purchaseData.items = preparedItems;
    console.log(`📊 Total regular items: ${preparedItems.length}`);
}
 else if (purchaseType === "purchase-expenses") {
                console.log("💰 Expense purchase - NOT including regular items");
            }

            // Add import items for purchase and purchase-import types with currency
            if ((purchaseType === "purchase" || purchaseType === "purchase-import") && importItems.length > 0) {
                const preparedImportItems = importItems.map((item, index) => {
                    const importItemData = {
                        name: item.name || `Import Item ${index + 1}`,
                        quantity: Number(item.quantity) || 1,
                        rate: Number(item.rate) || 0,
                        currency: item.currency || "INR", // Include currency
                        per: item.per || "unit",
                        discount_percent: Number(item.discount_percent || 0),
                        amount: Number(item.amount) || 0,
                    };

                    console.log(`📦 Import Item ${index + 1}:`, {
                        name: importItemData.name,
                        quantity: importItemData.quantity,
                        rate: importItemData.rate,
                        currency: importItemData.currency,
                        amount: importItemData.amount
                    });

                    return importItemData;
                });
                
                purchaseData.import_items = preparedImportItems;
                console.log(`📊 Total import items: ${preparedImportItems.length}`);
            }
            
            // Add expense items ONLY for expense purchases
            if (purchaseType === "purchase-expenses" && expenseItems.length > 0) {
                const preparedExpenseItems = expenseItems.map((item, index) => {
                    const expenseItemData = {
                        particulars: item.particulars || `Expense ${index + 1}`,
                        rate: Number(item.rate) || 0,
                        per: item.per || "unit",
                        amount: Number(item.amount) || 0,
                    };

                    console.log(`💰 Expense Item ${index + 1}:`, {
                        particulars: expenseItemData.particulars,
                        rate: expenseItemData.rate,
                        amount: expenseItemData.amount
                    });

                    return expenseItemData;
                });
                
                purchaseData.expense_items = preparedExpenseItems;
                console.log(`📊 Total expense items: ${preparedExpenseItems.length}`);
            }

            // Remove empty arrays to avoid validation errors
            if (!purchaseData.items || purchaseData.items.length === 0) {
                delete purchaseData.items;
            }
            if (!purchaseData.import_items || purchaseData.import_items.length === 0) {
                delete purchaseData.import_items;
            }
            if (!purchaseData.expense_items || purchaseData.expense_items.length === 0) {
                delete purchaseData.expense_items;
            }

            // Log final payload
            console.log("📤 FINAL PAYLOAD TO BE SENT:");
            console.log("Purchase Type:", purchaseData.purchase_type);
            console.log("Vendor ID:", purchaseData.vendor_id);
            console.log("Items:", purchaseData.items ? purchaseData.items.length : 0);
            console.log("Import items:", purchaseData.import_items ? purchaseData.import_items.length : 0);
            console.log("Expense items:", purchaseData.expense_items ? purchaseData.expense_items.length : 0);
            
            // Log the full payload for debugging
            console.log("📄 Full payload:", JSON.stringify(purchaseData, null, 2));

            // Call the API
            console.log("⏳ Calling API...");
            const response = await api.put(`/purchases/${purchaseId}`, purchaseData, {
                params: { company_id: company.id },
            });
            
            console.log('✅ Purchase updated successfully! Response:', response);
            const respData = (response as any)?.data ?? response as any;
            const purchaseNumber =
                respData.purchase_number ||
                respData.data?.purchase_number ||
                nextPurchaseNumber ||
                "";
            alert(`Purchase ${purchaseNumber} updated successfully!`);
            router.push(`/purchase/purchase-list`);

        } catch (error: any) {
            console.error("❌ ========== PURCHASE UPDATE FAILED ==========");
            console.error("Error object:", error);
            
            if (error.response) {
                console.error("Status:", error.response.status);
                console.error("Data:", error.response.data);
                
                // Extract detailed error message
                let errorMessage = "Failed to update purchase: ";
                
                if (error.response.data && typeof error.response.data === 'object') {
                    if (error.response.data.detail) {
                        // Handle array of errors
                        if (Array.isArray(error.response.data.detail)) {
                            errorMessage = error.response.data.detail.map((err: any) => 
                                `${err.loc ? err.loc.join('.') + ': ' : ''}${err.msg}`
                            ).join('\n');
                        } else {
                            errorMessage += JSON.stringify(error.response.data.detail);
                        }
                    } else {
                        errorMessage += JSON.stringify(error.response.data);
                    }
                }
                
                alert(errorMessage);
                
            } else if (error.request) {
                alert("No response from server. Please check your network connection.");
            } else {
                alert(`Error: ${error.message}`);
            }
            
        } finally {
            setIsSubmitting(false);
            console.log("🏁 Submission process completed");
        }
    };

 const handleProductSelect = (itemId: number, product: any) => {
    console.log("Handling product select for item:", itemId, "Product:", product);
    
    setItems(prevItems => 
        prevItems.map(item => {
            if (item.id === itemId) {
                // Extract product data with fallbacks
                const purchasePrice = product.unit_price || product.purchase_price || product.price || 0;
                const gstRate = parseFloat(product.gst_rate) || parseFloat(product.gst) || 18;
                const hsnCode = product.hsn_code || product.hsn || product.hsn_no || "";
                const quantity = item.quantity || 1;
                
                // Preserve existing currency or use product's currency
                const productCurrency = item.currency || product.currency || "INR";
                
                // Calculate totals in original currency first
                const itemTotal = quantity * purchasePrice;
                const discount = item.discount_percent > 0 ? 
                    itemTotal * (item.discount_percent / 100) : 0;
                const taxable = itemTotal - discount;
                const tax = taxable * (gstRate / 100);
                
                console.log("Auto-filling item with:", {
                    purchasePrice,
                    gstRate,
                    hsnCode,
                    quantity,
                    itemTotal,
                    discount,
                    tax,
                    total: taxable + tax,
                    currency: productCurrency
                });
                
                return {
                    ...item,
                    product_id: product.id,
                    description: product.name || product.description || "",
                    hsn_code: hsnCode,
                    purchase_price: purchasePrice,
                    gst_rate: gstRate,
                    cgst_rate: gstRate / 2,
                    sgst_rate: gstRate / 2,
                    discount_amount: discount,
                    tax_amount: tax,
                    unit_cost: purchasePrice,
                    currency: productCurrency,
                    total_amount: taxable + tax,
                };
            }
            return item;
        })
    );
};

const updateItem = (id: number, field: string, value: any) => {
    setItems(prevItems => {
        return prevItems.map(item => {
            if (item.id === id) {
                const updated = { ...item, [field]: value };

                // Recalculate item totals whenever relevant fields change
                const itemTotal = updated.quantity * updated.purchase_price;
                const discount = updated.discount_percent > 0 ?
                    itemTotal * (updated.discount_percent / 100) : 0;
                const taxable = itemTotal - discount;
                const tax = taxable * (updated.gst_rate / 100);

                updated.discount_amount = discount;
                updated.tax_amount = tax;
                updated.unit_cost = updated.purchase_price;
                updated.total_amount = taxable + tax;

                // Update CGST/SGST rates based on GST rate
                updated.cgst_rate = updated.gst_rate / 2;
                updated.sgst_rate = updated.gst_rate / 2;

                // REMOVED: Don't set currency to INR here
                // if (!updated.currency) {
                //     updated.currency = "INR";
                // }

                console.log("Updated item calculation:", {
                    id,
                    field,
                    value,
                    itemTotal,
                    discount,
                    tax,
                    total: updated.total_amount,
                    currency: updated.currency // This will now show the actual currency
                });

                return updated;
            }
            return item;
        });
    });
};



// Add this useEffect after your other useEffects
useEffect(() => {
    if (purchaseType === "purchase-import") {
        setItems(prevItems => 
            prevItems.map(item => ({
                ...item,
                currency: item.currency || "INR" // Initialize only if not set
            }))
        );
    } else {
        // For other purchase types, remove currency from items using type assertion
        setItems(prevItems => 
            prevItems.map(item => {
                // Create a new object without the currency property
                const { currency, ...rest } = item;
                // Type assertion to handle the missing currency property
                return rest as any;
            })
        );
    }
}, [purchaseType]);



// Update form data handler
    const handleFormChange = (field: string, value: any) => {
        setFormData(prev => ({
            ...prev,
            [field]: value,
        }));
    };

    const handleProductSearch = (value: string) => {
        setProductSearch(value);

        if (!value) {
            setSearchResults([]);
            return;
        }

        const results = products.filter(p =>
            p.name?.toLowerCase().includes(value.toLowerCase()) ||
            p.sku?.toLowerCase().includes(value.toLowerCase()) ||
            p.item_code?.toLowerCase().includes(value.toLowerCase())
        );

        setSearchResults(results);
    };

  const handleSearchSelect = (product: any) => {
    console.log("Search select product:", product);
    
    const purchasePrice = product.cost_price || product.purchase_price || product.price || 0;
    const gstRate = parseFloat(product.gst_rate) || parseFloat(product.gst) || 18;
    const hsnCode = product.hsn_code || product.hsn || product.hsn_no || "";
    const itemCode = product.item_code || product.sku || product.code || "";
    const productCurrency = product.currency || "INR"; // Get currency from product
    
    const newItem = {
        id: Date.now(),
        product_id: product.id,
        description: product.name || product.description || "",
        item_code: itemCode,
        hsn_code: hsnCode,
        quantity: 1,
        unit: "unit",
        purchase_price: purchasePrice,
        discount_percent: 0,
        discount_amount: 0,
        gst_rate: gstRate,
        cgst_rate: gstRate / 2,
        sgst_rate: gstRate / 2,
        igst_rate: 0,
        tax_amount: 0,
        unit_cost: purchasePrice,
        total_amount: purchasePrice,
        currency: productCurrency, // Use product's currency
    };
    
    // Calculate initial totals
    const itemTotal = newItem.quantity * newItem.purchase_price;
    const discount = newItem.discount_percent > 0 ?
        itemTotal * (newItem.discount_percent / 100) : 0;
    const taxable = itemTotal - discount;
    const tax = taxable * (newItem.gst_rate / 100);
    
    newItem.discount_amount = discount;
    newItem.tax_amount = tax;
    newItem.total_amount = taxable + tax;

    console.log("Adding new item:", newItem);
    setItems(prev => [...prev, newItem]);
    setProductSearch("");
    setSearchResults([]);
};
  const addItem = (prefill: any = {}) => {
    const newItem: any = {
        id: Date.now(),
        product_id: "",
        description: "",
        item_code: "",
        hsn_code: "",
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
        ...prefill,
    };
    
    // Only add currency field for purchase-import type
    if (purchaseType === "purchase-import") {
        newItem.currency = prefill.currency || "INR";
    }
    
    console.log("Adding new item:", newItem);
    setItems(prev => [...prev, newItem]);
};
    const removeItem = (id: number) => {
        setItems(items.filter(item => item.id !== id));
    };

    // Auto-fill supplier details when supplier is selected
    const handleSupplierChange = (field: string, value: any) => {
        handleFormChange(field, value);
        
        // Auto-fill supplier contact details if available
        if (value) {
            const selectedSupplier = suppliers.find(s => s.id === value);
            if (selectedSupplier) {
                setFormData(prev => ({
                    ...prev,
                    contact_email: selectedSupplier.email || prev.contact_email,
                    contact_phone: selectedSupplier.mobile || selectedSupplier.phone || prev.contact_phone,
                    contact_person: selectedSupplier.contact_person || selectedSupplier.name || prev.contact_person,
                    shipping_address: selectedSupplier.shipping_address || selectedSupplier.address || prev.shipping_address,
                    billing_address: selectedSupplier.billing_address || selectedSupplier.address || prev.billing_address,
                }));
            }
        }
    };

    // Format supplier option label with email and phone
    const formatSupplierOptionLabel = (option: any) => {
        const supplier = suppliers.find(s => s.id === option.value);
        if (!supplier) return option.label;
        
        const name = supplier.vendor_name || supplier.name || supplier.customer_name || `Vendor #${supplier.id}`;
        
        return (
            <div className="py-1">
                <div className="font-medium">{name}</div>
                {(supplier.email || supplier.mobile || supplier.phone) && (
                    <div className="text-xs text-gray-500">
                        {supplier.email && <div> {supplier.email}</div>}
                        {(supplier.mobile || supplier.phone) && (
                            <div> {supplier.mobile || supplier.phone}</div>
                        )}
                    </div>
                )}
            </div>
        );
    };

    if (isPageLoading) {
        return (
            <div className="min-h-screen bg-gray-50 p-4 dark:bg-gray-dark md:p-6">
                <div className="rounded-lg bg-white p-6 shadow-1 dark:bg-gray-dark">
                    <p className="text-dark dark:text-white">Loading purchase...</p>
                </div>
            </div>
        );
    }

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
                            <Link href="/purchase/purchase-list" className="ml-1 text-dark-6 hover:text-primary dark:text-gray-400 dark:hover:text-white md:ml-2">
                                Purchase List
                            </Link>
                        </div>
                    </li>
                    <li>
                        <div className="flex items-center">
                            <svg className="h-4 w-4 text-dark-6 dark:text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                            </svg>
                            <span className="ml-1 font-medium text-dark dark:text-white md:ml-2">Edit Purchase</span>
                        </div>
                    </li>
                </ol>
            </nav>

            {/* Page Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-dark dark:text-white">Purchase - Edit Purchase</h1>
                <p className="text-dark-6">Update purchase invoice with supplier details and items</p>
            </div>

            {/* Add Currency Modal */}
            {showAddCurrencyModal && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg dark:bg-gray-dark">
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-dark dark:text-white">Add New Currency</h3>
                            <button
                                type="button"
                                onClick={() => setShowAddCurrencyModal(false)}
                                className="rounded p-1 hover:bg-gray-100 dark:hover:bg-dark-3"
                            >
                                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                                    Currency Code <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={newCurrency.code}
                                    onChange={(e) => setNewCurrency(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                                    placeholder="e.g., USD, EUR, GBP"
                                    className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3"
                                    maxLength={3}
                                />
                                <p className="mt-1 text-xs text-dark-6">3-letter currency code (ISO 4217)</p>
                            </div>
                            
                            <div>
                                <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                                    Currency Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={newCurrency.name}
                                    onChange={(e) => setNewCurrency(prev => ({ ...prev, name: e.target.value }))}
                                    placeholder="e.g., US Dollar, Euro, British Pound"
                                    className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3"
                                />
                            </div>
                            
                            <div>
                                <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                                    Currency Symbol <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={newCurrency.symbol}
                                    onChange={(e) => setNewCurrency(prev => ({ ...prev, symbol: e.target.value }))}
                                    placeholder="e.g., $, €, £"
                                    className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3"
                                    maxLength={5}
                                />
                            </div>
                            
                            <div>
                                <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                                    Exchange Rate (to INR)
                                </label>
                                <input
                                    type="number"
                                    value={newCurrency.exchangeRate}
                                    onChange={(e) => setNewCurrency(prev => ({ ...prev, exchangeRate: parseFloat(e.target.value) || 1 }))}
                                    placeholder="1.0"
                                    step="0.0001"
                                    min="0.0001"
                                    className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3"
                                />
                                <p className="mt-1 text-xs text-dark-6">1 {newCurrency.code || "XXX"} = {newCurrency.exchangeRate} INR</p>
                            </div>
                        </div>
                        
                        <div className="mt-6 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setShowAddCurrencyModal(false)}
                                className="rounded-lg border border-stroke px-4 py-2.5 text-dark hover:bg-gray-50 dark:border-dark-3 dark:text-white dark:hover:bg-dark-3"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleSaveNewCurrency}
                                className="rounded-lg bg-primary px-4 py-2.5 text-white hover:bg-opacity-90"
                            >
                                Add Currency
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                    {/* Main Form - 3 column layout */}
                    <div className="lg:col-span-3 space-y-6">
                        {/* SECTION 1: Purchase Basic Details */}
                        <div className="rounded-lg bg-white p-6 shadow-1 dark:bg-gray-dark">
                            <h2 className="mb-4 text-lg font-semibold text-dark dark:text-white">Purchase Basic Details</h2>
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                {/* Add Purchase Type Dropdown */}
                                <div>
                                    <SelectField
                                        label="Purchase Type"
                                        name="purchase_type"
                                        value={purchaseType}
                                        onChange={(name, value) => setPurchaseType(value)}
                                        options={[
                                            { value: "purchase", label: "Purchase" },
                                            { value: "purchase-import", label: "Purchase Import" },
                                            { value: "purchase-expenses", label: "Purchase Expenses" },
                                        ]}
                                        required={true}
                                        placeholder="Select Purchase Type"
                                    />
                                </div>
                                
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
                                        Purchase Number <span className="text-red-500">*</span>
                                    </label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={loadingPurchaseNumber ? "Loading..." : nextPurchaseNumber}
                                            className="flex-1 rounded-lg border border-stroke bg-gray-50 px-4 py-2.5 outline-none dark:border-dark-3 dark:bg-dark-2"
                                            readOnly
                                            disabled={loadingPurchaseNumber}
                                        />
                                    </div>
                                    {loadingPurchaseNumber && (
                                        <p className="mt-1 text-sm text-gray-500">Generating purchase number...</p>
                                    )}
                                </div>
                                
                                {/* Supplier/Vendor Field with Email and Phone */}
                                <div>
                                    <SelectField
                                        label="Supplier/Vendor"
                                        name="supplier_id"
                                        value={formData.supplier_id}
                                        onChange={handleSupplierChange}
                                        options={suppliers.map(supplier => ({
                                            value: supplier.id,
                                            label: supplier.vendor_name || supplier.name || supplier.customer_name || `Vendor #${supplier.id}`
                                        }))}
                                        required={true}
                                        placeholder="Select Supplier"
                                        formatOptionLabel={formatSupplierOptionLabel}
                                    />
                                    {suppliers.length > 0 && (
                                        <p className="mt-1 text-xs text-gray-500">
                                            Showing {suppliers.length} suppliers
                                        </p>
                                    )}
                                </div>
                                
                                <div>
                                    <SelectField
                                        label="Payment Type / Currency"
                                        name="payment_type"
                                        value={formData.payment_type}
                                        onChange={handlePaymentCurrencyChange}
                                        options={[
                                            { value: "", label: "- Select -" },
                                            ...currencies.map((currency) => ({
                                                value: currency.code,
                                                label: `${currency.code} - ${currency.name}`,
                                            })),
                                            { value: "add_new", label: "+ Add New Currency" },
                                        ]}
                                        required={true}
                                        placeholder="Select Currency"
                                    />
                                </div>
                                <div>
                                    <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                                        Exchange Rate
                                    </label>
                                    <input
                                        type="number"
                                        value={paymentExchangeRateInput}
                                        onChange={(e) => {
                                            const raw = e.target.value;
                                            setPaymentExchangeRateInput(raw);
                                            const parsed = parseFloat(raw);
                                            if (!Number.isNaN(parsed)) {
                                                setFormData((prev) => ({ ...prev, exchange_rate: parsed }));
                                            }
                                        }}
                                        onBlur={() => {
                                            const parsed = parseFloat(paymentExchangeRateInput);
                                            const safeRate = !Number.isNaN(parsed) && parsed > 0 ? parsed : 1;
                                            setFormData((prev) => ({ ...prev, exchange_rate: safeRate }));
                                            setPaymentExchangeRateInput(String(safeRate));
                                        }}
                                        min="0.0001"
                                        step="0.0001"
                                        className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3"
                                    />
                                </div>
                                
                                <div>
                                    <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                                        Purchase Date <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="date"
                                        value={formData.purchase_date}
                                        onChange={(e) => handleFormChange('purchase_date', e.target.value)}
                                        className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3"
                                        required
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
                                        Vendor Invoice No.
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.vendor_invoice_number || ""}
                                        onChange={(e) => setFormData({ ...formData, vendor_invoice_number: e.target.value })}
                                        className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3"
                                    />
                                </div>
                                <div>
                                    <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                                        Vendor Invoice Date
                                    </label>
                                    <input
                                        type="date"
                                        value={formData.vendor_invoice_date}
                                        onChange={(e) => handleFormChange('vendor_invoice_date', e.target.value)}
                                        className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* SECTION 2: Regular Purchase Items (VISIBLE for purchase and purchase-import) */}
                        {purchaseType !== "purchase-expenses" && (
                            <div className="rounded-lg bg-white p-6 shadow-1 dark:bg-gray-dark">
                                <div className="mb-4 flex items-center justify-between">
                                    <h2 className="text-lg font-semibold text-dark dark:text-white">Purchase Items</h2>
                                    <div className="flex gap-2">
                                        <div className="text-dark-6">
                                            Total Quantity: {items.reduce((sum, item) => sum + item.quantity, 0)}
                                        </div>
                                        <div className="text-dark-6">
                                            Items: {items.length}
                                        </div>
                                    </div>
                                </div>
                            <div className="mb-4 flex justify-end">
                                <button
                                    type="button"
                                    onClick={() => addItem()}
                                    className="rounded-lg bg-primary px-4 py-2.5 text-white hover:bg-opacity-90"
                                >
                                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                </button>
                            </div>{/* Items Table - Different columns based on purchase type */}
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="border-b border-stroke dark:border-dark-3">
                                                <th className="px-4 py-3 text-left text-sm font-medium text-dark-6">Item Name</th>
                                                <th className="px-4 py-3 text-left text-sm font-medium text-dark-6">Item Code</th>
                                                <th className="px-4 py-3 text-left text-sm font-medium text-dark-6">HSN</th>
                                                <th className="px-4 py-3 text-left text-sm font-medium text-dark-6">Description</th>
                                                <th className="px-4 py-3 text-left text-sm font-medium text-dark-6">Quantity</th>
                                              <th className="px-4 py-3 text-left text-sm font-medium text-dark-6">
    <div className="flex items-center gap-1">
        <span>Purchase Price</span>
        {purchaseType === "purchase-import" && (
            <span className="text-xs text-dark-6">(with currency)</span>
        )}
    </div>
</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-dark-6">Discount</th>
                                            <th className="px-4 py-3 text-left text-sm font-medium text-dark-6">Tax Amount</th>
                                                <th className="px-4 py-3 text-left text-sm font-medium text-dark-6">Tax %</th>
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
                                                                console.log("Product selected in dropdown:", product);
                                                                if (product) {
                                                                    handleProductSelect(item.id, product);
                                                                }
                                                            }}
                                                            placeholder="Select Product"
                                                            onProductSelect={(product) => {
                                                                console.log("onProductSelect triggered:", product);
                                                                handleProductSelect(item.id, product);
                                                            }}
                                                        />
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <input
                                                            type="text"
                                                            value={item.item_code}
                                                            onChange={(e) => updateItem(item.id, 'item_code', e.target.value)}
                                                            className="w-full min-w-[120px] rounded border border-stroke bg-transparent px-3 py-1.5 outline-none focus:border-primary dark:border-dark-3"
                                                            placeholder="Item code"
                                                        />
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <input
                                                            type="text"
                                                            value={item.hsn_code}
                                                            onChange={(e) => updateItem(item.id, 'hsn_code', e.target.value)}
                                                            className="w-full min-w-[100px] rounded border border-stroke bg-transparent px-3 py-1.5 outline-none focus:border-primary dark:border-dark-3"
                                                            placeholder="HSN"
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
    <div className="flex gap-2">
        <div className="flex-1">
            <input
                type="number"
                value={item.purchase_price}
                onChange={(e) => updateItem(item.id, 'purchase_price', parseFloat(e.target.value))}
                className="w-full rounded border border-stroke bg-transparent px-3 py-1.5 outline-none focus:border-primary dark:border-dark-3"
                min="0"
                step="0.01"
            />
            {/* Show INR conversion below */}
            {item.currency !== "INR" && (
                <div className="text-xs text-gray-500 mt-1">
                    ₹{(item.purchase_price * (currencies.find(c => c.code === item.currency)?.exchangeRate || 1)).toFixed(2)} INR
                </div>
            )}
        </div>
        {purchaseType === "purchase-import" && (
            <CurrencySelect
                value={item.currency || "INR"}
                onChange={(currency) => {
                    updateItem(item.id, 'currency', currency);
                }}
                currencies={currencies}
                onAddNewCurrency={handleAddNewCurrency}
                itemPrice={item.purchase_price} // Pass price for conversion display
            />
        )}
    </div>
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
    <div>
        {/* Show in original currency if not INR */}
        {item.currency !== "INR" && (
            <div className="text-sm text-gray-600">
                {currencies.find(c => c.code === item.currency)?.symbol || ""}
                {item.total_amount.toFixed(2)} {item.currency}
            </div>
        )}
        {/* Always show INR value */}
        <div>
            ₹{(
                item.total_amount * 
                (currencies.find(c => c.code === item.currency)?.exchangeRate || 1)
            ).toFixed(2)}
        </div>
    </div>
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
                        )}

                        {/* The rest of your form remains the same... */}
                   

                        {/* The rest of your form remains the same... */}
                        {/* SECTION 4: Charges & Summary */}
                        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                            {/* Left side - Charges & Discounts */}
                            <div className="lg:col-span-2">
                                <div className="rounded-lg bg-white p-6 shadow-1 dark:bg-gray-dark">
                                    <h2 className="mb-4 text-lg font-semibold text-dark dark:text-white">Charges & Discounts</h2>
                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                       {/* Freight Charges */}
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
            className="w-32 rounded-lg border border-stroke bg-transparent px-2 py-2.5 outline-none focus:border-primary dark:border-dark-3"
        >
            <option value="fixed">Fixed</option>
            <option value="tax18">TAX @ 18%</option>
            <option value="tax5">TAX @ 5%</option>
            <option value="tax28">TAX @ 28%</option>
            <option value="tax12">TAX @ 12%</option>
        </select>
    </div>
</div>
                                   {/* P & F Charges */}
<div>
    <label className="mb-2 block text-sm font-medium text-dark dark:text-white">P & F Charges</label>
    <div className="flex gap-2">
        <input
            type="number"
            value={formData.pf_charges}
            onChange={(e) => setFormData({ ...formData, pf_charges: parseFloat(e.target.value) })}
            className="flex-1 rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3"
            min="0"
        />
        <select
            value={formData.pf_type}
            onChange={(e) => setFormData({ ...formData, pf_type: e.target.value })}
            className="w-32 rounded-lg border border-stroke bg-transparent px-2 py-2.5 outline-none focus:border-primary dark:border-dark-3"
        >
            <option value="fixed">Fixed</option>
            <option value="tax18">TAX @ 18%</option>
            <option value="tax5">TAX @ 5%</option>
            <option value="tax28">TAX @ 28%</option>
            <option value="tax12">TAX @ 12%</option>
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
                                            <span className="text-dark-6">P & F Charges</span>
                                            <span className="font-medium text-dark dark:text-white">₹{totals.pf.toLocaleString('en-IN')}</span>
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
                                            <div className="mt-2 flex justify-between text-sm">
                                                <span className="text-dark-6">Total in {paymentCurrencyCode}</span>
                                                <span className="font-medium text-dark dark:text-white">
                                                    {paymentCurrencySymbol}{selectedCurrencyTotal.toLocaleString("en-IN", {
                                                        minimumFractionDigits: 2,
                                                        maximumFractionDigits: 2,
                                                    })}
                                                </span>
                                            </div>
                                            {paymentCurrencyCode !== "INR" && (
                                                <div className="mt-1 flex justify-between text-xs">
                                                    <span className="text-dark-6">INR Equivalent (Total {paymentCurrencyCode} × {paymentExchangeRate})</span>
                                                    <span className="font-medium text-dark dark:text-white">
                                                        Rs. {inrFromSelectedCurrency.toLocaleString("en-IN", {
                                                            minimumFractionDigits: 2,
                                                            maximumFractionDigits: 2,
                                                        })}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                       
                        {/* SECTION 5: Previous Payments Information */}
                        <div className="rounded-lg bg-white shadow-1 dark:bg-gray-dark">
                            <div className="flex items-center justify-between border-b border-stroke px-6 py-4 dark:border-dark-3">
                                <h2 className="text-lg font-semibold text-dark dark:text-white">Previous Payments Information</h2>
                                <button
                                    type="button"
                                    onClick={() => setShowPreviousPayments(!showPreviousPayments)}
                                    className="rounded p-1 hover:bg-gray-100 dark:hover:bg-dark-3"
                                >
                                    <svg className={`h-5 w-5 transition-transform ${showPreviousPayments ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>
                            </div>
                            {showPreviousPayments && (
                                <div className="p-6">
                                    {previousPayments.length === 0 ? (
                                        <div className="py-8 text-center">
                                            <svg className="mx-auto mb-4 h-12 w-12 text-dark-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            <p className="text-dark-6">No previous payments found</p>
                                        </div>
                                    ) : (
                                        <div className="overflow-x-auto">
                                            <table className="w-full">
                                                <thead>
                                                    <tr className="border-b border-stroke dark:border-dark-3">
                                                        <th className="px-4 py-3 text-left text-sm font-medium text-dark-6">#</th>
                                                        <th className="px-4 py-3 text-left text-sm font-medium text-dark-6">Date</th>
                                                        <th className="px-4 py-3 text-left text-sm font-medium text-dark-6">Payment Type</th>
                                                        <th className="px-4 py-3 text-left text-sm font-medium text-dark-6">Payment Note</th>
                                                        <th className="px-4 py-3 text-left text-sm font-medium text-dark-6">Payment Amount</th>
                                                        <th className="px-4 py-3 text-left text-sm font-medium text-dark-6">Action</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {/* Payments would be listed here */}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* SECTION 6: Make Payment */}
                        <div className="rounded-lg bg-white p-6 shadow-1 dark:bg-gray-dark">
                            <h2 className="mb-6 text-lg font-semibold text-dark dark:text-white">
                                Make Payment
                            </h2>

                            <div className="bg-gray-50 dark:bg-dark-2 p-4 rounded-lg">
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    {/* Amount Field */}
                                    <div>
                                        <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                                            Amount
                                        </label>
                                        <input
                                            type="number"
                                            value={paymentData.amount}
                                            onChange={(e) => setPaymentData(prev => ({
                                                ...prev,
                                                amount: parseFloat(e.target.value) || 0
                                            }))}
                                            placeholder="Enter payment amount"
                                            min="0"
                                            step="0.01"
                                            className="w-full rounded-lg border border-stroke bg-white px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3 dark:bg-gray-dark"
                                        />
                                    </div>

                                    {/* Payment Type Dropdown */}
                                    <div>
                                        <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                                            Payment Type
                                        </label>
                                        <SelectField
                                            label=""
                                            name="paymentType"
                                            value={paymentData.paymentType}
                                            onChange={(name, value) => setPaymentData(prev => ({
                                                ...prev,
                                                [name]: value
                                            }))}
                                            options={[
                                                { value: "", label: "- Select -" },
                                                { value: "credit", label: "Credit" },
                                                { value: "cash", label: "Cash" },
                                                { value: "card", label: "Card" },
                                                { value: "bank_transfer", label: "Bank Transfer" },
                                                { value: "cheque", label: "Cheque" }
                                            ]}
                                            placeholder="- Select -"
                                            required={false}
                                        />
                                    </div>

                                    {/* Account Dropdown */}
                                    <div>
                                        <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                                            Account
                                        </label>
                                        <SelectField
                                            label=""
                                            name="account"
                                            value={paymentData.account}
                                            onChange={(name, value) => setPaymentData(prev => ({
                                                ...prev,
                                                [name]: value
                                            }))}
                                            options={[
                                                { value: "", label: "- Select Account -" },
                                                { value: "icici_bank", label: "ICICI Bank" },
                                                { value: "idfc_bank", label: "IDFC First Bank" }
                                            ]}
                                            placeholder="- Select Account -"
                                            required={false}
                                        />
                                    </div>

                                    {/* Payment Note Field */}
                                    <div className="md:col-span-4">
                                        <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                                            Payment Note
                                        </label>
                                        <textarea
                                            value={paymentData.paymentNote}
                                            onChange={(e) => setPaymentData(prev => ({
                                                ...prev,
                                                paymentNote: e.target.value
                                            }))}
                                            placeholder="Enter payment remarks or reference details"
                                            rows={2}
                                            className="w-full rounded-lg border border-stroke bg-white px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3 dark:bg-gray-dark"
                                        />
                                    </div>
                                </div>

                                {/* Payment Summary */}
                                {paymentData.amount > 0 && (
                                    <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-dark-6 dark:text-gray-400">
                                                Payment Amount:
                                            </span>
                                            <span className="font-medium text-dark dark:text-white">
                                                {paymentCurrencySymbol}{Number(paymentData.amount).toLocaleString("en-IN", {
                                                    minimumFractionDigits: 2,
                                                    maximumFractionDigits: 2,
                                                })} {paymentCurrencyCode}
                                            </span>
                                        </div>
                                        {paymentCurrencyCode !== "INR" && (
                                            <div className="mt-1 flex items-center justify-between">
                                                <span className="text-xs text-dark-6 dark:text-gray-400">
                                                    INR Equivalent:
                                                </span>
                                                <span className="text-sm font-medium text-dark dark:text-white">
                                                    Rs. {paymentAmountInInr.toLocaleString("en-IN", {
                                                        minimumFractionDigits: 2,
                                                        maximumFractionDigits: 2,
                                                    })}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* SECTION 7: Other Fields (Accordion) */}
                        <div className="rounded-lg bg-white shadow-1 dark:bg-gray-dark">
                            <div className="flex items-center justify-between border-b border-stroke px-6 py-4 dark:border-dark-3">
                                <h2 className="text-lg font-semibold text-dark dark:text-white">Terms & Conditions</h2>
                                <button
                                    type="button"
                                    onClick={() => setShowOtherFields(!showOtherFields)}
                                    className="rounded p-1 hover:bg-gray-100 dark:hover:bg-dark-3"
                                >
                                    <svg className={`h-5 w-5 transition-transform ${showOtherFields ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>
                            </div>
                            {showOtherFields && (
                                <div className="p-6">
                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                        <div className="md:col-span-2">
                                            <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                                                Terms & Conditions
                                            </label>
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
                                    {isSubmitting ? "Updating..." : "Update Purchase"}
                                </button>

                                <button
                                    type="button"
                                    onClick={() => router.back()}
                                    className="min-w-[180px] rounded-lg border border-stroke bg-white px-6 py-3 font-medium text-dark transition hover:bg-gray-50 dark:border-dark-3 dark:bg-gray-dark dark:text-white"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    );
}






