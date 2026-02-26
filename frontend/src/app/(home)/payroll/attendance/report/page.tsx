"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import api from "@/services/api";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { saveAs } from "file-saver";
import { addPdfPageNumbers, getProfessionalTableTheme } from "@/utils/pdfTheme";
import {
  Search,
  Filter,
  Users,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  MoreVertical,
  ChevronDown,
  ChevronUp,
  Download,
  FileText,
  RefreshCw,
  Copy,
  Printer,
} from "lucide-react";

interface AttendanceSummary {
  employee_id: string;
  employee_name: string;
  employee_code: string;
  present_days: number;
  absent_days: number;
  half_days: number;
  leave_days: number;
  working_days: number;
  attendance_percent: number;
}

// Print component for attendance report
const PrintView = ({
  summary,
  month,
  year,
  formatMonthYear,
  onComplete,
  companyName,
}: {
  summary: AttendanceSummary[];
  month: number;
  year: number;
  formatMonthYear: (month: number, year: number) => string;
  onComplete: () => void;
  companyName: string;
}) => {
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (printRef.current) {
      const printContents = printRef.current.innerHTML;
      const printWindow = window.open("", "_blank", "width=1024,height=768");

      if (!printWindow) {
        onComplete();
        return;
      }

      printWindow.document.open();
      printWindow.document.write("<html><head><title>Print</title></head><body></body></html>");
      printWindow.document.close();

      if (printWindow.document.body) {
        printWindow.document.body.innerHTML = printContents;
      }

      printWindow.focus();
      printWindow.print();
      printWindow.close();
      onComplete();
    }
  }, []);

  return (
    <div style={{ display: 'none' }}>
      <div ref={printRef} style={{ fontFamily: 'Arial, sans-serif', padding: '20px' }}>
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '5px' }}>
            Attendance Report
          </h1>
          <p style={{ fontSize: '14px', color: '#666' }}>{companyName}</p>
          <p style={{ fontSize: '14px', color: '#666' }}>
            {formatMonthYear(month, year)}
          </p>
          <p style={{ color: '#666', fontSize: '14px' }}>
            Generated on: {new Date().toLocaleDateString('en-IN')}
          </p>
        </div>

        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          border: '1px solid #ddd'
        }}>
          <thead>
            <tr style={{
              backgroundColor: '#f3f4f6',
              borderBottom: '2px solid #ddd'
            }}>
              <th style={{ padding: '12px', textAlign: 'left', borderRight: '1px solid #ddd', fontWeight: 'bold' }}>
                Employee Code
              </th>
              <th style={{ padding: '12px', textAlign: 'left', borderRight: '1px solid #ddd', fontWeight: 'bold' }}>
                Employee Name
              </th>
              <th style={{ padding: '12px', textAlign: 'center', borderRight: '1px solid #ddd', fontWeight: 'bold' }}>
                Present
              </th>
              <th style={{ padding: '12px', textAlign: 'center', borderRight: '1px solid #ddd', fontWeight: 'bold' }}>
                Absent
              </th>
              <th style={{ padding: '12px', textAlign: 'center', borderRight: '1px solid #ddd', fontWeight: 'bold' }}>
                Half Day
              </th>
              <th style={{ padding: '12px', textAlign: 'center', borderRight: '1px solid #ddd', fontWeight: 'bold' }}>
                Leave
              </th>
              <th style={{ padding: '12px', textAlign: 'center', borderRight: '1px solid #ddd', fontWeight: 'bold' }}>
                Working Days
              </th>
              <th style={{ padding: '12px', textAlign: 'center', fontWeight: 'bold' }}>
                %
              </th>
            </tr>
          </thead>
          <tbody>
            {summary.map((item, index) => (
              <tr key={item.employee_id} style={{
                borderBottom: '1px solid #ddd',
                backgroundColor: index % 2 === 0 ? '#fff' : '#f9f9f9'
              }}>
                <td style={{ padding: '12px', borderRight: '1px solid #ddd' }}>
                  {item.employee_code}
                </td>
                <td style={{ padding: '12px', borderRight: '1px solid #ddd' }}>
                  {item.employee_name}
                </td>
                <td style={{ padding: '12px', textAlign: 'center', borderRight: '1px solid #ddd', color: '#059669', fontWeight: 'bold' }}>
                  {item.present_days}
                </td>
                <td style={{ padding: '12px', textAlign: 'center', borderRight: '1px solid #ddd', color: '#dc2626', fontWeight: 'bold' }}>
                  {item.absent_days}
                </td>
                <td style={{ padding: '12px', textAlign: 'center', borderRight: '1px solid #ddd', color: '#d97706', fontWeight: 'bold' }}>
                  {item.half_days}
                </td>
                <td style={{ padding: '12px', textAlign: 'center', borderRight: '1px solid #ddd', color: '#2563eb', fontWeight: 'bold' }}>
                  {item.leave_days}
                </td>
                <td style={{ padding: '12px', textAlign: 'center', borderRight: '1px solid #ddd' }}>
                  {item.working_days}
                </td>
                <td style={{ padding: '12px', textAlign: 'center' }}>
                  <span style={{
                    fontWeight: 'bold',
                    color: item.attendance_percent >= 90 ? '#059669' :
                           item.attendance_percent >= 75 ? '#d97706' : '#dc2626'
                  }}>
                    {item.attendance_percent.toFixed(1)}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ backgroundColor: '#f3f4f6', borderTop: '2px solid #ddd' }}>
              <td colSpan={8} style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold' }}>
                Total Employees: {summary.length}
              </td>
            </tr>
          </tfoot>
        </table>

        <div style={{
          marginTop: '30px',
          paddingTop: '20px',
          borderTop: '1px solid #ddd',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ fontSize: '12px', color: '#666' }}>
            Total Records: {summary.length}
          </div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            Page 1 of 1
          </div>
        </div>
      </div>
    </div>
  );
};

