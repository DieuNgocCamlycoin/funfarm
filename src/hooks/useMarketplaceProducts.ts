import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { MarketplaceProduct, MarketplaceFilters, ProductCategory } from '@/types/marketplace';
import { useAuth } from '@/hooks/useAuth';

interface UseMarketplaceProductsReturn {
  products: MarketplaceProduct[];
  loading: boolean;
  error: string | null;
  totalCount: number;
  productCounts: Record<string, number>;
  loadMore: () => void;
  refresh: () => void;
  hasMore: boolean;
}

const PAGE_SIZE = 20;

// Calculate distance between two coordinates (Haversine formula)
function calculateDistance(
  lat1: number, lon1: number, 
  lat2: number, lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function useMarketplaceProducts(
  filters: MarketplaceFilters,
  userLocation?: { lat: number; lng: number }
): UseMarketplaceProductsReturn {
  const { user } = useAuth();
  const [products, setProducts] = useState<MarketplaceProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [productCounts, setProductCounts] = useState<Record<string, number>>({});
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  // Fetch category counts
  const fetchCategoryCounts = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('category')
        .eq('is_product_post', true)
        .eq('product_status', 'active');

      if (error) throw error;

      const counts: Record<string, number> = {};
      data?.forEach((post) => {
        if (post.category) {
          counts[post.category] = (counts[post.category] || 0) + 1;
        }
      });
      setProductCounts(counts);
    } catch (err) {
      console.error('Error fetching category counts:', err);
    }
  }, []);

  // Fetch products
  const fetchProducts = useCallback(async (pageNum: number, append: boolean = false) => {
    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('posts')
        .select(`
          id,
          author_id,
          product_name,
          content,
          images,
          price_camly,
          price_vnd,
          quantity_kg,
          category,
          product_status,
          location_address,
          location_lat,
          location_lng,
          commitments,
          delivery_options,
          created_at
        `, { count: 'exact' })
        .eq('is_product_post', true)
        .in('product_status', ['active', 'sold_out'])
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters.category) {
        query = query.eq('category', filters.category);
      }

      if (filters.search) {
        query = query.ilike('product_name', `%${filters.search}%`);
      }

      if (filters.minPrice !== undefined) {
        query = query.gte('price_camly', filters.minPrice);
      }

      if (filters.maxPrice !== undefined) {
        query = query.lte('price_camly', filters.maxPrice);
      }

      if (filters.commitments && filters.commitments.length > 0) {
        query = query.overlaps('commitments', filters.commitments);
      }

      // Pagination
      const from = pageNum * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      query = query.range(from, to);

      const { data: postsData, error: postsError, count } = await query;

      if (postsError) throw postsError;

      // Get author profiles
      const authorIds = [...new Set(postsData?.map(p => p.author_id) || [])];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url, is_verified, is_good_heart, reputation_score')
        .in('id', authorIds);

      const profilesMap = new Map(profilesData?.map(p => [p.id, p]));

      // Get saved products for current user
      let savedProductIds: Set<string> = new Set();
      if (user?.id) {
        const { data: savedData } = await supabase
          .from('saved_products')
          .select('post_id')
          .eq('user_id', user.id);
        savedProductIds = new Set(savedData?.map(s => s.post_id) || []);
      }

      // Get average ratings
      const postIds = postsData?.map(p => p.id) || [];
      const { data: reviewsData } = await supabase
        .from('product_reviews')
        .select('post_id, rating')
        .in('post_id', postIds);

      const ratingsMap = new Map<string, { total: number; count: number }>();
      reviewsData?.forEach(review => {
        const current = ratingsMap.get(review.post_id) || { total: 0, count: 0 };
        ratingsMap.set(review.post_id, {
          total: current.total + review.rating,
          count: current.count + 1,
        });
      });

      // Transform data
      let transformedProducts: MarketplaceProduct[] = (postsData || []).map(post => {
        const author = profilesMap.get(post.author_id);
        const ratingInfo = ratingsMap.get(post.id);
        
        let distance_km: number | undefined;
        if (userLocation && post.location_lat && post.location_lng) {
          distance_km = calculateDistance(
            userLocation.lat, userLocation.lng,
            post.location_lat, post.location_lng
          );
        }

        return {
          ...post,
          category: post.category as ProductCategory | null,
          product_status: (post.product_status || 'active') as MarketplaceProduct['product_status'],
          commitments: post.commitments || [],
          delivery_options: post.delivery_options || [],
          author: author ? {
            id: author.id,
            display_name: author.display_name || '',
            avatar_url: author.avatar_url || '',
            is_verified: author.is_verified,
            is_good_heart: author.is_good_heart,
            reputation_score: author.reputation_score,
          } : undefined,
          average_rating: ratingInfo ? ratingInfo.total / ratingInfo.count : undefined,
          review_count: ratingInfo?.count,
          distance_km,
          is_saved: savedProductIds.has(post.id),
        };
      });

      // Apply distance filter
      if (filters.distance && filters.distance > 0 && userLocation) {
        transformedProducts = transformedProducts.filter(
          p => p.distance_km !== undefined && p.distance_km <= filters.distance!
        );
      }

      // Apply sorting
      if (filters.sortBy) {
        switch (filters.sortBy) {
          case 'price_asc':
            transformedProducts.sort((a, b) => (a.price_camly || 0) - (b.price_camly || 0));
            break;
          case 'price_desc':
            transformedProducts.sort((a, b) => (b.price_camly || 0) - (a.price_camly || 0));
            break;
          case 'nearest':
            transformedProducts.sort((a, b) => 
              (a.distance_km ?? Infinity) - (b.distance_km ?? Infinity)
            );
            break;
          case 'rating':
            transformedProducts.sort((a, b) => 
              (b.average_rating ?? 0) - (a.average_rating ?? 0)
            );
            break;
        }
      }

      if (append) {
        setProducts(prev => [...prev, ...transformedProducts]);
      } else {
        setProducts(transformedProducts);
      }

      setTotalCount(count || 0);
      setHasMore((count || 0) > (pageNum + 1) * PAGE_SIZE);
    } catch (err) {
      console.error('Error fetching products:', err);
      setError('Không thể tải sản phẩm. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }, [filters, userLocation, user?.id]);

  // Initial load
  useEffect(() => {
    setPage(0);
    fetchProducts(0, false);
    fetchCategoryCounts();
  }, [filters, fetchProducts, fetchCategoryCounts]);

  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchProducts(nextPage, true);
    }
  }, [loading, hasMore, page, fetchProducts]);

  const refresh = useCallback(() => {
    setPage(0);
    fetchProducts(0, false);
    fetchCategoryCounts();
  }, [fetchProducts, fetchCategoryCounts]);

  return {
    products,
    loading,
    error,
    totalCount,
    productCounts,
    loadMore,
    refresh,
    hasMore,
  };
}
