// 🌱 Divine Mantra: "Farmers rich, Eaters happy. Free-Fee & Earn with Love."
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import Navbar from '@/components/Navbar';
import TopRanking from '@/components/TopRanking';
import MobileBottomNav from '@/components/MobileBottomNav';
import Footer from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Wallet, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Gift,
  Bitcoin
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import SendGiftModal from '@/components/wallet/SendGiftModal';
import GiftCelebrationModal from '@/components/wallet/GiftCelebrationModal';
import CreateGiftPostModal from '@/components/wallet/CreateGiftPostModal';
import WalletPriceChart from '@/components/wallet/WalletPriceChart';
import MetaMaskConnect from '@/components/wallet/MetaMaskConnect';
import TransactionHistory from '@/components/wallet/TransactionHistory';
import TopSponsor from '@/components/wallet/TopSponsor';
import camlyCoinImg from '@/assets/camly_coin.png';

interface GiftSuccessData {
  amount: number;
  currency: string;
  receiverId: string;
  receiverName: string;
  receiverAvatar: string | null;
  receiverWallet?: string;
  message: string;
}

interface Transaction {
  id: string;
  sender_id: string;
  receiver_id: string;
  amount: number;
  currency: string;
  message: string | null;
  tx_hash: string | null;
  status: string;
  created_at: string;
  sender_profile?: {
    display_name: string | null;
    avatar_url: string | null;
    wallet_address?: string | null;
  };
  receiver_profile?: {
    display_name: string | null;
    avatar_url: string | null;
    wallet_address?: string | null;
  };
}

const formatNumber = (num: number) => {
  // Always show full number
  return num.toLocaleString('vi-VN');
};

const Wallet_Page = () => {
  const { user, profile, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showSendModal, setShowSendModal] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [celebrationData, setCelebrationData] = useState<GiftSuccessData | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchTransactions();
    }
  }, [user]);

  const fetchTransactions = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('wallet_transactions')
        .select('*')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      // Fetch profiles for senders and receivers
      if (data && data.length > 0) {
        const userIds = [...new Set(data.flatMap(t => [t.sender_id, t.receiver_id]))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, display_name, avatar_url, wallet_address')
          .in('id', userIds);

        const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

        const enrichedTransactions = data.map(t => ({
          ...t,
          sender_profile: profileMap.get(t.sender_id),
          receiver_profile: profileMap.get(t.receiver_id),
        }));

        setTransactions(enrichedTransactions);
      } else {
        setTransactions([]);
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const totalSent = transactions
    .filter(t => t.sender_id === user?.id && t.currency === 'CLC')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalReceived = transactions
    .filter(t => t.receiver_id === user?.id && t.currency === 'CLC')
    .reduce((sum, t) => sum + t.amount, 0);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <Navbar />
      
      <main className="container max-w-4xl mx-auto px-4 py-6 pt-20">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 rounded-full">
              <Wallet className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Fun Farm Wallet</h1>
              <p className="text-sm text-muted-foreground">Quản lý & tặng tiền yêu thương</p>
            </div>
          </div>
          <Button 
            onClick={() => setShowSendModal(true)}
            className="gap-2 bg-gradient-to-r from-primary to-green-500 hover:from-primary/90 hover:to-green-500/90"
          >
            <Gift className="w-4 h-4" />
            Tặng quà
          </Button>
        </div>

        {/* MetaMask Connect */}
        <MetaMaskConnect />

        {/* Balance Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {/* CLC Balance */}
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <img src={camlyCoinImg} alt="CLC" className="w-6 h-6" />
                <span className="text-sm font-medium">CAMLY</span>
              </div>
              <div className="text-2xl font-bold text-primary">
                {formatNumber(profile?.camly_balance || 0)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">CLC</div>
            </CardContent>
          </Card>

          {/* BTC Balance */}
          <Card className="bg-gradient-to-br from-orange-500/10 to-orange-500/5 border-orange-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Bitcoin className="w-6 h-6 text-orange-500" />
                <span className="text-sm font-medium">Bitcoin</span>
              </div>
              <div className="text-2xl font-bold text-orange-500">0</div>
              <div className="text-xs text-muted-foreground mt-1">BTC</div>
            </CardContent>
          </Card>

          {/* USDT Balance */}
          <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-green-500 font-bold text-xl">₮</span>
                <span className="text-sm font-medium">USDT</span>
              </div>
              <div className="text-2xl font-bold text-green-500">0</div>
              <div className="text-xs text-muted-foreground mt-1">USDT</div>
            </CardContent>
          </Card>

          {/* BNB Balance */}
          <Card className="bg-gradient-to-br from-yellow-500/10 to-yellow-500/5 border-yellow-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-yellow-500 font-bold text-xl">◆</span>
                <span className="text-sm font-medium">BNB</span>
              </div>
              <div className="text-2xl font-bold text-yellow-500">0</div>
              <div className="text-xs text-muted-foreground mt-1">BNB</div>
            </CardContent>
          </Card>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-red-500/10 rounded-full">
                <ArrowUpRight className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Đã tặng</div>
                <div className="text-lg font-bold text-red-500">-{formatNumber(totalSent)} CLC</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-full">
                <ArrowDownLeft className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Đã nhận</div>
                <div className="text-lg font-bold text-green-500">+{formatNumber(totalReceived)} CLC</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Top Ranking */}
        <TopRanking />

        {/* Top Sponsor */}
        <TopSponsor />

        {/* Price Chart */}
        <WalletPriceChart />

        {/* Transactions */}
        <TransactionHistory
          transactions={transactions}
          isLoading={isLoading}
          userId={user?.id || ''}
        />
      </main>

      <Footer />

      {/* Send Gift Modal */}
      <SendGiftModal
        isOpen={showSendModal}
        onClose={() => setShowSendModal(false)}
        onSuccess={(data) => {
          fetchTransactions();
          setShowSendModal(false);
          setCelebrationData(data);
          setShowCelebration(true);
        }}
      />

      {/* Celebration Modal */}
      {celebrationData && (
        <GiftCelebrationModal
          isOpen={showCelebration}
          onClose={() => {
            setShowCelebration(false);
            setCelebrationData(null);
          }}
          amount={celebrationData.amount}
          currency={celebrationData.currency}
          senderName={profile?.display_name || 'Bạn'}
          senderAvatar={profile?.avatar_url || null}
          receiverName={celebrationData.receiverName}
          receiverAvatar={celebrationData.receiverAvatar}
          message={celebrationData.message}
          onCreatePost={() => {
            setShowCelebration(false);
            setShowCreatePost(true);
          }}
        />
      )}

      {/* Create Gift Post Modal */}
      {celebrationData && (
        <CreateGiftPostModal
          isOpen={showCreatePost}
          onClose={() => {
            setShowCreatePost(false);
            setCelebrationData(null);
          }}
          giftData={{
            amount: celebrationData.amount,
            currency: celebrationData.currency,
            receiverId: celebrationData.receiverId,
            receiverName: celebrationData.receiverName,
            receiverAvatar: celebrationData.receiverAvatar,
            receiverWallet: celebrationData.receiverWallet,
            message: celebrationData.message,
          }}
        />
      )}

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />

      {/* Bottom padding for mobile nav */}
      <div className="h-16 md:hidden" />
    </div>
  );
};

export default Wallet_Page;
