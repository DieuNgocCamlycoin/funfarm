import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Video, Image, Smile } from "lucide-react";
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
}

const CreatePost = ({ onOpenModal }: CreatePostProps) => {
  const { profile } = useAuth();

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
          onClick={onOpenModal}
          className="flex-1 text-left px-4 py-3 rounded-full bg-muted/50 hover:bg-muted text-muted-foreground transition-colors"
        >
          Bạn đang nghĩ gì vậy?
        </button>
      </div>

      {/* Divider */}
      <div className="border-t border-border mt-4 pt-3" />

      {/* Action Buttons */}
      <div className="flex items-center justify-around">
        <Button 
          variant="ghost" 
          className="flex-1 gap-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          onClick={onOpenModal}
        >
          <Video className="w-5 h-5 text-destructive" />
          <span className="font-medium">Livestream</span>
        </Button>

        <div className="w-px h-6 bg-border" />

        <Button 
          variant="ghost" 
          className="flex-1 gap-2 text-muted-foreground hover:text-primary hover:bg-primary/10"
          onClick={onOpenModal}
        >
          <Image className="w-5 h-5 text-primary" />
          <span className="font-medium">Ảnh/Video</span>
        </Button>

        <div className="w-px h-6 bg-border" />

        <Button 
          variant="ghost" 
          className="flex-1 gap-2 text-muted-foreground hover:text-accent hover:bg-accent/10"
          onClick={onOpenModal}
        >
          <Smile className="w-5 h-5 text-accent" />
          <span className="font-medium">Cảm xúc</span>
        </Button>
      </div>
    </div>
  );
};

export default CreatePost;
