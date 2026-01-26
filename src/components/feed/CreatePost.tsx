import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { PenSquare, ShoppingBag } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import defaultAvatarGirl from "@/assets/default-avatar-girl.jpeg";

const profileTypeEmojis: Record<string, string> = {
  farmer: '🧑‍🌾',
  fisher: '🎣',
  eater: '🍽️',
  restaurant: '👨‍🍳',
  distributor: '📦',
  shipper: '🚚',
};

interface CreatePostProps {
  onOpenModal?: () => void;
  onOpenModalWithTab?: (tab: string) => void;
}

const CreatePost = ({ onOpenModal, onOpenModalWithTab }: CreatePostProps) => {
  const { profile } = useAuth();

  const handleOpenTab = (tab: string) => {
    if (onOpenModalWithTab) {
      onOpenModalWithTab(tab);
    } else if (onOpenModal) {
      onOpenModal();
    }
  };

  return (
    <div className="bg-card rounded-2xl shadow-card border border-border p-4">
      {/* Input Row */}
      <div className="flex items-center gap-3">
        <Avatar className="w-10 h-10 md:w-12 md:h-12 ring-2 ring-primary/20">
          <AvatarImage src={profile?.avatar_url || defaultAvatarGirl} />
          <AvatarFallback className="bg-primary/10 text-lg">
            {profileTypeEmojis[profile?.profile_type || 'farmer'] || '🌱'}
          </AvatarFallback>
        </Avatar>

        <button
          onClick={() => handleOpenTab("post")}
          className="flex-1 text-left px-4 py-3 rounded-full bg-muted/50 hover:bg-muted text-muted-foreground transition-colors"
        >
          Bạn đang nghĩ gì vậy?
        </button>
      </div>

      {/* Divider */}
      <div className="border-t border-border mt-4 pt-3" />

      {/* Action Buttons - 2 buttons: Chia sẻ & Bán hàng */}
      <div className="flex items-center justify-center gap-4">
        <Button 
          variant="ghost" 
          className="flex-1 gap-2 text-primary hover:bg-primary/10"
          onClick={() => handleOpenTab("post")}
        >
          <PenSquare className="w-5 h-5" />
          <span className="font-medium">Chia sẻ</span>
        </Button>

        <div className="w-px h-6 bg-border" />

        <Button 
          variant="ghost" 
          className="flex-1 gap-2 text-green-600 hover:bg-green-100/50"
          onClick={() => handleOpenTab("product")}
        >
          <ShoppingBag className="w-5 h-5" />
          <span className="font-medium">Bán hàng</span>
        </Button>
      </div>
    </div>
  );
};

export default CreatePost;
