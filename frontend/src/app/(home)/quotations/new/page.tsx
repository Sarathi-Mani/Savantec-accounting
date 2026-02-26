"use client";

import { useAuth } from "@/context/AuthContext";
import { customersApi, productsApi, salesmenApi } from "@/services/api";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useCallback, useMemo } from "react";
import Select from "react-select";

interface QuotationItem {
  product_id?: string;
  description: string;
  image_url?: string;
  item_code?: string;
  hsn: string;
  quantity: number;
  unit: string;
  unit_price: number;
  discount_percent: number;
  gst_rate: number;
  isProject?: boolean;
  subItems?: SubItem[]; 
}

interface SubItem {
  id: string;
  description: string;
  quantity: number;
  image: File | null;
  imageUrl: string;
}

interface OtherCharge {
  id: string;
  name: string;
  amount: number;
  type: "fixed" | "percentage";
  tax: number;
}

interface ExcelCell {
  id: string;
  value: string;
  isFormula: boolean;
  formula?: string;
  computedValue?: number | string;
  row: number;
  col: number;
}

interface FormData {
  quotation_code: string;
  quotation_date: string;
  validity_days: number;
  customer_id?: string;
  notes: string;
  quotation_search_type?: string;
  terms: string;
  subject?: string;
  tax_regime?: "cgst_sgst" | "igst";
  status?: "open" | "closed" | "po_converted" | "lost";
  salesman_id?: string;
  reference?: string;
  reference_no?: string;
  reference_date?: string;
  payment_terms?: string;
  remarks?: string;
  contact_person?: string; 
  show_images?: boolean;
  show_images_in_pdf?: boolean; 
  quotation_type?: "item" | "project"; 
}

// Simple toast notification component
const Toast = ({ message, type = "success", onClose }: { 
  message: string; 
  type?: "success" | "error" | "info" | "warning";
  onClose: () => void;
}) => {
  const bgColor = {
    success: "bg-green-500",
    error: "bg-red-500",
    info: "bg-blue-500",
    warning: "bg-yellow-500"
  }[type];

  return (
    <div className={`fixed top-4 right-4 ${bgColor} text-white px-4 py-2 rounded-lg shadow-lg z-50 animate-fade-in`}>
      <div className="flex items-center justify-between">
        <span>{message}</span>
        <button onClick={onClose} className="ml-4 text-white hover:text-gray-200">
          ×
        </button>
      </div>
    </div>
  );
};

// Helper function to convert column letter to index
const getColumnIndex = (colLetter: string): number => {
  if (!colLetter || typeof colLetter !== 'string') return 0;
  
  let index = 0;
  for (let i = 0; i < colLetter.length; i++) {
    const charCode = colLetter.charCodeAt(i);
    if (charCode >= 65 && charCode <= 90) { // A-Z
      index = index * 26 + (charCode - 64);
    } else if (charCode >= 97 && charCode <= 122) { // a-z
      index = index * 26 + (charCode - 96);
    }
  }
  return index - 1;
};

// Helper function to convert index to column letter
const getColumnLetter = (index: number): string => {
  let letter = '';
  while (index >= 0) {
    letter = String.fromCharCode(65 + (index % 26)) + letter;
    index = Math.floor(index / 26) - 1;
  }
  return letter;
};

const parseCsvLine = (line: string): string[] => {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    const next = line[i + 1];

    if (ch === '"' && inQuotes && next === '"') {
      current += '"';
      i++;
      continue;
    }
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (ch === "," && !inQuotes) {
      values.push(current);
      current = "";
      continue;
    }
    current += ch;
  }
  values.push(current);
  return values;
};

