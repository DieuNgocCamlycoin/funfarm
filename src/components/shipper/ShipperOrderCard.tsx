import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MapPin, Package, Navigation, CheckCircle, Clock, User } from 'lucide-react';
import camlyIcon from '@/assets/camly_coin.png';

interface Order {
  id: string;
  product_name: string;
  quantity_kg: number;
  total_camly: number;
  delivery_address: string;
  delivery_lat: number | null;
  delivery_lng: number | null;
  status: string;
  created_at: string;
  buyer_profile?: { display_name: string; avatar_url: string };
  seller_profile?: { display_name: string; avatar_url: string };
  post?: { location_lat: number; location_lng: number; location_address: string };
}

interface ShipperOrderCardProps {
  order: Order;
  shipperLocation: { lat: number; lng: number } | null;
  isMyDelivery?: boolean;
  onAccept?: () => void;
  onComplete?: () => void;
}

const calculateDistance = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const ShipperOrderCard = ({
  order,
  shipperLocation,
  isMyDelivery,
  onAccept,
  onComplete
}: ShipperOrderCardProps) => {
  const pickupDistance = shipperLocation && order.post
    ? calculateDistance(
        shipperLocation.lat,
        shipperLocation.lng,
        order.post.location_lat,
        order.post.location_lng
      )
    : null;

  const deliveryDistance = order.post && order.delivery_lat && order.delivery_lng
    ? calculateDistance(
        order.post.location_lat,
        order.post.location_lng,
        order.delivery_lat,
        order.delivery_lng
      )
    : null;

  const totalDistance = pickupDistance && deliveryDistance
    ? pickupDistance + deliveryDistance
    : null;

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-500',
    delivering: 'bg-blue-500',
    delivered: 'bg-green-500'
  };

  const statusLabels: Record<string, string> = {
    pending: 'Chờ nhận',
    delivering: 'Đang giao',
    delivered: 'Đã giao'
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <Package className="w-10 h-10 text-primary p-2 bg-primary/10 rounded-lg" />
            <div>
              <h3 className="font-semibold text-lg">{order.product_name}</h3>
              <p className="text-sm text-muted-foreground">
                {order.quantity_kg} kg
              </p>
            </div>
          </div>
          <Badge className={`${statusColors[order.status]} text-white`}>
            {statusLabels[order.status]}
          </Badge>
        </div>

        {/* Price */}
        <div className="flex items-center gap-2 mb-4 p-2 bg-muted rounded-lg">
          <img src={camlyIcon} alt="CAMLY" className="w-5 h-5" />
          <span className="font-bold text-lg">{order.total_camly.toLocaleString()}</span>
          <span className="text-sm text-muted-foreground">CAMLY</span>
          <span className="ml-auto text-sm text-green-600 font-medium">
            +5,000 phí ship
          </span>
        </div>

        {/* Seller & Buyer */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="flex items-center gap-2">
            <Avatar className="w-8 h-8">
              <AvatarImage src={order.seller_profile?.avatar_url} />
              <AvatarFallback><User className="w-4 h-4" /></AvatarFallback>
            </Avatar>
            <div>
              <p className="text-xs text-muted-foreground">Người bán</p>
              <p className="text-sm font-medium truncate">
                {order.seller_profile?.display_name || 'Ẩn danh'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Avatar className="w-8 h-8">
              <AvatarImage src={order.buyer_profile?.avatar_url} />
              <AvatarFallback><User className="w-4 h-4" /></AvatarFallback>
            </Avatar>
            <div>
              <p className="text-xs text-muted-foreground">Người mua</p>
              <p className="text-sm font-medium truncate">
                {order.buyer_profile?.display_name || 'Ẩn danh'}
              </p>
            </div>
          </div>
        </div>

        {/* Locations */}
        <div className="space-y-2 mb-4">
          {order.post && (
            <div className="flex items-start gap-2 text-sm">
              <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                <MapPin className="w-3 h-3 text-white" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Lấy hàng</p>
                <p className="text-sm">{order.post.location_address}</p>
                {pickupDistance && (
                  <p className="text-xs text-primary font-medium">
                    Cách bạn {pickupDistance.toFixed(1)} km
                  </p>
                )}
              </div>
            </div>
          )}
          
          {order.delivery_address && (
            <div className="flex items-start gap-2 text-sm">
              <div className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0">
                <Navigation className="w-3 h-3 text-white" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Giao đến</p>
                <p className="text-sm">{order.delivery_address}</p>
                {deliveryDistance && (
                  <p className="text-xs text-muted-foreground">
                    Cách điểm lấy {deliveryDistance.toFixed(1)} km
                  </p>
                )}
              </div>
            </div>
          )}

          {totalDistance && (
            <div className="flex items-center gap-2 text-sm font-medium text-primary mt-2">
              <Navigation className="w-4 h-4" />
              Tổng quãng đường: ~{totalDistance.toFixed(1)} km
            </div>
          )}
        </div>

        {/* Time */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
          <Clock className="w-3 h-3" />
          {new Date(order.created_at).toLocaleString('vi-VN')}
        </div>

        {/* Actions */}
        {!isMyDelivery && onAccept && (
          <Button onClick={onAccept} className="w-full gap-2">
            <Package className="w-4 h-4" />
            Nhận giao đơn này
          </Button>
        )}

        {isMyDelivery && onComplete && order.status === 'delivering' && (
          <Button onClick={onComplete} className="w-full gap-2" variant="default">
            <CheckCircle className="w-4 h-4" />
            Hoàn thành giao hàng
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default ShipperOrderCard;
