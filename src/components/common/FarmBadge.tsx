import { cn } from "@/lib/utils";
import { Leaf } from "lucide-react";

interface FarmBadgeProps {
  className?: string;
  size?: "sm" | "md";
}

export const FarmBadge = ({ className, size = "sm" }: FarmBadgeProps) => {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-green-50 text-green-700 border border-green-200 font-medium",
        size === "sm" ? "text-[10px] px-1.5 py-0" : "text-xs px-2 py-0.5",
        className
      )}
    >
      <Leaf className={size === "sm" ? "w-2.5 h-2.5" : "w-3 h-3"} />
      Farm
    </span>
  );
};

export default FarmBadge;
