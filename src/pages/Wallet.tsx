// 🌱 Divine Mantra: "Farmers rich, Eaters happy. Free-Fee & Earn with Love."
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import Navbar from '@/components/Navbar';

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
  Heart
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
import funFarmLogo from '@/assets/branding/fun-farm-logo-2-transparent.png';

// FUN FARM TREASURY wallet info
const TREASURY_USER = {
  id: 'fun-farm-treasury',
  display_name: 'FUN FARM TREASURY',
  avatar_url: null, // Will use logo
  profile_type: 'treasury',
};
const TREASURY_WALLET = '0xda5fc8234e76d22cc2d90e93e8e3550712524a08';

interface GiftSuccessData {
  amount: number;
  currency: string;
  receiverId: string;
  receiverName: string;
  receiverAvatar: string | null;
  receiverWallet?: string;
  message: string;
  transactionId: string;
  txHash: string;
}

interface Transaction {
  id: string;
  sender_id: string;
  receiver_id: string;
  amount: number;
  amount_decimal?: number | null;
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
  const [showTreasuryModal, setShowTreasuryModal] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [celebrationData, setCelebrationData] = useState<GiftSuccessData | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
      return;
    }
    // Guard: Redirect if email not verified
    if (!authLoading && user && profile && !profile.email_verified) {
      navigate('/auth');
    }
  }, [user, profile, authLoading, navigate]);

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
        .eq('status', 'verified')
        .not('tx_hash', 'is', null)
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
    .filter(t => t.sender_id === user?.id && t.currency === 'CAMLY')
    .reduce((sum, t) => sum + Number(t.amount_decimal || 0), 0);

  const totalReceived = transactions
    .filter(t => t.receiver_id === user?.id && t.currency === 'CAMLY')
    .reduce((sum, t) => sum + Number(t.amount_decimal || 0), 0);

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
          <div className="flex items-center gap-2">
            <Button 
              onClick={() => setShowSendModal(true)}
              className="gap-2 bg-gradient-to-r from-primary to-green-500 hover:from-primary/90 hover:to-green-500/90"
            >
              <Gift className="w-4 h-4" />
              Tặng quà
            </Button>
            
            {/* FUN FARM Treasury Button - Golden prominent styling */}
            <Button 
              onClick={() => setShowTreasuryModal(true)}
              className="gap-2 font-bold"
              style={{
                background: 'linear-gradient(135deg, #ffd700 0%, #f59e0b 50%, #fbbf24 100%)',
                border: '2px solid #ffd700',
                color: '#7c2d12',
                boxShadow: '0 4px 15px rgba(255, 215, 0, 0.4)',
              }}
            >
              <Heart className="w-4 h-4" />
              FUN FARM Treasury
            </Button>
          </div>
        </div>

        {/* MetaMask Connect */}
        <MetaMaskConnect />

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-red-500/10 rounded-full">
                <ArrowUpRight className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Đã tặng</div>
                <div className="text-lg font-bold text-red-500">-{formatNumber(totalSent)} CAMLY</div>
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
                <div className="text-lg font-bold text-green-500">+{formatNumber(totalReceived)} CAMLY</div>
              </div>
            </CardContent>
          </Card>
        </div>

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

      {/* Treasury Sponsor Modal */}
      <SendGiftModal
        isOpen={showTreasuryModal}
        onClose={() => setShowTreasuryModal(false)}
        onSuccess={(data) => {
          fetchTransactions();
          setShowTreasuryModal(false);
          setCelebrationData(data);
          setShowCelebration(true);
        }}
        preselectedUser={TREASURY_USER}
        treasuryWallet={TREASURY_WALLET}
        treasuryLogo={funFarmLogo}
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
          txHash={celebrationData.txHash}
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
            transactionId: celebrationData.transactionId,
            txHash: celebrationData.txHash,
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
