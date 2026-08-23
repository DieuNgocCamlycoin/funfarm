import { cn } from "@/lib/utils";

export type ProductAvailability =
  | "available_now"
  | "harvesting_today"
  | "pre_order"
  | "next_harvest"
  | "sold_out";

interface AvailabilityBadgeProps {
  availability: ProductAvailability;
  className?: string;
  size?: "sm" | "md";
}

const availabilityConfig: Record<
  ProductAvailability,
  { label: string; emoji: string; classes: string }
> = {
  available_now: {
    label: "Có sẵn",
    emoji: "🌿",
    classes: "bg-green-50 text-green-700 border-green-200",
  },
  harvesting_today: {
    label: "Thu hoạch hôm nay",
    emoji: "🌱",
    classes: "bg-yellow-50 text-yellow-700 border-yellow-200",
  },
  pre_order: {
    label: "Đặt trước",
    emoji: "📦",
    classes: "bg-blue-50 text-blue-700 border-blue-200",
  },
  next_harvest: {
    label: "Mùa vụ tới",
    emoji: "🌾",
    classes: "bg-orange-50 text-orange-700 border-orange-200",
  },
  sold_out: {
    label: "Hết hàng",
    emoji: "❌",
    classes: "bg-muted text-muted-foreground border-border",
  },
};

export const AvailabilityBadge = ({
  availability,
  className,
  size = "sm",
}: AvailabilityBadgeProps) => {
  const config = availabilityConfig[availability] || availabilityConfig.available_now;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full font-medium",
        size === "sm" ? "text-[10px] px-1.5 py-0" : "text-xs px-2 py-0.5",
        config.classes,
        className
      )}
    >
      <span>{config.emoji}</span>
      <span>{config.label}</span>
    </span>
  );
};

export default AvailabilityBadge;
