import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import {
  RefreshCw,
  Download,
  Wallet,
  Clock,
  TrendingUp,
  AlertTriangle,
  Trash2,
  Ban,
  ExternalLink,
} from "lucide-react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import camlyCoinLogo from "@/assets/camly_coin.png";

interface FinancialSummary {
  pendingReward: { count: number; total: number };
  inAppBalance: { count: number; total: number };
  onChainClaimed: { wallets: number; transactions: number; total: number };
  deletedUsers: { count: number; total: number };
  bannedUsers: { count: number; total: number };
}

interface OnChainClaim {
  walletAddress: string;
  userName?: string;
  totalClaimed: number;
  transactions: number;
  lastClaimAt?: string;
  isDeleted?: boolean;
  isBanned?: boolean;
}

interface DeletedUser {
  id: string;
  user_id: string;
  display_name: string | null;
  camly_balance: number;
  approved_reward: number;
  pending_reward: number;
  deletion_reason: string | null;
  deleted_at: string | null;
}

export function FinancialReportTab() {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [onChainClaims, setOnChainClaims] = useState<OnChainClaim[]>([]);
  const [deletedUsers, setDeletedUsers] = useState<DeletedUser[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchFinancialData = async () => {
    setLoading(true);
    try {
      // Parallel fetch all data sources
      const [
        { data: activeProfiles },
        { data: bannedProfiles },
        { data: deletedUsersData },
        { data: blockchainCache },
      ] = await Promise.all([
        // Active users aggregation
        supabase
          .from("profiles")
          .select("pending_reward, camly_balance")
          .eq("banned", false),
        // Banned users aggregation
        supabase
          .from("profiles")
          .select("pending_reward, camly_balance, wallet_address")
          .eq("banned", true),
        // Deleted users
        supabase
          .from("deleted_users")
          .select("*")
          .order("deleted_at", { ascending: false }),
        // On-chain data
        supabase
          .from("blockchain_cache")
          .select("*")
          .eq("id", "camly_claims")
          .single(),
      ]);

      // Calculate summary
      const pendingTotal = activeProfiles?.reduce(
        (sum, p) => sum + (p.pending_reward || 0),
        0
      ) || 0;
      const pendingCount = activeProfiles?.filter(
        (p) => (p.pending_reward || 0) > 0
      ).length || 0;

      const balanceTotal = activeProfiles?.reduce(
        (sum, p) => sum + (p.camly_balance || 0),
        0
      ) || 0;
      const balanceCount = activeProfiles?.filter(
        (p) => (p.camly_balance || 0) > 0
      ).length || 0;

      const bannedTotal = bannedProfiles?.reduce(
        (sum, p) => sum + (p.pending_reward || 0) + (p.camly_balance || 0),
        0
      ) || 0;
      const bannedCount = bannedProfiles?.length || 0;

      const deletedTotal = deletedUsersData?.reduce(
        (sum, u) => sum + (u.camly_balance || 0),
        0
      ) || 0;
      const deletedCount = deletedUsersData?.length || 0;

      // Parse on-chain data
      const aggregated = (blockchainCache?.aggregated_data as Record<string, any>) || {};
      const onChainTotal = blockchainCache?.total_claimed || 0;
      const onChainWallets = blockchainCache?.total_wallets || 0;
      const onChainTxs = blockchainCache?.total_transactions || 0;

      // Build banned wallets set for highlighting
      const bannedWallets = new Set(
        bannedProfiles?.map((p) => p.wallet_address?.toLowerCase()) || []
      );

      // Map on-chain claims with user info
      const claims: OnChainClaim[] = Object.entries(aggregated).map(
        ([wallet, info]: [string, any]) => ({
          walletAddress: info.walletAddress || wallet,
          userName: info.userName,
          totalClaimed: info.totalClaimed || 0,
          transactions: info.transactions || 0,
          lastClaimAt: info.lastClaimAt,
          isBanned: bannedWallets.has(wallet.toLowerCase()),
        })
      );
      claims.sort((a, b) => b.totalClaimed - a.totalClaimed);

      setSummary({
        pendingReward: { count: pendingCount, total: pendingTotal },
        inAppBalance: { count: balanceCount, total: balanceTotal },
        onChainClaimed: {
          wallets: onChainWallets,
          transactions: onChainTxs,
          total: onChainTotal,
        },
        deletedUsers: { count: deletedCount, total: deletedTotal },
        bannedUsers: { count: bannedCount, total: bannedTotal },
      });
      setOnChainClaims(claims);
      setDeletedUsers(deletedUsersData || []);
      setLastUpdated(new Date());
    } catch (err) {
      console.error("Error fetching financial data:", err);
      toast.error("Không thể tải dữ liệu tài chính");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFinancialData();
  }, []);

  const formatCLC = (amount: number) => {
    return amount.toLocaleString("vi-VN");
  };

  const totalSystemPayout = summary
    ? summary.pendingReward.total +
      summary.inAppBalance.total +
      summary.onChainClaimed.total +
      summary.deletedUsers.total +
      summary.bannedUsers.total
    : 0;

  const exportOnChainCSV = () => {
    const headers = ["Wallet", "Tên", "Số tiền claim", "Số giao dịch", "Lần cuối"];
    const rows = onChainClaims.map((c) => [
      c.walletAddress,
      c.userName || "N/A",
      c.totalClaimed,
      c.transactions,
      c.lastClaimAt || "N/A",
    ]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `onchain-claims-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    toast.success("Đã xuất file on-chain claims");
  };

  const exportDeletedUsersCSV = () => {
    const headers = ["User ID", "Tên", "Balance", "Pending", "Approved", "Lý do xóa", "Ngày xóa"];
    const rows = deletedUsers.map((u) => [
      u.user_id,
      u.display_name || "N/A",
      u.camly_balance || 0,
      u.pending_reward || 0,
      u.approved_reward || 0,
      u.deletion_reason || "N/A",
      u.deleted_at ? format(new Date(u.deleted_at), "dd/MM/yyyy HH:mm") : "N/A",
    ]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `deleted-users-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    toast.success("Đã xuất file deleted users");
  };

  const exportSummaryCSV = () => {
    const data = [
      ["Metric", "Số lượng", "Tổng CLC"],
      ["Pending Reward", summary?.pendingReward.count || 0, summary?.pendingReward.total || 0],
      ["In-app Balance", summary?.inAppBalance.count || 0, summary?.inAppBalance.total || 0],
      ["On-chain Claimed", summary?.onChainClaimed.wallets || 0, summary?.onChainClaimed.total || 0],
      ["Deleted Users", summary?.deletedUsers.count || 0, summary?.deletedUsers.total || 0],
      ["Banned Users", summary?.bannedUsers.count || 0, summary?.bannedUsers.total || 0],
      ["", "", ""],
      ["TỔNG CHI HỆ THỐNG", "", totalSystemPayout],
    ];
    const csv = data.map((r) => r.join(",")).join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `financial-summary-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    toast.success("Đã xuất file tổng hợp tài chính");
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          {lastUpdated
            ? `Cập nhật: ${format(lastUpdated, "HH:mm dd/MM/yyyy", { locale: vi })}`
            : "Chưa tải"}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={exportSummaryCSV}>
            <Download className="h-4 w-4 mr-1" />
            Tổng hợp
          </Button>
          <Button size="sm" variant="outline" onClick={exportOnChainCSV}>
            <Download className="h-4 w-4 mr-1" />
            On-chain
          </Button>
          <Button size="sm" variant="outline" onClick={exportDeletedUsersCSV}>
            <Download className="h-4 w-4 mr-1" />
            Deleted
          </Button>
          <Button size="sm" onClick={() => fetchFinancialData()}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Làm mới
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Pending Reward */}
        <Card className="border-yellow-500/30 bg-yellow-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-yellow-600 flex items-center gap-1">
              <Clock className="h-4 w-4" />
              Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-1">
              <img src={camlyCoinLogo} alt="CLC" className="h-4 w-4" />
              <span className="text-lg font-bold">
                {formatCLC(summary?.pendingReward.total || 0)}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {summary?.pendingReward.count} users
            </p>
          </CardContent>
        </Card>

        {/* In-app Balance */}
        <Card className="border-green-500/30 bg-green-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-600 flex items-center gap-1">
              <Wallet className="h-4 w-4" />
              In-app
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-1">
              <img src={camlyCoinLogo} alt="CLC" className="h-4 w-4" />
              <span className="text-lg font-bold">
                {formatCLC(summary?.inAppBalance.total || 0)}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {summary?.inAppBalance.count} users
            </p>
          </CardContent>
        </Card>

        {/* On-chain Claimed */}
        <Card className="border-purple-500/30 bg-purple-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-purple-600 flex items-center gap-1">
              <ExternalLink className="h-4 w-4" />
              On-chain
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-1">
              <img src={camlyCoinLogo} alt="CLC" className="h-4 w-4" />
              <span className="text-lg font-bold">
                {formatCLC(summary?.onChainClaimed.total || 0)}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {summary?.onChainClaimed.wallets} wallets, {summary?.onChainClaimed.transactions} txs
            </p>
          </CardContent>
        </Card>

        {/* Deleted Users */}
        <Card className="border-red-500/30 bg-red-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-600 flex items-center gap-1">
              <Trash2 className="h-4 w-4" />
              Deleted
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-1">
              <img src={camlyCoinLogo} alt="CLC" className="h-4 w-4" />
              <span className="text-lg font-bold">
                {formatCLC(summary?.deletedUsers.total || 0)}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {summary?.deletedUsers.count} users
            </p>
          </CardContent>
        </Card>

        {/* Banned Users */}
        <Card className="border-orange-500/30 bg-orange-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-orange-600 flex items-center gap-1">
              <Ban className="h-4 w-4" />
              Banned
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-1">
              <img src={camlyCoinLogo} alt="CLC" className="h-4 w-4" />
              <span className="text-lg font-bold">
                {formatCLC(summary?.bannedUsers.total || 0)}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {summary?.bannedUsers.count} users
            </p>
          </CardContent>
        </Card>

        {/* TOTAL */}
        <Card className="border-primary/50 bg-primary/10 col-span-2 md:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-primary flex items-center gap-1">
              <TrendingUp className="h-4 w-4" />
              TỔNG CHI
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-1">
              <img src={camlyCoinLogo} alt="CLC" className="h-5 w-5" />
              <span className="text-xl font-bold text-primary">
                {formatCLC(totalSystemPayout)}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">Toàn hệ thống</p>
          </CardContent>
        </Card>
      </div>

      {/* On-chain Claims Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ExternalLink className="h-5 w-5 text-purple-600" />
            Chi tiết On-chain Claims ({onChainClaims.length} wallets)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {onChainClaims.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Chưa có dữ liệu on-chain
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Wallet</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead className="text-right">Đã claim</TableHead>
                    <TableHead className="text-right">Giao dịch</TableHead>
                    <TableHead>Lần cuối</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {onChainClaims.slice(0, 20).map((claim) => (
                    <TableRow
                      key={claim.walletAddress}
                      className={claim.isBanned ? "bg-red-500/10" : ""}
                    >
                      <TableCell className="font-mono text-xs">
                        <a
                          href={`https://bscscan.com/address/${claim.walletAddress}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-primary flex items-center gap-1"
                        >
                          {claim.walletAddress.slice(0, 6)}...
                          {claim.walletAddress.slice(-4)}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {claim.userName || (
                            <span className="text-muted-foreground">N/A</span>
                          )}
                          {claim.isBanned && (
                            <Badge variant="destructive" className="text-xs">
                              Banned
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <img src={camlyCoinLogo} alt="CLC" className="h-3 w-3" />
                          {formatCLC(claim.totalClaimed)}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{claim.transactions}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {claim.lastClaimAt
                          ? format(new Date(claim.lastClaimAt), "dd/MM/yyyy HH:mm")
                          : "N/A"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {onChainClaims.length > 20 && (
                <p className="text-center text-sm text-muted-foreground mt-2">
                  Hiển thị 20/{onChainClaims.length} wallets. Export CSV để xem tất cả.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Deleted Users Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-red-600" />
            Users đã xóa ({deletedUsers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {deletedUsers.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Không có user nào bị xóa
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead className="text-right">Pending</TableHead>
                    <TableHead>Lý do</TableHead>
                    <TableHead>Ngày xóa</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deletedUsers.slice(0, 20).map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {user.display_name || "N/A"}
                          </p>
                          <p className="text-xs text-muted-foreground font-mono">
                            {user.user_id.slice(0, 8)}...
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <img src={camlyCoinLogo} alt="CLC" className="h-3 w-3" />
                          {formatCLC(user.camly_balance || 0)}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCLC(user.pending_reward || 0)}
                      </TableCell>
                      <TableCell className="text-xs max-w-[150px] truncate">
                        {user.deletion_reason || "N/A"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {user.deleted_at
                          ? format(new Date(user.deleted_at), "dd/MM/yyyy")
                          : "N/A"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {deletedUsers.length > 20 && (
                <p className="text-center text-sm text-muted-foreground mt-2">
                  Hiển thị 20/{deletedUsers.length} users. Export CSV để xem tất cả.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Warning */}
      <Card className="border-yellow-500/30 bg-yellow-500/5">
        <CardContent className="flex items-start gap-3 pt-4">
          <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-yellow-700">Lưu ý quan trọng</p>
            <ul className="text-muted-foreground mt-1 space-y-1 list-disc list-inside">
              <li>
                Dữ liệu on-chain được cache và cập nhật định kỳ (có thể chậm vài phút)
              </li>
              <li>
                Balance của deleted users là số dư tại thời điểm xóa, không bao gồm các thay đổi sau đó
              </li>
              <li>
                Tổng chi hệ thống = Pending + In-app + On-chain + Deleted + Banned
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
