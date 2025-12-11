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
import {
  Image,
  MapPin,
  Send,
  X,
  Plus,
  Hash,
  Loader2,
  Download,
  Pencil,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { uploadToR2 } from "@/lib/r2Upload";
import { Post } from "@/types/feed";

interface EditPostModalProps {
  isOpen: boolean;
  onClose: () => void;
  post: Post;
  onUpdate?: (updatedPost: any) => void;
}

const EditPostModal = ({ isOpen, onClose, post, onUpdate }: EditPostModalProps) => {
  const [content, setContent] = useState(post.content);
  const [images, setImages] = useState<string[]>(post.images || []);
  const [location, setLocation] = useState(post.location || "");
  const [hashtags, setHashtags] = useState<string[]>(post.hashtags || []);
  const [newHashtag, setNewHashtag] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    setIsUploading(true);
    const newImages: string[] = [];

    try {
      for (let i = 0; i < files.length && images.length + newImages.length < 10; i++) {
        const file = files[i];
        const result = await uploadToR2(file, "posts");
        
        if (result.success && result.url) {
          newImages.push(result.url);
        } else {
          throw new Error(result.error || "Upload failed");
        }
      }

      setImages([...images, ...newImages]);
      toast.success(`Đã thêm ${newImages.length} ảnh!`);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Có lỗi khi tải ảnh lên. Vui lòng thử lại!');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
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

  const handleSave = async () => {
    if (!content.trim()) return;

    setIsSaving(true);
    
    try {
      const { data, error } = await supabase
        .from('posts')
        .update({
          content: content.trim(),
          images: images.length > 0 ? images : null,
          location: location || null,
          hashtags: hashtags.length > 0 ? hashtags : null,
        })
        .eq('id', post.id)
        .select()
        .single();

      if (error) throw error;

      toast.success("Đã cập nhật bài viết! ✨");
      onUpdate?.(data);
      onClose();
    } catch (error) {
      console.error('Error updating post:', error);
      toast.error("Có lỗi khi cập nhật. Vui lòng thử lại!");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto p-0 gap-0 bg-gradient-to-br from-card via-card to-primary/5 border-primary/20">
        {/* Header */}
        <DialogHeader className="p-6 pb-4 bg-gradient-to-r from-primary/10 via-secondary/10 to-accent/10 border-b border-border">
          <DialogTitle className="flex items-center gap-3 font-display text-xl">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <Pencil className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Chỉnh Sửa Bài Viết
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="p-6 space-y-6">
          {/* Content */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Nội dung</label>
            <Textarea
              placeholder="Nội dung bài viết..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[120px] resize-none border-0 bg-muted/30 focus-visible:ring-1 focus-visible:ring-primary/50 text-base rounded-xl"
            />
          </div>

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
              disabled={images.length >= 10 || isUploading}
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
                  Thêm ảnh/video
                </>
              )}
            </Button>
          </div>

          {/* Location */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground flex items-center gap-2">
              <MapPin className="w-4 h-4 text-secondary" />
              Vị trí
            </label>
            <Input
              placeholder="Thêm địa điểm..."
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
                placeholder="#huuco #rausach"
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
        </div>

        {/* Footer */}
        <div className="p-6 pt-0 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            Hủy
          </Button>
          <Button
            onClick={handleSave}
            disabled={!content.trim() || isSaving}
            className="gradient-hero border-0 gap-2 min-w-[140px]"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Đang lưu...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Lưu thay đổi
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditPostModal;
