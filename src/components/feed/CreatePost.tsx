import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { 
  Image, 
  Video, 
  Radio, 
  MapPin, 
  Tag,
  Send
} from "lucide-react";

const CreatePost = () => {
  const [content, setContent] = useState("");

  return (
    <div className="bg-card rounded-2xl shadow-card border border-border p-4">
      <div className="flex gap-3">
        <div className="relative">
          <img 
            src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop" 
            alt="Your avatar"
            className="w-12 h-12 rounded-full object-cover ring-2 ring-primary/20"
          />
          <span className="absolute -bottom-1 -right-1 text-sm">🌱</span>
        </div>
        <div className="flex-1">
          <Textarea
            placeholder="Chia sẻ sản phẩm tươi ngon của bạn hôm nay..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[100px] resize-none border-0 focus-visible:ring-0 p-0 text-base placeholder:text-muted-foreground/60"
          />
        </div>
      </div>

      <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary gap-2">
            <Image className="w-5 h-5" />
            <span className="hidden sm:inline">Ảnh</span>
          </Button>
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary gap-2">
            <Video className="w-5 h-5" />
            <span className="hidden sm:inline">Video</span>
          </Button>
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive gap-2">
            <Radio className="w-5 h-5" />
            <span className="hidden sm:inline">Live</span>
          </Button>
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-secondary gap-2">
            <MapPin className="w-5 h-5" />
            <span className="hidden sm:inline">Vị trí</span>
          </Button>
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-accent gap-2">
            <Tag className="w-5 h-5" />
            <span className="hidden sm:inline">Sản phẩm</span>
          </Button>
        </div>

        <Button 
          disabled={!content.trim()} 
          className="gradient-hero border-0 gap-2"
        >
          <Send className="w-4 h-4" />
          Đăng
        </Button>
      </div>
    </div>
  );
};

export default CreatePost;