export default function NewQuotationPage() {
  const { company } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const editQuotationId = searchParams.get("edit_id");
  const enquiryIdForPrefill = searchParams.get("enquiry_id");
  const isEditMode = Boolean(editQuotationId);
  
  const getAuthToken = () => {
    if (typeof window === "undefined") return null;
    return (
      localStorage.getItem("employee_token") || localStorage.getItem("access_token")
    );
  };
  
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [salesmen, setSalesmen] = useState<any[]>([]);
  
  const [contactPersons, setContactPersons] = useState<any[]>([]);
  const [imagePreview, setImagePreview] = useState<{ url: string; alt: string } | null>(null);

  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [selectedContactPerson, setSelectedContactPerson] = useState<any>(null);
  const [toasts, setToasts] = useState<Array<{ id: number; message: string; type: "success" | "error" | "info" | "warning" }>>([]);
  const [activeCell, setActiveCell] = useState<{row: number, col: number} | null>(null);
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [copyQuotationNumber, setCopyQuotationNumber] = useState("");
  const [isFetchingQuotation, setIsFetchingQuotation] = useState(false);
  const [copyError, setCopyError] = useState("");
  
  const STATIC_BASE_URL =
    (process.env.NEXT_PUBLIC_API_URL || "http://localhost:6768/api").replace(/\/api$/, "") ||
    "http://localhost:6768";

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
    "22": "Chattisgarh",
    "23": "Madhya Pradesh",
    "24": "Gujarat",
    "26": "Dadra & Nagar Haveli and Daman & Diu",
    "27": "Maharashtra",
    "28": "Andhra Pradesh (Old)",
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
  
  // Generate quotation code function
  const generateQuotationCode = useCallback(() => {
    return `QT-0001`;
  }, []);

  const fetchNextQuotationNumber = async () => {
    if (!company?.id) return "QT-0001";
    
    try {
      const token = getAuthToken();
      const apiUrl = `${process.env.NEXT_PUBLIC_API_URL}/companies/${company.id}/quotations/next-number`;
      console.log("Fetching next number from:", apiUrl);
      
      const response = await fetch(apiUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      console.log("Response status:", response.status);
      
      if (response.ok) {
        const text = await response.text();
        console.log("Raw response text:", text);
        
        if (!text || text.trim() === '') {
          console.warn("Empty response from API");
          return "QT-0001";
        }
        
        try {
          const data = JSON.parse(text);
          console.log("Parsed response data:", data);
          
          if (!data) {
            console.warn("API returned null data");
            return "QT-0001";
          }
          
          if (data.quotation_number !== undefined && data.quotation_number !== null) {
            return data.quotation_number;
          } else {
            console.warn("quotation_number field missing in response:", data);
            return "QT-0001";
          }
        } catch (parseError) {
          console.error("Failed to parse JSON:", parseError, "Raw text:", text);
          return "QT-0001";
        }
      } else {
        console.error("API error status:", response.status);
        const errorText = await response.text();
        console.error("Error response:", errorText);
        return "QT-0001";
      }
    } catch (error) {
      console.error("Network error:", error);
      return "QT-0001";
    }
  };
  
  const fetchQuotationByNumber = async (quotationNumber: string) => {
    if (!company?.id || !quotationNumber.trim()) return null;
    
    try {
      setIsFetchingQuotation(true);
      setCopyError("");
      
      const token = getAuthToken();
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/companies/${company.id}/quotations?search=${encodeURIComponent(quotationNumber)}&page_size=100`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        if (data.items && data.items.length > 0) {
          const exactMatch = data.items.find(
            (q: any) => q.quotation_number === quotationNumber.trim()
          );
          
          if (exactMatch) {
            const detailResponse = await fetch(
              `${process.env.NEXT_PUBLIC_API_URL}/companies/${company.id}/quotations/${exactMatch.id}`,
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              }
            );
            
            if (detailResponse.ok) {
              const quotationDetails = await detailResponse.json();
              return quotationDetails;
            }
          }
        }
      }
      return null;
    } catch (error) {
      console.error("Failed to fetch quotation:", error);
      setCopyError("Failed to fetch quotation. Please check the quotation number.");
      return null;
    } finally {
      setIsFetchingQuotation(false);
    }
  };

  const normalizeImageUrl = (imagePath?: string | null) => {
    if (!imagePath) return null;
    const raw = String(imagePath).trim();
    if (!raw) return null;

    const path = raw.replace(/\\/g, "/");

    if (path.startsWith("http://") || path.startsWith("https://")) {
      return path;
    }

    let normalizedPath = path;
    if (normalizedPath.startsWith("/products/")) {
      normalizedPath = `/uploads${normalizedPath}`;
    } else if (normalizedPath.startsWith("products/")) {
      normalizedPath = `/uploads/${normalizedPath}`;
    } else if (normalizedPath.startsWith("uploads/") || normalizedPath.startsWith("storage/")) {
      normalizedPath = `/${normalizedPath}`;
    } else if (!normalizedPath.startsWith("/")) {
      normalizedPath = `/${normalizedPath}`;
    }

    // Same formatting style as enquiry create page: STATIC_BASE_URL + normalized relative path
    return `${STATIC_BASE_URL}${normalizedPath}`;
  };

  const getItemImageUrl = (item: QuotationItem) => {
    const fromItem = normalizeImageUrl(item.image_url);
    if (fromItem) return fromItem;
    const selectedProductOption = productOptions.find((opt) => opt.value === item.product_id);
    const fromProduct =
      selectedProductOption?.image_url ||
      selectedProductOption?.image_path ||
      selectedProductOption?.additional_image_url ||
      selectedProductOption?.additional_image_path;
    return normalizeImageUrl(fromProduct) || null;
  };

  const itemSelectStyles: any = useMemo(
    () => ({
      control: (base: any) => ({
        ...base,
        minHeight: 38,
        height: 38,
      }),
      valueContainer: (base: any) => ({
        ...base,
        height: 38,
        padding: '0 8px',
      }),
      input: (base: any) => ({
        ...base,
        margin: 0,
      }),
      indicatorsContainer: (base: any) => ({
        ...base,
        height: 38,
      }),
      menu: (base: any) => ({
        ...base,
        zIndex: 9999,
        minWidth: 300,
      }),
      menuPortal: (base: any) => ({
        ...base,
        zIndex: 9999,
      }),
      option: (base: any) => ({
        ...base,
        whiteSpace: "normal",
      }),
    }),
    []
  );

  const fetchCustomerById = async (customerId: string) => {
    if (!company?.id || !customerId) return null;
    
    try {
      const token = getAuthToken();
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/companies/${company.id}/customers/${customerId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      
      if (response.ok) {
        return await response.json();
      }
      return null;
    } catch (error) {
      console.error("Failed to fetch customer:", error);
      return null;
    }
  };

  const prefillFromEnquiry = async (
    enquiryId: string,
    availableCustomers: any[] = [],
    availableProducts: any[] = []
  ) => {
    if (!company?.id || !enquiryId) return;

    try {
      const token = getAuthToken();
      if (!token) return;

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/companies/${company.id}/enquiries/${enquiryId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        showToast("Failed to load enquiry for quotation prefill", "error");
        return;
      }

      const enquiry = await response.json();
      console.log("[EQ-DEBUG][prefill] enquiry_response", enquiry);
      const enquiryNumber = enquiry.enquiry_number || `ENQ-${enquiryId}`;
      const normalizeId = (value: any) => String(value ?? "").trim();
      const sameId = (a: any, b: any) => normalizeId(a) !== "" && normalizeId(a) === normalizeId(b);
      const toNumber = (value: any, fallback = 0) => {
        if (value === null || value === undefined || value === "") return fallback;
        if (typeof value === "number") return Number.isFinite(value) ? value : fallback;
        const normalized = String(value).replace(/,/g, "").replace(/[^\d.-]/g, "");
        const parsed = Number(normalized);
        return Number.isFinite(parsed) ? parsed : fallback;
      };
      const firstPositive = (...values: any[]) => {
        for (const value of values) {
          const n = toNumber(value, 0);
          if (n > 0) return n;
        }
        return 0;
      };

      const sourceItems = Array.isArray(enquiry.products_interested) && enquiry.products_interested.length > 0
        ? enquiry.products_interested
        : Array.isArray(enquiry.items)
          ? enquiry.items
          : [];
      const cachedPrefillRaw =
        typeof window !== "undefined"
          ? localStorage.getItem(`quotation_prefill_enquiry_${enquiryId}`)
          : null;
      let cachedPrefill: any = null;
      try {
        cachedPrefill = cachedPrefillRaw ? JSON.parse(cachedPrefillRaw) : null;
      } catch {
        cachedPrefill = null;
      }
      const cachedItems = Array.isArray(cachedPrefill?.items) ? cachedPrefill.items : [];
      const effectiveSourceItems = sourceItems.length > 0 ? sourceItems : cachedItems;

      const productPool = availableProducts.length > 0 ? availableProducts : products;
      const enquiryItems = Array.isArray(enquiry.items) ? enquiry.items : [];
      const findMatchedProduct = (item: any, matchedEnquiryItem: any) => {
        const byId =
          productPool.find((p: any) => sameId(p.id, item.product_id || item.item_id)) ||
          productPool.find((p: any) => sameId(p.id, matchedEnquiryItem.product_id || matchedEnquiryItem.item_id));
        if (byId) return byId;

        const itemCode = item.item_code || matchedEnquiryItem.item_code;
        if (itemCode) {
          const byCode = productPool.find(
            (p: any) =>
              String(p.item_code || p.code || "").trim().toLowerCase() ===
              String(itemCode || "").trim().toLowerCase()
          );
          if (byCode) return byCode;
        }

        const itemDesc = String(item.description || matchedEnquiryItem.description || "").trim().toLowerCase();
        if (itemDesc) {
          const byNameOrDesc = productPool.find((p: any) => {
            const name = String(p.name || "").trim().toLowerCase();
            const desc = String(p.description || "").trim().toLowerCase();
            return itemDesc === name || itemDesc === desc;
          });
          if (byNameOrDesc) return byNameOrDesc;
        }

        return {};
      };

      const mappedItems = effectiveSourceItems.length > 0
        ? effectiveSourceItems.map((item: any, idx: number) => {
            const matchedEnquiryItem =
              enquiryItems.find((ei: any) => sameId(ei.product_id || ei.item_id, item.product_id || item.item_id)) ||
              enquiryItems[idx] ||
              {};
            const matchedCachedItem =
              cachedItems.find((ci: any) => sameId(ci.product_id || ci.item_id, item.product_id || item.item_id)) ||
              cachedItems[idx] ||
              {};
            const manualName =
              item.custom_item ||
              item.product_name ||
              matchedCachedItem.custom_item ||
              matchedCachedItem.product_name ||
              matchedEnquiryItem.custom_item ||
              matchedEnquiryItem.product_name ||
              "";
            const matchedProduct = findMatchedProduct(item, matchedEnquiryItem);

            const quantity = toNumber(
              item.quantity ?? matchedCachedItem.quantity ?? matchedEnquiryItem.quantity,
              1
            );
            const resolvedUnitPrice = firstPositive(
              item.sales_price,
              item.unit_price,
              item.rate,
              item.price,
              matchedCachedItem.sales_price,
              matchedCachedItem.unit_price,
              matchedCachedItem.rate,
              matchedCachedItem.price,
              matchedEnquiryItem.sales_price,
              matchedEnquiryItem.unit_price,
              matchedEnquiryItem.rate,
              matchedEnquiryItem.price,
              matchedProduct.sales_price,
              matchedProduct.unit_price
            );
            const fallbackFromAmount =
              resolvedUnitPrice > 0
                ? resolvedUnitPrice
                : (() => {
                    const totalAmount = toNumber(item.amount ?? matchedCachedItem.amount ?? matchedEnquiryItem.amount, 0);
                    return quantity > 0 ? totalAmount / quantity : 0;
                  })();

            return {
              product_id: normalizeId(item.product_id || matchedEnquiryItem.product_id || matchedProduct.id || ""),
              image_url:
                matchedEnquiryItem.image_url ||
                matchedEnquiryItem.existing_image ||
                matchedEnquiryItem.image ||
                item.image_url ||
                item.existing_image ||
                item.image ||
                matchedCachedItem.image_url ||
                matchedCachedItem.existing_image ||
                matchedCachedItem.image ||
                matchedProduct.image_url ||
                matchedProduct.main_image_url ||
                matchedProduct.image ||
                matchedProduct.main_image ||
                "",
              hsn:
                item.hsn_code ||
                item.hsn ||
                matchedEnquiryItem.hsn_code ||
                matchedEnquiryItem.hsn ||
                item.product?.hsn_code ||
                item.product?.hsn ||
                matchedProduct.hsn ||
                matchedProduct.hsn_code ||
                "",
              item_code:
                item.item_code ||
                matchedCachedItem.item_code ||
                matchedEnquiryItem.item_code ||
                matchedProduct.item_code ||
                matchedProduct.code ||
                "",
              description:
                manualName ||
                item.description ||
                matchedCachedItem.description ||
                matchedEnquiryItem.description ||
                matchedProduct.description ||
                matchedProduct.name ||
                "Item",
              quantity,
              unit: item.unit || matchedCachedItem.unit || matchedEnquiryItem.unit || matchedProduct.unit || "unit",
              unit_price: fallbackFromAmount,
              discount_percent: toNumber(
                item.discount_percent ??
                matchedCachedItem.discount_percent ??
                matchedEnquiryItem.discount_percent ??
                matchedProduct.discount_percent ??
                matchedProduct.discount ??
                0
              ),
              gst_rate: toNumber(
                item.gst_rate ??
                item.tax_rate ??
                matchedCachedItem.gst_rate ??
                matchedCachedItem.tax_rate ??
                matchedEnquiryItem.gst_rate ??
                matchedEnquiryItem.tax_rate ??
                matchedProduct.gst_rate ??
                matchedProduct.tax_rate ??
                18
              ),
              subItems: Array.isArray(item.sub_items)
                ? item.sub_items.map((subItem: any, idx: number) => ({
                    id: `${Date.now()}-${idx}`,
                    description: subItem.description || "",
                    quantity: Number(subItem.quantity) || 1,
                    image: null,
                    imageUrl: subItem.image_url || "",
                  }))
                : [],
            };
          })
        : [{
            product_id: "",
            hsn: "",
            item_code: "",
            description: "",
            quantity: 1,
            unit: "unit",
            unit_price: 0,
            discount_percent: 0,
            gst_rate: 18,
          }];

      const rowsNeedingProductFetch = mappedItems
        .map((item: any, index: number) => ({
          index,
          product_id: normalizeId(item.product_id),
          unit_price: Number(item.unit_price || 0),
          image_url: item.image_url || "",
        }))
        .filter((row: any) => {
          if (!row.product_id) return false;
          const hasPrice = row.unit_price > 0;
          const hasImage = Boolean(normalizeImageUrl(row.image_url));
          return !hasPrice || !hasImage;
        });

      if (rowsNeedingProductFetch.length > 0) {
        const uniqueProductIds = Array.from(new Set(rowsNeedingProductFetch.map((r: any) => r.product_id)));
        const fetchedById: Record<string, any> = {};

        await Promise.all(
          uniqueProductIds.map(async (pid) => {
            try {
              const productResp = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/companies/${company.id}/products/${pid}`,
                { headers: { Authorization: `Bearer ${token}` } }
              );
              if (productResp.ok) {
                fetchedById[pid as string] = await productResp.json();
              }
            } catch (err) {
              console.warn("[EQ-DEBUG][prefill] product_fetch_by_id_failed", pid, err);
            }
          })
        );

        for (const row of rowsNeedingProductFetch) {
          const product = fetchedById[row.product_id];
          if (!product) continue;
          const resolvedPrice = firstPositive(product.sales_price, product.unit_price);
          const resolvedImage =
            product.image_url ||
            product.main_image_url ||
            product.image ||
            product.main_image ||
            "";
          const target = mappedItems[row.index];
          mappedItems[row.index] = {
            ...target,
            product_id: normalizeId(target.product_id || product.id || row.product_id),
            item_code: target.item_code || product.item_code || product.code || "",
            hsn: target.hsn || product.hsn || product.hsn_code || "",
            unit: target.unit || product.unit || "unit",
            unit_price: target.unit_price > 0 ? target.unit_price : resolvedPrice,
            image_url: target.image_url || resolvedImage,
            gst_rate: Number(target.gst_rate || product.gst_rate || product.tax_rate || 18),
            discount_percent: Number(
              target.discount_percent ??
              product.discount_percent ??
              product.discount ??
              0
            ),
          };
        }
      }

      console.log("[EQ-DEBUG][prefill] source_items", effectiveSourceItems);
      console.log("[EQ-DEBUG][prefill] mapped_items", mappedItems);
      const zeroPriceRows = mappedItems
        .map((it: any, i: number) => ({ i, product_id: it.product_id, description: it.description, unit_price: it.unit_price }))
        .filter((r: any) => Number(r.unit_price) <= 0);
      if (zeroPriceRows.length > 0) {
        console.warn("[EQ-DEBUG][prefill] zero_or_missing_unit_price_rows", zeroPriceRows);
      }

      const customerId = enquiry.customer_id || "";
      const contactName = enquiry.contact_person || enquiry.kind_attn || enquiry.prospect_name || "";
      const salesmanId = enquiry.salesman_id || enquiry.sales_person_id || "";

      setFormData(prev => ({
        ...prev,
        quotation_code: enquiry.quotation_no || prev.quotation_code,
        customer_id: customerId,
        contact_person: contactName,
        salesman_id: salesmanId,
        subject: enquiry.quotation_no ? `Quotation ${enquiry.quotation_no}` : `Quotation for ${enquiryNumber}`,
        notes: enquiry.description || enquiry.remarks || "",
        remarks: enquiry.remarks || "",
        reference: "Enquiry",
        reference_no: enquiryNumber,
        reference_date: enquiry.enquiry_date ? new Date(enquiry.enquiry_date).toISOString().split("T")[0] : "",
      }));

      setItems(mappedItems);
      if (typeof window !== "undefined") {
        localStorage.removeItem(`quotation_prefill_enquiry_${enquiryId}`);
      }

      if (customerId) {
        const customerPool = availableCustomers.length > 0 ? availableCustomers : customers;
        const customer = customerPool.find((c: any) => c.id === customerId);
        if (customer) {
          setSelectedCustomer(customer);
          await fetchContactPersons(customer.id);
        }
      } else {
        showToast("Enquiry has no linked customer. Select a customer before saving.", "warning");
      }

      showToast(`Prefilled from enquiry ${enquiryNumber}`, "success");
    } catch (error) {
      console.error("Failed to prefill from enquiry:", error);
      showToast("Failed to prefill quotation from enquiry", "error");
    }
  };

  const loadQuotationForEdit = async (quotationId: string, availableCustomers: any[] = []) => {
    if (!company?.id || !quotationId) return;

    try {
      const token = getAuthToken();
      if (!token) return;

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/companies/${company.id}/quotations/${quotationId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        showToast("Failed to load quotation for edit", "error");
        router.push("/quotations");
        return;
      }

      const quotation = await response.json();

      setFormData(prev => ({
        ...prev,
        quotation_code: quotation.quotation_number || quotation.quotation_code || prev.quotation_code,
        quotation_date: quotation.quotation_date ? new Date(quotation.quotation_date).toISOString().split("T")[0] : prev.quotation_date,
        validity_days:
          Number(quotation.validity_days) > 0
            ? Number(quotation.validity_days)
            : (
                quotation.validity_date && quotation.quotation_date
                  ? Math.max(
                      1,
                      Math.ceil(
                        (new Date(quotation.validity_date).getTime() - new Date(quotation.quotation_date).getTime()) /
                          (1000 * 60 * 60 * 24)
                      )
                    )
                  : 30
              ),
        customer_id: quotation.customer_id || "",
        notes: quotation.notes || "",
        terms: quotation.terms || "",
        subject: quotation.subject || prev.subject,
        tax_regime:
          quotation.tax_regime ||
          (() => {
            const companyCode = normalizeStateCode(company?.state_code || company?.state);
            const placeCode = normalizeStateCode(quotation.place_of_supply);
            if (companyCode && placeCode) {
              return companyCode === placeCode ? "cgst_sgst" : "igst";
            }
            return prev.tax_regime;
          })(),
        status: quotation.status || "open",
        salesman_id: quotation.sales_person_id || "",
        reference: quotation.reference || "",
        reference_no: quotation.reference_no || "",
        reference_date: quotation.reference_date ? new Date(quotation.reference_date).toISOString().split("T")[0] : "",
        payment_terms: quotation.payment_terms || prev.payment_terms,
        remarks: quotation.remarks || "",
        contact_person: quotation.contact_person || "",
        show_images: quotation.show_images !== false,
        show_images_in_pdf: quotation.show_images_in_pdf !== false,
        quotation_type: quotation.quotation_type || "item",
      }));

      if (Array.isArray(quotation.items) && quotation.items.length > 0) {
        setItems(quotation.items.map((item: any, itemIndex: number) => ({
          product_id: item.product_id || "",
          image_url: item.image_url || "",
          hsn: item.hsn_code || item.hsn || "",
          item_code: item.item_code || "",
          description: item.description || "Item",
          quantity: Number(item.quantity) || 1,
          unit: item.unit || "unit",
          unit_price: Number(item.unit_price) || 0,
          discount_percent: Number(item.discount_percent) || 0,
          gst_rate: Number(item.gst_rate) || 18,
          subItems: Array.isArray(item.sub_items)
            ? item.sub_items.map((subItem: any, idx: number) => ({
                id: subItem.id || `${quotationId}-${itemIndex}-${idx}`,
                description: subItem.description || "",
                quantity: Number(subItem.quantity) || 1,
                image: null,
                imageUrl: subItem.image_url || "",
              }))
            : [],
        })));
      }

      if (Array.isArray(quotation.other_charges) && quotation.other_charges.length > 0) {
        setOtherCharges(
          quotation.other_charges.map((charge: any, idx: number) => ({
            id: String(charge.id || `charge-${idx}`),
            name: charge.name || "Other Charges",
            amount: Number(charge.amount) || 0,
            type: charge.type === "percentage" ? "percentage" : "fixed",
            tax: Number(charge.tax) || 0,
          }))
        );
      } else if (Number(quotation.p_and_f_charges || 0) > 0) {
        setOtherCharges([
          {
            id: "pf-charge",
            name: "Other Charges",
            amount: Number(quotation.p_and_f_charges) || 0,
            type: "fixed",
            tax: 0,
          },
        ]);
      } else {
        setOtherCharges([{ id: Date.now().toString(), name: "", amount: 0, type: "fixed", tax: 18 }]);
      }

      if (quotation.customer_id) {
        const customerPool = availableCustomers.length > 0 ? availableCustomers : customers;
        const customer = customerPool.find((c: any) => c.id === quotation.customer_id);
        if (customer) {
          setSelectedCustomer(customer);
          await fetchContactPersons(customer.id);
        }
      }

      if (quotation.excel_notes_file_url) {
        try {
          const excelResponse = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/companies/${company.id}/quotations/${quotation.id}/excel-notes`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );

          if (excelResponse.ok) {
            const excelData = await excelResponse.json();
            if (excelData?.content) {
              applyExcelContentToGrid(excelData.content);
            }
          }
        } catch (excelErr) {
          console.error("Failed to load quotation excel notes:", excelErr);
        }
      }

      showToast(`Editing quotation ${quotation.quotation_number || quotationId}`, "info");
    } catch (error) {
      console.error("Failed to load quotation for edit:", error);
      showToast("Failed to load quotation for edit", "error");
      router.push("/quotations");
    }
  };

  const prefillFormWithQuotation = async (quotationNumber: string) => {
    const quotation = await fetchQuotationByNumber(quotationNumber);
    
    if (!quotation) {
      setCopyError("Quotation not found. Please check the quotation number.");
      return;
    }

    setFormData(prev => ({
      ...prev,
      quotation_code: generateQuotationCode(),
      quotation_date: new Date().toISOString().split("T")[0],
      validity_days: quotation.validity_days || 30,
      customer_id: quotation.customer_id || "",
      notes: quotation.notes || "",
      terms: quotation.terms || "",
      subject: `Quotation ${generateQuotationCode()} - Copy of ${quotation.quotation_number}`,
      status: "open",
      salesman_id: quotation.sales_person_id || "",
      reference: quotation.reference || "",
      reference_no: quotation.reference_no || "",
      reference_date: quotation.reference_date ? 
        new Date(quotation.reference_date).toISOString().split("T")[0] : "",
      payment_terms: quotation.payment_terms || standardTermsTemplate,
      remarks: quotation.remarks || "",
      contact_person: quotation.contact_person || "",
      show_images: quotation.show_images !== false
    }));
    
    if (quotation.customer_id) {
      let customer = customers.find(c => c.id === quotation.customer_id);
      
      if (!customer) {
        const customerDetails = await fetchCustomerById(quotation.customer_id);
        if (customerDetails) {
          setCustomers(prev => [...prev, customerDetails]);
          customer = customerDetails;
        }
      }
      
      if (customer) {
        const name = customer.name || "Unnamed Customer";
        const phone = customer.phone || customer.mobile || "";
        const email = customer.email || "";
        const label = `${name}${phone ? ` (${phone})` : ''}${email ? ` - ${email}` : ''}`;
        
        const customerOption = {
          value: customer.id,
          label: label,
          data: customer
        };
        
        setSelectedCustomer(customer);
        
        setFormData(prev => ({
          ...prev,
          customer_id: customer.id,
          contact_person: quotation.contact_person || ""
        }));
        
        await fetchContactPersons(customer.id);
        
        if (quotation.customer_name) {
          console.log("Quotation includes customer name:", quotation.customer_name);
        }
        
        const customerStateCode = normalizeStateCode(customer.billing_state_code || customer.billing_state);
        const companyStateCode = normalizeStateCode(company?.state_code || company?.state);
        if (customerStateCode && companyStateCode) {
          const isSameState = customerStateCode === companyStateCode;
          setFormData(prev => ({
            ...prev,
            tax_regime: isSameState ? "cgst_sgst" : "igst"
          }));
        }
      } else {
        showToast("Customer not found. Please check if customer still exists.", "warning");
      }
    }
    
    if (quotation.items && quotation.items.length > 0) {
      const newItems = quotation.items.map((item: any) => ({
        product_id: item.product_id || "",
        item_code: item.item_code || "",
        image_url: item.image_url || "",
        description: item.description || "",
        hsn: item.hsn || "",
        quantity: item.quantity || 1,
        unit: item.unit || "unit",
        unit_price: item.unit_price || 0,
        discount_percent: Number(item.discount_percent ?? 0),
        gst_rate: item.gst_rate || 18
      }));
      setItems(newItems);
    }
    
    if (quotation.sales_person_id && salesmen.length > 0) {
    }
    
    if (Array.isArray(quotation.other_charges) && quotation.other_charges.length > 0) {
      setOtherCharges(
        quotation.other_charges.map((charge: any, idx: number) => ({
          id: String(charge.id || `charge-${idx}`),
          name: charge.name || "Other Charges",
          amount: Number(charge.amount) || 0,
          type: charge.type === "percentage" ? "percentage" : "fixed",
          tax: Number(charge.tax) || 0,
        }))
      );
    } else {
      setOtherCharges([{ id: Date.now().toString(), name: "", amount: 0, type: "fixed", tax: 18 }]);
    }
    
    const newGrid = [...excelGrid.map(row => [...row])];
    for (let r = 0; r < newGrid.length; r++) {
      for (let c = 0; c < newGrid[r].length; c++) {
        newGrid[r][c] = {
          ...newGrid[r][c],
          value: '',
          isFormula: false,
          formula: undefined,
          computedValue: ''
        };
      }
    }
    setExcelGrid(newGrid);
    
    if (quotation.excel_notes_file_url && company?.id) {
      try {
        const token = getAuthToken();
        const excelResponse = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/companies/${company.id}/quotations/${quotation.id}/excel-notes`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        
        if (excelResponse.ok) {
          const excelData = await excelResponse.json();
          if (excelData.content) {
            applyExcelContentToGrid(excelData.content);
            showToast("Loaded Excel notes from quotation", "info");
          }
        }
      } catch (error) {
        console.error("Failed to fetch Excel notes:", error);
      }
    }
    
    showToast(`Quotation "${quotation.quotation_number}" loaded successfully!`, "success");
    setShowCopyModal(false);
    setCopyQuotationNumber("");
  };

  const [excelGrid, setExcelGrid] = useState<ExcelCell[][]>(() => {
    const initialRows = 10;
    const initialCols = 10;
    const grid: ExcelCell[][] = [];
    
    for (let r = 0; r < initialRows; r++) {
      const row: ExcelCell[] = [];
      for (let c = 0; c < initialCols; c++) {
        row.push({
          id: `${r}_${c}`,
          value: '',
          isFormula: false,
          row: r,
          col: c,
          computedValue: ''
        });
      }
      grid.push(row);
    }
    return grid;
  });

  const [gridRows, setGridRows] = useState(10);
  const [gridCols, setGridCols] = useState(10);
  const [totalRows, setTotalRows] = useState(10);
  const [totalCols, setTotalCols] = useState(10);

  const applyExcelContentToGrid = (csvContent: string) => {
    const lines = String(csvContent || "")
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .split("\n")
      .filter((line) => line.trim() !== "");

    if (lines.length === 0) return;

    const parsed = lines.map(parseCsvLine);
    const rows = Math.max(10, parsed.length);
    const cols = Math.max(10, ...parsed.map((row) => row.length));

    const nextGrid: ExcelCell[][] = [];
    for (let r = 0; r < rows; r++) {
      const row: ExcelCell[] = [];
      for (let c = 0; c < cols; c++) {
        const raw = parsed[r]?.[c] ?? "";
        const value = String(raw).trim();
        const isFormula = value.startsWith("=");
        const num = Number(value);
        row.push({
          id: `${r}_${c}`,
          value,
          isFormula,
          formula: isFormula ? value : undefined,
          computedValue: isFormula ? value : (Number.isFinite(num) && value !== "" ? num : value),
          row: r,
          col: c,
        });
      }
      nextGrid.push(row);
    }

    setGridRows(rows);
    setGridCols(cols);
    setTotalRows(rows);
    setTotalCols(cols);
    setExcelGrid(nextGrid);
  };

  const standardTermsTemplate = `1. Packing/Forwarding: Nil\n2. Freight: Actual\n3. Payment: 30 Days\n4. Delivery: \n5. Validity: 30 days\n6. Taxes: All taxes as applicable\n7. Installation: At actual\n8. Warranty: As per product warranty`;

  const [formData, setFormData] = useState<FormData>({
    quotation_code: "",
    quotation_date: new Date().toISOString().split("T")[0],
    validity_days: 30,
    customer_id: "",
    quotation_search_type: "item",
    notes: "",
    terms: "", 
    subject: `Quotation ${generateQuotationCode()}`,
    tax_regime: undefined,
    status: "open",
    salesman_id: "",
    reference: "",
    reference_no: "",
    reference_date: "",
    payment_terms: standardTermsTemplate,
    remarks: "", 
    contact_person: "",
    quotation_type: "item",
    show_images: true,
    show_images_in_pdf: true,
  });

  const [items, setItems] = useState<QuotationItem[]>([
    { 
      product_id: "", 
      hsn: "", 
      item_code: "",
      description: "", 
      quantity: 1, 
      unit: "unit", 
      unit_price: 0, 
      discount_percent: 0, 
      gst_rate: 18 
    }
  ]);

  const [otherCharges, setOtherCharges] = useState<OtherCharge[]>([
    { id: Date.now().toString(), name: "", amount: 0, type: "fixed", tax: 18 }
  ]);

  const [globalDiscount, setGlobalDiscount] = useState({
    value: 0,
    type: "percentage" as "percentage" | "fixed"
  });

  const showToast = (message: string, type: "success" | "error" | "info" | "warning" = "success") => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id));
    }, 3000);
  };

  const getOrCreateCell = (grid: ExcelCell[][], row: number, col: number): ExcelCell => {
    while (grid.length <= row) {
      const newRow: ExcelCell[] = [];
      for (let c = 0; c < Math.max(gridCols, col + 1); c++) {
        newRow.push({
          id: `${grid.length}_${c}`,
          value: '',
          isFormula: false,
          row: grid.length,
          col: c,
          computedValue: ''
        });
      }
      grid.push(newRow);
    }
    
    const currentRow = grid[row];
    while (currentRow.length <= col) {
      currentRow.push({
        id: `${row}_${currentRow.length}`,
        value: '',
        isFormula: false,
        row: row,
        col: currentRow.length,
        computedValue: ''
      });
    }
    
    return grid[row][col];
  };

  const evaluateFormula = (expr: string, grid: ExcelCell[][]): number | string => {
    try {
      expr = expr.trim();
      if (expr.startsWith('=')) {
        expr = expr.substring(1).trim();
      }

      if (expr === '') {
        return '';
      }

      const singleCellPattern = /^([A-Z]+)(\d+)$/;
      const singleCellMatch = expr.match(singleCellPattern);
      if (singleCellMatch) {
        const col = singleCellMatch[1];
        const rowStr = singleCellMatch[2];
        const row = parseInt(rowStr, 10) - 1;
        
        if (isNaN(row) || row < 0) {
          return '#ERROR';
        }
        
        const colIndex = getColumnIndex(col);
        
        if (row >= 0 && row < grid.length && colIndex >= 0 && colIndex < (grid[row]?.length || 0)) {
          const cell = grid[row][colIndex];
          if (cell) {
            const val = cell.computedValue;
            if (val === undefined || val === '' || val === null) {
              return 0;
            }
            if (typeof val === 'string') {
              const num = parseFloat(val);
              return isNaN(num) ? 0 : num;
            }
            return val;
          }
        }
        return '#REF!';
      }

      const cellReferencePattern = /([A-Z]+)(\d+)/g;
      let processedExpr = expr;
      let hasCellReference = false;
      let match: RegExpExecArray | null;

      while ((match = cellReferencePattern.exec(expr)) !== null) {
        hasCellReference = true;
        const colLetter = match[1];
        const rowStr = match[2];
        const rowNum = parseInt(rowStr, 10) - 1;
        
        if (isNaN(rowNum) || rowNum < 0) {
          continue;
        }
        
        const colIndex = getColumnIndex(colLetter);
        
        if (rowNum >= 0 && rowNum < grid.length && colIndex >= 0 && colIndex < (grid[rowNum]?.length || 0)) {
          const cell = grid[rowNum][colIndex];
          if (cell) {
            let cellValue = cell.computedValue;
            if (cellValue === undefined || cellValue === '' || cellValue === null) {
              cellValue = 0;
            } else if (typeof cellValue === 'string') {
              const num = parseFloat(cellValue);
              cellValue = isNaN(num) ? 0 : num;
            }
            processedExpr = processedExpr.replace(match[0], cellValue.toString());
          } else {
            processedExpr = processedExpr.replace(match[0], '0');
          }
        } else {
          processedExpr = processedExpr.replace(match[0], '0');
        }
      }

      processedExpr = processedExpr.replace(/(\d+(\.\d+)?)%/g, (match, p1) => {
        const percentageValue = parseFloat(p1);
        return isNaN(percentageValue) ? match : (percentageValue / 100).toString();
      });

      if (!hasCellReference) {
        const num = parseFloat(processedExpr);
        if (!isNaN(num)) {
          return num;
        }
        return processedExpr;
      }

      try {
        const safeExpr = processedExpr.replace(/[^0-9+\-*/().%\s]/g, '');
        
        if (safeExpr.trim() === '') {
          return '#ERROR';
        }

        const result = Function(`'use strict'; try { return (${safeExpr}) } catch(e) { return '#ERROR' }`)();
        
        if (typeof result === 'number' && !isNaN(result) && isFinite(result)) {
          return result;
        }
        return '#ERROR';
      } catch (error) {
        console.error('Formula evaluation error:', error);
        return '#ERROR';
      }
    } catch (error) {
      console.error('Formula evaluation error:', error);
      return '#ERROR';
    }
  };

  const updateDependentCells = (grid: ExcelCell[][]) => {
    let updated = false;
    do {
      updated = false;
      for (let r = 0; r < grid.length; r++) {
        for (let c = 0; c < (grid[r]?.length || 0); c++) {
          const cell = grid[r][c];
          if (cell && cell.isFormula && cell.formula) {
            const oldValue = cell.computedValue;
            try {
              cell.computedValue = evaluateFormula(cell.formula, grid);
            } catch {
              cell.computedValue = '#ERROR';
            }
            if (cell.computedValue !== oldValue) {
              updated = true;
            }
          }
        }
      }
    } while (updated);
  };

  const updateCell = (row: number, col: number, value: string) => {
    const newGrid = [...excelGrid.map(rowArr => [...rowArr])];
    
    const cell = getOrCreateCell(newGrid, row, col);
    
    if (row >= totalRows) {
      setTotalRows(row + 1);
    }
    if (col >= totalCols) {
      setTotalCols(col + 1);
    }
    
    if (value.trim().startsWith('=')) {
      cell.isFormula = true;
      cell.formula = value.trim();
      cell.value = value.trim();
      
      try {
        const result = evaluateFormula(value, newGrid);
        if (typeof result === 'number') {
          cell.computedValue = result;
        } else if (typeof result === 'string') {
          cell.computedValue = result;
        } else {
          cell.computedValue = '#ERROR';
        }
      } catch (error) {
        console.error('Formula error:', error);
        cell.computedValue = '#ERROR';
      }
    } else {
      cell.isFormula = false;
      cell.formula = undefined;
      cell.value = value;
      
      const numValue = parseFloat(value);
      if (!isNaN(numValue) && value.trim() !== '') {
        cell.computedValue = numValue;
      } else {
        cell.computedValue = value;
      }
    }
    
    updateDependentCells(newGrid);
    
    setExcelGrid(newGrid);
  };

  const addRows = (count: number = 5) => {
    const newRows = gridRows + count;
    const newGrid = [...excelGrid];
    
    for (let r = gridRows; r < newRows; r++) {
      const row: ExcelCell[] = [];
      for (let c = 0; c < gridCols; c++) {
        row.push({
          id: `${r}_${c}`,
          value: '',
          isFormula: false,
          row: r,
          col: c,
          computedValue: ''
        });
      }
      newGrid.push(row);
    }
    
    setGridRows(newRows);
    setExcelGrid(newGrid);
    showToast(`Added ${count} rows`, 'info');
  };

  const addColumns = (count: number = 5) => {
    const newCols = gridCols + count;
    const newGrid = [...excelGrid.map(row => [...row])];
    
    for (let r = 0; r < newGrid.length; r++) {
      for (let c = gridCols; c < newCols; c++) {
        newGrid[r].push({
          id: `${r}_${c}`,
          value: '',
          isFormula: false,
          row: r,
          col: c,
          computedValue: ''
        });
      }
    }
    
    setGridCols(newCols);
    setExcelGrid(newGrid);
    showToast(`Added ${count} columns`, 'info');
  };

  const removeRows = (count: number = 5) => {
    const newRows = Math.max(1, gridRows - count);
    setGridRows(newRows);
    showToast(`Removed ${count} rows`, 'info');
  };

  const removeColumns = (count: number = 5) => {
    const newCols = Math.max(1, gridCols - count);
    setGridCols(newCols);
    showToast(`Removed ${count} columns`, 'info');
  };

  const handlePasteEnhanced = (e: React.ClipboardEvent, startRow: number, startCol: number) => {
    e.preventDefault();
    
    const pastedData = e.clipboardData.getData('text');
    const rows = pastedData.trim().split('\n');
    
    const neededRows = startRow + rows.length;
    const neededCols = startCol + Math.max(...rows.map(row => {
      if (row.includes('\t')) {
        return row.split('\t').length;
      } else if (row.includes(',')) {
        return row.split(',').length;
      }
      return 1;
    }));
    
    const newGrid = [...excelGrid.map(row => [...row])];
    
    for (let r = 0; r < neededRows; r++) {
      if (!newGrid[r]) {
        newGrid[r] = [];
      }
      for (let c = 0; c < neededCols; c++) {
        if (!newGrid[r][c]) {
          newGrid[r][c] = {
            id: `${r}_${c}`,
            value: '',
            isFormula: false,
            row: r,
            col: c,
            computedValue: ''
          };
        }
      }
    }
    
    setTotalRows(Math.max(totalRows, neededRows));
    setTotalCols(Math.max(totalCols, neededCols));
    
    if (neededRows > gridRows) {
      setGridRows(neededRows);
    }
    if (neededCols > gridCols) {
      setGridCols(neededCols);
    }
    
    rows.forEach((rowStr, rowOffset) => {
      const cells = rowStr.split('\t');
      cells.forEach((cellValue, colOffset) => {
        const targetRow = startRow + rowOffset;
        const targetCol = startCol + colOffset;
        
        const cell = newGrid[targetRow][targetCol];
        const value = cellValue.trim();
        
        if (value.startsWith('=')) {
          cell.isFormula = true;
          cell.formula = value;
          cell.value = value;
          try {
            cell.computedValue = evaluateFormula(value, newGrid);
          } catch {
            cell.computedValue = '#ERROR';
          }
        } else {
          cell.isFormula = false;
          cell.formula = undefined;
          cell.value = value;
          const numValue = parseFloat(value);
          cell.computedValue = !isNaN(numValue) ? numValue : value;
        }
      });
    });
    
    updateDependentCells(newGrid);
    setExcelGrid(newGrid);
    
    showToast(`Pasted ${rows.length} rows × ${Math.max(...rows.map(row => row.split('\t').length))} columns`, 'success');
  };

  const clearGrid = () => {
    const newGrid = [...excelGrid.map(row => [...row])];
    for (let r = 0; r < newGrid.length; r++) {
      for (let c = 0; c < newGrid[r].length; c++) {
        newGrid[r][c] = {
          ...newGrid[r][c],
          value: '',
          isFormula: false,
          formula: undefined,
          computedValue: ''
        };
      }
    }
    setExcelGrid(newGrid);
    showToast('Grid cleared', 'info');
  };

  const exportToCSV = () => {
    let csv = '';
    
    const headers = ['', ...Array.from({ length: Number(totalCols) }, (_, i) => getColumnLetter(Number(i)))];
    csv += headers.join(',') + '\n';
    
    for (let rowIndex = 0; rowIndex < Number(totalRows); rowIndex++) {
      const rowNumber = rowIndex + 1;
      const row = excelGrid[rowIndex] || [];
      const rowData: (string | number)[] = [rowNumber];
      
      for (let colIndex = 0; colIndex < Number(totalCols); colIndex++) {
        const cell = row[colIndex];
        if (cell && cell.isFormula && cell.formula) {
          rowData.push(cell.formula);
        } else if (cell) {
          rowData.push(cell.computedValue || cell.value || '');
        } else {
          rowData.push('');
        }
      }
      
      csv += rowData.join(',') + '\n';
    }
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `quotation_notes_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    showToast(`CSV exported with ${totalRows} rows × ${totalCols} columns!`, 'success');
  };

  const getExcelDataAsText = () => {
    let csv = '';
    
    for (let rowIndex = 0; rowIndex < totalRows; rowIndex++) {
      const row = excelGrid[rowIndex] || [];
      const rowData = [];
      
      for (let colIndex = 0; colIndex < totalCols; colIndex++) {
        const cell = row[colIndex];
        let cellValue = '';
        
        if (cell) {
          if (cell.isFormula && cell.formula) {
            cellValue = String(cell.formula);
          } else {
            cellValue = String(cell.computedValue || cell.value || '');
          }
        }
        
        if (cellValue.includes(',') || cellValue.includes('"') || cellValue.includes('\n') || cellValue.includes('\r')) {
          cellValue = '"' + cellValue.replace(/"/g, '""') + '"';
        }
        
        rowData.push(cellValue);
      }
      
      if (rowData.some(cell => cell !== '' && cell !== '""')) {
        csv += rowData.join(',') + '\n';
      }
    }
    
    return csv.trim();
  };

const productOptions = useMemo(() => 
  products
    .filter(product => product.name && product.name.trim())
    .map((product) => {
        console.log(`Processing product: ${product.name}`, {
          image_url: product.image_url,
          main_image_url: product.main_image_url,
          additional_image_url: product.additional_image_url,
          image: product.image,
          main_image: product.main_image,
          additional_image: product.additional_image
        });
        
        const name = product.name || "Unnamed Product";
        const itemCode = product.item_code || product.code || "";
        const description = product.description || "";
        const hsn = product.hsn_code || product.hsn || "";
        
      const rawMainImage =
        product.image_url ||
        product.main_image_url ||
        product.image ||
        product.main_image ||
        null;
      const rawAdditionalImage =
        product.additional_image_url ||
        product.additional_image ||
        null;
      const mainImageUrl = rawMainImage || null;
      const additionalImageUrl = rawAdditionalImage || null;
        
        if (mainImageUrl) {
          console.log(`Product ${name} has image URL: ${mainImageUrl}`);
        }
        
        const label = itemCode 
          ? `${itemCode} - ${name}`
          : name;
        
        const subLabel = description ? `${description}` : '';
        
        return {
          value: product.id,
          label: label,
          subLabel: subLabel,
          item_code: itemCode,
          hsn: hsn,
          description: description || name,
          unit_price: product.unit_price || product.sales_price || 0,
          discount_percent: Number(product.discount_percent ?? product.discount ?? 0),
          gst_rate: product.tax_rate || product.gst_rate || 18,
          unit: product.unit || "unit",
          sku: product.sku || "",
          stock_quantity: product.current_stock || product.opening_stock || 0,
          image_url: mainImageUrl,
          additional_image_url: additionalImageUrl,
          image_path: product.image || product.main_image,
          additional_image_path: product.additional_image,
          product
        };
      }), [products]);

  useEffect(() => {
    console.log("=== DEBUG: Products data received ===");
    if (products.length > 0) {
      console.log("First product data:", products[0]);
      console.log("First product image_url:", products[0].image_url);
      console.log("First product main_image_url:", products[0].main_image_url);
      console.log("First product additional_image_url:", products[0].additional_image_url);
    }
  }, [products]);

  const customerOptions = useMemo(() => {
    if (!customers || customers.length === 0) {
      return [];
    }
    
    return customers.map((customer) => {
      const name = customer.name || "Unnamed Customer";
      const phone = customer.phone || customer.mobile || "";
      const email = customer.email || "";
      
      const label = `${name}${phone ? ` (${phone})` : ''}${email ? ` - ${email}` : ''}`;
      
      return {
        value: customer.id,
        label: label,
        data: customer
      };
    });
  }, [customers]);

  const salesmanOptions = useMemo(() => {
    return salesmen
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
      });
  }, [salesmen]);

  const contactPersonOptions = useMemo(() => {
    const filtered = contactPersons
      .filter(person => !selectedCustomer || person.customer_id === selectedCustomer.id);
    
    return filtered.map((person) => {
      const label = `${person.name} ${person.email ? `- ${person.email}` : ''} ${person.phone ? `- ${person.phone}` : ''}`;
      return {
        value: person.id,
        label: label,
        person
      };
    });
  }, [contactPersons, selectedCustomer]);

  useEffect(() => {
    console.log("Current salesmen state:", salesmen);
    console.log("Salesman options:", salesmanOptions);
  }, [salesmen, salesmanOptions]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        addRows(1);
      }
      
      if (e.ctrlKey && e.shiftKey && e.key === 'Enter') {
        e.preventDefault();
        addColumns(1);
      }
      
      if (e.key === 'Escape' && activeCell) {
        setActiveCell(null);
      }
      
      if (activeCell && !e.ctrlKey && !e.altKey) {
        switch(e.key) {
          case 'ArrowDown':
            e.preventDefault();
            if (activeCell.row < gridRows - 1) {
              setActiveCell({ row: activeCell.row + 1, col: activeCell.col });
            }
            break;
          case 'ArrowUp':
            e.preventDefault();
            if (activeCell.row > 0) {
              setActiveCell({ row: activeCell.row - 1, col: activeCell.col });
            }
            break;
          case 'ArrowRight':
            e.preventDefault();
            if (activeCell.col < gridCols - 1) {
              setActiveCell({ row: activeCell.row, col: activeCell.col + 1 });
            }
            break;
          case 'ArrowLeft':
            e.preventDefault();
            if (activeCell.col > 0) {
              setActiveCell({ row: activeCell.row, col: activeCell.col - 1 });
            }
            break;
          case 'Tab':
            e.preventDefault();
            if (activeCell.col < gridCols - 1) {
              setActiveCell({ row: activeCell.row, col: activeCell.col + 1 });
            } else if (activeCell.row < gridRows - 1) {
              setActiveCell({ row: activeCell.row + 1, col: 0 });
            }
            break;
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeCell, gridRows, gridCols]);

  const fetchContactPersons = async (customerId: string) => {
    if (!company?.id) return;
    try {
      const apiUrl = `${process.env.NEXT_PUBLIC_API_URL}/companies/${company.id}/contact-persons?customer_id=${customerId}`;
      
      const response = await fetch(
        apiUrl,
        {
          headers: {
            Authorization: `Bearer ${getAuthToken()}`,
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
        
        if (persons.length > 0) {
          const firstPerson = persons[0];
          setSelectedContactPerson(firstPerson);
          setFormData(prev => ({
            ...prev,
            contact_person: firstPerson.name || ""
          }));
        }
      }
    } catch (error) {
      console.error("Failed to fetch contact persons:", error);
      setContactPersons([]);
    }
  };

  const quotationTypeOptions = useMemo(() => [
    { value: "item", label: "Item Quotation" },
    { value: "project", label: "Project Quotation" }
  ], []);

  useEffect(() => {
    const fetchData = async () => {
      if (!company?.id) return;
      
      try {
        setLoading(true);
        let customersArray: any[] = [];
        let validProducts: any[] = [];
        if (!isEditMode) {
          const nextQuotationNumber = await fetchNextQuotationNumber();
          setFormData(prev => ({
            ...prev,
            quotation_code: prev.quotation_code || nextQuotationNumber,
            subject: prev.subject || `Quotation ${nextQuotationNumber}`
          }));
          console.log("Next quotation number fetched:", nextQuotationNumber);
        }
        
        try {
          const customersData = await customersApi.list(company.id, { page_size: 100 });
          if (customersData && typeof customersData === 'object') {
            customersArray = customersData.customers || [];
          }
          
          if (customersArray.length > 0) {
            setCustomers(customersArray);
            showToast(`Loaded ${customersArray.length} customers`, "success");
          } else {
            showToast("No customers found. Please add customers first.", "warning");
          }
        } catch (customerError: any) {
          console.error("Failed to fetch customers:", customerError);
          showToast("Failed to load customers", "error");
        }
        
        try {
          const productsData: any = await productsApi.list(company.id, { page_size: 100 });
          let productsArray: any[] = [];
          
          console.log("Products API response:", productsData);
          
          if (Array.isArray(productsData)) {
            productsArray = productsData;
          } else if (productsData && typeof productsData === 'object') {
            if (productsData.products && Array.isArray(productsData.products)) {
              productsArray = productsData.products;
            } else if (productsData.data && Array.isArray(productsData.data)) {
              productsArray = productsData.data;
            } else if (productsData.items && Array.isArray(productsData.items)) {
              productsArray = productsData.items;
            }
          }
          
          validProducts = productsArray.filter(product => {
            if (!product || !product.id) return false;
            
            product.name = product.name || "Unnamed Product";
            product.description = product.description || "";
            product.hsn = product.hsn || product.hsn_code || product.hsn_no || "";
            product.unit_price = parseFloat(product.unit_price) || 0;
            product.sales_price = parseFloat(product.sales_price) || product.unit_price || 0;
            product.tax_rate = parseFloat(product.tax_rate) || 18;
            product.discount = parseFloat(product.discount) || 0;
            product.stock_quantity = parseFloat(product.stock_quantity) || 0;
            product.unit = product.unit || "unit";
            
            return true;
          });
          
          setProducts(validProducts);
          console.log(`Loaded ${validProducts.length} valid products`);
        } catch (productError: any) {
          console.error("Product fetch error:", productError);
          showToast("Failed to load products. Some products may have invalid data.", "warning");
        }
        
        await fetchSalesEngineers();

        if (editQuotationId) {
          await loadQuotationForEdit(editQuotationId, customersArray);
        } else if (enquiryIdForPrefill) {
          await prefillFromEnquiry(enquiryIdForPrefill, customersArray, validProducts);
        }
        
      } catch (error) {
        console.error("Unexpected error in fetchData:", error);
        showToast("Failed to load data", "error");
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [company?.id, editQuotationId, enquiryIdForPrefill]);

  useEffect(() => {
    console.log("Products loaded:", products);
    if (products.length > 0) {
      console.log("Sample product:", products[0]);
      console.log("Available fields:", Object.keys(products[0]));
    }
  }, [products]);

  useEffect(() => {
    if (!enquiryIdForPrefill || products.length === 0) return;
    const normalizeId = (value: any) => String(value ?? "").trim();
    const sameId = (a: any, b: any) => normalizeId(a) !== "" && normalizeId(a) === normalizeId(b);

    setItems((prevItems) => {
      let changed = false;

      const nextItems = prevItems.map((item) => {
        if (Number(item.unit_price) > 0) return item;

        const matchById = products.find((p: any) => sameId(p.id, item.product_id));
        const matchByCode =
          !matchById && item.item_code
            ? products.find((p: any) => String(p.item_code || p.code || "").trim().toLowerCase() === String(item.item_code || "").trim().toLowerCase())
            : null;
        const matchByText =
          !matchById && !matchByCode && item.description
            ? products.find((p: any) => {
                const d = String(item.description || "").trim().toLowerCase();
                return (
                  d.length > 0 &&
                  (d === String(p.name || "").trim().toLowerCase() ||
                    d === String(p.description || "").trim().toLowerCase())
                );
              })
            : null;

        const matchedProduct: any = matchById || matchByCode || matchByText;
        if (!matchedProduct) return item;

        const resolvedPrice =
          Number(matchedProduct.sales_price ?? matchedProduct.unit_price ?? 0) || 0;
        if (resolvedPrice <= 0) return item;

        changed = true;
        return {
          ...item,
          product_id: normalizeId(item.product_id || matchedProduct.id || ""),
          hsn: item.hsn || matchedProduct.hsn || matchedProduct.hsn_code || "",
          item_code: item.item_code || matchedProduct.item_code || matchedProduct.code || "",
          unit: item.unit || matchedProduct.unit || "unit",
          unit_price: resolvedPrice,
          gst_rate: Number(item.gst_rate || matchedProduct.gst_rate || matchedProduct.tax_rate || 18),
          discount_percent: Number(
            item.discount_percent ?? matchedProduct.discount_percent ?? matchedProduct.discount ?? 0
          ),
        };
      });

      return changed ? nextItems : prevItems;
    });
  }, [enquiryIdForPrefill, products, items]);

  const fetchSalesEngineers = async () => {
    if (!company?.id) return;
    
    try {
      const token = getAuthToken();
      if (!token) {
        showToast("Authentication required", "error");
        return;
      }

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
      console.log("Next number API response:", data); 

      if (data && Array.isArray(data) && data.length > 0) {
        const formattedSalesmen = data.map(engineer => ({
          id: engineer.id,
          name: engineer.full_name || 'Unnamed Engineer',
          email: engineer.email || '',
          phone: engineer.phone || '',
          designation: engineer.designation_name || 'Sales Engineer',
          employee_code: engineer.employee_code || ''
        }));

        setSalesmen(formattedSalesmen);
        console.log("Formatted salesmen:", formattedSalesmen);
        showToast(`Loaded ${formattedSalesmen.length} sales engineers`, "success");
      } else {
        showToast("No sales engineers found", "warning");
        setSalesmen([]);
      }
    } catch (error: any) {
      console.error("Failed to fetch sales engineers:", error);
      showToast("Failed to load sales engineers", "error");
      setSalesmen([]);
    }
  };

  const round2 = useCallback((value: number) => {
    return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
  }, []);

  const calculateItemTotal = useCallback((item: QuotationItem) => {
    const subtotal = round2(item.quantity * item.unit_price);
    const discountAmount = round2(subtotal * (item.discount_percent / 100));
    const taxableAmount = round2(subtotal - discountAmount);
    const taxAmount = round2(taxableAmount * (item.gst_rate / 100));
    const total = round2(taxableAmount + taxAmount);
    
    return {
      subtotal,
      discountAmount,
      taxableAmount,
      taxAmount,
      total
    };
  }, [round2]);

  const totals = useMemo(() => {
    const effectiveTaxRegime: "cgst_sgst" | "igst" = formData.tax_regime || "cgst_sgst";
    let subtotal = 0;
    let totalDiscount = 0;
    let totalTaxable = 0;
    let totalCgst = 0;
    let totalSgst = 0;
    let totalIgst = 0;
    let totalItems = 0;
    let totalQuantity = 0;

    items.forEach(item => {
      if (item.quantity > 0 && item.unit_price > 0) {
        totalItems++;
      }
      totalQuantity += item.quantity;

      const itemCalc = calculateItemTotal(item);
      subtotal = round2(subtotal + itemCalc.subtotal);
      totalDiscount = round2(totalDiscount + itemCalc.discountAmount);
      totalTaxable = round2(totalTaxable + itemCalc.taxableAmount);

      if (effectiveTaxRegime === "cgst_sgst") {
        const itemCgst = round2(itemCalc.taxAmount / 2);
        const itemSgst = round2(itemCalc.taxAmount - itemCgst);
        totalCgst = round2(totalCgst + itemCgst);
        totalSgst = round2(totalSgst + itemSgst);
      } else if (effectiveTaxRegime === "igst") {
        totalIgst = round2(totalIgst + itemCalc.taxAmount);
      }
    });

    let otherChargesAmountTotal = 0;
    let otherChargesTaxTotal = 0;
    otherCharges.forEach(charge => {
      if (!charge.name.trim() && charge.amount === 0) return;
      
      let chargeAmount = charge.amount;
      if (charge.type === "percentage") {
        chargeAmount = round2(totalTaxable * (charge.amount / 100));
      } else {
        chargeAmount = round2(chargeAmount);
      }
      
      const chargeTax = round2(chargeAmount * (charge.tax / 100));
      otherChargesAmountTotal = round2(otherChargesAmountTotal + chargeAmount);
      otherChargesTaxTotal = round2(otherChargesTaxTotal + chargeTax);

      if (effectiveTaxRegime === "cgst_sgst") {
        const chargeCgst = round2(chargeTax / 2);
        const chargeSgst = round2(chargeTax - chargeCgst);
        totalCgst = round2(totalCgst + chargeCgst);
        totalSgst = round2(totalSgst + chargeSgst);
      } else if (effectiveTaxRegime === "igst") {
        totalIgst = round2(totalIgst + chargeTax);
      }
    });

    const totalTax = round2(totalCgst + totalSgst + totalIgst);
    const totalBeforeRoundOff = round2(totalTaxable + otherChargesAmountTotal + totalTax);
    const roundOff = round2(Math.round(totalBeforeRoundOff) - totalBeforeRoundOff);
    const grandTotal = round2(totalBeforeRoundOff + roundOff);

    return {
      totalItems,
      totalQuantity,
      subtotal,
      totalDiscount,
      totalTaxable,
      totalCgst,
      totalSgst,
      totalIgst,
      totalTax,
      roundOff,
      grandTotal,
      otherChargesTotal: otherChargesAmountTotal,
      otherChargesTaxTotal
    };
  }, [items, otherCharges, formData.tax_regime, calculateItemTotal, round2]);

  const addSubItem = (itemIndex: number) => {
    const newItems = [...items];
    if (!newItems[itemIndex].subItems) {
      newItems[itemIndex].subItems = [];
    }
    newItems[itemIndex].subItems!.push({
      id: Date.now().toString() + Math.random(),
      description: "",
      quantity: 1,
      image: null,
      imageUrl: ""
    });
    setItems(newItems);
    showToast("Component added", "info");
  };

  const removeSubItem = (itemIndex: number, subItemId: string) => {
    const newItems = [...items];
    if (newItems[itemIndex].subItems) {
      newItems[itemIndex].subItems = newItems[itemIndex].subItems!.filter(
        subItem => subItem.id !== subItemId
      );
    }
    setItems(newItems);
    showToast("Sub-item removed", "info");
  };

  const updateSubItem = (
    itemIndex: number, 
    subItemId: string, 
    field: keyof SubItem, 
    value: any
  ) => {
    const newItems = [...items];
    const subItemIndex = newItems[itemIndex].subItems!.findIndex(
      subItem => subItem.id === subItemId
    );
    
    if (subItemIndex !== -1) {
      if (field === "image" && value instanceof File) {
        const imageUrl = URL.createObjectURL(value);
        newItems[itemIndex].subItems![subItemIndex] = {
          ...newItems[itemIndex].subItems![subItemIndex],
          image: value,
          imageUrl: imageUrl
        };
      } else {
        newItems[itemIndex].subItems![subItemIndex] = {
          ...newItems[itemIndex].subItems![subItemIndex],
          [field]: value
        };
      }
    }
    
    setItems(newItems);
  };

  const addItem = () => {
    setItems([...items, { 
      product_id: "", 
      hsn: "", 
      description: "", 
      quantity: 1, 
      unit: "unit", 
      unit_price: 0, 
      discount_percent: 0, 
      gst_rate: 18, 
    }]);
    showToast("New item row added", "info");
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
      showToast("Item removed", "info");
    } else {
      showToast("At least one item is required", "warning");
    }
  };

  const updateItem = (index: number, field: keyof QuotationItem, value: any) => {
    const newItems = [...items];
    
    if (field === "product_id" && value) {
      const product = products.find(p => p.id === value);
      if (product) {
        newItems[index] = {
          ...newItems[index],
          product_id: value,
          image_url:
            product.image_url ||
            product.main_image_url ||
            product.image ||
            product.main_image ||
            "",
          hsn: product.hsn || product.hsn_code || "",
          item_code: product.item_code || product.code || "",
          description: product.description || product.name || "Product",
          unit_price: product.unit_price || product.sales_price || 0,
          discount_percent: Number(product.discount ?? product.discount_percent ?? 0),
          quantity: 1,
          gst_rate: Number(product.tax_rate || product.gst_rate || 18)
        };
      }
    } else {
      newItems[index] = { ...newItems[index], [field]: value };
    }
    
    if (field === "description" && !value.trim()) {
      newItems[index] = { ...newItems[index], description: "Item" };
    }
    
    setItems(newItems);
  };

  const addOtherCharge = () => {
    setOtherCharges([...otherCharges, { 
      id: Date.now().toString(), 
      name: "", 
      amount: 0, 
      type: "fixed", 
      tax: 18 
    }]);
  };

  const removeOtherCharge = (id: string) => {
    if (otherCharges.length > 1) {
      setOtherCharges(otherCharges.filter(charge => charge.id !== id));
    }
  };

  const updateOtherCharge = (id: string, field: keyof OtherCharge, value: any) => {
    setOtherCharges(otherCharges.map(charge => 
      charge.id === id 
        ? { ...charge, [field]: value }
        : charge
    ));
  };

  const applyGlobalDiscount = () => {
    if (globalDiscount.value <= 0) {
      showToast("Please enter a discount value", "warning");
      return;
    }

    const newItems = items.map(item => {
      if (globalDiscount.type === "percentage") {
        const finalDiscount = Math.min(globalDiscount.value, 100);
        return { ...item, discount_percent: finalDiscount };
      } else {
        const itemSubtotal = item.quantity * item.unit_price;
        const percentageDiscount = (globalDiscount.value / itemSubtotal) * 100;
        const finalDiscount = Math.min(percentageDiscount, 100);
        return { ...item, discount_percent: finalDiscount };
      }
    });

    setItems(newItems);
    showToast("Discount applied to all items", "success");
  };

  const handleCustomerChange = async (option: any) => {
    if (option) {
      const customer = option.data;
      setSelectedCustomer(customer);
      setFormData(prev => ({
        ...prev,
        customer_id: option.value,
        contact_person: ""
      }));
      
      setSelectedContactPerson(null);
      setContactPersons([]);
      
      await fetchContactPersons(customer.id);
      
      const customerStateCode = normalizeStateCode(customer.billing_state_code || customer.billing_state);
      const companyStateCode = normalizeStateCode(company?.state_code || company?.state);
      if (customerStateCode && companyStateCode) {
        const isSameState = customerStateCode === companyStateCode;
        setFormData(prev => ({
          ...prev,
          tax_regime: isSameState ? "cgst_sgst" : "igst"
        }));
      }
    } else {
      setSelectedCustomer(null);
      setSelectedContactPerson(null);
      setContactPersons([]);
      setFormData(prev => ({
        ...prev,
        customer_id: "",
        contact_person: "",
        tax_regime: undefined  
      }));
    }
  };

  const handleContactPersonChange = (option: any) => {
    if (option) {
      const contactPerson = option.person;
      setSelectedContactPerson(contactPerson);
      setFormData(prev => ({
        ...prev,
        contact_person: contactPerson.name || ""
      }));
    } else {
      setSelectedContactPerson(null);
      setFormData(prev => ({
        ...prev,
        contact_person: ""
      }));
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const validateForm = () => {
    const errors: string[] = [];

    if (!formData.customer_id) {
      errors.push("Please select a customer");
    }

    if (!formData.contact_person) {
      errors.push("Please select a contact person");
    }

    if (!formData.salesman_id) {
      errors.push("Please select a sales engineer");
    }

    const validItems = items.filter(item => 
      item.quantity > 0 && item.unit_price > 0 && item.description.trim()
    );

    if (validItems.length === 0) {
      errors.push("Please add at least one valid item with quantity > 0, price > 0, and description");
    }

    return errors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validationErrors = validateForm();
    if (validationErrors.length > 0) {
      validationErrors.forEach(error => showToast(error, "error"));
      return;
    }

    const token = typeof window !== "undefined" ? getAuthToken() : null;
    if (!company?.id || !token) {
      showToast("Authentication required", "error");
      return;
    }

    setLoading(true);

    try {
      const excelDataText = getExcelDataAsText();
      
      const itemsForBackend = items
        .filter(item => item.quantity > 0 && item.unit_price >= 0)
        .map(item => {
          const baseItem = {
            product_id: item.product_id || undefined,
            description: item.description || "Item",
            image_url: item.image_url || undefined,
            hsn_code: item.hsn || "",
            item_code: item.item_code || undefined, 
            quantity: item.quantity,
            unit: item.unit || "unit",
            unit_price: item.unit_price,
            discount_percent: item.discount_percent,
            gst_rate: item.gst_rate,
            item_type: formData.quotation_type === "project" ? "project" : "item"
          };

          if (formData.quotation_type === "project" && item.subItems && item.subItems.length > 0) {
            const subItemsData = item.subItems.map(subItem => {
              const subItemData: any = {
                description: subItem.description,
                quantity: subItem.quantity
              };
              
              if (subItem.imageUrl) {
                subItemData.image_url = subItem.imageUrl;
              }
              
              return subItemData;
            });
            
            return {
              ...baseItem,
              sub_items: subItemsData
            };
          }

          return baseItem;
        });
        
      if (itemsForBackend.length === 0) {
        showToast("Please add at least one valid item", "error");
        setLoading(false);
        return;
      }

      const payload = {
        quotation_number: formData.quotation_code, 
        customer_id: formData.customer_id || undefined,
        quotation_date: new Date(formData.quotation_date).toISOString(),
        validity_days: formData.validity_days,
        status: formData.status || "open",
        tax_regime: formData.tax_regime || undefined,
        place_of_supply:
          selectedCustomer?.billing_state_code ||
          normalizeStateCode(selectedCustomer?.billing_state) ||
          undefined,
        subject: formData.subject || `Quotation ${formData.quotation_code}`,
        notes: formData.notes || undefined,
        terms: formData.terms || undefined,
        remarks: formData.remarks || undefined,
        contact_person: formData.contact_person || undefined,
        sales_person_id: formData.salesman_id || undefined,
        reference: formData.reference || undefined,
        reference_no: formData.reference_no || undefined,
        reference_date: formData.reference_date || undefined,
        quotation_type: formData.quotation_type || "item", 
        payment_terms: formData.payment_terms || undefined,
        excel_notes: excelDataText || undefined,
        show_images: formData.show_images !== false,
        show_images_in_pdf: formData.show_images_in_pdf !== false,
        freight_charges: 0,
        freight_type: "fixed",
        p_and_f_charges: 0,
        pf_type: "fixed",
        round_off: totals.roundOff,
        other_charges: otherCharges
          .filter((charge) => charge.name.trim() || Number(charge.amount) > 0)
          .map((charge) => ({
            id: charge.id,
            name: charge.name || "Other Charges",
            amount: Number(charge.amount) || 0,
            type: charge.type,
            tax: Number(charge.tax) || 0,
          })),
        items: itemsForBackend
      };

      const formDataToSend = new FormData();
      formDataToSend.append('data', JSON.stringify(payload));
      
      if (excelDataText) {
        const csvBlob = new Blob([excelDataText], { type: 'text/csv' });
        formDataToSend.append('excel_file', csvBlob, 'excel_notes.csv');
      }

      console.log("Sending FormData payload:", payload);

      const requestUrl = isEditMode
        ? `${process.env.NEXT_PUBLIC_API_URL}/companies/${company.id}/quotations/${editQuotationId}`
        : `${process.env.NEXT_PUBLIC_API_URL}/companies/${company.id}/quotations`;

      const response = await fetch(
        requestUrl,
        {
          method: isEditMode ? "PUT" : "POST",
          headers: {
            "Authorization": `Bearer ${token}`,
          },
          body: formDataToSend,
        }
      );

      if (response.ok) {
        const data = await response.json();
        showToast(isEditMode ? "Quotation updated successfully!" : "Quotation created successfully!", "success");
        router.push(isEditMode ? `/quotations/${editQuotationId}` : `/quotations`);
      } else {
        const errorText = await response.text();
        console.error("Backend error response:", errorText);
        
        let errorMessage = "Failed to create quotation";
        try {
          const errorData = JSON.parse(errorText);
          if (errorData.detail) {
            if (Array.isArray(errorData.detail)) {
              errorMessage = errorData.detail.map((err: any) => err.msg || err.message).join(", ");
            } else if (typeof errorData.detail === 'string') {
              errorMessage = errorData.detail;
            } else if (errorData.detail?.msg) {
              errorMessage = errorData.detail.msg;
            }
          }
        } catch (parseError) {
          errorMessage = errorText || "Unknown error occurred";
        }
        
        showToast(errorMessage, "error");
      }
    } catch (err: any) { 
      console.error("Submission error:", err);
      const errorMessage = err instanceof Error ? err.message : "Network error";
      showToast(`Failed to ${isEditMode ? "update" : "create"} quotation: ${errorMessage}`, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (items.some(item => item.product_id) || formData.customer_id) {
      if (window.confirm("Are you sure? Any unsaved changes will be lost.")) {
        router.push(isEditMode ? `/quotations/${editQuotationId}` : "/quotations");
      }
    } else {
      router.push(isEditMode ? `/quotations/${editQuotationId}` : "/quotations");
    }
  };

  const exportToCSVForSubmission = () => {
    let csv = '';
    
    for (let rowIndex = 0; rowIndex < totalRows; rowIndex++) {
      const row = excelGrid[rowIndex] || [];
      const rowData = [];
      
      for (let colIndex = 0; colIndex < totalCols; colIndex++) {
        const cell = row[colIndex];
        let cellValue = '';
        
        if (cell) {
          if (cell.computedValue !== '' && cell.computedValue !== undefined && cell.computedValue !== null) {
            cellValue = String(cell.computedValue);
          } else {
            cellValue = String(cell.value || '');
          }
        }
        
        if (typeof cellValue === 'string') {
          if (cellValue.includes(',') || cellValue.includes('"') || cellValue.includes('\n') || cellValue.includes('\r')) {
            cellValue = '"' + cellValue.replace(/"/g, '""') + '"';
          }
        }
        
        rowData.push(cellValue);
      }
      
      if (rowData.some(cell => cell !== '' && cell !== '""')) {
        csv += rowData.join(',') + '\n';
      }
    }
    
    return csv.trim();
  };

  const removeToast = (id: number) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="fixed top-4 right-4 z-50 space-y-2">
          {toasts.map((toast) => (
            <Toast
              key={toast.id}
              message={toast.message}
              type={toast.type}
              onClose={() => removeToast(toast.id)}
            />
          ))}
        </div>

        {imagePreview && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[100] p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Image Preview
                </h3>
                <button
                  type="button"
                  onClick={() => setImagePreview(null)}
                  className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                >
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="p-4 overflow-auto">
                <div className="flex flex-col items-center">
                  <img
                    src={imagePreview.url}
                    alt={imagePreview.alt}
                    className="max-w-full max-h-[70vh] object-contain rounded-lg"
                  />
                  <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
                    {imagePreview.alt}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {showCopyModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Copy Existing Quotation
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setShowCopyModal(false);
                    setCopyQuotationNumber("");
                    setCopyError("");
                  }}
                  className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Enter Quotation Number *
                  </label>
                  <input
                    type="text"
                    value={copyQuotationNumber}
                    onChange={(e) => setCopyQuotationNumber(e.target.value)}
                    placeholder="e.g., QT-2024-001"
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
                    disabled={isFetchingQuotation}
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Enter the exact quotation number you want to copy
                  </p>
                </div>
                
                {copyError && (
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <p className="text-sm text-red-600 dark:text-red-400">{copyError}</p>
                  </div>
                )}
                
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCopyModal(false);
                      setCopyQuotationNumber("");
                      setCopyError("");
                    }}
                    className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                    disabled={isFetchingQuotation}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => prefillFormWithQuotation(copyQuotationNumber)}
                    disabled={!copyQuotationNumber.trim() || isFetchingQuotation}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isFetchingQuotation ? (
                      <>
                        <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Searching...
                      </>
                    ) : (
                      <>
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Load Quotation
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="mb-6 md:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                {isEditMode ? "Edit Quotation" : "Create New Quotation"}
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                {isEditMode ? "Update quotation details" : "Create a detailed quotation for your customer"}
              </p>
            </div>
            
            {!isEditMode && (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowCopyModal(true)}
                  className="inline-flex items-center gap-2 rounded-lg border border-blue-600 px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 dark:border-blue-500 dark:text-blue-500 dark:hover:bg-blue-900/20"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copy Existing Quotation
                </button>
              </div>
            )}
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-6">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 md:p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Quotation Details
                </h2>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Quotation No *
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={formData.quotation_code || "Loading..."}
                        readOnly
                        className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
                        required 
                        disabled={!formData.quotation_code}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Date *
                    </label>
                    <input
                      type="date"
                      value={formData.quotation_date}
                      onChange={(e) => setFormData({ ...formData, quotation_date: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Quotation Type *
                    </label>
                    <Select
                      options={quotationTypeOptions}
                      value={quotationTypeOptions.find(opt => opt.value === formData.quotation_type)}
                      onChange={(option) => {
                        if (option) {
                          const newType = option.value as "item" | "project";
                          setFormData({ 
                            ...formData, 
                            quotation_type: newType,
                            quotation_search_type: newType 
                          });
                          
                          if (newType === "project") {
                            setItems([{
                              product_id: "",
                              hsn: "",
                              description: "",
                              quantity: 1,
                              unit: "project",
                              unit_price: 0,
                              discount_percent: 0,
                              gst_rate: 18,
                              isProject: true,
                              subItems: []
                            }]);
                          } else {
                            setItems([
                              { 
                                product_id: "", 
                                hsn: "", 
                                description: "", 
                                quantity: 1, 
                                unit: "unit", 
                                unit_price: 0, 
                                discount_percent: 0, 
                                gst_rate: 18 
                              }
                            ]);
                          }
                          
                          showToast(`Quotation type changed to: ${option.label}`, "info");
                        }
                      }}
                      placeholder="Search or select quotation type..."
                      className="react-select-container"
                      classNamePrefix="react-select"
                      isSearchable
                      isClearable={false}
                      formatOptionLabel={(option) => (
                        <div className="flex flex-col">
                          <div className="font-medium">{option.label}</div>
                        </div>
                      )}
                      noOptionsMessage={() => "No quotation types found"}
                      styles={{
                        control: (base) => ({
                          ...base,
                          borderColor: '#d1d5db',
                          '&:hover': {
                            borderColor: '#9ca3af',
                          },
                          minHeight: '42px',
                          borderRadius: '0.5rem',
                        }),
                        menu: (base) => ({
                          ...base,
                          zIndex: 9999,
                        })
                      }}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Validity Days
                    </label>
                    <input
                      type="number"
                      value={formData.validity_days}
                      onChange={(e) => setFormData({ ...formData, validity_days: parseInt(e.target.value) || 30 })}
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm"
                      min="1"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Status *
                    </label>
                    <select
                      value={formData.status || "open"}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm"
                      required
                    >
                      <option value="open">Open</option>
                      <option value="closed">Closed</option>
                      <option value="po_converted">PO Converted</option>
                      <option value="lost">Lost</option>
                    </select>
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <div className="relative">
                        <input
                          type="checkbox"
                          checked={formData.show_images}
                          onChange={(e) => setFormData(prev => ({ 
                            ...prev, 
                            show_images: e.target.checked 
                          }))}
                          className="sr-only peer"
                        />
                        <div className="w-10 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          Show Product Images
                        </span>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {formData.show_images ? "Images will be displayed in quotation" : "Images will be hidden"}
                        </p>
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 md:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Customer Information
                  </h2>
                  <button
                    type="button"
                    onClick={() => router.push("/customers/new")}
                    className="mt-2 sm:mt-0 inline-flex items-center gap-2 rounded-lg border border-blue-600 px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 dark:border-blue-500 dark:text-blue-500 dark:hover:bg-blue-900/20"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add New Customer
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Customer *
                    </label>
                    
                    <div className="mb-2 flex items-center gap-2 text-sm">
                      {loading ? (
                        <span className="text-blue-600">Loading customers...</span>
                      ) : customerOptions.length > 0 ? (
                        <span className="text-green-600">✓ {customerOptions.length} customer(s) available</span>
                      ) : (
                        <span className="text-yellow-600">No customers found</span>
                      )}
                    </div>
                    
                    <Select
                      options={customerOptions}
                      value={customerOptions.find(opt => opt.value === formData.customer_id)}
                      onChange={handleCustomerChange}
                      placeholder={loading ? "Loading customers..." : "Click here to select customer"}
                      className="react-select-container"
                      classNamePrefix="react-select"
                      isLoading={loading}
                      isClearable
                      isSearchable
                      noOptionsMessage={() => "No customers found. Add customers first."}
                      styles={{
                        control: (base, state) => ({
                          ...base,
                          borderColor: customerOptions.length > 0 ? '#10b981' : '#d1d5db',
                          '&:hover': {
                            borderColor: customerOptions.length > 0 ? '#059669' : '#9ca3af',
                          },
                          backgroundColor: state.isFocused ? '#f3f4f6' : base.backgroundColor,
                        }),
                        menu: (base) => ({
                          ...base,
                          zIndex: 9999,
                        })
                      }}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Contact Person *
                    </label>
                    
                    <Select
                      options={contactPersonOptions}
                      value={contactPersonOptions.find(opt => opt.value === selectedContactPerson?.id)}
                      onChange={handleContactPersonChange}
                      placeholder={
                        selectedCustomer 
                          ? (contactPersonOptions.length > 0 
                              ? "Select Contact Person..." 
                              : "No contact persons found for this customer")
                          : "Please select a customer first"
                      }
                      className="react-select-container"
                      classNamePrefix="react-select"
                      isClearable
                      isSearchable
                      isDisabled={!selectedCustomer}
                      noOptionsMessage={() => 
                        selectedCustomer 
                          ? "No contact persons found for this customer" 
                          : "Please select a customer first"
                      }
                      formatOptionLabel={(option) => (
                        <div className="flex flex-col">
                          <div className="font-medium">{option.person?.name || "Unnamed Contact"}</div>
                          <div className="text-xs text-gray-500">
                            {option.person?.email ? `Email: ${option.person.email}` : ''}
                            {option.person?.phone ? `${option.person.email ? ' • ' : ''}Phone: ${option.person.phone}` : ''}
                          </div>
                        </div>
                      )}
                    />
                    {selectedCustomer && contactPersonOptions.length === 0 && (
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        No contact persons found for this customer. Please add contact persons in the customer management section.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 md:p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Sales & Reference
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Sales Engineer *
                    </label>
                    <Select
                      options={salesmanOptions}
                      value={salesmanOptions.find(opt => opt.value === formData.salesman_id)}
                      onChange={(option) => {
                        setFormData({ ...formData, salesman_id: option?.value || "" });
                        if (option?.salesman) {
                          console.log("Selected sales engineer:", option.salesman);
                        }
                      }}
                      placeholder={salesmen.length > 0 ? "Select Sales Engineer..." : "No sales engineers available"}
                      className="react-select-container"
                      classNamePrefix="react-select"
                      isLoading={loading && salesmen.length === 0}
                      isClearable
                      isSearchable
                      noOptionsMessage={() => salesmen.length === 0 ? "No sales engineers available" : "No options found"}
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Reference
                      </label>
                      <input
                        type="text"
                        value={formData.reference}
                        onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                        className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Reference No
                      </label>
                      <input
                        type="text"
                        value={formData.reference_no}
                        onChange={(e) => setFormData({ ...formData, reference_no: e.target.value })}
                        className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Reference Date
                    </label>
                    <input
                      type="date"
                      value={formData.reference_date}
                      onChange={(e) => setFormData({ ...formData, reference_date: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 md:p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Terms & Conditions
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Standard Terms *
                    </label>
                    <textarea
                      value={formData.payment_terms}
                      onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })}
                      rows={8}
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
                      placeholder="Enter standard terms and conditions..."
                      required
                    />
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Pre-filled with standard terms. You can edit as needed.
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Additional Terms
                    </label>
                    <textarea
                      value={formData.terms || ""}
                      onChange={(e) => setFormData({ ...formData, terms: e.target.value })}
                      rows={4}
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
                      placeholder="Enter any additional terms and conditions..."
                    />
                  </div>

                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                      Remarks
                    </h2>
                    <textarea
                      value={formData.remarks}
                      onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                      rows={4}
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
                      placeholder="Enter any additional remarks or notes..."
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 md:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {formData.quotation_type === "project" ? "Project Items" : "Items"}
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {formData.quotation_type === "project" 
                    ? "Add project items with detailed components" 
                    : "Add items to your quotation"}
                </p>
              </div>
              <div className="flex gap-2 mt-2 sm:mt-0">
                <button
                  type="button"
                  onClick={() => router.push("/products/new")}
                  className="inline-flex items-center gap-2 rounded-lg border border-blue-600 px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 dark:border-blue-500 dark:text-blue-500 dark:hover:bg-blue-900/20"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add New Product
                </button>
                <button
                  type="button"
                  onClick={addItem}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  {formData.quotation_type === "project" ? "Add Project Item" : "Add Item"}
                </button>
              </div>
            </div>

            {/* REGULAR ITEMS VIEW */}
            {formData.quotation_type === "item" ? (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse min-w-[1580px]">
                <thead>
  <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-900 dark:text-white uppercase tracking-wider w-[450px] min-w-[450px]">
      Item
    </th>
    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-900 dark:text-white uppercase tracking-wider w-[120px] min-w-[120px]">
      Item Code
    </th>
    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-900 dark:text-white uppercase tracking-wider w-[120px] min-w-[120px]">
      HSN Code
    </th>
    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-900 dark:text-white uppercase tracking-wider w-[200px] min-w-[150px]">
      Description
    </th>
    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-900 dark:text-white uppercase tracking-wider w-[80px] min-w-[80px]">
      Qty
    </th>
    {formData.show_images && (
      <th className="px-3 py-3 text-left text-xs font-semibold text-gray-900 dark:text-white uppercase tracking-wider w-[80px] min-w-[80px]">
        Image
      </th>
    )}
    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-900 dark:text-white uppercase tracking-wider w-[120px] min-w-[120px]">
      Unit Price
    </th>
    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-900 dark:text-white uppercase tracking-wider w-[100px] min-w-[100px]">
      Discount %
    </th>
    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-900 dark:text-white uppercase tracking-wider w-[80px] min-w-[80px]">
      GST %
    </th>
    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-900 dark:text-white uppercase tracking-wider w-[120px] min-w-[120px]">
      Total
    </th>
    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-900 dark:text-white uppercase tracking-wider w-[60px] min-w-[60px]">
      Action
    </th>
  </tr>
</thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {items.map((item, index) => (
                      <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-3 py-3 w-[560px] min-w-[560px]">
                          <Select
                            options={productOptions}
                            value={
                              productOptions.find(opt => opt.value === item.product_id) ||
                              (!item.product_id && item.description
                                ? { value: `manual-${index}`, label: item.description }
                                : null)
                            }
                            onChange={(option) => {
                              if (option) {
                                const selectedProduct = option.product || products.find(p => p.id === option.value);
                                if (selectedProduct) {
                                  const updatedItem = {
                                    product_id: selectedProduct.id,
                                    image_url:
                                      selectedProduct.image_url ||
                                      selectedProduct.main_image_url ||
                                      selectedProduct.image ||
                                      selectedProduct.main_image ||
                                      "",
                                    hsn: selectedProduct.hsn || selectedProduct.hsn_code || "",
                                    description: selectedProduct.description || selectedProduct.name || "Product",
                                    unit_price: selectedProduct.unit_price || selectedProduct.sales_price || 0,
                                    discount_percent: Number(
                                      selectedProduct.discount ?? selectedProduct.discount_percent ?? 0
                                    ),
                                    gst_rate: Number(selectedProduct.tax_rate || selectedProduct.gst_rate || 18),
                                    quantity: item.quantity,
                                    unit: item.unit || "unit"
                                  };
                                  setItems(prev => prev.map((it, idx) => 
                                    idx === index ? { ...it, ...updatedItem } : it
                                  ));
                                  
                                  if (option.image_url) {
                                    showToast(`Selected: ${selectedProduct.name || selectedProduct.item_code}`, "info");
                                  }
                                }
                              } else {
                                setItems(prev => prev.map((it, idx) => 
                                  idx === index ? { 
                                    ...it,
                                    product_id: "",
                                    hsn: "",
                                    description: "",
                                    unit_price: 0,
                                    discount_percent: 0,
                                    gst_rate: 18
                                  } : it
                                ));
                              }
                            }}
                            placeholder="Search item..."
                            className="react-select-container"
                            classNamePrefix="react-select"
                            styles={{
                              control: (base) => ({
                                ...base,
                                minHeight: '36px',
                                height: '36px',
                                borderRadius: '0.375rem',
                                borderColor: '#d1d5db',
                              }),
                              valueContainer: (base) => ({
                                ...base,
                                height: '36px',
                                padding: '0 8px',
                              }),
                              input: (base) => ({
                                ...base,
                                margin: '0px',
                              }),
                              indicatorsContainer: (base) => ({
                                ...base,
                                height: '36px',
                              }),
                              menuPortal: (base) => ({
                                ...base,
                                zIndex: 9999,
                              }),
                              menu: (base) => ({
                                ...base,
                                minWidth: '620px',
                                zIndex: 9999,
                              }),
                            }}
                            menuPortalTarget={typeof window !== "undefined" ? document.body : undefined}
                            menuPosition="fixed"
                            menuPlacement="auto"
                            isClearable
                            isSearchable
                            formatOptionLabel={(option, { context }) => (
                              <div className="flex items-center gap-2">
                                {option.image_url && (
                                  <img
                                    src={option.image_url}
                                    alt=""
                                    className="h-6 w-6 object-cover rounded"
                                  />
                                )}
                                <div className="whitespace-normal break-words">{option.label}</div>
                              </div>
                            )}
                          />
                        </td>

                        {/* Item Code */}
<td className="px-3 py-3 w-[120px] min-w-[120px]">
  <input
    type="text"
    value={item.item_code || ""}
    onChange={(e) => {
      const newItems = [...items];
      newItems[index] = { ...newItems[index], item_code: e.target.value };
      setItems(newItems);
    }}
    className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1.5 text-sm"
    placeholder="Code"
  />
</td>

{/* HSN Code */}
<td className="px-3 py-3 w-[120px] min-w-[120px]">
  <input
    type="text"
    value={item.hsn}
    onChange={(e) => updateItem(index, "hsn", e.target.value)}
    className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1.5 text-sm"
    placeholder="HSN"
  />
</td>

                        <td className="px-3 py-3 w-[170px] min-w-[170px]">
                          <input
                            type="text"
                            value={item.description}
                            onChange={(e) => updateItem(index, "description", e.target.value)}
                            className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1.5 text-sm"
                            placeholder="Description"
                          />
                        </td>

                        <td className="px-3 py-3">
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => updateItem(index, "quantity", parseFloat(e.target.value) || 0)}
                            min={0.01}
                            step={0.01}
                            className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1.5 text-sm"
                          />
                        </td>

                        {formData.show_images && (
                          <td className="px-3 py-3">
                            {getItemImageUrl(item) ? (
                              <img
                                src={getItemImageUrl(item) || ''}
                                alt="Product"
                                className="h-8 w-8 object-cover rounded border border-gray-300 dark:border-gray-600 cursor-pointer"
                                onClick={() => {
                                  const imgUrl = getItemImageUrl(item);
                                  if (imgUrl) {
                                    setImagePreview({
                                      url: imgUrl,
                                      alt: productOptions.find(opt => opt.value === item.product_id)?.label || 'Product Image'
                                    });
                                  }
                                }}
                              />
                            ) : (
                              <div className="h-8 w-8 flex items-center justify-center border border-dashed border-gray-300 dark:border-gray-600 rounded">
                                <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                              </div>
                            )}
                          </td>
                        )}

                        <td className="px-3 py-3">
                          <input
                            type="number"
                            value={item.unit_price}
                            onChange={(e) => updateItem(index, "unit_price", parseFloat(e.target.value) || 0)}
                            min={0}
                            step={0.01}
                            className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1.5 text-sm"
                          />
                        </td>

                        <td className="px-3 py-3">
                          <input
                            type="number"
                            value={item.discount_percent}
                            onChange={(e) => updateItem(index, "discount_percent", parseFloat(e.target.value) || 0)}
                            min={0}
                            max={100}
                            step={0.01}
                            className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1.5 text-sm"
                          />
                        </td>

                        <td className="px-3 py-3">
                          <select
                            value={item.gst_rate}
                            onChange={(e) => updateItem(index, "gst_rate", Number(e.target.value) || 18)}
                            className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1.5 text-sm"
                          >
                            <option value={0}>0%</option>
                            <option value={5}>5%</option>
                            <option value={12}>12%</option>
                            <option value={18}>18%</option>
                            <option value={28}>28%</option>
                          </select>
                        </td>

                        <td className="px-3 py-3">
                          <input
                            type="text"
                            value={formatCurrency(calculateItemTotal(item).total)}
                            readOnly
                            className="w-full rounded border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 px-2 py-1.5 text-sm font-medium"
                          />
                        </td>

                        <td className="px-3 py-3">
                          <button
                            type="button"
                            onClick={() => removeItem(index)}
                            className="rounded p-1 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                            disabled={items.length <= 1}
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              /* PROJECT ITEMS VIEW */
              <div className="space-y-8">
                {items.map((item, itemIndex) => (
                  <div key={itemIndex} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-200 dark:border-gray-700">
                      <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                        Project Item #{itemIndex + 1}
                      </h3>
                      <button
                        type="button"
                        onClick={() => removeItem(itemIndex)}
                        className="rounded p-1 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                        disabled={items.length <= 1}
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>

                    <div className="overflow-x-auto mb-6">
                      <table className="w-full border-collapse min-w-[1500px]">
                        <thead>
                          <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-900 dark:text-white w-[560px] min-w-[560px]">
                              Item
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-900 dark:text-white w-[90px] min-w-[90px]">
                              Item Code
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-900 dark:text-white w-[90px] min-w-[90px]">
                              HSN Code
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-900 dark:text-white w-[170px] min-w-[170px]">
                              Description
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-900 dark:text-white w-[70px] min-w-[70px]">
                              Qty
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-900 dark:text-white w-[100px] min-w-[100px]">
                              Unit Price
                            </th>
                            {formData.show_images && (
                              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-900 dark:text-white w-[70px] min-w-[70px]">
                                Image
                              </th>
                            )}
                            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-900 dark:text-white w-[80px] min-w-[80px]">
                              Discount %
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-900 dark:text-white w-[70px] min-w-[70px]">
                              GST %
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-900 dark:text-white w-[110px] min-w-[110px]">
                              Total
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                            <td className="px-3 py-2 w-[560px] min-w-[560px]">
                              <Select
                                options={productOptions}
                                value={
                                  productOptions.find(opt => opt.value === item.product_id) ||
                                  (!item.product_id && item.description
                                    ? { value: `manual-${itemIndex}`, label: item.description }
                                    : null)
                                }
                                onChange={(option) => {
                                  if (option) {
                                    const selectedProduct = option.product || products.find(p => p.id === option.value);
                                    if (selectedProduct) {
                                      const updatedItem = {
                                        product_id: selectedProduct.id,
                                        image_url:
                                          selectedProduct.image_url ||
                                          selectedProduct.main_image_url ||
                                          selectedProduct.image ||
                                          selectedProduct.main_image ||
                                          "",
                                        hsn: selectedProduct.hsn || selectedProduct.hsn_code || "",
                                        description: selectedProduct.description || selectedProduct.name || "Product",
                                        unit_price: selectedProduct.unit_price || selectedProduct.sales_price || 0,
                                        discount_percent: Number(
                                          selectedProduct.discount ?? selectedProduct.discount_percent ?? 0
                                        ),
                                        gst_rate: Number(selectedProduct.tax_rate || selectedProduct.gst_rate || 18),
                                        quantity: item.quantity,
                                        unit: item.unit || "unit"
                                      };
                                      setItems(prev => prev.map((it, idx) => 
                                        idx === itemIndex ? { ...it, ...updatedItem } : it
                                      ));
                                    }
                                  } else {
                                    setItems(prev => prev.map((it, idx) => 
                                      idx === itemIndex ? { 
                                        ...it,
                                        product_id: "",
                                        hsn: "",
                                        description: "",
                                        unit_price: 0,
                                        discount_percent: 0,
                                        gst_rate: 18
                                      } : it
                                    ));
                                  }
                                }}
                                placeholder="Search..."
                                className="react-select-container"
                                classNamePrefix="react-select"
                                styles={{
                                  control: (base) => ({
                                    ...base,
                                    minHeight: '34px',
                                    height: '34px',
                                  }),
                                  valueContainer: (base) => ({
                                    ...base,
                                    height: '34px',
                                    padding: '0 6px',
                                  }),
                                  indicatorsContainer: (base) => ({
                                    ...base,
                                    height: '34px',
                                  }),
                                  menuPortal: (base) => ({
                                    ...base,
                                    zIndex: 9999,
                                  }),
                                  menu: (base) => ({
                                    ...base,
                                    minWidth: '620px',
                                    zIndex: 9999,
                                  }),
                                }}
                                menuPortalTarget={typeof window !== "undefined" ? document.body : undefined}
                                menuPosition="fixed"
                                menuPlacement="auto"
                                isClearable
                                isSearchable
                                formatOptionLabel={(option) => (
                                  <div className="flex items-center gap-2">
                                    {option.image_url && (
                                      <img
                                        src={option.image_url}
                                        alt=""
                                        className="h-6 w-6 object-cover rounded"
                                      />
                                    )}
                                    <div className="whitespace-normal break-words">{option.label}</div>
                                  </div>
                                )}
                              />
                            </td>

                            <td className="px-3 py-2">
                              <input
                                type="text"
                                value={item.item_code || ""}
                                onChange={(e) => {
                                  const newItems = [...items];
                                  newItems[itemIndex] = { ...newItems[itemIndex], item_code: e.target.value };
                                  setItems(newItems);
                                }}
                                className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1 text-sm"
                              />
                            </td>

                            <td className="px-3 py-2">
                              <input
                                type="text"
                                value={item.hsn}
                                onChange={(e) => updateItem(itemIndex, "hsn", e.target.value)}
                                className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1 text-sm"
                              />
                            </td>

                            <td className="px-3 py-2 w-[170px] min-w-[170px]">
                              <input
                                type="text"
                                value={item.description}
                                onChange={(e) => updateItem(itemIndex, "description", e.target.value)}
                                className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1 text-sm"
                              />
                            </td>

                            <td className="px-3 py-2">
                              <input
                                type="number"
                                value={item.quantity}
                                onChange={(e) => updateItem(itemIndex, "quantity", parseFloat(e.target.value) || 1)}
                                min={0.01}
                                step={0.01}
                                className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1 text-sm"
                              />
                            </td>

                            <td className="px-3 py-2">
                              <input
                                type="number"
                                value={item.unit_price}
                                onChange={(e) => updateItem(itemIndex, "unit_price", parseFloat(e.target.value) || 0)}
                                min={0}
                                step={0.01}
                                className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1 text-sm"
                              />
                            </td>

                            {formData.show_images && (
                              <td className="px-3 py-2">
                                {getItemImageUrl(item) ? (
                                  <img
                                    src={getItemImageUrl(item) || ''}
                                    alt="Product"
                                    className="h-7 w-7 object-cover rounded border border-gray-300 dark:border-gray-600 cursor-pointer"
                                    onClick={() => {
                                      const imgUrl = getItemImageUrl(item);
                                      if (imgUrl) {
                                        setImagePreview({
                                          url: imgUrl,
                                          alt: productOptions.find(opt => opt.value === item.product_id)?.label || 'Product Image'
                                        });
                                      }
                                    }}
                                  />
                                ) : (
                                  <div className="h-7 w-7 flex items-center justify-center border border-dashed border-gray-300 dark:border-gray-600 rounded">
                                    <svg className="h-3 w-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                  </div>
                                )}
                              </td>
                            )}

                            <td className="px-3 py-2">
                              <input
                                type="number"
                                value={item.discount_percent}
                                onChange={(e) => updateItem(itemIndex, "discount_percent", parseFloat(e.target.value) || 0)}
                                min={0}
                                max={100}
                                step={0.01}
                                className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1 text-sm"
                              />
                            </td>

                            <td className="px-3 py-2">
                              <select
                                value={item.gst_rate}
                                onChange={(e) => updateItem(itemIndex, "gst_rate", Number(e.target.value) || 18)}
                                className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1 text-sm"
                              >
                                <option value={0}>0%</option>
                                <option value={5}>5%</option>
                                <option value={12}>12%</option>
                                <option value={18}>18%</option>
                                <option value={28}>28%</option>
                              </select>
                            </td>

                            <td className="px-3 py-2">
                              <input
                                type="text"
                                value={formatCurrency(calculateItemTotal(item).total)}
                                readOnly
                                className="w-full rounded border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 px-2 py-1 text-sm font-medium"
                              />
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
                        <div>
                          <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                            Project Components
                          </h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            Add detailed components that make up this project
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => addSubItem(itemIndex)}
                          className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 mt-2 sm:mt-0"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                          Add Component
                        </button>
                      </div>

                      {item.subItems && item.subItems.length > 0 ? (
                        <div className="overflow-x-auto">
                          <div className="inline-block min-w-full align-middle">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                              <thead>
                                <tr className="border-b border-gray-200 dark:border-gray-700">
                                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-900 dark:text-white uppercase tracking-wider w-12">
                                    #
                                  </th>
                                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-900 dark:text-white uppercase tracking-wider min-w-[200px] max-w-[300px]">
                                    Description *
                                  </th>
                                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-900 dark:text-white uppercase tracking-wider w-24">
                                    Qty *
                                  </th>
                                  {formData.show_images && (
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 dark:text-white uppercase tracking-wider">
                                      Image
                                    </th>
                                  )}
                                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-900 dark:text-white uppercase tracking-wider w-20">
                                    Action
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {item.subItems.map((subItem, idx) => (
                                  <tr key={subItem.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                    <td className="px-3 py-3 whitespace-nowrap w-12">
                                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                                        {idx + 1}
                                      </span>
                                    </td>
                                    
                                    <td className="px-3 py-3 min-w-[200px] max-w-[300px]">
                                      <textarea
                                        value={subItem.description}
                                        onChange={(e) => updateSubItem(itemIndex, subItem.id, "description", e.target.value)}
                                        className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-1.5 text-sm resize-y"
                                        rows={1}
                                        placeholder="Component description..."
                                        required
                                        style={{ minHeight: '2.5rem', maxHeight: '6rem' }}
                                      />
                                    </td>
                                    
                                    <td className="px-3 py-3 whitespace-nowrap w-24">
                                      <input
                                        type="number"
                                        value={subItem.quantity}
                                        onChange={(e) => updateSubItem(itemIndex, subItem.id, "quantity", parseFloat(e.target.value) || 1)}
                                        min={1}
                                        step={1}
                                        className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-1.5 text-sm"
                                        required
                                      />
                                    </td>
                                    
                                    <td className="px-3 py-3 whitespace-nowrap w-32">
                                      <div className="flex items-center gap-2">
                                        {subItem.imageUrl ? (
                                          <div className="relative flex-shrink-0">
                                            <img
                                              src={subItem.imageUrl}
                                              alt="Component preview"
                                              className="h-10 w-10 object-cover rounded-lg border border-gray-300 dark:border-gray-600"
                                            />
                                            <button
                                              type="button"
                                              onClick={() => {
                                                updateSubItem(itemIndex, subItem.id, "image", null);
                                                updateSubItem(itemIndex, subItem.id, "imageUrl", "");
                                              }}
                                              className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600"
                                            >
                                              <svg className="h-2.5 w-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                              </svg>
                                            </button>
                                          </div>
                                        ) : (
                                          <div className="h-10 w-10 flex items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg flex-shrink-0">
                                            <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                          </div>
                                        )}
                                        <label className="cursor-pointer flex-shrink-0">
                                          <input
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => {
                                              const file = e.target.files?.[0];
                                              if (file) {
                                                updateSubItem(itemIndex, subItem.id, "image", file);
                                              }
                                            }}
                                            className="hidden"
                                          />
                                          <span className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-500 whitespace-nowrap">
                                            {subItem.imageUrl ? 'Change' : 'Upload'}
                                          </span>
                                        </label>
                                      </div>
                                    </td>
                                    
                                    <td className="px-3 py-3 whitespace-nowrap w-20">
                                      <button
                                        type="button"
                                        onClick={() => removeSubItem(itemIndex, subItem.id)}
                                        className="rounded-lg p-1.5 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                                      >
                                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          
                          <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                              <h5 className="font-medium text-gray-900 dark:text-white mb-4 sm:mb-0">
                                Components Summary
                              </h5>
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                <div className="text-center">
                                  <div className="text-sm text-gray-600 dark:text-gray-400">Total Components</div>
                                  <div className="text-lg font-semibold text-gray-900 dark:text-white">
                                    {item.subItems.length}
                                  </div>
                                </div>
                                <div className="text-center">
                                  <div className="text-sm text-gray-600 dark:text-gray-400">Total Qty</div>
                                  <div className="text-lg font-semibold text-gray-900 dark:text-white">
                                    {item.subItems.reduce((sum, sub) => sum + sub.quantity, 0)}
                                  </div>
                                </div>
                                <div className="text-center">
                                  <div className="text-sm text-gray-600 dark:text-gray-400">Project Total</div>
                                  <div className="text-lg font-bold text-blue-600 dark:text-blue-500">
                                    {formatCurrency(calculateItemTotal(item).total)}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-12 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
                          <svg className="mx-auto h-16 w-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                          </svg>
                          <p className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
                            No components added yet
                          </p>
                          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                            Add components to break down this project into detailed parts
                          </p>
                          <button
                            type="button"
                            onClick={() => addSubItem(itemIndex)}
                            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-sm font-medium text-white hover:bg-blue-700"
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Add First Component
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 md:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white whitespace-nowrap">
                  Additional Notes (Excel Grid)
                </h2>
                <div className="flex flex-wrap gap-2 mt-2 sm:mt-0">
                  <div className="flex items-center gap-2"></div>
                  <div className="flex items-center gap-2"></div>
                </div>
              </div>

              <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Grid Info:</h3>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      Visible: {gridRows} rows × {gridCols} columns | 
                      Total: {totalRows} rows × {totalCols} columns
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={clearGrid}
                      className="inline-flex items-center gap-2 rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Clear Grid
                    </button>
                    <button
                      type="button"
                      onClick={exportToCSV}
                      className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Export CSV
                    </button>
                  </div>
                </div>
              </div>

              <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Available Formulas:</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
                  <code className="bg-white dark:bg-gray-800 p-2 rounded border border-gray-300 dark:border-gray-600">=A1+B2</code>
                  <code className="bg-white dark:bg-gray-800 p-2 rounded border border-gray-300 dark:border-gray-600">=A1-B2</code>
                  <code className="bg-white dark:bg-gray-800 p-2 rounded border border-gray-300 dark:border-gray-600">=A1*B2</code>
                  <code className="bg-white dark:bg-gray-800 p-2 rounded border border-gray-300 dark:border-gray-600">=A1/B2</code>
                  <code className="bg-white dark:bg-gray-800 p-2 rounded border border-gray-300 dark:border-gray-600">=A1*10%</code>
                  <code className="bg-white dark:bg-gray-800 p-2 rounded border border-gray-300 dark:border-gray-600">=(A1+B2)*C3</code>
                  <code className="bg-white dark:bg-gray-800 p-2 rounded border border-gray-300 dark:border-gray-600">=A1+B2*C3/D4</code>
                  <code className="bg-white dark:bg-gray-800 p-2 rounded border border-gray-300 dark:border-gray-600">=A1/B2-C3</code>
                  <code className="bg-white dark:bg-gray-800 p-2 rounded border border-gray-300 dark:border-gray-600">=A1+10-5%</code>
                  <code className="bg-white dark:bg-gray-800 p-2 rounded border border-gray-300 dark:border-gray-600">=A1*(1+B1%)</code>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                  • Use +, -, *, / for basic arithmetic • Use % for percentages • Use parentheses for complex formulas
                </p>
              </div>

              <div className="overflow-x-auto max-h-[500px] border border-gray-300 dark:border-gray-600 rounded-lg">
                <div className="inline-block min-w-full">
                  <div className="flex sticky top-0 z-10 bg-gray-100 dark:bg-gray-700 border-b border-gray-300 dark:border-gray-600">
                    <div className="w-16 flex-shrink-0 flex items-center justify-center border-r border-gray-300 dark:border-gray-600 p-2">
                      <span className="text-xs font-medium text-gray-500 dark:text-gray-400">#</span>
                    </div>
                    {Array.from({ length: gridCols }).map((_, colIndex) => (
                      <div key={`header-${colIndex}`} className="w-32 flex-shrink-0 flex items-center justify-center border-r border-gray-300 dark:border-gray-600 p-2 last:border-r-0">
                        <span className="text-xs font-medium text-gray-900 dark:text-white">
                          {getColumnLetter(colIndex)}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="overflow-y-auto max-h-[600px]">
                    {Array.from({ length: gridRows }).map((_, rowIndex) => {
                      const row = excelGrid[rowIndex] || [];
                      return (
                        <div key={`row-${rowIndex}`} className="flex border-b border-gray-300 dark:border-gray-600 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                          <div className="w-16 flex-shrink-0 flex items-center justify-center border-r border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 p-2 sticky left-0">
                            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                              {rowIndex + 1}
                            </span>
                          </div>

                          {Array.from({ length: gridCols }).map((_, colIndex) => {
                            const cell = row[colIndex] || {
                              id: `${rowIndex}_${colIndex}`,
                              value: '',
                              isFormula: false,
                              row: rowIndex,
                              col: colIndex,
                              computedValue: ''
                            };
                            
                            return (
                              <div key={cell.id} className="w-32 flex-shrink-0 border-r border-gray-300 dark:border-gray-600 last:border-r-0">
                                <input
                                  type="text"
                                  value={cell.value}
                                  onChange={(e) => updateCell(rowIndex, colIndex, e.target.value)}
                                  onPaste={(e) => handlePasteEnhanced(e, rowIndex, colIndex)}
                                  onFocus={() => setActiveCell({ row: rowIndex, col: colIndex })}
                                  className={`w-full h-full px-3 py-2 text-sm border-0 focus:ring-2 focus:ring-blue-500 focus:z-20 focus:outline-none ${
                                    cell.isFormula 
                                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' 
                                      : 'bg-white dark:bg-gray-800'
                                  } ${cell.computedValue === '#ERROR' || cell.computedValue === '#REF!' 
                                    ? 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20' 
                                    : ''}`}
                                  title={cell.isFormula ? `Formula: ${cell.formula}\nValue: ${cell.computedValue}` : cell.value}
                                />
                                {cell.isFormula && cell.computedValue !== '#ERROR' && cell.computedValue !== '#REF!' && (
                                  <div className="text-xs text-gray-500 dark:text-gray-400 px-2 pb-1 truncate">
                                    ={typeof cell.computedValue === 'number' 
                                      ? cell.computedValue.toLocaleString(undefined, { maximumFractionDigits: 2 })
                                      : cell.computedValue}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  <p>• Active Cell: {activeCell ? `${getColumnLetter(activeCell.col)}${activeCell.row + 1}` : 'None'}</p>
                  <p>• Use column letters (A-Z, AA, AB...) and row numbers (1-∞)</p>
                  <p>• Ctrl+Enter: Add Row | Ctrl+Shift+Enter: Add Column</p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 md:p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 whitespace-nowrap">
                Summary
              </h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Total Items</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{totals.totalItems}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Total Quantity</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{totals.totalQuantity.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Subtotal</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{formatCurrency(totals.subtotal)}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">All Items Discount</span>
                  <div className="text-right">
                    <div className="mb-2 flex items-center gap-2">
                      <input
                        type="number"
                        value={globalDiscount.value}
                        onChange={(e) => setGlobalDiscount({ ...globalDiscount, value: parseFloat(e.target.value) || 0 })}
                        className="w-24 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1 text-sm"
                        min={0}
                      />
                      <select
                        value={globalDiscount.type}
                        onChange={(e) => setGlobalDiscount({ ...globalDiscount, type: e.target.value as "percentage" | "fixed" })}
                        className="w-20 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1 text-sm"
                      >
                        <option value="percentage">%</option>
                        <option value="fixed">₹</option>
                      </select>
                      <button
                        type="button"
                        onClick={applyGlobalDiscount}
                        className="rounded bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700 hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-300 dark:hover:bg-blue-800"
                      >
                        Apply
                      </button>
                    </div>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{formatCurrency(totals.totalDiscount)}</span>
                  </div>
                </div>

                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Taxable Amount</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{formatCurrency(totals.totalTaxable)}</span>
                </div>
             

                <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white">Other Charges</h3>
                    <button
                      type="button"
                      onClick={addOtherCharge}
                      className="rounded border border-blue-600 px-3 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 dark:border-blue-500 dark:text-blue-500 dark:hover:bg-blue-900/20"
                    >
                      Add Charge
                    </button>
                  </div>
                  
                  <div className="space-y-2">
                    {otherCharges.map((charge) => (
                      <div key={charge.id} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={charge.name}
                          onChange={(e) => updateOtherCharge(charge.id, "name", e.target.value)}
                          className="flex-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-1 text-sm"
                          placeholder="Charge Name"
                        />
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            value={charge.amount}
                            onChange={(e) => updateOtherCharge(charge.id, "amount", parseFloat(e.target.value) || 0)}
                            className="w-24 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-1 text-sm"
                            min={0}
                            step={0.01}
                          />
                          <select
                            value={charge.type}
                            onChange={(e) => updateOtherCharge(charge.id, "type", e.target.value as "fixed" | "percentage")}
                            className="w-20 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1 text-sm"
                          >
                            <option value="fixed">₹</option>
                            <option value="percentage">%</option>
                          </select>
                        </div>
                        <select
                          value={charge.tax}
                          onChange={(e) => updateOtherCharge(charge.id, "tax", Number(e.target.value) || 0)}
                          className="w-16 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1 text-sm"
                        >
                          <option value={0}>0%</option>
                          <option value={5}>5%</option>
                          <option value={12}>12%</option>
                          <option value={18}>18%</option>
                          <option value={28}>28%</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => removeOtherCharge(charge.id)}
                          className="rounded p-1 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
                   <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Other Charges Applied Amount</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{formatCurrency(totals.otherChargesTotal)}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">CGST</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{formatCurrency(totals.totalCgst)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">SGST</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{formatCurrency(totals.totalSgst)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">IGST</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{formatCurrency(totals.totalIgst)}</span>
                </div>
                <div className="flex justify-between border-t border-gray-200 dark:border-gray-700 pt-3">
                  <span className="font-semibold text-gray-900 dark:text-white">Total Tax</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(totals.totalTax)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Round Off</span>
                  <span className={`text-sm font-medium ${totals.roundOff > 0 ? 'text-green-600' : totals.roundOff < 0 ? 'text-red-600' : 'text-gray-900'} dark:text-white`}>
                    {totals.roundOff > 0 ? '+' : ''}{formatCurrency(totals.roundOff)}
                  </span>
                </div>
                <div className="flex justify-between border-t border-gray-200 dark:border-gray-700 pt-3">
                  <span className="font-bold text-gray-900 dark:text-white">Grand Total</span>
                  <span className="text-xl font-bold text-blue-600 dark:text-blue-500">{formatCurrency(totals.grandTotal)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-center gap-4 pt-6">
            <button
              type="button"
              onClick={handleCancel}
              className="rounded-lg border border-gray-300 dark:border-gray-600 px-6 py-3 font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-green-600 px-8 py-3 font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  {isEditMode ? "Updating..." : "Creating..."}
                </>
              ) : (
                <>
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {isEditMode ? "Update Quotation" : "Save Quotation"}
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      <style jsx global>{`
        .react-select-container {
          width: 100%;
        }
        .react-select__control {
          border: 1px solid #d1d5db;
          background-color: white;
          min-height: 36px;
          height: 36px;
          border-radius: 0.375rem;
        }
        .dark .react-select__control {
          border-color: #4b5563;
          background-color: #374151;
        }
        .react-select__value-container {
          height: 36px;
          padding: 0 8px;
        }
        .react-select__input-container {
          margin: 0;
          padding: 0;
        }
        .react-select__indicators {
          height: 36px;
        }
        .react-select__menu {
          z-index: 50;
        }
        .react-select__menu-portal {
          z-index: 9999 !important;
        }
        .react-select__single-value {
          color: #111827;
        }
        .dark .react-select__single-value {
          color: #fff;
        }
        .react-select__placeholder {
          color: #6b7280;
        }
        .dark .react-select__placeholder {
          color: #9ca3af;
        }
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}

