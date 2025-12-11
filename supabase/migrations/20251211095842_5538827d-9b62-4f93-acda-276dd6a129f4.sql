-- Add product selling fields to posts table for FUN FARM marketplace
-- These fields support the gentle, loving spirit of FUN FARM

ALTER TABLE public.posts 
ADD COLUMN IF NOT EXISTS is_product_post boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS product_name text,
ADD COLUMN IF NOT EXISTS price_camly bigint,
ADD COLUMN IF NOT EXISTS price_vnd bigint,
ADD COLUMN IF NOT EXISTS quantity_kg decimal(10,2),
ADD COLUMN IF NOT EXISTS location_address text,
ADD COLUMN IF NOT EXISTS location_lat decimal(10,7),
ADD COLUMN IF NOT EXISTS location_lng decimal(10,7),
ADD COLUMN IF NOT EXISTS delivery_options text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS commitments text[] DEFAULT '{}';

-- Add comments for documentation
COMMENT ON COLUMN public.posts.is_product_post IS 'True if this is a product selling post';
COMMENT ON COLUMN public.posts.product_name IS 'Name of the agricultural product';
COMMENT ON COLUMN public.posts.price_camly IS 'Price in CAMLY tokens per kg';
COMMENT ON COLUMN public.posts.price_vnd IS 'Optional price in VND per kg';
COMMENT ON COLUMN public.posts.quantity_kg IS 'Available quantity in kg';
COMMENT ON COLUMN public.posts.location_address IS 'Full address or location description';
COMMENT ON COLUMN public.posts.location_lat IS 'Latitude for map display';
COMMENT ON COLUMN public.posts.location_lng IS 'Longitude for map display';
COMMENT ON COLUMN public.posts.delivery_options IS 'Array: self_pickup, nationwide, farm_visit';
COMMENT ON COLUMN public.posts.commitments IS 'Array: organic, no_preservatives, grown_with_love, blessed_by_father';

-- Create index for product posts for faster filtering
CREATE INDEX IF NOT EXISTS idx_posts_is_product_post ON public.posts(is_product_post) WHERE is_product_post = true;