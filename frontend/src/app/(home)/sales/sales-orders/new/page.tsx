"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import { customersApi, productsApi, salesOrdersApi, ordersApi } from "@/services/api";
import { employeesApi } from "@/services/api";
import Select from 'react-select';
import { useRef } from "react";

const INDIAN_STATE_CODES: Record<string, string> = {
    "01": "Jammu & Kashmir",
    "02": "Himachal Pradesh",
    "03": "Punjab",
    "04": "Chandigarh",
    "05": "Uttarakhand",
    "06": "Haryana",
    "07": "Delhi",
    "08": "Rajasthan",
    "09": "Uttar Pradesh",
    "10": "Bihar",
    "11": "Sikkim",
    "12": "Arunachal Pradesh",
    "13": "Nagaland",
    "14": "Manipur",
    "15": "Mizoram",
    "16": "Tripura",
    "17": "Meghalaya",
    "18": "Assam",
    "19": "West Bengal",
    "20": "Jharkhand",
    "21": "Odisha",
    "22": "Chhattisgarh",
    "23": "Madhya Pradesh",
    "24": "Gujarat",
    "25": "Daman & Diu",
    "26": "Dadra & Nagar Haveli and Daman & Diu",
    "27": "Maharashtra",
    "29": "Karnataka",
    "30": "Goa",
    "31": "Lakshadweep",
    "32": "Kerala",
    "33": "Tamil Nadu",
    "34": "Puducherry",
    "35": "Andaman & Nicobar Islands",
    "36": "Telangana",
    "37": "Andhra Pradesh",
    "38": "Ladakh",
    "97": "Other Territory",
    "99": "Centre Jurisdiction",
};

