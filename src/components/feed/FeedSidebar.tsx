import { User } from "@/types/feed";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  TrendingUp, 
  CheckCircle2, 
  Plus,
  Flame,
  Users
} from "lucide-react";
import camlyCoinLogo from '@/assets/camly_coin.png';

interface FeedSidebarProps {
  trendingHashtags: { tag: string; count: number }[];
  suggestedFarms: User[];
}

const getUserTypeIcon = (type: string) => {
  switch (type) {
    case 'farm': return '🌱';
    case 'fisher': return '🐟';
    case 'ranch': return '🐄';
    default: return '👤';
  }
};

const formatNumber = (num: number): string => {
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
};

const FeedSidebar = ({ trendingHashtags, suggestedFarms }: FeedSidebarProps) => {
  return (
    <aside className="space-y-6">
      {/* Trending Hashtags */}
      <div className="bg-card rounded-2xl shadow-card border border-border p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 rounded-lg gradient-hero">
            <Flame className="w-5 h-5 text-primary-foreground" />
          </div>
          <h3 className="font-display font-semibold text-foreground">Xu hướng</h3>
        </div>
        
        <ul className="space-y-3">
          {trendingHashtags.slice(0, 6).map((item, index) => (
            <li key={item.tag}>
              <button className="w-full flex items-center justify-between group hover:bg-muted/50 p-2 -mx-2 rounded-lg transition-colors">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-muted-foreground w-5">
                    {index + 1}
                  </span>
                  <div className="text-left">
                    <p className="font-medium text-foreground group-hover:text-primary transition-colors">
                      #{item.tag}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatNumber(item.count)} bài viết
                    </p>
                  </div>
                </div>
                {index < 3 && (
                  <TrendingUp className="w-4 h-4 text-primary" />
                )}
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* Suggested Farms */}
      <div className="bg-card rounded-2xl shadow-card border border-border p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 rounded-lg bg-secondary/20">
            <Users className="w-5 h-5 text-secondary" />
          </div>
          <h3 className="font-display font-semibold text-foreground">Gợi ý theo dõi</h3>
        </div>
        
        <ul className="space-y-4">
          {suggestedFarms.map((farm) => (
            <li key={farm.id} className="flex items-center gap-3">
              <div className="relative">
                <img 
                  src={farm.avatar} 
                  alt={farm.name}
                  className="w-11 h-11 rounded-full object-cover ring-2 ring-primary/20"
                />
                <span className="absolute -bottom-1 -right-1 text-xs">
                  {getUserTypeIcon(farm.type)}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <p className="font-medium text-sm text-foreground truncate">
                    {farm.name}
                  </p>
                  {farm.verified && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-primary fill-primary/20 flex-shrink-0" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {farm.location}
                </p>
              </div>
              <Button size="sm" variant="outline" className="gap-1 flex-shrink-0">
                <Plus className="w-3 h-3" />
                Follow
              </Button>
            </li>
          ))}
        </ul>

        <Button variant="ghost" className="w-full mt-4 text-primary">
          Xem thêm
        </Button>
      </div>

      {/* Earn Info Card */}
      <div className="bg-gradient-to-br from-primary/10 via-secondary/10 to-accent/10 rounded-2xl border border-border p-5">
        <div className="flex items-center gap-2 mb-3">
          <img src={camlyCoinLogo} alt="CAMLY Coin" className="w-8 h-8 object-contain" />
          <h3 className="font-display font-semibold text-foreground">Free-Fee & Earn</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Mọi hoạt động đều được ghi nhận và thưởng CAMLY Coin. Không phí trung gian!
        </p>
        <div className="flex flex-wrap gap-2">
          <Badge className="bg-primary/20 text-primary border-0">Post & Earn</Badge>
          <Badge className="bg-secondary/20 text-secondary border-0">Review & Earn</Badge>
          <Badge className="bg-accent/20 text-accent-foreground border-0">Share & Earn</Badge>
        </div>
      </div>
    </aside>
  );
};

export default FeedSidebar;
