import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Star, Heart, ShoppingCart, Leaf, Shield, Sparkles, BadgeCheck } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MarketplaceProduct, PRODUCT_CATEGORIES } from '@/types/marketplace';
import camlyIcon from '@/assets/camly_coin.png';

interface ProductCardProps {
  product: MarketplaceProduct;
  onBuyClick: (product: MarketplaceProduct) => void;
  onSaveToggle?: (productId: string, isSaved: boolean) => void;
}

const COMMITMENT_ICONS: Record<string, { icon: React.ReactNode; label: string }> = {
  organic: { icon: <Leaf className="w-3 h-3" />, label: 'Hữu cơ' },
  no_preservatives: { icon: <Shield className="w-3 h-3" />, label: 'Không bảo quản' },
  love: { icon: <Sparkles className="w-3 h-3" />, label: 'Tâm huyết' },
};

export const ProductCard: React.FC<ProductCardProps> = ({ 
  product, 
  onBuyClick, 
  onSaveToggle 
}) => {
  const category = PRODUCT_CATEGORIES.find(c => c.id === product.category);
  
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN').format(price);
  };

  const handleSaveClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onSaveToggle?.(product.id, !product.is_saved);
  };

  const handleBuyClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onBuyClick(product);
  };

  return (
    <Card className="group overflow-hidden border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
      {/* Product Image */}
      <div className="relative aspect-square overflow-hidden bg-muted">
        {product.images?.[0] ? (
          <img 
            src={product.images[0]} 
            alt={product.product_name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl bg-gradient-to-br from-primary/10 to-secondary/10">
            {category?.icon || '🌾'}
          </div>
        )}

        {/* Category Badge */}
        {category && (
          <Badge 
            className={`absolute top-2 left-2 ${category.color} text-white border-0`}
          >
            {category.icon} {category.nameVi}
          </Badge>
        )}

        {/* Save Button */}
        <button
          onClick={handleSaveClick}
          className={`absolute top-2 right-2 p-2 rounded-full transition-all ${
            product.is_saved 
              ? 'bg-red-500 text-white' 
              : 'bg-white/80 text-muted-foreground hover:bg-white hover:text-red-500'
          }`}
        >
          <Heart className={`w-4 h-4 ${product.is_saved ? 'fill-current' : ''}`} />
        </button>

        {/* Sold Out Overlay */}
        {(product.product_status === 'sold_out' || product.quantity_kg <= 0) && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <Badge variant="destructive" className="text-lg px-4 py-2">
              HẾT HÀNG
            </Badge>
          </div>
        )}

        {/* Low Stock Badge */}
        {product.quantity_kg > 0 && product.quantity_kg <= 5 && product.product_status !== 'sold_out' && (
          <Badge className="absolute bottom-2 left-2 bg-amber-500 text-white border-0">
            ⚠️ Còn {product.quantity_kg} kg
          </Badge>
        )}
      </div>

      <CardContent className="p-3 space-y-2">
        {/* Product Name */}
        <h3 className="font-semibold text-sm line-clamp-2 min-h-[2.5rem] group-hover:text-primary transition-colors">
          {product.product_name}
        </h3>

        {/* Price */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-primary font-bold">
            <img src={camlyIcon} alt="CLC" className="w-4 h-4" />
            <span>{formatPrice(product.price_camly)}</span>
          </div>
          {product.price_vnd > 0 && (
            <span className="text-xs text-muted-foreground">
              ≈ {formatPrice(product.price_vnd)}đ
            </span>
          )}
        </div>

        {/* Quantity */}
        <p className="text-xs text-muted-foreground">
          Còn {product.quantity_kg} kg
        </p>

        {/* Commitments */}
        {product.commitments?.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {product.commitments.slice(0, 3).map((commitment) => {
              const info = COMMITMENT_ICONS[commitment];
              if (!info) return null;
              return (
                <Badge 
                  key={commitment} 
                  variant="outline" 
                  className="text-[10px] px-1 py-0 gap-0.5 border-primary/30 text-primary"
                >
                  {info.icon}
                  {info.label}
                </Badge>
              );
            })}
          </div>
        )}

        {/* Seller Info */}
        {product.author && (
          <Link 
            to={`/user/${product.author.id}`}
            className="flex items-center gap-2 pt-2 border-t border-border/50"
            onClick={(e) => e.stopPropagation()}
          >
            <Avatar className="w-6 h-6">
              <AvatarImage src={product.author.avatar_url || ''} />
              <AvatarFallback className="text-[10px]">
                {product.author.display_name?.[0] || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1">
                <span className="text-xs font-medium truncate">
                  {product.author.display_name || 'Nông dân'}
                </span>
                {product.author.is_verified && <BadgeCheck className="w-3 h-3 text-primary" />}
                {product.author.is_good_heart && <span className="text-[10px]">💚</span>}
              </div>
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                {/* Rating & Reviews */}
                {(product.average_rating !== undefined && product.average_rating > 0) || (product.review_count !== undefined && product.review_count > 0) ? (
                  <span className="flex items-center gap-0.5">
                    <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                    {product.average_rating ? product.average_rating.toFixed(1) : '0.0'}
                    {product.review_count !== undefined && product.review_count > 0 && (
                      <span className="text-muted-foreground">({product.review_count})</span>
                    )}
                  </span>
                ) : null}
                {product.distance_km !== undefined && product.distance_km > 0 && (
                  <span className="flex items-center gap-0.5">
                    <MapPin className="w-3 h-3" />
                    {product.distance_km < 1 
                      ? `${Math.round(product.distance_km * 1000)}m` 
                      : `${product.distance_km.toFixed(1)}km`
                    }
                  </span>
                )}
              </div>
            </div>
          </Link>
        )}

        {/* Buy Button */}
        <Button 
          onClick={handleBuyClick}
          disabled={product.product_status === 'sold_out' || product.quantity_kg <= 0}
          className="w-full mt-2 gap-2"
          size="sm"
        >
          <ShoppingCart className="w-4 h-4" />
          {product.product_status === 'sold_out' || product.quantity_kg <= 0 ? 'Hết hàng' : 'Mua ngay'}
        </Button>

        {/* Link to product detail */}
        <Link 
          to={`/product/${product.id}`}
          onClick={(e) => e.stopPropagation()}
          className="block text-center text-xs text-muted-foreground hover:text-primary mt-2 transition-colors"
        >
          Xem chi tiết →
        </Link>
      </CardContent>
    </Card>
  );
};
