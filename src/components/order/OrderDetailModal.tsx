// 🌱 Divine Mantra: "Farmers rich, Eaters happy. Farm to Table, Fair & Fast."
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Order, OrderStatus } from "@/types/marketplace";
import { OrderStatusBadge } from "./OrderStatusBadge";
import { OrderTimeline } from "./OrderTimeline";
import { ProductReviewForm } from "./ProductReviewForm";
import { OrderChat } from "./OrderChat";
import { MapPin, Phone, MessageSquare, ExternalLink, Package, User, Store, CreditCard, Loader2, Star, DollarSign, MessageCircle, ClipboardList } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface OrderDetailModalProps {
  order: Order | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: 'buyer' | 'seller';
  onUpdateStatus?: (orderId: string, newStatus: OrderStatus) => void;
  onCancelOrder?: (orderId: string, reason: string) => void;
  onRefresh?: () => void;
}

export const OrderDetailModal = ({ 
  order, 
  open, 
  onOpenChange, 
  role,
  onUpdateStatus,
  onCancelOrder,
  onRefresh 
}: OrderDetailModalProps) => {
  const [hasReviewed, setHasReviewed] = useState(false);
  const [checkingReview, setCheckingReview] = useState(false);
  const [confirmingPayment, setConfirmingPayment] = useState(false);

  const isDelivered = order?.status === 'delivered';

  // Check if buyer has already reviewed - must be before early return
  useEffect(() => {
    if (order && role === 'buyer' && isDelivered) {
      checkExistingReview();
    }
  }, [order?.id, role, isDelivered]);

  const checkExistingReview = async () => {
    if (!order) return;
    setCheckingReview(true);
    try {
      const { data } = await supabase
        .from('product_reviews')
        .select('id')
        .eq('order_id', order.id)
        .maybeSingle();
      
      setHasReviewed(!!data);
    } catch (error) {
      console.error('Error checking review:', error);
    } finally {
      setCheckingReview(false);
    }
  };

  if (!order) return null;

  const canCancel = order.status === 'pending' && role === 'buyer';
  const canConfirm = order.status === 'pending' && role === 'seller';
  const canUpdateStatus = role === 'seller' && !['delivered', 'cancelled'].includes(order.status);
  const canReview = role === 'buyer' && isDelivered && !hasReviewed;
  
  // Seller can confirm payment when proof is uploaded
  const canConfirmPayment = role === 'seller' && 
    order.payment_status === 'proof_uploaded' && 
    order.payment_proof_url;

  const getNextStatus = (): OrderStatus | null => {
    const statusFlow: Record<OrderStatus, OrderStatus | null> = {
      pending: 'confirmed',
      confirmed: 'preparing',
      preparing: 'ready',
      ready: 'delivering',
      delivering: 'delivered',
      delivered: null,
      cancelled: null,
    };
    return statusFlow[order.status];
  };

  const handleConfirmPayment = async () => {
    if (!order) return;
    setConfirmingPayment(true);
    
    try {
      const { error } = await supabase
        .from('orders')
        .update({
          payment_status: 'confirmed',
          payment_confirmed_at: new Date().toISOString(),
          payment_confirmed_by: order.seller_id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', order.id);

      if (error) throw error;

      toast.success('Đã xác nhận nhận tiền thành công!');
      onRefresh?.();
    } catch (error) {
      console.error('Error confirming payment:', error);
      toast.error('Không thể xác nhận thanh toán');
    } finally {
      setConfirmingPayment(false);
    }
  };

  const handleConfirmOrder = () => {
    if (onUpdateStatus) {
      onUpdateStatus(order.id, 'confirmed');
    }
  };

  const handleNextStatus = () => {
    const next = getNextStatus();
    if (next && onUpdateStatus) {
      onUpdateStatus(order.id, next);
    }
  };

  const handleCancel = () => {
    if (onCancelOrder) {
      const reason = prompt('Lý do hủy đơn:');
      if (reason) {
        onCancelOrder(order.id, reason);
      }
    }
  };

  const handleReviewSubmitted = () => {
    setHasReviewed(true);
    toast.success('Đánh giá đã được gửi!');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5 text-primary" />
            Chi tiết đơn hàng
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="details" className="gap-2">
              <ClipboardList className="w-4 h-4" />
              Chi tiết
            </TabsTrigger>
            <TabsTrigger value="chat" className="gap-2">
              <MessageCircle className="w-4 h-4" />
              Chat
            </TabsTrigger>
          </TabsList>

          {/* Details Tab */}
          <TabsContent value="details" className="space-y-6 mt-4">
            {/* Order Status */}
            <div className="flex items-center justify-between">
              <OrderStatusBadge status={order.status as OrderStatus} size="lg" />
              <span className="text-sm text-muted-foreground">
                #{order.id.slice(0, 8).toUpperCase()}
              </span>
            </div>

            {/* Product Info */}
            <div className="flex gap-4 p-4 bg-muted/50 rounded-lg">
              {order.product?.images?.[0] && (
                <img 
                  src={order.product.images[0]} 
                  alt={order.product_name}
                  className="w-20 h-20 rounded-lg object-cover"
                />
              )}
              <div className="flex-1">
                <h3 className="font-semibold">{order.product_name}</h3>
                <p className="text-sm text-muted-foreground">
                  {order.quantity_kg} kg × {order.price_per_kg_camly.toLocaleString()} CAMLY
                </p>
                <p className="font-bold text-primary text-lg mt-1">
                  {order.total_camly.toLocaleString()} CAMLY
                </p>
                {order.total_vnd && (
                  <p className="text-sm text-muted-foreground">
                    ≈ {order.total_vnd.toLocaleString()}đ
                  </p>
                )}
              </div>
            </div>

            {/* Buyer/Seller Info */}
            <div className="grid gap-4">
              {role === 'seller' && order.buyer && (
                <div className="flex items-center gap-3 p-3 border rounded-lg">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={order.buyer.avatar_url} />
                    <AvatarFallback>👤</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-medium">{order.buyer.display_name || 'Người mua'}</p>
                    <p className="text-sm text-muted-foreground">Người mua</p>
                  </div>
                  {order.buyer.phone && (
                    <a href={`tel:${order.buyer.phone}`}>
                      <Button variant="ghost" size="icon">
                        <Phone className="w-4 h-4" />
                      </Button>
                    </a>
                  )}
                </div>
              )}

              {role === 'buyer' && order.seller && (
                <div className="flex items-center gap-3 p-3 border rounded-lg">
                  <Store className="w-4 h-4 text-muted-foreground" />
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={order.seller.avatar_url} />
                    <AvatarFallback>🏪</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-medium">{order.seller.display_name || 'Người bán'}</p>
                    <p className="text-sm text-muted-foreground">Người bán</p>
                  </div>
                  <Link to={`/user/${order.seller_id}`}>
                    <Button variant="ghost" size="icon">
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </Link>
                </div>
              )}
            </div>

            {/* Delivery Info */}
            {order.delivery_address && (
              <div className="p-3 border rounded-lg">
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-muted-foreground mt-1" />
                  <div>
                    <p className="font-medium text-sm">Địa chỉ giao hàng</p>
                    <p className="text-sm text-muted-foreground">{order.delivery_address}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Payment Info */}
            <div className="p-3 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <CreditCard className="w-4 h-4 text-muted-foreground" />
                <p className="font-medium text-sm">Thanh toán</p>
                {order.payment_status && (
                  <Badge variant={
                    order.payment_status === 'confirmed' || order.payment_status === 'completed' 
                      ? 'default' 
                      : order.payment_status === 'proof_uploaded' 
                        ? 'secondary' 
                        : 'outline'
                  } className="ml-auto text-xs">
                    {order.payment_status === 'pending' && '⏳ Chờ thanh toán'}
                    {order.payment_status === 'proof_uploaded' && '📷 Đã upload proof'}
                    {order.payment_status === 'confirmed' && '✅ Đã xác nhận'}
                    {order.payment_status === 'completed' && '🎉 Hoàn tất'}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground capitalize">
                {order.payment_method || 'Chưa chọn phương thức'}
              </p>
              {order.payment_proof_url && (
                <a 
                  href={order.payment_proof_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline flex items-center gap-1 mt-2"
                >
                  <ExternalLink className="w-3 h-3" />
                  Xem ảnh chuyển khoản
                </a>
              )}
              {order.payment_confirmed_at && (
                <p className="text-xs text-muted-foreground mt-2">
                  ✓ Xác nhận lúc {new Date(order.payment_confirmed_at).toLocaleString('vi-VN')}
                </p>
              )}
            </div>

            {/* Seller Confirm Payment Button */}
            {canConfirmPayment && (
              <div className="p-3 border-2 border-amber-400 bg-amber-50 dark:bg-amber-950/30 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="w-5 h-5 text-amber-600" />
                  <p className="font-medium text-amber-800 dark:text-amber-300">Xác nhận thanh toán</p>
                </div>
                <p className="text-sm text-amber-700 dark:text-amber-400 mb-3">
                  Người mua đã upload ảnh chuyển khoản. Vui lòng kiểm tra và xác nhận đã nhận được tiền.
                </p>
                <Button 
                  onClick={handleConfirmPayment}
                  disabled={confirmingPayment}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  {confirmingPayment ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Đang xác nhận...
                    </>
                  ) : (
                    <>
                      <DollarSign className="w-4 h-4 mr-2" />
                      💰 Xác nhận đã nhận tiền
                    </>
                  )}
                </Button>
              </div>
            )}

            {/* Notes */}
            {(order.buyer_note || order.seller_note) && (
              <div className="p-3 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <MessageSquare className="w-4 h-4 text-muted-foreground" />
                  <p className="font-medium text-sm">Ghi chú</p>
                </div>
                {order.buyer_note && (
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium">Người mua:</span> {order.buyer_note}
                  </p>
                )}
                {order.seller_note && (
                  <p className="text-sm text-muted-foreground mt-1">
                    <span className="font-medium">Người bán:</span> {order.seller_note}
                  </p>
                )}
              </div>
            )}

            {/* Timeline */}
            <OrderTimeline 
              currentStatus={order.status as OrderStatus} 
              createdAt={order.created_at}
              updatedAt={order.updated_at}
            />

            {/* Review Section for Buyer (only when delivered) */}
            {canReview && (
              <div className="pt-4 border-t">
                <ProductReviewForm 
                  order={order} 
                  onReviewSubmitted={handleReviewSubmitted}
                />
              </div>
            )}

            {/* Already Reviewed Badge */}
            {role === 'buyer' && isDelivered && hasReviewed && (
              <div className="p-3 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg text-center">
                <Star className="w-5 h-5 text-green-600 mx-auto mb-1" />
                <p className="text-sm text-green-700 dark:text-green-400">
                  Bạn đã đánh giá đơn hàng này
                </p>
              </div>
            )}

            {/* Checking Review State */}
            {role === 'buyer' && isDelivered && checkingReview && (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-4 border-t">
              {canCancel && (
                <Button 
                  variant="destructive" 
                  className="flex-1"
                  onClick={handleCancel}
                >
                  Hủy đơn hàng
                </Button>
              )}
              {canConfirm && (
                <Button 
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  onClick={handleConfirmOrder}
                >
                  ✅ Xác nhận đơn hàng
                </Button>
              )}
              {canUpdateStatus && !canConfirm && getNextStatus() && (
                <Button 
                  className="flex-1"
                  onClick={handleNextStatus}
                >
                  Chuyển sang: {getNextStatus() === 'preparing' ? 'Đang chuẩn bị' : 
                                getNextStatus() === 'ready' ? 'Sẵn sàng giao' :
                                getNextStatus() === 'delivering' ? 'Đang giao' :
                                getNextStatus() === 'delivered' ? 'Đã giao' : ''}
                </Button>
              )}
            </div>
          </TabsContent>

          {/* Chat Tab */}
          <TabsContent value="chat" className="mt-4">
            <OrderChat
              orderId={order.id}
              buyerId={order.buyer_id}
              sellerId={order.seller_id}
              buyerInfo={order.buyer ? {
                display_name: order.buyer.display_name,
                avatar_url: order.buyer.avatar_url
              } : undefined}
              sellerInfo={order.seller ? {
                display_name: order.seller.display_name,
                avatar_url: order.seller.avatar_url
              } : undefined}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default OrderDetailModal;
