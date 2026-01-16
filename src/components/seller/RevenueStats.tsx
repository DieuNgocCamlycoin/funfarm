// 🌱 Divine Mantra: "Farmers rich, Eaters happy. Farm to Table, Fair & Fast."
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { TrendingUp, Package, CheckCircle, XCircle, DollarSign, BarChart3 } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface RevenueData {
  totalCamly: number;
  totalVnd: number;
  totalOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  successRate: number;
  dailyRevenue: { date: string; camly: number; vnd: number }[];
  topProducts: { name: string; quantity: number; revenue: number }[];
}

export const RevenueStats = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | 'all'>('7d');
  const [data, setData] = useState<RevenueData>({
    totalCamly: 0,
    totalVnd: 0,
    totalOrders: 0,
    completedOrders: 0,
    cancelledOrders: 0,
    successRate: 0,
    dailyRevenue: [],
    topProducts: [],
  });

  useEffect(() => {
    if (!user?.id) return;
    fetchRevenueData();
  }, [user?.id, timeRange]);

  const fetchRevenueData = async () => {
    if (!user?.id) return;
    setLoading(true);

    try {
      // Calculate date range
      const now = new Date();
      let startDate: Date | null = null;
      if (timeRange === '7d') {
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      } else if (timeRange === '30d') {
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }

      // Fetch orders
      let query = supabase
        .from('orders')
        .select('*')
        .eq('seller_id', user.id);

      if (startDate) {
        query = query.gte('created_at', startDate.toISOString());
      }

      const { data: orders, error } = await query;

      if (error) throw error;

      if (orders) {
        // Calculate totals
        const completedOrders = orders.filter(o => o.status === 'delivered');
        const cancelledOrders = orders.filter(o => o.status === 'cancelled');

        const totalCamly = completedOrders.reduce((sum, o) => sum + (o.total_camly || 0), 0);
        const totalVnd = completedOrders.reduce((sum, o) => sum + (o.total_vnd || 0), 0);

        // Group by date for chart
        const revenueByDate = new Map<string, { camly: number; vnd: number }>();
        completedOrders.forEach(order => {
          const date = new Date(order.created_at).toLocaleDateString('vi-VN');
          const existing = revenueByDate.get(date) || { camly: 0, vnd: 0 };
          revenueByDate.set(date, {
            camly: existing.camly + (order.total_camly || 0),
            vnd: existing.vnd + (order.total_vnd || 0),
          });
        });

        const dailyRevenue = Array.from(revenueByDate.entries())
          .map(([date, values]) => ({ date, ...values }))
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        // Group by product for top products
        const productMap = new Map<string, { quantity: number; revenue: number }>();
        completedOrders.forEach(order => {
          const existing = productMap.get(order.product_name) || { quantity: 0, revenue: 0 };
          productMap.set(order.product_name, {
            quantity: existing.quantity + (order.quantity_kg || 0),
            revenue: existing.revenue + (order.total_camly || 0),
          });
        });

        const topProducts = Array.from(productMap.entries())
          .map(([name, stats]) => ({ name, ...stats }))
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 5);

        setData({
          totalCamly,
          totalVnd,
          totalOrders: orders.length,
          completedOrders: completedOrders.length,
          cancelledOrders: cancelledOrders.length,
          successRate: orders.length > 0 
            ? Math.round((completedOrders.length / orders.length) * 100) 
            : 0,
          dailyRevenue,
          topProducts,
        });
      }
    } catch (error) {
      console.error('Error fetching revenue:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="h-16 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Time Range Filter */}
      <div className="flex gap-2">
        {(['7d', '30d', 'all'] as const).map(range => (
          <Button
            key={range}
            variant={timeRange === range ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTimeRange(range)}
          >
            {range === '7d' ? '7 ngày' : range === '30d' ? '30 ngày' : 'Tất cả'}
          </Button>
        ))}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-amber-50 to-yellow-100 dark:from-amber-900/20 dark:to-yellow-900/20 border-amber-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 mb-2">
              <DollarSign className="w-4 h-4" />
              <span className="text-sm font-medium">Doanh thu CAMLY</span>
            </div>
            <p className="text-2xl font-bold text-amber-800 dark:text-amber-300">
              {data.totalCamly.toLocaleString()}
            </p>
            <p className="text-xs text-amber-600/80">CAMLY</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-green-700 dark:text-green-400 mb-2">
              <TrendingUp className="w-4 h-4" />
              <span className="text-sm font-medium">Doanh thu VNĐ</span>
            </div>
            <p className="text-2xl font-bold text-green-800 dark:text-green-300">
              {data.totalVnd.toLocaleString()}
            </p>
            <p className="text-xs text-green-600/80">VNĐ</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-blue-600 mb-2">
              <Package className="w-4 h-4" />
              <span className="text-sm font-medium">Tổng đơn hàng</span>
            </div>
            <p className="text-2xl font-bold">{data.totalOrders}</p>
            <div className="flex gap-2 text-xs mt-1">
              <span className="text-green-600">✅ {data.completedOrders}</span>
              <span className="text-red-600">❌ {data.cancelledOrders}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-purple-600 mb-2">
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm font-medium">Tỷ lệ thành công</span>
            </div>
            <p className="text-2xl font-bold">{data.successRate}%</p>
            <p className="text-xs text-muted-foreground">
              {data.completedOrders}/{data.totalOrders} đơn
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Chart */}
      {data.dailyRevenue.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="w-4 h-4" />
              Biểu đồ doanh thu
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={data.dailyRevenue}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip 
                  formatter={(value: number) => value.toLocaleString()}
                  labelFormatter={(label) => `Ngày: ${label}`}
                />
                <Line 
                  type="monotone" 
                  dataKey="camly" 
                  stroke="#f59e0b" 
                  name="CAMLY"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Top Products */}
      {data.topProducts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">🏆 Sản phẩm bán chạy</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.topProducts.map((product, index) => (
                <div 
                  key={product.name}
                  className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg"
                >
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium truncate">{product.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {product.quantity} kg đã bán
                    </p>
                  </div>
                  <p className="font-bold text-amber-600">
                    {product.revenue.toLocaleString()} CLC
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default RevenueStats;
