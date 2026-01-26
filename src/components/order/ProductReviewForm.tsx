// 🌱 Divine Mantra: "Farmers rich, Eaters happy. Farm to Table, Fair & Fast."
import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Star, Upload, X, Loader2, Camera } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Order } from '@/types/marketplace';

interface ProductReviewFormProps {
  order: Order;
  onReviewSubmitted: () => void;
}

export const ProductReviewForm = ({ order, onReviewSubmitted }: ProductReviewFormProps) => {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (images.length + files.length > 3) {
      toast.error('Chỉ được upload tối đa 3 ảnh');
      return;
    }

    setUploading(true);

    try {
      const newImages: string[] = [];
      
      for (const file of Array.from(files)) {
        if (file.size > 5 * 1024 * 1024) {
          toast.error(`Ảnh ${file.name} vượt quá 5MB`);
          continue;
        }

        const fileExt = file.name.split('.').pop();
        const fileName = `review_${order.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
        const filePath = `reviews/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('posts')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('posts')
          .getPublicUrl(filePath);

        if (urlData?.publicUrl) {
          newImages.push(urlData.publicUrl);
        }
      }

      setImages(prev => [...prev, ...newImages]);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Không thể upload ảnh');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error('Vui lòng chọn số sao đánh giá');
      return;
    }

    if (comment.length > 0 && comment.length < 10) {
      toast.error('Nhận xét phải có ít nhất 10 ký tự');
      return;
    }

    if (comment.length > 500) {
      toast.error('Nhận xét không được vượt quá 500 ký tự');
      return;
    }

    setSubmitting(true);

    try {
      const { error } = await supabase
        .from('product_reviews')
        .insert({
          order_id: order.id,
          post_id: order.post_id,
          reviewer_id: order.buyer_id,
          seller_id: order.seller_id,
          rating,
          comment: comment.trim() || null,
          images: images.length > 0 ? images : null,
        });

      if (error) {
        if (error.code === '23505') {
          toast.error('Bạn đã đánh giá đơn hàng này rồi');
        } else {
          throw error;
        }
        return;
      }

      toast.success('Cảm ơn bạn đã đánh giá! 🌟');
      onReviewSubmitted();
    } catch (error) {
      console.error('Submit review error:', error);
      toast.error('Không thể gửi đánh giá');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Star className="w-5 h-5 text-yellow-500" />
          Đánh giá sản phẩm
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Star Rating */}
        <div className="space-y-2">
          <Label>Bạn hài lòng với sản phẩm này không?</Label>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                className="p-1 transition-transform hover:scale-110 active:scale-95"
              >
                <Star 
                  className={`w-8 h-8 transition-colors ${
                    star <= (hoverRating || rating)
                      ? 'text-yellow-400 fill-yellow-400'
                      : 'text-gray-300'
                  }`}
                />
              </button>
            ))}
          </div>
          {rating > 0 && (
            <p className="text-sm text-muted-foreground">
              {rating === 5 && '⭐ Tuyệt vời!'}
              {rating === 4 && '😊 Rất hài lòng'}
              {rating === 3 && '🙂 Bình thường'}
              {rating === 2 && '😕 Chưa hài lòng lắm'}
              {rating === 1 && '😞 Không hài lòng'}
            </p>
          )}
        </div>

        {/* Comment */}
        <div className="space-y-2">
          <Label htmlFor="comment">Nhận xét (tùy chọn)</Label>
          <Textarea
            id="comment"
            placeholder="Chia sẻ trải nghiệm của bạn về sản phẩm..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="min-h-[80px] resize-none"
            maxLength={500}
          />
          <p className="text-xs text-muted-foreground text-right">
            {comment.length}/500
          </p>
        </div>

        {/* Image Upload */}
        <div className="space-y-2">
          <Label>Thêm ảnh (tối đa 3 ảnh)</Label>
          <div className="flex flex-wrap gap-2">
            {images.map((img, idx) => (
              <div key={idx} className="relative w-20 h-20">
                <img 
                  src={img} 
                  alt={`Review ${idx + 1}`}
                  className="w-full h-full object-cover rounded-lg"
                />
                <button
                  type="button"
                  onClick={() => removeImage(idx)}
                  className="absolute -top-2 -right-2 p-1 bg-destructive text-destructive-foreground rounded-full shadow-md"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
            
            {images.length < 3 && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="w-20 h-20 border-2 border-dashed border-muted-foreground/30 rounded-lg flex flex-col items-center justify-center gap-1 hover:border-primary transition-colors disabled:opacity-50"
              >
                {uploading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Camera className="w-5 h-5 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground">Thêm ảnh</span>
                  </>
                )}
              </button>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageUpload}
            className="hidden"
          />
        </div>

        {/* Submit Button */}
        <Button 
          onClick={handleSubmit}
          disabled={rating === 0 || submitting}
          className="w-full gap-2"
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Đang gửi...
            </>
          ) : (
            <>
              <Star className="w-4 h-4" />
              Gửi đánh giá
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

export default ProductReviewForm;
