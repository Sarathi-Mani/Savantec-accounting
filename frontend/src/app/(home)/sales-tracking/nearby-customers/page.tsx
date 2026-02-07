"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import api, { customersApi } from "@/services/api";
import CustomerMap, { CustomerMarker } from "@/components/map/CustomerMap";
import {
  MapPin,
  Search,
  Navigation,
  Play,
  StopCircle,
  LocateFixed,
  Clock,
  CheckCircle,
  XCircle,
} from "lucide-react";

type NearbyCustomer = {
  id: string;
  name: string;
  contact?: string;
  location_lat?: number;
  location_lng?: number;
  location_address?: string;
  district?: string;
  area?: string;
  distance_km?: number;
};

type TripState = {
  id: string;
  trip_number: string;
  start_time: string;
  start_km: number;
};

type VisitState = {
  id: string;
  status: "planned" | "in_progress" | "completed";
  in_time?: string;
  out_time?: string;
};

type TripEndSummary = {
  distance_km: number;
  started_at: string;
  ended_at: string;
};

const DEVICE_ID_KEY = "sales_tracking_device_id";

const getDeviceId = () => {
  if (typeof window === "undefined") return "web-browser";
  const existing = localStorage.getItem(DEVICE_ID_KEY);
  if (existing) return existing;
  const created = `web-${Math.random().toString(36).slice(2, 10)}`;
  localStorage.setItem(DEVICE_ID_KEY, created);
  return created;
};

const haversineKm = (a: [number, number], b: [number, number]) => {
  const [lat1, lon1] = a;
  const [lat2, lon2] = b;
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const lat1Rad = (lat1 * Math.PI) / 180;
  const lat2Rad = (lat2 * Math.PI) / 180;
  const aVal =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) *
      Math.sin(dLon / 2) *
      Math.cos(lat1Rad) *
      Math.cos(lat2Rad);
  const c = 2 * Math.atan2(Math.sqrt(aVal), Math.sqrt(1 - aVal));
  return R * c;
};

