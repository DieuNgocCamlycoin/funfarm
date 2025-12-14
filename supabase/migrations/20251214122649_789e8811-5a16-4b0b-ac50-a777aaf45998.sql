-- Add status column to followers table to support friend requests
ALTER TABLE public.followers ADD COLUMN status text NOT NULL DEFAULT 'pending';

-- Update existing followers to be accepted (they were already following)
UPDATE public.followers SET status = 'accepted';

-- Add index for faster queries
CREATE INDEX idx_followers_status ON public.followers(status);

-- Update RLS policies for friend system
DROP POLICY IF EXISTS "Users can follow others" ON public.followers;
DROP POLICY IF EXISTS "Users can unfollow" ON public.followers;

-- Users can send friend requests
CREATE POLICY "Users can send friend requests"
ON public.followers
FOR INSERT
WITH CHECK (auth.uid() = follower_id AND status = 'pending');

-- Users can cancel their own requests or unfriend
CREATE POLICY "Users can cancel requests or unfriend"
ON public.followers
FOR DELETE
USING (auth.uid() = follower_id OR auth.uid() = following_id);

-- Users can accept/reject friend requests sent to them
CREATE POLICY "Users can respond to friend requests"
ON public.followers
FOR UPDATE
USING (auth.uid() = following_id);