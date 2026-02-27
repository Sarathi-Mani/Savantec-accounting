"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { addPdfPageNumbers } from "@/utils/pdfTheme";
import { companiesApi, customersApi, employeesApi, productsApi } from "@/services/api";

interface QuotationItem {
  id?: string;
  product_id?: string;
  description: string;
  hsn_code: string;
  quantity: number;
  unit: string;
  unit_price: number;
  discount_percent: number;
  gst_rate: number;
}

interface QuotationData {
  id: string;
  quotation_number: string;
  quotation_date: string;
  validity_days: number;
  customer_id: string;
  customer_name: string;
  notes: string;
  terms: string;
  subject: string;
  tax_regime: "cgst_sgst" | "igst";
  status: "open" | "closed" | "po_converted" | "lost";
  sales_person_id: string;
  sales_person_name: string;
  reference: string;
  reference_no: string;
  reference_date: string;
  payment_terms: string;
  place_of_supply: string;
  remarks: string;
  contact_person: string;
  created_at: string;
  updated_at: string;
  items: QuotationItem[];
  excel_notes_file_url?: string;
}

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

export default function ViewQuotationPage() {
  const { company, getToken } = useAuth();
  const router = useRouter();
  const params = useParams();
  const quotationId = params.id as string;
  
  const [loading, setLoading] = useState(true);
  const [quotation, setQuotation] = useState<QuotationData | null>(null);
  const [toasts, setToasts] = useState<Array<{ id: number; message: string; type: "success" | "error" | "info" | "warning" }>>([]);
  const [downloadingPDF, setDownloadingPDF] = useState(false);
  const [customerAddress, setCustomerAddress] = useState<string>("-");
  const [shippingAddress, setShippingAddress] = useState<string>("-");
  const [customerDisplayName, setCustomerDisplayName] = useState<string>("-");
  const [customerGstin, setCustomerGstin] = useState<string>("-");
  const [kindAttnName, setKindAttnName] = useState<string>("-");
  const [kindAttnMobile, setKindAttnMobile] = useState<string>("-");
  const [engineerName, setEngineerName] = useState<string>("-");
  const [engineerMobile, setEngineerMobile] = useState<string>("-");
  const [productModelById, setProductModelById] = useState<Record<string, string>>({});
  const [enquiryModelByProductId, setEnquiryModelByProductId] = useState<Record<string, string>>({});
  const [enquiryModelByDescription, setEnquiryModelByDescription] = useState<Record<string, string>>({});
  const [companyGstin, setCompanyGstin] = useState<string>("-");
  const [companyNameHeader, setCompanyNameHeader] = useState<string>("Savantec Automation Private Limited");
  const [companyAddressHeader, setCompanyAddressHeader] = useState<string>("-");
  const [companyPhoneHeader, setCompanyPhoneHeader] = useState<string>("-");
  const [companyEmailHeader, setCompanyEmailHeader] = useState<string>("-");

  const showToast = (message: string, type: "success" | "error" | "info" | "warning" = "success") => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id));
    }, 3000);
  };

  const removeToast = (id: number) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  // Safe date formatting function
  const formatDate = (dateString?: string | Date | null) => {
    try {
      if (!dateString) {
        return "-";
      }
      const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
      if (!(date instanceof Date)) {
        return "-";
      }
      if (isNaN(date.getTime())) {
        return "Invalid Date";
      }
      return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch (error) {
      console.error("Date formatting error:", error);
      return "Invalid Date";
    }
  };

  // Calculate valid until date
  const calculateValidUntil = () => {
    if (!quotation) return "Invalid Date";
    
    try {
      const quotationDate = new Date(quotation.quotation_date);
      if (isNaN(quotationDate.getTime())) {
        return "Invalid Date";
      }
      const validUntil = new Date(quotationDate.getTime() + quotation.validity_days * 24 * 60 * 60 * 1000);
      return formatDate(validUntil);
    } catch (error) {
      console.error("Valid until calculation error:", error);
      return "Invalid Date";
    }
  };

  const fetchQuotationData = async () => {
    if (!company?.id || !quotationId) return;
    
    try {
      setLoading(true);
      const token = getToken();
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/companies/${company.id}/quotations/${quotationId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        setQuotation(data);

        // Resolve latest company GSTIN from company master (avoid stale auth context)
        try {
          const companyData = await companiesApi.get(company.id);
          setCompanyGstin(companyData?.gstin || "-");
          setCompanyNameHeader(companyData?.name || "Savantec Automation Private Limited");
          setCompanyAddressHeader(
            [
              companyData?.address_line1,
              companyData?.address_line2,
              companyData?.city,
              companyData?.state,
              companyData?.country,
              companyData?.pincode,
            ]
              .filter(Boolean)
              .join(", ") || "-"
          );
          setCompanyPhoneHeader(companyData?.phone || "-");
          setCompanyEmailHeader(companyData?.email || "-");
        } catch (err) {
          console.error("Failed to resolve company GSTIN:", err);
          setCompanyGstin((company as any)?.gstin || "-");
          setCompanyNameHeader((company as any)?.name || "Savantec Automation Private Limited");
          setCompanyAddressHeader(
            [
              (company as any)?.address_line1,
              (company as any)?.address_line2,
              (company as any)?.city,
              (company as any)?.state,
              (company as any)?.country,
              (company as any)?.pincode,
            ]
              .filter(Boolean)
              .join(", ") || "-"
          );
          setCompanyPhoneHeader((company as any)?.phone || "-");
          setCompanyEmailHeader((company as any)?.email || "-");
        }

        // Resolve customer address from customer master
        try {
          if (data?.customer_id) {
            const customer = await customersApi.get(company.id, data.customer_id);
            const billing = [
              customer?.billing_address,
              customer?.billing_city,
              customer?.billing_state,
              customer?.billing_zip,
              customer?.billing_country,
            ].filter(Boolean).join(", ");
            const shipping = [
              customer?.shipping_address,
              customer?.shipping_city,
              customer?.shipping_state,
              customer?.shipping_zip,
              customer?.shipping_country,
            ].filter(Boolean).join(", ");
            setCustomerAddress(billing || shipping || "-");
            setShippingAddress(shipping || billing || "-");
            setCustomerDisplayName(customer?.name || data?.customer_name || "-");
            setCustomerGstin(customer?.tax_number || customer?.gstin || "-");

            // Resolve Kind Attention name + mobile from contact persons
            try {
              let attnName = data?.contact_person || "-";
              let attnMobile = "-";
              const cpResponse = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/companies/${company.id}/customers/${data.customer_id}/contact-persons`,
                {
                  headers: {
                    Authorization: `Bearer ${token}`,
                  },
                }
              );
              if (cpResponse.ok) {
                const cps = await cpResponse.json();
                if (Array.isArray(cps) && cps.length > 0) {
                  const contactRaw = String(data?.contact_person || "").trim();
                  const matched =
                    cps.find((c: any) => String(c?.id || "") === contactRaw) ||
                    cps.find((c: any) => String(c?.name || "").trim().toLowerCase() === contactRaw.toLowerCase());
                  const cp = matched || cps[0];
                  if (cp) {
                    attnName = cp?.name || attnName;
                    attnMobile = cp?.phone || cp?.mobile || "-";
                  }
                }
              }
              setKindAttnName(attnName || "-");
              setKindAttnMobile(attnMobile || "-");
            } catch (err) {
              console.error("Failed to resolve contact person:", err);
              setKindAttnName(data?.contact_person || "-");
              setKindAttnMobile("-");
            }
          } else {
            setCustomerAddress("-");
            setShippingAddress("-");
            setCustomerDisplayName(data?.customer_name || "-");
            setCustomerGstin("-");
            setKindAttnName(data?.contact_person || "-");
            setKindAttnMobile("-");
          }
        } catch (err) {
          console.error("Failed to resolve customer address:", err);
          setCustomerAddress("-");
          setShippingAddress("-");
          setCustomerDisplayName(data?.customer_name || "-");
          setCustomerGstin("-");
          setKindAttnName(data?.contact_person || "-");
          setKindAttnMobile("-");
        }

        // Resolve engineer name + mobile from employees
        try {
          let resolvedName = data?.sales_person_name || "-";
          let resolvedMobile = "-";
          if (data?.sales_person_id) {
            const employees = await employeesApi.list(company.id);
            const emp = employees.find((e: any) => e.id === data.sales_person_id);
            if (emp) {
              const fullName = emp.full_name || [emp.first_name, emp.last_name].filter(Boolean).join(" ").trim();
              resolvedName = fullName || resolvedName;
              resolvedMobile =
                emp.phone ||
                emp.mobile ||
                emp.personal_phone ||
                emp.official_phone ||
                emp.alternate_phone ||
                "-";
            }
          }
          setEngineerName(resolvedName || "-");
          setEngineerMobile(resolvedMobile || "-");
        } catch (err) {
          console.error("Failed to resolve engineer:", err);
          setEngineerName(data?.sales_person_name || "-");
          setEngineerMobile("-");
        }

        // Resolve model names from products by product_id
        try {
          const productIds = Array.from(new Set((data?.items || []).map((it: any) => it?.product_id).filter(Boolean)));
          const modelMap: Record<string, string> = {};
          await Promise.all(
            productIds.map(async (pid: string) => {
              try {
                const product = await productsApi.get(company.id, pid);
                modelMap[pid] = product?.sku || product?.name || "";
              } catch {
                // ignore per-product failure
              }
            })
          );
          setProductModelById(modelMap);
        } catch (err) {
          console.error("Failed to resolve product model names:", err);
          setProductModelById({});
        }

        // Fallback model names from enquiry items (if quotation references enquiry)
        try {
          const byPid: Record<string, string> = {};
          const byDesc: Record<string, string> = {};
          if (String(data?.reference || "").trim().toLowerCase() === "enquiry" && data?.reference_no) {
            const enqResp = await fetch(
              `${process.env.NEXT_PUBLIC_API_URL}/companies/${company.id}/enquiries?search=${encodeURIComponent(data.reference_no)}&limit=25`,
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              }
            );
            if (enqResp.ok) {
              const enqList = await enqResp.json();
              const match =
                (Array.isArray(enqList) ? enqList : []).find((e: any) => e?.enquiry_number === data.reference_no) ||
                (Array.isArray(enqList) ? enqList[0] : null);
              const enqItems = Array.isArray(match?.items) ? match.items : [];
              enqItems.forEach((ei: any) => {
                const modelName = ei?.product_sku || ei?.product_name || ei?.description || "";
                if (!modelName) return;
                if (ei?.product_id) byPid[ei.product_id] = modelName;
                const dKey = String(ei?.description || "").trim().toLowerCase();
                if (dKey) byDesc[dKey] = modelName;
              });
            }
          }
          setEnquiryModelByProductId(byPid);
          setEnquiryModelByDescription(byDesc);
        } catch (err) {
          console.error("Failed to resolve enquiry fallback model names:", err);
          setEnquiryModelByProductId({});
          setEnquiryModelByDescription({});
        }
      } else {
        showToast("Failed to load quotation", "error");
        router.push("/quotations");
      }
    } catch (error) {
      console.error("Failed to fetch quotation:", error);
      showToast("Failed to load quotation", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotationData();
  }, [company?.id, quotationId]);

  const calculateItemTotal = (item: QuotationItem) => {
    const subtotal = item.quantity * item.unit_price;
    const discountAmount = subtotal * (item.discount_percent / 100);
    const taxableAmount = subtotal - discountAmount;
    const taxAmount = taxableAmount * (item.gst_rate / 100);
    const total = taxableAmount + taxAmount;
    
    return {
      subtotal,
      discountAmount,
      taxableAmount,
      taxAmount,
      total
    };
  };

  const calculateTotals = () => {
    if (!quotation) return null;

    let subtotal = 0;
    let totalDiscount = 0;
    let totalTaxable = 0;
    let totalCgst = 0;
    let totalSgst = 0;
    let totalIgst = 0;
    let totalItems = 0;
    let totalQuantity = 0;

    quotation.items.forEach(item => {
      if (item.quantity > 0 && item.unit_price > 0) {
        totalItems++;
      }
      totalQuantity += item.quantity;

      const itemCalc = calculateItemTotal(item);
      subtotal += itemCalc.subtotal;
      totalDiscount += itemCalc.discountAmount;
      totalTaxable += itemCalc.taxableAmount;

      if (quotation.tax_regime === "cgst_sgst") {
        totalCgst += itemCalc.taxAmount / 2;
        totalSgst += itemCalc.taxAmount / 2;
      } else {
        totalIgst += itemCalc.taxAmount;
      }
    });

    const totalTax = totalCgst + totalSgst + totalIgst;
    const totalBeforeRoundOff = totalTaxable + totalTax;
    const roundOff = Math.round(totalBeforeRoundOff) - totalBeforeRoundOff;
    const grandTotal = totalBeforeRoundOff + roundOff;

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
      grandTotal
    };
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { color: string; bg: string }> = {
      open: { color: 'text-green-800', bg: 'bg-green-100' },
      closed: { color: 'text-gray-800', bg: 'bg-gray-100' },
      po_converted: { color: 'text-blue-800', bg: 'bg-blue-100' },
      lost: { color: 'text-red-800', bg: 'bg-red-100' }
    };

    const config = statusConfig[status] || { color: 'text-gray-800', bg: 'bg-gray-100' };
    
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${config.bg} ${config.color}`}>
        {status.replace('_', ' ').toUpperCase()}
      </span>
    );
  };

  const loadImageAsDataUrl = (src: string): Promise<string> =>
    new Promise((resolve, reject) => {
      fetch(src)
        .then((res) => {
          if (!res.ok) throw new Error("Failed to fetch image");
          return res.blob();
        })
        .then((blob) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(String(reader.result || ""));
          reader.onerror = () => reject(new Error("Failed to read image"));
          reader.readAsDataURL(blob);
        })
        .catch(reject);
    });

  const generatePDF = async () => {
    if (!quotation) return;
    
    setDownloadingPDF(true);
    try {
      const doc = new jsPDF("p", "mm", "a4");
      const left = 14;
      const width = 182;
      const right = left + width;
      const splitX = left + 92;
      const money = (v: number | undefined | null) =>
        new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(v || 0));

      const customerNameText = customerDisplayName || quotation.customer_name || "-";
      const customerDetailText = [customerAddress, `GSTIN: ${customerGstin || "-"}`]
        .filter(Boolean)
        .join("\n");
      const customerDetailLines = doc.splitTextToSize(customerDetailText, 88);
      const totals = calculateTotals();

      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.25);

      // Outer frame
      doc.rect(left, 14, width, 262);

      // Top header row
      doc.rect(left, 14, width, 20);
      let companyTextX = left + 2;
      try {
        const logoDataUrl = await loadImageAsDataUrl("/images/logo/savantec_logo.png");
        doc.addImage(logoDataUrl, "PNG", left + 1.2, 16.2, 30, 8.4);
        companyTextX = left + 33;
      } catch {
        companyTextX = left + 2;
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text(companyNameHeader || "Savantec Automation Private Limited", companyTextX, 21);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.6);
      const cAddr = doc.splitTextToSize(companyAddressHeader || "-", right - companyTextX - 2);
      doc.text(cAddr.slice(0, 1), companyTextX, 25);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.3);
      doc.text(
        `Mob : ${companyPhoneHeader || "-"}    Email: ${companyEmailHeader || "-"}    GST Number: ${companyGstin || "-"}`,
        companyTextX,
        29
      );

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("QUOTATION", left + width / 2, 38.2, { align: "center" });
      doc.line(left + 74, 38.8, right - 74, 38.8);

      // Customer + right details
      const topY = 40;
      const topH = 60;
      doc.rect(left, topY, splitX - left, topH);
      doc.rect(splitX, topY, right - splitX, topH);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.text("Customer Name & Address", left + 1.2, topY + 4.2);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.3);
      doc.text(customerNameText, left + 1.2, topY + 9);
      doc.setFont("helvetica", "normal");
      doc.text(customerDetailLines.slice(0, 3), left + 1.2, topY + 13);

      // Right grid like reference
      const rgMid = splitX + (right - splitX) / 2;
      const leftCellW = rgMid - splitX - 2;
      const rightCellW = right - rgMid - 2;
      const fitCellText = (value: unknown, maxWidth: number, fontSize = 7.4): string => {
        const raw = String(value ?? "-").replace(/\s+/g, " ").trim() || "-";
        doc.setFontSize(fontSize);
        if (doc.getTextWidth(raw) <= maxWidth) return raw;
        let s = raw;
        while (s.length > 0 && doc.getTextWidth(`${s}...`) > maxWidth) {
          s = s.slice(0, -1);
        }
        return `${s || "-"}...`;
      };
      const r1 = topY + 8;
      const r2 = topY + 16;
      const r3 = topY + 24;
      const r4 = topY + 42;
      const r5 = topY + 51;
      doc.line(splitX, r1, right, r1);
      doc.line(splitX, r2, right, r2);
      doc.line(splitX, r3, right, r3);
      doc.line(splitX, r4, right, r4);
      doc.line(splitX, r5, right, r5);
      doc.line(rgMid, topY, rgMid, r3);

      const drawKeyValue = (x: number, y: number, label: string, value: string, width: number, labelW: number) => {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.2);
        doc.text(label, x, y);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.2);
        doc.text(fitCellText(value, width - labelW, 7.2), x + labelW, y);
      };

      drawKeyValue(splitX + 1, topY + 5, "Quotation No:", `SAPL/${quotation.quotation_number || "-"}`, leftCellW, 18);
      drawKeyValue(rgMid + 1, topY + 5, "Date:", formatDate(quotation.quotation_date), rightCellW, 10);
      drawKeyValue(splitX + 1, r1 + 5, "Reference No.", quotation.reference_no || "-", leftCellW, 20);
      drawKeyValue(rgMid + 1, r1 + 5, "Reference Date", quotation.reference_date ? formatDate(quotation.reference_date) : "-", rightCellW, 20);
      drawKeyValue(splitX + 1, r2 + 4.8, "Reference", quotation.reference || "-", leftCellW, 17);

      const paymentTermsText = String(quotation.terms || quotation.payment_terms || "-");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.2);
      doc.text("Payment Terms", rgMid + 1, r2 + 4.8);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.2);
      const paymentLines = doc.splitTextToSize(paymentTermsText, rightCellW - 1);
      doc.text(paymentLines.slice(0, 4), rgMid + 1, r3 + 3.8);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.2);
      doc.text(`Kind Attn: ${kindAttnName || "-"}${kindAttnMobile && kindAttnMobile !== "-" ? ` / ${kindAttnMobile}` : ""}`, splitX + 1, r4 + 5.6);
      doc.text(`Engineer: ${engineerName || "-"}${engineerMobile && engineerMobile !== "-" ? ` / ${engineerMobile}` : ""}`, splitX + 1, r5 + 5.6);

      // Shipping row
      const shipY = topY + topH;
      const shipH = 13;
      doc.rect(left, shipY, splitX - left, shipH);
      doc.rect(splitX, shipY, right - splitX, shipH);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.4);
      doc.text("Shipping Address", left + 1.2, shipY + 4.2);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.2);
      const shippingName = customerDisplayName || quotation.customer_name || "-";
      doc.text(shippingName, left + 1.2, shipY + 8.6);
      doc.setFont("helvetica", "normal");
      doc.text(doc.splitTextToSize(shippingAddress || "-", 88).slice(0, 2), left + 1.2, shipY + 12.2);

      // Items table
      const tableStartY = shipY + shipH;
      const rows = quotation.items.map((item, index) => {
        const itemTotal = calculateItemTotal(item);
        const descKey = String(item.description || "").trim().toLowerCase();
        const modelName =
          (item.product_id && productModelById[item.product_id]) ||
          (item.product_id && enquiryModelByProductId[item.product_id]) ||
          enquiryModelByDescription[descKey] ||
          item.description ||
          "-";
        return [
          String(index + 1),
          item.description || "-",
          modelName,
          item.hsn_code || "-",
          Number(item.quantity || 0).toFixed(2),
          Number(item.unit_price || 0).toFixed(2),
          item.unit || "-",
          `${Number(item.gst_rate || 0).toFixed(2)}%`,
          `${Number(item.discount_percent || 0).toFixed(0)}%`,
          Number(itemTotal.total || 0).toFixed(2),
        ];
      });

      autoTable(doc, {
        startY: tableStartY,
        head: [["S No", "Description", "Model No", "HSN", "Qty", "Rate", "UOM", "Tax Rate", "Disc.", "Amount"]],
        body: rows.length ? rows : [["1", "-", "-", "-", "-", "-", "-", "-", "-", "-"]],
        theme: "grid",
        margin: { left, right: 14 },
        styles: { fontSize: 7.1, cellPadding: 1.2, lineWidth: 0.2, lineColor: [0, 0, 0], valign: "top" },
        headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: "bold" },
        bodyStyles: { minCellHeight: 11 },
        columnStyles: {
          0: { cellWidth: 9, halign: "center" },
          1: { cellWidth: 50 },
          2: { cellWidth: 18 },
          3: { cellWidth: 12 },
          4: { cellWidth: 9, halign: "right" },
          5: { cellWidth: 17, halign: "right" },
          6: { cellWidth: 15, halign: "center" },
          7: { cellWidth: 16, halign: "right" },
          8: { cellWidth: 9, halign: "right" },
          9: { cellWidth: 17, halign: "right" },
        },
      });

      // Place bottom section immediately after items to avoid large blank gap
      const itemEndY = (doc as any).lastAutoTable?.finalY || tableStartY + 20;

      // Bottom section aligned to reference
      const bottomY = itemEndY;
      const rightW = 46;
      const leftW = width - rightW;
      const remarksH = 14;
      const termsH = 57;

      // Row 1: Remarks + totals summary
      doc.rect(left, bottomY, leftW, remarksH);
      doc.rect(left + leftW, bottomY, rightW, remarksH);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.8);
      doc.text("Remarks:", left + 1.2, bottomY + 4.2);
      const remarksText = doc.splitTextToSize(quotation.remarks || "-", leftW - 3);
      doc.text(remarksText.slice(0, 2), left + 1.2, bottomY + 8.2);

      const sumX = left + leftW;
      const sumRowH = remarksH / 3;
      doc.line(sumX, bottomY + sumRowH, right, bottomY + sumRowH);
      doc.line(sumX, bottomY + sumRowH * 2, right, bottomY + sumRowH * 2);
      doc.line(sumX + 22, bottomY, sumX + 22, bottomY + remarksH);
      const putSum = (label: string, value: string, y: number, bold = false) => {
        doc.setFont("helvetica", bold ? "bold" : "normal");
        doc.setFontSize(8.2);
        doc.text(label, sumX + 20.8, y, { align: "right" });
        doc.text(value, right - 1.5, y, { align: "right" });
      };
      putSum("Subtotal", money(totals?.subtotal || 0), bottomY + 3.8, true);
      putSum("Tax Amount", money(totals?.totalTax || 0), bottomY + 3.8 + sumRowH, true);
      putSum("Grand Total", money(totals?.grandTotal || 0), bottomY + 3.8 + sumRowH * 2, true);

      // Row 2: Terms + signature
      const termsY = bottomY + remarksH;
      doc.rect(left, termsY, leftW, termsH);
      doc.rect(left + leftW, termsY, rightW, termsH);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.text("Terms & Conditions", left + 1.2, termsY + 4.6);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.2);
      const termsText = doc.splitTextToSize(quotation.payment_terms || quotation.terms || "-", leftW - 3);
      doc.text(termsText.slice(0, 7), left + 1.2, termsY + 8.5);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text("E & OE", left + 1.2, termsY + termsH - 4);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.2);
      doc.text("for Savantec Automation Private", right - 1.5, termsY + 6, { align: "right" });
      doc.text("Limited", right - 1.5, termsY + 10, { align: "right" });
      doc.setFont("helvetica", "normal");
      doc.line(left + leftW + 6, termsY + termsH - 9, right - 6, termsY + termsH - 9);
      doc.setFont("helvetica", "bold");
      doc.text("Authorised Signatory", right - 1.5, termsY + termsH - 1.6, { align: "right" });

      addPdfPageNumbers(doc, "p");
      doc.save(`Quotation_${quotation.quotation_number}.pdf`);
      showToast("PDF downloaded successfully", "success");
    } catch (error) {
      console.error("PDF generation error:", error);
      showToast("Failed to generate PDF", "error");
    } finally {
      setDownloadingPDF(false);
    }
  };

  const handleDelete = async () => {
    if (!quotation || !company?.id || !window.confirm("Are you sure you want to delete this quotation? This action cannot be undone.")) {
      return;
    }
    
    try {
      const token = getToken();
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/companies/${company.id}/quotations/${quotation.id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      
      if (response.ok) {
        showToast("Quotation deleted successfully", "success");
        router.push("/quotations");
      } else {
        showToast("Failed to delete quotation", "error");
      }
    } catch (error) {
      console.error("Delete error:", error);
      showToast("Failed to delete quotation", "error");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading quotation...</p>
        </div>
      </div>
    );
  }

  if (!quotation) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400">Quotation not found</p>
          <button
            onClick={() => router.push("/quotations")}
            className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            Back to Quotations
          </button>
        </div>
      </div>
    );
  }

  const totals = calculateTotals();
  const excelDownloadUrl = quotation?.excel_notes_file_url
    ? `${(process.env.NEXT_PUBLIC_API_URL || "").replace(/\/api$/, "")}/uploads/${String(
        quotation.excel_notes_file_url
      ).replace(/^\/+/, "")}`
    : "";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Toast Container */}
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

        {/* Header */}
        <div className="mb-6 md:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                Quotation: {quotation.quotation_number}
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Created on {formatDate(quotation.created_at)}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => router.push("/quotations")}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to List
              </button>
              <button
                type="button"
                onClick={() => router.push(`/quotations/${quotation.id}/edit`)}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit Quotation
              </button>
              <button
                type="button"
                onClick={generatePDF}
                disabled={downloadingPDF}
                className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
              >
                {downloadingPDF ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Generating...
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Download PDF
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete
              </button>
            </div>
          </div>
        </div>

        {/* Status Badge */}
        <div className="mb-6">
          {getStatusBadge(quotation.status)}
        </div>

        {/* Main Content */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column - Quotation Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 md:p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Quotation Information
              </h2>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Quotation Number</p>
                  <p className="font-medium text-gray-900 dark:text-white">{quotation.quotation_number}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Date</p>
                  <p className="font-medium text-gray-900 dark:text-white">{formatDate(quotation.quotation_date)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Validity</p>
                  <p className="font-medium text-gray-900 dark:text-white">{quotation.validity_days} days</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Tax Regime</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {quotation.tax_regime === "cgst_sgst" ? "CGST + SGST" : "IGST"}
                  </p>
                </div>
              </div>
            </div>

            {/* Customer Information */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 md:p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Customer Information
              </h2>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Customer</p>
                  <p className="font-medium text-gray-900 dark:text-white">{quotation.customer_name}</p>
                </div>
                {quotation.contact_person && (
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Contact Person</p>
                    <p className="font-medium text-gray-900 dark:text-white">{quotation.contact_person}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Place of Supply</p>
                  <p className="font-medium text-gray-900 dark:text-white">{quotation.place_of_supply || "Not specified"}</p>
                </div>
              </div>
            </div>

            {/* Items Table */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 md:p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Items
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 dark:text-white uppercase tracking-wider">#</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 dark:text-white uppercase tracking-wider">Description</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 dark:text-white uppercase tracking-wider">HSN</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 dark:text-white uppercase tracking-wider">Qty</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 dark:text-white uppercase tracking-wider">Unit</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 dark:text-white uppercase tracking-wider">Rate</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 dark:text-white uppercase tracking-wider">Discount %</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 dark:text-white uppercase tracking-wider">GST %</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-900 dark:text-white uppercase tracking-wider">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {quotation.items.map((item, index) => {
                      const itemTotal = calculateItemTotal(item);
                      return (
                        <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                          <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{index + 1}</td>
                          <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{item.description}</td>
                          <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{item.hsn_code}</td>
                          <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{item.quantity}</td>
                          <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{item.unit}</td>
                          <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{formatCurrency(item.unit_price)}</td>
                          <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{item.discount_percent}%</td>
                          <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{item.gst_rate}%</td>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{formatCurrency(itemTotal.total)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Notes and Terms */}
            {quotation.notes && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 md:p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Notes</h2>
                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">{quotation.notes}</p>
              </div>
            )}

            {quotation.remarks && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 md:p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Remarks</h2>
                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">{quotation.remarks}</p>
              </div>
            )}

            {quotation.payment_terms && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 md:p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Terms & Conditions</h2>
                <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">
                  {quotation.payment_terms}
                </div>
              </div>
            )}

            {quotation.terms && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 md:p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Additional Terms</h2>
                <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">
                  {quotation.terms}
                </div>
              </div>
            )}

            {/* Excel Notes */}
            {quotation.excel_notes_file_url && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 md:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Excel Notes</h2>
                  <a
                    href={excelDownloadUrl}
                    download
                    className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Download Excel
                  </a>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Excel preview is disabled here. Click download, then open the file in Excel.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Summary and Actions */}
          <div className="space-y-6">
            {/* Summary */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 md:p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Summary</h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Total Items</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{totals?.totalItems || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Total Quantity</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{totals?.totalQuantity.toFixed(2) || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Subtotal</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{formatCurrency(totals?.subtotal || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Discount</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{formatCurrency(totals?.totalDiscount || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Taxable Amount</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{formatCurrency(totals?.totalTaxable || 0)}</span>
                </div>
                
                {quotation.tax_regime === "cgst_sgst" ? (
                  <>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">CGST</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{formatCurrency(totals?.totalCgst || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">SGST</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{formatCurrency(totals?.totalSgst || 0)}</span>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">IGST</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{formatCurrency(totals?.totalIgst || 0)}</span>
                  </div>
                )}
                
                <div className="flex justify-between border-t border-gray-200 dark:border-gray-700 pt-3">
                  <span className="font-semibold text-gray-900 dark:text-white">Total Tax</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(totals?.totalTax || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Round Off</span>
                  <span className={`text-sm font-medium ${(totals?.roundOff || 0) > 0 ? 'text-green-600' : (totals?.roundOff || 0) < 0 ? 'text-red-600' : 'text-gray-900'} dark:text-white`}>
                    {(totals?.roundOff || 0) > 0 ? '+' : ''}{formatCurrency(totals?.roundOff || 0)}
                  </span>
                </div>
                <div className="flex justify-between border-t border-gray-200 dark:border-gray-700 pt-3">
                  <span className="font-bold text-gray-900 dark:text-white">Grand Total</span>
                  <span className="text-xl font-bold text-blue-600 dark:text-blue-500">{formatCurrency(totals?.grandTotal || 0)}</span>
                </div>
              </div>
            </div>

            {/* Sales & Reference */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 md:p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Sales & Reference</h2>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Sales Engineer</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {engineerName || "Not assigned"}{engineerMobile && engineerMobile !== "-" ? ` (${engineerMobile})` : ""}
                  </p>
                </div>
                {quotation.reference && (
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Reference</p>
                    <p className="font-medium text-gray-900 dark:text-white">{quotation.reference}</p>
                  </div>
                )}
                {quotation.reference_no && (
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Reference No</p>
                    <p className="font-medium text-gray-900 dark:text-white">{quotation.reference_no}</p>
                  </div>
                )}
                {quotation.reference_date && (
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Reference Date</p>
                    <p className="font-medium text-gray-900 dark:text-white">{formatDate(quotation.reference_date)}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Timeline */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 md:p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Timeline</h2>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Created</p>
                  <p className="font-medium text-gray-900 dark:text-white">{formatDate(quotation.created_at)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Last Updated</p>
                  <p className="font-medium text-gray-900 dark:text-white">{formatDate(quotation.updated_at)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Valid Until</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {calculateValidUntil()}
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 md:p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h2>
              <div className="space-y-2">
                <button
                  onClick={() => router.push(`/quotations/${quotation.id}/edit`)}
                  className="w-full flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit Quotation
                </button>
                <button
                  onClick={generatePDF}
                  disabled={downloadingPDF}
                  className="w-full flex items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                >
                  {downloadingPDF ? (
                    <>
                      <svg className="h-4 w-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Generating PDF...
                    </>
                  ) : (
                    <>
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Download as PDF
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    // Copy quotation number to clipboard
                    navigator.clipboard.writeText(quotation.quotation_number);
                    showToast("Quotation number copied to clipboard", "success");
                  }}
                  className="w-full flex items-center justify-center gap-2 rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copy Quotation No
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
