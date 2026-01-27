// 🌱 Divine Mantra: "Farmers rich, Eaters happy. Farm to Table, Fair & Fast."
import { useTranslation } from 'react-i18next';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface VerifiedBadgeProps {
  size?: 'sm' | 'md' | 'lg';
  showTooltip?: boolean;
  className?: string;
}

const VerifiedBadge = ({ size = 'md', showTooltip = true, className = '' }: VerifiedBadgeProps) => {
  const { t } = useTranslation();
  
  const sizeClasses = {
    sm: 'w-4 h-4 text-xs',
    md: 'w-5 h-5 text-sm',
    lg: 'w-6 h-6 text-base',
  };

  const badge = (
    <span 
      className={`inline-flex items-center justify-center ${sizeClasses[size]} ${className}`}
      title={!showTooltip ? 'FUN FARMER từ tâm' : undefined}
    >
      {/* Badge hình trái tim lá - biểu tượng FUN FARM */}
      <svg 
        viewBox="0 0 24 24" 
        fill="none" 
        className="w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Trái tim */}
        <path 
          d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" 
          fill="url(#heartGradient)"
        />
        {/* Lá cây nhỏ trên trái tim */}
        <path 
          d="M12 2c0 0-2 2-2 4s2 3 2 3 2-1 2-3-2-4-2-4z" 
          fill="url(#leafGradient)"
        />
        {/* Dấu tick xác minh */}
        <path 
          d="M9 12l2 2 4-4" 
          stroke="white" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        />
        <defs>
          <linearGradient id="heartGradient" x1="2" y1="3" x2="22" y2="21" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FF6B6B" />
            <stop offset="1" stopColor="#FF8E53" />
          </linearGradient>
          <linearGradient id="leafGradient" x1="10" y1="2" x2="14" y2="9" gradientUnits="userSpaceOnUse">
            <stop stopColor="#4ADE80" />
            <stop offset="1" stopColor="#22C55E" />
          </linearGradient>
        </defs>
      </svg>
    </span>
  );

  if (!showTooltip) {
    return badge;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {badge}
        </TooltipTrigger>
        <TooltipContent className="bg-card border-border">
          <p className="text-sm font-medium text-foreground">🌱 FUN FARMER từ tâm</p>
          <p className="text-xs text-muted-foreground">Tài khoản đã xác minh</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default VerifiedBadge;
