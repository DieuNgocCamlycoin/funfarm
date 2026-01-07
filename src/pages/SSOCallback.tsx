// 🌱 SSO Callback Page for "Vạn Vật Quy Nhất" Integration
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, CheckCircle2, XCircle, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { validateSSOToken, syncProfileFromSSO } from '@/lib/sso';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type CallbackState = 'loading' | 'success' | 'error';

const SSOCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [state, setState] = useState<CallbackState>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [userName, setUserName] = useState('');

  useEffect(() => {
    const handleCallback = async () => {
      // Get token from URL hash or query params
      const hash = window.location.hash;
      let token = searchParams.get('token');
      
      // Check hash for token (fragment-based OAuth)
      if (hash && !token) {
        const hashParams = new URLSearchParams(hash.substring(1));
        token = hashParams.get('access_token') || hashParams.get('token');
      }

      if (!token) {
        setState('error');
        setErrorMessage('Không tìm thấy token xác thực từ Fun Profile');
        return;
      }

      try {
        // Validate SSO token
        const validation = await validateSSOToken(token);
        
        if (!validation.valid || !validation.user) {
          setState('error');
          setErrorMessage(validation.error || 'Token không hợp lệ');
          return;
        }

        const ssoUser = validation.user;
        setUserName(ssoUser.display_name || ssoUser.email);

        // Sync profile to local database
        const syncResult = await syncProfileFromSSO(ssoUser);
        
        if (!syncResult.success) {
          setState('error');
          setErrorMessage(syncResult.error || 'Không thể đồng bộ hồ sơ');
          return;
        }

        if (syncResult.isNewUser) {
          // New user - need to create Supabase Auth account
          // Generate a secure random password (user won't need it with SSO)
          const tempPassword = crypto.randomUUID();
          
          const { data: authData, error: authError } = await supabase.auth.signUp({
            email: ssoUser.email,
            password: tempPassword,
            options: {
              data: {
                fun_id: ssoUser.fun_id,
                display_name: ssoUser.display_name,
                avatar_url: ssoUser.avatar_url,
              },
            },
          });

          if (authError) {
            // Check if user already exists
            if (authError.message.includes('already registered')) {
              // Try to sign in and link Fun-ID
              toast.info('Tài khoản đã tồn tại. Đang liên kết với Fun-ID...');
              navigate('/auth');
              return;
            }
            
            setState('error');
            setErrorMessage(authError.message);
            return;
          }

          if (authData.user) {
            // Update the new profile with Fun-ID
            await supabase.from('profiles').update({
              fun_id: ssoUser.fun_id,
              display_name: ssoUser.display_name,
              avatar_url: ssoUser.avatar_url,
              wallet_address: ssoUser.wallet_address,
              is_verified: ssoUser.is_verified,
              synced_from_profile: true,
              last_synced_at: new Date().toISOString(),
            }).eq('id', authData.user.id);
          }
        }

        // Success!
        setState('success');
        toast.success(`Chào mừng ${ssoUser.display_name || 'bạn'} đến Fun Farm! 🌱`);
        
        // Redirect to feed after short delay
        setTimeout(() => {
          navigate('/feed');
        }, 2000);

      } catch (error) {
        console.error('SSO callback error:', error);
        setState('error');
        setErrorMessage('Có lỗi xảy ra trong quá trình xác thực');
      }
    };

    handleCallback();
  }, [navigate, searchParams]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-primary/20 shadow-glow">
        <CardHeader className="text-center">
          {state === 'loading' && (
            <>
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-primary/20 flex items-center justify-center">
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
              </div>
              <CardTitle className="text-2xl font-display">
                Đang kết nối Fun-ID...
              </CardTitle>
              <CardDescription>
                Vui lòng đợi trong giây lát
              </CardDescription>
            </>
          )}

          {state === 'success' && (
            <>
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10 text-emerald-500" />
              </div>
              <CardTitle className="text-2xl font-display text-emerald-600">
                Kết nối thành công! ✨
              </CardTitle>
              <CardDescription className="text-base">
                Chào mừng <span className="font-semibold text-foreground">{userName}</span> đến Fun Farm
              </CardDescription>
            </>
          )}

          {state === 'error' && (
            <>
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-destructive/20 flex items-center justify-center">
                <XCircle className="w-10 h-10 text-destructive" />
              </div>
              <CardTitle className="text-2xl font-display text-destructive">
                Kết nối thất bại
              </CardTitle>
              <CardDescription className="text-base">
                {errorMessage}
              </CardDescription>
            </>
          )}
        </CardHeader>

        <CardContent className="space-y-4">
          {state === 'success' && (
            <div className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 rounded-xl p-4 text-center border border-emerald-500/20">
              <Sparkles className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                Đang chuyển hướng đến trang chính...
              </p>
            </div>
          )}

          {state === 'error' && (
            <div className="space-y-3">
              <Button 
                onClick={() => navigate('/auth')} 
                className="w-full"
              >
                Quay lại đăng nhập
              </Button>
              <Button 
                variant="outline"
                onClick={() => window.location.reload()} 
                className="w-full"
              >
                Thử lại
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SSOCallback;
