import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Video, Image, Smile } from "lucide-react";
import CreatePostModal from "@/components/feed/CreatePostModal";

interface ProfileCreatePostProps {
  avatarUrl?: string | null;
  displayName?: string;
  profileEmoji?: string;
  onPostCreated?: () => void;
}

export const ProfileCreatePost = ({ 
  avatarUrl, 
  displayName, 
  profileEmoji = "🌱",
  onPostCreated 
}: ProfileCreatePostProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [initialTab, setInitialTab] = useState("post");

  const handleOpenModal = (tab: string = "post") => {
    setInitialTab(tab);
    setIsModalOpen(true);
  };

  const handlePostCreated = (post: any) => {
    onPostCreated?.();
  };

  return (
    <>
      <div className="bg-card rounded-xl border border-border p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <Avatar className="w-10 h-10">
            <AvatarImage src={avatarUrl || undefined} />
            <AvatarFallback className="bg-primary/10">{profileEmoji}</AvatarFallback>
          </Avatar>
          
          <button
            onClick={() => handleOpenModal("post")}
            className="flex-1 text-left px-4 py-2.5 bg-muted/50 hover:bg-muted rounded-full text-muted-foreground transition-colors"
          >
            {displayName ? `${displayName} ơi, bạn đang nghĩ gì vậy?` : "Bạn đang nghĩ gì vậy?"}
          </button>
        </div>

        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
          <Button 
            variant="ghost" 
            className="flex-1 gap-2 text-destructive hover:bg-destructive/10"
            onClick={() => handleOpenModal("live")}
          >
            <Video className="w-5 h-5" />
            <span className="hidden sm:inline">Livestream</span>
          </Button>
          
          <Button 
            variant="ghost" 
            className="flex-1 gap-2 text-primary hover:bg-primary/10"
            onClick={() => handleOpenModal("photo")}
          >
            <Image className="w-5 h-5" />
            <span className="hidden sm:inline">Ảnh/Video</span>
          </Button>
          
          <Button 
            variant="ghost" 
            className="flex-1 gap-2 text-accent hover:bg-accent/10"
            onClick={() => handleOpenModal("post")}
          >
            <Smile className="w-5 h-5" />
            <span className="hidden sm:inline">Cảm xúc</span>
          </Button>
        </div>
      </div>

      <CreatePostModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        onPost={handlePostCreated}
        initialTab={initialTab}
      />
    </>
  );
};
