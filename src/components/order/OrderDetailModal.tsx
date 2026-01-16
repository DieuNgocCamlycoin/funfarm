// 🌱 Divine Mantra: "Farmers rich, Eaters happy. Farm to Table, Fair & Fast."
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Order, OrderStatus } from "@/types/marketplace";
import { OrderStatusBadge } from "./OrderStatusBadge";
import { OrderTimeline } from "./OrderTimeline";
import { MapPin, Phone, MessageSquare, ExternalLink, Package, User, Store, CreditCard } from "lucide-react";
import { Link } from "react-router-dom";

interface OrderDetailModalProps {
  order: Order | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: 'buyer' | 'seller';
  onUpdateStatus?: (orderId: string, newStatus: OrderStatus) => void;
  onCancelOrder?: (orderId: string, reason: string) => void;
}

export const OrderDetailModal = ({ 
  order, 
  open, 
  onOpenChange, 
  role,
  onUpdateStatus,
  onCancelOrder 
}: OrderDetailModalProps) => {
  if (!order) return null;

  const canCancel = order.status === 'pending' && role === 'buyer';
  const canConfirm = order.status === 'pending' && role === 'seller';
  const canUpdateStatus = role === 'seller' && !['delivered', 'cancelled'].includes(order.status);

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

  const handleConfirmPayment = () => {
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5 text-primary" />
            Chi tiết đơn hàng
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
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
          </div>

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
                onClick={handleConfirmPayment}
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
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OrderDetailModal;
