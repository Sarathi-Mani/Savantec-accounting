"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import { customersApi, productsApi, ordersApi } from "@/services/api";
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

export default function EditSalesOrderPage() {
    const router = useRouter();
    const params = useParams();
    const orderId = params?.id as string;
    const { company, user } = useAuth();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoadingOrder, setIsLoadingOrder] = useState(true);
    const [salesOrderCode, setSalesOrderCode] = useState("");
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
        status: "pending" as "pending" | "approved" | "cancelled" | "completed",

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

    const getAuthToken = () => {
        if (typeof window === "undefined") return null;
        const userType = localStorage.getItem("user_type");
        return userType === "employee"
            ? localStorage.getItem("employee_token")
            : localStorage.getItem("access_token");
    };

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
        }
    }, [company?.id]);

    useEffect(() => {
        if (!company?.id || !orderId) return;
        loadOrder(orderId);
    }, [company?.id, orderId]);

    const formatDateInput = (value?: string | null) => {
        if (!value) return "";
        const date = new Date(value);
        if (isNaN(date.getTime())) return "";
        return date.toISOString().split("T")[0];
    };

    const mapStatusToForm = (status?: string) => {
        const normalized = (status || "").toLowerCase();
        if (normalized === "draft") return "pending";
        if (normalized === "confirmed") return "approved";
        if (normalized === "fulfilled") return "completed";
        if (normalized === "cancelled") return "cancelled";
        return "pending";
    };

    const salesOrderCodeParts = useMemo(() => {
        const code = (salesOrderCode || "").trim();
        const match = code.match(/^(.*\/)(\d+)$/);
        if (!match) return { prefix: code, sequence: "" };
        return { prefix: match[1], sequence: match[2] };
    }, [salesOrderCode]);

    const loadOrder = async (id: string) => {
        try {
            setIsLoadingOrder(true);
            const order = await ordersApi.getSalesOrder(company!.id, id) as any;
            if (!order) return;
            setSalesOrderCode(order.order_number || "");

            setFormData(prev => ({
                ...prev,
                customer_id: order.customer_id || "",
                sales_order_date: formatDateInput(order.order_date) || prev.sales_order_date,
                expire_date: formatDateInput(order.expire_date),
                status: mapStatusToForm(order.status),
                reference_no: order.reference_no || "",
                reference_date: formatDateInput(order.reference_date),
                payment_terms: order.payment_terms || "",
                sales_person_id: order.sales_person_id || "",
                contact_person: order.contact_person || "",
                notes: order.notes || "",
                terms: order.terms || prev.terms,
                freight_charges: Number(order.freight_charges || 0),
                p_and_f_charges: Number(order.p_and_f_charges || 0),
                deliveryNote: order.delivery_note || "",
                supplierRef: order.supplier_ref || "",
                otherReferences: order.other_references || "",
                buyerOrderNo: order.buyer_order_no || "",
                buyerOrderDate: formatDateInput(order.buyer_order_date),
                despatchDocNo: order.despatch_doc_no || "",
                deliveryNoteDate: formatDateInput(order.delivery_note_date),
                despatchedThrough: order.despatched_through || "",
                destination: order.destination || "",
                termsOfDelivery: order.terms_of_delivery || "",
            }));

            const mappedItems = (order.items || []).map((item: any, index: number) => {
                const unitPrice = Number(item.unit_price ?? item.rate ?? 0);
                return {
                    id: index + 1,
                    product_id: item.product_id || "",
                    description: item.description || "",
                    quantity: Number(item.quantity || 0),
                    unit: item.unit || "unit",
                    unit_price: unitPrice,
                    rate: unitPrice,
                    item_code: item.item_code || "",
                    discount_percent: Number(item.discount_percent || 0),
                    discount_amount: Number(item.discount_amount || 0),
                    gst_rate: Number(item.gst_rate || 0),
                    cgst_rate: Number(item.cgst_rate || 0),
                    sgst_rate: Number(item.sgst_rate || 0),
                    igst_rate: Number(item.igst_rate || 0),
                    taxable_amount: Number(item.taxable_amount || 0),
                    tax_amount: Number(item.tax_amount || 0),
                    total_amount: Number(item.total_amount || 0),
                };
            });

            if (mappedItems.length > 0) {
                setItems(mappedItems);
            }

            const roundOffValue = Number(order.round_off || 0);
            setRoundOff({
                type: roundOffValue > 0 ? "plus" : roundOffValue < 0 ? "minus" : "none",
                amount: Math.abs(roundOffValue),
            });

            if (order.customer_id) {
                fetchContactPersons(order.customer_id, order.contact_person || "");
            }
        } catch (error) {
            console.error("Failed to load sales order:", error);
        } finally {
            setIsLoadingOrder(false);
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

            // Use the sales-engineers API endpoint
            const token = localStorage.getItem("access_token");
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

    // Fetch contact persons for a specific customer
    const fetchContactPersons = async (customerId: string, prefillContact?: string) => {
        if (!company?.id || !customerId) return;

        try {
            console.log("Contact Persons: fetch start", { customerId, prefillContact, companyId: company.id });
            setLoading(prev => ({ ...prev, contactPersons: true }));

            // Start with any contact persons already on the customer
            const customer = customers.find(c => c.id === customerId);
            console.log("Contact Persons: customer from list", customer);
            const basePersons =
                customer && customer.contact_persons && Array.isArray(customer.contact_persons)
                    ? customer.contact_persons
                    : [];

            // Try to fetch contact persons from API endpoint and merge results
            let apiPersons: any[] = [];
            try {
                const token = getAuthToken();
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
                    console.log("Contact Persons: customer endpoint response", data);
                    if (Array.isArray(data)) {
                        apiPersons = data;
                    } else if (data && typeof data === 'object') {
                        apiPersons = data.contact_persons || data.contacts || data.data || data.items || [];
                    }
                }
            } catch (apiError) {
                console.warn("Failed to fetch contact persons from API:", apiError);
            }

            let persons = [...basePersons, ...apiPersons];
            console.log("Contact Persons: merged list", persons);

            // If API fails and no contact persons exist, try to extract from customer data
            if (persons.length === 0 && customer) {
                const fallback: any[] = [];
                if (customer.contact_person_name || customer.contact_person) {
                    fallback.push({
                        id: 'primary',
                        name: customer.contact_person_name || customer.contact_person || "Primary Contact",
                        email: customer.contact_email || customer.email || "",
                        phone: customer.contact_phone || customer.phone || customer.mobile || "",
                        designation: customer.contact_designation || ""
                    });
                }
                fallback.push({
                    id: 'customer',
                    name: customer.name || "Customer",
                    email: customer.email || "",
                    phone: customer.phone || customer.mobile || "",
                    designation: "Customer"
                });
                persons = fallback;
            }

            // Ensure prefilled contact shows a human label
            if (prefillContact) {
                const getContactKey = (p: any) =>
                    p?.id || p?.contact_person_id || p?.contact_id || p?.name;
                let matched = persons.find((p: any) =>
                    getContactKey(p) === prefillContact || p?.name === prefillContact
                );

                if (!matched) {
                    // Try to resolve the contact person by ID from the company-wide list
                    try {
                        const token = getAuthToken();
                        const response = await fetch(
                            `${process.env.NEXT_PUBLIC_API_URL}/companies/${company.id}/contact-persons`,
                            {
                                headers: { Authorization: `Bearer ${token}` },
                            }
                        );
                        if (response.ok) {
                            const data = await response.json();
                            console.log("Contact Persons: company endpoint response", data);
                            const companyPersons = Array.isArray(data) ? data : [];
                            matched = companyPersons.find((p: any) => (p?.id || p?.contact_person_id || p?.contact_id) === prefillContact);
                            if (matched) {
                                persons = [...persons, matched];
                                setFormData(prev => ({
                                    ...prev,
                                    contact_person: getContactKey(matched) || matched.name || prefillContact
                                }));
                            }
                        }
                    } catch (resolveError) {
                        console.warn("Failed to resolve contact person by id:", resolveError);
                    }
                }

                if (!matched) {
                    console.log("Contact Persons: prefill id not resolved", prefillContact);
                }
            }

            // De-dupe by id/name
            const seen = new Set<string>();
            const deduped = persons.filter((p: any) => {
                const key = p?.id || p?.name;
                if (!key || seen.has(key)) return false;
                seen.add(key);
                return true;
            });

            console.log("Contact Persons: final options", deduped);
            setContactPersons(deduped);
        } catch (error) {
            console.error("Error fetching contact persons:", error);
        } finally {
            setLoading(prev => ({ ...prev, contactPersons: false }));
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
        return contactPersons.map(person => {
            const id = person.id || person.contact_person_id || person.contact_id || person.name;
            return {
                value: id,
                label: `${person.name} ${person.designation ? `(${person.designation})` : ''} ${person.email ? `- ${person.email}` : ''} ${person.phone ? `- ${person.phone}` : ''}`,
                name: person.name,
            };
        });
    }, [contactPersons]);

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

        // Function to calculate tax like in sales page
        const calculateWithTax = (baseAmount: number, taxType: string) => {
            if (taxType === 'fixed') {
                return baseAmount;
            }

            // Extract tax percentage from string like "tax@18%"
            const match = taxType.match(/tax@(\d+)%/);
            if (match) {
                const taxRate = parseInt(match[1]);
                return baseAmount * (1 + taxRate / 100);
            }

            return baseAmount;
        };

        // Calculate charges with tax (if tax types are added)
        const freightCharges = calculateWithTax(formData.freight_charges || 0, formData.freight_type || "fixed");
        const pAndFCharges = calculateWithTax(formData.p_and_f_charges || 0, formData.pf_type || "fixed");

        // Calculate total before round off
        const totalBeforeRoundOff = subtotal + totalTax + freightCharges + pAndFCharges;

        // Apply round off
        let finalRoundOff = 0;
        if (roundOff.type === "plus") {
            finalRoundOff = roundOff.amount;
        } else if (roundOff.type === "minus") {
            finalRoundOff = -roundOff.amount;
        }

        const grandTotal = totalBeforeRoundOff + finalRoundOff;

        return {
            subtotal: Number(subtotal.toFixed(2)),
            totalTax: Number(totalTax.toFixed(2)),
            freightCharges: Number(freightCharges.toFixed(2)),
            pAndFCharges: Number(pAndFCharges.toFixed(2)),
            totalBeforeRoundOff: Number(totalBeforeRoundOff.toFixed(2)),
            roundOff: Number(finalRoundOff.toFixed(2)),
            grandTotal: Number(grandTotal.toFixed(2)),
        };
    };

    const totals = calculateTotals();

    // Handle round off amount change
    const handleRoundOffChange = (type: "plus" | "minus" | "none", amount: number) => {
        setRoundOff({
            type: type,
            amount: Number(amount.toFixed(2))
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!company?.id || !orderId) return;

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

                // Return object with unit_price
                return {
                    product_id: item.product_id,
                    description: item.description || '',
                    quantity: quantity,
                    unit: item.unit || 'unit',
                    unit_price: unitPrice,  // This is what backend expects
                    rate: unitPrice,
                    discount_percent: discountPercent,
                    gst_rate: gstRate,
                    discount_amount: discountAmount,
                    taxable_amount: taxableAmount,
                    tax_amount: taxAmount,
                    total_amount: totalAmount,
                    cgst_rate: gstRate / 2,
                    sgst_rate: gstRate / 2,
                    igst_rate: 0,
                    item_code: item.item_code || '',
                };
            });   // Prepare sales order data
            const salesOrderData = {
                company_id: company.id,
                customer_id: formData.customer_id,
                sales_order_date: formData.sales_order_date + "T00:00:00Z",
                expire_date: formData.expire_date ? formData.expire_date + "T00:00:00Z" : null,
                reference_no: formData.reference_no || null,
                reference_date: formData.reference_date ? formData.reference_date + "T00:00:00Z" : null,
                payment_terms: formData.payment_terms || null,
                sales_person_id: formData.sales_person_id || undefined,
                contact_person: formData.contact_person || null,
                notes: formData.notes || null,
                terms: formData.terms,
                other_charges: 0,
                discount_on_all: 0,
                freight_charges: Number(totals.freightCharges) || 0,
                p_and_f_charges: Number(totals.pAndFCharges) || 0,
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

            const response = await ordersApi.updateSalesOrder(company.id, orderId, salesOrderData as any);

            console.log('Sales order updated successfully:', response);
            router.push(`/sales/sales-orders`);

        } catch (error: any) {
            console.error('Error updating sales order:', error);

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
                alert('Failed to update sales order. Please try again.');
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
                        updated.description = selectedProduct.name;
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
                const response = await ordersApi.createSalesOrder(company!.id, test.data as any);
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

        // Find and set selected customer
        const customer = customers.find(c => c.id === customerId);
        setSelectedCustomer(customer);

        if (customerId) {
            // Fetch contact persons for this customer
            await fetchContactPersons(customerId, "");

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

    if (isLoadingOrder) {
        return (
            <div className="min-h-screen bg-gray-50 p-6 dark:bg-gray-dark">
                <div className="rounded-lg bg-white p-6 shadow-1 dark:bg-gray-dark">
                    <div className="flex items-center gap-3 text-sm text-dark-6 dark:text-gray-400">
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                        Loading sales order...
                    </div>
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
                            <span className="ml-1 font-medium text-dark dark:text-white md:ml-2">Edit Sales Order</span>
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
                <p className="text-dark-6">Update sales order with customer details and items</p>
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
                                            value={salesOrderCodeParts.prefix}
                                            className="flex-1 rounded-lg border border-stroke bg-gray-50 px-4 py-2.5 outline-none dark:border-dark-3 dark:bg-dark-2"
                                            readOnly
                                        />
                                        <input
                                            type="text"
                                            value={salesOrderCodeParts.sequence}
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
                                        value={contactPersonOptions.find(
                                            opt => opt.value === formData.contact_person || opt.name === formData.contact_person
                                        )}
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
                                            <th className="px-4 py-3 text-left text-sm font-medium text-dark-6">Item Code</th>

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
                                                        value={item.item_code || ''}  // Make sure to bind to item.item_code
                                                        onChange={(e) => updateItem(item.id, 'item_code', e.target.value)}  // Add onChange handler
                                                        className="w-full min-w-[150px] rounded border border-stroke bg-transparent px-3 py-1.5 outline-none focus:border-primary dark:border-dark-3"
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
                                                        value={item.unit_price || 0}  // Show unit_price
                                                        onChange={(e) => {
                                                            const value = parseFloat(e.target.value) || 0;
                                                            updateItem(item.id, 'unit_price', value);  // Update unit_price field
                                                        }}
                                                        className="w-24 rounded border border-stroke bg-transparent px-3 py-1.5 outline-none focus:border-primary dark:border-dark-3"
                                                        min="0"
                                                        step="0.01"
                                                        required
                                                    />
                                                </td><td className="px-4 py-3">
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
                                            <label className="mb-2 block text-sm font-medium text-dark dark:text-white">Freight Charges</label>
                                            <div className="flex gap-2">
                                                <input
                                                    type="number"
                                                    value={formData.freight_charges}
                                                    onChange={(e) => handleFormChange('freight_charges', parseFloat(e.target.value) || 0)}
                                                    className="flex-1 rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3"
                                                    min="0"
                                                    step="0.01"
                                                />
                                                <select
                                                    value={formData.freight_type || "tax@18%"}
                                                    onChange={(e) => handleFormChange('freight_type', e.target.value)}
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
                                                    value={formData.p_and_f_charges}
                                                    onChange={(e) => handleFormChange('p_and_f_charges', parseFloat(e.target.value) || 0)}
                                                    className="flex-1 rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3"
                                                    min="0"
                                                    step="0.01"
                                                />
                                                <select
                                                    value={formData.pf_type || "tax@18%"}
                                                    onChange={(e) => handleFormChange('pf_type', e.target.value)}
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
                                            <span className="text-dark-6">Freight Charges</span>
                                            <span className="font-medium text-dark dark:text-white">₹{totals.freightCharges.toLocaleString('en-IN')}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-dark-6">P & F Charges</span>
                                            <span className="font-medium text-dark dark:text-white">₹{totals.pAndFCharges.toLocaleString('en-IN')}</span>
                                        </div>

                                        <div className="border-t border-stroke pt-3 dark:border-dark-3">
                                            <div className="flex justify-between mb-3">
                                                <span className="font-semibold text-dark dark:text-white">Total before Round Off</span>
                                                <span className="font-bold text-dark dark:text-white">₹{totals.totalBeforeRoundOff.toLocaleString('en-IN')}</span>
                                            </div>

                                            {/* Round Off Controls */}
                                            <div className="flex justify-between items-center mb-2">
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
                                                                // Keep the current type, just update the amount
                                                                setRoundOff(prev => ({
                                                                    ...prev,
                                                                    amount: amount
                                                                }));
                                                            }}
                                                            className={`w-28 rounded border pl-8 pr-2 py-1.5 outline-none focus:border-primary dark:border-dark-3 ${roundOff.type === "plus" ? 'border-green-300 bg-green-50' :
                                                                roundOff.type === "minus" ? 'border-red-300 bg-red-50' :
                                                                    'border-stroke bg-transparent'
                                                                }`}
                                                            min="0"
                                                            step="0.01"
                                                            disabled={roundOff.type === "none"}
                                                        />
                                                    </div>
                                                    <span className={`font-medium ${roundOff.type === "plus" ? 'text-green-600' :
                                                        roundOff.type === "minus" ? 'text-red-600' :
                                                            'text-gray-600'
                                                        }`}>
                                                        {roundOff.type === "plus" ? "+₹" : roundOff.type === "minus" ? "-₹" : "₹"}
                                                        {roundOff.amount.toFixed(2)}
                                                    </span>
                                                </div>
                                            </div>




                                            {/* Round Off Amount Display */}
                                            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-dark-6">Applied Round Off:</span>
                                                    <span className={`font-medium ${roundOff.type === "plus" ? 'text-green-600' :
                                                        roundOff.type === "minus" ? 'text-red-600' :
                                                            'text-gray-600'
                                                        }`}>
                                                        {roundOff.type === "plus" ? '+₹' : roundOff.type === "minus" ? '-₹' : '₹'}
                                                        {totals.roundOff.toFixed(2)}
                                                    </span>
                                                </div>
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


                        {/* Action Buttons */}
                        <div className="rounded-lg p-6 dark:bg-gray-dark">
                            <div className="flex flex-wrap justify-center gap-4">
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="min-w-[180px] rounded-lg bg-green-600 px-6 py-3 font-medium text-white transition hover:bg-green-700 disabled:opacity-50"
                                >
                                    {isSubmitting ? "Saving..." : "Update Sales Order"}
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