const normalizeStateCode = (stateValue?: string | null): string | undefined => {
    if (!stateValue) return undefined;
    const raw = String(stateValue).trim();
    if (!raw) return undefined;

    if (/^\d+$/.test(raw)) {
        const code = raw.padStart(2, "0");
        if (INDIAN_STATE_CODES[code]) return code;
    }

    const normalizedInput = raw.toLowerCase().replace(/[^a-z0-9]/g, "");
    for (const [code, name] of Object.entries(INDIAN_STATE_CODES)) {
        const normalizedName = name.toLowerCase().replace(/[^a-z0-9]/g, "");
        if (normalizedName === normalizedInput) return code;
    }

    const aliases: Record<string, string> = {
        tamilnadu: "33",
        andhrapradesh: "37",
        maharastra: "27",
        chhattisgarh: "22",
        chattisgarh: "22",
        odisa: "21",
        orissa: "21",
    };

    return aliases[normalizedInput];
};

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

    const options = products.map(product => {
        const productName = String(product?.name || "").trim();
        const productSku = String(product?.sku || "").trim();
        const label = productSku ? `${productName} (${productSku})` : productName;

        return {
            value: product.id,
            label,
            product,
        };
    });

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
                container: (base: any) => ({
                    ...base,
                    width: "100%",
                }),
                control: (base: any, state: any) => ({
                    ...base,
                    minHeight: "38px",
                    borderRadius: "0.375rem",
                    borderColor: state.isFocused ? "#6366f1" : "#d1d5db",
                    boxShadow: state.isFocused
                        ? "0 0 0 1px rgba(99,102,241,0.5)"
                        : "none",
                }),
                valueContainer: (base: any) => ({
                    ...base,
                    padding: "0 8px",
                }),
                indicatorsContainer: (base: any) => ({
                    ...base,
                    display: "none",
                }),
                indicatorSeparator: () => ({
                    display: "none",
                }),
                singleValue: (base: any) => ({
                    ...base,
                    margin: 0,
                    maxWidth: "100%",
                }),
                input: (base: any) => ({
                    ...base,
                    margin: 0,
                    padding: 0,
                }),
                menu: (base: any) => ({
                    ...base,
                    minWidth: "520px",
                    width: "max-content",
                    maxWidth: "760px",
                }),
                option: (base: any) => ({
                    ...base,
                    whiteSpace: "normal",
                    wordBreak: "break-word",
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
    const searchParams = useSearchParams();
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
    const [contactPersons, setContactPersons] = useState<any[]>([]);
    const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
    const [prefillLoading, setPrefillLoading] = useState(false);
    const [prefillError, setPrefillError] = useState("");
    const [prefillContactPerson, setPrefillContactPerson] = useState("");
    const [nextSalesOrderCode, setNextSalesOrderCode] = useState("");
    const [loadingSalesOrderCode, setLoadingSalesOrderCode] = useState(false);

    const [loading, setLoading] = useState({
        customers: false,
        products: false,
        salesmen: false,
        contactPersons: false,
    });

    // Form state
    const [formData, setFormData] = useState({
        // Basic details
        customer_id: "",
        sales_order_date: new Date().toISOString().split('T')[0],
        expire_date: "",
        status: "open",

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

        // New charges fields
        freight_charges: 0,
        freight_type: "tax@18%",
        p_and_f_charges: 0,
        pf_type: "tax@18%",
        couponCode: "",
        couponType: "Fixed",
        couponValue: 0,
        discountOnAll: 0,
        discountType: "percentage",
        send_message: false,

        // Calculated fields
        subtotal: 0,
        total_tax: 0,
        total_amount: 0,

        deliveryNote: "",
        supplierRef: "",
        otherReferences: "",
        buyerOrderNo: "",
        buyerOrderDate: "",
        despatchDocNo: "",
        deliveryNoteDate: "",
        despatchedThrough: "",
        destination: "",
        termsOfDelivery: "",
    });

    // Sales items state
    const [items, setItems] = useState([
        {
            id: 1,
            product_id: "",
            description: "",
            quantity: 1,
            unit: "unit",
            unit_price: 0,  // Make sure this is included
            rate: 0,        // Keep for compatibility if needed
            item_code: "",
            discount_percent: 0,
            discount_amount: 0,
            gst_rate: 18,
            cgst_rate: 9,
            sgst_rate: 9,
            igst_rate: 0,
            taxable_amount: 0,
            tax_amount: 0,
            total_amount: 0,
        },
    ]);

    // Round off state
    const [roundOff, setRoundOff] = useState({
        amount: 0,
        type: "none", // "none", "plus", "minus"
    });

    // Load data on component mount
    useEffect(() => {
        if (company?.id) {
            loadCustomers();
            loadProducts();
            loadSalesmen();
            loadNextSalesOrderCode();
        }
    }, [company?.id]);

    const getDefaultSalesOrderCode = () => {
        const year = new Date().getFullYear();
        return `SO/${year}-${year + 1}/0001`;
    };

    const getNextSalesOrderCodeFromList = (orderNumbers: string[]) => {
        let maxNumber = 0;
        let prefix = "";
        let width = 4;

        for (const orderNumber of orderNumbers) {
            const value = String(orderNumber || "").trim();
            if (!value) continue;

            const match = value.match(/^(.*\/)(\d+)$/);
            if (!match) continue;

            const currentPrefix = match[1];
            const currentNum = parseInt(match[2], 10);
            const currentWidth = match[2].length;

            if (Number.isNaN(currentNum)) continue;

            if (currentNum > maxNumber) {
                maxNumber = currentNum;
                prefix = currentPrefix;
                width = currentWidth;
            }
        }

        if (!prefix) {
            return getDefaultSalesOrderCode();
        }

        return `${prefix}${String(maxNumber + 1).padStart(width, "0")}`;
    };

    const loadNextSalesOrderCode = async () => {
        if (!company?.id) return;

        try {
            setLoadingSalesOrderCode(true);
            const orders = await ordersApi.listSalesOrders(company.id);
            const orderNumbers = (orders || []).map((order: any) => order?.order_number).filter(Boolean);
            setNextSalesOrderCode(getNextSalesOrderCodeFromList(orderNumbers));
        } catch (error) {
            console.error("Failed to load next sales order number:", error);
            setNextSalesOrderCode(getDefaultSalesOrderCode());
        } finally {
            setLoadingSalesOrderCode(false);
        }
    };

    const salesOrderCodeParts = useMemo(() => {
        const fallback = getDefaultSalesOrderCode();
        const code = (nextSalesOrderCode || fallback).trim();
        const match = code.match(/^(.*\/)(\d+)$/);
        if (!match) {
            return { prefix: code, sequence: "" };
        }
        return { prefix: match[1], sequence: match[2] };
    }, [nextSalesOrderCode]);

    useEffect(() => {
        const quotationId = searchParams?.get("fromQuotation");
        if (!company?.id || !quotationId) return;
        prefillFromQuotation(quotationId);
    }, [company?.id, searchParams]);

    useEffect(() => {
        if (!prefillContactPerson || contactPersons.length === 0) return;
        const byId = contactPersons.find((p) => String(p.id) === String(prefillContactPerson));
        const byName = contactPersons.find((p) =>
            p.name && p.name.toLowerCase() === prefillContactPerson.toLowerCase()
        );
        const match = byId || byName;
        if (match) {
            setFormData(prev => ({ ...prev, contact_person: match.id || match.name }));
            setPrefillContactPerson("");
            return;
        }
        setFormData(prev => ({ ...prev, contact_person: prefillContactPerson }));
        setPrefillContactPerson("");
    }, [prefillContactPerson, contactPersons]);

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

            // Use the sales-engineers API endpoint
            const token = localStorage.getItem("employee_token") || localStorage.getItem("access_token");
            const response = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/companies/${company!.id}/sales-engineers`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                }
            );

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            // Process the data - adjust based on your API response structure
            let salesEngineers: any[] = [];

            if (Array.isArray(data)) {
                salesEngineers = data;
            } else if (data && typeof data === 'object') {
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

            setSalesmen(formattedSalesmen);

        } catch (error) {

            console.error("Failed to load sales engineers:", error);
            // Fallback to employees API if sales-engineers endpoint fails
            try {
                const employees = await employeesApi.list(company!.id);
                const salesEmployees = employees.filter(emp =>
                    (emp.designation?.name || emp.designation || '').toString().toLowerCase().includes('sales') ||
                    emp.employee_type?.toLowerCase().includes('sales')
                );
                setSalesmen(salesEmployees);
            } catch (fallbackError) {
                console.error("Failed to load employees as fallback:", fallbackError);
                setSalesmen([]);
            }
        } finally {
            setLoading(prev => ({ ...prev, salesmen: false }));
        }
    };

    const toDateInput = (value?: string | null) => {
        if (!value) return "";
        try {
            return new Date(value).toISOString().split("T")[0];
        } catch {
            return "";
        }
    };

    const mapQuotationItem = (item: any) => {
        const unitPrice = Number(item.unit_price ?? item.rate ?? item.unitPrice ?? 0);
        const quantity = Number(item.quantity ?? 1);
        const discountPercent = Number(item.discount_percent ?? item.discountPercent ?? 0);
        const gstRate = Number(item.gst_rate ?? item.gstRate ?? 0);

        const itemTotal = quantity * unitPrice;
        const discountAmount = discountPercent > 0 ? itemTotal * (discountPercent / 100) : 0;
        const taxableAmount = itemTotal - discountAmount;
        const taxAmount = taxableAmount * (gstRate / 100);
        const totalAmount = taxableAmount + taxAmount;

        return {
            id: Date.now() + Math.random(),
            product_id: item.product_id || item.productId || "",
            description: item.description || item.product_name || item.product?.name || "",
            quantity,
            unit: item.unit || "unit",
            unit_price: unitPrice,
            rate: unitPrice,
            item_code: item.item_code || "",
            discount_percent: discountPercent,
            discount_amount: discountAmount,
            gst_rate: gstRate || 18,
            cgst_rate: Number(item.cgst_rate ?? gstRate / 2) || 0,
            sgst_rate: Number(item.sgst_rate ?? gstRate / 2) || 0,
            igst_rate: Number(item.igst_rate ?? 0) || 0,
            taxable_amount: taxableAmount,
            tax_amount: taxAmount,
            total_amount: totalAmount,
        };
    };

    const prefillFromQuotation = async (quotationId: string) => {
        if (!company?.id) return;
        const token = localStorage.getItem("employee_token") || localStorage.getItem("access_token");
        if (!token) return;

        setPrefillLoading(true);
        setPrefillError("");
        try {
            const response = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/companies/${company.id}/quotations/${quotationId}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (!response.ok) {
                throw new Error(`Failed to fetch quotation (${response.status})`);
            }

            const quotation = await response.json();

            if (quotation?.customer_id) {
                await handleCustomerChange(quotation.customer_id);
            }

            if (quotation.contact_person) {
                setPrefillContactPerson(String(quotation.contact_person));
            }

            setFormData(prev => ({
                ...prev,
                customer_id: quotation.customer_id || prev.customer_id,
                sales_order_date: toDateInput(quotation.quotation_date) || prev.sales_order_date,
                expire_date: toDateInput(quotation.validity_date) || prev.expire_date,
                reference_no: quotation.reference_no || quotation.quotation_number || prev.reference_no,
                reference_date: toDateInput(quotation.reference_date || quotation.quotation_date) || prev.reference_date,
                payment_terms: quotation.payment_terms || prev.payment_terms,
                sales_person_id: quotation.sales_person_id || prev.sales_person_id,
                contact_person: quotation.contact_person_id || prev.contact_person,
                notes: quotation.notes || prev.notes,
                terms: quotation.terms || prev.terms,
                freight_charges: Number(quotation.freight_charges ?? prev.freight_charges) || 0,
                freight_type: quotation.freight_type || prev.freight_type,
                p_and_f_charges: Number(quotation.p_and_f_charges ?? prev.p_and_f_charges) || 0,
                pf_type: quotation.pf_type || prev.pf_type,
                deliveryNote: quotation.delivery_note || prev.deliveryNote,
                supplierRef: quotation.supplier_ref || prev.supplierRef,
                otherReferences: quotation.other_references || prev.otherReferences,
                buyerOrderNo: quotation.buyer_order_no || prev.buyerOrderNo,
                buyerOrderDate: toDateInput(quotation.buyer_order_date) || prev.buyerOrderDate,
                despatchDocNo: quotation.despatch_doc_no || prev.despatchDocNo,
                deliveryNoteDate: toDateInput(quotation.delivery_note_date) || prev.deliveryNoteDate,
                despatchedThrough: quotation.despatched_through || prev.despatchedThrough,
                destination: quotation.destination || prev.destination,
                termsOfDelivery: quotation.terms_of_delivery || prev.termsOfDelivery,
            }));

            const incomingItems = Array.isArray(quotation.items) ? quotation.items : [];
            if (incomingItems.length > 0) {
                setItems(incomingItems.map(mapQuotationItem));
            }

            if (typeof quotation.round_off === "number") {
                const ro = quotation.round_off;
                setRoundOff({
                    type: ro > 0 ? "plus" : ro < 0 ? "minus" : "none",
                    amount: Math.abs(ro),
                });
            }
        } catch (error: any) {
            console.error("Failed to prefill from quotation:", error);
            setPrefillError("Failed to load quotation data");
        } finally {
            setPrefillLoading(false);
        }
    };

    // Fetch contact persons for a specific customer
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

    const fetchCustomerById = async (customerId: string) => {
        if (!company?.id || !customerId) return null;
        try {
            const token = localStorage.getItem("employee_token") || localStorage.getItem("access_token");
            if (!token) return null;

            const response = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/companies/${company.id}/customers/${customerId}`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                }
            );

            if (!response.ok) return null;
            return await response.json();
        } catch (error) {
            console.error("Failed to fetch customer by id:", error);
            return null;
        }
    };

    // Prepare customer options for dropdown
    const customerOptions = useMemo(() => {
        return customers.map(customer => ({
            value: customer.id,
            label: `${customer.name} ${customer.gstin ? `(${customer.gstin})` : ''}`,
            data: customer
        }));
    }, [customers]);

    // Prepare salesman options for dropdown
    const salesmanOptions = useMemo(() => {
        return salesmen.map(salesman => ({
            value: salesman.id,
            label: `${salesman.name} ${salesman.employee_code ? `(${salesman.employee_code})` : ''} ${salesman.designation ? `- ${salesman.designation}` : ''}`
        }));
    }, [salesmen]);

    // Prepare contact person options for dropdown
    const contactPersonOptions = useMemo(() => {
        return contactPersons.map(person => ({
            value: person.id || person.name,
            label: `${person.name} ${person.designation ? `(${person.designation})` : ''} ${person.email ? `- ${person.email}` : ''} ${person.phone ? `- ${person.phone}` : ''}`
        }));
    }, [contactPersons]);

    const getCustomerStateCode = (customer: any): string | undefined => {
        if (!customer) return undefined;

        return normalizeStateCode(
            customer?.shipping_state_code ||
            customer?.shipping_state ||
            customer?.shipping_state_name ||
            customer?.shippingAddress?.state_code ||
            customer?.shippingAddress?.state ||
            customer?.shipping_address?.state_code ||
            customer?.shipping_address?.state ||
            customer?.billing_state_code ||
            customer?.billing_state ||
            customer?.state_code ||
            customer?.state
        );
    };

    const isIntraStateSupply = () => {
        const customerStateCode = getCustomerStateCode(selectedCustomer);
        const companyStateCode = normalizeStateCode(company?.state_code || company?.state);

        if (customerStateCode && companyStateCode) {
            return customerStateCode === companyStateCode;
        }
        return true;
    };

    // Calculate totals based on items
    const calculateTotals = () => {
        let subtotal = 0;
        let totalTax = 0;
        let cgstTotal = 0;
        let sgstTotal = 0;
        let igstTotal = 0;
        let totalItemDiscount = 0;

        const intraSupply = isIntraStateSupply();

        items.forEach(item => {
            const itemTotal = Number(item.quantity || 0) * Number(item.unit_price || 0);
            const discount = item.discount_percent > 0
                ? itemTotal * (Number(item.discount_percent) / 100)
                : 0;
            const taxable = itemTotal - discount;
            const gstRate = Number(item.gst_rate || 0);

            let itemCgst = 0;
            let itemSgst = 0;
            let itemIgst = 0;

            if (intraSupply) {
                itemCgst = taxable * (gstRate / 2 / 100);
                itemSgst = taxable * (gstRate / 2 / 100);
            } else {
                itemIgst = taxable * (gstRate / 100);
            }

            const tax = itemCgst + itemSgst + itemIgst;
            subtotal += taxable;
            totalTax += tax;
            cgstTotal += itemCgst;
            sgstTotal += itemSgst;
            igstTotal += itemIgst;
            totalItemDiscount += discount;
        });

        const freightBase = Number(formData.freight_charges || 0);
        const pAndFBase = Number(formData.p_and_f_charges || 0);
        const couponValue = Number(formData.couponValue || 0);
        const discountOnAll = Number(formData.discountOnAll || 0);

        const getTaxRateFromType = (taxType: string) => {
            const match = String(taxType || "").match(/tax@(\d+)%/);
            return match ? parseInt(match[1], 10) : 0;
        };

        const freightTax = freightBase * (getTaxRateFromType(formData.freight_type) / 100);
        const pAndFTax = pAndFBase * (getTaxRateFromType(formData.pf_type) / 100);
        const freightChargesWithTax = freightBase + freightTax;
        const pAndFChargesWithTax = pAndFBase + pAndFTax;
        const chargesTaxTotal = freightTax + pAndFTax;
        totalTax += chargesTaxTotal;

        const discountAllAmount = formData.discountType === "percentage"
            ? subtotal * (discountOnAll / 100)
            : discountOnAll;

        const totalAfterTax = subtotal + totalTax;
        const totalAfterCharges = totalAfterTax + freightBase + pAndFBase;
        const totalAfterCoupon = totalAfterCharges - couponValue;
        const totalAfterDiscountAll = totalAfterCoupon - discountAllAmount;

        let finalRoundOff = 0;
        if (roundOff.type === "plus") {
            finalRoundOff = roundOff.amount;
        } else if (roundOff.type === "minus") {
            finalRoundOff = -roundOff.amount;
        }

        const grandTotal = totalAfterDiscountAll + finalRoundOff;

        return {
            subtotal: Number(subtotal.toFixed(2)),
            totalTax: Number(totalTax.toFixed(2)),
            cgstTotal: Number(cgstTotal.toFixed(2)),
            sgstTotal: Number(sgstTotal.toFixed(2)),
            igstTotal: Number(igstTotal.toFixed(2)),
            itemDiscount: Number(totalItemDiscount.toFixed(2)),
            freightCharges: Number(freightChargesWithTax.toFixed(2)),
            pAndFCharges: Number(pAndFChargesWithTax.toFixed(2)),
            couponDiscount: Number(couponValue.toFixed(2)),
            discountAll: Number(discountAllAmount.toFixed(2)),
            totalBeforeRoundOff: Number(totalAfterDiscountAll.toFixed(2)),
            roundOff: Number(finalRoundOff.toFixed(2)),
            grandTotal: Number(grandTotal.toFixed(2)),
            chargesTax: Number(chargesTaxTotal.toFixed(2)),
        };
    };

    const totals = calculateTotals();
    const freightBaseValue = Number(formData.freight_charges || 0);
    const pfBaseValue = Number(formData.p_and_f_charges || 0);
    const summaryDiscountOnAllValue = Number((totals.discountAll + totals.itemDiscount).toFixed(2));

    // Handle round off amount change
    const handleRoundOffChange = (type: "plus" | "minus" | "none", amount: number) => {
        setRoundOff({
            type: type,
            amount: Number(amount.toFixed(2))
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!company?.id) return;

        setIsSubmitting(true);
        try {
            // Validate all items have required fields
            const hasInvalidItems = items.some(item => {
                const unit_price = Number(item.unit_price || 0);
                return unit_price <= 0 || !item.product_id;
            });

            if (hasInvalidItems) {
                alert("Please ensure all items have valid product and rate");
                setIsSubmitting(false);
                return;
            }
            const processedItems = items.map(item => {
                // Use unit_price from UI
                const unitPrice = Number(item.unit_price || 0);
                const quantity = Number(item.quantity) || 1;
                const discountPercent = Number(item.discount_percent) || 0;
                const gstRate = Number(item.gst_rate) || 18;

                const itemTotal = quantity * unitPrice;
                const discountAmount = itemTotal * (discountPercent / 100);
                const taxableAmount = itemTotal - discountAmount;
                const taxAmount = taxableAmount * (gstRate / 100);
                const totalAmount = taxableAmount + taxAmount;
                const isIntraSupply = isIntraStateSupply();
                const cgstRate = isIntraSupply ? gstRate / 2 : 0;
                const sgstRate = isIntraSupply ? gstRate / 2 : 0;
                const igstRate = isIntraSupply ? 0 : gstRate;

                // Return object with unit_price
                return {
                    product_id: item.product_id,
                    description: item.description || '',
                    quantity: quantity,
                    unit: item.unit || 'unit',
                    unit_price: unitPrice,  // This is what backend expects
                    discount_percent: discountPercent,
                    gst_rate: gstRate,
                    discount_amount: discountAmount,
                    taxable_amount: taxableAmount,
                    tax_amount: taxAmount,
                    total_amount: totalAmount,
                    cgst_rate: cgstRate,
                    sgst_rate: sgstRate,
                    igst_rate: igstRate,
                    item_code: item.item_code || '',
                };
            });   // Prepare sales order data
            const salesOrderData = {
                company_id: company.id,
                customer_id: formData.customer_id,
                sales_order_date: formData.sales_order_date + "T00:00:00Z",
                expire_date: formData.expire_date ? formData.expire_date + "T00:00:00Z" : null,
                status: formData.status || "open",

                reference_no: formData.reference_no || null,
                reference_date: formData.reference_date ? formData.reference_date + "T00:00:00Z" : null,
                payment_terms: formData.payment_terms || null,
                sales_person_id: formData.sales_person_id || undefined,
                contact_person: formData.contact_person || null,
                notes: formData.notes || null,
                terms: formData.terms,
                other_charges: 0,
                discount_on_all: Number(formData.discountOnAll || 0),
                freight_charges: Number(formData.freight_charges || 0),
                p_and_f_charges: Number(formData.p_and_f_charges || 0),
                round_off: Number(totals.roundOff) || 0,
                subtotal: Number(totals.subtotal) || 0,
                total_tax: Number(totals.totalTax) || 0,
                total_amount: Number(totals.grandTotal) || 0,
                send_message: formData.send_message,

                // New fields
                delivery_note: formData.deliveryNote || null,
                supplier_ref: formData.supplierRef || null,
                other_references: formData.otherReferences || null,
                buyer_order_no: formData.buyerOrderNo || null,
                buyer_order_date: formData.buyerOrderDate ? formData.buyerOrderDate + "T00:00:00Z" : null,
                despatch_doc_no: formData.despatchDocNo || null,
                delivery_note_date: formData.deliveryNoteDate ? formData.deliveryNoteDate + "T00:00:00Z" : null,
                despatched_through: formData.despatchedThrough || null,
                destination: formData.destination || null,
                terms_of_delivery: formData.termsOfDelivery || null,

                items: processedItems,
            };

            console.log('Submitting sales order:', JSON.stringify(salesOrderData, null, 2));

            // Test if the API accepts this structure
            const response = await salesOrdersApi.create(company.id, salesOrderData as any);

            console.log('Sales order created successfully:', response);
            router.push(`/sales/sales-orders`);

        } catch (error: any) {
            console.error('Error creating sales order:', error);

            if (error.response?.data) {
                console.error('Backend error details:', error.response.data);
                if (error.response.data.detail) {
                    if (Array.isArray(error.response.data.detail)) {
                        const errorMessages = error.response.data.detail.map((err: any) =>
                            `Field: ${err.loc?.join('.')}\nError: ${err.msg}`
                        ).join('\n\n');
                        alert(`Validation Errors:\n\n${errorMessages}`);
                    } else {
                        alert(`Error: ${error.response.data.detail}`);
                    }
                } else {
                    alert(`Backend Error: ${JSON.stringify(error.response.data, null, 2)}`);
                }
            } else {
                alert('Failed to create sales order. Please try again.');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const updateItem = (id: number, field: string, value: any) => {
        setItems(items.map(item => {
            if (item.id === id) {
                const updated = { ...item, [field]: value };

                // Auto-fill product details when product is selected
                if (field === 'product_id' && value) {
                    const selectedProduct = products.find(p => p.id === value);
                    if (selectedProduct) {
                        updated.description = selectedProduct.description || selectedProduct.name;
                        const unitPrice = Number(selectedProduct.selling_price || selectedProduct.unit_price || 0);
                        updated.unit_price = unitPrice;  // Set unit_price
                        updated.rate = unitPrice;        // Keep rate for compatibility
                        updated.gst_rate = Number(selectedProduct.gst_rate) || 18;
                        // REMOVE THIS LINE: updated.item_code = selectedProduct.sku || selectedProduct.code || "";
                        // Keep item_code as is (don't auto-fill)
                    }
                }

                // Handle both unit_price and rate changes
                if (field === 'unit_price') {
                    updated.unit_price = Number(value) || 0;
                    updated.rate = Number(value) || 0;  // Sync both fields
                }

                if (field === 'rate') {
                    updated.rate = Number(value) || 0;
                    updated.unit_price = Number(value) || 0;  // Sync both fields
                }

                // Use unit_price for calculations
                const unitPrice = Number(updated.unit_price || 0);

                // Recalculate item totals
                const itemTotal = Number(updated.quantity) * unitPrice;
                const discount = updated.discount_percent > 0 ?
                    itemTotal * (Number(updated.discount_percent) / 100) : 0;
                const taxable = itemTotal - discount;
                const tax = taxable * (Number(updated.gst_rate) / 100);

                updated.discount_amount = discount;
                updated.taxable_amount = taxable;
                updated.tax_amount = tax;
                updated.total_amount = taxable + tax;

                const intraSupply = isIntraStateSupply();
                const gstRate = Number(updated.gst_rate) || 0;
                updated.cgst_rate = intraSupply ? gstRate / 2 : 0;
                updated.sgst_rate = intraSupply ? gstRate / 2 : 0;
                updated.igst_rate = intraSupply ? 0 : gstRate;

                return updated;
            }
            return item;
        }));
    };

    // Add this test function to your component
    const testBackendSchema = async () => {
        console.log('=== TESTING BACKEND SCHEMA ===');

        const testPayloads = [
            {
                name: 'Test 1: Only rate',
                data: {
                    company_id: company?.id,
                    customer_id: formData.customer_id,
                    sales_order_date: formData.sales_order_date + "T00:00:00Z",
                    items: [{
                        product_id: items[0]?.product_id,
                        description: "Test item",
                        quantity: 1,
                        unit: "unit",
                        rate: 100,
                        gst_rate: 18,
                        tax_amount: 18,
                        total_amount: 118
                    }]
                }
            },
            {
                name: 'Test 2: Only unit_price',
                data: {
                    company_id: company?.id,
                    customer_id: formData.customer_id,
                    sales_order_date: formData.sales_order_date + "T00:00:00Z",
                    items: [{
                        product_id: items[0]?.product_id,
                        description: "Test item",
                        quantity: 1,
                        unit: "unit",
                        unit_price: 100,
                        gst_rate: 18,
                        tax_amount: 18,
                        total_amount: 118
                    }]
                }
            },
            {
                name: 'Test 3: Both fields',
                data: {
                    company_id: company?.id,
                    customer_id: formData.customer_id,
                    sales_order_date: formData.sales_order_date + "T00:00:00Z",

                    items: [{
                        product_id: items[0]?.product_id,
                        description: "Test item",
                        quantity: 1,
                        unit: "unit",
                        unit_price: 100,
                        rate: 100,
                        gst_rate: 18,
                        tax_amount: 18,
                        total_amount: 118
                    }]
                }
            }
        ];

        for (const test of testPayloads) {
            console.log(`\nTrying: ${test.name}`);
            console.log('Payload:', JSON.stringify(test.data, null, 2));

            try {
                const response = await salesOrdersApi.create(company!.id, test.data as any);
                console.log('✅ SUCCESS with this payload!');
                return test.data; // Return the successful payload structure
            } catch (error: any) {
                console.log('❌ Failed:', error.response?.data?.detail || error.message);
            }
        }

        console.log('No payload worked. Backend schema is unclear.');
        return null;
    };

    // Call this function in your component or in handleSubmit
    //    // Handle customer change - load contact persons
    const handleCustomerChange = async (customerId: string) => {
        setFormData(prev => ({
            ...prev,
            customer_id: customerId,
            contact_person: "" // Clear contact person when customer changes
        }));

        if (customerId) {
            const customerFromList = customers.find(c => String(c.id) === String(customerId));
            const customerDetails = await fetchCustomerById(customerId);
            const customer = customerDetails || customerFromList || null;

            setSelectedCustomer(customer);
            if (customerDetails) {
                setCustomers(prev =>
                    prev.map((c: any) => (String(c.id) === String(customerDetails.id) ? customerDetails : c))
                );
            }

            // Fetch contact persons for this customer
            await fetchContactPersons(customerId);

            // If customer has a default contact person, set it
            if (customer?.contact_person) {
                setFormData(prev => ({
                    ...prev,
                    contact_person: customer.contact_person
                }));
            }
        } else {
            // Clear contact persons if no customer selected
            setContactPersons([]);
            setSelectedCustomer(null);
        }
    };

    // Handle contact person change
    const handleContactPersonChange = (value: string) => {
        setFormData(prev => ({
            ...prev,
            contact_person: value
        }));
    };

    // Handle salesman change
    const handleSalesmanChange = (value: string) => {
        setFormData(prev => ({
            ...prev,
            sales_person_id: value
        }));
    };

    // Update form data handler
    const handleFormChange = (field: string, value: any) => {
        if (field === 'customer_id') {
            handleCustomerChange(value);
        } else if (field === 'contact_person') {
            handleContactPersonChange(value);
        } else if (field === 'sales_person_id') {
            handleSalesmanChange(value);
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
                item_code: "",
                unit: "unit",
                unit_price: 0,
                rate: 0,
                discount_percent: 0,
                discount_amount: 0,
                gst_rate: 18,
                cgst_rate: 9,
                sgst_rate: 9,
                igst_rate: 0,
                tax_amount: 0,
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
        <div className="w-full bg-gray-50 dark:bg-gray-900">
            <div className="border-b border-gray-200 bg-white px-4 py-4 dark:border-gray-700 dark:bg-gray-800 sm:px-6">
                <div className="flex items-start gap-3">
                    <Link
                        href="/sales/sales-orders"
                        className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-white transition hover:bg-primary/90 sm:h-10 sm:w-10"
                    >
                        <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Create Sales Order</h1>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            Create new sales order with customer details and items
                        </p>
                    </div>
                </div>
            </div>

            <div className="w-full p-4 sm:p-6">

                {(prefillLoading || prefillError) && (
                    <div className="mb-6 rounded-lg border border-stroke bg-white p-4 text-sm dark:border-dark-3 dark:bg-gray-dark">
                        {prefillLoading && <p className="text-dark-6">Loading quotation data...</p>}
                        {prefillError && <p className="text-red-600">{prefillError}</p>}
                    </div>
                )}

                <form data-ui="sf-form" onSubmit={handleSubmit}>
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                        {/* Left Column - Main Form */}
                        <div className="lg:col-span-3 space-y-6">
                            {/* SECTION 1: Sales Order Basic Details */}
                            <div className="rounded-lg bg-white p-6 shadow-1 dark:bg-gray-dark">
                                <h2 className="mb-4 text-lg font-semibold text-dark dark:text-white">Sales Order Basic Details</h2>
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    <div>
                                        <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                                            Company
                                        </label>
                                        <div className="rounded-lg border border-stroke bg-gray-50 px-4 py-2.5 dark:border-dark-3 dark:bg-dark-2">
                                            {company?.name || "Select Company"}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                                            Sales Order Code <span className="text-red-500">*</span>
                                        </label>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={loadingSalesOrderCode ? "Loading..." : salesOrderCodeParts.prefix}
                                                className="flex-1 rounded-lg border border-stroke bg-gray-50 px-4 py-2.5 outline-none dark:border-dark-3 dark:bg-dark-2"
                                                readOnly
                                            />
                                            <input
                                                type="text"
                                                value={loadingSalesOrderCode ? "" : salesOrderCodeParts.sequence}
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
                                        <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                                            Customer Name <span className="text-red-500">*</span>
                                        </label>
                                        <Select
                                            options={customerOptions}
                                            value={customerOptions.find(opt => opt.value === formData.customer_id)}
                                            onChange={(selected) => handleFormChange('customer_id', selected?.value || "")}
                                            placeholder={loading.customers ? "Loading customers..." : "Select Customer"}
                                            isClearable
                                            isSearchable
                                            isLoading={loading.customers}
                                            styles={{
                                                control: (base: any, state: any) => ({
                                                    ...base,
                                                    minHeight: "42px",
                                                    borderRadius: "0.5rem",
                                                    borderColor: state.isFocused ? "#6366f1" : "#d1d5db",
                                                    boxShadow: state.isFocused
                                                        ? "0 0 0 2px rgba(99,102,241,0.4)"
                                                        : "none",
                                                    backgroundColor: "transparent",
                                                    "&:hover": {
                                                        borderColor: "#6366f1",
                                                    },
                                                }),
                                                menuPortal: (base: any) => ({
                                                    ...base,
                                                    zIndex: 9999,
                                                }),
                                            }}
                                            classNamePrefix="react-select"
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                                            Reference No
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.reference_no || ""}
                                            onChange={(e) => handleFormChange('reference_no', e.target.value)}
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
                                            Status
                                        </label>
                                        <select
                                            value={formData.status}
                                            onChange={(e) => handleFormChange('status', e.target.value)}
                                            className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3"
                                        >
                                            <option value="open">Open</option>
                                            <option value="closed">Closed</option>
                                            <option value="waiting for approval">Waiting for Approval</option>
                                            <option value="follow up">Follow Up</option>
                                            <option value="po converted">PO Converted</option>
                                        </select>
                                    </div>

                                    {/* Salesman Dropdown */}
                                    <div>
                                        <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                                            Salesman <span className="text-red-500">*</span>
                                        </label>
                                        <Select
                                            options={salesmanOptions}
                                            value={salesmanOptions.find(opt => opt.value === formData.sales_person_id)}
                                            onChange={(selected) => handleFormChange('sales_person_id', selected?.value || "")}
                                            placeholder={loading.salesmen ? "Loading salesmen..." : "Select Salesman"}
                                            isClearable
                                            isSearchable
                                            isLoading={loading.salesmen}
                                            styles={{
                                                control: (base: any, state: any) => ({
                                                    ...base,
                                                    minHeight: "42px",
                                                    borderRadius: "0.5rem",
                                                    borderColor: state.isFocused ? "#6366f1" : "#d1d5db",
                                                    boxShadow: state.isFocused
                                                        ? "0 0 0 2px rgba(99,102,241,0.4)"
                                                        : "none",
                                                    backgroundColor: "transparent",
                                                    "&:hover": {
                                                        borderColor: "#6366f1",
                                                    },
                                                }),
                                                menuPortal: (base: any) => ({
                                                    ...base,
                                                    zIndex: 9999,
                                                }),
                                            }}
                                            classNamePrefix="react-select"
                                        />
                                    </div>
                                    {/* Contact Person Dropdown */}
                                    <div>
                                        <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                                            Contact Person
                                        </label>
                                        <Select
                                            options={contactPersonOptions}
                                            value={contactPersonOptions.find(opt => opt.value === formData.contact_person)}
                                            onChange={(selected) => handleFormChange('contact_person', selected?.value || "")}
                                            placeholder={
                                                !formData.customer_id
                                                    ? "Select customer first"
                                                    : loading.contactPersons
                                                        ? "Loading contact persons..."
                                                        : contactPersonOptions.length > 0
                                                            ? "Select Contact Person"
                                                            : "No contact persons found"
                                            }
                                            isClearable
                                            isSearchable
                                            isLoading={loading.contactPersons}
                                            isDisabled={!formData.customer_id || contactPersonOptions.length === 0}
                                            styles={{
                                                control: (base: any, state: any) => ({
                                                    ...base,
                                                    minHeight: "42px",
                                                    borderRadius: "0.5rem",
                                                    borderColor: state.isFocused ? "#6366f1" : "#d1d5db",
                                                    boxShadow: state.isFocused
                                                        ? "0 0 0 2px rgba(99,102,241,0.4)"
                                                        : "none",
                                                    backgroundColor: "transparent",
                                                    "&:hover": {
                                                        borderColor: "#6366f1",
                                                    },
                                                }),
                                                menuPortal: (base: any) => ({
                                                    ...base,
                                                    zIndex: 9999,
                                                }),
                                            }}
                                            classNamePrefix="react-select"
                                            required={true}
                                        />
                                        {!formData.customer_id && (
                                            <p className="mt-1 text-xs text-gray-500">
                                                Please select a customer first to load contact persons
                                            </p>
                                        )}
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
                                        <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                                            Mode / Terms of Payment
                                        </label>
                                        <input
                                            type="text"
                                            onChange={(e) => handleFormChange('payment_terms', e.target.value)}
                                            className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3"
                                        />
                                    </div>

                                </div>
                            </div>

                            {/* SECTION 2: Sales Items Table */}
                            <div className="rounded-lg bg-white p-6 shadow-1 dark:bg-gray-dark">
                                <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between">
                                    <div>
                                        <h2 className="text-lg font-semibold text-dark dark:text-white">Sales Items</h2>
                                        <p className="mt-1 text-sm text-dark-6">Add items to your sales order</p>
                                    </div>
                                    <div className="mt-2 flex gap-2 sm:mt-0">
                                        <button
                                            type="button"
                                            onClick={() => router.push('/products/new')}
                                            className="inline-flex items-center gap-2 rounded-lg border border-blue-600 px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 dark:border-blue-500 dark:text-blue-500 dark:hover:bg-blue-900/20"
                                        >
                                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                            </svg>
                                            Add New Product
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => addItem()}
                                            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                                        >
                                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                            </svg>
                                            Add Item
                                        </button>
                                    </div>
                                </div>

                                <div className="mb-3 text-sm text-dark-6">
                                    Total Quantity: {items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0)} | Items: {items.length}
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full min-w-[1650px] border-collapse">
                                        <thead>
                                            <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
                                                <th className="w-[520px] min-w-[520px] px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-900 dark:text-white">Item</th>
                                                <th className="w-[130px] min-w-[130px] px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-900 dark:text-white">Item Code</th>
                                                <th className="w-[220px] min-w-[220px] px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-900 dark:text-white">Description</th>
                                                <th className="w-[90px] min-w-[90px] px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-900 dark:text-white">Qty</th>
                                                <th className="w-[130px] min-w-[130px] px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-900 dark:text-white">Unit Price</th>
                                                <th className="w-[100px] min-w-[100px] px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-900 dark:text-white">Discount %</th>
                                                <th className="w-[130px] min-w-[130px] px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-900 dark:text-white">Discount Amt</th>
                                                <th className="w-[90px] min-w-[90px] px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-900 dark:text-white">GST %</th>
                                                <th className="w-[140px] min-w-[140px] px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-900 dark:text-white">Total</th>
                                                <th className="w-[70px] min-w-[70px] px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-900 dark:text-white">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {items.map((item) => (
                                                <tr key={item.id} className="border-b border-stroke last:border-0 dark:border-dark-3">
                                                    <td className="w-[520px] min-w-[520px] px-3 py-3">
                                                        <ProductSelectField
                                                            value={item.product_id}
                                                            products={products}
                                                            onChange={(product) => {
                                                                if (!product) return;

                                                                setItems(prev =>
                                                                    prev.map(i => {
                                                                        if (i.id !== item.id) return i;

                                                                        const unitPrice = product.selling_price ?? product.unit_price ?? 0;
                                                                        const gstRate = Number(product.gst_rate) || 0;
                                                                        const qty = i.quantity || 1;
                                                                        const intraSupply = isIntraStateSupply();

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
                                                                            cgst_rate: intraSupply ? gstRate / 2 : 0,
                                                                            sgst_rate: intraSupply ? gstRate / 2 : 0,
                                                                            igst_rate: intraSupply ? 0 : gstRate,
                                                                        };
                                                                    })
                                                                );
                                                            }}
                                                        />
                                                    </td>

                                                    <td className="px-4 py-3">
                                                        <input
                                                            type="text"
                                                            value={item.item_code || ''}
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
                                                            value={item.unit_price || 0}
                                                            onChange={(e) => {
                                                                const value = parseFloat(e.target.value) || 0;
                                                                updateItem(item.id, 'unit_price', value);
                                                            }}
                                                            className="w-24 rounded border border-stroke bg-transparent px-3 py-1.5 outline-none focus:border-primary dark:border-dark-3"
                                                            min="0"
                                                            step="0.01"
                                                            required
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
                                                        <span className="font-medium">Rs. {(item.discount_amount || 0).toFixed(2)}</span>
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
                                                    <td className="px-4 py-3 font-medium">Rs. {(item.total_amount || 0).toFixed(2)}</td>
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
                                <div className="lg:col-span-2">
                                    <div className="rounded-lg bg-white p-6 shadow-1 dark:bg-gray-dark">
                                        <h2 className="mb-4 text-lg font-semibold text-dark dark:text-white">Charges & Adjustments</h2>
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
                                                        value={formData.freight_type || 'tax@18%'}
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
                                                        value={formData.p_and_f_charges}
                                                        onChange={(e) => handleFormChange('p_and_f_charges', parseFloat(e.target.value) || 0)}
                                                        className="min-w-0 w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3"
                                                        min="0"
                                                        step="0.01"
                                                    />
                                                    <select
                                                        value={formData.pf_type || 'tax@18%'}
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

                                            <div>
                                                <label className="mb-2 block text-sm font-medium text-dark dark:text-white">Discount Coupon Code</label>
                                                <input
                                                    type="text"
                                                    value={formData.couponCode}
                                                    onChange={(e) => handleFormChange("couponCode", e.target.value)}
                                                    className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3"
                                                />
                                            </div>

                                            <div>
                                                <label className="mb-2 block text-sm font-medium text-dark dark:text-white">Coupon Type</label>
                                                <input
                                                    type="text"
                                                    value={formData.couponType}
                                                    readOnly
                                                    className="w-full rounded-lg border border-stroke bg-gray-50 px-4 py-2.5 dark:border-dark-3 dark:bg-dark-2"
                                                />
                                            </div>

                                            <div>
                                                <label className="mb-2 block text-sm font-medium text-dark dark:text-white">Coupon Value</label>
                                                <input
                                                    type="number"
                                                    value={formData.couponValue}
                                                    onChange={(e) => handleFormChange("couponValue", parseFloat(e.target.value) || 0)}
                                                    className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3"
                                                    min="0"
                                                    step="0.01"
                                                />
                                            </div>

                                            <div>
                                                <label className="mb-2 block text-sm font-medium text-dark dark:text-white">Discount on All</label>
                                                <div className="flex gap-2">
                                                    <input
                                                        type="number"
                                                        value={formData.discountOnAll}
                                                        onChange={(e) => handleFormChange("discountOnAll", parseFloat(e.target.value) || 0)}
                                                        className="flex-1 rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3"
                                                        min="0"
                                                        step="0.01"
                                                    />
                                                    <select
                                                        value={formData.discountType}
                                                        onChange={(e) => handleFormChange("discountType", e.target.value)}
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
                                                    onChange={(e) => handleFormChange('notes', e.target.value)}
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
                                                        onChange={(e) => handleFormChange('send_message', e.target.checked)}
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

                                <div className="lg:col-span-1">
                                    <div className="rounded-lg bg-white p-6 shadow-1 dark:bg-gray-dark">
                                        <h2 className="mb-4 text-lg font-semibold text-dark dark:text-white">Total Summary</h2>
                                        <div className="space-y-3">
                                            <div className="flex justify-between">
                                                <span className="text-dark-6">Subtotal</span>
                                                <span className="font-medium text-dark dark:text-white">Rs. {totals?.subtotal?.toLocaleString('en-IN') || '0.00'}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-dark-6">Tax</span>
                                                <span className="font-medium text-dark dark:text-white">Rs. {totals.totalTax.toLocaleString('en-IN')}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-dark-6">Freight Charges</span>
                                                <span className="font-medium text-dark dark:text-white">Rs. {freightBaseValue.toLocaleString('en-IN')}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-dark-6">P & F Charges</span>
                                                <span className="font-medium text-dark dark:text-white">Rs. {pfBaseValue.toLocaleString('en-IN')}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-dark-6">Coupon Discount</span>
                                                <span className="font-medium text-red-600">-Rs. {totals.couponDiscount.toLocaleString('en-IN')}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-dark-6">Discount on All</span>
                                                <span className="font-medium text-red-600">-Rs. {summaryDiscountOnAllValue.toLocaleString('en-IN')}</span>
                                            </div>

                                            <div className="rounded-lg border border-stroke/80 p-3 dark:border-dark-3/80">
                                                <div className="mb-2 flex items-center justify-between">
                                                    <span className="text-dark-6">Round Off</span>
                                                    <span
                                                        className={`rounded-md px-2 py-1 text-sm font-semibold ${totals.roundOff >= 0
                                                            ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                                            : 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                                            }`}
                                                    >
                                                        {totals.roundOff >= 0 ? '+Rs. ' : '-Rs. '}{Math.abs(totals.roundOff).toFixed(2)}
                                                    </span>
                                                </div>

                                                <div className="grid grid-cols-[40px_1fr_40px] items-center gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const currentValue = Math.abs(roundOff.amount || 0);
                                                            handleRoundOffChange('minus', currentValue);
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
                                                                const inputValue = parseFloat(e.target.value) || 0;
                                                                const type = roundOff.type === 'minus' ? 'minus' : 'plus';
                                                                handleRoundOffChange(type as any, inputValue);
                                                            }}
                                                            className="w-full rounded-lg border border-stroke bg-transparent px-10 py-2 text-center outline-none focus:border-primary dark:border-dark-3"
                                                            step="0.01"
                                                            min="0"
                                                        />
                                                        <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                                                            {roundOff.type === 'minus' ? '-' : '+'}
                                                        </div>
                                                        <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">Rs</div>
                                                    </div>

                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const currentValue = Math.abs(roundOff.amount || 0);
                                                            handleRoundOffChange('plus', currentValue);
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
                                                    <span className="text-lg font-bold text-primary">Rs. {totals.grandTotal.toLocaleString('en-IN')}</span>
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
                                            onChange={(e) => handleFormChange('terms', e.target.value)}
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

                                            <div>
                                                <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                                                    Delivery Note
                                                </label>
                                                <input
                                                    type="text"
                                                    value={formData.deliveryNote}
                                                    onChange={(e) =>
                                                        setFormData({ ...formData, deliveryNote: e.target.value })
                                                    }
                                                    className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3"
                                                />
                                            </div>

                                            <div>
                                                <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                                                    Mode / Terms of Payment
                                                </label>
                                                <input
                                                    type="text"
                                                    value={formData.payment_terms}
                                                    onChange={(e) =>
                                                        setFormData({ ...formData, payment_terms: e.target.value })
                                                    }
                                                    className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3"
                                                />
                                            </div>

                                            <div>
                                                <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                                                    Supplier's Ref.
                                                </label>
                                                <input
                                                    type="text"
                                                    value={formData.supplierRef}
                                                    onChange={(e) =>
                                                        setFormData({ ...formData, supplierRef: e.target.value })
                                                    }
                                                    className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3"
                                                />
                                            </div>

                                            <div>
                                                <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                                                    Other Reference(s)
                                                </label>
                                                <input
                                                    type="text"
                                                    value={formData.otherReferences}
                                                    onChange={(e) =>
                                                        setFormData({ ...formData, otherReferences: e.target.value })
                                                    }
                                                    className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3"
                                                />
                                            </div>

                                            <div>
                                                <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                                                    Buyer's Order No.
                                                </label>
                                                <input
                                                    type="text"
                                                    value={formData.buyerOrderNo}
                                                    onChange={(e) =>
                                                        setFormData({ ...formData, buyerOrderNo: e.target.value })
                                                    }
                                                    className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3"
                                                />
                                            </div>

                                            <div>
                                                <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                                                    Buyer's Order Date
                                                </label>
                                                <input
                                                    type="date"
                                                    value={formData.buyerOrderDate}
                                                    onChange={(e) =>
                                                        setFormData({ ...formData, buyerOrderDate: e.target.value })
                                                    }
                                                    className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3"
                                                />
                                            </div>

                                            <div>
                                                <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                                                    Despatch Document No.
                                                </label>
                                                <input
                                                    type="text"
                                                    value={formData.despatchDocNo}
                                                    onChange={(e) =>
                                                        setFormData({ ...formData, despatchDocNo: e.target.value })
                                                    }
                                                    className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3"
                                                />
                                            </div>

                                            <div>
                                                <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                                                    Delivery Note Date
                                                </label>
                                                <input
                                                    type="date"
                                                    value={formData.deliveryNoteDate}
                                                    onChange={(e) =>
                                                        setFormData({ ...formData, deliveryNoteDate: e.target.value })
                                                    }
                                                    className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3"
                                                />
                                            </div>

                                            <div>
                                                <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                                                    Despatched Through
                                                </label>
                                                <input
                                                    type="text"
                                                    value={formData.despatchedThrough}
                                                    onChange={(e) =>
                                                        setFormData({ ...formData, despatchedThrough: e.target.value })
                                                    }
                                                    className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3"
                                                />
                                            </div>

                                            <div>
                                                <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                                                    Destination
                                                </label>
                                                <input
                                                    type="text"
                                                    value={formData.destination}
                                                    onChange={(e) =>
                                                        setFormData({ ...formData, destination: e.target.value })
                                                    }
                                                    className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3"
                                                />
                                            </div>

                                            <div className="md:col-span-2">
                                                <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                                                    Terms of Delivery
                                                </label>
                                                <textarea
                                                    value={formData.termsOfDelivery}
                                                    onChange={(e) =>
                                                        setFormData({ ...formData, termsOfDelivery: e.target.value })
                                                    }
                                                    rows={3}
                                                    className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3"
                                                />
                                            </div>

                                        </div>
                                    </div>
                                )}

                            </div>
                            <hr />

                            {/* Action Buttons */}
                            <div className="rounded-lg p-4 shadow-none sm:p-6">
                                <div className="flex flex-wrap justify-center gap-4">
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="h-9 min-w-[140px] rounded-lg bg-primary px-6 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60 sm:h-10 sm:min-w-[220px]"
                                    >
                                        {isSubmitting ? "Saving..." : "Save Sales Order"}
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



