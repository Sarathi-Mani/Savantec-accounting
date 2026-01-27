"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { dashboardApi, invoicesApi } from "@/services/api";
import Link from "next/link";
import { useEffect, useState } from "react";
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
} from "lucide-react";

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

export default function SalesDashboardPage() {
  const router = useRouter();
  const { company } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [salesSummary, setSalesSummary] = useState<SalesSummary | null>(null);
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month' | 'year'>('month');

  // Format currency
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
    });
  };

  // Get status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'draft': return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
      case 'partially_paid': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'cancelled': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  // Fetch dashboard data
  const fetchDashboardData = async () => {
    if (!company?.id) return;

    try {
      setLoading(true);
      
      // Fetch dashboard summary
      const dashboardResponse = await dashboardApi.getSummary(company.id);
      setDashboardData(dashboardResponse as any);

      // Fetch invoice summary using invoices API
      const invoiceResponse = await invoicesApi.list(company.id, {
        page: 1,
        page_size: 1000, // Get all invoices for summary
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
        
        totalRevenue += invoice.total_amount || 0;
        totalPaid += invoice.amount_paid || 0;
        totalPending += invoice.balance_due || 0;
        
        // Calculate GST totals
        totalCgst += invoice.cgst_amount || 0;
        totalSgst += invoice.sgst_amount || 0;
        totalIgst += invoice.igst_amount || 0;

        if (isCurrentMonth) {
          currentMonthRevenue += invoice.total_amount || 0;
          currentMonthInvoices++;
        }

        // Check if overdue (assuming pending/partially_paid invoices with due_date in past)
        if (invoice.due_date && 
            ['pending', 'partially_paid'].includes(invoice.status) &&
            new Date(invoice.due_date) < now) {
          overdueCount++;
          overdueAmount += invoice.balance_due || 0;
        }
      });

      setSalesSummary({
        total_invoices: invoiceResponse.total_invoices || invoices.length,
        total_revenue: totalRevenue,
        total_paid: totalPaid,
        total_pending: totalPending,
        overdue_count: overdueCount,
        overdue_amount: overdueAmount,
        current_month_revenue: currentMonthRevenue,
        current_month_invoices: currentMonthInvoices,
        total_cgst: totalCgst,
        total_sgst: totalSgst,
        total_igst: totalIgst,
      });

    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Handle refresh
  const handleRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  // Initial data fetch
  useEffect(() => {
    if (company?.id) {
      fetchDashboardData();
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
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
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
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-gray-500" />
          <div className="flex bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700 p-1">
            {['today', 'week', 'month', 'year'].map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range as any)}
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
      </div>

      {/* Key Metrics */}
      <div className="px-6 py-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Total Revenue */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Revenue</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                  {formatCurrency(salesSummary?.total_revenue || 0)}
                </p>
                <div className="flex items-center gap-1 mt-2">
                  <TrendingUp className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-green-600">
                    {dashboardData?.monthly_sales ? 
                      `₹${Math.round(dashboardData.monthly_sales).toLocaleString()} this month` : 
                      'Loading...'}
                  </span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>

          {/* Total Paid */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Paid</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-2">
                  {formatCurrency(salesSummary?.total_paid || 0)}
                </p>
                <div className="mt-2 text-sm text-gray-500">
                  {dashboardData?.total_paid ? 
                    `${Math.round((dashboardData.total_paid / dashboardData.total_sales) * 100)}% of total` : 
                    'Loading...'}
                </div>
              </div>
              <div className="w-12 h-12 rounded-lg bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </div>

          {/* Pending Payments */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Pending Payments</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-2">
                  {formatCurrency(salesSummary?.total_pending || 0)}
                </p>
                <div className="flex items-center gap-1 mt-2">
                  <AlertCircle className="w-4 h-4 text-red-500" />
                  <span className="text-sm text-red-600">
                    {salesSummary?.overdue_count ? `${salesSummary.overdue_count} overdue` : 'No overdue'}
                  </span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-lg bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
            </div>
          </div>

          {/* Total Invoices */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Invoices</p>
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-2">
                  {salesSummary?.total_invoices?.toLocaleString() || 0}
                </p>
                <div className="mt-2 text-sm text-gray-500">
                  {salesSummary?.current_month_invoices ? 
                    `${salesSummary.current_month_invoices} this month` : 
                    'Loading...'}
                </div>
              </div>
              <div className="w-12 h-12 rounded-lg bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
                <FileText className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* GST Summary */}
      <div className="px-6 py-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">GST Summary</h2>
            <BarChart3 className="w-5 h-5 text-gray-500" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-lg">
              <p className="text-sm text-blue-600 dark:text-blue-400">CGST</p>
              <p className="text-xl font-bold text-blue-700 dark:text-blue-300 mt-1">
                {formatCurrency(salesSummary?.total_cgst || 0)}
              </p>
            </div>
            <div className="bg-green-50 dark:bg-green-900/10 p-4 rounded-lg">
              <p className="text-sm text-green-600 dark:text-green-400">SGST</p>
              <p className="text-xl font-bold text-green-700 dark:text-green-300 mt-1">
                {formatCurrency(salesSummary?.total_sgst || 0)}
              </p>
            </div>
            <div className="bg-purple-50 dark:bg-purple-900/10 p-4 rounded-lg">
              <p className="text-sm text-purple-600 dark:text-purple-400">IGST</p>
              <p className="text-xl font-bold text-purple-700 dark:text-purple-300 mt-1">
                {formatCurrency(salesSummary?.total_igst || 0)}
              </p>
            </div>
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
                          {invoice.status === 'partially_paid' ? 'Partially Paid' : 
                           invoice.status === 'pending' ? 'Pending' : 
                           invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
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
                        {formatCurrency(invoice.total_amount)}
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
                            width: `${(customer.total_amount / (dashboardData.top_customers[0]?.total_amount || 1)) * 100}%`
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