export default function NearbyCustomersPage() {
  const { company, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<NearbyCustomer[]>([]);
  const [radiusKm, setRadiusKm] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchCenter, setSearchCenter] = useState<[number, number] | null>(null);
  const [currentLocation, setCurrentLocation] = useState<[number, number] | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [isPageReady, setIsPageReady] = useState(false);
  const [geocodeAttempted, setGeocodeAttempted] = useState(false);
  const [geocoding, setGeocoding] = useState(false);

  const [trip, setTrip] = useState<TripState | null>(null);
  const [visitsByCustomer, setVisitsByCustomer] = useState<Record<string, VisitState>>({});
  const [showStartTrip, setShowStartTrip] = useState(false);
  const [showEndTrip, setShowEndTrip] = useState(false);
  const [tripEndSummary, setTripEndSummary] = useState<TripEndSummary | null>(null);

  const [tripForm, setTripForm] = useState({
    start_km: "",
    start_date: new Date().toISOString().slice(0, 10),
    notes: "",
  });

  const [endTripForm, setEndTripForm] = useState({
    end_km: "",
    notes: "",
  });

  const locationWatchIdRef = useRef<number | null>(null);

  const handleSelectCustomer = (customerId: string) => {
    setSelectedCustomerId((prev) => (prev === customerId ? null : customerId));
  };

  useEffect(() => {
    setIsPageReady(true);
    
    if (!company?.id || !user?.id) return;
    loadCurrentTrip();
    getCurrentLocation();
  }, [company?.id, user?.id]);

  useEffect(() => {
    if (!company?.id || !searchCenter) return;
    loadNearbyCustomers(searchCenter[0], searchCenter[1]);
  }, [company?.id, searchCenter, radiusKm]);

  useEffect(() => {
    return () => {
      if (locationWatchIdRef.current) {
        navigator.geolocation.clearWatch(locationWatchIdRef.current);
        locationWatchIdRef.current = null;
      }
    };
  }, []);

  const getCurrentLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const next = [pos.coords.latitude, pos.coords.longitude] as [number, number];
        setCurrentLocation(next);
        if (!searchCenter) {
          setSearchCenter(next);
        }
      },
      () => {
        // ignore
      },
      { enableHighAccuracy: true, timeout: 5000 }
    );
  };

  const loadCurrentTrip = async () => {
    if (!company?.id || !user?.id) return;
    try {
      const response = await api.get(
        `/companies/${company.id}/engineers/${user.id}/current-trip`
      );
      if (response.data?.trip) {
        const t = response.data.trip;
        setTrip({
          id: t.id,
          trip_number: t.trip_number,
          start_time: t.start_time,
          start_km: t.start_km,
        });
        await loadTripVisits(t.id);
        startLocationTracking(t.id);
      }
    } catch (error) {
      console.error("Failed to load current trip:", error);
    }
  };

  const loadTripVisits = async (tripId: string) => {
    if (!company?.id) return;
    try {
      const response = await api.get(`/companies/${company.id}/visits`, {
        params: { trip_id: tripId },
      });
      const next: Record<string, VisitState> = {};
      (response.data || []).forEach((visit: any) => {
        if (!visit.customer_id) return;
        next[visit.customer_id] = {
          id: visit.id,
          status: visit.status,
          in_time: visit.in_time,
          out_time: visit.out_time,
        };
      });
      setVisitsByCustomer(next);
    } catch (error) {
      console.error("Failed to load trip visits:", error);
    }
  };

  const toNumber = (value: any): number | undefined => {
    if (typeof value === "number" && !Number.isNaN(value)) return value;
    if (typeof value === "string" && value.trim() !== "") {
      const parsed = Number(value);
      return Number.isNaN(parsed) ? undefined : parsed;
    }
    return undefined;
  };

  const normalizeCustomer = (customer: any): NearbyCustomer => {
    return {
      id: customer.id,
      name: customer.name,
      contact: customer.contact,
      location_lat: toNumber(customer.location_lat ?? customer.latitude),
      location_lng: toNumber(customer.location_lng ?? customer.longitude),
      location_address: customer.location_address,
      district: customer.district,
      area: customer.area,
      distance_km: toNumber(customer.distance_km),
    };
  };

  const fetchAllCustomersWithLocations = async (): Promise<NearbyCustomer[]> => {
    if (!company?.id) return [];
    const pageSize = 100;
    let page = 1;
    let allCustomers: NearbyCustomer[] = [];

    while (true) {
      const response = await customersApi.list(company.id, {
        page,
        page_size: pageSize,
      });
      const batch = (response.customers || []).map(normalizeCustomer);
      allCustomers = allCustomers.concat(batch);

      if (batch.length < pageSize || allCustomers.length >= response.total) {
        break;
      }
      page += 1;
    }

    return allCustomers.filter(
      (customer) =>
        typeof customer.location_lat === "number" &&
        typeof customer.location_lng === "number"
    );
  };

  const loadNearbyCustomers = async (lat: number, lng: number) => {
    if (!company?.id) return;
    try {
      setLoading(true);
      try {
        const response = await api.get(`/companies/${company.id}/customers/nearby`, {
          params: {
            latitude: lat,
            longitude: lng,
            radius_km: radiusKm,
          },
        });
        const normalized = (response.data || []).map(normalizeCustomer);
        setCustomers(normalized);

        if (normalized.length === 0 && !geocodeAttempted) {
          setGeocodeAttempted(true);
          await triggerGeocodeMissing();
          // Retry once after geocoding
          const retry = await api.get(`/companies/${company.id}/customers/nearby`, {
            params: {
              latitude: lat,
              longitude: lng,
              radius_km: radiusKm,
            },
          });
          const retried = (retry.data || []).map(normalizeCustomer);
          if (retried.length === 0) {
            const allWithLocations = await fetchAllCustomersWithLocations();
            setCustomers(allWithLocations);
          } else {
            setCustomers(retried);
          }
        }
      } catch (error: any) {
        // Fallback: load all customers and filter by radius on client
        let allCustomers = await fetchAllCustomersWithLocations();
        const filtered = allCustomers.filter((customer) => {
          if (
            typeof customer.location_lat !== "number" ||
            typeof customer.location_lng !== "number"
          ) {
            return false;
          }
          const km = haversineKm([lat, lng], [
            customer.location_lat,
            customer.location_lng,
          ]);
          return km <= radiusKm;
        });
        setCustomers(filtered);

        if (filtered.length === 0 && !geocodeAttempted) {
          setGeocodeAttempted(true);
          await triggerGeocodeMissing();
          // Retry once after geocoding
          allCustomers = await fetchAllCustomersWithLocations();
          const retried = allCustomers.filter((customer) => {
            if (
              typeof customer.location_lat !== "number" ||
              typeof customer.location_lng !== "number"
            ) {
              return false;
            }
            const km = haversineKm([lat, lng], [
              customer.location_lat,
              customer.location_lng,
            ]);
            return km <= radiusKm;
          });
          if (retried.length === 0) {
            setCustomers(allCustomers);
          } else {
            setCustomers(retried);
          }
        }
      }
    } catch (error) {
      console.error("Failed to load nearby customers:", error);
    } finally {
      setLoading(false);
    }
  };

  const triggerGeocodeMissing = async () => {
    if (!company?.id) return;
    try {
      setGeocoding(true);
      await api.post(`/companies/${company.id}/customers/geocode-missing`, null, {
        params: { limit: 200 },
      });
    } catch (error) {
      console.error("Failed to geocode customers:", error);
    } finally {
      setGeocoding(false);
    }
  };

  const geocodeLocation = async (query: string) => {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(
      query
    )}`;
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error("Failed to geocode location");
    const data = await res.json();
    if (!data || data.length === 0) throw new Error("Location not found");
    return [parseFloat(data[0].lat), parseFloat(data[0].lon)] as [number, number];
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    try {
      const center = await geocodeLocation(searchQuery.trim());
      setSearchCenter(center);
    } catch (error: any) {
      alert(error.message || "Unable to find location");
    }
  };

  const handleUseCurrentLocation = () => {
    if (currentLocation) {
      setSearchCenter(currentLocation);
    } else {
      getCurrentLocation();
    }
  };

  const startLocationTracking = (tripId: string) => {
    if (!navigator.geolocation || !company?.id || !user?.id) return;
    if (locationWatchIdRef.current) return;

    const deviceId = getDeviceId();
    const watchId = navigator.geolocation.watchPosition(
      async (pos) => {
        const locationData = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          device_id: deviceId,
          is_mock_location: false,
          is_background: false,
          timestamp: new Date().toISOString(),
        };

        setCurrentLocation([pos.coords.latitude, pos.coords.longitude]);

        try {
          await api.post(
            `/companies/${company.id}/location/update?engineer_id=${user.id}`,
            locationData
          );
        } catch (error) {
          console.error("Location update failed:", error);
        }
      },
      (err) => {
        console.error("Geolocation error:", err);
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
    );

    locationWatchIdRef.current = watchId;
  };

  const handleStartTrip = async () => {
    if (!company?.id || !user?.id) return;
    if (!currentLocation) {
      alert("Please enable location to start trip");
      return;
    }
    if (!tripForm.start_km) {
      alert("Please enter start KM");
      return;
    }

    const deviceId = getDeviceId();
    const now = new Date();
    const startTimestamp = new Date(
      `${tripForm.start_date}T${now.toTimeString().slice(0, 8)}`
    ).toISOString();

    try {
      const response = await api.post(
        `/companies/${company.id}/trips/start?engineer_id=${user.id}`,
        {
          start_km: parseFloat(tripForm.start_km),
          start_location: {
            latitude: currentLocation[0],
            longitude: currentLocation[1],
            accuracy: 0,
            device_id: deviceId,
            is_mock_location: false,
            is_background: false,
            timestamp: startTimestamp,
          },
          notes: tripForm.notes,
        }
      );

      setTrip({
        id: response.data.trip_id,
        trip_number: response.data.trip_number,
        start_time: startTimestamp,
        start_km: parseFloat(tripForm.start_km),
      });
      setShowStartTrip(false);
      setTripEndSummary(null);
      setTripForm({
        start_km: "",
        start_date: new Date().toISOString().slice(0, 10),
        notes: "",
      });
      startLocationTracking(response.data.trip_id);
      if (currentLocation) {
        setSearchCenter(currentLocation);
      }
    } catch (error: any) {
      alert(error.response?.data?.detail || "Failed to start trip");
    }
  };

  const handleEndTrip = async () => {
    if (!company?.id || !user?.id || !trip?.id || !currentLocation) return;
    if (!endTripForm.end_km) {
      alert("Please enter end KM");
      return;
    }

    const deviceId = getDeviceId();
    try {
      const response = await api.post(`/companies/${company.id}/trips/${trip.id}/end`, {
        end_km: parseFloat(endTripForm.end_km),
        end_location: {
          latitude: currentLocation[0],
          longitude: currentLocation[1],
          accuracy: 0,
          device_id: deviceId,
          is_mock_location: false,
          is_background: false,
          timestamp: new Date().toISOString(),
        },
        notes: endTripForm.notes,
      });

      setTripEndSummary({
        distance_km: response.data.distance_km,
        started_at: trip.start_time,
        ended_at: new Date().toISOString(),
      });
      setTrip(null);
      setVisitsByCustomer({});
      setShowEndTrip(false);
      setEndTripForm({ end_km: "", notes: "" });

      if (locationWatchIdRef.current) {
        navigator.geolocation.clearWatch(locationWatchIdRef.current);
        locationWatchIdRef.current = null;
      }
    } catch (error: any) {
      alert(error.response?.data?.detail || "Failed to end trip");
    }
  };

  const handleCreateVisit = async (customerId: string) => {
    if (!company?.id || !trip?.id) {
      alert("Please start a trip first");
      return;
    }
    if (visitsByCustomer[customerId]) return;

    try {
      const response = await api.post(
        `/companies/${company.id}/trips/${trip.id}/visits`,
        { customer_ids: [customerId] }
      );
      const created = response.data?.visits?.[0];
      if (created) {
        setVisitsByCustomer((prev) => ({
          ...prev,
          [customerId]: { id: created.id, status: "planned" },
        }));
      }
    } catch (error: any) {
      alert(error.response?.data?.detail || "Failed to create visit");
    }
  };

  const handleMarkIn = async (customerId: string) => {
    if (!company?.id || !trip?.id || !currentLocation) return;
    const visit = visitsByCustomer[customerId];
    if (!visit) {
      await handleCreateVisit(customerId);
      return;
    }
    try {
      const deviceId = getDeviceId();
      await api.post(`/companies/${company.id}/visits/${visit.id}/in`, {
        location: {
          latitude: currentLocation[0],
          longitude: currentLocation[1],
          accuracy: 0,
          device_id: deviceId,
          is_mock_location: false,
          is_background: false,
          timestamp: new Date().toISOString(),
        },
      });
      setVisitsByCustomer((prev) => ({
        ...prev,
        [customerId]: {
          ...prev[customerId],
          status: "in_progress",
          in_time: new Date().toISOString(),
        },
      }));
    } catch (error: any) {
      alert(error.response?.data?.detail || "Unable to mark IN");
    }
  };

  const handleMarkOut = async (customerId: string) => {
    if (!company?.id || !trip?.id || !currentLocation) return;
    const visit = visitsByCustomer[customerId];
    if (!visit) return;
    try {
      const deviceId = getDeviceId();
      await api.post(`/companies/${company.id}/visits/${visit.id}/out`, {
        location: {
          latitude: currentLocation[0],
          longitude: currentLocation[1],
          accuracy: 0,
          device_id: deviceId,
          is_mock_location: false,
          is_background: false,
          timestamp: new Date().toISOString(),
        },
      });
      setVisitsByCustomer((prev) => ({
        ...prev,
        [customerId]: {
          ...prev[customerId],
          status: "completed",
          out_time: new Date().toISOString(),
        },
      }));
    } catch (error: any) {
      alert(error.response?.data?.detail || "Unable to mark OUT");
    }
  };

  const customersWithDistance = useMemo(() => {
    return customers.map((customer) => {
      if (
        currentLocation &&
        typeof customer.location_lat === "number" &&
        typeof customer.location_lng === "number"
      ) {
        const km = haversineKm(currentLocation, [
          customer.location_lat,
          customer.location_lng,
        ]);
        return { ...customer, distance_km: km };
      }
      return customer;
    });
  }, [customers, currentLocation]);

  const markers: CustomerMarker[] = useMemo(() => {
    return customersWithDistance.map((customer) => {
      const visit = visitsByCustomer[customer.id];
      const status =
        visit?.status === "completed"
          ? "completed"
          : visit?.status === "in_progress"
          ? "in"
          : visit?.status === "planned"
          ? "planned"
          : "active";

      return {
        id: customer.id,
        name: customer.name,
        position:
          typeof customer.location_lat === "number" &&
          typeof customer.location_lng === "number"
            ? [customer.location_lat, customer.location_lng]
            : null,
        status,
        visitedBy: visit?.status === "completed" ? user?.name || "Salesman" : undefined,
        visitedAt: visit?.out_time,
        distanceKm: customer.distance_km ?? null,
      };
    });
  }, [customersWithDistance, visitsByCustomer, user?.name]);

  const sortedCustomers = useMemo(() => {
    return [...customersWithDistance].sort((a, b) => {
      const da = a.distance_km ?? Number.MAX_SAFE_INTEGER;
      const db = b.distance_km ?? Number.MAX_SAFE_INTEGER;
      return da - db;
    });
  }, [customersWithDistance]);

  if (!isPageReady) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!company?.id || !user?.id) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Please log in to access this page</p>
        </div>
      </div>
    );
  }

  const mapCenter = searchCenter || currentLocation || [13.0827, 80.2707];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nearby Customers</h1>
          <p className="text-gray-600">Search a location and start your day trip</p>
        </div>
        <div className="flex items-center gap-3">
          {!trip && (
            <button
              onClick={() => setShowStartTrip(true)}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-opacity-90 flex items-center gap-2"
            >
              <Play className="w-4 h-4" />
              Start Trip
            </button>
          )}
          {trip && (
            <button
              onClick={() => setShowEndTrip(true)}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
            >
              <StopCircle className="w-4 h-4" />
              End Day Trip
            </button>
          )}
        </div>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 flex items-center gap-2 bg-white rounded-lg border p-3">
          <Search className="w-4 h-4 text-gray-500" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search location (city / area / pincode)"
            className="flex-1 outline-none text-sm"
          />
          <button
            onClick={handleSearch}
            className="px-3 py-1.5 bg-gray-900 text-white rounded-md text-sm"
          >
            Search
          </button>
          <button
            onClick={handleUseCurrentLocation}
            className="px-3 py-1.5 border rounded-md text-sm flex items-center gap-1"
          >
            <LocateFixed className="w-4 h-4" />
            Use Current
          </button>
        </div>

        <div className="flex items-center gap-3 bg-white rounded-lg border p-3">
          <label className="text-sm text-gray-600">Radius</label>
          <select
            value={radiusKm}
            onChange={(e) => setRadiusKm(Number(e.target.value))}
            className="border rounded-md px-2 py-1 text-sm"
          >
            <option value={5}>5 km</option>
            <option value={10}>10 km</option>
            <option value={20}>20 km</option>
            <option value={30}>30 km</option>
            <option value={50}>50 km</option>
          </select>
          <button
            onClick={triggerGeocodeMissing}
            disabled={geocoding}
            className="ml-auto px-3 py-1.5 border rounded-md text-sm"
            title="Update customer locations from address"
          >
            {geocoding ? "Updating..." : "Update Locations"}
          </button>
          {trip && (
            <div className="ml-auto text-xs text-green-700 bg-green-50 px-2 py-1 rounded-full">
              Trip Active: {trip.trip_number}
            </div>
          )}
        </div>
      </div>

      {tripEndSummary && (
        <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-green-700 font-medium">
            <CheckCircle className="w-4 h-4" />
            Day trip ended successfully
          </div>
          <div className="mt-2 text-sm text-green-800">
            Distance: {tripEndSummary.distance_km.toFixed(2)} km
          </div>
          <div className="mt-1 text-xs text-green-700">
            Start: {new Date(tripEndSummary.started_at).toLocaleString()}
          </div>
          <div className="mt-1 text-xs text-green-700">
            End: {new Date(tripEndSummary.ended_at).toLocaleString()}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 bg-white rounded-lg border overflow-hidden h-[600px]">
          <CustomerMap
            mapId="nearby-customers-map"
            center={mapCenter}
            zoom={13}
            customers={markers}
            currentLocation={currentLocation || undefined}
            onMarkerClick={handleSelectCustomer}
            selectedCustomerId={selectedCustomerId}
            focusZoom={16}
          />
        </div>

        <div className="bg-white rounded-lg border h-[600px] flex flex-col">
          <div className="p-4 border-b">
            <h2 className="font-semibold text-gray-900">Next Customers</h2>
            <p className="text-sm text-gray-500">
              {sortedCustomers.length} customers in range
            </p>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading && (
              <div className="p-6 text-center text-gray-500">Loading...</div>
            )}
            {!loading && sortedCustomers.length === 0 && (
              <div className="p-6 text-center text-gray-500">
                <MapPin className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                No customers found
              </div>
            )}

            {!loading &&
              sortedCustomers.map((customer) => {
                const visit = visitsByCustomer[customer.id];
                const isSelected = selectedCustomerId === customer.id;
                return (
                  <div
                    key={customer.id}
                  className={`p-4 border-b hover:bg-gray-50 cursor-pointer ${
                    isSelected ? "bg-blue-50" : ""
                  }`}
                    onClick={() => handleSelectCustomer(customer.id)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{customer.name}</h3>
                        <p className="text-xs text-gray-500 mt-1">
                          {customer.location_address || "Location not set"}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-600">
                          {customer.distance_km != null && (
                            <span className="px-2 py-1 bg-gray-100 rounded">
                              {customer.distance_km.toFixed(2)} km away
                            </span>
                          )}
                          {customer.area && (
                            <span className="px-2 py-1 bg-gray-100 rounded">
                              {customer.area}
                            </span>
                          )}
                          {customer.district && (
                            <span className="px-2 py-1 bg-gray-100 rounded">
                              {customer.district}
                            </span>
                          )}
                        </div>

                        {visit?.status === "completed" && (
                          <div className="mt-2 text-xs text-green-700 flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            Visited by {user?.name || "Salesman"} at{" "}
                            {visit.out_time
                              ? new Date(visit.out_time).toLocaleString()
                              : "completed"}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col gap-2">
                        {!visit && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCreateVisit(customer.id);
                            }}
                            className="px-3 py-1.5 text-xs bg-gray-900 text-white rounded"
                          >
                            Start
                          </button>
                        )}

                        {visit?.status === "planned" && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMarkIn(customer.id);
                            }}
                            className="px-3 py-1.5 text-xs bg-primary text-white rounded"
                          >
                            In
                          </button>
                        )}

                        {visit?.status === "in_progress" && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMarkOut(customer.id);
                            }}
                            className="px-3 py-1.5 text-xs bg-red-600 text-white rounded"
                          >
                            Out
                          </button>
                        )}

                        {visit?.status === "completed" && (
                          <span className="px-2 py-1 text-xs rounded bg-green-100 text-green-700">
                            Done
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>

      {showStartTrip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Start Trip</h3>
              <button onClick={() => setShowStartTrip(false)}>
                <XCircle className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Start KM</label>
                <input
                  type="number"
                  value={tripForm.start_km}
                  onChange={(e) =>
                    setTripForm((prev) => ({ ...prev, start_km: e.target.value }))
                  }
                  className="w-full border rounded-md px-3 py-2"
                  placeholder="Enter odometer reading"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Date</label>
                <input
                  type="date"
                  value={tripForm.start_date}
                  onChange={(e) =>
                    setTripForm((prev) => ({ ...prev, start_date: e.target.value }))
                  }
                  className="w-full border rounded-md px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Notes</label>
                <textarea
                  value={tripForm.notes}
                  onChange={(e) =>
                    setTripForm((prev) => ({ ...prev, notes: e.target.value }))
                  }
                  className="w-full border rounded-md px-3 py-2"
                  rows={3}
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowStartTrip(false)}
                className="px-4 py-2 border rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={handleStartTrip}
                className="px-4 py-2 bg-primary text-white rounded-md flex items-center gap-2"
              >
                <Play className="w-4 h-4" />
                Start Trip
              </button>
            </div>
          </div>
        </div>
      )}

      {showEndTrip && trip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">End Day Trip</h3>
              <button onClick={() => setShowEndTrip(false)}>
                <XCircle className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-gray-50 rounded-md p-3 text-sm">
                <div className="flex items-center gap-2 text-gray-700">
                  <Navigation className="w-4 h-4" />
                  Start KM: {trip.start_km}
                </div>
                <div className="flex items-center gap-2 text-gray-700 mt-2">
                  <Clock className="w-4 h-4" />
                  Started at: {new Date(trip.start_time).toLocaleTimeString()}
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">End KM</label>
                <input
                  type="number"
                  value={endTripForm.end_km}
                  onChange={(e) =>
                    setEndTripForm((prev) => ({ ...prev, end_km: e.target.value }))
                  }
                  className="w-full border rounded-md px-3 py-2"
                  placeholder="Enter final odometer"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Notes</label>
                <textarea
                  value={endTripForm.notes}
                  onChange={(e) =>
                    setEndTripForm((prev) => ({ ...prev, notes: e.target.value }))
                  }
                  className="w-full border rounded-md px-3 py-2"
                  rows={3}
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowEndTrip(false)}
                className="px-4 py-2 border rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={handleEndTrip}
                className="px-4 py-2 bg-red-600 text-white rounded-md flex items-center gap-2"
              >
                <StopCircle className="w-4 h-4" />
                End Trip
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
