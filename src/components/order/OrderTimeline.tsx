// 🌱 Divine Mantra: "Farmers rich, Eaters happy. Farm to Table, Fair & Fast."
import { OrderStatus, ORDER_STATUS_CONFIG } from "@/types/marketplace";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface OrderTimelineProps {
  currentStatus: OrderStatus;
  createdAt: string;
  updatedAt: string;
}

const TIMELINE_ORDER: OrderStatus[] = ['pending', 'confirmed', 'preparing', 'ready', 'delivering', 'delivered'];

export const OrderTimeline = ({ currentStatus, createdAt, updatedAt }: OrderTimelineProps) => {
  const currentIndex = TIMELINE_ORDER.indexOf(currentStatus);
  const isCancelled = currentStatus === 'cancelled';

  if (isCancelled) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center text-white text-xl">
            ❌
          </div>
          <div>
            <p className="font-semibold text-red-700 dark:text-red-400">Đơn hàng đã bị hủy</p>
            <p className="text-sm text-muted-foreground">
              Cập nhật lúc: {new Date(updatedAt).toLocaleString('vi-VN')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
        Tiến trình đơn hàng
      </h4>
      <div className="relative">
        {/* Progress Line */}
        <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-muted" />
        <div 
          className="absolute left-5 top-0 w-0.5 bg-primary transition-all duration-500"
          style={{ 
            height: `${((currentIndex + 1) / TIMELINE_ORDER.length) * 100}%` 
          }}
        />

        {/* Timeline Items */}
        <div className="space-y-4">
          {TIMELINE_ORDER.map((status, index) => {
            const config = ORDER_STATUS_CONFIG[status];
            const isCompleted = index <= currentIndex;
            const isCurrent = index === currentIndex;

            return (
              <div key={status} className="relative flex items-start gap-4 pl-2">
                {/* Circle */}
                <div 
                  className={cn(
                    "relative z-10 w-8 h-8 rounded-full flex items-center justify-center text-sm transition-all",
                    isCompleted 
                      ? "bg-primary text-primary-foreground" 
                      : "bg-muted text-muted-foreground",
                    isCurrent && "ring-2 ring-primary ring-offset-2"
                  )}
                >
                  {isCompleted ? <Check className="w-4 h-4" /> : config.icon}
                </div>

                {/* Content */}
                <div className={cn(
                  "flex-1 pb-4",
                  !isCompleted && "opacity-50"
                )}>
                  <p className={cn(
                    "font-medium",
                    isCurrent && "text-primary"
                  )}>
                    {config.label}
                  </p>
                  {isCurrent && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(updatedAt).toLocaleString('vi-VN')}
                    </p>
                  )}
                  {index === 0 && isCompleted && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Đặt hàng lúc: {new Date(createdAt).toLocaleString('vi-VN')}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default OrderTimeline;
