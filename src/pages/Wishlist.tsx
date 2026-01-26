// 🌱 Divine Mantra: "Farmers rich, Eaters happy. Farm to Table, Fair & Fast."
import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Heart, ShoppingBag, Trash2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { MarketplaceProduct, ProductCategory } from '@/types/marketplace';
import { ProductCard } from '@/components/marketplace/ProductCard';
import BuyProductModal from '@/components/feed/BuyProductModal';
import Navbar from '@/components/Navbar';
import MobileBottomNav from '@/components/MobileBottomNav';

const Wishlist = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [products, setProducts] = useState<MarketplaceProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<MarketplaceProduct | null>(null);
  const [showBuyModal, setShowBuyModal] = useState(false);

  useEffect(() => {
    if (user?.id) {
      fetchWishlist();
      const cleanup = subscribeToChanges();
      return cleanup;
    } else {
      setLoading(false);
    }
  }, [user?.id]);

  const fetchWishlist = async () => {
    if (!user?.id) return;

    try {
      // Fetch saved products
      const { data: savedData, error: savedError } = await supabase
        .from('saved_products')
        .select('post_id, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (savedError) throw savedError;

      if (!savedData || savedData.length === 0) {
        setProducts([]);
        setLoading(false);
        return;
      }

      const postIds = savedData.map(s => s.post_id);

      // Fetch product details
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select(`
          id,
          author_id,
          product_name,
          content,
          images,
          price_camly,
          price_vnd,
          quantity_kg,
          category,
          product_status,
          location_address,
          location_lat,
          location_lng,
          commitments,
          delivery_options,
          created_at
        `)
        .in('id', postIds)
        .eq('is_product_post', true);

      if (postsError) throw postsError;

      // Fetch author profiles
      const authorIds = [...new Set(postsData?.map(p => p.author_id) || [])];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url, is_verified, is_good_heart, reputation_score')
        .in('id', authorIds);

      const profilesMap = new Map(profilesData?.map(p => [p.id, p]));

      // Fetch reviews for ratings
      const { data: reviewsData } = await supabase
        .from('product_reviews')
        .select('post_id, rating')
        .in('post_id', postIds);

      const ratingsMap = new Map<string, { total: number; count: number }>();
      reviewsData?.forEach(review => {
        const current = ratingsMap.get(review.post_id) || { total: 0, count: 0 };
        ratingsMap.set(review.post_id, {
          total: current.total + review.rating,
          count: current.count + 1,
        });
      });

      // Transform products - maintain save order
      const transformedProducts: MarketplaceProduct[] = savedData
        .map(saved => {
          const post = postsData?.find(p => p.id === saved.post_id);
          if (!post) return null;

          const author = profilesMap.get(post.author_id);
          const ratingInfo = ratingsMap.get(post.id);

          return {
            ...post,
            category: post.category as ProductCategory | null,
            product_status: (post.product_status || 'active') as MarketplaceProduct['product_status'],
            commitments: post.commitments || [],
            delivery_options: post.delivery_options || [],
            author: author ? {
              id: author.id,
              display_name: author.display_name || '',
              avatar_url: author.avatar_url || '',
              is_verified: author.is_verified,
              is_good_heart: author.is_good_heart,
              reputation_score: author.reputation_score,
            } : undefined,
            average_rating: ratingInfo ? ratingInfo.total / ratingInfo.count : undefined,
            review_count: ratingInfo?.count,
            is_saved: true,
          };
        })
        .filter(Boolean) as MarketplaceProduct[];

      setProducts(transformedProducts);
    } catch (error) {
      console.error('Error fetching wishlist:', error);
      toast({
        title: 'Lỗi',
        description: 'Không thể tải danh sách yêu thích',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const subscribeToChanges = () => {
    if (!user?.id) return;

    const channel = supabase
      .channel('wishlist-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'saved_products',
        filter: `user_id=eq.${user.id}`,
      }, () => {
        fetchWishlist();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleBuyClick = (product: MarketplaceProduct) => {
    setSelectedProduct(product);
    setShowBuyModal(true);
  };

  const handleSaveToggle = async (productId: string, shouldSave: boolean) => {
    if (!user?.id) return;

    try {
      if (!shouldSave) {
        await supabase
          .from('saved_products')
          .delete()
          .eq('user_id', user.id)
          .eq('post_id', productId);
        
        setProducts(prev => prev.filter(p => p.id !== productId));
        toast({ title: 'Đã bỏ lưu sản phẩm' });
      }
    } catch (error) {
      console.error('Error removing from wishlist:', error);
    }
  };

  const handleClearAll = async () => {
    if (!user?.id) return;

    try {
      await supabase
        .from('saved_products')
        .delete()
        .eq('user_id', user.id);
      
      setProducts([]);
      toast({ title: 'Đã xóa tất cả sản phẩm yêu thích' });
    } catch (error) {
      console.error('Error clearing wishlist:', error);
    }
  };

  // Not logged in
  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-12 text-center">
          <Heart className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Đăng nhập để xem danh sách yêu thích</h1>
          <p className="text-muted-foreground mb-6">
            Lưu các sản phẩm bạn thích để mua sau
          </p>
          <Button onClick={() => navigate('/auth')}>
            Đăng nhập ngay
          </Button>
        </div>
        <MobileBottomNav />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-6 pb-20 max-w-6xl">
          <Skeleton className="h-8 w-48 mb-6" />
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="aspect-square rounded-xl" />
            ))}
          </div>
        </div>
        <MobileBottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 py-6 pb-24 max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Heart className="w-6 h-6 text-red-500 fill-red-500" />
                Sản phẩm yêu thích
              </h1>
              <p className="text-sm text-muted-foreground">
                {products.length} sản phẩm đã lưu
              </p>
            </div>
          </div>

          {products.length > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="text-destructive">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Xóa tất cả
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Xóa tất cả sản phẩm yêu thích?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Bạn sẽ không thể hoàn tác hành động này. Tất cả {products.length} sản phẩm sẽ bị xóa khỏi danh sách yêu thích.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Hủy</AlertDialogCancel>
                  <AlertDialogAction onClick={handleClearAll} className="bg-destructive text-destructive-foreground">
                    Xóa tất cả
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>

        {/* Products Grid */}
        {products.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.map(product => (
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
              <Heart className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Chưa có sản phẩm yêu thích</h2>
              <p className="text-muted-foreground mb-6">
                Khám phá Chợ Nông Sản và lưu các sản phẩm bạn thích!
              </p>
              <Link to="/marketplace">
                <Button className="gap-2">
                  <ShoppingBag className="w-4 h-4" />
                  Đến Chợ Nông Sản
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
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

export default Wishlist;
