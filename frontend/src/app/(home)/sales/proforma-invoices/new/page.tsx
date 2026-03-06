"use client";

import { useState, useEffect,useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import { customersApi, productsApi, proformaInvoicesApi, ordersApi } from "@/services/api";
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
                menu: (base: any) => ({
                    ...base,
                    minWidth: "420px",
                    width: "420px",
                }),
            }}
        />
    );
}

const INDIAN_STATES = [
    { code: "01", name: "Jammu & Kashmir" },
    { code: "02", name: "Himachal Pradesh" },
    { code: "03", name: "Punjab" },
    { code: "04", name: "Chandigarh" },
    { code: "05", name: "Uttarakhand" },
    { code: "06", name: "Haryana" },
    { code: "07", name: "Delhi" },
    { code: "08", name: "Rajasthan" },
    { code: "09", name: "Uttar Pradesh" },
    { code: "10", name: "Bihar" },
    { code: "11", name: "Sikkim" },
    { code: "12", name: "Arunachal Pradesh" },
    { code: "13", name: "Nagaland" },
    { code: "14", name: "Manipur" },
    { code: "15", name: "Mizoram" },
    { code: "16", name: "Tripura" },
    { code: "17", name: "Meghalaya" },
    { code: "18", name: "Assam" },
    { code: "19", name: "West Bengal" },
    { code: "20", name: "Jharkhand" },
    { code: "21", name: "Odisha" },
    { code: "22", name: "Chhattisgarh" },
    { code: "23", name: "Madhya Pradesh" },
    { code: "24", name: "Gujarat" },
    { code: "25", name: "Daman & Diu" },
    { code: "26", name: "Dadra & Nagar Haveli" },
    { code: "27", name: "Maharashtra" },
    { code: "28", name: "Andhra Pradesh (Old)" },
    { code: "29", name: "Karnataka" },
    { code: "30", name: "Goa" },
    { code: "31", name: "Lakshadweep" },
    { code: "32", name: "Kerala" },
    { code: "33", name: "Tamil Nadu" },
    { code: "34", name: "Puducherry" },
    { code: "35", name: "Andaman & Nicobar Islands" },
    { code: "36", name: "Telangana" },
    { code: "37", name: "Andhra Pradesh" },
    { code: "38", name: "Ladakh" }
];

