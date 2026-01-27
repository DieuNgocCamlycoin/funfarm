// 🌱 Divine Mantra: "Farmers rich, Eaters happy. Farm to Table, Fair & Fast."
import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, Star, BadgeCheck, MapPin, Calendar, Package, 
  ShoppingBag, MessageCircle, Gift, Users
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { MarketplaceProduct, ProductCategory, PRODUCT_CATEGORIES } from '@/types/marketplace';
import { ProductCard } from '@/components/marketplace/ProductCard';
import ProductReviewList from '@/components/marketplace/ProductReviewList';
import BuyProductModal from '@/components/feed/BuyProductModal';
import Navbar from '@/components/Navbar';
import MobileBottomNav from '@/components/MobileBottomNav';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';

interface SellerProfile {
  id: string;
  display_name: string;
  avatar_url: string | null;
  cover_url: string | null;
  is_verified: boolean;
  is_good_heart: boolean;
  bio: string | null;
  location: string | null;
  created_at: string;
}

interface SellerStats {
  totalProducts: number;
  totalOrders: number;
  avgRating: number;
  totalReviews: number;
}

const SellerShop = () => {
  const { sellerId } = useParams<{ sellerId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [seller, setSeller] = useState<SellerProfile | null>(null);
  const [stats, setStats] = useState<SellerStats>({
    totalProducts: 0,
    totalOrders: 0,
    avgRating: 0,
    totalReviews: 0,
  });
  const [products, setProducts] = useState<MarketplaceProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<MarketplaceProduct | null>(null);
  const [showBuyModal, setShowBuyModal] = useState(false);

  useEffect(() => {
    if (sellerId) {
      fetchSellerData();
    }
  }, [sellerId]);

  const fetchSellerData = async () => {
    if (!sellerId) return;

    try {
      // Fetch seller profile
      const { data: sellerData, error: sellerError } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url, cover_url, is_verified, is_good_heart, bio, location, created_at')
        .eq('id', sellerId)
        .single();

      if (sellerError) throw sellerError;
      setSeller(sellerData);

      // Fetch products
      const { data: productsData } = await supabase
        .from('posts')
        .select('*')
        .eq('author_id', sellerId)
        .eq('is_product_post', true)
        .in('product_status', ['active', 'sold_out'])
        .order('created_at', { ascending: false });

      // Fetch reviews for ratings
      const { data: reviewsData } = await supabase
        .from('product_reviews')
        .select('post_id, rating')
        .eq('seller_id', sellerId);

      // Create ratings map
      const ratingsMap = new Map<string, { total: number; count: number }>();
      reviewsData?.forEach(review => {
        const current = ratingsMap.get(review.post_id) || { total: 0, count: 0 };
        ratingsMap.set(review.post_id, {
          total: current.total + review.rating,
          count: current.count + 1,
        });
      });

      // Fetch saved products for current user
      let savedProductIds: Set<string> = new Set();
      if (user?.id) {
        const { data: savedData } = await supabase
          .from('saved_products')
          .select('post_id')
          .eq('user_id', user.id);
        savedProductIds = new Set(savedData?.map(s => s.post_id) || []);
      }

      // Transform products
      const transformedProducts: MarketplaceProduct[] = (productsData || []).map(post => {
        const ratingInfo = ratingsMap.get(post.id);
        return {
          ...post,
          category: post.category as ProductCategory | null,
          product_status: (post.product_status || 'active') as MarketplaceProduct['product_status'],
          commitments: post.commitments || [],
          delivery_options: post.delivery_options || [],
          author: {
            id: sellerData.id,
            display_name: sellerData.display_name || '',
            avatar_url: sellerData.avatar_url || '',
            is_verified: sellerData.is_verified,
            is_good_heart: sellerData.is_good_heart,
            reputation_score: 0,
          },
          average_rating: ratingInfo ? ratingInfo.total / ratingInfo.count : undefined,
          review_count: ratingInfo?.count,
          is_saved: savedProductIds.has(post.id),
        };
      });

      setProducts(transformedProducts);

      // Calculate stats
      const { count: orderCount } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('seller_id', sellerId)
        .eq('status', 'delivered');

      const totalReviews = reviewsData?.length || 0;
      const avgRating = totalReviews > 0
        ? reviewsData!.reduce((sum, r) => sum + r.rating, 0) / totalReviews
        : 0;

      setStats({
        totalProducts: productsData?.length || 0,
        totalOrders: orderCount || 0,
        avgRating,
        totalReviews,
      });
    } catch (error) {
      console.error('Error fetching seller:', error);
      toast({
        title: 'Lỗi',
        description: 'Không thể tải thông tin shop',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBuyClick = (product: MarketplaceProduct) => {
    setSelectedProduct(product);
    setShowBuyModal(true);
  };

  const handleSaveToggle = async (productId: string, shouldSave: boolean) => {
    if (!user?.id) {
      toast({ title: 'Vui lòng đăng nhập' });
      return;
    }

    try {
      if (shouldSave) {
        await supabase.from('saved_products').insert({ user_id: user.id, post_id: productId });
      } else {
        await supabase.from('saved_products').delete().eq('user_id', user.id).eq('post_id', productId);
      }
      setProducts(prev => 
        prev.map(p => p.id === productId ? { ...p, is_saved: shouldSave } : p)
      );
    } catch (error) {
      console.error('Error saving:', error);
    }
  };

  const filteredProducts = selectedCategory
    ? products.filter(p => p.category === selectedCategory)
    : products;

  // Get unique categories from products
  const availableCategories = [...new Set(products.map(p => p.category).filter(Boolean))] as ProductCategory[];

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-6 pb-20 max-w-6xl">
          <Skeleton className="h-48 w-full rounded-xl mb-6" />
          <div className="flex items-center gap-4 mb-6">
            <Skeleton className="w-20 h-20 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="aspect-square rounded-xl" />
            ))}
          </div>
        </div>
        <MobileBottomNav />
      </div>
    );
  }

  if (!seller) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-muted-foreground mb-4">Không tìm thấy shop</p>
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
      
      <div className="container mx-auto px-4 py-6 pb-24 max-w-6xl">
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

        {/* Shop Header */}
        <div className="relative mb-8">
          {/* Cover */}
          <div className="h-32 md:h-48 rounded-xl overflow-hidden bg-gradient-to-r from-primary/20 to-secondary/20">
            {seller.cover_url && (
              <img 
                src={seller.cover_url} 
                alt="Cover" 
                className="w-full h-full object-cover"
              />
            )}
          </div>

          {/* Profile Info */}
          <div className="flex flex-col md:flex-row items-start md:items-end gap-4 -mt-10 md:-mt-16 px-4">
            <Avatar className="w-20 h-20 md:w-32 md:h-32 border-4 border-background shadow-lg">
              <AvatarImage src={seller.avatar_url || ''} />
              <AvatarFallback className="text-2xl">{seller.display_name?.[0] || '🌱'}</AvatarFallback>
            </Avatar>

            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl md:text-2xl font-bold">{seller.display_name || 'Nông dân'}</h1>
                {seller.is_verified && <BadgeCheck className="w-5 h-5 text-primary" />}
                {seller.is_good_heart && <span className="text-lg">💚</span>}
              </div>
              
              <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground flex-wrap">
                {seller.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {seller.location}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  Tham gia {formatDistanceToNow(new Date(seller.created_at), { addSuffix: true, locale: vi })}
                </span>
              </div>

              {seller.bio && (
                <p className="text-sm text-muted-foreground mt-2 max-w-xl">{seller.bio}</p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 mt-4 md:mt-0">
              <Link to={`/user/${seller.id}`}>
                <Button variant="outline" size="sm">
                  <Users className="w-4 h-4 mr-2" />
                  Xem Profile
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4 text-center">
              <Package className="w-5 h-5 mx-auto text-primary mb-1" />
              <p className="text-2xl font-bold">{stats.totalProducts}</p>
              <p className="text-xs text-muted-foreground">Sản phẩm</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <ShoppingBag className="w-5 h-5 mx-auto text-green-500 mb-1" />
              <p className="text-2xl font-bold">{stats.totalOrders}</p>
              <p className="text-xs text-muted-foreground">Đã bán</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Star className="w-5 h-5 mx-auto text-yellow-500 mb-1" />
              <p className="text-2xl font-bold">{stats.avgRating.toFixed(1)}</p>
              <p className="text-xs text-muted-foreground">Đánh giá</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <MessageCircle className="w-5 h-5 mx-auto text-blue-500 mb-1" />
              <p className="text-2xl font-bold">{stats.totalReviews}</p>
              <p className="text-xs text-muted-foreground">Nhận xét</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="products">
          <TabsList className="mb-6">
            <TabsTrigger value="products" className="gap-2">
              <Package className="w-4 h-4" />
              Sản phẩm ({stats.totalProducts})
            </TabsTrigger>
            <TabsTrigger value="reviews" className="gap-2">
              <Star className="w-4 h-4" />
              Đánh giá ({stats.totalReviews})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="products">
            {/* Category Filter */}
            {availableCategories.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-4 mb-4">
                <Badge
                  variant={!selectedCategory ? 'default' : 'outline'}
                  className="cursor-pointer whitespace-nowrap"
                  onClick={() => setSelectedCategory(null)}
                >
                  Tất cả
                </Badge>
                {availableCategories.map(catId => {
                  const cat = PRODUCT_CATEGORIES.find(c => c.id === catId);
                  if (!cat) return null;
                  return (
                    <Badge
                      key={catId}
                      variant={selectedCategory === catId ? 'default' : 'outline'}
                      className="cursor-pointer whitespace-nowrap"
                      onClick={() => setSelectedCategory(catId)}
                    >
                      {cat.icon} {cat.nameVi}
                    </Badge>
                  );
                })}
              </div>
            )}

            {/* Products Grid */}
            {filteredProducts.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredProducts.map(product => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onBuyClick={handleBuyClick}
                    onSaveToggle={handleSaveToggle}
                  />
                ))}
              </div>
            ) : (
              <Card className="border-dashed">
                <CardContent className="p-12 text-center">
                  <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Chưa có sản phẩm nào</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="reviews">
            {products.length > 0 ? (
              <div className="space-y-6">
                {products.slice(0, 5).map(product => (
                  <div key={product.id}>
                    <h3 className="font-medium mb-3 flex items-center gap-2">
                      📦 {product.product_name}
                    </h3>
                    <ProductReviewList postId={product.id} />
                  </div>
                ))}
              </div>
            ) : (
              <Card className="border-dashed">
                <CardContent className="p-12 text-center">
                  <Star className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Chưa có đánh giá nào</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Buy Modal */}
      {showBuyModal && selectedProduct && (
        <BuyProductModal
          open={showBuyModal}
          onOpenChange={(open) => {
            setShowBuyModal(open);
            if (!open) setSelectedProduct(null);
          }}
          postId={selectedProduct.id}
          sellerId={selectedProduct.author_id}
          productName={selectedProduct.product_name || ''}
          priceCamly={selectedProduct.price_camly || 0}
          priceVnd={selectedProduct.price_vnd || 0}
          maxQuantity={selectedProduct.quantity_kg || 0}
          deliveryOptions={selectedProduct.delivery_options}
          locationAddress={selectedProduct.location_address || undefined}
        />
      )}

      <MobileBottomNav />
    </div>
  );
};

export default SellerShop;
