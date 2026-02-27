"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { dashboardApi, invoicesApi, ordersApi } from "@/services/api";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  TrendingUp,
  Users,
  ShoppingCart,
  FileText,
  DollarSign,
  CreditCard,
  AlertCircle,
  Plus,
  Calendar,
  BarChart3,
  RefreshCw,
  Package,
  TrendingDown,
  Clock,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface DashboardData {
  today_sales: number;
  weekly_sales: number;
  monthly_sales: number;
  total_pending: number;
  total_sales: number;
  total_paid: number;
  total_invoices: number;
  top_customers: Array<{
    customer_name: string;
    invoice_count: number;
    total_amount: number;
  }>;
  sales_by_status: Record<string, number>;
  recent_invoices: Array<{
    id: string;
    invoice_number: string;
    invoice_date: string;
    customer_name: string;
    total_amount: number;
    amount_paid: number;
    balance_due: number;
    status: string;
    voucher_type: string;
    reference_no: string;
    created_at: string;
  }>;
}

interface SalesSummary {
  total_invoices: number;
  total_revenue: number;
  total_pending: number;
  total_paid: number;
  overdue_count: number;
  overdue_amount: number;
  current_month_revenue: number;
  current_month_invoices: number;
  total_cgst: number;
  total_sgst: number;
  total_igst: number;
}

interface TimeRangeData {
  sales_data: Array<{
    date: string;
    amount: number;
    invoices: number;
  }>;
  summary: {
    total_sales: number;
    total_invoices: number;
    avg_order_value: number;
    best_day: string;
    best_day_amount: number;
    total_paid: number;
    total_pending: number;
    total_cgst: number;
    total_sgst: number;
    total_igst: number;
  };
  status_distribution: Array<{
    status: string;
    count: number;
    amount: number;
  }>;
  top_products: Array<{
    name: string;
    quantity: number;
    revenue: number;
  }>;
}

interface TimeRangeMetrics {
  total_sales: number;
  total_invoices: number;
  total_paid: number;
  total_pending: number;
  total_cgst: number;
  total_sgst: number;
  total_igst: number;
  avg_order_value: number;
}

