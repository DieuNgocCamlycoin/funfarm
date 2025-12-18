import { useState, useRef, useEffect } from "react";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  Loader2,
  Download,
  Leaf,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { uploadToR2 } from "@/lib/r2Upload";
import ProductPostForm from "./ProductPostForm";

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPost?: (post: any) => void;
  initialTab?: string;
}

const postTypes = [
  { id: "post", label: "Bài viết", icon: Sparkles, color: "text-primary" },
  { id: "product", label: "Bán nông sản", icon: Leaf, color: "text-green-600" },
  { id: "photo", label: "Ảnh/Video", icon: Image, color: "text-blue-500" },
  { id: "live", label: "Livestream", icon: Radio, color: "text-destructive" },
];

const DRAFT_STORAGE_KEY = "fun_farm_post_draft";

interface PostDraft {
  content: string;
  postType: string;
  images: string[];
  location: string;
  hashtags: string[];
  savedAt: number;
}

const CreatePostModal = ({ isOpen, onClose, onPost, initialTab = "post" }: CreatePostModalProps) => {
  const { user, profile } = useAuth();
  const [content, setContent] = useState("");
  const [postType, setPostType] = useState(initialTab);
  const [images, setImages] = useState<string[]>([]);
  const [uploadingImages, setUploadingImages] = useState<File[]>([]);
  const [location, setLocation] = useState("");
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [newHashtag, setNewHashtag] = useState("");
  const [isPosting, setIsPosting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isInitialLoad = useRef(true);

  // Load draft from localStorage when modal opens
  useEffect(() => {
    if (isOpen && isInitialLoad.current) {
      const savedDraft = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (savedDraft) {
        try {
          const draft: PostDraft = JSON.parse(savedDraft);
          // Only restore if draft is less than 24 hours old
          if (Date.now() - draft.savedAt < 24 * 60 * 60 * 1000) {
            setContent(draft.content || "");
            setPostType(draft.postType || initialTab);
            setImages(draft.images || []);
            setLocation(draft.location || "");
            setHashtags(draft.hashtags || []);
            setHasDraft(true);
            toast.info("Đã khôi phục bản nháp bài viết!", { duration: 3000 });
          } else {
            localStorage.removeItem(DRAFT_STORAGE_KEY);
          }
        } catch (e) {
          localStorage.removeItem(DRAFT_STORAGE_KEY);
        }
      }
      isInitialLoad.current = false;
    }
  }, [isOpen, initialTab]);

  // Auto-save draft to localStorage
  useEffect(() => {
    if (!isOpen || isInitialLoad.current) return;
    
    const hasContent = content.trim() || images.length > 0 || location.trim() || hashtags.length > 0;
    
    if (hasContent) {
      const draft: PostDraft = {
        content,
        postType,
        images,
        location,
        hashtags,
        savedAt: Date.now(),
      };
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
      setHasDraft(true);
    } else if (hasDraft) {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
      setHasDraft(false);
    }
  }, [content, postType, images, location, hashtags, isOpen, hasDraft]);

  // Reset postType when initialTab changes
  useEffect(() => {
    if (!isInitialLoad.current) {
      setPostType(initialTab);
    }
  }, [initialTab]);

  // Clear draft function
  const clearDraft = () => {
    localStorage.removeItem(DRAFT_STORAGE_KEY);
    setHasDraft(false);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !user?.id) return;

    setIsUploading(true);
    const newImages: string[] = [];

    try {
      for (let i = 0; i < files.length && images.length + newImages.length < 80; i++) {
        const file = files[i];
        
        // Check file size - max 100MB for videos, 20MB for images
        const isVideo = file.type.startsWith('video/');
        const maxSize = isVideo ? 100 * 1024 * 1024 : 20 * 1024 * 1024; // 100MB or 20MB
        
        if (file.size > maxSize) {
          toast.error(`${file.name} quá lớn. Tối đa ${isVideo ? '100MB' : '20MB'}!`);
          continue;
        }
        
        // Check video duration (max 60s)
        if (isVideo) {
          const duration = await getVideoDuration(file);
          if (duration > 60) {
            toast.error(`Video ${file.name} dài quá 60 giây!`);
            continue;
          }
        }
        
        // Upload to R2 via edge function
        const result = await uploadToR2(file, "posts");
        
        if (result.success && result.url) {
          newImages.push(result.url);
        } else {
          throw new Error(result.error || "Upload failed");
        }
      }

      if (newImages.length > 0) {
        setImages([...images, ...newImages]);
        const videoCount = newImages.filter(url => 
          url.toLowerCase().includes('.mp4') || 
          url.toLowerCase().includes('.webm') ||
          url.toLowerCase().includes('.mov')
        ).length;
        const imageCount = newImages.length - videoCount;
        
        let msg = '';
        if (imageCount > 0 && videoCount > 0) {
          msg = `Đã tải lên ${imageCount} ảnh và ${videoCount} video!`;
        } else if (videoCount > 0) {
          msg = `Đã tải lên ${videoCount} video!`;
        } else {
          msg = `Đã tải lên ${imageCount} ảnh!`;
        }
        toast.success(msg);
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Có lỗi khi tải lên. Vui lòng thử lại!');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Get video duration helper
  const getVideoDuration = (file: File): Promise<number> => {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        window.URL.revokeObjectURL(video.src);
        resolve(video.duration);
      };
      video.onerror = () => {
        resolve(0);
      };
      video.src = URL.createObjectURL(file);
    });
  };

  // Check if URL is video
  const isVideoUrl = (url: string): boolean => {
    const lowerUrl = url.toLowerCase();
    return lowerUrl.includes('.mp4') || lowerUrl.includes('.webm') || lowerUrl.includes('.mov');
  };

  const handleRemoveImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const handleDownloadImage = async (imageUrl: string, index: number) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `image_${index + 1}.jpg`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Đã tải ảnh về thiết bị!');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Có lỗi khi tải ảnh');
    }
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
    if (!content.trim() || !user?.id) return;

    setIsPosting(true);
    
    try {
      // Check content with AI before posting
      const checkResponse = await supabase.functions.invoke('check-content', {
        body: { content: content.trim(), type: 'post' }
      });

      if (checkResponse.data && !checkResponse.data.isValid) {
        toast.error(checkResponse.data.reason || 'Nội dung không phù hợp với cộng đồng FUN FARM ❤️', { 
          duration: 4000 
        });
        setIsPosting(false);
        return;
      }

      const { data, error } = await supabase
        .from('posts')
        .insert({
          author_id: user.id,
          content: content.trim(),
          images: images.length > 0 ? images : null,
          location: location || null,
          hashtags: hashtags.length > 0 ? hashtags : null,
          post_type: postType,
        })
        .select()
        .single();

      if (error) throw error;

      // Trigger adds +10,000 CAMLY to pending_reward
      toast.success("Đã đăng bài viết thành công! +10.000 CAMLY 🎉", { duration: 3000 });
      onPost?.(data);
      handleReset();
      onClose();
    } catch (error) {
      console.error('Error creating post:', error);
      toast.error("Có lỗi khi đăng bài. Vui lòng thử lại!");
    } finally {
      setIsPosting(false);
    }
  };

  const handleReset = () => {
    setContent("");
    setImages([]);
    setLocation("");
    setHashtags([]);
    setPostType("post");
    clearDraft();
    isInitialLoad.current = true;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full h-full sm:w-auto sm:h-auto sm:max-w-2xl sm:max-h-[90vh] p-0 gap-0 bg-gradient-to-br from-card via-card to-primary/5 border-primary/20 flex flex-col overflow-hidden">
        {/* Header with gradient - fixed */}
        <DialogHeader className="p-4 sm:p-6 pb-3 sm:pb-4 bg-gradient-to-r from-primary/10 via-secondary/10 to-accent/10 border-b border-border flex-shrink-0">
          <DialogTitle className="flex items-center gap-3 font-display text-lg sm:text-xl">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-primary-foreground" />
            </div>
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Tạo Bài Viết Mới
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto overscroll-contain">
          <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
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
                profile={profile}
              />
            </TabsContent>

            {/* Product Post - Bán nông sản */}
            <TabsContent value="product" className="mt-4">
              {user?.id && (
                <ProductPostForm
                  userId={user.id}
                  onSuccess={() => {
                    onPost?.({});
                    handleReset();
                    onClose();
                  }}
                  onCancel={onClose}
                />
              )}
            </TabsContent>

            <TabsContent value="photo" className="space-y-4 mt-4">
              <PostContent
                content={content}
                setContent={setContent}
                placeholder="Chia sẻ hình ảnh sản phẩm tươi ngon... 📸"
                profile={profile}
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
                profile={profile}
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
                {images.length}/80
              </span>
            </div>

            {images.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {images.map((img, index) => (
                  <div key={index} className="relative aspect-square rounded-xl overflow-hidden group">
                    {isVideoUrl(img) ? (
                      <div className="w-full h-full bg-muted flex flex-col items-center justify-center">
                        <Video className="w-8 h-8 text-primary mb-1" />
                        <span className="text-xs text-muted-foreground">Video</span>
                      </div>
                    ) : (
                      <img
                        src={img}
                        alt={`Upload ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    )}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button
                        onClick={() => handleDownloadImage(img, index)}
                        className="w-8 h-8 bg-white/90 rounded-full flex items-center justify-center hover:bg-white transition-colors"
                        title="Tải về"
                      >
                        <Download className="w-4 h-4 text-foreground" />
                      </button>
                      <button
                        onClick={() => handleRemoveImage(index)}
                        className="w-8 h-8 bg-white/90 rounded-full flex items-center justify-center hover:bg-white transition-colors"
                        title="Xóa"
                      >
                        <X className="w-4 h-4 text-foreground" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />

            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={images.length >= 80 || isUploading}
              className="w-full border-dashed border-2 gap-2 hover:border-primary hover:bg-primary/5"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Đang tải lên...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Thêm ảnh/video từ thiết bị
                </>
              )}
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              Ảnh tối đa 20MB • Video tối đa 100MB/60 giây
            </p>
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

          {/* Quick Actions - hide for product tab */}
          {postType !== "product" && (
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
        )}
          </div>
        </div>

        {/* Footer - sticky at bottom for mobile, hide for product tab (has its own buttons) */}
        {postType !== "product" && (
          <div className="flex-shrink-0 p-4 sm:p-6 pt-3 sm:pt-4 border-t border-border bg-card/95 backdrop-blur-sm flex justify-between sm:justify-end gap-3">
            <Button variant="outline" onClick={onClose} className="flex-1 sm:flex-none">
              Hủy
            </Button>
            <Button
              onClick={handlePost}
              disabled={!content.trim() || isPosting}
              className="gradient-hero border-0 gap-2 flex-1 sm:flex-none sm:min-w-[140px]"
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
        )}
      </DialogContent>
    </Dialog>
  );
};

// Reusable content textarea
const PostContent = ({
  content,
  setContent,
  placeholder,
  profile,
}: {
  content: string;
  setContent: (value: string) => void;
  placeholder: string;
  profile: any;
}) => (
  <div className="flex gap-3">
    <div className="relative flex-shrink-0">
      <Avatar className="w-12 h-12 ring-2 ring-primary/20">
        <AvatarImage src={profile?.avatar_url || undefined} />
        <AvatarFallback>
          {profile?.display_name?.[0] || '🌱'}
        </AvatarFallback>
      </Avatar>
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