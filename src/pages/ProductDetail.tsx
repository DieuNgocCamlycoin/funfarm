// 🌱 Divine Mantra: "Farmers rich, Eaters happy. Farm to Table, Fair & Fast."
import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, Heart, ShoppingCart, MapPin, Star, BadgeCheck, 
  Share2, MessageCircle, Leaf, Shield, Sparkles, Truck, Store,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { PRODUCT_CATEGORIES, ProductCategory, ProductStatus } from '@/types/marketplace';
import ProductReviewList from '@/components/marketplace/ProductReviewList';
import BuyProductModal from '@/components/feed/BuyProductModal';
import Navbar from '@/components/Navbar';
import MobileBottomNav from '@/components/MobileBottomNav';
import camlyIcon from '@/assets/camly_coin.png';

interface ProductData {
  id: string;
  product_name: string;
  content: string;
  images: string[];
  price_camly: number;
  price_vnd: number;
  quantity_kg: number;
  category: ProductCategory | null;
  product_status: ProductStatus;
  commitments: string[];
  delivery_options: string[];
  location_address: string | null;
  location_lat: number | null;
  location_lng: number | null;
  created_at: string;
  author_id: string;
  is_product_post: boolean;
}

interface SellerData {
  id: string;
  display_name: string;
  avatar_url: string;
  is_verified: boolean;
  is_good_heart: boolean;
  bio: string | null;
  created_at: string;
}

const COMMITMENT_INFO: Record<string, { icon: React.ReactNode; label: string; description: string }> = {
  organic: { 
    icon: <Leaf className="w-4 h-4" />, 
    label: 'Hữu cơ',
    description: 'Sản phẩm được trồng theo phương pháp hữu cơ, không hóa chất độc hại'
  },
  no_preservatives: { 
    icon: <Shield className="w-4 h-4" />, 
    label: 'Không bảo quản',
    description: 'Không sử dụng chất bảo quản, an toàn cho sức khỏe'
  },
  love: { 
    icon: <Sparkles className="w-4 h-4" />, 
    label: 'Tâm huyết',
    description: 'Được chăm sóc với tất cả tâm huyết và tình yêu của nông dân'
  },
  fresh_harvest: { 
    icon: <Sparkles className="w-4 h-4" />, 
    label: 'Mới thu hoạch',
    description: 'Mới được thu hoạch, đảm bảo độ tươi ngon tối đa'
  },
};

const DELIVERY_INFO: Record<string, { icon: React.ReactNode; label: string }> = {
  pickup: { icon: <Store className="w-4 h-4" />, label: 'Nhận tại vườn' },
  delivery: { icon: <Truck className="w-4 h-4" />, label: 'Giao hàng tận nơi' },
  shipper: { icon: <Truck className="w-4 h-4" />, label: 'Qua shipper FUN FARM' },
};

