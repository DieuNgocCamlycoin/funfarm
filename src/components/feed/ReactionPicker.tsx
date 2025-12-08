import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

interface Reaction {
  id: string;
  emoji: string;
  label: string;
  color: string;
}

const reactions: Reaction[] = [
  { id: "like", emoji: "👍", label: "Thích", color: "text-primary" },
  { id: "love", emoji: "❤️", label: "Yêu thương", color: "text-destructive" },
  { id: "haha", emoji: "😆", label: "Haha", color: "text-yellow-500" },
  { id: "wow", emoji: "😮", label: "Wow", color: "text-yellow-500" },
  { id: "sad", emoji: "😢", label: "Buồn", color: "text-yellow-500" },
  { id: "angry", emoji: "😠", label: "Phẫn nộ", color: "text-orange-500" },
];

interface ReactionPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (reaction: Reaction) => void;
  position?: "top" | "bottom";
}

export const ReactionPicker = ({ isOpen, onClose, onSelect, position = "top" }: ReactionPickerProps) => {
  const pickerRef = useRef<HTMLDivElement>(null);
  const [hoveredReaction, setHoveredReaction] = useState<string | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={pickerRef}
      className={cn(
        "absolute left-0 z-50 bg-card border border-border rounded-full shadow-lg p-1.5 flex items-center gap-0.5 animate-scale-in",
        position === "top" ? "bottom-full mb-2" : "top-full mt-2"
      )}
    >
      {reactions.map((reaction) => (
        <button
          key={reaction.id}
          onClick={() => {
            onSelect(reaction);
            onClose();
          }}
          onMouseEnter={() => setHoveredReaction(reaction.id)}
          onMouseLeave={() => setHoveredReaction(null)}
          className={cn(
            "relative w-10 h-10 flex items-center justify-center rounded-full transition-all duration-200 hover:scale-125 hover:bg-muted",
            hoveredReaction === reaction.id && "scale-125"
          )}
        >
          <span className="text-2xl">{reaction.emoji}</span>
          
          {hoveredReaction === reaction.id && (
            <span className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-foreground text-background text-xs rounded-md whitespace-nowrap animate-fade-in">
              {reaction.label}
            </span>
          )}
        </button>
      ))}
    </div>
  );
};

export type { Reaction };
export { reactions };
