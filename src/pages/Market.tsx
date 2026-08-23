// 🛒 Market – chợ nông sản nhanh
import { Search, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import MobileBottomNav from "@/components/MobileBottomNav";
import Navbar from "@/components/Navbar";

export default function Market() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-20 pb-24">
        <div className="container max-w-md mx-auto px-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Tìm nông sản..." className="pl-9" />
            </div>
            <Button variant="outline" size="icon">
              <SlidersHorizontal className="w-4 h-4" />
            </Button>
          </div>

          <div className="bg-card rounded-2xl border border-border p-8 text-center">
            <div className="text-4xl mb-3">🛒</div>
            <h2 className="font-semibold text-lg mb-2">Market đang mở dần</h2>
            <p className="text-sm text-muted-foreground">
              Phase 3 sẽ ra mắt lưới sản phẩm, bộ lọc và trang chi tiết mua hàng.
            </p>
          </div>
        </div>
      </main>
      <MobileBottomNav />
    </div>
  );
}
