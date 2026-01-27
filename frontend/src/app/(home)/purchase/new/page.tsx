"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import { vendorsApi, productsApi, purchasesApi } from "@/services/api";
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

export default function AddPurchasePage() {
    const router = useRouter();
    const { company, user } = useAuth();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showOtherFields, setShowOtherFields] = useState(false);
    const [showPreviousPayments, setShowPreviousPayments] = useState(false);
    const [nextPurchaseNumber, setNextPurchaseNumber] = useState("");
    const [loadingPurchaseNumber, setLoadingPurchaseNumber] = useState(false);

    const [productSearch, setProductSearch] = useState("");
    const [searchResults, setSearchResults] = useState<any[]>([]);

    // Add new state for purchase type
    const [purchaseType, setPurchaseType] = useState("purchase"); // purchase, purchase-import, purchase-expenses
    
    // State for import items
    const [importItems, setImportItems] = useState([
        {
            id: 1,
            name: "",
            quantity: 1,
            rate: 0,
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
        },
    ]);

    // Load data on component mount
    useEffect(() => {
        if (company?.id) {
            loadSuppliers();
            loadProducts();
            loadNextPurchaseNumber();
        }
    }, [company?.id]);

    const loadNextPurchaseNumber = async () => {
        if (!company?.id) return;

        try {
            setLoadingPurchaseNumber(true);
            const today = new Date();
            const year = today.getFullYear();
            const month = String(today.getMonth() + 1).padStart(2, '0');
            const purchaseNumber = `PUR-${year}${month}-001`;
            setNextPurchaseNumber(purchaseNumber);
        } catch (error) {
            console.error("Failed to load next purchase number:", error);
        } finally {
            setLoadingPurchaseNumber(false);
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
            
            // Check different possible structures
            let vendorsArray = [];
            
            if (Array.isArray(response)) {
                vendorsArray = response;
            } else if (response && Array.isArray(response.data)) {
                vendorsArray = response.data;
            } else if (response && response.data && Array.isArray(response.data.vendors)) {
                vendorsArray = response.data.vendors;
            } else if (response && response.vendors) {
                vendorsArray = response.vendors;
            } else if (response && response.customers) {
                vendorsArray = response.customers;
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
            setProducts(response.products || []);
        } catch (error) {
            console.error("Failed to load products:", error);
        } finally {
            setLoading(prev => ({ ...prev, products: false }));
        }
    };

    // Calculate totals based on purchase type
    const calculateTotals = () => {
        let subtotal = 0;
        let totalTax = 0;
        let totalItemDiscount = 0;

        // Calculate from regular items (always included)
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

        // Add totals from purchase type specific items
 if (purchaseType === "purchase" || purchaseType === "purchase-import") {
            importItems.forEach(item => {
                const itemTotal = item.quantity * item.rate;
                const discount = item.discount_percent > 0 ?
                    itemTotal * (item.discount_percent / 100) : 0;
                subtotal += itemTotal - discount;
                totalItemDiscount += discount;
            });
        } else if (purchaseType === "purchase-expenses") {
            expenseItems.forEach(item => {
                subtotal += item.amount;
            });
        }

        // Calculate additional charges and discounts
        const freightCharges = formData.freight_charges || 0;
        const pfCharges = formData.pf_charges || 0;
        const discountOnAll = formData.discount_on_all || 0;

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

const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company?.id) return;

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

        // DO NOT NORMALIZE HERE - Send as is to backend
        // The backend will handle the normalization
        console.log("🔄 Purchase type (as is):", purchaseType);

        // Prepare data based on purchase type
        let purchaseData: any = {
            vendor_id: formData.supplier_id,
            vendor_invoice_number: formData.vendor_invoice_number || "",
            vendor_invoice_date: formData.vendor_invoice_date || undefined,
            purchase_date: formData.purchase_date,
            due_date: formData.due_date || undefined,
            payment_type: formData.payment_type || "",
            notes: formData.notes || "",
            terms: formData.terms || "",
            purchase_type: purchaseType, // Send as is (with hyphen)
            
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
                const itemData = {
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

                console.log(`📦 Regular Item ${index + 1}:`, {
                    product_id: itemData.product_id,
                    description: itemData.description.substring(0, 50),
                    quantity: itemData.quantity,
                    price: itemData.purchase_price,
                    total: itemData.total_amount
                });

                return itemData;
            });
            
            purchaseData.items = preparedItems;
            console.log(`📊 Total regular items: ${preparedItems.length}`);
        } else if (purchaseType === "purchase-expenses") {
            // For expense purchases, don't include regular items at all
            console.log("💰 Expense purchase - NOT including regular items");
            // DO NOT include items array at all
        }

        // Add import items for purchase and purchase-import types
        if ((purchaseType === "purchase" || purchaseType === "purchase-import") && importItems.length > 0) {
            const preparedImportItems = importItems.map((item, index) => {
                const importItemData = {
                    name: item.name || `Import Item ${index + 1}`,
                    quantity: Number(item.quantity) || 1,
                    rate: Number(item.rate) || 0,
                    per: item.per || "unit",
                    discount_percent: Number(item.discount_percent || 0),
                    amount: Number(item.amount) || 0,
                };

                console.log(`📦 Import Item ${index + 1}:`, {
                    name: importItemData.name,
                    quantity: importItemData.quantity,
                    rate: importItemData.rate,
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
        const response = await purchasesApi.create(company.id, purchaseData);
        
        console.log('✅ Purchase created successfully! Response:', response);
        alert(`Purchase ${response.purchase_number} saved successfully!`);
        router.push(`/purchase/purchase-list`);

    } catch (error: any) {
        console.error("❌ ========== PURCHASE CREATION FAILED ==========");
        console.error("Error object:", error);
        
        if (error.response) {
            console.error("Status:", error.response.status);
            console.error("Data:", error.response.data);
            
            // Extract detailed error message
            let errorMessage = "Failed to create purchase: ";
            
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
                            updated.hsn_code = selectedProduct.hsn_code || selectedProduct.hsn || "";
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
                            <span className="ml-1 font-medium text-dark dark:text-white md:ml-2">Add Purchase</span>
                        </div>
                    </li>
                </ol>
            </nav>

            {/* Page Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-dark dark:text-white">Purchase – Add / Update Purchase</h1>
                <p className="text-dark-6">Create new purchase invoice with supplier details and items</p>
            </div>

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
                                        label="Payment Type"
                                        name="payment_type"
                                        value={formData.payment_type}
                                        onChange={handleFormChange}
                                        options={[
                                            { value: "", label: "- Select -" },
                                            { value: "cash", label: "Cash" },
                                            { value: "credit", label: "Credit" },
                                            { value: "bank_transfer", label: "Bank Transfer" },
                                            { value: "cheque", label: "Cheque" },
                                            { value: "online", label: "Online Payment" },
                                        ]}
                                        required={true}
                                        placeholder="Select Payment Type"
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

                        {/* SECTION 2: Regular Purchase Items (ALWAYS VISIBLE) */}
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
                                            <th className="px-4 py-3 text-left text-sm font-medium text-dark-6">HSN</th>
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
                                                                        hsn_code: product.hsn_code || product.hsn || "",
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
)}
                        {/* SECTION 3: Purchase Type Specific Items */}
                        {/* Import Items Section */}
                       {(purchaseType === "purchase" || purchaseType === "purchase-import") && (      <div className="rounded-lg bg-white p-6 shadow-1 dark:bg-gray-dark">
                                <div className="mb-4 flex items-center justify-between">
                                    <h2 className="text-lg font-semibold text-dark dark:text-white">Import Items</h2>
                                    <button
                                        type="button"
                                        onClick={addImportItem}
                                        className="rounded-lg bg-primary px-4 py-2 text-white hover:bg-opacity-90"
                                    >
                                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                        </svg>
                                    </button>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="border-b border-stroke dark:border-dark-3">
                                                <th className="px-4 py-3 text-left text-sm font-medium text-dark-6">#</th>
                                                <th className="px-4 py-3 text-left text-sm font-medium text-dark-6">Item Name</th>
                                                <th className="px-4 py-3 text-left text-sm font-medium text-dark-6">Quantity</th>
                                                <th className="px-4 py-3 text-left text-sm font-medium text-dark-6">Rate</th>
                                                <th className="px-4 py-3 text-left text-sm font-medium text-dark-6">Per</th>
                                                <th className="px-4 py-3 text-left text-sm font-medium text-dark-6">Disc %</th>
                                                <th className="px-4 py-3 text-left text-sm font-medium text-dark-6">Amount</th>
                                                <th className="px-4 py-3 text-left text-sm font-medium text-dark-6">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {importItems.map((item, index) => (
                                                <tr key={item.id} className="border-b border-stroke last:border-0 dark:border-dark-3">
                                                    <td className="px-4 py-3">{index + 1}</td>
                                                    <td className="px-4 py-3">
                                                        <input
                                                            type="text"
                                                            value={item.name}
                                                            onChange={(e) => updateImportItem(item.id, 'name', e.target.value)}
                                                            className="w-full min-w-[200px] rounded border border-stroke bg-transparent px-3 py-1.5 outline-none focus:border-primary dark:border-dark-3"
                                                            placeholder="Enter item name"
                                                        />
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <input
                                                            type="number"
                                                            value={item.quantity}
                                                            onChange={(e) => updateImportItem(item.id, 'quantity', parseFloat(e.target.value))}
                                                            className="w-20 rounded border border-stroke bg-transparent px-3 py-1.5 outline-none focus:border-primary dark:border-dark-3"
                                                            min="0"
                                                            step="0.001"
                                                        />
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <input
                                                            type="number"
                                                            value={item.rate}
                                                            onChange={(e) => updateImportItem(item.id, 'rate', parseFloat(e.target.value))}
                                                            className="w-24 rounded border border-stroke bg-transparent px-3 py-1.5 outline-none focus:border-primary dark:border-dark-3"
                                                            min="0"
                                                            step="0.01"
                                                        />
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <select
                                                            value={item.per}
                                                            onChange={(e) => updateImportItem(item.id, 'per', e.target.value)}
                                                            className="w-20 rounded border border-stroke bg-transparent px-2 py-1.5 outline-none focus:border-primary dark:border-dark-3"
                                                        >
                                                            <option value="unit">Unit</option>
                                                            <option value="kg">Kg</option>
                                                            <option value="liter">Liter</option>
                                                            <option value="meter">Meter</option>
                                                            <option value="box">Box</option>
                                                        </select>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <input
                                                            type="number"
                                                            value={item.discount_percent}
                                                            onChange={(e) => updateImportItem(item.id, 'discount_percent', parseFloat(e.target.value))}
                                                            className="w-20 rounded border border-stroke bg-transparent px-3 py-1.5 outline-none focus:border-primary dark:border-dark-3"
                                                            min="0"
                                                            max="100"
                                                            step="0.01"
                                                        />
                                                    </td>
                                                    <td className="px-4 py-3 font-medium">
                                                        ₹{item.amount.toFixed(2)}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        {importItems.length > 1 && (
                                                            <button
                                                                type="button"
                                                                onClick={() => removeImportItem(item.id)}
                                                                className="rounded p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                                                            >
                                                                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                                </svg>
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot>
                                            <tr>
                                                <td colSpan={6} className="px-4 py-3 text-right font-semibold">
                                                    Total:
                                                </td>
                                                <td className="px-4 py-3 font-bold text-primary">
                                                    ₹{importItems.reduce((sum, item) => sum + item.amount, 0).toFixed(2)}
                                                </td>
                                                <td></td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* Expense Items Section */}
                        {purchaseType === "purchase-expenses" && (
                            <div className="rounded-lg bg-white p-6 shadow-1 dark:bg-gray-dark">
                                <div className="mb-4 flex items-center justify-between">
                                    <h2 className="text-lg font-semibold text-dark dark:text-white">Expense Items</h2>
                                    <button
                                        type="button"
                                        onClick={addExpenseItem}
                                        className="rounded-lg bg-primary px-4 py-2 text-white hover:bg-opacity-90"
                                    >
                                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                        </svg>
                                    </button>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="border-b border-stroke dark:border-dark-3">
                                                <th className="px-4 py-3 text-left text-sm font-medium text-dark-6">#</th>
                                                <th className="px-4 py-3 text-left text-sm font-medium text-dark-6">Particulars</th>
                                                <th className="px-4 py-3 text-left text-sm font-medium text-dark-6">Rate</th>
                                                <th className="px-4 py-3 text-left text-sm font-medium text-dark-6">Per</th>
                                                <th className="px-4 py-3 text-left text-sm font-medium text-dark-6">Amount</th>
                                                <th className="px-4 py-3 text-left text-sm font-medium text-dark-6">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {expenseItems.map((item, index) => (
                                                <tr key={item.id} className="border-b border-stroke last:border-0 dark:border-dark-3">
                                                    <td className="px-4 py-3">{index + 1}</td>
                                                    <td className="px-4 py-3">
                                                        <input
                                                            type="text"
                                                            value={item.particulars}
                                                            onChange={(e) => updateExpenseItem(item.id, 'particulars', e.target.value)}
                                                            className="w-full min-w-[250px] rounded border border-stroke bg-transparent px-3 py-1.5 outline-none focus:border-primary dark:border-dark-3"
                                                            placeholder="Enter expense particulars"
                                                        />
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <input
                                                            type="number"
                                                            value={item.rate}
                                                            onChange={(e) => updateExpenseItem(item.id, 'rate', parseFloat(e.target.value))}
                                                            className="w-24 rounded border border-stroke bg-transparent px-3 py-1.5 outline-none focus:border-primary dark:border-dark-3"
                                                            min="0"
                                                            step="0.01"
                                                        />
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <select
                                                            value={item.per}
                                                            onChange={(e) => updateExpenseItem(item.id, 'per', e.target.value)}
                                                            className="w-20 rounded border border-stroke bg-transparent px-2 py-1.5 outline-none focus:border-primary dark:border-dark-3"
                                                        >
                                                            <option value="unit">Unit</option>
                                                            <option value="kg">Kg</option>
                                                            <option value="liter">Liter</option>
                                                            <option value="meter">Meter</option>
                                                            <option value="box">Box</option>
                                                        </select>
                                                    </td>
                                                    <td className="px-4 py-3 font-medium">
                                                        ₹{item.amount.toFixed(2)}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        {expenseItems.length > 1 && (
                                                            <button
                                                                type="button"
                                                                onClick={() => removeExpenseItem(item.id)}
                                                                className="rounded p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                                                            >
                                                                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                                </svg>
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot>
                                            <tr>
                                                <td colSpan={4} className="px-4 py-3 text-right font-semibold">
                                                    Total:
                                                </td>
                                                <td className="px-4 py-3 font-bold text-primary">
                                                    ₹{expenseItems.reduce((sum, item) => sum + item.amount, 0).toFixed(2)}
                                                </td>
                                                <td></td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* SECTION 4: Charges & Summary */}
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
                                                ₹{paymentData.amount.toFixed(2)}
                                            </span>
                                        </div>
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
                                    {isSubmitting ? "Saving..." : "Save Purchase"}
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