export default function AddProformaInvoicePage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const editId = searchParams?.get("editId");
    const fromQuotationId = searchParams?.get("fromQuotation");
    const fromSalesOrderId = searchParams?.get("fromSalesOrder");
    const isEditMode = Boolean(editId);
    const { company, user } = useAuth();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [prefillLoading, setPrefillLoading] = useState(false);

    const normalizeStateCode = (value: any) => {
        const text = String(value ?? "").trim();
        const match = text.match(/\d{2}/);
        return match ? match[0] : text;
    };

    const isIntraStateSupply = (placeOfSupply: any) =>
        normalizeStateCode(placeOfSupply) === normalizeStateCode(company?.state_code);
    const [showTerms, setShowTerms] = useState(true);
    const [showOtherFields, setShowOtherFields] = useState(false);
    const [proformaCode, setProformaCode] = useState("");
    const [loadingProformaCode, setLoadingProformaCode] = useState(false);
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
        freight_type: "tax@18%",
        pf_charges: 0,
        pf_type: "tax@18%",

        // GST details
        place_of_supply: "",
        
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
        if (!company?.id || isEditMode) return;
        loadNextProformaCode();
    }, [company?.id, isEditMode, formData.proforma_date]);

    const getDefaultProformaCode = () => {
        const baseDate = formData.proforma_date ? new Date(`${formData.proforma_date}T00:00:00`) : new Date();
        const startYear = baseDate.getMonth() >= 3 ? baseDate.getFullYear() : baseDate.getFullYear() - 1;
        const endYear = startYear + 1;
        return `PF/${startYear}-${endYear}/0001`;
    };

    const loadNextProformaCode = async () => {
        if (!company?.id) return;
        try {
            setLoadingProformaCode(true);
            const response: any = await proformaInvoicesApi.nextNumber(company.id, formData.proforma_date || undefined);
            setProformaCode(response?.invoice_number || getDefaultProformaCode());
        } catch (error) {
            console.error("Failed to load next proforma code:", error);
            setProformaCode(getDefaultProformaCode());
        } finally {
            setLoadingProformaCode(false);
        }
    };

    const proformaCodeParts = useMemo(() => {
        const fallback = getDefaultProformaCode();
        const code = (proformaCode || fallback).trim();
        const match = code.match(/^(.*\/)(\d+)$/);
        if (!match) return { prefix: code, sequence: "" };
        return { prefix: match[1], sequence: match[2] };
    }, [proformaCode]);

    useEffect(() => {
        const loadExisting = async () => {
            if (!company?.id || !editId) return;
            try {
                const existing = await proformaInvoicesApi.get(company.id, editId);
                setProformaCode(existing.invoice_number || existing.proforma_number || "");
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
                    freight_type: existing.freight_type || prev.freight_type,
                    pf_charges: Number(existing.pf_charges || 0),
                    pf_type: existing.pf_type || prev.pf_type,
                    place_of_supply: existing.place_of_supply || prev.place_of_supply,
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

    useEffect(() => {
        if (!company?.id || isEditMode) return;
        if (fromQuotationId) {
            prefillFromQuotation(fromQuotationId);
        } else if (fromSalesOrderId) {
            prefillFromSalesOrder(fromSalesOrderId);
        }
    }, [company?.id, fromQuotationId, fromSalesOrderId]);

    const prefillFromQuotation = async (quotationId: string) => {
        if (!company?.id) return;
        const token = localStorage.getItem("employee_token") || localStorage.getItem("access_token");
        if (!token) return;

        setPrefillLoading(true);
        try {
            const response = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/companies/${company.id}/quotations/${quotationId}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            if (!response.ok) throw new Error(`Failed to fetch quotation (${response.status})`);
            const quotation = await response.json();

            setFormData(prev => ({
                ...prev,
                customer_id: quotation.customer_id || prev.customer_id,
                contact_id: quotation.contact_person_id || quotation.contact_person || prev.contact_id,
                sales_person_id: quotation.sales_person_id || prev.sales_person_id,
                reference_no: quotation.reference_no || quotation.quotation_number || prev.reference_no,
                reference_date: quotation.quotation_date ? quotation.quotation_date.split("T")[0] : prev.reference_date,
                notes: quotation.notes || prev.notes,
                terms: quotation.terms || prev.terms,
                freight_charges: Number(quotation.freight_charges ?? prev.freight_charges) || 0,
                freight_type: quotation.freight_type || prev.freight_type,
                pf_charges: Number(quotation.pf_charges ?? prev.pf_charges) || 0,
                pf_type: quotation.pf_type || prev.pf_type,
                place_of_supply: quotation.place_of_supply || prev.place_of_supply,
            }));

            if (quotation.items && Array.isArray(quotation.items) && quotation.items.length > 0) {
                setItems(quotation.items.map((item: any, index: number) => {
                    const unitPrice = Number(item.unit_price ?? item.rate ?? 0);
                    const quantity = Number(item.quantity ?? 1);
                    const discountPercent = Number(item.discount_percent ?? 0);
                    const gstRate = Number(item.gst_rate ?? 18);
                    const itemTotal = quantity * unitPrice;
                    const discountAmount = discountPercent > 0 ? itemTotal * (discountPercent / 100) : 0;
                    const taxable = itemTotal - discountAmount;
                    const tax = taxable * (gstRate / 100);

                    return {
                        id: Date.now() + index,
                        product_id: item.product_id || "",
                        item_code: item.item_code || item.hsn_code || "",
                        description: item.description || "",
                        quantity,
                        unit: item.unit || "unit",
                        unit_price: unitPrice,
                        discount_percent: discountPercent,
                        discount_amount: discountAmount,
                        gst_rate: gstRate,
                        cgst_rate: Number(item.cgst_rate || gstRate / 2),
                        sgst_rate: Number(item.sgst_rate || gstRate / 2),
                        igst_rate: Number(item.igst_rate || 0),
                        taxable_amount: taxable,
                        total_amount: taxable + tax,
                    };
                }));
            }

            if (quotation.customer_id) {
                fetchContactPersons(quotation.customer_id);
            }
        } catch (error) {
            console.error("Failed to prefill from quotation:", error);
        } finally {
            setPrefillLoading(false);
        }
    };

    const prefillFromSalesOrder = async (orderId: string) => {
        if (!company?.id) return;
        setPrefillLoading(true);
        try {
            const order = await ordersApi.getSalesOrder(company.id, orderId) as any;
            if (!order) return;

            setFormData(prev => ({
                ...prev,
                customer_id: order.customer_id || prev.customer_id,
                contact_id: order.contact_person_id || order.contact_person || prev.contact_id,
                sales_person_id: order.sales_person_id || prev.sales_person_id,
                reference_no: order.reference_no || order.order_number || prev.reference_no,
                reference_date: order.order_date ? order.order_date.split("T")[0] : prev.reference_date,
                due_date: order.expire_date ? order.expire_date.split("T")[0] : prev.due_date,
                notes: order.notes || prev.notes,
                terms: order.terms || prev.terms,
                freight_charges: Number(order.freight_charges ?? prev.freight_charges) || 0,
                freight_type: order.freight_type || prev.freight_type,
                pf_charges: Number(order.p_and_f_charges ?? order.pf_charges ?? prev.pf_charges) || 0,
                pf_type: order.pf_type || prev.pf_type,
                place_of_supply: order.place_of_supply || prev.place_of_supply,
                payment_terms: order.payment_terms || prev.payment_terms,
                delivery_note: order.delivery_note || prev.delivery_note,
                supplier_ref: order.supplier_ref || prev.supplier_ref,
                other_references: order.other_references || prev.other_references,
                buyer_order_no: order.buyer_order_no || prev.buyer_order_no,
                buyer_order_date: order.buyer_order_date ? order.buyer_order_date.split("T")[0] : prev.buyer_order_date,
                despatch_doc_no: order.despatch_doc_no || prev.despatch_doc_no,
                delivery_note_date: order.delivery_note_date ? order.delivery_note_date.split("T")[0] : prev.delivery_note_date,
                despatched_through: order.despatched_through || prev.despatched_through,
                destination: order.destination || prev.destination,
                terms_of_delivery: order.terms_of_delivery || prev.terms_of_delivery,
            }));

            if (order.items && Array.isArray(order.items) && order.items.length > 0) {
                setItems(order.items.map((item: any, index: number) => {
                    const unitPrice = Number(item.unit_price ?? item.rate ?? 0);
                    const quantity = Number(item.quantity ?? 1);
                    const discountPercent = Number(item.discount_percent ?? 0);
                    const gstRate = Number(item.gst_rate ?? 18);
                    const itemTotal = quantity * unitPrice;
                    const discountAmount = discountPercent > 0 ? itemTotal * (discountPercent / 100) : 0;
                    const taxable = itemTotal - discountAmount;
                    const tax = taxable * (gstRate / 100);

                    return {
                        id: Date.now() + index,
                        product_id: item.product_id || "",
                        item_code: item.item_code || item.hsn_code || "",
                        description: item.description || "",
                        quantity,
                        unit: item.unit || "unit",
                        unit_price: unitPrice,
                        discount_percent: discountPercent,
                        discount_amount: discountAmount,
                        gst_rate: gstRate,
                        cgst_rate: Number(item.cgst_rate || gstRate / 2),
                        sgst_rate: Number(item.sgst_rate || gstRate / 2),
                        igst_rate: Number(item.igst_rate || 0),
                        taxable_amount: taxable,
                        total_amount: taxable + tax,
                    };
                }));
            }

            if (order.customer_id) {
                fetchContactPersons(order.customer_id);
            }
        } catch (error) {
            console.error("Failed to prefill from sales order:", error);
        } finally {
            setPrefillLoading(false);
        }
    };

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
                const token = localStorage.getItem("employee_token") || localStorage.getItem("access_token");
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
        const token = localStorage.getItem("employee_token") || localStorage.getItem("access_token");
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
        const formattedSalesmen = salesEngineers.map((engineer: any) => ({
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
                (typeof emp.designation === 'string' ? emp.designation : (emp.designation as any)?.name || '').toLowerCase().includes('sales') ||
                (emp.employee_type || '').toLowerCase().includes('sales')
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
            const token = localStorage.getItem("employee_token") || localStorage.getItem("access_token");
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
        let cgstTotal = 0;
        let sgstTotal = 0;
        let igstTotal = 0;

        items.forEach(item => {
            const itemTotal = item.quantity * item.unit_price;
            const discount = item.discount_percent > 0 ?
                itemTotal * (item.discount_percent / 100) : 0;
            const taxable = itemTotal - discount;

            const itemCgstRate = Number(item.cgst_rate || 0);
            const itemSgstRate = Number(item.sgst_rate || 0);
            const itemIgstRate = Number(item.igst_rate || 0);
            const hasExplicitSplitRates = (itemCgstRate + itemSgstRate + itemIgstRate) > 0;

            let itemCgst = 0;
            let itemSgst = 0;
            let itemIgst = 0;

            if (hasExplicitSplitRates) {
                itemCgst = taxable * (itemCgstRate / 100);
                itemSgst = taxable * (itemSgstRate / 100);
                itemIgst = taxable * (itemIgstRate / 100);
            } else {
                const fallbackTax = taxable * (Number(item.gst_rate || 0) / 100);
                if (isIntraStateSupply(formData.place_of_supply)) {
                    itemCgst = fallbackTax / 2;
                    itemSgst = fallbackTax / 2;
                } else {
                    itemIgst = fallbackTax;
                }
            }

            const tax = itemCgst + itemSgst + itemIgst;
            cgstTotal += itemCgst;
            sgstTotal += itemSgst;
            igstTotal += itemIgst;

            subtotal += taxable;
            totalTax += tax;
        });

        const getTaxRateFromType = (taxType: string) => {
            if (!taxType || taxType === "fixed") return 0;
            const match = String(taxType).match(/tax@(\d+(?:\.\d+)?)%/i);
            return match ? Number(match[1]) : 0;
        };

        const freightBase = Number(formData.freight_charges || 0);
        const pfBase = Number(formData.pf_charges || 0);
        const freightTax = freightBase * (getTaxRateFromType(formData.freight_type || "fixed") / 100);
        const pfTax = pfBase * (getTaxRateFromType(formData.pf_type || "fixed") / 100);

        const itemTax = totalTax;
        totalTax = itemTax + freightTax + pfTax;

        let roundOffAmount = 0;
        if (roundOff.type === "plus") {
            roundOffAmount = roundOff.amount;
        } else if (roundOff.type === "minus") {
            roundOffAmount = -roundOff.amount;
        }

        const totalBeforeRoundOff = subtotal + totalTax + freightBase + pfBase;
        const total = totalBeforeRoundOff + roundOffAmount;

        return {
            subtotal: Number(subtotal.toFixed(2)),
            totalTax: Number(totalTax.toFixed(2)),
            cgstTotal: Number(cgstTotal.toFixed(2)),
            sgstTotal: Number(sgstTotal.toFixed(2)),
            igstTotal: Number(igstTotal.toFixed(2)),
            itemTax: Number(itemTax.toFixed(2)),
            freightTax: Number(freightTax.toFixed(2)),
            pfTax: Number(pfTax.toFixed(2)),
            freightAmount: Number(freightBase.toFixed(2)),
            pfAmount: Number(pfBase.toFixed(2)),
            roundOffAmount: Number(roundOffAmount.toFixed(2)),
            totalBeforeRoundOff: Number(totalBeforeRoundOff.toFixed(2)),
            total: Number(total.toFixed(2)),
        };
    };

    const totals = calculateTotals();

const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company?.id) return;

    const normalizedCustomerId = String(formData.customer_id || "").trim();
    const normalizedContactId = String(formData.contact_id || "").trim();
    const normalizedSalesPersonId = String(formData.sales_person_id || "").trim();
    const normalizedBankAccountId = String(formData.bank_account_id || "").trim();

    const validCustomerId = customers.some((c: any) => String(c.id) === normalizedCustomerId)
        ? normalizedCustomerId
        : "";
    const validContactId = contactPersons.some((c: any) => String(c.id) === normalizedContactId)
        ? normalizedContactId
        : "";
    const validSalesPersonId = salesmen.some((s: any) => String(s.id) === normalizedSalesPersonId)
        ? normalizedSalesPersonId
        : "";
    const validBankAccountId = bankAccounts.some((b: any) => String(b.id) === normalizedBankAccountId)
        ? normalizedBankAccountId
        : "";
    if (!validCustomerId) {
        alert("Please select a customer");
        return;
    }

    setIsSubmitting(true);
    try {
        // Prepare proforma invoice data
        const proformaData = {
            customer_id: validCustomerId,
            proforma_date: formData.proforma_date + "T00:00:00Z",
            due_date: formData.due_date ? formData.due_date + "T00:00:00Z" : undefined,
            reference_no: formData.reference_no,
            reference_date: formData.reference_date ? formData.reference_date + "T00:00:00Z" : undefined,
            sales_person_id: validSalesPersonId || undefined,
            contact_id: validContactId || undefined,
            bank_account_id: validBankAccountId || undefined,
            notes: formData.notes,
            terms: formData.terms,
            freight_charges: formData.freight_charges,
            freight_type: formData.freight_type,
            pf_charges: formData.pf_charges,
            pf_type: formData.pf_type,
            place_of_supply: formData.place_of_supply || company?.state_code || "",
            place_of_supply_name: INDIAN_STATES.find(s => s.code === formData.place_of_supply)?.name || company?.state || "",
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
            payment_terms: formData.payment_terms,
            company_id: company!.id,
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

                if (field === 'product_id' && value) {
                    const selectedProduct = products.find(p => p.id === value);
                    if (selectedProduct) {
                        updated.description = selectedProduct.description || selectedProduct.name;
                        updated.unit_price = selectedProduct.unit_price || 0;
                        updated.gst_rate = parseFloat(selectedProduct.gst_rate) || 18;
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

                if (isIntraStateSupply(formData.place_of_supply)) {
                    updated.cgst_rate = updated.gst_rate / 2;
                    updated.sgst_rate = updated.gst_rate / 2;
                    updated.igst_rate = 0;
                } else {
                    updated.cgst_rate = 0;
                    updated.sgst_rate = 0;
                    updated.igst_rate = updated.gst_rate;
                }

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

    if (field === 'place_of_supply') {
        setItems(prevItems => prevItems.map(item => {
            const updated = { ...item };
            if (isIntraStateSupply(value)) {
                updated.cgst_rate = updated.gst_rate / 2;
                updated.sgst_rate = updated.gst_rate / 2;
                updated.igst_rate = 0;
            } else {
                updated.cgst_rate = 0;
                updated.sgst_rate = 0;
                updated.igst_rate = updated.gst_rate;
            }
            return updated;
        }));
    }

    if (field === 'customer_id' && value) {
        const selectedCustomer = customers.find(c => c.id === value);
        if (selectedCustomer) {
            const customerState =
                selectedCustomer.billing_state_code ||
                selectedCustomer.state_code ||
                company?.state_code || "";
            setFormData(prev => ({
                ...prev,
                contact_id: "",
                place_of_supply: customerState,
            }));
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
        <div className="w-full bg-gray-50 dark:bg-gray-900">
            <div className="border-b border-gray-200 bg-white px-4 py-4 dark:border-gray-700 dark:bg-gray-800 sm:px-6">
                <div className="flex items-start gap-3">
                    <Link
                        href="/sales/proforma-invoices"
                        className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-white transition hover:bg-primary/90 sm:h-10 sm:w-10"
                    >
                        <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                            {isEditMode ? "Edit Proforma Invoice" : "Create Proforma Invoice"}
                        </h1>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            {isEditMode ? "Update proforma invoice details and items" : "Create new proforma invoice with customer details and items"}
                        </p>
                    </div>
                </div>
            </div>

            <div className="w-full p-4 sm:p-6">

            <form data-ui="sf-form" onSubmit={handleSubmit}>
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
                                            value={loadingProformaCode && !isEditMode ? "Loading..." : proformaCodeParts.prefix}
                                            className="flex-1 rounded-lg border border-stroke bg-gray-50 px-4 py-2.5 outline-none dark:border-dark-3 dark:bg-dark-2"
                                            readOnly
                                        />
                                        <input
                                            type="text"
                                            value={loadingProformaCode && !isEditMode ? "" : proformaCodeParts.sequence}
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
                                        label="Place of Supply (State)"
                                        name="place_of_supply"
                                        value={formData.place_of_supply}
                                        onChange={handleFormChange}
                                        options={INDIAN_STATES.map(state => ({
                                            value: state.code,
                                            label: `${state.name} (${state.code})`
                                        }))}
                                        placeholder="Select State"
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
                            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <h2 className="text-lg font-semibold text-dark dark:text-white">Proforma Items</h2>
                                <div className="flex items-center gap-2">
                                    <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                                        Items: {items.length}
                                    </span>
                                    <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700 dark:bg-blue-900/20 dark:text-blue-300">
                                        Total Qty: {items.reduce((sum, item) => sum + Number(item.quantity || 0), 0).toFixed(2)}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => addItem()}
                                        className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-opacity-90"
                                    >
                                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                        </svg>
                                        Add Item
                                    </button>
                                </div>
                            </div>
                            <div className="overflow-x-auto pb-2">
                                <table className="w-full min-w-[1320px] border-collapse">
                                    <thead>
                                        <tr className="border-b border-stroke dark:border-dark-3">
                                            <th className="w-[60px] min-w-[60px] px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-dark-6">#</th>
                                            <th className="w-[340px] min-w-[340px] px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-dark-6">Item Name</th>
                                            <th className="w-[260px] min-w-[260px] px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-dark-6">Description</th>
                                            <th className="w-[100px] min-w-[100px] px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-dark-6">Qty</th>
                                            <th className="w-[110px] min-w-[110px] px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-dark-6">Unit</th>
                                            <th className="w-[120px] min-w-[120px] px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-dark-6">Rate</th>
                                            <th className="w-[120px] min-w-[120px] px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-dark-6">Discount %</th>
                                            <th className="w-[110px] min-w-[110px] px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-dark-6">GST %</th>
                                            <th className="w-[140px] min-w-[140px] px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-dark-6">Amount</th>
                                            <th className="w-[80px] min-w-[80px] px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-dark-6">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-stroke dark:divide-dark-3">
                                        {items.map((item, index) => (
                                            <tr key={item.id} className="hover:bg-gray-50/60 dark:hover:bg-gray-800/50">
                                                <td className="px-3 py-3 text-sm text-dark dark:text-white">{index + 1}</td>
                                                <td className="w-[340px] min-w-[340px] px-3 py-3">
                                                    <div className="space-y-2">
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
                                                                            description: product.description || product.name,
                                                                            unit_price: unitPrice,
                                                                            gst_rate: gstRate,
                                                                            discount_amount: 0,
                                                                            taxable_amount: taxable,
                                                                            total_amount: taxable + tax,
                                                                            ...(isIntraStateSupply(formData.place_of_supply) ? {
                                                                                cgst_rate: gstRate / 2,
                                                                                sgst_rate: gstRate / 2,
                                                                                igst_rate: 0,
                                                                            } : {
                                                                                cgst_rate: 0,
                                                                                sgst_rate: 0,
                                                                                igst_rate: gstRate,
                                                                            }),
                                                                        };
                                                                    })
                                                                );
                                                            }}
                                                        />
                                                        <input
                                                            type="text"
                                                            value={item.item_code}
                                                            onChange={(e) => updateItem(item.id, "item_code", e.target.value)}
                                                            className="w-full rounded border border-stroke bg-transparent px-3 py-1.5 text-xs outline-none focus:border-primary dark:border-dark-3"
                                                            placeholder="Item Code"
                                                        />
                                                    </div>
                                                </td>
                                                <td className="w-[260px] min-w-[260px] px-3 py-3">
                                                    <input
                                                        type="text"
                                                        value={item.description}
                                                        onChange={(e) => updateItem(item.id, "description", e.target.value)}
                                                        className="w-full rounded border border-stroke bg-transparent px-3 py-1.5 text-sm outline-none focus:border-primary dark:border-dark-3"
                                                        placeholder="Description"
                                                    />
                                                </td>
                                                <td className="px-3 py-3">
                                                    <input
                                                        type="number"
                                                        value={item.quantity}
                                                        onChange={(e) => updateItem(item.id, "quantity", parseFloat(e.target.value))}
                                                        className="w-full min-w-[88px] rounded border border-stroke bg-transparent px-3 py-1.5 text-sm outline-none focus:border-primary dark:border-dark-3"
                                                        min="1"
                                                    />
                                                </td>
                                                <td className="px-3 py-3">
                                                    <input
                                                        type="text"
                                                        value={item.unit}
                                                        onChange={(e) => updateItem(item.id, "unit", e.target.value)}
                                                        className="w-full min-w-[96px] rounded border border-stroke bg-transparent px-3 py-1.5 text-sm outline-none focus:border-primary dark:border-dark-3"
                                                        placeholder="Unit"
                                                    />
                                                </td>
                                                <td className="px-3 py-3">
                                                    <input
                                                        type="number"
                                                        value={item.unit_price}
                                                        onChange={(e) => updateItem(item.id, "unit_price", parseFloat(e.target.value))}
                                                        className="w-full min-w-[110px] rounded border border-stroke bg-transparent px-3 py-1.5 text-sm outline-none focus:border-primary dark:border-dark-3"
                                                        min="0"
                                                        step="0.01"
                                                    />
                                                </td>
                                                <td className="px-3 py-3">
                                                    <div className="flex items-center gap-1">
                                                        <input
                                                            type="number"
                                                            value={item.discount_percent}
                                                            onChange={(e) => updateItem(item.id, "discount_percent", parseFloat(e.target.value))}
                                                            className="w-full min-w-[82px] rounded border border-stroke bg-transparent px-2 py-1.5 text-sm outline-none focus:border-primary dark:border-dark-3"
                                                            min="0"
                                                            step="0.01"
                                                        />
                                                        <span className="text-xs text-dark-6">%</span>
                                                    </div>
                                                </td>
                                                <td className="px-3 py-3">
                                                    <select
                                                        value={item.gst_rate}
                                                        onChange={(e) => updateItem(item.id, "gst_rate", parseFloat(e.target.value))}
                                                        className="w-20 rounded border border-stroke bg-transparent px-2 py-1.5 text-sm outline-none focus:border-primary dark:border-dark-3"
                                                    >
                                                        <option value="0">0%</option>
                                                        <option value="5">5%</option>
                                                        <option value="12">12%</option>
                                                        <option value="18">18%</option>
                                                        <option value="28">28%</option>
                                                    </select>
                                                </td>
                                                <td className="px-3 py-3 text-sm font-semibold text-dark dark:text-white">
                                                    INR {(Number(item.total_amount || 0)).toFixed(2)}
                                                </td>
                                                <td className="px-3 py-3">
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
                                            <div className="flex min-w-0 items-center gap-2">
                                                <input
                                                    type="number"
                                                    value={formData.freight_charges}
                                                    onChange={(e) => handleFormChange('freight_charges', parseFloat(e.target.value) || 0)}
                                                    className="min-w-0 w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3"
                                                    min="0"
                                                    step="0.01"
                                                />
                                                <select
                                                    value={formData.freight_type || "tax@18%"}
                                                    onChange={(e) => handleFormChange('freight_type', e.target.value)}
                                                    className="w-28 shrink-0 rounded-lg border border-stroke bg-transparent px-2 py-2.5 outline-none focus:border-primary dark:border-dark-3"
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
                                            <div className="flex min-w-0 items-center gap-2">
                                                <input
                                                    type="number"
                                                    value={formData.pf_charges}
                                                    onChange={(e) => handleFormChange('pf_charges', parseFloat(e.target.value) || 0)}
                                                    className="min-w-0 w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3"
                                                    min="0"
                                                    step="0.01"
                                                />
                                                <select
                                                    value={formData.pf_type || "tax@18%"}
                                                    onChange={(e) => handleFormChange('pf_type', e.target.value)}
                                                    className="w-28 shrink-0 rounded-lg border border-stroke bg-transparent px-2 py-2.5 outline-none focus:border-primary dark:border-dark-3"
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
                                        <div className="rounded-lg border border-stroke/80 p-3 dark:border-dark-3/80">
                                            <div className="mb-2 flex items-center justify-between">
                                                <span className="text-dark-6">Round Off</span>
                                                <span
                                                    className={`rounded-md px-2 py-1 text-sm font-semibold ${
                                                        totals.roundOffAmount >= 0
                                                            ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                                            : 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                                    }`}
                                                >
                                                    {totals.roundOffAmount >= 0 ? '+Rs ' : '-Rs '}{Math.abs(totals.roundOffAmount).toFixed(2)}
                                                </span>
                                            </div>

                                            <div className="grid grid-cols-[40px_1fr_40px] items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const currentValue = Math.abs(roundOff.amount || 0);
                                                        handleRoundOffChange("minus", currentValue);
                                                    }}
                                                    className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-red-50 text-red-600 transition hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50"
                                                    title="Subtract from total"
                                                >
                                                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                                                    </svg>
                                                </button>

                                                <div className="relative">
                                                    <input
                                                        type="number"
                                                        value={Math.abs(roundOff.amount || 0)}
                                                        onChange={(e) => {
                                                            const amount = parseFloat(e.target.value) || 0;
                                                            const type = roundOff.type === "minus" ? "minus" : "plus";
                                                            handleRoundOffChange(type, amount);
                                                        }}
                                                        className="w-full rounded-lg border border-stroke bg-transparent px-10 py-2 text-center outline-none focus:border-primary dark:border-dark-3"
                                                        min="0"
                                                        step="0.01"
                                                    />
                                                    <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                                                        {roundOff.type === "minus" ? "-" : "+"}
                                                    </div>
                                                    <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                                                        Rs
                                                    </div>
                                                </div>

                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const currentValue = Math.abs(roundOff.amount || 0);
                                                        handleRoundOffChange("plus", currentValue);
                                                    }}
                                                    className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-green-50 text-green-600 transition hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50"
                                                    title="Add to total"
                                                >
                                                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                                    </svg>
                                                </button>
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
                        <div className="rounded-lg p-4 shadow-none sm:p-6">
                            <div className="flex flex-wrap justify-center gap-4">
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="h-9 min-w-[140px] rounded-lg bg-primary px-6 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60 sm:h-10 sm:min-w-[220px]"
                                >
                                    {isSubmitting ? "Saving..." : isEditMode ? "Update Proforma Invoice" : "Save Proforma Invoice"}
                                </button>

                                <button
                                    type="button"
                                    onClick={() => router.back()}
                                    className="h-9 min-w-[140px] rounded-lg bg-[#E5E7EB] px-6 text-sm font-medium text-black transition-colors hover:bg-[#e9ebf0] dark:bg-dark-3 dark:text-white dark:hover:bg-dark-2 sm:h-10 sm:min-w-[220px]"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </form>
            </div>
        </div>
    );
}



