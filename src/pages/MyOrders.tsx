// 🌱 Divine Mantra: "Farmers rich, Eaters happy. Farm to Table, Fair & Fast."
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import MobileBottomNav from "@/components/MobileBottomNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Order, OrderStatus } from "@/types/marketplace";
import { OrderStatusBadge } from "@/components/order/OrderStatusBadge";
import { OrderDetailModal } from "@/components/order/OrderDetailModal";
import { Package, ShoppingBag, Clock, Truck, CheckCircle, XCircle, MapPin, Store, Star } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";

const MyOrders = () => {
  const navigate = useNavigate();
  const { user, profile, isLoading: authLoading } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [reviewedOrders, setReviewedOrders] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user?.id) fetchOrders();
  }, [user?.id]);

  const fetchOrders = async () => {
    if (!user?.id) return;
    setLoading(true);

    try {
      const { data: ordersData, error } = await supabase
        .from('orders')
        .select('*')
        .eq('buyer_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (ordersData) {
        // Fetch seller profiles
        const sellerIds = [...new Set(ordersData.map(o => o.seller_id))];
        const { data: sellers } = await supabase
          .from('profiles')
          .select('id, display_name, avatar_url, phone')
          .in('id', sellerIds);

        // Fetch product images
        const postIds = [...new Set(ordersData.map(o => o.post_id))];
        const { data: posts } = await supabase
          .from('posts')
          .select('id, images')
          .in('id', postIds);

        const ordersWithDetails: Order[] = ordersData.map(order => ({
          ...order,
          status: order.status as OrderStatus,
          seller: sellers?.find(s => s.id === order.seller_id),
          product: posts?.find(p => p.id === order.post_id),
        }));

        setOrders(ordersWithDetails);

        // Check which delivered orders have been reviewed
        const deliveredOrderIds = ordersData
          .filter(o => o.status === 'delivered')
          .map(o => o.id);

        if (deliveredOrderIds.length > 0) {
          const { data: reviews } = await supabase
            .from('product_reviews')
            .select('order_id')
            .in('order_id', deliveredOrderIds);
          
          if (reviews) {
            setReviewedOrders(new Set(reviews.map(r => r.order_id)));
          }
        }
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('Không thể tải đơn hàng');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelOrder = async (orderId: string, reason: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({
          status: 'cancelled',
          cancelled_by: user?.id,
          cancelled_reason: reason,
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId);

      if (error) throw error;

      toast.success('Đã hủy đơn hàng');
      setDetailOpen(false);
      fetchOrders();
    } catch (error) {
      console.error('Error cancelling order:', error);
      toast.error('Không thể hủy đơn hàng');
    }
  };

  const getFilteredOrders = () => {
    if (activeTab === 'all') return orders;
    return orders.filter(o => {
      switch (activeTab) {
        case 'pending': return ['pending', 'confirmed', 'preparing'].includes(o.status);
        case 'delivering': return ['ready', 'delivering'].includes(o.status);
        case 'completed': return o.status === 'delivered';
        case 'cancelled': return o.status === 'cancelled';
        default: return true;
      }
    });
  };

  const filteredOrders = getFilteredOrders();

  const tabCounts = {
    all: orders.length,
    pending: orders.filter(o => ['pending', 'confirmed', 'preparing'].includes(o.status)).length,
    delivering: orders.filter(o => ['ready', 'delivering'].includes(o.status)).length,
    completed: orders.filter(o => o.status === 'delivered').length,
    cancelled: orders.filter(o => o.status === 'cancelled').length,
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 pt-20 pb-24">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <ShoppingBag className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">Đơn hàng của tôi</h1>
              <p className="text-muted-foreground text-sm">Theo dõi tình trạng đơn hàng đã mua</p>
            </div>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full grid grid-cols-5 mb-6">
              <TabsTrigger value="all" className="text-xs sm:text-sm">
                Tất cả ({tabCounts.all})
              </TabsTrigger>
              <TabsTrigger value="pending" className="text-xs sm:text-sm">
                <Clock className="w-3 h-3 mr-1 hidden sm:inline" />
                Chờ ({tabCounts.pending})
              </TabsTrigger>
              <TabsTrigger value="delivering" className="text-xs sm:text-sm">
                <Truck className="w-3 h-3 mr-1 hidden sm:inline" />
                Giao ({tabCounts.delivering})
              </TabsTrigger>
              <TabsTrigger value="completed" className="text-xs sm:text-sm">
                <CheckCircle className="w-3 h-3 mr-1 hidden sm:inline" />
                Xong ({tabCounts.completed})
              </TabsTrigger>
              <TabsTrigger value="cancelled" className="text-xs sm:text-sm">
                <XCircle className="w-3 h-3 mr-1 hidden sm:inline" />
                Hủy ({tabCounts.cancelled})
              </TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="space-y-4">
              {loading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => (
                    <Card key={i} className="animate-pulse">
                      <CardContent className="p-4">
                        <div className="h-24 bg-muted rounded" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : filteredOrders.length === 0 ? (
                <Card className="text-center py-12">
                  <CardContent>
                    <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="font-semibold text-lg mb-2">Chưa có đơn hàng nào</h3>
                    <p className="text-muted-foreground mb-4">
                      {activeTab === 'all' 
                        ? 'Bắt đầu mua sắm tại Chợ Nông Sản!'
                        : 'Không có đơn hàng trong danh mục này'}
                    </p>
                    <Link to="/marketplace">
                      <Button>
                        <Store className="w-4 h-4 mr-2" />
                        Vào Chợ Nông Sản
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ) : (
                filteredOrders.map(order => (
                  <Card 
                    key={order.id} 
                    className="hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => {
                      setSelectedOrder(order);
                      setDetailOpen(true);
                    }}
                  >
                    <CardContent className="p-4">
                      <div className="flex gap-4">
                        {/* Product Image */}
                        {order.product?.images?.[0] && (
                          <img 
                            src={order.product.images[0]} 
                            alt={order.product_name}
                            className="w-20 h-20 rounded-lg object-cover flex-shrink-0"
                          />
                        )}

                        {/* Order Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <h4 className="font-semibold truncate">{order.product_name}</h4>
                            <div className="flex flex-col items-end gap-1">
                              <OrderStatusBadge status={order.status} size="sm" />
                              {/* Badge for orders that need review */}
                              {order.status === 'delivered' && !reviewedOrders.has(order.id) && (
                                <Badge variant="outline" className="text-amber-600 border-amber-400 text-[10px]">
                                  <Star className="w-2.5 h-2.5 mr-0.5" />
                                  Chưa đánh giá
                                </Badge>
                              )}
                              {order.status === 'delivered' && reviewedOrders.has(order.id) && (
                                <Badge variant="outline" className="text-green-600 border-green-400 text-[10px]">
                                  ✓ Đã đánh giá
                                </Badge>
                              )}
                            </div>
                          </div>

                          <p className="text-sm text-muted-foreground">
                            {order.quantity_kg} kg × {order.price_per_kg_camly.toLocaleString()} = 
                            <span className="font-bold text-primary ml-1">
                              {order.total_camly.toLocaleString()} CAMLY
                            </span>
                          </p>

                          {/* Seller Info */}
                          {order.seller && (
                            <div className="flex items-center gap-2 mt-2">
                              <Store className="w-3 h-3 text-muted-foreground" />
                              <Avatar className="w-5 h-5">
                                <AvatarImage src={order.seller.avatar_url} />
                                <AvatarFallback className="text-xs">🏪</AvatarFallback>
                              </Avatar>
                              <span className="text-sm text-muted-foreground">
                                {order.seller.display_name || 'Người bán'}
                              </span>
                            </div>
                          )}

                          {/* Delivery Address */}
                          {order.delivery_address && (
                            <div className="flex items-start gap-1 mt-2 text-xs text-muted-foreground">
                              <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" />
                              <span className="line-clamp-1">{order.delivery_address}</span>
                            </div>
                          )}

                          <p className="text-xs text-muted-foreground mt-2">
                            🕐 {new Date(order.created_at).toLocaleString('vi-VN')}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* Order Detail Modal */}
      <OrderDetailModal
        order={selectedOrder}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        role="buyer"
        onCancelOrder={handleCancelOrder}
      />

      <MobileBottomNav />
    </div>
  );
};

export default MyOrders;