export default function AttendanceReportPage() {
  const { company } = useAuth();
  const [summary, setSummary] = useState<AttendanceSummary[]>([]);
  const [filteredSummary, setFilteredSummary] = useState<AttendanceSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  
  // Search and filter state
  const [search, setSearch] = useState("");
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  
  // Export loading states
  const [copyLoading, setCopyLoading] = useState(false);
  const [excelLoading, setExcelLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [csvLoading, setCsvLoading] = useState(false);
  const [printLoading, setPrintLoading] = useState(false);
  
  // Print view state
  const [showPrintView, setShowPrintView] = useState(false);
  const [summaryToPrint, setSummaryToPrint] = useState<AttendanceSummary[]>([]);

  useEffect(() => {
    if (company?.id) {
      fetchSummary();
    }
  }, [company, month, year]);

  useEffect(() => {
    // Apply search filter whenever summary or search changes
    filterData();
    setCurrentPage(1);
  }, [search, summary]);

  const fetchSummary = async () => {
    try {
      setLoading(true);
      const response = await api.get(
        `/companies/${company?.id}/payroll/attendance/summary?month=${month}&year=${year}`
      );
      setSummary(response.data || []);
      setError("");
    } catch (error) {
      console.error("Error fetching summary:", error);
      setError("Failed to load attendance data");
    } finally {
      setLoading(false);
    }
  };

  const filterData = () => {
    if (!search.trim()) {
      setFilteredSummary(summary);
      return;
    }

    const searchLower = search.toLowerCase();
    const filtered = summary.filter(item => 
      item.employee_name.toLowerCase().includes(searchLower) ||
      item.employee_code.toLowerCase().includes(searchLower)
    );
    setFilteredSummary(filtered);
  };

  const handleReset = () => {
    setSearch("");
    setMonth(new Date().getMonth() + 1);
    setYear(new Date().getFullYear());
  };

  const formatMonthYear = (month: number, year: number): string => {
    return new Date(year, month - 1).toLocaleString('default', { month: 'long', year: 'numeric' });
  };

  const getAttendanceColor = (percent: number): string => {
    if (percent >= 90) return "text-success";
    if (percent >= 75) return "text-warning";
    return "text-danger";
  };

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredSummary.length / pageSize));
  const pagedSummary = filteredSummary.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Summary statistics
  const totalEmployees = summary.length;
  const avgAttendance = summary.length > 0 
    ? (summary.reduce((acc, curr) => acc + curr.attendance_percent, 0) / summary.length).toFixed(1)
    : "0";
  const totalPresent = summary.reduce((acc, curr) => acc + curr.present_days, 0);
  const totalAbsent = summary.reduce((acc, curr) => acc + curr.absent_days, 0);

  // Export functions
  const copyToClipboard = async () => {
    if (copyLoading) return;
    setCopyLoading(true);
    try {
      const dataToExport = filteredSummary;
      
      const headers = ["Employee Code", "Employee Name", "Present", "Absent", "Half Day", "Leave", "Working Days", "Attendance %"];
      const rows = dataToExport.map(item => [
        item.employee_code,
        item.employee_name,
        item.present_days.toString(),
        item.absent_days.toString(),
        item.half_days.toString(),
        item.leave_days.toString(),
        item.working_days.toString(),
        `${item.attendance_percent.toFixed(1)}%`
      ]);

      const text = [headers.join("\t"), ...rows.map(r => r.join("\t"))].join("\n");
      await navigator.clipboard.writeText(text);
      alert("Attendance data copied to clipboard");
    } catch (error) {
      console.error("Copy failed:", error);
      alert("Failed to copy data. Please try again.");
    } finally {
      setCopyLoading(false);
    }
  };

  const exportExcel = () => {
    if (excelLoading) return;
    setExcelLoading(true);
    try {
      const dataToExport = filteredSummary.map(item => ({
        "Employee Code": item.employee_code,
        "Employee Name": item.employee_name,
        "Present Days": item.present_days,
        "Absent Days": item.absent_days,
        "Half Days": item.half_days,
        "Leave Days": item.leave_days,
        "Working Days": item.working_days,
        "Attendance Percentage": `${item.attendance_percent.toFixed(1)}%`,
      }));

      const ws = XLSX.utils.json_to_sheet(dataToExport);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Attendance Report");
      XLSX.writeFile(wb, `attendance_report_${month}_${year}.xlsx`);
    } catch (error) {
      console.error("Excel export failed:", error);
      alert("Failed to export Excel. Please try again.");
    } finally {
      setExcelLoading(false);
    }
  };

  const exportPDF = () => {
    if (pdfLoading) return;
    setPdfLoading(true);
    try {
      const doc = new jsPDF("landscape");
      
      const headers = [["Emp. Code", "Employee Name", "Present", "Absent", "Half Day", "Leave", "Working Days", "Attendance %"]];
      const body = filteredSummary.map(item => [
        item.employee_code,
        item.employee_name,
        item.present_days.toString(),
        item.absent_days.toString(),
        item.half_days.toString(),
        item.leave_days.toString(),
        item.working_days.toString(),
        `${item.attendance_percent.toFixed(1)}%`,
      ]);

      autoTable(doc, {
        ...getProfessionalTableTheme(doc, `Attendance Report - ${formatMonthYear(month, year)}`, company?.name || "", "l"),
        head: headers,
        body: body,
        styles: {
          fontSize: 9,
          cellPadding: 3,
          overflow: "linebreak",
          font: "helvetica",
        },
        columnStyles: {
          0: { cellWidth: 30 },
          1: { cellWidth: 50 },
          2: { cellWidth: 20, halign: 'center' },
          3: { cellWidth: 20, halign: 'center' },
          4: { cellWidth: 20, halign: 'center' },
          5: { cellWidth: 20, halign: 'center' },
          6: { cellWidth: 25, halign: 'center' },
          7: { cellWidth: 25, halign: 'center' },
        }
      });

      addPdfPageNumbers(doc, "l");
      doc.save(`attendance_report_${month}_${year}.pdf`);
    } catch (error) {
      console.error("PDF export failed:", error);
      alert("Failed to export PDF. Please try again.");
    } finally {
      setPdfLoading(false);
    }
  };

  const exportCSV = () => {
    if (csvLoading) return;
    setCsvLoading(true);
    try {
      const dataToExport = filteredSummary.map(item => ({
        "Employee Code": item.employee_code,
        "Employee Name": item.employee_name,
        "Present Days": item.present_days,
        "Absent Days": item.absent_days,
        "Half Days": item.half_days,
        "Leave Days": item.leave_days,
        "Working Days": item.working_days,
        "Attendance %": item.attendance_percent.toFixed(1),
      }));

      const ws = XLSX.utils.json_to_sheet(dataToExport);
      const csv = XLSX.utils.sheet_to_csv(ws);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      saveAs(blob, `attendance_report_${month}_${year}.csv`);
    } catch (error) {
      console.error("CSV export failed:", error);
      alert("Failed to export CSV. Please try again.");
    } finally {
      setCsvLoading(false);
    }
  };

  const handlePrint = () => {
    if (printLoading) return;
    setPrintLoading(true);
    try {
      setSummaryToPrint(filteredSummary);
      setShowPrintView(true);
    } catch (error) {
      console.error("Print failed:", error);
      alert("Failed to prepare print view. Please try again.");
    } finally {
      setPrintLoading(false);
    }
  };

  if (!company?.id) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 dark:bg-yellow-900/20 dark:border-yellow-800">
          <p className="text-yellow-800 dark:text-yellow-400">Please select a company first.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {showPrintView && (
        <PrintView
          onComplete={() => setShowPrintView(false)}
          summary={summaryToPrint}
          month={month}
          year={year}
          formatMonthYear={formatMonthYear}
          companyName={company?.name || ''}
        />
      )}

      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Attendance Report
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              View and analyze employee attendance for {formatMonthYear(month, year)}
            </p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="px-6 py-6 bg-gray-50 dark:bg-gray-900">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
          {/* Total Employees */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {totalEmployees}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Total Employees
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
                <Users className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </div>

          {/* Average Attendance */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-blue-600">
                  {avgAttendance}%
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Average Attendance
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                <Calendar className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>

          {/* Total Present Days */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-green-600">
                  {totalPresent}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Total Present Days
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </div>

          {/* Total Absent Days */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-red-600">
                  {totalAbsent}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Total Absent Days
                </p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                <XCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters Section */}
      <div className="px-6 py-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex flex-wrap gap-4">
          {/* Month/Year Selection */}
          <div className="flex gap-2">
            <select
              value={month}
              onChange={(e) => setMonth(parseInt(e.target.value))}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {new Date(2000, i).toLocaleString('default', { month: 'long' })}
                </option>
              ))}
            </select>
            <select
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value))}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              {Array.from({ length: 5 }, (_, i) => (
                <option key={year - 2 + i} value={year - 2 + i}>
                  {year - 2 + i}
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by name or employee code..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={copyToClipboard}
              disabled={copyLoading}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {copyLoading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-transparent"></div>
              ) : (
                <Copy className="w-5 h-5" />
              )}
              Copy
            </button>

            <button
              onClick={exportExcel}
              disabled={excelLoading}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {excelLoading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-transparent"></div>
              ) : (
                <>
                  <FileText className="w-5 h-5" />
                  Excel
                </>
              )}
            </button>

            <button
              onClick={exportPDF}
              disabled={pdfLoading}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {pdfLoading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-transparent"></div>
              ) : (
                <>
                  <Download className="w-5 h-5" />
                  PDF
                </>
              )}
            </button>

            <button
              onClick={exportCSV}
              disabled={csvLoading}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {csvLoading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-transparent"></div>
              ) : (
                <>
                  <FileText className="w-5 h-5" />
                  CSV
                </>
              )}
            </button>

            <button
              onClick={handlePrint}
              disabled={printLoading}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {printLoading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-transparent"></div>
              ) : (
                <>
                  <Printer className="w-5 h-5" />
                  Print
                </>
              )}
            </button>

            <button
              onClick={handleReset}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors flex items-center gap-2"
            >
              <RefreshCw className="w-5 h-5" />
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mx-6 mt-4 bg-red-50 border border-red-200 rounded-lg p-4 dark:bg-red-900/20 dark:border-red-800">
          <p className="text-red-800 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px]">
            <thead className="bg-gray-200 dark:bg-gray-700/50">
              <tr className="text-sm font-semibold text-gray-600 dark:text-gray-300">
                <th className="text-left px-3 py-3 w-12">S.No</th>
                <th className="text-left px-3 py-3">Employee Code</th>
                <th className="text-left px-3 py-3">Employee Name</th>
                <th className="text-center px-3 py-3">Present</th>
                <th className="text-center px-3 py-3">Absent</th>
                <th className="text-center px-3 py-3">Half Day</th>
                <th className="text-center px-3 py-3">Leave</th>
                <th className="text-center px-3 py-3">Working Days</th>
                <th className="text-center px-3 py-3">Attendance %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700 text-sm text-gray-700 dark:text-gray-300">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-6 py-8 text-center">
                    <div className="flex items-center justify-center">
                      <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
                    </div>
                  </td>
                </tr>
              ) : filteredSummary.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-8 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <Calendar className="w-12 h-12 text-gray-400 mb-2" />
                      <p className="text-lg font-medium text-gray-900 dark:text-white mb-1">
                        No attendance data found
                      </p>
                      <p className="text-gray-500 dark:text-gray-400">
                        {search ? 
                          "No records found matching your search criteria." :
                          `No attendance records available for ${formatMonthYear(month, year)}.`
                        }
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                pagedSummary.map((item, index) => (
                  <tr
                    key={item.employee_id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <td className="px-3 py-4 align-top">
                      {(currentPage - 1) * pageSize + index + 1}
                    </td>
                    <td className="px-3 py-4 align-top font-medium">
                      {item.employee_code}
                    </td>
                    <td className="px-3 py-4 align-top">
                      <div className="font-medium text-gray-900 dark:text-white">
                        {item.employee_name}
                      </div>
                    </td>
                    <td className="px-3 py-4 text-center align-top font-bold text-success">
                      {item.present_days}
                    </td>
                    <td className="px-3 py-4 text-center align-top font-bold text-danger">
                      {item.absent_days}
                    </td>
                    <td className="px-3 py-4 text-center align-top font-bold text-warning">
                      {item.half_days}
                    </td>
                    <td className="px-3 py-4 text-center align-top font-bold text-primary">
                      {item.leave_days}
                    </td>
                    <td className="px-3 py-4 text-center align-top">
                      {item.working_days}
                    </td>
                    <td className="px-3 py-4 text-center align-top">
                      <span className={`font-bold ${getAttendanceColor(item.attendance_percent)}`}>
                        {item.attendance_percent.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {!loading && filteredSummary.length > 0 && (
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, filteredSummary.length)} of {filteredSummary.length} records
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 text-sm text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Previous
            </button>
            <div className="text-sm text-gray-700 dark:text-gray-300">
              Page {currentPage} of {totalPages}
            </div>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 rounded-md border border-gray-300 dark:border-gray-600 text-sm text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}