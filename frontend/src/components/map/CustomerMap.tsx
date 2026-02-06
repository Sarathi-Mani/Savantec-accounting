"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl, { Map, Marker, Popup } from "maplibre-gl";
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
}

export default function CustomerMap({
  mapId,
  center,
  zoom,
  customers,
  currentLocation,
  onMarkerClick,
}: CustomerMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);
  const markersRef = useRef<Map<string, Marker>>(new Map());
  const currentMarkerRef = useRef<Marker | null>(null);
  const [mapSupported, setMapSupported] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  // Initialize map only once
  useEffect(() => {
    setIsMounted(true);
    
    if (!maplibregl.supported()) {
      setMapSupported(false);
    }

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
    if (!isMounted || !containerRef.current || !maplibregl.supported()) return;

    if (!mapRef.current) {
      try {
        mapRef.current = new maplibregl.Map({
          container: containerRef.current,
          style: "https://demotiles.maplibre.org/style.json",
          center,
          zoom,
          attributionControl: false,
        });

        mapRef.current.addControl(new maplibregl.NavigationControl(), "top-right");
        
        // Add attribution control separately
        mapRef.current.addControl(new maplibregl.AttributionControl({
          compact: true,
        }));

        // Ensure map is loaded before adding markers
        mapRef.current.on('load', () => {
          updateMarkers();
          updateCurrentLocationMarker();
        });
      } catch (error) {
        console.error("Failed to initialize map:", error);
        setMapSupported(false);
      }
    }

    // Update map center and zoom when props change
    if (mapRef.current) {
      mapRef.current.setCenter(center);
      mapRef.current.setZoom(zoom);
    }
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
        currentMarkerRef.current = new maplibregl.Marker({ element: el })
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

        const popup = new Popup({ offset: 12 }).setHTML(popupHtml);
        const marker = new Marker({ element: markerEl })
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