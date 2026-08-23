// 💬 Chat – placeholder cho Phase 5
import { MessageCircle } from "lucide-react";
import Navbar from "@/components/Navbar";

export default function Chat() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-20 pb-24">
        <div className="container max-w-md mx-auto px-4 text-center">
          <div className="text-4xl mb-3">💬</div>
          <h2 className="font-semibold text-lg mb-2">Chat sắp ra mắt</h2>
          <p className="text-sm text-muted-foreground">
            Phase 5 sẽ mở khung chat giữa người mua và nhà nông, hỗ trợ hỏi hàng trước khi mua.
          </p>
        </div>
      </main>
    </div>
  );
}
