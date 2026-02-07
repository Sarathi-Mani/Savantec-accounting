"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as MapLibreMap } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

export type CustomerMarker = {
  id: string;
  name: string;
  position: [number, number] | null;
  status: "planned" | "active" | "in" | "completed";
  visitedBy?: string;
  visitedAt?: string;
  distanceKm?: number | null;
};

interface CustomerMapProps {
  mapId: string;
  center: [number, number];
  zoom: number;
  customers: CustomerMarker[];
  currentLocation?: [number, number] | null;
  onMarkerClick?: (customerId: string) => void;
  selectedCustomerId?: string | null;
  focusZoom?: number;
}

export default function CustomerMap({
  mapId,
  center,
  zoom,
  customers,
  currentLocation,
  onMarkerClick,
  selectedCustomerId,
  focusZoom = 16,
}: CustomerMapProps) {
  const toLngLat = (latLng: [number, number]) =>
    [latLng[1], latLng[0]] as [number, number];
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
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<Map<string, any>>(new Map());
  const currentMarkerRef = useRef<any | null>(null);
  const [mapSupported, setMapSupported] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const maplibreRef = useRef<any>(null);

  // Initialize map only once
  useEffect(() => {
    setIsMounted(true);

    return () => {
      // Cleanup on unmount
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      markersRef.current.clear();
      if (currentMarkerRef.current) {
        currentMarkerRef.current.remove();
        currentMarkerRef.current = null;
      }
    };
  }, []);

  // Initialize map
  useEffect(() => {
    if (!isMounted || !containerRef.current) return;

    const init = async () => {
      try {
        const mod: any = await import("maplibre-gl");
        const maplibre = mod?.default ?? mod;
        maplibreRef.current = maplibre;
        if (!mapRef.current) {
          mapRef.current = new maplibre.Map({
            container: containerRef.current!,
            style: OSM_STYLE,
            center: toLngLat(center),
            zoom,
            attributionControl: false,
          });

          mapRef.current.addControl(new maplibre.NavigationControl(), "top-right");
          mapRef.current.addControl(new maplibre.AttributionControl({ compact: true }));

          mapRef.current.on("load", () => {
            updateMarkers();
            updateCurrentLocationMarker();
          });
        }

        if (mapRef.current) {
          mapRef.current.setCenter(toLngLat(center));
          mapRef.current.setZoom(zoom);
        }
      } catch (error) {
        console.error("Failed to initialize map:", error);
        setMapSupported(false);
      }
    };

    init();
  }, [isMounted, center, zoom]);

  // Update markers when customers change
  useEffect(() => {
    if (!mapRef.current || !isMounted) return;
    
    // If map hasn't loaded yet, wait for load event
    if (!mapRef.current.loaded()) {
      const onLoad = () => {
        updateMarkers();
        updateCurrentLocationMarker();
      };
      mapRef.current.on('load', onLoad);
      return () => {
        mapRef.current?.off('load', onLoad);
      };
    } else {
      updateMarkers();
      updateCurrentLocationMarker();
    }
  }, [customers, currentLocation, onMarkerClick, isMounted]);

  // Fly to selected customer or reset to default view
  useEffect(() => {
    if (!mapRef.current || !isMounted) return;
    const map = mapRef.current;
    if (selectedCustomerId) {
      const customer = customers.find((c) => c.id === selectedCustomerId);
      if (customer?.position) {
        map.flyTo({
          center: [customer.position[1], customer.position[0]],
          zoom: focusZoom,
          essential: true,
        });
      }
      return;
    }
    map.flyTo({
      center: toLngLat(center),
      zoom,
      essential: true,
    });
  }, [selectedCustomerId, customers, center, zoom, focusZoom, isMounted]);

  const updateCurrentLocationMarker = () => {
    if (!mapRef.current || !isMounted) return;

    // Remove existing current location marker
    if (currentMarkerRef.current) {
      currentMarkerRef.current.remove();
      currentMarkerRef.current = null;
    }

    // Add new current location marker if available
    if (currentLocation) {
      try {
        const el = createCurrentLocationElement();
        const maplibre = maplibreRef.current;
        if (!maplibre) return;
        currentMarkerRef.current = new maplibre.Marker({ element: el })
          .setLngLat([currentLocation[1], currentLocation[0]])
          .addTo(mapRef.current);
      } catch (error) {
        console.error("Failed to add current location marker:", error);
      }
    }
  };

  const updateMarkers = () => {
    if (!mapRef.current || !isMounted) return;

    // Clean up previous markers
    markersRef.current.forEach((marker) => {
      try {
        marker.remove();
      } catch (error) {
        console.error("Error removing marker:", error);
      }
    });
    markersRef.current.clear();

    // Add new markers
    customers.forEach((customer) => {
      if (!customer.position) return;

      try {
        const markerEl = createCustomerElement(customer.status);
        const popupHtml = `
          <div style="font-size:12px;">
            <div style="font-weight:600; margin-bottom:4px;">${customer.name}</div>
            <div>Status: ${customer.status}</div>
            ${
              customer.distanceKm
                ? `<div>Distance: ${customer.distanceKm.toFixed(2)} km</div>`
                : ""
            }
            ${customer.visitedBy ? `<div>Visited by ${customer.visitedBy}</div>` : ""}
            ${
              customer.visitedAt
                ? `<div>${new Date(customer.visitedAt).toLocaleString()}</div>`
                : ""
            }
          </div>
        `;

        const maplibre = maplibreRef.current;
        if (!maplibre) return;
        const popup = new maplibre.Popup({ offset: 12 }).setHTML(popupHtml);
        const marker = new maplibre.Marker({ element: markerEl })
          .setLngLat([customer.position[1], customer.position[0]])
          .setPopup(popup)
          .addTo(mapRef.current!);

        if (onMarkerClick) {
          markerEl.addEventListener("click", () => onMarkerClick(customer.id));
        }

        markersRef.current.set(customer.id, marker);
      } catch (error) {
        console.error("Failed to create marker for customer:", customer.id, error);
      }
    });
  };

  if (!isMounted) {
    return (
      <div className="w-full h-full flex items-center justify-center text-sm text-gray-600">
        Loading map...
      </div>
    );
  }

  if (!mapSupported) {
    return (
      <div className="w-full h-full flex items-center justify-center text-sm text-gray-600">
        Map not supported in this browser/device.
      </div>
    );
  }

  return <div id={mapId} ref={containerRef} className="w-full h-full" />;
}

