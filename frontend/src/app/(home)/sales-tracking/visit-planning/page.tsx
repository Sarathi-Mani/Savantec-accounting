"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Filter,
  Calendar,
  User,
  Building,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  Plus,
  Edit,
  Trash2,
  MapPin,
  Navigation,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:6768";

interface VisitPlan {
  id: string;
  visit_date: string;
  engineer_id: string;
  engineer_name: string;
  customer_id: string | null;
  customer_name: string | null;
  enquiry_id: string | null;
  enquiry_number: string | null;
  purpose: string;
  notes: string | null;
  planned_start_time: string | null;
  planned_end_time: string | null;
  planned_duration_hours: number | null;
  status: string;
  priority: string;
  actual_visit_id: string | null;
}

export default function VisitPlanningPage() {
  const router = useRouter();
  const [visitPlans, setVisitPlans] = useState<VisitPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [date, setDate] = useState<string>(() => new Date().toISOString().split("T")[0]);
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [engineerFilter, setEngineerFilter] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [engineers, setEngineers] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [enquiries, setEnquiries] = useState<any[]>([]);

  const companyId = typeof window !== "undefined" ? localStorage.getItem("company_id") : null;

  useEffect(() => {
    if (companyId) {
      fetchVisitPlans();
      fetchEngineers();
      fetchCustomers();
      fetchEnquiries();
    }
  }, [companyId]);

  useEffect(() => {
    if (companyId) {
      fetchVisitPlans();
    }
  }, [date, statusFilter, priorityFilter, engineerFilter]);

  const fetchEngineers = async () => {
    try {
      const response = await fetch(
        `${API_BASE}/api/companies/${companyId}/employees`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          },
        }
      );
      if (response.ok) {
        const data = await response.json();
        setEngineers(data);
      }
    } catch (err) {
      console.error("Failed to fetch engineers:", err);
    }
  };

  const fetchCustomers = async () => {
    try {
      const response = await fetch(
        `${API_BASE}/api/companies/${companyId}/customers`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          },
        }
      );
      if (response.ok) {
        const data = await response.json();
        setCustomers(data);
      }
    } catch (err) {
      console.error("Failed to fetch customers:", err);
    }
  };

  const fetchEnquiries = async () => {
    try {
      const response = await fetch(
        `${API_BASE}/api/companies/${companyId}/enquiries`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          },
        }
      );
      if (response.ok) {
        const data = await response.json();
        setEnquiries(data);
      }
    } catch (err) {
      console.error("Failed to fetch enquiries:", err);
    }
  };

  const fetchVisitPlans = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        date: date,
      });
      if (statusFilter) params.append("status", statusFilter);
      if (priorityFilter) params.append("priority", priorityFilter);
      if (engineerFilter) params.append("engineer_id", engineerFilter);
      if (search) params.append("search", search);

      const response = await fetch(
        `${API_BASE}/api/companies/${companyId}/engineers/${engineerFilter || "all"}/visit-plans?${params}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          },
        }
      );

      if (!response.ok) throw new Error("Failed to fetch visit plans");
      const data = await response.json();
      setVisitPlans(data);
    } catch (err) {
      console.error("Failed to load visit plans:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateVisitPlan = () => {
    router.push("/sales-tracking/visit-planning/new");
  };

  const handleEditVisitPlan = (id: string) => {
    router.push(`/sales-tracking/visit-planning/${id}/edit`);
  };

  const handleDeleteVisitPlan = async (id: string) => {
    if (confirm("Are you sure you want to delete this visit plan?")) {
      try {
        const response = await fetch(
          `${API_BASE}/api/companies/${companyId}/visit-plans/${id}`,
          {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${localStorage.getItem("access_token")}`,
            },
          }
        );

        if (response.ok) {
          alert("Visit plan deleted successfully!");
          fetchVisitPlans();
        }
      } catch (err) {
        alert("Failed to delete visit plan");
        console.error(err);
      }
    }
  };

  const handleStartVisit = (visitPlan: VisitPlan) => {
    // Navigate to start trip page with visit plan data
    router.push(`/sales-tracking/trips/new?visit_plan_id=${visitPlan.id}`);
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "planned":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
      case "in_progress":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
      case "completed":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "cancelled":
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
    }
  };

  const getPriorityBadgeClass = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      case "medium":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
      case "low":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
    }
  };

  if (!companyId) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 dark:bg-yellow-900/20 dark:border-yellow-800">
          <p className="text-yellow-800 dark:text-yellow-400">Please select a company first.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Visit Planning
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Plan and schedule engineer visits
            </p>
          </div>
          <button
            onClick={handleCreateVisitPlan}
            className="px-4 py-2 transition bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Plan Visit
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="px-6 py-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search purpose, customer, engineer..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && fetchVisitPlans()}
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors flex items-center gap-2"
            >
              <Filter className="w-5 h-5" />
              Filters
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="">All Status</option>
                <option value="planned">Planned</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Priority
              </label>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="">All Priorities</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Engineer
              </label>
              <select
                value={engineerFilter}
                onChange={(e) => setEngineerFilter(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="">All Engineers</option>
                {engineers.map((engineer) => (
                  <option key={engineer.id} value={engineer.id}>
                    {engineer.first_name} {engineer.last_name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Visit Plans Grid */}
      <div className="p-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
          </div>
        ) : visitPlans.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center">
            <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No Visit Plans Found
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              {date ? `No visit plans scheduled for ${date}` : "Start planning your first visit"}
            </p>
            <button
              onClick={handleCreateVisitPlan}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg"
            >
              Create Visit Plan
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {visitPlans.map((plan) => (
              <div
                key={plan.id}
                className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                      {plan.purpose}
                    </h3>
                    <div className="flex items-center gap-2 mt-2">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(
                          plan.status
                        )}`}
                      >
                        {plan.status === "planned" && <Clock className="w-3 h-3" />}
                        {plan.status === "in_progress" && <Navigation className="w-3 h-3" />}
                        {plan.status === "completed" && <CheckCircle className="w-3 h-3" />}
                        {plan.status === "cancelled" && <XCircle className="w-3 h-3" />}
                        {plan.status.replace("_", " ")}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityBadgeClass(
                          plan.priority
                        )}`}
                      >
                        {plan.priority}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEditVisitPlan(plan.id)}
                      className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-50 dark:hover:text-gray-300 dark:hover:bg-gray-700/50"
                      title="Edit"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteVisitPlan(plan.id)}
                      className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:text-red-400 dark:hover:bg-red-900/20"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <User className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600 dark:text-gray-400">Engineer:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {plan.engineer_name}
                    </span>
                  </div>

                  {plan.customer_name && (
                    <div className="flex items-center gap-2 text-sm">
                      <Building className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-600 dark:text-gray-400">Customer:</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {plan.customer_name}
                      </span>
                    </div>
                  )}

                  {plan.enquiry_number && (
                    <div className="flex items-center gap-2 text-sm">
                      <AlertCircle className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-600 dark:text-gray-400">Enquiry:</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {plan.enquiry_number}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600 dark:text-gray-400">Date:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {new Date(plan.visit_date).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </div>

                  {plan.planned_start_time && (
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-600 dark:text-gray-400">Time:</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {new Date(plan.planned_start_time).toLocaleTimeString("en-IN", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                        {plan.planned_end_time &&
                          ` - ${new Date(plan.planned_end_time).toLocaleTimeString("en-IN", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}`}
                      </span>
                    </div>
                  )}

                  {plan.notes && (
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                      <p className="line-clamp-2">{plan.notes}</p>
                    </div>
                  )}
                </div>

                <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    {plan.status === "planned" && (
                      <button
                        onClick={() => handleStartVisit(plan)}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium flex items-center gap-2"
                      >
                        <Navigation className="w-4 h-4" />
                        Start Visit
                      </button>
                    )}
                    {plan.actual_visit_id && (
                      <button
                        onClick={() => router.push(`/sales-tracking/visits/${plan.actual_visit_id}`)}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
                      >
                        View Visit
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}