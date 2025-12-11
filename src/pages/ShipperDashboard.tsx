import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MapPin, Package, Navigation, CheckCircle, Loader2, Bike } from 'lucide-react';
import ShipperOrderCard from '@/components/shipper/ShipperOrderCard';
import ShipperMap from '@/components/shipper/ShipperMap';

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
  buyer_id: string;
  seller_id: string;
  post_id: string;
  buyer_profile?: { display_name: string; avatar_url: string };
  seller_profile?: { display_name: string; avatar_url: string };
  post?: { location_lat: number; location_lng: number; location_address: string };
}

const ShipperDashboard = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [isShipper, setIsShipper] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pendingOrders, setPendingOrders] = useState<Order[]>([]);
  const [myDeliveries, setMyDeliveries] = useState<Order[]>([]);
  const [myLocation, setMyLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [trackingEnabled, setTrackingEnabled] = useState(false);

  // Check if user is a shipper
  useEffect(() => {
    const checkShipperRole = async () => {
      if (!user) {
        navigate('/auth');
        return;
      }

      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'shipper')
        .single();

      if (error || !data) {
        toast.error('Bạn không phải là Shipper');
        navigate('/feed');
        return;
      }

      setIsShipper(true);
      setLoading(false);
    };

    checkShipperRole();
  }, [user, navigate]);

  // Fetch orders
  const fetchOrders = useCallback(async () => {
    if (!user || !isShipper) return;

    // Fetch pending orders (nationwide delivery)
    const { data: pending, error: pendingError } = await supabase
      .from('orders')
      .select('*')
      .eq('status', 'pending')
      .eq('delivery_option', 'nationwide')
      .order('created_at', { ascending: false });

    if (!pendingError && pending) {
      // Fetch related data
      const ordersWithDetails = await Promise.all(
        pending.map(async (order) => {
          const [buyerRes, sellerRes, postRes] = await Promise.all([
            supabase.from('profiles').select('display_name, avatar_url').eq('id', order.buyer_id).single(),
            supabase.from('profiles').select('display_name, avatar_url').eq('id', order.seller_id).single(),
            supabase.from('posts').select('location_lat, location_lng, location_address').eq('id', order.post_id).single()
          ]);

          return {
            ...order,
            buyer_profile: buyerRes.data,
            seller_profile: sellerRes.data,
            post: postRes.data
          };
        })
      );

      setPendingOrders(ordersWithDetails as Order[]);
    }

    // Fetch my deliveries
    const { data: delivering, error: deliveringError } = await supabase
      .from('orders')
      .select('*')
      .eq('shipper_id', user.id)
      .in('status', ['delivering', 'delivered'])
      .order('created_at', { ascending: false });

    if (!deliveringError && delivering) {
      const ordersWithDetails = await Promise.all(
        delivering.map(async (order) => {
          const [buyerRes, sellerRes, postRes] = await Promise.all([
            supabase.from('profiles').select('display_name, avatar_url').eq('id', order.buyer_id).single(),
            supabase.from('profiles').select('display_name, avatar_url').eq('id', order.seller_id).single(),
            supabase.from('posts').select('location_lat, location_lng, location_address').eq('id', order.post_id).single()
          ]);

          return {
            ...order,
            buyer_profile: buyerRes.data,
            seller_profile: sellerRes.data,
            post: postRes.data
          };
        })
      );

      setMyDeliveries(ordersWithDetails as Order[]);
    }
  }, [user, isShipper]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Real-time subscription for new orders
  useEffect(() => {
    if (!isShipper) return;

    const channel = supabase
      .channel('orders-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders'
        },
        (payload) => {
          console.log('Order update:', payload);
          fetchOrders();
          
          if (payload.eventType === 'INSERT' && payload.new.delivery_option === 'nationwide') {
            toast.info('Có đơn hàng mới!', {
              description: `${payload.new.product_name} - ${payload.new.quantity_kg}kg`
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isShipper, fetchOrders]);

  // GPS tracking
  useEffect(() => {
    if (!trackingEnabled || !user) return;

    let watchId: number;

    const startTracking = () => {
      if ('geolocation' in navigator) {
        watchId = navigator.geolocation.watchPosition(
          async (position) => {
            const { latitude, longitude } = position.coords;
            setMyLocation({ lat: latitude, lng: longitude });

            // Update location in database
            await supabase
              .from('shipper_locations')
              .upsert({
                shipper_id: user.id,
                lat: latitude,
                lng: longitude,
                updated_at: new Date().toISOString()
              }, { onConflict: 'shipper_id' });
          },
          (error) => {
            console.error('GPS error:', error);
            toast.error('Không thể lấy vị trí GPS');
          },
          { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
        );
      }
    };

    startTracking();

    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
    };
  }, [trackingEnabled, user]);

  const handleAcceptOrder = async (orderId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase.rpc('accept_order', {
        p_order_id: orderId,
        p_shipper_id: user.id
      });

      if (error) throw error;

      toast.success('Đã nhận đơn hàng!');
      setTrackingEnabled(true);
      fetchOrders();
    } catch (error: any) {
      toast.error(error.message || 'Không thể nhận đơn');
    }
  };

  const handleCompleteDelivery = async (orderId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase.rpc('complete_delivery', {
        p_order_id: orderId,
        p_shipper_id: user.id
      });

      if (error) throw error;

      toast.success('Giao hàng thành công! +5,000 CAMLY');
      fetchOrders();
    } catch (error: any) {
      toast.error(error.message || 'Không thể hoàn thành');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const activeDelivery = myDeliveries.find(o => o.status === 'delivering');

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 py-6 pt-20">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Bike className="w-8 h-8 text-primary" />
            <h1 className="text-2xl font-bold">Shipper Dashboard</h1>
          </div>
          
          <Button
            variant={trackingEnabled ? "default" : "outline"}
            onClick={() => setTrackingEnabled(!trackingEnabled)}
            className="gap-2"
          >
            <Navigation className={`w-4 h-4 ${trackingEnabled ? 'animate-pulse' : ''}`} />
            {trackingEnabled ? 'Đang theo dõi GPS' : 'Bật GPS'}
          </Button>
        </div>

        {/* Active Delivery Map */}
        {activeDelivery && myLocation && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Đang giao: {activeDelivery.product_name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ShipperMap
                shipperLocation={myLocation}
                pickupLocation={activeDelivery.post ? {
                  lat: activeDelivery.post.location_lat,
                  lng: activeDelivery.post.location_lng,
                  address: activeDelivery.post.location_address
                } : undefined}
                deliveryLocation={activeDelivery.delivery_lat && activeDelivery.delivery_lng ? {
                  lat: activeDelivery.delivery_lat,
                  lng: activeDelivery.delivery_lng,
                  address: activeDelivery.delivery_address || ''
                } : undefined}
              />
              <div className="mt-4 flex justify-end">
                <Button onClick={() => handleCompleteDelivery(activeDelivery.id)} className="gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Hoàn thành giao hàng
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="pending" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="pending" className="gap-2">
              <Package className="w-4 h-4" />
              Đơn chờ nhận ({pendingOrders.length})
            </TabsTrigger>
            <TabsTrigger value="my-deliveries" className="gap-2">
              <Bike className="w-4 h-4" />
              Đơn của tôi ({myDeliveries.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="mt-4">
            {pendingOrders.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Chưa có đơn hàng nào đang chờ</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {pendingOrders.map((order) => (
                  <ShipperOrderCard
                    key={order.id}
                    order={order}
                    shipperLocation={myLocation}
                    onAccept={() => handleAcceptOrder(order.id)}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="my-deliveries" className="mt-4">
            {myDeliveries.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  <Bike className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Bạn chưa có đơn giao nào</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {myDeliveries.map((order) => (
                  <ShipperOrderCard
                    key={order.id}
                    order={order}
                    shipperLocation={myLocation}
                    isMyDelivery
                    onComplete={order.status === 'delivering' ? () => handleCompleteDelivery(order.id) : undefined}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default ShipperDashboard;
