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
import { useMetaMask, TOKEN_ADDRESSES } from "@/hooks/useMetaMask";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
  AlertCircle,
  Wallet,
  ExternalLink,
  AlertTriangle,
  Bitcoin
} from "lucide-react";
import camlyIcon from "@/assets/camly_coin.png";

interface SellerPaymentInfo {
  bank_name: string | null;
  bank_account_number: string | null;
  bank_account_name: string | null;
  momo_phone: string | null;
  zalopay_phone: string | null;
  display_name: string | null;
  wallet_address: string | null;
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

// Crypto exchange rates (VND per crypto) - can be fetched from API later
const CRYPTO_RATES = {
  BNB: 15000000, // ~15M VND per BNB
  USDT: 25500,   // ~25.5K VND per USDT
  BTCB: 2500000000, // ~2.5B VND per BTCB
};

type CryptoType = 'BNB' | 'USDT' | 'BTCB';

type Step = 'order' | 'payment-qr' | 'crypto-payment' | 'upload-proof' | 'success';

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
  const metamask = useMetaMask();
  
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
  
  // Crypto payment state
  const [cryptoType, setCryptoType] = useState<CryptoType>('USDT');
  const [cryptoTxHash, setCryptoTxHash] = useState<string | null>(null);
  
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
          .select('bank_name, bank_account_number, bank_account_name, momo_phone, zalopay_phone, display_name, wallet_address')
          .eq('id', sellerId)
          .single();

        if (error) throw error;
        setSellerPaymentInfo(data as SellerPaymentInfo);
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

  // Calculate crypto amount based on VND
  const getCryptoAmount = (vnd: number, crypto: CryptoType): string => {
    const rate = CRYPTO_RATES[crypto];
    const amount = vnd / rate;
    // Return with appropriate precision
    if (crypto === 'BTCB') return amount.toFixed(8);
    if (crypto === 'BNB') return amount.toFixed(6);
    return amount.toFixed(2); // USDT
  };

  const cryptoAmount = getCryptoAmount(totalVnd || totalCamly * 25.5, cryptoType);

