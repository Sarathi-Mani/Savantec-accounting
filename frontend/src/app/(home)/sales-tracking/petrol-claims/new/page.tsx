"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  DollarSign,
  Navigation,
  Calendar,
  User,
  AlertCircle,
  Save,
  X,
  Search,
} from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:6768";

interface Trip {
  id: string;
  trip_number: string;
  engineer_id: string;
  engineer_name: string;
  start_time: string;
  end_time: string;
  system_distance_km: number;
  is_valid: boolean;
  has_fraud_flag: boolean;
}

export default function NewPetrolClaimPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [filteredTrips, setFilteredTrips] = useState<Trip[]>([]);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [ratePerKm, setRatePerKm] = useState<number>(10);

  const companyId = typeof window !== "undefined" ? localStorage.getItem("company_id") : null;

  useEffect(() => {
    if (companyId) {
      fetchTrips();
      // Fetch company petrol rate from settings
      fetchPetrolRate();
    }
  }, [companyId]);

  const fetchTrips = async () => {
    try {
      setSearching(true);
      const params = new URLSearchParams({
        status: "completed",
        is_valid: "true",
      });

      const response = await fetch(
        `${API_BASE}/api/companies/${companyId}/trips?${params}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("employee_token") || localStorage.getItem("access_token")}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setTrips(data);
        setFilteredTrips(data);
      }
    } catch (err) {
      console.error("Failed to fetch trips:", err);
    } finally {
      setSearching(false);
    }
  };

  const fetchPetrolRate = async () => {
    // In a real app, fetch from company settings
    // For now, use default 10
    setRatePerKm(10);
  };

  useEffect(() => {
    if (searchTerm) {
      const filtered = trips.filter(
        trip =>
          trip.trip_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
          trip.engineer_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredTrips(filtered);
    } else {
      setFilteredTrips(trips);
    }
  }, [searchTerm, trips]);

  const handleTripSelect = (trip: Trip) => {
    setSelectedTrip(trip);
  };

  const handleSubmit = async () => {
    if (!selectedTrip) {
      alert("Please select a trip to claim petrol for");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `${API_BASE}/api/companies/${companyId}/petrol-claims?trip_id=${selectedTrip.id}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("employee_token") || localStorage.getItem("access_token")}`,
          },
        }
      );

      if (response.ok) {
        const result = await response.json();
        alert("Petrol claim created successfully!");
        router.push(`/sales-tracking/petrol-claims/${result.claim_id}`);
      } else {
        const error = await response.json();
        throw new Error(error.detail || "Failed to create claim");
      }
    } catch (err: any) {
      alert(err.message || "Failed to create petrol claim");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const calculateClaimAmount = () => {
    if (!selectedTrip) return 0;
    return selectedTrip.system_distance_km * ratePerKm;
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
              New Petrol Claim
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Create petrol claim for completed trips
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

      <div className="max-w-4xl mx-auto p-6">
        {/* Rate Info */}
        <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-800 dark:text-blue-300">
                Current Petrol Rate: ₹{ratePerKm} per KM
              </p>
              <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">
                Claims are automatically calculated based on validated trip distance
              </p>
            </div>
            <DollarSign className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          </div>
        </div>

        {/* Trip Selection */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Select Trip for Claim
          </h2>

          {/* Search */}
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search trips by number or engineer..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Trips List */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg max-h-96 overflow-y-auto">
            {searching ? (
              <div className="p-8 text-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent mx-auto"></div>
                <p className="text-gray-500 dark:text-gray-400 mt-2">Loading trips...</p>
              </div>
            ) : filteredTrips.length === 0 ? (
              <div className="p-8 text-center">
                <Navigation className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500 dark:text-gray-400">
                  {searchTerm ? "No trips found matching your search" : "No valid trips available for claim"}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredTrips.map((trip) => (
                  <div
                    key={trip.id}
                    className={`p-4 cursor-pointer transition-colors ${
                      selectedTrip?.id === trip.id
                        ? "bg-indigo-50 dark:bg-indigo-900/20"
                        : "hover:bg-gray-50 dark:hover:bg-gray-700/50"
                    }`}
                    onClick={() => handleTripSelect(trip)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-3 h-3 rounded-full ${
                              selectedTrip?.id === trip.id
                                ? "bg-indigo-500"
                                : "border border-gray-300 dark:border-gray-600"
                            }`}
                          />
                          <div>
                            <h3 className="font-medium text-gray-900 dark:text-white">
                              {trip.trip_number}
                            </h3>
                            <div className="flex items-center gap-4 mt-2 text-sm text-gray-600 dark:text-gray-400">
                              <div className="flex items-center gap-1">
                                <User className="w-4 h-4" />
                                {trip.engineer_name}
                              </div>
                              <div className="flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                {new Date(trip.start_time).toLocaleDateString()}
                              </div>
                              <div className="flex items-center gap-1">
                                <Navigation className="w-4 h-4" />
                                {trip.system_distance_km.toFixed(2)} km
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-semibold text-gray-900 dark:text-white">
                          ₹{(trip.system_distance_km * ratePerKm).toFixed(2)}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          Claim amount
                        </div>
                      </div>
                    </div>
                    {trip.has_fraud_flag && (
                      <div className="mt-2 flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
                        <AlertCircle className="w-4 h-4" />
                        This trip has fraud flags. Claim may be rejected.
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Selected Trip Details */}
        {selectedTrip && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Claim Details
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                  Trip Information
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Trip Number:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {selectedTrip.trip_number}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Engineer:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {selectedTrip.engineer_name}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Trip Date:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {new Date(selectedTrip.start_time).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                  Claim Calculation
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Distance:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {selectedTrip.system_distance_km.toFixed(2)} km
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Rate per KM:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      ₹{ratePerKm}
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-t border-gray-200 dark:border-gray-700 pt-3">
                    <span className="text-lg font-semibold text-gray-900 dark:text-white">
                      Total Claim:
                    </span>
                    <span className="text-2xl font-bold text-green-600 dark:text-green-400">
                      ₹{calculateClaimAmount().toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {selectedTrip.has_fraud_flag && (
              <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-red-800 dark:text-red-300 mb-1">
                      Fraud Alert
                    </p>
                    <p className="text-sm text-red-700 dark:text-red-400">
                      This trip has fraud flags. The claim may be rejected or require manual review.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Submit Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Ready to Submit
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {selectedTrip
                  ? "Review the details and submit your claim"
                  : "Select a trip to proceed"}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.back()}
                className="px-6 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!selectedTrip || loading}
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                    Submitting...
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    Submit Claim
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}