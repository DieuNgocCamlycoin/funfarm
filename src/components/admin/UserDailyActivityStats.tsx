import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Search, User, Calendar, FileSpreadsheet, Download, X } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

interface UserSearchResult {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  email: string | null;
  created_at: string;
}

interface DailyActivityRow {
  date: string;
  postsCreated: number;
  reactionsGiven: number;
  reactionsReceived: number;
  commentsGiven: number;
  commentsReceived: number;
  sharesGiven: number;
  sharesReceived: number;
  friendsAdded: number;
}

export function UserDailyActivityStats() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(null);
  const [activityData, setActivityData] = useState<DailyActivityRow[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTimestamp, setSearchTimestamp] = useState<Date | null>(null);

  // Search users by name or ID
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast.error('Vui lòng nhập tên hoặc ID user');
      return;
    }

    setIsSearching(true);
    setSearchResults([]);
    setSelectedUser(null);
    setActivityData([]);

    try {
      // Search by ID (UUID) or by name
      let query = supabase
        .from('profiles')
        .select('id, display_name, avatar_url, email, created_at')
        .eq('banned', false)
        .limit(10);

      // Check if it's a UUID pattern
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(searchQuery.trim());

      if (isUUID) {
        query = query.eq('id', searchQuery.trim());
      } else {
        query = query.ilike('display_name', `%${searchQuery.trim()}%`);
      }

      const { data, error } = await query;

      if (error) throw error;

      if (!data || data.length === 0) {
        toast.info('Không tìm thấy user nào');
        return;
      }

      setSearchResults(data);
    } catch (err: any) {
      console.error('Search error:', err);
      toast.error('Lỗi tìm kiếm: ' + (err.message || 'Unknown error'));
    } finally {
      setIsSearching(false);
    }
  };

  // Get valid user IDs (not banned, not deleted)
  const getValidUserIds = async (): Promise<Set<string>> => {
    const { data: activeProfiles } = await supabase
      .from('profiles')
      .select('id')
      .eq('banned', false);
    
    const { data: deletedUsers } = await supabase
      .from('deleted_users')
      .select('user_id');
    
    const deletedUserIds = new Set(deletedUsers?.map(d => d.user_id) || []);
    
    const validIds = new Set(
      activeProfiles
        ?.filter(p => !deletedUserIds.has(p.id))
        .map(p => p.id) || []
    );

    return validIds;
  };

  // Fetch daily stats for selected user
  const handleSelectUser = async (user: UserSearchResult) => {
    setSelectedUser(user);
    setIsLoading(true);
    setSearchTimestamp(new Date());
    setSearchResults([]);

    try {
      const validUserIds = await getValidUserIds();
      const validUserIdArray = Array.from(validUserIds);
      const userId = user.id;
      
      // Fetch user's posts (không phải share)
      const { data: userPosts } = await supabase
        .from('posts')
        .select('id, created_at')
        .eq('author_id', userId)
        .neq('post_type', 'share')
        .order('created_at', { ascending: true });

      const userPostIds = userPosts?.map(p => p.id) || [];
      
      // Collect all dates
      const allDates = new Set<string>();
      
      userPosts?.forEach(p => {
        allDates.add(format(new Date(p.created_at), 'yyyy-MM-dd'));
      });

      // Fetch reactions given
      const { data: reactionsGiven } = await supabase
        .from('post_likes')
        .select('created_at')
        .eq('user_id', userId);
      
      reactionsGiven?.forEach(r => {
        allDates.add(format(new Date(r.created_at), 'yyyy-MM-dd'));
      });

      // Fetch comments given
      const { data: commentsGiven } = await supabase
        .from('comments')
        .select('created_at')
        .eq('author_id', userId);
      
      commentsGiven?.forEach(c => {
        allDates.add(format(new Date(c.created_at), 'yyyy-MM-dd'));
      });

      // Fetch shares given
      const { data: sharesGiven } = await supabase
        .from('posts')
        .select('created_at')
        .eq('author_id', userId)
        .eq('post_type', 'share');
      
      sharesGiven?.forEach(s => {
        allDates.add(format(new Date(s.created_at), 'yyyy-MM-dd'));
      });

      // Fetch friends added
      const { data: friendsAdded } = await supabase
        .from('followers')
        .select('created_at')
        .eq('follower_id', userId)
        .eq('status', 'accepted');
      
      friendsAdded?.forEach(f => {
        allDates.add(format(new Date(f.created_at), 'yyyy-MM-dd'));
      });

      // Fetch received metrics (excluding self and invalid users)
      let reactionsReceived: { created_at: string }[] = [];
      let commentsReceived: { created_at: string }[] = [];
      let sharesReceived: { created_at: string }[] = [];

      if (userPostIds.length > 0 && validUserIdArray.length > 0) {
        // Reactions received
        const { data: rr } = await supabase
          .from('post_likes')
          .select('created_at')
          .in('post_id', userPostIds)
          .neq('user_id', userId)
          .in('user_id', validUserIdArray);
        reactionsReceived = rr || [];
        
        // Comments received
        const { data: cr } = await supabase
          .from('comments')
          .select('created_at')
          .in('post_id', userPostIds)
          .neq('author_id', userId)
          .in('author_id', validUserIdArray);
        commentsReceived = cr || [];
        
        // Shares received
        const { data: sr } = await supabase
          .from('post_shares')
          .select('created_at')
          .in('post_id', userPostIds)
          .neq('user_id', userId)
          .in('user_id', validUserIdArray);
        sharesReceived = sr || [];
      }

      reactionsReceived.forEach(r => {
        allDates.add(format(new Date(r.created_at), 'yyyy-MM-dd'));
      });
      commentsReceived.forEach(c => {
        allDates.add(format(new Date(c.created_at), 'yyyy-MM-dd'));
      });
      sharesReceived.forEach(s => {
        allDates.add(format(new Date(s.created_at), 'yyyy-MM-dd'));
      });

      // Calculate stats per date
      const sortedDates = Array.from(allDates).sort().reverse(); // Newest first
      
      const stats: DailyActivityRow[] = sortedDates.map(date => ({
        date,
        postsCreated: userPosts?.filter(p => 
          format(new Date(p.created_at), 'yyyy-MM-dd') === date
        ).length || 0,
        reactionsGiven: reactionsGiven?.filter(r => 
          format(new Date(r.created_at), 'yyyy-MM-dd') === date
        ).length || 0,
        reactionsReceived: reactionsReceived.filter(r => 
          format(new Date(r.created_at), 'yyyy-MM-dd') === date
        ).length || 0,
        commentsGiven: commentsGiven?.filter(c => 
          format(new Date(c.created_at), 'yyyy-MM-dd') === date
        ).length || 0,
        commentsReceived: commentsReceived.filter(c => 
          format(new Date(c.created_at), 'yyyy-MM-dd') === date
        ).length || 0,
        sharesGiven: sharesGiven?.filter(s => 
          format(new Date(s.created_at), 'yyyy-MM-dd') === date
        ).length || 0,
        sharesReceived: sharesReceived.filter(s => 
          format(new Date(s.created_at), 'yyyy-MM-dd') === date
        ).length || 0,
        friendsAdded: friendsAdded?.filter(f => 
          format(new Date(f.created_at), 'yyyy-MM-dd') === date
        ).length || 0,
      }));

      setActivityData(stats);
      
      if (stats.length === 0) {
        toast.info('User chưa có hoạt động nào trên hệ thống');
      }
    } catch (err: any) {
      console.error('Load stats error:', err);
      toast.error('Lỗi tải dữ liệu: ' + (err.message || 'Unknown error'));
    } finally {
      setIsLoading(false);
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (!selectedUser || activityData.length === 0) return;

    const headers = ['Ngày', 'Bài đăng', 'Like cho', 'Like nhận', 'Cmt cho', 'Cmt nhận', 'Share cho', 'Share nhận', 'Bạn mới'];
    
    const rows = [
      `# THỐNG KÊ HOẠT ĐỘNG THEO NGÀY - ${selectedUser.display_name || 'Chưa đặt tên'}`,
      `# User ID: ${selectedUser.id}`,
      `# Email: ${selectedUser.email || 'N/A'}`,
      `# Tính đến: ${searchTimestamp ? format(searchTimestamp, 'HH:mm:ss dd/MM/yyyy', { locale: vi }) : ''}`,
      '',
      headers.join(','),
      ...activityData.map(row => [
        row.date,
        row.postsCreated,
        row.reactionsGiven,
        row.reactionsReceived,
        row.commentsGiven,
        row.commentsReceived,
        row.sharesGiven,
        row.sharesReceived,
        row.friendsAdded
      ].join(','))
    ];

    // Add totals
    const totals = activityData.reduce((acc, row) => ({
      posts: acc.posts + row.postsCreated,
      reactGiven: acc.reactGiven + row.reactionsGiven,
      reactReceived: acc.reactReceived + row.reactionsReceived,
      cmtGiven: acc.cmtGiven + row.commentsGiven,
      cmtReceived: acc.cmtReceived + row.commentsReceived,
      shareGiven: acc.shareGiven + row.sharesGiven,
      shareReceived: acc.shareReceived + row.sharesReceived,
      friends: acc.friends + row.friendsAdded
    }), { posts: 0, reactGiven: 0, reactReceived: 0, cmtGiven: 0, cmtReceived: 0, shareGiven: 0, shareReceived: 0, friends: 0 });

    rows.push('');
    rows.push(`TỔNG,${totals.posts},${totals.reactGiven},${totals.reactReceived},${totals.cmtGiven},${totals.cmtReceived},${totals.shareGiven},${totals.shareReceived},${totals.friends}`);

    const csvContent = rows.join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `user-activity-${selectedUser.id.slice(0, 8)}-${format(new Date(), 'yyyyMMdd-HHmm')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success('Đã xuất file CSV!');
  };

  // Calculate totals
  const totals = activityData.reduce((acc, row) => ({
    posts: acc.posts + row.postsCreated,
    reactGiven: acc.reactGiven + row.reactionsGiven,
    reactReceived: acc.reactReceived + row.reactionsReceived,
    cmtGiven: acc.cmtGiven + row.commentsGiven,
    cmtReceived: acc.cmtReceived + row.commentsReceived,
    shareGiven: acc.shareGiven + row.sharesGiven,
    shareReceived: acc.shareReceived + row.sharesReceived,
    friends: acc.friends + row.friendsAdded
  }), { posts: 0, reactGiven: 0, reactReceived: 0, cmtGiven: 0, cmtReceived: 0, shareGiven: 0, shareReceived: 0, friends: 0 });

  const handleClear = () => {
    setSelectedUser(null);
    setActivityData([]);
    setSearchTimestamp(null);
    setSearchQuery('');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5 text-cyan-500" />
          Tra cứu Hoạt Động User
        </CardTitle>
        <CardDescription>
          Tìm kiếm user và xem bảng thống kê hoạt động theo ngày từ khi tham gia nền tảng.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search Bar */}
        <div className="flex gap-2">
          <Input
            placeholder="Nhập tên hoặc ID user..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="flex-1"
          />
          <Button onClick={handleSearch} disabled={isSearching}>
            {isSearching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
            <span className="ml-2 hidden sm:inline">Tìm kiếm</span>
          </Button>
        </div>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="border rounded-lg p-2 space-y-1 bg-muted/30">
            <p className="text-sm text-muted-foreground px-2">Chọn user để xem thống kê:</p>
            {searchResults.map((user) => (
              <button
                key={user.id}
                onClick={() => handleSelectUser(user)}
                className="w-full flex items-center gap-3 p-2 rounded-md hover:bg-accent transition-colors text-left"
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user.avatar_url || undefined} />
                  <AvatarFallback>
                    <User className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{user.display_name || 'Chưa đặt tên'}</p>
                  <p className="text-xs text-muted-foreground truncate">{user.email || user.id}</p>
                </div>
                <span className="text-xs text-muted-foreground">
                  Tham gia: {format(new Date(user.created_at), 'dd/MM/yyyy')}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-8 gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span className="text-muted-foreground">Đang tải dữ liệu...</span>
          </div>
        )}

        {/* Stats Table */}
        {selectedUser && !isLoading && (
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={selectedUser.avatar_url || undefined} />
                  <AvatarFallback>
                    <User className="h-6 w-6" />
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <FileSpreadsheet className="h-5 w-5 text-green-500" />
                    Bảng thống kê hoạt động theo ngày của "{selectedUser.display_name || 'Chưa đặt tên'}"
                  </h3>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    Tính đến {searchTimestamp && format(searchTimestamp, "HH'h'mm'p'ss's' 'ngày' dd/MM/yyyy", { locale: vi })}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                {activityData.length > 0 && (
                  <Button variant="outline" size="sm" onClick={handleExportCSV}>
                    <Download className="h-4 w-4 mr-1" />
                    Export CSV
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={handleClear}>
                  <X className="h-4 w-4 mr-1" />
                  Đóng
                </Button>
              </div>
            </div>

            {activityData.length > 0 ? (
              <>
                {/* Summary */}
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 p-3 bg-muted/50 rounded-lg text-center text-sm">
                  <div>
                    <p className="font-semibold text-primary">{totals.posts}</p>
                    <p className="text-xs text-muted-foreground">Bài đăng</p>
                  </div>
                  <div>
                    <p className="font-semibold text-blue-500">{totals.reactGiven}</p>
                    <p className="text-xs text-muted-foreground">Like cho</p>
                  </div>
                  <div>
                    <p className="font-semibold text-blue-600">{totals.reactReceived}</p>
                    <p className="text-xs text-muted-foreground">Like nhận</p>
                  </div>
                  <div>
                    <p className="font-semibold text-green-500">{totals.cmtGiven}</p>
                    <p className="text-xs text-muted-foreground">Cmt cho</p>
                  </div>
                  <div>
                    <p className="font-semibold text-green-600">{totals.cmtReceived}</p>
                    <p className="text-xs text-muted-foreground">Cmt nhận</p>
                  </div>
                  <div>
                    <p className="font-semibold text-purple-500">{totals.shareGiven}</p>
                    <p className="text-xs text-muted-foreground">Share cho</p>
                  </div>
                  <div>
                    <p className="font-semibold text-purple-600">{totals.shareReceived}</p>
                    <p className="text-xs text-muted-foreground">Share nhận</p>
                  </div>
                  <div>
                    <p className="font-semibold text-pink-500">{totals.friends}</p>
                    <p className="text-xs text-muted-foreground">Bạn mới</p>
                  </div>
                </div>

                {/* Table */}
                <ScrollArea className="h-[400px] rounded-md border">
                  <Table>
                    <TableHeader className="sticky top-0 bg-background z-10">
                      <TableRow>
                        <TableHead className="w-[100px]">Ngày</TableHead>
                        <TableHead className="text-center">Bài đăng</TableHead>
                        <TableHead className="text-center text-blue-500">Like cho</TableHead>
                        <TableHead className="text-center text-blue-600">Like nhận</TableHead>
                        <TableHead className="text-center text-green-500">Cmt cho</TableHead>
                        <TableHead className="text-center text-green-600">Cmt nhận</TableHead>
                        <TableHead className="text-center text-purple-500">Share cho</TableHead>
                        <TableHead className="text-center text-purple-600">Share nhận</TableHead>
                        <TableHead className="text-center text-pink-500">Bạn mới</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {activityData.map((row) => (
                        <TableRow key={row.date}>
                          <TableCell className="font-medium">
                            {format(new Date(row.date), 'dd/MM/yyyy')}
                          </TableCell>
                          <TableCell className="text-center">{row.postsCreated || '-'}</TableCell>
                          <TableCell className="text-center">{row.reactionsGiven || '-'}</TableCell>
                          <TableCell className="text-center">{row.reactionsReceived || '-'}</TableCell>
                          <TableCell className="text-center">{row.commentsGiven || '-'}</TableCell>
                          <TableCell className="text-center">{row.commentsReceived || '-'}</TableCell>
                          <TableCell className="text-center">{row.sharesGiven || '-'}</TableCell>
                          <TableCell className="text-center">{row.sharesReceived || '-'}</TableCell>
                          <TableCell className="text-center">{row.friendsAdded || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>

                <p className="text-xs text-muted-foreground text-center">
                  Hiển thị {activityData.length} ngày hoạt động • Đã loại trừ self-interactions và users không hợp lệ
                </p>
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>User chưa có hoạt động nào trên hệ thống</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
