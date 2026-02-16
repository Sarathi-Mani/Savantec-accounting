// app/sales-tracking/admin-live-tracking/page.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import type { Map as MapLibreMap } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useAuth } from "@/context/AuthContext";
import api from "@/services/api";
import {
  Users, MapPin, Car, Clock, AlertCircle,
  CheckCircle, XCircle, Filter, Search,
  Download, RefreshCw, Eye, MoreVertical,
  BarChart3, TrendingUp, Navigation, Target
} from "lucide-react";
import { useRouter } from "next/navigation";

interface EngineerStatus {
  engineer_id: string;
  engineer_name: string;
  status: "idle" | "travelling" | "at_site_in" | "at_site_out" | "off_duty";
  current_lat: number;
  current_lng: number;
  current_address: string;
  last_location_update: string;
  current_trip_id: string;
  current_visit_id: string;
  is_online: boolean;
  speed: number;
  heading: number;
}

interface Trip {
  id: string;
  trip_number: string;
  engineer_id: string;
  engineer_name: string;
  start_time: string;
  end_time: string;
  start_km: number;
  end_km: number;
  system_distance_km: number;
  status: string;
  is_valid: boolean;
  has_fraud_flag: boolean;
}

interface Visit {
  id: string;
  engineer_id: string;
  engineer_name: string;
  customer_id: string;
  customer_name: string;
  trip_id: string;
  in_time: string;
  out_time: string;
  duration_minutes: number;
  is_valid: boolean;
  has_fraud_flag: boolean;
  status: string;
}

interface Stats {
  totalEngineers: number;
  activeTrips: number;
  totalVisits: number;
  fraudCases: number;
}

