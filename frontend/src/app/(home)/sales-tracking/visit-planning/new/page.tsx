"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Calendar,
  Clock,
  User,
  Building,
  AlertCircle,
  Target,
  FileText,
  Save,
  X,
  Plus,
  Search,
} from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:6768";

export default function NewVisitPlanPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [engineers, setEngineers] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [enquiries, setEnquiries] = useState<any[]>([]);
  const [filteredEnquiries, setFilteredEnquiries] = useState<any[]>([]);
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);
  const [showEnquirySearch, setShowEnquirySearch] = useState(false);
  
  const [formData, setFormData] = useState({
    visit_date: "",
    engineer_id: "",
    customer_id: "",
    customer_name: "",
    enquiry_id: "",
    purpose: "",
    notes: "",
    planned_start_time: "",
    planned_end_time: "",
    priority: "medium",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const companyId = typeof window !== "undefined" ? localStorage.getItem("company_id") : null;

  useEffect(() => {
    if (companyId) {
      fetchEngineers();
      fetchCustomers();
      fetchEnquiries();
      
      // Set default date to today
      const today = new Date().toISOString().split('T')[0];
      setFormData(prev => ({ ...prev, visit_date: today }));
    }
  }, [companyId]);

  const fetchEngineers = async () => {
    try {
      const response = await fetch(
        `${API_BASE}/api/companies/${companyId}/employees`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("employee_token") || localStorage.getItem("access_token")}`,
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
            Authorization: `Bearer ${localStorage.getItem("employee_token") || localStorage.getItem("access_token")}`,
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
        `${API_BASE}/api/companies/${companyId}/enquiries?status=pending`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("employee_token") || localStorage.getItem("access_token")}`,
          },
        }
      );
      if (response.ok) {
        const data = await response.json();
        setEnquiries(data);
        setFilteredEnquiries(data);
      }
    } catch (err) {
      console.error("Failed to fetch enquiries:", err);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: "" }));
    }
  };

  const handleCustomerSelect = (customerId: string, customerName: string) => {
    setFormData(prev => ({ 
      ...prev, 
      customer_id: customerId,
      customer_name: customerName
    }));
    setShowCustomerSearch(false);
  };

  const handleEnquirySelect = (enquiryId: string, enquiryNumber: string, customerName: string) => {
    const selectedEnquiry = enquiries.find(e => e.id === enquiryId);
    setFormData(prev => ({ 
      ...prev, 
      enquiry_id: enquiryId,
      customer_id: selectedEnquiry?.customer_id || "",
      customer_name: customerName,
      purpose: `Follow up on enquiry ${enquiryNumber}`,
      notes: selectedEnquiry?.description || ""
    }));
    setShowEnquirySearch(false);
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.visit_date) {
      newErrors.visit_date = "Please select a visit date";
    }
    
    if (!formData.engineer_id) {
      newErrors.engineer_id = "Please select an engineer";
    }
    
    if (!formData.purpose) {
      newErrors.purpose = "Please enter the purpose of visit";
    }
    
    if (formData.planned_start_time && formData.planned_end_time) {
      const startTime = new Date(`2000-01-01T${formData.planned_start_time}`);
      const endTime = new Date(`2000-01-01T${formData.planned_end_time}`);
      
      if (endTime <= startTime) {
        newErrors.planned_end_time = "End time must be after start time";
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const visitPlanData = {
        visit_date: formData.visit_date,
        engineer_id: formData.engineer_id,
        customer_id: formData.customer_id || null,
        enquiry_id: formData.enquiry_id || null,
        purpose: formData.purpose,
        notes: formData.notes || null,
        planned_start_time: formData.planned_start_time ? 
          new Date(`${formData.visit_date}T${formData.planned_start_time}`).toISOString() : null,
        planned_end_time: formData.planned_end_time ? 
          new Date(`${formData.visit_date}T${formData.planned_end_time}`).toISOString() : null,
        priority: formData.priority,
      };

      const response = await fetch(
        `${API_BASE}/api/companies/${companyId}/visit-plans`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("employee_token") || localStorage.getItem("access_token")}`,
          },
          body: JSON.stringify(visitPlanData),
        }
      );

      if (response.ok) {
        const result = await response.json();
        alert("Visit plan created successfully!");
        router.push("/sales-tracking/visit-planning");
      } else {
        const error = await response.json();
        throw new Error(error.detail || "Failed to create visit plan");
      }
    } catch (err: any) {
      alert(err.message || "Failed to create visit plan");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    const today = new Date().toISOString().split('T')[0];
    setFormData({
      visit_date: today,
      engineer_id: "",
      customer_id: "",
      customer_name: "",
      enquiry_id: "",
      purpose: "",
      notes: "",
      planned_start_time: "",
      planned_end_time: "",
      priority: "medium",
    });
    setErrors({});
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
              New Visit Plan
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Schedule a new engineer visit
            </p>
          </div>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors flex items-center gap-2"
          >
            <X className="w-5 h-5" />
            Cancel
          </button>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Visit Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Visit Date
                </label>
                <input
                  type="date"
                  name="visit_date"
                  value={formData.visit_date}
                  onChange={handleChange}
                  className={`w-full px-4 py-2 rounded-lg border ${
                    errors.visit_date
                      ? "border-red-300 dark:border-red-700"
                      : "border-gray-300 dark:border-gray-600"
                  } bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent`}
                />
                {errors.visit_date && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.visit_date}
                  </p>
                )}
              </div>

              {/* Engineer */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Engineer
                </label>
                <select
                  name="engineer_id"
                  value={formData.engineer_id}
                  onChange={handleChange}
                  className={`w-full px-4 py-2 rounded-lg border ${
                    errors.engineer_id
                      ? "border-red-300 dark:border-red-700"
                      : "border-gray-300 dark:border-gray-600"
                  } bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent`}
                >
                  <option value="">Select Engineer</option>
                  {engineers.map((engineer) => (
                    <option key={engineer.id} value={engineer.id}>
                      {engineer.first_name} {engineer.last_name}
                    </option>
                  ))}
                </select>
                {errors.engineer_id && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.engineer_id}
                  </p>
                )}
              </div>

              {/* Customer Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                  <Building className="w-4 h-4" />
                  Customer (Optional)
                </label>
                <div className="relative">
                  <div
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white cursor-pointer flex items-center justify-between"
                    onClick={() => setShowCustomerSearch(!showCustomerSearch)}
                  >
                    <span className={formData.customer_name ? "text-gray-900 dark:text-white" : "text-gray-400"}>
                      {formData.customer_name || "Select customer..."}
                    </span>
                    <Search className="w-4 h-4 text-gray-400" />
                  </div>
                  
                  {showCustomerSearch && (
                    <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      <div className="p-2 border-b border-gray-200 dark:border-gray-700">
                        <input
                          type="text"
                          placeholder="Search customers..."
                          className="w-full px-3 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700"
                          onChange={(e) => {
                            const searchTerm = e.target.value.toLowerCase();
                            // Filter customers in real app
                          }}
                        />
                      </div>
                      <div className="py-1">
                        {customers.map((customer) => (
                          <div
                            key={customer.id}
                            className="px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                            onClick={() => handleCustomerSelect(customer.id, customer.name)}
                          >
                            <div className="font-medium text-gray-900 dark:text-white">
                              {customer.name}
                            </div>
                            {customer.city && (
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {customer.city}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Enquiry Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  Link to Enquiry (Optional)
                </label>
                <div className="relative">
                  <div
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white cursor-pointer flex items-center justify-between"
                    onClick={() => setShowEnquirySearch(!showEnquirySearch)}
                  >
                    <span className={formData.enquiry_id ? "text-gray-900 dark:text-white" : "text-gray-400"}>
                      {formData.enquiry_id ? `Enquiry selected` : "Link to enquiry..."}
                    </span>
                    <Search className="w-4 h-4 text-gray-400" />
                  </div>
                  
                  {showEnquirySearch && (
                    <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      <div className="p-2 border-b border-gray-200 dark:border-gray-700">
                        <input
                          type="text"
                          placeholder="Search enquiries..."
                          className="w-full px-3 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700"
                        />
                      </div>
                      <div className="py-1">
                        {filteredEnquiries.map((enquiry) => (
                          <div
                            key={enquiry.id}
                            className="px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                            onClick={() => handleEnquirySelect(
                              enquiry.id, 
                              enquiry.enquiry_number,
                              enquiry.customer_name || enquiry.prospect_company || "Customer"
                            )}
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <div className="font-medium text-gray-900 dark:text-white">
                                  {enquiry.enquiry_number}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                  {enquiry.customer_name || enquiry.prospect_company || "No customer"}
                                </div>
                              </div>
                              <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                                {enquiry.status}
                              </span>
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-400 mt-1 truncate">
                              {enquiry.subject}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Purpose */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  Purpose of Visit *
                </label>
                <input
                  type="text"
                  name="purpose"
                  value={formData.purpose}
                  onChange={handleChange}
                  placeholder="e.g., Product demonstration, Follow up meeting, Service call..."
                  className={`w-full px-4 py-2 rounded-lg border ${
                    errors.purpose
                      ? "border-red-300 dark:border-red-700"
                      : "border-gray-300 dark:border-gray-600"
                  } bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent`}
                />
                {errors.purpose && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.purpose}
                  </p>
                )}
              </div>

              {/* Planned Time */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Planned Start Time (Optional)
                </label>
                <input
                  type="time"
                  name="planned_start_time"
                  value={formData.planned_start_time}
                  onChange={handleChange}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Planned End Time (Optional)
                </label>
                <input
                  type="time"
                  name="planned_end_time"
                  value={formData.planned_end_time}
                  onChange={handleChange}
                  className={`w-full px-4 py-2 rounded-lg border ${
                    errors.planned_end_time
                      ? "border-red-300 dark:border-red-700"
                      : "border-gray-300 dark:border-gray-600"
                  } bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent`}
                />
                {errors.planned_end_time && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.planned_end_time}
                  </p>
                )}
              </div>

              {/* Priority */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Priority
                </label>
                <select
                  name="priority"
                  value={formData.priority}
                  onChange={handleChange}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>

              {/* Notes */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Notes (Optional)
                </label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  rows={4}
                  placeholder="Any additional notes, specific requirements, or contact information..."
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                />
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex items-center justify-between pt-6 mt-6 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={handleReset}
                className="px-6 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
              >
                Reset
              </button>
              
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="px-6 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                      Creating...
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      Create Visit Plan
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Help Information */}
        <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-300 mb-2">
            About Visit Planning
          </h3>
          <ul className="space-y-2 text-sm text-blue-700 dark:text-blue-400">
            <li className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>Visit plans help organize and schedule engineer visits efficiently</span>
            </li>
            <li className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>Linked enquiries will automatically populate customer information</span>
            </li>
            <li className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>High priority visits will be highlighted for urgent attention</span>
            </li>
            <li className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>Once created, engineers can start trips directly from visit plans</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}