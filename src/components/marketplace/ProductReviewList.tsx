// 🌱 Divine Mantra: "Farmers rich, Eaters happy. Farm to Table, Fair & Fast."
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Star, MessageSquare, Image as ImageIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { ProductReview, ReviewSummary } from '@/types/marketplace';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';

interface ProductReviewListProps {
  postId: string;
}

export const ProductReviewList = ({ postId }: ProductReviewListProps) => {
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [summary, setSummary] = useState<ReviewSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    fetchReviews();
  }, [postId]);

  const fetchReviews = async () => {
    try {
      // Fetch reviews
      const { data: reviewsData, error } = await supabase
        .from('product_reviews')
        .select('*')
        .eq('post_id', postId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (reviewsData && reviewsData.length > 0) {
        // Fetch reviewer profiles
        const reviewerIds = [...new Set(reviewsData.map(r => r.reviewer_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, display_name, avatar_url')
          .in('id', reviewerIds);

        const reviewsWithProfiles: ProductReview[] = reviewsData.map(review => ({
          ...review,
          reviewer: profiles?.find(p => p.id === review.reviewer_id),
        }));

        setReviews(reviewsWithProfiles);

        // Calculate summary
        const totalReviews = reviewsData.length;
        const avgRating = reviewsData.reduce((sum, r) => sum + r.rating, 0) / totalReviews;
        const breakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } as ReviewSummary['rating_breakdown'];
        
        reviewsData.forEach(r => {
          if (r.rating >= 1 && r.rating <= 5) {
            breakdown[r.rating as 1 | 2 | 3 | 4 | 5]++;
          }
        });

        setSummary({
          average_rating: avgRating,
          total_reviews: totalReviews,
          rating_breakdown: breakdown,
        });
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="animate-pulse">
        <CardContent className="p-6">
          <div className="h-32 bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  if (!summary || reviews.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-6 text-center">
          <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">Chưa có đánh giá nào cho sản phẩm này</p>
          <p className="text-sm text-muted-foreground mt-1">
            Hãy là người đầu tiên đánh giá sau khi mua hàng!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Star className="w-5 h-5 text-yellow-500" />
          Đánh giá từ người mua ({summary.total_reviews})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Rating Summary */}
        <div className="flex gap-6 p-4 bg-muted/50 rounded-lg">
          {/* Average Rating */}
          <div className="text-center">
            <div className="text-4xl font-bold text-primary">
              {summary.average_rating.toFixed(1)}
            </div>
            <div className="flex justify-center mt-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star 
                  key={star}
                  className={`w-4 h-4 ${
                    star <= Math.round(summary.average_rating)
                      ? 'text-yellow-400 fill-yellow-400'
                      : 'text-gray-300'
                  }`}
                />
              ))}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {summary.total_reviews} đánh giá
            </p>
          </div>

          {/* Rating Breakdown */}
          <div className="flex-1 space-y-1.5">
            {[5, 4, 3, 2, 1].map((rating) => {
              const count = summary.rating_breakdown[rating as 1 | 2 | 3 | 4 | 5];
              const percentage = (count / summary.total_reviews) * 100;
              
              return (
                <div key={rating} className="flex items-center gap-2 text-sm">
                  <span className="w-3">{rating}</span>
                  <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                  <Progress value={percentage} className="flex-1 h-2" />
                  <span className="w-8 text-muted-foreground text-xs">
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Reviews List */}
        <div className="space-y-4 divide-y">
          {reviews.map((review) => (
            <div key={review.id} className="pt-4 first:pt-0">
              {/* Reviewer Info */}
              <div className="flex items-start gap-3">
                <Avatar className="w-10 h-10">
                  <AvatarImage src={review.reviewer?.avatar_url || ''} />
                  <AvatarFallback>
                    {review.reviewer?.display_name?.[0] || '👤'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-sm">
                      {review.reviewer?.display_name || 'Người mua'}
                    </p>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(review.created_at), {
                        addSuffix: true,
                        locale: vi,
                      })}
                    </span>
                  </div>
                  
                  {/* Stars */}
                  <div className="flex mt-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star 
                        key={star}
                        className={`w-3.5 h-3.5 ${
                          star <= review.rating
                            ? 'text-yellow-400 fill-yellow-400'
                            : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>

                  {/* Comment */}
                  {review.comment && (
                    <p className="text-sm mt-2 text-foreground/90">
                      {review.comment}
                    </p>
                  )}

                  {/* Images */}
                  {review.images && review.images.length > 0 && (
                    <div className="flex gap-2 mt-3">
                      {review.images.map((img, idx) => (
                        <button
                          key={idx}
                          onClick={() => setSelectedImage(img)}
                          className="relative w-16 h-16 rounded-lg overflow-hidden hover:opacity-80 transition-opacity"
                        >
                          <img 
                            src={img} 
                            alt={`Review ${idx + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>

      {/* Image Modal */}
      {selectedImage && (
        <div 
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <img 
            src={selectedImage} 
            alt="Review"
            className="max-w-full max-h-full rounded-lg"
          />
        </div>
      )}
    </Card>
  );
};

export default ProductReviewList;
