import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Image,
  Video,
  Radio,
  MapPin,
  Tag,
  Send,
  X,
  Plus,
  Sparkles,
  Clock,
  Hash,
  Users,
  Smile,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPost?: (post: any) => void;
}

const postTypes = [
  { id: "post", label: "Bài viết", icon: Sparkles, color: "text-primary" },
  { id: "photo", label: "Ảnh/Video", icon: Image, color: "text-blue-500" },
  { id: "live", label: "Livestream", icon: Radio, color: "text-destructive" },
  { id: "story", label: "Story 24h", icon: Clock, color: "text-purple-500" },
];

const CreatePostModal = ({ isOpen, onClose, onPost }: CreatePostModalProps) => {
  const [content, setContent] = useState("");
  const [postType, setPostType] = useState("post");
  const [images, setImages] = useState<string[]>([]);
  const [location, setLocation] = useState("");
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [newHashtag, setNewHashtag] = useState("");
  const [isPosting, setIsPosting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAddImage = () => {
    // Simulate adding image - in real app would open file picker
    const sampleImages = [
      "https://images.unsplash.com/photo-1622206151226-18ca2c9ab4a1?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=800&h=600&fit=crop",
    ];
    if (images.length < 10) {
      setImages([...images, sampleImages[images.length % sampleImages.length]]);
    }
  };

  const handleRemoveImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const handleAddHashtag = () => {
    if (newHashtag.trim() && !hashtags.includes(newHashtag.trim())) {
      setHashtags([...hashtags, newHashtag.trim().replace("#", "")]);
      setNewHashtag("");
    }
  };

  const handleRemoveHashtag = (tag: string) => {
    setHashtags(hashtags.filter((t) => t !== tag));
  };

  const handlePost = async () => {
    if (!content.trim()) return;

    setIsPosting(true);
    
    // Simulate posting
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const newPost = {
      id: Date.now().toString(),
      content,
      images,
      location,
      hashtags,
      postType,
      createdAt: new Date().toISOString(),
    };

    onPost?.(newPost);
    setIsPosting(false);
    handleReset();
    onClose();
  };

  const handleReset = () => {
    setContent("");
    setImages([]);
    setLocation("");
    setHashtags([]);
    setPostType("post");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto p-0 gap-0 bg-gradient-to-br from-card via-card to-primary/5 border-primary/20">
        {/* Header with gradient */}
        <DialogHeader className="p-6 pb-4 bg-gradient-to-r from-primary/10 via-secondary/10 to-accent/10 border-b border-border">
          <DialogTitle className="flex items-center gap-3 font-display text-xl">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Tạo Bài Viết Mới
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="p-6 space-y-6">
          {/* Post Type Tabs */}
          <Tabs value={postType} onValueChange={setPostType}>
            <TabsList className="grid grid-cols-4 bg-muted/50">
              {postTypes.map((type) => (
                <TabsTrigger
                  key={type.id}
                  value={type.id}
                  className={cn(
                    "gap-2 data-[state=active]:bg-background",
                    type.color
                  )}
                >
                  <type.icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{type.label}</span>
                </TabsTrigger>
              ))}
            </TabsList>

            {/* Content for each post type */}
            <TabsContent value="post" className="space-y-4 mt-4">
              <PostContent
                content={content}
                setContent={setContent}
                placeholder="Kể chuyện nông trại của bạn hôm nay... 🌱"
              />
            </TabsContent>

            <TabsContent value="photo" className="space-y-4 mt-4">
              <PostContent
                content={content}
                setContent={setContent}
                placeholder="Chia sẻ hình ảnh sản phẩm tươi ngon... 📸"
              />
            </TabsContent>

            <TabsContent value="live" className="space-y-4 mt-4">
              <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-6 text-center">
                <Radio className="w-12 h-12 mx-auto text-destructive mb-3 animate-pulse" />
                <h3 className="font-display font-semibold text-lg text-foreground mb-2">
                  Livestream từ Nông Trại
                </h3>
                <p className="text-muted-foreground text-sm mb-4">
                  Phát trực tiếp từ vườn, biển để bà con thấy sản phẩm thật!
                </p>
                <Badge variant="outline" className="border-destructive text-destructive">
                  Tính năng sắp ra mắt - Powered by Livepeer
                </Badge>
              </div>
              <PostContent
                content={content}
                setContent={setContent}
                placeholder="Mô tả livestream của bạn..."
              />
            </TabsContent>

            <TabsContent value="story" className="space-y-4 mt-4">
              <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-6 text-center">
                <Clock className="w-12 h-12 mx-auto text-purple-500 mb-3" />
                <h3 className="font-display font-semibold text-lg text-foreground mb-2">
                  Story 24 giờ
                </h3>
                <p className="text-muted-foreground text-sm">
                  Chia sẻ khoảnh khắc thoáng qua từ nông trại, biển cả!
                </p>
              </div>
              <PostContent
                content={content}
                setContent={setContent}
                placeholder="Viết caption cho story..."
              />
            </TabsContent>
          </Tabs>

          {/* Image Upload Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-foreground flex items-center gap-2">
                <Image className="w-4 h-4 text-primary" />
                Hình ảnh & Video
              </label>
              <span className="text-xs text-muted-foreground">
                {images.length}/10
              </span>
            </div>

            {images.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {images.map((img, index) => (
                  <div key={index} className="relative aspect-square rounded-xl overflow-hidden group">
                    <img
                      src={img}
                      alt={`Upload ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <button
                      onClick={() => handleRemoveImage(index)}
                      className="absolute top-2 right-2 w-6 h-6 bg-foreground/80 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-4 h-4 text-background" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={handleAddImage}
              disabled={images.length >= 10}
              className="w-full border-dashed border-2 gap-2 hover:border-primary hover:bg-primary/5"
            >
              <Plus className="w-4 h-4" />
              Thêm ảnh/video
            </Button>
          </div>

          {/* Location */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground flex items-center gap-2">
              <MapPin className="w-4 h-4 text-secondary" />
              Vị trí
            </label>
            <Input
              placeholder="Thêm địa điểm nông trại, vùng biển..."
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="bg-muted/50"
            />
          </div>

          {/* Hashtags */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground flex items-center gap-2">
              <Hash className="w-4 h-4 text-accent" />
              Hashtag
            </label>
            <div className="flex gap-2">
              <Input
                placeholder="#huuco #rausach #farmtotable"
                value={newHashtag}
                onChange={(e) => setNewHashtag(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleAddHashtag()}
                className="bg-muted/50"
              />
              <Button variant="secondary" size="icon" onClick={handleAddHashtag}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            {hashtags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {hashtags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="gap-1 bg-primary/10 text-primary hover:bg-primary/20 cursor-pointer"
                    onClick={() => handleRemoveHashtag(tag)}
                  >
                    #{tag}
                    <X className="w-3 h-3" />
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
            <Button variant="ghost" size="sm" className="text-muted-foreground gap-2">
              <Tag className="w-4 h-4" />
              Gắn sản phẩm
            </Button>
            <Button variant="ghost" size="sm" className="text-muted-foreground gap-2">
              <Users className="w-4 h-4" />
              Tag bạn bè
            </Button>
            <Button variant="ghost" size="sm" className="text-muted-foreground gap-2">
              <Smile className="w-4 h-4" />
              Cảm xúc
            </Button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 pt-0 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            Hủy
          </Button>
          <Button
            onClick={handlePost}
            disabled={!content.trim() || isPosting}
            className="gradient-hero border-0 gap-2 min-w-[140px]"
          >
            {isPosting ? (
              <>
                <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                Đang đăng...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Đăng bài
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Reusable content textarea
const PostContent = ({
  content,
  setContent,
  placeholder,
}: {
  content: string;
  setContent: (value: string) => void;
  placeholder: string;
}) => (
  <div className="flex gap-3">
    <div className="relative flex-shrink-0">
      <img
        src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop"
        alt="Your avatar"
        className="w-12 h-12 rounded-full object-cover ring-2 ring-primary/20"
      />
      <span className="absolute -bottom-1 -right-1 text-sm">🌱</span>
    </div>
    <Textarea
      placeholder={placeholder}
      value={content}
      onChange={(e) => setContent(e.target.value)}
      className="min-h-[120px] resize-none border-0 bg-muted/30 focus-visible:ring-1 focus-visible:ring-primary/50 text-base placeholder:text-muted-foreground/60 rounded-xl"
    />
  </div>
);

export default CreatePostModal;
