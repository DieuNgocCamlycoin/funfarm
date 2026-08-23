// 🌱 Farm Feed – TikTok-style nông sản feed
import { Sprout, Search, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Navbar from "@/components/Navbar";

export default function FarmFeed() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-20 pb-24">
        <div className="container max-w-md mx-auto px-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Sprout className="w-5 h-5 text-green-600" />
              <h1 className="font-display font-bold text-lg">Farm Feed</h1>
            </div>
            <Button variant="ghost" size="sm">
              <MapPin className="w-4 h-4 mr-1" />
              Gần bạn
            </Button>
          </div>

          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Tìm farm / sản phẩm..." className="pl-9" />
          </div>

          <div className="bg-card rounded-2xl border border-border p-8 text-center">
            <div className="text-4xl mb-3">🌱</div>
            <h2 className="font-semibold text-lg mb-2">Farm Feed đang mở dần</h2>
            <p className="text-sm text-muted-foreground">
              Phase 2 sẽ mang đến trải nghiệm TikTok-style xem nông sản từ các farm xung quanh.
            </p>
          </div>
        </div>
      </main>
      <MobileBottomNav />
    </div>
  );
}
