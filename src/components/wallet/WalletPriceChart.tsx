import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  TrendingDown, 
  Activity,
  BarChart3,
  Coins,
  RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
} from 'recharts';
import { format, subDays, startOfDay } from 'date-fns';
import { vi } from 'date-fns/locale';
import camlyCoinImg from '@/assets/camly_coin.png';

interface PriceData {
  date: string;
  price: number;
  timestamp?: number;
}

interface MarketData {
  bnbPrice: number;
  bnbChange24h: number;
  clcTransactions: number;
  clcVolume: number;
}

const WalletPriceChart: React.FC = () => {
  const [priceData, setPriceData] = useState<PriceData[]>([]);
  const [marketData, setMarketData] = useState<MarketData | null>(null);
  const [transactionStats, setTransactionStats] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('7d');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Fetch BNB price from CoinGecko
      await fetchBNBPrice();
      
      // Fetch CLC transaction stats from our database
      await fetchCLCStats();
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Không thể tải dữ liệu');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchBNBPrice = async () => {
    try {
      const days = activeTab === '24h' ? 1 : activeTab === '7d' ? 7 : 30;
      
      const response = await fetch(
        `https://api.coingecko.com/api/v3/coins/binancecoin/market_chart?vs_currency=usd&days=${days}`
      );
      
      if (!response.ok) {
        throw new Error('CoinGecko API error');
      }
      
      const data = await response.json();
      
      // Transform price data
      const prices = data.prices.map((item: [number, number]) => ({
        date: format(new Date(item[0]), 'dd/MM HH:mm'),
        price: item[1],
        timestamp: item[0],
      }));

      // Sample data points to avoid overcrowding
      const sampleRate = Math.ceil(prices.length / 50);
      const sampledPrices = prices.filter((_: any, i: number) => i % sampleRate === 0);
      
      setPriceData(sampledPrices);

      // Get current price and 24h change
      const currentPriceResponse = await fetch(
        'https://api.coingecko.com/api/v3/simple/price?ids=binancecoin&vs_currencies=usd&include_24hr_change=true'
      );
      
      if (currentPriceResponse.ok) {
        const currentData = await currentPriceResponse.json();
        setMarketData(prev => ({
          ...prev,
          bnbPrice: currentData.binancecoin?.usd || 0,
          bnbChange24h: currentData.binancecoin?.usd_24h_change || 0,
          clcTransactions: prev?.clcTransactions || 0,
          clcVolume: prev?.clcVolume || 0,
        }));
      }
    } catch (err) {
      console.error('Error fetching BNB price:', err);
      // Use mock data if API fails
      generateMockPriceData();
    }
  };

  const generateMockPriceData = () => {
    const days = activeTab === '24h' ? 1 : activeTab === '7d' ? 7 : 30;
    const dataPoints = days * 24;
    const now = Date.now();
    const interval = (days * 24 * 60 * 60 * 1000) / dataPoints;
    
    const mockData = Array.from({ length: dataPoints }, (_, i) => {
      const timestamp = now - (dataPoints - i) * interval;
      const basePrice = 600;
      const variation = Math.sin(i / 10) * 20 + Math.random() * 10;
      return {
        date: format(new Date(timestamp), 'dd/MM HH:mm'),
        price: basePrice + variation,
        timestamp,
      };
    });

    // Sample to 50 points
    const sampleRate = Math.ceil(mockData.length / 50);
    setPriceData(mockData.filter((_, i) => i % sampleRate === 0));
    
    setMarketData(prev => ({
      ...prev,
      bnbPrice: 610,
      bnbChange24h: 2.5,
      clcTransactions: prev?.clcTransactions || 0,
      clcVolume: prev?.clcVolume || 0,
    }));
  };

  const fetchCLCStats = async () => {
    try {
      const days = activeTab === '24h' ? 1 : activeTab === '7d' ? 7 : 30;
      const startDate = subDays(new Date(), days).toISOString();

      // Get total transactions and volume
      const { data: transactions, error } = await supabase
        .from('wallet_transactions')
        .select('amount, created_at, currency')
        .eq('currency', 'CLC')
        .gte('created_at', startDate);

      if (error) throw error;

      const totalVolume = transactions?.reduce((sum, t) => sum + t.amount, 0) || 0;
      const totalCount = transactions?.length || 0;

      setMarketData(prev => ({
        bnbPrice: prev?.bnbPrice || 0,
        bnbChange24h: prev?.bnbChange24h || 0,
        clcTransactions: totalCount,
        clcVolume: totalVolume,
      }));

      // Group by day for chart
      const dailyStats: Record<string, { count: number; volume: number }> = {};
      
      transactions?.forEach(tx => {
        const day = format(startOfDay(new Date(tx.created_at)), 'dd/MM');
        if (!dailyStats[day]) {
          dailyStats[day] = { count: 0, volume: 0 };
        }
        dailyStats[day].count++;
        dailyStats[day].volume += tx.amount;
      });

      const statsArray = Object.entries(dailyStats).map(([date, stats]) => ({
        date,
        transactions: stats.count,
        volume: stats.volume,
      }));

      setTransactionStats(statsArray);
    } catch (err) {
      console.error('Error fetching CLC stats:', err);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(price);
  };

  const formatVolume = (volume: number) => {
    if (volume >= 1000000) return (volume / 1000000).toFixed(1) + 'M';
    if (volume >= 1000) return (volume / 1000).toFixed(1) + 'K';
    return volume.toLocaleString();
  };

  return (
    <Card className="mb-6">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Activity className="w-5 h-5 text-primary" />
            Thị trường & Giao dịch
          </CardTitle>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={fetchData}
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Market Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          {/* BNB Price */}
          <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-yellow-500 font-bold">◆</span>
              <span className="text-xs text-muted-foreground">BNB</span>
            </div>
            <div className="text-lg font-bold">
              {marketData ? formatPrice(marketData.bnbPrice) : '--'}
            </div>
            {marketData && (
              <div className={`text-xs flex items-center gap-1 ${
                marketData.bnbChange24h >= 0 ? 'text-green-500' : 'text-red-500'
              }`}>
                {marketData.bnbChange24h >= 0 ? (
                  <TrendingUp className="w-3 h-3" />
                ) : (
                  <TrendingDown className="w-3 h-3" />
                )}
                {marketData.bnbChange24h.toFixed(2)}%
              </div>
            )}
          </div>

          {/* CLC Transactions */}
          <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
            <div className="flex items-center gap-2 mb-1">
              <img src={camlyCoinImg} alt="CLC" className="w-4 h-4" />
              <span className="text-xs text-muted-foreground">Giao dịch</span>
            </div>
            <div className="text-lg font-bold text-primary">
              {marketData?.clcTransactions || 0}
            </div>
            <div className="text-xs text-muted-foreground">
              lượt tặng
            </div>
          </div>

          {/* CLC Volume */}
          <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
            <div className="flex items-center gap-2 mb-1">
              <Coins className="w-4 h-4 text-green-500" />
              <span className="text-xs text-muted-foreground">Khối lượng</span>
            </div>
            <div className="text-lg font-bold text-green-500">
              {formatVolume(marketData?.clcVolume || 0)}
            </div>
            <div className="text-xs text-muted-foreground">
              CLC
            </div>
          </div>

          {/* Estimated Value */}
          <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 className="w-4 h-4 text-purple-500" />
              <span className="text-xs text-muted-foreground">Giá CLC</span>
            </div>
            <div className="text-lg font-bold text-purple-500">
              1 VND
            </div>
            <div className="text-xs text-muted-foreground">
              ước tính
            </div>
          </div>
        </div>

        {/* Time Range Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-3 mb-4">
            <TabsTrigger value="24h">24 giờ</TabsTrigger>
            <TabsTrigger value="7d">7 ngày</TabsTrigger>
            <TabsTrigger value="30d">30 ngày</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-0">
            {isLoading ? (
              <div className="h-48 flex items-center justify-center">
                <RefreshCw className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : error ? (
              <div className="h-48 flex items-center justify-center text-muted-foreground">
                {error}
              </div>
            ) : (
              <div className="space-y-4">
                {/* BNB Price Chart */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-yellow-500 font-bold">◆</span>
                    <span className="text-sm font-medium">Giá BNB (USD)</span>
                    <Badge variant="outline" className="text-xs">CoinGecko</Badge>
                  </div>
                  <div className="h-40">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={priceData}>
                        <defs>
                          <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#EAB308" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#EAB308" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                        <XAxis 
                          dataKey="date" 
                          tick={{ fontSize: 10 }}
                          interval="preserveStartEnd"
                        />
                        <YAxis 
                          tick={{ fontSize: 10 }}
                          domain={['dataMin - 10', 'dataMax + 10']}
                          tickFormatter={(value) => `$${value.toFixed(0)}`}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--background))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                          }}
                          formatter={(value: number) => [formatPrice(value), 'Giá']}
                        />
                        <Area
                          type="monotone"
                          dataKey="price"
                          stroke="#EAB308"
                          strokeWidth={2}
                          fillOpacity={1}
                          fill="url(#colorPrice)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* CLC Transaction Volume Chart */}
                {transactionStats.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <img src={camlyCoinImg} alt="CLC" className="w-4 h-4" />
                      <span className="text-sm font-medium">Giao dịch CLC</span>
                      <Badge variant="outline" className="text-xs">Fun Farm</Badge>
                    </div>
                    <div className="h-32">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={transactionStats}>
                          <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                          <XAxis 
                            dataKey="date" 
                            tick={{ fontSize: 10 }}
                          />
                          <YAxis 
                            tick={{ fontSize: 10 }}
                            tickFormatter={(value) => formatVolume(value)}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'hsl(var(--background))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px',
                            }}
                            formatter={(value: number, name: string) => [
                              formatVolume(value),
                              name === 'volume' ? 'Khối lượng' : 'Giao dịch'
                            ]}
                          />
                          <Bar 
                            dataKey="volume" 
                            fill="hsl(var(--primary))" 
                            radius={[4, 4, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default WalletPriceChart;
