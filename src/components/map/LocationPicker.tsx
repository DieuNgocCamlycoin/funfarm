import { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MapPin, Navigation, Loader2, Search } from "lucide-react";
import { toast } from "sonner";

// Fix Leaflet default marker icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

interface LocationPickerProps {
  initialLat?: number;
  initialLng?: number;
  initialAddress?: string;
  onLocationChange: (lat: number, lng: number, address: string) => void;
}

function MapClickHandler({ onLocationSelect }: { onLocationSelect: (lat: number, lng: number) => void }) {
  useMapEvents({
    click: (e) => {
      onLocationSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function MapController({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, 15);
  }, [center, map]);
  return null;
}

export default function LocationPicker({
  initialLat,
  initialLng,
  initialAddress = "",
  onLocationChange,
}: LocationPickerProps) {
  const [position, setPosition] = useState<[number, number] | null>(
    initialLat && initialLng ? [initialLat, initialLng] : null
  );
  const [address, setAddress] = useState(initialAddress);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const mapRef = useRef<L.Map | null>(null);

  // Default center: Vietnam
  const defaultCenter: [number, number] = [14.0583, 108.2772];

  const handleLocationSelect = async (lat: number, lng: number) => {
    setPosition([lat, lng]);
    
    // Reverse geocoding using Nominatim
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`,
        { headers: { "Accept-Language": "vi" } }
      );
      const data = await response.json();
      const newAddress = data.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
      setAddress(newAddress);
      onLocationChange(lat, lng, newAddress);
    } catch {
      const newAddress = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
      setAddress(newAddress);
      onLocationChange(lat, lng, newAddress);
    }
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Trình duyệt không hỗ trợ định vị");
      return;
    }

    setIsGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        handleLocationSelect(pos.coords.latitude, pos.coords.longitude);
        setIsGettingLocation(false);
      },
      (error) => {
        console.error("Geolocation error:", error);
        toast.error("Không thể lấy vị trí. Vui lòng cho phép truy cập vị trí.");
        setIsGettingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const searchLocation = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&countrycodes=vn&limit=1`,
        { headers: { "Accept-Language": "vi" } }
      );
      const data = await response.json();
      
      if (data.length > 0) {
        const { lat, lon, display_name } = data[0];
        setPosition([parseFloat(lat), parseFloat(lon)]);
        setAddress(display_name);
        onLocationChange(parseFloat(lat), parseFloat(lon), display_name);
      } else {
        toast.error("Không tìm thấy địa điểm");
      }
    } catch {
      toast.error("Lỗi tìm kiếm địa điểm");
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Search bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Tìm địa điểm..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && searchLocation()}
            className="pl-9"
          />
        </div>
        <Button 
          type="button" 
          variant="outline" 
          onClick={searchLocation}
          disabled={isSearching}
        >
          {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Tìm"}
        </Button>
      </div>

      {/* Get current location button */}
      <Button
        type="button"
        variant="outline"
        onClick={getCurrentLocation}
        disabled={isGettingLocation}
        className="w-full gap-2"
      >
        {isGettingLocation ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Đang lấy vị trí...
          </>
        ) : (
          <>
            <Navigation className="h-4 w-4" />
            Dùng vị trí hiện tại của tôi
          </>
        )}
      </Button>

      {/* Map */}
      <div className="h-[250px] rounded-xl overflow-hidden border border-border">
        <MapContainer
          center={position || defaultCenter}
          zoom={position ? 15 : 6}
          style={{ height: "100%", width: "100%" }}
          ref={(map) => { if (map) mapRef.current = map; }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapClickHandler onLocationSelect={handleLocationSelect} />
          {position && (
            <>
              <Marker position={position} />
              <MapController center={position} />
            </>
          )}
        </MapContainer>
      </div>

      {/* Selected address */}
      {position && (
        <div className="flex items-start gap-2 p-3 bg-green-50 rounded-lg border border-green-200">
          <MapPin className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm text-green-700 font-medium">Vị trí đã chọn:</p>
            <p className="text-sm text-green-600">{address}</p>
          </div>
        </div>
      )}

      <p className="text-xs text-muted-foreground text-center">
        Nhấn vào bản đồ để chọn vị trí hoặc tìm kiếm địa điểm
      </p>
    </div>
  );
}
