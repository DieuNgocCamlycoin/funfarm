import { useState } from 'react';
import { Link2, ExternalLink, Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { startSSOLogin } from '@/lib/sso';
import { toast } from 'sonner';

interface LinkFunIdButtonProps {
  compact?: boolean;
}

export function LinkFunIdButton({ compact = false }: LinkFunIdButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleLinkFunId = async () => {
    try {
      setIsLoading(true);
      // Store action in sessionStorage so callback knows this is a link action
      sessionStorage.setItem('sso_action', 'link');
      const authUrl = await startSSOLogin();
      window.location.href = authUrl;
    } catch (error) {
      console.error('Error starting SSO:', error);
      toast.error('Không thể kết nối với Fun Profile. Vui lòng thử lại.');
      setIsLoading(false);
    }
  };

  if (compact) {
    return (
      <Button 
        onClick={handleLinkFunId} 
        disabled={isLoading}
        variant="outline"
        className="gap-2"
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Link2 className="h-4 w-4" />
        )}
        Liên kết Fun-ID
      </Button>
    );
  }

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Sparkles className="h-5 w-5 text-primary" />
          Liên kết Fun-ID
        </CardTitle>
        <CardDescription>
          Bạn chưa kết nối Fun-ID. Kết nối ngay để:
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <ul className="space-y-1.5 text-sm text-muted-foreground">
          <li className="flex items-center gap-2">
            <span className="text-green-500">✓</span>
            Đăng nhập 1-click trên toàn hệ sinh thái
          </li>
          <li className="flex items-center gap-2">
            <span className="text-green-500">✓</span>
            Đồng bộ data với Fun Profile
          </li>
          <li className="flex items-center gap-2">
            <span className="text-green-500">✓</span>
            Nhận thưởng đặc biệt cho early adopter
          </li>
        </ul>
        
        <Button 
          onClick={handleLinkFunId} 
          disabled={isLoading}
          className="w-full gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Đang kết nối...
            </>
          ) : (
            <>
              <Link2 className="h-4 w-4" />
              Liên kết Fun-ID ngay
              <ExternalLink className="h-3 w-3 ml-auto" />
            </>
          )}
        </Button>

        <p className="text-xs text-center text-muted-foreground pt-2">
          💡 Chưa có Fun-ID?{' '}
          <a 
            href="https://fun.rich/register"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            Đăng ký tại Fun Profile
          </a>
        </p>
      </CardContent>
    </Card>
  );
}
