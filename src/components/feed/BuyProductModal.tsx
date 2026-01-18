import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import LocationPicker from "@/components/map/LocationPicker";
import PaymentMethodSelector from "@/components/marketplace/PaymentMethodSelector";
import PaymentQRDisplay from "@/components/marketplace/PaymentQRDisplay";
import PaymentProofUpload from "@/components/marketplace/PaymentProofUpload";
import { PaymentMethod } from "@/types/marketplace";
import { 
  ShoppingCart, 
  Package, 
  Truck, 
  TreeDeciduous,
  Sparkles,
  Loader2,
  CheckCircle2,
  MapPin,
  ArrowLeft,
  AlertCircle
} from "lucide-react";
import camlyIcon from "@/assets/camly_coin.png";

interface SellerPaymentInfo {
  bank_name: string | null;
  bank_account_number: string | null;
  bank_account_name: string | null;
  momo_phone: string | null;
  zalopay_phone: string | null;
  display_name: string | null;
}

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

type Step = 'order' | 'payment-qr' | 'upload-proof' | 'success';

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
  const navigate = useNavigate();
  
  // Form state
  const [quantity, setQuantity] = useState<string>("1");
  const [deliveryOption, setDeliveryOption] = useState<string>(deliveryOptions[0] || "self_pickup");
  const [deliveryAddress, setDeliveryAddress] = useState<string>("");
  const [deliveryLat, setDeliveryLat] = useState<number | null>(null);
  const [deliveryLng, setDeliveryLng] = useState<number | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('camly');
  
  // Flow state
  const [step, setStep] = useState<Step>('order');
  const [isProcessing, setIsProcessing] = useState(false);
  const [createdOrderId, setCreatedOrderId] = useState<string | null>(null);
  
  // Seller payment info
  const [sellerPaymentInfo, setSellerPaymentInfo] = useState<SellerPaymentInfo | null>(null);
  const [loadingSellerInfo, setLoadingSellerInfo] = useState(false);

  // Fetch seller payment info when modal opens
  useEffect(() => {
    const fetchSellerPaymentInfo = async () => {
      if (!sellerId || !open) return;
      setLoadingSellerInfo(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('bank_name, bank_account_number, bank_account_name, momo_phone, zalopay_phone, display_name')
          .eq('id', sellerId)
          .single();

        if (error) throw error;
        setSellerPaymentInfo(data);
      } catch (error) {
        console.error('Error fetching seller payment info:', error);
      } finally {
        setLoadingSellerInfo(false);
      }
    };

    fetchSellerPaymentInfo();
  }, [sellerId, open]);

  const quantityNum = parseFloat(quantity) || 0;
  const totalCamly = Math.ceil(quantityNum * priceCamly);
  const totalVnd = priceVnd ? Math.ceil(quantityNum * priceVnd) : 0;
  const userBalance = profile?.camly_balance || 0;
  const hasEnoughBalance = userBalance >= totalCamly;

  const formatNumber = (num: number) => new Intl.NumberFormat('vi-VN').format(num);

  const resetModal = () => {
    setStep('order');
    setQuantity("1");
    setDeliveryAddress("");
    setDeliveryLat(null);
    setDeliveryLng(null);
    setPaymentMethod('camly');
    setCreatedOrderId(null);
  };

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

    // For CAMLY payment, check balance
    if (paymentMethod === 'camly' && !hasEnoughBalance) {
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
      if (paymentMethod === 'camly') {
        // Direct CAMLY payment - use existing RPC
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
          p_delivery_lat: deliveryOption === "nationwide" ? deliveryLat : null,
          p_delivery_lng: deliveryOption === "nationwide" ? deliveryLng : null,
        });

        if (error) throw error;

        setStep('success');
        await refreshProfile();
        
        toast({
          title: "🎉 Chúc mừng! Đặt hàng thành công!",
          description: `Bạn đã trừ ${formatNumber(totalCamly)} CAMLY – Phước lành đang trên đường đến!`,
        });

        // Redirect after success
        setTimeout(() => {
          onOpenChange(false);
          resetModal();
          navigate('/feed');
        }, 2500);

      } else {
        // Bank/Momo/ZaloPay/Crypto - Create pending order
        const { data, error } = await supabase
          .from('orders')
          .insert({
            buyer_id: user.id,
            seller_id: sellerId,
            post_id: postId,
            product_name: productName,
            quantity_kg: quantityNum,
            price_per_kg_camly: priceCamly,
            price_per_kg_vnd: priceVnd || 0,
            total_camly: totalCamly,
            total_vnd: totalVnd,
            delivery_option: deliveryOption,
            delivery_address: deliveryOption === "nationwide" ? deliveryAddress : locationAddress || null,
            delivery_lat: deliveryOption === "nationwide" ? deliveryLat : null,
            delivery_lng: deliveryOption === "nationwide" ? deliveryLng : null,
            status: 'pending',
            payment_method: paymentMethod,
            payment_status: 'pending',
          })
          .select('id')
          .single();

        if (error) throw error;

        setCreatedOrderId(data.id);
        
        if (paymentMethod === 'crypto') {
          // For crypto, we'd integrate MetaMask here
          toast({
            title: "Tính năng đang phát triển",
            description: "Thanh toán Crypto sẽ sớm được hỗ trợ!",
          });
        } else {
          // Show QR code for bank/momo/zalopay
          setStep('payment-qr');
        }
      }

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

  const handlePaymentDone = () => {
    setStep('upload-proof');
  };

  const handleProofUploaded = () => {
    setStep('success');
    toast({
      title: "✅ Đã gửi xác nhận thanh toán!",
      description: "Người bán sẽ kiểm tra và xác nhận đơn hàng của bạn.",
    });

    setTimeout(() => {
      onOpenChange(false);
      resetModal();
    }, 2500);
  };

  // Success step
  if (step === 'success') {
    return (
      <Dialog open={open} onOpenChange={(val) => { if (!val) resetModal(); onOpenChange(val); }}>
        <DialogContent className="sm:max-w-md">
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center animate-bounce">
              <CheckCircle2 className="w-12 h-12 text-green-600" />
            </div>
            <h3 className="text-2xl font-bold text-green-600">
              {paymentMethod === 'camly' ? 'Đặt hàng thành công!' : 'Đã gửi xác nhận!'}
            </h3>
            <p className="text-muted-foreground text-center">
              {paymentMethod === 'camly' 
                ? 'Đơn hàng của bạn đã được gửi đến người bán'
                : 'Người bán sẽ kiểm tra và xác nhận thanh toán'
              }
            </p>
            {paymentMethod === 'camly' && (
              <div className="flex items-center gap-2 bg-yellow-50 px-4 py-2 rounded-full">
                <img src={camlyIcon} alt="CAMLY" className="w-5 h-5" />
                <span className="font-bold text-yellow-700">-{formatNumber(totalCamly)} CAMLY</span>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Payment QR step
  if (step === 'payment-qr' && createdOrderId) {
    return (
      <Dialog open={open} onOpenChange={(val) => { if (!val) resetModal(); onOpenChange(val); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 -ml-2"
                onClick={() => setStep('order')}
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              Thanh toán đơn hàng
            </DialogTitle>
          </DialogHeader>
          {sellerPaymentInfo && !sellerPaymentInfo.bank_account_number && 
           !sellerPaymentInfo.momo_phone && !sellerPaymentInfo.zalopay_phone ? (
            <div className="py-8 text-center space-y-4">
              <AlertCircle className="w-16 h-16 text-yellow-500 mx-auto" />
              <h3 className="text-lg font-semibold">Người bán chưa cập nhật thông tin thanh toán</h3>
              <p className="text-muted-foreground text-sm">
                Vui lòng liên hệ trực tiếp với người bán hoặc chọn phương thức thanh toán bằng CAMLY
              </p>
              <Button onClick={() => setStep('order')} variant="outline">
                Quay lại
              </Button>
            </div>
          ) : (
            <PaymentQRDisplay
              paymentMethod={paymentMethod}
              orderId={createdOrderId}
              amount={totalVnd}
              sellerInfo={{
                bankName: sellerPaymentInfo?.bank_name || undefined,
                accountNumber: sellerPaymentInfo?.bank_account_number || undefined,
                accountName: sellerPaymentInfo?.bank_account_name || sellerPaymentInfo?.display_name || undefined,
                momoPhone: sellerPaymentInfo?.momo_phone || undefined,
                zaloPayPhone: sellerPaymentInfo?.zalopay_phone || undefined,
              }}
              onPaymentDone={handlePaymentDone}
            />
          )}
        </DialogContent>
      </Dialog>
    );
  }

  // Upload proof step
  if (step === 'upload-proof' && createdOrderId) {
    return (
      <Dialog open={open} onOpenChange={(val) => { if (!val) resetModal(); onOpenChange(val); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Xác nhận thanh toán</DialogTitle>
          </DialogHeader>
          <PaymentProofUpload
            orderId={createdOrderId}
            onUploadSuccess={handleProofUploaded}
            onCancel={() => setStep('payment-qr')}
          />
        </DialogContent>
      </Dialog>
    );
  }

  // Main order form
  return (
    <Dialog open={open} onOpenChange={(val) => { if (!val) resetModal(); onOpenChange(val); }}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <ShoppingCart className="w-6 h-6 text-green-600" />
            Mua {productName}
          </DialogTitle>
          <DialogDescription>
            Nhập số lượng và chọn cách thanh toán
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

          {/* Payment method selector */}
          <PaymentMethodSelector
            value={paymentMethod}
            onChange={setPaymentMethod}
            userBalance={userBalance}
            totalCamly={totalCamly}
          />

          {/* Balance check - only show for CAMLY */}
          {paymentMethod === 'camly' && (
            <div className={`flex items-center justify-between p-3 rounded-lg ${hasEnoughBalance ? 'bg-green-50' : 'bg-red-50'}`}>
              <span className="text-sm">Số dư của bạn:</span>
              <div className="flex items-center gap-2">
                <img src={camlyIcon} alt="CAMLY" className="w-5 h-5" />
                <span className={`font-bold ${hasEnoughBalance ? 'text-green-600' : 'text-red-600'}`}>
                  {formatNumber(userBalance)}
                </span>
              </div>
            </div>
          )}

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

          {/* Delivery address with map (if nationwide) */}
          {deliveryOption === "nationwide" && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-red-500" />
                Chọn địa chỉ giao hàng trên bản đồ
              </Label>
              <LocationPicker
                initialAddress={deliveryAddress}
                onLocationChange={(lat, lng, addr) => {
                  setDeliveryLat(lat);
                  setDeliveryLng(lng);
                  setDeliveryAddress(addr);
                }}
              />
            </div>
          )}

          {/* Submit button */}
          <Button
            onClick={handleSubmit}
            disabled={isProcessing || (paymentMethod === 'camly' && !hasEnoughBalance) || quantityNum <= 0}
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
                {paymentMethod === 'camly' ? 'Đặt hàng ngay' : 'Tiếp tục thanh toán'}
                <Sparkles className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
