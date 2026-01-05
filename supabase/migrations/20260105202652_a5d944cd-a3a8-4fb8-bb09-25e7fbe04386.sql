-- Create table for Angel chat messages
CREATE TABLE public.angel_chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.angel_chat_messages ENABLE ROW LEVEL SECURITY;

-- Users can only see their own messages
CREATE POLICY "Users can view their own chat messages"
ON public.angel_chat_messages
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own messages
CREATE POLICY "Users can insert their own chat messages"
ON public.angel_chat_messages
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own messages (clear history)
CREATE POLICY "Users can delete their own chat messages"
ON public.angel_chat_messages
FOR DELETE
USING (auth.uid() = user_id);

-- Index for faster queries
CREATE INDEX idx_angel_chat_messages_user_id ON public.angel_chat_messages(user_id);
CREATE INDEX idx_angel_chat_messages_created_at ON public.angel_chat_messages(created_at DESC);