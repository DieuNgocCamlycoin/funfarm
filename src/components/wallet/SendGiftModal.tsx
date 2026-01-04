import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useMetaMask, TOKEN_ADDRESSES } from '@/hooks/useMetaMask';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Gift, 
  Search, 
  Loader2, 
  Heart,
  Sparkles,
  Bitcoin,
  Send,
  AlertTriangle,
  ExternalLink,
  Wallet
} from 'lucide-react';
import { toast } from 'sonner';
import camlyCoinImg from '@/assets/camly_coin.png';
import GiftCelebrationModal from './GiftCelebrationModal';

interface SendGiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (data: GiftSuccessData) => void;
  preselectedUser?: {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
    profile_type?: string;
  };
}

interface GiftSuccessData {
  amount: number;
  currency: string;
  receiverId: string;
  receiverName: string;
  receiverAvatar: string | null;
  message: string;
}

interface UserResult {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  profile_type: string;
}

const currencies = [
  { id: 'CLC', name: 'Camly Coin', icon: camlyCoinImg, color: 'primary', isOnChain: false },
  { id: 'BNB', name: 'BNB', icon: null, iconComponent: <span className="text-yellow-500 font-bold">◆</span>, color: 'yellow-500', isOnChain: true },
  { id: 'USDT', name: 'USDT', icon: null, iconComponent: <span className="text-green-500 font-bold">₮</span>, color: 'green-500', isOnChain: true },
  { id: 'BTCB', name: 'BTCB', icon: null, iconComponent: <Bitcoin className="w-5 h-5 text-orange-500" />, color: 'orange-500', isOnChain: true },
];

const quickAmounts = [10000, 50000, 100000, 500000, 1000000];
const cryptoQuickAmounts = [0.001, 0.01, 0.1, 0.5, 1];