const ProductDetail = () => {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [product, setProduct] = useState<ProductData | null>(null);
  const [seller, setSeller] = useState<SellerData | null>(null);
  const [sellerStats, setSellerStats] = useState({ productCount: 0, avgRating: 0, reviewCount: 0 });
  const [isSaved, setIsSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showBuyModal, setShowBuyModal] = useState(false);

  useEffect(() => {
    if (productId) {
      fetchProductData();
    }
  }, [productId]);

  const fetchProductData = async () => {
    if (!productId) return;

    try {
      // Fetch product
      const { data: productData, error: productError } = await supabase
        .from('posts')
        .select('*')
        .eq('id', productId)
        .single();

      if (productError) throw productError;

      // Check if it's a product post
      if (!productData.is_product_post) {
        navigate(`/post/${productId}`);
        return;
      }

      setProduct({
        ...productData,
        category: productData.category as ProductCategory | null,
        product_status: (productData.product_status || 'active') as ProductStatus,
        commitments: productData.commitments || [],
        delivery_options: productData.delivery_options || [],
      });

      // Fetch seller profile
      const { data: sellerData } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url, is_verified, is_good_heart, bio, created_at')
        .eq('id', productData.author_id)
        .single();

      if (sellerData) {
        setSeller(sellerData);
        
        // Fetch seller stats
        const [productsRes, reviewsRes] = await Promise.all([
          supabase
            .from('posts')
            .select('id', { count: 'exact', head: true })
            .eq('author_id', sellerData.id)
            .eq('is_product_post', true)
            .in('product_status', ['active', 'sold_out']),
          supabase
            .from('product_reviews')
            .select('rating')
            .eq('seller_id', sellerData.id),
        ]);

        const reviews = reviewsRes.data || [];
        const avgRating = reviews.length > 0 
          ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length 
          : 0;

        setSellerStats({
          productCount: productsRes.count || 0,
          avgRating,
          reviewCount: reviews.length,
        });
      }

      // Check if saved
      if (user?.id) {
        const { data: savedData } = await supabase
          .from('saved_products')
          .select('id')
          .eq('user_id', user.id)
          .eq('post_id', productId)
          .maybeSingle();
        
        setIsSaved(!!savedData);
      }
    } catch (error) {
      console.error('Error fetching product:', error);
      toast({
        title: 'Lỗi',
        description: 'Không thể tải thông tin sản phẩm',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveToggle = async () => {
    if (!user?.id || !productId) {
      toast({ title: 'Vui lòng đăng nhập để lưu sản phẩm' });
      return;
    }

    try {
      if (isSaved) {
        await supabase
          .from('saved_products')
          .delete()
          .eq('user_id', user.id)
          .eq('post_id', productId);
        setIsSaved(false);
        toast({ title: 'Đã bỏ lưu sản phẩm' });
      } else {
        await supabase
          .from('saved_products')
          .insert({ user_id: user.id, post_id: productId });
        setIsSaved(true);
        toast({ title: '💚 Đã lưu vào danh sách yêu thích!' });
      }
    } catch (error) {
      console.error('Error toggling save:', error);
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({
          title: product?.product_name,
          text: `Xem sản phẩm này trên FUN FARM: ${product?.product_name}`,
          url,
        });
      } else {
        await navigator.clipboard.writeText(url);
        toast({ title: '📋 Đã sao chép link!' });
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN').format(price);
  };

  const category = product ? PRODUCT_CATEGORIES.find(c => c.id === product.category) : null;

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-6 pb-20 max-w-4xl">
          <Skeleton className="h-8 w-32 mb-6" />
          <Skeleton className="aspect-square w-full rounded-xl mb-6" />
          <Skeleton className="h-8 w-3/4 mb-4" />
          <Skeleton className="h-6 w-1/2 mb-6" />
          <Skeleton className="h-40 w-full" />
        </div>
        <MobileBottomNav />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-muted-foreground mb-4">Không tìm thấy sản phẩm</p>
          <Button onClick={() => navigate('/marketplace')}>
            Về Chợ Nông Sản
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 py-6 pb-24 max-w-4xl">
        {/* Back Button */}
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => navigate(-1)}
          className="mb-4 -ml-2"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Quay lại
        </Button>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Image Gallery */}
          <div className="space-y-4">
            <div className="relative aspect-square rounded-xl overflow-hidden bg-muted">
              {product.images?.[currentImageIndex] ? (
                <img 
                  src={product.images[currentImageIndex]} 
                  alt={product.product_name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-6xl">
                  {category?.icon || '🌾'}
                </div>
              )}

              {/* Navigation arrows */}
              {product.images && product.images.length > 1 && (
                <>
                  <button
                    onClick={() => setCurrentImageIndex(prev => 
                      prev === 0 ? product.images.length - 1 : prev - 1
                    )}
                    className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setCurrentImageIndex(prev => 
                      prev === product.images.length - 1 ? 0 : prev + 1
                    )}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}

              {/* Status badges */}
              {category && (
                <Badge className={`absolute top-4 left-4 ${category.color} text-white border-0`}>
                  {category.icon} {category.nameVi}
                </Badge>
              )}

              {(product.product_status === 'sold_out' || product.quantity_kg <= 0) && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <Badge variant="destructive" className="text-2xl px-6 py-3">
                    HẾT HÀNG
                  </Badge>
                </div>
              )}
            </div>

            {/* Thumbnails */}
            {product.images && product.images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {product.images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentImageIndex(idx)}
                    className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                      idx === currentImageIndex ? 'border-primary' : 'border-transparent opacity-70'
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="space-y-6">
            {/* Title & Price */}
            <div>
              <h1 className="text-2xl font-bold mb-3">{product.product_name}</h1>
              
              <div className="flex items-center gap-4 mb-2">
                <div className="flex items-center gap-2 text-2xl font-bold text-primary">
                  <img src={camlyIcon} alt="CLC" className="w-6 h-6" />
                  <span>{formatPrice(product.price_camly)} CAMLY</span>
                </div>
              </div>
              
              {product.price_vnd > 0 && (
                <p className="text-muted-foreground">
                  ≈ {formatPrice(product.price_vnd)} VNĐ
                </p>
              )}

              <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                <span>📦 Còn {product.quantity_kg} kg</span>
                {product.quantity_kg <= 5 && product.quantity_kg > 0 && (
                  <Badge variant="outline" className="text-amber-600 border-amber-600">
                    ⚠️ Sắp hết
                  </Badge>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button 
                onClick={() => setShowBuyModal(true)}
                disabled={product.product_status === 'sold_out' || product.quantity_kg <= 0}
                className="flex-1 gap-2"
                size="lg"
              >
                <ShoppingCart className="w-5 h-5" />
                {product.product_status === 'sold_out' || product.quantity_kg <= 0 ? 'Hết hàng' : 'Mua ngay'}
              </Button>
              
              <Button 
                variant="outline" 
                size="lg"
                onClick={handleSaveToggle}
                className={isSaved ? 'text-red-500 border-red-500' : ''}
              >
                <Heart className={`w-5 h-5 ${isSaved ? 'fill-current' : ''}`} />
              </Button>
              
              <Button variant="outline" size="lg" onClick={handleShare}>
                <Share2 className="w-5 h-5" />
              </Button>
            </div>

            {/* Seller Card */}
            {seller && (
              <Card className="border-primary/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Link to={`/shop/${seller.id}`}>
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={seller.avatar_url || ''} />
                        <AvatarFallback>{seller.display_name?.[0] || '🌱'}</AvatarFallback>
                      </Avatar>
                    </Link>
                    <div className="flex-1">
                      <Link to={`/shop/${seller.id}`} className="hover:underline">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{seller.display_name || 'Nông dân'}</span>
                          {seller.is_verified && <BadgeCheck className="w-4 h-4 text-primary" />}
                          {seller.is_good_heart && <span>💚</span>}
                        </div>
                      </Link>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                          {sellerStats.avgRating.toFixed(1)} ({sellerStats.reviewCount})
                        </span>
                        <span>{sellerStats.productCount} sản phẩm</span>
                      </div>
                    </div>
                    <Link to={`/shop/${seller.id}`}>
                      <Button variant="outline" size="sm">
                        <Store className="w-4 h-4 mr-2" />
                        Xem shop
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Commitments */}
            {product.commitments.length > 0 && (
              <div>
                <h3 className="font-semibold mb-3">✅ Cam kết của nông dân</h3>
                <div className="space-y-2">
                  {product.commitments.map((commitment) => {
                    const info = COMMITMENT_INFO[commitment];
                    if (!info) return null;
                    return (
                      <div key={commitment} className="flex items-start gap-3 p-3 bg-primary/5 rounded-lg">
                        <div className="text-primary mt-0.5">{info.icon}</div>
                        <div>
                          <p className="font-medium text-sm">{info.label}</p>
                          <p className="text-xs text-muted-foreground">{info.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Delivery Options */}
            {product.delivery_options.length > 0 && (
              <div>
                <h3 className="font-semibold mb-3">🚚 Phương thức nhận hàng</h3>
                <div className="flex flex-wrap gap-2">
                  {product.delivery_options.map((option) => {
                    const info = DELIVERY_INFO[option];
                    if (!info) return null;
                    return (
                      <Badge key={option} variant="outline" className="gap-1.5 py-1.5">
                        {info.icon}
                        {info.label}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Location */}
            {product.location_address && (
              <div>
                <h3 className="font-semibold mb-3">📍 Vị trí</h3>
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  {product.location_address}
                </p>
              </div>
            )}
          </div>
        </div>

        <Separator className="my-8" />

        {/* Description */}
        {product.content && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">📝 Mô tả sản phẩm</h2>
            <div className="prose prose-sm max-w-none">
              <p className="whitespace-pre-wrap text-muted-foreground">{product.content}</p>
            </div>
          </div>
        )}

        {/* Reviews */}
        <div>
          <h2 className="text-xl font-semibold mb-4">⭐ Đánh giá</h2>
          <ProductReviewList postId={product.id} />
        </div>

        {/* Link to original post */}
        <div className="mt-8 text-center">
          <Link 
            to={`/post/${product.id}`}
            className="text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            Xem bài viết gốc trên Feed →
          </Link>
        </div>
      </div>

      {/* Buy Modal */}
      {showBuyModal && product && (
        <BuyProductModal
          open={showBuyModal}
          onOpenChange={setShowBuyModal}
          postId={product.id}
          sellerId={product.author_id}
          productName={product.product_name || ''}
          priceCamly={product.price_camly || 0}
          priceVnd={product.price_vnd || 0}
          maxQuantity={product.quantity_kg || 0}
          deliveryOptions={product.delivery_options}
          locationAddress={product.location_address || undefined}
        />
      )}

      <MobileBottomNav />
    </div>
  );
};

export default ProductDetail;
