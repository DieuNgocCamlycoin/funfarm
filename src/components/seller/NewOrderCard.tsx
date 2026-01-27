// 🌱 Divine Mantra: "Farmers rich, Eaters happy. Farm to Table, Fair & Fast."
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Order } from "@/types/marketplace";
import { OrderStatusBadge } from "@/components/order/OrderStatusBadge";
import { MapPin, Eye, Check, X, ExternalLink, DollarSign, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface NewOrderCardProps {
  order: Order;
  onViewDetail: (order: Order) => void;
  onConfirm: (orderId: string) => void;
  onReject: (orderId: string) => void;
  onRefresh?: () => void;
}

export const NewOrderCard = ({ order, onViewDetail, onConfirm, onReject, onRefresh }: NewOrderCardProps) => {
  const [confirmingPayment, setConfirmingPayment] = useState(false);

  // Check if payment proof is uploaded and needs confirmation
  const needsPaymentConfirmation = order.payment_status === 'proof_uploaded' && order.payment_proof_url;

  const handleConfirmPayment = async (e: React.MouseEvent) => {
    e.stopPropagation();
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

  return (
    <Card className="hover:shadow-md transition-shadow">
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
                {/* Payment Status Badge */}
                {needsPaymentConfirmation && (
                  <Badge variant="outline" className="text-amber-600 border-amber-400 bg-amber-50 dark:bg-amber-950/30 text-[10px]">
                    💳 Chờ xác nhận TT
                  </Badge>
                )}
                {order.payment_status === 'confirmed' && (
                  <Badge variant="outline" className="text-green-600 border-green-400 bg-green-50 dark:bg-green-950/30 text-[10px]">
                    ✅ Đã nhận tiền
                  </Badge>
                )}
              </div>
            </div>

            <div className="text-sm text-muted-foreground space-y-1">
              <p>
                {order.quantity_kg} kg × {order.price_per_kg_camly.toLocaleString()} = 
                <span className="font-bold text-primary ml-1">
                  {order.total_camly.toLocaleString()} CAMLY
                </span>
              </p>
            </div>

            {/* Buyer Info */}
            {order.buyer && (
              <div className="flex items-center gap-2 mt-2">
                <Avatar className="w-6 h-6">
                  <AvatarImage src={order.buyer.avatar_url} />
                  <AvatarFallback className="text-xs">👤</AvatarFallback>
                </Avatar>
                <span className="text-sm">{order.buyer.display_name || 'Người mua'}</span>
              </div>
            )}

            {/* Delivery Address */}
            {order.delivery_address && (
              <div className="flex items-start gap-1 mt-2 text-xs text-muted-foreground">
                <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" />
                <span className="line-clamp-1">{order.delivery_address}</span>
              </div>
            )}

            {/* Payment Proof */}
            {order.payment_proof_url && (
              <a 
                href={order.payment_proof_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline mt-2"
                onClick={(e) => e.stopPropagation()}
              >
                <ExternalLink className="w-3 h-3" />
                Xem ảnh chuyển khoản
              </a>
            )}

            {/* Order Time */}
            <p className="text-xs text-muted-foreground mt-2">
              🕐 {new Date(order.created_at).toLocaleString('vi-VN')}
            </p>
          </div>
        </div>

        {/* Payment Confirmation Banner */}
        {needsPaymentConfirmation && (
          <div className="mt-3 p-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-amber-700 dark:text-amber-400">
                📷 Người mua đã upload ảnh chuyển khoản
              </p>
              <Button 
                size="sm"
                onClick={handleConfirmPayment}
                disabled={confirmingPayment}
                className="bg-green-600 hover:bg-green-700 h-7 text-xs"
              >
                {confirmingPayment ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <>
                    <DollarSign className="w-3 h-3 mr-1" />
                    Xác nhận đã nhận tiền
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 mt-4 pt-3 border-t">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1"
            onClick={() => onViewDetail(order)}
          >
            <Eye className="w-4 h-4 mr-1" />
            Chi tiết
          </Button>
          <Button 
            variant="destructive" 
            size="sm"
            onClick={() => onReject(order.id)}
          >
            <X className="w-4 h-4" />
          </Button>
          <Button 
            size="sm" 
            className="bg-green-600 hover:bg-green-700"
            onClick={() => onConfirm(order.id)}
          >
            <Check className="w-4 h-4 mr-1" />
            Xác nhận
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default NewOrderCard;
