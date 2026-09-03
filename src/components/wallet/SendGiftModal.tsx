import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useMetaMask } from '@/hooks/useMetaMask';
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
  Wallet,
  ArrowLeft,
  ShieldCheck,
  CheckCircle2
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
  treasuryWallet?: string;
  treasuryLogo?: string;
}

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

interface UserResult {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  profile_type: string;
}

const currencies = [
  { id: 'CAMLY', name: 'Camly Coin', icon: camlyCoinImg, color: 'primary', isOnChain: true },
  { id: 'BNB', name: 'BNB', icon: null, iconComponent: <span className="text-yellow-500 font-bold">◆</span>, color: 'yellow-500', isOnChain: true },
  { id: 'USDT', name: 'USDT', icon: null, iconComponent: <span className="text-green-500 font-bold">₮</span>, color: 'green-500', isOnChain: true },
  { id: 'BTCB', name: 'BTCB', icon: null, iconComponent: <Bitcoin className="w-5 h-5 text-orange-500" />, color: 'orange-500', isOnChain: true },
];

const quickAmounts = [1, 10, 100, 1000, 10000];
const cryptoQuickAmounts = [0.001, 0.01, 0.1, 0.5, 1];
const messageTemplates = [
  { label: 'Biết ơn', icon: '🙌', text: 'Biết ơn bạn vì những điều tốt đẹp bạn đã trao tặng cho cuộc sống. Gửi đến bạn món quà ngập tràn năng lượng yêu thương thay lời cảm ơn. Chúc bạn luôn hạnh phúc, giàu sang, sung sướng đủ đầy. 💚' },
  { label: 'Yêu thương', icon: '💗', text: 'Gửi bạn thật nhiều năng lượng ánh sáng yêu thương thuần khiết. Chúc mỗi ngày của bạn đều ngập tràn hạnh phúc, thịnh vượng, giàu sang, sung sướng, đủ đầy. ✨' },
  { label: 'Chúc mừng', icon: '🎉', text: 'Chúc mừng bạn nha! Chúc cho niềm vui hôm nay sẽ mở ra thêm nhiều điều tuyệt vời phía trước. Chúc bạn ngày càng thành công, hạnh phúc, thịnh vượng, giàu sang, sung sướng, đủ đầy. 🌟' },
];

