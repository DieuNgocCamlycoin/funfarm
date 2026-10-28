import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { startSSOLogin } from '@/lib/sso';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { session, isLoading } = useAuth();
  const [doorError, setDoorError] = useState('');
  const [doorAttempt, setDoorAttempt] = useState(0);

  // PILOT (đính chính 2026-10-28): chưa đăng nhập thì TỰ ĐỘNG chuyển thẳng
  // sang cửa account.fun.rich bằng startAuth/PKCE có sẵn, không qua /auth
  // trung gian, không qua màn hình chọn nào khác.
  useEffect(() => {
    if (isLoading || session) return;
    let cancelled = false;
    (async () => {
      try {
        const url = await startSSOLogin();
        if (!cancelled) {
          window.location.href = url;
        }
      } catch {
        if (!cancelled) {
          setDoorError('Không mở được cửa đăng nhập FUN. Vui lòng thử lại.');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isLoading, session, doorAttempt]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center max-w-md">
          {doorError ? (
            <>
              <p className="text-destructive mb-4">{doorError}</p>
              <Button
                onClick={() => {
                  setDoorError('');
                  setDoorAttempt((c) => c + 1);
                }}
              >
                Thử lại / Retry
              </Button>
            </>
          ) : (
            <div className="flex items-center justify-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="text-muted-foreground">
                Đang chuyển tới cửa FUN... / Redirecting to the FUN door...
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
