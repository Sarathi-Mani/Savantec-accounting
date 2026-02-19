"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  MapPin,
  Users,
  Navigation,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  Play,
  Pause,
  RefreshCw,
  Filter,
  Download,
  Printer,
  ZoomIn,
  ZoomOut,
  Layers,
  Settings,
} from "lucide-react";
import dynamic from "next/dynamic";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:6768/api";

// Dynamically import Map component
const Map = dynamic(() => import("@/components/map/MapComponent"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center bg-gray-100 dark:bg-gray-800">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
    </div>
  ),
});

interface EngineerStatus {
  engineer_id: string;
  engineer_name: string;
  status: string;
  current_lat: number | null;
  current_lng: number | null;
  current_address: string | null;
  last_location_update: string | null;
  current_trip_id: string | null;
  current_visit_id: string | null;
  is_online: boolean;
  speed: number | null;
  heading: number | null;
  has_fraud_flag?: boolean;
}

const statusColors: Record<string, string> = {
  idle: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
  travelling: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  at_site_in: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  at_site_out: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  trip_started: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  trip_ended: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
};

export default function LiveTrackingPage() {
  const router = useRouter();
  const [engineers, setEngineers] = useState<EngineerStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);
  const [selectedEngineer, setSelectedEngineer] = useState<string | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([28.6139, 77.2090]); // Default to Delhi
  const [mapZoom, setMapZoom] = useState(10);
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [onlineFilter, setOnlineFilter] = useState<boolean | null>(null);

  const companyId = typeof window !== "undefined" ? localStorage.getItem("company_id") : null;

  useEffect(() => {
    if (companyId) {
      fetchLiveTracking();
      const interval = setInterval(fetchLiveTracking, 5000); // Update every 5 seconds
      return () => clearInterval(interval);
    }
  }, [companyId, isPlaying]);

  const fetchLiveTracking = async () => {
    if (!isPlaying) return;
    
    try {
      const response = await fetch(
        `${API_BASE}/companies/${companyId}/live-tracking`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setEngineers(data);
        
        // Update map center if engineers available
        if (data.length > 0 && data[0].current_lat && data[0].current_lng) {
          setMapCenter([data[0].current_lat, data[0].current_lng]);
        }
      }
    } catch (err) {
      console.error("Failed to fetch live tracking:", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredEngineers = engineers.filter((engineer) => {
    if (statusFilter && engineer.status !== statusFilter) return false;
    if (onlineFilter !== null && engineer.is_online !== onlineFilter) return false;
    return true;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "travelling":
        return <Navigation className="w-4 h-4" />;
      case "at_site_in":
        return <MapPin className="w-4 h-4" />;
      case "at_site_out":
        return <MapPin className="w-4 h-4" />;
      case "trip_started":
        return <Play className="w-4 h-4" />;
      case "trip_ended":
        return <Pause className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getStatusText = (status: string) => {
    return status
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const handleEngineerClick = (engineer: EngineerStatus) => {
    setSelectedEngineer(engineer.engineer_id);
    if (engineer.current_lat && engineer.current_lng) {
      setMapCenter([engineer.current_lat, engineer.current_lng]);
      setMapZoom(15);
    }
  };

  const handleViewTrip = (tripId: string) => {
    router.push(`/sales-tracking/trips/${tripId}`);
  };

  const handleViewVisit = (visitId: string) => {
    router.push(`/sales-tracking/visits/${visitId}`);
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
              Live Tracking
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Real-time tracking of sales engineers
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                isPlaying
                  ? "bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50"
                  : "bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50"
              }`}
            >
              {isPlaying ? (
                <>
                  <Pause className="w-5 h-5" />
                  Pause Updates
                </>
              ) : (
                <>
                  <Play className="w-5 h-5" />
                  Resume Updates
                </>
              )}
            </button>
            <button
              onClick={fetchLiveTracking}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors flex items-center gap-2"
            >
              <RefreshCw className="w-5 h-5" />
              Refresh
            </button>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors flex items-center gap-2"
            >
              <Filter className="w-5 h-5" />
              Filters
            </button>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 grid grid-cols-1 md:grid-cols-3 gap-4">
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
                <option value="idle">Idle</option>
                <option value="travelling">Travelling</option>
                <option value="at_site_in">At Site (IN)</option>
                <option value="at_site_out">At Site (OUT)</option>
                <option value="trip_started">Trip Started</option>
                <option value="trip_ended">Trip Ended</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Online Status
              </label>
              <select
                value={onlineFilter === null ? "" : onlineFilter.toString()}
                onChange={(e) => setOnlineFilter(e.target.value === "" ? null : e.target.value === "true")}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="">All</option>
                <option value="true">Online</option>
                <option value="false">Offline</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => {
                  setStatusFilter("");
                  setOnlineFilter(null);
                }}
                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors w-full"
              >
                Clear Filters
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
        {/* Left Panel - Engineer List */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 h-[calc(100vh-200px)] overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Sales Engineers ({filteredEngineers.length})
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Click on an engineer to focus on map
              </p>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4">
              {loading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
                </div>
              ) : filteredEngineers.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32">
                  <Users className="w-12 h-12 text-gray-400 mb-2" />
                  <p className="text-gray-500 dark:text-gray-400">No engineers found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredEngineers.map((engineer) => (
                    <div
                      key={engineer.engineer_id}
                      className={`p-4 rounded-lg border cursor-pointer transition-all ${
                        selectedEngineer === engineer.engineer_id
                          ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20"
                          : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                      }`}
                      onClick={() => handleEngineerClick(engineer)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className="relative">
                            <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                              <Users className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                            </div>
                            {engineer.is_online ? (
                              <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-800"></div>
                            ) : (
                              <div className="absolute -top-1 -right-1 w-3 h-3 bg-gray-400 rounded-full border-2 border-white dark:border-gray-800"></div>
                            )}
                          </div>
                          <div>
                            <h3 className="font-medium text-gray-900 dark:text-white">
                              {engineer.engineer_name}
                            </h3>
                            <div className="flex items-center gap-2 mt-1">
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                                  statusColors[engineer.status] || "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
                                }`}
                              >
                                {getStatusIcon(engineer.status)}
                                {getStatusText(engineer.status)}
                              </span>
                              {engineer.has_fraud_flag && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                                  <AlertCircle className="w-3 h-3" />
                                  Fraud
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          {engineer.speed && (
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              {engineer.speed.toFixed(0)} km/h
                            </div>
                          )}
                          {engineer.last_location_update && (
                            <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                              {new Date(engineer.last_location_update).toLocaleTimeString()}
                            </div>
                          )}
                        </div>
                      </div>

                      {engineer.current_address && (
                        <div className="flex items-start gap-2 mt-3 text-sm text-gray-600 dark:text-gray-400">
                          <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                          <span className="line-clamp-2">{engineer.current_address}</span>
                        </div>
                      )}

                      <div className="flex gap-2 mt-3">
                        {engineer.current_trip_id && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewTrip(engineer.current_trip_id!);
                            }}
                            className="text-xs px-3 py-1 rounded-md bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50"
                          >
                            View Trip
                          </button>
                        )}
                        {engineer.current_visit_id && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewVisit(engineer.current_visit_id!);
                            }}
                            className="text-xs px-3 py-1 rounded-md bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50"
                          >
                            View Visit
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Panel - Map */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 h-[calc(100vh-200px)] overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Live Location Map
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Real-time movement tracking
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setMapZoom(mapZoom + 1)}
                  className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600"
                >
                  <ZoomIn className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setMapZoom(mapZoom - 1)}
                  className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600"
                >
                  <ZoomOut className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div className="flex-1 relative">
              <Map
                center={mapCenter}
                zoom={mapZoom}
                engineers={filteredEngineers.map(engineer => ({
                  id: engineer.engineer_id,
                  name: engineer.engineer_name,
                  position: engineer.current_lat && engineer.current_lng 
                    ? [engineer.current_lat, engineer.current_lng] 
                    : null,
                  status: engineer.status,
                  isOnline: engineer.is_online,
                  speed: engineer.speed,
                  heading: engineer.heading,
                }))}
                onMarkerClick={(engineerId) => setSelectedEngineer(engineerId)}
              />
              
              {/* Map Legend */}
              <div className="absolute bottom-4 left-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-3">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Legend</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                    <span className="text-xs text-gray-600 dark:text-gray-400">Travelling</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <span className="text-xs text-gray-600 dark:text-gray-400">At Site</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-gray-400"></div>
                    <span className="text-xs text-gray-600 dark:text-gray-400">Idle/Offline</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <span className="text-xs text-gray-600 dark:text-gray-400">Fraud Flagged</span>
                  </div>
                </div>
              </div>

              {/* Stats Summary */}
              <div className="absolute top-4 right-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-3">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Summary</h4>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600 dark:text-gray-400">Total Engineers:</span>
                    <span className="text-xs font-medium text-gray-900 dark:text-white">{engineers.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600 dark:text-gray-400">Online:</span>
                    <span className="text-xs font-medium text-green-600 dark:text-green-400">
                      {engineers.filter(e => e.is_online).length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600 dark:text-gray-400">Travelling:</span>
                    <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                      {engineers.filter(e => e.status === 'travelling').length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600 dark:text-gray-400">At Site:</span>
                    <span className="text-xs font-medium text-green-600 dark:text-green-400">
                      {engineers.filter(e => e.status.includes('at_site')).length}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
