// 🌱 Divine Mantra: "Farmers rich, Eaters happy. Farm to Table, Fair & Fast."
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import MobileBottomNav from "@/components/MobileBottomNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Order, OrderStatus } from "@/types/marketplace";
import { OrderDetailModal } from "@/components/order/OrderDetailModal";
import { RevenueStats } from "@/components/seller/RevenueStats";
import { SellerProductList } from "@/components/seller/SellerProductList";
import { NewOrderCard } from "@/components/seller/NewOrderCard";
import { OrderStatusBadge } from "@/components/order/OrderStatusBadge";
import { Store, Package, Truck, DollarSign, Clock, RefreshCw, MapPin } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

const SellerDashboard = () => {
  const navigate = useNavigate();
  const { user, profile, isLoading: authLoading } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('new');

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
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (ordersData) {
        // Fetch buyer profiles
        const buyerIds = [...new Set(ordersData.map(o => o.buyer_id))];
        const { data: buyers } = await supabase
          .from('profiles')
          .select('id, display_name, avatar_url, phone')
          .in('id', buyerIds);

        // Fetch product images
        const postIds = [...new Set(ordersData.map(o => o.post_id))];
        const { data: posts } = await supabase
          .from('posts')
          .select('id, images')
          .in('id', postIds);

        const ordersWithDetails: Order[] = ordersData.map(order => ({
          ...order,
          status: order.status as OrderStatus,
          buyer: buyers?.find(b => b.id === order.buyer_id),
          product: posts?.find(p => p.id === order.post_id),
        }));

        setOrders(ordersWithDetails);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('Không thể tải đơn hàng');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (orderId: string, newStatus: OrderStatus) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId);

      if (error) throw error;

      toast.success(`Đã cập nhật trạng thái đơn hàng`);
      setDetailOpen(false);
      fetchOrders();
    } catch (error) {
      console.error('Error updating order:', error);
      toast.error('Không thể cập nhật đơn hàng');
    }
  };

  const handleRejectOrder = async (orderId: string) => {
    const reason = prompt('Lý do từ chối đơn hàng:');
    if (!reason) return;

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

      toast.success('Đã từ chối đơn hàng');
      fetchOrders();
    } catch (error) {
      console.error('Error rejecting order:', error);
      toast.error('Không thể từ chối đơn hàng');
    }
  };

  const newOrders = orders.filter(o => o.status === 'pending');
  const inProgressOrders = orders.filter(o => ['confirmed', 'preparing', 'ready', 'delivering'].includes(o.status));

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
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Store className="w-8 h-8 text-primary" />
              <div>
                <h1 className="text-2xl font-bold">Quản lý bán hàng</h1>
                <p className="text-muted-foreground text-sm">Quản lý đơn hàng và doanh thu</p>
              </div>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={fetchOrders}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
              Làm mới
            </Button>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full grid grid-cols-4 mb-6">
              <TabsTrigger value="new" className="text-xs sm:text-sm relative">
                <Clock className="w-3 h-3 mr-1 hidden sm:inline" />
                Đơn mới
                {newOrders.length > 0 && (
                  <Badge className="ml-1 bg-red-500 text-white h-5 min-w-[20px] px-1">
                    {newOrders.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="progress" className="text-xs sm:text-sm">
                <Truck className="w-3 h-3 mr-1 hidden sm:inline" />
                Đang xử lý ({inProgressOrders.length})
              </TabsTrigger>
              <TabsTrigger value="products" className="text-xs sm:text-sm">
                <Package className="w-3 h-3 mr-1 hidden sm:inline" />
                Sản phẩm
              </TabsTrigger>
              <TabsTrigger value="revenue" className="text-xs sm:text-sm">
                <DollarSign className="w-3 h-3 mr-1 hidden sm:inline" />
                Doanh thu
              </TabsTrigger>
            </TabsList>

            {/* New Orders Tab */}
            <TabsContent value="new" className="space-y-4">
              {loading ? (
                <div className="space-y-4">
                  {[1, 2].map(i => (
                    <Card key={i} className="animate-pulse">
                      <CardContent className="p-4">
                        <div className="h-24 bg-muted rounded" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : newOrders.length === 0 ? (
                <Card className="text-center py-12">
                  <CardContent>
                    <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="font-semibold text-lg mb-2">Chưa có đơn hàng mới</h3>
                    <p className="text-muted-foreground">
                      Các đơn hàng mới sẽ hiển thị tại đây
                    </p>
                  </CardContent>
                </Card>
              ) : (
                newOrders.map(order => (
                  <NewOrderCard
                    key={order.id}
                    order={order}
                    onViewDetail={(o) => {
                      setSelectedOrder(o);
                      setDetailOpen(true);
                    }}
                    onConfirm={(id) => handleUpdateStatus(id, 'confirmed')}
                    onReject={handleRejectOrder}
                  />
                ))
              )}
            </TabsContent>

            {/* In Progress Orders Tab */}
            <TabsContent value="progress" className="space-y-4">
              {loading ? (
                <div className="space-y-4">
                  {[1, 2].map(i => (
                    <Card key={i} className="animate-pulse">
                      <CardContent className="p-4">
                        <div className="h-24 bg-muted rounded" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : inProgressOrders.length === 0 ? (
                <Card className="text-center py-12">
                  <CardContent>
                    <Truck className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="font-semibold text-lg mb-2">Không có đơn đang xử lý</h3>
                    <p className="text-muted-foreground">
                      Các đơn hàng đang xử lý sẽ hiển thị tại đây
                    </p>
                  </CardContent>
                </Card>
              ) : (
                inProgressOrders.map(order => (
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
                        {order.product?.images?.[0] && (
                          <img 
                            src={order.product.images[0]} 
                            alt={order.product_name}
                            className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                          />
                        )}

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <h4 className="font-semibold truncate">{order.product_name}</h4>
                            <OrderStatusBadge status={order.status} size="sm" />
                          </div>

                          <p className="text-sm text-muted-foreground">
                            {order.quantity_kg} kg • 
                            <span className="font-bold text-primary ml-1">
                              {order.total_camly.toLocaleString()} CAMLY
                            </span>
                          </p>

                          {order.buyer && (
                            <div className="flex items-center gap-2 mt-2">
                              <Avatar className="w-5 h-5">
                                <AvatarImage src={order.buyer.avatar_url} />
                                <AvatarFallback className="text-xs">👤</AvatarFallback>
                              </Avatar>
                              <span className="text-sm text-muted-foreground">
                                {order.buyer.display_name || 'Người mua'}
                              </span>
                            </div>
                          )}

                          {order.delivery_address && (
                            <div className="flex items-start gap-1 mt-1 text-xs text-muted-foreground">
                              <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" />
                              <span className="line-clamp-1">{order.delivery_address}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            {/* Products Tab */}
            <TabsContent value="products">
              <SellerProductList />
            </TabsContent>

            {/* Revenue Tab */}
            <TabsContent value="revenue">
              <RevenueStats />
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* Order Detail Modal */}
      <OrderDetailModal
        order={selectedOrder}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        role="seller"
        onUpdateStatus={handleUpdateStatus}
        onCancelOrder={(id, reason) => {
          handleRejectOrder(id);
        }}
      />

      <MobileBottomNav />
    </div>
  );
};

export default SellerDashboard;
