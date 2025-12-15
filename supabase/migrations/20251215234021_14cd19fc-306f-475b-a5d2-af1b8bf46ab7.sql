-- Add columns for share posts
ALTER TABLE public.posts 
ADD COLUMN IF NOT EXISTS original_post_id uuid REFERENCES public.posts(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS share_comment text;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_posts_original_post_id ON public.posts(original_post_id) WHERE original_post_id IS NOT NULL;

-- Update post_type check to include 'share'
-- Note: post_type already exists, we just need to use 'share' value