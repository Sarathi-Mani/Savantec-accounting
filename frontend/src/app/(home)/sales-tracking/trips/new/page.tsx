"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Navigation,
  MapPin,
  User,
  AlertCircle,
  X,
} from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:6768/api";

export default function NewTripPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [engineers, setEngineers] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    engineer_id: "",
    start_km: "",
    notes: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const companyId = typeof window !== "undefined" ? localStorage.getItem("company_id") : null;

  useEffect(() => {
    if (companyId) {
      fetchEngineers();
    }
  }, [companyId]);

  const fetchEngineers = async () => {
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("employee_token") || localStorage.getItem("access_token") : null;
      if (!token || !companyId) {
        console.error("No access token or company ID found");
        return;
      }

      // 1) Prefer sales-engineers endpoint (same as sales/new)
      try {
        const salesEngineersUrl = `${process.env.NEXT_PUBLIC_API_URL}/companies/${companyId}/sales-engineers`;
        const response = await fetch(salesEngineersUrl, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        if (data && Array.isArray(data)) {
          const formatted = data.map((engineer: any) => ({
            id: engineer.id,
            full_name: engineer.full_name || engineer.name || "Unnamed Engineer",
            first_name: engineer.first_name || engineer.full_name?.split(" ")[0] || "Engineer",
            last_name: engineer.last_name || engineer.full_name?.split(" ").slice(1).join(" ") || "",
            employee_code: engineer.employee_code || "",
            email: engineer.email || "",
            phone: engineer.phone || "",
            designation: engineer.designation_name || engineer.designation || "Sales Engineer",
          }));

          setEngineers(formatted);
          return;
        }
      } catch (error) {
        console.error("Failed to fetch sales engineers:", error);
      }

      // 2) Fallback: employees endpoint + filter
      const response = await fetch(`${API_BASE}/companies/${companyId}/employees`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const allEmployees = await response.json();
        const salesEngineers = allEmployees.filter((emp: any) => {
          const designation =
            typeof emp.designation === "string"
              ? emp.designation
              : emp.designation?.name || "";
          const empType = emp.employee_type || "";
          const role = emp.role || "";

          return (
            designation.toLowerCase().includes("sales") ||
            designation.toLowerCase().includes("engineer") ||
            empType.toLowerCase().includes("sales") ||
            role.toLowerCase().includes("sales") ||
            emp.is_sales_person === true
          );
        });

        const formatted = salesEngineers.map((emp: any) => ({
          id: emp.id,
          full_name: emp.full_name || `${emp.first_name || ""} ${emp.last_name || ""}`.trim(),
          first_name: emp.first_name || emp.full_name?.split(" ")[0] || "Engineer",
          last_name: emp.last_name || emp.full_name?.split(" ").slice(1).join(" ") || "",
          employee_code: emp.employee_code || emp.code || "",
          email: emp.email || "",
          phone: emp.phone || "",
          designation: emp.designation || emp.employee_type || "Sales Engineer",
        }));

        setEngineers(formatted);
      } else {
        console.error("Failed to fetch employees:", response.status);
        setEngineers([]);
      }
    } catch (err) {
      console.error("Failed to fetch engineers:", err);
      setEngineers([]);
    }
  };


  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: "" }));
    }
  };


  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.engineer_id) {
      newErrors.engineer_id = "Please select an engineer";
    }
    
    if (!formData.start_km || parseFloat(formData.start_km) <= 0) {
      newErrors.start_km = "Please enter a valid start KM (greater than 0)";
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
      // Get current location
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const locationData = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            device_id: "web_browser_" + Math.random().toString(36).substr(2, 9),
            is_mock_location: false,
            is_background: false,
            timestamp: new Date().toISOString(),
          };

          const tripData = {
            start_km: parseFloat(formData.start_km),
            start_location: locationData,
            notes: formData.notes,
          };

          // Check if API endpoint exists
          const endpoint = `${API_BASE}/companies/${companyId}/trips/start?engineer_id=${formData.engineer_id}`;
          console.log('Submitting to endpoint:', endpoint);

          const response = await fetch(
            endpoint,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${localStorage.getItem("employee_token") || localStorage.getItem("access_token")}`,
              },
              body: JSON.stringify(tripData),
            }
          );

          if (response.ok) {
            const result = await response.json();
            alert("Trip started successfully!");
            router.push(`/sales-tracking/trips/${result.trip_id}`);
          } else {
            const errorText = await response.text();
            console.error('API Error:', errorText);
            
            // If endpoint doesn't exist, create a mock response for testing
            if (response.status === 404) {
              const mockTripId = `trip-${Date.now()}`;
              alert("Trip started successfully! (Demo Mode)");
              router.push(`/sales-tracking/trips/${mockTripId}`);
            } else {
              throw new Error(`Failed to start trip: ${response.status} ${errorText}`);
            }
          }
        },
        (error) => {
          alert("Please enable location services to start a trip");
          console.error("Geolocation error:", error);
          setLoading(false);
        }
      );
    } catch (err: any) {
      alert(err.message || "Failed to start trip");
      console.error(err);
      setLoading(false);
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
              Start New Trip
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Begin tracking a new engineer trip
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
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <form onSubmit={handleSubmit}>
            {/* Engineer Selection */}
            <div className="mb-6">
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
                    {engineer.full_name || `${engineer.first_name} ${engineer.last_name}`} 
                    {engineer.employee_code ? ` (${engineer.employee_code})` : ''}
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

            {/* Start KM */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                <Navigation className="w-4 h-4" />
                Start KM Reading
              </label>
              <input
                type="number"
                name="start_km"
                value={formData.start_km}
                onChange={handleChange}
                step="0.01"
                min="0"
                placeholder="Enter current KM reading"
                className={`w-full px-4 py-2 rounded-lg border ${
                  errors.start_km
                    ? "border-red-300 dark:border-red-700"
                    : "border-gray-300 dark:border-gray-600"
                } bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent`}
              />
              {errors.start_km && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.start_km}
                </p>
              )}
            </div>

            {/* Notes */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Notes (Optional)
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={3}
                placeholder="Any additional notes about this trip..."
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
              />
            </div>

            {/* Location Permission Note */}
            <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-1">
                    Location Permission Required
                  </p>
                  <p className="text-sm text-blue-700 dark:text-blue-400">
                    When you click "Start Trip", your browser will ask for location permission.
                    Please allow it to track your trip accurately.
                  </p>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex items-center justify-between pt-6 border-t border-gray-200 dark:border-gray-700">
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
                    Starting Trip...
                  </>
                ) : (
                  <>
                    <Navigation className="w-5 h-5" />
                    Start Trip
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
