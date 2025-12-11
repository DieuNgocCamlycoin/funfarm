import { useEffect, useState, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapPin, Navigation } from "lucide-react";

// Fix Leaflet default marker icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

interface LocationDisplayProps {
  lat: number;
  lng: number;
  address?: string;
  productName?: string;
  showDistance?: boolean;
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function LocationDisplay({
  lat,
  lng,
  address,
  productName,
  showDistance = true,
}: LocationDisplayProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const [distance, setDistance] = useState<number | null>(null);

  // Get user location for distance
  useEffect(() => {
    if (showDistance && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const userLat = pos.coords.latitude;
          const userLng = pos.coords.longitude;
          setDistance(calculateDistance(userLat, userLng, lat, lng));
        },
        () => {
          // Silent fail - user denied location access
        },
        { enableHighAccuracy: false, timeout: 5000 }
      );
    }
  }, [lat, lng, showDistance]);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      scrollWheelZoom: false,
      dragging: false,
      zoomControl: false,
    }).setView([lat, lng], 14);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
    }).addTo(map);

    const marker = L.marker([lat, lng]).addTo(map);
    marker.bindPopup(`<div class="text-sm"><p class="font-medium">${productName || "Vị trí sản phẩm"}</p>${address ? `<p class="text-xs mt-1">${address}</p>` : ""}</div>`);

    mapRef.current = map;

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [lat, lng, address, productName]);

  const formatDistance = (km: number): string => {
    if (km < 1) {
      return `${Math.round(km * 1000)} m`;
    }
    return `${km.toFixed(1)} km`;
  };

  return (
    <div className="space-y-2">
      {/* Distance indicator */}
      {distance !== null && (
        <div className="flex items-center gap-2 text-sm">
          <Navigation className="h-4 w-4 text-blue-500" />
          <span className="text-blue-600 font-medium">
            Cách bạn {formatDistance(distance)}
          </span>
        </div>
      )}

      {/* Mini map */}
      <div
        ref={mapContainerRef}
        className="h-[150px] rounded-lg overflow-hidden border border-border"
      />

      {/* Address */}
      {address && (
        <div className="flex items-start gap-2">
          <MapPin className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-muted-foreground">{address}</p>
        </div>
      )}
    </div>
  );
}
