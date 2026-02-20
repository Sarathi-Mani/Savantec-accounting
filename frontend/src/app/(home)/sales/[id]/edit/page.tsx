"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import { customersApi, productsApi, invoicesApi, getErrorMessage } from "@/services/api";
import { salesmenApi } from "@/services/api"; // Add this import
import { employeesApi } from "@/services/api"; // Add this import
import Select from 'react-select';
import { useRef } from "react";


// Add this component before the AddSalesPage function
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

            /* ENTER KEY FIX */
            onKeyDown={(e) => {
                if (e.key === "Enter") {
                    e.preventDefault();

                    const menuOptions = selectRef.current?.props?.options;
                    const inputValue =
                        selectRef.current?.select?.state?.inputValue;

                    if (menuOptions?.length && inputValue) {
                        // pick first matched option
                        onChange(menuOptions[0].product);
                        selectRef.current.blur();
                    }
                }
            }}

            /* Portal fix */
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




export default function EditSalesPage() {
    const router = useRouter();
    const params = useParams();
    const invoiceId = params.id as string;
    const { company, user } = useAuth();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showTerms, setShowTerms] = useState(false);
    const [showPreviousPayments, setShowPreviousPayments] = useState(false);
    const [showOtherFields, setShowOtherFields] = useState(false);
    const [nextInvoiceNumber, setNextInvoiceNumber] = useState("");
    const [loadingInvoiceNumber, setLoadingInvoiceNumber] = useState(false);
    const [loadingInvoice, setLoadingInvoice] = useState(true);
    const [invoiceError, setInvoiceError] = useState<string | null>(null);
    const [invoiceStatus, setInvoiceStatus] = useState<string>("");

    const [productSearch, setProductSearch] = useState("");
    const [searchResults, setSearchResults] = useState<any[]>([]);

    const [showPaymentSection, setShowPaymentSection] = useState(false);
    const [paymentData, setPaymentData] = useState({
        advanceAmount: 0.00,
        adjustAdvancePayment: false,
        amount: 0,
        paymentType: "",
        account: "",
        paymentNote: "",
    });

    // State for dropdown data
    const [customers, setCustomers] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]);
    const [salesmen, setSalesmen] = useState<any[]>([]); // Changed from salesman to salesmen
    const [loading, setLoading] = useState({
        customers: false,
        products: false,
        salesmen: false,
    });



    // Indian states data (you can also fetch from your GST API)
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

    const formatDateInput = (value?: string | Date | null) => {
        if (!value) return "";
        const date = new Date(value);
        if (isNaN(date.getTime())) return "";
        return date.toISOString().split("T")[0];
    };

    // Form state - update to match your Invoice model
    const [formData, setFormData] = useState({
        // Basic details matching Invoice model
        customer_id: "",
        invoice_date: new Date().toISOString().split('T')[0],
        due_date: "",
        roundOff: 0,
        invoice_type: "b2b",
        voucher_type: "sales", // Default to B2B as per your InvoiceType enum

        // GST details
        place_of_supply: "",
        place_of_supply_name: "",
        is_reverse_charge: false,

        // Sales pipeline tracking
        sales_person_id: "",
        contact_id: "",

        // Additional fields
        notes: "",
        terms: `1. All payments should be made direct to the company or its authorized representative by cheque/RTGS.
2. All disputes subject to Chennai Jurisdiction.
3. Goods once sold will not be taken back.`,

        // The following fields will be auto-calculated:
        subtotal: 0,
        discount_amount: 0,
        cgst_amount: 0,
        sgst_amount: 0,
        igst_amount: 0,
        total_tax: 0,
        total_amount: 0,


        country: "India",
        city: "",
        postcode: "",
        address: "",
        referenceNo: "",
        freightCharges: 0,
        freightType: "tax@18%",
        pfCharges: 0,
        pfType: "tax@18%",
        couponCode: "",
        couponType: "",
        couponValue: 0,
        discountOnAll: 0,
        discountType: "percentage",
        note: "",
        deliveryNote: "",
        paymentTerms: "",
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

    // Sales items state - update to match InvoiceItem model
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
            cgst_rate: 9,  // Assuming CGST is half of GST
            sgst_rate: 9,  // Assuming SGST is half of GST
            igst_rate: 0,  // For inter-state
            taxable_amount: 0,
            total_amount: 0,
        },
    ]);

    // Previous payments state
    const [previousPayments, setPreviousPayments] = useState<any[]>([]);

    const loadInvoice = async () => {
        if (!company?.id || !invoiceId) return;

        setLoadingInvoice(true);
        setInvoiceError(null);
        try {
            const invoice = await invoicesApi.get(company.id, invoiceId);
            setInvoiceStatus(invoice.status || "");
            setNextInvoiceNumber(invoice.invoice_number || "");

            setFormData(prev => ({
                ...prev,
                customer_id: invoice.customer_id || "",
                invoice_date: formatDateInput(invoice.invoice_date),
                due_date: formatDateInput(invoice.due_date),
                roundOff: Number(invoice.round_off || 0),
                invoice_type: invoice.invoice_type || "b2b",
                voucher_type: invoice.voucher_type || "sales",
                place_of_supply: invoice.place_of_supply || "",
                place_of_supply_name: invoice.place_of_supply_name || "",
                is_reverse_charge: invoice.is_reverse_charge || false,
                sales_person_id: invoice.sales_person_id || "",
                contact_id: invoice.contact_id || "",
                notes: invoice.notes || "",
                terms: invoice.terms || prev.terms,
                country: invoice.shipping_country || "India",
                city: invoice.shipping_city || "",
                postcode: invoice.shipping_zip || "",
                address: invoice.shipping_address || "",
                referenceNo: invoice.reference_no || "",
                freightCharges: Number(invoice.freight_charges || 0),
                pfCharges: Number(invoice.packing_forwarding_charges || 0),
                couponCode: invoice.coupon_code || "",
                couponValue: Number(invoice.coupon_value || 0),
                discountOnAll: Number(invoice.discount_on_all || 0),
                discountType: invoice.discount_type || "percentage",
                deliveryNote: invoice.delivery_note || "",
                paymentTerms: invoice.payment_terms || "",
                supplierRef: invoice.supplier_ref || "",
                otherReferences: invoice.other_references || "",
                buyerOrderNo: invoice.buyer_order_no || "",
                buyerOrderDate: formatDateInput(invoice.buyer_order_date),
                despatchDocNo: invoice.despatch_doc_no || "",
                deliveryNoteDate: formatDateInput(invoice.delivery_note_date),
                despatchedThrough: invoice.despatched_through || "",
                destination: invoice.destination || "",
                termsOfDelivery: invoice.terms_of_delivery || "",
            }));

            if (invoice.items && invoice.items.length > 0) {
                setItems(
                    invoice.items.map((item: any, index: number) => ({
                        id: index + 1,
                        server_id: item.id,
                        product_id: item.product_id || "",
                        description: item.description || "",
                        item_code: item.item_code || "",
                        hsn_code: item.hsn_code || "",
                        quantity: Number(item.quantity || 0),
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
        } catch (error: any) {
            setInvoiceError(`Failed to load invoice: ${error?.message || "Unknown error"}`);
        } finally {
            setLoadingInvoice(false);
        }
    };

    // Load data on component mount
    useEffect(() => {
        if (company?.id) {
            loadCustomers();
            loadProducts();
            loadSalesmen();
            loadInvoice();
        }
    }, [company?.id, invoiceId]);

    useEffect(() => {
        const loadNextInvoiceNumber = async (voucherType = "sales") => {
            if (!company?.id) return;

            try {
                setLoadingInvoiceNumber(true);
                const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;

                // Backend API call
                const response = await fetch(
                    `${process.env.NEXT_PUBLIC_API_URL}/companies/${company.id}/next-invoice-number?voucher_type=${voucherType}`,
                    {
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json',
                        },
                    }
                );

                if (response.ok) {
                    const data = await response.json();
                    let invoiceNumber = data.invoice_number || "";

                    // TEMPORARY FIX: If backend doesn't return correct format for service
                    if (voucherType === "service" && !invoiceNumber.includes("SER")) {
                        // Extract number from INV-00189 format
                        const match = invoiceNumber.match(/\d+$/);
                        if (match) {
                            invoiceNumber = `INV-SER-${match[0]}`;
                        }
                    }

                    setNextInvoiceNumber(invoiceNumber);
                }
            } catch (error) {
                console.error("Failed to load next invoice number:", error);
            } finally {
                setLoadingInvoiceNumber(false);
            }
        };

        if (!invoiceId) {
            loadNextInvoiceNumber(formData.voucher_type);
        }
    }, [company?.id, formData.voucher_type, invoiceId]);

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

            // Check if we have a token
            const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
            if (!token || !company?.id) {
                console.error("No access token or company ID found");
                return;
            }

            // Try to fetch sales engineers from the correct endpoint
            try {
                const salesEngineersUrl = `${process.env.NEXT_PUBLIC_API_URL}/companies/${company.id}/sales-engineers`;

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
                if (data && Array.isArray(data)) {
                    // Format the data to match your frontend structure
                    const formattedSalesmen = data.map(engineer => ({
                        id: engineer.id,
                        name: engineer.full_name || engineer.name || 'Unnamed Engineer',
                        email: engineer.email || '',
                        phone: engineer.phone || '',
                        designation: engineer.designation_name || engineer.designation || 'Sales Engineer',
                        employee_code: engineer.employee_code || ''
                    }));

                    setSalesmen(formattedSalesmen);
                    console.log(`Loaded ${formattedSalesmen.length} sales engineers`);
                } else {
                    console.warn("No sales engineers found or invalid data format");
                    setSalesmen([]);
                }
            } catch (error: any) {
                console.error("Failed to fetch sales engineers:", error);

                // Fallback: Try to get from employees API and filter
                try {
                    const employees = await employeesApi.list(company.id);
                    console.log("Employees API response for fallback:", employees);

                    // Filter employees who are sales people
                    const salesEmployees = employees.filter(emp => {
                        // Safely get designation as string
                        const designation = emp.designation ?
                            (typeof emp.designation === 'string' ? emp.designation :
                                typeof emp.designation === 'object' ? (emp.designation as any).toString() : '') :
                            '';

                        // Safely get employee_type as string
                        const employeeType = emp.employee_type ?
                            (typeof emp.employee_type === 'string' ? emp.employee_type :
                                typeof emp.employee_type === 'object' ? (emp.employee_type as any).toString() : '') :
                            '';

                        const designationStr = designation.toLowerCase();
                        const employeeTypeStr = employeeType.toLowerCase();

                        return designationStr.includes('sales') ||
                            employeeTypeStr.includes('sales');
                    });

                    const formattedSalesmen = salesEmployees.map(emp => ({
                        id: emp.id,
                        name: emp.full_name || 'Unnamed Engineer',
                        email: emp.email || '',
                        phone: emp.phone || '',
                        designation: emp.designation || emp.employee_type || 'Sales Engineer',
                        employee_code: emp.employee_code || ''
                    }));

                    setSalesmen(formattedSalesmen);
                    console.log(`Using ${formattedSalesmen.length} filtered employees as salesmen`);
                } catch (fallbackError) {
                    console.error("Also failed to load employees:", fallbackError);
                    setSalesmen([]);
                }
            }
        } catch (error: any) {
            console.error("Failed to load salesmen:", error);
            setSalesmen([]);
        } finally {
            setLoading(prev => ({ ...prev, salesmen: false }));
        }
    };


    const calculateTotals = () => {
        let subtotal = 0;
        let totalTax = 0;
        let cgstTotal = 0;
        let sgstTotal = 0;
        let igstTotal = 0;
        let totalItemDiscount = 0;

        // Calculate totals WITHOUT updating items state
        items.forEach(item => {
            // Calculate item total before discount
            const itemTotal = item.quantity * item.unit_price;

            // Calculate discount amount
            const discount = item.discount_percent > 0 ?
                itemTotal * (item.discount_percent / 100) : 0;

            // Taxable amount (after discount)
            const taxable = itemTotal - discount;

            // Calculate tax based on GST rate
            const tax = taxable * (item.gst_rate / 100);

            // For intra-state (CGST+SGST)
            if (formData.place_of_supply === company?.state_code) {
                cgstTotal += tax / 2;
                sgstTotal += tax / 2;
            } else {
                // For inter-state (IGST)
                igstTotal += tax;
            }

            subtotal += taxable;
            totalTax += tax;
            totalItemDiscount += discount;
        });

        // Calculate additional charges with tax
        const freightBase = formData.freightCharges || 0;
        const pfBase = formData.pfCharges || 0;
        const couponValue = formData.couponValue || 0;
        const discountOnAll = formData.discountOnAll || 0;

        // Function to apply tax based on selected type
        const calculateWithTax = (baseAmount: number, taxType: string) => {
            if (taxType === 'fixed' || taxType === 'percentage') {
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

        // Calculate charges with tax
        const freightCharges = calculateWithTax(freightBase, formData.freightType);
        const pfCharges = calculateWithTax(pfBase, formData.pfType);

        // Calculate discount on all based on type
        const discountAllAmount = formData.discountType === 'percentage'
            ? subtotal * (discountOnAll / 100)
            : discountOnAll;

        // Calculate totals step by step
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
            totalBeforeCharges: Number(totalAfterTax.toFixed(2)),
            freight: Number(freightCharges.toFixed(2)),
            pf: Number(pfCharges.toFixed(2)),
            couponDiscount: Number(couponValue.toFixed(2)),
            discountAll: Number(discountAllAmount.toFixed(2)),
            roundOff: Number(formData.roundOff || 0),
            roundOffDirection: formData.roundOff >= 0 ? 'positive' : 'negative',
            grandTotal: Number(grandTotal.toFixed(2)),
            totalAfterCharges: Number(totalAfterCharges.toFixed(2)),
            totalAfterCoupon: Number(totalAfterCoupon.toFixed(2)),
            totalAfterDiscountAll: Number(totalAfterDiscountAll.toFixed(2)),
        };
    };
    // Calculate totals once
    const totals = calculateTotals();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!company?.id) return;

        setIsSubmitting(true);
        try {
            // Get selected customer for denormalized data
            const selectedCustomer = customers.find(c => c.id === formData.customer_id);

            // Prepare items with proper structure (only fields backend accepts)
            const filteredItems = items.filter(item =>
                (item.description && item.description.trim()) || item.product_id
            );

            if (filteredItems.length === 0) {
                alert("Please add at least one item.");
                setIsSubmitting(false);
                return;
            }

            for (const item of filteredItems) {
                if (!item.description || !item.description.trim()) {
                    alert("Item description is required.");
                    setIsSubmitting(false);
                    return;
                }
                if (Number(item.quantity) <= 0) {
                    alert("Item quantity must be greater than 0.");
                    setIsSubmitting(false);
                    return;
                }
                if (Number(item.unit_price) <= 0) {
                    alert("Item unit price must be greater than 0.");
                    setIsSubmitting(false);
                    return;
                }
            }

            const toNumber = (value: any, fallback = 0) => {
                const num = Number(value);
                return Number.isFinite(num) ? num : fallback;
            };

            const preparedItems = filteredItems.map(item => ({
                product_id: item.product_id || undefined,
                description: item.description || "",
                hsn_code: item.hsn_code || "",
                quantity: toNumber(item.quantity, 1),
                unit: item.unit || "unit",
                unit_price: toNumber(item.unit_price, 0),
                discount_percent: toNumber(item.discount_percent, 0),
                gst_rate: toNumber(item.gst_rate, 0),
            }));

            // Prepare invoice data with ALL required fields
            const invoiceData = {
                // Required fields
                customer_id: formData.customer_id,
                voucher_type: formData.voucher_type || "sales",
                invoice_date: new Date(formData.invoice_date).toISOString(),
                invoice_type: formData.invoice_type || "b2b",
                invoice_number: nextInvoiceNumber,

                // GST Details
                place_of_supply: formData.place_of_supply || company?.state_code || "",
                place_of_supply_name: INDIAN_STATES.find(s => s.code === formData.place_of_supply)?.name || company?.state || "",
                is_reverse_charge: formData.is_reverse_charge || false,

                // Financial data
                round_off: Number(formData.roundOff || 0),
                subtotal: Number(totals.subtotal || 0),
                discount_amount: Number(totals.discountAll || 0),
                cgst_amount: Number(totals.cgstTotal || 0),
                sgst_amount: Number(totals.sgstTotal || 0),
                igst_amount: Number(totals.igstTotal || 0),
                total_tax: Number(totals.totalTax || 0),
                total_amount: Number(totals.grandTotal || 0),

                // Dates
                due_date: formData.due_date ? new Date(formData.due_date).toISOString() : null,

                // Sales pipeline
                sales_person_id: formData.sales_person_id || null,
                contact_id: formData.contact_id || null,

                // Shipping Address
                shipping_address: formData.address || "",
                shipping_city: formData.city || "",
                shipping_state: formData.place_of_supply_name || INDIAN_STATES.find(s => s.code === formData.place_of_supply)?.name || "",
                shipping_country: formData.country || "India",
                shipping_zip: formData.postcode || "",

                // Additional charges
                freight_charges: Number(formData.freightCharges || 0),
                packing_forwarding_charges: Number(formData.pfCharges || 0),
                coupon_code: formData.couponCode || "",
                coupon_value: Number(formData.couponValue || 0),
                discount_on_all: Number(formData.discountOnAll || 0),
                discount_type: formData.discountType || "percentage",

                // References and notes
                reference_no: formData.referenceNo || "",
                delivery_note: formData.deliveryNote || "",
                payment_terms: formData.paymentTerms || "",
                supplier_ref: formData.supplierRef || "",
                other_references: formData.otherReferences || "",
                buyer_order_no: formData.buyerOrderNo || "",
                buyer_order_date: formData.buyerOrderDate || null,
                despatch_doc_no: formData.despatchDocNo || "",
                delivery_note_date: formData.deliveryNoteDate || null,
                despatched_through: formData.despatchedThrough || "",
                destination: formData.destination || "",
                terms_of_delivery: formData.termsOfDelivery || "",

                // Notes and terms
                notes: formData.notes || "",
                terms: formData.terms || "",

                // Items
                items: preparedItems,

                // Denormalized customer info
                ...(selectedCustomer ? {
                    customer_name: selectedCustomer.name || "",
                    customer_gstin: selectedCustomer.gstin || selectedCustomer.tax_number || "",
                    customer_phone: selectedCustomer.phone || selectedCustomer.contact || "",
                    customer_state: selectedCustomer.billing_state || selectedCustomer.state || "",
                    customer_state_code: selectedCustomer.billing_state_code || selectedCustomer.state_code || "",
                } : {}),

                // Payment data
                ...(paymentData.amount > 0 ? {
                    payment_type: paymentData.paymentType,
                    payment_account: paymentData.account,
                    payment_note: paymentData.paymentNote,
                    adjust_advance_payment: paymentData.adjustAdvancePayment,
                } : {}),
            };

            console.log("Invoice data being sent:", JSON.stringify(invoiceData, null, 2));

            // Call the API
            if (invoiceStatus && invoiceStatus !== "draft") {
                alert("Only draft invoices can be edited.");
                setIsSubmitting(false);
                return;
            }

            const response = await invoicesApi.update(company.id, invoiceId, invoiceData);

            console.log('Sale updated successfully:', response);
            router.push(`/sales/${invoiceId}`);

        } catch (error: any) {
            console.error("Error updating invoice:", error);

            // Log detailed error information
            if (error.response) {
                console.error("Response error:", error.response.data);
                console.error("Response status:", error.response.status);
            }

            const message = getErrorMessage(error, "Failed to update invoice");
            alert(message);
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
                            updated.unit_price = selectedProduct.unit_price || 0;
                            updated.gst_rate = parseFloat(selectedProduct.gst_rate) || 18;
                            updated.hsn_code = selectedProduct.hsn_code || selectedProduct.hsn;
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

                    // Set CGST/SGST/IGST rates
                    if (formData.place_of_supply === company?.state_code) {
                        // Intra-state
                        updated.cgst_rate = updated.gst_rate / 2;
                        updated.sgst_rate = updated.gst_rate / 2;
                        updated.igst_rate = 0;
                    } else {
                        // Inter-state
                        updated.cgst_rate = 0;
                        updated.sgst_rate = 0;
                        updated.igst_rate = updated.gst_rate;
                    }

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

        if (field === 'voucher_type') {
            // Keep existing invoice number on edit
        }

        // When place of supply changes, update item tax calculations
        if (field === 'place_of_supply') {
            setItems(items.map(item => {
                const updated = { ...item };
                if (value === company?.state_code) {
                    // Intra-state
                    updated.cgst_rate = updated.gst_rate / 2;
                    updated.sgst_rate = updated.gst_rate / 2;
                    updated.igst_rate = 0;
                } else {
                    // Inter-state
                    updated.cgst_rate = 0;
                    updated.sgst_rate = 0;
                    updated.igst_rate = updated.gst_rate;
                }
                return updated;
            }));
        }

        // When customer is selected, auto-fill place of supply
        if (field === 'customer_id' && value) {
            const selectedCustomer = customers.find(c => c.id === value);
            if (selectedCustomer) {
                const customerState = selectedCustomer.billing_state_code ||
                    selectedCustomer.state_code;
                setFormData(prev => ({
                    ...prev,
                    place_of_supply: customerState || company?.state_code || "",
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

        const results = products.filter(p => {
            // Safely get product name as string
            const productName = p?.name ?
                (typeof p.name === 'string' ? p.name :
                    typeof p.name === 'object' ? (p.name as any).toString() : '') : '';

            // Safely get SKU as string
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

    if (loadingInvoice) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            </div>
        );
    }

    if (invoiceError) {
        return (
            <div className="rounded-lg bg-white p-8 text-center shadow-1 dark:bg-gray-dark">
                <p className="text-red-600 dark:text-red-400">{invoiceError}</p>
                <Link href="/sales/sales-list" className="mt-4 inline-block text-primary hover:underline">
                    Back to Sales
                </Link>
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
                            <Link href="/sales/sales-list" className="ml-1 text-dark-6 hover:text-primary dark:text-gray-400 dark:hover:text-white md:ml-2">
                                Sales List
                            </Link>
                        </div>
                    </li>
                    <li>
                        <div className="flex items-center">
                            <svg className="h-4 w-4 text-dark-6 dark:text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                            </svg>
                            <span className="ml-1 font-medium text-dark dark:text-white md:ml-2">Edit Sales</span>
                        </div>
                    </li>
                    <li aria-current="page">
                        <div className="flex items-center">
                            <svg className="h-4 w-4 text-dark-6 dark:text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                            </svg>
                            <span className="ml-1 font-medium text-primary dark:text-primary md:ml-2">Sales</span>
                        </div>
                    </li>
                </ol>
            </nav>

            {/* Page Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-dark dark:text-white">Sales – Add / Update Sales</h1>
                <p className="text-dark-6">Update sales invoice with customer details and items</p>
            </div>

            <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                    {/* Left Column - Main Form */}
                    <div className="lg:col-span-3 space-y-6">
                        {/* SECTION 1: Sales Basic Details */}
                        <div className="rounded-lg bg-white p-6 shadow-1 dark:bg-gray-dark">
                            <h2 className="mb-4 text-lg font-semibold text-dark dark:text-white">Sales Basic Details</h2>
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <div>
                                    <SelectField
                                        label="Company"
                                        name="company_id"
                                        value={company?.id || ""}
                                        onChange={() => { }} // Read-only since only one company is selected
                                        options={company ? [{ value: company.id, label: company.name }] : []}
                                        required={true}
                                        placeholder="Select Company"
                                    />
                                </div>

                                <div>
                                    <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                                        Sales Code <span className="text-red-500">*</span>
                                    </label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={loadingInvoiceNumber ? "Loading..." : nextInvoiceNumber}
                                            className="flex-1 rounded-lg border border-stroke bg-gray-50 px-4 py-2.5 outline-none dark:border-dark-3 dark:bg-dark-2"
                                            readOnly
                                            disabled={loadingInvoiceNumber}
                                        />
                                    </div>
                                    {loadingInvoiceNumber && (
                                        <p className="mt-1 text-sm text-gray-500">Loading next invoice number...</p>
                                    )}
                                </div>
                                {/* Add this field after the Sales Date field */}
                                <div>
                                    <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                                        Voucher Type <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        value={formData.voucher_type}
                                        onChange={(e) => handleFormChange('voucher_type', e.target.value)}
                                        className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3"
                                        required
                                    >
                                        <option value="sales">Sales</option>
                                        <option value="service">Service</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                                        Sales Date <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="date"
                                        value={formData.invoice_date}
                                        onChange={(e) => handleFormChange('invoice_date', e.target.value)}
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
                                            label: `${customer.name} ${customer.email ? `(${customer.email})` : ''} ${customer.mobile ? `(${customer.mobile})` : ''}`
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
                                        value={formData.referenceNo || ""}
                                        onChange={(e) => setFormData({ ...formData, referenceNo: e.target.value })}
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
                                <div className="md:col-span-2">
                                    <div>
                                        <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                                            Salesman <span className="text-red-500">*</span>
                                        </label>

                                        {/* Debug info */}
                                        <div className="mb-2 text-xs text-gray-500 dark:text-gray-400">
                                            {loading.salesmen ? (
                                                <span>Loading salesmen...</span>
                                            ) : salesmen.length > 0 ? (
                                                <span>✓ {salesmen.length} salesman available</span>
                                            ) : (
                                                <span className="text-yellow-600">No salesmen found</span>
                                            )}
                                        </div>

                                        <Select
                                            options={salesmen
                                                .filter(salesman => salesman.name && salesman.name.trim())
                                                .map((salesman) => {
                                                    const label = salesman.designation
                                                        ? `${salesman.name} (${salesman.email}) ${salesman.phone ? - salesman.phone : ''}`.trim()
                                                        : salesman.name;


                                                    return {
                                                        value: salesman.id,
                                                        label: label,
                                                        salesman: salesman
                                                    };
                                                })}
                                            value={salesmen
                                                .filter(salesman => salesman.name && salesman.name.trim())
                                                .map((salesman) => {
                                                    const label = salesman.designation
                                                        ? `${salesman.name} (${salesman.designation})`
                                                        : salesman.name;

                                                    return {
                                                        value: salesman.id,
                                                        label: label,
                                                        salesman: salesman
                                                    };
                                                })
                                                .find(opt => opt.value === formData.sales_person_id)}
                                            onChange={(option) => {
                                                handleFormChange('sales_person_id', option?.value || "");
                                                if (option?.salesman) {
                                                    console.log("Selected sales engineer:", option.salesman);
                                                }
                                            }}
                                            placeholder={loading.salesmen ? "Loading sales engineers..." : "Select Sales Engineer"}
                                            className="react-select-container"
                                            classNamePrefix="react-select"
                                            isLoading={loading.salesmen}
                                            isClearable
                                            isSearchable
                                            noOptionsMessage={() =>
                                                loading.salesmen ? "Loading..." : "No sales engineers available"
                                            }
                                            styles={{
                                                control: (base: any, state: any) => ({
                                                    ...base,
                                                    minHeight: "42px",
                                                    borderRadius: "0.5rem",
                                                    borderWidth: "1px",
                                                    borderStyle: "solid",
                                                    borderColor: salesmen.length > 0 ? '#10b981' : '#d1d5db',
                                                    backgroundColor: state.isFocused ? '#f3f4f6' : base.backgroundColor,
                                                    '&:hover': {
                                                        borderColor: salesmen.length > 0 ? '#059669' : '#9ca3af',
                                                    },
                                                    boxShadow: state.isFocused
                                                        ? "0 0 0 2px rgba(99,102,241,0.4)"
                                                        : "none",
                                                }),
                                                menu: (base: any) => ({
                                                    ...base,
                                                    zIndex: 9999,
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
                                            }}
                                        />

                                        {!loading.salesmen && salesmen.length === 0 && (
                                            <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded">
                                                <p className="text-xs text-yellow-700 dark:text-yellow-300">
                                                    No sales engineers found. Please add sales engineers first in the employee management section.
                                                </p>
                                                <button
                                                    type="button"
                                                    onClick={() => router.push("/employees")}
                                                    className="mt-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
                                                >
                                                    Go to Employees →
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* SECTION 2: Shipping Address */}
                        <div className="rounded-lg bg-white p-6 shadow-1 dark:bg-gray-dark">
                            <h2 className="mb-4 text-lg font-semibold text-dark dark:text-white">Shipping Address</h2>
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <div>
                                    <SelectField
                                        label="Country"
                                        name="country"
                                        value={formData.country}
                                        onChange={(name, value) => setFormData({ ...formData, [name]: value })}
                                        options={[
                                            { value: "India", label: "India" },
                                            { value: "United States", label: "United States" },
                                            { value: "United Kingdom", label: "United Kingdom" },
                                            { value: "Canada", label: "Canada" },
                                            { value: "Australia", label: "Australia" },
                                            { value: "United Arab Emirates", label: "United Arab Emirates" },
                                            { value: "Saudi Arabia", label: "Saudi Arabia" },
                                            { value: "Qatar", label: "Qatar" },
                                            { value: "Kuwait", label: "Kuwait" },
                                            { value: "Oman", label: "Oman" },
                                            { value: "Singapore", label: "Singapore" },
                                            { value: "Malaysia", label: "Malaysia" },
                                            { value: "Thailand", label: "Thailand" },
                                            { value: "Indonesia", label: "Indonesia" },
                                            { value: "Philippines", label: "Philippines" },
                                            { value: "China", label: "China" },
                                            { value: "Japan", label: "Japan" },
                                            { value: "South Korea", label: "South Korea" },
                                            { value: "Germany", label: "Germany" },
                                            { value: "France", label: "France" },
                                            { value: "Italy", label: "Italy" },
                                            { value: "Netherlands", label: "Netherlands" },
                                            { value: "South Africa", label: "South Africa" },
                                            { value: "Nigeria", label: "Nigeria" },
                                            { value: "Kenya", label: "Kenya" },
                                            { value: "Brazil", label: "Brazil" },
                                            { value: "Argentina", label: "Argentina" },
                                            { value: "Sri Lanka", label: "Sri Lanka" },
                                            { value: "Bangladesh", label: "Bangladesh" },
                                            { value: "Nepal", label: "Nepal" }
                                        ]}
                                        placeholder="Select Country"
                                    />
                                </div>
                                <div>
                                    <SelectField
                                        label="State"
                                        name="place_of_supply"
                                        value={formData.place_of_supply}
                                        onChange={handleFormChange}
                                        options={INDIAN_STATES.map(state => ({
                                            value: state.code,
                                            label: `${state.name} (${state.code})`
                                        }))}
                                        required={true}
                                        placeholder="Select State"
                                    />
                                </div>
                                <div>
                                    <label className="mb-2 block text-sm font-medium text-dark dark:text-white">City</label>
                                    <input
                                        type="text"
                                        value={formData.city}
                                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                        className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3"
                                    />
                                </div>
                                <div>
                                    <label className="mb-2 block text-sm font-medium text-dark dark:text-white">Postcode</label>
                                    <input
                                        type="text"
                                        value={formData.postcode}
                                        onChange={(e) => setFormData({ ...formData, postcode: e.target.value })}
                                        className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3"
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="mb-2 block text-sm font-medium text-dark dark:text-white">Address</label>
                                    <textarea
                                        value={formData.address}
                                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                        rows={3}
                                        className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* SECTION 3: Sales Items Table */}
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
                            </div>{/* Items Table */}
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-stroke dark:border-dark-3">
                                            <th className="px-4 py-3 text-left text-sm font-medium text-dark-6">Item Name</th>
                                            <th className="px-4 py-3 text-left text-sm font-medium text-dark-6">Item Code</th>
                                            <th className="px-4 py-3 text-left text-sm font-medium text-dark-6">HSN</th>
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

                                                                    const gstRate = Number(product.gst_rate) || i.gst_rate || 18;
                                                                    const qty = i.quantity || 1;

                                                                    const taxable = qty * unitPrice;
                                                                    const tax = taxable * (gstRate / 100);

                                                                    return {
                                                                        ...i,
                                                                        product_id: product.id,
                                                                        item_code: i.item_code || "",
                                                                        description: product.name,

                                                                        hsn_code: product.hsn_code || product.hsn || "",
                                                                        unit_price: unitPrice,
                                                                        gst_rate: gstRate,
                                                                        discount_amount: 0,
                                                                        taxable_amount: taxable,
                                                                        total_amount: taxable + tax,
                                                                        ...(formData.place_of_supply === company?.state_code ? {
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

                                                {/* HSN Code Input (Auto-filled but editable) */}
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

                        {/* SECTION 4: Charges & Discounts */}
                        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                            {/* Left side - Charges & Discounts */}
                            <div className="lg:col-span-2">
                                <div className="rounded-lg bg-white p-6 shadow-1 dark:bg-gray-dark">
                                    <h2 className="mb-4 text-lg font-semibold text-dark dark:text-white">Charges & Discounts</h2>
                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                        {/* In the Charges & Discounts section */}
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
                                            {formData.freightType.startsWith('tax@') && formData.freightCharges > 0 && (
                                                <div className="mt-1 text-xs text-dark-6">
                                                    Base: ₹{formData.freightCharges.toFixed(2)} + {formData.freightType.replace('tax@', '')} tax = ₹{totals.freight.toFixed(2)}
                                                </div>
                                            )}
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
                                            {formData.pfType.startsWith('tax@') && formData.pfCharges > 0 && (
                                                <div className="mt-1 text-xs text-dark-6">
                                                    Base: ₹{formData.pfCharges.toFixed(2)} + {formData.pfType.replace('tax@', '')} tax = ₹{totals.pf.toFixed(2)}
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <label className="mb-2 block text-sm font-medium text-dark dark:text-white">P & F Charges</label>
                                            <div className="flex gap-2">
                                                <input
                                                    type="number"
                                                    value={formData.pfCharges}
                                                    onChange={(e) => setFormData({ ...formData, pfCharges: parseFloat(e.target.value) })}
                                                    className="flex-1 rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3"
                                                    min="0"
                                                />
                                                <select
                                                    value={formData.pfType}
                                                    onChange={(e) => setFormData({ ...formData, pfType: e.target.value })}
                                                    className="w-24 rounded-lg border border-stroke bg-transparent px-2 py-2.5 outline-none focus:border-primary dark:border-dark-3"
                                                >
                                                    <option value="fixed">Fixed</option>
                                                    <option value="tax@18%">Tax@18%</option>
                                                    <option value="tax@0%">Tax@0%</option>
                                                    <option value="tax@5%">Tax@5%</option>
                                                    <option value="tax@28%">Tax@28%</option>
                                                    <option value="tax@12%">Tax@12%</option>
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
                                                    className="w-24 rounded-lg border border-stroke bg-transparent px-2 py-2.5 outline-none focus:border-primary dark:border-dark-3"
                                                >
                                                    <option value="percentage">%</option>
                                                    <option value="fixed">Fixed</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="mb-2 block text-sm font-medium text-dark dark:text-white">Note</label>
                                            <textarea
                                                value={formData.note}
                                                onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                                                rows={3}
                                                className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Right side - Total Summary */}
                            <div className="lg:col-span-1">
                                {/* SECTION 5: Total Summary */}
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
                                                {/* - Button: Makes amount negative */}
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const currentValue = Math.abs(formData.roundOff || 0);
                                                        // Set to negative version of the absolute value
                                                        setFormData(prev => ({
                                                            ...prev,
                                                            roundOff: -currentValue
                                                        }));
                                                    }}
                                                    className="p-2 rounded-lg bg-red-50 hover:bg-red-100 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400"
                                                    title="Make amount negative (subtract from total)"
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                                                    </svg>
                                                </button>

                                                {/* Input Field */}
                                                <div className="relative">
                                                    <input
                                                        type="number"
                                                        value={Math.abs(formData.roundOff || 0)} // Show absolute value only
                                                        onChange={(e) => {
                                                            const inputValue = parseFloat(e.target.value) || 0;
                                                            const currentSign = formData.roundOff >= 0 ? 1 : -1;
                                                            // Apply current sign to the new input value
                                                            setFormData(prev => ({
                                                                ...prev,
                                                                roundOff: currentSign * inputValue
                                                            }));
                                                        }}
                                                        className="w-32 px-10 py-2 text-center border border-stroke dark:border-dark-3 rounded-lg bg-transparent outline-none focus:border-primary"
                                                        step="0.01"
                                                        min="0"
                                                    />
                                                    {/* Left sign indicator */}
                                                    <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 pointer-events-none">
                                                        {formData.roundOff >= 0 ? '+' : '-'}
                                                    </div>
                                                    {/* Right currency symbol */}
                                                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none">
                                                        ₹
                                                    </div>
                                                </div>

                                                {/* + Button: Makes amount positive */}
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const currentValue = Math.abs(formData.roundOff || 0);
                                                        // Set to positive version of the absolute value
                                                        setFormData(prev => ({
                                                            ...prev,
                                                            roundOff: currentValue
                                                        }));
                                                    }}
                                                    className="p-2 rounded-lg bg-green-50 hover:bg-green-100 dark:bg-green-900/30 dark:hover:bg-green-900/50 text-green-600 dark:text-green-400"
                                                    title="Make amount positive (add to total)"
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                                    </svg>
                                                </button>

                                                {/* Display with sign */}
                                                <div className={`min-w-[100px] px-3 py-2 rounded-lg text-center ${totals.roundOff >= 0 ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                                                    <span className="font-medium">
                                                        {totals.roundOff >= 0 ? '+₹' : '-₹'}{Math.abs(totals.roundOff).toFixed(2)}
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



                        {/* SECTION 6: Previous Payments Information */}
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
                                            <p className="text-dark-6">Payments Pending!!</p>
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

                        {/* SECTION 7: Invoice Terms & Conditions */}
                        <div className="rounded-lg bg-white shadow-1 dark:bg-gray-dark">
                            <div className="flex items-center justify-between border-b border-stroke px-6 py-4 dark:border-dark-3">
                                <h2 className="text-lg font-semibold text-dark dark:text-white">Invoice Terms & Conditions</h2>
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
                                                value={formData.paymentTerms}
                                                onChange={(e) =>
                                                    setFormData({ ...formData, paymentTerms: e.target.value })
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


                        {/* SECTION 9: Payment */}
                        <div className="rounded-lg bg-white p-6 shadow-1 dark:bg-gray-dark mt-6">
                            <h2 className="mb-6 text-lg font-semibold text-dark dark:text-white">
                                Payment
                            </h2>

                            {/* Advance Information */}
                            <div className="mb-6 p-4 bg-gray-50 dark:bg-dark-2 rounded-lg border border-stroke dark:border-dark-3">
                                <h3 className="text-md font-medium text-dark dark:text-white mb-3">
                                    Advance Information
                                </h3>
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-dark-6 dark:text-gray-400">Advance :</span>
                                    <span className="font-medium text-dark dark:text-white">
                                        ₹{paymentData.advanceAmount.toFixed(2)}
                                    </span>
                                </div>
                                <div className="flex items-center">
                                    <input
                                        type="checkbox"
                                        id="adjustAdvancePayment"
                                        checked={paymentData.adjustAdvancePayment}
                                        onChange={(e) => setPaymentData(prev => ({
                                            ...prev,
                                            adjustAdvancePayment: e.target.checked
                                        }))}
                                        className="h-4 w-4 rounded border-stroke text-primary focus:ring-primary dark:border-dark-3"
                                    />
                                    <label
                                        htmlFor="adjustAdvancePayment"
                                        className="ml-2 text-sm text-dark dark:text-white"
                                    >
                                        Adjust Advance Payment
                                    </label>
                                </div>
                            </div>

                            {/* Payment Form Fields - Single Row Layout */}
                            <div className="bg-gray-50 dark:bg-dark-2 p-4 rounded-lg">
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    {/* Amount Field */}
                                    <div>
                                        <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                                            Amount <span className="text-red-500">*</span>
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
                                            required
                                            className="w-full rounded-lg border border-stroke bg-white px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3 dark:bg-gray-dark"
                                        />
                                    </div>

                                    {/* Payment Type Dropdown */}
                                    <div>
                                        <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                                            Payment Type <span className="text-red-500">*</span>
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
                                                { value: "pay_by_advance", label: "Pay by Advance" },
                                                { value: "bank", label: "Bank" }
                                            ]}
                                            placeholder="- Select -"
                                            required={true}
                                            label=""
                                        />
                                    </div>

                                    {/* Account Dropdown */}
                                    <div>
                                        <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                                            Account <span className="text-red-500">*</span>
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
                                                { value: "idfc_bank", label: "IDFC First Bank" }
                                            ]}
                                            placeholder="- Select Account -"
                                            required={true}
                                            label=""
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

                                {/* Validation and Summary */}
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
                                        {paymentData.paymentType === "pay_by_advance" && paymentData.advanceAmount > 0 && (
                                            <div className="flex items-center justify-between mt-1">
                                                <span className="text-sm text-dark-6 dark:text-gray-400">
                                                    Available Advance:
                                                </span>
                                                <span className="font-medium text-green-600 dark:text-green-400">
                                                    ₹{paymentData.advanceAmount.toFixed(2)}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Validation Error Messages */}
                                {paymentData.amount > 0 && (!paymentData.paymentType || !paymentData.account) && (
                                    <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                                        <p className="text-sm text-red-600 dark:text-red-400">
                                            {!paymentData.paymentType && !paymentData.account
                                                ? "Please select Payment Type and Account"
                                                : !paymentData.paymentType
                                                    ? "Please select Payment Type"
                                                    : "Please select Account"}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>


                        {/* Action Buttons */}
                        <div className="rounded-lg p-6 dark:bg-gray-dark">
                            <div className="flex flex-wrap justify-center gap-4">
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="min-w-[180px] rounded-lg bg-green-600 px-6 py-3 font-medium text-white transition hover:bg-green-700 disabled:opacity-50"
                                >
                                    {isSubmitting ? "Saving..." : "Update Sales"}
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
