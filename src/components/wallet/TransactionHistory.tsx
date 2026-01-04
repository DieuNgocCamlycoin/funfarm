import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  History, 
  Coins, 
  ExternalLink, 
  Copy, 
  Check,
  ArrowUpRight,
  ArrowDownLeft,
  Bitcoin,
  Calendar,
  Clock,
  MessageSquare,
  Hash
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { toast } from 'sonner';
import camlyCoinImg from '@/assets/camly_coin.png';

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
  };
  receiver_profile?: {
    display_name: string | null;
    avatar_url: string | null;
  };
}

interface TransactionHistoryProps {
  transactions: Transaction[];
  isLoading: boolean;
  userId: string;
}

const currencyIcons: Record<string, React.ReactNode> = {
  CLC: <img src={camlyCoinImg} alt="CLC" className="w-5 h-5" />,
  BTCB: <Bitcoin className="w-5 h-5 text-orange-500" />,
  USDT: <span className="text-green-500 font-bold text-sm">₮</span>,
  BNB: <span className="text-yellow-500 font-bold text-sm">◆</span>,
};

const currencyNames: Record<string, string> = {
  CLC: 'Camly Coin',
  BTCB: 'Bitcoin (BSC)',
  USDT: 'Tether USD',
  BNB: 'BNB',
};

const statusColors: Record<string, string> = {
  completed: 'bg-green-500/10 text-green-600 border-green-500/20',
  pending: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
  failed: 'bg-red-500/10 text-red-600 border-red-500/20',
};

const statusLabels: Record<string, string> = {
  completed: 'Thành công',
  pending: 'Đang xử lý',
  failed: 'Thất bại',
};

const formatNumber = (num: number, currency: string) => {
  if (currency === 'CLC') {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toLocaleString('vi-VN');
  }
  // For crypto, show more decimal places
  if (num < 0.001) return num.toFixed(8);
  if (num < 1) return num.toFixed(6);
  return num.toFixed(4);
};

