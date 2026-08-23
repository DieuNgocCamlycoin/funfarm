import { cn } from "@/lib/utils";
import { Heart } from "lucide-react";

interface LoveScoreBadgeProps {
  score: number;
  className?: string;
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "text-[10px] px-1.5 py-0 gap-0.5",
  md: "text-xs px-2 py-0.5 gap-1",
  lg: "text-sm px-2.5 py-1 gap-1",
};

const iconSizes = {
  sm: "w-2.5 h-2.5",
  md: "w-3 h-3",
  lg: "w-4 h-4",
};

export const LoveScoreBadge = ({ score, className, size = "md" }: LoveScoreBadgeProps) => {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full bg-rose-50 text-rose-600 border border-rose-200 font-semibold",
        sizeClasses[size],
        className
      )}
      title="Love Score – điểm tình yêu thương trong cộng đồng"
    >
      <Heart className={cn(iconSizes[size], "fill-rose-500 text-rose-500")} />
      {score.toLocaleString("vi-VN")}
    </span>
  );
};

export default LoveScoreBadge;
