"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-rotatedmarker";

// Fix for default markers in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "/marker-icon-2x.png",
  iconUrl: "/marker-icon.png",
  shadowUrl: "/marker-shadow.png",
});

interface EngineerMarker {
  id: string;
  name: string;
  position: [number, number] | null;
  status: string;
  isOnline: boolean;
  speed: number | null;
  heading: number | null;
  hasFraudFlag?: boolean;
}

interface MapProps {
  center: [number, number];
  zoom: number;
  engineers: EngineerMarker[];
  onMarkerClick?: (engineerId: string) => void;
}

export default function MapComponent({ center, zoom, engineers, onMarkerClick }: MapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());

  useEffect(() => {
    if (!mapRef.current) {
      mapRef.current = L.map("map").setView(center, zoom);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(mapRef.current);
    } else {
      mapRef.current.setView(center, zoom);
    }

    // Clean up previous markers
    markersRef.current.forEach((marker) => marker.removeFrom(mapRef.current!));
    markersRef.current.clear();

    // Add new markers
    engineers.forEach((engineer) => {
      if (!engineer.position) return;

      const icon = createMarkerIcon(engineer.status, engineer.isOnline, engineer.hasFraudFlag);
      
      const marker = L.marker(engineer.position as L.LatLngExpression, {
        icon,
        rotationAngle: engineer.heading || 0,
        rotationOrigin: "center center",
      })
        .addTo(mapRef.current!)
        .bindPopup(`
          <div class="p-2">
            <strong class="text-sm font-semibold">${engineer.name}</strong>
            <div class="text-xs mt-1">
              <div class="flex items-center gap-1">
                <span class="inline-block w-2 h-2 rounded-full ${
                  engineer.isOnline ? "bg-green-500" : "bg-gray-400"
                }"></span>
                ${engineer.isOnline ? "Online" : "Offline"}
              </div>
              <div class="mt-1">Status: ${engineer.status.replace("_", " ")}</div>
              ${engineer.speed ? `<div>Speed: ${engineer.speed.toFixed(0)} km/h</div>` : ""}
              ${engineer.heading ? `<div>Heading: ${engineer.heading.toFixed(0)}°</div>` : ""}
            </div>
          </div>
        `);

      if (onMarkerClick) {
        marker.on("click", () => onMarkerClick(engineer.id));
      }

      markersRef.current.set(engineer.id, marker);
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [center, zoom, engineers, onMarkerClick]);

  const createMarkerIcon = (status: string, isOnline: boolean, hasFraudFlag?: boolean) => {
    let color = "#6b7280"; // Default gray for idle/offline
    
    if (hasFraudFlag) {
      color = "#ef4444"; // Red for fraud
    } else if (isOnline) {
      switch (status) {
        case "travelling":
          color = "#3b82f6"; // Blue
          break;
        case "at_site_in":
        case "at_site_out":
          color = "#10b981"; // Green
          break;
        case "trip_started":
          color = "#8b5cf6"; // Purple
          break;
      }
    }

    return L.divIcon({
      html: `
        <div style="
          width: 24px;
          height: 24px;
          background-color: ${color};
          border: 2px solid white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
          position: relative;
        ">
          <div style="
            width: 8px;
            height: 8px;
            background-color: white;
            border-radius: 50%;
          "></div>
          <div style="
            position: absolute;
            top: -4px;
            left: -4px;
            width: 32px;
            height: 32px;
            border: 2px solid ${color};
            border-radius: 50%;
            opacity: 0.3;
            animation: pulse 2s infinite;
          "></div>
        </div>
        <style>
          @keyframes pulse {
            0% { transform: scale(1); opacity: 0.3; }
            50% { transform: scale(1.2); opacity: 0.1; }
            100% { transform: scale(1); opacity: 0.3; }
          }
        </style>
      `,
      className: "custom-marker",
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });
  };

  return <div id="map" className="w-full h-full" />;
}