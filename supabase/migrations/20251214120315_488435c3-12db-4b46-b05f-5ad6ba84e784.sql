-- Function to get posts with good heart priority
CREATE OR REPLACE FUNCTION public.get_feed_posts(
  p_limit INTEGER DEFAULT 10,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE(
  id UUID,
  author_id UUID,
  content TEXT,
  images TEXT[],
  video_url TEXT,
  likes_count INTEGER,
  comments_count INTEGER,
  shares_count INTEGER,
  created_at TIMESTAMP WITH TIME ZONE,
  location TEXT,
  hashtags TEXT[],
  is_product_post BOOLEAN,
  product_name TEXT,
  price_camly BIGINT,
  price_vnd BIGINT,
  quantity_kg NUMERIC,
  location_address TEXT,
  location_lat NUMERIC,
  location_lng NUMERIC,
  delivery_options TEXT[],
  commitments TEXT[],
  post_type TEXT,
  author_is_good_heart BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.author_id,
    p.content,
    p.images,
    p.video_url,
    p.likes_count,
    p.comments_count,
    p.shares_count,
    p.created_at,
    p.location,
    p.hashtags,
    p.is_product_post,
    p.product_name,
    p.price_camly,
    p.price_vnd,
    p.quantity_kg,
    p.location_address,
    p.location_lat,
    p.location_lng,
    p.delivery_options,
    p.commitments,
    p.post_type,
    COALESCE(pr.is_good_heart, false) AS author_is_good_heart
  FROM posts p
  LEFT JOIN profiles pr ON p.author_id = pr.id
  ORDER BY 
    -- Good heart users first within recent posts (last 24h)
    CASE WHEN p.created_at > now() - interval '24 hours' AND COALESCE(pr.is_good_heart, false) THEN 0 ELSE 1 END,
    p.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;