const SendGiftModal: React.FC<SendGiftModalProps> = ({ 
  isOpen, 
  onClose, 
  onSuccess,
  preselectedUser,
  treasuryWallet,
  treasuryLogo,
}) => {
  const isTreasuryMode = !!treasuryWallet;
  const { user, profile } = useAuth();
  const metamask = useMetaMask();
  const [step, setStep] = useState(2);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserResult[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserResult | null>(
    preselectedUser ? { ...preselectedUser, profile_type: preselectedUser.profile_type || 'eater' } : null
  );
  const [selectedCurrency, setSelectedCurrency] = useState('CAMLY');
  const [amount, setAmount] = useState('');
  const [receiverWallet, setReceiverWallet] = useState('');
  const [message, setMessage] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [transactionStatus, setTransactionStatus] = useState<'idle' | 'wallet' | 'verifying'>('idle');
  const [pendingTxHash, setPendingTxHash] = useState<string | null>(null);

  useEffect(() => {
    if (preselectedUser) {
      setSelectedUser({ ...preselectedUser, profile_type: preselectedUser.profile_type || 'eater' });
      setStep(2);
    }
  }, [preselectedUser]);

  useEffect(() => {
    if (!isOpen) {
      // Reset form when modal closes
      setStep(2);
      setSearchQuery('');
      setSearchResults([]);
      setSelectedUser(preselectedUser ? { ...preselectedUser, profile_type: preselectedUser.profile_type || 'eater' } : null);
      setSelectedCurrency('CAMLY');
      setAmount('');
      setReceiverWallet('');
      setMessage('');
      setTransactionStatus('idle');
      setPendingTxHash(null);
    }
  }, [isOpen, preselectedUser]);

  // Fetch receiver wallet when user selected and on-chain currency
  useEffect(() => {
    const fetchReceiverWallet = async () => {
      // If treasury mode, always use treasury wallet
      if (isTreasuryMode && treasuryWallet) {
        setReceiverWallet(treasuryWallet);
        return;
      }
      
      if (selectedUser) {
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
  }, [selectedUser, selectedCurrency, isTreasuryMode, treasuryWallet]);

  const isOnChainCurrency = true;
  const walletMatchesProfile = Boolean(
    metamask.address
    && profile?.wallet_address
    && metamask.address.toLowerCase() === profile.wallet_address.toLowerCase()
  );

  const currencyBalance = useMemo(() => {
    if (selectedCurrency === 'CAMLY') return Number(metamask.camlyBalance);
    if (selectedCurrency === 'BNB') return Number(metamask.bnbBalance);
    if (selectedCurrency === 'USDT') return Number(metamask.usdtBalance);
    return Number(metamask.btcbBalance);
  }, [selectedCurrency, metamask.camlyBalance, metamask.bnbBalance, metamask.usdtBalance, metamask.btcbBalance]);

  const amountNumber = Number(amount);
  const amountIsValid = amount.trim() !== '' && Number.isFinite(amountNumber) && amountNumber > 0;
  const hasEnoughBalance = !metamask.isConnected || !amountIsValid || amountNumber <= currencyBalance;
  const isSameWallet = Boolean(
    metamask.address && receiverWallet && metamask.address.toLowerCase() === receiverWallet.toLowerCase()
  );

  const explainGiftError = (error: unknown) => {
    const message = error instanceof Error ? error.message : String(error || '');
    if (/user rejected|user denied|ACTION_REJECTED|code 4001/i.test(message)) {
      return 'Bạn đã hủy xác nhận trong MetaMask. Chưa có khoản tiền nào được gửi.';
    }
    if (/insufficient funds|exceeds balance/i.test(message)) {
      return 'Số dư không đủ để tặng quà và thanh toán phí gas.';
    }
    if (/network|chain/i.test(message)) {
      return 'Vui lòng chuyển MetaMask sang BNB Smart Chain rồi thử lại.';
    }
    if (/already recorded/i.test(message)) {
      return 'Giao dịch này đã được FUN FARM ghi nhận trước đó.';
    }
    return message || 'Có lỗi xảy ra khi gửi quà. Vui lòng thử lại.';
  };

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
    setSearchQuery('');
    setSearchResults([]);
    setStep(2);
  };

  const handleSendGift = async () => {
    if (!user || !selectedUser || !amountIsValid || isSending) return;

    if (isTreasuryMode) {
      toast.error('Ví Treasury cần được liên kết với một tài khoản FUN FARM đã xác minh trước khi nhận quà.');
      return;
    }

    const amountNum = parseFloat(amount);

    // Validate for on-chain currencies
    if (isOnChainCurrency) {
      if (!metamask.isConnected) {
        toast.error('Vui lòng kết nối MetaMask trước!');
        return;
      }
      if (!profile?.wallet_address || metamask.address?.toLowerCase() !== profile.wallet_address.toLowerCase()) {
        toast.error('Ví MetaMask đang kết nối không trùng với ví đã liên kết với tài khoản FUN FARM.');
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
      if (!hasEnoughBalance) {
        toast.error(`Số dư ${selectedCurrency} không đủ để thực hiện giao dịch.`);
        return;
      }
      if (isSameWallet) {
        toast.error('Không thể tặng quà vào chính ví đang gửi.');
        return;
      }
    }

    setIsSending(true);
    setTransactionStatus('wallet');
    let txHash: string | null = null;

    try {
      // Handle on-chain transaction
      if (isOnChainCurrency) {
        toast.info('Đang xử lý giao dịch on-chain...');
        
        try {
          if (selectedCurrency === 'CAMLY') {
            txHash = await metamask.sendCAMLY(receiverWallet, amount);
          } else if (selectedCurrency === 'BNB') {
            txHash = await metamask.sendBNB(receiverWallet, amount);
          } else if (selectedCurrency === 'USDT') {
            txHash = await metamask.sendUSDT(receiverWallet, amount);
          } else if (selectedCurrency === 'BTCB') {
            txHash = await metamask.sendBTCB(receiverWallet, amount);
          }
        } catch (err: any) {
          toast.error(explainGiftError(err));
          setIsSending(false);
          setTransactionStatus('idle');
          return;
        }

        if (!txHash) {
          toast.error('Không thể hoàn tất giao dịch');
          setIsSending(false);
          return;
        }
      }

      setPendingTxHash(txHash);

      // Backend independently verifies the mined BSC receipt before recording it.
      setTransactionStatus('verifying');
      const { data: verification, error: verificationError } = await supabase.functions.invoke(
        'verify-onchain-gift',
        { body: { txHash, receiverId: selectedUser.id, currency: selectedCurrency, amount, message } },
      );
      if (verificationError || !verification?.success) {
        throw new Error(verification?.error || verificationError?.message || 'Không thể xác minh giao dịch trên BSC');
      }

      const successMessage = `Đã gửi và xác minh ${amount} ${selectedCurrency} trên BSC!`;

      toast.success('🎉 Tặng quà thành công!', {
        description: successMessage,
      });

      onSuccess({
        amount: amountNum,
        currency: selectedCurrency,
        receiverId: selectedUser.id,
        receiverName: selectedUser.display_name || 'Người dùng',
        receiverAvatar: selectedUser.avatar_url,
        receiverWallet: receiverWallet || undefined,
        message: message,
        transactionId: verification.transaction.id,
        txHash,
      });
    } catch (error) {
      console.error('Error sending gift:', error);
      toast.error(explainGiftError(error));
    } finally {
      setIsSending(false);
      setTransactionStatus('idle');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open && !isSending) onClose();
    }}>
      <DialogContent
        className="flex h-[100dvh] max-h-[100dvh] flex-col overflow-hidden p-0 sm:h-auto sm:max-h-[82dvh] sm:max-w-lg"
        onEscapeKeyDown={(event) => { if (isSending) event.preventDefault(); }}
        onPointerDownOutside={(event) => { if (isSending) event.preventDefault(); }}
      >
        <DialogHeader className="shrink-0 border-b bg-background px-6 py-4 pr-14">
          <DialogTitle className="flex items-center gap-2">
            <Gift className="w-5 h-5 text-primary" />
            {step === 2 ? 'Trao gửi yêu thương' : 'Xem lại giao dịch'}
          </DialogTitle>
          {(
            <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
              <span className={`flex h-6 w-6 items-center justify-center rounded-full ${step === 2 ? 'bg-primary text-primary-foreground' : 'bg-primary/15 text-primary'}`}>1</span>
              <span>Thông tin</span>
              <span className="h-px flex-1 bg-border" />
              <span className={`flex h-6 w-6 items-center justify-center rounded-full ${step === 3 ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>2</span>
              <span>Xác nhận</span>
            </div>
          )}
        </DialogHeader>

        {step === 2 && (
          <div className="min-h-0 space-y-4 overflow-y-auto px-6 pb-6">
            {!selectedUser && (
              <section className="rounded-2xl border border-amber-300/60 bg-gradient-to-br from-amber-50 via-background to-emerald-50 p-4 shadow-sm dark:from-amber-950/20 dark:to-emerald-950/20">
                <Label className="mb-2 block font-semibold">Người nhận</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    autoFocus
                    placeholder="Tìm theo tên người dùng..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-11 border-amber-300 bg-background/90 pl-10 focus-visible:ring-emerald-500"
                  />
                </div>
                <div className="mt-2 max-h-56 space-y-1 overflow-y-auto">
                  {isSearching ? (
                    <div className="flex justify-center py-5"><Loader2 className="h-5 w-5 animate-spin text-emerald-600" /></div>
                  ) : searchResults.length > 0 ? (
                    searchResults.map((result) => (
                      <button key={result.id} onClick={() => handleSelectUser(result)} className="flex w-full items-center gap-3 rounded-xl border border-transparent p-3 text-left transition-colors hover:border-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/20">
                        <Avatar><AvatarImage src={result.avatar_url || ''} /><AvatarFallback>{result.display_name?.charAt(0) || '?'}</AvatarFallback></Avatar>
                        <div className="min-w-0 flex-1"><div className="truncate font-medium">{result.display_name}</div><Badge variant="outline" className="mt-1 text-[10px]">{result.profile_type}</Badge></div>
                        <span className="text-xs font-medium text-emerald-700">Chọn</span>
                      </button>
                    ))
                  ) : (
                    <p className="py-5 text-center text-sm text-muted-foreground">{searchQuery.length >= 2 ? 'Không tìm thấy người dùng phù hợp' : 'Nhập ít nhất 2 ký tự để tìm người nhận'}</p>
                  )}
                </div>
              </section>
            )}

            {selectedUser && <>
            {/* Selected User */}
            <div 
              className="flex items-center gap-3 p-3 rounded-lg"
              style={isTreasuryMode ? {
                background: 'linear-gradient(135deg, rgba(255,215,0,0.2) 0%, rgba(251,191,36,0.1) 100%)',
                border: '2px solid #ffd700',
              } : { background: 'hsl(var(--muted) / 0.5)' }}
            >
              <Avatar className="w-12 h-12">
                {isTreasuryMode && treasuryLogo ? (
                  <AvatarImage src={treasuryLogo} />
                ) : (
                  <AvatarImage src={selectedUser.avatar_url || ''} />
                )}
                <AvatarFallback>
                  {selectedUser.display_name?.charAt(0) || '?'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{selectedUser.display_name}</span>
                  {isTreasuryMode && (
                    <Badge className="bg-gradient-to-r from-yellow-400 to-amber-500 text-amber-900 text-xs">
                      OFFICIAL TREASURY
                    </Badge>
                  )}
                </div>
                <div className="text-sm text-muted-foreground">
                  {isTreasuryMode ? 'Tài trợ cho FUN FARM' : 'Người nhận'}
                </div>
              </div>
              {!isTreasuryMode && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => {
                    setSelectedUser(null);
                    setReceiverWallet('');
                  }}
                >
                  Đổi
                </Button>
              )}
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

            {isOnChainCurrency && metamask.isConnected && !walletMatchesProfile && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Ví MetaMask đang kết nối không trùng với ví đã liên kết trong tài khoản FUN FARM. Hệ thống sẽ không cho gửi giao dịch.
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
                  placeholder="0x..."
                  className="font-mono text-sm"
                  disabled
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
                min="0"
                inputMode="decimal"
              />
              {selectedCurrency === 'CAMLY' && metamask.isConnected && (
                <div className="text-sm text-muted-foreground mt-1">
                  Số dư on-chain: {parseFloat(metamask.camlyBalance).toLocaleString('vi-VN', { maximumFractionDigits: 4 })} CAMLY
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
              {amountIsValid && !hasEnoughBalance && (
                <p className="mt-1 text-sm font-medium text-destructive">
                  Số lượng vượt quá số dư {selectedCurrency} hiện có.
                </p>
              )}
              {isSameWallet && (
                <p className="mt-1 text-sm font-medium text-destructive">
                  Ví người nhận trùng với ví đang gửi.
                </p>
              )}
              
              {/* Quick amounts */}
              {selectedCurrency === 'CAMLY' ? (
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
                      {qa.toLocaleString('vi-VN')}
                    </Button>
                  ))}
                </div>
              ) : (
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
              <div className="mb-2 grid grid-cols-3 gap-2">
                {messageTemplates.map((template) => (
                  <button
                    key={template.label}
                    type="button"
                    onClick={() => setMessage(template.text)}
                    className={`rounded-xl border px-3 py-2 text-left text-xs transition-colors hover:border-primary hover:bg-primary/5 ${message === template.text ? 'border-primary bg-primary/10 text-primary' : 'border-border'}`}
                  >
                    <span className="mr-1">{template.icon}</span>{template.label}
                  </button>
                ))}
              </div>
              <Textarea
                placeholder="Viết lời chúc của bạn..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                maxLength={500}
              />
              <div className="text-xs text-muted-foreground text-right mt-1">
                {message.length}/500
              </div>
            </div>

            {/* Review Button */}
            <Button
              onClick={() => setStep(3)}
              disabled={!amountIsValid || !hasEnoughBalance || isSameWallet || !walletMatchesProfile || !receiverWallet}
              className="ff-action-metal w-full gap-2"
            >
              Xem lại &amp; xác nhận
              <CheckCircle2 className="w-4 h-4" />
            </Button>
            </>}
          </div>
        )}

        {step === 3 && selectedUser && (
          <div className="min-h-0 space-y-4 overflow-y-auto px-6 pb-6">
            <div className="rounded-2xl border bg-gradient-to-br from-amber-50/80 via-background to-emerald-50/70 p-4 dark:from-amber-950/20 dark:to-emerald-950/20">
              <div className="flex items-center gap-3">
                <Avatar className="h-11 w-11 border-2 border-primary/30">
                  <AvatarImage src={profile?.avatar_url || ''} />
                  <AvatarFallback>{profile?.display_name?.charAt(0) || '?'}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{profile?.display_name || 'Tài khoản FUN FARM'}</p>
                  <p className="truncate font-mono text-xs text-muted-foreground">{metamask.address}</p>
                </div>
                <span className="text-xs text-muted-foreground">Người gửi</span>
              </div>

              <div className="my-4 flex items-center gap-3">
                <span className="h-px flex-1 bg-border" />
                <div className="rounded-full border border-primary/30 bg-background px-5 py-2 text-center shadow-sm">
                  <p className="text-lg font-bold text-primary">{Number(amount).toLocaleString('vi-VN')} {selectedCurrency}</p>
                  <p className="text-[11px] text-muted-foreground">trên BNB Smart Chain</p>
                </div>
                <span className="h-px flex-1 bg-border" />
              </div>

              <div className="flex items-center gap-3">
                <Avatar className="h-11 w-11 border-2 border-emerald-500/30">
                  <AvatarImage src={selectedUser.avatar_url || ''} />
                  <AvatarFallback>{selectedUser.display_name?.charAt(0) || '?'}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{selectedUser.display_name || 'Người nhận'}</p>
                  <p className="truncate font-mono text-xs text-muted-foreground">{receiverWallet}</p>
                </div>
                <span className="text-xs text-muted-foreground">Người nhận</span>
              </div>
            </div>

            {message && (
              <div className="rounded-xl border bg-muted/30 p-3">
                <p className="mb-1 text-xs text-muted-foreground">Lời nhắn</p>
                <p className="italic">“{message}”</p>
              </div>
            )}

            <Alert className="border-amber-400/50 bg-amber-50/80 dark:bg-amber-950/20">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-sm">
                Giao dịch blockchain không thể hoàn tác. Hãy kiểm tra kỹ người nhận, số lượng và phí gas trong MetaMask.
              </AlertDescription>
            </Alert>

            {isSending && (
              <div className="rounded-xl border border-emerald-400/40 bg-emerald-50/70 p-4 dark:bg-emerald-950/20">
                <div className="flex items-center gap-3 font-medium text-emerald-700 dark:text-emerald-300">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  {transactionStatus === 'wallet' ? 'Vui lòng xác nhận trong MetaMask…' : 'Đang xác minh giao dịch trên blockchain…'}
                </div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-emerald-100 dark:bg-emerald-900">
                  <div className={`h-full rounded-full bg-emerald-500 transition-all ${transactionStatus === 'verifying' ? 'w-3/4' : 'w-1/3'}`} />
                </div>
                {pendingTxHash && (
                  <a
                    href={`https://bscscan.com/tx/${pendingTxHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-emerald-700 underline-offset-2 hover:underline dark:text-emerald-300"
                  >
                    Theo dõi giao dịch trên BscScan <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" onClick={() => setStep(2)} disabled={isSending} className="gap-2">
                <ArrowLeft className="h-4 w-4" /> Quay lại
              </Button>
              <Button
                onClick={handleSendGift}
                disabled={isSending || !walletMatchesProfile || !amountIsValid || !hasEnoughBalance || isSameWallet}
                className="ff-action-metal gap-2"
              >
                {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                {isSending ? 'Đang xử lý…' : 'Xác nhận & Tặng'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default SendGiftModal;