const TransactionHistory: React.FC<TransactionHistoryProps> = ({
  transactions,
  isLoading,
  userId,
}) => {
  const [activeTab, setActiveTab] = useState('all');
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [copied, setCopied] = useState(false);

  const filteredTransactions = transactions.filter(t => {
    if (activeTab === 'sent') return t.sender_id === userId;
    if (activeTab === 'received') return t.receiver_id === userId;
    return true;
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Đã sao chép!');
    setTimeout(() => setCopied(false), 2000);
  };

  const getBscScanUrl = (txHash: string) => {
    return `https://bscscan.com/tx/${txHash}`;
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              Lịch sử giao dịch
            </CardTitle>
            <Badge variant="outline" className="text-xs">
              {transactions.length} giao dịch
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-3 mb-4">
              <TabsTrigger value="all" className="gap-1">
                <History className="w-3 h-3" />
                Tất cả
              </TabsTrigger>
              <TabsTrigger value="sent" className="gap-1">
                <ArrowUpRight className="w-3 h-3" />
                Đã gửi
              </TabsTrigger>
              <TabsTrigger value="received" className="gap-1">
                <ArrowDownLeft className="w-3 h-3" />
                Đã nhận
              </TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-0">
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : filteredTransactions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Coins className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Chưa có giao dịch nào</p>
                  <p className="text-sm mt-1">Hãy tặng quà cho bạn bè ngay!</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredTransactions.map((tx) => {
                    const isSender = tx.sender_id === userId;
                    const otherUser = isSender ? tx.receiver_profile : tx.sender_profile;
                    const displayAmount = tx.currency === 'CLC' 
                      ? tx.amount 
                      : tx.amount / 1e8; // Convert back from smallest unit for crypto
                    
                    return (
                      <button
                        key={tx.id}
                        onClick={() => setSelectedTx(tx)}
                        className="w-full flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-left"
                      >
                        <div className="relative">
                          <Avatar className="w-10 h-10">
                            <AvatarImage src={otherUser?.avatar_url || ''} />
                            <AvatarFallback>
                              {otherUser?.display_name?.charAt(0) || '?'}
                            </AvatarFallback>
                          </Avatar>
                          <div className={`absolute -bottom-1 -right-1 p-1 rounded-full ${
                            isSender ? 'bg-red-100' : 'bg-green-100'
                          }`}>
                            {isSender 
                              ? <ArrowUpRight className="w-3 h-3 text-red-500" />
                              : <ArrowDownLeft className="w-3 h-3 text-green-500" />
                            }
                          </div>
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium truncate">
                              {isSender ? 'Gửi đến' : 'Nhận từ'} {otherUser?.display_name || 'Người dùng'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${statusColors[tx.status]}`}
                            >
                              {statusLabels[tx.status] || tx.status}
                            </Badge>
                            {tx.tx_hash && (
                              <Badge variant="outline" className="text-xs gap-1">
                                <ExternalLink className="w-3 h-3" />
                                On-chain
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {formatDistanceToNow(new Date(tx.created_at), { 
                              addSuffix: true, 
                              locale: vi 
                            })}
                          </div>
                        </div>
                        
                        <div className="flex flex-col items-end gap-1">
                          <div className="flex items-center gap-1.5">
                            {currencyIcons[tx.currency]}
                            <span className={`font-bold ${isSender ? 'text-red-500' : 'text-green-500'}`}>
                              {isSender ? '-' : '+'}{formatNumber(displayAmount, tx.currency)}
                            </span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {tx.currency}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Transaction Detail Modal */}
      <Dialog open={!!selectedTx} onOpenChange={() => setSelectedTx(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="w-5 h-5 text-primary" />
              Chi tiết giao dịch
            </DialogTitle>
          </DialogHeader>

          {selectedTx && (() => {
            const isSender = selectedTx.sender_id === userId;
            const displayAmount = selectedTx.currency === 'CLC' 
              ? selectedTx.amount 
              : selectedTx.amount / 1e8;

            return (
              <div className="space-y-4">
                {/* Amount */}
                <div className="text-center py-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    {currencyIcons[selectedTx.currency]}
                    <span className={`text-3xl font-bold ${isSender ? 'text-red-500' : 'text-green-500'}`}>
                      {isSender ? '-' : '+'}{formatNumber(displayAmount, selectedTx.currency)}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {currencyNames[selectedTx.currency] || selectedTx.currency}
                  </p>
                </div>

                {/* Status */}
                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <span className="text-sm text-muted-foreground">Trạng thái</span>
                  <Badge className={statusColors[selectedTx.status]}>
                    {statusLabels[selectedTx.status] || selectedTx.status}
                  </Badge>
                </div>

                {/* Sender/Receiver */}
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={selectedTx.sender_profile?.avatar_url || ''} />
                      <AvatarFallback>
                        {selectedTx.sender_profile?.display_name?.charAt(0) || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="text-xs text-muted-foreground">Người gửi</div>
                      <div className="font-medium">
                        {selectedTx.sender_profile?.display_name || 'Người dùng'}
                        {selectedTx.sender_id === userId && (
                          <Badge variant="outline" className="ml-2 text-xs">Bạn</Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-center">
                    <ArrowDownLeft className="w-5 h-5 text-muted-foreground" />
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={selectedTx.receiver_profile?.avatar_url || ''} />
                      <AvatarFallback>
                        {selectedTx.receiver_profile?.display_name?.charAt(0) || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="text-xs text-muted-foreground">Người nhận</div>
                      <div className="font-medium">
                        {selectedTx.receiver_profile?.display_name || 'Người dùng'}
                        {selectedTx.receiver_id === userId && (
                          <Badge variant="outline" className="ml-2 text-xs">Bạn</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Message */}
                {selectedTx.message && (
                  <div className="p-3 bg-muted/30 rounded-lg">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                      <MessageSquare className="w-3 h-3" />
                      Lời nhắn
                    </div>
                    <p className="text-sm">"{selectedTx.message}"</p>
                  </div>
                )}

                {/* Time */}
                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    Thời gian
                  </div>
                  <div className="text-sm font-medium">
                    {format(new Date(selectedTx.created_at), 'dd/MM/yyyy HH:mm:ss', { locale: vi })}
                  </div>
                </div>

                {/* Transaction Hash */}
                {selectedTx.tx_hash && (
                  <div className="p-3 bg-muted/30 rounded-lg">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                      <Hash className="w-3 h-3" />
                      Transaction Hash (BSC)
                    </div>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-xs bg-background p-2 rounded truncate font-mono">
                        {selectedTx.tx_hash}
                      </code>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => copyToClipboard(selectedTx.tx_hash!)}
                      >
                        {copied ? (
                          <Check className="w-4 h-4 text-green-500" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                    <a
                      href={getBscScanUrl(selectedTx.tx_hash)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 mt-2 text-xs text-primary hover:underline"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Xem trên BscScan
                    </a>
                  </div>
                )}

                {/* Transaction ID */}
                <div className="p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                    ID giao dịch
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-xs bg-background p-2 rounded truncate font-mono">
                      {selectedTx.id}
                    </code>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => copyToClipboard(selectedTx.id)}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default TransactionHistory;
