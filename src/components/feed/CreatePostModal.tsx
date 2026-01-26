import { useState, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
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
  MapPin,
  Tag,
  Send,
  X,
  Plus,
  Sparkles,
  Hash,
  Users,
  Smile,
  Loader2,
  Download,
  Leaf,
  Globe,
  ChevronDown,
  MoreHorizontal,
  Phone,
  Type,
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
  { id: "post", label: "Chia sẻ", icon: Sparkles, color: "text-primary" },
  { id: "product", label: "Bán hàng", icon: Leaf, color: "text-green-600" },
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
  const [location, setLocation] = useState("");
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [newHashtag, setNewHashtag] = useState("");
  const [isPosting, setIsPosting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);
  const [showLocationInput, setShowLocationInput] = useState(false);
  const [showHashtagInput, setShowHashtagInput] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isInitialLoad = useRef(true);

  // Get first name for placeholder
  const firstName = profile?.display_name?.split(' ').pop() || profile?.display_name || '';

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
        body: { 
          content: content.trim(), 
          type: 'post',
          userId: user.id,
          images: images.length > 0 ? images : undefined
        }
      });

      if (checkResponse.data && !checkResponse.data.isValid) {
        toast.error(
          <div>
            <p>{checkResponse.data.reason || 'Nội dung đang được kiểm tra'}</p>
            <p className="text-xs opacity-80 mt-1">Admin sẽ review lại trong 24h ❤️</p>
          </div>,
          { duration: 5000 }
        );
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
      // Reward depends on content quality (>100 chars + media = 20,000 CLC via trigger)
      const hasMedia = images.length > 0;
      const hasQualityContent = content.trim().length > 100;
      const rewardMsg = hasMedia && hasQualityContent 
        ? "Đã đăng bài viết thành công! +20.000 CAMLY 🎉" 
        : "Đã đăng bài viết thành công! 🌱";
      toast.success(rewardMsg, { duration: 3000 });
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
    setShowLocationInput(false);
    setShowHashtagInput(false);
    clearDraft();
    isInitialLoad.current = true;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className={cn(
          "p-0 gap-0 border bg-card flex flex-col overflow-hidden",
          // Mobile: full screen
          "w-full h-full max-w-none rounded-none",
          "fixed left-0 top-0 right-0 bottom-0",
          // Desktop: centered modal
          "sm:w-[500px] sm:h-auto sm:max-h-[90vh] sm:rounded-xl",
          "sm:left-1/2 sm:top-1/2 sm:right-auto sm:bottom-auto",
          "sm:-translate-x-1/2 sm:-translate-y-1/2",
          "sm:shadow-2xl"
        )}
      >
        {/* Header - Facebook Style */}
        <div className="flex items-center justify-center p-4 border-b border-border relative flex-shrink-0">
          <h2 className="text-xl font-bold text-foreground">Tạo bài viết</h2>
        </div>

        {/* User Info Section */}
        <div className="px-4 py-3 flex items-center gap-3 border-b border-border flex-shrink-0">
          <Avatar className="w-10 h-10">
            <AvatarImage src={profile?.avatar_url || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
              {profile?.display_name?.[0] || '🌱'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <p className="font-semibold text-foreground text-sm">
              {profile?.display_name || 'Người dùng'}
            </p>
            <button className="flex items-center gap-1 text-xs text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-md mt-0.5 hover:bg-muted transition-colors">
              <Globe className="w-3 h-3" />
              <span>Công khai</span>
              <ChevronDown className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {/* Post Type Tabs */}
          <div className="px-4 pt-3">
            <Tabs value={postType} onValueChange={setPostType}>
              <TabsList className="grid grid-cols-2 bg-muted/50 w-full">
                {postTypes.map((type) => (
                  <TabsTrigger
                    key={type.id}
                    value={type.id}
                    className={cn(
                      "gap-2 py-2.5 data-[state=active]:bg-background data-[state=active]:shadow-sm text-sm",
                      type.color
                    )}
                  >
                    <type.icon className="w-4 h-4" />
                    <span className="font-medium">{type.label}</span>
                  </TabsTrigger>
                ))}
              </TabsList>

              {/* Content for Share tab */}
              <TabsContent value="post" className="mt-3 space-y-3">
                {/* Textarea - Facebook Style */}
                <div className="relative">
                  <Textarea
                    placeholder={firstName ? `${firstName} ơi, bạn đang nghĩ gì thế?` : "Bạn đang nghĩ gì thế?"}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="min-h-[120px] resize-none border-0 bg-transparent focus-visible:ring-0 text-lg placeholder:text-muted-foreground/60 placeholder:italic p-0"
                  />
                  {/* Text styling icons */}
                  <div className="absolute right-0 bottom-0 flex flex-col gap-1">
                    <button className="w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground">
                      <Type className="w-5 h-5" />
                    </button>
                    <button className="w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center">
                      <span className="text-xl">😊</span>
                    </button>
                  </div>
                </div>

                {/* Uploaded Images/Videos Grid */}
                {images.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {images.map((img, index) => (
                      <div key={index} className="relative aspect-square rounded-lg overflow-hidden group">
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
                            className="w-7 h-7 bg-white/90 rounded-full flex items-center justify-center hover:bg-white transition-colors"
                            title="Tải về"
                          >
                            <Download className="w-3.5 h-3.5 text-foreground" />
                          </button>
                          <button
                            onClick={() => handleRemoveImage(index)}
                            className="w-7 h-7 bg-white/90 rounded-full flex items-center justify-center hover:bg-white transition-colors"
                            title="Xóa"
                          >
                            <X className="w-3.5 h-3.5 text-foreground" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Location Input - Collapsible */}
                {showLocationInput && (
                  <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg">
                    <MapPin className="w-4 h-4 text-destructive flex-shrink-0" />
                    <Input
                      placeholder="Thêm vị trí..."
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="border-0 bg-transparent h-8 p-0 focus-visible:ring-0"
                    />
                    <button onClick={() => setShowLocationInput(false)} className="text-muted-foreground hover:text-foreground">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Hashtags Input - Collapsible */}
                {showHashtagInput && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg">
                      <Hash className="w-4 h-4 text-primary flex-shrink-0" />
                      <Input
                        placeholder="Thêm hashtag..."
                        value={newHashtag}
                        onChange={(e) => setNewHashtag(e.target.value)}
                        onKeyPress={(e) => e.key === "Enter" && handleAddHashtag()}
                        className="border-0 bg-transparent h-8 p-0 focus-visible:ring-0"
                      />
                      <button onClick={handleAddHashtag} className="text-primary hover:text-primary/80">
                        <Plus className="w-4 h-4" />
                      </button>
                      <button onClick={() => setShowHashtagInput(false)} className="text-muted-foreground hover:text-foreground">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    {hashtags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {hashtags.map((tag) => (
                          <Badge
                            key={tag}
                            variant="secondary"
                            className="gap-1 bg-primary/10 text-primary hover:bg-primary/20 cursor-pointer text-xs"
                            onClick={() => handleRemoveHashtag(tag)}
                          >
                            #{tag}
                            <X className="w-2.5 h-2.5" />
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>

              {/* Product Post - Bán nông sản */}
              <TabsContent value="product" className="mt-3">
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
            </Tabs>
          </div>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>

        {/* Bottom Toolbar - Facebook Style (Only for post tab) */}
        {postType !== "product" && (
          <div className="flex-shrink-0 border-t border-border">
            {/* Add to post toolbar */}
            <div className="px-4 py-3 flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">Thêm vào bài viết của bạn</span>
              <div className="flex items-center gap-1">
                {/* Photo/Video - Green */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="w-9 h-9 rounded-full hover:bg-muted flex items-center justify-center transition-colors disabled:opacity-50"
                  title="Ảnh/Video"
                >
                  {isUploading ? (
                    <Loader2 className="w-5 h-5 text-green-500 animate-spin" />
                  ) : (
                    <Image className="w-5 h-5 text-green-500" />
                  )}
                </button>
                
                {/* Tag friends - Blue */}
                <button
                  className="w-9 h-9 rounded-full hover:bg-muted flex items-center justify-center transition-colors"
                  title="Gắn thẻ bạn bè"
                >
                  <Users className="w-5 h-5 text-blue-500" />
                </button>
                
                {/* Feeling - Yellow */}
                <button
                  className="w-9 h-9 rounded-full hover:bg-muted flex items-center justify-center transition-colors"
                  title="Cảm xúc"
                >
                  <Smile className="w-5 h-5 text-yellow-500" />
                </button>
                
                {/* Location - Red */}
                <button
                  onClick={() => setShowLocationInput(!showLocationInput)}
                  className={cn(
                    "w-9 h-9 rounded-full hover:bg-muted flex items-center justify-center transition-colors",
                    showLocationInput && "bg-muted"
                  )}
                  title="Vị trí"
                >
                  <MapPin className="w-5 h-5 text-destructive" />
                </button>
                
                {/* Hashtag - Primary */}
                <button
                  onClick={() => setShowHashtagInput(!showHashtagInput)}
                  className={cn(
                    "w-9 h-9 rounded-full hover:bg-muted flex items-center justify-center transition-colors",
                    showHashtagInput && "bg-muted"
                  )}
                  title="Hashtag"
                >
                  <Hash className="w-5 h-5 text-primary" />
                </button>
                
                {/* More options */}
                <button
                  className="w-9 h-9 rounded-full hover:bg-muted flex items-center justify-center transition-colors"
                  title="Thêm"
                >
                  <MoreHorizontal className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>
            </div>

            {/* Post button */}
            <div className="px-4 pb-4">
              <Button
                onClick={handlePost}
                disabled={!content.trim() || isPosting}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-2.5"
              >
                {isPosting ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Đang đăng...
                  </span>
                ) : (
                  "Đăng"
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CreatePostModal;
