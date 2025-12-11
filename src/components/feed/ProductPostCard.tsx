import { useState } from "react";
import { 
  Leaf, 
  Heart, 
  Sparkles, 
  Star,
  MapPin,
  Package,
  Truck,
  TreeDeciduous,
  ShoppingCart,
  BadgeCheck,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import LocationDisplay from "@/components/map/LocationDisplay";
import camlyIcon from "@/assets/camly_coin.png";

interface ProductPostCardProps {
  productName: string;
  priceCamly?: number | null;
  priceVnd?: number | null;
  quantityKg?: number | null;
  locationAddress?: string | null;
  locationLat?: number | null;
  locationLng?: number | null;
  deliveryOptions?: string[] | null;
  commitments?: string[] | null;
  onBuyClick?: () => void;
}

const COMMITMENT_CONFIG: Record<string, { label: string; icon: typeof Leaf; color: string; bgColor: string }> = {
  organic: { 
    label: "100% Hữu cơ", 
    icon: Leaf, 
    color: "text-green-600",
    bgColor: "bg-green-100"
  },
  no_preservatives: { 
    label: "Không chất bảo quản", 
    icon: Sparkles, 
    color: "text-blue-600",
    bgColor: "bg-blue-100"
  },
  grown_with_love: { 
    label: "Trồng bằng tình yêu", 
    icon: Heart, 
    color: "text-pink-600",
    bgColor: "bg-pink-100"
  },
  blessed_by_father: { 
    label: "Được Cha Vũ Trụ ban phước", 
    icon: Star, 
    color: "text-yellow-600",
    bgColor: "bg-yellow-100"
  },
};

const DELIVERY_CONFIG: Record<string, { label: string; icon: typeof Package }> = {
  self_pickup: { label: "Tự đến lấy", icon: Package },
  nationwide: { label: "Giao toàn quốc", icon: Truck },
  farm_visit: { label: "Đến vườn trải nghiệm", icon: TreeDeciduous },
};

export default function ProductPostCard({
  productName,
  priceCamly,
  priceVnd,
  quantityKg,
  locationAddress,
  locationLat,
  locationLng,
  deliveryOptions,
  commitments,
  onBuyClick,
}: ProductPostCardProps) {
  const [showMap, setShowMap] = useState(false);
  const hasValidLocation = locationLat && locationLng;
  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('vi-VN').format(num);
  };

  return (
    <Card className="mt-4 p-4 bg-gradient-to-br from-green-50 to-yellow-50 border-green-200">
      {/* Product header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-green-100 rounded-full">
            <Leaf className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <h3 className="font-bold text-green-800 text-lg">{productName}</h3>
            {quantityKg && (
              <p className="text-sm text-muted-foreground">
                Còn {formatNumber(quantityKg)} kg
              </p>
            )}
          </div>
        </div>
        
        {/* Price badge */}
        {priceCamly && (
          <div className="text-right">
            <div className="flex items-center gap-1 bg-yellow-100 px-3 py-1 rounded-full">
              <img src={camlyIcon} alt="CAMLY" className="w-5 h-5" />
              <span className="font-bold text-yellow-700">
                {formatNumber(priceCamly)}
              </span>
              <span className="text-xs text-yellow-600">/kg</span>
            </div>
            {priceVnd && (
              <p className="text-xs text-muted-foreground mt-1">
                ≈ {formatNumber(priceVnd)} VNĐ/kg
              </p>
            )}
          </div>
        )}
      </div>

      {/* Commitment badges - lấp lánh */}
      {commitments && commitments.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {commitments.map(commitment => {
            const config = COMMITMENT_CONFIG[commitment];
            if (!config) return null;
            const Icon = config.icon;
            return (
              <Badge
                key={commitment}
                variant="secondary"
                className={`${config.bgColor} ${config.color} border-0 flex items-center gap-1 animate-pulse`}
              >
                <Icon className="h-3 w-3" />
                {config.label}
                <BadgeCheck className="h-3 w-3 ml-1" />
              </Badge>
            );
          })}
        </div>
      )}

      {/* Delivery options */}
      {deliveryOptions && deliveryOptions.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {deliveryOptions.map(option => {
            const config = DELIVERY_CONFIG[option];
            if (!config) return null;
            const Icon = config.icon;
            return (
              <Badge
                key={option}
                variant="outline"
                className="border-green-300 text-green-700 flex items-center gap-1"
              >
                <Icon className="h-3 w-3" />
                {config.label}
              </Badge>
            );
          })}
        </div>
      )}

      {/* Location with Map */}
      {(locationAddress || hasValidLocation) && (
        <div className="mb-4">
          {hasValidLocation ? (
            <div className="space-y-2">
              <button
                onClick={() => setShowMap(!showMap)}
                className="flex items-center justify-between w-full p-2 bg-white/50 rounded-lg hover:bg-white/80 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-red-500 flex-shrink-0" />
                  <p className="text-sm text-gray-700 text-left line-clamp-1">{locationAddress}</p>
                </div>
                {showMap ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
              
              {showMap && (
                <LocationDisplay
                  lat={locationLat}
                  lng={locationLng}
                  address={locationAddress || undefined}
                  productName={productName}
                  showDistance={true}
                />
              )}
            </div>
          ) : locationAddress ? (
            <div className="flex items-start gap-2 p-2 bg-white/50 rounded-lg">
              <MapPin className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-gray-700">{locationAddress}</p>
            </div>
          ) : null}
        </div>
      )}

      {/* Buy button */}
      {priceCamly && (
        <Button
          onClick={onBuyClick}
          className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white text-lg py-6 rounded-xl shadow-lg hover:shadow-xl transition-all"
        >
          <ShoppingCart className="h-5 w-5 mr-2" />
          Mua ngay
          <Sparkles className="h-4 w-4 ml-2 animate-pulse" />
        </Button>
      )}
    </Card>
  );
}
