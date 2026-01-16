// 🌱 Divine Mantra: "Farmers rich, Eaters happy. Farm to Table, Fair & Fast."
import { Badge } from "@/components/ui/badge";
import { OrderStatus, ORDER_STATUS_CONFIG } from "@/types/marketplace";
import { cn } from "@/lib/utils";

interface OrderStatusBadgeProps {
  status: OrderStatus;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const OrderStatusBadge = ({ status, size = 'md', className }: OrderStatusBadgeProps) => {
  const config = ORDER_STATUS_CONFIG[status] || ORDER_STATUS_CONFIG.pending;
  
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-1.5',
  };

  return (
    <Badge 
      className={cn(
        "font-medium",
        config.color,
        "text-white",
        sizeClasses[size],
        className
      )}
    >
      <span className="mr-1">{config.icon}</span>
      {config.label}
    </Badge>
  );
};

export default OrderStatusBadge;
