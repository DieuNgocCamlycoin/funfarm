import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { CreditCard, Smartphone, Loader2, CheckCircle2 } from "lucide-react";

const BANKS = [
  'Vietcombank',
  'Techcombank',
  'BIDV',
  'Agribank',
  'VPBank',
  'MBBank',
  'ACB',
  'TPBank',
  'Sacombank',
  'HDBank',
  'VIB',
  'SHB',
  'Eximbank',
  'MSB',
  'SeABank',
  'OCB',
  'LienVietPostBank',
  'Bac A Bank',
];

interface PaymentInfo {
  bank_name: string | null;
  bank_account_number: string | null;
  bank_account_name: string | null;
  momo_phone: string | null;
  zalopay_phone: string | null;
}

export default function PaymentInfoForm() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo>({
    bank_name: null,
    bank_account_number: null,
    bank_account_name: null,
    momo_phone: null,
    zalopay_phone: null,
  });

  useEffect(() => {
    if (user?.id) fetchPaymentInfo();
  }, [user?.id]);

  const fetchPaymentInfo = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('bank_name, bank_account_number, bank_account_name, momo_phone, zalopay_phone')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      if (data) {
        setPaymentInfo(data);
      }
    } catch (error) {
      console.error('Error fetching payment info:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user?.id) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          bank_name: paymentInfo.bank_name,
          bank_account_number: paymentInfo.bank_account_number,
          bank_account_name: paymentInfo.bank_account_name,
          momo_phone: paymentInfo.momo_phone,
          zalopay_phone: paymentInfo.zalopay_phone,
        })
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: "✅ Đã lưu thông tin thanh toán",
        description: "Người mua sẽ thấy thông tin này khi thanh toán đơn hàng.",
      });
    } catch (error: any) {
      console.error('Error saving payment info:', error);
      toast({
        title: "Lỗi",
        description: error.message || "Không thể lưu thông tin thanh toán",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const hasAnyPaymentInfo = paymentInfo.bank_account_number || paymentInfo.momo_phone || paymentInfo.zalopay_phone;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <CreditCard className="w-5 h-5 text-primary" />
          Thông tin nhận thanh toán
          {hasAnyPaymentInfo && (
            <CheckCircle2 className="w-5 h-5 text-green-500 ml-auto" />
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Bank Transfer Section */}
        <div className="space-y-4">
          <h4 className="font-medium text-sm text-muted-foreground">💳 Chuyển khoản ngân hàng</h4>
          
          <div className="space-y-2">
            <Label>Ngân hàng</Label>
            <Select 
              value={paymentInfo.bank_name || ''} 
              onValueChange={(val) => setPaymentInfo(prev => ({ ...prev, bank_name: val }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Chọn ngân hàng" />
              </SelectTrigger>
              <SelectContent>
                {BANKS.map(bank => (
                  <SelectItem key={bank} value={bank}>{bank}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Số tài khoản</Label>
            <Input
              placeholder="VD: 1234567890"
              value={paymentInfo.bank_account_number || ''}
              onChange={(e) => setPaymentInfo(prev => ({ ...prev, bank_account_number: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label>Tên chủ tài khoản</Label>
            <Input
              placeholder="VD: NGUYEN VAN A"
              value={paymentInfo.bank_account_name || ''}
              onChange={(e) => setPaymentInfo(prev => ({ ...prev, bank_account_name: e.target.value.toUpperCase() }))}
            />
          </div>
        </div>

        {/* E-wallet Section */}
        <div className="space-y-4">
          <h4 className="font-medium text-sm text-muted-foreground flex items-center gap-2">
            <Smartphone className="w-4 h-4" />
            Ví điện tử
          </h4>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                💜 Momo
              </Label>
              <Input
                placeholder="Số điện thoại Momo"
                value={paymentInfo.momo_phone || ''}
                onChange={(e) => setPaymentInfo(prev => ({ ...prev, momo_phone: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                💙 ZaloPay
              </Label>
              <Input
                placeholder="Số điện thoại ZaloPay"
                value={paymentInfo.zalopay_phone || ''}
                onChange={(e) => setPaymentInfo(prev => ({ ...prev, zalopay_phone: e.target.value }))}
              />
            </div>
          </div>
        </div>

        <Button 
          onClick={handleSave} 
          disabled={saving}
          className="w-full"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Đang lưu...
            </>
          ) : (
            'Lưu thông tin thanh toán'
          )}
        </Button>

        <p className="text-xs text-muted-foreground text-center">
          💡 Thông tin này sẽ được hiển thị cho người mua khi họ chọn thanh toán bằng chuyển khoản hoặc ví điện tử
        </p>
      </CardContent>
    </Card>
  );
}
