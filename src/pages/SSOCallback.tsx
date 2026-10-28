// 🌱 SSO Callback Page for "Vạn Vật Quy Nhất" Integration
// Handles OAuth 2.0 + PKCE code exchange via SDK

import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, CheckCircle2, XCircle, Sparkles, Link as LinkIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  handleSSOCallback, 
  syncProfileFromSSO, 
  linkFunIdToProfile,
  TokenExpiredError, 
  RateLimitError, 
  NetworkError 
} from '@/lib/sso';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { SSOUser } from '@/lib/sso/types';

type CallbackState = 'loading' | 'success' | 'error' | 'linked';

const SSOCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [state, setState] = useState<CallbackState>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [userName, setUserName] = useState('');

  useEffect(() => {
    const processCallback = async () => {
      // Get code and state from URL params (OAuth 2.0 + PKCE flow)
      const code = searchParams.get('code');
      const stateParam = searchParams.get('state');

      if (!code || !stateParam) {
        setState('error');
        setErrorMessage('Không tìm thấy mã xác thực từ Fun Profile');
        return;
      }

      try {
        // Exchange code for tokens via SDK
        const result = await handleSSOCallback(code, stateParam);
        
        if (!result.user) {
          setState('error');
          setErrorMessage('Không thể lấy thông tin người dùng');
          return;
        }

        // Map SDK user to our SSOUser type
        const ssoUser: SSOUser = {
          fun_id: result.user.id,
          email: result.user.email || '',
          display_name: result.user.username || result.user.fullName || null,
          avatar_url: result.user.avatarUrl || null,
          wallet_address: result.user.walletAddress || result.user.externalWalletAddress || '',
          is_verified: true, // SSO users are verified by default
          created_at: new Date().toISOString(),
        };

        setUserName(ssoUser.display_name || ssoUser.email);

        // Check if this is a "link" action (linking Fun-ID to existing account)
        const ssoAction = sessionStorage.getItem('sso_action');
        sessionStorage.removeItem('sso_action');

        if (ssoAction === 'link') {
          // Link Fun-ID to current logged-in user
          const { data: { user: currentUser } } = await supabase.auth.getUser();
          
          if (currentUser) {
            const linked = await linkFunIdToProfile(
              currentUser.id, 
              ssoUser.fun_id,
              result.user.id // fun_profile_id from SDK
            );
            
            if (linked) {
              setState('linked');
              toast.success('Đã liên kết Fun-ID thành công! 🎉');
              setTimeout(() => navigate('/profile'), 2000);
              return;
            } else {
              setState('error');
              setErrorMessage('Không thể liên kết Fun-ID với tài khoản của bạn');
              return;
            }
          } else {
            setState('error');
            setErrorMessage('Vui lòng đăng nhập trước khi liên kết Fun-ID');
            return;
          }
        }

        // Normal SSO login flow
        const syncResult = await syncProfileFromSSO(ssoUser);
        
        if (!syncResult.success) {
          setState('error');
          setErrorMessage(syncResult.error || 'Không thể đồng bộ hồ sơ');
          return;
        }

        if (syncResult.isNewUser) {
          // New user - create Supabase Auth account
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
            if (authError.message.includes('already registered')) {
              toast.info('Tài khoản đã tồn tại. Đang liên kết với Fun-ID...');
              navigate('/auth');
              return;
            }
            
            setState('error');
            setErrorMessage(authError.message);
            return;
          }

          if (authData.user) {
            // Update profile with Fun-ID
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
        
        // Handle SDK-specific errors
        if (error instanceof TokenExpiredError) {
          setErrorMessage('Phiên đăng nhập đã hết hạn. Vui lòng thử lại.');
        } else if (error instanceof RateLimitError) {
          const retryAfter = (error as any).retryAfter || 60;
          setErrorMessage(`Quá nhiều yêu cầu. Vui lòng đợi ${retryAfter}s rồi thử lại.`);
        } else if (error instanceof NetworkError) {
          setErrorMessage('Lỗi mạng. Vui lòng kiểm tra kết nối và thử lại.');
        } else {
          setErrorMessage('Có lỗi xảy ra trong quá trình xác thực');
        }
        
        setState('error');
      }
    };

    processCallback();
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

          {state === 'linked' && (
            <>
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-primary/20 flex items-center justify-center">
                <LinkIcon className="w-10 h-10 text-primary" />
              </div>
              <CardTitle className="text-2xl font-display text-primary">
                Liên kết thành công! 🔗
              </CardTitle>
              <CardDescription className="text-base">
                Fun-ID của <span className="font-semibold text-foreground">{userName}</span> đã được liên kết
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

          {state === 'linked' && (
            <div className="bg-gradient-to-r from-primary/10 to-accent/10 rounded-xl p-4 text-center border border-primary/20">
              <Sparkles className="w-6 h-6 text-primary mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                Đang chuyển hướng đến hồ sơ của bạn...
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
