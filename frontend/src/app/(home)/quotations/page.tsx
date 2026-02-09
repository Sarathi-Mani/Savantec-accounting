"use client";

import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import dayjs from "dayjs";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { saveAs } from "file-saver";

interface Quotation {
  id: string;
  quotation_number: string;
  quotation_date: string;
  validity_date: string;
  customer_id: string;
  customer_name: string;
  contact_person: string;
  sales_person_id: string;
  sales_person_name: string;
  status: string;
  subject: string;
  subtotal: number;
  total_tax: number;
  total_amount: number;
  reference: string;
  reference_no: string;
  converted_invoice_id: string | null;
}

interface QuotationListResponse {
  items: Quotation[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export default function QuotationsPage() {
  const { company } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<QuotationListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [converting, setConverting] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Export loading states
  const [copyLoading, setCopyLoading] = useState(false);
  const [excelLoading, setExcelLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [csvLoading, setCsvLoading] = useState(false);

  const [cachedExportData, setCachedExportData] = useState<Quotation[] | null>(null);

  const getToken = () => typeof window !== "undefined" ? localStorage.getItem("access_token") : null;

  useEffect(() => {
    fetchQuotations();
    setCachedExportData(null);
  }, [company?.id, page, statusFilter]);

  const fetchQuotations = async () => {
    const token = getToken();
    if (!company?.id || !token) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("page", page.toString());
      params.append("page_size", "10");
      if (statusFilter) params.append("status", statusFilter);

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/companies/${company.id}/quotations?${params}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (response.ok) {
        setData(await response.json());
      }
    } catch (error) {
      console.error("Failed to fetch quotations:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllQuotationsForExport = useCallback(async (): Promise<Quotation[]> => {
    const token = getToken();
    if (!company?.id || !token) return [];

    try {
      const params = new URLSearchParams();
      params.append("page", "1");
      params.append("page_size", "1000");
      if (statusFilter) params.append("status", statusFilter);

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/companies/${company.id}/quotations?${params}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) throw new Error("Failed to fetch quotations for export");

      const result = await response.json();
      const list = result?.items || [];
      setCachedExportData(list);
      return list;
    } catch (error) {
      console.error("Export fetch failed:", error);
      return [];
    }
  }, [company?.id, statusFilter]);

  const getExportData = async (): Promise<Quotation[]> => {
    if (cachedExportData) return cachedExportData;
    return await fetchAllQuotationsForExport();
  };


  
  const copyToClipboard = async () => {
    if (copyLoading) return;
    setCopyLoading(true);
    try {
      const quotations = await getExportData();
      const headers = [
        "Quotation Date",
        "Quotation Status",
        "Expire Date",
        "Quotation Code",
        "Reference No.",
        "Customer Name",
        "Total",
        "Salesman",
      ];

      const rows = quotations.map((q) => [
        dayjs(q.quotation_date).format("DD MMM YYYY"),
        q.status,
        q.validity_date ? dayjs(q.validity_date).format("DD MMM YYYY") : "-",
        q.quotation_number,
        q.reference_no || "-",
        q.customer_name || "Walk-in Customer",
        formatCurrency(q.total_amount),
        q.sales_person_name || "-",
      ]);

      const text = [headers.join("\t"), ...rows.map((r) => r.join("\t"))].join("\n");
      await navigator.clipboard.writeText(text);
      alert("Quotation data copied to clipboard");
    } catch (error) {
      console.error("Copy failed:", error);
      alert("Failed to copy data. Please try again.");
    } finally {
      setCopyLoading(false);
    }
  };

  const exportExcel = async () => {
    if (excelLoading) return;
    setExcelLoading(true);
    try {
      const quotations = await getExportData();
      const exportData = quotations.map((q) => ({
        "Quotation Date": dayjs(q.quotation_date).format("DD MMM YYYY"),
        "Quotation Status": q.status,
        "Expire Date": q.validity_date ? dayjs(q.validity_date).format("DD MMM YYYY") : "-",
        "Quotation Code": q.quotation_number,
        "Reference No.": q.reference_no || "-",
        "Customer Name": q.customer_name || "Walk-in Customer",
        "Total": q.total_amount,
        "Salesman": q.sales_person_name || "-",
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Quotations");
      XLSX.writeFile(wb, "quotations.xlsx");
    } catch (error) {
      console.error("Excel export failed:", error);
      alert("Failed to export Excel. Please try again.");
    } finally {
      setExcelLoading(false);
    }
  };

  const exportPDF = async () => {
    if (pdfLoading) return;
    setPdfLoading(true);
    try {
      const quotations = await getExportData();
      const doc = new jsPDF("landscape");

      autoTable(doc, {
        head: [["Date", "Status", "Expire", "Code", "Reference", "Customer", "Total", "Salesman"]],
        body: quotations.map((q) => [
          dayjs(q.quotation_date).format("DD MMM YYYY"),
          q.status,
          q.validity_date ? dayjs(q.validity_date).format("DD MMM YYYY") : "-",
          q.quotation_number,
          q.reference_no || "-",
          q.customer_name || "Walk-in Customer",
          formatCurrency(q.total_amount),
          q.sales_person_name || "-",
        ]),
      });

      doc.save("quotations.pdf");
    } catch (error) {
      console.error("PDF export failed:", error);
      alert("Failed to export PDF. Please try again.");
    } finally {
      setPdfLoading(false);
    }
  };

  const exportCSV = async () => {
    if (csvLoading) return;
    setCsvLoading(true);
    try {
      const quotations = await getExportData();
      const exportData = quotations.map((q) => ({
        "Quotation Date": dayjs(q.quotation_date).format("DD MMM YYYY"),
        "Quotation Status": q.status,
        "Expire Date": q.validity_date ? dayjs(q.validity_date).format("DD MMM YYYY") : "-",
        "Quotation Code": q.quotation_number,
        "Reference No.": q.reference_no || "-",
        "Customer Name": q.customer_name || "Walk-in Customer",
        "Total": q.total_amount,
        "Salesman": q.sales_person_name || "-",
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const csv = XLSX.utils.sheet_to_csv(ws);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      saveAs(blob, "quotations.csv");
    } catch (error) {
      console.error("CSV export failed:", error);
      alert("Failed to export CSV. Please try again.");
    } finally {
      setCsvLoading(false);
    }
  };

  const handleConvertToInvoice = async (quotationId: string) => {
    const token = getToken();
    if (!company?.id || !token || !confirm("Convert this quotation to an invoice?")) return;

    setConverting(quotationId);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/companies/${company.id}/quotations/${quotationId}/convert`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({}),
        }
      );

      if (response.ok) {
        alert("Quotation converted to invoice successfully!");
        fetchQuotations(); // Refresh the list
      } else {
        const error = await response.json();
        alert(error.detail || "Failed to convert quotation");
      }
    } catch (error) {
      console.error("Failed to convert quotation:", error);
      alert("Failed to convert quotation");
    } finally {
      setConverting(null);
    }
  };

  const handleDelete = async (quotationId: string) => {
    const token = getToken();
    if (!company?.id || !token || !confirm("Are you sure you want to delete this quotation?")) return;

    setDeleting(quotationId);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/companies/${company.id}/quotations/${quotationId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        alert("Quotation deleted successfully!");
        fetchQuotations(); // Refresh the list
      } else {
        const error = await response.json();
        alert(error.detail || "Failed to delete quotation");
      }
    } catch (error) {
      console.error("Failed to delete quotation:", error);
      alert("Failed to delete quotation");
    } finally {
      setDeleting(null);
    }
  };

  const handleConvertToDC = async (quotationId: string) => {
    const token = getToken();
    if (!company?.id || !token) return;

    if (!confirm("Create a Delivery Challan from this quotation?")) return;

    try {
      // Fetch quotation details first
      const quotationRes = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:6768/api"}/companies/${company.id}/quotations/${quotationId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!quotationRes.ok) {
        alert("Failed to fetch quotation details");
        return;
      }

      const quotation = await quotationRes.json();

      // Create DC Out from quotation
      const dcData = {
        customer_id: quotation.customer_id,
        quotation_id: quotationId,
        dc_date: new Date().toISOString(),
        items: (quotation.items || []).map((item: any) => ({
          product_id: item.product_id,
          description: item.description || item.product_name || "",
          hsn_code: item.hsn_code || "",
          quantity: item.quantity || 1,
          unit: item.unit || "NOS",
          unit_price: item.unit_price || 0,
          godown_id: null,
        })),
      };

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:6768/api"}/companies/${company.id}/delivery-challans/dc-out`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(dcData),
        }
      );

      if (response.ok) {
        const dc = await response.json();
        alert(`Delivery Challan ${dc.dc_number} created successfully!`);
        window.location.href = `/delivery-challans/${dc.id}`;
      } else {
        const error = await response.json();
        alert(error.detail || "Failed to create Delivery Challan");
      }
    } catch (error) {
      console.error("Failed to convert to DC:", error);
      alert("Failed to convert quotation to Delivery Challan");
    }
  };

  const handleConvertToSalesOrder = (quotationId: string) => {
    if (!confirm("Convert this quotation to a sales order?")) return;
    router.push(`/sales/sales-orders/new?fromQuotation=${quotationId}`);
  };

  const handlePrint = (quotationId: string) => {
    window.open(`/quotations/${quotationId}/print`, "_blank");
  };

  const handlePDF = (quotationId: string) => {
    window.open(`/quotations/${quotationId}/pdf`, "_blank");
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "draft":
        return "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400";
      case "sent":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
      case "approved":
        return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
      case "rejected":
        return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
      case "expired":
        return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";
      case "converted":
        return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400";
      default:
        return "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400";
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const totalPages = data ? data.total_pages : 0;

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark dark:text-white">Quotations</h1>
          <p className="text-sm text-dark-6">Manage your quotations and convert to invoices</p>
        </div>
        <Link
          href="/quotations/new"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 font-medium text-white transition hover:bg-opacity-90"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create Quotation
        </Link>
      </div>

      {/* Filters + Export */}
      <div className="mb-6 flex flex-col gap-4 rounded-lg bg-white p-4 shadow-1 dark:bg-gray-dark sm:flex-row sm:items-center sm:justify-between">
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-stroke bg-transparent px-4 py-2.5 outline-none focus:border-primary dark:border-dark-3"
        >
          <option value="">All Status</option>
          <option value="draft">Draft</option>
          <option value="sent">Sent</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="expired">Expired</option>
          <option value="converted">Converted</option>
        </select>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={copyToClipboard}
            disabled={copyLoading}
            className="rounded-lg border border-stroke px-4 py-2 text-sm font-medium transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-dark-3 dark:hover:bg-dark-2"
          >
            {copyLoading ? "Copying..." : "Copy"}
          </button>
          <button
            onClick={exportExcel}
            disabled={excelLoading}
            className="rounded-lg border border-stroke px-4 py-2 text-sm font-medium transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-dark-3 dark:hover:bg-dark-2"
          >
            {excelLoading ? "Exporting..." : "Excel"}
          </button>
          <button
            onClick={exportPDF}
            disabled={pdfLoading}
            className="rounded-lg border border-stroke px-4 py-2 text-sm font-medium transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-dark-3 dark:hover:bg-dark-2"
          >
            {pdfLoading ? "Exporting..." : "PDF"}
          </button>
          <button
            onClick={exportCSV}
            disabled={csvLoading}
            className="rounded-lg border border-stroke px-4 py-2 text-sm font-medium transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-dark-3 dark:hover:bg-dark-2"
          >
            {csvLoading ? "Exporting..." : "CSV"}
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg bg-white shadow-1 dark:bg-gray-dark">
        <div className="overflow-x-auto">
          <table className="w-full table-auto">
            <thead>
              <tr className="border-b border-stroke dark:border-dark-3">
                <th className="px-4 py-4 text-left font-medium text-dark dark:text-white">
                  Quotation Date
                </th>
                <th className="px-4 py-4 text-left font-medium text-dark dark:text-white">
                  Quotation Status
                </th>
                <th className="px-4 py-4 text-left font-medium text-dark dark:text-white">
                  Expire Date
                </th>
                <th className="px-4 py-4 text-left font-medium text-dark dark:text-white">
                  Quotation Code
                </th>
                <th className="px-4 py-4 text-left font-medium text-dark dark:text-white">
                  Reference No.
                </th>
                <th className="px-4 py-4 text-left font-medium text-dark dark:text-white whitespace-nowrap w-64">
                  Customer Name
                </th>
                <th className="px-4 py-4 text-left font-medium text-dark dark:text-white">
                  Total
                </th>
                <th className="px-4 py-4 text-left font-medium text-dark dark:text-white">
                  Salesman
                </th>
                <th className="px-4 py-4 text-center font-medium text-dark dark:text-white">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array(5)
                  .fill(0)
                  .map((_, i) => (
                    <tr key={i} className="border-b border-stroke dark:border-dark-3">
                      <td colSpan={9} className="px-4 py-4">
                        <div className="h-4 w-full animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                      </td>
                    </tr>
                  ))
              ) : data?.items?.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-dark-6">
                    No quotations found. Create your first quotation to get started.
                  </td>
                </tr>
              ) : (
                data?.items?.map((quotation) => (
                  <tr
                    key={quotation.id}
                    className="border-b border-stroke transition hover:bg-gray-50 dark:border-dark-3 dark:hover:bg-dark-2"
                  >
                    <td className="px-4 py-4 text-dark-6">
                      {dayjs(quotation.quotation_date).format("DD MMM YYYY")}
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={cn(
                          "inline-flex rounded-full px-3 py-1 text-xs font-medium capitalize",
                          getStatusColor(quotation.status)
                        )}
                      >
                        {quotation.status}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-dark-6">
                      {quotation.validity_date
                        ? dayjs(quotation.validity_date).format("DD MMM YYYY")
                        : "-"}
                    </td>
                    <td className="px-4 py-4">
                      <Link
                        href={`/quotations/${quotation.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {quotation.quotation_number}
                      </Link>
                    </td>
                    <td className="px-4 py-4 text-dark-6">
                      {quotation.reference_no || "-"}
                    </td>
                    <td className="px-4 py-4 text-dark dark:text-white whitespace-nowrap">
                      <span className="inline-block max-w-[240px] truncate">
                        {quotation.customer_name || "Walk-in Customer"}
                      </span>
                    </td>
                    <td className="px-4 py-4 font-medium text-dark dark:text-white">
                      {formatCurrency(quotation.total_amount)}
                    </td>
                    <td className="px-4 py-4 text-dark-6">
                      {quotation.sales_person_name || "-"}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap items-center justify-center gap-1">
                        {/* View Button */}
                        <Link
                          href={`/quotations/${quotation.id}`}
                          className="rounded p-1.5 text-dark-6 transition hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-900/20"
                          title="View"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </Link>

                        {/* Edit Button (only for draft) */}
                        {quotation.status === "draft" && (
                          <Link
                            href={`/quotations/${quotation.id}/edit`}
                            className="rounded p-1.5 text-dark-6 transition hover:bg-green-50 hover:text-green-600 dark:hover:bg-green-900/20"
                            title="Edit"
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </Link>
                        )}

                        {/* Convert to Invoice Button (not for converted) */}
                        {quotation.status !== "converted" && !quotation.converted_invoice_id && (
                          <button
                            onClick={() => handleConvertToInvoice(quotation.id)}
                            disabled={converting === quotation.id}
                            className="rounded p-1.5 text-dark-6 transition hover:bg-purple-50 hover:text-purple-600 disabled:opacity-50 dark:hover:bg-purple-900/20"
                            title="Convert to Invoice"
                          >
                            {converting === quotation.id ? (
                              <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                              </svg>
                            ) : (
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            )}
                          </button>
                        )}

                        {/* Convert to Sales Order Button */}
                        {quotation.status !== "converted" && (
                          <button
                            onClick={() => handleConvertToSalesOrder(quotation.id)}
                            className="rounded p-1.5 text-dark-6 transition hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-900/20"
                            title="Convert to Sales Order"
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5h6m-6 4h6m-6 4h6m2 6H7a2 2 0 01-2-2V5a2 2 0 012-2h6l5 5v11a2 2 0 01-2 2z" />
                            </svg>
                          </button>
                        )}

                        {/* Convert to DC Button */}
                        <button
                          onClick={() => handleConvertToDC(quotation.id)}
                          className="rounded p-1.5 text-dark-6 transition hover:bg-orange-50 hover:text-orange-600 dark:hover:bg-orange-900/20"
                          title="Convert to DC"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </button>

                        {/* Print Button */}
                        <button
                          onClick={() => handlePrint(quotation.id)}
                          className="rounded p-1.5 text-dark-6 transition hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-gray-700"
                          title="Print"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                          </svg>
                        </button>

                        {/* PDF Button */}
                        <button
                          onClick={() => handlePDF(quotation.id)}
                          className="rounded p-1.5 text-dark-6 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
                          title="Download PDF"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                          </svg>
                        </button>

                        {/* Delete Button (only for draft) */}
                        {quotation.status === "draft" && (
                          <button
                            onClick={() => handleDelete(quotation.id)}
                            disabled={deleting === quotation.id}
                            className="rounded p-1.5 text-dark-6 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:hover:bg-red-900/20"
                            title="Delete"
                          >
                            {deleting === quotation.id ? (
                              <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                              </svg>
                            ) : (
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            )}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-stroke px-4 py-4 dark:border-dark-3">
            <p className="text-sm text-dark-6">
              Page {page} of {totalPages} ({data?.total} items)
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-lg border border-stroke px-4 py-2 text-sm font-medium transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-dark-3 dark:hover:bg-dark-2"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="rounded-lg border border-stroke px-4 py-2 text-sm font-medium transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-dark-3 dark:hover:bg-dark-2"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
