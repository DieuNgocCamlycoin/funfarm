import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { 
  Gift, 
  Loader2, 
  CheckCircle, 
  XCircle, 
  RefreshCw,
  Link2,
  ArrowRight,
  Play,
  AlertTriangle
} from 'lucide-react';

interface OrphanGiftPost {
  id: string;
  author_id: string;
  content: string | null;
  created_at: string;
  gift_receiver_id: string | null;
  author_name?: string;
  matched_receiver_id?: string;
  matched_receiver_name?: string;
  match_method?: 'transaction' | 'content_parse';
}

interface MatchResult {
  postId: string;
  receiverId: string;
  receiverName: string;
  method: 'transaction' | 'content_parse';
}

const GiftBackfillTab = () => {
  const [orphanPosts, setOrphanPosts] = useState<OrphanGiftPost[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processed, setProcessed] = useState(0);
  const [matched, setMatched] = useState(0);
  const [failed, setFailed] = useState(0);
  const [results, setResults] = useState<MatchResult[]>([]);

  const fetchOrphanGiftPosts = async () => {
    setIsLoading(true);
    try {
      // Get gift posts with NULL gift_receiver_id
      const { data: posts, error } = await supabase
        .from('posts')
        .select('id, author_id, content, created_at, gift_receiver_id')
        .eq('post_type', 'gift')
        .is('gift_receiver_id', null)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      // Enrich with author names
      if (posts && posts.length > 0) {
        const authorIds = [...new Set(posts.map(p => p.author_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, display_name')
          .in('id', authorIds);

        const profileMap = new Map(profiles?.map(p => [p.id, p.display_name]) || []);

        const enrichedPosts = posts.map(p => ({
          ...p,
          author_name: profileMap.get(p.author_id) || 'Unknown',
        }));

        setOrphanPosts(enrichedPosts);
      } else {
        setOrphanPosts([]);
      }
    } catch (error) {
      console.error('Error fetching orphan posts:', error);
      toast.error('Lỗi khi tải danh sách bài gift');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrphanGiftPosts();
  }, []);

  // Parse receiver name from content
  const extractReceiverName = (content: string | null): string | null => {
    if (!content) return null;

    // New format: "@ReceiverName vừa được"
    const m1 = content.match(/@([^@\n]+?)\s+vừa được/i);
    if (m1?.[1]) return m1[1].trim();

    // Old format: "cho @ReceiverName"
    const m2 = content.match(/cho\s+@([^\n#\[]+)/i);
    if (m2?.[1]) return m2[1].trim();

    // Format: "Đã tặng ... cho @Name"
    const m3 = content.match(/Đã tặng\s+[\d.,KkMm]+\s+\w+\s+cho\s+@([^\n#]+)/i);
    if (m3?.[1]) return m3[1].trim();

    return null;
  };

  // Parse amount from content
  const extractAmount = (content: string | null): number | null => {
    if (!content) return null;

    const match = content.match(/(\d[\d.,\s]*)\s*(CLC|CAMLY|BNB|USDT|BTCB)/i);
    if (!match) return null;

    const numStr = match[1].replace(/[.,\s]/g, '');
    const amount = parseInt(numStr, 10);
    return isNaN(amount) ? null : amount;
  };

  const runBackfill = async () => {
    if (orphanPosts.length === 0) {
      toast.info('Không có bài gift nào cần backfill');
      return;
    }

    setIsProcessing(true);
    setProcessed(0);
    setMatched(0);
    setFailed(0);
    setResults([]);

    const matchResults: MatchResult[] = [];

    for (let i = 0; i < orphanPosts.length; i++) {
      const post = orphanPosts[i];
      setProcessed(i + 1);

      try {
        let receiverId: string | null = null;
        let receiverName: string | null = null;
        let matchMethod: 'transaction' | 'content_parse' = 'transaction';

        // Method 1: Try to find matching transaction by sender + time window
        const postTime = new Date(post.created_at);
        const timeWindowStart = new Date(postTime.getTime() - 5 * 60 * 1000); // 5 min before
        const timeWindowEnd = new Date(postTime.getTime() + 5 * 60 * 1000); // 5 min after

        const { data: transactions } = await supabase
          .from('wallet_transactions')
          .select('receiver_id, amount, created_at')
          .eq('sender_id', post.author_id)
          .gte('created_at', timeWindowStart.toISOString())
          .lte('created_at', timeWindowEnd.toISOString())
          .order('created_at', { ascending: false })
          .limit(5);

        if (transactions && transactions.length > 0) {
          // Try to match by amount if we can parse it
          const postAmount = extractAmount(post.content);
          
          let bestMatch = transactions[0]; // Default to most recent
          
          if (postAmount) {
            // Find transaction with matching amount
            const amountMatch = transactions.find(t => t.amount === postAmount);
            if (amountMatch) {
              bestMatch = amountMatch;
            }
          }

          receiverId = bestMatch.receiver_id;

          // Fetch receiver name
          const { data: receiverProfile } = await supabase
            .from('profiles')
            .select('display_name')
            .eq('id', receiverId)
            .single();

          receiverName = receiverProfile?.display_name || null;
        }

        // Method 2: Fall back to content parsing
        if (!receiverId) {
          matchMethod = 'content_parse';
          const parsedName = extractReceiverName(post.content);

          if (parsedName) {
            // Search for profile by name
            const { data: foundProfiles } = await supabase
              .from('profiles')
              .select('id, display_name')
              .ilike('display_name', parsedName)
              .limit(1);

            if (foundProfiles && foundProfiles.length > 0) {
              receiverId = foundProfiles[0].id;
              receiverName = foundProfiles[0].display_name;
            }
          }
        }

        // Update the post if we found a match
        if (receiverId) {
          const { error: updateError } = await supabase
            .from('posts')
            .update({ gift_receiver_id: receiverId })
            .eq('id', post.id);

          if (updateError) {
            console.error('Error updating post:', updateError);
            setFailed(prev => prev + 1);
          } else {
            setMatched(prev => prev + 1);
            matchResults.push({
              postId: post.id,
              receiverId,
              receiverName: receiverName || 'Unknown',
              method: matchMethod,
            });
          }
        } else {
          setFailed(prev => prev + 1);
        }
      } catch (error) {
        console.error('Error processing post:', post.id, error);
        setFailed(prev => prev + 1);
      }
    }

    setResults(matchResults);
    setIsProcessing(false);

    if (matchResults.length > 0) {
      toast.success(`Đã backfill ${matchResults.length}/${orphanPosts.length} bài gift`);
    } else {
      toast.info('Không tìm được match cho bất kỳ bài nào');
    }

    // Refresh the list
    fetchOrphanGiftPosts();
  };

  const progress = orphanPosts.length > 0 ? (processed / orphanPosts.length) * 100 : 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="w-5 h-5 text-primary" />
            Backfill Gift Receiver ID
          </CardTitle>
          <CardDescription>
            Tự động map <code>gift_receiver_id</code> cho các bài gift cũ dựa trên lịch sử giao dịch và nội dung bài viết
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-muted rounded-lg text-center">
              <div className="text-2xl font-bold text-primary">
                {isLoading ? <Loader2 className="w-6 h-6 animate-spin mx-auto" /> : orphanPosts.length}
              </div>
              <div className="text-sm text-muted-foreground">Bài cần backfill</div>
            </div>
            <div className="p-4 bg-green-500/10 rounded-lg text-center">
              <div className="text-2xl font-bold text-green-600">{matched}</div>
              <div className="text-sm text-muted-foreground">Đã match</div>
            </div>
            <div className="p-4 bg-red-500/10 rounded-lg text-center">
              <div className="text-2xl font-bold text-red-600">{failed}</div>
              <div className="text-sm text-muted-foreground">Không match</div>
            </div>
            <div className="p-4 bg-blue-500/10 rounded-lg text-center">
              <div className="text-2xl font-bold text-blue-600">{processed}</div>
              <div className="text-sm text-muted-foreground">Đã xử lý</div>
            </div>
          </div>

          {/* Progress Bar */}
          {isProcessing && (
            <div className="space-y-2">
              <Progress value={progress} className="h-2" />
              <div className="text-sm text-muted-foreground text-center">
                Đang xử lý {processed}/{orphanPosts.length}...
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              onClick={fetchOrphanGiftPosts}
              variant="outline"
              disabled={isLoading || isProcessing}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Làm mới
            </Button>
            <Button
              onClick={runBackfill}
              disabled={isLoading || isProcessing || orphanPosts.length === 0}
              className="bg-gradient-to-r from-primary to-green-500"
            >
              {isProcessing ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Play className="w-4 h-4 mr-2" />
              )}
              Chạy Backfill
            </Button>
          </div>

          {/* Warning */}
          <div className="flex items-start gap-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-yellow-800 dark:text-yellow-200">
              <strong>Lưu ý:</strong> Tool sẽ tìm giao dịch trong khoảng ±5 phút quanh thời điểm tạo bài gift.
              Nếu không tìm được, sẽ parse tên từ content và tìm profile tương ứng.
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              Kết quả Backfill ({results.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-64">
              <div className="space-y-2">
                {results.map((result, i) => (
                  <div
                    key={result.postId}
                    className="flex items-center justify-between p-3 bg-muted rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-mono text-muted-foreground">
                        {result.postId.slice(0, 8)}...
                      </span>
                      <ArrowRight className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">{result.receiverName}</span>
                    </div>
                    <Badge
                      variant={result.method === 'transaction' ? 'default' : 'secondary'}
                    >
                      {result.method === 'transaction' ? (
                        <>
                          <Link2 className="w-3 h-3 mr-1" />
                          Transaction
                        </>
                      ) : (
                        'Content Parse'
                      )}
                    </Badge>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Orphan Posts List */}
      <Card>
        <CardHeader>
          <CardTitle>Danh sách bài Gift chưa có receiver_id</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : orphanPosts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-500" />
              <p>Tất cả bài gift đều đã có receiver_id! 🎉</p>
            </div>
          ) : (
            <ScrollArea className="h-80">
              <div className="space-y-3">
                {orphanPosts.map((post) => (
                  <div
                    key={post.id}
                    className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{post.author_name}</span>
                          <Badge variant="outline" className="text-xs">
                            {new Date(post.created_at).toLocaleDateString('vi-VN')}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {post.content || 'Không có nội dung'}
                        </p>
                        {post.content && (
                          <div className="mt-2">
                            <Badge variant="secondary" className="text-xs">
                              Parsed: {extractReceiverName(post.content) || 'Không parse được'}
                            </Badge>
                          </div>
                        )}
                      </div>
                      <div className="text-xs font-mono text-muted-foreground">
                        {post.id.slice(0, 8)}...
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default GiftBackfillTab;
