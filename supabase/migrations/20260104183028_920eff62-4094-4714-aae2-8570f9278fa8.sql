-- Fix get_feed_posts type mismatch for lat/lng (numeric -> double precision)
CREATE OR REPLACE FUNCTION public.get_feed_posts(p_limit integer DEFAULT 10, p_offset integer DEFAULT 0)
RETURNS TABLE(
  id uuid,
  author_id uuid,
  content text,
  images text[],
  video_url text,
  likes_count integer,
  comments_count integer,
  shares_count integer,
  created_at timestamp with time zone,
  location text,
  hashtags text[],
  is_product_post boolean,
  product_name text,
  price_camly numeric,
  price_vnd numeric,
  quantity_kg numeric,
  location_address text,
  location_lat double precision,
  location_lng double precision,
  delivery_options text[],
  commitments text[],
  post_type text,
  author_is_good_heart boolean,
  original_post_id uuid,
  share_comment text,
  gift_receiver_id uuid,
  receiver_approved boolean,
  sender_wallet text,
  receiver_wallet text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
    p.price_camly::numeric,
    p.price_vnd::numeric,
    p.quantity_kg::numeric,
    p.location_address,
    p.location_lat::double precision,
    p.location_lng::double precision,
    p.delivery_options,
    p.commitments,
    p.post_type,
    COALESCE(pr.is_good_heart, false) AS author_is_good_heart,
    p.original_post_id,
    p.share_comment,
    p.gift_receiver_id,
    p.receiver_approved,
    p.sender_wallet,
    p.receiver_wallet
  FROM public.posts p
  LEFT JOIN public.profiles pr ON p.author_id = pr.id
  ORDER BY 
    CASE WHEN p.created_at > now() - interval '24 hours' AND COALESCE(pr.is_good_heart, false) THEN 0 ELSE 1 END,
    p.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_feed_posts(integer, integer) TO anon, authenticated;
