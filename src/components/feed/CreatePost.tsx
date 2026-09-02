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
    <div className="ff-content-card ff-composer p-4">
      {/* Input Row */}
      <div className="flex items-center gap-3">
        <Avatar className="w-10 h-10 md:w-12 md:h-12 ring-1 ring-[#d8b85a] ring-offset-2 ring-offset-white">
          <AvatarImage src={profile?.avatar_url || defaultAvatarGirl} />
          <AvatarFallback className="bg-primary/10 text-lg">
            {profileTypeEmojis[profile?.profile_type || 'farmer'] || '🌱'}
          </AvatarFallback>
        </Avatar>

        <button
          onClick={() => handleOpenTab("post")}
          className="ff-composer-input flex-1 rounded-full px-4 py-3 text-left text-muted-foreground transition-colors"
        >
          Bạn đang nghĩ gì vậy?
        </button>
      </div>

      {/* Divider */}
      <div className="mt-4 border-t border-emerald-900/10 pt-3" />

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
