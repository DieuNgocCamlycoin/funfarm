import { Heart } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface GoodHeartBadgeProps {
  since?: string;
  size?: "sm" | "md" | "lg";
}

export const GoodHeartBadge = ({ since, size = "md" }: GoodHeartBadgeProps) => {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-6 h-6"
  };

  const formattedDate = since 
    ? new Date(since).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="inline-flex items-center justify-center">
            <Heart 
              className={`${sizeClasses[size]} text-pink-500 fill-pink-500 animate-pulse`} 
            />
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="font-medium">💖 Trái tim lương thiện</p>
          {formattedDate && (
            <p className="text-xs text-muted-foreground">Từ {formattedDate}</p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
