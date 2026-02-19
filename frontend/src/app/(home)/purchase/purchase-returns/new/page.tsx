"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import { purchasesApi, purchaseReturnsApi } from "@/services/api";
import Select from 'react-select';
import { useRef } from "react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:6768/api";

const normalizeReturnNumber = (returnNumber: string): string => {
    const raw = (returnNumber || "").trim();
    if (!raw) return raw;

    if (/^PRN-/i.test(raw)) return raw;
    return `PRN-${raw}`;
};

const generateFallbackReturnNumber = (): string => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    const hh = String(now.getHours()).padStart(2, "0");
    const mi = String(now.getMinutes()).padStart(2, "0");
    const ss = String(now.getSeconds()).padStart(2, "0");
    return `PRN-${yyyy}${mm}${dd}-${hh}${mi}${ss}`;
};

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
                    const inputValue =
                        selectRef.current?.select?.state?.inputValue;
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

export default function AddPurchaseReturnPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const fromPurchaseInvoiceId = searchParams.get("fromPurchaseInvoice");
    const editReturnId = searchParams.get("editId");
    const isEditMode = Boolean(editReturnId);
    const { company, user } = useAuth();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showPreviousPayments, setShowPreviousPayments] = useState(false);
    const [showPaymentSection, setShowPaymentSection] = useState(false);
    const [nextReturnNumber, setNextReturnNumber] = useState("");
    const [loadingReturnNumber, setLoadingReturnNumber] = useState(false);
    const [prefillLoading, setPrefillLoading] = useState(false);
    const [prefillError, setPrefillError] = useState("");
    const [vendors, setVendors] = useState<any[]>([]);
    const [loadingVendors, setLoadingVendors] = useState(false);

    const getAuthToken = () => {
        if (typeof window === "undefined") return null;
        const userType = localStorage.getItem("user_type");
        if (userType === "employee") {
            return localStorage.getItem("employee_token");
        }
        return localStorage.getItem("access_token");
    };

    const [productSearch, setProductSearch] = useState("");
    const [searchResults, setSearchResults] = useState<any[]>([]);

    // Payment state
    const [paymentData, setPaymentData] = useState({
        amount: 0,
        paymentType: "",
        account: "",
        paymentNote: "",
    });

    // State for dropdown data
    const [customers, setCustomers] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]);
    const [purchases, setPurchases] = useState<any[]>([]);
    const [loading, setLoading] = useState({
        customers: false,
        products: false,
        purchases: false,
        vendors: false,
    });

    // Status options
    const STATUS_OPTIONS = [
        { value: "draft", label: "Draft" },
        { value: "pending", label: "Pending" },
        { value: "approved", label: "Approved" },
        { value: "rejected", label: "Rejected" },
        { value: "completed", label: "Completed" }
    ];

    // Form state
    const [formData, setFormData] = useState({
        vendor_id: "",
        return_date: new Date().toISOString().split('T')[0],
        status: "pending",
        purchase_id: "",
        referenceNo: "",
        return_reason: "",
        notes: "",
        subtotal: 0,
        discount_amount: 0,
        cgst_amount: 0,
        sgst_amount: 0,
        igst_amount: 0,
        total_tax: 0,
        total_amount: 0,
        freightCharges: 0,
        freightType: "fixed",
        pfCharges: 0,
        pfType: "fixed",
        couponCode: "",
        couponType: "",
        couponValue: 0,
        discountOnAll: 0,
        discountType: "percentage",
        roundOff: 0,
        amount_paid: 0,
    });

    // Items state
    const [items, setItems] = useState([
        {
            id: 1,
            product_id: "",
            description: "",
            item_code: "",
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

    // Previous payments state
    const [previousPayments, setPreviousPayments] = useState<any[]>([]);

    // Load data on component mount
    useEffect(() => {
        if (company?.id) {
            loadVendors();
            loadProducts();
            loadPurchases();
        }
    }, [company?.id]);

    useEffect(() => {
        if (!company?.id) return;
        if (editReturnId) {
            prefillFromExistingReturn(editReturnId);
            return;
        }
        if (fromPurchaseInvoiceId) {
            prefillFromPurchaseInvoice(fromPurchaseInvoiceId);
        }
    }, [company?.id, fromPurchaseInvoiceId, editReturnId]);

    useEffect(() => {
        const loadNextReturnNumber = async () => {
            if (!company?.id) return;
            if (isEditMode) {
                setLoadingReturnNumber(false);
                return;
            }
            try {
                setLoadingReturnNumber(true);
                const token = getAuthToken();
                const response = await fetch(
                    `${API_BASE_URL}/companies/${company.id}/next-purchase-return-number`,
                    {
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json',
                        },
                    }
                );
                if (response.ok) {
                    const data = await response.json();
                    setNextReturnNumber(
                        normalizeReturnNumber(data.return_number || generateFallbackReturnNumber())
                    );
                } else {
                    setNextReturnNumber(generateFallbackReturnNumber());
                }
            } catch (error) {
                console.error("Failed to load next return number:", error);
                setNextReturnNumber(generateFallbackReturnNumber());
            } finally {
                setLoadingReturnNumber(false);
            }
        };
        loadNextReturnNumber();
    }, [company?.id, isEditMode]);

    const loadVendors = async () => {
        try {
            setLoading(prev => ({ ...prev, vendors: true }));
            const token = getAuthToken();
            const response = await fetch(
                `${API_BASE_URL}/companies/${company!.id}/vendors?page_size=100`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                }
            );
            if (response.ok) {
                const data = await response.json();
                setVendors(data.vendors || []);
            }
        } catch (error) {
            console.error("Failed to load vendors:", error);
        } finally {
            setLoading(prev => ({ ...prev, vendors: false }));
        }
    };

    const loadProducts = async () => {
        try {
            setLoading(prev => ({ ...prev, products: true }));
            const token = getAuthToken();
            const response = await fetch(
                `${API_BASE_URL}/companies/${company!.id}/products?page_size=100`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                }
            );
            if (response.ok) {
                const data = await response.json();
                setProducts(data.products || []);
            }
        } catch (error) {
            console.error("Failed to load products:", error);
        } finally {
            setLoading(prev => ({ ...prev, products: false }));
        }
    };

    const loadPurchases = async () => {
        try {
            setLoading(prev => ({ ...prev, purchases: true }));
            const token = getAuthToken();
            const response = await fetch(
                `${API_BASE_URL}/companies/${company!.id}/purchases?type=purchase&page_size=100`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                }
            );
            if (response.ok) {
                const data = await response.json();
                setPurchases(data.purchases || data.items || []);
            }
        } catch (error) {
            console.error("Failed to load purchases:", error);
        } finally {
            setLoading(prev => ({ ...prev, purchases: false }));
        }
    };

    const formatDateForInput = (dateValue?: string | null) => {
        if (!dateValue) return new Date().toISOString().split("T")[0];
        const d = new Date(dateValue);
        if (Number.isNaN(d.getTime())) return new Date().toISOString().split("T")[0];
        return d.toISOString().split("T")[0];
    };

    const prefillFromExistingReturn = async (returnId: string) => {
        if (!company?.id) return;
        setPrefillLoading(true);
        setPrefillError("");
        try {
            const purchaseReturn = await purchaseReturnsApi.get(company.id, returnId) as any;
            if (!purchaseReturn) {
                setPrefillError("Purchase return not found");
                return;
            }

            setNextReturnNumber(
                normalizeReturnNumber(purchaseReturn.return_number || generateFallbackReturnNumber())
            );

            setFormData(prev => ({
                ...prev,
                vendor_id: purchaseReturn.vendor_id || prev.vendor_id,
                return_date: formatDateForInput(purchaseReturn.return_date),
                status: purchaseReturn.status || prev.status,
                purchase_id: purchaseReturn.purchase_id || prev.purchase_id,
                referenceNo: purchaseReturn.reference_no || prev.referenceNo,
                return_reason: purchaseReturn.return_reason || prev.return_reason,
                notes: purchaseReturn.notes || prev.notes,
                subtotal: Number(purchaseReturn.subtotal || 0),
                discount_amount: Number(purchaseReturn.discount_amount || 0),
                cgst_amount: Number(purchaseReturn.cgst_amount || 0),
                sgst_amount: Number(purchaseReturn.sgst_amount || 0),
                igst_amount: Number(purchaseReturn.igst_amount || 0),
                total_tax: Number(purchaseReturn.total_tax || 0),
                total_amount: Number(purchaseReturn.total_amount || 0),
                freightCharges: Number(purchaseReturn.freight_charges || 0),
                pfCharges: Number(purchaseReturn.packing_forwarding_charges || 0),
                roundOff: Number(purchaseReturn.round_off || 0),
                amount_paid: Number(purchaseReturn.amount_paid || 0),
            }));

            if (Array.isArray(purchaseReturn.items) && purchaseReturn.items.length > 0) {
                setItems(
                    purchaseReturn.items.map((item: any) => ({
                        id: Date.now() + Math.random(),
                        product_id: item.product_id || "",
                        description: item.description || "",
                        item_code: item.item_code || "",
                        hsn_code: item.hsn_code || "",
                        quantity: Number(item.quantity || 1),
                        unit: item.unit || "unit",
                        unit_price: Number(item.unit_price || 0),
                        discount_percent: Number(item.discount_percent || 0),
                        discount_amount: Number(item.discount_amount || 0),
                        gst_rate: Number(item.gst_rate || 0),
                        cgst_rate: Number(item.cgst_rate || 0),
                        sgst_rate: Number(item.sgst_rate || 0),
                        igst_rate: Number(item.igst_rate || 0),
                        taxable_amount: Number(item.taxable_amount || 0),
                        total_amount: Number(item.total_amount || 0),
                    }))
                );
            }
        } catch (error) {
            console.error("Failed to load purchase return for edit:", error);
            setPrefillError("Failed to load purchase return data");
        } finally {
            setPrefillLoading(false);
        }
    };

    const prefillFromPurchaseInvoice = async (purchaseId: string) => {
        if (!company?.id) return;
        setPrefillLoading(true);
        setPrefillError("");
        try {
            const purchase = await purchasesApi.get(company.id, purchaseId) as any;
            if (!purchase) {
                setPrefillError("Purchase invoice not found");
                return;
            }

            setFormData(prev => ({
                ...prev,
                vendor_id: purchase.vendor_id || prev.vendor_id,
                purchase_id: purchaseId,
                return_date: new Date().toISOString().split("T")[0],
                referenceNo: purchase.reference_no || purchase.purchase_number || prev.referenceNo,
                notes: purchase.notes || prev.notes,
            }));

            if (purchase.items && Array.isArray(purchase.items) && purchase.items.length > 0) {
                setItems(purchase.items.map((item: any) => ({
                    id: Date.now() + Math.random(),
                    product_id: item.product_id || "",
                    description: item.description || "",
                    item_code: item.item_code || "",
                    hsn_code: item.hsn_code || item.hsn || "",
                    quantity: Number(item.quantity || 1),
                    unit: item.unit || "unit",
                    unit_price: Number(item.unit_price ?? item.rate ?? 0),
                    discount_percent: Number(item.discount_percent || 0),
                    discount_amount: Number(item.discount_amount || 0),
                    gst_rate: Number(item.gst_rate || 0),
                    cgst_rate: Number(item.cgst_rate || 0),
                    sgst_rate: Number(item.sgst_rate || 0),
                    igst_rate: Number(item.igst_rate || 0),
                    taxable_amount: Number(item.taxable_amount || 0),
                    total_amount: Number(item.total_amount || 0),
                })));
            }
        } catch (error) {
            console.error("Failed to load purchase invoice for prefill:", error);
            setPrefillError("Failed to load purchase invoice data");
        } finally {
            setPrefillLoading(false);
        }
    };

    const calculateTotals = () => {
        let subtotal = 0;
        let totalTax = 0;
        let cgstTotal = 0;
        let sgstTotal = 0;
        let igstTotal = 0;
        let totalItemDiscount = 0;

        items.forEach(item => {
            const itemTotal = item.quantity * item.unit_price;
            const discount = item.discount_percent > 0 ?
                itemTotal * (item.discount_percent / 100) : 0;
            const taxable = itemTotal - discount;
            const tax = taxable * (item.gst_rate / 100);

            cgstTotal += tax / 2;
            sgstTotal += tax / 2;
            igstTotal += tax;

            subtotal += taxable;
            totalTax += tax;
            totalItemDiscount += discount;
        });

        const freightCharges = formData.freightCharges || 0;
        const pfCharges = formData.pfCharges || 0;
        const couponValue = formData.couponValue || 0;
        const discountOnAll = formData.discountOnAll || 0;

        const discountAllAmount = formData.discountType === 'percentage'
            ? subtotal * (discountOnAll / 100)
            : discountOnAll;

        const totalBeforeTax = subtotal;
        const totalAfterTax = totalBeforeTax + totalTax;
        const totalAfterCharges = totalAfterTax + freightCharges + pfCharges;
        const totalAfterCoupon = totalAfterCharges - couponValue;
        const totalAfterDiscountAll = totalAfterCoupon - discountAllAmount;
        const grandTotal = totalAfterDiscountAll + (formData.roundOff || 0);

        return {
            subtotal: Number(totalBeforeTax.toFixed(2)),
            totalTax: Number(totalTax.toFixed(2)),
            cgstTotal: Number(cgstTotal.toFixed(2)),
            sgstTotal: Number(sgstTotal.toFixed(2)),
            igstTotal: Number(igstTotal.toFixed(2)),
            itemDiscount: Number(totalItemDiscount.toFixed(2)),
            freight: Number(freightCharges.toFixed(2)),
            pf: Number(pfCharges.toFixed(2)),
            couponDiscount: Number(couponValue.toFixed(2)),
            discountAll: Number(discountAllAmount.toFixed(2)),
            roundOff: Number(formData.roundOff || 0),
            grandTotal: Number(grandTotal.toFixed(2)),
        };
    };

    const totals = calculateTotals();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!company?.id) return;
        if (!formData.purchase_id) {
            alert("Please select purchase invoice for this return.");
            return;
        }

        setIsSubmitting(true);
        try {
            const selectedVendor = vendors.find(v => v.id === formData.vendor_id);

            const preparedItems = items.map(item => ({
                product_id: item.product_id || undefined,
                description: item.description || "",
                hsn_code: item.hsn_code || "",
                quantity: Number(item.quantity),
                unit: item.unit || "unit",
                unit_price: Number(item.unit_price),
                item_code: item.item_code || "",
                discount_percent: Number(item.discount_percent || 0),
                discount_amount: Number(item.discount_amount || 0),
                gst_rate: Number(item.gst_rate || 0),
                cgst_rate: Number(item.cgst_rate || 0),
                sgst_rate: Number(item.sgst_rate || 0),
                igst_rate: Number(item.igst_rate || 0),
                taxable_amount: Number(item.taxable_amount || (item.quantity * item.unit_price - item.discount_amount)),
                total_amount: Number(item.total_amount || ((item.quantity * item.unit_price - item.discount_amount) * (1 + (item.gst_rate || 0) / 100))),
            }));

            const returnData = {
                vendor_id: formData.vendor_id,
                return_date: new Date(formData.return_date).toISOString(),
                status: formData.status,
                purchase_id: formData.purchase_id || null,
                created_by_name: (
                    user?.full_name ||
                    user?.name ||
                    `${user?.first_name || ""} ${user?.last_name || ""}`.trim() ||
                    user?.email ||
                    ""
                ).trim() || undefined,
                return_number: normalizeReturnNumber(nextReturnNumber),
                return_reason: formData.return_reason || "",
                reference_no: formData.referenceNo || "",
                notes: formData.notes || "",
                subtotal: Number(totals.subtotal || 0),
                discount_amount: Number(totals.discountAll || 0),
                cgst_amount: Number(totals.cgstTotal || 0),
                sgst_amount: Number(totals.sgstTotal || 0),
                igst_amount: Number(totals.igstTotal || 0),
                total_tax: Number(totals.totalTax || 0),
                total_amount: Number(totals.grandTotal || 0),
                round_off: Number(formData.roundOff || 0),
                freight_charges: Number(formData.freightCharges || 0),
                packing_forwarding_charges: Number(formData.pfCharges || 0),
                coupon_code: formData.couponCode || "",
                coupon_value: Number(formData.couponValue || 0),
                discount_on_all: Number(formData.discountOnAll || 0),
                discount_type: formData.discountType || "percentage",
                amount_paid: Number(formData.amount_paid || 0),
                items: preparedItems,
                ...(selectedVendor ? {
                    vendor_name: selectedVendor.name || "",
                    vendor_gstin: selectedVendor.gstin || selectedVendor.tax_number || "",
                    vendor_phone: selectedVendor.phone || selectedVendor.contact || "",
                } : {}),
                ...(paymentData.amount > 0 ? {
                    payment_amount: Number(paymentData.amount),
                    payment_type: paymentData.paymentType,
                    payment_account: paymentData.account,
                    payment_note: paymentData.paymentNote,
                } : {}),
            };

            console.log("Purchase return data being sent:", JSON.stringify(returnData, null, 2));

            const response = isEditMode && editReturnId
                ? await purchaseReturnsApi.update(company.id, editReturnId, returnData)
                : await purchaseReturnsApi.create(company.id, returnData);
            console.log(`Purchase return ${isEditMode ? "updated" : "created"} successfully:`, response);
            router.push(`/purchase/purchase-returns`);

        } catch (error: any) {
            console.error(`Error ${isEditMode ? "updating" : "creating"} purchase return:`, error);
            if (error.response) {
                console.error("Response error:", error.response.data);
                console.error("Response status:", error.response.status);
            }
            alert(`Failed to ${isEditMode ? "update" : "create"} purchase return: ${error.message || "Unknown error"}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const updateItem = (id: number, field: string, value: any) => {
        setItems(prevItems => {
            return prevItems.map(item => {
                if (item.id === id) {
                    const updated = { ...item, [field]: value };

                    if (field === 'product_id' && value) {
                        const selectedProduct = products.find(p => p.id === value);
                        if (selectedProduct) {
                            updated.description = selectedProduct.name;
                            updated.unit_price = selectedProduct.purchase_price || selectedProduct.unit_price || 0;
                            updated.gst_rate = parseFloat(selectedProduct.gst_rate) || 18;
                            updated.hsn_code = selectedProduct.hsn_code || selectedProduct.hsn;
                        }
                    }

                    const itemTotal = updated.quantity * updated.unit_price;
                    const discount = updated.discount_percent > 0 ?
                        itemTotal * (updated.discount_percent / 100) : 0;
                    const taxable = itemTotal - discount;
                    const tax = taxable * (updated.gst_rate / 100);

                    updated.discount_amount = discount;
                    updated.taxable_amount = taxable;
                    updated.total_amount = taxable + tax;

                    updated.cgst_rate = updated.gst_rate / 2;
                    updated.sgst_rate = updated.gst_rate / 2;
                    updated.igst_rate = updated.gst_rate;

                    return updated;
                }
                return item;
            });
        });
    };

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

        const results = products.filter(p => {
            const productName = p?.name ?
                (typeof p.name === 'string' ? p.name :
                    typeof p.name === 'object' ? (p.name as any).toString() : '') : '';

            const productSku = p?.sku ?
                (typeof p.sku === 'string' ? p.sku :
                    typeof p.sku === 'object' ? (p.sku as any).toString() : '') : '';

            const searchTerm = value.toLowerCase();

            return productName.toLowerCase().includes(searchTerm) ||
                productSku.toLowerCase().includes(searchTerm);
        });

        setSearchResults(results);
    };

    const handleSearchSelect = (product: any) => {
        addItem({
            product_id: product.id,
            description: product.description || "",
            quantity: 1,
            unit_price: product.purchase_price || product.unit_price || 0,
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
                unit_price: 0,
                discount_percent: 0,
                gst_rate: 0,
                total_amount: 0,
                ...prefill,
            },
        ]);
    };

    const removeItem = (id: number) => {
        setItems(items.filter(item => item.id !== id));
    };

    const paymentStatus = formData.amount_paid <= 0 ? "Unpaid" : 
                         formData.amount_paid >= totals.grandTotal ? "Paid" : "Partial";

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
                            <Link href="/purchase/purchase-returns" className="ml-1 text-dark-6 hover:text-primary dark:text-gray-400 dark:hover:text-white md:ml-2">
                                Purchase Returns
                            </Link>
                        </div>
                    </li>
                    <li>
                        <div className="flex items-center">
                            <svg className="h-4 w-4 text-dark-6 dark:text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                            </svg>
                            <span className="ml-1 font-medium text-dark dark:text-white md:ml-2">
                                {isEditMode ? "Edit Purchase Return" : "New Purchase Return"}
                            </span>
                        </div>
                    </li>
                </ol>
            </nav>

            {/* Page Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-dark dark:text-white">Purchase Return – Add / Update Purchase Return</h1>
                <p className="text-dark-6">
                    {isEditMode ? "Update existing purchase return details and items" : "Create new purchase return with vendor details and items"}
                </p>
            </div>

            {(prefillLoading || prefillError) && (
                <div className="mb-6 rounded-lg border border-stroke bg-white p-4 text-sm dark:border-dark-3 dark:bg-gray-dark">
                    {prefillLoading && (
                        <p className="text-dark-6">Loading purchase invoice data...</p>
                    )}
                    {prefillError && <p className="text-red-600">{prefillError}</p>}
                </div>
            )}

            <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                    {/* Left Column - Main Form */}
                    <div className="lg:col-span-3 space-y-6">
                        {/* SECTION 1: Purchase Return Basic Details */}
                        <div className="rounded-lg bg-white p-6 shadow-1 dark:bg-gray-dark">
                            <h2 className="mb-4 text-lg font-semibold text-dark dark:text-white">Purchase Return Basic Details</h2>
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
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
                                        Return No <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={loadingReturnNumber ? "Loading..." : nextReturnNumber}
                                        className="w-full rounded-lg border border-stroke bg-gray-50 px-4 py-2.5 outline-none dark:border-dark-3 dark:bg-dark-2"
                                        readOnly
                                        disabled={loadingReturnNumber}
                                    />
                                </div>

                                <div>
                                    <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                                        Date <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="date"
                                        value={formData.return_date}
                                        onChange={(e) => handleFormChange('return_date', e.target.value)}
                                        className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3"
                                        required
                                    />
                                </div>

                                <div>
                                    <SelectField
                                        label="Status"
                                        name="status"
                                        value={formData.status}
                                        onChange={handleFormChange}
                                        options={STATUS_OPTIONS}
                                        required={true}
                                        placeholder="Select Status"
                                    />
                                </div>

                                <div>
                                    <SelectField
                                        label="Vendor Name"
                                        name="vendor_id"
                                        value={formData.vendor_id}
                                        onChange={handleFormChange}
                                        options={vendors.map(vendor => ({
                                            value: vendor.id,
                                            label: `${vendor.name} ${vendor.email ? `(${vendor.email})` : ''}`
                                        }))}
                                        required={true}
                                        placeholder="Select Vendor"
                                    />
                                </div>

                                {/* <div>
                                    <SelectField
                                        label="Reference Purchase"
                                        name="purchase_id"
                                        value={formData.purchase_id}
                                        onChange={handleFormChange}
                                        options={purchases.map(purchase => ({
                                            value: purchase.id,
                                            label: `${purchase.purchase_number || purchase.invoice_number} - ${purchase.vendor_name || 'Unknown'}`
                                        }))}
                                        placeholder="Select Purchase"
                                    />
                                </div> */}

                                <div>
                                    <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                                        Reference No
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.referenceNo || ""}
                                        onChange={(e) => setFormData({ ...formData, referenceNo: e.target.value })}
                                        className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3"
                                    />
                                </div>

                                <div className="md:col-span-2 lg:col-span-4">
                                    <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                                        Return Reason
                                    </label>
                                    <textarea
                                        value={formData.return_reason || ""}
                                        onChange={(e) => setFormData({ ...formData, return_reason: e.target.value })}
                                        rows={2}
                                        className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3"
                                        placeholder="Enter reason for return"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* SECTION 2: Items Table */}
                        <div className="rounded-lg bg-white p-6 shadow-1 dark:bg-gray-dark">
                            <div className="mb-4 flex items-center justify-between">
                                <h2 className="text-lg font-semibold text-dark dark:text-white">Return Items</h2>
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
                                        placeholder="Search product by name or SKU..."
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
                                            <th className="px-4 py-3 text-left text-sm font-medium text-dark-6">Product</th>
                                            <th className="px-4 py-3 text-left text-sm font-medium text-dark-6">Description</th>
                                            <th className="px-4 py-3 text-left text-sm font-medium text-dark-6">HSN</th>
                                            <th className="px-4 py-3 text-left text-sm font-medium text-dark-6">Quantity</th>
                                            <th className="px-4 py-3 text-left text-sm font-medium text-dark-6">Unit Price</th>
                                            <th className="px-4 py-3 text-left text-sm font-medium text-dark-6">Discount %</th>
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
                                                            if (!product) return;
                                                            setItems(prev =>
                                                                prev.map(i => {
                                                                    if (i.id !== item.id) return i;
                                                                    const unitPrice = product.purchase_price ?? product.unit_price ?? 0;
                                                                    const gstRate = Number(product.gst_rate) || i.gst_rate || 18;
                                                                    const qty = i.quantity || 1;
                                                                    const taxable = qty * unitPrice;
                                                                    const tax = taxable * (gstRate / 100);
                                                                    return {
                                                                        ...i,
                                                                        product_id: product.id,
                                                                        description: product.name,
                                                                        hsn_code: product.hsn_code || product.hsn || "",
                                                                        unit_price: unitPrice,
                                                                        gst_rate: gstRate,
                                                                        discount_amount: 0,
                                                                        taxable_amount: taxable,
                                                                        total_amount: taxable + tax,
                                                                        cgst_rate: gstRate / 2,
                                                                        sgst_rate: gstRate / 2,
                                                                        igst_rate: gstRate,
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
                                                        type="text"
                                                        value={item.hsn_code}
                                                        onChange={(e) => updateItem(item.id, 'hsn_code', e.target.value)}
                                                        className="w-full min-w-[100px] rounded border border-stroke bg-transparent px-3 py-1.5 outline-none focus:border-primary dark:border-dark-3"
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

                        {/* SECTION 3: Charges & Discounts and Total Summary */}
                        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                            {/* Left side - Charges & Discounts */}
                            <div>
                                <div className="rounded-lg bg-white p-6 shadow-1 dark:bg-gray-dark">
                                    <h2 className="mb-4 text-lg font-semibold text-dark dark:text-white">Charges & Discounts</h2>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="mb-2 block text-sm font-medium text-dark dark:text-white">Freight Charges</label>
                                            <div className="flex gap-2">
                                                <input
                                                    type="number"
                                                    value={formData.freightCharges}
                                                    onChange={(e) => setFormData({ ...formData, freightCharges: parseFloat(e.target.value) || 0 })}
                                                    className="flex-1 rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3"
                                                    min="0"
                                                    step="0.01"
                                                />
                                                <select
                                                    value={formData.freightType}
                                                    onChange={(e) => setFormData({ ...formData, freightType: e.target.value })}
                                                    className="w-28 rounded-lg border border-stroke bg-transparent px-2 py-2.5 outline-none focus:border-primary dark:border-dark-3"
                                                >
                                                    <option value="fixed">Fixed</option>
                                                    <option value="tax@0%">Tax@0%</option>
                                                    <option value="tax@5%">Tax@5%</option>
                                                    <option value="tax@12%">Tax@12%</option>
                                                    <option value="tax@18%">Tax@18%</option>
                                                    <option value="tax@28%">Tax@28%</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="mb-2 block text-sm font-medium text-dark dark:text-white">P & F Charges</label>
                                            <div className="flex gap-2">
                                                <input
                                                    type="number"
                                                    value={formData.pfCharges}
                                                    onChange={(e) => setFormData({ ...formData, pfCharges: parseFloat(e.target.value) || 0 })}
                                                    className="flex-1 rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3"
                                                    min="0"
                                                    step="0.01"
                                                />
                                                <select
                                                    value={formData.pfType}
                                                    onChange={(e) => setFormData({ ...formData, pfType: e.target.value })}
                                                    className="w-28 rounded-lg border border-stroke bg-transparent px-2 py-2.5 outline-none focus:border-primary dark:border-dark-3"
                                                >
                                                    <option value="fixed">Fixed</option>
                                                    <option value="tax@0%">Tax@0%</option>
                                                    <option value="tax@5%">Tax@5%</option>
                                                    <option value="tax@12%">Tax@12%</option>
                                                    <option value="tax@18%">Tax@18%</option>
                                                    <option value="tax@28%">Tax@28%</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="mb-2 block text-sm font-medium text-dark dark:text-white">Discount Coupon Code</label>
                                            <input
                                                type="text"
                                                value={formData.couponCode}
                                                onChange={(e) => setFormData({ ...formData, couponCode: e.target.value })}
                                                className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3"
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="mb-2 block text-sm font-medium text-dark dark:text-white">Coupon Value</label>
                                                <input
                                                    type="number"
                                                    value={formData.couponValue}
                                                    onChange={(e) => setFormData({ ...formData, couponValue: parseFloat(e.target.value) })}
                                                    className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3"
                                                    min="0"
                                                />
                                            </div>
                                            <div>
                                                <label className="mb-2 block text-sm font-medium text-dark dark:text-white">Discount on All</label>
                                                <div className="flex gap-2">
                                                    <input
                                                        type="number"
                                                        value={formData.discountOnAll}
                                                        onChange={(e) => setFormData({ ...formData, discountOnAll: parseFloat(e.target.value) })}
                                                        className="flex-1 rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3"
                                                        min="0"
                                                    />
                                                    <select
                                                        value={formData.discountType}
                                                        onChange={(e) => setFormData({ ...formData, discountType: e.target.value })}
                                                        className="w-20 rounded-lg border border-stroke bg-transparent px-2 py-2.5 outline-none focus:border-primary dark:border-dark-3"
                                                    >
                                                        <option value="percentage">%</option>
                                                        <option value="fixed">Fixed</option>
                                                    </select>
                                                </div>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="mb-2 block text-sm font-medium text-dark dark:text-white">Notes</label>
                                            <textarea
                                                value={formData.notes || ""}
                                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                                rows={3}
                                                className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3"
                                                placeholder="Enter any additional notes"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Right side - Total Summary */}
                            <div>
                                <div className="rounded-lg bg-white p-6 shadow-1 dark:bg-gray-dark">
                                    <h2 className="mb-4 text-lg font-semibold text-dark dark:text-white">Total Summary</h2>
                                    <div className="space-y-3">
                                        <div className="flex justify-between">
                                            <span className="text-dark-6">Subtotal</span>
                                            <span className="font-medium text-dark dark:text-white">₹{totals?.subtotal?.toLocaleString('en-IN') || '0.00'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-dark-6">CGST</span>
                                            <span className="font-medium text-dark dark:text-white">₹{totals.cgstTotal.toLocaleString('en-IN')}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-dark-6">SGST</span>
                                            <span className="font-medium text-dark dark:text-white">₹{totals.sgstTotal.toLocaleString('en-IN')}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-dark-6">IGST</span>
                                            <span className="font-medium text-dark dark:text-white">₹{totals.igstTotal.toLocaleString('en-IN')}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-dark-6">Total Tax</span>
                                            <span className="font-medium text-dark dark:text-white">₹{totals.totalTax.toLocaleString('en-IN')}</span>
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
                                            <span className="text-dark-6">Coupon Discount</span>
                                            <span className="font-medium text-red-600">-₹{totals.couponDiscount.toLocaleString('en-IN')}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-dark-6">Discount on All</span>
                                            <span className="font-medium text-red-600">-₹{totals.discountAll.toLocaleString('en-IN')}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-dark-6">Round Off</span>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const currentValue = Math.abs(formData.roundOff || 0);
                                                        setFormData(prev => ({
                                                            ...prev,
                                                            roundOff: -currentValue
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
                                                        value={Math.abs(formData.roundOff || 0)}
                                                        onChange={(e) => {
                                                            const inputValue = parseFloat(e.target.value) || 0;
                                                            const currentSign = formData.roundOff >= 0 ? 1 : -1;
                                                            setFormData(prev => ({
                                                                ...prev,
                                                                roundOff: currentSign * inputValue
                                                            }));
                                                        }}
                                                        className="w-32 px-10 py-2 text-center border border-stroke dark:border-dark-3 rounded-lg bg-transparent outline-none focus:border-primary"
                                                        step="0.01"
                                                        min="0"
                                                    />
                                                    <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 pointer-events-none">
                                                        {formData.roundOff >= 0 ? '+' : '-'}
                                                    </div>
                                                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none">
                                                        ₹
                                                    </div>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const currentValue = Math.abs(formData.roundOff || 0);
                                                        setFormData(prev => ({
                                                            ...prev,
                                                            roundOff: currentValue
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

                        {/* SECTION 4: Payment Information Box */}
                        <div className="rounded-lg bg-white p-6 shadow-1 dark:bg-gray-dark">
                            <h2 className="mb-4 text-lg font-semibold text-dark dark:text-white">Payment Information</h2>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                                        placeholder="Enter amount"
                                        min="0"
                                        step="0.01"
                                        className="w-full rounded-lg border border-stroke bg-white px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3 dark:bg-gray-dark"
                                    />
                                </div>

                                <div>
                                    <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                                        Payment Type
                                    </label>
                                    <SelectField
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
                                            { value: "bank", label: "Bank" }
                                        ]}
                                        placeholder="- Select -"
                                        label=""
                                    />
                                </div>

                                <div>
                                    <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                                        Account
                                    </label>
                                    <SelectField
                                        name="account"
                                        value={paymentData.account}
                                        onChange={(name, value) => setPaymentData(prev => ({
                                            ...prev,
                                            [name]: value
                                        }))}
                                        options={[
                                            { value: "", label: "- Select Account -" },
                                            { value: "icici_bank", label: "ICICI Bank" },
                                            { value: "idfc_bank", label: "IDFC First Bank" },
                                            { value: "hdfc_bank", label: "HDFC Bank" },
                                            { value: "sbi", label: "State Bank of India" }
                                        ]}
                                        placeholder="- Select Account -"
                                        label=""
                                    />
                                </div>

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

                                <div className="md:col-span-4">
                                    <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                                        Amount Paid
                                    </label>
                                    <input
                                        type="number"
                                        value={formData.amount_paid}
                                        onChange={(e) => setFormData({ ...formData, amount_paid: parseFloat(e.target.value) || 0 })}
                                        placeholder="Enter amount paid"
                                        min="0"
                                        step="0.01"
                                        className="w-full rounded-lg border border-stroke bg-white px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3 dark:bg-gray-dark"
                                    />
                                    <p className="mt-2 text-sm text-dark-6">
                                        Payment Status: <span className="font-medium text-dark dark:text-white">{paymentStatus}</span>
                                    </p>
                                </div>
                            </div>

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
                                                    {previousPayments.map((payment, index) => (
                                                        <tr key={payment.id} className="border-b border-stroke dark:border-dark-3">
                                                            <td className="px-4 py-3 text-sm">{index + 1}</td>
                                                            <td className="px-4 py-3 text-sm">{payment.date}</td>
                                                            <td className="px-4 py-3 text-sm">{payment.type}</td>
                                                            <td className="px-4 py-3 text-sm">{payment.note}</td>
                                                            <td className="px-4 py-3 text-sm font-medium">₹{payment.amount}</td>
                                                            <td className="px-4 py-3 text-sm">
                                                                <button className="text-blue-600 hover:underline">View</button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
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
                                    {isSubmitting ? "Saving..." : isEditMode ? "Update Purchase Return" : "Save Purchase Return"}
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