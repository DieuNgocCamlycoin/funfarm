-- Create table to store rejected content for admin review
CREATE TABLE public.rejected_content (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  content_type TEXT NOT NULL DEFAULT 'post',
  rejection_reason TEXT,
  images TEXT[] DEFAULT '{}',
  post_id UUID,
  metadata JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending',
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  admin_note TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.rejected_content ENABLE ROW LEVEL SECURITY;

-- Admin can do everything
CREATE POLICY "Admins can manage rejected content"
ON public.rejected_content
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Users can view their own rejected content
CREATE POLICY "Users can view their own rejected content"
ON public.rejected_content
FOR SELECT
USING (auth.uid() = user_id);

-- System can insert rejected content (for edge function)
CREATE POLICY "System can insert rejected content"
ON public.rejected_content
FOR INSERT
WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX idx_rejected_content_status ON public.rejected_content(status);
CREATE INDEX idx_rejected_content_user_id ON public.rejected_content(user_id);
CREATE INDEX idx_rejected_content_created_at ON public.rejected_content(created_at DESC);