import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { 
  ShoppingCart, 
  Package, 
  Truck, 
  TreeDeciduous,
  Sparkles,
  Loader2,
  CheckCircle2
} from "lucide-react";
import camlyIcon from "@/assets/camly_coin.png";

interface BuyProductModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  postId: string;
  sellerId: string;
  productName: string;
  priceCamly: number;
  priceVnd?: number;
  maxQuantity: number;
  deliveryOptions: string[];
  locationAddress?: string;
}

const DELIVERY_CONFIG: Record<string, { label: string; icon: typeof Package }> = {
  self_pickup: { label: "Tự đến lấy", icon: Package },
  nationwide: { label: "Giao toàn quốc", icon: Truck },
  farm_visit: { label: "Đến vườn trải nghiệm", icon: TreeDeciduous },
};

export default function BuyProductModal({
  open,
  onOpenChange,
  postId,
  sellerId,
  productName,
  priceCamly,
  priceVnd,
  maxQuantity,
  deliveryOptions,
  locationAddress,
}: BuyProductModalProps) {
  const { user, profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [quantity, setQuantity] = useState<string>("1");
  const [deliveryOption, setDeliveryOption] = useState<string>(deliveryOptions[0] || "self_pickup");
  const [deliveryAddress, setDeliveryAddress] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const quantityNum = parseFloat(quantity) || 0;
  const totalCamly = Math.ceil(quantityNum * priceCamly);
  const totalVnd = priceVnd ? Math.ceil(quantityNum * priceVnd) : 0;
  const userBalance = profile?.camly_balance || 0;
  const hasEnoughBalance = userBalance >= totalCamly;

  const formatNumber = (num: number) => new Intl.NumberFormat('vi-VN').format(num);

  const handleSubmit = async () => {
    if (!user) {
      toast({
        title: "Vui lòng đăng nhập",
        description: "Bạn cần đăng nhập để mua hàng",
        variant: "destructive",
      });
      return;
    }

    if (quantityNum <= 0 || quantityNum > maxQuantity) {
      toast({
        title: "Số lượng không hợp lệ",
        description: `Vui lòng nhập số lượng từ 0.1 đến ${maxQuantity} kg`,
        variant: "destructive",
      });
      return;
    }

    if (!hasEnoughBalance) {
      toast({
        title: "Không đủ CAMLY",
        description: `Bạn cần ${formatNumber(totalCamly)} CAMLY nhưng chỉ có ${formatNumber(userBalance)} CAMLY`,
        variant: "destructive",
      });
      return;
    }

    if (deliveryOption === "nationwide" && !deliveryAddress.trim()) {
      toast({
        title: "Thiếu địa chỉ giao hàng",
        description: "Vui lòng nhập địa chỉ giao hàng",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    try {
      const { data, error } = await supabase.rpc('process_order', {
        p_buyer_id: user.id,
        p_seller_id: sellerId,
        p_post_id: postId,
        p_product_name: productName,
        p_quantity_kg: quantityNum,
        p_price_per_kg_camly: priceCamly,
        p_price_per_kg_vnd: priceVnd || 0,
        p_delivery_option: deliveryOption,
        p_delivery_address: deliveryOption === "nationwide" ? deliveryAddress : locationAddress || null,
      });

      if (error) throw error;

      setIsSuccess(true);
      await refreshProfile();
      
      toast({
        title: "🎉 Đặt hàng thành công!",
        description: `Bạn đã mua ${quantityNum} kg ${productName}`,
      });

      setTimeout(() => {
        onOpenChange(false);
        setIsSuccess(false);
        setQuantity("1");
        setDeliveryAddress("");
      }, 2000);

    } catch (error: any) {
      console.error("Order error:", error);
      toast({
        title: "Lỗi đặt hàng",
        description: error.message || "Có lỗi xảy ra, vui lòng thử lại",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (isSuccess) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center animate-bounce">
              <CheckCircle2 className="w-12 h-12 text-green-600" />
            </div>
            <h3 className="text-2xl font-bold text-green-600">Đặt hàng thành công!</h3>
            <p className="text-muted-foreground text-center">
              Đơn hàng của bạn đã được gửi đến người bán
            </p>
            <div className="flex items-center gap-2 bg-yellow-50 px-4 py-2 rounded-full">
              <img src={camlyIcon} alt="CAMLY" className="w-5 h-5" />
              <span className="font-bold text-yellow-700">-{formatNumber(totalCamly)} CAMLY</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <ShoppingCart className="w-6 h-6 text-green-600" />
            Mua {productName}
          </DialogTitle>
          <DialogDescription>
            Nhập số lượng và chọn cách nhận hàng
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Quantity input */}
          <div className="space-y-2">
            <Label htmlFor="quantity">Số lượng (kg)</Label>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setQuantity(Math.max(0.5, quantityNum - 0.5).toString())}
                disabled={quantityNum <= 0.5}
              >
                -
              </Button>
              <Input
                id="quantity"
                type="number"
                min="0.1"
                max={maxQuantity}
                step="0.1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="text-center text-lg font-bold"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setQuantity(Math.min(maxQuantity, quantityNum + 0.5).toString())}
                disabled={quantityNum >= maxQuantity}
              >
                +
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Còn {formatNumber(maxQuantity)} kg trong kho
            </p>
          </div>

          {/* Price summary */}
          <div className="bg-gradient-to-r from-green-50 to-yellow-50 p-4 rounded-xl space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Giá/kg:</span>
              <div className="flex items-center gap-1">
                <img src={camlyIcon} alt="CAMLY" className="w-4 h-4" />
                <span className="font-medium">{formatNumber(priceCamly)}</span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Số lượng:</span>
              <span className="font-medium">{quantityNum} kg</span>
            </div>
            <hr className="border-dashed" />
            <div className="flex justify-between items-center text-lg">
              <span className="font-bold">Tổng cộng:</span>
              <div className="flex items-center gap-2">
                <img src={camlyIcon} alt="CAMLY" className="w-6 h-6" />
                <span className="font-bold text-green-600">{formatNumber(totalCamly)}</span>
              </div>
            </div>
            {priceVnd && totalVnd > 0 && (
              <p className="text-right text-sm text-muted-foreground">
                ≈ {formatNumber(totalVnd)} VNĐ
              </p>
            )}
          </div>

          {/* Balance check */}
          <div className={`flex items-center justify-between p-3 rounded-lg ${hasEnoughBalance ? 'bg-green-50' : 'bg-red-50'}`}>
            <span className="text-sm">Số dư của bạn:</span>
            <div className="flex items-center gap-2">
              <img src={camlyIcon} alt="CAMLY" className="w-5 h-5" />
              <span className={`font-bold ${hasEnoughBalance ? 'text-green-600' : 'text-red-600'}`}>
                {formatNumber(userBalance)}
              </span>
            </div>
          </div>

          {/* Delivery options */}
          <div className="space-y-2">
            <Label>Cách nhận hàng</Label>
            <RadioGroup value={deliveryOption} onValueChange={setDeliveryOption}>
              {deliveryOptions.map((option) => {
                const config = DELIVERY_CONFIG[option];
                if (!config) return null;
                const Icon = config.icon;
                return (
                  <div key={option} className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-muted/50">
                    <RadioGroupItem value={option} id={option} />
                    <Label htmlFor={option} className="flex items-center gap-2 cursor-pointer flex-1">
                      <Icon className="w-4 h-4 text-green-600" />
                      {config.label}
                    </Label>
                  </div>
                );
              })}
            </RadioGroup>
          </div>

          {/* Delivery address (if nationwide) */}
          {deliveryOption === "nationwide" && (
            <div className="space-y-2">
              <Label htmlFor="address">Địa chỉ giao hàng</Label>
              <Textarea
                id="address"
                placeholder="Nhập địa chỉ đầy đủ (số nhà, đường, quận/huyện, tỉnh/thành phố)"
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                rows={3}
              />
            </div>
          )}

          {/* Submit button */}
          <Button
            onClick={handleSubmit}
            disabled={isProcessing || !hasEnoughBalance || quantityNum <= 0}
            className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white text-lg py-6"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Đang xử lý...
              </>
            ) : (
              <>
                <ShoppingCart className="w-5 h-5 mr-2" />
                Đặt hàng ngay
                <Sparkles className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