  const resetModal = () => {
    setStep('order');
    setQuantity("1");
    setDeliveryAddress("");
    setDeliveryLat(null);
    setDeliveryLng(null);
    setPaymentMethod('camly');
    setCreatedOrderId(null);
    setCryptoType('USDT');
    setCryptoTxHash(null);
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

    // Check if product is sold out
    if (maxQuantity <= 0) {
      toast({
        title: "Sản phẩm đã hết hàng",
        description: "Rất tiếc, sản phẩm này hiện không còn hàng",
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
          // Check if seller has wallet address
          if (!sellerPaymentInfo?.wallet_address) {
            toast({
              title: "Người bán chưa có ví",
              description: "Người bán chưa kết nối ví crypto. Vui lòng chọn phương thức khác.",
              variant: "destructive",
            });
            return;
          }
          setStep('crypto-payment');
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

  // Handle crypto payment via MetaMask
  const handleCryptoPayment = async () => {
    if (!metamask.isConnected || !sellerPaymentInfo?.wallet_address || !createdOrderId) return;
    
    setIsProcessing(true);
    let txHash: string | null = null;
    
    try {
      const sellerWallet = sellerPaymentInfo.wallet_address;
      
      // Send transaction based on selected crypto type
      if (cryptoType === 'BNB') {
        txHash = await metamask.sendBNB(sellerWallet, cryptoAmount);
      } else if (cryptoType === 'USDT') {
        txHash = await metamask.sendUSDT(sellerWallet, cryptoAmount);
      } else if (cryptoType === 'BTCB') {
        txHash = await metamask.sendBTCB(sellerWallet, cryptoAmount);
      }
      
      if (!txHash) throw new Error('Giao dịch thất bại');
      
      // Update order with tx hash
      await supabase
        .from('orders')
        .update({
          payment_status: 'completed',
          payment_confirmed_at: new Date().toISOString(),
          crypto_tx_hash: txHash,
          crypto_currency: cryptoType,
          crypto_amount: parseFloat(cryptoAmount),
        })
        .eq('id', createdOrderId);
      
      setCryptoTxHash(txHash);
      setStep('success');
      
      toast({
        title: "🎉 Thanh toán crypto thành công!",
        description: `TX: ${txHash.slice(0, 10)}...${txHash.slice(-8)}`,
      });
      
      setTimeout(() => {
        onOpenChange(false);
        resetModal();
        navigate('/my-orders');
      }, 2500);
      
    } catch (error: any) {
      console.error("Crypto payment error:", error);
      toast({
        title: "Giao dịch thất bại",
        description: error.message || "Có lỗi xảy ra khi thanh toán crypto",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
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
              {paymentMethod === 'camly' ? 'Đặt hàng thành công!' : 
               paymentMethod === 'crypto' ? 'Thanh toán Crypto thành công!' : 'Đã gửi xác nhận!'}
            </h3>
            <p className="text-muted-foreground text-center">
              {paymentMethod === 'camly' 
                ? 'Đơn hàng của bạn đã được gửi đến người bán'
                : paymentMethod === 'crypto'
                ? 'Giao dịch đã được xác nhận trên blockchain'
                : 'Người bán sẽ kiểm tra và xác nhận thanh toán'
              }
            </p>
            {paymentMethod === 'camly' && (
              <div className="flex items-center gap-2 bg-yellow-50 px-4 py-2 rounded-full">
                <img src={camlyIcon} alt="CAMLY" className="w-5 h-5" />
                <span className="font-bold text-yellow-700">-{formatNumber(totalCamly)} CAMLY</span>
              </div>
            )}
            {paymentMethod === 'crypto' && cryptoTxHash && (
              <div className="space-y-2 text-center">
                <div className="flex items-center gap-2 bg-orange-50 px-4 py-2 rounded-full">
                  <Bitcoin className="w-5 h-5 text-orange-600" />
                  <span className="font-bold text-orange-700">-{cryptoAmount} {cryptoType}</span>
                </div>
                <a 
                  href={`https://bscscan.com/tx/${cryptoTxHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                >
                  Xem trên BscScan <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Crypto payment step
  if (step === 'crypto-payment' && createdOrderId && sellerPaymentInfo?.wallet_address) {
    const sellerWallet = sellerPaymentInfo.wallet_address;
    
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
              Thanh toán Crypto
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Warning about on-chain transaction */}
            <Alert className="border-yellow-500/30 bg-yellow-500/10">
              <AlertTriangle className="w-4 h-4 text-yellow-600" />
              <AlertDescription className="text-sm">
                Giao dịch on-chain trên BSC Network. Cần MetaMask và BNB cho gas fee.
              </AlertDescription>
            </Alert>
            
            {/* MetaMask not installed */}
            {!metamask.isInstalled && (
              <div className="text-center py-6 space-y-4">
                <Wallet className="w-16 h-16 text-muted-foreground mx-auto" />
                <p className="text-muted-foreground">MetaMask chưa được cài đặt</p>
                <Button asChild variant="outline">
                  <a href="https://metamask.io/download/" target="_blank" rel="noopener noreferrer">
                    Cài đặt MetaMask
                  </a>
                </Button>
              </div>
            )}
            
            {/* Connect MetaMask button */}
            {metamask.isInstalled && !metamask.isConnected && (
              <Button 
                onClick={metamask.connect} 
                disabled={metamask.isConnecting}
                className="w-full bg-orange-500 hover:bg-orange-600"
              >
                {metamask.isConnecting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Đang kết nối...
                  </>
                ) : (
                  <>
                    <Wallet className="w-4 h-4 mr-2" />
                    Kết nối MetaMask
                  </>
                )}
              </Button>
            )}
            
            {/* Connected - show payment interface */}
            {metamask.isConnected && (
              <div className="space-y-4">
                {/* Your wallet */}
                <div className="p-3 bg-muted/50 rounded-lg space-y-1">
                  <Label className="text-xs text-muted-foreground">Ví của bạn (BSC)</Label>
                  <p className="font-mono text-sm">
                    {metamask.address?.slice(0, 10)}...{metamask.address?.slice(-8)}
                  </p>
                </div>
                
                {/* Seller wallet */}
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg space-y-1">
                  <Label className="text-xs text-green-600">Ví người bán (BSC)</Label>
                  <div className="flex items-center gap-2">
                    <p className="font-mono text-sm flex-1">
                      {sellerWallet.slice(0, 10)}...{sellerWallet.slice(-8)}
                    </p>
                    <a 
                      href={`https://bscscan.com/address/${sellerWallet}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-green-600 hover:text-green-700"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>
                
                {/* Crypto type selector */}
                <div className="space-y-2">
                  <Label>Chọn loại tiền</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['BNB', 'USDT', 'BTCB'] as CryptoType[]).map((crypto) => {
                      const balance = crypto === 'BNB' ? metamask.bnbBalance :
                                     crypto === 'USDT' ? metamask.usdtBalance : metamask.btcbBalance;
                      return (
                        <button
                          key={crypto}
                          onClick={() => setCryptoType(crypto)}
                          className={`p-3 rounded-lg border-2 transition-all ${
                            cryptoType === crypto 
                              ? 'border-primary bg-primary/10' 
                              : 'border-muted hover:border-muted-foreground/50'
                          }`}
                        >
                          <div className="font-bold">{crypto}</div>
                          <div className="text-xs text-muted-foreground truncate">
                            {parseFloat(balance).toFixed(4)}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
                
                {/* Amount to pay */}
                <div className="p-4 bg-gradient-to-r from-orange-50 to-yellow-50 rounded-xl space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Tổng tiền:</span>
                    <span className="font-medium">{formatNumber(totalVnd || totalCamly * 25.5)} VNĐ</span>
                  </div>
                  <div className="flex justify-between items-center text-lg">
                    <span className="font-bold">Thanh toán:</span>
                    <span className="font-bold text-orange-600">{cryptoAmount} {cryptoType}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    * Tỷ giá tham khảo, có thể dao động
                  </p>
                </div>
                
                {/* Confirm button */}
                <Button
                  onClick={handleCryptoPayment}
                  disabled={isProcessing}
                  className="w-full bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-white"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Đang xử lý giao dịch...
                    </>
                  ) : (
                    <>
                      <Bitcoin className="w-4 h-4 mr-2" />
                      Xác nhận thanh toán {cryptoType}
                    </>
                  )}
                </Button>
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