export default function AdminLiveTracking() {
  const router = useRouter();
  const { company } = useAuth();
  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [engineers, setEngineers] = useState<EngineerStatus[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [selectedEngineer, setSelectedEngineer] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState("today");
  const [petrolRate, setPetrolRate] = useState("0");
  const [savingRate, setSavingRate] = useState(false);
  const [stats, setStats] = useState<Stats>({
    totalEngineers: 0,
    activeTrips: 0,
    totalVisits: 0,
    fraudCases: 0
  });

  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<Map<string, any>>(new Map());
  const [mapSupported, setMapSupported] = useState(true);
  const [isMapReady, setIsMapReady] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapInitAttempt, setMapInitAttempt] = useState(0);
  const maplibreRef = useRef<any>(null);
  const OSM_STYLE = {
    version: 8,
    sources: {
      "osm-tiles": {
        type: "raster",
        tiles: ["https://a.tile.openstreetmap.org/{z}/{x}/{y}.png"],
        tileSize: 256,
        attribution: "&copy; OpenStreetMap contributors",
      },
    },
    layers: [
      {
        id: "osm-tiles",
        type: "raster",
        source: "osm-tiles",
      },
    ],
  } as const;

  // Redirect if no company
  useEffect(() => {
    if (!company?.id) {
      router.push("/auth/sign-in");
    }
  }, [company, router]);

  const hasWebGLSupport = () => {
    try {
      const canvas = document.createElement("canvas");
      return !!(canvas.getContext("webgl2") || canvas.getContext("webgl"));
    } catch {
      return false;
    }
  };

  // Initialize MapLibre map
  useEffect(() => {
    if (!company?.id) return;
    if (!mapRef.current || mapInstanceRef.current) return;

    const initMap = async () => {
      if (!mapRef.current || mapInstanceRef.current) return;
      const { offsetWidth, offsetHeight } = mapRef.current;
      if (offsetWidth === 0 || offsetHeight === 0) {
        requestAnimationFrame(initMap);
        return;
      }

      try {
        const mod: any = await import("maplibre-gl");
        const maplibre = mod?.default ?? mod;
        maplibreRef.current = maplibre;
        mapInstanceRef.current = new maplibre.Map({
          container: mapRef.current,
          style: OSM_STYLE,
          center: [80.2707, 13.0827],
          zoom: 10,
          attributionControl: false,
        });

        mapInstanceRef.current.addControl(
          new maplibre.NavigationControl(),
          "top-right"
        );
        mapInstanceRef.current.addControl(
          new maplibre.AttributionControl({ compact: true })
        );

        mapInstanceRef.current.on("load", () => {
          setIsMapReady(true);
          setMapLoaded(true);
        });

        window.setTimeout(() => mapInstanceRef.current?.resize(), 50);
        window.setTimeout(() => mapInstanceRef.current?.resize(), 250);
        window.setTimeout(() => mapInstanceRef.current?.resize(), 1000);
      } catch (error) {
        console.error("Failed to initialize map:", error);
        setMapSupported(false);
      }
    };

    requestAnimationFrame(initMap);

    return () => {
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current.clear();
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [company?.id, mapInitAttempt]);

  useEffect(() => {
    if (!company?.id) return;
    if (mapLoaded) return;
    const timeout = window.setTimeout(() => {
      setMapInitAttempt((prev) => prev + 1);
    }, 2500);
    return () => window.clearTimeout(timeout);
  }, [company?.id, mapLoaded]);

  useEffect(() => {
    if (!mapRef.current || !mapInstanceRef.current) return;
    const observer = new ResizeObserver(() => {
      mapInstanceRef.current?.resize();
    });
    observer.observe(mapRef.current);
    return () => observer.disconnect();
  }, [company?.id]);

  // Load data
  useEffect(() => {
    if (company?.id) {
      loadData();
      loadCompanySettings();
      
      // Refresh every 30 seconds
      const interval = setInterval(loadData, 30000);
      return () => clearInterval(interval);
    }
  }, [company?.id, timeRange]);

  useEffect(() => {
    if (isMapReady) {
      updateMapMarkers(engineers);
    }
  }, [isMapReady, engineers]);

  const loadData = async () => {
    if (!company?.id) return;
    
    try {
      setLoading(true);
      
      // Load live tracking
      const trackingResponse = await api.get(`/companies/${company.id}/live-tracking`);
      setEngineers(trackingResponse.data);
      
      // Load recent trips
      const tripsResponse = await api.get(`/companies/${company.id}/trips`, {
        params: { limit: 10, status: "completed" }
      });
      setTrips(tripsResponse.data);
      
      // Load recent visits
      const visitsResponse = await api.get(`/companies/${company.id}/visits`, {
        params: { limit: 20, is_valid: true }
      });
      setVisits(visitsResponse.data);
      
      // Update stats
      setStats({
        totalEngineers: trackingResponse.data.length,
        activeTrips: trackingResponse.data.filter(e => e.current_trip_id).length,
        totalVisits: visitsResponse.data.length,
        fraudCases: tripsResponse.data.filter(t => t.has_fraud_flag).length
      });
      
      // Update map markers
      updateMapMarkers(trackingResponse.data);
      
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  };

  const loadCompanySettings = async () => {
    if (!company?.id) return;
    try {
      const response = await api.get(`/companies/${company.id}`);
      const rate = response.data?.petrol_rate_per_km ?? 0;
      setPetrolRate(String(rate));
    } catch (error) {
      console.error("Failed to load company settings:", error);
    }
  };

  const handleSavePetrolRate = async () => {
    if (!company?.id) return;
    try {
      setSavingRate(true);
      await api.put(`/companies/${company.id}`, {
        petrol_rate_per_km: parseFloat(petrolRate || "0"),
      });
      alert("Petrol rate updated successfully");
    } catch (error: any) {
      alert(error.response?.data?.detail || "Failed to update petrol rate");
    } finally {
      setSavingRate(false);
    }
  };

  // Update map markers
  const updateMapMarkers = (engineersData: EngineerStatus[]) => {
    if (!mapInstanceRef.current || !isMapReady) return;

    // Clear existing markers
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current.clear();

    const maplibre = maplibreRef.current;
    if (!maplibre) return;
    const bounds = new maplibre.LngLatBounds();

    const createLocationMarker = (color: string) => {
      const el = document.createElement("div");
      el.style.width = "28px";
      el.style.height = "28px";
      el.style.display = "flex";
      el.style.alignItems = "center";
      el.style.justifyContent = "center";
      el.style.transform = "translateY(-2px)";
      el.style.filter = "drop-shadow(0 2px 4px rgba(0,0,0,0.25))";
      el.style.cursor = "pointer";
      el.innerHTML = `
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M12 22s7-7.36 7-12a7 7 0 1 0-14 0c0 4.64 7 12 7 12z" fill="${color}" />
          <circle cx="12" cy="10" r="3.2" fill="#ffffff" />
        </svg>
      `;
      return el;
    };

    // Add engineer markers
    engineersData.forEach((engineer) => {
      if (!engineer.current_lat || !engineer.current_lng) return;

      const markerEl = createLocationMarker(getStatusColor(engineer.status));

      const popupHtml = `
        <div style="padding: 10px; min-width: 240px;">
          <h3 style="margin: 0 0 5px 0; color: #1a1a1a;">${engineer.engineer_name}</h3>
          <div style="display: flex; align-items: center; gap: 5px; margin-bottom: 5px;">
            <div style="width: 8px; height: 8px; border-radius: 50%; background: ${getStatusColor(engineer.status)}"></div>
            <span style="font-size: 12px; color: #666;">${engineer.status.replace("_", " ").toUpperCase()}</span>
          </div>
          <p style="margin: 0 0 5px 0; font-size: 12px; color: #666;">${engineer.current_address || "Location not available"}</p>
          <p style="margin: 0 0 5px 0; font-size: 11px; color: #999;">Last update: ${new Date(engineer.last_location_update).toLocaleTimeString()}</p>
          ${engineer.speed ? `<p style="margin: 0; font-size: 11px; color: #666;">Speed: ${engineer.speed.toFixed(1)} km/h</p>` : ""}
        </div>
      `;

      const popup = new maplibre.Popup({ offset: 12 }).setHTML(popupHtml);
      const marker = new maplibre.Marker({ element: markerEl })
        .setLngLat([engineer.current_lng, engineer.current_lat])
        .setPopup(popup)
        .addTo(mapInstanceRef.current);

      markersRef.current.set(engineer.engineer_id, marker);
      bounds.extend([engineer.current_lng, engineer.current_lat]);
    });

    // Fit bounds to show all markers
    if (markersRef.current.size > 0) {
      mapInstanceRef.current.fitBounds(bounds, { padding: 40, maxZoom: 15 });
    }
  };

  const getStatusColor = (status: string): string => {
    switch(status) {
      case 'travelling': return '#3b82f6'; // blue
      case 'at_site_in': return '#10b981'; // green
      case 'at_site_out': return '#f59e0b'; // yellow
      case 'off_duty': return '#6b7280'; // gray
      default: return '#ef4444'; // red
    }
  };

  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'travelling': return <Car className="w-4 h-4" />;
      case 'at_site_in': return <MapPin className="w-4 h-4" />;
      case 'at_site_out': return <Target className="w-4 h-4" />;
      case 'off_duty': return <Clock className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  const handleTimeRangeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setTimeRange(e.target.value);
  };

  const handleEngineerSelect = (t: string) => {
    setSelectedEngineer(t);
  };

  if (!company?.id) {
    return null; // Will redirect due to useEffect
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Live Tracking Dashboard</h1>
            <p className="text-gray-600 mt-1">Real-time monitoring of sales engineers</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={loadData}
              className="px-4 py-2 bg-white border rounded-lg hover:bg-gray-50 flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
            <button className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-opacity-90 flex items-center gap-2">
              <Download className="w-4 h-4" />
              Export Report
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Engineers</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalEngineers}</p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-sm text-gray-600">
              {engineers.filter(e => e.is_online).length} online
            </p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Trips</p>
              <p className="text-2xl font-bold text-gray-900">{stats.activeTrips}</p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
              <Car className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-sm text-gray-600">Today's trips in progress</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Visits</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalVisits}</p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
              <MapPin className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-sm text-gray-600">Completed today</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Fraud Alerts</p>
              <p className="text-2xl font-bold text-gray-900">{stats.fraudCases}</p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-red-100 flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-sm text-red-600">Requires attention</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Engineers List */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-sm">
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Sales Engineers</h2>
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search..."
                  className="border-0 text-sm focus:ring-0"
                />
              </div>
            </div>
            
            <div className="overflow-y-auto max-h-[600px]">
              {engineers.length === 0 && initialLoading ? (
                <div className="p-8 text-center text-gray-500">
                  <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>Loading engineers...</p>
                </div>
              ) : engineers.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>No engineers found</p>
                </div>
              ) : (
                <div className="divide-y">
                  {engineers.map(engineer => (
                    <div
                      key={engineer.engineer_id}
                      className={`p-4 hover:bg-gray-50 cursor-pointer ${
                        selectedEngineer === engineer.engineer_id ? 'bg-blue-50' : ''
                      }`}
                      onClick={() => handleEngineerSelect(engineer.engineer_id)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <div className={`w-2 h-2 rounded-full ${
                              engineer.is_online ? 'bg-green-500' : 'bg-gray-300'
                            }`}></div>
                            <div>
                              <h3 className="font-medium text-gray-900">{engineer.engineer_name}</h3>
                              <div className="flex items-center gap-2 mt-1">
                                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${
                                  engineer.status === 'travelling' ? 'bg-blue-100 text-blue-800' :
                                  engineer.status === 'at_site_in' ? 'bg-green-100 text-green-800' :
                                  engineer.status === 'at_site_out' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {getStatusIcon(engineer.status)}
                                  {engineer.status.replace('_', ' ').toUpperCase()}
                                </span>
                                {engineer.speed && (
                                  <span className="text-xs text-gray-600">
                                    {engineer.speed.toFixed(0)} km/h
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <div className="mt-3 space-y-1">
                            <p className="text-sm text-gray-600 truncate">
                              {engineer.current_address || 'Location not available'}
                            </p>
                            <p className="text-xs text-gray-500">
                              Updated: {new Date(engineer.last_location_update).toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                        
                        <button className="p-1 hover:bg-gray-200 rounded">
                          <MoreVertical className="w-4 h-4 text-gray-500" />
                        </button>
                      </div>
                      
                      {engineer.current_trip_id && (
                        <div className="mt-3 pt-3 border-t">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">Active Trip:</span>
                            <span className="font-medium">TRP-{engineer.current_trip_id.slice(-4)}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Middle Column - Map */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-sm">
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Live Map View</h2>
              <div className="flex items-center gap-2">
                <select 
                  value={timeRange}
                  onChange={handleTimeRangeChange}
                  className="border rounded-lg px-3 py-1 text-sm"
                >
                  <option value="today">Today</option>
                  <option value="week">This Week</option>
                  <option value="month">This Month</option>
                </select>
                <button className="p-1 hover:bg-gray-100 rounded">
                  <Filter className="w-4 h-4 text-gray-500" />
                </button>
              </div>
            </div>
            {!mapSupported ? (
              <div className="w-full h-[500px] flex items-center justify-center text-sm text-gray-600">
                Map not supported in this browser/device.
              </div>
            ) : (
              <div className="relative w-full h-[500px] min-h-[500px]">
                <div ref={mapRef} className="w-full h-full" />
                {!mapLoaded && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/70 text-sm text-gray-600">
                    Loading map...
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Recent Activity */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Recent Trips */}
            <div className="bg-white rounded-lg shadow-sm">
              <div className="p-4 border-b">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Car className="w-4 h-4" />
                  Recent Trips
                </h3>
              </div>
              <div className="overflow-y-auto max-h-[300px]">
                {trips.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    <p>No trips found</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {trips.slice(0, 5).map(trip => (
                      <div key={trip.id} className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900">{trip.trip_number}</p>
                            <p className="text-sm text-gray-600">{trip.engineer_name}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {trip.has_fraud_flag ? (
                              <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded">
                                Fraud Alert
                              </span>
                            ) : (
                              <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                                Valid
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <p className="text-gray-600">Distance</p>
                            <p className="font-medium">
                              {Number(trip.system_distance_km || 0).toFixed(2)} km
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-600">Duration</p>
                            <p className="font-medium">
                              {new Date(trip.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Recent Visits */}
            <div className="bg-white rounded-lg shadow-sm">
              <div className="p-4 border-b">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Recent Visits
                </h3>
              </div>
              <div className="overflow-y-auto max-h-[300px]">
                {visits.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    <p>No visits found</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {visits.slice(0, 5).map(visit => (
                      <div key={visit.id} className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900">{visit.customer_name}</p>
                            <p className="text-sm text-gray-600">{visit.engineer_name}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {visit.has_fraud_flag ? (
                              <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded">
                                <AlertCircle className="w-3 h-3 inline mr-1" />
                                Fraud
                              </span>
                            ) : (
                              <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                                <CheckCircle className="w-3 h-3 inline mr-1" />
                                Valid
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="mt-2 text-sm">
                          <div className="flex items-center justify-between">
                            <span className="text-gray-600">Duration</span>
                            <span className="font-medium">{visit.duration_minutes.toFixed(0)} min</span>
                          </div>
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-gray-600">Time</span>
                            <span className="font-medium">
                              {new Date(visit.in_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Settings Panel (Petrol Rate) */}
      <div className="mt-6 bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Petrol Rate Settings</h2>
          <button
            onClick={handleSavePetrolRate}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-opacity-90"
            disabled={savingRate}
          >
            {savingRate ? "Saving..." : "Save Settings"}
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Petrol Rate per KM (INR)
            </label>
            <input
              type="number"
              step="0.01"
              value={petrolRate}
              onChange={(e) => setPetrolRate(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
            />
            <p className="text-sm text-gray-500 mt-1">Rate applied for all trips</p>
          </div>
        </div>
      </div>
    </div>
  );
}
