-- Add receiver approval field for gift posts
ALTER TABLE public.posts 
ADD COLUMN IF NOT EXISTS gift_receiver_id UUID,
ADD COLUMN IF NOT EXISTS receiver_approved BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS sender_wallet TEXT,
ADD COLUMN IF NOT EXISTS receiver_wallet TEXT;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_posts_gift_receiver ON public.posts(gift_receiver_id) WHERE post_type = 'gift';

-- Update RLS policy to allow receivers to see and update their gift posts
CREATE POLICY "Gift receivers can update approval status"
ON public.posts
FOR UPDATE
USING (
  post_type = 'gift' AND gift_receiver_id = auth.uid()
)
WITH CHECK (
  post_type = 'gift' AND gift_receiver_id = auth.uid()
);