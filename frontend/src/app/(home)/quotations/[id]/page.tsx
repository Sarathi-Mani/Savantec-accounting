"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import jsPDF from "jspdf";
import "jspdf-autotable";
import { addPdfPageNumbers } from "@/utils/pdfTheme";

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

  const generatePDF = async () => {
    if (!quotation) return;
    
    setDownloadingPDF(true);
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();

      // Professional header band (same family as sales-order PDF)
      doc.setFillColor(22, 78, 99);
      doc.rect(0, 0, pageWidth, 24, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(12);
      doc.text(company?.name || "Company", 14, 10);
      doc.setFontSize(11);
      doc.text("QUOTATION", 14, 18);
      doc.setFontSize(9);
      doc.text(`No: ${quotation.quotation_number}`, pageWidth - 14, 10, { align: "right" });
      doc.text(`Date: ${formatDate(quotation.quotation_date)}`, pageWidth - 14, 18, { align: "right" });
      doc.setTextColor(0, 0, 0);
      
      // Company Info
      doc.setFontSize(10);
      doc.text("From:", 20, 34);
      doc.setFont("helvetica", 'bold');
      doc.text(company?.name || "Your Company" || "", 20, 39);
      doc.setFont("helvetica", 'normal');
      const companyAddr = (company as { address?: string })?.address ?? [company?.address_line1, company?.address_line2, company?.city, company?.state, company?.pincode].filter(Boolean).join(", ");
      if (companyAddr) {
        doc.text(companyAddr || "", 20, 44);
      }
      
      // Customer Info
      doc.text("To:", 20, 58);
      doc.setFont("helvetica", 'bold');
      doc.text(quotation.customer_name || "", 20, 63);
      doc.setFont("helvetica", 'normal');
      if (quotation.contact_person) {
        doc.text(`Attn: ${quotation.contact_person || ""}`, 20, 68);
      }
      
      // Table
      const tableColumn = ["Item", "Description", "HSN", "Qty", "Unit", "Rate", "Discount %", "GST %", "Amount"];
      const tableRows: any[] = [];
      
      quotation.items.forEach((item, index) => {
        const itemTotal = calculateItemTotal(item);
        const row = [
          index + 1,
          item.description,
          item.hsn_code,
          item.quantity,
          item.unit,
          formatCurrency(item.unit_price),
          `${item.discount_percent}%`,
          `${item.gst_rate}%`,
          formatCurrency(itemTotal.total)
        ];
        tableRows.push(row);
      });
      
      (doc as any).autoTable({
        startY: 75,
        head: [tableColumn],
        body: tableRows,
        theme: 'grid',
        headStyles: { fillColor: [22, 78, 99], textColor: 255 },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        styles: { fontSize: 8, lineColor: [220, 220, 220], lineWidth: 0.1 },
        columnStyles: {
          0: { cellWidth: 10 },
          1: { cellWidth: 40 },
          2: { cellWidth: 20 },
          3: { cellWidth: 15 },
          4: { cellWidth: 15 },
          5: { cellWidth: 20 },
          6: { cellWidth: 20 },
          7: { cellWidth: 15 },
          8: { cellWidth: 25 }
        }
      });
      
      // Totals
      const totals = calculateTotals();
      if (totals) {
        const finalY = (doc as any).lastAutoTable.finalY + 10;
        
        doc.text("Subtotal:", pageWidth - 100, finalY);
        doc.text(formatCurrency(totals.subtotal), pageWidth - 30, finalY, { align: 'right' });
        
        doc.text("Discount:", pageWidth - 100, finalY + 5);
        doc.text(formatCurrency(totals.totalDiscount), pageWidth - 30, finalY + 5, { align: 'right' });
        
        doc.text("Taxable Amount:", pageWidth - 100, finalY + 10);
        doc.text(formatCurrency(totals.totalTaxable), pageWidth - 30, finalY + 10, { align: 'right' });
        
        if (quotation.tax_regime === "cgst_sgst") {
          doc.text("CGST:", pageWidth - 100, finalY + 15);
          doc.text(formatCurrency(totals.totalCgst), pageWidth - 30, finalY + 15, { align: 'right' });
          
          doc.text("SGST:", pageWidth - 100, finalY + 20);
          doc.text(formatCurrency(totals.totalSgst), pageWidth - 30, finalY + 20, { align: 'right' });
        } else {
          doc.text("IGST:", pageWidth - 100, finalY + 15);
          doc.text(formatCurrency(totals.totalIgst), pageWidth - 30, finalY + 15, { align: 'right' });
        }
        
        doc.text("Round Off:", pageWidth - 100, finalY + 25);
        doc.text(formatCurrency(totals.roundOff ?? 0), pageWidth - 30, finalY + 25, { align: 'right' });
        
        doc.setFont("helvetica", 'bold');
        doc.text("Grand Total:", pageWidth - 100, finalY + 30);
        doc.text(formatCurrency(totals.grandTotal ?? 0), pageWidth - 30, finalY + 30, { align: 'right' });
        doc.setFont("helvetica", 'normal');
      }
      
      // Terms
      if (quotation.notes) {
        doc.text("Notes:", 20, (doc as any).lastAutoTable.finalY + 40);
        doc.text(quotation.notes, 20, (doc as any).lastAutoTable.finalY + 45, { maxWidth: pageWidth - 40 });
      }
      
      if (quotation.payment_terms) {
        const termsY = (doc as any).lastAutoTable.finalY + (quotation.notes ? 55 : 45);
        doc.text("Terms & Conditions:", 20, termsY);
        const splitTerms = doc.splitTextToSize(quotation.payment_terms, pageWidth - 40);
        doc.text(splitTerms, 20, termsY + 5);
      }
      
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
                  <p className="font-medium text-gray-900 dark:text-white">{quotation.sales_person_name || "Not assigned"}</p>
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