const createCustomerElement = (status: CustomerMarker["status"]) => {
  const colorMap: Record<CustomerMarker["status"], string> = {
    planned: "#6b7280",
    active: "#f59e0b",
    in: "#10b981",
    completed: "#3b82f6",
  };
  const color = colorMap[status] || "#6b7280";

  const el = document.createElement("div");
  el.style.width = "22px";
  el.style.height = "22px";
  el.style.backgroundColor = color;
  el.style.border = "2px solid white";
  el.style.borderRadius = "50%";
  el.style.display = "flex";
  el.style.alignItems = "center";
  el.style.justifyContent = "center";
  el.style.boxShadow = "0 2px 4px rgba(0,0,0,0.2)";
  el.style.cursor = "pointer";

  const inner = document.createElement("div");
  inner.style.width = "8px";
  inner.style.height = "8px";
  inner.style.backgroundColor = "white";
  inner.style.borderRadius = "50%";
  el.appendChild(inner);

  return el;
};

const createCurrentLocationElement = () => {
  const el = document.createElement("div");
  el.style.width = "18px";
  el.style.height = "18px";
  el.style.backgroundColor = "#111827";
  el.style.border = "2px solid white";
  el.style.borderRadius = "50%";
  el.style.boxShadow = "0 2px 4px rgba(0,0,0,0.2)";
  return el;
};
