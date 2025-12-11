import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { supabase } from '@/integrations/supabase/client';

interface Location {
  lat: number;
  lng: number;
  address?: string;
}

interface OrderTrackingMapProps {
  orderId: string;
  pickupLocation?: Location;
  deliveryLocation?: Location;
  shipperId?: string;
}

const OrderTrackingMap = ({ 
  orderId, 
  pickupLocation, 
  deliveryLocation,
  shipperId 
}: OrderTrackingMapProps) => {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const shipperMarkerRef = useRef<L.Marker | null>(null);
  const [shipperLocation, setShipperLocation] = useState<Location | null>(null);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const defaultCenter = pickupLocation || deliveryLocation || { lat: 10.8231, lng: 106.6297 };

    mapRef.current = L.map(mapContainerRef.current).setView(
      [defaultCenter.lat, defaultCenter.lng],
      13
    );

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap'
    }).addTo(mapRef.current);

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Subscribe to shipper location updates
  useEffect(() => {
    if (!shipperId) return;

    // Fetch initial location
    const fetchShipperLocation = async () => {
      const { data, error } = await supabase
        .from('shipper_locations')
        .select('lat, lng')
        .eq('shipper_id', shipperId)
        .single();

      if (!error && data) {
        setShipperLocation({ lat: data.lat, lng: data.lng });
      }
    };

    fetchShipperLocation();

    // Subscribe to realtime updates
    const channel = supabase
      .channel(`shipper-location-${shipperId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'shipper_locations',
          filter: `shipper_id=eq.${shipperId}`
        },
        (payload) => {
          console.log('Shipper location update:', payload);
          if (payload.new && 'lat' in payload.new && 'lng' in payload.new) {
            setShipperLocation({ 
              lat: payload.new.lat as number, 
              lng: payload.new.lng as number 
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [shipperId]);

  // Update markers
  useEffect(() => {
    if (!mapRef.current) return;

    const bounds: L.LatLngExpression[] = [];

    // Clear existing markers except base tile layer
    mapRef.current.eachLayer((layer) => {
      if (layer instanceof L.Marker || layer instanceof L.Polyline) {
        mapRef.current?.removeLayer(layer);
      }
    });

    // Pickup marker (green)
    if (pickupLocation) {
      const pickupIcon = L.divIcon({
        className: 'custom-div-icon',
        html: `<div style="background: #22c55e; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
        </div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 32]
      });

      L.marker([pickupLocation.lat, pickupLocation.lng], { icon: pickupIcon })
        .addTo(mapRef.current)
        .bindPopup(`🏪 Lấy hàng: ${pickupLocation.address || 'Địa điểm lấy hàng'}`);
      bounds.push([pickupLocation.lat, pickupLocation.lng]);
    }

    // Delivery marker (red)
    if (deliveryLocation) {
      const deliveryIcon = L.divIcon({
        className: 'custom-div-icon',
        html: `<div style="background: #ef4444; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
        </div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 32]
      });

      L.marker([deliveryLocation.lat, deliveryLocation.lng], { icon: deliveryIcon })
        .addTo(mapRef.current)
        .bindPopup(`🏠 Giao đến: ${deliveryLocation.address || 'Địa điểm giao hàng'}`);
      bounds.push([deliveryLocation.lat, deliveryLocation.lng]);
    }

    // Shipper marker (blue - animated)
    if (shipperLocation) {
      const shipperIcon = L.divIcon({
        className: 'custom-div-icon shipper-marker',
        html: `<div style="background: #3b82f6; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 3px solid white; box-shadow: 0 2px 12px rgba(59,130,246,0.5); animation: pulse 2s infinite;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
            <circle cx="18.5" cy="17.5" r="3.5"/>
            <circle cx="5.5" cy="17.5" r="3.5"/>
            <circle cx="15" cy="5" r="1"/>
            <path d="M12 17.5V14l-3-3 4-3 2 3h2"/>
          </svg>
        </div>
        <style>
          @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.1); }
          }
        </style>`,
        iconSize: [36, 36],
        iconAnchor: [18, 18]
      });

      if (shipperMarkerRef.current) {
        shipperMarkerRef.current.setLatLng([shipperLocation.lat, shipperLocation.lng]);
      } else {
        shipperMarkerRef.current = L.marker([shipperLocation.lat, shipperLocation.lng], { icon: shipperIcon })
          .addTo(mapRef.current)
          .bindPopup('🚴 Shipper đang giao');
      }
      bounds.push([shipperLocation.lat, shipperLocation.lng]);
    }

    // Draw route line
    if (bounds.length > 1) {
      const routePoints: L.LatLngExpression[] = [];
      if (pickupLocation) routePoints.push([pickupLocation.lat, pickupLocation.lng]);
      if (shipperLocation) routePoints.push([shipperLocation.lat, shipperLocation.lng]);
      if (deliveryLocation) routePoints.push([deliveryLocation.lat, deliveryLocation.lng]);

      if (routePoints.length > 1) {
        L.polyline(routePoints, {
          color: '#3b82f6',
          weight: 4,
          opacity: 0.7,
          dashArray: '10, 10'
        }).addTo(mapRef.current);
      }
    }

    // Fit bounds
    if (bounds.length > 1) {
      mapRef.current.fitBounds(bounds as L.LatLngBoundsExpression, { padding: [50, 50] });
    } else if (bounds.length === 1) {
      mapRef.current.setView(bounds[0] as L.LatLngExpression, 15);
    }
  }, [pickupLocation, deliveryLocation, shipperLocation]);

  return (
    <div className="relative">
      <div
        ref={mapContainerRef}
        className="w-full h-[300px] rounded-lg overflow-hidden border"
      />
      {shipperId && (
        <div className="absolute bottom-2 left-2 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-2 shadow-lg">
          <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
          Theo dõi realtime
        </div>
      )}
    </div>
  );
};

export default OrderTrackingMap;
