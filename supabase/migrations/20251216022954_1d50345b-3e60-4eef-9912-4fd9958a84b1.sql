-- Drop and recreate get_feed_posts function with share post fields
DROP FUNCTION IF EXISTS public.get_feed_posts(integer, integer);

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
   price_camly bigint, 
   price_vnd bigint, 
   quantity_kg numeric, 
   location_address text, 
   location_lat numeric, 
   location_lng numeric, 
   delivery_options text[], 
   commitments text[], 
   post_type text, 
   author_is_good_heart boolean,
   original_post_id uuid,
   share_comment text
 )
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    COALESCE(pr.is_good_heart, false) AS author_is_good_heart,
    p.original_post_id,
    p.share_comment
  FROM posts p
  LEFT JOIN profiles pr ON p.author_id = pr.id
  ORDER BY 
    -- Good heart users first within recent posts (last 24h)
    CASE WHEN p.created_at > now() - interval '24 hours' AND COALESCE(pr.is_good_heart, false) THEN 0 ELSE 1 END,
    p.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$function$;