export default function SalesDashboardPage() {
  const router = useRouter();
  const { company, user, isEmployee } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [salesSummary, setSalesSummary] = useState<SalesSummary | null>(null);
  const [timeRangeData, setTimeRangeData] = useState<TimeRangeData | null>(null);
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month' | 'year'>('month');
  const [timeRangeMetrics, setTimeRangeMetrics] = useState<TimeRangeMetrics>({
    total_sales: 0,
    total_invoices: 0,
    total_paid: 0,
    total_pending: 0,
    total_cgst: 0,
    total_sgst: 0,
    total_igst: 0,
    avg_order_value: 0,
  });

  const isSalesEngineer = useMemo(() => {
    if (!isEmployee || !user) return false;
    const designationName =
      typeof user.designation === "string"
        ? user.designation
        : user.designation?.name || "";
    return /sales\s*engineer/i.test(designationName);
  }, [isEmployee, user]);

  const getBaseAmount = (row: any): number => {
    const n = Number(row?.subtotal ?? row?.taxable_amount ?? row?.total_amount ?? 0);
    return Number.isFinite(n) ? n : 0;
  };

  const getDisplayAmount = (row: any): number => {
    if (isSalesEngineer) return getBaseAmount(row);
    const n = Number(row?.total_amount ?? 0);
    return Number.isFinite(n) ? n : 0;
  };

  // Format currency (handles NaN, null, undefined)
  const formatCurrency = (amount: number | undefined | null): string => {
    const n = Number(amount);
    if (!Number.isFinite(n)) return '₹0';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(n);
  };

  // Format short currency for charts
  const formatShortCurrency = (amount: number): string => {
    if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)}Cr`;
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
    if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`;
    return `₹${amount}`;
  };

  // Format date
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
    });
  };

  // Format chart date
  const formatChartDate = (dateString: string, range: string): string => {
    const date = new Date(dateString);
    if (range === 'today') {
      return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    } else if (range === 'week') {
      return date.toLocaleDateString('en-IN', { weekday: 'short' });
    } else if (range === 'month') {
      return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    } else {
      return date.toLocaleDateString('en-IN', { month: 'short' });
    }
  };

  // Get status badge color
  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'paid': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'draft': return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
      case 'partially_paid': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'cancelled': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'confirmed': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'completed': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  // Get status display name
  const getStatusDisplayName = (status: string): string => {
    const statusMap: Record<string, string> = {
      'paid': 'Paid',
      'pending': 'Pending',
      'draft': 'Draft',
      'partially_paid': 'Partially Paid',
      'cancelled': 'Cancelled',
      'confirmed': 'Confirmed',
      'completed': 'Completed',
      'overdue': 'Overdue'
    };
    return statusMap[status?.toLowerCase()] || status;
  };

  // Get time range display name
  const getTimeRangeDisplayName = (range: string): string => {
    const rangeMap: Record<string, string> = {
      'today': 'Today',
      'week': 'This Week',
      'month': 'This Month',
      'year': 'This Year'
    };
    return rangeMap[range] || range;
  };

  // Calculate metrics for a specific time range
  const calculateTimeRangeMetrics = (invoices: any[], range: 'today' | 'week' | 'month' | 'year') => {
    const now = new Date();
    let startDate = new Date();
    
    // Set start date based on range
    switch (range) {
      case 'today':
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setDate(1);
        break;
      case 'year':
        startDate.setFullYear(now.getFullYear(), 0, 1);
        break;
    }

    let totalSales = 0;
    let totalInvoices = 0;
    let totalPaid = 0;
    let totalPending = 0;
    let totalCgst = 0;
    let totalSgst = 0;
    let totalIgst = 0;

    invoices.forEach(invoice => {
      const invoiceDate = new Date(invoice.invoice_date);
      
      // Check if invoice is within the time range
      if (invoiceDate >= startDate && invoiceDate <= now) {
        const amt = getDisplayAmount(invoice);
        const paid = Number(invoice.amount_paid) || 0;
        const due = Number(invoice.balance_due) || 0;
        const cgst = Number(invoice.cgst_amount) || 0;
        const sgst = Number(invoice.sgst_amount) || 0;
        const igst = Number(invoice.igst_amount) || 0;

        totalSales += amt;
        totalPaid += paid;
        totalPending += due;
        totalCgst += cgst;
        totalSgst += sgst;
        totalIgst += igst;
        totalInvoices++;
      }
    });

    return {
      total_sales: totalSales,
      total_invoices: totalInvoices,
      total_paid: totalPaid,
      total_pending: totalPending,
      total_cgst: totalCgst,
      total_sgst: totalSgst,
      total_igst: totalIgst,
      avg_order_value: totalInvoices > 0 ? totalSales / totalInvoices : 0
    };
  };

  // Fetch dashboard data
  const fetchDashboardData = async () => {
    if (!company?.id) return;

    try {
      setLoading(true);
      
      // Fetch dashboard summary from invoice API
      const dashboardResponse = await invoicesApi.getDashboardSummary(company.id);

      // Fetch invoices for detailed summary
      const invoiceResponse = await invoicesApi.list(company.id, {
        page: 1,
        page_size: 1000,
      });

      // Calculate sales summary from invoice data
      const invoices = invoiceResponse.invoices || [];
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      let totalRevenue = 0;
      let totalPaid = 0;
      let totalPending = 0;
      let overdueCount = 0;
      let overdueAmount = 0;
      let currentMonthRevenue = 0;
      let currentMonthInvoices = 0;
      let totalCgst = 0;
      let totalSgst = 0;
      let totalIgst = 0;

      invoices.forEach(invoice => {
        const invoiceDate = new Date(invoice.invoice_date);
        const isCurrentMonth = invoiceDate.getMonth() === currentMonth && 
                               invoiceDate.getFullYear() === currentYear;
        
        const amt = getDisplayAmount(invoice);
        const paid = Number(invoice.amount_paid) || 0;
        const due = Number(invoice.balance_due) || 0;
        const cgst = Number(invoice.cgst_amount) || 0;
        const sgst = Number(invoice.sgst_amount) || 0;
        const igst = Number(invoice.igst_amount) || 0;

        totalRevenue += amt;
        totalPaid += paid;
        totalPending += due;
        totalCgst += cgst;
        totalSgst += sgst;
        totalIgst += igst;

        if (isCurrentMonth) {
          currentMonthRevenue += amt;
          currentMonthInvoices++;
        }

        // Check if overdue
        if (invoice.due_date && 
            ['pending', 'partially_paid'].includes(invoice.status) &&
            new Date(invoice.due_date) < now) {
          overdueCount++;
          overdueAmount += due;
        }
      });

      const recentInvoicesFromList = [...invoices]
        .sort((a: any, b: any) => {
          const aTime = new Date(a?.created_at || a?.invoice_date || 0).getTime();
          const bTime = new Date(b?.created_at || b?.invoice_date || 0).getTime();
          return bTime - aTime;
        })
        .slice(0, 8)
        .map((inv: any) => ({
          id: String(inv?.id || ""),
          invoice_number: inv?.invoice_number || "-",
          invoice_date: inv?.invoice_date || inv?.created_at || "",
          customer_name: inv?.customer_name || "Walk-in Customer",
          total_amount: getDisplayAmount(inv),
          amount_paid: Number(inv?.amount_paid) || 0,
          balance_due: Number(inv?.balance_due) || 0,
          status: inv?.status || "draft",
          voucher_type: inv?.voucher_type || "invoice",
          reference_no: inv?.reference_no || "",
          created_at: inv?.created_at || inv?.invoice_date || "",
        }));

      const customerMap = new Map<string, { customer_name: string; invoice_count: number; total_amount: number }>();
      for (const inv of invoices) {
        const customerName = inv.customer_name || "Walk-in Customer";
        const amount = getDisplayAmount(inv);
        if (!customerMap.has(customerName)) {
          customerMap.set(customerName, { customer_name: customerName, invoice_count: 0, total_amount: 0 });
        }
        const row = customerMap.get(customerName)!;
        row.invoice_count += 1;
        row.total_amount += amount;
      }

      const topCustomersFromList = Array.from(customerMap.values())
        .sort((a, b) => b.total_amount - a.total_amount)
        .slice(0, 10);

      const normalizedDashboard = (() => {
        return {
          ...(dashboardResponse as any),
          top_customers: topCustomersFromList,
          recent_invoices: recentInvoicesFromList,
        };
      })();

      setDashboardData({
        ...(normalizedDashboard as any),
        top_customers: topCustomersFromList,
        recent_invoices: recentInvoicesFromList,
      } as any);

      setSalesSummary({
        total_invoices: (invoiceResponse as any).total_invoices || invoiceResponse.total || invoices.length,
        total_revenue: Number.isFinite(totalRevenue) ? totalRevenue : 0,
        total_paid: Number.isFinite(totalPaid) ? totalPaid : 0,
        total_pending: Number.isFinite(totalPending) ? totalPending : 0,
        overdue_count: overdueCount,
        overdue_amount: Number.isFinite(overdueAmount) ? overdueAmount : 0,
        current_month_revenue: Number.isFinite(currentMonthRevenue) ? currentMonthRevenue : 0,
        current_month_invoices: currentMonthInvoices,
        total_cgst: Number.isFinite(totalCgst) ? totalCgst : 0,
        total_sgst: Number.isFinite(totalSgst) ? totalSgst : 0,
        total_igst: Number.isFinite(totalIgst) ? totalIgst : 0,
      });

      // Calculate time range metrics for current selection
      const metrics = calculateTimeRangeMetrics(invoices, timeRange);
      setTimeRangeMetrics(metrics);

    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Fetch time range specific data
  const fetchTimeRangeData = async (range: 'today' | 'week' | 'month' | 'year') => {
    if (!company?.id) return;

    try {
      // Calculate date range
      const now = new Date();
      let startDate = new Date();
      
      switch (range) {
        case 'today':
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          startDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          startDate.setDate(1);
          break;
        case 'year':
          startDate.setFullYear(now.getFullYear(), 0, 1);
          break;
      }

      // Fetch invoices for the time range
      const invoiceResponse = await invoicesApi.list(company.id, {
        page: 1,
        page_size: 1000,
        from_date: startDate.toISOString().split('T')[0],
        to_date: now.toISOString().split('T')[0],
      });

      const invoices = invoiceResponse.invoices || [];
      
      // Process sales data for charts
      const salesByDate = new Map<string, { amount: number; invoices: number }>();
      const statusDistribution = new Map<string, { count: number; amount: number }>();
      const productMap = new Map<string, { name: string; quantity: number; revenue: number }>();

      let totalSales = 0;
      let totalInvoices = 0;
      let totalPaid = 0;
      let totalPending = 0;
      let totalCgst = 0;
      let totalSgst = 0;
      let totalIgst = 0;
      let bestDay = '';
      let bestDayAmount = 0;

      invoices.forEach(invoice => {
        const invoiceDate = new Date(invoice.invoice_date);
        const dateKey = invoiceDate.toISOString().split('T')[0];
        const amount = getDisplayAmount(invoice);
        const paid = Number(invoice.amount_paid) || 0;
        const due = Number(invoice.balance_due) || 0;
        const cgst = Number(invoice.cgst_amount) || 0;
        const sgst = Number(invoice.sgst_amount) || 0;
        const igst = Number(invoice.igst_amount) || 0;
        
        // Update sales by date
        if (!salesByDate.has(dateKey)) {
          salesByDate.set(dateKey, { amount: 0, invoices: 0 });
        }
        const dateData = salesByDate.get(dateKey)!;
        dateData.amount += amount;
        dateData.invoices += 1;
        
        // Update best day
        if (dateData.amount > bestDayAmount) {
          bestDayAmount = dateData.amount;
          bestDay = dateKey;
        }
        
        // Update totals
        totalSales += amount;
        totalInvoices += 1;
        totalPaid += paid;
        totalPending += due;
        totalCgst += cgst;
        totalSgst += sgst;
        totalIgst += igst;
        
        // Update status distribution
        const status = invoice.status;
        if (!statusDistribution.has(status)) {
          statusDistribution.set(status, { count: 0, amount: 0 });
        }
        const statusData = statusDistribution.get(status)!;
        statusData.count += 1;
        statusData.amount += amount;
        
        // Process items for product analysis (if available)
        if (invoice.items && Array.isArray(invoice.items)) {
          invoice.items.forEach((item: any) => {
            const productName = item.product_name || item.description || 'Unknown Product';
            if (!productMap.has(productName)) {
              productMap.set(productName, { 
                name: productName, 
                quantity: 0, 
                revenue: 0 
              });
            }
            const productData = productMap.get(productName)!;
            productData.quantity += Number(item.quantity) || 0;
            const itemRevenue = isSalesEngineer
              ? (Number(item.taxable_amount) || Number(item.quantity) * Number(item.rate) || 0)
              : (Number(item.total_amount) || Number(item.quantity) * Number(item.rate) || 0);
            productData.revenue += itemRevenue;
          });
        }
      });

      // Convert sales data to array for chart
      const salesData = Array.from(salesByDate.entries())
        .map(([date, data]) => ({
          date,
          amount: data.amount,
          invoices: data.invoices,
          formattedDate: formatChartDate(date, range)
        }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      // Convert status distribution to array
      const statusData = Array.from(statusDistribution.entries())
        .map(([status, data]) => ({
          status: getStatusDisplayName(status),
          count: data.count,
          amount: data.amount
        }));

      // Get top 5 products by revenue
      const topProducts = Array.from(productMap.values())
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      setTimeRangeData({
        sales_data: salesData,
        summary: {
          total_sales: totalSales,
          total_invoices: totalInvoices,
          avg_order_value: totalInvoices > 0 ? totalSales / totalInvoices : 0,
          best_day: bestDay ? formatChartDate(bestDay, range) : 'N/A',
          best_day_amount: bestDayAmount,
          total_paid: totalPaid,
          total_pending: totalPending,
          total_cgst: totalCgst,
          total_sgst: totalSgst,
          total_igst: totalIgst
        },
        status_distribution: statusData,
        top_products: topProducts
      });

      // Update time range metrics
      setTimeRangeMetrics({
        total_sales: totalSales,
        total_invoices: totalInvoices,
        total_paid: totalPaid,
        total_pending: totalPending,
        total_cgst: totalCgst,
        total_sgst: totalSgst,
        total_igst: totalIgst,
        avg_order_value: totalInvoices > 0 ? totalSales / totalInvoices : 0
      });

    } catch (error) {
      console.error("Failed to fetch time range data:", error);
    }
  };

  // Handle refresh
  const handleRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
    fetchTimeRangeData(timeRange);
  };

  // Handle time range change
  const handleTimeRangeChange = (range: 'today' | 'week' | 'month' | 'year') => {
    setTimeRange(range);
    fetchTimeRangeData(range);
  };

  // Initial data fetch
  useEffect(() => {
    if (company?.id) {
      fetchDashboardData();
      fetchTimeRangeData(timeRange);
    }
  }, [company?.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading dashboard data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Sales Dashboard
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Monitor your sales performance and revenue analytics
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button> */}
            <button
              onClick={() => router.push('/sales/new')}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 transition"
            >
              <Plus className="w-5 h-5" />
              New Sale
            </button>
          </div>
        </div>
      </div>

      {/* Time Range Selector */}
      <div className="px-6 py-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-gray-500" />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Showing data for: <span className="font-medium">{getTimeRangeDisplayName(timeRange)}</span>
            </span>
          </div>
          <div className="text-sm text-gray-500">
            {timeRangeMetrics.total_invoices} invoices in selected period
          </div>
        </div>
        <div className="flex bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 p-1">
          {['today', 'week', 'month', 'year'].map((range) => (
            <button
              key={range}
              onClick={() => handleTimeRangeChange(range as any)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors capitalize ${
                timeRange === range
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* Key Metrics - NOW TIME RANGE BASED */}
      <div className="px-6 py-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols2 gap-6">
          {/* Total Revenue for Time Range */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <DollarSign className="w-4 h-4 text-blue-500" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Total Sales ({timeRange})
                  </p>
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                  {formatCurrency(timeRangeMetrics.total_sales)}
                </p>
                <div className="flex items-center gap-1 mt-2">
                  {timeRangeMetrics.total_sales > 0 ? (
                    <>
                      <TrendingUp className="w-4 h-4 text-green-500" />
                      <span className="text-sm text-green-600">
                        {timeRangeMetrics.avg_order_value > 0 && formatCurrency(timeRangeMetrics.avg_order_value)} avg order
                      </span>
                    </>
                  ) : (
                    <span className="text-sm text-gray-500">No sales in this period</span>
                  )}
                </div>
              </div>
              <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>

          {/* Total Paid for Time Range */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <CreditCard className="w-4 h-4 text-green-500" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Amount Paid ({timeRange})
                  </p>
                </div>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-2">
                  {formatCurrency(timeRangeMetrics.total_paid)}
                </p>
                <div className="mt-2">
                  {timeRangeMetrics.total_sales > 0 ? (
                    <div className="text-sm text-gray-500">
                      {Math.round((timeRangeMetrics.total_paid / timeRangeMetrics.total_sales) * 100)}% of period sales
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500">No payments in this period</div>
                  )}
                </div>
              </div>
              <div className="w-12 h-12 rounded-lg bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </div>

          {/* Pending Payments for Time Range */}
          {!isSalesEngineer && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="w-4 h-4 text-yellow-500" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Pending ({timeRange})
                  </p>
                </div>
                <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400 mt-2">
                  {formatCurrency(timeRangeMetrics.total_pending)}
                </p>
                <div className="flex items-center gap-1 mt-2">
                  <AlertCircle className="w-4 h-4 text-yellow-500" />
                  <span className="text-sm text-yellow-600">
                    {timeRangeMetrics.total_sales > 0 
                      ? `${Math.round((timeRangeMetrics.total_pending / timeRangeMetrics.total_sales) * 100)}% of period sales`
                      : 'No pending amount'}
                  </span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-lg bg-yellow-100 dark:bg-yellow-900/20 flex items-center justify-center">
                <Clock className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
              </div>
            </div>
          </div>
          )}

          {/* Total Invoices for Time Range */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <FileText className="w-4 h-4 text-purple-500" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Invoices ({timeRange})
                  </p>
                </div>
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-2">
                  {timeRangeMetrics.total_invoices}
                </p>
                <div className="mt-2">
                  {timeRangeMetrics.total_invoices > 0 ? (
                    <div className="text-sm text-gray-500">
                      {Math.round(timeRangeMetrics.avg_order_value) > 0 && 
                        `${formatCurrency(timeRangeMetrics.avg_order_value)} avg value`
                      }
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500">No invoices in this period</div>
                  )}
                </div>
              </div>
              <div className="w-12 h-12 rounded-lg bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
                <FileText className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="px-6 py-4 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Trend Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Sales Trend ({getTimeRangeDisplayName(timeRange)})
            </h2>
            <BarChart3 className="w-5 h-5 text-gray-500" />
          </div>
          <div className="h-64">
            {timeRangeData?.sales_data && timeRangeData.sales_data.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={timeRangeData.sales_data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis 
                    dataKey="formattedDate" 
                    stroke="#9CA3AF"
                    fontSize={12}
                  />
                  <YAxis 
                    stroke="#9CA3AF"
                    fontSize={12}
                    tickFormatter={(value: any) => formatShortCurrency(value)}
                  />
                  <Tooltip 
                    formatter={(value: number) => [formatCurrency(value), 'Amount']}
                    labelFormatter={(label: any) => `Date: ${label}`}
                    contentStyle={{
                      backgroundColor: '#1F2937',
                      borderColor: '#374151',
                      borderRadius: '0.5rem',
                      color: 'white'
                    }}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="amount" 
                    name="Sales Amount"
                    stroke="#3B82F6" 
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="invoices" 
                    name="Invoices"
                    stroke="#10B981" 
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500 dark:text-gray-400">No sales data for selected period</p>
                </div>
              </div>
            )}
          </div>
          {timeRangeData?.summary && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
              <div className="text-center">
                <p className="text-sm text-gray-500">Total Sales</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {formatCurrency(timeRangeData.summary.total_sales)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-500">Total Invoices</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {timeRangeData.summary.total_invoices}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-500">Avg Order Value</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {formatCurrency(timeRangeData.summary.avg_order_value)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-500">Best Day</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {timeRangeData.summary.best_day}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Status Distribution Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Status Distribution</h2>
            <FileText className="w-5 h-5 text-gray-500" />
          </div>
          <div className="h-64">
            {timeRangeData?.status_distribution && timeRangeData.status_distribution.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={timeRangeData.status_distribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ status, percent }: any) => `${status}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {timeRangeData.status_distribution.map((entry, index) => {
                      const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];
                      return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                    })}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number, name: string, props: any) => [
                      `${value} invoices (${formatCurrency(props.payload.amount)})`,
                      props.payload.status
                    ]}
                    contentStyle={{
                      backgroundColor: '#1F2937',
                      borderColor: '#374151',
                      borderRadius: '0.5rem',
                      color: 'white'
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500 dark:text-gray-400">No status data available</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* GST Summary - hidden for Sales Engineer */}
      {!isSalesEngineer && (
      <div className="px-6 py-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              GST Summary ({getTimeRangeDisplayName(timeRange)})
            </h2>
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-gray-500" />
              <span className="text-sm text-gray-500">
                Total GST: {formatCurrency(
                  timeRangeMetrics.total_cgst + 
                  timeRangeMetrics.total_sgst + 
                  timeRangeMetrics.total_igst
                )}
              </span>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-blue-600 dark:text-blue-400">CGST</p>
                <div className="text-xs px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-300">
                  {timeRangeMetrics.total_sales > 0 
                    ? `${Math.round((timeRangeMetrics.total_cgst / timeRangeMetrics.total_sales) * 10000) / 100}%`
                    : '0%'}
                </div>
              </div>
              <p className="text-xl font-bold text-blue-700 dark:text-blue-300 mt-1">
                {formatCurrency(timeRangeMetrics.total_cgst)}
              </p>
              <div className="mt-2 h-2 bg-blue-100 dark:bg-blue-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-500 rounded-full"
                  style={{
                    width: timeRangeMetrics.total_sales > 0 
                      ? `${(timeRangeMetrics.total_cgst / timeRangeMetrics.total_sales) * 100}%`
                      : '0%'
                  }}
                ></div>
              </div>
            </div>
            <div className="bg-green-50 dark:bg-green-900/10 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-green-600 dark:text-green-400">SGST</p>
                <div className="text-xs px-2 py-1 rounded-full bg-green-100 dark:bg-green-800 text-green-700 dark:text-green-300">
                  {timeRangeMetrics.total_sales > 0 
                    ? `${Math.round((timeRangeMetrics.total_sgst / timeRangeMetrics.total_sales) * 10000) / 100}%`
                    : '0%'}
                </div>
              </div>
              <p className="text-xl font-bold text-green-700 dark:text-green-300 mt-1">
                {formatCurrency(timeRangeMetrics.total_sgst)}
              </p>
              <div className="mt-2 h-2 bg-green-100 dark:bg-green-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-green-500 rounded-full"
                  style={{
                    width: timeRangeMetrics.total_sales > 0 
                      ? `${(timeRangeMetrics.total_sgst / timeRangeMetrics.total_sales) * 100}%`
                      : '0%'
                  }}
                ></div>
              </div>
            </div>
            <div className="bg-purple-50 dark:bg-purple-900/10 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-purple-600 dark:text-purple-400">IGST</p>
                <div className="text-xs px-2 py-1 rounded-full bg-purple-100 dark:bg-purple-800 text-purple-700 dark:text-purple-300">
                  {timeRangeMetrics.total_sales > 0 
                    ? `${Math.round((timeRangeMetrics.total_igst / timeRangeMetrics.total_sales) * 10000) / 100}%`
                    : '0%'}
                </div>
              </div>
              <p className="text-xl font-bold text-purple-700 dark:text-purple-300 mt-1">
                {formatCurrency(timeRangeMetrics.total_igst)}
              </p>
              <div className="mt-2 h-2 bg-purple-100 dark:bg-purple-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-purple-500 rounded-full"
                  style={{
                    width: timeRangeMetrics.total_sales > 0 
                      ? `${(timeRangeMetrics.total_igst / timeRangeMetrics.total_sales) * 100}%`
                      : '0%'
                  }}
                ></div>
              </div>
            </div>
          </div>
          
          {/* GST Summary for Overall (All Time) */}
          {salesSummary && (
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Overall GST Summary (All Time)</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 dark:bg-blue-900/5 p-3 rounded-lg">
                  <p className="text-xs text-blue-600 dark:text-blue-400">Total CGST</p>
                  <p className="text-lg font-semibold text-blue-700 dark:text-blue-300">
                    {formatCurrency(salesSummary.total_cgst)}
                  </p>
                </div>
                <div className="bg-green-50 dark:bg-green-900/5 p-3 rounded-lg">
                  <p className="text-xs text-green-600 dark:text-green-400">Total SGST</p>
                  <p className="text-lg font-semibold text-green-700 dark:text-green-300">
                    {formatCurrency(salesSummary.total_sgst)}
                  </p>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900/5 p-3 rounded-lg">
                  <p className="text-xs text-purple-600 dark:text-purple-400">Total IGST</p>
                  <p className="text-lg font-semibold text-purple-700 dark:text-purple-300">
                    {formatCurrency(salesSummary.total_igst)}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      )}

      {/* Top Products Chart */}
      <div className="px-6 py-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Top Products ({getTimeRangeDisplayName(timeRange)})
            </h2>
            <Package className="w-5 h-5 text-gray-500" />
          </div>
          <div className="h-64">
            {timeRangeData?.top_products && timeRangeData.top_products.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={timeRangeData.top_products}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis 
                    dataKey="name" 
                    stroke="#9CA3AF"
                    fontSize={12}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis 
                    stroke="#9CA3AF"
                    fontSize={12}
                    tickFormatter={(value: any) => formatShortCurrency(value)}
                  />
                  <Tooltip 
                    formatter={(value: any, name: any) => {
                      if (name === 'revenue') return [formatCurrency(value), 'Revenue'];
                      if (name === 'quantity') return [value, 'Quantity'];
                      return [value, name];
                    }}
                    contentStyle={{
                      backgroundColor: '#1F2937',
                      borderColor: '#374151',
                      borderRadius: '0.5rem',
                      color: 'white'
                    }}
                  />
                  <Legend />
                  <Bar 
                    dataKey="revenue" 
                    name="Revenue" 
                    fill="#3B82F6" 
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar 
                    dataKey="quantity" 
                    name="Quantity" 
                    fill="#10B981" 
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <Package className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500 dark:text-gray-400">No product data available</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="px-6 py-4 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Invoices */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Invoices</h2>
              <Link 
                href="/sales/sales-list"
                className="text-sm text-blue-600 hover:underline dark:text-blue-400"
              >
                View All
              </Link>
            </div>
          </div>
          <div className="p-6">
            {dashboardData?.recent_invoices && dashboardData.recent_invoices.length > 0 ? (
              <div className="space-y-4">
                {dashboardData.recent_invoices.map((invoice) => (
                  <div
                    key={invoice.id}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <Link
                          href={`/sales/${invoice.id}`}
                          className="font-medium text-blue-600 hover:underline dark:text-blue-400"
                        >
                          {invoice.invoice_number}
                        </Link>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(invoice.status)}`}>
                          {getStatusDisplayName(invoice.status)}
                        </span>
                      </div>
                      <div className="mt-1 text-sm text-gray-500">
                        {invoice.customer_name || 'Walk-in Customer'} • {formatDate(invoice.invoice_date)}
                      </div>
                      {invoice.reference_no && (
                        <div className="mt-1 text-xs text-gray-400">
                          Ref: {invoice.reference_no}
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-gray-900 dark:text-white">
                        {formatCurrency(getDisplayAmount(invoice))}
                      </div>
                      <div className="text-sm text-green-600">
                        Paid: {formatCurrency(invoice.amount_paid)}
                      </div>
                      {invoice.balance_due > 0 && (
                        <div className="text-sm text-red-600">
                          Due: {formatCurrency(invoice.balance_due)}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <ShoppingCart className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400">No recent invoices</p>
                <button
                  onClick={() => router.push('/sales/new')}
                  className="mt-3 text-blue-600 hover:underline dark:text-blue-400"
                >
                  Create your first invoice
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Top Customers */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Top Customers</h2>
              <Users className="w-5 h-5 text-gray-500" />
            </div>
          </div>
          <div className="p-6">
            {dashboardData?.top_customers && dashboardData.top_customers.length > 0 ? (
              <div className="space-y-4">
                {dashboardData.top_customers.map((customer, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                        <span className="text-blue-600 dark:text-blue-400 font-medium">
                          {customer.customer_name?.[0]?.toUpperCase() || 'C'}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {customer.customer_name || 'Walk-in Customer'}
                        </p>
                        <p className="text-sm text-gray-500">
                          {customer.invoice_count} invoice{customer.invoice_count !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-gray-900 dark:text-white">
                        {formatCurrency(customer.total_amount)}
                      </p>
                      <div className="w-24 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mt-1">
                        <div 
                          className="h-full bg-green-500 rounded-full"
                          style={{
                            width: dashboardData.top_customers[0]?.total_amount
                              ? `${(customer.total_amount / dashboardData.top_customers[0].total_amount) * 100}%`
                              : '0%'
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400">No customer data</p>
                <button
                  onClick={() => router.push('/sales/new')}
                  className="mt-3 text-blue-600 hover:underline dark:text-blue-400"
                >
                  Create a sale to see customers
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="px-6 py-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button
              onClick={() => router.push('/sales/new')}
              className="flex flex-col items-center justify-center p-4 rounded-lg border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <Plus className="w-8 h-8 text-blue-600 dark:text-blue-400 mb-2" />
              <span className="text-sm font-medium text-gray-900 dark:text-white">New Sale</span>
            </button>
            <button
              onClick={() => router.push('/sales/sales-orders/new')}
              className="flex flex-col items-center justify-center p-4 rounded-lg border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <FileText className="w-8 h-8 text-green-600 dark:text-green-400 mb-2" />
              <span className="text-sm font-medium text-gray-900 dark:text-white">Sales Order</span>
            </button>
            <Link
              href="/sales/proforma-invoices"
              className="flex flex-col items-center justify-center p-4 rounded-lg border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <FileText className="w-8 h-8 text-purple-600 dark:text-purple-400 mb-2" />
              <span className="text-sm font-medium text-gray-900 dark:text-white">Proforma</span>
            </Link>
            <Link
              href="/customers"
              className="flex flex-col items-center justify-center p-4 rounded-lg border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <Users className="w-8 h-8 text-orange-600 dark:text-orange-400 mb-2" />
              <span className="text-sm font-medium text-gray-900 dark:text-white">Customers</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
