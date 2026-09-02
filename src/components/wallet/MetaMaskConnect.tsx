import React, { useState } from 'react';
import { useMetaMask } from '@/hooks/useMetaMask';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Wallet, 
  Link2, 
  Link2Off, 
  ExternalLink,
  RefreshCw,
  Bitcoin,
  ShieldCheck,
} from 'lucide-react';

const formatAddress = (address: string) => {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

const formatBalance = (balance: string, decimals: number = 4) => {
  const num = parseFloat(balance);
  if (num === 0) return '0';
  if (num < 0.0001) return '<0.0001';
  return num.toFixed(decimals);
};

const MetaMaskConnect: React.FC = () => {
  const { profile, refreshProfile } = useAuth();
  const [isLinking, setIsLinking] = useState(false);
  const {
    isInstalled,
    isConnected,
    isConnecting,
    address,
    bnbBalance,
    camlyBalance,
    usdtBalance,
    btcbBalance,
    error,
    connect,
    disconnect,
    refreshBalances,
  } = useMetaMask();
  const isVerifiedWallet = Boolean(
    address && profile?.wallet_address && address.toLowerCase() === profile.wallet_address.toLowerCase()
  );

  const linkCurrentWallet = async () => {
    if (!address || !(window as any).ethereum) return;
    setIsLinking(true);
    try {
      const { data: request, error: requestError } = await supabase.functions.invoke('link-wallet', {
        body: { action: 'request', wallet: address },
      });
      if (requestError || !request?.success) throw new Error(request?.error || requestError?.message);

      const signature = await (window as any).ethereum.request({
        method: 'personal_sign',
        params: [request.message, address],
      });
      const { data: verified, error: verifyError } = await supabase.functions.invoke('link-wallet', {
        body: { action: 'verify', challengeId: request.challengeId, signature },
      });
      if (verifyError || !verified?.success) throw new Error(verified?.error || verifyError?.message);
      await refreshProfile();
      toast.success('Đã xác minh và liên kết ví FUN PLAY an toàn.');
    } catch (error: any) {
      if (error?.code !== 4001) toast.error(error?.message || 'Không thể liên kết ví');
    } finally {
      setIsLinking(false);
    }
  };

  if (!isInstalled) {
    return (
      <Card className="mb-6 border-orange-500/30 bg-orange-500/5">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-500/20 rounded-full">
                <Wallet className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <div className="font-medium">MetaMask chưa cài đặt</div>
                <div className="text-sm text-muted-foreground">
                  Cài đặt MetaMask để gửi crypto on-chain
                </div>
              </div>
            </div>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => window.open('https://metamask.io/download/', '_blank')}
            >
              <ExternalLink className="w-4 h-4" />
              Cài đặt
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!isConnected) {
    return (
      <Card className="mb-6 border-primary/30 bg-primary/5">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/20 rounded-full">
                <Wallet className="w-5 h-5 text-primary" />
              </div>
              <div>
                <div className="font-medium">Kết nối MetaMask</div>
                <div className="text-sm text-muted-foreground">
                  Kết nối ví để gửi BNB/USDT/BTC on-chain
                </div>
              </div>
            </div>
            <Button
              onClick={connect}
              disabled={isConnecting}
              className="gap-2 bg-gradient-to-r from-orange-500 to-yellow-500"
            >
              {isConnecting ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Link2 className="w-4 h-4" />
              )}
              {isConnecting ? 'Đang kết nối...' : 'Kết nối'}
            </Button>
          </div>
          {error && (
            <div className="mt-2 text-sm text-red-500">{error}</div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-6 border-green-500/30 bg-green-500/5">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/20 rounded-full">
              <Wallet className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium">MetaMask</span>
                <Badge variant="outline" className="text-green-500 border-green-500/30">
                  BSC
                </Badge>
              </div>
              <a
                href={`https://bscscan.com/address/${address}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1"
              >
                {formatAddress(address!)}
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={refreshBalances}
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={disconnect}
              className="text-red-500 hover:text-red-600"
            >
              <Link2Off className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* On-chain Balances */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
            <div className="flex items-center gap-1 mb-1">
              <span className="text-primary font-bold">C</span>
              <span className="text-xs">CAMLY</span>
            </div>
            <div className="text-lg font-bold text-primary">
              {formatBalance(camlyBalance, 2)}
            </div>
          </div>
          <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
            <div className="flex items-center gap-1 mb-1">
              <span className="text-yellow-500 font-bold">◆</span>
              <span className="text-xs">BNB</span>
            </div>
            <div className="text-lg font-bold text-yellow-500">
              {formatBalance(bnbBalance)}
            </div>
          </div>

          <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
            <div className="flex items-center gap-1 mb-1">
              <span className="text-green-500 font-bold">₮</span>
              <span className="text-xs">USDT</span>
            </div>
            <div className="text-lg font-bold text-green-500">
              {formatBalance(usdtBalance, 2)}
            </div>
          </div>

          <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
            <div className="flex items-center gap-1 mb-1">
              <Bitcoin className="w-4 h-4 text-orange-500" />
              <span className="text-xs">BTCB</span>
            </div>
            <div className="text-lg font-bold text-orange-500">
              {formatBalance(btcbBalance, 6)}
            </div>
          </div>
        </div>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className={`flex items-center gap-2 text-sm ${isVerifiedWallet ? 'text-green-600' : 'text-amber-700'}`}>
            <ShieldCheck className="h-4 w-4" />
            {isVerifiedWallet ? 'Ví này đã được xác minh cho tài khoản FUN FARM' : 'Ví này chưa liên kết với tài khoản FUN FARM'}
          </div>
          {!isVerifiedWallet && (
            <Button type="button" onClick={linkCurrentWallet} disabled={isLinking} className="gap-2">
              {isLinking ? <RefreshCw className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
              {isLinking ? 'Đang xác minh...' : 'Xác minh & đổi sang ví này'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default MetaMaskConnect;
