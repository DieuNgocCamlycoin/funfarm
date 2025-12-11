import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Bike, MapPin, Coins, Shield, Loader2 } from 'lucide-react';

const ShipperRegister = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [phone, setPhone] = useState('');
  const [agreed, setAgreed] = useState(false);

  const handleRegister = async () => {
    if (!user) {
      navigate('/auth');
      return;
    }

    if (!phone) {
      toast.error('Vui lòng nhập số điện thoại');
      return;
    }

    if (!agreed) {
      toast.error('Vui lòng đồng ý với điều khoản');
      return;
    }

    setLoading(true);

    try {
      // Check if already a shipper
      const { data: existingRole } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'shipper')
        .single();

      if (existingRole) {
        toast.info('Bạn đã là Shipper rồi!');
        navigate('/shipper');
        return;
      }

      // Add shipper role
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({ user_id: user.id, role: 'shipper' });

      if (roleError) throw roleError;

      // Update phone in profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ phone })
        .eq('id', user.id);

      if (profileError) throw profileError;

      toast.success('Đăng ký Shipper thành công!');
      navigate('/shipper');
    } catch (error: any) {
      console.error('Register error:', error);
      toast.error(error.message || 'Không thể đăng ký');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-20 text-center">
          <p>Vui lòng đăng nhập để tiếp tục</p>
          <Button onClick={() => navigate('/auth')} className="mt-4">
            Đăng nhập
          </Button>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 py-6 pt-20 max-w-lg">
        <Card>
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Bike className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Trở thành Shipper FUN FARM</CardTitle>
            <CardDescription>
              Giao nông sản từ vườn đến bàn ăn, kiếm CAMLY mỗi chuyến
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Benefits */}
            <div className="grid gap-3">
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                <Coins className="w-5 h-5 text-yellow-500" />
                <div>
                  <p className="font-medium">5,000 CAMLY / đơn</p>
                  <p className="text-xs text-muted-foreground">Phí giao hàng hấp dẫn</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                <MapPin className="w-5 h-5 text-green-500" />
                <div>
                  <p className="font-medium">Tự chọn đơn gần bạn</p>
                  <p className="text-xs text-muted-foreground">Xem khoảng cách realtime</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                <Shield className="w-5 h-5 text-blue-500" />
                <div>
                  <p className="font-medium">Hỗ trợ 24/7</p>
                  <p className="text-xs text-muted-foreground">Đội ngũ hỗ trợ tận tình</p>
                </div>
              </div>
            </div>

            {/* Form */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Số điện thoại liên hệ *</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="0912 345 678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              <div className="flex items-start gap-2">
                <Checkbox
                  id="agree"
                  checked={agreed}
                  onCheckedChange={(checked) => setAgreed(checked as boolean)}
                />
                <label htmlFor="agree" className="text-sm text-muted-foreground leading-tight">
                  Tôi đồng ý với điều khoản dịch vụ và cam kết giao hàng đúng hẹn, 
                  đảm bảo chất lượng nông sản.
                </label>
              </div>
            </div>

            <Button
              onClick={handleRegister}
              disabled={loading || !phone || !agreed}
              className="w-full gap-2"
              size="lg"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Bike className="w-4 h-4" />
              )}
              Đăng ký làm Shipper
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default ShipperRegister;
