import { Plus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FloatingCreateButtonProps {
  onClick: () => void;
}

const FloatingCreateButton = ({ onClick }: FloatingCreateButtonProps) => {
  return (
    <>
      {/* Desktop - Fixed to right side */}
      <div className="hidden lg:block fixed right-8 bottom-24 z-50">
        <Button
          onClick={onClick}
          size="lg"
          className="gradient-hero border-0 gap-2 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 group"
        >
          <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
          Tạo bài mới
        </Button>
      </div>

      {/* Mobile - Floating Action Button */}
      <div className="lg:hidden fixed right-4 bottom-20 z-50">
        <button
          onClick={onClick}
          className={cn(
            "w-14 h-14 rounded-full shadow-lg flex items-center justify-center",
            "bg-gradient-to-br from-primary via-secondary to-accent",
            "hover:shadow-xl transition-all duration-300 hover:scale-110",
            "animate-pulse-slow"
          )}
        >
          <Plus className="w-7 h-7 text-primary-foreground" />
        </button>
        
        {/* Ripple effect */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary via-secondary to-accent opacity-30 animate-ping pointer-events-none" />
      </div>
    </>
  );
};

export default FloatingCreateButton;
