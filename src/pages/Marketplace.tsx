import React, { useState, useEffect } from 'react';
import { ShoppingBag, Loader2, RefreshCw, Store, Package } from 'lucide-react';
import Navbar from '@/components/Navbar';
import MobileBottomNav from '@/components/MobileBottomNav';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ProductCard } from '@/components/marketplace/ProductCard';
import { MarketplaceFilters } from '@/components/marketplace/MarketplaceFilters';
import { CategorySidebar } from '@/components/marketplace/CategorySidebar';
import BuyProductModal from '@/components/feed/BuyProductModal';
import { useMarketplaceProducts } from '@/hooks/useMarketplaceProducts';
import { MarketplaceFilters as Filters, MarketplaceProduct } from '@/types/marketplace';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const Marketplace = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [filters, setFilters] = useState<Filters>({});
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | undefined>();
  const [selectedProduct, setSelectedProduct] = useState<MarketplaceProduct | null>(null);
  const [buyModalOpen, setBuyModalOpen] = useState(false);

  const {
    products,
    loading,
    error,
    totalCount,
    productCounts,
    loadMore,
    refresh,
    hasMore,
  } = useMarketplaceProducts(filters, userLocation);

  // Get user location from browser
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (err) => console.log('Geolocation not available:', err)
      );
    }
  }, [profile]);

  const activeFiltersCount = [
    filters.category,
    filters.distance,
    filters.minPrice,
    filters.commitments?.length,
    filters.search,
  ].filter(Boolean).length;

  const handleBuyClick = (product: MarketplaceProduct) => {
    setSelectedProduct(product);
    setBuyModalOpen(true);
  };

  const handleSaveToggle = async (productId: string, isSaved: boolean) => {
    if (!user?.id) {
      toast({
        title: 'Vui lòng đăng nhập',
        description: 'Bạn cần đăng nhập để lưu sản phẩm yêu thích.',
        variant: 'destructive',
      });
      return;
    }

    try {
      if (isSaved) {
        await supabase
          .from('saved_products')
          .insert({ user_id: user.id, post_id: productId });
        toast({ title: '💚 Đã lưu sản phẩm!' });
      } else {
        await supabase
          .from('saved_products')
          .delete()
          .eq('user_id', user.id)
          .eq('post_id', productId);
        toast({ title: 'Đã bỏ lưu sản phẩm' });
      }
      refresh();
    } catch (err) {
      console.error('Error toggling save:', err);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 pt-20 pb-24 lg:pb-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-primary to-primary/80 text-white">
                <Store className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold">
                  Chợ Nông Sản 🌾
                </h1>
                <p className="text-muted-foreground text-sm">
                  Từ vườn đến bàn ăn - Tươi ngon mỗi ngày
                </p>
              </div>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={refresh}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Làm mới
            </Button>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Package className="w-4 h-4" />
              {totalCount} sản phẩm
            </span>
            {userLocation && (
              <span className="flex items-center gap-1">
                📍 Đang hiển thị theo vị trí của bạn
              </span>
            )}
          </div>
        </div>

        <div className="flex gap-6">
          {/* Sidebar - Desktop */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <CategorySidebar
              selectedCategory={filters.category}
              onCategoryChange={(category) => setFilters({ ...filters, category })}
              productCounts={productCounts}
            />
          </aside>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {/* Filters */}
            <MarketplaceFilters
              filters={filters}
              onFiltersChange={setFilters}
              activeFiltersCount={activeFiltersCount}
            />

            {/* Error State */}
            {error && (
              <Card className="mt-6 border-destructive">
                <CardContent className="p-6 text-center">
                  <p className="text-destructive">{error}</p>
                  <Button onClick={refresh} className="mt-4">
                    Thử lại
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Products Grid */}
            {!error && (
              <div className="mt-6">
                {loading && products.length === 0 ? (
                  <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  </div>
                ) : products.length === 0 ? (
                  <Card className="mt-6">
                    <CardContent className="p-12 text-center">
                      <ShoppingBag className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                      <h3 className="text-xl font-semibold mb-2">
                        Chưa có sản phẩm nào
                      </h3>
                      <p className="text-muted-foreground mb-4">
                        {filters.category || filters.search
                          ? 'Thử thay đổi bộ lọc để tìm sản phẩm khác'
                          : 'Hãy là người đầu tiên đăng bán nông sản!'}
                      </p>
                      {activeFiltersCount > 0 && (
                        <Button 
                          variant="outline" 
                          onClick={() => setFilters({})}
                        >
                          Xóa bộ lọc
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  <>
                    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                      {products.map((product) => (
                        <ProductCard
                          key={product.id}
                          product={product}
                          onBuyClick={handleBuyClick}
                          onSaveToggle={handleSaveToggle}
                        />
                      ))}
                    </div>

                    {/* Load More */}
                    {hasMore && (
                      <div className="flex justify-center mt-8">
                        <Button
                          variant="outline"
                          onClick={loadMore}
                          disabled={loading}
                        >
                          {loading ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <Package className="w-4 h-4 mr-2" />
                          )}
                          Xem thêm sản phẩm
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Buy Modal */}
      {selectedProduct && (
        <BuyProductModal
          open={buyModalOpen}
          onOpenChange={setBuyModalOpen}
          postId={selectedProduct.id}
          sellerId={selectedProduct.author_id}
          productName={selectedProduct.product_name}
          priceCamly={selectedProduct.price_camly}
          priceVnd={selectedProduct.price_vnd}
          maxQuantity={selectedProduct.quantity_kg}
          deliveryOptions={selectedProduct.delivery_options}
          locationAddress={selectedProduct.location_address || ''}
        />
      )}

      <MobileBottomNav />
    </div>
  );
};

export default Marketplace;