const SendGiftModal: React.FC<SendGiftModalProps> = ({ 
  isOpen, 
  onClose, 
  onSuccess,
  preselectedUser 
}) => {
  const { user, profile, refreshProfile } = useAuth();
  const metamask = useMetaMask();
  const [step, setStep] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserResult[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserResult | null>(
    preselectedUser ? { ...preselectedUser, profile_type: preselectedUser.profile_type || 'eater' } : null
  );
  const [selectedCurrency, setSelectedCurrency] = useState('CLC');
  const [amount, setAmount] = useState('');
  const [receiverWallet, setReceiverWallet] = useState('');
  const [message, setMessage] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (preselectedUser) {
      setSelectedUser({ ...preselectedUser, profile_type: preselectedUser.profile_type || 'eater' });
      setStep(2);
    }
  }, [preselectedUser]);

  useEffect(() => {
    if (!isOpen) {
      // Reset form when modal closes
      setStep(1);
      setSearchQuery('');
      setSearchResults([]);
      setSelectedUser(preselectedUser ? { ...preselectedUser, profile_type: preselectedUser.profile_type || 'eater' } : null);
      setSelectedCurrency('CLC');
      setAmount('');
      setReceiverWallet('');
      setMessage('');
    }
  }, [isOpen, preselectedUser]);

  // Fetch receiver wallet when user selected and on-chain currency
  useEffect(() => {
    const fetchReceiverWallet = async () => {
      if (selectedUser && selectedCurrency !== 'CLC') {
        const { data } = await supabase
          .from('profiles')
          .select('wallet_address')
          .eq('id', selectedUser.id)
          .single();
        
        if (data?.wallet_address) {
          setReceiverWallet(data.wallet_address);
        }
      }
    };
    fetchReceiverWallet();
  }, [selectedUser, selectedCurrency]);

  const isOnChainCurrency = currencies.find(c => c.id === selectedCurrency)?.isOnChain || false;

  const searchUsers = async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url, profile_type')
        .neq('id', user?.id)
        .ilike('display_name', `%${query}%`)
        .limit(10);

      if (error) throw error;
      setSearchResults(data || []);
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      searchUsers(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSelectUser = (user: UserResult) => {
    setSelectedUser(user);
    setStep(2);
  };

  const handleSendGift = async () => {
    if (!user || !selectedUser || !amount) return;

    const amountNum = selectedCurrency === 'CLC' ? parseInt(amount) : parseFloat(amount);
    
    // Validate for CLC
    if (selectedCurrency === 'CLC') {
      if (amountNum > (profile?.camly_balance || 0)) {
        toast.error('Số dư CAMLY không đủ!');
        return;
      }
      if (amountNum < 1000) {
        toast.error('Số tiền tối thiểu là 1,000 CLC');
        return;
      }
    }

    // Validate for on-chain currencies
    if (isOnChainCurrency) {
      if (!metamask.isConnected) {
        toast.error('Vui lòng kết nối MetaMask trước!');
        return;
      }
      if (!receiverWallet || !receiverWallet.startsWith('0x')) {
        toast.error('Người nhận chưa có địa chỉ ví hợp lệ!');
        return;
      }
      if (amountNum <= 0) {
        toast.error('Số tiền phải lớn hơn 0');
        return;
      }
    }

    setIsSending(true);
    let txHash: string | null = null;

    try {
      // Handle on-chain transaction
      if (isOnChainCurrency) {
        toast.info('Đang xử lý giao dịch on-chain...');
        
        try {
          if (selectedCurrency === 'BNB') {
            txHash = await metamask.sendBNB(receiverWallet, amount);
          } else if (selectedCurrency === 'USDT') {
            txHash = await metamask.sendUSDT(receiverWallet, amount);
          } else if (selectedCurrency === 'BTCB') {
            txHash = await metamask.sendBTCB(receiverWallet, amount);
          }
        } catch (err: any) {
          toast.error(err.message || 'Giao dịch blockchain thất bại');
          setIsSending(false);
          return;
        }

        if (!txHash) {
          toast.error('Không thể hoàn tất giao dịch');
          setIsSending(false);
          return;
        }
      } else {
        // Handle CLC in-app transfer
        // 1. Trừ tiền người gửi
        const { error: deductError } = await supabase
          .from('profiles')
          .update({ 
            camly_balance: (profile?.camly_balance || 0) - amountNum 
          })
          .eq('id', user.id);

        if (deductError) throw deductError;

        // 2. Cộng tiền người nhận
        const { data: receiverProfile, error: fetchError } = await supabase
          .from('profiles')
          .select('camly_balance')
          .eq('id', selectedUser.id)
          .single();

        if (fetchError) throw fetchError;

        const { error: addError } = await supabase
          .from('profiles')
          .update({ 
            camly_balance: (receiverProfile?.camly_balance || 0) + amountNum 
          })
          .eq('id', selectedUser.id);

        if (addError) throw addError;

        // Refresh profile
        refreshProfile();
      }

      // 3. Ghi log giao dịch
      const { error: txError } = await supabase
        .from('wallet_transactions')
        .insert({
          sender_id: user.id,
          receiver_id: selectedUser.id,
          amount: isOnChainCurrency ? Math.floor(parseFloat(amount) * 1e8) : amountNum, // Store in smallest unit for crypto
          currency: selectedCurrency,
          message: message || null,
          tx_hash: txHash,
          status: 'completed',
        });

      if (txError) throw txError;

      // 4. Tạo thông báo cho người nhận
      const amountDisplay = isOnChainCurrency ? amount : amountNum.toLocaleString();
      await supabase.from('notifications').insert({
        user_id: selectedUser.id,
        from_user_id: user.id,
        type: 'gift',
        content: `${profile?.display_name || 'Ai đó'} đã tặng bạn ${amountDisplay} ${selectedCurrency}${message ? `: "${message}"` : ''}`,
      });

      const successMessage = txHash 
        ? `Đã gửi ${amount} ${selectedCurrency} on-chain!`
        : `Đã gửi ${amountNum.toLocaleString()} ${selectedCurrency} đến ${selectedUser.display_name}`;

      toast.success('🎉 Tặng quà thành công!', {
        description: successMessage,
      });

      onSuccess({
        amount: amountNum,
        currency: selectedCurrency,
        receiverId: selectedUser.id,
        receiverName: selectedUser.display_name || 'Người dùng',
        receiverAvatar: selectedUser.avatar_url,
        message: message,
      });
    } catch (error) {
      console.error('Error sending gift:', error);
      toast.error('Có lỗi xảy ra khi gửi quà');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift className="w-5 h-5 text-primary" />
            {step === 1 ? 'Chọn người nhận' : 'Gửi quà tặng'}
          </DialogTitle>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Tìm kiếm người dùng..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="max-h-64 overflow-y-auto space-y-2">
              {isSearching ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : searchResults.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  {searchQuery.length >= 2 
                    ? 'Không tìm thấy người dùng' 
                    : 'Nhập tên để tìm kiếm'}
                </div>
              ) : (
                searchResults.map((result) => (
                  <button
                    key={result.id}
                    onClick={() => handleSelectUser(result)}
                    className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors text-left"
                  >
                    <Avatar>
                      <AvatarImage src={result.avatar_url || ''} />
                      <AvatarFallback>
                        {result.display_name?.charAt(0) || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="font-medium">{result.display_name}</div>
                      <Badge variant="outline" className="text-xs">
                        {result.profile_type}
                      </Badge>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        {step === 2 && selectedUser && (
          <div className="space-y-4">
            {/* Selected User */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <Avatar>
                <AvatarImage src={selectedUser.avatar_url || ''} />
                <AvatarFallback>
                  {selectedUser.display_name?.charAt(0) || '?'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="font-medium">{selectedUser.display_name}</div>
                <div className="text-sm text-muted-foreground">Người nhận</div>
              </div>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => {
                  setSelectedUser(null);
                  setStep(1);
                }}
              >
                Đổi
              </Button>
            </div>

            {/* Currency Selection */}
            <div>
              <Label className="mb-2 block">Loại tiền</Label>
              <div className="grid grid-cols-4 gap-2">
                {currencies.map((currency) => (
                  <button
                    key={currency.id}
                    onClick={() => setSelectedCurrency(currency.id)}
                    className={`p-3 rounded-lg border-2 transition-all flex flex-col items-center gap-1 ${
                      selectedCurrency === currency.id
                        ? 'border-primary bg-primary/10'
                        : 'border-muted hover:border-muted-foreground'
                    }`}
                  >
                    {currency.icon ? (
                      <img src={currency.icon} alt={currency.name} className="w-6 h-6" />
                    ) : (
                      currency.iconComponent
                    )}
                    <span className="text-xs font-medium">{currency.id}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* On-chain Warning */}
            {isOnChainCurrency && (
              <Alert className="border-yellow-500/30 bg-yellow-500/10">
                <AlertTriangle className="w-4 h-4 text-yellow-500" />
                <AlertDescription className="text-sm">
                  Giao dịch on-chain trên BSC. Cần có MetaMask và gas fee (BNB).
                </AlertDescription>
              </Alert>
            )}

            {/* MetaMask Connect for on-chain */}
            {isOnChainCurrency && !metamask.isConnected && (
              <Button
                type="button"
                variant="outline"
                className="w-full gap-2"
                onClick={metamask.connect}
                disabled={metamask.isConnecting}
              >
                <Wallet className="w-4 h-4" />
                {metamask.isConnecting ? 'Đang kết nối...' : 'Kết nối MetaMask'}
              </Button>
            )}

            {/* Receiver wallet for on-chain */}
            {isOnChainCurrency && metamask.isConnected && (
              <div>
                <Label className="mb-2 block">Ví người nhận (BSC)</Label>
                <Input
                  value={receiverWallet}
                  onChange={(e) => setReceiverWallet(e.target.value)}
                  placeholder="0x..."
                  className="font-mono text-sm"
                />
                {receiverWallet && (
                  <a
                    href={`https://bscscan.com/address/${receiverWallet}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline flex items-center gap-1 mt-1"
                  >
                    Xem trên BscScan <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            )}

            {/* Amount */}
            <div>
              <Label className="mb-2 block">Số lượng</Label>
              <Input
                type="number"
                placeholder={isOnChainCurrency ? "0.00" : "Nhập số tiền"}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="text-lg font-semibold"
                step={isOnChainCurrency ? "0.001" : "1000"}
              />
              {selectedCurrency === 'CLC' && (
                <div className="text-sm text-muted-foreground mt-1">
                  Số dư: {(profile?.camly_balance || 0).toLocaleString()} CLC
                </div>
              )}
              {selectedCurrency === 'BNB' && metamask.isConnected && (
                <div className="text-sm text-muted-foreground mt-1">
                  Số dư: {parseFloat(metamask.bnbBalance).toFixed(4)} BNB
                </div>
              )}
              {selectedCurrency === 'USDT' && metamask.isConnected && (
                <div className="text-sm text-muted-foreground mt-1">
                  Số dư: {parseFloat(metamask.usdtBalance).toFixed(2)} USDT
                </div>
              )}
              {selectedCurrency === 'BTCB' && metamask.isConnected && (
                <div className="text-sm text-muted-foreground mt-1">
                  Số dư: {parseFloat(metamask.btcbBalance).toFixed(6)} BTCB
                </div>
              )}
              
              {/* Quick amounts */}
              {selectedCurrency === 'CLC' && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {quickAmounts.map((qa) => (
                    <Button
                      key={qa}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setAmount(qa.toString())}
                      className="text-xs"
                    >
                      {qa >= 1000000 ? `${qa/1000000}M` : `${qa/1000}K`}
                    </Button>
                  ))}
                </div>
              )}
              {isOnChainCurrency && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {cryptoQuickAmounts.map((qa) => (
                    <Button
                      key={qa}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setAmount(qa.toString())}
                      className="text-xs"
                    >
                      {qa}
                    </Button>
                  ))}
                </div>
              )}
            </div>

            {/* Message */}
            <div>
              <Label className="mb-2 block flex items-center gap-2">
                <Heart className="w-4 h-4 text-pink-500" />
                Lời nhắn yêu thương
              </Label>
              <Textarea
                placeholder="Viết lời chúc của bạn..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                maxLength={200}
              />
              <div className="text-xs text-muted-foreground text-right mt-1">
                {message.length}/200
              </div>
            </div>

            {/* Send Button */}
            <Button
              onClick={handleSendGift}
              disabled={!amount || parseInt(amount) <= 0 || isSending}
              className="w-full gap-2 bg-gradient-to-r from-primary to-green-500"
            >
              {isSending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Gửi {amount ? parseInt(amount).toLocaleString() : '0'} {selectedCurrency}
                </>
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default SendGiftModal;
